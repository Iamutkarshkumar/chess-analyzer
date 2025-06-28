import React, { useState, useEffect } from "react";
import { Chess } from "chess.js";
import PgnInput from "./PgnInput";
import ChessBoard from "./ChessBoard";
import { getBestMove } from "./utils/stockfish";

export default function App() {
  const [history, setHistory] = useState([]);
  const [moveIndex, setMoveIndex] = useState(0);
  const [position, setPosition] = useState("start");
  const [darkMode, setDarkMode] = useState(false);
  const [currentAnnotation, setCurrentAnnotation] = useState("");
  const [boardWidth, setBoardWidth] = useState(
    Math.min(600, Math.floor(window.innerWidth * 0.9))
  );
  const [whiteName, setWhiteName] = useState("White");
  const [blackName, setBlackName] = useState("Black");
  const [matchResult, setMatchResult] = useState("");
  const [flipped, setFlipped] = useState(false);
  const [gameInfo, setGameInfo] = useState({});

  useEffect(() => {
    const onResize = () => {
      setBoardWidth(Math.min(600, Math.floor(window.innerWidth * 0.9)));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const bookMoves = new Set(["e4", "d4", "Nf3", "c4", "e5", "c5", "Nc6", "d6"]);

  const fenAt = (moves, idx) => {
    const g = new Chess();
    for (let i = 0; i < idx; i++) g.move(moves[i]);
    return g.fen();
  };

  const loadPGN = (pgn) => {
    const g = new Chess();
    try {
      g.loadPgn(pgn.trim());
    } catch {
      return alert("Invalid PGN!");
    }
    const moves = g.history();
    if (!moves.length) return alert("No moves found!");
    setHistory(moves);
    setMoveIndex(0);
    setPosition("start");
    setCurrentAnnotation("");
    // Extract player names and result from PGN headers
    const headers = g.header();
    setWhiteName(headers.White || "White");
    setBlackName(headers.Black || "Black");
    setMatchResult(headers.Result || "");
    setGameInfo({
      Event: headers.Event || "",
      Site: headers.Site || "",
      Date: headers.Date || "",
      Round: headers.Round || "",
    });
  };

  const goPrev = () => {
    if (moveIndex > 0) {
      const ni = moveIndex - 1;
      setMoveIndex(ni);
      setPosition(ni === 0 ? "start" : fenAt(history, ni));
      setCurrentAnnotation("");
    }
  };

  const goNext = async () => {
    if (moveIndex < history.length) {
      const san = history[moveIndex];
      let tag = "";

      if (bookMoves.has(san) && moveIndex < 10) {
        tag = "📚 Book move";
      } else {
        setCurrentAnnotation("Analyzing...");
        // Get best move as UCI from engine
        const { best: bestUci } = await getBestMove(fenAt(history, moveIndex), 12);
        // Convert UCI to SAN in current position
        const board = new Chess(fenAt(history, moveIndex));
        const from = bestUci.slice(0, 2);
        const to = bestUci.slice(2, 4);
        const promotion = bestUci.length === 5 ? bestUci[4] : undefined;
        const moveObj = { from, to };
        if (promotion) moveObj.promotion = promotion;
        const result = board.move(moveObj);
        const bestSan = result ? result.san : bestUci;
        tag = san === bestSan ? "✅ Great move" : `↪️ Suggest ${bestSan}`;
      }

      const ni = moveIndex + 1;
      setMoveIndex(ni);
      setPosition(fenAt(history, ni));
      setCurrentAnnotation(`${ni}. ${san} → ${tag}`);
    }
  };

  // --- New Functionalities ---

  // Download PGN
  const downloadPGN = () => {
    const pgn = history.join(" ");
    const element = document.createElement("a");
    const file = new Blob([pgn], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = "game.pgn";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Reset Board
  const resetBoard = () => {
    setMoveIndex(0);
    setPosition("start");
    setCurrentAnnotation("");
  };

  // Copy FEN
  const copyFEN = () => {
    navigator.clipboard.writeText(position);
    alert("FEN copied to clipboard!");
  };

  return (
    <div className={`app-container ${darkMode ? 'dark' : 'light'}`}>
      <header className="app-header">
        <h1 className="app-title">♟️ Chess PGN Analyzer</h1>
        <button onClick={() => setDarkMode(!darkMode)} className="theme-toggle">
          {darkMode ? "☀️ Light Mode" : "🌙 Dark Mode"}
        </button>
      </header>

      <div className="main-layout">
        <div className="left-panel">
          <div className="pgn-card">
            <PgnInput onLoad={loadPGN} />
            <div className="controls">
              <button onClick={goPrev} disabled={moveIndex === 0} className="nav-button">
                ← Prev
              </button>
              <span className="move-label">
                Move {moveIndex} / {history.length}
              </span>
              <button onClick={goNext} disabled={moveIndex === history.length} className="nav-button">
                Next →
              </button>
            </div>
            <div className="controls" style={{ marginTop: 24 }}>
              <button onClick={resetBoard} className="nav-button">Reset Board</button>
              <button onClick={downloadPGN} className="nav-button">Download PGN</button>
              <button onClick={copyFEN} className="nav-button">Copy FEN</button>
            </div>
          </div>
          {/* Move List - vertical, left of board */}
          {history.length > 0 && (
            <div className="move-list-vertical">
              {history.map((move, idx) => (
                <span
                  key={idx}
                  className={`move-item${moveIndex === idx + 1 ? " active" : ""}`}
                  onClick={() => {
                    setMoveIndex(idx + 1);
                    setPosition(fenAt(history, idx + 1));
                    setCurrentAnnotation("");
                  }}
                >
                  <span className="move-number">{Math.floor(idx / 2) + 1}{idx % 2 === 0 ? "." : "..."}</span>
                  <span className="move-san">{move}</span>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="right-panel">
          {/* Game Info */}
          {gameInfo && (gameInfo.Event || gameInfo.Site || gameInfo.Date || gameInfo.Round) && (
            <div className="event-box">
              <div className="event-title-row">
                <span className="event-icon">🏆</span>
                <span className="event-title">{gameInfo.Event || "Event"}</span>
              </div>
              <div className="event-details-row">
                {gameInfo.Site && (
                  <span className="event-detail">
                    <span className="event-detail-icon">📍</span>
                    <span>{gameInfo.Site}</span>
                  </span>
                )}
                {gameInfo.Date && (
                  <span className="event-detail">
                    <span className="event-detail-icon">📅</span>
                    <span>{gameInfo.Date}</span>
                  </span>
                )}
                {gameInfo.Round && (
                  <span className="event-detail">
                    <span className="event-detail-icon">🔄</span>
                    <span>Round {gameInfo.Round}</span>
                  </span>
                )}
              </div>
            </div>
          )}
          <div className="black-name-side player-name" style={{ maxWidth: boardWidth }}>
            ♚ {blackName}
          </div>
          <div className="board-container">
            <ChessBoard position={position} boardWidth={boardWidth} flipped={flipped} />
          </div>
          <div className="white-name-side player-name" style={{ maxWidth: boardWidth }}>
            ♔ {whiteName}
          </div>
          {currentAnnotation && <div className="annotation-static">{currentAnnotation}</div>}

          {/* Show match result after final move */}
          {moveIndex === history.length && matchResult && (
            <div className="match-result">
              <b>Result:</b>{" "}
              {matchResult === "1-0"
                ? `${whiteName} wins`
                : matchResult === "0-1"
                ? `${blackName} wins`
                : matchResult === "1/2-1/2"
                ? "Draw"
                : matchResult}
            </div>
          )}
        </div>
      </div>
      <style jsx>{`
        html, body, #__next { margin: 0; padding: 0; width: 100%; height: 100%; }
        .app-container { width: 100vw; height: 100vh; display: flex; flex-direction: column; align-items: center; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; transition: background 0.3s ease; }
        .light { background: linear-gradient(135deg, #eef2f3, #8e9eab); }
        .dark { background: linear-gradient(135deg, #232526, #414345); }

        .app-header { width: 100%; padding: 20px; display: flex; justify-content: center; align-items: center; position: relative; }
        .app-title {
          font-size: clamp(1.8rem, 4vw, 2.5rem);
          color: #ff6f61;
          font-weight: 700;
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.2);
          letter-spacing: 1px;
          margin: 0;
        }
        .theme-toggle { position: absolute; right: 20px; padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); transition: background 0.3s ease, color 0.3s ease; }
        .light .theme-toggle { background: #333; color: #fff; }
        .dark .theme-toggle { background: #fff; color: #333; }

        .main-layout { flex: 1; display: flex; justify-content: center; align-items: flex-start; width: 100%; max-width: 1200px; gap: 40px; padding: 20px; box-sizing: border-box; }
        .left-panel { flex: 0 0 320px; }
        .pgn-card { background: rgba(255, 255, 255, 0.9); padding: 20px; border-radius: 10px; box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1); }
        .controls { display: flex; align-items: center; justify-content: space-between; margin-top: 20px; }

        .nav-button { flex: 1; margin: 0 5px; padding: 12px; background: linear-gradient(45deg, #6a11cb, #2575fc); color: #fff; border: none; border-radius: 8px; cursor: pointer; font-size: 1rem; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2); transition: transform 0.2s ease; }
        .nav-button:disabled { opacity: 0.5; cursor: not-allowed; }
        .nav-button:not(:disabled):hover { transform: translateY(-2px); }
        .move-label { font-size: 1rem; font-weight: 500; text-align: center; width: 80px; }

        .right-panel { flex: 1; display: flex; flex-direction: column; align-items: center; }
        .player-name {
          font-size: 1.5rem;
          font-weight: 700;
          letter-spacing: 1px;
          padding: 6px 0;
          text-shadow: 1px 1px 4px rgba(0,0,0,0.08);
        }
        .black-name-side {
          width: 100%;
          text-align: left;
          margin-bottom: 8px;
          color: #222;
        }
        .white-name-side {
          width: 100%;
          text-align: left;
          margin-top: 8px;
          color: #333;
        }
        .dark .black-name-side,
        .dark .white-name-side {
          color: #fff;
        }
        .board-container { box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1); }
        .annotation-static { margin-top: 16px; background: rgba(0, 0, 0, 0.7); color: #fff; padding: 12px 18px; border-radius: 8px; font-size: 1rem; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3); white-space: nowrap; }
        .match-result {
          margin-top: 18px;
          font-size: 1.2rem;
          font-weight: bold;
          color: #ff6f61;
          background: rgba(255,255,255,0.85);
          border-radius: 8px;
          padding: 10px 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        .dark .match-result {
          background: rgba(30,30,30,0.85);
          color: #fff;
        }
        .move-list {
          margin-top: 24px;
          background: rgba(255,255,255,0.15);
          border-radius: 12px;
          padding: 18px 20px;
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          max-width: 90vw;
          box-shadow: 0 2px 8px rgba(0,0,0,0.07);
          justify-content: flex-start;
        }
        .move-item {
          display: flex;
          align-items: center;
          gap: 4px;
          cursor: pointer;
          padding: 7px 14px;
          border-radius: 20px;
          background: rgba(255,255,255,0.6);
          color: #333;
          font-size: 1.08rem;
          font-family: 'Fira Mono', 'Consolas', monospace;
          border: 1.5px solid transparent;
          transition:
            background 0.2s,
            color 0.2s,
            border 0.2s,
            box-shadow 0.2s;
          box-shadow: 0 1px 4px rgba(0,0,0,0.06);
          margin-bottom: 4px;
        }
        .move-item .move-number {
          color: #888;
          font-size: 0.95em;
          margin-right: 2px;
          font-weight: 500;
        }
        .move-item .move-san {
          font-weight: 600;
          letter-spacing: 0.5px;
        }
        .move-item.active, .move-item:hover {
          background: linear-gradient(90deg, #6a11cb 0%, #2575fc 100%);
          color: #fff;
          border: 1.5px solid #6a11cb;
          box-shadow: 0 2px 8px rgba(106,17,203,0.13);
        }
        .dark .move-item {
          background: rgba(30,30,30,0.7);
          color: #eee;
        }
        .dark .move-item.active, .dark .move-item:hover {
          background: linear-gradient(90deg, #ff6f61 0%, #6a11cb 100%);
          color: #fff;
          border: 1.5px solid #ff6f61;
        }
        .event-box {
          margin-bottom: 22px;
          background: linear-gradient(90deg, #f8fafc 60%, #e0e7ef 100%);
          border-radius: 14px;
          box-shadow: 0 2px 12px rgba(106,17,203,0.07);
          padding: 18px 28px 14px 28px;
          border: 2px solid #e0e7ef;
          min-width: 260px;
          max-width: 420px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 8px;
        }
        .dark .event-box {
          background: linear-gradient(90deg, #232526 60%, #414345 100%);
          border: 2px solid #333;
        }
        .event-title-row {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 1.25rem;
          font-weight: 700;
          color: #6a11cb;
          margin-bottom: 6px;
        }
        .dark .event-title-row {
          color: #ff6f61;
        }
        .event-icon {
          font-size: 1.5em;
        }
        .event-title {
          font-size: 1.18em;
        }
        .event-details-row {
          display: flex;
          flex-wrap: wrap;
          gap: 18px;
          font-size: 1.05rem;
        }
        .event-detail {
          display: flex;
          align-items: center;
          gap: 4px;
          color: #444;
          background: rgba(255,255,255,0.45);
          border-radius: 6px;
          padding: 3px 10px;
        }
        .event-detail-icon {
          font-size: 1.1em;
        }
        .dark .event-detail {
          color: #eee;
          background: rgba(30,30,30,0.45);
        }
        .move-list-vertical {
          margin-top: 28px;
          display: flex;
          flex-direction: column;
          gap: 7px;
          max-height: 420px;
          overflow-y: auto;
          background: rgba(255,255,255,0.13);
          border-radius: 10px;
          padding: 12px 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }
        .move-list-vertical .move-item {
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          padding: 6px 12px;
          border-radius: 14px;
          background: rgba(255,255,255,0.7);
          color: #333;
          font-size: 1.04rem;
          font-family: 'Fira Mono', 'Consolas', monospace;
          border: 1.5px solid transparent;
          transition:
            background 0.2s,
            color 0.2s,
            border 0.2s,
            box-shadow 0.2s;
        }
        .move-list-vertical .move-item .move-number {
          color: #888;
          font-size: 0.9em;
          margin-right: 2px;
          font-weight: 500;
        }
        .move-list-vertical .move-item .move-san {
          font-weight: 600;
          letter-spacing: 0.5px;
        }
        .move-list-vertical .move-item.active, .move-list-vertical .move-item:hover {
          background: linear-gradient(90deg, #6a11cb 0%, #2575fc 100%);
          color: #fff;
          border: 1.5px solid #6a11cb;
          box-shadow: 0 2px 8px rgba(106,17,203,0.13);
        }
        .dark .move-list-vertical .move-item {
          background: rgba(30,30,30,0.7);
          color: #eee;
        }
        .dark .move-list-vertical .move-item.active, .dark .move-list-vertical .move-item:hover {
          background: linear-gradient(90deg, #ff6f61 0%, #6a11cb 100%);
          color: #fff;
          border: 1.5px solid #ff6f61;
        }
      `}</style>
    </div>
  );
}


