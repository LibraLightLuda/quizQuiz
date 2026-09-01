import { createId, shuffle, type RandomSource, CryptoRandom } from '../services/randomService';
import { storiesByLevel } from './storyData';
import type { Story, StoryActivityState, StoryLevel, StoryProgress, StoryVocabularyMission } from './types';

const sameOrder = (left: readonly string[], right: readonly string[]): boolean =>
  left.length === right.length && left.every((value, index) => value === right[index]);

const shuffledDifferent = (values: readonly string[], random: RandomSource): string[] => {
  const mixed = shuffle(random, values);
  if (mixed.length > 1 && sameOrder(mixed, values)) return [...mixed.slice(1), mixed[0]];
  return mixed;
};

export const createStoryActivityStates = (
  story: Story, random: RandomSource = new CryptoRandom()
): StoryActivityState[] => {
  const sequences = story.activities.filter((activity) => activity.type === 'sequence');
  const authored = story.activities.slice(0, 3).filter((activity) => activity.type === 'choice');
  const generated = story.activities.slice(3).filter((activity) => activity.type === 'choice');
  const chosen = shuffle(random, [
    ...shuffle(random, authored).slice(0, 1),
    ...shuffle(random, generated).slice(0, 1),
    ...shuffle(random, sequences).slice(0, 1)
  ]);
  return chosen.map((activity) => ({
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
};

export const createStoryProgress = (
  story: Story, daily = false, dateKey?: string, random: RandomSource = new CryptoRandom(),
  missionVocabularyIds: readonly string[] = []
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
  ...(missionVocabularyIds.length ? {
    missionVocabularyIds: [...missionVocabularyIds],
    missionRecallIndex: 0,
    missionRecallCorrect: 0,
    missionRecallComplete: false
  } : {}),
  ...(daily && dateKey ? { dateKey } : {})
});

export const createStoryVocabularyMission = (
  storyPool: readonly Story[], learnedWordIds: readonly string[]
): StoryVocabularyMission | null => {
  const learned = new Set(learnedWordIds);
  const candidates = storyPool.map((story) => {
    const vocabularyIds = [...new Set(story.scenes.flatMap((scene) => scene.vocabularyIds))]
      .filter((wordId) => learned.has(wordId))
      .slice(0, 4);
    return { storyId: story.id, vocabularyIds };
  }).filter((mission) => mission.vocabularyIds.length >= 2)
    .sort((left, right) => right.vocabularyIds.length - left.vocabularyIds.length);
  return candidates[0] ?? null;
};

export const pickStory = (
  level: StoryLevel, recentStoryIds: readonly string[], random: RandomSource = new CryptoRandom()
): Story => {
  const pool = storiesByLevel(level);
  const fresh = pool.filter((story) => !recentStoryIds.includes(story.id));
  const candidates = fresh.length ? fresh : pool;
  return candidates[Math.min(candidates.length - 1, Math.floor(random.next() * candidates.length))];
};

export const storyDailyKey = (date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const isCorrectSequence = (order: readonly string[], correct: readonly string[]): boolean => sameOrder(order, correct);

export const correctSequenceSceneIds = (order: readonly string[], correct: readonly string[]): string[] =>
  order.filter((sceneId, index) => correct[index] === sceneId);
