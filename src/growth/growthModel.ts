import {
  GROWTH_SECTION_IDS,
  type DailyGrowthRecord,
  type GrowthMutation,
  type GrowthSectionId,
  type GrowthState,
  type MedalTier
} from './types';

export const DAILY_SECTION_XP = 10;
export const DAILY_SECTION_LIMIT = 3;
export const WEEKLY_ACTIVE_DAY_TARGET = 5;
export const WEEKLY_BONUS_XP = 20;
export const MAX_LEVEL = 30;
export const MAX_LEVEL_XP = 2760;
export const SPARKLE_RANK_XP = 200;

export const LEVEL_XP_THRESHOLDS = [
  0,
  40, 80, 120, 160,
  220, 280, 340, 400, 460,
  540, 620, 700, 780, 860,
  960, 1060, 1160, 1260, 1360,
  1480, 1600, 1720, 1840, 1960,
  2120, 2280, 2440, 2600, 2760
] as const;

export const GROWTH_SECTION_LABELS: Record<GrowthSectionId, string> = {
  math: '수학',
  korean: '한국어',
  english: '영어',
  memory: '기억력',
  story: '이야기',
  sudoku: '스도쿠',
  balance: '균형 저울',
  'number-path': '숫자 길찾기',
  'block-garden': '빈칸 정원'
};

export const GROWTH_SECTION_ICONS: Record<GrowthSectionId, string> = {
  math: '➕',
  korean: '가',
  english: 'A',
  memory: '🧠',
  story: '📖',
  sudoku: '▦',
  balance: '⚖️',
  'number-path': '🧭',
  'block-garden': '🌿'
};

export const MEDAL_INFO: Record<MedalTier, { label: string; icon: string; minimumLevel: number; benefit: string }> = {
  seed: { label: '씨앗 메달', icon: '🌰', minimumLevel: 1, benefit: '성장 숲의 첫 메달' },
  sprout: { label: '새싹 메달', icon: '🌱', minimumLevel: 5, benefit: '새싹 리본과 홈 테두리' },
  leaf: { label: '푸른잎 메달', icon: '🍃', minimumLevel: 10, benefit: '은빛 잎과 결과 반짝임' },
  bud: { label: '꽃봉오리 메달', icon: '🌷', minimumLevel: 15, benefit: '꽃 장식이 피어나는 성장 숲' },
  'gold-flower': { label: '황금꽃 메달', icon: '🌻', minimumLevel: 20, benefit: '황금빛 고리와 모리의 빛' },
  'starlight-forest': { label: '별빛숲 메달', icon: '🌟', minimumLevel: 25, benefit: '별빛 궤도와 풍성한 축하' },
  'rainbow-forest': { label: '무지개숲 메달', icon: '🌈', minimumLevel: 30, benefit: '무지개 왕관과 반짝임 등급' }
};

export const EMPTY_GROWTH_STATE: GrowthState = { schemaVersion: 1, totalXp: 0, days: [] };

