import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Button from "../components/ui/Button";
import Chip from "../components/ui/Chip";
import { GAME_MAP } from "../data/games";

const GAMES_WITH_AI_TOGGLE = new Set([
  "2048", "air-hockey", "brick-breaker", "chess", "checkers", "connect-4",
  "memory-match", "minesweeper", "pong", "rock-paper-scissors", "snake",
  "tetris", "tic-tac-toe",
]);
// Ludo excluded — no toggle

const LAZY_COMPONENTS = {
  "2048":          lazy(() => import("../games/2048/Game2048")),
  "air-hockey":    lazy(() => import("../games/air-hockey/AirHockeyGame")),
  "connect-4":     lazy(() => import("../games/connect-4/Connect4Game")),
  checkers:        lazy(() => import("../games/checkers/CheckersGame")),
  "memory-match":  lazy(() => import("../games/memory-match/MemoryMatchGame")),
  "rock-paper-scissors": lazy(() => import("../games/rock-paper-scissors/RockPaperScissorsGame")),
  "brick-breaker": lazy(() => import("../games/brick-breaker/BrickBreakerGame")),
  chess:           lazy(() => import("../games/chess/ChessGame")),
  ludo:            lazy(() => import("../games/ludo/LudoGame")),
  minesweeper:     lazy(() => import("../games/minesweeper/MinesweeperGame")),
  pong:            lazy(() => import("../games/pong/PongGame")),
  snake:           lazy(() => import("../games/snake/SnakeGame")),
  tetris:          lazy(() => import("../games/tetris/TetrisGame")),
  "tic-tac-toe":   lazy(() => import("../games/tic-tac-toe/TicTacToeGame")),
  wordle:          lazy(() => import("../games/wordle/WordleGame")),
};

function LoadingSpinner() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-border border-t-brand-primary" />
        <p className="text-sm text-brand-muted">Loading game...</p>
      </div>
    </div>
  );
}

function GamePage() {
  const { gameSlug } = useParams();
  const navigate = useNavigate();
  const viewportRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [vsAI, setVsAI] = useState(false);
  const canUseFullscreen = typeof document !== "undefined" && document.fullscreenEnabled;
  const showAIToggle = GAMES_WITH_AI_TOGGLE.has(gameSlug);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const game = useMemo(() => GAME_MAP[gameSlug], [gameSlug]);
  const ActiveGame = useMemo(() => LAZY_COMPONENTS[gameSlug], [gameSlug]);

  // Reset vsAI when switching games
  useEffect(() => {
    setVsAI(false);
  }, [gameSlug]);

  const handleBack = () => navigate("/");

  const handleFullscreen = async () => {
    if (!viewportRef.current || !canUseFullscreen) return;
    if (!document.fullscreenElement) {
      await viewportRef.current.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  };

  if (!game) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-bg bg-brand-gradient px-4">
        <div className="animate-fade-in-up max-w-md rounded-xl2 border border-brand-border bg-brand-panel p-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-primary">
            Unknown game
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold text-brand-text">
            Game not found
          </h1>
          <p className="mt-3 text-brand-muted">
            This game route does not exist. Head back to the lobby.
          </p>
          <div className="mt-6">
            <Button onClick={handleBack}>Back to Games</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg bg-brand-gradient text-brand-text">
      <div className="mx-auto max-w-7xl px-3 pb-10 pt-4 sm:px-4 md:px-6 md:pt-6">
        {/* Top bar */}
        <header className="animate-fade-in flex flex-wrap items-center justify-between gap-3 rounded-xl2 border border-brand-border bg-brand-panel/90 px-4 py-3 backdrop-blur">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-brand-border bg-brand-panelSoft text-brand-muted transition-colors hover:border-brand-primary hover:text-brand-primary"
              aria-label="Back to games"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </Link>
            <div>
              <h1 className="font-display text-lg font-bold md:text-2xl">{game.name}</h1>
              <div className="mt-0.5 flex items-center gap-2">
                <Chip>{game.category}</Chip>
                <Chip tone="primary">{game.status}</Chip>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowControls((v) => !v)}
              className="rounded-xl2 border border-brand-border bg-brand-panel px-3 py-1.5 text-xs font-semibold text-brand-muted transition-colors hover:border-brand-primary hover:text-brand-primary lg:hidden"
            >
              {showControls ? "Hide Info" : "Show Info"}
            </button>
            <Button
              onClick={handleFullscreen}
              variant="ghost"
              disabled={!canUseFullscreen}
              title={!canUseFullscreen ? "Fullscreen not supported" : "Toggle fullscreen"}
              className="hidden sm:inline-flex"
            >
              {isFullscreen ? "Exit FS" : "Fullscreen"}
            </Button>
          </div>
        </header>

        {/* Game + sidebar */}
        <main className="animate-fade-in-up mt-4 grid gap-4 lg:grid-cols-[1fr_280px]">
          {/* Game viewport */}
          <section
            ref={viewportRef}
            className="game-viewport overflow-hidden rounded-xl2 border border-brand-border bg-brand-panel p-2 sm:p-4 md:p-5"
          >
            {ActiveGame ? (
              <Suspense fallback={<LoadingSpinner />}>
                <ActiveGame vsAI={vsAI} />
              </Suspense>
            ) : (
              <div className="flex min-h-[50vh] items-center justify-center rounded-xl2 border border-dashed border-brand-border bg-brand-panelSoft text-center">
                <div className="max-w-md px-6 py-8">
                  <p className="text-sm uppercase tracking-[0.16em] text-brand-primary">
                    Coming Soon
                  </p>
                  <h2 className="mt-2 font-display text-2xl font-bold text-brand-text">
                    {game.name}
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-brand-muted">
                    This game is planned for a future update.
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* Sidebar — controls + how-to-play */}
          <aside
            className={`space-y-4 rounded-xl2 border border-brand-border bg-brand-panel p-4 transition-all ${showControls ? "block" : "hidden lg:block"}`}
          >
            {showAIToggle && (
              <div className="flex items-center justify-between gap-3 rounded-xl2 border border-brand-border bg-brand-panelSoft px-4 py-3">
                <span className="text-sm font-semibold text-brand-text">Mode</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={vsAI}
                  onClick={() => setVsAI((v) => !v)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 transition-colors ${
                    vsAI ? "border-brand-primary bg-brand-primary" : "border-brand-border bg-brand-panel"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                      vsAI ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
                <span className="text-sm text-brand-muted">
                  {vsAI ? "vs AI" : "2 Player"}
                </span>
              </div>
            )}
            <h2 className="font-display text-base font-bold text-brand-text">How to Play</h2>
            <p className="text-sm leading-relaxed text-brand-muted">{game.tagline}</p>

            <h3 className="pt-2 text-xs font-semibold uppercase tracking-wider text-brand-primary">
              Controls
            </h3>
            <ul className="space-y-1.5 text-sm text-brand-muted">
              {game.controls.map((control) => (
                <li
                  key={control}
                  className="rounded-lg border border-brand-border bg-brand-panelSoft px-3 py-2"
                >
                  {control}
                </li>
              ))}
            </ul>

            <div className="pt-2">
              <Button to="/" variant="secondary" className="w-full text-xs">
                Back to All Games
              </Button>
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
}

export default GamePage;
