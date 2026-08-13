export type Subject = 'math' | 'korean' | 'english';
export type Difficulty = 'easy' | 'normal' | 'hard' | 'challenge';
export type Mode =
  | 'math-add'
  | 'math-subtract'
  | 'math-multiply'
  | 'math-mixed'
  | 'ko-fill'
  | 'ko-listen'
  | 'en-fill'
  | 'en-listen';
export type QuestionKind = 'math' | 'fill' | 'listening';
export type Resolution = 'correct' | 'incorrect' | 'timeout';
export type QuestionStatus = 'presenting' | 'answering' | 'feedback' | 'advancing';

export interface Option {
  id: string;
  label: string;
  value: string | number;
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
  speech?: { text: string; lang: 'ko-KR' | 'en-US' };
  options: Option[];
  correctOptionId: string;
  explanation: string;
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
  ttsLang: 'en-US';
}

export interface SessionConfig {
  subject: Subject;
  mode: Mode;
  difficulty: Difficulty;
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
  tts: boolean;
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
}

export interface StoredHistory {
  schemaVersion: 1;
  sessions: SessionSummary[];
}
