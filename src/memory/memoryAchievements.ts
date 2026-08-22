import type { MemoryDifficulty, MemoryMode, MemoryRecords } from './types';

export type MemoryAchievementId =
  | 'first-link'
  | 'math-linker'
  | 'korean-linker'
  | 'english-linker'
  | 'mixed-linker'
  | 'growing-step'
  | 'focus-step'
  | 'master-step'
  | 'star-collector'
  | 'daily-friend';

export interface MemoryAchievementStatus {
  id: MemoryAchievementId;
  title: string;
  description: string;
  icon: string;
  progress: number;
  target: number;
  unlocked: boolean;
}

interface MemoryAchievementDefinition extends Omit<MemoryAchievementStatus, 'progress' | 'unlocked'> {
  progressFor: (records: MemoryRecords) => number;
}

const completedForMode = (records: MemoryRecords, mode: MemoryMode) => Object.entries(records.byLevel)
  .filter(([key]) => key.startsWith(`${mode}:`))
  .reduce((total, [, record]) => total + (record?.completedCount ?? 0), 0);

const completedForDifficulty = (records: MemoryRecords, difficulty: MemoryDifficulty) => Object.entries(records.byLevel)
  .filter(([key]) => key.endsWith(`:${difficulty}`))
  .reduce((total, [, record]) => total + (record?.completedCount ?? 0), 0);

export const memoryRecordSummary = (records: MemoryRecords) => {
  const levelRecords = Object.values(records.byLevel).filter((record) => record !== undefined);
  return {
    completedCount: levelRecords.reduce((total, record) => total + record.completedCount, 0),
    totalStars: levelRecords.reduce((total, record) => total + record.totalStars, 0),
    completedModes: (['math', 'korean', 'english', 'mixed'] as const)
      .filter((mode) => completedForMode(records, mode) > 0).length,
    dailyCount: records.dailyBadges.length
  };
};

const achievementDefinitions: readonly MemoryAchievementDefinition[] = [
  { id: 'first-link', title: '첫 연결', description: '기억력 게임을 처음으로 완성해요.', icon: '✨', target: 1, progressFor: (records) => memoryRecordSummary(records).completedCount },
  { id: 'math-linker', title: '수학 연결왕', description: '수학 전용 모드를 완성해요.', icon: '➕', target: 1, progressFor: (records) => completedForMode(records, 'math') },
  { id: 'korean-linker', title: '한글 연결왕', description: '한국어 전용 모드를 완성해요.', icon: '한', target: 1, progressFor: (records) => completedForMode(records, 'korean') },
  { id: 'english-linker', title: '영어 연결왕', description: '영어 전용 모드를 완성해요.', icon: 'A', target: 1, progressFor: (records) => completedForMode(records, 'english') },
  { id: 'mixed-linker', title: '통합 탐험가', description: '추천 통합 학습 모드를 완성해요.', icon: '🔗', target: 1, progressFor: (records) => completedForMode(records, 'mixed') },
  { id: 'growing-step', title: '기억 쑥쑥', description: '쑥쑥 단계에 도전해 완성해요.', icon: '🌱', target: 1, progressFor: (records) => completedForDifficulty(records, 'growing') },
  { id: 'focus-step', title: '집중 탐험가', description: '집중 단계에 도전해 완성해요.', icon: '🎯', target: 1, progressFor: (records) => completedForDifficulty(records, 'focus') },
  { id: 'master-step', title: '기억력 왕', description: '가장 많은 카드 단계를 완성해요.', icon: '👑', target: 1, progressFor: (records) => completedForDifficulty(records, 'master') },
  { id: 'star-collector', title: '별 수집가', description: '기억력 게임에서 별 30개를 모아요.', icon: '⭐', target: 30, progressFor: (records) => memoryRecordSummary(records).totalStars },
  { id: 'daily-friend', title: '매일 만나는 친구', description: '오늘의 도전 배지를 7개 모아요.', icon: '🏅', target: 7, progressFor: (records) => records.dailyBadges.length }
];

export const getMemoryAchievementStatuses = (records: MemoryRecords): MemoryAchievementStatus[] => achievementDefinitions.map(({ progressFor, ...achievement }) => {
  const progress = Math.min(achievement.target, progressFor(records));
  return { ...achievement, progress, unlocked: progress >= achievement.target };
});

export const getNewMemoryAchievementIds = (
  previous: MemoryRecords,
  next: MemoryRecords
): MemoryAchievementId[] => {
  const previouslyUnlocked = new Set(getMemoryAchievementStatuses(previous).filter((item) => item.unlocked).map((item) => item.id));
  return getMemoryAchievementStatuses(next)
    .filter((item) => item.unlocked && !previouslyUnlocked.has(item.id))
    .map((item) => item.id);
};
