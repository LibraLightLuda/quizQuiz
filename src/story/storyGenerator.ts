import { createId, shuffle, type RandomSource, CryptoRandom, SeededRandom } from '../services/randomService';
import { storiesByLevel } from './storyData';
import type { Story, StoryActivityState, StoryLevel, StoryProgress } from './types';

const sameOrder = (left: readonly string[], right: readonly string[]): boolean =>
  left.length === right.length && left.every((value, index) => value === right[index]);

const shuffledDifferent = (values: readonly string[], random: RandomSource): string[] => {
  const mixed = shuffle(random, values);
  if (mixed.length > 1 && sameOrder(mixed, values)) return [...mixed.slice(1), mixed[0]];
  return mixed;
};

export const createStoryActivityStates = (
  story: Story, random: RandomSource = new CryptoRandom()
): StoryActivityState[] => story.activities.map((activity) => ({
  activityId: activity.id,
  status: 'active',
  optionOrder: activity.type === 'choice' ? shuffle(random, activity.options.map((option) => option.id)) : [],
  triedOptionIds: [],
  triedEvidenceSceneIds: [],
  sequenceOrder: activity.type === 'sequence' ? shuffledDifferent(activity.sceneIds, random) : [],
  lockedSceneIds: [],
  wrongAttempts: 0,
  usedHint: false,
  reviewCount: 0,
  mustReview: false,
  firstTry: true
}));

export const createStoryProgress = (
  story: Story, daily = false, dateKey?: string, random: RandomSource = new CryptoRandom()
): StoryProgress => ({
  schemaVersion: 1,
  id: createId('story-session'),
  storyId: story.id,
  level: story.level,
  screen: 'reading',
  pageIndex: 0,
  activityIndex: 0,
  activities: createStoryActivityStates(story, random),
  elapsedMs: 0,
  updatedAt: new Date().toISOString(),
  daily,
  ...(daily && dateKey ? { dateKey } : {})
});

export const pickStory = (
  level: StoryLevel, recentStoryIds: readonly string[], random: RandomSource = new CryptoRandom()
): Story => {
  const pool = storiesByLevel(level);
  const fresh = pool.filter((story) => !recentStoryIds.includes(story.id));
  const candidates = fresh.length ? fresh : pool;
  return candidates[Math.min(candidates.length - 1, Math.floor(random.next() * candidates.length))];
};

const hashText = (value: string): number => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

export const dailyStory = (dateKey: string, level: StoryLevel): Story =>
  pickStory(level, [], new SeededRandom(hashText(`${dateKey}:${level}:story`)));

export const storyDailyKey = (date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const isCorrectSequence = (order: readonly string[], correct: readonly string[]): boolean => sameOrder(order, correct);

export const correctSequenceSceneIds = (order: readonly string[], correct: readonly string[]): string[] =>
  order.filter((sceneId, index) => correct[index] === sceneId);
