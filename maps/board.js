/* board.js -- virtual game board for the Pokédex companion app.
   BoardMap.mount(container, options) -> controller
   options: mode 'mock' (default, standalone demo) | 'host' | 'guest'
            send(msg)            -- host/guest: transmit a message over the lobby connection
            players              -- [{id,name,c}]   playerId (guest mode)
            getPools(colors)     -- optional: {color:[pokemon names]} for the pools
            noSample, backHref
            showMarkers          -- default true; false draws no space shapes, labels, text, paths or lock icons (the map art
                                    carries them) -- only player tokens, home markers and the yellow drop highlight
            onLanding(info)      -- host/solo: a player's move ended; info = {player,space,kind,token,boss,alsoHere,homeOptions}
            onAction(id, action) -- the player pressed a button shown with ctrl.showAction({text,buttons:[{id,label}]})
            (host/guest) playerId = the one token this device may move; omit it for a display-only host
   loadBoard(editorJson, {style:'condensed'|'full'}) picks which map of the export to use; the export's
   circleScale sizes every round space (Catch 'Em and Event alike), and a space flagged start is where everyone begins.
   controller: resolveEncounter(spaceId,'caught'|'defeated'|'abandon'), showAction(a), hideAction(),
               loadBoard(editorJson), setImage(url), handleMessage(msg),
               resend(), restoreSnapshot(snapString, [{id,c}]) [host: resume a game from a previous host's last board-state; players matched by color c], fit(), restoreView() [keeps the zoom, centers on this player's token], setView(v), setPlayers(list), setStatus(t), getStatus(), destroy()
   setView('tv') makes a host display read-only with face-down Pokémon hidden.
   Host only: setCaught(names) [every caught form on any team], exportState() / restoreState(s) [the full state,
   for the host backup], adoptPlayer(oldId,newId) [a guest rejoined under a new connection id]
   Messages: guest -> host {type:'board-move',player,to}
             host -> guests {type:'board-state',snap:<JSON string>} */
