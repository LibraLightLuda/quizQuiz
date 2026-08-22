export type MemoryMode = 'math' | 'korean' | 'english' | 'mixed';
export type MemoryDifficulty = 'starter' | 'growing' | 'focus' | 'master';
export type MemoryCategory = 'math' | 'korean' | 'english';

export interface MemoryPair {
  id: string;
  left: string;
  right: string;
  category: MemoryCategory;
}

export interface MemoryCard {
  id: string;
  pairId: string;
  content: string;
  category: MemoryCategory;
  side: 'question' | 'answer';
}

export interface MemoryProgress {
  schemaVersion: 1;
  id: string;
  mode: MemoryMode;
  difficulty: MemoryDifficulty;
  cards: MemoryCard[];
  matchedCardIds: string[];
  selectedCardIds: string[];
  attempts: number;
  correctAttempts: number;
  combo: number;
  bestCombo: number;
  elapsedMs: number;
  updatedAt: string;
  daily: boolean;
  dateKey?: string;
}

export interface MemoryRecord {
  bestTimeMs: number;
  minAttempts: number;
  bestAccuracy: number;
  completedCount: number;
  totalStars: number;
  completedAt: string;
}

export interface MemoryRecords {
  schemaVersion: 1;
  lastMode: MemoryMode;
  lastDifficulty: MemoryDifficulty;
  byLevel: Partial<Record<string, MemoryRecord>>;
  dailyBadges: string[];
  recentLayouts: string[];
}

export interface MemoryResult {
  mode: MemoryMode;
  difficulty: MemoryDifficulty;
  elapsedMs: number;
  attempts: number;
  accuracy: number;
  stars: number;
  bestCombo: number;
  isBestTime: boolean;
  isBestAttempts: boolean;
  daily: boolean;
  earnedDailyBadge: boolean;
  newAchievementIds: string[];
}
