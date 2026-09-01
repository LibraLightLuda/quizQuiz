import { expect, type Page, test } from '@playwright/test';
import { stories } from '../../src/story/storyData';
import type { StoryActivity } from '../../src/story/types';

const openStoryMode = async (page: Page) => {
  await page.goto('/');
  await page.getByRole('button', { name: /이야기 탐험대 읽고/ }).click();
  await expect(page.getByRole('heading', { name: /이야기 속으로/ })).toBeVisible();
};

const readToActivities = async (page: Page, title: string, sceneCount: number) => {
  await page.locator('.story-picks').getByRole('button', { name: new RegExp(title) }).click();
  await expect(page.getByRole('article')).toBeVisible();
  for (let index = 1; index < sceneCount; index += 1) await page.getByRole('button', { name: '다음 장면' }).click();
  await page.getByRole('button', { name: '활동 시작' }).click();
};

const arrangeSequence = async (page: Page, expected: readonly string[]) => {
  const cards = page.locator('.story-sequence-list > button');
  for (let index = 0; index < expected.length; index += 1) {
    const current = await cards.nth(index).innerText();
    if (current.includes(expected[index])) continue;
    await cards.nth(index).click();
    await cards.filter({ hasText: expected[index] }).click();
  }
  await page.getByRole('button', { name: '이 순서 확인하기' }).click();
};

const currentActivity = async (page: Page, title: string): Promise<StoryActivity> => {
  const story = stories.find((candidate) => candidate.title === title)!;
  const prompt = (await page.locator('#story-question-title').innerText()).trim();
  const activity = story.activities.find((candidate) => candidate.prompt === prompt);
  if (!activity) throw new Error(`현재 이야기 활동을 찾지 못했어요: ${title} / ${prompt}`);
  return activity;
};

const solveCurrentActivity = async (page: Page, title: string): Promise<StoryActivity> => {
  const story = stories.find((candidate) => candidate.title === title)!;
  const activity = await currentActivity(page, title);
  if (activity.type === 'sequence') {
    await arrangeSequence(page, activity.sceneIds.map((sceneId) => story.scenes.find((scene) => scene.id === sceneId)!.text));
  } else {
    const correct = activity.options.find((option) => option.id === activity.correctOptionId)!;
    await page.getByRole('button', { name: correct.label, exact: true }).click();
    if (activity.evidenceRequired) {
      const evidence = story.scenes.find((scene) => scene.id === activity.evidenceSceneId)!;
      await page.getByRole('button', { name: new RegExp(evidence.text.slice(0, 24)) }).click();
    }
  }
  return activity;
};

const finishStoryActivities = async (page: Page, title: string, finalButton = '결과 보기') => {
  for (let index = 0; index < 3; index += 1) {
    await solveCurrentActivity(page, title);
    await page.getByRole('button', { name: index === 2 ? finalButton : '다음 활동' }).click();
  }
};

const installSpeechMock = async (page: Page) => {
  await page.addInitScript(() => {
    class MockUtterance {
      text: string;
      lang = '';
      rate = 1;
      pitch = 1;
      volume = 1;
      voice = null;
      onend?: () => void;
      onerror?: () => void;
      constructor(text: string) { this.text = text; }
    }
    const spoken: string[] = [];
    const rates: number[] = [];
    Object.defineProperty(window, '__storySpokenForTest', { value: spoken, configurable: true });
    Object.defineProperty(window, '__storySpeechRatesForTest', { value: rates, configurable: true });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: MockUtterance, configurable: true });
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        getVoices: () => [], addEventListener: () => undefined, cancel: () => undefined,
        speak: (utterance: MockUtterance) => {
          spoken.push(utterance.text);
          rates.push(utterance.rate);
          window.setTimeout(() => utterance.onend?.(), 20);
        }
      }
    });
  });
};

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
});

