import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

const HomePage = lazy(() => import("./pages/HomePage"));
const GamePage = lazy(() => import("./pages/GamePage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));

function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-bg bg-brand-gradient">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-border border-t-brand-primary" />
        <p className="text-sm text-brand-muted">Loading...</p>
      </div>
    </div>
  );
}

function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/games/:gameSlug" element={<GamePage />} />
        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}

export default App;
