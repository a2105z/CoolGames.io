import { useCallback, useEffect, useState } from "react";
import Button from "../../components/ui/Button";
import Chip from "../../components/ui/Chip";
import { getRandomWord, WORDS_5, WORDS_6, WORDS_7 } from "./words";

const LENGTHS = [5, 6, 7];
const KEYS_ROW1 = "QWERTYUIOP".split("");
const KEYS_ROW2 = "ASDFGHJKL".split("");
const KEYS_ROW3 = ["Enter", ..."ZXCVBNM".split(""), "Backspace"];

const VALID_WORDS = {
  5: new Set(WORDS_5.map((w) => w.toUpperCase())),
  6: new Set(WORDS_6.map((w) => w.toUpperCase())),
  7: new Set(WORDS_7.map((w) => w.toUpperCase())),
};

function computeFeedback(guess, answer) {
  const g = guess.toUpperCase().split("");
  const a = answer.toUpperCase().split("");
  const result = Array(g.length).fill("absent");
  const used = Array(a.length).fill(false);

  for (let i = 0; i < g.length; i++) {
    if (g[i] === a[i]) {
      result[i] = "correct";
      used[i] = true;
    }
  }
  for (let i = 0; i < g.length; i++) {
    if (result[i] === "correct") continue;
    for (let j = 0; j < a.length; j++) {
      if (!used[j] && g[i] === a[j]) {
        result[i] = "present";
        used[j] = true;
        break;
      }
    }
  }
  return result;
}

