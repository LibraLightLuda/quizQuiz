import type { LanguageMasteryEntry, LessonPhase, Question, SessionConfig } from './types';
import { generateMathQuestion } from './mathGenerator';
import { generateLanguageQuestion } from './languageGenerator';
import type { RandomSource } from '../services/randomService';

export const generateQuestion = (
  config: SessionConfig,
  recentSignatures: readonly string[],
  recentAnswers: readonly number[],
  random: RandomSource,
  recentCorrectIndices: readonly number[] = [],
  languageMastery: readonly LanguageMasteryEntry[] = [],
  preferredWordIds: readonly string[] = [],
  lessonPhase?: LessonPhase,
  targetSkillIds: readonly string[] = []
): Question => {
  if (config.subject === 'math') {
    const question = generateMathQuestion({
      mode: config.mode as 'math-add' | 'math-subtract' | 'math-multiply' | 'math-mixed',
      difficulty: config.difficulty,
      recentSignatures,
      recentAnswers,
      recentCorrectIndices,
      random
    });
    return { ...question, metadata: { ...question.metadata, lessonPhase } };
  }
  return generateLanguageQuestion({
    mode: config.mode as 'ko-fill' | 'ko-listen' | 'ko-adventure' | 'en-fill' | 'en-listen' | 'en-adventure',
    difficulty: config.difficulty,
    recentSignatures,
    recentCorrectIndices,
    mastery: languageMastery,
    preferredWordIds,
    targetSkillIds,
    lessonPhase,
    theme: config.theme,
    random
  });
};
