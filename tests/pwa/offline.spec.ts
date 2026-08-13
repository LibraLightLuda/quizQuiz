import { expect, test } from '@playwright/test';

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
  await page.getByRole('button', { name: /수학 더하고/ }).click();
  await page.getByRole('button', { name: /덧셈/ }).click();
  await page.getByRole('radio', { name: '5문제', exact: true }).click();
  await page.getByRole('button', { name: /시작할래요/ }).click();
  for (let index = 0; index < 5; index += 1) {
    await page.locator('.option-button:not([disabled])').first().click();
    if (index < 4) await expect(page.getByText(`${index + 2} / 5`)).toBeVisible({ timeout: 3000 });
  }
  await expect(page.locator('.result-screen')).toBeVisible({ timeout: 3000 });
});
