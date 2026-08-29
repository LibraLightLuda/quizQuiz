import { expect, test } from '@playwright/test';

const offlineRecordTransfer = JSON.stringify({
  kind: 'numbercal-learning-records', schemaVersion: 1, exportedAt: '2026-08-30T00:00:00.000Z',
  records: {
    'numbercal.history.v1': { schemaVersion: 1, sessions: [] },
    'numbercal.language-mastery.v1': { schemaVersion: 1, entries: [] },
    'numbercal.skill-mastery.v2': { schemaVersion: 2, entries: [], migratedFromWordMastery: true },
    'numbercal.sudoku.records.v1': null,
    'numbercal.memory.records.v1': null,
    'numbercal.story.records.v1': null,
    'numbercal.balance.records.v1': null,
    'numbercal.number-path.records.v1': null
  }
});

test('하위 경로 PWA가 올바른 scope로 설치되고 오프라인 학습을 완료한다', async ({ page, context, request }) => {
  const baseUrl = 'http://127.0.0.1:4176/NumberCal/';
  const manifestResponse = await request.get(`${baseUrl}manifest.webmanifest`);
  expect(manifestResponse.ok()).toBe(true);
  const manifest = await manifestResponse.json();
  expect(manifest.start_url).toBe('/NumberCal/');
  expect(manifest.scope).toBe('/NumberCal/');
  for (const icon of manifest.icons) {
    expect(icon.src).toMatch(/^\/NumberCal\/icons\//);
    expect((await request.get(new URL(icon.src, baseUrl).href)).ok()).toBe(true);
  }

  await page.goto('./');
  const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
  expect(scope).toBe('http://127.0.0.1:4176/NumberCal/');
  await page.reload();
  expect(await page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: '어린이 학습 놀이터' })).toBeVisible();
  await page.getByRole('button', { name: '설정 열기' }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: 'numbercal-learning-records.json', mimeType: 'application/json', buffer: Buffer.from(offlineRecordTransfer)
  });
  await expect(page.getByLabel('불러올 학습 기록 미리보기')).toContainText('기록 묶음 3개');
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: '이 기록 불러오기' }).click();
  await expect(page.getByRole('status')).toContainText('학습 기록을 불러왔어요.');
  await page.getByRole('button', { name: '뒤로 가기' }).click();
  await page.getByRole('button', { name: '숫자 길 찾기 숫자를 이어 목표 합을 만들어요' }).click();
  await expect(page.getByRole('heading', { name: '시작 칸에서 출발해요' })).toBeVisible();
  await page.getByRole('button', { name: '뒤로 가기' }).click();
  await expect.poll(() => page.locator('.number-path-hero-image').evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth === 512)).toBe(true);
  await page.goto('./');
  await expect(page.getByRole('heading', { name: '어린이 학습 놀이터' })).toBeVisible();
  await page.getByRole('button', { name: /이야기 탐험대 읽고/ }).click();
  await expect(page.getByRole('heading', { name: /이야기 속으로/ })).toBeVisible();
  await page.locator('.story-picks').getByRole('button', { name: /비 오는 날의 우산/ }).click();
  await expect(page.getByText('하늘에 먹구름이 모였어요.')).toBeVisible();
  await expect.poll(() => page.locator('.story-illustration-image').evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth >= 700)).toBe(true);
  await page.getByRole('button', { name: '뒤로 가기' }).click();
  await page.getByRole('button', { name: '뒤로 가기' }).click();
  await page.getByRole('button', { name: /수학 더하고/ }).click();
  await page.getByRole('button', { name: /^덧셈 / }).click();
  await page.getByRole('button', { name: /작은 모험 시작/ }).click();
  for (let index = 0; index < 5; index += 1) {
    await page.locator('.option-button:not([disabled])').first().click();
    await page.getByRole('button', { name: index === 4 ? '오늘 찾은 것 보기' : '다음 친구' }).click();
    if (index < 4) await expect(page.getByText(`${index + 2} / 5`)).toBeVisible({ timeout: 3000 });
  }
  await expect(page.locator('.result-screen')).toBeVisible({ timeout: 3000 });
  await page.getByRole('button', { name: '처음으로' }).click();
  await page.getByRole('button', { name: /스도쿠 숫자 규칙/ }).click();
  await page.getByRole('button', { name: /첫걸음 4×4/ }).click();
  await expect(page.getByRole('grid', { name: '4×4 스도쿠 퍼즐' })).toBeVisible();
});
