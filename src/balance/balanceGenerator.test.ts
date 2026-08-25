import { describe, expect, it } from 'vitest';
import { SeededRandom } from '../services/randomService';
import {
  BALANCE_DIFFICULTIES,
  BALANCE_SESSION_LENGTH,
  balanceGuidance,
  balancePuzzleSignature,
  balanceTotals,
  createBalanceProgress,
  generateBalancePuzzle,
  isBalanced,
  misplacedWeightIds,
  missingSolutionWeightIds,
  solutionIsUnique
} from './balanceGenerator';

describe('균형 저울 문제 생성기', () => {
  for (const difficulty of BALANCE_DIFFICULTIES) {
    it(`${difficulty} 단계에 해답이 하나뿐인 문제를 만든다`, () => {
      for (let seed = 1; seed <= 100; seed += 1) {
        const puzzle = generateBalancePuzzle(difficulty, new SeededRandom(seed));
        expect(solutionIsUnique(puzzle)).toBe(true);
        expect(isBalanced(puzzle, puzzle.solutionPlacements)).toBe(true);
        expect(isBalanced(puzzle, {})).toBe(false);
        const totals = balanceTotals(puzzle, puzzle.solutionPlacements);
        expect(totals.left).toBe(totals.right);
      }
    });
  }

  it('단계가 올라갈수록 한 추, 두 추, 양쪽 배치, 도형 추리를 사용한다', () => {
    const starter = generateBalancePuzzle('starter', new SeededRandom(10));
    const growing = generateBalancePuzzle('growing', new SeededRandom(10));
    const clever = generateBalancePuzzle('clever', new SeededRandom(10));
    const master = generateBalancePuzzle('master', new SeededRandom(10));
    expect(Object.keys(starter.solutionPlacements)).toHaveLength(1);
    expect(Object.keys(growing.solutionPlacements)).toHaveLength(2);
    expect(new Set(Object.values(clever.solutionPlacements))).toEqual(new Set(['left', 'right']));
    expect(master.clue).toContain('별 + 별');
    expect(master.weights.some((weight) => weight.display === '★')).toBe(true);
  });

  it('부족·초과·균형 상태에서 다음 행동을 정확히 구분한다', () => {
    const puzzle = generateBalancePuzzle('starter', new SeededRandom(22));
    expect(balanceGuidance(puzzle, {}).relation).toBe('needs-more');
    const wrong = puzzle.weights.find((weight) => !puzzle.solutionPlacements[weight.id])!;
    const wrongPlacement = { [wrong.id]: puzzle.allowedSides[0] };
    expect(balanceGuidance(puzzle, wrongPlacement).relation).toBe('too-heavy');
    expect(misplacedWeightIds(puzzle, wrongPlacement)).toContain(wrong.id);
    expect(missingSolutionWeightIds(puzzle, wrongPlacement)).toHaveLength(1);
    expect(balanceGuidance(puzzle, puzzle.solutionPlacements).relation).toBe('balanced');
  });

  it('한 세션에 중복 서명 없는 다섯 문제를 만들고 진행 상태를 초기화한다', () => {
    const progress = createBalanceProgress('growing', new SeededRandom(20260826));
    expect(progress.puzzles).toHaveLength(BALANCE_SESSION_LENGTH);
    expect(new Set(progress.puzzles.map(balancePuzzleSignature)).size).toBe(BALANCE_SESSION_LENGTH);
    expect(progress.puzzleIndex).toBe(0);
    expect(progress.placements).toEqual({});
    expect(progress.completedCount).toBe(0);
    expect(progress.hintLevel).toBe(0);
    expect(progress.phase).toBe('playing');
  });

  it('오늘의 도전은 같은 시드에서 같은 문제 내용을 만든다', () => {
    const first = createBalanceProgress('growing', new SeededRandom(12345), { daily: true, dateKey: '2026-08-26' });
    const second = createBalanceProgress('growing', new SeededRandom(12345), { daily: true, dateKey: '2026-08-26' });
    expect(second.puzzles.map(balancePuzzleSignature)).toEqual(first.puzzles.map(balancePuzzleSignature));
  });
});
