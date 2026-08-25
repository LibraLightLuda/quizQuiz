import { expect, test, type Page } from '@playwright/test';

const enterMemory = async (page: Page) => {
  await page.goto('/');
  await page.getByRole('button', { name: /기억력 챌린지 뜻이 연결/ }).click();
};

test('통합 첫걸음을 완주하고 의미 쌍 기록과 별을 저장한다', async ({ page }) => {
  await enterMemory(page);
  await expect(page.getByRole('radio', { name: /통합 학습/ })).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('button', { name: /카드 8장 시작/ }).click();
  await expect(page.getByLabel('기억력 카드 판')).toBeVisible();
  await expect(page.locator('.memory-card-back img')).toHaveCount(8);
  expect(await page.locator('.memory-card-back i').allTextContents()).not.toContain('?');

  const cards = await page.evaluate(() => JSON.parse(localStorage.getItem('numbercal.memory.progress.v1') ?? 'null').cards);
  const pairs = Map.groupBy(cards as { id: string; pairId: string }[], (card) => card.pairId);
  let matched = 0;
  for (const pair of pairs.values()) {
    for (const card of pair) {
      const index = cards.findIndex((item: { id: string }) => item.id === card.id);
      await page.locator('.memory-card').nth(index).click();
    }
    matched += 2;
    if (matched < cards.length) {
      await expect(page.locator('.memory-card.is-matched')).toHaveCount(matched, { timeout: 2000 });
      await expect(page.locator('.memory-message')).toContainText('↔');
    }
  }

  await expect(page.getByRole('heading', { name: /최고 기록/ })).toBeVisible({ timeout: 3000 });
  await expect(page.getByLabel('3개의 별 획득')).toBeVisible();
  await expect(page.getByLabel('새로 얻은 배지')).toContainText('첫 연결');
  await expect(page.getByLabel('새로 얻은 배지')).toContainText('통합 탐험가');
  const records = await page.evaluate(() => JSON.parse(localStorage.getItem('numbercal.memory.records.v1') ?? 'null'));
  expect(records.byLevel['mixed:starter'].minAttempts).toBe(4);
  expect(await page.evaluate(() => localStorage.getItem('numbercal.memory.progress.v1'))).toBeNull();
  await page.getByRole('button', { name: '내 배지 도감 보기' }).click();
  await expect(page.getByLabel('배지 10개 중 2개 획득')).toBeVisible();
  await expect(page.locator('.memory-badge-grid article.is-unlocked')).toHaveCount(2);
  await expect(page.locator('.memory-badge-grid')).toContainText('별 수집가');
});

test('새로고침 뒤 선택한 카드와 시간이 이어진다', async ({ page }) => {
  await enterMemory(page);
  await page.getByRole('button', { name: /카드 8장 시작/ }).click();
  await page.locator('.memory-card').first().click();
  await expect(page.locator('.memory-card').first().locator('.memory-card-back')).toHaveCSS('visibility', 'hidden');
  await expect(page.locator('.memory-card').first().locator('.memory-card-back')).toHaveCSS('opacity', '0');
  await expect(page.locator('.memory-card').first().locator('.memory-card-front')).toHaveCSS('visibility', 'visible');
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem('numbercal.memory.progress.v1') ?? 'null'));
  expect(before.selectedCardIds).toHaveLength(1);

  await page.reload();
  await page.getByRole('button', { name: /기억력 챌린지 뜻이 연결/ }).click();
  await page.getByRole('button', { name: /통합 학습 이어서 하기/ }).click();
  await expect(page.locator('.memory-card.is-flipped')).toHaveCount(1);
  expect((await page.evaluate(() => JSON.parse(localStorage.getItem('numbercal.memory.progress.v1') ?? 'null').elapsedMs))).toBeGreaterThanOrEqual(before.elapsedMs);
});

test('320px 화면의 최고 단계 카드 판이 가로로 넘치지 않는다', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await enterMemory(page);
  await page.getByRole('button', { name: /내 배지 도감/ }).click();
  await expect(page.getByLabel('기억력 배지 목록')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  await page.getByRole('button', { name: '다음 도전 고르기' }).click();
  await page.getByRole('radio', { name: /기억력 왕/ }).click();
  await page.getByRole('button', { name: /카드 20장 시작/ }).click();
  await expect(page.locator('.memory-card')).toHaveCount(20);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
});
