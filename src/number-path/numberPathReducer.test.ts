import { describe, expect, it } from 'vitest';
import { SeededRandom } from '../services/randomService';
import { createNumberPathProgress } from './numberPathGenerator';
import { numberPathReducer } from './numberPathReducer';

describe('숫자 길 찾기 상태 전환', () => {
  it('시작점·상하좌우·중복 규칙을 지킨다', () => {
    const progress = createNumberPathProgress('growing', new SeededRandom(2));
    const puzzle = progress.puzzles[0];
    const wrongStart = puzzle.cells.find((cell) => cell.id !== puzzle.startCellId)!.id;
    expect(numberPathReducer(progress, { type: 'SELECT_CELL', cellId: wrongStart })).toBe(progress);
    const started = numberPathReducer(progress, { type: 'SELECT_CELL', cellId: puzzle.startCellId })!;
    const far = puzzle.cells.find((cell) => {
      const start = puzzle.cells.find((item) => item.id === puzzle.startCellId)!;
      return Math.abs(cell.row - start.row) + Math.abs(cell.column - start.column) > 1;
    })!.id;
    expect(numberPathReducer(started, { type: 'SELECT_CELL', cellId: far })).toBe(started);
    const extended = numberPathReducer(started, { type: 'SELECT_CELL', cellId: puzzle.solutionPath[1] })!;
    expect(extended.selectedPath).toEqual(puzzle.solutionPath.slice(0, 2));
    expect(numberPathReducer(extended, { type: 'SELECT_CELL', cellId: puzzle.startCellId })?.selectedPath).toEqual([puzzle.startCellId]);
  });

  it('정답 확인과 완료는 빠르게 반복해도 한 번만 처리한다', () => {
    let progress = createNumberPathProgress('starter', new SeededRandom(3));
    for (const id of progress.puzzles[0].solutionPath) progress = numberPathReducer(progress, { type: 'SELECT_CELL', cellId: id })!;
    progress = numberPathReducer(progress, { type: 'CHECK_PATH' })!;
    expect(progress.phase).toBe('solved');
    expect(progress.completedCount).toBe(1);
    expect(numberPathReducer(progress, { type: 'CHECK_PATH' })).toBe(progress);
    const advanced = numberPathReducer(progress, { type: 'ADVANCE' })!;
    expect(advanced.puzzleIndex).toBe(1);
    expect(numberPathReducer(advanced, { type: 'ADVANCE' })).toBe(advanced);
  });

  it('되돌리기·모두 지우기·힌트 기록을 안전하게 누적한다', () => {
    let progress = createNumberPathProgress('starter', new SeededRandom(4));
    progress = numberPathReducer(progress, { type: 'SELECT_CELL', cellId: progress.puzzles[0].startCellId })!;
    progress = numberPathReducer(progress, { type: 'HINT' })!;
    progress = numberPathReducer(progress, { type: 'BACKTRACK' })!;
    expect(progress.selectedPath).toEqual([]);
    expect(progress.backtracks).toBe(1);
    expect(progress.hintsUsed).toBe(1);
    expect(numberPathReducer(progress, { type: 'BACKTRACK' })).toBe(progress);
  });
});
