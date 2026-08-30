import { describe, expect, it } from 'vitest';
import { SeededRandom } from '../services/randomService';
import {
  anyTrayPieceFits, boardIndex, canPlaceShape, createGardenGame, createGardenTray, emptyGardenBoard,
  createGardenPreview, createGardenRefillTray, occupiedPercent, pieceFits, placeGardenPiece, placementScore, rerollGardenPiece,
  rotateGardenPiece, shapeById, shapeForPiece, useGardenBomb, validPlacements
} from './blockGardenRules';
import { BOARD_SIZE } from './types';
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
    const line = shapeById('line-3-h')!;
    expect(board).toHaveLength(64);
    expect(canPlaceShape(board, square, 6, 6)).toBe(true);
    expect(canPlaceShape(board, square, 0, 0)).toBe(false);
    expect(canPlaceShape(board, line, 0, 1)).toBe(true);
    expect(canPlaceShape(board, line, 0, 0)).toBe(false);
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
    expect(result.game.score).toBe(191);
  });

  it('연속 수에서 다시 줄을 지우면 콤보 보너스를 준다', () => {
    expect(placementScore(1, 1, 1)).toBe(41);
    expect(placementScore(1, 1, 2)).toBe(71);
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
    expect(game.nextPiece).toBeTruthy();
  });

  it('현재 묶음을 모두 쓰면 미리 본 조각이 다음 묶음 첫 칸으로 들어온다', () => {
    const random = new SeededRandom(22);
    const initial = createGardenGame(random);
    const expectedNext = initial.nextPiece?.shapeId;
    let game = initial;
    for (let slot = 0; slot < 3; slot += 1) {
      const piece = game.tray[slot];
      if (!piece) continue;
      const placement = validPlacements(game.board, shapeById(piece.shapeId)!)[0];
      game = placeGardenPiece(game, slot, Math.floor(placement / BOARD_SIZE), placement % BOARD_SIZE, random).game;
    }
    expect(game.tray[0]?.shapeId).toBe(expectedNext);
    expect(new Set(game.tray.map((item) => item?.shapeId)).size).toBe(3);
    expect(createGardenPreview(game.board, random)).toBeTruthy();
  });

  it('미리 본 조각이 막혀도 새 묶음에는 서로 다른 놓을 수 있는 조각을 넣는다', () => {
    const board = emptyGardenBoard();
    board.forEach((_, index) => { if ((Math.floor(index / 8) + index % 8) % 2 === 0) board[index] = 'leaf'; });
    const upcoming: GardenPiece = { uid: 'blocked-preview', shapeId: 'square-9', tone: 'sun' };
    const tray = createGardenRefillTray(board, new SeededRandom(17), upcoming);
    expect(tray[0]).toBe(upcoming);
    expect(new Set(tray.map((item) => item.shapeId)).size).toBe(3);
    expect(anyTrayPieceFits(board, tray)).toBe(true);
  });

  it('회전 아이템은 자유롭게 모양을 90도 돌린다', () => {
    const game = createGardenGame(new SeededRandom(4), new Date(), { mode: 'items' });
    game.tray = [piece('line-3-h'), null, null];
    game.inventory = { bomb: 0, rotate: 1, reroll: 0 };
    const rotated = rotateGardenPiece(game, 0)!;
    expect(shapeForPiece(rotated.tray[0]!)?.cells).toEqual(shapeById('line-3-v')?.cells);
    expect(rotated.inventory?.rotate).toBe(0);
  });

  it('돌밭 정원의 회색 돌은 줄을 채우지만 라인 제거 뒤에도 남는다', () => {
    const board = emptyGardenBoard();
    board[boardIndex(0, 0)] = 'stone';
    for (let column = 1; column < 7; column += 1) board[boardIndex(0, column)] = 'water';
    const game = { ...gameWith(board, [piece('seed'), null, null]), mode: 'stone' as const };
    const result = placeGardenPiece(game, 0, 0, 7, new SeededRandom(7));
    expect(result.clearedNow).toBe(1);
    expect(result.game.board[boardIndex(0, 0)]).toBe('stone');
    expect(result.game.board.slice(1, 8).every((cell) => cell === null)).toBe(true);
  });

  it('돌밭 정원은 두 번째 줄을 피우면 영구 돌을 추가한다', () => {
    const board = emptyGardenBoard();
    for (let column = 0; column < 7; column += 1) board[boardIndex(0, column)] = 'leaf';
    const game = { ...gameWith(board, [piece('seed'), null, null]), mode: 'stone' as const, clearedLines: 1 };
    const result = placeGardenPiece(game, 0, 0, 7, new SeededRandom(9));
    expect(result.stonesAdded).toBe(1);
    expect(result.game.board.filter((cell) => cell === 'stone')).toHaveLength(1);
  });

  it('아이템 칸을 줄로 지우면 아이템을 얻고 돌 함정은 즉시 발동한다', () => {
    const board = emptyGardenBoard();
    for (let column = 0; column < 7; column += 1) board[boardIndex(0, column)] = 'berry';
    const game = {
      ...gameWith(board, [piece('seed'), null, null]),
      mode: 'items' as const,
      itemBoard: Array.from({ length: 64 }, (_, index) => index === 0 ? 'bomb' as const : index === 1 ? 'stone' as const : null),
      inventory: { bomb: 0, rotate: 0, reroll: 0 }
    };
    const result = placeGardenPiece(game, 0, 0, 7, new SeededRandom(11));
    expect(result.collectedItems).toEqual(expect.arrayContaining(['bomb', 'stone']));
    expect(result.game.inventory?.bomb).toBeGreaterThanOrEqual(1);
    expect(result.stonesAdded).toBe(1);
  });

  it('폭탄은 색깔 블록만 2×2로 치우고 리롤은 선택 조각을 바꾼다', () => {
    const game = createGardenGame(new SeededRandom(13), new Date(), { mode: 'items' });
    game.board[0] = 'leaf';
    game.board[1] = 'stone';
    game.board[8] = 'sun';
    game.inventory = { bomb: 1, rotate: 0, reroll: 1 };
    const bombed = useGardenBomb(game, 0, 0)!;
    expect(bombed.board[0]).toBeNull();
    expect(bombed.board[1]).toBe('stone');
    expect(bombed.board[8]).toBeNull();
    expect(bombed.inventory?.bomb).toBe(0);
    const rerolled = rerollGardenPiece(bombed, 0, new SeededRandom(21))!;
    expect(rerolled.inventory?.reroll).toBe(0);
    expect(pieceFits(rerolled.board, rerolled.tray[0]!)).toBe(true);
  });
});
