import type { LessonPhase, SessionLength } from './types';

const SMALL_LESSON: LessonPhase[] = ['welcome', 'discover', 'discover', 'review', 'story'];
const LONG_LESSON: LessonPhase[] = [
  'welcome', 'welcome', 'welcome',
  'discover', 'discover', 'discover', 'discover', 'discover', 'discover',
  'review', 'review', 'review',
  'story', 'story', 'story'
];

export const lessonPhases = (length: SessionLength): readonly LessonPhase[] =>
  length === 5 ? SMALL_LESSON : LONG_LESSON;

export const lessonPhaseAt = (length: SessionLength, questionIndex: number): LessonPhase =>
  lessonPhases(length)[Math.max(0, Math.min(length - 1, questionIndex))];

export const lessonPhaseLabel: Record<LessonPhase, string> = {
  welcome: '반가운 시작',
  discover: '오늘의 발견',
  review: '다시 만난 친구',
  story: '이야기 마무리'
};
