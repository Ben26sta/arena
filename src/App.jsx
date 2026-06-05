import { useState, useEffect } from "react";
import Chess from "./Chess.jsx";
import Mafia from "./Mafia.jsx";
import IQBattle from "./IQBattle.jsx";

function save(d) { try{localStorage.setItem("arena_v1",JSON.stringify(d));}catch(e){} }
function load() { try{const s=localStorage.getItem("arena_v1");return s?JSON.parse(s):null;}catch(e){return null;} }

const GAMES = [
  {
    id:"chess", name:"Шахматы", emoji:"♟️",
    desc:"Классические шахматы против ИИ с анализом позиции",
    color:"#7c3aed", bg:"linear-gradient(135deg,#0f0520,#1a0a30,#0a0f20)",
    tags:["1 игрок","Стратегия","ИИ противник"],
    difficulty:"Средняя",
  },
  {
    id:"mafia", name:"Мафия", emoji:"🎭",
    desc:"Ночные убийства, детективы и ИИ-игроки. Найди мафию!",
    color:"#dc2626", bg:"linear-gradient(135deg,#1a0505,#250a0a,#0f0505)",
    tags:["ИИ-игроки","Дедукция","Атмосфера"],
    difficulty:"Сложная",
  },
  {
    id:"iqbattle", name:"IQ Битва", emoji:"⚡",
    desc:"Дуэль с ИИ на скорость и знания. 6 категорий вопросов.",
    color:"#0891b2", bg:"linear-gradient(135deg,#020b10,#050f15,#020b10)",
    tags:["Скорость","Знания","Рейтинг"],
    difficulty:"Лёгкая",
  },
];

const ACHIEVEMENTS_LIST = [
  {id:"first_game",icon:"🎮",name:"Первая игра",desc:"Сыграть первую игру",check:s=>s.gamesPlayed>=1},
  {id:"chess_win",icon:"♟️",name:"Гроссмейстер",desc:"Выиграть в шахматы",check:s=>s.chessWins>=1},
  {id:"iq_100",icon:"🧠",name:"Умник",desc:"Набрать 100+ в IQ битве",check:s=>s.maxIQ>=100},
  {id:"mafia_win",icon:"🎭",name:"Детектив",desc:"Победить в мафии за мирных",check:s=>s.mafiaWins>=1},
  {id:"streak_3",icon:"🔥",name:"На волне",desc:"Серия 3 правильных в IQ",check:s=>s.maxStreak>=3},
  {id:"all_games",icon:"🏆",name:"Всеядный",desc:"Поиграть во все игры",check:s=>s.gamesPlayed>=3},
];

function AchievementPopup({ach,onClose}) {
  useEffect(()=>{const t=setTimeout(onClose,3500);return()=>clearTimeout(t);},[]);
  return (
    <div style={{position:"fixed",top:80,left:"50%",transform:"translateX(-50%)",zIndex:9999,background:"linear-gradient(135deg,#1a0a30,#0d0520)",border:"2px solid #7c3aed",borderRadius:18,padding:"14px 20px",display:"flex",alignItems:"center",gap:12,boxShadow:"0 0 40px rgba(124,58,237,0.6)",animation:"popIn 0.4s ease",maxWidth:300,width:"90%"}}>
      <span style={{fontSize:36}}>{ach.icon}</span>
      <div>
        <div style={{fontSize:10,color:"#9333ea",textTransform:"uppercase",letterSpacing:2,marginBottom:2}}>Достижение!</div>
        <div style={{fontSize:15,fontWeight:"bold",color:"#fff"}}>{ach.name}</div>
        <div style={{fontSize:12,color:"#888"}}>{ach.desc}</div>
      </div>
    </div>
  );
}

