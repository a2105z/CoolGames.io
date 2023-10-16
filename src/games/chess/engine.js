const WHITE = "w";
const BLACK = "b";

const PIECE_SYMBOLS = {
  wk: "♔", wq: "♕", wr: "♖", wb: "♗", wn: "♘", wp: "♙",
  bk: "♚", bq: "♛", br: "♜", bb: "♝", bn: "♞", bp: "♟",
};

const PIECE_VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

function createBoard() {
  const b = Array.from({ length: 8 }, () => Array(8).fill(null));
  const rank = ["r", "n", "b", "q", "k", "b", "n", "r"];
  for (let c = 0; c < 8; c++) {
    b[0][c] = { type: rank[c], color: BLACK };
    b[1][c] = { type: "p", color: BLACK };
    b[6][c] = { type: "p", color: WHITE };
    b[7][c] = { type: rank[c], color: WHITE };
  }
  return b;
}

function cloneBoard(b) {
  return b.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}

function inBounds(r, c) {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

function findKing(board, color) {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.type === "k" && p.color === color) return [r, c];
    }
  }
  return null;
}

function isSquareAttacked(board, row, col, byColor) {
  const KNIGHT_OFFSETS = [
    [-2, -1], [-2, 1], [-1, -2], [-1, 2],
    [1, -2], [1, 2], [2, -1], [2, 1],
  ];
  for (const [dr, dc] of KNIGHT_OFFSETS) {
    const r = row + dr;
    const c = col + dc;
    if (inBounds(r, c)) {
      const p = board[r][c];
      if (p && p.color === byColor && p.type === "n") return true;
    }
  }

  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const r = row + dr;
      const c = col + dc;
      if (inBounds(r, c)) {
        const p = board[r][c];
        if (p && p.color === byColor && p.type === "k") return true;
      }
    }
  }

  const pawnDir = byColor === WHITE ? 1 : -1;
  for (const dc of [-1, 1]) {
    const r = row + pawnDir;
    const c = col + dc;
    if (inBounds(r, c)) {
      const p = board[r][c];
      if (p && p.color === byColor && p.type === "p") return true;
    }
  }

  const DIAGS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  for (const [dr, dc] of DIAGS) {
    let r = row + dr;
    let c = col + dc;
    while (inBounds(r, c)) {
      const p = board[r][c];
      if (p) {
        if (p.color === byColor && (p.type === "b" || p.type === "q")) return true;
        break;
      }
      r += dr;
      c += dc;
    }
  }

  const STRAIGHTS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (const [dr, dc] of STRAIGHTS) {
    let r = row + dr;
    let c = col + dc;
    while (inBounds(r, c)) {
      const p = board[r][c];
      if (p) {
        if (p.color === byColor && (p.type === "r" || p.type === "q")) return true;
        break;
      }
      r += dr;
      c += dc;
    }
  }

  return false;
}

function isInCheck(board, color) {
  const king = findKing(board, color);
  if (!king) return false;
  const enemy = color === WHITE ? BLACK : WHITE;
  return isSquareAttacked(board, king[0], king[1], enemy);
}

function getPseudoLegalMoves(board, row, col, castleRights, enPassantTarget) {
  const piece = board[row][col];
  if (!piece) return [];

  const moves = [];
  const { type, color } = piece;
  const enemy = color === WHITE ? BLACK : WHITE;

  const add = (toR, toC, promo = null) => {
    moves.push({ fromRow: row, fromCol: col, toRow: toR, toCol: toC, promotion: promo });
  };

  const slideOrCapture = (r, c) => {
    if (!inBounds(r, c)) return false;
    const t = board[r][c];
    if (t && t.color === color) return false;
    add(r, c);
    return !t;
  };

  if (type === "p") {
    const dir = color === WHITE ? -1 : 1;
    const startRow = color === WHITE ? 6 : 1;
    const promoRow = color === WHITE ? 0 : 7;
    const fwd = row + dir;

    if (inBounds(fwd, col) && !board[fwd][col]) {
      if (fwd === promoRow) {
        for (const pr of ["q", "r", "b", "n"]) add(fwd, col, pr);
      } else {
        add(fwd, col);
        const dbl = row + dir * 2;
        if (row === startRow && !board[dbl][col]) add(dbl, col);
      }
    }

    for (const dc of [-1, 1]) {
      const cr = row + dir;
      const cc = col + dc;
      if (!inBounds(cr, cc)) continue;
      const target = board[cr][cc];
      if (target && target.color === enemy) {
        if (cr === promoRow) {
          for (const pr of ["q", "r", "b", "n"]) add(cr, cc, pr);
        } else {
          add(cr, cc);
        }
      }
      if (enPassantTarget && enPassantTarget[0] === cr && enPassantTarget[1] === cc) {
        add(cr, cc);
      }
    }
  }

  if (type === "n") {
    const OFFSETS = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
    for (const [dr, dc] of OFFSETS) slideOrCapture(row + dr, col + dc);
  }

  if (type === "b" || type === "q") {
    for (const [dr, dc] of [[-1,-1],[-1,1],[1,-1],[1,1]]) {
      let r = row + dr, c = col + dc;
      while (inBounds(r, c)) {
        if (!slideOrCapture(r, c)) break;
        r += dr; c += dc;
      }
    }
  }

  if (type === "r" || type === "q") {
    for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      let r = row + dr, c = col + dc;
      while (inBounds(r, c)) {
        if (!slideOrCapture(r, c)) break;
        r += dr; c += dc;
      }
    }
  }

  if (type === "k") {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        slideOrCapture(row + dr, col + dc);
      }
    }

    const home = color === WHITE ? 7 : 0;
    if (row === home && col === 4) {
      const kk = color === WHITE ? "wk" : "bk";
      const qk = color === WHITE ? "wq" : "bq";
      if (
        castleRights[kk] &&
        board[home][7]?.type === "r" && board[home][7]?.color === color &&
        !board[home][5] && !board[home][6] &&
        !isSquareAttacked(board, home, 4, enemy) &&
        !isSquareAttacked(board, home, 5, enemy) &&
        !isSquareAttacked(board, home, 6, enemy)
      ) {
        add(home, 6);
      }
      if (
        castleRights[qk] &&
        board[home][0]?.type === "r" && board[home][0]?.color === color &&
        !board[home][1] && !board[home][2] && !board[home][3] &&
        !isSquareAttacked(board, home, 4, enemy) &&
        !isSquareAttacked(board, home, 3, enemy) &&
        !isSquareAttacked(board, home, 2, enemy)
      ) {
        add(home, 2);
      }
    }
  }

  return moves;
}

