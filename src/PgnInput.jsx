// src/PgnInput.jsx
import React, { useState } from "react";

export default function PgnInput({ onLoad }) {
  const [pgn, setPgn] = useState("");

  return (
    <div style={{ marginBottom: "20px" }}>
      <textarea
        rows={6}
        cols={60}
        value={pgn}
        onChange={(e) => setPgn(e.target.value)}
        placeholder="Paste your PGN here..."
      />
      <br />
      <button onClick={() => onLoad(pgn)}>Load Game</button>
    </div>
  );
}
