# The first-close freeze bug — investigation notes

## Symptom

On mobile only, the very first time the image viewer panel is closed after a
fresh page load, the page freezes for roughly 1.5–2 seconds before the close
actually completes. It happens exactly once per page load — reopening and
reclosing the viewer afterward (any Pokémon, any tab state, any timing) never
reproduces it again for the rest of that session.

Confirmed properties, from extensive testing:
- **Mobile only.** Desktop (panel docks beside the gallery instead of going
  fullscreen) never shows it.
- **Exactly once per page load**, regardless of which Pokémon is opened,
  which tab (General Information / Evolution Chain) is active, or how long
  the panel is left open before closing.
- **Timing-independent.** Waiting 30+ seconds before opening, or 30+ seconds
  after opening before closing, makes no difference. This rules out anything
  waiting on a network fetch or image decode.
- **Not the same thing as the "flicker" bugs** that were fixed earlier in
  this project (gallery showing through, pulse/reopen race, etc.) — those
  were all fixed first and are unrelated to this one.

## Root cause, confirmed via a real Chrome Performance trace

A `chrome://inspect` remote trace (captured from an actual Android device,
not desktop emulation) showed the freeze is **not one long blocking task**.
Instead, for roughly 1.7–2 seconds, the main thread runs a
`ScheduleStyleRecalculation → UpdateLayoutTree → InvalidateLayout → Layout →
LocalFrameView::performLayout` cycle **over and over, roughly every 1.3–1.8ms,
non-stop** — over 1,300 repetitions in a row. Each individual cycle is fast
(only a handful of elements dirtied each time) but it's a *full* document
layout pass every time (~1,575 layout objects), and the cycles run back-to-back
with almost no gaps, saturating the main thread the whole time.

This is why no "long task" ever shows up in profiling — there isn't one, there
are ~1,300 short ones in immediate succession. It's also why a `setTimeout`
scheduled right at close time (the recenter-scroll delay) doesn't fire until
~1.7s later than requested: it's sitting in the task queue the entire storm,
unable to get a turn.

**The only change that ever made the freeze disappear in testing was
disabling `content-visibility: auto` on `.image-card`.** Every other
individual thing tried (see below) had no effect, including things that were
strong theoretical suspects.

We were **not** able to pin down the exact triggering statement/interaction
beyond "content-visibility: auto must be present." Given how many individual
close-path behaviors were disabled without effect, the likely explanation is
that this is a genuine one-time engine-level cost tied to having several
hundred `content-visibility: auto` elements on the page (the gallery has
800+), rather than any single line of our own code — but that's an inference,
not a confirmed mechanism.

## What was tried and ruled out (each tested in isolation, via real device testing)

- The `#viewer-frame::before` scrolling background tile animation
- Both `grid-template-rows` transitions (info panel and evolution-chain panel)
- All three multi-layer `background-blend-mode: multiply` background stacks
  (viewer-frame, info-wrapper, related-wrapper)
- Clearing `overlayImg.src` on close
- The SVG halo filter (`filter: url(#gallery-halo)`) — both the main gallery
  card's `.active-in-viewer` use and the related-thumbnail's `.related-active`
  use
- The scroll-lock mechanism itself, swapped from the `position: fixed` +
  `scrollTo()` technique to a plain `overflow: hidden` technique — no change,
  which was surprising and ruled out an entire branch of theories about body
  flow discontinuity
- The `.active-in-viewer` / `.related-active` class toggles themselves
  (independent of their CSS effect)
- `loadPokemonInfo`'s content injection (the PokéAPI fetch and resulting DOM
  content)
- The mobile auto-expand of the General Information panel on open

All of the above were tested via real trial-disabling on an actual device,
not just reasoning about the code. None of them changed the freeze.

## Attempted mitigation: pre-warming during the splash screen (DID NOT WORK)

The original plan here was to pay the one-time cost silently during the
splash screen instead of during a real user's first close — a
`prewarmViewer()` function was added to the splash sequence that ran a real
open+close cycle against the first gallery card while the splash was still
fully opaque, using a release-and-reacquire of `pageScrollLock` so it would
genuinely trigger the same cost rather than nesting harmlessly inside an
already-held lock.

**This was tested on a real device and the freeze still happened on the
user's first real close after the splash finished.** The pre-warm cycle
during the splash did not pay down whatever the real cost is — either the
mechanism doesn't trigger the same way when run programmatically during the
splash as it does from a real user interaction later, or there's some other
condition (elapsed time since page load, some other one-time state, etc.)
that the pre-warm didn't reproduce. This was not investigated further before
reverting the change.

**Current status: the freeze bug is unresolved.** The `prewarmViewer()` code
has been removed. The only known-working fix remains fully disabling
`content-visibility: auto`, which isn't a fix we want to keep (see above for
why). The lazy-loading fix for related-image thumbnails (`thumb.loading =
"lazy"`, `thumb.decoding = "async"`) is unrelated to this bug specifically —
it was a legitimate improvement discovered while investigating a different
theory, and has been kept/merged forward independently.

## Why `content-visibility: auto` is worth keeping despite being the trigger

It was added to cap the standing cost of a very long gallery (800+ cards):
without it, every card that's ever scrolled near the viewport stays fully
painted, decoded, and composited (via `translateZ(0)` layer promotion on each
card's image) for the rest of the session, with nothing to reduce that
per-card cost as you scroll further and further down. `content-visibility:
auto` lets the browser skip layout/paint/compositing entirely for cards well
outside the viewport, picking that work back up automatically as they near
it again — this is what actually bounds the standing cost instead of letting
it grow unbounded with scroll depth.

## If picking this back up later

Things worth trying that we didn't get to:
- **Figuring out why the pre-warm attempt didn't work.** This is probably
  the single most useful next step — it implies our model of the trigger
  condition is still incomplete. Worth checking with the same trace-capture
  approach used originally: does the pre-warm cycle during the splash
  actually show the same layout storm in a trace, just silently? If it does
  and the storm still happens *again* on the real first close anyway, the
  cost may not be as strictly "once per page load" as the earlier testing
  suggested — maybe it's closer to "once per N seconds of elapsed page
  time" or tied to something else that resets between the pre-warm and the
  real interaction. If the storm does *not* show up during the pre-warm
  cycle at all, then whatever triggers this needs something a real user
  interaction provides that a programmatic call doesn't (e.g. an actual
  trusted Event, real pointer/touch input, or something about timing
  relative to the splash's own animation/layout work still being in
  flight).
- Testing on a different device/Chrome version to see if this is specific to
  this exact engine build (the freeze was found on a Samsung S23 running
  Chrome for Android; whether it reproduces on other hardware or after a
  Chrome update is unknown).
- Searching the Chromium bug tracker for known issues combining
  `content-visibility: auto` at scale (hundreds of elements) with a full
  layout recalculation storm.
- Trying to reduce the *number* of `content-visibility: auto` elements
  simultaneously in a "pending re-evaluation" state — e.g., via
  `content-visibility: hidden` + manual `IntersectionObserver`-driven
  toggling instead of relying on `auto`'s built-in heuristics, to see if a
  hand-rolled equivalent avoids whatever internal path is expensive here.
- Capturing a trace with the `content-visibility: auto` rule disabled (the
  one change that fixes it) specifically to compare against the frozen
  trace and see exactly what's different in the browser's internal timeline,
  rather than only comparing "freezes" vs "doesn't freeze."
