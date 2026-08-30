import { LINE_BOARD_SIZE, anyTrayBlockFits } from './lineClear';
import { TANGRAM_PIECES, TANGRAM_PUZZLES } from './tangramData';
import type { LineClearProgress, ShapeBlockGameMode, ShapeBlockRecords, TangramProgress } from './types';

export const SHAPE_BLOCK_RECORDS_KEY = 'numbercal.shape-block.records.v1';
export const TANGRAM_PROGRESS_KEY = 'numbercal.shape-block.tangram-progress.v1';
export const LINE_PROGRESS_KEY = 'numbercal.shape-block.line-clear-progress.v1';

export const DEFAULT_SHAPE_BLOCK_RECORDS: ShapeBlockRecords = {
  schemaVersion: 1,
  lastMode: 'tangram',
  tutorialCompleted: false,
  tangramStars: {},
  lineHighScore: 0,
  lineGames: 0,
  totalLines: 0,
  bestSingleClear: 0,
  recentLineCompletionIds: [],
  dailyBadges: []
};

const count = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0;
const mode = (value: unknown): value is ShapeBlockGameMode => value === 'tangram' || value === 'line-clear';

export const normalizeShapeBlockRecords = (value: unknown): ShapeBlockRecords => {
  if (!value || typeof value !== 'object') return DEFAULT_SHAPE_BLOCK_RECORDS;
  const record = value as Partial<ShapeBlockRecords>;
  if (record.schemaVersion !== 1 || !mode(record.lastMode) || !count(record.lineHighScore)
    || !count(record.lineGames) || !count(record.totalLines) || !count(record.bestSingleClear)) return DEFAULT_SHAPE_BLOCK_RECORDS;
  const stars: Record<string, number> = {};
  if (record.tangramStars && typeof record.tangramStars === 'object') {
    for (const [id, value] of Object.entries(record.tangramStars)) {
      if (TANGRAM_PUZZLES.some((puzzle) => puzzle.id === id) && count(value) && value <= 3) stars[id] = value;
    }
  }
  return {
    ...DEFAULT_SHAPE_BLOCK_RECORDS,
    ...record,
    tutorialCompleted: record.tutorialCompleted === true,
    tangramStars: stars,
    recentLineCompletionIds: Array.isArray(record.recentLineCompletionIds)
      ? record.recentLineCompletionIds.filter((id): id is string => typeof id === 'string').slice(-20)
      : [],
    dailyBadges: Array.isArray(record.dailyBadges)
      ? [...new Set(record.dailyBadges.filter((date): date is string => typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)))].slice(-366)
      : []
  };
};

export const loadShapeBlockRecords = (): ShapeBlockRecords => {
  try { return normalizeShapeBlockRecords(JSON.parse(localStorage.getItem(SHAPE_BLOCK_RECORDS_KEY) ?? 'null')); }
  catch { return DEFAULT_SHAPE_BLOCK_RECORDS; }
};

export const saveShapeBlockRecords = (records: ShapeBlockRecords): boolean => {
  try { localStorage.setItem(SHAPE_BLOCK_RECORDS_KEY, JSON.stringify(records)); return true; }
  catch { return false; }
};

export const updateShapeBlockRecords = (
  records: ShapeBlockRecords,
  patch: Partial<Omit<ShapeBlockRecords, 'schemaVersion'>>
): { records: ShapeBlockRecords; saved: boolean } => {
  const next = { ...records, ...patch, schemaVersion: 1 as const };
  return { records: next, saved: saveShapeBlockRecords(next) };
};

export const saveTangramCompletion = (records: ShapeBlockRecords, puzzleId: string, stars: number, dailyDateKey?: string) =>
  updateShapeBlockRecords(records, {
    tangramStars: { ...records.tangramStars, [puzzleId]: Math.max(stars, records.tangramStars[puzzleId] ?? 0) },
    dailyBadges: dailyDateKey && !records.dailyBadges.includes(dailyDateKey)
      ? [...records.dailyBadges, dailyDateKey].slice(-366)
      : records.dailyBadges
  });

const validDate = (value: unknown) => typeof value === 'string' && !Number.isNaN(Date.parse(value));

