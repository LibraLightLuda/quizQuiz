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
