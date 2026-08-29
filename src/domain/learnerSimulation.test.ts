import { describe, expect, it } from 'vitest';
import { learnerProfiles, simulateAllLearners, simulateLearner } from './learnerSimulation';

describe('가상 학습자 시뮬레이션', () => {
  it('6가지 학습자 유형을 각각 10,000 세션으로 결정론적으로 검증한다', () => {
    const reports = simulateAllLearners();
    expect(reports).toHaveLength(6);
    reports.forEach((report) => {
      expect(report.sessions, report.profileId).toBe(10_000);
      expect(report.emptyPlans, report.profileId).toBe(0);
      expect(report.difficultyRegressions, report.profileId).toBe(0);
      expect(report.maxSameTargetStreak, report.profileId).toBeLessThanOrEqual(12);
      expect(report.seenSkillIds.length, report.profileId).toBeGreaterThanOrEqual(8);
      expect(report.masteredSkillIds.length, report.profileId).toBeGreaterThanOrEqual(5);
    });
  });

  it('고정 seed는 같은 학습 경로와 품질 지표를 다시 만든다', () => {
    const profile = learnerProfiles.find((item) => item.id === 'listening-strength')!;
    expect(simulateLearner(profile, 500, 77)).toEqual(simulateLearner(profile, 500, 77));
  });
});
