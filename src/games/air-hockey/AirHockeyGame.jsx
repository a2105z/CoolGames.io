import { useEffect, useMemo, useRef, useState } from "react";
import Button from "../../components/ui/Button";
import Chip from "../../components/ui/Chip";

// Portrait orientation — like a real air hockey table viewed from the side
const WIDTH = 380;
const HEIGHT = 640;
const GOAL_WIDTH = 140;
const WIN_SCORE = 7;

const PUCK_RADIUS = 10;
const MALLET_RADIUS = 22;
const PLAYER_MAX_SPEED = 720;
const PUCK_MAX_SPEED = 680;
const FRICTION = 0.998; // Low friction — air cushion feel
const WALL_BOUNCE = 0.92; // Slight energy loss on walls
const MALLET_MASS = 2;
const PUCK_MASS = 1;
const IMPACT_STRENGTH = 1.15; // How much mallet velocity transfers

const BORDER_LEFT = 16;
const BORDER_RIGHT = WIDTH - 16;
const BORDER_TOP = 16;
const BORDER_BOTTOM = HEIGHT - 16;
const CORNER_RADIUS = 12;
const AI_MAX_SPEED = 420;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function distance(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

function createInitialState() {
  return {
    puckX: WIDTH / 2,
    puckY: HEIGHT / 2,
    puckVX: (Math.random() > 0.5 ? 1 : -1) * 160,
    puckVY: (Math.random() > 0.5 ? 1 : -1) * 140,
    player1X: WIDTH / 2,
    player1Y: HEIGHT - 85,
    player2X: WIDTH / 2,
    player2Y: 85,
    player1VX: 0,
    player1VY: 0,
    player2VX: 0,
    player2VY: 0,
    player1PrevX: WIDTH / 2,
    player1PrevY: HEIGHT - 85,
    player2PrevX: WIDTH / 2,
    player2PrevY: 85,
    player1Score: 0,
    player2Score: 0,
    winner: null,
  };
}

function AirHockeyGame({ vsAI = false }) {
  const canvasRef = useRef(null);
  const frameRef = useRef(0);
  const pointerRef = useRef({ x: WIDTH / 2, y: HEIGHT - 85 });
  const stateRef = useRef(createInitialState());
  const vsAIRef = useRef(vsAI);
  vsAIRef.current = vsAI;

  const [hud, setHud] = useState({
    player1Score: 0,
    player2Score: 0,
    winner: null,
  });

  const keysRef = useRef(new Set());

  const statusText = useMemo(() => {
    if (hud.winner === "player1") return vsAI ? "You win!" : "Player 1 wins!";
    if (hud.winner === "player2") return vsAI ? "AI wins!" : "Player 2 wins!";
    return "First to 7 goals";
  }, [hud.winner, vsAI]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const updatePointer = (clientX, clientY) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = WIDTH / rect.width;
      const scaleY = HEIGHT / rect.height;
      const x = (clientX - rect.left) * scaleX;
      const y = (clientY - rect.top) * scaleY;
      pointerRef.current = { x, y };
    };

    const onPointerMove = (event) => {
      updatePointer(event.clientX, event.clientY);
    };

    const onTouchMove = (event) => {
      if (!event.touches[0]) return;
      updatePointer(event.touches[0].clientX, event.touches[0].clientY);
    };

    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("touchmove", onTouchMove, { passive: true });

    return () => {
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("touchmove", onTouchMove);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "KeyA", "KeyD", "KeyW", "KeyS"].includes(e.code)) {
        e.preventDefault();
        keysRef.current.add(e.code);
      }
    };
    const onKeyUp = (e) => keysRef.current.delete(e.code);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return undefined;

    let previous = performance.now();

    const resetAfterGoal = (towardPlayer1) => {
      const s = stateRef.current;
      s.puckX = WIDTH / 2;
      s.puckY = HEIGHT / 2;
      s.puckVX = (Math.random() > 0.5 ? 1 : -1) * 150;
      s.puckVY = towardPlayer1 ? 180 : -180;
      s.player1X = WIDTH / 2;
      s.player1Y = HEIGHT - 85;
      s.player2X = WIDTH / 2;
      s.player2Y = 85;
    };

    const resolveMalletCollision = (malletX, malletY, malletVX, malletVY) => {
      const s = stateRef.current;
      const dist = distance(malletX, malletY, s.puckX, s.puckY);
      const minDist = MALLET_RADIUS + PUCK_RADIUS;
      if (dist >= minDist || dist === 0) return;

      const nx = (s.puckX - malletX) / dist;
      const ny = (s.puckY - malletY) / dist;

      // Push puck outside overlap
      const overlap = minDist - dist;
      s.puckX += nx * overlap;
      s.puckY += ny * overlap;

      // Physics: transfer momentum from mallet to puck
      // Relative velocity along impact normal
      const relV = (s.puckVX - malletVX) * nx + (s.puckVY - malletVY) * ny;
      const impulse = (1 + 0.85) * relV / (1 / PUCK_MASS + 1 / MALLET_MASS);
      const malletTransfer = IMPACT_STRENGTH * (malletVX * nx + malletVY * ny);

      const newVX = s.puckVX - impulse * nx / PUCK_MASS + malletTransfer * nx;
      const newVY = s.puckVY - impulse * ny / PUCK_MASS + malletTransfer * ny;

      const speed = Math.hypot(newVX, newVY);
      const capped = Math.min(speed, PUCK_MAX_SPEED);
      if (speed > 0) {
        const k = capped / speed;
        s.puckVX = newVX * k;
        s.puckVY = newVY * k;
      }
    };

    const drawRink = () => {
      const w = WIDTH;
      const h = HEIGHT;

      // Outer frame — dark metallic
      ctx.fillStyle = "#1a1f2e";
      ctx.beginPath();
      ctx.roundRect(0, 0, w, h, CORNER_RADIUS + 4);
      ctx.fill();

      // Inner playing surface — white/light gray like real air hockey
      ctx.fillStyle = "#e8ecf4";
      ctx.beginPath();
      ctx.roundRect(8, 8, w - 16, h - 16, CORNER_RADIUS);
      ctx.fill();

      // Subtle surface texture
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.fillRect(BORDER_LEFT, BORDER_TOP, BORDER_RIGHT - BORDER_LEFT, BORDER_BOTTOM - BORDER_TOP);

      // Wall borders — dark blue-gray
      ctx.strokeStyle = "#2d3548";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(BORDER_LEFT, BORDER_TOP, BORDER_RIGHT - BORDER_LEFT, BORDER_BOTTOM - BORDER_TOP, CORNER_RADIUS - 4);
      ctx.stroke();

      // Center line
      ctx.strokeStyle = "#4a5568";
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(BORDER_LEFT, h / 2);
      ctx.lineTo(BORDER_RIGHT, h / 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Center face-off circle
      ctx.strokeStyle = "#4a5568";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, 36, 0, Math.PI * 2);
      ctx.stroke();

      // Goal slots — recessed look
      const goalLeft = w / 2 - GOAL_WIDTH / 2;
      const goalRight = w / 2 + GOAL_WIDTH / 2;

      ctx.fillStyle = "#1a1f2e";
      ctx.fillRect(goalLeft - 4, 0, GOAL_WIDTH + 8, BORDER_TOP + 8);
      ctx.fillRect(goalLeft - 4, BORDER_BOTTOM - 8, GOAL_WIDTH + 8, 12);

      ctx.fillStyle = "#cbd5e1";
      ctx.fillRect(goalLeft, BORDER_TOP, GOAL_WIDTH, 6);
      ctx.fillRect(goalLeft, BORDER_BOTTOM - 6, GOAL_WIDTH, 6);
    };

    const drawObjects = () => {
      const s = stateRef.current;

      // Puck — glossy with shadow
      const puckGrad = ctx.createRadialGradient(
        s.puckX - 3, s.puckY - 3, 0,
        s.puckX, s.puckY, PUCK_RADIUS
      );
      puckGrad.addColorStop(0, "#ffffff");
      puckGrad.addColorStop(0.5, "#e2e8f0");
      puckGrad.addColorStop(1, "#94a3b8");
      ctx.fillStyle = puckGrad;
      ctx.beginPath();
      ctx.arc(s.puckX, s.puckY, PUCK_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.15)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Player 2 mallet (top) — red/orange
      const m2Grad = ctx.createRadialGradient(
        s.player2X - 6, s.player2Y - 6, 0,
        s.player2X, s.player2Y, MALLET_RADIUS
      );
      m2Grad.addColorStop(0, "#fca5a5");
      m2Grad.addColorStop(0.6, "#ef4444");
      m2Grad.addColorStop(1, "#b91c1c");
      ctx.fillStyle = m2Grad;
      ctx.beginPath();
      ctx.arc(s.player2X, s.player2Y, MALLET_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#7f1d1d";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Player 1 mallet (bottom) — blue/cyan
      const m1Grad = ctx.createRadialGradient(
        s.player1X - 6, s.player1Y - 6, 0,
        s.player1X, s.player1Y, MALLET_RADIUS
      );
      m1Grad.addColorStop(0, "#67e8f9");
      m1Grad.addColorStop(0.6, "#06b6d4");
      m1Grad.addColorStop(1, "#0891b2");
      ctx.fillStyle = m1Grad;
      ctx.beginPath();
      ctx.arc(s.player1X, s.player1Y, MALLET_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#0e7490";
      ctx.lineWidth = 2;
      ctx.stroke();
    };

    const tick = (now) => {
      const dt = Math.min((now - previous) / 1000, 0.033);
      previous = now;
      const s = stateRef.current;

      if (!s.winner) {
        // Store previous positions for velocity
        s.player1PrevX = s.player1X;
        s.player1PrevY = s.player1Y;
        s.player2PrevX = s.player2X;
        s.player2PrevY = s.player2Y;

        // Player 1 movement toward pointer
        const targetX = clamp(pointerRef.current.x, BORDER_LEFT + MALLET_RADIUS, BORDER_RIGHT - MALLET_RADIUS);
        const targetY = clamp(pointerRef.current.y, HEIGHT / 2 + MALLET_RADIUS, BORDER_BOTTOM - MALLET_RADIUS);
        const pdx = targetX - s.player1X;
        const pdy = targetY - s.player1Y;
        const pDist = Math.hypot(pdx, pdy);
        if (pDist > 0) {
          const maxStep = PLAYER_MAX_SPEED * dt;
          const scale = Math.min(1, maxStep / pDist);
          s.player1X += pdx * scale;
          s.player1Y += pdy * scale;
        }
        s.player1VX = (s.player1X - s.player1PrevX) / (dt || 0.016);
        s.player1VY = (s.player1Y - s.player1PrevY) / (dt || 0.016);
        const mv1 = Math.hypot(s.player1VX, s.player1VY);
        if (mv1 > PLAYER_MAX_SPEED) {
          const k = PLAYER_MAX_SPEED / mv1;
          s.player1VX *= k;
          s.player1VY *= k;
        }

        // Player 2 movement: AI or keyboard
        if (vsAIRef.current) {
          const aiTargetX = clamp(s.puckX, BORDER_LEFT + MALLET_RADIUS, BORDER_RIGHT - MALLET_RADIUS);
          const aiTargetY = clamp(s.puckY < HEIGHT / 2 ? s.puckY : HEIGHT / 2 - 60, BORDER_TOP + MALLET_RADIUS, HEIGHT / 2 - MALLET_RADIUS);
          const adx = aiTargetX - s.player2X;
          const ady = aiTargetY - s.player2Y;
          const aDist = Math.hypot(adx, ady);
          if (aDist > 0) {
            const maxStep = AI_MAX_SPEED * dt;
            const scale = Math.min(1, maxStep / aDist);
            s.player2X += adx * scale;
            s.player2Y += ady * scale;
          }
        } else {
          const keys = keysRef.current;
          let p2dx = 0, p2dy = 0;
          if (keys.has("ArrowLeft") || keys.has("KeyA")) p2dx -= 1;
          if (keys.has("ArrowRight") || keys.has("KeyD")) p2dx += 1;
          if (keys.has("ArrowUp") || keys.has("KeyW")) p2dy -= 1;
          if (keys.has("ArrowDown") || keys.has("KeyS")) p2dy += 1;
          if (p2dx !== 0 || p2dy !== 0) {
            const len = Math.hypot(p2dx, p2dy) || 1;
            p2dx /= len;
            p2dy /= len;
            const maxStep = PLAYER_MAX_SPEED * dt;
            s.player2X = clamp(s.player2X + p2dx * maxStep, BORDER_LEFT + MALLET_RADIUS, BORDER_RIGHT - MALLET_RADIUS);
            s.player2Y = clamp(s.player2Y + p2dy * maxStep, BORDER_TOP + MALLET_RADIUS, HEIGHT / 2 - MALLET_RADIUS);
          }
        }
        s.player2VX = (s.player2X - s.player2PrevX) / (dt || 0.016);
        s.player2VY = (s.player2Y - s.player2PrevY) / (dt || 0.016);
        const mv2 = Math.hypot(s.player2VX, s.player2VY);
        if (mv2 > PLAYER_MAX_SPEED) {
          const k = PLAYER_MAX_SPEED / mv2;
          s.player2VX *= k;
          s.player2VY *= k;
        }

        // Puck movement with low friction
        s.puckX += s.puckVX * dt;
        s.puckY += s.puckVY * dt;
        s.puckVX *= FRICTION;
        s.puckVY *= FRICTION;

        const puckSpeed = Math.hypot(s.puckVX, s.puckVY);
        if (puckSpeed > PUCK_MAX_SPEED) {
          const k = PUCK_MAX_SPEED / puckSpeed;
          s.puckVX *= k;
          s.puckVY *= k;
        }

        // Side walls with energy loss
        if (s.puckX - PUCK_RADIUS <= BORDER_LEFT) {
          s.puckX = BORDER_LEFT + PUCK_RADIUS;
          s.puckVX = Math.abs(s.puckVX) * WALL_BOUNCE;
        }
        if (s.puckX + PUCK_RADIUS >= BORDER_RIGHT) {
          s.puckX = BORDER_RIGHT - PUCK_RADIUS;
          s.puckVX = -Math.abs(s.puckVX) * WALL_BOUNCE;
        }

        // Top/bottom with goal gap
        const goalLeft = WIDTH / 2 - GOAL_WIDTH / 2;
        const goalRight = WIDTH / 2 + GOAL_WIDTH / 2;
        const inGoalX = s.puckX >= goalLeft && s.puckX <= goalRight;

        if (s.puckY - PUCK_RADIUS <= BORDER_TOP) {
          if (inGoalX) {
            s.player1Score += 1;
            if (s.player1Score >= WIN_SCORE) s.winner = "player1";
            resetAfterGoal(false);
          } else {
            s.puckY = BORDER_TOP + PUCK_RADIUS;
            s.puckVY = Math.abs(s.puckVY) * WALL_BOUNCE;
          }
        }
        if (s.puckY + PUCK_RADIUS >= BORDER_BOTTOM) {
          if (inGoalX) {
            s.player2Score += 1;
            if (s.player2Score >= WIN_SCORE) s.winner = "player2";
            resetAfterGoal(true);
          } else {
            s.puckY = BORDER_BOTTOM - PUCK_RADIUS;
            s.puckVY = -Math.abs(s.puckVY) * WALL_BOUNCE;
          }
        }

        resolveMalletCollision(s.player1X, s.player1Y, s.player1VX, s.player1VY);
        resolveMalletCollision(s.player2X, s.player2Y, s.player2VX, s.player2VY);
      }

      drawRink();
      drawObjects();

      setHud({
        player1Score: s.player1Score,
        player2Score: s.player2Score,
        winner: s.winner,
      });
      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  const handleRestart = () => {
    stateRef.current = createInitialState();
    setHud({
      player1Score: 0,
      player2Score: 0,
      winner: null,
    });
  };

  return (
    <div className="mx-auto w-full max-w-[400px]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Chip tone={hud.winner ? "accent" : "primary"}>{statusText}</Chip>
        <div className="flex items-center gap-2">
          <Chip>{vsAI ? "You" : "P1"}: {hud.player1Score}</Chip>
          <Chip>{vsAI ? "AI" : "P2"}: {hud.player2Score}</Chip>
          <Button variant="secondary" onClick={handleRestart}>
            Restart
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border-2 border-slate-700/50 bg-slate-800/30 shadow-xl">
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          className="mx-auto block h-auto w-full max-w-[380px] touch-none"
          style={{ aspectRatio: `${WIDTH} / ${HEIGHT}` }}
          aria-label="Air Hockey game canvas"
        />
      </div>

      <p className="mt-4 text-center text-sm text-brand-muted">
        {vsAI ? "Mouse/touch to move. Defend bottom goal." : "P1: mouse/touch (bottom). P2: Arrow keys or WASD (top)."}
      </p>
    </div>
  );
}

export default AirHockeyGame;
