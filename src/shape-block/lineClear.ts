import type { LineBlock, LineCell, LineClearProgress, Point } from './types';

export const LINE_BOARD_SIZE = 8;
const colors = ['#f26b5e', '#f3a82c', '#46b77b', '#3b9fd0', '#6767d9', '#aa6bd7'];
export const LINE_SHAPES: ReadonlyArray<{ id: string; cells: readonly Point[] }> = [
  { id: 'single', cells: [{ x: 0, y: 0 }] },
  { id: 'domino', cells: [{ x: 0, y: 0 }, { x: 1, y: 0 }] },
  { id: 'tri-line', cells: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }] },
  { id: 'tri-l', cells: [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }] },
  { id: 'square', cells: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }] },
  { id: 'tetra-l', cells: [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 1, y: 2 }] },
  { id: 'tetra-t', cells: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 1, y: 1 }] },
  { id: 'tetra-z', cells: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 1 }] },
  { id: 'five-line', cells: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 0 }] },
  { id: 'five-plus', cells: [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 1, y: 2 }] }
];

export const rotateCells = (cells: readonly Point[], turns = 1): Point[] => {
  let result = cells.map((cell) => ({ ...cell }));
  for (let turn = 0; turn < ((turns % 4) + 4) % 4; turn += 1) {
    result = result.map(({ x, y }) => ({ x: -y, y: x }));
    const minX = Math.min(...result.map((cell) => cell.x));
    const minY = Math.min(...result.map((cell) => cell.y));
    result = result.map(({ x, y }) => ({ x: x - minX, y: y - minY }));
  }
  return result.sort((left, right) => left.y - right.y || left.x - right.x);
};

export const createLineBlock = (shapeIndex: number, id: string, colorIndex = shapeIndex): LineBlock => {
  const shape = LINE_SHAPES[shapeIndex % LINE_SHAPES.length];
  return { id, shapeId: shape.id, rotation: 0, cells: shape.cells.map((cell) => ({ ...cell })), color: colors[colorIndex % colors.length] };
};

export const emptyLineBoard = (): LineCell[] => Array<LineCell>(LINE_BOARD_SIZE * LINE_BOARD_SIZE).fill(null);
const boardIndex = (row: number, column: number) => row * LINE_BOARD_SIZE + column;

export const canPlaceBlock = (board: readonly LineCell[], block: LineBlock, row: number, column: number): boolean =>
  block.cells.every((cell) => {
    const nextRow = row + cell.y;
    const nextColumn = column + cell.x;
    return nextRow >= 0 && nextRow < LINE_BOARD_SIZE && nextColumn >= 0 && nextColumn < LINE_BOARD_SIZE
      && board[boardIndex(nextRow, nextColumn)] === null;
  });

export const validPlacements = (board: readonly LineCell[], block: LineBlock): Point[] => {
  const placements: Point[] = [];
  for (let row = 0; row < LINE_BOARD_SIZE; row += 1) {
    for (let column = 0; column < LINE_BOARD_SIZE; column += 1) {
      if (canPlaceBlock(board, block, row, column)) placements.push({ x: column, y: row });
    }
  }
  return placements;
};

export const rotateBlock = (block: LineBlock): LineBlock => ({
  ...block,
  rotation: (block.rotation + 90) % 360,
  cells: rotateCells(block.cells)
});

export interface PlacementResult { board: LineCell[]; clearedLines: number; gainedScore: number }

