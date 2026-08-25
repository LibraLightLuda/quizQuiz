import { expect, test, type Page } from '@playwright/test';

const SESSION_LENGTH = 15;

const start = async (page: Page, subject: RegExp, mode: RegExp, difficulty?: RegExp) => {
  await page.goto('/');
  await page.getByRole('button', { name: subject }).click();
  await page.getByRole('button', { name: mode }).click();
  if (difficulty) await page.getByRole('radio', { name: difficulty }).click();
  await page.getByRole('button', { name: /시작할래요/ }).click();
};

const finishWithFirstChoices = async (page: Page, startIndex = 0) => {
  for (let index = startIndex; index < SESSION_LENGTH; index += 1) {
    await page.locator('.option-button:not([disabled])').first().click();
    if (index < SESSION_LENGTH - 1) {
      await expect(page.getByText(`${index + 2} / ${SESSION_LENGTH}`)).toBeVisible({ timeout: 3000 });
    }
  }
  await expect(page.locator('.result-screen')).toBeVisible({ timeout: 3000 });
};

const installSpeechMock = async (page: Page) => {
  await page.addInitScript(() => {
    class MockUtterance {
      text: string;
      lang = '';
      rate = 1;
      pitch = 1;
      volume = 1;
      voice = null;
      onend?: () => void;
      onerror?: () => void;
      constructor(text: string) { this.text = text; }
    }
    const spoken: string[] = [];
    Object.defineProperty(window, '__spokenForTest', { value: spoken, configurable: true });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: MockUtterance, configurable: true });
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        getVoices: () => [], addEventListener: () => undefined, cancel: () => undefined,
        speak: (utterance: MockUtterance) => {
          spoken.push(utterance.text);
          window.setTimeout(() => utterance.onend?.(), 20);
        }
      }
    });
  });
};

test('문제 수와 시간은 15문제·30초로 고정되고 조절 UI와 새싹이 없다', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /수학 더하고/ }).click();
  await page.getByRole('button', { name: /^덧셈 / }).click();
  await expect(page.getByRole('radio')).toHaveCount(4);
  await expect(page.getByRole('radio', { name: /새싹/ })).toHaveCount(0);
  await expect(page.getByRole('radio', { name: /5문제|10문제|20문제|빠르게|시간 제한 없음/ })).toHaveCount(0);
  await expect(page.getByLabel('학습 규칙')).toContainText('15문제');
  await expect(page.getByLabel('학습 규칙')).toContainText('30초');
  await page.getByRole('button', { name: /시작할래요/ }).click();
  await expect(page.getByText('1 / 15')).toBeVisible();
  await expect(page.getByLabel(/남은 시간 30초/)).toBeVisible();
});

test('수학 사칙연산 탭에서 혼합 문제가 출제된다', async ({ page }) => {
  await start(page, /수학 더하고/, /사칙연산/);
  await expect(page.locator('.question-card h1')).toHaveText(/^\d+( [＋+−×] \d+)+ = \?$/);
  await expect(page.locator('.option-button')).toHaveCount(3);
});

test('수학 쉬움 15문제를 풀고 결과의 오답 복습과 저장 기록까지 간다', async ({ page }) => {
  await start(page, /수학 더하고/, /^덧셈 /);
  let reviewPrompt = '';
  let selectedWrongAnswer = '';
  let reviewCorrectAnswer = '';
  for (let index = 0; index < SESSION_LENGTH; index += 1) {
    const prompt = await page.locator('.question-card h1').innerText();
    const answer = prompt.match(/\d+/g)!.map(Number).reduce((sum, value) => sum + value, 0);
    if (index === 0) {
      const labels = await page.locator('.option-button').allInnerTexts();
      selectedWrongAnswer = labels.find((label) => label.trim() !== String(answer))!.trim();
      reviewPrompt = prompt;
      reviewCorrectAnswer = String(answer);
      await page.getByRole('button', { name: selectedWrongAnswer, exact: true }).click();
    } else {
      await page.getByRole('button', { name: String(answer), exact: true }).click();
    }
    if (index < SESSION_LENGTH - 1) {
      await expect(page.getByText(`${index + 2} / ${SESSION_LENGTH}`)).toBeVisible({ timeout: 3000 });
    }
  }
  await expect(page.getByRole('heading', { name: '14 / 15' })).toBeVisible({ timeout: 3000 });
  await expect(page.locator('.review-card')).toHaveCount(1);
  const reviewCard = page.locator('.review-card').first();
  await expect(reviewCard).toContainText(reviewPrompt);
  await expect(reviewCard).toContainText(selectedWrongAnswer);
  await expect(reviewCard).toContainText(reviewCorrectAnswer);
  await expect(reviewCard.getByText('다시 볼 문제')).toBeVisible();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('numbercal.history.v1') ?? '{}'));
  expect(stored.sessions[0].totalCount).toBe(15);
  expect(stored.sessions[0].incorrectCount).toBe(1);
  expect(stored.sessions[0].reviewItems).toBeUndefined();
});