function makeMove(board, move, castleRights, enPassantTarget) {
  const { fromRow, fromCol, toRow, toCol, promotion } = move;
  const nb = cloneBoard(board);
  const piece = nb[fromRow][fromCol];
  let captured = nb[toRow][toCol];

  nb[toRow][toCol] = promotion ? { type: promotion, color: piece.color } : piece;
  nb[fromRow][fromCol] = null;

  if (piece.type === "p" && !captured && enPassantTarget &&
      toRow === enPassantTarget[0] && toCol === enPassantTarget[1]) {
    const epRow = piece.color === WHITE ? toRow + 1 : toRow - 1;
    captured = nb[epRow][toCol];
    nb[epRow][toCol] = null;
  }

  if (piece.type === "k" && Math.abs(toCol - fromCol) === 2) {
    if (toCol > fromCol) {
      nb[fromRow][5] = nb[fromRow][7];
      nb[fromRow][7] = null;
    } else {
      nb[fromRow][3] = nb[fromRow][0];
      nb[fromRow][0] = null;
    }
  }

  const cr = { ...castleRights };
  if (piece.type === "k") {
    if (piece.color === WHITE) { cr.wk = false; cr.wq = false; }
    else { cr.bk = false; cr.bq = false; }
  }
  if (piece.type === "r") {
    if (fromRow === 7 && fromCol === 0) cr.wq = false;
    if (fromRow === 7 && fromCol === 7) cr.wk = false;
    if (fromRow === 0 && fromCol === 0) cr.bq = false;
    if (fromRow === 0 && fromCol === 7) cr.bk = false;
  }
  if (toRow === 7 && toCol === 0) cr.wq = false;
  if (toRow === 7 && toCol === 7) cr.wk = false;
  if (toRow === 0 && toCol === 0) cr.bq = false;
  if (toRow === 0 && toCol === 7) cr.bk = false;

  let ep = null;
  if (piece.type === "p" && Math.abs(toRow - fromRow) === 2) {
    ep = [(fromRow + toRow) / 2, fromCol];
  }

  return { board: nb, castleRights: cr, enPassantTarget: ep, captured };
}

function getLegalMoves(board, row, col, castleRights, enPassantTarget) {
  const piece = board[row][col];
  if (!piece) return [];
  return getPseudoLegalMoves(board, row, col, castleRights, enPassantTarget).filter((move) => {
    const { board: nb } = makeMove(board, move, castleRights, enPassantTarget);
    return !isInCheck(nb, piece.color);
  });
}

function getAllLegalMoves(board, color, castleRights, enPassantTarget) {
  const all = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c]?.color === color) {
        all.push(...getLegalMoves(board, r, c, castleRights, enPassantTarget));
      }
    }
  }
  return all;
}

function getGameStatus(board, color, castleRights, enPassantTarget) {
  const hasLegal = getAllLegalMoves(board, color, castleRights, enPassantTarget).length > 0;
  const inCheck = isInCheck(board, color);
  if (!hasLegal) return inCheck ? "checkmate" : "stalemate";
  if (inCheck) return "check";
  return "playing";
}

export {
  WHITE, BLACK,
  PIECE_SYMBOLS,
  PIECE_VALUES,
  createBoard,
  cloneBoard,
  findKing,
  isInCheck,
  getLegalMoves,
  getAllLegalMoves,
  makeMove,
  getGameStatus,
};
