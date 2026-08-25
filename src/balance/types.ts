export type BalanceDifficulty = 'starter' | 'growing' | 'clever' | 'master';
export type BalanceSide = 'left' | 'right';
export type BalancePhase = 'playing' | 'solved' | 'finished';

export interface BalanceWeight {
  id: string;
  value: number;
  display?: string;
  accessibleLabel?: string;
}

export interface BalancePuzzle {
  id: string;
  difficulty: BalanceDifficulty;
  baseLeft: number;
  baseRight: number;
  allowedSides: BalanceSide[];
  weights: BalanceWeight[];
  solutionPlacements: Record<string, BalanceSide>;
  clue?: string;
}

export interface BalanceProgress {
  schemaVersion: 2;
  id: string;
  difficulty: BalanceDifficulty;
  puzzles: BalancePuzzle[];
  puzzleIndex: number;
  placements: Record<string, BalanceSide>;
  completedCount: number;
  moves: number;
  hintLevel: 0 | 1 | 2;
  phase: BalancePhase;
  daily: boolean;
  dateKey?: string;
  updatedAt: string;
}

export interface BalanceDifficultyRecord {
  completedSessions: number;
  completedPuzzles: number;
  bestMoves?: number;
}

export interface BalanceRecords {
  schemaVersion: 2;
  lastDifficulty: BalanceDifficulty;
  completedSessions: number;
  completedPuzzles: number;
  byDifficulty: Partial<Record<BalanceDifficulty, BalanceDifficultyRecord>>;
  recentSignatures: string[];
  dailyBadges: string[];
  tutorialCompleted: boolean;
}
