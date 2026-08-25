import {
  BALANCE_DIFFICULTIES,
  BALANCE_SESSION_LENGTH,
  balancePuzzleSignature,
  isBalanced,
  solutionIsUnique
} from './balanceGenerator';
import type {
  BalanceDifficulty,
  BalanceProgress,
  BalancePuzzle,
  BalanceRecords,
  BalanceSide
} from './types';

const PROGRESS_KEY = 'numbercal.balance.progress.v1';
const RECORDS_KEY = 'numbercal.balance.records.v1';

export const DEFAULT_BALANCE_RECORDS: BalanceRecords = {
  schemaVersion: 2,
  lastDifficulty: 'starter',
  completedSessions: 0,
  completedPuzzles: 0,
  byDifficulty: {},
  recentSignatures: [],
  dailyBadges: [],
  tutorialCompleted: false
};

const isDifficulty = (value: unknown): value is BalanceDifficulty =>
  typeof value === 'string' && BALANCE_DIFFICULTIES.includes(value as BalanceDifficulty);
const isSide = (value: unknown): value is BalanceSide => value === 'left' || value === 'right';
const isNonNegativeInteger = (value: unknown): value is number => Number.isInteger(value) && Number(value) >= 0;

const isPuzzle = (value: unknown): value is BalancePuzzle => {
  if (!value || typeof value !== 'object') return false;
  const puzzle = value as Partial<BalancePuzzle>;
  if (typeof puzzle.id !== 'string' || !isDifficulty(puzzle.difficulty)
    || !isNonNegativeInteger(puzzle.baseLeft) || !isNonNegativeInteger(puzzle.baseRight)
    || !Array.isArray(puzzle.allowedSides) || puzzle.allowedSides.length === 0
    || !puzzle.allowedSides.every(isSide) || !Array.isArray(puzzle.weights)
    || !puzzle.solutionPlacements || typeof puzzle.solutionPlacements !== 'object') return false;
  if (puzzle.weights.length < 3 || !puzzle.weights.every((weight) =>
    typeof weight?.id === 'string' && Number.isInteger(weight.value) && weight.value > 0
    && (weight.display === undefined || typeof weight.display === 'string')
    && (weight.accessibleLabel === undefined || typeof weight.accessibleLabel === 'string'))) return false;
  const ids = puzzle.weights.map((weight) => weight.id);
  if (new Set(ids).size !== ids.length || Object.entries(puzzle.solutionPlacements).some(([id, side]) =>
    !ids.includes(id) || !isSide(side) || !puzzle.allowedSides!.includes(side))) return false;
  return solutionIsUnique(puzzle as BalancePuzzle);
};

const migratePuzzle = (value: unknown): BalancePuzzle | null => {
  if (isPuzzle(value)) return value;
  if (!value || typeof value !== 'object') return null;
  const old = value as {
    id?: unknown; difficulty?: unknown; baseLeft?: unknown; baseRight?: unknown;
    movableSide?: unknown; weights?: unknown; solutionWeightIds?: unknown;
  };
  if (typeof old.id !== 'string' || !isDifficulty(old.difficulty)
    || !isNonNegativeInteger(old.baseLeft) || !isNonNegativeInteger(old.baseRight)
    || !isSide(old.movableSide) || !Array.isArray(old.weights) || !Array.isArray(old.solutionWeightIds)) return null;
  const weights = old.weights as BalancePuzzle['weights'];
  if (!weights.every((weight) => typeof weight?.id === 'string' && Number.isInteger(weight.value) && weight.value > 0)) return null;
  const solutionPlacements: Record<string, BalanceSide> = {};
  for (const id of old.solutionWeightIds) {
    if (typeof id !== 'string' || !weights.some((weight) => weight.id === id)) return null;
    solutionPlacements[id] = old.movableSide;
  }
  const puzzle: BalancePuzzle = {
    id: old.id,
    difficulty: old.difficulty,
    baseLeft: old.baseLeft,
    baseRight: old.baseRight,
    allowedSides: [old.movableSide],
    weights,
    solutionPlacements
  };
  return solutionIsUnique(puzzle) ? puzzle : null;
};

