import { createId, randomInt, shuffle, type RandomSource } from '../services/randomService';
import type {
  NumberPathCell,
  NumberPathDifficulty,
  NumberPathProgress,
  NumberPathPuzzle,
  PathValidation
} from './types';

export const NUMBER_PATH_SESSION_LENGTH = 5;
export const NUMBER_PATH_DIFFICULTIES: NumberPathDifficulty[] = ['starter', 'growing', 'clever', 'master'];

export const numberPathDifficultyInfo: Record<NumberPathDifficulty, {
  label: string;
  description: string;
  example: string;
  age: string;
}> = {
  starter: { label: '첫걸음', description: '두 숫자를 이어요', example: '2 + 3', age: '두 수의 합' },
  growing: { label: '쑥쑥', description: '세 숫자를 계획해요', example: '2 + 3 + 4', age: '세 수의 합' },
  clever: { label: '척척', description: '도착점까지 길을 찾아요', example: '★ → ◆', age: '거꾸로 계획' },
  master: { label: '달인', description: '음수와 별칸을 지나가요', example: '+4 − 2', age: '덧셈과 뺄셈' }
};

const configs: Record<NumberPathDifficulty, {
  rows: number;
  columns: number;
  length: number;
  min: number;
  max: number;
  fixedEnd: boolean;
  checkpoints: number;
  blocked: number;
}> = {
  starter: { rows: 3, columns: 3, length: 2, min: 1, max: 5, fixedEnd: false, checkpoints: 0, blocked: 0 },
  growing: { rows: 4, columns: 4, length: 3, min: 1, max: 7, fixedEnd: false, checkpoints: 0, blocked: 0 },
  clever: { rows: 4, columns: 4, length: 4, min: 1, max: 9, fixedEnd: true, checkpoints: 0, blocked: 1 },
  master: { rows: 5, columns: 5, length: 5, min: -4, max: 9, fixedEnd: true, checkpoints: 1, blocked: 2 }
};

export const cellId = (row: number, column: number): string => `r${row}c${column}`;

const cellMap = (puzzle: NumberPathPuzzle): Map<string, NumberPathCell> =>
  new Map(puzzle.cells.map((cell) => [cell.id, cell]));

export const isAdjacent = (first: NumberPathCell, second: NumberPathCell): boolean =>
  Math.abs(first.row - second.row) + Math.abs(first.column - second.column) === 1;

export const pathSum = (puzzle: NumberPathPuzzle, path: readonly string[]): number => {
  const cells = cellMap(puzzle);
  return path.reduce((sum, id) => sum + (cells.get(id)?.value ?? 0), 0);
};

const formatValue = (value: number, first: boolean): string => {
  if (first) return String(value);
  return value < 0 ? `− ${Math.abs(value)}` : `+ ${value}`;
};

export const pathEquation = (puzzle: NumberPathPuzzle, path: readonly string[]): string => {
  const cells = cellMap(puzzle);
  return path.map((id, index) => formatValue(cells.get(id)?.value ?? 0, index === 0)).join(' ');
};

const neighbors = (puzzle: NumberPathPuzzle, id: string): NumberPathCell[] => {
  const cells = cellMap(puzzle);
  const source = cells.get(id);
  if (!source) return [];
  return [
    cells.get(cellId(source.row - 1, source.column)),
    cells.get(cellId(source.row + 1, source.column)),
    cells.get(cellId(source.row, source.column - 1)),
    cells.get(cellId(source.row, source.column + 1))
  ].filter((cell): cell is NumberPathCell => Boolean(cell && !cell.blocked));
};

const checkpointOrderValid = (puzzle: NumberPathPuzzle, path: readonly string[], complete: boolean): boolean => {
  let lastIndex = -1;
  for (const checkpoint of puzzle.checkpointCellIds) {
    const index = path.indexOf(checkpoint);
    if (index === -1) return !complete;
    if (index <= lastIndex) return false;
    lastIndex = index;
  }
  return true;
};

