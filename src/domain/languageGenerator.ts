import { koreanWords } from '../data/koreanWords';
import { englishWords } from '../data/englishWords';
import type { Difficulty, EnglishWord, KoreanWord, Mode, Question } from './types';
import { makeOptions } from './optionGenerator';
import { validateQuestion } from './questionValidation';
import { createId, pick, shuffle, type RandomSource } from '../services/randomService';

interface LanguageContext {
  mode: 'ko-fill' | 'ko-listen' | 'en-fill' | 'en-listen';
  difficulty: Difficulty;
  recentSignatures: readonly string[];
  recentCorrectIndices?: readonly number[];
  random: RandomSource;
}

const pickFresh = <T extends { id: string; difficulty: Difficulty }>(
  values: readonly T[], difficulty: Difficulty, recent: readonly string[], random: RandomSource
): T => {
  const matches = values.filter((value) => value.difficulty === difficulty);
  const fresh = matches.filter((value) => !recent.some((signature) => signature.includes(`:${value.id}:`) || signature.endsWith(`:${value.id}`)));
  return pick(random, fresh.length ? fresh : matches);
};

const mask = (word: string, start: number, length: number): { prompt: string; answer: string } => {
  const letters = Array.from(word);
  const answer = letters.slice(start, start + length).join('');
  letters.splice(start, length, '□'.repeat(length));
  return { prompt: letters.join(''), answer };
};

const chunksFromKorean = (target: KoreanWord, start: number, length: number, random: RandomSource): string[] => {
  const ordered = shuffle(random, koreanWords.filter((word) => word.id !== target.id));
  const categoryFirst = [
    ...ordered.filter((word) => word.difficulty === target.difficulty && word.category === target.category),
    ...ordered.filter((word) => word.difficulty === target.difficulty && word.category !== target.category),
    ...ordered.filter((word) => word.difficulty !== target.difficulty && word.category === target.category),
    ...ordered.filter((word) => word.difficulty !== target.difficulty && word.category !== target.category)
  ];
  return categoryFirst.flatMap((word) => {
    const letters = Array.from(word.word);
    const positions = [start, 0, Math.max(0, letters.length - length)];
    return positions.filter((position) => position + length <= letters.length).map((position) => letters.slice(position, position + length).join(''));
  });
};

const chunksFromEnglish = (target: EnglishWord, start: number, length: number, random: RandomSource): string[] => {
  const common = length === 1 ? ['a', 'e', 'i', 'o', 'u', 'b', 'c', 'd', 'p', 't'] : length === 2 ? ['ch', 'sh', 'th', 'ph', 'oo', 'ee', 'ar', 'er'] : ['ing', 'tion', 'str', 'ter', 'ght', 'ear'];
  const shuffled = shuffle(random, englishWords.filter((word) => word.id !== target.id));
  const ordered = [
    ...shuffled.filter((word) => word.difficulty === target.difficulty && word.category === target.category),
    ...shuffled.filter((word) => word.difficulty === target.difficulty && word.category !== target.category),
    ...shuffled.filter((word) => word.difficulty !== target.difficulty && word.category === target.category),
    ...shuffled.filter((word) => word.difficulty !== target.difficulty && word.category !== target.category)
  ];
  return [...common, ...ordered.flatMap((word) => {
    const positions = [start, 0, Math.max(0, word.word.length - length)];
    return positions.filter((position) => position + length <= word.word.length).map((position) => word.word.slice(position, position + length));
  })];
};

const generateKoreanFill = (context: LanguageContext): Question => {
  const target = pickFresh(koreanWords, context.difficulty, context.recentSignatures, context.random);
  const range = pick(context.random, target.maskRanges);
  const result = mask(target.word, range.start, range.length);
  const candidates = [...(target.distractorChunks ?? []), ...chunksFromKorean(target, range.start, range.length, context.random)];
  const { options, correctOptionId } = makeOptions(
    result.answer, candidates, context.difficulty, context.random, undefined, context.recentCorrectIndices
  );
  return validateQuestion({
    id: createId('question'), signature: `ko-fill:${target.id}:${range.start}:${range.length}`,
    subject: 'korean', mode: 'ko-fill', difficulty: context.difficulty, kind: 'fill',
    prompt: result.prompt, hint: `${target.emoji ? `${target.emoji} ` : ''}${target.hintKo}`,
    options, correctOptionId, explanation: target.word, metadata: { wordId: target.id, maskRange: range }
  });
};

const generateEnglishFill = (context: LanguageContext): Question => {
  const target = pickFresh(englishWords, context.difficulty, context.recentSignatures, context.random);
  const range = pick(context.random, target.maskRanges);
  const result = mask(target.word, range.start, range.length);
  const knownWords = new Set(englishWords.map((word) => word.word));
  const candidates = [...(target.distractorChunks ?? []), ...chunksFromEnglish(target, range.start, range.length, context.random)]
    .filter((candidate) => candidate.length === range.length)
    .filter((candidate) => {
      const letters = Array.from(target.word);
      letters.splice(range.start, range.length, candidate);
      const completed = letters.join('');
      return completed === target.word || !knownWords.has(completed);
    });
  const { options, correctOptionId } = makeOptions(
    result.answer, candidates, context.difficulty, context.random, undefined, context.recentCorrectIndices
  );
  return validateQuestion({
    id: createId('question'), signature: `en-fill:${target.id}:${range.start}:${range.length}`,
    subject: 'english', mode: 'en-fill', difficulty: context.difficulty, kind: 'fill',
    prompt: result.prompt, hint: target.meaningKo,
    options, correctOptionId, explanation: target.word, metadata: { wordId: target.id, maskRange: range }
  });
};

const generateListening = (context: LanguageContext): Question => {
  const korean = context.mode === 'ko-listen';
  const source: readonly (KoreanWord | EnglishWord)[] = korean ? koreanWords : englishWords;
  const target = pickFresh(source, context.difficulty, context.recentSignatures, context.random) as KoreanWord | EnglishWord;
  const sameLevel = source.filter((word) => word.id !== target.id && word.difficulty === context.difficulty);
  const candidates = shuffle(context.random, [
    ...sameLevel.filter((word) => word.category === target.category),
    ...sameLevel.filter((word) => word.category !== target.category)
  ]).map((word) => word.word);
  const { options, correctOptionId } = makeOptions(
    target.word, candidates, context.difficulty, context.random, undefined, context.recentCorrectIndices
  );
  return validateQuestion({
    id: createId('question'), signature: `${context.mode}:${target.id}`,
    subject: korean ? 'korean' : 'english', mode: context.mode, difficulty: context.difficulty, kind: 'listening',
    prompt: context.difficulty === 'challenge' ? '잘 듣고 알맞은 단어를 입력해요' : '잘 듣고 알맞은 단어를 골라요',
    hint: '소리 버튼을 누르면 다시 들을 수 있어요.',
    speech: { text: target.word, lang: korean ? 'ko-KR' : 'en-US' },
    options, correctOptionId, explanation: target.word, metadata: { wordId: target.id }
  });
};

export const generateLanguageQuestion = (context: LanguageContext): Question => {
  if (context.mode === 'ko-fill') return generateKoreanFill(context);
  if (context.mode === 'en-fill') return generateEnglishFill(context);
  return generateListening(context);
};

export const listeningFallbackMode = (mode: Mode): Mode => mode === 'ko-listen' ? 'ko-fill' : mode === 'en-listen' ? 'en-fill' : mode;
