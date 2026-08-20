import { expect, test, type Page } from '@playwright/test';

const enterSudoku = async (page: Page) => {
  await page.goto('/');
  await page.getByRole('button', { name: /스도쿠 숫자 규칙/ }).click();
};

test('4단계 튜토리얼에서 가로·세로·상자 규칙을 직접 연습한다', async ({ page }) => {
  await enterSudoku(page);
  await page.getByRole('button', { name: /처음이라면 규칙 연습/ }).click();
  await expect(page.getByRole('heading', { name: '가로로 같은 숫자는 한 번만' })).toBeVisible();
  await expect(page.getByRole('grid', { name: '4×4 스도쿠 규칙 예시' })).toBeVisible();

  await page.getByRole('button', { name: '튜토리얼 숫자 1' }).click();
  await expect(page.getByText(/이미 보이는지 다시 살펴봐요/)).toBeVisible();
  await expect(page.getByRole('button', { name: '튜토리얼 숫자 1' })).toBeDisabled();

  for (const answer of [3, 2, 4]) {
    await page.getByRole('button', { name: `튜토리얼 숫자 ${answer}` }).click();
    await page.getByRole('button', { name: '다음 규칙 배우기' }).click();
  }
  await expect(page.getByRole('heading', { name: '가로·세로·상자를 함께 살펴봐요' })).toBeVisible();
  await page.getByRole('button', { name: '튜토리얼 숫자 3' }).click();

  await expect(page.getByRole('heading', { name: '이제 스도쿠 준비 완료!' })).toBeVisible();
  await expect(page.getByText(/4×4는 1~4.*9×9는 1~9/)).toBeVisible();
  await expect(page.getByRole('button', { name: '첫걸음 4×4 시작하기' })).toBeVisible();
});

test('겹치는 숫자와 연속 무작위 입력으로는 빈칸을 통과할 수 없다', async ({ page }) => {
  await enterSudoku(page);
  await page.getByRole('button', { name: /첫걸음.*4×4/ }).click();
  await expect(page.getByRole('grid', { name: '4×4 스도쿠 퍼즐' })).toBeVisible();
  const progress = await page.evaluate(() => JSON.parse(localStorage.getItem('numbercal.sudoku.progress.v1') ?? 'null'));
  const target = progress.puzzle.puzzle.findIndex((cell: number) => cell === 0);
  const size = progress.puzzle.size as number;
  const row = Math.floor(target / size);
  const column = target % size;
  const boxRow = Math.floor(row / progress.puzzle.boxRows) * progress.puzzle.boxRows;
  const boxColumn = Math.floor(column / progress.puzzle.boxCols) * progress.puzzle.boxCols;
  const conflicts = new Set<number>();
  for (let index = 0; index < progress.grid.length; index += 1) {
    const cellRow = Math.floor(index / size);
    const cellColumn = index % size;
    const sameBox = cellRow >= boxRow && cellRow < boxRow + progress.puzzle.boxRows
      && cellColumn >= boxColumn && cellColumn < boxColumn + progress.puzzle.boxCols;
    if (cellRow === row || cellColumn === column || sameBox) conflicts.add(progress.grid[index]);
  }
  conflicts.delete(0);
  for (const number of conflicts) await expect(page.getByRole('button', { name: `숫자 ${number}`, exact: true })).toBeDisabled();

  const correct = progress.puzzle.solution[target] as number;
  const wrong = [1, 2, 3, 4].filter((number) => number !== correct);
  await page.evaluate(({ wrongNumber, correctNumber }) => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: String(wrongNumber) }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: String(correctNumber) }));
  }, { wrongNumber: wrong[0], correctNumber: correct });
  await page.waitForTimeout(760);
  await expect(page.getByRole('gridcell', { name: `${row + 1}행 ${column + 1}열, 빈칸` })).toBeVisible();

  await page.evaluate(({ wrongNumber, correctNumber }) => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: String(wrongNumber) }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: String(correctNumber) }));
  }, { wrongNumber: wrong[1], correctNumber: correct });
  await page.waitForTimeout(760);
  await expect(page.getByRole('button', { name: `숫자 ${correct}`, exact: true })).toBeDisabled();
  await expect(page.getByText(/이제 찍기는 잠시 쉬고/)).toBeVisible();
  await expect(page.getByRole('gridcell', { name: `${row + 1}행 ${column + 1}열, 빈칸` })).toBeVisible();
});
