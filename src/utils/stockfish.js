// src/utils/stockfish.js
let engine = null;
let isThinking = false;
let currentTask = null;

export function initStockfish() {
  if (engine) return engine;
  
  try {
    engine = new Worker("/stockfish/stockfish.js");
    engine.postMessage("uci");
  } catch (error) {
    console.error("Failed to initialize Stockfish worker:", error);
  }
  
  return engine;
}

/**
 * Ask Stockfish for the best move & score at this FEN.
 * @param {string} fen
 * @param {number} depth
 * @returns {Promise<{best: string, score: number, canceled?: boolean}>}
 */
export function getBestMove(fen, depth = 12) {
  const stockfish = initStockfish();

  return new Promise((resolve) => {
    // 1. Cancel ongoing analysis to prevent race conditions in the UI
    if (isThinking) {
      stockfish.postMessage("stop");
      if (currentTask) {
        currentTask.resolve({ best: null, score: null, canceled: true });
      }
    }

    isThinking = true;
    currentTask = { resolve };
    let lastScore = null;

    // Determine whose turn it is from the FEN string to calculate absolute evaluation
    const isWhiteToMove = fen.split(" ")[1] !== "b";

    // 2. Create an isolated message handler for this specific request
    const messageHandler = (e) => {
      const line = e.data.toString();

      // Parse Evaluation Score
      if (line.startsWith("info") && line.includes(" score ")) {
        const parts = line.split(" ");
        const ix = parts.indexOf("score");
        
        if (ix !== -1) {
          if (parts[ix + 1] === "cp") {
            const cp = parseInt(parts[ix + 2], 10);
            // Convert to absolute score (+ is white advantage, - is black advantage)
            lastScore = isWhiteToMove ? cp / 100 : -cp / 100;
          } else if (parts[ix + 1] === "mate") {
            const mateIn = parseInt(parts[ix + 2], 10);
            // Assign large numbers for forced mates
            lastScore = isWhiteToMove ? (mateIn > 0 ? 999 : -999) : (mateIn > 0 ? -999 : 999);
          }
        }
      }

      // 3. Extract Best Move & Cleanup
      if (line.startsWith("bestmove")) {
        const bmMatch = line.match(/bestmove\s+(\S+)/);
        const bestMove = bmMatch ? bmMatch[1] : null;

        // Prevent memory leaks by removing the listener
        stockfish.removeEventListener("message", messageHandler);
        isThinking = false;
        currentTask = null;

        resolve({ best: bestMove, score: lastScore });
      }
    };

    // Use addEventListener instead of overwriting onmessage
    stockfish.addEventListener("message", messageHandler);

    // 4. Send commands securely
    stockfish.postMessage("ucinewgame");
    stockfish.postMessage("position fen " + fen);
    stockfish.postMessage("go depth " + depth);
  });
}