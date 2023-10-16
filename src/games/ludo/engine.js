import {
  PLAYERS, TOKENS_PER_PLAYER,
  OUTER_PATH, START_INDEX, HOME_RUNS,
  SAFE_INDICES, HOME_ENTRY_INDEX,
  TOTAL_PATH_LENGTH, HOME_RUN_LENGTH,
} from "./constants";

// Token states: "home" | "active" | "finished"
// pathIndex: 0..51 on outer path, or -1 if home/finished
// homeRunIndex: 0..5 on home-run lane, or -1 if not on home run

export function createToken(player, id) {
  return {
    player,
    id,
    state: "home",       // "home" | "active" | "finished"
    pathIndex: -1,       // position on the outer loop (0-51 relative to player's start)
    homeRunIndex: -1,    // position on home run (0-5), -1 if not on it
  };
}

export function createGameState() {
  const tokens = {};
  for (const player of PLAYERS) {
    tokens[player] = [];
    for (let i = 0; i < TOKENS_PER_PLAYER; i++) {
      tokens[player].push(createToken(player, i));
    }
  }
  return {
    tokens,
    currentPlayer: "red",
    diceValue: null,
    diceRolled: false,
    selectedToken: null,
    consecutiveSixes: 0,
    winner: null,
    turnPhase: "roll",      // "roll" | "move" | "done"
    message: "Red rolls the dice",
  };
}

export function rollDice() {
  return Math.floor(Math.random() * 6) + 1;
}

// Convert a player-relative path step (0..56) to absolute board position
// Steps 0-51 are on the outer path; 52-57 are on the home run
function playerAbsoluteIndex(player, relativeStep) {
  if (relativeStep >= TOTAL_PATH_LENGTH) {
    return { type: "homerun", index: relativeStep - TOTAL_PATH_LENGTH };
  }
  const absIndex = (START_INDEX[player] + relativeStep) % TOTAL_PATH_LENGTH;
  return { type: "outer", index: absIndex };
}

// Get the relative step for a token (how many steps from start it has taken)
function getRelativeStep(token) {
  if (token.state === "home") return -1;
  if (token.state === "finished") return TOTAL_PATH_LENGTH + HOME_RUN_LENGTH;
  if (token.homeRunIndex >= 0) return TOTAL_PATH_LENGTH + token.homeRunIndex;
  // Convert absolute path index back to relative
  const start = START_INDEX[token.player];
  let rel = token.pathIndex - start;
  if (rel < 0) rel += TOTAL_PATH_LENGTH;
  return rel;
}

// Get the board (row, col) for a token
export function getTokenBoardPos(token) {
  if (token.state === "home" || token.state === "finished") return null;
  if (token.homeRunIndex >= 0) {
    return HOME_RUNS[token.player][token.homeRunIndex];
  }
  return OUTER_PATH[token.pathIndex];
}

// Get the target [row, col] for a token after moving
function getTargetPos(player, token, dice) {
  if (token.state === "home" && dice === 6) {
    const [r, c] = OUTER_PATH[START_INDEX[player]];
    return [r, c];
  }
  if (token.state !== "active") return null;
  const relStep = getRelativeStep(token);
  const newRel = relStep + dice;
  if (newRel >= TOTAL_PATH_LENGTH) {
    const homeIdx = newRel - TOTAL_PATH_LENGTH;
    if (homeIdx >= HOME_RUN_LENGTH) return null; // finishing
    return HOME_RUNS[player][homeIdx];
  }
  const absIdx = (START_INDEX[player] + newRel) % TOTAL_PATH_LENGTH;
  return OUTER_PATH[absIdx];
}

// Check if a token can move with the given dice value
export function canTokenMove(state, token, dice) {
  if (token.state === "finished") return false;

  if (token.state === "home") {
    return dice === 6;
  }

  const relStep = getRelativeStep(token);
  const newRel = relStep + dice;

  // Can't overshoot — allow up to finishing (step 58 = land on last home cell and finish)
  if (newRel > TOTAL_PATH_LENGTH + HOME_RUN_LENGTH) return false;

  // Can't land on our own token (blocking)
  const target = getTargetPos(token.player, token, dice);
  if (target) {
    const [tr, tc] = target;
    for (const other of state.tokens[token.player]) {
      if (other.id === token.id) continue;
      if (other.state === "home" || other.state === "finished") continue;
      const pos = getTokenBoardPos(other);
      if (pos && pos[0] === tr && pos[1] === tc) return false;
    }
  }
  return true;
}

