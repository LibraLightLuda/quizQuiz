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

test('수학 쉬움 15문제를 풀고 결과와 저장 기록까지 간다', async ({ page }) => {
  await start(page, /수학 더하고/, /^덧셈 /);
  for (let index = 0; index < SESSION_LENGTH; index += 1) {
    const prompt = await page.locator('.question-card h1').innerText();
    const answer = prompt.match(/\d+/g)!.map(Number).reduce((sum, value) => sum + value, 0);
    await page.getByRole('button', { name: String(answer), exact: true }).click();
    if (index < SESSION_LENGTH - 1) {
      await expect(page.getByText(`${index + 2} / ${SESSION_LENGTH}`)).toBeVisible({ timeout: 3000 });
    }
  }
  await expect(page.getByRole('heading', { name: '15 / 15' })).toBeVisible({ timeout: 3000 });
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('numbercal.history.v1') ?? '{}'));
  expect(stored.sessions[0].totalCount).toBe(15);
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