test('도전 수학은 보기 없이 숫자를 직접 입력해 정답을 맞힌다', async ({ page }) => {
  await start(page, /수학 더하고/, /^곱셈 /, /도전 초4/);
  await expect(page.locator('.option-button')).toHaveCount(0);
  const prompt = await page.locator('.question-card h1').innerText();
  const values = prompt.match(/\d+/g)!.map(Number);
  await page.getByLabel('내 정답').fill(String(values[0] * values[1]));
  await page.getByRole('button', { name: '정답 확인' }).click();
  await expect(page.locator('.feedback-correct')).toBeVisible();
});

for (const scenario of [
  { name: '한국어', subject: /한국어 우리말/, mode: /글자 채우기/ },
  { name: '영어', subject: /영어 영어 단어/, mode: /철자 채우기/ }
]) {
  test(`도전 ${scenario.name}는 보기 없이 글자를 직접 입력한다`, async ({ page }) => {
    await start(page, scenario.subject, scenario.mode, /도전 초4/);
    await expect(page.locator('.option-button')).toHaveCount(0);
    await expect(page.getByLabel('내 정답')).toBeVisible();
    await page.getByLabel('내 정답').fill('테스트');
    await page.getByRole('button', { name: '정답 확인' }).click();
    await expect(page.locator('.feedback-panel')).toBeVisible();
  });
}

test('듣기와 다시 듣기가 중첩 없이 동작한다', async ({ page }) => {
  await installSpeechMock(page);
  await start(page, /한국어 우리말/, /듣고 고르기/);
  const replay = page.getByRole('button', { name: '다시 듣기' });
  await expect(replay).toBeEnabled({ timeout: 3000 });
  await replay.evaluate((button) => {
    for (let index = 0; index < 5; index += 1) (button as HTMLButtonElement).click();
  });
  await expect(replay).toBeEnabled({ timeout: 3000 });
  const spokenCount = await page.evaluate(() => (window as Window & { __spokenForTest: string[] }).__spokenForTest.length);
  expect(spokenCount).toBe(2);
});

test('TTS 호출이 예외를 내도 글자 문제로 안전하게 전환한다', async ({ page }) => {
  await page.addInitScript(() => {
    class MockUtterance { constructor(public text: string) {} }
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: MockUtterance, configurable: true });
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: { getVoices: () => [], addEventListener: () => undefined, cancel: () => undefined, speak: () => { throw new Error('speech unavailable'); } }
    });
  });
  await start(page, /한국어 우리말/, /듣고 고르기/);
  await page.getByRole('button', { name: '글자 문제로 바꾸기' }).click();
  await expect(page.locator('.question-card h1')).toContainText('□');
  await expect(page.locator('.option-button:not([disabled])').first()).toBeEnabled();
});

test('서로 다른 보기를 연속 클릭해도 한 문제만 처리한다', async ({ page }) => {
  await start(page, /수학 더하고/, /^덧셈 /);
  await page.locator('.option-button:not([disabled])').first().waitFor();
  await page.locator('.option-button').evaluateAll((buttons) => buttons.forEach((button) => (button as HTMLButtonElement).click()));
  await expect(page.getByText('2 / 15')).toBeVisible({ timeout: 3000 });
});

