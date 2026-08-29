import { beforeEach, describe, expect, it } from 'vitest';
import { saveLanguageMastery } from './languageMasteryService';
import {
  loadSkillMastery, recordSkillAttempt, saveSkillMastery, SKILL_MASTERY_KEY
} from './skillMasteryService';

describe('기술 숙련도 v2', () => {
  beforeEach(() => localStorage.clear());

  it('기존 낱말 숙련 기록을 보존하면서 기술 증거로 이관한다', () => {
    saveLanguageMastery([{
      key: 'en-fill:en-easy-1',
      wordId: 'en-easy-1',
      mode: 'en-fill',
      stage: 'almost',
      attempts: 2,
      correctCount: 2,
      correctStreak: 2,
      averageResponseMs: 1500,
      lastSeenAt: '2026-08-29T00:00:00.000Z',
      nextReviewAt: '2026-09-01T00:00:00.000Z'
    }]);

    const migrated = loadSkillMastery();
    expect(migrated.length).toBeGreaterThan(0);
    expect(migrated.find((entry) => entry.skillId === 'en-meaning-picture')).toMatchObject({
      attempts: 2,
      independentCorrect: 2
    });
    expect(JSON.parse(localStorage.getItem(SKILL_MASTERY_KEY) ?? 'null')).toMatchObject({
      schemaVersion: 2,
      migratedFromWordMastery: true
    });
    expect(localStorage.getItem('numbercal.language-mastery.v1')).not.toBeNull();
  });

  it('최근 독립 시도 세 번이 쌓여야 높은 확신에 도달한다', () => {
    const base = new Date('2026-08-29T00:00:00.000Z');
    let entries = recordSkillAttempt([], {
      skillIds: ['en-meaning-picture'], resolution: 'correct', now: base
    });
    expect(entries[0].confidence).toBeLessThan(0.65);
    entries = recordSkillAttempt(entries, {
      skillIds: ['en-meaning-picture'], resolution: 'correct', now: new Date(base.getTime() + 1000)
    });
    expect(entries[0].confidence).toBeLessThan(0.65);
    entries = recordSkillAttempt(entries, {
      skillIds: ['en-meaning-picture'], resolution: 'correct', now: new Date(base.getTime() + 2000)
    });
    expect(entries[0]).toMatchObject({ recentAccuracy: 1, confidence: 1, independentCorrect: 3 });
    expect(saveSkillMastery(entries)).toBe(true);
    expect(loadSkillMastery()).toEqual(entries);
  });

  it('도움을 받은 정답과 힌트 의존은 독립 정답보다 낮은 증거가 된다', () => {
    let entries = recordSkillAttempt([], {
      skillIds: ['ko-meaning-picture'], resolution: 'correct', supported: true, hintUsed: true
    });
    entries = recordSkillAttempt(entries, {
      skillIds: ['ko-meaning-picture'], resolution: 'correct', supported: true, hintUsed: true
    });
    entries = recordSkillAttempt(entries, {
      skillIds: ['ko-meaning-picture'], resolution: 'correct', supported: true, hintUsed: true
    });
    expect(entries[0]).toMatchObject({
      independentCorrect: 0,
      supportedCorrect: 3,
      hintRate: 1,
      confidence: 0
    });
  });
});
