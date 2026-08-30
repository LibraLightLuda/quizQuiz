import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EMPTY_GROWTH_STATE } from './growthModel';
import { GROWTH_STORAGE_KEY, loadGrowthState, saveGrowthState } from './growthStorage';
import type { GrowthState } from './types';

describe('성장 기록 저장', () => {
  beforeEach(() => localStorage.clear());

  it('기록을 저장하고 다시 불러온다', () => {
    const state: GrowthState = {
      schemaVersion: 1,
      totalXp: 30,
      days: [{ dateKey: '2026-08-31', completedSections: ['math', 'korean', 'english'], earnedXp: 30, weeklyBonusXp: 0 }]
    };
    expect(saveGrowthState(state)).toBe(true);
    expect(loadGrowthState()).toEqual(state);
  });

  it('손상되거나 다른 버전의 기록은 레벨 1 기본값으로 되돌린다', () => {
    localStorage.setItem(GROWTH_STORAGE_KEY, '{broken');
    expect(loadGrowthState()).toEqual(EMPTY_GROWTH_STATE);
    localStorage.setItem(GROWTH_STORAGE_KEY, JSON.stringify({ schemaVersion: 2, totalXp: 100, days: [] }));
    expect(loadGrowthState()).toEqual(EMPTY_GROWTH_STATE);
  });

  it('저장 예외가 생겨도 실패 결과만 반환한다', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('blocked'); });
    expect(saveGrowthState(EMPTY_GROWTH_STATE)).toBe(false);
    spy.mockRestore();
  });
});
