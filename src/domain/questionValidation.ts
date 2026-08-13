import type { Question } from './types';
import { difficultyInfo } from './difficulty';

export const validateQuestion = (question: Question): Question => {
  const expected = difficultyInfo[question.difficulty].optionCount;
  if (question.options.length !== expected) throw new Error('난이도와 보기 수가 다릅니다.');
  const ids = new Set(question.options.map((option) => option.id));
  if (ids.size !== question.options.length) throw new Error('보기 ID가 중복됩니다.');
  const normalized = question.options.map((option) => String(option.value).normalize('NFC').toLocaleLowerCase());
  if (new Set(normalized).size !== normalized.length) throw new Error('보기 값이 중복됩니다.');
  if (question.options.filter((option) => option.id === question.correctOptionId).length !== 1) {
    throw new Error('정답은 정확히 하나여야 합니다.');
  }
  if (!question.prompt.trim()) throw new Error('문제가 비어 있습니다.');
  return question;
};
