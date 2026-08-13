import { describe, expect, it } from 'vitest';
import { DIFFICULTIES, difficultyInfo } from './difficulty';
import { generateMathQuestion } from './mathGenerator';
import { generateLanguageQuestion } from './languageGenerator';
import { SeededRandom } from '../services/randomService';
import type { Difficulty, Mode, Question } from './types';
import { koreanWords } from '../data/koreanWords';
import { englishWords } from '../data/englishWords';

const assertQuestion = (question: Question) => {
  expect(question.options).toHaveLength(difficultyInfo[question.difficulty].optionCount);
  expect(new Set(question.options.map((option) => String(option.value).normalize('NFC').toLowerCase())).size).toBe(question.options.length);
  expect(question.options.filter((option) => option.id === question.correctOptionId)).toHaveLength(1);
};

const assertMathRange = (mode: 'math-add' | 'math-subtract' | 'math-multiply', difficulty: Difficulty, operands: number[], answer: number) => {
  if (mode === 'math-add') {
    if (difficulty === 'sprout') { expect(operands).toHaveLength(2); expect(Math.max(...operands)).toBeLessThanOrEqual(9); expect(answer).toBeLessThanOrEqual(10); }
    if (difficulty === 'easy') { expect(Math.max(...operands)).toBeLessThanOrEqual(20); expect(answer).toBeLessThanOrEqual(30); }
    if (difficulty === 'normal') operands.forEach((value) => expect(value).toBeGreaterThanOrEqual(10));
    if (difficulty === 'normal') operands.forEach((value) => expect(value).toBeLessThanOrEqual(99));
    if (difficulty === 'hard') operands.forEach((value) => { expect(value).toBeGreaterThanOrEqual(10); expect(value).toBeLessThanOrEqual(299); });
    if (difficulty === 'challenge' && operands.length === 2) operands.forEach((value) => { expect(value).toBeGreaterThanOrEqual(100); expect(value).toBeLessThanOrEqual(999); });
    if (difficulty === 'challenge' && operands.length === 3) operands.forEach((value) => { expect(value).toBeGreaterThanOrEqual(1); expect(value).toBeLessThanOrEqual(99); });
  }
  if (mode === 'math-subtract') {
    const maximum: Record<Difficulty, number> = { sprout: 10, easy: 30, normal: 99, hard: 299, challenge: 999 };
    expect(operands[0]).toBeGreaterThanOrEqual(operands[1]);
    operands.forEach((value) => expect(value).toBeLessThanOrEqual(maximum[difficulty]));
    if (difficulty === 'sprout' && operands[0] === 10) expect([0, 10]).toContain(operands[1]);
  }
  if (mode === 'math-multiply') {
    if (difficulty === 'sprout') { expect([1, 2, 5]).toContain(operands[0]); expect(operands[1]).toBeLessThanOrEqual(5); }
    if (difficulty === 'easy') { expect([2, 3, 4, 5, 10]).toContain(operands[0]); expect(operands[1]).toBeLessThanOrEqual(9); }
    if (difficulty === 'normal') operands.forEach((value) => { expect(value).toBeGreaterThanOrEqual(2); expect(value).toBeLessThanOrEqual(9); });
    if (difficulty === 'hard') { expect(operands[0]).toBeLessThanOrEqual(20); expect(operands[1]).toBeLessThanOrEqual(9); }
    if (difficulty === 'challenge') { expect(operands[0]).toBeGreaterThanOrEqual(10); expect(operands[0]).toBeLessThanOrEqual(99); expect(operands[1]).toBeLessThanOrEqual(9); }
  }
};

