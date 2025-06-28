// src/utils/stockfish.js
let engine;

export function initStockfish() {
  if (engine) return engine;
  engine = new Worker("/stockfish/stockfish.js");
  engine.onmessage = () => {};       // we’ll override when needed
  engine.postMessage("uci");
  return engine;
}

/**
 * Ask Stockfish for the best move & score at this FEN.
 * @param {string} fen
 * @param {number} depth
 * @returns {Promise<{best: string, score: number}>}
 */
export function getBestMove(fen, depth = 12) {
  const stockfish = initStockfish();
  return new Promise((resolve) => {
    let lastScore = null;

    // Override onmessage just for this query
    stockfish.onmessage = (e) => {
      const line = e.data.toString();

      // Info lines: look for “score cp XXX” or “score mate N”
      if (line.startsWith("info") && line.includes(" score ")) {
        const parts = line.split(" ");
        const ix = parts.indexOf("score");
        if (ix !== -1) {
          if (parts[ix + 1] === "cp") {
            lastScore = parseInt(parts[ix + 2], 10) / 100;
          } else if (parts[ix + 1] === "mate") {
            // assign a large # for mate in N
            lastScore = parts[ix + 2] > 0 ? 999 : -999;
          }
        }
      }

      // When you get bestmove, resolve
      if (line.startsWith("bestmove")) {
        const bm = line.split(" ")[1];
        resolve({ best: bm, score: lastScore });
      }
    };

    // Send commands
    stockfish.postMessage("ucinewgame");
    stockfish.postMessage("position fen " + fen);
    stockfish.postMessage("go depth " + depth);
  });
}

