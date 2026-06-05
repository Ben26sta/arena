import { useState, useEffect, useCallback } from "react";

const PIECES = {
  wK:"♔",wQ:"♕",wR:"♖",wB:"♗",wN:"♘",wP:"♙",
  bK:"♚",bQ:"♛",bR:"♜",bB:"♝",bN:"♞",bP:"♟"
};
const VALS = {K:0,Q:9,R:5,B:3,N:3,P:1};
const POS_BONUS = {
  P:[[0,0,0,0,0,0,0,0],[5,5,5,5,5,5,5,5],[1,1,2,3,3,2,1,1],[0.5,0.5,1,2.5,2.5,1,0.5,0.5],[0,0,0,2,2,0,0,0],[0.5,-0.5,-1,0,0,-1,-0.5,0.5],[0.5,1,1,-2,-2,1,1,0.5],[0,0,0,0,0,0,0,0]],
  N:[[-5,-4,-3,-3,-3,-3,-4,-5],[-4,-2,0,0,0,0,-2,-4],[-3,0,1,1.5,1.5,1,0,-3],[-3,0.5,1.5,2,2,1.5,0.5,-3],[-3,0,1.5,2,2,1.5,0,-3],[-3,0.5,1,1.5,1.5,1,0.5,-3],[-4,-2,0,0.5,0.5,0,-2,-4],[-5,-4,-3,-3,-3,-3,-4,-5]],
};

function initBoard() {
  const b=Array(8).fill(null).map(()=>Array(8).fill(null));
  ["R","N","B","Q","K","B","N","R"].forEach((p,i)=>{b[0][i]="b"+p;b[7][i]="w"+p;});
  for(let i=0;i<8;i++){b[1][i]="bP";b[6][i]="wP";}
  return b;
}

function isValid(board,fr,fc,tr,tc,turn) {
  const piece=board[fr][fc];
  if(!piece||piece[0]!==turn) return false;
  const target=board[tr][tc];
  if(target&&target[0]===turn) return false;
  const type=piece[1],dr=tr-fr,dc=tc-fc,abr=Math.abs(dr),abc=Math.abs(dc),color=piece[0];
  if(type==="P"){
    const dir=color==="w"?-1:1,start=color==="w"?6:1;
    if(dc===0&&!target){if(dr===dir)return true;if(dr===2*dir&&fr===start&&!board[fr+dir][fc])return true;}
    if(abc===1&&dr===dir&&target)return true;
    return false;
  }
  if(type==="N")return(abr===2&&abc===1)||(abr===1&&abc===2);
  if(type==="K")return abr<=1&&abc<=1;
  const checkPath=(sr,sc)=>{let r=fr+sr,c=fc+sc;while(r!==tr||c!==tc){if(board[r][c])return false;r+=sr;c+=sc;}return true;};
  if(type==="R"||(type==="Q"&&(dr===0||dc===0))){
    if(dr!==0&&dc!==0)return false;
    const sr=dr===0?0:dr>0?1:-1,sc=dc===0?0:dc>0?1:-1;
    return checkPath(sr,sc);
  }
  if(type==="B"||(type==="Q"&&abr===abc)){
    if(abr!==abc)return false;
    return checkPath(dr>0?1:-1,dc>0?1:-1);
  }
  return false;
}

function getMoves(board,turn){
  const moves=[];
  for(let fr=0;fr<8;fr++)for(let fc=0;fc<8;fc++){
    if(!board[fr][fc]||board[fr][fc][0]!==turn)continue;
    for(let tr=0;tr<8;tr++)for(let tc=0;tc<8;tc++){
      if(isValid(board,fr,fc,tr,tc,turn))moves.push({fr,fc,tr,tc,piece:board[fr][fc],capture:board[tr][tc]});
    }
  }
  return moves;
}

function evalBoard(board){
  let score=0;
  board.forEach((row,r)=>row.forEach((p,c)=>{
    if(!p)return;
    const v=VALS[p[1]];
    const pb=POS_BONUS[p[1]];
    const pos=pb?(p[0]==="w"?pb[r][c]:pb[7-r][7-c]):0;
    score+=(p[0]==="b"?1:-1)*(v*10+pos);
  }));
  return score;
}

