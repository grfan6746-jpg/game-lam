export type GameType =
  | 'tictactoe'
  | 'dotsboxes'
  | 'battleship'
  | 'connectfour'
  | 'pong'
  | 'snake'
  | 'racing'
  | 'fighting';

export interface GameInfo {
  id: GameType;
  titleFa: string;
  titleEn: string;
  icon: string;
  descriptionFa: string;
  descriptionEn: string;
  category: 'board' | 'arcade' | 'action';
  badge: string;
  gradient: string;
}

export interface Player {
  id: string;
  socketId: string;
  name: string;
  playerNum: 1 | 2;
  connected: boolean;
  score: number;
}

export interface Room {
  id: string;
  gameType: GameType;
  players: Player[];
  status: 'waiting' | 'playing' | 'finished';
  winner: 1 | 2 | 'draw' | null;
  rematchRequested: { [playerNum: number]: boolean };
  gameState: any;
  createdAt: number;
  lastActive: number;
}

// 1. Tic Tac Toe
export interface TicTacToeState {
  board: (number | null)[]; // 9 cells: null, 1, 2
  currentTurn: 1 | 2;
  winningLine: number[] | null;
}

// 2. Dots and Boxes
export interface DotsBoxesState {
  gridSize: number; // 4 dots = 3x3 boxes
  hLines: boolean[][]; // 4 rows x 3 cols
  vLines: boolean[][]; // 3 rows x 4 cols
  boxes: (number | null)[][]; // 3x3: null, 1, 2
  currentTurn: 1 | 2;
  scores: { 1: number; 2: number };
}

// 3. Battleship
export interface Ship {
  name: string;
  size: number;
  placed: boolean;
  coords: { r: number; c: number }[];
  sunk: boolean;
}

export interface BattleshipState {
  phase: 'placement' | 'battle';
  p1Ready: boolean;
  p2Ready: boolean;
  p1Ships: Ship[];
  p2Ships: Ship[];
  p1Grid: ('empty' | 'ship' | 'hit' | 'miss')[][]; // 10x10
  p2Grid: ('empty' | 'ship' | 'hit' | 'miss')[][]; // 10x10
  currentTurn: 1 | 2;
  lastShotResult: { player: 1 | 2; r: number; c: number; result: 'hit' | 'miss' | 'sunk'; shipName?: string } | null;
}

// 4. Connect Four
export interface ConnectFourState {
  grid: (number | null)[][]; // 6 rows x 7 cols
  currentTurn: 1 | 2;
  winningCoords: [number, number][] | null;
  lastDrop: { r: number; c: number } | null;
}

// 5. Pong
export interface PongState {
  ball: { x: number; y: number; vx: number; vy: number; radius: number };
  p1PaddleY: number; // 0 to 100
  p2PaddleY: number;
  paddleHeight: number;
  paddleWidth: number;
  scores: { 1: number; 2: number };
  targetScore: number;
  isPaused: boolean;
}

// 6. Snake
export interface SnakeState {
  gridWidth: number;
  gridHeight: number;
  snake1: { x: number; y: number }[];
  snake2: { x: number; y: number }[];
  dir1: { x: number; y: number };
  dir2: { x: number; y: number };
  food: { x: number; y: number }[];
  scores: { 1: number; 2: number };
  alive1: boolean;
  alive2: boolean;
}

// 7. Racing
export interface CarState {
  x: number;
  y: number;
  angle: number; // in radians
  speed: number;
  lap: number;
  currentCheckpoint: number;
  totalCheckpoints: number;
}

export interface RacingState {
  p1Car: CarState;
  p2Car: CarState;
  targetLaps: number;
}

// 8. Fighting
export interface FighterState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  health: number; // 0 to 100
  isGrounded: boolean;
  isAttacking: boolean;
  attackCooldown: number;
  isDefending: boolean;
  facing: 'left' | 'right';
  roundsWon: number;
  animState: 'idle' | 'run' | 'jump' | 'attack' | 'defend' | 'hit';
}

export interface FightingState {
  p1: FighterState;
  p2: FighterState;
  targetRounds: number;
}

export interface EmoteMessage {
  playerNum: 1 | 2;
  emoji: string;
  id: string;
}
