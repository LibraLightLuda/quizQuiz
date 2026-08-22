import { expect, test, type Page } from '@playwright/test';

const expectMobileQuality = async (page: Page) => {
  const audit = await page.evaluate(() => {
    const visible = (element: Element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    const controls = [...document.querySelectorAll('button, a[href], [role="button"], [role="radio"], [role="tab"], input:not([type="checkbox"])')]
      .filter(visible);
    const smallControls = controls.map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        name: element.getAttribute('aria-label') || element.textContent?.trim().replace(/\s+/g, ' ').slice(0, 50) || element.tagName,
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      };
    }).filter(({ width, height }) => width < 44 || height < 44);
    const unnamedControls = controls.filter((element) => !(
      element.getAttribute('aria-label') || element.textContent?.trim() || element.getAttribute('title')
    )).length;
    const imagesWithoutAlt = [...document.querySelectorAll('img')].filter((image) => !image.hasAttribute('alt')).length;
    return {
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      smallControls,
      unnamedControls,
      imagesWithoutAlt
    };
  });

  expect(audit.overflow).toBeLessThanOrEqual(0);
  expect(audit.smallControls).toEqual([]);
  expect(audit.unnamedControls).toBe(0);
  expect(audit.imagesWithoutAlt).toBe(0);
};

test('320px 핵심 진입 화면은 터치 크기와 접근성 이름을 유지한다', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });

  await page.goto('/');
  await expectMobileQuality(page);

  await page.getByRole('button', { name: /기억력 챌린지 뜻이 연결/ }).click();
  await expect(page.getByRole('heading', { name: /놀면서 배우는/ })).toBeVisible();
  await expectMobileQuality(page);
  await page.getByRole('button', { name: /내 배지 도감/ }).click();
  await expectMobileQuality(page);

  await page.goto('/');
  await page.getByRole('button', { name: /이야기 탐험대 읽고/ }).click();
  await expect(page.getByRole('heading', { name: /이야기 속으로/ })).toBeVisible();
  await expectMobileQuality(page);
  await page.getByRole('button', { name: '도감 보기' }).click();
  await expectMobileQuality(page);

  await page.goto('/');
  await page.getByRole('button', { name: /스도쿠 숫자 규칙/ }).click();
  await expectMobileQuality(page);
  await page.getByRole('button', { name: /처음이라면 규칙 연습/ }).click();
  await expectMobileQuality(page);

  await page.goto('/');
  await page.getByRole('button', { name: /수학 더하고/ }).click();
  await expectMobileQuality(page);
  await page.getByRole('button', { name: /^덧셈 / }).click();
  await expectMobileQuality(page);
});

test('설정 스위치는 키보드로 이동했을 때 보이는 초점 표시를 제공한다', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '설정 열기' }).click();
  const soundToggle = page.getByRole('checkbox', { name: /효과음/ });
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(soundToggle).toBeFocused();
  const focusStyle = await soundToggle.evaluate((element) => {
    const indicator = element.nextElementSibling!;
    const style = getComputedStyle(indicator);
    return { outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth };
  });
  expect(focusStyle).toEqual({ outlineStyle: 'solid', outlineWidth: '4px' });
});
