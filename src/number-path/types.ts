export type NumberPathDifficulty = 'starter' | 'growing' | 'clever' | 'master';
export type NumberPathPhase = 'selecting' | 'rescue' | 'solved' | 'finished';

export interface NumberPathNode {
  id: string;
  layer: number;
  lane: number;
  kind: 'start' | 'junction' | 'end';
}

export interface NumberPathBridge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  value: number;
  marker?: 'key' | 'star';
  markerOrder?: 1 | 2;
}

export interface NumberPathPuzzle {
  id: string;
  difficulty: NumberPathDifficulty;
  nodes: NumberPathNode[];
  bridges: NumberPathBridge[];
  startNodeId: string;
  endNodeId: string;
  requiredCrossings: number;
  targetSum: number;
  requiredMarkerBridgeIds: string[];
  solutionBridgeIds: string[];
}

export interface NumberPathProgress {
  schemaVersion: 2;
  id: string;
  difficulty: NumberPathDifficulty;
  puzzles: NumberPathPuzzle[];
  puzzleIndex: number;
  currentNodeId: string;
  selectedBridgeIds: string[];
  failedBridgeIds: string[];
  lives: number;
  revealedBridgeId?: string;
  completedCount: number;
  backtracks: number;
  bridgeFailures: number;
  retries: number;
  hintsUsed: number;
  hintLevel: 0 | 1 | 2;
  phase: NumberPathPhase;
  daily: boolean;
  dateKey?: string;
  updatedAt: string;
}

export interface NumberPathDifficultyRecord {
  completedSessions: number;
  completedPuzzles: number;
}

export interface NumberPathRecords {
  schemaVersion: 2;
  lastDifficulty: NumberPathDifficulty;
  completedSessions: number;
  completedPuzzles: number;
  totalBacktracks: number;
  totalBridgeFailures: number;
  totalRetries: number;
  hintSessions: number;
  byDifficulty: Partial<Record<NumberPathDifficulty, NumberPathDifficultyRecord>>;
  recentSignatures: string[];
  dailyBadges: string[];
  tutorialCompleted: boolean;
}

export type PathValidation =
  | { status: 'incomplete'; remainingBridges: number; difference: number }
  | { status: 'wrong-end' }
  | { status: 'missing-marker'; marker: 'key' | 'star' }
  | { status: 'dead-end' }
  | { status: 'solved'; equation: string };
