import { DEFAULT_CONFIG } from '../domain/difficulty';
import type { Settings, StoredHistory, SessionSummary, SessionConfig, Mode, Subject } from '../domain/types';

const SETTINGS_KEY = 'numbercal.settings.v1';
const HISTORY_KEY = 'numbercal.history.v1';

export const DEFAULT_SETTINGS: Settings = {
  schemaVersion: 1,
  sound: true,
  tts: true,
  animations: true,
  lastConfig: DEFAULT_CONFIG
};

const subjects: Subject[] = ['math', 'korean', 'english'];
const modes: Mode[] = ['math-add', 'math-subtract', 'math-multiply', 'ko-fill', 'ko-listen', 'en-fill', 'en-listen'];

const modeMatchesSubject = (mode: Mode, subject: Subject): boolean =>
  (subject === 'math' && mode.startsWith('math-'))
  || (subject === 'korean' && mode.startsWith('ko-'))
  || (subject === 'english' && mode.startsWith('en-'));

const isConfig = (value: unknown): value is SessionConfig => {
  if (!value || typeof value !== 'object') return false;
  const config = value as Partial<SessionConfig>;
  return subjects.includes(config.subject as Subject)
    && modes.includes(config.mode as Mode)
    && modeMatchesSubject(config.mode as Mode, config.subject as Subject)
    && ['sprout', 'easy', 'normal', 'hard', 'challenge'].includes(config.difficulty ?? '')
    && [5, 10, 20].includes(config.length ?? 0)
    && ['untimed', 'relaxed', 'normal', 'fast'].includes(config.pace ?? '');
};

const isNonNegativeInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0;

const isSummary = (value: unknown): value is SessionSummary => {
  if (!value || typeof value !== 'object') return false;
  const summary = value as Partial<SessionSummary>;
  if (typeof summary.id !== 'string' || !summary.id.trim() || typeof summary.completedAt !== 'string') return false;
  if (Number.isNaN(Date.parse(summary.completedAt)) || !isConfig(summary.config)) return false;
  if (!isNonNegativeInteger(summary.correctCount) || !isNonNegativeInteger(summary.incorrectCount)
    || !isNonNegativeInteger(summary.timeoutCount) || !isNonNegativeInteger(summary.totalCount)) return false;
  if (summary.totalCount < 1 || summary.correctCount + summary.incorrectCount + summary.timeoutCount !== summary.totalCount) return false;
  return typeof summary.averageResponseMs === 'number'
    && Number.isFinite(summary.averageResponseMs)
    && summary.averageResponseMs >= 0;
};

export const loadSettings = (): Settings => {
  try {
    const parsed = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? 'null') as Partial<Settings> | null;
    if (!parsed || parsed.schemaVersion !== 1) return DEFAULT_SETTINGS;
    return {
      schemaVersion: 1,
      sound: typeof parsed.sound === 'boolean' ? parsed.sound : true,
      tts: typeof parsed.tts === 'boolean' ? parsed.tts : true,
      animations: typeof parsed.animations === 'boolean' ? parsed.animations : true,
      lastConfig: isConfig(parsed.lastConfig) ? parsed.lastConfig : DEFAULT_CONFIG
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
};

export const saveSettings = (settings: Settings): boolean => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
};

export const loadHistory = (): SessionSummary[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? 'null') as StoredHistory | null;
    if (!parsed || parsed.schemaVersion !== 1 || !Array.isArray(parsed.sessions)) return [];
    return parsed.sessions.filter(isSummary).slice(0, 20);
  } catch {
    return [];
  }
};

export const saveSession = (
  summary: SessionSummary,
  previous: readonly SessionSummary[]
): { history: SessionSummary[]; saved: boolean } => {
  const sessions = [summary, ...previous.filter((item) => item.id !== summary.id)].slice(0, 20);
  try {
    const stored: StoredHistory = { schemaVersion: 1, sessions };
    localStorage.setItem(HISTORY_KEY, JSON.stringify(stored));
    return { history: sessions, saved: true };
  } catch {
    // 학습 흐름은 저장 실패와 무관하게 계속된다.
    return { history: sessions, saved: false };
  }
};

export const clearHistory = (): boolean => {
  try {
    localStorage.removeItem(HISTORY_KEY);
    return true;
  } catch {
    return false;
  }
};