test('최근 배운 낱말이 오늘의 이야기 미션과 장면에서 다시 등장한다', async ({ page }) => {
  await page.evaluate(() => {
    const now = new Date().toISOString();
    const entries = ['ko-easy-1', 'ko-easy-31'].map((wordId) => ({
      key: `ko-adventure:${wordId}`, wordId, mode: 'ko-adventure', stage: 'learning',
      attempts: 1, correctCount: 1, correctStreak: 1, averageResponseMs: 1200,
      lastSeenAt: now, nextReviewAt: now
    }));
    localStorage.setItem('numbercal.language-mastery.v1', JSON.stringify({ schemaVersion: 1, entries }));
  });
  await page.reload();
  await page.getByRole('button', { name: /이야기 탐험대 읽고/ }).click();
  const mission = page.getByRole('button', { name: /오늘의 낱말 미션.*빨간 장갑 한 짝/ });
  await expect(mission).toContainText('놀이터 · 장갑');
  await mission.click();
  const independentBefore = await page.evaluate(() => {
    const stored = JSON.parse(localStorage.getItem('numbercal.skill-mastery.v2') ?? 'null');
    return stored.entries.reduce((sum: number, entry: { independentCorrect: number }) => sum + entry.independentCorrect, 0);
  });
  await expect(page.locator('.story-mission-found')).toContainText('놀이터 · 장갑');
  await page.getByRole('button', { name: '다음 장면' }).click();
  await page.getByRole('button', { name: '다음 장면' }).click();
  await page.getByRole('button', { name: '활동 시작' }).click();
  await finishStoryActivities(page, '빨간 장갑 한 짝', '낱말 떠올리기');
  await expect(page.getByRole('heading', { name: '1 / 2' })).toBeVisible();
  await page.getByRole('button', { name: '놀이터', exact: true }).click();
  await page.getByRole('button', { name: '다음 낱말' }).click();
  await page.getByRole('button', { name: '장갑', exact: true }).click();
  await page.getByRole('button', { name: '결과 보기' }).click();
  await expect(page.locator('.story-mission-result')).toContainText('도움 없이 다시 기억한 낱말 2 / 2');
  const skills = await page.evaluate(() => JSON.parse(localStorage.getItem('numbercal.skill-mastery.v2') ?? 'null'));
  expect(skills.entries.some((entry: { supportedCorrect: number }) => entry.supportedCorrect > 0)).toBe(true);
  expect(skills.entries.reduce((sum: number, entry: { independentCorrect: number }) => sum + entry.independentCorrect, 0)).toBe(independentBefore);
});

test('새싹 이야기를 읽고 세 활동과 결과까지 완료한다', async ({ page }) => {
  await openStoryMode(page);
  await readToActivities(page, '비 오는 날의 우산', 3);
  await finishStoryActivities(page, '비 오는 날의 우산');

  await expect(page.getByRole('heading', { name: '비 오는 날의 우산' })).toBeVisible();
  await expect(page.locator('.story-stars')).toHaveAttribute('aria-label', '별 3개');
  await expect(page.getByText('3 / 3')).toBeVisible();
});

test('연속 추측을 막고 두 번 틀리면 이야기 재확인을 요구한다', async ({ page }) => {
  await openStoryMode(page);
  await page.getByRole('radio', { name: /탐험가/ }).click();
  await readToActivities(page, '벌이 찾은 꽃밭', 5);

  let activity = await currentActivity(page, '벌이 찾은 꽃밭');
  while (activity.type !== 'choice' || activity.options.length < 3) {
    await solveCurrentActivity(page, '벌이 찾은 꽃밭');
    await page.getByRole('button', { name: '다음 활동' }).click();
    activity = await currentActivity(page, '벌이 찾은 꽃밭');
  }
  const wrongOptions = activity.options.filter((option) => option.id !== activity.correctOptionId);
  const correctOption = activity.options.find((option) => option.id === activity.correctOptionId)!;
  const firstWrong = page.locator('.story-choice-grid button').filter({ hasText: wrongOptions[0].label });
  const secondWrong = page.locator('.story-choice-grid button').filter({ hasText: wrongOptions[1].label });
  const correct = page.locator('.story-choice-grid button').filter({ hasText: correctOption.label });
  await page.evaluate(({ wrong, answer }) => {
    const buttons = [...document.querySelectorAll<HTMLButtonElement>('.story-choice-grid button')];
    buttons.find((button) => button.textContent?.includes(wrong))?.click();
    buttons.find((button) => button.textContent?.includes(answer))?.click();
  }, { wrong: wrongOptions[0].label, answer: correctOption.label });
  await expect(firstWrong).toBeDisabled();
  await expect(page.getByText(activity.hint)).toBeVisible();
  await expect(correct).toBeEnabled();

  await page.waitForTimeout(650);
  await secondWrong.click();
  await expect(page.getByRole('button', { name: /이야기 다시 살펴보기/ })).toBeVisible();
  await expect(correct).toBeDisabled();
  await page.getByRole('button', { name: /이야기 다시 살펴보기/ }).click();
  await expect(page.getByText(/관련 장면을 천천히 다시 읽어/)).toBeVisible();
  const story = stories.find((candidate) => candidate.title === '벌이 찾은 꽃밭')!;
  const evidenceIndex = story.scenes.findIndex((scene) => scene.id === activity.evidenceSceneId);
  await expect(page.locator('.story-progress')).toHaveAttribute('aria-label', `이야기 ${evidenceIndex + 1} / 5장면`);
  await page.getByRole('button', { name: '활동으로 돌아가기' }).click();
  await expect(correct).toBeEnabled();
});

