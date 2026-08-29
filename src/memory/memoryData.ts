import type { MemoryCategory, MemoryDifficulty, MemoryMode, MemoryPair } from './types';
import { koreanWords } from '../data/koreanWords';
import { englishWords } from '../data/englishWords';

export const MEMORY_MODES: MemoryMode[] = ['mixed', 'math', 'korean', 'english'];
export const MEMORY_DIFFICULTIES: MemoryDifficulty[] = ['starter', 'growing', 'focus', 'master'];

export const memoryModeInfo: Record<MemoryMode, { label: string; description: string; icon: string }> = {
  mixed: { label: '통합 학습', description: '수학·한국어·영어를 골고루 만나요', icon: '✨' },
  math: { label: '수학 전용', description: '식과 알맞은 답을 연결해요', icon: '＋' },
  korean: { label: '한국어 전용', description: '낱말과 뜻을 연결해요', icon: '가' },
  english: { label: '영어 전용', description: '영어 낱말과 뜻을 연결해요', icon: 'A' }
};

export const memoryDifficultyInfo: Record<MemoryDifficulty, { label: string; description: string; pairCount: number }> = {
  starter: { label: '첫걸음', description: '4쌍 · 처음에도 쉬워요', pairCount: 4 },
  growing: { label: '차근차근', description: '6쌍 · 기억을 넓혀요', pairCount: 6 },
  focus: { label: '집중력 쑥쑥', description: '8쌍 · 비슷한 답도 살펴봐요', pairCount: 8 },
  master: { label: '기억력 왕', description: '10쌍 · 기록에 도전해요', pairCount: 10 }
};

const pairs = (category: MemoryCategory, values: readonly [string, string, string][]): MemoryPair[] =>
  values.map(([id, left, right]) => ({ id, left, right, category }));

export const mathPairs = pairs('math', [
  ['m01', '2 + 3', '5'], ['m02', '7 + 5', '12'], ['m03', '9 + 8', '17'], ['m04', '6 + 7', '13'],
  ['m05', '15 − 8', '7'], ['m06', '14 − 5', '9'], ['m07', '18 − 7', '11'], ['m08', '20 − 6', '14'],
  ['m09', '3 × 4', '12'], ['m10', '6 × 5', '30'], ['m11', '7 × 8', '56'], ['m12', '9 × 4', '36'],
  ['m13', '24 ÷ 6', '4'], ['m14', '35 ÷ 5', '7'], ['m15', '42 ÷ 7', '6'], ['m16', '54 ÷ 9', '6'],
  ['m17', '25 + 18', '43'], ['m18', '50 − 27', '23'], ['m19', '8 × 9', '72'], ['m20', '64 ÷ 8', '8']
]);

export const koreanPairs: MemoryPair[] = koreanWords.slice(0, 20).map((word, index) => ({
  id: `k${String(index + 1).padStart(2, '0')}`,
  left: word.word,
  right: word.hintKo,
  category: 'korean',
  wordId: word.id,
  skillIds: [...word.skillIds]
}));

export const englishPairs: MemoryPair[] = englishWords.slice(0, 20).map((word, index) => ({
  id: `e${String(index + 1).padStart(2, '0')}`,
  left: word.word,
  right: word.meaningKo,
  category: 'english',
  wordId: word.id,
  skillIds: [...word.skillIds]
}));

export const pairPools: Record<Exclude<MemoryMode, 'mixed'>, readonly MemoryPair[]> = {
  math: mathPairs,
  korean: koreanPairs,
  english: englishPairs
};
