import { expect, test, type Page } from '@playwright/test';

const records = {
  schemaVersion: 2,
  lastDifficulty: 'starter',
  completedSessions: 0,
  completedPuzzles: 0,
  byDifficulty: {},
  recentSignatures: [],
  dailyBadges: [],
  tutorialCompleted: true
};

const skipTutorial = async (page: Page) => {
  await page.addInitScript((value) => localStorage.setItem('numbercal.balance.records.v1', JSON.stringify(value)), records);
};

const openBalance = async (page: Page) => {
  await page.goto('./');
  await page
    .getByRole('button', { name: '균형 저울 숫자 추로 양쪽을 맞춰요' })
    .click();
};

const solveCurrentPuzzle = async (page: Page) => {
  const solution = await page.evaluate(() => {
    const progress = JSON.parse(localStorage.getItem('numbercal.balance.progress.v1') ?? 'null');
    return progress.puzzles[progress.puzzleIndex].solutionPlacements as Record<string, 'left' | 'right'>;
  });
  for (const [weightId, side] of Object.entries(solution)) {
    await page.locator(`.balance-weight-bank [data-weight-id="${weightId}"]`).click();
    await page.locator(`.balance-drop-button[data-side="${side}"]`).click();
  }
};

test('첫 방문에 규칙을 직접 연습하고 첫 문제로 이동한다', async ({ page }) => {
  await openBalance(page);
  await expect(page.getByRole('heading', { name: '추를 골라 놓아요' })).toBeVisible();
  await page.getByRole('button', { name: /3.*추 고르기/ }).click();
  await page.getByRole('button', { name: '왼쪽에 놓기' }).click();
  await expect(page.getByText(/왼쪽이 2만큼 가벼워요/)).toBeVisible();
  await page.getByRole('button', { name: '기울기를 확인했어요' }).click();
  await page.getByRole('button', { name: '3 추 빼기' }).click();
  await page.getByRole('button', { name: /5.*추 고르기/ }).click();
  await page.getByRole('button', { name: '왼쪽에 놓기' }).click();
  await page.getByRole('button', { name: '첫걸음 시작하기' }).click();
  await expect(page.getByRole('heading', { name: /접시에 추를 놓아/ })).toBeVisible();
  expect((await page.evaluate(() => JSON.parse(localStorage.getItem('numbercal.balance.records.v1') ?? 'null'))).tutorialCompleted).toBe(true);
});

test('첫걸음 다섯 문제를 완주하고 기록과 배지를 저장한다', async ({ page }) => {
  await skipTutorial(page);
  await openBalance(page);
  await page.getByRole('button', { name: /저울 5개 시작/ }).click();
  for (let index = 0; index < 5; index += 1) {
    await solveCurrentPuzzle(page);
    await expect(page.getByText(/균형이에요/)).toBeVisible();
    await page.getByRole('button', { name: index === 4 ? '결과 보기' : '다음 저울' }).click();
  }
  await expect(page.getByRole('heading', { name: '양쪽의 합이 같다는 걸 배웠어요' })).toBeVisible();
  await expect(page.getByText('첫 균형')).toBeVisible();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('numbercal.balance.records.v1') ?? 'null'));
  expect(saved.completedPuzzles).toBe(5);
  expect(saved.byDifficulty.starter.completedSessions).toBe(1);
});

test('쑥쑥 문제를 새로고침 뒤 같은 배치에서 이어 한다', async ({ page }) => {
  await skipTutorial(page);
  await openBalance(page);
  await page.getByRole('radio', { name: /쑥쑥/ }).click();
  await page.getByRole('button', { name: /저울 5개 시작/ }).click();
  const progress = await page.evaluate(() => JSON.parse(localStorage.getItem('numbercal.balance.progress.v1') ?? 'null'));
  const [weightId, side] = Object.entries(progress.puzzles[0].solutionPlacements)[0] as [string, 'left' | 'right'];
  await page.locator(`.balance-weight-bank [data-weight-id="${weightId}"]`).click();
  await page.locator(`.balance-drop-button[data-side="${side}"]`).click();
  await page.reload();
  await page
    .getByRole('button', { name: '균형 저울 숫자 추로 양쪽을 맞춰요' })
    .click();
  await page.getByRole('button', { name: /쑥쑥 이어서 하기/ }).click();
  await expect(page.locator(`[data-weight-id="${weightId}"]`)).toHaveClass(/is-placed/);
});

test('척척 단계와 배지 도감이 320px 화면에서 넘치지 않는다', async ({ page }) => {
  await skipTutorial(page);
  await page.setViewportSize({ width: 320, height: 568 });
  await openBalance(page);
  await expect(page.getByRole('radio', { name: /달인/ })).toBeVisible();
  await page.getByRole('button', { name: /균형 배지 도감/ }).click();
  await expect(page.getByRole('heading', { name: /개 발견/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
});

test('척척은 양쪽 배치를, 달인은 도형 단서를 제공한다', async ({ page }) => {
  await skipTutorial(page);
  await openBalance(page);
  await page.getByRole('radio', { name: /척척/ }).click();
  await page.getByRole('button', { name: /저울 5개 시작/ }).click();
  await expect(page.getByRole('heading', { name: /양쪽 접시에 추를 나누어/ })).toBeVisible();
  await solveCurrentPuzzle(page);
  await expect(page.getByText(/균형이에요/)).toBeVisible();
  await page.getByRole('button', { name: '단계 선택으로 돌아가기' }).click();
  await page.getByRole('radio', { name: /달인/ }).click();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: /저울 5개 시작/ }).click();
  await expect(page.getByText(/별 \+ 별/)).toBeVisible();
  await expect(page.getByRole('button', { name: /별 추/ })).toBeVisible();
});

test('홈은 완료하지 않은 오늘의 균형 활동을 추천한다', async ({ page }) => {
  await page.addInitScript((balanceRecords) => {
    const now = new Date();
    const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    localStorage.setItem('numbercal.story.records.v1', JSON.stringify({ schemaVersion: 1, dailyBadges: [key] }));
    localStorage.setItem('numbercal.balance.records.v1', JSON.stringify(balanceRecords));
  }, records);
  await page.goto('./');
  await expect(page.getByRole('button', { name: '오늘의 추천 균형 저울 시작하기' })).toBeVisible();
});
