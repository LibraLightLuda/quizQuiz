import type { Difficulty, LanguageActivityKind, SkillDefinition } from './types';

export const skillDefinitions: readonly SkillDefinition[] = [
  { id: 'ko-meaning-picture', language: 'korean', strand: 'vocabulary', prerequisites: [], order: 0, examples: ['그림과 낱말 연결'] },
  { id: 'ko-category-vocabulary', language: 'korean', strand: 'vocabulary', prerequisites: ['ko-meaning-picture'], order: 1, examples: ['동물', '음식', '자연'] },
  { id: 'ko-syllable-count', language: 'korean', strand: 'sound', prerequisites: ['ko-meaning-picture'], order: 2, examples: ['호-랑-이'] },
  { id: 'ko-initial-syllable', language: 'korean', strand: 'decoding', prerequisites: ['ko-syllable-count'], order: 3, examples: ['호랑이의 첫 음절'] },
  { id: 'ko-final-syllable', language: 'korean', strand: 'decoding', prerequisites: ['ko-syllable-count'], order: 4, examples: ['호랑이의 끝 음절'] },
  { id: 'ko-basic-consonant', language: 'korean', strand: 'decoding', prerequisites: ['ko-initial-syllable'], order: 5, examples: ['ㄱ', 'ㄴ', 'ㄷ'] },
  { id: 'ko-basic-vowel', language: 'korean', strand: 'decoding', prerequisites: ['ko-basic-consonant'], order: 6, examples: ['ㅏ', 'ㅓ', 'ㅗ'] },
  { id: 'ko-final-presence', language: 'korean', strand: 'spelling', prerequisites: ['ko-basic-consonant', 'ko-basic-vowel'], order: 7, examples: ['받침 있음과 없음'] },
  { id: 'ko-final-consonant', language: 'korean', strand: 'spelling', prerequisites: ['ko-final-presence'], order: 8, examples: ['ㄱ 받침', 'ㄴ 받침'] },
  { id: 'en-meaning-picture', language: 'english', strand: 'vocabulary', prerequisites: [], order: 0, examples: ['apple과 사과 그림 연결'] },
  { id: 'en-category-vocabulary', language: 'english', strand: 'vocabulary', prerequisites: ['en-meaning-picture'], order: 1, examples: ['animal', 'food', 'nature'] },
  { id: 'en-initial-sound', language: 'english', strand: 'sound', prerequisites: ['en-meaning-picture'], order: 2, examples: ['첫소리 /b/'] },
  { id: 'en-final-sound', language: 'english', strand: 'sound', prerequisites: ['en-initial-sound'], order: 3, examples: ['끝소리 /t/'] },
  { id: 'en-basic-code', language: 'english', strand: 'decoding', prerequisites: ['en-initial-sound'], order: 4, examples: ['글자와 소리 연결'] },
  { id: 'en-cvc', language: 'english', strand: 'decoding', prerequisites: ['en-basic-code'], order: 5, examples: ['cat', 'dog'] },
  { id: 'en-short-vowel', language: 'english', strand: 'decoding', prerequisites: ['en-cvc'], order: 6, examples: ['short a', 'short i'] },
  { id: 'en-digraph', language: 'english', strand: 'decoding', prerequisites: ['en-basic-code'], order: 7, examples: ['sh', 'ch', 'th'] },
  { id: 'en-consonant-blend', language: 'english', strand: 'decoding', prerequisites: ['en-basic-code'], order: 8, examples: ['st', 'bl', 'gr'] },
  { id: 'en-silent-e', language: 'english', strand: 'spelling', prerequisites: ['en-short-vowel'], order: 9, examples: ['cake', 'smile'] },
  { id: 'en-vowel-team', language: 'english', strand: 'spelling', prerequisites: ['en-short-vowel'], order: 10, examples: ['ee', 'oa', 'ai'] },
  { id: 'en-r-controlled', language: 'english', strand: 'spelling', prerequisites: ['en-short-vowel'], order: 11, examples: ['ar', 'er', 'or'] }
];

const skillIds = new Set(skillDefinitions.map((skill) => skill.id));

export const skillDefinitionById = new Map(skillDefinitions.map((skill) => [skill.id, skill]));

export interface SkillActivityCoverage {
  recognition: readonly LanguageActivityKind[];
  production: readonly LanguageActivityKind[];
  contextual: readonly LanguageActivityKind[];
}

