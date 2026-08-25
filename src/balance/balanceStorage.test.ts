import { beforeEach, describe, expect, it } from 'vitest';
import { SeededRandom } from '../services/randomService';
import { createBalanceProgress } from './balanceGenerator';
import {
  clearBalanceProgress,
  completeBalanceTutorial,
  DEFAULT_BALANCE_RECORDS,
  loadBalanceProgress,
  loadBalanceRecords,
  rememberBalanceDifficulty,
  saveBalanceCompletion,
  saveBalanceProgress
} from './balanceStorage';

describe('균형 저울 저장소', () => {
  beforeEach(() => localStorage.clear());

  it('v2 진행 중인 다섯 문제를 저장하고 다시 불러온다', () => {
    const progress = createBalanceProgress('starter', new SeededRandom(42));
    expect(saveBalanceProgress(progress)).toBe(true);
    expect(loadBalanceProgress()).toEqual(progress);
    expect(clearBalanceProgress()).toBe(true);
    expect(loadBalanceProgress()).toBeNull();
  });

  it('v1 진행과 기록을 잃지 않고 v2로 변환한다', () => {
    const progress = createBalanceProgress('starter', new SeededRandom(17));
    const oldPuzzles = progress.puzzles.map((puzzle) => ({
      id: puzzle.id,
      difficulty: puzzle.difficulty,
      baseLeft: puzzle.baseLeft,
      baseRight: puzzle.baseRight,
      movableSide: puzzle.allowedSides[0],
      weights: puzzle.weights,
      solutionWeightIds: Object.keys(puzzle.solutionPlacements)
    }));
    localStorage.setItem('numbercal.balance.progress.v1', JSON.stringify({
      schemaVersion: 1,
      difficulty: 'starter',
      puzzles: oldPuzzles,
      puzzleIndex: 0,
      placedWeightIds: [],
      completedCount: 0,
      moves: 0,
      hintLevel: 0,
      updatedAt: new Date().toISOString()
    }));
    localStorage.setItem('numbercal.balance.records.v1', JSON.stringify({
      schemaVersion: 1,
      lastDifficulty: 'growing',
      completedSessions: 2,
      completedPuzzles: 10
    }));
    expect(loadBalanceProgress()).toMatchObject({ schemaVersion: 2, difficulty: 'starter', placements: {} });
    expect(loadBalanceRecords()).toMatchObject({ schemaVersion: 2, lastDifficulty: 'growing', completedSessions: 2, completedPuzzles: 10 });
  });

  it('손상되거나 풀 수 없는 진행 데이터는 무시한다', () => {
    localStorage.setItem('numbercal.balance.progress.v1', JSON.stringify({ schemaVersion: 2, difficulty: 'starter' }));
    expect(loadBalanceProgress()).toBeNull();
  });

  it('튜토리얼, 단계별 최고 기록과 오늘의 배지를 누적한다', () => {
    const tutorial = completeBalanceTutorial(DEFAULT_BALANCE_RECORDS);
    const remembered = rememberBalanceDifficulty(tutorial.records, 'master');
    const progress = createBalanceProgress('master', new SeededRandom(99), { daily: true, dateKey: '2026-08-26' });
    progress.moves = 8;
    const completed = saveBalanceCompletion(remembered.records, progress);
    expect(completed.earnedDailyBadge).toBe(true);
    expect(completed.records).toMatchObject({
      tutorialCompleted: true,
      lastDifficulty: 'master',
      completedSessions: 1,
      completedPuzzles: 5,
      dailyBadges: ['2026-08-26'],
      byDifficulty: { master: { completedSessions: 1, completedPuzzles: 5, bestMoves: 8 } }
    });
    expect(loadBalanceRecords()).toEqual(completed.records);
  });
});
