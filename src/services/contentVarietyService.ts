import { SeededRandom, type RandomSource } from './randomService';

export type ContentSectionId =
  | 'math'
  | 'korean'
  | 'english'
  | 'memory'
  | 'story'
  | 'sudoku'
  | 'balance'
  | 'number-path'
  | 'block-garden';

export interface GenerationRequest {
  sectionId: ContentSectionId;
  variant: string;
  daily?: boolean;
  dateKey?: string;
}

export interface GenerationIssue {
  key: string;
  sectionId: ContentSectionId;
  variant: string;
  seed: string;
  daily: boolean;
  dateKey?: string;
  excludedFingerprints: string[];
}

interface StoredDailyIssue {
  key: string;
  dateKey: string;
  excludedFingerprints: string[];
}

export interface VarietyState {
  schemaVersion: 1;
  recentByVariant: Record<string, string[]>;
  dailyIssues: StoredDailyIssue[];
}

export const CONTENT_VARIETY_STORAGE_KEY = 'numbercal.content-variety.v1';
const MAX_RECENT_PER_VARIANT = 100;
const MAX_DAILY_DATES = 30;

const EMPTY_STATE: VarietyState = { schemaVersion: 1, recentByVariant: {}, dailyIssues: [] };
let memoryState: VarietyState = EMPTY_STATE;

export const localDateKey = (date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const hashContentSeed = (value: string): number => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0 || 1;
};

const variantKey = (sectionId: ContentSectionId, variant: string): string => `${sectionId}:${variant}`;
const dailyKey = (sectionId: ContentSectionId, variant: string, dateKey: string): string =>
  `${sectionId}:${variant}:${dateKey}`;

const safeStrings = (value: unknown, limit: number): string[] => Array.isArray(value)
  ? [...new Set(value.filter((item): item is string => typeof item === 'string' && item.length <= 500))].slice(0, limit)
  : [];

const normalizeState = (value: unknown): VarietyState => {
  if (!value || typeof value !== 'object' || (value as Partial<VarietyState>).schemaVersion !== 1) return EMPTY_STATE;
  const parsed = value as Partial<VarietyState>;
  const recentByVariant: Record<string, string[]> = {};
  if (parsed.recentByVariant && typeof parsed.recentByVariant === 'object') {
    Object.entries(parsed.recentByVariant).forEach(([key, fingerprints]) => {
      if (key.length <= 160) recentByVariant[key] = safeStrings(fingerprints, MAX_RECENT_PER_VARIANT);
    });
  }
  const dailyIssues = Array.isArray(parsed.dailyIssues) ? parsed.dailyIssues.flatMap((raw) => {
    if (!raw || typeof raw !== 'object') return [];
    const issue = raw as Partial<StoredDailyIssue>;
    if (typeof issue.key !== 'string' || typeof issue.dateKey !== 'string') return [];
    return [{
      key: issue.key,
      dateKey: issue.dateKey,
      excludedFingerprints: safeStrings(issue.excludedFingerprints, MAX_RECENT_PER_VARIANT)
    } satisfies StoredDailyIssue];
  }) : [];
  const retainedDates = [...new Set(dailyIssues.map((issue) => issue.dateKey))].sort().slice(-MAX_DAILY_DATES);
  return { schemaVersion: 1, recentByVariant, dailyIssues: dailyIssues.filter((issue) => retainedDates.includes(issue.dateKey)) };
};

export const loadVarietyState = (): VarietyState => {
  try {
    const raw = localStorage.getItem(CONTENT_VARIETY_STORAGE_KEY);
    if (!raw) return memoryState;
    memoryState = normalizeState(JSON.parse(raw));
  } catch {
    // 저장소를 사용할 수 없어도 현재 실행 중인 다양성 기록은 유지한다.
  }
  return memoryState;
};

const storeState = (state: VarietyState): boolean => {
  memoryState = state;
  try {
    localStorage.setItem(CONTENT_VARIETY_STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
};

const freshSeed = (): string => globalThis.crypto.randomUUID();

export const createGenerationIssue = (request: GenerationRequest): GenerationIssue => {
  const state = loadVarietyState();
  const key = variantKey(request.sectionId, request.variant);
  const exclusions = state.recentByVariant[key] ?? [];
  if (!request.daily) {
    const seed = freshSeed();
    return {
      key: `${key}:${seed}`,
      sectionId: request.sectionId,
      variant: request.variant,
      seed,
      daily: false,
      excludedFingerprints: [...exclusions]
    };
  }
  const dateKey = request.dateKey ?? localDateKey();
  const issueKey = dailyKey(request.sectionId, request.variant, dateKey);
  const stored = state.dailyIssues.find((issue) => issue.key === issueKey);
  if (stored) return {
    key: issueKey,
    sectionId: request.sectionId,
    variant: request.variant,
    seed: `daily:${issueKey}:v1`,
    daily: true,
    dateKey,
    excludedFingerprints: [...stored.excludedFingerprints]
  };
  const issue: StoredDailyIssue = {
    key: issueKey,
    dateKey,
    excludedFingerprints: [...exclusions]
  };
  storeState({ ...state, dailyIssues: [...state.dailyIssues, issue] });
  return {
    key: issueKey,
    sectionId: request.sectionId,
    variant: request.variant,
    seed: `daily:${issueKey}:v1`,
    daily: true,
    dateKey,
    excludedFingerprints: [...exclusions]
  };
};

export const randomForIssue = (issue: GenerationIssue): RandomSource =>
  new SeededRandom(hashContentSeed(issue.seed));

export const recordIssuedFingerprints = (
  issue: GenerationIssue,
  fingerprints: readonly string[]
): { state: VarietyState; saved: boolean } => {
  const state = loadVarietyState();
  const key = variantKey(issue.sectionId, issue.variant);
  const unique = safeStrings(fingerprints, 30);
  const recent = [...(state.recentByVariant[key] ?? []).filter((item) => !unique.includes(item)), ...unique]
    .slice(-MAX_RECENT_PER_VARIANT);
  const next: VarietyState = {
    schemaVersion: 1,
    recentByVariant: { ...state.recentByVariant, [key]: recent },
    dailyIssues: state.dailyIssues
  };
  return { state: next, saved: storeState(next) };
};

export const resetVarietyMemory = (): void => {
  memoryState = EMPTY_STATE;
};
