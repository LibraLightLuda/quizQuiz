import { describe, expect, it } from 'vitest';
import { availableSudokuNumbers, conflictMessage, sudokuConflicts } from './sudokuRules';

const grid = [
  1, 2, 0, 4,
  3, 4, 1, 2,
  2, 1, 4, 3,
  4, 3, 2, 1
];

describe('스도쿠 입력 규칙', () => {
  it('가로줄·세로줄·작은 상자의 중복을 각각 찾는다', () => {
    expect(sudokuConflicts(grid, 2, 1, 4, 2, 2)).toContain('row');
    expect(sudokuConflicts(grid, 2, 2, 4, 2, 2)).toContain('row');
    expect(sudokuConflicts(grid, 2, 4, 4, 2, 2)).toEqual(expect.arrayContaining(['row', 'column']));
    expect(sudokuConflicts(grid, 2, 3, 4, 2, 2)).toEqual([]);
  });

  it('현재 칸에 들어갈 수 있는 숫자만 남긴다', () => {
    expect(availableSudokuNumbers(grid, 2, 4, 2, 2)).toEqual([3]);
  });

  it('겹치는 위치를 어린이에게 이해하기 쉽게 설명한다', () => {
    expect(conflictMessage(4, ['row', 'column'])).toBe('숫자 4은(는) 같은 가로줄과 세로줄에 이미 있어요.');
  });
});
