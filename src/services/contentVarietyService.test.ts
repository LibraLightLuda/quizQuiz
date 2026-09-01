import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CONTENT_VARIETY_STORAGE_KEY, createGenerationIssue, hashContentSeed, loadVarietyState,
  recordIssuedFingerprints, resetVarietyMemory
} from './contentVarietyService';

describe('content variety service', () => {
  beforeEach(() => {
    localStorage.clear();
    resetVarietyMemory();
    vi.restoreAllMocks();
  });

  it('keeps a daily issue stable for the same local date and difficulty', () => {
    const first = createGenerationIssue({ sectionId: 'sudoku', variant: 'growing', daily: true, dateKey: '2026-09-01' });
    recordIssuedFingerprints(first, ['mask:a']);
    const replay = createGenerationIssue({ sectionId: 'sudoku', variant: 'growing', daily: true, dateKey: '2026-09-01' });
    const nextDay = createGenerationIssue({ sectionId: 'sudoku', variant: 'growing', daily: true, dateKey: '2026-09-02' });
    expect(replay.seed).toBe(first.seed);
    expect(replay.excludedFingerprints).toEqual(first.excludedFingerprints);
    expect(nextDay.seed).not.toBe(first.seed);
  });

  it('retains recent fingerprints and recovers from damaged storage', () => {
    const issue = createGenerationIssue({ sectionId: 'math', variant: 'normal:math-mixed' });
    recordIssuedFingerprints(issue, ['a', 'b', 'a']);
    expect(loadVarietyState().recentByVariant['math:normal:math-mixed']).toEqual(['a', 'b']);
    localStorage.setItem(CONTENT_VARIETY_STORAGE_KEY, '{broken');
    expect(loadVarietyState().recentByVariant['math:normal:math-mixed']).toEqual(['a', 'b']);
  });

  it('creates stable non-zero hashes', () => {
    expect(hashContentSeed('daily:math')).toBe(hashContentSeed('daily:math'));
    expect(hashContentSeed('daily:math')).not.toBe(hashContentSeed('daily:english'));
  });
});
