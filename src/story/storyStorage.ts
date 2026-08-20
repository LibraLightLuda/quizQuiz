import { STORY_LEVELS, storyById } from './storyData';
import { scoreStory } from './storyScoring';
import { storyPracticeMessage, storyStrengthMessage } from './storyScoring';
import type { StoryActivityState, StoryLevel, StoryProgress, StoryRecord, StoryRecords, StoryResult } from './types';

const PROGRESS_KEY = 'numbercal.story.progress.v1';
const RECORDS_KEY = 'numbercal.story.records.v1';

export const DEFAULT_STORY_RECORDS: StoryRecords = {
  schemaVersion: 1,
  lastLevel: 'sprout',
  byStory: {},
  dailyBadges: [],
  recentStoryIds: []
};

const isLevel = (value: unknown): value is StoryLevel => STORY_LEVELS.includes(value as StoryLevel);
const isNonNegativeInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0;
const sameSet = (left: readonly string[], right: readonly string[]): boolean =>
  left.length === right.length && left.every((value) => right.includes(value));

const isActivityState = (value: unknown, progress: Partial<StoryProgress>): value is StoryActivityState => {
  if (!value || typeof value !== 'object') return false;
  const state = value as Partial<StoryActivityState>;
  const story = typeof progress.storyId === 'string' ? storyById(progress.storyId) : undefined;
  const activity = story?.activities.find((item) => item.id === state.activityId);
  if (!activity || !['active', 'evidence', 'complete'].includes(state.status ?? '')) return false;
  if (!Array.isArray(state.optionOrder) || !Array.isArray(state.triedOptionIds)
    || !Array.isArray(state.triedEvidenceSceneIds) || !Array.isArray(state.sequenceOrder)
    || !Array.isArray(state.lockedSceneIds)) return false;
  const strings = [...state.optionOrder, ...state.triedOptionIds, ...state.triedEvidenceSceneIds,
    ...state.sequenceOrder, ...state.lockedSceneIds];
  if (strings.some((item) => typeof item !== 'string')) return false;
  if (activity.type === 'choice') {
    const optionIds = activity.options.map((option) => option.id);
    if (!sameSet(state.optionOrder, optionIds) || state.triedOptionIds.some((id) => !optionIds.includes(id))) return false;
    if (state.status === 'evidence' && !activity.evidenceRequired) return false;
  } else {
    if (!sameSet(state.sequenceOrder, activity.sceneIds) || state.lockedSceneIds.some((id) => !activity.sceneIds.includes(id))) return false;
  }
  return isNonNegativeInteger(state.wrongAttempts) && isNonNegativeInteger(state.reviewCount)
    && typeof state.usedHint === 'boolean' && typeof state.mustReview === 'boolean' && typeof state.firstTry === 'boolean';
};

const isProgress = (value: unknown): value is StoryProgress => {
  if (!value || typeof value !== 'object') return false;
  const progress = value as Partial<StoryProgress>;
  const story = typeof progress.storyId === 'string' ? storyById(progress.storyId) : undefined;
  if (progress.schemaVersion !== 1 || !story || progress.level !== story.level
    || !['reading', 'activity'].includes(progress.screen ?? '')
    || !isNonNegativeInteger(progress.pageIndex) || progress.pageIndex! >= story.scenes.length
    || !isNonNegativeInteger(progress.activityIndex) || progress.activityIndex! >= story.activities.length
    || !Array.isArray(progress.activities) || progress.activities.length !== story.activities.length
    || !progress.activities.every((activity) => isActivityState(activity, progress))) return false;
  if (typeof progress.id !== 'string' || !progress.id.trim() || typeof progress.daily !== 'boolean'
    || typeof progress.elapsedMs !== 'number' || !Number.isFinite(progress.elapsedMs) || progress.elapsedMs < 0
    || typeof progress.updatedAt !== 'string' || Number.isNaN(Date.parse(progress.updatedAt))) return false;
  if (progress.daily && typeof progress.dateKey !== 'string') return false;
  return progress.reviewActivityId === undefined
    || story.activities.some((activity) => activity.id === progress.reviewActivityId);
};

