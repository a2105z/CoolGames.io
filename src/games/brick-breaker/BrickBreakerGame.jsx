import { useEffect, useMemo, useRef, useState } from "react";
import Button from "../../components/ui/Button";
import Chip from "../../components/ui/Chip";

const WIDTH = 900;
const HEIGHT = 520;
const PADDLE_WIDTH = 128;
const PADDLE_HEIGHT = 14;
const PADDLE_SPEED = 520;
const BALL_SIZE = 12;
const BASE_BALL_SPEED = 290;
const MAX_LIVES = 3;

const LEVEL_LAYOUTS = [
  ["111111111111", "111111111111", "000111111000", "000111111000"],
  ["222222222222", "111111111111", "011111111110", "001111111100"],
  ["110011001100", "111111111111", "022002200220", "111111111111"],
  ["121212121212", "212121212121", "111111111111", "222222222222"],
  ["222002220022", "111111111111", "022220022220", "111111111111", "002222222200"],
  ["222222222222", "222222222222", "111111111111", "121212121212", "212121212121"],
  ["222222222222", "212121212121", "222222222222", "121212121212", "111111111111", "222222222222"],
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function intersects(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

function buildBricks(levelIndex) {
  const layout = LEVEL_LAYOUTS[levelIndex];
  const rows = layout.length;
  const cols = layout[0].length;
  const gap = 6;
  const paddingX = 48;
  const topOffset = 48;
  const totalGap = gap * (cols - 1);
  const brickWidth = (WIDTH - paddingX * 2 - totalGap) / cols;
  const brickHeight = 22;
  const bricks = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const token = layout[row][col];
      if (token === "0") continue;
      const hits = token === "2" ? 2 : 1;
      bricks.push({
        x: paddingX + col * (brickWidth + gap),
        y: topOffset + row * (brickHeight + gap),
        w: brickWidth,
        h: brickHeight,
        hits,
      });
    }
  }

  return bricks;
}

function createState(levelIndex = 0, score1 = 0, score2 = 0, lives1 = MAX_LIVES, lives2 = MAX_LIVES, currentPlayer = 1) {
  const centerPaddleX = WIDTH / 2 - PADDLE_WIDTH / 2;
  const ballSpeed = BASE_BALL_SPEED + levelIndex * 24;
  return {
    levelIndex,
    score1,
    score2,
    lives1,
    lives2,
    currentPlayer,
    paddleX: centerPaddleX,
    ballX: centerPaddleX + PADDLE_WIDTH / 2 - BALL_SIZE / 2,
    ballY: HEIGHT - 78,
    ballVX: ballSpeed * (Math.random() > 0.5 ? 1 : -1) * 0.72,
    ballVY: -ballSpeed,
    ballSpeed,
    serving: true,
    bricks: buildBricks(levelIndex),
    levelComplete: false,
    gameOver: false,
    victory: false,
    winner: null,
  };
}

