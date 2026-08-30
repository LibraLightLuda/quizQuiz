export type ShapeBlockGameMode = 'tangram' | 'line-clear';
export type TangramTier = 'starter' | 'growing' | 'clever';
export type TangramPieceKind = 'large' | 'medium' | 'small' | 'square' | 'parallelogram';

export interface Point { x: number; y: number }

export interface TangramPieceDefinition {
  id: string;
  kind: TangramPieceKind;
  label: string;
  color: string;
  points: Point[];
}

export interface TangramTransform {
  x: number;
  y: number;
  rotation: number;
  flipped: boolean;
}

export interface TangramTarget extends TangramTransform {
  id: string;
  kind: TangramPieceKind;
}

export interface TangramPuzzle {
  id: string;
  title: string;
  icon: string;
  tier: TangramTier;
  targets: TangramTarget[];
}

export interface TangramPieceState extends TangramTransform {
  pieceId: string;
  targetId?: string;
}

export interface TangramProgress {
  schemaVersion: 1;
  puzzleId: string;
  dailyDateKey?: string;
  pieces: TangramPieceState[];
  hintLevel: 0 | 1 | 2 | 3 | 4;
  updatedAt: string;
}

export type LineCell = string | null;
export interface LineBlock {
  id: string;
  shapeId: string;
  rotation: number;
  cells: Point[];
  color: string;
}

export interface LineClearProgress {
  schemaVersion: 1;
  id: string;
  board: LineCell[];
  tray: LineBlock[];
  score: number;
  clearedLines: number;
  bestSingleClear: number;
  phase: 'playing' | 'finished';
  updatedAt: string;
}

export interface ShapeBlockRecords {
  schemaVersion: 1;
  lastMode: ShapeBlockGameMode;
  tutorialCompleted: boolean;
  tangramStars: Record<string, number>;
  lineHighScore: number;
  lineGames: number;
  totalLines: number;
  bestSingleClear: number;
  recentLineCompletionIds: string[];
  dailyBadges: string[];
}

export interface ShapeBlockModeProps {
  onExit: () => void;
  soundEnabled: boolean;
  animationsEnabled: boolean;
  hapticsEnabled: boolean;
  startDaily?: boolean;
}
