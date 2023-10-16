import { useEffect, useMemo, useState } from "react";
import Button from "../../components/ui/Button";
import Chip from "../../components/ui/Chip";

const WINNING_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function calculateWinner(cells) {
  for (const [a, b, c] of WINNING_LINES) {
    if (cells[a] && cells[a] === cells[b] && cells[a] === cells[c]) {
      return { symbol: cells[a], line: [a, b, c] };
    }
  }
  return null;
}

function getBestMove(cells, player) {
  const opponent = player === "X" ? "O" : "X";
  let bestScore = -Infinity;
  let bestMove = -1;
  for (let i = 0; i < 9; i++) {
    if (cells[i]) continue;
    const next = [...cells];
    next[i] = player;
    const score = minimax(next, 0, false, player, opponent);
    if (score > bestScore) {
      bestScore = score;
      bestMove = i;
    }
  }
  return bestMove;
}

function minimax(cells, depth, isMax, player, opponent) {
  const winner = calculateWinner(cells);
  if (winner?.symbol === player) return 10 - depth;
  if (winner?.symbol === opponent) return depth - 10;
  if (cells.every((c) => c)) return 0;
  if (isMax) {
    let best = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (cells[i]) continue;
      const next = [...cells];
      next[i] = player;
      best = Math.max(best, minimax(next, depth + 1, false, player, opponent));
    }
    return best;
  } else {
    let best = Infinity;
    for (let i = 0; i < 9; i++) {
      if (cells[i]) continue;
      const next = [...cells];
      next[i] = opponent;
      best = Math.min(best, minimax(next, depth + 1, true, player, opponent));
    }
    return best;
  }
}

function TicTacToeGame({ vsAI = false }) {
  const [cells, setCells] = useState(Array(9).fill(null));
  const [currentPlayer, setCurrentPlayer] = useState("X");

  const winner = useMemo(() => calculateWinner(cells), [cells]);
  const isDraw = useMemo(
    () => !winner && cells.every((cell) => cell !== null),
    [cells, winner]
  );

  const isAITurn = vsAI && currentPlayer === "O" && !winner && !isDraw;

  const statusText = winner
    ? winner.symbol === "X"
      ? vsAI ? "You win!" : "Player X wins!"
      : vsAI ? "AI wins!" : "Player O wins!"
    : isDraw
      ? "Draw game"
      : vsAI && currentPlayer === "O"
        ? "AI thinking..."
        : vsAI
          ? "Your turn"
          : `Player ${currentPlayer}'s turn`;

  useEffect(() => {
    if (!isAITurn) return;
    const timer = setTimeout(() => {
      const move = getBestMove(cells, "O");
      if (move >= 0) {
        setCells((prev) => {
          const next = [...prev];
          next[move] = "O";
          return next;
        });
        setCurrentPlayer("X");
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [isAITurn, cells]);

  const handleCellClick = (index) => {
    if (cells[index] || winner || isAITurn) return;
    if (vsAI && currentPlayer !== "X") return;

    setCells((prevCells) => {
      const nextCells = [...prevCells];
      nextCells[index] = currentPlayer;
      return nextCells;
    });

    setCurrentPlayer((prevPlayer) => (prevPlayer === "X" ? "O" : "X"));
  };

  const handleReset = () => {
    setCells(Array(9).fill(null));
    setCurrentPlayer("X");
  };

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center">
      <div className="mb-5 flex w-full flex-wrap items-center justify-between gap-3">
        <Chip tone={winner ? "accent" : "primary"}>{statusText}</Chip>
        <Button variant="secondary" onClick={handleReset}>
          New Round
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {cells.map((value, index) => {
          const isWinningCell = winner?.line.includes(index);
          return (
            <button
              key={index}
              type="button"
              onClick={() => handleCellClick(index)}
              className={`flex h-24 w-24 items-center justify-center rounded-xl border text-3xl font-bold transition-all duration-150 ease-game md:h-28 md:w-28 ${
                isWinningCell
                  ? "border-brand-primary bg-brand-primary/15 text-brand-primary shadow-glow"
                  : "border-brand-border bg-brand-panelSoft text-brand-text hover:border-brand-primary/60"
              }`}
              aria-label={`Cell ${index + 1}${value ? ` occupied by ${value}` : ""}`}
            >
              {value}
            </button>
          );
        })}
      </div>

      <p className="mt-5 text-center text-sm text-brand-muted">
        First to connect three symbols in a row, column, or diagonal wins.
      </p>
    </div>
  );
}

export default TicTacToeGame;
