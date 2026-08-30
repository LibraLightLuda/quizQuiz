import { describe, expect, it } from 'vitest';
import { anyTrayBlockFits, createLineBlock, createTray, emptyLineBoard, lineShapeWeight, placeLineBlock, rotateBlock, rotateCells, validPlacements } from './lineClear';
import type { LineCell } from './types';

describe('8×8 줄 채우기 규칙', () => {
  it('블록을 90도 회전하고 좌표를 원점에 맞춘다', () => {
    expect(rotateCells([{ x: 0, y: 0 }, { x: 1, y: 0 }])).toEqual([{ x: 0, y: 0 }, { x: 0, y: 1 }]);
    const block = rotateBlock(createLineBlock(1, 'domino'));
    expect(block.rotation).toBe(90);
    expect(block.cells).toEqual([{ x: 0, y: 0 }, { x: 0, y: 1 }]);
  });

  it('가로와 세로가 동시에 완성되면 두 줄과 41점을 얻는다', () => {
    const board = emptyLineBoard();
    for (let column = 1; column < 8; column += 1) board[column] = '#123';
    for (let row = 1; row < 8; row += 1) board[row * 8] = '#123';
    const result = placeLineBlock(board, createLineBlock(0, 'single'), 0, 0)!;
    expect(result.clearedLines).toBe(2);
    expect(result.gainedScore).toBe(41);
    expect(result.board.filter(Boolean)).toHaveLength(0);
  });

  it('차지한 칸과 경계를 피한 배치만 돌려준다', () => {
    const board = emptyLineBoard(); board[0] = '#123';
    const placements = validPlacements(board, createLineBlock(8, 'five'));
    expect(placements).not.toContainEqual({ x: 0, y: 0 });
    expect(placements).not.toContainEqual({ x: 4, y: 0 });
    expect(placements).toContainEqual({ x: 1, y: 0 });
  });

  it('모든 회전 상태가 들어가지 않으면 종료 상태다', () => {
    const board = emptyLineBoard().map(() => '#full');
    expect(anyTrayBlockFits(board, [createLineBlock(0, 'single')])).toBe(false);
  });

  it('한 묶음에 서로 다른 세 모양을 제공한다', () => {
    let state = 17;
    const random = () => ((state = Math.imul(state, 1664525) + 1013904223 >>> 0) / 2 ** 32);
    for (let index = 0; index < 30; index += 1) {
      const tray = createTray(random, emptyLineBoard(), `tray-${index}`);
      expect(new Set(tray.map((block) => block.shapeId)).size).toBe(3);
    }
  });

  it('초반에는 큰 조각을, 혼잡할 때는 작은 조각을 더 배려한다', () => {
    const empty = emptyLineBoard();
    const crowded = empty.map((_, index) => index % 3 === 0 ? null : '#filled');
    expect(lineShapeWeight(5, empty)).toBeGreaterThan(lineShapeWeight(5, crowded));
    expect(lineShapeWeight(0, crowded)).toBeGreaterThan(lineShapeWeight(0, empty));
  });

  it('빈칸이 남았는데 새 묶음 전체가 놓이지 않는 상황을 피한다', () => {
    const board: LineCell[] = emptyLineBoard().map(() => '#filled');
    board[0] = null; board[63] = null;
    let state = 31;
    const random = () => ((state = Math.imul(state, 1103515245) + 12345 >>> 0) / 2 ** 32);
    for (let index = 0; index < 20; index += 1) expect(anyTrayBlockFits(board, createTray(random, board, `dense-${index}`))).toBe(true);
  });
});
