import { beforeEach, describe, expect, it } from 'vitest';
import {
  loadLanguageMastery, masteryKey, recordLanguageAttempt, saveLanguageMastery
} from './languageMasteryService';

describe('언어 숙련도 저장', () => {
  beforeEach(() => localStorage.clear());

  it('정답을 간격 반복하면 연습 중에서 익힘으로 올라간다', () => {
    const base = new Date('2026-08-29T00:00:00.000Z');
    let entries = recordLanguageAttempt([], {
      wordId: 'en-easy-1', mode: 'en-fill', resolution: 'correct', responseMs: 2000, now: base
    });
    expect(entries[0]).toMatchObject({ stage: 'learning', correctStreak: 1, attempts: 1 });
    entries = recordLanguageAttempt(entries, {
      wordId: 'en-easy-1', mode: 'en-fill', resolution: 'correct', responseMs: 1000,
      now: new Date(base.getTime() + 24 * 60 * 60 * 1000)
    });
    expect(entries[0]).toMatchObject({ stage: 'almost', correctStreak: 2, averageResponseMs: 1500 });
    entries = recordLanguageAttempt(entries, {
      wordId: 'en-easy-1', mode: 'en-fill', resolution: 'correct', responseMs: 1500,
      now: new Date(base.getTime() + 4 * 24 * 60 * 60 * 1000)
    });
    expect(entries[0]).toMatchObject({ stage: 'mastered', correctStreak: 3 });
  });

  it('같은 날 여러 번 맞혀도 간격 복습 전에는 숙련 단계를 올리지 않는다', () => {
    const base = new Date('2026-08-29T00:00:00.000Z');
    let entries = recordLanguageAttempt([], {
      wordId: 'en-easy-2', mode: 'en-fill', resolution: 'correct', responseMs: 2000, now: base
    });
    entries = recordLanguageAttempt(entries, {
      wordId: 'en-easy-2', mode: 'en-fill', resolution: 'correct', responseMs: 1500,
      now: new Date(base.getTime() + 60 * 1000)
    });
    expect(entries[0]).toMatchObject({ stage: 'learning', correctStreak: 1, attempts: 2, correctCount: 2 });
  });

  it('오답은 다시 보기 상태가 되고 저장 후 복원된다', () => {
    const entries = recordLanguageAttempt([], {
      wordId: 'ko-easy-1', mode: 'ko-listen', resolution: 'incorrect', responseMs: 3200,
      now: new Date('2026-08-29T00:00:00.000Z')
    });
    expect(entries[0]).toMatchObject({
      key: masteryKey('ko-listen', 'ko-easy-1'), stage: 'review', correctStreak: 0
    });
    expect(saveLanguageMastery(entries)).toBe(true);
    expect(loadLanguageMastery()).toEqual(entries);
  });
});