(function(global){
const CSS=".bm-root{position:relative;--bm-bg:#eef0f4;--bm-panel:#fff;--bm-ink:#1c1c22;--bm-mut:#6b6b78;--bm-line:#d6d6de;--bm-map:#cfe8c4;display:flex;gap:8px;padding:8px;box-sizing:border-box;width:100%;height:100%;background:var(--bm-bg);color:var(--bm-ink);font:13px system-ui,sans-serif;overflow:hidden}\n@media (prefers-color-scheme:dark){.bm-root{--bm-bg:#15151a;--bm-panel:#202028;--bm-ink:#ececf1;--bm-mut:#9a9aa8;--bm-line:#34343f;--bm-map:#27402b}}\n.bm-root #b{flex:1;min-width:0;max-width:100%;height:100%;box-sizing:border-box;background:var(--bm-map);border:1px solid var(--bm-line);border-radius:10px;touch-action:none}\n.bm-root aside{width:300px;display:flex;flex-direction:column;gap:8px;overflow:auto}\n.bm-root .box{background:var(--bm-panel);border:1px solid var(--bm-line);border-radius:10px;padding:8px}\n.bm-root .box[hidden]{display:none}\n.bm-root h4{margin:0 0 4px;font-size:12px}\n.bm-root button,.bm-root textarea{font:inherit;color:var(--bm-ink);background:var(--bm-bg);border:1px solid var(--bm-line);border-radius:6px;padding:4px 8px}\n.bm-root button{cursor:pointer;margin:2px 2px 0 0}\n.bm-root button.on{outline:2px solid #d03a2f}\n.bm-root #log{max-height:170px;overflow:auto;font:11px ui-monospace,monospace;color:var(--bm-mut)}\n.bm-root small{color:var(--bm-mut)}\n.bm-root #actbar{position:absolute;left:12px;right:12px;bottom:12px;z-index:5;background:var(--bm-panel);border:1px solid var(--bm-line);border-radius:10px;padding:10px;box-shadow:0 2px 10px rgba(0,0,0,.4)}\n.bm-root #actbar[hidden]{display:none}\n.bm-root #mapctl{position:absolute;top:16px;left:16px;z-index:4;display:flex;gap:4px}\n.bm-root #mapctl button{margin:0;opacity:.92;box-shadow:0 1px 4px rgba(0,0,0,.35)}\n.bm-root.bm-aside-hidden aside{display:none}\n.bm-root.bm-aside-hidden #b{height:100%}\n@media(max-width:760px){.bm-root{flex-direction:column;overflow-x:hidden;overflow-y:auto}.bm-root #b{flex:0 0 auto;align-self:stretch;width:100%;height:78%}.bm-root aside{width:auto;overflow:visible;flex:0 0 auto}}";
const HTML="<svg id=\"b\" viewBox=\"0 0 1000 620\"></svg>\n<aside>\n <div class=\"box\" id=\"bkbox\" hidden><a id=\"bk\" href=\"#\" style=\"color:inherit\">\u2190 Back to the app</a></div>\n <div class=\"box\"><h4>View</h4><button id=\"zi\">+</button><button id=\"zo\">\u2212</button><button id=\"zf\">Fit</button> <small id=\"zl\"></small><br><small>Drag empty map to pan, pinch or scroll to zoom. Dragging a token near the edge scrolls the map.</small></div>\n <div class=\"box\"><h4>Load board</h4><button id=\"imgBtn\">Map image\u2026</button><input id=\"imgF\" type=\"file\" accept=\"image/*\" hidden> <button id=\"sb\">Sample board</button>\n  <textarea id=\"jt\" rows=\"3\" style=\"width:100%;box-sizing:border-box;margin-top:4px\" placeholder=\"Paste editor export JSON\"></textarea><button id=\"jb\">Load JSON</button><small id=\"jm\"></small></div>\n <div class=\"box\"><h4>View as</h4><div id=\"vw\"></div><small id=\"vwn\"></small></div>\n <div class=\"box\"><h4>Players (drag a token on the map)</h4><div id=\"pl\"></div><small>Mock host runs in this page; the log shows the messages that would travel over PeerJS.</small></div>\n <div class=\"box\"><h4>Prompt</h4><div id=\"pr\"><small>Move a token onto a space.</small></div><div style=\"margin-top:6px\"><button id=\"ev\">Draw Event Card (active player)</button><button id=\"lose\">Active player lost a battle</button></div><div id=\"hm\" style=\"margin-top:4px\"></div></div>\n <div class=\"box\" id=\"hostbox\"><h4>Host only: pools &amp; hidden tokens</h4><div id=\"host\"></div></div>\n <div class=\"box\" id=\"netbox\"><h4>What guests receive</h4><div id=\"leak\"></div><details><summary>Last board-state snapshot (JSON)</summary><pre id=\"snapj\" style=\"white-space:pre-wrap;word-break:break-all;font-size:10px;max-height:160px;overflow:auto\"></pre></details></div>\n <div class=\"box\" id=\"logbox\"><h4>Host log</h4><div id=\"log\"></div></div>\n</aside><div id=\"mapctl\"><button id=\"mzi\">+</button><button id=\"mzo\">&minus;</button><button id=\"mzf\">Fit</button><button id=\"mpanel\">Panel</button></div><div id=\"actbar\" hidden></div>";
function mount(container,opts){
opts=opts||{};
if(!document.getElementById('bm-style')){const st=document.createElement('style');st.id='bm-style';st.textContent=CSS;document.head.appendChild(st)}
const root=document.createElement('div');root.className='bm-root';root.innerHTML=HTML;container.appendChild(root);

const mode=opts.mode||'mock',send=opts.send||(()=>{});let startId=null,pendingHome={},CS=1,ES=1;const myId=opts.playerId;const omni=()=>view==='host'&&(mode==='mock'||myId===undefined);
const $=id=>root.querySelector('#'+id),svg=$('b');
const COL={red:'#e03131',blue:'#2f4fd0',green:'#2f9e44',yellow:'#f5c211',orange:'#c9801f',pink:'#f08a96'};
let PL=[{id:'p1',name:'Ash',c:'#ff5252'},{id:'p2',name:'Misty',c:'#42a5f5'},{id:'p3',name:'Brock',c:'#8d6e63'}];
if(opts.players)PL=opts.players;
const SAMPLE_NAMES={red:['Charmander','Vulpix','Growlithe','Ponyta','Magmar'],blue:['Squirtle','Psyduck','Slowpoke','Staryu','Lapras'],green:['Bulbasaur','Oddish','Bellsprout','Tangela','Scyther'],yellow:['Pikachu','Sandshrew','Geodude','Onix','Diglett'],orange:['Articuno','Zapdos','Moltres','Mewtwo']};
let view='host',M={pos:{},home:{},spaces:{}},lastSnapStr='',SP=[],LK=[],W=1000,H=620,R=14,K=1,NAMES={},img=null,active='p1',pos={},home={},pools={},st={},drag=null,sync=0;
const curPos=()=>mode==='guest'?M.pos:pos;
const get=id=>SP.find(s=>s.id===id),shuf=a=>{for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a};
const log=t=>$('log').insertAdjacentHTML('afterbegin',`<div>${t}</div>`);
// ---------- boards ----------
function sampleBoard(){const S=[['A','city',0,90,540,'Pallet'],['B','catch','red',200,480],['C','event',0,300,430],['D','catch','red',410,450],['E','city',0,530,400,'Viridian'],['F','catch','green',610,300],['G','event',0,710,255],['H','catch','green',800,205],['I','city',0,900,110,'Cerulean'],['J','catch','blue',650,480,'','Snorlax'],['K','catch','yellow',770,530],['L','event',0,870,470],['M','catch','yellow',920,380],['N','catch','orange',950,250]]
 .map(([id,type,color,x,y,label,spawn])=>({id,type,color,x,y,label,spawn,actions:type==='city'?['Poké Mart','Pokémon Center','Gym Battle']:[]}));
 const L=[['A','B'],['B','C'],['C','D'],['D','E'],['E','F'],['F','G'],['G','H'],['H','I'],['E','J'],['J','K'],['K','L'],['L','M'],['M','N',{note:'🔒 Tier 3+'}],['N','I']];
 applyBoard({SP:S,LK:L,W:1000,H:620,R:14,names:SAMPLE_NAMES,start:'A'})}
function importBoard(d,o){const cnt=k=>d.spaces.filter(s=>s.pos&&s.pos[k]).length;let m0;if(o&&o.style){if(!cnt(o.style))throw new Error('this board has no '+o.style+' map yet');m0=o.style}else m0=['condensed','full'].map(k=>[k,cnt(k)]).sort((a,b)=>b[1]-a[1])[0][0];const m=m0,asp=(d.maps&&d.maps[m]&&d.maps[m].aspect)||1.5,w=1000;
 const S=d.spaces.filter(s=>s.pos&&s.pos[m]).map(s=>({id:s.id,type:s.type,color:s.region||'red',x:s.pos[m].x*w,y:s.pos[m].y*w/asp,w:s.pos[m].w&&s.pos[m].w*w,h:s.pos[m].h&&s.pos[m].h*w/asp,label:s.label||'',spawn:s.spawn,start:!!s.start,actions:s.actions||[]}));
 const ids=new Set(S.map(s=>s.id)),L=d.links.filter(l=>ids.has(l[0])&&ids.has(l[1])).map(l=>[l[0],l[1],l[2]?{note:'🔒 '+(l[2].label||(l[2].type+' '+l[2].value))}:undefined]);
 const cols=[...new Set(S.filter(s=>s.type==='catch').map(s=>s.color))],names={};if(!cols.includes('orange'))cols.push('orange');
 cols.forEach(c=>{const n=S.filter(s=>s.type==='catch'&&s.color===c&&!s.spawn).length+(c==='orange'?3:4);names[c]=Array.from({length:n},(_,i)=>c[0].toUpperCase()+c.slice(1)+' '+(i+1))});
 if(opts.getPools){const ext=opts.getPools(cols);if(ext)Object.assign(names,ext)}
 const seen=new Set();if(!opts.getPools)S.filter(s=>s.spawn&&!seen.has(s.spawn)&&seen.add(s.spawn)).forEach(s=>names[s.color].push(s.spawn));
 const start=(S.find(s=>s.start)||S.find(s=>/pallet/i.test(s.label))||S.find(s=>s.type==='city')||S[0]).id;
 applyBoard({SP:S,LK:L,W:w,H:w/asp,R:w/170,names,start,cs:(d.maps&&d.maps[m]&&d.maps[m].circleScale)||1,es:1});$('jm').textContent=` Loaded ${S.length} spaces, ${L.length} links (${m} map).`}
function applyBoard(o){SP=o.SP;CS=o.cs||1;ES=o.es||1;LK=o.LK;W=o.W;H=o.H;R=o.R;K=R/14;NAMES=o.names;fitView();
 startId=o.start;pos={};home={};PL.forEach(p=>{pos[p.id]=o.start;if(get(o.start)&&get(o.start).type==='city')home[p.id]=o.start});$('log').innerHTML='';if(mode==='guest'){draw()}else{setup();snapshot()}prompt('Move a token onto a space.')}
// ---------- mock HOST ----------
function setup(){pools={};for(const c in NAMES)pools[c]=shuf(NAMES[c].slice());st={};
 for(const s of SP)if(s.type==='catch'){const o={empty:false,boss:!!s.spawn,cleared:false,home:s.color};
  if(s.spawn){o.token=s.spawn;o.revealed=true;let f=false;for(const c in pools){const i=pools[c].indexOf(s.spawn);if(i>=0){pools[c].splice(i,1);o.home=c;f=true;break}}if(!f){o.dup=true;log(`host: no ${s.spawn} left in the pools — created a duplicate for ${s.id}`)}}
  else{o.token=(pools[s.color]||[]).pop();if(!o.token){o.empty=true;o.revealed=true}else o.revealed=false}st[s.id]=o}
 log('host: setup — dealt face-down tokens (bosses face-up)')}
// ---------- restore: a new host picks up a game already in progress ----------
// A snapshot's player ids are the OLD host's lobby ids, which change on a handoff, so players are matched by
// color (c) instead. Hidden (face-down) tokens are never in a snapshot, so those are simply dealt again.
let restoreQ=null,owned=new Set(),boardCaught=new Set();
function restorePlayers(){if(!restoreQ)return;const left=[];
 restoreQ.forEach(o=>{const p=PL.find(x=>x.c===o.c);if(!p){left.push(o);return}
  if(o.pos&&get(o.pos))pos[p.id]=o.pos;if(o.home&&get(o.home))home[p.id]=o.home});
 restoreQ=left.length?left:null}
function restoreSnapshot(str,oldPlayers){if(mode!=='host'||!str)return false;let s;try{s=JSON.parse(str)}catch(e){return false}
 if(!s||!s.spaces||!s.pos)return false;const used=new Set();
 for(const id in s.spaces){const r=s.spaces[id],o=st[id];if(!o)continue;
  o.revealed=!!r.revealed;o.empty=!!r.empty;o.boss=!!r.boss;if(!o.boss&&get(id).spawn)o.cleared=true;
  if(o.empty)o.token=null;
  else if(r.revealed&&r.token){o.token=r.token;used.add(r.token);let hc=null;for(const c in NAMES)if(NAMES[c].includes(r.token)){hc=c;break}o.home=hc||get(id).color;o.dup=!hc}}
 for(const c in pools)pools[c]=pools[c].filter(n=>!used.has(n));
 for(const id in st){const o=st[id];if(o.revealed||o.empty||!used.has(o.token))continue;const n=(pools[get(id).color]||[]).pop();if(n)o.token=n;else{o.token=null;o.empty=true;o.revealed=true}}
 sync=Math.max(sync,s.seq|0);
 restoreQ=(oldPlayers||[]).map(p=>({c:p.c,pos:s.pos[p.id],home:s.home&&s.home[p.id]}));
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
// The host's COMPLETE state, face-down Pokémon and pools included. Never sent to the table: the app puts it in the
// host backup so a successor can resume exactly where the old host stopped.
function exportState(){if(mode!=='host')return null;const j=x=>JSON.parse(JSON.stringify(x));
 return{v:1,seq:sync,spaces:j(st),pools:j(pools),pos:j(pos),home:j(home),players:PL.map(p=>({id:p.id,c:p.c})),owned:[...owned],boardCaught:[...boardCaught]}}
function restoreState(s){if(mode!=='host'||!s||s.v!==1||!s.spaces||!s.pools)return false;
 for(const id in s.spaces){if(!st[id])continue;st[id]=Object.assign({},st[id],s.spaces[id])}
 pools=JSON.parse(JSON.stringify(s.pools));owned=new Set(s.owned||[]);boardCaught=new Set(s.boardCaught||[]);
 sync=Math.max(sync,s.seq|0);
 restoreQ=(s.players||[]).map(p=>({c:p.c,pos:s.pos&&s.pos[p.id],home:s.home&&s.home[p.id]}));
 restorePlayers();log('host: restored the full board (face-down Pokémon included) from the previous host');snapshot();return true}
// A guest who reconnects gets a new connection id; the app calls this with the old and new ids (matched by guestClientId).
function adoptPlayer(o,n){if(mode!=='host'||!o||!n||o===n||pos[o]===undefined)return false;
 pos[n]=pos[o];if(home[o]!==undefined)home[n]=home[o];delete pos[o];delete home[o];delete pendingHome[o];snapshot();return true}
function snapshot(){sync++;const sp={};for(const id in st){const o=st[id];sp[id]={empty:o.empty,revealed:o.revealed,token:(o.revealed&&!o.empty)?o.token:null,boss:o.boss}}
 lastSnapStr=JSON.stringify({seq:sync,pos,home,spaces:sp});if(mode==='host')send({type:'board-state',snap:lastSnapStr});log(`host → ${PL.length} guests: board-state #${sync} (${lastSnapStr.length} bytes)`);leakCheck();draw();renderHost()}
function leakCheck(){const rev=new Set(),hid=new Set();for(const id in st){const o=st[id];if(o.token)(o.revealed?rev:hid).add(o.token)}for(const c in pools)pools[c].forEach(n=>hid.add(n));rev.forEach(n=>hid.delete(n));
 const bad=[...hid].filter(n=>lastSnapStr.includes(JSON.stringify(n)));
 $('leak').innerHTML=bad.length?`<b style="color:#d03a2f">✗ LEAK: ${bad.join(', ')}</b>`:`<span style="color:#2f9e44">✓ Leak check passed</span> <small>(${hid.size} hidden names, none in the snapshot)</small>`;
 $('snapj').textContent=JSON.stringify(JSON.parse(lastSnapStr),null,1)}
function buildModel(){if(omni()){const sp={};for(const id in st){const o=st[id];sp[id]={empty:o.empty,revealed:o.revealed,token:o.token,boss:o.boss}}M={peek:true,pos,home,spaces:sp}}
 else M=Object.assign({pos:{},home:{},spaces:{}},lastSnapStr?JSON.parse(lastSnapStr):{})}
function renderView(){$('vw').innerHTML=[['host','Host'],...PL.map(q=>[q.id,q.name])].map(([v,n])=>`<button class="${v===view?'on':''}" data-v="${v}">${n}</button>`).join('');
 $('vw').querySelectorAll('[data-v]').forEach(b=>b.onclick=()=>setView(b.dataset.v));
 $('vwn').textContent=view==='host'?'Sees everything, including face-down identities (italic names).':'Sees only what the host broadcasts. Can move only their own token.'}
function setView(v){view=v;if(v!=='host')active=v;const h=v==='host'?'':'none';['hostbox','logbox','ev','lose'].forEach(i=>$(i).style.display=h);renderView();draw()}
function routeCities(a,b){const adj={};for(const [x,y] of LK){(adj[x]=adj[x]||[]).push(y);(adj[y]=adj[y]||[]).push(x)}
 const prev={[a]:null},q=[a];while(q.length){const c=q.shift();if(c===b)break;for(const n of adj[c]||[])if(!(n in prev)){prev[n]=c;q.push(n)}}
 const out=[];if(!(b in prev))return out;for(let c=prev[b];c&&c!==a;c=prev[c])out.unshift(c);return out.filter(id=>get(id).type==='city')}
function setHome(p,c){const n=PL.find(x=>x.id===p).name;home[p]=c;log(`host: ${n}'s Current Home → ${get(c).label||c}`);snapshot()}
function hostMove(p,to){const prev=pos[p];log(`${PL.find(x=>x.id===p).name} → host: board-move ${to}`);pos[p]=to;snapshot();land(p,to,routeCities(prev,to))}
function landEvent(p,id,passed,here){const s=get(id),homeOpts=[...passed.map(c=>({id:c,label:get(c).label||c,how:'passed through'})),...(s.type==='city'?[{id,label:s.label||id,how:''}]:[])].filter(o=>home[p]!==o.id);
 pendingHome[p]=homeOpts.map(o=>o.id);let kind=(s.type==='city'||s.type==='special')?s.type:s.type==='event'?'event':'none';const o=st[id];
 if(s.type==='catch'&&o){if(o.empty)kind='empty';else{if(!o.revealed){o.revealed=true;log(`host: reveal ${id} (${o.token}) to everyone`);snapshot()}kind='encounter'}}
 opts.onLanding({player:p,space:{id:s.id,type:s.type,label:s.label,actions:s.actions||[]},kind,token:kind==='encounter'?o.token:null,boss:kind==='encounter'&&!!o.boss,alsoHere:here,homeOptions:homeOpts})}
function land(p,id,passed=[]){const s=get(id),here=PL.filter(q=>q.id!==p&&pos[q.id]===id).map(q=>q.name),name=PL.find(q=>q.id===p).name;
 if(mode==='host'&&opts.onLanding){landEvent(p,id,passed,here);return}
 let h=`<b>${name}</b> landed on <b>${s.label||s.type+' '+s.id}</b>.`;
 const hm=$('hm');hm.innerHTML='';[...passed.map(c=>[c,' (passed through)']),...(s.type==='city'?[[id,'']]:[])].filter(([c])=>home[p]!==c).forEach(([c,w])=>{const b=document.createElement('button');b.textContent=`Set Current Home: ${get(c).label||c}${w}`;b.onclick=()=>{setHome(p,c);hm.innerHTML=''};hm.appendChild(b)});
 if(here.length)h+=`<br>Also here: ${here.join(', ')} — <i>player-vs-player actions available</i>`;
 if(s.type==='city'||s.type==='special'){prompt(h+`<br>${s.actions.map(a=>`<button>${a}</button>`).join('')||'<small>No actions entered yet.</small>'}`);return}
 if(s.type==='event'){prompt(h+'<br>Draw an Event card?',[['Draw',()=>drawEvent(p)]]);return}
 const o=st[id];if(!o){prompt(h);return}
 if(o.empty){prompt(h+'<br><small>Empty — nothing here.</small>');return}
 if(!o.revealed){o.revealed=true;log(`host: reveal ${id} (${o.token}) to everyone`);snapshot()}
 prompt(h+`<br>Wild <b>${o.token}</b> appears${o.boss?' (boss)':''}! Battle starts at full HP.`,[['Caught',()=>resolve(id,'caught')],['Defeated',()=>resolve(id,'defeated')],['Abandon',()=>resolve(id,'abandon')]])}
function resolve(id,out){const s=get(id),o=st[id];log(`battle result on ${id}: ${out} ${o.token}`);
 if(out==='abandon'){log('host: token stays face-up on its space');prompt('Left on the map. The next visitor fights it fresh.');return}
 if(out==='defeated'){if(o.dup)log(`host: duplicate ${o.token} disappears (not returned to a pool)`);else if(!owned.has(o.token)){const hc=o.home||s.color;pools[hc].push(o.token);shuf(pools[hc]);log(`host: ${o.token} shuffled into ${hc} pool`)}}
 else{log(`host: ${o.token} leaves the game`);boardCaught.add(o.token)}
 if(o.boss){o.boss=false;o.cleared=true}o.dup=false;o.home=s.color;
 if(s.color==='orange'||!pools[s.color].length){o.empty=true;o.token=null;log(s.color==='orange'?'host: legendary space stays empty':'host: pool exhausted — space empty')}
 else{o.token=pools[s.color].pop();o.revealed=false;log(`host: dealt new face-down token on ${id}`)}
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
function draw(){buildModel();let h=img?`<image href="${img}" width="${W}" height="${H}"/>`:'';const fo=img?.72:1,sw=.36*R,sm=opts.showMarkers!==false;
 if(sm)for(const [a,b,g] of LK){const A=get(a),B=get(b);h+=`<line x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}" stroke="${g?'#ffb000':'#222'}" stroke-width="${g?sw*1.3:sw}" opacity="${img?.8:1}"${g?` stroke-dasharray="${R*.9} ${R*.5}"`:''}/>`;
  if(g){const mx=(A.x+B.x)/2,my=(A.y+B.y)/2;h+=`<circle cx="${mx}" cy="${my}" r="${R*.8}" fill="#ffb000" stroke="#000" stroke-width="${R*.1}"/><text x="${mx}" y="${my+R*.35}" text-anchor="middle" font-size="${R*.95}">🔒</text><text x="${mx}" y="${my+R*1.9}" text-anchor="middle" font-size="${R*.8}" fill="#000" stroke="#fff" stroke-width="${R*.2}" paint-order="stroke">${g.note.slice(2)}</text>`}}
 if(sm)for(const s of SP){const o=M.spaces[s.id]||(s.type==='catch'?{revealed:false,empty:false,token:null,boss:false}:undefined),e=dims(s);
  if(s.type==='city'||s.type==='special')h+=`<rect x="${s.x-e.w/2}" y="${s.y-e.h/2}" width="${e.w}" height="${e.h}" rx="${R*.3}" fill="${s.type==='city'?'#1b1b1b':'#8a8a92'}" opacity="${fo}"/><text x="${s.x}" y="${s.y+R*.35}" text-anchor="middle" fill="#fff" font-size="${R*.9}">${s.label||s.id}</text>`;
  else if(s.type==='event')h+=`<circle cx="${s.x}" cy="${s.y}" r="${R*1.5*CS}" fill="#f2f2f2" stroke="#000" stroke-width="${R*.1}" opacity="${fo}"/><text x="${s.x}" y="${s.y+R*.45}" text-anchor="middle" font-size="${R*1.3}" font-weight="700">E</text>`;
  else if(s.type==='catch'){const em=o&&o.empty;h+=`<circle cx="${s.x}" cy="${s.y}" r="${R*1.5*CS}" fill="${COL[s.color]||'#999'}" opacity="${em?.25:fo}" stroke="#000" stroke-width="${R*.1}"/>`+
   (em?`<text x="${s.x}" y="${s.y+R*.4}" text-anchor="middle" font-size="${R*1.1}">✕</text>`:o.revealed?`<text x="${s.x}" y="${s.y+R*.3}" text-anchor="middle" font-size="${R*.65}" fill="#fff" stroke="#000" stroke-width="${R*.12}" paint-order="stroke" font-weight="700">${o.token.slice(0,7)}</text>`:`<text x="${s.x}" y="${s.y+R*.5}" text-anchor="middle" font-size="${R*1.4}" fill="#fff" stroke="#000" stroke-width="${R*.12}" paint-order="stroke" font-weight="700">?</text>`+(M.peek&&o.token?`<text x="${s.x}" y="${s.y+R*2.5}" text-anchor="middle" font-size="${R*.7}" font-style="italic" fill="#fff" stroke="#000" stroke-width="${R*.15}" paint-order="stroke">${o.token}</text>`:''))+
   (o.boss?`<text x="${s.x+R*1.3*CS}" y="${s.y-R*CS}" font-size="${R*1.2}" fill="#ffd43b" stroke="#000" stroke-width="${R*.08}">★</text>`:'')}}
 PL.forEach((q,i)=>{const c=get(M.home[q.id]);if(!c)return;const d=dims(c),cx=c.x-d.w/2+R*(.7+1.2*i),cy=c.y-d.h/2-R*.1;h+=`<polygon points="${cx},${cy-R*.55} ${cx+R*.55},${cy} ${cx+R*.55},${cy+R*.55} ${cx-R*.55},${cy+R*.55} ${cx-R*.55},${cy}" fill="${q.c}" stroke="#fff" stroke-width="${R*.12}" pointer-events="none"/>`});
 for(const q of PL){if(!get(M.pos[q.id]))continue;const [x,y]=(drag&&drag.p===q.id)?[drag.x,drag.y]:tokenXY(M.pos[q.id])(q);
  const nh=PL.filter(o=>M.pos[o.id]===M.pos[q.id]).length;
  h+=`<circle data-p="${q.id}" cx="${x}" cy="${y}" r="${nh>1?R*1.4:R*2.2}" fill="transparent" style="cursor:grab"/><circle data-p="${q.id}" cx="${x}" cy="${y}" r="${R*.95}" fill="${q.c}" stroke="#fff" stroke-width="${R*.2}" pointer-events="none"/>`}
 svg.innerHTML=h;renderPl()}
const pt=e=>new DOMPoint(e.clientX,e.clientY).matrixTransform(svg.getScreenCTM().inverse());
let Z=1,VX=0,VY=0,relZoom=1;const ptrs=new Map();let pan=null,pinch=null,lastPtr=null,edgeOn=false;
let EA=1.5;const updEA=()=>{const r=svg.getBoundingClientRect();if(r.width&&r.height)EA=r.width/r.height};
const zmin=()=>Math.min(1,W/(H*EA)),VW=()=>W/Z,VH=()=>W/Z/EA,clampZ=z=>Math.min(10,Math.max(zmin(),z));
function clampView(){const w=VW(),h=VH();VX=w>=W-1e-6?(W-w)/2:Math.max(0,Math.min(W-w,VX));VY=h>=H-1e-6?(H-h)/2:Math.max(0,Math.min(H-h,VY))}
function applyView(){svg.setAttribute('viewBox',`${VX} ${VY} ${VW()} ${VH()}`);relZoom=Z/zmin();$('zl').textContent=(Z/zmin()).toFixed(1)+'×'}
function fitView(){updEA();Z=zmin();VX=0;VY=0;clampView();applyView()}
function centerOn(id){const s=get(id);if(!s)return;VX=s.x-VW()/2;VY=s.y-VH()/2;clampView();applyView()}
function restoreView(){updEA();Z=clampZ((relZoom||1)*zmin());VX=0;VY=0;const mine=myId&&M.pos&&M.pos[myId];if(mine&&get(mine))centerOn(mine);else{clampView();applyView()}}
function zoomAt(fx,fy,nz){const ax=VX+fx*VW(),ay=VY+fy*VH();Z=clampZ(nz);VX=ax-fx*VW();VY=ay-fy*VH();clampView();applyView()}
function startPinch(){const [a,b]=[...ptrs.values()],r=svg.getBoundingClientRect();pinch={d0:Math.hypot(a.x-b.x,a.y-b.y)||1,Z0:Z,ax:VX+((a.x+b.x)/2-r.left)/r.width*VW(),ay:VY+((a.y+b.y)/2-r.top)/r.height*VH()}}
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
function moveDrag(){if(!drag)return;svg.querySelectorAll(`[data-p="${drag.p}"]`).forEach(c=>{c.setAttribute('cx',drag.x);c.setAttribute('cy',drag.y)});
 const ring=$('snapR');if(!ring)return;const n=nearest({x:drag.x,y:drag.y});
 if(!(n.best&&n.d<R*2&&n.best.id!==curPos()[drag.p])){ring.setAttribute('display','none');return}
 const s=n.best,rc=s.type==='city'||s.type==='special',pad=R*.5,e=dims(s),sc2=CS,w=rc?e.w+2*pad:R*3.4*sc2,h=rc?e.h+2*pad:R*3.4*sc2;
 ring.setAttribute('display','');ring.setAttribute('x',s.x-w/2);ring.setAttribute('y',s.y-h/2);ring.setAttribute('width',w);ring.setAttribute('height',h);ring.setAttribute('rx',rc?R*.5:R*1.7*sc2)}
function dropToken(){if(!drag.moved){drag=null;draw();return}const q={x:drag.x,y:drag.y},p=drag.p;drag=null;const n=nearest(q);
 if(n.best&&n.d<R*2&&n.best.id!==curPos()[p]){if(mode==='guest'){send({type:'board-move',player:p,to:n.best.id});draw()}else hostMove(p,n.best.id)}else draw()}
svg.onpointerdown=e=>{svg.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(ptrs.size===2){if(drag){drag=null;draw()}pan=null;startPinch();return}
 if(ptrs.size>2)return;
 const g=e.target.closest('[data-p]');
 if(g&&(mode==='mock'?(view==='host'||g.dataset.p===view):g.dataset.p===myId)){const off=e.pointerType==='touch'?30:0;drag={p:g.dataset.p,id:e.pointerId,off,...pt({clientX:e.clientX,clientY:e.clientY-off})};active=g.dataset.p;lastPtr={clientX:e.clientX,clientY:e.clientY,x:e.clientX,y:e.clientY};draw();svg.insertAdjacentHTML('beforeend',`<rect id="snapR" display="none" fill="none" stroke="#ffeb3b" stroke-width="${R*.35}" pointer-events="none"/>`)}
 else pan={id:e.pointerId,x:e.clientX,y:e.clientY}};
svg.onpointermove=e=>{if(!ptrs.has(e.pointerId))return;ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(pinch&&ptrs.size>=2){doPinch();return}
 if(drag&&drag.id===e.pointerId){const q=pt({clientX:e.clientX,clientY:e.clientY-drag.off});drag.x=q.x;drag.y=q.y;drag.moved=true;lastPtr={clientX:e.clientX,clientY:e.clientY,x:e.clientX,y:e.clientY};if(!edgeOn){edgeOn=true;requestAnimationFrame(edgeTick)}moveDrag();return}
 if(pan&&pan.id===e.pointerId){const r=svg.getBoundingClientRect();VX-=(e.clientX-pan.x)*VW()/r.width;VY-=(e.clientY-pan.y)*VH()/r.height;pan.x=e.clientX;pan.y=e.clientY;clampView();applyView()}};
svg.onpointerup=e=>{if(!ptrs.has(e.pointerId))return;ptrs.delete(e.pointerId);
 if(pinch){if(ptrs.size<2)pinch=null;return}
 if(pan&&pan.id===e.pointerId)pan=null;
 if(drag&&drag.id===e.pointerId)dropToken(e)};
svg.onpointercancel=e=>{ptrs.delete(e.pointerId);pinch=null;pan=null;if(drag){drag=null;draw()}};
svg.addEventListener('wheel',e=>{e.preventDefault();const r=svg.getBoundingClientRect();zoomAt((e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height,Z*Math.exp(-e.deltaY*.0015))},{passive:false});
$('zi').onclick=()=>zoomAt(.5,.5,Z*1.4);$('zo').onclick=()=>zoomAt(.5,.5,Z/1.4);$('zf').onclick=fitView;$('mzi').onclick=()=>zoomAt(.5,.5,Z*1.4);$('mzo').onclick=()=>zoomAt(.5,.5,Z/1.4);$('mzf').onclick=fitView;$('mpanel').onclick=()=>root.classList.toggle('bm-aside-hidden');if(mode!=='mock')root.classList.add('bm-aside-hidden');const ro=new ResizeObserver(()=>{updEA();clampView();applyView()});ro.observe(svg);
$('ev').onclick=()=>drawEvent();$('lose').onclick=()=>{const p=active,n=PL.find(x=>x.id===p).name,h=home[p];if(!h){prompt('No Current Home set.');return}log(`battle lost: ${n} respawns at ${h}`);pos[p]=h;snapshot();prompt(`<b>${n}</b> lost the battle and returns to <b>${get(h).label||h}</b>.`)};$('sb').onclick=()=>{img=null;sampleBoard()};
$('imgBtn').onclick=()=>$('imgF').click();$('imgF').onchange=e=>{const f=e.target.files[0];if(f){img=URL.createObjectURL(f);draw()}};
$('jb').onclick=()=>{try{importBoard(JSON.parse($('jt').value))}catch(err){$('jm').textContent=' Could not read that JSON.'}};


function showAction(a){const b=$('actbar');b.innerHTML='';const tx=document.createElement('div');tx.textContent=a.text;tx.style.marginBottom='6px';b.appendChild(tx);
 (a.buttons||[]).forEach(x=>{const bt=document.createElement('button');bt.textContent=x.label;bt.onclick=()=>{hideAction();if(opts.onAction)opts.onAction(x.id,a)};b.appendChild(bt)});b.hidden=false}
function hideAction(){$('actbar').hidden=true}
if(opts.backHref){$('bk').href=opts.backHref;$('bkbox').hidden=false}
if(mode==='guest'){view=opts.playerId||PL[0].id;active=view}
if(mode!=='mock'){$('vw').parentNode.style.display='none';$('imgBtn').parentNode.style.display='none';$('hostbox').style.display='none';active=myId||(PL[0]&&PL[0].id)||active}
if(mode==='guest')setView(view);else renderView();
if(!opts.noSample&&mode!=='guest')sampleBoard();
return{
 loadBoard:importBoard,
 setImage:u=>{img=u;draw()},
 setStatus:t=>{$('jm').textContent=t},getStatus:()=>$('jm').textContent,
 handleMessage(m){if(!m)return;if(mode==='host'&&m.type==='board-move')hostMove(m.player,m.to);else if(mode==='host'&&m.type==='board-sethome'){if((pendingHome[m.player]||[]).includes(m.city)){pendingHome[m.player]=[];setHome(m.player,m.city)}}else if(mode==='guest'&&m.type==='board-state'){lastSnapStr=m.snap;draw()}},
 showAction,hideAction,
 resolveEncounter(id,out){if(mode==='host'&&st[id]&&st[id].token)resolve(id,out)},
 resend(){if(mode==='host'&&lastSnapStr)send({type:'board-state',snap:lastSnapStr})},
 restoreSnapshot,
 setCaught,exportState,restoreState,adoptPlayer,
 fit:()=>fitView(),
 restoreView,
 setView:v=>setView(v),
 setPlayers(list){PL=list;if(mode!=='guest'){PL.forEach(p=>{if(!pos[p.id]&&startId){pos[p.id]=startId;if(get(startId)&&get(startId).type==='city')home[p.id]=startId}});restorePlayers();snapshot()}else draw();renderView()},
 destroy(){ro.disconnect();root.remove()}
};

}
global.BoardMap={mount};
})(window);
