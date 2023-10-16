import { useEffect, useRef, useState } from "react";
import Button from "../../components/ui/Button";
import Chip from "../../components/ui/Chip";

// ─── Board dimensions ───────────────────────────────────────────────────────
const COLS = 10;
const ROWS = 20;
const CELL = 30;           // px per cell on the main board
const PREVIEW_CELL = 22;   // px per cell in hold / next panels

// Canvas layout
const BX = 190;            // board left edge
const BY = 10;             // board top edge
const CANVAS_W = 700;
const CANVAS_H = ROWS * CELL + BY * 2; // 620

// Timing (ms)
const LOCK_DELAY = 500;
const LOCK_RESET_LIMIT = 15;
const DAS_DELAY = 167;
const DAS_REPEAT = 33;
const SOFT_DROP_INTERVAL = 50;

// ─── Tetrominoes (SRS shapes) ────────────────────────────────────────────────
const T = {
  I: {
    color: "#22d3ee", dark: "#0891b2",
    shapes: [
      [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
      [[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]],
      [[0,0,0,0],[0,0,0,0],[1,1,1,1],[0,0,0,0]],
      [[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]],
    ],
  },
  O: {
    color: "#fbbf24", dark: "#d97706",
    shapes: [
      [[0,1,1,0],[0,1,1,0],[0,0,0,0]],
      [[0,1,1,0],[0,1,1,0],[0,0,0,0]],
      [[0,1,1,0],[0,1,1,0],[0,0,0,0]],
      [[0,1,1,0],[0,1,1,0],[0,0,0,0]],
    ],
  },
  T: {
    color: "#a78bfa", dark: "#7c3aed",
    shapes: [
      [[0,1,0],[1,1,1],[0,0,0]],
      [[0,1,0],[0,1,1],[0,1,0]],
      [[0,0,0],[1,1,1],[0,1,0]],
      [[0,1,0],[1,1,0],[0,1,0]],
    ],
  },
  S: {
    color: "#4ade80", dark: "#16a34a",
    shapes: [
      [[0,1,1],[1,1,0],[0,0,0]],
      [[0,1,0],[0,1,1],[0,0,1]],
      [[0,0,0],[0,1,1],[1,1,0]],
      [[1,0,0],[1,1,0],[0,1,0]],
    ],
  },
  Z: {
    color: "#fb7185", dark: "#e11d48",
    shapes: [
      [[1,1,0],[0,1,1],[0,0,0]],
      [[0,0,1],[0,1,1],[0,1,0]],
      [[0,0,0],[1,1,0],[0,1,1]],
      [[0,1,0],[1,1,0],[1,0,0]],
    ],
  },
  J: {
    color: "#60a5fa", dark: "#2563eb",
    shapes: [
      [[1,0,0],[1,1,1],[0,0,0]],
      [[0,1,1],[0,1,0],[0,1,0]],
      [[0,0,0],[1,1,1],[0,0,1]],
      [[0,1,0],[0,1,0],[1,1,0]],
    ],
  },
  L: {
    color: "#fb923c", dark: "#ea580c",
    shapes: [
      [[0,0,1],[1,1,1],[0,0,0]],
      [[0,1,0],[0,1,0],[0,1,1]],
      [[0,0,0],[1,1,1],[1,0,0]],
      [[1,1,0],[0,1,0],[0,1,0]],
    ],
  },
};

const PIECE_TYPES = ["I","O","T","S","Z","J","L"];

// ─── SRS wall-kicks (screen coords: y positive = down) ───────────────────────
// Converted from Tetris wiki y-up by negating y offsets.
const KICKS_JLSTZ = {
  "0_1": [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
  "1_0": [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
  "1_2": [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
  "2_1": [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
  "2_3": [[0,0],[1,0],[1,-1],[0,2],[1,2]],
  "3_2": [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
  "3_0": [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
  "0_3": [[0,0],[1,0],[1,-1],[0,2],[1,2]],
};

const KICKS_I = {
  "0_1": [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
  "1_0": [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
  "1_2": [[0,0],[-1,0],[2,0],[-1,-2],[2,1]],
  "2_1": [[0,0],[1,0],[-2,0],[1,2],[-2,-1]],
  "2_3": [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
  "3_2": [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
  "3_0": [[0,0],[1,0],[-2,0],[1,2],[-2,-1]],
  "0_3": [[0,0],[-1,0],[2,0],[-1,-2],[2,1]],
};

// ─── Scoring ─────────────────────────────────────────────────────────────────
const LINE_SCORES = [0, 100, 300, 500, 800]; // 1-4 lines × level
// Speed (ms per gravity tick) per level 0-15+
const GRAVITY_MS = [800,717,633,550,467,383,300,217,133,100,83,67,50,33,17,17];

// ─── Pure helpers ─────────────────────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function newBag() { return shuffle([...PIECE_TYPES]); }
function emptyBoard() { return Array.from({ length: ROWS }, () => Array(COLS).fill(null)); }

function getShape(type, rot) {
  return T[type].shapes[rot % T[type].shapes.length];
}

function getAbsCells(type, rot, px, py) {
  const s = getShape(type, rot);
  const out = [];
  for (let r = 0; r < s.length; r++) {
    for (let c = 0; c < s[r].length; c++) {
      if (s[r][c]) out.push([px + c, py + r]);
    }
  }
  return out;
}

function isValid(board, type, rot, px, py) {
  for (const [x, y] of getAbsCells(type, rot, px, py)) {
    if (x < 0 || x >= COLS || y >= ROWS) return false;
    if (y >= 0 && board[y][x] !== null) return false;
  }
  return true;
}

function getGhostY(board, type, rot, px, py) {
  let gy = py;
  while (isValid(board, type, rot, px, gy + 1)) gy++;
  return gy;
}

function lockPiece(board, type, rot, px, py) {
  const nb = board.map(r => [...r]);
  const color = T[type].color;
  for (const [x, y] of getAbsCells(type, rot, px, py)) {
    if (y >= 0 && y < ROWS) nb[y][x] = color;
  }
  return nb;
}

function clearLines(board) {
  const remaining = board.filter(row => row.some(c => c === null));
  const cleared = ROWS - remaining.length;
  const empties = Array.from({ length: cleared }, () => Array(COLS).fill(null));
  return { board: [...empties, ...remaining], cleared };
}

function spawnPos(type) {
  const s = getShape(type, 0);
  const x = Math.floor((COLS - s[0].length) / 2);
  return { x, y: -1 };
}

function tryRotate(board, type, rot, px, py, dir) {
  const n = T[type].shapes.length;
  const nextRot = (rot + dir + n) % n;
  const key = `${rot}_${nextRot}`;
  const kicks = type === "I" ? (KICKS_I[key] ?? [[0,0]]) : (KICKS_JLSTZ[key] ?? [[0,0]]);
  for (const [dx, dy] of kicks) {
    if (isValid(board, type, nextRot, px + dx, py + dy)) {
      return { rot: nextRot, x: px + dx, y: py + dy };
    }
  }
  return null;
}

function buildInitialQueue() {
  const bag1 = newBag();
  const bag2 = newBag();
  return [...bag1, ...bag2];
}

function initState() {
  const queue = buildInitialQueue();
  const type = queue.shift();
  const { x, y } = spawnPos(type);
  return {
    board: emptyBoard(),
    type, rot: 0, x, y,
    queue,
    hold: null,
    canHold: true,
    score: 0,
    lines: 0,
    level: 0,
    gameOver: false,
    paused: false,
    lockTimer: 0,
    lockMoves: 0,
    gravityTimer: 0,
    softDropping: false,
  };
}

function dequeueNext(state) {
  const queue = [...state.queue];
  if (queue.length < 7) queue.push(...newBag());
  const type = queue.shift();
  const { x, y } = spawnPos(type);
  return { type, rot: 0, x, y, queue, canHold: true, lockTimer: 0, lockMoves: 0, gravityTimer: 0 };
}

// ─── Canvas drawing helpers ───────────────────────────────────────────────────
function drawCell(ctx, cx, cy, size, color, darkColor) {
  ctx.fillStyle = color;
  ctx.fillRect(cx + 1, cy + 1, size - 2, size - 2);
  // Highlight (top / left edge)
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.fillRect(cx + 1, cy + 1, size - 2, 3);
  ctx.fillRect(cx + 1, cy + 1, 3, size - 2);
  // Shadow (bottom / right edge)
  ctx.fillStyle = darkColor ?? "rgba(0,0,0,0.35)";
  ctx.fillRect(cx + 1, cy + size - 4, size - 2, 3);
  ctx.fillRect(cx + size - 4, cy + 1, 3, size - 2);
}

function drawPiecePreview(ctx, type, ox, oy, cellSize) {
  const s = getShape(type, 0);
  const rows = s.length;
  const cols = s[0].length;
  const info = T[type];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (s[r][c]) {
        drawCell(ctx, ox + c * cellSize, oy + r * cellSize, cellSize, info.color, info.dark);
      }
    }
  }
}

function drawScene(ctx, state) {
  // ── Background ──────────────────────────────────────────────────────────────
  ctx.fillStyle = "#070b1f";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // ── Board background ────────────────────────────────────────────────────────
  ctx.fillStyle = "#0b122a";
  ctx.fillRect(BX, BY, COLS * CELL, ROWS * CELL);

  // Subtle grid
  ctx.strokeStyle = "#1d2b57";
  ctx.lineWidth = 1;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(BX + c * CELL, BY);
    ctx.lineTo(BX + c * CELL, BY + ROWS * CELL);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(BX, BY + r * CELL);
    ctx.lineTo(BX + COLS * CELL, BY + r * CELL);
    ctx.stroke();
  }

  // Board border
  ctx.strokeStyle = "#2a3a77";
  ctx.lineWidth = 2;
  ctx.strokeRect(BX, BY, COLS * CELL, ROWS * CELL);

  // ── Locked pieces ────────────────────────────────────────────────────────────
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const color = state.board[r][c];
      if (color) {
        // Find dark variant by matching color
        const entry = Object.values(T).find(t => t.color === color);
        drawCell(ctx, BX + c * CELL, BY + r * CELL, CELL, color, entry?.dark);
      }
    }
  }

  // ── Ghost piece ──────────────────────────────────────────────────────────────
  if (!state.gameOver) {
    const gy = getGhostY(state.board, state.type, state.rot, state.x, state.y);
    if (gy !== state.y) {
      const ghostCells = getAbsCells(state.type, state.rot, state.x, gy);
      for (const [x, y] of ghostCells) {
        if (y >= 0 && y < ROWS) {
          ctx.strokeStyle = T[state.type].color;
          ctx.lineWidth = 2;
          ctx.strokeRect(BX + x * CELL + 2, BY + y * CELL + 2, CELL - 4, CELL - 4);
        }
      }
    }
  }

  // ── Active piece ─────────────────────────────────────────────────────────────
  if (!state.gameOver) {
    const activeCells = getAbsCells(state.type, state.rot, state.x, state.y);
    for (const [x, y] of activeCells) {
      if (y >= 0 && y < ROWS) {
        drawCell(ctx, BX + x * CELL, BY + y * CELL, CELL, T[state.type].color, T[state.type].dark);
      }
    }
  }

  // ─── LEFT PANEL (Hold) ───────────────────────────────────────────────────────
  const LP = 14;
  ctx.fillStyle = "#a8b7e6";
  ctx.font = "bold 11px 'Inter', sans-serif";
  ctx.letterSpacing = "0.12em";
  ctx.fillText("HOLD", LP, 30);
  ctx.letterSpacing = "0em";

  // Hold box
  ctx.strokeStyle = "#2a3a77";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(LP, 38, 5 * PREVIEW_CELL, 4 * PREVIEW_CELL);
  ctx.fillStyle = "#0b122a";
  ctx.fillRect(LP + 1, 39, 5 * PREVIEW_CELL - 2, 4 * PREVIEW_CELL - 2);

  if (state.hold) {
    const hs = getShape(state.hold, 0);
    const hw = hs[0].length * PREVIEW_CELL;
    const hh = hs.length * PREVIEW_CELL;
    const hox = LP + Math.floor((5 * PREVIEW_CELL - hw) / 2);
    const hoy = 38 + Math.floor((4 * PREVIEW_CELL - hh) / 2);
    ctx.globalAlpha = state.canHold ? 1 : 0.35;
    drawPiecePreview(ctx, state.hold, hox, hoy, PREVIEW_CELL);
    ctx.globalAlpha = 1;
  }

  // ─── RIGHT PANEL (Next + Stats) ──────────────────────────────────────────────
  const RP = BX + COLS * CELL + 18;
  const nextCount = 3;

  ctx.fillStyle = "#a8b7e6";
  ctx.font = "bold 11px 'Inter', sans-serif";
  ctx.letterSpacing = "0.12em";
  ctx.fillText("NEXT", RP, 30);
  ctx.letterSpacing = "0em";

  for (let i = 0; i < nextCount; i++) {
    const pieceType = state.queue[i];
    if (!pieceType) continue;
    const ns = getShape(pieceType, 0);
    const nw = ns[0].length * PREVIEW_CELL;
    const nh = ns.length * PREVIEW_CELL;
    const boxH = 4 * PREVIEW_CELL;
    const boxY = 38 + i * (boxH + 6);

    ctx.strokeStyle = "#2a3a77";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(RP, boxY, 5 * PREVIEW_CELL, boxH);
    ctx.fillStyle = "#0b122a";
    ctx.fillRect(RP + 1, boxY + 1, 5 * PREVIEW_CELL - 2, boxH - 2);

    const nox = RP + Math.floor((5 * PREVIEW_CELL - nw) / 2);
    const noy = boxY + Math.floor((boxH - nh) / 2);
    drawPiecePreview(ctx, pieceType, nox, noy, PREVIEW_CELL);
  }

  // Stats
  const statsY = 38 + nextCount * (4 * PREVIEW_CELL + 6) + 20;
  ctx.fillStyle = "#a8b7e6";
  ctx.font = "bold 11px 'Inter', sans-serif";
  ctx.letterSpacing = "0.12em";
  ctx.fillText("SCORE", RP, statsY);
  ctx.letterSpacing = "0em";
  ctx.fillStyle = "#e8eeff";
  ctx.font = "bold 20px 'Exo 2', 'Inter', sans-serif";
  ctx.fillText(String(state.score), RP, statsY + 22);

  ctx.fillStyle = "#a8b7e6";
  ctx.font = "bold 11px 'Inter', sans-serif";
  ctx.letterSpacing = "0.12em";
  ctx.fillText("LEVEL", RP, statsY + 54);
  ctx.letterSpacing = "0em";
  ctx.fillStyle = "#e8eeff";
  ctx.font = "bold 20px 'Exo 2', 'Inter', sans-serif";
  ctx.fillText(String(state.level + 1), RP, statsY + 76);

  ctx.fillStyle = "#a8b7e6";
  ctx.font = "bold 11px 'Inter', sans-serif";
  ctx.letterSpacing = "0.12em";
  ctx.fillText("LINES", RP, statsY + 108);
  ctx.letterSpacing = "0em";
  ctx.fillStyle = "#e8eeff";
  ctx.font = "bold 20px 'Exo 2', 'Inter', sans-serif";
  ctx.fillText(String(state.lines), RP, statsY + 130);

  // Controls hint
  ctx.fillStyle = "#334d95";
  ctx.font = "10px 'Inter', sans-serif";
  const hints = ["← → Move", "↑ / X  Rotate CW", "Z       Rotate CCW", "↓  Soft drop", "Space  Hard drop", "C       Hold"];
  for (let i = 0; i < hints.length; i++) {
    ctx.fillText(hints[i], RP, statsY + 162 + i * 15);
  }

  // ── Game-over overlay ────────────────────────────────────────────────────────
  if (state.gameOver) {
    ctx.fillStyle = "rgba(7, 11, 31, 0.78)";
    ctx.fillRect(BX, BY, COLS * CELL, ROWS * CELL);
    ctx.fillStyle = "#fb7185";
    ctx.font = "bold 26px 'Exo 2', 'Inter', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("GAME OVER", BX + COLS * CELL / 2, BY + ROWS * CELL / 2 - 10);
    ctx.fillStyle = "#a8b7e6";
    ctx.font = "14px 'Inter', sans-serif";
    ctx.fillText("Press Restart to play again", BX + COLS * CELL / 2, BY + ROWS * CELL / 2 + 20);
    ctx.textAlign = "left";
  }

  // ── Pause overlay ────────────────────────────────────────────────────────────
  if (state.paused && !state.gameOver) {
    ctx.fillStyle = "rgba(7, 11, 31, 0.78)";
    ctx.fillRect(BX, BY, COLS * CELL, ROWS * CELL);
    ctx.fillStyle = "#5eead4";
    ctx.font = "bold 26px 'Exo 2', 'Inter', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("PAUSED", BX + COLS * CELL / 2, BY + ROWS * CELL / 2);
    ctx.textAlign = "left";
  }
}

// ─── Main component ───────────────────────────────────────────────────────────
function TetrisGame({ vsAI = false }) {
  const canvasRef = useRef(null);
  const stateRef = useRef(initState());
  const rafRef = useRef(0);
  const prevTimeRef = useRef(null);
  const vsAIRef = useRef(vsAI);
  vsAIRef.current = vsAI;

  // DAS tracking
  const dasRef = useRef({ left: 0, right: 0, softDrop: 0, leftHeld: false, rightHeld: false, softHeld: false });

  const phaseRef = useRef(vsAI ? "solo" : "p1");
  const [hud, setHud] = useState({
    score: 0, score2: 0, level: 0, level2: 0, lines: 0, lines2: 0,
    gameOver: false, paused: false, phase: "p1", winner: null,
  });

  // ── Game-loop helpers ─────────────────────────────────────────────────────────
  const tryMove = (dx) => {
    const s = stateRef.current;
    if (s.gameOver || s.paused) return false;
    if (isValid(s.board, s.type, s.rot, s.x + dx, s.y)) {
      s.x += dx;
      if (s.lockMoves < LOCK_RESET_LIMIT) {
        s.lockTimer = 0;
        s.lockMoves += 1;
      }
      return true;
    }
    return false;
  };

  const tryDown = () => {
    const s = stateRef.current;
    if (isValid(s.board, s.type, s.rot, s.x, s.y + 1)) {
      s.y += 1;
      s.lockTimer = 0;
      return true;
    }
    return false;
  };

  const landPiece = () => {
    const s = stateRef.current;
    let board = lockPiece(s.board, s.type, s.rot, s.x, s.y);
    const { board: clearedBoard, cleared } = clearLines(board);
    const newLines = s.lines + cleared;
    const newLevel = Math.min(Math.floor(newLines / 10), GRAVITY_MS.length - 1);
    const newScore = s.score + (LINE_SCORES[cleared] ?? 0) * (s.level + 1);

    const next = dequeueNext({ ...s, board: clearedBoard });

    // Check top-out
    const gameOver = !isValid(clearedBoard, next.type, next.rot, next.x, next.y);

    Object.assign(s, {
      board: clearedBoard,
      type: next.type,
      rot: next.rot,
      x: next.x,
      y: next.y,
      queue: next.queue,
      canHold: true,
      score: newScore,
      lines: newLines,
      level: newLevel,
      lockTimer: 0,
      lockMoves: 0,
      gravityTimer: 0,
      gameOver,
    });

    if (gameOver && phaseRef.current === "p1" && !vsAIRef.current) {
      phaseRef.current = vsAIRef.current ? "solo" : "p2";
      setHud((h) => ({
        ...h, score: newScore, score2: h.score2, level: newLevel, lines: newLines,
        phase: "p2", gameOver: false,
      }));
      stateRef.current = initState();
    } else if (gameOver && (phaseRef.current === "p2" || vsAIRef.current)) {
      phaseRef.current = "gameover";
      setHud((h) => ({
        ...h, score2: newScore, level2: newLevel, lines2: newLines,
        phase: "gameover", gameOver: true,
        winner: vsAIRef.current ? null : (newScore >= h.score ? 2 : 1),
      }));
    } else {
      setHud((h) => ({
        ...h,
        score: h.phase === "p1" ? newScore : h.score,
        score2: h.phase === "p2" ? newScore : h.score2,
        level: h.phase === "p1" ? newLevel : h.level,
        level2: h.phase === "p2" ? newLevel : h.level2,
        lines: h.phase === "p1" ? newLines : h.lines,
        lines2: h.phase === "p2" ? newLines : h.lines2,
        gameOver,
        paused: s.paused,
      }));
    }
  };

  const hardDrop = () => {
    const s = stateRef.current;
    if (s.gameOver || s.paused) return;
    let dropped = 0;
    while (isValid(s.board, s.type, s.rot, s.x, s.y + 1)) {
      s.y += 1;
      dropped += 1;
    }
    s.score += dropped * 2;
    landPiece();
  };

  const holdPiece = () => {
    const s = stateRef.current;
    if (!s.canHold || s.gameOver || s.paused) return;

    const prevHold = s.hold;
    s.hold = s.type;
    s.canHold = false;

    if (prevHold) {
      const { x, y } = spawnPos(prevHold);
      s.type = prevHold;
      s.rot = 0;
      s.x = x;
      s.y = y;
    } else {
      const next = dequeueNext(s);
      s.type = next.type;
      s.rot = next.rot;
      s.x = next.x;
      s.y = next.y;
      s.queue = next.queue;
    }
    s.lockTimer = 0;
    s.lockMoves = 0;
    s.gravityTimer = 0;
  };

  // ── RAF game loop ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const loop = (timestamp) => {
      if (prevTimeRef.current === null) prevTimeRef.current = timestamp;
      const dt = Math.min(timestamp - prevTimeRef.current, 64);
      prevTimeRef.current = timestamp;

      const s = stateRef.current;
      const das = dasRef.current;

      if (!s.gameOver && !s.paused) {
        // DAS — horizontal
        if (das.leftHeld) {
          das.left += dt;
          if (das.left >= DAS_DELAY) {
            das.left -= DAS_REPEAT;
            tryMove(-1);
          }
        }
        if (das.rightHeld) {
          das.right += dt;
          if (das.right >= DAS_DELAY) {
            das.right -= DAS_REPEAT;
            tryMove(1);
          }
        }

        // Soft drop
        if (das.softHeld) {
          das.softDrop += dt;
          if (das.softDrop >= SOFT_DROP_INTERVAL) {
            das.softDrop -= SOFT_DROP_INTERVAL;
            if (tryDown()) s.score += 1;
          }
        }

        // Gravity
        const speed = GRAVITY_MS[Math.min(s.level, GRAVITY_MS.length - 1)];
        s.gravityTimer += dt;
        if (s.gravityTimer >= speed) {
          s.gravityTimer -= speed;
          const moved = tryDown();
          if (!moved) {
            s.lockTimer += speed;
          }
        }

        // Lock delay
        const canFall = isValid(s.board, s.type, s.rot, s.x, s.y + 1);
        if (!canFall) {
          s.lockTimer += dt;
          if (s.lockTimer >= LOCK_DELAY) {
            landPiece();
          }
        } else {
          s.lockTimer = 0;
        }
      }

      drawScene(ctx, s);
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafRef.current);
      prevTimeRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Keyboard input ────────────────────────────────────────────────────────────
  useEffect(() => {
    const das = dasRef.current;

    const down = (e) => {
      const s = stateRef.current;
      const code = e.code;

      if (["ArrowLeft","ArrowRight","ArrowDown","ArrowUp","Space","KeyX","KeyZ","KeyC"].includes(code)) {
        e.preventDefault();
      }

      if (code === "Escape" || code === "KeyP") {
        if (!s.gameOver) {
          s.paused = !s.paused;
          setHud(h => ({ ...h, paused: s.paused }));
        }
        return;
      }

      if (s.gameOver || s.paused) return;

      if (code === "ArrowLeft") {
        if (!das.leftHeld) { das.leftHeld = true; das.left = 0; tryMove(-1); }
      }
      if (code === "ArrowRight") {
        if (!das.rightHeld) { das.rightHeld = true; das.right = 0; tryMove(1); }
      }
      if (code === "ArrowDown") {
        if (!das.softHeld) { das.softHeld = true; das.softDrop = 0; }
      }
      if (code === "ArrowUp" || code === "KeyX") {
        const res = tryRotate(s.board, s.type, s.rot, s.x, s.y, 1);
        if (res) {
          s.rot = res.rot; s.x = res.x; s.y = res.y;
          if (s.lockMoves < LOCK_RESET_LIMIT) { s.lockTimer = 0; s.lockMoves++; }
        }
      }
      if (code === "KeyZ" || code === "ControlLeft" || code === "ControlRight") {
        const res = tryRotate(s.board, s.type, s.rot, s.x, s.y, -1);
        if (res) {
          s.rot = res.rot; s.x = res.x; s.y = res.y;
          if (s.lockMoves < LOCK_RESET_LIMIT) { s.lockTimer = 0; s.lockMoves++; }
        }
      }
      if (code === "Space") {
        hardDrop();
      }
      if (code === "KeyC" || code === "ShiftLeft" || code === "ShiftRight") {
        holdPiece();
      }
    };

    const up = (e) => {
      if (e.code === "ArrowLeft")  { dasRef.current.leftHeld = false; dasRef.current.left = 0; }
      if (e.code === "ArrowRight") { dasRef.current.rightHeld = false; dasRef.current.right = 0; }
      if (e.code === "ArrowDown")  { dasRef.current.softHeld = false; dasRef.current.softDrop = 0; }
    };

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRestart = () => {
    phaseRef.current = vsAI ? "solo" : "p1";
    const s = initState();
    stateRef.current = s;
    prevTimeRef.current = null;
    dasRef.current = { left: 0, right: 0, softDrop: 0, leftHeld: false, rightHeld: false, softHeld: false };
    setHud({ score: 0, score2: 0, level: 0, level2: 0, lines: 0, lines2: 0, gameOver: false, paused: false, phase: "p1", winner: null });
  };

  const handlePause = () => {
    const s = stateRef.current;
    if (s.gameOver) return;
    s.paused = !s.paused;
    setHud(h => ({ ...h, paused: s.paused }));
  };

  const statusText = hud.winner
    ? `Player ${hud.winner} wins!`
    : hud.gameOver
    ? "Game over"
    : hud.paused
    ? "Paused — press P or Esc"
    : vsAI
    ? "Clear lines to level up"
    : hud.phase === "p2"
    ? "Player 2's turn — clear lines"
    : "Player 1's turn — clear lines";

  return (
    <div className="w-full">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Chip tone={hud.winner ? "accent" : hud.gameOver ? "accent" : hud.paused ? "accent" : "default"}>{statusText}</Chip>
        <div className="flex items-center gap-2">
          {vsAI ? (
            <>
              <Chip>Score: {hud.score}</Chip>
              <Chip>Lv {hud.level + 1}</Chip>
              <Chip>Lines: {hud.lines}</Chip>
            </>
          ) : (
            <>
              <Chip>P1: {hud.score}</Chip>
              <Chip>P2: {hud.score2}</Chip>
              <Chip>Lv {hud.phase === "p2" ? hud.level2 + 1 : hud.level + 1}</Chip>
              <Chip>Lines: {hud.phase === "p2" ? hud.lines2 : hud.lines}</Chip>
            </>
          )}
          <Button variant="secondary" onClick={handlePause} disabled={hud.gameOver}>
            {hud.paused ? "Resume" : "Pause"}
          </Button>
          <Button variant="secondary" onClick={handleRestart}>
            Restart
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl2 border border-brand-border bg-brand-panelSoft">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="h-auto w-full"
          aria-label="Tetris game canvas"
        />
      </div>

      <p className="mt-4 text-center text-sm text-brand-muted">
        {vsAI ? "Clear lines to level up. " : "P1 then P2 play sequentially. Highest score wins. "}
        ← → Move · ↑/X Rotate · Z Rotate CCW · ↓ Soft drop · Space Hard drop · C Hold · P Pause
      </p>
    </div>
  );
}

export default TetrisGame;