test('설정 유지, 새로고침 복구, 동작 줄이기가 안전하게 동작한다', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: '설정 열기' }).click();
  await page.getByRole('checkbox', { name: /효과음/ }).uncheck({ force: true });
  await page.reload();
  await page.getByRole('button', { name: '설정 열기' }).click();
  await expect(page.getByRole('checkbox', { name: /효과음/ })).not.toBeChecked();
  await page.getByRole('button', { name: '뒤로 가기' }).click();
  await page.getByRole('button', { name: /수학 더하고/ }).click();
  await page.getByRole('button', { name: /^덧셈 / }).click();
  await page.getByRole('button', { name: /시작할래요/ }).click();
  await page.reload();
  await expect(page.getByRole('heading', { name: '어린이 학습 놀이터' })).toBeVisible();
});

test('320×568 화면에서 도전 입력 UI가 가로로 넘치지 않는다', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await start(page, /영어 영어 단어/, /철자 채우기/, /도전 초4/);
  await expect(page.getByLabel('내 정답')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
});

test('모바일 홈은 오늘의 추천과 어린이용 학습 타일을 먼저 보여 준다', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /어린이 학습 놀이터/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /오늘의 추천 (이야기 탐험대|균형 저울) 시작하기/ })).toBeVisible();
  await expect(page.locator('.home-guide')).toBeVisible();
  await expect(page.locator('.subject-grid .subject-card')).toHaveCount(7);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});

test('수학 쉬움에는 문제를 바꾸지 않는 수량 그림이 보인다', async ({ page }) => {
  await start(page, /수학 더하고/, /^덧셈 /, /쉬움 초1/);
  const prompt = await page.locator('.question-card h1').innerText();
  await expect(page.locator('.math-visual')).toBeVisible();
  await expect(page.locator('.math-visual')).toHaveAttribute('aria-label', /개와 .*개를 더하는 그림/);
  await expect(page.locator('.math-visual')).toContainText('10칸 모형');
  await expect(page.locator('.question-card h1')).toHaveText(prompt);
});

test('수학 보통은 요청할 때만 자릿값 그림 힌트를 보여 준다', async ({ page }) => {
  await start(page, /수학 더하고/, /^덧셈 /, /보통 초2/);
  const prompt = await page.locator('.question-card h1').innerText();
  await expect(page.locator('.math-visual')).toHaveCount(0);
  const hintButton = page.getByRole('button', { name: '그림 힌트 보기' });
  await expect(hintButton).toHaveAttribute('aria-expanded', 'false');
  await hintButton.click();
  await expect(page.locator('.math-visual')).toBeVisible();
  await expect(page.getByRole('button', { name: '그림 힌트 닫기' })).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('.math-visual')).toContainText('십 묶음');
  await expect(page.locator('.question-card h1')).toHaveText(prompt);
});