export const placeLineBlock = (board: readonly LineCell[], block: LineBlock, row: number, column: number): PlacementResult | null => {
  if (!canPlaceBlock(board, block, row, column)) return null;
  const placed = [...board];
  for (const cell of block.cells) placed[boardIndex(row + cell.y, column + cell.x)] = block.color;
  const fullRows = Array.from({ length: LINE_BOARD_SIZE }, (_, value) => value)
    .filter((nextRow) => Array.from({ length: LINE_BOARD_SIZE }, (_, nextColumn) => placed[boardIndex(nextRow, nextColumn)]).every(Boolean));
  const fullColumns = Array.from({ length: LINE_BOARD_SIZE }, (_, value) => value)
    .filter((nextColumn) => Array.from({ length: LINE_BOARD_SIZE }, (_, nextRow) => placed[boardIndex(nextRow, nextColumn)]).every(Boolean));
  const next = placed.map((cell, index) => {
    const nextRow = Math.floor(index / LINE_BOARD_SIZE);
    const nextColumn = index % LINE_BOARD_SIZE;
    return fullRows.includes(nextRow) || fullColumns.includes(nextColumn) ? null : cell;
  });
  const clearedLines = fullRows.length + fullColumns.length;
  return { board: next, clearedLines, gainedScore: block.cells.length + 10 * clearedLines ** 2 };
};

const rotations = (block: LineBlock): LineBlock[] => {
  const result = [block];
  for (let index = 0; index < 3; index += 1) result.push(rotateBlock(result.at(-1)!));
  return result;
};

export const anyTrayBlockFits = (board: readonly LineCell[], tray: readonly LineBlock[]): boolean =>
  tray.some((block) => rotations(block).some((candidate) => validPlacements(board, candidate).length > 0));

const BASE_SHAPE_WEIGHTS = [0.35, 1.15, 1.1, 1.2, 1.05, 0.95, 0.9, 0.85, 0.55, 0.5] as const;

export const lineShapeWeight = (shapeIndex: number, board: readonly LineCell[]): number => {
  const density = board.filter(Boolean).length / board.length;
  const size = LINE_SHAPES[shapeIndex].cells.length;
  const phaseFactor = density < 0.32
    ? size === 1 ? 0.35 : size >= 4 ? 1.3 : 1
    : density > 0.64
      ? size <= 2 ? 2.1 : size >= 5 ? 0.35 : size === 4 ? 0.7 : 1.1
      : size === 1 ? 0.8 : 1;
  return BASE_SHAPE_WEIGHTS[shapeIndex] * phaseFactor;
};

const weightedPick = (indexes: readonly number[], board: readonly LineCell[], random: () => number): number => {
  const total = indexes.reduce((sum, index) => sum + lineShapeWeight(index, board), 0);
  let cursor = random() * total;
  for (const index of indexes) {
    cursor -= lineShapeWeight(index, board);
    if (cursor <= 0) return index;
  }
  return indexes.at(-1)!;
};

export const createTray = (
  random: () => number = Math.random,
  board: readonly LineCell[] = emptyLineBoard(),
  prefix = Date.now().toString(36)
): LineBlock[] => {
  const available = LINE_SHAPES.map((_, index) => index);
  const selected: number[] = [];
  while (selected.length < 3) {
    const shapeIndex = weightedPick(available, board, random);
    selected.push(shapeIndex);
    available.splice(available.indexOf(shapeIndex), 1);
  }
  const blocks = selected.map((shapeIndex, index) => createLineBlock(shapeIndex, `${prefix}-${index}-${shapeIndex}`, index + shapeIndex));
  if (board.some((cell) => cell === null) && !anyTrayBlockFits(board, blocks)) {
    const fitting = LINE_SHAPES.map((_, index) => index).filter((shapeIndex) => {
      const candidate = createLineBlock(shapeIndex, 'fit-check');
      return rotations(candidate).some((rotation) => validPlacements(board, rotation).length > 0);
    });
    if (fitting.length > 0) {
      const shapeIndex = weightedPick(fitting, board, random);
      blocks[2] = createLineBlock(shapeIndex, `${prefix}-2-${shapeIndex}`, shapeIndex + 2);
    }
  }
  return blocks;
};

export const createLineClearProgress = (random: () => number = Math.random): LineClearProgress => ({
  schemaVersion: 1,
  id: `line-${Date.now()}-${Math.floor(random() * 1_000_000)}`,
  board: emptyLineBoard(),
  tray: createTray(random, emptyLineBoard()),
  score: 0,
  clearedLines: 0,
  bestSingleClear: 0,
  phase: 'playing',
  updatedAt: new Date().toISOString()
});
