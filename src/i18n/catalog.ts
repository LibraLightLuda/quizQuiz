import type { Difficulty, LanguageActivityKind, LearningTheme, LessonPhase, Mode, Subject } from '../domain/types';
import { difficultyInfo, languageJourneyInfo, learningThemeInfo, modeInfo, subjectInfo } from '../domain/difficulty';
import type { GrowthSectionId, MedalTier } from '../growth/types';
import type { AppLocale } from './locale';

type Localized<T extends string> = Record<T, readonly [korean: string, english: string]>;

const pick = (locale: AppLocale, value: readonly [string, string]): string => value[locale === 'ko' ? 0 : 1];

const phases: Localized<LessonPhase> = {
  welcome: ['반가운 시작', 'Welcome'], discover: ['오늘의 발견', 'Discover'],
  review: ['다시 만난 친구', 'Review'], story: ['이야기 마무리', 'Story finish']
};

const activities: Localized<LanguageActivityKind> = {
  'sound-match': ['소리 찾기', 'Sound Match'], 'word-build': ['낱말 조립', 'Build a Word'],
  'picture-link': ['그림 연결', 'Picture Match'], 'sentence-complete': ['문장 완성', 'Complete the Sentence']
};

const activityInstructions: Localized<LanguageActivityKind> = {
  'sound-match': ['귀를 쫑긋하고 같은 낱말을 톡 눌러요.', 'Listen closely and tap the matching word.'],
  'word-build': ['타일을 순서대로 눌러 낱말을 만들어요.', 'Tap the tiles in order to build the word.'],
  'picture-link': ['그림과 어울리는 낱말을 골라요.', 'Choose the word that matches the picture.'],
  'sentence-complete': ['짧은 문장에 알맞은 낱말을 넣어요.', 'Choose the word that completes the short sentence.']
};

const growthSections: Localized<GrowthSectionId> = {
  math: ['수학', 'Math'], korean: ['한국어', 'Korean'], english: ['영어', 'English'],
  memory: ['기억력', 'Memory'], story: ['이야기', 'Stories'], sudoku: ['스도쿠', 'Sudoku'],
  balance: ['균형 저울', 'Balance'], 'number-path': ['숫자 길찾기', 'Number Path'], 'block-garden': ['빈칸 정원', 'Block Garden']
};

const medals: Localized<MedalTier> = {
  seed: ['씨앗', 'Seed'], sprout: ['새싹', 'Sprout'], leaf: ['푸른잎', 'Green Leaf'], bud: ['꽃봉오리', 'Flower Bud'],
  'gold-flower': ['황금꽃', 'Golden Flower'], 'starlight-forest': ['별빛숲', 'Starlight Forest'],
  'rainbow-forest': ['무지개숲', 'Rainbow Forest']
};

export const subjectLabel = (id: Subject, locale: AppLocale) => pick(locale, [subjectInfo[id].label, subjectInfo[id].labelEn]);
export const subjectDescription = (id: Subject, locale: AppLocale) => pick(locale, [subjectInfo[id].description, subjectInfo[id].descriptionEn]);
export const modeLabel = (id: Mode, locale: AppLocale) => pick(locale, [modeInfo[id].label, modeInfo[id].labelEn]);
export const modeDescription = (id: Mode, locale: AppLocale) => pick(locale, [modeInfo[id].description, modeInfo[id].descriptionEn]);
export const difficultyLabel = (id: Difficulty, locale: AppLocale) => pick(locale, [difficultyInfo[id].label, difficultyInfo[id].labelEn]);
export const journeyLabel = (id: Difficulty, locale: AppLocale) => pick(locale, [languageJourneyInfo[id].label, languageJourneyInfo[id].labelEn]);
export const journeyDetail = (id: Difficulty, locale: AppLocale) => pick(locale, [languageJourneyInfo[id].detail, languageJourneyInfo[id].detailEn]);
export const themeLabel = (id: LearningTheme, locale: AppLocale) => pick(locale, [learningThemeInfo[id].label, learningThemeInfo[id].labelEn]);
export const phaseLabel = (id: LessonPhase, locale: AppLocale) => pick(locale, phases[id]);
export const activityLabel = (id: LanguageActivityKind, locale: AppLocale) => pick(locale, activities[id]);
export const activityInstruction = (id: LanguageActivityKind, locale: AppLocale) => pick(locale, activityInstructions[id]);
export const growthSectionLabel = (id: GrowthSectionId, locale: AppLocale) => pick(locale, growthSections[id]);
export const medalLabel = (id: MedalTier, locale: AppLocale) => pick(locale, medals[id]);
