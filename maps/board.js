/* board.js -- virtual game board for the Pokédex companion app.
   BoardMap.mount(container, options) -> controller
   options: mode 'mock' (default, standalone demo) | 'host' | 'guest'
            send(msg)            -- host/guest: transmit a message over the lobby connection
            players              -- [{id,name,c}]   playerId (guest mode)
            getPools(colors)     -- optional: {color:[pokemon names]} for the pools
            noSample, backHref
            tokenArt(name)       -- optional: URL or ordered URL list of the large picture shown when a thumbnail is tapped
                                    (falls back to the thumbnail's own URLs); tapping again, anywhere, or Esc closes it
            tokenImage(name)     -- optional: a face-up Pokémon left on a space is drawn as a picture. Return a URL, or an ordered
                                    list of URLs to try (the first that loads is used); if none load, the name is written instead
            showMarkers          -- default true; false draws no space shapes, labels, text, paths or lock icons (the map art
                                    carries them) -- only player tokens, home markers and the yellow drop highlight
            spawnBypass(spawn,player) -- true when this player may walk through a Pokémon gate (a boss space) as normal, e.g. holding the Poké Flute for Snorlax; asked on the device that is moving
            onLanding(info)      -- host/solo: a player's move ended; info = {player,space,kind,token,boss,alsoHere [names of the other players on the space],alsoHereIds [the same players as {id,name}],homeOptions}
                                    kind 'catch' = a wild Pokémon is here and NOT yet revealed (token is null unless it was
                                    already face-up); the player answers with message {type:'board-encounter'} to reveal it,
                                    which comes back as kind 'encounter' (token revealed)
            onPlace(playerId)    -- this device's player picked a marker up and put it down (any drop that was dragged, even back on the same space)
            onDraw()             -- the board was just redrawn (the app uses it to show/hide buttons that depend on where a marker is)
            onView({above,below}) -- the view moved or zoomed: px of map lying above / below the frame's visible area (negative = empty space between the
                                    map's edge and the frame's edge). The app uses it to move its button stacks between the top and bottom corners
            checkpointImages     -- optional {set,clear}: picture URLs for the Set / Clear checkpoint button (otherwise it is a text button)
            onTravel(playerId, path) -- this device's player dropped their marker after walking: path = the space ids walked, start to end
            onAction(id, action) -- the player pressed a button shown with ctrl.showAction({text,buttons:[{id,label}]})
            (host/guest) playerId = the one token this device may move; omit it for a display-only host
   loadBoard(editorJson, {style:'condensed'|'full'}) picks which map of the export to use; the export's
   circleScale sizes every round space (Catch 'Em and Event alike), and a space flagged start is where everyone begins.
   controller: resolveEncounter(spaceId,'caught'|'defeated'|'abandon'), showAction(a), hideAction(),
               loadBoard(editorJson), setImage(url), handleMessage(msg),
               resend(), restoreSnapshot(snapString, [{id,c}]) [host: resume a game from a previous host's last board-state; players matched by color c], fit(), restoreView() [until the player zooms by hand: fills the frame's height; afterwards keeps the zoom; centers on this player's token], setView(v), setPlayers(list), setStatus(t), getStatus(), destroy()
   setKeepScale(on) -- on: when the frame is resized (e.g. a docked side panel opens) the map keeps the same on-screen scale and just
               shows more/less of itself, and the map is never allowed to get shorter than the frame; off (default): refit as before.
   setView('tv') makes a host display read-only with face-down Pokémon hidden.
   Host only: poolList(color) / takeFromPool(color,name) / settlePoolToken(name,'caught'|'returned') [Safari Zone: pick a token out
   of a pool, then keep it (caught) or put it back], where(playerId) [the id of the space a player's marker is on, or null -- the Host uses it to check two players really share a space], drawLegendary() [Roaming Legend: a random Legendary token from the orange pool, or off a random orange space when the pool is empty; settle it like drawFromPool()], drawFromPool(color) [Battle Frontier: take a RANDOM token out of a pool, returns its name or null; give it back with settlePoolToken(name,'returned')], movePlayer(playerId, spaceIdOrLabel|'@home') [moves a marker without a landing prompt ('@home' = their Current Home); returns the space's label, or '' if it could not], setCaught(names) [every caught form on any team], exportState() / restoreState(s) [the full state,
   for the host backup], adoptPlayer(oldId,newId) [a guest rejoined under a new connection id]
   spaceOf(playerId) -> {id,type,label} of the space that player's marker is on (any role), or null.
   Messages: guest -> host {type:'board-move',player,to,path:[the spaces walked, start to end]}   {type:'board-stay'} [host: app sends it with player id -- re-runs the landing prompt for the space the player is already on]
             guest -> host {type:'board-jump',to:<City id | '@home'>,land:<bool>} [the Dig / Fly / Teleport buttons: straight to a City, with or without its landing prompt; the app sends it with the player id]
             host -> guests {type:'board-state',snap:<JSON string>} */
(function(global){
const CSS=".bm-root{user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}\n.bm-root input,.bm-root textarea{user-select:text;-webkit-user-select:text;-webkit-touch-callout:default}\n.bm-root #mapctl{transition:transform .25s ease,opacity .2s ease}\n.bm-root.bm-dragging #mapctl{transform:translateY(calc(-100% - 24px));opacity:0;pointer-events:none}\n.bm-root #actbar{transition:opacity .15s ease}\n.bm-root.bm-dragging #actbar{opacity:0;visibility:hidden;pointer-events:none;transition:opacity .15s ease,visibility 0s .15s}\n.bm-root #cpBtn{position:absolute;left:16px;bottom:16px;z-index:6;margin:0;padding:10px 14px;box-shadow:0 1px 4px rgba(0,0,0,.35)}\n.bm-root #cpBtn[hidden]{display:none}\n.bm-root #cpBtn:disabled{opacity:.55}\n.bm-root{position:relative;--bm-bg:#eef0f4;--bm-panel:#fff;--bm-ink:#1c1c22;--bm-mut:#6b6b78;--bm-line:#d6d6de;--bm-map:#cfe8c4;display:flex;gap:8px;padding:8px;box-sizing:border-box;width:100%;height:100%;background:var(--bm-bg);color:var(--bm-ink);font:13px system-ui,sans-serif;overflow:hidden}\n@media (prefers-color-scheme:dark){.bm-root{--bm-bg:#15151a;--bm-panel:#202028;--bm-ink:#ececf1;--bm-mut:#9a9aa8;--bm-line:#34343f;--bm-map:#27402b}}\n.bm-root #bgc{position:absolute;display:none;pointer-events:none;border-radius:10px;background:var(--bm-map);z-index:0}\n.bm-root.bm-bgc #bgc{display:block}\n.bm-root.bm-bgc #b{background:transparent;position:relative;z-index:1}\n.bm-root #b{flex:1;min-width:0;max-width:100%;height:100%;box-sizing:border-box;background:var(--bm-map);border:1px solid var(--bm-line);border-radius:10px;touch-action:none}\n.bm-root aside{width:300px;display:flex;flex-direction:column;gap:8px;overflow:auto}\n.bm-root .box{background:var(--bm-panel);border:1px solid var(--bm-line);border-radius:10px;padding:8px}\n.bm-root .box[hidden]{display:none}\n.bm-root h4{margin:0 0 4px;font-size:12px}\n.bm-root button,.bm-root textarea{font:inherit;color:var(--bm-ink);background:var(--bm-bg);border:1px solid var(--bm-line);border-radius:6px;padding:4px 8px}\n.bm-root button{cursor:pointer;margin:2px 2px 0 0}\n.bm-root button.on{outline:2px solid #d03a2f}\n.bm-root #log{max-height:170px;overflow:auto;font:11px ui-monospace,monospace;color:var(--bm-mut)}\n.bm-root small{color:var(--bm-mut)}\n.bm-root #actbar{position:absolute;left:12px;right:12px;bottom:12px;z-index:5;background:var(--bm-panel);border:1px solid var(--bm-line);border-radius:10px;padding:10px;box-shadow:0 2px 10px rgba(0,0,0,.4)}\n.bm-root #actbar[hidden]{display:none}\n.bm-root #actbar.anch{left:0;top:0;right:auto;bottom:auto;padding:8px;box-sizing:border-box;border-radius:12px;background:var(--pc,var(--bm-panel));color:var(--pt,var(--bm-ink));border:2px solid #fff}\n.bm-root #actbar.anch .actin{max-height:var(--ah,none);overflow-y:auto;display:flex;flex-direction:column;gap:5px}\n.bm-root #actbar.anch .actin>div:not(.actrow){margin:0 0 2px!important;font-size:13px;line-height:1.3;white-space:pre-line}\n.bm-root #actbar .actin>div:first-child:not(.actrow){font-weight:600}\n.bm-root #actbar .actin>div.actnote{font-size:12px;font-weight:400}\n.bm-root #actbar .bs{display:inline-block;max-width:100%}\n.bm-root #actbar .actrow{display:flex;gap:4px;align-items:stretch}\n.bm-root #actbar.anch .actin .actrow>button:first-child{flex:1 1 auto;min-width:0;width:auto}\n.bm-root #actbar.anch .actin .actrow>button.actinfo{flex:0 0 auto;width:auto;padding:0 10px;font-style:italic;font-family:Georgia,serif;font-weight:700}\n.bm-root #actbar .bn{display:block;margin-top:1px;font-size:11px;font-weight:400;text-transform:none;letter-spacing:0;opacity:.85}\n.bm-root #actbar.anch .actin button{display:block;width:100%;margin:0;white-space:pre-line;text-align:center}\n.bm-root #actbar.anch::before{content:'';display:none;position:absolute;width:10px;height:10px;background:var(--pc,var(--bm-panel));border:2px solid #fff;transform:rotate(45deg)}\n.bm-root #actbar.anch.s-r::before{display:block;left:-8px;top:calc(var(--c) - 6px);border-right:0;border-top:0}\n.bm-root #actbar.anch.s-l::before{display:block;right:-8px;top:calc(var(--c) - 6px);border-left:0;border-bottom:0}\n.bm-root #actbar.anch.s-b::before{display:block;top:-8px;left:calc(var(--c) - 6px);border-right:0;border-bottom:0}\n.bm-root #actbar.anch.s-t::before{display:block;bottom:-8px;left:calc(var(--c) - 6px);border-left:0;border-top:0}\n.bm-root #mapctl{position:absolute;top:16px;left:16px;z-index:4;display:flex;gap:4px}\n.bm-root #mapctl button{margin:0;opacity:.92;box-shadow:0 1px 4px rgba(0,0,0,.35)}\n.bm-root.bm-aside-hidden aside{display:none}\n.bm-root.bm-aside-hidden #b{height:100%}\n@media(max-width:760px){.bm-root{flex-direction:column;overflow-x:hidden;overflow-y:auto}.bm-root #b{flex:0 0 auto;align-self:stretch;width:100%;height:78%}.bm-root aside{width:auto;overflow:visible;flex:0 0 auto}}.bm-root .bm-tkv{display:none;position:absolute;inset:0;z-index:6;background:rgba(0,0,0,.82);align-items:center;justify-content:center;flex-direction:column;gap:10px;padding:24px;box-sizing:border-box;cursor:pointer}.bm-root .bm-tkv.on{display:flex}.bm-root .bm-tkv img{max-width:min(92%,460px);max-height:78%;object-fit:contain}.bm-root .bm-tkv-n{color:#fff;font:600 16px system-ui,sans-serif;text-align:center}";
const HTML="<canvas id=\"bgc\"></canvas><svg id=\"b\" viewBox=\"0 0 1000 620\"></svg>\n<aside>\n <div class=\"box\" id=\"bkbox\" hidden><a id=\"bk\" href=\"#\" style=\"color:inherit\">\u2190 Back to the app</a></div>\n <div class=\"box\"><h4>View</h4><button id=\"zi\">+</button><button id=\"zo\">\u2212</button><button id=\"zf\">Fit</button> <small id=\"zl\"></small><br><small>Drag empty map to pan, pinch or scroll to zoom. Dragging a token near the edge scrolls the map.</small></div>\n <div class=\"box\"><h4>Load board</h4><button id=\"imgBtn\">Map image\u2026</button><input id=\"imgF\" type=\"file\" accept=\"image/*\" hidden> <button id=\"sb\">Sample board</button>\n  <textarea id=\"jt\" rows=\"3\" style=\"width:100%;box-sizing:border-box;margin-top:4px\" placeholder=\"Paste editor export JSON\"></textarea><button id=\"jb\">Load JSON</button><small id=\"jm\"></small></div>\n <div class=\"box\"><h4>View as</h4><div id=\"vw\"></div><small id=\"vwn\"></small></div>\n <div class=\"box\"><h4>Players (drag a token on the map)</h4><div id=\"pl\"></div><small>Mock host runs in this page; the log shows the messages that would travel over PeerJS.</small></div>\n <div class=\"box\"><h4>Prompt</h4><div id=\"pr\"><small>Move a token onto a space.</small></div><div style=\"margin-top:6px\"><button id=\"ev\">Draw Event Card (active player)</button><button id=\"lose\">Active player lost a battle</button></div><div id=\"hm\" style=\"margin-top:4px\"></div></div>\n <div class=\"box\" id=\"hostbox\"><h4>Host only: pools &amp; hidden tokens</h4><div id=\"host\"></div></div>\n <div class=\"box\" id=\"netbox\"><h4>What guests receive</h4><div id=\"leak\"></div><details><summary>Last board-state snapshot (JSON)</summary><pre id=\"snapj\" style=\"white-space:pre-wrap;word-break:break-all;font-size:10px;max-height:160px;overflow:auto\"></pre></details></div>\n <div class=\"box\" id=\"logbox\"><h4>Host log</h4><div id=\"log\"></div></div>\n</aside><div id=\"mapctl\"><button id=\"mzi\">+</button><button id=\"mzo\">&minus;</button><button id=\"mzf\">Fit</button><button id=\"mme\" title=\"Center on my marker\">Find Me</button></div><div id=\"actbar\" hidden></div>";
function mount(container,opts){
opts=opts||{};
if(!document.getElementById('bm-style')){const st=document.createElement('style');st.id='bm-style';st.textContent=CSS;document.head.appendChild(st)}
const root=document.createElement('div');root.className='bm-root';root.innerHTML=HTML;container.appendChild(root);
const editable=e=>/^(INPUT|TEXTAREA)$/.test(e.target.tagName); // text boxes keep their normal menu and selection
root.addEventListener('contextmenu',e=>{if(!editable(e))e.preventDefault()});root.addEventListener('selectstart',e=>{if(!editable(e))e.preventDefault()});
// Checkpoint button: bottom-left of the map, only while a marker is being dragged (a second finger taps it while the first holds the marker).
const cpBtn=document.createElement('button');cpBtn.id='cpBtn';cpBtn.type='button';cpBtn.className='filter-btn filter-btn-compact';cpBtn.hidden=true;cpBtn.textContent='Set checkpoint';root.appendChild(cpBtn);
// opts.checkpointImages {set, clear}: the button is a picture (class board-ability-btn, styled by the app) that swaps between Set and Clear; a picture that
// won't load falls back to the words. Greyed and dark when it can't be pressed (the app styles #cpBtn:disabled).
const cpImg=opts.checkpointImages||null;
if(cpImg){cpBtn.className='board-ability-btn cp-img';cpBtn.textContent='';cpBtn.title='Set checkpoint';cpBtn.setAttribute('aria-label','Set checkpoint');
 const im=document.createElement('img');im.alt='';im.draggable=false;im.onerror=()=>{im.remove();cpBtn.classList.add('no-img');cpBtn.textContent=cpBtn.title};im.src=cpImg.set;cpBtn.appendChild(im)}
function cpShow(top,n){const w=top?'Clear checkpoint':'Set checkpoint';
 if(!cpImg){const t=top?w+' '+n:w;if(cpBtn.textContent!==t)cpBtn.textContent=t;return}
 const t=top?w+' '+n:w;if(cpBtn.title!==t){cpBtn.title=t;cpBtn.setAttribute('aria-label',t)}
 const im=cpBtn.querySelector('img'),u=top?cpImg.clear:cpImg.set;if(im){if(im.getAttribute('src')!==u)im.src=u}else cpBtn.textContent=w}
const DWELL=1250,DWELL_QUIET=500; // total hold; the first DWELL_QUIET ms show nothing, then the ring fills over the rest
let lastWalkN=null,walkKeep=null,dragWas=false;const hasTouch=()=>{try{return navigator.maxTouchPoints>0||matchMedia('(any-pointer: coarse)').matches}catch(e){return false}};
cpBtn.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();toggleCp()});
cpBtn.addEventListener('click',e=>e.preventDefault());
const onCpKey=e=>{if(drag&&(e.code==='Space'||e.key===' ')&&!e.repeat&&!editable(e)){e.preventDefault();toggleCp()}};
document.addEventListener('keydown',onCpKey);

const mode=opts.mode||'mock',send=opts.send||(()=>{});let startId=null,pendingHome={},pendingEnc={},CS=1,ES=1;const myId=opts.playerId;const omni=()=>view==='host'&&(mode==='mock'||myId===undefined);
const $=id=>root.querySelector('#'+id),svg=$('b');
// ---------- the map picture: a tiled image pyramid painted on a canvas ----------
// A big <image> inside the SVG is decoded lazily, dropped again after a while, and re-rasterised whole on every zoom step.
// A single huge bitmap still has to be uploaded to the GPU in one piece the first time it is drawn at each zoom level, which
// shows up as a stall. So the picture is cut once into 512px tiles at several zoom levels (level k = tiles covering 2^k times
// as much of the picture, at the same 512px size). A canvas behind the SVG paints only the tiles on screen, from the level
// that is just sharp enough for the current zoom (full detail is always used when the screen can show it), over the coarsest
// level as a backdrop while finer tiles are still being made. Each tile is small, so nothing big is ever (re)uploaded
// mid-gesture. If tiles can't be made (old browser, picture can't be fetched) the SVG <image> is used exactly as before.
const bgc=$('bgc'),bctx=bgc.getContext('2d'),canBmp=typeof createImageBitmap==='function',TS=512;
let bgP=null,bgTok=0,bgRaf=0,bgOn=false,bgFail=false,bgSettle=0; // bgP = {iw,ih,K,lv:[{nx,ny,t:[]}]}, lv[0] = full detail
function bgSched(){if(bgOn&&!bgRaf)bgRaf=requestAnimationFrame(()=>bgPaint('low'));clearTimeout(bgSettle);if(bgOn)bgSettle=setTimeout(()=>{if(!bgRaf)bgPaint('medium')},200)}
function bgTiles(k,vis,pad){const P=bgP,L=P.lv[k],ux=W/P.iw,uy=H/P.ih,T=TS<<k;
 let i0=0,i1=L.nx-1,j0=0,j1=L.ny-1;
 if(vis){i0=Math.max(0,Math.floor(VX/ux/T));i1=Math.min(L.nx-1,Math.floor((VX+VW())/ux/T));j0=Math.max(0,Math.floor(VY/uy/T));j1=Math.min(L.ny-1,Math.floor((VY+VH())/uy/T))}
 for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const t=L.t[j*L.nx+i];if(!t)continue;
  const sx=i*T,sy=j*T,sw=Math.min(T,P.iw-sx),sh=Math.min(T,P.ih-sy);
  bctx.drawImage(t,sx*ux,sy*uy,sw*ux+pad,sh*uy+pad)}} // pad: each tile runs one device pixel into its neighbour so no seam shows
