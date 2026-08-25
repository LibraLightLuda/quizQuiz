import { randomInt, shuffle, type RandomSource } from '../services/randomService';
import type { BalanceDifficulty, BalanceProgress, BalancePuzzle, BalanceSide } from './types';

export const BALANCE_SESSION_LENGTH = 5;
export const BALANCE_DIFFICULTIES: readonly BalanceDifficulty[] = ['starter', 'growing', 'clever', 'master'];

export const balanceDifficultyInfo = {
  starter: { label: '첫걸음', description: '같은 숫자 추 하나를 찾아요', age: '초등 1~2학년', example: '5 = □' },
  growing: { label: '쑥쑥', description: '추 두 개를 더해 균형을 맞춰요', age: '초등 2~4학년', example: '7 = 3 + □ + □' },
  clever: { label: '척척', description: '양쪽 접시에 추를 나누어 놓아요', age: '초등 3~5학년', example: '2 + □ = 5 + □' },
  master: { label: '달인', description: '도형의 값을 알아내 균형을 맞춰요', age: '초등 4~6학년', example: '★ + ★ = 8' }
} as const;

const oppositeSide = (side: BalanceSide): BalanceSide => side === 'left' ? 'right' : 'left';
const assignmentKey = (placements: Readonly<Record<string, BalanceSide>>): string =>
  Object.entries(placements).sort(([a], [b]) => a.localeCompare(b)).map(([id, side]) => `${id}:${side}`).join('|');

export const balanceTotals = (puzzle: BalancePuzzle, placements: Readonly<Record<string, BalanceSide>>) => {
  let left = puzzle.baseLeft;
  let right = puzzle.baseRight;
  for (const weight of puzzle.weights) {
    if (placements[weight.id] === 'left') left += weight.value;
    if (placements[weight.id] === 'right') right += weight.value;
  }
  return { left, right };
};

export const isBalanced = (puzzle: BalancePuzzle, placements: Readonly<Record<string, BalanceSide>>): boolean => {
  const entries = Object.entries(placements);
  if (entries.length === 0 || entries.some(([id, side]) =>
    !puzzle.weights.some((weight) => weight.id === id) || !puzzle.allowedSides.includes(side))) return false;
  const totals = balanceTotals(puzzle, placements);
  return totals.left === totals.right;
};

const allSolutions = (puzzle: BalancePuzzle, limit = Number.POSITIVE_INFINITY): Array<Record<string, BalanceSide>> => {
  const solutions: Array<Record<string, BalanceSide>> = [];
  const choices: Array<BalanceSide | undefined> = [undefined, ...puzzle.allowedSides];
  const visit = (index: number, placements: Record<string, BalanceSide>) => {
    if (solutions.length >= limit) return;
    if (index === puzzle.weights.length) {
      if (isBalanced(puzzle, placements)) solutions.push({ ...placements });
      return;
    }
    const weight = puzzle.weights[index];
    for (const side of choices) {
      if (side) placements[weight.id] = side;
      else delete placements[weight.id];
      visit(index + 1, placements);
    }
    delete placements[weight.id];
  };
  visit(0, {});
  return solutions;
};

export const solutionIsUnique = (puzzle: BalancePuzzle): boolean => allSolutions(puzzle, 2).length === 1;

export type BalanceRelation = 'balanced' | 'needs-more' | 'too-heavy';

export interface BalanceGuidance {
  relation: BalanceRelation;
  difference: number;
  side?: BalanceSide;
}

export const balanceGuidance = (
  puzzle: BalancePuzzle,
  placements: Readonly<Record<string, BalanceSide>>
): BalanceGuidance => {
  const totals = balanceTotals(puzzle, placements);
  if (totals.left === totals.right) return { relation: 'balanced', difference: 0 };
  const lighter: BalanceSide = totals.left < totals.right ? 'left' : 'right';
  const heavier = oppositeSide(lighter);
  const difference = Math.abs(totals.left - totals.right);
  if (puzzle.allowedSides.includes(lighter)) return { relation: 'needs-more', difference, side: lighter };
  return { relation: 'too-heavy', difference, side: heavier };
};

export const missingSolutionWeightIds = (
  puzzle: BalancePuzzle,
  placements: Readonly<Record<string, BalanceSide>>
): string[] => Object.entries(puzzle.solutionPlacements)
  .filter(([id, side]) => placements[id] !== side)
  .map(([id]) => id);

export const misplacedWeightIds = (
  puzzle: BalancePuzzle,
  placements: Readonly<Record<string, BalanceSide>>
): string[] => Object.entries(placements)
  .filter(([id, side]) => puzzle.solutionPlacements[id] !== side)
  .map(([id]) => id);

export const balancePuzzleSignature = (puzzle: BalancePuzzle): string => [
  puzzle.difficulty,
  puzzle.baseLeft,
  puzzle.baseRight,
  puzzle.allowedSides.join(','),
  puzzle.weights.map((weight) => `${weight.display ?? weight.value}:${weight.value}`).sort().join(','),
  assignmentKey(puzzle.solutionPlacements)
].join('|');

const puzzleId = (difficulty: BalanceDifficulty, sequence: number, random: RandomSource) =>
  `balance-${difficulty}-${sequence}-${randomInt(random, 1_000_000, 9_999_999)}`;

const makePuzzle = (
  difficulty: BalanceDifficulty,
  sequence: number,
  random: RandomSource,
  baseLeft: number,
  baseRight: number,
  allowedSides: BalanceSide[],
  rawWeights: Array<{ value: number; display?: string; accessibleLabel?: string }>,
  clue?: string
): BalancePuzzle | null => {
  const id = puzzleId(difficulty, sequence, random);
  const weights = shuffle(random, rawWeights.map((weight, index) => ({ ...weight, id: `${id}-weight-${index}` })));
  const draft: BalancePuzzle = { id, difficulty, baseLeft, baseRight, allowedSides, weights, solutionPlacements: {}, clue };
  const solutions = allSolutions(draft, 2);
  if (solutions.length !== 1) return null;
  return { ...draft, solutionPlacements: solutions[0] };
};

