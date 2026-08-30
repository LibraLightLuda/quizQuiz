import { expect, test, type Page } from '@playwright/test';

const records = {
  schemaVersion: 1,
  lastMode: 'tangram',
  tutorialCompleted: true,
  tangramStars: {},
  lineHighScore: 0,
  lineGames: 0,
  totalLines: 0,
  bestSingleClear: 0
};

const skipTutorial = async (page: Page) => {
  await page.addInitScript((value) => localStorage.setItem('numbercal.shape-block.records.v1', JSON.stringify(value)), records);
};

const openShapeBlock = async (page: Page) => {
  await page.goto('./');
  await page.getByRole('button', { name: /모양블록 조각을 돌리고 줄을 채워요/ }).click();
};

test('첫 방문에 선택·회전·놓기를 연습한다', async ({ page }) => {
  await openShapeBlock(page);
  await expect(page.getByRole('heading', { name: '조각을 골라요' })).toBeVisible();
  await page.getByRole('button', { name: '작은 삼각형 고르기' }).click();
  await page.getByRole('button', { name: /조각 돌리기/ }).click();
  await page.getByRole('button', { name: '반짝이는 자리에 놓기' }).click();
  await page.getByRole('button', { name: '모양블록 시작하기' }).click();
  await expect(page.getByRole('heading', { name: /모양을 만들고/ })).toBeVisible();
  expect(JSON.parse(await page.evaluate(() => localStorage.getItem('numbercal.shape-block.records.v1') ?? 'null')).tutorialCompleted).toBe(true);
});

test('첫 칠교를 힌트 없이 완성하고 다음 문제를 연다', async ({ page }) => {
  await skipTutorial(page);
  await openShapeBlock(page);
  await page.getByRole('button', { name: /칠교 그림 완성/ }).click();
  await page.getByRole('button', { name: /1번 고양이/ }).click();
  const pieceLabels = ['큰 삼각형 1', '큰 삼각형 2', '중간 삼각형', '작은 삼각형 1', '작은 삼각형 2', '정사각형', '평행사변형'];
  for (let index = 0; index < pieceLabels.length; index += 1) {
    await page.getByRole('button', { name: new RegExp(`^${pieceLabels[index]},`) }).click();
    await page.locator(`[data-target-id="target-${index}"]`).click();
  }
  await expect(page.getByRole('heading', { name: '어떤 그림을 맞출까요?' })).toBeVisible();
  const saved = JSON.parse(await page.evaluate(() => localStorage.getItem('numbercal.shape-block.records.v1') ?? 'null'));
  expect(saved.tangramStars['starter-01']).toBe(3);
  await expect(page.getByRole('button', { name: /2번 돛단배/ })).toBeEnabled();
});

test('홈의 오늘 추천에서 오늘의 모양을 완성하고 날짜 배지를 남긴다', async ({ page }) => {
  await page.addInitScript((value) => {
    const date = new Date();
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    localStorage.setItem('numbercal.shape-block.records.v1', JSON.stringify(value));
    for (const key of ['story', 'balance', 'number-path']) {
      localStorage.setItem(`numbercal.${key}.records.v1`, JSON.stringify({ schemaVersion: 1, dailyBadges: [dateKey] }));
    }
  }, records);
  await page.goto('./');
  await page.getByRole('button', { name: '오늘의 추천 모양블록 시작하기' }).click();
  await expect(page.getByText('0 / 7 조각')).toBeVisible();
  const pieceLabels = ['큰 삼각형 1', '큰 삼각형 2', '중간 삼각형', '작은 삼각형 1', '작은 삼각형 2', '정사각형', '평행사변형'];
  for (let index = 0; index < pieceLabels.length; index += 1) {
    await page.getByRole('button', { name: new RegExp(`^${pieceLabels[index]},`) }).click();
    await page.locator(`[data-target-id="target-${index}"]`).click();
  }
  await expect(page.getByRole('heading', { name: /모양을 만들고/ })).toBeVisible();
  const saved = JSON.parse(await page.evaluate(() => localStorage.getItem('numbercal.shape-block.records.v1') ?? 'null'));
  const dateKey = await page.evaluate(() => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  });
  expect(saved.dailyBadges).toContain(dateKey);
  await expect(page.getByText('오늘 미션을 완성했어요. 다시 만들어도 좋아요!')).toBeVisible();
});

