import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import GameCard from "../components/games/GameCard";
import Chip from "../components/ui/Chip";
import { GAME_CATEGORIES, GAMES } from "../data/games";

function HomePage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");

  const visibleGames = useMemo(() => {
    let list = GAMES;
    if (activeCategory !== "All") {
      list = list.filter((g) => g.category === activeCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          g.tagline.toLowerCase().includes(q) ||
          g.category.toLowerCase().includes(q)
      );
    }
    return list;
  }, [activeCategory, search]);

  const categoryCounts = useMemo(() => {
    const counts = { All: GAMES.length };
    for (const g of GAMES) counts[g.category] = (counts[g.category] || 0) + 1;
    return counts;
  }, []);

  const playableCount = GAMES.filter((g) => g.status === "Playable").length;

  return (
    <div className="min-h-screen bg-brand-bg bg-brand-gradient text-brand-text">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 md:px-6 md:pt-12">
        {/* Navbar */}
        <header className="animate-fade-in flex flex-wrap items-center justify-between gap-4 rounded-xl2 border border-brand-border bg-brand-panel/80 px-5 py-4 backdrop-blur">
          <Link to="/" className="group flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-primary text-lg font-bold text-slate-950 transition-transform group-hover:scale-105">
              CG
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-primary">
                CoolGames.io
              </p>
              <h1 className="font-display text-xl font-bold md:text-2xl">Arcade Hub</h1>
            </div>
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <Chip tone="accent">{playableCount} playable</Chip>
            <Chip tone="primary">No login needed</Chip>
          </div>
        </header>

        {/* Hero */}
        <section className="animate-fade-in-up mt-8 rounded-xl2 border border-brand-border bg-brand-panel p-6 text-center md:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-primary">
            Free browser games
          </p>
          <h2 className="mt-2 font-display text-3xl font-bold md:text-4xl">
            Pick a game and play instantly
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-brand-muted">
            {GAMES.length} classic games — no downloads, no accounts, no ads. Just click and play.
          </p>

          {/* Search */}
          <div className="mx-auto mt-6 max-w-md">
            <input
              type="text"
              placeholder="Search games..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl2 border border-brand-border bg-brand-panelSoft px-4 py-2.5 text-sm text-brand-text placeholder-brand-muted/60 outline-none transition-colors focus:border-brand-primary"
            />
          </div>
        </section>

        {/* Category filters */}
        <nav className="mt-8 flex flex-wrap items-center gap-2" aria-label="Game categories">
          {GAME_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`rounded-xl2 border px-4 py-2 text-sm font-semibold transition-all duration-200 ease-game ${
                cat === activeCategory
                  ? "border-brand-primary bg-brand-primary text-slate-950"
                  : "border-brand-border bg-brand-panel text-brand-text hover:border-brand-primary hover:text-brand-primary"
              }`}
            >
              {cat}
              <span className="ml-1.5 text-xs opacity-70">({categoryCounts[cat] || 0})</span>
            </button>
          ))}
        </nav>

        {/* Game grid */}
        <section className="mt-8">
          {visibleGames.length === 0 ? (
            <div className="rounded-xl2 border border-brand-border bg-brand-panel p-10 text-center">
              <p className="text-brand-muted">No games match your filter.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visibleGames.map((game, i) => (
                <GameCard key={game.slug} game={game} index={i} />
              ))}
            </div>
          )}
        </section>

        {/* Footer */}
        <footer className="mt-16 border-t border-brand-border pt-6 text-center text-xs text-brand-muted">
          <p>CoolGames.io — Built with React, Vite, and Tailwind CSS</p>
        </footer>
      </div>
    </div>
  );
}

export default HomePage;
