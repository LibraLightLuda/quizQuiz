export type Subject = 'math' | 'korean' | 'english';
export type Difficulty = 'easy' | 'normal' | 'hard' | 'challenge';
export type Mode =
  | 'math-add'
  | 'math-subtract'
  | 'math-multiply'
  | 'math-mixed'
  | 'ko-fill'
  | 'ko-listen'
  | 'ko-adventure'
  | 'en-fill'
  | 'en-listen'
  | 'en-adventure';
export type LanguageMode = 'ko-fill' | 'ko-listen' | 'ko-adventure' | 'en-fill' | 'en-listen' | 'en-adventure';
export type LanguageMasteryStage = 'new' | 'learning' | 'almost' | 'mastered' | 'review';
export type SessionLength = 5 | 15;
export type LearningTheme = 'animals' | 'food' | 'nature';
export type SpeechRate = 0.75 | 0.85 | 0.95;
export type LessonPhase = 'welcome' | 'discover' | 'review' | 'story';
export type SkillLanguage = 'korean' | 'english' | 'shared';
export type SkillStrand = 'sound' | 'decoding' | 'spelling' | 'vocabulary' | 'sentence' | 'comprehension';
export type QuestionKind = 'math' | 'fill' | 'listening';
export type LanguageActivityKind = 'sound-match' | 'word-build' | 'picture-link' | 'sentence-complete';
export type Resolution = 'correct' | 'incorrect' | 'timeout';
export type QuestionStatus = 'presenting' | 'answering' | 'feedback' | 'advancing';

export interface Option {
  id: string;
  label: string;
  value: string | number;
}

export interface LanguageTile {
  id: string;
  label: string;
  value: string;
}

export interface LanguageActivityPayload {
  kind: LanguageActivityKind;
  title: string;
  instruction: string;
  optionStyle: 'sound' | 'tiles' | 'pictures' | 'sentence';
  optionWordIds?: Record<string, string>;
  tiles?: LanguageTile[];
  targetTileCount?: number;
  hintSteps?: string[];
}
export interface Question {
  id: string;
  signature: string;
  subject: Subject;
  mode: Mode;
  difficulty: Difficulty;
  kind: QuestionKind;
  prompt: string;
  hint?: string;
  speech?: {
    text: string;
    lang: 'ko-KR' | 'en-US';
    /** 긴 문장을 다시 들을 때만 느린 속도를 선택할 수 있다. */
    slowReplay?: boolean;
  };
  options: Option[];
  correctOptionId: string;
  explanation: string;
  activity?: LanguageActivityPayload;
  metadata?: Record<string, unknown>;
}

export interface MaskRange {
  start: number;
  length: number;
}

export interface KoreanWord {
  id: string;
  word: string;
  difficulty: Difficulty;
  category: string;
  hintKo: string;
  emoji?: string;
  maskRanges: MaskRange[];
  distractorChunks?: string[];
  skillIds: string[];
  ttsLang: 'ko-KR';
}

export interface EnglishWord {
  id: string;
  word: string;
  meaningKo: string;
  difficulty: Difficulty;
  category: string;
  maskRanges: MaskRange[];
  distractorChunks?: string[];
  phonicsSkills: string[];
  skillIds: string[];
  ttsLang: 'en-US';
}

export interface SkillDefinition {
  id: string;
  language: SkillLanguage;
  strand: SkillStrand;
  prerequisites: string[];
  order: number;
  examples: string[];
}

export interface SkillMastery {
  skillId: string;
  attempts: number;
  independentCorrect: number;
  supportedCorrect: number;
  recentAccuracy: number;
  hintRate: number;
  lastSeenAt: string;
  nextReviewAt: string;
  confidence: number;
  recentIndependent: boolean[];
}

export interface StoredSkillMastery {
  schemaVersion: 2;
  entries: SkillMastery[];
  migratedFromWordMastery: boolean;
}
export interface LanguageMasteryEntry {
  key: string;
  wordId: string;
  mode: LanguageMode;
  stage: LanguageMasteryStage;
  attempts: number;
  correctCount: number;
  correctStreak: number;
  averageResponseMs: number;
  lastSeenAt: string;
  nextReviewAt: string;
}

export interface StoredLanguageMastery {
  schemaVersion: 1;
  entries: LanguageMasteryEntry[];
}

export interface SessionConfig {
  subject: Subject;
  mode: Mode;
  difficulty: Difficulty;
  length: SessionLength;
  theme: LearningTheme;
}

export interface AnswerRecord {
  questionId: string;
  questionSignature: string;
  selectedOptionId: string | null;
  correctOptionId: string;
  resolution: Resolution;
  responseMs: number;
  answeredAt: string;
}

export interface Settings {
  schemaVersion: 1;
  sound: boolean;
  haptics: boolean;
  tts: boolean;
  speechRate: SpeechRate;
  animations: boolean;
  lastConfig: SessionConfig;
}

export interface SessionSummary {
  id: string;
  completedAt: string;
  config: SessionConfig;
  correctCount: number;
  incorrectCount: number;
  timeoutCount: number;
  totalCount: number;
  averageResponseMs: number;
  discoveredWords?: string[];
}

export interface StoredHistory {
  schemaVersion: 1;
  sessions: SessionSummary[];
}
