import { isValidSolution, SUDOKU_DIFFICULTIES, sudokuDefinitions } from './sudokuGenerator';
import type { SudokuDifficulty, SudokuProgress, SudokuRecord, SudokuRecords } from './types';

const PROGRESS_KEY = 'numbercal.sudoku.progress.v1';
const RECORDS_KEY = 'numbercal.sudoku.records.v1';

export const DEFAULT_SUDOKU_RECORDS: SudokuRecords = {
  schemaVersion: 1,
  lastDifficulty: 'beginner',
  byDifficulty: {}
};

const isDifficulty = (value: unknown): value is SudokuDifficulty =>
  typeof value === 'string' && SUDOKU_DIFFICULTIES.includes(value as SudokuDifficulty);

const isFiniteNonNegative = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

const isProgress = (value: unknown): value is SudokuProgress => {
  if (!value || typeof value !== 'object') return false;
  const progress = value as Partial<SudokuProgress>;
  const puzzle = progress.puzzle;
  if (progress.schemaVersion !== 1 || !puzzle || !isDifficulty(puzzle.difficulty)) return false;
  const definition = sudokuDefinitions[puzzle.difficulty];
  const length = definition.size * definition.size;
  if (puzzle.size !== definition.size || puzzle.boxRows !== definition.boxRows || puzzle.boxCols !== definition.boxCols
    || typeof puzzle.id !== 'string' || !Array.isArray(puzzle.puzzle) || !Array.isArray(puzzle.solution)
    || puzzle.puzzle.length !== length || puzzle.solution.length !== length
    || !isValidSolution(puzzle.solution, puzzle.size, puzzle.boxRows, puzzle.boxCols)) return false;
  if (!puzzle.puzzle.every((cell, index) => Number.isInteger(cell) && cell >= 0 && cell <= puzzle.size
    && (cell === 0 || cell === puzzle.solution[index]))) return false;
  if (!Array.isArray(progress.grid) || progress.grid.length !== length
    || !progress.grid.every((cell, index) => Number.isInteger(cell) && cell >= 0 && cell <= puzzle.size
      && (puzzle.puzzle[index] === 0 || cell === puzzle.puzzle[index]))) return false;
  return Array.isArray(progress.hinted) && progress.hinted.length === length
    && progress.hinted.every((cell) => typeof cell === 'boolean')
    && isFiniteNonNegative(progress.elapsedMs)
    && typeof progress.updatedAt === 'string' && !Number.isNaN(Date.parse(progress.updatedAt))
    && typeof progress.daily === 'boolean';
};

const isRecord = (value: unknown): value is SudokuRecord => {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<SudokuRecord>;
  return isFiniteNonNegative(record.bestTimeMs) && Number.isInteger(record.completedCount) && (record.completedCount ?? 0) > 0
    && typeof record.completedAt === 'string' && !Number.isNaN(Date.parse(record.completedAt));
};

export const loadSudokuProgress = (): SudokuProgress | null => {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? 'null');
    return isProgress(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const saveSudokuProgress = (progress: SudokuProgress): boolean => {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
};

export const clearSudokuProgress = (): boolean => {
  try {
    localStorage.removeItem(PROGRESS_KEY);
    return true;
  } catch {
    return false;
  }
};

export const loadSudokuRecords = (): SudokuRecords => {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECORDS_KEY) ?? 'null') as Partial<SudokuRecords> | null;
    if (!parsed || parsed.schemaVersion !== 1 || !isDifficulty(parsed.lastDifficulty)) return DEFAULT_SUDOKU_RECORDS;
    const byDifficulty: SudokuRecords['byDifficulty'] = {};
    for (const difficulty of SUDOKU_DIFFICULTIES) {
      const record = parsed.byDifficulty?.[difficulty];
      if (isRecord(record)) byDifficulty[difficulty] = record;
    }
    return { schemaVersion: 1, lastDifficulty: parsed.lastDifficulty, byDifficulty };
  } catch {
    return DEFAULT_SUDOKU_RECORDS;
  }
};

const storeRecords = (records: SudokuRecords): boolean => {
  try {
    localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
    return true;
  } catch {
    return false;
  }
};

export const rememberSudokuDifficulty = (records: SudokuRecords, difficulty: SudokuDifficulty): SudokuRecords => {
  const next = { ...records, lastDifficulty: difficulty };
  storeRecords(next);
  return next;
};

export const saveSudokuCompletion = (
  records: SudokuRecords, difficulty: SudokuDifficulty, elapsedMs: number
): { records: SudokuRecords; isBest: boolean; saved: boolean } => {
  const previous = records.byDifficulty[difficulty];
  const isBest = !previous || elapsedMs < previous.bestTimeMs;
  const nextRecord: SudokuRecord = {
    bestTimeMs: isBest ? elapsedMs : previous.bestTimeMs,
    completedCount: (previous?.completedCount ?? 0) + 1,
    completedAt: new Date().toISOString()
  };
  const next: SudokuRecords = {
    schemaVersion: 1,
    lastDifficulty: difficulty,
    byDifficulty: { ...records.byDifficulty, [difficulty]: nextRecord }
  };
  return { records: next, isBest, saved: storeRecords(next) };
};

export const recommendedSudokuDifficulty = (records: SudokuRecords): SudokuDifficulty => {
  if ((records.byDifficulty.classic?.completedCount ?? 0) >= 2) return 'master';
  if ((records.byDifficulty.growing?.completedCount ?? 0) >= 2) return 'classic';
  if ((records.byDifficulty.beginner?.completedCount ?? 0) >= 2) return 'growing';
  return records.byDifficulty[records.lastDifficulty] ? records.lastDifficulty : 'beginner';
};
