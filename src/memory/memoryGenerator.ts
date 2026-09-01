import { SeededRandom, shuffle, type RandomSource } from '../services/randomService';
import { languageMemoryPairs, memoryDifficultyInfo } from './memoryData';
import { randomInt } from '../services/randomService';
import type { MemoryCard, MemoryDifficulty, MemoryMode, MemoryPair, MemoryProgress } from './types';

export const hashSeed = (value: string): number => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0 || 1;
};

const mathPairsFor = (difficulty: MemoryDifficulty, random: RandomSource): MemoryPair[] => {
  const pairs: MemoryPair[] = [];
  const visible = new Set<string>();
  for (let attempt = 0; attempt < 300 && pairs.length < 36; attempt += 1) {
    const operation = difficulty === 'starter'
      ? (random.next() < 0.65 ? 'add' : 'subtract')
      : difficulty === 'growing'
        ? (['add', 'subtract', 'multiply'] as const)[randomInt(random, 0, 2)]
        : (['add', 'subtract', 'multiply', 'divide'] as const)[randomInt(random, 0, 3)];
    let left = '';
    let answer = 0;
    if (operation === 'add') {
      const max = difficulty === 'starter' ? 20 : difficulty === 'growing' ? 60 : difficulty === 'focus' ? 200 : 999;
      const a = randomInt(random, 1, max);
      const b = randomInt(random, 1, Math.max(1, max - a));
      left = `${a} + ${b}`;
      answer = a + b;
    } else if (operation === 'subtract') {
      const max = difficulty === 'starter' ? 30 : difficulty === 'growing' ? 100 : difficulty === 'focus' ? 300 : 999;
      const a = randomInt(random, 2, max);
      const b = randomInt(random, 1, a);
      left = `${a} − ${b}`;
      answer = a - b;
    } else if (operation === 'multiply') {
      const a = randomInt(random, 2, difficulty === 'master' ? 19 : 9);
      const b = randomInt(random, 2, 9);
      left = `${a} × ${b}`;
      answer = a * b;
    } else {
      const divisor = randomInt(random, 2, difficulty === 'master' ? 12 : 9);
      answer = randomInt(random, 2, difficulty === 'master' ? 18 : 9);
      left = `${divisor * answer} ÷ ${divisor}`;
    }
    const right = String(answer);
    if (visible.has(left) || visible.has(right)) continue;
    visible.add(left);
    visible.add(right);
    pairs.push({ id: `memory-math-${operation}-${left.replaceAll(' ', '')}`, left, right, category: 'math' });
  }
  return pairs;
};

const poolFor = (mode: Exclude<MemoryMode, 'mixed'>, difficulty: MemoryDifficulty, random: RandomSource): MemoryPair[] =>
  mode === 'math' ? mathPairsFor(difficulty, random) : languageMemoryPairs(mode, difficulty);

const pickPairs = (mode: MemoryMode, difficulty: MemoryDifficulty, count: number, random: RandomSource): MemoryPair[] => {
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
    addUnique(selected, shuffle(random, poolFor(mode, difficulty, random)));
    return selected;
  }
  const pools = {
    math: shuffle(random, poolFor('math', difficulty, random)),
    korean: shuffle(random, poolFor('korean', difficulty, random)),
    english: shuffle(random, poolFor('english', difficulty, random))
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
    { id: `${pair.id}-q`, pairId: pair.id, content: pair.left, category: pair.category, side: 'question' as const, wordId: pair.wordId, skillIds: pair.skillIds },
    { id: `${pair.id}-a`, pairId: pair.id, content: pair.right, category: pair.category, side: 'answer' as const, wordId: pair.wordId, skillIds: pair.skillIds }
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
export const memoryContentSignature = (cards: readonly MemoryCard[]): string =>
  [...new Set(cards.map((card) => card.pairId))].sort().join('|');

export const createMemoryProgress = (
  mode: MemoryMode,
  difficulty: MemoryDifficulty,
  seedText: string,
  daily = false,
  dateKey?: string,
  recentLayouts: readonly string[] = [],
  recentContents: readonly string[] = []
): MemoryProgress => {
  const count = memoryDifficultyInfo[difficulty].pairCount;
  let cards: MemoryCard[] = [];
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const random = new SeededRandom(hashSeed(`${seedText}:${attempt}`));
    cards = toCards(pickPairs(mode, difficulty, count, random), random);
    if (!recentLayouts.includes(layoutSignature(cards)) && !recentContents.includes(memoryContentSignature(cards))) break;
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