const coverageForStrand: Record<SkillDefinition['strand'], SkillActivityCoverage> = {
  sound: { recognition: ['sound-match'], production: ['word-build'], contextual: ['sentence-complete'] },
  decoding: { recognition: ['sound-match', 'picture-link'], production: ['word-build'], contextual: ['sentence-complete'] },
  spelling: { recognition: ['sentence-complete'], production: ['word-build'], contextual: ['sentence-complete'] },
  vocabulary: { recognition: ['picture-link'], production: ['word-build'], contextual: ['sentence-complete'] },
  sentence: { recognition: ['sentence-complete'], production: ['word-build'], contextual: ['sentence-complete'] },
  comprehension: { recognition: ['picture-link'], production: ['word-build'], contextual: ['sentence-complete'] }
};

export const skillActivityCoverage = new Map(
  skillDefinitions.map((skill) => [skill.id, coverageForStrand[skill.strand]])
);

export const validateSkillActivityCoverage = (): string[] => skillDefinitions.flatMap((skill) => {
  const coverage = skillActivityCoverage.get(skill.id);
  if (!coverage) return [`${skill.id}: activity coverage missing`];
  const errors: string[] = [];
  if (!coverage.recognition.length) errors.push(`${skill.id}: recognition activity missing`);
  if (!coverage.production.length) errors.push(`${skill.id}: production activity missing`);
  if (!coverage.contextual.length) errors.push(`${skill.id}: contextual activity missing`);
  return errors;
});

export const validateSkillGraph = (): string[] => {
  const errors: string[] = [];
  for (const skill of skillDefinitions) {
    for (const prerequisite of skill.prerequisites) {
      if (!skillIds.has(prerequisite)) errors.push(`${skill.id}: unknown prerequisite ${prerequisite}`);
      const prerequisiteOrder = skillDefinitionById.get(prerequisite)?.order ?? -1;
      if (prerequisiteOrder >= skill.order) errors.push(`${skill.id}: prerequisite must come first`);
    }
  }
  return errors;
};

const hasFinalConsonant = (word: string): boolean =>
  Array.from(word.normalize('NFC')).some((letter) => {
    const code = letter.charCodeAt(0) - 0xac00;
    return code >= 0 && code <= 11171 && code % 28 !== 0;
  });

export const koreanSkillIdsFor = (word: string, category: string): string[] => {
  const ids = [
    'ko-meaning-picture', 'ko-category-vocabulary', 'ko-syllable-count',
    'ko-initial-syllable', 'ko-final-syllable', 'ko-basic-consonant', 'ko-basic-vowel'
  ];
  if (hasFinalConsonant(word)) ids.push('ko-final-presence', 'ko-final-consonant');
  if (!category.trim()) return [];
  return ids;
};

const DIGRAPH = /(ch|sh|th|ph|wh|ck|ng)/;
const BLEND = /^(bl|br|cl|cr|dr|fl|fr|gl|gr|pl|pr|sc|sk|sl|sm|sn|sp|st|sw|tr)/;
const VOWEL_TEAM = /(ai|ay|ee|ea|oa|oo|ou|ow|oi|oy)/;
const R_CONTROLLED = /(ar|er|ir|or|ur)/;
const CVC_SYLLABLE = /[bcdfghjklmnpqrstvwxyz][aeiou][bcdfghjklmnpqrstvwxyz]/;

export const englishSkillIdsFor = (word: string, category: string): string[] => {
  const ids = ['en-meaning-picture', 'en-category-vocabulary', 'en-initial-sound', 'en-final-sound', 'en-basic-code'];
  if (CVC_SYLLABLE.test(word)) ids.push('en-cvc', 'en-short-vowel');
  if (DIGRAPH.test(word)) ids.push('en-digraph');
  if (BLEND.test(word)) ids.push('en-consonant-blend');
  if (/[^aeiou]e$/.test(word) && word.length <= 6) ids.push('en-silent-e');
  if (VOWEL_TEAM.test(word)) ids.push('en-vowel-team');
  if (R_CONTROLLED.test(word)) ids.push('en-r-controlled');
  if (!category.trim()) return [];
  return ids;
};

const maxOrderByDifficulty: Record<'korean' | 'english', Record<Difficulty, number>> = {
  korean: { easy: 4, normal: 6, hard: 8, challenge: 8 },
  english: { easy: 6, normal: 8, hard: 11, challenge: 11 }
};

export const skillsForLearningRange = (
  language: 'korean' | 'english',
  difficulty: Difficulty
): SkillDefinition[] => skillDefinitions.filter(
  (skill) => skill.language === language && skill.order <= maxOrderByDifficulty[language][difficulty]
);
