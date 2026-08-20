import { describe, expect, it } from 'vitest';
import type { StoryActivityState } from './types';
import { scoreStory, storyStrengthMessage } from './storyScoring';

const state = (id: string, patch: Partial<StoryActivityState> = {}): StoryActivityState => ({
  activityId: id, status: 'complete', optionOrder: [], triedOptionIds: [], triedEvidenceSceneIds: [],
  sequenceOrder: [], lockedSceneIds: [], wrongAttempts: 0, usedHint: false, reviewCount: 0,
  mustReview: false, firstTry: true, ...patch
});

describe('이야기 결과 계산', () => {
  it('모두 첫 시도에 해결하면 별 3개를 준다', () => {
    expect(scoreStory([state('a-detail'), state('a-sequence'), state('a-thinking')]).stars).toBe(3);
  });

  it('한 활동에서 도움을 받아도 완료 보상은 유지한다', () => {
    const score = scoreStory([state('a-detail'), state('a-sequence', { firstTry: false, usedHint: true }), state('a-thinking')]);
    expect(score).toEqual({ stars: 2, firstTryCount: 2, hintCount: 1, reviewCount: 0 });
  });

  it('순서를 첫 시도에 맞히면 구체적인 칭찬을 제공한다', () => {
    expect(storyStrengthMessage([state('a-detail'), state('a-sequence'), state('a-thinking')])).toContain('순서');
  });
});