const pathStructureValid = (puzzle: NumberPathPuzzle, path: readonly string[]): boolean => {
  if (path.length === 0) return true;
  if (path[0] !== puzzle.startCellId || path.length > puzzle.requiredLength || new Set(path).size !== path.length) return false;
  const cells = cellMap(puzzle);
  for (let index = 0; index < path.length; index += 1) {
    const current = cells.get(path[index]);
    if (!current || current.blocked) return false;
    if (index > 0 && !isAdjacent(cells.get(path[index - 1])!, current)) return false;
  }
  return checkpointOrderValid(puzzle, path, false);
};

export const enumerateSolutions = (
  puzzle: NumberPathPuzzle,
  limit = 2,
  prefix: readonly string[] = []
): string[][] => {
  if (!pathStructureValid(puzzle, prefix)) return [];
  const start = prefix.length ? [...prefix] : [puzzle.startCellId];
  const results: string[][] = [];
  const visit = (path: string[]) => {
    if (results.length >= limit) return;
    if (path.length === puzzle.requiredLength) {
      if ((!puzzle.endCellId || path.at(-1) === puzzle.endCellId)
        && checkpointOrderValid(puzzle, path, true)
        && pathSum(puzzle, path) === puzzle.targetSum) results.push([...path]);
      return;
    }
    const remaining = puzzle.requiredLength - path.length;
    if (puzzle.endCellId) {
      const cells = cellMap(puzzle);
      const current = cells.get(path.at(-1)!)!;
      const end = cells.get(puzzle.endCellId)!;
      const distance = Math.abs(current.row - end.row) + Math.abs(current.column - end.column);
      if (distance > remaining) return;
    }
    for (const next of neighbors(puzzle, path.at(-1)!)) {
      if (!path.includes(next.id)) visit([...path, next.id]);
      if (results.length >= limit) return;
    }
  };
  visit(start);
  return results;
};

export const solutionIsUnique = (puzzle: NumberPathPuzzle): boolean => enumerateSolutions(puzzle, 2).length === 1;

export const viableNextCellIds = (puzzle: NumberPathPuzzle, path: readonly string[]): string[] => {
  if (!pathStructureValid(puzzle, path) || path.length >= puzzle.requiredLength) return [];
  const base = path.length ? [...path] : [puzzle.startCellId];
  return neighbors(puzzle, base.at(-1)!)
    .filter((cell) => !base.includes(cell.id) && enumerateSolutions(puzzle, 1, [...base, cell.id]).length > 0)
    .map((cell) => cell.id);
};

export const validatePath = (puzzle: NumberPathPuzzle, path: readonly string[]): PathValidation => {
  const currentSum = pathSum(puzzle, path);
  if (!pathStructureValid(puzzle, path)) return { status: 'dead-end' };
  if (path.length < puzzle.requiredLength) {
    if (path.length > 0 && enumerateSolutions(puzzle, 1, path).length === 0) return { status: 'dead-end' };
    return {
      status: 'incomplete',
      remainingCells: puzzle.requiredLength - path.length,
      difference: puzzle.targetSum - currentSum
    };
  }
  if (puzzle.endCellId && path.at(-1) !== puzzle.endCellId) return { status: 'wrong-end' };
  const missing = puzzle.checkpointCellIds.find((id) => !path.includes(id));
  if (missing) return { status: 'missing-checkpoint', checkpointId: missing };
  if (currentSum < puzzle.targetSum) return { status: 'too-low', difference: puzzle.targetSum - currentSum };
  if (currentSum > puzzle.targetSum) return { status: 'too-high', difference: currentSum - puzzle.targetSum };
  return { status: 'solved', equation: `${pathEquation(puzzle, path)} = ${puzzle.targetSum}` };
};

