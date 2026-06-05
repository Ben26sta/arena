import { useState, useEffect, useRef } from "react";

// ── SUPABASE CONFIG (заменить на свои ключи) ──
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY || "";

async function sbFetch(path, method="GET", body=null) {
  if(!SUPABASE_URL) return null;
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method, headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", "Prefer": method==="POST"?"return=representation":"" },
    body: body ? JSON.stringify(body) : null
  });
  return r.ok ? r.json() : null;
}

// ── ROLES ──
const ROLES = {
  mafia:    { name:"Мафия",    emoji:"🔫", color:"#ef4444", team:"mafia", desc:"Ночью устраняете мирных. Ведите себя как мирный!" },
  godfather:{ name:"Крёстный", emoji:"🎩", color:"#dc2626", team:"mafia", desc:"Глава мафии. При проверке детективом кажетесь мирным." },
  doctor:   { name:"Доктор",   emoji:"💊", color:"#10b981", team:"civil", desc:"Каждую ночь лечите одного игрока. Можете лечить себя." },
  detective:{ name:"Детектив", emoji:"🔍", color:"#3b82f6", team:"civil", desc:"Проверяете принадлежность игрока к мафии." },
  maniac:   { name:"Маньяк",   emoji:"🔪", color:"#a855f7", team:"maniac",desc:"Играете один против всех. Цель — уничтожить всех." },
  civilian: { name:"Мирный",   emoji:"👤", color:"#6b7280", team:"civil", desc:"Голосуйте мудро — от вас зависит судьба города." },
};

const AI_PLAYERS = [
  {name:"Артём",  avatar:"🧔", style:"агрессивный", mafiaLie:"Вы все сошли с ума! Я точно мирный.",  accusation:"Смотрите на {target} — он избегает вопросов! Голосую за него!"},
  {name:"Миша",   avatar:"👦", style:"аналитик",    mafiaLie:"По логике — я не могу быть мафией.",  accusation:"Анализирую паттерны — {target} ведёт себя подозрительно."},
  {name:"Катя",   avatar:"👩", style:"дружелюбная", mafiaLie:"Ребят, я честно с вами, поверьте!",   accusation:"Мне интуиция говорит — это {target}. Что-то не так."},
  {name:"Дима",   avatar:"🧑", style:"хитрый",      mafiaLie:"Отличный ход — обвинять меня...",     accusation:"Интересно, что {target} молчит. Слишком спокойный."},
  {name:"Аня",    avatar:"👱‍♀️", style:"наблюдатель", mafiaLie:"Я наблюдаю за всеми. Я мирная.",    accusation:"Заметила странное поведение у {target} с самого начала."},
  {name:"Влад",   avatar:"🧑‍🦱", style:"провокатор", mafiaLie:"Провокация не пройдёт!",             accusation:"Всё указывает на {target}. Давайте разберёмся!"},
];

function genCode() { return Math.floor(100000+Math.random()*900000).toString(); }

function assignRoles(count) {
  const r=[];
  if(count>=6){r.push("mafia","mafia","doctor","detective","civilian","civilian");}
  if(count>=8){r.push("mafia","civilian");}
  if(count>=10){r.push("godfather","maniac");}
  return r.slice(0,count).sort(()=>Math.random()-0.5);
}

