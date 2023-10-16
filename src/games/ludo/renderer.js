import {
  CELL, BOARD_CELLS, BOARD_OX, BOARD_OY,
  PLAYERS, PLAYER_COLORS,
  OUTER_PATH, HOME_RUNS, HOME_BASES, SAFE_INDICES,
  CANVAS_W, CANVAS_H,
} from "./constants";
import { getTokenBoardPos } from "./engine";

function cellToPixel(row, col) {
  return {
    x: BOARD_OX + col * CELL,
    y: BOARD_OY + row * CELL,
  };
}

function getQuadrantColor(row, col) {
  if (row < 6 && col < 6) return "red";
  if (row < 6 && col > 8) return "green";
  if (row > 8 && col > 8) return "yellow";
  if (row > 8 && col < 6) return "blue";
  return null;
}

function drawBoard(ctx) {
  ctx.fillStyle = "#070b1f";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Board background
  const bx = BOARD_OX;
  const by = BOARD_OY;
  const bs = BOARD_CELLS * CELL;
  ctx.fillStyle = "#f5f0e8";
  ctx.fillRect(bx, by, bs, bs);

  // Quadrant home areas
  const quadrants = [
    { color: "red",    r: 0, c: 0 },
    { color: "green",  r: 0, c: 9 },
    { color: "yellow", r: 9, c: 9 },
    { color: "blue",   r: 9, c: 0 },
  ];
  for (const q of quadrants) {
    const { x, y } = cellToPixel(q.r, q.c);
    ctx.fillStyle = PLAYER_COLORS[q.color].light;
    ctx.fillRect(x, y, 6 * CELL, 6 * CELL);
    ctx.strokeStyle = PLAYER_COLORS[q.color].dark;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, 6 * CELL, 6 * CELL);

    // Inner white area for token homes
    ctx.fillStyle = "#f5f0e8";
    ctx.fillRect(x + CELL, y + CELL, 4 * CELL, 4 * CELL);
    ctx.strokeStyle = PLAYER_COLORS[q.color].dark;
    ctx.strokeRect(x + CELL, y + CELL, 4 * CELL, 4 * CELL);
  }

  // Draw grid lines for the cross section
  ctx.strokeStyle = "#ccc";
  ctx.lineWidth = 0.5;
  for (let r = 0; r <= BOARD_CELLS; r++) {
    for (let c = 0; c <= BOARD_CELLS; c++) {
      const inCross =
        (r >= 6 && r <= 9) || (c >= 6 && c <= 9);
      if (!inCross) continue;
      const { x, y } = cellToPixel(r, c);
      ctx.strokeRect(x, y, CELL, CELL);
    }
  }

  // Colored home-run lanes
  for (const player of PLAYERS) {
    const cells = HOME_RUNS[player];
    for (const [r, c] of cells) {
      const { x, y } = cellToPixel(r, c);
      ctx.fillStyle = PLAYER_COLORS[player].light;
      ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
    }
  }

  // Mark safe spots with a star
  const pathSet = new Set();
  OUTER_PATH.forEach(([r, c], idx) => {
    pathSet.add(`${r},${c},${idx}`);
  });

  for (const safeIdx of SAFE_INDICES) {
    const [r, c] = OUTER_PATH[safeIdx];
    const { x, y } = cellToPixel(r, c);
    ctx.fillStyle = "#ddd";
    ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
    drawStar(ctx, x + CELL / 2, y + CELL / 2, 8, "#999");
  }

  // Color the start cells
  for (const player of PLAYERS) {
    const startIdx = { red: 0, green: 13, yellow: 26, blue: 39 }[player];
    const [r, c] = OUTER_PATH[startIdx];
    const { x, y } = cellToPixel(r, c);
    ctx.fillStyle = PLAYER_COLORS[player].light;
    ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
    drawStar(ctx, x + CELL / 2, y + CELL / 2, 8, PLAYER_COLORS[player].dark);
  }

  // Center triangle home
  drawCenterHome(ctx);

  // Home base circles (where tokens rest before entering play)
  for (const player of PLAYERS) {
    const bases = HOME_BASES[player];
    for (const [r, c] of bases) {
      const { x, y } = cellToPixel(r, c);
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(x + CELL / 2, y + CELL / 2, CELL / 2 - 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = PLAYER_COLORS[player].dark;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }
}

function drawCenterHome(ctx) {
  const cx = BOARD_OX + 7.5 * CELL;
  const cy = BOARD_OY + 7.5 * CELL;
  const half = 1.5 * CELL;

  const triangles = [
    { color: "red",    points: [[-half, -half], [half, -half], [0, 0]] },
    { color: "green",  points: [[half, -half], [half, half], [0, 0]] },
    { color: "yellow", points: [[half, half], [-half, half], [0, 0]] },
    { color: "blue",   points: [[-half, half], [-half, -half], [0, 0]] },
  ];

  for (const tri of triangles) {
    ctx.fillStyle = PLAYER_COLORS[tri.color].fill;
    ctx.beginPath();
    ctx.moveTo(cx + tri.points[0][0], cy + tri.points[0][1]);
    ctx.lineTo(cx + tri.points[1][0], cy + tri.points[1][1]);
    ctx.lineTo(cx + tri.points[2][0], cy + tri.points[2][1]);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function drawStar(ctx, cx, cy, radius, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const outerAngle = (Math.PI / 2) * -1 + (i * 2 * Math.PI) / 5;
    const innerAngle = outerAngle + Math.PI / 5;
    const ox = cx + Math.cos(outerAngle) * radius;
    const oy = cy + Math.sin(outerAngle) * radius;
    const ix = cx + Math.cos(innerAngle) * radius * 0.4;
    const iy = cy + Math.sin(innerAngle) * radius * 0.4;
    if (i === 0) ctx.moveTo(ox, oy);
    else ctx.lineTo(ox, oy);
    ctx.lineTo(ix, iy);
  }
  ctx.closePath();
  ctx.fill();
}

export function drawTokens(ctx, tokens, movableIds, currentPlayer) {
  // Count tokens at each position for stacking
  const posMap = new Map();

  for (const player of PLAYERS) {
    for (const token of tokens[player]) {
      if (token.state === "home") {
        const [r, c] = HOME_BASES[player][token.id];
        const key = `home-${player}-${token.id}`;
        posMap.set(key, { tokens: [token], r, c });
      } else if (token.state === "finished") {
        // Don't draw finished tokens on board
      } else {
        const pos = getTokenBoardPos(token);
        if (!pos) continue;
        const key = `${pos[0]}-${pos[1]}`;
        if (!posMap.has(key)) {
          posMap.set(key, { tokens: [], r: pos[0], c: pos[1] });
        }
        posMap.get(key).tokens.push(token);
      }
    }
  }

  for (const [, entry] of posMap) {
    const { tokens: toks, r, c } = entry;
    const { x, y } = cellToPixel(r, c);
    const cx = x + CELL / 2;
    const cy = y + CELL / 2;

    if (toks.length === 1) {
      const token = toks[0];
      const isMovable =
        token.player === currentPlayer && movableIds.includes(token.id);
      drawSingleToken(ctx, cx, cy, token.player, isMovable);
    } else {
      // Multiple tokens stacked - offset them
      const offsets = [
        [-6, -6], [6, -6], [-6, 6], [6, 6],
      ];
      for (let i = 0; i < toks.length; i++) {
        const token = toks[i];
        const off = offsets[i % offsets.length];
        const isMovable =
          token.player === currentPlayer && movableIds.includes(token.id);
        drawSingleToken(ctx, cx + off[0], cy + off[1], token.player, isMovable, 10);
      }
    }
  }
}

function drawSingleToken(ctx, cx, cy, player, isMovable, radius = 14) {
  const colors = PLAYER_COLORS[player];

  if (isMovable) {
    ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = colors.fill;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = colors.dark;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Inner highlight
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath();
  ctx.arc(cx - 3, cy - 3, radius * 0.45, 0, Math.PI * 2);
  ctx.fill();
}

export function drawDice(ctx, value, player, rolling) {
  const dx = BOARD_OX + BOARD_CELLS * CELL + 30;
  const dy = BOARD_OY + 60;
  const size = 64;

  // Background
  ctx.fillStyle = PLAYER_COLORS[player]?.fill ?? "#555";
  ctx.fillRect(dx - 4, dy - 4, size + 8, size + 8);
  ctx.fillStyle = "#fff";
  ctx.fillRect(dx, dy, size, size);

  if (rolling) {
    ctx.fillStyle = "#888";
    ctx.font = "bold 28px 'Exo 2', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("?", dx + size / 2, dy + size / 2);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    return;
  }

  if (value == null) return;

  // Draw pips
  const pip = (px, py) => {
    ctx.fillStyle = "#111";
    ctx.beginPath();
    ctx.arc(dx + px, dy + py, 6, 0, Math.PI * 2);
    ctx.fill();
  };

  const cx = size / 2;
  const cy = size / 2;
  const off = size * 0.28;

  if (value === 1) { pip(cx, cy); }
  if (value === 2) { pip(cx - off, cy - off); pip(cx + off, cy + off); }
  if (value === 3) { pip(cx - off, cy - off); pip(cx, cy); pip(cx + off, cy + off); }
  if (value === 4) { pip(cx - off, cy - off); pip(cx + off, cy - off); pip(cx - off, cy + off); pip(cx + off, cy + off); }
  if (value === 5) { pip(cx - off, cy - off); pip(cx + off, cy - off); pip(cx, cy); pip(cx - off, cy + off); pip(cx + off, cy + off); }
  if (value === 6) { pip(cx - off, cy - off); pip(cx + off, cy - off); pip(cx - off, cy); pip(cx + off, cy); pip(cx - off, cy + off); pip(cx + off, cy + off); }
}

export function drawSidebar(ctx, state, finishedCounts) {
  const sx = BOARD_OX + BOARD_CELLS * CELL + 22;
  let sy = BOARD_OY + 16;

  ctx.fillStyle = "#a8b7e6";
  ctx.font = "bold 11px 'Inter', sans-serif";
  ctx.letterSpacing = "0.12em";
  ctx.fillText("CURRENT TURN", sx, sy);
  ctx.letterSpacing = "0em";

  sy += 20;
  const name = state.currentPlayer.charAt(0).toUpperCase() + state.currentPlayer.slice(1);
  ctx.fillStyle = PLAYER_COLORS[state.currentPlayer].fill;
  ctx.font = "bold 18px 'Exo 2', sans-serif";
  ctx.fillText(name, sx, sy);

  // Dice drawn separately via drawDice

  sy = BOARD_OY + 170;
  ctx.fillStyle = "#a8b7e6";
  ctx.font = "bold 11px 'Inter', sans-serif";
  ctx.letterSpacing = "0.12em";
  ctx.fillText("SCORE", sx, sy);
  ctx.letterSpacing = "0em";

  sy += 6;
  for (const player of PLAYERS) {
    sy += 26;
    const pName = player.charAt(0).toUpperCase() + player.slice(1);
    ctx.fillStyle = PLAYER_COLORS[player].fill;
    ctx.font = "bold 14px 'Inter', sans-serif";
    ctx.fillText(`${pName}:`, sx, sy);
    ctx.fillStyle = "#e8eeff";
    ctx.fillText(`${finishedCounts[player]} / 4 home`, sx + 72, sy);
  }

  // Instructions
  sy += 50;
  ctx.fillStyle = "#334d95";
  ctx.font = "10px 'Inter', sans-serif";
  const hints = [
    "Click Roll to throw dice",
    "Click a token to move it",
    "6 lets you enter or re-roll",
    "Land on enemy to capture",
    "Stars are safe squares",
    "Get all 4 tokens home to win",
  ];
  for (const hint of hints) {
    sy += 15;
    ctx.fillText(hint, sx, sy);
  }
}

export function drawScene(ctx, state, movableIds, rolling) {
  drawBoard(ctx);

  const finishedCounts = {};
  for (const player of PLAYERS) {
    finishedCounts[player] = state.tokens[player].filter((t) => t.state === "finished").length;
  }

  drawTokens(ctx, state.tokens, movableIds, state.currentPlayer);
  drawDice(ctx, state.diceValue, state.currentPlayer, rolling);
  drawSidebar(ctx, state, finishedCounts);
}