const randomSimplePath = (
  rows: number,
  columns: number,
  length: number,
  random: RandomSource
): string[] | null => {
  const start = cellId(randomInt(random, 0, rows - 1), randomInt(random, 0, columns - 1));
  const visit = (path: string[]): string[] | null => {
    if (path.length === length) return path;
    const match = /^r(\d+)c(\d+)$/.exec(path.at(-1)!);
    const row = Number(match![1]);
    const column = Number(match![2]);
    const choices = shuffle(random, [
      [row - 1, column], [row + 1, column], [row, column - 1], [row, column + 1]
    ]).filter(([nextRow, nextColumn]) => nextRow >= 0 && nextRow < rows && nextColumn >= 0 && nextColumn < columns
      && !path.includes(cellId(nextRow, nextColumn)));
    for (const [nextRow, nextColumn] of choices) {
      const result = visit([...path, cellId(nextRow, nextColumn)]);
      if (result) return result;
    }
    return null;
  };
  return visit([start]);
};

const buildCandidate = (difficulty: NumberPathDifficulty, random: RandomSource, attempt: number): NumberPathPuzzle | null => {
  const config = configs[difficulty];
  const solutionPath = randomSimplePath(config.rows, config.columns, config.length, random);
  if (!solutionPath) return null;
  const solutionSet = new Set(solutionPath);
  const values = new Map<string, number>();
  for (let row = 0; row < config.rows; row += 1) {
    for (let column = 0; column < config.columns; column += 1) {
      values.set(cellId(row, column), randomInt(random, config.min, config.max));
    }
  }
  if (difficulty !== 'master' && solutionPath.map((id) => values.get(id)).every((value) => value === values.get(solutionPath[0]))) {
    values.set(solutionPath.at(-1)!, Math.min(config.max, (values.get(solutionPath.at(-1)!) ?? 1) + 1));
  }
  if (difficulty === 'master' && [...values.values()].every((value) => value >= 0)) {
    values.set(solutionPath[0], -randomInt(random, 1, 4));
  }
  const blockedCandidates: string[] = [];
  for (const id of values.keys()) if (!solutionSet.has(id)) blockedCandidates.push(id);
  const blocked = new Set(shuffle(random, blockedCandidates).slice(0, config.blocked));
  const cells: NumberPathCell[] = [];
  for (let row = 0; row < config.rows; row += 1) {
    for (let column = 0; column < config.columns; column += 1) {
      const id = cellId(row, column);
      cells.push({ id, row, column, value: values.get(id)!, blocked: blocked.has(id) || undefined });
    }
  }
  const puzzle: NumberPathPuzzle = {
    id: `path-${difficulty}-${attempt}-${Math.floor(random.next() * 1_000_000)}`,
    difficulty,
    rows: config.rows,
    columns: config.columns,
    cells,
    startCellId: solutionPath[0],
    endCellId: config.fixedEnd ? solutionPath.at(-1) : undefined,
    checkpointCellIds: config.checkpoints ? [solutionPath[Math.floor(solutionPath.length / 2)]] : [],
    requiredLength: config.length,
    targetSum: solutionPath.reduce((sum, id) => sum + values.get(id)!, 0),
    solutionPath
  };
  const movableNeighbors = neighbors(puzzle, puzzle.startCellId).length;
  return movableNeighbors >= 2 && solutionIsUnique(puzzle) ? puzzle : null;
};

const straightFallbackPaths = (rows: number, columns: number, length: number): string[][] => {
  const paths: string[][] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let start = 0; start <= columns - length; start += 1) {
      const path = Array.from({ length }, (_, offset) => cellId(row, start + offset));
      paths.push(path, [...path].reverse());
    }
  }
  for (let column = 0; column < columns; column += 1) {
    for (let start = 0; start <= rows - length; start += 1) {
      const path = Array.from({ length }, (_, offset) => cellId(start + offset, column));
      paths.push(path, [...path].reverse());
    }
  }
  return paths;
};

