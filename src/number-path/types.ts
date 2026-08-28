export type NumberPathDifficulty = 'starter' | 'growing' | 'clever' | 'master';
export type NumberPathPhase = 'selecting' | 'solved' | 'finished';

export interface NumberPathCell {
  id: string;
  row: number;
  column: number;
  value: number;
  blocked?: boolean;
}

export interface NumberPathPuzzle {
  id: string;
  difficulty: NumberPathDifficulty;
  rows: number;
  columns: number;
  cells: NumberPathCell[];
  startCellId: string;
  endCellId?: string;
  checkpointCellIds: string[];
  requiredLength: number;
  targetSum: number;
  solutionPath: string[];
}

export interface NumberPathProgress {
  schemaVersion: 1;
  id: string;
  difficulty: NumberPathDifficulty;
  puzzles: NumberPathPuzzle[];
  puzzleIndex: number;
  selectedPath: string[];
  completedCount: number;
  checks: number;
  backtracks: number;
  hintsUsed: number;
  hintLevel: 0 | 1 | 2;
  phase: NumberPathPhase;
  daily: boolean;
  dateKey?: string;
  updatedAt: string;
}

export interface NumberPathDifficultyRecord {
  completedSessions: number;
  completedPuzzles: number;
}

export interface NumberPathRecords {
  schemaVersion: 1;
  lastDifficulty: NumberPathDifficulty;
  completedSessions: number;
  completedPuzzles: number;
  totalBacktracks: number;
  hintSessions: number;
  byDifficulty: Partial<Record<NumberPathDifficulty, NumberPathDifficultyRecord>>;
  recentSignatures: string[];
  dailyBadges: string[];
  tutorialCompleted: boolean;
}

export type PathValidation =
  | { status: 'incomplete'; remainingCells: number; difference: number }
  | { status: 'too-low'; difference: number }
  | { status: 'too-high'; difference: number }
  | { status: 'wrong-end' }
  | { status: 'missing-checkpoint'; checkpointId: string }
  | { status: 'dead-end' }
  | { status: 'solved'; equation: string };
