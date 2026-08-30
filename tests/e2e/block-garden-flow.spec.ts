import { expect, test, type Page } from '@playwright/test';

const openGarden = async (page: Page) => {
  await page.goto('/');
  await page.getByRole('button', { name: /빈칸 정원 세 조각을 놓아/ }).click();
};

const startGarden = async (page: Page) => {
  await openGarden(page);
  await page.getByRole('button', { name: /기본 정원 시간 제한 없이/ }).click();
  await expect(page.getByRole('grid', { name: '8 곱하기 8 빈칸 정원 판' })).toBeVisible();
};

test('홈의 아래 카드에서 시작해도 게임 상단부터 연다', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.getByRole('button', { name: /빈칸 정원 세 조각을 놓아/ }).click();
  await page.getByRole('button', { name: /기본 정원 시간 제한 없이/ }).click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
});

test('세 조각 중 하나를 골라 놓고 새로고침 뒤 이어 한다', async ({ page }) => {
  await startGarden(page);
  await expect(page.getByRole('gridcell')).toHaveCount(64);
  const piece = page.locator('.garden-tray button:not(:disabled)').first();
  const pieceName = await piece.getAttribute('aria-label');
  await piece.click();
  await expect(page.getByText(`${pieceName}을 골랐어요. 판의 빈칸을 눌러 놓아 보세요.`)).toBeVisible();
  await page.getByRole('gridcell', { name: '4행 4열, 빈칸' }).click();
  await expect(page.getByText(/좋은 자리예요\. \+\d+점/)).toBeVisible();
  const score = await page.locator('.garden-play-header > div').first().locator('strong').innerText();
  expect(Number(score)).toBeGreaterThan(0);

  await page.reload();
  await page.getByRole('button', { name: /빈칸 정원 세 조각을 놓아/ }).click();
  await expect(page.getByRole('button', { name: '이어 하던 정원 열기' })).toBeVisible();
  await page.getByRole('button', { name: '이어 하던 정원 열기' }).click();
  await expect(page.locator('.garden-play-header > div').first().locator('strong')).toHaveText(score);
});

test('진행 중인 정원을 새 판으로 바꾸기 전에 확인한다', async ({ page }) => {
  await startGarden(page);
  await page.locator('.garden-tray button:not(:disabled)').first().click();
  await page.getByRole('gridcell', { name: '4행 4열, 빈칸' }).click();
  const score = await page.locator('.garden-play-header > div').first().locator('strong').innerText();

  await page.goto('/');
  await openGarden(page);
  await page.getByRole('button', { name: /기본 정원 시간 제한 없이/ }).click();
  await expect(page.getByRole('alertdialog', { name: '새 정원을 시작할까요?' })).toBeVisible();
  await page.getByRole('button', { name: '아니요, 이어서 할래요' }).click();
  await page.getByRole('button', { name: '이어 하던 정원 열기' }).click();
  await expect(page.locator('.garden-play-header > div').first().locator('strong')).toHaveText(score);
});

test('오늘의 정원 버튼은 어린이가 누르기 충분한 높이를 가진다', async ({ page }) => {
  await openGarden(page);
  const box = await page.getByRole('button', { name: '오늘의 정원 도전 · 12줄' }).boundingBox();
  expect(box).not.toBeNull();
  expect(box!.height).toBeGreaterThanOrEqual(48);
});

test('기본·시간·돌밭·아이템 모드를 분리해서 고를 수 있다', async ({ page }) => {
  await openGarden(page);
  await expect(page.getByRole('button', { name: /기본 정원 시간 제한 없이/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /시간 정원 90초 동안/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /돌밭 정원 두 줄을/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /아이템 정원 아이템을 모아/ })).toBeVisible();
});

