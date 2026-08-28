import { validatePath } from './numberPathGenerator';
import type { NumberPathProgress } from './types';

export type NumberPathAction =
  | { type: 'LOAD'; progress: NumberPathProgress }
  | { type: 'SELECT_CELL'; cellId: string; now?: string }
  | { type: 'BACKTRACK'; now?: string }
  | { type: 'CLEAR_PATH'; now?: string }
  | { type: 'CHECK_PATH'; now?: string }
  | { type: 'HINT'; now?: string }
  | { type: 'ADVANCE'; now?: string };

const timestamp = (value?: string) => value ?? new Date().toISOString();

export const numberPathReducer = (
  state: NumberPathProgress | null,
  action: NumberPathAction
): NumberPathProgress | null => {
  if (action.type === 'LOAD') return action.progress;
  if (!state) return state;
  const puzzle = state.puzzles[state.puzzleIndex];

  if (action.type === 'SELECT_CELL') {
    if (state.phase !== 'selecting') return state;
    if (state.selectedPath.length === 0) {
      if (action.cellId !== puzzle.startCellId) return state;
      return { ...state, selectedPath: [action.cellId], hintLevel: 0, updatedAt: timestamp(action.now) };
    }
    const lastIndex = state.selectedPath.length - 1;
    if (lastIndex > 0 && state.selectedPath[lastIndex - 1] === action.cellId) {
      return {
        ...state,
        selectedPath: state.selectedPath.slice(0, -1),
        backtracks: state.backtracks + 1,
        hintLevel: 0,
        updatedAt: timestamp(action.now)
      };
    }
    if (state.selectedPath.includes(action.cellId) || state.selectedPath.length >= puzzle.requiredLength) return state;
    const current = puzzle.cells.find((cell) => cell.id === state.selectedPath.at(-1));
    const next = puzzle.cells.find((cell) => cell.id === action.cellId);
    if (!current || !next || next.blocked
      || Math.abs(current.row - next.row) + Math.abs(current.column - next.column) !== 1) return state;
    return {
      ...state,
      selectedPath: [...state.selectedPath, action.cellId],
      hintLevel: 0,
      updatedAt: timestamp(action.now)
    };
  }

  if (action.type === 'BACKTRACK') {
    if (state.phase !== 'selecting' || state.selectedPath.length === 0) return state;
    return {
      ...state,
      selectedPath: state.selectedPath.slice(0, -1),
      backtracks: state.backtracks + 1,
      hintLevel: 0,
      updatedAt: timestamp(action.now)
    };
  }

  if (action.type === 'CLEAR_PATH') {
    if (state.phase !== 'selecting' || state.selectedPath.length === 0) return state;
    return {
      ...state,
      selectedPath: [],
      backtracks: state.backtracks + 1,
      hintLevel: 0,
      updatedAt: timestamp(action.now)
    };
  }

  if (action.type === 'CHECK_PATH') {
    if (state.phase !== 'selecting') return state;
    const solved = validatePath(puzzle, state.selectedPath).status === 'solved';
    return {
      ...state,
      checks: state.checks + 1,
      completedCount: state.completedCount + (solved ? 1 : 0),
      phase: solved ? 'solved' : 'selecting',
      updatedAt: timestamp(action.now)
    };
  }

  if (action.type === 'HINT') {
    if (state.phase !== 'selecting' || state.hintLevel === 2) return state;
    return {
      ...state,
      hintLevel: (state.hintLevel + 1) as 1 | 2,
      hintsUsed: state.hintsUsed + 1,
      updatedAt: timestamp(action.now)
    };
  }

  if (action.type === 'ADVANCE') {
    if (state.phase !== 'solved') return state;
    if (state.puzzleIndex === state.puzzles.length - 1) {
      return { ...state, phase: 'finished', updatedAt: timestamp(action.now) };
    }
    return {
      ...state,
      puzzleIndex: state.puzzleIndex + 1,
      selectedPath: [],
      hintLevel: 0,
      phase: 'selecting',
      updatedAt: timestamp(action.now)
    };
  }

  return state;
};
