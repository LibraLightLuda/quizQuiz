import { describe, expect, it } from 'vitest';
import { calculateStars, createMemoryProgress, layoutSignature, memoryContentSignature } from './memoryGenerator';

describe('학습형 기억력 카드 생성', () => {
  it('같은 그림이 아니라 의미가 연결된 고유한 쌍을 만든다', () => {
    const progress = createMemoryProgress('math', 'master', 'math-master');
    expect(progress.cards).toHaveLength(20);
    expect(new Set(progress.cards.map((card) => card.content)).size).toBe(20);
    const grouped = progress.cards.reduce((map, card) => {
      map.set(card.pairId, [...(map.get(card.pairId) ?? []), card]);
      return map;
    }, new Map<string, typeof progress.cards>());
    expect(grouped.size).toBe(10);
    for (const cards of grouped.values()) {
      expect(cards).toHaveLength(2);
      expect(cards[0].content).not.toBe(cards[1].content);
      expect(new Set(cards.map((card) => card.side))).toEqual(new Set(['question', 'answer']));
    }
  });

  it('통합 모드에는 수학·한국어·영어가 모두 등장한다', () => {
    const progress = createMemoryProgress('mixed', 'growing', 'mixed-balanced');
    expect(new Set(progress.cards.map((card) => card.category))).toEqual(new Set(['math', 'korean', 'english']));
  });

  it('언어 카드 쌍은 같은 단어 ID와 기술 태그를 공유한다', () => {
    const progress = createMemoryProgress('english', 'master', 'english-evidence');
    const tagged = progress.cards.filter((card) => card.wordId);
    expect(tagged.length).toBeGreaterThan(0);
    for (const card of tagged) {
      const partner = progress.cards.find((candidate) => candidate.pairId === card.pairId && candidate.id !== card.id)!;
      expect(partner.wordId).toBe(card.wordId);
      expect(partner.skillIds).toEqual(card.skillIds);
      expect(card.skillIds?.length).toBeGreaterThan(0);
    }
  });

  it('일일 도전 시드는 같은 배치를 재현하고 일반 게임은 최근 배치를 피한다', () => {
    const first = createMemoryProgress('mixed', 'growing', 'daily-2026-08-14', true, '2026-08-14');
    const same = createMemoryProgress('mixed', 'growing', 'daily-2026-08-14', true, '2026-08-14');
    const avoided = createMemoryProgress('mixed', 'growing', 'daily-2026-08-14', false, undefined, [layoutSignature(first.cards)]);
    expect(layoutSignature(same.cards)).toBe(layoutSignature(first.cards));
    expect(layoutSignature(avoided.cards)).not.toBe(layoutSignature(first.cards));
  });

  it('카드 배치가 아니라 같은 카드 구성 자체도 최근 문제에서 피한다', () => {
    const first = createMemoryProgress('english', 'focus', 'content-seed');
    const avoided = createMemoryProgress(
      'english', 'focus', 'content-seed', false, undefined, [], [memoryContentSignature(first.cards)]
    );
    expect(memoryContentSignature(avoided.cards)).not.toBe(memoryContentSignature(first.cards));
    expect(avoided.cards.every((card) => !card.wordId || card.wordId.startsWith('en-hard-'))).toBe(true);
  });

  it('시도 횟수에 따라 별을 1~3개 준다', () => {
    expect(calculateStars(4, 4)).toBe(3);
    expect(calculateStars(4, 6)).toBe(2);
    expect(calculateStars(4, 7)).toBe(1);
  });
});
