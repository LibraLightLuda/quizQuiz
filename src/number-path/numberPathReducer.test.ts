import { describe, expect, it } from 'vitest';
import { SeededRandom } from '../services/randomService';
import { createNumberPathProgress, outgoingBridges, viableNextBridgeIds } from './numberPathGenerator';
import { numberPathReducer } from './numberPathReducer';
import type { NumberPathProgress } from './types';

const crossSolution = (progress: NumberPathProgress, count = progress.puzzles[progress.puzzleIndex].solutionBridgeIds.length) => {
  let next = progress;
  for (const id of progress.puzzles[progress.puzzleIndex].solutionBridgeIds.slice(0, count)) {
    next = numberPathReducer(next, { type: 'SELECT_BRIDGE', bridgeId: id })!;
  }
  return next;
};

describe('숫자 다리 상태 전환', () => {
  it('위험한 다리는 하트만 한 번 줄이고 현재 섬에 남긴다', () => {
    const progress = createNumberPathProgress('starter', new SeededRandom(2));
    const puzzle = progress.puzzles[0];
    const safe = viableNextBridgeIds(puzzle, [])[0];
    const danger = outgoingBridges(puzzle, progress.currentNodeId).find((bridge) => bridge.id !== safe)!;
    const failed = numberPathReducer(progress, { type: 'SELECT_BRIDGE', bridgeId: danger.id })!;
    expect(failed.currentNodeId).toBe(puzzle.startNodeId);
    expect(failed.selectedBridgeIds).toEqual([]);
    expect(failed.failedBridgeIds).toEqual([danger.id]);
    expect(failed.lives).toBe(2);
    expect(numberPathReducer(failed, { type: 'SELECT_BRIDGE', bridgeId: danger.id })).toBe(failed);
    const crossed = numberPathReducer(failed, { type: 'SELECT_BRIDGE', bridgeId: safe })!;
    expect(crossed.selectedBridgeIds).toEqual([safe]);
    expect(crossed.failedBridgeIds).toEqual([]);
  });

  it('첫걸음도 네 다리를 건너야 자동으로 해결된다', () => {
    const initial = createNumberPathProgress('starter', new SeededRandom(3));
    const almost = crossSolution(initial, 3);
    expect(almost.phase).toBe('selecting');
    expect(almost.completedCount).toBe(0);
    const solved = numberPathReducer(almost, {
      type: 'SELECT_BRIDGE',
      bridgeId: initial.puzzles[0].solutionBridgeIds[3]
    })!;
    expect(solved.phase).toBe('solved');
    expect(solved.completedCount).toBe(1);
    expect(numberPathReducer(solved, { type: 'SELECT_BRIDGE', bridgeId: 'anything' })).toBe(solved);
    const advanced = numberPathReducer(solved, { type: 'ADVANCE' })!;
    expect(advanced.puzzleIndex).toBe(1);
    expect(advanced.lives).toBe(3);
    expect(numberPathReducer(advanced, { type: 'ADVANCE' })).toBe(advanced);
  });

  it('이전 섬으로 무료로 돌아가 합과 위치를 복원한다', () => {
    const initial = createNumberPathProgress('growing', new SeededRandom(4));
    const crossed = crossSolution(initial, 2);
    const undone = numberPathReducer(crossed, { type: 'UNDO_CROSSING' })!;
    expect(undone.selectedBridgeIds).toEqual(initial.puzzles[0].solutionBridgeIds.slice(0, 1));
    expect(undone.lives).toBe(3);
    expect(undone.backtracks).toBe(1);
    expect(undone.currentNodeId).not.toBe(crossed.currentNodeId);
  });

  it('하트를 모두 쓰면 안전한 다리를 보여 주고 같은 지도를 재시작한다', () => {
    let progress = createNumberPathProgress('starter', new SeededRandom(8));
    const puzzle = progress.puzzles[0];
    for (let step = 0; step < 3; step += 1) {
      const safe = viableNextBridgeIds(puzzle, progress.selectedBridgeIds)[0];
      const danger = outgoingBridges(puzzle, progress.currentNodeId).find((bridge) => bridge.id !== safe)!;
      progress = numberPathReducer(progress, { type: 'SELECT_BRIDGE', bridgeId: danger.id })!;
      if (step < 2) progress = numberPathReducer(progress, { type: 'SELECT_BRIDGE', bridgeId: safe })!;
    }
    expect(progress.phase).toBe('rescue');
    expect(progress.lives).toBe(0);
    expect(progress.revealedBridgeId).toBeTruthy();
    const retried = numberPathReducer(progress, { type: 'RETRY_AFTER_RESCUE' })!;
    expect(retried.phase).toBe('selecting');
    expect(retried.currentNodeId).toBe(puzzle.startNodeId);
    expect(retried.selectedBridgeIds).toEqual([]);
    expect(retried.lives).toBe(3);
    expect(retried.retries).toBe(1);
    expect(retried.revealedBridgeId).toBe(progress.revealedBridgeId);
  });
});
