import { useEffect, useMemo, useRef, useState } from "react";
import Button from "../../components/ui/Button";
import Chip from "../../components/ui/Chip";

const WIDTH = 900;
const HEIGHT = 520;
const PADDLE_WIDTH = 14;
const PADDLE_HEIGHT = 96;
const PADDLE_SPEED = 360;
const BALL_SIZE = 14;
const BALL_BASE_SPEED = 300;
const WIN_SCORE = 7;

function randomDirection() {
  const angle = (Math.random() * Math.PI) / 3 - Math.PI / 6;
  const horizontal = Math.random() > 0.5 ? 1 : -1;
  return {
    x: Math.cos(angle) * horizontal,
    y: Math.sin(angle),
  };
}

function createInitialState() {
  const dir = randomDirection();
  return {
    leftY: HEIGHT / 2 - PADDLE_HEIGHT / 2,
    rightY: HEIGHT / 2 - PADDLE_HEIGHT / 2,
    ballX: WIDTH / 2 - BALL_SIZE / 2,
    ballY: HEIGHT / 2 - BALL_SIZE / 2,
    ballVX: dir.x * BALL_BASE_SPEED,
    ballVY: dir.y * BALL_BASE_SPEED,
    leftScore: 0,
    rightScore: 0,
    winner: null,
  };
}

const AI_SPEED = 380;

