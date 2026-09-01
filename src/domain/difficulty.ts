import type { Difficulty, LearningTheme, Mode, SessionConfig, SessionLength, Subject } from './types';

export const DEFAULT_SESSION_LENGTH: SessionLength = 5;
export const LONG_SESSION_LENGTH: SessionLength = 15;
export const SESSION_LENGTHS: SessionLength[] = [DEFAULT_SESSION_LENGTH, LONG_SESSION_LENGTH];
export const QUESTION_TIME_SECONDS = 30;
export const QUESTION_TIME_MS = QUESTION_TIME_SECONDS * 1000;

export const DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard', 'challenge'];

export const difficultyInfo: Record<Difficulty, { label: string; labelEn: string; age: string; example: string; optionCount: number }> = {
  easy: { label: '쉬움', labelEn: 'Easy', age: '초1~2', example: '익숙한 문제', optionCount: 3 },
  normal: { label: '보통', labelEn: 'Normal', age: '초2~3', example: '차근차근 생각해요', optionCount: 4 },
  hard: { label: '어려움', labelEn: 'Hard', age: '초3~4', example: '조금 더 비슷한 보기', optionCount: 4 },
  challenge: { label: '도전', labelEn: 'Challenge', age: '초4~6', example: '큰 수와 긴 단어', optionCount: 4 }
};

export const modeInfo: Record<Mode, { subject: Subject; label: string; labelEn: string; description: string; descriptionEn: string; icon: string }> = {
  'math-add': { subject: 'math', label: '덧셈', labelEn: 'Addition', description: '수를 더해 보아요', descriptionEn: 'Add the numbers', icon: '＋' },
  'math-subtract': { subject: 'math', label: '뺄셈', labelEn: 'Subtraction', description: '얼마가 남는지 찾아요', descriptionEn: 'Find how many remain', icon: '−' },
  'math-multiply': { subject: 'math', label: '곱셈', labelEn: 'Multiplication', description: '같은 수를 묶어 보아요', descriptionEn: 'Make equal groups', icon: '×' },
  'math-mixed': { subject: 'math', label: '사칙연산', labelEn: 'Mixed operations', description: '덧셈·뺄셈·곱셈을 골고루 풀어요', descriptionEn: 'Practice addition, subtraction, and multiplication', icon: '±×' },
  'ko-fill': { subject: 'korean', label: '글자 채우기', labelEn: 'Fill the letters', description: '빠진 음절을 골라요', descriptionEn: 'Choose the missing Korean syllable', icon: '가' },
  'ko-listen': { subject: 'korean', label: '듣고 고르기', labelEn: 'Listen and choose', description: '단어를 듣고 찾아요', descriptionEn: 'Listen and find the Korean word', icon: '🔊' },
  'ko-adventure': { subject: 'korean', label: '말놀이 탐험', labelEn: 'Korean word quest', description: '소리·조립·그림·문장을 골고루 만나요', descriptionEn: 'Explore Korean sounds, letters, pictures, and sentences', icon: '🧩' },
  'en-fill': { subject: 'english', label: '철자 채우기', labelEn: 'Fill the spelling', description: '빠진 알파벳을 골라요', descriptionEn: 'Choose the missing English letters', icon: 'A' },
  'en-listen': { subject: 'english', label: '듣고 고르기', labelEn: 'Listen and choose', description: '영어 단어를 듣고 찾아요', descriptionEn: 'Listen and find the English word', icon: '🎧' },
  'en-adventure': { subject: 'english', label: 'Word Quest', labelEn: 'Word Quest', description: '소리·글자·그림·문장을 골고루 만나요', descriptionEn: 'Explore English sounds, letters, pictures, and sentences', icon: '🧩' }
};

export const subjectInfo: Record<Subject, { label: string; labelEn: string; description: string; descriptionEn: string; icon: string; className: string }> = {
  math: { label: '수학', labelEn: 'Math', description: '더하고 빼고 곱해요', descriptionEn: 'Add, subtract, and multiply', icon: '123', className: 'math' },
  korean: { label: '한국어', labelEn: 'Korean', description: '우리말 글자를 배워요', descriptionEn: 'Learn Korean letters and words', icon: '가나다', className: 'korean' },
  english: { label: '영어', labelEn: 'English', description: '영어 단어를 익혀요', descriptionEn: 'Learn English words', icon: 'ABC', className: 'english' }
};

export const modesForSubject = (subject: Subject): Mode[] =>
  (Object.keys(modeInfo) as Mode[]).filter((mode) => modeInfo[mode].subject === subject);

export const DEFAULT_CONFIG: SessionConfig = {
  subject: 'math',
  mode: 'math-add',
  difficulty: 'easy',
  length: DEFAULT_SESSION_LENGTH,
  theme: 'animals'
};

export const languageJourneyInfo: Record<Difficulty, { label: string; labelEn: string; detail: string; detailEn: string }> = {
  easy: { label: '그림친구', labelEn: 'Picture pals', detail: '익숙한 낱말과 그림을 만나요', detailEn: 'Meet familiar words and pictures' },
  normal: { label: '글자탐험', labelEn: 'Letter quest', detail: '조금 긴 낱말을 찾아요', detailEn: 'Find slightly longer words' },
  hard: { label: '낱말모험', labelEn: 'Word adventure', detail: '비슷한 글자를 살펴봐요', detailEn: 'Look closely at similar letters' },
  challenge: { label: '쓰기모험', labelEn: 'Writing adventure', detail: '내가 직접 글자를 써요', detailEn: 'Type the answer yourself' }
};

export const learningThemeInfo: Record<LearningTheme, { label: string; labelEn: string; icon: string; categories: string[] }> = {
  animals: { label: '동물 친구', labelEn: 'Animal friends', icon: '🐯', categories: ['동물', 'animal'] },
  food: { label: '맛있는 친구', labelEn: 'Tasty friends', icon: '🍎', categories: ['음식', 'food'] },
  nature: { label: '자연 친구', labelEn: 'Nature friends', icon: '🌈', categories: ['자연', 'nature', 'season'] }
};
