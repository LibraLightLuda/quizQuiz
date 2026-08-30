import { useEffect, useMemo, useRef, useState } from 'react';
import { playSuccessSound, unlockAudio } from '../services/soundService';
import {
  generateDailySudoku,
  generateSudoku,
  SUDOKU_DIFFICULTIES,
  sudokuDailyKey,
  sudokuDefinitions
} from './sudokuGenerator';
import {
  clearSudokuProgress,
  loadSudokuProgress,
  loadSudokuRecords,
  recommendedSudokuDifficulty,
  rememberSudokuDifficulty,
  saveSudokuCompletion,
  saveSudokuProgress
} from './sudokuStorage';
import type { SudokuDifficulty, SudokuProgress, SudokuPuzzle } from './types';
import SudokuTutorial from './SudokuTutorial';
import { conflictMessage, sudokuConflicts } from './sudokuRules';
import { SudokuCompleteVisual, SudokuToolIcon } from './SudokuVisuals';
import { useGrowth } from '../growth/GrowthContext';
import { GrowthCelebration, GrowthRewardCard } from '../growth/GrowthUI';
import type { GrowthAward } from '../growth/types';
import './sudoku.css';

type SudokuScreen = 'levels' | 'tutorial' | 'play' | 'result';

interface SudokuResult {
  difficulty: SudokuDifficulty;
  elapsedMs: number;
  hints: number;
  isBest: boolean;
  daily: boolean;
}

interface SudokuModeProps {
  onExit: () => void;
  soundEnabled: boolean;
  animationsEnabled: boolean;
}

