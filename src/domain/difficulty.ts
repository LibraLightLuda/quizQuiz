import type { Difficulty, Mode, Pace, SessionConfig, Subject } from './types';

export const DIFFICULTIES: Difficulty[] = ['sprout', 'easy', 'normal', 'hard', 'challenge'];

export const difficultyInfo: Record<Difficulty, { label: string; age: string; example: string; optionCount: number }> = {
  sprout: { label: '새싹', age: '유치원~초1', example: '작고 쉬운 문제', optionCount: 2 },
  easy: { label: '쉬움', age: '초1~2', example: '익숙한 문제', optionCount: 3 },
  normal: { label: '보통', age: '초2~3', example: '차근차근 생각해요', optionCount: 4 },
  hard: { label: '어려움', age: '초3~4', example: '조금 더 비슷한 보기', optionCount: 4 },
  challenge: { label: '도전', age: '초4~6', example: '큰 수와 긴 단어', optionCount: 4 }
};

export const paceInfo: Record<Pace, { label: string; seconds: number | null; listeningSeconds: number | null }> = {
  untimed: { label: '시간 제한 없음', seconds: null, listeningSeconds: null },
  relaxed: { label: '여유롭게', seconds: 30, listeningSeconds: 35 },
  normal: { label: '보통', seconds: 20, listeningSeconds: 25 },
  fast: { label: '빠르게', seconds: 12, listeningSeconds: 15 }
};

export const modeInfo: Record<Mode, { subject: Subject; label: string; description: string; icon: string }> = {
  'math-add': { subject: 'math', label: '덧셈', description: '수를 더해 보아요', icon: '＋' },
  'math-subtract': { subject: 'math', label: '뺄셈', description: '얼마가 남는지 찾아요', icon: '−' },
  'math-multiply': { subject: 'math', label: '곱셈', description: '같은 수를 묶어 보아요', icon: '×' },
  'ko-fill': { subject: 'korean', label: '글자 채우기', description: '빠진 음절을 골라요', icon: '가' },
  'ko-listen': { subject: 'korean', label: '듣고 고르기', description: '단어를 듣고 찾아요', icon: '🔊' },
  'en-fill': { subject: 'english', label: '철자 채우기', description: '빠진 알파벳을 골라요', icon: 'A' },
  'en-listen': { subject: 'english', label: '듣고 고르기', description: '영어 단어를 듣고 찾아요', icon: '🎧' }
};

export const subjectInfo: Record<Subject, { label: string; description: string; icon: string; className: string }> = {
  math: { label: '수학', description: '더하고 빼고 곱해요', icon: '123', className: 'math' },
  korean: { label: '한국어', description: '우리말 글자를 배워요', icon: '가나다', className: 'korean' },
  english: { label: '영어', description: '영어 단어를 익혀요', icon: 'ABC', className: 'english' }
};

export const modesForSubject = (subject: Subject): Mode[] =>
  (Object.keys(modeInfo) as Mode[]).filter((mode) => modeInfo[mode].subject === subject);

export const DEFAULT_CONFIG: SessionConfig = {
  subject: 'math',
  mode: 'math-add',
  difficulty: 'easy',
  length: 10,
  pace: 'untimed'
};