test('성장 숲에 모양블록 공간 감각 기록을 보여 준다', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('numbercal.shape-block.records.v1', JSON.stringify({
    schemaVersion: 1, lastMode: 'tangram', tutorialCompleted: true,
    tangramStars: { 'starter-01': 3, 'starter-02': 2 }, dailyBadges: ['2026-08-30'],
    lineHighScore: 280, lineGames: 2, totalLines: 7, bestSingleClear: 2, recentLineCompletionIds: []
  })));
  await page.goto('./');
  await page.getByRole('button', { name: '나의 성장 숲 열기' }).click();
  await expect(page.getByRole('heading', { name: '모양을 돌리고 맞춘 만큼 자라요' })).toBeVisible();
  await expect(page.getByText('그림 2개 · 별 5개 · 오늘의 도전 1일')).toBeVisible();
  await expect(page.getByRole('progressbar', { name: '공간 감각 나무 성장' })).toHaveAttribute('aria-valuenow', /[1-9]\d*/);
});

test('단계가 열리면 필요한 공간 조작을 아이에게 먼저 알려 준다', async ({ page }) => {
  const growingRecords = {
    ...records,
    tangramStars: Object.fromEntries(Array.from({ length: 8 }, (_, index) => [`starter-${String(index + 1).padStart(2, '0')}`, 2]))
  };
  await page.addInitScript((value) => localStorage.setItem('numbercal.shape-block.records.v1', JSON.stringify(value)), growingRecords);
  await openShapeBlock(page);
  await page.getByRole('button', { name: /칠교 그림 완성/ }).click();
  await expect(page.getByText('처음엔 선명한 조각 선을 보고, 뒤로 갈수록 그림자를 살펴봐요.')).toBeVisible();
  await page.getByRole('tab', { name: '쑥쑥' }).click();
  await expect(page.getByText('앞 문제부터 하나씩 더 돌리며 모든 조각 방향을 익혀요.')).toBeVisible();
  await expect(page.getByRole('tab', { name: /척척/ })).toBeDisabled();
});

test('줄 채우기에서 회전·배치하고 새로고침 뒤 이어 한다', async ({ page }) => {
  await skipTutorial(page);
  await openShapeBlock(page);
  await page.getByRole('button', { name: /8×8 줄 채우기/ }).click();
  await page.getByRole('button', { name: /90° 회전/ }).click();
  const target = await page.evaluate(() => {
    const progress = JSON.parse(localStorage.getItem('numbercal.shape-block.line-clear-progress.v1') ?? 'null');
    const block = progress.tray[0];
    for (let row = 0; row < 8; row += 1) for (let column = 0; column < 8; column += 1) {
      const fits = block.cells.every((cell: { x: number; y: number }) => row + cell.y < 8 && column + cell.x < 8 && progress.board[(row + cell.y) * 8 + column + cell.x] === null);
      if (fits) return { row, column };
    }
    return null;
  });
  expect(target).not.toBeNull();
  await page.locator(`[data-row="${target!.row}"][data-column="${target!.column}"]`).click();
  const before = JSON.parse(await page.evaluate(() => localStorage.getItem('numbercal.shape-block.line-clear-progress.v1') ?? 'null'));
  expect(before.score).toBeGreaterThan(0);
  await page.reload();
  await page.getByRole('button', { name: /모양블록 조각을 돌리고 줄을 채워요/ }).click();
  await page.getByRole('button', { name: /8×8 줄 채우기/ }).click();
  await expect(page.getByText(String(before.score), { exact: true }).first()).toBeVisible();
});

test('320px에서도 홈과 두 게임판이 가로로 넘치지 않는다', async ({ page }) => {
  const expectNoHorizontalOverflow = async () => {
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth), { timeout: 3_000 }).toBe(320);
  };
  await skipTutorial(page);
  await page.setViewportSize({ width: 320, height: 568 });
  await openShapeBlock(page);
  await expectNoHorizontalOverflow();
  await page.getByRole('button', { name: /칠교 그림 완성/ }).click();
  await page.getByRole('button', { name: /1번 고양이/ }).click();
  await expectNoHorizontalOverflow();
  await page.getByRole('button', { name: '뒤로 가기' }).click();
  await page.getByRole('button', { name: '뒤로 가기' }).click();
  await page.getByRole('button', { name: /8×8 줄 채우기/ }).click();
  await expectNoHorizontalOverflow();
  await expect(page.getByRole('grid', { name: '8 곱하기 8 줄 채우기 판' })).toBeVisible();
});

