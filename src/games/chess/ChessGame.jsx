import { useCallback, useEffect, useMemo, useState } from "react";
import Button from "../../components/ui/Button";
import Chip from "../../components/ui/Chip";
import {
  WHITE, BLACK,
  PIECE_SYMBOLS, PIECE_VALUES,
  createBoard, findKing, isInCheck,
  getLegalMoves, getAllLegalMoves, makeMove, getGameStatus,
} from "./engine";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const RANKS = ["8", "7", "6", "5", "4", "3", "2", "1"];

const PROMO_PIECES = ["q", "r", "b", "n"];

function initialState() {
  return {
    board: createBoard(),
    turn: WHITE,
    castleRights: { wk: true, wq: true, bk: true, bq: true },
    enPassantTarget: null,
    status: "playing",
    selected: null,
    legalMoves: [],
    lastMove: null,
    capturedByWhite: [],
    capturedByBlack: [],
    promotionPending: null,
  };
}

function sortCaptured(pieces) {
  return [...pieces].sort((a, b) => PIECE_VALUES[b] - PIECE_VALUES[a]);
}

function getAIMove(game) {
  const moves = getAllLegalMoves(
    game.board, game.turn,
    game.castleRights, game.enPassantTarget
  );
  if (moves.length === 0) return null;
  const captures = moves.filter((m) => game.board[m.toRow]?.[m.toCol]);
  if (captures.length > 0) {
    captures.sort((a, b) => {
      const va = PIECE_VALUES[game.board[b.toRow]?.[b.toCol]?.type] ?? 0;
      const vb = PIECE_VALUES[game.board[a.toRow]?.[a.toCol]?.type] ?? 0;
      return va - vb;
    });
    return captures[captures.length - 1];
  }
  return moves[Math.floor(Math.random() * moves.length)];
}

