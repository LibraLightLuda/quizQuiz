import { describe, expect, it } from 'vitest';
import { SeededRandom } from '../services/randomService';
import { generateLanguageActivityQuestion } from './languageActivityGenerator';
import { lessonPhases } from './lessonPlanner';
import { skillDefinitionById } from './skillData';

describe('공통 언어 활동 생성기', () => {
  it('작은 모험에서 그림·소리·조립·문장 활동을 차례로 만난다', () => {
    const random = new SeededRandom(2026);
    const recentSignatures: string[] = [];
    const activities: string[] = [];
    for (const lessonPhase of lessonPhases(5)) {
      const question = generateLanguageActivityQuestion({
        mode: 'ko-adventure',
        difficulty: 'easy',
        recentSignatures,
        lessonPhase,
        theme: 'animals',
        targetSkillIds: ['ko-meaning-picture'],
        random
      });
      activities.push(question.activity!.kind);
      recentSignatures.push(question.signature);
    }
    expect(activities).toEqual([
      'picture-link', 'sound-match', 'word-build', 'word-build', 'sentence-complete'
    ]);
  });

  it('두 언어와 모든 단계에서 보기·기술 증거가 유효하다', () => {
    const modes = ['ko-adventure', 'en-adventure'] as const;
    const difficulties = ['easy', 'normal', 'hard', 'challenge'] as const;
    for (const mode of modes) {
      for (const difficulty of difficulties) {
        for (let seed = 1; seed <= 100; seed += 1) {
          const phase = lessonPhases(5)[seed % 5];
          const question = generateLanguageActivityQuestion({
            mode,
            difficulty,
            recentSignatures: [],
            lessonPhase: phase,
            theme: (['animals', 'food', 'nature'] as const)[seed % 3],
            random: new SeededRandom(seed)
          });
          expect(question.activity).toBeDefined();
          expect(question.options.length).toBeGreaterThanOrEqual(3);
          expect(question.options.some((option) => option.id === question.correctOptionId)).toBe(true);
          const evidence = question.metadata?.evidenceSkillIds as string[];
          expect(evidence.length).toBeGreaterThan(0);
          evidence.forEach((skillId) => expect(skillDefinitionById.has(skillId)).toBe(true));
        }
      }
    }
  });

  it('낱말 조립은 정답 조각과 방해 타일, 단계 힌트를 함께 만든다', () => {
    const question = generateLanguageActivityQuestion({
      mode: 'ko-adventure',
      difficulty: 'easy',
      recentSignatures: [],
      lessonPhase: 'review',
      random: new SeededRandom(17)
    });
    const activity = question.activity!;
    const targetChunks = Array.from(question.explanation);
    expect(activity.kind).toBe('word-build');
    expect(activity.targetTileCount).toBe(targetChunks.length);
    expect(activity.tiles).toHaveLength(targetChunks.length + 1);
    targetChunks.forEach((chunk) => {
      expect(activity.tiles!.filter((tile) => tile.value === chunk).length)
        .toBeGreaterThanOrEqual(targetChunks.filter((target) => target === chunk).length);
    });
    expect(activity.hintSteps).toHaveLength(3);
    expect(activity.hintSteps?.at(-1)).toContain(question.explanation);
  });

  it('소리 찾기는 정답을 화면 문구에 노출하지 않고 음성 대체 정보를 제공한다', () => {
    const question = generateLanguageActivityQuestion({
      mode: 'en-adventure',
      difficulty: 'easy',
      recentSignatures: [],
      lessonPhase: 'discover',
      random: new SeededRandom(7)
    });
    expect(question.activity?.kind).toBe('sound-match');
    expect(question.kind).toBe('listening');
    expect(question.speech?.text).toBe(question.explanation);
    expect(question.prompt).not.toContain(question.explanation);
  });

  it('도전 단계도 키보드 전용이 아닌 터치 보기로 생성한다', () => {
    const question = generateLanguageActivityQuestion({
      mode: 'ko-adventure',
      difficulty: 'challenge',
      recentSignatures: [],
      lessonPhase: 'story',
      random: new SeededRandom(9)
    });
    expect(question.activity?.kind).toBe('sentence-complete');
    expect(question.options).toHaveLength(4);
  });
});