test('320px 칠교판은 큰 가로 조각함과 한 손 조작 버튼을 제공한다', async ({ page }) => {
  await skipTutorial(page);
  await page.setViewportSize({ width: 320, height: 568 });
  await openShapeBlock(page);
  await page.getByRole('button', { name: /칠교 그림 완성/ }).click();
  await page.getByRole('button', { name: /1번 고양이/ }).click();
  const bank = page.getByLabel('사용할 칠교 조각, 옆으로 밀어서 더 볼 수 있어요');
  const pieceSizes = await bank.locator('button').evaluateAll((buttons) => buttons.map((button) => {
    const rect = button.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  }));
  expect(pieceSizes.every(({ width, height }) => width >= 76 && height >= 80)).toBe(true);
  expect(await bank.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
  const controls = page.getByLabel('선택한 조각 조작');
  expect(await controls.evaluate((element) => getComputedStyle(element.parentElement!).position)).toBe('sticky');
  const controlHeights = await controls.locator('button').evaluateAll((buttons) => buttons.map((button) => button.getBoundingClientRect().height));
  expect(controlHeights.every((height) => height >= 52)).toBe(true);
});

test('터치 드래그는 손가락 위쪽의 빈자리도 인식한다', async ({ page }) => {
  await skipTutorial(page);
  await page.setViewportSize({ width: 320, height: 568 });
  await openShapeBlock(page);
  await page.getByRole('button', { name: /칠교 그림 완성/ }).click();
  await page.getByRole('button', { name: /1번 고양이/ }).click();
  const piece = page.getByRole('button', { name: /^큰 삼각형 1,/ });
  const target = page.locator('[data-target-id="target-0"]');
  const board = page.getByRole('group', { name: '고양이 칠교판' });
  const box = await target.boundingBox();
  expect(box).not.toBeNull();
  await piece.dispatchEvent('pointerdown', { pointerType: 'touch', pointerId: 7, isPrimary: true, buttons: 1 });
  await board.dispatchEvent('pointerup', {
    pointerType: 'touch', pointerId: 7, isPrimary: true,
    clientX: box!.x + box!.width / 2,
    clientY: box!.y + box!.height / 2 + 48
  });
  await expect(target).toHaveAttribute('aria-label', /놓임/);
});

test('칠교 조각을 드래그하거나 키보드로 빈자리에 놓는다', async ({ page }) => {
  await skipTutorial(page);
  await openShapeBlock(page);
  await page.getByRole('button', { name: /칠교 그림 완성/ }).click();
  await page.getByRole('button', { name: /1번 고양이/ }).click();

  const firstPiece = page.getByRole('button', { name: /^큰 삼각형 1,/ });
  const firstTarget = page.locator('[data-target-id="target-0"]');
  const start = await firstPiece.boundingBox();
  const end = await firstTarget.boundingBox();
  expect(start).not.toBeNull(); expect(end).not.toBeNull();
  await page.mouse.move(start!.x + start!.width / 2, start!.y + start!.height / 2);
  await page.mouse.down();
  await page.mouse.move(end!.x + end!.width / 2, end!.y + end!.height / 2, { steps: 6 });
  await page.mouse.up();
  await expect(page.getByText(/찰칵/)).toBeVisible();

  const secondPiece = page.getByRole('button', { name: /^큰 삼각형 2,/ });
  await secondPiece.focus();
  await page.keyboard.press('Enter');
  const secondTarget = page.locator('[data-target-id="target-1"]');
  await secondTarget.focus();
  await page.keyboard.press('Enter');
  await expect(secondTarget).toHaveAttribute('aria-label', /놓임/);
});

test('맞는 배치와 잘못된 배치에 서로 다른 촉각 피드백을 준다', async ({ page }) => {
  await skipTutorial(page);
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'vibrate', {
      configurable: true,
      value(pattern: number | number[]) {
        const scope = window as typeof window & { __hapticPatterns?: Array<number | number[]> };
        scope.__hapticPatterns ??= [];
        scope.__hapticPatterns.push(pattern);
        return true;
      }
    });
  });
  await openShapeBlock(page);
  await page.getByRole('button', { name: /칠교 그림 완성/ }).click();
  await page.getByRole('button', { name: /1번 고양이/ }).click();
  await page.locator('[data-target-id="target-2"]').click();
  await page.locator('[data-target-id="target-0"]').click();
  const patterns = await page.evaluate(() => (window as typeof window & { __hapticPatterns?: Array<number | number[]> }).__hapticPatterns);
  expect(patterns).toEqual([[18, 35, 18], 18]);
});

