import { BOARD_SIZE, type GardenCell, type GardenGame, type GardenPiece, type GardenRecords, type GardenTone } from './types';
import { GARDEN_TONES, shapeById } from './blockGardenRules';

export const GARDEN_RECORDS_KEY = 'numbercal.block-garden.records.v1';
export const GARDEN_PROGRESS_KEY = 'numbercal.block-garden.progress.v1';

export const EMPTY_GARDEN_RECORDS: GardenRecords = {
  schemaVersion: 1,
  highScore: 0,
  bestLines: 0,
  gamesPlayed: 0,
  bestCombo: 0,
  maxLinesInMove: 0,
  dailyCompletedDates: [],
  weeklyLines: 0,
  weeklyMultiClears: 0
};

const isNonNegativeInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0;

const isTone = (value: unknown): value is GardenTone => GARDEN_TONES.includes(value as GardenTone);

const isCell = (value: unknown): value is GardenCell => value === null || isTone(value);

const isPiece = (value: unknown): value is GardenPiece => {
  if (!value || typeof value !== 'object') return false;
  const piece = value as Partial<GardenPiece>;
  return typeof piece.uid === 'string' && piece.uid.length > 0
    && typeof piece.shapeId === 'string' && Boolean(shapeById(piece.shapeId))
    && isTone(piece.tone);
};

const isRecords = (value: unknown): value is GardenRecords => {
  if (!value || typeof value !== 'object') return false;
  const records = value as Partial<GardenRecords>;
  return records.schemaVersion === 1
    && isNonNegativeInteger(records.highScore)
    && isNonNegativeInteger(records.bestLines)
    && isNonNegativeInteger(records.gamesPlayed)
    && (records.lastFinishedGameKey === undefined || typeof records.lastFinishedGameKey === 'string')
    && (records.bestCombo === undefined || isNonNegativeInteger(records.bestCombo))
    && (records.maxLinesInMove === undefined || isNonNegativeInteger(records.maxLinesInMove))
    && (records.dailyCompletedDates === undefined || (Array.isArray(records.dailyCompletedDates)
      && records.dailyCompletedDates.every((date) => typeof date === 'string')))
    && (records.weeklyKey === undefined || typeof records.weeklyKey === 'string')
    && (records.weeklyLines === undefined || isNonNegativeInteger(records.weeklyLines))
    && (records.weeklyMultiClears === undefined || isNonNegativeInteger(records.weeklyMultiClears));
};

const isProgress = (value: unknown): value is GardenGame => {
  if (!value || typeof value !== 'object') return false;
  const game = value as Partial<GardenGame>;
  return game.schemaVersion === 1
    && Array.isArray(game.board) && game.board.length === BOARD_SIZE * BOARD_SIZE && game.board.every(isCell)
    && Array.isArray(game.tray) && game.tray.length === 3 && game.tray.every((piece) => piece === null || isPiece(piece))
    && (game.nextPiece === undefined || game.nextPiece === null || isPiece(game.nextPiece))
    && (game.mode === undefined || game.mode === 'classic' || game.mode === 'daily')
    && (game.dailyDate === undefined || typeof game.dailyDate === 'string')
    && (game.dailyTargetLines === undefined || isNonNegativeInteger(game.dailyTargetLines))
    && (game.dailyCompleted === undefined || typeof game.dailyCompleted === 'boolean')
    && (game.randomState === undefined || isNonNegativeInteger(game.randomState))
    && isNonNegativeInteger(game.score) && isNonNegativeInteger(game.clearedLines)
    && isNonNegativeInteger(game.combo) && isNonNegativeInteger(game.turns)
    && Array.isArray(game.lastCleared) && game.lastCleared.every((index) => isNonNegativeInteger(index) && index < BOARD_SIZE * BOARD_SIZE)
    && isNonNegativeInteger(game.lastGain)
    && (game.maxLinesInMove === undefined || isNonNegativeInteger(game.maxLinesInMove))
    && (game.maxComboInGame === undefined || isNonNegativeInteger(game.maxComboInGame))
    && (game.status === 'playing' || game.status === 'game-over')
    && typeof game.updatedAt === 'string' && !Number.isNaN(Date.parse(game.updatedAt));
};

export const loadGardenRecords = (): GardenRecords => {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(GARDEN_RECORDS_KEY) ?? 'null');
    return isRecords(value) ? value : EMPTY_GARDEN_RECORDS;
  } catch {
    return EMPTY_GARDEN_RECORDS;
  }
};

export const saveGardenRecords = (records: GardenRecords): boolean => {
  try {
    localStorage.setItem(GARDEN_RECORDS_KEY, JSON.stringify(records));
    return true;
  } catch {
    return false;
  }
};

export const loadGardenProgress = (): GardenGame | null => {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(GARDEN_PROGRESS_KEY) ?? 'null');
    return isProgress(value) ? value : null;
  } catch {
    return null;
  }
};

export const saveGardenProgress = (game: GardenGame): boolean => {
  if (game.status !== 'playing') return clearGardenProgress();
  try {
    localStorage.setItem(GARDEN_PROGRESS_KEY, JSON.stringify(game));
    return true;
  } catch {
    return false;
  }
};

export const clearGardenProgress = (): boolean => {
  try {
    localStorage.removeItem(GARDEN_PROGRESS_KEY);
    return true;
  } catch {
    return false;
  }
};

const weekKey = (isoDate: string): string => {
  const date = new Date(isoDate);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
};

export const recordFinishedGardenGame = (records: GardenRecords, game: GardenGame): GardenRecords => {
  const key = `${game.updatedAt}:${game.turns}:${game.score}:${game.clearedLines}`;
  const duplicate = records.lastFinishedGameKey === key;
  const currentWeek = weekKey(game.updatedAt);
  const sameWeek = records.weeklyKey === currentWeek;
  const dailyDates = [...(records.dailyCompletedDates ?? [])];
  if (game.mode === 'daily' && game.dailyCompleted && game.dailyDate && !dailyDates.includes(game.dailyDate)) {
    dailyDates.push(game.dailyDate);
  }
  return {
    ...records,
    schemaVersion: 1,
    highScore: Math.max(records.highScore, game.score),
    bestLines: Math.max(records.bestLines, game.clearedLines),
    gamesPlayed: duplicate ? records.gamesPlayed : records.gamesPlayed + 1,
    lastFinishedGameKey: key,
    bestCombo: Math.max(records.bestCombo ?? 0, game.maxComboInGame ?? game.combo),
    maxLinesInMove: Math.max(records.maxLinesInMove ?? 0, game.maxLinesInMove ?? (game.lastCleared.length > 0 ? 1 : 0)),
    dailyCompletedDates: dailyDates,
    weeklyKey: currentWeek,
    weeklyLines: (sameWeek ? records.weeklyLines ?? 0 : 0) + (duplicate ? 0 : game.clearedLines),
    weeklyMultiClears: (sameWeek ? records.weeklyMultiClears ?? 0 : 0)
      + (duplicate ? 0 : game.maxLinesInMove && game.maxLinesInMove >= 2 ? 1 : 0)
  };
};