export const localDateKey = (date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const dateFromKey = (dateKey: string): Date => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export const weekKeyForDate = (date: Date): string => {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = monday.getDay() || 7;
  monday.setDate(monday.getDate() - day + 1);
  return localDateKey(monday);
};

export const weekKeyForDateKey = (dateKey: string): string => weekKeyForDate(dateFromKey(dateKey));

export const levelForXp = (xp: number): number => {
  const safeXp = Number.isFinite(xp) ? Math.max(0, xp) : 0;
  for (let index = LEVEL_XP_THRESHOLDS.length - 1; index >= 0; index -= 1) {
    if (safeXp >= LEVEL_XP_THRESHOLDS[index]) return index + 1;
  }
  return 1;
};

export const sparkleRankForXp = (xp: number): number =>
  Math.max(0, Math.floor((Math.max(0, xp) - MAX_LEVEL_XP) / SPARKLE_RANK_XP));

export const medalForLevel = (level: number): MedalTier => {
  if (level >= 30) return 'rainbow-forest';
  if (level >= 25) return 'starlight-forest';
  if (level >= 20) return 'gold-flower';
  if (level >= 15) return 'bud';
  if (level >= 10) return 'leaf';
  if (level >= 5) return 'sprout';
  return 'seed';
};

export const levelProgress = (xp: number): { current: number; target: number; percent: number; remaining: number } => {
  const level = levelForXp(xp);
  if (level >= MAX_LEVEL) {
    const current = Math.max(0, xp - MAX_LEVEL_XP) % SPARKLE_RANK_XP;
    return { current, target: SPARKLE_RANK_XP, percent: current / SPARKLE_RANK_XP * 100, remaining: SPARKLE_RANK_XP - current };
  }
  const start = LEVEL_XP_THRESHOLDS[level - 1];
  const targetXp = LEVEL_XP_THRESHOLDS[level];
  const current = xp - start;
  const target = targetXp - start;
  return { current, target, percent: Math.max(0, Math.min(100, current / target * 100)), remaining: target - current };
};

export const currentDayRecord = (state: GrowthState, date = new Date()): DailyGrowthRecord | undefined =>
  state.days.find((day) => day.dateKey === localDateKey(date));

export const activeDaysInWeek = (state: GrowthState, date = new Date()): number => {
  const weekKey = weekKeyForDate(date);
  return state.days.filter((day) => day.completedSections.length > 0 && weekKeyForDateKey(day.dateKey) === weekKey).length;
};

export const recordGrowthCompletion = (
  state: GrowthState,
  sectionId: GrowthSectionId,
  completedAt = new Date()
): GrowthMutation => {
  const dateKey = localDateKey(completedAt);
  const previousLevel = levelForXp(state.totalXp);
  const previousMedal = medalForLevel(previousLevel);
  const previousSparkleRank = sparkleRankForXp(state.totalXp);
  const existingDay = state.days.find((day) => day.dateKey === dateKey);
  const alreadyCompleted = existingDay?.completedSections.includes(sectionId) ?? false;
  const previousCompletedCount = existingDay?.completedSections.length ?? 0;
  const reason = alreadyCompleted ? 'already-completed' : previousCompletedCount >= DAILY_SECTION_LIMIT ? 'daily-cap' : 'earned';
  const baseXp = reason === 'earned' ? DAILY_SECTION_XP : 0;
  const completedSections = alreadyCompleted
    ? existingDay?.completedSections ?? []
    : [...(existingDay?.completedSections ?? []), sectionId];

  const weekKey = weekKeyForDate(completedAt);
  const weekDaysBefore = state.days.filter((day) =>
    day.completedSections.length > 0 && weekKeyForDateKey(day.dateKey) === weekKey
  );
  const isNewActiveDay = !existingDay && completedSections.length > 0;
  const weeklyAlreadyAwarded = weekDaysBefore.some((day) => day.weeklyBonusXp > 0);
  const weeklyBonusXp = isNewActiveDay && weekDaysBefore.length === WEEKLY_ACTIVE_DAY_TARGET - 1 && !weeklyAlreadyAwarded
    ? WEEKLY_BONUS_XP
    : 0;
  const nextDay: DailyGrowthRecord = {
    dateKey,
    completedSections,
    earnedXp: (existingDay?.earnedXp ?? 0) + baseXp,
    weeklyBonusXp: (existingDay?.weeklyBonusXp ?? 0) + weeklyBonusXp
  };
  const days = [
    ...state.days.filter((day) => day.dateKey !== dateKey),
    nextDay
  ].sort((left, right) => left.dateKey.localeCompare(right.dateKey)).slice(-400);
  const totalXp = state.totalXp + baseXp + weeklyBonusXp;
  const nextState: GrowthState = { schemaVersion: 1, totalXp, days };
  const newLevel = levelForXp(totalXp);

  return {
    state: nextState,
    award: {
      sectionId,
      dateKey,
      baseXp,
      weeklyBonusXp,
      totalAwardedXp: baseXp + weeklyBonusXp,
      reason,
      dayCompletedCount: completedSections.length,
      dayAwardedCount: Math.min(completedSections.length, DAILY_SECTION_LIMIT),
      weeklyActiveDays: activeDaysInWeek(nextState, completedAt),
      previousLevel,
      newLevel,
      previousMedal,
      newMedal: medalForLevel(newLevel),
      previousSparkleRank,
      newSparkleRank: sparkleRankForXp(totalXp),
      totalXp
    }
  };
};

export const growthSummaryForState = (state: GrowthState) => {
  const level = levelForXp(state.totalXp);
  return {
    level,
    medal: medalForLevel(level),
    sparkleRank: sparkleRankForXp(state.totalXp),
    progress: levelProgress(state.totalXp)
  };
};

export const isGrowthSectionId = (value: unknown): value is GrowthSectionId =>
  typeof value === 'string' && GROWTH_SECTION_IDS.includes(value as GrowthSectionId);
