import { SeededRandom } from '../services/randomService';
import { recordSkillAttempt } from '../services/skillMasteryService';
import { hasLearningReadiness, planAdaptiveLesson } from './adaptiveLessonPlanner';
import { skillDefinitions, skillsForLearningRange } from './skillData';
import type { Difficulty, SkillMastery } from './types';

export type LearnerProfileId =
  | 'complete-beginner'
  | 'fast-learner'
  | 'slow-careful'
  | 'impulsive-clicker'
  | 'listening-strength'
  | 'reading-strength';

export interface LearnerProfile {
  id: LearnerProfileId;
  label: string;
  independentCorrectRate: number;
  supportRate: number;
  listeningBonus: number;
  readingBonus: number;
}

export const learnerProfiles: readonly LearnerProfile[] = [
  { id: 'complete-beginner', label: '완전 초보', independentCorrectRate: 0.62, supportRate: 0.24, listeningBonus: 0, readingBonus: 0 },
  { id: 'fast-learner', label: '빠른 학습', independentCorrectRate: 0.91, supportRate: 0.04, listeningBonus: 0.02, readingBonus: 0.02 },
  { id: 'slow-careful', label: '느리지만 정확', independentCorrectRate: 0.82, supportRate: 0.12, listeningBonus: 0, readingBonus: 0.03 },
  { id: 'impulsive-clicker', label: '충동 클릭', independentCorrectRate: 0.55, supportRate: 0.18, listeningBonus: 0.02, readingBonus: 0 },
  { id: 'listening-strength', label: '듣기 강점', independentCorrectRate: 0.68, supportRate: 0.14, listeningBonus: 0.2, readingBonus: -0.08 },
  { id: 'reading-strength', label: '읽기 강점', independentCorrectRate: 0.68, supportRate: 0.1, listeningBonus: -0.08, readingBonus: 0.2 }
];

export interface LearnerSimulationReport {
  profileId: LearnerProfileId;
  sessions: number;
  emptyPlans: number;
  maxSameTargetStreak: number;
  difficultyRegressions: number;
  seenSkillIds: string[];
  masteredSkillIds: string[];
  finalDifficulty: { korean: Difficulty; english: Difficulty };
}

const difficulties: readonly Difficulty[] = ['easy', 'normal', 'hard', 'challenge'];

const difficultyAfter = (
  language: 'korean' | 'english',
  difficulty: Difficulty,
  mastery: readonly SkillMastery[]
): Difficulty => {
  const currentSkills = skillsForLearningRange(language, difficulty);
  const masteryById = new Map(mastery.map((entry) => [entry.skillId, entry]));
  if (!currentSkills.length || !currentSkills.every((skill) => hasLearningReadiness(masteryById.get(skill.id)))) return difficulty;
  return difficulties[Math.min(difficulties.length - 1, difficulties.indexOf(difficulty) + 1)];
};

const rateFor = (profile: LearnerProfile, listening: boolean): number =>
  Math.max(0.05, Math.min(0.98, profile.independentCorrectRate + (listening ? profile.listeningBonus : profile.readingBonus)));

export const simulateLearner = (
  profile: LearnerProfile,
  sessions = 10_000,
  seed = 20260830
): LearnerSimulationReport => {
  const random = new SeededRandom(seed);
  let mastery: SkillMastery[] = [];
  let koreanDifficulty: Difficulty = 'easy';
  let englishDifficulty: Difficulty = 'easy';
  let emptyPlans = 0;
  let sameTargetStreak = 0;
  let maxSameTargetStreak = 0;
  let previousTarget = '';
  let difficultyRegressions = 0;
  const seen = new Set<string>();
  const skillIdsByLanguage = {
    korean: skillDefinitions.filter((skill) => skill.language === 'korean').map((skill) => skill.id),
    english: skillDefinitions.filter((skill) => skill.language === 'english').map((skill) => skill.id)
  };
  const start = Date.parse('2026-08-30T00:00:00.000Z');

  for (let sessionIndex = 0; sessionIndex < sessions; sessionIndex += 1) {
    const language = sessionIndex % 2 === 0 ? 'korean' : 'english';
    const difficulty = language === 'korean' ? koreanDifficulty : englishDifficulty;
    const plan = planAdaptiveLesson({
      language,
      difficulty,
      length: sessionIndex % 4 === 0 ? 15 : 5,
      mastery,
      availableSkillIds: skillIdsByLanguage[language],
      now: start + sessionIndex * 24 * 60 * 60 * 1000,
      random
    });
    if (!plan.targetSkillIds.length) {
      emptyPlans += 1;
      continue;
    }
    const target = plan.targetSkillIds.join(',');
    sameTargetStreak = target === previousTarget ? sameTargetStreak + 1 : 1;
    previousTarget = target;
    maxSameTargetStreak = Math.max(maxSameTargetStreak, sameTargetStreak);
    plan.targetSkillIds.forEach((skillId) => seen.add(skillId));

    const listening = random.next() < 0.5;
    const correct = random.next() < rateFor(profile, listening);
    const supported = correct && random.next() < profile.supportRate;
    mastery = recordSkillAttempt(mastery, {
      skillIds: plan.targetSkillIds,
      resolution: correct ? 'correct' : 'incorrect',
      supported,
      hintUsed: supported,
      now: new Date(start + sessionIndex * 24 * 60 * 60 * 1000)
    });

    const nextDifficulty = difficultyAfter(language, difficulty, mastery);
    if (difficulties.indexOf(nextDifficulty) < difficulties.indexOf(difficulty)) difficultyRegressions += 1;
    if (language === 'korean') koreanDifficulty = nextDifficulty;
    else englishDifficulty = nextDifficulty;
  }

  return {
    profileId: profile.id,
    sessions,
    emptyPlans,
    maxSameTargetStreak,
    difficultyRegressions,
    seenSkillIds: [...seen].sort(),
    masteredSkillIds: mastery.filter(hasLearningReadiness).map((entry) => entry.skillId).sort(),
    finalDifficulty: { korean: koreanDifficulty, english: englishDifficulty }
  };
};

export const simulateAllLearners = (sessions = 10_000): LearnerSimulationReport[] =>
  learnerProfiles.map((profile, index) => simulateLearner(profile, sessions, 20260830 + index));
