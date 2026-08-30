import type { TangramPieceDefinition, TangramPieceKind, TangramPuzzle, TangramTier, TangramTransform } from './types';

export const TANGRAM_PIECES: readonly TangramPieceDefinition[] = [
  { id: 'large-a', kind: 'large', label: '큰 삼각형 1', color: '#f26b5e', points: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 0, y: 100 }] },
  { id: 'large-b', kind: 'large', label: '큰 삼각형 2', color: '#f6a623', points: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 0, y: 100 }] },
  { id: 'medium', kind: 'medium', label: '중간 삼각형', color: '#f1cf3a', points: [{ x: 0, y: 0 }, { x: 82, y: 0 }, { x: 0, y: 82 }] },
  { id: 'small-a', kind: 'small', label: '작은 삼각형 1', color: '#45b97c', points: [{ x: 0, y: 0 }, { x: 64, y: 0 }, { x: 0, y: 64 }] },
  { id: 'small-b', kind: 'small', label: '작은 삼각형 2', color: '#38a7db', points: [{ x: 0, y: 0 }, { x: 64, y: 0 }, { x: 0, y: 64 }] },
  { id: 'square', kind: 'square', label: '정사각형', color: '#5967d8', points: [{ x: 0, y: 0 }, { x: 68, y: 0 }, { x: 68, y: 68 }, { x: 0, y: 68 }] },
  { id: 'parallelogram', kind: 'parallelogram', label: '평행사변형', color: '#a86ad8', points: [{ x: 20, y: 0 }, { x: 88, y: 0 }, { x: 68, y: 68 }, { x: 0, y: 68 }] }
] as const;

const kinds: readonly TangramPieceKind[] = ['large', 'large', 'medium', 'small', 'small', 'square', 'parallelogram'];
const names = ['고양이', '돛단배', '집', '토끼', '물고기', '로켓', '백조', '공룡', '나무', '여우'];
const icons = ['🐱', '⛵', '🏠', '🐰', '🐟', '🚀', '🦢', '🦕', '🌳', '🦊'];
const layouts: ReadonlyArray<ReadonlyArray<readonly [number, number]>> = [
  [[1,1],[3,1],[2,2],[1,3],[3,3],[2,4],[4,2]], [[1,2],[2,1],[3,2],[4,3],[2,3],[3,4],[1,4]],
  [[1,1],[3,1],[2,2],[1,3],[3,3],[2,4],[4,4]], [[1,1],[3,1],[2,2],[1,4],[3,4],[2,3],[4,2]],
  [[1,2],[2,1],[3,2],[4,2],[2,3],[3,4],[1,4]], [[2,1],[1,3],[3,2],[4,3],[2,4],[3,4],[1,2]],
  [[1,1],[2,2],[3,1],[4,2],[1,4],[3,4],[2,3]], [[1,2],[3,1],[2,3],[4,2],[1,4],[3,4],[2,1]],
  [[2,1],[1,2],[3,2],[2,3],[4,3],[1,4],[3,4]], [[1,1],[2,2],[4,1],[3,3],[1,4],[3,4],[2,3]]
];

const tierInfo: ReadonlyArray<{ tier: TangramTier; suffix: string; rotationOffset: number }> = [
  { tier: 'starter', suffix: '', rotationOffset: 0 },
  { tier: 'growing', suffix: '의 그림자', rotationOffset: 2 },
  { tier: 'clever', suffix: '의 도전', rotationOffset: 4 }
];

export const TANGRAM_ACTION_CURVE: Record<TangramTier, readonly number[]> = {
  starter: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  growing: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
  clever: [20, 21, 22, 23, 24, 25, 26, 27, 28, 29]
};

export type TangramGuideLevel = 'strong' | 'medium' | 'light' | 'silhouette';
export const TANGRAM_STARTER_GUIDE_CURVE: readonly TangramGuideLevel[] = [
  'strong', 'strong', 'strong', 'medium', 'medium', 'medium', 'medium', 'light', 'light', 'light'
];

export const tangramGuideLevel = (puzzle: TangramPuzzle): TangramGuideLevel =>
  puzzle.tier === 'starter' ? TANGRAM_STARTER_GUIDE_CURVE[Number(puzzle.id.slice(-2)) - 1] : 'silhouette';

const distributeRotationSteps = (budget: number, puzzleNumber: number): number[] => {
  const steps = Array(TANGRAM_PIECES.length).fill(0) as number[];
  for (let action = 0; action < budget; action += 1) {
    steps[(action + puzzleNumber - 1) % steps.length] += 1;
  }
  return steps;
};

export const TANGRAM_PUZZLES: readonly TangramPuzzle[] = tierInfo.flatMap(({ tier, suffix, rotationOffset }, tierIndex) =>
  layouts.map((layout, index) => ({
    id: `${tier}-${String(index + 1).padStart(2, '0')}`,
    title: `${names[index]}${suffix}`,
    icon: icons[index],
    tier,
    targets: layout.map(([x, y], pieceIndex) => ({
      id: `target-${pieceIndex}`,
      kind: kinds[pieceIndex],
      x,
      y,
      rotation: ((pieceIndex + index + rotationOffset) % 8) * 45,
      flipped: kinds[pieceIndex] === 'parallelogram' && tierIndex === 2 && index % 2 === 1
    }))
  }))
);

export const initialTangramPieces = (puzzle: TangramPuzzle): TangramTransform[] =>
  TANGRAM_PIECES.map((piece, index) => {
    const target = puzzle.targets[index];
    const puzzleNumber = Number(puzzle.id.slice(-2));
    const totalActions = TANGRAM_ACTION_CURVE[puzzle.tier][puzzleNumber - 1];
    const flipRequired = puzzle.tier === 'clever';
    const needsFlip = flipRequired && piece.kind === 'parallelogram';
    const rotationBudget = totalActions - (flipRequired ? 1 : 0);
    const rotationSteps = distributeRotationSteps(rotationBudget, puzzleNumber)[index];
    return {
      x: 0,
      y: index,
      rotation: (target.rotation - rotationSteps * 45 + 360) % 360,
      flipped: needsFlip ? !target.flipped : target.flipped
    };
  });

export const tierLabel: Record<TangramTier, string> = { starter: '첫걸음', growing: '쑥쑥', clever: '척척' };
export const tierDescription: Record<TangramTier, string> = {
  starter: '처음엔 선명한 조각 선을 보고, 뒤로 갈수록 그림자를 살펴봐요.',
  growing: '앞 문제부터 하나씩 더 돌리며 모든 조각 방향을 익혀요.',
  clever: '모든 조각을 돌리고 평행사변형의 앞뒤도 하나씩 생각해요.'
};
