import { expect, test, type Page } from '@playwright/test';

const auditVisibleControls = async (page: Page) => page.evaluate(() => {
  const visible = (element: Element) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
  };
  const controls = [...document.querySelectorAll<HTMLElement>('button, a[href], [role="button"], [role="radio"], [role="tab"], input:not([type="checkbox"])')]
    .filter(visible);
  return {
    overflow: document.documentElement.scrollWidth - window.innerWidth,
    small: controls.map((element) => {
      const rect = element.getBoundingClientRect();
      return { name: element.getAttribute('aria-label') || element.textContent?.trim().replace(/\s+/g, ' ').slice(0, 45), width: Math.round(rect.width), height: Math.round(rect.height) };
    }).filter(({ width, height }) => width < 44 || height < 44),
    unnamed: controls.filter((element) => !(element.getAttribute('aria-label') || element.getAttribute('aria-labelledby') || element.textContent?.trim() || element.title)).length,
    missingImageAlt: [...document.querySelectorAll('img')].filter((image) => !image.hasAttribute('alt')).length
  };
});

const contrastRatio = (foreground: string, background: string): number => {
  const luminance = (hex: string) => {
    const channels = hex.match(/[\da-f]{2}/gi)!.map((value) => parseInt(value, 16) / 255)
      .map((value) => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  const first = luminance(foreground);
  const second = luminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
};

test('핵심 화면 전체가 320px에서 터치 크기·이름·대체 텍스트를 지킨다', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/');
  expect(await auditVisibleControls(page)).toEqual({ overflow: 0, small: [], unnamed: 0, missingImageAlt: 0 });

  await page.getByRole('button', { name: '설정 열기' }).click();
  expect(await auditVisibleControls(page)).toEqual({ overflow: 0, small: [], unnamed: 0, missingImageAlt: 0 });
  await page.getByRole('button', { name: '뒤로 가기' }).click();

  await page.getByRole('button', { name: '나의 성장 숲 열기' }).click();
  expect(await auditVisibleControls(page)).toEqual({ overflow: 0, small: [], unnamed: 0, missingImageAlt: 0 });
  await page.getByRole('button', { name: '보호자' }).click();
  expect(await auditVisibleControls(page)).toEqual({ overflow: 0, small: [], unnamed: 0, missingImageAlt: 0 });
  await page.getByRole('button', { name: '성장 숲으로 돌아가기' }).click();
  await page.getByRole('button', { name: '홈으로 돌아가기' }).click();

  await page.evaluate(() => {
    localStorage.setItem('numbercal.language-warmup.v1', 'done');
    for (const activity of ['sound-match', 'word-build', 'picture-link', 'sentence-complete']) {
      localStorage.setItem(`numbercal.language-activity-demo.v1:korean:${activity}`, 'done');
    }
  });
  await page.getByRole('button', { name: /한국어 우리말/ }).click();
  await page.getByRole('button', { name: /말놀이 탐험/ }).click();
  expect(await auditVisibleControls(page)).toEqual({ overflow: 0, small: [], unnamed: 0, missingImageAlt: 0 });
  await page.getByRole('button', { name: /작은 모험 시작/ }).click();
  await expect(page.locator('.question-card h1')).toBeFocused();
  expect(await auditVisibleControls(page)).toEqual({ overflow: 0, small: [], unnamed: 0, missingImageAlt: 0 });
});

test('본문·보조 문구·주요 버튼 색상은 WCAG 대비 기준을 넘는다', async () => {
  const normalTextPairs = [
    ['25233a', 'f7f7ff'], ['6b6980', 'ffffff'], ['5b4ae8', 'ffffff'], ['237751', 'ffffff'],
    ['a95e0c', 'ffffff'], ['18865b', 'ffffff'], ['116645', 'e8f8f0'], ['8e4925', 'fff2e6'],
    ['755b0e', 'fff9df'], ['5f5c70', 'ffffff'], ['4e6759', 'effaf4'], ['ffffff', '5847db']
  ] as const;
  for (const [foreground, background] of normalTextPairs) {
    expect(contrastRatio(foreground, background), `${foreground} on ${background}`).toBeGreaterThanOrEqual(4.5);
  }
  expect(contrastRatio('b77714', 'ffffff')).toBeGreaterThanOrEqual(3);
});

test('읽기 속도는 탭·방향키·상태 정보로 조작할 수 있다', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '설정 열기' }).click();
  const comfortable = page.getByRole('radio', { name: /편안하게/ });
  await comfortable.focus();
  await page.keyboard.press('ArrowRight');
  const clear = page.getByRole('radio', { name: /또박또박/ });
  await expect(clear).toBeFocused();
  await expect(clear).toHaveAttribute('aria-checked', 'true');
  const outline = await clear.evaluate((element) => {
    const style = getComputedStyle(element);
    return { style: style.outlineStyle, width: parseFloat(style.outlineWidth) };
  });
  expect(outline.style).toBe('solid');
  expect(outline.width).toBeGreaterThanOrEqual(3);
  await page.keyboard.press('ArrowLeft');
  await expect(comfortable).toBeFocused();
  await expect(comfortable).toHaveAttribute('aria-checked', 'true');
});

test('보호자 확인은 키보드 길게 누르기와 실시간 상태 안내를 제공한다', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '나의 성장 숲 열기' }).click();
  await page.getByRole('button', { name: '보호자' }).click();
  const hold = page.getByRole('button', { name: '보호자가 길게 누르기' });
  await hold.focus();
  await page.keyboard.down('Enter');
  await expect(page.getByText('확인 중입니다. 버튼을 놓지 마세요.')).toBeVisible();
  await page.waitForTimeout(1600);
  await expect(page.getByRole('heading', { name: '다음 도움을 한눈에 살펴보세요' })).toBeVisible();
  await expect(page.getByRole('main')).toContainText('학년 진단이나 의학적·발달적 판단이 아닙니다.');
});

test('학습 나가기 대화상자는 초점을 가두고 닫은 뒤 원래 위치로 돌려준다', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /수학 더하고/ }).click();
  await page.getByRole('button', { name: /^덧셈 / }).click();
  await page.getByRole('button', { name: /작은 모험 시작/ }).click();
  const exit = page.getByRole('button', { name: '학습 나가기' });
  await exit.click();
  const dialog = page.getByRole('dialog', { name: '여기까지 할까요?' });
  await expect(dialog).toBeVisible();
  const continueButton = dialog.getByRole('button', { name: '계속 풀기' });
  const leaveButton = dialog.getByRole('button', { name: '여기까지 하고 나가기' });
  await expect(continueButton).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(leaveButton).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(continueButton).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(exit).toBeFocused();
});