const randomDistinct = (random: RandomSource, count: number, min: number, max: number): number[] => {
  const values = Array.from({ length: max - min + 1 }, (_, index) => min + index);
  return shuffle(random, values).slice(0, count);
};

const generateSingleSide = (
  difficulty: 'starter' | 'growing' | 'master',
  random: RandomSource,
  sequence: number
): BalancePuzzle | null => {
  const movableSide: BalanceSide = sequence % 2 === 0 ? 'left' : 'right';
  const difference = difficulty === 'starter' ? randomInt(random, 2, 10) : randomInt(random, 4, 10);
  const target = randomInt(random, difference + 2, difficulty === 'master' ? 22 : 18);
  const startingValue = target - difference;
  const baseLeft = movableSide === 'left' ? startingValue : target;
  const baseRight = movableSide === 'right' ? startingValue : target;
  let rawWeights: Array<{ value: number; display?: string; accessibleLabel?: string }>;
  let clue: string | undefined;

  if (difficulty === 'starter') {
    const pool = randomDistinct(random, 5, 1, 12).filter((value) => value !== difference).slice(0, 2);
    rawWeights = [{ value: difference }, ...pool.map((value) => ({ value }))];
  } else if (difficulty === 'growing') {
    const first = randomInt(random, 1, difference - 1);
    const pool = randomDistinct(random, 7, 1, 13)
      .filter((value) => value !== first && value !== difference - first).slice(0, 2);
    rawWeights = [{ value: first }, { value: difference - first }, ...pool.map((value) => ({ value }))];
  } else {
    const shapeValue = randomInt(random, 2, Math.min(7, difference - 1));
    const other = difference - shapeValue;
    clue = `별 + 별 = ${shapeValue * 2} · 별은 얼마일까요?`;
    const pool = randomDistinct(random, 7, 1, 13).filter((value) => value !== other && value !== shapeValue).slice(0, 2);
    rawWeights = [
      { value: shapeValue, display: '★', accessibleLabel: '별 추' },
      { value: other },
      ...pool.map((value) => ({ value }))
    ];
  }
  const puzzle = makePuzzle(difficulty, sequence, random, baseLeft, baseRight, [movableSide], rawWeights, clue);
  if (!puzzle) return null;
  const solutionIds = Object.keys(puzzle.solutionPlacements);
  if (difficulty === 'starter' && solutionIds.length !== 1) return null;
  if (difficulty === 'growing' && solutionIds.length !== 2) return null;
  if (difficulty === 'master') {
    const shape = puzzle.weights.find((weight) => weight.display === '★');
    if (!shape || !puzzle.solutionPlacements[shape.id] || solutionIds.length !== 2) return null;
  }
  return puzzle;
};

const generateBothSides = (random: RandomSource, sequence: number): BalancePuzzle | null => {
  const baseLeft = randomInt(random, 1, 7);
  let baseRight = randomInt(random, 1, 7);
  if (baseRight === baseLeft) baseRight = baseRight === 7 ? 6 : baseRight + 1;
  const values = randomDistinct(random, 4, 1, 10).map((value) => ({ value }));
  const puzzle = makePuzzle('clever', sequence, random, baseLeft, baseRight, ['left', 'right'], values);
  if (!puzzle) return null;
  return new Set(Object.values(puzzle.solutionPlacements)).size === 2 ? puzzle : null;
};

export const generateBalancePuzzle = (
  difficulty: BalanceDifficulty,
  random: RandomSource,
  sequence = 0
): BalancePuzzle => {
  for (let attempt = 0; attempt < 500; attempt += 1) {
    const puzzle = difficulty === 'clever'
      ? generateBothSides(random, sequence)
      : generateSingleSide(difficulty, random, sequence);
    if (puzzle) return puzzle;
  }
  throw new Error(`Could not generate a unique ${difficulty} balance puzzle.`);
};

export interface CreateBalanceProgressOptions {
  daily?: boolean;
  dateKey?: string;
  recentSignatures?: readonly string[];
}

export const createBalanceProgress = (
  difficulty: BalanceDifficulty,
  random: RandomSource,
  options: CreateBalanceProgressOptions = {}
): BalanceProgress => {
  const recent = new Set(options.recentSignatures ?? []);
  const sessionSignatures = new Set<string>();
  const puzzles: BalancePuzzle[] = [];
  for (let index = 0; index < BALANCE_SESSION_LENGTH; index += 1) {
    let puzzle = generateBalancePuzzle(difficulty, random, index);
    for (let retry = 0; retry < 30; retry += 1) {
      const signature = balancePuzzleSignature(puzzle);
      if (!recent.has(signature) && !sessionSignatures.has(signature)) break;
      puzzle = generateBalancePuzzle(difficulty, random, index + retry + 1);
    }
    sessionSignatures.add(balancePuzzleSignature(puzzle));
    puzzles.push(puzzle);
  }
  return {
    schemaVersion: 2,
    id: `balance-session-${randomInt(random, 1_000_000, 9_999_999)}`,
    difficulty,
    puzzles,
    puzzleIndex: 0,
    placements: {},
    completedCount: 0,
    moves: 0,
    hintLevel: 0,
    phase: 'playing',
    daily: Boolean(options.daily),
    dateKey: options.dateKey,
    updatedAt: new Date().toISOString()
  };
};
