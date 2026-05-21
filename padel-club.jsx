import { useState, useEffect, useMemo } from "react";

const COLORS = ["#00e676","#ff6b35","#00b0ff","#e040fb","#ffea00","#ff4444","#00bfa5","#ff6d00","#f472b6","#a78bfa"];
const uid = () => Math.random().toString(36).slice(2,10);
const today = () => new Date().toISOString().slice(0,10);

function calcWinner(sets) {
  let a=0,b=0;
  (sets||[]).forEach(s=>{const t1=+s.t1||0,t2=+s.t2||0;if(t1>t2)a++;else if(t2>t1)b++;});
  return a>b?1:b>a?2:0;
}

const store={
  get:async k=>{try{const r=await window.storage?.get(k);return r?.value?JSON.parse(r.value):null}catch{return null}},
  set:async(k,v)=>{try{await window.storage?.set(k,JSON.stringify(v))}catch{}}
};

const DEMO=[
  {id:"p1",name:"Diogo Azambuja",color:COLORS[0]},
  {id:"p2",name:"Filipe Cerqueira",color:COLORS[1]},
  {id:"p3",name:"Jorge Freitas",color:COLORS[2]},
  {id:"p4",name:"António Gomes",color:COLORS[3]},
];

const emptyGame=()=>({id:uid(),date:today(),team1:["",""],team2:["",""],sets:[{t1:"",t2:""},{t1:"",t2:""},{t1:"",t2:""}],beers:{}});