export const loadTangramProgress = (): TangramProgress | null => {
  try {
    const value = JSON.parse(localStorage.getItem(TANGRAM_PROGRESS_KEY) ?? 'null') as Partial<TangramProgress> | null;
    if (!value || value.schemaVersion !== 1 || !TANGRAM_PUZZLES.some((puzzle) => puzzle.id === value.puzzleId)
      || !Array.isArray(value.pieces) || value.pieces.length !== 7 || !count(value.hintLevel) || value.hintLevel > 4 || !validDate(value.updatedAt)
      || (value.dailyDateKey !== undefined && (typeof value.dailyDateKey !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value.dailyDateKey)))) return null;
    const pieceIds = new Set(value.pieces.map((piece) => piece?.pieceId));
    if (TANGRAM_PIECES.some((piece) => !pieceIds.has(piece.id))) return null;
    const puzzle = TANGRAM_PUZZLES.find((item) => item.id === value.puzzleId)!;
    if (value.pieces.some((piece) => !piece || typeof piece.x !== 'number' || !Number.isFinite(piece.x)
      || typeof piece.y !== 'number' || !Number.isFinite(piece.y) || typeof piece.rotation !== 'number'
      || piece.rotation % 45 !== 0 || typeof piece.flipped !== 'boolean'
      || (piece.targetId !== undefined && !puzzle.targets.some((target) => target.id === piece.targetId)))) return null;
    const occupied = value.pieces.map((piece) => piece.targetId).filter(Boolean);
    if (new Set(occupied).size !== occupied.length) return null;
    return value as TangramProgress;
  } catch { return null; }
};

export const saveTangramProgress = (progress: TangramProgress): boolean => {
  try { localStorage.setItem(TANGRAM_PROGRESS_KEY, JSON.stringify(progress)); return true; }
  catch { return false; }
};
export const clearTangramProgress = (): boolean => { try { localStorage.removeItem(TANGRAM_PROGRESS_KEY); return true; } catch { return false; } };

export const loadLineProgress = (): LineClearProgress | null => {
  try {
    const value = JSON.parse(localStorage.getItem(LINE_PROGRESS_KEY) ?? 'null') as Partial<LineClearProgress> | null;
    if (!value || value.schemaVersion !== 1 || typeof value.id !== 'string' || !Array.isArray(value.board)
      || value.board.length !== LINE_BOARD_SIZE ** 2 || !value.board.every((cell) => cell === null || typeof cell === 'string')
      || !Array.isArray(value.tray) || value.tray.length > 3 || value.tray.some((block) => !block || typeof block.id !== 'string'
        || typeof block.shapeId !== 'string' || !count(block.rotation) || block.rotation % 90 !== 0
        || typeof block.color !== 'string' || !Array.isArray(block.cells) || block.cells.length < 1 || block.cells.length > 5
        || block.cells.some((cell) => !cell || !count(cell.x) || !count(cell.y) || cell.x > 4 || cell.y > 4))
      || !count(value.score) || !count(value.clearedLines) || !count(value.bestSingleClear)
      || !['playing', 'finished'].includes(value.phase ?? '') || !validDate(value.updatedAt)) return null;
    if (value.phase === 'playing' && value.tray.length > 0 && !anyTrayBlockFits(value.board, value.tray)) return { ...(value as LineClearProgress), phase: 'finished' };
    return value as LineClearProgress;
  } catch { return null; }
};

export const saveLineProgress = (progress: LineClearProgress): boolean => {
  try { localStorage.setItem(LINE_PROGRESS_KEY, JSON.stringify(progress)); return true; }
  catch { return false; }
};
export const clearLineProgress = (): boolean => { try { localStorage.removeItem(LINE_PROGRESS_KEY); return true; } catch { return false; } };

export const saveLineCompletion = (records: ShapeBlockRecords, progress: LineClearProgress) => {
  if (records.recentLineCompletionIds.includes(progress.id)) return { records, saved: true };
  return updateShapeBlockRecords(records, {
    lastMode: 'line-clear',
    lineHighScore: Math.max(records.lineHighScore, progress.score),
    lineGames: records.lineGames + 1,
    totalLines: records.totalLines + progress.clearedLines,
    bestSingleClear: Math.max(records.bestSingleClear, progress.bestSingleClear),
    recentLineCompletionIds: [...records.recentLineCompletionIds, progress.id].slice(-20)
  });
};
