import { describe, expect, it } from 'vitest';
import { buildShapeBlockGrowthSummary } from './shapeBlockGrowth';

describe('모양블록 성장 요약', () => {
  it('완성 그림, 별, 오늘의 도전과 줄 기록을 계산한다', () => {
    const summary = buildShapeBlockGrowthSummary({
      tangramStars: { a: 3, b: 2, broken: 9 },
      dailyBadges: ['2026-08-29', '2026-08-30', '2026-08-30'],
      lineHighScore: 420,
      totalLines: 15
    });
    expect(summary).toMatchObject({ completedPictures: 2, totalStars: 5, dailyChallenges: 2, lineHighScore: 420, totalLines: 15 });
    expect(summary.progress).toBeGreaterThan(0);
    expect(summary.progress).toBeLessThanOrEqual(100);
  });

  it('손상된 값은 0으로 안전하게 표시한다', () => {
    expect(buildShapeBlockGrowthSummary({ tangramStars: 'broken', totalLines: -1 })).toEqual({
      completedPictures: 0, totalStars: 0, dailyChallenges: 0, lineHighScore: 0, totalLines: 0, progress: 0
    });
  });
});
