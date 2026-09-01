import { expect, test, type Page } from '@playwright/test';

const SESSION_LENGTH = 5;

const start = async (page: Page, subject: RegExp, mode: RegExp, difficulty?: RegExp) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('numbercal.language-warmup.v1', 'done');
    for (const subjectName of ['korean', 'english']) {
      for (const activity of ['sound-match', 'word-build', 'picture-link', 'sentence-complete']) {
        localStorage.setItem(`numbercal.language-activity-demo.v1:${subjectName}:${activity}`, 'done');
      }
    }
  });
  await page.getByRole('button', { name: subject }).click();
  await page.getByRole('button', { name: mode }).click();
  if (difficulty) await page.getByRole('radio', { name: difficulty }).click();
  await page.getByRole('button', { name: /작은 모험 시작|길게 놀기 시작/ }).click();
};

const finishWithFirstChoices = async (page: Page, startIndex = 0) => {
  for (let index = startIndex; index < SESSION_LENGTH; index += 1) {
    await page.locator('.option-button:not([disabled])').first().click();
    await page.getByRole('button', { name: index === SESSION_LENGTH - 1 ? '오늘 찾은 것 보기' : '다음 친구' }).click();
    if (index < SESSION_LENGTH - 1) {
      await expect(page.getByText(`${index + 2} / ${SESSION_LENGTH}`)).toBeVisible({ timeout: 3000 });
    }
  }
  await expect(page.locator('.result-screen')).toBeVisible({ timeout: 3000 });
};

const answerCurrentAdventureActivity = async (page: Page) => {
  const activity = (await page.locator('.activity-guide strong').innerText()).trim();
  if (await page.locator('.tile-build-board').count()) {
    const tileCount = await page.locator('.tile-slot').count();
    for (let index = 0; index < tileCount; index += 1) {
      await page.locator('.word-tile:not([disabled])').first().click();
    }
    await page.getByRole('button', { name: '완성했어요' }).click();
  } else {
    await page.locator('.activity-option:not([disabled])').first().click();
  }
  return activity;
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
    const rates: number[] = [];
    Object.defineProperty(window, '__spokenForTest', { value: spoken, configurable: true });
    Object.defineProperty(window, '__speechRatesForTest', { value: rates, configurable: true });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: MockUtterance, configurable: true });
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        getVoices: () => [], addEventListener: () => undefined, cancel: () => undefined,
        speak: (utterance: MockUtterance) => {
          spoken.push(utterance.text);
          rates.push(utterance.rate);
          window.setTimeout(() => utterance.onend?.(), 20);
        }
      }
    });
  });
};