function HomeScreen({ onPlay, stats }) {
  const [selected, setSelected] = useState(null);
  const unlocked = ACHIEVEMENTS_LIST.filter(a=>a.check(stats));

  return (
    <div style={{minHeight:"100vh",background:"#0a0a0f",fontFamily:"Georgia,serif"}}>
      {/* Header */}
      <div style={{background:"linear-gradient(180deg,#0f0f1a,#0a0a0f)",padding:"20px 20px 0",borderBottom:"1px solid #1a1a2e"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
          <div>
            <div style={{fontSize:24,fontWeight:"bold",background:"linear-gradient(135deg,#7c3aed,#06b6d4)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>АРЕНА</div>
            <div style={{fontSize:11,color:"#444",letterSpacing:2,textTransform:"uppercase"}}>Игровая платформа</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:11,color:"#555"}}>Достижений</div>
            <div style={{fontSize:20,fontWeight:"bold",color:"#f59e0b"}}>{unlocked.length}/{ACHIEVEMENTS_LIST.length} 🏆</div>
          </div>
        </div>

        {/* Stats mini */}
        <div style={{display:"flex",gap:8,marginBottom:16,overflowX:"auto",scrollbarWidth:"none"}}>
          {[
            {l:"Игр",v:stats.gamesPlayed||0,c:"#7c3aed"},
            {l:"IQ рекорд",v:stats.maxIQ||0,c:"#06b6d4"},
            {l:"Победы ♟️",v:stats.chessWins||0,c:"#f59e0b"},
            {l:"Мафия 🎭",v:stats.mafiaWins||0,c:"#dc2626"},
          ].map(s=>(
            <div key={s.l} style={{flex:"0 0 auto",background:"rgba(255,255,255,0.04)",border:"1px solid #1a1a2e",borderRadius:10,padding:"8px 14px",textAlign:"center",minWidth:70}}>
              <div style={{fontSize:16,fontWeight:"bold",color:s.c}}>{s.v}</div>
              <div style={{fontSize:10,color:"#555"}}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{padding:"16px"}}>
        {/* Games */}
        <div style={{fontSize:11,color:"#444",marginBottom:12,textTransform:"uppercase",letterSpacing:2}}>Выбери игру</div>
        <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:20}}>
          {GAMES.map(g=>(
            <div key={g.id} onClick={()=>setSelected(g.id===selected?null:g.id)}
              style={{background:g.bg,border:`1px solid ${selected===g.id?g.color:"rgba(255,255,255,0.06)"}`,borderRadius:18,padding:"16px 18px",cursor:"pointer",transition:"all 0.3s",boxShadow:selected===g.id?`0 0 30px ${g.color}30`:""}}
            >
              <div style={{display:"flex",alignItems:"center",gap:14}}>
                <div style={{width:52,height:52,borderRadius:15,background:`${g.color}20`,border:`2px solid ${g.color}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0}}>
                  {g.emoji}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:17,fontWeight:"bold",color:"#fff",marginBottom:3}}>{g.name}</div>
                  <div style={{fontSize:12,color:"#888",lineHeight:1.5}}>{g.desc}</div>
                </div>
                <div style={{fontSize:20,color:g.color,transition:"transform 0.3s",transform:selected===g.id?"rotate(90deg)":"none"}}>›</div>
              </div>

              {selected===g.id&&(
                <div style={{marginTop:14,paddingTop:14,borderTop:`1px solid rgba(255,255,255,0.08)`}}>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
                    {g.tags.map(t=>(
                      <span key={t} style={{background:`${g.color}20`,color:g.color,fontSize:11,padding:"3px 10px",borderRadius:20,border:`1px solid ${g.color}30`}}>{t}</span>
                    ))}
                    <span style={{background:"rgba(255,255,255,0.06)",color:"#666",fontSize:11,padding:"3px 10px",borderRadius:20}}>Сложность: {g.difficulty}</span>
                  </div>
                  <button onClick={e=>{e.stopPropagation();onPlay(g.id);}} style={{width:"100%",padding:13,background:`linear-gradient(135deg,${g.color},${g.color}88)`,border:"none",borderRadius:12,color:"#fff",fontSize:15,cursor:"pointer",fontWeight:"bold",fontFamily:"inherit"}}>
                    Играть {g.emoji}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Achievements */}
        <div style={{fontSize:11,color:"#444",marginBottom:12,textTransform:"uppercase",letterSpacing:2}}>Достижения</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {ACHIEVEMENTS_LIST.map(a=>{
            const got=a.check(stats);
            return (
              <div key={a.id} style={{background:got?"rgba(124,58,237,0.1)":"rgba(255,255,255,0.03)",border:`1px solid ${got?"rgba(124,58,237,0.4)":"rgba(255,255,255,0.06)"}`,borderRadius:12,padding:"10px 12px",opacity:got?1:0.5}}>
                <div style={{fontSize:22,marginBottom:5}}>{got?a.icon:"🔒"}</div>
                <div style={{fontSize:12,fontWeight:"bold",color:got?"#fff":"#555"}}>{a.name}</div>
                <div style={{fontSize:11,color:"#555",marginTop:2}}>{a.desc}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [game, setGame] = useState(null);
  const [stats, setStats] = useState(()=>load()||{gamesPlayed:0,chessWins:0,mafiaWins:0,maxIQ:0,maxStreak:0});
  const [achPopup, setAchPopup] = useState(null);

  useEffect(()=>{ save(stats); },[stats]);

  function checkAchievements(newStats) {
    const prev=ACHIEVEMENTS_LIST.filter(a=>a.check(stats));
    const next=ACHIEVEMENTS_LIST.filter(a=>a.check(newStats));
    const newOnes=next.filter(a=>!prev.find(p=>p.id===a.id));
    if(newOnes.length>0) setAchPopup(newOnes[0]);
  }

  function onPlay(gameId) {
    const newStats={...stats,gamesPlayed:stats.gamesPlayed+1};
    setStats(newStats); checkAchievements(newStats);
    setGame(gameId);
  }

  function onBack() { setGame(null); }

  if(game==="chess") return <Chess onBack={onBack}/>;
  if(game==="mafia") return <Mafia onBack={onBack}/>;
  if(game==="iqbattle") return <IQBattle onBack={onBack}/>;

  return (
    <div style={{maxWidth:480,margin:"0 auto"}}>
      {achPopup&&<AchievementPopup ach={achPopup} onClose={()=>setAchPopup(null)}/>}
      <HomeScreen onPlay={onPlay} stats={stats}/>
      <style>{`
        @keyframes popIn{from{opacity:0;transform:translateX(-50%) scale(0.8)}to{opacity:1;transform:translateX(-50%) scale(1)}}
        *{box-sizing:border-box;}
        ::-webkit-scrollbar{width:3px;}
        ::-webkit-scrollbar-thumb{background:#2a2a3a;}
      `}</style>
    </div>
  );
}
