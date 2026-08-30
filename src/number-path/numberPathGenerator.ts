import { createId, randomInt, type RandomSource } from '../services/randomService';
import type {
  NumberPathBridge,
  NumberPathDifficulty,
  NumberPathNode,
  NumberPathProgress,
  NumberPathPuzzle,
  PathValidation
} from './types';

export const NUMBER_PATH_SESSION_LENGTH = 5;
export const NUMBER_PATH_STARTING_LIVES = 3;
export const NUMBER_PATH_DIFFICULTIES: NumberPathDifficulty[] = ['starter', 'growing', 'clever', 'master'];

export const numberPathDifficultyInfo: Record<NumberPathDifficulty, {
  label: string;
  description: string;
  example: string;
  age: string;
}> = {
  starter: { label: '첫걸음', description: '두 다리 중 골라요', example: '🌿 4다리', age: '1~5 덧셈' },
  growing: { label: '쑥쑥', description: '먼 길까지 계획해요', example: '🌉 5다리', age: '1~9 덧셈' },
  clever: { label: '척척', description: '열쇠 다리를 찾아요', example: '🔑 6다리', age: '열쇠 길 통과' },
  master: { label: '달인', description: '별과 음수를 살펴요', example: '⭐ 7다리', age: '덧셈과 뺄셈' }
};

interface DifficultyConfig {
  crossings: number;
  min: number;
  max: number;
  threeWayLayer?: number;
  marker: 'none' | 'key' | 'stars';
}

const configs: Record<NumberPathDifficulty, DifficultyConfig> = {
  starter: { crossings: 4, min: 1, max: 5, marker: 'none' },
  growing: { crossings: 5, min: 1, max: 9, threeWayLayer: 2, marker: 'none' },
  clever: { crossings: 6, min: 1, max: 9, threeWayLayer: 3, marker: 'key' },
  master: { crossings: 7, min: -4, max: 9, threeWayLayer: 4, marker: 'stars' }
};

export const nodeId = (layer: number, lane = 1): string => `n${layer}-${lane}`;
export const bridgeId = (fromNodeId: string, toNodeId: string, option = 0): string =>
  `b-${fromNodeId}-${toNodeId}-${option}`;

const bridgeMap = (puzzle: NumberPathPuzzle): Map<string, NumberPathBridge> =>
  new Map(puzzle.bridges.map((bridge) => [bridge.id, bridge]));

export const outgoingBridges = (puzzle: NumberPathPuzzle, node: string): NumberPathBridge[] =>
  puzzle.bridges.filter((bridge) => bridge.fromNodeId === node);

export const pathSum = (puzzle: NumberPathPuzzle, path: readonly string[]): number => {
  const bridges = bridgeMap(puzzle);
  return path.reduce((sum, id) => sum + (bridges.get(id)?.value ?? 0), 0);
};

const formatValue = (value: number, first: boolean): string => {
  if (first) return String(value);
  return value < 0 ? `− ${Math.abs(value)}` : `+ ${value}`;
};

export const pathEquation = (puzzle: NumberPathPuzzle, path: readonly string[]): string => {
  const bridges = bridgeMap(puzzle);
  return path.map((id, index) => formatValue(bridges.get(id)?.value ?? 0, index === 0)).join(' ');
};

export const nodeAfterPath = (puzzle: NumberPathPuzzle, path: readonly string[]): string | null => {
  let current = puzzle.startNodeId;
  const bridges = bridgeMap(puzzle);
  for (const id of path) {
    const bridge = bridges.get(id);
    if (!bridge || bridge.fromNodeId !== current) return null;
    current = bridge.toNodeId;
  }
  return current;
};

const markersValid = (puzzle: NumberPathPuzzle, path: readonly string[], complete: boolean): boolean => {
  const selected = puzzle.requiredMarkerBridgeIds.map((id) => path.indexOf(id));
  if (!complete && selected.some((index) => index === -1)) return true;
  return selected.every((index) => index >= 0) && selected.every((index, position) => position === 0 || index > selected[position - 1]);
};

const pathStructureValid = (puzzle: NumberPathPuzzle, path: readonly string[]): boolean =>
  path.length <= puzzle.requiredCrossings
  && new Set(path).size === path.length
  && nodeAfterPath(puzzle, path) !== null
  && markersValid(puzzle, path, false);

export const enumerateSolutions = (
  puzzle: NumberPathPuzzle,
  limit = 2,
  prefix: readonly string[] = []
): string[][] => {
  if (!pathStructureValid(puzzle, prefix)) return [];
  const results: string[][] = [];
  const startNode = nodeAfterPath(puzzle, prefix);
  if (!startNode) return results;
  const visit = (node: string, path: string[]) => {
    if (results.length >= limit) return;
    if (path.length === puzzle.requiredCrossings) {
      if (node === puzzle.endNodeId && pathSum(puzzle, path) === puzzle.targetSum && markersValid(puzzle, path, true)) {
        results.push([...path]);
      }
      return;
    }
    for (const bridge of outgoingBridges(puzzle, node)) {
      if (!path.includes(bridge.id)) visit(bridge.toNodeId, [...path, bridge.id]);
      if (results.length >= limit) return;
    }
  };
  visit(startNode, [...prefix]);
  return results;
};