test('성장 숲과 길게 누르는 보호자 요약에서 다음 학습 흐름을 확인한다', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.addInitScript(() => {
    const now = '2026-08-29T02:00:00.000Z';
    localStorage.setItem('numbercal.language-mastery.v1', JSON.stringify({ schemaVersion: 1, entries: [
      { key: 'ko-fill:ko-easy-1', wordId: 'ko-easy-1', mode: 'ko-fill', stage: 'mastered', attempts: 4, correctCount: 3, correctStreak: 3, averageResponseMs: 1100, lastSeenAt: now, nextReviewAt: '2026-09-05T02:00:00.000Z' },
      { key: 'en-fill:en-easy-1', wordId: 'en-easy-1', mode: 'en-fill', stage: 'learning', attempts: 2, correctCount: 1, correctStreak: 1, averageResponseMs: 1400, lastSeenAt: now, nextReviewAt: '2026-08-30T02:00:00.000Z' }
    ] }));
    localStorage.setItem('numbercal.skill-mastery.v2', JSON.stringify({ schemaVersion: 2, migratedFromWordMastery: true, entries: [
      { skillId: 'ko-meaning-picture', attempts: 4, independentCorrect: 3, supportedCorrect: 0, recentAccuracy: 1, hintRate: 0.25, lastSeenAt: now, nextReviewAt: '2026-09-05T02:00:00.000Z', confidence: 0.82, recentIndependent: [true, true, true] },
      { skillId: 'ko-syllable-count', attempts: 2, independentCorrect: 1, supportedCorrect: 0, recentAccuracy: 0.5, hintRate: 0.5, lastSeenAt: now, nextReviewAt: '2026-08-30T02:00:00.000Z', confidence: 0.3, recentIndependent: [false, true] }
    ] }));
    localStorage.setItem('numbercal.history.v1', JSON.stringify({ schemaVersion: 1, sessions: [
      { id: 'growth-ko', completedAt: now, config: { subject: 'korean', mode: 'ko-fill', difficulty: 'easy', length: 5, theme: 'animals' }, correctCount: 4, incorrectCount: 1, timeoutCount: 0, totalCount: 5, averageResponseMs: 1200 },
      { id: 'growth-en', completedAt: now, config: { subject: 'english', mode: 'en-fill', difficulty: 'easy', length: 5, theme: 'food' }, correctCount: 3, incorrectCount: 2, timeoutCount: 0, totalCount: 5, averageResponseMs: 1500 }
    ] }));
  });
  await page.goto('/');
  await page.getByRole('button', { name: '나의 성장 숲 열기' }).click();
  await expect(page.getByRole('heading', { name: '오늘 만난 친구' })).toBeVisible();
  await expect(page.getByText('놀이터 · apple')).toBeVisible();
  await expect(page.getByText('도움 뒤에 혼자 찾았어요')).toBeVisible();
  await expect(page.locator('body')).not.toContainText('ko-meaning-picture');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await page.getByRole('button', { name: '보호자' }).click();
  const holdButton = page.getByRole('button', { name: '보호자가 길게 누르기' });
  await holdButton.click();
  await expect(page.getByRole('heading', { name: '다음 도움을 한눈에 살펴보세요' })).toHaveCount(0);
  await holdButton.dispatchEvent('pointerdown', { pointerId: 1, pointerType: 'touch', isPrimary: true });
  await page.waitForTimeout(1600);
  await expect(page.getByRole('heading', { name: '다음 도움을 한눈에 살펴보세요' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '익힌 것' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '연습 중' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '다음 추천' })).toBeVisible();
  await expect(page.getByText('70%')).toBeVisible();
  await expect(page.getByText('놀이터 — 미끄럼틀과 그네가 있는 곳')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('작은 모험 5문제가 기본이고 15문제 긴 모험도 고를 수 있다', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /수학 더하고/ }).click();
  await page.getByRole('button', { name: /^덧셈 / }).click();
  await expect(page.getByRole('radiogroup', { name: '단계' }).getByRole('radio')).toHaveCount(4);
  await expect(page.getByRole('radio', { name: /새싹/ })).toHaveCount(0);
  await expect(page.getByRole('radio', { name: /작은 모험/ })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('radio', { name: /더 길게 놀기/ })).toHaveAttribute('aria-checked', 'false');
  await expect(page.getByLabel('놀이 안내')).toContainText('5개');
  await expect(page.getByLabel('놀이 안내')).toContainText('30초');
  await page.getByRole('button', { name: /작은 모험 시작/ }).click();
  await expect(page.getByText('1 / 5')).toBeVisible();
  await expect(page.getByLabel(/남은 시간 30초/)).toBeVisible();
});

test('첫 언어 놀이는 한 번 탭 연습 뒤 5문제 무타이머로 시작한다', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.removeItem('numbercal.language-warmup.v1'));
  await page.getByRole('button', { name: /한국어 우리말/ }).click();
  await page.getByRole('button', { name: /글자 채우기/ }).click();
  await expect(page.getByRole('radio', { name: /그림친구/ })).toBeVisible();
  await page.getByRole('radio', { name: /맛있는 친구/ }).click();
  await page.getByRole('button', { name: /작은 모험 시작/ }).click();
  await expect(page.getByRole('heading', { name: '그림을 톡 눌러 볼까요?' })).toBeVisible();
  await page.getByRole('button', { name: /맛있는 친구 그림을 누르고/ }).click();
  await expect(page.getByText('1 / 5')).toBeVisible();
  await expect(page.locator('.timer-card')).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('numbercal.language-warmup.v1'))).toBe('done');
});

