import { beforeEach, describe, expect, it } from 'vitest';
import { createLineClearProgress } from './lineClear';
import { TANGRAM_PUZZLES } from './tangramData';
import { createTangramProgress } from './tangramRules';
import {
  DEFAULT_SHAPE_BLOCK_RECORDS, loadLineProgress, loadShapeBlockRecords, loadTangramProgress,
  normalizeShapeBlockRecords, saveLineCompletion, saveLineProgress, saveTangramCompletion, saveTangramProgress
} from './shapeBlockStorage';

describe('모양블록 저장', () => {
  beforeEach(() => localStorage.clear());

  it('손상된 기록은 안전한 기본값으로 복구한다', () => {
    localStorage.setItem('numbercal.shape-block.records.v1', '{broken');
    expect(loadShapeBlockRecords()).toEqual(DEFAULT_SHAPE_BLOCK_RECORDS);
    expect(normalizeShapeBlockRecords({ schemaVersion: 9 })).toEqual(DEFAULT_SHAPE_BLOCK_RECORDS);
  });

  it('문제별 최고 별만 보존한다', () => {
    let saved = saveTangramCompletion(DEFAULT_SHAPE_BLOCK_RECORDS, TANGRAM_PUZZLES[0].id, 3).records;
    saved = saveTangramCompletion(saved, TANGRAM_PUZZLES[0].id, 1).records;
    expect(saved.tangramStars[TANGRAM_PUZZLES[0].id]).toBe(3);
  });

  it('오늘의 모양 완료 날짜를 중복 없이 보존하고 이전 기록도 보완한다', () => {
    let saved = saveTangramCompletion(DEFAULT_SHAPE_BLOCK_RECORDS, TANGRAM_PUZZLES[0].id, 2, '2026-08-30').records;
    saved = saveTangramCompletion(saved, TANGRAM_PUZZLES[0].id, 3, '2026-08-30').records;
    expect(saved.dailyBadges).toEqual(['2026-08-30']);
    expect(normalizeShapeBlockRecords({ ...DEFAULT_SHAPE_BLOCK_RECORDS, dailyBadges: undefined }).dailyBadges).toEqual([]);
  });

  it('두 게임의 진행 상태를 별도 키에서 복구한다', () => {
    const tangram = createTangramProgress(TANGRAM_PUZZLES[0], '2026-08-30');
    const line = createLineClearProgress(() => 0.1);
    expect(saveTangramProgress(tangram)).toBe(true);
    expect(saveLineProgress(line)).toBe(true);
    expect(loadTangramProgress()?.puzzleId).toBe(tangram.puzzleId);
    expect(loadTangramProgress()?.dailyDateKey).toBe('2026-08-30');
    expect(loadLineProgress()?.id).toBe(line.id);
  });

  it('좌표나 트레이가 손상된 진행 상태는 이어 하지 않는다', () => {
    const tangram = createTangramProgress(TANGRAM_PUZZLES[0]);
    tangram.pieces[0].rotation = 13;
    localStorage.setItem('numbercal.shape-block.tangram-progress.v1', JSON.stringify(tangram));
    const line = createLineClearProgress(() => 0.1);
    line.tray[0].cells[0].x = 99;
    localStorage.setItem('numbercal.shape-block.line-clear-progress.v1', JSON.stringify(line));
    expect(loadTangramProgress()).toBeNull();
    expect(loadLineProgress()).toBeNull();
  });

  it('줄 채우기 최고점과 누적 줄을 기록한다', () => {
    const progress = { ...createLineClearProgress(() => 0.1), score: 321, clearedLines: 12, bestSingleClear: 2, phase: 'finished' as const };
    const saved = saveLineCompletion(DEFAULT_SHAPE_BLOCK_RECORDS, progress).records;
    expect(saved).toMatchObject({ lineHighScore: 321, lineGames: 1, totalLines: 12, bestSingleClear: 2 });
    expect(saveLineCompletion(saved, progress).records.lineGames).toBe(1);
  });
});
