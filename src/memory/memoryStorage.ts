import { MEMORY_DIFFICULTIES, MEMORY_MODES, memoryDifficultyInfo } from './memoryData';
import { layoutSignature } from './memoryGenerator';
import type { MemoryCard, MemoryDifficulty, MemoryMode, MemoryProgress, MemoryRecords } from './types';

const PROGRESS_KEY = 'numbercal.memory.progress.v1';
const RECORDS_KEY = 'numbercal.memory.records.v1';

export const DEFAULT_MEMORY_RECORDS: MemoryRecords = {
  schemaVersion: 1,
  lastMode: 'mixed',
  lastDifficulty: 'starter',
  byLevel: {},
  dailyBadges: [],
  recentLayouts: []
};

const isMode = (value: unknown): value is MemoryMode => MEMORY_MODES.includes(value as MemoryMode);
const isDifficulty = (value: unknown): value is MemoryDifficulty => MEMORY_DIFFICULTIES.includes(value as MemoryDifficulty);
const isFiniteNonNegative = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;

const isCard = (value: unknown): value is MemoryCard => {
  if (!value || typeof value !== 'object') return false;
  const card = value as Partial<MemoryCard>;
  return typeof card.id === 'string' && typeof card.pairId === 'string' && typeof card.content === 'string'
    && ['math', 'korean', 'english'].includes(card.category ?? '')
    && (card.side === 'question' || card.side === 'answer');
};

const isProgress = (value: unknown): value is MemoryProgress => {
  if (!value || typeof value !== 'object') return false;
  const progress = value as Partial<MemoryProgress>;
  if (progress.schemaVersion !== 1 || typeof progress.id !== 'string' || !isMode(progress.mode)
    || !isDifficulty(progress.difficulty) || !Array.isArray(progress.cards)
    || progress.cards.length !== memoryDifficultyInfo[progress.difficulty].pairCount * 2
    || !progress.cards.every(isCard) || new Set(progress.cards.map((card) => card.id)).size !== progress.cards.length) return false;
  const cardIds = new Set(progress.cards.map((card) => card.id));
  const pairCounts = new Map<string, number>();
  progress.cards.forEach((card) => pairCounts.set(card.pairId, (pairCounts.get(card.pairId) ?? 0) + 1));
  if ([...pairCounts.values()].some((count) => count !== 2)) return false;
  if (!Array.isArray(progress.matchedCardIds) || !Array.isArray(progress.selectedCardIds)
    || progress.matchedCardIds.some((id) => !cardIds.has(id)) || progress.selectedCardIds.some((id) => !cardIds.has(id))
    || progress.selectedCardIds.length > 2) return false;
  return Number.isInteger(progress.attempts) && (progress.attempts ?? -1) >= 0
    && Number.isInteger(progress.correctAttempts) && (progress.correctAttempts ?? -1) >= 0
    && Number.isInteger(progress.combo) && (progress.combo ?? -1) >= 0
    && Number.isInteger(progress.bestCombo) && (progress.bestCombo ?? -1) >= 0
    && isFiniteNonNegative(progress.elapsedMs)
    && typeof progress.updatedAt === 'string' && !Number.isNaN(Date.parse(progress.updatedAt))
    && typeof progress.daily === 'boolean'
    && (!progress.daily || typeof progress.dateKey === 'string');
};

export const loadMemoryProgress = (): MemoryProgress | null => {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? 'null');
    if (!isProgress(parsed)) return null;
    return { ...parsed, selectedCardIds: parsed.selectedCardIds.length > 1 ? [] : parsed.selectedCardIds };
  } catch {
    return null;
  }
};

export const saveMemoryProgress = (progress: MemoryProgress): boolean => {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
};

export const clearMemoryProgress = (): boolean => {
  try {
    localStorage.removeItem(PROGRESS_KEY);
    return true;
  } catch {
    return false;
  }
};

export const loadMemoryRecords = (): MemoryRecords => {
  try {
    const value = JSON.parse(localStorage.getItem(RECORDS_KEY) ?? 'null') as Partial<MemoryRecords> | null;
    if (!value || value.schemaVersion !== 1 || !isMode(value.lastMode) || !isDifficulty(value.lastDifficulty)) {
      return DEFAULT_MEMORY_RECORDS;
    }
    const byLevel: MemoryRecords['byLevel'] = {};
    for (const [key, record] of Object.entries(value.byLevel ?? {})) {
      if (!record || !isFiniteNonNegative(record.bestTimeMs) || !Number.isInteger(record.minAttempts)
        || record.minAttempts < 1 || !isFiniteNonNegative(record.bestAccuracy) || record.bestAccuracy > 100
        || !Number.isInteger(record.completedCount) || record.completedCount < 1
        || !Number.isInteger(record.totalStars) || record.totalStars < 1
        || typeof record.completedAt !== 'string' || Number.isNaN(Date.parse(record.completedAt))) continue;
      byLevel[key] = record;
    }
    return {
      schemaVersion: 1,
      lastMode: value.lastMode,
      lastDifficulty: value.lastDifficulty,
      byLevel,
      dailyBadges: Array.isArray(value.dailyBadges) ? value.dailyBadges.filter((item): item is string => typeof item === 'string').slice(-90) : [],
      recentLayouts: Array.isArray(value.recentLayouts) ? value.recentLayouts.filter((item): item is string => typeof item === 'string').slice(-8) : []
    };
  } catch {
    return DEFAULT_MEMORY_RECORDS;
  }
};

const storeRecords = (records: MemoryRecords): boolean => {
  try {
    localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
    return true;
  } catch {
    return false;
  }
};

export const rememberMemoryChoice = (
  records: MemoryRecords, mode: MemoryMode, difficulty: MemoryDifficulty
): MemoryRecords => {
  const next = { ...records, lastMode: mode, lastDifficulty: difficulty };
  storeRecords(next);
  return next;
};

export const saveMemoryCompletion = (
  records: MemoryRecords,
  progress: MemoryProgress,
  elapsedMs: number,
  accuracy: number,
  stars: number
): { records: MemoryRecords; isBestTime: boolean; isBestAttempts: boolean; earnedDailyBadge: boolean; saved: boolean } => {
  const key = `${progress.mode}:${progress.difficulty}`;
  const previous = records.byLevel[key];
  const isBestTime = !previous || elapsedMs < previous.bestTimeMs;
  const isBestAttempts = !previous || progress.attempts < previous.minAttempts;
  const earnedDailyBadge = Boolean(progress.daily && progress.dateKey && !records.dailyBadges.includes(progress.dateKey));
  const next: MemoryRecords = {
    schemaVersion: 1,
    lastMode: progress.mode,
    lastDifficulty: progress.difficulty,
    byLevel: {
      ...records.byLevel,
      [key]: {
        bestTimeMs: isBestTime ? elapsedMs : previous.bestTimeMs,
        minAttempts: isBestAttempts ? progress.attempts : previous.minAttempts,
        bestAccuracy: Math.max(previous?.bestAccuracy ?? 0, accuracy),
        completedCount: (previous?.completedCount ?? 0) + 1,
        totalStars: (previous?.totalStars ?? 0) + stars,
        completedAt: new Date().toISOString()
      }
    },
    dailyBadges: earnedDailyBadge ? [...records.dailyBadges, progress.dateKey!].slice(-90) : records.dailyBadges,
    recentLayouts: [layoutSignature(progress.cards), ...records.recentLayouts.filter((item) => item !== layoutSignature(progress.cards))].slice(0, 8)
  };
  return { records: next, isBestTime, isBestAttempts, earnedDailyBadge, saved: storeRecords(next) };
};
