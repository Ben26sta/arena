import { useState, useEffect, useRef } from "react";

const CATEGORIES = [
  {id:"science",name:"Наука",emoji:"🔬",color:"#06b6d4"},
  {id:"history",name:"История",emoji:"📜",color:"#f59e0b"},
  {id:"geo",name:"География",emoji:"🌍",color:"#10b981"},
  {id:"sport",name:"Спорт",emoji:"⚽",color:"#ef4444"},
  {id:"culture",name:"Культура",emoji:"🎭",color:"#8b5cf6"},
  {id:"tech",name:"Технологии",emoji:"💻",color:"#3b82f6"},
];

const QUESTIONS = {
  science:[
    {q:"Какой элемент обозначается символом 'Au'?",opts:["Серебро","Золото","Алюминий","Аргон"],a:"Золото"},
    {q:"Скорость света (примерно)?",opts:["300 000 км/с","150 000 км/с","450 000 км/с","600 000 км/с"],a:"300 000 км/с"},
    {q:"Формула воды?",opts:["H2O","CO2","NaCl","O2"],a:"H2O"},
    {q:"Самая большая планета Солнечной системы?",opts:["Сатурн","Уран","Юпитер","Нептун"],a:"Юпитер"},
    {q:"Что изучает орнитология?",opts:["Насекомых","Рыб","Птиц","Рептилий"],a:"Птиц"},
    {q:"Сколько хромосом у человека?",opts:["23","46","48","44"],a:"46"},
    {q:"Какой газ растения поглощают при фотосинтезе?",opts:["Кислород","Азот","CO2","Водород"],a:"CO2"},
  ],
  history:[
    {q:"Год основания Москвы?",opts:["1147","1200","1066","1300"],a:"1147"},
    {q:"Кто написал 'Войну и мир'?",opts:["Достоевский","Чехов","Толстой","Пушкин"],a:"Толстой"},
    {q:"В каком году началась Вторая мировая война?",opts:["1939","1941","1938","1940"],a:"1939"},
    {q:"Первый космонавт в мире?",opts:["Армстронг","Гагарин","Титов","Леонов"],a:"Гагарин"},
    {q:"Столица Древнего Египта?",opts:["Александрия","Луксор","Мемфис","Фивы"],a:"Мемфис"},
    {q:"Кто изобрёл телефон?",opts:["Эдисон","Белл","Маркони","Тесла"],a:"Белл"},
  ],
  geo:[
    {q:"Самая длинная река мира?",opts:["Нил","Амазонка","Янцзы","Миссисипи"],a:"Нил"},
    {q:"Столица Австралии?",opts:["Сидней","Мельбурн","Канберра","Брисбен"],a:"Канберра"},
    {q:"Самая высокая гора мира?",opts:["К2","Килиманджаро","Эверест","Эльбрус"],a:"Эверест"},
    {q:"На каком континенте находится Египет?",opts:["Азия","Европа","Африка","Австралия"],a:"Африка"},
    {q:"Самое глубокое озеро мира?",opts:["Каспийское","Байкал","Танганьика","Виктория"],a:"Байкал"},
    {q:"Столица Бразилии?",opts:["Рио-де-Жанейро","Сан-Паулу","Бразилиа","Манаус"],a:"Бразилиа"},
  ],
  sport:[
    {q:"Сколько игроков в команде по футболу?",opts:["10","11","12","9"],a:"11"},
    {q:"Страна — родина Олимпийских игр?",opts:["Рим","Греция","Египет","Китай"],a:"Греция"},
    {q:"Где проходила Олимпиада 2024?",opts:["Токио","Лондон","Париж","Лос-Анджелес"],a:"Париж"},
    {q:"Сколько сетов нужно выиграть в теннис (ATP)?",opts:["2","3","4","5"],a:"3"},
    {q:"Чемпион ЧМ по футболу 2022?",opts:["Франция","Бразилия","Аргентина","Германия"],a:"Аргентина"},
  ],
  culture:[
    {q:"Кто написал 'Гарри Поттера'?",opts:["Роулинг","Толкин","Мартин","Льюис"],a:"Роулинг"},
    {q:"Автор 'Мастера и Маргариты'?",opts:["Пастернак","Булгаков","Ахматова","Зощенко"],a:"Булгаков"},
    {q:"В каком году вышел первый iPhone?",opts:["2005","2006","2007","2008"],a:"2007"},
    {q:"Кто написал 'Преступление и наказание'?",opts:["Толстой","Тургенев","Достоевский","Чехов"],a:"Достоевский"},
    {q:"Автор 'Властелина колец'?",opts:["Льюис","Толкин","Мартин","Сапковский"],a:"Толкин"},
  ],
  tech:[
    {q:"Что означает 'HTTP'?",opts:["Hypertext Transfer Protocol","High Tech Transfer Process","Hyperlink Text Transfer","None"],a:"Hypertext Transfer Protocol"},
    {q:"Кто основал Apple?",opts:["Гейтс","Маск","Джобс","Цукерберг"],a:"Джобс"},
    {q:"Язык программирования для веб-страниц?",opts:["Python","Java","JavaScript","C++"],a:"JavaScript"},
    {q:"Расшифровка 'AI'?",opts:["Auto Interface","Artificial Intelligence","Advanced Internet","None"],a:"Artificial Intelligence"},
    {q:"Компания создавшая ChatGPT?",opts:["Google","Microsoft","OpenAI","Anthropic"],a:"OpenAI"},
  ],
};

