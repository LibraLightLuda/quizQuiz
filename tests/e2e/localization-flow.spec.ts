import { expect, test } from '@playwright/test';

test.describe('global app language', () => {
  test.use({ locale: 'en-US' });

  test('detects the device language, supports a persistent manual choice, and fits mobile', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto('/');

    await expect(page.getByRole('heading', { name: /NumberCal Learning Playground/ })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page).toHaveTitle('NumberCal Learning Playground');

    await page.getByRole('button', { name: 'Open settings' }).click();
    await expect(page.getByRole('radio', { name: /Device language/ })).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByText('Korean and English learning words and audio never change')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    await page.getByRole('radio', { name: /한국어/ }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'ko');
    await expect(page.locator('.top-bar').getByText('설정', { exact: true })).toBeVisible();

    await page.getByRole('radio', { name: /English/ }).click();
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await page.getByRole('button', { name: 'Open settings' }).click();
    await expect(page.getByRole('radio', { name: /English menus/ })).toHaveAttribute('aria-checked', 'true');
    expect(await page.evaluate(() => localStorage.getItem('numbercal.locale.v1'))).toBe('en');
  });

  test('keeps Korean learning material unchanged inside the English interface', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('numbercal.locale.v1', 'en');
      localStorage.setItem('numbercal.language-warmup.v1', 'done');
    });
    await page.goto('/');
    await page.getByRole('button', { name: /Korean Learn Korean letters and words/ }).click();
    await page.getByRole('button', { name: /Fill the letters/ }).click();
    await page.getByRole('button', { name: /Start short adventure/ }).click();

    await expect(page.getByText('1 / 5')).toBeVisible();
    const prompt = await page.locator('.question-card h1').innerText();
    expect(prompt).toMatch(/[가-힣□]/);
    const choices = await page.locator('.option-button span, .activity-option span, .word-tile').allInnerTexts();
    expect(choices.join('')).toMatch(/[가-힣]/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('uses the same locale rules when launched as an installed standalone app', async ({ page }) => {
    await page.addInitScript(() => {
      const original = window.matchMedia.bind(window);
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        value: (query: string) => query === '(display-mode: standalone)'
          ? { matches: true, media: query, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => true }
          : original(query)
      });
    });
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('heading', { name: /NumberCal Learning Playground/ })).toBeVisible();
  });
});
