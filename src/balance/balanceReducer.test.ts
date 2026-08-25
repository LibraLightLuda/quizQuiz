import { describe, expect, it } from 'vitest';
import { SeededRandom } from '../services/randomService';
import { createBalanceProgress } from './balanceGenerator';
import { balanceReducer } from './balanceReducer';

describe('균형 저울 상태 전환', () => {
  it('같은 추 연타와 정답 뒤 입력으로 완료 수가 중복되지 않는다', () => {
    const progress = createBalanceProgress('starter', new SeededRandom(5));
    const puzzle = progress.puzzles[0];
    const [weightId, side] = Object.entries(puzzle.solutionPlacements)[0];
    const solved = balanceReducer(progress, { type: 'PLACE', weightId, side, now: '2026-08-26T00:00:00.000Z' })!;
    const repeated = balanceReducer(solved, { type: 'PLACE', weightId, side, now: '2026-08-26T00:00:01.000Z' })!;
    expect(solved.phase).toBe('solved');
    expect(repeated).toBe(solved);
    expect(repeated.completedCount).toBe(1);
    expect(Object.keys(repeated.placements)).toEqual([weightId]);
  });

  it('다음 버튼 연타는 한 문제만 이동한다', () => {
    const progress = createBalanceProgress('starter', new SeededRandom(6));
    const puzzle = progress.puzzles[0];
    const [weightId, side] = Object.entries(puzzle.solutionPlacements)[0];
    const solved = balanceReducer(progress, { type: 'PLACE', weightId, side })!;
    const advanced = balanceReducer(solved, { type: 'ADVANCE' })!;
    const repeated = balanceReducer(advanced, { type: 'ADVANCE' })!;
    expect(advanced.puzzleIndex).toBe(1);
    expect(repeated).toBe(advanced);
  });
});
