import type { MemoryCategory, MemoryDifficulty, MemoryMode, MemoryPair } from './types';

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

export const koreanPairs = pairs('korean', [
  ['k01', '강아지', '집에서 키우는 동물'], ['k02', '사과', '빨갛거나 초록색인 과일'],
  ['k03', '연필', '글씨를 쓰는 도구'], ['k04', '우산', '비를 막아 주는 물건'],
  ['k05', '도서관', '책을 읽고 빌리는 곳'], ['k06', '병원', '아픈 사람을 치료하는 곳'],
  ['k07', '소방관', '불을 끄고 사람을 구하는 직업'], ['k08', '요리사', '맛있는 음식을 만드는 직업'],
  ['k09', '기쁘다', '마음이 즐겁고 좋다'], ['k10', '슬기롭다', '생각이 깊고 지혜롭다'],
  ['k11', '튼튼하다', '몸이나 물건이 강하고 단단하다'], ['k12', '다정하다', '마음이 따뜻하고 친절하다'],
  ['k13', '아침', '해가 뜨고 하루가 시작되는 때'], ['k14', '저녁', '해가 지고 어두워지는 때'],
  ['k15', '봄', '꽃이 피고 따뜻해지는 계절'], ['k16', '가을', '곡식과 열매가 익는 계절'],
  ['k17', '속담', '옛사람의 지혜가 담긴 짧은 말'], ['k18', '일기', '하루 동안 겪은 일을 적은 글'],
  ['k19', '약속', '앞으로 할 일을 서로 정하는 것'], ['k20', '용기', '두려움을 이겨 내는 씩씩한 마음']
]);

export const englishPairs = pairs('english', [
  ['e01', 'apple', '사과'], ['e02', 'school', '학교'], ['e03', 'happy', '행복한'], ['e04', 'friend', '친구'],
  ['e05', 'puppy', '강아지'], ['e06', 'family', '가족'], ['e07', 'teacher', '선생님'], ['e08', 'library', '도서관'],
  ['e09', 'morning', '아침'], ['e10', 'evening', '저녁'], ['e11', 'spring', '봄'], ['e12', 'autumn', '가을'],
  ['e13', 'small', '작은'], ['e14', 'large', '큰'], ['e15', 'fast', '빠른'], ['e16', 'slow', '느린'],
  ['e17', 'laugh', '웃다'], ['e18', 'listen', '듣다'], ['e19', 'write', '쓰다'], ['e20', 'learn', '배우다']
]);

export const pairPools: Record<Exclude<MemoryMode, 'mixed'>, readonly MemoryPair[]> = {
  math: mathPairs,
  korean: koreanPairs,
  english: englishPairs
};
