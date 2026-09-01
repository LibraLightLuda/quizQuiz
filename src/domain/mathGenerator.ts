import type { Difficulty, Mode, Question } from './types';
import { makeOptions } from './optionGenerator';
import { validateQuestion } from './questionValidation';
import { createId, pick, randomInt, type RandomSource } from '../services/randomService';

interface MathContext {
  mode: 'math-add' | 'math-subtract' | 'math-multiply' | 'math-mixed';
  difficulty: Difficulty;
  recentSignatures: readonly string[];
  recentAnswers?: readonly number[];
  recentCorrectIndices?: readonly number[];
  random: RandomSource;
}

type MathOperation = Exclude<MathContext['mode'], 'math-mixed'>;

const makeOperands = (mode: MathOperation, difficulty: Difficulty, random: RandomSource): number[] => {
  if (mode === 'math-add') {
    if (difficulty === 'easy') {
      const first = randomInt(random, 0, 20);
      return [first, randomInt(random, 0, Math.min(20, 30 - first))];
    }
    if (difficulty === 'normal') return [randomInt(random, 10, 99), randomInt(random, 10, 99)];
    if (difficulty === 'hard') return [randomInt(random, 10, 299), randomInt(random, 10, 299)];
    if (random.next() < 0.25) return [randomInt(random, 1, 99), randomInt(random, 1, 99), randomInt(random, 1, 99)];
    return [randomInt(random, 100, 999), randomInt(random, 100, 999)];
  }

  if (mode === 'math-subtract') {
    const ranges: Record<Difficulty, readonly [number, number]> = {
      easy: [0, 30], normal: [10, 99], hard: [10, 299], challenge: [100, 999]
    };
    const [min, max] = ranges[difficulty];
    const a = randomInt(random, min, max);
    const b = randomInt(random, min, max);
    return [Math.max(a, b), Math.min(a, b)];
  }

  if (difficulty === 'easy') return [pick(random, [2, 3, 4, 5, 10]), randomInt(random, 1, 9)];
  if (difficulty === 'normal') return [randomInt(random, 2, 9), randomInt(random, 2, 9)];
  if (difficulty === 'hard') return [randomInt(random, 2, 20), randomInt(random, 2, 9)];
  return [randomInt(random, 10, 99), randomInt(random, 2, 9)];
};

const calculate = (mode: MathOperation, operands: number[]): number => {
  if (mode === 'math-add') return operands.reduce((sum, value) => sum + value, 0);
  if (mode === 'math-subtract') return operands[0] - operands[1];
  return operands[0] * operands[1];
};

const signatureFor = (mode: MathOperation, operands: number[]): string => {
  const normalized = mode === 'math-add' || mode === 'math-multiply' ? [...operands].sort((a, b) => a - b) : operands;
  return `${mode}:${normalized.join(',')}`;
};

const distractorsFor = (
  mode: MathOperation, operands: number[], answer: number, difficulty: Difficulty, random: RandomSource
): number[] => {
  const candidates = new Set<number>();
  const offsets = [1, -1, 2, -2, 10, -10, 100, -100];
  offsets.forEach((offset) => candidates.add(answer + offset));

  if (mode === 'math-multiply') {
    const [a, b] = operands;
    candidates.add(a * Math.max(0, b - 1));
    candidates.add(a * (b + 1));
    candidates.add(Math.max(0, a - 1) * b);
    candidates.add((a + 1) * b);
    candidates.add(a + b);
  } else if (operands.length === 2) {
    const [a, b] = operands;
    candidates.add(mode === 'math-add' ? a + Math.max(0, b - 1) : a - Math.max(0, b - 1));
    candidates.add(mode === 'math-add' ? a + b + 10 : a - b + 10);
    candidates.add(Math.abs(a - b));
  }

  for (let offset = 3; candidates.size < 12; offset += 1) {
    candidates.add(answer + offset);
    candidates.add(answer - offset);
  }

  return [...candidates].filter((value) => Number.isInteger(value) && value >= 0 && value !== answer);
};

export const generateMathQuestion = (context: MathContext): Question => {
  const operations = ['math-add', 'math-subtract', 'math-multiply'] as const;
  const operation: MathOperation = context.mode === 'math-mixed'
    ? (() => {
        const recent = context.recentSignatures.slice(-15);
        const counts = operations.map((candidate) => ({
          candidate,
          count: recent.filter((signature) => signature.startsWith(`math-mixed:${candidate}:`)).length
        }));
        const minimum = Math.min(...counts.map((entry) => entry.count));
        return pick(context.random, counts.filter((entry) => entry.count === minimum).map((entry) => entry.candidate));
      })()
    : context.mode;
  let operands: number[] = [];
  let signature = '';
  let answer = 0;
  const recentLimit = context.recentSignatures.length >= 8 ? 8 : context.recentSignatures.length;

  for (let attempt = 0; attempt < 60; attempt += 1) {
    operands = makeOperands(operation, context.difficulty, context.random);
    signature = context.mode === 'math-mixed'
      ? `math-mixed:${signatureFor(operation, operands)}`
      : signatureFor(operation, operands);
    answer = calculate(operation, operands);
    const windowSize = attempt < 30 ? recentLimit : Math.min(4, recentLimit);
    const repeated = context.recentSignatures.slice(-windowSize).includes(signature);
    const sameAnswerThreeTimes = context.recentAnswers?.slice(-2).every((value) => value === answer) && context.recentAnswers.length >= 2;
    if (!repeated && !sameAnswerThreeTimes) break;
  }

  const symbol = operation === 'math-add' ? '+' : operation === 'math-subtract' ? '−' : '×';
  const { options, correctOptionId } = makeOptions(
    answer,
    distractorsFor(operation, operands, answer, context.difficulty, context.random),
    context.difficulty,
    context.random,
    (value) => String(Number(value)),
    context.recentCorrectIndices
  );

  return validateQuestion({
    id: createId('question'),
    signature,
    subject: 'math',
    mode: context.mode,
    difficulty: context.difficulty,
    kind: 'math',
    prompt: `${operands.join(` ${symbol} `)} = ?`,
    options,
    correctOptionId,
    explanation: `${operands.join(` ${symbol} `)} = ${answer}`,
    metadata: { operands, answer, operation }
  });
};
