# Code notes (archived comments)
Longer explanatory comments (45+ words) removed from index.html, in original file order. Each entry is headed by the code line it sat above, so search for a function name with grep. Do not attach this whole file to a chat; search it instead.

## `// the visualViewport API, rather than any CSS viewport unit. Chrome/`

Keeps panels 2/3's height synced to the TRUE current viewport via
the visualViewport API, rather than any CSS viewport unit. Chrome/
Edge on Android defers the layout viewport's resize until its own
address-bar show/hide animation finishes, then applies it in one
jump — which is what caused the lag no CSS unit (vh/dvh/svh/%)
could get around, since they're all downstream of that same
deferred layout recalculation.

visualViewport's own 'resize'/'scroll' events are a big
improvement, but don't necessarily fire on every single frame of
the browser's own address-bar animation — just at some coarser
interval — so there can still be a brief stale beat mid-animation.
To close that gap further, once a resize/scroll starts we also
poll visualViewport.height on every animation frame for a short
window, which tracks as close to the live animation as JS can get.

That same live-tracking is also what made an on-screen keyboard
visibly shrink the nav panels on mobile, once they became
permanently visible instead of only appearing in the image
viewer: a keyboard shrinks visualViewport.height exactly the way
a real viewport resize does, since as far as this API is
concerned "the visible area got smaller" either way. See
KEYBOARD_GAP_THRESHOLD below for how that's told apart from an
actual address-bar change.

## `// on-screen keyboard -- only visualViewport.height does, which`

window.innerHeight (the layout viewport) doesn't shrink for an
on-screen keyboard -- only visualViewport.height does, which
is the whole reason visualViewport exists as a separate API
from plain viewport units in the first place. An address-bar
show/hide, on the other hand, is a genuine layout viewport
resize (see the comment above this IIFE), so innerHeight
moves together with visualViewport.height for that case, just
laggier -- which is why visualViewport is still preferred
when the two agree. A large gap between them, then, reliably
means "keyboard, not address bar": comfortably bigger than
any mobile browser's address bar (on the order of 40-60px)
and comfortably smaller than any on-screen keyboard (100px+).
When that gap shows up, --real-vh holds at innerHeight
instead of following visualViewport.height down, so
--panel-h and the nav panels' reserved padding stay put
while the keyboard is open rather than visibly shrinking.

## `// (splash, Pokédex panel, filter panel, image viewer) can each`

Reusable, reference-counted page-scroll lock. Multiple overlays
(splash, Pokédex panel, filter panel, image viewer) can each
request a lock independently — e.g. the splash and the Pokédex
panel are both "open" simultaneously during the initial auto-open
sequence — and the page only actually unlocks once every
requester has released it, so one closing early can't
accidentally re-enable scrolling while another is still up.

Uses position:fixed + a saved scroll offset rather than plain
`overflow: hidden` on body, since overflow:hidden alone doesn't
reliably block touch-drag scrolling on iOS Safari and some
Android browsers — this project has been mobile-driven enough
that it's worth doing the more robust version up front.

## `// volume/persistence end-to-end (mute it, refresh, confirm it`

Temporary: exercises the Sounds panel's UI Sound FX mute/
volume/persistence end-to-end (mute it, refresh, confirm it
stays muted) ahead of the real UI sound effects in step 3.
Swap the URL out (or remove this whole function and its
call above) once those are ready. isCategoryAudible/
getCategoryVolume/audioSettings live in the later <script>
block below, but this only ever actually runs after at
least MIN_DELAY_BEFORE_FADE_IN (1s) plus however long the
splash image itself took to load — by which point the rest
of the page's scripts have long since finished executing.

## `// width the rest of the site's CSS already treats as the`

Shared desktop/mobile breakpoint check -- matches the 664px
width the rest of the site's CSS already treats as the
desktop/mobile line (filter panel behavior, nav panel image
swap, etc). Declared up here, ahead of everything that uses it,
since a couple of nav-panel scripts further down need it earlier
than its original spot near the filter panel code.

## `// below, which only matters when specific ability tags are`

Independent of the Abilities section's own bucket (sectionFilters
below, which only matters when specific ability tags are
actually selected) — this is a standalone on/off requirement
that a card have at least one of the four ability tags at all,
regardless of which ones (if any) are individually selected.

## `// currently selected (by button or by a plain typed word that`

One bucket per section, holding whichever of its own tags are
currently selected (by button or by a plain typed word that
matches one of its buttons). Matching per section, in
filterGallery(): AND-within only for a toggleable section
currently set to Match:All; every other case — every
non-toggleable section always, or a toggleable one set to
Match:Any — is OR-within. Every section's bucket then ANDs
together with every other section's (and with includeFilters,
explicitOrGroups, and !excludeFilters below), so a selection in
one category always narrows results rather than the old
behavior where unrelated selections from different categories
could end up OR'd against each other and canceling each other
out.

## `// "water/ground" or "water\ground") — each inner array is one`

Explicit OR-groups from the search box only (e.g. typing
"water/ground" or "water\ground") — each inner array is one
slash/backslash-joined group, at least one tag from each group
must be present, and every group must pass (AND across groups).
Bypasses section-based AND/OR routing entirely: this is a
deliberate override for when the person typing wants OR
regardless of what a tag's section would normally do, so it
doesn't check section membership like the plain-tag path does.
Fully rebuilt on every parseSearchFilters() call rather than
merged in — unlike the other filter arrays, nothing here ever
originates from a button, so there's no existing state to
preserve.

## `// every tag in the group to be present (AND-within) rather than`

Same idea, for '+' instead of '/' — e.g. "water+ground" requires
every tag in the group to be present (AND-within) rather than
just one (OR-within). Also bypasses section-based AND/OR
routing, for the same reason explicitOrGroups does. Split into
an include-side and an exclude-side bucket rather than one list
like excludeFilters, because "-water+ground" (exclude only
things that are BOTH) needs every-tag-present logic to decide
whether a group applies at all — that can't be flattened into
excludeFilters' simple some()-over-single-tags check the way
"-water/ground" can.

## `// page landed inside the filter panel -- recomputed fresh on`

Whether the most recent mousedown/touchstart anywhere on the
page landed inside the filter panel -- recomputed fresh on
every single one, so it always reflects where the *current*
press-and-release cycle began by the time its matching 'click'
fires. Exists solely so gallery/body's own "click empty space
closes the panel" listeners (further down) can tell a genuine
click on the gallery apart from a click-and-drag text
selection that started on something inside the panel (e.g. the
search box) and merely happened to release over the gallery --
browsers still fire a 'click' targeting the release point in
that case, even though nobody was ever trying to click away
from the panel.

## `// app -- added because there was previously no visual`

Click-feedback pulse for every .filter-btn across the whole
app -- added because there was previously no visual
confirmation a tap actually registered at all (see the chat
this was requested in).

The animation itself starts on PRESS (mousedown/touchstart/
keydown), not on the full 'click' -- after the first attempt
(triggering on 'click') turned out to visibly fail in two
ways, both for the same underlying reason: a 'click' only
fires after the button's already been released, by which
point whatever that button's OWN click handler does has
typically already run too (its own listener sits on a closer
ancestor -- e.g. #game-scroll -- than this one on document,
so it fires first during the bubble phase regardless of
which handler was wired up first in this file). A tile that
navigates to another screen hides this one (display:none)
before this listener's class ever gets to render a single
frame, so the animation sat paused until the player later
backed back out to it; a deck action like Shuffle/Look at
Top re-renders its own row's markup immediately, which
replaces the exact button element outright with a fresh one
that was never pulsed at all.

Starting the animation on press alone wasn't quite enough,
though: a quick tap can still release (firing 'click', and
with it whatever navigation/re-render that button causes)
well before FILTER_BTN_PULSE_MS has actually elapsed, cutting
the animation short the same two ways as above. So the
'click' itself is intercepted here in the CAPTURE phase --
guaranteed to run before every other listener on this event,
including #game-scroll's own bubble-phase one, regardless of
DOM position -- and held with stopImmediatePropagation()/
preventDefault() until only whatever's actually left of the
animation's own duration has passed (elapsed since the
ORIGINAL press, not the click, so a slower deliberate press
that already let the animation fully play doesn't add any
extra wait on top). It's then replayed as a synthetic click
on the same element, which every button's own handler treats
exactly like the real one. isConnected/disabled are
rechecked at replay time in case the delay outlived the
button itself somehow (shouldn't happen in practice, since
nothing else here reacts to a click this quickly, but cheap
insurance against dispatching a click into nothing).

The !e.isTrusted check is what tells the real click captured
above apart from this function's own replay of it a moment
later -- a script-dispatched event is never trusted, no
matter how it's dispatched, so the replay sails straight
through this listener untouched rather than looping forever.
This also means any OTHER already-existing synthetic click in
this file (e.g. the alpha-transparency click-through further
up) is left completely alone by this, same as ever.

One delegated set of listeners here covers every .filter-btn
everywhere (Pokédex filters, Game Panel, Sounds, Discord, all
of it) rather than adding this into each of the dozens of
separate click handlers throughout this file individually --
none of them need to know this exists at all.

## `// class is what lets the animation restart even on a`

classList.remove() + a forced reflow before re-adding the
class is what lets the animation restart even on a
button that was just pulsed a moment ago -- without the
reflow, removing and immediately re-adding the same class
produces no browser paint in between, so a still-running
CSS animation wouldn't otherwise restart.

## `// total itself, restarted the same remove/reflow/re-add way`

The four Poké Coin +/- buttons get a companion pulse on the
total itself, restarted the same remove/reflow/re-add way
and started at the same moment as the button's own pulse
above, so the two visibly animate in lockstep even though
they're two separate elements/animations. The actual value
change is timed separately, to this same button's pulse
reaching its midpoint -- see the document 'click' listener
further down.

## `// gets hidden (e.g. a screen switch's display:none, see`

Both events matter here, not just 'animationend': if the button
gets hidden (e.g. a screen switch's display:none, see
setGameScreen()) while its pulse is still mid-flight -- which
can happen even though the click delay is calibrated to match
the animation's own duration, since a setTimeout callback and
the animation's completion aren't guaranteed to be ordered --
the browser fires 'animationcancel' instead of 'animationend'.
Without this, the class is left stuck on a now-hidden button,
and simply re-showing that element later (e.g. navigating back
to the screen it's on) starts a brand-new instance of the
animation from scratch, since the previous one was cancelled
rather than completed -- i.e. exactly the "pulse fires again on
return" bug this is fixing.

## `// pulse's midpoint rather than its full length -- their pulse`

The four Poké Coin +/- buttons hold the click to only the
pulse's midpoint rather than its full length -- their pulse
is purely tactile feedback with nothing to navigate away
to, so there's no reason to sit on the actual +1/-5/etc.
apply any longer than it takes the button (and its synced
.game-pokecoins-value-pulse companion, see pulseFilterBtn())
to visibly announce that a change is happening. Everywhere
else still waits for the pulse to fully finish before
whatever the click actually does (e.g. navigating away)
takes effect.

## `// itself (500px in from its native-resolution edge) rather than a`

Anchor the frame bars to a fixed point in the background artwork
itself (500px in from its native-resolution edge) rather than a
percentage of the window. Panels 2/3 use `background-size: auto 100%`
(height-locked, width auto-scaled, centered) — so the same math the
browser uses to render that background is reproduced here in JS to
find where the image's edge actually lands, then add 500 scaled px.

## `// (the invisible hover/click strips that respectively bring up`

Size the nav trigger zones AND the panels' own .nav-hot-zone
(the invisible hover/click strips that respectively bring up
and promote-to-open the top/bottom nav panels) to the middle
NAV_HOT_ZONE_FRACTION of each panel's actual rendered
background image width, rather than the image's full width.
Panels use background-size: auto 100% (height-locked, width
auto-scaled, centered) -- since the panel itself is 100% of
the window's width but the image inside it often isn't, sizing
off the image's rendered width (not the window's) keeps this
centered on the artwork at any viewport width; shrinking it
further to just the middle fraction keeps the actual hover/
click surface well clear of the art's outer edges. Same
measuring approach as the frame-bar anchoring above: load the
image, scale its natural width by the panel's current rendered
height.

## `// hoverable/clickable strip -- centered, so e.g. 0.3 leaves`

How much of the rendered artwork's width counts as the
hoverable/clickable strip -- centered, so e.g. 0.3 leaves
35% clear on either side. Tune this one value to adjust
both the trigger zone (entering a peek) and the hot zone
(holding a peek open / clicking to fully open) together,
since they're meant to always match.

## `// artwork has genuine transparent regions (both the letterboxed`

Nav panel transparent-pixel click/hover-through. The panels'
artwork has genuine transparent regions (both the letterboxed
space to either side of the art on wide viewports, and actual
alpha=0 gaps within the art itself) where the gallery
underneath should stay fully interactive -- hoverable and
clickable -- exactly as if the panel weren't there at all.
Plain CSS can't hit-test per-pixel alpha on an arbitrary HTML
element, so this reads the actual pixel data back out of each
panel's background image via an offscreen canvas, and toggles
the panel's own pointer-events on the fly based on what's under
the cursor/finger.

## `// without this, drawing a cross-origin image to a canvas`

Needed to read pixel data back out via canvas below --
without this, drawing a cross-origin image to a canvas
"taints" it and getImageData throws. Requires the image
host to actually send CORS headers; see the catch
block further down for the fallback if it doesn't.

## `// already happened (or will happen) for the panel's own`

A plain, no-crossorigin request for this exact URL
already happened (or will happen) for the panel's own
CSS background-image -- and separately, the service
worker (see ./sw.js) caches image responses by URL for
offline use. Either one can hand this crossorigin-mode
request back the earlier no-cors request's *opaque*
response instead of doing a real CORS-checked fetch --
and the browser refuses to load an opaque response
through a crossorigin="anonymous" <img>, failing with
exactly the load error this function's caller already
has a console.warn for. A throwaway query param makes
this a distinct cache key from the CSS load, so it
always goes through a fresh, properly CORS-checked
request instead of risking a stale opaque one.

## `// of the panel's background image at that point. Returns 0 for`

Maps a point in viewport coordinates to the alpha value (0-255)
of the panel's background image at that point. Returns 0 for
any point outside the image's own rendered bounds -- e.g. the
letterboxed space to either side on a viewport wider than the
scaled art -- since there's no artwork there to be "opaque".

## `// a background-image swap -- e.g. the mobile/desktop art swap`

Tracks the currently loaded URL/image/alpha-map per panel, so
a background-image swap -- e.g. the mobile/desktop art swap
at the 664px breakpoint -- triggers a reload instead of
silently sampling stale pixel data from whichever image
happened to load first. While a panel's state has no image
yet (still loading, or the load/read failed), it's simply
skipped and behaves like a fully opaque rectangle in the
meantime.

## `// document rather than the panels themselves -- a panel`

Desktop: re-checked on every mousemove, attached to
document rather than the panels themselves -- a panel
whose pointer-events was just set to 'none' would stop
receiving mouse events on itself, so sampling from the
panel would get stuck the first time it went transparent.
document always gets the bubbled event regardless of which
element actually received it underneath.

## `// while peeking/hidden, interactivity is intentionally`

Only relevant once the panel is genuinely open --
while peeking/hidden, interactivity is intentionally
restricted to just .nav-hot-zone (see the panel/
.nav-button pointer-events rules in CSS), and since
an inline style here would otherwise outrank any of
that regardless of selector specificity, this has to
stay hands-off until nav-visible says otherwise.

## `// artwork, drawn independently on top of the panel's`

The nav buttons (and the hot zone) are their own opaque
artwork, drawn independently on top of the panel's
background image -- the background pixel directly
underneath a button is often itself transparent, since
the button's own art is what fills that spot in, not
the shared background PNG. Sampling that pixel here
would read "transparent" and set pointer-events:none on
the *whole panel* -- which doesn't just block clicks,
it removes the panel from hit-testing entirely, so the
browser hands mouseenter/mouseleave to whatever's
underneath (the gallery) instead. That's what was
firing a spurious mouseleave -- and the hide countdown
that comes with it -- the instant the cursor reached a
button. Buttons/hot-zone are always genuinely opaque
interactive UI regardless of the art behind them, so
skip the sample and force auto whenever the cursor is
over one.

## `// instead this catches the tap on the panel itself (which`

Mobile: there's no hover to sample ahead of time, so
instead this catches the tap on the panel itself (which
always has pointer-events: auto going into the gesture),
checks the pixel under it, and -- if transparent --
manually hands the tap to whatever's actually underneath
via elementFromPoint, rather than letting the panel
silently swallow it.

## `// delayed rather than instant — so a rapid open/close/open toggle`

pageScrollLock is reference-counted, and both directions are now
delayed rather than instant — so a rapid open/close/open toggle
could otherwise fire an extra lock() or unlock() with no matching
partner (e.g. reopening before a scheduled unlock fires would
cancel that unlock AND call lock() again, leaking an increment
that's never balanced). Tracking whether the lock is actually
currently engaged, and only ever scheduling the action that
would flip it, keeps every lock() paired with exactly one
unlock() regardless of how fast the panel gets toggled.

## `// class on #pokedex-panel) so this fires the exact same slide-in`

The panel starts in the "closed" markup state on purpose (see the
class on #pokedex-panel) so this fires the exact same slide-in
transform animation used by the manual open button, rather than
ever rendering the panels open with no animation at all. This
whole sequence plays out behind the loading splash, so visually
nothing changes for the user — but it's what settles panels 2/3
into a correctly laid-out state at load time too, matching what
was already working on manual close/reopen.

## `// member -- see confirmTeamAddSelection()) so the Team`

Keyed by name (the same string stored on a team
member -- see confirmTeamAddSelection()) so the Team
Tracker's evolution feature (computeTeamEvolutionState()
and friends, further down) can look a member's full
pokemon-data.json entry back up -- token_level,
evolve_cost, evolves_to, mega_forms, gmax_forms,
base_form/form_type -- without a second fetch of the
same file. Populated here rather than in a fetch of
its own since this data is already coming down for the
gallery either way; team-tracker code just reads this
global once it exists; a member rendered before it's
populated falls back to the "unable" evolution state
until the next renderTeamGrid() call (see
POKEMON_BY_NAME's own comment further down).

## `// had already rendered every filled slot's evolution`

Covers the case where Team Tracker was already open (and
had already rendered every filled slot's evolution
corner in the "unable" fallback state) by the time this
fetch resolves -- picks those slots back up against the
data that just arrived, same idea as any other
async-data-arrives-after-first-render re-render in this
doc.

## `// the hit-zone on top of it) only happens in the square's`

A click landing directly on the image itself (rather than
the hit-zone on top of it) only happens in the square's
transparent corners, since the hit-zone covers the circle
and intercepts anything within it first. Treated the same
as clicking any other empty space in the gallery.

## `// background (neither the image nor the hit-zone) shouldn't`

Defensive catch-all: a click landing on .image-card's own
background (neither the image nor the hit-zone) shouldn't
be possible now that display:block above removes the
known baseline-gap cause, but sub-pixel layout rounding
between a parent and child box that are meant to match
exactly can still occasionally leave a stray edge pixel
uncovered in some browsers/zoom levels. Same treatment as
any other empty space either way.

## `// anywhere — this only matters for the ones that do. Returns the`

Most tags typed into the search box have no corresponding button
anywhere — this only matters for the ones that do. Returns the
section key (a key of SECTION_IDS) whose button list contains a
matching tag, or null if there's no button for it anywhere.

## `// its neighbors by whitespace, and already had any leading '-' or`

Splits a single raw chunk of typed text (already separated from
its neighbors by whitespace, and already had any leading '-' or
'+'/'/' grouping peeled off by the caller) into the tag itself
and whether it should match exactly. A chunk wrapped in a
matching pair of quotes -- 'male' or "male", either style, not
mixed -- has the quotes stripped and is marked exact; anything
else is left as free text for the usual fuzzy match. This is
what lets someone type "male" (quoted) to mean only the male
tag, versus male (bare) fuzzy-matching both male and female.

## `// actually stores and matchesFilterTag() actually reads --`

Formats a raw chunk into the prefixed string every filter array
actually stores and matchesFilterTag() actually reads --
"exact:tag" for a quoted chunk, "search:tag" otherwise. Kept
separate from parseSearchSegment() above because a couple of
call sites below (single-tag routing) need the bare tag on its
own first, to look up its section, before deciding how to store
it.

## `// both isn't really a sensible thing to type (there's no`

'+' (AND) is checked before '/' (OR) -- a token mixing
both isn't really a sensible thing to type (there's no
way to express grouping/precedence in a bare token), so
rather than silently doing something confusing with it,
whichever operator is actually present wins, with '+'
simply checked first. A token that's only '+' characters
(nothing else) has nothing usable in it, same as a
lone '/' below. Quote characters aren't part of either
separator, so a quoted chunk on either side of a '+' or
'/' splits cleanly and keeps its own quotes intact for
toSearchFilterKey() to read below -- "male"+adult and
"male"/"female" both work per-segment.

## `// separator, freely mixed) into its individual tags. A`

Splits "water/ground" or "water\ground" (either
separator, freely mixed) into its individual tags. A
stray/lone slash with nothing on one or both sides (e.g.
a token that was just "/") collapses to zero segments —
filter(Boolean) drops those rather than letting an empty
group through, which would otherwise make .some() below
trivially false and silently hide every single card.

## `// for these specific tags, same treatment for includes`

Explicit OR-group: bypasses section routing entirely
for these specific tags, same treatment for includes
and excludes since exclude is already OR-style across
separate tokens anyway (-water -ground already means
"hide if either" — this is just a more compact way to
write the same thing in one token).

## `// section's own bucket so it combines the same way a`

If this tag has a button somewhere, fold it into that
section's own bucket so it combines the same way a
click on that button would (AND-within if the section
is toggleable and set to Match:All, OR-within
otherwise) instead of landing in the general
no-section-at-all pool below. Routing is by the bare
tag either way -- a button's own data-tag is always a
whole exact tag, so quoting "male" to look it up here
doesn't change which section (if any) it belongs to.

## `// nav-top-btn-search nav icon above) has nothing to apply until`

The filter panel's own Search button (distinct from the
nav-top-btn-search nav icon above) has nothing to apply until
either a filter button is selected or something's typed in the
search box -- filtersActive() already covers both, since typed
search-box text gets folded into includeFilters/excludeFilters/
sectionFilters/explicitOrGroups/explicitAndGroups/
explicitAndExcludeGroups by parseSearchFilters() just above in
updateFilters().

## `// state whenever there's no panel open (filter panel, sounds`

Swaps the Back nav button into its "nothing to do" greyed-out
state whenever there's no panel open (filter panel, sounds
panel, or image viewer), team-add mode isn't active, AND no
active filter for it to clear. Called any time one of those
could have changed: filters (updateFilters), the filter panel
(open/closeFilterPanel), the sounds panel (open/closeSoundsPanel),
the image viewer (open/closeImageViewer), or team-add mode
(beginTeamAddMode/exitTeamAddMode).

## `// a button's data-tag is a known, whole tag, and matching it as a`

Button-driven filters ("water", "stage1", ...) are always exact —
a button's data-tag is a known, whole tag, and matching it as a
substring against every card's tag list could pull in unrelated
tags that merely contain it (e.g. a "water" button snagging a
hypothetical "saltwater" tag). Typed search terms default to the
opposite: free text, not guaranteed to be a whole tag, so a
fragment like "chu" surfaces Pikachu/Pichu/Raichu without the
player having to know or type the exact tag. Wrapping a typed
term in quotes (see parseSearchSegment()) opts back into exact
matching -- "male" finds only the male tag, where a bare male
also picks up female. Every search-originated filter carries
either the "search:" (fuzzy) or "exact:" (quoted) prefix set by
parseSearchFilters(), including each member of
explicitOrGroups/explicitAndGroups/explicitAndExcludeGroups now,
so no separate signal is needed here to tell those apart from a
plain button tag.

## `// De Morgan's dual of "-water/ground" (which already`

"-water+ground" only excludes a card that has BOTH —
De Morgan's dual of "-water/ground" (which already
excludes on having EITHER, via plain excludeFilters
above). A card is excluded here if any one '+'-exclude-
group is fully satisfied (every tag in that group
present), same "excluded if any condition fires" logic
excludeMatch itself uses.

## `// adds any back), and only while shinyShowing is true --`

Shiny mode's own gallery filter: only hides cards (never
adds any back), and only while shinyShowing is true --
completely separate from includeFilters/excludeFilters/
sectionFilters/etc above, so it layers on top of whatever
the filter panel has selected rather than interacting
with it. Reset just means this becomes a no-op again the
moment shinyShowing goes back to false (see
setShinyShowing/closeImageViewer), without touching any
of those other filter buckets.

## `// and Pokéstar Studios tokens never belong on a team, for`

Add Pokémon guardrail: Mega Evolutions, Gigantamaxes,
and Pokéstar Studios tokens never belong on a team, for
the whole duration of any add-mode session (see
TEAM_ADD_FORCED_EXCLUDE_TAGS/beginTeamAddMode()'s own
comment) -- deliberately its own check rather than
pushed into excludeFilters, since that array is rebuilt
from scratch by updateFilters() on every filter-panel
interaction (see its own comment) and would just get
wiped the next time the player touched any button.

## `// a Pokémon" mode (see beginPermanentPickMode()) -- Mega`

Same idea for the Permanent Cards panel's own "choose
a Pokémon" mode (see beginPermanentPickMode()) -- Mega
Evolutions and Gigantamaxes are hidden unless the
card's own choosePokemon value IS "mega" or "gmax"
(permanentPickLockedTag), since in that one case
they're exactly what the player's supposed to be
choosing from rather than a form that shouldn't be
selectable at all. See the chat this was designed in.

## `// Pokémon" mode (see beginBattleWildPickMode()) --`

Same idea for Battle Arena's own "choose a Wild
Pokémon" mode (see beginBattleWildPickMode()) --
reuses TEAM_ADD_FORCED_EXCLUDE_TAGS wholesale rather
than a separate constant, since the reasoning is
identical: a Mega/Gigantamax form or a Pokéstar
Studios token isn't something that shows up in the
wild any more than it's something a player adds to
their own team by hand.

## `// the toggle button itself (drives its own blue/green — see`

Reflects sectionMatchAll[key] as a "match-all" class on both
the toggle button itself (drives its own blue/green — see
.filter-btn.match-toggle CSS) and the section container
(drives the green override on any included button inside
it). Called once below for the initial state and again on
every click.

## `// included would otherwise leave an AND combination no`

Switching Types to Match: All while 3+ types are already
included would otherwise leave an AND combination no
Pokemon could ever match, silently zeroing out the
gallery -- trims down to the first two instead of
requiring the person to notice and fix it themselves.

## `// array from scratch off whatever's currently selected) rather`

Routed through updateFilters (which rebuilds every state
array from scratch off whatever's currently selected) rather
than resetting includeFilters/excludeFilters by hand — hand-
resetting only those two used to miss the per-section AND-
group state entirely, so a "Clear All Filters" click could
still leave an old AND-group selection silently affecting
results even with every button visibly deselected.

## `// class to strip anyway, Pokéstar) while an Add Pokémon`

Skips Starter (and, though it has no include/exclude
class to strip anyway, Pokéstar) while an Add Pokémon
guardrail lock is active on it (see
beginTeamAddMode()'s own comment) -- otherwise "Show
All" here would silently undo a lock that's supposed
to survive exactly this kind of reset.

## `// selections can describe something that's *never* true (no`

Pokemon Types is the one section where AND-ing together enough
selections can describe something that's *never* true (no
Pokemon has three or more types at once), rather than just an
empty-but-plausible search. Only matters under Match: All --
under Match: Any, OR-ing together any number of types is a
perfectly normal "any of these" search. Only blocks new
inclusions (going from neutral/exclude to include); removing an
existing inclusion is always allowed regardless of count.

## `// same Pokemon at once -- only matters for AND logic (Match: All),`

Evolution State tag pairs that can never both be true of the
same Pokemon at once -- only matters for AND logic (Match: All),
same reasoning as the Types cap above. Listed once per pair;
built into a two-way lookup below so checking either tag finds
the other.

## `// toggle listener above) -- walks the already-included tags in DOM`

Called when Evolution State switches to Match: All (see the
toggle listener above) -- walks the already-included tags in DOM
order, keeping each one only if it doesn't conflict with an
earlier one already kept, so a combination assembled freely
under Match: Any can't linger in an impossible state once AND
logic is switched on.

## `// filter to apply (see refreshFilterSearchButtonState), at which`

Filter panel's Search button: only ever enabled once there's a
filter to apply (see refreshFilterSearchButtonState), at which
point its only job is closing the panel so mobile's fullscreen
overlay gets out of the way of the now-filtered gallery. Native
`disabled` on the button already prevents this from firing at all
while nothing's selected, so no extra guard is needed here.

## `// #tag-search-tooltip-toast) instead of a ::after anchored to this`

Search-syntax tooltip -- now a body-level popup (see
#tag-search-tooltip-toast) instead of a ::after anchored to this
button, so it always renders above #filter-panel's own stacking
context (see that CSS rule's comment for why the old approach
could bleed offscreen on desktop and get stuck behind the nav
panels on mobile). Being body-level means it has no natural CSS
relationship to the panel or the search box anymore, so position
is computed here instead: centered horizontally on the filter
panel itself, vertically over the search box, recomputed every
time it's shown in case the panel's layout has changed since
(e.g. a mobile/desktop breakpoint switch while it happened to be
open).

## `// :focus on the ::after tooltip; needs JS now since the popup no`

Mouse hover / keyboard focus -- previously plain CSS :hover/
:focus on the ::after tooltip; needs JS now since the popup no
longer lives next to the button in the DOM. Leaves the tapped-
open state (tooltip-visible) alone on mouseleave/blur so a touch
"tap to open" isn't immediately undone by a stray pointer event.

## `// on-screen keyboard is up there's no visible gallery left to tap`

On mobile, the filter panel is a full-screen sheet, so once the
on-screen keyboard is up there's no visible gallery left to tap
for the usual "click empty space closes it" behavior — the
keyboard's own Done/Go/checkmark key (whatever a given phone
labels it) is really the only way back. That key always reaches
the page as a standard Enter keydown regardless of its on-screen
label, so listening for Enter here is the portable way to catch
it. Scoped to mobile only — on desktop, Enter in a search box is
just a regular keystroke, and closing the whole sidebar because
of it would be surprising rather than helpful there.

## `// panel above (scroll lock on mobile, same reserved-space class`

Sounds panel — structurally identical open/close to the filter
panel above (scroll lock on mobile, same reserved-space class
on desktop, just its own 'sounds-open' body class instead of
'filters-open'), except it still slides from the bottom on
mobile rather than the top. Mutually exclusive with the filter
panel: opening either one closes the other, same as both
already do with the image viewer, so there's never two panels
sliding in over each other at once.

## `// panel above (slides from the top on mobile / docks right on`

Discord panel -- structurally identical open/close to the filter
panel above (slides from the top on mobile / docks right on
desktop, same scroll lock / reserved-space treatment), just its
own 'discord-open' body class. Mutually exclusive with the other
panels, same as they already are with each other.

## `// panel above (slides from the top on mobile / docks right on`

Game panel -- structurally identical open/close to the filter
panel above (slides from the top on mobile / docks right on
desktop, same scroll lock / reserved-space treatment), just its
own 'game-open' body class. Mutually exclusive with the other
panels, same as they already are with each other.

## `// own comment) for every path that can call this -- the nav`

Covers "opens the game panel again" (see exitTeamAddMode()'s
own comment) for every path that can call this -- the nav
bar's own game button, confirmTeamAddSelection() itself
reopening back to Team Tracker, or anything else -- rather
than needing each caller to remember to exit add mode
first. Unconditional (outside the .open guard below) since
add mode is only ever active while this panel is already
closed, so there's no case where skipping this would matter.

## `// business staying open once the whole panel closes -- the`

A live camera stream (see openLobbyScanOverlay()) has no
business staying open once the whole panel closes -- the
scan overlay's own Cancel button and a successful scan
both already handle this, but the panel can close out from
under it via other paths too (tapping the backdrop, the
top-level nav, etc.), so this is the one place that
guarantees it regardless of how the panel actually closed.

## `// screen via transform rather than unmounting (see its own`

Same reasoning for these two -- #game-panel moves off-
screen via transform rather than unmounting (see its own
CSS), so leaving either .visible when the panel closes
would just have it silently still open, off-screen, ready
to reappear the moment the panel reopens somewhere else
entirely.

## `//`

---- Game panel contents (save system + menu/tool screens) ----

Three fixed save slots (see GAME_SAVE_SLOT_COUNT), each holding
everything a single playthrough needs -- badges, team, and
whatever else future tools add -- as one bundle, so loading a
save brings all of it in at once and deleting one clears all of
it in one go. Persisted to localStorage the same defensive way
audio settings are (see loadAudioSettings() below), just
simpler here since a save's shape isn't user-editable the way
settings are.

## `// handoff or automatic failover) while all three regular slots are`

A fourth, takeover-only slot: when a device becomes the host (manual
handoff or automatic failover) while all three regular slots are
full, the game runs from here, and the player is asked to delete
one of their saves so it can move into the freed regular slot.
Never offered for ordinary "+ New Save" -- see findFreeSaveSlot().

## `// One save-level choice that replaces the old Use Virtual Decks? / Use In-App Region Map?`

===== Play Mode ("How Will You Be Playing?") =====
One save-level choice that replaces the old Use Virtual Decks? / Use In-App Region Map? / Which Style? trio.
The three old fields are still stored on every save (derived from the mode by applyPlayModeToRules()), so the many
places that read virtualDecksEnabled / regionMapEnabled / regionMapStyle -- and older app versions that only know
those -- keep working unchanged. The extra per-mode rules (display host, Battle Arena, dice) read the PLAY_MODES table.
virtualCards : Hand & Decks (and the Tiered TM option) are available
map          : the in-app region map exists for this save; style = which of the region's two maps it uses
displayHost  : the map is shown on a separate host device that is not playing (no solo play)
arena        : Battle Arena is open       virtualDice : the app rolls the dice (movement die, Arena dice)

## `// That device always hosts without playing, on the same room code every time (so guests w`

---- Display-host modes (TV Table / Hybrid 2): the save belongs to the one device that first hosted it ----
That device always hosts without playing, on the same room code every time (so guests waiting for it find it again);
nobody else can host the game (no hand-off, no automatic failover), and guests simply wait for it to come back.
What a host that is only hosting (not playing) is called: it has no player to name, so it is never asked.

## `// created before that setting existed -- defaulted to false`

Backfills the "Use Virtual Decks?" setting onto any save
created before that setting existed -- defaulted to false
(off), same reasoning as migrateNaturesEnabled() above: this
is an opt-in feature for players without physical cards, an
existing save shouldn't suddenly gain the Hand & Decks tool
it never asked for.

## `// created before it existed -- hand starts empty same as a`

Backfills the Hand & Decks tool's own fields onto any save
created before it existed -- hand starts empty same as a
fresh save's own emptySaveScopedData(), decks starts as an
empty object (each deck lazily built the first time it's
drawn from -- see ensureHostDeckStore()/ensureDeckBuilt()).

## `// Tracker (and eventually Trainer Card) read and write through`

In-memory-only "unsaved session" -- what Badge Tracker/Team
Tracker (and eventually Trainer Card) read and write through
whenever no save is active, via getActiveSaveData() below.
Deliberately never persisted to localStorage: that's the whole
point of the "Save This Progress" safety net further down --
if this silently survived a refresh on its own, there'd be no
real difference between "saved" and "unsaved" and nothing to
ever nudge anyone about.

## `// createSave() below, which seeds from this) and for the`

pokeCoins starts at 3 -- both for a brand-new save (see
createSave() below, which seeds from this) and for the
in-memory unsaved session, so "Save This Progress" always
seeds a real save from the same starting point a fresh one
would have had anyway.

team.members is an ordered array rather than 6 fixed keyed
slots -- an empty roster is just an empty array, and
renderTeamGrid() (see the script) pads it out to 6 display
slots itself, the same way an array of collected badges
would rather than a struct with 6 named fields. Each entry
is {dex, name, src, shinysrc, shiny, status, level} -- the
first four mirror the fields already available on a gallery
<img> (see the fetch() that builds .image-card below), and
shiny is set from the confirm card's own checkbox in
confirmTeamAddSelection() (see the chat this was decided
in) -- renderTeamGrid() picks between src/shinysrc using it
the same way setShinyShowing() does for the viewer.
status/level are both edited later, straight from each
slot's own corner badges (see STATUS_CONDITIONS/
openTeamStatusOverlay() and adjustTeamMemberLevel()) --
status is a STATUS_CONDITIONS id or null for "none set
yet", level is an integer clamped 0-6.
hand -- this device's own Hand & Decks cards (see the
Hand & Decks tool below), an array of cards.json ids.
Deliberately NOT decks -- deck draw/discard pile state is
owned by whichever save is actually hosting/soloing the
game, not by every save-scoped bundle equally (see
ensureHostDeckStore()); a guest's own save only ever
needs to remember its own hand.
trainerCardId -- this player's chosen Trainer Card (an id
from trainer-cards.json), or null before they've picked one.
See the Trainer Cards section of the script.

## `// through, so tool code never needs its own if/else for "is`

The one accessor every save-scoped tool should read/write
through, so tool code never needs its own if/else for "is
there a real save right now or not" -- it just asks for
"whatever's active," and gets a direct reference it can
mutate in place either way.

## `// string standing in for whichever save getActiveSaveData()`

Battle Arena's own "which team is this" identity -- a stable
string standing in for whichever save getActiveSaveData()
above would currently resolve to, so a battle slot's occupant
can remember which team it actually came from even after the
player switches to a different save (see
setBattleAttackerIndex()/setBattleDefenderIndex() and their
own *TeamId variables). Three cases, same three
getActiveSaveData() itself branches on: a real host save
(keyed by its slot number), a guest save (keyed by its own
id, since guest saves aren't numbered slots), or neither --
the in-memory "unsaved session" -- which is a single shared
object rather than one of several, so it just gets one fixed
id rather than needing one per-instance.

## `// This Progress" flow (see promptSaveUnsavedProgress()) so`

Set right before opening a slot's creation form via the "Save
This Progress" flow (see promptSaveUnsavedProgress()) so
createSave() below knows to seed the new save from the
in-memory session instead of starting it empty -- cleared again
on either an actual create or a cancel, so it can never leak
into an unrelated later "+ New Save".

## `// what lets a guest's own save find its way back to this`

Minted once, here, and never touched again -- this is
what lets a guest's own save find its way back to this
exact host save across sessions (see Guest Saves notes
below), even though the Lobby's room *code* changes
every time hosting starts. A room code identifies a
session; this identifies the save.

## `// save -- an optional house rule, off by default (see`

Whether the Hand & Decks tool shows at all for this
save -- an optional house rule, off by default (see
the creation form's own 'no'-selected option), same
shape as naturesEnabled/pokeCoinsEnabled above. Unlike
those two though, this one's intended for players
WITHOUT the physical board game's paper cards, not a
ruleset variant -- the assumption is most saves have
real cards on hand and don't need this at all. See
isVirtualDecksEnabledForActiveSave().

## `// TM Deck (see getEffectiveCardDeck()/getDeckToolList())`

Whether the TM Deck splits into Novice/Advanced/Expert
TM Deck (see getEffectiveCardDeck()/getDeckToolList())
for this save -- an optional house rule, off by
default (see the creation form's own 'no'-selected
option), same shape as virtualDecksEnabled/
naturesEnabled/pokeCoinsEnabled above. Only actually
does anything once virtualDecksEnabled is also on --
there's no Decks screen to show a split deck on
otherwise -- but stored independently rather than
implied by it, same as every other rule here. See
isTieredTMDecksEnabledForActiveSave().

## `// save, and whether Begin Game Setup forces a card pick`

Whether the Trainer Card tool is open at all for this
save, and whether Begin Game Setup forces a card pick
before the Starter pick -- an optional house rule, off
by default (see the creation form's own 'no'-selected
option), same shape as the toggles above. See
isTrainerCardsEnabledForActiveSave().

## `// region's two maps -- 'condensed' (virtual tokens) or 'full' (physical tokens). A save m`

The Virtual Game Board: whether this save uses the in-app region map at all, and which of the
region's two maps -- 'condensed' (virtual tokens) or 'full' (physical tokens). A save made before
this existed has neither field and is treated as on + condensed (see getRegionMapSettingsForActiveSave()).

## `// derive this for real -- 'early' matches the Sounds`

Placeholder until the badge tracker exists to actually
derive this for real -- 'early' matches the Sounds
panel's own GAME_STAGE_ORDER labels (see
setActiveGameStage() below) so the two line up once
they're wired together. deriveGameStage() below is
ready for that; just not called from anywhere but the
Test button yet.

## `// keyed by their persistent guestClientId (same reasoning`

Host-only: which Trainer Card every OTHER player holds,
keyed by their persistent guestClientId (same reasoning
as guestHands below), as { cardId, name }. Lets the host
refuse a second player the same card, and survives a
player dropping and rejoining or this device reloading.
See hostApplyTrainerCardClaim().

## `// readHostActiveCard()/setHostActiveCard() and the chat`

The shared Active Card zone's own state -- see
readHostActiveCard()/setHostActiveCard() and the chat
this was designed in. null means the zone is
minimized/empty for everyone; only ever read/written
on the device hosting (or soloing) this save, same
"authoritative on exactly one device" shape as decks/
guestHands above.

## `// ----`

---- Guest Saves (see GAME_PANEL_NOTES.md's Guest Saves notes)
----

A second, structurally different save bank alongside the 3
fixed host slots above: unbounded rather than fixed-count, keyed
by the *host's* hostSaveId rather than a small integer index
(which is what actually gives "one save per hosted game" for
free -- a plain object can't hold two entries under the same
key), and editable in exactly one respect (playerName) rather
than carrying the host save's full rule-setting form. Everything
else on a guest save (region/gameLength/
typeEffectivenessRule/hpRule) is a cached copy of the host's own
values, refreshed on every successful connection (see
finalizeGuestJoin()) purely so this save can still be viewed
read-only while offline -- never guest-editable, and never the
source of truth for anything while actually connected (the
host's live save is that, same as Playlist Sync/Leading-Player
Stage's "ask the host" pattern).

## `// view -- unlike hostSaveId (which identifies a *save*) or`

This device's own persistent identity from a HOST's point of
view -- unlike hostSaveId (which identifies a *save*) or
conn.peer (a random id PeerJS mints fresh every connection),
this is the one thing that survives both a reconnect AND the
Host's own device reloading mid-session. Minted once and
cached in this device's own localStorage (not part of any
save, since it's the same identity regardless of which guest
save/hostSaveId it's currently joined to). See finalizeGuestJoin()
(sends it in 'identify') and wireHostConnection() (keys
save.guestHands by it) for what it's actually for -- letting
the Host durably remember *this specific player's* Hand &
Decks hand across drops/reconnects/host-device reloads alike.

## `//`

---- Default Save Settings ----

A small, separate preference (not tied to any one save) for
what the "+ New Save" form's own rule selects should start
on -- added after the fact because someone who always plays,
say, a short game with all-types-plus-immunities kept having
to re-pick the same four values by hand every single time.
Deliberately doesn't cover Region: unlike the other four
fields (which tend to be a fixed personal preference across
every game someone starts), region is usually the whole point
of starting a *new* save in the first place, so defaulting it
seemed more likely to be wrong than helpful. Easy to add if
that assumption turns out wrong in practice.

Shape: { gameLength?, typeEffectivenessRule?,
hpRule? } -- any field can simply be absent, which
applyGameSaveDefaultsToForm() below treats as "leave that
select on whatever its own HTML `selected` default already
is." In practice every field always has a value once the
Default Save Settings selects have been touched at all (see
their 'change' handler), since there's no "no default" option
in that UI -- the shape just stays open to a field being
unset for a save created before this feature existed.

## `// device-wide rather than per-save, and not applied to the`

The player's Preferred Name (Default Save Settings card) --
device-wide rather than per-save, and not applied to the
"+ New Save" form (a save's own name is a different thing).
It pre-fills every "what should others call you?" field, and
is the fallback when that field is left blank.

## `// form's own selects -- called from beginCreatingSave() below,`

Applies whatever's in gameSaveDefaults to a save-creation
form's own selects -- called from beginCreatingSave() below,
right as that form opens. A field simply left unset in
gameSaveDefaults is skipped entirely, leaving that select on
its own built-in HTML default (e.g. Game Length's `selected`
option) rather than forcing a value.

## `// gameSaveDefaults, falling back to each select's first/'selected'`

Populates the Default Save Settings card's own selects from
gameSaveDefaults, falling back to each select's first/`selected`
HTML option (i.e. leaving it alone) for any field that's never
actually been set -- called once at page load (see the
initial-calls block at the very end of the script).

## `// is live-connected to the specific lobby it's linked to --`

A guest save is only ever actually editable while this device
is live-connected to the specific lobby it's linked to --
otherwise it's a read-only look at where things stood last time
(see the Team Tracker/Badge Tracker read-only locks further
down, both gated on this). Viewing a *host* save is always
editable; there's no read-only concept on that side.

## `// script further down) the moment it's worked out the real region`

Called from populateMusicControls() (see the Sounds panel's own
script further down) the moment it's worked out the real region
list from music-tracks.json, so save creation can never disagree
with the Sounds panel about what counts as a real region --
both read off the exact same derivation. "template" is
scaffolding data in that JSON (see its own template-* tracks),
not a real region, so it's dropped here even though the Sounds
panel's own region buttons don't bother making that distinction
for themselves.
Cached the moment populateGameRegionOptions() below runs, so
getActiveRegionForBadges() has a real region to fall back to
for an unsaved session (which, having skipped save creation,
never picked one of its own).

## `// single value or an array -- a single shared entry like`

gym-badges.json's region/tier fields can each be either a
single value or an array -- a single shared entry like
"elite-four" applies to a whole list of regions at once, and
Orange Islands' badges each cover 2 tiers at once. These two
helpers normalize either shape to an array so the rest of this
code never needs its own array-or-not branch.

## `// grouped into slots by shared Tier(s) -- multiple entries`

Every gym-badges.json entry matching (region, category),
grouped into slots by shared Tier(s) -- multiple entries
sharing the exact same Tier(s) are alternative options for
that one slot (e.g. Galar's Fighting/Ghost Badge, both Tier 4
-- collecting one makes the other permanently inaccessible,
same as before), while an entry with an array Tier (e.g.
Orange Islands' Coral-Eye Badge, Tiers 1+2) becomes its own
slot spanning that many Tiers at once, worth all of their
combined points the moment it's collected (see
getBadgeTiersForOptionId()/computeBadgePoints() below).
category is null for the main tiered badges, or one of
'villain' | 'elite-four' | 'path-of-legends' |
'starfall-street' for the non-scoring extras that go after
them (see renderBadgeExtras()) -- those never touch Badge
Points/Count regardless of Tier, since they represent an
action (beating a villain, clearing the Elite Four) rather
than a Gym win.

## `// whatever buildBadgeSlots() actually finds for the region (e.g.`

The main grid's slots -- usually 8 (one per Tier), but
whatever buildBadgeSlots() actually finds for the region (e.g.
Orange Islands' 4 Tier-pairs). Falls back to 8 empty
placeholder slots only if the region has NO main entries at
all yet, so an entirely-unbuilt region still shows the
expected grid shape rather than collapsing to nothing; a
region with SOME entries shows exactly those, with no
synthesized gaps for any Tier it's missing.

## `// goes in which position -- Path of Legends and Starfall Street`

Categories where Tier doesn't actually fix which named badge
goes in which position -- Path of Legends and Starfall Street
can be collected in any order, so any of the 5 named badges in
one of these sets can end up in any of its 5 slots, and a
slot's position is really just "the Nth badge collected from
this set" (see getExtraPool()/collectBadge() below), not tied
to a specific badge's own Tier the way buildBadgeSlots() above
assumes for everything else (main tiered badges, Villain,
Elite Four). Tier still exists on these entries in
gym-badges.json -- it's just inert now, unused by any of the
rendering/collection logic below.

## `// Tier entirely -- ordering here doesn't matter either, since`

Every named badge available for (region, category), ignoring
Tier entirely -- ordering here doesn't matter either, since
renderBadgeExtras() below only ever uses this to know how many
slots exist (pool.length) and, together with
data.badges.collectedExtras[category] (an ordered array of ids
for these two categories, not the tier-keyed object every
other category uses), which named badges are still available
to collect.

## `// actually collected (data.badges.collected -- see`

Highest Tier among every badge the currently-given save has
actually collected (data.badges.collected -- see
collectBadge()'s own comment for that shape, and
getBadgeTiersForOptionId() just above for how a collected
optionId maps back to its own real Tier(s)) -- 0 if nothing's
collected yet, or if gymBadges hasn't finished loading. Only
ever reads the main tiered slots, not collectedExtras (Elite
Four/villain wins/etc., see getExtraPool()'s own comment) --
those aren't Tier-numbered achievements the same way a real
Gym Badge is. This is purely a LOCAL read of whichever save
is active on THIS device -- see isTMDeckUnlockedForActiveSave()
below, the one thing that actually calls this, for why that's
the right save to be checking.

## `// (chosen at creation); an unsaved session never went through`

Which region's badges to show. A real save always has one
(chosen at creation); an unsaved session never went through
that step, so it falls back to whichever region loaded first,
purely so the Badge Tracker stays usable pre-save -- the same
"always allow unsaved use" reasoning as the rest of this
panel. The real region chosen at save time takes over the
moment "Save This Progress" actually commits one.
Which region's badges to actually show right now. Host saves
are simple (the save's own region, full stop); Guest Saves are
not, and this used to get that wrong -- it predates Guest
Saves entirely and only ever checked activeSaveSlot, so a
connected guest silently fell through to
cachedRealRegionList[0] ('kanto' in practice) instead of the
host's actual region. Fixed to check activeGuestSaveId too,
and -- per the user's explicit ask -- to prefer the *live*
musicState.activeRegion over the guest save's own cached
region field while an actual connection is active, since the
host's region can change mid-session (see Playlist Sync) and
the cached field only refreshes at connect time (see
finalizeGuestJoin()). Viewing a guest save offline (not the
live connection for it) falls back to that cached copy, which
is the best information available at that point.

## `// is already one entry per collected slot regardless of how many`

Simple count of collected badge slots -- data.badges.collected
is already one entry per collected slot regardless of how many
Tiers that slot spans (see collectBadge()), so its own length
is exactly that. Only ever reads data.badges.collected (the
main tiered badges) -- data.badges.collectedExtras (villain/
Elite Four/Path of Legends/Starfall Street) is deliberately
never touched here, since those don't count toward the total.

## `// shared by the main grid and the extras section below it, so`

Builds one <button class="game-badge-box"> for a given slot --
shared by the main grid and the extras section below it, so
both look and behave identically. hueSeed just needs to vary
per box for --badge-tier-hue's rainbow spread; which number
specifically doesn't matter beyond that.
Reward/marker icon shown in a slot's upper-right corner, keyed
by a short internal name rather than baked in as a literal URL
per rule -- see BADGE_CORNER_ICON_URLS just below for what
each currently points to. All four happen to point at the
same placeholder image for now; swapping in real per-icon
artwork later only ever touches that lookup, not this rule
logic or anything that calls it.

## `// Islands' Sea Ruby Badge (Tiers 3+4) still counts as`

Main tiered badges -- a multi-Tier merge like Orange
Islands' Sea Ruby Badge (Tiers 3+4) still counts as
"Tier 3" for this, same as Spike Shell Badge (Tiers
5+6) still counts as "Tier 5" -- it's an *inclusion*
check rather than requiring an exact single-Tier
match, so a merged slot picks up whichever of its
Tiers would've earned an icon on its own.

## `// bundled unit -- the circle background needs to stay behind`

Split into two separately-layered pieces rather than one
bundled unit -- the circle background needs to stay behind
every image (both the corner marker's own and, once
collected, the badge artwork's), while the marker image
itself needs to end up in front of both. Bundling them
together as one element can't express "circle behind
everything, image in front of everything" at the same
time, since a single element's children can't independently
interleave with siblings outside it.

## `// than pretending a badge is there, mark it unavailable`

Nothing in gym-badges.json for this slot yet -- rather
than pretending a badge is there, mark it unavailable
and disabled (disabled buttons don't dispatch click at
all, so no extra guard is needed in the click handler
for this). No corner icon either, for the same reason
-- there's no real badge here to mark up yet.

## `// underneath the artwork (empty of any label text) as a`

Collected -- the plain silhouette circle stays visible
underneath the artwork (empty of any label text) as a
permanent border/frame around it, the same role the
corner circle already plays for its own marker image.
DOM order here is what actually controls stacking (see
.game-badge-box's own CSS comment): silhouette circle,
then the corner circle -- both circles, both behind
everything -- then the badge artwork, then the corner
marker image last so it ends up in front of the
artwork too.

## `// Tier number now replaces that number inside the icon`

Empty -- what used to be a separate label below a bare
Tier number now replaces that number inside the icon
itself. Same circles-then-image DOM order as the
collected case above, just with no badge artwork layer
in between -- the corner marker still ends up on top of
the plain silhouette either way.

## `// per how each region actually combines them (only these two`

Villain/Elite Four/Path of Legends/Starfall Street, laid out
per how each region actually combines them (only these two
combinations exist in gym-badges.json right now):

- Villain + Elite Four (every region except Paldea so far):
one row, Elite Four on the left, Villain on the right.
- Elite Four + Path of Legends + Starfall Street (Paldea
only so far): the first Path of Legends and first
Starfall Street badges flank Elite Four on one row (Path
of Legends left, Starfall Street right), then everything
else groups into rows of four -- two more Path of Legends
badges plus two more Starfall Street badges per row, until
both sets run out. Which named badge ends up "first" (or
in any other position) isn't fixed for these two sets
(see POOL_BASED_EXTRA_CATEGORIES) -- position 0 is just
"whichever badge from this set was collected first," and
so on, so this is by collection order, not by any
particular badge's own Tier.

Falls back gracefully if a region only has one of a pair (or
none at all) rather than assuming both are always present.

## `// pool position rather than per fixed Tier slot. Passing the`

Pool-based equivalent of boxFor() above -- one box per
pool position rather than per fixed Tier slot. Passing the
full pool as the pseudo-slot's own "options" (rather than
just whatever's left to collect) is deliberate:
buildBadgeBoxElement() only checks options.length to tell
"nothing here yet" (0) apart from "something's here"
(>0), and the pool itself is never empty for a region that
has this category at all, so this always reads as
available regardless of how much of it is already
collected.

## `// more Starfall Street per row, until both sets are`

Everything else: two more Path of Legends plus two
more Starfall Street per row, until both sets are
exhausted (they may not empty at exactly the same
rate if a region ever has an uneven number of each --
slice() just contributes nothing further past the end
of a shorter set).

## `// and 89.286% (150/168) art-inside-frame inset ratio as the main`

Team Tracker's own frame grid -- same Token-Border.png artwork
and 89.286% (150/168) art-inside-frame inset ratio as the main
gallery's .image-card and the viewer's own .related-thumb-wrap
(see those rules' own comments for the source of this
technique), just arranged as a fixed 3-row/2-column CSS grid
(see .game-team-grid/.game-team-slot) instead of either of
those two's own flowing layouts, since a team is always
exactly 6 slots rather than an open-ended set.

Always renders all 6 regardless of how many members
data.team.members actually holds -- pads out with plain empty
frames rather than only rendering as many boxes as there are
members, so the six slots read as fixed roster positions
instead of a list that happens to be some number of items
long. slot.dataset.filled/.index record which case each one is
and its position in the array, read back by all three of the
#game-scroll delegated click listener's own branches below
(hit-zone, status corner, level corner).

Each slot's own .game-team-slot-hit-zone is the same circular-
clip-path technique as .image-card/.hit-zone (see its own CSS
comment for why) -- restoring the click target to just the art
circle, rather than the slot's full square, is what leaves the
bottom two corners free for .game-team-slot-status/-level
below, the same way that same circle already leaves
.game-badge-corner-icon-wrap's own corner free on a badge box.
What clicking the hit-zone itself does depends on
teamReplacePendingMember (see its own comment): normally an
empty slot opens openTeamAddPromptOverlay() and a filled one is
a no-op, but with a replacement pending every filled slot
becomes a valid target instead, and there are no empty slots
left for that case to matter anyway (six spots have to be full
before a replacement can even become pending -- see
confirmTeamAddSelection()).

The status/level corners themselves only ever render for a
filled slot -- an empty one has no Pokémon to hang either piece
of information off of.

Also toggles #game-team-add-btn/#game-team-replace-banner to
match whichever of those two states is current -- grouped here
rather than left to each place that changes
teamReplacePendingMember, since every one of them already calls
this right afterward to redraw the grid itself.
Interval IDs for every currently-running evolution-badge
crossfade (see startEvolutionBadgeCycle() below) -- cleared and
rebuilt at the top of every renderTeamGrid() call, since that
function always tears down and rebuilds the whole grid's markup
from scratch; nothing else ever adds to or clears this array.

## `// .evolution-cycle-layer <img> elements -- 2 seconds on each`

Crossfades between a multi-icon evolution badge's stacked
.evolution-cycle-layer <img> elements -- 2 seconds on each
icon, then a 0.5s opacity fade to the next (the CSS transition
on .evolution-cycle-layer itself is what actually animates the
fade; this just flips which layer has .evolution-cycle-active
every 2.5s, in sync with that transition's own duration). Only
ever called for a badge with more than one icon at all -- see
renderTeamGrid()'s own call site -- so a single-icon badge
never pays for a timer it doesn't need. The returned interval
ID is the caller's responsibility to track and clear (see
activeEvolutionBadgeIntervals above); this function doesn't
track it itself since it has no way to know when its own badge
element gets torn down.

## `// needs to track and clear just this one interval by itself`

Returned (in addition to the push above) so a caller that
needs to track and clear just this one interval by itself
-- rather than relying on activeEvolutionBadgeIntervals'
own "cleared at the top of renderTeamGrid()" cleanup,
which never runs for a render this call didn't come from
-- has something to hold onto. See
battleWildEvolutionBadgeInterval's own comment for the one
place that actually needs this.

## `// renderTeamGrid()'s own per-slot loop so the exact same badge`

HP badge (top-left corner) builder -- pulled out of
renderTeamGrid()'s own per-slot loop so the exact same badge
(same classes, same computeTeamHpState() read, same click
target for the #game-scroll delegated listener's own
.game-team-slot-hp branch) can also be built for the Wild
Pokémon occupying Battle Arena's Defender slot (see
renderBattleWildDefenderSlotBody()) -- a member that was never
added to any roster, so renderTeamGrid()'s own loop never
builds one for it. index is whatever the caller's own
data-index should read back as later -- a real roster
position for renderTeamGrid()'s own callers, or the 'wild'
sentinel for the Wild Pokémon (see getTeamSlotMember()'s own
comment for why that sentinel exists at all).

## `// by the Wild Pokémon slot" reasoning as buildHpBadge() above.`

Status Condition badge builder -- same "pulled out for reuse
by the Wild Pokémon slot" reasoning as buildHpBadge() above.
References STATUS_CONDITIONS/NO_STATUS_PLACEHOLDER/
statusImageMarkup()/STATUS_COUNTER_CONFIG, all declared later
in this file -- fine, since (like every other forward
reference in this doc) nothing here actually runs until a
render call happens well after the whole script has loaded.

## `// first draws it (so clock differences don't matter, and a redraw mid-pulse carries on ra`

Radio: PKMN Lullaby just put it to sleep: the badge pulses for 2.5 seconds. Each device times its own pulse from when it
first draws it (so clock differences don't matter, and a redraw mid-pulse carries on rather than restarting); a stamp that's
long out of date (a reloaded save) is ignored.

## `// banner: the full read-only card of whatever sits in the Arena`

Fills (or empties) the opponent preview under the send-to-battle
banner: the full read-only card of whatever sits in the Arena
half OPPOSITE the one being sent to -- Wild, the NPC Trainer's,
another player's, or one of this device's own from a different
team. Called by renderTeamGrid(). Hidden when send-to-battle
isn't aimed at a half (Team Tracker's own button, where the half
isn't chosen until after the tap) or the other half is empty.
Uses its own 'preview' evolution-timer key so it never disturbs
the Arena's own read-only cards.

## `// below) owns a running setInterval -- this whole grid gets`

Every multi-icon evolution badge (see startEvolutionBadgeCycle()
below) owns a running setInterval -- this whole grid gets
torn down and rebuilt from scratch below, so anything left
over from the previous render would keep firing against
<img> elements no longer in the DOM. Cleared unconditionally
up front rather than only when a badge is about to be
replaced, since there's no cheaper way to know in advance
which (if any) of this render's badges will end up
single-icon instead.

## `// any of the five modes -- replacing, releasing,`

Add/Trade/Release/Send-to-Battle all hide together for
any of the five modes -- replacing, releasing,
negotiatingTrade, attachingFromHand, and now
sendingToBattle are mutually exclusive in practice: each
mode's own entry point (beginTeamReleaseMode(),
requestAttachFromHand(), beginTeamSendToBattleMode(),
etc.) is only ever reachable via a button this same
visibility logic already hides while any other mode is
active, and every other mutating control on this screen
(trade/HP/evolve/etc.) now also refuses to fire while
handAttachPendingCardId is set, same as they already did
for the other three -- see each of their own guard
clauses. So at most one of the five banners below is ever
visible at once. Trade stays hidden for the WHOLE
negotiation (see isTradeNegotiationActive()'s own comment),
not just while still picking -- selectingTradeOffer (the
narrower window) only matters for which banner text shows
below, since the trade-select banner specifically is only
relevant before a pick is made.

Trade a Pok\u00e9mon additionally only ever shows at all with
a live Lobby connection AND at least one other player in
it (lobbyState.players always includes this device itself,
hence >1 rather than >0) AND no trade already in progress
of any kind (covers the invite-sent/invite-received phases
too, not just this active-picking one -- can't have two
trades going at once) AND a live, editable save (same
guard every other mutating control here already has).
Before the host presses Start Game: no releasing, no trading,
and adding only for the starter itself (see
canAddTeamMemberNow()); renderTeamPregameControls() below
puts the starter's Lock In button in their place.

## `// a future tool (see the chat this was added in) that'll`

Not read by anything yet -- a plain DOM-level flag for
a future tool (see the chat this was added in) that'll
need to tell at a glance which team members currently
have an Overlay Card on them (ineligible for whatever
that tool does), without digging back into
member.overlayCardId itself. Kept in sync here
alongside the .fainted class below, same "set once per
render, straight off the member's own data" approach.

## `// see computeTeamEvolutionState()'s own comment) shows`

A toggled-on Mega/Gigantamax (member.formOverride --
see computeTeamEvolutionState()'s own comment) shows
that alt-form's art instead of the member's own,
still respecting the shiny flag against whichever
set of src/shinysrc is actually in play -- the base
species' own src/shinysrc when there's no override,
the override entry's when there is. Falls back to
the member's own art if the override name somehow
isn't in POKEMON_BY_NAME (e.g. rendered before the
pokemon-data.json fetch resolves) rather than
showing nothing.

## `// the confirm card's own checkbox) picks shinysrc`

member.shiny (set by confirmTeamAddSelection() from
the confirm card's own checkbox) picks shinysrc
over src the same way setShinyShowing() does
elsewhere -- hasShinyForm() guards against a member
whose shiny flag is somehow true but whose
shinysrc isn't a real URL (shouldn't happen given
that checkbox is disabled for a no-shiny-form
Pokémon, but costs nothing to check here too).

## `// comment. Independent of .fainted above -- a`

See .game-team-slot-img.has-overlay's own CSS
comment. Independent of .fainted above -- a
member can be both at once, and the two darkening
amounts stack (CSS filters compose), which is fine
here; there's no case where that combination needs
to look identical to just one or the other.

## `// both slots (see computeTeamCardsState()'s own`

Attach/Nature Cards (bottom-right) -- one badge covers
both slots (see computeTeamCardsState()'s own
comment). Gets the .pill class only when both an
Attach and a Nature icon are showing at once --
see .game-team-slot-cards.pill in the CSS for the
taller shape that makes room for the second icon.

Each image renders as a plain <img> when crop is
null (a real iconUrl, or one of the CARD_SLOT_IMAGES
fallbacks) or, when cardIconFor() fell back to
auto-cropping imageUrl (see ICON_CROP_BY_CARD_TYPE),
as a small wrapper clipping an oversized <img> of
the full card art -- zooming in on just the
illustration box instead of squishing the whole
card into the circle. Deliberately built from a
real <img> rather than a CSS background-image (an
earlier version of this used background-size/
-position) since background-image scaling on a
clipped/composited layer like this badge rendered
visibly jagged in testing -- ordinary <img> scaling
doesn't have that problem. cropIconMarkup() below
does the size/position -> CSS math; see its own
comment for why plain percentages don't work here.
Each icon only gets wrapped in the extra
.game-team-slot-cards-icon-slot positioning anchor
when it actually needs to carry a count overlay
(img.count is a number, not null) -- the plain
<img>/cropIconMarkup() markup stays exactly as
before for every icon that doesn't, so a member
with no itemCounters card equipped renders
identically to before this was added. Count
itself follows .game-team-slot-status-count's own
"left-anchored, vertically centered by the flex
parent's own align-items before going absolute"
trick -- see that class's CSS comment. (See
buildCardsBadge()'s own definition above for the
actual markup -- pulled out from here so the Wild
Pokémon slot can build the exact same badge.)

## `// (see its own comment, mirroring badgeImageMarkup()'s`

Status Condition (bottom-left) -- statusImageMarkup()
(see its own comment, mirroring badgeImageMarkup()'s
exact convention) renders NO_STATUS_PLACEHOLDER's own
'placeholder' sentinel the same way it would any
STATUS_CONDITIONS entry still waiting on real art,
rather than a special-cased empty circle, for a
member with no status set yet.
Fainted: darken just the inner image, leaving the
badge's own border/background at full brightness
(see .game-team-corner-img-dimmed's own CSS
comment for why -- a whole-badge dim used to wash
out the white border along with everything else).
The actual click block lives entirely in the
#game-scroll delegated listener's own
.game-team-slot-status branch; this is purely
visual. Current count, if this status is one of
the four STATUS_COUNTER_CONFIG tracks (see its own
comment) -- pointer-events: none (see the CSS) so
it's purely a readout laid over the art, not a
second click target competing with the corner's
existing single click zone. (See buildStatusBadge()'s
own definition above for the actual markup --
pulled out from here so the Wild Pokémon slot can
build the exact same badge.)

## `// adjustTeamMemberLevel() rather than here. Text`

Level (bottom-right) -- 0-6, clamped in
adjustTeamMemberLevel() rather than here. Text
lives in its own inner span (rather than
levelBadge.textContent directly) so a mobile-only
nudge can transform: translateY() just the digits
-- see .game-team-slot-level-value's own CSS
comment for why that's a real 1:1 pixel shift where
padding-top on the badge itself (which is also its
own flex-centering container) was only ever moving
the visible text by half of whatever value was set,
per the chat this was reworked in. (See
buildLevelBadge()'s own definition above -- pulled
out from here so the Wild Pokémon slot can build
the exact same badge.)

## `// behavior both driven by computeTeamEvolutionState()`

Evolution (top-right) -- icon(s) and click
behavior both driven by computeTeamEvolutionState()
(see its own comment); the #game-scroll delegated
listener further down is what actually reacts to a
tap here. A single-icon state (the common case) is
just a plain static image; a multi-icon state
(currently only "can both Mega Evolve and
Gigantamax") gets one stacked layer per icon and a
running crossfade started via
startEvolutionBadgeCycle() below, tracked in
activeEvolutionBadgeIntervals so the next render
can clear it rather than leaking timers.

## `// path (see computeTeamEvolutionState()'s own`

dimmed only ever applies to this single-icon
path (see computeTeamEvolutionState()'s own
comment -- it's exclusively the "fainted, and
nothing at all is available" case), darkening
just the icon itself rather than the whole
badge circle -- same
.game-team-corner-img-dimmed treatment as the
fainted Status corner's own image, for the same
"keep the white border readable" reason.

## `// corners, this one doesn't always exist: per the`

Overlay Card (dead center) -- unlike the other four
corners, this one doesn't always exist: per the
chat this was designed in, there's meant to be
nothing at all here -- no button, no placeholder --
until a card actually gets placed (see
commitOverlayToMember()/selectTeamDetailOverlayOption()).
Reuses cardIconFor()/cropIconMarkup() exactly as
the Attach/Nature badge above does for its own
icon, but never becomes a "pill" -- there's only
ever the one card here, not two.

## `// clone of whichever slot here it's currently showing --`

Keeps Battle Arena's Attacker and Defender slots (each a
clone of whichever slot here it's currently showing --
see renderBattleAttackerSlot()/renderBattleDefenderSlot())
in sync with every edit made through this grid, regardless
of which screen is actually visible right now. Cheap even
when Battle Arena isn't the active screen -- it's just two
hidden DOM nodes being rebuilt, same as this whole grid
already gets rebuilt on every call, and doing it here
rather than at each of this grid's ~10 individual mutation
call sites means a future one doesn't need its own
explicit reminder to keep these in sync too.

## `// team" instead of "open the viewer" -- see beginTeamAddMode()/`

Whether a gallery click currently means "pick a Pokémon for the
team" instead of "open the viewer" -- see beginTeamAddMode()/
exitTeamAddMode() below, attachImageEvents()'s own hit-zone
listener (the actual branch point), and #team-add-mode-banner/
cursor:copy in the CSS for how this stays visible to the
player while it's on. teamAddCandidateImg is only meaningful
while #gallery-team-add-confirm-overlay is open -- it's the
specific gallery <img> that confirm is currently asking about,
read by confirmTeamAddSelection() once "Add This Pokémon..."
is actually clicked.

## `// any Add Pokémon session, regardless of what the filter panel's`

Tags force-excluded from the gallery for the whole duration of
any Add Pokémon session, regardless of what the filter panel's
own buttons say -- see filterGallery()'s own
teamAddForcedExcludeMatch comment for why this bypasses
excludeFilters entirely. 'mega'/'gmax' are the tags every Mega
Evolution/Gigantamax entry itself carries (e.g. "Mega
Charizard X", "G-Max Pikachu") -- distinct from 'canmega'/
'cangmax', which live on the base species instead (plain
Charizard/Pikachu) and are left alone, since those are exactly
the ones that SHOULD still show up.

## `// roster has forced the Starter button on -- lets`

True only while an add-mode session that began with an empty
roster has forced the Starter button on -- lets
exitTeamAddMode() know whether it's responsible for undoing
that (see its own comment), so a session that started with the
roster already non-empty (and so never touched the Starter
button at all) doesn't accidentally clear a Starter selection
the player made themselves some other way.

## `// overlay (see the click listener further down) -- that overlay`

Entered only from the "Yes" button on #game-team-add-prompt-
overlay (see the click listener further down) -- that overlay
itself is nested inside #game-panel, so this always runs with
the panel about to close right underneath it. Left to the
caller to actually call closeGamePanel(); this just flips the
mode on and lets every other affected piece of UI (cursor,
banner, the hit-zone listener, refreshBackButtonState()) react
to that flag rather than needing to be told individually.

Also applies this session's guardrails (see the chat these
were added in): the roster being empty right now -- i.e. this
would be the very first team member -- forces the Starter
filter on and locks it, since a first Pokémon has to be a
starter; Mega Evolutions, Gigantamaxes, and Pokéstar Studios
tokens are force-excluded for every add-mode session
regardless of roster size (see TEAM_ADD_FORCED_EXCLUDE_TAGS
above, applied in filterGallery() itself rather than here).
Both kinds of lock are visual too (.game-team-corner-locked, see its
own CSS comment) so the relevant button(s) can't be tapped
back off for as long as this mode stays active.

## `// already full (see its own comment) -- holds the new member that`

Set only by confirmTeamAddSelection() when it finds the roster
already full (see its own comment) -- holds the new member that
still needs a home. null the rest of the time. Unlike
teamAddModeActive, this has no body class/cursor/banner of its
own to drive out on the gallery -- everything it affects
(.game-team-grid's data-replacing, #game-team-add-btn/
#game-team-replace-banner) lives on the Team Tracker screen
itself and is handled by renderTeamGrid() reading this flag
directly, since the game panel's already open and on that
screen by the time this is ever set.

## `// came from, if it came from one at all -- set only by`

Which Permanent card (by instanceId) teamReplacePendingMember
came from, if it came from one at all -- set only by
addPermanentPokemonToTeam() by way of beginTeamReplaceMode()'s
own second param; a plain gallery add (confirmTeamAddSelection())
never sets this, since there's no card involved for that path.
Whatever ends up happening to the pending member -- placed via
a slot tap, backed out of via Cancel, or silently discarded by
navigating away (see setGameScreen()) -- this card gets
Discarded (see requestPermanentDiscard()) right alongside it,
same "the Pokémon's been extracted from this card, so the
card's done regardless of where the Pokémon ends up" reasoning
in every one of those three places.

## `// confirmTeamAddSelection() (gallery pick, no sourceInstanceId)`

Called once there's nowhere to put a new member -- either
confirmTeamAddSelection() (gallery pick, no sourceInstanceId)
or addPermanentPokemonToTeam() (a Permanent card's own
pokemonPick, sourceInstanceId is that card's instanceId) via
their shared addOrQueueTeamMember() -- just stashes it and
re-renders; the actual replacement happens in the
#game-scroll delegated listener's own .game-team-slot branch,
once the player taps which of the six to overwrite.

## `// replace confirmation below -- mirrors renderTeamDetailHeader()/`

Builds one column's worth of read-only summary markup for the
replace confirmation below -- mirrors renderTeamDetailHeader()/
renderTeamDetailLevelSection()/renderTeamDetailHpSection()/
renderTeamDetailStatusSection()/renderTeamDetailCardsSection()
as closely as a static readout reasonably can: same
formOverride/shiny art resolution (so an evolved/Mega/
Gigantamax member shows THAT form, not the species it started
as), same Total Level (base + counter) alongside the raw
counter, same Fainted/standard-has-no-counter HP handling as
computeTeamHpState(), same "No Status"/"No ___ Card equipped."
fallbacks rather than hiding a section just because it's
empty -- every category always renders something, the same
way the real detail view's own sections do, so this actually
reads as a full readout rather than a sparse list of whatever
happened to be set. null (an empty slot -- only ever the
"Current" column, since there's always a "New" member by the
time this can open) gets its own short placeholder instead.
Evolution state itself isn't included -- nothing about a
replacement changes it, and formOverride's already folded into
the art/name above.
Read-only replica of a single Attach/Nature Card slot -- same
markup renderTeamCardSlotPanel() uses for a filled slot,
minus the Remove Card button (nothing here is editable). Card
art if the card has any, its own name as plain text if not
(see .game-team-cards-detail-empty's existing dual purpose
there), or the emptyText fallback if the slot has nothing
equipped at all.

## `// replace confirmation below -- per the chat this was rebuilt`

Builds one column's worth of read-only summary markup for the
replace confirmation below -- per the chat this was rebuilt
in, this reuses the REAL detail panel's own graphical
components wholesale (.game-team-detail-img,
.game-team-detail-level-total/-counter pills,
.game-team-detail-hp-top's icon+counter,
.game-team-detail-status-top's icon+counter via
statusImageMarkup(), .game-team-cards-photo card art) rather
than a condensed list of plain-text lines -- same classes
renderTeamDetailHeader()/renderTeamDetailLevelSection()/
renderTeamDetailHpSection()/renderTeamDetailStatusSection()/
renderTeamDetailCardsSection() populate for the real,
interactive panel, just written out directly as a static
string here instead of targeted element-by-element, and with
every button/tap-target left out entirely (Add/Remove Card,
Evolve, the Status picker strip, HP's +/- halves) since
nothing on this screen is meant to be editable. Evolution
itself isn't reproduced as its own section -- nothing about a
replacement changes it, and formOverride is already folded
into the art/name below the same way the real header handles
it. null (an empty slot -- only ever the "Current" column,
since there's always a "New" member by the time this can
open) gets its own short placeholder instead.

## `// discard pile" bookkeeping as confirmTeamReleaseStage()'s`

Same "the card comes off the Pokémon and lands on the
discard pile" bookkeeping as confirmTeamReleaseStage()'s
own comment -- the member sitting in this slot right now
is about to be overwritten wholesale by
teamReplacePendingMember below, so its own equipped cards
(if any) need to be peeled off onto their decks' discard
piles first, or they'd simply vanish along with the old
member object.

## `// above -- true while #game-team-release-banner is up and every`

Release mode's own equivalent of teamReplacePendingMember
above -- true while #game-team-release-banner is up and every
filled slot tap opens the two-stage confirm (see
openTeamReleaseConfirmOverlay()) instead of its usual
behavior. Mutually exclusive with a pending replacement by
construction (beginTeamReleaseMode() below refuses to start
while one's pending, and nothing that starts a replacement can
fire while this is true either, since every entry point into
that flow requires the Team Tracker's own controls, all of
which are hidden -- see renderTeamGrid() -- while release mode
is active).

## `// above -- true while #game-team-send-to-battle-banner is up`

Send-to-Battle mode's own equivalent of teamReleaseModeActive
above -- true while #game-team-send-to-battle-banner is up
and every filled slot tap opens
#game-battle-slot-choice-overlay for that member (see
openBattleSlotChoiceOverlay()) instead of its usual behavior.
No two-stage confirm needed here, unlike release -- this
never removes anything from the roster, it only changes what
Battle Arena is showing.

## `// it was entered from that half's own Choose Pokémon button`

Which Battle Arena half send-to-battle mode is aimed at, when
it was entered from that half's own Choose Pokémon button
(see requestBattleChoosePokemon()) rather than from Team
Tracker's Send Pokémon to Battle Arena button. 'attacker' or
'defender' means the half is already decided, so tapping a
Pokémon sends it straight there instead of opening the
Attacker/Defender chooser; null (the Team Tracker button's
case) keeps the chooser. Cleared by every path that ends the
mode.

## `// mode was entered automatically because this player's own`

Set (alongside teamSendToBattleTargetSlot) when send-to-battle
mode was entered automatically because this player's own
Pok\u00e9mon was Fainted when Next Round was pressed -- see
promptFaintedBattleReplacement(). Only changes the banner's
wording and refuses a Fainted pick; cleared by every path that
ends the mode, same as teamSendToBattleTargetSlot.

## `// asking about -- set the moment a slot tap opens it, read (and`

Which roster index the slot-choice overlay above is currently
asking about -- set the moment a slot tap opens it, read (and
cleared) the moment Attacker or Defender is actually chosen.
Only meaningful while #game-battle-slot-choice-overlay is
visible, same "only meaningful while its own overlay is up"
convention as pendingTeamReleaseIndex below.

## `// teamReleaseModeActive above -- true for the entire negotiation`

Trade a Pok\u00e9mon's own equivalent of teamReplacePendingMember/
teamReleaseModeActive above -- true for the entire negotiation
window from acceptance through execute/cancel, not just the
"still picking" moment (see isTradeSelectingOffer() just below
for that narrower one). Deliberately broad: blocks every other
mutating control on this screen (HP/status/evolve/attach/
detail-open -- see each of their own guard clauses) for the
whole window a selection could be sitting
offered-but-not-yet-executed, specifically so the Pok\u00e9mon
actually removed at execute time
(see executeTradeIfReady()) can't drift from the snapshot
already sent to the partner via the earlier trade-select
message -- e.g. equipping a different card or changing HP
after picking but before confirming would otherwise let this
device's own roster and the partner's incoming copy disagree
on what was actually offered.

Deliberately a derived check rather than its own separately-
tracked flag, same reasoning as isTradeSelectingOffer() below.

## `// accepted, but this device hasn't picked what to offer yet.`

The narrower moment within isTradeNegotiationActive() above --
accepted, but this device hasn't picked what to offer yet.
This is specifically what gates
#game-team-trade-select-banner's own visibility, routes a slot
tap to selectTradeOffer() rather than the usual detail view
(see the #game-scroll delegated listener's own
.game-team-slot-hit-zone branch), and keeps
#game-team-trade-overlay itself closed (see
renderTradeOverlay()) -- once mySelection is set this becomes
false, the banner/grid-tap-routing hand back off to
isTradeNegotiationActive()'s broader "just block everything"
behavior, and the overlay reopens showing the Confirm step.

## `// delegated listener) -- just flips the mode flag and re-renders,`

Entered from #game-team-release-btn (see the #game-scroll
delegated listener) -- just flips the mode flag and re-renders,
same shape as beginTeamReplaceMode() above, except there's no
stashed member to carry into it since release mode's target is
chosen by tapping a slot afterward, not decided up front.
Refuses to start over an in-progress replacement instead of
silently clobbering it -- shouldn't be reachable anyway since
#game-team-release-btn is hidden whenever a replacement is
pending (see renderTeamGrid()), but costs nothing to guard.

## `// #game-team-release-cancel-btn directly, and by`

The one authoritative way out of release mode -- called by
#game-team-release-cancel-btn directly, and by
confirmTeamReleaseStage() once a release actually goes through
(see its own comment). Also closes the confirm overlay and
clears its own pending state, in case this fires while stage 1
or 2 is still up (e.g. the player backs out via the banner's
Cancel without ever answering the confirm) -- same "one place
unwinds everything, every exit path goes through it" shape as
exitTeamAddMode().

## `// #game-scroll delegated listener) -- same shape as`

Entered from #game-team-send-to-battle-btn (see the
#game-scroll delegated listener) -- same shape as
beginTeamReleaseMode() just above, except there's no
two-stage confirm waiting at the other end: tapping a slot
while this is active opens openBattleSlotChoiceOverlay()
below instead. Guarded against the other three modes for the
same mutual-exclusivity reasons as beginTeamReleaseMode()
(renderTeamGrid() already hides this button whenever one of
them is active, but costs nothing to check here too).

## `// opening the arena's own roster picker, this hops to Team`

Battle Arena's Choose Pokémon buttons route here. Instead of
opening the arena's own roster picker, this hops to Team
Tracker with send-to-battle mode already switched on and aimed
at the half that was tapped. An empty roster gets a notice on
the arena instead. Same-team refusals are checked up front
(the old picker's refusal notices are reused), and a read-only
save (which send-to-battle mode refuses) still uses the old
picker.

## `// Trainer's Pok\u00e9mon is Fainted with nobody left in its queue,`

True when the battle can't go on to another round: the NPC
Trainer's Pok\u00e9mon is Fainted with nobody left in its queue,
or the Wild Pok\u00e9mon is Fainted (both shared, so every device
agrees), or one of THIS
device's own Fainted Pok\u00e9mon has no replacement on this
device's team. Only End Battle is offered then -- see
renderBattleControls(). Another player's Pok\u00e9mon is judged
by that player's own device, since only it knows its roster.

## `// in the Arena: hop to Team Tracker in send-to-battle mode aimed`

Next Round pressed while this player's own Pok\u00e9mon is Fainted
in the Arena: hop to Team Tracker in send-to-battle mode aimed
at that half (same flow as the half's Choose Pok\u00e9mon button),
so the player picks a replacement and lands back on the Arena
(sendTeamMemberToBattleSlot() / Cancel both end on 'battle').
Called by nextBattleRound() solo and by applyIncomingArenaState()
when the shared round advances, so every device checks only its
own Pok\u00e9mon -- Fainted is read from this device's own roster.
Does nothing for the Wild/Trainer halves (their index isn't a
number) or another player's Pok\u00e9mon (index is null here).

## `// tapping a slot and following through on the resulting slot`

The one authoritative way out of this mode short of actually
tapping a slot and following through on the resulting slot
choice -- called by #game-team-send-to-battle-cancel-btn
directly, and by setGameScreen() when navigating away from
Team Tracker any other way (same "only makes sense while
looking at this screen" reasoning as teamReleaseModeActive
there). Also closes the slot-choice overlay in case this
fires while it's still up (e.g. the player backs all the way
out via the banner's Cancel, or navigates away, without ever
answering Attacker/Defender/Cancel on it) -- same "one place
unwinds everything" shape as exitTeamReleaseMode().

## `// slot -- called only from the #game-scroll delegated`

Opens the Attacker/Defender/Cancel chooser for one roster
slot -- called only from the #game-scroll delegated
listener's hit-zone branch, only while
teamSendToBattleModeActive and only for a filled slot (an
empty one has nothing to send). Send-to-Battle mode itself
(the banner, the "tap a Pokémon" state) stays active
underneath this whole time, same "banner stays up behind the
overlay" shape as openTeamReleaseConfirmOverlay() -- only
Cancel on the overlay, Cancel on the banner, or an actual
completed send (see sendTeamMemberToBattleSlot()) ends it.

## `// from the currently active team in both halves at once (the`

Disables whichever of the two buttons would put two Pokémon
from the currently active team in both halves at once (the
Pokémon this whole overlay is about is always coming from
that active team -- this is Team Tracker's own send flow, and
Team Tracker only ever shows the active save's roster), and
fills in a short explanation of whichever one that is. Reuses
isBattleAttackerBlockedByActiveTeam()/
isBattleDefenderBlockedByActiveTeam() -- the exact same
checks Battle Arena's own two pickers refuse to open over, so
this overlay and those two pickers can never disagree about
which pairings are actually allowed. Re-run every time this
overlay opens (see openBattleSlotChoiceOverlay() above) rather
than once, since which button (if either) is blocked depends
on live state that could have changed since the last time it
was up.

## `// it and clears its own pending index, dropping back to`

Cancel on the slot-choice overlay routes here -- just hides
it and clears its own pending index, dropping back to
send-to-battle-picking mode (the banner never stops being
visible underneath this overlay, so there's nothing further
to restore). Also called defensively by
exitTeamSendToBattleMode() -- see its own comment.

## `// Goes through setBattleAttackerIndex()/setBattleDefenderIndex()`

Attacker or Defender on the slot-choice overlay routes here.
Goes through setBattleAttackerIndex()/setBattleDefenderIndex()
rather than writing the two battle*MemberIndex variables
directly, same "exactly one place enforces the no-duplicate
rule" reasoning as selectBattleAttacker()/selectBattleDefender()
on the Battle Arena screen itself -- sending a Pokémon here
that's already sitting in the *other* half moves it rather
than duplicating it. Re-checks the same-team eligibility
itself before doing anything, even though
renderBattleSlotChoiceOverlay() already disabled the button
for this -- a disabled button shouldn't dispatch a click at
all, but costs nothing to be sure rather than trust that
alone. setGameScreen('battle') itself is what clears
teamSendToBattleModeActive and re-renders the team grid (see
its own "screenId !== 'team'" block, same handling it already
gives teamReleaseModeActive) and repaints both Battle Arena
slots, so there's nothing left to unwind here beyond closing
this overlay first.

## `// only from the #game-scroll delegated listener's hit-zone`

Opens stage 1 of the release confirm for one slot -- called
only from the #game-scroll delegated listener's hit-zone
branch, only while teamReleaseModeActive and only for a filled
slot (an empty one has nothing to release). Release mode
itself (the banner, the "tap a Pokémon" state) stays active
underneath this whole time; only Cancel on the banner or an
actual completed release (see confirmTeamReleaseStage()) ends
it.

## `// stage 2 (swaps the title to the "no way to undo this" text and`

Yes on either stage routes here. Stage 1 -> just advances to
stage 2 (swaps the title to the "no way to undo this" text and
waits for another Yes) without touching the roster at all --
the whole point of the two-stage design is that stage 1's Yes
alone never releases anything. Stage 2 -> actually removes the
member: a plain splice() at that index, which -- since
data.team.members is an ordinary array and renderTeamGrid()
just reads members[i] for each of the 6 display slots straight
off it -- automatically shifts every later member up to fill
the gap, exactly the backfill behavior asked for, with no
separate reindexing step needed. Exits release mode
afterward via exitTeamReleaseMode() rather than leaving it
active for another release, so a second release always starts
from a fresh, deliberate tap of "Release a Pokémon" again.

## `// along with it -- same "the card comes back off the`

A released member's own equipped cards don't disappear
along with it -- same "the card comes back off the
Pokémon and lands on the discard pile" bookkeeping as
every other path that unequips one (see
discardUnattachedCard()'s own comment). Gated the same
way those other call sites are: a save that never turned
on virtual decks has no discard pile to put it on.

## `// (see the fetch() that also builds the Pokédex gallery, further`

Full pokemon-data.json entries keyed by name -- populated once
(see the fetch() that also builds the Pokédex gallery, further
up) rather than fetched again here, since the same file already
covers everything the evolution feature needs per species:
tags (canevolve/canmega/cangmax), token_level, evolve_cost,
evolves_to, mega_forms, gmax_forms, base_form, form_type. A
member only ever stores its own name/dex/src/shinysrc/shiny/
status/level (see emptySaveScopedData()'s own comment) -- this
is what computeTeamEvolutionState() below looks that name up
against to figure out what the evolution corner should show.

## `// GYM_BADGES_URL/gymBadges above. URL guessed to follow the same`

Full card database, fetched from cards.json -- same pattern as
GYM_BADGES_URL/gymBadges above. URL guessed to follow the same
repo/root-level-file convention as pokemon-data.json/
gym-badges.json/music-tracks.json -- swap this if the real
file ends up hosted somewhere else. Keyed by id (the same
string a member's attachCardId/natureCardId field stores --
see the chat this was built in for that data model) rather
than kept as the raw array, so every lookup elsewhere in the
Team Tracker is an O(1) CARDS_BY_ID[id] rather than a .find()
over the whole list.

This is the full database (569 entries as of the chat this was
migrated in) -- Items, Events, and Natures across every
cardDeck (TM/Shop/Poké Ball/Tera Type/Type-Enhancer/Z-Crystal/
Reward Item/etc.), not just the subset the Team Tracker's own
Attach Card/Nature Card slots can use. canAttach: "yes"/"no" is
what actually gates those two slots (see
getAttachableCardsForSlot() below) -- cardType alone no longer
does, now that it's a genuine category ("Item"/"Event"/
"Nature") rather than the old attach-cards.json's own
"attach"/"nature" slot-name-as-cardType convention. Everything
with canAttach: "no" sits in this same database for whatever
future tool ends up using it, untouched by the Team Tracker.

## `// 'nature', same string used throughout the Cards`

Which of the two Team Tracker card slots (slot is 'attach' or
'nature', same string used throughout the Cards
overlay/details panel) a card belongs in -- see the chat this
was clarified in. The two are a clean split on canAttach
within each of two cardType baskets: 'nature' is every
cardType === 'Nature' card with canAttach: "yes" (the 6
Nature cards with canAttach: "no" are reserved for a future
tool, not shown here at all); 'attach' is every OTHER
canAttach: "yes" card regardless of cardType (Item or Event --
Item's own many cardDecks are all subcategories for that same
future tool, not filtered out here individually).

A third pseudo-slot, 'overlay' (see the chat this was added
in), is unrelated to canAttach entirely -- it's every card
with its own canOverlay: "yes" field, regardless of cardType/
canAttach (every Overlay-eligible card so far also has
canAttach: "no", but this doesn't assume that always holds).
Used by the Team Tracker's Overlay Card picker
(renderTeamDetailOverlaySection()) the same way 'attach'/
'nature' are used by the Attach/Nature one.

## `// buildWildPokemonMember() makes, so everything downstream (HP,`

Builds an Arena member from a gym leader card side -- the same shape
buildWildPokemonMember() makes, so everything downstream (HP,
Status, fainting, lobby sharing) keeps working, except:
- src is the CARD art (no gallery token, no shiny).
- level is the PRINTED total, not a bonus on a species base --
see getTeamMemberBaseLevel(), which returns 0 for these so
alt2's max HP is just this level.
- gymLeaderId/gymLeaderSide mark it as a gym leader card:
static data (types, moves) is read back from GYM_LEADERS_BY_ID
rather than copied here, and it never carries attach/nature/
overlay cards (those fields stay null).

## `// side 2 queued behind it (Next Round sends it out once side 1 has`

Puts a gym leader card in the Arena with side 1 out first and
side 2 queued behind it (Next Round sends it out once side 1 has
fainted). Rivals take the Attacker half through the existing NPC
Trainer line-up; everyone else takes the Defender half, with the
line-up carried on the member as gymLeaderQueue. Interim entry
point (callable from the console while the picker is built):
sendGymLeaderCardToArena('kanto-brock')

## `// go in the Arena once the game has reached the End Game stage -- the`

Elite Four and Champion cards are end-game content, so they can only
go in the Arena once the game has reached the End Game stage -- the
Game Stage setting in the music panel (shared with every guest in a
lobby). "Any Stage" is the unfiltered default and counts as
allowed; Early/Mid/Late block them.

## `// a browser's one-step downscale of that much (especially at`

The card art is far larger than the 100x140 it's shown at, and
a browser's one-step downscale of that much (especially at
1x) comes out jagged. So each image is pre-shrunk once here
in halving steps with high-quality smoothing, to twice (at
least) its display size, and the result is cached for the
session. If the image host won't allow reading pixels (CORS)
or anything else fails, the original image is used as before.

## `//`

---- Trainer Cards ----

Each player picks one Trainer Card from trainer-cards.json
(same repo root as gym-leaders.json). A record is
{ "id": "...", "name": "...", "imageUrl": "https://..." }
and the picker lists them in file order.

The choice is save-scoped like badges/team/hand: it lives on
getActiveSaveData().trainerCardId (this device's own save,
host or guest) and persists with it.

"No two players can hold the same card" is enforced by the lobby
Host, the same way player colors are (see getLobbyTakenColors()):
- The Host's save keeps save.trainerCardClaims, one entry per
OTHER player keyed by guestClientId (durable across a
reconnect, like guestHands); its own card is just
save.trainerCardId, and only counts while it's actually
playing (lobbyState.hostIsPlayer).
- A guest never writes its own pick straight to its save: it
sends 'trainer-card-claim', and the Host answers with
'trainer-card-result'. Messages arrive one at a time, so
when two players tap the same card together, the first one
the Host processes wins and the other is told it's taken.
- The Host broadcasts 'trainer-card-claims' ({ cardId: { name }
}) whenever anything changes, so every picker can dim the
cards that are taken and say who has them.
- On (re)join the guest reports its saved card in 'identify'
and the Host answers with 'trainer-card-sync' (see
reconcileTrainerCardOnIdentify()) -- the Host's record wins,
and a saved card someone else has since taken is cleared.
- A dropped player keeps their card; a kicked one gives it back.
Solo play has one player and so nothing to conflict with.

The whole tool is a per-save option ("Use Trainer Cards?", see
isTrainerCardsEnabledForActiveSave()): off, its menu tile is
dimmed like Hand & Decks without virtual decks, and nothing
below does anything.

Lock In (save-scoped trainerCardLocked) ends the Change Card
option for good; see lockTrainerCard().

Setup: when Begin Game Setup runs on a save that uses them,
anyone who hasn't locked in a card is held on this screen:
first a forced pick (no Cancel), then -- once a card is chosen
-- a chance to change their mind, until they Lock In. Locking
in is what continues into the forced Starter prompt. See
beginForcedTrainerCardPick() and its callers in
beginGameSetup()/the 'start-game' handler.

## `// screen by Begin Game Setup (see beginForcedTrainerCardPick()):`

True while this device is being held on the Trainer Card
screen by Begin Game Setup (see beginForcedTrainerCardPick()):
from the start until it locks a card in. Re-derived every time
instead of trusted: the moment being held stops being possible
or needed -- session over, tool turned off, locked in, or no
way left to get past (the list failed to load, or every card
is taken and none is held) -- it clears itself, so nobody is
ever trapped.

## `// with no Cancel and nothing to do but choose. Once one is chosen`

The first half of that hold: no card yet, so the picker is up
with no Cancel and nothing to do but choose. Once one is chosen
the picker closes and the player is free to change it (Change
Card, which can be cancelled) or lock it in.

## `// there until it locks a card in (picker open first, if it has`

Takes this device to the Trainer Card screen and holds it
there until it locks a card in (picker open first, if it has
none). Returns false (doing nothing) when there's nothing to
hold for, so the caller can carry on with the Starter prompt as
if cards weren't involved.

## `// without a card. Waits out a list that's still loading (the fetch's`

Opens the picker by itself the first time the screen is entered
without a card. Waits out a list that's still loading (the fetch's
own callback calls this again); gives up quietly if it never
loaded or is empty -- the screen's own message says so.

## `// guestClientId is known. The Host's own record of this player's`

Called from the 'identify' handler once the player's
guestClientId is known. The Host's own record of this player's
card wins (same as 'hand-sync'); only if it has none does it
consider the card the guest reports from its own save, which it
accepts when nobody else holds it. Either way the guest is told
where it stands, so a card taken while it was away is cleared on
its side too instead of lingering as a duplicate.

## `// With the virtual board on its Virtual Tokens (condensed) setting, the starter is chosen`

---- Starter picker (virtual-token games) ----
With the virtual board on its Virtual Tokens (condensed) setting, the starter is chosen from this picker instead of the gallery, so
two players can't hold the same one. It works like the Trainer Card picker: the Host's save keeps save.starterClaims
({ guestClientId: { name: species, owner } }) and the Host's own pick is its save's starterPick; a guest asks with
'starter-pick-claim', the Host answers 'starter-pick-result' and tells everyone with 'starter-pick-claims' ({ species: { name } }).
Each player's own save keeps starterPick (their species). Releasing the starter before locking it in frees the pick (see
starterReconcileClaim(), called from renderTeamGrid()). Solo has nobody to clash with, so it just picks.

## `// Begin Game Setup puts a virtual-token player straight into the starter picker (no "Add `

---- Holding the player on the Team Tracker during setup (like the Trainer Card step) ----
Begin Game Setup puts a virtual-token player straight into the starter picker (no "Add a Pok\u00e9mon?" prompt) and keeps them on the
Team Tracker until the starter is locked in and, if a starter Nature Card is owed, that card is placed. Re-derived every time, so it
lets go by itself whenever it stops applying (session over, game started, read-only, ...).

## `//`

---- Pre-game team rules, starter Lock In, starter Nature Card ----

Until the host presses Start Game, nobody can add, release,
trade or send Pok\u00e9mon to the Battle Arena -- the exceptions
being picking the starter itself (an empty roster) and, until
it's locked in, releasing it again to pick a different one (a
misclick). The player with a starter also gets a Lock In
button in place of Add; locking in is what
tells the host "starter chosen" (see reportLobbyStarterChosen())
and what the Start Game button waits for. "Started" is per
session, like the button itself (lobbyState/soloSession
.gameOfficiallyStarted); the host tells guests with
'game-started' and in 'welcome' for anyone joining late.

On a save with Nature Cards AND virtual decks, locking in the
starter also deals that player three cards off the top of the
Nature Deck to pick one from -- the pick attaches to the
starter, the other cards go to the bottom of the deck. Unlike
"Look at Top X Cards" (a peek that leaves the deck alone, so
everyone looking at once sees the same cards), this REMOVES the
cards from the deck on the host the moment they're dealt, so
each player is dealt a different three. The host keeps each
player's dealt cards in save.starterNatureDraws (keyed 'host' or
a guestClientId, like trainerCardClaims) until the pick is made,
so a dropped connection or a reload can't lose or duplicate
them; the player's own save carries starterNatureOwed ("I owe a
pick") so a rejoin re-asks and the host replays the same cards.

## `// guest says it still owes a pick. Replays whatever's on record`

Host: answers a guest's request/identify. owed is whether that
guest says it still owes a pick. Replays whatever's on record
for them (the same cards, or the accepted pick they never got
told about), deals fresh ones only if there's no record and
they do owe one, and says "nothing to deal" with an empty list
when the deck can't supply any so the guest stops waiting.

## `// CARDS_URL above and the same repo/root-level location. An`

Full move database, fetched from moves.json -- same pattern as
CARDS_URL above and the same repo/root-level location. An
object keyed by move name; each entry is
{ type: "grass", attack_strength: { mode, value },
effects: [...], stab?: "false", uniqueEffect?: ... }
MOVES_BY_NAME keeps those entries whole (attack_strength and
effects are for the Attack Calculator later); for now Battle
Arena only reads `type`, to color each move button like the
Pokédex overlay's type badge (see getBattleMoveType()).
MOVES_BY_KEY is a second index on a lowercased,
punctuation-stripped name, so a known_moves spelling that
differs slightly ("Thunder Punch" / "thunder-punch") still
finds its entry.

## `// the collapsible-category picker both card slots share (see`

Display order for cards.json's own cardDeck values -- used by
the collapsible-category picker both card slots share (see
renderTeamCardSlotPanel()'s own comment), so a category always
sorts the same way regardless of which slot it's being picked
for. A deck with zero matches in the pool being grouped is
simply skipped; anything unexpected (there shouldn't be one)
gets appended at the end so nothing silently disappears.

## `// in CARD_DECK_ORDER -- returns [{ deck, cards }, ...]. Nature`

Groups getAttachableCardsForSlot(slot)'s own list by cardDeck,
in CARD_DECK_ORDER -- returns [{ deck, cards }, ...]. Nature
only ever produces one group in practice (Nature Deck), but
grouping it the same way as Attach keeps the two slots'
pickers visually and behaviorally consistent (see the chat
this was requested in) rather than special-casing Nature back
to a flat list.

## `//`

==================== Hand & Decks tool ====================

Virtual replacement for the board game's own physical Event/
Item/etc. decks and each player's hand. Draw/discard pile
*order* is authoritative on exactly one device -- the Host,
or this device alone in solo play -- same "one source of
truth, everyone else mirrors it" shape as Playlist Sync uses
for now-playing state (see broadcastLobbyMusicState()). A
connected guest never computes a shuffle or a draw itself; it
only ever sends a request (deck-draw/deck-discard) and renders
whatever the Host sends back (deck-state/deck-drawn).

'Event Deck' and now 'Item Deck' -- see the chat this was
scoped in. Adding another deck later (Shop, TM, etc.) should
just be adding its cardDeck string here; everything below
already works generically off this list. Shop/Reward will
eventually need their own entries once their "buy, don't draw
randomly" rules exist -- not the same mechanic as this list's
decks.

This is the BASE list -- every consumer actually wants
getDeckToolList() below instead, which optionally splits 'TM
Deck' into three (see isTieredTMDecksEnabledForActiveSave()).
Reference this constant directly only when genuinely talking
about the un-split deck names themselves (e.g. TM_TIER_DECK_NAMES'
own 'TM Deck' check).

## `// "Advanced", or "Expert") to the deck name a TM card actually`

Maps cards.json's own tmTier field (a string: "Novice",
"Advanced", or "Expert") to the deck name a TM card actually
belongs to once isTieredTMDecksEnabledForActiveSave() is on --
see getEffectiveCardDeck() below, the one place this is read.
A TM card with no recognized tmTier value (missing field, or
a string other than one of these three) falls back to Novice
rather than being silently dropped from every deck -- see
that function's own fallback.
(The first tier used to be called Basic; a card still tagged "Basic" lands in the Novice deck too.)

## `// isTieredTMDecksEnabledForActiveSave() is on, where this`

A card's own cardDeck field, EXCEPT for TM Deck cards once
isTieredTMDecksEnabledForActiveSave() is on, where this
resolves to whichever of TM_TIER_DECK_NAMES its own tmTier
value maps to instead (Novice if that mapping comes up empty --
see TM_TIER_DECK_NAMES's own comment). Every place in this
tool that used to read card.cardDeck directly -- building a
deck's own drawPile, matching a drawn/discarded card back to
its deck, deciding which deck a hand card's Play/Discard
buttons act on, etc. -- reads through this instead, so the
split is entirely transparent to all of that code: with the
rule off, or for any non-TM card, this is identical to
card.cardDeck.

## `// DECK_TOOL_LIST_BASE unchanged, except 'TM Deck' itself is`

The deck list actually in play for the currently-active save --
DECK_TOOL_LIST_BASE unchanged, except 'TM Deck' itself is
swapped out for its three TM_TIER_DECK_NAMES entries (in
Novice/Advanced/Expert order, in TM Deck's own former slot in
the list) once isTieredTMDecksEnabledForActiveSave() is on.
Every consumer that used to read the DECK_TOOL_LIST constant
directly (deck store setup, deck-info counts, the Decks
screen's own row list) calls this instead, so the split shows
up everywhere consistently off one save-level rule rather than
needing its own check in each place.

## `// getHighestCollectedBadgeTier() above) before Advanced/Expert`

The Badge Tier a player needs to have achieved (see
getHighestCollectedBadgeTier() above) before Advanced/Expert
TM Deck opens up to THEM specifically -- per the chat this was
designed in. Novice TM Deck (and every other deck) has no entry
here at all, meaning always unlocked -- see
isTMDeckUnlockedForActiveSave()'s own fallback.

## `// player -- see getHighestCollectedBadgeTier()'s own comment on`

Whether the currently-active save (i.e. THIS device's own
player -- see getHighestCollectedBadgeTier()'s own comment on
why that's the right save to check) has unlocked deckName yet.
The TM deck(s) are shared across every player at the table the
same as any other deck (see getDeckToolList()/broadcastDeckState())
-- this never hides or removes a deck, it only ever gates
whether THIS viewer's own copy of the Decks screen lets them
draw/shuffle/look at Advanced or Expert specifically (see
buildDeckRowHtml()'s own locked-row branch, and the guard at
the top of requestDrawCard()/requestShuffleDeck()/
openDeckLookPrompt()). Deliberately a client-side-only check --
badges are never networked at all (see collectBadge()'s own
comment / GAME_PANEL_NOTES.md's Guest Saves notes), so there's
no way for the Host to independently re-verify a connected
guest's own Badge Tier the way it can re-check e.g. a Reward's
oneTime cap. This is an honor-system gate, same as a physical
board game trusting a player not to draw from a deck their
trainer card doesn't qualify for yet.

## `// other entry in getDeckToolList() goes in the collapsible "Extra`

The three decks shown directly on the Decks screen -- every
other entry in getDeckToolList() goes in the collapsible "Extra
Decks" section instead (see renderDecksScreen()'s own split,
extraDecksExpanded/toggleExtraDecksSection()). Shop Deck and
Reward Item Deck are both flagged for a bigger functional
rework later (see the chat this was noted in) but stay
grouped with the rest of the extras for now.

## `// instead of the plain text label -- see renderDecksScreen(),`

Decks whose Draw button shows the deck's own card-back art
instead of the plain text label -- see renderDecksScreen(),
which falls back to a normal text button for any deck not
listed here. Item's subset decks (Reward Item/Shop/Poké Ball/
Tera Type/TM/Type-Enhancer/Z-Crystal) are meant to get small
icons of their own eventually rather than a full card-back
image; add a second lookup (e.g. DECK_ICON_IMAGES) for those
when that art exists, following the same pattern as this one.

## `// Active Card zone (see setHostActiveCard()/renderActiveCardZone()`

Decks whose drawn card reveals immediately into the shared
Active Card zone (see setHostActiveCard()/renderActiveCardZone()
below) instead of going to the drawing player's own hand.
Event Deck's own cards resolve the instant they're drawn --
there's no "hold it and decide later" the way an Item card's
hand allows -- so hostApplyDraw() branches on this rather than
ever pushing an Event card into anyone's hand at all. Nature
Deck cards get the same treatment for the same reason (see
the chat this was added in) -- there's no real "hold a Nature
card for later" either, you draw one and it's immediately
either attached (to the Nature Card slot specifically -- see
getAttachSlotForCard()) or discarded/shuffled back. Anything
not listed here keeps the normal draw-to-hand behavior.

## `// drawPile once drawPile runs dry (see drawFromHostDeck()) --`

Which decks reshuffle their own discardPile back into
drawPile once drawPile runs dry (see drawFromHostDeck()) --
per the chat this was scoped in, only Event and Nature work
that way. The Item Deck and all of its subset "extra" decks
(see MAIN_DECK_NAMES/DECK_TOOL_LIST_BASE) are one-and-done: once
drawPile is empty that deck stays empty for the rest of the
game, it never reshuffles from discardPile even though Item
Deck itself still collects one (via discardToHostDeck()).

## `// instead -- opens a menu (see openRewardMenu()/`

Decks whose Draw button becomes a "Gain Reward" button
instead -- opens a menu (see openRewardMenu()/
renderRewardMenu()) listing every card in the deck
individually, alphabetically, so the player picks exactly
which one they're owed rather than drawing at random. These
decks also skip the Shuffle/Look at Top buttons entirely
(see buildDeckRowHtml()) -- there's no shuffled drawPile
left to act on, per the chat this was redesigned in.

A card tagged `"oneTime": "yes"` in cards.json can only ever
be picked once per player per game -- purely a per-player
cap (see getLocalOneTimeClaims()/getPeerOneTimeClaims()),
other players are entirely unaffected by it and there's no
shared supply limit on top of it. Everything else (any
`"oneTime": "no"` card, and every card in these decks once
Shop Deck joins this list) is unlimited -- qty in cards.json
no longer means anything for a deck listed here.

## `// instead -- opens a menu (see openShopMenu()/renderShopMenu())`

Decks whose Draw button becomes a "Shop for Items" button
instead -- opens a menu (see openShopMenu()/renderShopMenu())
listing every card in the deck individually, alphabetically,
same "no shuffled drawPile behind it any more" shape as
DECK_GAIN_REWARD_MENU just above. Unlike that menu though,
every card here shows its own always-visible Buy/Take panel
rather than opening a single Yes/Cancel confirm -- see the
chat this was designed in. Supply is unlimited the same way
DECK_GAIN_REWARD_MENU's cards are (qty in cards.json no
longer means anything for a deck listed in either lookup).

## `// always included, every game, every region -- while a card`

Cards with no `region` (cards.json) are the deck's base set --
always included, every game, every region -- while a card
with one belongs only to a save whose own .region matches
(Safari Ball's own region is an array, ['kanto','johto',
'sinnoh'], since it's valid in any of those three; everything
else so far is a single string). See buildFreshDrawPile()'s
own comment for why this is checked once, at build time,
rather than re-checked every render.

## `// per the chat this was requested in -- while still keeping`

Event Deck and Nature Deck discards skip "Return to Hand" --
per the chat this was requested in -- while still keeping
"Shuffle into Deck" available. Checked both in
renderDiscardViewer() (so the button never even renders for
these two piles) and again in hostApplyReturnDiscardToHand()
itself (so a stale client can't bypass the UI and ask
directly), same trust-but-verify shape as the keyItem/oneTime
checks above.

## `// is permanently stuck in the discard pile once it lands there`

A `"keyItem": "yes"` card (Master Ball, Dynamax Band, etc.)
is permanently stuck in the discard pile once it lands there
-- no Return to Hand, no Shuffle into Deck (see the chat
this was requested in). Checked both in renderDiscardViewer()
(so the buttons never even render for one) and again in
hostApplyReturnDiscardToHand()/hostApplyShuffleDiscardIntoDraw()
themselves (so a stale client can't bypass the UI and ask
directly), same trust-but-verify shape as the oneTime cap.

## `// copies of the same id -- a deck's drawPile/discardPile are`

Expands cards.json's own qty field into that many physical
copies of the same id -- a deck's drawPile/discardPile are
both just flat arrays of ids, duplicates and all, the same
way a real stack of cards would have duplicate faces mixed
through it. Cards with no qty (most of the database, outside
decks like this) default to 1 copy, matching cardIconFor()'s
own "missing qty means one of it" assumption elsewhere.

Restricted to the base set (region: none) plus whatever's
specific to the active save's own region (see
cardMatchesActiveRegion() above) -- a Kanto game never sees
Paldea's Terastal Phenomenon event, etc. Only ever called
from ensureDeckBuilt() via ensureHostDeckStore(), which is
itself only ever non-null on the Host/solo side, so
getActiveRegionForBadges() here is always reading THIS
device's own active save -- exactly the save this deck
belongs to, never a connected guest's.

## `// authoritative for this device right now. Returns null on a`

The one place that decides whose save's `decks` field is
authoritative for this device right now. Returns null on a
connected guest (it has no authoritative copy -- see
guestDeckStateCache instead) or if there's genuinely no save
to hold it yet (no slot loaded, e.g. mid-creation-form).
Falls back to an in-memory-only object for the same
"unsaved session" case getActiveSaveData() itself covers, so
the tool still works before the player has saved anything --
just without persistence, exactly like unsavedSessionData.

## `// in) ----`

---- Shared Active Card zone (see the chat this was designed
in) ----

{cardId, deckName, actorKey, committed, instanceId} or null.
actorKey is 'host' or a conn.peer id, same identity space as
everywhere else in this tool -- whoever drew (Event) or Played/
Attached (Item) this exact card. committed:true means it's
already fully resolved (an Attach that went all the way through
-- see hostApplyRemoveFromHandOnly()) so nobody, including the
actor, gets an action button for it, just Dismiss; committed:
false means it's still awaiting the actor's own Discard/
Permanent/Shuffle/Attach choice (see renderActiveCardZone()).
instanceId is a fresh random string every time this is set,
purely so each viewer's own local activeCardDismissedInstanceIds
(see dismissActiveCard()) can tell "a new card took over" apart
from "the exact same card got re-broadcast" without needing any
server-side per-viewer bookkeeping.

Same "fall back to an in-memory-only value before there's a
real save to hold it" shape as unsavedDeckState above.

The zone holds one entry PER ACTOR (an array, oldest first), not
one card for the whole lobby: a second player's card no longer
bumps the first player's still-unresolved one. A new card from
an actor who already has one pending still replaces (and
discards) THAT actor's own previous card, same as before, so the
list never holds more than one entry per player. Each device
then decides locally what to show -- see getActiveCardInfo().
(A save from before this change has a single `activeCard`; it
is migrated into the array the first time it is read.)

## `// palette, different purpose: this one identifies a *person*`

Player colors -- distinct from NOTE_COLORS above (different
palette, different purpose: this one identifies a *person*
across the whole Multiplayer Lobby/Hands & Decks UI, not a
single card). See choosePlayerColorPick()/PLAYER_COLOR_HEX and
the .game-player-color-* CSS module. Uniqueness (no two
players sharing a color) is enforced host-side -- see
getLobbyTakenColors() and wireHostConnection()'s own
'identify' handling.

## `// lobby -- the host's own (if it's playing too, see`

Host side only: every color currently spoken for in this
lobby -- the host's own (if it's playing too, see
lobbyState.hostIsPlayer) plus every connected guest's. Used
both to grey out already-taken swatches before anyone picks
(sent along with 'welcome', see buildLobbyWelcomePayload()) and
to reject an 'identify' that asks for one that's since been
grabbed by someone else (see wireHostConnection()'s own
'identify' handling). excludePeerId leaves one connection's
own current color out of its count against itself -- relevant
when re-validating that exact connection's own request, not
when reporting taken colors out to everyone else.

## `// actually the same physical guest as guestClientId, just under`

Host side only: every OTHER already-connected peer that's
actually the same physical guest as guestClientId, just under
a different conn.peer -- normally at most one (an ordinary
fast reconnect superseding its own immediately-prior
connection), but returned as a list rather than a single match
so evictStaleLobbyConnectionsByGuestClientId() below can clear
every one at once if more than one somehow accumulated (e.g.
a reconnect attempt that itself got interrupted before its own
predecessor was evicted). excludePeerId leaves the connection
currently identifying out of its own search, same reasoning as
getLobbyTakenColors()'s own excludePeerId.

## `// one currently identifying (excludePeerId) -- see`

Evicts every stale connection sharing guestClientId with the
one currently identifying (excludePeerId) -- see
findLobbyConnectionsByGuestClientId() just above for why this
is a list rather than a single lookup. Reuses
handleHostConnectionDrop() for the exact same cleanup a real
drop already gets, once per stale entry found.

## `// specific Pokémon picked from the gallery before it can be`

A `"choosePokemon": "fossil"` card (cards.json) needs a
specific Pokémon picked from the gallery before it can be
made Permanent -- the value is a gallery filter tag (see
#unique-properties-section in the HTML), applied
automatically the same way beginTeamAddMode() auto-applies
Starter, so the person only sees Pokémon that actually match.
Deliberately generic -- any future card can set this to any
other tag in that section, not just "fossil" -- see the chat
this was designed in.

## `// card into the zone. If this actor's PREVIOUS card was still pending`

The one place anything (a draw, a Play, an Attach) puts a new
card into the zone. If this actor's PREVIOUS card was still pending
(nobody had Discarded/made it Permanent/Shuffled it back in
yet) it defaults to Discard rather than just vanishing
untracked -- see the chat this was designed in.

## `// for it -- covers both a genuinely new save and CARDS_BY_ID`

Lazily builds a deck's drawPile the first time anything asks
for it -- covers both a genuinely new save and CARDS_BY_ID
resolving late (see the CARDS_URL fetch above); calling this
again once a deck already exists is a no-op, it never
reshuffles or resets an in-progress deck.

deck.built is the actual "has this deck already been dealt
out" marker. Used to key off "both piles are empty" instead
(drawPile.length === 0 && discardPile.length === 0), but that
now legitimately happens mid-game for a one-and-done deck
(see DECK_RESHUFFLES_ON_EMPTY) once it's fully drawn into
hands without anything having been discarded yet -- the old
check mistook that drained-but-valid state for "never built",
and dealt the whole deck out again on the very next draw. See
the chat this was fixed in. A deck from before this flag
existed has no `built` field yet; back-fill it as true the
first time we see it, since it already exists here at all
means the old logic already built it once.

## `// store, reshuffling discardPile back into drawPile first if`

Draws exactly one card off the Host's own authoritative
store, reshuffling discardPile back into drawPile first if
drawPile has run out -- the standard "reshuffle when empty"
rule most of this game's own decks use. Returns the drawn
card id, or null if there's genuinely nothing left anywhere
(every copy of every card in this deck is already in some
hand or CARDS_BY_ID hasn't loaded yet).
Draws exactly one card off the Host's own authoritative
store, reshuffling discardPile back into drawPile first if
drawPile has run out AND this deck is one of the ones that
reshuffles at all (see DECK_RESHUFFLES_ON_EMPTY -- Item Deck
and its subset decks are one-and-done and skip this entirely,
per the chat this was scoped in). Returns the drawn card id,
or null if there's genuinely nothing left to draw (drawPile's
empty and either this deck doesn't reshuffle, its discardPile
is also empty, or CARDS_BY_ID hasn't loaded yet).

## `// straight to the top of a deck's discardPile -- this app has`

Moves a card id from wherever it currently sits in hand
straight to the top of a deck's discardPile -- this app has
no "wrong card" validation here on purpose, same trust-the-
request stance the trade system already takes with whatever
a connected guest sends.

deckName is the card's ORIGINATING deck (drawPile still
lives there), but every extra deck (see MAIN_DECK_NAMES) is
just a subset of the Item Deck -- per the chat this was
requested in, none of them keep their own discardPile any
more, they all fold into the Item Deck's shared one instead.
Combined with DECK_RESHUFFLES_ON_EMPTY excluding Item Deck
too, the practical effect is that Item Deck and everything
under it are strictly one-and-done: nothing ever reshuffles
back into any of their drawPiles once empty, same as a real
single-pass deck.

## `//`

---- Per-player hand storage ----

This device's OWN hand always lives on getActiveSaveData()
(persisted locally, same as team/badges) regardless of role.
Every OTHER connected player's hand lives on the HOST's own
save too -- save.guestHands, keyed by that player's
persistent guestClientId (see getOrCreateGuestClientId()),
NOT by conn.peer (which PeerJS mints fresh every connection
and can't survive a reconnect). This is what lets a dropped
player's hand -- and the Host's own hand and every deck's
draw/discard piles -- all still be exactly where they were
if that player rejoins later, or if the Host's own device
reloads mid-session.

## `// designed in) ----`

---- Permanent Cards panel storage (see the chat this was
designed in) ----

Exact same shape/reasoning as the hand storage just above --
this device's OWN permanent cards live on getActiveSaveData()
(persisted locally regardless of role, and kept in sync via
'permanent-sync'/'permanent-added' below), every OTHER
connected player's live on the HOST's own save instead, keyed
by that player's persistent guestClientId.

Each entry is {instanceId, cardId, counter} -- instanceId is
this one physical card's own identity (see
generatePermanentInstanceId()), separate from cardId, because
nothing stops the same card showing up in the same player's
panel more than once, and each copy needs its own counter
(see the chat this was added in) rather than sharing one.
Older saves only ever stored a bare cardId string here (from
before counters/Discard existed) -- normalizePermanentEntry()/
normalizePermanentArrayInPlace() below heal those in place the
next time this array's read, defaulting counter to 0 since
there's no way to recover what a pre-existing card's starting
count "should" have been.

## `// Same "field presence, not a separate yes/no flag" convention`

---- Overlay Cards (see the chat this was designed in) ----
Same "field presence, not a separate yes/no flag" convention
as getDefaultPermanentCounter()/cardHasPermanentCounter()
above -- a card's own starting Overlay counter value (cards.json's
overlayCounters field), or whether it has one at all. Most
Overlay-eligible cards (canOverlay: "yes") won't have one --
of the three that exist as of the chat this was designed in,
only two (Dream World, Gold Mine) do.

## `// in) ---- Same "field presence, not a separate yes/no flag"`

---- Attach Card item counters (see the chat this was designed
in) ---- Same "field presence, not a separate yes/no flag"
convention as getDefaultPermanentCounter()/cardHasPermanentCounter()
and getDefaultOverlayCounter()/cardHasOverlayCounter() above --
a card's own starting counter value (cards.json's itemCounters
field), or whether it has one at all. Only ever relevant to
the Attach Card slot (a small handful of canAttach: "yes" item
cards) -- Nature Cards never carry this field, and
member.attachCounter is meaningless while member.attachCardId
is empty.

## `// cards.json's canAttachFromPermanent: "yes" marks a card that,`

---- Attach-from-Permanent ----
cards.json's canAttachFromPermanent: "yes" marks a card that,
once it's sitting in the Permanent Cards panel, can be moved
onto a Pokémon's Attach Card slot from there (see the Attach
button in #game-permanent-card-viewer-overlay and
requestAttachFromPermanent()). Deliberately independent of
canAttach (which only governs attaching straight from a hand
or the Active Card zone, and the Team Tracker's manual
picker) and of canPermanent (which governs getting INTO
Permanent in the first place) -- same "yes"/"no" string
convention as both.

## `// "yes" marks a card that, from the Permanent Cards panel, gets`

The Wild fork of the same idea: canAttachWildFromPermanent:
"yes" marks a card that, from the Permanent Cards panel, gets
attached to a WILD Pok\u00e9mon instead of a team member -- the
player picks a Pok\u00e9mon off the gallery and it goes straight
into the Battle Arena's Defender slot as a Wild Pok\u00e9mon
carrying this card (see requestAttachWildFromPermanent()).
Independent of canAttachFromPermanent above: a card can carry
either, both (two buttons), or neither.

## `// Nature...). A Pok\u00e9mon picked from the gallery to carry this`

forceShiny: "yes" -- works on any attachable card (Event, Item,
Nature...). A Pok\u00e9mon picked from the gallery to carry this
card as a Wild Pok\u00e9mon is Shiny whenever it has a shiny form
(see openGalleryBattleWildConfirm()/confirmBattleWildSelection()),
and a Pok\u00e9mon already in a slot switches to its shiny art the
moment this card is equipped on it (see commitTeamMemberCard()).
A token with no shiny art is still sent, just as its regular
form -- the confirm card says so.

## `// "yes" marks a card that, while it's equipped on a Pok\u00e9mon (Attach`

The reverse direction of canAttachFromPermanent: canPermanentFromAttach:
"yes" marks a card that, while it's equipped on a Pok\u00e9mon (Attach
or Nature slot), can be sent to its owner's Permanent Cards
panel from there -- a \"Send to Permanent\" button in the corner
Cards overlay and the details panel's Cards section (see
renderTeamCardSlotPanel() and sendEquippedCardToPermanent()).
Independent of canAttach/canPermanent, same \"yes\"/\"no\" string
convention. Ignored for a card that needs a Pok\u00e9mon or Color
picked before it can be Permanent (choosePokemon/noteColor) --
an entry made from here has no way to carry either.

## `// one-of -- only a single copy exists in the deck -- so at most`

Dept. Store Sale (see the chat this was requested in) is a
one-of -- only a single copy exists in the deck -- so at most
one player can ever have it in their Permanent Cards panel at
once. Identified by name rather than a cards.json field, same
"hardcode the one specific card/deck this rule cares about"
approach as deckSkipsReturnToHand() above.

## `// broadcastDeckState() already uses for handCounts -- 'host' or`

Host-side only: which player (by the same identity keys
broadcastDeckState() already uses for handCounts -- 'host' or
a connected guest's peerId) currently has Dept. Store Sale in
their Permanent Cards panel, or null if nobody does. Checked
fresh every broadcast rather than cached, so this doubles as
the "costs return to normal once the card leaves the zone"
behavior for free: there's no separate flag to remember to
clear, the discount just stops showing up once the card's no
longer in anyone's array (e.g. Discarded -- see
hostApplyPermanentDiscard()).

## `// added in) ----`

---- Per-player one-time-reward claims (see the chat this was
added in) ----

Exact same shape/reasoning as the hand storage just above --
this device's OWN claims live on getActiveSaveData()
(persisted locally regardless of role), every OTHER
connected player's claims live on the HOST's own save
instead, keyed by deckName then by that player's persistent
guestClientId, so a dropped/reconnecting guest (or a Host
reload) doesn't lose track of which oneTime cards it's
already picked. Whether a given cardId actually needs to be
tracked at all is decided at the call site (hostApplyDraw()
etc. only ever push a oneTime:'yes' card's id in here) --
these two getters/setters don't care what's in the array.

## `// 'host' for the Host's own device, or a conn.peer id for a`

Host-side: applies a draw for whichever player asked --
'host' for the Host's own device, or a conn.peer id for a
connected guest -- then tells everyone what changed. Called
directly (no network hop) when this device IS the player in
question (solo play, or the Host drawing for itself); called
from wireHostConnection()'s 'deck-draw' handler otherwise.

## `// DECK_GAIN_REWARD_MENU deck's own "Gain Reward" menu -- the`

Same shape as hostApplyDraw() above, but for a
DECK_GAIN_REWARD_MENU deck's own "Gain Reward" menu -- the
player picked cardId themselves (see requestGainReward()),
there's no drawPile/discardPile involved at all any more.
Trusts deckName/cardId came from a real click on that deck's
own menu the same way every other deck action here trusts
its caller, but still re-checks the oneTime cap server-side
(via the Host's own authoritative claims store) rather than
just believing the request, since two rapid clicks/a stale
client could otherwise double-claim.

## `// point of view a card landing in its hand is a card`

Reuses 'deck-drawn' -- from the receiving guest's own
point of view a card landing in its hand is a card
landing in its hand, same reasoning
hostApplyReturnDiscardToHand() already gives for
reusing it. That handler also mirrors the oneTime
claim into the guest's own local cache (see its own
comment) so its menu still renders correctly grayed
out without a round trip back to the Host.

## `// DECK_SHOP_MENU deck's own "Shop for Items" menu -- the player`

Same shape as hostApplyGainReward() just above, for a
DECK_SHOP_MENU deck's own "Shop for Items" menu -- the player
picked cardId themselves (via either its Buy or Take button,
see requestBuyShopCard()/requestTakeShopCard()), so there's
no drawPile/discardPile involved here either. Unlike
hostApplyGainReward() there's no oneTime cap to re-check --
no Shop Deck card is tagged oneTime (see cards.json) -- and
no Poké Coin deduction happens here either: the cost was
already paid (or waived, for Take) purely locally on the
buying device by the caller before this ever runs, since
Poké Coins is a per-device tracker, never networked the way
hands/decks are (see isPokeCoinsEnabledForActiveSave()'s own
comment). This function's only job is putting the card in
the right hand.

## `// triggered this already told THIS device which card to`

Unlike a draw (see hostApplyDraw()), the request that
triggered this already told THIS device which card to
remove -- but that's the Host's own UI optimistically
assuming the request will succeed for nobody but
itself. A connected guest's own device needs the
mirror image of 'deck-drawn' to actually apply the
same removal to ITS OWN local hand cache; without
this, a guest's hand looks like it never lost the
card until the next full 'hand-sync' (e.g. its next
reconnect) fixes it.

## `// leaving the hand WITHOUT going to either deck's discard pile`

Same shape as hostApplyDiscard() above, but for a card
leaving the hand WITHOUT going to either deck's discard pile
-- used when a card gets Attached instead (see
commitAttachFromHandToMember()). An attached card sits face-up
next to its Pokémon, not in a discard pile, so this only ever
removes it from whichever hand currently holds it, then
announces it into the Active Card zone as already-committed
(see setHostActiveCard()'s own comment on that flag) so every
other player sees what was just attached and to what.

announce=false is for a Battle Card played facedown (see
playBattleCardFromHand()): it leaves the hand the same way
but is NOT revealed into the shared Active Card zone, since
nobody else is supposed to see which card it is yet.

## `// buttons -- same "remove from hand" shape as`

The hand stack's own Put on Top of Deck/Put on Bottom of Deck
buttons -- same "remove from hand" shape as
hostApplyRemoveFromHandOnly()/hostApplyDiscard() above, but
instead of discarding or handing off to the Active Card zone,
the card goes straight back into its OWN deck's drawPile (see
getEffectiveCardDeck() -- this is the card's real originating
deck, NOT discardToHostDeck()'s "every extra deck folds into
Item Deck" rule, since this needs to land back in the deck
it'll actually be drawn from again). position is 'top' or
'bottom', same push-onto-the-end-pop()-reads-from-vs-unshift-
onto-the-front convention as hostApplyLookMoveToTop()/
hostApplyLookMoveToBottom() above.

## `// (see requestPlayFromHand() below) -- takes the card out of`

Host-side: the Play button in a hand card's own options grid
(see requestPlayFromHand() below) -- takes the card out of
hand exactly like a Discard would (same peerKey-branching
shape as hostApplyDiscard()), but instead of going straight to
deckName's discard pile, it reveals into the Active Card zone
still pending (committed:false), same as a freshly-drawn Event
card -- see setHostActiveCard()'s own comment on that flag.
The actor decides its final Discard/Permanent/Shuffle/Attach
disposition from the zone itself, not from hand.

## `// Discard/Permanent/Shuffle/Attach -- plus the shared "only the`

---- The Active Card zone's own four resolving actions --
Discard/Permanent/Shuffle/Attach -- plus the shared "only the
actual actor may resolve it" guard every one of the first
three uses (Attach's own guard lives in requestAttachFromHand()
instead, since that path also has to work for the ordinary
hand-attach case which has no actor to check against). ----

## `// play rather than a one-time use, so it doesn't return to`

"Permanent" -- the card's effect is considered permanently in
play rather than a one-time use, so it doesn't return to
either pile at all; instead it's pushed into peerKey's own
Permanent Cards panel (see getLocalPermanentArray()/
getPeerPermanentArray()), where it stays, visible, for the
rest of the game -- no discard-pile reshuffle, and no
mutator anywhere that removes a card from this array once
it's landed. Clears the zone the same as Discard.
Cards.json cards with canPermanent: "yes" (see the Permanent
button in renderActiveCardZone()) can move here from the
Active Card zone. If the card needs a specific Pokémon (see
cardNeedsPokemonChoice()) or a Color (see cardNeedsNoteColor()),
the Permanent button hands off to the gallery or opens the
swatch picker instead of committing right away (see the chat
both of these were changed/added in) -- either way, the pick
arrives as a param here and gets committed to Permanent in the
same round trip rather than a separate standalone action, so
there's no in-between state where something's been chosen but
the card hasn't actually moved yet. A card is never expected
to need both -- pokemonPick wins if somehow both fields are
set, since its own noteColor (derived from the chosen token's
own color tag -- see confirmPermanentPickSelection()) simply
overwrites whatever a manually-chosen color would have been.

## `// .game-permanent-card-discard-btn in the viewer overlay) --`

Permanent Cards panel's own Discard button (see
.game-permanent-card-discard-btn in the viewer overlay) --
pulls one specific card, by instanceId, back OUT of whichever
player's Permanent Cards array it's in, and puts it in its
own deck's discard pile same as any other discard
(discardToHostDeck() -- so it becomes visible/reclaimable the
normal way, not lost). This is the only way a card leaves
Permanent Cards once it lands there -- see
findDeptStoreSaleHolder()'s own comment on why that alone is
enough for Dept. Store Sale's discount to turn itself back
off, no separate bookkeeping needed.

## `// requestAttachFromPermanent()) -- the equip itself already`

Attach-from-Permanent's own final step (see
requestAttachFromPermanent()) -- the equip itself already
happened locally on the acting player's own device via
commitTeamMemberCard() (team data needs no Host round-trip,
see that function's own comment), so all that's left is
pulling the one entry out of that player's Permanent array.
Same shape as hostApplyPermanentDiscard() just above, minus
the discardToHostDeck() -- the card isn't discarded, it's
now equipped, so it must not show up in (or be reclaimable
from) any discard pile. Re-checks canAttachFromPermanent
itself rather than trusting the request, same as every other
hostApply* function re-checks its own preconditions.

## `// the equipped card has already come off the Pok\u00e9mon locally`

The Permanent-bound half of sendEquippedCardToPermanent() --
the equipped card has already come off the Pok\u00e9mon locally
(team data needs no Host round-trip), this just creates its
Permanent entry for the acting player. Same shape as the
add-to-Permanent half of hostApplyActiveCardPermanent() (a
guest's goes into the Host's mirror and is pushed to the
guest as 'permanent-added'), minus the Active Card zone and
the Color/Pok\u00e9mon picks, which a card with
canPermanentFromAttach can't need (see
cardCanPermanentFromAttach()). Re-checks the field itself
rather than trusting the request.

## `// .game-permanent-card-viewer-counter in the viewer overlay) --`

Permanent Cards panel's own counter (see
.game-permanent-card-viewer-counter in the viewer overlay) --
delta is +1 or -1, from whichever half got clicked (see the
overlay's own click listener further down). Clamped to a
floor of 0 -- there's no cards.json field for a ceiling, so
this only ever guards against going negative, same
"can't go below zero" floor every other counter in this doc
(HP, Level, Status) already enforces.

## `// designed in) ----`

---- "Shuffle Discards into Deck" cards (see the chat this was
designed in) ----

A card tagged in cards.json with both:
"shuffleDiscardPile": "Nature Deck"   -- whose discard pile gets gathered up
"shuffleIntoDeck":    "Nature Deck"   -- which deck that pile is shuffled into
gets a button -- in the Active Card zone while it's still the
actor's own pending card, or on the Pok\u00e9mon's attached-card
panel (see renderTeamCardSlotPanel()) -- that moves the whole
named discard pile into shuffleIntoDeck's drawPile, puts the
card itself back into its OWN deck's drawPile (cardDeck, via
getEffectiveCardDeck()), and reshuffles. The two decks are
separate fields so e.g. an Event card can shuffle the Item
discard pile back into the Item Deck. Key Items stay behind
in the pile (they're stuck once discarded -- see
cardIsKeyItem()). Both deck names must be real entries in
getDeckToolList(), otherwise the button never shows.

## `// Card (verified against the shared zone, and the zone is`

Host-side. fromActive: the card is the actor's pending Active
Card (verified against the shared zone, and the zone is
cleared). Otherwise the card was just detached from a Pok\u00e9mon
on the requesting device (team data never needs a Host
round-trip -- see commitTeamMemberCard()) so only the deck
side happens here. Re-checks the card's own fields rather than
trusting the request.

## `// requestAttachFromHand()/commitAttachFromHandToMember()'s`

The Attach-from-active-card path's own final step (see
requestAttachFromHand()/commitAttachFromHandToMember()'s
handAttachPendingSource branch) -- the actual equip already
happened locally on the acting player's own device via
commitTeamMemberCard() (team data needs no Host round-trip
either way, see that function's own comment), so all that's
left here is clearing the shared zone.

## `// discardPile (removing its first matching occurrence -- same`

Host-side: pulls one specific card back OUT of deckName's
discardPile (removing its first matching occurrence -- same
"trust the request, don't try to disambiguate duplicate ids"
stance hostApplyDiscard() already takes on the hand side) and
into whichever player asked for it. Reuses the exact same
'deck-drawn' network message hostApplyDraw() already sends
for a normal draw -- from a connected guest's own point of
view a card landing in its hand is a card landing in its
hand, it doesn't matter whether it came off the top of
drawPile or out of discardPile.

## `// discardPile and folds it back into drawPile, reshuffling the`

Host-side: pulls one specific card out of deckName's
discardPile and folds it back into drawPile, reshuffling the
whole thing afterward so it lands somewhere random rather
than predictably on top. Doesn't touch any hand -- unlike
Return to Hand above, this is a deck-only move, so there's no
peerKey/hand-side branch needed, any player's request has the
same effect on this shared pile.

## `// deckName's drawPile in place. Doesn't touch discardPile at`

Host-side: the deck row's own Shuffle button -- reshuffles
deckName's drawPile in place. Doesn't touch discardPile at
all (that's what Shuffle into Deck, on a discard-pile card
itself, is for -- see hostApplyShuffleDiscardIntoDraw() above),
and doesn't touch any hand, so there's no peerKey branch
needed, any player's request has the same effect on this
shared pile.

## `// in) ----`

---- "Look at Top X Cards" (see the chat this was designed
in) ----

Lets a player privately peek at the top of a deck without
reordering it -- opening the peek (hostApplyLookRequest()
below) is deliberately NOT broadcast the way every other deck
action here is: drawPile's own order/contents are secret from
everyone (only counts are public, see getDeckInfoMap()'s own
comment), so revealing it has to go to exactly the one
requesting connection, never everyone. The peek itself changes
nothing; only actually tapping one of the revealed cards' own
three actions below (Top of Deck/Bottom of Deck/Add to Hand)
touches real deck state, same as any other deck action.

## `// many actually exist) off deckName's own drawPile, reversed so`

Host-side: reads the top `count` cards (clamped to however
many actually exist) off deckName's own drawPile, reversed so
the FIRST entry is the real top card -- drawPile's own array
order has the top card LAST (see drawFromHostDeck()'s own
pop()), which matches every other stack in this tool (hand/
discard, both rendering their own last entry as the frontmost
one) but reads backwards for a peek specifically shown as a
reading-order list: testers kept assuming the first card
shown was the top of the deck (see the chat this was fixed
in), so this reverses it once, here, rather than asking every
caller to remember to. Sent straight back to the requester
alone (never broadcast -- see the module comment above):
openDeckLookViewer() locally if the Host itself asked, or a
private 'deck-look-result' to just that one connection
otherwise.

## `// peek itself, these DO change real, shared deck state, so all`

The peeked view's own three per-card actions -- unlike the
peek itself, these DO change real, shared deck state, so all
three broadcast same as any other deck action. Trusts the
request the same way every other deck action here does; if
the card's since moved (someone else drew it, it got
reshuffled out from under this peek, etc.) this just silently
no-ops rather than erroring, same "already gone" handling
hostApplyReturnDiscardToHand() takes.

## `// whatever pop() would return next, i.e. the END of the array`

Moves cardId to the very top of the deck -- the top is
whatever pop() would return next, i.e. the END of the array
(see drawFromHostDeck()), so "moving to top" means removing it
from wherever it sits and pushing it back onto that same end.

## `// player was doing the looking -- same peerKey-branching shape`

Takes cardId straight out of drawPile and into whichever
player was doing the looking -- same peerKey-branching shape
(and the same 'deck-drawn' message reused for the guest side,
see hostApplyReturnDiscardToHand()'s own comment on why) as
every other "a card lands in a hand" path here, it doesn't
matter to the receiving client which pile it came out of.

## `// was designed in) ----`

---- Manually-picked Attach/Nature Cards (see the chat this
was designed in) ----

A card manually equipped from the Team Tracker's own corner
badge overlay or details view (see selectTeamCardsOverlayOption()/
selectTeamDetailCardOption()) is only ever reachable at all
when this save has virtual decks turned off (see
renderTeamCardSlotPanel()'s own comment) -- a save using
physical paper cards, so there's no hand/discard/deck
bookkeeping to do for the new card going ON. Taking one OFF
is different: that still needs to land somewhere concrete
when virtual decks is on, exactly like every other unattach
path (Team Replace's outgoing member, a released member,
etc.) -- see discardUnattachedCard() below.

## `// used when a manually-equipped Attach/Nature Card becomes`

Puts one specific card into deckName's own discardPile --
used when a manually-equipped Attach/Nature Card becomes
unattached (removed outright, or swapped for a different
one), same as setting a physical card back on the discard
pile once it comes off a Pok\u00e9mon. Reuses discardToHostDeck()
(see its own comment), unlike hostApplyDiscard() this never
touches any hand -- the card was never in one to begin with.

## `// it's public info, same "everyone can see the discard pile"`

see #game-discard-viewer-overlay/openDiscardViewer() below;
it's public info, same "everyone can see the discard pile"
convention discardTop already relied on), every player's hand
*count* (never hand contents -- see .game-other-hands-list's
own CSS comment for why), and the shared Active Card zone's own
state (public by design -- a revealed/played card is meant to
be seen by everyone, see setHostActiveCard()'s own comment).
Sent to every connected guest, and applied locally so the
Host's own screen redraws off the exact same data a guest
would see.
The decks live inside the Host's own save (see ensureHostDeckStore()), but a deck-only change -- Shuffle into Deck, a
reshuffle, Look at Top, a card put back on a pile -- touches no hand, so nothing else saved it and a reload brought the
old piles back. Every deck change ends in broadcastDeckState(), so it writes the save here. (A save with no slot --
unsavedDeckState -- has nothing to write to, and a read-only save is never written.)

## `// lobby-visible -- see the chat this was built in, and`

---- Multiplayer Battle Arena (Host-authoritative, whole-
lobby-visible -- see the chat this was built in, and
guestBattleArenaCache/hostBattleArenaState's own declarations
further down in the Battle Arena section for the overall
shape) ----
There is exactly ONE Attacker slot and ONE Defender slot for
the whole lobby, each holding either a specific player's own
Pokémon ({member, ownerId: <peerId or 'host'>}) or an
ownerless one ({member, ownerId: null} -- today only ever the
Wild Pokémon, but the same shape is what an NPC Trainer or
Gym Leader would use later). Who may control what follows
from ownership alone -- see canControlWildDefender()/
canCatchWildDefender() below.

Same broadcast-a-full-snapshot shape as broadcastDeckState()
just above -- every mutation below rebuilds and resends the
whole {attacker, defender} object rather than a smaller delta,
since it's tiny and this keeps every device's own
guestBattleArenaCache trivially consistent with the Host's
hostBattleArenaState.

## `// handleHostConnectionDrop() is the normal way that happens, but`

Frees any slot whose owner is no longer a live connection.
handleHostConnectionDrop() is the normal way that happens, but
a slot must never depend on a single close event having fired
(a device that just vanishes can take a while to be noticed,
or come back under a new peer id) -- so this runs on every
broadcast and every roster refresh, and treats "owner not in
lobbyState.connections, or its connection not open" as
vacant. Returns whether anything changed; deliberately doesn't
broadcast itself (its callers do).

## `// shaped object or null to clear. ownerId comes from the`

slot is 'attacker' or 'defender'; member is a full team-member
shaped object or null to clear. ownerId comes from the
connection the message actually arrived on (conn.peer, or
'host') rather than anything the sender claims about
themselves -- same convention hostApplyDraw() etc. already
follow. wild:true tags the entry as ownerless instead.
---- Who is part of a battle? The owners of the two halves. A half with no owner (a wild Pok\u00e9mon, a Trainer's, a
Gym Leader card) has ownerId null, so it never makes anyone a participant.
A battle "between players" has a player's Pok\u00e9mon in BOTH halves; anyone owning neither is a spectator of it.

## `// (they're in this battle). Anyone else may only fill an EMPTY half -- or swap a lone wil`

Replacing an occupied half takes part in that battle. Allowed for whoever owns the half, or owns the OTHER half
(they're in this battle). Anyone else may only fill an EMPTY half -- or swap a lone wild/Trainer/Gym Leader
that nobody has challenged yet; they can't replace a player's Pok\u00e9mon, or either half of a battle already set up.
An EDIT (HP / status / level / fainted / evolve / Dynamax / attached cards) re-sends the very same ownerless
Pok\u00e9mon or card into the half it already occupies. That is never a replacement, so it's open to anyone
(the players controlling a Wild/Trainer/Gym Leader half edit it). Told apart by uid, falling back to name/dex
for an entry that never had one.

## `// anything) takes nothing with it -- whatever was attached to`

A Wild Pok\u00e9mon leaving the half (recalled, or replaced by
anything) takes nothing with it -- whatever was attached to
it goes to the discard pile. Told apart from the same
Pok\u00e9mon merely being re-sent after an HP/status edit by its
uid (falling back to the name/dex check above for an entry
that never had one) -- an edit must not discard anything,
and removing a card from a Wild Pok\u00e9mon by hand already
discards it itself.

## `// someone ELSE sending a Pokémon in (never by their own`

A player whose Pokémon was just taken out of the Arena by
someone ELSE sending a Pokémon in (never by their own
recall or re-pick, which keeps the same owner) is told
so -- otherwise it would just silently vanish from their
screen. Only fires for a real replacement (member is
non-null); an owner leaving is handled by
clearBattleArenaPlacementFor()/pruneBattleArenaOrphans().

## `// Arena is shared. Only the owner of the Attacker slot -- the`

The one place a Wild Pokémon actually gets caught once the
Arena is shared. Only the owner of the Attacker slot -- the
player whose Pokémon is actually in the fight, i.e. the one
who encountered it -- may do this; anyone else's request is
refused with a notice. That also settles what used to be a
race: there's only ever one eligible catcher, and a second
tap from them after the first already landed finds the slot
empty.

The Host's own roster lives locally, so a Host catch applies
straight through finishLocalWildCatch(). A Guest's roster is
never something the Host has a copy of (see
getPeerHandArray()'s own comment), so the Guest is told to add
it to its own save itself -- same "confirmed by the Host,
applied locally" shape 'deck-drawn' already uses.

## `// handleHostConnectionDrop()'s own call site. Frees any slot`

Host-only cleanup for a connection going away -- see
handleHostConnectionDrop()'s own call site. Frees any slot
that player owned. An ownerless (Wild) entry is left alone --
it belongs to nobody in particular, so one player leaving
shouldn't yank it out from under everyone else.

## `// here" convention as requestDrawCard() etc. below. ----`

---- Client-facing entry points -- same "branch on role once
here" convention as requestDrawCard() etc. below. ----
Whether THIS device's Pok\u00e9mon in `slot` is Fainted with nobody
on this device's team able to replace it. Only the owner's device
knows its roster, so it reports this to the Host (see
reportMyBattleReplacementState()), which shares it on the arena
entry so every other device can hide Next Round too.

## `// line takes its place (Host side -- see advanceSoloTrainerIfFainted()`

Next Round with the Trainer's Pok\u00e9mon Fainted: the next one in
line takes its place (Host side -- see advanceSoloTrainerIfFainted()
for solo). A no-op with nothing queued.
Host twin of advanceSoloGymLeaderIfFainted(): the ownerless Defender
entry holds a gym leader card whose side 1 fainted and whose
line-up (member.gymLeaderQueue) still has side 2.

## `// back to its pool and a new face-down one is dealt; otherwise it stays on its space. (Th`

Virtual Game Board: the wild Pok\u00e9mon leaves the arena with the battle. Fainted -> it goes
back to its pool and a new face-down one is dealt; otherwise it stays on its space. (The
solo End Battle gets this from recallBattleDefender(), and a recall/replacement or a catch
from hostApplyBattleSetSlot()/hostApplyBattleCatchWild() -- this branch clears the half
directly, so it has to say so itself.)

## `// Whoever wins a battle between two players (Battle a Player from the board, or the Let's`

---- Player-vs-player victory reward ----
Whoever wins a battle between two players (Battle a Player from the board, or the Let's Fight! card -- both end up
as the same Arena battle) chooses: take a random card from the loser's hand, or draw from the Item Deck. The Host
works out the winner when the battle ends (before the halves are cleared), tells the winner, and, if they pick the
hand, moves the card itself, since it holds every hand.
forfeitBy: the player who confirmed End Battle with nobody out of Pok\u00e9mon -- counted as the loser.

## `// True when this device is only WATCHING a battle between two other players: both halves `

The shared entry for a slot, or null solo / when empty.
True when this device is only WATCHING a battle between two other players: both halves hold a player's Pok\u00e9mon
(not a wild/Trainer/Gym Leader one, which has no owner) and neither is mine. Solo has no spectators.

## `// everyone EXCEPT the owner of the Attacker slot -- that`

Control of an ownerless slot (the Wild Pokémon) belongs to
everyone EXCEPT the owner of the Attacker slot -- that
player is busy playing their own Pokémon, and it's the other
players who make the Wild Pokémon's choices. If there's no
acting player yet, or nobody else is connected to take the
other side, nothing needs excluding.

## `// a player: only that player. An ownerless one (the Wild`

Who may choose moves for a half. A Pokémon that belongs to
a player: only that player. An ownerless one (the Wild
Pokémon): every player EXCEPT the owner of the other half's
Pokémon (same rule as canControlWildDefender()); nobody is
excluded if the other half is empty/ownerless or the lobby has
one player. `state` is {attacker, defender} entries.

## `// Attacker/Defender variables -- the same ones the solo`

Applies a battle-arena-state onto this device's local
Attacker/Defender variables -- the same ones the solo
render/edit plumbing already reads, so that plumbing keeps
working unmodified for whatever this device is entitled to
interact with. Deliberately never re-broadcasts: this is
applying something that already happened elsewhere.
- A slot I own: my own local pick is the live source of
truth (it's what caused the broadcast), left alone.
- An ownerless Defender: mirrored into battleWildPokemon so
the existing interactive wild card can edit it (whether
this device is actually allowed to is decided at render
time, see renderBattleDefenderSlot()).
- Empty, or another player's: nothing local to keep.

## `// Overlay corners -- for a Pokémon this device may look at but`

Full card -- art plus HP, Cards, Status, Level, Evolution and
Overlay corners -- for a Pokémon this device may look at but
not touch: another player's own Pokémon, or the Wild Pokémon
while this device is the acting player. Built fresh from the
member data the Host broadcast (this device has no live
.game-team-slot to clone for it), using the exact same badge
builders Team Tracker uses, so it looks identical to the
owner's own card. Read-only is enforced by
.game-battle-readonly-slot's pointer-events: none rather than
by leaving corners off, so none of it can reach the
#game-scroll delegated HP/Status/Level listeners.
opts.wild follows the interactive Wild card's own rules
(renderBattleWildDefenderSlotBody()): Evolution only when
shouldShowWildEvolutionBadge() says so, and no Overlay Card.

## `// own deck's discard pile exactly as the Discard button does, then`

The hand's Sell (+2 Poké Coins) button: discards the card to its
own deck's discard pile exactly as the Discard button does, then
credits 2 coins to this device's own tally. No-ops unless the
save's Poké Coin rule is on and the card is actually still in
this device's hand, so a stale double-tap can't pay out twice.

## `// buttons -- same role-based routing as requestDiscardCard()`

The hand stack's own Put on Top of Deck/Put on Bottom of Deck
buttons -- same role-based routing as requestDiscardCard()
just above, resolving cardId's own real deck the same way
requestPlayFromHand()/discardUnattachedCard() already do
(getEffectiveCardDeck(), so a tiered TM card lands back in its
own Novice/Advanced/Expert pile rather than plain 'TM Deck').
position is 'top' or 'bottom' -- see hostApplyReturnToDeck()'s
own comment.

## `// both ultimately just need cardId in the right hand, they only`

Shared by requestBuyShopCard()/requestTakeShopCard() below --
both ultimately just need cardId in the right hand, they only
differ in whether a Poké Coin cost gets paid first. Same
role-based routing as requestGainReward() -- a connected
guest asks the Host, the Host (or solo play) applies directly.

## `// findDeptStoreSaleHolder()) discounts Poké Coin shop costs`

Dept. Store Sale (see cardIsDeptStoreSale()/
findDeptStoreSaleHolder()) discounts Poké Coin shop costs
while it sits in someone's Permanent Cards panel -- 50% off
for whoever's holding it, 25% off for everyone else, no
discount if nobody has it (or before the first deck-state
broadcast arrives). 1 = full price.

## `// renderShopMenu()). Poké Coins is purely a per-device tracker`

The Shop menu's own Buy button (see .game-shop-buy-btn in
renderShopMenu()). Poké Coins is purely a per-device tracker
(see isPokeCoinsEnabledForActiveSave()'s own comment), so the
cost is deducted right here, on THIS device alone, regardless
of Host/guest/solo role -- there's no server round trip for
the coin spend itself, only for landing the card in the
right hand afterward. Re-checks both the read-only guard and
the balance server-... er, locally -- same trust-but-verify
shape as every other mutator here, since renderShopMenu()
already disables this exact button once either is true, but
a stale click already in flight shouldn't be able to sneak
a purchase through anyway.

## `// hostApplyPlay()'s own comment for what actually happens to the`

The Play button in a hand card's own options grid -- see
hostApplyPlay()'s own comment for what actually happens to the
card (reveals into the Active Card zone, still pending).
Set right before a hand-Play request goes out (see
requestPlayFromHand() below), consumed the next time
renderActiveCardZone() actually draws this device's own
pending card (see its own comment) -- there's almost always
further action needed once a card lands in the Active Card
zone this way, so autoscrolling there saves a manual scroll
every single time. Not set for a draw-reveal or an
Attach-from-hand landing in the same zone -- the chat this was
designed in asked for this specifically for a hand-Play, not
every path that can populate the zone.

## `// one deck action here that deliberately does NOT go through`

Request-side wrapper for hostApplyLookRequest() above -- the
one deck action here that deliberately does NOT go through
the normal "Host applies, then broadcasts to everyone" shape,
see that function's own comment. openDeckLookViewer() itself
(Host/solo) or the eventual 'deck-look-result' (guest, see
the wireHostConnection()/network-listener changes) is what
actually shows the peeked cards -- this just sends the ask.

## `// became unattached (removed outright, or swapped for a`

The Team Tracker picker's own counterpart for a card that just
became unattached (removed outright, or swapped for a
different one) -- sends it back to its own deck's discard
pile via requestDiscardUnattached(). No-ops for a cardId
CARDS_BY_ID doesn't recognize (shouldn't happen -- every
equipped card came from a real pick -- but there's no deck
name to look up from one it did).

## `// landing on anyone's roster -- a Wild Pok\u00e9mon recalled/replaced/`

Peels every card off a Pok\u00e9mon that's leaving play without
landing on anyone's roster -- a Wild Pok\u00e9mon recalled/replaced/
ended out of the Battle Arena, or a caught one that's
abandoned at the full-team prompt -- and puts each on its own
deck's discard pile. Same \"a save that never turned on virtual
decks has no discard pile to put it on\" gating, and same
attach+nature pair, as confirmTeamReleaseStage()/
confirmTeamReplace()'s own bookkeeping for a team member
leaving. (A CAUGHT Wild Pok\u00e9mon is deliberately not routed
through here -- its cards travel onto the roster with it.)

## `//`

---- Orphaned arena cards (see the chat this was designed in) ----

The Wild Pok\u00e9mon and the NPC Trainer's Pok\u00e9mon (and its
queue) are pure in-memory state -- never saved -- yet cards
attached to them already LEFT their source (hand/Permanent/
Active Card zone). A reload or tab close mid-battle used to
lose those cards outright. So the ids of every card currently
sitting on one are mirrored into the active save as
save.arenaCards (kept current by syncArenaOrphanRecord(),
called from the arena slot renderers), and
recoverOrphanedArenaCards() sends whatever is still listed
there to its own deck's discard pile the next time that save
is live -- anything legitimately discarded/caught/recalled in
the meantime has already dropped off the list. Host/solo
saves only: a guest's table-owned Wild/Trainer Pok\u00e9mon
belongs to the Host's session, and the Host's save records it.

## `//`

---- Overlay Cards (see the chat this was designed in) ----

A canOverlay: "yes" card placed on a Pokémon -- a single slot
per member (member.overlayCardId/.overlayCounter), separate
from Attach/Nature entirely (every Overlay-eligible card so
far has canAttach: "no" -- these represent something being
done TO the Pokémon, temporarily, not equipment it's holding).
Assigning one happens two different ways depending on this
save's own virtual-decks setting -- see
renderTeamDetailOverlaySection() for the No case (a direct
picker, same accordion component Attach/Nature already use,
just filtered to the 'overlay' pseudo-slot -- see
getAttachableCardsForSlot()) and beginOverlayFlow()/
performOverlayFromActiveCardToSlot() below for the Yes case
(routed through the Active Card zone's own Overlay button,
reusing handAttachPendingCardId/handleAttachPendingSource's
existing "stash it, tap a Pokémon" machinery -- see
beginAttachFlow()'s own comment for why that's shared rather
than duplicated). Viewing/adjusting/discarding one, once
placed, is the same regardless of which way it got there --
see openOverlayCardViewer() and friends below.

## `// for (an index into data.team.members), or null while it's`

Which team member's Overlay Card the viewer is currently open
for (an index into data.team.members), or null while it's
closed. Team data is purely local to this device's own save
(see commitTeamMemberCard()'s own comment) -- unlike
permanentCardViewerInstanceId's own peerKey-aware equivalents,
there's no Host round-trip needed for the member-side of
anything here, only for the shared discard pile a Discard
actually lands the card on (see requestOverlayDiscard()).

## `// renderTeamGrid()'s own .game-team-slot-overlay) -- the only`

Opens from the center badge on the roster grid (see
renderTeamGrid()'s own .game-team-slot-overlay) -- the only
place left that needs a popup at all. The details panel's own
Overlay Card row shows everything inline instead now (see
renderTeamDetailOverlaySection()'s own comment for why) -- no
popup there any more.

## `// member overlayCardViewerIndex currently points at -- same`

Fills in the viewer's own title/image/counter for whichever
member overlayCardViewerIndex currently points at -- same
"card face, then its own action panel" shape as
renderPermanentCardViewer(), reusing its .game-permanent-card-viewer-*
classes for the face/counter (see the HTML's own comment for
why). Closes itself out if that member (or its overlayCardId)
has gone missing (e.g. Released from another angle while this
was open) rather than showing a viewer for a card that's no
longer there. No-ops harmlessly if the overlay isn't currently
open, same as renderPermanentCardViewer().

## `// tapped (see the overlay's own click listener). Clamped to a`

delta is +1 or -1, from whichever half of the counter got
tapped (see the overlay's own click listener). Clamped to a
floor of 0, same "can't go below zero" rule every other
counter in this doc enforces (see
hostApplyPermanentCounterAdjust()'s own comment). Purely
local -- see overlayCardViewerIndex's own comment on why this
needs no Host round-trip the way the Permanent viewer's
equivalent does.

## `// badge (see renderTeamGrid()'s own comment) in sync with`

Keeps the roster grid's own .game-team-slot-overlay-count
badge (see renderTeamGrid()'s own comment) in sync with
the value just changed above -- without this it kept
showing whatever value was on the member when the grid
last rendered (i.e. the card's starting count) instead of
the current one.

## `// local, same as every other member-side mutation here) and,`

Discard -- clears the member's own Overlay Card slot (purely
local, same as every other member-side mutation here) and,
when this save has virtual decks on, sends the card itself
back to its own deck's discard pile via discardUnattachedCard()
-- same bookkeeping every other "a card comes off a Pokémon"
path in this doc already goes through (Team Replace's outgoing
member, a released member, Remove Card on the Attach/Nature
slots).

## `// called from the delegated click listener, only ever reachable`

---- The Active Card zone's own request-side entry points --
called from the delegated click listener, only ever reachable
by the card's own actor (renderActiveCardZone() only renders
these buttons for them in the first place); the Host-side
handlers double-check that anyway (see their own comments) in
case a stale UI ever fires one of these late. ----

## `// passed when the card needed one (see cardNeedsNoteColor()'s`

Permanent button in the Active Card zone -- color is only
passed when the card needed one (see cardNeedsNoteColor()'s
own use in renderActiveCardZone()'s click handling, which
opens the swatch picker instead of calling this directly in
that case, then calls this again once a swatch is tapped).
pokemonPick is the same idea for cardNeedsPokemonChoice()
cards -- see confirmPermanentPickSelection() for what it
contains and where it comes from.

pendingPermanentScrollTrigger: same shape/reasoning as
pendingActiveCardScrollTrigger above, just for the Permanent
Cards panel instead of the Active Card zone, consumed by
renderDecksScreen()'s own Permanent Cards block. This is the
one function every path that lands a card in Permanent goes
through (manual Color, choosePokemon's gallery hand-off, or
neither), so setting it here alone covers all of them.

## `// .game-permanent-card-discard-btn) -- this is always THIS`

The Permanent Cards viewer's own Discard button (see
.game-permanent-card-discard-btn) -- this is always THIS
device's own card (the viewer only ever opens off
.game-permanent-card-thumb in this device's own panel), so
peerKey is always 'host' from this device's own point of
view; hostApplyPermanentDiscard() sorts out whether that
means the actual Host or a connected guest once the request
lands.

## `// device's own local Host/solo store, or guestDeckStateCache on`

Reads whichever the current device actually has -- this
device's own local Host/solo store, or guestDeckStateCache on
a connected guest -- same one-shape-either-way pattern as
getDeckInfoMap(). Never mutates anything.

The zone is shared but each device shows only ONE card at a
time: this player's own still-pending card always comes first
(it is theirs to resolve, and another player's card must never
push it out of view); otherwise the oldest card from another
player (or one of their own already-committed ones) that this
device hasn't dismissed yet. Dismissing one reveals the next in
line, so other players' cards effectively queue up behind it.

## `// first: { entry, seen }. The Host's list only holds what is in the`

Other players' cards this device has been told about, oldest
first: { entry, seen }. The Host's list only holds what is in the
zone RIGHT NOW, so a card another player plays and resolves
(Discard, Permanent...) while this player is still busy with their
own would otherwise vanish before it ever reached the screen. Each
card is therefore kept here until it has actually been shown on
this device (seen) or dismissed; once it has been seen, it leaves
as soon as the Host's copy does, same as before. This player's own
cards are never queued here -- they come straight from the Host.

## `// comment) THIS device has chosen to stop looking at -- purely`

Which Active Card instanceId (see setHostActiveCard()'s own
comment) THIS device has chosen to stop looking at -- purely
local, never sent anywhere; a brand new card taking over the
zone naturally supersedes this the instant its own different
instanceId no longer matches, no explicit reset needed. Never
set for the card's own actor -- see renderActiveCardZone()'s
own comment on why the actor doesn't get a Dismiss for a still-
pending card, only Discard/Permanent/Shuffle/Attach instead.

## `// Team Tracker (see requestAttachFromHand()/`

Which hand card (if any) is currently being attached via the
Team Tracker (see requestAttachFromHand()/
requestAttachFromActiveCard() below) -- mirrors
teamReplacePendingMember's own shape (a pending action stashed
here, actually carried out once the player taps a slot over
on that screen), and is one more mode
renderTeamGrid()/the #game-scroll delegated listener's own
.game-team-slot-hit-zone branch both need to treat as mutually
exclusive with replacing/releasing/trading, same as those
three already are with each other.

## `// commitAttachFromHandToMember() knows which one to actually`

'hand' or 'active-card' -- which flow started this attach, so
commitAttachFromHandToMember() knows which one to actually
resolve once a member's picked: 'hand' still needs the normal
hand-removal request (see hostApplyRemoveFromHandOnly()), while
'active-card' just needs the shared zone cleared (the card
never touched a hand in the first place -- see
requestAttachFromActiveCard() below).

## `// (see requestAttachFromPermanent()) -- which Permanent Cards`

Only meaningful while handAttachPendingSource is 'permanent'
(see requestAttachFromPermanent()) -- which Permanent Cards
entry (by instanceId, not cardId, since the same card can be
there more than once) is the one being attached, so
commitAttachFromHandToMember() knows exactly which copy to
remove from Permanent once a Pokémon is actually chosen.

## `// the Wild Pok\u00e9mon already in the Arena (see`

True only while a Nature card is being attached straight to
the Wild Pok\u00e9mon already in the Arena (see
beginWildAttach()) -- that path never switches to Team
Tracker, so there's no banner to fall back to picking in
when its replace confirmation is declined; backing out has to
end the whole attach instead.

## `// the #game-scroll delegated listener's own`

Entered from the Active Card zone's own Attach button now (see
the #game-scroll delegated listener's own
.game-active-card-attach-btn branch) -- the hand stack's own
direct-Attach shortcut was removed (see the chat this was
moved in; requestAttachFromHand() is unused but left in place
since beginAttachFlow() still needs its 'hand' source
constant elsewhere). Stashes which card, then switches to the
Team Tracker so the player picks a Pok\u00e9mon by tapping it
there, same "borrow the Team Tracker's own picking-by-tap
flow" request this was built to. Guarded here rather than
only at the final commit, so a read-only save (or a card that
somehow isn't actually attachable) never even opens the Team
Tracker for this.
Brief transient notice on the Hand & Decks screen itself --
same shape as setTradeStatusMessage()'s own toast (auto-hides
after 4s, restarts the timer if called again before that).
Currently only used by beginAttachFlow() below for "no team
members yet", but written generically in case a later notice
needs the same treatment.

## `// -- 'nature' for a Nature Deck card (its own dedicated slot,`

Which Team Tracker slot a card lands in once actually equipped
-- 'nature' for a Nature Deck card (its own dedicated slot,
member.natureCardId), 'attach' for every other attachable card
(Item Deck and its subsets, member.attachCardId). Shared by
every path that can equip a card WITHOUT going through the
manual picker's own explicit slot argument (hand-attach,
Active-Card-zone-attach -- see beginAttachFlow()/
performAttachFromHandToSlot()/commitAttachFromHandToMember()
below), since none of those know or care which slot they're
headed for until this says so. Fixes a bug where a Nature
card attached this way always landed in the Attach Card slot
instead (see the chat this was found/fixed in) -- the manual
picker itself (selectTeamCardsOverlayOption()/
selectTeamDetailCardOption()) never had this problem, it
already takes an explicit slot argument from whichever of the
picker's own two accordions the player tapped.

## `// team member OR the Wild Pok\u00e9mon -- a Nature card is`

Every attachable card (Nature, Item, or Event) can go to a
team member OR the Wild Pok\u00e9mon -- a Nature card is
added when a Pok\u00e9mon is encountered in the wild or
joins a team, and an Item/Event effect can likewise need
to land on a wild Pok\u00e9mon. Most of the time it's a
team member, but ask which first either way.

## `// or null. In a Lobby that's the shared ownerless Defender`

The Wild Pok\u00e9mon currently in the Arena's Defender slot,
or null. In a Lobby that's the shared ownerless Defender
entry (mirrored into battleWildPokemon for everyone, see
applyIncomingArenaState()); solo it's battleWildPokemon
while Defender points at 'wild'. Same object the Wild slot's
own Cards badge edits (see getTeamSlotMember('wild')).

## `// out right now -- i.e. whether the card's source can still be`

Whether a pending attach-to-Wild can still actually be carried
out right now -- i.e. whether the card's source can still be
resolved (the half that needs the Host's say-so, see
resolveAttachSource()). Checked BEFORE anything is equipped or
placed, since both are purely local and there's no undoing
them if the source half then fails -- the card would end up
in two places. ctx = { source, cardId, instanceId? }.

## `// canControlWildDefender() -- that rule keeps the Attacker's`

Wild Pok\u00e9mon on the Nature choice overlay. Not gated by
canControlWildDefender() -- that rule keeps the Attacker's
owner from steering the Wild Pok\u00e9mon's choices in battle,
but they're exactly the player who ENCOUNTERED it, and a
Nature card is theirs to attach to it (the Host's own
set-slot handler doesn't gate this either).
- A Wild Pok\u00e9mon is already in the Arena: attach straight
to it, through the exact same perform/commit steps as a
team Pok\u00e9mon tap (index 'wild' -- so the replace
confirmation and discard bookkeeping are shared).
- None is: pick one from the gallery -- the Battle Arena's
own Choose Wild Pok\u00e9mon pick, which sends the choice to
the Defender slot already carrying this card (see
confirmBattleWildSelection()).

## `// say-so, branching on where the card came from -- shared by`

Resolves the half of an attach that DOES need the Host's
say-so, branching on where the card came from -- shared by
commitAttachFromHandToMember() (equipping onto a roster
member or the Arena's Wild Pok\u00e9mon) and
confirmBattleWildSelection() (the Wild Pok\u00e9mon that was just
created from the gallery). 'permanent': the entry leaves the
Permanent Cards panel (not discarded). 'active-card': the
shared zone clears. Otherwise ('hand'): it leaves the hand.

## `// renderActiveCardZone()) -- only ever shown/reachable by the`

The Active Card zone's own Attach button (see
renderActiveCardZone()) -- only ever shown/reachable by the
card's own actor (see the zone's own actor-vs-everyone-else
split), so unlike requestActiveCardDiscard()/-Permanent()/
-Shuffle() this needs no separate actorKey check of its own:
commitAttachFromHandToMember() eventually routes this to
hostApplyActiveCardResolveAttach(), which re-checks anyway.

## `// reachable for a card with canAttachFromPermanent: "yes" (see`

The Permanent Cards viewer's own Attach button -- only ever
reachable for a card with canAttachFromPermanent: "yes" (see
cardCanAttachFromPermanent()). Same "stash it, switch to Team
Tracker, tap a Pokémon" machinery as beginAttachFlow() --
handAttachPendingCardId/-Source are shared so every existing
"block this control while an attach is pending" guard keeps
working unchanged -- plus handAttachPendingPermanentInstanceId
so the exact Permanent entry can be removed once it's
actually equipped. Nothing leaves Permanent until a Pokémon
is tapped (and any replace confirmation accepted); Cancel
just leaves the card where it is.

## `// carried out right now -- the entry's still in this device's`

Whether a pending Attach-from-Permanent can still actually be
carried out right now -- the entry's still in this device's
Permanent array and still opted in, and (as a guest) the Host
connection that has to confirm the removal is up. Checked
BEFORE anything gets equipped, since equipping is purely
local and there's no undoing it if the Permanent half then
fails -- the card would end up in both places.

## `// button -- only reachable for a card with`

The Permanent Cards viewer's own Attach to Wild Pok\u00e9mon
button -- only reachable for a card with
canAttachWildFromPermanent: "yes". Hands off to the Battle
Arena's existing Choose Wild Pok\u00e9mon gallery pick (see
beginBattleWildPickMode()), carrying which Permanent entry
it's for; the pick ends in confirmBattleWildSelection(),
which puts the chosen Pok\u00e9mon in the Defender slot as a Wild
Pok\u00e9mon already holding this card and only THEN removes the
card from Permanent (so backing out at any point -- the
banner's Cancel, \"Don't Send\", declining the Defender replace
confirmation -- leaves it exactly where it was).

## `// just reuse that function with a different source string, since`

Overlay's own counterpart to beginAttachFlow() above -- can't
just reuse that function with a different source string, since
it hard-checks card.canAttach === 'yes' and every
Overlay-eligible card so far has canAttach: "no" (Overlay and
Attach are unrelated flags -- see renderActiveCardZone()'s own
comment). Otherwise identical: stash the card + source in the
exact same handAttachPendingCardId/handAttachPendingSource
pair beginAttachFlow() uses (so every existing "block this
control while an attach/overlay is pending" guard throughout
the Team Tracker keeps working unchanged -- see the chat this
was decided in), then switch to it so the player can tap a
Pokémon.

## `// called by #game-team-attach-cancel-btn directly, and by`

The one authoritative way out of Attach-from-hand mode --
called by #game-team-attach-cancel-btn directly, and by
commitAttachFromHandToMember() once an attach actually goes
through, same "one place unwinds everything" shape as
exitTeamReleaseMode(). The card stays in hand if this fires
before a member's ever chosen (Cancel path).

## `// .game-team-slot-hit-zone branch, only while`

Called only from the #game-scroll delegated listener's own
.game-team-slot-hit-zone branch, only while
handAttachPendingCardId is set and only for a filled slot (an
empty one has no Attach Card slot to put anything into).
Skips the confirmation entirely for a member with no card
equipped yet in whichever slot this one's headed for (see
getAttachSlotForCard()), or one already carrying this exact
same card -- there's nothing to lose in either case -- and
only opens #game-team-attach-confirm-overlay when it'd
actually replace a DIFFERENT equipped card.

## `// confirmed-replace paths above -- equips handAttachPendingCardId`

Shared final step for both the no-confirmation-needed and the
confirmed-replace paths above -- equips handAttachPendingCardId
onto members[memberIndex], into whichever slot
getAttachSlotForCard() says it belongs in (a Nature Deck card
goes to the Nature Card slot, everything else to the Attach
Card slot -- see that function's own comment for the bug this
fixes) via the exact same commitTeamMemberCard() the Team
Tracker's own picker already uses (team data is purely local
to this device's own save either way, host or guest, so this
half needs no network round-trip either way), discards
whatever card that displaces from that same slot (see
discardUnattachedCard() -- same virtual-deck bookkeeping the
manual picker's own replace/remove paths use,
performAttachFromHandToSlot()'s own confirm step is what
actually displaces something here, an empty slot has nothing
to discard), then resolves whichever half DOES need the
Host's say-so, branching on handAttachPendingSource (see its
own comment): a card that came from hand still needs the
normal hand-removal request (see hostApplyRemoveFromHandOnly()'s
own comment on why this isn't the same thing as a discard); a
card that came from the Active Card zone never touched a hand
at all, so there's nothing to remove -- just tell the Host to
clear the zone (see hostApplyActiveCardResolveAttach()).

## `//`

---- On-attach top-of-deck effects (Egg Move) ----------------

A card can carry
"onAttachTopCard": { "deck": "TM Deck", "action": "attach" }
meaning: when it becomes attached to a Pok\u00e9mon -- on the
team or the Wild Pok\u00e9mon in the Arena alike -- the top card
of that deck is dealt with automatically.
action "attach"  the card is attached to the same Pok\u00e9mon
(into its own slot -- a TM goes in the
Attach Card slot, replacing and discarding
whatever was there).
(Other actions are for cards still to be wired up.) Only for
saves using virtual decks -- on paper cards there's no deck to
draw from. The deck itself is shared, so the Host does the
drawing (see hostApplyDrawForAttach()).

## `// Pok\u00e9mon (roster index, or 'wild' etc.): a Level bonus`

Everything that happens automatically when `cardId` lands on a
Pok\u00e9mon (roster index, or 'wild' etc.): a Level bonus
(onAttachLevelUp, Pok\u00e9rus) and/or a top-of-deck draw
(onAttachTopCard, Egg Move). Callers only invoke this when the
card actually became attached (not when the Pok\u00e9mon was
already carrying it).

## `// N Levels (capped at 6 like any Level change, and skipped for a`

"onAttachLevelUp": N -- the Pok\u00e9mon the card lands on gains
N Levels (capped at 6 like any Level change, and skipped for a
Gym Leader's printed level -- see adjustTeamMemberLevel()).
Virtual-decks saves only: on paper cards the player levels up
by hand, same gate as every other on-attach effect.

## `// request -- straight to the Host's own code when this device is`

Sends the "draw from `decks` and attach it to this Pok\u00e9mon"
request -- straight to the Host's own code when this device is
the Host, over the connection when it's a guest. skipOneTime
makes the Host reveal down the deck past any oneTime:'yes'
card (see hostApplyDrawForAttach()).

## `//`

---- "Resolve One-Time Effect" (Pok\u00e9rus, Shiny, Held Item, Egg Move) ----

The one button every oneTime Nature card gets while it's
equipped (virtual decks only). What it does is spelled out by
the card's own cards.json field:
"oneTimeEffect": {
"attachTopCard": { "deck": "TM Deck" },                 (optional)
"replace": { "deck": "Nature Deck", "skipOneTime": true }, (optional)
"then": "permanent" | "shuffle" | "discard"
}
Run in this order, after the card comes off its Pok\u00e9mon:
attachTopCard  the top card of that deck is attached to the
same Pok\u00e9mon (its own slot -- a TM goes in
Attach, replacing whatever was there).
replace        the Host reveals cards off the top of the
deck until it finds one NOT tagged
oneTime:'yes' (when skipOneTime), and that
card is attached in the card's own slot. The
oneTime cards passed over are shuffled back
into the deck.
then           what happens to the resolved card itself:
"permanent" -> this player's Permanent Cards
(needs canPermanentFromAttach), "shuffle" ->
the card's own shuffleDiscardPile/
shuffleIntoDeck behavior, "discard" -> its
deck's discard pile. It always goes last, so
a reshuffle during the reveal can't deal the
card itself back.
A card with a oneTimeEffect shows this button INSTEAD of Send
to Permanent / Shuffle Discards into Deck (those still work
for any card that has the old fields but no oneTimeEffect).
The draw-and-attach steps ride on the same Host round trip as
hostApplyDrawForAttach()/finishDrawnCardAttach().

## `//`

---- Draw when the Pok\u00e9mon is on the team (Held Item) ----------

"drawOnJoinTeam": { "deck": "Item Deck" }
When the card lands on a Pok\u00e9mon already on this player's
roster, a card is drawn from that deck straight into their
hand. When it lands on one that isn't on the roster yet (the
Wild Pok\u00e9mon in the Arena, say), the draw is recorded on the
Pok\u00e9mon itself (member.teamDrawsOwed) and paid out the moment
that Pok\u00e9mon joins the team -- caught, added by an effect, or
taken in a replace -- even if the card has been resolved and
swapped for another Nature by then. See fireOwedTeamDraws().

## `//`

---- A Nature for every Pok\u00e9mon that spawns ----------------

With Use Natures AND Use Virtual Cards both on, every Pok\u00e9mon
that spawns is dealt the top card of the Nature Deck, attached
the same way any other draw-and-attach is (see
hostApplyDrawForAttach()), and that card's on-attach effects
run (Pok\u00e9rus' Level, Held Item's draw, ...). Spawns covered:
a Wild Pok\u00e9mon sent to the Defender slot, an NPC Trainer's
Pok\u00e9mon sent out (including the next one in the line-up), a
Safari Zone / Contest Pok\u00e9mon placed in the Catch dialog,
and every Pok\u00e9mon that joins the team without having been
in the Arena first (Day Care, Egg, Fossil, pool gains, Wonder
Trade...) -- except the very first Pok\u00e9mon, the starter,
which gets its own pick of three (see attachStarterNature()).
A Pok\u00e9mon that already carries a Nature (one played onto it
from a hand, a caught Pok\u00e9mon keeping its own) never draws
another, and a Gym Leader's Pok\u00e9mon never get one. A Wild
Pok\u00e9mon sent back to the Arena is a brand new spawn, so it
draws a fresh Nature (the old one went to the discard pile
when it left).

## `// oneTime:'yes' turns up (null when the deck, reshuffle`

Host side of skipOneTime: draws until a card that isn't
oneTime:'yes' turns up (null when the deck, reshuffle
included, runs out). The passed-over cards are held aside
while drawing -- so a reshuffle can't deal them straight back
-- and only then shuffled back into the deck's draw pile.

## `// one, and hands it to whoever asked -- straight to the code that`

Host side: draws the top card of the first of `decks` that has
one, and hands it to whoever asked -- straight to the code that
attaches it for the Host's own player, or in a 'deck-draw-
attach-result' message for a guest. Never touches a hand.

## `// drawn card to the Pok\u00e9mon it was drawn for. A card for a`

The receiving end (this device's own player): attaches the
drawn card to the Pok\u00e9mon it was drawn for. A card for a
Pok\u00e9mon that's gone in the meantime goes to the discard pile
instead of vanishing; no card at all (deck empty) just says so.

## `// just above -- called only from the same #game-scroll`

Overlay's own counterpart to performAttachFromHandToSlot()
just above -- called only from the same #game-scroll
delegated listener's .game-team-slot-hit-zone branch, only
while handAttachPendingSource is 'active-card-overlay' and
only for a filled slot. No replace-confirmation path the way
Attach has one (see the chat this was decided in) -- a member
that already has an Overlay Card just isn't a valid tap
target at all right now; the player needs to Discard the
existing one (see requestOverlayDiscard()) before placing a
new one.
An Overlay Card can't go on a Pok\u00e9mon if that Pok\u00e9mon is the team's last one that's neither Fainted nor already carrying
an Overlay Card (the same "usable" test boardTeamBlackedOut() uses) -- that would black the player out.

## `// just above -- writes the card straight onto the member (purely`

Shared final step, same shape as commitAttachFromHandToMember()
just above -- writes the card straight onto the member (purely
local, no commitTeamMemberCard()/getAttachSlotForCard() here
since Overlay isn't the Attach/Nature slot pair at all), starts
its counter at getDefaultOverlayCounter() if it has one, then
resolves the shared Active Card zone the exact same way the
'active-card' branch above does -- Overlay only ever comes
from there (see beginOverlayFlow()'s own comment), so there's
no hand-sourced branch to handle here.

## `// amounts and .game-hand-card-options's own height in the CSS`

Must match .game-hand-card's own height/CSS `transform` push
amounts and .game-hand-card-options's own height in the CSS
above -- there's no clean way to share these numbers between
CSS and JS, so if any of the four change there, update these
(and the matching CSS translateY()s) to match. Two pushes
(see the chat this was split in): a smaller one while just
hovering, and a larger one once actually clicked/tapped
(.is-expanded), which is the only state that also reveals the
options list underneath, hence the larger number needing room
for it, plus one more gap the same size as the one between
the card and its own options list, so the options list isn't
flush against whatever it pushed down into:
HOVER PUSH    = HAND_CARD_HEIGHT - HAND_CARD_OVERLAP
= 335 - 45 = 290
EXPANDED PUSH = HAND_CARD_HEIGHT - HAND_CARD_OVERLAP
+ <options margin-top> + <options height>
+ <options margin-top again>
= 335 - 45 + 10 + 140 + 10 = 450
335 = 240 * (352 / 252), rounded to the nearest pixel -- the
same 252:352 card aspect ratio every card frame in this doc
uses, scaled down to 240 wide to match the Attach Card
overlay's own card size (.game-team-cards-photo's own
max-width) per the chat this was requested in. The Reward/
Shop menu items and the Permanent Card Viewer's own
.game-permanent-card-viewer-face have since been brought
in line with this same 240-wide sizing too, so this is now
the one card size used everywhere in the Game panel.

## `// reserve, past the resting stack's own height, so the LAST`

How much extra room .game-hand-stack/.game-discard-stack each
reserve, past the resting stack's own height, so the LAST
(frontmost) card's options can stay fully onscreen if that
specific card gets expanded -- <options margin-top> + <options
height> + <the extra gap below it>, same shape as EXPANDED
PUSH above minus the HAND_CARD_HEIGHT/OVERLAP part (the last
card doesn't need to push anything, there's nothing after it
to push), minus a flat 20px trimmed off the top of that total
(per the chat this was requested in) so the resting container
reads a bit tighter than the full reserved amount actually
needs. See renderDecksScreen()/renderDiscardViewer()'s own
comments for why the container is fixed to exactly this,
rather than the full worst-case EXPANDED_PUSH: an EARLIER
card being expanded instead, pushing later cards past this
fixed height, is meant to let those cards bleed off the
bottom edge (see .game-hand-stack's own overflow: hidden)
rather than growing the container to keep chasing them.

## `// block is their container's PADDING box, not its content box --`

Both stacks' cards are position:absolute, so their containing
block is their container's PADDING box, not its content box --
`top: 0` on the first card lands right at the padding's own
outer edge (flush with the border), completely ignoring the
container's own padding rather than sitting inset by it. This
is added to every card's own `top` (and to both containers'
own computed height, so the bottom-side math added for
HAND_OPTIONS_EXPAND_ROOM/DISCARD_OPTIONS_EXPAND_ROOM above
still holds) purely to recreate that missing inset space at
the top of the stack.

## `// renderDiscardViewer() (the discard-pile popup) so both read`

Shared by renderDecksScreen() (the row list) and
renderDiscardViewer() (the discard-pile popup) so both read
off one identical {drawCount, discardCount, discardTop,
discardPile} shape regardless of Host/solo (this device's own
deck store) vs guest (guestDeckStateCache, last mirrored from
the Host's own broadcastDeckState()). discardPile is the
full array, oldest first/top-of-pile last -- same "public,
everyone can see the discard pile" convention discardTop
already relied on, see broadcastDeckState()'s own comment.

## `// list and the Extra Decks list in renderDecksScreen() below,`

Builds one deck row's own markup -- shared by the main-three
list and the Extra Decks list in renderDecksScreen() below,
since both are the exact same row shape either way, just
filtered to a different subset of getDeckToolList(). info is
whatever getDeckInfoMap()[deckName] resolved to (see that
function's own comment for the {drawCount, discardCount,
discardTop, discardPile} shape, falling back to an empty one
here the same way the caller already does for a deck with no
recorded state yet).
isExtra (true for anything not in MAIN_DECK_NAMES) switches
between the two row shapes: a main deck's row is drawBtn -
info - discard thumbnail, left to right; an extra deck's row
is a stacked column since two of them now sit side by side
in the grid (see .game-deck-row--extra) -- see the chat this
was requested in. Extra decks also skip the discard
thumbnail and the "discarded" count entirely: their cards no
longer go into their own discardPile at all, only into the
Item Deck's (see discardToHostDeck()), so info.discardCount
is always 0 for them and a thumbnail would always render
empty.

DECK_GAIN_REWARD_MENU decks (Reward Item Deck) are a third,
even simpler shape on top of that: just the name and a
single "Gain Reward" button, no counts and no Shuffle/Look
at Top -- there's no shuffled drawPile behind this deck any
more for a count to describe, see openRewardMenu() for what
the button actually opens.

A locked TM tier (see isTMDeckUnlockedForActiveSave()) is a
fourth shape, checked before any of the above: name and a
"Locked" message, no buttons at all -- not even disabled
ones. The deck still shows up at all (rather than being
hidden outright) so a player without the Badge Tier yet knows
it exists and what unlocks it; there's just nothing to tap.
Every OTHER player at the table with the required Tier still
sees this exact deck's normal row (Draw/Shuffle/Look, real
counts) on their own device -- this only ever locks the row
on the device asking the question, see that function's own
comment on why.

## `// currently known -- this device's own local deck store (Host/`

Rebuilds the whole Hand & Decks screen from whatever's
currently known -- this device's own local deck store (Host/
solo) or guestDeckStateCache (guest) for the Decks list and
everyone-else's counts, and getActiveSaveData().hand for
"Your Hand" either way. Safe to call before CARDS_BY_ID has
loaded or before any deck has ever been drawn from --
everything here falls back to zero/empty rather than
throwing. Called on entering the screen (setGameScreen), and
after every local or networked state change.

## `// counter value (if cards.json gives this card a`

Thumbnail-only: also carries the card's current
counter value (if cards.json gives this card a
permanentCounters field at all -- see
cardHasPermanentCounter()'s own comment), shown
whether or not a note color was ever chosen for
it, so the dot doubles as an at-a-glance counter
readout here. Left untouched everywhere else
this class shows up (namely the Permanent Card
Viewer overlay's own #game-permanent-card-viewer-dot,
which already has its own dedicated counter row).

## `// block:'start'}) -- confirmed via logging that this`

Was permanentListEl.scrollIntoView({behavior:'smooth',
block:'start'}) -- confirmed via logging that this
choosePokemon reopen was ending up with #game-panel
(the fixed-position drawer permanentListEl lives in,
overflow:hidden purely for its own slide-in clipping)
*also* picking up a real, lasting scrollTop of its
own -- something scrollIntoView() apparently applies
to it as one of the scrollable ancestors it walks on
the way up from permanentListEl, on top of the
intended scroll on #game-scroll itself. overflow:
hidden blocks the user from scrolling it by hand, but
doesn't stop it being scrolled programmatically, and
nothing ever resets that stray offset afterward -- it
just sits there shifting everything inside #game-
panel (including #game-scroll) up by however far it
was nudged. Scrolling #game-scroll directly and
exclusively via scrollTo(), instead of walking the
ancestor chain from permanentListEl, never touches
#game-panel at all, so this doesn't happen. The
explicit scrollTop = 0 below is just a defensive
belt-and-suspenders in case anything else ever nudges
it the same way -- #game-panel is never meant to
scroll on its own, #game-scroll is the one true
scrollport, so forcing it back to 0 is always safe.

## `// Nature Card slot (see isNaturesEnabledForActiveSave()'s`

Same house rule that already gates the Team Tracker's own
Nature Card slot (see isNaturesEnabledForActiveSave()'s
own comment) -- off by default, so a save that never
opted into Nature Cards doesn't show a deck for them
either. The deck itself still exists in the underlying
store either way (see ensureDeckBuilt()) -- this only
hides the row, it doesn't stop tracking counts for it,
so nothing breaks if the rule gets flipped on mid-game.

## `// .game-hand-card CSS module comment for how the reveal-on-`

Archidekt-style overlapping stack -- see the .game-hand-stack/
.game-hand-card CSS module comment for how the reveal-on-
hover/tap actually works. Each card's resting `top` is just
its index times the overlap amount; the LAST card is the
frontmost/fully-visible one, same as the top card of a
real stack in hand. The card's own artwork already prints
its name near the top (see the chat this was simplified
in), so the sliver left showing at rest is just whatever
the art itself shows there -- no separate name bar drawn
over it.

## `// see .game-hand-stack's own CSS module comment and`

Fixed per render regardless of hover/expand state --
see .game-hand-stack's own CSS module comment and
HAND_OPTIONS_EXPAND_ROOM's comment above for why this
exact amount (resting stack height + room for the
LAST card's own options, not a full worst case) and
why a height that instead tracked whatever was
currently hovered/expanded was the actual jitter bug.

## `// requestAttachFromHand()'s own comment) rather than`

Attach hands off to the Team Tracker (see
requestAttachFromHand()'s own comment) rather than
picking a member right here -- so this options grid
is now the only view this panel ever shows, no more
second "which member?" view swapped in in its place.
Play reveals the card into the shared Active Card
zone instead of resolving it right here -- see
hostApplyPlay()'s own comment.

No Attach button here any more (see the chat this
was moved in) -- Play already reveals into the
Active Card zone, which has its own Attach button
once it's there, so a direct hand-to-Attach
shortcut was redundant with an extra step already
available rather than a genuinely separate path.
Put on Top/Bottom of Deck take its old grid slot,
plus the slot that was a disabled "Coming soon"
placeholder -- both go through requestReturnToDeck(),
landing back in the card's own real deck (see that
function's own comment) rather than its discard pile.
Sell (+2 Poké Coins) joins the first row only while
the save's Poké Coin rule is on -- see
requestSellCard(). The grid's --coins modifier
switches row 1 to three columns.

## `// darkens everything that isn't a Battle Card but`

Picker modes: Battle Card play (battleCardPlayTarget)
darkens everything that isn't a Battle Card but
leaves those cards working exactly as before; the
Attach Card picker (attachPickMode) darkens and
disables everything that can't be attached, and
gives the rest a single \"Attach to <Pok\u00e9mon>\"
option in place of the usual four.

## `// Actions that put a card in the player's hand (Poké Mart, Department Store, Gain Item, R`

---- Scroll to "Your Hand" ----
Actions that put a card in the player's hand (Poké Mart, Department Store, Gain Item, Roll For Item,
Move Tutor, ...) call requestDecksHandScroll() right before setGameScreen('decks'), or just boardShowHand().
renderDecksScreen() then lands #game-scroll on the Your Hand header in the same synchronous pass that
builds the screen -- before the panel has slid into view, and with behavior 'instant', so there is no
visible scrolling. The request stays live for a moment so a re-render (a guest's draw coming back from the
Host, say) lands on the Hand again, and any touch, wheel or key press from the player cancels it.

## `// in, and getActiveCardInfo()/setHostActiveCard()'s own comments`

The shared Active Card zone -- see the chat this was designed
in, and getActiveCardInfo()/setHostActiveCard()'s own comments
for the underlying state. Minimized (hidden entirely) whenever
there's nothing active, or the viewer's already Dismissed this
exact card (see dismissActiveCard()); otherwise:
- the card's own actor, while it's still pending
(!committed), gets it left-aligned with Discard/Permanent/
Shuffle/Attach (Attach only if the card itself allows it).
Permanent opens the Color swatch picker instead of
committing directly when the card needs one (see
cardNeedsNoteColor()'s own use in the click handler
further down) rather than showing a separate Color
button here;
- everyone else -- and the actor too, once it's committed
(already fully resolved via an Attach that went through --
nothing left to decide) -- gets it centered with just
Dismiss.

## `// eligible card so far actually has canAttach: "no" --`

canOverlay is unrelated to canAttach (every Overlay-
eligible card so far actually has canAttach: "no" --
see beginOverlayFlow()'s own comment on why this needs
its own entry point rather than reusing
beginAttachFlow()), so both buttons can show at once
in principle, though no card does yet.

## `// own Permanent button when the card needs one (see`

Color picker overlay -- opened from the Active Card zone's
own Permanent button when the card needs one (see
cardNeedsNoteColor()) -- populates one swatch button per
NOTE_COLORS entry fresh on every open, same "build straight
into the HTML" approach as renderShopMenu()'s own grid, since
there's no per-card state here to preserve between opens.
purpose is null for the Permanent button's own use (the swatch
commits the card to Permanent), or { trainerCardId } when a
Trainer Battle card needs the space's color before its gallery
pick starts (see beginTrainerBattleCardPick()).

## `// detectSpaceColor() -> the color of the space this player's marker is standing on, or nu`

---- Space-color detection (reusable) ----
detectSpaceColor() -> the color of the space this player's marker is standing on, or null when that can't be told: no virtual map
(virtual cards only, or a TV Table / Hybrid host whose map is display-only), the marker isn't on the board yet, the space has no
color (a City), or its color isn't one the caller can use. allowed: the colors the caller accepts (default: the swatch picker's own,
NOTE_COLORS -- pass e.g. BOARD_FRONTIER_COLORS' ids to accept the orange Legendary space too).
chooseSpaceColor(purpose, cardName) -> what a card that needs "the space's color" calls instead of openNoteColorPicker(purpose):
a detected color is used straight away (same result as tapping that swatch, so purpose works exactly as it does for the picker --
see noteColorChosen()); if nothing can be detected the swatch picker opens as before.

## `// #game-discard-viewer-overlay -- null while it's closed. Kept`

Which deck's pile is currently shown in
#game-discard-viewer-overlay -- null while it's closed. Kept
as its own variable (rather than reading the overlay's own
dataset back off the DOM) so renderDiscardViewer() has a
single source of truth to re-render against any time
renderDecksScreen() runs (e.g. someone else discards into
this exact deck while the viewer's open -- see the call at
the bottom of renderDecksScreen()).

## `// deck -- tapping a deck row's own discard thumbnail (see`

Opens the "look at everything in this pile" popup for one
deck -- tapping a deck row's own discard thumbnail (see
.game-deck-discard-btn in renderDecksScreen() above). Not
purely read-only: clicking/tapping a card here reveals Return
to Hand/Shuffle into Deck (see .game-discard-card-options),
same click-only reveal .game-hand-card's own options use.

## `// discardViewerDeckName currently points at -- exact same`

Rebuilds the popup's own stack for whichever deck
discardViewerDeckName currently points at -- exact same
overlapping-stack markup/behavior as "Your Hand" in
renderDecksScreen() above (see .game-discard-stack/-card's
own CSS module comment), including each card's own options
panel underneath. No-ops harmlessly if the overlay isn't
currently open, so it's safe to call unconditionally from
renderDecksScreen() any time deck state changes.

## `// rewardMenuDeckName currently points at. Unlike every other`

Rebuilds the menu's own grid for whichever deck
rewardMenuDeckName currently points at. Unlike every other
card list in this tool, every eligible card in the deck is
listed here regardless of whether anyone's ever drawn it --
there's no drawPile/discardPile behind a
DECK_GAIN_REWARD_MENU deck any more (see
hostApplyGainReward()), so "what's in this deck" just means
"every card in cards.json with this cardDeck", read straight
off CARDS_BY_ID. Sorted alphabetically by name; any
oneTime:'yes' card THIS device's own player has already
claimed (see getLocalOneTimeClaims()) is moved to the end of
that alphabetical order and rendered disabled/grayed rather
than removed, so it's still visible that it exists. No-ops
harmlessly if the overlay isn't currently open, same as
renderDiscardViewer() above, so it's safe to call
unconditionally any time local claims might have changed.

## `// shopMenuDeckName currently points at -- same "every card in`

Rebuilds the menu's own grid for whichever deck
shopMenuDeckName currently points at -- same "every card in
cards.json with this cardDeck" source as renderRewardMenu()
(no drawPile/discardPile behind a DECK_SHOP_MENU deck any
more), sorted alphabetically. Each card gets its own Buy
button (labeled with its pokeCoinCost, disabled if read-only
OR this device's own Poké Coin balance can't cover it) and
Take button (disabled only if read-only). No-ops harmlessly
if the overlay isn't currently open, same as renderRewardMenu(),
so it's safe to call any time the balance or hand might have
changed underneath it.

## `// Poké Coins?" house rule is turned on (see`

Buy only shows up at all once the save's own "Use
Poké Coins?" house rule is turned on (see
isPokeCoinsEnabledForActiveSave()) -- a save that
never opted into tracking coins has nothing for a
cost button to spend, so Take is the only option.
.game-shop-menu-item-actions--take-only switches the
grid to a single column so Take doesn't sit stranded
in a two-column layout with nothing beside it.

## `// designed in) ----`

---- Permanent Cards panel viewer (see the chat this was
designed in) ----

Which card the overlay is currently showing full-size --
an instanceId (see generatePermanentInstanceId()), not a
cardId, since the same card can appear in the panel more than
once and each copy now has its own Discard/counter state to
act on independently.

## `// Cards panel -- tapping its own thumbnail (see`

Opens the full-size viewer for one card in the Permanent
Cards panel -- tapping its own thumbnail (see
.game-permanent-card-thumb in renderDecksScreen()). Always
one of THIS device's own cards -- the panel never shows any
other player's -- so looking it up in getLocalPermanentArray()
below is always the right array to search.

## `// entry permanentCardViewerInstanceId currently points at --`

Fills in the viewer's own title/image/counter for whichever
entry permanentCardViewerInstanceId currently points at --
formatted like a single .game-shop-menu-item (card face, then
its own action panel below it), per the chat this was
designed in. Closes itself out if the entry's gone missing
(e.g. Discarded from another device, or by this same request's
own host round-trip -- see hostApplyPermanentDiscard()) rather
than showing a viewer for a card that no longer exists. No-ops
harmlessly if the overlay isn't currently open, same as
renderShopMenu().

## `// confirmPermanentPickSelection()) -- only ever set on a`

The chosen gallery token (see cardNeedsPokemonChoice()/
confirmPermanentPickSelection()) -- only ever set on a
card that needed one, but keyed off the entry's own
pokemonPick rather than the card's own flag, so this
still renders correctly even if a future edit to
cards.json removed choosePokemon from a card after the
fact.

## `// whole number, sends the actual peek request`

Reads the prompt's own number and, once it's a real positive
whole number, sends the actual peek request
(requestLookAtTopCards()) -- clamping to however many cards
the deck actually has left happens Host-side (see
hostApplyLookRequest()'s own comment), this only rejects
outright garbage (blank, zero, negative, non-numeric) with a
banner via showDecksNotice() rather than silently doing
nothing.

## `// actual peeked cards themselves -- a local SNAPSHOT (top-FIRST`

Which deck the viewer overlay is currently showing, and the
actual peeked cards themselves -- a local SNAPSHOT (top-FIRST
order -- see hostApplyLookRequest()'s own .reverse(), the
opposite convention from the hand/discard stacks, which both
render their own LAST entry as the top/frontmost one) of
whatever hostApplyLookRequest() sent back, not a live read of
the deck's current top-X the way discardViewerDeckName's own
stack tracks the live discard pile. It has to be a snapshot:
"the top X cards" stops meaning anything stable the moment
ANY of them gets acted on (moving card #2 to the top changes
what "top X" even refers to), so acting on one of them here
just removes that one entry from this local array instead of
re-deriving the whole list -- see the three action functions
below.

## `// gets a single Keep button instead of the usual three, and keeping one adds it to the ha`

'keep-one' while the viewer is showing a Department Store look (see boardUseDepartmentStore()): each card
gets a single Keep button instead of the usual three, and keeping one adds it to the hand and sends every
other peeked card to the bottom of the deck. null = the normal viewer. deckLookPendingMode is set just
before the look is requested and picked up by openDeckLookViewer() when the cards arrive (immediately for the
Host/solo, a moment later for a guest); it expires, and a manual Look at Top clears it, so a request that
never gets answered can't turn a later manual look into one of these.

## `// same overlapping-stack markup as the discard viewer's own`

Rebuilds the viewer's own stack from deckLookViewerCards --
same overlapping-stack markup as the discard viewer's own
renderDiscardViewer(), see .game-deck-look-stack's own CSS
module comment for how this differs (snapshot data, 3-button
options instead of 2). No-ops harmlessly if the overlay isn't
currently open. Unlike renderDiscardViewer(), this is never
called from renderDecksScreen() -- there's no live state to
resync against, deckLookViewerCards only ever changes via the
three action handlers below, each of which re-renders this
itself right after splicing the acted-on card out.

## `// matching network request (requestLookMoveToTop()/-ToBottom()/`

The viewer's own three per-card actions -- each fires the
matching network request (requestLookMoveToTop()/-ToBottom()/
-AddToHand()) AND removes that one card from this local
snapshot immediately rather than waiting on a round trip, same
"optimistic, Host confirms silently" trust every other deck
action here already extends to its own requester.

## `// designed in. 'unable' is also renderTeamGrid()'s own inline`

The four evolution-corner icons -- see the chat this was
designed in. 'unable' is also renderTeamGrid()'s own inline
fallback for a member found in neither POKEMON_BY_NAME nor as
an active mega/gmax override, so every filled slot always has
*some* icon here even before the pokemon-data.json fetch above
resolves.

## `// just documented here: true while the Pokémon is Dynamaxed,`

member.dynamaxed -- like formOverride, not declared anywhere,
just documented here: true while the Pokémon is Dynamaxed,
falsy otherwise. Deliberately separate from formOverride --
Dynamax doesn't change the Pokémon's artwork or species, it
only swaps its Battle Arena moves for Max Moves (see
getBattleMemberMoveButtons()). Mutually exclusive with
formOverride: it's only ever offered while none is active,
and every path that sets one clears the other. Cleared by
fainting, a real stage evolution, being caught out of the
wild, tapping the (active) Evolution corner, and -- when
virtual decks are on -- the Dynamax Band leaving the
Permanent zone (see reconcileDynamaxWithPermanent()).

## `// Pokémon can, unless it's fainted, already Dynamaxed, or in a`

Whether this member may newly Dynamax right now. Every
Pokémon can, unless it's fainted, already Dynamaxed, or in a
Mega/Gigantamax/legendary form. The Wild Pokémon has no
Band to check. For a real team member: with virtual decks
on, a Dynamax Band has to be in the Permanent zone; with
them off this app can't see the cards, so it's always
offered and evolutionReminderHtml() covers the requirement.

## `// and no Dynamax Band is in the Permanent zone any more. Called`

Ends Dynamax on every team member when virtual decks are on
and no Dynamax Band is in the Permanent zone any more. Called
from persistLocalPermanent() (every local Permanent change --
host add/discard and each guest sync message) and when the
virtual decks setting itself changes. Each cleared member
goes through persistTeamSlotChange() so it saves, repaints,
and re-syncs the Battle Arena slot it may be sitting in.
Doesn't touch the Wild Pokémon (it never needs a Band).

## `// opt-in third evolution mechanic, alongside evolve_cost/`

baseEntry.legendary_evolve -- a pokemon-data.json entry's own
opt-in third evolution mechanic, alongside evolve_cost/
evolves_to and mega_forms/gmax_forms above. Shape:
{
gated: true|false,
reverts: true|false,
targets: {
"<evolves_to-style target name>": {
cardId: "<cards.json id>",
iconId: "<unique badge icon id, informational only>",
iconUrl: "<unique badge icon, used in place of the
shared EVOLUTION_MODE_IMAGES.evolve/mega/
gmax art>",
},
...
},
}
gated:true means a target only ever qualifies while
member.attachCardId equals that target's own cardId (see
getTeamEvolutionOptions()'s own 'legendary' branch) --
gated:false (Kubfu today) means every target always qualifies
regardless of attachCardId, since that mechanic is "play and
discard the card" rather than "keep it attached," which this
app has no state for; evolutionReminderHtml() covers
that gap with reminder text instead of a real gate.
reverts:true means evolving sets member.formOverride the same
way Mega/Gigantamax do (temporary, art-only, species stays
member.name) and clears itself automatically the moment
member.attachCardId stops matching that target's own cardId
(see reconcileLegendaryEvolutionOnCardChange()) -- tapping the
corner badge or the detail view's own indicator while active
does NOT revert it early, unlike Mega/Gigantamax's own tap-to-
revert (see computeTeamEvolutionState()'s 'active-legendary'
branch and handleTeamDetailEvolutionTypeTap()'s 'active-
legendary' sentinel category). reverts:false means evolving is
a genuine permanent species change instead (member.name/src/
shinysrc/dex overwritten, same as the plain 'evolve' category
-- see applyEvolutionChoice()), just gated by gated/cardId
above instead of by evolve_cost/level; Zygarde's two forms use
gated:true + reverts:false, Kubfu uses gated:false +
reverts:false. A future new entry fitting any of these three
shapes -- or in principle the fourth, gated:false + reverts:true,
though nothing uses it today -- just needs this block added,
no logic changes anywhere in this doc.

## `// plain object literals, see emptySaveScopedData()'s own`

member.formOverride -- not declared anywhere (members are
plain object literals, see emptySaveScopedData()'s own
comment), just documented here: a string naming the exact
pokemon-data.json entry currently showing in place of the
member's own art (e.g. "Mega Charizard X" or "G-Max
Charizard"), or undefined/null for "not toggled on" -- set by
confirmTeamEvolutionSelection()'s 'mega'/'gmax' branch,
cleared by the #game-scroll delegated listener's own
.game-team-slot-evolution branch (immediate revert) or by
confirmTeamEvolutionSelection()'s 'evolve' branch (a genuine
stage evolution invalidates whatever override was naming the
old species). Deliberately its own field rather than folded
into member.name/src the way a real stage evolution overwrites
those -- Mega/Gigantamax don't change what species this member
actually is (member.name stays the source of truth for future
evolve/mega/gmax eligibility -- see computeTeamEvolutionState()
below), they just swap the displayed art until toggled back
off. renderTeamGrid()'s own img.src logic checks this before
falling back to member.src/shinysrc.

## `// team member, entirely from that member's own name/level plus`

Figures out what the evolution corner should show/do for one
team member, entirely from that member's own name/level plus
POKEMON_BY_NAME -- called fresh every render rather than
cached on the member, so a level change or a fetch resolving
late is always reflected immediately.

Returns { mode, icons } where mode is one of:
'unable'      -- nothing available; tapping the corner no-ops.
'available'   -- at least one of stage evolution/Mega
Evolution/Gigantamax/legendary_evolve
currently applies; tapping opens the
picker/confirm, which lists every one of
them that does (see openTeamEvolutionOverlay()).
'active-mega' -- already Mega Evolved (member.formOverride is
set to a mega form); tapping reverts
immediately, no overlay.
'active-gmax' -- already Gigantamaxed; same immediate-revert
behavior as 'active-mega'.
'active-dynamax' -- Dynamaxed (member.dynamaxed); shows
Gigantamax's active badge and reverts
immediately when tapped, no overlay.
'active-legendary' -- currently in a reverts:true
legendary_evolve form (Primal Kyogre and
the like); unlike 'active-mega'/'active-gmax',
tapping this one does NOT revert -- the
only way out is detaching the card that
got it there in the first place (see
reconcileLegendaryEvolutionOnCardChange()).

icons is the ordered list of image URLs the corner should
cycle through (see startEvolutionBadgeCycle() in the script for
the actual crossfade timing) -- every currently-applicable
type contributes its own icon here, stage evolution included
alongside Mega/Gigantamax rather than only the latter two (see
the chat this was confirmed in); length 1 whenever only one
type applies, which in practice is nearly always, since
evolves_to/evolve_cost and mega_forms/gmax_forms don't overlap
on the same species in this dataset -- only a fully-evolved
(stage3) form ever carries canmega/cangmax, and a Pokémon that
still has evolves_to ahead of it never does. Built generically
(evolve/mega/gmax each independently checked and appended) all
the same, so a future species that genuinely does have more
than one type available at once -- including stage evolution
alongside Mega/Gigantamax -- would just cycle through all of
them without this function needing to change. legendary_evolve
options are folded in the same way, just sourced from
getTeamEvolutionOptions() rather than re-deriving the same
eligibility math a second time here, since each one carries
its own unique icon (see legendary_evolve's own comment above
POKEMON_BY_NAME) rather than one shared EVOLUTION_MODE_IMAGES
entry the way evolve/mega/gmax do.

## `// Gigantamax toggle or a reverts:true legendary_evolve`

A formOverride can come from either an ordinary Mega/
Gigantamax toggle or a reverts:true legendary_evolve
(see getTeamEvolutionOptions()'s own 'legendary'
branch) -- both just set this same field, so checking
the CURRENT species' own legendary_evolve.targets for
an entry matching this override's name is what tells
the two apart.

## `// level-up and evolve normally (see the chat this was`

A fainted Pokémon can still be given a Rare Candy-style
level-up and evolve normally (see the chat this was
clarified in), but Mega Evolution/Gigantamax specifically
require the Pokémon to be conscious in the first place --
both forced false while fainted, regardless of what
mega_forms/gmax_forms says.

## `// fainted -- a fainted member with an available regular`

dimmed only ever applies to the 'unable' icon while
fainted -- a fainted member with an available regular
Evolution still shows evo_able.png at full brightness (per
the chat this was added in), and 'available'/'active-*'
above are left at their own explicit dimmed: false either
way (an active Mega/Gigantamax can't coexist with fainted
at all -- faintTeamMember() clears formOverride outright --
so that branch is moot in practice, kept false purely for
a consistent return shape).

## `// in the DOM at all -- unlike a real team member (whose corner`

Whether the Wild Pokémon's own Evolution corner should exist
in the DOM at all -- unlike a real team member (whose corner
is always present, just inert in 'unable' mode -- see
computeTeamEvolutionState()'s own comment), a Wild Pokémon's
corner is only ever built when it would house a Mega
Evolution or a Gigantamax specifically, per the chat this was
scoped in: ordinary stage evolution and legendary_evolve are
both left out even when they'd otherwise apply, since a Wild
Pokémon encounter has no equivalent concept of either one.
Mirrors computeTeamEvolutionState()'s own canMega/canGmax
math (and its own formOverride branch, for a Mega/Gigantamax
that's already active) rather than reusing that function's
combined 'available' mode outright, since that mode alone
can't say WHICH type(s) triggered it -- a Wild Pokémon that's
only eligible for ordinary evolution (or, in principle, a
legendary_evolve) would otherwise wrongly show a corner here
too. See renderBattleWildDefenderSlotBody() for the one
caller.

## `// Three hpRule modes, chosen per save at creation time (see`

---- Hit Points -----------------------------------------------
Three hpRule modes, chosen per save at creation time (see
'game-new-hp-rule-select'/'game-save-default-hp-rule' and
createSave()'s own hpRule field) -- 'standard' is also the
fallback for the in-memory unsaved session, which has no
hpRule of its own at all (see emptySaveScopedData()), and for
any other unrecognized value, so every helper below always has
a definite mode to branch on rather than needing its own
"what if this is missing" case.

member.fainted (boolean) and member.hp (number, alt1/alt2
only) aren't declared anywhere up front the way other member
fields are documented (see emptySaveScopedData()'s own
comment) -- fainted is simply absent/falsy until
faintTeamMember() first sets it true, and hp is read through
getTeamMemberHp() below rather than ever assumed present, so a
member added before a save's hpRule existed (or added under a
different hpRule than the one active now) still behaves
correctly rather than needing a migration pass.

## `// pokemon-data.json (via POKEMON_BY_NAME) -- "currently-showing`

The currently-showing form's own token_level from
pokemon-data.json (via POKEMON_BY_NAME) -- "currently-showing
form" meaning member.formOverride's own entry when a Mega/
Gigantamax is active, not always the base species, since a lot
of Mega/G-Max entries carry a token_level one higher than
their base form (see the chat this was added in). 0 if the
entry can't be found or has no token_level of its own, same
"never undefined, always a definite number" convention every
other numeric member field in this doc follows. Shared by
getTeamMemberHpMax()'s own alt2 branch below and the detail
view's own Level section (see renderTeamDetailLevelSection())
rather than each re-deriving the same lookup independently --
"the Pokémon's base level" means the same thing to both.

## `// concept of a max (see getHpRule() above for why an unrecognized`

Max HP for alt1/alt2 -- null for 'standard', which has no
concept of a max (see getHpRule() above for why an unrecognized
hpRule value always resolves to 'standard' rather than falling
through here by accident). alt2's max is the member's base
level (see getTeamMemberBaseLevel() above) plus this member's
own .game-team-slot-level value -- exactly the same "total
level" the detail view's own Level section now shows on its
own top line (see renderTeamDetailLevelSection()), regardless
of which hpRule is actually active; see
reconcileTeamMemberHpAcrossFormChange() below for how current
hp gets shifted to match whenever a Mega/Gigantamax's own
token_level difference changes this. Recomputed fresh every
call rather than cached on the member, so a level change, a
form change, or a genuine stage evolution (any of which can
change which POKEMON_BY_NAME entry applies) is always
reflected immediately.

## `// (Mega/Gigantamax activating or reverting -- see`

Called around any point member.formOverride is set or cleared
(Mega/Gigantamax activating or reverting -- see
confirmTeamEvolutionSelection()'s 'mega'/'gmax' branch and the
#game-scroll delegated listener's own active-mega/active-gmax
revert branch) so a token_level difference between a base
species and its Mega/G-Max form doesn't leave a full-health
member suddenly reading as wounded (or a wounded one suddenly
fuller) purely from toggling form, in either direction -- the
exact same "shift current hp by however much the max just
moved" idea as the level-up fix in adjustTeamMemberLevel(),
just triggered by a form change instead of a level change.
oldMax MUST be captured by the caller with
getTeamMemberHpMax() *before* actually changing
member.formOverride; this reads the new max itself off
whatever the member's state already is by the time it's
called. No-op outside alt2, while fainted (hp is being reset
fresh on the next revive regardless -- see confirmTeamRevive()
-- so there's nothing meaningful to reconcile while fainted),
or if the max didn't actually change.

minHp (default 0) floors the result -- passed as 1 specifically
when a special form is ENDING (see the delegated listener's own
active-mega/active-gmax revert branch), per the chat this was
added in: reverting Mega/Gigantamax should never drop a member
to 0 HP purely from the form ending, even if the strict shift
would land there, since fainting is only ever supposed to
happen through an explicit action (faintTeamMember(), or the
HP counter confirmed at 0) rather than as a side effect of a
form wearing off. Left at the default everywhere else (level
changes, and Mega/Gigantamax *activating*) since nothing in
that chat called for the same floor there.

## `// rather than assuming member.hp is already set, covering both a`

Current HP for alt1/alt2 -- falls back to the current max
rather than assuming member.hp is already set, covering both a
freshly-added member (see confirmTeamAddSelection(), which does
set it explicitly, but this stays correct even if that ever
drifts) and a member added under a different hpRule than the
one now active.

## `// member -- called fresh every render (and again by the`

Figures out what the HP corner should show/do for one team
member -- called fresh every render (and again by the
#game-scroll delegated listener on every tap, rather than
trusted off a stale dataset attribute) the same way
computeTeamEvolutionState() is, for the same "level/hpRule
changing underneath it should always be reflected immediately"
reason.

Returns { imageUrl, showCount, count } where showCount/count
are only meaningful for alt1/alt2 while NOT fainted (see
renderTeamGrid()'s own comment on why the count element is
only ever added to the DOM in that case at all, never just
hidden). What tapping the corner actually does isn't decided
here -- see the #game-scroll delegated listener's own
.game-team-slot-hp branch, which re-derives fainted/hpRule
itself rather than trusting a mode string, since (unlike
computeTeamEvolutionState()'s modes) the click behavior here
depends on hpRule in a way that doesn't collapse into a single
small set of cases as cleanly.

## `// refers to -- a real team member (a numeric position in the`

Resolves whichever "team-slot-shaped" thing index actually
refers to -- a real team member (a numeric position in the
active save's own team.members, same as every one of these
functions used to index directly) or, when index is the
'wild' sentinel, the standalone Wild Pokémon currently
occupying Battle Arena's Defender slot (see battleWildPokemon,
declared down in the Battle Arena section below -- forward-
referenced here the same way getActiveTeamId() forward-
references activeGuestSaveId, since neither is actually read
until well after the whole script has loaded). Every one of
the HP/Status/Level/Cards functions from here down reads its
member through this instead of indexing team.members
directly, so all four keep working completely unmodified for
a Wild Pokémon that was never added to any roster at all.

## `// Cards commit from here down -- for a real team member,`

The save-and-repaint tail shared by every HP/Status/Level/
Cards commit from here down -- for a real team member,
persists back to whichever save is active and repaints Team
Tracker's grid, exactly the "persistGameSaves()/
persistGameGuestSaves() + markUnsavedProgressChanged() +
renderTeamGrid()" block each of them used to spell out
individually. For the 'wild' sentinel there's no save to
write back to at all -- the Wild Pokémon is pure in-memory
state for the current battle, never persisted -- so this just
repaints Battle Arena's Defender slot instead (see
renderBattleDefenderSlot()'s own 'wild' branch).

## `// getTeamSlotMember()/persistTeamSlotChange() above actually`

Turns a badge's raw dataset.index string back into whatever
getTeamSlotMember()/persistTeamSlotChange() above actually
expect -- the 'wild' sentinel verbatim, or a real roster
position via Number() same as every one of these reads used
to do inline. Used by the #game-scroll delegated listener's
own HP/Cards/Status/Level branches further down, the only
places a dataset.index string ever needs this conversion at
all.

## `// every path that can cause it (Standard's direct tap,`

The one place a member actually becomes fainted, called from
every path that can cause it (Standard's direct tap,
confirmTeamHpSelection()'s "confirmed at 0" branch) so all
three hpRules apply the exact same shared Fainted-state effects
described in the chat this was built in: status conditions
clear outright (revert to No Status, same as a manual
confirmTeamStatusSelection('none') pick) and any active
Mega/Gigantamax override ends -- both permanently, per that
same conversation ("Status conditions and temporary evolutions
do not return" on revive), so there's nothing further for
confirmTeamRevive() below to restore later.

## `// clears fainted and, for alt1/alt2, resets hp back to a fresh`

The one place a member actually leaves the Fainted state --
clears fainted and, for alt1/alt2, resets hp back to a fresh
max (see getTeamMemberHpMax() above), per "When a Pokémon
leaves the Fainted state, it should reset to its own hit
point max" from the chat this was built in. Deliberately does
NOT restore member.status/.formOverride -- those were already
cleared for good back in faintTeamMember(), not merely
hidden, so there's nothing here to bring back even if it
wanted to. Shared by every path that can revive a member now
(the corner badge's own Yes/No confirm below, and the detail
view's icon tap/+ half -- see handleTeamDetailHpIconTap()/
adjustTeamDetailHp()) rather than duplicated per caller, since
unlike faintTeamMember() reaching this from different
triggers, there's no per-caller nuance here worth keeping
independent -- reviving is reviving no matter which screen
asked for it. No-op if the member isn't actually fainted, same
defensive shape as faintTeamMember()'s own already-fainted
guard.

## `// trio (see its own comment), just without the hasCounter/`

Mirrors renderTeamDetailHpSection()'s icon/counter/status-text
trio (see its own comment), just without the hasCounter/
top-centered/revive-via-icon pieces that helper needs: this
overlay never opens under 'standard' at all (see
openTeamHpOverlay()'s own guard), so the counter's never
hidden here, and it never opens on an already-Fainted member
either (the corner badge always routes those to the plain
Yes/No revive confirm instead -- see the #game-scroll
delegated listener's own .game-team-slot-hp branch), so unlike
that column there's no revive case for the icon to handle:
"Fainted" here only ever means "the counter's been run down to
0 in this session," purely a preview of what Confirm would do,
derived straight from pendingTeamHpValue rather than tracked
as its own separate flag.

## `// got clicked (see the overlay's own click listener further`

delta is +1 or -1, from whichever half of .game-team-hp-counter
got clicked (see the overlay's own click listener further
down) -- clamped 0 to this member's own current max, re-read
fresh each time rather than cached when the overlay opened, in
case something else changed the member's level while it's open
(shouldn't normally happen given the overlay is modal, but
costs nothing to stay correct if it ever does).

## `// routes straight into faintTeamMember() instead of ever writing`

The HP counter prompt's own Confirm. A confirmed value of 0
routes straight into faintTeamMember() instead of ever writing
member.hp = 0 and leaving the member alive at zero -- per "When
the counter is at 0 and the user confirms... the Pokémon
should switch to the Fainted state" from the chat this was
built in. Anything above 0 just writes the value back.

## `// member.attachCardId/.natureCardId (see confirmTeamAddSelection()'s`

---- Attach / Nature Cards -------------------------------------
member.attachCardId/.natureCardId (see confirmTeamAddSelection()'s
own comment) each hold either a CARDS_BY_ID key or null.
'empty' is the only placeholder left now that real card art
drives the badge (see cardIconFor() below) -- 'filled' is just
the fallback for a card whose data hasn't loaded yet (or was
removed from cards.json) but is still equipped by id.

## `// fallback used by cardIconFor() below, consumed by`

Per-cardType illustration-box position for the auto-crop
fallback used by cardIconFor() below, consumed by
cropIconMarkup() -- 'size' is the zoom factor
(fullCardDimension / illustrationBoxDimension for both axes)
and 'position' centers that box in view, same meaning as CSS
background-size/background-position even though these actually
render as a real <img> now (see cropIconMarkup()'s own comment
for why). Item and Event share one entry since their box sits
in the same spot on both templates; Nature's box sits in the
bottom half instead. 'default' covers any cardType that shows
up before it gets its own entry here.

'size' MUST stay in a unit relative to the badge itself (%) --
not px. .game-team-slot-cards-img's own box scales fluidly
with the screen (.game-team-grid's 1fr columns, all the way
down), so a fixed px size drifts out of sync with it: the same
95px meant a ~2.2x zoom against a 43px-wide badge on a wide
desktop panel, but a *larger* zoom against whatever smaller
width that same badge renders at on a narrower one, since only
one side of that ratio was actually scaling. A %-based size
scales together with the badge at any width instead, so the
effective zoom stays constant everywhere. 'position' was
already % and needed no change -- only 'size' had this
problem, since it's the one value being compared against the
badge's own (variable) width/height.

Tune by opening a real card image, measuring the illustration
box's pixel rect against the full image's own pixel
dimensions, and converting to a percentage from that -- not by
eyeballing a fixed px number against any one on-screen render,
which is exactly what drifted here.

## `// show on the corner badge, as { url, crop }. 'crop' is null when`

Resolves a single equipped card id to the small icon it should
show on the corner badge, as { url, crop }. 'crop' is null when
url is meant to be used as-is (a real cards.json iconUrl, or
one of the CARD_SLOT_IMAGES fallbacks) -- otherwise it's the
{ size, position } pair from ICON_CROP_BY_CARD_TYPE above,
telling the renderer (see cropIconMarkup()) to show url as a
zoomed/panned crop instead of a plain <img>, cropping in on
just the illustration box rather than squishing the whole
card into a tiny circle.

"placeholder" is cards.json's own literal sentinel value for
"no custom icon assigned" (every entry has it as of the chat
this was migrated in) -- treated the same as iconUrl being
absent entirely, falling through to the auto-crop of imageUrl.
A small handful of cards (e.g. Berry, whose illustration box
has ten separate berries arranged in two rows -- fine at card
size, too busy once cropped down to icon size) get a real,
separately-hosted iconUrl instead; those skip the crop
entirely and render as a plain image, same as before.

Falls back to the generic 'filled' placeholder (uncropped) if
the card itself can't be found at all (data still loading, or
the id no longer exists in the JSON). Returns null only for
"no card equipped," which is what tells computeTeamCardsState()
below there's nothing to show for that slot.

## `// the call site in the team-grid render loop) into the actual`

Turns one { url, crop } image (crop guaranteed non-null -- see
the call site in the team-grid render loop) into the actual
wrapper + oversized <img> markup that crops it down to just
the illustration box.

crop.size/crop.position stay in the exact same format the old
background-size/background-position approach used (e.g.
"220.9% 309.3%" / "50% 19.5%") -- this just reproduces the
standard CSS background-position formula by hand:
offset = (containerSize - imageSize) x (percentage / 100)
using calc() to mix the container's own %-based size with
crop.size's own length (works with any valid CSS length or
percentage here, though see ICON_CROP_BY_CARD_TYPE's own
comment for why 'size' specifically has to stay a % in
practice against this particular badge), and a plain unitless
number for the percentage (CSS calc() can't multiply two
%/length values together, only a length/percentage by a bare
number, which is why position gets divided down to a 0-1
fraction here rather than staying a "19.5%" string).

## `// designed in. naturesEnabled gates whether the Nature slot is`

One badge covers both slots at once -- see the chat this was
designed in. naturesEnabled gates whether the Nature slot is
even consulted here, same as it gates the picker's own Nature
section (see renderTeamCardsOverlay()) -- a save with Natures
off should never show a pill just because a stray
natureCardId happened to survive on old data.

pill is only true when BOTH an Attach and a Nature icon would
otherwise show at once -- one equipped card (of either type)
still gets the plain single-icon circle, same shape as the
old "filled" placeholder always used. Two icons is the one
case that actually needs the taller pill shape to have room
for both, stacked vertically and growing upward from the
same bottom-right anchor (see .game-team-slot-cards.pill in
the CSS).

attachIcon/natureIcon are cardIconFor()'s { url, crop } shape
(or null) -- each image in the returned array keeps its own
crop alongside url/alt so the renderer (see the cardsBadge
markup below) knows whether to draw it as a plain <img> or a
cropped background div. CARD_SLOT_IMAGES.empty has no crop of
its own since it's a generic placeholder icon, not card art.

count is member.attachCounter, but only ever on the image
that's actually the Attach icon, and only when that card has
an itemCounters field at all (cardHasItemCounter()) -- null on
every other image (Nature never has one). The single-icon
case compares singleIcon against attachIcon by reference
(cardIconFor() returns a fresh object each call, so this only
works because both come from the very same attachIcon
variable here, never two separate calls) to tell whether the
one icon showing is actually the Attach one before attaching
a count to it.

## `// currently has its own "pick a card" accordion open, and which`

Which member the overlay is open for, which slot (if either)
currently has its own "pick a card" accordion open, and which
of that accordion's own categories are currently expanded --
all three mirror the details panel's own teamDetailIndex/
teamDetailCardsAddingSlot/teamDetailCardsExpandedDecks trio now
that this overlay commits each change immediately too (see the
chat this was unified in) rather than staging both slots'
picks behind a single Confirm. teamCardsOverlayAddingSlot is
null whenever neither slot's accordion is open;
teamCardsOverlayExpandedDecks is shared between the two slots
rather than kept separately per slot, since only one of them
is ever actually showing an accordion at a time anyway.

## `// shared by both places a card can be picked from now (this`

Sets or clears a member's Attach/Nature Card, immediately --
shared by both places a card can be picked from now (this
overlay's own selectTeamCardsOverlayOption()/
removeTeamCardsOverlayCard() and the details panel's own
selectTeamDetailCardOption()/removeTeamDetailCard()), since
committing a card change means the same three things either
way: write it to the member, reconcile a legendary evolution
if the Attach Card slot is the one that changed (see
reconcileLegendaryEvolutionOnCardChange() below -- Nature
Card never touches this, but running it unconditionally for
'attach' costs nothing and keeps this one function correct
for both slots rather than branching per caller), and persist/
refresh the main grid. cardId is a real CARDS_BY_ID key
to equip one or null to remove it. Callers are still
responsible for their own read-only/replace-mode/release-mode
guards and re-rendering whichever of their own sections needs
it afterward -- this only touches the member/save data and the
main grid.

## `// card with no itemCounters field at all, same as`

Resets to the new card's own starting value (0 for a
card with no itemCounters field at all, same as
clearing the slot outright) every time this changes --
same "always re-derive on equip/remove, never carry a
stale count from the previous card" rule as
commitOverlayToMember()/requestOverlayDiscard()'s own
overlayCounter handling.

## `// equipped on switches to its shiny art. One-way -- removing`

forceShiny card (see cardForcesShiny()): the Pok\u00e9mon it's
equipped on switches to its shiny art. One-way -- removing
the card later doesn't switch it back. Display code already
falls back to the regular art for a Pok\u00e9mon with no shiny
form (see hasShinyForm()), so nothing to check here.

## `// value by delta (+1/-1), clamped to 0 same as`

Adjusts the currently-equipped Attach Card's own itemCounters
value by delta (+1/-1), clamped to 0 same as
requestOverlayCounterAdjust()/requestTeamDetailOverlayCounterAdjust()'s
own rule. Shared by both places this counter can be tapped
from -- the corner badge's own Team Cards overlay and the
details panel's Attach Card section -- taking index as a
plain parameter rather than being duplicated per context,
same "single write function, caller supplies its own index"
shape as commitTeamMemberCard() above. Only re-renders
whichever of the two panels is actually showing this member
(each guarded separately, since either, both, or neither
could be true depending on which context called this) plus
the roster grid's own badge either way.

## `// panel's own Attach Card/Nature Card sections`

this overlay (renderTeamCardsOverlay() below) and the details
panel's own Attach Card/Nature Card sections
(renderTeamDetailCardsSection()), since both now show the
exact same three states per slot (see the chat this was
unified in):
a card equipped -- just its own artwork, blown up via
.game-team-cards-photo (tapping it opens
openTeamCardImageViewer()), a Counter row (only for the
Attach slot, and only when that card has its own
itemCounters field -- see cardHasItemCounter(), same
"field presence" gate as the Permanent/Overlay viewers'
own counters), Remove Card underneath. Always shown
regardless of the virtual decks setting -- taking a card
off is never restricted, only putting a new one on (see
the next state's own comment).
no card, not currently picking -- emptyText, plus Add Card
underneath, but ONLY when this save has virtual decks
off. A save using the paper cards has no hand/discard/
deck bookkeeping to keep honest, so picking a card
directly here is fine; a save actually using virtual
decks has real inventory behind every card, so the only
way to put a NEW card on becomes attaching one from the
Hand & Decks screen itself (see the chat this was
reworked in) -- hidden entirely here rather than shown
disabled, so there's nothing pointing back at a picker
this state doesn't offer.
no card, addingSlot === slot -- groupCardsForSlotByDeck(slot)'s
own collapsible categories (see the chat this was chosen
over a flat/grouped dropdown in, after comparing both side
by side) plus Cancel, in place of the message+Add Card.
expandedDecks is the caller's own Set of which categories
are currently open -- Attach and Nature share one within
the same context (corner badge vs details panel) rather
than each getting their own, since only one slot's own
accordion is ever actually showing at a time anyway. Only
reachable when virtual decks is off in the first place
(see the previous state's own comment -- there's no Add
Card button to open it from otherwise), so every option
here is always selectable.
Only builds the innerHTML -- doesn't attach any listeners
itself; each caller's own delegated click/change listener
reads data-slot off whatever got rendered here and calls its
own open/cancel/select/remove/toggle functions. The counter
row's own increment/decrement is the one exception -- it
needs to know WHICH member to act on, which neither caller's
data-slot convention carries, so each one's own listener
matches on the counter's own id (elId + '-counter', see
below) instead and calls requestAttachCounterAdjust() with
its own already-known index (teamCardsOverlayIndex or
teamDetailIndex) directly.

counterValue is a number (the count to show) only when this
is the Attach slot AND the equipped card actually has one --
both callers already work this out via cardHasItemCounter()
before calling in (see renderTeamCardsOverlay()/
renderTeamDetailCardsSection()), same as computeTeamCardsState()
does for the corner badge's own count. null/undefined (Nature,
or an Attach card with no itemCounters field) skips the row
entirely.

## `// already-committed attachCardId/natureCardId -- called on open`

Rebuilds both slots' own panels from the member's actual,
already-committed attachCardId/natureCardId -- called on open
and again after every add/remove (see
selectTeamCardsOverlayOption()/removeTeamCardsOverlayCard()/
openTeamCardsOverlayAdd()/cancelTeamCardsOverlayAdd() below),
same "no pending state, just re-render off the real data"
shape as renderTeamDetailCardsSection(). Safe to call with the
overlay closed (teamCardsOverlayIndex null) -- the
naturesEnabled settings listener does exactly that -- member
just comes back null and both panels render their empty
state.

## `// Nature Cards?" field on the save-creation form and Default`

Nature Cards are an optional house rule (see the "Use
Nature Cards?" field on the save-creation form and Default
Save Settings card) -- when a save has them switched off,
hide the whole section rather than just leaving it empty.
Also drops a stray adding-state left open for 'nature' if
the save's rules changed underneath this overlay -- there'd
be nothing valid to render if it stayed.

## `// place of the empty-state message, nothing committed yet. Fresh`

Add Card tap -- just reveals that slot's own accordion in
place of the empty-state message, nothing committed yet. Fresh
(all-collapsed) every time, rather than remembering whatever
was expanded the last time this slot's Add Card was tapped.
The button itself is only ever rendered when virtual decks is
off (see renderTeamCardSlotPanel()'s own comment), so this
guard is just defensive belt-and-suspenders in case that ever
goes stale. Same shape as openTeamDetailCardAdd().

## `// only reachable at all when this save has virtual decks off`

A card tapped from within the accordion's own expanded body --
only reachable at all when this save has virtual decks off
(see renderTeamCardSlotPanel()'s own comment on Add Card being
hidden entirely otherwise), so there's no hand/discard/deck
sourcing to do here any more -- just commits straight through.
The slot is always empty when this accordion is showing (see
that same comment), so there's never an outgoing card here to
discard either. Same shape as selectTeamDetailCardOption().

## `// to e.g. "Primal Kyogre") only stays active while`

A reverts:true legendary_evolve form (member.formOverride set
to e.g. "Primal Kyogre") only stays active while
member.attachCardId still matches that specific target's own
cardId -- called right after attachCardId changes (from
commitTeamMemberCard() above, the only place it ever does) to
undo the transformation the instant that stops being true,
whether the card was removed outright or swapped for a
different one. No-ops for a formOverride that isn't a
legendary form at all (an active Mega/Gigantamax has nothing
to do with attach cards) or one whose own required card is
still attached. Mirrors the #game-scroll delegated listener's
own 'active-mega'/'active-gmax' revert -- same oldMax-before/
minHp=1 reconciliation, just triggered by a card change
instead of a tap.

## `// 'placeholder' for all of them for now (see statusImageMarkup()`

The seven classic status conditions -- imageUrl is
'placeholder' for all of them for now (see statusImageMarkup()
below, mirroring badgeImageMarkup()'s exact convention), one
real URL to swap in per condition once art exists for it (see
the chat this was decided in). Order here is also the order
they're listed in openTeamStatusOverlay()'s own picker.

## `// when the member has no status set, and as the first (default-`

"No Status" -- shown both as a filled slot's own status corner
when the member has no status set, and as the first (default-
selected) entry in the picker list itself (see
openTeamStatusOverlay()'s own template literal, which
prepends this to STATUS_CONDITIONS rather than keeping a
separate "No Status" button alongside Cancel the way this
used to work). Kept as its own constant rather than folded
into STATUS_CONDITIONS since it isn't a real status condition
-- it's the absence of one -- and STATUS_COUNTER_CONFIG below
deliberately has no entry for its 'none' id as a result.

## `// widget, both here (see openTeamStatusOverlay()/`

Per-status counter range for the Status column's own counter
widget, both here (see openTeamStatusOverlay()/
renderTeamStatusDisplay() and .game-team-detail-status-counter's
own CSS comment) and in the detail pane (see
renderTeamDetailStatusSection()) -- only the four statuses
listed here get a counter at all; anything else (including
'none') hides that section entirely. default is its own field
rather than reusing min, so where the counter resets to on a
fresh selection can be set independently of how low it's
allowed to go afterward -- all four currently reset to their
own min, but don't have to.
faintAtMax marks the three conditions where running the
counter all the way up is what faints the member (Burned/
Poisoned at their 4th counter, Cursed at its 2nd) -- see
adjustTeamDetailStatusCounter() and confirmTeamStatusSelection(),
the two places a counter actually gets written to a member,
for where this is checked. clearAtMin is Sleep's own mirror
of that idea at the other end of its range -- counting all
the way down to 0 wakes the member up (status reverts to
'none') instead of ever sitting at a committed 0, same two
call sites. No status currently sets both flags, but nothing
stops one from doing so if a future condition needs it.

## `// *card* (the full rules card shown automatically below the`

Which cards.json id each STATUS_CONDITIONS entry's own status
*card* (the full rules card shown automatically below the
Status column whenever it's active -- see
updateTeamDetailStatusCardVisibility() below -- distinct
from STATUS_CONDITIONS' own small badge/picker icon art above)
corresponds to. Five of the seven are a single card each; the
other two (Paralyzed, Sleep) are two-sided -- see
STATUS_TWO_SIDED and statusCardIdFor() just below for how a
member's own statusCardSide picks between a pair's two ids.

## `// one -- true here is what both gates showing the Status card`

The two STATUS_CARD_IDS entries with a pair of ids instead of
one -- true here is what both gates showing the Status card
panel's own Flip Card button (see renderTeamDetailStatusCard()/
renderTeamStatusCard() below) and what tells every place that
just committed a fresh status onto a member
(confirmTeamStatusSelection(), commitTeamDetailStatus())
whether to give it a fresh statusCardSide of 1 at all,
mirroring how STATUS_COUNTER_CONFIG already gates statusCounter
the same way.

## `// for anything not in STATUS_TWO_SIDED -- see its own comment)`

Resolves a member's status + statusCardSide (1 or 2, meaningless
for anything not in STATUS_TWO_SIDED -- see its own comment)
down to the actual cards.json id to look up in CARDS_BY_ID.
Returns null for 'none'/null (no card at all) or for any status
id STATUS_CARD_IDS doesn't recognize, same "absent, not just
hidden-and-empty" convention as everywhere else here.

## `// STATUS_CONDITIONS id, plus whatever the counter/card side (if`

The picker's own in-progress choice -- 'none' or a
STATUS_CONDITIONS id, plus whatever the counter/card side (if
applicable) is currently dialed to. Nothing here touches the
member itself until confirmTeamStatusSelection() actually
commits it -- Cancel just discards these three and closes,
same "pick freely, only Confirm writes it back" shape as
pendingTeamHpIndex/-Value has for the HP counter prompt.

## `// choice, and the live status-card panel to match (see`

Paints the icon/counter/name for the picker's current pending
choice, and the live status-card panel to match (see
renderTeamStatusCard() just below) -- called on open and again
every time the pending choice or its counter/side changes, so
this always reflects pendingTeamStatusId/-Counter/-CardSide
rather than the member's own still-uncommitted-to status.

## `// status id is currently pending -- shared by`

Paints (or hides) the live status-card panel for whichever
status id is currently pending -- shared by
renderTeamStatusDisplay() above and flipTeamStatusCard() below
so the two can never drift out of sync with each other's art.
Looks the card up fresh from CARDS_BY_ID every time
(statusCardIdFor()) rather than caching it, same "always the
live source of truth" convention every other CARDS_BY_ID
lookup in this doc already follows. Flip Card only ever shows
for STATUS_TWO_SIDED's own two entries (Paralyzed, Sleep) --
anything else has just the one card and nothing to flip to.

## `// the half's latest Status roll over the card art as a bare`

Shows (or hides) the overlay's Roll Status Die button, and puts
the half's latest Status roll over the card art as a bare
number. The button rolls a d4 (rollBattleStatusDie(): same
permission rule as the Arena's rolls, Host does the roll in a
lobby), and the result is shared and listed on the Arena as
its own "Status" roll type. It isn't part of the Attack
calculation. Repainted whenever the pending status changes and
whenever the Arena's dice do (see the end of
renderBattleDice()), which also covers a roll's result coming
back from the Host.

## `// time rather than once up front, since which member (and`

Builds the picker and paints the pending choice fresh every
time rather than once up front, since which member (and
therefore which status is already selected, if any) this is
for changes on every open. Opens already pointed at the
member's own current status/counter/side, same "resume rather
than reset" starting point the older single-tap version of
this overlay had, and the same "or NO_STATUS_PLACEHOLDER for a
member with no status set" default that's always given.

## `// a single tap on any button in the options list (see the`

Switches the picker's own pending choice -- called directly by
a single tap on any button in the options list (see the
overlay's own click listener further down), including
NO_STATUS_PLACEHOLDER's 'none' entry same as any real
condition. Resumes the member's own already-set count/side if
this is a tap back onto their own current status, rather than
always snapping to that status's own default/side-1 -- same
"don't make re-selecting your own status look like it reset
something" reasoning openTeamStatusOverlay() above already
follows on a fresh open. Any other status starts fresh at its
own default count and side 1, since there's no "real" count or
side to restore for a status the member doesn't currently
have.

## `// .game-team-detail-status-counter got clicked (see the`

delta is +1 or -1, from whichever half of
.game-team-detail-status-counter got clicked (see the
overlay's own click listener). No-ops if the pending status
doesn't take a counter at all -- shouldn't be reachable since
the counter is hidden in that case, but guards anyway rather
than let it silently drift on a status it doesn't apply to.

## `// writes pendingTeamStatusId/-Counter/-CardSide back to the`

The picker's own Confirm -- the only thing that actually
writes pendingTeamStatusId/-Counter/-CardSide back to the
member (see pendingTeamStatusId's own comment). 'none' maps
back to null the same way the old "No Status" button's
setTeamMemberStatus(null) call did. statusCounter/statusCardSide
are only ever set for a status that actually takes one --
left undefined otherwise rather than carrying a stale value
around for a status it no longer applies to.

## `// status's faintAtMax ceiling (Burned/Poisoned's 4th, Cursed's`

Confirming with the counter already dialed up to that
status's faintAtMax ceiling (Burned/Poisoned's 4th, Cursed's
2nd -- see STATUS_COUNTER_CONFIG's own comment) faints the
member outright instead of ever writing that status/count
combination onto them -- faintTeamMember() already clears
status/statusCounter/statusCardSide itself, so there's
nothing left here to set.

## `// local, uncommitted flip of pendingTeamStatusCardSide, same`

The status card panel's own Flip Card button -- always a
local, uncommitted flip of pendingTeamStatusCardSide, same
"pick freely, only Confirm writes it back" shape every other
pending field on this overlay already follows; nothing here
ever touches the member directly, unlike the detail pane's own
flipTeamDetailStatusCard() (which has no pending/Confirm step
to stage behind). Only reachable at all while Flip Card itself
is showing, which is already gated to STATUS_TWO_SIDED's own
two statuses.

## `// go out of range, since the two halves of .game-team-slot-level`

delta is +1 or -1 -- clamped to 0-6 rather than left to wrap or
go out of range, since the two halves of .game-team-slot-level
(see the #game-scroll delegated listener below) call this
unconditionally regardless of the member's current level.

Also carries alt2's own HP-growth rule (see getTeamMemberHpMax()
for how a level factors into that hpRule's max at all): current
hp shifts by exactly however much the max just moved, in
either direction -- a level *increase* raises current hp right
along with the new (also higher) max, so a full-health member
stays full instead of silently falling a point behind (which
is exactly what happened before this was fixed -- see the chat
this was corrected in: gating the raise on "was already
missing hp" meant a full-health member never got topped up on
its first level-up, after which it WAS missing hp and every
subsequent level-up only ever closed that same permanent
1-point gap instead of the fresh one it just opened, so it
compounded instead of catching up). A level *decrease* shifts
hp back down by the same amount rather than only reclamping if
it would exceed the new lower max, for the same
no-free-healing/no-free-damage symmetry reasoning as
reconcileTeamMemberHpAcrossFormChange() below, which this
shares its exact formula with.

## `// { category: 'evolve'|'mega'|'gmax', name: <pokemon-data.json`

The full list of choices the picker is currently showing, each
{ category: 'evolve'|'mega'|'gmax', name: <pokemon-data.json
entry name> } -- rebuilt fresh every open by
openTeamEvolutionOverlay() from that member's own base entry,
never mutated afterward. selectTeamEvolutionOption() only ever
changes which single one of these is "active" (pendingTeam
EvolutionChoice), never this list itself.

## `// choice -- used by both the corner badge's own single-option`

Shared "Evolve into"/"Mega Evolve into"/etc. verb for a single
choice -- used by both the corner badge's own single-option
preview line and the detail view's own (see
renderTeamEvolutionOptions()/renderTeamDetailEvolutionPicker()
below), rather than keeping two copies of the same ternary in
sync by hand. legendary choices read as "Transform into" when
reverts is true (Primal Kyogre and the like -- temporary, so
"Evolve" would overstate it) and "Evolve into" when it's false
(Zygarde/Kubfu -- a real, permanent species change same as any
other evolution).

## `// this app can't actually enforce/track:`

Reminder line for an evolution choice with an item requirement
this app can't actually enforce/track:
- mega:    needs a Mega Stone attached to the member AND a
Mega Bracelet in play -- this app has no "cards in
play" state at all (only per-member attachCardId),
so neither half of that is ever actually checked.
- gmax:    needs a Dynamax Band in play -- same "no cards in
play" gap as mega above.
- legendary, gated:false (Kubfu today): needs a specific card
played and discarded rather than kept attached, so
the usual attachCardId check doesn't apply here
either -- pulls the card's own display name from
CARDS_BY_ID so it can't go stale if that card gets
renamed later.
Returns '' for anything else (gated:true legendary targets are
already enforced by the attach check itself, so a reminder
would just be noise; plain 'evolve' choices have no item
requirement to remind about at all).

## `// pendingTeamEvolutionOptions/-Choice -- called on open and again`

Redraws #game-team-evolution-options against
pendingTeamEvolutionOptions/-Choice -- called on open and again
every time the pending pick changes. Two shapes, per the chat
this was designed in: exactly one option total (regardless of
category) skips the button grid for a preview image above a
plain "Evolve into Ivysaur?"-style line, already counted as
the pick so Confirm alone finishes it; more than one draws the
full one-per-row list, grouped into category sections (only
actually labeled when more than one category is present at
once -- see .game-team-evolution-section-title's own CSS
comment). Every preview image -- single or multi-option --
shows the target's shiny art instead of its normal art when
the member evolving is itself shiny right now (same
hasShinyForm() guard renderTeamGrid() uses, so a target with
no real shiny art falls back to its normal art rather than a
broken image).

## `// team -- there's no in-play Mega Bracelet/Dynamax Band, and`

Wild Pokémon play by different rules than a player's own
team -- there's no in-play Mega Bracelet/Dynamax Band, and
nothing attached the way a Mega Stone would be, for this
app to remind the player about (see the chat this was
scoped in) -- so the reminder line is skipped outright for
the 'wild' sentinel rather than calling
evolutionReminderHtml() at all.

## `// currently available to a member -- same eligibility rules`

Builds the full list of {category, name} evolution options
currently available to a member -- same eligibility rules
computeTeamEvolutionState() uses to decide the corner badge's
own icon(s), just returned as data rather than a single
mode/icon summary. Shared by the corner badge's own combined
multi-category picker (openTeamEvolutionOverlay() below) and
the detail view's own per-type buttons/strip (see
renderTeamDetailEvolutionSection()) rather than duplicated per
caller, since the eligibility math itself is exactly the same
no matter which screen is asking.

## `// legendary_evolve's own comment above EVOLUTION_MODE_IMAGES for`

Kyogre/Groudon/etc.-style entries -- see
legendary_evolve's own comment above EVOLUTION_MODE_IMAGES for
the full shape. gated:true targets only ever appear here
while the member's own attachCardId matches that target's
specific card (see the Attach/Nature Cards section
elsewhere in this doc); gated:false (Kubfu) always
qualifies, since there's no card *attachment* this app
can check for a play-and-discard requirement -- Kubfu's
reminder text (see evolutionReminderHtml()) is
what covers that instead. reverts:true targets follow the
same fainted gate as Mega/Gigantamax above (a fainted
member can't newly transform); reverts:false targets stay
available while fainted, same as a genuine stage evolution
does, since they're a permanent species change same as
one.

## `// legendary_evolve to a member -- shared by the corner badge's`

Actually applies a chosen evolution/Mega Evolution/Gigantamax/
legendary_evolve to a member -- shared by the corner badge's
own Confirm (confirmTeamEvolutionSelection() below) and the
detail view's own per-type Confirm
(confirmTeamDetailEvolutionChoice()) rather than duplicated
per caller, since applying a choice is applying a choice no
matter which screen it came from. baseEntry is the member's
species entry *before* this call -- callers read it before
applying, same as they already have to for evolve_cost below.
'evolve' -- a genuine, permanent stage evolution: the member
BECOMES the new species (name/dex/src/shinysrc all swap to
the target entry's own, same fields confirmTeamAddSelection()
sets when a member's first added), evolve_cost comes off
the level box, and any active Mega/Gigantamax override is
cleared outright -- a form override naming the old species
("Mega Charizard X" while this member was still just
Charizard) would no longer even resolve against the new
one. In practice this path is never reached with an
override still active anyway, since 'active-mega'/
'active-gmax' revert immediately without ever opening
either picker (see the #game-scroll delegated listener) --
cleared here too regardless, as cheap insurance.
'mega'/'gmax' -- just sets member.formOverride to the chosen
form's name; the member's own species/level are untouched,
renderTeamGrid()/renderTeamDetailHeader() each pick up the
override's art on their own next render.
'legendary' -- follows the 'evolve' branch's own permanent
species-change path when choice.reverts is false (Zygarde,
Kubfu), just without an evolve_cost to deduct (these
entries never carry one -- see legendary_evolve's own
comment above EVOLUTION_MODE_IMAGES); otherwise it's
mechanically identical to 'mega'/'gmax' (formOverride
only), just gated/cleared differently -- see
reconcileLegendaryEvolutionOnCardChange() for how it comes
back off.

## `// the member now IS its new form, so this plays that form's`

Evolved (stage evolution, legendary form, Mega or Gigantamax):
the member now IS its new form, so this plays that form's
cry. (Dynamax returned above -- no form change, no cry. Both
callers -- the grid's picker and the Details view's strip --
come through here, as does a Wild Pok\u00e9mon's Mega badge.)

## `// -- see shouldShowWildEvolutionBadge()'s own comment for`

Wild Pokémon are scoped to Mega Evolution/Gigantamax only
-- see shouldShowWildEvolutionBadge()'s own comment for
why the corner itself already only ever shows for those
two types, but this filters getTeamEvolutionOptions()'s
own full list the same way regardless, as cheap insurance
against a species that happens to also carry an ordinary
evolves_to or a legendary_evolve target alongside
mega_forms/gmax_forms.

## `// while #game-team-detail-overlay is visible, same shape as`

Which slot the detail view is open for -- only meaningful
while #game-team-detail-overlay is visible, same shape as
every other pendingTeam*Index in this doc, just not named
"pending" since nothing here is a pick waiting on a Confirm
(see adjustTeamDetailHp()'s own comment on why HP edits land
immediately instead).

## `// HP/Status row is currently open -- see`

Whether the hidden 8-icon Status picker strip below the
HP/Status row is currently open -- see
toggleTeamDetailStatusPicker() below, the only thing that
ever flips this. Reset on every open/close of the detail view
itself so reopening (even for the same member) always starts
with the strip collapsed rather than remembering where it was
left.

## `// Evolution section's own row of type buttons -- null, 'evolve',`

Which evolution type's strip (if any) is expanded below the
Evolution section's own row of type buttons -- null, 'evolve',
'mega', or 'gmax'. Only one at a time, same "opening a
different one replaces whichever was open" shape as the
Status picker only ever having one thing armed.

## `// -- same {category, name} shape as pendingTeamEvolutionChoice`

The in-progress pick within whichever category strip is open
-- same {category, name} shape as pendingTeamEvolutionChoice
(the corner badge's own overlay), just scoped to
teamDetailIndex/teamDetailEvolutionCategory instead. null
while nothing's been tapped yet in a multi-option strip, or
auto-set the moment a strip with only one option opens --
same "already the pick, Confirm alone finishes it" shortcut
renderTeamEvolutionOptions() takes for the corner badge's own
overlay.

## `// teamDetailIndex's current state -- split out from`

Paints the art/name at the top of the detail view from
teamDetailIndex's current state -- split out from
openTeamDetailOverlay() so confirmTeamDetailEvolutionChoice()
can re-run it too: a genuine stage evolution or a Mega/
Gigantamax toggle both change what this member's own name/art
resolve to, so the header can't just be painted once on open
and left alone. Same "an active Mega/Gigantamax form overrides
the base species' own name/art" logic as renderTeamGrid()'s
own slot image (see its comment for the full reasoning) --
duplicated rather than shared, same independence reasoning as
everywhere else in this doc.

## `// tapping the slot's own hit-zone (see the #game-scroll`

Full-detail view for a single filled slot -- opened by
tapping the slot's own hit-zone (see the #game-scroll
delegated listener's own comment on .game-team-slot-hit-zone)
rather than any of its four corner badges. HP, Status, and
Evolution are the three of the four sections with real content
so far (see renderTeamDetailHpSection()/renderTeamDetailStatusSection()/
renderTeamDetailEvolutionSection() below) -- Items stays an
empty placeholder (see the chat this was scaffolded in) until
its own pass.

## `// -- called on open and again after every edit from this`

Redraws the HP column against teamDetailIndex's current state
-- called on open and again after every edit from this
section (adjustTeamDetailHp()/handleTeamDetailHpIconTap()),
same "always rebuilt from the live member, never trusted
stale" convention as renderTeamHpOverlayState() and its siblings.

hasCounter (whether this ruleset has any numeric HP concept
at all) is deliberately NOT computeTeamHpState()'s own
showCount -- that helper hides the counter outright the
moment a member faints, which was fine for the corner badge
(which has no revive-via-counter path to protect) but not
here: this view keeps the counter visible and frozen at 0
while Fainted under alt1/alt2, since its + half doubles as
one of the two ways to revive from here (see
adjustTeamDetailHp()'s own comment for the other, tapping the
icon). 'standard' never shows a counter at all, fainted or
not -- the icon gets centered in that case instead (see
.game-team-detail-hp-top-centered in the CSS) rather than
sitting left-justified next to empty space.

## `// own tap already covers (see the #game-scroll delegated`

Tapping the icon itself -- same two actions the corner badge's
own tap already covers (see the #game-scroll delegated
listener's own .game-team-slot-hp branch), just folded into
this screen's immediate-commit convention (see
adjustTeamDetailHp()'s own comment) instead of opening the
corner badge's separate Yes/No revive confirm on top of an
already-open overlay. Reviving is unconditional regardless of
hpRule -- alt1/alt2 can also reach it via the counter's +
half while Fainted, see adjustTeamDetailHp() below -- but
fainting via the icon is 'standard'-only, since alt1/alt2
already has its own way to reach Fainted (running the counter
down to 0) and tapping a healthy icon there is a deliberate
no-op rather than a second way to do the same thing.

## `// .game-team-detail-hp-counter got clicked (see the overlay's`

delta is +1 or -1, from whichever half of
.game-team-detail-hp-counter got clicked (see the overlay's
own click listener further down). Unlike
adjustPendingTeamHpValue()/confirmTeamHpSelection() (the old
corner-tap flow, still used by the corner badge itself), this
writes straight to the member and re-renders on every single
click -- there's no separate Confirm step to stage a pending
value against, since this detail view already *is* the
confirmed screen. No-op under 'standard' outright (no counter
to click there at all -- see renderTeamDetailHpSection()
above). While already Fainted, the - half has nothing below 0
to go to (no-op) but the + half revives (see
reviveTeamMember()) -- "add hit points" reviving a Fainted
Pokémon, the second of the two ways this screen offers
alongside tapping the icon itself (see
handleTeamDetailHpIconTap() above). While healthy, landing
exactly on 0 routes into faintTeamMember() rather than ever
leaving member.hp at 0 on a still-alive member, same "0 means
Fainted" rule the old flow enforces. Re-reads the member's
current hp/max fresh each call rather than trusting anything
cached, in case levels or forms changed elsewhere while this
overlay's been open.

## `// state -- called on open and again after every`

Redraws the Level column against teamDetailIndex's current
state -- called on open and again after every
adjustTeamDetailLevel(). No animation, no icon -- just two
plain numbers, same plain-readout treatment
adjustTeamDetailStatusCounter() settled on for its own
counter: Total Level (base level plus the counter -- see
getTeamMemberBaseLevel()/getTeamMemberHpMax()'s own comments)
in its own small pill beside the counter itself, per the chat
this was laid out in. Base level on its own isn't shown here
at all any more.

## `// .game-team-detail-level-counter got clicked (see the overlay's`

delta is +1 or -1, from whichever half of
.game-team-detail-level-counter got clicked (see the overlay's
own click listener further down). Hands off entirely to
adjustTeamMemberLevel() -- the exact same function the corner
.game-team-slot-level pill already commits through, clamp/HP-
reconciliation/persistence/renderTeamGrid() and all -- rather
than reimplementing any of that here, so leveling from this
screen can never drift out of sync with the corner badge's own
math. Only adds what's specific to this view: refreshing the
Level column itself, the HP column (a level change can shift
current/max HP under alt2 -- see adjustTeamMemberLevel()'s own
comment), and the Evolution column (a level change can cross
evolve_cost in either direction, changing whether the Evolve
button itself should be showing at all).

## `// whenever the strip is closed, or just opened and nothing's`

Which status the picker strip currently has "armed" -- null
whenever the strip is closed, or just opened and nothing's
been tapped yet. Set by the first tap on any option (see
handleTeamDetailStatusPickerTap() below); a second tap on
that SAME option is what actually commits it. Tapping a
*different* option while one is already armed just re-arms
the new one instead -- there's no partial-progress carried
over between them.

## `// column -- used both for the member's real, already-committed`

The one place that actually writes pixels into the Status
column -- used both for the member's real, already-committed
status (renderTeamDetailStatusSection()) and for an
uncommitted preview from the picker
(previewTeamDetailStatus()), so the two can never drift out
of sync with each other's visual treatment. animate wraps the
icon/counter in a quick fade-and-slide instead of snapping
instantly (see .game-team-detail-status-fade-out in the CSS)
-- left off for the very first paint when the detail view
opens (nothing to transition *from* yet) and on for every
update after that (picker preview, confirm, or a counter
+/-), per the chat this was built in.

## `// the real status is -- see updateTeamDetailStatusCardVisibility()`

The status card panel now just always tracks whatever
the real status is -- see updateTeamDetailStatusCardVisibility()
below for the actual show/hide + repaint, and its own
comment for why this is the one call site every path
that can change what's "real" (a preview arming/
unarming, a commit, fainting, etc.) all funnel through
rather than duplicating the same show/hide logic percall
site.

## `// then fade+slide back in. The rAF between paintNow() and`

Fade+slide out, swap the actual content while invisible,
then fade+slide back in. The rAF between paintNow() and
removing the class matters specifically for the counter
appearing from a display: none state (going from no
counter to one that has one) -- without it, the browser
can coalesce "display: none -> flex, still opacity: 0"
and "opacity: 0 -> 1" into a single style recalculation
and skip straight to the end state instead of actually
transitioning, since there was never a committed frame in
between for it to transition *from*. The icon (which
never toggles display, only innerHTML) doesn't strictly
need this, but it's harmless to share the same path
rather than keeping a separate one just for it.

## `// accordion open on the details panel, and which of that`

Which slot (attach/nature) currently has its "pick a card"
accordion open on the details panel, and which of that
accordion's own categories are currently expanded -- null/
empty whenever neither slot's accordion is open. Only
meaningful for a slot with no card currently equipped (see
renderTeamDetailCardsSection() below); a slot with a card
equipped shows Remove Card instead and never touches either.
teamDetailCardsExpandedDecks is shared between the two slots
rather than kept separately per slot, since only one of them
is ever actually showing an accordion at a time anyway.
Neither is reset by openTeamDetailOverlay() -- once the panel
closes teamDetailIndex itself goes back to null and nothing
reads either until they're set fresh by the next Add Card tap
anyway.

## `// Cards overlay (renderTeamCardsOverlay() above) -- same`

Interactive replica of the corner badge's own Attach/Nature
Cards overlay (renderTeamCardsOverlay() above) -- same
renderTeamCardSlotPanel() per-slot rendering, and the exact
same three states per slot (see its own comment). Called on
open (openTeamDetailOverlay()) and again after every mutation
here, same as every other detail-view section.

## `// Cards turned off" rule as the overlay's own Nature`

Same "hide the section outright when the save has Nature
Cards turned off" rule as the overlay's own Nature
section. Also drops a stray adding-state left open for
'nature' if the save's rules changed underneath this
screen -- there'd be nothing valid to render if it stayed.

## `// place of the empty-state message, nothing committed yet. Fresh`

Add Card tap -- just reveals that slot's own accordion in
place of the empty-state message, nothing committed yet. Fresh
(all-collapsed) every time, rather than remembering whatever
was expanded the last time this slot's Add Card was tapped.
The button itself is only ever rendered when virtual decks is
off (see renderTeamCardSlotPanel()'s own comment), so this
guard is just defensive belt-and-suspenders in case that ever
goes stale. Same shape as openTeamCardsOverlayAdd().

## `// just above, reusing the same teamDetailCardsAddingSlot/`

Add Overlay Card tap -- same shape as openTeamDetailCardAdd()
just above, reusing the same teamDetailCardsAddingSlot/
teamDetailCardsExpandedDecks pair with 'overlay' as the slot
value (see renderTeamDetailOverlaySection()'s own comment for
why a third dedicated pair of variables isn't needed). The
button itself is only ever rendered when virtual decks is off,
so this guard is just defensive belt-and-suspenders, same
reasoning as openTeamDetailCardAdd()'s own.

## `// stat sections (see the chat this was designed in) -- a single`

The Overlay Card row between the Pokémon's image and the
stat sections (see the chat this was designed in) -- a single
slot, unlike Attach/Nature's two, so this is its own dedicated
function rather than a third call into renderTeamCardSlotPanel()
(which assumes the attachCardId/natureCardId pair and a plain
Remove-Card button for the filled state -- Overlay's filled
state, per the chat this was reworked in, shows everything
right here inline -- image, counter (when the card has one),
Discard -- the same "no popup, just show it in place" principle
Attach/Nature's own equipped state already uses (reusing
.game-team-cards-photo for the art itself, including its
existing tap-to-enlarge behavior via data-card-id -- see the
details view's own click listener, .game-team-cards-photo
branch). The standalone Overlay Card viewer
(openOverlayCardViewer() and friends) still exists for the
roster grid's own center badge -- there's no equivalent inline
spot to put this on the grid itself, so that one still opens a
popup -- this rework only applies here, in the details view.

Three states, same as renderTeamCardSlotPanel()'s own three,
but Overlay-specific:
a card equipped -- image, counter row (only for a card with
its own overlayCounters field -- see
cardHasOverlayCounter()), Discard button. Shown regardless
of the virtual decks setting -- same "taking one off is
never restricted" reasoning as Attach/Nature's own Remove
Card.
no card, virtual decks on -- hidden entirely (the whole row,
not just a button): the only way to place one in this
setting is the Active Card zone's own Overlay button (see
beginOverlayFlow()), so there's nothing to offer here.
no card, virtual decks off -- Add Overlay Card button, or
(once tapped) groupCardsForSlotByDeck('overlay')'s own
collapsible categories plus Cancel, same accordion markup
renderTeamCardSlotPanel() builds for Attach/Nature.

## `// tapped (see the details view's own click listener). Same`

delta is +1 or -1, from whichever half of the counter got
tapped (see the details view's own click listener). Same
clamped-to-0 rule as requestOverlayCounterAdjust()'s own
(the roster grid's popup-based equivalent) -- a dedicated
function rather than reusing that one since this acts
directly on teamDetailIndex, not overlayCardViewerIndex (the
details view has no "which viewer is open" state of its own
any more now that this is inline -- see
renderTeamDetailOverlaySection()'s own comment).

## `// bookkeeping as requestOverlayDiscard()'s own (the roster`

Discard, from right here in the details view -- same
bookkeeping as requestOverlayDiscard()'s own (the roster
grid's popup-based equivalent): clears the member's own slot,
sends the card to its own deck's discard pile via
discardUnattachedCard() when this save has virtual decks on,
then refreshes both this section (collapses back to Add
Overlay Card, or hides entirely, per its own comment) and the
roster grid (the center badge/darkened art both need to go
away too).

## `// anything, same empty state as before Add Card was tapped.`

Cancel tap -- backs out of the accordion without picking
anything, same empty state as before Add Card was tapped.
Same shape as cancelTeamCardsOverlayAdd(). Refreshes the
Overlay section too, alongside Cards -- cheap either way (see
toggleTeamDetailCardDeck()'s own comment), and this Cancel is
shared with the Overlay Card accordion (see
renderTeamDetailOverlaySection()).

## `// membership in the expanded set, independent of every other`

A category header tap -- toggles just that one deck's own
membership in the expanded set, independent of every other
category (see renderTeamCardSlotPanel()'s own comment for why
more than one can be open at once). Same shape as
toggleTeamCardsOverlayDeck(). Refreshes the Overlay section
too -- teamDetailCardsExpandedDecks is shared across all
three slots (see renderTeamDetailOverlaySection()'s own
comment), and only one of them is ever actually showing an
accordion at a time, so re-rendering both here instead of
branching on which one costs nothing.

## `// only reachable at all when this save has virtual decks off`

A card tapped from within the accordion's own expanded body --
only reachable at all when this save has virtual decks off
(see renderTeamCardSlotPanel()'s own comment on Add Card being
hidden entirely otherwise), so there's no hand/discard/deck
sourcing to do here any more -- just commits straight through,
then refreshes Header/HP/Evolution alongside the Cards section
itself, same set reconcileLegendaryEvolutionOnCardChange() can
touch when the Attach Card slot is the one that changed --
attaching a card that happens to match a legendary_evolve
target's own cardId doesn't by itself trigger the evolution
(the player still picks it from the Evolution column like any
other), but it's the same set of columns an eventual
reconciliation could touch, so keeping all three in sync here
is simplest. The Nature Card slot never touches any of that,
but re-running them anyway costs nothing and keeps this one
function correct for both slots rather than branching. The
slot is always empty when this accordion is showing (see this
comment's own first line), so there's never an outgoing card
here to discard either. Same shape as
selectTeamCardsOverlayOption().

'overlay' (see renderTeamDetailOverlaySection()) is a third,
separate slot entirely -- not part of the attachCardId/
natureCardId pair commitTeamMemberCard() writes, so it's
branched out up front rather than trying to squeeze it through
that same function. Only reachable here at all when virtual
decks is off in the first place (same reasoning as the
Attach/Nature case), so there's nothing else Head-er/HP/
Evolution-related to refresh either -- an Overlay Card can't
be a legendary_evolve target.

## `// commitTeamMemberCard() (shared with the corner badge's own`

Remove Card tap -- unequips that slot immediately via
commitTeamMemberCard() (shared with the corner badge's own
overlay -- see its own comment), no confirm step (see the
chat this was requested in). Detaching the Attach Card
specifically can end an active reverts:true legendary
evolution (see reconcileLegendaryEvolutionOnCardChange()),
which touches HP/species art/the Evolution column same as
that does -- Nature Card removal never can, but re-running all
three either way costs nothing and keeps this one function
correct for both slots rather than branching on it. Also
sends the outgoing card to its own deck's discard pile (see
discardUnattachedCard()) when this save uses virtual decks.

## `// the Pok\u00e9mon at 'index' and puts it in this player's own`

\"Send to Permanent\" -- takes the card equipped in `slot` off
the Pok\u00e9mon at `index` and puts it in this player's own
Permanent Cards panel instead of the discard pile (unlike
Remove Card). Only for a card with canPermanentFromAttach (see
cardCanPermanentFromAttach()), and only when the save has
virtual decks on -- no Hand & Decks tool means no Permanent
panel to send it to. Shared by the corner Cards overlay and
the details panel (index is a plain parameter, same shape as
commitTeamMemberCard()); each caller re-renders its own view.
A guest whose Host connection is down can't have the
Permanent half confirmed, so nothing is unequipped in that
case -- the card would otherwise just vanish.

## `//`

---- "Attach Nature Card" (empty Nature slot, virtual decks on) ----

One button, two sources, tried in this order:
1. The Nature card sitting in the Active Card zone, if it's
this player's own, still awaiting a decision, and
attachable -- attached through the exact same
perform/commit steps the zone's own Attach button ends
in (so the zone clears, Egg Move's on-attach draw fires,
etc.), just aimed at this Pok\u00e9mon directly instead of
via Team Tracker.
2. Otherwise the top card of the Nature Deck -- see
hostApplyDrawNatureAttach().
`index` is a roster index or 'wild' (same as every other
slot action here -- a Wild Pok\u00e9mon's Cards badge gets the
same button).
The card in the Active Card zone, if it's this player's own,
still awaiting a decision, attachable, and headed for `slot`
('nature' or 'attach' -- see getAttachSlotForCard()).

## `// Deck and announces it into the shared Active Card zone on the`

Host side of the draw route: takes the top card of the Nature
Deck and announces it into the shared Active Card zone on the
asking player's behalf, so everyone else sees it there as the
last card played -- committed:true when it's going straight
onto the Pok\u00e9mon (nothing left for anyone to decide, same as
an Item card attached from a hand, see
hostApplyRemoveFromHandOnly()), or a normal pending draw when
it can't be attached (e.g. a Nature card with canAttach:
"no"), so its owner can Discard/Permanent/Shuffle it exactly as
if they'd drawn it from the deck tool. Like any draw into the
zone, it takes over from whatever uncommitted card was there
(see setHostActiveCard()). Nothing is drawn for a guest that's
dropped, so there's no delivery failure to clean up after.
memberUid says which Pok\u00e9mon it's for, resolved back on the
asker's own device (see finishDrawnNatureAttach()).

## `// Pok\u00e9mon it was drawn for. attach is false when the card`

The asker's end: puts the drawn card in the Nature slot of the
Pok\u00e9mon it was drawn for. attach is false when the card
can't be attached -- it's just sitting in the Active Card
zone as a normal pending draw then. A Pok\u00e9mon that's gone in
the meantime sends the card to the discard pile instead of
vanishing (it stays shown as last played either way).

## `//`

---- "Attach Card" (empty Attach slot, virtual decks on) ----

The Attach-slot counterpart of the Nature button above, minus
the draw: one button, two sources, in this order:
1. An eligible Attach card in the Active Card zone -- this
player's own, pending, canAttach: "yes", not a Nature
card -- attached straight away through the same
perform/commit steps as the zone's own Attach button.
2. Otherwise a picker mode on Hand & Decks (see
attachPickMode): hand cards that can be attached get an
\"Attach to <Pok\u00e9mon>\" option, Permanent cards with
canAttachFromPermanent attach on tap, and everything else
is darkened and inert. An ownerless Pok\u00e9mon (the Wild one,
index 'wild', or an NPC Trainer's, 'trainer') gets the hand
and the zone but never Permanent -- a Permanent card
meant for the Wild has its own routes (see
requestAttachWildFromPermanent()).
Leaving Team Tracker/the Arena for Hand & Decks closes the
Cards overlay and details panel, so where the player started
is remembered (returnScreen/origin) and restored afterwards.

## `// 'permanent' (instanceId for that one). Everything is checked`

A card was chosen in the picker: source is 'hand' or
'permanent' (instanceId for that one). Everything is checked
again here, since the hand/Permanent/Pok\u00e9mon can all have
changed while the player was looking -- a failure that leaves
the mode usable (the card moved) just says so and stays in it.

## `// (real, already-committed) state -- called on open, after a`

Redraws the Status column against teamDetailIndex's current
(real, already-committed) state -- called on open, after a
picker confirm, after a counter +/-, and anywhere else the
member's actual status might have changed out from under this
view (fainting, reviving). config is only truthy when
STATUS_COUNTER_CONFIG has an entry for the member's *current*
status (null/none and confused/paralyzed/frozen never do) --
that's what drives both whether the counter shows at all and
whether the icon gets centered instead of left-justified, the
exact same "counter present -> left-justified, absent ->
centered" rule renderTeamDetailHpSection() follows for HP
under 'standard'. A fainted member always lands on
NO_STATUS_PLACEHOLDER here (member.status is force-cleared to
null by faintTeamMember()) so this naturally centers with no
counter for a fainted member too, with no extra
fainted-specific branch needed.

## `// that status's own icon/name. Nothing here touches the member`

Shows what tapping this option a second time would commit --
that status's own icon/name. Nothing here touches the member
itself; see handleTeamDetailStatusPickerTap() for what
actually commits.
The counter value is the one exception: previewing the
member's own already-equipped status shows its real current
count (member.statusCounter) rather than that status's
default -- otherwise moving the preview away and back again
without ever committing anything would look like it silently
reset the count, per the chat this was built in. Any *other*
status previewed still starts from its own default, same as
before, since there's no "real" count to restore for a status
the member doesn't currently have.

## `// button at the end (see handleTeamDetailStatusPickerConfirmTap()/`

Rebuilds the 8-icon strip fresh, plus a Confirm and a Cancel
button at the end (see handleTeamDetailStatusPickerConfirmTap()/
cancelTeamDetailStatusPickerPreview() below) -- called whenever
it opens and again after every first tap (see
handleTeamDetailStatusPickerTap() below), same "built fresh
every time rather than kept in sync" approach
renderTeamStatusPickerOptions() takes for the corner-badge
overlay's own mirrored picker. Highlights whichever option a
second tap would confirm -- the armed preview if one exists
(teamDetailStatusPendingId), falling back to the member's own
already-committed status the moment the strip opens and
nothing's been tapped yet.

## `// status and folds the strip back up without writing anything`

The one place that actually discards an armed/previewed
status and folds the strip back up without writing anything
to the member -- shared by tapping the Status icon while
nothing's armed (see toggleTeamDetailStatusPicker() below,
which is also how the strip opens in the first place) and by
the strip's own explicit Cancel button (see
cancelTeamDetailStatusPickerPreview()). Skips the fade/slide
entirely when there'd be nothing to visually undo anyway --
either nothing was ever previewed this time the strip opened,
or whatever's currently previewed already matches the
member's real status -- same "don't animate a no-op" principle
commitTeamDetailStatus() below follows.

## `// closed; if it's already open with nothing armed yet, closes`

Tapping the Status icon -- opens the 8-icon strip if it's
closed; if it's already open with nothing armed yet, closes
it back up via discardTeamDetailStatusPreviewAndClose() above
(there's nothing to discard in that case, so that call is
just a plain close). An *armed* preview is handled entirely
by handleTeamDetailStatusIconTap() instead, one level up --
see its own comment -- so this function is never actually
reached while something's armed. Same guards the corner
badge's own tap already enforces (see its own comment in the
#game-scroll delegated listener) -- blocked on a read-only
save, mid-replacement, mid-release, or for a fainted member
(which always reads as "No Status" anyway, so there'd be
nothing meaningful to change here until it's revived).
Opening also closes Evolution's own strip first if it's open
-- see handleTeamDetailEvolutionTypeTap()'s own comment for
the same rule the other direction.

## `// space (see its own comment) -- hide it out first rather`

The status card panel lives in this same below-the-row
space (see its own comment) -- hide it out first rather
than letting both sit open and stack awkwardly; it comes
back on its own once this strip closes again (see
discardTeamDetailStatusPreviewAndClose()'s/commitTeamDetailStatus()'s
own renderTeamDetailStatusSection() calls, which both
funnel back through updateTeamDetailStatusCardVisibility()).

## `// available while the strip is open (whether or not anything's`

The strip's own explicit "never mind" button -- always
available while the strip is open (whether or not anything's
currently armed), unlike tapping the icon itself, which
commits instead of canceling once something's armed (see
handleTeamDetailStatusIconTap()). Per the chat this was built
in: once tapping the icon can confirm, there needs to be some
other unambiguous way back out that never accidentally
commits.

## `// Cancel and does exactly what a second tap on an already-armed`

The strip's own explicit "commit" button -- sits opposite
Cancel and does exactly what a second tap on an already-armed
option, or tapping the preview icon itself while armed, both
already do (see handleTeamDetailStatusPickerTap()'s and
handleTeamDetailStatusIconTap()'s own comments) -- just a more
discoverable third way to reach the same commit. No-op with
nothing armed yet (teamDetailStatusPendingId still null),
same guard handleTeamDetailStatusIconTap() applies before
ever calling commitTeamDetailStatus() -- there's nothing
previewed to write in that case.

## `// to confirm an armed preview (a second tap on the same picker`

Actually writes a status to the member -- shared by both ways
to confirm an armed preview (a second tap on the same picker
option in handleTeamDetailStatusPickerTap() below, or tapping
the preview icon itself in handleTeamDetailStatusIconTap())
rather than duplicated per caller, since committing is
committing no matter which of the two the user reached for.
statusId 'none' clears the status entirely, same mapping
confirmTeamStatusSelection() uses for the corner-badge
overlay's own NO_STATUS_PLACEHOLDER option. statusCounter
always resets to the newly-picked status's own default (or is
left undefined for a status with no counter at all) rather
than carrying over whatever the previous status's count
happened to be -- same reasoning confirmTeamStatusSelection()
has for the corner-badge overlay. Skips the fade/slide when
statusId is exactly what was already being previewed (true
every time this is actually reached today, since both callers
only ever confirm an armed preview) -- the icon/counter/name
already show this status, so animating here would just make
it disappear and
immediately reappear for no visible reason, per the chat this
was built in.

## `// whatever's already armed (teamDetailStatusPendingId) commits`

One of the eight options in the strip was tapped -- a tap on
whatever's already armed (teamDetailStatusPendingId) commits
it (see commitTeamDetailStatus() above); any other tap just
arms/previews that option instead (see previewTeamDetailStatus()),
per "a second tap should be our confirm" from the chat this
was built in.

## `// normally the same open/close toggle as always (see`

Tapping the preview icon in the Status column itself --
normally the same open/close toggle as always (see
toggleTeamDetailStatusPicker()), but with a preview currently
armed (teamDetailStatusPendingId set -- see
handleTeamDetailStatusPickerTap()'s own comment), this is a
second, more direct way to confirm that same preview, rather
than making the user hunt back down for the one button they
already tapped once. Per the chat this was built in. Canceling
an armed preview without committing now has its own dedicated
button in the strip instead (see
cancelTeamDetailStatusPickerPreview()) precisely because this
path no longer doubles as a safe "never mind" once something's
armed.

## `// .game-team-detail-status-counter got clicked (see the`

delta is +1 or -1, from whichever half of
.game-team-detail-status-counter got clicked (see the
overlay's own click listener further down) -- same
immediate-commit shape as adjustTeamDetailHp(), clamped to
that status's own STATUS_COUNTER_CONFIG range. No-op while the
picker strip is open (the column is showing an uncommitted
preview at that point, not the real member -- see
previewTeamDetailStatus() -- so there's nothing real here yet
to adjust) or if the member's current status doesn't take a
counter at all. Unlike every other update to this column,
this one skips the fade-and-slide (renderTeamDetailStatusSection()'s
animate left off) -- per the chat this was built in, a simple
+/- didn't need the same transition the picker's icon/name
swaps get.

## `// Poisoned's 4th counter, Cursed's 2nd -- see`

Landing exactly on that status's faintAtMax ceiling (Burned/
Poisoned's 4th counter, Cursed's 2nd -- see
STATUS_COUNTER_CONFIG's own comment) faints the member here
rather than ever writing that count onto them, same "reaching
the limit routes into faintTeamMember() instead of landing on
it" shape as adjustTeamDetailHp()'s own 0 case. Refreshes the
HP and Evolution columns too, same as every other path that
reaches faintTeamMember() from this detail screen, since
fainting touches both of those as well.

## `// counting down to 0 wakes the member up rather than ever`

Sleep's own mirror of the above at 0 instead of max --
counting down to 0 wakes the member up rather than ever
leaving Sleep committed at a spent 0 count. Doesn't touch
HP/Evolution the way faintAtMax does above since waking up
isn't fainting -- nothing else on this screen depends on
status the way it depends on fainted.

## `// should be showing at all, and repaints it when it is -- called`

The one place that decides whether the status card panel
should be showing at all, and repaints it when it is -- called
from paintTeamDetailStatusDisplay()'s own paintNow() (so every
path that can change what the member's real status is --
commit, faint, Sleep/Cursed hitting its own clearAtMin/
faintAtMax ceiling, etc. -- stays in sync without duplicating
this same show/hide logic per call site) and from
toggleTeamDetailStatusPicker()/discardTeamDetailStatusPreviewAndClose()
(so opening/closing the Status picker strip itself, with
nothing about the member's real status having changed yet,
still hides/reveals the card around it). Shows whenever
there's a real, non-'none', non-fainted status *and* the
Status picker strip isn't currently open -- per the chat this
was reworked in, the card is meant to just always be visible
alongside an active status now, with the picker strip being
the one deliberate exception (there's no room to show both the
"pick a new status" strip and the current status's own card at
once, and showing the old card while a new one is being
armed/previewed would be actively misleading).

## `// art -- called both by updateTeamDetailStatusCardVisibility()`

The one place that actually paints the status card panel's own
art -- called both by updateTeamDetailStatusCardVisibility()
above whenever the panel is (re)shown and after flipping a
two-sided status's own card (flipTeamDetailStatusCard()
below), so the two can never drift out of sync with each
other's art. Looks the card up fresh from CARDS_BY_ID every
time (statusCardIdFor()) rather than caching it, same "always
the live source of truth" convention every other CARDS_BY_ID
lookup in this doc already follows. Flip Card only ever shows
for STATUS_TWO_SIDED's own two entries (Paralyzed, Sleep) --
anything else has just the one card and nothing to flip to.

## `// reachable while it's actually shown (STATUS_TWO_SIDED's own`

The status card panel's own Flip Card button -- only ever
reachable while it's actually shown (STATUS_TWO_SIDED's own
two statuses), toggling the member's statusCardSide between
its two sides and repainting in place. Persists immediately,
same "no separate Confirm" convention adjustTeamDetailStatusCounter()
above already follows for its own +/- -- there's no picker
step here to stage this behind, and per the chat this was
built in, the side a status card is showing should survive
closing and reopening the detail view for as long as that
status itself stays on the member.

## `// (one per currently-applicable category, or the single revert`

Redraws the Evolution column -- its own row of type buttons
(one per currently-applicable category, or the single revert
button while a Mega/Gigantamax override is active) plus
whatever's needed to keep an already-open strip in sync.
Reuses computeTeamEvolutionState() (same mode/icons the corner
badge itself is driven by) rather than re-deriving eligibility
independently, so the two can never disagree about what's
currently possible.

In 'unable' mode this only ever toggles the .no-evolution
class on #game-team-detail-level-evo-row -- the CSS is what
actually fades/slides #game-team-detail-evolution-section out
in place and re-centers Level via transform (see the chat
this was reworked in for why display/flex-basis toggling
couldn't animate cleanly). The column itself, and
#game-team-detail-evolution-content inside it, always stay in
the DOM at their normal size -- nothing here ever collapses
the row down to one column.

## `// layout (see .game-team-detail-level-evo-row.no-evolution`

Toggles the row into its centered, Evolution-faded-out
layout (see .game-team-detail-level-evo-row.no-evolution
in the CSS) -- the actual slide-and-fade-in happens
when this class comes back off below, not here.
#game-team-detail-evolution-content is deliberately
left alone (no display toggling) -- the column that
wraps it handles hiding entirely through opacity +
pointer-events now, so its fade can actually animate
instead of the content just vanishing the instant this
class flips.

## `// reconcileLegendaryEvolutionOnCardChange()) -- no tap-`

Ends only when its card is detached (see
reconcileLegendaryEvolutionOnCardChange()) -- no tap-
to-revert the way Mega/Gigantamax gets above, so this
is a plain static indicator rather than a real button.
data-category is a sentinel that never matches a real
category name, so a stray tap here is a guaranteed
no-op through handleTeamDetailEvolutionTypeTap()'s own
"no options for this category" fallthrough rather than
needing its own dedicated guard there.

## `// evolve/mega/gmax/legendary ordering computeTeamEvolutionState()`

'available' -- one button per applicable category, same
evolve/mega/gmax/legendary ordering computeTeamEvolutionState()
uses for its own cycling icons. The 'legendary' button
uses the first eligible legendary option's own unique icon
rather than one shared EVOLUTION_MODE_IMAGES entry -- in
practice this app never has more than one legendary option
eligible at once except Kubfu, whose two options share the
same category button here regardless (tapping it opens the
strip, where both show up as fully distinguishable choices
via their own real Pokémon artwork -- see previewSrc() in
renderTeamDetailEvolutionPicker() below).

## `// whichever category is currently expanded (teamDetailEvolutionCategory)`

Fills in the hidden strip below the type-buttons row for
whichever category is currently expanded (teamDetailEvolutionCategory)
-- same two shapes renderTeamEvolutionOptions() already uses
for the corner badge's own combined picker (a single option
skips straight to an image-plus-confirm-line, more than one
draws a chooseable list), just scoped to one category instead
of all of them at once, and reusing those exact same
.game-team-evolution-* classes so the artwork renders at
identical sizes to "other evolution dialogs," per the chat
this was built in. Confirm/Cancel live inside this same
container so they only exist while there's actually something
open to act on.

## `// 'revert' (only ever present in 'active-mega'/'active-gmax'`

Tapping one of the Evolution section's own type buttons --
'revert' (only ever present in 'active-mega'/'active-gmax'
mode) immediately clears the override, mirroring the corner
badge's own tap-to-revert exactly, no strip involved. Any real
category re-opens the strip fresh for that type if it wasn't
already open, or folds it back up (discarding whatever was
chosen, same as the Status icon's own "tap again with nothing
armed" close) if it was.

## `// this was rearranged in) -- only one of their two`

Status and Evolution sit side by side now (see the chat
this was rearranged in) -- only one of their two
expandable strips can be open at once. Opening this one
closes Status's first, exactly as if its own Cancel had
been tapped (see discardTeamDetailStatusPreviewAndClose()'s
own comment).

## `// -- with the slide-up now an actual CSS transition (see the`

Leaves .-inner's markup alone rather than clearing it here
-- with the slide-up now an actual CSS transition (see the
grid-template-rows rule), yanking the content out from
under it immediately would cut that animation short
before it has anything left to show. It gets overwritten
fresh the next time this strip actually opens (see
handleTeamDetailEvolutionTypeTap(), which always calls
renderTeamDetailEvolutionPicker() before adding .visible
back), so there's never a stale-content flash to worry
about either.

## `// actually gets written to the member. A genuine stage evolution`

The strip's own Confirm -- see applyEvolutionChoice() for what
actually gets written to the member. A genuine stage evolution
or a Mega/Gigantamax toggle both change what this member's own
name/art resolve to (and can change its HP max -- see
reconcileTeamMemberHpAcrossFormChange()), so this refreshes the
header and HP section too, not just Evolution's own buttons.

## `// (evolve_cost comes off it -- see applyEvolutionChoice()'s`

A genuine stage evolution changes member.level itself
(evolve_cost comes off it -- see applyEvolutionChoice()'s
own comment), and either an evolve or a Mega/Gigantamax
toggle can change which entry's token_level applies (see
getTeamMemberBaseLevel()) -- either way Total Level can
shift here even when the counter's own commit path
(adjustTeamDetailLevel()) was never touched.

## `// every exit path the chat this was built in called for`

The one authoritative way out of team-add mode -- called from
every exit path the chat this was built in called for
(Don't Add a Pokémon; the nav bar's back button, when nothing
else is open; the nav bar's close button; and openGamePanel()
itself, covering "opens the game panel again" for every way
that can happen, not just the ones already listed). Also closes
#gallery-team-add-confirm-overlay and clears
teamAddCandidateImg, rather than leaving each call site above
responsible for remembering to do that too -- whatever that
overlay was asking about stops being relevant the moment
add-mode itself ends, same as the mode flag.

## `// mode (see the chat this was designed in) ----`

---- Permanent Cards panel's own "choose a Pokémon" picker
mode (see the chat this was designed in) ----

Same shape as Team Tracker's own team-add mode just above --
closes the game panel, hands off to the gallery, force-
applies one specific #unique-properties-section filter tag
(cardNeedsPokemonChoice()'s own choosePokemon value, e.g.
"fossil") the same way beginTeamAddMode() force-applies
Starter -- and lands the eventual pick on a Permanent card's
own pokemonPick field instead of a team roster slot. Kept
entirely separate from teamAddModeActive/its own functions
rather than generalizing the two into one shared mode -- the
two can never be active at the same time (each only starts
from its own screen, with the game panel already closed
either way), so there'd be nothing to actually share beyond
the shape, and keeping them apart means a bug in one mode's
exit/lock handling can't possibly bleed into the other's.

## `// a Permanent-pick session, unless permanentPickLockedTag IS one`

Tags force-excluded from the gallery for the whole duration of
a Permanent-pick session, unless permanentPickLockedTag IS one
of these (see filterGallery()'s own permanentPickForcedExcludeMatch
comment) -- same shape as TEAM_ADD_FORCED_EXCLUDE_TAGS above,
just without 'pokestar' (Pokéstar tokens aren't otherwise
barred from a choosePokemon pick the way they are from a
team, so there's nothing to force-exclude there).

## `// the Permanent move. The chosen token's own color (see`

"Choose This Pokémon." -- the one path that actually finishes
the Permanent move. The chosen token's own color (see
#color-section's tags -- pink/green/blue/yellow/red) becomes
this card's noteColor, same dot as a manually-chosen Color
(see .game-note-color-dot); a token tagged with none of the
five (Legendary/Mega/etc, rather than a base color) just
ends up with no dot; there's nothing else to fall back to.

## `// #game-scroll delegated listener) -- same "close the panel,`

Entered from #game-battle-choose-wild-btn (see the
#game-scroll delegated listener) -- same "close the panel,
hand off to the gallery" shape as beginPermanentPickMode()
just above, reusing the same forced-exclude tags
(TEAM_ADD_FORCED_EXCLUDE_TAGS -- see filterGallery()'s own
battleWildForcedExcludeMatch) since a Mega/Gigantamax form or
a Pok\u00e9star token isn't something that shows up in the wild
any more than it's something a player adds to their own team
by hand. No Starter-lock the way beginTeamAddMode() has --
this Pok\u00e9mon is never going on the roster at all, so there's
no "first member becomes the starter" rule to enforce here.

## `// Choose Wild Pok\u00e9mon) or 'trainer' (Attacker, from Choose Trainer`

Which half this same pick mode is filling: 'wild' (Defender, from
Choose Wild Pok\u00e9mon) or 'trainer' (Attacker, from Choose Trainer
Pok\u00e9mon -- see beginBattleTrainerPickMode()). The pick itself
(gallery filtering, banner, confirm card, shiny checkbox) is
shared; only the wording and where the confirmed pick lands differ.

## `// filter section is shown selected and untouchable (same`

Locks the gallery to one color: that color's button in the Color
filter section is shown selected and untouchable (same
.game-team-corner-locked look as the Fossil/Starter locks), and
the other color buttons are cleared. filterGallery() also checks
battleTrainerPickColor itself, so nothing the player does to
other filter buttons can let another color through.

## `// A card with '"noteColor": "yes"' first asks for the color of the`

Active Card zone's Choose Trainer Pok\u00e9mon button.
A card with `"noteColor": "yes"` first asks for the color of the
space the player is on (the same swatch picker the Permanent
button uses), then starts the pick locked to that color.
The Battle Trainer button asks first how the Trainer's Pok\u00e9mon are chosen: picked by hand in the gallery
(for a physical or projected board, where the tokens aren't tracked in the app), or drawn at random from
the board's token pool (a fully virtual game).

## `// cards.json "scaledOpponents": { levelCap, lines: [ { forms: [ { name, upTo }, ... ] }, `

---- Scaled opponents (TV Interviewer) ----
cards.json "scaledOpponents": { levelCap, lines: [ { forms: [ { name, upTo }, ... ] }, ... ] }
Each line is one evolution line of tokens, queued in order as the NPC Trainer's team. The line's form is the first
whose `upTo` covers the level of the highest-Level Pok\u00e9mon on the card owner's team (capped at levelCap); that
token's Level is raised by however far that level is above the form's own base level.

## `// Rival Battle, Trainer Battle and Let's Fight! each hand the player a battle to play out`

---- Discarding a battle card once its battle is over ----
Rival Battle, Trainer Battle and Let's Fight! each hand the player a battle to play out in the Arena. Once that
battle has started and then ended, the card is discarded for them (if it is still theirs in the Active Card zone)
and any tokens drawn from the pool for it go back. Watched from renderBattleControls(), which runs on every
Arena change on every device.

## `//   "victoryDraw": N           draw N cards when the card's battle is won`

Victory rewards, read from the card so they can be reused with other numbers (cards.json):
"victoryDraw": N           draw N cards when the card's battle is won
"victoryDrawDeck": "..."   which deck (default "Item Deck")
"victoryDiscard": M        then discard M cards of your choice from your hand

## `//`

---- Rival Battle card (see the chat this was designed in) ----

A card tagged `"rivalBattle": "yes"` in cards.json (Rival
Battle) gets a Battle button in the Active Card zone. It asks
for the color of the space the player is on (the same swatch
picker Trainer Battle and Permanent use), then goes to the
Battle Arena with the Attacker half filled by the Rival card
of that color for THIS save's region -- gym-leaders.json's
`category: "rival"` entries, one per region per color (see
sendGymLeaderCardToArena(), which does the actual placing --
side 1 out first, side 2 queued). The Event card itself stays
in the Active Card zone afterwards, same as Trainer Battle;
the player Discards it when the battle's done.
Event cards whose text starts a Pok\u00e9mon Contest (cards.json contestStart: "yes") get a Begin Contest
button at the top of the Active Card zone, which runs the same boardUseContestHall() the Contest Hall
space action does. The card stays in the zone afterwards; the player Discards it when done.
---- Roaming Legend (cards.json) ----
"legendaryEncounter": "yes"   adds the two choices below to the card in the Active Card zone
"declineDraw": N              (+ optional "declineDrawDeck", default "Item Deck") cards drawn if the player declines
"declineShuffleBack": "yes"   a declined card is shuffled back into its own deck rather than discarded
Find the Legendary: a random Legendary token (the pool, or a random orange space when it is empty) is drawn and fought as an
ordinary wild encounter -- it can be Caught -- and the card is discarded when that battle ends. Decline: draw the cards and
shuffle the card back.

## `//   rollMovement: "yes"   puts a Roll button at the top of the card's buttons in the Acti`

---- Roll for movement (Blimp Ride) ----
rollMovement: "yes"   puts a Roll button at the top of the card's buttons in the Active Card zone.
In the Virtual play mode (the in-app map), Roll brings up the board if it isn't already, centers it on this player's marker
(same as its Find Me button), and rolls the Movement Die automatically. The card is discarded. Landing prompts (the
Actions box) are held back for the whole move, since other effects can change how far the player may go: the move ends when
they press Done Moving under the roll, or end their turn. In the other play modes that have virtual cards, a toast tells
the player to roll their own die and move.

## `// While turns are running, a player's own turn has ONE regular move action: roll the Move`

---- The move action (see the chat this was designed in) ----
While turns are running, a player's own turn has ONE regular move action: roll the Movement Die and walk, OR use Stay on Space,
Dig, Fly or Teleport (Surf is a pass, not an action). Rolling opens a "move window": the marker can only be picked up while it is
open, landing prompts are held back (the same hold a Blimp Ride always had), and Done Moving (or ending the turn) closes it and
brings up the prompt for the space the marker finished on. A Blimp Ride opens a window of its own on top of that, which is why a
turn can hold two moves. With a physical Movement Die the first walk of the turn opens the window by itself.
The state lives in the save (data.moveState = { turn, regularUsed, window: { type: 'regular' | 'blimp', startId, route: [the spaces from startId to where the marker is now] }, roll: { value, raw, penalty } }), keyed by this
player's own turn count, so a reload mid-turn picks up where it was and a new turn starts clean.
A move counts for "moves to a new space" upkeep (Pokémon Egg) when its window closes on a different space than it opened on.
Stay / Dig / Fly / Teleport use up the regular move but never count as moving. Without turns running none of this applies.
A move window is ONE move however many times the marker is picked up: putting it down is only a checkpoint, and the move is settled
by Done Moving. window.route is the net path from where the window opened (see boardRouteApply()): stepping back onto the space
the marker just came from takes that step back (the step count goes down), anything else adds a step (so a loop in the map can be
walked round). The step count shown, the Cities passed through (selectable as Current Home), the colors walked (upkeep) and whether
it counted as a move all come from that route. Roll: a roll taken back with Cancel Roll (only while the marker hasn't moved) leaves the
move unspent, and rolling again that turn shows the stored result (window.roll) so it can't be used to re-roll.
Rolling and the movement abilities are only for the player's own turn.

## `// Pokémon Egg after a move to a new space) for the caller to present. atTurnEnd: no landi`

Closes the open move (Done Moving, a new Blimp Ride, or the end of the turn). Returns the upkeep items it set off (a card like
Pokémon Egg after a move to a new space) for the caller to present. atTurnEnd: no landing prompt, the turn is over.

## `//   healTeam: "yes"            revive every Fainted Pok\u00e9mon on your team and clear e`

---- cards.json effect keywords (reusable on any card) ----
healTeam: "yes"            revive every Fainted Pok\u00e9mon on your team and clear every Status Condition (Pok\u00e9mon Center)
drawCards: N               draw N cards (drawCardsDeck, default "Item Deck")             (Pick Up Item, Pok\u00e9Stop)
shuffleToDraw: M           with drawCards: shuffle ONE hand card back into its deck to draw M instead of N (Pok\u00e9 Mart)
Each puts one button on the card; using it resolves the effect and discards the card.
poolGainByCopies: [{ copies: N, colors: [..] }]   draw a random token of one of those colors from the pool (the player's choice) to join
the team, by playing N copies of the card together: the one in the Active zone plus N-1 more from the hand,
which are discarded with it (Ribbon). One button per color goes on the card (see cardPoolTierButtonsHtml()).

## `// usual replace prompt). levelGain: N -- the Team Tracker opens to choose which Pok\u00e9`

poolGain: "pink" -- draw a random token of that color from the board's pool; it joins the team (a full team gets the
usual replace prompt). levelGain: N -- the Team Tracker opens to choose which Pok\u00e9mon gains the Level(s).
extraCopies (poolGainByCopies): that many more copies of the card are discarded from the hand, but only once a token was really drawn.

## `// cards.json "swapPokemon": N (trade up to N Pok\u00e9mon); "swapNewGeneration": "yes" (e`

---- Wonder Trade / Regional Traveler: trade team Pok\u00e9mon back into the pool for new tokens of the same color ----
cards.json "swapPokemon": N (trade up to N Pok\u00e9mon); "swapNewGeneration": "yes" (each new token must be from a
different generation than the one traded in; when the pool has none, the card is discarded and a new card is drawn from
"swapFailDrawDeck", default Event Deck). The player taps each Pok\u00e9mon in Team Tracker and notes its token's color
(the generation is read from the Pok\u00e9mon data, and asked for only when it isn't there). New tokens are drawn FIRST
(so a traded-in token can't come straight back), then the traded Pok\u00e9mon are released (the board returns their tokens to the
pool by itself) with their Attach / Nature cards discarded, and the new ones join the team.

## `// blue token even though the Ralts it began as was pink. A temporary Mega / Gigantamax fo`

Color and generation come from the Pok\u00e9mon's CURRENT evolution stage (member.name), so a Kirlia is traded for a
blue token even though the Ralts it began as was pink. A temporary Mega / Gigantamax form is ignored (formOverride
is separate from member.name). The player is asked only when the data has no color for that form.

## `// sets that up from their own buttons; everyone else sees Go To Arena, since one of them `

Cards flagged arenaOpponent: "yes" in cards.json (Rival Battle, Trainer Battle) put an NPC into the Battle Arena. The player who played the card
sets that up from their own buttons; everyone else sees Go To Arena, since one of them has to control
the NPC during the battle.
arenaOpponent: "afterChoice" (Roaming Legend) waits until the card's owner has actually committed to the battle --
the host flags their active entry arenaReady (see requestActiveCardArenaReady()); declining never shows the button.

## `// confirming a pick (see confirmBattleWildSelection() below) --`

The one authoritative way out of this mode short of actually
confirming a pick (see confirmBattleWildSelection() below) --
called by the mode banner's own Cancel, the confirm card's
own "Don't Send a Wild Pok\u00e9mon" (see
closeGalleryBattleWildConfirm()'s own comment for why that one
instead routes here rather than just closing itself), and the
nav bar's Back button while this mode is active. Same shape as
exitPermanentPickMode().

## `// just this overlay, deliberately leaving battleWildPickModeActive`

"Keep Searching for a Wild Pok\u00e9mon." lands here -- closes
just this overlay, deliberately leaving battleWildPickModeActive
itself alone, same "stay in pick mode so the next gallery
click reopens this same confirm" reasoning as
closeGalleryTeamAddConfirm()'s own comment. "Don't Send a Wild
Pok\u00e9mon." and the backdrop click go through
exitBattleWildPickMode() instead.

## `// object for the Wild Pok\u00e9mon occupying Battle Arena's`

Builds a full, independently-tracked team-member-shaped
object for the Wild Pok\u00e9mon occupying Battle Arena's
Defender slot -- same fields, same fresh-HP-at-level-0
starting point as addOrQueueTeamMember()'s own member literal,
duplicated rather than shared for the same independence
reasoning as everywhere else in this doc (this one's never
pushed onto a roster, never checks for room, never triggers
beginTeamReplaceMode() or reportLobbyStarterChosen() -- none
of that has anything to do with a Pok\u00e9mon that was never
added to any team at all).

## `// attachable (it could have been Discarded from another`

The Permanent card this pick is for has to still be
attachable (it could have been Discarded from another
device while the gallery was open) -- checked up front, and
again inside the callback below since a Defender replace
confirmation can leave a gap before it actually runs.

## `// attachImageEvents()'s own hit-zone listener) -- stashed on`

img is the actual gallery <img> that was clicked (see
attachImageEvents()'s own hit-zone listener) -- stashed on
teamAddCandidateImg rather than copying its fields out yet,
since confirmTeamAddSelection() (the only thing that ever
reads it back) already needs the live element for its
src/alt/dataset, and copying now would just be doing that
work a step early for no benefit.

The shiny checkbox resets to unchecked every time this opens
(rather than remembering the last confirm's state) and is
disabled outright when hasShinyForm() says this particular
Pokémon has no shiny art -- same guard renderTeamGrid()'s own
shiny handling and the viewer's shinyToggleBtn both use.

## `// overlay, deliberately leaving teamAddModeActive itself alone,`

"Keep Searching for a Pokémon." lands here -- closes just this
overlay, deliberately leaving teamAddModeActive itself alone,
since staying in add mode so the next gallery click reopens
this same confirm for whatever's clicked next is the entire
point of that button (see the chat this was decided in).
"Don't Add a Pokémon." and the backdrop click go through
exitTeamAddMode() instead, which calls this same cleanup as
part of leaving add mode entirely.

## `// writes a member. dex/shinysrc come off the <img>'s own dataset`

"Add This Pokémon to Your Team." -- the one path that actually
writes a member. dex/shinysrc come off the <img>'s own dataset
the same way openImageViewer() already reads them, rather than
inventing a second lookup. shiny records whether the checkbox
was both checked AND actually meaningful (hasShinyForm() guards
against a disabled-but-somehow-checked edge case) -- kept as
its own field alongside src/shinysrc, rather than overwriting
src with shinysrc outright, so renderTeamGrid() can pick the
right one the same way setShinyShowing() does elsewhere, and
so a later "toggle this member's own shiny state" feature (if
this tool ever grows one) would have both images to switch
between. isActiveSaveReadOnly() is guarded here too even
though it shouldn't be reachable in practice (see
beginTeamAddMode()'s own call site) -- cheap insurance against
a stale click already in flight, same instinct as other
mutators in this panel.

A full roster no longer blocks this the way it used to --
#game-team-add-btn (see the chat this was decided in) can reach
this same confirm even with all 6 slots taken, same as an empty
slot click always could, so this is the one place that has to
actually decide which case it is: room to spare pushes the new
member straight on, same as always; no room hands off to
beginTeamReplaceMode() instead, which leaves the actual
placement up to the player rather than guessing who they'd
want overwritten.
Builds a full team member from just the handful of fields
that actually differ per source (dex/name/src/shinysrc/shiny)
and either pushes it straight onto the roster or, if it's
already full, hands off to beginTeamReplaceMode() -- exactly
what confirmTeamAddSelection() used to do inline for a
gallery pick, pulled out so addPermanentPokemonToTeam() (see
the chat this was designed in) can reuse the same "add or
queue a replacement" behavior for a Permanent card's own
pokemonPick instead of building it a second time. Caller is
responsible for its own isActiveSaveReadOnly() guard and
whatever screen/panel navigation makes sense for where it's
called from -- this only ever touches the roster data itself.

sourceInstanceId is only ever passed by addPermanentPokemonToTeam()
-- the Permanent card this member's own pokemonPick came from,
Discarded (see requestPermanentDiscard()) immediately once
there's room to just push the member straight on. If there
isn't room, discarding gets deferred to whatever eventually
resolves the pending replacement instead (see
beginTeamReplaceMode()'s own comment) -- the card stays put
in Permanent for as long as its own Pokémon is still only
pending, not yet actually on the team.

## `// shape as status above. hp only actually means`

fainted starts false, same "no data model yet"
shape as status above. hp only actually means
anything for the alt1/alt2 hpRules (see
getTeamMemberHp()'s own comment for why reading it
never assumes it's set even so) -- set to a fresh
max here under whatever hpRule is active right now
just for a clean starting value, at level 0 (alt2's
own max is exactly this species' own token_level at
that level).

## `// rather than absent so every read can just check`

Attach/Nature card slots -- both start empty. null
rather than absent so every read can just check
truthiness without an extra "in" check, same
convention as status above. Holds a
CARDS_BY_ID key (a card's own id), not the
card object itself, so the equipped card's data
always reflects whatever's currently in
cards.json rather than a stale snapshot from
whenever it was equipped.

## `// overlayCounter below -- only means anything once`

attachCounter is Attach's own equivalent of
overlayCounter below -- only means anything once
attachCardId is set and that card has its own
itemCounters field (see cardHasItemCounter()). Starts
at 0 here regardless, reset properly to
getDefaultItemCounter() by whichever path actually
equips one -- all of them funnel through
commitTeamMemberCard(), the single place attachCardId
ever changes (see its own comment).

## `// two), same null-until-equipped convention. overlayCounter`

Overlay Card -- a single slot (unlike Attach/Nature's
two), same null-until-equipped convention. overlayCounter
only actually means anything once overlayCardId is set
and that card has its own overlayCounters field (see
cardHasOverlayCounter()) -- starts at 0 here regardless,
reset properly to getDefaultOverlayCounter() by whichever
path actually equips one (see commitOverlayToMember()/
selectTeamDetailOverlayOption()).

## `// this device's starter (beginTeamAddMode() already forces`

Roster empty right up to this push means this member IS
this device's starter (beginTeamAddMode() already forces
the Starter filter on for exactly this case) -- captured
before the push below so the check isn't fooled by the
member that's about to land in it.

## `//`

---- Battle Arena ----

Index (into the active save's own data.team.members, same
array Team Tracker itself reads) of whichever Pokémon is
currently showing in the Attacker half -- null until the
player actually picks one via the button below. Deliberately
an index rather than a copy of the member object, same
reasoning as teamDetailIndex elsewhere: it always resolves
back to that Pokémon's live, current data (HP/status/form
overrides and so on) rather than a stale snapshot from the
moment it was picked.

## `// the CURRENT round (what a Field Move Effect entry's`

Per half: whether the Pokémon there entered its half during
the CURRENT round (what a Field Move Effect entry's
"enteredThisRound": true condition reads -- see
getBattleZoneModifiers(), e.g. Spikes). Set when a Pokémon is
placed in a half while a battle is in progress, cleared for
both halves by Next Round / End Battle / a recall. A Pokémon
placed BEFORE Begin Battle is never flagged (no field effect
can be in play at the start of a battle, so round 1 can't
come up). Solo it's kept right here by the placement
setters; in a Lobby the Host owns it (hostBattleArenaState.
entered) and applyIncomingArenaState() copies it in.

## `// used this battle (see attackRerollsPerBattle in the card-bonus`

Per half: how many Attack Roll rerolls the Pokémon there has
used this battle (see attackRerollsPerBattle in the card-bonus
notes above getBattleBonusCards()). Resets when the battle
begins or ends or the half's occupant changes. Solo it's kept
right here; in a Lobby the Host owns it (hostBattleArenaState.
rerolls) and applyIncomingArenaState() copies it in.

## `// Three counters -- how many of each die a roll uses -- each`

---- Battle dice (per half) ----
Three counters -- how many of each die a roll uses -- each
0 to 3. Raising one zeroes the other two, so only one kind of
die is ever in play. Left to right: d4, d6, and the "High-
Crit" d8 whose 7 and 8 faces are a second 5 and 6.

## `// old "d4" / "Effect d6" text. Replace 'placeholder' with an image`

The icon shown in front of each dice readout, in place of the
old "d4" / "Effect d6" text. Replace 'placeholder' with an image
URL to use real art; until then each die gets a simple shape.
d4 / d6 / d8 : the three Attack dice (d8 is the High-Crit die)
effect       : the Effect die
status       : the Status die

## `// in the Host's arena state and every screen mirrors them (see`

The counters and the RESULTS are both shared: in a lobby they live
in the Host's arena state and every screen mirrors them (see
applyIncomingArenaState()). attack = [{ die, value, excluded },
...] in counter order (left to right), effect = a number; null
until rolled. The two rolls are independent -- rolling one
leaves the other showing. A die with excluded: true stays
listed but isn't added into the Attack calculation.

## `// just above -- same reasoning, just tracked independently so`

Defender half's own equivalent of battleAttackerMemberIndex
just above -- same reasoning, just tracked independently so
Attacker and Defender can each hold their own pick. The one
thing that's NOT independent between the two: the same
individual Pokémon (this same members[] index, not just the
same species) is never allowed to sit in both halves at once.
setBattleAttackerIndex()/setBattleDefenderIndex() just below
are the only two places either of these two variables is ever
written to a non-null value, specifically so that rule has
exactly one place to live rather than needing to be
remembered at every call site (the picker selections, and the
Team Tracker send-to-battle flow) separately.

## `// above actually resolves against -- null whenever that index`

Which team (see getActiveTeamId()) battleAttackerMemberIndex
above actually resolves against -- null whenever that index
is. Needed because a bare members[] index alone doesn't say
whose roster it's an index INTO: Team Tracker and Battle
Arena's own pickers always read whatever save is currently
active, so if the player switches saves after picking an
Attacker, the index would otherwise silently get reinterpreted
against the new save's roster instead of clearing like it
should. Kept in lockstep with battleAttackerMemberIndex by
every place that ever touches it -- setBattleAttackerIndex(),
renderBattleAttackerSlot()'s own invalid-index fallback, and
recallBattleAttacker() -- rather than derived on demand,
because by the time a later screen might ask "what team was
this Attacker from", getActiveSaveData() may already have
moved on to a different save.

NOTE: the arena now belongs to ONE save -- it's cleared
whenever the active save changes (see
clearBattleArenaForSaveChange()), so a pick from a different
save should never be found here any more. The mismatch
handling in the slot renderers is just a defensive backstop.

## `// slot, or null when Defender is either empty or holding a real`

The Wild Pokémon currently occupying Battle Arena's Defender
slot, or null when Defender is either empty or holding a real
team member instead -- a full team-member-shaped object (see
buildWildPokemonMember()) that was never added to any
roster, so it needs its own storage entirely separate from
getActiveSaveData().team.members. Only ever meaningful
alongside battleDefenderMemberIndex === 'wild' (see that
sentinel's own comment on getTeamSlotMember()) -- kept as its
own variable rather than folded into battleDefenderMemberIndex
itself since that one's read everywhere as "which roster
position", and a whole member object doesn't fit that shape.
Set by setBattleDefenderWild() (the only place a wild pick
actually lands, mirroring setBattleAttackerIndex()/
setBattleDefenderIndex()'s own "one authoritative setter"
convention), cleared by setBattleDefenderIndex() (a real pick
overwriting a wild one) and recallBattleDefender().

## `// ATTACKER slot, or null -- the Attacker-side twin of`

The NPC Trainer's Pok\u00e9mon currently occupying Battle Arena's
ATTACKER slot, or null -- the Attacker-side twin of
battleWildPokemon above: a full team-member-shaped object that was
never on any roster, only meaningful alongside
battleAttackerMemberIndex === 'trainer'. Set by
setBattleAttackerTrainer(), cleared by setBattleAttackerIndex() (a
real pick replacing it) and recallBattleAttacker().

## `// built in) ----`

---- Multiplayer Battle Arena sharing (see the chat this was
built in) ----
Everything above this point stays exactly as it was for
solo/offline play, where one person controls both halves.
Once a Lobby session exists there is still exactly ONE
Attacker half and ONE Defender half for the whole lobby, each
holding either a specific player's own Pokémon or an ownerless
one (today: the Wild Pokémon). The local variables above stay
this device's own live view of whatever it owns/mirrors; who
owns what lives in the shared state below (see
applyIncomingArenaState() for how the two are reconciled, and
canControlWildDefender()/canCatchWildDefender() for the
control rules that follow from ownership).

guestBattleArenaCache: the guest-side (and host's own) mirror
of the Host's last broadcastBattleArenaState() --
{attacker, defender, inProgress, moves, dice}: attacker/defender each
{member, ownerId} | null (ownerId null meaning ownerless);
inProgress is whether Begin Battle has been pressed; moves is
{attacker, defender}, each the move currently chosen for that
half ({moveName, baseMove, manual, rule}) or null; dice is
{attacker, defender}, each {attack: [{die, value, excluded}] |
null, effect: number | null, status: number | null} -- what was
rolled for that half (status is the d4 rolled from the Status
Condition overlay, never counted in the Attack total). Same "one code path, host and guest
alike" trick guestDeckStateCache already uses.

## `// half -- just the move name, not a cached total, so a level or`

Which move the Attack Calculator is currently reading for each
half -- just the move name, not a cached total, so a level or
HP edit made after tapping the move still shows up in the
readout on the very next render (see renderBattleCalcReadout()
recomputing from this every time), same "always rebuilt from
live state, never trusted stale" convention as the rest of
this screen. Null before a move's been tapped, or once it's
been cleared out (a new Pokémon in the slot, a recall -- see
resetBattleCalcResult()/every setter and recall function
below).

## `// openBattleManualOverlay()) for a "manual" move, per half --`

The number a player typed into the manual-power prompt (see
openBattleManualOverlay()) for a "manual" move, per half --
{ moveName, value } or null. Stamped with the move it was
typed for so computeBattleMoveValue() never reuses it for a
different manual move tapped afterward. Cleared alongside
battleCalcMoveName by resetBattleCalcResult().

## `// rest of the Lobby -- called by every place that changes it AND`

Re-sends this device's own current pick for one half to the
rest of the Lobby -- called by every place that changes it AND
by persistTeamSlotChange() on every HP/Status/Level/Cards
edit, so a wound taken mid-battle shows up for everyone else
too. A no-op solo. Only ever sends a real roster pick of this
device's own; the Wild Pokémon goes out separately (see
setBattleDefenderWild()/persistTeamSlotChange()'s 'wild'
branch).

## `// the round it was flipped in: it goes back to side 1 on Next`

Paralyzed is a two-sided status card, and side 2 only lasts for
the round it was flipped in: it goes back to side 1 on Next
Round and whenever its Pokémon enters or leaves the Arena.
These two do that for a member on this device's own roster
(resetParalyzedSideAt()) or for any member object, such as the
Wild Pokémon (resetParalyzedSide()). Both return true if they
actually changed something.

## `// roster index -- picking a Pokémon that's currently the`

The one authoritative way to point the Attacker half at a
roster index -- picking a Pokémon that's currently the
Defender moves it rather than duplicating it, by clearing
battleDefenderMemberIndex out from under it here. Also stamps
battleAttackerTeamId with whatever team is active right now
(null alongside a null index), so this Attacker's team stays
known even if the player switches saves afterward. Doesn't
re-render either slot itself; every call site already re-
renders both right after (Attacker because it just changed,
Defender in case this just cleared it), same "caller owns the
repaint" convention as the rest of this file's setters.

Deliberately does NOT enforce the separate "no two Pokémon
from the same team in both halves" rule -- that's a can-this-
selection-even-happen question, decided in advance by
whichever entry point offers the choice (openBattleAttackerPicker()/
openBattleDefenderPicker() refusing to open at all, and
renderBattleSlotChoiceOverlay() disabling the ineligible
button), not something this setter could sensibly resolve on
its own the way it resolves an individual-Pokémon collision
(there's no single obvious Pokémon to evict here the way
there was for that one).

## `// wild or not -- stale battleWildPokemon data left behind`

A real pick always replaces whatever was there before,
wild or not -- stale battleWildPokemon data left behind
here would never actually be shown again (renderBattleDefenderSlot()
only reads it while battleDefenderMemberIndex === 'wild'),
but there's no reason to let it linger in memory either.
Solo only -- a Lobby's Host handles this (see
hostApplyBattleSetSlot()). Whatever was attached to the
Wild Pok\u00e9mon being replaced goes to the discard pile.

## `// Pokémon -- deliberately separate from setBattleDefenderIndex()`

The one authoritative way to point Defender at a Wild
Pokémon -- deliberately separate from setBattleDefenderIndex()
above rather than folded into it, since a Wild Pokémon never
goes through the same "same-individual"/"same-team" collision
checks a roster pick does (there's no roster index to collide
on, and battleDefenderTeamId is stamped with the fixed 'wild'
sentinel rather than getActiveTeamId(), so
isBattleAttackerBlockedByActiveTeam() can never match it --
see that function's own comment). Never evicts Attacker the
way setBattleDefenderIndex() sometimes does, for the same
reason: a Wild Pokémon can never be "the same individual" as
anything in a player's own roster. Caller (confirmBattleWildSelection())
owns navigating to the Battle screen afterward, same "setter
doesn't repaint or navigate itself" convention as every other
setter in this file.

## `// Pok\u00e9mon -- the Attacker-side twin of setBattleDefenderWild(), same`

The one authoritative way to point Attacker at an NPC Trainer's
Pok\u00e9mon -- the Attacker-side twin of setBattleDefenderWild(), same
ownerless shape, but flagged `trainer` in the shared arena entry
so the Host can tell it from a Wild one (battle music, wording).
battleAttackerTeamId is the fixed 'trainer' sentinel, which can
never equal a real save's team id. Caller owns the repaint.

## `// RIGHT NOW would put two Pokémon from that same team in both`

Whether picking a new Attacker from whatever team is active
RIGHT NOW would put two Pokémon from that same team in both
halves at once -- true only when Defender is filled AND its
own stamped team matches the currently active one. Read by
every entry point that could send a new Attacker in
(openBattleAttackerPicker(), renderBattleSlotChoiceOverlay())
so each can refuse the pick up front rather than leaving it to
setBattleAttackerIndex() to sort out after the fact -- unlike
the individual-Pokémon collision that setter resolves by
moving the one Pokémon involved, there's no single sensible
Pokémon to evict here (an entire OTHER roster's worth of
Pokémon would just be as "in conflict" as the one actually
sitting there), so this is a flat refusal instead.

## `// A Pok\u00e9mon with an Overlay Card on it (member.overlayCardId)`

---- Overlay Card eligibility ----
A Pok\u00e9mon with an Overlay Card on it (member.overlayCardId)
can't be put in the Arena. Enforced everywhere one can enter:
both Arena pickers, Team Tracker's send mode, the Host's own
check (hostApplyBattleSetSlot()), and the two index setters.
Wild Pok\u00e9mon never carry one.

## `// A card with "battleSquad": N has each player choose N Pok\u00e9mon from their own team `

---- Squad battles (Secret Base) ----
A card with "battleSquad": N has each player choose N Pok\u00e9mon from their own team (all of them, if they have N or
fewer that can battle) before the battle; those are the only ones that player can send into the Arena, so they count as
"no replacement left" once they have fainted (see hasBattleReplacementFor()). The choice is local to each device and
ends with the battle (see watchBattleSquad()).

## `// banner, like the card Level / trade picks: tap Pok\u00e9mon to mark them, then Confirm)`

Asks this player for their `count` Pok\u00e9mon, straight from the Team Tracker (it borrows the send-to-battle mode and
banner, like the card Level / trade picks: tap Pok\u00e9mon to mark them, then Confirm), then calls onConfirm (battleSquad is
set by then). onCancel (optional) gives the banner a Cancel button. Nothing is asked when there is nothing to choose: one
Pok\u00e9mon (or no more than are allowed) is just taken; none that can battle says so and calls onCancel.

## `// (placed from the Hand or an active card), it's no longer`

If a Pok\u00e9mon already in the Arena picks up an Overlay Card
(placed from the Hand or an active card), it's no longer
eligible, so it's recalled. Called from renderTeamGrid(), which
every team change passes through. Each half is checked only
if it holds one of THIS device's active team's Pok\u00e9mon.

## `// out of the Arena if the gate closes while it's open (the`

Keeps the menu tile's look in step with the gate, and steps
out of the Arena if the gate closes while it's open (the
active save was unloaded/deleted, or the lobby was left or
dropped). Called from refreshGameUI() and whenever the main
menu is shown.
(Name kept from when only the Arena was gated -- it now covers
every tile marked data-requires-session.)

## `//`

---- Battle Card and Field Move Effect zones -----------------

Two badges per half (Battle Card to the left of the slot card,
Field Move Effect to the right), styled like the slot card's own
corner badges but deliberately separate from it: they belong to
the HALF, not the Pokémon in it, so they stay put when that
Pokémon is swapped or recalled. (They live outside
#game-battle-*-slot, whose contents get rebuilt on every
render.)

MOSTLY PLACEHOLDER for now -- the cards themselves don't exist
in cards.json yet. What's planned:
- Field Move Effect: a new set of cards in cards.json with a
full card image (imageUrl) and thumbnail icon (iconUrl) like
every other card, some carrying values that feed the
calculation (e.g. Rain: +1 Water moves, -1 Fire moves --
see getBattleZoneModifiers()).
- Battle Card: a "battleCard" field on the appropriate cards
in cards.json, plus any bonuses/abilities they add to the
Battle Arena. Played from hand FACEDOWN only during battle
and flipped faceup partway through, hence `faceUp` below.
Nothing reads those cards.json fields yet, and tapping a badge
just says so; the state, badge rendering and the two setters
are here so those pieces can drop in later. Not saved. Both
zones are shared through the lobby Host (see "Field Move
Effects: shared through the Host" and "Battle Cards" below).

battleCard:  { cardId, faceUp } | null
fieldEffect: { cardId } | null

## `// Field Move Effect badge moves to the half's badge line at the`

Gym leader cards never take a Battle Card -- hide its badge. (The
Field Move Effect badge moves to the half's badge line at the
same time -- see syncGymLeaderRowMode() -- so the card stays
centered with nothing on either side.)
Both zone badges (Battle Card, Field Move Effect) are only
shown while a battle is ongoing -- see isBattleOngoingForZones().

## `// The Field Move Effect picker (see openBattleFieldOverlay())`

Put a card in a half's zone (or, with cardId null, empty it).
The Field Move Effect picker (see openBattleFieldOverlay())
calls this; the Battle Card zone has no UI yet, but can be
tried from the console: setBattleZoneCard('attacker',
'fieldEffect', '<a cardId>'). `faceUp` only matters for
battleCard; a Battle Card starts facedown.

## `//`

---- Field Move Effects: shared through the Host ---------------

Same shape as the Battle Cards below, minus the hidden-info
and hand/discard handling: a Field Move Effect is public and
isn't part of any virtual deck, so the Host's store is just
{ attacker: cardId | null, defender: cardId | null } in
hostBattleArenaState.fields, broadcast to everyone with the
rest of the arena state. Everyone's battleZones[...].
fieldEffect is a display mirror of it (renderBattleFieldZones()),
and every device recomputes the modifiers from it locally
(getBattleZoneModifiers()). Solo, soloBattleFields holds it.

Any player at the table may place or remove one -- the
effects belong to the field, not to a Pokémon's owner.
Next Round leaves them alone; End Battle clears them (see
endBattle() and the 'end' branch of hostApplyBattlePhase()).

## `//`

---- Battle Cards ---------------------------------------------

A card tagged "battleCard": "yes" in cards.json. Played
FACEDOWN: the badge shows the card-back glyph, and in a lobby
nobody but the player who played it is told which card it is.
Until it's revealed the owner can change their mind -- Remove
Card, or play a different one (the replaced card goes back to
their hand if it came from there). Once everyone has had the
chance to play one, Reveal Battle Cards turns every facedown
one face up for the whole table, after which it's locked in.
Next Round and End Battle clear both zones; a card that came
out of a hand goes to its deck's discard pile then.

Only the player who owns the Pokémon on a half may put a card
there -- never the Wild Pokémon's half, never another player's.
(A player has only one Pokémon in the Arena at a time, so
there's only one legal half for them.)

Two ways in, chosen by the save's virtual-decks rule:
- ON:  tapping your empty badge opens Hand & Decks,
remembering which half (battleCardPlayTarget); Play on
a tagged card puts it there (playBattleCardFromHand()).
- OFF: there's no hand to play from, so the badge opens the
zone picker overlay with only the tagged cards
(openBattleFieldOverlay(slot, 'battleCard')).
Tapping your own facedown card opens that same overlay with
the card and Remove Card (plus Play a Different Card under
virtual decks); tapping any revealed card just enlarges it.

WHERE THE STATE LIVES: one entry per half,
{ ownerId, cardId, faceUp, fromHand }
in the Host's hostBattleArenaState.cards in a lobby (the Host
does every hand/discard change, so it must know the card), or
in soloBattleCards solo -- the same hostApplyBattleCard*()
functions run against either (peer 'host' solo). Everyone's
battleZones[...].battleCard is just a display mirror of it,
filled by renderBattleCardZones(): in a lobby each player is
sent their own view (battleCardsViewFor()), where a facedown
card's cardId is withheld from everyone but its owner.

## `// Every render compares the hand with the previous one; each card that is new gets a toke`

---- new-arrival glow in the hand ----
Every render compares the hand with the previous one; each card that is new gets a token {cardId, start}. A card
glows while one of its tokens is younger than HAND_GLOW_MS. Tokens are per card, so cards drawn close together
each keep their own full glow. Returns {handIndex: msSinceArrival} for the cards to glow in this render.

## `//`

---- Field Move Effect picker ---------------------------------

Same three states as the Team Tracker's Attach Card panel
(see renderTeamCardSlotPanel(), which this reuses for the
markup): a card in the zone shows its art plus Remove Card;
an empty zone shows a message plus Add Card; Add Card opens
the collapsible-by-deck list of every Field Move Effect card
(groupCardsForSlotByDeck('field')), and picking one commits
immediately via setBattleZoneCard() -- no Confirm step.

One difference from the Attach Card panel: this picker works
whether or not the save uses virtual decks. That setting
hides Add Card on the Attach panel because every attach card
there has real hand/deck inventory behind it, but Field Move
Effect cards aren't part of any virtual deck (see
DECK_TOOL_LIST_BASE), so there's nothing to keep honest.

No read-only/trade/replace guards either: the zones are never
written to a save (see the block comment above battleZones).
In a lobby a pick goes through the Host
(requestBattleFieldEffect()) rather than being set locally.

The same overlay also serves the Battle Card zone when the
save does NOT use virtual decks (see openBattleCardZone()):
battleFieldOverlayZone says which zone it's editing, and
getBattleFieldOverlayPanelSlot() which card list ('field' or
'battle') its Add Card accordion draws from. A card put in
the Battle Card zone this way also goes down facedown.

## `// openTeamDetailOverlay() each already do for their own "which`

Same shiny/formOverride resolution renderTeamGrid() and
openTeamDetailOverlay() each already do for their own "which
art actually represents this member right now" question --
duplicated rather than shared for the same independence
reasoning as everywhere else in this doc, since this is a
third, unrelated screen reading the exact same member shape.

## `// Effect). If that line is wider than the half it sits in, it`

The readouts normally share one line (Status, Attack dice,
Effect). If that line is wider than the half it sits in, it
splits instead of wrapping mid-way, so the Attack dice always
stay together: Status + Effect on one line, the Attack dice on
the other, with the Attack dice on the side nearest the middle
of the Arena (under them for the Defender, above for the
Attacker -- see the -split rules in the CSS).

## `// and whether Begin is tappable. Both halves count as populated`

Which of Begin Battle / Next Round / End Battle is showing,
and whether Begin is tappable. Both halves count as populated
whatever their source (own pick, another player's, Wild).
A battle with nothing left in either half can't still be
"in progress", so that clears it here too.

## `// getBattleSlotThemeColor() -- removed entirely, not set to a`

Keeps each half's data-player-theme in sync with
getBattleSlotThemeColor() -- removed entirely, not set to a
"none" value, when there's no color, so the half falls back to
its default art. Called from renderBattleControls() (which both
slot renderers and every phase change already run) and from
renderLobbyPlayers() (a roster/color change).

## `// typed manual power) and all dice results, and every half's`

Next Round -- clears both halves' selected moves (and any
typed manual power) and all dice results, and every half's
"entered this round" flag (nobody is new any more), keeps the
battle, both Pokémon and the dice counters.
Solo twin of hostAdvanceTrainerIfFainted(). Returns whether it switched.

## `// finishLocalWildCatch()). Hides the moves and recalls both`

End Battle -- also what a successful catch does (see
finishLocalWildCatch()). Hides the moves and recalls both
halves. In a lobby that's the Host's call (everyone's
Pok\u00e9mon go); solo it's done here.
The End Battle button. When neither side has run out of Pok\u00e9mon there is no winner to end on, so it asks first:
confirming forfeits the battle, which counts as a loss for the player who pressed it (see hostPvpOutcome() for what
that changes in a player-vs-player battle). With a clear winner it ends straight away, as before.

## `//`

---- One save, one arena -------------------------------------

The Battle Arena stands for battles within a SINGLE save (solo,
or one lobby), never a mix of two saves on one device. So
whenever this device's active save is about to change, the
arena is cleared first. Called by createSave(), loadSaveSlot(),
deleteSaveSlot(), loadGuestSave(), deleteGuestSave() and
finalizeGuestJoin(), each right BEFORE it switches -- on
purpose: a Battle Card played from a hand goes back to its deck's
discard pile, and that has to land on the save it came from.

newTeamId is what getActiveTeamId() will return afterwards (a
no-op if it's the same save). saveGone: the old save is being
deleted, so there's no deck left to discard to.
- Solo: everything goes (both halves, a Wild Pokémon, the
battle phase, moves, dice, Battle Cards, Field Move Effects).
- Host: the shared arena goes, for everyone -- it belonged to
the save being left -- and the lobby is told.
- Guest: only this player's own Pokémon leave the shared
arena (the table's arena isn't theirs to wipe); anything
left over from before they joined goes too.

## `// Tracker's own Level section, HP's alt2 rule) -- base level`

A member's level shown everywhere else on this screen (Team
Tracker's own Level section, HP's alt2 rule) -- base level
from pokemon-data.json's token_level plus whatever the
player's bumped .game-team-slot-level counter up to. Reused
here rather than duplicated, same getTeamMemberBaseLevel()
this doc's other total-level reads already share.

## `//   attack_strength: { mode: "half_level", of: "self" | "target" })`

A "half_level" move's power (moves.json's
attack_strength: { mode: "half_level", of: "self" | "target" })
-- half of the named Pokémon's total level, rounded DOWN
(Level 7 Seismic Toss -> 7 / 2 = 3.5 -> 3). "self" reads the
Pokémon using the move (slotName's own member); "target"
reads whatever's in the opposite half. Returns null when
that Pokémon isn't there, or `of` isn't one of the two
known values, so a typo in moves.json fails safe (unsupported)
rather than silently using the wrong Pokémon's level.

## `// (name = the move whose moves.json attack_strength applies --`

What actually decides a move's power, as { name, strength }
(name = the move whose moves.json attack_strength applies --
matters for a "manual" entry's typed number). For every
ordinary move that's just its own attack_strength. A Max Move
("derived_from_base_move") follows moves.json's own priority
list: the Pokémon's own pokemon-data.json `maxPower` first
(only G-Max forms have one), else the move it replaced
(baseMoveName, when Dynamaxed) -- its power, and, via
computeBattleAttackStrength(), its STAB. Returns null when
nothing resolves (no Pokémon, unknown move, a Max Move with
neither a maxPower nor a base move).

## `// pokemon-data.json's 'types' field. Reads the active form's own`

A Pokémon's types, lowercase and primary type first, from
pokemon-data.json's `types` field. Reads the active form's own
entry (a Mega/G-Max has its own types), same lookup as
getBattleEffectiveStrength()'s maxPower. Empty when the
Pokémon (or its `types`) isn't in the data, so STAB and type
matchups quietly don't apply rather than guessing -- never
falls back to `tags`, which mix in name words.

## `// types / immunities) for the Battle Arena to hand to`

The Type Effectiveness Rule's two switches (dual defending
types / immunities) for the Battle Arena to hand to
computeTypeMatchup(): the active save's own rule when there is
one (Guest Save first, same order as renderMatchupPanel(),
which locks the Type Matchup tool to it), otherwise whatever
the Type Matchup tool's own toggles currently say.

## `// in the other half, as { label, bonus } with 'bonus' a real`

The Type Matchup tool's result for the move against whatever's
in the other half, as { label, bonus } with `bonus` a real
number (the tool's own map holds display strings like "+3").
Null when there's no target, no known move type, or no known
target types -- no bonus or penalty then. Uses the MOVE ACTUALLY
USED's type (a Dynamaxed Pokémon's Max Move shares its base
move's type), and only the target's first type unless the
save's rule turns dual defending types on.

## `// face-up Battle Card in its half's zone) ----------------------`

---- Card bonuses (Attach/Nature cards on the Pok\u00e9mon, and a
face-up Battle Card in its half's zone) ----------------------

Optional tags on a cards.json entry; a card without them does
nothing here. All numbers are whole numbers (negative allowed).

attackStrengthBonus: n   added to the move's Attack Strength
(power + STAB), BEFORE a status
penalty comes off -- so it also
raises what a Confused backfire sends.
attackTotalBonus: n      added to the final Attack Total only.
backfireStrengthReduction: n   the Attack Strength a Confused
odd roll sends to the opponent counts
n less (never below 0) -- Serious

Optional conditions, applying to both bonuses on that card:
bonusMoveTypes: ["fire"]   only for moves of those types
bonusMinMoveStrength: 1    only if the move's own Attack
Strength (power, before STAB and
bonuses) is at least this -- a
Type Enhancer uses 1 to skip
0-strength moves

Tera Type cards:
teraType: "fire"   the Pok\u00e9mon's types become just this
(getBattleMemberTypes()). Unless the card
sets bonusMoveTypes, its bonuses default
to moves of this type. Tera Stellar has
no teraType, so it does nothing here.

Leftovers-style reroll:
attackRerollsPerBattle: 1     rerolls of the Attack Roll per
battle, for the Pok\u00e9mon
attackRerollTotalPenalty: 1   Attack Total cost, for the round
the reroll is used in

Battle Cards count only once face up (a facedown card's
identity is hidden), for the half whose zone holds them.

## `//`

---- Conditional rules: attackBonuses --------------------------

For bonuses with conditions, a card carries an array of rules:

"attackBonuses": [
{ "applyTo": "total", "amount": 1,
"when": { "opponentLevelHigherBy": 2 } }
]

applyTo   "strength" or "total" (the Attack Strength or the
final Attack Total)
amount    whole number, negative allowed
amountByEffectDie  instead of amount: { "1": -1, "6": 2 } --
the bonus by Effect Die result (0 for any other
result, or if it hasn't been rolled)
when      conditions, ALL of which must hold (none = always):
moveTypes: ["fire"]            the move's type
moveNames: ["Struggle"]        the move's exact name (Relaxed:
Struggle while asleep)
minMoveStrength: 1             the move's own power
opponentLevelHigherBy: 2       opponent's level minus own
moveEffective: true            effective/super-effective
hasStatusCondition: false      has any status condition
status: "confused"             has that status
teamMemberFaintedLastRound: true   one of the owner's
Pok\u00e9mon fainted last round
hasDefeatedThisBattle: true    this one defeated a Pok\u00e9mon
otherTeamMemberParticipated: true  another team member has
held a slot this battle
totalLeadAtLeast: 3            own Attack Total beats the
opponent's by this much, right now
defeatedWithTotalLeadAtLeast: 3  EARNED: when this Pok\u00e9mon
defeats its opponent in a round in
which its Attack Total led by this
much, it carries the bonus for every
round after that, the rest of the
battle (Impish, Naughty). Only
earned once per battle.
oncePerBattle  true: counts for one round per battle -- spent
when a round ends with it in effect (Next Round)
last      (strength rules) apply after everything else,
even the status penalty
strengthCap  (strength rules) the bonus never takes the Attack
Strength above this
label     shown in the readout instead of the card's name

The flat tags above are just shorthand for one rule each.
"totalLeadAtLeast" rules compare each side's total WITHOUT any
such rules, so two of them never depend on each other. The same
goes for the lead measured at a defeat.

## `//`

---- What happened this battle (shared through the Host) ----

{ round, faints: [{ o: owner, u: member uid, r: round, d?: the
defeat it was credited as, e?: bonuses it earned }],
defeats: { 'owner|uid': n }, seen: { owner: [uid, ...] },
spent: { ruleKey: true }, earned: { ruleKey: round earned } }.
It's what the conditions about fainting, defeating, team
members taking part, and once-per-battle bonuses read.
Solo it's battleRecord; in a Lobby the Host keeps it in
hostBattleArenaState.record and everyone's battleRecord is a
copy. A team member fainting (faintTeamMember()) is reported
to the Host, who decides if it was a defeat. "Owner" is the
lobby player id, or 'solo'.

## `// cards.json: "permanentCounterEffect": { "effect": "radioLullaby", "discardWhenEmpty": t`

---- Radio: PKMN Lullaby ----
cards.json: "permanentCounterEffect": { "effect": "radioLullaby", "discardWhenEmpty": true } (2 Permanent counters).
When this player's Pok\u00e9mon takes part in a Battle (their owner id is in the battle record's `seen`), the card loses a counter
-- once per card per Battle -- and the Battle's record is marked `lullaby`. From then on, at every Next Round, each Pok\u00e9mon in the
Arena that USED A MOVE in the round just ended falls asleep. "Used a Move" = its half's Attack Die was rolled while it held
the half (record.moved[slot] is its uid; a Pok\u00e9mon swapped in afterwards, e.g. by a move that switches its user or opponent,
hasn't used one). The card is discarded when its last counter goes, but the effect lasts for the rest of that Battle.
Whoever owns the Pok\u00e9mon puts it to sleep on their own device (record.sleepNow, like Paralyzed's reset in applyIncomingArenaState());
the Host does it for wild / Trainer Pok\u00e9mon and Gym Leader / Rival cards, solo does it in nextBattleRound(). Sleep is only added
when there's no Status already. Only owners of a Pok\u00e9mon in the battle are participants (record.seen), so a player who merely
controls the wild / Trainer / Gym Leader half neither spends their own card nor has their own Pok\u00e9mon affected.

## `// credit): any bonus on that Pok\u00e9mon that's earned by defeating`

A defeat just happened (fall.cs is the half that got the
credit): any bonus on that Pok\u00e9mon that's earned by defeating
its opponent with a big enough Attack Total lead is earned now,
judged on this round's totals as they stand. Needs both halves
to have a move chosen; carries from the next round on.

## `// device's own team.`

Called by faintTeamMember()/reviveTeamMember() for this
device's own team.
isWild: the fainting one is the ownerless Wild Pok\u00e9mon in the
Defender half (fainted from its HP badge there) rather than
one of this player's team -- it's recorded with no owner, so
it still counts as a defeat for whoever it was facing but
never as "one of your Pok\u00e9mon fainted" (Brave).

## `// together as one unit (rather than folded straight into the`

A move's Attack Strength: its static power plus STAB, kept
together as one unit (rather than folded straight into the
total) because card/game effects can alter specifically this
part of the calculation. STAB applies when the move (the one
whose attack_strength is in play -- for a Dynamaxed Pokémon
that's the BASE move a Max Move stands in for, so the Max
Move inherits the base move's STAB and doesn't add its own;
the Max Move itself is flagged "stab": "false" -- confirmed
against the TableTop Simulator mod) shares a type with the
Pokémon using it. Returns { power, stab, total } or
null when the power isn't known yet.

## `// zones (see battleZones), as an array of { label, bonus }`

Extra modifiers to the calculation from the Field Move Effect
zones (see battleZones), as an array of { label, bonus }
(bonus a whole number, may be negative) that
computeBattleMoveBreakdown() adds to the total and the
readout lists. The Battle Card zone contributes nothing yet.

Field Move Effect cards in cards.json carry either or both of:

typeModifiers: [{ types: ["water"], bonus: 1 }, ...]
-- keyed on the MOVE: a move whose type is in `types`
gets `bonus`. One entry can list several types, and
one card can have several entries (Rain: Water +1,
Fire -1).

pokemonModifiers: [{ ...conditions, bonus | bonusByEffectiveness }]
-- keyed on the POKÉMON using the move. Every condition
present must hold for the entry to apply:
unlessTypes: ["ice"]    skipped if the Pokémon has
ANY of these types
enteredThisRound: true  only if it entered its half
this round
(battleEnteredThisRound)
and the amount is either
bonus: -1               a flat number, or
effectivenessVs: "rock",
bonusByEffectiveness: { weak: -2, neutral: -1, resist: 0 }
by how the Pokémon matches up
against a move of that type
(computeTypeMatchup(), under
the save's Type Effectiveness
Rule; immune counts as
resist). A missing key = 0.
Type-based conditions don't apply when the Pokémon's
types aren't in pokemon-data.json (same "never guess"
rule as STAB and the matchup bonus).

appliesTo: "both" | "own"  (optional, default "both")
-- "both": applies to either half. "own": only the half
whose zone holds the card. (No card affects only the
opposing half.)

The same card in both halves' zones counts only once -- copies
of one card don't stack. Two DIFFERENT field cards do both
apply. Entries that work out to 0 aren't listed.

## `// show as well as add up:`

Every piece of the Attack Calculator's math, for the readout to
show as well as add up:
total = Attack Strength (power + STAB)
+ the user's own total level
+ the Type Matchup bonus (when there's a target)
+ any Battle Card / Field Move Effect modifiers
+ the Attack Dice rolled for this half, minus any the
player tapped to exclude (see battleDiceResults)
Power itself comes from getBattleEffectiveStrength() -- see
that and getBattleHalfLevelPower()/openBattleManualOverlay()
for the fixed / half-level / manual / Max Move cases. Returns
{ power, stab, attackStrength, level, matchup, modifiers, dice,
total } (`dice` null until Attack Dice have been rolled) (`matchup` null when there's no bonus to apply;
`modifiers` an array, usually empty), or null when
the slot has no Pokémon, a half-level move's target isn't
there, a "manual" move hasn't had its number entered yet, or
a Max Move has nothing to derive its power from.
The Attack Strength reduction a Pokémon's status card imposes
("attackStrengthPenalty", Burned's -1), as { amount, name }, or
null when there isn't one.

## `// penalty: { power, stab, total, penalty }, where 'penalty' is`

A move's Attack Strength (power + STAB) after the status
penalty: { power, stab, total, penalty }, where `penalty` is
{ amount (what was actually taken off -- the total stops at
0), name } or null when nothing was taken. Null when the move
has no usable strength.

## `// { amount, status } when the other Pokémon is Confused, has`

What the OPPOSING half's confusion adds to this half's total:
{ amount, status } when the other Pokémon is Confused, has
picked a move, and its counted dice came up odd -- amount is
that Pokémon's own Attack Strength. Built straight from the
other half's own pieces (never its full breakdown), so two
Confused Pokémon can't chase each other in a loop. Everything
it reads is shared state, so every screen agrees.

## `// called by every setter/recall below that changes (or clears)`

The one authoritative way to blank a half's calc result --
called by every setter/recall below that changes (or clears)
what's in that slot, since a move tapped for a DIFFERENT
Pokémon has nothing meaningful left to compute once that
Pokémon is gone. Doesn't repaint itself, same "caller owns the
repaint" convention as every setter in this file -- every call
site already re-renders the slot right after.

## `// move-button highlight and the arena box's details and Attack`

Refreshes everything shown for one half's selected move: the
move-button highlight and the arena box's details and Attack
Total calculation (renderBattleMoveDetails()). Used to paint a
readout over the slot card; that now lives in the box -- called from renderBattleAttackerSlot()/
renderBattleDefenderSlot() so it's always current, and
recomputes from computeBattleMoveValue() fresh every time
rather than reading a cached number, so a level bump or a
Pokémon swap made after the move was tapped shows up here on
the very next render same as everywhere else on this screen.
isMirror: this call is only the refresh of the other half's
readout that every readout draw triggers (Confused makes each
half's number depend on the other's roll) -- it doesn't
trigger one back.

## `// attack_strength.mode is "manual" (Beat Up, Dream Eater,`

Manual-power prompt -- for moves whose moves.json
attack_strength.mode is "manual" (Beat Up, Dream Eater,
...), whose power can't be derived from a fixed number or a
level. Shows the move's uniqueEffect text (the instructions
for working out the number) and asks the player to type it;
the number then feeds computeBattleMoveValue() as the move's
power. A Dynamaxed Pokémon's Max Move standing in for a
manual move asks for the BASE move's number (and shows its
uniqueEffect), since that's what supplies the power. Which
half/move the open prompt is for:

## `// moves.json itself: the "Max ..." entries whose power is`

The Max Move for a type ("fire" -> "Max Flare"), read from
moves.json itself: the "Max ..." entries whose power is
derived from a base move. Max Guard is excluded (fixed
power, used only for 0-power moves regardless of type).
Null before moves.json loads or for a type with no Max Move.

## `// with 0 power (status moves) becomes Max Guard regardless of`

The Max Move a known move becomes while Dynamaxed: any move
with 0 power (status moves) becomes Max Guard regardless of
type; everything else becomes the Max Move of its own type
(Normal -> Max Strike). Not limited to known_moves: per the
game's rules TM Moves and Z-Moves also become Max Moves when
Dynamaxed, and this works for any move moves.json lists
(a Z-Move maps by its type like any other; its own "stab":
"false" flag carries through to the Max Move it becomes, see
computeBattleAttackStrength()). Returns null when it can't tell
(moves.json not loaded or the move isn't listed), so the
caller can leave that move as it was.

## `// { name, base } -- name is what's shown/tapped, base is the`

The buttons to draw for a member: one per known move, each
{ name, base } -- name is what's shown/tapped, base is the
known move it replaced (null when not Dynamaxed). A move that
can't be mapped, or that's already a Max/G-Max move, stays
as itself.
The move a status card forces in place of the Pokémon's own
(a typeless, 0-power entry in moves.json).

## `// { card, id, name } (null with no status). cards.json carries`

The card a Pokémon's status condition is currently showing, as
{ card, id, name } (null with no status). cards.json carries
each status's battle effects as fields on these cards, so
they're per card side (Sleep and Paralyzed have one card per
side -- see statusCardIdFor()):
"useStruggle": "yes"        forces Struggle (below)
"attackStrengthPenalty": n  Attack Strength -n, never below 0
"oddRollBackfire": "yes"    an odd Attack Die total adds this
Pokémon's own Attack Strength to
the opponent's total

## `// POKEMON_BY_NAME). A Mega/G-Max form showing via formOverride`

Moves come from pokemon-data.json's known_moves (see
POKEMON_BY_NAME). A Mega/G-Max form showing via formOverride
has its own entry with its own moves, so that one wins.

On top of those, the equipped Attach Card can teach more (see
getBattleMemberAttachCardMoves() just below): a TM's one move, or a
Z-Crystal's Z-Moves. They're appended after the known moves,
and a card move the Pokémon already knows isn't listed twice.
No Dynamax code needed to change for them -- game rule: TM
Moves and Z-Moves BOTH also become Max Moves while the
Pokémon is Dynamaxed, and getBattleMemberMoveButtons()/
getMaxMoveForKnownMove() already treat any move in this list
that way (by type, or Max Guard for 0 power).

## `// the card's own order. Reads ONLY member.attachCardId -- the card`

The moves this member's equipped Attach Card lets it use, in
the card's own order. Reads ONLY member.attachCardId -- the card
in the Attach Cards corner badge -- and has nothing to do with
the Battle Card / Field Move Effect zones (see battleZones),
which stay their own separate mechanic. Two shapes, both from cards.json:
- TM cards:        taught_move  -- a single move name
- Z-Crystal cards: taught_moves -- an array (the type's
generic Z-Move first, then that type's
Pokémon-specific ones)
A move whose moves.json entry has an `exclusive_to` list is
only offered when the Pokémon's CURRENT form name is on it
(formOverride first, same lookup as every other form-aware
read here) -- exact names as they appear in pokemon-data.json,
so a G-Max form has to be listed itself (Pulverizing Pancake
lists both "Snorlax" and "G-Max Snorlax"), while a Mega form
is never listed. Moves with no `exclusive_to` are open to any
holder. A move moves.json doesn't list (or hasn't loaded yet)
is skipped rather than guessed at -- it couldn't be checked
for exclusivity, and moves.json's own load re-renders both
halves (see its fetch), so it appears the moment it can be
verified. Empty for no card, a card that teaches nothing, or
a Wild Pokémon (which never has an Attach Card).

## `// in the same spot (see getBattleStruggleStatus()).`

The forced Struggle button carries a "forced by <status>" label
in the same spot (see getBattleStruggleStatus()).
Every Max Move button carries a small "from X" label naming
the known move it replaced -- it's what tells apart two
known moves that became the same Max Move (say two Normal
moves -> Max Strike) but have different powers, and it
keeps the buttons consistent when only some collide.
A move whose type is known (see getBattleMoveType()) borrows
the Pokédex overlay's type-badge color via the same
.poke-type-<type> classes (game-battle-move-typed marks
these). Unknown types (moves.json missing, unlisted move)
keep the stock look.

## `// no player -- the Wild Pokemon on the Defender side, the NPC`

True when the Pokemon (or Gym Leader card) in a half belongs to
no player -- the Wild Pokemon on the Defender side, the NPC
Trainer's on the Attacker side. In a lobby that's an arena
entry with no ownerId; solo it's the 'wild' / 'trainer'
sentinel index (see getArenaWildDefender() /
getArenaTrainerAttacker()).

## `// half at random and selects it like a tap. Moves that couldn't be`

Random button: picks one of the moves currently showing for this
half at random and selects it like a tap. Moves that couldn't be
selected anyway (unsupported, or waiting on a target) are left
out of the draw so one press always lands on a usable move.

## `// renderBattleDefenderSlotCard()) copies the Evolution corner's`

A cloned .game-team-slot (see renderBattleAttackerSlotCard() /
renderBattleDefenderSlotCard()) copies the Evolution corner's
stacked icons but not the setInterval driving them -- that
timer keeps flipping classes on the ORIGINAL tile in Team
Tracker's grid -- so a multi-icon badge would sit frozen on
one frame. This starts a timer against the clone's own badge
and stores it in battleReadonlyEvolutionIntervals[slotName],
which the slot-card renders already clear before every
redraw (clearBattleReadonlyEvolutionTimer()), so nothing
leaks. A single-icon badge has no .evolution-cycle-layer
elements at all, and startEvolutionBadgeCycle() returns null
for it, so this is a no-op there.

## `// battleAttackerMemberIndex currently points at -- called on`

Redraws the Attacker slot against whatever
battleAttackerMemberIndex currently points at -- called on
opening the screen (see setGameScreen()), right after a new
pick (selectBattleAttacker()), and from the tail of
renderTeamGrid() itself so every edit made anywhere (HP,
status, level, Attach/Nature cards, Evolution) stays reflected
here too, same "always rebuilt from the live member, never
trusted stale" convention as renderTeamDetailHpSection() and
its siblings.

Rather than building a second, simplified copy of that whole
tile from scratch, this clones the actual .game-team-slot node
#game-team-grid already rendered for this member -- that grid
stays fully rendered in the DOM even while a different screen
is active (setGameScreen() only ever toggles which .game-screen
has .active, never removes the others' content), so its slot
for this index is always current the moment renderTeamGrid()
last ran. The clone still responds to every corner tap (HP,
Status, Attach/Nature Cards, Level, Evolution) and to tapping
the tile itself to open the full Team Detail view, exactly
like the original does -- #game-scroll's single delegated
click listener (see its own comment) matches on class and
data-index, not on which specific node fired it, and every
overlay those corners open is itself a sibling of #game-scroll
(positioned against #game-panel as a whole), so it displays
correctly on top of Battle Arena too. An Evolution
corner's multi-icon animation (see startEvolutionBadgeCycle())
doesn't come along with cloneNode() -- its interval keeps
updating the original node -- so the clone gets its own timer
from startClonedEvolutionBadgeCycle(). Falls back to the empty state if the
index no longer resolves to anything (roster changed since
the pick, or nothing picked yet).

## `// lobby. If it currently holds another player's Pokémon,`

Multiplayer: there's only ONE Attacker half for the whole
lobby. If it currently holds another player's Pokémon,
this device just watches it -- no controls, and no
picker either, since that half isn't free to take.
Solo (getArenaSlotEntry() is always null then) and
"empty or mine" both fall through to the original
local-pick rendering below.

## `// battleAttackerTeamId's own comment -- the whole point of`

A pick made while a DIFFERENT save was active (see
battleAttackerTeamId's own comment -- the whole point of
stamping a team onto this pick is letting Attacker/
Defender come from two different saves) can't be cloned
off #game-team-grid below: that grid only ever renders
whichever save is active RIGHT NOW (see renderTeamGrid()),
so reaching into it for a different save's member would
either find nothing, or worse, silently clone whatever
OTHER Pokémon happens to sit at the same index in THIS
save's own roster instead. Recall still works either way
(clearing a pick you can't currently see is still a real
action -- see recallBattleAttacker()), but the pick itself
is left alone rather than wiped just because its save
isn't the one on screen at this exact moment -- switching
back to it brings the real card back.

## `// roster every time it opens (rather than once up front) --`

Fills the picker's grid from the active save's current
roster every time it opens (rather than once up front) --
same reasoning as every other on-demand render in this file,
since the roster can change between visits (Team Tracker
additions/releases, a guest save syncing in). Toggles the
list and its "add one first" empty text opposite each other,
same one-or-the-other convention as .game-save-slot-loaded/
-empty.

## `// *Defender* -- picking it here (see selectBattleAttacker())`

Flagged only when this individual is currently the
*Defender* -- picking it here (see selectBattleAttacker())
moves it out of that half via setBattleAttackerIndex(),
so the badge is what tells the player that's about to
happen before they tap it. Not shown for the Attacker's
own current pick -- reselecting that one is a no-op.

## `// where every single item would be an invalid pick -- this`

Refuses to open at all rather than opening onto a list
where every single item would be an invalid pick -- this
picker always lists the CURRENTLY active team's roster
(see renderBattleAttackerPicker() above), so if Defender
is already holding a member of that same team, literally
every item here would violate the same-team rule. See
isBattleAttackerBlockedByActiveTeam()'s own comment for
why this is a flat refusal rather than something
resolved per-item the way the individual-Pokémon badge
is.

## `// Sending a Pokémon into a half that already holds another`

---- Replace confirmation for the shared Battle Arena ----
Sending a Pokémon into a half that already holds another
player's Pokémon, or an ownerless one (the Wild Pokémon),
takes it out of the Arena for everyone -- so every path that
does that asks first. Sending over your own pick (or into an
empty half, or solo where getArenaSlotEntry() is always null)
never prompts.

## `// clears the slot straight back to its empty state rather than`

Recall button's handler -- the inverse of selectBattleAttacker():
clears the slot straight back to its empty state rather than
opening the picker. Same read-only-is-fine reasoning as
openBattleAttackerPicker() (see the click handler below):
this only clears this screen's own display, it never writes
anything back to the save. Clears battleAttackerTeamId
alongside the index -- same "kept in lockstep" invariant as
setBattleAttackerIndex()/renderBattleAttackerSlot().

## `// just above -- same clone-the-live-.game-team-slot approach,`

Defender half's own equivalent of renderBattleAttackerSlot()
just above -- same clone-the-live-.game-team-slot approach,
same "always rebuilt, never trusted stale" reasoning, same
team-mismatch handling (see that function's own comment), and
called from all the same places (setGameScreen(), its own
pick/recall, and renderTeamGrid()'s tail), just against
battleDefenderMemberIndex/battleDefenderTeamId and
#game-battle-defender-slot instead. Duplicated rather than
parameterized into one shared function, same independence
reasoning as every other near-identical pair in this doc --
Attacker and Defender won't necessarily always want to stay
in lockstep.

## `// comment for the general idea. Defender additionally has`

Multiplayer -- see renderBattleAttackerSlot()'s own
comment for the general idea. Defender additionally has
the ownerless Wild Pokémon case:
- another player's own Pokémon (PvP): watch only.
- the Wild Pokémon: interactive for whoever
canControlWildDefender() says (everyone except the
Attacker's owner), read-only for that owner -- who is
the only one canCatchWildDefender() lets catch it.
Recall stays available to everyone (the acting
player fleeing, or the other side calling it off).

## `// clone from below -- it was never added to a roster at`

A Wild Pokémon has no live .game-team-slot anywhere to
clone from below -- it was never added to a roster at
all -- so it gets its own render path entirely, built
fresh from battleWildPokemon every time rather than
cloned from the DOM. Checked before the team-mismatch
branch just below since battleDefenderTeamId is always
the fixed 'wild' sentinel here, which (by design -- see
getActiveTeamId()'s own comment) can never equal a real
save's team id, so that branch would otherwise always
catch this case first and show the wrong message.

## `// above -- renderBattleWildDefenderSlotBody() rebuilds just this`

Wild Pokémon's own equivalent of activeEvolutionBadgeIntervals
above -- renderBattleWildDefenderSlotBody() rebuilds just this
one slot rather than a whole grid, so there's no
"renderTeamGrid() clears the shared array at the top of every
call" cleanup happening on its behalf. Tracks (and clears,
before ever starting a new one) just the one interval this
slot's own Evolution corner might be running, so repeated
re-renders (an HP edit, a level tap, anything that calls
renderBattleDefenderSlot() again) can't leak an accumulating
pile of timers the way relying on the shared array here would.

## `// battleWildPokemon, rather than cloning a live .game-team-slot`

Builds the Wild Pokémon's own slot markup fresh from
battleWildPokemon, rather than cloning a live .game-team-slot
the way a real roster member's half does (see
renderBattleDefenderSlot()'s own comment for why one doesn't
exist to clone here). Reuses the exact same badge builders
renderTeamGrid() itself uses -- buildHpBadge()/buildCardsBadge()/
buildStatusBadge()/buildLevelBadge(), all with the 'wild'
sentinel as their index -- so HP, Status, Level and Attach/
Nature Cards all stay fully interactive through the very same
#game-scroll delegated listener branches a real team member
uses (see getTeamSlotMember()/persistTeamSlotChange()'s own
comments for how those branches tell the two apart). No
Overlay Card center slot, unlike a real roster member --
that's tied into the same evolution system as ordinary stage
evolution and legendary_evolve, both likewise left out here
(see shouldShowWildEvolutionBadge()'s own comment) -- and no
hit-zone either, since that's what Team Tracker's own Replace/
Release/Trade/Send-to-Battle modes tap into, none of which a
Wild Pokémon ever participates in.

The Evolution corner itself IS built here, conditionally --
per the chat this was scoped in, only when
shouldShowWildEvolutionBadge() says this Pokémon would house a
Mega Evolution or a Gigantamax right now. Markup is identical
to renderTeamGrid()'s own Evolution corner (single static icon
for one type, a crossfading stack for both at once), and fully
tappable through the very same #game-scroll delegated
listener's own .game-team-slot-evolution branch a real team
member uses (data-index="wild" flows through
getTeamSlotMember()/persistTeamSlotChange() there exactly like
the other four corners) -- openTeamEvolutionOverlay() filters
the options list down to just mega/gmax for this sentinel, and
renderTeamEvolutionOptions() skips the card-requirement
reminder line entirely for it (see both of their own comments)
since a Wild Pokémon plays by different rules than one on a
player's own team.
Gym Leader cards in the Arena: a playing-card-sized image (no token
frame) with only two corners -- HP/Fainted (top-left) and Status
(bottom-left). No Cards, Level, or Evolution corners: these
never carry attach/nature/overlay cards, never evolve, and their
level is printed on the card. index is the same sentinel the
token slot uses ('trainer', or 'readonly' for the read-only view),
so the HP/Status corners' existing click handling just works.
Gym leader card in a half: that half's HP badge, Status badge and
Field Move Effect badge share one line of their own -- above the
card on the Defender side, below it on the Attacker side -- and
the Battle Card badge is hidden (see renderBattleZoneBadge()).
Anything else in the half (a token, empty): the Field Move Effect
badge goes back to its usual place in the slot row and the line
is removed, leaving the half exactly as it always was. Called at
the top of both slot-card renderers, so the line can never be
left behind by a render path that skips the others.

## `// computeTeamEvolutionState()'s own comment) shows that`

A toggled-on Mega/Gigantamax (member.formOverride -- see
computeTeamEvolutionState()'s own comment) shows that
alt-form's art instead of the base species' own, same
overrideEntry logic renderTeamGrid() uses for a real team
member -- reachable here too now that the Evolution corner
just below is actually wired up rather than just visible.
Falls back to the member's own art if the override name
somehow isn't in POKEMON_BY_NAME.

## `// reasoning as recallBattleAttacker() just above, including`

Recall button's handler for the Defender half -- same
reasoning as recallBattleAttacker() just above, including
clearing battleDefenderTeamId alongside the index. Also
clears battleWildPokemon -- harmless when Defender wasn't
holding a Wild Pokémon to begin with, and keeps no stale
Wild Pokémon data lingering in memory once it's been
recalled.

## `// ownerless Wild Pokémon can be recalled by anyone who can`

Once a Lobby session exists, clear the shared half too: an
ownerless Wild Pokémon can be recalled by anyone who can
see the button (the acting player fleeing, or the other
side calling it off), while a real pick of this device's
own goes through the usual own-slot-only sync.

## `// Tracker's own full-roster flow (addOrQueueTeamMember()'s own`

"Catch This Pokémon" -- hands battleWildPokemon off to Team
Tracker's own full-roster flow (addOrQueueTeamMember()'s own
push-or-beginTeamReplaceMode() branch) rather than routing
through addOrQueueTeamMember() itself, since that function
always builds a brand-new level-0 member from a bare
{dex,name,src,shinysrc,shiny} shape -- exactly wrong here,
where the whole point of "as is" (see the chat this was
scoped in) is that whatever HP, level, status, and attached
cards this Wild Pokémon has already picked up during the
battle come along for the ride, not just its species/shiny.
isActiveSaveReadOnly() guarded here for the same "shouldn't be
reachable in practice, cheap insurance anyway" reasoning as
every other action on this screen.

Reverts an active Mega Evolution/Gigantamax first, per the
chat this was scoped in -- same formOverride-clear-and-
reconcile-HP sequence the Evolution corner's own revert uses
(see the #game-scroll delegated listener's own
.game-team-slot-evolution branch) -- a caught Pokémon always
starts life on the team back at its base form, regardless of
what it happened to be showing as a Wild Pokémon the moment
before.

Clears the Wild Pokémon encounter itself (recallBattleDefender())
before ever touching the roster -- once caught, it's not "the
opponent" anymore. That also means backing out of a
subsequent full-roster prompt via Cancel loses this Pokémon
entirely rather than handing it back to Defender -- see
#game-team-replace-cancel-btn's own comment for why that's
exactly how a Permanent card's own pokemonPick already works
in the same situation, not a gap specific to this path.
The actual "take this Pokémon and add it to MY OWN roster"
step -- pulled out of catchWildPokemon() so the exact same
logic runs whether this device just caught its own local/solo
Wild Pokémon, the Host catching its own in a shared Lobby
session (see hostApplyBattleCatchWild()), or a Guest applying
a catch the Host just confirmed belongs to THEM (see the
'battle-caught' handler in wireGuestConnection()).
isActiveSaveReadOnly() guarded here rather than only in
catchWildPokemon() so a stale/late 'battle-caught' arriving
after this device's own save somehow went read-only can't
slip a member onto it anyway.

## `// cleared and, under the HP rules that track a number, HP is`

A caught Pok\u00e9mon joins the team healthy: Fainted is
cleared and, under the HP rules that track a number, HP is
refilled to its max (same as reviveTeamMember(), minus the
battle-record report -- the battle is over). Done after the
form reset above so the max matches its base form, and
before the roster/replace split so both paths get it.

## `// this Pokémon ended up" reasoning as confirmTeamAddSelection()'s`

Same "always land on Team Tracker so the player can see where
this Pokémon ended up" reasoning as confirmTeamAddSelection()'s
own tail -- true whether it landed immediately or is now
waiting on a replace choice. Shared by catchWildPokemon()
below, hostApplyBattleCatchWild()'s own Host-catches-for-
itself branch, and the 'battle-caught' handler a Guest
receives once the Host confirms THEY won the claim.

## `// "Gotcha!" result (see resolveCatchAttempt()). Leaving the Battle screen drops a resolve`

In a Lobby a Guest's catch is confirmed by the Host, so this runs AFTER the Catch dialog has already shown its
"Gotcha!" result (see resolveCatchAttempt()). Leaving the Battle screen drops a resolved attempt and hides the
dialog, so it is put back afterwards, on top of the Team screen -- which is how a solo catch ends up too.

## `// Tracker's own full-roster flow rather than routing through`

"Catch This Pokémon" -- hands battleWildPokemon off to Team
Tracker's own full-roster flow rather than routing through
addOrQueueTeamMember() itself, since that function always
builds a brand-new level-0 member from a bare
{dex,name,src,shinysrc,shiny} shape -- exactly wrong here,
where whatever HP, level, status, and attached cards this
Wild Pokémon has already picked up during the battle come
along for the ride. This is the solo/offline path straight
off the local battleWildPokemon variable -- once a Lobby
session exists, this button instead goes through
requestBattleCatchWild() so the Host can arbitrate two
players catching the same shared Wild Pokémon at once (see
the #game-scroll delegated listener's own branch on this
button, and hostApplyBattleCatchWild()).

## `// .game-permanent-card-add-to-team-btn) -- only ever shown for`

Permanent Cards panel's own "Add to Team" button (see
.game-permanent-card-add-to-team-btn) -- only ever shown for
a cardNeedsPokemonChoice() card that's already landed in
Permanent with its own pokemonPick (see
renderPermanentCardViewer()). Reuses
addOrQueueTeamMember() -- same "push if there's room,
otherwise beginTeamReplaceMode()" behavior as picking a
Pokémon straight off the gallery via Team Tracker's own Add a
Pokémon button, just sourced from this card's own pokemonPick
instead of a live gallery <img> (see the chat this was
designed in). No shiny art is stored on a pokemonPick, so
this always adds the regular (non-shiny) form. instanceId is
this card's own instanceId, passed straight through to
addOrQueueTeamMember() so it can Discard the card once its
Pokémon actually lands on the team (immediately if there's
room, or once a pending replacement resolves if not -- see
its own comment).

## `// null while it's closed. Set by openBadgeOverlay()/`

Which slot the confirm/choice overlay is currently open for --
null while it's closed. Set by openBadgeOverlay()/
openPoolBadgeOverlay(), read by the overlay's own button
handlers further down so they know what they're actually
confirming/choosing/removing. category is null for a
main-grid slot, matching buildBadgeSlots()'s own convention.
slotKey is a Tier-derived key for most categories, but a pool
*position* (0-based) for POOL_BASED_EXTRA_CATEGORIES.

## `// openBadgeOverlay() above -- slotKey here is a pool *position*`

Path of Legends/Starfall Street's own version of
openBadgeOverlay() above -- slotKey here is a pool *position*
(0-based index into data.badges.collectedExtras[category]'s
array), not a Tier-derived key, and "which named badges are
choosable" means "not already collected anywhere else in this
set" rather than "assigned to this specific slot."

## `// this shows every badge from the set that isn't already`

Every empty slot in this set is interchangeable, so
this shows every badge from the set that isn't already
collected somewhere else in it -- not just "the one
assigned to this slot," since none is. Whichever one
gets picked fills the next open slot (see
collectBadge()), which may or may not be this exact
one depending on what else is already collected.

## `//`

---- Victory screen ---------------------------------------------

Shown on every device in the lobby at once (and on a solo device). The Host runs it: it switches the Sounds panel
to the Victory playlist, tells every guest ('victory') and shows it itself; a guest's own trigger just asks the
Host ('victory-request'), which fills in who they are. Each device words the line for itself -- "you are" on the
winner's own device, the winner's name everywhere else. Confirm only closes it on that device.

## `//`

---- Earned Badges ---------------------------------------------

Ending a battle with a Gym Leader / Elite Four / Villain / Titan
card fully knocked out (and the other side NOT also wiped out --
a tie earns nothing) opens the Badge Tracker on the matching
Badge's overlay in \"earned\" mode: \"You Earned a ... Badge!\",
Confirm only, and a tap outside the card counts as Confirm.
There is no way to decline it: leaving the Badge Tracker, closing
the game panel or the page flushes every pending award straight
into its slot (see flushGymBadgeAwards()).

Which Badge is looked up in the ACTIVE save's region, not the
card's own, so shuffled Gym Leaders work: a Gym Leader card
fills the slot for its Tier; Elite Four and Villain cards fill
the region's Elite Four / Villain slot (a region with no Villain
Badge but a Starfall Street set uses that set); Titans use Path
of Legends. When the card's own `badge` id is one of the
candidates it wins; otherwise (or with several candidates, as
in the pool-based sets) the player picks from the candidates.

var, not let: setGameScreen()/closeGamePanel() read these and can
run before this point of the script has executed.

## `// card beaten in battle (award.leaderId), or, for a manually`

The celebration's title. It's worded from a \"source card\": the
card beaten in battle (award.leaderId), or, for a manually
collected Badge, the card whose `badge` is that Badge -- so
Segin always goes with the Dark Badge, and so on. Cards with
no special wording (and a choice between Badges, which has no
single card) use the generic \"You Earned ... Badge!\".

## `// could hold in optionIds (not yet filtered to what is still open). Null for cards that a`

The Badge slot a Gym Leader / Elite Four / Villain / Titan card fills, with every Badge that slot
could hold in optionIds (not yet filtered to what is still open). Null for cards that award nothing
(Champions, Rivals) or when the Badge data hasn't loaded.

## `// Gym Leader of that Tier, so beating one also counts as beating the alternatives. Champi`

Whether this player already holds the Badge a card would award. A Gym Badge slot is shared by every
Gym Leader of that Tier, so beating one also counts as beating the alternatives. Champions have no
Badge, so this is always false for them (their win is the championDefeated flag -- see recordChampionDefeated()).

## `// the rest of a player's data, including through a host handoff). It's what unlocks the H`

Champions have no Badge, so their win is recorded as a flag on the winner's own save instead (carried along with
the rest of a player's data, including through a host handoff). It's what unlocks the Hall of Fame / Victory
action on the board (see boardServiceActionLock()). Arrives through the same path as a Badge: the Arena's End
Battle for a Champion card knocked out for good, on the Host for every player who took part.

## `// victory. Runs where the battle ends -- the solo device, or the Host for a lobby -- with`

No Virtual Game Board for this save: there's no Hall of Fame space to walk to, so beating the Champion IS the
victory. Runs where the battle ends -- the solo device, or the Host for a lobby -- with everyone who took part
as the winners. (With virtual tokens on the map, the Victory action on the board is what starts it instead.)

## `// +1 Item Card always; +5 Poké Coins with the Poké Coins rule; and +1 Master Ball (that p`

Rewards for earning a Badge, shown whether or not virtual decks are on (on paper the message is the reminder):
+1 Item Card always; +5 Poké Coins with the Poké Coins rule; and +1 Master Ball (that player's own first Villain Badge).
With virtual decks on the cards go to the hand: the Master Ball as the message appears, the Item Card once it is closed.

## `// on Confirm (see collectBadge()'s silent flag).`

The jingle plays now, over the coin/confetti, rather than
on Confirm (see collectBadge()'s silent flag).
A single Badge goes into its slot right here, as the jingle
starts (collectBadge() plays it), so any Game Stage change
it causes happens while the music is still ducked and the
original music doesn't come back up on the old stage. A
choice between Badges can only be placed once picked.

## `// reminder only the first time too); with virtual decks the card's own one-time claim cou`

A Villain team's Badge gives the Master Ball once per player. It's tracked in the player's own save (so paper players get the
reminder only the first time too); with virtual decks the card's own one-time claim counts as well.
Two kinds of award come through here: one earned in the Battle Arena (it knows its card, so award.leaderId) and one the
player collected by hand in the Badge Tracker (no card, only the slot it fills -- the ONLY route in the play modes
where the Arena is closed). Both must recognise the Villain Badge. By hand it follows the Badge Tracker's own Master Ball
icon rule: the Villain slot, or the first Starfall Street badge (those land in the next open position, whichever slot
was tapped, so "first" means nothing has been collected from that set yet).

## `//   "battleItemRewardBonus": { "drawDeck": "Item Deck", "pokeCoins": 3 }   on an Attach c`

---- Amulet Coin: a bonus when a Battle rewards an Item card (cards.json) ----
"battleItemRewardBonus": { "drawDeck": "Item Deck", "pokeCoins": 3 }   on an Attach card
When the player gains an Item card as the reward for winning a Battle (an NPC Trainer / Rival / similar Event card, a Gym
Badge, a player-vs-player win, a Secret Base) and a Pok\u00e9mon of theirs carrying this card took part in it, they choose: draw
another card from drawDeck, or gain `pokeCoins` Pok\u00e9 Coins (that choice is left out when the Pok\u00e9 Coins rule is off, so
the draw is simply given). Each carrying Pok\u00e9mon that took part gives one bonus per Battle reward, however many Items
the reward itself was. It is NOT used for rewards that aren't a Battle's (e.g. the Held Item Nature card on a catch), and a
PvP win that takes a card from the loser's hand isn't an Item reward, so only the "draw" option counts.
Who took part comes from the battle record's `seen` list (see noteBattleParticipant()); the record is wiped when the
Battle ends, so each device keeps the last copy of its own list for the reward that follows.

## `// with another award still showing) never reached the reward step in presentNextGymBadgeA`

An award placed by flushGymBadgeAwards() before its celebration ever showed (leaving the Badge Tracker, or closing the page,
with another award still showing) never reached the reward step in presentNextGymBadgeAward(). Give the rewards that need no
screen -- the Pok\u00e9 Coins and the one-time Master Ball -- so they aren't lost for good. (An award whose message did
show has masterBall set, null or 'given', so it is skipped here.)

## `//`

---- Gym Badge jingle ---------------------------------------

Plays the region's BADGE_JINGLES entry once, on THIS device --
the one whose player just collected the badge -- through its
own Audio element, never musicAudio (that one's the Host's
background music, which a guest never plays at all, and which
a jingle would otherwise replace on the Host).

Volume follows the Music setting, so muting Music mutes
jingles too (nothing plays, and nothing ducks).

The Host's music ducks under it: directly if this device IS
the Host (or a solo player), or via a 'badge-jingle' message
if it's a guest -- 'start' when the jingle actually begins
playing (not at tap time, so a slow first load doesn't dip the
music early), 'end' when it finishes or fails. Only ever sends
an 'end' that follows a 'start' it sent, exactly once.

## `// real if a save is active (host or guest, see below), feeds the`

Common tail end for collecting/removing a badge -- persists for
real if a save is active (host or guest, see below), feeds the
unsaved-progress safety net if not, and pushes the freshly-
derived stage into the Sounds panel either way (see
setActiveGameStage()'s own comment on being "the one call" a
real Gameplay Companion needs to make). Villain/Elite Four/Path
of Legends/Starfall Street changes still run through here too,
since they're still progress worth saving even though
computeBadgePoints() itself ignores
them.

Lobby-aware (see GAME_PANEL_NOTES.md's Leading-Player Stage
notes): solo play (no lobbyState.role) behaves exactly as
before -- this device's own progress decides its own stage,
full stop. Connected to a Lobby, only the host's device is the
one actually playing music, so only the host's device still
calls setActiveGameStage() directly -- via
recomputeLobbyLeadingStage(), using the *whole lobby's*
progress rather than just its own. A guest instead reports its
own progress up to the host (reportLobbyProgress()) and leaves
its own local Game Stage alone entirely until it disconnects
(see restoreSoloGameStage() in resetLobbyState()).

## `// whole "Joined Games" list from scratch each time rather than`

Unbounded, unlike renderSavePicker() above -- rebuilds the
whole "Joined Games" list from scratch each time rather than
targeting fixed slots, since there's no fixed slot count to
target. Most-recently-played first, so a game someone's
actively bouncing between host saves for surfaces at the top
without having to scroll for it.

## `// save-scoped tool screens exist (Badge/Team Tracker for now) --`

Shown/hidden together on the main screen and inside whichever
save-scoped tool screens exist (Badge/Team Tracker for now) --
see .game-save-progress-banner in CSS. Visible any time there's
unsaved progress sitting in memory, regardless of which of
those screens happens to be showing. Guest saves count as "a
real save" here too, same as host saves -- there's nothing
unsaved to nudge about once either kind is active.

## `// shows the small "Read-Only" banner on each screen, any time`

Dims Badge Tracker's grid and Team Tracker's Test button, and
shows the small "Read-Only" banner on each screen, any time
getActiveSaveData() currently resolves to a guest save that
isn't this device's own live connection (see
isActiveSaveReadOnly()). Purely visual/CSS-driven (see
.game-screen[data-readonly] rules) -- the actual mutation
guards live separately, at the top of collectBadge()/
removeBadge() and in the delegated click listener below, since
this alone wouldn't stop a stale click already in flight.

## `// initial call further down) so there's something to pick/create`

Collapses/expands the Saves section -- starts open (see the
initial call further down) so there's something to pick/create
right away, then auto-collapses itself once a save is created
or loaded (see createSave()/loadSaveSlot() above), the same way
.filter-section-header sections do once a choice is made, just
driven by that choice here instead of starting collapsed by
default. Re-expanded if the active save gets deleted out from
under it (see deleteSaveSlot() above). Manual clicks on the
header itself (see the delegated listener below) can always
override either state in the meantime.

## `// separately (Type_Effectiveness_Bonus_Calculator.xlsx) rather`

Type Matchup -- replicates a spreadsheet the user built
separately (Type_Effectiveness_Bonus_Calculator.xlsx) rather
than anything invented here. TYPE_CHART below is a direct,
cell-by-cell transcription of that workbook's Lookup tab
(verified against vanilla Pokemon type effectiveness while
transcribing -- every entry matches, including all 8 immunity
pairs, so this isn't a house-ruled chart underneath, just the
standard one). computeTypeMatchup() below mirrors that same
workbook's O21:O24/S21 formula chain exactly -- see the
conversation this was derived in for the full cell-by-cell
derivation and truth table if this ever needs re-verifying
against a future version of that sheet.

moveType -> { defendingType: '+' | '-' | 'x' }. A key missing
entirely (not just falsy) means neutral -- matches a blank
Lookup cell exactly, rather than needing a third explicit value
for "no bonus, no penalty."

## `// icon starts showing immediately (see renderMatchupPanel()),`

Not populated yet -- add a real URL for a type here and its
icon starts showing immediately (see renderMatchupPanel()),
no other code changes needed. Same "falls back to nothing until
a real asset exists" pattern as .game-badge-icon-img's own
imageUrl fallback elsewhere in this panel, just a plain object
here instead of a JSON field, since there's no per-type data
source for this the way gym-badges.json is for badge artwork.
e.g. once ready: bug: 'https://.../bug-icon.png'

## `// for IMMUNE: the source sheet's own version of that cell reads`

Bare bonus numbers matching Lookup!S21's own IF chain, except
for IMMUNE: the source sheet's own version of that cell reads
"-3, Ignore All Move Effects" as one string, but this UI splits
that in two -- see renderMatchupPanel()'s own comment on why
IMMUNE's explanatory text moved onto the label side instead,
leaving just the bare "-3" here so all six bonus values render
the same way (large, yellow, right-aligned) rather than IMMUNE
alone overflowing that treatment with a sentence.

## `// see this function's own outer comment for where that mapping`

Mirrors Lookup!O21 (immune check) through O24 (final label) --
see this function's own outer comment for where that mapping
was derived from. Returns null only when there's not yet enough
selected to show a result at all (no move type, or no first
defending type); every other state maps to a real { label,
bonus } pair, immune included.

## `// (which 18 types exist) never change, so this only needs to run`

Populates each of the three <select>s once -- their contents
(which 18 types exist) never change, so this only needs to run
at page load, not on every render. Selection state and the
result readout are handled separately by renderMatchupPanel()
below, called far more often.

Each option's own text is padded with a leading/trailing \u00A0
(a non-breaking space -- a plain space would get collapsed away
by normal HTML whitespace handling, since it'd sit at the very
start/end of the text node). Not decorative: a <select>'s own
displayed text clips right at the glyph's own bounding box,
ignoring any padding around the *element*, and .has-selection's
text-shadow/-webkit-text-stroke (see that rule and the @media
block further down) both draw outward from that box -- so the
outline itself was getting clipped on both sides. The padding
characters become part of the text run the browser measures,
giving the native clip boundary a little slack on both sides
before it ever reaches the real glyphs.

## `// after every selection/toggle change above, and from`

The one function that keeps the whole panel in sync -- called
after every selection/toggle change above, and from
refreshGameUI() so loading, switching, or deleting a save
re-syncs it too. Cheap enough (a handful of classList/text
writes over a fixed, small set of elements) not to need
splitting into more targeted pieces.

## `// whenever one's active -- chosen deliberately when that save`

Locked to the active save's own typeEffectivenessRule
whenever one's active -- chosen deliberately when that save
was created, so this tool shouldn't let it be silently
overridden per-lookup the way the two toggles can be with no
save active (e.g. to try a hypothetical before committing to
it on a real save, or to use the tool at all before a save
exists yet to lock to). See the chat where this was decided
if that trade-off ever needs revisiting.

Guest Save checked first, same priority order as
getActiveSaveData() -- a guest doesn't choose this rule
themselves (see the "Type Effectiveness Rule" field only
appearing on host save-creation forms/Default Save
Settings), it's synced down from the host's own save via
the lobby 'welcome' handshake (see finalizeGuestJoin()),
same as pokeCoinsEnabled.

## `// with matchupMoveType/matchupDefType1/matchupDefType2 no`

Keeps the table's pinned columns/highlighted row in sync
with matchupMoveType/matchupDefType1/matchupDefType2 no
matter which of the three ways they just changed --
tapping the table itself (toggleMatchupChartPin()/
selectMatchupChartMoveType()), picking from a dropdown
(setMatchupTypeFromSelect()), or (Def2 only) just now
being cleared above by a save that locks Dual Defending
Types off. Safe to call unconditionally -- it no-ops on
its own if the table isn't in the DOM.

## `// Dual Defending Types is on -- "Defending Type" -> "Defending`

Def1's own label doubles as the label for both selects once
Dual Defending Types is on -- "Defending Type" -> "Defending
Types" (plural, no number) -- rather than Def1 keeping a
"1" of its own and Def2 carrying a second, separate
"Defending Type 2" label beside it (see the chat this was
decided in). Empty string with types off keeps Def1's label
exactly "Defending Type", singular, matching there being
only the one select visible.

## `// button grid's .selected could -- which poke-type-*`

Can't just toggle one fixed class the way the old
button grid's .selected could -- which poke-type-*
class applies changes with the selection itself, not
just whether one's present, so the previous one has to
come off before (maybe) adding a new one back on.

## `// limits, offline, etc.), the browser's own`

If the URL 404s/times out (Dropbox hotlink
limits, offline, etc.), the browser's own
fallback is a broken-image glyph plus the alt
text rendered right on top of the select's own
text above -- re-hide the element in that case
so a failed load just quietly shows no icon
(same as the no-selection state) instead.

## `// enough on its own (see MATCHUP_BONUS_MAP's own comment) --`

IMMUNE is the one label whose usual plain word isn't
enough on its own (see MATCHUP_BONUS_MAP's own comment) --
"Ignore All Move Effects" folds onto the label side here
rather than getting tacked onto the bonus the other five
labels keep as a clean bare number.

## `// table, rather than the calculator above's one-cell-at-a-time`

Full Type Chart -- every cell of TYPE_CHART as a real reference
table, rather than the calculator above's one-cell-at-a-time
lookup. See the CSS section this table's own rules live in for
the geometry/sticky-positioning reasoning; this is the data and
interaction side of the same feature.

## `// that constant's own comment -- transcribed directly from the`

The 8 canonical immunity pairs TYPE_CHART encodes as 'x' (see
that constant's own comment -- transcribed directly from the
source spreadsheet, and confirmed to match vanilla Pokemon
mechanics exactly). Listed explicitly here, rather than scanned
for on demand, since there are only ever these 8 and they never
change -- cheap enough to touch directly on every
renderMatchupPanel() call without rebuilding the whole 18x18
table just because the immunities toggle flipped.

## `// the calculator above (see toggleMatchupChartPin() below) --`

Column header taps now double as picking a defending type for
the calculator above (see toggleMatchupChartPin() below) --
matchupDefType1/matchupDefType2 themselves are the source of
truth for which columns end up pinned, rather than a
separately-tracked list that could drift out of sync with
what the dropdowns above actually show. See
applyMatchupChartPins()'s own comment for how that list gets
derived back out when it's needed for the table's own
reordering/sticky-offset math.

## `// unpopulated EFFECTIVENESS_ICON_URLS entry -- .game-matchup-`

Blank (no markup at all) for a neutral pairing or an
unpopulated EFFECTIVENESS_ICON_URLS entry -- .game-matchup-
chart-cell's own fixed --matchup-cell-size (see the CSS) is
what keeps a blank cell the same footprint as one with an icon,
not anything here.
onerror="this.style.display='none'" on every <img> below:
if the URL 404s/times out, the browser's own fallback is a
broken-image glyph plus (wherever alt text is set) the alt
text rendered right in the cell -- both look like a rendering
bug rather than data. Hiding the element instead just leaves
that one cell blank, which the table already treats as a
normal, styled state (see matchupChartCellHtml()'s own comment
on neutral pairings), so a failed load degrades quietly
instead of visibly breaking the grid.

## `// comment for why (row headers keep matchupChartRowHeaderHtml()'s`

Icon-only -- see .game-matchup-chart-col-header's own CSS
comment for why (row headers keep matchupChartRowHeaderHtml()'s
text, this doesn't). Unlike the row header/cell icons above,
a failed load here can't just fall back to hiding the <img>:
there's no visible text sitting next to it to fall back on,
and the column is only --matchup-cell-size (30px) wide, too
narrow to hold a type name without overflowing into the next
column -- which is exactly what the bare alt-text fallback
used to do. title on the <th> (see buildMatchupChartTable())
now carries the accessible/on-hover name instead, so the alt
here can stay empty and this can safely just go blank like
the other two icon spots.

## `// Chart's own background images ahead of time -- called once`

Prefetches (and, where supported, fully decodes) the Full Type
Chart's own background images ahead of time -- called once
from openGamePanel() below, well before the section is ever
actually visible (it sits on the Type Matchup screen, one of
several under .game-screen's own display:none-unless-.active
pattern, and Type Matchup is a couple taps deeper still),
rather than left for the browser to discover reactively the
moment that screen's own .active class first reveals it. Two
of these four URLs (the -b tile and the -c pinned-cell image)
already get fetched for other always-visible elements
elsewhere in the doc (.game-panel-bg and body::before
respectively) by the time the Game panel's even open, so those
two are effectively free re-requests here (the browser just
serves them from its own cache) -- but the other two (the main
tbody art and the header strip art) are unique to this table
and were genuinely only ever being fetched for the first time
right as the screen opened, which is what showed up as a brief
flash of plain white table underneath before that art caught
up (same root cause as body::before's own will-change comment
describes, just from a cold network fetch this time instead of
a layer-promotion delay, since the Type Matchup screen is
display:none -- and therefore not even in the render tree --
until navigated to, unlike body::before which is always
rendered). will-change can't help with that kind of delay
(there's no box to promote ahead of time while display:none),
so this preload is the fix, not that.
img.decode() (awaited, but errors swallowed) pushes the actual
bitmap decode to happen now too, off the main thread, rather
than just the network fetch -- without it, a large cover-sized
image can still cost a visible frame or two to rasterize on
first paint even once it's fully downloaded and sitting in
cache. Guarded by a flag since openGamePanel() can run more
than once per session (closing and reopening the panel) and
there's nothing more to gain from asking twice.

## `// section's own fallback comment and .game-matchup-chart-bg::`

Feeds --matchup-scrollbar-height (see #game-matchup-chart-
section's own fallback comment and .game-matchup-chart-bg::
before's own comment on why it needs this) with this browser's
actual rendered horizontal-scrollbar height in px, rather than
leaving that backfill strip sized off a percentage guessed on
one particular device. A classic (non-overlay) scrollbar always
carves its own thickness out of its box's content area no
matter what that box contains, so a plain offscreen probe with
overflow: scroll -- no content of its own needed -- reserves
the same real gutter #game-matchup-chart-scroll's own
scrollbar does, and offsetHeight (border box, includes the
gutter) minus clientHeight (content box, excludes it) isolates
exactly that gutter. This is the standard technique for this,
not something specific to this chart. (The probe measures its
horizontal scrollbar's height, not its vertical scrollbar's
width -- this chart only ever needed the former: see .game-
matchup-chart-bg::before's own comment on why its width
doesn't need a matching adjustment.)

The probe carries #game-matchup-chart-scroll's own scrollbar-
width/-color directly (Firefox) so a "thin" scrollbar measures
as thin, not as whatever Firefox's un-styled default would be.
Chromium/Safari's ::-webkit-scrollbar route can't be matched
with inline style (pseudo-elements aren't reachable that way),
so the probe instead carries .matchup-scrollbar-probe, a class
whose only job (see its own CSS, up by html::-webkit-scrollbar)
is mirroring that same 10px this chart's real scrollbar already
uses on those browsers -- keeping this measured rather than
hardcoded here too would need the probe to be live in the DOM
long enough for a real ::-webkit-scrollbar layout pass, which
isn't guaranteed synchronously the way the plain box-model
subtraction above is.

Run once at load (see the bottom of this script, alongside
buildMatchupChartTable()) since a real, non-overlay scrollbar's
rendered size is a property of the browser/OS rendering it, not
of anything on this page -- nothing later in the session (a
window resize, a save loading, a pin toggling) changes it, so
there's nothing to listen for and no case where running this
again would produce a different number.

## `// reserved at all) rather than a measurement failure -- the`

A height of 0 means an overlay scrollbar (no gutter
reserved at all) rather than a measurement failure -- the
(pointer: coarse) rule already hides this whole strip for
touchscreens, but a mouse-driven browser that also happens
to use overlay scrollbars (e.g. macOS's default) can reach
this same 0 legitimately, so it's kept rather than falling
back to the 10px guess in that case too.

## `// chart's contents (which 18 types exist, and every pairing's`

Built once at load (see the bottom of this script) -- the
chart's contents (which 18 types exist, and every pairing's
base effectiveness) never change; only the 8 immune-pair cells'
*display* depends on anything that changes afterward (the
immunities toggle -- see syncMatchupChartImmunityCells()), and
pin state (see applyMatchupChartPins()), neither of which need
a full rebuild to handle.

## `// carried as a custom property instead of inline`

Same per-row offset the row header gets below, just
carried as a custom property instead of inline
background-position-y directly -- an ordinary cell has
no background-image of its own to position (only
.game-matchup-chart-cell.pinned does, once a column's
actually frozen), so setting the property here and
letting that CSS rule consume it keeps this in sync
automatically no matter which column ends up pinned,
rather than needing applyMatchupChartPins() to go
recompute a per-row value it doesn't otherwise track.

## `// background layers into one continuous strip down the`

background-position-y here is what turns the header
background layers into one continuous strip down the
row-header column instead of 18 separate copies -- see
that rule's own comment. Same offset repeated for both
layers (comma-separated, one value per layer) keeps -b's
repeat phase-aligned with -a's slice at every row. Rows
are never reordered (there's no row-pinning feature,
unlike columns), so this is fixed once here rather than
needing the recalculation applyMatchupChartPins() does
for column headers.

## `// be a real, definite value to hold columns at their exact`

table-layout: fixed still needs the table's own width to
be a real, definite value to hold columns at their exact
CSS sizes (see .game-matchup-chart-table's own comment) --
left as the default auto, Chromium falls back to sizing
the table off how much space the header row's cells
actually need, which shrinks (taking every column's real
rendered width down with it) the moment any of those
cells' content is smaller than --matchup-cell-size, e.g.
an icon that fails to load and hides itself. An explicit
width computed straight from TYPE_LIST's own length keeps
the grid's geometry fixed no matter what any individual
cell ends up rendering.

## `// chart-bg::before (see its own CSS comment) needs this same`

Also set on the section, not just the table -- .game-matchup-
chart-bg::before (see its own CSS comment) needs this same
count for its own copy of the row-header background-size
calc(), and it's a sibling of the table, not a descendant,
so it can't read the table's own inline copy of this custom
property.

## `// original pinning behavior) AND selects it as one of the`

Tapping a column header now both freezes it in place (the
original pinning behavior) AND selects it as one of the
calculator's own defending types above -- the two dropdowns
and the table's pinned columns are the same selection viewed
two ways, not two separate features, so there's only ever one
place (matchupDefType1/matchupDefType2) actually holding it.

Capped at how many defending types a Pokémon can actually
have right now -- 2 with Dual Defending Types on, 1 without
(whether that's locked in by the active save's Type
Effectiveness Rule or just the unlocked toggle's own current
state -- see renderMatchupPanel()'s own comment on
matchupUseDualTypes). Tapping a type that's already selected
clears it instead (any second selection shifts down to fill
the gap, same order it was picked in); tapping past the cap
bumps whichever was picked least recently rather than
blocking the tap outright, so this never needs a disabled
state of its own the way the rule toggles do.

## `// buildMatchupChartTable()'s own comment on why rows never`

Row headers have no pinning/freezing counterpart (see
buildMatchupChartTable()'s own comment on why rows never
reorder) -- tapping one just selects it as the calculator's
Move Type, mirroring toggleMatchupChartPin() above for the
one column-side behavior that does carry over: picking a
type. Always a single value, so there's no cap/FIFO to manage
here the way defending types need -- tapping the already-
selected row is instead its own deselect case (mirroring
toggleMatchupChartPin()'s own "tapping a type that's already
selected clears it instead"), clearing back to null rather
than leaving no way to get back to the "nothing selected"
state from the table itself.

## `// class driving the glow/tint) from matchupChartPinnedTypes,`

Re-derives every column's sticky left offset (and the .pinned
class driving the glow/tint) from matchupChartPinnedTypes,
called after that array changes.

Pinned columns are re-sorted into TYPE_LIST's own order here
rather than kept in click order -- their sticky offsets have to
stack in the order they actually appear left-to-right in the
table for the freeze effect to look right (a column pinned
second but sitting earlier in the table still needs to end up
closer to the row-header column, not further from it just
because it was tapped later). Offset for the Nth pinned column
(0-indexed, in that table order) is the row-header column's own
width plus N cell-widths -- i.e. it lines up immediately after
the row headers plus however many already-pinned columns sit to
its left.

Reorders the actual <th>/<td> cells for pinned columns to sit
immediately after the row-header column, rather than leaving
them in their original TYPE_LIST position and relying on
position: sticky alone to pull them into view once scrolled.
Sticky only takes effect once the page has scrolled past a
column's own resting position -- fine for a column already
near the left (e.g. Bug), but for one far to the right (e.g.
Water), that resting position doesn't reach the sticky offset
until the user has scrolled nearly the full table width past
it. At every scroll position before that, the row header is
already pinned on the left, ordinary columns have already
scrolled out of the way, and the not-yet-stuck pinned column
is still sitting wherever it started -- that gap between them
is exactly the empty space where it hasn't caught up yet.
Moving the cells themselves means a pinned column's resting
position already IS its sticky position, so there's nothing
left to catch up to and no gap at any scroll offset.

finalOrder below always covers every column, not just the
pinned ones -- reordering pinned columns alone moves them
forward but leaves no instruction for an unpinned column to
ever move back, so a column deselected after being pinned
would simply stay wherever it was dragged to. Rebuilding the
full order (pins first, then everyone else in normal TYPE_LIST
order) every call means an unpinned column always has an
explicit destination -- its normal spot -- instead of just an
absence of instructions to move it.

## `// call, rather than tracked separately -- see the comment`

Derived fresh from the calculator's own selection every
call, rather than tracked separately -- see the comment
above matchupChartPinnedTypes' old declaration (now
removed) for why. Order here (Def1 before Def2) is what
decides which pinned column sits closer to the row-header
column below, same as it always determined pin order back
when this was tracked as its own click-order array.

## `// one unbroken strip across the column headers`

Keeps both header background layers reading as
one unbroken strip across the column headers
(see that rule's own CSS comment, and .game-
matchup-chart-col-header::before's) by re-
pointing each header at the position matching
where it actually sits now, rather than the
position matching its permanent TYPE_LIST
identity. A pinned column's own slice/tile phase
can change as a result -- fine, since this image
is decorative background, not a stable per-type
marker -- but the whole strip never gets a
visible seam at the point where a pinned column
was spliced in.

## `// scoped to only the pinned columns rather than all`

Same idea as --matchup-col-offset above, just
scoped to only the pinned columns rather than all
of TYPE_LIST -- there's no shared background
across an unpinned cell and its neighbors (only
.pinned cells paint anything), so windowing
against the full 18-column width like the headers
do would leave two adjacent pinned columns (which
is all that's ever visually contiguous here) each
showing some arbitrary, usually non-adjacent slice
instead of two slices that actually continue into
each other. --matchup-pinned-col-count sizes that
shared window to how many columns are actually
pinned right now (1 or 2 -- see
toggleMatchupChartPin()'s own cap), so a single
pinned column isn't stretched across a two-column
window it doesn't have a neighbor to fill.

## `// "Joined Games" section -- kept as an entirely separate toggle`

Same idea as setSavesSectionCollapsed() above, just for the
"Joined Games" section -- kept as an entirely separate toggle
(rather than one shared function) since the two sections'
collapsed states are independent: loading/creating a host save
says nothing about whether there's a guest save worth picking,
and vice versa.

## `// inside "Your Saves" -- independent of the other two (it isn't`

Same pattern again, for the Default Save Settings card nested
inside "Your Saves" -- independent of the other two (it isn't
tied to any save being created/loaded/deleted at all, just a
plain manual toggle), so it gets its own state rather than
riding along with setSavesSectionCollapsed()'s own triggers.

## `//`

---- Poké Coins ----

Save-scoped the same way Badge/Team Tracker are (reads/writes
whatever getActiveSaveData() resolves to -- a real save,
a Guest Save, or the in-memory unsaved session), just rendered
on the main screen instead of behind its own Tools tile. See
the HTML comment above #game-pokecoins-section for why, and
that section's own CSS comment for the layout reasoning.

## `// an optional per-save house rule (see the "Use Poké Coins?"`

Whether the whole section should even be visible right now --
an optional per-save house rule (see the "Use Poké Coins?"
field on the save-creation form and Default Save Settings
card), not something every save has to show. A Guest Save
gets its answer from the host via the lobby 'welcome' message
(see finalizeGuestJoin()) rather than deciding for itself.

## `// picker should show at all for the currently-active save --`

Whether the Nature Card section of the Attach/Nature Cards
picker should show at all for the currently-active save --
same shape as isPokeCoinsEnabledForActiveSave() just above,
including the off-by-default fallback (no saves exist yet
that this could break). A Guest Save gets its answer from the
host via the lobby 'welcome' message (see finalizeGuestJoin()),
same as Poké Coins.

## `// the currently-active save -- same shape as`

Whether the Hand & Decks tool should be reachable at all for
the currently-active save -- same shape as
isNaturesEnabledForActiveSave() just above, including the
off-by-default fallback. Unlike Nature Cards/Poké Coins
though, this doesn't just hide one section of a screen --
see renderVirtualDecksAvailability() below for what actually
reads this.

## `// isVirtualDecksEnabledForActiveSave() (the tile stays visible,`

Locks/unlocks the "Hand & Decks" tile on the Tools menu per
isVirtualDecksEnabledForActiveSave() (the tile stays visible,
dimmed while locked) -- this is an opt-in
feature for players without the physical board game's paper
cards, so a save that never turned it on shouldn't offer a
tool that assumes there's no paper deck to draw from. If the
rule is off AND the player happens to already be sitting on
the Decks screen when this runs (its default just changed
out from under an unsaved session, see the 'change' listener
above -- an already-created save can't have this happen,
its rules are fixed at creation), back out to the main
screen rather than leaving a now-hidden tool's own screen
open with no way back to it via the tile.

## `// width capped in CSS (see .game-pokecoins-counter's own`

Keeps the counter's number legible as it grows into the fixed
width capped in CSS (see .game-pokecoins-counter's own
comment) -- 0-999 only ever needs one of three digit-widths,
so a small set of fixed font-size tiers (the [data-digits]
rules on .game-pokecoins-value/.game-pokecoins-input) covers
every case without needing a live measure-and-shrink loop.
Shared by the value span and the edit input so both size the
same way regardless of which one's currently showing.

## `// the +/- buttons and the custom-value input above funnel`

The one place an actual new total ever gets written -- both
the +/- buttons and the custom-value input above funnel
through here, so "never negative" only has to be enforced in
one spot. Silently no-ops while read-only, same guard as
Badge/Team Tracker's own mutators, since a stale click/submit
already in flight shouldn't be able to sneak a write through.

## `// in-memory session touched (see markUnsavedProgressChanged()),`

Persists (for a real save, either role) or just marks the
in-memory session touched (see markUnsavedProgressChanged()),
mirroring afterBadgeChange()'s own persistence branch --
Poké Coins isn't part of Game Stage derivation the way badge
count/points are, so there's no lobby-progress-report or
stage-recompute step to mirror alongside it.

## `// selected so typing immediately replaces it. No-ops while`

Swaps the value span for the text input, pre-filled and
selected so typing immediately replaces it. No-ops while
read-only -- there'd be nothing a submitted edit could
actually do anyway (see setPokeCoins()'s own guard), but
skipping it here also keeps a read-only Guest Save from ever
showing an editable-looking input in the first place.

## `// (or eventually Trainer Card data) while unsaved -- turns on the`

Called by any save-scoped tool whenever it mutates badges/team
(or eventually Trainer Card data) while unsaved -- turns on the
persistent "Save This Progress" banner and, the first time
only, pulses it once so it's not just something to stumble
across on the way back to the main screen. A no-op once a real
save is active (host OR guest), so tool code can call this
unconditionally after every change without checking
activeSaveSlot/activeGuestSaveId itself.

## `// label changes for GAME_DELETE_CONFIRM_MS; a second tap in that`

"Tap again to delete" -- a delete button turns red and its own
label changes for GAME_DELETE_CONFIRM_MS; a second tap in that
window actually deletes, otherwise it quietly reverts on its
own. A small state machine here rather than a native confirm(),
consistent with the rest of the site building its own UI for
everything instead of relying on browser dialogs.

## `// its creation form (same form as an ordinary new save, since the`

"Save This Progress" -- finds the first empty slot and opens
its creation form (same form as an ordinary new save, since the
stage-rule question that got deferred by skipping that step
originally lives right there already), flagged so createSave()
seeds it from the in-memory session instead of starting empty.

## `// at a time. Mirrors the same show-exactly-one-thing idea as`

Game panel screens -- exactly one .game-screen is ever .active
at a time. Mirrors the same show-exactly-one-thing idea as
setNavState() elsewhere, just simpler since there's no peek/
hidden equivalent here, only "which screen." 'main' is the one
root screen now (saves and tools together -- see the HTML)
rather than there being a separate pre-save-picked root.

## `// comment) ----`

---- Rulebook (test build -- see the screen's own HTML
comment) ----
List of available rulebooks, fetched from rulebooks.json --
same repo/root-level-file convention as pokemon-data.json/
gym-badges.json/cards.json/music-tracks.json elsewhere in this
doc. Each entry is expected to look like
{ "id": "core", "title": "Core Rules", "url": "https://raw.githubusercontent.com/.../Core%20Rules.pdf" },
with url following the same direct-content raw-GitHub-link
shape RULEBOOK_PDF_URL used to be hardcoded to (a dropbox.com
*share* link or a GitHub blob/tree page URL would serve an
HTML preview page instead of the raw PDF bytes either viewer
needs). Adding another book later is just another entry in
that file -- nothing here or in the HTML needs to change.

## `// called once fetch(RULEBOOKS_URL) above resolves (in case the`

Builds the picker screen's button list from rulebookBooks --
called once fetch(RULEBOOKS_URL) above resolves (in case the
picker screen is already open and waiting) and again from
setGameScreen() every time that screen becomes active (in
case the fetch already resolved before the person ever opened
it -- the far more common case in practice).
Order matters here -- this is also the section display order
(Core first, Expansion second). Anything whose type doesn't
match either value (missing field, typo, a future type not
added here yet) falls through to RULEBOOK_OTHER_SECTION_LABEL
below rather than silently vanishing from the list.

## `// screen's own click handler (see the delegated listener) is`

Opens the viewer screen on a specific book -- the picker
screen's own click handler (see the delegated listener) is
the only caller. Deliberately just sets state and hands off
to setGameScreen() rather than also calling
loadRulebookPdfjsViewer() itself: setGameScreen('rulebook')
already triggers initRulebookScreen() below, same as it would
for any other route into this screen.

## `// "pin an exact version" approach as every other CDN-loaded`

Pinned exact version, loaded from cdnjs -- same CDN and
"pin an exact version" approach as every other CDN-loaded
library already in this codebase. Deliberately the last 3.x
release rather than latest: PDF.js dropped its plain
<script>-tag (UMD) build starting at 4.0 in favor of ES
modules only, so pdf.min.js/pdf.worker.min.js (what
loadPdfJsLibrary() below actually loads) simply don't exist
on cdnjs for 4.x+ -- 3.11.174 is the newest version that
still ships them.

## `// been fetched and parsed, switching to a different book and`

Keyed by book id -- once a given book's pdf.js document has
been fetched and parsed, switching to a different book and
back to this one re-uses the same object instead of
re-downloading it. rulebookPdfDoc below always mirrors
whichever entry matches currentRulebookBook.id right now (or
null while that entry is still loading for the first time).

## `// rulebookZoomScale actually describe -- compared against`

Which book's pages rulebookPdfDoc/rulebookCurrentPage/
rulebookZoomScale actually describe -- compared against
currentRulebookBook.id by loadRulebookPdfjsViewer() below to
tell "already showing this exact book, just resume where the
person left off" apart from "a different book was just
picked, resume wherever *that* book's own reading position
last was (see rulebookLastPageById just below)."

## `// in each book, updated on every renderRulebookPage() call (see`

Keyed by book id -- the page the person was last looking at
in each book, updated on every renderRulebookPage() call (see
its own comment). Session-only by design (a plain in-memory
object, nothing written to storage), so switching between
books remembers each one's position, but an actual page
reload starts everything fresh again -- same lifetime as
rulebookDocCache above, for the same reason.

## `// very first page render (see loadRulebookPdfjsViewer() below)`

Starts at 0 as a sentinel meaning "not computed yet" -- the
very first page render (see loadRulebookPdfjsViewer() below)
replaces this with a fit-to-width value based on the page's
actual size and the viewer's available width, rather than a
guessed constant that would look right for some page sizes
and wrong for others -- that initial value is deliberately
NOT snapped to RULEBOOK_ZOOM_LEVELS, so "fit width" can still
land wherever actually fits a given page/screen; the +/-
buttons only start snapping to that fixed set once the person
actually clicks one (see zoomRulebookTo() below).

## `// Prev/Next tap that landed while it was still in flight --`

Guards against a slower page render finishing after a faster
Prev/Next tap that landed while it was still in flight --
rulebookRenderToken is bumped on every renderRulebookPage()
call, and a completed render only draws to the canvas if its
own captured token still matches the current one.

## `// a full page served over GitHub Pages, not a sandboxed`

Injects the pdf.js UMD build as a plain <script> tag (this is
a full page served over GitHub Pages, not a sandboxed
artifact, so there's no CDN allowlist to work around -- cdnjs
is just the same reliable choice this codebase already uses
elsewhere). Returns a promise that resolves once
window.pdfjsLib is ready to use.

## `// zoomRulebookToFit() below -- this page's own natural (scale 1)`

Shared by loadRulebookPdfjsViewer()'s initial render and
zoomRulebookToFit() below -- this page's own natural (scale 1)
width, divided into whatever room the wrap actually has right
now (minus its own left/right padding), gives a scale where
the page's rendered width just matches the viewer -- reasonable
regardless of whether this particular PDF's pages are US
Letter, A4, or something else entirely. Recomputed from the
wrap's *current* clientWidth rather than cached from page load,
so it still lands correctly if the screen has since rotated or
resized. Falls back to 1 (no scaling) if the wrap isn't in the
DOM yet or reports zero width for any reason.

## `// breakpoints (see e.g. the toolbar's own @media comment above).`

Same 664px split as this file's other mobile/desktop CSS
breakpoints (see e.g. the toolbar's own @media comment above).
Desktop viewports are roomy enough that a plain 100% render is
both legible and predictable, so the initial load targets that
exact figure there instead of whatever computeRulebookFitScale()
happens to land on (that math fits the wrap's *current* pixel
width, which for this rulebook's page size comes out to ~104%,
not a round 100%). Mobile keeps the fit-to-width calc, since
that's the actual reason it exists -- a fixed 100% would
overflow a phone-width wrap.

## `// previous book's last-rendered page on screen for however`

Blanks the canvas right away instead of leaving the
previous book's last-rendered page on screen for however
long this book takes to fetch/parse/render its own first
page -- reassigning width/height (even to the same value)
clears a canvas's bitmap per spec, and collapsing it to
0x0 also means it can't briefly show at a mismatched size
if the new book's page dimensions differ from the old
one's.

## `// device. Prefers the already-loaded pdf.js document's own`

Saves the same PDF the viewer is showing to the person's own
device. Prefers the already-loaded pdf.js document's own
getData() -- which hands back the complete underlying bytes
regardless of whether pdf.js fetched them in one shot or via
range requests -- over a fresh fetch() of the book's own url,
so a click here doesn't re-download a multi-page rulebook
that's already sitting in memory (rulebookDocCache means
that's true even for a book that isn't the *current* one's
pdf.js document right this instant, but downloadRulebookPdf()
is only ever reachable from this book's own toolbar, so that
distinction doesn't come up in practice). Falls back to
fetch() only if this is somehow called before rulebookPdfDoc
exists. Routes through a Blob + object URL rather than
pointing an <a download> tag straight at the book's own url,
since a cross-origin download attribute like that is honored
inconsistently across browsers -- a same-origin blob: URL
always downloads instead of navigating.

## `// in the given direction, rather than multiplying it by a fixed`

Moves rulebookZoomScale to the next stop in RULEBOOK_ZOOM_LEVELS
in the given direction, rather than multiplying it by a fixed
factor -- keeps every zoom level one of the standard set
(25/50/75/90/100/110/125/150/175/200%) instead of an arbitrary
percentage. Works fine even when the current scale isn't
itself one of those stops (e.g. right after the initial
fit-to-width render): 'in' jumps to the first stop above it,
'out' to the first stop below it, so the very first click
always lands on a real stop either way. Falls back to the
nearest end of the list if there's nowhere further to go.

## `// regardless of how far the +/- buttons or the zoom overlay's`

Reset back to the fit-to-width scale the viewer opens at,
regardless of how far the +/- buttons or the zoom overlay's
own Go have since moved rulebookZoomScale away from it.
Deliberately re-derives that scale from the *current* page and
the wrap's *current* width via computeRulebookFitScale()
rather than reusing whatever value loadRulebookPdfjsViewer()
first calculated -- the room available can genuinely change
later (a phone rotating from portrait to landscape, say), and
re-fetching page 1's fixed width would also be wrong on a
rulebook whose pages aren't all the same size. Uses
rulebookCurrentPage rather than always page 1 so "fit" fits
whatever page is actually on screen right now. Called from the
zoom overlay's own Fit to Page button (see that overlay's
click listener, which also closes the overlay after) -- this
function itself doesn't touch the overlay, same as
confirmRulebookZoomOverlay() leaving that as the caller's job.

## `// "X of Y" readout doubles as this overlay's open button -- see`

Opens on a tap of #game-rulebook-page-indicator itself (the
"X of Y" readout doubles as this overlay's open button -- see
its own CSS comment). Pre-fills the input with the current
page so Go with no changes just re-renders the same page
rather than landing somewhere unexpected.

## `// "sections" -- Section > Subsection > Sub-subsection, each`

Two additional levels beyond the top-level entries in
"sections" -- Section > Subsection > Sub-subsection, each
nested the same way (a "sections" array on the entry itself).
Anything nested deeper than that in rulebooks.json is left
out rather than recursed into further, so a typo'd extra
level of nesting can't grow this into an unbounded tree; see
buildRulebookTocNodeHtml()'s own depth check.

## `// inline style on whichever element is this node's own list`

How far each nesting level is indented, in px -- applied via
inline style on whichever element is this node's own list
item (see buildRulebookTocNodeHtml()), since that varies by
node shape (a plain button for a leaf, a row or header div for
anything with children) and a single shared class covering
all of those wasn't worth the trouble for one property.

## `// subsections) from a rulebooks.json "sections" node --`

Recursively builds one entry (and, if it has any, its nested
subsections) from a rulebooks.json "sections" node --
{ "title": "...", "page": N, "sections": [...] }, "sections"
and "page" both optional. Only the outer "Jump to Section"
header itself collapses (see renderRulebookJumpSections()) --
every level under it always renders in full once that's open,
rather than each subsection/sub-subsection needing its own
tap to reveal, so the whole table of contents is visible at a
glance instead of hunted through level by level. Two shapes:
- Has a valid page: a .game-rulebook-toc-entry button
showing the title and its page number side by side --
tapping it jumps straight there, whether or not it also
has subsections (which just render directly beneath it).
- No valid page, but has subsections: a plain
.game-rulebook-toc-heading label (not a button, nothing to
jump to) introducing whatever's nested under it.
- Neither: dropped entirely rather than rendering an empty
row.

## `// currentRulebookBook.sections -- an optional array in`

Builds the collapsible "Jump to Section" block from
currentRulebookBook.sections -- an optional array in
rulebooks.json, expected to look like
[{ "title": "Combat", "page": 12, "sections": [...] }, ...]
(see buildRulebookTocNodeHtml() above for the full node
shape, including subsections). A book that doesn't define one
(or defines an empty array) gets an empty, hidden-by-omission
block instead of an empty "Jump to Section" header with
nothing under it. Re-run every time the overlay opens (see
openRulebookJumpOverlay()) rather than once when the book
loads, both because it's cheap and because it means the
header always starts fresh and collapsed, same as the page-
number input always starts pre-filled with the current page
rather than remembering whatever was typed last time.

## `// outright garbage (blank, zero, negative, non-numeric) rather`

Same validation shape as confirmDeckLookPrompt() -- rejects
outright garbage (blank, zero, negative, non-numeric) rather
than silently doing nothing, but a too-high/too-low page
number is handled differently: renderRulebookPage() already
clamps pageNum into [1, rulebookTotalPages] for every caller
(Prev/Next included), so letting it do the same clamping here
rather than rejecting out-of-range input means "Go" on 999
just lands on the last page instead of erroring for no real
reason.

## `// way showDecksNotice() has one for Decks -- reusing the input`

No dedicated notice banner exists for the rulebook screen the
way showDecksNotice() has one for Decks -- reusing the input
itself as the error surface (placeholder swap + a moment's
red border) rather than introducing a whole new banner element
just for this one validation message.

## `// valid range is clamped rather than left open-ended: typing`

Same validation shape as confirmRulebookJumpOverlay(), but the
valid range is clamped rather than left open-ended: typing
2000 into this box would ask renderRulebookPage() for a canvas
bitmap thousands of pixels on a side (see its own
devicePixelRatio comment for why that number climbs fast on a
high-DPR phone), which is a real memory/perf cost for a zoom
level nobody actually reads a rulebook at. Bounded to the same
25-200% range the +/- buttons already stay within
(RULEBOOK_ZOOM_LEVELS's own first/last stops), so free-typed
and stepped zoom can never disagree about what's reachable.

## `// use by the time this runs -- set either by the initial`

rulebookZoomScale is already whatever this render should
use by the time this runs -- set either by the initial
fit-to-width calc or by the zoom +/- handlers just before
they call this -- so reading it back here covers every
case that can change it, prev/next included (a page turn
doesn't change the zoom, but re-stating it costs nothing
and keeps this the one place that owns the readout).

## `// from wrapEl.clientWidth in loadRulebookPdfjsViewer() and`

rulebookZoomScale is a CSS-pixel concept -- it's derived
from wrapEl.clientWidth in loadRulebookPdfjsViewer() and
stays snapped to RULEBOOK_ZOOM_LEVELS's on-screen
percentages, so `viewport` above must stay exactly what
it was for that math to keep meaning what the zoom
indicator says it means. The bitmap actually drawn into
On a scanned/raster PDF, matching outputScale to
devicePixelRatio alone (1 on a typical desktop
monitor) would be enough -- there's a real embedded
image with real pixels, and native resolution just
shows those pixels as they are. But this rulebook is
vector text, and vector fills get rasterized fresh at
whatever resolution they're drawn at, with no font
hinting the way native OS text rendering has. At
exactly 1 device pixel per CSS pixel there often
aren't enough pixels per glyph for anti-aliasing to
smooth thin strokes convincingly, which reads as
"blocky" even though nothing is technically being
stretched -- and explains why the devicePixelRatio-
only version of this fix (and the imageSmoothingQuality
change after it, which only ever affected bitmap
stretching, not vector fills) made no visible
difference on a 1x desktop screen: outputScale stayed
at 1 either way, so nothing about how the text itself
got rasterized had changed. Forcing a minimum of 2
here means every render -- desktop included --
supersamples: pdf.js draws the page at roughly double
the pixel density the screen actually needs, and the
browser's downscale filter (now 'high' quality, set
below) smooths that back down to display size, the
same trick "Retina" rendering gets for free on
high-DPR screens, just applied deliberately here even
where the display doesn't already ask for it.

## `// canvas.style.width/height are both built from the`

Floored once here so canvas.width/height and
canvas.style.width/height are both built from the
exact same whole-pixel numbers below -- viewport.width/
height themselves are essentially never whole numbers
(they're this page's native size times whatever
fractional rulebookZoomScale got landed on), and
leaving the CSS side unrounded while the bitmap side
got floored was the actual bug: at outputScale 1 (a
typical desktop monitor, no retina scaling in play at
all), that mismatch alone forced the browser to
stretch a whole-pixel bitmap across a fractional-pixel
box on every single render, and it's exactly why this
was zoom-level-dependent -- some percentages happen to
land viewport.width close to a whole number (looks
fine), others land it far from one (visibly blocky).

## `// uses a cheaper, blockier resampling filter for any`

Browsers default imageSmoothingQuality to 'low', which
uses a cheaper, blockier resampling filter for any
raster content the page draws -- this is the actual
fix for desktop blockiness, distinct from the
devicePixelRatio handling above (that only changes
anything on a high-DPR screen; on a standard 1x
desktop monitor it was already a no-op, which is
exactly why it didn't help there). Matters most if
this rulebook is a scanned/rasterized PDF rather than
vector text -- 'low' quality is most visible exactly
where the report was, zoomed content with fine detail
like text -- but costs nothing to set even on a purely
vector PDF where there's no raster content for it to
apply to. Set on every render rather than once, since
getContext('2d') on an already-initialized canvas
returns the same context object back either way,
making a one-time setup call no safer than just
stating it fresh each time here.

## `// backing bitmap; passed as render()'s own transform`

Scales the drawing operations up to match the larger
backing bitmap; passed as render()'s own transform
rather than ctx.scale() directly so it can't leak into
whatever the next render on this same canvas/context
does (page.render() resets the canvas state it uses
each call, but not transforms applied outside that
call).

## `// beginTeamReplaceMode()) only makes sense while actually`

A pending replacement (see teamReplacePendingMember/
beginTeamReplaceMode()) only makes sense while actually
looking at Team Tracker -- leaving that screen any other
way (the in-panel back button, closeGamePanel()'s own
resetGameScreen() call, etc.) discards it rather than
letting it silently linger and surprise a later visit back
to this screen. Checked against the screen being left, not
the one being entered, so navigating TO 'team' (the last
step of confirmTeamAddSelection()'s own replace-mode path)
doesn't immediately undo what it just set.

Same reasoning for the two Team Tracker overlays -- closing
the whole game panel already handles this (see
closeGamePanel()'s own comment), but the nav bar's own
Back button can call this function directly while the
panel stays open (see its own "step back to main screen"
branch), which would otherwise leave either overlay
visibly floating on top of whatever screen this switches
to instead.

## `// nav bar's Back button, closing the panel, etc.)`

Reached both by backing out any other way (the
nav bar's Back button, closing the panel, etc.)
and by sendTeamMemberToBattleSlot()'s own
setGameScreen('battle') call once a slot choice's
been made -- either way, this mode only makes
sense while still looking at Team Tracker, same
reasoning as teamReleaseModeActive just above.

## `// calls for this panel live at the very end of the script instead`

Initial refreshGameUI()/resetGameScreen()/setSavesSectionCollapsed()
calls for this panel live at the very end of the script instead
of here -- renderSavePicker() (via musicRegionLabel()/
deriveGameStage()) reaches into GAME_STAGE_ORDER/
MUSIC_REGION_LABELS/etc., which are declared with const further
down in the Sounds panel's own script and aren't safe to touch
before that declaration actually runs.
Function declarations (createSave, renderSavePicker, and so on)
are hoisted and fine to define here regardless -- it's only
actually calling them this early that would hit the TDZ.

## `// GAME_PANEL_NOTES.md §3 for the full plan, §5 for phasing).`

---- Multiplayer Lobby (connection layer -- see
GAME_PANEL_NOTES.md §3 for the full plan, §5 for phasing).
This first pass only covers hosting/joining a room over PeerJS
and keeping a shared player list in sync -- no playlist sync
and no leading-player stage derivation yet, since both of
those need this connection layer to exist first. Deliberately
a "free" tool like Attack Calculator/Type Matchup rather than
save-scoped: nothing here reads or writes gameSaves/
unsavedSessionData at all.

A PMTU-specific prefix keeps room codes out of the same
namespace as every other app using PeerJS's shared public
broker -- without it, someone else's unrelated 5-character
peer id could collide with a room code here.

## `// relied on a free shared TURN relay (eu-0.turn.peerjs.com) that no`

ICE servers for every PeerJS peer. PeerJS's built-in defaults
relied on a free shared TURN relay (eu-0.turn.peerjs.com) that no
longer resolves, so connections that can't go straight between
two devices had no fallback. Passing `config` REPLACES PeerJS's
defaults, so STUN is listed here too.

>>> FILL IN THESE TWO VALUES (from your Metered dashboard:
>>> TURN Server -> Credentials). While either is still the
>>> placeholder text, the TURN entries are skipped and the app
>>> falls back to STUN only (direct connections still work).

## `// probeHostConnectionAndRecoverIfNeeded()) waits for ANY reply`

How long a guest-side connectivity probe (see
probeHostConnectionAndRecoverIfNeeded()) waits for ANY reply
from the host -- not necessarily this exact ping's own pong,
just anything that bumps hostConnLastSeen -- before giving up
and rejoining from scratch. Short: this only runs at moments
(tab resuming, network coming back) where there's real reason
to suspect trouble already, not on a normal healthy timer.

## `// heartbeat timeout and a connectivity probe (see both above)`

Floor between one auto-rejoin attempt and the next -- the
heartbeat timeout and a connectivity probe (see both above)
run on independent timers and can end up agreeing something's
wrong within moments of each other; without this they'd both
fire attemptGuestAutoRejoin() and stack two overlapping
reconnect attempts on top of each other.

## `// reached into rather than duplicated" spirit as gameSaves`

Single mutable bag for the whole feature, same "one object,
reached into rather than duplicated" spirit as gameSaves
above. connections is host-only (peer id -> {conn, name});
hostConn is guest-only (this device's one connection to the
host). Both are left null/empty on the other role rather than
union-typed away, since which fields are meaningful always
follows directly from `role`.

## `// set once hosting actually starts. Guest-only: the host's`

Host-only: this device's own active save's hostSaveId --
set once hosting actually starts. Guest-only: the host's
hostSaveId, learned from the 'welcome' message (see
handleLobbyWelcome() below) -- what Guest Saves are keyed
by, and what lets a returning guest auto-load without ever
re-entering a name (see GAME_PANEL_NOTES.md's Guest Saves
notes).

## `// starter (plus the same synthetic 'host' key playerProgress`

Host-only: peer id -> true once that player has picked a
starter (plus the same synthetic 'host' key playerProgress
uses, only meaningful while hostIsPlayer is true). Set by
reportLobbyStarterChosen()/the 'starter-chosen' message
handler for a pick made live this session, and also
re-derived from each player's actual save data on
(re)join -- see finalizeGuestJoin()'s own hasStarter and
attemptHostPeerCreation()'s peer.on('open') -- so a save
that already has a starter from an earlier session doesn't
get re-prompted just because the Lobby itself restarted.
Read by allLobbyStartersChosen() to decide the Start Game
button's own text (see .game-lobby-start-game-btn's
comment). Cleared per-peer on disconnect in
handleHostConnectionDrop(), same as playerProgress, so a
player who leaves mid-pick doesn't permanently block the
button for everyone else -- reconnecting re-populates it
from their save the same way joining fresh does.

## `// keepalive (see startLobbyHeartbeat()/stopLobbyHeartbeat()`

Both roles: interval ids for the application-level
keepalive (see startLobbyHeartbeat()/stopLobbyHeartbeat()
below) -- WebRTC's own disconnect detection can take a
long time, or in practice sometimes never cleanly fire at
all (e.g. a PWA force-quit rather than a normal tab
close), to notice a dropped connection on its own.

## `// whenever no trade is in progress. Both roles use this same`

Trade a Pok\u00e9mon (see the chat this was built in) -- null
whenever no trade is in progress. Both roles use this same
shape regardless of whether this device is the inviter or
the invitee, or whether the trade partner is the Host or
another Guest (see sendTradeMessage()'s own comment for how
that routing is handled transparently either way):
partnerId/partnerName: the other player's roster id/name
incoming: true if partner sent the invite, false if this
device did -- purely for which overlay copy/buttons to
show, doesn't affect the state machine itself
accepted: true once the invite has been accepted by
whichever side received it
mySelection/partnerSelection: null until each side picks
which of their own team members to offer -- an object
`{ index, member }` for mine (index is this member's
position in *my own* team.members right now, needed to
remove the right one at execute time -- see
executeTradeIfReady()) or just `{ member }` for
partner's (their index means nothing on this device)
myConfirmed/partnerConfirmed: both must be true before
either side actually applies the swap -- see
executeTradeIfReady()

## `// trading with (mirrored both directions), covering BOTH`

Host-only: peer id -> the other peer id it's currently
trading with (mirrored both directions), covering BOTH
Guest\u2194Guest trades the Host isn't itself a party to and
Host\u2194Guest trades it is. Populated/cleared purely by
observing trade-* messages pass through
handleIncomingTradeMessage() -- the Host never joins or
decides a trade this way, it just needs to know "if this
peer drops, who else needs telling" for
handleHostConnectionDrop() below, since it has no other
way to know two Guests it's just relaying for are even
mid-trade at all.

## `// Lobby again." error is only true until a save exists, but nothing`

The "Create or load a save first, then tap Play Solo / Host a
Lobby again." error is only true until a save exists, but nothing
else owns that status line to clear it, so it used to ride along
into the color picker and the solo/lobby screens. Called as soon
as a save becomes active (createSave()/loadSaveSlot()) and again
when Play Solo goes ahead. Only clears that specific message --
any other status (a connection error, "Creating room...") is
left alone.

## `// (either role, safe to call from either) and puts the screen`

Tears down whatever connection/peer this device currently has
(either role, safe to call from either) and puts the screen
back to the host/join choice. Called both for an explicit
"Leave Lobby" tap and for the various failure paths below, so
there's exactly one place that actually resets the state.
---- Player color theming (see .game-panel-bg's own CSS
comment for the two things this actually drives) ----

This device's own chosen color while connected to a lobby --
a playing host's lives on lobbyState.hostColor (only
meaningful if hostIsPlayer is true; a hosting-only device has
no color of its own to theme with), a guest's on its linked
Guest Save's own playerColor (see finalizeGuestJoin(), which
is what keeps that field current). Null covers every other
case -- not connected, a hosting-only device, or a guest
that's connected but hasn't picked a color yet (mid-naming/
color-pick step) -- and is what tells
applyGamePanelPlayerTheme() below to fall back to the Game
panel's own default, untheme look.
---- Solo mode (Play a Game > Play Solo) ----

Deliberately NOT part of lobbyState: lobbyState.role === null
already means "solo" everywhere else in the script, and
resetLobbyState() wipes lobbyState wholesale. This small bag
only drives the Play a Game screen's solo view, the player
theme color, and the same Begin Game Setup / Start Game
buttons a hosting-and-playing host gets. Session-only, like a
lobby: a page reload drops back to the choice view.

## `// getMyLobbyThemeColor() above, whatever just changed it --`

Keeps #game-panel's data-player-theme attribute in sync with
getMyLobbyThemeColor() above, whatever just changed it --
joining, reconnecting, (re-)picking a color after a
'color-rejected', or disconnecting entirely. Called from
enterActiveLobbyState() (covers every "just connected with a
known color" path, host and guest alike) and resetLobbyState()
(covers every teardown path), same "one recompute, called from
every relevant spot" shape as updateLobbyStartGameButtonUI().

## `// blank shape FIRST, then destroy the old peer after --`

Grab the outgoing peer and swap lobbyState to its fresh,
blank shape FIRST, then destroy the old peer after --
deliberately not the other order. PeerJS's close/error
events can fire synchronously from inside .destroy()
(not just "a moment later" as you'd expect), and every
one of those handlers (see wireGuestConnection's own
conn.on('close')/('error'), for instance) guards itself
with a "is this stale?" check against the CURRENT
lobbyState (role/hostConn) to no-op on exactly this kind
of leftover event. That guard only works if lobbyState
has already been reset by the time the event lands --
destroying the old peer first meant a synchronous close
could fire while lobbyState still looked like the live,
pre-reset session, sail straight past the guard, and
kick off a reentrant attemptGuestAutoRejoin()/
joinLobbyByCode() mid-reset -- whose own reconnect then
got its role/hostConn silently clobbered back to null
the instant this function's own reassignment ran a
moment later, even though the new connection it started
kept working underneath. That's what let a just-kicked
guest end up with a live connection to the host but
lobbyState.role stuck at null -- neither host nor guest
-- which is also why the CSS that hides host-only
controls from a guest (keyed off data-role="guest")
never applied, and why the heartbeat send loop (gated on
role being 'host' or 'guest') silently stopped pinging,
so the host dropped it again once the timeout elapsed.

## `// back to this device's own local solo state -- while`

Hands the Sounds panel's transport controls and Game Stage
back to this device's own local solo state -- while
connected, both were driven by the lobby (see Playlist
Sync/Leading-Player Stage notes below); leaving needs to
undo both, not just reset the Lobby screen itself. A guest
save that was live stays active (just no longer editable --
see isActiveSaveReadOnly(), which now has no matching
linkedGuestSaveId to compare against), so
restoreSoloGameStage() below correctly starts deriving
from that guest save's own progress rather than needing a
separate "no save at all" case.

## `// ever mean anything alongside a live lobbyState.role, which`

Multiplayer Battle Arena -- the shared store/cache only
ever mean anything alongside a live lobbyState.role, which
is already null again by this point. Leaves the local
battleWildPokemon/battleAttacker* variables completely
alone -- solo Battle Arena keeps whatever this device had
showing before it ever joined/hosted, same as every other
solo tool on this reset.

## `// dimming/locking the screen while a multiplayer session is`

Screen Wake Lock -- stops the OS's own idle-timeout from
dimming/locking the screen while a multiplayer session is
active, so the ordinary "set the phone down between turns and
it locks itself" case never happens in the first place. This
is deliberately the only thing this touches: there's no web
API that can keep a page running, or a connection alive, once
a phone is ACTUALLY locked (a deliberate power-button press, or
the OS suspending an already-backgrounded tab regardless of
this lock) -- that's a platform-level suspension no page can
override. The heartbeat check's own conn.open double-check and
the visibilitychange handling further down exist for that case
instead, making a real lock/suspend cheap to recover from
rather than trying to prevent it outright.

## `// lobbyState.role/players (see renderTeamGrid()'s own`

Trade a Pok\u00e9mon's button visibility depends on
lobbyState.role/players (see renderTeamGrid()'s own
canStartTrade) -- covers the Host's own case, where hosting
starts with just itself in lobbyState.players and no
roster-changed event fires until a Guest actually joins
(see refreshLobbyRosterFromHostState()/the guest-side
'roster' handler for that ongoing case).

## `// event fires" reasoning as renderTeamGrid() just above --`

Same "covers the Host's own case before any roster-changed
event fires" reasoning as renderTeamGrid() just above --
gives the Start Game button its initial "Begin Game Setup"
text/enabled state the moment this device's own Lobby
screen goes active, rather than leaving it on whatever
static text the HTML happened to ship with.

## `// session surviving a PWA close/reopen) ----`

---- Connection keepalive (see the user's report of a stale
session surviving a PWA close/reopen) ----

WebRTC's own disconnect detection (what wireHostConnection's
'close'/'error' handlers and wireGuestConnection's own react
to) is not a reliable guarantee on its own -- it can take a
long time, and for an abrupt app close (force-quit, OS killing
a backgrounded PWA, losing network entirely) it may never
cleanly fire at all. This is the actual backstop: both sides
ping each other on a fixed interval, and if a connection goes
quiet for LOBBY_HEARTBEAT_TIMEOUT_MS with no message of any
kind (ping or otherwise -- see the `lastSeen`/`hostConnLastSeen`
updates in wireHostConnection/wireGuestConnection's own data
handlers), it's dropped exactly as if a 'close' event had
fired.

Started once from enterActiveLobbyState() above (covers both
"hosting just started" and "a guest just joined"), stopped
from resetLobbyState() so every teardown path -- explicit
Leave Lobby, the other side actually closing, a heartbeat
timeout on either end -- cleans its own timers up the same
way.
Guest-only. One place that decides how to come back from "the
host connection is actually gone," whatever noticed it first
-- the heartbeat timeout below, or
probeHostConnectionAndRecoverIfNeeded() further down. Guest
Saves already carry this player's name/color/progress by
hostSaveId (see handleLobbyWelcome()/finalizeGuestJoin()), so
joinLobbyByCode() resolves the rest on its own once the
connection's back -- nothing else needs caching here beyond
the room code itself.

## `// looking at literally anything else (the Pokédex, some`

A dropped connection can be noticed while this device is
looking at literally anything else (the Pokédex, some
other panel entirely, or with the Game panel closed) --
#game-lobby-status (see setLobbyStatus() below) only
renders at all once the Game panel is open and on the
Lobby screen specifically, so without this, a rejoin could
be working perfectly and still be completely invisible.
Same reasoning as the 'kicked'/'start-game' handlers.

## `// browser's own 'online' event (see both listeners further`

Guest-only. Called on both a visibilitychange resume and the
browser's own 'online' event (see both listeners further
down) -- neither is proof the connection to the host still
actually works. hostConn.open mostly reflects an explicit
close/error, not whether the data channel is still delivering
anything (see startLobbyHeartbeat()'s own heartbeatCheckTimer
comment for the fuller explanation of why that flag alone
isn't trustworthy) -- a connection that died silently, which
is the common case for an actual network drop, keeps reporting
open indefinitely. So rather than trusting that flag directly,
this pings the host and gives it a short grace window (see
LOBBY_CONNECTIVITY_PROBE_GRACE_MS) to answer -- any incoming
message counts, not just a reply to this exact ping -- before
deciding the connection is actually dead and rejoining from
scratch. Safe to call redundantly; a still-healthy connection
just gets an extra ping.

## `// feature (see the visibilitychange handler and`

Same try/catch as every other ping send in this
feature (see the visibilitychange handler and
probeHostConnectionAndRecoverIfNeeded() below) --
.open can lag the real RTCDataChannel state, so a
synchronous throw here is possible and shouldn't
skip the rest of this sweep's work. The next
heartbeatCheckTimer tick still catches a genuinely
dead connection either way.

## `// backgrounded some other way) freezes every timer in`

A phone that got locked (this device's own, or
backgrounded some other way) freezes every timer in
the tab, this one included -- once it resumes, this
callback fires however late it fires, with "now"
already moved on regardless of whether the OTHER side
ever actually went quiet. Comparing this sweep against
the last one (rather than trusting entry.conn.open,
which mostly reflects an explicit close/error and
stays true indefinitely through the much more common
"signal just silently died" kind of drop -- exactly
the case this needs to still catch) tells whether the
freeze happened HERE: a gap much bigger than the
interval itself means it did, so this one sweep skips
the elapsed-time check entirely rather than treating a
stale clock as a real timeout. The visibilitychange
handler above already re-pings and refreshes
lastSeen/hostConnLastSeen the moment this device
resumes, so the very next sweep -- one normal interval
later -- has trustworthy numbers again regardless.

## `//`

---- Leave-page warning for cards on the Wild Pok\u00e9mon ----

battleWildPokemon is pure in-memory state (see its own
comment) -- it's never written to the save. Every card on it
already LEFT its source (hand/Permanent/Active Card zone --
see resolveAttachSource()) when it was attached, and only
goes to a discard pile when the Wild Pok\u00e9mon is ended/
recalled (see discardMemberEquippedCards()), so a reload or
tab close mid-battle loses them for good. This asks the
browser to confirm before that can happen. A connected guest
is exempt: the Wild Pok\u00e9mon it sees is the Host's, which
survives a guest reloading. Only when the save actually uses
virtual decks -- without them there's no card inventory
here to lose. The browser shows its own generic wording (a
custom message isn't allowed), and some mobile browsers skip
the prompt entirely, so this is a safety net, not a guarantee.
Covers the NPC Trainer's Pok\u00e9mon (and its queue) too, not just
the Wild one -- see getArenaHeldCardIds(). Cards still left on
them after a reload are sent to their discard piles on the
next load (see recoverOrphanedArenaCards()), so staying on the
page is what keeps them attached.

## `// than replacing it: on an ordinary tab close/navigate-away,`

Best-effort fast path, complementing the heartbeat above rather
than replacing it: on an ordinary tab close/navigate-away,
this notices immediately instead of waiting out the full
timeout. Not a guarantee on its own -- pagehide can still be
skipped entirely by a force-quit or the OS abruptly killing a
backgrounded PWA, which is exactly the case the heartbeat
timeout above exists to actually cover.

## `// to actively check on things instead of waiting for the next`

Coming back from the background is the one moment it's cheap
to actively check on things instead of waiting for the next
scheduled heartbeat tick (up to LOBBY_HEARTBEAT_CHECK_INTERVAL_MS
away) or, worse, a stale one firing immediately on resume with
a falsely-huge elapsed time (see the heartbeat check's own
conn.open guard above for that half of this). Also where the
Wake Lock above needs re-requesting -- the browser releases it
automatically the instant the tab goes hidden, which is
exactly what let the phone lock itself in the first place.

## `// treating this same resume as a frozen-clock cycle (see its`

Keeps the very next heartbeatCheckTimer sweep from also
treating this same resume as a frozen-clock cycle (see its
own comment) -- harmless either way since that only skips
one sweep's timeout check, but there's no reason to skip a
second one right after this handler already did its own
fresh round of pings/refreshes above.

## `// foregrounded and visible the whole time, but the network`

Covers what visibilitychange above doesn't: the tab stayed
foregrounded and visible the whole time, but the network
itself dropped and came back (wifi hiccup, switching between
wifi and cellular, walking out of range and back). The
browser's own 'online' event is the signal for that -- same
probe-and-recover either way, harmless/redundant if the
connection turns out to have been fine the whole time. Host
side has no equivalent here -- a host doesn't reconnect to
anyone, its own connections either survive or get caught by
the normal heartbeat timeout regardless of what triggered the
drop.

## `// query param (see GAME_PANEL_NOTES.md §3's QR idea) rather than`

Encodes a URL back to this same page with the room code as a
query param (see GAME_PANEL_NOTES.md §3's QR idea) rather than
just the bare code, so scanning it both opens the site AND
pre-fills the Join card below -- see the prefillLobbyFromUrl()
IIFE at the very end of the script for the other half of this.

## `// no "update text" method of its own -- clearing the container`

qrcodejs renders directly into the element it's given and has
no "update text" method of its own -- clearing the container
first is what makes this safe to call again (e.g. Host a
Lobby -> Leave -> Host a Lobby again, generating a new code
each time).

## `// very end of the script, for a QR code opened via a normal page`

Shared by the URL-based prefill (prefillLobbyFromUrl() at the
very end of the script, for a QR code opened via a normal page
navigation) and the in-app scanner below (for a QR code read
directly off the camera, no navigation involved at all) --
both need to pull a room code out of whatever text was
decoded. Accepts either a full lobbyJoinUrl()-style URL or a
bare code on its own, in case a QR code ever ends up encoding
just the code itself rather than a full link.

## `// Join card) -- built as a fallback to the phone's own Camera/QR`

---- In-app QR scanner (see the "Scan QR Code" button on the
Join card) -- built as a fallback to the phone's own Camera/QR
shortcut, several stock Android flows for which hand a matched
link straight to the browser regardless of any installed-app
link handling (see GAME_PANEL_NOTES.md's notes on this).
Scanning from inside the app itself sidesteps that entirely --
there's no cross-app hand-off left to get intercepted, since
the code is read and acted on right here.

## `// that class's own CSS comment): a solo player picking a color`

Opens .game-lobby-color-pick for one of its two use cases (see
that class's own CSS comment): a solo player picking a color
for the first time, or a returning guest whose
remembered color has since been taken by someone else.
Choosing an available swatch commits immediately -- no
separate Confirm button, same as the Note Color picker
elsewhere in this doc.

## `// picks both name and color on the one screen (see`

Naming step's own pending color pick -- a brand-new guest
picks both name and color on the one screen (see
.game-lobby-naming's own color grid), so unlike the bare
color-pick step above, choosing a swatch here just marks it
selected and unlocks the Join Lobby button rather than
submitting immediately.

## `// start -- a lobby's identity (hostSaveId) has to live somewhere`

Requires an active *host* save before hosting can actually
start -- a lobby's identity (hostSaveId) has to live somewhere
durable for a returning guest to find again next time (see
Guest Saves notes above), and there's no such thing as a
durable identity for progress that only lives in
unsavedSessionData. If nothing's loaded, this opens the Saves
section's creation form on the spot instead of starting to
host -- tapping "Host a Lobby" again once a save exists picks
up from here normally.

Doesn't start hosting directly any more -- see the
.game-lobby-host-role step this hands off to next
(chooseHostOnly()/chooseHostAsPlayer() below), which is what
actually calls startHostingLobby().

## `// when playing, color) on one screen, then Start Hosting. It's`

The host's counterpart to the guest's naming step: name (and,
when playing, color) on one screen, then Start Hosting. It's
only shown while something is still unset -- once a save has a
name and (if playing) a color, chooseHostOnly()/chooseHostAsPlayer()
skip straight to hosting, and a name that's set is read-only here.
Pre-filled values -- name from
what this save last hosted as (the generic 'Trainer' fallback
doesn't count, or it would hide the Preferred Name forever),
else the Preferred Name; color from this save's remembered
one (nobody else can be connected yet, so it can't collide).

## `// on the same room code (so guests who are waiting for the host reconnect on their own). `

TV Table / Hybrid 2: only the device that first hosted this save may host it, always as a non-playing host, and always
on the same room code (so guests who are waiting for the host reconnect on their own). The room code may still be held
by the broker for a little while after a crash; attemptHostPeerCreation() keeps retrying it for the grace window.

## `// attemptHostPeerCreation() keeps retrying it only while hostTransferGraceUntil is in the`

Host Transfer takeover (see completeHostTakeover()): the old host may not have released the room code yet, and
attemptHostPeerCreation() keeps retrying it only while hostTransferGraceUntil is in the future. Stopping the
rejoin attempts zeroes that window, so it's carried across the call -- without this the very first "code is
still taken" reply from the old host was treated as final ("Could not take over the room").

## `// *different* save later doesn't carry over a name that`

Remembered per-save (not globally) so re-loading a
*different* save later doesn't carry over a name that
belonged to a different game -- see openHostSetup(), which
is what reads this back. hostPlayerColor gets the
same treatment (also read back there), and is left untouched -- not cleared --
when hosting only, so choosing to play again later still
remembers it.

## `// comparison immediately, using this device's currently`

Seeds the host's own entry in the leading-player
comparison immediately, using this device's currently
active save/session -- so the Sounds panel already has
a correct (if single-player-for-now) Game Stage the
instant hosting starts, rather than waiting on a badge
change or a guest to join. See recomputeLobbyLeadingStage().

## `// own comment) -- if this save's team roster is already`

Per-save, not per-session (see allLobbyStartersChosen()'s
own comment) -- if this save's team roster is already
non-empty (a break resumed, or hosting the same save a
second time after finishing a round earlier), the host's
own starter pick from back then still counts and
shouldn't force a fresh prompt. Only meaningful at all
once hostIsPlayer is known -- a hosting-only device was
never expected to pick one in the first place.

## `// before ever picking one, rather than only finding out`

Lets a joining guest grey out already-claimed swatches
before ever picking one, rather than only finding out
via a round-trip 'color-rejected' after the fact (see
getLobbyTakenColors()/wireHostConnection()'s own
'identify' handling for the backstop that still exists
for the genuine-race case this can't catch on its own).

## `// device is actively hosting and the active save changes out`

Called from createSave()/loadSaveSlot() above whenever this
device is actively hosting and the active save changes out
from under that session -- without this, every connected
guest would silently keep transacting against their OLD guest
save (still linked to the previous hostSaveId) while this
device's own Sounds panel/leading-player figures started
reflecting a completely different save underneath them. That
was a real bug: a guest's progress on an old save could end up
feeding the leading-player comparison for a *new* save that
save had nothing to do with, because lobbyState.playerProgress
and every guest's own activeGuestSaveId both just... never
found out anything had changed.

The fix re-runs the exact same 'welcome' handshake a brand-new
connection gets (see wireHostConnection/buildLobbyWelcomePayload
above) against every *already*-connected guest. Each one re-
resolves its own identity for *this specific* save through the
normal handleLobbyWelcome()/finalizeGuestJoin() path -- an
existing guest save for it means a silent rejoin; never having
played this particular save before means the naming step
again, exactly like a fresh connection would. Stale progress
numbers from the old save are dropped outright rather than
carried forward.

## `// last game kept saying "Game is in progress" for a brand-new save (hiding Begin Game Set`

How far along the game is belongs to the previous game too. Left alone, a lobby that had already started its
last game kept saying "Game is in progress" for a brand-new save (hiding Begin Game Setup), and the welcomes
built below told every guest the same. A fresh hosting session starts all of this cleared, with the host's own
starter read from the save (see startHostingLobby()); each guest's starter is reported again when they
re-identify against this save. The Game Board is per game as well. None of it applies when the same save is
just reloaded, since that's the same game.

## `// connected player is about to re-identify against this one`

Colors belong to the PREVIOUS save's identities -- every
connected player is about to re-identify against this one
(silently, via an existing guest save, or via the naming/
color step), so nothing should stay marked as taken in the
meantime. Left alone, each player's own old color (and
everyone else's) counted as taken while they were being
asked to pick again. Done before the welcomes are built so
takenColors reflects it.

## `// host's heartbeat has noticed the old connection is`

A guest that reconnects fast enough -- before the
host's heartbeat has noticed the old connection is
gone -- now carries its persistent guestClientId right
in the connection metadata (see joinLobbyByCode()'s own
peer.connect() call), available immediately here rather
than only once 'identify' arrives further down. That
timing is what actually matters: evicting the stale
connection here, before the placeholder entry below is
created and before 'welcome' is sent, means the
takenColors this brand-new connection is told about
never includes its OWN old color in the first place --
no color-picker detour, and no moment where both the
old and new connections' placeholder entries coexist in
the roster. Evicting only later, from 'identify' (as
this used to), was too late for both: 'welcome' (and
its takenColors) had already gone out, and the
placeholder entry for this new connection had already
been added alongside the still-lingering old one.

## `// a guest no longer sends its name at connect time (it`

Placeholder until the real 'identify' message below --
a guest no longer sends its name at connect time (it
usually doesn't know it yet: see handleLobbyWelcome()),
so this briefly shows "Trainer" in the roster for
every new connection regardless of role. guestClientId
itself, though, IS already known if metadata carried
one (see above) -- setting it here too, not just from
'identify', means a second/third rapid reconnect
racing in before this one's own 'identify' arrives can
still find and evict THIS entry by guestClientId.

## `// harmlessly, to everyone else already connected) the`

Also gives this brand-new connection (redundantly, but
harmlessly, to everyone else already connected) the
host's *current* Playlist Sync state right away --
without this, a guest wouldn't see the correct region/
category/now-playing info until the host happened to
touch something that would normally trigger a
broadcast (see broadcastLobbyMusicState()'s own hook in
renderMusicPlayerUI()).

## `// the dedicated 'ping' type -- so an actively-playing`

Any message at all counts as "still there" -- not just
the dedicated 'ping' type -- so an actively-playing
guest (sending progress/category/transport requests
regularly) never risks a spurious timeout just because
its next scheduled ping hasn't come around yet. See
startLobbyHeartbeat()'s own comment for why this exists.

## `// own conn.on('open') above already does from`

Backstop for the same eviction wireHostConnection's
own conn.on('open') above already does from
connection metadata -- covers a connection that
somehow reached here without ever getting a
guestClientId into its entry that way (metadata
missing or stripped somewhere along the way).
Harmless no-op in the normal case, since 'open'
already evicted any stale duplicate by the time
'identify' arrives.

## `// (see the naming/color-pick UI, which always sends`

A color is required alongside the name from here on
(see the naming/color-pick UI, which always sends
one now) -- validated before anything else commits,
so a genuine race between two joins, or a stale
Guest Save remembering a color someone else has
since taken, can never leave two players sharing
one. Rejecting outright (rather than silently
overwriting or auto-picking a replacement) puts the
choice of what to use instead back in the guest's
own hands -- see the guest-side 'color-rejected'
handling this pairs with.

## `// hand -- see getOrCreateGuestClientId()'s own`

Links this connection to its durable Hand & Decks
hand -- see getOrCreateGuestClientId()'s own
comment for why this (rather than conn.peer) is
what save.guestHands is actually keyed by. Sends
back whatever hand this exact player already had
on file (empty for a genuinely new player, restored
for one reconnecting mid-game or rejoining a later
session) so this guest's own local cache reconciles
to the Host's authoritative copy rather than
trusting its own possibly-stale localStorage.

## `// of the three ways that can happen: a clean 'close' event, an`

Shared teardown for a single connection going away, whichever
of the three ways that can happen: a clean 'close' event, an
'error' event, or the heartbeat check above deciding it's gone
quiet for too long. All three should have the exact same
effect on the roster/progress/stage, so there's exactly one
place that actually does it.
Host-only manual override (see .game-lobby-kick-btn's own CSS
comment for the "just in case" it exists for) -- tells the
guest first, then reuses handleHostConnectionDrop() for the
exact same cleanup an automatically-detected drop already
goes through (roster, trade cancellation, freeing up the
color, all of it), so kicking someone can never leave the
state in a different shape than a real disconnect would.
Works unconditionally regardless of what entry.conn.open
currently claims -- the whole point is to clear a slot by
hand even if the connection object itself is confused about
its own state.

## `// this device's own cleanup -- roster, trade cancellation,`

Passing null here (rather than conn) does every bit of
this device's own cleanup -- roster, trade cancellation,
freeing the color -- immediately, exactly like a real drop
would, but deliberately leaves the actual conn.close() to
the setTimeout below rather than doing it in the same tick
as the 'kicked' send() just above. Closing a data channel
right after sending on it doesn't guarantee that last
message actually reached the other side first -- PeerJS/
WebRTC can (and in practice does) tear the channel down
before it's flushed, which is what let a kicked guest's
connection go straight to its own conn.on('close')/('error')
and fall into attemptGuestAutoRejoin() instead of ever
seeing 'kicked' at all -- rejoining for several seconds
before its own heartbeat gave up and it finally saw "Lost
contact with the host" instead of the real reason. This
short, otherwise-invisible delay is what gives 'kicked'
time to actually land before this side hangs up on it.

## `// The host picks a connected guest ("Make Host" in the roster).`

---- Host Transfer (manual handoff) ----
The host picks a connected guest ("Make Host" in the roster).
That guest receives the host's COMPLETE save (decks, every
player's hand/permanents/claims, Trainer Card claims...) and,
if it accepts, swaps its own player data into that save, takes
over the SAME room code, and everyone else's ordinary
auto-rejoin lands on it. The old host steps down to a guest
(when it was playing) with its own player data moved into a
normal Guest Save. Nothing is deleted on the old device, so a
failed handoff can always be recovered by re-hosting that save.

## `// guest -- e.g. the old host reloaded its page and someone else`

A device that hosted this game and is now (re)joining it as a
guest -- e.g. the old host reloaded its page and someone else
took over meanwhile -- has no Guest Save yet, only its old host
save. Without this it was treated as a brand-new player (name +
color pick, none of its team/hand). Only applies when the host
was also a player (it had a color); a host-only device has no
player identity to carry over.

## `// A reload wipes all in-memory lobby state, so without this a`

---- Remembering the lobby across a page reload ----
A reload wipes all in-memory lobby state, so without this a
device that refreshed (or whose page was discarded) had no idea
it had ever been in a lobby. The record is tiny and only trusted
while recent; it's cleared by any deliberate exit.

## `// go back in. A reloaded HOST rejoins as a guest too -- if nobody`

Runs once after load: if this device was in a lobby moments ago,
go back in. A reloaded HOST rejoins as a guest too -- if nobody
has taken over yet it keeps retrying through the failover window
(and its old host save is adopted as its Guest Save on welcome).
TV Table / Hybrid 2, after a reload or crash of the host device: nobody else may take the room over, so the original host
device hosts its own save again right away (same room code; guests that were waiting reconnect by themselves).

## `// The host streams its complete save to every guest (debounced, on`

---- Automatic Host Failover (Phase 2) ----
The host streams its complete save to every guest (debounced, on
every save/roster change). If the host drops, guests keep
retrying the room code while a succession order decides who
takes over: rank 0 after FAILOVER_BASE_DELAY_MS, each later rank
FAILOVER_STAGGER_MS after that. The PeerJS broker only lets ONE
peer hold the room code, so it's the tiebreaker -- a candidate
first PROBES the code (new Peer(code)) and only converts its
save to a host save once it actually holds it. A guest that
merely lost its own connection can't claim anything (the code is
still held, or it can't reach the broker), so it never becomes a
rogue host. Reuses buildHostTakeoverSave()/completeHostTakeover().

## `// old host) keeps trying to rejoin the SAME room code until it gets`

After a handoff, every non-new-host device (the bystanders AND the
old host) keeps trying to rejoin the SAME room code until it gets
through or the grace window ends. One timer, one attempt at a time
-- joinLobbyByCode(code) with no attempt number fully resets any
previous half-finished attempt first, so attempts can't pile up.
Rolling breadcrumb trail for the handoff/reconnect path, shown on
screen when a reconnect gives up so a failure explains itself.

## `// about to host a different game. Same end state as leaving the lobby`

The user gave up on getting back in (Cancel Rejoin button), or is
about to host a different game. Same end state as leaving the lobby
on purpose: nothing keeps retrying, a reload won't resume it, and
the screen is back on the host/join choice.

## `// (see tradePairs' own comment for why the Host tracks this`

Trade a Pok\u00e9mon -- if this peer was mid-trade with anyone
(see tradePairs' own comment for why the Host tracks this
at all), that partner has no other way to find out this
side just vanished, since Guest\u2194Guest trades have no
direct connection of their own to notice a drop on. If the
partner is the Host itself, cancel locally the same way
handleTradeCancelReceived() would from a real message
rather than looping one back through sendTradeMessage().

## `// from lobbyState.connections (plus the host itself) any time a`

Host's single source of truth for the roster -- rebuilt
from lobbyState.connections (plus the host itself) any time a
connection opens or closes, then pushed out to every connected
guest and re-rendered locally, so host and guests never have
to separately reconcile their own copies of "who's here."

## `//`

---- Leading-Player Stage (see GAME_PANEL_NOTES.md §3) ----

Host-only: recomputes which connected player -- including the
host itself -- is furthest along by badge points,
and pushes the result into the Sounds panel via
setActiveGameStage() -- the same "one call" hook
deriveGameStage() has always fed (see afterBadgeChange()
below), just now driven by the whole lobby's progress instead
of only this device's own. The ruleset itself (gameLength)
still comes from the *host's* own active save -- there's only
one Sounds panel actually playing music, and it's the host's,
so it's the host's rules that decide when it changes stage. A
guest's own local Game Stage is deliberately left alone while
connected (see afterBadgeChange()) since only the host's device
is the one actually playing anything.

## `// to the host. Called once as soon as this device's identity is`

Guest-only: sends this device's own current badge progress up
to the host. Called once as soon as this device's identity is
resolved (see finalizeGuestJoin() -- not simply on connection
open, since which save's progress to report isn't known until
then) and again from afterBadgeChange() any time it changes.
hasStarter is redundant with (not a replacement for)
reportLobbyStarterChosen()/finalizeGuestJoin()'s own hasStarter
-- this just means every place that already calls this (every
badge change, plus once right after joining) is also a second,
independent chance for the Start Game button to notice this
device already has one, in case the dedicated message somehow
never landed. Host-side merges it in with OR rather than
overwriting (see the 'progress' handler), so this can only
ever confirm a starter, never un-set one.

## `// empty to non-empty (see addOrQueueTeamMember()'s own`

Called the moment this device's own team roster goes from
empty to non-empty (see addOrQueueTeamMember()'s own
wasRosterEmpty) -- that first Pokémon is always this device's
starter, since beginTeamAddMode() forces the Starter filter on
for exactly this case. A guest tells the host directly, over
the same connection reportLobbyProgress() uses; the host's own
pick (only reachable at all when lobbyState.hostIsPlayer --
see beginGameSetup()) just marks itself under the same 'host'
key playerProgress already uses elsewhere, with no message to
send anywhere. Solo play (no lobbyState.role) has nothing to
report to and is a no-op here.

This is the "just picked it live, mid-session" path --
starterChosen also gets set from a save's already-existing
team roster on (re)join (see finalizeGuestJoin()'s own
hasStarter and attemptHostPeerCreation()'s peer.on('open')),
which is what makes the flag survive a Lobby restart rather
than resetting every session the way it used to.

## `// starter has actually done so. "Expected" is every connected`

Host-only: whether every player currently expected to pick a
starter has actually done so. "Expected" is every connected
guest, plus the host itself only when lobbyState.hostIsPlayer
(a host who's just running the lobby was never sent to a
starter picker in the first place -- see beginGameSetup()).
Empty on purpose returns false rather than vacuously true --
there's no one to have readied up yet (e.g. hosting alone with
hostIsPlayer false), so the button has nothing to advance to.

## `// #game-lobby-start-game-btn's text/disabled state, kept in sync`

Host-only: the single place that ever writes to
#game-lobby-start-game-btn's text/disabled state, kept in sync
with lobbyState.starterChosen/gameOfficiallyStarted rather than
ever being read back out of the button itself. See
.game-lobby-start-game-btn's own HTML comment for the three
states this moves between. Harmless no-op on a guest's device
(the button's just hidden there via
.game-lobby[data-role="guest"] .game-lobby-start-game-btn) and
before the button exists in the DOM at all.

## `//`

---- Trade a Pok\u00e9mon ----

Lobby-only, live-connection-required feature (see the chat this
was scoped in) -- always a strict 1-for-1 swap between any two
connected players, Host or Guest on either side, requiring both
sides to explicitly confirm before either roster actually
changes. See lobbyState.tradeSession's own comment for the
state shape, and tradePairs' comment (up in lobbyState/
handleHostConnectionDrop) for how a mid-trade disconnect is
handled when the Host isn't one of the two trading.

This device's own id in lobbyState.players -- 'host' if
hosting, this device's own PeerJS-assigned id if guesting
(which is exactly what the Host sees as conn.peer for this
connection, so it's the right value to compare against
`to`/`from` fields on trade messages). Returns null before a
Peer exists yet, which shouldn't be reachable in practice since
nothing trade-related is even shown until a Lobby is active.
===== Virtual Game Board =====
The save setting behind it: the save's Play Mode ("How Will You Be Playing?") -- see PLAY_MODES.
Same lookup order as isVirtualDecksEnabledForActiveSave().

## `// is still the source of truth, so every existing .value read/write keeps working. This j`

Yes/No settings are shown as switches (.game-yn-toggle) but the hidden <select> beside each
is still the source of truth, so every existing .value read/write keeps working. This just
mirrors each select's value onto its switch. Called from syncPlayModeFields() (which the
form/default-population code already calls after setting values) and after every toggle click.

## `// this app. This block is only the adapter: it loads board.js + board-<region>.json`

The map itself lives in board.js (BoardMap.mount) and knows nothing about
this app. This block is only the adapter: it loads board.js + board-<region>.json
on first use, hands the map a send() function and the lobby roster, routes
the board-* messages (see the host and guest dispatchers), and runs the
board view (#board-view). Moves arrive tagged with conn.peer, never
with an id the guest supplied. Everything is `var` so renderLobbyPlayers()
can safely call boardSyncPlayers() even before this block has executed.

## `// http(s) URL (used as-is) or a path under BOARD_THUMB_BASE (PokeAPI's HOME renders, e.g.`

Pokémon left face-up on a space are drawn as a picture. Each pokemon-data.json entry's "thumb" is either a full
http(s) URL (used as-is) or a path under BOARD_THUMB_BASE (PokeAPI's HOME renders, e.g. "25.png", "shiny/130.png").
If a picture fails to load, the entry's own "src" token art is tried next, then the name is written on the space.

## `// reload and a color change -- unlike the connection id or the color. Only the host/solo `

The durable per-device id (the same one hands and Trainer Card claims are keyed by), which survives a reconnect, a
reload and a color change -- unlike the connection id or the color. Only the host/solo device can know it for
everyone; a guest has no way to see other players' ids.

## `// Only when the game is played fully virtually (Virtual Decks AND the in-app map set to V`

---- Player turns ----
Only when the game is played fully virtually (Virtual Decks AND the in-app map set to Virtual Tokens), in solo and multiplayer.
The host (or the solo player) owns the turn state: Start Game shuffles the players into a turn order (a save that already has one
keeps it, and anyone new goes to the end), and it is stored in the host's save as save.turns so a reload resumes from the same
turn. Players are tracked by their stable client id (the one the board saves use), since a reconnecting guest gets a new peer id.
Guests are sent a ready-to-draw "view" of it ('turn-state'; also inside 'welcome' for anyone joining later) and ask the host to
end their turn with 'turn-end'. A player who is not currently in the lobby is skipped when the turn passes on.

## `// Some cards sit in the Permanent Zone (or, for Overlay cards like Team Rocket, on a Poké`

---- Card upkeep (see the chat this was designed in) ----
Some cards sit in the Permanent Zone (or, for Overlay cards like Team Rocket, on a Pokémon) and need something done
at a particular moment: add a counter, discard, resolve an effect. A card opts in with an `upkeep` array in cards.json;
each rule says WHEN it applies and what the player is asked to do. When the moment comes, the card's own viewer (the same
one a tap on it opens) is brought up with a short note on top saying what's needed. The player does the actual work with
the viewer's normal buttons -- the system only brings the card to them. Closing the viewer moves on to the next card.

"upkeep": [ { "trigger": "...", "action": "...", "message": "...", ...options } ]

trigger  turnStart    -- when this player's turn begins
turnEnd      -- when this player ends their turn (the turn doesn't pass on until each card has been shown)
newSpace     -- a move (the turn's Movement Die move, or a Blimp Ride's) ended on a different space than it began on
(Stay on Space, Dig, Fly and Teleport are not moves)
enterSpace   -- during a move, the marker walked onto (or through) a space whose color satisfies spaceColor (below)
revealPokemon -- a face-down Pokémon on this player's space was just revealed by their encounter (the card's viewer comes up
BEFORE the encounter starts; {color} is the space's color). Radio: PKMN March -- see radioMarchBegin()
action   discard | counter | resolve -- only wording for now: the player does it with the viewer's own buttons
message  shown on the note; {color} becomes the space's color
afterOwnTurns  N   -- skip this rule until the player has started N more turns of their own since the card appeared
(placed during turn 3 with N = 1: first fires at the end of turn 4). Only meaningful with turnEnd/turnStart.
spaceColor     "match" -- some space walked during the move must have a color equal the card's chosen token color (entry.noteColor);
or a literal color name such as "red"
condition      "noCounters" -- (Permanent cards) only while the card has no counters left on it
oncePerTurn    true -- fires at most once in any one of the player's turns (turnStart always behaves this way); leave it
off for things that should happen every time, like a counter per move

Needs the player turns above to be running (full virtual play), since "own turns" and "this turn" mean nothing otherwise.
Everything is judged on this player's own device: Permanent cards are in this device's save, team data never leaves it,
and the board tells each device about its own player's landings.

Bookkeeping that isn't part of the card itself lives in the save: data.upkeepStamps[instanceId] for Permanent entries and
member.overlayUpkeep for Overlay cards, each { placed: the player's own turn count when the card was first seen,
fired: { ruleIndex: turn number it last fired } }.

## `// so "the turn it was placed" is right even for a card that appeared during someone else'`

Notices cards that have just arrived (called whenever the Hand & Decks or Team grids redraw, and at every turn boundary),
so "the turn it was placed" is right even for a card that appeared during someone else's turn. Also drops the
bookkeeping of Permanent cards that have left.

## `// it began, or left and came back) or on walking over a color (colors = the colors of eve`

A move window closed (see boardMoveDone()): the things that trigger on moving to a new space (moved = it ended somewhere else than
it began, or left and came back) or on walking over a color (colors = the colors of every space walked). Returns the items to show; the caller presents them. A Blimp Ride's window counts as its own move.

## `// board.js asks, for the player moving THEIR OWN marker on THIS device, whether they may `

---- Gates on paths ----
board.js asks, for the player moving THEIR OWN marker on THIS device, whether they may cross a gated path. Every gate is
player-specific, so each is checked against this device's own save. Returns null (may cross) or the reason (shown as a toast
and over the locked space). Bad or incomplete gate data never locks a player out -- it lets them through.
Gate types come from the Board Editor: badge | villain | item | ability | points | other.

## `// Each is usable (full colour) once this player meets the same requirements the map's abi`

---- Movement-ability buttons ----
Each is usable (full colour) once this player meets the same requirements the map's ability gates use (boardGateCheck):
Dig and Teleport need a team Pok\u00e9mon with the ability, Fly also a Tier 3+ Gym Badge, Surf a Tier 5+ one (BOARD_ABILITY_GATE_MIN_TIER).
Pressing one: Surf just says what it does; Dig / Fly / Teleport ask for confirmation, then move this player's marker straight to
a City (boardUseAbility below). A locked button says what is missing instead.
The bar also holds the two movement buttons, first in line. 'roll' is always usable; 'stay' only while this player's marker is on a
City space. Their ids (board-roll-btn / board-stay-btn) are what the click handler at the bottom of the board code listens for.

## `// A City counts once the player's marker has landed on it or passed through it. It is kep`

---- Cities this player has been to (for Fly) ----
A City counts once the player's marker has landed on it or passed through it. It is kept in this player's own save
(save.boardVisited[region] = [space ids]) so it survives a reload, like movePenalty. Only the device that moved records it.

## `// When every Pokémon on this player's team is Fainted or carrying an Overlay Card (none u`

---- Blacked out ----
When every Pokémon on this player's team is Fainted or carrying an Overlay Card (none usable), they black out: their Trainer Figure goes
straight back to their Current Home (no actions box), they discard half their hand (rounded up, their choice), and their turn ends.
It fires when the team BECOMES unusable (renderTeamGrid runs after every team change), not merely because a saved game already in
that state was loaded, and it waits for a battle in progress to finish. While blacked out (until a Pokémon is usable again) the
marker is see-through and the player doesn't count as being on a space for other players' Battle / Trade actions.
The flag is kept in the player's own save (save.blackedOut); the Host keeps everyone's as a set and shares it (blackout-flag up,
blackout-set down), and board.js draws it and leaves those players out of the landing prompt's "also here" list.

## `// discard until play had moved on). The player says whether they owe (blackout-owing up);`

While anyone still owes their blackout discard the turn order doesn't move, whoever's turn it is (otherwise they could sit out the
discard until play had moved on). The player says whether they owe (blackout-owing up); the Host keeps the set, shares it (blackout-owing-set
down), forgets a player who disconnects, and turnsAdvance() refuses to pass the turn while the set isn't empty.

## `// lobby and back -- doesn't wipe the penalty. The first time a save is looked at it is re`

The debt is kept in the player's own save (save.blackoutOwed = { left, turnNo }), so reloading the page -- or dropping out of the
lobby and back -- doesn't wipe the penalty. The first time a save is looked at it is read back in (and the hand opened to pay it);
only after that does anything get written, so a fresh page load can't erase a debt before it has been restored.

## `// here in their Permanent zone walks through as normal (names are matched without accents`

Pok\u00e9mon gates: every preset boss (a spawn in the map file) blocks travel until it is defeated or caught. A player holding the item named
here in their Permanent zone walks through as normal (names are matched without accents / case, like the item gates). Add more as needed.

## `// moved since the window opened -- the window's net route plus that path (see boardRouteA`

path: the whole path being planned (from where the marker was picked up). During a move window the number shown is the total spaces
moved since the window opened -- the window's net route plus that path (see boardRouteApply()) -- and it stays up until the move is done.

## `// space, Home gone). guestClientId is the durable identity (the same one hands and Traine`

A guest who reconnects gets a NEW connection id, so the board would see a stranger (token back on the Start
space, Home gone). guestClientId is the durable identity (the same one hands and Trainer Card claims use), so
when it shows up under a different id the board moves that player's state across before anything else runs.

## `// (and a host who was just handed the game consumes the board it was given at once). Host`

Builds the host's board without waiting for someone to open the map, so every guest gets the board-state straight away
(and a host who was just handed the game consumes the board it was given at once). Host only, only while a game is in
progress and the save has the in-app region map turned on; guests never build early. A failed attempt (for example the
Pokémon data still loading) is simply retried the next time a guest identifies.

## `// The form a Pokémon was CAUGHT as is stamped on the member (member.caughtAs) the first t`

--- caught Pokémon: each team's caught forms -> the host's board, so they stay out of the wild pool ---
The form a Pokémon was CAUGHT as is stamped on the member (member.caughtAs) the first time a save is written
with it on a team, because evolving overwrites member.name. A member already evolved before this existed can
only be stamped with its current form. Trades keep the stamp (it travels with the member).

## `// reports, 'host' meant THEIR team, so it is re-keyed to their durable id (they are an or`

What a taking-over host resumes from: the board's full state out of the backup. In the old host's caught-form
reports, 'host' meant THEIR team, so it is re-keyed to their durable id (they are an ordinary player now and will
re-report); this device's own entry from its time as a guest is dropped, since its team is now the 'host' report.

## `// still being built and has not had its restore applied -- holds the board it was GIVEN i`

A device that was handed the host role but whose board has not been built yet (nobody opened the map) -- or is
still being built and has not had its restore applied -- holds the board it was GIVEN in boardPendingRestore.
Passing that on is what keeps the next host (and the host backup) from losing everyone's positions.
A board left over from this device's time as a GUEST is still mounted right after it takes over, until the map is
next opened and rebuilt as a host board. It has no host state to export, so it counts as "not built" here.

## `// The board lives in memory, so without this a reload (or loading another save and coming`

---- Saving the board with the game save --------------------------------------------------------------------------
The board lives in memory, so without this a reload (or loading another save and coming back) dealt a brand-new one:
tokens at the start, every Pokémon reset and re-shuffled. It is stored on the host's / solo player's save itself
(save.boardState), a moment after any change, and put back when the board is next built for that save. Guests never
save a board; the host's is the one that counts. Not for a session that isn't a save (nothing to attach it to).

## `// write that lands after the player switched saves still goes to the right one. 'force' i`

Writes into the save this board was built for (looked up by its id, not by "whichever save is active now"), so a
write that lands after the player switched saves still goes to the right one. `force` is for the moment the old
board is being thrown away.

## `// A token's color comes from the color word in its search tags (pink/green/blue/yellow/re`

--- pools: TEMPORARY stand-in for the Pokédex selector = every Pokémon carrying the save's region tag (kanto = the original 151) ---
A token's color comes from the color word in its search tags (pink/green/blue/yellow/red); the
'legendary' tag puts it in the orange pool. Anything with none or several color tags is left
out and listed in boardPoolAudit / the console.

## `// The board is per game. When the host moves to a different save with the lobby still up,`

--- landings: the board (on the host / solo device) reports where a move ended; the player's own device gets the choices ---
The board is per game. When the host moves to a different save with the lobby still up, the old positions, Pokémon,
Homes and caught reports must not carry over: the host drops its board, guests are told to drop theirs, and if the
map is open a fresh one comes up.

## `// A space's 'actions' entries are either plain text (display only) or an object such as`

---- Board space actions ----
A space's `actions` entries are either plain text (display only) or an object such as
{ type: 'gym-battle', leader: 'kanto-brock', label: 'Gym Battle (Brock)' }
leader = an id from gym-leaders.json; label = the text shown for it (blank: made from the type and leader).
Elite Four and Champion actions may leave `leader` out, and the player then chooses which card to face.
Older maps wrote these as text ("Gym Battle (Brock)", "Battle Elite Four"), which is still understood.

## `// they have unlocked to draw from (Novice always; Advanced and Expert once their Badge Ti`

Move Tutor: draw 1 card from the TM deck. With Tiered TM Decks on, the player picks which of the TM decks
they have unlocked to draw from (Novice always; Advanced and Expert once their Badge Tier is reached).
With only one choice there is nothing to pick, so it draws straight away.

## `// The Contest runs on its own screen (#game-screen-contest), laid out like the Battle Are`

---- Contest Hall ----
The Contest runs on its own screen (#game-screen-contest), laid out like the Battle Arena but without any of its
battle machinery. The flow: choose a Contestant from the Team Tracker (its send-to-battle mode, see teamContestPick),
choose the opponent (a random token of the same color from the board's pool, or one picked by hand in the gallery,
for players using physical tokens), roll the Contest dice, then take the Victory Rewards or the Loss Penalty.
Moves come from known_moves only (no Attach cards). A Move with 0 strength, or a manual / derived one (the "*" ones),
gains +2. The Hoenn Contest track plays from the moment the action starts until it is entirely resolved.

contestSession = { phase, info, color, mineIndex, mine: {name, member}, opp: {name, source, member, tracked},
mineScore, oppScore, winner, ties, left, ribbonGranted }
phase: 'pick-mine' (Team Tracker) -> 'choose-opp' (random / choose prompt) -> 'pick-opp' (gallery)
-> 'ready' | 'tie' (on the screen, waiting for a roll) -> 'won' | 'lost' (waiting for the reward / penalty)

## `// plus the usual STAB +1 when the Move can get STAB (no "stab": "false" in moves.json) an`

A Move's Contest value: its Attack Strength (0 / negative / manual / half-level / derived strengths count as +2),
plus the usual STAB +1 when the Move can get STAB (no "stab": "false" in moves.json) and shares a type with
the Pokémon -- the same rule the Battle Arena uses.

## `// into the pool, and a small pool (the board's spaces use the same pools) can hand that s`

Host side draw. The pool draw itself is random, but a Contest the player just lost puts its opponent straight back
into the pool, and a small pool (the board's spaces use the same pools) can hand that same token out again. So if
the draw is the opponent of the last Contest in this color and another token is available, draw again and give the
repeat back to the pool.

## `// settled afterwards (back into the pool, or gone if caught). If it isn't in the pool -- `

A hand-picked opponent: if that token is in the app's pool it is taken out (held) like a drawn one, so it can be
settled afterwards (back into the pool, or gone if caught). If it isn't in the pool -- the player is using a physical
token -- cb(false) and nothing about the pool is touched or shown.

## `// The Hoenn Contest track ("hoenn-contest" in music-tracks.json) is pinned for the whole `

---- the Contest music ----
The Hoenn Contest track ("hoenn-contest" in music-tracks.json) is pinned for the whole action and the music then goes
back to the Route playlist. Only the Host (or a solo device) really plays music, so a guest asks the Host, and the
Host keeps a set of who is holding the track so two Contests at once don't cut each other off.

## `// cards.json: "upkeep": [turnStart: remove a counter, turnEnd + "condition": "noCounters"`

---- Prof. Oak's Research ----
cards.json: "upkeep": [turnStart: remove a counter, turnEnd + "condition": "noCounters": discard] and
"permanentCounterEffect": { "effect": "oakResearch" }. While it's in the Permanent Zone, each of the player's catches (a wild battle
or the Safari Zone / Battle Frontier / Contest catch dialog -- see oakCatchReward() calls) earns the next reward on a ladder:
1st catch: draw from the Item deck.   2nd: draw from the TM (a tier they've unlocked, with Tiered TM Decks), Pok\u00e9 Ball or
Type-Enhancer deck, their choice.   3rd: take a Shop card worth 12 Pok\u00e9 Coins or less for free (the Shop menu, filtered).
Progress is kept per card in the save (data.oakCatches[instanceId]); a card that has left forgets it.

## `// cards.json: "lookKeep": { "deck": "Tera Type Deck", "count": 3 } on an Item card. Its P`

---- Look at the top cards of a deck, keep one (Tera Orb, Apricorn, Z-Ring, TM Case, Type-Enhancer) ----
cards.json: "lookKeep": { "deck": "Tera Type Deck", "count": 3 } on an Item card. Its Play button in the Active Card zone looks at the top
`count` cards of that deck in the Decks screen's keep-one viewer (the Department Store's and Battle Frontier's): one goes to the hand,
the rest to the bottom of the deck. The card is discarded once a card has been kept; the viewer can't be closed without choosing.
"TM Deck" with Tiered TM Decks on first asks which unlocked tier to look at.

## `// cards.json: "gameCorner": "yes" (an Event card with a Play button). The player wagers u`

---- Game Corner ----
cards.json: "gameCorner": "yes" (an Event card with a Play button). The player wagers up to GAME_CORNER_MAX_BET Pok\u00e9 Coins they
have and picks two different numbers from 1-6, then three d6 are rolled. The wager is always spent; each die showing one of the two
numbers wins them an amount equal to the wager (so one match breaks even, two or three profit). If all three dice show chosen numbers (1, 1, 2 for 1 and 2),
or all three are the same number (even an unchosen one), they also take any one card from the Item deck into their hand, and the deck is
shuffled. With the Pok\u00e9 Coin rule off nothing is tracked, so the result says what to do with the physical coins.

## `// cards.json: "vendingMachine": "yes" (a Permanent card). Its viewer carries three button`

---- Vending Machine ----
cards.json: "vendingMachine": "yes" (a Permanent card). Its viewer carries three buttons, each of which uses the card up:
Lemonade    outside a Battle: the Team Tracker's Revive pick (the post-blackout one, for one Pokémon) -- teamRevivePick.vending.
Soda Pop    outside a Battle: the Team Tracker picks a Pokémon and its Status Condition is removed -- teamStatusPick.
Fresh Water during a movement window: adds 1 or 2 to this turn's Movement Roll (shown to the table like the Contest Hall's penalty).
The card is only discarded once the effect has happened, so backing out of a pick keeps it.

## `// { type: 'gain-item', item: 'Pok\u00e9 Flute' } (plus an optional label), or the text "G`

---- Gain Item ----
{ type: 'gain-item', item: 'Pok\u00e9 Flute' } (plus an optional label), or the text "Gain Item (Poke Flute)" from
older maps. Looks the card up by name in the Reward Item Deck, then the Shop Deck, stops at the first deck
that has it, and puts it straight into this player's hand -- free, with no Pok\u00e9 Coin cost in the Shop's case.

## `// { type: 'roll-for-item', table: [six item names, for a d6 roll of 1 to 6], label } -- e`

---- Roll For Item ----
{ type: 'roll-for-item', table: [six item names, for a d6 roll of 1 to 6], label } -- each space has its own table.
The player rolls a d6 and gains the card named for the result, found the same way as Gain Item. The table entry
"Random TM Card" instead draws from the highest TM deck available to this player: the plain TM Deck, or with
Tiered TM Decks on, the Expert, then Advanced, then Novice deck, whichever they've unlocked.

## `// The player discards an Item card from their hand (they may decline), chooses a Yellow P`

---- Safari Zone ----
The player discards an Item card from their hand (they may decline), chooses a Yellow Pok\u00e9mon token out of the
board's pool, then rolls in the Catch dialog: caught on a Catch Total of 4 or more -- 2 or more if the discarded
card was a Safari Ball -- whatever the Pok\u00e9mon's own Catch Value is. A caught token leaves the game; one that
gets away goes back into the pool. The pool is host-side state inside board.js, so a guest asks the Host for it.
Any Item card may be discarded -- cards.json's cardType, which covers every Item sub-category (Item, Shop, Reward Item,
Pok\u00e9 Ball, TM, Tera Type, Type-Enhancer and Z-Crystal decks) rather than a list of deck names that has to be kept in step.

## `// A special-space action: { type: 'battle-frontier', label: 'Battle Frontier', returnTo: `

---- Battle Frontier (Johto) ----
A special-space action: { type: 'battle-frontier', label: 'Battle Frontier', returnTo: '<space id or name>' }.
The player chooses one of the six token colors (Legendary = the orange spaces); a random token of that color is
drawn out of the board's pool and becomes the Defender of a Battle that can't be Caught. Defeat it and the color's
reward is claimed. Lose, or end the Battle without defeating it, and the player's marker goes to the returnTo space
(Olivine City) instead. The drawn token goes back into its pool once the Battle is over, either way.
The pool and the markers live on the Host (board.js), so a guest asks the Host to draw ('board-frontier-draw') and the
Host tells the guest how the Battle ended ('board-frontier-result'). Everything a reward does -- the decks, the
levels, the Catch -- runs on the player's own device.

## `// A card with "permanentCounterEffect": { "at": N, "effect": "eggHatch" } runs the effect`

---- Pokémon Egg hatching (see the chat this was designed in) ----
A card with "permanentCounterEffect": { "at": N, "effect": "eggHatch" } runs the effect when its Permanent counter is raised to N.
eggHatch: draw tokens of the card's chosen color from the board's pool until a Stage 1 Pokémon (the gallery's "stage1" tag)
comes up; the others drawn on the way go straight back to the pool, the Stage 1 joins the team with one Level, and the card
is discarded once it has (see addOrQueueTeamMember()'s sourceInstanceId). The pool lives on the Host, so a guest asks it.

## `// A card with "permanentCounterEffect": { "effect": "pokerusSpread", "discardAt": N } (an`

---- Pokérus (see the chat this was designed in) ----
A card with "permanentCounterEffect": { "effect": "pokerusSpread", "discardAt": N } (and "permanentCounters") does this every time its Permanent
counter is raised -- the turnStart upkeep rule asks the player to place one, but any raise counts: the player chooses a Pokémon on their team to
gain a Level (picked in the Team Tracker, using the same Level pick as cardLevelGainPick()), and once that Level is given the card is discarded
if its counter has reached discardAt.
A Pokémon can gain a Level from one Pokérus card only once. Who already has is kept in this device's own save, data.pokerusState[instanceId] =
{ leveled: [member uids], owed: Levels the card still has to give }, not on the Permanent entry: entries are rebuilt from the Host's copy (and only
lose unknown fields), while team data -- and the uids that tell its Pokémon apart -- never leave this device.
The Pokémon the card was on counts as already Leveled (attaching it gave that Level -- onAttachLevelUp). That includes a wild Pokémon: it gets its
uid when it enters the Arena and keeps it when it is caught, so it is still recognized on the team. The origin travels with the move to Permanent:
requestPermanentFromAttach(cardId, originUid) -> pokerusRecordOrigin().
A Level that is owed but not yet given (the pick was cancelled, or Team Tracker was busy) stays in the save, and the Permanent viewer offers
"Choose a Pokémon to Level" until it is given. While a Pokérus pick is open the upkeep queue waits (see upkeepNext()) so the next card's viewer
doesn't pull the player out of the Team Tracker.

## `// cards.json: "upkeep": [{ "trigger": "revealPokemon", ... }] and "permanentCounterEffect`

---- Radio: PKMN March (see the chat this was designed in) ----
cards.json: "upkeep": [{ "trigger": "revealPokemon", ... }] and "permanentCounterEffect": { "effect": "radioMarch", "discardWhenEmpty": true }.
When the player's encounter reveals a face-down Pokémon (board.js acceptEncounter() marks the landing justRevealed), a Radio card in the
Permanent Zone brings its viewer up BEFORE the encounter starts. Taking a counter off it spends it: the Host draws two more tokens of the
space's color (board.js radioOffer()), the player picks which of the three stays -- the revealed one included -- the other two go back to
the pool, and the encounter then starts with the one kept (radioKeep() fires the same 'encounter' landing), so the player gets the
actions they always would. Closing the viewer instead leaves the reveal as it was; only one Radio is used per reveal. The card is
discarded when its last counter is gone ("discardWhenEmpty").
Like every upkeep this needs the player turns to be running; a Guest's offer and choice go through the Host (board-radio-*).

## `// its keep-one mode. The viewer can't be closed without choosing (the reward would be los`

Look at the top `count` cards of the Item deck, keep one, the rest to the bottom -- the Department Store's own viewer in
its keep-one mode. The viewer can't be closed without choosing (the reward would be lost), and onDone runs once a card is kept.

## `// The deck is private, so its contents come from a Look at Top of the whole deck (sent on`

Legendary: one Item card from the Item deck OR the Item discard pile, shown as two Archidekt-style piles (discard first).
The deck is private, so its contents come from a Look at Top of the whole deck (sent only to this player); they're listed
alphabetically so the order isn't revealed, and the deck is shuffled afterwards.

## `// Universal actions, offered on any space where another player's marker is also standing `

---- Player actions: Battle a Player / Trade with a Player ----
Universal actions, offered on any space where another player's marker is also standing (the landing info's alsoHereIds).
Either one is an invitation the other player may accept or decline; with three or more players on the space the
initiating player first chooses who.
Trade: hands straight to the Team Tracker's own trade (startTradeInvite()), flagged as coming from the board so both
devices are taken to the Team screen, where that trade's prompts live.
Battle: a board-pvp-* invitation, relayed through the Host the way trade-* messages are (the Host also checks the two
markers really share a space). The challenge goes in three steps:
1. the other player accepts (or declines);
2. the CHALLENGER is taken to their Team Tracker to send out a Pok\u00e9mon first, as the Arena's Attacker, while the other
player's window stays up, saying they are waiting (the Team Tracker's own send-to-battle mode does the choosing, the same
one the Arena's Choose Pok\u00e9mon button and a fainted Pok\u00e9mon's replacement use);
3. once the challenger has sent one out they land on the Battle Arena, and the other player is taken to THEIR Team Tracker
to choose a Defender, with the challenger's Pok\u00e9mon in the opponent preview at the bottom.
Backing out at any point (or a disconnect) calls the challenge off for the other player.

## `// card isn't tied to a space, so any other player in the lobby can be challenged (the Hos`

Let's Fight! (cards.json playerBattle: "yes"): the same Battle a Player challenge, started from the Active Card zone. The
card isn't tied to a space, so any other player in the lobby can be challenged (the Host skips its same-space check
for these invites -- see 'anySpace' in boardPvpRoute()). One other player is chosen automatically, several are asked.

## `// from the message) or from the Host's own player.`

Host: every board-pvp-* message passes through here, from a Guest (with `from` set from its connection, never trusted
from the message) or from the Host's own player.
Host: the squad-battle (Secret Base) challenge that is out or under way, { initiatorId, partnerId, cardId }. Its winner gets the
card's own reward instead of the usual player-battle one -- see hostDeliverSecretBaseReward().

## `// Arena's Choose Pok\u00e9mon button). If it can't open -- no Pok\u00e9mon, a read-only s`

The challenger, challenge accepted: the Team Tracker's send-to-battle mode aimed at the Attacker half (the same flow as the
Arena's Choose Pok\u00e9mon button). If it can't open -- no Pok\u00e9mon, a read-only save, another Team Tracker mode busy -- there is
nothing to wait for, so the challenge is called off rather than leaving the other player waiting.
The challenger's next step once accepted: a squad battle (Secret Base) has them choose their Pok\u00e9mon first.

## `// the challenge was waiting for: tell the other player (after the Arena change itself, on`

Called by sendTeamMemberToBattleSlot() the moment a Pok\u00e9mon is sent to an Arena half. The challenger's own Attacker is what
the challenge was waiting for: tell the other player (after the Arena change itself, on the same connection, so the Arena
already shows it when they arrive at their Team Tracker). The send then carries the challenger on to the Battle Arena.

## `// A second main view next to the gallery (see body.board-mode in the CSS), toggled by the`

--- the board view (#board-view) ---
A second main view next to the gallery (see body.board-mode in the CSS), toggled by the Game panel's
"Game Board" tile. The board is built once and stays mounted while the gallery is showing, so switching
back and forth is a fade plus a restoreView(), not a rebuild. Browser fullscreen applies to just the
map frame (#game-board-frame), so no panel chrome or navbars show. The nav bar's Back button leaves board
mode when nothing else is open. Anything that needs the gallery (the Add Pokémon / pick modes, the Search
panel) switches to it first; the pick modes then bring the player back to the board when they finish.

## `// is on screen: the visible view fades out, the displayed view is swapped while both are `

Cross-fade between the two main views. boardModeActive (the logic) flips immediately; this only paces what
is on screen: the visible view fades out, the displayed view is swapped while both are at opacity 0, then
the other fades in. A second toggle mid-fade simply cancels the pending swap and fades back.

## `// disabled; with the board up, the first becomes "[Region] Explore Actions" (opens that s`

The two Game panel tiles follow the view: in the gallery, "Game Board" opens the board and "Return to Pok\u00e9dex" is
disabled; with the board up, the first becomes "[Region] Explore Actions" (opens that screen) and the second returns.
A save that doesn't use the in-app region map (a physical board) never has the board up, so its first tile is the
Explore Actions one from the start: the icon key is still handy beside a real board.
Whether THIS device can open the map: the save uses it, and -- in the TV Table / Hybrid 2 modes, where the map is
the table's display -- this device is the host. Everyone else there keeps the Explore Actions screen.

## `// The text, order and icons live in <BOARD_DIR>board-actions.json (its "_about" line expl`

---- Explore Actions screen: what each action on this board's spaces does ----
The text, order and icons live in <BOARD_DIR>board-actions.json (its "_about" line explains the shape), not in this page:
one entry per kind of action (listed in the file's order, no sections), a per-region override block for map-specific
icons and wording, and only the actions this region's board really has are listed.

## `// which ones a map has, so an entry that is only for some maps names them ("regions": ["k`

Gate Markers: a second list with its own header, laid out the same way. There is nothing in a board's data to say
which ones a map has, so an entry that is only for some maps names them ("regions": ["kanto"]); no list = every map.

## `// the bottom. Vertical: the map buttons in a stack on the left (zoom at the bottom of the`

Button layout. Horizontal: the map buttons in a row across the top (Find Me at the right end), the movement buttons in a row across
the bottom. Vertical: the map buttons in a stack on the left (zoom at the bottom of the stack), the movement buttons in a stack on
the right (Roll Movement Die at the top); the stacks sit in the bottom corners and slide up to the top corners when the map's
bottom edge comes near the frame's bottom edge, and back down when its top edge comes near the top (boardOnView).
Vertical is the default for now; add ?bars=horizontal to the page's address to see the rows instead.

## `// The board's "Roll Movement Die" button: rolls a d6 for this player's movement and shows`

---- Movement roll ----
The board's "Roll Movement Die" button: rolls a d6 for this player's movement and shows the number to the whole table, in the
roller's color, in a corner of the map. The roll is informational (players still move their own marker). A pending
movement penalty (Contest Hall's Loss Penalty: -2) is taken off the NEXT roll once, and a roll never goes below 0.
The penalty lives in the player's own save (like frontierLegendaryClaimed), so it survives a reload.

## `// being redrawn, so while the board is up they are re-checked a couple of times a second `

The ability buttons depend on this player's team and Gym Badges, which change in other screens or panels without the map
being redrawn, so while the board is up they are re-checked a couple of times a second (it only touches the page when one changes).

## `// lobbyState.players -- both roles already keep that roster in`

This device's own display name as it appears in
lobbyState.players -- both roles already keep that roster in
sync (see refreshLobbyRosterFromHostState()/the 'roster'
message handling in wireGuestConnection()), so this just looks
itself up in it rather than tracking a separate copy. Falls
back to 'Trainer' if the roster hasn't synced yet for some
reason, same default used everywhere else a name is missing.

## `// handling both possible routes so every other trade function`

Sends a trade-* message to a specific player id, transparently
handling both possible routes so every other trade function
below can just call this without caring which one applies:
- This device is the Host: send straight to that peer's own
connection (or, in the one edge case a Host could ever
target itself -- it can't actually invite itself to a
trade, so this is purely defensive -- process it locally).
- This device is a Guest: always send up to the Host, whether
the real target is the Host itself or some other Guest --
either way the Host's own handleIncomingTradeMessage() is
what actually resolves `to` and relays onward if needed.

## `// (see wireHostConnection()'s own call site) -- resolves whether`

Host-only entry point for every trade-* message it receives
(see wireHostConnection()'s own call site) -- resolves whether
this message is actually meant for the Host itself (process
locally, same as a Guest would) or needs forwarding on to
whichever other connection `to` names (a Guest\u2194Guest trade
the Host isn't a party to, just relaying blindly without
inspecting anything beyond `to`). Also the one place that
maintains tradePairs (see its own comment) -- every message
that passes through here, relayed or local, re-pairs
to/from together, and a trade-cancel un-pairs them, so
handleHostConnectionDrop() always has an accurate picture of
who'd need notifying if either side vanishes.

## `// actual intended recipient of -- reached directly from the`

Shared dispatcher for a trade-* message this device is the
actual intended recipient of -- reached directly from the
Guest side (see wireGuestConnection(), which never has a
relay decision to make) or from handleIncomingTradeMessage()
above once the Host has resolved that `to` really is itself.

## `// with someone else (shouldn't normally be reachable -- the`

A trade invite arrived for this device. If already mid-trade
with someone else (shouldn't normally be reachable -- the
button/overlay hide once tradeSession is set -- but a message
could theoretically cross in transit), decline it immediately
rather than silently dropping it, so the sender isn't left
waiting on a response that'll never come.

## `// -- locks in (or changes, any time before this device has`

#game-team-trade-overlay's own team-member grid, once accepted
-- locks in (or changes, any time before this device has
confirmed) which of this device's own current team.members
this trade offers. Re-sent on every change since either side
can freely swap their pick right up until they hit Confirm.

## `// confirmed -- each side does this independently for its own`

Applies the swap on THIS device only, once both sides have
confirmed -- each side does this independently for its own
save, there's no single authority that needs to tell both
"go," since myConfirmed/partnerConfirmed becoming true on one
device always corresponds to the same becoming true (in the
mirrored sense) on the other.

Re-validates against the *current* live roster rather than
trusting mySelection.member's own snapshot, since some other
change could in principle have happened to this device's team
while the trade was being negotiated (a card equipped, a level
changed, even the member removed entirely by some other flow)
-- mySelection.index is where to look, but the member actually
found there at execute time, not the snapshot taken when it was
first picked, is what actually gets sent away. If it's gone
entirely, or applying the swap would somehow change this
device's own roster count (see the chat this was scoped in --
shouldn't be reachable for a strict 1-for-1 swap, but checked
defensively rather than assumed), the trade is cancelled with a
message instead of executing.

## `// success) -- reuses .game-team-release-banner's own visual`

Brief on-screen confirmation of the outcome (decline/cancel/
success) -- reuses .game-team-release-banner's own visual
treatment and auto-hide timing under its own id, same
independence reasoning as every other near-identical pair in
this doc, since this one's triggered from a completely
different flow (trade messages arriving asynchronously, not a
direct button tap).

## `// fresh from lobbyState.players every time (rather than trusting`

#game-team-trade-btn's own click -- builds the partner list
fresh from lobbyState.players every time (rather than trusting
whatever was there last time this opened), same "rebuilt from
live state" convention as everywhere else in this panel. Not
reachable with fewer than 2 players in the Lobby to begin with
(see renderTeamGrid()'s own canStartTrade, which is what hides
the button itself), but the empty check costs nothing.

## `// visibility/content, called after every state change anywhere`

Single source of truth for #game-team-trade-overlay's own
visibility/content, called after every state change anywhere
in the trade flow (see every function above) -- always
rebuilds from lobbyState.tradeSession rather than patching
whatever was already showing, same "always derive, never trust
stale" convention as everywhere else in this panel. Also
refreshes the Team grid unconditionally, since the Trade
button/select-banner's own visibility (canStartTrade/
isTradeSelectingOffer()) depends on tradeSession too --
one call here covers every caller rather than each of them
remembering to call renderTeamGrid() themselves separately.

## `// grid via #game-team-trade-select-banner instead of this`

Actively picking an offer happens directly on the team
grid via #game-team-trade-select-banner instead of this
overlay (see its own comment) -- stays closed for that
window and reopens the moment a pick is made (mySelection
becomes non-null, which is exactly what
isTradeSelectingOffer() turning false here means).

## `// save/session -- exactly the pre-Lobby solo behavior. Called`

Restores this device's own Game Stage from only its own local
save/session -- exactly the pre-Lobby solo behavior. Called
whenever a Lobby connection ends (see resetLobbyState()), since
an active connection may have been driving the Sounds panel
from a leading-player figure (hosting) or not touching it at
all (guesting) up to that point -- either way, once
disconnected this device needs to go back to deciding its own
stage by itself, from whatever getActiveSaveData() now
resolves to (which may still be a guest save -- see
resetLobbyState()'s own comment on why that's correct).

## `// loaded, or the active one deleted) while playing solo: the Game`

Called whenever a different save becomes the active one (created,
loaded, or the active one deleted) while playing solo: the Game
Stage slider is re-derived from that save's own progress, so it
can't be left on whatever the previous save (or a manual
Any Stage / stage pick) had it on. Does nothing in a Lobby --
a Host's resyncLobbyForNewHostSave() already recomputes it from
the whole lobby's progress, and a Guest's stage isn't theirs to
set (see afterBadgeChange()).

## `// unsaved progress that joining would silently strand (see`

The Join button's real entry point -- checks for in-memory
unsaved progress that joining would silently strand (see
finalizeGuestJoin(), which switches getActiveSaveData() over to
a guest save the same way loading any other save would) and
asks first if so, same "don't silently discard" instinct as
the "Save This Progress" banner elsewhere in this panel.
Otherwise connects immediately.

## `// connection failure (anything other than 'peer-unavailable',`

How many times joinLobbyByCode() below retries a transient
connection failure (anything other than 'peer-unavailable',
which means the room genuinely doesn't exist and retrying
won't help) before actually giving up. This matters most right
after a real network drop: the OS/browser often reports
'online' a moment before DNS/routing has actually recovered,
so the very first attempt to reach the PeerJS signaling server
can fail with something like 'network'/'server-error'/
'socket-error' even though the network is about to be fine.
Previously that first failure surfaced as "Could not connect"
and reset lobbyState straight back to null, silently ending
the whole auto-rejoin attempt right when it had just started.

## `// stays attached for this peer's entire lifetime, not just`

Guards the retry-on-error logic below: peer.on('error')
stays attached for this peer's entire lifetime, not just
the initial handshake -- PeerJS can fire a peer-level error
(its own signaling-socket hiccups, 'network',
'disconnected', etc.) well after the connection to the
host has already succeeded, without the actual
DataConnection itself being dead at all. Without this
flag, that later, often-harmless error was being treated
the same as an initial-handshake failure -- destroying a
perfectly good, already-reconnected session and forcing an
entirely new, unnecessary reconnect cycle right on top of
it (visible as a "stale" connection getting evicted that
was actually the good one, and the color-picker/roster
hiccups that came with redoing the handshake from scratch).

## `// device doesn't know its name for *this* game yet (that`

No name in the connection metadata anymore -- this
device doesn't know its name for *this* game yet (that
depends on whether a guest save already exists for
whatever host it's about to meet, which it won't know
until the host's 'welcome' message arrives). See
handleLobbyWelcome()/finalizeGuestJoin() below.
guestClientId goes in the connection metadata itself
(available to the host the instant this connection
opens) rather than waiting for the 'identify' message
further down -- see wireHostConnection()'s own
conn.on('open') for why that timing is what actually
matters for a fast reconnect.

## `// that never opens left the screen stuck on "reconnecting"`

peer.connect() has no timeout of its own -- a connection
that never opens left the screen stuck on "reconnecting"
forever. Treat it as a failed attempt after 12s (8s while
reconnecting -- an attempt at a dead host's still-registered
id would otherwise sit there for the full 12s).

## `// later, unrelated peer-level hiccup, not a failure`

The handshake already succeeded -- this is some
later, unrelated peer-level hiccup, not a failure
to connect. wireGuestConnection()'s own
conn.on('close')/('error') already calls
attemptGuestAutoRejoin() if the connection genuinely
dies; piling a second, independent recovery attempt
on top of that here would only race it. Nothing to
do here but ignore it.

## `// enterActiveLobbyState() (which doesn't run until AFTER`

Started here rather than waiting for
enterActiveLobbyState() (which doesn't run until AFTER
the naming step, if there is one) -- otherwise a guest
sitting on that prompt for a while would stop pinging
during exactly the window the host's own heartbeat
check is still watching this connection, and could get
dropped as "gone quiet" despite being mid-interaction,
not actually disconnected.

## `// finalizeGuestJoin()) turned out to already be taken`

The color just sent in 'identify' (see
finalizeGuestJoin()) turned out to already be taken
by the time the host received it -- a genuine race
with someone else claiming it in the same instant.
The name/guestClientId this device already
committed to are still fine (and already persisted
to this Guest Save, see finalizeGuestJoin()) --
only the color needs picking again.

## `// Intro playback (and this device's own mirrored`

See beginGameSetup()'s own comment -- the host's real
Intro playback (and this device's own mirrored
category display, see applyGuestMusicMirror() via
the 'music' broadcast that call also triggers)
arrives separately; this message is purely "go to
Team Tracker and ask for a starter" for a guest.
openGamePanel() first since this guest could be
looking at literally anything else in the app when
this arrives (the Pokédex, some other panel
entirely) -- setGameScreen() alone only changes
which .game-screen is active *inside* the Game
panel, it doesn't surface the panel itself if it's
currently closed.
On a save that uses Trainer Cards, a guest without
one is sent to a forced pick of it first (which
carries on to the starter itself).

## `// a Gain Reward menu pick -- if what just landed is`

hostApplyGainReward() reuses this same message for
a Gain Reward menu pick -- if what just landed is
a oneTime:'yes' card, mirror that claim into this
device's own local cache too (see
getLocalOneTimeClaims()) so its own copy of the
menu renders that card grayed out immediately,
without waiting on anything else from the Host. A
harmless no-op for every ordinary (non-reward,
non-oneTime) draw, since CARDS_BY_ID[cardId].oneTime
just won't be 'yes' for those.

## `// authoritative version of this exact hand (see`

Sent once, right after 'identify' -- the Host's
authoritative version of this exact hand (see
wireHostConnection()'s own comment), replacing
whatever this device's local cache had in case it
was stale (e.g. this device was offline for part of
a draw/discard, or this is a brand-new device
joining a save that already has cards in hand).

## `// on the shared Wild Pokémon (see`

The Host just confirmed THIS device won the claim
on the shared Wild Pokémon (see
hostApplyBattleCatchWild()) -- the roster addition
has to happen here, on the device that actually
owns the roster, since the Host never has a copy
of a Guest's own save to push it onto directly.

## `// prefix (see wireHostConnection()), no 'to'-based`

Unlike the host side's own handling of this same
prefix (see wireHostConnection()), no `to`-based
relay check is needed here -- this connection is
this device's only one, so anything the host sends
down it was already addressed to this device
specifically (see sendTradeMessage()/
handleIncomingTradeMessage() for the host-side
routing that guarantees that).

## `// direct signal than anything the heartbeat timeout or`

A real 'close'/'error' from PeerJS is a much more
direct signal than anything the heartbeat timeout or
probeHostConnectionAndRecoverIfNeeded() have to work
with (see startLobbyHeartbeat()'s own comment on why
conn.open alone can't be trusted the other way) --
and these fire fast, often well before either of
those would even get a chance to notice anything.
Previously this reset straight to the choice screen
with no attempt to recover, which meant it always won
the race against the slower heartbeat/probe paths and
silently defeated the whole auto-rejoin feature
whenever PeerJS happened to detect the drop this way
(see the chat this was fixed in) -- routing through
the same recovery function as every other kind of
drop instead means whichever path notices first, the
outcome is the same automatic rejoin attempt.

Both guards below matter for the same reason
probeHostConnectionAndRecoverIfNeeded() already has
its own "already left" check: destroying this
device's own peer (resetLobbyState(), e.g. right
after processing 'kicked' -- see wireHostConnection's
conn.on('data') 'kicked' handling) tears this exact
`conn` down too, which fires this SAME close handler
a moment later, by which point lobbyState has already
moved on. Without a guard, that stale event would
stomp right back over whatever status 'kicked' just
set (e.g. "The host removed you from the lobby.")
with a bogus "Lost contact" and an unwanted rejoin
attempt. The hostConn check covers the same shape of
race for a *newer* connection: if this device has
already moved on to a fresh attempt (a new conn is
now lobbyState.hostConn), a late close from this old,
already-superseded one has nothing left to recover.

## `// hostSaveId is what a returning guest is actually recognized`

First real step of the handshake, once connected: the host's
hostSaveId is what a returning guest is actually recognized
by, not the room code (which is different every session -- see
GAME_PANEL_NOTES.md's Guest Saves notes on why a durable id was
needed at all). A guest save already on file for this exact
host save means this device has played this specific game
before -- skip straight to rejoining with the name already on
record. Otherwise this is a genuinely new connection, so ask
once via the .game-lobby-naming step (see
.game-lobby[data-state="naming"] in the CSS) before finalizing
anything.

## `// (an older Guest Save from before this feature existed),`

Either this returning guest never had a color on file
(an older Guest Save from before this feature existed),
or someone else already has the one it remembers --
either way, a name is already known, so this only
needs the bare color-pick step rather than the full
naming step again.

## `// land here with a still-active connection whose previously-`

A resync mid-session (see resyncLobbyForNewHostSave()) can
land here with a still-active connection whose previously-
linked guest save now belongs to a different game than the
one this device is about to resolve an identity for --
clearing the link immediately (rather than waiting for
finalizeGuestJoin() to do it once the naming step is
actually submitted) is what makes isActiveSaveReadOnly()
correctly treat that old save as read-only for the
duration of this prompt, instead of leaving it briefly
editable by a stale reference.

## `// other screen entirely (Badge Tracker, the Pokédex itself,`

A resync can happen while this device is looking at some
other screen entirely (Badge Tracker, the Pokédex itself,
whatever) -- jumping to the Lobby screen is what actually
surfaces the naming prompt rather than leaving it to be
discovered later. Only switches which .game-screen is
active; doesn't force the Game panel itself open if it's
currently closed.

## `// updates this device's Guest Save for lobbyState.hostSaveId,`

Second (and, for a returning guest, only) real step: creates or
updates this device's Guest Save for lobbyState.hostSaveId,
makes it the active save (read-write, since this IS the live
connection for it -- see isActiveSaveReadOnly()), sends the
resolved name back to the host (see wireHostConnection's
'identify' handling -- this is the real name, correcting the
placeholder the host briefly showed), and only then actually
enters the active Lobby view. Called either immediately (an
existing guest save, from handleLobbyWelcome() above) or from
the naming step's Confirm button (a brand-new one).

## `// ruleset just cached above, rather than waiting on the`

Seeds musicState.activeRegion immediately from the same
ruleset just cached above, rather than waiting on the
host's follow-up broadcastLobbyMusicState() call to arrive
-- without this, refreshGameUI() below (specifically
getActiveRegionForBadges(), which prefers this live value)
would briefly render the Badge Tracker grid against
whatever region this device was last showing solo, before
immediately correcting itself a moment later.

## `// own comment) -- gameGuestSaves[hostSaveId].team.members`

Per-save, not per-session (see allLobbyStartersChosen()'s
own comment) -- gameGuestSaves[hostSaveId].team.members
survives a lobby restart/reconnect the same way any
other guest-save progress does (see persistGameGuestSaves()
above), so a returning player who already has a starter
reports that immediately rather than waiting to be
prompted again. Reads back off gameGuestSaves directly
rather than getActiveSaveData() since activeGuestSaveId
is only set a few lines further down.
Locked in, not merely picked -- see lockStarter().

## `// a guest leaving (which only ever disconnects itself), a host`

The Leave Lobby button's real entry point, host side -- unlike
a guest leaving (which only ever disconnects itself), a host
leaving tears down resetLobbyState()'s peer entirely, which
takes every currently-connected guest down with it. Asks first
whenever that's actually the case, same "don't silently strand
anyone" instinct as attemptJoinLobby()'s own unsaved-progress
check. A guest, or a host with nobody connected yet, has
nothing to lose by leaving -- straight through to leaveLobby()
for both.

## `// why this is never even shown to a guest, and for the button's`

Host-only -- see .game-lobby-start-game-btn's own comment for
why this is never even shown to a guest, and for the button's
three text/enabled states this is only ever reachable from the
first of (its own click handler already routes a tap straight
to finalizeLobbyGameStart() instead once the button's moved
past this phase). Three things happen together: this device's
own Sounds panel switches to the Intro playlist (see
MUSIC_CATEGORY_ICONS's 'intro' entry) for whatever region this
save is already set to, every connected guest WHO STILL NEEDS
ONE is told to go pick a starter on their end (a guest never
plays real audio itself -- see GAME_PANEL_NOTES.md's Playlist
Sync notes -- so 'start-game' just means "go to Team Tracker
and ask for a starter" there, not "play audio"), and -- if the
host is playing too and doesn't have one yet either, see
lobbyState.hostIsPlayer -- this device gets the same Team
Tracker/starter prompt locally. Checking
lobbyState.starterChosen before sending/opening either one is
what keeps this per-save rather than per-session (see
allLobbyStartersChosen()'s own comment): without it, a player
whose starter already survived a Lobby restart would still get
yanked back into the picker just because the host tapped this
again, even though there's nothing left for them to do here.
Doesn't check roster size or connection count first: nothing
about this is destructive or one-way, so there's no real cost
to the host tapping it again later (e.g. a guest reconnects
after missing it the first time, or backs out of their picker
without choosing -- see allLobbyStartersChosen(), which is what
actually decides whether the button's even reachable here
again versus having already moved on to Start Game).
Guest side of 'start-game': the forced Trainer Card pick (on a save that uses them), then the Starter prompt.
It has to wait until this device has actually joined the host's CURRENT game. Until the naming/color step is
confirmed (a first join, or the host having switched to a different save under a live lobby -- see
resyncLobbyForNewHostSave()), the active save is still the previous game's -- or none at all -- so
needsTrainerCardForSetup() answers for the wrong save and comes out false: the card step was skipped and
the player went straight to a starter. Held instead, and run from finalizeGuestJoin() once the new game's
own save is active. (var, not let: resetLobbyState() clears it and can run before this section does.)

## `// happened to already be playing before the switch (see`

setActiveMusicCategory() only resumes playback if music
happened to already be playing before the switch (see
rebuildMusicQueue()'s "keep whatever was already
happening" default) -- nothing's usually playing yet at
this exact moment, so Start Game forces it on regardless,
with the same guarded play() every other transport
control already uses (respecting mute/volume, silently a
no-op if this browser blocks autoplay or the category's
actually muted).

## `// .game-lobby-start-game-btn's own comment). Only ever reached`

Host-only -- the button's third and final state (see
.game-lobby-start-game-btn's own comment). Only ever reached
via its click handler once allLobbyStartersChosen() is true,
i.e. every expected player already has a starter. Switches
this device's own Sounds panel (and every connected guest's
mirrored display, same broadcast setActiveMusicCategory()
already triggers for beginGameSetup()'s own Intro switch) from
Intro over to the Route playlist for the actual game, then
locks the button in place for the rest of the session so a
stray extra tap can't re-trigger anything.

## `// the panel -- back buttons and menu tiles (both just carry a`

Single delegated listener covers every interactive element in
the panel -- back buttons and menu tiles (both just carry a
data-target to jump to), the Saves header itself, the save
picker's own new/create/cancel/load/delete buttons (data-slot
instead), the save-progress banner's button, and the two
temporary Test buttons.

## `// them; on a phone it would cover the view being switched to, so it closes. (Closed BEFOR`

The board and the gallery are main views, not panel screens. On desktop the Game panel stays open beside
them; on a phone it would cover the view being switched to, so it closes. (Closed BEFORE the gallery comes
back so the scroll position restored there isn't overwritten by the panel's scroll-lock release.)

## `// cardNeedsPokemonChoice()) hand off to the gallery`

Cards that need a specific Pokémon (see
cardNeedsPokemonChoice()) hand off to the gallery
instead of committing right away -- the game panel
closes, the gallery filters down to that card's own
choosePokemon tag, and confirmPermanentPickSelection()
finishes the Permanent move once something's picked.
Cards that need a Color (see cardNeedsNoteColor()) get
the swatch picker instead -- see its own click
listener further down, which calls
requestActiveCardPermanent(color) once a swatch is
tapped. Everything else commits immediately, same as
before. A card is never expected to need both at
once -- if cards.json ever set both fields on the same
card, the Pokémon-choice flow takes priority (see
hostApplyActiveCardPermanent()'s own comment).

## `// .game-hand-card CSS module comment: hovering alone only`

Click/tap-to-expand, on every device now -- see the
.game-hand-card CSS module comment: hovering alone only
peeks the card (full art, no buttons); this is what
actually reveals its options list. Clicking a DIFFERENT
card collapses whichever one was expanded and expands
that one instead; clicking anywhere else in the panel
also collapses it, see the top of this listener. Clicking
the SAME card again, now that its options are already
showing, opens the full-size card image viewer instead of
collapsing it back down -- same viewer the Team Tracker's
own Attach/Nature Cards photo opens (openTeamCardImageViewer()).

## `// slot below, every time -- same prompt regardless of`

#game-team-add-btn works exactly like tapping an empty
slot below, every time -- same prompt regardless of
whether the roster's actually full right now (see the
chat this was decided in and confirmTeamAddSelection()'s
own comment for what changes on the other end once a
Pokémon's actually picked).

## `// for what it currently adds up. Tapping a move sets which`

Attack Calculator, first pass -- see computeBattleMoveValue()
for what it currently adds up. Tapping a move sets which
move that half's readout tracks; the readout itself
recomputes fresh on every render rather than caching a
number here (see renderBattleCalcReadout()'s own comment).
Available on read-only saves and another player's watched
Pokémon too -- this never writes anything back to any
save, it only changes what this device is showing itself.

## `// openTradePartnerOverlay(). Same as every other mutating`

Opens the partner-picker overlay -- see
openTradePartnerOverlay(). Same as every other mutating
control here, guarded by isActiveSaveReadOnly(); the
Lobby-connectivity/">1 player"/"no trade already active"
conditions are what actually keep this button hidden in
the first place (see renderTeamGrid()'s own canStartTrade),
so there's nothing further to check here.

## `// anywhere -- the one way out of replace mode besides`

Discards teamReplacePendingMember without placing it
anywhere -- the one way out of replace mode besides
actually tapping a slot below. Leaves the roster
untouched, same as "Don't Add a Pokémon." does for the
gallery half of this flow. Also Discards
teamReplacePendingSourceInstanceId if this pending member
came from a Permanent card (see its own comment) -- once
Add to Team's been pressed, the Pokémon's committed to
leaving that card one way or another, so backing out here
still costs the card even though nothing ends up on the
team.

## `// member.fainted's own comment) and the active save's hpRule`

HP corner -- what a tap does depends on both fainted (see
member.fainted's own comment) and the active save's hpRule
(see getHpRule()): fainted always opens the revive
confirm regardless of hpRule; otherwise 'standard' faints
immediately with no confirmation at all (per the chat this
was built in -- only reviving needs a prompt under that
rule, not fainting), while 'alt1'/'alt2' open the HP
counter prompt instead. Same replace/release-mode block as
every other corner, same reasoning.

## `// a card's actually equipped (see renderTeamGrid()'s own`

Overlay Card (dead center) -- only ever present at all when
a card's actually equipped (see renderTeamGrid()'s own
comment), so there's no "open the picker" branch here the
way the corner Cards badge above has -- just opens the
viewer (see openOverlayCardViewer()) to look at the full
card, adjust its counter, or Discard it. Same replace/
release/trade/attach-pending block as every other corner.

## `// Blocked while a replacement's pending (see`

Status Condition corner -- opens the picker for that slot.
Blocked while a replacement's pending (see
teamReplacePendingMember's own comment): that mode is only
about picking which member to overwrite, so editing an
unrelated member's status mid-flow would just be
confusing. Also blocked outright for a fainted member --
per the chat this was clarified in, a fainted Pokémon
can't be given a status condition (faintTeamMember()
already force-reverted it to None anyway, and there's
nothing useful the picker could do here until it's
revived).

## `// CSS comment for why there's no visual split yet). Which`

Level corner -- one element, two click zones (see its own
CSS comment for why there's no visual split yet). Which
half was clicked comes from clientX against this element's
own bounding rect, not from two separate DOM nodes. Same
replace-mode block as the status corner above, same
reasoning.

## `// computeTeamEvolutionState()'s mode (re-read here rather`

Evolution corner -- behavior depends entirely on
computeTeamEvolutionState()'s mode (re-read here rather
than trusted off the dataset attribute renderTeamGrid()
left behind, in case level/save data changed underneath
without a re-render in between): 'unable' no-ops, an
already-active Mega/Gigantamax (dataset.evoMode 'active-
mega'/'active-gmax') reverts immediately with no overlay
at all (see the chat this was designed in -- "tapping
again reverts"), 'active-legendary' also no-ops (per the
chat this was designed in, the only way out of one of
these is detaching its card -- see
reconcileLegendaryEvolutionOnCardChange()), and anything
else opens the picker. Same replace-mode block as the
status/level corners above, same reasoning.

## `// own mega/gmax branch, in reverse -- reverting`

Same reconciliation as confirmTeamEvolutionSelection()'s
own mega/gmax branch, in reverse -- reverting
typically moves token_level (and so the alt2 max)
back down by whatever it moved up by on the way in.
minHp=1: see reconcileTeamMemberHpAcrossFormChange()'s
own comment -- a form ending should never zero a
member out by itself.

## `// not the slot's full square, is the actual click target)`

The hit-zone (see its own CSS comment for why this, and
not the slot's full square, is the actual click target)
-- what it does depends on teamReplacePendingMember/
teamReleaseModeActive/teamSendToBattleModeActive/
isTradeNegotiationActive()/isTradeSelectingOffer()/
handAttachPendingCardId (see their own comments): normally
an empty slot opens the add-a-Pok\u00e9mon prompt and a
filled one opens the read-only detail view
(openTeamDetailOverlay() -- see its own comment), but with
a replacement pending, every filled slot becomes a valid
target instead, overwriting that member in place; with
release mode active, every filled slot instead opens the
two-stage release confirm for that member; with
send-to-battle mode active, every filled slot instead
opens the Attacker/Defender/Cancel chooser for that
member (see openBattleSlotChoiceOverlay()), no confirm
needed beyond that choice; while still picking a trade
offer (isTradeSelectingOffer()),
every filled slot instead locks that member in as this
device's offer (see selectTradeOffer()); once picked but
still mid-negotiation (isTradeNegotiationActive() true,
isTradeSelectingOffer() now false -- see
#game-team-trade-overlay's own Confirm step instead),
every slot is a flat no-op instead of falling through to
the detail view, so the offered member can't be
inspected/edited via that route either (see
isTradeNegotiationActive()'s own comment on why that
matters); with a hand-attach pending, every filled slot
instead routes to performAttachFromHandToSlot() (see its
own comment). An empty slot stays a no-op in the replace/
release/send-to-battle/select-offer/attach cases (nothing
there to overwrite-into/release/send/offer/attach-onto).
Read-only save blocks all six mutating paths (replace/
release/send-to-battle/trade/attach/add) same as every
other mutating control in this panel, but not the detail
view -- viewing a member is never a mutation, so it stays
available even on a read-only save (outside an active
trade negotiation, per the above).

## `// own CSS comment) -- the naming step's own grid just marks`

Shared by both color grids (see .game-player-color-grid's
own CSS comment) -- the naming step's own grid just marks
a swatch selected and unlocks Join Lobby (see the naming
Confirm handler below); the bare color-pick step's grid
commits immediately via its stored onChoose callback (see
openLobbyColorPick()).

## `// starts hovering a DIFFERENT card, rather than leaving it`

Collapses a clicked/expanded hand card the moment the pointer
starts hovering a DIFFERENT card, rather than leaving it
expanded (and its options showing) until the user clicks
elsewhere. 'mouseover' (which bubbles, unlike 'mouseenter')
delegated the same way the click listener above is -- fires
repeatedly while the pointer moves within a card, but the
.is-expanded check keeps this a no-op once the right card
(or no card at all) already matches, so it only ever actually
changes anything on the one bubble where the hovered card
first changes.

## `// #game-scroll, not a descendant. A Yes here closes the whole`

Same reasoning again -- this overlay's also a sibling of
#game-scroll, not a descendant. A Yes here closes the whole
game panel and hands off to the gallery (see
beginTeamAddMode()'s own comment for why that's split into two
steps rather than one function doing both).

## `// #game-scroll, not a descendant. Duplicated rather than`

Same reasoning again -- this overlay's also a sibling of
#game-scroll, not a descendant. Duplicated rather than
shared with the Attacker picker's own listener just above,
same independence reasoning as every other near-identical
pair in this doc -- each is scoped to its own overlay
element, so the shared .game-battle-picker-cancel-btn/
-item classes never collide between the two.

## `// #game-scroll, not a descendant. Cancel (or the backdrop`

Same reasoning again -- this overlay's also a sibling of
#game-scroll, not a descendant. Cancel (or the backdrop
itself) backs out to send-to-battle-picking mode via
closeBattleSlotChoiceOverlay() (see its own comment) without
touching either Battle Arena slot; Attacker/Defender both
route to sendTeamMemberToBattleSlot(), which is what actually
knows which roster index this overlay is currently open for.
Replace confirmation -- sibling of #game-scroll like the other
overlays, so it catches its own clicks.
Manual-power prompt -- Cancel or the backdrop backs out with
nothing changed; Confirm/Enter applies the typed number (see
confirmBattleManualOverlay()).

## `// #game-scroll, not a descendant. No on either stage backs out`

Same reasoning again -- this overlay's also a sibling of
#game-scroll, not a descendant. No on either stage backs out
to release-picking mode via closeTeamReleaseConfirmOverlay()
(see its own comment); Yes on either stage always routes
through confirmTeamReleaseStage(), which is what actually
knows whether that's "advance to stage 2" or "really release
it" based on pendingTeamReleaseStage.

## `// #game-scroll, not a descendant. No backs out to attach-picking`

Same shape again -- this overlay's also a sibling of
#game-scroll, not a descendant. No backs out to attach-picking
mode via closeAttachFromHandConfirmOverlay() (see its own
comment) -- the card stays in hand and #game-team-attach-banner
stays up so the player can tap a different Pok\u00e9mon instead.
Yes routes through confirmAttachFromHandReplace(), which
actually equips the card and removes it from hand.

## `// #game-scroll, not a descendant.`

Same reasoning again -- this overlay's also a sibling of
#game-scroll, not a descendant.
Same staged "Confirm/Cancel row at the bottom" shape as
#game-team-hp-overlay's own listener just below -- the icon is
purely a live preview here now (no tap-to-commit shortcut the
detail pane's own icon has, since there's no armed/unarmed
distinction left to shortcut past), and a tap on any picker
button always just switches the pending pick (see
selectPendingTeamStatus()) rather than needing a second tap.

## `// backdrop/Cancel close, Confirm commits, and the counter is the`

Same shape as #game-team-status-overlay's own listener above --
backdrop/Cancel close, Confirm commits, and the counter is the
same "one element, two click zones" shape as
.game-team-hp-counter (see its own comment). The icon is
purely a visual indicator here (see renderTeamHpOverlayState()'s
own comment on why there's no revive-via-icon case to wire up
in this overlay), so no click case is needed for it.

## `// #game-scroll, not a descendant. Backdrop tap just closes the`

Same reasoning again -- this overlay's also a sibling of
#game-scroll, not a descendant. Backdrop tap just closes the
picker with nothing sent -- unlike every Confirm/Cancel-style
overlay above, nothing's actually pending yet at this stage
(no invite's gone out), so there's no partner to notify.

## `// #game-scroll, not a descendant. Unlike every other overlay's`

Same reasoning again -- this overlay's also a sibling of
#game-scroll, not a descendant. Unlike every other overlay's
backdrop tap above, what it means to "cancel" here depends on
which phase is currently showing (see renderTradeOverlay()),
since a single Cancel/Decline button isn't always on screen --
the invite-sent phase has no button of its own at all (nothing
to tap yet but wait), so backdrop tap is its only way out,
withdrawing the invite same as an explicit cancel would once
one exists. The invite-received phase already has its own
explicit Decline button, mirrored here for the backdrop too;
the negotiating phase already has its own explicit Cancel
button, likewise mirrored. Both notify the partner
(cancelTrade()'s second argument) since a real invite/
negotiation is in progress at either of those two phases --
only invite-sent has no partner-visible state yet to retract
beyond the invite itself, which cancelTrade() sends regardless.

## `// Card/Nature Card sections (see the chat this was unified in)`

Same shape as the details panel's own identical Attach
Card/Nature Card sections (see the chat this was unified in)
-- backdrop/Close just dismisses the overlay (there's nothing
pending to discard anymore, everything below commits
immediately via commitTeamMemberCard()), and a tap on either
section's own Add/Remove/Cancel button (see
renderTeamCardSlotPanel()) calls straight through to this
overlay's own open/cancel/remove functions.

## `// Permanent Card viewer's own listener (see its own`

Same tap-left/tap-right counter convention as the
Permanent Card viewer's own listener (see its own
comment) -- this reuses that widget's classes/styling
inline (see renderTeamCardSlotPanel()'s own comment on
counterValue) but acts on teamCardsOverlayIndex directly
via requestAttachCounterAdjust() rather than a
viewer-open instance id. Only ever rendered at all for
the Attach slot's own counter element
(#game-team-cards-attach-detail-counter), so there's
nothing to disambiguate here -- Nature never renders one.

## `//`

---- Catch attempt overlay -------------------------------------

"Catch This Pok\u00e9mon" opens this instead of catching right
away. It shows the Wild Pok\u00e9mon, a d6 roll, an optional Catch
Card (played from Hand & Decks, where only cards tagged
"catchCard": "yes" are left undimmed) and the Catch bonus.

catchAttempt = { fainted, hadStatus, roll, cardId } -- the two
flags are snapshotted when the attempt STARTS, so reviving or
editing the Pok\u00e9mon afterwards can't change the bonus.
The attempt survives a trip to Hand & Decks (see
setGameScreen()) and is dropped on Close or on catching.

Bonus rules so far: +2 if it was Fainted when the attempt
started, +1 more if it had a Status Condition when it fainted
(faintTeamMember() records member.faintedWithStatus). Add new
rules to getCatchBonusLines() -- a card's own bonus belongs
there too, once cards.json has the data for it.

## `// Wild Defender (index 'wild', shared with the Lobby); a Safari Zone token isn't in the A`

The card's Cards corner and Level counter can be used until the die is rolled. A regular catch edits the Arena's
Wild Defender (index 'wild', shared with the Lobby); a Safari Zone token isn't in the Arena, so it has its own
local index ('safari') -- see getTeamSlotMember().

## `// back to the Virtual Game Board's pool (the same 'defeated'`

Failed to Catch: ends the battle and sends the Wild Pok\u00e9mon
back to the Virtual Game Board's pool (the same 'defeated'
outcome a fainted Wild Pok\u00e9mon gets). Solo it ends the battle
directly; in a lobby the Host does it (see
hostApplyBattlePhase()'s 'end-failed-catch').
keepOverlay: the virtual die decided it -- apply the result now but leave the overlay up to show it
(resolveCatchAttempt() re-shows it afterwards, and Continue closes it).

## `// pool (Safari Zone: token released). The overlay then shows the result with a single Con`

The virtual Catch Die decides the attempt the moment it lands: caught -> onto the team, failed -> back to the
pool (Safari Zone: token released). The overlay then shows the result with a single Continue button. Entries
with no Catch Value are never auto-resolved -- the players judge those, as before.

## `// #game-*-overlay. Click/tap-to-expand a card otherwise, on`

Close on backdrop or the Close button, same as every other
#game-*-overlay. Click/tap-to-expand a card otherwise, on
every device -- mirrors the #game-scroll listener's own
.game-hand-card handling (see that comment for the full
reasoning: hovering alone only peeks a card, clicking/tapping
it is what actually reveals its options, and tapping the SAME
card again now that it's expanded opens the full-size viewer
instead of collapsing it), just scoped to this overlay's own
listener since .game-discard-card lives inside it rather than
inside #game-scroll. The two option buttons are checked
FIRST, before the generic expand/zoom check -- both sit
nested inside a .game-discard-card, so without this order a
click on either would also match the card-level
e.target.closest('.game-discard-card') check below. Anything
left over once all of the above fail to match -- blank space
inside the modal shell that isn't the backdrop itself, e.g.
the title or the padding around the stack -- collapses any
expanded card too, same as clicking blank space in the hand
stack already does (see #game-scroll's own listener).

## `// sent, same as every other overlay. Picking a card now goes`

"Gain Reward" menu -- backdrop/Close dismiss with nothing
sent, same as every other overlay. Picking a card now goes
through its own "Gain Reward" button below the card (its
disabled attribute is already set client-side if already
claimed, see renderRewardMenu()) rather than the card face
itself, freeing the face up to open the full-size card image
viewer instead (openTeamCardImageViewer(), same as the Team
Tracker's own Attach/Nature Cards photo) -- see the chat this
was split in.

## `// sent, same as every other overlay. No confirm step here (see`

"Shop for Items" menu -- backdrop/Close dismiss with nothing
sent, same as every other overlay. No confirm step here (see
the CSS module comment above #game-shop-menu-overlay) --
Buy/Take fire straight from their own already-disabled-when-
appropriate buttons (see renderShopMenu()). The card's own
face has no action of its own to conflict with (unlike the
Reward menu's card-as-button), so a plain tap opens the
full-size viewer -- same as the Team Tracker's own Attach/
Nature Cards photo.

## `// Nature Cards photo (see #game-team-cards-overlay's own`

Same tap-to-enlarge as the Team Tracker's own Attach/
Nature Cards photo (see #game-team-cards-overlay's own
click listener) -- this card is already the "full-size"
view at its own 240-wide size, but opening it up further
still (openTeamCardImageViewer() sizes to the viewport)
keeps this viewer consistent with every other card render
in the Hand & Decks tool. Checked before Discard/Add to
Team/the counter below since none of those are nested
inside the face itself, so order doesn't matter here, but
keeping it first mirrors how the other viewers in this
tool check their own card face early too.

## `// Permanent button when the card needs a color (see`

Note Color picker -- opened from the Active Card zone's own
Permanent button when the card needs a color (see
cardNeedsNoteColor()'s own use in that click handler).
Backdrop/Cancel dismisses with nothing chosen -- the card
stays put in the Active Card zone, not Permanent, same as
just not pressing Permanent at all. Tapping a swatch commits
both the color AND the move to Permanent in one request (see
requestActiveCardPermanent()) rather than a separate
standalone color-setting step.

## `// #game-discard-viewer-overlay's own listener just above (see`

The peeked-cards viewer -- exact same shape as
#game-discard-viewer-overlay's own listener just above (see
its comment for the full reasoning on ordering/blank-space
deselect), just resolving through resolveDeckLookCard()
instead of calling the request functions directly, since this
one also has to update the local snapshot (see that
function's own comment).

## `// whole, same shape as every other overlay's backdrop-closes-it-`

Backdrop/Close are the only two ways out of the overlay as a
whole, same shape as every other overlay's backdrop-closes-it-
too convention in this doc. HP and Status commit immediately
on every click within their own sections (see
adjustTeamDetailHp()'s/handleTeamDetailStatusPickerTap()'s own
comments) -- Evolution is the one exception, with its own
Confirm/Cancel inside whichever strip is open (see
renderTeamDetailEvolutionPicker()), matching "choose and
confirm" from the chat that section was built in rather than
the tap-again-to-confirm shape Status uses.

## `// see .game-team-cards-accordion-header.stuck's own CSS comment`

The accordion header's own "actually reached the top" check --
see .game-team-cards-accordion-header.stuck's own CSS comment
for why this can't just be a CSS selector. Checks both card
overlays (the corner badge's own and the details panel's own
-- see the chat this was generalized to cover both in, once
the accordion became both slots' real picker rather than just
one experimental corner) rather than assuming only one is ever
relevant, since either can have an open accordion independent
of the other. Compares each currently-rendered header's own
live position against its own .game-confirm-card's (there's
normally just one header touching the top at a time per card,
but this checks all of them rather than assuming, since a
body-less collapsed header can end up there too) -- <= cardTop
+ 1 rather than strict equality absorbs ordinary subpixel
rounding rather than flickering the corners on and off by
fractions of a pixel. Run on every scroll of either card and
again after every render of an accordion (see
renderTeamCardSlotPanel()'s own call), since expanding or
collapsing a category shifts everything below it without
necessarily firing a scroll event on its own.

## `// (a successful scan closes itself via runLobbyScanDetectionTick()).`

Same reasoning again -- Cancel is the only manual exit path
(a successful scan closes itself via runLobbyScanDetectionTick()).
Deliberately does NOT close on a backdrop tap the way the other
two overlays do -- an accidental tap while lining up a QR code
shouldn't silently kill the camera stream and lose the attempt.

## `// .game-lobby-join-code's own CSS text-transform (that's purely`

Uppercases the room code field as it's typed, same idea as
.game-lobby-join-code's own CSS text-transform (that's purely
visual -- this is what makes the actual stored value match,
since joinLobbyByCode() re-normalizes anyway but keeping the
field itself in sync avoids it visibly changing case out from
under the person mid-type on paste).

## `// everything else here. Two unrelated targets share this one`

Poké Coins keyboard handling, delegated the same way as
everything else here. Two unrelated targets share this one
listener: Enter/Space on the value span itself (a <span
role="button">, so it needs a keydown handler to act on --
unlike a real <button>, key activation isn't automatic) opens
the editor, while Enter/Escape on the input that replaces it
commit/cancel the edit already in progress.

## `// this listener is delegated -- catches tapping/clicking away`

'focusout' rather than 'blur' since blur doesn't bubble and
this listener is delegated -- catches tapping/clicking away
from the field without hitting Enter first. A prior Enter
(which already committed and hidden the input) leaves
pokeCoinsEditing false by the time this fires, and
commitPokeCoinsEdit() is a no-op in that case.

## `// Cards picker happens to be open right now (harmless no-op`

Same idea for Nature Cards -- only matters if the Team
Cards picker happens to be open right now (harmless no-op
otherwise), same reasoning as pokeCoinsEnabled above. Also
gates the Nature Deck row on the Decks screen now (see
renderDecksScreen()'s own getDeckToolList() filter), so that
needs the same live refresh.

## `//`

---- Audio settings (global + per-category mute & volume) ------

Persisted to localStorage so preferences survive a refresh.
This is purely the settings layer, plus the Sounds panel UI
that reads/writes it — it doesn't touch any actual audio
playback yet. Once cries/UI FX/music get built, each will call
isCategoryAudible()/getCategoryVolume() before/while playing
rather than duplicating this mute logic themselves.

## `// defaults above rather than trusting the stored shape wholesale`

Deep-merges whatever's actually in localStorage onto the
defaults above rather than trusting the stored shape wholesale
— a save from before some category existed, or one holding a
corrupt/out-of-range value, still comes out with every key
present and valid rather than making every later
settings.categories.X.volume read a gamble.

## `// right now — 0 whenever muted (globally or per-category)`

What volume (0-1) a category's audio should actually play at
right now — 0 whenever muted (globally or per-category)
regardless of the slider's own stored value, so that stored
value is preserved for whenever it's unmuted again rather than
being overwritten by the mute itself.

## `//`

---- Music ducking -------------------------------------------

While a Gym Badge jingle plays (see playBadgeJingle()), the
Host's music dips under it and ramps back up afterwards.
Only the Host's (or a solo player's) device actually plays
music, so that's the only device this ever does anything on.

The jingle plays on the device of whoever collected the badge.
A guest tells the Host when theirs starts/ends ('badge-jingle'
message, see the Host's data handler), and each device that
currently has a jingle going is a separate "hold" here, so two
players collecting at once don't un-duck each other early.
Every hold also expires on its own after
MUSIC_DUCK_MAX_HOLD_MS, so a guest who disconnects (or whose
'end' message never lands) can never leave the music stuck
quiet.

musicDuckFactor is what getCategoryVolume('music') multiplies
by: 1 = normal, MUSIC_DUCK_LEVEL = fully ducked. The ramp is
time-based on a short interval timer rather than
requestAnimationFrame, since rAF stops entirely in a hidden
tab and would strand the factor partway through a ramp --
a throttled interval just takes bigger steps and still lands
on the target.

## `// globalVolume in renderAudioSettingsUI) already stops a drag`

The category slider's own max attribute (kept in sync with
globalVolume in renderAudioSettingsUI) already stops a drag
from going past the cap, but clamp here too so a value
can't sneak in some other way (e.g. the max attribute not
having been applied yet on first load).

## `// down any category currently above the new cap (so what you hear`

Global volume is a ceiling, not a multiplier: lowering it pulls
down any category currently above the new cap (so what you hear
right now never exceeds it), but raising it doesn't push a
category's own volume up to match -- that slider just becomes
free to be raised further than it could before.

## `// that were just changed, rather than only affecting the next one`

Keeps a cry that's already playing in step with the settings
that were just changed, rather than only affecting the next one
— stops it outright if Cries (or global) just got muted, or
just updates its volume live otherwise. Defined here alongside
the other setters for readability, but only ever actually
invoked later from a user interaction — by which point cryAudio
(declared further down the script) already exists.

## `// further down the script, but not actually reached until a user`

Same idea as syncLiveCryAudio, for the music player (declared
further down the script, but not actually reached until a user
interaction well after the whole script has run). Pauses outright
on mute -- same behavior as Cries -- rather than leaving it
running silently at 0 volume, so Play/Pause always reflects
what's actually audible.

## `// same pattern as refreshSearchButtonState/refreshBackButtonState`

Swaps the Audio nav button between its three artwork states,
same pattern as refreshSearchButtonState/refreshBackButtonState
above: default (no class) on load with sound unmuted and
nothing playing; .audio-playing while music is playing; and
.audio-muted whenever Global Mute is on, which wins over
.audio-playing if both would otherwise apply -- at most one of
the two classes ever gets added, so there's nothing for the
two artworks to conflict over.

## `//`

---- Music player -----------------------------------------------

Master Playlists are just track categories from music-tracks.json;
the Region Filter dropdown below is a temporary stand-in for the
future Gameplay Companion panel's region selector. That panel
will just call setActiveMusicRegion() once it exists -- it won't
need to know anything about queues or playback state, since
everything downstream of a region change happens here.

## `// of whoever collects any badge (Gym or extra category) -- see playBadgeJingle(). Keyed`

One short (< 10s) jingle per region, played once on the device
of whoever collects any badge (Gym or extra category) -- see playBadgeJingle(). Keyed
by the same region ids music-tracks.json uses. Anything that
isn't a real http(s) URL (the PLACEHOLDER_ strings below, or a
region left out entirely) is silently skipped, so this can be
filled in one region at a time.

## `// regions are) since this is standing in for the future Badge`

Fixed vocabulary (not derived from the data like categories/
regions are) since this is standing in for the future Badge
Tracker's own stage concept, not an open-ended tag. Order here
is also playthrough order, used below to build the dropdown in
a sensible sequence rather than whatever order the JSON happens
to list values in.

## `// host went away. Kept apart from musicMirror because becoming host passes through a brie`

Set by completeHostTakeover() (the one place a guest becomes the host): what the table was listening to when the old
host went away. Kept apart from musicMirror because becoming host passes through a brief "no lobby" state that
would otherwise wipe it before the new host's player is ready.

## `// shuffle is on, so Prev can retrace actual play order instead of`

Stack of queue indices visited before the current track while
shuffle is on, so Prev can retrace actual play order instead of
just picking another random track. Indices, not track ids --
gets reset (see rebuildMusicQueue) whenever the queue itself is
rebuilt, since old indices wouldn't line up with the new one.

## `// Playlist (category), so switching away mid-track and back later`

Remembers the id of the last track loaded for each Master
Playlist (category), so switching away mid-track and back later
resumes progression there -- see rebuildMusicQueue -- instead of
restarting the same track or the playlist's first one every
time. Session-only (not persisted): a fresh page load starts
every playlist at the top again.

## `// applyMusicCue()) -- while set, the queue is just these tracks`

Specific tracks pinned over the whole playlist (see
applyMusicCue()) -- while set, the queue is just these tracks
(in music-tracks.json order, so they play one after another,
or shuffled/repeated per the usual transport settings), and
region/stage filters don't drop them. Cleared by any ordinary
playlist change, so a player tapping a playlist button always
wins. Session-only, never saved.

## `// 'genericOnly', the playlist leaves out every track that's`

While a cue (see applyMusicCue()) is in effect with
`genericOnly`, the playlist leaves out every track that's
reserved for specific Pok\u00e9mon (a "pokemon" list in
music-tracks.json), so a Pok\u00e9mon only ever hears its own
track or one of the region's generic ones. Cleared by any
ordinary playlist change. Session-only, never saved.

## `// (see setActiveMusicCategory()'s 'thenCategory' option and the 'ended' listener). Used b`

While set, the playlist plays each of its tracks once and then switches to `thenCategory` instead of looping
(see setActiveMusicCategory()'s `thenCategory` option and the 'ended' listener). Used by the Victory screen:
Victory plays through once, then the music falls over to Intro. `remaining` = ids of the queue's tracks not yet
played, filled in as the first track loads. Cleared by any other playlist change. Session-only, never saved.

## `// button reads as active in sync with musicState.activeRegion --`

Keeps the expandable section's own header text and which region
button reads as active in sync with musicState.activeRegion --
called on every region change, once up front after the buttons
are first built, and (via the ResizeObserver below) whenever
the header's own width changes for any other reason.

Prefers the full "Background Music - X" label, but falls back
to a shortened "BGM - X" whenever the full one would wrap onto
a second line at the header's current width. Detected by
setting the full label first and checking
musicRegionHeaderText.getClientRects().length -- an inline
span reports one DOMRect per line it's actually wrapped onto,
which sidesteps having to hand-compute available width against
font metrics.

## `//`

---- Music cues ------------------------------------------------

A "cue" is a request for the music to change because of
something that happened in the game, rather than because a
player tapped a playlist button:

{ playlists: ['wild-legendary-battle', 'wild-battle'],
tracks: [<music-tracks.json entries>] }

tracks     specific tracks to pin over the whole playlist
(a Legendary's own themes -- ALL of them play,
not just the first). Wins when non-empty.
playlists  categories to try, best first -- the first one
with at least one track under the current Region
+ Game Stage filters is used, so a missing
Legendary playlist falls back to plain Wild.
genericOnly  true: leave out tracks reserved for specific
Pok\u00e9mon (see isMusicTrackGeneric()) when judging
and playing those playlists.

Nothing happens if neither resolves (the music is left as it
was). Host (or solo) only, like all real playback -- guests
just see the result through the normal music broadcast.
Returns true if the music was changed.

## `//`

---- Battle music --------------------------------------------

When a battle starts in a multiplayer Battle Arena the Host's
music changes to match the kind of battle, and when it ends,
however it ends, goes back to Route. Everything funnels
through syncBattleMusicToArena(), called every time the Host
broadcasts the arena (which every start/end path does), so
there's no separate hook per way of ending.

TO ADD A NEW KIND OF BATTLE: add an entry to
BATTLE_MUSIC_RULES (and, if it needs a new fact about the
battle, a field in buildBattleMusicContext()). First rule whose
match() is true wins.

A SPECIFIC TRACK FOR A SPECIFIC POK\u00c9MON: in music-tracks.json,
give the track a "pokemon" list of names as they appear in
pokemon-data.json, e.g.
{ "id": "johto-battle-raikou", ..., "pokemon": ["Raikou"] }
A rule with pinByPokemon: true plays every track that lists
that Pokémon (regardless of Game Stage) instead of the
playlist when it's the wild opponent -- one after another, in
music-tracks.json order, or shuffled if Shuffle is on. But
ONLY tracks from the active Region: a Lugia met in Sinnoh
doesn't get Johto's Lugia theme. (With Region set to All
Regions, any region's count.)
A track that lists Pok\u00e9mon is reserved for them: every
battle playlist skips it for anyone else (genericOnly), so a
Pok\u00e9mon with no track of its own in this region gets one of
the region's generic tracks (the ones with no "pokemon" list)
instead. No generic track in the region at all? The next
playlist in the rule's list is tried.

## `// record with a "battleType" (e.g. Alola's "totem"/"kahuna")`

A gym leader card (Defender; Rivals in the Attacker half). A
record with a "battleType" (e.g. Alola's "totem"/"kahuna")
plays the tracks carrying that same battleType in its own
region; with none (or none yet), its category's playlist
(generic tracks only), then trainer-battle. First, so these
never fall through to the Wild or plain Trainer rules.

## `// battle. Matched on the card's OWN region(s), not the active Region`

Tracks reserved (via "battleType") for this gym leader card's kind of
battle. Matched on the card's OWN region(s), not the active Region
setting -- a Kahuna's theme is the Kahuna's wherever the table is
set. Empty when the card has no battleType or nothing carries it
yet, which makes the cue fall back to its playlists.

## `// populateMusicControls below) -- routes around setActiveMusicCategory`

Entry point the Master Playlist buttons actually call (see
populateMusicControls below) -- routes around setActiveMusicCategory
itself while this device is a connected Lobby guest, since only
the host's device should ever touch its own real playback (see
GAME_PANEL_NOTES.md's Playlist Sync notes). A guest's tap just
asks the host to make the change instead; the guest's own UI
then updates once that change comes back through the normal
roster/music broadcast (see applyGuestMusicMirror below), not
from this call directly. Hosting or solo play (no lobby at
all) both fall straight through to the real function, same as
before this existed.

## `// requestMusicCategoryChange() above, just for the transport`

Same "ask the host, don't touch local state yourself" shape as
requestMusicCategoryChange() above, just for the transport
buttons (Play/Pause/Prev/Next/Shuffle/Repeat) -- these used to
be locked out entirely for a guest (see syncMusicUIForLobbyRole,
which no longer disables them). action is one of 'play-pause',
'next', 'prev', 'prev-first' (the held-Prev jump-to-first
gesture), 'shuffle-toggle', 'repeat-toggle' -- see
applyMusicTransportAction() below for what each actually calls.

## `// Region, Game Stage, now-playing track title, and play/pause`

Host-only -- pushes the current Master Playlist selection,
Region, Game Stage, now-playing track title, and play/pause
state out to every connected guest. Called from the tail of
renderMusicPlayerUI below rather than scattered across every
place playback state can change (category switch, auto-
advance, shuffle, manual Next/Prev, Play/Pause) -- that
function already runs after all of those, so hooking it once
here covers every case for free. No-ops immediately whenever
this device isn't hosting an active lobby, so it's always safe
to call unconditionally.

Region/Game Stage are included here (not just category) because
a guest's own filters were found to silently disagree with the
host's -- letting a guest move their own slider re-ran their
*local* refreshMusicPlaylistButtons() against their own
(unsynced) filters, wrongly disabling buttons that were
actually fine on the host's end. Locking these to the host's
values (see applyGuestMusicMirror/syncMusicUIForLobbyRole
below) is what actually fixes that, not just broadcasting them.

## `// visual mirror: which playlist button reads as active, which`

Guest-only -- applies a broadcast from the host as a pure
visual mirror: which playlist button reads as active, which
region button reads as active, where the Game Stage slider
sits, and what the Now Playing line/Play-Pause icon show.
Deliberately never touches musicAudio/musicQueue here -- this
device isn't the one playing anything while it's a guest (see
syncMusicUIForLobbyRole below, which is what actually locks
these controls so a guest can't drift out of sync by touching
them), so there's no real playback state on this end to keep
in sync, only the display of the host's. musicState.activeRegion/
activeGameStage ARE actually updated here (not just their on-
screen display) so anything else that happens to read
musicState directly -- renderMusicRegionUI's header text, for
instance -- stays correct too.

## `// which prefers this same musicState.activeRegion while`

Badge Tracker's own region comes from getActiveRegionForBadges(),
which prefers this same musicState.activeRegion while
connected -- but its grid isn't re-rendered just from that
value changing, so this is what actually updates it live if
the host switches region mid-session (rather than only
catching up the next time something else happens to
re-render, like collecting a badge). Also keeps the Guest
Save's own cached region field current for whenever this
is next viewed offline (see finalizeGuestJoin(), which only
otherwise refreshes it at connect time).

## `// (entering hosting/guesting, or leaving back to solo) -- not on`

Called any time this device's Lobby role actually changes
(entering hosting/guesting, or leaving back to solo) -- not on
every render, since it's only the role itself that flips
whether these controls are locked. Only Region buttons and the
Game Stage slider are actually disabled for a guest: only the
host's device decides what's filtered, and letting a guest's
own copies of those move independently was the exact bug that
motivated locking them (see GAME_PANEL_NOTES.md's Playlist
Sync notes). Transport (Play/Pause/Prev/Next/Shuffle/Repeat)
and Master Playlist buttons both stay tappable while guesting
-- both route through a request to the host rather than
touching this device's own (nonexistent) playback state
directly (see requestMusicTransportAction()/
requestMusicCategoryChange()), so there's nothing for a guest
to drift out of sync with by tapping them.
Only the host's (or a solo player's) device ever plays music; a guest is a pure mirror. That only holds if a device
that WAS playing -- a solo player who joins a game, or a host who hands the game off -- actually goes quiet when it
becomes a guest: its own play/pause buttons now just send requests to the host, so nothing local could ever stop it,
and it kept playing underneath the new host's music.

## `// category change would load a track but leave it paused (those only keep playback going `

A guest that is promoted to host (or takes over in a handoff) never played anything itself, so a battle cue or
category change would load a track but leave it paused (those only keep playback going if it was already going).
If the table was listening to music when the previous host handed off, carry on with it: same category, same track
if it can be found. Silently stays paused if the browser blocks autoplay.

## `// (e.g. no track loaded, or none matching this device's`

A leftover `disabled` from browsing solo before joining
(e.g. no track loaded, or none matching this device's
own region filter) would otherwise block a request
that's actually fine on the host's end -- these all
route through a request now (see
requestMusicTransportAction()/requestMusicCategoryChange()),
so this device's own local playback/filter state is
irrelevant to whether they should be tappable.

## `// category/region. Keeps playing the same track if it's still in`

Recomputes musicQueue from musicTracks + the current
category/region. Keeps playing the same track if it's still in
the rebuilt queue (e.g. a region change that happens not to
affect the currently-playing category) rather than restarting it
-- otherwise falls back to the queue's first track (e.g.
switching Master Playlists outright, where there's no "same
track" to preserve).
Enables/disables each Master Playlist button based on whether
any track in its own category satisfies the current Region +
Game Stage filters -- independent of which category is actually
selected, so a button can go disabled/enabled purely from a
Region or Game Stage change even if the active playlist itself
still has matches. Also reflects which button (if any) is the
active one. A currently-active category that has just lost all
matches stays visually active-but-disabled, rather than losing
its highlight, so it's still clear *what's* selected even though
nothing plays -- musicNowPlayingEl already explains why (see
renderMusicPlayerUI's "No tracks match this filter").

## `// category was last left off (even if that track only`

Non-shuffle: pick up one track past wherever this
category was last left off (even if that track only
got partway through), so leaving mid-track for
another playlist and coming back still moves the
playlist forward instead of replaying the same
track or jumping back to the very first one.

## `// whichever track is first in the *current* queue -- which is`

Holding Prev (see MUSIC_PREV_HOLD_MS below) jumps straight to
whichever track is first in the *current* queue -- which is
already in the same order those tracks appear in
music-tracks.json, since musicQueue is just musicTracks filtered
down to the active category/region/stage without any
reordering (see rebuildMusicQueue). That holds true regardless
of shuffle mode: this always means "the JSON's first match for
this filter arrangement", not shuffle's own notion of where
things started. Clears shuffleHistory since a jump like this
isn't part of whatever shuffle sequence was in progress.

## `// "off" (the default) loops the whole playlist back to track 1`

Repeat is a simple on/off toggle now, not a 3-way cycle:
"off" (the default) loops the whole playlist back to track 1
once it reaches the end; "on" repeats just the current track.
There's deliberately no third state that lets playback stop on
its own -- see the 'ended' listener below.

## `// repeat mode actually matters (manual Next/Prev above ignore it).`

What happens once a track finishes on its own -- the one place
repeat mode actually matters (manual Next/Prev above ignore it).
Every branch here ends in either restarting or advancing to
another track -- playback should never just stop short of the
user hitting Pause or closing the page.

## `// audio element's real play/pause events, not whatever we just`

Source of truth for the Play/Pause button's own label is the
audio element's real play/pause events, not whatever we just
asked it to do -- so if a play() call gets silently blocked by
the browser, the button still ends up correctly showing "Play"
rather than a "Pause" that doesn't match what's actually
happening.

## `// from whatever actually appears in the loaded track data -- adding`

Builds the two remaining dropdowns (categories/regions still come
from whatever actually appears in the loaded track data -- adding
a new one to music-tracks.json is enough on its own, nothing here
needs to change to pick it up). Game Stage no longer needs
building here since it's a fixed-vocabulary slider now (see
GAME_STAGE_STEPS above) rather than a dynamically-populated list.

## `// data could have changed since the last visit), else fall`

Restore persisted selections if they're still valid (the
data could have changed since the last visit), else fall
back to the first available category / "All Regions".
refreshMusicPlaylistButtons() and renderMusicRegionUI()
(called from rebuildMusicQueue below and just after this,
respectively) reflect the resolved state onto the actual
buttons -- nothing else to set here now that there's no
select element to sync.

## `// distinguished from a normal tap/click via a plain pointerdown`

A held Prev press (see jumpToFirstTrackInQueue above) is
distinguished from a normal tap/click via a plain pointerdown
timer: if it fires before the pointer comes back up/away, the
hold action runs and musicPrevHoldFired is set so the 'click'
event that still follows the pointerup doesn't *also* run a
normal Prev right after it.

## `// is reachable (see beginTeamAddMode()'s own comment), so it`

Team-add mode has no panel of its own open by the time this
is reachable (see beginTeamAddMode()'s own comment), so it
wouldn't be touched by any of the close*() calls below --
needs its own explicit exit here, same as the back button's
own handler further down.

## `// Tracker, Type Matchup, etc, i.e. anything but the root`

Game panel open, on one of its deeper screens (Badge
Tracker, Type Matchup, etc, i.e. anything but the root
save-picker/tools screen), and nothing else layered on top
of it: step back to that root screen instead of closing
the whole panel, mirroring what each screen's own in-panel
back button already does (see the data-target delegated
listener above) -- same behavior on both mobile and
desktop, since desktop still has its own in-panel back
button (and everything else this button already covers,
like tapping outside the panel) as other ways to close
the panel outright from a deeper screen. Deliberately
skipped when the viewer's also open on top, so this one
click keeps closing everything at once the way it already
did rather than needing a second press to get past the
game panel underneath.

## `// (.game-screen-back-btn, i.e. the desktop-only corner`

Mirror whatever this screen's own in-panel back button
(.game-screen-back-btn, i.e. the desktop-only corner
button on mobile-hidden .game-screen-back-wrap) would
step back to, rather than assuming everything goes
straight to 'main' -- true for every screen except
Rulebook, whose back button targets 'rulebook-picker'
instead (see that button's own data-target in the
markup). Falls back to 'main' if the lookup somehow
comes up empty, keeping the old behavior as a safety net.

## `// above is already closed (see beginTeamAddMode()'s own`

Team-add mode is only ever active while every panel
above is already closed (see beginTeamAddMode()'s own
comment), so this is never reachable in the same click
as the branch above -- "on the gallery screen" from the
chat this was decided in just falls out of that.

## `// class-toggle pattern as pulseAttention/pulseNavArrow above, just`

Tactile click feedback for all 6 nav buttons -- same restart-safe
class-toggle pattern as pulseAttention/pulseNavArrow above, just
with its own shrink-first keyframes (see .nav-button-pulse in
CSS). Wired generically to every .nav-button rather than
per-handler, so it applies uniformly regardless of what (if
anything) that particular button actually does on click.

## `// row) is currently showing shinysrc instead of src. Reset to`

Whether the viewer's magnified image (and the related-images
row) is currently showing shinysrc instead of src. Reset to
false only on a fresh open of the viewer (see openImageViewer);
while the viewer stays open, it carries over across prev/next
navigation and related-image picks, since those all route
through openImageViewer too -- see the alreadyOpen check there.

## `// that have no other guard against being interrupted: the brief`

Blocks gallery image clicks during the two mobile-only sequences
that have no other guard against being interrupted: the brief
pulse-then-open delay right after a fresh tap (see
openImageViewer), and the close-then-recenter-then-pulse
sequence after closing (see closeImageViewer). Both involve a
gap where the tapped/previous image's card is mid-animation but
the gallery is otherwise fully clickable, so a second tap on a
different card in that gap could race the first sequence.
Switching images while the viewer's already open isn't guarded
by this -- there's no competing animation to race there.

## `// demoting the closed card's .active-in-viewer layer) after a`

How long to hold off un-pausing the nav panels' GPU layer (and
demoting the closed card's .active-in-viewer layer) after a
close starts. Originally a single requestAnimationFrame defer --
enough to dodge the very first frame of compositor work, but the
overlay's own will-change:transform layer is still actively
forming for several frames beyond that, not just the first one.
Asking the compositor to also promote nav-panel-top/bottom's
heavier layer (will-change + filter: drop-shadow, previously
fully torn down by visibility:hidden rather than just idling)
while the overlay's layer is still settling is what let the
still-covered content underneath flash through for a frame --
landing specifically in row 0, the one row sitting flush against
nav-panel-top's own overlap sliver (see body's own padding
comment near the top of the stylesheet). Nothing here needs to
land any sooner than this: the un-paused panels don't actually
reveal until NAV_PANEL_TRANSITION_MS/PANEL_TRANSITION_MS later
(or immediately on the no-previously-active branch below, which
now waits for this same defer instead of racing it), and the
overlay keeps the whole top strip covered for virtually all of
its own VIEWER_TRANSITION_MS regardless.

## `// content-visibility-lock release in closeImageViewer`

Deliberately the same expression as the full-gallery
content-visibility-lock release in closeImageViewer
(VIEWER_TRANSITION_MS + 100) -- not a coincidence, and not
safe to change one without the other. lockAllCards() forces
every card in the gallery to render fully (no skip-rendering)
until that release fires; trackImageIntoView's recenter scroll
does a real layout read + paint every single frame it runs.
Starting the recenter any earlier than the lock's release means
some of its frames land while the whole gallery is temporarily
far more expensive to paint than normal, which was dropping
frames and reading as stutter in the scroll itself. Tying this
to the same expression (rather than just picking a close-enough
number) means the two can't drift apart from each other again
if either constant changes later.

## `// up -- see .image-card.content-visibility-lock's own CSS comment`

Reference-counted, same pattern as window.pageScrollLock further
up -- see .image-card.content-visibility-lock's own CSS comment
for what this is protecting against. A plain "lock this batch of
cards, unlock this batch of cards" pairing would break if a
close's delayed cleanup (see closeImageViewer) fires after a
rapid reopen has already re-locked some of the same cards for a
new session -- the stale cleanup would strip the lock out from
under the still-open new session. Counting per-card instead
means a card only actually loses the class once every session
that locked it has also released it.

## `// see closeImageViewer's own comment for why this is needed on`

Locks every card in the gallery, not just the ones on-screen --
see closeImageViewer's own comment for why this is needed on
close specifically, on top of (not instead of) lockCardsInView's
narrower on-screen-only lock used elsewhere. Same ref-counted
bookkeeping, so this composes safely with lockCardsInView: a
card that's covered by both calls just needs both to unlock
before it's content-visibility:auto again. Deliberately doesn't
touch .gallery-layer-promoted/layerPromotionCounts -- see that
class's own CSS comment for why bulk-promoting the whole
gallery's worth of (mostly off-screen, never-painted) cards
onto their own GPU layers bought nothing and caused its own
problem.

## `// class's own comment in the CSS) for #filter-panel, #sounds-panel,`

Promotes/demotes the .drawer-gpu-promoted GPU layer (see that
class's own comment in the CSS) for #filter-panel, #sounds-panel,
#discord-panel, and #game-panel -- the four mutually-exclusive
drawer panels that used to carry a permanent will-change instead.

promoteDrawerPanel() is called synchronously, before the 'open'
class goes on, so the layer exists up front rather than being
promoted reactively once the transform animation has already
started -- same up-front-promotion reasoning as #image-overlay's
own will-change, just scoped to only the moments it's actually
needed instead of permanently.

demoteDrawerPanel() is called when a panel closes, but only
*removes* the class after its own close transition has had time
to finish (DRAWER_PANEL_TRANSITION_MS) -- pulling the layer out
from under a still-animating panel would just re-introduce the
"layer not ready" flash this promotion pattern exists to avoid,
just on the way out instead of the way in. Tracks any pending
demote timer per-element (a WeakMap rather than a single shared
variable, since in principle more than one of these could be
mid-close at once) so that rapidly closing and reopening the same
panel cancels a stale demote instead of letting it fire late and
strip the layer out from under the panel's new open animation.

## `// position after a scroll settles. Removing the class first and`

Briefly pulses an image's card to draw the eye to its new
position after a scroll settles. Removing the class first and
forcing a reflow (offsetWidth read) lets the animation restart
cleanly if it's re-triggered before the previous pulse finished,
rather than being ignored because the class was already present.
Takes the img (matching every caller's existing identity
reference) but pulses its enclosing .image-card instead — see the
.image-card.gallery-pulse CSS comment for why it lives there now.

## `// is left below the panel, rather than centered in the full`

Where an image should land: centered in whatever vertical space
is left below the panel, rather than centered in the full
viewport. On mobile this means the reserved padding-top (the
panel's own height) is excluded from the centering math; on
desktop the panel docks left instead, so it never contributes to
padding-top and this collapses back to ordinary full-height
centering automatically. It also naturally converges to
full-viewport centering once a close animation finishes and
padding-top has shrunk back to its base value — so this same
calculation covers opening, closing, and switching between
images without needing separate cases for each.

## `// near the very top or bottom of the page can ask for a`

Clamp both to what's actually scrollable. Centering a card
near the very top or bottom of the page can ask for a
scroll position outside [0, max] -- e.g. a card close to
the top of the gallery, where "centered" would mean
scrolling above the top of the document entirely, which
isn't possible. Without this, trackImageIntoView's per-
frame loop keeps recomputing that same out-of-range delta
every single frame for the whole transition (the actual
scroll position can never reach it, so getBoundingClientRect
returns the same rect next frame too), forcing a fresh
layout read on every one of those frames for nothing --
right alongside #image-overlay's own close animation trying
to use those same frames. Clamping means a card that's
already as centered as it can possibly get resolves to
dy = 0 (or dx = 0) right away instead.

## `// above (which stays exactly as it was, and keeps driving`

Desktop-only, and deliberately separate from neededScrollDelta
above (which stays exactly as it was, and keeps driving
closeImageViewer's recenter on both mobile and desktop).
This one backs switching images while the viewer's already open
-- the next/prev buttons and clicking a related image -- which
used to use a native scrollIntoView({block:'nearest'}). That
only guarantees bare visibility with the smallest possible
scroll, which often left the card sitting flush against the
viewport's actual top or bottom edge with zero breathing room.
This instead only corrects when the card falls outside the
middle GALLERY_BAND_FRACTION of the usable viewport height, and
even then only scrolls it to the nearest edge of that band --
not all the way to dead center, keeping the "don't move it if
it doesn't need to move" spirit scrollIntoView('nearest') had,
just with a band instead of the raw viewport edges. Not used on
mobile: the panel is fullscreen there, so the gallery is never
visible behind it while switching images (see openImageViewer's
alreadyOpen branch), and there's nothing for this to apply to.

## `// flicker: trackImageIntoView() gets called twice back-to-back on`

Guards against exactly the bug that caused the mobile info-panel
flicker: trackImageIntoView() gets called twice back-to-back on
mobile open (once from openImageViewer itself, once more from
setExpandedPanel('info') auto-expanding General Information right
after), and neither call had any way of knowing about the other.
With no shared state, that meant two fully independent
requestAnimationFrame loops running at once, each measuring the
image's position and calling window.scrollBy() on every frame --
so the page was being scrolled twice per frame, off two deltas
that went stale the instant the other loop's scrollBy fired. That
produces real jitter (not just dropped frames), timed to land
exactly when the info panel was auto-expanding.

trackingGeneration turns every call into "the latest call wins":
each invocation stamps its own step() closure with the value at
call time, and increments the shared counter. A step() only
schedules its own next frame if its stamp still matches the
current counter -- so the moment a newer call comes in, every
older in-flight loop notices on its very next frame and quietly
stops instead of continuing to fight for control of the scroll
position.

## `// keeps reflowing continuously for the whole transition (body's`

While the panel is actually opening/closing, the gallery's layout
keeps reflowing continuously for the whole transition (body's
padding is animating), so a single delayed scroll would target a
position that's already stale by the time it fires. Instead this
nudges the scroll a fraction of the way toward "in view" every
frame for the transition's duration — a full instant correction
each frame is what made it feel snappy, since it jumps the whole
distance in one go the moment the image goes out of view rather
than moving gradually the whole time. A guaranteed hard snap at
the very end (using the same shared delta calculation, rather
than the browser's own native centering) cleans up whatever small
residual is left from chasing a moving target with partial steps.
skipPulse: lets a caller recenter an image without the trailing
.gallery-pulse -- currently only closeImageViewer's mobile path
uses this (see its own comment for why: mobile always recenters
straight to the middle of a screen with very few cards on it,
so the pulse's job of drawing the eye stopped earning its keep
there, unlike desktop's reflow-and-scroll close which still
needs it). Every other caller leaves this at its default and
behaves exactly as before.
computeDelta: which targeting function step() re-measures against
every frame -- defaults to neededScrollDelta (exact center),
unchanged for every pre-existing caller. openImageViewer's
already-open/desktop branch passes bandScrollDelta instead, for
a reason that isn't obvious from the name of either function:
see that call site's own comment for why a *self-correcting*
loop turned out to matter there specifically, not just which
position it targets.

## `// position (the 2nd tag, index 1) rather than deriving it from the`

Pulls the name-tag straight out of an image's own tags by
position (the 2nd tag, index 1) rather than deriving it from the
display name — the JSON's tag ordering convention is reliable
enough to use directly, and sidesteps needing to strip
parenthetical qualifiers, regional-variant prefixes, "Mega ",
"G-Max ", etc. out of free-text names to reconstruct the same
value.

## `// this image's own name-tag — including the image itself, since its`

Every gallery image (regardless of current filters) that carries
this image's own name-tag — including the image itself, since its
own tags trivially include its own name-tag — sorted left-to-right
by stage (stage1, stage2, ...). Any entry whose tags don't follow
the expected ordering will simply turn up no related images rather
than erroring.

## `//`

---- PokeAPI-powered "General Information" panel ----------------

Each gallery image carries its National Dex number in
img.dataset.dex (set at card-creation time above). That number is
enough to reliably pull species-level data (Pokédex flavor text,
genus) straight from PokeAPI. Form-specific data (height, weight,
types, abilities) needs the right *slug* though — e.g. "Mega
Charizard X" is "charizard-mega-x", "Alolan Vulpix" is
"vulpix-alola" — so buildSlugCandidates() guesses a handful of
likely slugs from the display name and they're tried in order,
falling back to the base species entry if none of them exist.

Results are cached per Pokémon name so flipping back and forth
(prev/next, evolution-chain thumbnails) never re-fetches.

## `//`

Manually-curated Pokédex text for specific forms/varieties.

PokeAPI's flavor text is stored per species+version only — it has
no field saying which form a given game's entry describes, so
form-specific text (Mega Evolutions, Gigantamax, and some
regional forms) can't be pulled out reliably by code. This map is
the manual fix: when a Pokémon's exact display name (matching
pokemon-data.json's "name" field) appears here, its entries are
shown instead of anything guessed from the API. This entirely
replaces the API-derived flavor section for that name; every
other field (types, height, weight, abilities, genus) still
comes from the API as normal.

Loaded from flavor-overrides.json, a sibling file in the same
repo — see that file for the expected shape and instructions on
adding entries. Starts empty and fills in once the fetch below
resolves; if it's still empty (or fails to load) by the time
someone opens a Pokémon, that entry just falls back to
API-derived text as normal, so this fetch never blocks anything.

## `// everything the info panel needs) for entries that have NO`

Full standalone data (types, height, weight, cry, flavor text --
everything the info panel needs) for entries that have NO
PokeAPI data to pull from at all, like MissingNo. and Pokéstar
Studios "Pokémon" -- these aren't real species, so there's no
dex number to fetch against. Keyed the same way as
FLAVOR_TEXT_OVERRIDES (by exact display name), but reserved
under this separate top-level key in the same JSON file rather
than mixed into FLAVOR_TEXT_OVERRIDES's shape, so adding these
can't accidentally collide with or affect how any real
Pokémon's entry is built. See flavor-overrides.json for the
expected shape of each entry.

## `// /api/v2/pokemon/{slug}, most-likely-correct first.`

Returns an ordered list of slugs worth trying against
/api/v2/pokemon/{slug}, most-likely-correct first.
Parses out the structural pieces of a display name once, so both
buildSlugCandidates (below) and detectFormInfo (further down, used
for flavor-text filtering) work from the same understanding of
"what kind of form is this" instead of two separate regex passes
that could quietly drift out of sync with each other.

## `// 'mega', 'gmax', 'region' (with which region), or 'base' — used to`

Boils a display name down to "what kind of form is this" —
'mega', 'gmax', 'region' (with which region), or 'base' — used to
decide how to filter/annotate Pokédex flavor text below. PokéAPI
doesn't tag flavor text by form (see buildPokemonInfoHTML), so
this is the closest we can get without that data existing.

## `// which flavor-text entries are plausible for a regional form. Not`

Game versions belonging to each region — used to narrow down
which flavor-text entries are plausible for a regional form. Not
perfect: a handful of these games let you obtain *both* the
original and regional form in the same Pokédex, so an entry for
the wrong one can still slip through (see the form note rendered
alongside filtered results in buildPokemonInfoHTML).

## `//`

--- Flavor-text cleanup (pre-grouping) -----------------------

PokéAPI serves flavor text verbatim from each game's own
script, which wasn't written with cross-game consistency in
mind. Two recurring quirks otherwise produce near-duplicate
entries that read as separate (seemingly contradictory)
Pokédex entries rather than the one shared entry they really
are:

1. Games through about Gen 3 render the Pokémon's own name
in full caps inside its own entries (e.g. "CHARMANDER"),
while every later game uses normal title case for the
same sentence.
2. Small, inconsistent spelling/spacing choices between
paired versions of the same game -- e.g. HeartGold's
entry has "lower back" where SoulSilver's has
"lower-back" for the identical sentence otherwise.

Both are normalized below, before grouping, so entries that
only differ in these superficial ways collapse into a single
row instead of listing twice.

## `// Flavor text is prose, not headers or acronyms, so this is`

Any run of 2+ uppercase Latin letters gets title-cased.
Flavor text is prose, not headers or acronyms, so this is
safe to apply blanket -- older games have no legitimate
reason to shout mid-sentence other than rendering a name in
full caps. The one recurring exception is genuine acronyms
(e.g. "UFO", used in some Unown/UFO-shaped Pokémon's entries)
that are *meant* to stay all-caps -- those are carved out via
ALL_CAPS_EXCEPTIONS below rather than title-cased like a name.

## `// long words across the Game Boy's fixed-width text box, and`

Line-wrap artifacts: Gen 1/2 games (Red through Crystal) wrap
long words across the Game Boy's fixed-width text box, and
that wrap point survives into PokéAPI's transcription even
after the actual line break is collapsed back into running
prose -- leaving a stray gap (and sometimes a leftover
wrap-point character) where the line used to break. Two of
the three sub-cases below can be fixed generically, with no
per-word list, because the games leave a distinct marker
behind for each:

1. A word wrapped somewhere with no natural hyphen (e.g.
"vigorously") gets a genuine U+00AD SOFT HYPHEN -- the
standard invisible Unicode character that marks an
optional break point -- inserted at the break, followed
by the leftover space. Both are safe to strip everywhere:
a soft hyphen has no business appearing in rendered
flavor text at all, so any instance of one is the wrap
artifact, never a false positive.
2. A word that already contained a real hyphen (e.g.
"bluish-white") happened to wrap exactly at that hyphen,
leaving the hyphen in place but with the same stray
space after it. Collapsing "X-<space>Y" to "X-Y"
whenever the hyphen has no space *before* it distinguishes
this from an intentional dash-as-punctuation, which
would almost always have spaces on both sides ("fast -
almost too fast") rather than only the trailing one --
and from a genuine compound like "self-propels", which
has no space after the hyphen either.
3. A word wrapped with no marker left behind at all (e.g.
"be comes"). There's nothing here to safely detect in
general -- no invisible character, no hyphen, nothing
that would distinguish it from two ordinary adjacent
words -- so these still need a manual entry below.

## `// verbatim from the source games -- normalized to one canonical`

Known punctuation/spelling variants PokéAPI carries over
verbatim from the source games -- normalized to one canonical
form so paired versions that only differ here don't render
as separate entries. This is a targeted fix for known quirks
(add to it as new pairs turn up), not a general spellchecker;
the edit-distance pass below in groupFlavorEntries catches
the more general "minor typo" case this list doesn't, and
fixLineWrapArtifacts above catches the "rogue space" cases
that carry their own marker. This list is now mostly reserved
for the markerless split-word case (see case 3 above) plus
anything else that isn't one of those two patterns.

## `// fixAllCapsWords above: older entries render it in caps as`

"Pokémon" itself needs its own fix rather than relying on
fixAllCapsWords above: older entries render it in caps as
"POKéMON", with a lowercase é even mid-shout (the source
games/PokéAPI's transcription have no uppercase É). That
lowercase é splits what should be one all-caps run into
two separate ones -- "POK" and "MON" -- which
fixAllCapsWords then title-cases independently, producing
"PokéMon" instead of "Pokémon". Matching case-insensitively
on either accented or plain "e" catches every variant
(POKEMON, POKéMON, PokéMon, Pokemon, ...) and normalizes
them all to the one correct spelling in one step.

## `// should be closed up -- e.g. Venusaur's Crystal entry has`

PokéAPI's transcription occasionally splits a word that
should be closed up -- e.g. Venusaur's Crystal entry has
"it self" where it means "itself". The (?!-) guard stops
this from also mangling a legitimately hyphenated compound
like "self-propels": there, "self" is immediately followed
by a hyphen rather than a space, so the lookahead blocks
the match instead of turning it into "itself-propels".
Same pattern to reuse for any other split-word entries
you find -- just add another [/\bWORD1 WORD2\b(?!-)/gi, 'WORD1WORD2'] line.

## `// adjacent) game whose slug can show up as a flavor-text`

Chronological release order of every mainline (and mainline-
adjacent) game whose slug can show up as a flavor-text
entry's version.name. Used only as a tie-break in
groupFlavorEntries below, when two near-duplicate wordings
otherwise have equal support -- the newer game's spelling
wins, since that's the version most current players will
recognize. A version this list doesn't recognize is treated
as newer than everything listed, not older, so a future game
PokéAPI adds before this list is updated still wins ties
against older, already-mapped games rather than silently
losing to them.

## `// (very common across paired versions, e.g. Red & Blue) into`

Collapses flavor-text entries that share the same wording
(very common across paired versions, e.g. Red & Blue) into
one row listing every version it appeared in, instead of
repeating the same paragraph over and over. Two passes:

1. Exact-match grouping, but on cleaned text rather than
the raw string, so caps-only and known spelling
differences (see cleanFlavorText) already collapse here.
2. A fuzzy pass over what's left, merging any two groups
whose cleaned text is within a small edit distance of
each other -- catching stray typos step 1's fixed list
doesn't know about. The threshold scales with text
length (~25%, floored at 2 characters) so short entries
need a fairly close match while longer ones tolerate
more differing characters -- wide enough to catch
"basically the same sentence, reworded a bit" pairs
across paired/remake versions, not just single-typo
differences. When two groups merge, whichever wording
belongs to the newer game is kept as the one shown to
the user; if both merging groups' newest version is the
same one, whichever wording more versions agree on wins
that tie instead.

## `// HTML/scripts), but a real newline character in the source text`

Same escaping as escapeHtml (still fully safe against injected
HTML/scripts), but a real newline character in the source text
becomes an actual <br> tag afterward. Some flavor text
genuinely has two parts worth splitting onto their own lines
(e.g. Cherrim's Overcast/Sunshine Form descriptions) -- a
literal "<br>" typed directly into the JSON data does NOT
work for this, since escapeHtml would just turn it into the
visible text "<br>" rather than a real line break. Use an
actual newline character in the JSON string instead (i.e. the
JSON escape sequence \n), which this function then converts.

## `// from pokemon-data.json's 'types' field in file order (first`

Primary/Secondary Type rows for the info panel, read straight
from pokemon-data.json's `types` field in file order (first
entry = Primary, second = Secondary) rather than from PokeAPI,
so the panel matches the types the Battle Arena actually uses.
Badges reuse the same .poke-type-badge look as everywhere else.
Unknown type strings still render (as the default gray badge)
so a bad value is visible rather than silently dropped, and a
missing entry / not-yet-loaded data says so in place.

## `// real Pokédex numbers — nothing to look up via PokeAPI. If`

"???" (MissingNo) and "PS#" (Pokéstar Studios) entries aren't
real Pokédex numbers — nothing to look up via PokeAPI. If
flavor-overrides.json's __custom_entries__ section has a
full entry for this exact name, build the info panel from
that instead; otherwise fall back to the "not available"
message, same as before this existed.

## `//`

---- Cries outside the Pokédex viewer -----------------------------

The viewer reads its cry URL straight off the info panel it just
rendered (see playCurrentCry() above). Everywhere else (the
Battle Arena, the Team Details view, an evolution) there's no
info panel, so this looks the URL up by name instead, the same
way buildPokemonInfoHTML() does: custom entries
(flavor-overrides.json's __custom_entries__) carry their own,
everything else comes from PokeAPI's /pokemon/<slug>, trying
the same form-aware slug guesses, then the plain Dex number.
"latest" is preferred over "legacy", like the panel.

A form with no cry of its own on PokeAPI (some Megas) falls
back to its species' default cry rather than staying silent.
Results are cached by name for the session (as promises, so
two quick requests share one fetch); a failed lookup isn't
cached, so going back online fixes it.

## `// overlap, and the Cries mute/volume apply). Only the most recent`

Plays through the same shared cryAudio element (so cries never
overlap, and the Cries mute/volume apply). Only the most recent
request is allowed to start playing: if a slower lookup comes
back after a newer one was asked for, it's dropped rather than
playing the wrong Pokémon over the top.

## `// -- its Mega/Gigantamax form if one's active (same override`

The cry of whatever a team/Arena member is currently showing as
-- its Mega/Gigantamax form if one's active (same override
getBattleMemberDisplay() resolves), otherwise its own species.
The Dex number comes from that form's pokemon-data.json entry
when there is one (a gym leader card's member carries none).

## `// effects.json -- the effect glossary that goes with moves.json`

==== MOVE EFFECTS PANEL ========================================
effects.json -- the effect glossary that goes with moves.json
(same repo root). Shape: { meta, effects: { id: { name, side,
icon, description } }, codes: { "wadv6": { effects: [ids],
threshold, iconOverride, requiresRoll, side } } }.
A move's `effects` codes resolve through `codes`; a code's icon
is its iconOverride when set, otherwise each of its effects'
own icon.

## `//   { src, title, code } (a moves.json effect code) or`

One entry per icon to draw for a move. A real image:
{ src, title, code } (a moves.json effect code) or
{ src, title, effectId } (die / half-level icons, which
aren't codes). Anything that can't be resolved to an image:
{ missing: "label", code?, effectId? } -- code/effectId are
kept when there's still a description to show on tap.

## `// 'threshold' is a sentence for any code that must be rolled for`

The toast's content for a tapped icon: { threshold, descs }.
`threshold` is a sentence for any code that must be rolled for
(requiresRoll -- a threshold of 1 always applies, so it gets
none) and is shown on its own first line; `descs` is one entry
per effect, labelled with the effect's name only when a code
carries more than one (advdis6).

`cards` holds the Field Move Effect card image(s) for any
effect whose side is "field": cards.json's card id is the
effect id behind a "field_" prefix (electric_terrain ->
field_electric_terrain). An effect with no such card (Field
Clear) just contributes none.

## `// Pokedex move cards, the Battle Arena box): its effect icons`

The body shared by every place a move's details are shown (the
Pokedex move cards, the Battle Arena box): its effect icons
(each tappable -- see the click listener below), its
uniqueEffect text, and its roll table. Returns the pieces plus
bodyHtml (all three in order) and hasContent (false when the
move has nothing to show). opts.showTbd: whether a "TBD"
uniqueEffect is drawn as a muted note (the Pokedex cards do,
since it's how gaps in the data get spotted; the arena
doesn't, since it means nothing to a player).

## `// is called from the arena's own render path, which first runs`

Set once everything above is defined. renderBattleMoveDetails()
is called from the arena's own render path, which first runs
while the page is still loading -- earlier than this block --
so it checks this (a `var`, so it exists, as false, even before
this line has run) rather than touching the `let`s above.

## `// Attack Strength (a floor somewhere), show it as one line`

The Attack Strength pieces; if they don't add up to the
Attack Strength (a floor somewhere), show it as one line
instead so the ledger still sums to the total.
The move's power and its STAB are one line: "Move" or, when
STAB applies, "Move (STAB)", showing the two added together.

## `// half has selected on the left, its Attack Total calculation on`

The Battle Arena's box for one half: details of the move that
half has selected on the left, its Attack Total calculation on
the right; hidden while no move is selected. Called from
renderBattleCalcReadout() and resetBattleCalcResult() -- every
path that changes the selection or anything the total depends
on, including one arriving from another player in a lobby --
and again when moves.json / effects.json arrive. The
calculation is redrawn every call (it's cheap and always
current); the move's details only when the move changes, so
the many refreshes don't keep rebuilding them, and a change
also closes any effect toast left over from the previous move.

## `// img.loading = "lazy" above) -- without this, every single`

Matches the main gallery's images (see attachImageEvents'
img.loading = "lazy" above) -- without this, every single
open eagerly force-fetches and decodes the *entire* row
of evolution-chain/form thumbnails right away, even the
ones scrolled out of the row's own horizontal overflow.
On a fresh page load, most of those sprite URLs have
never been requested before (the main gallery hasn't
scrolled anywhere near them yet), so this could kick off
several brand-new network fetches simultaneously. Close
the viewer while those are still in flight -- easy to do
on the very first open of a session -- and the browser's
renderer stalls catching up on that in-flight decode
work before it can paint the next frame.

## `// in the overlay's click-outside-closes listener: this`

Stops here rather than relying on a closest() check
in the overlay's click-outside-closes listener: this
click also rebuilds the related grid's contents
(renderRelatedImages, called from openImageViewer),
which detaches this very element from the DOM before
the event finishes bubbling — a detached node has no
ancestors left to match against.

## `// horizontal scroll whenever selection changes — including via`

Keeps the active thumbnail in view within the row's own
horizontal scroll whenever selection changes — including via
the prev/next buttons, since those funnel through
openImageViewer -> renderRelatedImages same as everything
else. 'nearest' on the block axis avoids nudging the page's
own vertical scroll, which is handled separately.

## `// nothing useful on a row that only overflows horizontally — this`

Mouse wheels only scroll vertically by default, which does
nothing useful on a row that only overflows horizontally — this
redirects that same vertical input (or a trackpad's horizontal
delta, whichever is nonzero) into scrollLeft instead. Only
hijacks the wheel when there's actually overflow to scroll
through, so it doesn't swallow page scrolling once the row fits
entirely within the section.

## `// every pointerdown. In Chromium (Edge included),`

Only capture once we know this is a genuine drag, not on
every pointerdown. In Chromium (Edge included),
setPointerCapture also redirects the eventual synthesized
click event's target to the capturing element — capturing
on every press meant even a plain click on a thumbnail
was retargeted to this container instead of the <img>,
so the thumbnail's own click listener never ran and the
click bubbled untouched to the overlay's
click-outside-closes handler, closing the whole panel.

## `// under the pointer — without this, dragging the row would also`

A drag release still fires a click on whatever thumbnail is
under the pointer — without this, dragging the row would also
randomly open whatever image you happened to let go over.
Capture phase so this runs before each thumbnail's own click
listener (added in renderRelatedImages above).

## `// — null, 'info', or 'related'. Only one is ever expanded at once,`

Tracks which of the two collapsible sections (if either) is open
— null, 'info', or 'related'. Only one is ever expanded at once,
on both mobile and desktop, since they share the same panel-
growth CSS (#image-overlay.info-expanded / .related-expanded)
and there isn't room to show both meaningfully at the same time.

## `// so the gallery's reserved space grows/shrinks smoothly.`

Reuses the same brief transition-enabling window as open/close
so the gallery's reserved space grows/shrinks smoothly.
Re-tracking the active image's scroll position only matters
on desktop, where the panel docks to the side and the
gallery stays visible next to it. On mobile the panel is
fullscreen the whole time it's open (see #image-overlay's
mobile height rule), so the gallery is never visible behind
it at all -- scrolling it here bought nothing and was one
more thing that could show through as a glimpse of the
gallery if it landed during a gap in the panel's own open
animation.

## `// ("No Shiny Form", formerly "PLACEHOLDER") instead of a real URL.`

The JSON marks tokens with no shiny art using placeholder text
("No Shiny Form", formerly "PLACEHOLDER") instead of a real URL.
Checking for an actual http(s) URL, rather than matching those
exact strings, means any future placeholder wording still fails
safe into the regular image instead of trying to load literal
placeholder text as an <img> src.

## `// which image(s) are actually displayed and how the button`

Single source of truth for both halves of the shiny toggle --
which image(s) are actually displayed and how the button
reflects that -- so nothing can update one without the other.
Covers the main overlay image plus every thumbnail currently in
the related-images row; the main gallery grid is deliberately
left untouched.

## `// see filterGallery()'s own shinyFilterMatch. Harmless to call`

Applies (or clears) the shiny-only gallery filter to match --
see filterGallery()'s own shinyFilterMatch. Harmless to call
unconditionally even when showShiny hasn't actually changed
(e.g. openImageViewer carrying the same state over onto a
new image); it's a fast re-derive from current state, not an
expensive operation.

## `// currently showing out, and only once that's actually finished`

Sequences the scrolling-tile swap: fades whichever tile is
currently showing out, and only once that's actually finished
fades the other one in -- rather than crossfading both at once
-- per the "one pattern should fully fade out before the other
fades in" request. Only ever called from a genuine toggle click
(see shinyToggleBtn's listener below), never from
openImageViewer's own calls to setShinyShowing, since switching
images while the toggle's state doesn't change shouldn't replay
this animation.

## `// while the viewer's already open leaves the panels exactly`

Mobile only, and only on a fresh open (switching images
while the viewer's already open leaves the panels exactly
where this already put them). Retracts the nav panels off-
screen via the same nav-visible transition used for
desktop's own hover show/hide, rather than an instant
visibility:hidden pop -- timed to play out alongside the
tap-pulse on the card below (600ms) so the two motions read
as one. Once genuinely off-screen (300ms, matching that
transition), .nav-panel-gpu-paused takes over to free up
compositing budget for #image-overlay's own heavy layer
promotion just as it's about to need it -- same reasoning
as before, just delayed until there's actually nothing left
to see by pausing.

## `// image. Already open (prev/next, a related-image pick):`

Fresh open (viewer was closed): always start on the regular
image. Already open (prev/next, a related-image pick):
carry the current toggle state over onto the new image
instead of resetting it -- setShinyShowing still needs to
run either way, since activeGalleryImg just changed and the
overlay image needs to be pointed at whichever src is
currently active for it.

## `// switch to -- but only while shiny mode is currently off. If`

Disables the toggle whenever this entry has no shiny art to
switch to -- but only while shiny mode is currently off. If
shiny was already on (carried over above) and navigation
landed on a no-shiny entry, the toggle deliberately stays on
(see setShinyShowing's gold-background comment) and usable,
so the person can still switch it back off; disabling here
too would otherwise strand them in shiny mode with no way
out until they reach an entry that does have shiny art.

## `// just-tapped card in place -- it's already in view, so no`

On a fresh mobile open (viewer currently closed), pulse the
just-tapped card in place -- it's already in view, so no
scroll needed alongside it -- and lock out further gallery
clicks until that settles. This also naturally covers the
pre-existing "still mid-pulse from a recent close" case
below: calling pulseAttention here always resets
pulseSettleAt to *this* pulse's own end time, which is
never earlier than any leftover one.

## `// while the card just closed onto is still mid-pulse from`

On mobile, a fresh open (panel currently closed) can land
while the card just closed onto is still mid-pulse from
closeImageViewer's own recenter-and-pulse. That pulse is a
transform-based CSS animation on a gallery card, running at
the exact same moment #image-overlay would otherwise start
its own transform-based slide-in -- two independent
compositor animations competing for the same paint/composite
budget, which is what was showing up as the gallery flashing
through mid-open. Waiting for the pulse to actually finish
before starting the visible open removes that overlap
instead of just hoping it resolves in time. Not needed when
switching images with the panel already open (nothing pulses
until *after* that switch completes), and not needed on
desktop (panel docks beside the gallery rather than
fullscreen over it, so there's much less competing paint to
begin with).

## `// space, so the gallery grid is visible and already`

Desktop: panel docks left and never covers vertical
space, so the gallery grid is visible and already
has real, on-screen dimensions for anything the
*previous* image's neighborhood ever rendered --
gives a false sense that "nothing is reflowing"
holds here the way the comment two calls down
(the actual moving-panel case) means it. It
doesn't hold for a large jump: related images can
link to a card hundreds of rows away that's never
been rendered at all, still sitting at
content-visibility:auto's contain-intrinsic-size
placeholder (see .image-card's own comment). A
one-shot scroll computed once, up front, targets a
position based on that placeholder guess for
every unrendered row between here and there --
and as the scroll actually passes through that
stretch, each of those cards gets promoted to its
real (on this grid, larger) size, growing the
document out from under a target that was already
fixed. That's what was producing the overshoot
some jumps had, but not others: a short hop
between two already-rendered cards had nothing to
grow, so the one-shot math was already correct by
construction, and a repeat of the same long jump
was correct too, since by then every card along
the path had already been promoted once and
contain-intrinsic-size's auto keyword remembers
real measured size after that. trackImageIntoView
re-measures every frame instead of once, so it
keeps correcting toward bandScrollDelta's actual,
current target as the document grows mid-scroll,
rather than committing to a stale one up front.
skipPulse: true -- this branch already fires its
own pulse unconditionally and immediately below,
same as it did with the old one-shot scroll.

## `// so the gallery is never visible behind it -- no need to`

Mobile: the panel is fullscreen the whole time it's open,
so the gallery is never visible behind it -- no need to
scroll it at all here. (It gets recentered once on close,
in closeImageViewer below, which is the only moment on
mobile where the gallery's scroll position is actually
seen.)
Pulse right away regardless of whether anything actually
needed to scroll — tapping a different thumbnail should
always give a bit of tactile feedback that the magnified
view updated.

## `// underneath is genuinely hidden -- lock scrolling,`

Mobile: panel is full-screen, so the gallery
underneath is genuinely hidden -- lock scrolling,
same as the filter panel does. Without this, the
gallery was still genuinely scrollable underneath
the whole time the viewer was open: not just from
our own trackImageIntoView calls (already removed
above), but from anything -- leftover momentum
scrolling from whatever fling gesture was still in
flight when the image was tapped, or just the
viewer-open padding-top transition's own reflow.
pageScrollLock pins body with position:fixed, which
is what actually blocks all of that on iOS/Android,
not just the scrolling our own code was doing.

## `// for the duration of the close. filterGallery() a few lines`

Locks the *entire* gallery -- not just the cards on-screen --
for the duration of the close. filterGallery() a few lines
down (and possibly other work in here) does a synchronous,
whole-document pass over every .image-card; with hundreds of
them sitting at content-visibility:auto, that pass can force
the browser to reconcile all of their skipped layout/paint
state in one synchronous burst, landing in the same tick the
overlay's own close transform is kicking off below. That
reconciliation is what was actually producing the
multi-card, in-sync "flash white" -- confirmed by testing
with content-visibility: auto removed entirely (fixes it,
but costs the memory savings it's there for) and by
force-locking the whole gallery for this same window (also
fixes it, without giving up the memory savings the rest of
the time). This is intentionally separate from -- and
stacked on top of, via the ref-counted lock -- the
narrower on-screen-only lock taken in openImageViewer, so
it only costs the temporary memory hit during this one
transition rather than for the whole time the viewer's open.

## `// just-closed gallery card's .active-in-viewer (which is what`

Un-pausing the nav panels' compositing and dropping the
just-closed gallery card's .active-in-viewer (which is what
actually demotes its will-change: filter layer -- see that
class's own comment) each promote or demote a GPU layer of
their own, same as the overlay's slide-away above. Doing
that too soon after kicking off the overlay's own transform
competes with the overlay's still-forming layer for
compositor work -- see NAV_UNPAUSE_DEFER_MS's own comment
for why a single frame wasn't enough headroom. Neither of
these needs to land any sooner than that. The nav panels
don't actually reveal until later in this function anyway
(or on the branch below, which now waits on this same
timer), and the gallery card stays hidden behind the
overlay for most of its 0.35s slide regardless of exactly
when its filter layer drops.

## `// transition to finish before letting these cards go back to`

Gives the reveal the full length of the overlay's own close
transition to finish before letting these cards go back to
being skip-render-eligible -- see
.image-card.content-visibility-lock's own comment.
unlockCards is reference-counted, so this is safe even if a
reopen in the meantime has already re-locked some of the
same cards for a new session -- see its own comment.

+100ms on top of VIEWER_TRANSITION_MS: the overlay's own
translateY(-100%) close animation uncovers the screen from
the bottom up (its bottom edge is what recedes, from H down
to 0), so the top strip -- nav-panel-top and row 0 of the
gallery -- stays covered for virtually the entire transition
and only gets exposed right as VIEWER_TRANSITION_MS elapses.
Every other row gets a real head start before its lock is
released; row 0 was getting none, landing its unlock in the
same instant it first became visible and reintroducing the
exact "flashing white" bug this lock exists to prevent --
just for the one row the overlay reveals last. This buffer
gives row 0 the same kind of cushion the rest of the grid
already had.

## `// in the first place (see lockCardsInView) -- nothing to`

Only the on-screen set ever got .gallery-layer-promoted
in the first place (see lockCardsInView) -- nothing to
release here for cardsLockedForClose. No pulse-specific
exclusion needed any more either -- mobile close no
longer pulses at all (see the recenter call further
down), so there's no animation left on any on-screen
card that this release could land in the middle of.

## `// is also what makes desktop's pulse afterward land in a`

Always re-center on close, on both mobile and desktop -- this
is also what makes desktop's pulse afterward land in a
consistent, predictable spot rather than only sometimes
appearing.

On mobile this now runs after a short delay (
MOBILE_RECENTER_DELAY_MS) rather than at the same instant as
everything above, for two independent reasons that happen to
land on the same number: the gallery no longer moves at all
while the panel is open (see body.viewer-open's padding-top
above), so this recenter is usually a short distance -- and a
short scroll landing in the very same instant the panel
starts sliding away reads as an abrupt little jerk, since
there's nothing else happening yet to visually cover it,
whereas waiting until roughly when the panel's own 0.35s
slide-away has finished lets the scroll happen once the
panel's mostly out of the way. Separately, and just as
important -- see MOBILE_RECENTER_DELAY_MS's own comment --
starting any earlier would run part of the recenter's
per-frame layout/paint work while lockAllCards() still has
the whole gallery forced fully rendered, which was dropping
frames in the scroll itself.
Desktop doesn't need this: the gallery is already visible
and reflowing the whole time (padding-left), so the recenter
reads as a continuation of motion that's already happening,
not a sudden isolated jerk, and desktop's close never uses
lockAllCards() in the first place.

## `// a handful of cards on screen, and closing always`

skipPulse: true here -- on mobile there are only ever
a handful of cards on screen, and closing always
recenters straight to the middle, so the pulse's job
of drawing the eye back to the right card wasn't
earning its keep any more; it was also the thing
behind an intermittent stutter that a card needing
little or no recentering scroll was especially prone
to (it sits fully idle for the whole recenter window,
with nothing else happening nearby to cover a
promote/demote race right as the pulse tried to
start). Desktop keeps the pulse -- see the branch
above and its own comment for why it's still needed
there.

## `// as the recenter above finishes (MOBILE_RECENTER_`

Nav panels slide back into view timed to land right
as the recenter above finishes (MOBILE_RECENTER_
DELAY_MS plus the PANEL_TRANSITION_MS scroll duration
trackImageIntoView takes) -- so the reveal reads as
the natural next beat after the image settles,
instead of an instant pop while it's still moving.

## `// recenter/pulse on -- nothing to sync the reveal with, so`

Viewer was open but there's no previously-active image to
recenter/pulse on -- nothing to sync the reveal with, so
just bring the panels back as soon as possible. That's
NAV_UNPAUSE_DEFER_MS rather than truly immediately now --
adding nav-visible any sooner would start the panel's
transform transition while it's still .nav-panel-gpu-
paused (visibility: hidden), so un-hiding it moments
later would reveal it already partway through its
slide-in instead of starting from the beginning.

## `// gallery's own listener below (empty gallery background = click`

Closing on an "outside" click is handled entirely by the
gallery's own listener below (empty gallery background = click
outside the panel). There used to also be a listener here on
#image-overlay itself, closing on any click that wasn't
specifically the image or nav/close buttons — but since the
panel now has real interactive sections of its own (toggle row,
General Information, Evolution Chain), that caught clicks on
their empty background too, closing the whole viewer when
clicking blank space *inside* the panel rather than outside it.
Removed rather than special-cased further, since closing on
outside-click was never meant to reach inside the panel at all.

## `// bare body, or the transparent/edge slivers of a gallery image`

Clicking genuinely empty space — the gallery's own background,
bare body, or the transparent/edge slivers of a gallery image
(see attachImageEvents) — closes whichever of these happens to
be open. All four close functions already no-op safely if their
panel isn't open, so it's fine to call them all unconditionally
rather than tracking which one to target.

Desktop only: every panel (filter, sounds, discord, game, image
viewer) is fullscreen on mobile now, so there's no gallery
background left exposed to click on while one's open in the
first place — this would just be a no-op there regardless, but
skipping it explicitly is clearer than relying on that being
true by accident.

## `// the magnify panel if it's open. Guarded by`

Clicking empty space in the gallery (not on a card/image) closes
the magnify panel if it's open. Guarded by
outsideClickDragOriginatedInPanel: a click-and-drag to
highlight text inside the search box (or anywhere else in
#filter-panel) that happens to release over the gallery still
fires a native 'click' here targeting the gallery -- without
the guard that would close the panel out from under someone
who was only ever trying to select text, not click away from
it. See that flag's own comment below for how it's tracked.

## `// openGalleryTeamAddConfirm()/closeGalleryTeamAddConfirm()/`

Gallery-side half of the team-add flow -- see
openGalleryTeamAddConfirm()/closeGalleryTeamAddConfirm()/
confirmTeamAddSelection() and beginTeamAddMode() above. A
separate listener rather than folding into #game-scroll's own
delegated one, same reasoning as every other overlay in this
doc that isn't a #game-scroll descendant -- this one especially
so, since #game-scroll (and the whole game panel it lives in)
is closed the entire time this overlay's ever relevant.
Backdrop click and "Don't Add a Pokémon." both go through
exitTeamAddMode() (full cancel, leaves add mode entirely);
"Keep Searching for a Pokémon." goes through
closeGalleryTeamAddConfirm() alone instead, on purpose (see
its own comment).

## `// own image between teamAddCandidateImg's regular and shiny art`

Live preview -- toggling the checkbox swaps the confirm card's
own image between teamAddCandidateImg's regular and shiny art
immediately, same idea as setShinyShowing() elsewhere, so the
person can actually see what they're about to add before
committing to it rather than finding out after the fact back
on the Team Tracker grid.

## `// gallery's own box — but the reflow math that reserves space for`

The listener above only ever fires for clicks landing inside
gallery's own box — but the reflow math that reserves space for
the docked panel (body's padding-left on desktop, padding-top on
mobile) is a separate calc() expression from the panel's own
width/height formula. The two are meant to match exactly, but
being resolved independently they can drift by a pixel or two,
leaving a thin seam where neither the panel nor the gallery
actually covers — body's own background shows through there
instead, and a click on it never reaches the gallery listener
since gallery isn't an ancestor of body. Catching a direct click
on body itself closes the panel from that seam too, without
needing to chase down and eliminate every such rounding gap.
See gallery's own click listener above for why this is guarded
by outsideClickDragOriginatedInPanel too -- a drag-select
released over this same body seam is just as capable of
triggering a spurious click here as it is over the gallery
itself.

## `// permanently open instead (see applyNavPanelResponsiveMode()`

Nav panel show/hide -- desktop only. On mobile the panels stay
permanently open instead (see applyNavPanelResponsiveMode()
below) -- no trigger zones, no hover, no outside-click-close, no
timeout, since there's nothing to reveal or dismiss there
anymore. On desktop the panels rest in the PEEK state (see
.nav-peek in CSS) rather than fully off-screen, until triggered
by a click on the edge trigger zones or the panels themselves,
then close again (back to PEEK, not off-screen) on a click
outside both panels, or after the mouse has been away from both
trigger zones and both panels for 0.5 uninterrupted seconds.

Two states rather than a plain on/off toggle: PEEK (just
--nav-peek-amount of the panel showing -- desktop's permanent
resting state, so the nav is always at least partially visible)
and OPEN (the full .nav-visible pop-out, entered only by an
explicit click while peeking/hovering -- the deliberate action
that upgrades "just glancing at the edge" into "actually wants
the nav"). Hovering away from OPEN retracts back to PEEK rather
than disappearing off-screen the way HIDDEN used to.

## `// state, where the whole panel (buttons included) is meant to`

navPanelTop/Bottom themselves stay in here for the OPEN
state, where the whole panel (buttons included) is meant to
be fully hoverable -- see the panel/.nav-button
pointer-events rules in CSS. While only peeking, those two
are inert everywhere except their own .nav-hot-zone child,
which is what actually narrows the hover/click surface down
to the middle NAV_HOT_ZONE_FRACTION for that state.

## `// "Nav panel transparent-pixel click/hover-through"`

The transparent-pixel click-through system (see the
"Nav panel transparent-pixel click/hover-through"
script) sets pointer-events directly as an inline
style while open, which -- being inline -- would
otherwise permanently outrank the CSS rules that are
supposed to govern peeking (panel inert except for
.nav-hot-zone). Clearing it here lets those rules
take back over the moment OPEN ends.

## `// the peek (or keeps a full OPEN state alive); leaving any of`

Hovering either trigger strip or either panel opens/holds
the peek (or keeps a full OPEN state alive); leaving any of
them starts the 0.5s countdown back to PEEK, which the
next enter (e.g. moving straight from the trigger zone into
the peeking sliver of the panel itself) cancels before it
fires. Clicking while peeking (or while hovering at all)
promotes straight to the full OPEN pop-out -- that's the
one thing that's an explicit "yes, I want this open" rather
than just a passing hover. These listeners are harmless on
mobile (no real hover there, and retractNavPanelsNow()
itself refuses to actually retract anything while the
mobile breakpoint is active anyway).

.nav-hot-zone is a SIBLING of the .nav-button elements
(both children of the same panel), not their ancestor --
and the buttons paint on top of it since they come later in
the DOM. So the moment the cursor moves off the hot-zone
and onto a button sitting over it, the browser's hit-test
target genuinely changes from the hot-zone to the button,
and since the button isn't a descendant of the hot-zone,
that's a real "leave" as far as the hot-zone's own
mouseleave is concerned -- even though the cursor never
actually left the navbar. That's what was firing the
retract countdown the instant a button was hovered.
Checking relatedTarget here -- and skipping the countdown
whenever the cursor is headed to another part of the same
nav system (a button, the other trigger/hot-zone, the panel
itself) -- treats that as still "inside" rather than a
genuine exit.

## `// of the countdown; a no-op on mobile since retractNavPanelsNow()`

Outside click/tap retracts immediately on desktop, regardless
of the countdown; a no-op on mobile since retractNavPanelsNow()
itself refuses. Capture phase so this still fires even if
something inside the panels later stops propagation for its
own click handling. Only fires while genuinely OPEN -- a
click that's merely promoting a PEEK to OPEN (handled by
the per-target listener above) shouldn't also get treated
as an outside click on the same event.

## `// are permanently open there -- just force them visible.`

Mobile: no drag-to-reveal needed anymore since the panels
are permanently open there -- just force them visible.
Desktop: rest at PEEK (rather than doing nothing and
relying on CSS's off-screen default) so the panels are
always at least partially visible there, unless a full OPEN
is already underway. Reacts live to desktopFilterQuery (the
same min-width: 664px query already driving the filter
panel's own desktop/mobile reconciliation elsewhere), so
resizing across it doesn't need a reload.

## `// than living in that panel's own script section above) since it`

Game panel's own initial render -- deferred to here (rather
than living in that panel's own script section above) since it
reaches into GAME_STAGE_ORDER/MUSIC_REGION_LABELS/etc., which
the Sounds panel's script declares with const partway through
this same file. Everything this file declares is guaranteed
initialized by this point, so it's safe here regardless of
which section originally defined it.
buildMatchupSelects() has no such dependency and could run
earlier, but has to run before this refreshGameUI() call
regardless -- renderMatchupPanel() (called from inside it)
queries the <select>s this populates, and finds nothing to
update if they don't exist yet. buildMatchupChartTable() is
here for the exact same reason: renderMatchupPanel() also
calls syncMatchupChartImmunityCells(), which queries this
table's own cells.

## `// active -- previously "Your Saves"/"Your Joined Games" opened`

Both start closed on load now regardless of whether a save is
active -- previously "Your Saves"/"Your Joined Games" opened
automatically when nothing was loaded yet, but that got in the
way more than it helped once there could be several saves
between the two sections. Manual toggling (see the header
click handlers below) and the existing auto-collapse-on-
create/load and auto-reopen-on-delete behavior elsewhere in
the script are unaffected -- this only changes the very first
paint.

## `//`

---- Back-button guard ------------------------------------------

Pressing the browser's/phone's Back button on the app's first
page would close the PWA outright, which is easy to do by
accident mid-game. So the app keeps one extra history entry
above its real one: Back lands on the real entry, popstate
fires, and instead of letting that stand we re-add the extra
entry and ask first. "Stay" just dismisses; "Leave" lets the
next Back through.

- Armed on the FIRST user gesture, not at load: Chrome skips
history entries a page adds without any user interaction
(its history-manipulation intervention), so an entry pushed
at load wouldn't actually catch the Back press.
- Only on touch devices or an installed (standalone) app, so a
normal desktop tab's Back button keeps working as usual.
- Browsers give pages no way to close themselves, so "Leave"
steps back out of the app's history and tries window.close();
where that's not permitted (most installed apps on iOS, for
one), it says to press Back once more -- the guard is off by
then, so that press goes straight through.

## `// lobbyJoinUrl() and GAME_PANEL_NOTES.md §3) -- scanning the`

Other half of the Multiplayer Lobby's QR idea (see
lobbyJoinUrl() and GAME_PANEL_NOTES.md §3) -- scanning the
host's code should open straight to a pre-filled Join card,
not silently connect on its own. resetGameScreen() above
always lands on 'main' first; this runs after it specifically
so the override sticks.
