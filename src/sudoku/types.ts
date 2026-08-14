export type SudokuDifficulty = 'beginner' | 'growing' | 'classic' | 'master';

export interface SudokuDefinition {
  difficulty: SudokuDifficulty;
  label: string;
  shortLabel: string;
  description: string;
  age: string;
  size: number;
  boxRows: number;
  boxCols: number;
  targetBlanks: number;
  color: string;
}

export interface SudokuPuzzle {
  id: string;
  difficulty: SudokuDifficulty;
  size: number;
  boxRows: number;
  boxCols: number;
  puzzle: number[];
  solution: number[];
}

export interface SudokuProgress {
  schemaVersion: 1;
  puzzle: SudokuPuzzle;
  grid: number[];
  hinted: boolean[];
  elapsedMs: number;
  updatedAt: string;
  daily: boolean;
}

export interface SudokuRecord {
  bestTimeMs: number;
  completedCount: number;
  completedAt: string;
}

export interface SudokuRecords {
  schemaVersion: 1;
  lastDifficulty: SudokuDifficulty;
  byDifficulty: Partial<Record<SudokuDifficulty, SudokuRecord>>;
}
