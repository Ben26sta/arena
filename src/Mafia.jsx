import { useState, useEffect, useRef } from "react";

const ROLES = {
  mafia: { name:"Мафия", emoji:"🔫", color:"#ef4444", desc:"Ночью убиваете мирных жителей. Цель: стать большинством.", team:"mafia" },
  doctor: { name:"Доктор", emoji:"💊", color:"#10b981", desc:"Ночью лечите одного игрока. Можете лечить себя.", team:"civil" },
  detective: { name:"Детектив", emoji:"🔍", color:"#3b82f6", desc:"Ночью проверяете принадлежность игрока к мафии.", team:"civil" },
  civilian: { name:"Мирный", emoji:"👤", color:"#8b5cf6", desc:"Голосуете за исключение подозреваемых.", team:"civil" },
};

const AI_PLAYERS = [
  {name:"Артём",avatar:"🧔",personality:"агрессивный"},
  {name:"Миша",avatar:"👦",personality:"подозрительный"},
  {name:"Катя",avatar:"👩",personality:"дружелюбная"},
  {name:"Дима",avatar:"🧑",personality:"хитрый"},
  {name:"Аня",avatar:"👱‍♀️",personality:"наблюдательная"},
];

function getRoomCode() { return Math.random().toString(36).substr(2,6).toUpperCase(); }

