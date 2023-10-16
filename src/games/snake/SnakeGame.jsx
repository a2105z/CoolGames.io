import { useEffect, useMemo, useRef, useState } from "react";
import Button from "../../components/ui/Button";
import Chip from "../../components/ui/Chip";

const GRID_SIZE = 20;
const CELL_SIZE = 24;
const CANVAS_SIZE = GRID_SIZE * CELL_SIZE;
const TICK_MS = 110;

const INITIAL_SNAKE1 = [
  { x: 6, y: 10 },
  { x: 5, y: 10 },
  { x: 4, y: 10 },
];

const INITIAL_SNAKE2 = [
  { x: 13, y: 10 },
  { x: 14, y: 10 },
  { x: 15, y: 10 },
];

const DIRECTIONS_P1 = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
};

const DIRECTIONS_P2 = {
  KeyW: { x: 0, y: -1 },
  KeyS: { x: 0, y: 1 },
  KeyA: { x: -1, y: 0 },
  KeyD: { x: 1, y: 0 },
};

function isOppositeDirection(current, next) {
  return current.x + next.x === 0 && current.y + next.y === 0;
}

function randomFood(snake1, snake2) {
  const allParts = [...snake1, ...(snake2 || [])];
  while (true) {
    const candidate = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
    const isOnSnake = allParts.some((part) => part.x === candidate.x && part.y === candidate.y);
    if (!isOnSnake) return candidate;
  }
}

