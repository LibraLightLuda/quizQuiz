import { describe, expect, it } from 'vitest';
import {
  countSolutions,
  generateSudoku,
  isValidSolution,
  SUDOKU_DIFFICULTIES,
  sudokuDefinitions,
  sudokuPuzzleFingerprint
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

  it('숫자만 치환된 같은 구조를 동일 지문으로 인식한다', () => {
    const puzzle = generateSudoku('beginner', 'fingerprint');
    const swapped = {
      ...puzzle,
      puzzle: puzzle.puzzle.map((value) => value === 1 ? 2 : value === 2 ? 1 : value),
      solution: puzzle.solution.map((value) => value === 1 ? 2 : value === 2 ? 1 : value)
    };
    expect(sudokuPuzzleFingerprint(swapped)).toBe(sudokuPuzzleFingerprint(puzzle));
  });
});
