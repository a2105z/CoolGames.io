import { useCallback, useEffect, useMemo, useState } from "react";
import Button from "../../components/ui/Button";
import Chip from "../../components/ui/Chip";

const SIZE = 8;

function createInitialBoard() {
  const board = Array(SIZE)
    .fill(null)
    .map(() => Array(SIZE).fill(null));

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if ((r + c) % 2 === 1) {
        if (r < 3) board[r][c] = "B";
        else if (r > 4) board[r][c] = "R";
      }
    }
  }
  return board;
}

function getMoves(board, row, col, player) {
  const piece = board[row][col];
  if (!piece || piece[0] !== player[0]) return { moves: [], jumps: [] };

  const isKing = piece.length > 1;
  const dirs = isKing
    ? [
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1],
      ]
    : player === "R"
      ? [
          [-1, -1],
          [-1, 1],
        ]
      : [
          [1, -1],
          [1, 1],
        ];

  const jumps = [];
  const moves = [];

  for (const [dr, dc] of dirs) {
    const nr = row + dr;
    const nc = col + dc;
    if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) continue;

    if (!board[nr][nc]) {
      moves.push([nr, nc]);
    } else if (board[nr][nc][0] !== player[0]) {
      const jr = nr + dr;
      const jc = nc + dc;
      if (jr >= 0 && jr < SIZE && jc >= 0 && jc < SIZE && !board[jr][jc]) {
        jumps.push([jr, jc, nr, nc]);
      }
    }
  }

  return { moves, jumps };
}

function getAllJumps(board, player) {
  const allJumps = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const { jumps } = getMoves(board, r, c, player);
      for (const j of jumps) {
        allJumps.push({ from: [r, c], to: [j[0], j[1]], capture: [j[2], j[3]] });
      }
    }
  }
  return allJumps;
}

function getAllMoves(board, player) {
  const jumps = getAllJumps(board, player);
  if (jumps.length > 0) return jumps;

  const moves = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const { moves: m } = getMoves(board, r, c, player);
      for (const [nr, nc] of m) {
        moves.push({ from: [r, c], to: [nr, nc], capture: null });
      }
    }
  }
  return moves;
}

function applyMove(board, from, to, capture) {
  const next = board.map((row) => row.map((c) => c));
  const [fr, fc] = from;
  const [tr, tc] = to;
  const piece = next[fr][fc];

  next[fr][fc] = null;
  next[tr][tc] = piece;

  if (capture) {
    next[capture[0]][capture[1]] = null;
  }

  // King promotion
  if (piece === "R" && tr === 0) next[tr][tc] = "RK";
  if (piece === "B" && tr === SIZE - 1) next[tr][tc] = "BK";

  return next;
}

function countPieces(board, player) {
  let count = 0;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] && board[r][c][0] === player[0]) count++;
    }
  }
  return count;
}

function getAIMove(board, player) {
  const moves = getAllMoves(board, player);
  if (moves.length === 0) return null;
  const captures = moves.filter((m) => m.capture);
  if (captures.length > 0) {
    return captures[Math.floor(Math.random() * captures.length)];
  }
  return moves[Math.floor(Math.random() * moves.length)];
}

