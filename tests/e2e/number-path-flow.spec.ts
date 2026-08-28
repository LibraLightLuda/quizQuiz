import { expect, test, type Page } from '@playwright/test';

const records = {
  schemaVersion: 1,
  lastDifficulty: 'starter',
  completedSessions: 0,
  completedPuzzles: 0,
  totalBacktracks: 0,
  hintSessions: 0,
  byDifficulty: {},
  recentSignatures: [],
  dailyBadges: [],
  tutorialCompleted: true
};

const skipTutorial = async (page: Page) => {
  await page.addInitScript((value) => localStorage.setItem('numbercal.number-path.records.v1', JSON.stringify(value)), records);
};

const openNumberPath = async (page: Page) => {
  await page.goto('./');
  await page.getByRole('button', { name: '숫자 길 찾기 숫자를 이어 목표 합을 만들어요' }).click();
};

const expectLoadedImage = async (page: Page, selector: string) => {
  await expect.poll(() => page.locator(selector).evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth === 512)).toBe(true);
};

const solution = async (page: Page): Promise<string[]> => page.evaluate(() => {
  const progress = JSON.parse(localStorage.getItem('numbercal.number-path.progress.v1') ?? 'null');
  return progress.puzzles[progress.puzzleIndex].solutionPath as string[];
});

const solveCurrentPuzzle = async (page: Page) => {
  for (const id of await solution(page)) await page.locator(`[data-cell-id="${id}"]`).click();
  await page.getByRole('button', { name: '길 확인하기' }).click();
};

test('첫 방문에 시작·잇기·되돌리기를 연습하고 첫 문제로 이동한다', async ({ page }) => {
  await openNumberPath(page);
  await expect(page.getByRole('heading', { name: '시작 칸에서 출발해요' })).toBeVisible();
  await page.locator('[data-cell-id="r0c0"]').click();
  await expect(page.getByRole('heading', { name: '바로 옆 숫자를 이어요' })).toBeVisible();
  await page.locator('[data-cell-id="r0c1"]').click();
  await page.getByRole('button', { name: /한 칸 되돌리기/ }).click();
  await page.locator('[data-cell-id="r1c0"]').click();
  await page.getByRole('button', { name: '첫걸음 시작하기' }).click();
  await expect(page.getByRole('heading', { name: /목표 합/ })).toBeVisible();
  expect((await page.evaluate(() => JSON.parse(localStorage.getItem('numbercal.number-path.records.v1') ?? 'null'))).tutorialCompleted).toBe(true);
});

test('첫걸음 다섯 길을 완주하고 기록과 배지를 저장한다', async ({ page }) => {
  await skipTutorial(page);
  await openNumberPath(page);
  await expectLoadedImage(page, '.number-path-hero-image');
  await page.getByRole('button', { name: /숫자 길 5개 시작/ }).click();
  for (let index = 0; index < 5; index += 1) {
    await solveCurrentPuzzle(page);
    await expect(page.getByText(/목표 합과 같아요/)).toBeVisible();
    await page.getByRole('button', { name: index === 4 ? '결과 보기' : '다음 길' }).click();
  }
  await expect(page.getByRole('heading', { name: /숫자를 더하며/ })).toBeVisible();
  await expectLoadedImage(page, '.number-path-result-image');
  await expect(page.getByText('첫 번째 길')).toBeVisible();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('numbercal.number-path.records.v1') ?? 'null'));
  expect(saved.completedPuzzles).toBe(5);
  expect(saved.byDifficulty.starter.completedSessions).toBe(1);
});

test('쑥쑥에서 선택한 경로를 새로고침 뒤 이어 한다', async ({ page }) => {
  await skipTutorial(page);
  await openNumberPath(page);
  await page.getByRole('radio', { name: /쑥쑥/ }).click();
  await page.getByRole('button', { name: /숫자 길 5개 시작/ }).click();
  const first = (await solution(page))[0];
  await page.locator(`[data-cell-id="${first}"]`).click();
  await page.reload();
  await page.getByRole('button', { name: '숫자 길 찾기 숫자를 이어 목표 합을 만들어요' }).click();
  await page.getByRole('button', { name: /쑥쑥 이어서 하기/ }).click();
  await expect(page.locator(`[data-cell-id="${first}"]`)).toHaveClass(/is-selected/);
});

