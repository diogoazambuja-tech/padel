import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "./supabase.js";

const COLORS = ["#00e676","#ff6b35","#00b0ff","#e040fb","#ffea00","#ff4444","#00bfa5","#ff6d00","#f472b6","#a78bfa"];
const uid = () => Math.random().toString(36).slice(2,10);
const today = () => new Date().toISOString().slice(0,10);

const MESH_CAMPO = {id:"mesh",name:"Mesh"};

const THEMES=[
  {id:"dark",  name:"Dark",  icon:"🌙", desc:"Azul escuro com verde néon"},
  {id:"blue",  name:"Azul",  icon:"🟦", desc:"Campo azul com padrão diamante"},
  {id:"green", name:"Verde", icon:"🟩", desc:"Campo verde com linhas brancas"},
];

function calcWinner(sets){
  let a=0,b=0;
  (sets||[]).forEach(s=>{const t1=+s.t1||0,t2=+s.t2||0;if(t1>t2)a++;else if(t2>t1)b++;});
  return a>b?1:b>a?2:0;
}

// Sorteio de equipas: mantém os jogadores já selecionados, completa até 4
// com aleatórios da base, e baralha os 4 pelos dois lados.
// 4 selecionados → baralha só esses; 1-3 → esses + aleatórios; 0 → 4 aleatórios.
function drawTeams(players,selectedIds){
  const sel=[...new Set(selectedIds.filter(Boolean))];
  const rest=players.map(p=>p.id).filter(id=>!sel.includes(id)).sort(()=>Math.random()-.5);
  const pool=[...sel,...rest].slice(0,4).sort(()=>Math.random()-.5);
  return{team1:[pool[0]||"",pool[1]||""],team2:[pool[2]||"",pool[3]||""]};
}

const DEMO=[
  {id:"p1",name:"Diogo Azambuja",color:COLORS[0]},
  {id:"p2",name:"Filipe Cerqueira",color:COLORS[1]},
  {id:"p3",name:"Jorge Freitas",color:COLORS[2]},
  {id:"p4",name:"António Gomes",color:COLORS[3]},
];

const emptyGame=(defaultCampo="")=>({
  id:uid(),date:today(),campo:defaultCampo,
  jogadoresFixos:true,
  team1:["",""],team2:["",""],
  jogadores:[],
  sets:[{t1:"",t2:""},{t1:"",t2:""},{t1:"",t2:""}],
  beers:{}
});

