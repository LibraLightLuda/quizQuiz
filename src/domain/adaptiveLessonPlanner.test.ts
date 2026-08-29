import { describe, expect, it } from 'vitest';
import { SeededRandom } from '../services/randomService';
import type { SkillMastery } from './types';
import { planAdaptiveLesson, prerequisitesReady } from './adaptiveLessonPlanner';
import { skillDefinitions } from './skillData';

const mastered = (skillId: string): SkillMastery => ({
  skillId,
  attempts: 3,
  independentCorrect: 3,
  supportedCorrect: 0,
  recentAccuracy: 1,
  hintRate: 0,
  lastSeenAt: '2026-08-29T00:00:00.000Z',
  nextReviewAt: '2026-09-05T00:00:00.000Z',
  confidence: 1,
  recentIndependent: [true, true, true]
});

describe('맞춤 lesson planner', () => {
  it('선수 기술을 익히기 전에는 후속 기술을 열지 않는다', () => {
    const mastery = new Map<string, SkillMastery>();
    expect(prerequisitesReady('en-digraph', mastery)).toBe(false);
    mastery.set('en-basic-code', mastered('en-basic-code'));
    expect(prerequisitesReady('en-digraph', mastery)).toBe(true);
  });

  it('도움을 줄여 가며 최근 독립 시도를 절반 이상 성공한 아이도 다음 기술로 이어 간다', () => {
    const entry = {
      ...mastered('en-basic-code'), attempts: 5, confidence: 0.54, hintRate: 0.2,
      recentAccuracy: 0.6, recentIndependent: [true, false, true, true, false]
    };
    expect(prerequisitesReady('en-digraph', new Map([[entry.skillId, entry]]))).toBe(true);
  });

  it('작은 모험은 목표 하나, 긴 모험은 최대 두 개를 고른다', () => {
    const availableSkillIds = skillDefinitions.filter((skill) => skill.language === 'english').map((skill) => skill.id);
    const small = planAdaptiveLesson({
      language: 'english', difficulty: 'easy', length: 5, mastery: [],
      availableSkillIds, random: new SeededRandom(1)
    });
    const long = planAdaptiveLesson({
      language: 'english', difficulty: 'easy', length: 15, mastery: [],
      availableSkillIds, random: new SeededRandom(1)
    });
    expect(small.targetSkillIds).toHaveLength(1);
    expect(long.targetSkillIds.length).toBeGreaterThanOrEqual(1);
    expect(long.targetSkillIds.length).toBeLessThanOrEqual(2);
    expect(small.targetSkillIds).toEqual(['en-meaning-picture']);
  });

  it('10,000개 seed에서 빈 계획이나 목표 수 초과가 없다', () => {
    const availableSkillIds = skillDefinitions.map((skill) => skill.id);
    for (let seed = 1; seed <= 10_000; seed += 1) {
      const language = seed % 2 ? 'korean' : 'english';
      const length = seed % 3 ? 5 : 15;
      const plan = planAdaptiveLesson({
        language,
        difficulty: (['easy', 'normal', 'hard', 'challenge'] as const)[seed % 4],
        length,
        mastery: [],
        availableSkillIds,
        random: new SeededRandom(seed)
      });
      expect(plan.targetSkillIds.length).toBeGreaterThan(0);
      expect(plan.targetSkillIds.length).toBeLessThanOrEqual(length === 5 ? 1 : 2);
    }
  });
});