describe('수학 문제 생성기', () => {
  const modes = ['math-add', 'math-subtract', 'math-multiply'] as const;

  for (const mode of modes) {
    for (const difficulty of DIFFICULTIES) {
      it(`${mode} ${difficulty} 문제의 답과 보기가 유효하다`, () => {
        const random = new SeededRandom(DIFFICULTIES.indexOf(difficulty) * 31 + modes.indexOf(mode) + 1);
        const recent: string[] = [];
        for (let index = 0; index < 10000; index += 1) {
          const question = generateMathQuestion({ mode, difficulty, recentSignatures: recent, random });
          assertQuestion(question);
          const operands = question.metadata?.operands as number[];
          const answer = question.metadata?.answer as number;
          expect(Number.isInteger(answer)).toBe(true);
          expect(answer).toBeGreaterThanOrEqual(0);
          assertMathRange(mode, difficulty, operands, answer);
          if (mode === 'math-add') expect(answer).toBe(operands.reduce((sum, value) => sum + value, 0));
          if (mode === 'math-subtract') expect(answer).toBe(operands[0] - operands[1]);
          if (mode === 'math-multiply') expect(answer).toBe(operands[0] * operands[1]);
          expect(question.options.find((option) => option.id === question.correctOptionId)?.value).toBe(answer);
          expect(recent.slice(-4)).not.toContain(question.signature);
          recent.push(question.signature);
        }
      });
    }
  }

  it('같은 seed는 같은 문제 내용 순서를 만든다', () => {
    const make = () => {
      const random = new SeededRandom(2026);
      return Array.from({ length: 20 }, () => generateMathQuestion({ mode: 'math-add', difficulty: 'normal', recentSignatures: [], random }).prompt);
    };
    expect(make()).toEqual(make());
  });

  it('정답 위치가 세 문제 연속 같아지지 않는다', () => {
    const random = new SeededRandom(404);
    const recentSignatures: string[] = [];
    const recentCorrectIndices: number[] = [];
    for (let index = 0; index < 500; index += 1) {
      const question = generateMathQuestion({
        mode: 'math-add', difficulty: 'normal', recentSignatures, recentCorrectIndices, random
      });
      const correctIndex = question.options.findIndex((option) => option.id === question.correctOptionId);
      if (recentCorrectIndices.length >= 2) {
        expect([...recentCorrectIndices.slice(-2), correctIndex].every((value) => value === correctIndex)).toBe(false);
      }
      recentSignatures.push(question.signature);
      recentCorrectIndices.push(correctIndex);
    }
  });
});

describe('언어 문제 생성기', () => {
  const modes: Mode[] = ['ko-fill', 'ko-listen', 'en-fill', 'en-listen'];
  for (const mode of modes) {
    for (const difficulty of DIFFICULTIES) {
      it(`${mode} ${difficulty} 문제의 빈칸과 보기가 유효하다`, () => {
        const random = new SeededRandom(modes.indexOf(mode) * 97 + DIFFICULTIES.indexOf(difficulty) + 1);
        for (let index = 0; index < 300; index += 1) {
          const question = generateLanguageQuestion({ mode: mode as 'ko-fill' | 'ko-listen' | 'en-fill' | 'en-listen', difficulty: difficulty as Difficulty, recentSignatures: [], random });
          assertQuestion(question);
          if (mode.endsWith('fill')) {
            expect(question.prompt).toContain('□');
            expect(question.explanation).not.toContain('□');
            const range = question.metadata?.maskRange as { start: number; length: number };
            const wordId = question.metadata?.wordId as string;
            const source = mode === 'ko-fill'
              ? koreanWords.find((word) => word.id === wordId)!.word
              : englishWords.find((word) => word.id === wordId)!.word;
            const correct = String(question.options.find((option) => option.id === question.correctOptionId)!.value);
            const letters = Array.from(source);
            expect(correct).toBe(letters.slice(range.start, range.start + range.length).join(''));
            expect(Array.from(question.prompt).filter((letter) => letter === '□')).toHaveLength(range.length);
            const restored = Array.from(question.prompt);
            restored.splice(range.start, range.length, correct);
            expect(restored.join('')).toBe(source);
          } else {
            expect(question.speech?.text).toBeTruthy();
            expect(question.prompt).not.toContain(question.speech!.text);
          }
        }
      });
    }
  }
});
