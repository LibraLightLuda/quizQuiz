export const SHAPE_BLOCK_RECORDS_KEY = 'numbercal.shape-block.records.v1';

export interface ShapeBlockGrowthSummary {
  completedPictures: number;
  totalStars: number;
  dailyChallenges: number;
  lineHighScore: number;
  totalLines: number;
  progress: number;
}

const safeCount = (value: unknown): number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : 0;

export const buildShapeBlockGrowthSummary = (value: unknown): ShapeBlockGrowthSummary => {
  const record = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const stars = record.tangramStars && typeof record.tangramStars === 'object'
    ? Object.values(record.tangramStars as Record<string, unknown>)
      .filter((star): star is number => typeof star === 'number' && Number.isInteger(star) && star >= 1 && star <= 3)
    : [];
  const dailyChallenges = Array.isArray(record.dailyBadges)
    ? new Set(record.dailyBadges.filter((date): date is string => typeof date === 'string')).size
    : 0;
  const completedPictures = stars.length;
  const totalLines = safeCount(record.totalLines);
  return {
    completedPictures,
    totalStars: stars.reduce((sum, star) => sum + star, 0),
    dailyChallenges,
    lineHighScore: safeCount(record.lineHighScore),
    totalLines,
    progress: Math.min(100, Math.round((completedPictures / 30) * 70 + (Math.min(totalLines, 30) / 30) * 30))
  };
};

export const loadShapeBlockGrowthSummary = (): ShapeBlockGrowthSummary => {
  try {
    return buildShapeBlockGrowthSummary(JSON.parse(localStorage.getItem(SHAPE_BLOCK_RECORDS_KEY) ?? 'null'));
  } catch {
    return buildShapeBlockGrowthSummary(null);
  }
};