export default function Mafia({ onBack }) {
  const [phase, setPhase] = useState("lobby"); // lobby|setup|role|night|day|vote|result
  const [players, setPlayers] = useState([]);
  const [myName, setMyName] = useState("");
  const [myRole, setMyRole] = useState(null);
  const [roomCode] = useState(getRoomCode);
  const [night, setNight] = useState(1);
  const [log, setLog] = useState([]);
  const [votes, setVotes] = useState({});
  const [nightTarget, setNightTarget] = useState(null);
  const [eliminated, setEliminated] = useState([]);
  const [winner, setWinner] = useState(null);
  const [aiChat, setAiChat] = useState([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:"smooth"}); },[aiChat,log]);

  function startGame() {
    if(!myName.trim()) return;
    const allPlayers=[{name:myName,isMe:true,alive:true},...AI_PLAYERS.map(a=>({...a,isMe:false,alive:true}))];
    const roles=["mafia","mafia","doctor","detective","civilian","civilian"];
    const shuffled=[...roles].sort(()=>Math.random()-0.5);
    const withRoles=allPlayers.map((p,i)=>({...p,role:shuffled[i]}));
    setPlayers(withRoles);
    setMyRole(withRoles[0].role);
    setPhase("role");
  }

  function addLog(msg,color="#aaa") { setLog(l=>[...l,{msg,color,time:new Date().toLocaleTimeString("ru",{hour:"2-digit",minute:"2-digit"})}]); }

  async function getAiComment(context) {
    setLoading(true);
    try {
      const resp=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-haiku-4-5-20251001",max_tokens:200,
          system:"Ты ведёшь игру Мафия. Генерируй короткие реалистичные реплики игроков (1-2 предложения максимум). Русский язык. Делай атмосферно и интересно.",
          messages:[{role:"user",content:context}]
        })
      });
      const data=await resp.json();
      return data.content?.map(b=>b.text||"").join("").trim()||"...";
    } catch(e) { return "..."; }
    finally { setLoading(false); }
  }

  async function startNight() {
    setPhase("night");
    setNightTarget(null);
    addLog(`🌙 Ночь ${night} — город засыпает...`,"#6366f1");
    const mafiaPlayers=players.filter(p=>p.role==="mafia"&&!p.isMe&&p.alive);
    if(mafiaPlayers.length>0) {
      const comment=await getAiComment(`Ты играешь за мафию в игре Мафия. Ночь ${night}. Скажи кратко что ты думаешь сделать ночью (1 предложение, без имён)`);
      setAiChat(c=>[...c,{name:"🔫 Мафия шепчет",text:comment,color:"#ef4444"}]);
    }
  }

  async function confirmNightAction() {
    if(!nightTarget) return;
    const target=players.find(p=>p.name===nightTarget);
    if(!target) return;
    let newPlayers=[...players];

    if(myRole==="mafia") {
      newPlayers=newPlayers.map(p=>p.name===nightTarget?{...p,alive:false}:p);
      addLog(`☀️ Утро. ${nightTarget} найден мёртвым.`,"#ef4444");
      setEliminated(e=>[...e,nightTarget]);
    } else if(myRole==="detective") {
      const targetRole=players.find(p=>p.name===nightTarget)?.role;
      const isMafia=targetRole==="mafia";
      addLog(`🔍 Детектив: ${nightTarget} — ${isMafia?"МАФИЯ! 🔴":"мирный 🟢"}`,"#3b82f6");
    } else if(myRole==="doctor") {
      addLog(`💊 Доктор вылечил ${nightTarget}`,"#10b981");
    }

    setPlayers(newPlayers);
    setNight(n=>n+1);

    const civilAlive=newPlayers.filter(p=>p.alive&&ROLES[p.role].team==="civil").length;
    const mafiaAlive=newPlayers.filter(p=>p.alive&&p.role==="mafia").length;
    if(mafiaAlive===0) { setWinner("civil"); setPhase("result"); return; }
    if(mafiaAlive>=civilAlive) { setWinner("mafia"); setPhase("result"); return; }

    setPhase("day");
    const dayComment=await getAiComment(`Игра Мафия, день ${night}. Только что нашли убитого. Сыграй за одного из мирных жителей — скажи кратко что ты думаешь (1-2 предложения, без конкретных имён)`);
    setAiChat(c=>[...c,{name:AI_PLAYERS[Math.floor(Math.random()*AI_PLAYERS.length)].avatar+" "+AI_PLAYERS[Math.floor(Math.random()*AI_PLAYERS.length)].name,text:dayComment,color:"#8b5cf6"}]);
  }

  async function startVote() {
    setPhase("vote");
    setVotes({});
    const voteComment=await getAiComment(`Игра Мафия. Время голосования. Сыграй за подозрительного игрока — намекни на кого-то (1-2 предложения, общими словами)`);
    setAiChat(c=>[...c,{name:"⚡ Жаркий спор",text:voteComment,color:"#f59e0b"}]);
  }

  function voteOut(name) {
    const newPlayers=players.map(p=>p.name===name?{...p,alive:false}:p);
    setPlayers(newPlayers);
    setEliminated(e=>[...e,name]);
    addLog(`🗳️ Голосование: ${name} исключён из города!`,"#f59e0b");
    const civilAlive=newPlayers.filter(p=>p.alive&&ROLES[p.role].team==="civil").length;
    const mafiaAlive=newPlayers.filter(p=>p.alive&&p.role==="mafia").length;
    if(mafiaAlive===0) { setWinner("civil"); setPhase("result"); }
    else if(mafiaAlive>=civilAlive) { setWinner("mafia"); setPhase("result"); }
    else startNight();
  }

  // LOBBY
  if(phase==="lobby") return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#0a0a0f,#1a0a0a,#0f0a1a)",padding:"20px 16px",fontFamily:"Georgia,serif"}}>
      <button onClick={onBack} style={{background:"none",border:"1px solid #333",borderRadius:8,color:"#aaa",padding:"6px 12px",cursor:"pointer",fontSize:13,marginBottom:20}}>← Назад</button>
      <div style={{textAlign:"center",marginBottom:30}}>
        <div style={{fontSize:60,marginBottom:10}}>🎭</div>
        <div style={{fontSize:26,fontWeight:"bold",color:"#fff",marginBottom:6}}>МАФИЯ</div>
        <div style={{fontSize:13,color:"#888",lineHeight:1.6}}>ИИ-игроки уже за столом.<br/>Найди мафию раньше чем они тебя!</div>
      </div>
      <div style={{background:"rgba(255,255,255,0.05)",borderRadius:16,padding:20,marginBottom:20}}>
        <div style={{fontSize:13,color:"#888",marginBottom:8}}>ИГРОКИ В ИГРЕ:</div>
        {AI_PLAYERS.map(p=>(
          <div key={p.name} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
            <span style={{fontSize:20}}>{p.avatar}</span>
            <div>
              <div style={{fontSize:14,color:"#fff"}}>{p.name}</div>
              <div style={{fontSize:11,color:"#666"}}>{p.personality}</div>
            </div>
            <div style={{marginLeft:"auto",fontSize:11,color:"#4ade80"}}>✓ Готов</div>
          </div>
        ))}
        <div style={{display:"flex",alignItems:"center",gap:10,marginTop:10,padding:"10px 0",borderTop:"1px solid #333"}}>
          <span style={{fontSize:20}}>😎</span>
          <input value={myName} onChange={e=>setMyName(e.target.value)} placeholder="Твоё имя..." style={{flex:1,background:"rgba(255,255,255,0.08)",border:"1px solid #444",borderRadius:8,color:"#fff",padding:"8px 12px",fontSize:14,outline:"none"}}/>
        </div>
      </div>
      <div style={{background:"rgba(99,102,241,0.1)",border:"1px solid rgba(99,102,241,0.3)",borderRadius:12,padding:14,marginBottom:20,fontSize:12,color:"#aaa",lineHeight:1.7}}>
        🎲 6 игроков: 2 мафии, 1 доктор, 1 детектив, 2 мирных<br/>
        🌙 Ночью: мафия убивает, доктор лечит, детектив проверяет<br/>
        ☀️ Днём: все голосуют за исключение подозреваемого
      </div>
      <button onClick={startGame} disabled={!myName.trim()} style={{width:"100%",padding:16,background:myName.trim()?"linear-gradient(135deg,#dc2626,#991b1b)":"#333",border:"none",borderRadius:14,color:"#fff",fontSize:16,cursor:myName.trim()?"pointer":"not-allowed",fontWeight:"bold"}}>
        🎭 НАЧАТЬ ИГРУ
      </button>
    </div>
  );

  // ROLE REVEAL
  if(phase==="role") {
    const role=ROLES[myRole];
    return (
      <div style={{minHeight:"100vh",background:`linear-gradient(135deg,#0a0a0f,${role.color}22,#0a0a0f)`,display:"flex",alignItems:"center",justifyContent:"center",padding:20,fontFamily:"Georgia,serif"}}>
        <div style={{textAlign:"center",maxWidth:300}}>
          <div style={{fontSize:80,marginBottom:16}}>{role.emoji}</div>
          <div style={{fontSize:13,color:"#888",marginBottom:8,textTransform:"uppercase",letterSpacing:2}}>Твоя роль</div>
          <div style={{fontSize:28,fontWeight:"bold",color:role.color,marginBottom:16}}>{role.name}</div>
          <div style={{fontSize:14,color:"#aaa",lineHeight:1.7,marginBottom:30}}>{role.desc}</div>
          <div style={{background:"rgba(255,255,255,0.05)",borderRadius:12,padding:14,marginBottom:24,fontSize:13,color:"#888"}}>
            {myRole==="mafia"?"⚠️ Ты знаешь других мафиози. Веди себя как мирный!":"💡 Никто не знает твою роль. Действуй осторожно!"}
          </div>
          <button onClick={startNight} style={{width:"100%",padding:14,background:`linear-gradient(135deg,${role.color},${role.color}88)`,border:"none",borderRadius:12,color:"#fff",fontSize:16,cursor:"pointer",fontWeight:"bold"}}>
            Запомнил! Начать ночь →
          </button>
        </div>
      </div>
    );
  }

  // NIGHT
  if(phase==="night") {
    const alivePlayers=players.filter(p=>p.alive&&!p.isMe);
    const roleInfo=ROLES[myRole];
    const actionText={mafia:"Выбери жертву",detective:"Кого проверить?",doctor:"Кого вылечить?",civilian:"Ты спишь..."}[myRole];
    return (
      <div style={{minHeight:"100vh",background:"linear-gradient(180deg,#020408 0%,#0a0814 50%,#020408 100%)",padding:"16px",fontFamily:"Georgia,serif"}}>
        <div style={{textAlign:"center",marginBottom:20}}>
          <div style={{fontSize:40}}>🌙</div>
          <div style={{fontSize:20,fontWeight:"bold",color:"#aaa"}}>Ночь {night}</div>
          <div style={{fontSize:13,color:"#666",marginTop:4}}>Город спит...</div>
        </div>
        <div style={{background:`rgba(${myRole==="mafia"?"239,68,68":"99,102,241"},0.15)`,border:`1px solid rgba(${myRole==="mafia"?"239,68,68":"99,102,241"},0.3)`,borderRadius:14,padding:14,marginBottom:16,textAlign:"center"}}>
          <div style={{fontSize:22}}>{roleInfo.emoji}</div>
          <div style={{fontSize:14,color:roleInfo.color,fontWeight:"bold"}}>{roleInfo.name}</div>
          <div style={{fontSize:13,color:"#888",marginTop:4}}>{actionText}</div>
        </div>
        {myRole!=="civilian"&&(
          <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
            {alivePlayers.map(p=>(
              <button key={p.name} onClick={()=>setNightTarget(p.name)} style={{padding:"12px 16px",background:nightTarget===p.name?"rgba(99,102,241,0.3)":"rgba(255,255,255,0.05)",border:`2px solid ${nightTarget===p.name?"#6366f1":"#333"}`,borderRadius:12,color:"#fff",cursor:"pointer",textAlign:"left",fontSize:14,display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:20}}>{p.avatar||"👤"}</span>
                <span>{p.name}</span>
                {nightTarget===p.name&&<span style={{marginLeft:"auto",color:"#6366f1"}}>✓</span>}
              </button>
            ))}
          </div>
        )}
        {myRole==="civilian"&&<div style={{textAlign:"center",color:"#555",fontSize:48,margin:"40px 0"}}>💤</div>}
        <button onClick={confirmNightAction} disabled={myRole!=="civilian"&&!nightTarget} style={{width:"100%",padding:14,background:(!nightTarget&&myRole!=="civilian")?"#333":"linear-gradient(135deg,#4f46e5,#7c3aed)",border:"none",borderRadius:12,color:"#fff",fontSize:15,cursor:(!nightTarget&&myRole!=="civilian")?"not-allowed":"pointer",fontWeight:"bold"}}>
          {myRole==="civilian"?"Рассвет наступает...":"Подтвердить действие ночи →"}
        </button>
        {aiChat.slice(-2).map((m,i)=>(
          <div key={i} style={{marginTop:10,background:"rgba(255,255,255,0.03)",borderRadius:10,padding:10,fontSize:12,color:m.color}}>
            <strong>{m.name}:</strong> {m.text}
          </div>
        ))}
      </div>
    );
  }

  // DAY
  if(phase==="day") {
    const alivePl=players.filter(p=>p.alive);
    return (
      <div style={{minHeight:"100vh",background:"linear-gradient(180deg,#0a0a0f 0%,#150a0a 50%,#0a0a0f 100%)",padding:"16px",fontFamily:"Georgia,serif"}}>
        <div style={{textAlign:"center",marginBottom:16}}>
          <div style={{fontSize:36}}>☀️</div>
          <div style={{fontSize:20,fontWeight:"bold",color:"#fff"}}>День {night-1}</div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:16}}>
          {log.slice(-5).map((l,i)=><div key={i} style={{fontSize:13,color:l.color,padding:"6px 10px",background:"rgba(255,255,255,0.04)",borderRadius:8}}>{l.msg}</div>)}
        </div>
        <div style={{background:"rgba(255,255,255,0.05)",borderRadius:12,padding:12,marginBottom:16}}>
          <div style={{fontSize:12,color:"#666",marginBottom:8}}>ЖИВЫЕ ИГРОКИ ({alivePl.length}):</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {alivePl.map(p=>(
              <div key={p.name} style={{background:"rgba(255,255,255,0.08)",borderRadius:8,padding:"6px 10px",fontSize:13,color:p.isMe?"#fbbf24":"#fff",display:"flex",gap:5,alignItems:"center"}}>
                <span>{p.avatar||"😊"}</span><span>{p.name}{p.isMe?" (ты)":""}</span>
              </div>
            ))}
          </div>
        </div>
        {aiChat.slice(-3).map((m,i)=>(
          <div key={i} style={{marginBottom:8,background:"rgba(255,255,255,0.04)",borderRadius:10,padding:"10px 12px"}}>
            <div style={{fontSize:12,color:m.color,fontWeight:"bold",marginBottom:3}}>{m.name}</div>
            <div style={{fontSize:13,color:"#ccc"}}>{m.text}</div>
          </div>
        ))}
        <div ref={bottomRef}/>
        <button onClick={startVote} style={{width:"100%",padding:14,background:"linear-gradient(135deg,#d97706,#b45309)",border:"none",borderRadius:12,color:"#fff",fontSize:15,cursor:"pointer",fontWeight:"bold",marginTop:12}}>
          🗳️ Перейти к голосованию
        </button>
      </div>
    );
  }

  // VOTE
  if(phase==="vote") {
    const votable=players.filter(p=>p.alive&&!p.isMe);
    return (
      <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#0a0a0f,#0f0a00)",padding:"16px",fontFamily:"Georgia,serif"}}>
        <div style={{textAlign:"center",marginBottom:20}}>
          <div style={{fontSize:36}}>🗳️</div>
          <div style={{fontSize:20,fontWeight:"bold",color:"#fff"}}>Голосование</div>
          <div style={{fontSize:13,color:"#888",marginTop:4}}>Кого исключить из города?</div>
        </div>
        {aiChat.slice(-2).map((m,i)=>(
          <div key={i} style={{marginBottom:10,background:"rgba(255,255,255,0.04)",borderRadius:10,padding:"10px 12px"}}>
            <div style={{fontSize:12,color:m.color,marginBottom:3}}>{m.name}</div>
            <div style={{fontSize:13,color:"#ccc"}}>{m.text}</div>
          </div>
        ))}
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {votable.map(p=>(
            <button key={p.name} onClick={()=>voteOut(p.name)} style={{padding:"14px 16px",background:"rgba(239,68,68,0.1)",border:"2px solid rgba(239,68,68,0.3)",borderRadius:12,color:"#fff",cursor:"pointer",textAlign:"left",fontSize:14,display:"flex",alignItems:"center",gap:12,fontFamily:"inherit"}}>
              <span style={{fontSize:22}}>{p.avatar||"👤"}</span>
              <span style={{flex:1}}>{p.name}</span>
              <span style={{color:"#ef4444",fontSize:13}}>Исключить →</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // RESULT
  if(phase==="result") {
    const won=winner==="civil";
    return (
      <div style={{minHeight:"100vh",background:won?"linear-gradient(135deg,#0a1a0a,#0f2f0a)":"linear-gradient(135deg,#1a0a0a,#2f0f0a)",display:"flex",alignItems:"center",justifyContent:"center",padding:20,fontFamily:"Georgia,serif"}}>
        <div style={{textAlign:"center",maxWidth:300}}>
          <div style={{fontSize:80,marginBottom:16}}>{won?"🏆":"💀"}</div>
          <div style={{fontSize:28,fontWeight:"bold",color:won?"#4ade80":"#ef4444",marginBottom:12}}>
            {won?"Мирные победили!":"Мафия победила!"}
          </div>
          <div style={{fontSize:14,color:"#888",marginBottom:24,lineHeight:1.7}}>
            {won?"Детективы и горожане разоблачили мафию и спасли город!":"Мафия захватила контроль над городом..."}
          </div>
          <div style={{background:"rgba(255,255,255,0.05)",borderRadius:12,padding:14,marginBottom:24}}>
            <div style={{fontSize:12,color:"#666",marginBottom:8}}>РОЛИ ИГРОКОВ:</div>
            {players.map(p=><div key={p.name} style={{fontSize:13,display:"flex",gap:8,marginBottom:4,alignItems:"center"}}>
              <span>{ROLES[p.role].emoji}</span>
              <span style={{color:"#fff"}}>{p.name}</span>
              <span style={{color:ROLES[p.role].color,marginLeft:"auto"}}>{ROLES[p.role].name}</span>
            </div>)}
          </div>
          <button onClick={()=>setPhase("lobby")} style={{width:"100%",padding:14,background:"linear-gradient(135deg,#7c3aed,#5b21b6)",border:"none",borderRadius:12,color:"#fff",fontSize:16,cursor:"pointer",fontWeight:"bold"}}>
            🎭 Играть снова
          </button>
        </div>
      </div>
    );
  }
  return null;
}
