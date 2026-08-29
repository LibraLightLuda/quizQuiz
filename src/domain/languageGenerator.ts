import { koreanWords } from '../data/koreanWords';
import { englishWords } from '../data/englishWords';
import type { Difficulty, EnglishWord, KoreanWord, LanguageMasteryEntry, LanguageMode, LearningTheme, LessonPhase, Mode, Question } from './types';
import { makeOptions } from './optionGenerator';
import { validateQuestion } from './questionValidation';
import { createId, pick, shuffle, type RandomSource } from '../services/randomService';
import { learningThemeInfo } from './difficulty';
import { generateLanguageActivityQuestion } from './languageActivityGenerator';

interface LanguageContext {
  mode: LanguageMode;
  difficulty: Difficulty;
  recentSignatures: readonly string[];
  recentCorrectIndices?: readonly number[];
  mastery?: readonly LanguageMasteryEntry[];
  preferredWordIds?: readonly string[];
  targetSkillIds?: readonly string[];
  lessonPhase?: LessonPhase;
  theme?: LearningTheme;
  now?: number;
  random: RandomSource;
}

const pickAdaptive = <T extends { id: string; difficulty: Difficulty; skillIds: string[] }>(
  values: readonly T[], context: LanguageContext
): T => {
  const matches = values.filter((value) => value.difficulty === context.difficulty);
  const preferred = context.preferredWordIds
    ?.map((wordId) => matches.find((value) => value.id === wordId))
    .find((value): value is T => value !== undefined);
  if (preferred) return preferred;

  const fresh = matches.filter((value) => !context.recentSignatures.some(
    (signature) => signature.includes(`:${value.id}:`) || signature.endsWith(`:${value.id}`)
  ));
  const candidates = fresh.length ? fresh : matches;
  const themeCategories = context.theme ? learningThemeInfo[context.theme].categories : [];
  const themed = candidates.filter((value) => 'category' in value
    && themeCategories.includes(String((value as { category: string }).category)));
  const themedCandidates = themed.length >= 3 ? themed : candidates;
  const targeted = context.lessonPhase === 'discover' && context.targetSkillIds?.length
    ? themedCandidates.filter((value) => value.skillIds.some((skillId) => context.targetSkillIds?.includes(skillId)))
    : [];
  const activeCandidates = targeted.length ? targeted : themedCandidates;
  const entries = new Map(
    (context.mastery ?? []).filter((entry) => entry.mode === context.mode).map((entry) => [entry.wordId, entry])
  );
  const now = context.now ?? Date.now();
  const review = activeCandidates.filter((value) => {
    const entry = entries.get(value.id);
    return entry?.stage === 'review' || (entry !== undefined && Date.parse(entry.nextReviewAt) <= now);
  });
  const growth = activeCandidates.filter((value) => {
    const stage = entries.get(value.id)?.stage ?? 'new';
    return stage === 'new' || stage === 'learning' || stage === 'almost';
  });
  const mastered = activeCandidates.filter((value) => entries.get(value.id)?.stage === 'mastered');
  if (context.lessonPhase === 'review') {
    return pick(context.random, review.length ? review : growth.length ? growth : activeCandidates);
  }
  if (context.lessonPhase === 'discover') {
    return pick(context.random, growth.length ? growth : review.length ? review : activeCandidates);
  }
  if (context.lessonPhase === 'welcome' || context.lessonPhase === 'story') {
    return pick(context.random, mastered.length ? mastered : growth.length ? growth : activeCandidates);
  }
  const roll = context.random.next();
  const preferredPool = roll < 0.25 ? review : roll < 0.70 ? growth : mastered;
  return pick(context.random, preferredPool.length ? preferredPool : growth.length ? growth : review.length ? review : activeCandidates);
};

const evidenceSkillIdsFor = (
  target: { skillIds: string[] },
  context: LanguageContext
): string[] => {
  const targetSkills = target.skillIds.filter((skillId) => context.targetSkillIds?.includes(skillId));
  if (targetSkills.length) return targetSkills;
  const activityPrefixes = context.mode.endsWith('listen')
    ? ['ko-meaning', 'ko-category', 'ko-syllable', 'en-meaning', 'en-category', 'en-initial', 'en-final']
    : ['ko-initial', 'ko-final', 'ko-basic', 'en-basic', 'en-cvc', 'en-short', 'en-digraph', 'en-consonant', 'en-silent', 'en-vowel', 'en-r-controlled'];
  const relevant = target.skillIds.filter((skillId) => activityPrefixes.some((prefix) => skillId.startsWith(prefix)));
  return relevant.length ? relevant.slice(0, 2) : target.skillIds.slice(0, 1);
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
  const target = pickAdaptive(koreanWords, context);
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
    options, correctOptionId, explanation: target.word, metadata: {
      wordId: target.id, maskRange: range, skillIds: target.skillIds,
      evidenceSkillIds: evidenceSkillIdsFor(target, context),
      selectionReason: context.preferredWordIds?.includes(target.id) ? 'session-review' : context.lessonPhase ?? 'adaptive',
      lessonPhase: context.lessonPhase
    }
  });
};

const generateEnglishFill = (context: LanguageContext): Question => {
  const target = pickAdaptive(englishWords, context);
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
    options, correctOptionId, explanation: target.word, metadata: {
      wordId: target.id, maskRange: range, phonicsSkills: target.phonicsSkills, skillIds: target.skillIds,
      evidenceSkillIds: evidenceSkillIdsFor(target, context),
      selectionReason: context.preferredWordIds?.includes(target.id) ? 'session-review' : context.lessonPhase ?? 'adaptive',
      lessonPhase: context.lessonPhase
    }
  });
};

const generateListening = (context: LanguageContext): Question => {
  const korean = context.mode === 'ko-listen';
  const source: readonly (KoreanWord | EnglishWord)[] = korean ? koreanWords : englishWords;
  const target = pickAdaptive(source, context) as KoreanWord | EnglishWord;
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
    options, correctOptionId, explanation: target.word, metadata: {
      wordId: target.id,
      skillIds: target.skillIds,
      evidenceSkillIds: evidenceSkillIdsFor(target, context),
      ...(!korean ? { phonicsSkills: (target as EnglishWord).phonicsSkills } : {}),
      selectionReason: context.preferredWordIds?.includes(target.id) ? 'session-review' : context.lessonPhase ?? 'adaptive',
      lessonPhase: context.lessonPhase
    }
  });
};

export const generateLanguageQuestion = (context: LanguageContext): Question => {
  if (context.mode === 'ko-adventure' || context.mode === 'en-adventure') {
    return generateLanguageActivityQuestion({ ...context, mode: context.mode });
  }
  if (context.mode === 'ko-fill') return generateKoreanFill(context);
  if (context.mode === 'en-fill') return generateEnglishFill(context);
  return generateListening(context);
};

export const listeningFallbackMode = (mode: Mode): Mode => mode === 'ko-listen' || mode === 'ko-adventure' ? 'ko-fill' : mode === 'en-listen' || mode === 'en-adventure' ? 'en-fill' : mode;
