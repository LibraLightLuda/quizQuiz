import { TANGRAM_PUZZLES } from './tangramData';
import type { TangramPuzzle } from './types';

export const shapeBlockDateKey = (date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const dailyTangramPuzzle = (date = new Date()): TangramPuzzle => {
  const starterPuzzles = TANGRAM_PUZZLES.filter((puzzle) => puzzle.tier === 'starter');
  const digits = Number(shapeBlockDateKey(date).replaceAll('-', ''));
  return starterPuzzles[digits % starterPuzzles.length];
};