const isProgress = (value: unknown): value is BalanceProgress => {
  if (!value || typeof value !== 'object') return false;
  const progress = value as Partial<BalanceProgress>;
  if (progress.schemaVersion !== 2 || typeof progress.id !== 'string' || !isDifficulty(progress.difficulty)
    || !Array.isArray(progress.puzzles) || progress.puzzles.length !== BALANCE_SESSION_LENGTH
    || !progress.puzzles.every(isPuzzle) || !isNonNegativeInteger(progress.puzzleIndex)
    || (progress.puzzleIndex ?? BALANCE_SESSION_LENGTH) >= BALANCE_SESSION_LENGTH
    || !progress.placements || typeof progress.placements !== 'object'
    || !isNonNegativeInteger(progress.completedCount) || !isNonNegativeInteger(progress.moves)
    || ![0, 1, 2].includes(progress.hintLevel ?? -1)
    || !['playing', 'solved'].includes(progress.phase ?? '')
    || typeof progress.daily !== 'boolean' || (progress.daily && typeof progress.dateKey !== 'string')
    || typeof progress.updatedAt !== 'string' || Number.isNaN(Date.parse(progress.updatedAt))) return false;
  const puzzle = progress.puzzles[progress.puzzleIndex!];
  return Object.entries(progress.placements).every(([id, side]) =>
    puzzle.weights.some((weight) => weight.id === id) && isSide(side) && puzzle.allowedSides.includes(side));
};

const migrateProgress = (value: unknown): BalanceProgress | null => {
  if (isProgress(value)) return value;
  if (!value || typeof value !== 'object') return null;
  const old = value as Record<string, unknown>;
  if (old.schemaVersion !== 1 || !isDifficulty(old.difficulty) || !Array.isArray(old.puzzles)
    || old.puzzles.length !== BALANCE_SESSION_LENGTH || !isNonNegativeInteger(old.puzzleIndex)
    || old.puzzleIndex >= BALANCE_SESSION_LENGTH || !Array.isArray(old.placedWeightIds)) return null;
  const puzzles = old.puzzles.map(migratePuzzle);
  if (puzzles.some((puzzle) => !puzzle)) return null;
  const puzzle = puzzles[old.puzzleIndex]!;
  const placements: Record<string, BalanceSide> = {};
  const side = puzzle.allowedSides[0];
  for (const id of old.placedWeightIds) {
    if (typeof id !== 'string' || !puzzle.weights.some((weight) => weight.id === id)) return null;
    placements[id] = side;
  }
  const progress: BalanceProgress = {
    schemaVersion: 2,
    id: `balance-migrated-${String(old.updatedAt ?? Date.now())}`,
    difficulty: old.difficulty,
    puzzles: puzzles as BalancePuzzle[],
    puzzleIndex: old.puzzleIndex,
    placements,
    completedCount: isNonNegativeInteger(old.completedCount) ? old.completedCount : 0,
    moves: isNonNegativeInteger(old.moves) ? old.moves : 0,
    hintLevel: old.hintLevel === 1 || old.hintLevel === 2 ? old.hintLevel : 0,
    phase: isBalanced(puzzle, placements) ? 'solved' : 'playing',
    daily: false,
    updatedAt: typeof old.updatedAt === 'string' && !Number.isNaN(Date.parse(old.updatedAt))
      ? old.updatedAt : new Date().toISOString()
  };
  return progress;
};

export const loadBalanceProgress = (): BalanceProgress | null => {
  try {
    return migrateProgress(JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? 'null'));
  } catch {
    return null;
  }
};

export const saveBalanceProgress = (progress: BalanceProgress): boolean => {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
};

export const clearBalanceProgress = (): boolean => {
  try {
    localStorage.removeItem(PROGRESS_KEY);
    return true;
  } catch {
    return false;
  }
};

