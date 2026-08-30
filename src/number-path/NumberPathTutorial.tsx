import { useState } from 'react';
import NumberPathBoard from './NumberPathBoard';
import type { NumberPathPuzzle } from './types';

const firstPuzzle: NumberPathPuzzle = {
  id: 'tutorial-first',
  difficulty: 'starter',
  nodes: [
    { id: 'a0', layer: 0, lane: 1, kind: 'start' },
    { id: 'a1', layer: 1, lane: 1, kind: 'end' }
  ],
  bridges: [{ id: 'a-good', fromNodeId: 'a0', toNodeId: 'a1', value: 2 }],
  startNodeId: 'a0',
  endNodeId: 'a1',
  requiredCrossings: 1,
  targetSum: 2,
  requiredMarkerBridgeIds: [],
  solutionBridgeIds: ['a-good']
};

const sumPuzzle: NumberPathPuzzle = {
  id: 'tutorial-sum',
  difficulty: 'starter',
  nodes: [
    { id: 'b0', layer: 0, lane: 1, kind: 'start' },
    { id: 'b1', layer: 1, lane: 0, kind: 'junction' },
    { id: 'b2', layer: 1, lane: 2, kind: 'junction' },
    { id: 'b3', layer: 2, lane: 1, kind: 'end' }
  ],
  bridges: [
    { id: 'b-good', fromNodeId: 'b0', toNodeId: 'b1', value: 2 },
    { id: 'b-bad', fromNodeId: 'b0', toNodeId: 'b2', value: 4 },
    { id: 'b-finish', fromNodeId: 'b1', toNodeId: 'b3', value: 3 },
    { id: 'b-bad-finish', fromNodeId: 'b2', toNodeId: 'b3', value: 3 }
  ],
  startNodeId: 'b0',
  endNodeId: 'b3',
  requiredCrossings: 2,
  targetSum: 5,
  requiredMarkerBridgeIds: [],
  solutionBridgeIds: ['b-good', 'b-finish']
};

const heartPuzzle: NumberPathPuzzle = {
  id: 'tutorial-heart',
  difficulty: 'starter',
  nodes: [
    { id: 'c0', layer: 0, lane: 1, kind: 'start' },
    { id: 'c1', layer: 1, lane: 0, kind: 'end' },
    { id: 'c2', layer: 1, lane: 2, kind: 'junction' }
  ],
  bridges: [
    { id: 'c-good', fromNodeId: 'c0', toNodeId: 'c1', value: 3 },
    { id: 'c-danger', fromNodeId: 'c0', toNodeId: 'c2', value: 5 }
  ],
  startNodeId: 'c0',
  endNodeId: 'c1',
  requiredCrossings: 1,
  targetSum: 3,
  requiredMarkerBridgeIds: [],
  solutionBridgeIds: ['c-good']
};

export default function NumberPathTutorial({ onBack, onComplete }: { onBack: () => void; onComplete: () => void }) {
  const [stage, setStage] = useState(0);
  const [path, setPath] = useState<string[]>([]);
  const [currentNodeId, setCurrentNodeId] = useState(firstPuzzle.startNodeId);
  const [failed, setFailed] = useState<Set<string>>(new Set());
  const [rescue, setRescue] = useState(false);
  const [rescued, setRescued] = useState(false);

  const puzzle = stage === 0 ? firstPuzzle : stage === 1 ? sumPuzzle : heartPuzzle;
  const complete = stage === 3;

  const goToStage = (nextStage: number) => {
    const nextPuzzle = nextStage === 1 ? sumPuzzle : heartPuzzle;
    setStage(nextStage);
    setPath([]);
    setCurrentNodeId(nextPuzzle.startNodeId);
    setFailed(new Set());
  };

  const select = (id: string) => {
    if (stage === 0 && id === 'a-good') {
      goToStage(1);
      return;
    }
    if (stage === 1) {
      if (id === 'b-good') {
        setPath([id]);
        setCurrentNodeId('b1');
      } else if (id === 'b-finish' && path[0] === 'b-good') {
        goToStage(2);
      }
      return;
    }
    if (stage === 2 && id === 'c-danger' && !rescued) {
      setFailed(new Set([id]));
      setRescue(true);
      return;
    }
    if (stage === 2 && id === 'c-good' && rescued) {
      setPath([id]);
      setCurrentNodeId('c1');
      setStage(3);
    }
  };

  const title = stage === 0 ? '숫자 다리를 건너요'
    : stage === 1 ? '목표 합을 미리 생각해요'
      : stage === 2 && !rescue ? '위험한 다리도 배워 봐요'
        : stage === 2 ? '하트를 채우고 다시 도전해요' : '보물섬으로 가는 법을 배웠어요!';
  const message = stage === 0 ? '+2 다리를 눌러 첫 섬으로 건너가 보세요.'
    : stage === 1 && path.length === 0 ? '목표는 5예요. 먼저 +2 다리를 골라 보세요.'
      : stage === 1 ? '현재 합은 2예요. +3 다리를 건너 목표 5를 만드세요.'
        : stage === 2 && !rescue && !rescued ? '일부러 +5 위험한 다리를 눌러 보세요.'
          : stage === 2 && rescue ? '길을 완성할 수 없으면 하트가 줄어요. 다시 도전해 볼까요?'
            : stage === 2 ? '반짝이는 +3 다리가 안전한 길이에요.'
              : '+3으로 목표를 만들었어요. 실제 게임에서는 하트가 문제마다 3개예요.';

  return (
    <main className="screen number-path-tutorial-screen">
      <header className="top-bar"><button className="icon-button" onClick={onBack} aria-label="뒤로 가기">←</button><strong>다리 건너기 연습</strong><span /></header>
      <div className="number-path-tutorial-progress" aria-label={`연습 ${Math.min(stage + 1, 3)} / 3`}>
        {[0, 1, 2].map((item) => <span key={item} className={stage >= item ? 'active' : ''}>{stage > item ? '✓' : item + 1}</span>)}
      </div>
      <section className="number-path-tutorial-copy">
        <p className="eyebrow">목표 {puzzle.targetSum} · 다리 {puzzle.requiredCrossings}개</p>
        <h1>{title}</h1>
        {stage === 2 && <div className="number-path-hearts" aria-label={rescue ? '하트 0개' : '하트 1개'}>{rescue ? '♡' : '♥'}</div>}
      </section>
      <div className="number-path-tutorial-board">
        <NumberPathBoard
          puzzle={puzzle}
          selectedBridgeIds={path}
          currentNodeId={currentNodeId}
          failedBridgeIds={failed}
          revealedBridgeId={rescued ? 'c-good' : undefined}
          onSelect={select}
          disabled={complete || rescue}
          label="숫자 다리 연습 지도"
        />
      </div>
      <p className={`number-path-message ${complete ? 'is-success' : ''}`} aria-live="polite">{message}</p>
      {stage === 2 && rescue && (
        <button className="primary-button" onClick={() => {
          setRescue(false);
          setRescued(true);
          setFailed(new Set());
        }}>♥ 하트 채우고 다시 도전</button>
      )}
      {complete && <button className="primary-button number-path-start" onClick={onComplete}>첫걸음 시작하기</button>}
    </main>
  );
}
