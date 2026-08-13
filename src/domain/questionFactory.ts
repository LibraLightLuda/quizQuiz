import type { Question, SessionConfig } from './types';
import { generateMathQuestion } from './mathGenerator';
import { generateLanguageQuestion } from './languageGenerator';
import type { RandomSource } from '../services/randomService';

export const generateQuestion = (
  config: SessionConfig,
  recentSignatures: readonly string[],
  recentAnswers: readonly number[],
  random: RandomSource,
  recentCorrectIndices: readonly number[] = []
): Question => {
  if (config.subject === 'math') {
    return generateMathQuestion({
      mode: config.mode as 'math-add' | 'math-subtract' | 'math-multiply' | 'math-mixed',
      difficulty: config.difficulty,
      recentSignatures,
      recentAnswers,
      recentCorrectIndices,
      random
    });
  }
  return generateLanguageQuestion({
    mode: config.mode as 'ko-fill' | 'ko-listen' | 'en-fill' | 'en-listen',
    difficulty: config.difficulty,
    recentSignatures,
    recentCorrectIndices,
    random
  });
};