export const solutionIsUnique = (puzzle: NumberPathPuzzle): boolean => enumerateSolutions(puzzle, 2).length === 1;

export const viableNextBridgeIds = (puzzle: NumberPathPuzzle, path: readonly string[]): string[] => {
  if (!pathStructureValid(puzzle, path) || path.length >= puzzle.requiredCrossings) return [];
  const current = nodeAfterPath(puzzle, path);
  if (!current) return [];
  return outgoingBridges(puzzle, current)
    .filter((bridge) => enumerateSolutions(puzzle, 1, [...path, bridge.id]).length > 0)
    .map((bridge) => bridge.id);
};

export const validatePath = (puzzle: NumberPathPuzzle, path: readonly string[]): PathValidation => {
  if (!pathStructureValid(puzzle, path)) return { status: 'dead-end' };
  const current = nodeAfterPath(puzzle, path);
  if (path.length < puzzle.requiredCrossings) {
    if (enumerateSolutions(puzzle, 1, path).length === 0) return { status: 'dead-end' };
    return {
      status: 'incomplete',
      remainingBridges: puzzle.requiredCrossings - path.length,
      difference: puzzle.targetSum - pathSum(puzzle, path)
    };
  }
  if (current !== puzzle.endNodeId) return { status: 'wrong-end' };
  const missing = puzzle.requiredMarkerBridgeIds.find((id) => !path.includes(id));
  if (missing) return { status: 'missing-marker', marker: bridgeMap(puzzle).get(missing)?.marker ?? 'star' };
  if (pathSum(puzzle, path) !== puzzle.targetSum) return { status: 'dead-end' };
  return { status: 'solved', equation: `${pathEquation(puzzle, path)} = ${puzzle.targetSum}` };
};

const buildTopology = (config: DifficultyConfig, random: RandomSource): {
  nodes: NumberPathNode[];
  edgePairs: Array<[string, string, number]>;
  solutionBridgeIds: string[];
} => {
  const nodes: NumberPathNode[] = Array.from({ length: config.crossings + 1 }, (_, layer) => ({
    id: nodeId(layer),
    layer,
    lane: 1,
    kind: layer === 0 ? 'start' : layer === config.crossings ? 'end' : 'junction'
  }));
  const edgePairs: Array<[string, string, number]> = [];
  const solutionBridgeIds: string[] = [];
  for (let layer = 0; layer < config.crossings; layer += 1) {
    const from = nodeId(layer);
    const to = nodeId(layer + 1);
    const choiceCount = config.threeWayLayer === layer ? 3 : 2;
    for (let option = 0; option < choiceCount; option += 1) edgePairs.push([from, to, option]);
    const solutionOption = randomInt(random, 0, choiceCount - 1);
    solutionBridgeIds.push(bridgeId(from, to, solutionOption));
  }
  return { nodes, edgePairs, solutionBridgeIds };
};

const applyMarkers = (
  difficulty: NumberPathDifficulty,
  bridges: NumberPathBridge[],
  solutionBridgeIds: readonly string[],
  random: RandomSource
): string[] => {
  if (difficulty === 'clever') {
    const index = randomInt(random, 1, solutionBridgeIds.length - 2);
    const bridge = bridges.find((item) => item.id === solutionBridgeIds[index])!;
    bridge.marker = 'key';
    return [bridge.id];
  }
  if (difficulty === 'master') {
    const firstIndex = randomInt(random, 1, Math.max(1, solutionBridgeIds.length - 4));
    const secondIndex = randomInt(random, firstIndex + 2, solutionBridgeIds.length - 2);
    const first = bridges.find((item) => item.id === solutionBridgeIds[firstIndex])!;
    const second = bridges.find((item) => item.id === solutionBridgeIds[secondIndex])!;
    first.marker = 'star';
    first.markerOrder = 1;
    second.marker = 'star';
    second.markerOrder = 2;
    return [first.id, second.id];
  }
  return [];
};

