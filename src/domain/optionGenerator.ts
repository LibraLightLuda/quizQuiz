import { difficultyInfo } from './difficulty';
import type { Difficulty, Option } from './types';
import { createId, shuffle, type RandomSource } from '../services/randomService';

export const makeOptions = (
  answer: string | number,
  candidates: readonly (string | number)[],
  difficulty: Difficulty,
  random: RandomSource,
  normalize: (value: string | number) => string = (value) => String(value).normalize('NFC').toLocaleLowerCase(),
  recentCorrectIndices: readonly number[] = []
): { options: Option[]; correctOptionId: string } => {
  const targetCount = difficultyInfo[difficulty].optionCount;
  const answerKey = normalize(answer);
  const seen = new Set([answerKey]);
  const uniqueCandidates: (string | number)[] = [];

  for (const candidate of candidates) {
    const key = normalize(candidate);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    uniqueCandidates.push(candidate);
    if (uniqueCandidates.length === targetCount - 1) break;
  }

  if (uniqueCandidates.length < targetCount - 1) {
    throw new Error(`선택지 후보가 부족합니다: ${String(answer)}`);
  }

  const correctOptionId = createId('correct');
  const options = shuffle(random, [
    { id: correctOptionId, label: String(answer), value: answer },
    ...uniqueCandidates.map((value) => ({ id: createId('option'), label: String(value), value }))
  ]);

  const correctIndex = options.findIndex((option) => option.id === correctOptionId);
  if (recentCorrectIndices.length >= 2
    && recentCorrectIndices.at(-1) === correctIndex
    && recentCorrectIndices.at(-2) === correctIndex) {
    const offset = 1 + Math.floor(random.next() * (options.length - 1));
    const swapIndex = (correctIndex + offset) % options.length;
    [options[correctIndex], options[swapIndex]] = [options[swapIndex], options[correctIndex]];
  }

  return { options, correctOptionId };
};
