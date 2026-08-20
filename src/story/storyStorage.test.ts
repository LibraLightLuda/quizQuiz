import { beforeEach, describe, expect, it } from 'vitest';
import { SeededRandom } from '../services/randomService';
import { storiesByLevel } from './storyData';
import { createStoryProgress } from './storyGenerator';
import { clearStoryProgress, loadStoryProgress, loadStoryRecords, saveStoryCompletion, saveStoryProgress } from './storyStorage';

describe('이야기 탐험대 저장소', () => {
  beforeEach(() => localStorage.clear());

  it('읽기와 활동 진행 상태를 저장하고 복구한다', () => {
    const story = storiesByLevel('step')[0];
    const progress = createStoryProgress(story, false, undefined, new SeededRandom(4));
    progress.screen = 'activity';
    progress.pageIndex = 2;
    progress.activities[0].wrongAttempts = 1;
    progress.activities[0].triedOptionIds = [story.activities[0].type === 'choice' ? story.activities[0].options[1].id : ''];
    expect(saveStoryProgress(progress)).toBe(true);
    expect(loadStoryProgress()).toEqual(progress);
    expect(clearStoryProgress()).toBe(true);
    expect(loadStoryProgress()).toBeNull();
  });

  it('손상되거나 현재 콘텐츠와 맞지 않는 진행 상태는 버린다', () => {
    localStorage.setItem('numbercal.story.progress.v1', JSON.stringify({ schemaVersion: 1, storyId: 'missing' }));
    expect(loadStoryProgress()).toBeNull();
  });

  it('완료 기록과 일일 배지를 누적한다', () => {
    const story = storiesByLevel('sprout')[0];
    const progress = createStoryProgress(story, true, '2026-08-21', new SeededRandom(5));
    progress.activities.forEach((activity) => { activity.status = 'complete'; });
    const saved = saveStoryCompletion(loadStoryRecords(), progress);
    expect(saved.saved).toBe(true);
    expect(saved.result.stars).toBe(3);
    expect(saved.result.earnedDailyBadge).toBe(true);
    expect(loadStoryRecords().byStory[story.id]?.completedCount).toBe(1);
    expect(loadStoryRecords().dailyBadges).toContain('2026-08-21');
  });
});