test('줄 제거에는 별도 촉각 패턴을 사용한다', async ({ page }) => {
  await skipTutorial(page);
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'vibrate', {
      configurable: true,
      value(pattern: number | number[]) {
        const scope = window as typeof window & { __hapticPatterns?: Array<number | number[]> };
        scope.__hapticPatterns ??= [];
        scope.__hapticPatterns.push(pattern);
        return true;
      }
    });
    const board = Array(64).fill(null);
    for (let column = 0; column < 7; column += 1) board[column] = '#5967d8';
    localStorage.setItem('numbercal.shape-block.line-clear-progress.v1', JSON.stringify({
      schemaVersion: 1, id: 'haptic-line', board,
      tray: [{ id: 'single', shapeId: 'single', rotation: 0, cells: [{ x: 0, y: 0 }], color: '#45b97c' }],
      score: 0, clearedLines: 0, bestSingleClear: 0, phase: 'playing', updatedAt: new Date().toISOString()
    }));
  });
  await openShapeBlock(page);
  await page.getByRole('button', { name: /8×8 줄 채우기/ }).click();
  await page.locator('[data-row="0"][data-column="7"]').click();
  const patterns = await page.evaluate(() => (window as typeof window & { __hapticPatterns?: Array<number | number[]> }).__hapticPatterns);
  expect(patterns).toEqual([[24, 28, 46]]);
  await expect(page.getByText(/1줄 찰칵/)).toBeVisible();
});

test('손끝 반응 설정을 끄면 지원 기기에서도 진동하지 않는다', async ({ page }) => {
  await skipTutorial(page);
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'vibrate', {
      configurable: true,
      value(pattern: number | number[]) {
        const scope = window as typeof window & { __hapticPatterns?: Array<number | number[]> };
        scope.__hapticPatterns ??= [];
        scope.__hapticPatterns.push(pattern);
        return true;
      }
    });
  });
  await page.goto('./');
  await page.getByRole('button', { name: '설정 열기' }).click();
  await page.getByRole('checkbox', { name: /손끝 반응/ }).uncheck({ force: true });
  await page.getByRole('button', { name: '뒤로 가기' }).click();
  await page.getByRole('button', { name: /모양블록 조각을 돌리고 줄을 채워요/ }).click();
  await page.getByRole('button', { name: /칠교 그림 완성/ }).click();
  await page.getByRole('button', { name: /1번 고양이/ }).click();
  await page.locator('[data-target-id="target-2"]').click();
  const patterns = await page.evaluate(() => (window as typeof window & { __hapticPatterns?: Array<number | number[]> }).__hapticPatterns);
  expect(patterns).toBeUndefined();
});

test('기기의 동작 줄이기 설정에서는 촉각 피드백도 멈춘다', async ({ page }) => {
  await skipTutorial(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'vibrate', {
      configurable: true,
      value(pattern: number | number[]) {
        const scope = window as typeof window & { __hapticPatterns?: Array<number | number[]> };
        scope.__hapticPatterns ??= [];
        scope.__hapticPatterns.push(pattern);
        return true;
      }
    });
  });
  await openShapeBlock(page);
  await page.getByRole('button', { name: /칠교 그림 완성/ }).click();
  await page.getByRole('button', { name: /1번 고양이/ }).click();
  await page.locator('[data-target-id="target-0"]').click();
  const patterns = await page.evaluate(() => (window as typeof window & { __hapticPatterns?: Array<number | number[]> }).__hapticPatterns);
  expect(patterns).toBeUndefined();
});

test('저장된 종료 판은 완료 기록에 한 번만 옮기고 진행 키를 지운다', async ({ page }) => {
  const seed = {
    baseRecords: records,
    finished: {
      schemaVersion: 1, id: 'finished-once', board: Array(64).fill(null), tray: [],
      score: 123, clearedLines: 4, bestSingleClear: 2, phase: 'finished', updatedAt: '2026-08-30T00:00:00.000Z'
    }
  };
  await page.goto('./');
  await page.evaluate(({ baseRecords, finished }) => {
    localStorage.setItem('numbercal.shape-block.records.v1', JSON.stringify(baseRecords));
    localStorage.setItem('numbercal.shape-block.line-clear-progress.v1', JSON.stringify(finished));
  }, seed);
  await page.reload();
  await page.getByRole('button', { name: /모양블록 조각을 돌리고 줄을 채워요/ }).click();
  await page.getByRole('button', { name: /8×8 줄 채우기/ }).click();
  await expect(page.getByRole('heading', { name: '123점' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('numbercal.shape-block.records.v1') ?? 'null').lineGames)).toBe(1);
  expect(await page.evaluate(() => localStorage.getItem('numbercal.shape-block.line-clear-progress.v1'))).toBeNull();
  await page.reload();
  expect(JSON.parse(await page.evaluate(() => localStorage.getItem('numbercal.shape-block.records.v1') ?? 'null')).lineGames).toBe(1);
});
