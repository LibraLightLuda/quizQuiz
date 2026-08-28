import { describe, expect, it } from 'vitest';
import { SeededRandom } from '../services/randomService';
import {
  NUMBER_PATH_DIFFICULTIES,
  NUMBER_PATH_SESSION_LENGTH,
  createNumberPathProgress,
  enumerateSolutions,
  generateNumberPathPuzzle,
  numberPathPuzzleSignature,
  pathSum,
  validatePath,
  viableNextCellIds
} from './numberPathGenerator';

describe('숫자 길 찾기 문제 생성기', () => {
  for (const difficulty of NUMBER_PATH_DIFFICULTIES) {
    it(`${difficulty} 단계에 정답 경로가 하나뿐인 문제를 만든다`, () => {
      for (let seed = 1; seed <= 100; seed += 1) {
        const puzzle = generateNumberPathPuzzle(difficulty, new SeededRandom(seed));
        const solutions = enumerateSolutions(puzzle, 2);
        expect(solutions).toHaveLength(1);
        expect(solutions[0]).toEqual(puzzle.solutionPath);
        expect(pathSum(puzzle, puzzle.solutionPath)).toBe(puzzle.targetSum);
        expect(validatePath(puzzle, puzzle.solutionPath).status).toBe('solved');
      }
    });
  }

  it('단계가 올라가면 판·길·도착점·체크포인트 규칙이 확장된다', () => {
    const starter = generateNumberPathPuzzle('starter', new SeededRandom(10));
    const growing = generateNumberPathPuzzle('growing', new SeededRandom(10));
    const clever = generateNumberPathPuzzle('clever', new SeededRandom(10));
    const master = generateNumberPathPuzzle('master', new SeededRandom(10));
    expect(starter.rows).toBe(3);
    expect(starter.requiredLength).toBe(2);
    expect(growing.rows).toBe(4);
    expect(growing.requiredLength).toBe(3);
    expect(clever.endCellId).toBe(clever.solutionPath.at(-1));
    expect(clever.cells.filter((cell) => cell.blocked)).toHaveLength(1);
    expect(master.rows).toBe(5);
    expect(master.checkpointCellIds).toHaveLength(1);
    expect(master.cells.some((cell) => cell.value < 0)).toBe(true);
  });

  it('현재 경로에서 실제로 완성 가능한 다음 칸만 힌트로 준다', () => {
    const puzzle = generateNumberPathPuzzle('growing', new SeededRandom(44));
    const prefix = puzzle.solutionPath.slice(0, 1);
    expect(viableNextCellIds(puzzle, prefix)).toContain(puzzle.solutionPath[1]);
    for (const next of viableNextCellIds(puzzle, prefix)) {
      expect(enumerateSolutions(puzzle, 1, [...prefix, next])).toHaveLength(1);
    }
  });

  it('같은 시드는 같은 다섯 문제를 만들고 한 세션에서 중복하지 않는다', () => {
    const first = createNumberPathProgress('growing', new SeededRandom(20260828), { daily: true, dateKey: '2026-08-28' });
    const second = createNumberPathProgress('growing', new SeededRandom(20260828), { daily: true, dateKey: '2026-08-28' });
    expect(first.puzzles).toHaveLength(NUMBER_PATH_SESSION_LENGTH);
    expect(second.puzzles.map(numberPathPuzzleSignature)).toEqual(first.puzzles.map(numberPathPuzzleSignature));
    expect(new Set(first.puzzles.map(numberPathPuzzleSignature)).size).toBe(NUMBER_PATH_SESSION_LENGTH);
  });

  it('무작위 생성이 같은 문제만 내더라도 서로 다른 비상 문제로 세션을 채운다', () => {
    const fixedRandom = { next: () => 0 };
    const progress = createNumberPathProgress('starter', fixedRandom);
    expect(progress.puzzles.some((puzzle) => puzzle.id.includes('fallback'))).toBe(true);
    expect(new Set(progress.puzzles.map(numberPathPuzzleSignature)).size).toBe(NUMBER_PATH_SESSION_LENGTH);
    expect(progress.puzzles.every((puzzle) => enumerateSolutions(puzzle, 2).length === 1)).toBe(true);
  });
});
