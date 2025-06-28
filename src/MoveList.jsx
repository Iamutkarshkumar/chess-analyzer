// src/MoveList.jsx
import React from "react";

export default function MoveList({ history, annotations, currentIndex, onSelect }) {
  return (
    <div style={{ maxHeight: 200, overflowY: "auto", marginTop: 10 }}>
      {history.map((move, i) => {
        const anno = annotations[i] || {};
        const isActive = i+1 === currentIndex;
        return (
          <div
            key={i}
            onClick={() => onSelect(i+1)}
            style={{
              cursor: "pointer",
              fontWeight: isActive ? "bold" : "normal",
              padding: "2px 0"
            }}
          >
            {i+1}. {move} — {anno.eval || "..."} ({anno.best || "…"})
          </div>
        );
      })}
    </div>
  );
}