export default function App(){
  const[tab,setTab]=useState("cal");
  const[players,setPlayers]=useState([]);
  const[games,setGames]=useState([]);
  const[campos,setCamposState]=useState([]);
  const[defaultCampo,setDefaultCampoState]=useState("");
  // Lazy init so theme applies on first paint, before useEffect runs
  const[theme,setThemeState]=useState(()=>localStorage.getItem('padel_theme')||"dark");
  const[loading,setLoading]=useState(true);
  const[edit,setEdit]=useState(null);

  useEffect(()=>{
    (async()=>{
      const [{data:pl},{data:gm}]=await Promise.all([
        supabase.from('players').select('*').order('created_at'),
        supabase.from('games').select('*').order('date',{ascending:false}),
      ]);
      if(pl&&pl.length>0){setPlayers(pl);}
      else{const{data:ins}=await supabase.from('players').insert(DEMO).select();setPlayers(ins||DEMO);}
      if(gm)setGames(gm);
      const sc=localStorage.getItem('padel_campos');
      const sd=localStorage.getItem('padel_default_campo');
      if(sc){setCamposState(JSON.parse(sc));}
      else{setCamposState([MESH_CAMPO]);localStorage.setItem('padel_campos',JSON.stringify([MESH_CAMPO]));}
      if(sd){setDefaultCampoState(sd);}
      else{setDefaultCampoState(MESH_CAMPO.id);localStorage.setItem('padel_default_campo',MESH_CAMPO.id);}
      setLoading(false);
    })();
  },[]);

  const setCampos=c=>{setCamposState(c);localStorage.setItem('padel_campos',JSON.stringify(c));};
  const setDefaultCampo=d=>{setDefaultCampoState(d);localStorage.setItem('padel_default_campo',d);};
  const setTheme=t=>{setThemeState(t);localStorage.setItem('padel_theme',t);};

  const saveGame=async g=>{
    const{data}=await supabase.from('games').upsert(g).select().single();
    const saved=data||g;
    setGames(p=>{const i=p.findIndex(x=>x.id===saved.id);return i>=0?p.map((x,j)=>j===i?saved:x):[saved,...p];});
    setEdit(null);setTab("cal");
  };
  const delGame=async id=>{
    await supabase.from('games').delete().eq('id',id);
    setGames(p=>p.filter(g=>g.id!==id));
  };
  const editGame=g=>{setEdit(g||null);setTab("new");};

  const addPlayer=async p=>{
    const{data}=await supabase.from('players').insert(p).select().single();
    setPlayers(prev=>[...prev,data||p]);
  };
  const savePlayer=async p=>{
    await supabase.from('players').update({name:p.name,color:p.color}).eq('id',p.id);
    setPlayers(prev=>prev.map(x=>x.id===p.id?{...x,...p}:x));
  };
  const delPlayer=async id=>{
    if(games.some(g=>[...(g.team1||[]),...(g.team2||[]),...(g.jogadores||[])].includes(id))){alert("Jogador tem jogos registados.");return;}
    await supabase.from('players').delete().eq('id',id);
    setPlayers(prev=>prev.filter(x=>x.id!==id));
  };

  if(loading)return(
    <div className="app" data-theme={theme}><style>{CSS}</style>
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100dvh',flexDirection:'column',gap:12}}>
        <div style={{fontSize:40}}>🎾</div>
        <div style={{color:'var(--mt)',fontSize:13,letterSpacing:1}}>A carregar...</div>
      </div>
    </div>
  );

  return(
    <div className="app" data-theme={theme}>
      <style>{CSS}</style>
      <header className="hdr">
        <div className="hl"><span className="hi">🎾</span><div><div className="hn">PADEL CLUB</div><div className="hb">powered by diogo azambuja</div></div></div>
        <div className="hc">{games.length} jogos</div>
      </header>
      <main className="main">
        {tab==="cal" &&<CalTab players={players} games={games} campos={campos}/>}
        {tab==="new" &&<NewTab players={players} initial={edit} onSave={saveGame} defaultCampo={defaultCampo} campos={campos} onCancel={()=>{setEdit(null);setTab("cal");}}/>}
        {tab==="live"&&<LiveTab players={players} campos={campos} defaultCampo={defaultCampo} onSaveGame={saveGame}/>}
        {tab==="stat"&&<StatsTab players={players} games={games}/>}
        {tab==="cfg" &&<ConfigTab players={players} games={games} campos={campos} setCampos={setCampos} defaultCampo={defaultCampo} setDefaultCampo={setDefaultCampo} onAddPlayer={addPlayer} onSavePlayer={savePlayer} onDelPlayer={delPlayer} onEditGame={editGame} onDelGame={delGame} theme={theme} setTheme={setTheme}/>}
      </main>
      <nav className="nav">
        {[{id:"cal",i:"📅",l:"Jogos"},{id:"new",i:"➕",l:"Novo"},{id:"live",i:"🔴",l:"Live"},{id:"stat",i:"🏆",l:"Rankings"},{id:"cfg",i:"⚙️",l:"Config"}].map(({id,i,l})=>(
          <button key={id} className={`nb${tab===id?" on":""}`} onClick={()=>{setEdit(null);setTab(id);}}>
            <span className="ni">{i}</span><span className="nl">{l}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

/* ── Cal Tab ────────────────────────────────────────────── */
function CalTab({players,games,campos}){
  const gp=id=>players.find(p=>p.id===id)||{id,name:"?",color:"#555"};
  const getCampo=id=>campos.find(c=>c.id===id)?.name||"";
  const grouped=useMemo(()=>{
    const m={};
    [...games].sort((a,b)=>b.date.localeCompare(a.date)).forEach(g=>{const k=g.date.slice(0,7);(m[k]=m[k]||[]).push(g);});
    return Object.entries(m);
  },[games]);
  if(!games.length)return(<div className="empty"><div style={{fontSize:52}}>🎾</div><div className="et">Sem jogos registados</div><div className="es">Cria o primeiro jogo!</div></div>);
  return(<div className="scr">{grouped.map(([mo,gs])=>(<div key={mo}><div className="mhdr">{fmtMo(mo)}</div>{gs.map(g=><GCard key={g.id} g={g} gp={gp} campo={getCampo(g.campo)}/>)}</div>))}</div>);
}

function GCard({g,gp,campo}){
  const[open,setOpen]=useState(false);
  const isFixed=g.jogadoresFixos!==false;
  const t1=(g.team1||[]).map(gp),t2=(g.team2||[]).map(gp);
  const allSets=(g.sets||[]).filter(s=>s.t1!==""||s.t2!=="");
  const s1=allSets.filter(s=>(+s.t1||0)>(+s.t2||0)).length;
  const s2=allSets.filter(s=>(+s.t2||0)>(+s.t1||0)).length;
  const w=calcWinner(g.sets);

  const shareGame=async()=>{
    const data=isFixed
      ?`${t1.map(p=>p.name).join(" & ")} ${s1}–${s2} ${t2.map(p=>p.name).join(" & ")}`
      :`${(g.jogadores||[]).map(id=>gp(id).name).join(", ")} — ${s1}–${s2}`;
    const text=`🎾 Padel ${fmtDate(g.date)}\n${data}${campo?`\n📍 ${campo}`:""}`;
    if(navigator.share){await navigator.share({title:"Jogo de Padel",text});}
    else{await navigator.clipboard?.writeText(text);alert("Copiado!");}
  };

  return(
    <div className="gc">
      <div className="gct" onClick={()=>setOpen(o=>!o)}>
        <div className="gcd">{fmtDate(g.date)}</div>
        {isFixed?(
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
        ):(
          <div className="gm2">
            <div className="grot">
              {(g.jogadores||[]).map(id=>{const p=gp(id);return<span key={id} className="dot" style={{background:p.color}}/>;})}&nbsp;
              <span className="gns" style={{fontSize:11}}>{(g.jogadores||[]).map(id=>gp(id).name).join(", ")}</span>
            </div>
            <span className="gsc" style={{marginLeft:'auto',flexShrink:0}}>{s1}–{s2}</span>
          </div>
        )}
        <span className="garr">{open?"▲":"▼"}</span>
      </div>
      {open&&(
        <div className="gcb">
          {campo&&<div className="gcampo">📍 {campo}</div>}
          {!isFixed&&<div className="gcampo" style={{color:'var(--g)'}}>🔄 Equipas rotativas por set</div>}
          <div className="gsets">
            {allSets.map((s,i)=>{
              const st1=!isFixed?(s.team1||[]).map(gp):null;
              const st2=!isFixed?(s.team2||[]).map(gp):null;
              return(
                <div key={i} className="sr">
                  <span className="srl">Set {i+1}</span>
                  {st1&&<span className="srt">{st1.map(p=>p.name).join(" & ")}</span>}
                  <span className={`srv${(+s.t1||0)>(+s.t2||0)?" sw":""}`}>{s.t1}</span>
                  <span className="srd">—</span>
                  <span className={`srv${(+s.t2||0)>(+s.t1||0)?" sw":""}`}>{s.t2}</span>
                  {st2&&<span className="srt" style={{textAlign:'right'}}>{st2.map(p=>p.name).join(" & ")}</span>}
                </div>
              );
            })}
          </div>
          {g.beers&&Object.values(g.beers).some(v=>+v>0)&&(
            <div className="gbrs"><div className="gsec">🍺 Cervejas</div><div className="bcl">{Object.entries(g.beers).filter(([,v])=>+v>0).map(([pid,v])=>{const p=gp(pid);return<span key={pid} className="bc" style={{borderColor:p.color}}>{p.name} {v}🍺</span>;})}</div></div>
          )}
          <div className="gacts">
            <button className="abtn share" onClick={shareGame}>📤 Partilhar</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── New Tab ────────────────────────────────────────────── */
function NewTab({players,initial,onSave,onCancel,defaultCampo,campos}){
  const[f,setF]=useState(()=>initial||emptyGame(defaultCampo));
  useEffect(()=>{setF(initial||emptyGame(defaultCampo));},[initial]);

  const isFixed=f.jogadoresFixos!==false;

  const setTm=(tm,i,v)=>setF(p=>({...p,[tm]:p[tm].map((x,j)=>j===i?v:x)}));
  const setScore=(i,side,v)=>setF(p=>({...p,sets:p.sets.map((s,j)=>j===i?{...s,[side]:v}:s)}));
  const setSetTeam=(si,tm,pi,v)=>setF(p=>({...p,sets:p.sets.map((s,j)=>{
    if(j!==si)return s;
    const t=[...(s[tm]||["",""])];t[pi]=v;return{...s,[tm]:t};
  })}));
  const addSet=()=>setF(p=>({...p,sets:[...p.sets,{t1:"",t2:"",team1:["",""],team2:["",""]}]}));
  const remSet=i=>setF(p=>({...p,sets:p.sets.filter((_,j)=>j!==i)}));
  const setBeer=(pid,v)=>setF(p=>({...p,beers:{...p.beers,[pid]:Math.max(0,+v||0)}}));
  const toggleFixed=()=>setF(p=>({...p,jogadoresFixos:!isFixed,team1:["",""],team2:["",""],jogadores:[]}));

  const sorteio=()=>{
    if(isFixed){
      const d=drawTeams(players,[...f.team1,...f.team2]);
      setF(p=>({...p,team1:d.team1,team2:d.team2}));
    } else {
      const jogs=f.jogadores.filter(Boolean);
      if(jogs.length<4)return;
      setF(p=>({...p,sets:p.sets.map(s=>{
        const sh=[...jogs].sort(()=>Math.random()-.5);
        return{...s,team1:[sh[0],sh[1]],team2:[sh[2],sh[3]]};
      })}));
    }
  };

  const allSel=isFixed?[...f.team1,...f.team2].filter(Boolean):f.jogadores.filter(Boolean);
  const active=allSel;
  const canDraw=isFixed?players.length>=4:f.jogadores.length>=4;
  const canSave=isFixed
    ?f.team1.every(Boolean)&&f.team2.every(Boolean)&&f.date&&f.sets.some(s=>s.t1!==""||s.t2!=="")
    :f.jogadores.filter(Boolean).length>=4&&f.date&&f.sets.some(s=>s.t1!==""||s.t2!=="");

  return(
    <div className="scr sf">
      <div className="ft">{initial?"Editar Jogo":"Novo Jogo"}</div>

      <div className="fg"><label className="fl">📅 Data</label>
        <input className="fi" type="date" value={f.date} onChange={e=>setF(p=>({...p,date:e.target.value}))}/>
      </div>

      {campos.length>0&&(
        <div className="fg"><label className="fl">📍 Campo</label>
          <select className="fi" style={{cursor:'pointer'}} value={f.campo||""} onChange={e=>setF(p=>({...p,campo:e.target.value}))}>
            <option value="">— Sem campo —</option>
            {campos.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      )}

      <div className="fg">
        <div className="tog-row">
          <div>
            <div style={{fontSize:12,fontWeight:600,color:'var(--t)',marginBottom:3}}>👥 Jogadores fixos</div>
            <div style={{fontSize:11,color:'var(--mt)'}}>{isFixed?"Equipas definidas para todo o jogo":"Equipas diferentes em cada set"}</div>
          </div>
          <button className={`tog${isFixed?" ton":""}`} onClick={toggleFixed}><span className="tog-k"/></button>
        </div>
      </div>

      {isFixed&&(
        <div className="fg"><label className="fl">👥 Equipas</label>
          <div className="tgrid">
            <div className="tc"><div className="tch t1h">Equipa 1</div>{[0,1].map(i=><PSel key={i} players={players} value={f.team1[i]} onChange={v=>setTm("team1",i,v)} allSel={allSel} myVal={f.team1[i]}/>)}</div>
            <div className="vsm">VS</div>
            <div className="tc"><div className="tch t2h">Equipa 2</div>{[0,1].map(i=><PSel key={i} players={players} value={f.team2[i]} onChange={v=>setTm("team2",i,v)} allSel={allSel} myVal={f.team2[i]}/>)}</div>
          </div>
        </div>
      )}

      {!isFixed&&(
        <div className="fg"><label className="fl">👥 Jogadores Participantes</label>
          <div className="rot-pool">
            {players.map(p=>{
              const sel=f.jogadores.includes(p.id);
              return(
                <button key={p.id} className={`pool-btn${sel?" psel":""}`} style={sel?{borderColor:p.color,color:'var(--t)'}:{}} onClick={()=>setF(prev=>({...prev,jogadores:sel?prev.jogadores.filter(x=>x!==p.id):[...prev.jogadores,p.id]}))}>
                  <span className="dot" style={{background:p.color}}/>{p.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {canDraw&&(
        <button className="aset sort-btn" onClick={sorteio}>🎲 Sortear Equipas</button>
      )}

      <div className="fg" style={{marginTop:8}}><label className="fl">🎾 Sets</label>
        {f.sets.map((s,i)=>(
          <div key={i} className={!isFixed?"set-block":""}>
            {!isFixed&&(
              <div className="tgrid" style={{marginBottom:8}}>
                <div className="tc">
                  <div className="tch t1h" style={{fontSize:10}}>Eq.1 — Set {i+1}</div>
                  {[0,1].map(pi=><PSel key={pi} players={players.filter(p=>f.jogadores.includes(p.id))} value={(s.team1||["",""])[pi]} onChange={v=>setSetTeam(i,"team1",pi,v)} allSel={[...((s.team1||[])),...((s.team2||[]))].filter(Boolean)} myVal={(s.team1||["",""])[pi]}/>)}
                </div>
                <div className="vsm" style={{paddingTop:22,fontSize:13}}>VS</div>
                <div className="tc">
                  <div className="tch t2h" style={{fontSize:10}}>Eq.2 — Set {i+1}</div>
                  {[0,1].map(pi=><PSel key={pi} players={players.filter(p=>f.jogadores.includes(p.id))} value={(s.team2||["",""])[pi]} onChange={v=>setSetTeam(i,"team2",pi,v)} allSel={[...((s.team1||[])),...((s.team2||[]))].filter(Boolean)} myVal={(s.team2||["",""])[pi]}/>)}
                </div>
              </div>
            )}
            <div className="sir">
              <span className="sil">Set {i+1}</span>
              <input className="si" type="number" min="0" max="99" placeholder="—" value={s.t1} onChange={e=>setScore(i,"t1",e.target.value)}/>
              <span className="sis">—</span>
              <input className="si" type="number" min="0" max="99" placeholder="—" value={s.t2} onChange={e=>setScore(i,"t2",e.target.value)}/>
              {i>=3&&<button className="sirm" onClick={()=>remSet(i)}>✕</button>}
            </div>
          </div>
        ))}
        <button className="aset" onClick={addSet}>+ Adicionar Set</button>
      </div>

      {active.length>0&&(
        <div className="fg"><label className="fl">🍺 Cervejas por Jogador</label>
          <div className="bg2">{active.map(pid=>{const p=players.find(x=>x.id===pid);if(!p)return null;return(
            <div key={pid} className="br"><span className="brd" style={{background:p.color}}/><span className="brn">{p.name}</span>
              <div className="bc3"><button className="bcb" onClick={()=>setBeer(pid,(f.beers[pid]||0)-1)}>−</button><span className="bcn">{f.beers[pid]||0}</span><button className="bcb" onClick={()=>setBeer(pid,(f.beers[pid]||0)+1)}>+</button></div>
            </div>
          );})}
          </div>
        </div>
      )}

      <div className="fa"><button className="btnc" onClick={onCancel}>Cancelar</button><button className="btns" onClick={()=>canSave&&onSave(f)} disabled={!canSave}>{initial?"Guardar Alterações":"Registar Jogo"}</button></div>
    </div>
  );
}

function PSel({players,value,onChange,allSel,myVal}){
  return(<select className={`ps${value?" psv":""}`} value={value} onChange={e=>onChange(e.target.value)}><option value="">— Jogador —</option>{players.map(p=><option key={p.id} value={p.id} disabled={allSel.includes(p.id)&&p.id!==myVal}>{p.name}</option>)}</select>);
}

/* ── Stats Tab ──────────────────────────────────────────── */
function StatsTab({players,games}){
  const[cat,setCat]=useState(0);
  const years=useMemo(()=>{
    const ys=[...new Set(games.map(g=>g.date?.slice(0,4)).filter(Boolean))].sort((a,b)=>b-a);
    return["all",...ys];
  },[games]);
  const[year,setYear]=useState("all");
  const filtered=useMemo(()=>year==="all"?games:games.filter(g=>g.date?.startsWith(year)),[games,year]);
  const st=useMemo(()=>calcStats(players,filtered),[players,filtered]);
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
      {years.length>1&&(
        <div className="cscr" style={{marginBottom:6}}>
          {years.map(y=><button key={y} className={`catb yr-btn${year===y?" caton":""}`} onClick={()=>setYear(y)}>{y==="all"?"Todos os anos":y}</button>)}
        </div>
      )}
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

/* ── Config Tab ─────────────────────────────────────────── */
function ConfigTab({players,games,campos,setCampos,defaultCampo,setDefaultCampo,onAddPlayer,onSavePlayer,onDelPlayer,onEditGame,onDelGame,theme,setTheme}){
  const[sec,setSec]=useState("jogadores");
  return(
    <div className="scr">
      <div className="ft">Configurações</div>
      <div className="cscr" style={{marginBottom:20}}>
        {[{id:"jogadores",l:"👥 Jogadores"},{id:"campos",l:"📍 Campos"},{id:"tema",l:"🎨 Tema"},{id:"watch",l:"⌚ Watch"},{id:"jogos",l:"🎾 Jogos"}].map(s=>(
          <button key={s.id} className={`catb${sec===s.id?" caton":""}`} onClick={()=>setSec(s.id)}>{s.l}</button>
        ))}
      </div>
      {sec==="jogadores"&&<PlayersSection players={players} games={games} onAdd={onAddPlayer} onSave={onSavePlayer} onDel={onDelPlayer}/>}
      {sec==="campos"&&<CamposSection campos={campos} setCampos={setCampos} defaultCampo={defaultCampo} setDefaultCampo={setDefaultCampo}/>}
      {sec==="tema"&&<ThemeSection theme={theme} setTheme={setTheme}/>}
      {sec==="watch"&&<WatchSection/>}
      {sec==="jogos"&&<GamesAdminSection games={games} players={players} onEdit={onEditGame} onDel={onDelGame}/>}
    </div>
  );
}

function ThemeSection({theme,setTheme}){
  return(
    <div>
      <div style={{fontSize:12,color:'var(--mt)',marginBottom:16,letterSpacing:.3}}>Escolhe o aspeto visual da app. A alteração é imediata.</div>
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {THEMES.map(t=>(
          <button key={t.id} className={`theme-card${theme===t.id?" theme-on":""}`} onClick={()=>setTheme(t.id)}>
            <div className={`theme-prev tp-${t.id}`}/>
            <div style={{flex:1,textAlign:'left'}}>
              <div style={{fontWeight:600,fontSize:14,color:'var(--t)',marginBottom:3}}>{t.icon} {t.name}</div>
              <div style={{fontSize:11,color:'var(--mt)'}}>{t.desc}</div>
            </div>
            <span style={{color:theme===t.id?'var(--g)':'var(--bd)',fontSize:20,flexShrink:0}}>{theme===t.id?"✓":"○"}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function CopyRow({label,value}){
  const[ok,setOk]=useState(false);
  const copy=async()=>{
    try{await navigator.clipboard.writeText(value);setOk(true);setTimeout(()=>setOk(false),1600);}
    catch{prompt("Copiar manualmente:",value);}
  };
  return(
    <div className="wrow">
      <div className="wri"><div className="wrl">{label}</div><div className="wrv">{value}</div></div>
      <button className={`wrc${ok?" wrok":""}`} onClick={copy}>{ok?"✓ Copiado":"Copiar"}</button>
    </div>
  );
}

function WatchSection(){
  const origin=window.location.origin;
  const rows=[
    {label:"🟢 Ponto Equipa 1",url:`${origin}/api/point?team=0`},
    {label:"🟠 Ponto Equipa 2",url:`${origin}/api/point?team=1`},
    {label:"↩️ Desfazer último ponto",url:`${origin}/api/point?undo=1`},
  ];
  const testar=async url=>{
    try{const r=await fetch(url);alert(await r.text());}
    catch{alert("Não foi possível contactar o servidor.");}
  };
  return(
    <div>
      <div style={{fontSize:12,color:'var(--mt)',marginBottom:16,lineHeight:1.5}}>
        Cada URL marca pontos no jogo do separador <b style={{color:'var(--t)'}}>🔴 Live</b> —
        sem chaves, sem cabeçalhos, sem configuração. Com um jogo ativo podes testar já aqui. 👇
      </div>
      <div className="fg"><label className="fl">🔗 URLs para os atalhos</label>
        {rows.map(r=>(
          <div key={r.url}>
            <CopyRow label={r.label} value={r.url}/>
            <button className="abtn edit" style={{marginTop:-2,marginBottom:9,fontSize:11,padding:'4px 10px'}} onClick={()=>testar(r.url)}>🧪 Testar</button>
          </div>
        ))}
      </div>
      <div className="fg"><label className="fl">⌚ Criar cada atalho (1 ação · ~1 min)</label>
        <ol style={{fontSize:12,lineHeight:2,paddingLeft:20,color:'var(--t)'}}>
          <li>App <b>Atalhos</b> → <b>+</b> → <b>Adicionar ação</b></li>
          <li>Pesquisa <b>"Obter conteúdos"</b> → escolhe <b>"Obter conteúdos do URL"</b> (categoria Web)</li>
          <li>Cola o URL — e mais nada (não mexas em método nem cabeçalhos)</li>
          <li>Dá o nome (ex.: 🟢 Ponto Eq.1) → <b>Concluído</b></li>
          <li>No ⓘ do atalho ativa <b>"Mostrar no Apple Watch"</b></li>
        </ol>
      </div>
      <div className="fg"><label className="fl">📟 Página-comando (sem atalhos)</label>
        <CopyRow label="Dois botões grandes — abre em qualquer browser" value={`${origin}/remote.html`}/>
        <div style={{fontSize:11,color:'var(--mt)',lineHeight:1.5,marginTop:4}}>
          Truque Apple Watch: envia este link para ti por <b style={{color:'var(--t)'}}>iMessage</b> e
          abre-o a partir da Mensagens no relógio — o Watch mostra a página com os botões, sem atalhos.
          Também serve para comandos Bluetooth: com o marcador aberto, as teclas ←/1 e →/2 marcam pontos
          e Backspace/↓ desfaz.
        </div>
      </div>
      <div style={{fontSize:11,color:'var(--mt)',lineHeight:1.5}}>
        Para o grupo: mantém o atalho premido → Partilhar → link iCloud → WhatsApp.
        Quem recebe instala com um toque. Sem jogo ativo os URLs não fazem nada.
      </div>
    </div>
  );
}

function PlayersSection({players,games,onAdd,onSave,onDel}){
  const[name,setName]=useState("");
  const[color,setColor]=useState(COLORS[0]);
  const[editing,setEditing]=useState(null);
  const add=()=>{if(!name.trim())return;onAdd({id:uid(),name:name.trim(),color});setName("");};
  const gs=id=>{
    let w=0,g=0;
    games.forEach(gm=>{
      const inGame=[...(gm.team1||[]),...(gm.team2||[]),...(gm.jogadores||[])].includes(id);
      if(!inGame)return;
      g++;
      if(gm.jogadoresFixos!==false){
        const wn=calcWinner(gm.sets);
        if(((gm.team1||[]).includes(id)&&wn===1)||((gm.team2||[]).includes(id)&&wn===2))w++;
      }
    });
    return{w,g};
  };
  const startEdit=p=>setEditing({id:p.id,name:p.name,color:p.color});
  const saveEdit=()=>{if(!editing.name.trim())return;onSave(editing);setEditing(null);};
  return(
    <div>
      <div className="pg">{players.map(p=>{
        const s=gs(p.id);
        if(editing?.id===p.id)return(
          <div key={p.id} className="pc pce">
            <div className="pcav" style={{background:editing.color}}>{editing.name[0]?.toUpperCase()||"?"}</div>
            <div className="pci pef">
              <input className="fi pei" value={editing.name} onChange={e=>setEditing(v=>({...v,name:e.target.value}))} onKeyDown={e=>{if(e.key==="Enter")saveEdit();if(e.key==="Escape")setEditing(null);}} autoFocus/>
              <div className="cp" style={{marginTop:8}}>{COLORS.map(c=><button key={c} className={`cd${editing.color===c?" cda":""}`} style={{background:c}} onClick={()=>setEditing(v=>({...v,color:c}))}/>)}</div>
              <div className="pea"><button className="btnc peb" onClick={()=>setEditing(null)}>Cancelar</button><button className="btns peb" onClick={saveEdit}>Guardar</button></div>
            </div>
          </div>
        );
        return(<div key={p.id} className="pc"><div className="pcav" style={{background:p.color}}>{p.name[0].toUpperCase()}</div><div className="pci"><div className="pcn">{p.name}</div><div className="pcs">{s.g} jogos · {s.w} vitórias</div></div><button className="pcd" title="Editar" onClick={()=>startEdit(p)}>✏️</button><button className="pcd" onClick={()=>onDel(p.id)}>✕</button></div>);
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

function CamposSection({campos,setCampos,defaultCampo,setDefaultCampo}){
  const[name,setName]=useState("");
  const addCampo=()=>{
    if(!name.trim())return;
    const novo={id:uid(),name:name.trim()};
    const next=[...campos,novo];
    setCampos(next);
    if(!defaultCampo)setDefaultCampo(novo.id);
    setName("");
  };
  const delCampo=id=>{
    const next=campos.filter(c=>c.id!==id);
    setCampos(next);
    if(defaultCampo===id)setDefaultCampo(next[0]?.id||"");
  };
  return(
    <div>
      {campos.length===0&&<div className="empty" style={{minHeight:80}}><span className="es">Sem campos definidos.</span></div>}
      <div className="pg">
        {campos.map(c=>(
          <div key={c.id} className="pc">
            <span style={{fontSize:18}}>📍</span>
            <div className="pci"><div className="pcn">{c.name}</div>{defaultCampo===c.id&&<div className="pcs" style={{color:'var(--g)'}}>Campo por defeito</div>}</div>
            <button className="pcd" style={{color:defaultCampo===c.id?'var(--g)':'var(--mt)',fontSize:15}} onClick={()=>setDefaultCampo(c.id)} title="Definir como padrão">⭐</button>
            <button className="pcd" onClick={()=>delCampo(c.id)}>✕</button>
          </div>
        ))}
      </div>
      <div className="fg" style={{marginTop:24}}>
        <label className="fl">➕ Adicionar Campo / Local</label>
        <input className="fi" placeholder="Ex: Campo Municipal, Padel Center…" value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addCampo()}/>
        <button className="btns" style={{width:"100%",marginTop:12}} onClick={addCampo}>Adicionar Campo</button>
      </div>
    </div>
  );
}

function GamesAdminSection({games,players,onEdit,onDel}){
  const gp=id=>players.find(p=>p.id===id)||{id,name:"?",color:"#555"};
  const sorted=[...games].sort((a,b)=>b.date.localeCompare(a.date));
  if(!games.length)return(<div className="empty" style={{minHeight:80}}><span className="es">Sem jogos registados</span></div>);
  return(
    <div>
      <div style={{fontSize:11,color:'var(--r)',marginBottom:14,padding:'8px 12px',background:'rgba(239,83,80,.08)',borderRadius:8,border:'1px solid rgba(239,83,80,.2)'}}>
        ⚠️ Editar ou anular jogos afeta os rankings e estatísticas
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {sorted.map(g=>{
          const isFixed=g.jogadoresFixos!==false;
          const t1=(g.team1||[]).map(gp),t2=(g.team2||[]).map(gp);
          const s1=(g.sets||[]).filter(s=>(+s.t1||0)>(+s.t2||0)).length;
          const s2=(g.sets||[]).filter(s=>(+s.t2||0)>(+s.t1||0)).length;
          return(
            <div key={g.id} className="gc" style={{padding:'10px 13px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:11,color:'var(--mt)',marginBottom:4}}>{fmtDate(g.date)}{!isFixed&&" · 🔄 rotativo"}</div>
                  <div style={{fontSize:12,fontWeight:500}}>
                    {isFixed
                      ?<>{t1.map(p=>p.name).join(" & ")} <span style={{color:'var(--g)',fontFamily:'Bebas Neue,sans-serif',fontSize:16}}>{s1}–{s2}</span> {t2.map(p=>p.name).join(" & ")}</>
                      :<>{(g.jogadores||[]).map(id=>gp(id).name).join(", ")} <span style={{color:'var(--g)',fontFamily:'Bebas Neue,sans-serif',fontSize:16}}>{s1}–{s2}</span></>
                    }
                  </div>
                </div>
                <div style={{display:'flex',gap:6,flexShrink:0}}>
                  <button className="abtn edit" style={{padding:'5px 10px',fontSize:13}} onClick={()=>onEdit(g)}>✏️</button>
                  <button className="abtn del" style={{padding:'5px 10px',fontSize:13}} onClick={()=>{if(confirm("Anular este jogo?"))onDel(g.id);}}>🗑️</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Live Tab ───────────────────────────────────────────── */
const PTLBL=["0","15","30","40","AD"];

// Deriva o resultado completo reproduzindo o log de pontos (0 = eq.1, 1 = eq.2).
// Desfazer = remover o último ponto do log. Melhor de 3 sets, tie-break a 6-6.
function deriveScore(log,format,firstServer){
  let pts=[0,0],games=[0,0],sets=[],tb=false,tbp=[0,0],finished=false,winner=0;
  // gp = jogos completados (o tie-break conta como um); a equipa a servir alterna
  // a cada jogo. No tie-break o 1.º ponto é de quem estava de serviço e depois
  // alterna a cada 2 pontos.
  let gp=0,tbStart=0;
  const winGame=t=>{
    const o=1-t;pts=[0,0];games=[...games];games[t]++;gp++;
    if(games[t]>=6&&games[t]-games[o]>=2){sets.push({t1:games[0],t2:games[1]});games=[0,0];}
    else if(games[t]===6&&games[o]===6){tb=true;tbp=[0,0];tbStart=firstServer!=null?(firstServer+gp)%2:0;}
  };
  for(const t of log){
    if(finished)break;
    const o=1-t;
    if(tb){
      tbp=[...tbp];tbp[t]++;
      if(tbp[t]>=7&&tbp[t]-tbp[o]>=2){
        games=[...games];games[t]++;
        sets.push({t1:games[0],t2:games[1]});
        games=[0,0];tb=false;tbp=[0,0];gp++;
      }
    }else{
      pts=[...pts];
      if(pts[t]===3&&pts[o]===3){if(format==='golden')winGame(t);else pts[t]=4;}
      else if(pts[t]===4)winGame(t);
      else if(pts[o]===4)pts[o]=3;
      else if(pts[t]===3)winGame(t);
      else pts[t]++;
    }
    const s1=sets.filter(s=>s.t1>s.t2).length,s2=sets.filter(s=>s.t2>s.t1).length;
    if(s1>=2||s2>=2){finished=true;winner=s1>s2?1:2;}
  }
  const s1=sets.filter(s=>s.t1>s.t2).length,s2=sets.filter(s=>s.t2>s.t1).length;
  let serving=null;
  if(firstServer!=null&&!finished){
    serving=tb?(tbStart+Math.floor((tbp[0]+tbp[1]+1)/2))%2:(firstServer+gp)%2;
  }
  return{pts,games,sets,tb,tbp,finished,winner,setsWon:[s1,s2],serving};
}

// Voz para anúncio de pontos (Web Speech API, pt-PT)
const PTSAY=["zero","quinze","trinta","quarenta"];
function speak(txt){
  try{
    if(!('speechSynthesis'in window))return;
    const u=new SpeechSynthesisUtterance(txt);
    u.lang='pt-PT';u.rate=1.05;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }catch{}
}
function useAnnounce(live,sc,names,enabled){
  const prev=useRef(null);
  useEffect(()=>{
    const len=(live.point_log||[]).length;
    const p=prev.current;
    prev.current={len,sc};
    if(!enabled||p===null||len===p.len)return;
    if(len<p.len){speak("Correção");return;}
    if(sc.finished){speak(`Jogo, set e partida! Vitória de ${names[sc.winner-1]}`);return;}
    if(sc.sets.length>p.sc.sets.length){speak(`Set! ${sc.setsWon[0]} a ${sc.setsWon[1]} em sets`);return;}
    if(sc.tb&&!p.sc.tb){speak("Jogo! Seis iguais — tie-break");return;}
    if(sc.games[0]!==p.sc.games[0]||sc.games[1]!==p.sc.games[1]){speak(`Jogo! ${sc.games[0]} a ${sc.games[1]}`);return;}
    if(sc.tb){speak(`${sc.tbp[0]}, ${sc.tbp[1]}`);return;}
    const[a,b]=sc.pts;
    if(a===4){speak(`Vantagem ${names[0]}`);return;}
    if(b===4){speak(`Vantagem ${names[1]}`);return;}
    if(a===3&&b===3){speak(live.format==='golden'?"Quarenta iguais — ponto de ouro!":"Quarenta iguais");return;}
    if(a===b){speak(`${PTSAY[a]} iguais`);return;}
    speak(`${PTSAY[a]}, ${PTSAY[b]}`);
  },[live.point_log,enabled]);
}

function LiveTab({players,campos,defaultCampo,onSaveGame}){
  const[live,setLive]=useState(null);
  const[view,setView]=useState("lobby");
  const[ready,setReady]=useState(false);
  // Refs para evitar races: toques rápidos partem sempre do log mais recente
  // e o eco do Realtime não repõe estado antigo enquanto há escritas em curso.
  const liveRef=useRef(null);
  const pending=useRef(0);
  const tapGuard=useRef(0);
  useEffect(()=>{liveRef.current=live;},[live]);

  useEffect(()=>{
    let ch;
    (async()=>{
      const{data}=await supabase.from('live_games').select('*').eq('status','active').order('created_at',{ascending:false}).limit(1);
      setLive(data?.[0]||null);setReady(true);
      ch=supabase.channel('live_games_ch')
        .on('postgres_changes',{event:'*',schema:'public',table:'live_games'},p=>{
          const row=p.new;
          if(!row||!row.id)return;
          if(row.status==='active'){
            // Eco atrasado da nossa própria escrita: ignora enquanto houver pendentes
            if(pending.current>0&&liveRef.current&&row.id===liveRef.current.id)return;
            setLive(row);
          }
          else setLive(cur=>cur&&cur.id===row.id?null:cur);
        })
        .subscribe();
    })();
    return()=>{if(ch)supabase.removeChannel(ch);};
  },[]);

  const mutateLog=async fn=>{
    const cur=liveRef.current;
    if(!cur)return;
    const next=fn(cur.point_log||[]);
    liveRef.current={...cur,point_log:next};
    setLive(l=>l?{...l,point_log:next}:l);
    pending.current++;
    try{await supabase.from('live_games').update({point_log:next}).eq('id',cur.id);}
    finally{pending.current--;}
  };
  // Duplo toque acidental no mesmo botão de ponto (<350ms) é ignorado
  const addPoint=t=>{const n=Date.now();if(n-tapGuard.current<350)return;tapGuard.current=n;mutateLog(log=>[...log,t]);};
  const undoPoint=()=>mutateLog(log=>log.slice(0,-1));

  const gp=id=>players.find(p=>p.id===id)||{id,name:"?",color:"#555"};

  // Comandos/clickers Bluetooth emparelhados com o dispositivo enviam teclas:
  // ← ou 1 = ponto eq.1 · → ou 2 = ponto eq.2 · Backspace ou ↓ = desfazer
  useEffect(()=>{
    if(!live)return;
    const h=e=>{
      if(e.repeat)return;
      if(e.target&&/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName))return;
      if(e.key==='ArrowLeft'||e.key==='1'){e.preventDefault();addPoint(0);}
      else if(e.key==='ArrowRight'||e.key==='2'){e.preventDefault();addPoint(1);}
      else if(e.key==='Backspace'||e.key==='ArrowDown'){e.preventDefault();undoPoint();}
    };
    window.addEventListener('keydown',h);
    return()=>window.removeEventListener('keydown',h);
  },[live?.id]);

  const start=async cfg=>{
    const row={id:uid(),date:today(),campo:cfg.campo,team1:cfg.team1,team2:cfg.team2,format:cfg.format,first_server:cfg.firstServer,point_log:[],status:'active'};
    let{data,error}=await supabase.from('live_games').insert(row).select().single();
    if(error){
      // BD ainda sem a coluna first_server (migração 005 por aplicar) — insere sem ela
      const{first_server,...semSrv}=row;
      ({data}=await supabase.from('live_games').insert(semSrv).select().single());
    }
    setLive(data||row);setView("ctrl");
  };

  const cancel=async()=>{
    if(!confirm("Anular o jogo ao vivo?"))return;
    await supabase.from('live_games').update({status:'cancelled'}).eq('id',live.id);
    setLive(null);setView("lobby");
  };

  const finish=async()=>{
    const sc=deriveScore(live.point_log||[],live.format);
    const sets=sc.sets.map(s=>({t1:String(s.t1),t2:String(s.t2)}));
    if(sc.games[0]>0||sc.games[1]>0)sets.push({t1:String(sc.games[0]),t2:String(sc.games[1])});
    if(!sets.length){alert("Ainda não há jogos marcados para guardar.");return;}
    if(!sc.finished&&!confirm("A partida ainda não terminou. Guardar mesmo assim?"))return;
    await supabase.from('live_games').update({status:'finished'}).eq('id',live.id);
    setLive(null);setView("lobby");
    onSaveGame({id:live.id,date:live.date,campo:live.campo||"",jogadoresFixos:true,team1:live.team1,team2:live.team2,jogadores:[],sets,beers:{}});
  };

  if(!ready)return(<div className="empty"><span style={{fontSize:32}}>🔴</span><span className="es">A ligar…</span></div>);
  if(!live)return(<LiveSetup players={players} campos={campos} defaultCampo={defaultCampo} onStart={start}/>);
  if(view==="ctrl")return(<LiveCtrl live={live} gp={gp} onPoint={addPoint} onUndo={undoPoint} onFinish={finish} onCancel={cancel} onBack={()=>setView("lobby")}/>);
  if(view==="board")return(<LiveBoard live={live} gp={gp} onBack={()=>setView("lobby")}/>);
  return(
    <div className="scr">
      <div className="ft">Jogo ao Vivo</div>
      <div className="lv-vs">{live.team1.map(id=>gp(id).name).join(" & ")} <span style={{color:'var(--mt)',fontSize:12}}>vs</span> {live.team2.map(id=>gp(id).name).join(" & ")}</div>
      <div className="lv-lobby">
        <button className="btns lv-big" onClick={()=>setView("ctrl")}>📱 Marcador<br/><span className="lv-sub">para quem regista os pontos no campo</span></button>
        <button className="btnc lv-big" onClick={()=>setView("board")}>📺 Placar<br/><span className="lv-sub">ecrã grande para iPad / TV — atualiza sozinho</span></button>
        <button className="abtn del" style={{marginTop:14}} onClick={cancel}>Anular jogo ao vivo</button>
      </div>
    </div>
  );
}

function LiveSetup({players,campos,defaultCampo,onStart}){
  const[team1,setTeam1]=useState(["",""]);
  const[team2,setTeam2]=useState(["",""]);
  const[campo,setCampo]=useState(defaultCampo||"");
  const[format,setFormat]=useState("golden");
  const[srv,setSrv]=useState(0);
  const[copied,setCopied]=useState(false);
  const allSel=[...team1,...team2].filter(Boolean);
  const can=team1.every(Boolean)&&team2.every(Boolean);
  const setT=(setter,arr,i,v)=>setter(arr.map((x,j)=>j===i?v:x));
  const shareRemote=async()=>{
    const url=`${window.location.origin}/remote.html`;
    const text=`🎾 Padel ao vivo — marca os pontos aqui: ${url}`;
    if(navigator.share){try{await navigator.share({text});return;}catch{/* cancelado */}}
    try{await navigator.clipboard.writeText(url);setCopied(true);setTimeout(()=>setCopied(false),1800);}
    catch{prompt("Copiar link:",url);}
  };
  return(
    <div className="scr sf">
      <div className="ft">Jogo ao Vivo</div>
      <div className="fg"><label className="fl">👥 Equipas</label>
        <div className="tgrid">
          <div className="tc"><div className="tch t1h">Equipa 1</div>{[0,1].map(i=><PSel key={i} players={players} value={team1[i]} onChange={v=>setT(setTeam1,team1,i,v)} allSel={allSel} myVal={team1[i]}/>)}</div>
          <div className="vsm">VS</div>
          <div className="tc"><div className="tch t2h">Equipa 2</div>{[0,1].map(i=><PSel key={i} players={players} value={team2[i]} onChange={v=>setT(setTeam2,team2,i,v)} allSel={allSel} myVal={team2[i]}/>)}</div>
        </div>
      </div>
      {players.length>=4&&(
        <button className="aset sort-btn" onClick={()=>{const d=drawTeams(players,[...team1,...team2]);setTeam1(d.team1);setTeam2(d.team2);}}>🎲 Sortear Equipas</button>
      )}
      {campos.length>0&&(
        <div className="fg"><label className="fl">📍 Campo</label>
          <select className="fi" style={{cursor:'pointer'}} value={campo} onChange={e=>setCampo(e.target.value)}>
            <option value="">— Sem campo —</option>
            {campos.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      )}
      <div className="fg"><label className="fl">⚖️ Pontuação a 40-40</label>
        <div style={{display:'flex',gap:8}}>
          <button className={`catb${format==='golden'?' caton':''}`} style={{flex:1,padding:10,fontSize:12}} onClick={()=>setFormat('golden')}>🥇 Ponto de ouro</button>
          <button className={`catb${format==='advantage'?' caton':''}`} style={{flex:1,padding:10,fontSize:12}} onClick={()=>setFormat('advantage')}>♾️ Vantagens</button>
        </div>
      </div>
      <div className="fg"><label className="fl">🎾 Quem serve primeiro</label>
        <div style={{display:'flex',gap:8}}>
          {[0,1].map(t=>{
            const tn=[team1,team2][t].filter(Boolean).map(id=>players.find(p=>p.id===id)?.name?.split(" ")[0]).join(" & ");
            return(<button key={t} className={`catb${srv===t?' caton':''}`} style={{flex:1,padding:10,fontSize:12}} onClick={()=>setSrv(t)}>{t===0?'🟢':'🟠'} {tn||`Equipa ${t+1}`}</button>);
          })}
        </div>
      </div>
      <button className="btns" style={{width:'100%',padding:16,fontSize:16}} disabled={!can} onClick={()=>onStart({team1,team2,campo,format,firstServer:srv})}>🔴 Iniciar Jogo</button>
      <button className="aset" style={{marginTop:10}} onClick={shareRemote}>{copied?"✓ Link copiado!":"📤 Partilhar link do comando de pontos"}</button>
      <div style={{fontSize:11,color:'var(--mt)',marginTop:12,textAlign:'center'}}>Melhor de 3 sets · tie-break a 6-6<br/>O comando funciona em qualquer telemóvel — e no Apple Watch via link aberto no iMessage</div>
    </div>
  );
}

function ScoreGrid({live,gp,big}){
  const sc=deriveScore(live.point_log||[],live.format,live.first_server);
  const names=[live.team1.map(id=>gp(id).name).join(" & "),live.team2.map(id=>gp(id).name).join(" & ")];
  const colors=[live.team1.map(id=>gp(id).color),live.team2.map(id=>gp(id).color)];
  const[sound,setSound]=useState(()=>localStorage.getItem('padel_sound')==='1');
  const toggleSound=e=>{
    e.stopPropagation(); // o placar full-screen fecha ao tocar; o botão não deve fechar
    const v=!sound;setSound(v);localStorage.setItem('padel_sound',v?'1':'0');
    if(v)speak("Som ativado");else window.speechSynthesis?.cancel();
  };
  useAnnounce(live,sc,names,sound);
  return(
    <div className={`lv-grid${big?' lv-gridb':''}`}>
      <div className="lv-hd"><span><button className="lv-snd" title="Anúncio de voz" onClick={toggleSound}>{sound?'🔊':'🔇'}</button></span><span>Sets</span><span>Jogos</span><span>Pontos</span></div>
      {[0,1].map(t=>(
        <div key={t} className={`lv-row${sc.finished&&sc.winner===t+1?' lv-win':''}`}>
          <span className="lv-nm"><span className="gds">{colors[t].map((c,i)=><span key={i} className="dot" style={{background:c}}/>)}</span>{names[t]}{sc.serving===t&&<span className="lv-srv" title="A servir">🎾</span>}</span>
          <span className="lv-v">{sc.setsWon[t]}</span>
          <span className="lv-v">{sc.games[t]}</span>
          <span className="lv-v lv-pt">{sc.tb?sc.tbp[t]:PTLBL[sc.pts[t]]}</span>
        </div>
      ))}
      {sc.sets.length>0&&<div className="lv-sets">{sc.sets.map(s=>`${s.t1}-${s.t2}`).join("  ·  ")}</div>}
      {sc.tb&&<div className="lv-tbk">TIE-BREAK</div>}
      {sc.finished&&<div className="lv-fin">🏆 {names[sc.winner-1]} venceu!</div>}
    </div>
  );
}

function LiveCtrl({live,gp,onPoint,onUndo,onFinish,onCancel,onBack}){
  const sc=deriveScore(live.point_log||[],live.format,live.first_server);
  // Correção em 2 toques: o 1.º arma (botão fica vermelho), o 2.º confirma
  const[armUndo,setArmUndo]=useState(false);
  useEffect(()=>{
    if(!armUndo)return;
    const t=setTimeout(()=>setArmUndo(false),2500);
    return()=>clearTimeout(t);
  },[armUndo]);
  const undoClick=()=>{
    if(!armUndo){setArmUndo(true);return;}
    setArmUndo(false);onUndo();
  };
  const names=[live.team1.map(id=>gp(id).name).join(" & "),live.team2.map(id=>gp(id).name).join(" & ")];
  return(
    <div className="scr sf">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
        <div className="ft" style={{marginBottom:0}}>Marcador</div>
        <button className="abtn edit" onClick={onBack}>← Voltar</button>
      </div>
      <ScoreGrid live={live} gp={gp}/>
      {!sc.finished&&(
        <div className="lv-taps">
          <button className="lv-tap lv-t1" onClick={()=>onPoint(0)}>+ Ponto<br/><span className="lv-tapn">{names[0]}</span></button>
          <button className="lv-tap lv-t2" onClick={()=>onPoint(1)}>+ Ponto<br/><span className="lv-tapn">{names[1]}</span></button>
        </div>
      )}
      <div style={{display:'flex',gap:8,marginTop:14}}>
        <button className={`btnc${armUndo?' undo-arm':''}`} style={{flex:1}} disabled={!(live.point_log||[]).length} onClick={undoClick}>{armUndo?'⚠️ Confirmar correção':'↩️ Desfazer'}</button>
        <button className="btns" style={{flex:1}} onClick={onFinish}>💾 Terminar e Guardar</button>
      </div>
      <button className="abtn del" style={{width:'100%',marginTop:10}} onClick={onCancel}>Anular jogo</button>
    </div>
  );
}

function LiveBoard({live,gp,onBack}){
  // Mantém o ecrã aceso enquanto o placar está visível (iPad/TV)
  useEffect(()=>{
    let wl;
    (async()=>{try{wl=await navigator.wakeLock?.request('screen');}catch{}})();
    return()=>{wl?.release?.();};
  },[]);
  return(
    <div className="lv-full" onClick={onBack}>
      <ScoreGrid live={live} gp={gp} big/>
      <div style={{fontSize:11,color:'var(--mt)',marginTop:20}}>🔴 Atualiza em tempo real · toca no ecrã para voltar</div>
    </div>
  );
}

/* ── Helpers ────────────────────────────────────────────── */
function calcStats(players,games){
  const d={};
  players.forEach(p=>{d[p.id]={wins:0,games:0,sets:0,beers:0,streak:0,cur:0,pts:0};});
  [...games].sort((a,b)=>a.date.localeCompare(b.date)).forEach(g=>{
    const isFixed=g.jogadoresFixos!==false;
    if(isFixed){
      const w=calcWinner(g.sets);
      [...(g.team1||[]),...(g.team2||[])].filter(Boolean).forEach(id=>{
        if(!d[id])return;
        d[id].games++;d[id].pts++;
        if(g.beers?.[id])d[id].beers+=+g.beers[id]||0;
        const inT1=(g.team1||[]).includes(id);
        (g.sets||[]).forEach(s=>{const t1=+s.t1||0,t2=+s.t2||0;if(inT1?t1>t2:t2>t1)d[id].sets++;});
        const won=(inT1&&w===1)||(!inT1&&w===2);
        if(won){d[id].wins++;d[id].pts+=3;d[id].cur++;d[id].streak=Math.max(d[id].streak,d[id].cur);}
        else d[id].cur=0;
      });
    } else {
      const all=[...new Set([...(g.jogadores||[]),...(g.team1||[]),...(g.team2||[])])].filter(Boolean);
      all.forEach(id=>{
        if(!d[id])return;
        d[id].games++;d[id].pts++;
        if(g.beers?.[id])d[id].beers+=+g.beers[id]||0;
      });
      (g.sets||[]).forEach(s=>{
        const st1=s.team1||[],st2=s.team2||[];
        const t1v=+s.t1||0,t2v=+s.t2||0;
        if(t1v>t2v)st1.filter(Boolean).forEach(id=>{if(d[id]){d[id].sets++;d[id].wins+=0.5;d[id].pts+=1.5;d[id].cur+=0.5;d[id].streak=Math.max(d[id].streak,d[id].cur);}});
        else if(t2v>t1v)st2.filter(Boolean).forEach(id=>{if(d[id]){d[id].sets++;d[id].wins+=0.5;d[id].pts+=1.5;d[id].cur+=0.5;d[id].streak=Math.max(d[id].streak,d[id].cur);}});
      });
    }
  });
  const srt=k=>players.map(p=>({id:p.id,v:+(d[p.id]?.[k]||0).toFixed(1)})).sort((a,b)=>b.v-a.v);
  const rate=players.filter(p=>(d[p.id]?.games||0)>0).map(p=>({id:p.id,v:(d[p.id].wins||0)/(d[p.id].games||1)})).sort((a,b)=>b.v-a.v);
  return{wins:srt("wins"),games:srt("games"),least:[...srt("games")].reverse(),sets:srt("sets"),rate,beers:srt("beers"),streak:srt("streak"),pts:srt("pts")};
}

function fmtDate(d){if(!d)return"";const[y,m,day]=d.split("-");return`${day}/${m}/${y}`;}
function fmtMo(d){const ms=["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];const[y,m]=d.split("-");return`${ms[+m-1]} ${y}`;}

const CSS=`
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Outfit:wght@300;400;500;600;700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}

/* ── Themes ── */
:root,[data-theme="dark"]{
  --bg:#07101f;--card:#0d1a2e;--card2:#111f35;--bd:#1a2d47;
  --g:#00e676;--o:#ff6b35;--r:#ff4444;--t:#e0ecff;--mt:#4a6080;
  --g-rgb:0,230,118;--rad:12px;
}
[data-theme="blue"]{
  --bg:#071828;--card:#0b2540;--card2:#0f2f50;--bd:#1a4070;
  --g:#29b6f6;--o:#80deea;--r:#ef5350;--t:#e1f5fe;--mt:#5090c0;
  --g-rgb:41,182,246;
}
[data-theme="green"]{
  --bg:#071a07;--card:#0b2e0b;--card2:#0f3a0f;--bd:#1a5e1a;
  --g:#69f0ae;--o:#ffd54f;--r:#ef5350;--t:#e8f5e9;--mt:#4a8a4a;
  --g-rgb:105,240,174;
}

/* ── Court backgrounds ── */
.app{display:flex;flex-direction:column;height:100vh;height:100dvh;background:var(--bg);font-family:'Outfit',sans-serif;color:var(--t);overflow:hidden;}
[data-theme="blue"].app{
  background:
    linear-gradient(135deg,rgba(255,255,255,.018) 25%,transparent 25%),
    linear-gradient(225deg,rgba(255,255,255,.018) 25%,transparent 25%),
    linear-gradient(315deg,rgba(255,255,255,.018) 25%,transparent 25%),
    linear-gradient(45deg,rgba(255,255,255,.018) 25%,transparent 25%),
    linear-gradient(180deg,#071828 0%,#0e2a45 100%);
  background-size:20px 20px,20px 20px,20px 20px,20px 20px,100% 100%;
}
[data-theme="green"].app{
  background:
    repeating-linear-gradient(0deg,transparent,transparent 79px,rgba(255,255,255,.04) 79px,rgba(255,255,255,.04) 80px),
    repeating-linear-gradient(90deg,transparent,transparent 119px,rgba(255,255,255,.04) 119px,rgba(255,255,255,.04) 120px),
    linear-gradient(180deg,#071a07 0%,#0d2e0d 100%);
}

/* ── Layout ── */
.hdr{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;background:var(--card);border-bottom:1px solid var(--bd);flex-shrink:0;}
.hl{display:flex;align-items:center;gap:10px;}.hi{font-size:22px;}
.hn{font-family:'Bebas Neue',sans-serif;font-size:20px;letter-spacing:2px;color:var(--g);}
.hb{font-size:10px;color:var(--mt);letter-spacing:1px;text-transform:uppercase;}
.hc{font-size:12px;color:var(--mt);}
.main{flex:1;min-height:0;overflow-y:auto;scrollbar-width:thin;scrollbar-color:var(--bd) transparent;}
.scr{padding:16px;max-width:600px;margin:0 auto;}.sf{padding-bottom:40px;}
.nav{display:flex;background:var(--card);border-top:1px solid var(--bd);flex-shrink:0;}
.nb{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;padding:10px 4px;background:none;border:none;color:var(--mt);cursor:pointer;}
.nb.on{color:var(--g);}.ni{font-size:17px;}.nl{font-size:10px;font-weight:500;letter-spacing:.3px;}
.empty{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:280px;gap:8px;padding:32px;text-align:center;}
.et{font-size:17px;font-weight:600;}.es{font-size:13px;color:var(--mt);}

/* ── Games list ── */
.mhdr{font-family:'Bebas Neue',sans-serif;font-size:13px;letter-spacing:2px;color:var(--mt);padding:14px 2px 6px;}
.gc{background:var(--card);border:1px solid var(--bd);border-radius:var(--rad);margin-bottom:10px;overflow:hidden;}
.gct{display:flex;align-items:center;gap:10px;padding:13px 14px;cursor:pointer;}
.gcd{font-size:11px;color:var(--mt);min-width:50px;flex-shrink:0;}
.gm2{flex:1;display:flex;align-items:center;gap:6px;overflow:hidden;}
.gt{flex:1;display:flex;align-items:center;gap:6px;padding:5px 8px;border-radius:8px;min-width:0;}
.gt.gw{background:rgba(var(--g-rgb),.1);border:1px solid rgba(var(--g-rgb),.25);}
.gtr{flex-direction:row-reverse;}
.grot{flex:1;display:flex;align-items:center;gap:5px;overflow:hidden;}
.gds{display:flex;gap:3px;flex-shrink:0;}.dot{width:8px;height:8px;border-radius:50%;display:inline-block;flex-shrink:0;}
.gns{flex:1;font-size:12px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.gtr .gns{text-align:right;}
.gsc{font-family:'Bebas Neue',sans-serif;font-size:24px;color:var(--g);flex-shrink:0;}
.gvs{font-size:10px;color:var(--mt);font-weight:700;flex-shrink:0;}
.garr{font-size:9px;color:var(--mt);flex-shrink:0;}
.gcb{padding:4px 14px 14px;border-top:1px solid var(--bd);}
.gcampo{font-size:11px;color:var(--mt);padding:6px 0 2px;display:flex;align-items:center;gap:4px;}
.gsets{padding:10px 0;display:flex;flex-direction:column;gap:5px;}
.sr{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.srl{font-size:11px;color:var(--mt);width:40px;flex-shrink:0;}
.srt{font-size:10px;color:var(--mt);flex:1;}
.srv{font-family:'Bebas Neue',sans-serif;font-size:20px;width:22px;text-align:center;flex-shrink:0;}
.srv.sw{color:var(--g);}.srd{color:var(--mt);font-size:12px;flex-shrink:0;}
.gbrs{margin-top:10px;}.gsec{font-size:11px;color:var(--mt);margin-bottom:5px;font-weight:500;}
.bcl{display:flex;flex-wrap:wrap;gap:5px;}.bc{font-size:11px;padding:2px 8px;border-radius:16px;border:1px solid;}
.gacts{display:flex;gap:8px;margin-top:12px;}
.abtn{padding:6px 13px;border-radius:8px;font-size:12px;cursor:pointer;font-family:'Outfit',sans-serif;border:1px solid;background:transparent;}
.abtn.edit{border-color:var(--bd);color:var(--t);}.abtn.del{border-color:var(--r);color:var(--r);}.abtn.share{border-color:var(--bd);color:var(--t);}

/* ── Forms ── */
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
.tog-row{display:flex;align-items:center;justify-content:space-between;gap:12px;background:var(--card2);padding:12px 14px;border-radius:8px;border:1px solid var(--bd);}
.tog{width:46px;height:26px;border-radius:13px;border:none;background:var(--bd);cursor:pointer;position:relative;padding:0;transition:background .2s;flex-shrink:0;}
.tog.ton{background:var(--g);}
.tog-k{display:block;width:20px;height:20px;border-radius:50%;background:#fff;position:absolute;top:3px;left:3px;transition:left .2s;pointer-events:none;}
.tog.ton .tog-k{left:23px;}
.rot-pool{display:flex;flex-wrap:wrap;gap:7px;}
.pool-btn{display:flex;align-items:center;gap:6px;padding:7px 12px;border-radius:20px;border:1px solid var(--bd);background:transparent;color:var(--mt);font-size:12px;cursor:pointer;font-family:'Outfit',sans-serif;}
.pool-btn.psel{background:var(--card2);}
.sort-btn{margin-bottom:14px;border-color:rgba(var(--g-rgb),.45);color:var(--g);}
.set-block{margin-bottom:12px;border:1px solid var(--bd);border-radius:10px;padding:12px;background:var(--card2);}
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
.btns{background:var(--g);color:var(--bg);}
.btns:disabled{opacity:.4;cursor:not-allowed;}

/* ── Players ── */
.pg{display:flex;flex-direction:column;gap:7px;}
.pc{display:flex;align-items:center;gap:11px;background:var(--card2);padding:11px 13px;border-radius:10px;}
.pcav{width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'Bebas Neue',sans-serif;font-size:17px;color:#000;flex-shrink:0;}
.pci{flex:1;min-width:0;}.pcn{font-size:14px;font-weight:600;}.pcs{font-size:11px;color:var(--mt);margin-top:1px;}
.pcd{background:transparent;border:none;color:var(--mt);cursor:pointer;font-size:13px;padding:4px;flex-shrink:0;}
.cp{display:flex;gap:7px;flex-wrap:wrap;}
.cd{width:26px;height:26px;border-radius:50%;border:2px solid transparent;cursor:pointer;}
.cda{border-color:#fff;transform:scale(1.2);}
.pce{flex-direction:column;align-items:stretch;gap:0;}
.pef{width:100%;}.pei{padding:7px 10px;font-size:13px;margin-bottom:0;}
.pea{display:flex;gap:8px;margin-top:10px;}.peb{flex:1;padding:8px;font-size:12px;}

/* ── Scrollable chips ── */
.cscr{display:flex;gap:6px;overflow-x:auto;padding-bottom:8px;scrollbar-width:none;margin-bottom:16px;}
.cscr::-webkit-scrollbar{display:none;}
.catb{padding:5px 12px;border-radius:20px;border:1px solid var(--bd);background:transparent;color:var(--mt);font-size:11px;font-weight:500;cursor:pointer;white-space:nowrap;font-family:'Outfit',sans-serif;flex-shrink:0;}
.catb.caton{background:var(--g);border-color:var(--g);color:var(--bg);font-weight:700;}
.yr-btn{font-size:12px;padding:5px 14px;}

/* ── Podium / Rankings ── */
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

/* ── Live scoreboard ── */
.lv-lobby{display:flex;flex-direction:column;gap:12px;}
.lv-vs{font-size:15px;font-weight:600;text-align:center;margin-bottom:16px;}
.lv-big{padding:20px;font-size:16px;line-height:1.5;border-radius:14px;}
.lv-sub{font-size:11px;font-weight:400;opacity:.75;}
.lv-grid{background:var(--card);border:1px solid var(--bd);border-radius:var(--rad);padding:14px;margin-bottom:14px;}
.lv-hd{display:grid;grid-template-columns:1fr 48px 48px 62px;gap:4px;font-size:10px;color:var(--mt);text-transform:uppercase;letter-spacing:1px;text-align:center;margin-bottom:6px;}
.lv-hd span:first-child{text-align:left;}
.lv-srv{margin-left:6px;font-size:13px;flex-shrink:0;animation:lv-pulse 2s ease-in-out infinite;}
@keyframes lv-pulse{0%,100%{opacity:1;}50%{opacity:.45;}}
.lv-snd{background:transparent;border:1px solid var(--bd);border-radius:8px;padding:2px 8px;cursor:pointer;font-size:13px;line-height:1.4;}
.lv-row{display:grid;grid-template-columns:1fr 48px 48px 62px;gap:4px;align-items:center;padding:10px 4px;border-top:1px solid var(--bd);border-radius:8px;}
.lv-nm{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:600;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.lv-v{font-family:'Bebas Neue',sans-serif;font-size:26px;text-align:center;color:var(--t);}
.lv-pt{color:var(--g);font-size:32px;}
.lv-win{background:rgba(var(--g-rgb),.08);}
.lv-sets{font-family:'Bebas Neue',sans-serif;text-align:center;color:var(--mt);font-size:15px;letter-spacing:2px;margin-top:10px;}
.lv-tbk{text-align:center;color:var(--o);font-size:11px;font-weight:700;letter-spacing:2px;margin-top:8px;}
.lv-fin{text-align:center;color:var(--g);font-size:15px;font-weight:700;margin-top:10px;}
.lv-taps{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:4px;}
.lv-tap{padding:34px 10px;border-radius:16px;border:none;cursor:pointer;font-family:'Bebas Neue',sans-serif;font-size:26px;letter-spacing:1px;color:var(--bg);line-height:1.4;}
.lv-tap:active{transform:scale(.97);}
.lv-tapn{font-family:'Outfit',sans-serif;font-size:11px;font-weight:600;letter-spacing:.3px;}
.lv-t1{background:var(--g);}
.lv-t2{background:var(--o);}
.lv-full{min-height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;cursor:pointer;}
.lv-full .lv-grid{width:100%;max-width:700px;}
.lv-gridb{padding:24px;}
.lv-gridb .lv-hd,.lv-gridb .lv-row{grid-template-columns:1fr 64px 64px 88px;}
.lv-gridb .lv-nm{font-size:19px;}
.lv-gridb .lv-v{font-size:44px;}
.lv-gridb .lv-pt{font-size:58px;}
.lv-gridb .lv-fin{font-size:22px;}

.undo-arm{border-color:var(--r)!important;color:var(--r)!important;font-weight:700;}

/* ── Watch copy rows ── */
.wrow{display:flex;align-items:center;gap:10px;background:var(--card2);border:1px solid var(--bd);border-radius:8px;padding:9px 12px;margin-bottom:7px;}
.wri{flex:1;min-width:0;}
.wrl{font-size:10px;color:var(--mt);letter-spacing:.5px;text-transform:uppercase;margin-bottom:2px;}
.wrv{font-size:11px;font-family:monospace;color:var(--t);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.wrc{flex-shrink:0;padding:6px 12px;border-radius:8px;border:1px solid var(--bd);background:transparent;color:var(--t);font-size:11px;font-weight:600;cursor:pointer;font-family:'Outfit',sans-serif;min-width:76px;}
.wrc.wrok{border-color:var(--g);color:var(--g);}

/* ── Theme picker ── */
.theme-card{display:flex;align-items:center;gap:14px;padding:13px 14px;background:var(--card);border:2px solid var(--bd);border-radius:var(--rad);cursor:pointer;width:100%;transition:border-color .15s;}
.theme-card.theme-on{border-color:var(--g);}
.theme-prev{width:60px;height:42px;border-radius:8px;flex-shrink:0;overflow:hidden;}
.tp-dark{background:linear-gradient(135deg,#07101f 0%,#0d1a2e 60%,#00e676 60%,#00e676 100%);background-size:100% 100%;}
.tp-blue{
  background:
    linear-gradient(135deg,rgba(255,255,255,.03) 25%,transparent 25%),
    linear-gradient(225deg,rgba(255,255,255,.03) 25%,transparent 25%),
    linear-gradient(315deg,rgba(255,255,255,.03) 25%,transparent 25%),
    linear-gradient(45deg,rgba(255,255,255,.03) 25%,transparent 25%),
    linear-gradient(135deg,#071828 0%,#1565c0 100%);
  background-size:8px 8px,8px 8px,8px 8px,8px 8px,100% 100%;
}
.tp-green{
  background:
    repeating-linear-gradient(0deg,transparent,transparent 9px,rgba(255,255,255,.07) 9px,rgba(255,255,255,.07) 10px),
    repeating-linear-gradient(90deg,transparent,transparent 14px,rgba(255,255,255,.07) 14px,rgba(255,255,255,.07) 15px),
    linear-gradient(135deg,#071a07 0%,#1b5e20 100%);
}
`;