test('말놀이 탐험에서 그림·소리·조립·문장 활동을 한 화면 흐름으로 만난다', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await installSpeechMock(page);
  await start(page, /한국어 우리말/, /말놀이 탐험/);
  const activities: string[] = [];
  let checkedTileHint = false;
  for (let index = 0; index < SESSION_LENGTH; index += 1) {
    const activity = (await page.locator('.activity-guide strong').innerText()).trim();
    activities.push(activity);
    await expect(page.locator('.timer-card')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    if (activity === '그림 연결') await expect(page.locator('.activity-option-picture').first()).toBeVisible();
    if (activity === '문장 완성') {
      await page.getByRole('button', { name: '문장 다시 듣기' }).click();
      await expect.poll(() => page.evaluate(() => (window as Window & { __speechRatesForTest: number[] }).__speechRatesForTest.at(-1))).toBe(0.85);
      await page.getByRole('button', { name: '느리게 문장 듣기' }).click();
      await expect.poll(() => page.evaluate(() => (window as Window & { __speechRatesForTest: number[] }).__speechRatesForTest.at(-1))).toBe(0.75);
    }
    if (await page.locator('.tile-build-board').count()) {
      const tileCount = await page.locator('.tile-slot').count();
      if (!checkedTileHint) {
        await page.getByRole('button', { name: '힌트 보기' }).click();
        await expect(page.locator('.tile-hint')).toBeVisible();
        checkedTileHint = true;
      }
      for (let tileIndex = 0; tileIndex < tileCount; tileIndex += 1) {
        await page.locator('.word-tile:not([disabled])').first().click();
      }
      await page.getByRole('button', { name: '완성했어요' }).click();
      if (checkedTileHint) {
        await expect.poll(async () => page.evaluate(() => {
          const stored = JSON.parse(localStorage.getItem('numbercal.skill-mastery.v2') ?? 'null');
          return stored?.entries?.some((entry: { hintRate: number }) => entry.hintRate > 0) ?? false;
        })).toBe(true);
      }
    } else {
      await page.locator('.activity-option:not([disabled])').first().click();
    }
    await page.getByRole('button', { name: index === 4 ? '오늘 찾은 것 보기' : '다음 친구' }).click();
  }
  expect(new Set(activities)).toEqual(new Set(['그림 연결', '소리 찾기', '낱말 조립', '문장 완성']));
  expect(activities.every((activity, index) => index === 0 || activity !== activities[index - 1])).toBe(true);
  await expect(page.locator('.result-screen')).toBeVisible();
});

test('처음 만나는 언어 활동은 모리의 정답 시범 뒤 시작한다', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('numbercal.language-warmup.v1', 'done'));
  await page.getByRole('button', { name: /한국어 우리말/ }).click();
  await page.getByRole('button', { name: /말놀이 탐험/ }).click();
  await page.getByRole('button', { name: /작은 모험 시작/ }).click();
  const demo = page.locator('.activity-demo');
  const demoLabel = (await demo.getAttribute('aria-label'))!.replace(/ 연습$/, '');
  await expect(demo).toContainText('모리가 먼저 보여줄게요!');
  await page.getByRole('button', { name: '이제 내가 해볼래요' }).click();
  await expect(page.locator('.activity-guide').getByText(demoLabel, { exact: true })).toBeVisible();
});

test('쓰기모험의 Word Quest도 키보드 없이 네 개의 터치 보기로 시작한다', async ({ page }) => {
  await start(page, /영어 영어 단어/, /Word Quest/, /쓰기모험/);
  await expect(page.locator('.answer-form')).toHaveCount(0);
  const choiceCount = await page.locator('.activity-option').count();
  const tileCount = await page.locator('.word-tile').count();
  expect(choiceCount === 4 || tileCount >= 3).toBe(true);
});
test('Word Quest의 소리가 실패해도 터치 글자 문제 뒤 탐험을 계속한다', async ({ page }) => {
  await page.addInitScript(() => {
    class MockUtterance { constructor(public text: string) {} }
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: MockUtterance, configurable: true });
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: { getVoices: () => [], addEventListener: () => undefined, cancel: () => undefined, speak: () => { throw new Error('speech unavailable'); } }
    });
  });
  await start(page, /영어 영어 단어/, /Word Quest/, /쓰기모험/);
  let usedFallback = false;
  for (let index = 0; index < 4; index += 1) {
    const activity = (await page.locator('.activity-guide strong').innerText()).trim();
    if (activity === '소리 찾기') {
      await page.getByRole('button', { name: '글자 문제로 바꾸기' }).click();
      await expect(page.locator('.answer-form')).toHaveCount(0);
      await expect(page.locator('.option-button')).toHaveCount(4);
      await page.locator('.option-button:not([disabled])').first().click();
      usedFallback = true;
    } else {
      await answerCurrentAdventureActivity(page);
    }
    await page.getByRole('button', { name: '다음 친구' }).click();
    if (usedFallback) break;
  }
  expect(usedFallback).toBe(true);
  await expect(page.locator('.activity-guide')).toBeVisible();
});
test('수학 사칙연산 탭에서 혼합 문제가 출제된다', async ({ page }) => {
  await start(page, /수학 더하고/, /사칙연산/);
  await expect(page.locator('.question-card h1')).toHaveText(/^\d+( [＋+−×] \d+)+ = \?$/);
  await expect(page.locator('.option-button')).toHaveCount(3);
});

