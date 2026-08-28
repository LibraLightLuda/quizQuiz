import {
  NUMBER_PATH_DIFFICULTIES,
  NUMBER_PATH_SESSION_LENGTH,
  numberPathPuzzleSignature,
  solutionIsUnique,
  validatePath
} from './numberPathGenerator';
import type {
  NumberPathDifficulty,
  NumberPathProgress,
  NumberPathPuzzle,
  NumberPathRecords
} from './types';

const PROGRESS_KEY = 'numbercal.number-path.progress.v1';
const RECORDS_KEY = 'numbercal.number-path.records.v1';

export const DEFAULT_NUMBER_PATH_RECORDS: NumberPathRecords = {
  schemaVersion: 1,
  lastDifficulty: 'starter',
  completedSessions: 0,
  completedPuzzles: 0,
  totalBacktracks: 0,
  hintSessions: 0,
  byDifficulty: {},
  recentSignatures: [],
  dailyBadges: [],
  tutorialCompleted: false
};

const isDifficulty = (value: unknown): value is NumberPathDifficulty =>
  typeof value === 'string' && NUMBER_PATH_DIFFICULTIES.includes(value as NumberPathDifficulty);
const isCount = (value: unknown): value is number => Number.isInteger(value) && Number(value) >= 0;

const isPuzzle = (value: unknown): value is NumberPathPuzzle => {
  if (!value || typeof value !== 'object') return false;
  const puzzle = value as Partial<NumberPathPuzzle>;
  if (typeof puzzle.id !== 'string' || !isDifficulty(puzzle.difficulty)
    || !isCount(puzzle.rows) || !isCount(puzzle.columns) || !Array.isArray(puzzle.cells)
    || typeof puzzle.startCellId !== 'string' || !Array.isArray(puzzle.checkpointCellIds)
    || !puzzle.checkpointCellIds.every((id) => typeof id === 'string')
    || !isCount(puzzle.requiredLength) || !Number.isInteger(puzzle.targetSum)
    || !Array.isArray(puzzle.solutionPath) || !puzzle.solutionPath.every((id) => typeof id === 'string')) return false;
  if (puzzle.endCellId !== undefined && typeof puzzle.endCellId !== 'string') return false;
  if (puzzle.rows! < 2 || puzzle.columns! < 2 || puzzle.cells.length !== puzzle.rows! * puzzle.columns!) return false;
  const ids = new Set<string>();
  const coordinates = new Set<string>();
  for (const cell of puzzle.cells) {
    if (!cell || typeof cell.id !== 'string' || !isCount(cell.row) || !isCount(cell.column)
      || !Number.isInteger(cell.value) || (cell.blocked !== undefined && typeof cell.blocked !== 'boolean')
      || cell.row >= puzzle.rows! || cell.column >= puzzle.columns! || cell.id !== `r${cell.row}c${cell.column}`
      || ids.has(cell.id) || coordinates.has(`${cell.row},${cell.column}`)) return false;
    ids.add(cell.id);
    coordinates.add(`${cell.row},${cell.column}`);
  }
  if (!ids.has(puzzle.startCellId) || puzzle.solutionPath.length !== puzzle.requiredLength
    || puzzle.solutionPath.some((id) => !ids.has(id))
    || puzzle.checkpointCellIds.some((id) => !ids.has(id))
    || (puzzle.endCellId && !ids.has(puzzle.endCellId))) return false;
  return solutionIsUnique(puzzle as NumberPathPuzzle)
    && validatePath(puzzle as NumberPathPuzzle, puzzle.solutionPath).status === 'solved';
};

const isProgress = (value: unknown): value is NumberPathProgress => {
  if (!value || typeof value !== 'object') return false;
  const progress = value as Partial<NumberPathProgress>;
  if (progress.schemaVersion !== 1 || typeof progress.id !== 'string' || !isDifficulty(progress.difficulty)
    || !Array.isArray(progress.puzzles) || progress.puzzles.length !== NUMBER_PATH_SESSION_LENGTH
    || !progress.puzzles.every(isPuzzle) || !isCount(progress.puzzleIndex)
    || progress.puzzleIndex! >= progress.puzzles.length || !Array.isArray(progress.selectedPath)
    || !progress.selectedPath.every((id) => typeof id === 'string')
    || !isCount(progress.completedCount) || !isCount(progress.checks) || !isCount(progress.backtracks)
    || !isCount(progress.hintsUsed) || ![0, 1, 2].includes(progress.hintLevel ?? -1)
    || !['selecting', 'solved'].includes(progress.phase ?? '') || typeof progress.daily !== 'boolean'
    || (progress.daily && typeof progress.dateKey !== 'string')
    || typeof progress.updatedAt !== 'string' || Number.isNaN(Date.parse(progress.updatedAt))) return false;
  const puzzle = progress.puzzles[progress.puzzleIndex!];
  if (progress.puzzles.some((item) => item.difficulty !== progress.difficulty)) return false;
  if (progress.selectedPath.length === 0) {
    return progress.phase === 'selecting' && progress.completedCount === progress.puzzleIndex;
  }
  if (progress.selectedPath[0] !== puzzle.startCellId || progress.selectedPath.length > puzzle.requiredLength
    || new Set(progress.selectedPath).size !== progress.selectedPath.length) return false;
  for (let index = 0; index < progress.selectedPath.length; index += 1) {
    const cell = puzzle.cells.find((item) => item.id === progress.selectedPath![index]);
    if (!cell || cell.blocked) return false;
    if (index > 0) {
      const previous = puzzle.cells.find((item) => item.id === progress.selectedPath![index - 1])!;
      if (Math.abs(previous.row - cell.row) + Math.abs(previous.column - cell.column) !== 1) return false;
    }
  }
  if (progress.completedCount !== progress.puzzleIndex! + (progress.phase === 'solved' ? 1 : 0)) return false;
  return progress.phase !== 'solved' || validatePath(puzzle, progress.selectedPath).status === 'solved';
};

