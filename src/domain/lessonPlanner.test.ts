import { describe, expect, it } from 'vitest';
import { lessonPhaseAt, lessonPhases } from './lessonPlanner';

describe('작은 모험 lesson deck', () => {
  it('5문제는 반가운 시작 1, 발견 2, 복습 1, 이야기 1로 구성된다', () => {
    expect(lessonPhases(5)).toEqual(['welcome', 'discover', 'discover', 'review', 'story']);
  });

  it('15문제는 3/6/3/3 구성이고 범위 밖 인덱스도 안전하다', () => {
    const phases = lessonPhases(15);
    expect(phases.filter((phase) => phase === 'welcome')).toHaveLength(3);
    expect(phases.filter((phase) => phase === 'discover')).toHaveLength(6);
    expect(phases.filter((phase) => phase === 'review')).toHaveLength(3);
    expect(phases.filter((phase) => phase === 'story')).toHaveLength(3);
    expect(lessonPhaseAt(5, 99)).toBe('story');
  });
});
