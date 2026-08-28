import type { NumberPathRecords } from './types';

export interface NumberPathAchievement {
  id: string;
  icon: string;
  title: string;
  description: string;
  unlocked: boolean;
  progress: number;
  target: number;
}

export const getNumberPathAchievements = (records: NumberPathRecords): NumberPathAchievement[] => {
  const completedDifficulties = Object.values(records.byDifficulty).filter((record) => (record?.completedSessions ?? 0) > 0).length;
  const values = [
    { id: 'first-path', icon: '🌱', title: '첫 번째 길', description: '첫 길을 완성했어요', progress: records.completedPuzzles, target: 1 },
    { id: 'backtracker', icon: '↩️', title: '다시 생각하기', description: '되돌리며 새 길을 찾았어요', progress: records.totalBacktracks, target: 3 },
    { id: 'hint-learner', icon: '💡', title: '힌트로 배웠어요', description: '힌트를 활용해 완성했어요', progress: records.hintSessions, target: 1 },
    { id: 'path-explorer', icon: '🧭', title: '길 탐험가', description: '세 단계를 완성했어요', progress: completedDifficulties, target: 3 },
    { id: 'daily-path', icon: '☀️', title: '오늘의 발걸음', description: '오늘의 길을 완성했어요', progress: records.dailyBadges.length, target: 1 }
  ];
  return values.map((item) => ({ ...item, progress: Math.min(item.progress, item.target), unlocked: item.progress >= item.target }));
};

export const getNewNumberPathAchievementIds = (
  before: NumberPathRecords,
  after: NumberPathRecords
): string[] => {
  const previous = new Set(getNumberPathAchievements(before).filter((item) => item.unlocked).map((item) => item.id));
  return getNumberPathAchievements(after).filter((item) => item.unlocked && !previous.has(item.id)).map((item) => item.id);
};
