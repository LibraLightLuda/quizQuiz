export const BOARD_SIZE = 8;

export type GardenTone = 'leaf' | 'sun' | 'berry' | 'water' | 'lavender';
export type GardenCell = GardenTone | 'stone' | null;
export type GardenMode = 'classic' | 'daily' | 'timed' | 'stone' | 'items';
export type GardenItem = 'bomb' | 'rotate' | 'reroll' | 'stone';
export type GardenTool = Exclude<GardenItem, 'stone'>;

export interface GardenInventory {
  bomb: number;
  rotate: number;
  reroll: number;
}

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
  rotation?: 0 | 1 | 2 | 3;
}

export interface GardenGame {
  schemaVersion: 1;
  board: GardenCell[];
  tray: Array<GardenPiece | null>;
  /** The first piece that will appear when the current tray is exhausted. */
  nextPiece?: GardenPiece | null;
  /** Shape ids from the current/previous tray, used to avoid repetitive refills. */
  recentShapeIds?: string[];
  mode?: GardenMode;
  dailyDate?: string;
  dailyTargetLines?: number;
  dailyCompleted?: boolean;
  timedEndsAt?: string;
  timeLimitSeconds?: number;
  itemBoard?: Array<GardenItem | null>;
  inventory?: GardenInventory;
  lastCollectedItems?: GardenItem[];
  lastStonesAdded?: number;
  /** Persisted only for deterministic daily challenges. */
  randomState?: number;
  score: number;
  clearedLines: number;
  combo: number;
  turns: number;
  lastCleared: number[];
  lastGain: number;
  maxLinesInMove?: number;
  maxComboInGame?: number;
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
  bestCombo?: number;
  maxLinesInMove?: number;
  dailyCompletedDates?: string[];
  weeklyKey?: string;
  weeklyLines?: number;
  weeklyMultiClears?: number;
  modeHighScores?: Partial<Record<GardenMode, number>>;
}

export interface PlacementResult {
  game: GardenGame;
  placed: boolean;
  clearedNow: number;
  collectedItems?: GardenItem[];
  stonesAdded?: number;
}

export interface BlockGardenModeProps {
  onExit: () => void;
  soundEnabled: boolean;
  animationsEnabled: boolean;
}