test('새로고침 뒤 읽던 장면에서 이어서 시작한다', async ({ page }) => {
  await openStoryMode(page);
  await page.getByRole('radio', { name: /한걸음/ }).click();
  await page.locator('.story-picks').getByRole('button', { name: /도서관 책의 자리/ }).click();
  await page.getByRole('button', { name: '다음 장면' }).click();
  await expect(page.locator('.story-progress')).toHaveAttribute('aria-label', '이야기 2 / 4장면');

  await page.reload();
  await page.getByRole('button', { name: /이야기 탐험대 읽고/ }).click();
  await page.getByRole('button', { name: /읽던 이야기 이어서 보기/ }).click();
  await expect(page.locator('.story-progress')).toHaveAttribute('aria-label', '이야기 2 / 4장면');
  await expect(page.getByText('의자에 앉아 책을 끝까지 재미있게 읽었어요.')).toBeVisible();
});

test('생각왕은 정답 뒤 이야기 속 근거까지 찾아야 완료된다', async ({ page }) => {
  await openStoryMode(page);
  await page.getByRole('radio', { name: /생각왕/ }).click();
  await readToActivities(page, '개울을 막은 비닐', 6);
  for (let index = 0; index < 3; index += 1) {
    const activity = await currentActivity(page, '개울을 막은 비닐');
    if (activity.type === 'choice' && activity.evidenceRequired) {
      const correct = activity.options.find((option) => option.id === activity.correctOptionId)!;
      await page.getByRole('button', { name: correct.label, exact: true }).click();
      await expect(page.getByRole('heading', { name: '어느 장면이 가장 좋은 근거일까요?' })).toBeVisible();
      const story = stories.find((candidate) => candidate.title === '개울을 막은 비닐')!;
      const evidence = story.scenes.find((scene) => scene.id === activity.evidenceSceneId)!;
      await page.getByRole('button', { name: new RegExp(evidence.text.slice(0, 24)) }).click();
      await expect(page.getByRole('button', { name: /다음 활동|결과 보기/ })).toBeVisible();
      return;
    }
    await solveCurrentActivity(page, '개울을 막은 비닐');
    await page.getByRole('button', { name: '다음 활동' }).click();
  }
  throw new Error('근거를 고르는 활동이 포함되지 않았어요.');
});

test('320px 화면에서 이야기 홈과 읽기 화면이 가로로 넘치지 않는다', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await openStoryMode(page);
  const noHorizontalOverflow = () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  expect(await noHorizontalOverflow()).toBe(true);
  await page.locator('.story-picks').getByRole('button', { name: /비 오는 날의 우산/ }).click();
  expect(await noHorizontalOverflow()).toBe(true);
  await expect(page.getByRole('button', { name: '다음 장면' })).toBeVisible();
});

test('대표 이야기의 세 장면이 연속 일러스트와 정확한 대체 텍스트로 보인다', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /이야기 탐험대 읽고 기억/ }).click();
  await page.locator('.story-picks').getByRole('button', { name: /비 오는 날의 우산/ }).click();

  const expectedAlt = [
    /지우가 먹구름 낀 하늘을 올려다보는 장면/,
    /지우가 보라색 우산을 펴고 걷는 장면/,
    /지우와 민수가 보라색 우산 하나를 함께 쓰고/
  ];
  for (let index = 0; index < expectedAlt.length; index += 1) {
    const illustration = page.locator('.story-illustration-image');
    await expect(illustration).toBeVisible();
    await expect(illustration).toHaveAttribute('alt', expectedAlt[index]);
    await expect.poll(() => illustration.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth >= 700)).toBe(true);
    if (index < expectedAlt.length - 1) await page.getByRole('button', { name: '다음 장면' }).click();
  }
});

test('새싹 이야기 여섯 편의 표지가 모두 선명한 그림으로 보인다', async ({ page }) => {
  await openStoryMode(page);
  const covers = page.locator('.story-picks button > img');
  await expect(covers).toHaveCount(6);
  for (const cover of await covers.all()) {
    await expect(cover).toBeVisible();
    await expect.poll(() => cover.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth >= 240)).toBe(true);
  }
});