function bgPaint(q){bgRaf=0;if(!bgOn||!bgP)return;
 const r=svg.getBoundingClientRect(),m=svg.getScreenCTM();if(!r.width||!r.height||!m)return; // hidden (the gallery is showing): painted when shown again
 let dpr=Math.min(window.devicePixelRatio||1,3);if(r.width*r.height*dpr*dpr>6e6)dpr=Math.sqrt(6e6/(r.width*r.height));
 const cw=Math.round(r.width*dpr),ch=Math.round(r.height*dpr);
 if(bgc.width!==cw||bgc.height!==ch){bgc.width=cw;bgc.height=ch}
 {const rr=root.getBoundingClientRect(); // SVG elements have no offsetLeft/offsetWidth (those are HTMLElement-only), so size the canvas from the rects: without a CSS size it displays at its backing-store size, dpr times too big
  bgc.style.left=(r.left-rr.left-root.clientLeft+root.scrollLeft)+'px';bgc.style.top=(r.top-rr.top-root.clientTop+root.scrollTop)+'px';bgc.style.width=r.width+'px';bgc.style.height=r.height+'px'}
 const cr=bgc.getBoundingClientRect(),s=m.a*dpr,P=bgP;
 let k=0;while(k<P.K&&P.iw/W/(2<<k)>=s)k++; // the coarsest level whose tiles are still at least as sharp as the screen
 bctx.setTransform(1,0,0,1,0,0);bctx.clearRect(0,0,cw,ch);
 bctx.setTransform(m.a*dpr,0,0,m.d*dpr,(m.e-cr.left)*dpr,(m.f-cr.top)*dpr);
 bctx.imageSmoothingEnabled=true;bctx.imageSmoothingQuality=q||'low';
 const pad=1/s;bgTiles(P.K,false,pad);for(let j=P.K-1;j>=k;j--)bgTiles(j,true,pad)} // coarse -> fine, visible tiles only: any level not built yet falls back to the next-coarser one, not straight to the 512px backdrop
function bgClear(){bgTok++;clearTimeout(bgSettle);if(bgRaf){cancelAnimationFrame(bgRaf);bgRaf=0}
 if(bgP){bgP.lv.forEach(l=>l.t.forEach(b=>{try{b.close()}catch(e){}}));if(bgP.full){try{bgP.full.close()}catch(e){}}}
 bgP=null;bgOn=false;bgFail=false;root.classList.remove('bm-bgc')}
async function bgLoad(u){const tok=bgTok;if(!canBmp)return;
 try{const r=await fetch(u);if(!r.ok)throw new Error('picture '+r.status);const full=await createImageBitmap(await r.blob());
  if(tok!==bgTok||gone){full.close();return}
  const iw=full.width,ih=full.height;let K=0;while((TS<<K)<Math.max(iw,ih))K++; // the top level is one tile
  const P=bgP={iw,ih,K,full,lv:Array.from({length:K+1},(_,k)=>({nx:Math.ceil(iw/(TS<<k)),ny:Math.ceil(ih/(TS<<k)),t:[]}))};
  const mk=(k,i,j)=>{const T=TS<<k,sx=i*T,sy=j*T,sw=Math.min(T,iw-sx),sh=Math.min(T,ih-sy);
   return k?createImageBitmap(full,sx,sy,sw,sh,{resizeWidth:Math.max(1,Math.round(sw/(1<<k))),resizeHeight:Math.max(1,Math.round(sh/(1<<k))),resizeQuality:'high'}):createImageBitmap(full,sx,sy,sw,sh)};
  // build order: the top level (backdrop), then the level the current view actually needs (on a phone that is usually level 0 or 1), then the rest
  const s0=Math.min(window.devicePixelRatio||1,3)*(svg.getBoundingClientRect().width/VW());let k0=0;while(k0<K&&iw/W/(2<<k0)>=s0)k0++;
  const order=[K];if(k0<K)order.push(k0);for(let k=K-1;k>=0;k--)if(k!==k0)order.push(k);
  for(const k of order){const L=P.lv[k],T=TS<<k,ux=W/iw,uy=H/ih,cx=VX+VW()/2,cy=VY+VH()/2,jobs=[];
   for(let j=0;j<L.ny;j++)for(let i=0;i<L.nx;i++)jobs.push([i,j,Math.hypot((i+.5)*T*ux-cx,(j+.5)*T*uy-cy)]);
   jobs.sort((a,b)=>a[2]-b[2]); // tiles nearest the current view first
   for(let n=0;n<jobs.length;n+=4){
    const got=await Promise.all(jobs.slice(n,n+4).map(([i,j])=>mk(k,i,j).then(b=>[i,j,b])));
    if(tok!==bgTok||gone){got.forEach(g=>g[2].close());return}
    got.forEach(([i,j,b])=>{L.t[j*L.nx+i]=b});
    if(!bgOn&&k===K){bgOn=true;root.classList.add('bm-bgc');draw()} // the SVG <image> (if any) is no longer needed
    bgSched()}}
  full.close();P.full=null;
 }catch(e){if(tok===bgTok&&!bgOn){bgFail=true;draw()}}}
function setImg(u){img=u;bgClear();if(u)bgLoad(u);draw()}
// Tap-a-thumbnail viewer. Lives inside the board root (not the page) so it also shows in the board's fullscreen mode.
const tkv=document.createElement('div');tkv.className='bm-tkv';tkv.innerHTML='<img alt=""><div class="bm-tkv-n"></div>';root.appendChild(tkv);
function tkKey(e){if(e.key==='Escape')closeTok()}
function closeTok(){tkv.classList.remove('on');document.removeEventListener('keydown',tkKey)}
function showTok(n){let l=[];try{l=opts.tokenArt?opts.tokenArt(n):[]}catch(e){}l=(Array.isArray(l)?l:[l]).filter(Boolean);
 if(!l.length&&TKI[n])l=TKI[n].l.slice();
 const im=tkv.querySelector('img'),nm=tkv.querySelector('.bm-tkv-n');let i=0;nm.textContent=n;im.alt=n;
 im.onerror=()=>{if(++i<l.length)im.src=l[i];else im.style.display='none'};im.style.display=l.length?'':'none';if(l.length)im.src=l[0];
 tkT=Date.now();tkv.classList.add('on');document.addEventListener('keydown',tkKey)}