function minimax(board,depth,alpha,beta,isMax){
  if(depth===0)return evalBoard(board);
  const turn=isMax?"b":"w";
  const moves=getMoves(board,turn);
  if(!moves.length)return isMax?-1000:1000;
  let best=isMax?-Infinity:Infinity;
  for(const m of moves){
    const nb=board.map(r=>[...r]);
    nb[m.tr][m.tc]=nb[m.fr][m.fc];nb[m.fr][m.fc]=null;
    if(nb[m.tr][m.tc]==="wP"&&m.tr===0)nb[m.tr][m.tc]="wQ";
    if(nb[m.tr][m.tc]==="bP"&&m.tr===7)nb[m.tr][m.tc]="bQ";
    const v=minimax(nb,depth-1,alpha,beta,!isMax);
    if(isMax){best=Math.max(best,v);alpha=Math.max(alpha,v);}
    else{best=Math.min(best,v);beta=Math.min(beta,v);}
    if(beta<=alpha)break;
  }
  return best;
}

function aiMove(board,depth){
  const moves=getMoves(board,"b");
  if(!moves.length)return null;
  // Add randomness for easier levels
  if(depth===0){
    const captures=moves.filter(m=>m.capture);
    if(captures.length>0&&Math.random()>0.3)return captures[Math.floor(Math.random()*captures.length)];
    return moves[Math.floor(Math.random()*moves.length)];
  }
  let best=-Infinity,bestMoves=[];
  for(const m of moves){
    const nb=board.map(r=>[...r]);
    nb[m.tr][m.tc]=nb[m.fr][m.fc];nb[m.fr][m.fc]=null;
    const v=minimax(nb,depth,-Infinity,Infinity,false);
    if(v>best){best=v;bestMoves=[m];}
    else if(v===best)bestMoves.push(m);
  }
  // Add slight randomness even at higher levels
  if(depth===1&&Math.random()>0.7)return moves[Math.floor(Math.random()*moves.length)];
  return bestMoves[Math.floor(Math.random()*bestMoves.length)];
}

const DIFFICULTY = [
  {id:"easy",label:"Новичок",emoji:"🌱",depth:0,desc:"ИИ ходит случайно"},
  {id:"medium",label:"Средний",emoji:"⚔️",depth:2,desc:"ИИ думает на 2 хода"},
  {id:"hard",label:"Эксперт",emoji:"🔥",depth:3,desc:"ИИ думает на 3 хода"},
];

