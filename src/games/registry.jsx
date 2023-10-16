import TicTacToeGame from "./tic-tac-toe/TicTacToeGame";
import Connect4Game from "./connect-4/Connect4Game";
import CheckersGame from "./checkers/CheckersGame";
import MemoryMatchGame from "./memory-match/MemoryMatchGame";
import RockPaperScissorsGame from "./rock-paper-scissors/RockPaperScissorsGame";
import PongGame from "./pong/PongGame";
import SnakeGame from "./snake/SnakeGame";
import MinesweeperGame from "./minesweeper/MinesweeperGame";
import Game2048 from "./2048/Game2048";
import BrickBreakerGame from "./brick-breaker/BrickBreakerGame";
import TetrisGame from "./tetris/TetrisGame";
import AirHockeyGame from "./air-hockey/AirHockeyGame";
import ChessGame from "./chess/ChessGame";
import LudoGame from "./ludo/LudoGame";
import WordleGame from "./wordle/WordleGame";

export const GAME_COMPONENTS = {
  "2048": Game2048,
  "air-hockey": AirHockeyGame,
  "connect-4": Connect4Game,
  checkers: CheckersGame,
  "memory-match": MemoryMatchGame,
  "rock-paper-scissors": RockPaperScissorsGame,
  "brick-breaker": BrickBreakerGame,
  chess: ChessGame,
  ludo: LudoGame,
  minesweeper: MinesweeperGame,
  pong: PongGame,
  snake: SnakeGame,
  tetris: TetrisGame,
  "tic-tac-toe": TicTacToeGame,
  wordle: WordleGame,
};