let tkT=0;tkv.onclick=()=>{if(Date.now()-tkT>350)closeTok()};
const COL={red:'#e03131',blue:'#2f4fd0',green:'#2f9e44',yellow:'#f5c211',orange:'#c9801f',pink:'#f08a96'};
let PL=[{id:'p1',name:'Ash',c:'#ff5252'},{id:'p2',name:'Misty',c:'#42a5f5'},{id:'p3',name:'Brock',c:'#8d6e63'}];
if(opts.players)PL=opts.players;
const SAMPLE_NAMES={red:['Charmander','Vulpix','Growlithe','Ponyta','Magmar'],blue:['Squirtle','Psyduck','Slowpoke','Staryu','Lapras'],green:['Bulbasaur','Oddish','Bellsprout','Tangela','Scyther'],yellow:['Pikachu','Sandshrew','Geodude','Onix','Diglett'],orange:['Articuno','Zapdos','Moltres','Mewtwo']};
let view='host',M={pos:{},home:{},spaces:{}},lastSnapStr='',SP=[],LK=[],W=1000,H=620,R=14,K=1,NAMES={},img=null,active='p1',pos={},home={},pools={},st={},drag=null,sync=0;
let entry={};const curEntry=()=>mode==='guest'?(M.entry||{}):entry;const curPos=()=>mode==='guest'?M.pos:pos;const curHome=()=>mode==='guest'?(M.home||{}):home;
const get=id=>SP.find(s=>s.id===id),shuf=a=>{for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a};
const log=t=>$('log').insertAdjacentHTML('afterbegin',`<div>${t}</div>`);
// An action is a plain text string, or an object like {type:'gym-battle',leader:'kanto-brock',label:'Gym Battle (Brock)'}.
const actLabel=a=>typeof a==='string'?a:((a&&(a.label||(a.leader?a.type+' ('+a.leader+')':a.type)))||'');
// ---------- boards ----------
function sampleBoard(){const S=[['A','city',0,90,540,'Pallet'],['B','catch','red',200,480],['C','event',0,300,430],['D','catch','red',410,450],['E','city',0,530,400,'Viridian'],['F','catch','green',610,300],['G','event',0,710,255],['H','catch','green',800,205],['I','city',0,900,110,'Cerulean'],['J','catch','blue',650,480,'','Snorlax'],['K','catch','yellow',770,530],['L','event',0,870,470],['M','catch','yellow',920,380],['N','catch','orange',950,250]]
 .map(([id,type,color,x,y,label,spawn])=>({id,type,color,x,y,label,spawn,actions:type==='city'?['Poké Mart','Pokémon Center','Gym Battle']:[]}));
 const L=[['A','B'],['B','C'],['C','D'],['D','E'],['E','F'],['F','G'],['G','H'],['H','I'],['E','J'],['J','K'],['K','L'],['L','M'],['M','N',{note:'🔒 Tier 3+'}],['N','I']];
 applyBoard({SP:S,LK:L,W:1000,H:620,R:14,names:SAMPLE_NAMES,start:'A'})}
function importBoard(d,o){const cnt=k=>d.spaces.filter(s=>s.pos&&s.pos[k]).length;let m0;if(o&&o.style){if(!cnt(o.style))throw new Error('this board has no '+o.style+' map yet');m0=o.style}else m0=['condensed','full'].map(k=>[k,cnt(k)]).sort((a,b)=>b[1]-a[1])[0][0];const m=m0,asp=(d.maps&&d.maps[m]&&d.maps[m].aspect)||1.5,w=1000;
 const S=d.spaces.filter(s=>s.pos&&s.pos[m]).map(s=>({id:s.id,type:s.type,color:s.region||(s.type==='catch'?'red':null),x:s.pos[m].x*w,y:s.pos[m].y*w/asp,w:s.pos[m].w&&s.pos[m].w*w,h:s.pos[m].h&&s.pos[m].h*w/asp,label:s.label||'',spawn:s.spawn,start:!!s.start,fly:!!s.fly,actions:s.actions||[]}));
 const ids=new Set(S.map(s=>s.id)),L=d.links.filter(l=>ids.has(l[0])&&ids.has(l[1])).map(l=>[l[0],l[1],l[2]?{note:'🔒 '+(l[2].label||(l[2].type+' '+l[2].value)),gate:l[2]}:undefined]);
 const cols=[...new Set(S.filter(s=>s.type==='catch').map(s=>s.color))],names={};if(!cols.includes('orange'))cols.push('orange');
 cols.forEach(c=>{const n=S.filter(s=>s.type==='catch'&&s.color===c&&!s.spawn).length+(c==='orange'?3:4);names[c]=Array.from({length:n},(_,i)=>c[0].toUpperCase()+c.slice(1)+' '+(i+1))});
 if(opts.getPools){const ext=opts.getPools(cols);if(ext)Object.assign(names,ext)}
 const seen=new Set();if(!opts.getPools)S.filter(s=>s.spawn&&!seen.has(s.spawn)&&seen.add(s.spawn)).forEach(s=>names[s.color].push(s.spawn));
 const start=(S.find(s=>s.start)||S.find(s=>/pallet/i.test(s.label))||S.find(s=>s.type==='city')||S[0]).id;
 applyBoard({SP:S,LK:L,W:w,H:w/asp,R:w/170,names,start,cs:(d.maps&&d.maps[m]&&d.maps[m].circleScale)||1,es:1});$('jm').textContent=` Loaded ${S.length} spaces, ${L.length} links (${m} map).`}
function applyBoard(o){SP=o.SP;CS=o.cs||1;ES=o.es||1;LK=o.LK;W=o.W;H=o.H;R=o.R;K=R/14;NAMES=o.names;fitView();
 startId=o.start;pos={};home={};PL.forEach(p=>{pos[p.id]=o.start;if(get(o.start)&&get(o.start).type==='city')home[p.id]=o.start});$('log').innerHTML='';if(mode==='guest'){draw()}else{setup();snapshot()}prompt('Move a token onto a space.')}
// ---------- mock HOST ----------
function setup(){held=new Map();pools={};for(const c in NAMES)pools[c]=shuf(NAMES[c].slice());st={};
 for(const s of SP)if(s.type==='catch'){const o={empty:false,boss:!!s.spawn,cleared:false,home:s.color};
  if(s.spawn){o.token=s.spawn;o.revealed=true;let f=false;for(const c in pools){const i=pools[c].indexOf(s.spawn);if(i>=0){pools[c].splice(i,1);o.home=c;f=true;break}}if(!f){o.dup=true;log(`host: no ${s.spawn} left in the pools — created a duplicate for ${s.id}`)}}
  else{o.token=(pools[s.color]||[]).pop();if(!o.token){o.empty=true;o.revealed=true}else o.revealed=false}st[s.id]=o}
 log('host: setup — dealt face-down tokens (bosses face-up)')}
// ---------- restore: a new host picks up a game already in progress ----------
// A snapshot's player ids are the OLD host's lobby ids, which change on a handoff, so players are matched by
// color (c) instead. Hidden (face-down) tokens are never in a snapshot, so those are simply dealt again.
let restoreQ=null,owned=new Set(),boardCaught=new Set(),placed=new Set();
// Players are matched to a previous game's entries by their durable client id (cid) first -- it survives a reconnect, a
// reload and a color change -- and only then by color, and never onto a player who is known to be someone else.
function restorePlayers(){if(!restoreQ)return;const left=[],taken=new Set(placed);
 const place=(o,p,how)=>{try{console.info('[board] restore',how||'?','->',p.id,'cid',p.cid||'-','color',p.c,'pos',o.pos||'(none)')}catch(e){}taken.add(p.id);placed.add(p.id);if(o.pos&&get(o.pos))pos[p.id]=o.pos;if(o.entry&&o.entry.at===o.pos)entry[p.id]=o.entry;if(o.home&&get(o.home))home[p.id]=o.home};
 restoreQ.forEach(o=>{if(!o.cid)return;const p=PL.find(x=>!taken.has(x.id)&&x.cid===o.cid);if(p){place(o,p,'cid');o.done=true;restoreQ.forEach(q=>{if(q!==o&&q.cid===o.cid)q.done=true})}});
 restoreQ.forEach(o=>{if(o.done)return;const p=PL.find(x=>!taken.has(x.id)&&x.c===o.c&&!(x.cid&&o.cid&&x.cid!==o.cid)&&!(o.cid&&!x.cid));if(p)place(o,p,'color');else left.push(o)});
 try{if(left.length)console.info('[board] restore waiting for',left.map(o=>(o.cid||'no-cid')+'@'+(o.pos||'?')).join(', '))}catch(e){}
 restoreQ=left.length?left:null}
function restoreSnapshot(str,oldPlayers){if(mode!=='host'||!str)return false;placed=new Set();let s;try{s=JSON.parse(str)}catch(e){return false}
 if(!s||!s.spaces||!s.pos)return false;const used=new Set();
 for(const id in s.spaces){const r=s.spaces[id],o=st[id];if(!o)continue;
  o.revealed=!!r.revealed;o.empty=!!r.empty;o.boss=!!r.boss;if(!o.boss&&get(id).spawn)o.cleared=true;
  if(o.empty)o.token=null;
  else if(r.revealed&&r.token){o.token=r.token;used.add(r.token);let hc=null;for(const c in NAMES)if(NAMES[c].includes(r.token)){hc=c;break}o.home=hc||get(id).color;o.dup=!hc}}
 for(const c in pools)pools[c]=pools[c].filter(n=>!used.has(n));
 for(const id in st){const o=st[id];if(o.revealed||o.empty||!used.has(o.token))continue;const n=(pools[get(id).color]||[]).pop();if(n)o.token=n;else{o.token=null;o.empty=true;o.revealed=true}}
 sync=Math.max(sync,s.seq|0);
 restoreQ=(oldPlayers||[]).map(p=>({c:p.c,pos:s.pos[p.id],home:s.home&&s.home[p.id],entry:s.entry&&s.entry[p.id]}));
 restorePlayers();log('host: restored the board from the previous host');snapshot();return true}
// ---------- caught Pokémon, the full-state handoff, and a guest rejoining under a new id ----------
// A Pokémon on any player's team is not in the wild. The app reports every team's caught forms (the form it was
// caught as: evolving doesn't change it). setCaught() keeps those tokens out of the pools and off face-down spaces,
// and returns a token to its pool once it is no longer on anyone's team (released). A catch made on the board is
// held out until its owner's report includes it, so nothing is dealt twice in the gap.
function colorOf(n){for(const c in NAMES)if(NAMES[c].includes(n))return c;return null}
function setCaught(names){if(mode!=='host')return;const now=new Set(names||[]);
 boardCaught.forEach(t=>{if(now.has(t))boardCaught.delete(t)});
 const prev=owned;owned=new Set([...now,...boardCaught]);
 for(const c in pools)pools[c]=pools[c].filter(n=>!owned.has(n));
 for(const id in st){const o=st[id];if(!o.token||o.revealed||o.empty||!owned.has(o.token))continue;
  const n=(pools[get(id).color]||[]).pop();if(n)o.token=n;else{o.token=null;o.empty=true;o.revealed=true}}
 const onMap=new Set();for(const id in st)if(st[id].token)onMap.add(st[id].token);
 prev.forEach(n=>{if(owned.has(n)||onMap.has(n))return;const c=colorOf(n);if(c&&!pools[c].includes(n)){pools[c].push(n);shuf(pools[c])}});
 snapshot()}
// ---------- Safari Zone: a player picks a token out of a pool (host only) ----------
// A token taken is "held" -- in neither its pool nor on the map -- until the app settles it: 'caught' (it leaves the game, held
// out like any catch made on the board) or 'returned' (back in its pool, reshuffled). A token still held after 10 minutes (a
// player who left mid-attempt) goes back by itself, and exportState() writes held tokens back into their pools.
let held=new Map();
function backToPool(n){const c=colorOf(n);if(c&&!owned.has(n)&&!pools[c].includes(n)){pools[c].push(n);shuf(pools[c])}}
function releaseStale(){const now=Date.now();held.forEach((t,n)=>{if(now-t>6e5){held.delete(n);backToPool(n);log(`host: ${n} went back to its pool (Safari attempt abandoned)`)}})}
function poolList(c){if(mode!=='host'||!pools[c])return[];releaseStale();return pools[c].slice()}
function takeFromPool(c,n){if(mode!=='host'||!pools[c])return false;releaseStale();const i=pools[c].indexOf(n);if(i<0)return false;pools[c].splice(i,1);held.set(n,Date.now());log(`host: ${n} taken from the ${c} pool (Safari Zone)`);return true}
// Battle Frontier: a random token of colour c. It is held (out of the pool) for the whole Battle, so its hold is dated two hours
// ahead -- releaseStale() only gives back tokens held for more than ten minutes, which is right for a Safari attempt but would
// put a Defender back in the pool while it is still in the Arena.
function where(p){return mode==='host'&&pos[p]!==undefined?pos[p]:null}
function drawFromPool(c){if(mode!=='host'||!pools[c])return null;releaseStale();const a=pools[c];if(!a.length)return null;const n=a.splice(Math.floor(Math.random()*a.length),1)[0];held.set(n,Date.now()+72e5);log(`host: ${n} drawn from the ${c} pool (Battle Frontier)`);return n}
// Roaming Legend: a random token of the orange (Legendary) pool. When that pool is empty, one is taken off a random orange space
// instead (not one a player is standing on to encounter); that space is left empty, like a defeated Legendary's. Held like
// drawFromPool() until the app gives it back with settlePoolToken(name,'returned'|'caught'). Returns its name, or null.
function drawLegendary(){if(mode!=='host')return null;releaseStale();
 let n=drawFromPool('orange');if(n)return n;
 const busy=new Set(Object.values(pendingEnc).filter(Boolean));
 const c=SP.filter(s=>s.type==='catch'&&s.color==='orange'&&st[s.id]&&st[s.id].token&&!st[s.id].empty&&!busy.has(s.id));
 if(!c.length)return null;
 const s=c[Math.floor(Math.random()*c.length)],o=st[s.id];n=o.token;
 if(o.boss){o.boss=false;o.cleared=true}o.dup=false;o.token=null;o.empty=true;o.revealed=false;
 held.set(n,Date.now()+72e5);log(`host: ${n} taken off the orange space ${s.id} (Roaming Legend)`);snapshot();return n}