export default function Chess({onBack}) {
  const [board,setBoard]=useState(initBoard);
  const [sel,setSel]=useState(null);
  const [turn,setTurn]=useState("w");
  const [thinking,setThinking]=useState(false);
  const [lastMove,setLastMove]=useState(null);
  const [validMoves,setValidMoves]=useState([]);
  const [captured,setCaptured]=useState({w:[],b:[]});
  const [history,setHistory]=useState([]);
  const [gameOver,setGameOver]=useState(null);
  const [difficulty,setDifficulty]=useState(null);

  useEffect(()=>{
    if(turn!=="b"||!difficulty)return;
    setThinking(true);
    const t=setTimeout(()=>{
      const move=aiMove(board,difficulty.depth);
      if(!move){setGameOver("white");setThinking(false);return;}
      const nb=board.map(r=>[...r]);
      const cap=nb[move.tr][move.tc];
      nb[move.tr][move.tc]=nb[move.fr][move.fc];nb[move.fr][move.fc]=null;
      if(nb[move.tr][move.tc]==="bP"&&move.tr===7)nb[move.tr][move.tc]="bQ";
      if(cap){
        if(cap==="wK"){setGameOver("black");setThinking(false);setBoard(nb);setLastMove(move);return;}
        setCaptured(c=>({...c,w:[...c.w,cap]}));
      }
      setBoard(nb);setLastMove(move);
      setHistory(h=>[...h,`ИИ: ${String.fromCharCode(97+move.fc)}${8-move.fr}→${String.fromCharCode(97+move.tc)}${8-move.tr}`]);
      setTurn("w");setThinking(false);
    },difficulty.depth===0?300:difficulty.depth===2?800:1500);
    return()=>clearTimeout(t);
  },[turn,difficulty]);

  function click(r,c){
    if(turn!=="w"||thinking||gameOver||!difficulty)return;
    if(sel){
      if(isValid(board,sel[0],sel[1],r,c,"w")){
        const nb=board.map(row=>[...row]);
        const cap=nb[r][c];
        nb[r][c]=nb[sel[0]][sel[1]];nb[sel[0]][sel[1]]=null;
        if(nb[r][c]==="wP"&&r===0)nb[r][c]="wQ";
        if(cap){
          if(cap==="bK"){setGameOver("white");}
          setCaptured(cc=>({...cc,b:[...cc.b,cap]}));
        }
        setBoard(nb);setLastMove({fr:sel[0],fc:sel[1],tr:r,tc:c});
        setHistory(h=>[...h,`Ты: ${String.fromCharCode(97+sel[1])}${8-sel[0]}→${String.fromCharCode(97+c)}${8-r}`]);
        setSel(null);setValidMoves([]);
        if(!gameOver)setTurn("b");
      }else{setSel(null);setValidMoves([]);}
    }else if(board[r][c]&&board[r][c][0]==="w"){
      setSel([r,c]);
      const mv=[];
      for(let tr=0;tr<8;tr++)for(let tc=0;tc<8;tc++)if(isValid(board,r,c,tr,tc,"w"))mv.push([tr,tc]);
      setValidMoves(mv);
    }
  }

  function reset(){setBoard(initBoard());setSel(null);setTurn("w");setThinking(false);setLastMove(null);setValidMoves([]);setCaptured({w:[],b:[]});setHistory([]);setGameOver(null);}

  // DIFFICULTY SELECT
  if(!difficulty) return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#0f0520,#0a0f1a)",padding:"20px 16px",fontFamily:"Georgia,serif",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
      <button onClick={onBack} style={{position:"absolute",top:16,left:16,background:"none",border:"1px solid #333",borderRadius:8,color:"#aaa",padding:"6px 12px",cursor:"pointer",fontSize:13}}>← Назад</button>
      <div style={{fontSize:56,marginBottom:12}}>♟️</div>
      <div style={{fontSize:24,fontWeight:"bold",color:"#fff",marginBottom:6}}>Шахматы</div>
      <div style={{fontSize:14,color:"#666",marginBottom:30}}>Выбери уровень сложности</div>
      <div style={{display:"flex",flexDirection:"column",gap:12,width:"100%",maxWidth:320}}>
        {DIFFICULTY.map(d=>(
          <button key={d.id} onClick={()=>setDifficulty(d)} style={{padding:"16px 20px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:16,cursor:"pointer",fontFamily:"inherit",color:"#fff",textAlign:"left",display:"flex",alignItems:"center",gap:14,transition:"all 0.2s"}}
            onMouseEnter={e=>e.currentTarget.style.borderColor="#7c3aed"}
            onMouseLeave={e=>e.currentTarget.style.borderColor="rgba(255,255,255,0.1)"}>
            <span style={{fontSize:28}}>{d.emoji}</span>
            <div>
              <div style={{fontSize:16,fontWeight:"bold"}}>{d.label}</div>
              <div style={{fontSize:12,color:"#666",marginTop:2}}>{d.desc}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  const isLight=(r,c)=>(r+c)%2===0;

  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#0a0a0f,#0f0a1a)",padding:"12px 16px",fontFamily:"Georgia,serif"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
        <button onClick={()=>setDifficulty(null)} style={{background:"none",border:"1px solid #333",borderRadius:8,color:"#aaa",padding:"6px 12px",cursor:"pointer",fontSize:13}}>← Меню</button>
        <div style={{fontSize:16,fontWeight:"bold",color:"#fff"}}>♟️ {difficulty.emoji} {difficulty.label}</div>
        <div style={{marginLeft:"auto",fontSize:12,padding:"4px 10px",background:"rgba(255,255,255,0.08)",borderRadius:8,color:thinking?"#f59e0b":gameOver?"#ef4444":turn==="w"?"#4ade80":"#aaa"}}>
          {gameOver?(gameOver==="white"?"🏆 Ты победил!":"💀 ИИ победил!"):thinking?"🤔 Думает...":turn==="w"?"Твой ход":"Ход ИИ"}
        </div>
      </div>

      <div style={{display:"flex",justifyContent:"space-between",marginBottom:6,fontSize:13}}>
        <div style={{color:"#888"}}>Захв: {captured.w.map(p=>PIECES[p]).join("")||"—"}</div>
        <div style={{color:"#888"}}>{captured.b.map(p=>PIECES[p]).join("")||"—"} :Захв</div>
      </div>

      <div style={{display:"flex",justifyContent:"center",marginBottom:12}}>
        <div style={{boxShadow:"0 8px 40px rgba(0,0,0,0.6)",borderRadius:4,overflow:"hidden"}}>
          {board.map((row,r)=>(
            <div key={r} style={{display:"flex"}}>
              <div style={{width:22,height:40,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#555",background:"#111"}}>{8-r}</div>
              {row.map((piece,c)=>{
                const isSel=sel&&sel[0]===r&&sel[1]===c;
                const isVM=validMoves.some(m=>m[0]===r&&m[1]===c);
                const isLast=lastMove&&((lastMove.fr===r&&lastMove.fc===c)||(lastMove.tr===r&&lastMove.tc===c));
                const bg=isSel?"#f59e0b":isLast?"rgba(99,102,241,0.6)":isLight(r,c)?"#f0d9b5":"#b58863";
                return (
                  <div key={c} onClick={()=>click(r,c)} style={{width:40,height:40,background:bg,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",position:"relative",fontSize:26,userSelect:"none"}}>
                    {isVM&&<div style={{position:"absolute",width:piece?38:14,height:piece?38:14,borderRadius:piece?"50%":"50%",background:piece?"rgba(239,68,68,0.35)":"rgba(0,0,0,0.25)",border:piece?"3px solid rgba(239,68,68,0.7)":"none",pointerEvents:"none"}}/>}
                    {piece&&<span style={{zIndex:1,filter:"drop-shadow(0 1px 2px rgba(0,0,0,0.5))"}}>{PIECES[piece]}</span>}
                  </div>
                );
              })}
            </div>
          ))}
          <div style={{display:"flex",background:"#111"}}>
            <div style={{width:22,height:18}}/>
            {["a","b","c","d","e","f","g","h"].map(l=><div key={l} style={{width:40,textAlign:"center",fontSize:10,color:"#555"}}>{l}</div>)}
          </div>
        </div>
      </div>

      {gameOver&&(
        <div style={{textAlign:"center",marginBottom:12}}>
          <div style={{fontSize:32,marginBottom:6}}>{gameOver==="white"?"🏆":"💀"}</div>
          <button onClick={reset} style={{padding:"10px 24px",background:"linear-gradient(135deg,#7c3aed,#5b21b6)",border:"none",borderRadius:10,color:"#fff",cursor:"pointer",fontSize:14,fontWeight:"bold"}}>Новая игра</button>
        </div>
      )}

      {!gameOver&&(
        <div style={{display:"flex",gap:8,marginBottom:10}}>
          <button onClick={reset} style={{flex:1,padding:10,background:"rgba(255,255,255,0.06)",border:"1px solid #333",borderRadius:10,color:"#aaa",cursor:"pointer",fontSize:13}}>🔄 Заново</button>
          <button onClick={()=>setDifficulty(null)} style={{flex:1,padding:10,background:"rgba(255,255,255,0.06)",border:"1px solid #333",borderRadius:10,color:"#aaa",cursor:"pointer",fontSize:13}}>⚙️ Уровень</button>
        </div>
      )}

      {history.length>0&&(
        <div style={{background:"rgba(255,255,255,0.04)",borderRadius:10,padding:10,maxHeight:70,overflowY:"auto"}}>
          {history.slice(-5).map((h,i)=><div key={i} style={{fontSize:11,color:"#555"}}>{h}</div>)}
        </div>
      )}
    </div>
  );
}
