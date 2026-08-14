import { beforeEach, describe, expect, it } from 'vitest';
import { generateSudoku } from './sudokuGenerator';
import {
  clearSudokuProgress,
  DEFAULT_SUDOKU_RECORDS,
  loadSudokuProgress,
  loadSudokuRecords,
  recommendedSudokuDifficulty,
  saveSudokuCompletion,
  saveSudokuProgress
} from './sudokuStorage';

describe('스도쿠 전용 저장소', () => {
  beforeEach(() => localStorage.clear());

  it('진행 중인 퍼즐을 별도 키에 안전하게 저장하고 복구한다', () => {
    localStorage.setItem('numbercal.settings.v1', '{"keep":true}');
    const puzzle = generateSudoku('beginner', 'storage-test');
    const progress = {
      schemaVersion: 1 as const,
      puzzle,
      grid: [...puzzle.puzzle],
      hinted: Array<boolean>(puzzle.puzzle.length).fill(false),
      elapsedMs: 12345,
      updatedAt: new Date().toISOString(),
      daily: false
    };
    expect(saveSudokuProgress(progress)).toBe(true);
    expect(loadSudokuProgress()).toEqual(progress);
    expect(clearSudokuProgress()).toBe(true);
    expect(loadSudokuProgress()).toBeNull();
    expect(localStorage.getItem('numbercal.settings.v1')).toBe('{"keep":true}');
  });

  it('완료 기록과 실력 기반 추천 단계를 갱신한다', () => {
    const first = saveSudokuCompletion(DEFAULT_SUDOKU_RECORDS, 'beginner', 90000);
    const second = saveSudokuCompletion(first.records, 'beginner', 75000);
    expect(second.records.byDifficulty.beginner?.bestTimeMs).toBe(75000);
    expect(second.records.byDifficulty.beginner?.completedCount).toBe(2);
    expect(loadSudokuRecords()).toEqual(second.records);
    expect(recommendedSudokuDifficulty(second.records)).toBe('growing');
  });

  it('손상된 진행 데이터는 앱에 전달하지 않는다', () => {
    localStorage.setItem('numbercal.sudoku.progress.v1', '{"schemaVersion":1,"puzzle":{}}');
    expect(loadSudokuProgress()).toBeNull();
  });
});
