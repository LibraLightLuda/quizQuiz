import { englishWords } from '../data/englishWords';
import { koreanWords } from '../data/koreanWords';
import { learningThemeInfo } from './difficulty';
import { makeOptions } from './optionGenerator';
import { validateQuestion } from './questionValidation';
import type {
  Difficulty, EnglishWord, KoreanWord, LanguageActivityKind, LanguageMode,
  LearningTheme, LessonPhase, Question
} from './types';
import { createId, pick, shuffle, type RandomSource } from '../services/randomService';

interface ActivityContext {
  mode: 'ko-adventure' | 'en-adventure';
  difficulty: Difficulty;
  recentSignatures: readonly string[];
  recentCorrectIndices?: readonly number[];
  targetSkillIds?: readonly string[];
  lessonPhase?: LessonPhase;
  theme?: LearningTheme;
  random: RandomSource;
}

type ActivityWord = KoreanWord | EnglishWord;

const activityFor = (context: ActivityContext): LanguageActivityKind => {
  if (context.lessonPhase === 'welcome') return 'picture-link';
  if (context.lessonPhase === 'story') return 'sentence-complete';
  if (context.lessonPhase === 'review') return 'word-build';
  const soundCount = context.recentSignatures.filter((signature) => signature.startsWith('activity:sound-match:')).length;
  const buildCount = context.recentSignatures.filter((signature) => signature.startsWith('activity:word-build:')).length;
  return soundCount <= buildCount ? 'sound-match' : 'word-build';
};

const chooseWord = (context: ActivityContext): { target: ActivityWord; source: readonly ActivityWord[] } => {
  const korean = context.mode === 'ko-adventure';
  const source: readonly ActivityWord[] = korean ? koreanWords : englishWords;
  const level = source.filter((word) => word.difficulty === context.difficulty);
  const fresh = level.filter((word) => !context.recentSignatures.some(
    (signature) => signature.includes(':' + word.id + ':') || signature.endsWith(':' + word.id)
  ));
  const candidates = fresh.length ? fresh : level;
  const themeCategories = context.theme ? learningThemeInfo[context.theme].categories : [];
  const themed = candidates.filter((word) => themeCategories.includes(word.category));
  const themedCandidates = themed.length >= 3 ? themed : candidates;
  const targeted = context.targetSkillIds?.length
    ? themedCandidates.filter((word) => word.skillIds.some((skillId) => context.targetSkillIds?.includes(skillId)))
    : [];
  return { target: pick(context.random, targeted.length ? targeted : themedCandidates), source };
};

const evidenceFor = (
  target: ActivityWord,
  activity: LanguageActivityKind,
  targetSkillIds: readonly string[]
): string[] => {
  const targeted = target.skillIds.filter((skillId) => targetSkillIds.includes(skillId));
  if (targeted.length) return targeted;
  const prefixes = activity === 'picture-link' || activity === 'sentence-complete'
    ? ['ko-meaning', 'ko-category', 'en-meaning', 'en-category']
    : activity === 'sound-match'
      ? ['ko-syllable', 'en-initial', 'en-final', 'ko-meaning', 'en-meaning']
      : ['ko-initial', 'ko-final', 'ko-basic', 'en-basic', 'en-cvc', 'en-short', 'en-digraph', 'en-consonant', 'en-silent', 'en-vowel', 'en-r-controlled'];
  const relevant = target.skillIds.filter((skillId) => prefixes.some((prefix) => skillId.startsWith(prefix)));
  return relevant.length ? relevant.slice(0, 2) : target.skillIds.slice(0, 1);
};

const wordChunks = (word: string, korean: boolean): string[] => {
  const letters = Array.from(word);
  if (korean || letters.length <= 5) return letters;
  const chunkSize = Math.ceil(letters.length / 5);
  const chunks: string[] = [];
  for (let index = 0; index < letters.length; index += chunkSize) {
    chunks.push(letters.slice(index, index + chunkSize).join(''));
  }
  return chunks;
};

