export const BOARD_SIZE = 8;

export type GardenTone = 'leaf' | 'sun' | 'berry' | 'water' | 'lavender';
export type GardenCell = GardenTone | null;

export interface Point {
  row: number;
  column: number;
}

export interface GardenShape {
  id: string;
  label: string;
  cells: readonly Point[];
  weight: number;
}

export interface GardenPiece {
  uid: string;
  shapeId: string;
  tone: GardenTone;
}

export interface GardenGame {
  schemaVersion: 1;
  board: GardenCell[];
  tray: Array<GardenPiece | null>;
  score: number;
  clearedLines: number;
  combo: number;
  turns: number;
  lastCleared: number[];
  lastGain: number;
  status: 'playing' | 'game-over';
  updatedAt: string;
}

export interface GardenRecords {
  schemaVersion: 1;
  highScore: number;
  bestLines: number;
  gamesPlayed: number;
  /** Prevents a finished game from being counted twice after a storage retry. */
  lastFinishedGameKey?: string;
}

export interface PlacementResult {
  game: GardenGame;
  placed: boolean;
  clearedNow: number;
}

export interface BlockGardenModeProps {
  onExit: () => void;
  soundEnabled: boolean;
  animationsEnabled: boolean;
}