function BrickBreakerGame({ vsAI = false }) {
  const canvasRef = useRef(null);
  const frameRef = useRef(0);
  const keysRef = useRef(new Set());
  const stateRef = useRef(createState());
  const vsAIRef = useRef(vsAI);
  vsAIRef.current = vsAI;

  const [hud, setHud] = useState({
    level: 1,
    totalLevels: LEVEL_LAYOUTS.length,
    score1: 0,
    score2: 0,
    lives1: MAX_LIVES,
    lives2: MAX_LIVES,
    currentPlayer: 1,
    serving: true,
    levelComplete: false,
    gameOver: false,
    victory: false,
    winner: null,
  });

  const statusText = useMemo(() => {
    if (hud.winner) return `Player ${hud.winner} wins!`;
    if (hud.victory) return "All levels cleared!";
    if (hud.gameOver) return "Game over";
    if (hud.levelComplete) return "Level cleared!";
    if (hud.serving) return vsAI ? "Press Space to launch" : `Player ${hud.currentPlayer} — Press Space to launch`;
    return vsAI ? "Break the bricks!" : `Player ${hud.currentPlayer}'s turn`;
  }, [hud.gameOver, hud.levelComplete, hud.serving, hud.victory, hud.winner, hud.currentPlayer, vsAI]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (["ArrowLeft", "ArrowRight", "KeyA", "KeyD", "Space"].includes(event.code)) {
        event.preventDefault();
      }
      keysRef.current.add(event.code);

      if (event.code === "Space") {
        const state = stateRef.current;
        if (state.serving && !state.gameOver && !state.victory && !state.levelComplete) {
          state.serving = false;
        }
      }
    };

    const onKeyUp = (event) => {
      keysRef.current.delete(event.code);
    };

    const onMouseMove = (event) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const state = stateRef.current;
      if (state.gameOver || state.victory || state.levelComplete) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = WIDTH / rect.width;
      const mouseX = (event.clientX - rect.left) * scaleX;
      state.paddleX = clamp(mouseX - PADDLE_WIDTH / 2, 0, WIDTH - PADDLE_WIDTH);
      if (state.serving) {
        state.ballX = state.paddleX + PADDLE_WIDTH / 2 - BALL_SIZE / 2;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("mousemove", onMouseMove);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return undefined;

    let previousTime = performance.now();

    const resetServe = () => {
      const state = stateRef.current;
      state.serving = true;
      state.ballX = state.paddleX + PADDLE_WIDTH / 2 - BALL_SIZE / 2;
      state.ballY = HEIGHT - 78;
      state.ballVX = state.ballSpeed * (Math.random() > 0.5 ? 1 : -1) * 0.72;
      state.ballVY = -state.ballSpeed;
    };

    const draw = () => {
      const state = stateRef.current;
      context.fillStyle = "#0b122a";
      context.fillRect(0, 0, WIDTH, HEIGHT);

      context.strokeStyle = "#2a3a77";
      context.lineWidth = 2;
      context.strokeRect(1, 1, WIDTH - 2, HEIGHT - 2);

      for (const brick of state.bricks) {
        context.fillStyle = brick.hits === 2 ? "#a78bfa" : "#5eead4";
        context.fillRect(brick.x, brick.y, brick.w, brick.h);
      }

      context.fillStyle = "#e8eeff";
      context.fillRect(state.paddleX, HEIGHT - 30, PADDLE_WIDTH, PADDLE_HEIGHT);

      context.fillStyle = "#fbbf24";
      context.fillRect(state.ballX, state.ballY, BALL_SIZE, BALL_SIZE);
    };

    const step = (timestamp) => {
      const dt = Math.min((timestamp - previousTime) / 1000, 0.033);
      previousTime = timestamp;
      const state = stateRef.current;

      if (!state.gameOver && !state.victory && !state.levelComplete) {
        const moveLeft = keysRef.current.has("ArrowLeft") || keysRef.current.has("KeyA");
        const moveRight = keysRef.current.has("ArrowRight") || keysRef.current.has("KeyD");
        if (moveLeft) state.paddleX -= PADDLE_SPEED * dt;
        if (moveRight) state.paddleX += PADDLE_SPEED * dt;
        state.paddleX = clamp(state.paddleX, 0, WIDTH - PADDLE_WIDTH);

        if (state.serving) {
          state.ballX = state.paddleX + PADDLE_WIDTH / 2 - BALL_SIZE / 2;
        } else {
          state.ballX += state.ballVX * dt;
          state.ballY += state.ballVY * dt;

          if (state.ballX <= 0) {
            state.ballX = 0;
            state.ballVX *= -1;
          }
          if (state.ballX + BALL_SIZE >= WIDTH) {
            state.ballX = WIDTH - BALL_SIZE;
            state.ballVX *= -1;
          }
          if (state.ballY <= 0) {
            state.ballY = 0;
            state.ballVY *= -1;
          }

          const paddle = { x: state.paddleX, y: HEIGHT - 30, w: PADDLE_WIDTH, h: PADDLE_HEIGHT };
          const ball = { x: state.ballX, y: state.ballY, w: BALL_SIZE, h: BALL_SIZE };
          if (intersects(ball, paddle) && state.ballVY > 0) {
            const impact = (state.ballX + BALL_SIZE / 2 - (state.paddleX + PADDLE_WIDTH / 2)) / (PADDLE_WIDTH / 2);
            state.ballVY = -Math.abs(state.ballVY);
            state.ballVX += impact * 140;
            state.ballX = clamp(state.ballX, 0, WIDTH - BALL_SIZE);
            state.ballSpeed = Math.min(640, Math.hypot(state.ballVX, state.ballVY) * 1.01);
          }

          for (let i = 0; i < state.bricks.length; i += 1) {
            const brick = state.bricks[i];
            if (!intersects(ball, brick)) continue;

            const overlapLeft = ball.x + ball.w - brick.x;
            const overlapRight = brick.x + brick.w - ball.x;
            const overlapTop = ball.y + ball.h - brick.y;
            const overlapBottom = brick.y + brick.h - ball.y;
            const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

            if (minOverlap === overlapLeft || minOverlap === overlapRight) {
              state.ballVX *= -1;
            } else {
              state.ballVY *= -1;
            }

            brick.hits -= 1;
            if (brick.hits <= 0) {
              if (vsAIRef.current) state.score1 += 10;
              else if (state.currentPlayer === 1) state.score1 += 10;
              else state.score2 += 10;
              state.bricks.splice(i, 1);
              i -= 1;
            } else {
              if (vsAIRef.current) state.score1 += 4;
              else if (state.currentPlayer === 1) state.score1 += 4;
              else state.score2 += 4;
            }
            break;
          }

          if (state.ballY > HEIGHT) {
            if (vsAIRef.current) {
              state.lives1 -= 1;
              if (state.lives1 <= 0) {
                state.gameOver = true;
              } else {
                resetServe();
              }
            } else if (state.currentPlayer === 1) {
              state.lives1 -= 1;
              if (state.lives1 <= 0) {
                state.gameOver = true;
                state.winner = 2;
              } else {
                state.currentPlayer = 2;
                resetServe();
              }
            } else {
              state.lives2 -= 1;
              if (state.lives2 <= 0) {
                state.gameOver = true;
                state.winner = 1;
              } else {
                state.currentPlayer = 1;
                resetServe();
              }
            }
          }

          if (state.bricks.length === 0) {
            if (state.levelIndex >= LEVEL_LAYOUTS.length - 1) {
              state.victory = true;
              if (!vsAIRef.current) state.winner = state.score1 >= state.score2 ? 1 : 2;
            } else {
              state.levelComplete = true;
              state.serving = true;
            }
          }
        }
      }

      draw();
      setHud({
        level: state.levelIndex + 1,
        totalLevels: LEVEL_LAYOUTS.length,
        score1: state.score1,
        score2: state.score2,
        lives1: state.lives1,
        lives2: state.lives2,
        currentPlayer: state.currentPlayer,
        serving: state.serving,
        levelComplete: state.levelComplete,
        gameOver: state.gameOver,
        victory: state.victory,
        winner: state.winner,
      });
      frameRef.current = requestAnimationFrame(step);
    };

    frameRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  const handleRestart = () => {
    stateRef.current = createState();
  };

  const handleNextLevel = () => {
    const state = stateRef.current;
    const nextLevel = state.levelIndex + 1;
    stateRef.current = createState(nextLevel, state.score1, state.score2, state.lives1, state.lives2, state.currentPlayer);
  };

  return (
    <div className="w-full">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Chip tone={hud.victory ? "primary" : hud.gameOver ? "accent" : "default"}>{statusText}</Chip>
        <div className="flex items-center gap-2">
          <Chip>
            Level: {hud.level}/{hud.totalLevels}
          </Chip>
          {vsAI ? (
            <>
              <Chip>Score: {hud.score1}</Chip>
              <Chip>Lives: {hud.lives1}♥</Chip>
            </>
          ) : (
            <>
              <Chip>P1: {hud.score1} ({hud.lives1}♥)</Chip>
              <Chip>P2: {hud.score2} ({hud.lives2}♥)</Chip>
            </>
          )}
          {hud.levelComplete ? (
            <Button variant="primary" onClick={handleNextLevel}>
              Next Level
            </Button>
          ) : null}
          <Button variant="secondary" onClick={handleRestart}>
            Restart Run
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl2 border border-brand-border bg-brand-panelSoft">
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          className="h-auto w-full"
          aria-label="Brick Breaker game canvas"
        />
      </div>

      <p className="mt-4 text-center text-sm text-brand-muted">
        {vsAI ? "Mouse or Arrow/A/D to move. Space launches. Clear all bricks!" : "Take turns. Lose the ball = lose a life, pass to other player."}
      </p>
    </div>
  );
}

export default BrickBreakerGame;
