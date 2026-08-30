import { TANGRAM_ACTION_CURVE, TANGRAM_PIECES, TANGRAM_PUZZLES, initialTangramPieces } from './tangramData';
import type { TangramPieceState, TangramProgress, TangramPuzzle, TangramTarget } from './types';

export const normalizeRotation = (rotation: number): number => ((rotation % 360) + 360) % 360;

export const createTangramProgress = (puzzle: TangramPuzzle, dailyDateKey?: string): TangramProgress => ({
  schemaVersion: 1,
  puzzleId: puzzle.id,
  ...(dailyDateKey ? { dailyDateKey } : {}),
  pieces: TANGRAM_PIECES.map((piece, index) => ({ pieceId: piece.id, ...initialTangramPieces(puzzle)[index] })),
  hintLevel: 0,
  updatedAt: new Date().toISOString()
});

export const compatibleTarget = (
  puzzle: TangramPuzzle,
  pieces: readonly TangramPieceState[],
  pieceId: string,
  targetId: string
): TangramTarget | null => {
  const definition = TANGRAM_PIECES.find((piece) => piece.id === pieceId);
  const piece = pieces.find((item) => item.pieceId === pieceId);
  const target = puzzle.targets.find((item) => item.id === targetId);
  if (!definition || !piece || !target || definition.kind !== target.kind) return null;
  if (pieces.some((item) => item.pieceId !== pieceId && item.targetId === targetId)) return null;
  if (normalizeRotation(piece.rotation) !== normalizeRotation(target.rotation)) return null;
  if (definition.kind === 'parallelogram' && piece.flipped !== target.flipped) return null;
  return target;
};

export const placeTangramPiece = (
  progress: TangramProgress,
  puzzle: TangramPuzzle,
  pieceId: string,
  targetId: string
): TangramProgress | null => {
  const target = compatibleTarget(puzzle, progress.pieces, pieceId, targetId);
  if (!target) return null;
  return {
    ...progress,
    pieces: progress.pieces.map((piece) => piece.pieceId === pieceId
      ? { ...piece, x: target.x, y: target.y, rotation: target.rotation, flipped: target.flipped, targetId }
      : piece),
    updatedAt: new Date().toISOString()
  };
};

export const removeTangramPiece = (progress: TangramProgress, pieceId: string): TangramProgress => ({
  ...progress,
  pieces: progress.pieces.map((piece, index) => piece.pieceId === pieceId
    ? { ...piece, x: 0, y: index, targetId: undefined }
    : piece),
  updatedAt: new Date().toISOString()
});

export const tangramSolved = (progress: TangramProgress): boolean => progress.pieces.every((piece) => piece.targetId);
export const tangramStars = (hintLevel: number): 1 | 2 | 3 => hintLevel >= 4 ? 1 : hintLevel > 0 ? 2 : 3;

export const tangramRequiredSetupActions = (puzzle: TangramPuzzle): number => {
  const initial = initialTangramPieces(puzzle);
  return initial.reduce((total, piece, index) => {
    const target = puzzle.targets[index];
    const clockwiseTurns = (normalizeRotation(target.rotation - piece.rotation) / 45) % 8;
    const flip = TANGRAM_PIECES[index].kind === 'parallelogram' && piece.flipped !== target.flipped ? 1 : 0;
    return total + clockwiseTurns + flip;
  }, 0);
};

export const tangramSetupProfile = (puzzle: TangramPuzzle): { actions: number; rotatedPieces: number; needsFlip: boolean } => {
  const initial = initialTangramPieces(puzzle);
  return {
    actions: tangramRequiredSetupActions(puzzle),
    rotatedPieces: initial.filter((piece, index) => piece.rotation !== puzzle.targets[index].rotation).length,
    needsFlip: initial.some((piece, index) => piece.flipped !== puzzle.targets[index].flipped)
  };
};

export const validateTangramContent = (): string[] => {
  const errors: string[] = [];
  if (TANGRAM_PUZZLES.length !== 30) errors.push('칠교 문제는 30개여야 합니다.');
  const ids = new Set<string>();
  const signatures = new Set<string>();
  for (const puzzle of TANGRAM_PUZZLES) {
    if (ids.has(puzzle.id)) errors.push(`${puzzle.id}: 중복 ID`);
    ids.add(puzzle.id);
    if (puzzle.targets.length !== 7) errors.push(`${puzzle.id}: 목표가 7개가 아닙니다.`);
    const targetIds = new Set(puzzle.targets.map((target) => target.id));
    if (targetIds.size !== 7) errors.push(`${puzzle.id}: 목표 ID 중복`);
    const coordinates = new Set(puzzle.targets.map((target) => `${target.x},${target.y}`));
    if (coordinates.size !== 7) errors.push(`${puzzle.id}: 목표 위치 중복`);
    if (puzzle.targets.some((target) => target.x < 0 || target.x > 5 || target.y < 0 || target.y > 5)) errors.push(`${puzzle.id}: 보드 경계 이탈`);
    if (puzzle.targets.some((target) => target.rotation % 45 !== 0)) errors.push(`${puzzle.id}: 잘못된 회전`);
    const kinds = puzzle.targets.map((target) => target.kind).sort().join(',');
    const expected = TANGRAM_PIECES.map((piece) => piece.kind).sort().join(',');
    if (kinds !== expected) errors.push(`${puzzle.id}: 조각 종류 불일치`);
    if (puzzle.targets.some((target) => target.flipped && target.kind !== 'parallelogram')) errors.push(`${puzzle.id}: 뒤집을 수 없는 조각`);
    const signature = puzzle.targets.map((target) => `${target.kind}:${target.x},${target.y}:${target.rotation}:${target.flipped}`).join('|');
    if (signatures.has(signature)) errors.push(`${puzzle.id}: 동일한 정답 배치 중복`);
    signatures.add(signature);
    const number = Number(puzzle.id.slice(-2));
    const profile = tangramSetupProfile(puzzle);
    const expectedActions = TANGRAM_ACTION_CURVE[puzzle.tier][number - 1];
    if (profile.actions !== expectedActions) errors.push(`${puzzle.id}: 조작량 ${profile.actions}, 기대값 ${expectedActions}`);
    if (puzzle.tier === 'growing' && number === 1 && profile.rotatedPieces !== 4) errors.push(`${puzzle.id}: 첫 쑥쑥은 네 조각 회전으로 시작해야 합니다.`);
    if (puzzle.tier === 'growing' && number >= 4 && profile.rotatedPieces !== 7) errors.push(`${puzzle.id}: 쑥쑥 후반은 모든 조각을 회전해야 합니다.`);
    if (puzzle.tier === 'clever' && (!profile.needsFlip || profile.rotatedPieces !== 7)) errors.push(`${puzzle.id}: 척척은 모든 조각 회전과 뒤집기가 필요합니다.`);
  }
  return errors;
};
