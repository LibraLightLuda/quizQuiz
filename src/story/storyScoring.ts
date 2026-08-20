import type { StoryActivityState } from './types';

export interface StoryScore {
  stars: number;
  firstTryCount: number;
  hintCount: number;
  reviewCount: number;
}

export const scoreStory = (activities: readonly StoryActivityState[]): StoryScore => {
  const completed = activities.filter((activity) => activity.status === 'complete');
  const firstTryCount = completed.filter((activity) => activity.firstTry).length;
  const hintCount = completed.filter((activity) => activity.usedHint).length;
  const reviewCount = completed.reduce((sum, activity) => sum + activity.reviewCount, 0);
  const stars = completed.length < activities.length
    ? 0
    : firstTryCount === activities.length && hintCount === 0 && reviewCount === 0
      ? 3
      : firstTryCount >= activities.length - 1 && reviewCount <= 1
        ? 2
        : 1;
  return { stars, firstTryCount, hintCount, reviewCount };
};

export const storyStrengthMessage = (activities: readonly StoryActivityState[]): string => {
  const sequence = activities.find((activity) => activity.activityId.endsWith('-sequence'));
  const choiceFirstTries = activities.filter((activity) => !activity.activityId.endsWith('-sequence') && activity.firstTry).length;
  if (sequence?.firstTry) return '이야기의 순서를 아주 잘 기억했어요!';
  if (choiceFirstTries >= 2) return '중요한 내용과 마음을 꼼꼼히 찾았어요!';
  return '힌트를 살펴보고 끝까지 해결했어요!';
};

export const storyPracticeMessage = (activities: readonly StoryActivityState[]): string => {
  const needsPractice = [...activities]
    .filter((activity) => !activity.firstTry || activity.usedHint || activity.reviewCount > 0)
    .sort((left, right) => (right.wrongAttempts + right.reviewCount) - (left.wrongAttempts + left.reviewCount))[0];
  if (!needsPractice) return '다음에는 한 단계 높은 이야기도 멋지게 탐험할 수 있어요.';
  const label = needsPractice.activityId.endsWith('-sequence')
    ? '장면 순서' : needsPractice.activityId.endsWith('-detail') ? '중요한 내용' : '이유와 마음';
  return `${label} 활동을 다시 해 보면 기억이 더 튼튼해져요.`;
};
