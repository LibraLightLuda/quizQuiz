import { describe, expect, it } from 'vitest';
import { getMemoryAchievementStatuses, getNewMemoryAchievementIds, memoryRecordSummary } from './memoryAchievements';
import { DEFAULT_MEMORY_RECORDS } from './memoryStorage';
import type { MemoryRecords } from './types';

const completedRecords: MemoryRecords = {
  ...DEFAULT_MEMORY_RECORDS,
  byLevel: {
    'mixed:starter': {
      bestTimeMs: 20000,
      minAttempts: 4,
      bestAccuracy: 100,
      completedCount: 2,
      totalStars: 6,
      completedAt: '2026-08-22T00:00:00.000Z'
    },
    'math:master': {
      bestTimeMs: 80000,
      minAttempts: 12,
      bestAccuracy: 83,
      completedCount: 1,
      totalStars: 3,
      completedAt: '2026-08-22T00:01:00.000Z'
    }
  },
  dailyBadges: ['2026-08-20', '2026-08-21']
};

describe('기억력 챌린지 배지 도감', () => {
  it('기존 완료 기록만으로 배지와 도감 요약을 계산한다', () => {
    const statuses = getMemoryAchievementStatuses(completedRecords);
    const byId = Object.fromEntries(statuses.map((status) => [status.id, status]));

    expect(statuses).toHaveLength(10);
    expect(byId['first-link'].unlocked).toBe(true);
    expect(byId['mixed-linker'].unlocked).toBe(true);
    expect(byId['math-linker'].unlocked).toBe(true);
    expect(byId['master-step'].unlocked).toBe(true);
    expect(byId['english-linker'].unlocked).toBe(false);
    expect(byId['star-collector']).toMatchObject({ progress: 9, target: 30, unlocked: false });
    expect(memoryRecordSummary(completedRecords)).toEqual({ completedCount: 3, totalStars: 9, completedModes: 2, dailyCount: 2 });
  });

  it('이번 완료로 처음 열린 배지만 알려 준다', () => {
    expect(getNewMemoryAchievementIds(DEFAULT_MEMORY_RECORDS, completedRecords)).toEqual(expect.arrayContaining([
      'first-link', 'math-linker', 'mixed-linker', 'master-step'
    ]));
    expect(getNewMemoryAchievementIds(completedRecords, completedRecords)).toEqual([]);
  });
});
