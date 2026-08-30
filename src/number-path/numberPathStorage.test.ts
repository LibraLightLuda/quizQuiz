import { beforeEach, describe, expect, it } from 'vitest';
import { SeededRandom } from '../services/randomService';
import { createNumberPathProgress } from './numberPathGenerator';
import { numberPathReducer } from './numberPathReducer';
import {
  DEFAULT_NUMBER_PATH_RECORDS,
  clearNumberPathRecords,
  loadNumberPathProgress,
  loadNumberPathRecords,
  saveNumberPathCompletion,
  saveNumberPathProgress
} from './numberPathStorage';

describe('숫자 다리 저장소', () => {
  beforeEach(() => localStorage.clear());

  it('현재 섬·경로·하트와 다섯 문제를 저장하고 복구한다', () => {
    const initial = createNumberPathProgress('growing', new SeededRandom(8));
    let progress = numberPathReducer(initial, {
      type: 'SELECT_BRIDGE',
      bridgeId: initial.puzzles[0].solutionBridgeIds[0]
    })!;
    const safe = progress.puzzles[0].solutionBridgeIds[1];
    const danger = progress.puzzles[0].bridges.find((bridge) =>
      bridge.fromNodeId === progress.currentNodeId && bridge.id !== safe)!;
    progress = numberPathReducer(progress, { type: 'SELECT_BRIDGE', bridgeId: danger.id })!;
    expect(saveNumberPathProgress(progress)).toBe(true);
    expect(loadNumberPathProgress()).toEqual(progress);
  });

  it('옛 격자 진행은 종료하지만 v1 완료 기록은 v2로 이전한다', () => {
    localStorage.setItem('numbercal.number-path.progress.v1', JSON.stringify({ schemaVersion: 1, selectedPath: ['r0c0'] }));
    localStorage.setItem('numbercal.number-path.records.v1', JSON.stringify({
      schemaVersion: 1,
      lastDifficulty: 'growing',
      completedSessions: 2,
      completedPuzzles: 10,
      totalBacktracks: 4,
      hintSessions: 1,
      byDifficulty: { growing: { completedSessions: 2, completedPuzzles: 10 } },
      recentSignatures: ['old'],
      dailyBadges: ['2026-08-28'],
      tutorialCompleted: true
    }));
    expect(loadNumberPathProgress()).toBeNull();
    expect(localStorage.getItem('numbercal.number-path.progress.v1')).toBeNull();
    expect(loadNumberPathRecords()).toMatchObject({
      schemaVersion: 2,
      completedPuzzles: 10,
      totalBacktracks: 4,
      totalBridgeFailures: 0,
      totalRetries: 0,
      tutorialCompleted: true
    });
  });

  it('손상된 다리 경로는 버리고 기록은 안전하게 복구한다', () => {
    const progress = createNumberPathProgress('starter', new SeededRandom(9));
    progress.selectedBridgeIds = ['없는-다리'];
    localStorage.setItem('numbercal.number-path.progress.v2', JSON.stringify(progress));
    localStorage.setItem('numbercal.number-path.records.v1', '{broken');
    expect(loadNumberPathProgress()).toBeNull();
    expect(loadNumberPathRecords()).toEqual(DEFAULT_NUMBER_PATH_RECORDS);
  });

  it('현재 위치나 완료 수가 경로와 맞지 않으면 복구하지 않는다', () => {
    const progress = createNumberPathProgress('starter', new SeededRandom(12));
    progress.currentNodeId = progress.puzzles[0].endNodeId;
    progress.completedCount = 3;
    localStorage.setItem('numbercal.number-path.progress.v2', JSON.stringify(progress));
    expect(loadNumberPathProgress()).toBeNull();
  });

  it('연결되지 않은 다리가 저장되면 진행을 복구하지 않는다', () => {
    const progress = createNumberPathProgress('starter', new SeededRandom(13));
    progress.puzzles[0].bridges[0].toNodeId = '없는-섬';
    localStorage.setItem('numbercal.number-path.progress.v2', JSON.stringify(progress));
    expect(loadNumberPathProgress()).toBeNull();
  });

  it('완료 기록, 위험 다리와 오늘의 배지를 한 세션 단위로 저장한다', () => {
    const progress = createNumberPathProgress('clever', new SeededRandom(10), { daily: true, dateKey: '2026-08-28' });
    progress.phase = 'finished';
    progress.backtracks = 4;
    progress.bridgeFailures = 3;
    progress.retries = 1;
    progress.hintsUsed = 1;
    const first = saveNumberPathCompletion(DEFAULT_NUMBER_PATH_RECORDS, progress);
    expect(first.earnedDailyBadge).toBe(true);
    expect(first.records.completedPuzzles).toBe(5);
    expect(first.records.byDifficulty.clever?.completedSessions).toBe(1);
    expect(first.records.totalBacktracks).toBe(4);
    expect(first.records.totalBridgeFailures).toBe(3);
    expect(first.records.totalRetries).toBe(1);
    expect(saveNumberPathCompletion(first.records, progress).earnedDailyBadge).toBe(false);
    expect(clearNumberPathRecords()).toBe(true);
    expect(loadNumberPathRecords()).toEqual(DEFAULT_NUMBER_PATH_RECORDS);
  });
});