test('시간 정원은 90초 타이머와 모드별 최고 점수를 보여 준다', async ({ page }) => {
  await openGarden(page);
  await page.getByRole('button', { name: /시간 정원 90초 동안/ }).click();
  await expect(page.getByLabel(/남은 시간 (89|90)초/)).toBeVisible();
  await expect(page.getByText('이 모드 최고')).toBeVisible();
  await page.locator('.garden-tray button:not(:disabled)').first().click();
  await page.getByRole('gridcell', { name: '4행 4열, 빈칸' }).click();
  await expect(page.locator('.garden-play-header > div').first().locator('strong')).not.toHaveText('0');
});

test('시간 정원은 앱을 벗어난 동안 시간이 끝나도 결과로 안전하게 이어진다', async ({ page }) => {
  await page.addInitScript((value) => localStorage.setItem('numbercal.block-garden.progress.v1', JSON.stringify(value)), {
    schemaVersion: 1,
    board: Array.from({ length: 64 }, () => null),
    tray: [{ uid: 'timed-seed', shapeId: 'seed', tone: 'leaf' }, { uid: 'timed-pair', shapeId: 'pair-h', tone: 'sun' }, null],
    mode: 'timed', timedEndsAt: '2026-08-30T00:00:00.000Z', timeLimitSeconds: 90,
    score: 55, clearedLines: 1, combo: 0, turns: 4,
    lastCleared: [], lastGain: 0, status: 'playing', updatedAt: '2026-08-30T00:00:00.000Z'
  });
  await openGarden(page);
  await page.getByRole('button', { name: '이어 하던 정원 열기' }).click();
  await expect(page.getByRole('heading', { name: '90초 끝!' })).toBeVisible();
  await expect(page.getByText('55', { exact: true })).toBeVisible();
});

test('돌밭 정원은 두 번째 줄 제거 뒤 사라지지 않는 회색 돌을 만든다', async ({ page }) => {
  const board = Array.from({ length: 64 }, () => null as string | null);
  for (let column = 0; column < 7; column += 1) board[column] = 'leaf';
  await page.addInitScript((value) => localStorage.setItem('numbercal.block-garden.progress.v1', JSON.stringify(value)), {
    schemaVersion: 1,
    board,
    tray: [{ uid: 'stone-seed', shapeId: 'seed', tone: 'sun' }, { uid: 'stone-pair', shapeId: 'pair-v', tone: 'water' }, null],
    mode: 'stone', score: 40, clearedLines: 1, combo: 0, turns: 3,
    lastCleared: [], lastGain: 0, status: 'playing', updatedAt: '2026-08-31T00:00:00.000Z'
  });
  await openGarden(page);
  await page.getByRole('button', { name: '이어 하던 정원 열기' }).click();
  await page.getByRole('button', { name: '씨앗 한 칸' }).click();
  await page.getByRole('gridcell', { name: '1행 8열, 빈칸' }).click();
  await expect(page.getByText(/회색 돌 1개가 생겼어요/)).toBeVisible();
  await expect(page.locator('.garden-board .tone-stone')).toHaveCount(1);
  await expect(page.getByText(/다음 돌까지 2줄/)).toBeVisible();
});

