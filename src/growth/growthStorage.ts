import { EMPTY_GROWTH_STATE, isGrowthSectionId } from './growthModel';
import type { DailyGrowthRecord, GrowthState } from './types';

export const GROWTH_STORAGE_KEY = 'numbercal.growth.v1';

const isNonNegativeInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0;

const isDateKey = (value: unknown): value is string =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00`));

const normalizeDay = (value: unknown): DailyGrowthRecord | null => {
  if (!value || typeof value !== 'object') return null;
  const day = value as Partial<DailyGrowthRecord>;
  if (!isDateKey(day.dateKey) || !Array.isArray(day.completedSections)
    || !isNonNegativeInteger(day.earnedXp) || !isNonNegativeInteger(day.weeklyBonusXp)) return null;
  const completedSections = [...new Set(day.completedSections.filter(isGrowthSectionId))];
  if (!completedSections.length) return null;
  return {
    dateKey: day.dateKey,
    completedSections,
    earnedXp: Math.min(day.earnedXp, 30),
    weeklyBonusXp: Math.min(day.weeklyBonusXp, 20)
  };
};

export const loadGrowthState = (): GrowthState => {
  try {
    const parsed = JSON.parse(localStorage.getItem(GROWTH_STORAGE_KEY) ?? 'null') as Partial<GrowthState> | null;
    if (!parsed || parsed.schemaVersion !== 1 || !isNonNegativeInteger(parsed.totalXp) || !Array.isArray(parsed.days)) {
      return EMPTY_GROWTH_STATE;
    }
    const byDate = new Map<string, DailyGrowthRecord>();
    parsed.days.forEach((value) => {
      const day = normalizeDay(value);
      if (day) byDate.set(day.dateKey, day);
    });
    return {
      schemaVersion: 1,
      totalXp: parsed.totalXp,
      days: [...byDate.values()].sort((left, right) => left.dateKey.localeCompare(right.dateKey)).slice(-400)
    };
  } catch {
    return EMPTY_GROWTH_STATE;
  }
};

export const saveGrowthState = (state: GrowthState): boolean => {
  try {
    localStorage.setItem(GROWTH_STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
};
