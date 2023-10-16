import { Link } from "react-router-dom";
import Chip from "../ui/Chip";

const CATEGORY_ICONS = {
  Arcade: "🕹️",
  Puzzle: "🧩",
  Board: "♟️",
};

function GameCard({ game, index = 0 }) {
  return (
    <Link
      to={`/games/${game.slug}`}
      className="animate-fade-in-up group relative block overflow-hidden rounded-xl2 border border-brand-border bg-brand-panel transition-all duration-200 ease-game hover:-translate-y-1.5 hover:border-brand-primary/50 hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
      style={{ animationDelay: `${index * 60}ms` }}
      aria-label={`Play ${game.name}`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${game.accent} opacity-90 transition-opacity group-hover:opacity-100`} />
      <div className="relative p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-lg" aria-hidden="true">
                {CATEGORY_ICONS[game.category] ?? "🎮"}
              </span>
              <h3 className="truncate font-display text-xl font-bold text-brand-text">
                {game.name}
              </h3>
            </div>
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-brand-muted">
              {game.tagline}
            </p>
          </div>
          <Chip>{game.category}</Chip>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <Chip tone={game.status === "Playable" ? "primary" : "accent"}>
            {game.status}
          </Chip>
          <span className="inline-flex items-center gap-1 rounded-xl2 border border-brand-border bg-brand-panel px-3 py-1.5 text-xs font-semibold text-brand-text transition-colors group-hover:border-brand-primary group-hover:text-brand-primary">
            Play Now
            <svg className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );
}

export default GameCard;