test('대각선과 먼 칸을 막고 힌트는 가능한 다음 칸을 보여 준다', async ({ page }) => {
  await skipTutorial(page);
  await openNumberPath(page);
  await page.getByRole('button', { name: /숫자 길 5개 시작/ }).click();
  const path = await solution(page);
  await page.locator(`[data-cell-id="${path[0]}"]`).click();
  const far = await page.evaluate((startId) => {
    const progress = JSON.parse(localStorage.getItem('numbercal.number-path.progress.v1') ?? 'null');
    const puzzle = progress.puzzles[0];
    const start = puzzle.cells.find((cell: { id: string }) => cell.id === startId);
    return puzzle.cells.find((cell: { row: number; column: number; blocked?: boolean }) => !cell.blocked && Math.abs(cell.row - start.row) + Math.abs(cell.column - start.column) > 1).id;
  }, path[0]);
  await page.locator(`[data-cell-id="${far}"]`).click();
  await expect(page.getByText(/바로 옆의 상하좌우/)).toBeVisible();
  await page.getByRole('button', { name: /힌트/ }).click();
  await page.getByRole('button', { name: /칸 힌트/ }).click();
  await expect(page.locator('.number-path-cell.is-suggested')).toHaveCount(1);
});

test('키보드만으로 현재 숫자 길을 완성한다', async ({ page }) => {
  await skipTutorial(page);
  await openNumberPath(page);
  await page.getByRole('button', { name: /숫자 길 5개 시작/ }).click();
  const path = await solution(page);
  for (const id of path) {
    const cell = page.locator(`[data-cell-id="${id}"]`);
    await cell.focus();
    await cell.press('Enter');
  }
  await page.getByRole('button', { name: '길 확인하기' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText(/목표 합과 같아요/)).toBeVisible();
});

test('손가락과 같은 드래그 동작으로 길을 이을 수 있다', async ({ page }) => {
  await skipTutorial(page);
  await openNumberPath(page);
  await page.getByRole('button', { name: /숫자 길 5개 시작/ }).click();
  const path = await solution(page);
  const start = await page.locator(`[data-cell-id="${path[0]}"]`).boundingBox();
  const end = await page.locator(`[data-cell-id="${path[1]}"]`).boundingBox();
  expect(start).not.toBeNull();
  expect(end).not.toBeNull();
  await page.mouse.move(start!.x + start!.width / 2, start!.y + start!.height / 2);
  await page.mouse.down();
  await page.mouse.move(end!.x + end!.width / 2, end!.y + end!.height / 2, { steps: 5 });
  await page.mouse.up();
  await page.getByRole('button', { name: '길 확인하기' }).click();
  await expect(page.getByText(/목표 합과 같아요/)).toBeVisible();
});

test('달인은 음수·도착점·별칸을 제공하고 320px에서도 넘치지 않는다', async ({ page }) => {
  await skipTutorial(page);
  await page.setViewportSize({ width: 320, height: 568 });
  await openNumberPath(page);
  await page.getByRole('radio', { name: /달인/ }).click();
  await page.getByRole('button', { name: /숫자 길 5개 시작/ }).click();
  await expect(page.getByText('◆ 도착점')).toBeVisible();
  await expect(page.getByText('★ 별칸 통과')).toBeVisible();
  await expect(page.locator('.number-path-cell').filter({ hasText: /−\d/ }).first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  expect(await page.locator('.number-path-cell:not(.is-blocked)').evaluateAll((cells) => cells.every((cell) => cell.getBoundingClientRect().width >= 48 && cell.getBoundingClientRect().height >= 48))).toBe(true);
});

test('동작 줄이기에서도 숫자와 경로 정보를 그대로 제공한다', async ({ page }) => {
  await skipTutorial(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openNumberPath(page);
  await page.getByRole('button', { name: /숫자 길 5개 시작/ }).click();
  await expect(page.locator('.app-shell')).toHaveClass(/reduce-motion/);
  await expect(page.getByText(/현재 합/)).toBeVisible();
  await expect(page.getByRole('grid', { name: '숫자 길 찾기 판' })).toBeVisible();
});

test('다른 오늘 활동을 마치면 홈은 숫자 길 찾기를 추천한다', async ({ page }) => {
  await page.addInitScript((numberPathRecords) => {
    const now = new Date();
    const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    localStorage.setItem('numbercal.story.records.v1', JSON.stringify({ schemaVersion: 1, dailyBadges: [key] }));
    localStorage.setItem('numbercal.balance.records.v1', JSON.stringify({ schemaVersion: 2, dailyBadges: [key] }));
    localStorage.setItem('numbercal.number-path.records.v1', JSON.stringify(numberPathRecords));
  }, records);
  await page.goto('./');
  await expect(page.getByRole('button', { name: '오늘의 추천 숫자 길 찾기 시작하기' })).toBeVisible();
});
