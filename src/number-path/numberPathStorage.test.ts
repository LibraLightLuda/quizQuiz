import { beforeEach, describe, expect, it } from 'vitest';
import { SeededRandom } from '../services/randomService';
import { createNumberPathProgress } from './numberPathGenerator';
import {
  DEFAULT_NUMBER_PATH_RECORDS,
  clearNumberPathRecords,
  loadNumberPathProgress,
  loadNumberPathRecords,
  saveNumberPathCompletion,
  saveNumberPathProgress
} from './numberPathStorage';

describe('숫자 길 찾기 저장소', () => {
  beforeEach(() => localStorage.clear());

  it('선택한 경로와 다섯 문제를 저장하고 복구한다', () => {
    const progress = createNumberPathProgress('growing', new SeededRandom(8));
    progress.selectedPath = progress.puzzles[0].solutionPath.slice(0, 2);
    expect(saveNumberPathProgress(progress)).toBe(true);
    expect(loadNumberPathProgress()).toEqual(progress);
  });

  it('손상된 진행은 버리고 게임 기록은 기본값으로 안전하게 복구한다', () => {
    const progress = createNumberPathProgress('starter', new SeededRandom(9));
    progress.selectedPath = ['없는-칸'];
    localStorage.setItem('numbercal.number-path.progress.v1', JSON.stringify(progress));
    localStorage.setItem('numbercal.number-path.records.v1', '{broken');
    expect(loadNumberPathProgress()).toBeNull();
    expect(loadNumberPathRecords()).toEqual(DEFAULT_NUMBER_PATH_RECORDS);
  });

  it('빈 경로라도 완료 수가 현재 문제와 다르면 손상된 진행으로 판단한다', () => {
    const progress = createNumberPathProgress('starter', new SeededRandom(12));
    progress.completedCount = 3;
    localStorage.setItem('numbercal.number-path.progress.v1', JSON.stringify(progress));
    expect(loadNumberPathProgress()).toBeNull();
  });

  it('좌표와 맞지 않는 칸 ID가 저장되면 진행을 복구하지 않는다', () => {
    const progress = createNumberPathProgress('starter', new SeededRandom(13));
    progress.puzzles[0].cells[0].id = 'r2c2';
    localStorage.setItem('numbercal.number-path.progress.v1', JSON.stringify(progress));
    expect(loadNumberPathProgress()).toBeNull();
  });

  it('완료 기록과 오늘의 배지를 한 세션 단위로 저장한다', () => {
    const progress = createNumberPathProgress('clever', new SeededRandom(10), { daily: true, dateKey: '2026-08-28' });
    progress.phase = 'finished';
    progress.backtracks = 4;
    progress.hintsUsed = 1;
    const first = saveNumberPathCompletion(DEFAULT_NUMBER_PATH_RECORDS, progress);
    expect(first.earnedDailyBadge).toBe(true);
    expect(first.records.completedPuzzles).toBe(5);
    expect(first.records.byDifficulty.clever?.completedSessions).toBe(1);
    expect(first.records.totalBacktracks).toBe(4);
    expect(saveNumberPathCompletion(first.records, progress).earnedDailyBadge).toBe(false);
    expect(clearNumberPathRecords()).toBe(true);
    expect(loadNumberPathRecords()).toEqual(DEFAULT_NUMBER_PATH_RECORDS);
  });
});
