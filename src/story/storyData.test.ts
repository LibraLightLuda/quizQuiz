import { describe, expect, it } from 'vitest';
import { STORY_LEVELS, stories, storiesByLevel, validateStories } from './storyData';

describe('이야기 탐험대 콘텐츠', () => {
  it('4단계에 이야기 6편씩 총 24편을 제공한다', () => {
    expect(stories).toHaveLength(24);
    STORY_LEVELS.forEach((level) => expect(storiesByLevel(level)).toHaveLength(6));
  });

  it('모든 장면과 활동의 연결 관계가 유효하다', () => {
    expect(validateStories()).toEqual([]);
    expect(stories.every((story) => story.activities.length >= 6)).toBe(true);
  });

  it('장면에 낱말·기술·문장 수준 태그를 연결한다', () => {
    const taggedScenes = stories.flatMap((story) => story.scenes).filter((scene) => scene.vocabularyIds.length > 0);
    expect(taggedScenes.length).toBeGreaterThan(20);
    taggedScenes.forEach((scene) => {
      expect(scene.skillIds.length).toBeGreaterThan(0);
      expect(scene.sentenceLevel).toBeGreaterThanOrEqual(0);
      expect(scene.sentenceLevel).toBeLessThanOrEqual(3);
    });
  });

  it('생각왕의 마지막 선택 활동은 근거 찾기를 요구한다', () => {
    storiesByLevel('thinker').forEach((story) => {
      const finalActivity = story.activities[2];
      expect(finalActivity.type).toBe('choice');
      if (finalActivity.type === 'choice') expect(finalActivity.evidenceRequired).toBe(true);
    });
  });

  it('내용·순서뿐 아니라 감정·원인·낱말·제목·예측 활동을 고르게 포함한다', () => {
    const kinds = new Set(stories.flatMap((story) => story.activities.map((activity) => activity.kind)));
    expect(kinds).toEqual(new Set(['detail', 'sequence', 'cause', 'emotion', 'vocabulary', 'title', 'prediction']));
  });
});