test('수학 쉬움 5문제를 풀고 결과의 오답 복습과 저장 기록까지 간다', async ({ page }) => {
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
    await page.getByRole('button', { name: index === SESSION_LENGTH - 1 ? '오늘 찾은 것 보기' : '다음 친구' }).click();
    if (index < SESSION_LENGTH - 1) {
      await expect(page.getByText(`${index + 2} / ${SESSION_LENGTH}`)).toBeVisible({ timeout: 3000 });
    }
  }
  await expect(page.getByRole('heading', { name: '4 / 5' })).toBeVisible({ timeout: 3000 });
  await expect(page.getByLabel('이번 성장 점수')).toContainText('+10 성장 점수');
  await expect(page.locator('.review-card')).toHaveCount(1);
  const reviewCard = page.locator('.review-card').first();
  await expect(reviewCard).toContainText(reviewPrompt);
  await expect(reviewCard).toContainText(selectedWrongAnswer);
  await expect(reviewCard).toContainText(reviewCorrectAnswer);
  await expect(reviewCard.getByText('다시 만난 친구')).toBeVisible();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('numbercal.history.v1') ?? '{}'));
  expect(stored.sessions[0].totalCount).toBe(5);
  expect(stored.sessions[0].incorrectCount).toBe(1);
  expect(stored.sessions[0].reviewItems).toBeUndefined();
  const growth = await page.evaluate(() => JSON.parse(localStorage.getItem('numbercal.growth.v1') ?? '{}'));
  expect(growth.totalXp).toBe(10);
  expect(growth.days[0].completedSections).toEqual(['math']);
});

test('성장 점수가 레벨 경계를 넘으면 축하하고 성장 숲에 반영한다', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('numbercal.growth.v1', JSON.stringify({
      schemaVersion: 1,
      totalXp: 30,
      days: [
        { dateKey: '2026-08-26', completedSections: ['story'], earnedXp: 10, weeklyBonusXp: 0 },
        { dateKey: '2026-08-27', completedSections: ['memory'], earnedXp: 10, weeklyBonusXp: 0 },
        { dateKey: '2026-08-28', completedSections: ['sudoku'], earnedXp: 10, weeklyBonusXp: 0 }
      ]
    }));
  });
  await page.reload();
  await page.getByRole('button', { name: /수학 더하고/ }).click();
  await page.getByRole('button', { name: /^덧셈 / }).click();
  await page.getByRole('button', { name: /작은 모험 시작/ }).click();
  await finishWithFirstChoices(page);
  await expect(page.getByRole('dialog').getByRole('heading', { name: '레벨 2' })).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: '계속하기' }).click();
  await page.getByRole('button', { name: '처음으로' }).click();
  await expect(page.getByRole('button', { name: /성장 숲 열기, 레벨 2/ })).toBeVisible();
  await page.getByRole('button', { name: /성장 숲 열기, 레벨 2/ }).click();
  await expect(page.getByRole('heading', { name: '레벨 2' })).toBeVisible();
  await expect(page.getByLabel('오늘 완료한 9개 섹션')).toContainText('수학');
});