function SnakeGame({ vsAI = false }) {
  const canvasRef = useRef(null);
  const dir1Ref = useRef({ x: 1, y: 0 });
  const pending1Ref = useRef({ x: 1, y: 0 });
  const dir2Ref = useRef({ x: -1, y: 0 });
  const pending2Ref = useRef({ x: -1, y: 0 });
  const vsAIRef = useRef(vsAI);
  vsAIRef.current = vsAI;

  const [snake1, setSnake1] = useState(INITIAL_SNAKE1);
  const [snake2, setSnake2] = useState(INITIAL_SNAKE2);
  const [food, setFood] = useState(() => randomFood(INITIAL_SNAKE1, vsAI ? null : INITIAL_SNAKE2));
  const [winner, setWinner] = useState(null);
  const [isPaused, setIsPaused] = useState(false);

  const score1 = snake1.length - INITIAL_SNAKE1.length;
  const score2 = snake2.length - INITIAL_SNAKE2.length;

  const statusText = useMemo(() => {
    if (winner !== null) {
      if (vsAI) return "Game over";
      return winner === 0 ? "Draw! Both crashed." : `Player ${winner} wins!`;
    }
    if (isPaused) return "Paused";
    return vsAI ? "Arrows or WASD" : "P1: Arrows | P2: WASD";
  }, [winner, isPaused, vsAI]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.code === "Space") {
        event.preventDefault();
        setIsPaused((prev) => !prev);
        return;
      }
      const d1 = DIRECTIONS_P1[event.code];
      if (d1) {
        event.preventDefault();
        if (!isOppositeDirection(dir1Ref.current, d1)) pending1Ref.current = d1;
        return;
      }
      const d2 = DIRECTIONS_P2[event.code];
      if (d2) {
        event.preventDefault();
        if (vsAIRef.current) {
          if (!isOppositeDirection(dir1Ref.current, d2)) pending1Ref.current = d2;
        } else {
          if (!isOppositeDirection(dir2Ref.current, d2)) pending2Ref.current = d2;
        }
        return;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (winner !== null || isPaused) return undefined;

    const interval = window.setInterval(() => {
      dir1Ref.current = pending1Ref.current;
      if (!vsAIRef.current) dir2Ref.current = pending2Ref.current;

      setSnake1((s1) => {
        setSnake2((s2) => {
          const head1 = {
            x: s1[0].x + dir1Ref.current.x,
            y: s1[0].y + dir1Ref.current.y,
          };

          if (vsAIRef.current) {
            const p1HitsWall = head1.x < 0 || head1.x >= GRID_SIZE || head1.y < 0 || head1.y >= GRID_SIZE;
            const p1HitsSelf = s1.slice(1).some((p) => p.x === head1.x && p.y === head1.y);
            if (p1HitsWall || p1HitsSelf) {
              setWinner(0);
              return s2;
            }
            const p1Ate = head1.x === food.x && head1.y === food.y;
            let newS1 = [head1, ...s1];
            if (!p1Ate) newS1 = newS1.slice(0, -1);
            if (p1Ate) setFood(randomFood(newS1, null));
            setSnake1(newS1);
            return s2;
          }

          const head2 = {
            x: s2[0].x + dir2Ref.current.x,
            y: s2[0].y + dir2Ref.current.y,
          };
          const allBody1 = s1.slice(1);
          const allBody2 = s2.slice(1);
          const p1HitsWall = head1.x < 0 || head1.x >= GRID_SIZE || head1.y < 0 || head1.y >= GRID_SIZE;
          const p2HitsWall = head2.x < 0 || head2.x >= GRID_SIZE || head2.y < 0 || head2.y >= GRID_SIZE;
          const p1HitsSelf = allBody1.some((p) => p.x === head1.x && p.y === head1.y);
          const p2HitsSelf = allBody2.some((p) => p.x === head2.x && p.y === head2.y);
          const headCollision = head1.x === head2.x && head1.y === head2.y;
          const p1HitsP2 = allBody2.some((p) => p.x === head1.x && p.y === head1.y) || headCollision;
          const p2HitsP1 = allBody1.some((p) => p.x === head2.x && p.y === head2.y) || headCollision;

          const p1Dead = p1HitsWall || p1HitsSelf || p1HitsP2;
          const p2Dead = p2HitsWall || p2HitsSelf || p2HitsP1;

          if (p1Dead && p2Dead) {
            setWinner(0);
            return s2;
          }
          if (p1Dead) {
            setWinner(2);
            return s2;
          }
          if (p2Dead) {
            setWinner(1);
            return s2;
          }

          const p1Ate = head1.x === food.x && head1.y === food.y;
          const p2Ate = head2.x === food.x && head2.y === food.y;

          let newS1 = [head1, ...s1];
          let newS2 = [head2, ...s2];
          if (!p1Ate) newS1 = newS1.slice(0, -1);
          if (!p2Ate) newS2 = newS2.slice(0, -1);

          if (p1Ate || p2Ate) {
            setFood(randomFood(newS1, newS2));
          }

          setSnake1(newS1);
          return newS2;
        });
        return s1;
      });
    }, TICK_MS);

    return () => window.clearInterval(interval);
  }, [food.x, food.y, winner, isPaused]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    context.fillStyle = "#0b122a";
    context.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    context.strokeStyle = "#1d2b57";
    context.lineWidth = 1;
    for (let i = 1; i < GRID_SIZE; i += 1) {
      const position = i * CELL_SIZE;
      context.beginPath();
      context.moveTo(position, 0);
      context.lineTo(position, CANVAS_SIZE);
      context.stroke();
      context.beginPath();
      context.moveTo(0, position);
      context.lineTo(CANVAS_SIZE, position);
      context.stroke();
    }

    context.fillStyle = "#fb7185";
    context.fillRect(food.x * CELL_SIZE + 3, food.y * CELL_SIZE + 3, CELL_SIZE - 6, CELL_SIZE - 6);

    snake1.forEach((segment, index) => {
      const isHead = index === 0;
      context.fillStyle = isHead ? "#5eead4" : "#2dd4bf";
      context.fillRect(
        segment.x * CELL_SIZE + 2,
        segment.y * CELL_SIZE + 2,
        CELL_SIZE - 4,
        CELL_SIZE - 4
      );
    });
    if (!vsAI) {
      snake2.forEach((segment, index) => {
        const isHead = index === 0;
        context.fillStyle = isHead ? "#a78bfa" : "#8b5cf6";
        context.fillRect(
          segment.x * CELL_SIZE + 2,
          segment.y * CELL_SIZE + 2,
          CELL_SIZE - 4,
          CELL_SIZE - 4
        );
      });
    }
  }, [food.x, food.y, snake1, snake2, vsAI]);

  const handleReset = () => {
    dir1Ref.current = { x: 1, y: 0 };
    pending1Ref.current = { x: 1, y: 0 };
    dir2Ref.current = { x: -1, y: 0 };
    pending2Ref.current = { x: -1, y: 0 };
    setSnake1(INITIAL_SNAKE1);
    setSnake2(INITIAL_SNAKE2);
    setFood(randomFood(INITIAL_SNAKE1, vsAI ? null : INITIAL_SNAKE2));
    setWinner(null);
    setIsPaused(false);
  };

  return (
    <div className="w-full">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Chip tone={winner !== null ? "accent" : "primary"}>{statusText}</Chip>
        <div className="flex items-center gap-2">
          {vsAI ? (
            <Chip>Score: {score1}</Chip>
          ) : (
            <>
              <Chip>P1: {score1}</Chip>
              <Chip>P2: {score2}</Chip>
            </>
          )}
          <Button variant="secondary" onClick={() => setIsPaused((prev) => !prev)} disabled={winner !== null}>
            {isPaused ? "Resume" : "Pause"}
          </Button>
          <Button variant="secondary" onClick={handleReset}>
            Restart
          </Button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[560px] overflow-hidden rounded-xl2 border border-brand-border bg-brand-panelSoft p-4">
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="mx-auto h-auto w-full max-w-[500px]"
          aria-label="Snake game canvas"
        />
      </div>

      <p className="mt-4 text-center text-sm text-brand-muted">
        {vsAI ? "Arrows or WASD. Grow longer, avoid walls and yourself." : "P1: Arrows. P2: WASD. Last snake standing wins."}
      </p>
    </div>
  );
}

export default SnakeGame;