export const formatSudokuTime = (milliseconds: number): string => {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const progressPercent = (progress: SudokuProgress): number => {
  const blanks = progress.puzzle.puzzle.filter((cell) => cell === 0).length;
  const filled = progress.grid.filter((cell, index) => progress.puzzle.puzzle[index] === 0 && cell !== 0).length;
  return blanks ? Math.round((filled / blanks) * 100) : 100;
};

function SudokuMode({ onExit, soundEnabled, animationsEnabled }: SudokuModeProps) {
  const growth = useGrowth();
  const initialProgress = useMemo(() => loadSudokuProgress(), []);
  const [screen, setScreen] = useState<SudokuScreen>('levels');
  const [savedProgress, setSavedProgress] = useState<SudokuProgress | null>(initialProgress);
  const [records, setRecords] = useState(() => loadSudokuRecords());
  const [puzzle, setPuzzle] = useState<SudokuPuzzle | null>(null);
  const [grid, setGrid] = useState<number[]>([]);
  const [hinted, setHinted] = useState<boolean[]>([]);
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [mistakeCell, setMistakeCell] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [daily, setDaily] = useState(false);
  const [result, setResult] = useState<SudokuResult | null>(null);
  const [growthAward, setGrowthAward] = useState<GrowthAward | null>(null);
  const [message, setMessage] = useState('빈칸을 누르고 알맞은 숫자를 골라 보세요.');
  const [generating, setGenerating] = useState<SudokuDifficulty | null>(null);
  const [storageWarning, setStorageWarning] = useState(false);
  const [inputLocked, setInputLocked] = useState(false);
  const [wrongAttempts, setWrongAttempts] = useState<Record<number, number>>({});
  const [triedNumbers, setTriedNumbers] = useState<Record<number, number[]>>({});
  const timerBase = useRef(0);
  const timerStartedAt = useRef(Date.now());
  const mistakeTimer = useRef<number | null>(null);
  const inputUnlockTimer = useRef<number | null>(null);
  const inputLock = useRef(false);
  const recommended = recommendedSudokuDifficulty(records);

  const currentElapsed = (): number =>
    screen === 'play' ? timerBase.current + Math.max(0, Date.now() - timerStartedAt.current) : elapsedMs;

  const makeProgress = (
    activePuzzle: SudokuPuzzle, activeGrid: number[], activeHinted: boolean[], activeDaily: boolean, time = currentElapsed()
  ): SudokuProgress => ({
    schemaVersion: 1,
    puzzle: activePuzzle,
    grid: activeGrid,
    hinted: activeHinted,
    elapsedMs: Math.max(0, Math.round(time)),
    updatedAt: new Date().toISOString(),
    daily: activeDaily
  });

  useEffect(() => {
    if (screen !== 'play' || !puzzle) return;
    const tick = () => setElapsedMs(currentElapsed());
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [puzzle?.id, screen]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
  }, [screen]);

  useEffect(() => {
    if (screen !== 'play' || !puzzle || grid.length !== puzzle.solution.length) return;
    const progress = makeProgress(puzzle, grid, hinted, daily);
    if (!saveSudokuProgress(progress)) setStorageWarning(true);
    setSavedProgress(progress);
  }, [daily, grid, hinted, puzzle, screen]);

  useEffect(() => {
    const saveBeforeLeaving = () => {
      if (screen !== 'play' || !puzzle || grid.length !== puzzle.solution.length) return;
      saveSudokuProgress(makeProgress(puzzle, grid, hinted, daily));
    };
    window.addEventListener('pagehide', saveBeforeLeaving);
    document.addEventListener('visibilitychange', saveBeforeLeaving);
    return () => {
      window.removeEventListener('pagehide', saveBeforeLeaving);
      document.removeEventListener('visibilitychange', saveBeforeLeaving);
    };
  }, [daily, grid, hinted, puzzle, screen]);

  useEffect(() => () => {
    if (mistakeTimer.current !== null) window.clearTimeout(mistakeTimer.current);
    if (inputUnlockTimer.current !== null) window.clearTimeout(inputUnlockTimer.current);
  }, []);

  const enterPuzzle = (next: SudokuProgress) => {
    timerBase.current = next.elapsedMs;
    timerStartedAt.current = Date.now();
    setElapsedMs(next.elapsedMs);
    setPuzzle(next.puzzle);
    setGrid(next.grid);
    setHinted(next.hinted);
    setDaily(next.daily);
    setSelectedCell(next.grid.findIndex((cell) => cell === 0));
    setMistakeCell(null);
    inputLock.current = false;
    setInputLocked(false);
    setWrongAttempts({});
    setTriedNumbers({});
    setMessage(next.daily ? '오늘의 퍼즐이에요. 차근차근 시작해 볼까요?' : '빈칸을 누르고 알맞은 숫자를 골라 보세요.');
    setResult(null);
    setScreen('play');
  };

  const resume = () => {
    if (savedProgress) enterPuzzle(savedProgress);
  };

  const startPuzzle = (difficulty: SudokuDifficulty, isDaily = false, skipConfirm = false) => {
    if (!skipConfirm && savedProgress && !window.confirm('새 퍼즐을 시작하면 지금 풀던 퍼즐은 바뀌어요. 시작할까요?')) return;
    void unlockAudio();
    setGenerating(difficulty);
    window.setTimeout(() => {
      try {
        const nextPuzzle = isDaily ? generateDailySudoku(difficulty) : generateSudoku(difficulty);
        const next = makeProgress(
          nextPuzzle,
          [...nextPuzzle.puzzle],
          Array<boolean>(nextPuzzle.puzzle.length).fill(false),
          isDaily,
          0
        );
        const nextRecords = rememberSudokuDifficulty(records, difficulty);
        setRecords(nextRecords);
        if (!saveSudokuProgress(next)) setStorageWarning(true);
        setSavedProgress(next);
        enterPuzzle(next);
      } catch {
        setMessage('퍼즐을 준비하지 못했어요. 한 번 더 눌러 주세요.');
      } finally {
        setGenerating(null);
      }
    }, 20);
  };

  const finishPuzzle = (completedGrid: number[], completedHinted: boolean[]) => {
    if (!puzzle) return;
    const finishTime = currentElapsed();
    const saved = saveSudokuCompletion(records, puzzle.difficulty, finishTime);
    const growthResult = growth.awardCompletion('sudoku');
    setGrowthAward(growthResult.award);
    setRecords(saved.records);
    if (!saved.saved || !growthResult.saved || !clearSudokuProgress()) setStorageWarning(true);
    setSavedProgress(null);
    setElapsedMs(finishTime);
    setGrid(completedGrid);
    setHinted(completedHinted);
    setResult({
      difficulty: puzzle.difficulty,
      elapsedMs: finishTime,
      hints: completedHinted.filter(Boolean).length,
      isBest: saved.isBest,
      daily
    });
    if (soundEnabled) playSuccessSound();
    setScreen('result');
  };

  const chooseNextEmpty = (from: number, values: readonly number[]): number | null => {
    if (!puzzle) return null;
    for (let offset = 1; offset <= values.length; offset += 1) {
      const index = (from + offset) % values.length;
      if (puzzle.puzzle[index] === 0 && values[index] === 0) return index;
    }
    return null;
  };

  const brieflyLockInput = (duration: number) => {
    inputLock.current = true;
    setInputLocked(true);
    if (inputUnlockTimer.current !== null) window.clearTimeout(inputUnlockTimer.current);
    inputUnlockTimer.current = window.setTimeout(() => {
      inputLock.current = false;
      setInputLocked(false);
    }, duration);
  };

  const registerWrongNumber = (cellIndex: number, number: number, explanation: string) => {
    const attemptCount = (wrongAttempts[cellIndex] ?? 0) + 1;
    setWrongAttempts((values) => ({ ...values, [cellIndex]: attemptCount }));
    setTriedNumbers((values) => ({
      ...values,
      [cellIndex]: [...new Set([...(values[cellIndex] ?? []), number])]
    }));
    setMistakeCell(cellIndex);
    setMessage(attemptCount >= 2
      ? '두 번 확인했어요. 이제 찍기는 잠시 쉬고, 가로·세로·상자를 살피거나 힌트를 사용해요.'
      : explanation);
    brieflyLockInput(700);
    if (mistakeTimer.current !== null) window.clearTimeout(mistakeTimer.current);
    mistakeTimer.current = window.setTimeout(() => setMistakeCell(null), 620);
  };

  const inputNumber = (number: number) => {
    if (inputLock.current) return;
    if (!puzzle || selectedCell === null || puzzle.puzzle[selectedCell] !== 0 || hinted[selectedCell]) {
      setMessage('먼저 빈칸 하나를 눌러 주세요.');
      return;
    }
    if ((wrongAttempts[selectedCell] ?? 0) >= 2) {
      setMessage('이 칸은 잠시 멈추고 규칙을 살펴봐요. 다른 빈칸을 고르거나 힌트를 사용할 수 있어요.');
      return;
    }
    if ((triedNumbers[selectedCell] ?? []).includes(number)) {
      setMessage(`${number}은(는) 이 칸에서 이미 확인했어요. 다른 가능성을 살펴봐요.`);
      brieflyLockInput(350);
      return;
    }
    const conflicts = sudokuConflicts(grid, selectedCell, number, puzzle.size, puzzle.boxRows, puzzle.boxCols);
    if (conflicts.length) {
      registerWrongNumber(selectedCell, number, conflictMessage(number, conflicts));
      return;
    }
    if (puzzle.solution[selectedCell] !== number) {
      registerWrongNumber(selectedCell, number, '아직 그 숫자로 정할 근거가 부족해요. 가로·세로·상자를 함께 살펴봐요.');
      return;
    }
    brieflyLockInput(160);
    const next = [...grid];
    next[selectedCell] = number;
    setGrid(next);
    setMistakeCell(null);
    if (soundEnabled) playSuccessSound();
    if (next.every((cell, index) => cell === puzzle.solution[index])) {
      finishPuzzle(next, hinted);
      return;
    }
    setSelectedCell(chooseNextEmpty(selectedCell, next));
    setMessage('좋아요! 빈칸이 하나 줄었어요.');
  };

  const eraseSelected = () => {
    if (!puzzle || selectedCell === null || puzzle.puzzle[selectedCell] !== 0 || hinted[selectedCell]) {
      setMessage('직접 넣은 숫자만 지울 수 있어요.');
      return;
    }
    const next = [...grid];
    next[selectedCell] = 0;
    setGrid(next);
    setMessage('괜찮아요. 다시 생각해 봐요!');
  };

  const useHint = () => {
    if (!puzzle) return;
    const index = selectedCell !== null && puzzle.puzzle[selectedCell] === 0 && grid[selectedCell] === 0
      ? selectedCell
      : grid.findIndex((cell, cellIndex) => cell === 0 && puzzle.puzzle[cellIndex] === 0);
    if (index < 0) return;
    const nextGrid = [...grid];
    const nextHinted = [...hinted];
    nextGrid[index] = puzzle.solution[index];
    nextHinted[index] = true;
    setGrid(nextGrid);
    setHinted(nextHinted);
    setSelectedCell(chooseNextEmpty(index, nextGrid));
    setMessage(`도움 숫자 ${puzzle.solution[index]}을(를) 채웠어요. 이제 이어서 해봐요!`);
    if (nextGrid.every((cell, cellIndex) => cell === puzzle.solution[cellIndex])) finishPuzzle(nextGrid, nextHinted);
  };

  const returnToLevels = () => {
    if (screen === 'play' && puzzle) {
      const progress = makeProgress(puzzle, grid, hinted, daily);
      if (!saveSudokuProgress(progress)) setStorageWarning(true);
      setSavedProgress(progress);
    }
    setScreen('levels');
  };

  const replacePuzzle = () => {
    if (!puzzle || !window.confirm('지금 퍼즐 대신 새 퍼즐을 시작할까요?')) return;
    setSavedProgress(null);
    startPuzzle(puzzle.difficulty, false, true);
  };

  useEffect(() => {
    if (screen !== 'play' || !puzzle) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const number = Number(event.key);
      if (Number.isInteger(number) && number >= 1 && number <= puzzle.size) {
        event.preventDefault();
        inputNumber(number);
      }
      if (event.key === 'Backspace' || event.key === 'Delete') {
        event.preventDefault();
        eraseSelected();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [grid, hinted, puzzle, screen, selectedCell, triedNumbers, wrongAttempts]);

  if (screen === 'levels') {
    return (
      <main className="screen sudoku-level-screen">
        <SudokuTopBar title="스도쿠" onBack={onExit} />
        <section className="sudoku-welcome">
          <div className="sudoku-hero-icon" aria-hidden="true"><i>1</i><i>4</i><i>3</i><i>2</i></div>
          <div><p className="eyebrow">생각이 쑥쑥 자라는 숫자 놀이</p><h1>어느 퍼즐로 시작할까요?</h1></div>
        </section>

        {savedProgress && (
          <button className="sudoku-resume-card" onClick={resume}>
            <span className="resume-play" aria-hidden="true">▶</span>
            <span><small>풀던 퍼즐이 있어요</small><strong>{sudokuDefinitions[savedProgress.puzzle.difficulty].label} 이어서 풀기</strong><i>{progressPercent(savedProgress)}% · {formatSudokuTime(savedProgress.elapsedMs)}</i></span>
            <b aria-hidden="true">›</b>
          </button>
        )}

        <section className="sudoku-rule-card" aria-label="스도쿠 규칙">
          <span aria-hidden="true">💡</span>
          <div><strong>같은 숫자는 한 번씩!</strong><small>가로줄, 세로줄, 굵은 선 안에 숫자를 겹치지 않게 채워요.</small></div>
        </section>

        <button className="sudoku-tutorial-card" onClick={() => setScreen('tutorial')}>
          <span aria-hidden="true">🎓</span>
          <span><strong>처음이라면 규칙 연습</strong><small>가로·세로·작은 상자를 직접 풀며 배워요</small></span>
          <b>2분</b>
        </button>

        <div className="sudoku-level-grid" aria-label="스도쿠 난이도">
          {SUDOKU_DIFFICULTIES.map((difficulty) => {
            const definition = sudokuDefinitions[difficulty];
            const record = records.byDifficulty[difficulty];
            return (
              <button key={difficulty} className="sudoku-level-card" style={{ '--level-color': definition.color } as React.CSSProperties}
                aria-label={`${definition.label} ${definition.shortLabel}, ${definition.age}, ${definition.description}${difficulty === recommended ? ', 추천' : ''}`}
                disabled={generating !== null} onClick={() => startPuzzle(difficulty)}>
                <span className="level-size">{definition.shortLabel}</span>
                <span className="level-copy"><span><strong>{definition.label}</strong>{difficulty === recommended && <em>추천</em>}</span><small>{definition.age}</small><i>{definition.description}</i>{record && <b>🏆 {formatSudokuTime(record.bestTimeMs)} · {record.completedCount}번 완료</b>}</span>
                <span className="level-arrow" aria-hidden="true">{generating === difficulty ? '…' : '›'}</span>
              </button>
            );
          })}
        </div>

        <button className="daily-sudoku-card" disabled={generating !== null} onClick={() => startPuzzle(recommended, true)}>
          <span aria-hidden="true">☀️</span><span><strong>오늘의 스도쿠</strong><small>{sudokuDailyKey().replaceAll('-', '.')} · 나에게 맞는 {sudokuDefinitions[recommended].label} 단계</small></span><b aria-hidden="true">›</b>
        </button>
        {storageWarning && <p className="settings-note warning" role="alert">이 기기에는 진행 상황을 저장하지 못할 수 있어요.</p>}
        {generating && <p className="sudoku-loading" role="status">새 퍼즐을 만들고 있어요…</p>}
      </main>
    );
  }

  if (screen === 'tutorial') {
    return <SudokuTutorial onBack={() => setScreen('levels')} onStartBeginner={() => startPuzzle('beginner')} soundEnabled={soundEnabled} />;
  }

  if (screen === 'result' && result) {
    const definition = sudokuDefinitions[result.difficulty];
    return (
      <main className="screen sudoku-result-screen">
        {growthAward && <GrowthCelebration award={growthAward} animationsEnabled={animationsEnabled} />}
        {animationsEnabled && <SudokuConfetti />}
        <SudokuCompleteVisual />
        <p className="eyebrow">{result.daily ? '오늘의 스도쿠 성공!' : '퍼즐 완성!'}</p>
        <h1>{result.isBest ? '최고 기록이에요!' : '끝까지 해냈어요!'}</h1>
        <p className="sudoku-result-copy">집중해서 모든 칸을 채웠어요. 정말 멋져요!</p>
        {growthAward && <GrowthRewardCard award={growthAward} />}
        <section className="sudoku-result-stats" aria-label="스도쿠 결과">
          <div><span aria-hidden="true">⏱</span><small>완료 시간</small><strong>{formatSudokuTime(result.elapsedMs)}</strong></div>
          <div><span aria-hidden="true">🏁</span><small>난이도</small><strong>{definition.label}</strong></div>
          <div><span aria-hidden="true">💡</span><small>사용한 힌트</small><strong>{result.hints}개</strong></div>
        </section>
        <div className="sudoku-result-actions">
          <button className="primary-button" onClick={() => startPuzzle(result.difficulty)}>새 퍼즐 풀기</button>
          <button className="secondary-button" onClick={() => setScreen('levels')}>난이도 고르기</button>
          <button className="text-button" onClick={onExit}>학습 놀이터로</button>
        </div>
        {storageWarning && <p className="settings-note warning" role="alert">기록을 이 기기에 저장하지 못했어요.</p>}
      </main>
    );
  }

  if (!puzzle) return null;
  const definition = sudokuDefinitions[puzzle.difficulty];
  const selectedNumber = selectedCell === null ? 0 : grid[selectedCell];
  const selectedRow = selectedCell === null ? -1 : Math.floor(selectedCell / puzzle.size);
  const selectedColumn = selectedCell === null ? -1 : selectedCell % puzzle.size;
  const selectedBox = selectedCell === null ? -1
    : Math.floor(selectedRow / puzzle.boxRows) * (puzzle.size / puzzle.boxCols) + Math.floor(selectedColumn / puzzle.boxCols);
  const filledCount = grid.filter((cell, index) => puzzle.puzzle[index] === 0 && cell !== 0).length;
  const blankCount = puzzle.puzzle.filter((cell) => cell === 0).length;
  const selectedEditable = selectedCell !== null && puzzle.puzzle[selectedCell] === 0 && !hinted[selectedCell];
  const selectedWrongAttempts = selectedCell === null ? 0 : (wrongAttempts[selectedCell] ?? 0);
  const selectedTriedNumbers = selectedCell === null ? [] : (triedNumbers[selectedCell] ?? []);

  return (
    <main className={`screen sudoku-play-screen sudoku-play-size-${puzzle.size}`}>
      <header className="sudoku-play-header">
        <button className="icon-button" onClick={returnToLevels} aria-label="스도쿠 난이도로 돌아가기">←</button>
        <div><strong>{definition.label} <small>{definition.shortLabel}</small></strong><span>{daily ? '☀️ 오늘의 퍼즐' : `${filledCount} / ${blankCount}칸`}</span></div>
        <time aria-label={`푼 시간 ${formatSudokuTime(elapsedMs)}`}>{formatSudokuTime(elapsedMs)}</time>
      </header>

      <div className="sudoku-progress" aria-label={`퍼즐 진행도 ${filledCount}/${blankCount}`}><span style={{ width: `${(filledCount / blankCount) * 100}%` }} /></div>

      <section className="sudoku-board-wrap">
        <div className={`sudoku-board sudoku-size-${puzzle.size}`} role="grid" aria-label={`${definition.shortLabel} 스도쿠 퍼즐`}
          style={{ gridTemplateColumns: `repeat(${puzzle.size}, 1fr)` }}>
          {grid.map((value, index) => {
            const row = Math.floor(index / puzzle.size);
            const column = index % puzzle.size;
            const box = Math.floor(row / puzzle.boxRows) * (puzzle.size / puzzle.boxCols) + Math.floor(column / puzzle.boxCols);
            const given = puzzle.puzzle[index] !== 0;
            const selected = selectedCell === index;
            const peer = selectedCell !== null && (row === selectedRow || column === selectedColumn || box === selectedBox);
            const same = selectedNumber !== 0 && value === selectedNumber;
            const classNames = [
              'sudoku-cell', given ? 'given' : 'editable', hinted[index] ? 'hinted' : '', selected ? 'selected' : '',
              !selected && peer ? 'peer' : '', same ? 'same-number' : '', mistakeCell === index ? 'gentle-mistake' : '',
              (column + 1) % puzzle.boxCols === 0 && column < puzzle.size - 1 ? 'box-right' : '',
              (row + 1) % puzzle.boxRows === 0 && row < puzzle.size - 1 ? 'box-bottom' : ''
            ].filter(Boolean).join(' ');
            const stateLabel = value ? `숫자 ${value}${given ? ', 처음 숫자' : hinted[index] ? ', 도움 숫자' : ''}` : '빈칸';
            return (
              <button key={index} role="gridcell" className={classNames} aria-selected={selected}
                aria-label={`${row + 1}행 ${column + 1}열, ${stateLabel}`}
                onClick={() => { setSelectedCell(index); setMessage(given ? '처음부터 채워진 숫자예요. 주변 빈칸을 살펴봐요!' : (wrongAttempts[index] ?? 0) >= 2 ? '이 칸은 두 번 살펴봤어요. 다른 빈칸이나 힌트로 단서를 찾아봐요.' : '어떤 숫자가 들어갈까요?'); }}>
                {value || ''}{hinted[index] && <span className="hint-dot" aria-hidden="true">•</span>}
              </button>
            );
          })}
        </div>
      </section>

      <p className={`sudoku-coach ${mistakeCell !== null ? 'is-gentle' : ''}`} aria-live="polite"><span aria-hidden="true">{mistakeCell !== null ? '♥' : '✦'}</span>{message}</p>

      <div className="sudoku-keypad" aria-label="숫자 선택" style={{ gridTemplateColumns: `repeat(${puzzle.size === 9 ? 5 : puzzle.size}, 1fr)` }}>
        {Array.from({ length: puzzle.size }, (_, index) => index + 1).map((number) => {
          const used = grid.filter((cell) => cell === number).length;
          const conflicts = selectedCell === null ? [] : sudokuConflicts(grid, selectedCell, number, puzzle.size, puzzle.boxRows, puzzle.boxCols);
          const tried = selectedTriedNumbers.includes(number);
          const disabled = inputLocked || !selectedEditable || selectedWrongAttempts >= 2 || used >= puzzle.size || tried || conflicts.length > 0;
          const detail = tried ? '시도함' : conflicts.length ? '겹침' : selectedWrongAttempts >= 2 ? '생각하기' : `${used}/${puzzle.size}`;
          return <button key={number} className={conflicts.length ? 'has-conflict' : tried ? 'was-tried' : ''} disabled={disabled} aria-label={`숫자 ${number}`} onClick={() => inputNumber(number)}><strong>{number}</strong><small>{detail}</small>{conflicts.length > 0 && <span className="keypad-conflict-mark" aria-hidden="true">×</span>}</button>;
        })}
      </div>

      <div className="sudoku-tools">
        <button onClick={eraseSelected}><SudokuToolIcon kind="erase" /><strong>지우기</strong></button>
        <button onClick={useHint} disabled={!grid.includes(0)}><SudokuToolIcon kind="hint" /><strong>힌트</strong></button>
        <button onClick={replacePuzzle}><SudokuToolIcon kind="refresh" /><strong>새 퍼즐</strong></button>
      </div>
      {storageWarning && <p className="settings-note warning" role="alert">진행 상황을 저장하지 못할 수 있어요.</p>}
    </main>
  );
}

function SudokuTopBar({ title, onBack }: { title: string; onBack: () => void }) {
  return <header className="top-bar"><button className="icon-button" onClick={onBack} aria-label="학습 놀이터로 돌아가기">←</button><strong>{title}</strong><span /></header>;
}

function SudokuConfetti() {
  const shapes = ['★', '●', '✦', '■', '★', '●', '✦', '■', '★', '●', '✦', '■'];
  return <div className="sudoku-confetti" aria-hidden="true">{shapes.map((shape, index) => <i key={index}>{shape}</i>)}</div>;
}

export default SudokuMode;