test('아이템 정원은 라인 아이템을 얻어 폭탄·회전·리롤로 사용한다', async ({ page }) => {
  const board = Array.from({ length: 64 }, () => null as string | null);
  for (let column = 0; column < 7; column += 1) board[column] = 'berry';
  [8, 9, 16, 17].forEach((index) => { board[index] = 'water'; });
  const itemBoard = Array.from({ length: 64 }, () => null as string | null);
  itemBoard[0] = 'bomb'; itemBoard[1] = 'rotate'; itemBoard[2] = 'reroll';
  await page.addInitScript((value) => localStorage.setItem('numbercal.block-garden.progress.v1', JSON.stringify(value)), {
    schemaVersion: 1,
    board,
    tray: [{ uid: 'item-seed', shapeId: 'seed', tone: 'sun' }, { uid: 'item-line', shapeId: 'line-3-v', tone: 'leaf' }, null],
    mode: 'items', itemBoard, inventory: { bomb: 0, rotate: 0, reroll: 0 },
    score: 0, clearedLines: 0, combo: 0, turns: 0,
    lastCleared: [], lastGain: 0, status: 'playing', updatedAt: '2026-08-31T00:00:00.000Z'
  });
  await openGarden(page);
  await page.getByRole('button', { name: '이어 하던 정원 열기' }).click();
  await page.getByRole('button', { name: '씨앗 한 칸' }).click();
  await page.getByRole('gridcell', { name: '1행 8열, 빈칸' }).click();
  await expect(page.getByText(/2×2 폭탄 · 조각 회전 · 조각 바꾸기 획득!/)).toBeVisible();

  await page.getByRole('button', { name: '세로 세 칸' }).click();
  await page.locator('.garden-toolbox button').filter({ hasText: '회전' }).click();
  await expect(page.getByRole('button', { name: /세로 세 칸 · 회전/ })).toBeVisible();
  await page.locator('.garden-toolbox button').filter({ hasText: '리롤' }).click();
  await expect(page.locator('.garden-toolbox button').filter({ hasText: '리롤' })).toContainText('×0');

  await page.locator('.garden-toolbox button').filter({ hasText: '폭탄' }).click();
  await page.getByRole('gridcell', { name: '2행 1열, 채워진 칸' }).click();
  await expect(page.getByRole('gridcell', { name: '2행 1열, 빈칸' })).toBeVisible();
  await expect(page.getByRole('gridcell', { name: '3행 2열, 빈칸' })).toBeVisible();
});