function CheckersGame({ vsAI = false }) {
  const [board, setBoard] = useState(createInitialBoard);
  const [currentPlayer, setCurrentPlayer] = useState("R");
  const [selected, setSelected] = useState(null);
  const [validMoves, setValidMoves] = useState([]);

  const redCount = useMemo(() => countPieces(board, "R"), [board]);
  const blackCount = useMemo(() => countPieces(board, "B"), [board]);

  const winner = useMemo(() => {
    if (redCount === 0) return "B";
    if (blackCount === 0) return "R";
    const moves = getAllMoves(board, currentPlayer);
    if (moves.length === 0) return currentPlayer === "R" ? "B" : "R";
    return null;
  }, [board, currentPlayer, redCount, blackCount]);

  const statusText = winner
    ? vsAI
      ? `${winner === "R" ? "You" : "AI"} win!`
      : `${winner === "R" ? "Red" : "Black"} wins!`
    : vsAI && currentPlayer === "B"
      ? "AI thinking..."
      : `${currentPlayer === "R" ? "Red" : "Black"}'s turn`;

  const isAITurn = vsAI && currentPlayer === "B" && !winner;

  useEffect(() => {
    if (!isAITurn) return;
    const t = setTimeout(() => {
      const move = getAIMove(board, "B");
      if (move) {
        const newBoard = applyMove(board, move.from, move.to, move.capture);
        setBoard(newBoard);
        setSelected(null);
        setValidMoves([]);

        let nextPlayer = "R";
        if (move.capture) {
          const moreJumps = getAllJumps(newBoard, "B").filter(
            (j) => j.from[0] === move.to[0] && j.from[1] === move.to[1]
          );
          if (moreJumps.length > 0) nextPlayer = "B";
        }
        setCurrentPlayer(nextPlayer);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [isAITurn, board]);

  const handleSquareClick = useCallback(
    (r, c) => {
      if (winner) return;
      if (vsAI && currentPlayer === "B") return;

      const piece = board[r][c];
      const moves = getAllMoves(board, currentPlayer);

      if (selected) {
        const move = validMoves.find(
          (m) => m.to[0] === r && m.to[1] === c
        );
        if (move) {
          const newBoard = applyMove(
            board,
            move.from,
            move.to,
            move.capture
          );
          setBoard(newBoard);
          setSelected(null);
          setValidMoves([]);

          let nextPlayer = currentPlayer === "R" ? "B" : "R";
          if (move.capture) {
            const moreJumps = getAllJumps(newBoard, currentPlayer).filter(
              (j) => j.from[0] === move.to[0] && j.from[1] === move.to[1]
            );
            if (moreJumps.length > 0) nextPlayer = currentPlayer;
          }
          setCurrentPlayer(nextPlayer);
          return;
        }
      }

      if (piece && piece[0] === currentPlayer[0]) {
        const pieceMoves = moves.filter(
          (m) => m.from[0] === r && m.from[1] === c
        );
        if (pieceMoves.length > 0) {
          setSelected([r, c]);
          setValidMoves(pieceMoves);
        }
      } else {
        setSelected(null);
        setValidMoves([]);
      }
    },
    [board, currentPlayer, selected, validMoves, winner, vsAI]
  );

  const handleReset = () => {
    setBoard(createInitialBoard());
    setCurrentPlayer("R");
    setSelected(null);
    setValidMoves([]);
  };

  const validToSet = useMemo(
    () => new Set(validMoves.map((m) => `${m.to[0]},${m.to[1]}`)),
    [validMoves]
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center">
      <div className="mb-5 flex w-full flex-wrap items-center justify-between gap-3">
        <Chip tone={winner ? "accent" : "primary"}>{statusText}</Chip>
        <div className="flex gap-2">
          <span className="text-xs text-brand-muted">
            Red: {redCount} | Black: {blackCount}
          </span>
          <Button variant="secondary" onClick={handleReset}>
            New Game
          </Button>
        </div>
      </div>

      <div className="rounded-xl border-2 border-brand-border overflow-hidden">
        <div
          className="grid gap-0"
          style={{ gridTemplateColumns: `repeat(${SIZE}, 2.5rem)` }}
        >
          {board.map((row, r) =>
            row.map((cell, c) => {
              const isDark = (r + c) % 2 === 1;
              const isSelected =
                selected && selected[0] === r && selected[1] === c;
              const isValidTarget = validToSet.has(`${r},${c}`);

              return (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  onClick={() => handleSquareClick(r, c)}
                  disabled={!isDark}
                  className={`flex h-10 w-10 items-center justify-center border border-brand-border transition-all md:h-12 md:w-12 ${
                    !isDark
                      ? "cursor-default bg-amber-900/40"
                      : "hover:bg-brand-primary/20"
                  } ${
                    isSelected
                      ? "bg-brand-primary/30 ring-2 ring-brand-primary"
                      : ""
                  } ${isValidTarget ? "bg-brand-primary/15" : ""}`}
                  aria-label={`Square ${r + 1},${c + 1}${cell ? ` ${cell}` : ""}`}
                >
                  {cell && (
                    <div
                      className={`h-7 w-7 rounded-full border-2 md:h-8 md:w-8 ${
                        cell[0] === "R"
                          ? "border-red-800 bg-red-500"
                          : "border-slate-800 bg-slate-700"
                      } ${cell.length > 1 ? "ring-1 ring-amber-400" : ""}`}
                    />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      <p className="mt-5 text-center text-sm text-brand-muted">
        Move diagonally. Jump over opponent pieces to capture. Kings move both ways.
      </p>
    </div>
  );
}

export default CheckersGame;
