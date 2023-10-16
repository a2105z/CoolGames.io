import { useEffect, useMemo, useState } from "react";
import Button from "../../components/ui/Button";
import Chip from "../../components/ui/Chip";

const SIZE = 4;
const TARGET_TILE = 2048;

function emptyBoard() {
  return Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, () => 0));
}

function randomEmptyCell(board) {
  const empties = [];
  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      if (board[row][col] === 0) empties.push([row, col]);
    }
  }
  if (empties.length === 0) return null;
  return empties[Math.floor(Math.random() * empties.length)];
}

function addRandomTile(board) {
  const spot = randomEmptyCell(board);
  if (!spot) return board;
  const [row, col] = spot;
  const next = board.map((r) => [...r]);
  next[row][col] = Math.random() < 0.9 ? 2 : 4;
  return next;
}

function boardsEqual(a, b) {
  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      if (a[row][col] !== b[row][col]) return false;
    }
  }
  return true;
}

function rotateClockwise(board) {
  const next = emptyBoard();
  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      next[col][SIZE - 1 - row] = board[row][col];
    }
  }
  return next;
}

function rotateTimes(board, count) {
  let next = board.map((row) => [...row]);
  for (let i = 0; i < count; i += 1) {
    next = rotateClockwise(next);
  }
  return next;
}

function slideLeft(board) {
  const next = board.map((row) => [...row]);
  let gained = 0;

  for (let row = 0; row < SIZE; row += 1) {
    const filtered = next[row].filter((n) => n !== 0);
    const merged = [];
    for (let i = 0; i < filtered.length; i += 1) {
      if (filtered[i] !== 0 && filtered[i] === filtered[i + 1]) {
        const value = filtered[i] * 2;
        merged.push(value);
        gained += value;
        i += 1;
      } else {
        merged.push(filtered[i]);
      }
    }
    while (merged.length < SIZE) merged.push(0);
    next[row] = merged;
  }

  return { board: next, gained };
}

function hasMoves(board) {
  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      const value = board[row][col];
      if (value === 0) return true;
      if (row + 1 < SIZE && board[row + 1][col] === value) return true;
      if (col + 1 < SIZE && board[row][col + 1] === value) return true;
    }
  }
  return false;
}

function initialState(vsAI = false) {
  let board = emptyBoard();
  board = addRandomTile(board);
  board = addRandomTile(board);
  return {
    board,
    score1: 0,
    score2: 0,
    currentPlayer: 1,
    won: false,
    over: false,
    vsAI,
  };
}

const TILE_STYLES = {
  0: "bg-[#111b3a] text-brand-muted/50",
  2: "bg-[#c7f9f0] text-slate-900",
  4: "bg-[#99f6e4] text-slate-900",
  8: "bg-[#5eead4] text-slate-900",
  16: "bg-[#2dd4bf] text-slate-900",
  32: "bg-[#22d3ee] text-slate-900",
  64: "bg-[#38bdf8] text-slate-900",
  128: "bg-[#60a5fa] text-white",
  256: "bg-[#818cf8] text-white",
  512: "bg-[#a78bfa] text-white",
  1024: "bg-[#c084fc] text-white",
  2048: "bg-[#e879f9] text-white",
};

function Game2048({ vsAI = false }) {
  const [state, setState] = useState(() => initialState(vsAI));

  const winner = useMemo(() => {
    if (!state.over || state.vsAI) return null;
    return state.score1 >= state.score2 ? 1 : 2;
  }, [state.over, state.score1, state.score2, state.vsAI]);

  const statusText = useMemo(() => {
    if (state.over) return state.vsAI ? "No moves left" : (winner ? `Player ${winner} wins!` : "No moves left — draw!");
    if (state.won) return "2048 reached!";
    return state.vsAI ? "Combine tiles to reach 2048" : `Player ${state.currentPlayer}'s turn — combine tiles`;
  }, [state.over, state.won, state.currentPlayer, state.vsAI, winner]);

  const performMove = (direction) => {
    if (state.over) return;

    const rotations = {
      left: 0,
      up: 3,
      right: 2,
      down: 1,
    };

    const rotateIn = rotations[direction];
    const rotated = rotateTimes(state.board, rotateIn);
    const { board: slid, gained } = slideLeft(rotated);
    const unrotated = rotateTimes(slid, (4 - rotateIn) % 4);

    if (boardsEqual(state.board, unrotated)) return;

    const withNewTile = addRandomTile(unrotated);
    const won = state.won || withNewTile.flat().some((cell) => cell >= TARGET_TILE);
    const over = !hasMoves(withNewTile);
    const nextPlayer = state.currentPlayer === 1 ? 2 : 1;

    setState((prev) => ({
      ...prev,
      board: withNewTile,
      score1: prev.vsAI ? prev.score1 + gained : (prev.currentPlayer === 1 ? prev.score1 + gained : prev.score1),
      score2: prev.vsAI ? prev.score2 : (prev.currentPlayer === 2 ? prev.score2 + gained : prev.score2),
      currentPlayer: nextPlayer,
      won,
      over,
    }));
  };

  useEffect(() => {
    const keyMap = {
      ArrowLeft: "left",
      ArrowUp: "up",
      ArrowRight: "right",
      ArrowDown: "down",
      KeyA: "left",
      KeyW: "up",
      KeyD: "right",
      KeyS: "down",
    };

    const onKeyDown = (event) => {
      const direction = keyMap[event.code];
      if (!direction) return;
      event.preventDefault();
      performMove(direction);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  useEffect(() => {
    setState(initialState(vsAI));
  }, [vsAI]);

  const handleRestart = () => setState(initialState(vsAI));

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Chip tone={state.over ? "accent" : state.won ? "primary" : "default"}>{statusText}</Chip>
        <div className="flex items-center gap-2">
          {vsAI ? (
            <Chip>Score: {state.score1}</Chip>
          ) : (
            <>
              <Chip>P1: {state.score1}</Chip>
              <Chip>P2: {state.score2}</Chip>
            </>
          )}
          <Button variant="secondary" onClick={handleRestart}>
            Restart
          </Button>
        </div>
      </div>

      <div className="rounded-xl2 border border-brand-border bg-brand-panelSoft p-3 md:p-4">
        <div className="grid grid-cols-4 gap-2 md:gap-3">
          {state.board.flat().map((value, index) => (
            <div
              key={index}
              className={`flex aspect-square items-center justify-center rounded-lg border border-brand-border text-2xl font-bold md:text-3xl ${TILE_STYLES[value] ?? "bg-[#f472b6] text-white"}`}
            >
              {value === 0 ? "" : value}
            </div>
          ))}
        </div>
      </div>

      <p className="mt-4 text-center text-sm text-brand-muted">
        {vsAI ? "Arrow keys or WASD. Combine tiles to reach 2048." : "Take turns — highest score when no moves left wins."}
      </p>
    </div>
  );
}

export default Game2048;