const questionCopy = (
  target: ActivityWord,
  activity: LanguageActivityKind,
  korean: boolean
): { prompt: string; hint: string; title: string; instruction: string } => {
  if (activity === 'sound-match') {
    return {
      prompt: korean ? '들리는 낱말을 찾아요' : 'Find the word you hear',
      hint: '소리 버튼을 누르면 다시 들을 수 있어요.',
      title: '소리 찾기',
      instruction: '귀를 쫑긋하고 같은 낱말을 톡 눌러요.'
    };
  }
  if (activity === 'word-build') {
    return {
      prompt: korean ? '낱말 타일 기차를 만들어요' : 'Build the letter train',
      hint: korean ? (target as KoreanWord).hintKo : (target as EnglishWord).meaningKo,
      title: '낱말 조립',
      instruction: '타일을 순서대로 눌러 낱말을 만들어요.'
    };
  }
  if (activity === 'picture-link') {
    return {
      prompt: korean ? '그림 친구의 이름은 무엇일까요?' : 'What is this picture?',
      hint: korean ? (target as KoreanWord).hintKo : (target as EnglishWord).meaningKo,
      title: '그림 연결',
      instruction: '그림과 어울리는 낱말을 골라요.'
    };
  }
  return {
    prompt: korean
      ? '“' + (target as KoreanWord).hintKo + '”인 낱말로 문장을 완성해요.'
      : 'Complete the sentence: My word means “' + (target as EnglishWord).meaningKo + '”.',
    hint: korean ? '오늘의 낱말은 □예요.' : 'My word is ____.',
    title: '문장 완성',
    instruction: '짧은 문장에 알맞은 낱말을 넣어요.'
  };
};

export const generateLanguageActivityQuestion = (context: ActivityContext): Question => {
  const korean = context.mode === 'ko-adventure';
  const activity = activityFor(context);
  const { target, source } = chooseWord(context);
  const distractors = shuffle(context.random, [
    ...source.filter((word) => word.id !== target.id && word.difficulty === context.difficulty && word.category === target.category),
    ...source.filter((word) => word.id !== target.id && word.difficulty === context.difficulty && word.category !== target.category)
  ]);
  const { options: rawOptions, correctOptionId } = makeOptions(
    target.word,
    distractors.map((word) => word.word),
    context.difficulty,
    context.random,
    undefined,
    context.recentCorrectIndices
  );
  const options = rawOptions;
  const optionWordIds = Object.fromEntries(rawOptions.flatMap((option) => {
    const word = source.find((candidate) => candidate.word === option.value);
    return word ? [[option.id, word.id]] : [];
  }));
  const copy = questionCopy(target, activity, korean);
  const speech = activity === 'sound-match'
    ? { text: target.word, lang: korean ? 'ko-KR' as const : 'en-US' as const }
    : activity === 'sentence-complete'
      ? {
          text: korean
            ? copy.prompt
            : 'Complete the sentence. Choose the word that matches the meaning.',
          lang: korean ? 'ko-KR' as const : 'en-US' as const,
          slowReplay: true
        }
      : undefined;
  const correctChunks = activity === 'word-build' ? wordChunks(target.word, korean) : [];
  const distractorChunk = activity === 'word-build'
    ? shuffle(context.random, distractors.flatMap((word) => wordChunks(word.word, korean)))
      .find((chunk) => !correctChunks.includes(chunk))
    : undefined;
  const tiles = activity === 'word-build'
    ? shuffle(context.random, [...correctChunks, ...(distractorChunk ? [distractorChunk] : [])])
      .map((value, index) => ({ id: `tile-${index}`, label: value, value }))
    : undefined;

  return validateQuestion({
    id: createId('question'),
    signature: 'activity:' + activity + ':' + target.id,
    subject: korean ? 'korean' : 'english',
    mode: context.mode as LanguageMode,
    difficulty: context.difficulty,
    kind: activity === 'sound-match' ? 'listening' : 'fill',
    prompt: copy.prompt,
    hint: copy.hint,
    speech,
    options,
    correctOptionId,
    explanation: target.word,
    activity: {
      kind: activity,
      title: copy.title,
      instruction: copy.instruction,
      optionStyle: activity === 'sound-match' ? 'sound'
        : activity === 'word-build' ? 'tiles'
          : activity === 'picture-link' ? 'pictures' : 'sentence',
      optionWordIds,
      tiles,
      targetTileCount: activity === 'word-build' ? correctChunks.length : undefined,
      hintSteps: activity === 'word-build' ? [
        `첫 타일은 “${correctChunks[0]}”예요.`,
        `${correctChunks.length}개의 타일을 순서대로 놓아요.`,
        `완성하면 “${target.word}”가 돼요.`
      ] : undefined
    },
    metadata: {
      wordId: target.id,
      skillIds: target.skillIds,
      evidenceSkillIds: evidenceFor(target, activity, context.targetSkillIds ?? []),
      activityKind: activity,
      lessonPhase: context.lessonPhase,
      selectionReason: context.lessonPhase ?? 'adaptive'
    }
  });
};