const fallbackPuzzle = (
  difficulty: NumberPathDifficulty,
  excludedSignatures: readonly string[]
): NumberPathPuzzle => {
  const config = configs[difficulty];
  const paths = straightFallbackPaths(config.rows, config.columns, config.length);
  for (let variant = 0; variant < paths.length; variant += 1) {
    const solutionPath = paths[variant];
    const solutionSet = new Set(solutionPath);
    const startMatch = /^r(\d+)c(\d+)$/.exec(solutionPath[0])!;
    const startRow = Number(startMatch[1]);
    const startColumn = Number(startMatch[2]);
    const blockedCandidates =
      Array.from({ length: config.rows * config.columns }, (_, index) => cellId(Math.floor(index / config.columns), index % config.columns))
        .filter((id) => {
          if (solutionSet.has(id)) return false;
          const match = /^r(\d+)c(\d+)$/.exec(id)!;
          return Math.abs(Number(match[1]) - startRow) + Math.abs(Number(match[2]) - startColumn) > 1;
        });
    const blockedIds = new Set(config.blocked ? blockedCandidates.slice(-config.blocked) : []);
    const cells: NumberPathCell[] = [];
    for (let row = 0; row < config.rows; row += 1) {
      for (let column = 0; column < config.columns; column += 1) {
        const id = cellId(row, column);
        const pathIndex = solutionPath.indexOf(id);
        const value = pathIndex === -1 ? config.max
          : difficulty === 'master' ? (pathIndex === 0 ? -1 : pathIndex === 1 ? 3 : 1) : 1;
        cells.push({ id, row, column, value, blocked: blockedIds.has(id) || undefined });
      }
    }
    const puzzle: NumberPathPuzzle = {
      id: `path-${difficulty}-fallback-${variant}`,
      difficulty,
      rows: config.rows,
      columns: config.columns,
      cells,
      startCellId: solutionPath[0],
      endCellId: config.fixedEnd ? solutionPath.at(-1) : undefined,
      checkpointCellIds: config.checkpoints ? [solutionPath[Math.floor(solutionPath.length / 2)]] : [],
      requiredLength: config.length,
      targetSum: config.length,
      solutionPath
    };
    if (!excludedSignatures.includes(numberPathPuzzleSignature(puzzle)) && solutionIsUnique(puzzle)) return puzzle;
  }
  throw new Error(`Unable to create a distinct fallback puzzle for ${difficulty}`);
};

export const numberPathPuzzleSignature = (puzzle: NumberPathPuzzle): string =>
  `${puzzle.difficulty}|${puzzle.targetSum}|${puzzle.startCellId}|${puzzle.endCellId ?? ''}|${puzzle.solutionPath.join(',')}|${puzzle.cells.map((cell) => `${cell.value}${cell.blocked ? 'x' : ''}`).join(',')}`;

export const generateNumberPathPuzzle = (
  difficulty: NumberPathDifficulty,
  random: RandomSource,
  excludedSignatures: readonly string[] = []
): NumberPathPuzzle => {
  for (let attempt = 0; attempt < 500; attempt += 1) {
    const candidate = buildCandidate(difficulty, random, attempt);
    if (candidate && !excludedSignatures.includes(numberPathPuzzleSignature(candidate))) return candidate;
  }
  return fallbackPuzzle(difficulty, excludedSignatures);
};

export const createNumberPathProgress = (
  difficulty: NumberPathDifficulty,
  random: RandomSource,
  options: { daily?: boolean; dateKey?: string; recentSignatures?: readonly string[] } = {}
): NumberPathProgress => {
  const puzzles: NumberPathPuzzle[] = [];
  const signatures = [...(options.recentSignatures ?? [])];
  while (puzzles.length < NUMBER_PATH_SESSION_LENGTH) {
    const puzzle = generateNumberPathPuzzle(difficulty, random, signatures);
    const signature = numberPathPuzzleSignature(puzzle);
    puzzles.push(puzzle);
    signatures.push(signature);
  }
  return {
    schemaVersion: 1,
    id: createId('number-path'),
    difficulty,
    puzzles,
    puzzleIndex: 0,
    selectedPath: [],
    completedCount: 0,
    checks: 0,
    backtracks: 0,
    hintsUsed: 0,
    hintLevel: 0,
    phase: 'selecting',
    daily: options.daily === true,
    dateKey: options.dateKey,
    updatedAt: new Date().toISOString()
  };
};
