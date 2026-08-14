import type { SudokuDefinition, SudokuDifficulty, SudokuPuzzle } from './types';

export const SUDOKU_DIFFICULTIES: SudokuDifficulty[] = ['beginner', 'growing', 'classic', 'master'];

export const sudokuDefinitions: Record<SudokuDifficulty, SudokuDefinition> = {
  beginner: {
    difficulty: 'beginner', label: '첫걸음', shortLabel: '4×4', age: '처음 시작해요',
    description: '작은 칸에서 규칙부터 배워요', size: 4, boxRows: 2, boxCols: 2, targetBlanks: 6, color: '#f28a62'
  },
  growing: {
    difficulty: 'growing', label: '쑥쑥', shortLabel: '6×6', age: '조금 익숙해요',
    description: '숫자 패턴을 차근차근 찾아요', size: 6, boxRows: 2, boxCols: 3, targetBlanks: 16, color: '#32a47b'
  },
  classic: {
    difficulty: 'classic', label: '척척', shortLabel: '9×9', age: '진짜 스도쿠',
    description: '전통 규칙으로 추리해요', size: 9, boxRows: 3, boxCols: 3, targetBlanks: 42, color: '#6754e8'
  },
  master: {
    difficulty: 'master', label: '달인', shortLabel: '9×9+', age: '도전하고 싶어요',
    description: '더 적은 힌트로 기록에 도전해요', size: 9, boxRows: 3, boxCols: 3, targetBlanks: 50, color: '#bc5d91'
  }
};

type RandomSource = () => number;

const hashSeed = (value: string): number => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const seededRandom = (seed: string): RandomSource => {
  let value = hashSeed(seed) || 1;
  return () => {
    value += 0x6D2B79F5;
    let mixed = value;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
};

const randomSeed = (): string => {
  try {
    const values = new Uint32Array(2);
    globalThis.crypto.getRandomValues(values);
    return `${values[0].toString(36)}${values[1].toString(36)}`;
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }
};

const range = (length: number): number[] => Array.from({ length }, (_, index) => index);

const shuffled = <T,>(values: readonly T[], random: RandomSource): T[] => {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
};

const createSolution = (definition: SudokuDefinition, random: RandomSource): number[] => {
  const { size, boxRows, boxCols } = definition;
  const bands = shuffled(range(size / boxRows), random);
  const stacks = shuffled(range(size / boxCols), random);
  const rows = bands.flatMap((band) => shuffled(range(boxRows), random).map((row) => band * boxRows + row));
  const columns = stacks.flatMap((stack) => shuffled(range(boxCols), random).map((column) => stack * boxCols + column));
  const numbers = shuffled(range(size).map((value) => value + 1), random);
  const pattern = (row: number, column: number): number =>
    (boxCols * (row % boxRows) + Math.floor(row / boxRows) + column) % size;
  return rows.flatMap((row) => columns.map((column) => numbers[pattern(row, column)]));
};

const bitCount = (value: number): number => {
  let count = 0;
  let remaining = value;
  while (remaining) {
    remaining &= remaining - 1;
    count += 1;
  }
  return count;
};

export const countSolutions = (
  values: readonly number[], size: number, boxRows: number, boxCols: number, limit = 2
): number => {
  if (values.length !== size * size || limit < 1) return 0;
  const board = [...values];
  const rowMasks = Array<number>(size).fill(0);
  const columnMasks = Array<number>(size).fill(0);
  const boxMasks = Array<number>(size).fill(0);
  const boxIndex = (row: number, column: number): number =>
    Math.floor(row / boxRows) * (size / boxCols) + Math.floor(column / boxCols);

  for (let index = 0; index < board.length; index += 1) {
    const value = board[index];
    if (value === 0) continue;
    if (!Number.isInteger(value) || value < 1 || value > size) return 0;
    const row = Math.floor(index / size);
    const column = index % size;
    const box = boxIndex(row, column);
    const bit = 1 << value;
    if ((rowMasks[row] & bit) || (columnMasks[column] & bit) || (boxMasks[box] & bit)) return 0;
    rowMasks[row] |= bit;
    columnMasks[column] |= bit;
    boxMasks[box] |= bit;
  }

  const fullMask = (1 << (size + 1)) - 2;
  let solutions = 0;
  const solve = () => {
    if (solutions >= limit) return;
    let chosenIndex = -1;
    let chosenMask = 0;
    let fewest = size + 1;
    for (let index = 0; index < board.length; index += 1) {
      if (board[index] !== 0) continue;
      const row = Math.floor(index / size);
      const column = index % size;
      const box = boxIndex(row, column);
      const available = fullMask & ~(rowMasks[row] | columnMasks[column] | boxMasks[box]);
      const count = bitCount(available);
      if (count === 0) return;
      if (count < fewest) {
        chosenIndex = index;
        chosenMask = available;
        fewest = count;
        if (count === 1) break;
      }
    }
    if (chosenIndex === -1) {
      solutions += 1;
      return;
    }
    const row = Math.floor(chosenIndex / size);
    const column = chosenIndex % size;
    const box = boxIndex(row, column);
    for (let number = 1; number <= size && solutions < limit; number += 1) {
      const bit = 1 << number;
      if (!(chosenMask & bit)) continue;
      board[chosenIndex] = number;
      rowMasks[row] |= bit;
      columnMasks[column] |= bit;
      boxMasks[box] |= bit;
      solve();
      board[chosenIndex] = 0;
      rowMasks[row] &= ~bit;
      columnMasks[column] &= ~bit;
      boxMasks[box] &= ~bit;
    }
  };
  solve();
  return solutions;
};

export const isValidSolution = (
  values: readonly number[], size: number, boxRows: number, boxCols: number
): boolean => countSolutions(values, size, boxRows, boxCols, 1) === 1 && values.every((value) => value > 0);

export const generateSudoku = (difficulty: SudokuDifficulty, suppliedSeed?: string): SudokuPuzzle => {
  const definition = sudokuDefinitions[difficulty];
  const seed = suppliedSeed ?? randomSeed();
  let bestPuzzle: number[] | null = null;
  let bestSolution: number[] | null = null;
  let bestRemoved = -1;

  for (let attempt = 0; attempt < 2 && bestRemoved < definition.targetBlanks; attempt += 1) {
    const random = seededRandom(`${seed}:${attempt}`);
    const solution = createSolution(definition, random);
    const puzzle = [...solution];
    let removed = 0;
    for (const index of shuffled(range(puzzle.length), random)) {
      if (removed >= definition.targetBlanks) break;
      const previous = puzzle[index];
      puzzle[index] = 0;
      if (countSolutions(puzzle, definition.size, definition.boxRows, definition.boxCols, 2) === 1) {
        removed += 1;
      } else {
        puzzle[index] = previous;
      }
    }
    if (removed > bestRemoved) {
      bestPuzzle = puzzle;
      bestSolution = solution;
      bestRemoved = removed;
    }
  }

  if (!bestPuzzle || !bestSolution) throw new Error('스도쿠 퍼즐을 만들지 못했습니다.');
  return {
    id: `${difficulty}-${seed}`,
    difficulty,
    size: definition.size,
    boxRows: definition.boxRows,
    boxCols: definition.boxCols,
    puzzle: bestPuzzle,
    solution: bestSolution
  };
};

export const sudokuDailyKey = (date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const generateDailySudoku = (difficulty: SudokuDifficulty, date = new Date()): SudokuPuzzle =>
  generateSudoku(difficulty, `daily-${sudokuDailyKey(date)}-${difficulty}`);
