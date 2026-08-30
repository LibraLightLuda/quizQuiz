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

const progress = async (page: Page) => page.evaluate(() =>
  JSON.parse(localStorage.getItem('numbercal.number-path.progress.v2') ?? 'null'));

const solution = async (page: Page): Promise<string[]> => {
  await expect.poll(async () => Boolean(await progress(page))).toBe(true);
  const saved = await progress(page);
  return saved.puzzles[saved.puzzleIndex].solutionBridgeIds as string[];
};

const solveCurrentPuzzle = async (page: Page) => {
  for (const id of await solution(page)) await page.locator(`[data-bridge-id="${id}"]`).click();
};

test('첫 방문에 다리 선택·합 계산·하트 재도전을 연습한다', async ({ page }) => {
  await openNumberPath(page);
  await expect(page.getByRole('heading', { name: '숫자 다리를 건너요' })).toBeVisible();
  await page.locator('[data-bridge-id="a-good"]').click();
  await expect(page.getByRole('heading', { name: '목표 합을 미리 생각해요' })).toBeVisible();
  await page.locator('[data-bridge-id="b-good"]').click();
  await page.locator('[data-bridge-id="b-finish"]').click();
  await expect(page.getByRole('heading', { name: '위험한 다리도 배워 봐요' })).toBeVisible();
  await page.locator('[data-bridge-id="c-danger"]').click();
  await page.getByRole('button', { name: /하트 채우고 다시 도전/ }).click();
  await expect(page.locator('[data-bridge-id="c-good"]')).toHaveClass(/is-suggested/);
  await page.locator('[data-bridge-id="c-good"]').click();
  await page.getByRole('button', { name: '첫걸음 시작하기' }).click();
  await expect(page.getByRole('heading', { name: /목표 합/ })).toBeVisible();
  expect((await page.evaluate(() => JSON.parse(localStorage.getItem('numbercal.number-path.records.v1') ?? 'null'))).tutorialCompleted).toBe(true);
});

test('첫걸음도 네 다리씩 건너 다섯 지도를 완주한다', async ({ page }) => {
  await skipTutorial(page);
  await openNumberPath(page);
  await expectLoadedImage(page, '.number-path-hero-image');
  await page.getByRole('button', { name: /숫자 길 5개 시작/ }).click();
  for (let index = 0; index < 5; index += 1) {
    expect((await solution(page))).toHaveLength(4);
    await solveCurrentPuzzle(page);
    await expect(page.getByText(/보물섬에 도착했어요/)).toBeVisible();
    await page.getByRole('button', { name: index === 4 ? '결과 보기' : '다음 길' }).click();
  }
  await expect(page.getByRole('heading', { name: /숫자를 더하며/ })).toBeVisible();
  await expectLoadedImage(page, '.number-path-result-image');
  await expect(page.getByText('첫 번째 길')).toBeVisible();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('numbercal.number-path.records.v1') ?? 'null'));
  expect(saved.schemaVersion).toBe(2);
  expect(saved.completedPuzzles).toBe(5);
  expect(saved.byDifficulty.starter.completedSessions).toBe(1);
});

test('쑥쑥에서 건넌 다리와 현재 섬을 새로고침 뒤 이어 한다', async ({ page }) => {
  await skipTutorial(page);
  await openNumberPath(page);
  await page.getByRole('radio', { name: /쑥쑥/ }).click();
  await page.getByRole('button', { name: /숫자 길 5개 시작/ }).click();
  const first = (await solution(page))[0];
  await page.locator(`[data-bridge-id="${first}"]`).click();
  const before = await progress(page);
  await page.reload();
  await page.getByRole('button', { name: '숫자 길 찾기 숫자를 이어 목표 합을 만들어요' }).click();
  await page.getByRole('button', { name: /쑥쑥 이어서 하기/ }).click();
  await expect(page.locator(`[data-bridge-id="${first}"]`)).toHaveClass(/is-selected/);
  expect((await progress(page)).currentNodeId).toBe(before.currentNodeId);
});