export default function IQBattle({ onBack }) {
  const [phase, setPhase] = useState("menu"); // menu|cat|game|result
  const [category, setCategory] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [qIdx, setQIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [selected, setSelected] = useState(null);
  const [aiSelected, setAiSelected] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [streak, setStreak] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const timerRef = useRef(null);

  function startGame(cat) {
    setCategory(cat);
    const qs=[...QUESTIONS[cat.id]].sort(()=>Math.random()-0.5).slice(0,7);
    setQuestions(qs);
    setQIdx(0); setScore(0); setAiScore(0); setStreak(0); setSelected(null); setAiSelected(null); setShowResult(false);
    setPhase("game");
  }

  useEffect(()=>{
    if(phase!=="game"||showResult) return;
    setTimeLeft(15);
    timerRef.current=setInterval(()=>{
      setTimeLeft(t=>{
        if(t<=1){ clearInterval(timerRef.current); autoNext(); return 0; }
        return t-1;
      });
    },1000);
    return()=>clearInterval(timerRef.current);
  },[qIdx,phase,showResult]);

  function autoNext() {
    if(selected===null) {
      const aiDelay=Math.floor(Math.random()*6)+3;
      const aiRight=Math.random()<0.55;
      const q=questions[qIdx];
      if(aiRight) { setAiScore(s=>s+10); setAiSelected(q.a); }
      else { setAiSelected(q.opts.find(o=>o!==q.a)); }
      setShowResult(true);
      setStreak(0);
      setTimeout(()=>{
        setShowResult(false); setSelected(null); setAiSelected(null);
        if(qIdx<questions.length-1) setQIdx(i=>i+1);
        else { setTotalScore(s=>s+score); setPhase("result"); }
      },2000);
    }
  }

  function answer(opt) {
    if(selected||showResult) return;
    clearInterval(timerRef.current);
    setSelected(opt);
    const q=questions[qIdx];
    const correct=opt===q.a;
    const timeBonus=Math.floor(timeLeft/3);
    const points=correct?10+timeBonus:0;
    if(correct){ setScore(s=>s+points); setStreak(st=>st+1); }
    else setStreak(0);

    const aiDelay=Math.floor(Math.random()*4)+2;
    const aiRight=Math.random()<0.55;
    setTimeout(()=>{
      if(aiRight){ setAiScore(s=>s+10); setAiSelected(q.a); }
      else setAiSelected(q.opts.find(o=>o!==q.a));
      setShowResult(true);
      setTimeout(()=>{
        setShowResult(false); setSelected(null); setAiSelected(null);
        if(qIdx<questions.length-1) setQIdx(i=>i+1);
        else { setTotalScore(s=>s+score+points); setPhase("result"); }
      },2000);
    },aiDelay*300);
  }

  if(phase==="menu") return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#050510,#0a0520,#050510)",padding:"16px",fontFamily:"Georgia,serif"}}>
      <button onClick={onBack} style={{background:"none",border:"1px solid #333",borderRadius:8,color:"#aaa",padding:"6px 12px",cursor:"pointer",fontSize:13,marginBottom:16}}>← Назад</button>
      <div style={{textAlign:"center",marginBottom:24}}>
        <div style={{fontSize:56,marginBottom:8}}>⚡</div>
        <div style={{fontSize:26,fontWeight:"bold",color:"#fff",marginBottom:4}}>IQ БИТВА</div>
        <div style={{fontSize:13,color:"#888"}}>Сразись с ИИ — кто умнее?</div>
        {totalScore>0&&<div style={{fontSize:13,color:"#f59e0b",marginTop:8}}>Твои очки: {totalScore} ⭐</div>}
      </div>
      <div style={{fontSize:13,color:"#666",marginBottom:12,textTransform:"uppercase",letterSpacing:1}}>Выбери категорию:</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        {CATEGORIES.map(cat=>(
          <button key={cat.id} onClick={()=>startGame(cat)} style={{padding:"16px 12px",background:`${cat.color}12`,border:`1px solid ${cat.color}35`,borderRadius:14,cursor:"pointer",fontFamily:"inherit",textAlign:"center",transition:"all 0.2s"}}
            onMouseEnter={e=>e.currentTarget.style.borderColor=cat.color}
            onMouseLeave={e=>e.currentTarget.style.borderColor=`${cat.color}35`}>
            <div style={{fontSize:28,marginBottom:6}}>{cat.emoji}</div>
            <div style={{fontSize:13,fontWeight:"bold",color:"#fff"}}>{cat.name}</div>
            <div style={{fontSize:11,color:"#666",marginTop:2}}>{QUESTIONS[cat.id].length} вопросов</div>
          </button>
        ))}
      </div>
      <div style={{marginTop:16,background:"rgba(255,255,255,0.04)",borderRadius:12,padding:14,fontSize:12,color:"#888",lineHeight:1.7}}>
        ⚡ Чем быстрее ответишь — тем больше очков<br/>
        🔥 Серия правильных ответов = бонус<br/>
        🤖 ИИ отвечает правильно в 55% случаев
      </div>
    </div>
  );

  if(phase==="game"&&questions[qIdx]) {
    const q=questions[qIdx];
    const timerPct=(timeLeft/15)*100;
    const timerColor=timeLeft>8?category.color:timeLeft>4?"#f59e0b":"#ef4444";
    return (
      <div style={{minHeight:"100vh",background:`linear-gradient(135deg,#050510,${category.color}15,#050510)`,padding:"14px 16px",fontFamily:"Georgia,serif"}}>
        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}>
          <div style={{background:"rgba(255,255,255,0.08)",borderRadius:10,padding:"6px 14px"}}>
            <div style={{fontSize:11,color:"#666"}}>Ты</div>
            <div style={{fontSize:18,fontWeight:"bold",color:category.color}}>{score}</div>
          </div>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:12,color:"#666"}}>{qIdx+1}/{questions.length}</div>
            {streak>=2&&<div style={{fontSize:11,color:"#f59e0b"}}>🔥 Серия {streak}</div>}
          </div>
          <div style={{background:"rgba(255,255,255,0.08)",borderRadius:10,padding:"6px 14px",textAlign:"right"}}>
            <div style={{fontSize:11,color:"#666"}}>ИИ</div>
            <div style={{fontSize:18,fontWeight:"bold",color:"#ef4444"}}>{aiScore}</div>
          </div>
        </div>

        {/* Timer */}
        <div style={{background:"rgba(255,255,255,0.08)",borderRadius:8,height:8,marginBottom:16,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${timerPct}%`,background:timerColor,borderRadius:8,transition:"width 1s linear"}}/>
        </div>
        <div style={{textAlign:"center",fontSize:20,fontWeight:"bold",color:timerColor,marginBottom:8}}>{timeLeft}с</div>

        {/* Question */}
        <div style={{background:"rgba(255,255,255,0.06)",border:`1px solid ${category.color}30`,borderRadius:16,padding:18,marginBottom:16,textAlign:"center"}}>
          <div style={{fontSize:24,marginBottom:8}}>{category.emoji}</div>
          <div style={{fontSize:16,color:"#fff",lineHeight:1.6,fontWeight:"500"}}>{q.q}</div>
        </div>

        {/* Options */}
        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:12}}>
          {q.opts.map(opt=>{
            const isSel=selected===opt;
            const isCorrect=showResult&&opt===q.a;
            const isWrong=showResult&&isSel&&opt!==q.a;
            const isAi=showResult&&aiSelected===opt&&opt!==q.a;
            return (
              <button key={opt} onClick={()=>answer(opt)} style={{padding:"13px 16px",borderRadius:12,border:`2px solid ${isCorrect?"#4ade80":isWrong?"#ef4444":isSel?category.color:"rgba(255,255,255,0.12)"}`,background:isCorrect?"rgba(74,222,128,0.15)":isWrong?"rgba(239,68,68,0.15)":isSel?`${category.color}20`:"rgba(255,255,255,0.04)",color:isCorrect?"#4ade80":isWrong?"#ef4444":"#fff",cursor:selected?"default":"pointer",fontSize:14,textAlign:"left",display:"flex",alignItems:"center",gap:10,fontFamily:"inherit",transition:"all 0.2s"}}>
                <span style={{flex:1}}>{opt}</span>
                {isCorrect&&<span>✅</span>}
                {isWrong&&<span>❌</span>}
                {isAi&&<span style={{color:"#ef4444",fontSize:11}}>ИИ</span>}
              </button>
            );
          })}
        </div>

        {showResult&&(
          <div style={{textAlign:"center",fontSize:13,color:selected===q.a?"#4ade80":"#ef4444",fontWeight:"bold"}}>
            {selected===q.a?`✅ +${10+Math.floor(timeLeft/3)} очков!`:"❌ Неверно!"}
            {aiSelected===q.a?" 🤖 ИИ ответил правильно":""}
          </div>
        )}
      </div>
    );
  }

  if(phase==="result") {
    const won=score>aiScore;
    const tied=score===aiScore;
    return (
      <div style={{minHeight:"100vh",background:won?"linear-gradient(135deg,#050510,#0a1505)":tied?"linear-gradient(135deg,#050510,#0a0a00)":"linear-gradient(135deg,#050510,#150505)",display:"flex",alignItems:"center",justifyContent:"center",padding:20,fontFamily:"Georgia,serif"}}>
        <div style={{textAlign:"center",maxWidth:320,width:"100%"}}>
          <div style={{fontSize:72,marginBottom:12}}>{won?"🏆":tied?"🤝":"😤"}</div>
          <div style={{fontSize:26,fontWeight:"bold",color:won?"#4ade80":tied?"#f59e0b":"#ef4444",marginBottom:8}}>
            {won?"Ты победил!":tied?"Ничья!":"ИИ победил!"}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
            <div style={{background:"rgba(255,255,255,0.06)",borderRadius:14,padding:16,textAlign:"center"}}>
              <div style={{fontSize:11,color:"#666",marginBottom:4}}>ТВОЙ СЧЁТ</div>
              <div style={{fontSize:32,fontWeight:"bold",color:category.color}}>{score}</div>
            </div>
            <div style={{background:"rgba(255,255,255,0.06)",borderRadius:14,padding:16,textAlign:"center"}}>
              <div style={{fontSize:11,color:"#666",marginBottom:4}}>СЧЁТ ИИ</div>
              <div style={{fontSize:32,fontWeight:"bold",color:"#ef4444"}}>{aiScore}</div>
            </div>
          </div>
          <div style={{background:"rgba(255,255,255,0.04)",borderRadius:12,padding:14,marginBottom:20,fontSize:13,color:"#888"}}>
            Общий IQ-рейтинг: <span style={{color:"#fff",fontWeight:"bold"}}>{totalScore} ⭐</span>
          </div>
          <div style={{display:"flex",gap:10}}>
            <button onClick={()=>startGame(category)} style={{flex:1,padding:13,background:`linear-gradient(135deg,${category.color},${category.color}88)`,border:"none",borderRadius:12,color:"#fff",fontSize:14,cursor:"pointer",fontWeight:"bold"}}>🔄 Снова</button>
            <button onClick={()=>setPhase("menu")} style={{flex:1,padding:13,background:"rgba(255,255,255,0.08)",border:"1px solid #333",borderRadius:12,color:"#fff",fontSize:14,cursor:"pointer"}}>Меню</button>
          </div>
        </div>
      </div>
    );
  }
  return null;
}