const migrateRecords = (value: unknown): BalanceRecords => {
  if (!value || typeof value !== 'object') return DEFAULT_BALANCE_RECORDS;
  const parsed = value as Omit<Partial<BalanceRecords>, 'schemaVersion'> & { schemaVersion?: number };
  if (!isDifficulty(parsed.lastDifficulty)) return DEFAULT_BALANCE_RECORDS;
  if (parsed.schemaVersion === 1) {
    return {
      ...DEFAULT_BALANCE_RECORDS,
      lastDifficulty: parsed.lastDifficulty,
      completedSessions: isNonNegativeInteger(parsed.completedSessions) ? parsed.completedSessions : 0,
      completedPuzzles: isNonNegativeInteger(parsed.completedPuzzles) ? parsed.completedPuzzles : 0
    };
  }
  if (parsed.schemaVersion !== 2 || !isNonNegativeInteger(parsed.completedSessions)
    || !isNonNegativeInteger(parsed.completedPuzzles)) return DEFAULT_BALANCE_RECORDS;
  const byDifficulty: BalanceRecords['byDifficulty'] = {};
  for (const difficulty of BALANCE_DIFFICULTIES) {
    const record = parsed.byDifficulty?.[difficulty];
    if (record && isNonNegativeInteger(record.completedSessions) && isNonNegativeInteger(record.completedPuzzles)
      && (record.bestMoves === undefined || isNonNegativeInteger(record.bestMoves))) byDifficulty[difficulty] = record;
  }
  return {
    schemaVersion: 2,
    lastDifficulty: parsed.lastDifficulty,
    completedSessions: parsed.completedSessions,
    completedPuzzles: parsed.completedPuzzles,
    byDifficulty,
    recentSignatures: Array.isArray(parsed.recentSignatures)
      ? parsed.recentSignatures.filter((item): item is string => typeof item === 'string').slice(-10) : [],
    dailyBadges: Array.isArray(parsed.dailyBadges)
      ? parsed.dailyBadges.filter((item): item is string => typeof item === 'string').slice(-90) : [],
    tutorialCompleted: parsed.tutorialCompleted === true
  };
};

export const loadBalanceRecords = (): BalanceRecords => {
  try {
    return migrateRecords(JSON.parse(localStorage.getItem(RECORDS_KEY) ?? 'null'));
  } catch {
    return DEFAULT_BALANCE_RECORDS;
  }
};

const storeRecords = (records: BalanceRecords): boolean => {
  try {
    localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
    return true;
  } catch {
    return false;
  }
};

export const rememberBalanceDifficulty = (
  records: BalanceRecords,
  difficulty: BalanceDifficulty
): { records: BalanceRecords; saved: boolean } => {
  const next = { ...records, lastDifficulty: difficulty };
  return { records: next, saved: storeRecords(next) };
};

export const completeBalanceTutorial = (records: BalanceRecords): { records: BalanceRecords; saved: boolean } => {
  const next = { ...records, tutorialCompleted: true };
  return { records: next, saved: storeRecords(next) };
};

export const saveBalanceCompletion = (
  records: BalanceRecords,
  progress: BalanceProgress
): { records: BalanceRecords; saved: boolean; isBest: boolean; earnedDailyBadge: boolean } => {
  const previous = records.byDifficulty[progress.difficulty];
  const isBest = previous?.bestMoves === undefined || progress.moves < previous.bestMoves;
  const earnedDailyBadge = Boolean(progress.daily && progress.dateKey && !records.dailyBadges.includes(progress.dateKey));
  const recentSignatures = [
    ...records.recentSignatures,
    ...progress.puzzles.map(balancePuzzleSignature)
  ].slice(-10);
  const next: BalanceRecords = {
    schemaVersion: 2,
    lastDifficulty: progress.difficulty,
    completedSessions: records.completedSessions + 1,
    completedPuzzles: records.completedPuzzles + BALANCE_SESSION_LENGTH,
    byDifficulty: {
      ...records.byDifficulty,
      [progress.difficulty]: {
        completedSessions: (previous?.completedSessions ?? 0) + 1,
        completedPuzzles: (previous?.completedPuzzles ?? 0) + BALANCE_SESSION_LENGTH,
        bestMoves: isBest ? progress.moves : previous?.bestMoves
      }
    },
    recentSignatures,
    dailyBadges: earnedDailyBadge ? [...records.dailyBadges, progress.dateKey!].slice(-90) : records.dailyBadges,
    tutorialCompleted: records.tutorialCompleted
  };
  return { records: next, saved: storeRecords(next), isBest, earnedDailyBadge };
};

export const clearBalanceRecords = (): boolean => {
  try {
    localStorage.removeItem(RECORDS_KEY);
    localStorage.removeItem(PROGRESS_KEY);
    return true;
  } catch {
    return false;
  }
};

export const balanceTodayKey = (date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const balanceSeed = (value: string): number => {
  let hash = 2166136261;
  for (const char of value) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return hash >>> 0;
};
