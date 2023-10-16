import { useCallback, useEffect, useRef, useState } from "react";
import Button from "../../components/ui/Button";
import Chip from "../../components/ui/Chip";
import {
  CELL, BOARD_OX, BOARD_OY, CANVAS_W, CANVAS_H,
  HOME_BASES, PLAYER_COLORS,
} from "./constants";
import {
  createGameState, rollDice,
  getMovableTokens, executeMove, getTokenBoardPos,
} from "./engine";
import { drawScene } from "./renderer";

function LudoGame() {
  const canvasRef = useRef(null);
  const [state, setState] = useState(createGameState);
  const [movableIds, setMovableIds] = useState([]);
  const [rolling, setRolling] = useState(false);

  // Redraw whenever state changes
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    drawScene(ctx, state, movableIds, rolling);
  }, [state, movableIds, rolling]);

  const handleRoll = useCallback(() => {
    if (state.turnPhase !== "roll" || state.winner || rolling) return;

    setRolling(true);

    // Short animation delay
    setTimeout(() => {
      const dice = rollDice();
      const movable = getMovableTokens(state, dice);

      if (movable.length === 0) {
        // No moves available — skip turn
        const playerName =
          state.currentPlayer.charAt(0).toUpperCase() + state.currentPlayer.slice(1);
        const nextPlayerIdx =
          (["red", "green", "yellow", "blue"].indexOf(state.currentPlayer) + 1) % 4;
        const nextPlayer = ["red", "green", "yellow", "blue"][nextPlayerIdx];
        const nextName = nextPlayer.charAt(0).toUpperCase() + nextPlayer.slice(1);

        setState((prev) => ({
          ...prev,
          diceValue: dice,
          diceRolled: true,
          turnPhase: "roll",
          currentPlayer: nextPlayer,
          consecutiveSixes: 0,
          message: `${playerName} rolled ${dice} — no moves. ${nextName} rolls.`,
        }));
        setMovableIds([]);
      } else if (movable.length === 1) {
        // Auto-move the only option
        const nextState = executeMove(state, movable[0], dice);
        setState({ ...nextState, diceValue: dice });
        setMovableIds([]);
      } else {
        // Multiple options — player picks
        setState((prev) => ({
          ...prev,
          diceValue: dice,
          diceRolled: true,
          turnPhase: "move",
          message: `${prev.currentPlayer.charAt(0).toUpperCase() + prev.currentPlayer.slice(1)} rolled ${dice} — pick a token`,
        }));
        setMovableIds(movable);
      }
      setRolling(false);
    }, 400);
  }, [state, rolling]);

  const getCanvasCoords = useCallback((event) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const clientX = event.clientX ?? event.touches?.[0]?.clientX ?? event.changedTouches?.[0]?.clientX;
    const clientY = event.clientY ?? event.touches?.[0]?.clientY ?? event.changedTouches?.[0]?.clientY;
    if (clientX == null || clientY == null) return null;
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }, []);

  const handleCanvasClick = useCallback(
    (event) => {
      if (state.turnPhase !== "move" || state.winner) return;

      const coords = getCanvasCoords(event);
      if (!coords) return;
      const clickX = coords.x;
      const clickY = coords.y;

      // Find which movable token was clicked
      const player = state.currentPlayer;
      const playerTokens = state.tokens[player];

      for (const tokenId of movableIds) {
        const token = playerTokens[tokenId];
        let tokenCX, tokenCY;

        if (token.state === "home") {
          const [r, c] = HOME_BASES[player][token.id];
          tokenCX = BOARD_OX + c * CELL + CELL / 2;
          tokenCY = BOARD_OY + r * CELL + CELL / 2;
        } else {
          const pos = getTokenBoardPos(token);
          if (!pos) continue;
          tokenCX = BOARD_OX + pos[1] * CELL + CELL / 2;
          tokenCY = BOARD_OY + pos[0] * CELL + CELL / 2;
        }

        const dist = Math.hypot(clickX - tokenCX, clickY - tokenCY);
        if (dist <= CELL * 0.85) {
          const nextState = executeMove(state, tokenId, state.diceValue);
          setState({ ...nextState, diceValue: state.diceValue });
          setMovableIds([]);
          return;
        }
      }
    },
    [state, movableIds, getCanvasCoords]
  );

  const handleRestart = () => {
    setState(createGameState());
    setMovableIds([]);
    setRolling(false);
  };

  const currentColor = PLAYER_COLORS[state.currentPlayer]?.fill ?? "#fff";

  return (
    <div className="w-full">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Chip tone={state.winner ? "accent" : "default"}>
          {state.message}
        </Chip>
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            onClick={handleRoll}
            disabled={state.turnPhase !== "roll" || !!state.winner || rolling}
            style={{ backgroundColor: currentColor }}
          >
            {rolling ? "Rolling..." : "Roll Dice"}
          </Button>
          <Button variant="secondary" onClick={handleRestart}>
            New Game
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl2 border border-brand-border bg-brand-panelSoft">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className={`h-auto w-full max-w-full ${state.turnPhase === "move" && movableIds.length > 0 ? "cursor-pointer" : "cursor-default"}`}
          style={{ touchAction: "manipulation" }}
          onClick={handleCanvasClick}
          aria-label="Ludo game board"
        />
      </div>

      <p className="mt-4 text-center text-sm text-brand-muted">
        Roll the dice, then click a highlighted token to move. Roll a 6 to enter the board or get an extra turn.
        {state.turnPhase === "move" && movableIds.length > 0 && (
          <span className="mt-2 block font-semibold text-brand-primary">
            Click a highlighted token to move
          </span>
        )}
      </p>
    </div>
  );
}

export default LudoGame;
