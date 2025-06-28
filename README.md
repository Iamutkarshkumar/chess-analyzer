<p align="center">
  <img src="https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=ffffff" alt="Vite" />
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=000000" alt="JavaScript" />
  <img src="https://img.shields.io/badge/Stockfish-FF6B6B?logo=chess-dot-pgn&logoColor=ffffff" alt="Stockfish" />
  <img src="https://img.shields.io/badge/⚙️ License-MIT-blue" alt="License" />
</p>

<h1 align="center">♟️ Chess PGN Analyzer</h1>

<p align="center">
  <a href="https://chess-analyzer-gules.vercel.app/">
    <img src="https://img.shields.io/badge/Live%20Demo-website-blue?logo=vercel&logoColor=ffffff" alt="Live Demo" />
  </a>
  &nbsp;|&nbsp;
  <a href="https://github.com/Iamutkarshkumar/chess-analyzer">
    <img src="https://img.shields.io/badge/GitHub-repo-181717?logo=github&logoColor=ffffff" alt="GitHub Repo" />
  </a>
</p>

---

## 🚀 Overview

Chess PGN Analyzer is a lightweight React application that lets you load and navigate chess games in PGN format, powered by [chess.js](https://github.com/jhlywa/chess.js/) and the Stockfish engine for in‑browser move analysis and evaluation.

---

## 📅 Timeline

**May 2025 – June 2025**

---

## 🔥 Features

- **Load & Parse PGN**  
  Upload any `.pgn` file and see moves rendered beautifully on the board.

- **Move Navigation**  
  ◀️ Previous / ⏺️ Play / ▶️ Next buttons to step through each move.

- **Engine Analysis**  
  Automatic Stockfish integration for real‑time evaluation (centipawn scores).

- **Board Controls**  
  - Reset board to the starting position  
  - Dark / Light mode toggle

- **Download & Copy**  
  - Download current PGN  
  - Copy current FEN string to clipboard

---

## 🛠️ Tech Stack

- **Framework:** React + Vite  
- **Language:** JavaScript (ES6+)  
- **Chess Logic:** [chess.js](https://github.com/jhlywa/chess.js/)  
- **Engine:** Stockfish (WebAssembly)  
- **Styling:** CSS-in-JS  
- **APIs:** Clipboard API, File API  
- **Deployment:** Vercel

---

## 📂 Installation

1. **Clone the repo**  
   ```bash
   git clone https://github.com/Iamutkarshkumar/chess-analyzer.git
   cd chess-analyzer