// Moves a player's marker straight to a space (an id, or its label such as 'Olivine City') with no landing prompt -- a lost Battle
// sends the player home. Returns the label of the space it landed on, or '' when nothing moved.
function movePlayer(p,target){if(mode!=='host'||pos[p]===undefined)return '';if(target==='@home')target=home[p]; // '@home' = the player's Current Home (a Black Out)
 let s=get(target);if(!s){const t=String(target||'').trim().toLowerCase();s=SP.find(x=>(x.label||'').trim().toLowerCase()===t)}if(!s)return '';const pl=PL.find(x=>x.id===p);pos[p]=s.id;delete entry[p];pendingEnc[p]=null;pendingHome[p]=[];log(`host: ${pl?pl.name:p} was moved to ${s.label||s.id}`);snapshot();return s.label||s.id}
// The player stays where they are (a 0 Movement Roll, or choosing to stay on a City): bring up that space's prompt as if they had just landed.
function stayOnSpace(p){if(mode!=='host'||pos[p]===undefined||!get(pos[p])||!PL.some(q=>q.id===p))return false;log(`host: ${PL.find(q=>q.id===p).name} stays on ${pos[p]}`);land(p,pos[p],[]);return true}
// A jump (the app's Dig / Fly / Teleport buttons): the marker goes straight to a City with no walking. to = a City's id, or '@home' (the player's
// Current Home). land: true brings up that City's prompt as if the player had just arrived; false moves them quietly. Returns true if it moved.
function hostJump(p,to,doLand){if(mode!=='host'||pos[p]===undefined||!PL.some(q=>q.id===p))return false;const id=to==='@home'?home[p]:to,s=id&&get(id);if(!s||s.type!=='city')return false;
 pendingEnc[p]=null;pendingHome[p]=[];pos[p]=s.id;delete entry[p];log(`host: ${PL.find(q=>q.id===p).name} jumped to ${s.label||s.id}${doLand?'':' (no prompt)'}`);snapshot();if(doLand)land(p,s.id,[]);return true}
function spaceOf(p){const id=(curPos()||{})[p],s=id&&get(id);return s?{id:s.id,type:s.type,label:s.label||'',gate:bossUp(s.id)}:null}
function settlePoolToken(n,out){if(mode!=='host'||!held.has(n))return false;held.delete(n);
 if(out==='caught'){boardCaught.add(n);log(`host: ${n} leaves the game (caught in the Safari Zone)`)}else{backToPool(n);log(`host: ${n} returned to its pool`)}return true}
// The host's COMPLETE state, face-down Pokémon and pools included. Never sent to the table: the app puts it in the
// host backup so a successor can resume exactly where the old host stopped.
function exportState(){if(mode!=='host')return null;const j=x=>JSON.parse(JSON.stringify(x));
 const P=j(pools);held.forEach((t,n)=>{const c=colorOf(n);if(c&&P[c]&&!P[c].includes(n))P[c].push(n)});
 return{v:1,seq:sync,spaces:j(st),pools:P,pos:j(pos),home:j(home),entry:j(entry),players:PL.map(p=>({id:p.id,c:p.c,cid:p.cid||null})),pending:j(restoreQ||[]).map(o=>({c:o.c,cid:o.cid||null,pos:o.pos,home:o.home,entry:o.entry})),owned:[...owned],boardCaught:[...boardCaught]}}
function restoreState(s){if(mode!=='host'||!s||s.v!==1||!s.spaces||!s.pools)return false;placed=new Set();
 for(const id in s.spaces){if(!st[id])continue;st[id]=Object.assign({},st[id],s.spaces[id])}
 pools=JSON.parse(JSON.stringify(s.pools));owned=new Set(s.owned||[]);boardCaught=new Set(s.boardCaught||[]);held=new Map();
 sync=Math.max(sync,s.seq|0);
 restoreQ=(s.players||[]).map(p=>({c:p.c,cid:p.cid||null,pos:s.pos&&s.pos[p.id],home:s.home&&s.home[p.id],entry:s.entry&&s.entry[p.id]})).concat((s.pending||[]).map(o=>({c:o.c,cid:o.cid||null,pos:o.pos,home:o.home,entry:o.entry})));
 restorePlayers();log('host: restored the full board (face-down Pokémon included) from the previous host');snapshot();return true}
// A guest who reconnects gets a new connection id; the app calls this with the old and new ids (matched by guestClientId).
function adoptPlayer(o,n){if(mode!=='host'||!o||!n||o===n||pos[o]===undefined)return false;
 if(restoreQ){restoreQ=restoreQ.filter(q=>q.from!==o);if(!restoreQ.length)restoreQ=null}pos[n]=pos[o];if(entry[o]){entry[n]=entry[o];delete entry[o]}placed.add(n);if(home[o]!==undefined)home[n]=home[o];delete pos[o];delete home[o];delete pendingHome[o];if(pendingEnc[o]){pendingEnc[n]=pendingEnc[o];delete pendingEnc[o]}snapshot();return true}
function snapshot(){sync++;const sp={};for(const id in st){const o=st[id];sp[id]={empty:o.empty,revealed:o.revealed,token:(o.revealed&&!o.empty)?o.token:null,boss:o.boss}}
 lastSnapStr=JSON.stringify({seq:sync,pos,home,entry,spaces:sp});if(mode==='host')send({type:'board-state',snap:lastSnapStr});log(`host → ${PL.length} guests: board-state #${sync} (${lastSnapStr.length} bytes)`);leakCheck();draw();renderHost()}
function leakCheck(){const rev=new Set(),hid=new Set();for(const id in st){const o=st[id];if(o.token)(o.revealed?rev:hid).add(o.token)}for(const c in pools)pools[c].forEach(n=>hid.add(n));rev.forEach(n=>hid.delete(n));
 const bad=[...hid].filter(n=>lastSnapStr.includes(JSON.stringify(n)));
 $('leak').innerHTML=bad.length?`<b style="color:#d03a2f">✗ LEAK: ${bad.join(', ')}</b>`:`<span style="color:#2f9e44">✓ Leak check passed</span> <small>(${hid.size} hidden names, none in the snapshot)</small>`;
 $('snapj').textContent=JSON.stringify(JSON.parse(lastSnapStr),null,1)}
function buildModel(){if(omni()){const sp={};for(const id in st){const o=st[id];sp[id]={empty:o.empty,revealed:o.revealed,token:o.token,boss:o.boss}}M={peek:true,pos,home,entry,spaces:sp}}
 else M=Object.assign({pos:{},home:{},spaces:{}},lastSnapStr?JSON.parse(lastSnapStr):{})}
function renderView(){$('vw').innerHTML=[['host','Host'],...PL.map(q=>[q.id,q.name])].map(([v,n])=>`<button class="${v===view?'on':''}" data-v="${v}">${n}</button>`).join('');
 $('vw').querySelectorAll('[data-v]').forEach(b=>b.onclick=()=>setView(b.dataset.v));
 $('vwn').textContent=view==='host'?'Sees everything, including face-down identities (italic names).':'Sees only what the host broadcasts. Can move only their own token.'}
function setView(v){view=v;if(v!=='host')active=v;const h=v==='host'?'':'none';['hostbox','logbox','ev','lose'].forEach(i=>$(i).style.display=h);renderView();draw()}
function routeCities(a,b){const adj={};for(const [x,y] of LK){(adj[x]=adj[x]||[]).push(y);(adj[y]=adj[y]||[]).push(x)}
 const prev={[a]:null},q=[a];while(q.length){const c=q.shift();if(c===b)break;for(const n of adj[c]||[])if(!(n in prev)){prev[n]=c;q.push(n)}}
 const out=[];if(!(b in prev))return out;for(let c=prev[b];c&&c!==a;c=prev[c])out.unshift(c);return out.filter(id=>get(id).type==='city')}
function setHome(p,c){const n=PL.find(x=>x.id===p).name;home[p]=c;log(`host: ${n}'s Current Home → ${get(c).label||c}`);snapshot()}
// ---- Walking: the route a marker takes, one space at a time ----
// A gate lives on a link ({type,value,label,dir} from the editor, kept as link[2].gate). It is player-specific, so the DEVICE
// that is moving its own marker asks the app (opts.gateCheck(gate,player) -> null if the player may cross, else the reason).
// dir 'ab' / 'ba' only locks the crossing in that direction (link order = the editor's s1 -> s2); 'both' locks either way.
// Pokémon gates (a space holding a preset boss) are handled below, in walkRoute.
let gmemo=new Map();
function gateBlocks(l,from,p){const g=l[2]&&l[2].gate;if(!g||!opts.gateCheck)return null;const d=g.dir||'both';if((d==='ab'&&from!==l[0])||(d==='ba'&&from!==l[1]))return null;
 if(!gmemo.has(g)){let r=null;try{r=opts.gateCheck(g,p)||null}catch(e){}gmemo.set(g,r)}return gmemo.get(g)}
function linkOf(a,b){return LK.find(x=>(x[0]===a&&x[1]===b)||(x[0]===b&&x[1]===a))}
// Shortest walk a -> b that only crosses gates player p may cross. {path:[a,...,b]} | {blocked:'reason'} | {jump:true} (no route at all: not a walk).
// A Pokémon gate is a space whose preset boss (spawn) has not been beaten or caught yet. Nobody walks PAST it (a move that reaches it ends there),
// and a player who stopped on it may only leave the way they came in (entry[p] = {at,from}, kept by the host) until the boss is gone.
// A player for whom opts.spawnBypass(spawn,p) is true (e.g. the Poké Flute for Snorlax) walks through as if it were an ordinary space.
const bossUp=id=>{const s=get(id);if(!s||!s.spawn)return false;const o=mode==='guest'?(M.spaces||{})[id]:st[id];return !!(o&&o.boss)};
function blocker(id,p){if(!bossUp(id))return null;const s=get(id),k='b:'+p+':'+s.spawn;if(!gmemo.has(k)){let r=false;try{r=!!(opts.spawnBypass&&opts.spawnBypass(s.spawn,p))}catch(e){}gmemo.set(k,r)}return gmemo.get(k)?null:s.spawn}
function entryFrom(p,id){const e=curEntry()[p];return e&&e.at===id&&curPos()[p]===id?e.from:null}
function setEntry(p,id,path){if(path&&path.length>1&&bossUp(id))entry[p]={at:id,from:path[path.length-2]};else delete entry[p]}
function walkRoute(a,b,p,ban){if(a===b)return{path:[a]};const adj={};for(const l of LK){(adj[l[0]]=adj[l[0]]||[]).push([l[1],l]);(adj[l[1]]=adj[l[1]]||[]).push([l[0],l])}
 const real=curPos()[p]===a,from=real&&blocker(a,p)?entryFrom(p,a):null; // a checkpoint is never "really" there: a move cannot go on from a gate it ended on
 const bfs=(useG,useB)=>{const prev={[a]:null},q=[a];while(q.length){const c=q.shift();if(c===b)break;
   if(useB&&(c===a?(real?false:!!blocker(a,p)):!!blocker(c,p)))continue;
   for(const [n,l] of adj[c]||[]){if(n in prev||(c===a&&n===ban)||(useG&&gateBlocks(l,c,p))||(useB&&c===a&&from&&n!==from))continue;prev[n]=c;q.push(n)}}
  if(!(b in prev))return null;const path=[];for(let c=b;c!==null;c=prev[c])path.unshift(c);return path};
 const ok=bfs(true,true);if(ok)return{path:ok};const free=bfs(false,false);if(!free)return{jump:true};
 const why=path=>{for(let i=0;i<path.length-1;i++){const c=path[i],n=path[i+1],bk=blocker(c,p);
   if(i===0&&real&&bk&&from&&n!==from)return bk+' blocks that path. You can only head back the way you came.';
   if(bk&&(i>0||!real))return bk+' blocks the way. Your move has to end on its space.';
   const g=gateBlocks(linkOf(c,n),c,p);if(g)return g}return''};
 return{blocked:why(bfs(true,false)||free)||'A locked gate is in the way.'}}
// A path a guest sent is only believed if it really is a chain of links from where the marker was to where it ended.
function validPath(path,from,to){if(!Array.isArray(path)||path.length<2||path[0]!==from||path[path.length-1]!==to||path.length>400)return false;for(let i=0;i<path.length-1;i++)if(!get(path[i])||!linkOf(path[i],path[i+1]))return false;return true}
function hostMove(p,to,path){const prev=pos[p];const ok=validPath(path,prev,to);log(`${PL.find(x=>x.id===p).name} → host: board-move ${to}${ok?' ('+(path.length-1)+' steps)':''}`);pos[p]=to;setEntry(p,to,ok?path:null);snapshot();
 land(p,to,ok?[...new Set(path.slice(1,-1))].filter(id=>id!==to&&get(id).type==='city'):routeCities(prev,to))}
function landEvent(p,id,passed,here){const s=get(id),homeOpts=[...passed.map(c=>({id:c,label:get(c).label||c,how:'passed through'})),...(s.type==='city'?[{id,label:s.label||id,how:''}]:[])].filter(o=>home[p]!==o.id);
 pendingHome[p]=homeOpts.map(o=>o.id);pendingEnc[p]=null;let kind=(s.type==='city'||s.type==='special')?s.type:s.type==='event'?'event':'none';const o=st[id];
 if(s.type==='catch'&&o){if(o.empty)kind='empty';else{kind='catch';pendingEnc[p]=id}} // nothing is revealed until the player chooses to encounter it
 opts.onLanding({player:p,space:{id:s.id,type:s.type,label:s.label,color:s.color||null,actions:s.actions||[]},kind,token:(kind==='catch'&&o.revealed)?o.token:null,boss:kind==='catch'&&o.revealed&&!!o.boss,alsoHere:here,alsoHereIds:PL.filter(q=>q.id!==p&&pos[q.id]===id).map(q=>({id:q.id,name:q.name})),homeOptions:homeOpts})}
