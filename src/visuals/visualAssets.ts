export interface VisualAsset {
  src: string;
  alt: string;
  aspectRatio: `${number}/${number}`;
}

const publicAsset = (path: string): string => {
  const normalizedPath = path.replace(/^\//, '');
  const optimizedPath = normalizedPath.startsWith('illustrations/')
    ? normalizedPath.replace(/\.png$/, '.webp')
    : normalizedPath;
  return `${import.meta.env.BASE_URL}${optimizedPath}`;
};

export type ConceptId =
  | 'apple' | 'puppy' | 'library' | 'happy' | 'school' | 'friend' | 'family' | 'teacher'
  | 'morning' | 'evening' | 'spring' | 'autumn' | 'pencil' | 'umbrella' | 'hospital'
  | 'firefighter' | 'chef' | 'wise' | 'strong' | 'kind' | 'proverb' | 'diary' | 'promise'
  | 'courage' | 'small' | 'large' | 'fast' | 'slow' | 'laugh' | 'listen' | 'write' | 'learn'
  | 'playground' | 'tiger' | 'frog' | 'turtle' | 'penguin' | 'squirrel' | 'eraser'
  | 'classroom' | 'potato' | 'carrot' | 'rainbow' | 'dolphin' | 'kangaroo' | 'sandwich'
  | 'chocolate' | 'astronaut' | 'veterinarian' | 'photographer' | 'water' | 'bread'
  | 'grape' | 'lemon' | 'pizza' | 'candy' | 'juice' | 'peach' | 'horse' | 'sheep'
  | 'mouse' | 'panda' | 'whale' | 'snake' | 'chair' | 'paper' | 'ruler'
  | 'green' | 'white' | 'black' | 'brown' | 'cloud' | 'river' | 'ocean' | 'house'
  | 'park' | 'store' | 'room' | 'smile' | 'sleep' | 'dance' | 'car' | 'bicycle'
  | 'airplane' | 'train' | 'bus' | 'blackboard' | 'desk' | 'colored-pencils' | 'chick'
  | 'gimbap' | 'tteokbokki' | 'corn' | 'sun' | 'moon' | 'starlight' | 'flower-garden'
  | 'stream' | 'scarf' | 'gloves' | 'toothpaste' | 'towel' | 'clock' | 'mirror'
  | 'flower' | 'father' | 'mother' | 'sister' | 'brother' | 'student' | 'rabbit' | 'monkey'
  | 'chicken' | 'giraffe' | 'hamster' | 'orange' | 'banana' | 'cookie' | 'cheese' | 'tomato'
  | 'noodle' | 'window' | 'kitchen' | 'garden' | 'lesson' | 'picture' | 'summer' | 'winter'
  | 'school-field' | 'cafeteria' | 'art-class' | 'school-noticebook' | 'dictation' | 'zoo'
  | 'polar-bear' | 'mole' | 'firefly' | 'spring-breeze' | 'sudden-shower' | 'snowman'
  | 'sunflower' | 'dandelion' | 'leaf' | 'traffic-light' | 'crosswalk' | 'post-office'
  | 'fire-station' | 'appointment-time' | 'grandfather' | 'grandmother' | 'younger-cousin'
  | 'neighbor' | 'rice-ball' | 'yogurt' | 'bean-sprouts' | 'tangerine-peel'
  | 'elephant' | 'butterfly' | 'crocodile' | 'octopus' | 'flamingo' | 'seahorse'
  | 'breakfast' | 'pancake' | 'vegetable' | 'mushroom' | 'spaghetti' | 'computer'
  | 'notebook' | 'question' | 'homework' | 'language' | 'science' | 'calendar'
  | 'mountain' | 'sunshine' | 'snowflake' | 'waterfall' | 'island' | 'forest'
  | 'weather' | 'station' | 'museum' | 'ice-cream' | 'science-experiment' | 'sports-day'
  | 'class-meeting' | 'school-supplies' | 'reading-log' | 'presentation-time'
  | 'morning-sunlight' | 'sunset-glow' | 'milky-way' | 'water-drop' | 'pine-cone'
  | 'garden-balsam' | 'public-transport' | 'seat-belt' | 'recyclables' | 'waste-sorting'
  | 'laundry-basket' | 'microwave' | 'street-cleaner' | 'driver' | 'children-author'
  | 'red-squirrel' | 'orangutan' | 'lizard' | 'stag-beetle' | 'sea-turtle' | 'baby-goat'
  | 'spicy-noodles' | 'candied-sweet-potato' | 'rolled-omelet' | 'seaweed-soup'
  | 'stir-fried-vegetables' | 'fruit-salad' | 'strawberry' | 'dictionary' | 'restaurant'
  | 'adventure' | 'beautiful' | 'different' | 'important' | 'wonderful' | 'carefully'
  | 'together' | 'sometimes' | 'yesterday' | 'tomorrow' | 'afternoon' | 'wednesday'
  | 'scientist' | 'musician' | 'engineer' | 'librarian' | 'environment' | 'earthquake'
  | 'temperature' | 'electricity' | 'ecosystem' | 'recycling' | 'continent' | 'universe'
  | 'supermarket' | 'bookstore' | 'helicopter' | 'ambulance' | 'submarine' | 'spaceship'
  | 'nature-observation' | 'field-trip' | 'group-activity' | 'study-plan' | 'book-discussion'
  | 'science-museum' | 'global-warming' | 'thunder-lightning' | 'sea-level'
  | 'freshwater-fish' | 'forest-protection' | 'traffic-safety' | 'personal-information'
  | 'emergency-contacts' | 'daily-habits' | 'energy-saving' | 'public-facility'
  | 'cultural-guide' | 'weather-forecaster' | 'paramedic' | 'software-developer'
  | 'cultural-restorer' | 'endangered-species' | 'migratory-bird-habitat' | 'food-chain'
  | 'hibernation' | 'camouflage' | 'amphibian' | 'nutrients' | 'fermented-food'
  | 'food-storage' | 'seasonal-fruit' | 'balanced-meal' | 'traditional-food';

export const conceptVisuals: Readonly<Record<ConceptId, VisualAsset>> = {
  apple: { src: publicAsset('illustrations/concepts/apple.png'), alt: '초록 잎이 달린 빨간 사과 한 개', aspectRatio: '1/1' },
  puppy: { src: publicAsset('illustrations/concepts/puppy.png'), alt: '파란 목줄을 하고 앉아 있는 작은 강아지', aspectRatio: '1/1' },
  library: { src: publicAsset('illustrations/concepts/library.png'), alt: '책장과 책 읽는 자리가 있는 어린이 도서관', aspectRatio: '1/1' },
  happy: { src: publicAsset('illustrations/concepts/happy.png'), alt: '기쁜 표정으로 두 손을 모으고 웃는 어린이', aspectRatio: '1/1' },
  school: { src: publicAsset('illustrations/concepts/school.png'), alt: '나무와 길이 있는 알록달록한 초등학교 건물', aspectRatio: '1/1' },
  friend: { src: publicAsset('illustrations/concepts/friend.png'), alt: '서로 웃으며 손바닥을 마주치는 두 어린이 친구', aspectRatio: '1/1' },
  family: { src: publicAsset('illustrations/concepts/family.png'), alt: '소파에 다정하게 모여 앉아 있는 네 명의 가족', aspectRatio: '1/1' },
  teacher: { src: publicAsset('illustrations/concepts/teacher.png'), alt: '칠판의 별 모양을 가리키며 가르치는 선생님', aspectRatio: '1/1' },
  morning: { src: publicAsset('illustrations/concepts/morning.png'), alt: '해가 떠오르는 창가와 아침을 알리는 알람시계', aspectRatio: '1/1' },
  evening: { src: publicAsset('illustrations/concepts/evening.png'), alt: '해가 지고 집의 창문에 불이 켜진 저녁 풍경', aspectRatio: '1/1' },
  spring: { src: publicAsset('illustrations/concepts/spring.png'), alt: '꽃이 핀 나무와 나비가 있는 따뜻한 봄 풍경', aspectRatio: '1/1' },
  autumn: { src: publicAsset('illustrations/concepts/autumn.png'), alt: '주황 단풍나무와 익은 열매가 있는 가을 풍경', aspectRatio: '1/1' },
  pencil: { src: publicAsset('illustrations/concepts/pencil.png'), alt: '분홍 지우개가 달린 커다란 노란 연필', aspectRatio: '1/1' },
  umbrella: { src: publicAsset('illustrations/concepts/umbrella.png'), alt: '빗방울을 막아 주는 활짝 펼친 보라색 우산', aspectRatio: '1/1' },
  hospital: { src: publicAsset('illustrations/concepts/hospital.png'), alt: '하트 표시와 구급차 차고가 있는 친근한 병원', aspectRatio: '1/1' },
  firefighter: { src: publicAsset('illustrations/concepts/firefighter.png'), alt: '안전 장비를 입고 소방 호스를 든 소방관', aspectRatio: '1/1' },
  chef: { src: publicAsset('illustrations/concepts/chef.png'), alt: '조리 모자를 쓰고 냄비 속 음식을 젓는 요리사', aspectRatio: '1/1' },
  wise: { src: publicAsset('illustrations/concepts/wise.png'), alt: '두 선택을 살펴보고 알맞은 퍼즐 조각을 고르는 어린이', aspectRatio: '1/1' },
  strong: { src: publicAsset('illustrations/concepts/strong.png'), alt: '상자를 바른 자세로 씩씩하게 옮기는 튼튼한 어린이', aspectRatio: '1/1' },
  kind: { src: publicAsset('illustrations/concepts/kind.png'), alt: '무릎을 다친 친구에게 반창고를 건네는 다정한 어린이', aspectRatio: '1/1' },
  proverb: { src: publicAsset('illustrations/concepts/proverb.png'), alt: '씨앗이 나무가 되는 지혜를 어린이에게 들려주는 할머니', aspectRatio: '1/1' },
  diary: { src: publicAsset('illustrations/concepts/diary.png'), alt: '하루의 기억을 적을 수 있는 펼친 일기장과 연필', aspectRatio: '1/1' },
  promise: { src: publicAsset('illustrations/concepts/promise.png'), alt: '서로 마주 보고 새끼손가락 약속을 하는 두 어린이', aspectRatio: '1/1' },
  courage: { src: publicAsset('illustrations/concepts/courage.png'), alt: '용기를 내어 시냇물의 징검다리를 건너는 어린이', aspectRatio: '1/1' },
  small: { src: publicAsset('illustrations/concepts/small.png'), alt: '커다란 보라색 방석 곁에 놓인 아주 작은 노란 공', aspectRatio: '1/1' },
  large: { src: publicAsset('illustrations/concepts/large.png'), alt: '작은 의자 옆에 서 있는 커다랗고 친근한 코끼리', aspectRatio: '1/1' },
  fast: { src: publicAsset('illustrations/concepts/fast.png'), alt: '움직임 선을 그리며 빠르게 달리는 빨간 자동차', aspectRatio: '1/1' },
  slow: { src: publicAsset('illustrations/concepts/slow.png'), alt: '굽은 길을 천천히 걸어가는 초록색 거북이', aspectRatio: '1/1' },
  laugh: { src: publicAsset('illustrations/concepts/laugh.png'), alt: '한 손을 입 가까이 대고 즐겁게 웃는 어린이', aspectRatio: '1/1' },
  listen: { src: publicAsset('illustrations/concepts/listen.png'), alt: '귀에 손을 대고 새의 노랫소리를 귀 기울여 듣는 어린이', aspectRatio: '1/1' },
  write: { src: publicAsset('illustrations/concepts/write.png'), alt: '책상에서 연필로 종이에 글씨를 쓰는 어린이', aspectRatio: '1/1' },
  learn: { src: publicAsset('illustrations/concepts/learn.png'), alt: '책과 지구본과 퍼즐을 연결하며 즐겁게 배우는 어린이', aspectRatio: '1/1' },
  playground: { src: publicAsset('illustrations/concepts/playground.webp'), alt: '미끄럼틀과 그네와 놀이 기구가 있는 어린이 놀이터', aspectRatio: '1/1' },
  tiger: { src: publicAsset('illustrations/concepts/tiger.webp'), alt: '초록 숲에 서 있는 검은 줄무늬의 주황색 호랑이', aspectRatio: '1/1' },
  frog: { src: publicAsset('illustrations/concepts/frog.webp'), alt: '연못의 연잎 곁에서 네 발을 펼치고 뛰는 초록 개구리', aspectRatio: '1/1' },
  turtle: { src: publicAsset('illustrations/concepts/turtle.webp'), alt: '풀밭에서 단단한 등껍질을 지고 천천히 걷는 거북이', aspectRatio: '1/1' },
  penguin: { src: publicAsset('illustrations/concepts/penguin.webp'), alt: '파란 얼음 앞 눈밭에서 뒤뚱뒤뚱 걷는 펭귄 한 마리', aspectRatio: '1/1' },
  squirrel: { src: publicAsset('illustrations/concepts/squirrel.webp'), alt: '나뭇가지에서 도토리를 들고 있는 꼬리가 풍성한 다람쥐', aspectRatio: '1/1' },
  eraser: { src: publicAsset('illustrations/concepts/eraser.webp'), alt: '종이의 연필 자국을 깨끗하게 지우는 산호색 지우개', aspectRatio: '1/1' },
  classroom: { src: publicAsset('illustrations/concepts/classroom.webp'), alt: '칠판과 책상과 의자가 있고 아이들이 공부하는 교실', aspectRatio: '1/1' },
  potato: { src: publicAsset('illustrations/concepts/potato.webp'), alt: '흙 위에 놓인 둥글고 울퉁불퉁한 갈색 감자 세 개', aspectRatio: '1/1' },
  carrot: { src: publicAsset('illustrations/concepts/carrot.webp'), alt: '초록 잎이 풍성하고 흙에서 뽑힌 커다란 주황색 당근', aspectRatio: '1/1' },
  rainbow: { src: publicAsset('illustrations/concepts/rainbow.webp'), alt: '비가 그친 하늘의 구름 사이로 뜬 일곱 빛깔 무지개', aspectRatio: '1/1' },
  dolphin: { src: publicAsset('illustrations/concepts/dolphin.webp'), alt: '반짝이는 바닷물 위로 힘차게 뛰어오르는 회색 돌고래', aspectRatio: '1/1' },
  kangaroo: { src: publicAsset('illustrations/concepts/kangaroo.webp'), alt: '새끼를 배 주머니에 품고 초원에 서 있는 캥거루', aspectRatio: '1/1' },
  sandwich: { src: publicAsset('illustrations/concepts/sandwich.webp'), alt: '빵 사이에 채소와 치즈와 달걀이 층층이 든 샌드위치', aspectRatio: '1/1' },
  chocolate: { src: publicAsset('illustrations/concepts/chocolate.webp'), alt: '포장을 열어 네모난 조각이 보이는 갈색 초콜릿', aspectRatio: '1/1' },
  astronaut: { src: publicAsset('illustrations/concepts/astronaut.webp'), alt: '지구가 보이는 우주선 창가를 떠다니는 우주비행사', aspectRatio: '1/1' },
  veterinarian: { src: publicAsset('illustrations/concepts/veterinarian.webp'), alt: '동물 병원에서 청진기로 강아지를 진찰하는 수의사', aspectRatio: '1/1' },
  photographer: { src: publicAsset('illustrations/concepts/photographer.webp'), alt: '꽃밭에서 전문 카메라로 자연 사진을 찍는 사진작가', aspectRatio: '1/1' },
  water: { src: publicAsset('illustrations/concepts/water.webp'), alt: '투명한 유리잔 안에서 파랗게 찰랑이는 마시는 물', aspectRatio: '1/1' },
  bread: { src: publicAsset('illustrations/concepts/bread.webp'), alt: '노릇하게 구운 식빵 한 덩이와 잘라 놓은 빵 두 조각', aspectRatio: '1/1' },
  grape: { src: publicAsset('illustrations/concepts/grape.webp'), alt: '초록 잎과 줄기가 달린 탐스러운 보라색 포도송이', aspectRatio: '1/1' },
  lemon: { src: publicAsset('illustrations/concepts/lemon.webp'), alt: '초록 잎이 달린 노란 레몬과 속이 보이는 레몬 반쪽', aspectRatio: '1/1' },
  pizza: { src: publicAsset('illustrations/concepts/pizza.webp'), alt: '채소와 치즈가 올라가고 한 조각을 떼어 놓은 둥근 피자', aspectRatio: '1/1' },
  candy: { src: publicAsset('illustrations/concepts/candy.webp'), alt: '양쪽 포장지를 비틀어 감싼 알록달록한 둥근 사탕', aspectRatio: '1/1' },
  juice: { src: publicAsset('illustrations/concepts/juice.webp'), alt: '빨대와 오렌지 조각이 꽂힌 투명한 잔의 주황색 과일 주스', aspectRatio: '1/1' },
  peach: { src: publicAsset('illustrations/concepts/peach.webp'), alt: '초록 잎이 달린 복숭아와 씨가 보이도록 자른 복숭아 반쪽', aspectRatio: '1/1' },
  horse: { src: publicAsset('illustrations/concepts/horse.webp'), alt: '갈색 갈기와 긴 꼬리를 가진 튼튼한 갈색 말 한 마리', aspectRatio: '1/1' },
  sheep: { src: publicAsset('illustrations/concepts/sheep.webp'), alt: '풀밭에 서 있는 복슬복슬한 흰 털의 양 한 마리', aspectRatio: '1/1' },
  mouse: { src: publicAsset('illustrations/concepts/mouse.webp'), alt: '둥근 귀와 길고 가느다란 꼬리를 가진 작은 회색 쥐', aspectRatio: '1/1' },
  panda: { src: publicAsset('illustrations/concepts/panda.webp'), alt: '대나무 줄기를 안고 앉아 있는 검고 흰 판다 한 마리', aspectRatio: '1/1' },
  whale: { src: publicAsset('illustrations/concepts/whale.webp'), alt: '넓은 지느러미와 커다란 몸으로 바다를 헤엄치는 파란 고래', aspectRatio: '1/1' },
  snake: { src: publicAsset('illustrations/concepts/snake.webp'), alt: '긴 몸을 둥글게 굽히고 혀를 내민 초록색 뱀 한 마리', aspectRatio: '1/1' },
  chair: { src: publicAsset('illustrations/concepts/chair.webp'), alt: '민트색 앉는 판과 나무 등받이가 있는 어린이 의자', aspectRatio: '1/1' },
  paper: { src: publicAsset('illustrations/concepts/paper.webp'), alt: '오른쪽 아래 모서리가 살짝 말려 올라간 깨끗한 흰 종이 한 장', aspectRatio: '1/1' },
  ruler: { src: publicAsset('illustrations/concepts/ruler.webp'), alt: '길이를 재는 눈금이 일정하게 그어진 기다란 나무 자', aspectRatio: '1/1' },
  green: { src: publicAsset('illustrations/concepts/green.webp'), alt: '밝고 어두운 결이 함께 보이는 커다란 초록색 물감 자국', aspectRatio: '1/1' },
  white: { src: publicAsset('illustrations/concepts/white.webp'), alt: '회색 윤곽과 보라색 받침 위에서 또렷하게 보이는 흰색 물감 자국', aspectRatio: '1/1' },
  black: { src: publicAsset('illustrations/concepts/black.webp'), alt: '붓의 결이 은은하게 드러나는 커다란 검은색 물감 자국', aspectRatio: '1/1' },
  brown: { src: publicAsset('illustrations/concepts/brown.webp'), alt: '밝고 어두운 결이 함께 보이는 따뜻한 갈색 물감 자국', aspectRatio: '1/1' },
  cloud: { src: publicAsset('illustrations/concepts/cloud.webp'), alt: '파란 하늘 가운데 둥실 떠 있는 크고 하얀 구름 한 덩이', aspectRatio: '1/1' },
  river: { src: publicAsset('illustrations/concepts/river.webp'), alt: '양쪽 풀밭 사이를 굽이굽이 흐르며 먼 산까지 이어지는 강', aspectRatio: '1/1' },
  ocean: { src: publicAsset('illustrations/concepts/ocean.webp'), alt: '먼 수평선까지 넓게 펼쳐지고 여러 겹 파도가 이는 푸른 바다', aspectRatio: '1/1' },
  house: { src: publicAsset('illustrations/concepts/house.webp'), alt: '지붕과 현관문과 여러 창문이 있는 아늑한 가족의 집', aspectRatio: '1/1' },
  park: { src: publicAsset('illustrations/concepts/park.webp'), alt: '나무와 잔디와 산책길과 벤치가 있는 햇살 좋은 공원', aspectRatio: '1/1' },
  store: { src: publicAsset('illustrations/concepts/store.webp'), alt: '줄무늬 차양과 문과 상품 진열 창이 있는 동네 가게', aspectRatio: '1/1' },
  room: { src: publicAsset('illustrations/concepts/room.webp'), alt: '침대와 창문과 선반과 둥근 깔개가 놓인 아늑한 어린이 방', aspectRatio: '1/1' },
  smile: { src: publicAsset('illustrations/concepts/smile.webp'), alt: '눈을 편안하게 뜨고 입꼬리를 올려 환하게 미소 짓는 어린이 얼굴', aspectRatio: '1/1' },
  sleep: { src: publicAsset('illustrations/concepts/sleep.webp'), alt: '달이 뜬 밤에 이불을 덮고 눈을 감은 채 편안히 잠자는 어린이', aspectRatio: '1/1' },
  dance: { src: publicAsset('illustrations/concepts/dance.webp'), alt: '한쪽 발을 들고 두 팔을 움직이며 신나게 춤추는 어린이', aspectRatio: '1/1' },
  car: { src: publicAsset('illustrations/concepts/car.webp'), alt: '창문과 네 개의 문과 바퀴가 보이는 빨간색 가족 자동차', aspectRatio: '1/1' },
  bicycle: { src: publicAsset('illustrations/concepts/bicycle.webp'), alt: '두 바퀴와 손잡이와 안장이 또렷하게 보이는 파란 어린이 자전거', aspectRatio: '1/1' },
  airplane: { src: publicAsset('illustrations/concepts/airplane.webp'), alt: '구름 사이 하늘을 날며 날개와 엔진이 모두 보이는 여객 비행기', aspectRatio: '1/1' },
  train: { src: publicAsset('illustrations/concepts/train.webp'), alt: '철길 위에서 기관차와 두 객차가 길게 이어진 알록달록한 기차', aspectRatio: '1/1' },
  bus: { src: publicAsset('illustrations/concepts/bus.webp'), alt: '큰 창문과 출입문과 여러 좌석이 보이는 노란색 시내버스', aspectRatio: '1/1' },
  blackboard: { src: publicAsset('illustrations/concepts/blackboard.webp'), alt: '나무 테두리와 분필 받침이 있는 글씨 없는 짙은 초록색 칠판', aspectRatio: '1/1' },
  desk: { src: publicAsset('illustrations/concepts/desk.webp'), alt: '넓은 윗판과 아래쪽 수납공간이 있는 어린이용 나무 책상', aspectRatio: '1/1' },
  'colored-pencils': { src: publicAsset('illustrations/concepts/colored-pencils.webp'), alt: '빨강부터 보라까지 여섯 가지 색으로 뾰족하게 깎은 색연필', aspectRatio: '1/1' },
  chick: { src: publicAsset('illustrations/concepts/chick.webp'), alt: '주황색 부리와 두 발로 서 있는 작고 복슬복슬한 노란 병아리', aspectRatio: '1/1' },
  gimbap: { src: publicAsset('illustrations/concepts/gimbap.webp'), alt: '김과 밥 속에 달걀과 당근과 채소를 넣고 동그랗게 썬 김밥', aspectRatio: '1/1' },
  tteokbokki: { src: publicAsset('illustrations/concepts/tteokbokki.webp'), alt: '빨간 양념에 둥근 떡과 네모난 어묵이 함께 담긴 떡볶이', aspectRatio: '1/1' },
  corn: { src: publicAsset('illustrations/concepts/corn.webp'), alt: '초록 껍질 사이로 노란 알갱이가 빼곡히 보이는 옥수수 한 자루', aspectRatio: '1/1' },
  sun: { src: publicAsset('illustrations/concepts/sun.webp'), alt: '파란 하늘과 흰 구름 사이에서 둥글고 환하게 빛나는 햇님', aspectRatio: '1/1' },
  moon: { src: publicAsset('illustrations/concepts/moon.webp'), alt: '짙은 밤하늘에서 작은 별들과 함께 빛나는 노란 초승달', aspectRatio: '1/1' },
  starlight: { src: publicAsset('illustrations/concepts/starlight.webp'), alt: '짙은 밤하늘의 커다란 별에서 아래로 환하게 퍼져 나가는 별빛', aspectRatio: '1/1' },
  'flower-garden': { src: publicAsset('illustrations/concepts/flower-garden.webp'), alt: '여러 색깔과 모양의 꽃이 흙 위에 무리 지어 피어 있는 꽃밭', aspectRatio: '1/1' },
  stream: { src: publicAsset('illustrations/concepts/stream.webp'), alt: '가까운 두 풀둑 사이로 돌을 지나 맑고 얕게 흐르는 작은 시냇물', aspectRatio: '1/1' },
  scarf: { src: publicAsset('illustrations/concepts/scarf.webp'), alt: '양쪽 끝에 술이 달리고 부드럽게 포개진 산호색 털실 목도리', aspectRatio: '1/1' },
  gloves: { src: publicAsset('illustrations/concepts/gloves.webp'), alt: '다섯 손가락과 접힌 손목 부분이 보이는 보라색 겨울 장갑 한 쌍', aspectRatio: '1/1' },
  toothpaste: { src: publicAsset('illustrations/concepts/toothpaste.webp'), alt: '민트색 뚜껑의 흰 튜브 옆에 조금 짜 놓은 줄무늬 치약', aspectRatio: '1/1' },
  towel: { src: publicAsset('illustrations/concepts/towel.webp'), alt: '보송보송한 천의 결이 보이도록 단정하게 접어 놓은 민트색 수건', aspectRatio: '1/1' },
  clock: { src: publicAsset('illustrations/concepts/clock.webp'), alt: '열두 개의 눈금과 길이가 다른 두 바늘이 있는 둥근 벽시계', aspectRatio: '1/1' },
  mirror: { src: publicAsset('illustrations/concepts/mirror.webp'), alt: '산호색 테두리와 받침대가 있고 빛이 비치는 타원형 거울', aspectRatio: '1/1' },
  flower: { src: publicAsset('illustrations/concepts/flower.webp'), alt: '초록 줄기와 잎 두 장이 달린 커다란 산호색 꽃 한 송이', aspectRatio: '1/1' },
  father: { src: publicAsset('illustrations/concepts/father.webp'), alt: '파란 스웨터를 입고 다정하게 웃으며 서 있는 아버지', aspectRatio: '1/1' },
  mother: { src: publicAsset('illustrations/concepts/mother.webp'), alt: '산호색 윗옷과 민트색 치마를 입고 웃는 어머니', aspectRatio: '1/1' },
  sister: { src: publicAsset('illustrations/concepts/sister.webp'), alt: '서로 어깨를 감싸고 다정하게 서 있는 언니와 여동생', aspectRatio: '1/1' },
  brother: { src: publicAsset('illustrations/concepts/brother.webp'), alt: '서로 어깨를 감싸고 다정하게 서 있는 형과 남동생', aspectRatio: '1/1' },
  student: { src: publicAsset('illustrations/concepts/student.webp'), alt: '책가방을 메고 학습 공책을 든 초등학생', aspectRatio: '1/1' },
  rabbit: { src: publicAsset('illustrations/concepts/rabbit.webp'), alt: '긴 귀를 쫑긋 세우고 풀밭에 앉아 있는 흰 토끼', aspectRatio: '1/1' },
  monkey: { src: publicAsset('illustrations/concepts/monkey.webp'), alt: '긴 꼬리를 둥글게 말고 나뭇가지에 앉은 갈색 원숭이', aspectRatio: '1/1' },
  chicken: { src: publicAsset('illustrations/concepts/chicken.webp'), alt: '빨간 볏과 날개가 뚜렷하게 보이는 다 자란 닭', aspectRatio: '1/1' },
  giraffe: { src: publicAsset('illustrations/concepts/giraffe.webp'), alt: '긴 목과 갈색 무늬를 가진 노란 기린 한 마리', aspectRatio: '1/1' },
  hamster: { src: publicAsset('illustrations/concepts/hamster.webp'), alt: '둥근 볼에 해바라기씨를 들고 있는 작은 햄스터', aspectRatio: '1/1' },
  orange: { src: publicAsset('illustrations/concepts/orange.webp'), alt: '초록 잎이 달린 오렌지와 속이 보이는 오렌지 반쪽', aspectRatio: '1/1' },
  banana: { src: publicAsset('illustrations/concepts/banana.webp'), alt: '껍질이 온전히 붙어 있는 잘 익은 노란 바나나', aspectRatio: '1/1' },
  cookie: { src: publicAsset('illustrations/concepts/cookie.webp'), alt: '초콜릿 조각이 박힌 동그랗고 노릇한 쿠키 세 개', aspectRatio: '1/1' },
  cheese: { src: publicAsset('illustrations/concepts/cheese.webp'), alt: '동그란 구멍이 여러 개 난 노란 치즈 한 조각', aspectRatio: '1/1' },
  tomato: { src: publicAsset('illustrations/concepts/tomato.webp'), alt: '초록 꼭지가 달린 토마토와 씨가 보이는 토마토 반쪽', aspectRatio: '1/1' },
  noodle: { src: publicAsset('illustrations/concepts/noodle.webp'), alt: '그릇에서 젓가락으로 길게 들어 올린 국수 가락', aspectRatio: '1/1' },
  window: { src: publicAsset('illustrations/concepts/window.webp'), alt: '커튼과 네 칸 유리가 있고 밖의 하늘이 보이는 창문', aspectRatio: '1/1' },
  kitchen: { src: publicAsset('illustrations/concepts/kitchen.webp'), alt: '싱크대와 조리대와 냉장고가 함께 있는 부엌', aspectRatio: '1/1' },
  garden: { src: publicAsset('illustrations/concepts/garden.webp'), alt: '낮은 울타리 안에 꽃과 나무와 오솔길이 있는 집 정원', aspectRatio: '1/1' },
  lesson: { src: publicAsset('illustrations/concepts/lesson.webp'), alt: '선생님의 설명을 들으며 책상에서 배우는 학생들', aspectRatio: '1/1' },
  picture: { src: publicAsset('illustrations/concepts/picture.webp'), alt: '집과 해와 나무를 그린 액자와 곁에 놓인 크레용', aspectRatio: '1/1' },
  summer: { src: publicAsset('illustrations/concepts/summer.webp'), alt: '뜨거운 해와 바다와 모래성이 있는 밝은 여름 해변', aspectRatio: '1/1' },
  winter: { src: publicAsset('illustrations/concepts/winter.webp'), alt: '눈 덮인 땅과 앙상한 나무와 눈송이가 있는 겨울 풍경', aspectRatio: '1/1' },
  'school-field': { src: publicAsset('illustrations/concepts/school-field.webp'), alt: '달리기 길과 축구 골대가 있는 넓은 학교 운동장', aspectRatio: '1/1' },
  cafeteria: { src: publicAsset('illustrations/concepts/cafeteria.webp'), alt: '급식 배식대와 식판과 여러 식탁이 있는 학교 급식실', aspectRatio: '1/1' },
  'art-class': { src: publicAsset('illustrations/concepts/art-class.webp'), alt: '학생들이 붓으로 그리고 색종이를 만드는 미술시간', aspectRatio: '1/1' },
  'school-noticebook': { src: publicAsset('illustrations/concepts/school-noticebook.webp'), alt: '할 일을 표시하는 칸과 연필이 놓인 펼친 알림장', aspectRatio: '1/1' },
  dictation: { src: publicAsset('illustrations/concepts/dictation.webp'), alt: '선생님의 말을 귀 기울여 듣고 공책에 쓰는 받아쓰기', aspectRatio: '1/1' },
  zoo: { src: publicAsset('illustrations/concepts/zoo.webp'), alt: '기린과 코끼리와 얼룩말을 만날 수 있는 동물원', aspectRatio: '1/1' },
  'polar-bear': { src: publicAsset('illustrations/concepts/polar-bear.webp'), alt: '푸른 얼음 위를 걷는 크고 하얀 북극곰', aspectRatio: '1/1' },
  mole: { src: publicAsset('illustrations/concepts/mole.webp'), alt: '넓은 앞발로 흙더미 밖에 얼굴을 내민 갈색 두더지', aspectRatio: '1/1' },
  firefly: { src: publicAsset('illustrations/concepts/firefly.webp'), alt: '밤의 풀밭 위에서 꽁무니를 환하게 밝히는 반딧불이', aspectRatio: '1/1' },
  'spring-breeze': { src: publicAsset('illustrations/concepts/spring-breeze.webp'), alt: '꽃잎과 연한 초록 잎을 한쪽으로 살랑이게 하는 봄바람', aspectRatio: '1/1' },
  'sudden-shower': { src: publicAsset('illustrations/concepts/sudden-shower.webp'), alt: '밝은 하늘 한쪽 먹구름에서 갑자기 세차게 쏟아지는 소나기', aspectRatio: '1/1' },
  snowman: { src: publicAsset('illustrations/concepts/snowman.webp'), alt: '눈덩이 세 개와 당근 코와 나뭇가지 팔로 만든 눈사람', aspectRatio: '1/1' },
  sunflower: { src: publicAsset('illustrations/concepts/sunflower.webp'), alt: '커다란 노란 꽃잎과 갈색 씨앗 가운데가 있는 해바라기', aspectRatio: '1/1' },
  dandelion: { src: publicAsset('illustrations/concepts/dandelion.webp'), alt: '노란 민들레꽃과 씨앗이 날리는 하얀 민들레 홀씨', aspectRatio: '1/1' },
  leaf: { src: publicAsset('illustrations/concepts/leaf.webp'), alt: '줄기와 여러 갈래 잎맥이 선명한 커다란 초록 나뭇잎', aspectRatio: '1/1' },
  'traffic-light': { src: publicAsset('illustrations/concepts/traffic-light.webp'), alt: '빨강 노랑 초록의 둥근 등이 세로로 놓인 신호등', aspectRatio: '1/1' },
  crosswalk: { src: publicAsset('illustrations/concepts/crosswalk.webp'), alt: '사람이 안전하게 길을 건너는 넓은 흰 줄무늬 횡단보도', aspectRatio: '1/1' },
  'post-office': { src: publicAsset('illustrations/concepts/post-office.webp'), alt: '편지 상징과 우편함과 소포가 있는 동네 우체국', aspectRatio: '1/1' },
  'fire-station': { src: publicAsset('illustrations/concepts/fire-station.webp'), alt: '열린 차고에 빨간 소방차가 서 있는 소방서', aspectRatio: '1/1' },
  'appointment-time': { src: publicAsset('illustrations/concepts/appointment-time.webp'), alt: '커다란 시계 곁에서 정한 시각에 서로 만난 두 어린이', aspectRatio: '1/1' },
  grandfather: { src: publicAsset('illustrations/concepts/grandfather.webp'), alt: '회색 머리와 안경을 쓰고 다정하게 웃는 할아버지', aspectRatio: '1/1' },
  grandmother: { src: publicAsset('illustrations/concepts/grandmother.webp'), alt: '짧은 회색 머리와 무늬 겉옷을 입고 웃는 할머니', aspectRatio: '1/1' },
  'younger-cousin': { src: publicAsset('illustrations/concepts/younger-cousin.webp'), alt: '나이가 더 어린 사촌과 마주 앉아 놀이하는 어린이', aspectRatio: '1/1' },
  neighbor: { src: publicAsset('illustrations/concepts/neighbor.webp'), alt: '나란한 두 집의 문 앞에서 서로 반갑게 인사하는 이웃', aspectRatio: '1/1' },
  'rice-ball': { src: publicAsset('illustrations/concepts/rice-ball.webp'), alt: '김과 당근과 채소가 보이게 동그랗게 뭉친 주먹밥 세 개', aspectRatio: '1/1' },
  yogurt: { src: publicAsset('illustrations/concepts/yogurt.webp'), alt: '뚜껑을 열고 숟가락으로 떠 올린 하얀 요구르트', aspectRatio: '1/1' },
  'bean-sprouts': { src: publicAsset('illustrations/concepts/bean-sprouts.webp'), alt: '노란 콩 머리와 하얀 줄기와 잔뿌리가 있는 콩나물', aspectRatio: '1/1' },
  'tangerine-peel': { src: publicAsset('illustrations/concepts/tangerine-peel.webp'), alt: '속살이 드러난 귤 곁에 길게 말려 놓인 주황색 귤껍질', aspectRatio: '1/1' },
  elephant: { src: publicAsset('illustrations/concepts/elephant.webp'), alt: '커다란 귀와 긴 코와 네 다리가 보이는 회색 코끼리', aspectRatio: '1/1' },
  butterfly: { src: publicAsset('illustrations/concepts/butterfly.webp'), alt: '꽃 위에서 무늬가 대칭인 두 날개를 펼친 나비', aspectRatio: '1/1' },
  crocodile: { src: publicAsset('illustrations/concepts/crocodile.webp'), alt: '긴 주둥이와 단단한 등을 가진 물가의 초록 악어', aspectRatio: '1/1' },
  octopus: { src: publicAsset('illustrations/concepts/octopus.webp'), alt: '바닷속에서 여덟 팔을 활짝 펼친 주황색 문어', aspectRatio: '1/1' },
  flamingo: { src: publicAsset('illustrations/concepts/flamingo.webp'), alt: '굽은 목과 긴 한쪽 다리로 얕은 물에 선 분홍 홍학', aspectRatio: '1/1' },
  seahorse: { src: publicAsset('illustrations/concepts/seahorse.webp'), alt: '몸을 세우고 꼬리를 둥글게 만 바닷속 노란 해마', aspectRatio: '1/1' },
  breakfast: { src: publicAsset('illustrations/concepts/breakfast.webp'), alt: '아침 햇살 아래 빵과 달걀과 과일과 우유를 차린 식탁', aspectRatio: '1/1' },
  pancake: { src: publicAsset('illustrations/concepts/pancake.webp'), alt: '노릇한 세 장 위에 과일을 올린 팬케이크', aspectRatio: '1/1' },
  vegetable: { src: publicAsset('illustrations/concepts/vegetable.webp'), alt: '브로콜리와 피망과 당근과 양배추를 담은 채소 바구니', aspectRatio: '1/1' },
  mushroom: { src: publicAsset('illustrations/concepts/mushroom.webp'), alt: '둥근 갓과 굵은 줄기가 있는 갈색과 흰색 버섯', aspectRatio: '1/1' },
  spaghetti: { src: publicAsset('illustrations/concepts/spaghetti.webp'), alt: '토마토소스 긴 면을 포크로 돌돌 만 스파게티', aspectRatio: '1/1' },
  computer: { src: publicAsset('illustrations/concepts/computer.webp'), alt: '모니터와 키보드와 마우스가 놓인 책상 위 컴퓨터', aspectRatio: '1/1' },
  notebook: { src: publicAsset('illustrations/concepts/notebook.webp'), alt: '연필 곁에 펼쳐 놓은 줄이 있는 나선형 공책', aspectRatio: '1/1' },
  question: { src: publicAsset('illustrations/concepts/question.webp'), alt: '두 퍼즐 조각을 보며 답을 궁금해하는 어린이', aspectRatio: '1/1' },
  homework: { src: publicAsset('illustrations/concepts/homework.webp'), alt: '집 책상에서 공책을 펴고 연필로 숙제하는 어린이', aspectRatio: '1/1' },
  language: { src: publicAsset('illustrations/concepts/language.webp'), alt: '말풍선과 그림 기호를 주고받으며 소통하는 두 어린이', aspectRatio: '1/1' },
  science: { src: publicAsset('illustrations/concepts/science.webp'), alt: '돋보기와 식물과 자석과 플라스크로 탐구하는 어린이', aspectRatio: '1/1' },
  calendar: { src: publicAsset('illustrations/concepts/calendar.webp'), alt: '일곱 칸 줄과 일정 표시 점이 있는 한 달 달력', aspectRatio: '1/1' },
  mountain: { src: publicAsset('illustrations/concepts/mountain.webp'), alt: '초록 언덕 위로 높이 솟은 눈 덮인 바위산', aspectRatio: '1/1' },
  sunshine: { src: publicAsset('illustrations/concepts/sunshine.webp'), alt: '구름 사이에서 초원으로 밝게 내려오는 황금빛 햇빛', aspectRatio: '1/1' },
  snowflake: { src: publicAsset('illustrations/concepts/snowflake.webp'), alt: '여섯 갈래 얼음 결정이 대칭으로 뻗은 커다란 눈송이', aspectRatio: '1/1' },
  waterfall: { src: publicAsset('illustrations/concepts/waterfall.webp'), alt: '높은 바위 절벽에서 푸른 웅덩이로 떨어지는 폭포', aspectRatio: '1/1' },
  island: { src: publicAsset('illustrations/concepts/island.webp'), alt: '푸른 바다에 둘러싸인 모래사장과 야자나무의 작은 섬', aspectRatio: '1/1' },
  forest: { src: publicAsset('illustrations/concepts/forest.webp'), alt: '키 큰 나무와 겹겹의 잎이 빽빽하게 이어진 숲', aspectRatio: '1/1' },
  weather: { src: publicAsset('illustrations/concepts/weather.webp'), alt: '해와 구름과 비와 바람이 함께 나타난 날씨 풍경', aspectRatio: '1/1' },
  station: { src: publicAsset('illustrations/concepts/station.webp'), alt: '철길과 도착한 기차와 기다리는 자리가 있는 기차역', aspectRatio: '1/1' },
  museum: { src: publicAsset('illustrations/concepts/museum.webp'), alt: '공룡 뼈와 그림과 옛 항아리를 전시한 박물관', aspectRatio: '1/1' },
  'ice-cream': { src: publicAsset('illustrations/concepts/ice-cream.webp'), alt: '와플 콘 위에 올려 살짝 녹고 있는 아이스크림', aspectRatio: '1/1' },
  'science-experiment': { src: publicAsset('illustrations/concepts/science-experiment.webp'), alt: '보안경을 쓰고 플라스크와 새싹을 관찰하는 과학실험', aspectRatio: '1/1' },
  'sports-day': { src: publicAsset('illustrations/concepts/sports-day.webp'), alt: '바통을 들고 달리며 친구들이 응원하는 학교 체육대회', aspectRatio: '1/1' },
  'class-meeting': { src: publicAsset('illustrations/concepts/class-meeting.webp'), alt: '둥글게 앉아 손을 들고 반 일을 의논하는 학급회의', aspectRatio: '1/1' },
  'school-supplies': { src: publicAsset('illustrations/concepts/school-supplies.webp'), alt: '책가방과 필통과 공책과 자와 가위를 모은 수업 준비물', aspectRatio: '1/1' },
  'reading-log': { src: publicAsset('illustrations/concepts/reading-log.webp'), alt: '읽은 책과 생각 그림을 공책에 남기는 독서기록', aspectRatio: '1/1' },
  'presentation-time': { src: publicAsset('illustrations/concepts/presentation-time.webp'), alt: '그림 자료를 들고 친구들 앞에서 설명하는 발표시간', aspectRatio: '1/1' },
  'morning-sunlight': { src: publicAsset('illustrations/concepts/morning-sunlight.webp'), alt: '아침 창문으로 방 안에 따뜻하게 들어오는 햇살', aspectRatio: '1/1' },
  'sunset-glow': { src: publicAsset('illustrations/concepts/sunset-glow.webp'), alt: '산 뒤로 해가 지며 주황과 보라로 물든 저녁노을', aspectRatio: '1/1' },
  'milky-way': { src: publicAsset('illustrations/concepts/milky-way.webp'), alt: '밤하늘을 길게 가로지르는 수많은 별의 은하수', aspectRatio: '1/1' },
  'water-drop': { src: publicAsset('illustrations/concepts/water-drop.webp'), alt: '초록 잎 위에 둥글고 투명하게 맺힌 푸른 물방울', aspectRatio: '1/1' },
  'pine-cone': { src: publicAsset('illustrations/concepts/pine-cone.webp'), alt: '긴 솔잎이 달린 소나무 가지 아래의 단단한 솔방울', aspectRatio: '1/1' },
  'garden-balsam': { src: publicAsset('illustrations/concepts/garden-balsam.webp'), alt: '분홍 꽃과 길쭉한 씨방이 함께 달린 봉선화', aspectRatio: '1/1' },
  'public-transport': { src: publicAsset('illustrations/concepts/public-transport.webp'), alt: '여러 사람이 함께 이용하는 버스와 지하철과 전차', aspectRatio: '1/1' },
  'seat-belt': { src: publicAsset('illustrations/concepts/seat-belt.webp'), alt: '자동차 좌석에서 어깨와 허리에 안전띠를 맨 어린이', aspectRatio: '1/1' },
  recyclables: { src: publicAsset('illustrations/concepts/recyclables.webp'), alt: '다시 쓸 수 있게 모은 종이와 병과 캔과 플라스틱', aspectRatio: '1/1' },
  'waste-sorting': { src: publicAsset('illustrations/concepts/waste-sorting.webp'), alt: '종이와 병과 캔을 서로 다른 통에 나누어 버리는 어린이', aspectRatio: '1/1' },
  'laundry-basket': { src: publicAsset('illustrations/concepts/laundry-basket.webp'), alt: '옷과 양말과 수건을 가득 담아 둔 빨래 바구니', aspectRatio: '1/1' },
  microwave: { src: publicAsset('illustrations/concepts/microwave.webp'), alt: '안쪽 그릇의 음식을 따뜻하게 데우는 전자레인지', aspectRatio: '1/1' },
  'street-cleaner': { src: publicAsset('illustrations/concepts/street-cleaner.webp'), alt: '안전 조끼를 입고 빗자루로 거리를 깨끗이 돌보는 환경미화원', aspectRatio: '1/1' },
  driver: { src: publicAsset('illustrations/concepts/driver.webp'), alt: '운전대에 두 손을 올리고 안전하게 차를 모는 운전기사', aspectRatio: '1/1' },
  'children-author': { src: publicAsset('illustrations/concepts/children-author.webp'), alt: '그림책을 펼쳐 놓고 어린이 이야기를 쓰는 동화작가', aspectRatio: '1/1' },
  'red-squirrel': { src: publicAsset('illustrations/concepts/red-squirrel.webp'), alt: '긴 귀 털과 붉은 털과 풍성한 꼬리로 나무를 타는 청설모', aspectRatio: '1/1' },
  orangutan: { src: publicAsset('illustrations/concepts/orangutan.webp'), alt: '긴 팔과 붉은 주황 털로 나뭇가지에 앉은 오랑우탄', aspectRatio: '1/1' },
  lizard: { src: publicAsset('illustrations/concepts/lizard.webp'), alt: '비늘과 네 다리와 긴 꼬리가 보이는 바위 위 도마뱀', aspectRatio: '1/1' },
  'stag-beetle': { src: publicAsset('illustrations/concepts/stag-beetle.webp'), alt: '사슴뿔처럼 커다란 턱과 여섯 다리가 있는 사슴벌레', aspectRatio: '1/1' },
  'sea-turtle': { src: publicAsset('illustrations/concepts/sea-turtle.webp'), alt: '넓은 지느러미와 무늬 등껍질로 바다를 헤엄치는 바다거북', aspectRatio: '1/1' },
  'baby-goat': { src: publicAsset('illustrations/concepts/baby-goat.webp'), alt: '작은 뿔과 갈라진 발굽을 가진 하얀 아기염소', aspectRatio: '1/1' },
  'spicy-noodles': { src: publicAsset('illustrations/concepts/spicy-noodles.webp'), alt: '붉은 양념과 오이와 달걀을 넣어 비빈 비빔국수', aspectRatio: '1/1' },
  'candied-sweet-potato': { src: publicAsset('illustrations/concepts/candied-sweet-potato.webp'), alt: '윤기 나는 달콤한 시럽을 입힌 한입 크기 고구마맛탕', aspectRatio: '1/1' },
  'rolled-omelet': { src: publicAsset('illustrations/concepts/rolled-omelet.webp'), alt: '채소 조각을 넣고 노란 달걀을 겹겹이 말아 썬 달걀말이', aspectRatio: '1/1' },
  'seaweed-soup': { src: publicAsset('illustrations/concepts/seaweed-soup.webp'), alt: '진한 초록 미역과 고기 조각을 넣어 따뜻하게 끓인 미역국', aspectRatio: '1/1' },
  'stir-fried-vegetables': { src: publicAsset('illustrations/concepts/stir-fried-vegetables.webp'), alt: '브로콜리와 피망과 당근과 버섯을 함께 볶은 채소볶음', aspectRatio: '1/1' },
  'fruit-salad': { src: publicAsset('illustrations/concepts/fruit-salad.webp'), alt: '딸기와 바나나와 포도와 키위와 귤을 섞은 과일샐러드', aspectRatio: '1/1' },
  strawberry: { src: publicAsset('illustrations/concepts/strawberry.webp'), alt: '초록 잎과 씨앗이 선명하고 속이 보이게 자른 딸기', aspectRatio: '1/1' },
  dictionary: { src: publicAsset('illustrations/concepts/dictionary.webp'), alt: '찾기용 색인과 돋보기가 놓인 두꺼운 사전', aspectRatio: '1/1' },
  restaurant: { src: publicAsset('illustrations/concepts/restaurant.webp'), alt: '손님 식탁과 음식을 나르는 사람이 있는 식당', aspectRatio: '1/1' },
  adventure: { src: publicAsset('illustrations/concepts/adventure.webp'), alt: '배낭을 메고 징검다리를 건너 탐험하는 두 어린이', aspectRatio: '1/1' },
  beautiful: { src: publicAsset('illustrations/concepts/beautiful.webp'), alt: '꽃과 나비가 어우러진 풍경을 감탄하며 보는 어린이', aspectRatio: '1/1' },
  different: { src: publicAsset('illustrations/concepts/different.webp'), alt: '같은 둥근 블록 사이에서 별 모양 블록을 찾는 어린이', aspectRatio: '1/1' },
  important: { src: publicAsset('illustrations/concepts/important.webp'), alt: '여러 종이 중 빛나는 하트 카드를 소중히 지키는 어린이', aspectRatio: '1/1' },
  wonderful: { src: publicAsset('illustrations/concepts/wonderful.webp'), alt: '완성한 모형 다리를 보며 기뻐하는 어린이들', aspectRatio: '1/1' },
  carefully: { src: publicAsset('illustrations/concepts/carefully.webp'), alt: '물이 찬 잔을 두 손으로 조심스럽게 옮기는 어린이', aspectRatio: '1/1' },
  together: { src: publicAsset('illustrations/concepts/together.webp'), alt: '네 어린이가 힘을 모아 큰 퍼즐을 완성하는 모습', aspectRatio: '1/1' },
  sometimes: { src: publicAsset('illustrations/concepts/sometimes.webp'), alt: '여러 날씨 그림 중 일부 날에만 우산을 고르는 어린이', aspectRatio: '1/1' },
  yesterday: { src: publicAsset('illustrations/concepts/yesterday.webp'), alt: '지나간 하루의 장면을 뒤돌아보며 떠올리는 어린이', aspectRatio: '1/1' },
  tomorrow: { src: publicAsset('illustrations/concepts/tomorrow.webp'), alt: '다음 날 해돋이를 보며 책가방과 옷을 준비하는 어린이', aspectRatio: '1/1' },
  afternoon: { src: publicAsset('illustrations/concepts/afternoon.webp'), alt: '해가 서쪽으로 기운 운동장에서 집으로 가는 오후 풍경', aspectRatio: '1/1' },
  wednesday: { src: publicAsset('illustrations/concepts/wednesday.webp'), alt: '일주일 일곱 칸 가운데 네 번째 칸을 표시한 주간 달력', aspectRatio: '1/1' },
  scientist: { src: publicAsset('illustrations/concepts/scientist.webp'), alt: '현미경과 안전한 실험 도구를 관찰하는 과학자', aspectRatio: '1/1' },
  musician: { src: publicAsset('illustrations/concepts/musician.webp'), alt: '바이올린을 연주하며 음악을 들려주는 음악가', aspectRatio: '1/1' },
  engineer: { src: publicAsset('illustrations/concepts/engineer.webp'), alt: '다리 모형과 톱니바퀴를 측정하고 살피는 기술자', aspectRatio: '1/1' },
  librarian: { src: publicAsset('illustrations/concepts/librarian.webp'), alt: '책장에서 알맞은 책을 찾아 어린이에게 건네는 도서관 사서', aspectRatio: '1/1' },
  environment: { src: publicAsset('illustrations/concepts/environment.webp'), alt: '공기와 물과 흙과 동식물을 함께 돌보는 환경', aspectRatio: '1/1' },
  earthquake: { src: publicAsset('illustrations/concepts/earthquake.webp'), alt: '땅이 흔들릴 때 튼튼한 책상 아래 몸을 보호하는 어린이', aspectRatio: '1/1' },
  temperature: { src: publicAsset('illustrations/concepts/temperature.webp'), alt: '따뜻한 해와 차가운 눈송이 사이의 커다란 온도계', aspectRatio: '1/1' },
  electricity: { src: publicAsset('illustrations/concepts/electricity.webp'), alt: '건전지와 전선과 스위치가 전구를 밝히는 안전한 전기 회로', aspectRatio: '1/1' },
  ecosystem: { src: publicAsset('illustrations/concepts/ecosystem.webp'), alt: '연못의 식물과 곤충과 개구리와 물고기와 새가 연결된 생태계', aspectRatio: '1/1' },
  recycling: { src: publicAsset('illustrations/concepts/recycling.webp'), alt: '사용한 종이와 병이 새 물건으로 돌아오는 재활용 과정', aspectRatio: '1/1' },
  continent: { src: publicAsset('illustrations/concepts/continent.webp'), alt: '넓은 바다 사이 여러 모양의 큰 땅이 보이는 지구본', aspectRatio: '1/1' },
  universe: { src: publicAsset('illustrations/concepts/universe.webp'), alt: '여러 은하와 별과 성운과 행성이 넓게 펼쳐진 우주', aspectRatio: '1/1' },
  supermarket: { src: publicAsset('illustrations/concepts/supermarket.webp'), alt: '넓은 식품 진열대와 카트와 계산대가 있는 대형 마트', aspectRatio: '1/1' },
  bookstore: { src: publicAsset('illustrations/concepts/bookstore.webp'), alt: '판매용 책 진열대와 계산대가 있는 아늑한 서점', aspectRatio: '1/1' },
  helicopter: { src: publicAsset('illustrations/concepts/helicopter.webp'), alt: '큰 회전날개와 꼬리날개와 착륙대가 보이는 헬리콥터', aspectRatio: '1/1' },
  ambulance: { src: publicAsset('illustrations/concepts/ambulance.webp'), alt: '지붕 경광등과 환자용 뒷문이 있는 흰색 구급차', aspectRatio: '1/1' },
  submarine: { src: publicAsset('illustrations/concepts/submarine.webp'), alt: '둥근 창과 프로펠러와 잠망경이 있는 노란 잠수함', aspectRatio: '1/1' },
  spaceship: { src: publicAsset('illustrations/concepts/spaceship.webp'), alt: '지구 곁 우주를 날아가는 창문과 엔진이 있는 우주선', aspectRatio: '1/1' },
  'nature-observation': { src: publicAsset('illustrations/concepts/nature-observation.webp'), alt: '돋보기로 잎과 무당벌레와 꽃을 살펴보는 자연관찰', aspectRatio: '1/1' },
  'field-trip': { src: publicAsset('illustrations/concepts/field-trip.webp'), alt: '선생님과 학생들이 교실 밖 전시를 보며 배우는 현장학습', aspectRatio: '1/1' },
  'group-activity': { src: publicAsset('illustrations/concepts/group-activity.webp'), alt: '네 어린이가 한 모형을 역할을 나누어 만드는 모둠활동', aspectRatio: '1/1' },
  'study-plan': { src: publicAsset('illustrations/concepts/study-plan.webp'), alt: '책과 할 일 그림을 시간 순서로 정리하는 학습계획', aspectRatio: '1/1' },
  'book-discussion': { src: publicAsset('illustrations/concepts/book-discussion.webp'), alt: '같은 책을 읽고 차례로 생각을 나누는 독서토론', aspectRatio: '1/1' },
  'science-museum': { src: publicAsset('illustrations/concepts/science-museum.webp'), alt: '우주선과 행성 모형과 공룡 뼈를 체험하는 과학박물관', aspectRatio: '1/1' },
  'global-warming': { src: publicAsset('illustrations/concepts/global-warming.webp'), alt: '온도 상승과 줄어드는 얼음 곁에서 나무를 심는 지구온난화 그림', aspectRatio: '1/1' },
  'thunder-lightning': { src: publicAsset('illustrations/concepts/thunder-lightning.webp'), alt: '먹구름 아래 번개와 천둥 울림과 비가 함께 나타난 날씨', aspectRatio: '1/1' },
  'sea-level': { src: publicAsset('illustrations/concepts/sea-level.webp'), alt: '바닷가 높이 표시 기둥 가까이 올라온 바닷물 표면', aspectRatio: '1/1' },
  'freshwater-fish': { src: publicAsset('illustrations/concepts/freshwater-fish.webp'), alt: '돌과 갈대가 있는 맑은 강에서 헤엄치는 민물고기', aspectRatio: '1/1' },
  'forest-protection': { src: publicAsset('illustrations/concepts/forest-protection.webp'), alt: '묘목에 물을 주고 쓰레기를 주우며 숲을 지키는 어린이들', aspectRatio: '1/1' },
  'traffic-safety': { src: publicAsset('illustrations/concepts/traffic-safety.webp'), alt: '신호를 기다린 뒤 횡단보도로 안전하게 건너는 어린이와 어른', aspectRatio: '1/1' },
  'personal-information': { src: publicAsset('illustrations/concepts/personal-information.webp'), alt: '얼굴 카드와 지문을 자물쇠와 방패로 보호하는 개인정보', aspectRatio: '1/1' },
  'emergency-contacts': { src: publicAsset('illustrations/concepts/emergency-contacts.webp'), alt: '가족과 선생님과 도움 주는 사람에게 전화가 이어진 비상연락망', aspectRatio: '1/1' },
  'daily-habits': { src: publicAsset('illustrations/concepts/daily-habits.webp'), alt: '일어나기부터 양치 식사 공부 잠자기까지 이어지는 생활습관', aspectRatio: '1/1' },
  'energy-saving': { src: publicAsset('illustrations/concepts/energy-saving.webp'), alt: '쓰지 않는 전등과 충전기를 끄고 빼는 에너지절약', aspectRatio: '1/1' },
  'public-facility': { src: publicAsset('illustrations/concepts/public-facility.webp'), alt: '도서관과 공용 화장실과 놀이터를 함께 이용하는 공공시설', aspectRatio: '1/1' },
  'cultural-guide': { src: publicAsset('illustrations/concepts/cultural-guide.webp'), alt: '옛 궁궐 유물을 어린이에게 설명하는 문화해설사', aspectRatio: '1/1' },
  'weather-forecaster': { src: publicAsset('illustrations/concepts/weather-forecaster.webp'), alt: '위성 구름 지도와 날씨 기호를 살피는 기상예보관', aspectRatio: '1/1' },
  paramedic: { src: publicAsset('illustrations/concepts/paramedic.webp'), alt: '의료 가방으로 어린이의 팔을 차분히 살피는 응급구조사', aspectRatio: '1/1' },
  'software-developer': { src: publicAsset('illustrations/concepts/software-developer.webp'), alt: '컴퓨터에서 그림 블록 흐름을 만드는 컴퓨터개발자', aspectRatio: '1/1' },
  'cultural-restorer': { src: publicAsset('illustrations/concepts/cultural-restorer.webp'), alt: '붓과 확대경으로 오래된 장식을 고치는 문화재수리공', aspectRatio: '1/1' },
  'endangered-species': { src: publicAsset('illustrations/concepts/endangered-species.webp'), alt: '보호 구역 안의 호랑이와 바다거북과 두루미 멸종위기종', aspectRatio: '1/1' },
  'migratory-bird-habitat': { src: publicAsset('illustrations/concepts/migratory-bird-habitat.webp'), alt: '습지에서 쉬고 무리 지어 날아가는 철새들의 도래지', aspectRatio: '1/1' },
  'food-chain': { src: publicAsset('illustrations/concepts/food-chain.webp'), alt: '해와 풀과 메뚜기와 개구리와 뱀과 매가 화살표로 이어진 먹이사슬', aspectRatio: '1/1' },
  hibernation: { src: publicAsset('illustrations/concepts/hibernation.webp'), alt: '눈 덮인 굴 안에서 깊이 잠든 곰의 겨울잠', aspectRatio: '1/1' },
  camouflage: { src: publicAsset('illustrations/concepts/camouflage.webp'), alt: '초록 잎과 비슷한 몸빛으로 숨어 있는 잎벌레의 보호색', aspectRatio: '1/1' },
  amphibian: { src: publicAsset('illustrations/concepts/amphibian.webp'), alt: '연못 물과 땅을 오가며 사는 개구리 양서류', aspectRatio: '1/1' },
  nutrients: { src: publicAsset('illustrations/concepts/nutrients.webp'), alt: '여러 음식군이 몸의 힘과 뼈와 근육으로 연결된 영양성분', aspectRatio: '1/1' },
  'fermented-food': { src: publicAsset('illustrations/concepts/fermented-food.webp'), alt: '김치와 된장과 요구르트가 함께 놓인 발효음식', aspectRatio: '1/1' },
  'food-storage': { src: publicAsset('illustrations/concepts/food-storage.webp'), alt: '냉장고와 밀폐 용기와 찬장에 안전하게 둔 식품보관', aspectRatio: '1/1' },
  'seasonal-fruit': { src: publicAsset('illustrations/concepts/seasonal-fruit.webp'), alt: '봄 딸기 여름 수박 가을 사과 겨울 귤을 담은 제철과일', aspectRatio: '1/1' },
  'balanced-meal': { src: publicAsset('illustrations/concepts/balanced-meal.webp'), alt: '밥과 국과 채소와 단백질과 과일을 고루 담은 균형잡힌식사', aspectRatio: '1/1' },
  'traditional-food': { src: publicAsset('illustrations/concepts/traditional-food.webp'), alt: '밥과 국과 김치와 반찬과 떡을 차린 한국 전통음식', aspectRatio: '1/1' }
};

export const questionConceptIds: Readonly<Record<string, ConceptId>> = {
  'en-easy-1': 'apple',
  'en-easy-2': 'water',
  'en-easy-3': 'bread',
  'en-easy-4': 'grape',
  'en-easy-5': 'lemon',
  'en-easy-6': 'pizza',
  'en-easy-7': 'candy',
  'en-easy-8': 'juice',
  'en-easy-9': 'peach',
  'en-easy-10': 'horse',
  'en-easy-11': 'sheep',
  'en-easy-12': 'mouse',
  'en-easy-13': 'panda',
  'en-easy-15': 'whale',
  'en-easy-17': 'snake',
  'en-easy-18': 'chair',
  'en-easy-19': 'paper',
  'en-easy-20': 'ruler',
  'en-easy-21': 'green',
  'en-easy-22': 'white',
  'en-easy-23': 'black',
  'en-easy-24': 'brown',
  'en-easy-25': 'cloud',
  'en-easy-26': 'river',
  'en-easy-27': 'ocean',
  'en-easy-28': 'house',
  'en-easy-29': 'park',
  'en-easy-30': 'store',
  'en-easy-31': 'room',
  'en-easy-32': 'happy',
  'en-easy-33': 'smile',
  'en-easy-34': 'sleep',
  'en-easy-35': 'dance',
  'en-normal-1': 'school',
  'en-normal-3': 'family',
  'en-normal-8': 'friend',
  'en-normal-9': 'teacher',
  'en-normal-30': 'pencil',
  'en-normal-34': 'library',
  'en-normal-37': 'spring',
  'en-normal-38': 'autumn',
  'en-normal-2': 'flower',
  'en-normal-4': 'father',
  'en-normal-5': 'mother',
  'en-normal-6': 'sister',
  'en-normal-7': 'brother',
  'en-normal-10': 'student',
  'en-normal-11': 'rabbit',
  'en-normal-12': 'monkey',
  'en-normal-15': 'chicken',
  'en-normal-16': 'giraffe',
  'en-normal-18': 'hamster',
  'en-normal-19': 'orange',
  'en-normal-20': 'banana',
  'en-normal-22': 'cookie',
  'en-normal-23': 'cheese',
  'en-normal-24': 'tomato',
  'en-normal-26': 'noodle',
  'en-normal-27': 'window',
  'en-normal-28': 'kitchen',
  'en-normal-29': 'garden',
  'en-normal-32': 'lesson',
  'en-normal-33': 'picture',
  'en-normal-35': 'summer',
  'en-normal-36': 'winter',
  'en-hard-1': 'elephant',
  'en-hard-3': 'butterfly',
  'en-hard-4': 'crocodile',
  'en-hard-6': 'octopus',
  'en-hard-7': 'flamingo',
  'en-hard-8': 'seahorse',
  'en-hard-9': 'breakfast',
  'en-hard-11': 'pancake',
  'en-hard-12': 'vegetable',
  'en-hard-14': 'mushroom',
  'en-hard-15': 'spaghetti',
  'en-hard-16': 'computer',
  'en-hard-17': 'notebook',
  'en-hard-18': 'question',
  'en-hard-19': 'homework',
  'en-hard-20': 'language',
  'en-hard-21': 'science',
  'en-hard-22': 'calendar',
  'en-hard-23': 'mountain',
  'en-hard-25': 'sunshine',
  'en-hard-26': 'snowflake',
  'en-hard-27': 'waterfall',
  'en-hard-28': 'island',
  'en-hard-29': 'forest',
  'en-hard-30': 'weather',
  'en-hard-32': 'station',
  'en-hard-33': 'museum',
  'en-hard-31': 'hospital',
  'en-challenge-1': 'strawberry',
  'en-challenge-2': 'dictionary',
  'en-challenge-3': 'restaurant',
  'en-challenge-4': 'adventure',
  'en-challenge-5': 'beautiful',
  'en-challenge-6': 'different',
  'en-challenge-7': 'important',
  'en-challenge-8': 'wonderful',
  'en-challenge-9': 'carefully',
  'en-challenge-10': 'together',
  'en-challenge-11': 'sometimes',
  'en-challenge-12': 'yesterday',
  'en-challenge-13': 'tomorrow',
  'en-challenge-14': 'afternoon',
  'en-challenge-15': 'wednesday',
  'en-challenge-17': 'scientist',
  'en-challenge-19': 'musician',
  'en-challenge-22': 'engineer',
  'en-challenge-23': 'librarian',
  'en-challenge-24': 'environment',
  'en-challenge-25': 'earthquake',
  'en-challenge-26': 'temperature',
  'en-challenge-27': 'electricity',
  'en-challenge-28': 'ecosystem',
  'en-challenge-29': 'recycling',
  'en-challenge-30': 'continent',
  'en-challenge-31': 'universe',
  'en-challenge-33': 'supermarket',
  'en-challenge-35': 'bookstore',
  'en-challenge-36': 'helicopter',
  'en-challenge-37': 'ambulance',
  'en-challenge-38': 'submarine',
  'en-challenge-39': 'spaceship',
  'en-challenge-18': 'firefighter',
  'en-challenge-32': 'playground',
  'en-easy-14': 'tiger',
  'en-easy-16': 'frog',
  'en-normal-14': 'turtle',
  'en-normal-17': 'penguin',
  'en-hard-5': 'squirrel',
  'en-normal-31': 'eraser',
  'en-challenge-34': 'classroom',
  'en-normal-25': 'potato',
  'en-normal-21': 'carrot',
  'en-hard-24': 'rainbow',
  'en-normal-13': 'dolphin',
  'en-hard-2': 'kangaroo',
  'en-hard-10': 'sandwich',
  'en-hard-13': 'chocolate',
  'en-challenge-16': 'astronaut',
  'en-challenge-21': 'veterinarian',
  'en-challenge-20': 'photographer',
  'ko-easy-7': 'teacher',
  'ko-easy-1': 'playground',
  'ko-easy-2': 'car',
  'ko-easy-3': 'bicycle',
  'ko-easy-4': 'airplane',
  'ko-easy-5': 'train',
  'ko-easy-6': 'bus',
  'ko-easy-13': 'tiger',
  'ko-easy-17': 'frog',
  'ko-easy-16': 'turtle',
  'ko-easy-15': 'penguin',
  'ko-easy-14': 'squirrel',
  'ko-easy-8': 'eraser',
  'ko-easy-9': 'blackboard',
  'ko-easy-10': 'classroom',
  'ko-easy-11': 'desk',
  'ko-easy-12': 'colored-pencils',
  'ko-easy-18': 'chick',
  'ko-easy-19': 'gimbap',
  'ko-easy-20': 'tteokbokki',
  'ko-easy-21': 'corn',
  'ko-easy-22': 'potato',
  'ko-easy-23': 'carrot',
  'ko-easy-24': 'rainbow',
  'ko-easy-25': 'sun',
  'ko-easy-26': 'moon',
  'ko-easy-27': 'starlight',
  'ko-easy-28': 'flower-garden',
  'ko-easy-29': 'stream',
  'ko-easy-30': 'scarf',
  'ko-easy-31': 'gloves',
  'ko-easy-32': 'toothpaste',
  'ko-easy-33': 'towel',
  'ko-easy-34': 'clock',
  'ko-easy-35': 'mirror',
  'ko-normal-1': 'library',
  'ko-normal-8': 'dolphin',
  'ko-normal-10': 'kangaroo',
  'ko-normal-23': 'hospital',
  'ko-normal-29': 'chef',
  'ko-normal-30': 'firefighter',
  'ko-normal-32': 'sandwich',
  'ko-normal-35': 'chocolate',
  'ko-normal-2': 'school-field',
  'ko-normal-3': 'cafeteria',
  'ko-normal-4': 'art-class',
  'ko-normal-5': 'school-noticebook',
  'ko-normal-6': 'dictation',
  'ko-normal-7': 'zoo',
  'ko-normal-9': 'polar-bear',
  'ko-normal-11': 'mole',
  'ko-normal-12': 'firefly',
  'ko-normal-13': 'spring-breeze',
  'ko-normal-14': 'sudden-shower',
  'ko-normal-15': 'snowman',
  'ko-normal-16': 'sunflower',
  'ko-normal-17': 'dandelion',
  'ko-normal-18': 'leaf',
  'ko-normal-19': 'traffic-light',
  'ko-normal-20': 'crosswalk',
  'ko-normal-21': 'post-office',
  'ko-normal-22': 'fire-station',
  'ko-normal-24': 'appointment-time',
  'ko-normal-25': 'grandfather',
  'ko-normal-26': 'grandmother',
  'ko-normal-27': 'younger-cousin',
  'ko-normal-28': 'neighbor',
  'ko-normal-31': 'rice-ball',
  'ko-normal-33': 'yogurt',
  'ko-normal-34': 'bean-sprouts',
  'ko-normal-36': 'tangerine-peel',
  'ko-hard-1': 'ice-cream',
  'ko-hard-2': 'science-experiment',
  'ko-hard-3': 'sports-day',
  'ko-hard-4': 'class-meeting',
  'ko-hard-5': 'school-supplies',
  'ko-hard-6': 'reading-log',
  'ko-hard-7': 'presentation-time',
  'ko-hard-8': 'morning-sunlight',
  'ko-hard-9': 'sunset-glow',
  'ko-hard-10': 'milky-way',
  'ko-hard-11': 'water-drop',
  'ko-hard-12': 'pine-cone',
  'ko-hard-13': 'garden-balsam',
  'ko-hard-14': 'public-transport',
  'ko-hard-15': 'seat-belt',
  'ko-hard-16': 'recyclables',
  'ko-hard-17': 'waste-sorting',
  'ko-hard-18': 'laundry-basket',
  'ko-hard-19': 'microwave',
  'ko-hard-22': 'street-cleaner',
  'ko-hard-23': 'driver',
  'ko-hard-24': 'children-author',
  'ko-hard-26': 'red-squirrel',
  'ko-hard-27': 'orangutan',
  'ko-hard-28': 'lizard',
  'ko-hard-29': 'stag-beetle',
  'ko-hard-30': 'sea-turtle',
  'ko-hard-31': 'baby-goat',
  'ko-hard-32': 'spicy-noodles',
  'ko-hard-33': 'candied-sweet-potato',
  'ko-hard-34': 'rolled-omelet',
  'ko-hard-35': 'seaweed-soup',
  'ko-hard-36': 'stir-fried-vegetables',
  'ko-hard-37': 'fruit-salad',
  'ko-hard-20': 'veterinarian',
  'ko-hard-21': 'astronaut',
  'ko-hard-25': 'photographer',
  'ko-challenge-1': 'nature-observation',
  'ko-challenge-2': 'field-trip',
  'ko-challenge-3': 'group-activity',
  'ko-challenge-4': 'study-plan',
  'ko-challenge-5': 'book-discussion',
  'ko-challenge-6': 'science-museum',
  'ko-challenge-7': 'global-warming',
  'ko-challenge-8': 'thunder-lightning',
  'ko-challenge-9': 'sea-level',
  'ko-challenge-10': 'freshwater-fish',
  'ko-challenge-11': 'forest-protection',
  'ko-challenge-12': 'ecosystem',
  'ko-challenge-13': 'traffic-safety',
  'ko-challenge-14': 'personal-information',
  'ko-challenge-15': 'emergency-contacts',
  'ko-challenge-16': 'daily-habits',
  'ko-challenge-17': 'energy-saving',
  'ko-challenge-18': 'public-facility',
  'ko-challenge-19': 'cultural-guide',
  'ko-challenge-20': 'weather-forecaster',
  'ko-challenge-21': 'paramedic',
  'ko-challenge-22': 'librarian',
  'ko-challenge-23': 'software-developer',
  'ko-challenge-24': 'cultural-restorer',
  'ko-challenge-25': 'endangered-species',
  'ko-challenge-26': 'migratory-bird-habitat',
  'ko-challenge-27': 'food-chain',
  'ko-challenge-28': 'hibernation',
  'ko-challenge-29': 'camouflage',
  'ko-challenge-30': 'amphibian',
  'ko-challenge-31': 'nutrients',
  'ko-challenge-32': 'fermented-food',
  'ko-challenge-33': 'food-storage',
  'ko-challenge-34': 'seasonal-fruit',
  'ko-challenge-35': 'balanced-meal',
  'ko-challenge-36': 'traditional-food'
};

export const memoryPairConceptIds: Readonly<Record<string, ConceptId>> = {
  e01: 'apple', e03: 'happy', e05: 'puppy', e08: 'library',
  e02: 'school', e04: 'friend', e06: 'family', e07: 'teacher',
  e09: 'morning', e10: 'evening', e11: 'spring', e12: 'autumn',
  k01: 'puppy', k02: 'apple', k05: 'library', k09: 'happy',
  k03: 'pencil', k04: 'umbrella', k06: 'hospital', k07: 'firefighter',
  k08: 'chef', k10: 'wise', k11: 'strong', k12: 'kind',
  k13: 'morning', k14: 'evening', k15: 'spring', k16: 'autumn',
  k17: 'proverb', k18: 'diary', k19: 'promise', k20: 'courage',
  e13: 'small', e14: 'large', e15: 'fast', e16: 'slow',
  e17: 'laugh', e18: 'listen', e19: 'write', e20: 'learn'
};

export const storySceneVisuals: Readonly<Record<string, VisualAsset>> = {
  'sprout-rain-umbrella-scene-1': {
    src: publicAsset('illustrations/stories/sprout-rain-umbrella/scene-1.png'),
    alt: '학교 앞 길에서 보라색 우산을 든 지우가 먹구름 낀 하늘을 올려다보는 장면',
    aspectRatio: '1/1'
  },
  'sprout-rain-umbrella-scene-2': {
    src: publicAsset('illustrations/stories/sprout-rain-umbrella/scene-2.png'),
    alt: '비가 내리자 지우가 보라색 우산을 펴고 걷는 장면',
    aspectRatio: '1/1'
  },
  'sprout-rain-umbrella-scene-3': {
    src: publicAsset('illustrations/stories/sprout-rain-umbrella/scene-3.png'),
    alt: '지우와 민수가 보라색 우산 하나를 함께 쓰고 웃으며 걷는 장면',
    aspectRatio: '1/1'
  },
  'sprout-lost-mitten-scene-1': {
    src: publicAsset('illustrations/stories/sprout-lost-mitten/scene-1.png'),
    alt: '놀이터에서 유나가 빨간 장갑 한 짝을 잃어버린 것을 알아차린 장면',
    aspectRatio: '1/1'
  },
  'sprout-lost-mitten-scene-2': {
    src: publicAsset('illustrations/stories/sprout-lost-mitten/scene-2.png'),
    alt: '유나가 미끄럼틀 아래에 떨어진 빨간 장갑을 자세히 찾는 장면',
    aspectRatio: '1/1'
  },
  'sprout-lost-mitten-scene-3': {
    src: publicAsset('illustrations/stories/sprout-lost-mitten/scene-3.png'),
    alt: '잃어버린 장갑을 찾은 유나가 두 손을 들고 활짝 웃는 장면',
    aspectRatio: '1/1'
  },
  'sprout-seed-water-scene-1': {
    src: publicAsset('illustrations/stories/sprout-seed-water/scene-1.png'),
    alt: '하나가 햇빛 드는 창가에서 작은 씨앗을 화분에 심는 장면',
    aspectRatio: '1/1'
  },
  'sprout-seed-water-scene-2': {
    src: publicAsset('illustrations/stories/sprout-seed-water/scene-2.png'),
    alt: '하나가 씨앗을 심은 화분에 물뿌리개로 물을 조금 주는 장면',
    aspectRatio: '1/1'
  },
  'sprout-seed-water-scene-3': {
    src: publicAsset('illustrations/stories/sprout-seed-water/scene-3.png'),
    alt: '화분에서 초록 싹이 올라오자 하나가 기쁘게 바라보는 장면',
    aspectRatio: '1/1'
  },
  'sprout-cookie-share-scene-1': {
    src: publicAsset('illustrations/stories/sprout-cookie-share/scene-1.png'),
    alt: '도윤이 식탁 위 접시에 놓인 동그란 쿠키 하나를 바라보는 장면',
    aspectRatio: '1/1'
  },
  'sprout-cookie-share-scene-2': {
    src: publicAsset('illustrations/stories/sprout-cookie-share/scene-2.png'),
    alt: '도윤이 친구와 나누어 먹으려고 쿠키를 반으로 나누는 장면',
    aspectRatio: '1/1'
  },
  'sprout-cookie-share-scene-3': {
    src: publicAsset('illustrations/stories/sprout-cookie-share/scene-3.png'),
    alt: '도윤과 친구가 쿠키 반쪽씩을 함께 먹으며 웃는 장면',
    aspectRatio: '1/1'
  },
  'sprout-puppy-bowl-scene-1': {
    src: publicAsset('illustrations/stories/sprout-puppy-bowl/scene-1.png'),
    alt: '강아지 콩이가 빈 물그릇 옆에 앉고 서준이 이를 알아차린 장면',
    aspectRatio: '1/1'
  },
  'sprout-puppy-bowl-scene-2': {
    src: publicAsset('illustrations/stories/sprout-puppy-bowl/scene-2.png'),
    alt: '서준이 기다리는 강아지 콩이의 물그릇에 깨끗한 물을 붓는 장면',
    aspectRatio: '1/1'
  },
  'sprout-puppy-bowl-scene-3': {
    src: publicAsset('illustrations/stories/sprout-puppy-bowl/scene-3.png'),
    alt: '콩이가 물을 맛있게 마시고 서준이 곁에서 웃으며 바라보는 장면',
    aspectRatio: '1/1'
  },
  'sprout-night-book-scene-1': {
    src: publicAsset('illustrations/stories/sprout-night-book/scene-1.png'),
    alt: '밤이 되어 조용해진 방에서 소라가 잠옷을 입고 침대에 앉은 장면',
    aspectRatio: '1/1'
  },
  'sprout-night-book-scene-2': {
    src: publicAsset('illustrations/stories/sprout-night-book/scene-2.png'),
    alt: '엄마가 침대 곁에서 그림책을 펼쳐 소라에게 읽어 주는 장면',
    aspectRatio: '1/1'
  },
  'sprout-night-book-scene-3': {
    src: publicAsset('illustrations/stories/sprout-night-book/scene-3.png'),
    alt: '소라가 그림책 이야기를 떠올리며 포근한 이불 속에서 잠든 장면',
    aspectRatio: '1/1'
  },
  'step-library-book-scene-1': {
    src: publicAsset('illustrations/stories/step-library-book/scene-1.png'),
    alt: '하린이가 어린이 도서관 책장에서 초록색 공룡 책을 골라 꺼내는 장면',
    aspectRatio: '1/1'
  },
  'step-library-book-scene-2': {
    src: publicAsset('illustrations/stories/step-library-book/scene-2.png'),
    alt: '하린이가 도서관 의자에 앉아 초록색 공룡 책을 재미있게 읽는 장면',
    aspectRatio: '1/1'
  },
  'step-library-book-scene-3': {
    src: publicAsset('illustrations/stories/step-library-book/scene-3.png'),
    alt: '하린이가 공룡 책의 번호표와 책장 표시를 차분히 비교하는 장면',
    aspectRatio: '1/1'
  },
  'step-library-book-scene-4': {
    src: publicAsset('illustrations/stories/step-library-book/scene-4.png'),
    alt: '하린이가 초록색 공룡 책을 알맞은 책장 자리에 반듯하게 꽂는 장면',
    aspectRatio: '1/1'
  },
  'step-lunchbox-scene-1': {
    src: publicAsset('illustrations/stories/step-lunchbox/scene-1.png'),
    alt: '수아가 점심시간 교실에서 도시락이 없는 자기 책상을 살펴보는 장면',
    aspectRatio: '1/1'
  },
  'step-lunchbox-scene-2': {
    src: publicAsset('illustrations/stories/step-lunchbox/scene-2.png'),
    alt: '책상 위에 모양이 비슷한 토끼 도시락과 거북이 도시락이 놓인 장면',
    aspectRatio: '1/1'
  },
  'step-lunchbox-scene-3': {
    src: publicAsset('illustrations/stories/step-lunchbox/scene-3.png'),
    alt: '수아가 두 도시락의 이름표와 무늬를 꼼꼼하게 확인하는 장면',
    aspectRatio: '1/1'
  },
  'step-lunchbox-scene-4': {
    src: publicAsset('illustrations/stories/step-lunchbox/scene-4.png'),
    alt: '수아와 친구가 서로의 도시락을 올바르게 바꾸고 함께 웃는 장면',
    aspectRatio: '1/1'
  },
  'step-windy-hat-scene-1': {
    src: publicAsset('illustrations/stories/step-windy-hat/scene-1.png'),
    alt: '운동장에서 갑자기 분 바람에 준호의 파란 별 모자가 날아가는 장면',
    aspectRatio: '1/1'
  },
  'step-windy-hat-scene-2': {
    src: publicAsset('illustrations/stories/step-windy-hat/scene-2.png'),
    alt: '파란 별 모자가 높은 나뭇가지에 걸리고 두 아이가 올려다보는 장면',
    aspectRatio: '1/1'
  },
  'step-windy-hat-scene-3': {
    src: publicAsset('illustrations/stories/step-windy-hat/scene-3.png'),
    alt: '준호와 친구가 긴 막대를 함께 잡고 나뭇가지의 모자를 내리는 장면',
    aspectRatio: '1/1'
  },
  'step-windy-hat-scene-4': {
    src: publicAsset('illustrations/stories/step-windy-hat/scene-4.png'),
    alt: '파란 별 모자를 되찾은 준호와 도와준 친구가 기뻐하며 웃는 장면',
    aspectRatio: '1/1'
  },
  'step-frog-road-scene-1': {
    src: publicAsset('illustrations/stories/step-frog-road/scene-1.png'),
    alt: '노란 우비를 입은 예린이가 젖은 산책로 위 작은 개구리를 발견한 장면',
    aspectRatio: '1/1'
  },
  'step-frog-road-scene-2': {
    src: publicAsset('illustrations/stories/step-frog-road/scene-2.png'),
    alt: '예린이가 다가오는 자전거를 향해 안전하게 멈춤 손짓을 하는 장면',
    aspectRatio: '1/1'
  },
  'step-frog-road-scene-3': {
    src: publicAsset('illustrations/stories/step-frog-road/scene-3.png'),
    alt: '어른이 장갑 낀 두 손으로 작은 개구리를 조심스럽게 옮기는 장면',
    aspectRatio: '1/1'
  },
  'step-frog-road-scene-4': {
    src: publicAsset('illustrations/stories/step-frog-road/scene-4.png'),
    alt: '안전한 풀숲으로 뛰어가는 개구리를 예린이가 기쁘게 바라보는 장면',
    aspectRatio: '1/1'
  },
  'step-morning-clock-scene-1': {
    src: publicAsset('illustrations/stories/step-morning-clock/scene-1.png'),
    alt: '아침 햇살이 드는 방에서 알람시계가 일곱 시를 알리는 장면',
    aspectRatio: '1/1'
  },
  'step-morning-clock-scene-2': {
    src: publicAsset('illustrations/stories/step-morning-clock/scene-2.png'),
    alt: '민재가 세면대 앞에서 거울을 보며 꼼꼼하게 이를 닦는 장면',
    aspectRatio: '1/1'
  },
  'step-morning-clock-scene-3': {
    src: publicAsset('illustrations/stories/step-morning-clock/scene-3.png'),
    alt: '민재가 아침밥을 먹으며 준비물이 든 열린 책가방을 확인하는 장면',
    aspectRatio: '1/1'
  },
  'step-morning-clock-scene-4': {
    src: publicAsset('illustrations/stories/step-morning-clock/scene-4.png'),
    alt: '준비를 마친 민재가 산뜻한 표정으로 책가방을 메고 학교에 가는 장면',
    aspectRatio: '1/1'
  },
  'step-paper-airplane-scene-1': {
    src: publicAsset('illustrations/stories/step-paper-airplane/scene-1.png'),
    alt: '채원이가 바닥에 금방 떨어진 하얀 종이비행기를 바라보는 장면',
    aspectRatio: '1/1'
  },
  'step-paper-airplane-scene-2': {
    src: publicAsset('illustrations/stories/step-paper-airplane/scene-2.png'),
    alt: '채원이가 구겨지고 서로 다른 종이비행기 양쪽 날개를 살펴보는 장면',
    aspectRatio: '1/1'
  },
  'step-paper-airplane-scene-3': {
    src: publicAsset('illustrations/stories/step-paper-airplane/scene-3.png'),
    alt: '채원이가 두 손으로 종이비행기의 양쪽 날개를 반듯하게 펴는 장면',
    aspectRatio: '1/1'
  },
  'step-paper-airplane-scene-4': {
    src: publicAsset('illustrations/stories/step-paper-airplane/scene-4.png'),
    alt: '다시 날린 종이비행기가 운동장 위로 멀리 날아가 채원이가 기뻐하는 장면',
    aspectRatio: '1/1'
  },
  'explorer-bee-garden-scene-1': {
    src: publicAsset('illustrations/stories/explorer-bee-garden/scene-1.png'),
    alt: '다은이가 과학 교실 창가에서 꽃밭 위를 날아가는 벌을 발견한 장면',
    aspectRatio: '1/1'
  },
  'explorer-bee-garden-scene-2': {
    src: publicAsset('illustrations/stories/explorer-bee-garden/scene-2.png'),
    alt: '벌이 꽃밭의 커다란 노란 꽃에 앉아 꿀을 먹고 있는 장면',
    aspectRatio: '1/1'
  },
  'explorer-bee-garden-scene-3': {
    src: publicAsset('illustrations/stories/explorer-bee-garden/scene-3.png'),
    alt: '노란 꽃 위 벌의 다리에 황금빛 꽃가루가 듬뿍 묻어 있는 장면',
    aspectRatio: '1/1'
  },
  'explorer-bee-garden-scene-4': {
    src: publicAsset('illustrations/stories/explorer-bee-garden/scene-4.png'),
    alt: '꽃가루가 묻은 벌이 노란 꽃에서 옆의 분홍 꽃으로 날아가는 장면',
    aspectRatio: '1/1'
  },
  'explorer-bee-garden-scene-5': {
    src: publicAsset('illustrations/stories/explorer-bee-garden/scene-5.png'),
    alt: '다은이가 창가 책상에서 벌과 꽃을 관찰한 내용을 공책에 기록하는 장면',
    aspectRatio: '1/1'
  },
  'explorer-team-poster-scene-1': {
    src: publicAsset('illustrations/stories/explorer-team-poster/scene-1.png'),
    alt: '네 친구가 미술 교실의 큰 종이 앞에서 물 절약 포스터 계획을 나누는 장면',
    aspectRatio: '1/1'
  },
  'explorer-team-poster-scene-2': {
    src: publicAsset('illustrations/stories/explorer-team-poster/scene-2.png'),
    alt: '유진이는 포스터 문구를 쓰고 태호는 수도꼭지 밑그림을 그리는 장면',
    aspectRatio: '1/1'
  },
  'explorer-team-poster-scene-3': {
    src: publicAsset('illustrations/stories/explorer-team-poster/scene-3.png'),
    alt: '나래가 그림을 색칠하고 현우가 물 절약 그림 자료를 찾아 주는 장면',
    aspectRatio: '1/1'
  },
  'explorer-team-poster-scene-4': {
    src: publicAsset('illustrations/stories/explorer-team-poster/scene-4.png'),
    alt: '네 친구가 포스터를 함께 살펴보며 작은 그림을 더 크게 고치는 장면',
    aspectRatio: '1/1'
  },
  'explorer-team-poster-scene-5': {
    src: publicAsset('illustrations/stories/explorer-team-poster/scene-5.png'),
    alt: '네 친구가 수도꼭지와 물방울이 그려진 완성 포스터를 들고 웃는 장면',
    aspectRatio: '1/1'
  },
  'explorer-ice-cup-scene-1': {
    src: publicAsset('illustrations/stories/explorer-ice-cup/scene-1.png'),
    alt: '지호가 얼음물 컵 바깥에 송골송골 맺힌 물방울을 발견한 장면',
    aspectRatio: '1/1'
  },
  'explorer-ice-cup-scene-2': {
    src: publicAsset('illustrations/stories/explorer-ice-cup/scene-2.png'),
    alt: '지호가 컵 안의 물이 새는지 궁금해하며 컵의 겉면을 살펴보는 장면',
    aspectRatio: '1/1'
  },
  'explorer-ice-cup-scene-3': {
    src: publicAsset('illustrations/stories/explorer-ice-cup/scene-3.png'),
    alt: '지호가 컵을 닦아 마른 받침에 놓자 바깥 물방울이 다시 생기는 장면',
    aspectRatio: '1/1'
  },
  'explorer-ice-cup-scene-4': {
    src: publicAsset('illustrations/stories/explorer-ice-cup/scene-4.png'),
    alt: '지호가 빈 차가운 컵의 바깥쪽에도 물방울이 생기는 것을 확인하는 장면',
    aspectRatio: '1/1'
  },
  'explorer-ice-cup-scene-5': {
    src: publicAsset('illustrations/stories/explorer-ice-cup/scene-5.png'),
    alt: '지호가 공기 중 수증기가 차가운 컵에서 물방울이 되는 원리를 이해한 장면',
    aspectRatio: '1/1'
  },
  'explorer-bus-seat-scene-1': {
    src: publicAsset('illustrations/stories/explorer-bus-seat/scene-1.png'),
    alt: '학교를 마친 세영이가 보라색 책가방을 메고 사람이 많은 버스에 탄 장면',
    aspectRatio: '1/1'
  },
  'explorer-bus-seat-scene-2': {
    src: publicAsset('illustrations/stories/explorer-bus-seat/scene-2.png'),
    alt: '세영이가 버스에 생긴 빈자리에 앉아 책가방을 무릎에 올려놓은 장면',
    aspectRatio: '1/1'
  },
  'explorer-bus-seat-scene-3': {
    src: publicAsset('illustrations/stories/explorer-bus-seat/scene-3.png'),
    alt: '다음 정류장에서 보라색 지팡이를 짚은 할머니가 버스에 타는 장면',
    aspectRatio: '1/1'
  },
  'explorer-bus-seat-scene-4': {
    src: publicAsset('illustrations/stories/explorer-bus-seat/scene-4.png'),
    alt: '세영이가 일어나 손잡이를 잡고 할머니에게 빈자리를 권하는 장면',
    aspectRatio: '1/1'
  },
  'explorer-bus-seat-scene-5': {
    src: publicAsset('illustrations/stories/explorer-bus-seat/scene-5.png'),
    alt: '자리에 앉은 할머니와 손잡이를 잡은 세영이가 서로 미소 짓는 장면',
    aspectRatio: '1/1'
  },
  'explorer-map-picnic-scene-1': {
    src: publicAsset('illustrations/stories/explorer-map-picnic/scene-1.png'),
    alt: '가족이 공원 입구에서 지도 속 보라색 별표 쉼터를 함께 찾는 장면',
    aspectRatio: '1/1'
  },
  'explorer-map-picnic-scene-2': {
    src: publicAsset('illustrations/stories/explorer-map-picnic/scene-2.png'),
    alt: '가족이 작은 나무다리를 건너 오른쪽으로 굽은 오솔길을 따라가는 장면',
    aspectRatio: '1/1'
  },
  'explorer-map-picnic-scene-3': {
    src: publicAsset('illustrations/stories/explorer-map-picnic/scene-3.png'),
    alt: '가족이 둥근 분수대 옆에서 실제 장소와 펼친 지도를 비교하는 장면',
    aspectRatio: '1/1'
  },
  'explorer-map-picnic-scene-4': {
    src: publicAsset('illustrations/stories/explorer-map-picnic/scene-4.png'),
    alt: '소나무 숲을 지난 가족이 보라색 별표가 있는 쉼터를 발견한 장면',
    aspectRatio: '1/1'
  },
  'explorer-map-picnic-scene-5': {
    src: publicAsset('illustrations/stories/explorer-map-picnic/scene-5.png'),
    alt: '가족이 찾은 쉼터의 나무 탁자에서 샌드위치와 과일을 먹는 장면',
    aspectRatio: '1/1'
  },
  'explorer-apology-vase-scene-1': {
    src: publicAsset('illustrations/stories/explorer-apology-vase/scene-1.png'),
    alt: '재민이가 거실에서 튕긴 공이 화분을 넘어뜨려 흙이 쏟아진 장면',
    aspectRatio: '1/1'
  },
  'explorer-apology-vase-scene-2': {
    src: publicAsset('illustrations/stories/explorer-apology-vase/scene-2.png'),
    alt: '재민이가 넘어진 화분과 쏟아진 흙 앞에서 걱정하며 생각하는 장면',
    aspectRatio: '1/1'
  },
  'explorer-apology-vase-scene-3': {
    src: publicAsset('illustrations/stories/explorer-apology-vase/scene-3.png'),
    alt: '재민이가 엄마에게 넘어진 화분을 가리키며 솔직하게 사과하는 장면',
    aspectRatio: '1/1'
  },
  'explorer-apology-vase-scene-4': {
    src: publicAsset('illustrations/stories/explorer-apology-vase/scene-4.png'),
    alt: '재민이와 엄마가 흙을 함께 치우고 식물을 새 보라색 화분에 옮기는 장면',
    aspectRatio: '1/1'
  },
  'explorer-apology-vase-scene-5': {
    src: publicAsset('illustrations/stories/explorer-apology-vase/scene-5.png'),
    alt: '재민이가 밖에서 공을 들고 엄마와 새끼손가락 약속을 하는 장면',
    aspectRatio: '1/1'
  },
  'thinker-stream-trash-scene-1': {
    src: publicAsset('illustrations/stories/thinker-stream-trash/scene-1.png'),
    alt: '환경 동아리 아이들이 비 온 뒤 느리게 흐르는 학교 옆 개울을 살펴보는 장면',
    aspectRatio: '1/1'
  },
  'thinker-stream-trash-scene-2': {
    src: publicAsset('illustrations/stories/thinker-stream-trash/scene-2.png'),
    alt: '아이들이 개울 가장자리 돌과 갈대에 엉킨 나뭇잎과 비닐을 발견한 장면',
    aspectRatio: '1/1'
  },
  'thinker-stream-trash-scene-3': {
    src: publicAsset('illustrations/stories/thinker-stream-trash/scene-3.png'),
    alt: '아이들이 물에 들어가지 않고 개울 막힘을 촬영해 선생님께 알리는 장면',
    aspectRatio: '1/1'
  },
  'thinker-stream-trash-scene-4': {
    src: publicAsset('illustrations/stories/thinker-stream-trash/scene-4.png'),
    alt: '노란 안전 장비를 갖춘 관리 직원이 긴 집게로 막힌 쓰레기를 치우는 장면',
    aspectRatio: '1/1'
  },
  'thinker-stream-trash-scene-5': {
    src: publicAsset('illustrations/stories/thinker-stream-trash/scene-5.png'),
    alt: '막힌 쓰레기가 사라진 뒤 맑은 개울물이 돌 사이로 다시 흐르는 장면',
    aspectRatio: '1/1'
  },
  'thinker-stream-trash-scene-6': {
    src: publicAsset('illustrations/stories/thinker-stream-trash/scene-6.png'),
    alt: '아이들과 선생님이 깨끗한 개울을 지키는 그림 안내판을 세우는 장면',
    aspectRatio: '1/1'
  },
  'thinker-fair-rules-scene-1': {
    src: publicAsset('illustrations/stories/thinker-fair-rules/scene-1.png'),
    alt: '점심시간 피구에서 공을 잘 던지는 몇몇 아이만 운동장에 오래 남은 장면',
    aspectRatio: '1/1'
  },
  'thinker-fair-rules-scene-2': {
    src: publicAsset('illustrations/stories/thinker-fair-rules/scene-2.png'),
    alt: '공을 피하기 어려운 친구들이 피구 참여를 망설이며 운동장 가장자리에 선 장면',
    aspectRatio: '1/1'
  },
  'thinker-fair-rules-scene-3': {
    src: publicAsset('illustrations/stories/thinker-fair-rules/scene-3.png'),
    alt: '반 친구들이 둥글게 앉아 모두 즐길 수 있는 피구 방법을 제안하는 장면',
    aspectRatio: '1/1'
  },
  'thinker-fair-rules-scene-4': {
    src: publicAsset('illustrations/stories/thinker-fair-rules/scene-4.png'),
    alt: '친구들이 부드러운 보라색 공과 다시 들어오는 규칙으로 피구를 시험하는 장면',
    aspectRatio: '1/1'
  },
  'thinker-fair-rules-scene-5': {
    src: publicAsset('illustrations/stories/thinker-fair-rules/scene-5.png'),
    alt: '경기가 길어지자 친구들이 다시 들어오는 기회를 한 번으로 고치는 장면',
    aspectRatio: '1/1'
  },
  'thinker-fair-rules-scene-6': {
    src: publicAsset('illustrations/stories/thinker-fair-rules/scene-6.png'),
    alt: '규칙을 고친 뒤 반 친구 모두가 운동장에서 즐겁게 피구에 참여하는 장면',
    aspectRatio: '1/1'
  },
  'thinker-solar-oven-scene-1': {
    src: publicAsset('illustrations/stories/thinker-solar-oven/scene-1.png'),
    alt: '과학 모둠이 같은 상자 두 개 안쪽에 은박지를 붙여 햇빛 오븐을 만드는 장면',
    aspectRatio: '1/1'
  },
  'thinker-solar-oven-scene-2': {
    src: publicAsset('illustrations/stories/thinker-solar-oven/scene-2.png'),
    alt: '아이들이 두 상자에 같은 크기의 과자와 초콜릿을 똑같이 넣는 장면',
    aspectRatio: '1/1'
  },
  'thinker-solar-oven-scene-3': {
    src: publicAsset('illustrations/stories/thinker-solar-oven/scene-3.png'),
    alt: '같은 상자 하나는 햇빛 드는 벽에 다른 하나는 나무 그늘에 놓은 장면',
    aspectRatio: '1/1'
  },
  'thinker-solar-oven-scene-4': {
    src: publicAsset('illustrations/stories/thinker-solar-oven/scene-4.png'),
    alt: '아이들이 두 상자의 온도계를 살펴보고 그림 표에 비교해 기록하는 장면',
    aspectRatio: '1/1'
  },
  'thinker-solar-oven-scene-5': {
    src: publicAsset('illustrations/stories/thinker-solar-oven/scene-5.png'),
    alt: '햇빛 상자의 초콜릿은 먼저 녹고 그늘 상자의 초콜릿은 단단한 장면',
    aspectRatio: '1/1'
  },
  'thinker-solar-oven-scene-6': {
    src: publicAsset('illustrations/stories/thinker-solar-oven/scene-6.png'),
    alt: '과학 모둠이 햇빛과 높은 온도와 녹은 초콜릿의 관계를 정리하는 장면',
    aspectRatio: '1/1'
  },
  'thinker-rumor-message-scene-1': {
    src: publicAsset('illustrations/stories/thinker-rumor-message/scene-1.png'),
    alt: '민지가 선생님에게 색연필 그림이 있는 준비물 안내 쪽지를 받는 장면',
    aspectRatio: '1/1'
  },
  'thinker-rumor-message-scene-2': {
    src: publicAsset('illustrations/stories/thinker-rumor-message/scene-2.png'),
    alt: '아이들이 준비물을 말로 전달하는 동안 물감 팔레트로 잘못 이해하는 장면',
    aspectRatio: '1/1'
  },
  'thinker-rumor-message-scene-3': {
    src: publicAsset('illustrations/stories/thinker-rumor-message/scene-3.png'),
    alt: '다음 날 몇몇 친구가 물감만 가져와 미술 수업 준비가 늦어진 장면',
    aspectRatio: '1/1'
  },
  'thinker-rumor-message-scene-4': {
    src: publicAsset('illustrations/stories/thinker-rumor-message/scene-4.png'),
    alt: '민지가 원래 쪽지의 색연필 그림을 친구들에게 보여 주며 확인하는 장면',
    aspectRatio: '1/1'
  },
  'thinker-rumor-message-scene-5': {
    src: publicAsset('illustrations/stories/thinker-rumor-message/scene-5.png'),
    alt: '반 친구들이 원래 안내 쪽지와 휴대전화 사진을 함께 비교하는 장면',
    aspectRatio: '1/1'
  },
  'thinker-rumor-message-scene-6': {
    src: publicAsset('illustrations/stories/thinker-rumor-message/scene-6.png'),
    alt: '친구들이 모두 정확한 색연필 준비물을 챙겨 미술 수업을 시작하는 장면',
    aspectRatio: '1/1'
  },
  'thinker-old-tree-scene-1': {
    src: publicAsset('illustrations/stories/thinker-old-tree/scene-1.png'),
    alt: '학생 위원들과 선생님이 운동장 가운데의 오래된 느티나무를 살펴보는 장면',
    aspectRatio: '1/1'
  },
  'thinker-old-tree-scene-2': {
    src: publicAsset('illustrations/stories/thinker-old-tree/scene-2.png'),
    alt: '학생들이 더 넓은 운동 공간이 필요한 까닭을 운동장을 가리키며 설명하는 장면',
    aspectRatio: '1/1'
  },
  'thinker-old-tree-scene-3': {
    src: publicAsset('illustrations/stories/thinker-old-tree/scene-3.png'),
    alt: '학생들이 느티나무의 넓은 그늘과 왼쪽 가지의 새 둥지를 보여 주는 장면',
    aspectRatio: '1/1'
  },
  'thinker-old-tree-scene-4': {
    src: publicAsset('illustrations/stories/thinker-old-tree/scene-4.png'),
    alt: '학생들이 줄자와 표지 원뿔로 나무 주변과 운동 공간의 크기를 재는 장면',
    aspectRatio: '1/1'
  },
  'thinker-old-tree-scene-5': {
    src: publicAsset('illustrations/stories/thinker-old-tree/scene-5.png'),
    alt: '학생들이 느티나무를 피해 달리기 길이 휘어지는 운동장 설계도를 만드는 장면',
    aspectRatio: '1/1'
  },
  'thinker-old-tree-scene-6': {
    src: publicAsset('illustrations/stories/thinker-old-tree/scene-6.png'),
    alt: '느티나무 그늘과 휘어진 달리기 길을 모두 갖춘 새 운동장에서 활동하는 장면',
    aspectRatio: '1/1'
  },
  'thinker-power-outage-scene-1': {
    src: publicAsset('illustrations/stories/thinker-power-outage/scene-1.png'),
    alt: '저녁 식사 중 아파트 불이 갑자기 꺼져 가족이 어둠 속에서 침착하게 모인 장면',
    aspectRatio: '1/1'
  },
  'thinker-power-outage-scene-2': {
    src: publicAsset('illustrations/stories/thinker-power-outage/scene-2.png'),
    alt: '아빠가 촛불 대신 산호색 건전지 손전등을 켜 가족을 비추는 장면',
    aspectRatio: '1/1'
  },
  'thinker-power-outage-scene-3': {
    src: publicAsset('illustrations/stories/thinker-power-outage/scene-3.png'),
    alt: '가족이 휴대전화 관리 안내를 확인하고 어두운 승강기를 이용하지 않는 장면',
    aspectRatio: '1/1'
  },
  'thinker-power-outage-scene-4': {
    src: publicAsset('illustrations/stories/thinker-power-outage/scene-4.png'),
    alt: '가족이 복도에 혼자 있던 이웃 아이를 안심시키고 보호자에게 연락하는 장면',
    aspectRatio: '1/1'
  },
  'thinker-power-outage-scene-5': {
    src: publicAsset('illustrations/stories/thinker-power-outage/scene-5.png'),
    alt: '전기가 돌아온 뒤 어른들이 전열 기구의 전원을 끄고 플러그를 확인하는 장면',
    aspectRatio: '1/1'
  },
  'thinker-power-outage-scene-6': {
    src: publicAsset('illustrations/stories/thinker-power-outage/scene-6.png'),
    alt: '가족이 손전등과 여분 건전지와 구급품을 비상 가방에 넣어 두는 장면',
    aspectRatio: '1/1'
  }
};

export const storyCoverVisuals: Readonly<Record<string, VisualAsset>> = {
  'sprout-rain-umbrella': { src: publicAsset('illustrations/stories/covers/sprout-rain-umbrella.png'), alt: '친구와 우산을 함께 쓰는 이야기 표지', aspectRatio: '1/1' },
  'sprout-lost-mitten': { src: publicAsset('illustrations/stories/covers/sprout-lost-mitten.png'), alt: '빨간 장갑을 찾고 기뻐하는 이야기 표지', aspectRatio: '1/1' },
  'sprout-seed-water': { src: publicAsset('illustrations/stories/covers/sprout-seed-water.png'), alt: '화분에서 초록 싹이 자란 이야기 표지', aspectRatio: '1/1' },
  'sprout-cookie-share': { src: publicAsset('illustrations/stories/covers/sprout-cookie-share.png'), alt: '두 친구가 쿠키를 나누는 이야기 표지', aspectRatio: '1/1' },
  'sprout-puppy-bowl': { src: publicAsset('illustrations/stories/covers/sprout-puppy-bowl.png'), alt: '강아지가 물을 마시는 이야기 표지', aspectRatio: '1/1' },
  'sprout-night-book': { src: publicAsset('illustrations/stories/covers/sprout-night-book.png'), alt: '소라가 포근하게 잠든 이야기 표지', aspectRatio: '1/1' },
  'step-library-book': { src: publicAsset('illustrations/stories/covers/step-library-book.png'), alt: '공룡 책을 제자리에 꽂는 이야기 표지', aspectRatio: '1/1' },
  'step-lunchbox': { src: publicAsset('illustrations/stories/covers/step-lunchbox.png'), alt: '두 친구가 도시락을 바꾸는 이야기 표지', aspectRatio: '1/1' },
  'step-windy-hat': { src: publicAsset('illustrations/stories/covers/step-windy-hat.png'), alt: '친구와 힘을 합쳐 모자를 찾는 이야기 표지', aspectRatio: '1/1' },
  'step-frog-road': { src: publicAsset('illustrations/stories/covers/step-frog-road.png'), alt: '작은 개구리를 안전하게 돕는 이야기 표지', aspectRatio: '1/1' },
  'step-morning-clock': { src: publicAsset('illustrations/stories/covers/step-morning-clock.png'), alt: '순서대로 아침 준비를 마치는 이야기 표지', aspectRatio: '1/1' },
  'step-paper-airplane': { src: publicAsset('illustrations/stories/covers/step-paper-airplane.png'), alt: '고친 종이비행기가 멀리 나는 이야기 표지', aspectRatio: '1/1' },
  'explorer-bee-garden': { src: publicAsset('illustrations/stories/covers/explorer-bee-garden.png'), alt: '벌과 꽃의 관계를 관찰하는 이야기 표지', aspectRatio: '1/1' },
  'explorer-team-poster': { src: publicAsset('illustrations/stories/covers/explorer-team-poster.png'), alt: '네 친구가 환경 포스터를 완성한 이야기 표지', aspectRatio: '1/1' },
  'explorer-ice-cup': { src: publicAsset('illustrations/stories/covers/explorer-ice-cup.png'), alt: '차가운 컵의 물방울을 실험하는 이야기 표지', aspectRatio: '1/1' },
  'explorer-bus-seat': { src: publicAsset('illustrations/stories/covers/explorer-bus-seat.png'), alt: '버스에서 할머니께 자리를 양보한 이야기 표지', aspectRatio: '1/1' },
  'explorer-map-picnic': { src: publicAsset('illustrations/stories/covers/explorer-map-picnic.png'), alt: '지도를 따라 별표 쉼터를 찾은 이야기 표지', aspectRatio: '1/1' },
  'explorer-apology-vase': { src: publicAsset('illustrations/stories/covers/explorer-apology-vase.png'), alt: '깨진 화분을 솔직하게 해결한 이야기 표지', aspectRatio: '1/1' },
  'thinker-stream-trash': { src: publicAsset('illustrations/stories/covers/thinker-stream-trash.png'), alt: '깨끗한 개울을 지키는 환경 이야기 표지', aspectRatio: '1/1' },
  'thinker-fair-rules': { src: publicAsset('illustrations/stories/covers/thinker-fair-rules.png'), alt: '모두 참여하는 피구 규칙을 만든 이야기 표지', aspectRatio: '1/1' },
  'thinker-solar-oven': { src: publicAsset('illustrations/stories/covers/thinker-solar-oven.png'), alt: '햇빛 오븐의 실험 결과를 정리한 이야기 표지', aspectRatio: '1/1' },
  'thinker-rumor-message': { src: publicAsset('illustrations/stories/covers/thinker-rumor-message.png'), alt: '색연필 준비물을 정확히 확인한 이야기 표지', aspectRatio: '1/1' },
  'thinker-old-tree': { src: publicAsset('illustrations/stories/covers/thinker-old-tree.png'), alt: '나무와 달리기 길을 함께 살린 이야기 표지', aspectRatio: '1/1' },
  'thinker-power-outage': { src: publicAsset('illustrations/stories/covers/thinker-power-outage.png'), alt: '정전에 대비해 비상 가방을 준비한 이야기 표지', aspectRatio: '1/1' }
};
