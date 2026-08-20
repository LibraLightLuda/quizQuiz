import { useState } from 'react';
import { playSuccessSound, unlockAudio } from '../services/soundService';

interface SudokuTutorialProps {
  onBack: () => void;
  onStartBeginner: () => void;
  soundEnabled: boolean;
}

interface TutorialStep {
  rule: '가로줄' | '세로줄' | '작은 상자' | '모두 확인';
  title: string;
  instruction: string;
  clue: string;
  targetIndex: number;
  answer: number;
  focus: 'row' | 'column' | 'box' | 'all';
}

const solution = [
  1, 2, 3, 4,
  3, 4, 1, 2,
  2, 1, 4, 3,
  4, 3, 2, 1
];

const tutorialSteps: TutorialStep[] = [
  {
    rule: '가로줄', title: '가로로 같은 숫자는 한 번만',
    instruction: '첫 번째 가로줄에는 1, 2, 4가 있어요.', clue: '빠진 숫자 하나를 찾아보세요.',
    targetIndex: 2, answer: 3, focus: 'row'
  },
  {
    rule: '세로줄', title: '세로로도 같은 숫자는 한 번만',
    instruction: '첫 번째 세로줄에는 1, 3, 4가 있어요.', clue: '위에서 아래로 살펴보세요.',
    targetIndex: 8, answer: 2, focus: 'column'
  },
  {
    rule: '작은 상자', title: '굵은 선 안에서도 한 번만',
    instruction: '왼쪽 위 2×2 상자에는 1, 2, 3이 있어요.', clue: '작은 상자에 빠진 숫자는 무엇일까요?',
    targetIndex: 5, answer: 4, focus: 'box'
  },
  {
    rule: '모두 확인', title: '가로·세로·상자를 함께 살펴봐요',
    instruction: '노란 칸의 가로줄, 세로줄, 작은 상자를 차례로 확인해요.', clue: '세 약속을 모두 지키는 숫자를 골라보세요.',
    targetIndex: 11, answer: 3, focus: 'all'
  }
];

