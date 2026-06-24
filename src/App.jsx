import React, { useState, useEffect, useRef } from "react";
import { Chess } from "chess.js";
import PgnInput from "./PgnInput";
import ChessBoard from "./ChessBoard";
import { getBestMove } from "./utils/stockfish";

export default function App() {
  const [history, setHistory]           = useState([]);
  const [moveIndex, setMoveIndex]       = useState(0);
  const [position, setPosition]         = useState("start");
  const [currentAnnotation, setCA]      = useState("");
  const [annotationType, setAT]         = useState("");
  const [boardWidth, setBoardWidth]     = useState(460);
  const [whiteName, setWhiteName]       = useState("White");
  const [blackName, setBlackName]       = useState("Black");
  const [matchResult, setMatchResult]   = useState("");
  const [flipped, setFlipped]           = useState(false);
  const [gameInfo, setGameInfo]         = useState({});
  const [dark, setDark]                 = useState(false);
  const activeMoveRef = useRef(null);
  const canvasRef     = useRef(null);

  const bookMoves = new Set(["e4","d4","Nf3","c4","e5","c5","Nc6","d6"]);

  /* ── Board sizing: center column only ── */
  useEffect(() => {
    const calc = () => {
      const leftW  = 300;   // left sidebar
      const rightW = 260;   // right move-list panel
      const hPad   = 48;    // padding inside center col (24px each side)
      const vPad   = 260;   // header + player rows + annotation + gaps
      const availW = window.innerWidth  - leftW - rightW - hPad;
      const availH = window.innerHeight - vPad;
      setBoardWidth(Math.max(280, Math.min(Math.floor(Math.min(availW, availH)), 560)));
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  /* ── Canvas animation ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let raf;
    let W = window.innerWidth, H = window.innerHeight;
    canvas.width = W; canvas.height = H;
    const onResize = () => { W = window.innerWidth; H = window.innerHeight; canvas.width = W; canvas.height = H; };
    window.addEventListener("resize", onResize);

    const PIECES = ["♟","♞","♝","♜","♛","♔","♕","♖","♗","♘","♙","♚"];
    // increased particle count/size/opacity for better visibility
    const particles = Array.from({ length: 36 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      size: 26 + Math.random() * 52,
      speed: 0.28 + Math.random() * 0.6,
      drift: (Math.random() - 0.5) * 0.6,
      opacity: 0.08 + Math.random() * 0.14,
      symbol: PIECES[Math.floor(Math.random() * PIECES.length)],
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.014,
    }));

    const orbs = Array.from({ length: 5 }, (_, i) => ({
      cx: W * (0.08 + i * 0.22), cy: H * (0.2 + (i % 2) * 0.5),
      r: 90 + Math.random() * 110, phase: (i / 5) * Math.PI * 2,
      speed: 0.00028 + Math.random() * 0.0002,
    }));

    let t = 0;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      t++;
      // diagonal lines
      ctx.strokeStyle = dark ? "rgba(212,175,55,0.05)" : "rgba(120,80,20,0.05)";
      ctx.lineWidth = 0.5;
      const G = 84;
      for (let x = -H; x < W + H; x += G) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + H, H); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + H, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      // orbs (stronger glow)
      orbs.forEach(o => {
        const px = o.cx + Math.cos(o.phase + t * o.speed * 60) * o.r * 0.35;
        const py = o.cy + Math.sin(o.phase + t * o.speed * 40) * o.r * 0.22;
        const grad = ctx.createRadialGradient(px, py, 0, px, py, o.r);
        const col  = dark ? "212,175,55" : "160,110,30";
        grad.addColorStop(0, `rgba(${col},0.22)`);
        grad.addColorStop(0.5, `rgba(${col},0.08)`);
        grad.addColorStop(1, `rgba(${col},0)`);
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(px, py, o.r, 0, Math.PI * 2); ctx.fill();
      });
      // pieces — darker on light mode, lighter on dark mode, with glow
      particles.forEach(p => {
        ctx.save();
        ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.globalAlpha = p.opacity;
        // light theme -> dark pieces; dark theme -> light pieces
        ctx.fillStyle = dark ? "#f8f1d8" : "#0b0704";
        // add soft glow for visibility
        ctx.shadowBlur = 16;
        ctx.shadowColor = ctx.fillStyle;
        ctx.font = `${p.size}px serif`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(p.symbol, 0, 0);
        // reset shadow
        ctx.shadowBlur = 0;
        ctx.restore();
        p.y -= p.speed; p.x += p.drift; p.rot += p.rotSpeed;
        if (p.y < -80) { p.y = H + 80; p.x = Math.random() * W; }
        if (p.x < -80) p.x = W + 80;
        if (p.x > W + 80) p.x = -80;
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); };
  }, [dark]);

  useEffect(() => {
    activeMoveRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [moveIndex]);

  const fenAt = (moves, idx) => {
    const g = new Chess();
    for (let i = 0; i < idx; i++) g.move(moves[i]);
    return g.fen();
  };

  const loadPGN = (pgn) => {
    const g = new Chess();
    try { g.loadPgn(pgn.trim()); } catch { return alert("Invalid PGN!"); }
    const moves = g.history();
    if (!moves.length) return alert("No moves found!");
    setHistory(moves); setMoveIndex(0); setPosition("start");
    setCA(""); setAT("");
    const h = g.header();
    setWhiteName(h.White || "White"); setBlackName(h.Black || "Black");
    setMatchResult(h.Result || "");
    setGameInfo({ Event: h.Event||"", Site: h.Site||"", Date: h.Date||"", Round: h.Round||"" });
  };

  const goPrev = () => {
    if (moveIndex > 0) {
      const ni = moveIndex - 1;
      setMoveIndex(ni); setPosition(ni === 0 ? "start" : fenAt(history, ni));
      setCA(""); setAT("");
    }
  };

  const goNext = async () => {
    if (moveIndex < history.length) {
      const san = history[moveIndex];
      let tag = "", type = "";
      if (bookMoves.has(san) && moveIndex < 10) {
        tag = `Book move — ${san}`; type = "book";
      } else {
        setCA("Analyzing position…"); setAT("loading");
        const { best: bestUci } = await getBestMove(fenAt(history, moveIndex), 12);
        const board = new Chess(fenAt(history, moveIndex));
        const from = bestUci.slice(0,2), to = bestUci.slice(2,4);
        const promo = bestUci.length === 5 ? bestUci[4] : undefined;
        const mo = { from, to }; if (promo) mo.promotion = promo;
        const res = board.move(mo);
        const bestSan = res ? res.san : bestUci;
        if (san === bestSan) { tag = `Best move — ${san}`; type = "great"; }
        else { tag = `Engine prefers ${bestSan} over ${san}`; type = "suggest"; }
      }
      const ni = moveIndex + 1;
      setMoveIndex(ni); setPosition(fenAt(history, ni));
      setCA(tag); setAT(type);
    }
  };

  const jumpTo = (idx) => {
    setMoveIndex(idx); setPosition(idx === 0 ? "start" : fenAt(history, idx));
    setCA(""); setAT("");
  };

  const downloadPGN = () => {
    const el = document.createElement("a");
    el.href = URL.createObjectURL(new Blob([history.join(" ")], { type: "text/plain" }));
    el.download = `${whiteName}_vs_${blackName}.pgn`; el.click();
  };
  const resetBoard  = () => { setMoveIndex(0); setPosition("start"); setCA(""); setAT(""); };
  const copyFEN     = () => navigator.clipboard.writeText(position);
  const whiteToMove = moveIndex % 2 === 0;
  const pct         = history.length > 0 ? Math.round((moveIndex / history.length) * 100) : 0;

  /* ── CSS tokens driven by dark/light ── */
  const t = dark ? {
    bg:         "#0f0f0f",
    panelBg:    "#161410",
    panelBor:   "#c9a020",
    headerBg:   "#0a0806",
    headerBor:  "#c9a020",
    txt:        "#f0e8d0",
    txtMid:     "#c9a020",
    txtDim:     "#6a5a30",
    txtFaint:   "#3a2a10",
    cardBg:     "rgba(255,255,255,0.04)",
    cardBor:    "rgba(255,255,255,0.09)",
    playerBg:   "rgba(255,255,255,0.04)",
    playerBor:  "rgba(255,255,255,0.1)",
    playerActB: "rgba(212,175,55,0.15)",
    playerActBor:"#c9a020",
    nameTxt:    "#c0a870",
    nameAct:    "#f5d060",
    sideTxt:    "#4a3810",
    avBlackBg:  "#0e0c08",
    avWhiteBg:  "rgba(240,230,200,0.12)",
    annBg:      "rgba(16,14,10,0.92)",
    annBor:     "rgba(255,255,255,0.08)",
    mlBg:       "#161410",
    mlBor:      "#c9a020",
    mlHeadBg:   "rgba(212,175,55,0.08)",
    mlHeadBor:  "rgba(212,175,55,0.18)",
    mlRowBor:   "rgba(255,255,255,0.04)",
    mlRowHov:   "rgba(212,175,55,0.06)",
    mlRowLit:   "rgba(212,175,55,0.06)",
    mlNum:      "#4a3810",
    mlMove:     "#9a8050",
    mlActBg:    "rgba(212,175,55,0.2)",
    mlActBor:   "#d4af37",
    mlActTxt:   "#f5d060",
    mlActLBor:  "3px solid #d4af37",
    togBg:      "rgba(212,175,55,0.15)",
    togBor:     "#c9a020",
    togTxt:     "#f5d060",
    progCard:   "rgba(212,175,55,0.08)",
    progBor:    "rgba(212,175,55,0.2)",
    progTitle:  "#d4af37",
    progPct:    "#f5d060",
    progFill:   "linear-gradient(90deg,#a07810,#d4af37,#f5d060)",
    progSub:    "#6a5030",
    progSubB:   "#c9a020",
    resBg:      "rgba(16,14,10,0.9)",
    resBor:     "#c9a020",
    resScore:   "#f5d060",
    resWho:     "#9a8040",
    eventBg:    "rgba(255,255,255,0.04)",
    eventBor:   "rgba(212,175,55,0.25)",
    eventName:  "#f0e8d0",
    eventMeta:  "#6a5030",
    boardRing1: "#c9a020",
    boardRing2: "#0f0f0f",
  } : {
    bg:         "#f2e8d8",
    panelBg:    "#1a120a",
    panelBor:   "#c9a020",
    headerBg:   "#1a120a",
    headerBor:  "#c9a020",
    txt:        "#2a1e0e",
    txtMid:     "#8a6010",
    txtDim:     "#a08040",
    txtFaint:   "#c0a060",
    cardBg:     "rgba(255,255,255,0.08)",
    cardBor:    "rgba(255,255,255,0.12)",
    playerBg:   "rgba(255,255,255,0.6)",
    playerBor:  "rgba(0,0,0,0.1)",
    playerActB: "rgba(255,255,255,0.9)",
    playerActBor:"#c9a020",
    nameTxt:    "#3a2810",
    nameAct:    "#6a4008",
    sideTxt:    "#a09060",
    avBlackBg:  "#1a1208",
    avWhiteBg:  "#f0e8d0",
    annBg:      "rgba(255,255,255,0.88)",
    annBor:     "rgba(0,0,0,0.12)",
    mlBg:       "#1a120a",
    mlBor:      "#c9a020",
    mlHeadBg:   "rgba(212,175,55,0.12)",
    mlHeadBor:  "rgba(212,175,55,0.25)",
    mlRowBor:   "rgba(255,255,255,0.05)",
    mlRowHov:   "rgba(212,175,55,0.08)",
    mlRowLit:   "rgba(212,175,55,0.07)",
    mlNum:      "#5a4018",
    mlMove:     "#a09060",
    mlActBg:    "rgba(212,175,55,0.22)",
    mlActBor:   "#c9a020",
    mlActTxt:   "#f0cc50",
    mlActLBor:  "3px solid #c9a020",
    togBg:      "rgba(255,255,255,0.15)",
    togBor:     "rgba(255,255,255,0.3)",
    togTxt:     "#f0e8d0",
    progCard:   "rgba(212,175,55,0.1)",
    progBor:    "rgba(212,175,55,0.25)",
    progTitle:  "#c9a020",
    progPct:    "#8a6010",
    progFill:   "linear-gradient(90deg,#a07810,#c9a020,#e8c040)",
    progSub:    "#7a6030",
    progSubB:   "#8a6010",
    resBg:      "rgba(255,255,255,0.9)",
    resBor:     "#c9a020",
    resScore:   "#7a5010",
    resWho:     "#a08040",
    eventBg:    "rgba(255,255,255,0.75)",
    eventBor:   "rgba(212,175,55,0.4)",
    eventName:  "#2a1e0e",
    eventMeta:  "#6a5030",
    boardRing1: "#c9a020",
    boardRing2: "#f2e8d8",
  };

  // Player ordering and to-move that follow the flipped state (computed after `t` exists)
  const topPlayer = flipped ? { name: whiteName, side: "White", icon: "♔" } : { name: blackName, side: "Black", icon: "♚" };
  const bottomPlayer = flipped ? { name: blackName, side: "Black", icon: "♚" } : { name: whiteName, side: "White", icon: "♔" };
  const topToMove = flipped ? whiteToMove : !whiteToMove;
  const bottomToMove = flipped ? !whiteToMove : whiteToMove;
  const topActive = topToMove && moveIndex < history.length;
  const bottomActive = bottomToMove && moveIndex < history.length;
  const topAvBg = topPlayer.side === "Black" ? t.avBlackBg : t.avWhiteBg;
  const bottomAvBg = bottomPlayer.side === "Black" ? t.avBlackBg : t.avWhiteBg;

  return (
    <div className="app" style={{ background: t.bg, color: t.txt }}>
      <canvas ref={canvasRef} className="bg-canvas" />

      {/* ════════ HEADER ════════ */}
      <header className="app-header" style={{ background: t.headerBg, borderBottom: `3px solid ${t.headerBor}` }}>
        <div className="logo">
          <div className="logo-icon">♞</div>
          <div>
            <div className="logo-title">Chess Analyzer</div>
            <div className="logo-sub">Powered by Stockfish 16</div>
          </div>
        </div>

        <div className="header-center">
          {history.length > 0 && (
            <div className="header-matchup">
              {flipped ? (
                <>
                  <span className="hdr-player hdr-black">{blackName}</span>
                  <span className="hdr-vs">VS</span>
                  <span className="hdr-player hdr-white">{whiteName}</span>
                </>
              ) : (
                <>
                  <span className="hdr-player hdr-white">{whiteName}</span>
                  <span className="hdr-vs">VS</span>
                  <span className="hdr-player hdr-black">{blackName}</span>
                </>
              )}
            </div>
          )}
        </div>

        <div className="header-right">
          {/* Dark mode toggle */}
          <button
            className="dark-toggle"
            onClick={() => setDark(d => !d)}
            title={dark ? "Switch to light mode" : "Switch to dark mode"}
            style={{
              background: t.togBg,
              border: `1.5px solid ${t.togBor}`,
              color: t.togTxt,
            }}
          >
            {dark ? "☀ Light" : "☾ Dark"}
          </button>
          <div className="engine-pill">
            <span className="engine-dot" />
            Engine Active
          </div>
          <div className="depth-pill" style={{ color: dark ? "#9a8060" : "#9a8060" }}>Depth 12</div>
        </div>
      </header>

      {/* ════════ 3-COLUMN BODY ════════ */}
      <div className="body">

        {/* ══ LEFT SIDEBAR ══ */}
        <aside className="left-sidebar" style={{ background: t.panelBg, borderRight: `2px solid ${t.panelBor}` }}>

          {/* Load Game */}
          <div className="ls-section">
            <div className="ls-heading" style={{ color: t.txtMid, borderBottom: `1.5px solid ${t.progBor}` }}>
              <span>♟</span> Load Game
            </div>
            <div className="pgn-box" style={{ background: t.cardBg, border: `1.5px solid ${t.cardBor}` }}>
              <PgnInput onLoad={loadPGN} />
            </div>
          </div>

          {/* Progress */}
          {history.length > 0 && (
            <div className="progress-card" style={{ background: t.progCard, border: `1.5px solid ${t.progBor}` }}>
              <div className="progress-top">
                <span style={{ fontSize: 14, fontWeight: 700, color: t.progTitle }}>Game Progress</span>
                <span style={{ fontSize: 22, fontWeight: 800, color: t.progPct, fontFamily: "monospace" }}>{pct}%</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${pct}%`, background: t.progFill }} />
              </div>
              <div style={{ fontSize: 13, color: t.progSub, fontWeight: 500 }}>
                Move <b style={{ color: t.progSubB }}>{moveIndex}</b> of <b style={{ color: t.progSubB }}>{history.length}</b>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="ls-section">
            <div className="ls-heading" style={{ color: t.txtMid, borderBottom: `1.5px solid ${t.progBor}` }}>
              <span>⏵</span> Navigation
            </div>
            <div className="nav-row">
              <button className="nav-edge" onClick={() => jumpTo(0)} disabled={moveIndex === 0}
                style={{ background: t.cardBg, border: `1.5px solid ${t.cardBor}`, color: t.txtDim }}>⏮</button>
              <button className="nav-main" onClick={goPrev} disabled={moveIndex === 0}
                style={{ background: t.cardBg, border: `1.5px solid ${t.cardBor}`, color: t.txtDim }}>‹ Prev</button>
              <div className="nav-counter" style={{ background: "rgba(0,0,0,0.3)", border: `1.5px solid ${t.progBor}` }}>
                <span style={{ fontSize: 18, fontWeight: 800, color: "#d4af37", fontFamily: "monospace" }}>{moveIndex}</span>
                <span style={{ fontSize: 13, color: dark ? "#3a2a10" : "#9a7030" }}>/</span>
                <span style={{ fontSize: 13, color: dark ? "#6a5020" : "#7a6030", fontFamily: "monospace" }}>{history.length}</span>
              </div>
              <button className="nav-main nav-next" onClick={goNext} disabled={moveIndex === history.length}
                style={{ background: "rgba(212,175,55,0.18)", border: "1.5px solid rgba(212,175,55,0.45)", color: "#d4af37" }}>Next ›</button>
              <button className="nav-edge" onClick={() => jumpTo(history.length)} disabled={!history.length || moveIndex === history.length}
                style={{ background: t.cardBg, border: `1.5px solid ${t.cardBor}`, color: t.txtDim }}>⏭</button>
            </div>
          </div>

          {/* Tools */}
          <div className="ls-section">
            <div className="ls-heading" style={{ color: t.txtMid, borderBottom: `1.5px solid ${t.progBor}` }}>
              <span>⚙</span> Tools
            </div>
            <div className="tools-grid">
              {[
                { icon: "↺", name: "Reset",       hint: "Start position", fn: resetBoard },
                { icon: "⇄", name: "Flip Board",  hint: "Switch sides",   fn: () => setFlipped(f => !f) },
                { icon: "⎘", name: "Copy FEN",    hint: "To clipboard",   fn: copyFEN },
                { icon: "↓", name: "Export PGN",  hint: "Download file",  fn: downloadPGN },
              ].map(({ icon, name, hint, fn }) => (
                <button key={name} className="tool-card" onClick={fn}
                  style={{ background: t.cardBg, border: `1.5px solid ${t.cardBor}` }}>
                  <span className="tc-icon" style={{ color: "#c9a020" }}>{icon}</span>
                  <span className="tc-name" style={{ color: dark ? "#d4c890" : "#3a2808" }}>{name}</span>
                  <span className="tc-hint" style={{ color: t.txtDim }}>{hint}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* ══ CENTER: BOARD ══ */}
        <main className="center-col">

          {/* Event banner */}
          {(gameInfo.Event || gameInfo.Site || gameInfo.Date) && (
            <div className="event-card" style={{
              background: t.eventBg, border: `1.5px solid ${t.eventBor}`,
              maxWidth: boardWidth + 24,
            }}>
              <span style={{ fontSize: 20 }}>🏆</span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: t.eventName }}>{gameInfo.Event || "Game"}</div>
                <div style={{ display: "flex", gap: 12, fontSize: 12, color: t.eventMeta, fontWeight: 600, marginTop: 3 }}>
                  {gameInfo.Site  && <span>📍 {gameInfo.Site}</span>}
                  {gameInfo.Date  && <span>📅 {gameInfo.Date}</span>}
                  {gameInfo.Round && <span>Round {gameInfo.Round}</span>}
                </div>
              </div>
            </div>
          )}

          {/* Top player (follows `flipped`) */}
          <div className="player-strip"
            style={{
              width: boardWidth,
              background: topActive ? t.playerActB : t.playerBg,
              border: `1.5px solid ${topActive ? t.playerActBor : t.playerBor}`,
              boxShadow: topActive
                ? `0 4px 20px rgba(212,175,55,${dark ? "0.18" : "0.15"})`
                : "0 2px 10px rgba(0,0,0,0.07)",
            }}
          >
            <div className="ps-avatar" style={{ background: topAvBg, border: "2px solid rgba(255,255,255,0.15)",
              boxShadow: topActive ? "0 0 0 3px rgba(212,175,55,0.55)" : "none" }}>{topPlayer.icon}</div>
            <div className="ps-info">
              <span className="ps-name" style={{ color: topActive ? t.nameAct : t.nameTxt }}>{topPlayer.name}</span>
              <span className="ps-side" style={{ color: t.sideTxt }}>{topPlayer.side}</span>
            </div>
            {topActive && (
              <div className="ps-tomove"><span className="ps-dot" />To Move</div>
            )}
          </div>

          {/* Board */}
          <div className="board-shell" style={{
            width: boardWidth, height: boardWidth,
            boxShadow: `0 0 0 3px ${t.boardRing1}, 0 0 0 7px ${t.boardRing2}, 0 0 0 8px rgba(212,175,55,0.35), 0 20px 60px rgba(0,0,0,0.22)`,
          }}>
            <ChessBoard position={position} boardWidth={boardWidth} flipped={flipped} />
          </div>

          {/* Bottom player (follows `flipped`) */}
          <div className="player-strip"
            style={{
              width: boardWidth,
              background: bottomActive ? t.playerActB : t.playerBg,
              border: `1.5px solid ${bottomActive ? t.playerActBor : t.playerBor}`,
              boxShadow: bottomActive
                ? `0 4px 20px rgba(212,175,55,${dark ? "0.18" : "0.15"})`
                : "0 2px 10px rgba(0,0,0,0.07)",
            }}
          >
            <div className="ps-avatar" style={{ background: bottomAvBg, border: "2px solid rgba(212,175,55,0.5)",
              boxShadow: bottomActive ? "0 0 0 3px rgba(212,175,55,0.55)" : "none",
              color: dark ? "#f0e8d0" : "#1a1208" }}>{bottomPlayer.icon}</div>
            <div className="ps-info">
              <span className="ps-name" style={{ color: bottomActive ? t.nameAct : t.nameTxt }}>{bottomPlayer.name}</span>
              <span className="ps-side" style={{ color: t.sideTxt }}>{bottomPlayer.side}</span>
            </div>
            {bottomActive && (
              <div className="ps-tomove"><span className="ps-dot" />To Move</div>
            )}
          </div>

          {/* Annotation */}
          {currentAnnotation && (
            <div className={`annotation ann-${annotationType}`}
              style={{ width: boardWidth, background: t.annBg, border: `1.5px solid ${t.annBor}` }}>
              <div className="ann-badge">
                {annotationType === "loading" && <span className="ann-spinner" />}
                {annotationType === "great"   && <span style={{ color: "#2da832", fontSize: 18, fontWeight: 800 }}>✓</span>}
                {annotationType === "suggest" && <span style={{ color: "#c9a020", fontSize: 18, fontWeight: 800 }}>↗</span>}
                {annotationType === "book"    && <span style={{ fontSize: 16 }}>📚</span>}
              </div>
              <div className="ann-body">
                <span className="ann-tag" style={{
                  color: annotationType === "great" ? "#2da832"
                       : annotationType === "suggest" ? "#b08810"
                       : annotationType === "book" ? "#1a60a0"
                       : "#9a8030"
                }}>
                  {annotationType === "loading" ? "Analyzing…"
                   : annotationType === "great"   ? "Best Move"
                   : annotationType === "suggest" ? "Suggestion"
                   : "Book Move"}
                </span>
                <span className="ann-text" style={{
                  color: dark
                    ? (annotationType === "great" ? "#7ae07e" : annotationType === "suggest" ? "#d4af37" : annotationType === "book" ? "#82aad4" : "#c8b888")
                    : (annotationType === "great" ? "#1a6020" : annotationType === "suggest" ? "#7a5800" : annotationType === "book" ? "#104080" : "#2a1e0e")
                }}>
                  {currentAnnotation}
                </span>
              </div>
            </div>
          )}

          {/* Result */}
          {moveIndex === history.length && matchResult && (
            <div className="result-card"
              style={{ width: boardWidth, background: t.resBg, border: `2px solid ${t.resBor}` }}>
              <span style={{ fontSize: 28 }}>♛</span>
              <div>
                <div style={{ fontSize: 24, fontWeight: 900, color: t.resScore, fontFamily: "monospace", letterSpacing: 3 }}>
                  {matchResult === "1-0" ? "1 – 0" : matchResult === "0-1" ? "0 – 1" : "½ – ½"}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: t.resWho, marginTop: 3 }}>
                  {matchResult === "1-0" ? `${whiteName} wins` : matchResult === "0-1" ? `${blackName} wins` : "Draw"}
                </div>
              </div>
            </div>
          )}
        </main>

        {/* ══ RIGHT: MOVE LIST ══ */}
        <aside className="right-panel" style={{ background: t.mlBg, borderLeft: `2px solid ${t.mlBor}` }}>
          <div className="rp-header" style={{ borderBottom: `2px solid ${t.mlBor}` }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: "#c9a020", letterSpacing: "2px", textTransform: "uppercase" }}>
              ≡ Move List
            </span>
            {history.length > 0 && (
              <span className="ml-badge">{history.length} moves</span>
            )}
          </div>

          <div className="ml-scroll">
            {history.length === 0 ? (
              <div className="ml-empty">
                <span style={{ fontSize: 40, opacity: 0.15 }}>♞</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: dark ? "#4a3010" : "#4a3010", marginTop: 8 }}>No game loaded</span>
                <span style={{ fontSize: 12, color: dark ? "#3a2008" : "#6a5020", marginTop: 4, textAlign: "center", lineHeight: 1.5 }}>
                  Paste a PGN on the left to start
                </span>
              </div>
            ) : (
              <>
                {/* Column header */}
                <div className="ml-col-header" style={{ background: t.mlHeadBg, borderBottom: `1.5px solid ${t.mlHeadBor}` }}>
                  <span style={{ color: dark ? "#6a5020" : "#7a5820", fontSize: 11, fontWeight: 800, letterSpacing: "1.8px" }}>#</span>
                  <span style={{ color: dark ? "#6a5020" : "#7a5820", fontSize: 11, fontWeight: 800, letterSpacing: "1.8px", textAlign: "center" }}>WHITE</span>
                  <span style={{ color: dark ? "#6a5020" : "#7a5820", fontSize: 11, fontWeight: 800, letterSpacing: "1.8px", textAlign: "center" }}>BLACK</span>
                </div>

                {Array.from({ length: Math.ceil(history.length / 2) }, (_, i) => {
                  const wActive = moveIndex === i*2+1;
                  const bActive = moveIndex === i*2+2;
                  const rowLit  = wActive || bActive;
                  return (
                    <div key={i} className="ml-row"
                      style={{ background: rowLit ? t.mlRowLit : "transparent", borderBottom: `1px solid ${t.mlRowBor}` }}>
                      <span className="ml-num" style={{ color: t.mlNum }}>{i+1}</span>
                      {history[i*2] ? (
                        <button ref={wActive ? activeMoveRef : null}
                          className="ml-move" onClick={() => jumpTo(i*2+1)}
                          style={wActive
                            ? { color: t.mlActTxt, background: t.mlActBg, borderLeft: t.mlActLBor, fontWeight: 800 }
                            : { color: t.mlMove }}>
                          {history[i*2]}
                        </button>
                      ) : <span />}
                      {history[i*2+1] ? (
                        <button ref={bActive ? activeMoveRef : null}
                          className="ml-move" onClick={() => jumpTo(i*2+2)}
                          style={bActive
                            ? { color: t.mlActTxt, background: t.mlActBg, borderLeft: t.mlActLBor, fontWeight: 800 }
                            : { color: t.mlMove }}>
                          {history[i*2+1]}
                        </button>
                      ) : <span />}
                    </div>
                  );
                })}
              </>
            )}
          </div>

          {/* Quick jump footer */}
          {history.length > 0 && (
            <div className="rp-footer" style={{ borderTop: `1.5px solid ${t.mlHeadBor}` }}>
              <button className="jump-btn" onClick={() => jumpTo(0)} disabled={moveIndex === 0}
                style={{ background: t.cardBg, border: `1.5px solid ${t.cardBor}`, color: t.txtDim }}>⏮ Start</button>
              <button className="jump-btn jump-end" onClick={() => jumpTo(history.length)} disabled={moveIndex === history.length}
                style={{ background: "rgba(212,175,55,0.15)", border: "1.5px solid rgba(212,175,55,0.4)", color: "#d4af37" }}>End ⏭</button>
            </div>
          )}
        </aside>

      </div>{/* end body */}

      <style jsx>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { height: 100%; width: 100%; overflow: hidden; }

        .app {
          position: fixed; inset: 0;
          font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
          display: flex; flex-direction: column;
          overflow: hidden;
          transition: background 0.3s, color 0.3s;
        }
        .bg-canvas { position: fixed; inset: 0; pointer-events: none; z-index: 0; }

        /* ── HEADER ── */
        .app-header {
          position: relative; z-index: 20;
          display: flex; align-items: center;
          padding: 0 24px; height: 66px; flex-shrink: 0;
          gap: 16px;
        }
        .logo { display: flex; align-items: center; gap: 13px; flex: 1; }
        .logo-icon {
          width: 52px; height: 52px; flex-shrink: 0; border-radius: 12px;
          background: linear-gradient(145deg, #a07810, #d4af37, #f0cc60);
          display: flex; align-items: center; justify-content: center;
          font-size: 26px; box-shadow: 0 4px 16px rgba(212,175,55,0.4);
        }
        .logo-title { font-size: 20px; font-weight: 800; color: #f0e8d0; letter-spacing: -0.4px; line-height: 1.2; }
        .logo-sub   { font-size: 13px; color: #7a6030; font-weight: 500; margin-top: 2px; }
        .header-center { flex: 1; display: flex; justify-content: center; }
        .hdr-matchup { display: flex; align-items: center; gap: 12px; }
        .hdr-player  { font-size: 17px; font-weight: 700; color: #f0e8d0; }
        .hdr-vs {
          font-size: 12px; font-weight: 800; letter-spacing: 3px;
          color: #1a1208; background: #c9a020;
          padding: 4px 12px; border-radius: 20px;
        }
        .header-right { display: flex; align-items: center; gap: 10px; flex: 1; justify-content: flex-end; }

        /* Dark toggle */
        .dark-toggle {
          padding: 8px 18px; border-radius: 22px; cursor: pointer;
          font-size: 14px; font-weight: 700; letter-spacing: 0.4px;
          transition: all 0.2s;
        }
        .dark-toggle:hover { opacity: 0.85; transform: scale(1.03); }

        /* Engine badges */
        .engine-pill {
          display: flex; align-items: center; gap: 7px;
          padding: 6px 15px; border-radius: 22px;
          background: rgba(61,168,64,0.15); border: 1.5px solid rgba(61,168,64,0.4);
          font-size: 12px; font-weight: 700; color: #3da840; white-space: nowrap;
        }
        .engine-dot {
          width: 7px; height: 7px; border-radius: 50%; background: #3da840;
          box-shadow: 0 0 8px rgba(61,168,64,0.9);
          animation: breathe 2s ease-in-out infinite;
        }
        @keyframes breathe { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.45;transform:scale(0.78)} }
        .depth-pill {
          padding: 6px 15px; border-radius: 22px;
          background: rgba(255,255,255,0.07); border: 1.5px solid rgba(255,255,255,0.15);
          font-size: 12px; font-weight: 700;
        }

        /* ── 3-COL BODY ── */
        .body {
          position: relative; z-index: 1;
          display: flex; flex: 1; overflow: hidden;
        }

        /* ── LEFT SIDEBAR ── */
        .left-sidebar {
          width: 360px; min-width: 360px;
          display: flex; flex-direction: column;
          padding: 20px 16px 20px 20px; gap: 20px;
          overflow-y: auto;
        }
        .left-sidebar::-webkit-scrollbar { width: 4px; }
        .left-sidebar::-webkit-scrollbar-thumb { background: rgba(212,175,55,0.25); border-radius: 2px; }

        .ls-section { display: flex; flex-direction: column; gap: 11px; }
        .ls-heading {
          display: flex; align-items: center; gap: 9px;
          font-size: 11px; font-weight: 800; letter-spacing: 2.5px; text-transform: uppercase;
          padding-bottom: 10px;
        }

        .pgn-box { border-radius: 12px; overflow: hidden; padding: 12px; }

        .progress-card { border-radius: 14px; padding: 16px 18px; display: flex; flex-direction: column; gap: 10px; }
        .progress-top  { display: flex; justify-content: space-between; align-items: center; }
        .progress-track { height: 7px; background: rgba(255,255,255,0.08); border-radius: 4px; overflow: hidden; }
        .progress-fill {
          height: 100%; border-radius: 4px;
          box-shadow: 0 0 10px rgba(212,175,55,0.5);
          transition: width 0.5s cubic-bezier(0.4,0,0.2,1);
        }

        .nav-row { display: flex; align-items: center; gap: 6px; }
        .nav-edge {
          width: 38px; height: 42px; border-radius: 9px; cursor: pointer;
          font-size: 15px; display: flex; align-items: center; justify-content: center;
          transition: all 0.18s; flex-shrink: 0;
        }
        .nav-edge:disabled { opacity: 0.22; cursor: not-allowed; }
        .nav-edge:hover:not(:disabled) { background: rgba(212,175,55,0.2) !important; border-color: rgba(212,175,55,0.45) !important; color: #d4af37 !important; }

        .nav-main {
          flex: 1; height: 42px; border-radius: 9px; cursor: pointer;
          font-size: 13px; font-weight: 700; transition: all 0.18s;
        }
        .nav-main:disabled { opacity: 0.22; cursor: not-allowed; }
        .nav-main:hover:not(:disabled) { opacity: 0.8; transform: translateY(-1px); }
        .nav-next:hover:not(:disabled) { background: rgba(212,175,55,0.3) !important; box-shadow: 0 4px 16px rgba(212,175,55,0.25); }

        .nav-counter {
          min-width: 62px; height: 42px; border-radius: 9px;
          display: flex; align-items: baseline; justify-content: center; gap: 3px; padding: 0 8px;
          flex-shrink: 0;
        }

        .tools-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .tool-card {
          border-radius: 12px; padding: 13px 11px; cursor: pointer;
          display: flex; flex-direction: column; gap: 4px;
          transition: all 0.2s; text-align: left;
        }
        .tool-card:hover {
          background: rgba(212,175,55,0.14) !important;
          border-color: rgba(212,175,55,0.35) !important;
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0,0,0,0.25);
        }
        .tc-icon { font-size: 22px; }
        .tc-name { font-size: 15px; font-weight: 700; line-height: 1.2; }
        .tc-hint { font-size: 13px; line-height: 1.2; font-weight: 500; }

        /* ── CENTER COLUMN ── */
        .center-col {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: 16px 24px; gap: 10px; overflow: hidden;
        }

        .event-card {
          display: flex; align-items: center; gap: 13px;
          border-radius: 13px; padding: 12px 18px;
          backdrop-filter: blur(12px);
        }

        .player-strip {
          display: flex; align-items: center; gap: 13px;
          padding: 10px 16px; border-radius: 13px;
          backdrop-filter: blur(10px);
          transition: all 0.28s ease;
        }
        .ps-avatar {
          width: 44px; height: 44px; border-radius: 50%; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center; font-size: 22px;
          transition: box-shadow 0.28s;
        }
        .ps-info  { display: flex; flex-direction: column; gap: 4px; flex: 1; }
        .ps-name  { font-size: 18px; font-weight: 700; line-height: 1.2; transition: color 0.25s; }
        .ps-side  { font-size: 12px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; }
        .ps-tomove {
          display: flex; align-items: center; gap: 8px;
          font-size: 14px; font-weight: 700; color: #2a8030;
          padding: 5px 13px; border-radius: 20px;
          background: rgba(42,128,48,0.1); border: 1.5px solid rgba(42,128,48,0.3);
          white-space: nowrap;
        }
        .ps-dot {
          width: 7px; height: 7px; border-radius: 50%; background: #3da840;
          box-shadow: 0 0 8px rgba(61,168,64,0.9); animation: breathe 1.5s ease-in-out infinite;
        }

        .board-shell { position: relative; flex-shrink: 0; border-radius: 4px; transition: box-shadow 0.35s; }

        .annotation {
          display: flex; align-items: center; gap: 14px;
          padding: 13px 17px; border-radius: 13px;
          backdrop-filter: blur(12px); animation: slideUp 0.22s ease;
        }
        @keyframes slideUp { from{opacity:0;transform:translateY(7px)} to{opacity:1;transform:translateY(0)} }
        .ann-badge {
          width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          background: rgba(128,128,128,0.1); border: 1.5px solid rgba(128,128,128,0.15);
        }
        .ann-spinner {
          width: 18px; height: 18px; border-radius: 50%;
          border: 2.5px solid rgba(200,150,0,0.25); border-top-color: #c9a020;
          animation: spin 0.65s linear infinite;
        }
        @keyframes spin { to{transform:rotate(360deg)} }
        .ann-body { display: flex; flex-direction: column; gap: 3px; flex: 1; }
        .ann-tag  { font-size: 10px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; }
        .ann-text { font-size: 15px; font-weight: 600; }

        .result-card {
          display: flex; align-items: center; gap: 16px;
          padding: 16px 24px; border-radius: 14px;
          animation: slideUp 0.3s ease;
          box-shadow: 0 6px 28px rgba(212,175,55,0.18);
        }

        /* ── RIGHT PANEL: MOVE LIST ── */
        .right-panel {
          width: 320px; min-width: 320px;
          display: flex; flex-direction: column;
          overflow: hidden;
        }
        .rp-header {
          padding: 16px 18px;
          display: flex; align-items: center; justify-content: space-between;
          flex-shrink: 0;
        }
        .ml-badge {
          font-size: 11px; font-weight: 700; color: #d4af37;
          background: rgba(212,175,55,0.18); padding: 3px 10px;
          border-radius: 12px; border: 1px solid rgba(212,175,55,0.3);
        }

        .ml-scroll {
          flex: 1; overflow-y: auto; overflow-x: hidden;
          scrollbar-width: thin; scrollbar-color: rgba(212,175,55,0.25) transparent;
        }
        .ml-scroll::-webkit-scrollbar { width: 4px; }
        .ml-scroll::-webkit-scrollbar-thumb { background: rgba(212,175,55,0.28); border-radius: 2px; }

        .ml-empty {
          display: flex; flex-direction: column; align-items: center;
          padding: 40px 20px; text-align: center;
        }

        .ml-col-header {
          display: grid; grid-template-columns: 36px 1fr 1fr;
          padding: 10px 14px; position: sticky; top: 0; z-index: 1;
        }

        .ml-row {
          display: grid; grid-template-columns: 36px 1fr 1fr;
          transition: background 0.1s;
          min-height: 40px;
        }
        .ml-row:hover { background: rgba(212,175,55,0.05) !important; }

        .ml-num {
          font-size: 12px; font-family: monospace; font-weight: 700;
          display: flex; align-items: center; padding: 0 4px 0 14px;
        }
        .ml-move {
          font-family: 'JetBrains Mono','Fira Code','Courier New',monospace;
          font-size: 14px; text-align: center;
          padding: 10px 4px; cursor: pointer;
          background: transparent; border: none;
          border-left: 1px solid rgba(255,255,255,0.05);
          transition: all 0.12s; user-select: none;
          display: flex; align-items: center; justify-content: center;
        }
        .ml-move:hover { background: rgba(212,175,55,0.1); color: #c9a020 !important; }

        .rp-footer {
          padding: 12px 14px; display: flex; gap: 8px; flex-shrink: 0;
        }
        .jump-btn {
          flex: 1; padding: 9px 6px; border-radius: 9px; cursor: pointer;
          font-size: 12px; font-weight: 700; transition: all 0.18s;
        }
        .jump-btn:disabled { opacity: 0.22; cursor: not-allowed; }
        .jump-btn:hover:not(:disabled) { opacity: 0.8; transform: translateY(-1px); }
        .jump-end:hover:not(:disabled) { box-shadow: 0 4px 14px rgba(212,175,55,0.25); }

        /* ── RESPONSIVE ── */
        @media (max-width: 1024px) {
          .right-panel { width: 220px; min-width: 220px; }
          .left-sidebar { width: 260px; min-width: 260px; }
        }
        @media (max-width: 820px) {
          .body { flex-direction: column; overflow-y: auto; }
          .left-sidebar { width: 100%; min-width: 100%; max-height: 40vh; border-right: none !important; border-bottom: 2px solid #c9a020; }
          .right-panel  { width: 100%; min-width: 100%; border-left: none !important; border-top: 2px solid #c9a020; max-height: 200px; }
          .center-col   { flex-shrink: 0; padding: 12px 16px; }
          .header-center { display: none; }
        }
      `}</style>
    </div>
  );
}