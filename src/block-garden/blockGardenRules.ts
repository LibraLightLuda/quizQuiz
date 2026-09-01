import type { RandomSource } from '../services/randomService';
import {
  BOARD_SIZE, type GardenCell, type GardenGame, type GardenInventory, type GardenItem, type GardenMode,
  type GardenPiece, type GardenShape, type GardenTone, type PlacementResult, type Point
} from './types';

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
export const EMPTY_GARDEN_INVENTORY: GardenInventory = { bomb: 0, rotate: 0, reroll: 0 };
export const TIMED_GARDEN_SECONDS = 90;
export const STONE_LINE_INTERVAL = 2;
const ITEM_SPAWN_CHANCE = 0.45;

export const emptyGardenBoard = (): GardenCell[] => Array.from({ length: BOARD_SIZE * BOARD_SIZE }, () => null);

export const shapeById = (shapeId: string): GardenShape | undefined => GARDEN_SHAPES.find((item) => item.id === shapeId);

const normalizedCells = (cells: readonly Point[]): Point[] => {
  const minRow = Math.min(...cells.map((cell) => cell.row));
  const minColumn = Math.min(...cells.map((cell) => cell.column));
  return cells.map((cell) => ({ row: cell.row - minRow, column: cell.column - minColumn }))
    .sort((left, right) => left.row - right.row || left.column - right.column);
};

const rotateCells = (cells: readonly Point[], turns: number): Point[] => {
  let rotated = normalizedCells(cells);
  for (let turn = 0; turn < turns; turn += 1) {
    rotated = normalizedCells(rotated.map((cell) => ({ row: cell.column, column: -cell.row })));
  }
  return rotated;
};

export const shapeForPiece = (piece: GardenPiece): GardenShape | undefined => {
  const base = shapeById(piece.shapeId);
  if (!base) return undefined;
  const rotation = piece.rotation ?? 0;
  if (!rotation) return base;
  return {
    ...base,
    id: `${base.id}-rotation-${rotation}`,
    label: `${base.label} · 회전`,
    cells: rotateCells(base.cells, rotation)
  };
};

export const pieceCanRotate = (piece: GardenPiece): boolean => {
  const current = shapeForPiece(piece);
  const next = shapeForPiece({ ...piece, rotation: (((piece.rotation ?? 0) + 1) % 4) as GardenPiece['rotation'] });
  return Boolean(current && next && JSON.stringify(current.cells) !== JSON.stringify(next.cells));
};

export const boardIndex = (row: number, column: number): number => row * BOARD_SIZE + column;

/** The board cell under the player's finger is the shape's visual center. */
export const shapeCenterOffset = (gardenShape: GardenShape): Point => {
  const minRow = Math.min(...gardenShape.cells.map((cell) => cell.row));
  const maxRow = Math.max(...gardenShape.cells.map((cell) => cell.row));
  const minColumn = Math.min(...gardenShape.cells.map((cell) => cell.column));
  const maxColumn = Math.max(...gardenShape.cells.map((cell) => cell.column));
  return {
    row: Math.round((minRow + maxRow) / 2),
    column: Math.round((minColumn + maxColumn) / 2)
  };
};

export const shapeCellsAt = (gardenShape: GardenShape, centerRow: number, centerColumn: number): Point[] => {
  const center = shapeCenterOffset(gardenShape);
  return gardenShape.cells.map((cell) => ({
    row: centerRow - center.row + cell.row,
    column: centerColumn - center.column + cell.column
  }));
};

