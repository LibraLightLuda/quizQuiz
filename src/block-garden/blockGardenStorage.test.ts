import { beforeEach, describe, expect, it } from 'vitest';
import { SeededRandom } from '../services/randomService';
import { createGardenGame } from './blockGardenRules';
import {
  clearGardenProgress, EMPTY_GARDEN_RECORDS, GARDEN_PROGRESS_KEY, loadGardenProgress, loadGardenRecords,
  recordFinishedGardenGame, saveGardenProgress, saveGardenRecords
} from './blockGardenStorage';

describe('빈칸 정원 저장', () => {
  beforeEach(() => localStorage.clear());

  it('진행 중 판과 최고 기록을 저장하고 불러온다', () => {
    const game = createGardenGame(new SeededRandom(2));
    game.score = 73;
    expect(saveGardenProgress(game)).toBe(true);
    expect(loadGardenProgress()?.score).toBe(73);
    expect(saveGardenRecords({ schemaVersion: 1, highScore: 300, bestLines: 8, gamesPlayed: 2 })).toBe(true);
    expect(loadGardenRecords().highScore).toBe(300);
  });

  it('손상된 저장값은 안전하게 무시한다', () => {
    localStorage.setItem(GARDEN_PROGRESS_KEY, JSON.stringify({ schemaVersion: 1, board: [] }));
    expect(loadGardenProgress()).toBeNull();
    localStorage.setItem('numbercal.block-garden.records.v1', '{broken');
    expect(loadGardenRecords()).toEqual(EMPTY_GARDEN_RECORDS);
  });

  it('게임오버 기록을 한 번 반영하고 진행판을 지운다', () => {
    const game = createGardenGame(new SeededRandom(5), new Date('2026-08-30T00:00:00.000Z'));
    game.score = 420;
    game.clearedLines = 9;
    game.status = 'game-over';
    expect(recordFinishedGardenGame(EMPTY_GARDEN_RECORDS, game)).toEqual({
      schemaVersion: 1,
      highScore: 420,
      bestLines: 9,
      gamesPlayed: 1,
      lastFinishedGameKey: `${game.updatedAt}:${game.turns}:${game.score}:${game.clearedLines}`,
      bestCombo: 0,
      maxLinesInMove: 0,
      dailyCompletedDates: [],
      weeklyKey: '2026-W35',
      weeklyLines: 9,
      weeklyMultiClears: 0,
      modeHighScores: { classic: 420 }
    });
    expect(recordFinishedGardenGame(recordFinishedGardenGame(EMPTY_GARDEN_RECORDS, game), game).gamesPlayed).toBe(1);
    localStorage.setItem(GARDEN_PROGRESS_KEY, '{}');
    expect(clearGardenProgress()).toBe(true);
    expect(localStorage.getItem(GARDEN_PROGRESS_KEY)).toBeNull();
  });

  it('시간·돌·아이템 모드의 확장 상태를 안전하게 저장한다', () => {
    const timed = createGardenGame(new SeededRandom(8), new Date('2026-08-31T00:00:00.000Z'), { mode: 'timed' });
    expect(saveGardenProgress(timed)).toBe(true);
    expect(loadGardenProgress()?.timedEndsAt).toBe('2026-08-31T00:01:30.000Z');

    const items = createGardenGame(new SeededRandom(9), new Date(), { mode: 'items' });
    items.board[0] = 'stone';
    items.itemBoard![1] = 'rotate';
    items.inventory = { bomb: 1, rotate: 2, reroll: 3 };
    expect(saveGardenProgress(items)).toBe(true);
    expect(loadGardenProgress()).toMatchObject({ mode: 'items', inventory: { bomb: 1, rotate: 2, reroll: 3 } });
  });
});
