import type { AchievementGridItem } from '../visuals/AchievementGrid';
import type { ShapeBlockRecords } from './types';

export const getShapeBlockAchievements = (records: ShapeBlockRecords): AchievementGridItem[] => {
  const completed = Object.keys(records.tangramStars).length;
  const perfect = Object.values(records.tangramStars).filter((stars) => stars === 3).length;
  return [
    { id: 'first-shape', icon: '🧩', title: '첫 모양', description: '칠교 그림을 완성했어요', progress: completed, target: 1 },
    { id: 'no-hint', icon: '✨', title: '혼자 척척', description: '힌트 없이 완성했어요', progress: perfect, target: 1 },
    { id: 'starter-ten', icon: '🌱', title: '첫걸음 달인', description: '첫걸음 10개를 완성했어요', progress: Object.keys(records.tangramStars).filter((id) => id.startsWith('starter-')).length, target: 10 },
    { id: 'double-clear', icon: '⚡', title: '두 줄 찰칵', description: '한 번에 두 줄을 지웠어요', progress: records.bestSingleClear, target: 2 },
    { id: 'thirty-lines', icon: '🌈', title: '줄 정리왕', description: '모두 30줄을 지웠어요', progress: records.totalLines, target: 30 },
    { id: 'score-hunter', icon: '🏆', title: '블록 탐험가', description: '최고점 300점을 넘었어요', progress: records.lineHighScore, target: 300 }
  ].map((item) => ({ ...item, progress: Math.min(item.progress, item.target), unlocked: item.progress >= item.target }));
};
