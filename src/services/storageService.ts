import { DEFAULT_CONFIG } from '../domain/difficulty';
import type { Settings, StoredHistory, SessionSummary, SessionConfig, Mode, Subject, SessionLength, LearningTheme, SpeechRate } from '../domain/types';

const SETTINGS_KEY = 'numbercal.settings.v1';
export const LEARNING_RECORD_KEYS = [
  'numbercal.history.v1',
  'numbercal.language-mastery.v1',
  'numbercal.skill-mastery.v2',
  'numbercal.sudoku.records.v1',
  'numbercal.memory.records.v1',
  'numbercal.story.records.v1',
  'numbercal.balance.records.v1',
  'numbercal.number-path.records.v1',
  'numbercal.shape-block.records.v1'
] as const;
export type LearningRecordKey = typeof LEARNING_RECORD_KEYS[number];
const HISTORY_KEY: LearningRecordKey = LEARNING_RECORD_KEYS[0];
const GAME_RECORD_KEYS = LEARNING_RECORD_KEYS.slice(1);

export const DEFAULT_SETTINGS: Settings = {
  schemaVersion: 1,
  sound: true,
  haptics: true,
  tts: true,
  speechRate: 0.85,
  animations: true,
  lastConfig: DEFAULT_CONFIG
};

const subjects: Subject[] = ['math', 'korean', 'english'];
const modes: Mode[] = ['math-add', 'math-subtract', 'math-multiply', 'math-mixed', 'ko-fill', 'ko-listen', 'ko-adventure', 'en-fill', 'en-listen', 'en-adventure'];
const sessionLengths: SessionLength[] = [5, 15];
const learningThemes: LearningTheme[] = ['animals', 'food', 'nature'];
const speechRates: SpeechRate[] = [0.75, 0.85, 0.95];

const modeMatchesSubject = (mode: Mode, subject: Subject): boolean =>
  (subject === 'math' && mode.startsWith('math-'))
  || (subject === 'korean' && mode.startsWith('ko-'))
  || (subject === 'english' && mode.startsWith('en-'));

const normalizeConfig = (value: unknown): SessionConfig | null => {
  if (!value || typeof value !== 'object') return null;
  const config = value as Partial<SessionConfig>;
  const difficulty = (value as { difficulty?: string }).difficulty;
  if (!subjects.includes(config.subject as Subject)
    || !modes.includes(config.mode as Mode)
    || !modeMatchesSubject(config.mode as Mode, config.subject as Subject)
    || !['sprout', 'easy', 'normal', 'hard', 'challenge'].includes(difficulty ?? '')) return null;
  return {
    subject: config.subject as Subject,
    mode: config.mode as Mode,
    difficulty: difficulty === 'sprout' ? 'easy' : difficulty as SessionConfig['difficulty'],
    length: sessionLengths.includes(config.length as SessionLength) ? config.length as SessionLength : 5,
    theme: learningThemes.includes(config.theme as LearningTheme) ? config.theme as LearningTheme : 'animals'
  };
};

const isConfig = (value: unknown): value is SessionConfig => normalizeConfig(value) !== null;

const isNonNegativeInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0;

const isSummary = (value: unknown): value is SessionSummary => {
  if (!value || typeof value !== 'object') return false;
  const summary = value as Partial<SessionSummary>;
  if (typeof summary.id !== 'string' || !summary.id.trim() || typeof summary.completedAt !== 'string') return false;
  if (Number.isNaN(Date.parse(summary.completedAt)) || !isConfig(summary.config)) return false;
  summary.config = normalizeConfig(summary.config)!;
  if (!isNonNegativeInteger(summary.correctCount) || !isNonNegativeInteger(summary.incorrectCount)
    || !isNonNegativeInteger(summary.timeoutCount) || !isNonNegativeInteger(summary.totalCount)) return false;
  if (summary.totalCount < 1 || summary.correctCount + summary.incorrectCount + summary.timeoutCount !== summary.totalCount) return false;
  return typeof summary.averageResponseMs === 'number'
    && Number.isFinite(summary.averageResponseMs)
    && summary.averageResponseMs >= 0
    && (summary.discoveredWords === undefined
      || (Array.isArray(summary.discoveredWords) && summary.discoveredWords.every((word) => typeof word === 'string')));
};

export const loadSettings = (): Settings => {
  try {
    const parsed = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? 'null') as Partial<Settings> | null;
    if (!parsed || parsed.schemaVersion !== 1) return DEFAULT_SETTINGS;
    return {
      schemaVersion: 1,
      sound: typeof parsed.sound === 'boolean' ? parsed.sound : true,
      haptics: typeof parsed.haptics === 'boolean' ? parsed.haptics : true,
      tts: typeof parsed.tts === 'boolean' ? parsed.tts : true,
      speechRate: speechRates.includes(parsed.speechRate as SpeechRate) ? parsed.speechRate as SpeechRate : 0.85,
      animations: typeof parsed.animations === 'boolean' ? parsed.animations : true,
      lastConfig: normalizeConfig(parsed.lastConfig) ?? DEFAULT_CONFIG
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

export const clearAllLearningRecords = (): boolean => {
  try {
    localStorage.removeItem(HISTORY_KEY);
    for (const key of GAME_RECORD_KEYS) localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
};
