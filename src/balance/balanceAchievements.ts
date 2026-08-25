import type { BalanceRecords } from './types';

export interface BalanceAchievementStatus {
  id: string;
  title: string;
  description: string;
  icon: string;
  progress: number;
  target: number;
  unlocked: boolean;
}

const definitions = [
  { id: 'first-balance', title: '첫 균형', description: '균형 저울 한 세션을 끝내요.', icon: '⚖', target: 1, progress: (records: BalanceRecords) => records.completedSessions },
  { id: 'twenty-scales', title: '차근차근 탐험가', description: '저울 20개를 맞춰요.', icon: '🌱', target: 20, progress: (records: BalanceRecords) => records.completedPuzzles },
  { id: 'both-sides', title: '양쪽을 보는 눈', description: '척척 단계를 완료해요.', icon: '↔', target: 1, progress: (records: BalanceRecords) => records.byDifficulty.clever?.completedSessions ?? 0 },
  { id: 'shape-master', title: '도형 추리왕', description: '달인 단계를 완료해요.', icon: '★', target: 1, progress: (records: BalanceRecords) => records.byDifficulty.master?.completedSessions ?? 0 },
  { id: 'daily-friend', title: '매일 균형 친구', description: '오늘의 균형 배지를 7개 모아요.', icon: '🏅', target: 7, progress: (records: BalanceRecords) => records.dailyBadges.length }
] as const;

export const getBalanceAchievements = (records: BalanceRecords): BalanceAchievementStatus[] => definitions.map((item) => {
  const progress = Math.min(item.target, item.progress(records));
  return { ...item, progress, unlocked: progress >= item.target };
});

export const getNewBalanceAchievementIds = (before: BalanceRecords, after: BalanceRecords): string[] => {
  const oldIds = new Set(getBalanceAchievements(before).filter((item) => item.unlocked).map((item) => item.id));
  return getBalanceAchievements(after).filter((item) => item.unlocked && !oldIds.has(item.id)).map((item) => item.id);
};
