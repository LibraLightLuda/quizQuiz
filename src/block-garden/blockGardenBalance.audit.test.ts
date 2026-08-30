import { describe, expect, it } from 'vitest';
import { SeededRandom } from '../services/randomService';
import { BOARD_SIZE, type GardenGame } from './types';
import { createGardenGame, placeGardenPiece, shapeById, validPlacements } from './blockGardenRules';

const fittingPieces = (game: GardenGame): number => game.tray.filter((piece) => {
  const gardenShape = piece && shapeById(piece.shapeId);
  return gardenShape && validPlacements(game.board, gardenShape).length > 0;
}).length;

const simulate = (seed: number): { game: GardenGame; batches: number; forcedBatches: number } => {
  const random = new SeededRandom(seed);
  let game = createGardenGame(random, new Date('2026-08-30T00:00:00.000Z'));
  let batches = 1;
  let forcedBatches = fittingPieces(game) === 1 ? 1 : 0;
  while (game.status === 'playing' && game.turns < 300) {
    let best: { slot: number; anchor: number; value: number } | null = null;
    game.tray.forEach((piece, slot) => {
      const gardenShape = piece && shapeById(piece.shapeId);
      if (!gardenShape) return;
      validPlacements(game.board, gardenShape).forEach((anchor) => {
        const row = Math.floor(anchor / BOARD_SIZE);
        const column = anchor % BOARD_SIZE;
        const preview = placeGardenPiece(game, slot, row, column, new SeededRandom(1));
        const value = preview.clearedNow * 10000 - preview.game.board.filter(Boolean).length;
        if (!best || value > best.value) best = { slot, anchor, value };
      });
    });
    if (!best) break;
    const chosen = best as { slot: number; anchor: number; value: number };
    game = placeGardenPiece(game, chosen.slot, Math.floor(chosen.anchor / BOARD_SIZE), chosen.anchor % BOARD_SIZE, random).game;
    if (game.turns % 3 === 0 && game.status === 'playing') {
      batches += 1;
      if (fittingPieces(game) === 1) forcedBatches += 1;
    }
  }
  return { game, batches, forcedBatches };
};

describe('빈칸 정원 출시 전 밸런스 감사', () => {
  it('약한 공급 보정이 초반 즉사와 사실상 끝나지 않는 판을 함께 막는다', () => {
    const games = Array.from({ length: 30 }, (_, index) => simulate(index + 1));
    const turns = games.map(({ game }) => game.turns).sort((a, b) => a - b);
    const scores = games.map(({ game }) => game.score).sort((a, b) => a - b);
    const lines = games.map(({ game }) => game.clearedLines).sort((a, b) => a - b);
    const forcedBatchRate = games.reduce((sum, game) => sum + game.forcedBatches, 0)
      / games.reduce((sum, game) => sum + game.batches, 0);
    expect(games.every(({ game }) => game.status === 'game-over')).toBe(true);
    expect(turns[0]).toBeGreaterThanOrEqual(20);
    expect(turns[14]).toBeGreaterThanOrEqual(45);
    expect(turns[29]).toBeLessThan(300);
    expect(scores[14]).toBeGreaterThan(500);
    expect(lines[14]).toBeGreaterThanOrEqual(10);
    expect(forcedBatchRate).toBeLessThan(0.05);
  }, 30_000);
});
