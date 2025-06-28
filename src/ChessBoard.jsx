// // src/ChessBoard.jsx
// import React from "react";
// import { Chessboard } from "react-chessboard";

// export default function ChessBoard({ position }) {
//   return (
//     <div style={{ paddingTop: "20px" }}>
//       <Chessboard position={position} boardWidth={400} />
//     </div>
//   );
// }
import React from "react";
import { Chessboard } from "react-chessboard";

export default function ChessBoard({ position, boardWidth = 400 }) {
  return (
    <div className="chessboard-wrapper">
      <Chessboard position={position} boardWidth={boardWidth} />
      <style jsx>{`
        .chessboard-wrapper {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 24px 0;
          background: rgba(255,255,255,0.15);
          border-radius: 18px;
          box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.18);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          margin: 0 auto;
          max-width: 98vw;
        }
      `}</style>
    </div>
  );
}
