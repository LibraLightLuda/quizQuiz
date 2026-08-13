import type { AppState, Screen } from './appState';
import type { AnswerRecord, Question, Resolution, SessionConfig, SessionSummary, Settings, Subject, Mode } from '../domain/types';
import { createId } from '../services/randomService';
import { modesForSubject } from '../domain/difficulty';

export type AppAction =
  | { type: 'GO_HOME' }
  | { type: 'OPEN_SETTINGS'; from: Screen }
  | { type: 'CLOSE_SETTINGS' }
  | { type: 'SELECT_SUBJECT'; subject: Subject }
  | { type: 'SELECT_MODE'; mode: Mode }
  | { type: 'UPDATE_CONFIG'; patch: Partial<SessionConfig> }
  | { type: 'UPDATE_SETTINGS'; settings: Settings }
  | { type: 'CLEAR_HISTORY' }
  | { type: 'START_SESSION'; question: Question; config: SessionConfig }
  | { type: 'REPLACE_QUESTION'; questionId: string; question: Question; config: SessionConfig }
  | { type: 'READY'; questionId: string; now: number; limitMs: number | null }
  | { type: 'RESOLVE'; questionId: string; optionId: string | null; now: number; deadlineExpired?: boolean; praise: string; gentle: string }
  | { type: 'ADVANCE'; questionId: string; nextQuestion: Question | null; summary?: SessionSummary }
  | { type: 'PAUSE'; now: number }
  | { type: 'RESUME'; now: number }
  | { type: 'ABORT_SESSION' }
  | { type: 'SESSION_ERROR' }
  | { type: 'RESTORE_HISTORY'; history: SessionSummary[] };

export const createInitialState = (settings: Settings, history: SessionSummary[]): AppState => ({
  screen: 'home', returnScreen: 'home', settings, history,
  draftConfig: settings.lastConfig, session: null, latestResult: null
});

const resolve = (state: AppState, action: Extract<AppAction, { type: 'RESOLVE' }>): AppState => {
  const session = state.session;
  if (!session || session.questionStatus !== 'answering' || session.paused || session.currentQuestion.id !== action.questionId) return state;

  const timedOut = action.deadlineExpired === true || (session.deadline !== null && action.now > session.deadline);
  const correct = !timedOut && action.optionId === session.currentQuestion.correctOptionId;
  const resolution: Resolution = timedOut ? 'timeout' : correct ? 'correct' : 'incorrect';
  const answer: AnswerRecord = {
    questionId: session.currentQuestion.id,
    questionSignature: session.currentQuestion.signature,
    selectedOptionId: timedOut ? null : action.optionId,
    correctOptionId: session.currentQuestion.correctOptionId,
    resolution,
    responseMs: Math.max(0, Math.round(session.elapsedMs + action.now - (session.startedAt ?? action.now))),
    answeredAt: new Date().toISOString()
  };
  const streak = correct ? session.streak + 1 : 0;
  const special = correct && ([3, 5].includes(streak) || (streak >= 10 && streak % 5 === 0))
    ? ` ⭐ ${streak}문제 연속 성공!`
    : '';
  const feedbackText = timedOut ? '시간이 다 되었어요. 정답을 같이 볼까요?' : correct ? `${action.praise}${special}` : action.gentle;

  return {
    ...state,
    session: {
      ...session, questionStatus: 'feedback', answers: [...session.answers, answer], streak,
      selectedOptionId: timedOut ? null : action.optionId, resolution, feedbackText, deadline: null
    }
  };
};