export default function App(){
  const[tab,setTab]=useState("cal");
  const[players,setPlayers]=useState(DEMO);
  const[games,setGames]=useState([]);
  const[ready,setReady]=useState(false);
  const[edit,setEdit]=useState(null);

  useEffect(()=>{(async()=>{const p=await store.get("pl");const g=await store.get("gm");if(p)setPlayers(p);if(g)setGames(g);setReady(true);})();},[]);
  useEffect(()=>{if(ready)store.set("pl",players);},[players,ready]);
  useEffect(()=>{if(ready)store.set("gm",games);},[games,ready]);

  const saveGame=g=>{setGames(p=>{const i=p.findIndex(x=>x.id===g.id);return i>=0?p.map((x,j)=>j===i?g:x):[g,...p]});setEdit(null);setTab("cal");};
  const delGame=id=>setGames(p=>p.filter(g=>g.id!==id));
  const goNew=g=>{setEdit(g||null);setTab("new");};

  return(
    <div className="app">
      <style>{CSS}</style>
      <header className="hdr">
        <div className="hl"><span className="hi">🎾</span><div><div className="hn">PADEL CLUB</div><div className="hb">powered by diogo azambuja</div></div></div>
        <div className="hc">{games.length} jogos</div>
      </header>
      <main className="main">
        {tab==="cal" &&<CalTab players={players} games={games} onEdit={goNew} onDel={delGame}/>}
        {tab==="new" &&<NewTab players={players} initial={edit} onSave={saveGame} onCancel={()=>{setEdit(null);setTab("cal");}}/>}
        {tab==="team"&&<TeamTab players={players} setPlayers={setPlayers} games={games}/>}
        {tab==="stat"&&<StatsTab players={players} games={games}/>}
      </main>
      <nav className="nav">
        {[{id:"cal",i:"📅",l:"Jogos"},{id:"new",i:"➕",l:"Novo Jogo"},{id:"team",i:"👥",l:"Jogadores"},{id:"stat",i:"🏆",l:"Rankings"}].map(({id,i,l})=>(
          <button key={id} className={`nb${tab===id?" on":""}`} onClick={()=>{setEdit(null);setTab(id);}}>
            <span className="ni">{i}</span><span className="nl">{l}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

function CalTab({players,games,onEdit,onDel}){
  const gp=id=>players.find(p=>p.id===id)||{id,name:"?",color:"#555"};
  const grouped=useMemo(()=>{const m={};[...games].sort((a,b)=>b.date.localeCompare(a.date)).forEach(g=>{const k=g.date.slice(0,7);(m[k]=m[k]||[]).push(g);});return Object.entries(m);},[games]);
  if(!games.length)return(<div className="empty"><div style={{fontSize:52}}>🎾</div><div className="et">Sem jogos registados</div><div className="es">Cria o primeiro jogo!</div></div>);
  return(<div className="scr">{grouped.map(([mo,gs])=>(<div key={mo}><div className="mhdr">{fmtMo(mo)}</div>{gs.map(g=><GCard key={g.id} g={g} gp={gp} onEdit={onEdit} onDel={onDel}/>)}</div>))}</div>);
}

function GCard({g,gp,onEdit,onDel}){
  const[open,setOpen]=useState(false);
  const w=calcWinner(g.sets);
  const t1=(g.team1||[]).map(gp),t2=(g.team2||[]).map(gp);
  const sets=(g.sets||[]).filter(s=>s.t1!==""||s.t2!=="");
  const s1=sets.filter(s=>(+s.t1||0)>(+s.t2||0)).length;
  const s2=sets.filter(s=>(+s.t2||0)>(+s.t1||0)).length;
  return(
    <div className="gc">
      <div className="gct" onClick={()=>setOpen(o=>!o)}>
        <div className="gcd">{fmtDate(g.date)}</div>
        <div className="gm2">
          <div className={`gt${w===1?" gw":""}`}>
            <div className="gds">{t1.map(p=><span key={p.id} className="dot" style={{background:p.color}}/>)}</div>
            <span className="gns">{t1.map(p=>p.name).join(" & ")}</span>
            <span className="gsc">{s1}</span>
          </div>
          <span className="gvs">vs</span>
          <div className={`gt gtr${w===2?" gw":""}`}>
            <span className="gsc">{s2}</span>
            <span className="gns">{t2.map(p=>p.name).join(" & ")}</span>
            <div className="gds">{t2.map(p=><span key={p.id} className="dot" style={{background:p.color}}/>)}</div>
          </div>
        </div>
        <span className="garr">{open?"▲":"▼"}</span>
      </div>
      {open&&(
        <div className="gcb">
          <div className="gsets">{sets.map((s,i)=>(<div key={i} className="sr"><span className="srl">Set {i+1}</span><span className={`srv${(+s.t1||0)>(+s.t2||0)?" sw":""}`}>{s.t1}</span><span className="srd">—</span><span className={`srv${(+s.t2||0)>(+s.t1||0)?" sw":""}`}>{s.t2}</span></div>))}</div>
          {g.beers&&Object.values(g.beers).some(v=>+v>0)&&(
            <div className="gbrs"><div className="gsec">🍺 Cervejas</div><div className="bcl">{Object.entries(g.beers).filter(([,v])=>+v>0).map(([pid,v])=>{const p=gp(pid);return<span key={pid} className="bc" style={{borderColor:p.color}}>{p.name} {v}🍺</span>;})}</div></div>
          )}
          <div className="gacts">
            <button className="abtn edit" onClick={()=>onEdit(g)}>✏️ Editar</button>
            <button className="abtn del" onClick={()=>{if(confirm("Apagar este jogo?"))onDel(g.id);}}>🗑️ Apagar</button>
          </div>
        </div>
      )}
    </div>
  );
}

function NewTab({players,initial,onSave,onCancel}){
  const[f,setF]=useState(initial||emptyGame());
  useEffect(()=>{setF(initial||emptyGame());},[initial]);
  const setTm=(tm,i,v)=>setF(p=>({...p,[tm]:p[tm].map((x,j)=>j===i?v:x)}));
  const setSet=(i,side,v)=>setF(p=>({...p,sets:p.sets.map((s,j)=>j===i?{...s,[side]:v}:s)}));
  const addSet=()=>setF(p=>({...p,sets:[...p.sets,{t1:"",t2:""}]}));
  const remSet=i=>setF(p=>({...p,sets:p.sets.filter((_,j)=>j!==i)}));
  const setBeer=(pid,v)=>setF(p=>({...p,beers:{...p.beers,[pid]:Math.max(0,+v||0)}}));
  const allSel=[...f.team1,...f.team2].filter(Boolean);
  const active=[...f.team1,...f.team2].filter(Boolean);
  const canSave=f.team1.every(Boolean)&&f.team2.every(Boolean)&&f.date&&f.sets.some(s=>s.t1!==""||s.t2!=="");
  return(
    <div className="scr sf">
      <div className="ft">{initial?"Editar Jogo":"Novo Jogo"}</div>
      <div className="fg"><label className="fl">📅 Data</label><input className="fi" type="date" value={f.date} onChange={e=>setF(p=>({...p,date:e.target.value}))}/></div>
      <div className="fg">
        <label className="fl">👥 Equipas</label>
        <div className="tgrid">
          <div className="tc"><div className="tch t1h">Equipa 1</div>{[0,1].map(i=><PSel key={i} players={players} value={f.team1[i]} onChange={v=>setTm("team1",i,v)} allSel={allSel} myVal={f.team1[i]}/>)}</div>
          <div className="vsm">VS</div>
          <div className="tc"><div className="tch t2h">Equipa 2</div>{[0,1].map(i=><PSel key={i} players={players} value={f.team2[i]} onChange={v=>setTm("team2",i,v)} allSel={allSel} myVal={f.team2[i]}/>)}</div>
        </div>
      </div>
      <div className="fg">
        <label className="fl">🎾 Sets</label>
        {f.sets.map((s,i)=>(
          <div key={i} className="sir">
            <span className="sil">Set {i+1}</span>
            <input className="si" type="number" min="0" max="99" placeholder="—" value={s.t1} onChange={e=>setSet(i,"t1",e.target.value)}/>
            <span className="sis">—</span>
            <input className="si" type="number" min="0" max="99" placeholder="—" value={s.t2} onChange={e=>setSet(i,"t2",e.target.value)}/>
            {i>=3&&<button className="sirm" onClick={()=>remSet(i)}>✕</button>}
          </div>
        ))}
        <button className="aset" onClick={addSet}>+ Adicionar Set</button>
      </div>
      {active.length>0&&(
        <div className="fg">
          <label className="fl">🍺 Cervejas por Jogador</label>
          <div className="bg2">{active.map(pid=>{const p=players.find(x=>x.id===pid);if(!p)return null;return(
            <div key={pid} className="br"><span className="brd" style={{background:p.color}}/><span className="brn">{p.name}</span>
              <div className="bc3"><button className="bcb" onClick={()=>setBeer(pid,(f.beers[pid]||0)-1)}>−</button><span className="bcn">{f.beers[pid]||0}</span><button className="bcb" onClick={()=>setBeer(pid,(f.beers[pid]||0)+1)}>+</button></div>
            </div>
          );})}</div>
        </div>
      )}
      <div className="fa"><button className="btnc" onClick={onCancel}>Cancelar</button><button className="btns" onClick={()=>canSave&&onSave(f)} disabled={!canSave}>{initial?"Guardar Alterações":"Registar Jogo"}</button></div>
    </div>
  );
}

function PSel({players,value,onChange,allSel,myVal}){
  return(<select className={`ps${value?" psv":""}`} value={value} onChange={e=>onChange(e.target.value)}><option value="">— Jogador —</option>{players.map(p=><option key={p.id} value={p.id} disabled={allSel.includes(p.id)&&p.id!==myVal}>{p.name}</option>)}</select>);
}

function TeamTab({players,setPlayers,games}){
  const[name,setName]=useState("");
  const[color,setColor]=useState(COLORS[0]);
  const[editing,setEditing]=useState(null);
  const add=()=>{if(!name.trim())return;setPlayers(p=>[...p,{id:uid(),name:name.trim(),color}]);setName("");};
  const del=id=>{if(games.some(g=>[...g.team1,...g.team2].includes(id))){alert("Jogador tem jogos registados.");return;}setPlayers(p=>p.filter(x=>x.id!==id));};
  const gs=id=>{let w=0,g=0;games.forEach(gm=>{if(![...gm.team1,...gm.team2].includes(id))return;g++;const wn=calcWinner(gm.sets);if((gm.team1.includes(id)&&wn===1)||(gm.team2.includes(id)&&wn===2))w++;});return{w,g};};
  const startEdit=p=>setEditing({id:p.id,name:p.name,color:p.color});
  const saveEdit=()=>{if(!editing.name.trim())return;setPlayers(p=>p.map(x=>x.id===editing.id?{...x,name:editing.name.trim(),color:editing.color}:x));setEditing(null);};
  return(
    <div className="scr">
      <div className="ft">Jogadores</div>
      <div className="pg">{players.map(p=>{
        const s=gs(p.id);
        if(editing?.id===p.id) return(
          <div key={p.id} className="pc pce">
            <div className="pcav" style={{background:editing.color}}>{editing.name[0]?.toUpperCase()||"?"}</div>
            <div className="pci pef">
              <input className="fi pei" value={editing.name} onChange={e=>setEditing(v=>({...v,name:e.target.value}))} onKeyDown={e=>{if(e.key==="Enter")saveEdit();if(e.key==="Escape")setEditing(null);}} autoFocus/>
              <div className="cp" style={{marginTop:8}}>{COLORS.map(c=><button key={c} className={`cd${editing.color===c?" cda":""}`} style={{background:c}} onClick={()=>setEditing(v=>({...v,color:c}))}/>)}</div>
              <div className="pea">
                <button className="btnc peb" onClick={()=>setEditing(null)}>Cancelar</button>
                <button className="btns peb" onClick={saveEdit}>Guardar</button>
              </div>
            </div>
          </div>
        );
        return(<div key={p.id} className="pc"><div className="pcav" style={{background:p.color}}>{p.name[0].toUpperCase()}</div><div className="pci"><div className="pcn">{p.name}</div><div className="pcs">{s.g} jogos · {s.w} vitórias</div></div><button className="pcd" title="Editar" onClick={()=>startEdit(p)}>✏️</button><button className="pcd" onClick={()=>del(p.id)}>✕</button></div>);
      })}</div>
      <div className="fg" style={{marginTop:24}}>
        <label className="fl">➕ Adicionar Jogador</label>
        <input className="fi" placeholder="Nome do jogador" value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&add()}/>
        <div className="cp" style={{marginTop:10}}>{COLORS.map(c=><button key={c} className={`cd${color===c?" cda":""}`} style={{background:c}} onClick={()=>setColor(c)}/>)}</div>
        <button className="btns" style={{width:"100%",marginTop:12}} onClick={add}>Adicionar</button>
      </div>
    </div>
  );
}

function StatsTab({players,games}){
  const[cat,setCat]=useState(0);
  const st=useMemo(()=>calcStats(players,games),[players,games]);
  const CATS=[
    {l:"🏆 Vitórias",d:st.wins},
    {l:"📅 Mais Jogos",d:st.games},
    {l:"🛋️ Menos Jogos",d:st.least},
    {l:"🎾 Sets Ganhos",d:st.sets},
    {l:"📊 % Vitórias",d:st.rate,pct:true},
    {l:"🍺 Cervejas",d:st.beers},
    {l:"🔥 Streak",d:st.streak},
    {l:"🎯 Pontuação",d:st.pts},
  ];
  const cur=CATS[cat];
  return(
    <div className="scr">
      <div className="ft">Rankings</div>
      <div className="cscr">{CATS.map((c,i)=><button key={i} className={`catb${cat===i?" caton":""}`} onClick={()=>setCat(i)}>{c.l}</button>)}</div>
      <Podium data={cur.d} players={players} pct={cur.pct}/>
      <div className="rl">{cur.d.map((row,i)=>{const p=players.find(x=>x.id===row.id)||{name:"?",color:"#555"};return(<div key={row.id} className="rr"><span className="rrn">{i+1}</span><span className="rrd" style={{background:p.color}}/><span className="rrname">{p.name}</span><span className="rrv">{cur.pct?`${(row.v*100).toFixed(0)}%`:row.v}</span></div>);})}</div>
    </div>
  );
}

function Podium({data,players,pct}){
  if(!data?.length)return(<div className="empty" style={{minHeight:140}}><span style={{fontSize:32}}>📊</span><span className="es">Sem dados ainda</span></div>);
  const top3=data.slice(0,3);
  const order=[1,0,2],heights=[100,145,72],medals=["🥇","🥈","🥉"];
  return(
    <div className="pod">{order.map((pos,i)=>{const row=top3[pos];if(!row)return<div key={i} style={{flex:1}}/>;const p=players.find(x=>x.id===row.id)||{name:"?",color:"#888"};return(
      <div key={i} className="pcol">
        <div className="pinf"><div className="pmed">{medals[pos]}</div><div className="pname">{p.name}</div><div className="pval">{pct?`${(row.v*100).toFixed(0)}%`:row.v}</div></div>
        <div className="pbar" style={{height:heights[i],background:p.color+"bb"}}/>
      </div>
    );})}</div>
  );
}

function calcStats(players,games){
  const d={};
  players.forEach(p=>{d[p.id]={wins:0,games:0,sets:0,beers:0,streak:0,cur:0,pts:0};});
  [...games].sort((a,b)=>a.date.localeCompare(b.date)).forEach(g=>{
    const w=calcWinner(g.sets);
    [...(g.team1||[]),...(g.team2||[])].filter(Boolean).forEach(id=>{
      if(!d[id])return;
      d[id].games++;d[id].pts++;
      if(g.beers?.[id])d[id].beers+=+g.beers[id]||0;
      const inT1=g.team1.includes(id);
      (g.sets||[]).forEach(s=>{const t1=+s.t1||0,t2=+s.t2||0;if(inT1?t1>t2:t2>t1)d[id].sets++;});
      const won=(inT1&&w===1)||(!inT1&&w===2);
      if(won){d[id].wins++;d[id].pts+=3;d[id].cur++;d[id].streak=Math.max(d[id].streak,d[id].cur);}
      else{d[id].cur=0;}
    });
  });
  const srt=k=>players.map(p=>({id:p.id,v:d[p.id]?.[k]||0})).sort((a,b)=>b.v-a.v);
  const rate=players.filter(p=>(d[p.id]?.games||0)>0).map(p=>({id:p.id,v:(d[p.id].wins||0)/(d[p.id].games||1)})).sort((a,b)=>b.v-a.v);
  return{wins:srt("wins"),games:srt("games"),least:[...srt("games")].reverse(),sets:srt("sets"),rate,beers:srt("beers"),streak:srt("streak"),pts:srt("pts")};
}

function fmtDate(d){if(!d)return"";const[y,m,day]=d.split("-");return`${day}/${m}/${y}`;}
function fmtMo(d){const ms=["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];const[y,m]=d.split("-");return`${ms[+m-1]} ${y}`;}

const CSS=`
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Outfit:wght@300;400;500;600;700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
:root{--bg:#07101f;--card:#0d1a2e;--card2:#111f35;--bd:#1a2d47;--g:#00e676;--o:#ff6b35;--r:#ff4444;--t:#e0ecff;--mt:#4a6080;--rad:12px;}
.app{display:flex;flex-direction:column;height:100vh;background:var(--bg);font-family:'Outfit',sans-serif;color:var(--t);overflow:hidden;}
.hdr{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;background:var(--card);border-bottom:1px solid var(--bd);flex-shrink:0;}
.hl{display:flex;align-items:center;gap:10px;}.hi{font-size:22px;}
.hn{font-family:'Bebas Neue',sans-serif;font-size:20px;letter-spacing:2px;color:var(--g);}
.hb{font-size:10px;color:var(--mt);letter-spacing:1px;text-transform:uppercase;}
.hc{font-size:12px;color:var(--mt);}
.main{flex:1;overflow-y:auto;scrollbar-width:thin;scrollbar-color:var(--bd) transparent;}
.scr{padding:16px;max-width:600px;margin:0 auto;}.sf{padding-bottom:40px;}
.nav{display:flex;background:var(--card);border-top:1px solid var(--bd);flex-shrink:0;}
.nb{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;padding:10px 4px;background:none;border:none;color:var(--mt);cursor:pointer;}
.nb.on{color:var(--g);}.ni{font-size:17px;}.nl{font-size:10px;font-weight:500;letter-spacing:.3px;}
.empty{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:280px;gap:8px;padding:32px;}
.et{font-size:17px;font-weight:600;}.es{font-size:13px;color:var(--mt);}
.mhdr{font-family:'Bebas Neue',sans-serif;font-size:13px;letter-spacing:2px;color:var(--mt);padding:14px 2px 6px;}
.gc{background:var(--card);border:1px solid var(--bd);border-radius:var(--rad);margin-bottom:10px;overflow:hidden;}
.gct{display:flex;align-items:center;gap:10px;padding:13px 14px;cursor:pointer;}
.gcd{font-size:11px;color:var(--mt);min-width:50px;flex-shrink:0;}
.gm2{flex:1;display:flex;align-items:center;gap:6px;}
.gt{flex:1;display:flex;align-items:center;gap:6px;padding:5px 8px;border-radius:8px;}
.gt.gw{background:rgba(0,230,118,.1);border:1px solid rgba(0,230,118,.25);}
.gtr{flex-direction:row-reverse;}
.gds{display:flex;gap:3px;}.dot{width:8px;height:8px;border-radius:50%;display:block;}
.gns{flex:1;font-size:12px;font-weight:500;}.gtr .gns{text-align:right;}
.gsc{font-family:'Bebas Neue',sans-serif;font-size:24px;color:var(--g);}
.gvs{font-size:10px;color:var(--mt);font-weight:700;flex-shrink:0;}
.garr{font-size:9px;color:var(--mt);flex-shrink:0;}
.gcb{padding:4px 14px 14px;border-top:1px solid var(--bd);}
.gsets{padding:10px 0;display:flex;flex-direction:column;gap:5px;}
.sr{display:flex;align-items:center;gap:10px;}.srl{font-size:11px;color:var(--mt);width:40px;}
.srv{font-family:'Bebas Neue',sans-serif;font-size:20px;width:22px;text-align:center;}
.srv.sw{color:var(--g);}.srd{color:var(--mt);font-size:12px;}
.gbrs{margin-top:10px;}.gsec{font-size:11px;color:var(--mt);margin-bottom:5px;font-weight:500;}
.bcl{display:flex;flex-wrap:wrap;gap:5px;}.bc{font-size:11px;padding:2px 8px;border-radius:16px;border:1px solid;}
.gacts{display:flex;gap:8px;margin-top:12px;}
.abtn{padding:6px 13px;border-radius:8px;font-size:12px;cursor:pointer;font-family:'Outfit',sans-serif;border:1px solid;background:transparent;}
.abtn.edit{border-color:var(--bd);color:var(--t);}.abtn.del{border-color:var(--r);color:var(--r);}
.ft{font-family:'Bebas Neue',sans-serif;font-size:24px;letter-spacing:2px;color:var(--g);margin-bottom:20px;}
.fg{margin-bottom:18px;}
.fl{display:block;font-size:11px;font-weight:600;color:var(--mt);letter-spacing:.8px;text-transform:uppercase;margin-bottom:8px;}
.fi{width:100%;padding:10px 13px;background:var(--card2);border:1px solid var(--bd);border-radius:8px;color:var(--t);font-size:14px;font-family:'Outfit',sans-serif;outline:none;}
.fi:focus{border-color:var(--g);}
input[type="date"]::-webkit-calendar-picker-indicator{filter:invert(.5);}
.tgrid{display:grid;grid-template-columns:1fr auto 1fr;gap:8px;align-items:start;}
.tc{display:flex;flex-direction:column;gap:7px;}
.tch{font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;text-align:center;padding:4px 0;}
.t1h{color:var(--g);}.t2h{color:var(--o);}
.vsm{font-family:'Bebas Neue',sans-serif;font-size:20px;color:var(--mt);text-align:center;padding-top:28px;}
.ps{width:100%;padding:9px 10px;background:var(--card2);border:1px solid var(--bd);border-radius:8px;color:var(--mt);font-size:12px;font-family:'Outfit',sans-serif;outline:none;cursor:pointer;}
.ps.psv{color:var(--t);border-color:var(--g);}
select option{background:var(--card2);}
.sir{display:flex;align-items:center;gap:7px;margin-bottom:7px;}
.sil{font-size:11px;color:var(--mt);width:36px;flex-shrink:0;}
.si{width:48px;padding:7px 4px;background:var(--card2);border:1px solid var(--bd);border-radius:8px;color:var(--t);font-family:'Bebas Neue',sans-serif;font-size:20px;text-align:center;outline:none;-moz-appearance:textfield;}
.si::-webkit-outer-spin-button,.si::-webkit-inner-spin-button{-webkit-appearance:none;}
.si:focus{border-color:var(--g);}.sis{color:var(--mt);font-size:13px;}
.sirm{background:transparent;border:1px solid var(--r);color:var(--r);border-radius:6px;padding:4px 8px;cursor:pointer;font-size:11px;}
.aset{background:transparent;border:1px dashed var(--bd);color:var(--mt);padding:8px;border-radius:8px;cursor:pointer;font-size:12px;width:100%;font-family:'Outfit',sans-serif;margin-top:2px;}
.bg2{display:flex;flex-direction:column;gap:7px;}
.br{display:flex;align-items:center;gap:10px;background:var(--card2);padding:10px 12px;border-radius:8px;}
.brd{width:9px;height:9px;border-radius:50%;flex-shrink:0;}.brn{flex:1;font-size:13px;}
.bc3{display:flex;align-items:center;gap:8px;}
.bcb{width:26px;height:26px;border-radius:50%;background:var(--bd);border:none;color:var(--t);font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;}
.bcn{font-family:'Bebas Neue',sans-serif;font-size:22px;color:var(--g);min-width:20px;text-align:center;}
.fa{display:flex;gap:10px;margin-top:24px;}
.btnc,.btns{flex:1;padding:12px;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;font-family:'Outfit',sans-serif;border:none;}
.btnc{background:var(--card2);color:var(--mt);border:1px solid var(--bd);}
.btns{background:var(--g);color:#000;}
.btns:disabled{opacity:.4;cursor:not-allowed;}
.pg{display:flex;flex-direction:column;gap:7px;}
.pc{display:flex;align-items:center;gap:11px;background:var(--card2);padding:11px 13px;border-radius:10px;}
.pcav{width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'Bebas Neue',sans-serif;font-size:17px;color:#000;flex-shrink:0;}
.pci{flex:1;}.pcn{font-size:14px;font-weight:600;}.pcs{font-size:11px;color:var(--mt);margin-top:1px;}
.pcd{background:transparent;border:none;color:var(--mt);cursor:pointer;font-size:13px;padding:4px;}
.cp{display:flex;gap:7px;flex-wrap:wrap;}
.cd{width:26px;height:26px;border-radius:50%;border:2px solid transparent;cursor:pointer;}
.cda{border-color:#fff;transform:scale(1.2);}
.pce{flex-direction:column;align-items:stretch;gap:0;}
.pef{width:100%;}
.pei{padding:7px 10px;font-size:13px;margin-bottom:0;}
.pea{display:flex;gap:8px;margin-top:10px;}
.peb{flex:1;padding:8px;font-size:12px;}
.cscr{display:flex;gap:6px;overflow-x:auto;padding-bottom:12px;scrollbar-width:none;margin-bottom:16px;}
.cscr::-webkit-scrollbar{display:none;}
.catb{padding:5px 12px;border-radius:20px;border:1px solid var(--bd);background:transparent;color:var(--mt);font-size:11px;font-weight:500;cursor:pointer;white-space:nowrap;font-family:'Outfit',sans-serif;flex-shrink:0;}
.catb.caton{background:var(--g);border-color:var(--g);color:#000;font-weight:700;}
.pod{display:flex;align-items:flex-end;justify-content:center;gap:6px;height:210px;margin:16px 0;}
.pcol{display:flex;flex-direction:column;align-items:center;flex:1;max-width:120px;}
.pinf{text-align:center;margin-bottom:8px;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;}
.pmed{font-size:22px;}.pname{font-size:12px;font-weight:600;margin-top:3px;}
.pval{font-family:'Bebas Neue',sans-serif;font-size:24px;color:var(--g);}
.pbar{width:100%;border-radius:8px 8px 0 0;min-height:20px;}
.rl{display:flex;flex-direction:column;gap:5px;}
.rr{display:flex;align-items:center;gap:9px;background:var(--card2);padding:10px 13px;border-radius:8px;}
.rrn{font-family:'Bebas Neue',sans-serif;font-size:17px;color:var(--mt);min-width:20px;}
.rrd{width:9px;height:9px;border-radius:50%;flex-shrink:0;}
.rrname{flex:1;font-size:13px;font-weight:500;}
.rrv{font-family:'Bebas Neue',sans-serif;font-size:20px;color:var(--g);}
`;
