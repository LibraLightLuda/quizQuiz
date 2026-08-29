import { englishWords } from '../data/englishWords';
import { koreanWords } from '../data/koreanWords';
import { skillDefinitionById, skillDefinitions } from './skillData';
import type { LanguageMasteryEntry, SessionSummary, SkillMastery, SkillStrand } from './types';

export interface GrowthTrailItem {
  id: 'sound' | 'word' | 'sentence';
  title: string;
  description: string;
  progress: number;
  stateLabel: string;
}

export interface ChildGrowthSummary {
  metWords: string[];
  rememberedWords: string[];
  nextAdventure: string;
  nextAdventureDetail: string;
  trail: GrowthTrailItem[];
  badges: string[];
}

export interface ParentGrowthGroupItem {
  label: string;
  detail: string;
}

export interface ParentGrowthSummary {
  learned: ParentGrowthGroupItem[];
  practicing: ParentGrowthGroupItem[];
  next: ParentGrowthGroupItem[];
  recentAccuracy: number | null;
  hintRate: number | null;
  completedSessions: number;
  example: string;
  explanation: string;
}

const allWords = [...koreanWords, ...englishWords];
const wordById = new Map(allWords.map((word) => [word.id, word]));

const wordLabel = (wordId: string): string => wordById.get(wordId)?.word ?? '';
const uniqueRecentWords = (entries: readonly LanguageMasteryEntry[]): LanguageMasteryEntry[] => {
  const seen = new Set<string>();
  return [...entries]
    .sort((left, right) => Date.parse(right.lastSeenAt) - Date.parse(left.lastSeenAt))
    .filter((entry) => {
      if (seen.has(entry.wordId) || !wordLabel(entry.wordId)) return false;
      seen.add(entry.wordId);
      return true;
    });
};

const progressLabel = (progress: number): string => {
  if (progress >= 75) return '반짝반짝 자랐어요';
  if (progress >= 40) return '쑥쑥 자라고 있어요';
  if (progress > 0) return '새싹이 돋았어요';
  return '첫 만남을 기다려요';
};

const localDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const strandProgress = (
  mastery: readonly SkillMastery[],
  strands: readonly SkillStrand[]
): number => {
  const matching = mastery.filter((entry) => strands.includes(skillDefinitionById.get(entry.skillId)?.strand ?? 'sound'));
  if (!matching.length) return 0;
  return Math.round(matching.reduce((sum, entry) => sum + entry.confidence, 0) / matching.length * 100);
};

const skillLabel = (skillId: string): string =>
  skillDefinitionById.get(skillId)?.examples[0] ?? '기초 낱말 연습';

const skillDetail = (entry: SkillMastery): string => {
  if (entry.hintRate >= 0.35) return '힌트를 줄이고 혼자 떠올리는 연습을 이어가면 좋아요.';
  if (entry.recentAccuracy < 0.7) return '최근 정답 흐름을 보며 짧게 다시 만나면 좋아요.';
  if (Date.parse(entry.nextReviewAt) <= Date.now()) return '배운 내용을 잊기 전에 다시 만날 때예요.';
  return '독립적으로 맞힌 경험을 한두 번 더 쌓으면 좋아요.';
};

const isLearned = (entry: SkillMastery): boolean =>
  entry.confidence >= 0.75
  || (entry.recentIndependent.length >= 3 && entry.recentAccuracy >= 0.8);