test('위험한 다리는 하트를 한 번만 줄이고 힌트는 안전한 다리를 보여 준다', async ({ page }) => {
  await skipTutorial(page);
  await openNumberPath(page);
  await page.getByRole('button', { name: /숫자 길 5개 시작/ }).click();
  const saved = await progress(page);
  const puzzle = saved.puzzles[0];
  const safe = puzzle.solutionBridgeIds[0];
  const danger = puzzle.bridges.find((bridge: { fromNodeId: string; id: string }) =>
    bridge.fromNodeId === saved.currentNodeId && bridge.id !== safe).id;
  await page.locator(`[data-bridge-id="${danger}"]`).click();
  await expect(page.locator(`[data-bridge-id="${danger}"]`)).toHaveClass(/is-failed/);
  expect((await progress(page)).lives).toBe(2);
  await page.locator(`[data-bridge-id="${danger}"]`).dispatchEvent('click');
  expect((await progress(page)).lives).toBe(2);
  await page.getByRole('button', { name: /힌트/ }).click();
  await page.getByRole('button', { name: /안전한 다리/ }).click();
  await expect(page.locator(`[data-bridge-id="${safe}"]`)).toHaveClass(/is-suggested/);
});

test('키보드만으로 현재 숫자 다리 지도를 완성한다', async ({ page }) => {
  await skipTutorial(page);
  await openNumberPath(page);
  await page.getByRole('button', { name: /숫자 길 5개 시작/ }).click();
  for (const id of await solution(page)) {
    const bridge = page.locator(`[data-bridge-id="${id}"]`);
    await bridge.focus();
    await bridge.press('Enter');
  }
  await expect(page.getByText(/보물섬에 도착했어요/)).toBeVisible();
});

test('손가락과 같은 드래그 동작으로 다리 길을 완성한다', async ({ page }) => {
  await skipTutorial(page);
  await openNumberPath(page);
  await page.getByRole('button', { name: /숫자 길 5개 시작/ }).click();
  const path = await solution(page);
  const boxes = [];
  for (const id of path) boxes.push(await page.locator(`[data-bridge-id="${id}"]`).boundingBox());
  expect(boxes.every(Boolean)).toBe(true);
  await page.mouse.move(boxes[0]!.x + boxes[0]!.width / 2, boxes[0]!.y + boxes[0]!.height / 2);
  await page.mouse.down();
  for (const box of boxes) {
    await page.mouse.move(box!.x + box!.width / 2 + 1, box!.y + box!.height / 2, { steps: 3 });
  }
  await page.mouse.up();
  await expect(page.getByText(/보물섬에 도착했어요/)).toBeVisible();
});

test('달인은 일곱 다리·음수·순서 별을 제공하고 320px에서도 넘치지 않는다', async ({ page }) => {
  await skipTutorial(page);
  await page.setViewportSize({ width: 320, height: 568 });
  await openNumberPath(page);
  await page.getByRole('radio', { name: /달인/ }).click();
  await page.getByRole('button', { name: /숫자 길 5개 시작/ }).click();
  await expect(page.getByText('★ 별 다리 순서대로')).toBeVisible();
  await expect(page.locator('.number-path-bridge').filter({ hasText: /−\d/ }).first()).toBeVisible();
  await expect(page.locator('.number-path-bridge').filter({ hasText: /★1/ }).first()).toBeVisible();
  expect((await solution(page))).toHaveLength(7);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  expect(await page.locator('.number-path-bridge').evaluateAll((bridges) =>
    bridges.every((bridge) => bridge.getBoundingClientRect().width >= 48 && bridge.getBoundingClientRect().height >= 48))).toBe(true);
});

test('동작 줄이기에서도 합·하트·다리 정보를 그대로 제공한다', async ({ page }) => {
  await skipTutorial(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openNumberPath(page);
  await page.getByRole('button', { name: /숫자 길 5개 시작/ }).click();
  await expect(page.locator('.app-shell')).toHaveClass(/reduce-motion/);
  await expect(page.getByText(/현재 합/)).toBeVisible();
  await expect(page.getByLabel(/하트 3개/)).toBeVisible();
  await expect(page.getByRole('group', { name: '섬과 숫자 다리 지도' })).toBeVisible();
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