function SudokuTutorial({ onBack, onStartBeginner, soundEnabled }: SudokuTutorialProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [solved, setSolved] = useState(false);
  const [tried, setTried] = useState<number[]>([]);
  const [message, setMessage] = useState('노란 빈칸에 들어갈 숫자를 골라보세요.');
  const step = tutorialSteps[stepIndex];
  const board = solution.map((value, index) => index === step.targetIndex && !solved ? 0 : value);
  const targetRow = Math.floor(step.targetIndex / 4);
  const targetColumn = step.targetIndex % 4;
  const targetBoxRow = Math.floor(targetRow / 2);
  const targetBoxColumn = Math.floor(targetColumn / 2);
  const complete = solved && stepIndex === tutorialSteps.length - 1;

  const choose = (number: number) => {
    if (solved || tried.includes(number)) return;
    void unlockAudio();
    if (number !== step.answer) {
      setTried((values) => [...values, number]);
      setMessage(`${number}은(는) 이미 보이는지 다시 살펴봐요. 괜찮아요, 한 번 더 생각해 봐요!`);
      return;
    }
    setSolved(true);
    setMessage(stepIndex === tutorialSteps.length - 1 ? '세 가지 약속을 모두 지켰어요!' : `${step.rule} 규칙을 정확히 찾았어요!`);
    if (soundEnabled) playSuccessSound();
  };

  const next = () => {
    setStepIndex((value) => value + 1);
    setSolved(false);
    setTried([]);
    setMessage('노란 빈칸에 들어갈 숫자를 골라보세요.');
  };

  return (
    <main className="screen sudoku-tutorial-screen">
      <header className="sudoku-tutorial-header">
        <button className="icon-button" onClick={onBack} aria-label="스도쿠 단계 선택으로 돌아가기">←</button>
        <div><small>스도쿠 규칙 연습</small><strong>{stepIndex + 1} / {tutorialSteps.length}단계</strong></div>
        <span aria-hidden="true">🎓</span>
      </header>
      <div className="sudoku-tutorial-progress" aria-hidden="true"><span style={{ width: `${((stepIndex + (solved ? 1 : 0)) / tutorialSteps.length) * 100}%` }} /></div>

      <section className="sudoku-tutorial-intro">
        <p className="eyebrow">{step.rule}</p>
        <h1>{step.title}</h1>
        <p>{step.instruction}<br /><strong>{step.clue}</strong></p>
      </section>

      <div className="tutorial-rule-pills" aria-label="스도쿠의 세 가지 규칙">
        <span className={step.focus === 'row' || step.focus === 'all' ? 'active' : ''}>↔ 가로</span>
        <span className={step.focus === 'column' || step.focus === 'all' ? 'active' : ''}>↕ 세로</span>
        <span className={step.focus === 'box' || step.focus === 'all' ? 'active' : ''}>▦ 상자</span>
      </div>

      <div className="tutorial-board-wrap">
        <div className="tutorial-board" role="grid" aria-label="4×4 스도쿠 규칙 예시">
          {board.map((value, index) => {
            const row = Math.floor(index / 4);
            const column = index % 4;
            const inRow = row === targetRow;
            const inColumn = column === targetColumn;
            const inBox = Math.floor(row / 2) === targetBoxRow && Math.floor(column / 2) === targetBoxColumn;
            const focused = (step.focus === 'row' && inRow) || (step.focus === 'column' && inColumn)
              || (step.focus === 'box' && inBox) || (step.focus === 'all' && (inRow || inColumn || inBox));
            const target = index === step.targetIndex;
            const classes = ['tutorial-cell', focused ? 'focused' : '', target ? 'target' : '', target && solved ? 'solved' : '',
              column === 1 ? 'box-right' : '', row === 1 ? 'box-bottom' : ''].filter(Boolean).join(' ');
            return <div key={index} role="gridcell" className={classes} aria-label={`${row + 1}행 ${column + 1}열, ${value ? `숫자 ${value}` : '빈칸'}`}>{value || '?'}</div>;
          })}
        </div>
      </div>

      <p className={`tutorial-coach ${tried.length ? 'gentle' : ''}`} aria-live="polite"><span aria-hidden="true">{solved ? '★' : tried.length ? '♥' : '💡'}</span>{message}</p>

      {!complete && (
        <div className="tutorial-keypad" aria-label="튜토리얼 숫자 선택">
          {[1, 2, 3, 4].map((number) => <button key={number} disabled={solved || tried.includes(number)} aria-label={`튜토리얼 숫자 ${number}`} onClick={() => choose(number)}>{number}{tried.includes(number) && <small>다시 보기</small>}</button>)}
        </div>
      )}

      {solved && !complete && <button className="primary-button tutorial-next" onClick={next}>다음 규칙 배우기</button>}
      {complete && (
        <section className="tutorial-complete">
          <span aria-hidden="true">🏅</span><h2>이제 스도쿠 준비 완료!</h2>
          <p>빈칸마다 가로, 세로, 굵은 선 상자를 확인하면 돼요. 답을 찍기보다 들어갈 수 없는 숫자부터 하나씩 지워보세요.</p>
          <button className="primary-button" onClick={onStartBeginner}>첫걸음 4×4 시작하기</button>
          <button className="secondary-button" onClick={onBack}>난이도 고르기</button>
        </section>
      )}
      <aside className="tutorial-remember"><strong>꼭 기억해요</strong><span>4×4는 1~4와 2×2 상자, 6×6은 1~6과 2×3 상자, 9×9는 1~9와 3×3 상자를 사용해요. 처음부터 있는 숫자는 바꾸지 않고, 대각선은 확인하지 않아요.</span></aside>
    </main>
  );
}

export default SudokuTutorial;