export const canPlaceShape = (board: readonly GardenCell[], gardenShape: GardenShape, row: number, column: number): boolean =>
  shapeCellsAt(gardenShape, row, column).every((target) => {
    const targetRow = target.row;
    const targetColumn = target.column;
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
  const gardenShape = shapeForPiece(piece);
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

export const createGardenPreview = (board: readonly GardenCell[], random: RandomSource): GardenPiece => {
  const fitting = GARDEN_SHAPES.filter((candidate) => validPlacements(board, candidate).length > 0);
  const candidate = chooseWeightedShape(random, board, fitting.length ? fitting : GARDEN_SHAPES);
  return createPiece(candidate, GARDEN_TONES[Math.floor(random.next() * GARDEN_TONES.length)]);
};

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

/** Keeps the promised preview while making the rest of the refill varied and playable. */
export const createGardenRefillTray = (
  board: readonly GardenCell[],
  random: RandomSource,
  upcoming: GardenPiece,
  previousShapeIds: readonly string[] = []
): GardenPiece[] => {
  const selected: GardenShape[] = [];
  const excludedShapeIds = new Set([upcoming.shapeId]);
  const upcomingFits = pieceFits(board, upcoming);

  for (let slot = 0; slot < 2; slot += 1) {
    let candidates = GARDEN_SHAPES.filter((candidate) => !excludedShapeIds.has(candidate.id));
    const unseen = candidates.filter((candidate) => !previousShapeIds.includes(candidate.id));
    if (unseen.length) candidates = unseen;
    if (slot === 0 && !upcomingFits) {
      const fitting = candidates.filter((candidate) => validPlacements(board, candidate).length > 0);
      if (fitting.length) candidates = fitting;
    }
    const chosen = chooseWeightedShape(random, board, candidates.length ? candidates : GARDEN_SHAPES);
    selected.push(chosen);
    excludedShapeIds.add(chosen.id);
  }

  return [upcoming, ...selected.map((candidate, index) => createPiece(
    candidate,
    GARDEN_TONES[Math.min(GARDEN_TONES.length - 1, Math.floor(random.next() * GARDEN_TONES.length + index + 1) % GARDEN_TONES.length)]
  ))];
};

export const createGardenGame = (
  random: RandomSource,
  now = new Date(),
  options: { mode?: GardenMode; dailyDate?: string; dailyTargetLines?: number } = {}
): GardenGame => {
  const board = emptyGardenBoard();
  const mode = options.mode ?? 'classic';
  const tray = createGardenTray(board, random);
  return {
    schemaVersion: 1,
    board,
    tray,
    nextPiece: createGardenPreview(board, random),
    recentShapeIds: tray.map((piece) => piece.shapeId),
    mode,
    dailyDate: options.dailyDate,
    dailyTargetLines: options.dailyTargetLines,
    dailyCompleted: false,
    timedEndsAt: mode === 'timed' ? new Date(now.getTime() + TIMED_GARDEN_SECONDS * 1000).toISOString() : undefined,
    timeLimitSeconds: mode === 'timed' ? TIMED_GARDEN_SECONDS : undefined,
    itemBoard: mode === 'items' ? Array.from({ length: BOARD_SIZE * BOARD_SIZE }, () => null) : undefined,
    inventory: mode === 'items' ? { ...EMPTY_GARDEN_INVENTORY } : undefined,
    lastCollectedItems: [],
    lastStonesAdded: 0,
    score: 0,
    clearedLines: 0,
    combo: 0,
    turns: 0,
    lastCleared: [],
    lastGain: 0,
    maxLinesInMove: 0,
    maxComboInGame: 0,
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

const chooseGardenItem = (random: RandomSource): GardenItem => {
  const value = random.next();
  if (value < 0.28) return 'bomb';
  if (value < 0.52) return 'rotate';
  if (value < 0.80) return 'reroll';
  return 'stone';
};

const completesLineWithStone = (board: readonly GardenCell[], index: number): boolean => {
  const row = Math.floor(index / BOARD_SIZE);
  const column = index % BOARD_SIZE;
  const rowFull = Array.from({ length: BOARD_SIZE }, (_, cellColumn) => cellColumn === column
    || board[boardIndex(row, cellColumn)] !== null).every(Boolean);
  const columnFull = Array.from({ length: BOARD_SIZE }, (_, cellRow) => cellRow === row
    || board[boardIndex(cellRow, column)] !== null).every(Boolean);
  return rowFull || columnFull;
};

const addPermanentStones = (
  board: GardenCell[],
  itemBoard: Array<GardenItem | null> | undefined,
  count: number,
  random: RandomSource
): number => {
  let added = 0;
  for (let stone = 0; stone < count; stone += 1) {
    const empty = board.map((cell, index) => cell === null ? index : -1).filter((index) => index >= 0);
    if (!empty.length) break;
    const safer = empty.filter((index) => !completesLineWithStone(board, index));
    if (!safer.length) break;
    const candidates = safer;
    const selected = candidates[Math.min(candidates.length - 1, Math.floor(random.next() * candidates.length))];
    board[selected] = 'stone';
    if (itemBoard) itemBoard[selected] = null;
    added += 1;
  }
  return added;
};

const inventoryCanHelp = (game: GardenGame): boolean => {
  if (game.mode !== 'items' || !game.inventory) return false;
  const pieces = game.tray.filter((piece): piece is GardenPiece => piece !== null);
  return (game.inventory.bomb > 0 && game.board.some((cell) => cell !== null && cell !== 'stone'))
    || (game.inventory.rotate > 0 && pieces.some(pieceCanRotate))
    || (game.inventory.reroll > 0 && pieces.length > 0);
};

export const gardenGameCanContinue = (game: GardenGame): boolean =>
  anyTrayPieceFits(game.board, game.tray) || inventoryCanHelp(game);

export const placementScore = (pieceCells: number, clearedLines: number, combo: number): number =>
  pieceCells + (clearedLines
    ? 40 * clearedLines * clearedLines
      + Math.max(0, clearedLines - 1) * 30
      + Math.max(0, combo - 1) * 30
    : 0);

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
  const gardenShape = piece ? shapeForPiece(piece) : undefined;
  if (!piece || !gardenShape || !canPlaceShape(game.board, gardenShape, row, column)) {
    return { game, placed: false, clearedNow: 0 };
  }

  const placedBoard = [...game.board];
  const placedIndices = shapeCellsAt(gardenShape, row, column).map((cell) => boardIndex(cell.row, cell.column));
  placedIndices.forEach((index) => {
    placedBoard[index] = piece.tone;
  });
  let itemBoard = game.itemBoard ? [...game.itemBoard] : game.mode === 'items'
    ? Array.from<GardenItem | null>({ length: BOARD_SIZE * BOARD_SIZE }).fill(null)
    : undefined;
  if (game.mode === 'items' && itemBoard && random.next() < ITEM_SPAWN_CHANCE) {
    const itemIndex = placedIndices[Math.min(placedIndices.length - 1, Math.floor(random.next() * placedIndices.length))];
    itemBoard[itemIndex] = chooseGardenItem(random);
  }
  const completed = completedLines(placedBoard);
  const clearedNow = completed.rows.length + completed.columns.length;
  const board = [...placedBoard];
  const collectedItems = itemBoard
    ? completed.cells.map((index) => itemBoard?.[index]).filter((item): item is GardenItem => item !== null && item !== undefined)
    : [];
  const inventory = { ...(game.inventory ?? EMPTY_GARDEN_INVENTORY) };
  collectedItems.forEach((item) => {
    if (item !== 'stone') inventory[item] += 1;
  });
  completed.cells.forEach((index) => {
    if (board[index] !== 'stone') board[index] = null;
    if (itemBoard) itemBoard[index] = null;
  });
  const combo = clearedNow ? game.combo + 1 : 0;
  const lastGain = placementScore(gardenShape.cells.length, clearedNow, combo);
  const nextClearedLines = game.clearedLines + clearedNow;
  const stoneModePenalty = game.mode === 'stone'
    ? Math.floor(nextClearedLines / STONE_LINE_INTERVAL) - Math.floor(game.clearedLines / STONE_LINE_INTERVAL)
    : 0;
  const stonesAdded = addPermanentStones(
    board,
    itemBoard,
    stoneModePenalty + collectedItems.filter((item) => item === 'stone').length,
    random
  );
  let tray = game.tray.map((item, index) => index === trayIndex ? null : item);
  let nextPiece = game.nextPiece;
  let refilled = false;
  if (tray.every((item) => item === null)) {
    const upcoming = nextPiece ?? createGardenPreview(board, random);
    tray = createGardenRefillTray(board, random, upcoming, game.recentShapeIds);
    nextPiece = createGardenPreview(board, random);
    refilled = true;
  }
  const nextGame: GardenGame = {
    ...game,
    board,
    tray,
    nextPiece,
    recentShapeIds: refilled
      ? tray.filter((piece): piece is GardenPiece => piece !== null).map((piece) => piece.shapeId)
      : game.recentShapeIds,
    itemBoard,
    inventory: game.mode === 'items' ? inventory : undefined,
    lastCollectedItems: collectedItems,
    lastStonesAdded: stonesAdded,
    score: game.score + lastGain,
    clearedLines: nextClearedLines,
    combo,
    turns: game.turns + 1,
    lastCleared: completed.cells.filter((index) => placedBoard[index] !== 'stone'),
    lastGain,
    maxLinesInMove: Math.max(game.maxLinesInMove ?? 0, clearedNow),
    maxComboInGame: Math.max(game.maxComboInGame ?? 0, combo),
    status: 'playing',
    updatedAt: now.toISOString()
  };
  nextGame.status = gardenGameCanContinue(nextGame) ? 'playing' : 'game-over';

  return {
    placed: true,
    clearedNow,
    collectedItems,
    stonesAdded,
    game: nextGame
  };
};

export const rotateGardenPiece = (game: GardenGame, trayIndex: number, now = new Date()): GardenGame | null => {
  const piece = game.tray[trayIndex];
  if (game.status !== 'playing' || !piece || !game.inventory?.rotate || !pieceCanRotate(piece)) return null;
  const tray = game.tray.map((item, index) => index === trayIndex
    ? { ...piece, rotation: (((piece.rotation ?? 0) + 1) % 4) as GardenPiece['rotation'] }
    : item);
  const next: GardenGame = {
    ...game,
    tray,
    inventory: { ...game.inventory, rotate: game.inventory.rotate - 1 },
    lastCollectedItems: [],
    lastStonesAdded: 0,
    updatedAt: now.toISOString()
  };
  next.status = gardenGameCanContinue(next) ? 'playing' : 'game-over';
  return next;
};

export const rerollGardenPiece = (
  game: GardenGame,
  trayIndex: number,
  random: RandomSource,
  now = new Date()
): GardenGame | null => {
  const piece = game.tray[trayIndex];
  if (game.status !== 'playing' || !piece || !game.inventory?.reroll) return null;
  let replacement = createGardenPreview(game.board, random);
  for (let attempt = 0; attempt < 4 && replacement.shapeId === piece.shapeId; attempt += 1) {
    replacement = createGardenPreview(game.board, random);
  }
  const tray = game.tray.map((item, index) => index === trayIndex ? replacement : item);
  const next: GardenGame = {
    ...game,
    tray,
    inventory: { ...game.inventory, reroll: game.inventory.reroll - 1 },
    lastCollectedItems: [],
    lastStonesAdded: 0,
    status: 'playing',
    updatedAt: now.toISOString()
  };
  return next;
};

export const useGardenBomb = (game: GardenGame, row: number, column: number, now = new Date()): GardenGame | null => {
  if (game.status !== 'playing' || !game.inventory?.bomb) return null;
  const startRow = Math.min(BOARD_SIZE - 2, Math.max(0, row));
  const startColumn = Math.min(BOARD_SIZE - 2, Math.max(0, column));
  const targets = [
    boardIndex(startRow, startColumn), boardIndex(startRow, startColumn + 1),
    boardIndex(startRow + 1, startColumn), boardIndex(startRow + 1, startColumn + 1)
  ].filter((index) => game.board[index] !== null && game.board[index] !== 'stone');
  if (!targets.length) return null;
  const board = [...game.board];
  const itemBoard = game.itemBoard ? [...game.itemBoard] : undefined;
  targets.forEach((index) => {
    board[index] = null;
    if (itemBoard) itemBoard[index] = null;
  });
  const next: GardenGame = {
    ...game,
    board,
    itemBoard,
    inventory: { ...game.inventory, bomb: game.inventory.bomb - 1 },
    combo: 0,
    lastCleared: targets,
    lastGain: 0,
    lastCollectedItems: [],
    lastStonesAdded: 0,
    status: 'playing',
    updatedAt: now.toISOString()
  };
  next.status = gardenGameCanContinue(next) ? 'playing' : 'game-over';
  return next;
};

export const occupiedPercent = (board: readonly GardenCell[]): number =>
  Math.round(board.filter(Boolean).length / board.length * 100);
