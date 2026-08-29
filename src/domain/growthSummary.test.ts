import { describe, expect, it } from 'vitest';
import type { LanguageMasteryEntry, SessionSummary, SkillMastery } from './types';
import { buildChildGrowthSummary, buildParentGrowthSummary } from './growthSummary';

const word = (patch: Partial<LanguageMasteryEntry> = {}): LanguageMasteryEntry => ({
  key: 'ko-fill:ko-easy-1', wordId: 'ko-easy-1', mode: 'ko-fill', stage: 'mastered', attempts: 4,
  correctCount: 3, correctStreak: 3, averageResponseMs: 1200, lastSeenAt: '2026-08-29T02:00:00.000Z',
  nextReviewAt: '2026-09-05T02:00:00.000Z', ...patch
});

const skill = (patch: Partial<SkillMastery> = {}): SkillMastery => ({
  skillId: 'ko-meaning-picture', attempts: 4, independentCorrect: 3, supportedCorrect: 0,
  recentAccuracy: 1, hintRate: 0.25, lastSeenAt: '2026-08-29T02:00:00.000Z',
  nextReviewAt: '2026-09-05T02:00:00.000Z', confidence: 0.82, recentIndependent: [true, true, true], ...patch
});

const session = (correctCount: number, totalCount = 5): SessionSummary => ({
  id: `session-${correctCount}`, completedAt: '2026-08-29T03:00:00.000Z',
  config: { subject: 'korean', mode: 'ko-fill', difficulty: 'easy', length: 5, theme: 'animals' },
  correctCount, incorrectCount: totalCount - correctCount, timeoutCount: 0, totalCount, averageResponseMs: 1000
});

describe('성장 요약', () => {
  it('아이 화면은 점수 대신 만난 낱말, 기억한 낱말, 행동 배지를 만든다', () => {
    const summary = buildChildGrowthSummary(
      [word()],
      [skill(), skill({ skillId: 'ko-syllable-count', confidence: 0.5 })],
      new Date('2026-08-29T12:00:00.000Z')
    );
    expect(summary.metWords).toContain('놀이터');
    expect(summary.rememberedWords).toContain('놀이터');
    expect(summary.badges).toContain('도움 뒤에 혼자 찾았어요');
    expect(summary.trail.find((item) => item.id === 'sound')?.progress).toBe(50);
  });

  it('보호자 화면은 최근 7회 정확도와 시도 수로 가중한 힌트 비율을 계산한다', () => {
    const history = Array.from({ length: 8 }, (_, index) => session(index === 7 ? 0 : 4));
    const summary = buildParentGrowthSummary(
      [word()],
      [skill(), skill({ skillId: 'ko-syllable-count', attempts: 1, hintRate: 1, confidence: 0.2, recentAccuracy: 0, recentIndependent: [false] })],
      history
    );
    expect(summary.recentAccuracy).toBe(80);
    expect(summary.hintRate).toBe(40);
    expect(summary.learned[0].label).toBe('그림과 낱말 연결');
    expect(summary.practicing[0].label).toBe('호-랑-이');
    expect(summary.example).toContain('놀이터');
  });

  it('기록이 없을 때 진단 수치를 만들지 않는다', () => {
    const summary = buildParentGrowthSummary([], [], []);
    expect(summary.recentAccuracy).toBeNull();
    expect(summary.hintRate).toBeNull();
    expect(summary.completedSessions).toBe(0);
  });
});
