import type { RandomSource } from '../services/randomService';
import { BOARD_SIZE, type GardenCell, type GardenGame, type GardenPiece, type GardenShape, type GardenTone, type PlacementResult } from './types';

const shape = (id: string, label: string, weight: number, cells: GardenShape['cells']): GardenShape => ({ id, label, weight, cells });

export const GARDEN_SHAPES: readonly GardenShape[] = [
  shape('seed', '씨앗 한 칸', 1.4, [{ row: 0, column: 0 }]),
  shape('pair-h', '가로 두 칸', 2.5, [{ row: 0, column: 0 }, { row: 0, column: 1 }]),
  shape('pair-v', '세로 두 칸', 2.5, [{ row: 0, column: 0 }, { row: 1, column: 0 }]),
  shape('line-3-h', '가로 세 칸', 2.8, [{ row: 0, column: 0 }, { row: 0, column: 1 }, { row: 0, column: 2 }]),
  shape('line-3-v', '세로 세 칸', 2.8, [{ row: 0, column: 0 }, { row: 1, column: 0 }, { row: 2, column: 0 }]),
  shape('corner-ne', '오른쪽 모서리', 2.2, [{ row: 0, column: 0 }, { row: 1, column: 0 }, { row: 1, column: 1 }]),
  shape('corner-nw', '왼쪽 모서리', 2.2, [{ row: 0, column: 1 }, { row: 1, column: 0 }, { row: 1, column: 1 }]),
  shape('corner-se', '아래 오른쪽 모서리', 2.2, [{ row: 0, column: 0 }, { row: 0, column: 1 }, { row: 1, column: 0 }]),
  shape('corner-sw', '아래 왼쪽 모서리', 2.2, [{ row: 0, column: 0 }, { row: 0, column: 1 }, { row: 1, column: 1 }]),
  shape('square-4', '네 칸 네모', 2.5, [{ row: 0, column: 0 }, { row: 0, column: 1 }, { row: 1, column: 0 }, { row: 1, column: 1 }]),
  shape('line-4-h', '가로 네 칸', 1.65, [{ row: 0, column: 0 }, { row: 0, column: 1 }, { row: 0, column: 2 }, { row: 0, column: 3 }]),
  shape('line-4-v', '세로 네 칸', 1.65, [{ row: 0, column: 0 }, { row: 1, column: 0 }, { row: 2, column: 0 }, { row: 3, column: 0 }]),
  shape('zig-h', '가로 계단', 1.55, [{ row: 0, column: 1 }, { row: 0, column: 2 }, { row: 1, column: 0 }, { row: 1, column: 1 }]),
  shape('zig-v', '세로 계단', 1.55, [{ row: 0, column: 0 }, { row: 1, column: 0 }, { row: 1, column: 1 }, { row: 2, column: 1 }]),
  shape('tee', '새싹 모양', 1.35, [{ row: 0, column: 0 }, { row: 0, column: 1 }, { row: 0, column: 2 }, { row: 1, column: 1 }]),
  shape('long-corner', '긴 모서리', 1.15, [{ row: 0, column: 0 }, { row: 1, column: 0 }, { row: 2, column: 0 }, { row: 2, column: 1 }]),
  shape('square-9', '아홉 칸 네모', 0.42, [
    { row: 0, column: 0 }, { row: 0, column: 1 }, { row: 0, column: 2 },
    { row: 1, column: 0 }, { row: 1, column: 1 }, { row: 1, column: 2 },
    { row: 2, column: 0 }, { row: 2, column: 1 }, { row: 2, column: 2 }
  ])
] as const;

export const GARDEN_TONES: readonly GardenTone[] = ['leaf', 'sun', 'berry', 'water', 'lavender'];

export const emptyGardenBoard = (): GardenCell[] => Array.from({ length: BOARD_SIZE * BOARD_SIZE }, () => null);

export const shapeById = (shapeId: string): GardenShape | undefined => GARDEN_SHAPES.find((item) => item.id === shapeId);

export const boardIndex = (row: number, column: number): number => row * BOARD_SIZE + column;

export const canPlaceShape = (board: readonly GardenCell[], gardenShape: GardenShape, row: number, column: number): boolean =>
  gardenShape.cells.every((cell) => {
    const targetRow = row + cell.row;
    const targetColumn = column + cell.column;
    return targetRow >= 0 && targetRow < BOARD_SIZE && targetColumn >= 0 && targetColumn < BOARD_SIZE
      && board[boardIndex(targetRow, targetColumn)] === null;
  });

export const validPlacements = (board: readonly GardenCell[], gardenShape: GardenShape): number[] => {
  const placements: number[] = [];
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let column = 0; column < BOARD_SIZE; column += 1) {
      if (canPlaceShape(board, gardenShape, row, column)) placements.push(boardIndex(row, column));
    }
  }
  return placements;
};

export const pieceFits = (board: readonly GardenCell[], piece: GardenPiece): boolean => {
  const gardenShape = shapeById(piece.shapeId);
  return Boolean(gardenShape && validPlacements(board, gardenShape).length);
};

export const anyTrayPieceFits = (board: readonly GardenCell[], tray: readonly (GardenPiece | null)[]): boolean =>
  tray.some((piece) => piece !== null && pieceFits(board, piece));

