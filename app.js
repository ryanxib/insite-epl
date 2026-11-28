(function(){
const $=s=>document.querySelector(s), esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const J=async u=>{try{const r=await fetch(u);return r.ok?await r.json():null}catch(e){return null}};
/* E5 write-back: GitHub contents API on the private repo ryanxib/epl.dfs (copied from nba.dfs insite, tested there).
   Token = fine-grained, epl.dfs only, Contents read + write. Pasted once per device on #settings, kept in this browser only,
   sent only to api.github.com. Each save = one commit on main. */
const store={get(k,d){try{const v=localStorage.getItem("insite-epl."+k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{v==null?localStorage.removeItem("insite-epl."+k):localStorage.setItem("insite-epl."+k,JSON.stringify(v))}catch(e){}}};
const ghErr=c=>({401:"token rejected (expired or mistyped). Paste it again on Settings.",403:"token has no write access to epl.dfs (Contents: read and write).",404:"token cannot see ryanxib/epl.dfs (repository not selected on the token)."}[c]||"GitHub error "+c);
const GH={repo:"ryanxib/epl.dfs",branch:"main",token(){return store.get("gh",null)},
  async req(path,opt){const t=this.token();if(!t)throw new Error("no token on this device");return fetch("https://api.github.com/repos/"+this.repo+path,Object.assign({cache:"no-store"},opt,{headers:{Authorization:"Bearer "+t,Accept:"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28"}}))},
  enc(f){return f.split("/").map(encodeURIComponent).join("/")},
  async get(f){const r=await this.req("/contents/"+this.enc(f)+"?ref="+this.branch);if(r.status===404)return{text:null,sha:null};if(!r.ok)throw new Error(ghErr(r.status));const j=await r.json(),bin=atob(j.content.replace(/\n/g,""));return{text:new TextDecoder().decode(Uint8Array.from(bin,c=>c.charCodeAt(0))),sha:j.sha}},
  async put(f,text,msg,sha){const u=new TextEncoder().encode(text);let bin="";for(let i=0;i<u.length;i+=8192)bin+=String.fromCharCode.apply(null,u.subarray(i,i+8192));
    const body={message:msg,content:btoa(bin),branch:this.branch};if(sha)body.sha=sha;const r=await this.req("/contents/"+this.enc(f),{method:"PUT",body:JSON.stringify(body)});
    if(!r.ok)throw new Error(r.status===409||r.status===422?"the file changed on GitHub since this page read it. Reload and redo the change.":ghErr(r.status));return(await r.json()).content.sha}};
const nowIso=()=>new Date().toISOString().slice(0,19)+"Z",isLocked=(S,m=0)=>!!(S&&S.lock_utc)&&Date.now()>=Date.parse(S.lock_utc)-m;
async function getJ(f){const g=await GH.get(f);return{j:g.text?JSON.parse(g.text):null,sha:g.sha}}
function settings(){const has=!!GH.token();
  $("#main").innerHTML=`<div class="card"><h3>Write-back token <small>this device</small></h3>
  <p class="note">Lets this page save your shortlist and xPts overrides (Slate), requests and the Rebuild button (Build) to the private repo epl.dfs. Each save is one commit.</p>
  <p class="note">Status: ${has?'<b style="color:var(--acc)">token saved</b>':'<b class="warn">no token</b>'}</p>
  <div class="bar"><input type="password" id="t-in" autocomplete="off" spellcheck="false" placeholder="${has?"saved; paste a new one to replace it":"github_pat_…"}" style="flex:1;min-width:220px"><button class="pill on" id="t-save">Save and test</button>${has?'<button class="pill" id="t-del">Remove</button>':""}</div><p class="note" id="t-msg"></p>
  <ol class="note"><li>GitHub: profile picture → Settings → Developer settings → Personal access tokens → <b>Fine-grained tokens</b> → Generate new token.</li>
  <li>Repository access: <b>Only select repositories → ryanxib/epl.dfs</b>. Permissions → Repository → <b>Contents: Read and write</b>. Nothing else. Pick an expiry date.</li>
  <li>Generate, copy (GitHub shows it once), paste above, Save and test.</li></ol>
  <p class="note">One token per device (a lost phone is cut off alone). Do not reuse the insite-epl deploy token. The token stays in this browser and is sent only to api.github.com. Anyone holding this device can use it.</p></div>`;
  $("#t-save").onclick=async()=>{const v=$("#t-in").value.trim(),m=$("#t-msg");if(!v)return m.textContent="Paste the token first.";if(!/^(github_pat_|ghp_)/.test(v))return m.innerHTML='<span class="warn">That does not look like a GitHub token</span> (starts with github_pat_).';
    const old=GH.token();store.set("gh",v);m.textContent="Testing…";try{const r=await GH.req("");if(!r.ok)throw new Error(ghErr(r.status));const j=await r.json();
      m.innerHTML=`<b style="color:var(--acc)">OK:</b> token sees ${esc(j.full_name)} (${j.private?"private":"public"}), ${j.permissions?(j.permissions.push?"write access confirmed":'<span class="warn">READ ONLY: saving will fail</span>'):"write is checked on the first save"}.`;nav("settings")}
    catch(e){store.set("gh",old);m.innerHTML='<span class="warn">Not saved:</span> '+esc(e.message)}};
  if(has)$("#t-del").onclick=()=>{store.set("gh",null);settings()}}
let D={};const VIEWS=[["week","Week"],["players","Players"],["slate","Slate"],["matrix","Matrix"],["build","Build"],["fixtures","Fixtures"],["field","Field",1],["season","Season"],["settings","Settings"]];
function nav(v){$("#nav").innerHTML=VIEWS.map(([k,l,soon])=>`<a href="#${k}" class="${v===k?"on":""}${soon?" soon":""}">${l}${k==="settings"&&!GH.token()?" ·":""}</a>`).join("")}
function table(cols,rows,id,sort){ // cols: [key,label,fmt,left]
  let s=sort||[cols[0][0],1];
  const draw=()=>{const k=s[0],d=s[1];const r=[...rows].sort((a,b)=>{const x=a[k],y=b[k];if(x==null)return 1;if(y==null)return -1;return (typeof x==="string"?x.localeCompare(y):x-y)*d});
    $("#"+id).innerHTML=`<table><thead><tr>${cols.map(c=>`<th data-k="${c[0]}" class="${c[3]?"l":""}">${c[1]}</th>`).join("")}</tr></thead><tbody>${r.slice(0,400).map(x=>`<tr>${cols.map(c=>`<td class="${c[3]?"l":""}">${c[2]?c[2](x[c[0]],x):esc(x[c[0]])}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
    document.querySelectorAll("#"+id+" th").forEach(h=>h.onclick=()=>{s=[h.dataset.k,s[0]===h.dataset.k?-s[1]:-1];draw()})};
  draw();}
const f1=v=>v==null?"":(+v).toFixed(1), f2=v=>v==null?"":(+v).toFixed(2), pc=v=>v==null?"":Math.round(v*100)+"%";
function filters(rows,key,render){const pos=["GK","DEF","MID","FWD"];const clubs=[...new Set(rows.map(r=>r[key]))].sort();
  $("#main").insertAdjacentHTML("afterbegin",`<div class="bar"><input id="q" placeholder="Search player"><select id="fp"><option value="">All positions</option>${pos.map(p=>`<option>${p}</option>`).join("")}</select><select id="fc"><option value="">All clubs</option>${clubs.map(c=>`<option>${c}</option>`).join("")}</select></div>`);
  const go=()=>{const q=$("#q").value.toLowerCase(),p=$("#fp").value,c=$("#fc").value;render(rows.filter(r=>(!q||String(r.player||r.web_name).toLowerCase().includes(q))&&(!p||r.pos===p)&&(!c||r[key]===c)))};
  ["#q","#fp","#fc"].forEach(s=>$(s).oninput=go);go();}
function players(){const rows=D.players;if(!rows)return $("#main").innerHTML='<p class="note warn">No player data yet (run fpl-daily).</p>';
  $("#main").innerHTML=`<p class="note">Season stats from the FPL API, prices and ownership from the FanTeam season game (id 1131482). Only players in the FanTeam game are listed. Weekly-contest prices differ (see Slate). Tap a header to sort.</p><div class="tw" id="t"></div>`;
  filters(rows,"team_short",r=>table([["web_name","Player",(v,r)=>`<a href="#player-${r.id}">${esc(v)}</a>`,1],["team_short","Club",null,1],["pos","Pos",null,1],["ft_price","FT £",f1],["ft_prev","Chg",(v,r)=>r.ft_prev==null?"":(r.ft_price-r.ft_prev>0?"+":"")+(r.ft_price-r.ft_prev).toFixed(1)],["ft_owned","Own%",f1],["ft_capt","Cap%",f1],["ft_pts","FT pts",f1],["ft_form","Form",f1],["ft_lineup","Lineup",null,1],["status","FPL"],["apps","Apps"],["starts","Starts"],["minutes","Mins"],["goals_scored","G"],["assists","A"],["clean_sheets","CS"],["saves","Sv"],["shots_on_target","SoT"],["sot_per90","SoT/90",f2],["goals_scored_p90","G/90",f2],["assists_p90","A/90",f2]],r,"t",["minutes",-1]));}
function expo(){const B=D.build,m={};if(!B)return{m,comps:{},n:{}};const comps=B.comps||{All:null},n={};
  Object.entries(comps).forEach(([k,ids])=>{const ent=ids||[...new Set(B.rows.map(r=>r.entry))];n[k]=ent.length;m[k]={};B.rows.filter(r=>ent.includes(r.entry)).forEach(r=>{const x=m[k][r.player]=m[k][r.player]||{n:0,c:0};x.n++;if(r.role==="C")x.c++})});return{m,comps,n}}
const EV=[["pts_appearance","app"],["pts_goal","goal"],["pts_assist","ast"],["pts_clean_sheet","CS"],["pts_shot_on_target","SoT"],["pts_saves","saves"],["pts_win_loss","W/L"],["pts_goals_conceded","GC"]];
const why=r=>EV.filter(([k])=>r[k]!=null&&Math.abs(r[k])>=0.15).sort((a,b)=>Math.abs(r[b[0]])-Math.abs(r[a[0]])).slice(0,4).map(([k,l])=>l+" "+(r[k]>0?"":"")+f1(r[k])).join(", ");
function slate(){const S=D.slate;if(!S)return $("#main").innerHTML='<p class="note warn">No slate yet.</p>';
  const X=expo(),names=Object.keys(X.comps);let cur=names[0];
  $("#main").innerHTML=`<p class="note">${esc(S.code)} (tournament ${S.tournament}): budget ${S.budget}, max ${S.max_per_club} per club, lock ${esc(S.lock_utc)}. Projection ${S.frozen?"FROZEN":'<span class="warn">NOT frozen (draft)</span>'}. xPts = our expected FanTeam points (untested model: a ranking, not a promise). Lineup = FanTeam flag. Start = our start chance. Both comps share one pool and one set of prices. Own lw = share of lineups last week (${esc(S.own_note||"n/a")}); Own season = FanTeam season-game ownership. Ownership for this week is not published before lock. Events = biggest parts of xPts.</p>${names.length?`<div class="bar" id="cb">${names.map(k=>`<button class="pill ${k===cur?"on":""}" data-k="${esc(k)}">${esc(k)}</button>`).join("")}</div>`:""}<div class="tw" id="t"></div>`;
  const draw=()=>{const ex=(X.m[cur]||{}),n=X.n[cur]||0;const rows=S.rows.map(r=>({...r,mine:(ex[r.player]||{}).n||0,why:why(r),star:SL.short.has(r.player)?1:0,my:SL.ov[r.player]??null}));
    filters(rows,"club",r=>table([["star","☆",(v,r)=>`<button class="sb" data-a="star" data-p="${esc(r.player)}">${SL.short.has(r.player)?"★":"☆"}</button>`],["player","Player",null,1],["club","Club",null,1],["pos","Pos",null,1],["price","£",f1],["xp","xPts",f2],["my","My xPts",(v,r)=>`<button class="sb" data-a="ov" data-p="${esc(r.player)}">${r.player in SL.ov?"<b>"+f2(SL.ov[r.player])+"</b>":"✎"}</button>`],["xp_per_m","xPts/£m",f2],["mine","Mine",v=>n?`${v}/${n}`:""],["lineup","Lineup",null,1],["p_start","Start",pc],["opp","Opp",null,1],["p_cs_team","CS%",pc],["p_anytime","Any G%",pc],["own_lw","Own lw",v=>v==null?"—":Math.round(v)+"%"],["own_ss","Own ssn",v=>v==null?"—":Math.round(v)+"%"],["why","Events",null,1]],r,"t",["xp",-1]))};
  SLinit(S);$("#main").insertAdjacentHTML("afterbegin",'<div class="card" id="slw"></div>');const redraw=()=>{document.querySelectorAll(".bar:not(#cb)").forEach(e=>e.remove());draw();SLbar(S)};
  $("#t").onclick=e=>{const b=e.target.closest(".sb");if(!b)return;const p=b.dataset.p;if(isLocked(S))return alert("Locked: shortlist and overrides are closed.");
    if(b.dataset.a==="star"){SL.short.has(p)?SL.short.delete(p):SL.short.add(p)}
    else{const v=prompt(`Your xPts for ${p} (blank = remove the override). Model: ${f2((S.rows.find(r=>r.player===p)||{}).xp)}`,p in SL.ov?SL.ov[p]:"");if(v===null)return;if(v.trim()==="")delete SL.ov[p];else if(isNaN(+v))return alert("Not a number.");else SL.ov[p]=Math.round(+v*100)/100}
    SL.dirty=true;b.innerHTML=b.dataset.a==="star"?(SL.short.has(p)?"★":"☆"):(p in SL.ov?"<b>"+f2(SL.ov[p])+"</b>":"✎");SLbar(S)};
  redraw();SLlive(S,redraw);document.querySelectorAll("#cb .pill").forEach(b=>b.onclick=()=>{cur=b.dataset.k;document.querySelectorAll("#cb .pill").forEach(x=>x.classList.toggle("on",x===b));redraw()})}
/* E5 shortlist (☆) and xPts overrides (✎ = 'my score') -> analysis/<slate>/shortlist.json + overrides.json. Overrides change the
   NEXT build only (lineup_build.py reads them); the saved projection is not touched, so scoring stays clean. */
let SL=null;
function SLinit(S){if(SL&&SL.folder===S.folder)return;SL={folder:S.folder,short:new Set(S.shortlist||[]),ov:{...(S.overrides||{})},dirty:false,sha:{},live:false}}
async function SLlive(S,redraw){if(!GH.token()||SL.live||SL.dirty)return;try{const[a,b]=await Promise.all(["shortlist","overrides"].map(k=>getJ(`analysis/${S.folder}/${k}.json`)));
  SL.sha={shortlist:a.sha,overrides:b.sha};SL.short=new Set((a.j&&a.j.players)||[]);SL.ov={...((b.j&&b.j.players)||{})};SL.live=true;redraw()}catch(e){SL.err=e.message;SLbar(S)}}
function SLbar(S){const el=$("#slw");if(!el)return;const n=SL.short.size,k=Object.keys(SL.ov).length,lk=isLocked(S);
  el.innerHTML=`<h3>Shortlist ☆ ${n} · Overrides ✎ ${k} <small>${lk?"locked":SL.dirty?'<span class="warn">not saved</span>':SL.live?"saved in repo":GH.token()?"as of the last site build":"this page only"}</small></h3>
  <p class="note">Tap ☆ to shortlist, ✎ to set your own xPts. Overrides replace the model's xPts in the next build (Build tab → Rebuild, or a chat); the projection file is not changed. ${k?"Overrides: "+Object.entries(SL.ov).map(([p,v])=>esc(p)+" "+f2(v)).join(", ")+".":""}${SL.err?' <span class="warn">Repo read failed: '+esc(SL.err)+"</span>":""}</p>
  ${lk?"":SL.dirty?(GH.token()?'<button class="pill on" id="sl-save">Save to repo</button> <span class="note" id="sl-msg"></span>':'<p class="note warn">No token on this device: <a href="#settings">add it</a> to save (edits are lost when you leave this page).</p>'):""}`;
  const b=$("#sl-save");if(b)b.onclick=async()=>{b.disabled=true;const m=$("#sl-msg");m.textContent="Saving…";
    try{if(!SL.live){const[a,c]=await Promise.all(["shortlist","overrides"].map(x=>getJ(`analysis/${S.folder}/${x}.json`)));SL.sha={shortlist:a.sha,overrides:c.sha}}
      SL.sha.shortlist=await GH.put(`analysis/${S.folder}/shortlist.json`,JSON.stringify({set_utc:nowIso(),players:[...SL.short].sort()},null,1)+"\n","Shortlist "+S.code+" (insite)",SL.sha.shortlist);
      SL.sha.overrides=await GH.put(`analysis/${S.folder}/overrides.json`,JSON.stringify({set_utc:nowIso(),note:"Ryan's xPts overrides from insite Slate; used by lineup_build.py",players:SL.ov},null,1)+"\n","Overrides "+S.code+" (insite)",SL.sha.overrides);
      SL.dirty=false;SL.live=true;SLbar(S)}catch(e){b.disabled=false;m.innerHTML='<span class="warn">Not saved:</span> '+esc(e.message)}}}
function matrix(){const S=D.slate;if(!S)return $("#main").innerHTML='<p class="note warn">No slate yet.</p>';
  let pos="MID";const draw=()=>{const R=S.rows.filter(r=>r.pos===pos&&r.xp!=null&&r.price!=null),F=R.filter(r=>r.p_start>=0.5&&r.xp>0);
    const n=F.length,mx=F.reduce((a,r)=>a+r.price,0)/n,my=F.reduce((a,r)=>a+r.xp,0)/n,sxx=F.reduce((a,r)=>a+(r.price-mx)**2,0),sxy=F.reduce((a,r)=>a+(r.price-mx)*(r.xp-my),0),b=sxy/sxx,a0=my-b*mx;
    const fair=r=>a0+b*r.price,res=R.map(r=>({...r,gap:r.xp-fair(r),fp:(r.xp-a0)/b}));
    const xs=R.map(r=>r.price),x0=Math.floor(Math.min(...xs)),x1=Math.ceil(Math.max(...xs)),y1=Math.ceil(Math.max(...R.map(r=>r.xp))),W=640,H=300,sx=v=>40+(v-x0)/(x1-x0||1)*(W-55),sy=v=>H-28-v/(y1||1)*(H-45);
    const dots=R.map(r=>`<circle cx="${sx(r.price)}" cy="${sy(Math.max(0,r.xp))}" r="${r.p_start>=0.5?4:2.5}" fill="hsl(${hue(r.club)},60%,50%)" opacity="${r.p_start>=0.5?.85:.4}"><title>${esc(r.player)} ${r.club} ${f1(r.price)}m, ${f2(r.xp)} xPts</title></circle>`).join("");
    const tb=(t,rs)=>`<div class="card"><h3>${t}</h3><div class="tw"><table><thead><tr><th class="l">Player</th><th class="l">Club</th><th>£</th><th>xPts</th><th>Fair £</th><th>Gap</th><th>Start</th><th class="l">Lineup</th></tr></thead><tbody>${rs.map(r=>`<tr><td class="l">${esc(r.player)}</td><td class="l">${esc(r.club)}</td><td>${f1(r.price)}</td><td>${f2(r.xp)}</td><td>${f1(r.fp)}</td><td>${(r.gap>0?"+":"")+f2(r.gap)}</td><td>${pc(r.p_start)}</td><td class="l">${esc(r.lineup||"")}</td></tr>`).join("")}</tbody></table></div></div>`;
    const pool=res.filter(r=>r.p_start>=0.5&&r.xp>0).sort((x,y)=>y.gap-x.gap);
    $("#main").innerHTML=`<div class="bar">${POS.map(p=>`<button class="pill ${p===pos?"on":""}" data-p="${p}">${p}</button>`).join("")}</div>
    <p class="note">Price v our xPts for ${S.code}. The line is a straight-line fit through players with a start chance of 50% or more (${n} players: xPts = ${f2(a0)} + ${f2(b)} x price). Fair £ = the price the line gives for that xPts. Gap = xPts above (+) or below (-) the line at that price. Projection ${S.frozen?"frozen":'<span class="warn">NOT frozen</span>'}; the line only says who the model likes relative to price, not who will score.</p>
    <div class="card"><div class="tw"><svg width="${W}" height="${H}"><line x1="${sx(x0)}" y1="${sy(Math.max(0,a0+b*x0))}" x2="${sx(x1)}" y2="${sy(Math.max(0,a0+b*x1))}" stroke="var(--acc)" stroke-width="1.5" stroke-dasharray="4 3"/>${dots}<text x="${W/2}" y="${H-6}" font-size="11" text-anchor="middle" fill="var(--mut)">Price (m)</text><text x="12" y="${H/2}" font-size="11" fill="var(--mut)" transform="rotate(-90 12 ${H/2})" text-anchor="middle">xPts</text><text x="40" y="${H-14}" font-size="10" fill="var(--mut)">${x0}</text><text x="${W-15}" y="${H-14}" font-size="10" fill="var(--mut)" text-anchor="end">${x1}</text></svg></div></div>
    ${tb("Most xPts for the price",pool.slice(0,10))}${tb("Least xPts for the price",pool.slice(-10).reverse())}`;
    document.querySelectorAll(".pill[data-p]").forEach(bt=>bt.onclick=()=>{pos=bt.dataset.p;draw()})};draw()}
function build(){const B=D.build,S=D.slate||{};if(!B)return $("#main").innerHTML='<p class="note warn">No build yet.</p>';
  const K=B.checks;if(!K)return $("#main").innerHTML=`<p class="note warn">No checks for this build${B.checks_error?": "+esc(B.checks_error):""}. Run model/build_checks.py.</p>`;
  const ok=v=>v?'<b style="color:var(--acc)">OK</b>':'<b class="warn">NO</b>',left=S.lock_utc?Math.round((new Date(S.lock_utc)-new Date())/60000):null;
  const tbl=(h,rows)=>`<div class="tw"><table><thead><tr>${h.map(x=>`<th class="${x[1]?"l":""}">${x[0]}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`;
  const sp=K.spread,cmax=o=>Math.max(0,...Object.values(o));
  const late=K.late_news.length?`<div class="card"><h3 class="warn">Late news check before lock (${K.late_news.length})</h3><p class="note">Players in the set with a start chance under 75%, an FPL status other than available, or a FanTeam lineup flag other than 'expected'. Team news comes about 1 hour before kick-off: check these first.</p>${tbl([["Player",1],["Club",1],["Lineups"],["Why",1]],K.late_news.map(r=>`<tr><td class="l">${esc(r.player)}</td><td class="l">${esc(r.club||"")}</td><td>${r.n}/${K.n_lineups}</td><td class="l">${esc(r.why)}</td></tr>`))}</div>`:`<div class="card"><h3>Late news check</h3><p class="note">No player in the set is flagged (start chance 75%+, FPL available, FanTeam 'expected'). Still check team news before lock.</p></div>`;
  const calls=tbl([["Player",1],["Call",1],["Range"],["In"],[""],["xPts"],["£"],["Why",1]],K.calls.map(r=>`<tr><td class="l">${esc(r.player)}</td><td class="l">${r.kind}</td><td>${r.lo}-${r.hi}</td><td>${r.n}</td><td>${ok(r.ok)}</td><td>${f2(r.xp)}</td><td>${f1(r.price)}</td><td class="l" style="white-space:normal;min-width:240px">${esc(r.why)}</td></tr>`));
  const themes=tbl([["Theme",1],["Captain",1],["Players",1],["Allowed"],["Used in",1]],K.themes.map(t=>`<tr><td class="l">${esc(t.name)}</td><td class="l">${esc(t.captain)}</td><td class="l">${t.players.map(esc).join(", ")}</td><td>${t.n?t.n.join("-"):""}</td><td class="l">${t.used.length?"lineup "+t.used.join(", "):'<i>not used</i>'}</td></tr>`));
  const lus=tbl([["Lineup",1],["Theme",1],["Captain",1],["GK",1],["Shape"],["£"],["xPts"],["Rules",1]],K.lineups.map(l=>`<tr><td class="l">${l.entry}</td><td class="l">${esc(l.theme||"—")}</td><td class="l">${esc(l.captain||"—")}</td><td class="l">${esc(l.gk||"—")}</td><td>${l.formation}</td><td>${f1(l.spend)}</td><td>${f2(l.xp)}</td><td class="l">${l.ok?ok(1):l.rules.filter(r=>!r.ok).map(r=>`<span class="warn">${esc(r.name)}: ${esc(r.detail)}</span>`).join("; ")}</td></tr>`));
  const typ=K.typing.map(t=>`<div class="card"><h3>${t.step}. Lineup ${t.entry} <small>${t.after==null?"type in full":`from lineup ${t.after}: ${t.ins.length} change${t.ins.length===1?"":"s"}`} · captain ${esc(t.captain||"—")}</small></h3>
    ${t.after==null?"":`<p class="note">Out: <b>${t.out.map(esc).join(", ")||"—"}</b><br>In: <b>${t.ins.map(esc).join(", ")||"—"}</b></p>`}
    ${POS.map(p=>`<div class="pr">${t.players.filter(r=>r.pos===p).map(r=>chip(r,r.c)).join("")}</div>`).join("")}</div>`).join("");
  const txt=K.typing.map(t=>`${t.step}. Lineup ${t.entry}${t.after==null?"":` (from ${t.after}: out ${t.out.join(", ")||"-"} | in ${t.ins.join(", ")||"-"})`}\n`+POS.map(p=>`  ${p}: `+t.players.filter(r=>r.pos===p).map(r=>r.player+(r.c?" (C)":"")).join(", ")).join("\n")).join("\n\n");
  $("#main").innerHTML=`<div class="card"><h3>${esc(S.code||K.folder)} · build checks <small>read-only</small></h3>
    <p class="note">Calls: <b class="${K.status==="agreed"?"":"warn"}">${esc(K.status||"none")}</b> · Projection: <b class="${S.frozen?"":"warn"}">${S.frozen?"FROZEN":"not frozen"}</b> (${esc(K.projection)}) · Lock ${esc(S.lock_utc||"?")}${left!=null?` (${left>0?Math.floor(left/60)+"h "+left%60+"m left":"LOCKED"})`:""}</p>
    <p class="note">${K.n_lineups} lineups (planned ${K.n_planned??"?"}) · rules: ${K.all_legal?ok(1)+" all legal":'<b class="warn">some lineups break a rule (see below)</b>'} · themed ${K.n_themed}${K.themed_min!=null?" (min "+K.themed_min+")":""} · ${K.typing_changes} player changes to type after lineup 1</p>
    <p class="note">Checks are recomputed from entries.csv each site build. Rules = player count, budget, positions, max per club, one captain. xPts include the captain bonus. Edits are made in the chat (calls.json), not here.</p></div>
    ${late}${THpanel(S,B)}${RBpanel(S,B)}${RQpanel(S,B,K)}
    <div class="card"><h3>Calls v the set</h3><p class="note">Each called player's range (lineups out of ${K.n_lineups}) and how many lineups hold him. Everyone else is capped at ${K.rotation_max}${K.over_rotation_max.length?': <span class="warn">over the cap: '+K.over_rotation_max.map(r=>esc(r.player)+" "+r.n).join(", ")+"</span>":" (none over)"}.</p>${calls}</div>
    <div class="card"><h3>Spread</h3><p class="note">Captains: <b>${sp.n_captains}</b> different in ${K.n_lineups} (most on one: ${cmax(sp.captains)}${sp.captain_max!=null?", limit "+sp.captain_max+" "+(sp.captain_ok?"OK":"BROKEN"):", no limit set"}). Goalkeepers: <b>${sp.n_gks}</b> different (most on one: ${cmax(sp.gks)}${sp.gk_max!=null?", limit "+sp.gk_max+" "+(sp.gk_ok?"OK":"BROKEN"):", no limit set"}). For reference, the GW10 winner (Damija) used 13 captains and 14 GKs in 15.</p>
    <p class="note">GKs: ${Object.entries(sp.gks).map(([k,v])=>esc(k)+" "+v).join(", ")}</p></div>
    ${K.themes.length?`<div class="card"><h3>Themes (one club's GK + DEF + attacker, attacker captained)</h3>${themes}</div>`:""}
    <div class="card"><h3>Lineups</h3>${lus}</div>
    <div class="card"><h3>Typing list</h3><p class="note">Order chosen so each lineup needs few changes from the one typed before it. Check the captain on every lineup: it changes each time.</p><button class="pill" id="cp">Copy as text</button> <span class="note" id="cpm"></span></div>${typ}`;
  THwire(S,B);RBwire(S,B);RQwire(S,B,K);
  $("#cp").onclick=()=>{(navigator.clipboard?navigator.clipboard.writeText(txt):Promise.reject()).then(()=>$("#cpm").textContent="Copied.",()=>$("#cpm").textContent="Copy failed: select the cards by hand.")}}

/* Outcome themes (Pick 6 / few-game slates, 22 Nov): pick the game outcomes you want lineups for and map players to each.
   Stored in analysis/<slate>/themes.json (made by model/scenarios.py, edited here, read by lineup_build.py). A theme = a player pool:
   every lineup built for it uses 6 players from that pool. n = how many of the lineups come from it. Save, then press Rebuild. */
let TH=null;
const thRow=n=>((D.slate&&D.slate.rows)||[]).find(r=>r.player===n)||{player:n};
function THinit(B){if(TH&&TH.folder===B.folder)return;TH={folder:B.folder,d:JSON.parse(JSON.stringify(B.scen||{themes:[],outcomes:{},games:[]})),dirty:false,sha:null,live:false,msg:"",err:""}}
async function THlive(S,B){if(!GH.token()||TH.live||TH.dirty)return;try{const g=await getJ(`analysis/${B.folder}/themes.json`);TH.sha=g.sha;if(g.j)TH.d=g.j;TH.live=true;THdraw(S,B)}catch(e){TH.err=e.message;THdraw(S,B)}}
function THchips(list,attr,id,lk,core){const L=(D.build&&D.build.scen&&D.build.scen.links)||{};return list.map(n=>{const r=thRow(n),k=L[n]||{},st=core&&core.includes(n);return`<span class="tag" ${st?'style="background:var(--acc);color:#fff"':""}>${attr==="th"&&!lk?`<span data-star="${esc(id)}" data-nm="${esc(n)}" style="cursor:pointer" title="star = defines this outcome (counts toward 'must include')">${st?"★":"☆"}</span> `:""}${esc(n)} <small>${esc(r.club||"")} ${esc(r.pos||"")} · xPts ${r.xp!=null?f1(r.xp):"–"} · att ${k.att!=null?f1(k.att):"–"} · cs ${k.cs!=null?f1(k.cs):"–"}</small>${lk?"":` <span data-${attr}="${esc(id)}" data-rm="${esc(n)}" style="cursor:pointer" title="remove">×</span>`}</span>`}).join(" ")}
function THadd(list,attr,id){const clubs=new Set(((D.slate&&D.slate.rows)||[]).map(r=>r.club)),opts=((D.slate&&D.slate.rows)||[]).filter(r=>r.xp!=null&&!list.includes(r.player)).sort((a,b)=>b.xp-a.xp);
  return`<select data-add="${attr}" data-id="${esc(id)}"><option value="">+ add player…</option>${opts.map(r=>`<option value="${esc(r.player)}">${esc(r.player)} · ${esc(r.club)} ${esc(r.pos)} · ${f1(r.xp)}${r.p_start!=null?" · start "+Math.round(r.p_start*100)+"%":""}</option>`).join("")}</select>`}
function THhtml(S,B){const d=TH.d,lk=isLocked(S),used=B.scen_used||{},nE=d.n_entries||(B.checks&&B.checks.n_planned)||10,on=d.themes.filter(t=>t.use);
  const lo=on.reduce((a,t)=>a+(t.n?+t.n[0]:0),0),hi=on.reduce((a,t)=>a+(t.n?+t.n[1]:nE),0);
  const games=(d.games||[]).map(g=>`<p class="note"><b>${esc(g.id)}</b>: ${esc(g.home)} win ${Math.round(g.p_home*100)}% · draw ${Math.round(g.p_draw*100)}% · ${esc(g.away)} win ${Math.round(g.p_away*100)}% · ${esc(g.home)} win + clean sheet ${Math.round(g.p_home_win_cs*100)}% · ${esc(g.away)} win + clean sheet ${Math.round(g.p_away_win_cs*100)}% · both score ${Math.round(g.p_both_score*100)}% · 3+ goals ${Math.round(g.p_3plus*100)}%</p>`).join("");
  const oc=Object.keys(d.outcomes||{}),ths=d.themes.map(t=>{const u=Object.entries(used).filter(([e,v])=>v.includes(t.name)).map(([e])=>e);
    return`<div class="card" style="margin:6px 0"><div><label><input type="checkbox" data-use="${t.id}" ${t.use?"checked":""} ${lk?"disabled":""}> <b>use</b></label> <input data-name="${t.id}" value="${esc(t.name)}" ${lk?"disabled":""} style="width:60%"> · lineups <input type="number" min="0" max="${nE}" data-n="${t.id}:0" value="${t.n?t.n[0]:0}" style="width:48px" ${lk?"disabled":""}>–<input type="number" min="0" max="${nE}" data-n="${t.id}:1" value="${t.n?t.n[1]:nE}" style="width:48px" ${lk?"disabled":""}> ${lk?"":`<button class="pill" data-del="${t.id}">delete</button>`}</div>
      <p class="note">Each lineup holds at least <input type="number" min="0" max="6" data-cm="${t.id}" value="${t.core_min||0}" style="width:44px" ${lk?"disabled":""}> of the ★ players (${(t.core||[]).length} starred). Outcome: ${(t.outcomes||[]).map(o=>`<span class="tag">${esc(o)}${d.outcomes&&d.outcomes[o]?" "+Math.round(d.outcomes[o].p*100)+"%":""}</span>`).join(" ")||"custom"} · pool ${t.players.length} players · ${used&&u.length?"used in lineup "+u.join(", "):"<i>not used in the current set</i>"}</p>
      <div>${THchips(t.players,"th",t.id,lk,t.core||[])} ${lk?"":THadd(t.players,"th",t.id)}</div></div>`}).join("");
  const ocs=oc.map(k=>{const o=d.outcomes[k];return`<div style="margin:4px 0"><b>${esc(k)}</b> <small>${Math.round(o.p*100)}% · ${esc(o.rule||"")}</small><br>${THchips(o.players,"oc",k,lk,null)} ${lk?"":THadd(o.players,"oc",k)}</div>`}).join("");
  const sel=id=>`<select id="${id}"><option value="">${id==="thA"?"outcome 1…":"outcome 2 (optional)…"}</option>${oc.map(k=>`<option>${esc(k)}</option>`).join("")}</select>`;
  return`<h3>Outcome themes <small>${lk?"locked":TH.dirty?'<span class="warn">not saved</span>':TH.live?"saved in repo":GH.token()?"as of the last site build":"this page only"}</small></h3>
  <p class="note">Pick the game outcomes you want lineups for, and which players belong to each. Every lineup for a theme takes all 6 players from its pool. GW10 data: lineups with all 6 players on winning teams cashed 80%; a defender or GK whose team conceded sank the lineup. <b>When any theme is ticked, the build uses the themes and ignores the anchors / core in calls.json.</b> Chances are bookmaker prices: 1X2 and clean sheet; win + clean sheet = clean sheet minus the 0-0 chance. <b>att</b> / <b>cs</b> = the player\'s xPts from goals + assists + shots on target / from a clean sheet, whatever his position.</p>${games}
  <p class="note">Lineups planned ${nE}: ticked themes allow ${lo}–${hi} <b class="${lo<=nE&&nE<=hi?"":"warn"}">${lo<=nE&&nE<=hi?"OK":"CANNOT FIT: change the ranges"}</b> · most lineups for one player <input type="number" min="1" max="${nE}" id="throt" value="${d.rotation_max||Math.round(.7*nE)}" style="width:52px" ${lk?"disabled":""}></p>
  ${ths||'<p class="note">No themes yet.</p>'}
  ${lk?"":`<p class="note">New theme from outcomes: ${sel("thA")} ${sel("thB")} <button class="pill" data-new="1">add theme</button></p>
  <details><summary class="note">Outcome → player map (edit once, new themes use it)</summary>${ocs}</details>
  ${GH.token()?`<button class="pill on" id="th-save" ${TH.dirty?"":"disabled"}>Save themes to repo</button> <span class="note">${esc(TH.msg)}${TH.err?' <span class="warn">'+esc(TH.err)+"</span>":""}</span> <span class="note">then press Rebuild below (or ask in the chat)</span>`:'<p class="note warn">No token on this device: <a href="#settings">add it</a> to save.</p>'}`}`}
function THdraw(S,B){const el=$("#thw");if(el)el.innerHTML=THhtml(S,B)}
function THpanel(S,B){if(!B.scen)return"";THinit(B);return`<div class="card" id="thw">${THhtml(S,B)}</div>`}
function THwire(S,B){const el=$("#thw");if(!el||!TH||isLocked(S)&&false)return;THlive(S,B);const d=()=>TH.d,mark=()=>{TH.dirty=true;TH.msg="";THdraw(S,B)},th=id=>d().themes.find(t=>t.id===id);
  el.onclick=async e=>{const sr=e.target.closest("[data-star]");if(sr){const x=th(sr.dataset.star);x.core=x.core||[];const i=x.core.indexOf(sr.dataset.nm);i>=0?x.core.splice(i,1):x.core.push(sr.dataset.nm);mark();return}
    const rm=e.target.closest("[data-rm]");if(rm){const a=rm.dataset.th!=null?th(rm.dataset.th):d().outcomes[rm.dataset.oc],i=a.players.indexOf(rm.dataset.rm);if(i>=0){a.players.splice(i,1);if(a.core)a.core=a.core.filter(x=>x!==rm.dataset.rm);mark()}return}
    const del=e.target.closest("[data-del]");if(del){d().themes=d().themes.filter(t=>t.id!==del.dataset.del);mark();return}
    if(e.target.closest("[data-new]")){const A=$("#thA").value,Bo=$("#thB").value;if(!A)return alert("Pick at least one outcome.");const outs=[A,Bo].filter(Boolean),pl=[];outs.forEach(o=>d().outcomes[o].players.forEach(x=>{if(!pl.includes(x))pl.push(x)}));
      const id="t"+Date.now().toString(36);d().themes.push({id,name:outs.join(", "),use:true,n:[1,3],outcomes:outs,players:pl});mark();return}
    if(e.target.id==="th-save"){const b=e.target;b.disabled=true;TH.msg="Saving…";THdraw(S,B);
      try{if(!TH.live){const g=await getJ(`analysis/${B.folder}/themes.json`);TH.sha=g.sha}
        TH.d.set_utc=nowIso();TH.d.status="draft";TH.sha=await GH.put(`analysis/${B.folder}/themes.json`,JSON.stringify(TH.d,null,1)+"\n","Themes "+S.code+" (insite)",TH.sha);TH.dirty=false;TH.live=true;TH.msg="Saved.";TH.err=""}
      catch(x){TH.err="Not saved: "+x.message;TH.msg=""}THdraw(S,B)}};
  el.onchange=e=>{const t=e.target;if(t.dataset.add){const v=t.value;if(!v)return;const a=t.dataset.add==="th"?th(t.dataset.id):d().outcomes[t.dataset.id];if(!a.players.includes(v))a.players.push(v);mark();return}
    if(t.dataset.use){th(t.dataset.use).use=t.checked;mark();return}
    if(t.dataset.cm){th(t.dataset.cm).core_min=Math.max(0,Math.min(6,Math.round(+t.value||0)));mark();return}
    if(t.dataset.name){th(t.dataset.name).name=t.value.trim()||"theme";mark();return}
    if(t.dataset.n){const[id,k]=t.dataset.n.split(":"),x=th(id);x.n=x.n||[0,d().n_entries||10];x.n[+k]=Math.max(0,Math.round(+t.value||0));mark();return}
    if(t.id==="throt"){d().rotation_max=Math.max(1,Math.round(+t.value||1));mark()}}}
/* E5 Rebuild button: commits analysis/<slate>/rebuild_request.json; the `build` Action (scripts/run_rebuild.py) re-runs
   daily_proj (if not frozen) -> lineup_build (same calls + your overrides) -> build_checks and commits rebuild_result.json.
   Off from 5 min before lock (the Action refuses too). The page polls the result file. */
const RB_MARGIN=5*60e3;
function RBsum(r){if(!r)return"";const w=r.finished_utc?KO(r.finished_utc)+" Malta":"";
  if(r.status!=="ok")return`<p class="note warn">Last rebuild ${esc(w)}: ${esc(r.status)}${r.error?": "+esc(r.error):""}</p>`;
  const sw=Object.entries(r.swaps||{}).map(([e,x])=>`<li>Lineup ${esc(e)}: ${x.out.length?"OUT "+esc(x.out.join(", ")):""}${x.inn.length?" · IN "+esc(x.inn.join(", ")):""}${x.cap_was!==x.cap_now?" · captain "+esc(x.cap_was||"—")+" → "+esc(x.cap_now||"—"):""}</li>`).join("");
  return`<p class="note">Last rebuild ${esc(w)} (projection ${esc(r.projection||"")}): rules <b class="${r.all_legal?"":"warn"}">${r.all_legal?"all legal":"NOT all legal: do not enter, open a chat"}</b>, ${r.n_changed?r.n_changed+" lineup(s) changed":"no lineup changed"}.</p>${sw?`<ul class="note">${sw}</ul>`:""}`}
function RBpanel(S,B){const off=!S.lock_utc||isLocked(S,RB_MARGIN);
  const btn=!GH.token()?'<p class="note">Add your token on <a href="#settings">Settings</a> to use Rebuild.</p>':off?`<p class="note">${S.lock_utc?"Rebuild is off from 5 min before lock.":"No lock time on this slate: rebuild off."}</p>`:'<button class="pill on" id="rb">Refresh news + rebuild</button>';
  return`<div class="card"><h3>Rebuild</h3><p class="note">Refreshes FPL news and minutes, re-runs the projection (only if not frozen) and the build with the same calls and your saved overrides. About 5-8 min on GitHub, then ~1 min for this page. Lineups you already typed may change: the result lists every change. Do not press while a chat is building.</p>${btn}<div id="rb-msg">${RBsum(B.rebuild)}</div></div>`}
function RBwire(S,B){const btn=$("#rb");if(!btn)return;btn.onclick=async()=>{const msg=$("#rb-msg");
  if(!confirm("Refresh news and rebuild the set for "+S.code+"? Lineups you already typed may change."))return;
  const id=new Date().toISOString().replace(/[-:]/g,"").replace("T","-").slice(0,15),f=`analysis/${B.folder}/rebuild_request.json`;
  btn.disabled=true;msg.innerHTML='<p class="note">Sending…</p>';
  try{const cur=await GH.get(f);await GH.put(f,JSON.stringify({id,requested_utc:nowIso(),by:"page"},null,1)+"\n","Rebuild request "+S.code+" (insite)",cur.sha)}
  catch(e){msg.innerHTML='<p class="note warn">Could not send: '+esc(e.message)+"</p>";btn.disabled=false;return}
  const t0=Date.now(),tick=async()=>{if(!$("#rb-msg"))return;let r=null;
    try{r=(await getJ(`analysis/${B.folder}/rebuild_result.json`)).j}catch(e){}
    if(r&&r.id===id){$("#rb-msg").innerHTML=RBsum(r)+'<p class="note">The lists on this page update when the site rebuild finishes (~1 min). <a href="javascript:location.reload()">Reload</a></p>';btn.disabled=false;return}
    if(Date.now()-t0>15*60e3){$("#rb-msg").innerHTML='<p class="note warn">No result after 15 min. Check the build Action on GitHub, or open a chat.</p>';btn.disabled=false;return}
    $("#rb-msg").innerHTML=`<p class="note">Running on GitHub… ${Math.round((Date.now()-t0)/60e3)} min (usually 5-8).</p>`;setTimeout(tick,20e3)};setTimeout(tick,30e3)}}
/* E5 requests: ask, do not edit. More / Less / Remove / Include a player, or a note -> analysis/<slate>/requests.json.
   The next chat checks each against the data and writes status + answer; the calls change only when you agree. */
const RQK={more:"More",less:"Less",remove:"Remove",include:"Include",note:"Note"};
let RQ=null;
function RQlist(list){return list.length?`<div class="tw"><table><thead><tr><th class="l">Sent (Malta)</th><th class="l">Ask</th><th class="l">Player</th><th class="l">Your note</th><th class="l">Status</th><th class="l">Answer</th></tr></thead><tbody>${[...list].reverse().map(r=>`<tr><td class="l">${esc(KO(r.ts))}</td><td class="l">${esc(RQK[r.kind]||r.kind)}</td><td class="l">${esc(r.player||"")}</td><td class="l" style="white-space:normal">${esc(r.note||"")}</td><td class="l ${r.status==="open"?"warn":""}">${esc(r.status)}</td><td class="l" style="white-space:normal">${esc(r.answer||"")}</td></tr>`).join("")}</tbody></table></div>`:'<p class="note">No requests yet.</p>'}
function RQpanel(S,B,K){const lk=isLocked(S),names=[...new Set((D.slate&&D.slate.rows||[]).map(r=>r.player))].sort();
  return`<div class="card"><h3>Your requests</h3><p class="note">Ask, do not edit: the next chat checks each request against the data and answers here (agree / partly / disagree, with a range). The calls change only when you say agreed.</p>
  ${lk?'<p class="note">Locked: requests are closed.</p>':!GH.token()?'<p class="note">Add your token on <a href="#settings">Settings</a> to send requests.</p>':`<div class="bar"><select id="rq-k">${Object.entries(RQK).map(([k,l])=>`<option value="${k}">${l}</option>`).join("")}</select><input id="rq-p" list="rq-names" placeholder="Player (any in the pool)" style="min-width:180px"><datalist id="rq-names">${names.map(n=>`<option value="${esc(n)}">`).join("")}</datalist><input id="rq-n" placeholder="Why / how many lineups" style="flex:1;min-width:180px"><button class="pill on" id="rq-send">Send</button></div><p class="note" id="rq-msg"></p>`}
  <div id="rq-list">${RQlist(B.requests||[])}</div></div>`}
async function RQwire(S,B,K){const f=`analysis/${B.folder}/requests.json`;
  if(GH.token()){try{RQ=await getJ(f);if($("#rq-list"))$("#rq-list").innerHTML=RQlist((RQ.j&&RQ.j.requests)||[])}catch(e){}}
  const b=$("#rq-send");if(!b)return;b.onclick=async()=>{const kind=$("#rq-k").value,player=$("#rq-p").value.trim(),note=$("#rq-n").value.trim(),m=$("#rq-msg");
    if(kind!=="note"&&!player)return m.innerHTML='<span class="warn">Pick a player.</span>';if(kind==="note"&&!note)return m.innerHTML='<span class="warn">Write the note.</span>';
    b.disabled=true;m.textContent="Sending…";
    try{const cur=await getJ(f),j=cur.j||{slate:B.folder,requests:[]};j.requests.push({id:Date.now().toString(36),ts:nowIso(),kind,player:player||null,note,status:"open",answer:null});
      await GH.put(f,JSON.stringify(j,null,1)+"\n",`Request ${RQK[kind]}${player?" "+player:""} (insite)`,cur.sha);RQ={j};
      $("#rq-list").innerHTML=RQlist(j.requests);$("#rq-p").value="";$("#rq-n").value="";m.innerHTML='<b style="color:var(--acc)">Sent.</b> The next chat answers it.'}
    catch(e){m.innerHTML='<span class="warn">Not sent:</span> '+esc(e.message)}b.disabled=false}}

const POS=["GK","DEF","MID","FWD"],hue=c=>{let h=0;for(const ch of String(c))h=(h*31+ch.charCodeAt(0))%360;return h},short=n=>{const p=String(n).trim().split(/\s+/);return p.length>1?p.slice(1).join(" "):n};
const chip=(r,cap)=>`<span class="chip${cap?" capc":""}" style="border-left-color:hsl(${hue(r.club)},60%,50%)"><b>${esc(short(r.player))}</b>${cap?" (C)":""}<i>${esc(r.club)} ${f1(r.price)}</i></span>`;
function week(){const B=D.build,S=D.slate;if(!B||!S)return $("#main").innerHTML='<p class="note warn">No build yet.</p>';
  const comps=B.comps||{All:null},names=Object.keys(comps);let cur=names[0];
  const opp={};S.rows.forEach(r=>opp[r.club]=r.opp);
  const draw=()=>{const ids=comps[cur]||[...new Set(B.rows.map(r=>r.entry))],rows=B.rows.filter(r=>ids.includes(r.entry)),n=ids.length;
    const by={};rows.forEach(r=>(by[r.entry]=by[r.entry]||[]).push(r));
    const ex={};rows.forEach(r=>{const e=ex[r.player]=ex[r.player]||{r,n:0,c:0};e.n++;if(r.role==="C")e.c++});
    const exs=Object.values(ex).sort((a,b)=>b.n-a.n||POS.indexOf(a.r.pos)-POS.indexOf(b.r.pos)||b.r.xp-a.r.xp);
    const clubs={};rows.forEach(r=>clubs[r.club]=(clubs[r.club]||0)+1);
    const left=S.lock_utc?Math.round((new Date(S.lock_utc)-new Date())/60000):null;
    const cnt=exs.filter(e=>e.n>=n*0.7).length;
    const form=es=>{const k=p=>es.filter(r=>r.pos===p).length;return k("DEF")+"-"+k("MID")+"-"+k("FWD")};
    const fm={};Object.values(by).forEach(es=>{const f=form(es);fm[f]=(fm[f]||0)+1});
    $("#main").innerHTML=`<div class="bar">${names.map(k=>`<button class="pill ${k===cur?"on":""}" data-k="${esc(k)}">${esc(k)}</button>`).join("")}</div>
    <div class="card"><h3>${esc(S.code)} · tournament ${S.tournament} · budget ${S.budget} · max ${S.max_per_club} per club</h3>
    <p class="note">Build: <b class="${B.status==="agreed"?"":"warn"}">${esc(B.status)}</b> · Projection: <b class="${S.frozen?"":"warn"}">${S.frozen?"FROZEN":"not frozen"}</b> · Lock ${esc(S.lock_utc||"?")}${left!=null?` (${left>0?Math.floor(left/60)+"h "+left%60+"m left":"LOCKED"})`:""}</p>
    <p class="note">${esc(B.note||"")}</p></div>
    <div class="card"><h3>Shape: ${n} lineups</h3><p class="note">${cnt} players in 70%+ of lineups (the core). Formations: ${Object.entries(fm).sort((a,b)=>b[1]-a[1]).map(([f,k])=>`${f} ×${k}`).join(", ")}. Distinct captains: ${new Set(rows.filter(r=>r.role==="C").map(r=>r.player)).size} of ${n}.</p></div>
    <div class="card"><h3>Exposure (share of lineups)</h3>${exs.slice(0,28).map(e=>`<div class="ex"><span class="exn">${esc(e.r.player)} <i>${e.r.pos} ${e.r.club}</i></span><span class="exb"><u class="${e.n>=n*0.7?"core":""}" style="width:${e.n/n*100}%"></u></span><span class="exv">${e.n}/${n}${e.c?` · C×${e.c}`:""}</span></div>`).join("")}</div>
    <div class="card"><h3>Matrix (C = captain, dot = in lineup)</h3><div class="tw"><table class="mx"><thead><tr><th class="l">Player</th>${ids.map(i=>`<th>${i}</th>`).join("")}</tr></thead><tbody>${exs.map(e=>`<tr><td class="l"><span class="dot" style="background:hsl(${hue(e.r.club)},60%,50%)"></span>${esc(short(e.r.player))} <i>${e.r.pos}</i></td>${ids.map(i=>{const x=rows.find(r=>r.entry===i&&r.player===e.r.player);return `<td class="${x?(x.role==="C"?"mc":"mi"):""}">${x?(x.role==="C"?"C":"●"):""}</td>`}).join("")}</tr>`).join("")}</tbody></table></div></div>
    <div class="card"><h3>Clubs (player slots across lineups)</h3>${Object.entries(clubs).sort((a,b)=>b[1]-a[1]).map(([c,k])=>`<div class="ex"><span class="exn"><span class="dot" style="background:hsl(${hue(c)},60%,50%)"></span>${esc(c)} <i>v ${esc(opp[c]||"?")}</i></span><span class="exb"><u style="width:${k/(n*11)*100*4}%;max-width:100%"></u></span><span class="exv">${k}</span></div>`).join("")}</div>
    <div class="card"><h3>Captains</h3><div class="tw"><table><thead><tr><th class="l">Lineup</th><th class="l">Captain</th><th class="l">Club</th><th>Opp</th><th>xPts</th><th>Price</th></tr></thead><tbody>${ids.map(i=>{const c=(by[i]||[]).find(r=>r.role==="C");return c?`<tr><td class="l">${i}</td><td class="l">${esc(c.player)}</td><td class="l">${esc(c.club)}</td><td>${esc(opp[c.club]||"")}</td><td>${f2(c.xp)}</td><td>${f1(c.price)}</td></tr>`:""}).join("")}</tbody></table></div></div>
    ${ids.map(i=>{const es=by[i]||[],t=es.reduce((a,r)=>a+r.price,0),x=es.reduce((a,r)=>a+r.xp+(r.role==="C"?r.xp:0),0);
      return `<div class="card"><h3>Lineup ${i} · ${form(es)} · ${f1(t)}m of ${S.budget} · ${f1(x)} xPts incl. captain</h3>${POS.map(p=>`<div class="pr">${es.filter(r=>r.pos===p).map(r=>chip(r,r.role==="C")).join("")}</div>`).join("")}</div>`}).join("")}`;
    document.querySelectorAll(".pill").forEach(b=>b.onclick=()=>{cur=b.dataset.k;draw()})};
  draw()}

const KO=u=>{const d=new Date(u);return d.toLocaleString("en-GB",{weekday:"short",day:"numeric",month:"short",hour:"2-digit",minute:"2-digit",timeZone:"Europe/Malta"})};
let PM,PP,NX;
async function player(id){const p=(D.players||[]).find(x=>x.id===+id);if(!p)return $("#main").innerHTML='<p class="note warn">Player not found (only players in the FanTeam game are listed). <a href="#players">Back</a></p>';
  $("#main").innerHTML='<p class="note">Loading...</p>';
  if(!PM){[PM,PP,NX]=await Promise.all(["pm","past","next"].map(k=>J("data/"+k+".json")))}
  const log=(PM&&PM[id])||[],past=(PP&&PP[id])||[],nx=(NX&&NX[id])||{},pr=nx.props,ln=nx.line,fx=nx.fx||[];
  const app=log.filter(r=>r[3]>0),pts=log.map(r=>r[14]),avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;
  const last5=avg(app.slice(-5).map(r=>r[14])),all=avg(app.map(r=>r[14]));
  const W=Math.max(300,log.length*28),H=110,mx=Math.max(10,...pts),bar=log.map((r,i)=>{const h=Math.max(1,Math.max(0,r[14])/mx*(H-22));return `<g><rect x="${i*28+4}" y="${H-14-h}" width="20" height="${h}" fill="${r[3]===0?"#999":"var(--acc)"}" opacity="${r[3]===0?.4:1}"/><text x="${i*28+14}" y="${H-16-h}" font-size="10" text-anchor="middle" fill="var(--fg)">${r[3]>0?r[14]:""}</text><text x="${i*28+14}" y="${H-2}" font-size="9" text-anchor="middle" fill="var(--mut)">${r[0]}</text></g>`}).join("");
  const hdr=`<div class="card"><h3>${esc(p.first_name||"")} ${esc(p.web_name)} <small>${esc(p.team_short)} · ${p.pos}</small></h3>
    <p class="note">FanTeam price <b>${f1(p.ft_price)}</b>${p.ft_prev!=null&&p.ft_prev!==p.ft_price?` (was ${f1(p.ft_prev)})`:""} · owned ${f1(p.ft_owned)}% · captain ${f1(p.ft_capt)}% · FT points ${f1(p.ft_pts)} · form ${f1(p.ft_form)} · lineup flag: ${esc(p.ft_lineup||"n/a")}</p>
    <p class="note">FPL status: <b class="${p.status==="a"?"":"warn"}">${esc(p.status)}</b>${p.news?" · "+esc(p.news):""}</p>
    <p class="note">${p.apps} apps, ${p.starts} starts, ${p.minutes} mins · FPL pts per appearance ${f1(all)}, last 5 apps ${f1(last5)}</p></div>`;
  const props=pr?`<table class="kv"><tbody>
    ${pr.anytime!=null?`<tr><td class="l">Anytime scorer</td><td>${pc(pr.anytime)}</td><td class="l note">books ${esc(pr.anytime_book||"")}; includes margin${pr.pin!=null?`; Pinnacle ${pc(pr.pin)}`:""}</td></tr>`:""}
    ${pr.sot?Object.entries(pr.sot).sort((a,b)=>a[0]-b[0]).map(([l,v])=>`<tr><td class="l">Shots on target over ${l}</td><td>${pc(v)}</td><td class="l note">includes margin</td></tr>`).join(""):""}
    ${pr.assists!=null?`<tr><td class="l">Assist (over 0.5)</td><td>${pc(pr.assists)}</td><td class="l note">Fanduel only; includes margin</td></tr>`:""}</tbody></table><p class="note">Props fetched ${esc(pr.fetched||"")}. Probabilities are 1/price, so they sit a few points above fair.</p>`:'<p class="note">No props for this player (not listed yet, or not matched by name). Props appear about a day before kick-off.</p>';
  const line=ln?`<p class="note">${esc(p.team_short)} ${ln.home?"v":"at"} ${esc(ln.opp)}, ${KO(ln.start)}: expected goals for ${f2(ln.lam_for)}, against ${f2(ln.lam_ag)} · win ${pc(ln.p_win)}, draw ${pc(ln.p_draw)}, loss ${pc(ln.p_loss)} · clean sheet ${pc(ln.p_cs)}. From bookmaker totals; no margin removed.</p>`:"";
  const fxh=`<div class="tw"><table><thead><tr><th class="l">GW</th><th class="l">Opp</th><th>H/A</th><th class="l">Kick-off (Malta)</th><th>FPL diff</th></tr></thead><tbody>${fx.map(r=>`<tr><td class="l">${r[0]}</td><td class="l">${esc(r[1])}</td><td>${r[2]?"H":"A"}</td><td class="l">${KO(r[3])}</td><td>${r[4]}</td></tr>`).join("")}</tbody></table></div>`;
  const lg=`<div class="tw"><table><thead><tr><th class="l">GW</th><th class="l">Opp</th><th>Min</th><th>G</th><th>A</th><th>CS</th><th>Sv</th><th>GC</th><th>YC</th><th>RC</th><th>xG</th><th>xA</th><th>Bonus</th><th>FPL pts</th></tr></thead><tbody>${[...log].reverse().map(r=>`<tr><td class="l">${r[0]}</td><td class="l">${esc(r[1])} ${r[2]?"(H)":"(A)"}</td>${r.slice(3).map((v,i)=>`<td>${i>=8&&i<=9?f2(v):v}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  const ps=`<div class="tw"><table><thead><tr><th class="l">Season</th><th>End £</th><th>Pts</th><th>Min</th><th>Starts</th><th>G</th><th>A</th><th>CS</th><th>Sv</th><th>Bonus</th><th>xG</th><th>xA</th></tr></thead><tbody>${[...past].reverse().map(r=>`<tr><td class="l">${esc(r[0])}</td><td>${f1(r[1]/10)}</td>${r.slice(2).map((v,i)=>`<td>${i>=8?f2(v):v}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  $("#main").innerHTML=`<p class="note"><a href="#players">&larr; Players</a></p>${hdr}
    <div class="card"><h3>Next game</h3>${line}${props}</div>
    <div class="card"><h3>Next 5 fixtures</h3>${fxh}</div>
    <div class="card"><h3>Points per match (FPL points, this season; grey = did not play)</h3><div class="tw"><svg width="${W}" height="${H}">${bar}</svg></div><p class="note">FPL points, not FanTeam points. The FanTeam scoring differs (see METHOD.md) and needs tackles and recoveries, which are not in the match file yet.</p></div>
    <div class="card"><h3>Match log</h3>${log.length?lg:'<p class="note">No matches yet.</p>'}</div>
    <div class="card"><h3>Past seasons (FPL)</h3>${past.length?ps:'<p class="note">No past seasons on file.</p>'}</div>`;window.scrollTo(0,0)}

let FX,TS={};
async function fixtures(){$("#main").innerHTML='<p class="note">Loading...</p>';if(!FX)FX=await J("data/fixtures.json");
  if(!FX)return $("#main").innerHTML='<p class="note warn">No fixtures data yet.</p>';
  const inS=c=>(FX.slate_clubs||[]).includes(c),built=new Set(((D.build&&D.build.themes)||[]).map(t=>t.name==="CVC"?"COV":t.name));
  const games=FX.games.map(g=>`<tr><td class="l">${KO(g.start)}</td><td class="l">${esc(g.home)} v ${esc(g.away)}${inS(g.home)||inS(g.away)?"":' <i class="warn">not in contest</i>'}</td><td>${f2(g.lam_h)}</td><td>${f2(g.lam_a)}</td><td>${pc(g.p_h)}</td><td>${pc(g.p_d)}</td><td>${pc(g.p_a)}</td><td>${pc(g.p_cs_h)}</td><td>${pc(g.p_cs_a)}</td></tr>`).join("");
  const th=FX.themes;th.forEach(t=>{const sel=TS[t.club]||(TS[t.club]={g:0,d:0,a:0});const g=t.gk[sel.g],d=t.df[sel.d],a=t.at[sel.a];t._g=g;t._d=d;t._a=a;t.price=g.price+d.price+a.price;t.xp=g.xp+d.xp+a.xp;t.xpc=t.xp+a.xp;t.own=[g,d,a].some(x=>x.own==null)?null:(g.own+d.own+a.own)/3});
  const sortk=window._fxs||"xpc";th.sort((x,y)=>(y[sortk]||0)-(x[sortk]||0));
  const opts=(arr,k,cur)=>`<select data-k="${k}">${arr.map((x,i)=>`<option value="${i}" ${i===cur?"selected":""}>${esc(x.player)} ${f1(x.price)} · ${f2(x.xp)}${x.lineup!=="expected"?" ("+x.lineup+")":""}</option>`).join("")}</select>`;
  const draw=()=>{th.sort((x,y)=>(y[sortk]||0)-(x[sortk]||0));
    $("#themes").innerHTML=th.map(t=>{const sel=TS[t.club];return `<div class="card"><h3>${esc(t.club)} ${t.opp?(t.home?"v":"at")+" "+esc(t.opp):""} ${built.has(t.club)?'<span class="tag cap">in build</span>':""} <small>win ${pc(t.p_win)} · CS ${pc(t.p_cs)}</small></h3>
      <div class="bar" data-c="${t.club}">${opts(t.gk,"g",sel.g)}${opts(t.df,"d",sel.d)}${opts(t.at,"a",sel.a)}</div>
      <p class="note"><b>${f1(t.price)}m</b> · <b>${f2(t.xp)}</b> xPts, <b>${f2(t.xpc)}</b> with ${esc(t._a.player)} as captain · last week's ownership of the three: ${[t._g,t._d,t._a].map(x=>x.own==null?"—":Math.round(x.own*100)+"%").join(" / ")}${t.own!=null?` (avg ${Math.round(t.own*100)}%)`:""}</p></div>`}).join("");
    document.querySelectorAll("#themes select").forEach(se=>se.onchange=()=>{const c=se.parentNode.dataset.c;TS[c][se.dataset.k]=+se.value;const t=th.find(x=>x.club===c);const sl=TS[c],g=t.gk[sl.g],d=t.df[sl.d],a=t.at[sl.a];t.price=g.price+d.price+a.price;t.xp=g.xp+d.xp+a.xp;t.xpc=t.xp+a.xp;t._g=g;t._d=d;t._a=a;t.own=[g,d,a].some(x=>x.own==null)?null:(g.own+d.own+a.own)/3;draw()})};
  $("#main").innerHTML=`<div class="card"><h3>This week's games</h3><p class="note">Expected goals, result and clean-sheet chances come from bookmaker match totals and win odds (no margin removed). Times are Malta time.</p>
    <div class="tw"><table><thead><tr><th class="l">Kick-off</th><th class="l">Game</th><th>xG H</th><th>xG A</th><th>Home</th><th>Draw</th><th>Away</th><th>CS H</th><th>CS A</th></tr></thead><tbody>${games}</tbody></table></div></div>
    <div class="card"><h3>Club theme picker</h3><p class="note">One club's GK + DEF + attacker, the Weekly Special theme method (slate ${esc(FX.slate||"n/a")}, ${D.slate&&D.slate.frozen?"projection frozen":'<span class="warn">projection NOT frozen</span>'}). Each dropdown lists that club's best options by our xPts. The attacker is the captain: xPts with captain = sum + attacker again. Ownership = ${esc(FX.own_note||"n/a")} (last week, not this week's; — = in no lineup last week, or not in last week's pool). Players ruled out or flagged injured are left out.</p>
    <div class="bar">Sort: ${[["xpc","xPts with captain"],["xp","xPts"],["price","Price"],["own","Ownership"]].map(([k,l])=>`<button class="pill ${k===sortk?"on":""}" data-s="${k}">${l}</button>`).join("")}</div>
    ${(FX.skipped||[]).length?`<p class="note warn">Not listed: ${FX.skipped.map(x=>esc(x.club)+" (no "+x.missing.join(", ")+")").join("; ")}. ${FX.no_xp} slate players have no xPts (not matched to FPL data), for example Alisson.</p>`:""}</div><div id="themes"></div>`;
  document.querySelectorAll(".pill[data-s]").forEach(b=>b.onclick=()=>{window._fxs=b.dataset.s;fixtures()});draw()}
function season(){ // E6: summary from meta.season + the full season manager (season/index.html, its own bundle.json)
  const s=D.meta&&D.meta.season;if(!s)return $("#main").innerHTML='<p class="note warn">No season data in this build (run season_pull).</p>';
  const stale=s.last_finished_gw!=null&&s.squad_round<s.last_finished_gw, c=s.cash||{};
  const gap=v=>v==null?"":`<span class="${v>=0?"":"warn"}">${v>=0?"+":""}${v.toFixed(1)}</span>`;
  $("#main").innerHTML=`<div class="card"><h3>Season game <small>${esc(s.entrants)} entrants</small></h3>
   <p class="note">Squads from GW${esc(s.squad_round)}, pulled ${esc(s.pulled)}. Next GW ${esc(s.next_round)}.${s.ratings?"":" No club ratings in bundle."}</p>
   ${stale?`<p class="note warn">Stale: GW${s.last_finished_gw} has finished but these squads are GW${s.squad_round}. Run the season_pull Action; the site rebuilds after it.</p>`:""}
   <p><a class="pill" href="season/">Open season manager</a></p></div>
   <div class="card"><h3>Lines <small>points</small></h3><table class="kv"><tr><td class="l">Leader</td><td>${f1(c.leader)}</td></tr><tr><td class="l">Top 100</td><td>${f1(c.p100)}</td></tr>
   <tr><td class="l">Top 500</td><td>${f1(c.p500)}</td></tr><tr><td class="l">Cash line (rank ${esc(c.rank)}, ${esc(c.paid)} paid)</td><td>${f1(c.score)}</td></tr></table></div>
   <div class="tw"><table><thead><tr><th class="l">Entry</th><th>Rank</th><th>Pts</th><th>v cash</th><th>v top 500</th><th>FT</th><th>Bank</th></tr></thead><tbody>
   ${s.entries.map(e=>`<tr><td class="l">${esc(e.name)}</td><td>${esc(e.rank)}</td><td>${f1(e.score)}</td><td>${gap(c.score!=null?e.score-c.score:null)}</td><td>${gap(c.p500!=null?e.score-c.p500:null)}</td><td>${esc(e.free)}</td><td>${f1(e.funds)}</td></tr>`).join("")}</tbody></table></div>
   <p class="note">FT = free transfers. Gaps are points to the line at the last pull. Full tools (gaps and pack, transfer impact, Appeal, ratings, fixtures) are in the season manager.</p>`}
const V={week,players,slate,matrix,build,fixtures,season,settings};
function soon(v){$("#main").innerHTML=`<p class="note">${esc(v)}: not built yet (see PLAN stage 6 in the repo).</p>`}
function route(){const v=(location.hash||"#week").slice(1);if(v.startsWith("player-")){nav("players");return player(v.slice(7))}nav(v);(V[v]||(()=>soon(v)))()}
(async()=>{const[m,p,s,b]=await Promise.all(["meta","players","slate","build"].map(k=>J("data/"+k+".json")));D={meta:m,players:p,slate:s,build:b};
  $("#foot").textContent=m?`Built ${m.built} from commit ${m.commit}. FPL data run: ${m.fpl_run||"n/a"}.`:"";window.onhashchange=route;route()})();
})();
