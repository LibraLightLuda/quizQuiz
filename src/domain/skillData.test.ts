import { describe, expect, it } from 'vitest';
import { englishWords } from '../data/englishWords';
import { koreanWords } from '../data/koreanWords';
import {
  skillActivityCoverage, skillDefinitionById, skillDefinitions,
  validateSkillActivityCoverage, validateSkillGraph
} from './skillData';

describe('언어 기술 그래프와 단어 태그', () => {
  it('기술 ID와 선수 관계가 유효하다', () => {
    expect(new Set(skillDefinitions.map((skill) => skill.id)).size).toBe(skillDefinitions.length);
    expect(validateSkillGraph()).toEqual([]);
  });

  it('모든 한국어·영어 낱말이 유효한 기술 ID를 가진다', () => {
    for (const word of [...koreanWords, ...englishWords]) {
      expect(word.skillIds.length, word.id).toBeGreaterThan(0);
      for (const skillId of word.skillIds) {
        expect(skillDefinitionById.has(skillId), word.id + ': ' + skillId).toBe(true);
      }
    }
  });

  it('기초 영어에 CVC와 주요 철자 묶음의 학습 재료가 있다', () => {
    const easySkills = new Set(englishWords.filter((word) => word.difficulty === 'easy').flatMap((word) => word.skillIds));
    expect(easySkills).toContain('en-cvc');
    expect(easySkills).toContain('en-short-vowel');
    expect(easySkills).toContain('en-digraph');
    expect(easySkills).toContain('en-silent-e');
  });

  it('모든 기술에 인식형·생산형·문맥형 활동이 함께 연결되어 있다', () => {
    expect(validateSkillActivityCoverage()).toEqual([]);
    for (const skill of skillDefinitions) {
      const coverage = skillActivityCoverage.get(skill.id)!;
      expect(coverage.recognition.length, `${skill.id} recognition`).toBeGreaterThan(0);
      expect(coverage.production.length, `${skill.id} production`).toBeGreaterThan(0);
      expect(coverage.contextual.length, `${skill.id} contextual`).toBeGreaterThan(0);
    }
  });
});
