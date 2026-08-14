import { beforeEach, describe, expect, it } from 'vitest';
import { createMemoryProgress } from './memoryGenerator';
import {
  clearMemoryProgress,
  DEFAULT_MEMORY_RECORDS,
  loadMemoryProgress,
  loadMemoryRecords,
  saveMemoryCompletion,
  saveMemoryProgress
} from './memoryStorage';

describe('기억력 챌린지 전용 저장소', () => {
  beforeEach(() => localStorage.clear());

  it('기존 학습 데이터와 분리해 진행 상태를 저장하고 복구한다', () => {
    localStorage.setItem('numbercal.history.v1', '{"keep":true}');
    const progress = createMemoryProgress('mixed', 'starter', 'progress-test');
    progress.matchedCardIds = progress.cards.slice(0, 2).map((card) => card.id);
    progress.elapsedMs = 12000;
    expect(saveMemoryProgress(progress)).toBe(true);
    expect(loadMemoryProgress()).toEqual(progress);
    expect(clearMemoryProgress()).toBe(true);
    expect(localStorage.getItem('numbercal.history.v1')).toBe('{"keep":true}');
  });

  it('최단 시간, 최소 시도, 별과 일일 배지를 누적한다', () => {
    const progress = createMemoryProgress('mixed', 'starter', 'daily-test', true, '2026-08-14');
    progress.attempts = 6;
    progress.correctAttempts = 4;
    const first = saveMemoryCompletion(DEFAULT_MEMORY_RECORDS, progress, 30000, 67, 2);
    const second = saveMemoryCompletion(first.records, { ...progress, attempts: 4 }, 25000, 100, 3);
    expect(first.earnedDailyBadge).toBe(true);
    expect(second.earnedDailyBadge).toBe(false);
    expect(second.records.byLevel['mixed:starter']).toMatchObject({
      bestTimeMs: 25000,
      minAttempts: 4,
      bestAccuracy: 100,
      completedCount: 2,
      totalStars: 5
    });
    expect(loadMemoryRecords()).toEqual(second.records);
  });

  it('손상된 진행 상태는 복구하지 않는다', () => {
    localStorage.setItem('numbercal.memory.progress.v1', '{"schemaVersion":1,"cards":[]}');
    expect(loadMemoryProgress()).toBeNull();
  });
});