const chooseWeightedShape = (random: RandomSource, board: readonly GardenCell[], candidates = GARDEN_SHAPES): GardenShape => {
  const occupiedRatio = board.filter(Boolean).length / board.length;
  const weights = candidates.map((candidate) => {
    const earlyFactor = occupiedRatio < 0.2 && candidate.cells.length <= 2 ? 0.35 : 1;
    return candidate.weight * earlyFactor;
  });
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let cursor = random.next() * total;
  for (let index = 0; index < candidates.length; index += 1) {
    cursor -= weights[index];
    if (cursor <= 0) return candidates[index];
  }
  return candidates[candidates.length - 1];
};

let pieceSequence = 0;
const createPiece = (gardenShape: GardenShape, tone: GardenTone): GardenPiece => ({
  uid: `garden-piece-${Date.now().toString(36)}-${pieceSequence += 1}`,
  shapeId: gardenShape.id,
  tone
});

export const createGardenTray = (board: readonly GardenCell[], random: RandomSource): GardenPiece[] => {
  const selected: GardenShape[] = [];
  for (let slot = 0; slot < 3; slot += 1) {
    const candidates = GARDEN_SHAPES.filter((candidate) => !selected.some((item) => item.id === candidate.id));
    selected.push(chooseWeightedShape(random, board, candidates.length ? candidates : GARDEN_SHAPES));
  }

  if (!selected.some((candidate) => validPlacements(board, candidate).length)) {
    const fitting = GARDEN_SHAPES.filter((candidate) => validPlacements(board, candidate).length);
    if (fitting.length) selected[0] = chooseWeightedShape(random, board, fitting);
  }

  return selected.map((candidate, index) => createPiece(
    candidate,
    GARDEN_TONES[Math.min(GARDEN_TONES.length - 1, Math.floor(random.next() * GARDEN_TONES.length + index) % GARDEN_TONES.length)]
  ));
};

export const createGardenGame = (random: RandomSource, now = new Date()): GardenGame => {
  const board = emptyGardenBoard();
  return {
    schemaVersion: 1,
    board,
    tray: createGardenTray(board, random),
    score: 0,
    clearedLines: 0,
    combo: 0,
    turns: 0,
    lastCleared: [],
    lastGain: 0,
    status: 'playing',
    updatedAt: now.toISOString()
  };
};

const completedLines = (board: readonly GardenCell[]): { rows: number[]; columns: number[]; cells: number[] } => {
  const rows = Array.from({ length: BOARD_SIZE }, (_, row) => row)
    .filter((row) => Array.from({ length: BOARD_SIZE }, (_, column) => board[boardIndex(row, column)]).every(Boolean));
  const columns = Array.from({ length: BOARD_SIZE }, (_, column) => column)
    .filter((column) => Array.from({ length: BOARD_SIZE }, (_, row) => board[boardIndex(row, column)]).every(Boolean));
  const cells = new Set<number>();
  rows.forEach((row) => Array.from({ length: BOARD_SIZE }, (_, column) => cells.add(boardIndex(row, column))));
  columns.forEach((column) => Array.from({ length: BOARD_SIZE }, (_, row) => cells.add(boardIndex(row, column))));
  return { rows, columns, cells: [...cells] };
};

export const placementScore = (pieceCells: number, clearedLines: number, combo: number): number =>
  pieceCells + (clearedLines ? 40 * clearedLines * clearedLines + Math.max(0, combo - 1) * 20 : 0);

export const placeGardenPiece = (
  game: GardenGame,
  trayIndex: number,
  row: number,
  column: number,
  random: RandomSource,
  now = new Date()
): PlacementResult => {
  if (game.status !== 'playing') return { game, placed: false, clearedNow: 0 };
  const piece = game.tray[trayIndex];
  const gardenShape = piece ? shapeById(piece.shapeId) : undefined;
  if (!piece || !gardenShape || !canPlaceShape(game.board, gardenShape, row, column)) {
    return { game, placed: false, clearedNow: 0 };
  }

  const placedBoard = [...game.board];
  gardenShape.cells.forEach((cell) => {
    placedBoard[boardIndex(row + cell.row, column + cell.column)] = piece.tone;
  });
  const completed = completedLines(placedBoard);
  const clearedNow = completed.rows.length + completed.columns.length;
  const board = [...placedBoard];
  completed.cells.forEach((index) => { board[index] = null; });
  const combo = clearedNow ? game.combo + 1 : 0;
  const lastGain = placementScore(gardenShape.cells.length, clearedNow, combo);
  let tray = game.tray.map((item, index) => index === trayIndex ? null : item);
  if (tray.every((item) => item === null)) tray = createGardenTray(board, random);
  const status = anyTrayPieceFits(board, tray) ? 'playing' : 'game-over';

  return {
    placed: true,
    clearedNow,
    game: {
      ...game,
      board,
      tray,
      score: game.score + lastGain,
      clearedLines: game.clearedLines + clearedNow,
      combo,
      turns: game.turns + 1,
      lastCleared: completed.cells,
      lastGain,
      status,
      updatedAt: now.toISOString()
    }
  };
};

export const occupiedPercent = (board: readonly GardenCell[]): number =>
  Math.round(board.filter(Boolean).length / board.length * 100);
