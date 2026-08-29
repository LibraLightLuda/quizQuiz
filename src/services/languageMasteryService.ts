import type {
  LanguageMasteryEntry, LanguageMasteryStage, LanguageMode, Resolution, StoredLanguageMastery
} from '../domain/types';

const MASTERY_KEY = 'numbercal.language-mastery.v1';
const MAX_ENTRIES = 1200;
const DAY_MS = 24 * 60 * 60 * 1000;

const languageModes: LanguageMode[] = ['ko-fill', 'ko-listen', 'ko-adventure', 'en-fill', 'en-listen', 'en-adventure'];
const stages: LanguageMasteryStage[] = ['new', 'learning', 'almost', 'mastered', 'review'];

export const masteryKey = (mode: LanguageMode, wordId: string): string => `${mode}:${wordId}`;

const isEntry = (value: unknown): value is LanguageMasteryEntry => {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Partial<LanguageMasteryEntry>;
  return typeof entry.key === 'string'
    && typeof entry.wordId === 'string'
    && languageModes.includes(entry.mode as LanguageMode)
    && stages.includes(entry.stage as LanguageMasteryStage)
    && Number.isInteger(entry.attempts) && (entry.attempts ?? -1) >= 0
    && Number.isInteger(entry.correctCount) && (entry.correctCount ?? -1) >= 0
    && Number.isInteger(entry.correctStreak) && (entry.correctStreak ?? -1) >= 0
    && typeof entry.averageResponseMs === 'number' && Number.isFinite(entry.averageResponseMs) && entry.averageResponseMs >= 0
    && typeof entry.lastSeenAt === 'string' && !Number.isNaN(Date.parse(entry.lastSeenAt))
    && typeof entry.nextReviewAt === 'string' && !Number.isNaN(Date.parse(entry.nextReviewAt));
};

export const loadLanguageMastery = (): LanguageMasteryEntry[] => {
  try {
    const stored = JSON.parse(localStorage.getItem(MASTERY_KEY) ?? 'null') as StoredLanguageMastery | null;
    if (!stored || stored.schemaVersion !== 1 || !Array.isArray(stored.entries)) return [];
    return stored.entries.filter(isEntry).slice(0, MAX_ENTRIES);
  } catch {
    return [];
  }
};

export const saveLanguageMastery = (entries: readonly LanguageMasteryEntry[]): boolean => {
  try {
    const stored: StoredLanguageMastery = { schemaVersion: 1, entries: entries.slice(0, MAX_ENTRIES) };
    localStorage.setItem(MASTERY_KEY, JSON.stringify(stored));
    return true;
  } catch {
    return false;
  }
};

const stageAfterCorrect = (correctStreak: number): LanguageMasteryStage => {
  if (correctStreak >= 3) return 'mastered';
  if (correctStreak >= 2) return 'almost';
  return 'learning';
};

const reviewDelay = (stage: LanguageMasteryStage): number => {
  if (stage === 'mastered') return 7 * DAY_MS;
  if (stage === 'almost') return 3 * DAY_MS;
  if (stage === 'learning') return DAY_MS;
  return 0;
};

export const recordLanguageAttempt = (
  entries: readonly LanguageMasteryEntry[],
  attempt: { wordId: string; mode: LanguageMode; resolution: Resolution; responseMs: number; now?: Date }
): LanguageMasteryEntry[] => {
  const now = attempt.now ?? new Date();
  const key = masteryKey(attempt.mode, attempt.wordId);
  const previous = entries.find((entry) => entry.key === key);
  const correct = attempt.resolution === 'correct';
  const attempts = (previous?.attempts ?? 0) + 1;
  const correctCount = (previous?.correctCount ?? 0) + (correct ? 1 : 0);
  const dueForPromotion = !previous
    || previous.stage === 'review'
    || Date.parse(previous.nextReviewAt) <= now.getTime();
  const correctStreak = correct
    ? dueForPromotion ? (previous?.correctStreak ?? 0) + 1 : Math.max(1, previous?.correctStreak ?? 0)
    : 0;
  const stage = correct ? stageAfterCorrect(correctStreak) : 'review';
  const averageResponseMs = Math.round(
    (((previous?.averageResponseMs ?? 0) * (attempts - 1)) + Math.max(0, attempt.responseMs)) / attempts
  );
  const updated: LanguageMasteryEntry = {
    key, wordId: attempt.wordId, mode: attempt.mode, stage, attempts, correctCount, correctStreak,
    averageResponseMs, lastSeenAt: now.toISOString(), nextReviewAt: new Date(now.getTime() + reviewDelay(stage)).toISOString()
  };
  return [updated, ...entries.filter((entry) => entry.key !== key)].slice(0, MAX_ENTRIES);
};

export const clearLanguageMastery = (): boolean => {
  try {
    localStorage.removeItem(MASTERY_KEY);
    return true;
  } catch {
    return false;
  }
};
