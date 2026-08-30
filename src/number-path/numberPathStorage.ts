import {
  NUMBER_PATH_DIFFICULTIES,
  NUMBER_PATH_SESSION_LENGTH,
  nodeAfterPath,
  numberPathPuzzleSignature,
  outgoingBridges,
  solutionIsUnique,
  validatePath
} from './numberPathGenerator';
import type {
  NumberPathDifficulty,
  NumberPathProgress,
  NumberPathPuzzle,
  NumberPathRecords
} from './types';

const PROGRESS_KEY = 'numbercal.number-path.progress.v2';
const LEGACY_PROGRESS_KEY = 'numbercal.number-path.progress.v1';
const RECORDS_KEY = 'numbercal.number-path.records.v1';

export const DEFAULT_NUMBER_PATH_RECORDS: NumberPathRecords = {
  schemaVersion: 2,
  lastDifficulty: 'starter',
  completedSessions: 0,
  completedPuzzles: 0,
  totalBacktracks: 0,
  totalBridgeFailures: 0,
  totalRetries: 0,
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
    || !Array.isArray(puzzle.nodes) || !Array.isArray(puzzle.bridges)
    || typeof puzzle.startNodeId !== 'string' || typeof puzzle.endNodeId !== 'string'
    || !isCount(puzzle.requiredCrossings) || puzzle.requiredCrossings! < 4 || puzzle.requiredCrossings! > 7
    || !Number.isInteger(puzzle.targetSum) || !Array.isArray(puzzle.requiredMarkerBridgeIds)
    || !puzzle.requiredMarkerBridgeIds.every((id) => typeof id === 'string')
    || !Array.isArray(puzzle.solutionBridgeIds)
    || !puzzle.solutionBridgeIds.every((id) => typeof id === 'string')) return false;

  const nodeIds = new Set<string>();
  for (const node of puzzle.nodes) {
    if (!node || typeof node.id !== 'string' || !isCount(node.layer) || !isCount(node.lane)
      || !['start', 'junction', 'end'].includes(node.kind) || nodeIds.has(node.id)) return false;
    nodeIds.add(node.id);
  }
  if (!nodeIds.has(puzzle.startNodeId) || !nodeIds.has(puzzle.endNodeId)) return false;

  const bridgeIds = new Set<string>();
  const outgoingCounts = new Map<string, number>();
  for (const bridge of puzzle.bridges) {
    if (!bridge || typeof bridge.id !== 'string' || typeof bridge.fromNodeId !== 'string'
      || typeof bridge.toNodeId !== 'string' || !Number.isInteger(bridge.value)
      || (bridge.marker !== undefined && !['key', 'star'].includes(bridge.marker))
      || (bridge.markerOrder !== undefined && ![1, 2].includes(bridge.markerOrder))
      || bridgeIds.has(bridge.id) || !nodeIds.has(bridge.fromNodeId) || !nodeIds.has(bridge.toNodeId)) return false;
    const from = puzzle.nodes.find((node) => node.id === bridge.fromNodeId)!;
    const to = puzzle.nodes.find((node) => node.id === bridge.toNodeId)!;
    if (to.layer !== from.layer + 1) return false;
    bridgeIds.add(bridge.id);
    outgoingCounts.set(bridge.fromNodeId, (outgoingCounts.get(bridge.fromNodeId) ?? 0) + 1);
  }
  if ([...outgoingCounts.values()].some((count) => count > 3)
    || puzzle.solutionBridgeIds.length !== puzzle.requiredCrossings
    || puzzle.solutionBridgeIds.some((id) => !bridgeIds.has(id))
    || puzzle.requiredMarkerBridgeIds.some((id) => !bridgeIds.has(id))) return false;
  return solutionIsUnique(puzzle as NumberPathPuzzle)
    && validatePath(puzzle as NumberPathPuzzle, puzzle.solutionBridgeIds).status === 'solved';
};