function ChessGame({ vsAI = false }) {
  const [game, setGame] = useState(initialState);

  const inCheck = useMemo(
    () => isInCheck(game.board, game.turn),
    [game.board, game.turn]
  );

  const kingPos = useMemo(
    () => findKing(game.board, game.turn),
    [game.board, game.turn]
  );

  const isAITurn = vsAI && game.turn === BLACK && game.status === "playing" && !game.promotionPending;

  const statusText = useMemo(() => {
    const who = game.turn === WHITE ? "White" : "Black";
    if (game.status === "checkmate") {
      const winner = game.turn === WHITE ? "Black" : "White";
      return vsAI ? `Checkmate — ${winner === "White" ? "You" : "AI"} win!` : `Checkmate — ${winner} wins`;
    }
    if (game.status === "stalemate") return "Stalemate — Draw";
    if (game.status === "check") return vsAI && who === "Black" ? "AI is in check" : `${who} is in check`;
    return vsAI && who === "Black" ? "AI thinking..." : `${who}'s turn`;
  }, [game.status, game.turn, vsAI]);

  const isLegalTarget = useCallback(
    (row, col) =>
      game.legalMoves.some((m) => m.toRow === row && m.toCol === col),
    [game.legalMoves]
  );

  const isCaptureMoveTarget = useCallback(
    (row, col) => {
      if (!isLegalTarget(row, col)) return false;
      const target = game.board[row][col];
      if (target && target.color !== game.turn) return true;
      if (
        game.enPassantTarget &&
        game.enPassantTarget[0] === row &&
        game.enPassantTarget[1] === col &&
        game.selected
      ) {
        const piece = game.board[game.selected.row]?.[game.selected.col];
        if (piece?.type === "p") return true;
      }
      return false;
    },
    [game.board, game.enPassantTarget, game.legalMoves, game.selected, game.turn, isLegalTarget]
  );

  const executeMove = useCallback(
    (move) => {
      const { board: newBoard, castleRights: newCR, enPassantTarget: newEP, captured } =
        makeMove(game.board, move, game.castleRights, game.enPassantTarget);

      const nextTurn = game.turn === WHITE ? BLACK : WHITE;
      const nextStatus = getGameStatus(newBoard, nextTurn, newCR, newEP);

      const capturedByWhite = [...game.capturedByWhite];
      const capturedByBlack = [...game.capturedByBlack];
      if (captured) {
        if (game.turn === WHITE) capturedByWhite.push(captured.type);
        else capturedByBlack.push(captured.type);
      }

      setGame({
        board: newBoard,
        turn: nextTurn,
        castleRights: newCR,
        enPassantTarget: newEP,
        status: nextStatus,
        selected: null,
        legalMoves: [],
        lastMove: { fromRow: move.fromRow, fromCol: move.fromCol, toRow: move.toRow, toCol: move.toCol },
        capturedByWhite,
        capturedByBlack,
        promotionPending: null,
      });
    },
    [game]
  );

  const handleCellClick = useCallback(
    (row, col) => {
      if (game.promotionPending) return;
      if (game.status === "checkmate" || game.status === "stalemate") return;
      if (vsAI && game.turn === BLACK) return;

      const piece = game.board[row][col];

      if (game.selected && isLegalTarget(row, col)) {
        const movesHere = game.legalMoves.filter(
          (m) => m.toRow === row && m.toCol === col
        );

        if (movesHere.length > 1 && movesHere[0].promotion) {
          setGame((prev) => ({
            ...prev,
            promotionPending: { fromRow: game.selected.row, fromCol: game.selected.col, toRow: row, toCol: col },
          }));
          return;
        }

        executeMove(movesHere[0]);
        return;
      }

      if (piece && piece.color === game.turn) {
        const moves = getLegalMoves(
          game.board, row, col,
          game.castleRights, game.enPassantTarget
        );
        setGame((prev) => ({
          ...prev,
          selected: { row, col },
          legalMoves: moves,
        }));
        return;
      }

      setGame((prev) => ({ ...prev, selected: null, legalMoves: [] }));
    },
    [game, vsAI, executeMove]
  );

  const handlePromotion = useCallback(
    (promoType) => {
      const pp = game.promotionPending;
      if (!pp) return;
      const move = {
        fromRow: pp.fromRow,
        fromCol: pp.fromCol,
        toRow: pp.toRow,
        toCol: pp.toCol,
        promotion: promoType,
      };
      executeMove(move);
    },
    [game.promotionPending, executeMove]
  );

  useEffect(() => {
    if (!isAITurn) return;
    const t = setTimeout(() => {
      const move = getAIMove(game);
      if (move) {
        const moves = getLegalMoves(game.board, move.fromRow, move.fromCol, game.castleRights, game.enPassantTarget);
        const matching = moves.filter((m) => m.toRow === move.toRow && m.toCol === move.toCol);
        const full = matching.find((m) => m.promotion === "q") ?? matching[0];
        if (full) executeMove(full);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [isAITurn, game, executeMove]);

  const handleRestart = () => setGame(initialState());

  const isLastMove = (row, col) => {
    if (!game.lastMove) return false;
    const lm = game.lastMove;
    return (
      (row === lm.fromRow && col === lm.fromCol) ||
      (row === lm.toRow && col === lm.toCol)
    );
  };

  const isKingInCheck = (row, col) => {
    return inCheck && kingPos && kingPos[0] === row && kingPos[1] === col;
  };

  const whiteCapturedSorted = sortCaptured(game.capturedByWhite);
  const blackCapturedSorted = sortCaptured(game.capturedByBlack);

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Chip
          tone={
            game.status === "checkmate"
              ? "accent"
              : game.status === "stalemate"
                ? "default"
                : game.status === "check"
                  ? "accent"
                  : "primary"
          }
        >
          {statusText}
        </Chip>
        <Button variant="secondary" onClick={handleRestart}>
          New Game
        </Button>
      </div>

      {/* Captured by white (black pieces) */}
      <div className="mb-2 flex min-h-[28px] flex-wrap items-center gap-1 px-1">
        {whiteCapturedSorted.map((type, i) => (
          <span key={`wc-${i}`} className="text-lg leading-none text-brand-muted/80">
            {PIECE_SYMBOLS["b" + type]}
          </span>
        ))}
      </div>

      {/* Board */}
      <div className="relative mx-auto w-fit rounded-lg border-2 border-brand-border bg-brand-panel shadow-lg">
        <div className="grid grid-cols-8">
          {RANKS.map((rank, row) =>
            FILES.map((file, col) => {
              const piece = game.board[row][col];
              const isLight = (row + col) % 2 === 0;
              const isSelected =
                game.selected?.row === row && game.selected?.col === col;
              const isLegal = isLegalTarget(row, col);
              const isCapture = isCaptureMoveTarget(row, col);
              const isLast = isLastMove(row, col);
              const isCheck = isKingInCheck(row, col);

              let bg = isLight ? "bg-[#f0d9b5]" : "bg-[#b58863]";
              if (isCheck) bg = isLight ? "bg-[#ff6b6b]" : "bg-[#e05555]";
              else if (isSelected) bg = isLight ? "bg-[#f7ec5e]" : "bg-[#daca3a]";
              else if (isLast) bg = isLight ? "bg-[#cdd26a]/60" : "bg-[#aab23a]/50";

              const symbol = piece
                ? PIECE_SYMBOLS[piece.color + piece.type]
                : null;
              const pieceColor =
                piece?.color === WHITE ? "text-[#fff8ee]" : "text-[#1a1a2e]";
              const pieceShadow =
                piece?.color === WHITE
                  ? "[text-shadow:_0_1px_3px_rgba(0,0,0,0.55)]"
                  : "[text-shadow:_0_1px_2px_rgba(255,255,255,0.15)]";

              return (
                <button
                  key={`${row}-${col}`}
                  type="button"
                  onClick={() => handleCellClick(row, col)}
                  className={`relative flex h-14 w-14 items-center justify-center text-[2.4rem] leading-none transition-colors md:h-16 md:w-16 ${bg} ${piece ? `${pieceColor} ${pieceShadow} cursor-pointer` : ""}`}
                  aria-label={`${file}${rank}${piece ? ` ${piece.color === WHITE ? "White" : "Black"} ${piece.type}` : ""}`}
                >
                  {symbol}

                  {isLegal && !isCapture && (
                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <span className="block h-[22%] w-[22%] rounded-full bg-black/25" />
                    </span>
                  )}
                  {isLegal && isCapture && (
                    <span className="pointer-events-none absolute inset-0 rounded-sm ring-[3.5px] ring-inset ring-black/30" />
                  )}

                  {col === 0 && (
                    <span className="pointer-events-none absolute left-[3px] top-[2px] text-[0.6rem] font-bold leading-none text-black/40 select-none">
                      {rank}
                    </span>
                  )}
                  {row === 7 && (
                    <span className="pointer-events-none absolute bottom-[2px] right-[3px] text-[0.6rem] font-bold leading-none text-black/40 select-none">
                      {file}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Promotion picker overlay */}
        {game.promotionPending && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50">
            <div className="rounded-xl2 border border-brand-border bg-brand-panel p-4 shadow-xl">
              <p className="mb-3 text-center text-sm font-semibold text-brand-text">
                Promote pawn to:
              </p>
              <div className="flex gap-2">
                {PROMO_PIECES.map((pt) => (
                  <button
                    key={pt}
                    type="button"
                    onClick={() => handlePromotion(pt)}
                    className="flex h-14 w-14 items-center justify-center rounded-lg border border-brand-border bg-brand-panelSoft text-3xl transition-colors hover:border-brand-primary hover:bg-brand-primary/15"
                    aria-label={`Promote to ${pt}`}
                  >
                    {PIECE_SYMBOLS[game.turn + pt]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Captured by black (white pieces) */}
      <div className="mt-2 flex min-h-[28px] flex-wrap items-center gap-1 px-1">
        {blackCapturedSorted.map((type, i) => (
          <span key={`bc-${i}`} className="text-lg leading-none text-brand-muted/80">
            {PIECE_SYMBOLS["w" + type]}
          </span>
        ))}
      </div>

      <p className="mt-4 text-center text-sm text-brand-muted">
        Click a piece to select, then click a destination. Includes castling, en passant, and promotion.
      </p>
    </div>
  );
}

export default ChessGame;
