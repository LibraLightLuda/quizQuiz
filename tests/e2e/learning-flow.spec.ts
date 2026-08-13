import { expect, test, type Page } from '@playwright/test';

const finishWithFirstChoices = async (page: Page, total: number, startIndex = 0) => {
  for (let index = startIndex; index < total; index += 1) {
    await page.locator('.option-button:not([disabled])').first().click();
    if (index < total - 1) await expect(page.getByText(`${index + 2} / ${total}`)).toBeVisible({ timeout: 3000 });
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
        getVoices: () => [],
        addEventListener: () => undefined,
        cancel: () => undefined,
        speak: (utterance: MockUtterance) => {
          spoken.push(utterance.text);
          window.setTimeout(() => utterance.onend?.(), 20);
        }
      }
    });
  });
};

test('시나리오 A: 수학 쉬움 10문제를 풀고 결과 화면까지 간다', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /수학 더하고/ }).click();
  await page.getByRole('button', { name: /덧셈/ }).click();
  await page.getByRole('button', { name: /시작할래요/ }).click();

  for (let index = 0; index < 10; index += 1) {
    const prompt = await page.locator('.question-card h1').innerText();
    const values = prompt.match(/\d+/g)!.map(Number);
    const answer = values.reduce((sum, value) => sum + value, 0);
    const answerButton = page.getByRole('button', { name: String(answer), exact: true });
    await answerButton.click();
    await expect(page.getByText(/잘했어요|정답이에요|대단해요|멋져요|최고예요|한 문제 더/).first()).toBeVisible();
    if (index < 9) await expect(page.getByText(`${index + 2} / 10`)).toBeVisible({ timeout: 3000 });
  }

  await expect(page.getByRole('heading', { name: '10 / 10' })).toBeVisible({ timeout: 3000 });
  await expect(page.getByText('맞힌 문제')).toBeVisible();
});

test('한국어와 영어 빈칸 문제가 난이도에 맞는 보기를 만든다', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /한국어 우리말/ }).click();
  await page.getByRole('button', { name: /글자 채우기/ }).click();
  await page.getByRole('radio', { name: /보통 초2/ }).click();
  await page.getByRole('radio', { name: '5문제', exact: true }).click();
  await page.getByRole('button', { name: /시작할래요/ }).click();
  await expect(page.locator('.question-card h1')).toContainText('□');
  await expect(page.locator('.option-button')).toHaveCount(4);

  await page.getByRole('button', { name: '학습 나가기' }).click();
  await page.getByRole('button', { name: '여기까지 하고 나가기' }).click();
  await page.getByRole('button', { name: /영어 영어 단어/ }).click();
  await page.getByRole('button', { name: /철자 채우기/ }).click();
  await page.getByRole('radio', { name: /쉬움 초1/ }).click();
  await page.getByRole('radio', { name: '5문제', exact: true }).click();
  await page.getByRole('button', { name: /시작할래요/ }).click();
  await expect(page.locator('.question-card h1')).toContainText('□');
  await expect(page.locator('.option-button')).toHaveCount(3);
});

test('설정이 새로고침 뒤에도 유지된다', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '설정 열기' }).click();
  const sound = page.getByRole('checkbox', { name: /효과음/ });
  await sound.uncheck({ force: true });
  await page.reload();
  await page.getByRole('button', { name: '설정 열기' }).click();
  await expect(page.getByRole('checkbox', { name: /효과음/ })).not.toBeChecked();
});

test('시나리오 B: 수학 도전 빠르게에서 timeout 뒤 정상 완료한다', async ({ page }) => {
  test.setTimeout(35_000);
  await page.goto('/');
  await page.getByRole('button', { name: /수학 더하고/ }).click();
  await page.getByRole('button', { name: /곱셈/ }).click();
  await page.getByRole('radio', { name: /도전 초4/ }).click();
  await page.getByRole('radio', { name: '5문제', exact: true }).click();
  await page.getByRole('radio', { name: '빠르게', exact: true }).click();
  await page.getByRole('button', { name: /시작할래요/ }).click();
  await expect(page.getByText('시간이 다 되었어요. 정답을 같이 볼까요?', { exact: true })).toBeVisible({ timeout: 14_000 });
  await expect(page.getByText('2 / 5')).toBeVisible({ timeout: 3000 });
  for (let index = 1; index < 5; index += 1) {
    await page.locator('.option-button:not([disabled])').first().click();
    if (index < 4) await expect(page.getByText(`${index + 2} / 5`)).toBeVisible({ timeout: 3000 });
  }
  await expect(page.getByText('시간이 지난 문제 1개')).toBeVisible({ timeout: 3000 });
});

for (const scenario of [
  { name: 'C', subject: /한국어 우리말/, mode: /글자 채우기/, difficulty: /쉬움 초1/ },
  { name: 'D', subject: /한국어 우리말/, mode: /글자 채우기/, difficulty: /도전 초4/ },
  { name: 'E', subject: /영어 영어 단어/, mode: /철자 채우기/, difficulty: /쉬움 초1/ },
  { name: 'F', subject: /영어 영어 단어/, mode: /철자 채우기/, difficulty: /도전 초4/ }
]) {
  test(`시나리오 ${scenario.name}: 언어 빈칸 학습을 정상 완료한다`, async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: scenario.subject }).click();
    await page.getByRole('button', { name: scenario.mode }).click();
    await page.getByRole('radio', { name: scenario.difficulty }).click();
    await page.getByRole('radio', { name: '5문제', exact: true }).click();
    await page.getByRole('button', { name: /시작할래요/ }).click();
    await finishWithFirstChoices(page, 5);
    await expect(page.getByRole('heading', { name: /\d+ \/ 5/ })).toBeVisible();
  });
}

