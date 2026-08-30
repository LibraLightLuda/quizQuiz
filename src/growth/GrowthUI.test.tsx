import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { GrowthMedal, GrowthRewardCard } from './GrowthUI';
import type { GrowthAward } from './types';

const award: GrowthAward = {
  sectionId: 'math', dateKey: '2026-08-31', baseXp: 10, weeklyBonusXp: 20, totalAwardedXp: 30,
  reason: 'earned', dayCompletedCount: 1, dayAwardedCount: 1, weeklyActiveDays: 5,
  previousLevel: 1, newLevel: 2, previousMedal: 'seed', newMedal: 'seed',
  previousSparkleRank: 0, newSparkleRank: 0, totalXp: 40
};

describe('성장 점수 UI', () => {
  it('주간 보너스와 다음 성장 진행을 함께 설명한다', () => {
    const html = renderToStaticMarkup(<GrowthRewardCard award={award} />);
    expect(html).toContain('+30 성장 점수');
    expect(html).toContain('주 5일 달성 보너스 +20');
    expect(html).toContain('오늘 1 / 3');
  });

  it('30레벨 이후 반짝임 등급을 접근 가능한 메달 이름에 포함한다', () => {
    const html = renderToStaticMarkup(<GrowthMedal xp={2960} />);
    expect(html).toContain('무지개숲 메달, 레벨 30, 반짝임 1등급');
    expect(html).toContain('✨1');
  });
});
