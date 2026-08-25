import { isBalanced } from './balanceGenerator';
import type { BalanceProgress, BalanceSide } from './types';

export type BalanceAction =
  | { type: 'LOAD'; progress: BalanceProgress }
  | { type: 'PLACE'; weightId: string; side: BalanceSide; now?: string }
  | { type: 'REMOVE'; weightId: string; now?: string }
  | { type: 'HINT'; now?: string }
  | { type: 'ADVANCE'; now?: string };

const timestamp = (value?: string) => value ?? new Date().toISOString();

export const balanceReducer = (state: BalanceProgress | null, action: BalanceAction): BalanceProgress | null => {
  if (action.type === 'LOAD') return action.progress;
  if (!state) return state;
  const puzzle = state.puzzles[state.puzzleIndex];

  if (action.type === 'PLACE') {
    if (state.phase !== 'playing' || state.placements[action.weightId]
      || !puzzle.allowedSides.includes(action.side)
      || !puzzle.weights.some((weight) => weight.id === action.weightId)) return state;
    const placements = { ...state.placements, [action.weightId]: action.side };
    const solved = isBalanced(puzzle, placements);
    return {
      ...state,
      placements,
      moves: state.moves + 1,
      completedCount: state.completedCount + (solved ? 1 : 0),
      phase: solved ? 'solved' : 'playing',
      updatedAt: timestamp(action.now)
    };
  }

  if (action.type === 'REMOVE') {
    if (state.phase !== 'playing' || !state.placements[action.weightId]) return state;
    const placements = { ...state.placements };
    delete placements[action.weightId];
    return { ...state, placements, moves: state.moves + 1, updatedAt: timestamp(action.now) };
  }

  if (action.type === 'HINT') {
    if (state.phase !== 'playing' || state.hintLevel === 2) return state;
    return {
      ...state,
      hintLevel: (state.hintLevel + 1) as 1 | 2,
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
      placements: {},
      hintLevel: 0,
      phase: 'playing',
      updatedAt: timestamp(action.now)
    };
  }

  return state;
};
