import { useState, useEffect } from "react";

const PIECES = {
  wK:"♔",wQ:"♕",wR:"♖",wB:"♗",wN:"♘",wP:"♙",
  bK:"♚",bQ:"♛",bR:"♜",bB:"♝",bN:"♞",bP:"♟"
};

function initBoard() {
  const b = Array(8).fill(null).map(()=>Array(8).fill(null));
  const back = ["R","N","B","Q","K","B","N","R"];
  back.forEach((p,i)=>{ b[0][i]="b"+p; b[7][i]="w"+p; });
  for(let i=0;i<8;i++){ b[1][i]="bP"; b[6][i]="wP"; }
  return b;
}

function isValidMove(board, fr, fc, tr, tc, turn) {
  const piece = board[fr][fc];
  if(!piece) return false;
  const color = piece[0];
  if(color !== turn) return false;
  const target = board[tr][tc];
  if(target && target[0] === color) return false;
  const type = piece[1];
  const dr = tr-fr, dc = tc-fc;
  const abr = Math.abs(dr), abc = Math.abs(dc);

  if(type==="P") {
    const dir = color==="w"?-1:1;
    const startRow = color==="w"?6:1;
    if(dc===0 && !target) {
      if(dr===dir) return true;
      if(dr===2*dir && fr===startRow && !board[fr+dir][fc]) return true;
    }
    if(abc===1 && dr===dir && target) return true;
    return false;
  }
  if(type==="N") return (abr===2&&abc===1)||(abr===1&&abc===2);
  if(type==="K") return abr<=1&&abc<=1;
  if(type==="R"||type==="Q") {
    if(dr===0||dc===0) {
      const stepR=dr===0?0:dr>0?1:-1, stepC=dc===0?0:dc>0?1:-1;
      let r=fr+stepR,c=fc+stepC;
      while(r!==tr||c!==tc){ if(board[r][c]) return false; r+=stepR; c+=stepC; }
      return true;
    }
    if(type==="R") return false;
  }
  if(type==="B"||(type==="Q"&&abr===abc)) {
    if(abr!==abc) return false;
    const stepR=dr>0?1:-1, stepC=dc>0?1:-1;
    let r=fr+stepR,c=fc+stepC;
    while(r!==tr||c!==tc){ if(board[r][c]) return false; r+=stepR; c+=stepC; }
    return true;
  }
  return false;
}

function getValidMoves(board, turn) {
  const moves=[];
  for(let fr=0;fr<8;fr++) for(let fc=0;fc<8;fc++) {
    if(!board[fr][fc]||board[fr][fc][0]!==turn) continue;
    for(let tr=0;tr<8;tr++) for(let tc=0;tc<8;tc++) {
      if(isValidMove(board,fr,fc,tr,tc,turn)) moves.push({fr,fc,tr,tc});
    }
  }
  return moves;
}

function evalBoard(board) {
  const vals={P:1,N:3,B:3,R:5,Q:9,K:0};
  let score=0;
  board.forEach(row=>row.forEach(p=>{ if(p){ const v=vals[p[1]]; score+=p[0]==="w"?-v:v; } }));
  return score;
}

function minimax(board,depth,isMax) {
  if(depth===0) return evalBoard(board);
  const turn=isMax?"b":"w";
  const moves=getValidMoves(board,turn);
  if(!moves.length) return isMax?-Infinity:Infinity;
  let best=isMax?-Infinity:Infinity;
  for(const m of moves) {
    const nb=board.map(r=>[...r]);
    nb[m.tr][m.tc]=nb[m.fr][m.fc]; nb[m.fr][m.fc]=null;
    const v=minimax(nb,depth-1,!isMax);
    best=isMax?Math.max(best,v):Math.min(best,v);
  }
  return best;
}

function aiMove(board) {
  const moves=getValidMoves(board,"b");
  if(!moves.length) return null;
  let best=-Infinity, bestMove=null;
  for(const m of moves) {
    const nb=board.map(r=>[...r]);
    nb[m.tr][m.tc]=nb[m.fr][m.fc]; nb[m.fr][m.fc]=null;
    const v=minimax(nb,2,false);
    if(v>best){ best=v; bestMove=m; }
  }
  return bestMove;
}

