import type { AnswerRecord, Question, QuestionStatus, SessionConfig, SessionSummary, Settings } from '../domain/types';

export type Screen = 'home' | 'mode' | 'setup' | 'session' | 'result' | 'settings';

export interface ReviewItem {
  questionId: string;
  prompt: string;
  selectedAnswer: string | null;
  correctAnswer: string;
  explanation: string;
  resolution: 'incorrect' | 'timeout';
}

export interface ActiveSession {
  id: string;
  config: SessionConfig;
  questionIndex: number;
  currentQuestion: Question;
  questionStatus: QuestionStatus;
  answers: AnswerRecord[];
  reviewItems: ReviewItem[];
  recentSignatures: string[];
  recentAnswers: number[];
  recentCorrectIndices: number[];
  streak: number;
  selectedOptionId: string | null;
  resolution: AnswerRecord['resolution'] | null;
  feedbackText: string;
  startedAt: number | null;
  elapsedMs: number;
  deadline: number | null;
  limitMs: number | null;
  remainingMs: number | null;
  paused: boolean;
}

export interface AppState {
  screen: Screen;
  returnScreen: Screen;
  settings: Settings;
  history: SessionSummary[];
  draftConfig: SessionConfig;
  session: ActiveSession | null;
  latestResult: SessionSummary | null;
  latestReview: ReviewItem[];
}
