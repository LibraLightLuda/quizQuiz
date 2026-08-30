import { expect, test } from '@playwright/test';

const transferFile = JSON.stringify({
  kind: 'numbercal-learning-records',
  schemaVersion: 1,
  exportedAt: '2026-08-29T00:00:00.000Z',
  records: {
    'numbercal.history.v1': {
      schemaVersion: 1,
      sessions: [{
        id: 'imported-session', completedAt: '2026-08-29T00:00:00.000Z',
        config: { subject: 'korean', mode: 'ko-fill', difficulty: 'easy', length: 5, theme: 'animals' },
        correctCount: 4, incorrectCount: 1, timeoutCount: 0, totalCount: 5, averageResponseMs: 1200
      }]
    },
    'numbercal.language-mastery.v1': { schemaVersion: 1, entries: [] },
    'numbercal.skill-mastery.v2': { schemaVersion: 2, entries: [], migratedFromWordMastery: true },
    'numbercal.sudoku.records.v1': null,
    'numbercal.memory.records.v1': null,
    'numbercal.story.records.v1': null,
    'numbercal.balance.records.v1': null,
    'numbercal.number-path.records.v1': null,
    'numbercal.block-garden.records.v1': null
  }
});

test('설정에서 학습 기록 파일을 미리 보고 안전하게 불러온다', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '설정 열기' }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: 'numbercal-learning-records.json', mimeType: 'application/json', buffer: Buffer.from(transferFile)
  });
  await expect(page.getByLabel('불러올 학습 기록 미리보기')).toContainText('기록 묶음 3개 · 최근 학습 1회');
  await expect(page.getByLabel('불러올 학습 기록 미리보기')).toContainText('낱말 기록 0개 · 기술 기록 0개');
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: '이 기록 불러오기' }).click();
  await expect(page.getByRole('status')).toContainText('학습 기록을 불러왔어요.');
  expect(await page.evaluate(() => localStorage.getItem('numbercal.history.v1'))).toContain('imported-session');
});