export default function Chess({ onBack }) {
  const [board, setBoard] = useState(initBoard);
  const [sel, setSel] = useState(null);
  const [turn, setTurn] = useState("w");
  const [status, setStatus] = useState("Ваш ход — белые");
  const [history, setHistory] = useState([]);
  const [captured, setCaptured] = useState({w:[],b:[]});
  const [thinking, setThinking] = useState(false);
  const [lastMove, setLastMove] = useState(null);
  const [validMoves, setValidMoves] = useState([]);

  useEffect(()=>{
    if(turn==="b"&&status==="Ход ИИ...") {
      setThinking(true);
      setTimeout(()=>{
        const move=aiMove(board);
        if(move) {
          const nb=board.map(r=>[...r]);
          const cap=nb[move.tr][move.tc];
          nb[move.tr][move.tc]=nb[move.fr][move.fc]; nb[move.fr][move.fc]=null;
          if(cap) setCaptured(c=>({...c,w:[...c.w,cap]}));
          setBoard(nb); setLastMove(move);
          setHistory(h=>[...h,`ИИ: ${String.fromCharCode(97+move.fc)}${8-move.fr}→${String.fromCharCode(97+move.tc)}${8-move.tr}`]);
          setTurn("w"); setStatus("Ваш ход — белые");
        }
        setThinking(false);
      }, 600);
    }
  },[turn,status]);

  function handleClick(r,c) {
    if(turn!=="w"||thinking) return;
    if(sel) {
      if(isValidMove(board,sel[0],sel[1],r,c,"w")) {
        const nb=board.map(row=>[...row]);
        const cap=nb[r][c];
        nb[r][c]=nb[sel[0]][sel[1]]; nb[sel[0]][sel[1]]=null;
        if(nb[r][c]==="wP"&&r===0) nb[r][c]="wQ";
        if(cap) setCaptured(cc=>({...cc,b:[...cc.b,cap]}));
        setBoard(nb); setLastMove({fr:sel[0],fc:sel[1],tr:r,tc:c});
        setHistory(h=>[...h,`Вы: ${String.fromCharCode(97+sel[1])}${8-sel[0]}→${String.fromCharCode(97+c)}${8-r}`]);
        setSel(null); setValidMoves([]); setTurn("b"); setStatus("Ход ИИ...");
      } else { setSel(null); setValidMoves([]); }
    } else {
      if(board[r][c]&&board[r][c][0]==="w") {
        setSel([r,c]);
        const moves=[];
        for(let tr=0;tr<8;tr++) for(let tc=0;tc<8;tc++) {
          if(isValidMove(board,r,c,tr,tc,"w")) moves.push([tr,tc]);
        }
        setValidMoves(moves);
      }
    }
  }

  function reset() { setBoard(initBoard()); setSel(null); setTurn("w"); setStatus("Ваш ход — белые"); setHistory([]); setCaptured({w:[],b:[]}); setLastMove(null); setValidMoves([]); }

  const isLight=(r,c)=>(r+c)%2===0;

  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#0a0a0f,#0f0a1a,#0a0f0a)",padding:"12px 16px",fontFamily:"Georgia,serif"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
        <button onClick={onBack} style={{background:"none",border:"1px solid #333",borderRadius:8,color:"#aaa",padding:"6px 12px",cursor:"pointer",fontSize:13}}>← Назад</button>
        <div style={{fontSize:18,fontWeight:"bold",color:"#fff"}}>♟️ Шахматы</div>
        <div style={{marginLeft:"auto",fontSize:12,background:"rgba(255,255,255,0.08)",borderRadius:8,padding:"4px 10px",color:thinking?"#f59e0b":"#4ade80"}}>{thinking?"🤔 ИИ думает...":status}</div>
      </div>

      {/* Captured pieces */}
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:8,fontSize:14}}>
        <div style={{color:"#aaa"}}>Захвачено: {captured.w.map(p=>PIECES[p]).join("")}</div>
        <div style={{color:"#aaa"}}>{captured.b.map(p=>PIECES[p]).join("")} :Захвачено</div>
      </div>

      {/* Board */}
      <div style={{display:"flex",justifyContent:"center",marginBottom:12}}>
        <div>
          {board.map((row,r)=>(
            <div key={r} style={{display:"flex"}}>
              <div style={{width:20,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#666"}}>{8-r}</div>
              {row.map((piece,c)=>{
                const isSel=sel&&sel[0]===r&&sel[1]===c;
                const isVM=validMoves.some(m=>m[0]===r&&m[1]===c);
                const isLast=lastMove&&((lastMove.fr===r&&lastMove.fc===c)||(lastMove.tr===r&&lastMove.tc===c));
                const bg=isSel?"#f59e0b":isLast?"rgba(99,102,241,0.5)":isLight(r,c)?"#e8d5b0":"#7a5230";
                return (
                  <div key={c} onClick={()=>handleClick(r,c)} style={{width:40,height:40,background:bg,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",position:"relative",fontSize:26,userSelect:"none",transition:"all 0.15s"}}>
                    {isVM&&<div style={{position:"absolute",width:14,height:14,borderRadius:"50%",background:piece?"rgba(255,0,0,0.4)":"rgba(0,0,0,0.3)",border:piece?"2px solid red":"none"}}/>}
                    {piece&&<span style={{textShadow:piece[0]==="w"?"0 1px 3px rgba(0,0,0,0.5)":"0 1px 3px rgba(255,255,255,0.2)",zIndex:1}}>{PIECES[piece]}</span>}
                  </div>
                );
              })}
            </div>
          ))}
          <div style={{display:"flex",marginLeft:20}}>
            {["a","b","c","d","e","f","g","h"].map(l=><div key={l} style={{width:40,textAlign:"center",fontSize:11,color:"#666"}}>{l}</div>)}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={{display:"flex",gap:10,marginBottom:12}}>
        <button onClick={reset} style={{flex:1,padding:10,background:"linear-gradient(135deg,#7c3aed,#5b21b6)",border:"none",borderRadius:10,color:"#fff",cursor:"pointer",fontSize:13,fontWeight:"bold"}}>🔄 Новая игра</button>
      </div>

      {/* History */}
      {history.length>0&&(
        <div style={{background:"rgba(255,255,255,0.05)",borderRadius:10,padding:10,maxHeight:80,overflowY:"auto"}}>
          <div style={{fontSize:11,color:"#666",marginBottom:4}}>История ходов:</div>
          {history.slice(-6).map((h,i)=><div key={i} style={{fontSize:12,color:"#aaa"}}>{h}</div>)}
        </div>
      )}
    </div>
  );
}