test('영어 오답은 세 문제 간격 뒤 다시 나오고 숙련도에 저장된다', async ({ page }) => {
  await start(page, /영어 영어 단어/, /철자 채우기/, /쓰기모험/);
  await page.getByLabel('내 정답').fill('zzz');
  await page.getByRole('button', { name: '정답 확인' }).click();
  const reviewWord = (await page.locator('.feedback-panel b').innerText()).trim();
  let stored = await page.evaluate(() => JSON.parse(localStorage.getItem('numbercal.language-mastery.v1') ?? '{}'));
  expect(stored.entries[0].stage).toBe('review');
  const skillStored = await page.evaluate(() => JSON.parse(localStorage.getItem('numbercal.skill-mastery.v2') ?? '{}'));
  expect(skillStored.schemaVersion).toBe(2);
  expect(skillStored.entries.length).toBeGreaterThan(0);
  const reviewWordId = stored.entries[0].wordId;

  for (let index = 0; index < 2; index += 1) {
    await page.getByRole('button', { name: '다음 친구' }).click();
    await page.getByLabel('내 정답').fill('zzz');
    await page.getByRole('button', { name: '정답 확인' }).click();
  }
  await page.getByRole('button', { name: '다음 친구' }).click();
  await expect(page.getByText('4 / 5')).toBeVisible();
  const prompt = await page.locator('.question-card h1').innerText();
  const startIndex = Array.from(prompt).indexOf('□');
  const missingLength = Array.from(prompt).filter((letter) => letter === '□').length;
  const missing = Array.from(reviewWord).slice(startIndex, startIndex + missingLength).join('');
  await page.getByLabel('내 정답').fill(missing);
  await page.getByRole('button', { name: '정답 확인' }).click();
  await expect(page.locator('.feedback-correct')).toBeVisible();
  stored = await page.evaluate(() => JSON.parse(localStorage.getItem('numbercal.language-mastery.v1') ?? '{}'));
  const reviewed = stored.entries.find((entry: { wordId: string }) => entry.wordId === reviewWordId);
  expect(reviewed).toMatchObject({ stage: 'learning', correctCount: 1, correctStreak: 1 });
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
    await start(page, scenario.subject, scenario.mode, /쓰기모험/);
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
  const replay = page.getByRole('button', { name: '다시 듣기', exact: true });
  await expect(replay).toBeEnabled({ timeout: 3000 });
  await replay.evaluate((button) => {
    for (let index = 0; index < 5; index += 1) (button as HTMLButtonElement).click();
  });
  await expect(replay).toBeEnabled({ timeout: 3000 });
  const spokenCount = await page.evaluate(() => (window as Window & { __spokenForTest: string[] }).__spokenForTest.length);
  expect(spokenCount).toBe(2);
});

test('단어 듣기는 기본 속도로만 다시 들을 수 있다', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await installSpeechMock(page);
  await page.goto('/');
  await page.getByRole('button', { name: '설정 열기' }).click();
  await page.getByRole('radio', { name: /천천히/ }).click();
  await expect(page.getByRole('radio', { name: /천천히/ })).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('button', { name: '뒤로 가기' }).click();
  await start(page, /영어 영어 단어/, /듣고 고르기/);
  await expect(page.getByRole('button', { name: '다시 듣기', exact: true })).toBeEnabled({ timeout: 3000 });
  await expect(page.getByRole('button', { name: /느리게/ })).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => (window as Window & { __speechRatesForTest: number[] }).__speechRatesForTest.at(-1))).toBe(0.95);
  await page.getByRole('button', { name: '다시 듣기', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as Window & { __speechRatesForTest: number[] }).__speechRatesForTest.at(-1))).toBe(0.95);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
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
  await expect(page.locator('.feedback-panel')).toBeVisible();
  await page.getByRole('button', { name: '다음 친구' }).click();
  await expect(page.getByText('2 / 5')).toBeVisible({ timeout: 3000 });
});

test('정답 공개는 5초 동안 유지되고 다음 친구 버튼으로 바로 넘길 수 있다', async ({ page }) => {
  await start(page, /수학 더하고/, /^덧셈 /);
  await page.locator('.option-button:not([disabled])').first().click();
  await expect(page.locator('.feedback-panel')).toBeVisible();
  await expect(page.getByText('1 / 5')).toBeVisible();
  await expect(page.getByText('5초 뒤 자동으로 넘어가요.')).toBeVisible();

  await page.waitForTimeout(4200);
  await expect(page.locator('.feedback-panel')).toBeVisible();
  await expect(page.getByText('1 / 5')).toBeVisible();

  await page.getByRole('button', { name: '다음 친구' }).click();
  await expect(page.getByText('2 / 5')).toBeVisible({ timeout: 1000 });
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
  await page.getByRole('button', { name: /작은 모험 시작/ }).click();
  await page.reload();
  await expect(page.getByRole('heading', { name: '어린이 학습 놀이터' })).toBeVisible();
});

test('320×568 화면에서 도전 입력 UI가 가로로 넘치지 않는다', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await start(page, /영어 영어 단어/, /철자 채우기/, /쓰기모험/);
  await expect(page.getByLabel('내 정답')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
});

test('모바일 홈은 오늘의 추천과 어린이용 학습 타일을 먼저 보여 준다', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /어린이 학습 놀이터/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /오늘의 추천 (이야기 탐험대|균형 저울|숫자 길 찾기) 시작하기/ })).toBeVisible();
  await expect(page.locator('.home-guide')).toBeVisible();
  await expect(page.locator('.subject-grid .subject-card')).toHaveCount(9);
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
  expect(cards.filter((card) => Math.round(card.top) === rows[2])).toHaveLength(3);
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
