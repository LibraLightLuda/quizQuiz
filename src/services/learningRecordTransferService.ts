import { LEARNING_RECORD_KEYS, type LearningRecordKey } from './storageService';

const TRANSFER_SCHEMA_VERSION = 1 as const;
const MAX_TRANSFER_BYTES = 2_000_000;

type LearningRecordValues = Record<LearningRecordKey, Record<string, unknown> | null>;

export interface LearningRecordTransfer {
  kind: 'numbercal-learning-records';
  schemaVersion: typeof TRANSFER_SCHEMA_VERSION;
  exportedAt: string;
  records: LearningRecordValues;
}

export interface LearningRecordPreview {
  exportedAt: string;
  sections: number;
  recentSessions: number;
  languageEntries: number;
  skillEntries: number;
}

export type TransferParseResult =
  | { ok: true; transfer: LearningRecordTransfer; preview: LearningRecordPreview }
  | { ok: false; message: string };

const expectedRecordSchema: Record<LearningRecordKey, number | readonly number[]> = {
  'numbercal.history.v1': 1,
  'numbercal.language-mastery.v1': 1,
  'numbercal.skill-mastery.v2': 2,
  'numbercal.sudoku.records.v1': 1,
  'numbercal.memory.records.v1': 1,
  'numbercal.story.records.v1': 1,
  'numbercal.balance.records.v1': 1,
  'numbercal.number-path.records.v1': [1, 2],
  'numbercal.block-garden.records.v1': 1,
  'numbercal.growth.v1': 1
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const hasExpectedSchema = (key: LearningRecordKey, value: Record<string, unknown>): boolean => {
  const expected = expectedRecordSchema[key];
  return Array.isArray(expected) ? expected.includes(value.schemaVersion as number) : value.schemaVersion === expected;
};

const entryCount = (value: Record<string, unknown> | null, field: 'sessions' | 'entries'): number =>
  Array.isArray(value?.[field]) ? value[field].length : 0;

const isTransfer = (value: unknown): value is LearningRecordTransfer => {
  if (!isRecord(value) || value.kind !== 'numbercal-learning-records' || value.schemaVersion !== TRANSFER_SCHEMA_VERSION
    || typeof value.exportedAt !== 'string' || Number.isNaN(Date.parse(value.exportedAt)) || !isRecord(value.records)) return false;
  const records = value.records as Record<string, unknown>;
  if (Object.keys(records).some((key) => !LEARNING_RECORD_KEYS.includes(key as LearningRecordKey))) return false;
  const legacyOptional = new Set<LearningRecordKey>(['numbercal.block-garden.records.v1', 'numbercal.growth.v1']);
  if (LEARNING_RECORD_KEYS.some((key) => !legacyOptional.has(key) && !(key in records))) return false;
  legacyOptional.forEach((key) => { if (!(key in records)) records[key] = null; });
  return LEARNING_RECORD_KEYS.every((key) => {
    const record = records[key];
    return record === null || (isRecord(record) && hasExpectedSchema(key, record));
  });
};

const readRecord = (key: LearningRecordKey): Record<string, unknown> | null => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    return isRecord(value) && hasExpectedSchema(key, value) ? value : null;
  } catch {
    return null;
  }
};

export const createLearningRecordTransfer = (now = new Date()): LearningRecordTransfer => ({
  kind: 'numbercal-learning-records',
  schemaVersion: TRANSFER_SCHEMA_VERSION,
  exportedAt: now.toISOString(),
  records: Object.fromEntries(LEARNING_RECORD_KEYS.map((key) => [key, readRecord(key)])) as LearningRecordValues
});

export const serializeLearningRecordTransfer = (now = new Date()): string =>
  JSON.stringify(createLearningRecordTransfer(now), null, 2);

export const previewLearningRecordTransfer = (transfer: LearningRecordTransfer): LearningRecordPreview => {
  const values = Object.values(transfer.records);
  return {
    exportedAt: transfer.exportedAt,
    sections: values.filter(Boolean).length,
    recentSessions: entryCount(transfer.records['numbercal.history.v1'], 'sessions'),
    languageEntries: entryCount(transfer.records['numbercal.language-mastery.v1'], 'entries'),
    skillEntries: entryCount(transfer.records['numbercal.skill-mastery.v2'], 'entries')
  };
};

export const parseLearningRecordTransfer = (text: string): TransferParseResult => {
  if (!text.trim()) return { ok: false, message: '비어 있는 파일이에요.' };
  if (new Blob([text]).size > MAX_TRANSFER_BYTES) return { ok: false, message: '기록 파일이 너무 커서 열 수 없어요.' };
  try {
    const value: unknown = JSON.parse(text);
    if (!isTransfer(value)) return { ok: false, message: 'NumberCal 학습 기록 파일 형식이 아니에요.' };
    return { ok: true, transfer: value, preview: previewLearningRecordTransfer(value) };
  } catch {
    return { ok: false, message: '파일 내용을 읽을 수 없어요.' };
  }
};

export const restoreLearningRecordTransfer = (transfer: LearningRecordTransfer): boolean => {
  const previous = new Map<LearningRecordKey, string | null>();
  try {
    LEARNING_RECORD_KEYS.forEach((key) => previous.set(key, localStorage.getItem(key)));
    LEARNING_RECORD_KEYS.forEach((key) => {
      const value = transfer.records[key];
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, JSON.stringify(value));
    });
    return true;
  } catch {
    try {
      LEARNING_RECORD_KEYS.forEach((key) => {
        const value = previous.get(key) ?? null;
        if (value === null) localStorage.removeItem(key);
        else localStorage.setItem(key, value);
      });
    } catch {
      // 브라우저 저장소가 막힌 경우에도 앱은 현재 메모리 상태로 계속 실행한다.
    }
    return false;
  }
};