// The player chose to encounter the wild Pokémon on the space they are standing on: only now is it revealed.
function acceptEncounter(p){const id=pendingEnc[p];if(!id||pos[p]!==id)return false;const o=st[id];if(!o||o.empty||!o.token)return false;pendingEnc[p]=null;
 if(!o.revealed){o.revealed=true;log(`host: reveal ${id} (${o.token}) to everyone`);snapshot()}
 const s=get(id);opts.onLanding({player:p,space:{id:s.id,type:s.type,label:s.label,color:s.color||null,actions:s.actions||[]},kind:'encounter',token:o.token,boss:!!o.boss,alsoHere:[],homeOptions:[]});return true}
// "Look For Other Pokémon": the face-up wild Pokémon on the player's space goes back to its pool, a different one of that color is dealt
// face-up in its place, and the encounter starts with it. (Bosses/Legendaries have a fixed Pokémon, and an empty pool leaves it as is: noOthers.)
function rerollEncounter(p){const id=pendingEnc[p];if(!id||pos[p]!==id)return false;const o=st[id];if(!o||o.empty||!o.token||o.boss||!o.revealed)return false;
 const s=get(id),c=o.home||s.color,pool=pools[c]||[],others=pool.filter(n=>n!==o.token),noOthers=!others.length;
 if(!noOthers){const n=others[Math.floor(Math.random()*others.length)],old=o.token;pool.splice(pool.indexOf(n),1);o.token=n;backToPool(old);log(`host: ${p} looked for another Pokémon on ${id}: ${old} back to the pool, ${n} dealt`);snapshot()}
 pendingEnc[p]=null;opts.onLanding({player:p,space:{id:s.id,type:s.type,label:s.label,color:s.color||null,actions:s.actions||[]},kind:'encounter',token:o.token,boss:false,noOthers,alsoHere:[],homeOptions:[]});return true}
function land(p,id,passed=[]){const s=get(id),here=PL.filter(q=>q.id!==p&&pos[q.id]===id).map(q=>q.name),name=PL.find(q=>q.id===p).name;
 if(mode==='host'&&opts.onLanding){landEvent(p,id,passed,here);return}
 let h=`<b>${name}</b> landed on <b>${s.label||s.type+' '+s.id}</b>.`;
 const hm=$('hm');hm.innerHTML='';[...passed.map(c=>[c,' (passed through)']),...(s.type==='city'?[[id,'']]:[])].filter(([c])=>home[p]!==c).forEach(([c,w])=>{const b=document.createElement('button');b.textContent=`Set Current Home: ${get(c).label||c}${w}`;b.onclick=()=>{setHome(p,c);hm.innerHTML=''};hm.appendChild(b)});
 if(here.length)h+=`<br>Also here: ${here.join(', ')} — <i>player-vs-player actions available</i>`;
 if(s.type==='city'||s.type==='special'){prompt(h+`<br>${s.actions.map(a=>`<button>${actLabel(a)}</button>`).join('')||'<small>No actions entered yet.</small>'}`);return}
 if(s.type==='event'){prompt(h+'<br>Draw an Event card?',[['Draw',()=>drawEvent(p)]]);return}
 const o=st[id];if(!o){prompt(h);return}
 if(o.empty){prompt(h+'<br><small>Empty — nothing here.</small>');return}
 if(!o.revealed){o.revealed=true;log(`host: reveal ${id} (${o.token}) to everyone`);snapshot()}
 prompt(h+`<br>Wild <b>${o.token}</b> appears${o.boss?' (boss)':''}! Battle starts at full HP.`,[['Caught',()=>resolve(id,'caught')],['Defeated',()=>resolve(id,'defeated')],['Abandon',()=>resolve(id,'abandon')]])}
function resolve(id,out){const s=get(id),o=st[id];log(`battle result on ${id}: ${out} ${o.token}`);
 if(out==='abandon'){log('host: token stays face-up on its space');prompt('Left on the map. The next visitor fights it fresh.');return}
 // A defeated token goes back to its pool -- but only AFTER the space's replacement is dealt, so the Pokémon that was
 // just defeated can't be the one dealt straight back onto the same space (dealing it from the shuffled pool afterwards could).
 let back=null;
 if(out==='defeated'){if(o.dup)log(`host: duplicate ${o.token} disappears (not returned to a pool)`);else if(!owned.has(o.token))back={c:o.home||s.color,n:o.token}}
 else{log(`host: ${o.token} leaves the game`);boardCaught.add(o.token)}
 if(o.boss){o.boss=false;o.cleared=true}o.dup=false;o.home=s.color;
 let nt=null;if(s.color!=='orange'&&pools[s.color].length)nt=pools[s.color].pop();
 // Nothing else left in this pool to deal: the defeated one stays in play on its own space rather than vanishing from the map.
 if(!nt&&back&&back.c===s.color&&s.color!=='orange'){nt=back.n;back=null;log(`host: no other ${s.color} Pokémon left — ${nt} is dealt face-down again`)}
 if(back){pools[back.c].push(back.n);shuf(pools[back.c]);log(`host: ${back.n} shuffled into ${back.c} pool`)}
 if(nt){o.token=nt;o.revealed=false;log(`host: dealt new face-down token on ${id}`)}
 else{o.empty=true;o.token=null;log(s.color==='orange'?'host: legendary space stays empty':'host: pool exhausted — space empty')}
 snapshot();prompt('Resolved.')}
const EV=['Free Potion: gain an Item card.','Team Rocket ambush: lose a turn.','LEGENDARY','Rare Candy found.'];
function drawEvent(){const c=EV[Math.random()*EV.length|0];log(`host: Event Deck draw → ${c==='LEGENDARY'?'legendary encounter':c}`);
 if(c!=='LEGENDARY'){prompt(`Event: <b>${c}</b>`);return}
 const t=(pools.orange||[]).pop();if(!t){prompt('Event: a Legendary stirs… but none remain.');return}
 renderHost();prompt(`Event: wild <b>${t}</b> (Legendary pool, no map space).`,[['Caught',()=>{log(`${t} leaves the game`);prompt('Caught!');renderHost()}],['Defeated',()=>back(t)],['Abandon',()=>back(t)]])}
function back(t){pools.orange.push(t);shuf(pools.orange);log(`host: ${t} returned to orange pool`);prompt('Returned to the pool.');renderHost()}
// ---------- UI ----------
function prompt(html,btns){const p=$('pr');p.innerHTML=html;(btns||[]).forEach(([t,f])=>{const b=document.createElement('button');b.textContent=t;b.onclick=f;p.appendChild(b)})}
function renderHost(){$('host').innerHTML=Object.keys(NAMES).map(c=>`<div><span style="color:${COL[c]}">●</span> ${c}: ${pools[c].length} in pool</div>`).join('')+
 '<small>Face-down on map: '+SP.filter(s=>st[s.id]&&st[s.id].token&&!st[s.id].revealed).map(s=>s.id+'='+st[s.id].token).join(', ')+'</small>'}
function renderPl(){$('pl').innerHTML=PL.map(q=>`<button class="${q.id===active?'on':''}" data-a="${q.id}"><span style="color:${q.c}">●</span> ${q.name} @ ${M.pos[q.id]} · 🏠 ${M.home[q.id]&&get(M.home[q.id])?(get(M.home[q.id]).label||M.home[q.id]):'—'}</button>`).join('');
 $('pl').querySelectorAll('[data-a]').forEach(b=>b.onclick=()=>{active=b.dataset.a;renderPl()})}
const dims=s=>({w:s.w||80*K,h:s.h||40*K});
function tokenXY(id){const s=get(id),here=PL.filter(q=>M.pos[q.id]===id);return q=>{const i=here.indexOf(q),n=here.length;if(n<2)return[s.x,s.y];
 if(s.type==='city'||s.type==='special'){const d=dims(s);return[s.x-d.w*.3+i*(d.w*.6/(n-1)),s.y]}
 const a=2*Math.PI*i/n-Math.PI/2;return[s.x+Math.cos(a)*R*1.3*CS,s.y+Math.sin(a)*R*1.3*CS]}}
// Token thumbnails: opts.tokenImage(name) -> URL | [URLs]. Each name is resolved once; candidates are preloaded in order
// and the first that loads is drawn. Only face-up tokens are ever looked up, so face-down identities never trigger a request.
var gone=0,TKI={},TKS=1,TKX=-.3,TKY=.3,tap=null; // TKS = picture size vs. its space. TKX/TKY = nudge as a fraction of the picture's width: TKX positive = right, negative = left; TKY positive = up, negative = down
function tokTry(n){const t=TKI[n],im=new Image();im.onload=()=>{t.ok=true;if(!gone)draw()};
 im.onerror=()=>{if(t.i+1<t.l.length){t.i++;tokTry(n)}else{t.done=true;if(!gone)draw()}};im.src=t.l[t.i]}
function tokUrl(n){if(!opts.tokenImage)return null;let t=TKI[n];
 if(!t){let l=[];try{l=opts.tokenImage(n)}catch(e){}l=Array.isArray(l)?l.filter(Boolean):(l?[l]:[]);t=TKI[n]={l,i:0,ok:false,done:!l.length};if(l.length)tokTry(n)}
 return t.ok?t.l[t.i]:null}