test('한국어·영어 개념 그림 284개가 모바일용 크기로 선명하게 열린다', async ({ page }) => {
  await page.goto('/');
  const conceptNames = [
    'apple', 'puppy', 'library', 'happy', 'school', 'friend', 'family', 'teacher',
    'morning', 'evening', 'spring', 'autumn', 'pencil', 'umbrella', 'hospital',
    'firefighter', 'chef', 'wise', 'strong', 'kind', 'proverb', 'diary', 'promise',
    'courage', 'small', 'large', 'fast', 'slow', 'laugh', 'listen', 'write', 'learn',
    'playground', 'tiger', 'frog', 'turtle', 'penguin', 'squirrel', 'eraser', 'classroom',
    'potato', 'carrot', 'rainbow', 'dolphin', 'kangaroo', 'sandwich', 'chocolate',
    'astronaut', 'veterinarian', 'photographer',
    'water', 'bread', 'grape', 'lemon', 'pizza', 'candy', 'juice', 'peach',
    'horse', 'sheep', 'mouse', 'panda', 'whale', 'snake', 'chair', 'paper', 'ruler',
    'green', 'white', 'black', 'brown', 'cloud', 'river', 'ocean', 'house', 'park',
    'store', 'room', 'smile', 'sleep', 'dance',
    'car', 'bicycle', 'airplane', 'train', 'bus', 'blackboard', 'desk', 'colored-pencils',
    'chick', 'gimbap', 'tteokbokki', 'corn', 'sun', 'moon', 'starlight', 'flower-garden',
    'stream', 'scarf', 'gloves', 'toothpaste', 'towel', 'clock', 'mirror',
    'flower', 'father', 'mother', 'sister', 'brother', 'student', 'rabbit', 'monkey',
    'chicken', 'giraffe', 'hamster', 'orange', 'banana', 'cookie', 'cheese', 'tomato',
    'noodle', 'window', 'kitchen', 'garden', 'lesson', 'picture', 'summer', 'winter',
    'school-field', 'cafeteria', 'art-class', 'school-noticebook', 'dictation', 'zoo',
    'polar-bear', 'mole', 'firefly', 'spring-breeze', 'sudden-shower', 'snowman',
    'sunflower', 'dandelion', 'leaf', 'traffic-light', 'crosswalk', 'post-office',
    'fire-station', 'appointment-time', 'grandfather', 'grandmother', 'younger-cousin',
    'neighbor', 'rice-ball', 'yogurt', 'bean-sprouts', 'tangerine-peel',
    'elephant', 'butterfly', 'crocodile', 'octopus', 'flamingo', 'seahorse',
    'breakfast', 'pancake', 'vegetable', 'mushroom', 'spaghetti', 'computer',
    'notebook', 'question', 'homework', 'language', 'science', 'calendar',
    'mountain', 'sunshine', 'snowflake', 'waterfall', 'island', 'forest',
    'weather', 'station', 'museum', 'ice-cream', 'science-experiment', 'sports-day',
    'class-meeting', 'school-supplies', 'reading-log', 'presentation-time',
    'morning-sunlight', 'sunset-glow', 'milky-way', 'water-drop', 'pine-cone',
    'garden-balsam', 'public-transport', 'seat-belt', 'recyclables', 'waste-sorting',
    'laundry-basket', 'microwave', 'street-cleaner', 'driver', 'children-author',
    'red-squirrel', 'orangutan', 'lizard', 'stag-beetle', 'sea-turtle', 'baby-goat',
    'spicy-noodles', 'candied-sweet-potato', 'rolled-omelet', 'seaweed-soup',
    'stir-fried-vegetables', 'fruit-salad',
    'strawberry', 'dictionary', 'restaurant', 'adventure', 'beautiful', 'different',
    'important', 'wonderful', 'carefully', 'together', 'sometimes', 'yesterday',
    'tomorrow', 'afternoon', 'wednesday', 'scientist', 'musician', 'engineer',
    'librarian', 'environment', 'earthquake', 'temperature', 'electricity', 'ecosystem',
    'recycling', 'continent', 'universe', 'supermarket', 'bookstore', 'helicopter',
    'ambulance', 'submarine', 'spaceship', 'nature-observation', 'field-trip',
    'group-activity', 'study-plan', 'book-discussion', 'science-museum', 'global-warming',
    'thunder-lightning', 'sea-level', 'freshwater-fish', 'forest-protection',
    'traffic-safety', 'personal-information', 'emergency-contacts', 'daily-habits',
    'energy-saving', 'public-facility', 'cultural-guide', 'weather-forecaster', 'paramedic',
    'software-developer', 'cultural-restorer', 'endangered-species',
    'migratory-bird-habitat', 'food-chain', 'hibernation', 'camouflage', 'amphibian',
    'nutrients', 'fermented-food', 'food-storage', 'seasonal-fruit', 'balanced-meal',
    'traditional-food'
  ];
  const decoded = await page.evaluate(async (names) => Promise.all(names.map(async (name) => {
    const image = new Image();
    image.src = new URL(`illustrations/concepts/${name}.webp`, document.baseURI).href;
    await image.decode();
    return { name, width: image.naturalWidth, height: image.naturalHeight };
  })), conceptNames);
  expect(decoded).toEqual(conceptNames.map((name) => ({ name, width: 512, height: 512 })));
});

