import { describe, expect, it } from 'vitest';
import { TANGRAM_ACTION_CURVE, TANGRAM_PIECES, TANGRAM_PUZZLES, TANGRAM_STARTER_GUIDE_CURVE, tangramGuideLevel } from './tangramData';
import { compatibleTarget, createTangramProgress, normalizeRotation, placeTangramPiece, tangramRequiredSetupActions, tangramSetupProfile, tangramSolved, tangramStars, validateTangramContent } from './tangramRules';

describe('칠교 규칙과 콘텐츠', () => {
  it('세 단계 30문제가 유효한 7개 조각 목표를 가진다', () => {
    expect(TANGRAM_PUZZLES).toHaveLength(30);
    expect(validateTangramContent()).toEqual([]);
    expect(new Set(TANGRAM_PUZZLES.map((puzzle) => puzzle.tier))).toEqual(new Set(['starter', 'growing', 'clever']));
  });

  it('45도 회전을 정규화하고 평행사변형의 뒤집기를 구분한다', () => {
    expect(normalizeRotation(405)).toBe(45);
    expect(normalizeRotation(-45)).toBe(315);
    const puzzle = TANGRAM_PUZZLES.find((item) => item.tier === 'clever' && item.targets.some((target) => target.flipped))!;
    const target = puzzle.targets.find((item) => item.kind === 'parallelogram')!;
    const progress = createTangramProgress(puzzle);
    const pieces = progress.pieces.map((piece) => piece.pieceId === 'parallelogram' ? { ...piece, rotation: target.rotation, flipped: false } : piece);
    expect(compatibleTarget(puzzle, pieces, 'parallelogram', target.id)).toBeNull();
    expect(compatibleTarget(puzzle, pieces.map((piece) => piece.pieceId === 'parallelogram' ? { ...piece, flipped: true } : piece), 'parallelogram', target.id)).toEqual(target);
  });

  it('호환되는 같은 종류 조각을 모두 놓으면 완성된다', () => {
    const puzzle = TANGRAM_PUZZLES[0];
    let progress = createTangramProgress(puzzle);
    for (const definition of TANGRAM_PIECES) {
      const occupied = new Set(progress.pieces.map((piece) => piece.targetId).filter(Boolean));
      const target = puzzle.targets.find((item) => item.kind === definition.kind && !occupied.has(item.id))!;
      progress = { ...progress, pieces: progress.pieces.map((piece) => piece.pieceId === definition.id ? { ...piece, rotation: target.rotation, flipped: target.flipped } : piece) };
      progress = placeTangramPiece(progress, puzzle, definition.id, target.id)!;
    }
    expect(tangramSolved(progress)).toBe(true);
  });

  it('힌트 수준에 따라 별 3·2·1개를 준다', () => {
    expect(tangramStars(0)).toBe(3);
    expect(tangramStars(3)).toBe(2);
    expect(tangramStars(4)).toBe(1);
  });

  it('첫걸음·쑥쑥·척척 순서로 필요한 조작량이 증가한다', () => {
    const byTier = (tier: 'starter' | 'growing' | 'clever') => TANGRAM_PUZZLES.filter((puzzle) => puzzle.tier === tier).map(tangramRequiredSetupActions);
    const starter = byTier('starter'); const growing = byTier('growing'); const clever = byTier('clever');
    expect(starter).toEqual(TANGRAM_ACTION_CURVE.starter);
    expect(growing).toEqual(TANGRAM_ACTION_CURVE.growing);
    expect(clever).toEqual(TANGRAM_ACTION_CURVE.clever);
    expect(growing.slice(1).every((actions, index) => actions - growing[index] === 1)).toBe(true);
    expect(clever.slice(1).every((actions, index) => actions - clever[index] === 1)).toBe(true);
  });

  it('쑥쑥은 네 조각부터 시작해 모든 조각으로 넓히고 척척은 뒤집기를 더한다', () => {
    const growing = TANGRAM_PUZZLES.filter((puzzle) => puzzle.tier === 'growing').map(tangramSetupProfile);
    const clever = TANGRAM_PUZZLES.filter((puzzle) => puzzle.tier === 'clever').map(tangramSetupProfile);
    expect(growing[0]).toMatchObject({ actions: 4, rotatedPieces: 4, needsFlip: false });
    expect(growing[3].rotatedPieces).toBe(7);
    expect(growing.at(-1)).toMatchObject({ actions: 13, rotatedPieces: 7, needsFlip: false });
    expect(clever.every((profile) => profile.rotatedPieces === 7 && profile.needsFlip)).toBe(true);
  });

  it('첫걸음은 정답 방향을 유지하며 조각선 도움을 세 구간으로 줄인다', () => {
    const starter = TANGRAM_PUZZLES.filter((puzzle) => puzzle.tier === 'starter');
    expect(starter.map(tangramGuideLevel)).toEqual(TANGRAM_STARTER_GUIDE_CURVE);
    expect(starter.slice(0, 3).every((puzzle) => tangramGuideLevel(puzzle) === 'strong')).toBe(true);
    expect(starter.slice(-3).every((puzzle) => tangramGuideLevel(puzzle) === 'light')).toBe(true);
  });
});
