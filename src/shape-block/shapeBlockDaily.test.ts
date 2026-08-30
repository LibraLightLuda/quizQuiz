import { describe, expect, it } from 'vitest';
import { dailyTangramPuzzle, shapeBlockDateKey } from './shapeBlockDaily';

describe('오늘의 모양', () => {
  it('지역 날짜 키를 만들고 같은 날에는 같은 첫걸음 문제를 고른다', () => {
    const morning = new Date(2026, 7, 30, 8);
    const evening = new Date(2026, 7, 30, 20);
    expect(shapeBlockDateKey(morning)).toBe('2026-08-30');
    expect(dailyTangramPuzzle(morning).id).toBe(dailyTangramPuzzle(evening).id);
    expect(dailyTangramPuzzle(morning).tier).toBe('starter');
  });

  it('날짜에 따라 문제를 순환한다', () => {
    const ids = Array.from({ length: 10 }, (_, day) => dailyTangramPuzzle(new Date(2026, 7, 20 + day)).id);
    expect(new Set(ids).size).toBe(10);
  });
});
