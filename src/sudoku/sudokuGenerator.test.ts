import { describe, expect, it } from 'vitest';
import {
  countSolutions,
  generateDailySudoku,
  generateSudoku,
  isValidSolution,
  SUDOKU_DIFFICULTIES,
  sudokuDefinitions
} from './sudokuGenerator';

describe('스도쿠 생성기', () => {
  for (const difficulty of SUDOKU_DIFFICULTIES) {
    it(`${difficulty} 단계에 해답이 하나뿐인 정상 퍼즐을 만든다`, () => {
      const definition = sudokuDefinitions[difficulty];
      const puzzle = generateSudoku(difficulty, `unit-${difficulty}`);
      expect(puzzle.puzzle).toHaveLength(definition.size ** 2);
      expect(puzzle.puzzle.filter((cell) => cell === 0).length).toBe(definition.targetBlanks);
      expect(isValidSolution(puzzle.solution, puzzle.size, puzzle.boxRows, puzzle.boxCols)).toBe(true);
      expect(puzzle.puzzle.every((cell, index) => cell === 0 || cell === puzzle.solution[index])).toBe(true);
      expect(countSolutions(puzzle.puzzle, puzzle.size, puzzle.boxRows, puzzle.boxCols, 2)).toBe(1);
    });
  }

  it('같은 날짜의 오늘 퍼즐은 언제나 같다', () => {
    const date = new Date(2026, 7, 14);
    const first = generateDailySudoku('growing', date);
    const second = generateDailySudoku('growing', date);
    expect(second.id).toBe(first.id);
    expect(second.puzzle).toEqual(first.puzzle);
    expect(second.solution).toEqual(first.solution);
  });
});