export const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'GO_HOME': return { ...state, screen: 'home', session: null, latestResult: null };
    case 'OPEN_SETTINGS': return { ...state, screen: 'settings', returnScreen: action.from };
    case 'CLOSE_SETTINGS': return { ...state, screen: state.returnScreen };
    case 'SELECT_SUBJECT': {
      const availableModes = modesForSubject(action.subject);
      const mode = state.draftConfig.subject === action.subject && availableModes.includes(state.draftConfig.mode)
        ? state.draftConfig.mode
        : availableModes[0];
      return { ...state, screen: 'mode', draftConfig: { ...state.draftConfig, subject: action.subject, mode } };
    }
    case 'SELECT_MODE': return { ...state, screen: 'setup', draftConfig: { ...state.draftConfig, mode: action.mode } };
    case 'UPDATE_CONFIG': return { ...state, draftConfig: { ...state.draftConfig, ...action.patch } };
    case 'UPDATE_SETTINGS': return { ...state, settings: action.settings };
    case 'CLEAR_HISTORY': return { ...state, history: [] };
    case 'RESTORE_HISTORY': return { ...state, history: action.history };
    case 'START_SESSION': return {
      ...state,
      screen: 'session',
      latestResult: null,
      session: {
        id: createId('session'), config: action.config, questionIndex: 0, currentQuestion: action.question,
        questionStatus: 'presenting', answers: [], recentSignatures: [action.question.signature], recentAnswers: [],
        recentCorrectIndices: [],
        streak: 0, selectedOptionId: null, resolution: null, feedbackText: '', startedAt: null, elapsedMs: 0,
        deadline: null, limitMs: null, remainingMs: null, paused: false
      }
    };
    case 'REPLACE_QUESTION': {
      const session = state.session;
      if (!session || session.currentQuestion.id !== action.questionId || session.questionStatus === 'feedback') return state;
      return {
        ...state,
        draftConfig: action.config,
        session: {
          ...session, config: action.config, currentQuestion: action.question, questionStatus: 'presenting',
          selectedOptionId: null, resolution: null, feedbackText: '', startedAt: null, elapsedMs: 0,
          deadline: null, limitMs: null, remainingMs: null, paused: false,
          recentSignatures: [...session.recentSignatures.slice(0, -1), action.question.signature]
        }
      };
    }
    case 'READY': {
      const session = state.session;
      if (!session || session.questionStatus !== 'presenting' || session.currentQuestion.id !== action.questionId) return state;
      if (session.paused) return state;
      return { ...state, session: { ...session, questionStatus: 'answering', startedAt: action.now, elapsedMs: 0, limitMs: action.limitMs, remainingMs: action.limitMs, deadline: action.limitMs === null ? null : action.now + action.limitMs } };
    }
    case 'RESOLVE': return resolve(state, action);
    case 'ADVANCE': {
      const session = state.session;
      if (!session || session.questionStatus !== 'feedback' || session.currentQuestion.id !== action.questionId) return state;
      if (!action.nextQuestion && action.summary) {
        return { ...state, screen: 'result', session: null, latestResult: action.summary };
      }
      if (!action.nextQuestion) return state;
      const previousAnswer = Number(session.currentQuestion.metadata?.answer);
      const previousCorrectIndex = session.currentQuestion.options.findIndex(
        (option) => option.id === session.currentQuestion.correctOptionId
      );
      return {
        ...state,
        session: {
          ...session, questionIndex: session.questionIndex + 1, currentQuestion: action.nextQuestion,
          questionStatus: 'presenting', selectedOptionId: null, resolution: null, feedbackText: '', startedAt: null, elapsedMs: 0,
          deadline: null, limitMs: null, remainingMs: null, paused: false,
          recentSignatures: [...session.recentSignatures, action.nextQuestion.signature].slice(-8),
          recentAnswers: Number.isFinite(previousAnswer) ? [...session.recentAnswers, previousAnswer].slice(-2) : session.recentAnswers,
          recentCorrectIndices: [...session.recentCorrectIndices, previousCorrectIndex].slice(-2)
        }
      };
    }
    case 'PAUSE': {
      const session = state.session;
      if (!session || session.paused) return state;
      const remainingMs = session.deadline === null ? null : Math.max(0, session.deadline - action.now);
      const elapsedMs = session.questionStatus === 'answering' && session.startedAt !== null
        ? session.elapsedMs + Math.max(0, action.now - session.startedAt)
        : session.elapsedMs;
      return { ...state, session: { ...session, paused: true, elapsedMs, remainingMs, deadline: null } };
    }
    case 'RESUME': {
      const session = state.session;
      if (!session || !session.paused) return state;
      return { ...state, session: { ...session, paused: false, startedAt: session.questionStatus === 'answering' ? action.now : session.startedAt, deadline: session.questionStatus === 'answering' && session.remainingMs !== null ? action.now + session.remainingMs : null } };
    }
    case 'ABORT_SESSION': return { ...state, screen: 'home', session: null };
    case 'SESSION_ERROR': return { ...state, screen: 'setup', session: null };
    default: return state;
  }
};