export const loadNumberPathProgress = (): NumberPathProgress | null => {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? 'null');
    return isProgress(value) ? value : null;
  } catch {
    return null;
  }
};

export const saveNumberPathProgress = (progress: NumberPathProgress): boolean => {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
};

export const clearNumberPathProgress = (): boolean => {
  try {
    localStorage.removeItem(PROGRESS_KEY);
    return true;
  } catch {
    return false;
  }
};

const normalizeRecords = (value: unknown): NumberPathRecords => {
  if (!value || typeof value !== 'object') return DEFAULT_NUMBER_PATH_RECORDS;
  const parsed = value as Partial<NumberPathRecords>;
  if (parsed.schemaVersion !== 1 || !isDifficulty(parsed.lastDifficulty)
    || !isCount(parsed.completedSessions) || !isCount(parsed.completedPuzzles)
    || !isCount(parsed.totalBacktracks) || !isCount(parsed.hintSessions)) return DEFAULT_NUMBER_PATH_RECORDS;
  const byDifficulty: NumberPathRecords['byDifficulty'] = {};
  for (const difficulty of NUMBER_PATH_DIFFICULTIES) {
    const record = parsed.byDifficulty?.[difficulty];
    if (record && isCount(record.completedSessions) && isCount(record.completedPuzzles)) byDifficulty[difficulty] = record;
  }
  return {
    schemaVersion: 1,
    lastDifficulty: parsed.lastDifficulty,
    completedSessions: parsed.completedSessions,
    completedPuzzles: parsed.completedPuzzles,
    totalBacktracks: parsed.totalBacktracks,
    hintSessions: parsed.hintSessions,
    byDifficulty,
    recentSignatures: Array.isArray(parsed.recentSignatures)
      ? parsed.recentSignatures.filter((item): item is string => typeof item === 'string').slice(-10) : [],
    dailyBadges: Array.isArray(parsed.dailyBadges)
      ? parsed.dailyBadges.filter((item): item is string => typeof item === 'string').slice(-90) : [],
    tutorialCompleted: parsed.tutorialCompleted === true
  };
};

export const loadNumberPathRecords = (): NumberPathRecords => {
  try {
    return normalizeRecords(JSON.parse(localStorage.getItem(RECORDS_KEY) ?? 'null'));
  } catch {
    return DEFAULT_NUMBER_PATH_RECORDS;
  }
};

const storeRecords = (records: NumberPathRecords): boolean => {
  try {
    localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
    return true;
  } catch {
    return false;
  }
};

export const rememberNumberPathDifficulty = (
  records: NumberPathRecords,
  difficulty: NumberPathDifficulty
): { records: NumberPathRecords; saved: boolean } => {
  const next = { ...records, lastDifficulty: difficulty };
  return { records: next, saved: storeRecords(next) };
};

export const completeNumberPathTutorial = (
  records: NumberPathRecords
): { records: NumberPathRecords; saved: boolean } => {
  const next = { ...records, tutorialCompleted: true };
  return { records: next, saved: storeRecords(next) };
};

export const saveNumberPathCompletion = (
  records: NumberPathRecords,
  progress: NumberPathProgress
): { records: NumberPathRecords; saved: boolean; earnedDailyBadge: boolean } => {
  const previous = records.byDifficulty[progress.difficulty];
  const earnedDailyBadge = Boolean(progress.daily && progress.dateKey && !records.dailyBadges.includes(progress.dateKey));
  const next: NumberPathRecords = {
    schemaVersion: 1,
    lastDifficulty: progress.difficulty,
    completedSessions: records.completedSessions + 1,
    completedPuzzles: records.completedPuzzles + NUMBER_PATH_SESSION_LENGTH,
    totalBacktracks: records.totalBacktracks + progress.backtracks,
    hintSessions: records.hintSessions + (progress.hintsUsed > 0 ? 1 : 0),
    byDifficulty: {
      ...records.byDifficulty,
      [progress.difficulty]: {
        completedSessions: (previous?.completedSessions ?? 0) + 1,
        completedPuzzles: (previous?.completedPuzzles ?? 0) + NUMBER_PATH_SESSION_LENGTH
      }
    },
    recentSignatures: [...records.recentSignatures, ...progress.puzzles.map(numberPathPuzzleSignature)].slice(-10),
    dailyBadges: earnedDailyBadge ? [...records.dailyBadges, progress.dateKey!].slice(-90) : records.dailyBadges,
    tutorialCompleted: records.tutorialCompleted
  };
  return { records: next, saved: storeRecords(next), earnedDailyBadge };
};

export const numberPathTodayKey = (date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const numberPathSeed = (value: string): number => {
  let hash = 2166136261;
  for (const char of value) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return hash >>> 0;
};

export const clearNumberPathRecords = (): boolean => {
  try {
    localStorage.removeItem(RECORDS_KEY);
    return true;
  } catch {
    return false;
  }
};