function tokFailed(n){const t=TKI[n];return !!t&&t.done&&!t.ok}
function xa(u){return String(u).replace(/&/g,'&amp;').replace(/"/g,'&quot;')}
function draw(){buildModel();let h=(img&&(bgFail||!canBmp))?`<image href="${img}" width="${W}" height="${H}"/>`:'';const fo=img?.72:1,sw=.36*R,sm=opts.showMarkers!==false;
 if(sm)for(const [a,b,g] of LK){const A=get(a),B=get(b);h+=`<line x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}" stroke="${g?'#ffb000':'#222'}" stroke-width="${g?sw*1.3:sw}" opacity="${img?.8:1}"${g?` stroke-dasharray="${R*.9} ${R*.5}"`:''}/>`;
  if(g){const mx=(A.x+B.x)/2,my=(A.y+B.y)/2;h+=`<circle cx="${mx}" cy="${my}" r="${R*.8}" fill="#ffb000" stroke="#000" stroke-width="${R*.1}"/><text x="${mx}" y="${my+R*.35}" text-anchor="middle" font-size="${R*.95}">🔒</text><text x="${mx}" y="${my+R*1.9}" text-anchor="middle" font-size="${R*.8}" fill="#000" stroke="#fff" stroke-width="${R*.2}" paint-order="stroke">${g.note.slice(2)}</text>`}}
 if(sm)for(const s of SP){const o=M.spaces[s.id]||(s.type==='catch'?{revealed:false,empty:false,token:null,boss:false}:undefined),e=dims(s);
  if(s.type==='city'||s.type==='special')h+=`<rect x="${s.x-e.w/2}" y="${s.y-e.h/2}" width="${e.w}" height="${e.h}" rx="${R*.3}" fill="${s.type==='city'?'#1b1b1b':'#8a8a92'}" opacity="${fo}"/><text x="${s.x}" y="${s.y+R*.35}" text-anchor="middle" fill="#fff" font-size="${R*.9}">${s.label||s.id}</text>`;
  else if(s.type==='event')h+=`<circle cx="${s.x}" cy="${s.y}" r="${R*1.5*CS}" fill="${COL[s.color]||'#f2f2f2'}" stroke="#000" stroke-width="${R*.1}" opacity="${fo}"/><text x="${s.x}" y="${s.y+R*.45}" text-anchor="middle" font-size="${R*1.3}" font-weight="700" fill="#fff" stroke="#000" stroke-width="${R*.14}" paint-order="stroke">E</text>`;
  else if(s.type==='catch'){const em=o&&o.empty;h+=`<circle cx="${s.x}" cy="${s.y}" r="${R*1.5*CS}" fill="${COL[s.color]||'#999'}" opacity="${em?.25:fo}" stroke="#000" stroke-width="${R*.1}"/>`+
   (em?`<text x="${s.x}" y="${s.y+R*.4}" text-anchor="middle" font-size="${R*1.1}">✕</text>`:o.revealed?(tokUrl(o.token)?'':`<text x="${s.x}" y="${s.y+R*.3}" text-anchor="middle" font-size="${R*.65}" fill="#fff" stroke="#000" stroke-width="${R*.12}" paint-order="stroke" font-weight="700">${o.token.slice(0,7)}</text>`):`<text x="${s.x}" y="${s.y+R*.5}" text-anchor="middle" font-size="${R*1.4}" fill="#fff" stroke="#000" stroke-width="${R*.12}" paint-order="stroke" font-weight="700">?</text>`+(M.peek&&o.token?`<text x="${s.x}" y="${s.y+R*2.5}" text-anchor="middle" font-size="${R*.7}" font-style="italic" fill="#fff" stroke="#000" stroke-width="${R*.15}" paint-order="stroke">${o.token}</text>`:''))+
   (o.boss?`<text x="${s.x+R*1.3*CS}" y="${s.y-R*CS}" font-size="${R*1.2}" fill="#ffd43b" stroke="#000" stroke-width="${R*.08}">★</text>`:'')}}
 for(const s of SP){if(s.type!=='catch')continue;const o=M.spaces[s.id];if(!o||!o.revealed||o.empty||!o.token)continue;
  const u=tokUrl(o.token),rr=R*1.5*CS*TKS;
  if(u)h+=`<g data-tk="${xa(o.token)}" style="cursor:pointer"><image href="${xa(u)}" x="${s.x-rr+rr*2*TKX}" y="${s.y-rr-rr*2*TKY}" width="${rr*2}" height="${rr*2}" preserveAspectRatio="xMidYMid meet" pointer-events="all"/></g>`;
  else if(!sm&&tokFailed(o.token))h+=`<text x="${s.x+rr*2*TKX}" y="${s.y+R*.3-rr*2*TKY}" text-anchor="middle" font-size="${R*.65}" fill="#fff" stroke="#000" stroke-width="${R*.12}" paint-order="stroke" font-weight="700" pointer-events="none">${o.token.slice(0,7)}</text>`}
 PL.forEach((q,i)=>{const c=get(M.home[q.id]);if(!c)return;const d=dims(c),cx=c.x-d.w/2+R*(.7+1.2*i),cy=c.y-d.h/2-R*.1;h+=`<polygon points="${cx},${cy-R*.55} ${cx+R*.55},${cy} ${cx+R*.55},${cy+R*.55} ${cx-R*.55},${cy+R*.55} ${cx-R*.55},${cy}" fill="${q.c}" stroke="#fff" stroke-width="${R*.12}" pointer-events="none"/>`});
 for(const q of PL){if(!get(M.pos[q.id]))continue;const [x,y]=(drag&&drag.p===q.id)?[drag.x,drag.y]:tokenXY(M.pos[q.id])(q);
  const nh=PL.filter(o=>M.pos[o.id]===M.pos[q.id]).length;
  h+=`<circle data-p="${q.id}" cx="${x}" cy="${y}" r="${nh>1?R*1.4:R*2.2}" fill="transparent" style="cursor:grab"/><circle data-p="${q.id}" cx="${x}" cy="${y}" r="${R*.95}" fill="${q.c}" stroke="#fff" stroke-width="${R*.2}" pointer-events="none"/>`}
 svg.innerHTML=h;cpSync();renderPl();try{placeAct()}catch(e){}if(opts.onDraw){try{opts.onDraw()}catch(e){}}}
const pt=e=>new DOMPoint(e.clientX,e.clientY).matrixTransform(svg.getScreenCTM().inverse());
/* autoFill: until the player zooms by hand, the view is 'fill the frame's height, centered on my marker' */let Z=1,VX=0,VY=0,relZoom=1,autoFill=true,initCentered=false;const ptrs=new Map();let pan=null,pinch=null,lastPtr=null,edgeOn=false;
let EA=1.5;const updEA=()=>{const r=svg.getBoundingClientRect();if(r.width&&r.height)EA=r.width/r.height};
let keepScale=false;
// keepScale (desktop, side panel docking) only changes how a resize is handled (the on-screen scale is kept); the minimum zoom is always 'the whole map fits', so a narrow window can still show the entire map.
const zmin=()=>Math.min(1,W/(H*EA)),VW=()=>W/Z,VH=()=>W/Z/EA,clampZ=z=>Math.min(10,Math.max(zmin(),z));
function clampView(){const w=VW(),h=VH();VX=w>=W-1e-6?(W-w)/2:Math.max(0,Math.min(W-w,VX));VY=h>=H-1e-6?(H-h)/2:Math.max(0,Math.min(H-h,VY))}
function applyView(){svg.setAttribute('viewBox',`${VX} ${VY} ${VW()} ${VH()}`);if(opts.onView){try{const k=svg.getBoundingClientRect().width/VW();opts.onView({above:VY*k,below:(H-VY-VH())*k})}catch(e){}}relZoom=Z/zmin();$('zl').textContent=(Z/zmin()).toFixed(1)+'×';bgSched();try{placeAct()}catch(e){}}
function fitView(){updEA();Z=zmin();VX=0;VY=0;clampView();applyView()}
const zfill=()=>W/(H*EA);
// Zoomed so the map fills the frame's height (the minimum zoom is still the whole map, so the player can zoom out from here), centered on the player's marker as far as the map's edges allow.
function fillView(){updEA();Z=clampZ(zfill());VY=0;const mine=myId&&M.pos&&M.pos[myId],s=mine&&get(mine);if(s){initCentered=true;centerOn(mine)}else{VX=(W-VW())/2;clampView();applyView()}}
function centerOn(id){const s=get(id);if(!s)return;VX=s.x-VW()/2;VY=s.y-VH()/2;clampView();applyView()}
function restoreView(){if(autoFill){fillView();return}updEA();Z=clampZ((relZoom||1)*zmin());VX=0;VY=0;const mine=myId&&M.pos&&M.pos[myId];if(mine&&get(mine))centerOn(mine);else{clampView();applyView()}}
function zoomAt(fx,fy,nz){autoFill=false;const ax=VX+fx*VW(),ay=VY+fy*VH();Z=clampZ(nz);VX=ax-fx*VW();VY=ay-fy*VH();clampView();applyView()}
// Find Me: zoom to 50% past the 'fill the frame's height' zoom, centered on this player's marker, with a short pulsing ring around it.
const meId=()=>myId||(mode==='mock'?active:undefined);
let pulseTm=0;
function pulseMe(){const id=meId(),q=PL.find(o=>o.id===id),sp=id&&M.pos&&M.pos[id];if(!q||!sp||!get(sp))return;const [x,y]=tokenXY(sp)(q);
 const old=svg.querySelector('#bmPulse');if(old)old.remove();clearTimeout(pulseTm);
 const ring=(w,col,op,b)=>`<circle cx="${x}" cy="${y}" r="${R}" fill="none" stroke="${col}" stroke-width="${w}" opacity="0"><animate attributeName="r" values="${R}; ${R*3.4}" dur=".8s" begin="indefinite" data-b="${b}" repeatCount="3"/><animate attributeName="opacity" values="${op}; 0" dur=".8s" begin="indefinite" data-b="${b}" repeatCount="3"/></circle>`;
 svg.insertAdjacentHTML('beforeend',`<g id="bmPulse" pointer-events="none">${ring(R*.9,'#fff',.55,0)}${ring(R*.5,q.c,.95,0)}${ring(R*.9,'#fff',.4,.25)}${ring(R*.5,q.c,.8,.25)}</g>`);
 // SMIL times are measured from when the whole SVG loaded, so a plain begin=0 only plays for a pulse made in the first moments. Start each animation explicitly instead.
 svg.querySelectorAll('#bmPulse animate').forEach(a=>{try{a.beginElementAt(+a.dataset.b||0)}catch(e){}});
 pulseTm=setTimeout(()=>{const g=svg.querySelector('#bmPulse');if(g)g.remove()},2800)}
function findMe(){const id=meId(),sp=id&&M.pos&&M.pos[id];if(!(sp&&get(sp)))return;autoFill=false;updEA();Z=clampZ(zfill()*1.5);VY=0;centerOn(sp);pulseMe()}
function startPinch(){autoFill=false;const [a,b]=[...ptrs.values()],r=svg.getBoundingClientRect();pinch={d0:Math.hypot(a.x-b.x,a.y-b.y)||1,Z0:Z,ax:VX+((a.x+b.x)/2-r.left)/r.width*VW(),ay:VY+((a.y+b.y)/2-r.top)/r.height*VH()}}
function doPinch(){const [a,b]=[...ptrs.values()],r=svg.getBoundingClientRect(),mx=((a.x+b.x)/2-r.left)/r.width,my=((a.y+b.y)/2-r.top)/r.height;
 Z=clampZ(pinch.Z0*Math.hypot(a.x-b.x,a.y-b.y)/pinch.d0);VX=pinch.ax-mx*VW();VY=pinch.ay-my*VH();clampView();applyView()}
let lastTs=0;
function edgeTick(ts){if(!drag||!lastPtr){edgeOn=false;lastTs=0;return}
 const dt=lastTs?Math.min(.05,(ts-lastTs)/1000):.016;lastTs=ts;
 const r=svg.getBoundingClientRect(),m=64,MAX=340,f=d=>{const k=Math.max(0,Math.min(1,(m-d)/m));return MAX*k*k};
 if(Z>zmin()*1.001){const dx=-f(lastPtr.x-r.left)+f(r.right-lastPtr.x),dy=-f(lastPtr.y-r.top)+f(r.bottom-lastPtr.y);
  if(dx||dy){VX+=dx*dt*VW()/r.width;VY+=dy*dt*VH()/r.height;clampView();applyView();const q=pt({clientX:lastPtr.x,clientY:lastPtr.y-drag.off});drag.x=q.x;drag.y=q.y;moveDrag()}}
 requestAnimationFrame(edgeTick)}
function nearest(q){let best=null,d=1e9;for(const s of SP){const rc=s.type==='city'||s.type==='special';let k;
  if(rc){const e2=dims(s);k=Math.hypot(Math.max(Math.abs(q.x-s.x)-e2.w/2,0),Math.max(Math.abs(q.y-s.y)-e2.h/2,0))}
  else k=Math.max(Math.hypot(q.x-s.x,q.y-s.y)-R*1.5*CS,0);
  if(k<d||(k===d&&k===0&&rc)){d=k;best=s}}
 return{best,d}}
// The walk preview drawn while a marker is held: START on the space it was picked up from (so it is never forgotten, even if the
// player changes their mind and drops it back), and, over a space it could move to, each space on the way numbered 1, 2, 3...
function spaceBox(s,col,sw,dash){const rc=s.type==='city'||s.type==='special',e=dims(s),d=dash?` stroke-dasharray="${R*.7} ${R*.5}"`:'';
 // Exactly the space's own shape (the rectangle / circle the board-editor outlines); the stroke is centred on that edge.
 return rc?`<rect x="${s.x-e.w/2}" y="${s.y-e.h/2}" width="${e.w}" height="${e.h}" rx="${R*.3}" fill="none" stroke="${col}" stroke-width="${sw}"${d}/>`
  :`<circle cx="${s.x}" cy="${s.y}" r="${R*1.5*CS}" fill="none" stroke="${col}" stroke-width="${sw}"${d}/>`}
// ---- Checkpoints: drag.cps = [{id, leg:[the walk from the previous checkpoint (or the start) to this one]}], oldest first.
// Walking on is measured from the newest checkpoint, and every locked leg is kept exactly as it was highlighted when it was placed.
const lockedOf=d=>{let l=[];for(const c of d.cps||[])l=l.length?l.concat(c.leg.slice(1)):c.leg.slice();return l};
const orgOf=d=>(d.cps&&d.cps.length)?d.cps[d.cps.length-1].id:curPos()[d.p];
const isTopCp=(d,id)=>!!(d.cps&&d.cps.length&&d.cps[d.cps.length-1].id===id);
function hoverOf(d){const n=nearest({x:d.x,y:d.y});return n.best&&n.d<R*2&&((d.cps&&d.cps.length)||n.best.id!==curPos()[d.p])?n.best:null}
// The route to a hovered space from the current origin. After a checkpoint the walk may not turn straight back onto the space it just came from, and "no route" is never a jump.
function routeOf(d,s){const org=orgOf(d);if(s.id===org)return{path:[org]};const lp=lockedOf(d),ban=lp.length>1?lp[lp.length-2]:null;
 const r=get(org)?walkRoute(org,s.id,d.p,ban):{jump:true};
 return(d.cps&&d.cps.length&&r.jump)?{blocked:'↩ No way forward from there (no turning back).'}:r}
function cpSync(){const on=!!drag,showBtn=on&&hasTouch();if(cpBtn.hidden===showBtn)cpBtn.hidden=!showBtn;if(dragWas!==on){dragWas=on;root.classList.toggle('bm-dragging',on);if(!on&&opts.onDragState){try{opts.onDragState({on:false})}catch(e){}}}
 if(on){const top=drag.hov&&isTopCp(drag,drag.hov),can=top||!!(drag.hov&&drag.r&&drag.r.path&&!drag.r.blocked&&drag.r.path.length>1);
  cpShow(top,drag.cps?drag.cps.length:0);cpBtn.disabled=!can}
 if(on&&opts.onDragState){const m=svg.getScreenCTM(),f=lastPtr;if(m){try{opts.onDragState({on:true,x:m.a*drag.x+m.e,y:m.d*drag.y+m.f,fx:f?f.x:undefined,fy:f?f.y:undefined})}catch(e){}}}
 // when a move is committed the final count is reported once more as settled, so the app can let it fade like the die
 let n=on?(drag.steps||0):null,settled=false;if(!on&&walkKeep!=null){n=walkKeep;settled=true;walkKeep=null}
 if(n!==lastWalkN||settled){lastWalkN=settled?null:n;if(opts.onWalk){try{opts.onWalk(n,settled)}catch(e){}}}}
function toggleCp(){if(!drag)return;const d=drag,cps=d.cps=d.cps||[],s=d.hov&&get(d.hov);if(!s)return;
 if(isTopCp(d,s.id))cps.pop();
 else{const r=d.r;if(!r||!r.path||r.blocked||r.path.length<2)return;cps.push({id:s.id,leg:r.path})}
 d.cool=s.id;d.dw=null;try{navigator.vibrate&&navigator.vibrate(25)}catch(e){}moveDrag()}
function dwellDraw(prog,id,top){const g=$('dwellG');if(!g)return;if(prog==null){if(g.firstChild)g.innerHTML='';return}
 const s=get(id);if(!s)return;const rc=s.type==='city'||s.type==='special',e=dims(s),pad=R*.9,col=top?'#fb7185':'#38bdf8',at=`pathLength="100" fill="none" stroke="${col}" stroke-width="${R*.5}" stroke-linecap="round" stroke-dasharray="${prog*100} 100" opacity=".95"`;
 g.innerHTML=rc?`<rect x="${s.x-e.w/2-pad}" y="${s.y-e.h/2-pad}" width="${e.w+2*pad}" height="${e.h+2*pad}" rx="${R*.8}" ${at}/>`:`<circle cx="${s.x}" cy="${s.y}" r="${R*1.5*CS+pad}" ${at}/>`}
// Holding the marker still over a space for about a second sets a checkpoint there (or clears it, if it is the newest one).
function dwellSync(d,s){const id=s&&s.id;if(d.cool&&d.cool!==id)d.cool=null;
 const ok=id&&d.cool!==id&&(isTopCp(d,id)||(d.r&&d.r.path&&!d.r.blocked&&d.r.path.length>1));
 if(!ok){d.dw=null;return}const p=lastPtr||{x:0,y:0};
 if(!d.dw||d.dw.id!==id||Math.hypot(p.x-d.dw.px,p.y-d.dw.py)>14)d.dw={id,t0:performance.now(),px:p.x,py:p.y}}
function dwellTick(d){if(drag!==d)return;const w=d.dw;
 if(w){const t=performance.now()-w.t0;if(t>=DWELL){dwellDraw(null);toggleCp()}else if(t<DWELL_QUIET)dwellDraw(null);else dwellDraw((t-DWELL_QUIET)/(DWELL-DWELL_QUIET),w.id,isTopCp(d,w.id))}else dwellDraw(null);
 requestAnimationFrame(()=>dwellTick(d))}
// The walk preview drawn while a marker is held: START on the space it was picked up from (so it is never forgotten, even if the
// player changes their mind and drops it back), the locked legs (blue) and live leg (yellow) with every space on the way numbered 1, 2, 3...
// Checkpoints wear a numbered blue flag at the lower right of their space.
function spaceBox(s,col,sw,dash){const rc=s.type==='city'||s.type==='special',e=dims(s),d=dash?` stroke-dasharray="${R*.7} ${R*.5}"`:'';
 // Exactly the space's own shape (the rectangle / circle the board-editor outlines); the stroke is centred on that edge.
 return rc?`<rect x="${s.x-e.w/2}" y="${s.y-e.h/2}" width="${e.w}" height="${e.h}" rx="${R*.3}" fill="none" stroke="${col}" stroke-width="${sw}"${d}/>`
  :`<circle cx="${s.x}" cy="${s.y}" r="${R*1.5*CS}" fill="none" stroke="${col}" stroke-width="${sw}"${d}/>`}
function drawWalk(r,to){const g=$('walkG');if(!g||!drag)return;const o=get(curPos()[drag.p]);let h='';
 const rcOf=q=>q.type==='city'||q.type==='special',hw=q=>rcOf(q)?dims(q).w/2:R*1.5*CS,hh=q=>rcOf(q)?dims(q).h/2:R*1.5*CS;
 if(o){h+=spaceBox(o,'#4ade80',R*.3,true);h+=`<text x="${o.x}" y="${o.y-hh(o)-R*1.2}" text-anchor="middle" font-size="${R*1.1}" font-weight="700" fill="#4ade80" stroke="#000" stroke-width="${R*.25}" paint-order="stroke">START</text>`}
 const lp=lockedOf(drag),leg=(r&&r.path&&r.path.length>1)?r.path:null,full=lp.length?(leg?lp.concat(leg.slice(1)):lp):(leg||[]);drag.steps=Math.max(0,full.length-1);
 const poly=(ids,col)=>`<polyline points="${ids.map(id=>{const q=get(id);return q.x+','+q.y}).join(' ')}" fill="none" stroke="${col}" stroke-width="${R*.5}" stroke-linejoin="round" stroke-linecap="round" opacity=".85"/>`;
 if(lp.length>1)h+=poly(lp,'#7dd3fc');if(leg)h+=poly(leg,'#ffeb3b');
 // an outline on every space of the route (the step count itself is shown by the app, not on each space)
 full.slice(1).forEach((id,i)=>{h+=spaceBox(get(id),i===full.length-2?'#ffeb3b':'#fff',R*.25,false)});
 const seenC={};
 (drag.cps||[]).forEach((c,i)=>{const q=get(c.id),k=seenC[c.id]=(seenC[c.id]||0)+1,fx=q.x+hw(q)*.8-(k-1)*R*2,fy=q.y+hh(q)*.8,top=i===drag.cps.length-1;
  h+=`<circle cx="${fx}" cy="${fy}" r="${R*.95}" fill="#38bdf8" stroke="${top?'#fff':'#000'}" stroke-width="${R*(top?.25:.15)}"/><text x="${fx}" y="${fy+R*.4}" text-anchor="middle" font-size="${R*1.05}" font-weight="700" fill="#000">⚑${i+1}</text>`});
 if(!leg&&r&&r.blocked&&to){const q=get(to);h+=spaceBox(q,'#ff4d4d',R*.35,true);
  h+=`<text x="${q.x}" y="${q.y-R*2.8}" text-anchor="middle" font-size="${R*1.1}" font-weight="700" fill="#fff" stroke="#000" stroke-width="${R*.3}" paint-order="stroke">${r.blocked.startsWith('↩')?'':'🔒 '}${xa(r.blocked)}</text>`}
 g.innerHTML=h;cpSync()}
function moveDrag(){if(!drag)return;svg.querySelectorAll(`[data-p="${drag.p}"]`).forEach(c=>{c.setAttribute('cx',drag.x);c.setAttribute('cy',drag.y)});
 const ring=$('snapR');if(!ring)return;const s=hoverOf(drag);drag.hov=s?s.id:null;
 if(!s){drag.r=null;dwellSync(drag,null);ring.setAttribute('display','none');drawWalk(null);return}
 const r=drag.r=routeOf(drag,s);dwellSync(drag,s);drawWalk(r,s.id);ring.setAttribute('stroke',r.blocked?'#ff4d4d':'#ffeb3b');
 const rc=s.type==='city'||s.type==='special',e=dims(s),sc2=CS,w=rc?e.w:R*3*sc2,h=rc?e.h:R*3*sc2;
 ring.setAttribute('display','');ring.setAttribute('x',s.x-w/2);ring.setAttribute('y',s.y-h/2);ring.setAttribute('width',w);ring.setAttribute('height',h);ring.setAttribute('rx',rc?R*.3:R*1.5*sc2)}
function dropToken(){if(!drag.moved){drag=null;draw();return}const d=drag,q={x:d.x,y:d.y},p=d.p;drag=null;if(opts.onPlace){try{opts.onPlace(p)}catch(e){}}
 const hit=hoverOf(d);
 if(hit){const r=routeOf(d,hit),lp=lockedOf(d);
  if(r.blocked){draw();if(opts.onBlocked){try{opts.onBlocked(r.blocked,{id:hit.id,label:hit.label||''})}catch(e){}}return} // locked out: the marker goes back to where it started
  const path=lp.length?(hit.id===orgOf(d)?lp:lp.concat(r.path.slice(1))):r.path;
  walkKeep=path&&path.length>1?path.length-1:null;if(opts.onTravel&&path){try{opts.onTravel(p,path.slice())}catch(e){}}
  if(mode==='guest'){send({type:'board-move',player:p,to:hit.id,path});draw()}else hostMove(p,hit.id,path)}else draw()}
svg.onpointerdown=e=>{tap=null;svg.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(ptrs.size===2){if(drag){drag=null;draw()}pan=null;tap=null;startPinch();return}
 if(ptrs.size>2)return;
 const g=e.target.closest('[data-p]');
 if(g&&(mode==='mock'?(view==='host'||g.dataset.p===view):g.dataset.p===myId)){const off=e.pointerType==='touch'?30:0;const q0=pt({clientX:e.clientX,clientY:e.clientY-off});drag={p:g.dataset.p,id:e.pointerId,off,x:q0.x,y:q0.y}; // (spreading a DOMPoint copies nothing, which left x/y undefined until the first move)
 active=g.dataset.p;lastPtr={clientX:e.clientX,clientY:e.clientY,x:e.clientX,y:e.clientY};gmemo=new Map();draw();svg.insertAdjacentHTML('beforeend',`<rect id="snapR" display="none" fill="none" stroke="#ffeb3b" stroke-width="${R*.35}" pointer-events="none"/><g id="dwellG" pointer-events="none"></g><g id="walkG" pointer-events="none"></g>`);drag.cps=[];drawWalk(null);dwellTick(drag)}
 else{pan={id:e.pointerId,x:e.clientX,y:e.clientY};const k=e.target.closest&&e.target.closest('[data-tk]');tap=k?{id:e.pointerId,x:e.clientX,y:e.clientY,n:k.dataset.tk}:null}};
svg.onpointermove=e=>{if(!ptrs.has(e.pointerId))return;ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});if(tap&&tap.id===e.pointerId&&Math.hypot(e.clientX-tap.x,e.clientY-tap.y)>8)tap=null;
 if(pinch&&ptrs.size>=2){doPinch();return}
 if(drag&&drag.id===e.pointerId){const q=pt({clientX:e.clientX,clientY:e.clientY-drag.off});drag.x=q.x;drag.y=q.y;drag.moved=true;lastPtr={clientX:e.clientX,clientY:e.clientY,x:e.clientX,y:e.clientY};if(!edgeOn){edgeOn=true;requestAnimationFrame(edgeTick)}moveDrag();return}
 if(pan&&pan.id===e.pointerId){const r=svg.getBoundingClientRect();VX-=(e.clientX-pan.x)*VW()/r.width;VY-=(e.clientY-pan.y)*VH()/r.height;pan.x=e.clientX;pan.y=e.clientY;clampView();applyView()}};
