import { skillDefinitionById, skillsForLearningRange } from './skillData';
import type { Difficulty, SessionLength, SkillMastery } from './types';
import type { RandomSource } from '../services/randomService';

export interface AdaptiveLessonPlan {
  targetSkillIds: string[];
  reason: 'first-play' | 'review-due' | 'growth';
}

interface PlannerContext {
  language: 'korean' | 'english';
  difficulty: Difficulty;
  length: SessionLength;
  mastery: readonly SkillMastery[];
  availableSkillIds: readonly string[];
  now?: number;
  random: RandomSource;
}

const READY_CONFIDENCE = 0.65;

export const hasLearningReadiness = (entry: SkillMastery | undefined): boolean => {
  if (!entry) return false;
  return entry.confidence >= READY_CONFIDENCE
    || (entry.attempts >= 4 && entry.recentIndependent.length >= 3 && entry.recentAccuracy >= 0.5 && entry.hintRate <= 0.5);
};

export const prerequisitesReady = (
  skillId: string,
  mastery: ReadonlyMap<string, SkillMastery>
): boolean => {
  const definition = skillDefinitionById.get(skillId);
  if (!definition) return false;
  return definition.prerequisites.every((prerequisite) => hasLearningReadiness(mastery.get(prerequisite)));
};

export const planAdaptiveLesson = (context: PlannerContext): AdaptiveLessonPlan => {
  const mastery = new Map(context.mastery.map((entry) => [entry.skillId, entry]));
  const available = new Set(context.availableSkillIds);
  const candidates = skillsForLearningRange(context.language, context.difficulty)
    .filter((skill) => available.has(skill.id))
    .filter((skill) => prerequisitesReady(skill.id, mastery));

  const fallback = skillsForLearningRange(context.language, context.difficulty)
    .filter((skill) => available.has(skill.id) && skill.prerequisites.length === 0);
  const active = candidates.length ? candidates : fallback;
  if (!active.length) return { targetSkillIds: [], reason: 'first-play' };

  const now = context.now ?? Date.now();
  const scored = active.map((skill) => {
    const entry = mastery.get(skill.id);
    const due = entry ? Date.parse(entry.nextReviewAt) <= now : false;
    const overdueDays = entry && due
      ? Math.floor((now - Date.parse(entry.nextReviewAt)) / (24 * 60 * 60 * 1000)) + 1
      : 0;
    const score = Math.min(4, overdueDays)
      + (entry ? 1 - entry.confidence : 2)
      + (entry?.hintRate ?? 0)
      + (entry && entry.recentIndependent.length >= 3 ? 0 : 1)
      + context.random.next() * 0.01;
    return { skill, entry, due, score };
  }).sort((a, b) => b.score - a.score || a.skill.order - b.skill.order);

  const targetCount = context.length === 15 ? Math.min(2, scored.length) : 1;
  const selected = scored.slice(0, targetCount);
  const reason = selected.some((candidate) => candidate.due)
    ? 'review-due'
    : selected.every((candidate) => !candidate.entry) ? 'first-play' : 'growth';

  return { targetSkillIds: selected.map((candidate) => candidate.skill.id), reason };
};
