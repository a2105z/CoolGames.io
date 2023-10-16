import { useState } from "react";
import Button from "../../components/ui/Button";
import Chip from "../../components/ui/Chip";

const CHOICES = [
  { id: "rock", label: "Rock", emoji: "✊" },
  { id: "paper", label: "Paper", emoji: "✋" },
  { id: "scissors", label: "Scissors", emoji: "✌️" },
];

function getResult(p1, p2) {
  if (p1 === p2) return 0;
  if (
    (p1 === "rock" && p2 === "scissors") ||
    (p1 === "paper" && p2 === "rock") ||
    (p1 === "scissors" && p2 === "paper")
  ) {
    return 1;
  }
  return 2;
}

function RockPaperScissorsGame({ vsAI = false }) {
  const [phase, setPhase] = useState("p1"); // "p1" | "p2" | "reveal"
  const [p1Choice, setP1Choice] = useState(null);
  const [p2Choice, setP2Choice] = useState(null);
  const [scores, setScores] = useState({ 1: 0, 2: 0 });
  const [roundWinner, setRoundWinner] = useState(null);

  const statusText =
    phase === "p1"
      ? vsAI ? "Pick your choice" : "Player 1 — pick your choice"
      : phase === "p2"
        ? "Player 2 — pick your choice (look away Player 1!)"
        : roundWinner === 0
          ? "Draw!"
          : vsAI
            ? (roundWinner === 1 ? "You win!" : "AI wins!")
            : `Player ${roundWinner} wins this round!`;

  const handleP1Pick = (choice) => {
    if (phase !== "p1") return;
    setP1Choice(choice);
    if (vsAI) {
      const aiChoice = CHOICES[Math.floor(Math.random() * 3)].id;
      setP2Choice(aiChoice);
      const winner = getResult(choice, aiChoice);
      setRoundWinner(winner);
      if (winner > 0) setScores((s) => ({ ...s, [winner]: s[winner] + 1 }));
      setPhase("reveal");
    } else {
      setPhase("p2");
    }
  };

  const handleP2Pick = (choice) => {
    if (phase !== "p2") return;
    setP2Choice(choice);
    setPhase("reveal");
    const winner = getResult(p1Choice, choice);
    setRoundWinner(winner);
    if (winner > 0) {
      setScores((s) => ({ ...s, [winner]: s[winner] + 1 }));
    }
  };

  const handleNextRound = () => {
    setPhase("p1");
    setP1Choice(null);
    setP2Choice(null);
    setRoundWinner(null);
  };

  const handleReset = () => {
    setPhase("p1");
    setP1Choice(null);
    setP2Choice(null);
    setScores({ 1: 0, 2: 0 });
    setRoundWinner(null);
  };

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center">
      <div className="mb-6 flex w-full flex-wrap items-center justify-between gap-3">
        <Chip tone={phase === "reveal" ? "accent" : "primary"}>
          {statusText}
        </Chip>
        <div className="flex items-center gap-3">
          <span className="text-sm text-brand-muted">
            {vsAI ? `You: ${scores[1]} — AI: ${scores[2]}` : `P1: ${scores[1]} — P2: ${scores[2]}`}
          </span>
          <Button variant="secondary" onClick={handleReset}>
            Reset Score
          </Button>
        </div>
      </div>

      {phase === "p1" && (
        <div className="flex flex-wrap justify-center gap-4">
          {CHOICES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => handleP1Pick(c.id)}
              className="flex flex-col items-center gap-2 rounded-xl border-2 border-brand-border bg-brand-panelSoft p-6 transition-all hover:border-brand-primary hover:bg-brand-primary/10"
            >
              <span className="text-5xl">{c.emoji}</span>
              <span className="text-sm font-semibold">{c.label}</span>
            </button>
          ))}
        </div>
      )}

      {phase === "p2" && (
        <div className="flex flex-wrap justify-center gap-4">
          {CHOICES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => handleP2Pick(c.id)}
              className="flex flex-col items-center gap-2 rounded-xl border-2 border-brand-border bg-brand-panelSoft p-6 transition-all hover:border-brand-primary hover:bg-brand-primary/10"
            >
              <span className="text-5xl">{c.emoji}</span>
              <span className="text-sm font-semibold">{c.label}</span>
            </button>
          ))}
        </div>
      )}

      {phase === "reveal" && (
        <div className="w-full space-y-6">
          <div className="flex justify-around gap-4">
            <div className="flex flex-col items-center gap-2 rounded-xl border border-brand-border bg-brand-panel p-4">
              <span className="text-xs font-semibold text-brand-muted">
                Player 1
              </span>
              <span className="text-5xl">
                {CHOICES.find((c) => c.id === p1Choice)?.emoji ?? "?"}
              </span>
              <span className="text-sm font-semibold">
                {CHOICES.find((c) => c.id === p1Choice)?.label ?? "—"}
              </span>
            </div>
            <div className="flex flex-col items-center justify-center text-2xl text-brand-muted">
              vs
            </div>
            <div className="flex flex-col items-center gap-2 rounded-xl border border-brand-border bg-brand-panel p-4">
              <span className="text-xs font-semibold text-brand-muted">
                {vsAI ? "AI" : "Player 2"}
              </span>
              <span className="text-5xl">
                {CHOICES.find((c) => c.id === p2Choice)?.emoji ?? "?"}
              </span>
              <span className="text-sm font-semibold">
                {CHOICES.find((c) => c.id === p2Choice)?.label ?? "—"}
              </span>
            </div>
          </div>
          <div className="flex justify-center">
            <Button onClick={handleNextRound}>Next Round</Button>
          </div>
        </div>
      )}

      <p className="mt-6 text-center text-sm text-brand-muted">
        Rock beats scissors, scissors beats paper, paper beats rock. Take turns
        picking — first to win a round scores a point.
      </p>
    </div>
  );
}

export default RockPaperScissorsGame;
