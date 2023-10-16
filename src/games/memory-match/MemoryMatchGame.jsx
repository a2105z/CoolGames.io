import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Button from "../../components/ui/Button";
import Chip from "../../components/ui/Chip";

const EMOJIS = ["🎮", "🎯", "🎲", "🎸", "🎺", "🎻", "🏀", "⚽", "🌟", "🔥", "💎", "🎪"];
const PAIRS = 8;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function createCards() {
  const chosen = shuffle(EMOJIS).slice(0, PAIRS);
  const pairs = [...chosen, ...chosen];
  return shuffle(pairs).map((emoji, id) => ({ id, emoji, flipped: false, matched: false }));
}

function MemoryMatchGame({ vsAI = false }) {
  const [cards, setCards] = useState(createCards);
  const [currentPlayer, setCurrentPlayer] = useState(1);
  const [scores, setScores] = useState({ 1: 0, 2: 0 });
  const [firstPick, setFirstPick] = useState(null);
  const [lock, setLock] = useState(false);
  const aiMemoryRef = useRef(new Map());

  const flippedIds = useMemo(
    () => cards.filter((c) => c.flipped).map((c) => c.id),
    [cards]
  );
  const matchedCount = useMemo(
    () => cards.filter((c) => c.matched).length,
    [cards]
  );
  const gameOver = matchedCount === PAIRS * 2;

  const winner = useMemo(() => {
    if (!gameOver) return null;
    if (scores[1] > scores[2]) return 1;
    if (scores[2] > scores[1]) return 2;
    return 0;
  }, [gameOver, scores]);

  const isAITurn = vsAI && currentPlayer === 2 && !lock && !gameOver && firstPick === null;

  const statusText = gameOver
    ? winner === 0
      ? vsAI ? "Draw! Equal pairs." : "Draw! Equal pairs."
      : vsAI ? (winner === 1 ? "You win!" : "AI wins!") : `Player ${winner} wins!`
    : vsAI && currentPlayer === 2
      ? "AI thinking..."
      : vsAI
        ? "Your turn — find a pair"
        : `Player ${currentPlayer}'s turn — find a pair`;

  useEffect(() => {
    if (!isAITurn) return;
    const unseen = cards
      .map((c, i) => ({ c, i }))
      .filter(({ c }) => !c.flipped && !c.matched);
    const memory = aiMemoryRef.current;
    let pick1 = -1, pick2 = -1;
    const entries = [...memory.entries()];
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        if (entries[i][1] === entries[j][1]) {
          pick1 = entries[i][0];
          pick2 = entries[j][0];
          break;
        }
      }
      if (pick1 >= 0) break;
    }
    if (pick1 < 0 && unseen.length >= 2) {
      const i1 = Math.floor(Math.random() * unseen.length);
      pick1 = unseen[i1].i;
      const remaining = unseen.filter((_, i) => i !== i1);
      pick2 = remaining[Math.floor(Math.random() * remaining.length)].i;
    }
    if (pick1 < 0 || pick2 < 0) return;
    const timer = setTimeout(() => {
      const card1 = cards[pick1];
      const card2 = cards[pick2];
      if (card1.matched || card2.matched) {
        setCurrentPlayer(1);
        return;
      }
      setCards((prev) =>
        prev.map((c, i) => (i === pick1 || i === pick2 ? { ...c, flipped: true } : c))
      );
      if (card1.emoji === card2.emoji) {
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c, i) =>
              i === pick1 || i === pick2 ? { ...c, matched: true } : c
            )
          );
          setScores((s) => ({ ...s, 2: s[2] + 1 }));
          memory.delete(pick1);
          memory.delete(pick2);
          setCurrentPlayer(2);
        }, 300);
      } else {
        memory.set(pick1, card1.emoji);
        memory.set(pick2, card2.emoji);
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c, i) =>
              i === pick1 || i === pick2 ? { ...c, flipped: false } : c
            )
          );
          setCurrentPlayer(1);
        }, 600);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [isAITurn, cards]);

  const handleCardClick = useCallback(
    (index) => {
      if (lock || gameOver || (vsAI && currentPlayer === 2)) return;

      const card = cards[index];
      if (card.flipped || card.matched) return;

      if (firstPick === null) {
        setFirstPick(index);
        setCards((prev) =>
          prev.map((c, i) => (i === index ? { ...c, flipped: true } : c))
        );
      } else {
        const firstCard = cards[firstPick];
        if (firstCard.emoji === card.emoji) {
          setCards((prev) =>
            prev.map((c, i) =>
              i === index || i === firstPick
                ? { ...c, flipped: true, matched: true }
                : c
            )
          );
          setScores((s) => ({
            ...s,
            [currentPlayer]: s[currentPlayer] + 1,
          }));
          setFirstPick(null);
          // Match = same player goes again
        } else {
          setLock(true);
          setCards((prev) =>
            prev.map((c, i) => (i === index ? { ...c, flipped: true } : c))
          );
          if (vsAI) {
            aiMemoryRef.current.set(firstPick, firstCard.emoji);
            aiMemoryRef.current.set(index, card.emoji);
          }
          setTimeout(() => {
            setCards((prev) =>
              prev.map((c, i) =>
                i === index || i === firstPick
                  ? { ...c, flipped: false }
                  : c
              )
            );
            setFirstPick(null);
            setLock(false);
            setCurrentPlayer((p) => (p === 1 ? 2 : 1));
          }, 600);
        }
      }
    },
    [cards, firstPick, lock, gameOver, currentPlayer, vsAI]
  );

  const handleReset = () => {
    aiMemoryRef.current.clear();
    setCards(createCards());
    setScores({ 1: 0, 2: 0 });
    setCurrentPlayer(1);
    setFirstPick(null);
    setLock(false);
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center">
      <div className="mb-5 flex w-full flex-wrap items-center justify-between gap-3">
        <Chip tone={gameOver ? "accent" : "primary"}>{statusText}</Chip>
        <div className="flex items-center gap-4">
          <span className="text-xs text-brand-muted">
            {vsAI ? `You: ${scores[1]} | AI: ${scores[2]}` : `P1: ${scores[1]} | P2: ${scores[2]}`}
          </span>
          <Button variant="secondary" onClick={handleReset}>
            New Game
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 sm:grid-cols-4 md:gap-4">
        {cards.map((card, index) => (
          <button
            key={`${card.id}-${index}`}
            type="button"
            onClick={() => handleCardClick(index)}
            disabled={lock || card.matched || (vsAI && currentPlayer === 2)}
            className={`flex aspect-square items-center justify-center rounded-xl border-2 text-3xl transition-all duration-200 md:text-4xl ${
              card.matched
                ? "border-brand-primary bg-brand-primary/10 opacity-80"
                : card.flipped
                  ? "border-brand-primary bg-brand-panel"
                  : "border-brand-border bg-brand-panelSoft hover:border-brand-primary/60"
            }`}
            aria-label={card.flipped || card.matched ? card.emoji : "Hidden card"}
          >
            {card.flipped || card.matched ? card.emoji : "?"}
          </button>
        ))}
      </div>

      <p className="mt-5 text-center text-sm text-brand-muted">
        {vsAI ? "You vs AI. Flip two cards to find matching pairs." : "Take turns. Flip two cards to find matching pairs. Most pairs wins."}
      </p>
    </div>
  );
}

export default MemoryMatchGame;