// ── MAIN COMPONENT ──
export default function Mafia({onBack}) {
  const [mode, setMode] = useState("menu"); // menu | solo | online_host | online_join | online_wait | game
  const [phase, setPhase] = useState("role");
  const [players, setPlayers] = useState([]);
  const [myName, setMyName] = useState("");
  const [myIdx, setMyIdx] = useState(0);
  const [myRole, setMyRole] = useState(null);
  const [roomCode, setRoomCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [night, setNight] = useState(1);
  const [log, setLog] = useState([]);
  const [nightTarget, setNightTarget] = useState(null);
  const [eliminated, setEliminated] = useState([]);
  const [winner, setWinner] = useState(null);
  const [aiDialogue, setAiDialogue] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dayTimer, setDayTimer] = useState(0);
  const [voteTarget, setVoteTarget] = useState(null);
  const [healTarget, setHealTarget] = useState(null);
  const bottomRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:"smooth"}); },[aiDialogue,log]);

  // ── ONLINE POLLING ──
  useEffect(()=>{
    if(mode!=="online_wait"&&mode!=="game") return;
    const poll = setInterval(async()=>{
      const data = await sbFetch(`mafia_rooms?code=eq.${roomCode}&select=*`);
      if(data&&data[0]) {
        const room = data[0];
        if(room.players&&room.players.length>0) setPlayers(room.players);
        if(room.phase&&room.phase!==phase) setPhase(room.phase);
      }
    }, 2000);
    return()=>clearInterval(poll);
  },[mode,roomCode]);

  function addLog(msg,color="#6b7280") { setLog(l=>[...l,{msg,color,t:new Date().toLocaleTimeString("ru",{hour:"2-digit",minute:"2-digit"})}]); }

  async function getAILine(context) {
    try {
      const resp = await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-haiku-4-5-20251001",max_tokens:120,
          system:"Ты игрок в Мафию. Генерируй короткие реплики (1-2 предложения максимум). Только по-русски. Атмосферно и интересно.",
          messages:[{role:"user",content:context}]
        })
      });
      const d=await resp.json();
      return d.content?.map(b=>b.text||"").join("").trim()||"...";
    } catch { return "..."; }
  }

  // ── START SOLO GAME ──
  async function startSolo() {
    if(!myName.trim()) return;
    const aiCount=5;
    const allPlayers=[
      {name:myName,avatar:"😎",isMe:true,alive:true,idx:0},
      ...AI_PLAYERS.slice(0,aiCount).map((a,i)=>({...a,isMe:false,alive:true,idx:i+1}))
    ];
    const roles=assignRoles(allPlayers.length);
    const withRoles=allPlayers.map((p,i)=>({...p,role:roles[i]}));
    setPlayers(withRoles);
    setMyIdx(0);
    setMyRole(withRoles[0].role);
    setNight(1);
    setLog([]);
    setEliminated([]);
    setAiDialogue([]);
    setWinner(null);
    setPhase("role_reveal");
    setMode("game");
    setNightTarget(null);
    setHealTarget(null);
    setVoteTarget(null);
  }

  // ── HOST ONLINE ROOM ──
  async function hostRoom() {
    if(!myName.trim()) return;
    const code=genCode();
    setRoomCode(code);
    if(SUPABASE_URL) {
      await sbFetch("mafia_rooms","POST",{code,host:myName,players:[{name:myName,avatar:"😎",isHost:true}],phase:"waiting",created_at:new Date().toISOString()});
    }
    setMode("online_wait");
  }

  // ── JOIN ONLINE ROOM ──
  async function joinRoom() {
    if(!myName.trim()||!joinCode.trim()) return;
    if(SUPABASE_URL) {
      const rooms=await sbFetch(`mafia_rooms?code=eq.${joinCode}`);
      if(!rooms||!rooms[0]){alert("Комната не найдена!");return;}
      setRoomCode(joinCode);
      setMode("online_wait");
    } else {
      alert("Supabase не настроен. Пока только одиночная игра.");
    }
  }

  // ── NIGHT ACTIONS ──
  async function confirmNight() {
    let newPlayers=[...players];
    const healedName=myRole==="doctor"?healTarget:null;
    const detResult=myRole==="detective"?nightTarget:null;

    // AI mafia picks target
    const mafiaAi=players.filter(p=>!p.isMe&&p.alive&&p.role==="mafia");
    let mafiaTarget=null;
    if(mafiaAi.length>0) {
      const civAlive=players.filter(p=>p.alive&&p.role!=="mafia"&&!p.isMe);
      if(civAlive.length) mafiaTarget=civAlive[Math.floor(Math.random()*civAlive.length)].name;
    }

    // My mafia action
    if(myRole==="mafia"&&nightTarget) mafiaTarget=nightTarget;

    // Apply kills
    const killed=mafiaTarget&&mafiaTarget!==healedName?mafiaTarget:null;
    if(killed){
      newPlayers=newPlayers.map(p=>p.name===killed?{...p,alive:false}:p);
      setEliminated(e=>[...e,killed]);
      addLog(`☀️ Утро дня ${night}. ${killed} найден мёртвым...`,"#ef4444");
    } else {
      addLog(`☀️ Утро дня ${night}. Этой ночью никто не пострадал.`,"#4ade80");
      if(healedName) addLog(`💊 Доктор спас чью-то жизнь!`,"#10b981");
    }

    if(detResult) {
      const t=players.find(p=>p.name===detResult);
      if(t){
        const isMafia=t.role==="mafia"||(t.role==="godfather"?false:false);
        addLog(`🔍 Детектив: ${detResult} — ${isMafia?"МАФИЯ 🔴":"мирный 🟢"}`,"#3b82f6");
      }
    }

    setPlayers(newPlayers);
    setNight(n=>n+1);
    setNightTarget(null);
    setHealTarget(null);

    const {win,who}=checkWin(newPlayers);
    if(win){setWinner(who);setPhase("result");return;}

    // Generate morning dialogue
    setLoading(true);
    const lines=[];
    const dayPlayers=newPlayers.filter(p=>p.alive&&!p.isMe).slice(0,3);
    for(const p of dayPlayers) {
      const isMafia=p.role==="mafia"||p.role==="godfather";
      const template=isMafia?p.mafiaLie||"Я не виновен!":p.accusation?.replace("{target}",killed||"кто-то")||"Нам нужно разобраться!";
      const line=await getAILine(`Ты ${p.name} (${p.style||"игрок"}) в Мафии. День ${night}. ${killed?`Ночью убили ${killed}.`:"Никто не погиб."} Скажи 1-2 предложения от своего лица: "${template}"`);
      lines.push({name:p.name,avatar:p.avatar,text:line,color:ROLES[p.role]?.color||"#6b7280"});
    }
    setAiDialogue(d=>[...d,...lines]);
    setLoading(false);
    setPhase("day");
  }

  // ── VOTE ──
  async function confirmVote() {
    if(!voteTarget) return;
    let newPlayers=players.map(p=>p.name===voteTarget?{...p,alive:false}:p);
    const kicked=players.find(p=>p.name===voteTarget);
    setEliminated(e=>[...e,voteTarget]);
    addLog(`🗳️ Голосование: ${voteTarget} (${ROLES[kicked?.role]?.name||"?"}) исключён из города!`,"#f59e0b");
    setPlayers(newPlayers);
    setVoteTarget(null);

    // AI reaction to vote
    setLoading(true);
    const reactor=newPlayers.filter(p=>p.alive&&!p.isMe)[0];
    if(reactor){
      const line=await getAILine(`Ты ${reactor.name} в Мафии. Только что исключили ${voteTarget}. Короткая реакция (1 предложение): "${reactor.accusation?.replace("{target}",voteTarget)||"Интересный выбор..."}"`);
      setAiDialogue(d=>[...d,{name:reactor.name,avatar:reactor.avatar,text:line,color:"#6b7280"}]);
    }
    setLoading(false);

    const {win,who}=checkWin(newPlayers);
    if(win){setWinner(who);setPhase("result");return;}
    setPhase("night");
  }

  function checkWin(pl) {
    const alive=pl.filter(p=>p.alive);
    const mafiaAlive=alive.filter(p=>p.role==="mafia"||p.role==="godfather").length;
    const civAlive=alive.filter(p=>p.team==="civil"||ROLES[p.role]?.team==="civil").length;
    const maniacAlive=alive.filter(p=>p.role==="maniac").length;
    if(mafiaAlive===0&&maniacAlive===0) return{win:true,who:"civil"};
    if(mafiaAlive>=civAlive&&maniacAlive===0) return{win:true,who:"mafia"};
    if(maniacAlive>0&&alive.length<=2) return{win:true,who:"maniac"};
    return{win:false};
  }

  // ── RENDER ──

  // MENU
  if(mode==="menu") return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#0a0a0f,#1a0505,#0f0510)",padding:"20px 16px",fontFamily:"Georgia,serif"}}>
      <button onClick={onBack} style={{background:"none",border:"1px solid #333",borderRadius:8,color:"#aaa",padding:"6px 12px",cursor:"pointer",fontSize:13,marginBottom:20}}>← Назад</button>
      <div style={{textAlign:"center",marginBottom:28}}>
        <div style={{fontSize:64,marginBottom:10}}>🎭</div>
        <div style={{fontSize:28,fontWeight:"bold",color:"#fff",marginBottom:6}}>МАФИЯ</div>
        <div style={{fontSize:13,color:"#666",lineHeight:1.7}}>Найди мафию раньше<br/>чем она найдёт тебя</div>
      </div>

      <div style={{marginBottom:16}}>
        <input value={myName} onChange={e=>setMyName(e.target.value)} placeholder="Твоё имя..." style={{width:"100%",background:"rgba(255,255,255,0.07)",border:"1px solid #333",borderRadius:12,color:"#fff",padding:"12px 16px",fontSize:15,outline:"none",boxSizing:"border-box",marginBottom:12}}/>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:20}}>
        <button onClick={startSolo} disabled={!myName.trim()} style={{padding:16,background:myName.trim()?"linear-gradient(135deg,#dc2626,#991b1b)":"#1a1a1a",border:"none",borderRadius:14,color:"#fff",fontSize:15,cursor:myName.trim()?"pointer":"not-allowed",fontWeight:"bold",fontFamily:"inherit"}}>
          🤖 Играть с ИИ (одиночная)
        </button>
        <button onClick={hostRoom} disabled={!myName.trim()} style={{padding:16,background:myName.trim()?"linear-gradient(135deg,#7c3aed,#5b21b6)":"#1a1a1a",border:"none",borderRadius:14,color:"#fff",fontSize:15,cursor:myName.trim()?"pointer":"not-allowed",fontWeight:"bold",fontFamily:"inherit"}}>
          🌐 Создать онлайн комнату
        </button>
      </div>

      <div style={{background:"rgba(255,255,255,0.04)",border:"1px solid #222",borderRadius:14,padding:16}}>
        <div style={{fontSize:13,color:"#888",marginBottom:10}}>Войти в комнату по коду:</div>
        <div style={{display:"flex",gap:8}}>
          <input value={joinCode} onChange={e=>setJoinCode(e.target.value)} placeholder="Код комнаты..." style={{flex:1,background:"rgba(255,255,255,0.07)",border:"1px solid #333",borderRadius:10,color:"#fff",padding:"10px 14px",fontSize:14,outline:"none"}}/>
          <button onClick={joinRoom} disabled={!myName.trim()||!joinCode.trim()} style={{padding:"10px 16px",background:"linear-gradient(135deg,#0891b2,#0e7490)",border:"none",borderRadius:10,color:"#fff",cursor:"pointer",fontWeight:"bold",fontSize:14}}>Войти</button>
        </div>
      </div>

      <div style={{marginTop:16,background:"rgba(255,255,255,0.03)",borderRadius:12,padding:14,fontSize:12,color:"#555",lineHeight:1.8}}>
        🎲 6 ролей: 2 мафии, доктор, детектив, 2 мирных<br/>
        🌙 Ночью: каждый действует по роли<br/>
        ☀️ Днём: обсуждение и голосование
      </div>
    </div>
  );

  // ONLINE WAIT
  if(mode==="online_wait") return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#0a0a0f,#050a1a)",padding:"20px 16px",fontFamily:"Georgia,serif",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
      <div style={{textAlign:"center",marginBottom:30}}>
        <div style={{fontSize:48,marginBottom:12}}>⏳</div>
        <div style={{fontSize:20,fontWeight:"bold",color:"#fff",marginBottom:8}}>Ожидание игроков</div>
        <div style={{background:"rgba(99,102,241,0.15)",border:"2px solid #6366f1",borderRadius:16,padding:"16px 32px",marginBottom:16}}>
          <div style={{fontSize:13,color:"#6366f1",marginBottom:4}}>КОД КОМНАТЫ</div>
          <div style={{fontSize:36,fontWeight:"bold",color:"#fff",letterSpacing:8}}>{roomCode}</div>
        </div>
        <div style={{fontSize:13,color:"#666"}}>Отправь код друзьям чтобы они могли войти</div>
      </div>
      <div style={{background:"rgba(255,255,255,0.04)",borderRadius:14,padding:16,width:"100%",maxWidth:320,marginBottom:20}}>
        <div style={{fontSize:12,color:"#555",marginBottom:10}}>Игроки в комнате:</div>
        {players.map((p,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
            <span style={{fontSize:20}}>{p.avatar||"👤"}</span>
            <span style={{color:"#fff",fontSize:14}}>{p.name}</span>
            {p.isHost&&<span style={{fontSize:11,color:"#f59e0b",marginLeft:"auto"}}>Хост</span>}
          </div>
        ))}
      </div>
      {players.length>=4&&(
        <button onClick={startSolo} style={{width:"100%",maxWidth:320,padding:14,background:"linear-gradient(135deg,#dc2626,#991b1b)",border:"none",borderRadius:12,color:"#fff",fontSize:15,cursor:"pointer",fontWeight:"bold"}}>
          🎭 Начать игру ({players.length} игроков)
        </button>
      )}
      <button onClick={()=>setMode("menu")} style={{marginTop:12,background:"none",border:"1px solid #333",borderRadius:10,color:"#666",padding:"8px 20px",cursor:"pointer",fontSize:13}}>Отмена</button>
    </div>
  );

  // GAME
  const myPlayer=players[myIdx];
  const alivePlayers=players.filter(p=>p.alive);
  const roleInfo=ROLES[myRole]||ROLES.civilian;

  // ROLE REVEAL
  if(phase==="role_reveal") return (
    <div style={{minHeight:"100vh",background:`linear-gradient(135deg,#0a0a0f,${roleInfo.color}18,#0a0a0f)`,display:"flex",alignItems:"center",justifyContent:"center",padding:20,fontFamily:"Georgia,serif"}}>
      <div style={{textAlign:"center",maxWidth:320}}>
        <div style={{fontSize:80,marginBottom:12,filter:`drop-shadow(0 0 20px ${roleInfo.color})`}}>{roleInfo.emoji}</div>
        <div style={{fontSize:12,color:"#555",letterSpacing:3,textTransform:"uppercase",marginBottom:6}}>Твоя роль</div>
        <div style={{fontSize:30,fontWeight:"bold",color:roleInfo.color,marginBottom:14}}>{roleInfo.name}</div>
        <div style={{fontSize:14,color:"#aaa",lineHeight:1.8,marginBottom:24,background:"rgba(255,255,255,0.04)",borderRadius:14,padding:16}}>{roleInfo.desc}</div>
        {(myRole==="mafia"||myRole==="godfather")&&(
          <div style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:12,padding:12,marginBottom:20,fontSize:13,color:"#f87171"}}>
            🔴 Мафиози: {players.filter(p=>p.role==="mafia"||p.role==="godfather").map(p=>p.name).join(", ")}
          </div>
        )}
        <button onClick={()=>setPhase("night")} style={{width:"100%",padding:15,background:`linear-gradient(135deg,${roleInfo.color},${roleInfo.color}88)`,border:"none",borderRadius:14,color:"#fff",fontSize:16,cursor:"pointer",fontWeight:"bold"}}>
          Запомнил! В игру →
        </button>
      </div>
    </div>
  );

  // NIGHT
  if(phase==="night") {
    const targets=alivePlayers.filter(p=>!p.isMe);
    const actionMap={
      mafia:"🔫 Выбери жертву для устранения:",
      godfather:"🎩 Кого устранить этой ночью?",
      doctor:"💊 Кого вылечить? (можно себя)",
      detective:"🔍 Кого проверить?",
      maniac:"🔪 Кого устранить?",
      civilian:"😴 Ты мирный — спишь этой ночью",
    };
    const canAct=myRole!=="civilian";
    const myTargets=myRole==="doctor"?alivePlayers:targets;

    return (
      <div style={{minHeight:"100vh",background:"linear-gradient(180deg,#020408,#060814,#020408)",padding:"16px",fontFamily:"Georgia,serif"}}>
        <div style={{textAlign:"center",marginBottom:18}}>
          <div style={{fontSize:48}}>🌙</div>
          <div style={{fontSize:22,fontWeight:"bold",color:"#8899cc"}}>Ночь {night}</div>
          <div style={{fontSize:13,color:"#334"}}>Город засыпает...</div>
        </div>

        <div style={{background:`rgba(${myRole==="mafia"||myRole==="godfather"?"239,68,68":"99,102,241"},0.1)`,border:`1px solid ${roleInfo.color}40`,borderRadius:16,padding:14,marginBottom:16,textAlign:"center"}}>
          <div style={{fontSize:28}}>{roleInfo.emoji}</div>
          <div style={{fontSize:14,color:roleInfo.color,fontWeight:"bold",marginTop:4}}>{actionMap[myRole]||actionMap.civilian}</div>
        </div>

        {canAct&&(
          <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
            {myTargets.map(p=>(
              <button key={p.name} onClick={()=>{myRole==="doctor"?setHealTarget(p.name):setNightTarget(p.name);}} style={{padding:"12px 16px",background:(myRole==="doctor"?healTarget:nightTarget)===p.name?"rgba(99,102,241,0.3)":"rgba(255,255,255,0.04)",border:`2px solid ${(myRole==="doctor"?healTarget:nightTarget)===p.name?"#6366f1":"rgba(255,255,255,0.1)"}`,borderRadius:12,color:"#fff",cursor:"pointer",textAlign:"left",fontSize:14,display:"flex",alignItems:"center",gap:12,fontFamily:"inherit",transition:"all 0.2s"}}>
                <span style={{fontSize:22}}>{p.avatar||"👤"}</span>
                <span style={{flex:1}}>{p.name}{p.isMe?" (ты)":""}</span>
                {(myRole==="doctor"?healTarget:nightTarget)===p.name&&<span style={{color:"#6366f1"}}>✓</span>}
              </button>
            ))}
          </div>
        )}

        {!canAct&&<div style={{textAlign:"center",fontSize:60,margin:"30px 0",opacity:0.3}}>💤</div>}

        <button onClick={confirmNight} disabled={canAct&&!(nightTarget||healTarget)} style={{width:"100%",padding:14,background:(canAct&&!(nightTarget||healTarget))?"#111":"linear-gradient(135deg,#4f46e5,#7c3aed)",border:"none",borderRadius:12,color:"#fff",fontSize:15,cursor:(canAct&&!(nightTarget||healTarget))?"not-allowed":"pointer",fontWeight:"bold",fontFamily:"inherit"}}>
          {canAct?"Подтвердить действие →":"Рассвет наступает..."}
        </button>
      </div>
    );
  }

  // DAY
  if(phase==="day") return (
    <div style={{minHeight:"100vh",background:"linear-gradient(180deg,#0f0a08,#18100a,#0f0a08)",padding:"16px",fontFamily:"Georgia,serif"}}>
      <div style={{textAlign:"center",marginBottom:14}}>
        <div style={{fontSize:36}}>☀️</div>
        <div style={{fontSize:20,fontWeight:"bold",color:"#fff"}}>День {night-1}</div>
        <div style={{fontSize:12,color:"#666"}}>Живых: {alivePlayers.length} игроков</div>
      </div>

      {/* Log */}
      <div style={{marginBottom:12}}>
        {log.slice(-4).map((l,i)=>(
          <div key={i} style={{fontSize:13,color:l.color,padding:"6px 12px",background:"rgba(255,255,255,0.03)",borderRadius:8,marginBottom:4}}>{l.msg}</div>
        ))}
      </div>

      {/* AI Dialogue */}
      <div style={{marginBottom:14}}>
        {loading&&<div style={{fontSize:13,color:"#555",padding:"8px 12px"}}>💬 Игроки обсуждают...</div>}
        {aiDialogue.slice(-6).map((m,i)=>(
          <div key={i} style={{background:"rgba(255,255,255,0.04)",borderRadius:12,padding:"10px 14px",marginBottom:8,display:"flex",gap:10}}>
            <span style={{fontSize:20,flexShrink:0}}>{m.avatar}</span>
            <div>
              <div style={{fontSize:12,color:m.color,fontWeight:"bold",marginBottom:3}}>{m.name}</div>
              <div style={{fontSize:13,color:"#ccc",lineHeight:1.5}}>{m.text}</div>
            </div>
          </div>
        ))}
        <div ref={bottomRef}/>
      </div>

      {/* Alive players */}
      <div style={{background:"rgba(255,255,255,0.03)",borderRadius:12,padding:12,marginBottom:14}}>
        <div style={{fontSize:11,color:"#555",marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>Живые игроки</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
          {alivePlayers.map(p=>(
            <div key={p.name} style={{background:"rgba(255,255,255,0.06)",borderRadius:8,padding:"5px 10px",fontSize:13,color:p.isMe?"#f59e0b":"#fff",display:"flex",gap:5}}>
              <span>{p.avatar||"👤"}</span><span>{p.name}{p.isMe?" 👈":""}</span>
            </div>
          ))}
        </div>
      </div>

      <button onClick={()=>setPhase("vote")} style={{width:"100%",padding:14,background:"linear-gradient(135deg,#d97706,#b45309)",border:"none",borderRadius:12,color:"#fff",fontSize:15,cursor:"pointer",fontWeight:"bold",fontFamily:"inherit"}}>
        🗳️ Перейти к голосованию
      </button>
    </div>
  );

  // VOTE
  if(phase==="vote") return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#0a0a0f,#0f0a00)",padding:"16px",fontFamily:"Georgia,serif"}}>
      <div style={{textAlign:"center",marginBottom:20}}>
        <div style={{fontSize:40}}>🗳️</div>
        <div style={{fontSize:22,fontWeight:"bold",color:"#fff"}}>Голосование</div>
        <div style={{fontSize:13,color:"#888",marginTop:4}}>Кого исключить из города?</div>
      </div>

      {aiDialogue.slice(-2).map((m,i)=>(
        <div key={i} style={{background:"rgba(255,255,255,0.04)",borderRadius:12,padding:"10px 14px",marginBottom:10,display:"flex",gap:10}}>
          <span style={{fontSize:20}}>{m.avatar}</span>
          <div><div style={{fontSize:12,color:m.color,fontWeight:"bold",marginBottom:2}}>{m.name}</div><div style={{fontSize:13,color:"#ccc"}}>{m.text}</div></div>
        </div>
      ))}

      <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:14}}>
        {alivePlayers.filter(p=>!p.isMe).map(p=>(
          <button key={p.name} onClick={()=>setVoteTarget(p.name)} style={{padding:"13px 16px",background:voteTarget===p.name?"rgba(239,68,68,0.2)":"rgba(255,255,255,0.04)",border:`2px solid ${voteTarget===p.name?"#ef4444":"rgba(255,255,255,0.08)"}`,borderRadius:12,color:"#fff",cursor:"pointer",textAlign:"left",fontSize:14,display:"flex",alignItems:"center",gap:12,fontFamily:"inherit",transition:"all 0.2s"}}>
            <span style={{fontSize:22}}>{p.avatar||"👤"}</span>
            <span style={{flex:1}}>{p.name}</span>
            {voteTarget===p.name&&<span style={{color:"#ef4444"}}>✓ Исключить</span>}
          </button>
        ))}
      </div>

      <button onClick={confirmVote} disabled={!voteTarget} style={{width:"100%",padding:14,background:voteTarget?"linear-gradient(135deg,#ef4444,#b91c1c)":"#111",border:"none",borderRadius:12,color:"#fff",fontSize:15,cursor:voteTarget?"pointer":"not-allowed",fontWeight:"bold",fontFamily:"inherit"}}>
        {voteTarget?`Исключить ${voteTarget} →`:"Выбери кого исключить"}
      </button>
    </div>
  );

  // RESULT
  if(phase==="result") {
    const isWin=winner==="civil"||(winner==="maniac"&&myRole==="maniac");
    const icons={civil:"🏆",mafia:"💀",maniac:"🔪"};
    const msgs={civil:"Мирные победили! Мафия разоблачена!",mafia:"Мафия захватила город...",maniac:"Маньяк победил всех!"};
    return (
      <div style={{minHeight:"100vh",background:isWin?"linear-gradient(135deg,#050f05,#0a1a0a)":"linear-gradient(135deg,#0f0505,#1a0a0a)",display:"flex",alignItems:"center",justifyContent:"center",padding:20,fontFamily:"Georgia,serif"}}>
        <div style={{textAlign:"center",maxWidth:320,width:"100%"}}>
          <div style={{fontSize:80,marginBottom:12}}>{icons[winner]||"🎭"}</div>
          <div style={{fontSize:24,fontWeight:"bold",color:isWin?"#4ade80":"#ef4444",marginBottom:16}}>{msgs[winner]}</div>
          <div style={{background:"rgba(255,255,255,0.04)",borderRadius:14,padding:16,marginBottom:20}}>
            <div style={{fontSize:12,color:"#555",marginBottom:10}}>РОЛИ ИГРОКОВ:</div>
            {players.map(p=>(
              <div key={p.name} style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                <span style={{fontSize:16}}>{p.avatar||"👤"}</span>
                <span style={{color:p.alive?"#fff":"#555",textDecoration:p.alive?"none":"line-through",flex:1}}>{p.name}{p.isMe?" (ты)":""}</span>
                <span style={{color:ROLES[p.role]?.color||"#6b7280",fontSize:13}}>{ROLES[p.role]?.emoji} {ROLES[p.role]?.name}</span>
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:10}}>
            <button onClick={()=>{setMode("menu");setPhase("role_reveal");}} style={{flex:1,padding:13,background:"rgba(255,255,255,0.08)",border:"1px solid #333",borderRadius:12,color:"#fff",fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>В меню</button>
            <button onClick={startSolo} style={{flex:1,padding:13,background:"linear-gradient(135deg,#dc2626,#991b1b)",border:"none",borderRadius:12,color:"#fff",fontSize:14,cursor:"pointer",fontWeight:"bold",fontFamily:"inherit"}}>🔄 Снова</button>
          </div>
        </div>
      </div>
    );
  }
  return null;
}
