export type StoryLevel = 'sprout' | 'step' | 'explorer' | 'thinker';
export type StoryActivityKind = 'detail' | 'cause' | 'emotion' | 'vocabulary' | 'title' | 'prediction';

export interface StoryScene {
  id: string;
  illustration: string;
  text: string;
  alt: string;
  vocabularyIds: string[];
  skillIds: string[];
  sentenceLevel: 0 | 1 | 2 | 3;
}

export interface StoryOption {
  id: string;
  label: string;
}

export interface StoryChoiceActivity {
  id: string;
  type: 'choice';
  kind: StoryActivityKind;
  prompt: string;
  options: StoryOption[];
  correctOptionId: string;
  hint: string;
  explanation: string;
  evidenceSceneId: string;
  evidenceRequired: boolean;
}

export interface StorySequenceActivity {
  id: string;
  type: 'sequence';
  kind: 'sequence';
  prompt: string;
  sceneIds: string[];
  hint: string;
  explanation: string;
}

export type StoryActivity = StoryChoiceActivity | StorySequenceActivity;

export interface Story {
  id: string;
  title: string;
  level: StoryLevel;
  theme: string;
  cover: string;
  summary: string;
  scenes: StoryScene[];
  activities: StoryActivity[];
}

export interface StoryActivityState {
  activityId: string;
  status: 'active' | 'evidence' | 'complete';
  optionOrder: string[];
  triedOptionIds: string[];
  triedEvidenceSceneIds: string[];
  sequenceOrder: string[];
  lockedSceneIds: string[];
  wrongAttempts: number;
  usedHint: boolean;
  reviewCount: number;
  mustReview: boolean;
  firstTry: boolean;
}

export interface StoryProgress {
  schemaVersion: 1;
  id: string;
  storyId: string;
  level: StoryLevel;
  screen: 'reading' | 'activity' | 'recall';
  pageIndex: number;
  activityIndex: number;
  activities: StoryActivityState[];
  elapsedMs: number;
  updatedAt: string;
  daily: boolean;
  dateKey?: string;
  reviewActivityId?: string;
  missionVocabularyIds?: string[];
  missionRecallIndex?: number;
  missionRecallCorrect?: number;
  missionRecallSelectedWordId?: string;
  missionRecallComplete?: boolean;
}

export interface StoryVocabularyMission {
  storyId: string;
  vocabularyIds: string[];
}

export interface StoryRecord {
  bestStars: number;
  bestFirstTryCount: number;
  completedCount: number;
  totalHints: number;
  completedAt: string;
}

export interface StoryRecords {
  schemaVersion: 1;
  lastLevel: StoryLevel;
  byStory: Partial<Record<string, StoryRecord>>;
  dailyBadges: string[];
  recentStoryIds: string[];
}

export interface StoryResult {
  storyId: string;
  stars: number;
  firstTryCount: number;
  hintCount: number;
  reviewCount: number;
  elapsedMs: number;
  daily: boolean;
  earnedDailyBadge: boolean;
  improved: boolean;
  strengthMessage: string;
  practiceMessage: string;
  missionVocabularyIds?: string[];
  missionRecallCorrect?: number;
}