for (const scenario of [
  { name: 'G', subject: /한국어 우리말/, mode: /듣고 고르기/ },
  { name: 'H', subject: /영어 영어 단어/, mode: /듣고 고르기/ }
]) {
  test(`시나리오 ${scenario.name}: 듣기와 다시 듣기가 중첩 없이 동작한다`, async ({ page }) => {
    await installSpeechMock(page);
    await page.goto('/');
    await page.getByRole('button', { name: scenario.subject }).click();
    await page.getByRole('button', { name: scenario.mode }).click();
    await page.getByRole('radio', { name: '5문제', exact: true }).click();
    await page.getByRole('button', { name: /시작할래요/ }).click();
    const replay = page.getByRole('button', { name: '다시 듣기' });
    await expect(replay).toBeEnabled({ timeout: 3000 });
    await replay.evaluate((button) => {
      for (let index = 0; index < 5; index += 1) (button as HTMLButtonElement).click();
    });
    await expect(replay).toBeEnabled({ timeout: 3000 });
    const spokenCount = await page.evaluate(() => (window as Window & { __spokenForTest: string[] }).__spokenForTest.length);
    expect(spokenCount).toBe(2);
    await finishWithFirstChoices(page, 5);
  });
}

test('TTS 호출이 예외를 내도 글자 문제로 안전하게 전환한다', async ({ page }) => {
  await page.addInitScript(() => {
    class MockUtterance { constructor(public text: string) {} }
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: MockUtterance, configurable: true });
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        getVoices: () => [], addEventListener: () => undefined, cancel: () => undefined,
        speak: () => { throw new Error('speech unavailable'); }
      }
    });
  });
  await page.goto('/');
  await page.getByRole('button', { name: /한국어 우리말/ }).click();
  await page.getByRole('button', { name: /듣고 고르기/ }).click();
  await page.getByRole('radio', { name: '5문제', exact: true }).click();
  await page.getByRole('button', { name: /시작할래요/ }).click();
  await expect(page.getByRole('button', { name: '글자 문제로 바꾸기' })).toBeVisible();
  await page.getByRole('button', { name: '글자 문제로 바꾸기' }).click();
  await expect(page.locator('.question-card h1')).toContainText('□');
  await expect(page.locator('.option-button:not([disabled])').first()).toBeEnabled();
});

test('시나리오 I: 서로 다른 보기를 연속 클릭해도 한 문제만 처리한다', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /수학 더하고/ }).click();
  await page.getByRole('button', { name: /덧셈/ }).click();
  await page.getByRole('radio', { name: '5문제', exact: true }).click();
  await page.getByRole('button', { name: /시작할래요/ }).click();
  await page.locator('.option-button:not([disabled])').first().waitFor();
  await page.locator('.option-button').evaluateAll((buttons) => buttons.forEach((button) => (button as HTMLButtonElement).click()));
  await expect(page.getByText('2 / 5')).toBeVisible({ timeout: 3000 });
  await finishWithFirstChoices(page, 5, 1);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('numbercal.history.v1') ?? '{}'));
  expect(stored.sessions[0].totalCount).toBe(5);
  expect(stored.sessions[0].correctCount + stored.sessions[0].incorrectCount + stored.sessions[0].timeoutCount).toBe(5);
});

test('시나리오 J: 진행 중 새로고침하면 손상 없이 홈에서 다시 시작한다', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /수학 더하고/ }).click();
  await page.getByRole('button', { name: /덧셈/ }).click();
  await page.getByRole('button', { name: /시작할래요/ }).click();
  await expect(page.locator('.question-card')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: '어린이 학습 놀이터' })).toBeVisible();
});

test('320×568 화면에서도 문제와 4개 보기가 첫 화면 안에 보인다', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/');
  await page.getByRole('button', { name: /영어 영어 단어/ }).click();
  await page.getByRole('button', { name: /철자 채우기/ }).click();
  await page.getByRole('radio', { name: /도전 초4/ }).click();
  await page.getByRole('radio', { name: '5문제', exact: true }).click();
  await page.getByRole('button', { name: /시작할래요/ }).click();
  const boxes = await page.locator('.option-button').evaluateAll((buttons) => buttons.map((button) => button.getBoundingClientRect().toJSON()));
  expect(boxes).toHaveLength(4);
  expect(Math.max(...boxes.map((box) => box.bottom))).toBeLessThanOrEqual(568);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
});

test('동작 줄이기에서는 정답 confetti를 만들지 않는다', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: /수학 더하고/ }).click();
  await page.getByRole('button', { name: /덧셈/ }).click();
  await page.getByRole('radio', { name: '5문제', exact: true }).click();
  await page.getByRole('button', { name: /시작할래요/ }).click();
  const prompt = await page.locator('.question-card h1').innerText();
  const answer = prompt.match(/\d+/g)!.map(Number).reduce((sum, value) => sum + value, 0);
  await page.getByRole('button', { name: String(answer), exact: true }).click();
  await expect(page.locator('.feedback-panel')).toBeVisible();
  await expect(page.locator('.confetti')).toHaveCount(0);
});

test('손상된 저장 데이터가 있어도 홈 화면이 열린다', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('numbercal.settings.v1', JSON.stringify({ schemaVersion: 1, lastConfig: { mode: 'broken' } }));
    localStorage.setItem('numbercal.history.v1', JSON.stringify({ schemaVersion: 1, sessions: [{ id: 'bad', config: { subject: 'bad' } }] }));
  });
  await page.reload();
  await expect(page.getByRole('heading', { name: '어린이 학습 놀이터' })).toBeVisible();
  await expect(page.locator('.recent-card')).toHaveCount(0);
});