// Get all movable tokens for the current player given a dice roll
export function getMovableTokens(state, dice) {
  const player = state.currentPlayer;
  const playerTokens = state.tokens[player];
  const movable = [];

  for (const token of playerTokens) {
    if (canTokenMove(state, token, dice)) {
      movable.push(token.id);
    }
  }

  return movable;
}

// Execute a move for a specific token
export function executeMove(state, tokenId, dice) {
  const player = state.currentPlayer;
  const tokens = deepCloneTokens(state.tokens);
  const token = tokens[player][tokenId];
  let captured = false;

  if (token.state === "home" && dice === 6) {
    // Move out of home to start position
    token.state = "active";
    token.pathIndex = START_INDEX[player];
    token.homeRunIndex = -1;

    // Check for capture at start position
    captured = checkAndCapture(tokens, player, token.pathIndex, -1);
  } else if (token.state === "active") {
    const relStep = getRelativeStep(token);
    const newRel = relStep + dice;

    if (newRel >= TOTAL_PATH_LENGTH) {
      // Entering or advancing in home run
      const homeIdx = newRel - TOTAL_PATH_LENGTH;
      if (homeIdx >= HOME_RUN_LENGTH) {
        // Exact finish
        token.state = "finished";
        token.pathIndex = -1;
        token.homeRunIndex = -1;
      } else {
        token.homeRunIndex = homeIdx;
        token.pathIndex = -1;
      }
    } else {
      // Move along outer path
      const absIdx = (START_INDEX[player] + newRel) % TOTAL_PATH_LENGTH;
      token.pathIndex = absIdx;

      // Check for capture
      captured = checkAndCapture(tokens, player, absIdx, -1);
    }
  }

  // Check win condition
  const allFinished = tokens[player].every((t) => t.state === "finished");

  // Determine next turn
  const extraTurn = dice === 6 || captured;
  let nextPlayer = player;
  let nextPhase = "roll";
  let consecutiveSixes = extraTurn && dice === 6 ? state.consecutiveSixes + 1 : 0;

  // Three consecutive sixes: lose turn
  if (consecutiveSixes >= 3) {
    nextPlayer = getNextPlayer(player);
    consecutiveSixes = 0;
    nextPhase = "roll";
  } else if (!extraTurn) {
    nextPlayer = getNextPlayer(player);
    consecutiveSixes = 0;
  }

  const nextName = nextPlayer.charAt(0).toUpperCase() + nextPlayer.slice(1);
  const message = allFinished
    ? `${player.charAt(0).toUpperCase() + player.slice(1)} wins!`
    : nextPhase === "roll"
      ? `${nextName} rolls the dice`
      : `${nextName} picks a token`;

  return {
    tokens,
    currentPlayer: nextPlayer,
    diceValue: null,
    diceRolled: false,
    selectedToken: null,
    consecutiveSixes,
    winner: allFinished ? player : null,
    turnPhase: "roll",
    message,
  };
}

function checkAndCapture(tokens, movingPlayer, absPathIndex, homeRunIndex) {
  if (homeRunIndex >= 0) return false; // Can't capture on home run
  if (SAFE_INDICES.has(absPathIndex)) return false;

  let captured = false;
  for (const otherPlayer of PLAYERS) {
    if (otherPlayer === movingPlayer) continue;
    for (const otherToken of tokens[otherPlayer]) {
      if (otherToken.state === "active" && otherToken.homeRunIndex < 0 &&
          otherToken.pathIndex === absPathIndex) {
        // Send token back home
        otherToken.state = "home";
        otherToken.pathIndex = -1;
        otherToken.homeRunIndex = -1;
        captured = true;
      }
    }
  }
  return captured;
}

function getNextPlayer(current) {
  const idx = PLAYERS.indexOf(current);
  return PLAYERS[(idx + 1) % PLAYERS.length];
}

function deepCloneTokens(tokens) {
  const clone = {};
  for (const player of PLAYERS) {
    clone[player] = tokens[player].map((t) => ({ ...t }));
  }
  return clone;
}