export const loadStoryProgress = (): StoryProgress | null => {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? 'null');
    return isProgress(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const saveStoryProgress = (progress: StoryProgress): boolean => {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
};

export const clearStoryProgress = (): boolean => {
  try {
    localStorage.removeItem(PROGRESS_KEY);
    return true;
  } catch {
    return false;
  }
};

const isStoryRecord = (value: unknown): value is StoryRecord => {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<StoryRecord>;
  return isNonNegativeInteger(record.bestStars) && record.bestStars! <= 3
    && isNonNegativeInteger(record.bestFirstTryCount) && record.bestFirstTryCount! <= 3
    && isNonNegativeInteger(record.completedCount) && record.completedCount! >= 1
    && isNonNegativeInteger(record.totalHints)
    && typeof record.completedAt === 'string' && !Number.isNaN(Date.parse(record.completedAt));
};

export const loadStoryRecords = (): StoryRecords => {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECORDS_KEY) ?? 'null') as Partial<StoryRecords> | null;
    if (!parsed || parsed.schemaVersion !== 1 || !isLevel(parsed.lastLevel)) return DEFAULT_STORY_RECORDS;
    const byStory: StoryRecords['byStory'] = {};
    Object.entries(parsed.byStory ?? {}).forEach(([storyId, record]) => {
      if (storyById(storyId) && isStoryRecord(record)) byStory[storyId] = record;
    });
    return {
      schemaVersion: 1,
      lastLevel: parsed.lastLevel,
      byStory,
      dailyBadges: Array.isArray(parsed.dailyBadges)
        ? parsed.dailyBadges.filter((item): item is string => typeof item === 'string').slice(-90) : [],
      recentStoryIds: Array.isArray(parsed.recentStoryIds)
        ? parsed.recentStoryIds.filter((item): item is string => typeof item === 'string' && Boolean(storyById(item))).slice(0, 12) : []
    };
  } catch {
    return DEFAULT_STORY_RECORDS;
  }
};

const storeRecords = (records: StoryRecords): boolean => {
  try {
    localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
    return true;
  } catch {
    return false;
  }
};

export const rememberStoryLevel = (records: StoryRecords, lastLevel: StoryLevel): StoryRecords => {
  const next = { ...records, lastLevel };
  storeRecords(next);
  return next;
};

export const saveStoryCompletion = (
  records: StoryRecords, progress: StoryProgress
): { records: StoryRecords; result: StoryResult; saved: boolean } => {
  const score = scoreStory(progress.activities);
  const previous = records.byStory[progress.storyId];
  const earnedDailyBadge = Boolean(progress.daily && progress.dateKey && !records.dailyBadges.includes(progress.dateKey));
  const improved = !previous || score.stars > previous.bestStars || score.firstTryCount > previous.bestFirstTryCount;
  const next: StoryRecords = {
    schemaVersion: 1,
    lastLevel: progress.level,
    byStory: {
      ...records.byStory,
      [progress.storyId]: {
        bestStars: Math.max(previous?.bestStars ?? 0, score.stars),
        bestFirstTryCount: Math.max(previous?.bestFirstTryCount ?? 0, score.firstTryCount),
        completedCount: (previous?.completedCount ?? 0) + 1,
        totalHints: (previous?.totalHints ?? 0) + score.hintCount,
        completedAt: new Date().toISOString()
      }
    },
    dailyBadges: earnedDailyBadge ? [...records.dailyBadges, progress.dateKey!].slice(-90) : records.dailyBadges,
    recentStoryIds: [progress.storyId, ...records.recentStoryIds.filter((id) => id !== progress.storyId)].slice(0, 12)
  };
  const result: StoryResult = {
    storyId: progress.storyId,
    stars: score.stars,
    firstTryCount: score.firstTryCount,
    hintCount: score.hintCount,
    reviewCount: score.reviewCount,
    elapsedMs: progress.elapsedMs,
    daily: progress.daily,
    earnedDailyBadge,
    improved,
    strengthMessage: storyStrengthMessage(progress.activities),
    practiceMessage: storyPracticeMessage(progress.activities)
  };
  return { records: next, result, saved: storeRecords(next) };
};