function PongGame({ vsAI = false }) {
  const canvasRef = useRef(null);
  const frameRef = useRef(0);
  const keysRef = useRef(new Set());
  const stateRef = useRef(createInitialState());
  const vsAIRef = useRef(vsAI);
  vsAIRef.current = vsAI;
  const [hudState, setHudState] = useState({
    leftScore: 0,
    rightScore: 0,
    winner: null,
  });

  const statusText = useMemo(() => {
    if (hudState.winner === "left") return vsAI ? "You win!" : "Left player wins!";
    if (hudState.winner === "right") return vsAI ? "AI wins!" : "Right player wins!";
    return "First to 7 points wins";
  }, [hudState.winner, vsAI]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (["KeyW", "KeyS", "ArrowUp", "ArrowDown"].includes(event.code)) {
        event.preventDefault();
      }
      keysRef.current.add(event.code);
    };

    const onKeyUp = (event) => {
      keysRef.current.delete(event.code);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return undefined;

    let previousTime = performance.now();

    const resetBall = (direction) => {
      const nextDirection = randomDirection();
      stateRef.current.ballX = WIDTH / 2 - BALL_SIZE / 2;
      stateRef.current.ballY = HEIGHT / 2 - BALL_SIZE / 2;
      stateRef.current.ballVX =
        Math.abs(nextDirection.x * BALL_BASE_SPEED) * direction;
      stateRef.current.ballVY = nextDirection.y * BALL_BASE_SPEED;
    };

    const draw = () => {
      context.fillStyle = "#0b122a";
      context.fillRect(0, 0, WIDTH, HEIGHT);

      context.strokeStyle = "#2a3a77";
      context.lineWidth = 2;
      context.strokeRect(1, 1, WIDTH - 2, HEIGHT - 2);

      context.setLineDash([12, 12]);
      context.strokeStyle = "#334d95";
      context.beginPath();
      context.moveTo(WIDTH / 2, 0);
      context.lineTo(WIDTH / 2, HEIGHT);
      context.stroke();
      context.setLineDash([]);

      const s = stateRef.current;
      context.fillStyle = "#5eead4";
      context.fillRect(30, s.leftY, PADDLE_WIDTH, PADDLE_HEIGHT);
      context.fillRect(WIDTH - 30 - PADDLE_WIDTH, s.rightY, PADDLE_WIDTH, PADDLE_HEIGHT);

      context.fillStyle = "#e8eeff";
      context.fillRect(s.ballX, s.ballY, BALL_SIZE, BALL_SIZE);
    };

    const step = (timestamp) => {
      const dt = Math.min((timestamp - previousTime) / 1000, 0.033);
      previousTime = timestamp;
      const state = stateRef.current;

      if (!state.winner) {
        if (keysRef.current.has("KeyW")) {
          state.leftY -= PADDLE_SPEED * dt;
        }
        if (keysRef.current.has("KeyS")) {
          state.leftY += PADDLE_SPEED * dt;
        }
        if (vsAIRef.current) {
          const targetY = state.ballY + BALL_SIZE / 2 - PADDLE_HEIGHT / 2;
          const diff = targetY - state.rightY;
          const step = Math.sign(diff) * Math.min(Math.abs(diff), AI_SPEED * dt);
          state.rightY += step;
        } else {
          if (keysRef.current.has("ArrowUp")) state.rightY -= PADDLE_SPEED * dt;
          if (keysRef.current.has("ArrowDown")) state.rightY += PADDLE_SPEED * dt;
        }

        state.leftY = Math.max(0, Math.min(HEIGHT - PADDLE_HEIGHT, state.leftY));
        state.rightY = Math.max(0, Math.min(HEIGHT - PADDLE_HEIGHT, state.rightY));

        state.ballX += state.ballVX * dt;
        state.ballY += state.ballVY * dt;

        if (state.ballY <= 0) {
          state.ballY = 0;
          state.ballVY *= -1;
        }
        if (state.ballY + BALL_SIZE >= HEIGHT) {
          state.ballY = HEIGHT - BALL_SIZE;
          state.ballVY *= -1;
        }

        const leftPaddleX = 30;
        const rightPaddleX = WIDTH - 30 - PADDLE_WIDTH;

        const intersectsLeft =
          state.ballX <= leftPaddleX + PADDLE_WIDTH &&
          state.ballX + BALL_SIZE >= leftPaddleX &&
          state.ballY + BALL_SIZE >= state.leftY &&
          state.ballY <= state.leftY + PADDLE_HEIGHT;

        const intersectsRight =
          state.ballX + BALL_SIZE >= rightPaddleX &&
          state.ballX <= rightPaddleX + PADDLE_WIDTH &&
          state.ballY + BALL_SIZE >= state.rightY &&
          state.ballY <= state.rightY + PADDLE_HEIGHT;

        if (intersectsLeft && state.ballVX < 0) {
          const impact = (state.ballY + BALL_SIZE / 2 - (state.leftY + PADDLE_HEIGHT / 2)) / (PADDLE_HEIGHT / 2);
          state.ballVX = Math.abs(state.ballVX) * 1.04;
          state.ballVY += impact * 160;
          state.ballX = leftPaddleX + PADDLE_WIDTH;
        }

        if (intersectsRight && state.ballVX > 0) {
          const impact = (state.ballY + BALL_SIZE / 2 - (state.rightY + PADDLE_HEIGHT / 2)) / (PADDLE_HEIGHT / 2);
          state.ballVX = -Math.abs(state.ballVX) * 1.04;
          state.ballVY += impact * 160;
          state.ballX = rightPaddleX - BALL_SIZE;
        }

        if (state.ballX + BALL_SIZE < 0) {
          state.rightScore += 1;
          if (state.rightScore >= WIN_SCORE) {
            state.winner = "right";
          } else {
            resetBall(1);
          }
        }

        if (state.ballX > WIDTH) {
          state.leftScore += 1;
          if (state.leftScore >= WIN_SCORE) {
            state.winner = "left";
          } else {
            resetBall(-1);
          }
        }
      }

      draw();
      setHudState({
        leftScore: state.leftScore,
        rightScore: state.rightScore,
        winner: state.winner,
      });
      frameRef.current = requestAnimationFrame(step);
    };

    frameRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  const handleReset = () => {
    stateRef.current = createInitialState();
    setHudState({
      leftScore: 0,
      rightScore: 0,
      winner: null,
    });
  };

  return (
    <div className="w-full">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Chip tone={hudState.winner ? "accent" : "primary"}>{statusText}</Chip>
        <div className="flex items-center gap-2">
          <Chip>{vsAI ? "You" : "Left"}: {hudState.leftScore}</Chip>
          <Chip>{vsAI ? "AI" : "Right"}: {hudState.rightScore}</Chip>
          <Button variant="secondary" onClick={handleReset}>
            Restart
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl2 border border-brand-border bg-brand-panelSoft">
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          className="h-auto w-full"
          aria-label="Pong game canvas"
        />
      </div>
    </div>
  );
}

export default PongGame;
