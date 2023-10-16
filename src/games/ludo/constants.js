// Board geometry
export const CELL = 40;
export const BOARD_CELLS = 15;
export const BOARD_SIZE = BOARD_CELLS * CELL; // 600px

export const CANVAS_W = 780;
export const CANVAS_H = 650;
export const BOARD_OX = 14;
export const BOARD_OY = 25;

// Player colors
export const PLAYERS = ["red", "green", "yellow", "blue"];
export const TOKENS_PER_PLAYER = 4;

export const PLAYER_COLORS = {
  red:    { fill: "#e74c3c", light: "#f1948a", dark: "#c0392b", text: "#fff" },
  green:  { fill: "#27ae60", light: "#82e0aa", dark: "#1e8449", text: "#fff" },
  yellow: { fill: "#f1c40f", light: "#f9e154", dark: "#d4ac0d", text: "#333" },
  blue:   { fill: "#2980b9", light: "#85c1e9", dark: "#1f618d", text: "#fff" },
};

// 52-cell outer path (row, col) in board-grid coords (0-14)
// Starts at red's entry, goes clockwise
export const OUTER_PATH = [
  [6,1],[6,2],[6,3],[6,4],[6,5],           // 0-4   bottom-left going right
  [5,6],[4,6],[3,6],[2,6],[1,6],[0,6],     // 5-10  left col going up
  [0,7],[0,8],                              // 11-12 top-left corner across
  [1,8],[2,8],[3,8],[4,8],[5,8],           // 13-17 right of top going down
  [6,9],[6,10],[6,11],[6,12],[6,13],[6,14],// 18-23 top-right going right
  [7,14],[8,14],                            // 24-25 right side corner down
  [8,13],[8,12],[8,11],[8,10],[8,9],       // 26-30 bottom of right going left
  [9,8],[10,8],[11,8],[12,8],[13,8],[14,8],// 31-36 right col going down
  [14,7],[14,6],                            // 37-38 bottom-right corner across
  [13,6],[12,6],[11,6],[10,6],[9,6],       // 39-43 left of bottom going up
  [8,5],[8,4],[8,3],[8,2],[8,1],[8,0],     // 44-49 bottom-left going left
  [7,0],[6,0],                              // 50-51 left side corner up
];

// Each player's start position on outer path (where they enter after rolling 6)
export const START_INDEX = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39,
};

// Home-run paths (the colored lane leading to center, 6 cells each)
export const HOME_RUNS = {
  red:    [[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]],
  green:  [[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]],
  yellow: [[7,13],[7,12],[7,11],[7,10],[7,9],[7,8]],
  blue:   [[13,7],[12,7],[11,7],[10,7],[9,7],[8,7]],
};

// Safe squares on the outer path (indices) - start positions + star squares
export const SAFE_INDICES = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

// Home base positions (where tokens sit before entering the board)
// Each player has 4 token positions in their quadrant
export const HOME_BASES = {
  red:    [[2,2],[2,4],[4,2],[4,4]],
  green:  [[2,10],[2,12],[4,10],[4,12]],
  yellow: [[10,10],[10,12],[12,10],[12,12]],
  blue:   [[10,2],[10,4],[12,2],[12,4]],
};

// The outer-path index where each player enters their home run
// (the cell just before they turn into the home lane)
export const HOME_ENTRY_INDEX = {
  red: 50,
  green: 11,
  yellow: 24,
  blue: 37,
};

export const TOTAL_PATH_LENGTH = 52;
export const HOME_RUN_LENGTH = 6;
