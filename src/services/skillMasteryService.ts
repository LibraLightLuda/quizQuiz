import { englishWords } from '../data/englishWords';
import { koreanWords } from '../data/koreanWords';
import { skillDefinitionById } from '../domain/skillData';
import type { Resolution, SkillMastery, StoredSkillMastery } from '../domain/types';
import { loadLanguageMastery } from './languageMasteryService';

const SKILL_MASTERY_KEY = 'numbercal.skill-mastery.v2';
const MAX_ENTRIES = 200;
const DAY_MS = 24 * 60 * 60 * 1000;
const allWords = [...koreanWords, ...englishWords];
const skillsByWordId = new Map(allWords.map((word) => [word.id, word.skillIds]));

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));
const round = (value: number): number => Math.round(value * 1000) / 1000;

const isSkillMastery = (value: unknown): value is SkillMastery => {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Partial<SkillMastery>;
  return typeof entry.skillId === 'string'
    && skillDefinitionById.has(entry.skillId)
    && Number.isInteger(entry.attempts) && (entry.attempts ?? -1) >= 0
    && Number.isInteger(entry.independentCorrect) && (entry.independentCorrect ?? -1) >= 0
    && Number.isInteger(entry.supportedCorrect) && (entry.supportedCorrect ?? -1) >= 0
    && typeof entry.recentAccuracy === 'number' && entry.recentAccuracy >= 0 && entry.recentAccuracy <= 1
    && typeof entry.hintRate === 'number' && entry.hintRate >= 0 && entry.hintRate <= 1
    && typeof entry.confidence === 'number' && entry.confidence >= 0 && entry.confidence <= 1
    && typeof entry.lastSeenAt === 'string' && !Number.isNaN(Date.parse(entry.lastSeenAt))
    && typeof entry.nextReviewAt === 'string' && !Number.isNaN(Date.parse(entry.nextReviewAt))
    && Array.isArray(entry.recentIndependent)
    && entry.recentIndependent.length <= 5
    && entry.recentIndependent.every((result) => typeof result === 'boolean');
};

export const saveSkillMastery = (
  entries: readonly SkillMastery[],
  migratedFromWordMastery = true
): boolean => {
  try {
    const stored: StoredSkillMastery = {
      schemaVersion: 2,
      entries: entries.slice(0, MAX_ENTRIES),
      migratedFromWordMastery
    };
    localStorage.setItem(SKILL_MASTERY_KEY, JSON.stringify(stored));
    return true;
  } catch {
    return false;
  }
};

export const migrateWordMasteryToSkills = (): SkillMastery[] => {
  const grouped = new Map<string, SkillMastery>();
  for (const wordEntry of loadLanguageMastery()) {
    for (const skillId of skillsByWordId.get(wordEntry.wordId) ?? []) {
      const previous = grouped.get(skillId);
      const attempts = (previous?.attempts ?? 0) + wordEntry.attempts;
      const independentCorrect = (previous?.independentCorrect ?? 0) + wordEntry.correctCount;
      const recentResult = wordEntry.stage !== 'review' && wordEntry.correctStreak > 0;
      const recentIndependent = [...(previous?.recentIndependent ?? []), recentResult].slice(-5);
      const lastSeenAt = !previous || Date.parse(wordEntry.lastSeenAt) > Date.parse(previous.lastSeenAt)
        ? wordEntry.lastSeenAt : previous.lastSeenAt;
      const nextReviewAt = !previous || Date.parse(wordEntry.nextReviewAt) < Date.parse(previous.nextReviewAt)
        ? wordEntry.nextReviewAt : previous.nextReviewAt;
      const recentAccuracy = recentIndependent.filter(Boolean).length / recentIndependent.length;
      grouped.set(skillId, {
        skillId,
        attempts,
        independentCorrect,
        supportedCorrect: 0,
        recentAccuracy: round(recentAccuracy),
        hintRate: 0,
        lastSeenAt,
        nextReviewAt,
        confidence: round(clamp01((independentCorrect / Math.max(1, attempts)) * Math.min(1, attempts / 3))),
        recentIndependent
      });
    }
  }
  return [...grouped.values()].sort((a, b) => a.skillId.localeCompare(b.skillId)).slice(0, MAX_ENTRIES);
};

export const loadSkillMastery = (): SkillMastery[] => {
  try {
    const stored = JSON.parse(localStorage.getItem(SKILL_MASTERY_KEY) ?? 'null') as StoredSkillMastery | null;
    if (stored?.schemaVersion === 2 && Array.isArray(stored.entries)) {
      return stored.entries.filter(isSkillMastery).slice(0, MAX_ENTRIES);
    }
  } catch {
    // 손상된 v2는 기존 낱말 기록에서 다시 만든다.
  }
  const migrated = migrateWordMasteryToSkills();
  saveSkillMastery(migrated, true);
  return migrated;
};

const reviewDelay = (confidence: number, correct: boolean): number => {
  if (!correct) return 0;
  if (confidence >= 0.85) return 7 * DAY_MS;
  if (confidence >= 0.65) return 3 * DAY_MS;
  return DAY_MS;
};

export const recordSkillAttempt = (
  entries: readonly SkillMastery[],
  attempt: {
    skillIds: readonly string[];
    resolution: Resolution;
    supported?: boolean;
    hintUsed?: boolean;
    now?: Date;
  }
): SkillMastery[] => {
  const now = attempt.now ?? new Date();
  const correct = attempt.resolution === 'correct';
  const supported = Boolean(attempt.supported);
  const byId = new Map(entries.map((entry) => [entry.skillId, entry]));

  for (const skillId of new Set(attempt.skillIds)) {
    if (!skillDefinitionById.has(skillId)) continue;
    const previous = byId.get(skillId);
    const attempts = (previous?.attempts ?? 0) + 1;
    const independentCorrect = (previous?.independentCorrect ?? 0) + (correct && !supported ? 1 : 0);
    const supportedCorrect = (previous?.supportedCorrect ?? 0) + (correct && supported ? 1 : 0);
    const recentIndependent = supported
      ? previous?.recentIndependent ?? []
      : [...(previous?.recentIndependent ?? []), correct].slice(-5);
    const recentAccuracy = recentIndependent.length
      ? recentIndependent.filter(Boolean).length / recentIndependent.length
      : 0;
    const hintRate = (((previous?.hintRate ?? 0) * (attempts - 1)) + (attempt.hintUsed ? 1 : 0)) / attempts;
    const evidenceRate = (independentCorrect + supportedCorrect * 0.5) / attempts;
    const evidenceVolume = recentIndependent.length >= 3 ? 1 : (recentIndependent.length / 3) * 0.9;
    const confidence = clamp01(
      evidenceRate * evidenceVolume * (1 - hintRate * 0.35)
    );
    byId.set(skillId, {
      skillId,
      attempts,
      independentCorrect,
      supportedCorrect,
      recentAccuracy: round(recentAccuracy),
      hintRate: round(hintRate),
      lastSeenAt: now.toISOString(),
      nextReviewAt: new Date(now.getTime() + reviewDelay(confidence, correct)).toISOString(),
      confidence: round(confidence),
      recentIndependent
    });
  }

  return [...byId.values()]
    .sort((a, b) => Date.parse(b.lastSeenAt) - Date.parse(a.lastSeenAt))
    .slice(0, MAX_ENTRIES);
};

export const clearSkillMastery = (): boolean => {
  try {
    localStorage.removeItem(SKILL_MASTERY_KEY);
    return true;
  } catch {
    return false;
  }
};

export { SKILL_MASTERY_KEY };
