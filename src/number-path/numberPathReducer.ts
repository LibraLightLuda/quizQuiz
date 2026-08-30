import {
  NUMBER_PATH_STARTING_LIVES,
  nodeAfterPath,
  outgoingBridges,
  validatePath,
  viableNextBridgeIds
} from './numberPathGenerator';
import type { NumberPathProgress } from './types';

export type NumberPathAction =
  | { type: 'LOAD'; progress: NumberPathProgress }
  | { type: 'SELECT_BRIDGE'; bridgeId: string; now?: string }
  | { type: 'UNDO_CROSSING'; now?: string }
  | { type: 'USE_HINT'; now?: string }
  | { type: 'RETRY_AFTER_RESCUE'; now?: string }
  | { type: 'ADVANCE'; now?: string };

const timestamp = (value?: string) => value ?? new Date().toISOString();

export const numberPathReducer = (
  state: NumberPathProgress | null,
  action: NumberPathAction
): NumberPathProgress | null => {
  if (action.type === 'LOAD') return action.progress;
  if (!state) return state;
  const puzzle = state.puzzles[state.puzzleIndex];

  if (action.type === 'SELECT_BRIDGE') {
    if (state.phase !== 'selecting') return state;
    const bridge = outgoingBridges(puzzle, state.currentNodeId).find((item) => item.id === action.bridgeId);
    if (!bridge || state.failedBridgeIds.includes(bridge.id)) return state;

    const candidatePath = [...state.selectedBridgeIds, bridge.id];
    if (viableNextBridgeIds(puzzle, state.selectedBridgeIds).includes(bridge.id)) {
      const solved = validatePath(puzzle, candidatePath).status === 'solved';
      return {
        ...state,
        currentNodeId: bridge.toNodeId,
        selectedBridgeIds: candidatePath,
        failedBridgeIds: [],
        revealedBridgeId: state.revealedBridgeId === bridge.id ? undefined : state.revealedBridgeId,
        completedCount: state.completedCount + (solved ? 1 : 0),
        hintLevel: 0,
        phase: solved ? 'solved' : 'selecting',
        updatedAt: timestamp(action.now)
      };
    }

    const lives = Math.max(0, state.lives - 1);
    const safeBridge = viableNextBridgeIds(puzzle, state.selectedBridgeIds)[0];
    return {
      ...state,
      failedBridgeIds: [...state.failedBridgeIds, bridge.id],
      lives,
      bridgeFailures: state.bridgeFailures + 1,
      revealedBridgeId: lives === 0 ? safeBridge : state.revealedBridgeId,
      phase: lives === 0 ? 'rescue' : 'selecting',
      hintLevel: 0,
      updatedAt: timestamp(action.now)
    };
  }

  if (action.type === 'UNDO_CROSSING') {
    if (state.phase !== 'selecting' || state.selectedBridgeIds.length === 0) return state;
    const selectedBridgeIds = state.selectedBridgeIds.slice(0, -1);
    return {
      ...state,
      selectedBridgeIds,
      currentNodeId: nodeAfterPath(puzzle, selectedBridgeIds) ?? puzzle.startNodeId,
      failedBridgeIds: [],
      backtracks: state.backtracks + 1,
      hintLevel: 0,
      updatedAt: timestamp(action.now)
    };
  }

  if (action.type === 'USE_HINT') {
    if (state.phase !== 'selecting' || state.hintLevel === 2) return state;
    const hintLevel = (state.hintLevel + 1) as 1 | 2;
    return {
      ...state,
      hintLevel,
      hintsUsed: state.hintsUsed + 1,
      revealedBridgeId: hintLevel === 2 ? viableNextBridgeIds(puzzle, state.selectedBridgeIds)[0] : state.revealedBridgeId,
      updatedAt: timestamp(action.now)
    };
  }

  if (action.type === 'RETRY_AFTER_RESCUE') {
    if (state.phase !== 'rescue') return state;
    return {
      ...state,
      currentNodeId: puzzle.startNodeId,
      selectedBridgeIds: [],
      failedBridgeIds: [],
      lives: NUMBER_PATH_STARTING_LIVES,
      retries: state.retries + 1,
      hintLevel: 0,
      phase: 'selecting',
      updatedAt: timestamp(action.now)
    };
  }

  if (action.type === 'ADVANCE') {
    if (state.phase !== 'solved') return state;
    if (state.puzzleIndex === state.puzzles.length - 1) {
      return { ...state, phase: 'finished', updatedAt: timestamp(action.now) };
    }
    const puzzleIndex = state.puzzleIndex + 1;
    const nextPuzzle = state.puzzles[puzzleIndex];
    return {
      ...state,
      puzzleIndex,
      currentNodeId: nextPuzzle.startNodeId,
      selectedBridgeIds: [],
      failedBridgeIds: [],
      lives: NUMBER_PATH_STARTING_LIVES,
      revealedBridgeId: undefined,
      hintLevel: 0,
      phase: 'selecting',
      updatedAt: timestamp(action.now)
    };
  }

  return state;
};