svg.onpointerup=e=>{if(!ptrs.has(e.pointerId))return;ptrs.delete(e.pointerId);if(tap&&tap.id===e.pointerId){const n=tap.n;tap=null;showTok(n)}
 if(pinch){if(ptrs.size<2)pinch=null;return}
 if(pan&&pan.id===e.pointerId)pan=null;
 if(drag&&drag.id===e.pointerId)dropToken(e)};
svg.onpointercancel=e=>{tap=null;ptrs.delete(e.pointerId);pinch=null;pan=null;if(drag){drag=null;draw()}};
svg.addEventListener('wheel',e=>{e.preventDefault();const r=svg.getBoundingClientRect();zoomAt((e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height,Z*Math.exp(-e.deltaY*.0015))},{passive:false});
$('zi').onclick=()=>zoomAt(.5,.5,Z*1.4);$('zo').onclick=()=>zoomAt(.5,.5,Z/1.4);$('zf').onclick=()=>{autoFill=false;fitView()};$('mme').onclick=findMe;if(mode!=='mock'&&!myId)$('mme').style.display='none';$('mzi').onclick=()=>zoomAt(.5,.5,Z*1.4);$('mzo').onclick=()=>zoomAt(.5,.5,Z/1.4);$('mzf').onclick=()=>{autoFill=false;fitView()};if(mode!=='mock')root.classList.add('bm-aside-hidden');let lastRW=0,lastRH=0;
const ro=new ResizeObserver(()=>{const r=svg.getBoundingClientRect(),nw=r.width,nh=r.height;
 if(autoFill&&nw>0&&nh>0){const cx=VX+VW()/2;updEA();Z=clampZ(zfill());VX=cx-VW()/2;VY=0;lastRW=nw;lastRH=nh;clampView();applyView();return}
 if(keepScale&&lastRW>0&&lastRH>0&&nw>0&&nh>0){
  // Frame resized (a docked panel opened/closed): keep the on-screen scale (px per map unit), anchored at the view's top-left, so the map
  // keeps its size and the frame just shows more or less of it. If the map was covering the frame's height it keeps covering it.
  let s=lastRW/VW();if(H*s>=lastRH-.5&&H*s<nh)s=nh/H;
  EA=nw/nh;Z=clampZ(W*s/nw)}
 else updEA();
 lastRW=nw;lastRH=nh;clampView();applyView()});ro.observe(svg);
$('ev').onclick=()=>drawEvent();$('lose').onclick=()=>{const p=active,n=PL.find(x=>x.id===p).name,h=home[p];if(!h){prompt('No Current Home set.');return}log(`battle lost: ${n} respawns at ${h}`);pos[p]=h;snapshot();prompt(`<b>${n}</b> lost the battle and returns to <b>${get(h).label||h}</b>.`)};$('sb').onclick=()=>{setImg(null);sampleBoard()};
$('imgBtn').onclick=()=>$('imgF').click();$('imgF').onchange=e=>{const f=e.target.files[0];if(f)setImg(URL.createObjectURL(f))};
$('jb').onclick=()=>{try{importBoard(JSON.parse($('jt').value))}catch(err){$('jm').textContent=' Could not read that JSON.'}};


function showAction(a){const b=$('actbar');b.innerHTML='';const inn=document.createElement('div');inn.className='actin';const lines=String(a.text||'').split('\n'),tx=document.createElement('div');fillLabel(tx,lines[0]);tx.style.marginBottom='6px';inn.appendChild(tx);
 if(lines.length>1){const dt=document.createElement('div');dt.className='actnote';dt.textContent=lines.slice(1).join('\n');inn.appendChild(dt)}
 // a button may carry a note (shown under its label) and may be disabled: visible but not clickable, the note saying what is needed
 const addBtn=(x,host)=>{const bt=document.createElement('button');bt.className='filter-btn filter-btn-compact';fillLabel(bt,x.label);if(x.note){const sm=document.createElement('span');sm.className='bn';sm.textContent=x.note;bt.appendChild(sm)}if(x.disabled)bt.disabled=true;else bt.onclick=()=>{if(!x.keepOpen)hideAction();if(opts.onAction)opts.onAction(x.id,a)}; // keepOpen: like the "i" button, leaves the box up
  if(x.detail){ // a small "i" button on the same line: asks the app for more detail on this action; the box stays open
   const row=document.createElement('div');row.className='actrow';row.appendChild(bt);const ib=document.createElement('button');ib.className='filter-btn filter-btn-compact actinfo';ib.textContent='i';ib.title='Details';ib.setAttribute('aria-label','Details');ib.onclick=()=>{if(opts.onAction)opts.onAction(x.detail,a)};row.appendChild(ib);host.appendChild(row)}
  else host.appendChild(bt)};
 (a.buttons||[]).forEach(x=>addBtn(x,inn));
 // optional extra sections below the buttons ({header,buttons}): a white, black-bordered header, then that section's own buttons
 (a.sections||[]).forEach(sc=>{if(!sc||!(sc.buttons||[]).length)return;const sec=document.createElement('div');sec.className='actsec';if(sc.header){const hd=document.createElement('div');hd.className='actsec-head';hd.textContent=sc.header;sec.appendChild(hd)}sc.buttons.forEach(x=>addBtn(x,sec));inn.appendChild(sec)});
 b.appendChild(inn);actSide='';b.hidden=false;placeAct()}
// A "Label: rest" line may wrap right after the colon, keeping "rest" together as one unit (it only splits if it is wider than the box on its own).
function fillLabel(el,t){t=String(t==null?'':t);const m=/^([^:\n]{1,40}:)(\s*)([\s\S]+)$/.exec(t);if(!m){el.textContent=t;return}
 el.appendChild(document.createTextNode(m[1]+m[2]));const sp=document.createElement('span');sp.className='bs';sp.textContent=m[3];el.appendChild(sp)}
function hideAction(){const b=$('actbar');b.hidden=true;b.classList.remove('anch','docked','s-r','s-l','s-t','s-b');b.style.left=b.style.top=b.style.width=''}
// The prompt is a stack of buttons beside this player's marker (the bottom bar is the fallback when the marker can't be found). It is re-placed on every pan/zoom/resize/redraw, so it stays attached to the marker.
// Side order: right, else left, else below/above the marker (the last side used is tried first, so it doesn't flip back and forth). If the marker is panned off the map the stack docks at the nearest edge so its buttons stay reachable.
let actSide='';
function placeAct(){const b=$('actbar');if(!b||b.hidden)return;
 const id=meId(),q=PL.find(o=>o.id===id),sp=id&&M.pos&&M.pos[id];
 const bar=()=>{b.classList.remove('anch','docked');b.style.left=b.style.top=b.style.width='';b.style.removeProperty('--ah')};
 if(!q||!sp||!get(sp)){bar();return}
 const root=b.offsetParent;if(!root)return;const rr=root.getBoundingClientRect(),sr=svg.getBoundingClientRect(),m=svg.getScreenCTM();
 if(!m||!sr.width||!sr.height){bar();return}
 const [x,y]=tokenXY(sp)(q),G=10,gap=10,k=m.a,L=sr.left-rr.left,T=sr.top-rr.top,Rt=L+sr.width,Bt=T+sr.height;
 const cx=m.a*x+m.e-rr.left,cy=m.d*y+m.f-rr.top,on=cx>=L&&cx<=Rt&&cy>=T&&cy<=Bt;
 const ax=Math.max(L+G,Math.min(Rt-G,cx)),ay=Math.max(T+G,Math.min(Bt-G,cy)),rad=on?R*1.6*k+6:0;
 b.classList.add('anch');b.classList.toggle('docked',!on);b.style.removeProperty('--ah');b.style.setProperty('--pc',q.c);b.style.setProperty('--pt',inkOn(q.c));
 const W=Math.min(220,sr.width-2*G);b.style.width=W+'px';let h=b.offsetHeight;
 const shrink=room=>{if(h>room){b.style.setProperty('--ah',Math.max(60,room-18)+'px');h=b.offsetHeight}};
 const roomR=Rt-G-(ax+rad+gap),roomL=(ax-rad-gap)-(L+G),roomB=Bt-G-(ay+rad+gap),roomT=(ay-rad-gap)-(T+G);
 // Keep-clear zones: the app's button bars and the roll numbers ([data-actbar-avoid]). The box slides along its edge of the marker (up/down beside it,
 // left/right above or below it) to stay clear of them, and its pointer slides along the box to keep aiming at the marker.
 const AV=[];document.querySelectorAll('[data-actbar-avoid]').forEach(e=>{const r=e.getBoundingClientRect();if(!r.width||!r.height)return;AV.push({soft:e.getAttribute('data-actbar-avoid')==='soft',l:r.left-rr.left-6,t:r.top-rr.top-6,r:r.right-rr.left+6,b:r.bottom-rr.top+6})});
 // The start (in [lo,hi]) nearest to `want` for a span of `size` that overlaps none of the blocked [a,b] stretches; null if there is no room.
 const fit=(lo,hi,size,want,blk)=>{if(hi<lo)return null;const cand=[Math.max(lo,Math.min(hi,want))];blk.forEach(([a,c])=>{cand.push(a-size,c)});let best=null;
  for(const t of cand){if(t<lo-.5||t>hi+.5)continue;const tt=Math.max(lo,Math.min(hi,t));if(blk.some(([a,c])=>tt<c-.5&&tt+size>a+.5))continue;if(best===null||Math.abs(tt-want)<Math.abs(best-want))best=tt}return best};
 // The box goes on whichever side of the marker puts it NEAREST to the marker (straight-line distance from the marker to the box, x and y together),
 // after the keep-clear zones are respected. mode 2: clear of every zone; 1: clear of the hard ones only (data-actbar-avoid="soft", the roll numbers, may
 // be covered); 0: ignore them all (nothing else fits). The side used last gets a small head start so the box doesn't flip back and forth.
 const h0=h,tall=s=>(s==='r'||s==='l')?Bt-T-2*G:(s==='b'?roomB:roomT);
 const hFor=(s,real)=>{const room=tall(s);if(h0<=room)return h0;if(real){shrink(room);return h}return Math.max(78,room)}; // (an estimate while comparing: no DOM work)
 const tryPlace=(s,mode,hh)=>{const Z=mode?AV.filter(v=>mode===2||!v.soft):[];
  if(s==='r'||s==='l'){const lf=s==='r'?ax+rad+gap:ax-rad-gap-W;
   const tp=fit(T+G,Bt-G-hh,hh,ay-hh/2,Z.filter(v=>v.r>lf&&v.l<lf+W).map(v=>[v.t,v.b]));return tp===null?null:{side:s,left:lf,top:tp,c:ay-tp,h:hh}}
  const tp=s==='b'?ay+rad+gap:ay-rad-gap-hh;
  const lf=fit(L+G,Rt-G-W,W,ax-W/2,Z.filter(v=>v.b>tp&&v.t<tp+hh).map(v=>[v.l,v.r]));return lf===null?null:{side:s,left:lf,top:tp,c:ax-lf,h:hh}};
 const dist=p=>Math.hypot(Math.max(p.left-ax,0,ax-(p.left+W)),Math.max(p.top-ay,0,ay-(p.top+p.h)));
 const feas=s=>s==='r'?roomR>=W:s==='l'?roomL>=W:s==='b'?roomB>=h0:roomT>=h0;
 let sides=['r','l','b','t'].filter(feas);if(!sides.length)sides=[roomB>=roomT?'b':'t'];
 let pl=null,usedMode=0;
 for(const mode of[2,1,0]){let bd=1e9;for(const s of sides){const p=tryPlace(s,mode,hFor(s,false));if(!p)continue;const d=dist(p)-(s===actSide?12:0);if(d<bd){bd=d;pl=p}}if(pl){usedMode=mode;break}}
 const side=pl.side;pl=tryPlace(side,usedMode,hFor(side,true))||pl; // now for real: shrink the box if it has to be shorter than it wants to be
 let left=pl.left,top=pl.top,c=pl.c;
 let cs=side; // which edge carries the pointer: normally the one facing the marker; docked, it still points toward where the marker is, off the map
 if(!on){const dx=cx-(left+W/2),dy=cy-(top+h/2);if(Math.abs(dx)*h>=Math.abs(dy)*W){cs=dx<0?'r':'l';c=cy-top}else{cs=dy<0?'b':'t';c=cx-left}} // docked: the pointer stays level with (or in line with) the marker along the box's edge, however far the map is panned
 const len=(cs==='r'||cs==='l')?h:W;c=Math.max(14,Math.min(len-14,c));
 b.style.left=Math.round(left)+'px';b.style.top=Math.round(top)+'px';b.style.setProperty('--c',Math.round(c)+'px');
 b.classList.remove('s-r','s-l','s-t','s-b');b.classList.add('s-'+cs);if(on)actSide=side}
// Black or white text, whichever reads better on a player's color.
function inkOn(c){const m=/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(c||'');if(!m)return'#fff';let h=m[1];if(h.length===3)h=h.replace(/./g,'$&$&');const v=[0,2,4].map(i=>parseInt(h.substr(i,2),16)/255).map(u=>u<=.03928?u/12.92:Math.pow((u+.055)/1.055,2.4));return .2126*v[0]+.7152*v[1]+.0722*v[2]>.4?'#1c1c22':'#fff'}

if(opts.backHref){$('bk').href=opts.backHref;$('bkbox').hidden=false}
if(mode==='guest'){view=opts.playerId||PL[0].id;active=view}
if(mode!=='mock'){$('vw').parentNode.style.display='none';$('imgBtn').parentNode.style.display='none';$('hostbox').style.display='none';active=myId||(PL[0]&&PL[0].id)||active}
if(mode==='guest')setView(view);else renderView();
if(!opts.noSample&&mode!=='guest')sampleBoard();
return{
 loadBoard:importBoard,
 setImage:setImg,
 setStatus:t=>{$('jm').textContent=t},getStatus:()=>$('jm').textContent,
 handleMessage(m){if(!m)return;if(mode==='host'&&m.type==='board-move')hostMove(m.player,m.to,m.path);else if(mode==='host'&&m.type==='board-stay')stayOnSpace(m.player);else if(mode==='host'&&m.type==='board-jump')hostJump(m.player,m.to,!!m.land);else if(mode==='host'&&m.type==='board-encounter')acceptEncounter(m.player);else if(mode==='host'&&m.type==='board-reroll')rerollEncounter(m.player);else if(mode==='host'&&m.type==='board-sethome'){if((pendingHome[m.player]||[]).includes(m.city)){pendingHome[m.player]=[];setHome(m.player,m.city)}}else if(mode==='guest'&&m.type==='board-state'){lastSnapStr=m.snap;draw();if(autoFill&&!initCentered)fillView()}},
 showAction,hideAction,
 resolveEncounter(id,out){if(mode==='host'&&st[id]&&st[id].token)resolve(id,out)},
 resend(){if(mode==='host'&&lastSnapStr)send({type:'board-state',snap:lastSnapStr})},
 restoreSnapshot,
 setCaught,exportState,restoreState,adoptPlayer,
 poolList,takeFromPool,settlePoolToken,drawFromPool,drawLegendary,movePlayer,where,spaceOf,stayOnSpace,
 homeOf:p=>{const id=curHome()[p],s=id&&get(id);return s?{id:s.id,label:s.label||''}:null},
 cities:()=>SP.filter(s=>s.type==='city').map(s=>({id:s.id,label:s.label||'',fly:!!s.fly,actions:s.actions||[]})),
 fit:()=>fitView(),
 setKeepScale(on){keepScale=!!on;updEA();Z=clampZ(Z);clampView();applyView()},
 restoreView,placeAction:()=>{try{placeAct()}catch(e){}},
 setView:v=>setView(v),
 setPlayers(list){if(mode!=='guest'){const gone=PL.filter(o=>o.cid&&pos[o.id]&&!list.some(n=>n.id===o.id)&&!list.some(n=>n.cid===o.cid)&&!(restoreQ||[]).some(q=>q.cid===o.cid&&!q.done));
  if(gone.length){restoreQ=(restoreQ||[]).filter(q=>!q.done);gone.forEach(g=>restoreQ.push({c:g.c,cid:g.cid||null,pos:pos[g.id],home:home[g.id],entry:entry[g.id],from:g.id}))}}
 PL=list;if(mode!=='guest'){PL.forEach(p=>{if(!pos[p.id]&&startId){pos[p.id]=startId;if(get(startId)&&get(startId).type==='city')home[p.id]=startId}});restorePlayers();snapshot()}else draw();renderView()},
 destroy(){gone=1;document.removeEventListener('keydown',onCpKey);bgClear();closeTok();ro.disconnect();root.remove()}
};

}
global.BoardMap={mount};
})(window);