export const buildChildGrowthSummary = (
  wordMastery: readonly LanguageMasteryEntry[],
  skillMastery: readonly SkillMastery[],
  now = new Date()
): ChildGrowthSummary => {
  const words = uniqueRecentWords(wordMastery);
  const todayKey = localDateKey(now);
  const metToday = words.filter((entry) => localDateKey(new Date(entry.lastSeenAt)) === todayKey);
  const metSource = metToday.length ? metToday : words;
  const remembered = words.filter((entry) => entry.stage === 'almost' || entry.stage === 'mastered');
  const sound = strandProgress(skillMastery, ['sound']);
  const word = strandProgress(skillMastery, ['decoding', 'spelling', 'vocabulary']);
  const sentenceSkills = strandProgress(skillMastery, ['sentence', 'comprehension']);
  const adventureEntries = wordMastery.filter((entry) => entry.mode.endsWith('adventure'));
  const adventureProgress = adventureEntries.length
    ? Math.round(adventureEntries.reduce((sum, entry) => sum + entry.correctCount / Math.max(1, entry.attempts), 0) / adventureEntries.length * 100)
    : 0;
  const sentence = Math.max(sentenceSkills, adventureProgress);
  const dueReview = wordMastery.some((entry) => Date.parse(entry.nextReviewAt) <= now.getTime());
  const badges: string[] = [];
  if (skillMastery.some((entry) => entry.hintRate > 0 && entry.independentCorrect > 0)) badges.push('도움 뒤에 혼자 찾았어요');
  if (remembered.length) badges.push('다시 기억해 냈어요');
  if (sentence > 0) badges.push('문장 속 친구를 만났어요');

  return {
    metWords: metSource.slice(0, 4).map((entry) => wordLabel(entry.wordId)),
    rememberedWords: remembered.slice(0, 4).map((entry) => wordLabel(entry.wordId)),
    nextAdventure: dueReview ? '다시 만나는 말놀이' : words.length >= 2 ? '오늘의 이야기 미션' : '말놀이 탐험',
    nextAdventureDetail: dueReview
      ? '전에 만난 낱말을 짧게 다시 찾아봐요.'
      : words.length >= 2 ? '배운 낱말이 나오는 이야기를 찾아봐요.' : '그림과 소리로 새 친구를 만나봐요.',
    trail: [
      { id: 'sound', title: '소리 씨앗', description: '듣고 소리를 찾아요', progress: sound, stateLabel: progressLabel(sound) },
      { id: 'word', title: '낱말 나무', description: '글자와 뜻을 이어요', progress: word, stateLabel: progressLabel(word) },
      { id: 'sentence', title: '이야기 별', description: '문장 속 뜻을 찾아요', progress: sentence, stateLabel: progressLabel(sentence) }
    ],
    badges
  };
};

export const buildParentGrowthSummary = (
  wordMastery: readonly LanguageMasteryEntry[],
  mastery: readonly SkillMastery[],
  history: readonly SessionSummary[]
): ParentGrowthSummary => {
  const byId = new Map(mastery.map((entry) => [entry.skillId, entry]));
  const learnedEntries = mastery.filter(isLearned).sort((a, b) => b.confidence - a.confidence);
  const practicingEntries = mastery.filter((entry) => entry.attempts > 0 && !isLearned(entry))
    .sort((a, b) => a.confidence - b.confidence);
  const readyUntried = skillDefinitions.filter((skill) => !byId.has(skill.id) && skill.prerequisites.every((id) => {
    const prerequisite = byId.get(id);
    return prerequisite ? isLearned(prerequisite) : false;
  })).sort((a, b) => a.order - b.order);
  const nextEntries = readyUntried.slice(0, 3).map((skill) => ({
    label: skill.examples[0],
    detail: '앞에서 익힌 내용을 바탕으로 다음에 시작하기 좋은 활동이에요.'
  }));
  if (!nextEntries.length && practicingEntries[0]) {
    nextEntries.push({ label: skillLabel(practicingEntries[0].skillId), detail: skillDetail(practicingEntries[0]) });
  }

  const recentLanguage = history.filter((session) => session.config.subject !== 'math').slice(0, 7);
  const totalQuestions = recentLanguage.reduce((sum, session) => sum + session.totalCount, 0);
  const correctQuestions = recentLanguage.reduce((sum, session) => sum + session.correctCount, 0);
  const totalSkillAttempts = mastery.reduce((sum, entry) => sum + entry.attempts, 0);
  const weightedHints = mastery.reduce((sum, entry) => sum + entry.hintRate * entry.attempts, 0);
  const exampleWord = uniqueRecentWords(wordMastery)[0];
  const exampleData = exampleWord ? wordById.get(exampleWord.wordId) : undefined;
  const example = exampleData
    ? `${exampleData.word} — ${'hintKo' in exampleData ? exampleData.hintKo : exampleData.meaningKo}`
    : learnedEntries[0] ? skillLabel(learnedEntries[0].skillId) : '학습 기록이 쌓이면 실제 예시가 여기에 보여요.';
  const focus = practicingEntries[0];

  return {
    learned: learnedEntries.slice(0, 3).map((entry) => ({
      label: skillLabel(entry.skillId),
      detail: `최근 독립 정답 흐름 ${Math.round(entry.recentAccuracy * 100)}%`
    })),
    practicing: practicingEntries.slice(0, 3).map((entry) => ({ label: skillLabel(entry.skillId), detail: skillDetail(entry) })),
    next: nextEntries,
    recentAccuracy: totalQuestions ? Math.round(correctQuestions / totalQuestions * 100) : null,
    hintRate: totalSkillAttempts ? Math.round(weightedHints / totalSkillAttempts * 100) : null,
    completedSessions: recentLanguage.length,
    example,
    explanation: focus ? skillDetail(focus) : '현재 기록에서는 짧은 복습을 이어가며 다음 활동으로 넘어갈 수 있어요.'
  };
};