test('한걸음 이야기 여섯 편의 표지와 네 장면이 선명한 그림으로 보인다', async ({ page }) => {
  await openStoryMode(page);
  await page.getByRole('radio', { name: /한걸음/ }).click();

  const covers = page.locator('.story-picks button > img');
  await expect(covers).toHaveCount(6);
  for (const cover of await covers.all()) {
    await expect(cover).toBeVisible();
    await expect.poll(() => cover.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth >= 240)).toBe(true);
  }

  await page.locator('.story-picks').getByRole('button', { name: /도서관 책의 자리/ }).click();
  const expectedAlt = [/공룡 책을 골라/, /공룡 책을 재미있게 읽는/, /번호표와 책장 표시/, /알맞은 책장 자리/];
  for (let index = 0; index < expectedAlt.length; index += 1) {
    const illustration = page.locator('.story-illustration-image');
    await expect(illustration).toBeVisible();
    await expect(illustration).toHaveAttribute('alt', expectedAlt[index]);
    await expect.poll(() => illustration.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth >= 700)).toBe(true);
    if (index < expectedAlt.length - 1) await page.getByRole('button', { name: '다음 장면' }).click();
  }
});

test('탐험가 이야기 여섯 편의 표지와 다섯 장면이 선명한 그림으로 보인다', async ({ page }) => {
  await openStoryMode(page);
  await page.getByRole('radio', { name: /탐험가/ }).click();

  const covers = page.locator('.story-picks button > img');
  await expect(covers).toHaveCount(6);
  for (const cover of await covers.all()) {
    await expect(cover).toBeVisible();
    await expect.poll(() => cover.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth >= 240)).toBe(true);
  }

  await page.locator('.story-picks').getByRole('button', { name: /벌이 찾은 꽃밭/ }).click();
  const expectedAlt = [/날아가는 벌을 발견/, /노란 꽃에 앉아 꿀을/, /다리에 황금빛 꽃가루/, /분홍 꽃으로 날아가는/, /공책에 기록/];
  for (let index = 0; index < expectedAlt.length; index += 1) {
    const illustration = page.locator('.story-illustration-image');
    await expect(illustration).toBeVisible();
    await expect(illustration).toHaveAttribute('alt', expectedAlt[index]);
    await expect.poll(() => illustration.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth >= 700)).toBe(true);
    if (index < expectedAlt.length - 1) await page.getByRole('button', { name: '다음 장면' }).click();
  }
});

test('생각왕 이야기 여섯 편의 표지와 여섯 장면이 선명한 그림으로 보인다', async ({ page }) => {
  await openStoryMode(page);
  await page.getByRole('radio', { name: /생각왕/ }).click();

  const covers = page.locator('.story-picks button > img');
  await expect(covers).toHaveCount(6);
  for (const cover of await covers.all()) {
    await expect(cover).toBeVisible();
    await expect.poll(() => cover.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth >= 240)).toBe(true);
  }

  await page.locator('.story-picks').getByRole('button', { name: /개울을 막은 비닐/ }).click();
  const expectedAlt = [/느리게 흐르는/, /나뭇잎과 비닐/, /선생님께 알리는/, /관리 직원이/, /다시 흐르는/, /그림 안내판/];
  for (let index = 0; index < expectedAlt.length; index += 1) {
    const illustration = page.locator('.story-illustration-image');
    await expect(illustration).toBeVisible();
    await expect(illustration).toHaveAttribute('alt', expectedAlt[index]);
    await expect.poll(() => illustration.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth >= 700)).toBe(true);
    if (index < expectedAlt.length - 1) await page.getByRole('button', { name: '다음 장면' }).click();
  }
});

test('이야기 장면과 활동 문제를 음성으로 들을 수 있다', async ({ page }) => {
  await installSpeechMock(page);
  await openStoryMode(page);
  await page.locator('.story-picks').getByRole('button', { name: /비 오는 날의 우산/ }).click();
  await page.getByRole('button', { name: '이 장면 읽어 주기' }).click();
  await expect.poll(() => page.evaluate(() => (window as Window & { __storySpokenForTest: string[] }).__storySpokenForTest.at(-1))).toBe('하늘에 먹구름이 모였어요.');
  await page.getByRole('button', { name: '느리게 읽기' }).click();
  await expect.poll(() => page.evaluate(() => (window as Window & { __storySpeechRatesForTest: number[] }).__storySpeechRatesForTest.at(-1))).toBe(0.75);
  await page.getByRole('button', { name: '다음 장면' }).click();
  await page.getByRole('button', { name: '다음 장면' }).click();
  await page.getByRole('button', { name: '활동 시작' }).click();
  const activityPrompt = (await page.locator('#story-question-title').innerText()).trim();
  await page.getByRole('button', { name: /문제 읽어 주기/ }).click();
  await expect.poll(() => page.evaluate(() => (window as Window & { __storySpokenForTest: string[] }).__storySpokenForTest.at(-1))).toContain(activityPrompt);
});