const buildCandidate = (difficulty: NumberPathDifficulty, random: RandomSource, attempt: number): NumberPathPuzzle => {
  const config = configs[difficulty];
  const topology = buildTopology(config, random);
  const bridges = topology.edgePairs.map(([fromNodeId, toNodeId, option]) => ({
    id: bridgeId(fromNodeId, toNodeId, option),
    fromNodeId,
    toNodeId,
    value: randomInt(random, config.min, config.max)
  } satisfies NumberPathBridge));
  if (difficulty === 'master' && bridges.every((bridge) => bridge.value >= 0)) {
    bridges[randomInt(random, 0, bridges.length - 1)].value = -randomInt(random, 1, 4);
  }
  const solutionBridgeIds = topology.solutionBridgeIds;
  const requiredMarkerBridgeIds = applyMarkers(difficulty, bridges, solutionBridgeIds, random);
  return {
    id: `bridge-${difficulty}-${attempt}-${Math.floor(random.next() * 1_000_000)}`,
    difficulty,
    nodes: topology.nodes,
    bridges,
    startNodeId: topology.nodes[0].id,
    endNodeId: topology.nodes.at(-1)!.id,
    requiredCrossings: config.crossings,
    targetSum: solutionBridgeIds.reduce((sum, id) => sum + bridges.find((bridge) => bridge.id === id)!.value, 0),
    requiredMarkerBridgeIds,
    solutionBridgeIds
  };
};

const fallbackPuzzle = (difficulty: NumberPathDifficulty, variant: number): NumberPathPuzzle => {
  const config = configs[difficulty];
  let state = variant + 1;
  const topology = buildTopology(config, { next: () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return state / 0x1_0000_0000;
  } });
  const solutionBridgeIds = topology.solutionBridgeIds;
  const solutionSet = new Set(solutionBridgeIds);
  const bridges = topology.edgePairs.map(([fromNodeId, toNodeId, option]) => {
    const id = bridgeId(fromNodeId, toNodeId, option);
    const solutionIndex = solutionBridgeIds.indexOf(id);
    const solutionValue = difficulty === 'master' ? (solutionIndex === 0 ? -4 : 1) : 1;
    return { id, fromNodeId, toNodeId, value: solutionSet.has(id) ? solutionValue : config.max };
  });
  const requiredMarkerBridgeIds = applyMarkers(difficulty, bridges, solutionBridgeIds, { next: () => 0.25 });
  return {
    id: `bridge-${difficulty}-fallback-${variant}`,
    difficulty,
    nodes: topology.nodes,
    bridges,
    startNodeId: topology.nodes[0].id,
    endNodeId: topology.nodes.at(-1)!.id,
    requiredCrossings: config.crossings,
    targetSum: solutionBridgeIds.reduce((sum, id) => sum + bridges.find((bridge) => bridge.id === id)!.value, 0),
    requiredMarkerBridgeIds,
    solutionBridgeIds
  };
};

export const numberPathPuzzleSignature = (puzzle: NumberPathPuzzle): string =>
  `${puzzle.difficulty}|${puzzle.targetSum}|${puzzle.solutionBridgeIds.join(',')}|${puzzle.bridges.map((bridge) =>
    `${bridge.id}:${bridge.value}:${bridge.marker ?? ''}:${bridge.markerOrder ?? ''}`).join(',')}`;

export const generateNumberPathPuzzle = (
  difficulty: NumberPathDifficulty,
  random: RandomSource,
  excludedSignatures: readonly string[] = []
): NumberPathPuzzle => {
  for (let attempt = 0; attempt < 500; attempt += 1) {
    const candidate = buildCandidate(difficulty, random, attempt);
    if (solutionIsUnique(candidate) && !excludedSignatures.includes(numberPathPuzzleSignature(candidate))) return candidate;
  }
  for (let variant = 0; variant < 100; variant += 1) {
    const fallback = fallbackPuzzle(difficulty, variant);
    if (solutionIsUnique(fallback) && !excludedSignatures.includes(numberPathPuzzleSignature(fallback))) return fallback;
  }
  throw new Error(`Unable to create a distinct bridge puzzle for ${difficulty}`);
};

export const createNumberPathProgress = (
  difficulty: NumberPathDifficulty,
  random: RandomSource,
  options: { daily?: boolean; dateKey?: string; recentSignatures?: readonly string[] } = {}
): NumberPathProgress => {
  const puzzles: NumberPathPuzzle[] = [];
  const signatures = [...(options.recentSignatures ?? [])];
  while (puzzles.length < NUMBER_PATH_SESSION_LENGTH) {
    const puzzle = generateNumberPathPuzzle(difficulty, random, signatures);
    puzzles.push(puzzle);
    signatures.push(numberPathPuzzleSignature(puzzle));
  }
  return {
    schemaVersion: 2,
    id: createId('number-path'),
    difficulty,
    puzzles,
    puzzleIndex: 0,
    currentNodeId: puzzles[0].startNodeId,
    selectedBridgeIds: [],
    failedBridgeIds: [],
    lives: NUMBER_PATH_STARTING_LIVES,
    completedCount: 0,
    backtracks: 0,
    bridgeFailures: 0,
    retries: 0,
    hintsUsed: 0,
    hintLevel: 0,
    phase: 'selecting',
    daily: options.daily === true,
    dateKey: options.dateKey,
    updatedAt: new Date().toISOString()
  };
};