test('PC 홈 화면의 학습 카드가 같은 크기로 3열 정렬된다', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  const cards = await page.locator('.subject-grid .subject-card').evaluateAll((elements) => elements.map((element) => {
    const box = element.getBoundingClientRect();
    return { left: box.left, top: box.top, width: box.width, height: box.height };
  }));

  expect(cards.length).toBeGreaterThanOrEqual(5);
  expect(Math.max(...cards.map((card) => card.width)) - Math.min(...cards.map((card) => card.width))).toBeLessThan(1);
  expect(Math.max(...cards.map((card) => card.height)) - Math.min(...cards.map((card) => card.height))).toBeLessThan(1);

  const rows = [...new Set(cards.map((card) => Math.round(card.top)))];
  expect(rows).toHaveLength(3);
  expect(cards.filter((card) => Math.round(card.top) === rows[0])).toHaveLength(3);
  expect(cards.filter((card) => Math.round(card.top) === rows[1])).toHaveLength(3);
  expect(cards.filter((card) => Math.round(card.top) === rows[2])).toHaveLength(1);
  expect(cards.every((card) => card.left >= 0 && card.left + card.width <= 1280)).toBe(true);
});

test('스도쿠 첫걸음을 저장해 이어 풀고 최고 기록을 남긴다', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /스도쿠 숫자 규칙/ }).click();
  await page.getByRole('button', { name: /첫걸음.*4×4/ }).click();
  await expect(page.getByRole('grid', { name: '4×4 스도쿠 퍼즐' })).toBeVisible();

  const progress = await page.evaluate(() => JSON.parse(localStorage.getItem('numbercal.sudoku.progress.v1') ?? 'null'));
  const firstBlank = progress.puzzle.puzzle.findIndex((cell: number) => cell === 0);
  const row = Math.floor(firstBlank / 4) + 1;
  const column = (firstBlank % 4) + 1;
  await page.getByRole('gridcell', { name: `${row}행 ${column}열, 빈칸` }).click();
  await page.getByRole('button', { name: `숫자 ${progress.puzzle.solution[firstBlank]}`, exact: true }).click();
  await expect.poll(() => page.evaluate((index) => {
    const saved = JSON.parse(localStorage.getItem('numbercal.sudoku.progress.v1') ?? 'null');
    return saved?.grid[index];
  }, firstBlank)).toBe(progress.puzzle.solution[firstBlank]);

  await page.reload();
  await page.getByRole('button', { name: /스도쿠 숫자 규칙/ }).click();
  await page.getByRole('button', { name: /첫걸음 이어서 풀기/ }).click();

  const resumed = await page.evaluate(() => JSON.parse(localStorage.getItem('numbercal.sudoku.progress.v1') ?? 'null'));
  for (let index = 0; index < resumed.grid.length; index += 1) {
    if (resumed.grid[index] !== 0) continue;
    const cellRow = Math.floor(index / 4) + 1;
    const cellColumn = (index % 4) + 1;
    await page.getByRole('gridcell', { name: `${cellRow}행 ${cellColumn}열, 빈칸` }).click();
    await page.getByRole('button', { name: `숫자 ${resumed.puzzle.solution[index]}`, exact: true }).click();
  }

  await expect(page.getByRole('heading', { name: /최고 기록이에요/ })).toBeVisible();
  const storedRecords = await page.evaluate(() => JSON.parse(localStorage.getItem('numbercal.sudoku.records.v1') ?? 'null'));
  expect(storedRecords.byDifficulty.beginner.completedCount).toBe(1);
  expect(await page.evaluate(() => localStorage.getItem('numbercal.sudoku.progress.v1'))).toBeNull();
});

test('320×568 화면에서 스도쿠 터치 UI가 가로로 넘치지 않는다', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/');
  await page.getByRole('button', { name: /스도쿠 숫자 규칙/ }).click();
  await page.getByRole('button', { name: /첫걸음.*4×4/ }).click();
  await expect(page.getByRole('grid', { name: '4×4 스도쿠 퍼즐' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  await expect(page.getByRole('button', { name: '힌트' })).toBeVisible();
});