const isProgress = (value: unknown): value is NumberPathProgress => {
  if (!value || typeof value !== 'object') return false;
  const progress = value as Partial<NumberPathProgress>;
  if (progress.schemaVersion !== 2 || typeof progress.id !== 'string' || !isDifficulty(progress.difficulty)
    || !Array.isArray(progress.puzzles) || progress.puzzles.length !== NUMBER_PATH_SESSION_LENGTH
    || !progress.puzzles.every(isPuzzle) || !isCount(progress.puzzleIndex)
    || progress.puzzleIndex! >= progress.puzzles.length || typeof progress.currentNodeId !== 'string'
    || !Array.isArray(progress.selectedBridgeIds) || !progress.selectedBridgeIds.every((id) => typeof id === 'string')
    || !Array.isArray(progress.failedBridgeIds) || !progress.failedBridgeIds.every((id) => typeof id === 'string')
    || !isCount(progress.lives) || progress.lives! > 3 || !isCount(progress.completedCount)
    || !isCount(progress.backtracks) || !isCount(progress.bridgeFailures) || !isCount(progress.retries)
    || !isCount(progress.hintsUsed) || ![0, 1, 2].includes(progress.hintLevel ?? -1)
    || !['selecting', 'rescue', 'solved'].includes(progress.phase ?? '') || typeof progress.daily !== 'boolean'
    || (progress.daily && typeof progress.dateKey !== 'string')
    || typeof progress.updatedAt !== 'string' || Number.isNaN(Date.parse(progress.updatedAt))) return false;

  const puzzle = progress.puzzles[progress.puzzleIndex!];
  if (progress.puzzles.some((item) => item.difficulty !== progress.difficulty)
    || new Set(progress.selectedBridgeIds).size !== progress.selectedBridgeIds.length
    || new Set(progress.failedBridgeIds).size !== progress.failedBridgeIds.length
    || nodeAfterPath(puzzle, progress.selectedBridgeIds) !== progress.currentNodeId) return false;
  const outgoing = new Set(outgoingBridges(puzzle, progress.currentNodeId).map((bridge) => bridge.id));
  if (progress.failedBridgeIds.some((id) => !outgoing.has(id))
    || (progress.revealedBridgeId !== undefined && !puzzle.bridges.some((bridge) => bridge.id === progress.revealedBridgeId))
    || progress.completedCount !== progress.puzzleIndex! + (progress.phase === 'solved' ? 1 : 0)
    || (progress.phase === 'rescue') !== (progress.lives === 0)
    || (progress.phase === 'selecting' && progress.lives === 0)) return false;
  return progress.phase !== 'solved' || validatePath(puzzle, progress.selectedBridgeIds).status === 'solved';
};

export const loadNumberPathProgress = (): NumberPathProgress | null => {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? 'null');
    if (isProgress(value)) return value;
    if (localStorage.getItem(LEGACY_PROGRESS_KEY) !== null) localStorage.removeItem(LEGACY_PROGRESS_KEY);
    return null;
  } catch {
    return null;
  }
};

export const saveNumberPathProgress = (progress: NumberPathProgress): boolean => {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    localStorage.removeItem(LEGACY_PROGRESS_KEY);
    return true;
  } catch {
    return false;
  }
};

export const clearNumberPathProgress = (): boolean => {
  try {
    localStorage.removeItem(PROGRESS_KEY);
    localStorage.removeItem(LEGACY_PROGRESS_KEY);
    return true;
  } catch {
    return false;
  }
};

const normalizeRecords = (value: unknown): NumberPathRecords => {
  if (!value || typeof value !== 'object') return DEFAULT_NUMBER_PATH_RECORDS;
  const parsed = value as Partial<NumberPathRecords> & { schemaVersion?: number };
  if (![1, 2].includes(parsed.schemaVersion ?? 0) || !isDifficulty(parsed.lastDifficulty)
    || !isCount(parsed.completedSessions) || !isCount(parsed.completedPuzzles)
    || !isCount(parsed.totalBacktracks) || !isCount(parsed.hintSessions)) return DEFAULT_NUMBER_PATH_RECORDS;
  const byDifficulty: NumberPathRecords['byDifficulty'] = {};
  for (const difficulty of NUMBER_PATH_DIFFICULTIES) {
    const record = parsed.byDifficulty?.[difficulty];
    if (record && isCount(record.completedSessions) && isCount(record.completedPuzzles)) byDifficulty[difficulty] = record;
  }
  return {
    schemaVersion: 2,
    lastDifficulty: parsed.lastDifficulty,
    completedSessions: parsed.completedSessions,
    completedPuzzles: parsed.completedPuzzles,
    totalBacktracks: parsed.totalBacktracks,
    totalBridgeFailures: isCount(parsed.totalBridgeFailures) ? parsed.totalBridgeFailures : 0,
    totalRetries: isCount(parsed.totalRetries) ? parsed.totalRetries : 0,
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
    const records = normalizeRecords(JSON.parse(localStorage.getItem(RECORDS_KEY) ?? 'null'));
    if (records !== DEFAULT_NUMBER_PATH_RECORDS) localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
    return records;
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
    schemaVersion: 2,
    lastDifficulty: progress.difficulty,
    completedSessions: records.completedSessions + 1,
    completedPuzzles: records.completedPuzzles + NUMBER_PATH_SESSION_LENGTH,
    totalBacktracks: records.totalBacktracks + progress.backtracks,
    totalBridgeFailures: records.totalBridgeFailures + progress.bridgeFailures,
    totalRetries: records.totalRetries + progress.retries,
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
