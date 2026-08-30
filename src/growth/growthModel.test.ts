import { describe, expect, it } from 'vitest';
import {
  EMPTY_GROWTH_STATE,
  MAX_LEVEL_XP,
  levelForXp,
  medalForLevel,
  recordGrowthCompletion,
  sparkleRankForXp,
  weekKeyForDate
} from './growthModel';

describe('매일 성장 점수', () => {
  it('하루 서로 다른 세 섹션까지만 10점씩 지급하고 완료 표시는 모두 남긴다', () => {
    const now = new Date(2026, 7, 31, 10);
    const first = recordGrowthCompletion(EMPTY_GROWTH_STATE, 'math', now);
    const duplicate = recordGrowthCompletion(first.state, 'math', now);
    const second = recordGrowthCompletion(duplicate.state, 'korean', now);
    const third = recordGrowthCompletion(second.state, 'english', now);
    const capped = recordGrowthCompletion(third.state, 'memory', now);

    expect(first.award.totalAwardedXp).toBe(10);
    expect(duplicate.award).toMatchObject({ totalAwardedXp: 0, reason: 'already-completed' });
    expect(capped.award).toMatchObject({ totalAwardedXp: 0, reason: 'daily-cap', dayCompletedCount: 4, dayAwardedCount: 3 });
    expect(capped.state.totalXp).toBe(30);
    expect(capped.state.days[0].completedSections).toEqual(['math', 'korean', 'english', 'memory']);
  });

  it('월요일부터 일요일 사이 다섯 번째 활동일에 주간 보너스를 한 번 지급한다', () => {
    let state = EMPTY_GROWTH_STATE;
    const sections = ['math', 'korean', 'english', 'memory', 'story', 'sudoku'] as const;
    const awards = sections.map((section, index) => {
      const mutation = recordGrowthCompletion(state, section, new Date(2026, 7, 31 + index, 10));
      state = mutation.state;
      return mutation.award;
    });

    expect(awards.slice(0, 4).every((award) => award.weeklyBonusXp === 0)).toBe(true);
    expect(awards[4]).toMatchObject({ baseXp: 10, weeklyBonusXp: 20, totalAwardedXp: 30, weeklyActiveDays: 5 });
    expect(awards[5]).toMatchObject({ weeklyBonusXp: 0, weeklyActiveDays: 6 });
    expect(state.totalXp).toBe(80);
  });

  it('일요일 다음 월요일에는 새 주간 진행을 시작한다', () => {
    expect(weekKeyForDate(new Date(2026, 8, 6, 12))).toBe('2026-08-31');
    expect(weekKeyForDate(new Date(2026, 8, 7, 12))).toBe('2026-09-07');
  });

  it('레벨·메달·30레벨 이후 반짝임 경계를 계산한다', () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(39)).toBe(1);
    expect(levelForXp(40)).toBe(2);
    expect(levelForXp(MAX_LEVEL_XP - 1)).toBe(29);
    expect(levelForXp(MAX_LEVEL_XP)).toBe(30);
    expect(medalForLevel(1)).toBe('seed');
    expect(medalForLevel(5)).toBe('sprout');
    expect(medalForLevel(30)).toBe('rainbow-forest');
    expect(sparkleRankForXp(MAX_LEVEL_XP + 199)).toBe(0);
    expect(sparkleRankForXp(MAX_LEVEL_XP + 200)).toBe(1);
  });
});
