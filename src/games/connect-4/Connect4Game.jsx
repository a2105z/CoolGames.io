import { useEffect, useMemo, useState } from "react";
import Button from "../../components/ui/Button";
import Chip from "../../components/ui/Chip";

const ROWS = 6;
const COLS = 7;

function getLowestRow(board, col) {
  for (let row = ROWS - 1; row >= 0; row--) {
    if (!board[row][col]) return row;
  }
  return -1;
}

function checkWinner(board) {
  const directions = [
    [0, 1],   // horizontal
    [1, 0],   // vertical
    [1, 1],   // diagonal down-right
    [1, -1],  // diagonal down-left
  ];

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = board[r][c];
      if (!cell) continue;

      for (const [dr, dc] of directions) {
        let count = 1;
        const line = [[r, c]];

        for (let i = 1; i < 4; i++) {
          const nr = r + dr * i;
          const nc = c + dc * i;
          if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && board[nr][nc] === cell) {
            count++;
            line.push([nr, nc]);
          } else break;
        }

        if (count === 4) return { player: cell, line };
      }
    }
  }
  return null;
}

function isBoardFull(board) {
  return board[0].every((cell) => cell !== null);
}

function getAIMove(board, aiPlayer) {
  const human = aiPlayer === "R" ? "Y" : "R";
  for (let c = 0; c < COLS; c++) {
    const r = getLowestRow(board, c);
    if (r < 0) continue;
    const test = board.map((row) => [...row]);
    test[r][c] = aiPlayer;
    if (checkWinner(test)) return c;
  }
  for (let c = 0; c < COLS; c++) {
    const r = getLowestRow(board, c);
    if (r < 0) continue;
    const test = board.map((row) => [...row]);
    test[r][c] = human;
    if (checkWinner(test)) return c;
  }
  const center = [3, 2, 4, 1, 5, 0, 6];
  for (const c of center) {
    if (getLowestRow(board, c) >= 0) return c;
  }
  return -1;
}

function Connect4Game({ vsAI = false }) {
  const [board, setBoard] = useState(() =>
    Array(ROWS)
      .fill(null)
      .map(() => Array(COLS).fill(null))
  );
  const [currentPlayer, setCurrentPlayer] = useState("R");

  const winner = useMemo(() => checkWinner(board), [board]);
  const isDraw = useMemo(() => !winner && isBoardFull(board), [board, winner]);

  const isAITurn = vsAI && currentPlayer === "Y" && !winner && !isDraw;

  const statusText = winner
    ? winner.player === "R"
      ? vsAI ? "You win!" : "Red wins!"
      : vsAI ? "AI wins!" : "Yellow wins!"
    : isDraw
      ? "Draw! Board full."
      : vsAI && currentPlayer === "Y"
        ? "AI thinking..."
        : vsAI
          ? "Your turn — click a column"
          : `${currentPlayer === "R" ? "Red" : "Yellow"}'s turn — click a column`;

  useEffect(() => {
    if (!isAITurn) return;
    const timer = setTimeout(() => {
      const col = getAIMove(board, "Y");
      if (col >= 0) {
        const row = getLowestRow(board, col);
        setBoard((prev) => {
          const next = prev.map((r) => [...r]);
          next[row][col] = "Y";
          return next;
        });
        setCurrentPlayer("R");
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [isAITurn, board]);

  const handleColumnClick = (col) => {
    if (winner || isDraw || isAITurn) return;
    if (vsAI && currentPlayer !== "R") return;

    const row = getLowestRow(board, col);
    if (row < 0) return;

    setBoard((prev) => {
      const next = prev.map((r) => [...r]);
      next[row][col] = currentPlayer;
      return next;
    });
    setCurrentPlayer((p) => (p === "R" ? "Y" : "R"));
  };

  const handleReset = () => {
    setBoard(
      Array(ROWS)
        .fill(null)
        .map(() => Array(COLS).fill(null))
    );
    setCurrentPlayer("R");
  };

  const lineSet = useMemo(
    () => (winner ? new Set(winner.line.map(([r, c]) => `${r},${c}`)) : null),
    [winner]
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center">
      <div className="mb-5 flex w-full flex-wrap items-center justify-between gap-3">
        <Chip tone={winner ? "accent" : "primary"}>{statusText}</Chip>
        <Button variant="secondary" onClick={handleReset}>
          New Game
        </Button>
      </div>

      <div className="rounded-xl border-2 border-brand-border bg-sky-900/30 p-3">
        {/* Column headers (clickable) */}
        <div className="mb-2 grid grid-cols-7 gap-1">
          {Array(COLS)
            .fill(0)
            .map((_, col) => (
              <button
                key={col}
                type="button"
                onClick={() => handleColumnClick(col)}
                disabled={winner || isDraw || board[0][col] !== null}
                className="flex h-10 w-12 items-center justify-center rounded-lg border border-brand-border bg-brand-panelSoft text-brand-muted transition-colors hover:border-brand-primary hover:text-brand-primary disabled:cursor-not-allowed disabled:opacity-50"
                aria-label={`Drop in column ${col + 1}`}
              >
                ↓
              </button>
            ))}
        </div>

        {/* Board */}
        <div className="grid grid-cols-7 gap-1">
          {board.map((row, r) =>
            row.map((cell, c) => {
              const isWinning = lineSet?.has(`${r},${c}`);
              return (
                <div
                  key={`${r}-${c}`}
                  className={`flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all md:h-14 md:w-14 ${
                    isWinning
                      ? "border-brand-primary bg-brand-primary/20 shadow-glow"
                      : "border-brand-border bg-brand-panel"
                  }`}
                >
                  {cell && (
                    <div
                      className={`h-8 w-8 rounded-full md:h-10 md:w-10 ${
                        cell === "R"
                          ? "bg-red-500 shadow-lg shadow-red-500/50"
                          : "bg-amber-400 shadow-lg shadow-amber-400/50"
                      }`}
                    />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      <p className="mt-5 text-center text-sm text-brand-muted">
        Drop tokens into columns. First to connect four in a row wins.
      </p>
    </div>
  );
}

export default Connect4Game;
