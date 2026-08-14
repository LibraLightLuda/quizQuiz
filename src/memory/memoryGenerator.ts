import { SeededRandom, shuffle, type RandomSource } from '../services/randomService';
import { memoryDifficultyInfo, pairPools } from './memoryData';
import type { MemoryCard, MemoryDifficulty, MemoryMode, MemoryPair, MemoryProgress } from './types';

export const hashSeed = (value: string): number => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0 || 1;
};

const pickPairs = (mode: MemoryMode, count: number, random: RandomSource): MemoryPair[] => {
  const addUnique = (target: MemoryPair[], candidates: readonly MemoryPair[]) => {
    for (const pair of candidates) {
      const visible = new Set(target.flatMap((item) => [item.left, item.right]));
      if (visible.has(pair.left) || visible.has(pair.right)) continue;
      target.push(pair);
      if (target.length >= count) break;
    }
  };
  if (mode !== 'mixed') {
    const selected: MemoryPair[] = [];
    addUnique(selected, shuffle(random, pairPools[mode]));
    return selected;
  }
  const pools = {
    math: shuffle(random, pairPools.math),
    korean: shuffle(random, pairPools.korean),
    english: shuffle(random, pairPools.english)
  };
  const categories = shuffle(random, ['math', 'korean', 'english'] as const);
  const selected: MemoryPair[] = [];
  const offsets = { math: 0, korean: 0, english: 0 };
  let round = 0;
  while (selected.length < count && round < 60) {
    const category = categories[round % categories.length];
    const visible = new Set(selected.flatMap((item) => [item.left, item.right]));
    const pool = pools[category];
    while (offsets[category] < pool.length) {
      const candidate = pool[offsets[category]++];
      if (visible.has(candidate.left) || visible.has(candidate.right)) continue;
      selected.push(candidate);
      break;
    }
    round += 1;
  }
  return shuffle(random, selected);
};

const toCards = (selected: readonly MemoryPair[], random: RandomSource): MemoryCard[] => {
  const cards = selected.flatMap((pair) => [
    { id: `${pair.id}-q`, pairId: pair.id, content: pair.left, category: pair.category, side: 'question' as const },
    { id: `${pair.id}-a`, pairId: pair.id, content: pair.right, category: pair.category, side: 'answer' as const }
  ]);
  let shuffled = shuffle(random, cards);
  // 첫 화면부터 같은 쌍이 이웃하는 우연을 줄여 게임이 너무 쉽게 끝나지 않게 한다.
  for (let index = 1; index < shuffled.length; index += 1) {
    if (shuffled[index - 1].pairId !== shuffled[index].pairId) continue;
    const swapIndex = shuffled.findIndex((card, candidate) => candidate > index && card.pairId !== shuffled[index].pairId);
    if (swapIndex > index) [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
};

export const layoutSignature = (cards: readonly MemoryCard[]): string => cards.map((card) => card.id).join('|');

export const createMemoryProgress = (
  mode: MemoryMode,
  difficulty: MemoryDifficulty,
  seedText: string,
  daily = false,
  dateKey?: string,
  recentLayouts: readonly string[] = []
): MemoryProgress => {
  const count = memoryDifficultyInfo[difficulty].pairCount;
  let cards: MemoryCard[] = [];
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const random = new SeededRandom(hashSeed(`${seedText}:${attempt}`));
    cards = toCards(pickPairs(mode, count, random), random);
    if (!recentLayouts.includes(layoutSignature(cards))) break;
  }
  return {
    schemaVersion: 1,
    id: `memory-${seedText}`,
    mode,
    difficulty,
    cards,
    matchedCardIds: [],
    selectedCardIds: [],
    attempts: 0,
    correctAttempts: 0,
    combo: 0,
    bestCombo: 0,
    elapsedMs: 0,
    updatedAt: new Date().toISOString(),
    daily,
    dateKey
  };
};

export const todayKey = (date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const calculateStars = (pairCount: number, attempts: number): number => {
  if (attempts <= pairCount) return 3;
  if (attempts <= pairCount + Math.ceil(pairCount * 0.5)) return 2;
  return 1;
};

export const formatMemoryTime = (milliseconds: number): string => {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
};