test('조각을 드래그해 정원에 놓는다', async ({ page }) => {
  await startGarden(page);
  const piece = page.locator('.garden-tray button:not(:disabled)').first();
  const cell = page.getByRole('gridcell', { name: '4행 4열, 빈칸' });
  const from = await piece.boundingBox();
  const to = await cell.boundingBox();
  expect(from).not.toBeNull();
  expect(to).not.toBeNull();
  await page.mouse.move(from!.x + from!.width / 2, from!.y + from!.height / 2);
  await page.mouse.down();
  await page.mouse.move(to!.x + to!.width / 2, to!.y + to!.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect(page.locator('.garden-play-header > div').first().locator('strong')).not.toHaveText('0');
});

test('손가락 드래그는 조각을 가리지 않는 위쪽 칸에 놓는다', async ({ page }) => {
  await startGarden(page);
  const piece = page.locator('.garden-tray button:not(:disabled)').first();
  const cell = page.getByRole('gridcell', { name: '4행 4열, 빈칸' });
  const from = await piece.boundingBox();
  const to = await cell.boundingBox();
  expect(from).not.toBeNull();
  expect(to).not.toBeNull();
  await piece.dispatchEvent('pointerdown', {
    pointerId: 7, pointerType: 'touch', isPrimary: true,
    clientX: from!.x + from!.width / 2, clientY: from!.y + from!.height / 2
  });
  const screen = page.locator('.garden-play-screen');
  const finger = { clientX: to!.x + to!.width / 2, clientY: to!.y + to!.height / 2 + 54 };
  await screen.dispatchEvent('pointermove', { pointerId: 7, pointerType: 'touch', isPrimary: true, ...finger });
  await screen.dispatchEvent('pointerup', { pointerId: 7, pointerType: 'touch', isPrimary: true, ...finger });
  await expect(page.locator('.garden-play-header > div').first().locator('strong')).not.toHaveText('0');
});

test('한 줄을 완성하면 지우고 제거 보너스를 보여 준다', async ({ page }) => {
  const board = Array.from({ length: 64 }, () => null as string | null);
  for (let column = 0; column < 5; column += 1) board[column] = 'leaf';
  await page.addInitScript((value) => localStorage.setItem('numbercal.block-garden.progress.v1', JSON.stringify(value)), {
    schemaVersion: 1,
    board,
    tray: [
      { uid: 'line-piece', shapeId: 'line-3-h', tone: 'sun' },
      { uid: 'invalid-piece', shapeId: 'line-4-v', tone: 'water' },
      null
    ],
    score: 0,
    clearedLines: 0,
    combo: 0,
    turns: 0,
    lastCleared: [],
    lastGain: 0,
    status: 'playing',
    updatedAt: '2026-08-30T00:00:00.000Z'
  });
  await openGarden(page);
  await page.getByRole('button', { name: '이어 하던 정원 열기' }).click();
  await page.getByRole('button', { name: '가로 세 칸' }).click();
  await page.getByRole('gridcell', { name: '1행 7열, 빈칸' }).click();
  await expect(page.getByText('한 줄이 활짝 피었어요! +43점')).toBeVisible();
  await expect(page.locator('.garden-notice')).toHaveClass(/is-success/);
  await expect(page.getByRole('gridcell', { name: '1행 1열, 빈칸' })).toBeVisible();
  await expect(page.getByText(/피운 줄\s*1/)).toBeVisible();
  await page.getByRole('button', { name: '세로 네 칸' }).click();
  await page.getByRole('gridcell', { name: '8행 1열, 빈칸' }).click();
  await expect(page.locator('.garden-notice')).toHaveClass(/is-error/);
  await expect(page.getByText(/그 자리에는 놓을 수 없어요/)).toBeVisible();
});

test('가로 휴대폰에서도 판과 조각함을 한 화면에 보여 준다', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await startGarden(page);
  const board = await page.getByRole('grid', { name: '8 곱하기 8 빈칸 정원 판' }).boundingBox();
  const piece = await page.locator('.garden-tray button:not(:disabled)').first().boundingBox();
  expect(board).not.toBeNull();
  expect(piece).not.toBeNull();
  expect(board!.y).toBeGreaterThanOrEqual(0);
  expect(board!.y + board!.height).toBeLessThanOrEqual(390);
  expect(piece!.y + piece!.height).toBeLessThanOrEqual(390);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('가로 휴대폰의 아이템 모드에서도 도구함과 조각함을 함께 보여 준다', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await openGarden(page);
  await page.getByRole('button', { name: /아이템 정원 아이템을 모아/ }).click();
  const toolbox = await page.locator('.garden-toolbox').boundingBox();
  const tray = await page.locator('.garden-tray').boundingBox();
  expect(toolbox).not.toBeNull();
  expect(tray).not.toBeNull();
  expect(toolbox!.y + toolbox!.height).toBeLessThanOrEqual(390);
  expect(tray!.y + tray!.height).toBeLessThanOrEqual(390);
});

test('320px 세로 화면에서도 가로로 넘치지 않고 점수부터 보여 준다', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await startGarden(page);
  await expect(page.getByText('현재 점수')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('남은 조각을 놓을 곳이 없으면 결과를 기록하고 바로 재시작한다', async ({ page }) => {
  const board = Array.from({ length: 64 }, (_, index) => {
    const row = Math.floor(index / 8);
    const column = index % 8;
    return (row + column) % 2 === 0 ? 'lavender' : null;
  });
  await page.addInitScript((value) => localStorage.setItem('numbercal.block-garden.progress.v1', JSON.stringify(value)), {
    schemaVersion: 1,
    board,
    tray: [
      { uid: 'last-seed', shapeId: 'seed', tone: 'leaf' },
      { uid: 'blocked-square', shapeId: 'square-4', tone: 'sun' },
      { uid: 'blocked-line', shapeId: 'line-3-h', tone: 'water' }
    ],
    score: 100,
    clearedLines: 2,
    combo: 0,
    turns: 10,
    lastCleared: [],
    lastGain: 0,
    status: 'playing',
    updatedAt: '2026-08-30T00:00:00.000Z'
  });
  await openGarden(page);
  await page.getByRole('button', { name: '이어 하던 정원 열기' }).click();
  await page.getByRole('button', { name: '씨앗 한 칸' }).click();
  await page.getByRole('gridcell', { name: '1행 2열, 빈칸' }).click();
  await expect(page.getByRole('heading', { name: /새 최고 기록|정원이 가득 찼어요/ })).toBeVisible();
  await expect(page.getByText('101', { exact: true })).toBeVisible();
  await expect(page.getByText(/이 모드 최고 101점 · 다음 목표 201점/)).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('numbercal.block-garden.progress.v1'))).toBeNull();
  expect(JSON.parse(await page.evaluate(() => localStorage.getItem('numbercal.block-garden.records.v1') ?? 'null')).gamesPlayed).toBe(1);

  await page.getByRole('button', { name: '바로 다시 하기' }).click();
  await expect(page.locator('.garden-play-header > div').first().locator('strong')).toHaveText('0');
  await expect(page.getByRole('gridcell', { name: /빈칸/ })).toHaveCount(64);
});

test('키보드만으로 조각을 고르고 놓을 수 있다', async ({ page }) => {
  await startGarden(page);
  const piece = page.locator('.garden-tray button:not(:disabled)').first();
  await piece.focus();
  await page.keyboard.press('Enter');
  const cell = page.getByRole('gridcell', { name: '4행 4열, 빈칸' });
  await cell.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.garden-play-header > div').first().locator('strong')).not.toHaveText('0');
});

test('다음 새싹을 보여 주고 오늘의 정원 목표를 완료한다', async ({ page }) => {
  const board = Array.from({ length: 64 }, () => null as string | null);
  for (let column = 0; column < 5; column += 1) board[column] = 'leaf';
  await page.addInitScript((value) => localStorage.setItem('numbercal.block-garden.progress.v1', JSON.stringify(value)), {
    schemaVersion: 1,
    board,
    tray: [
      { uid: 'daily-line-piece', shapeId: 'line-3-h', tone: 'sun' },
      { uid: 'daily-seed', shapeId: 'seed', tone: 'water' },
      null
    ],
    nextPiece: { uid: 'daily-next', shapeId: 'pair-h', tone: 'berry' },
    mode: 'daily',
    dailyDate: '2026-08-30',
    dailyTargetLines: 1,
    dailyCompleted: false,
    randomState: 123,
    score: 0,
    clearedLines: 0,
    combo: 0,
    turns: 0,
    lastCleared: [],
    lastGain: 0,
    maxLinesInMove: 0,
    status: 'playing',
    updatedAt: '2026-08-30T00:00:00.000Z'
  });
  await openGarden(page);
  await page.getByRole('button', { name: '이어 하던 정원 열기' }).click();
  await expect(page.getByRole('region', { name: '다음에 나올 조각' })).toBeVisible();
  await page.getByRole('button', { name: '가로 세 칸' }).click();
  await page.getByRole('gridcell', { name: '1행 7열, 빈칸' }).click();
  await expect(page.getByRole('heading', { name: '오늘의 정원 완성!' })).toBeVisible();
  await expect(page.getByText(/오늘의 씨앗을 모두 피웠어요/)).toBeVisible();
});

test('브라우저 저장소가 막혀도 놀이를 계속하고 저장 실패를 알린다', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => { throw new DOMException('blocked', 'QuotaExceededError'); };
  });
  await startGarden(page);
  await expect(page.getByText('진행을 저장하지 못했어요. 현재 판은 계속할 수 있어요.')).toBeVisible();
  await page.locator('.garden-tray button:not(:disabled)').first().click();
  await page.getByRole('gridcell', { name: '4행 4열, 빈칸' }).click();
  await expect(page.locator('.garden-play-header > div').first().locator('strong')).not.toHaveText('0');
});
