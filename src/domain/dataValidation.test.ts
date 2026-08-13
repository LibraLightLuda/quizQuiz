import { describe, expect, it } from 'vitest';
import { koreanWords } from '../data/koreanWords';
import { englishWords } from '../data/englishWords';
import { DIFFICULTIES } from './difficulty';

describe('언어 데이터', () => {
  it('각 언어와 난이도에 최소 30개의 단어가 있다', () => {
    for (const difficulty of DIFFICULTIES) {
      expect(koreanWords.filter((word) => word.difficulty === difficulty).length).toBeGreaterThanOrEqual(30);
      expect(englishWords.filter((word) => word.difficulty === difficulty).length).toBeGreaterThanOrEqual(30);
    }
    expect(koreanWords.length).toBeGreaterThanOrEqual(180);
    expect(englishWords.length).toBeGreaterThanOrEqual(180);
  });

  it('ID, 단어, 마스크 범위가 유효하다', () => {
    expect(new Set(koreanWords.map((word) => word.id)).size).toBe(koreanWords.length);
    expect(new Set(englishWords.map((word) => word.id)).size).toBe(englishWords.length);

    for (const word of koreanWords) {
      expect(word.word).toBe(word.word.normalize('NFC'));
      expect(word.word).toMatch(/^[가-힣]+$/);
      expect(word.hintKo.trim()).not.toBe('');
      const length = Array.from(word.word).length;
      expect(word.maskRanges.length).toBeGreaterThan(0);
      for (const range of word.maskRanges) {
        expect(range.start).toBeGreaterThanOrEqual(0);
        expect(range.length).toBeGreaterThan(0);
        expect(range.start + range.length).toBeLessThanOrEqual(length);
        expect(range.length).toBeLessThan(length);
      }
    }

    for (const word of englishWords) {
      expect(word.word).toMatch(/^[a-z]+$/);
      expect(word.meaningKo.trim()).not.toBe('');
      for (const range of word.maskRanges) {
        expect(range.start + range.length).toBeLessThanOrEqual(word.word.length);
        expect(range.length).toBeLessThan(word.word.length);
      }
    }
  });

  it('단어 길이와 마스크 길이가 난이도표에 맞는다', () => {
    const koreanLengths: Partial<Record<(typeof DIFFICULTIES)[number], readonly [number, number]>> = {
      easy: [2, 3], normal: [2, 4], hard: [3, 5], challenge: [3, 6]
    };
    const englishLengths: Record<(typeof DIFFICULTIES)[number], readonly [number, number]> = {
      sprout: [3, 4], easy: [3, 5], normal: [4, 7], hard: [5, 9], challenge: [6, 12]
    };
    const maskLengths: Record<(typeof DIFFICULTIES)[number], readonly number[]> = {
      sprout: [1], easy: [1], normal: [1, 2], hard: [2], challenge: [2, 3]
    };

    for (const word of koreanWords) {
      const bounds = koreanLengths[word.difficulty];
      if (bounds) expect(Array.from(word.word).length).toBeGreaterThanOrEqual(bounds[0]);
      if (bounds) expect(Array.from(word.word).length).toBeLessThanOrEqual(bounds[1]);
      word.maskRanges.forEach((range) => expect(maskLengths[word.difficulty]).toContain(range.length));
    }
    for (const word of englishWords) {
      const bounds = englishLengths[word.difficulty];
      expect(word.word.length).toBeGreaterThanOrEqual(bounds[0]);
      expect(word.word.length).toBeLessThanOrEqual(bounds[1]);
      word.maskRanges.forEach((range) => expect(maskLengths[word.difficulty]).toContain(range.length));
      if (word.difficulty === 'sprout') {
        word.maskRanges.forEach((range) => expect('aeiou').toContain(word.word[range.start]));
      }
    }
  });
});
