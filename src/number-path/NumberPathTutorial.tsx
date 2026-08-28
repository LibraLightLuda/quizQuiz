import { useState } from 'react';
import NumberPathBoard from './NumberPathBoard';
import type { NumberPathPuzzle } from './types';

const tutorialPuzzle: NumberPathPuzzle = {
  id: 'number-path-tutorial',
  difficulty: 'starter',
  rows: 2,
  columns: 2,
  cells: [
    { id: 'r0c0', row: 0, column: 0, value: 2 },
    { id: 'r0c1', row: 0, column: 1, value: 3 },
    { id: 'r1c0', row: 1, column: 0, value: 4 },
    { id: 'r1c1', row: 1, column: 1, value: 1 }
  ],
  startCellId: 'r0c0',
  checkpointCellIds: [],
  requiredLength: 2,
  targetSum: 6,
  solutionPath: ['r0c0', 'r1c0']
};

export default function NumberPathTutorial({ onBack, onComplete }: { onBack: () => void; onComplete: () => void }) {
  const [stage, setStage] = useState(0);
  const [path, setPath] = useState<string[]>([]);
  const [backtracked, setBacktracked] = useState(false);
  const complete = stage === 3;

  const select = (id: string) => {
    if (stage === 0 && id === 'r0c0') {
      setPath([id]);
      setStage(1);
      return;
    }
    if (stage === 1 && id === 'r0c1') {
      setPath(['r0c0', id]);
      setStage(2);
      return;
    }
    if (stage === 2 && backtracked && id === 'r1c0') {
      setPath(['r0c0', id]);
      setStage(3);
    }
  };

  const title = stage === 0 ? '시작 칸에서 출발해요'
    : stage === 1 ? '바로 옆 숫자를 이어요'
      : stage === 2 ? '되돌아가 다른 길을 찾아요' : '목표 합을 만들었어요!';
  const message = stage === 0 ? `‘시작’이라고 적힌 2를 눌러 보세요.`
    : stage === 1 ? '오른쪽의 3을 눌러 선을 이어 보세요.'
      : stage === 2 && !backtracked ? '2 + 3은 5예요. 한 칸 되돌리기를 눌러 보세요.'
        : stage === 2 ? '이제 아래의 4를 골라 목표 6을 만들어 보세요.'
          : '2 + 4 = 6! 상하좌우로 이어 목표 합을 만들면 돼요.';

  return (
    <main className="screen number-path-tutorial-screen">
      <header className="top-bar"><button className="icon-button" onClick={onBack} aria-label="뒤로 가기">←</button><strong>길 찾기 연습</strong><span /></header>
      <div className="number-path-tutorial-progress" aria-label={`연습 ${Math.min(stage + 1, 3)} / 3`}>
        {[0, 1, 2].map((item) => <span key={item} className={stage >= item ? 'active' : ''}>{stage > item ? '✓' : item + 1}</span>)}
      </div>
      <section className="number-path-tutorial-copy">
        <p className="eyebrow">목표 6 · 2칸 사용</p>
        <h1>{title}</h1>
      </section>
      <div className="number-path-tutorial-board">
        <NumberPathBoard puzzle={tutorialPuzzle} path={path} onSelect={select} disabled={complete} label="숫자 길 찾기 연습판" />
      </div>
      <p className={`number-path-message ${complete ? 'is-success' : ''}`} aria-live="polite">{message}</p>
      {stage === 2 && !backtracked && (
        <button className="secondary-button" onClick={() => { setPath(['r0c0']); setBacktracked(true); }}>↩ 한 칸 되돌리기</button>
      )}
      {complete && <button className="primary-button number-path-start" onClick={onComplete}>첫걸음 시작하기</button>}
    </main>
  );
}
