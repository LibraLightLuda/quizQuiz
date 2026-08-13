import type { Difficulty, EnglishWord, MaskRange } from '../domain/types';

type Seed = readonly [word: string, meaning: string, category: string];

const rangesFor = (word: string, difficulty: Difficulty): MaskRange[] => {
  const length = word.length;
  const wanted = difficulty === 'challenge' ? Math.min(3, length - 2) : difficulty === 'hard' ? 2 : difficulty === 'normal' && length >= 6 ? 2 : 1;
  const starts = [...new Set([0, Math.max(0, Math.floor((length - wanted) / 2)), length - wanted])];
  return starts.map((start) => ({ start, length: wanted }));
};

const define = (difficulty: Difficulty, seeds: readonly Seed[]): EnglishWord[] =>
  seeds.map(([word, meaningKo, category], index) => ({
    id: `en-${difficulty}-${index + 1}`,
    word,
    meaningKo,
    difficulty,
    category,
    maskRanges: rangesFor(word, difficulty),
    ttsLang: 'en-US'
  }));

const easy: Seed[] = [
  ['apple', '사과', 'food'],
  ['water', '물', 'food'], ['bread', '빵', 'food'], ['grape', '포도', 'food'], ['lemon', '레몬', 'food'],
  ['pizza', '피자', 'food'], ['candy', '사탕', 'food'], ['juice', '주스', 'food'], ['peach', '복숭아', 'food'],
  ['horse', '말', 'animal'], ['sheep', '양', 'animal'], ['mouse', '쥐', 'animal'], ['panda', '판다', 'animal'],
  ['tiger', '호랑이', 'animal'], ['whale', '고래', 'animal'], ['frog', '개구리', 'animal'], ['snake', '뱀', 'animal'],
  ['chair', '의자', 'school'], ['paper', '종이', 'school'], ['ruler', '자', 'school'],
  ['green', '초록색', 'color'], ['white', '흰색', 'color'], ['black', '검은색', 'color'], ['brown', '갈색', 'color'],
  ['cloud', '구름', 'nature'], ['river', '강', 'nature'], ['ocean', '바다', 'nature'],
  ['house', '집', 'place'], ['park', '공원', 'place'], ['store', '가게', 'place'], ['room', '방', 'place'],
  ['happy', '행복한', 'feeling'], ['smile', '미소', 'feeling'], ['sleep', '잠자다', 'action'], ['dance', '춤추다', 'action']
];

const normal: Seed[] = [
  ['school', '학교', 'school'], ['flower', '꽃', 'nature'],
  ['family', '가족', 'people'], ['father', '아버지', 'people'], ['mother', '어머니', 'people'], ['sister', '자매', 'people'],
  ['brother', '형제', 'people'], ['friend', '친구', 'people'], ['teacher', '선생님', 'people'], ['student', '학생', 'people'],
  ['rabbit', '토끼', 'animal'], ['monkey', '원숭이', 'animal'], ['dolphin', '돌고래', 'animal'], ['turtle', '거북이', 'animal'],
  ['chicken', '닭', 'animal'], ['giraffe', '기린', 'animal'], ['penguin', '펭귄', 'animal'], ['hamster', '햄스터', 'animal'],
  ['orange', '오렌지', 'food'], ['banana', '바나나', 'food'], ['carrot', '당근', 'food'], ['cookie', '쿠키', 'food'],
  ['cheese', '치즈', 'food'], ['tomato', '토마토', 'food'], ['potato', '감자', 'food'], ['noodle', '국수', 'food'],
  ['window', '창문', 'home'], ['kitchen', '부엌', 'home'], ['garden', '정원', 'home'], ['pencil', '연필', 'school'],
  ['eraser', '지우개', 'school'], ['lesson', '수업', 'school'], ['picture', '그림', 'school'], ['library', '도서관', 'school'],
  ['summer', '여름', 'season'], ['winter', '겨울', 'season'], ['spring', '봄', 'season'], ['autumn', '가을', 'season']
];

const hard: Seed[] = [
  ['elephant', '코끼리', 'animal'], ['kangaroo', '캥거루', 'animal'], ['butterfly', '나비', 'animal'], ['crocodile', '악어', 'animal'],
  ['squirrel', '다람쥐', 'animal'], ['octopus', '문어', 'animal'], ['flamingo', '홍학', 'animal'], ['seahorse', '해마', 'animal'],
  ['breakfast', '아침 식사', 'food'], ['sandwich', '샌드위치', 'food'], ['pancake', '팬케이크', 'food'],
  ['vegetable', '채소', 'food'], ['chocolate', '초콜릿', 'food'], ['mushroom', '버섯', 'food'], ['spaghetti', '스파게티', 'food'],
  ['computer', '컴퓨터', 'school'], ['notebook', '공책', 'school'], ['question', '질문', 'school'], ['homework', '숙제', 'school'],
  ['language', '언어', 'school'], ['science', '과학', 'school'], ['calendar', '달력', 'school'],
  ['mountain', '산', 'nature'], ['rainbow', '무지개', 'nature'], ['sunshine', '햇빛', 'nature'], ['snowflake', '눈송이', 'nature'],
  ['waterfall', '폭포', 'nature'], ['island', '섬', 'nature'], ['forest', '숲', 'nature'], ['weather', '날씨', 'nature'],
  ['hospital', '병원', 'place'], ['station', '역', 'place'], ['museum', '박물관', 'place']
];

const challenge: Seed[] = [
  ['strawberry', '딸기', 'food'], ['dictionary', '사전', 'school'], ['restaurant', '식당', 'place'],
  ['adventure', '모험', 'story'], ['beautiful', '아름다운', 'description'], ['different', '다른', 'description'], ['important', '중요한', 'description'],
  ['wonderful', '훌륭한', 'description'], ['carefully', '조심스럽게', 'action'], ['together', '함께', 'action'], ['sometimes', '때때로', 'time'],
  ['yesterday', '어제', 'time'], ['tomorrow', '내일', 'time'], ['afternoon', '오후', 'time'], ['wednesday', '수요일', 'time'],
  ['astronaut', '우주비행사', 'people'], ['scientist', '과학자', 'people'], ['firefighter', '소방관', 'people'], ['musician', '음악가', 'people'],
  ['photographer', '사진작가', 'people'], ['veterinarian', '수의사', 'people'], ['engineer', '기술자', 'people'], ['librarian', '도서관 사서', 'people'],
  ['environment', '환경', 'nature'], ['earthquake', '지진', 'nature'], ['temperature', '온도', 'nature'], ['electricity', '전기', 'science'],
  ['ecosystem', '생태계', 'nature'], ['recycling', '재활용', 'nature'], ['continent', '대륙', 'nature'], ['universe', '우주', 'science'],
  ['playground', '놀이터', 'place'], ['supermarket', '대형 마트', 'place'], ['classroom', '교실', 'place'], ['bookstore', '서점', 'place'],
  ['helicopter', '헬리콥터', 'vehicle'], ['ambulance', '구급차', 'vehicle'], ['submarine', '잠수함', 'vehicle'], ['spaceship', '우주선', 'vehicle']
];

export const englishWords: EnglishWord[] = [
  ...define('easy', easy), ...define('normal', normal),
  ...define('hard', hard), ...define('challenge', challenge)
];
