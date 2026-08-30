import { describe, expect, it } from 'vitest';
import {
  anyTrayBlockFits, createTray, emptyLineBoard, placeLineBlock, rotateBlock, validPlacements
} from './lineClear';
import type { LineBlock, LineCell } from './types';

const seededRandom = (seed: number) => {
  let state = seed >>> 0;
  return () => ((state = Math.imul(state, 1664525) + 1013904223 >>> 0) / 2 ** 32);
};

const rotations = (block: LineBlock): LineBlock[] => {
  const values = [block];
  for (let index = 0; index < 3; index += 1) values.push(rotateBlock(values.at(-1)!));
  return values;
};

const simulateGame = (seed: number, moveLimit = 250) => {
  const random = seededRandom(seed);
  let board: LineCell[] = emptyLineBoard();
  let tray = createTray(random, board, `simulation-${seed}-0`);
  let moves = 0; let score = 0; let clearedLines = 0;
  while (moves < moveLimit && anyTrayBlockFits(board, tray)) {
    const choices = tray.flatMap((block) => rotations(block).flatMap((candidate) =>
      validPlacements(board, candidate).map(({ x, y }) => {
        const result = placeLineBlock(board, candidate, y, x)!;
        return { block, candidate, result, randomOrder: random() };
      })));
    if (choices.length === 0) break;
    choices.sort((left, right) => right.result.clearedLines - left.result.clearedLines
      || left.result.board.filter(Boolean).length - right.result.board.filter(Boolean).length
      || left.randomOrder - right.randomOrder);
    const choice = choices[Math.floor(random() * Math.min(5, choices.length))];
    board = choice.result.board;
    score += choice.result.gainedScore;
    clearedLines += choice.result.clearedLines;
    tray = tray.filter((block) => block.id !== choice.block.id);
    moves += 1;
    if (tray.length === 0) tray = createTray(random, board, `simulation-${seed}-${moves}`);
  }
  return { moves, score, clearedLines, capped: moves === moveLimit };
};

describe('줄 채우기 장기 밸런스', () => {
  it('시드 60개에서 너무 빠른 종료와 사실상 끝없는 판을 함께 피한다', () => {
    const results = Array.from({ length: 60 }, (_, index) => simulateGame(index + 1));
    const averageMoves = results.reduce((sum, result) => sum + result.moves, 0) / results.length;
    const capped = results.filter((result) => result.capped).length;
    expect(Math.min(...results.map((result) => result.moves))).toBeGreaterThanOrEqual(8);
    expect(averageMoves).toBeGreaterThanOrEqual(24);
    expect(capped).toBeLessThan(30);
    expect(results.every((result) => result.score >= result.moves)).toBe(true);
  });

  it('초기 보드 600묶음에서 모든 모양이 실제로 등장한다', () => {
    const random = seededRandom(77);
    const counts = new Map<string, number>();
    for (let index = 0; index < 600; index += 1) {
      for (const block of createTray(random, emptyLineBoard(), `distribution-${index}`)) counts.set(block.shapeId, (counts.get(block.shapeId) ?? 0) + 1);
    }
    expect(counts.size).toBe(10);
    expect(Math.min(...counts.values())).toBeGreaterThanOrEqual(25);
  });
});
