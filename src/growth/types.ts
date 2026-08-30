export const GROWTH_SECTION_IDS = [
  'math', 'korean', 'english', 'memory', 'story', 'sudoku', 'balance', 'number-path', 'block-garden'
] as const;

export type GrowthSectionId = typeof GROWTH_SECTION_IDS[number];

export type MedalTier =
  | 'seed'
  | 'sprout'
  | 'leaf'
  | 'bud'
  | 'gold-flower'
  | 'starlight-forest'
  | 'rainbow-forest';

export interface DailyGrowthRecord {
  dateKey: string;
  completedSections: GrowthSectionId[];
  earnedXp: number;
  weeklyBonusXp: number;
}

export interface GrowthState {
  schemaVersion: 1;
  totalXp: number;
  days: DailyGrowthRecord[];
}

export type GrowthAwardReason = 'earned' | 'already-completed' | 'daily-cap';

export interface GrowthAward {
  sectionId: GrowthSectionId;
  dateKey: string;
  baseXp: number;
  weeklyBonusXp: number;
  totalAwardedXp: number;
  reason: GrowthAwardReason;
  dayCompletedCount: number;
  dayAwardedCount: number;
  weeklyActiveDays: number;
  previousLevel: number;
  newLevel: number;
  previousMedal: MedalTier;
  newMedal: MedalTier;
  previousSparkleRank: number;
  newSparkleRank: number;
  totalXp: number;
}

export interface GrowthMutation {
  state: GrowthState;
  award: GrowthAward;
}

export interface GrowthAwardResult {
  award: GrowthAward;
  saved: boolean;
}
