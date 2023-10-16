import { useMemo, useState } from "react";
import Button from "../../components/ui/Button";
import Chip from "../../components/ui/Chip";

const ROWS = 10;
const COLS = 10;
const MINE_COUNT = 15;

function makeEmptyBoard() {
  return Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => ({
      isMine: false,
      isRevealed: false,
      isFlagged: false,
      adjacent: 0,
    }))
  );
}

function inBounds(row, col) {
  return row >= 0 && row < ROWS && col >= 0 && col < COLS;
}

function neighbors(row, col) {
  const result = [];
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      if (dr === 0 && dc === 0) continue;
      const nextRow = row + dr;
      const nextCol = col + dc;
      if (inBounds(nextRow, nextCol)) result.push([nextRow, nextCol]);
    }
  }
  return result;
}

function createBoard() {
  const board = makeEmptyBoard();
  let placed = 0;

  while (placed < MINE_COUNT) {
    const row = Math.floor(Math.random() * ROWS);
    const col = Math.floor(Math.random() * COLS);
    if (board[row][col].isMine) continue;
    board[row][col].isMine = true;
    placed += 1;
  }

  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      if (board[row][col].isMine) continue;
      board[row][col].adjacent = neighbors(row, col).reduce((count, [r, c]) => {
        return count + (board[r][c].isMine ? 1 : 0);
      }, 0);
    }
  }

  return board;
}

function cloneBoard(board) {
  return board.map((row) => row.map((cell) => ({ ...cell })));
}

function revealFlood(board, startRow, startCol) {
  const queue = [[startRow, startCol]];
  const visited = new Set();

  while (queue.length > 0) {
    const [row, col] = queue.shift();
    const key = `${row}:${col}`;
    if (visited.has(key)) continue;
    visited.add(key);

    const cell = board[row][col];
    if (cell.isRevealed || cell.isFlagged) continue;
    cell.isRevealed = true;

    if (cell.adjacent === 0 && !cell.isMine) {
      for (const [nr, nc] of neighbors(row, col)) {
        const next = board[nr][nc];
        if (!next.isMine && !next.isRevealed) {
          queue.push([nr, nc]);
        }
      }
    }
  }
}

function revealAllMines(board) {
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      if (board[row][col].isMine) {
        board[row][col].isRevealed = true;
      }
    }
  }
}

function hasWon(board) {
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const cell = board[row][col];
      if (!cell.isMine && !cell.isRevealed) return false;
    }
  }
  return true;
}

function MinesweeperGame({ vsAI = false }) {
  const [board, setBoard] = useState(() => createBoard());
  const [currentPlayer, setCurrentPlayer] = useState(1);
  const [loser, setLoser] = useState(null);
  const [isWin, setIsWin] = useState(false);

  const flagCount = useMemo(() => {
    return board.flat().filter((cell) => cell.isFlagged).length;
  }, [board]);

  const statusText = useMemo(() => {
    if (isWin) return "Minefield cleared!";
    if (loser) return vsAI ? "Boom! You hit a mine." : `Player ${loser} hit a mine — Player ${loser === 1 ? 2 : 1} wins!`;
    return vsAI ? "Reveal safe cells and mark mines" : `Player ${currentPlayer}'s turn — reveal a cell`;
  }, [currentPlayer, isWin, loser, vsAI]);

  const handleReveal = (row, col) => {
    if (loser || isWin) return;

    const nextBoard = cloneBoard(board);
    const target = nextBoard[row][col];
    if (target.isFlagged || target.isRevealed) return;

    if (target.isMine) {
      target.isRevealed = true;
      revealAllMines(nextBoard);
      setBoard(nextBoard);
      setLoser(vsAI ? 1 : currentPlayer);
      return;
    }

    revealFlood(nextBoard, row, col);
    const didWin = hasWon(nextBoard);
    setBoard(nextBoard);
    if (didWin) setIsWin(true);
    else if (!vsAI) setCurrentPlayer((p) => (p === 1 ? 2 : 1));
  };

  const handleToggleFlag = (event, row, col) => {
    event.preventDefault();
    if (loser || isWin) return;

    const nextBoard = cloneBoard(board);
    const target = nextBoard[row][col];
    if (target.isRevealed) return;
    target.isFlagged = !target.isFlagged;
    setBoard(nextBoard);
  };

  const handleReset = () => {
    setBoard(createBoard());
    setCurrentPlayer(1);
    setLoser(null);
    setIsWin(false);
  };

  return (
    <div className="w-full">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Chip tone={isWin ? "primary" : loser ? "accent" : "default"}>{statusText}</Chip>
        <div className="flex items-center gap-2">
          <Chip>Mines: {MINE_COUNT}</Chip>
          <Chip>Flags: {flagCount}</Chip>
          <Chip>Left: {Math.max(0, MINE_COUNT - flagCount)}</Chip>
          <Button variant="secondary" onClick={handleReset}>
            New Board
          </Button>
        </div>
      </div>

      <div className="mx-auto w-fit rounded-xl2 border border-brand-border bg-brand-panelSoft p-3">
        <div
          className="grid gap-1"
          style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
        >
          {board.map((row, rowIndex) =>
            row.map((cell, colIndex) => {
              let content = "";
              if (cell.isFlagged && !cell.isRevealed) content = "🚩";
              if (cell.isRevealed && cell.isMine) content = "💣";
              if (cell.isRevealed && !cell.isMine && cell.adjacent > 0) content = String(cell.adjacent);

              return (
                <button
                  key={`${rowIndex}-${colIndex}`}
                  type="button"
                  onClick={() => handleReveal(rowIndex, colIndex)}
                  onContextMenu={(event) => handleToggleFlag(event, rowIndex, colIndex)}
                  className={`flex h-9 w-9 items-center justify-center rounded-md border text-sm font-bold transition-colors ${
                    cell.isRevealed
                      ? cell.isMine
                        ? "border-rose-400/50 bg-rose-500/20 text-rose-200"
                        : "border-brand-border bg-brand-panel text-brand-text"
                      : "border-brand-border bg-[#111b3a] text-brand-muted hover:border-brand-primary/50"
                  }`}
                  aria-label={`Cell ${rowIndex + 1}-${colIndex + 1}`}
                >
                  {content}
                </button>
              );
            })
          )}
        </div>
      </div>

      <p className="mt-4 text-center text-sm text-brand-muted">
        {vsAI ? "Left click reveals cells. Right click toggles flags." : "Take turns revealing cells. Hit a mine and you lose."}
      </p>
    </div>
  );
}

export default MinesweeperGame;