function WordleGame() {
  const [length, setLength] = useState(5);
  const [answer, setAnswer] = useState("");
  const [guesses, setGuesses] = useState([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [shakeRow, setShakeRow] = useState(-1);

  const startNewGame = useCallback((newLength) => {
    const len = newLength ?? length;
    setLength(len);
    setAnswer(getRandomWord(len));
    setGuesses([]);
    setCurrentGuess("");
    setGameOver(false);
    setWon(false);
    setShakeRow(-1);
  }, [length]);

  useEffect(() => {
    if (!answer) startNewGame(5);
  }, []);

  const keyStatus = useCallback(() => {
    const status = {};
    guesses.forEach((g) => {
      const feedback = computeFeedback(g, answer);
      g.toUpperCase().split("").forEach((c, i) => {
        const prev = status[c];
        if (feedback[i] === "correct") status[c] = "correct";
        else if (feedback[i] === "present" && prev !== "correct") status[c] = "present";
        else if (!prev || prev === "absent") status[c] = feedback[i];
      });
    });
    return status;
  }, [guesses, answer]);

  const handleKey = useCallback(
    (key) => {
      if (gameOver) return;
      const upper = key.toUpperCase();

      if (key === "Backspace") {
        setCurrentGuess((g) => g.slice(0, -1));
        return;
      }
      if (key === "Enter") {
        if (currentGuess.length !== length) {
          setShakeRow(guesses.length);
          setTimeout(() => setShakeRow(-1), 500);
          return;
        }
        const valid = VALID_WORDS[length];
        if (!valid.has(currentGuess.toUpperCase())) {
          setShakeRow(guesses.length);
          setTimeout(() => setShakeRow(-1), 500);
          return;
        }
        const newGuesses = [...guesses, currentGuess];
        setGuesses(newGuesses);
        setCurrentGuess("");
        if (currentGuess.toUpperCase() === answer.toUpperCase()) {
          setGameOver(true);
          setWon(true);
        } else if (newGuesses.length >= length) {
          setGameOver(true);
          setWon(false);
        }
        return;
      }
      if (upper >= "A" && upper <= "Z" && currentGuess.length < length) {
        setCurrentGuess((g) => g + upper);
      }
    },
    [currentGuess, length, guesses, answer, gameOver]
  );

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "Backspace") {
        e.preventDefault();
        handleKey("Backspace");
      } else if (e.key === "Enter") {
        e.preventDefault();
        handleKey("Enter");
      } else if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
        e.preventDefault();
        handleKey(e.key.toUpperCase());
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleKey]);

  const statusText = gameOver
    ? won
      ? "You got it!"
      : `The word was ${answer.toUpperCase()}`
    : `${guesses.length}/${length} tries`;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-6">
      {/* Title */}
      <h2 className="font-display text-2xl font-bold tracking-tight text-brand-text md:text-3xl">
        WORDLE
      </h2>
      {/* Header */}
      <div className="flex w-full flex-wrap items-center justify-between gap-3">
        <Chip tone={gameOver ? (won ? "accent" : "default") : "primary"}>
          {statusText}
        </Chip>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-brand-muted">Letters:</span>
          {LENGTHS.map((len) => (
            <button
              key={len}
              type="button"
              onClick={() => startNewGame(len)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-all ${
                length === len
                  ? "bg-brand-primary text-brand-bg"
                  : "bg-brand-panelSoft text-brand-muted hover:bg-brand-panel hover:text-brand-text"
              }`}
            >
              {len}
            </button>
          ))}
        </div>
        <Button variant="secondary" onClick={() => startNewGame()}>
          New Game
        </Button>
      </div>

      {/* Grid */}
      <div className="flex flex-col gap-1.5">
        {Array.from({ length }, (_, row) => (
          <div
            key={row}
            className={`flex justify-center gap-1.5 ${shakeRow === row ? "animate-shake" : ""}`}
          >
            {Array.from({ length: length }, (_, col) => {
              const letter =
                guesses[row]?.[col] ?? (row === guesses.length ? currentGuess[col] : null);
              let feedback = null;
              if (guesses[row]) {
                feedback = computeFeedback(guesses[row], answer)[col];
              }
              return (
                <div
                  key={col}
                  className={`flex h-11 w-11 items-center justify-center rounded-lg border-2 text-lg font-bold uppercase transition-all duration-300 md:h-12 md:w-12 ${
                    feedback ? "animate-flip-in" : ""
                  }`}
                  style={feedback ? { animationDelay: `${col * 60}ms` } : undefined}
                >
                  <span
                    className={`flex h-full w-full items-center justify-center rounded-md ${
                      feedback === "correct"
                        ? "border-emerald-500 bg-emerald-600 text-white"
                        : feedback === "present"
                          ? "border-amber-500 bg-amber-500 text-white"
                          : feedback === "absent"
                            ? "border-brand-border bg-brand-panelSoft text-brand-muted"
                            : letter
                              ? "border-brand-border bg-brand-panel text-brand-text"
                              : "border-brand-border bg-brand-panelSoft/50 text-brand-muted"
                    } border-2`}
                  >
                    {letter ?? ""}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Virtual keyboard */}
      <div className="flex w-full max-w-md flex-col gap-1.5">
        <div className="flex justify-center gap-1">
          {KEYS_ROW1.map((k) => (
            <KeyButton key={k} letter={k} status={keyStatus()[k]} onPress={() => handleKey(k)} />
          ))}
        </div>
        <div className="flex justify-center gap-1">
          {KEYS_ROW2.map((k) => (
            <KeyButton key={k} letter={k} status={keyStatus()[k]} onPress={() => handleKey(k)} />
          ))}
        </div>
        <div className="flex justify-center gap-1">
          {KEYS_ROW3.map((k) => (
            <KeyButton key={k} letter={k} status={keyStatus()[k]} onPress={() => handleKey(k)} />
          ))}
        </div>
      </div>

      <p className="text-center text-sm text-brand-muted">
        Guess the word in {length} tries. Green = correct spot, amber = wrong spot, gray = not in word.
      </p>
    </div>
  );
}

function KeyButton({ letter, status, onPress }) {
  const isWide = letter === "Enter" || letter === "Backspace";
  return (
    <button
      type="button"
      onClick={onPress}
      className={`flex items-center justify-center rounded-lg border-2 text-sm font-semibold transition-all active:scale-95 ${
        isWide ? "px-4" : "h-10 w-8 md:h-11 md:w-9"
      } ${
        status === "correct"
          ? "border-emerald-500 bg-emerald-600 text-white"
          : status === "present"
            ? "border-amber-500 bg-amber-500 text-white"
            : status === "absent"
              ? "border-brand-border bg-brand-panelSoft text-brand-muted"
              : "border-brand-border bg-brand-panel text-brand-text hover:border-brand-primary/60"
      }`}
    >
      {letter === "Backspace" ? (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l2.828-2.828A2 2 0 016.828 9h10.344a2 2 0 011.414 2.828L21 12" />
        </svg>
      ) : (
        letter
      )}
    </button>
  );
}

export default WordleGame;
