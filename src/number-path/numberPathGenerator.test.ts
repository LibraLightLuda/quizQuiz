import { describe, expect, it } from 'vitest';
import { SeededRandom } from '../services/randomService';
import {
  NUMBER_PATH_DIFFICULTIES,
  NUMBER_PATH_SESSION_LENGTH,
  createNumberPathProgress,
  enumerateSolutions,
  generateNumberPathPuzzle,
  numberPathPuzzleSignature,
  outgoingBridges,
  pathSum,
  validatePath,
  viableNextBridgeIds
} from './numberPathGenerator';

describe('숫자 다리 문제 생성기', () => {
  for (const difficulty of NUMBER_PATH_DIFFICULTIES) {
    it(`${difficulty} 단계의 시드 1,000개가 유일한 보물길을 만든다`, () => {
      for (let seed = 1; seed <= 1_000; seed += 1) {
        const puzzle = generateNumberPathPuzzle(difficulty, new SeededRandom(seed));
        const solutions = enumerateSolutions(puzzle, 2);
        expect(solutions).toHaveLength(1);
        expect(solutions[0]).toEqual(puzzle.solutionBridgeIds);
        expect(pathSum(puzzle, puzzle.solutionBridgeIds)).toBe(puzzle.targetSum);
        expect(validatePath(puzzle, puzzle.solutionBridgeIds).status).toBe('solved');
        expect(puzzle.nodes.every((node) => outgoingBridges(puzzle, node.id).length <= 3)).toBe(true);
      }
    });
  }

  it('단계가 올라가면 다리 수·선택지·특수 규칙이 확장된다', () => {
    const starter = generateNumberPathPuzzle('starter', new SeededRandom(10));
    const growing = generateNumberPathPuzzle('growing', new SeededRandom(10));
    const clever = generateNumberPathPuzzle('clever', new SeededRandom(10));
    const master = generateNumberPathPuzzle('master', new SeededRandom(10));
    expect(starter.requiredCrossings).toBe(4);
    expect(growing.requiredCrossings).toBe(5);
    expect(clever.requiredCrossings).toBe(6);
    expect(master.requiredCrossings).toBe(7);
    expect(starter.bridges.every((bridge) => bridge.value >= 1 && bridge.value <= 5)).toBe(true);
    expect(growing.bridges.every((bridge) => bridge.value >= 1 && bridge.value <= 9)).toBe(true);
    expect(growing.nodes.some((node) => outgoingBridges(growing, node.id).length === 3)).toBe(true);
    expect(clever.requiredMarkerBridgeIds).toHaveLength(1);
    expect(clever.bridges.find((bridge) => bridge.id === clever.requiredMarkerBridgeIds[0])?.marker).toBe('key');
    expect(master.requiredMarkerBridgeIds).toHaveLength(2);
    expect(master.requiredMarkerBridgeIds.map((id) => master.bridges.find((bridge) => bridge.id === id)?.markerOrder)).toEqual([1, 2]);
    expect(master.bridges.some((bridge) => bridge.value < 0)).toBe(true);
  });

  it('현재 섬에서 실제로 완성 가능한 다음 다리만 힌트로 준다', () => {
    const puzzle = generateNumberPathPuzzle('growing', new SeededRandom(44));
    const prefix = puzzle.solutionBridgeIds.slice(0, 2);
    expect(viableNextBridgeIds(puzzle, prefix)).toEqual([puzzle.solutionBridgeIds[2]]);
    expect(enumerateSolutions(puzzle, 1, [...prefix, puzzle.solutionBridgeIds[2]])).toHaveLength(1);
  });

  it('같은 시드는 같은 다섯 문제를 만들고 한 세션에서 중복하지 않는다', () => {
    const first = createNumberPathProgress('growing', new SeededRandom(20260828), { daily: true, dateKey: '2026-08-28' });
    const second = createNumberPathProgress('growing', new SeededRandom(20260828), { daily: true, dateKey: '2026-08-28' });
    expect(first.puzzles).toHaveLength(NUMBER_PATH_SESSION_LENGTH);
    expect(second.puzzles.map(numberPathPuzzleSignature)).toEqual(first.puzzles.map(numberPathPuzzleSignature));
    expect(new Set(first.puzzles.map(numberPathPuzzleSignature)).size).toBe(NUMBER_PATH_SESSION_LENGTH);
  });

  it('무작위 생성이 반복되어도 서로 다른 비상 문제로 세션을 채운다', () => {
    const progress = createNumberPathProgress('starter', { next: () => 0 });
    expect(progress.puzzles.some((puzzle) => puzzle.id.includes('fallback'))).toBe(true);
    expect(new Set(progress.puzzles.map(numberPathPuzzleSignature)).size).toBe(NUMBER_PATH_SESSION_LENGTH);
    expect(progress.puzzles.every((puzzle) => enumerateSolutions(puzzle, 2).length === 1)).toBe(true);
  });
});
