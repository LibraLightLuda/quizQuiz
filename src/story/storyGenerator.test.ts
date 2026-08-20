import { describe, expect, it } from 'vitest';
import { SeededRandom } from '../services/randomService';
import { storiesByLevel } from './storyData';
import { createStoryProgress, dailyStory, isCorrectSequence, pickStory } from './storyGenerator';

describe('이야기 선택과 활동 생성', () => {
  it('최근 완료한 이야기를 우선 피한다', () => {
    const stories = storiesByLevel('sprout');
    const selected = pickStory('sprout', stories.slice(0, 5).map((story) => story.id), new SeededRandom(3));
    expect(selected.id).toBe(stories[5].id);
  });

  it('날짜와 단계가 같으면 같은 일일 이야기를 고른다', () => {
    expect(dailyStory('2026-08-21', 'step').id).toBe(dailyStory('2026-08-21', 'step').id);
    expect(storiesByLevel('step')).toContain(dailyStory('2026-08-21', 'step'));
  });

  it('선택지와 순서 활동을 섞고 진행 상태를 만든다', () => {
    const story = storiesByLevel('explorer')[0];
    const progress = createStoryProgress(story, false, undefined, new SeededRandom(9));
    expect(progress.activities).toHaveLength(3);
    const sequence = story.activities[1];
    const sequenceState = progress.activities[1];
    expect(sequence.type).toBe('sequence');
    if (sequence.type === 'sequence') {
      expect(isCorrectSequence(sequenceState.sequenceOrder, sequence.sceneIds)).toBe(false);
      expect(new Set(sequenceState.sequenceOrder)).toEqual(new Set(sequence.sceneIds));
    }
  });
});
