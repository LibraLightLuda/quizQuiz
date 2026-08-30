import { describe, expect, it } from 'vitest';
import { SeededRandom } from '../services/randomService';
import {
  anyTrayPieceFits, boardIndex, canPlaceShape, createGardenGame, createGardenTray, emptyGardenBoard,
  occupiedPercent, placeGardenPiece, placementScore, shapeById, validPlacements
} from './blockGardenRules';
import type { GardenGame, GardenPiece } from './types';

const piece = (shapeId: string): GardenPiece => ({ uid: `test-${shapeId}`, shapeId, tone: 'leaf' });

const gameWith = (board: GardenGame['board'], tray: GardenGame['tray'], combo = 0): GardenGame => ({
  schemaVersion: 1,
  board,
  tray,
  score: 0,
  clearedLines: 0,
  combo,
  turns: 0,
  lastCleared: [],
  lastGain: 0,
  status: 'playing',
  updatedAt: '2026-08-30T00:00:00.000Z'
});

describe('빈칸 정원 핵심 규칙', () => {
  it('8×8 빈 판에서 모양의 경계와 겹침을 판정한다', () => {
    const board = emptyGardenBoard();
    const square = shapeById('square-4')!;
    expect(board).toHaveLength(64);
    expect(canPlaceShape(board, square, 6, 6)).toBe(true);
    expect(canPlaceShape(board, square, 7, 7)).toBe(false);
    board[boardIndex(6, 6)] = 'sun';
    expect(canPlaceShape(board, square, 6, 6)).toBe(false);
    expect(validPlacements(board, shapeById('seed')!)).toHaveLength(63);
  });

  it('가로줄을 지우고 배치·제거 점수를 더한다', () => {
    const board = emptyGardenBoard();
    for (let column = 0; column < 7; column += 1) board[boardIndex(0, column)] = 'water';
    const result = placeGardenPiece(gameWith(board, [piece('seed'), null, null]), 0, 0, 7, new SeededRandom(3));
    expect(result.placed).toBe(true);
    expect(result.clearedNow).toBe(1);
    expect(result.game.board.slice(0, 8).every((cell) => cell === null)).toBe(true);
    expect(result.game.score).toBe(41);
    expect(result.game.combo).toBe(1);
  });

  it('교차하는 가로·세로 두 줄을 한 번에 지우고 큰 보너스를 준다', () => {
    const board = emptyGardenBoard();
    for (let column = 0; column < 7; column += 1) board[boardIndex(0, column)] = 'berry';
    for (let row = 1; row < 8; row += 1) board[boardIndex(row, 7)] = 'berry';
    const result = placeGardenPiece(gameWith(board, [piece('seed'), null, null]), 0, 0, 7, new SeededRandom(4));
    expect(result.clearedNow).toBe(2);
    expect(result.game.lastCleared).toHaveLength(15);
    expect(result.game.score).toBe(161);
  });

  it('연속 수에서 다시 줄을 지우면 콤보 보너스를 준다', () => {
    expect(placementScore(1, 1, 1)).toBe(41);
    expect(placementScore(1, 1, 2)).toBe(61);
    expect(placementScore(4, 0, 0)).toBe(4);
  });

  it('세 조각이 모두 막히면 게임오버가 되고 위험도를 계산한다', () => {
    const board = emptyGardenBoard();
    board.forEach((_, index) => { if ((Math.floor(index / 8) + index % 8) % 2 === 0) board[index] = 'lavender'; });
    const tray = [piece('square-4'), piece('line-3-h'), piece('line-3-v')];
    expect(anyTrayPieceFits(board, tray)).toBe(false);
    expect(occupiedPercent(board)).toBe(50);
  });

  it('새 묶음은 보드에 놓을 수 있는 조각을 적어도 하나 보장한다', () => {
    const board = emptyGardenBoard();
    board.forEach((_, index) => { if ((Math.floor(index / 8) + index % 8) % 2 === 0) board[index] = 'leaf'; });
    for (let seed = 1; seed <= 20; seed += 1) {
      expect(anyTrayPieceFits(board, createGardenTray(board, new SeededRandom(seed)))).toBe(true);
    }
  });

  it('새 게임은 빈 판과 서로 다른 세 모양으로 시작한다', () => {
    const game = createGardenGame(new SeededRandom(9), new Date('2026-08-30T00:00:00.000Z'));
    expect(game.board.every((cell) => cell === null)).toBe(true);
    expect(game.tray).toHaveLength(3);
    expect(new Set(game.tray.map((item) => item?.shapeId)).size).toBe(3);
    expect(game.status).toBe('playing');
  });
});
