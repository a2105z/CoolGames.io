import { Link } from "react-router-dom";

function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-bg bg-brand-gradient px-4">
      <div className="animate-fade-in-up max-w-md rounded-xl2 border border-brand-border bg-brand-panel p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-panelSoft text-3xl">
          🎮
        </div>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-brand-primary">
          404
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-brand-text">Page not found</h1>
        <p className="mt-3 text-brand-muted">
          Looks like this page wandered off the map. Let's get you back to the games.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-xl2 bg-brand-primary px-5 py-2.5 text-sm font-semibold text-slate-950 transition-all hover:-translate-y-0.5 hover:bg-brand-primaryHover"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Back to Games
          </Link>
        </div>
      </div>
    </div>
  );
}

export default NotFoundPage;
