import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { CryptoRandom, SeededRandom } from '../services/randomService';
import { playSuccessSound, unlockAudio } from '../services/soundService';
import { AchievementGrid } from '../visuals/AchievementGrid';
import { NumberPathIcon } from '../visuals/NumberPathIcon';
import NumberPathBoard from './NumberPathBoard';
import NumberPathTutorial from './NumberPathTutorial';
import { getNewNumberPathAchievementIds, getNumberPathAchievements } from './numberPathAchievements';
import {
  NUMBER_PATH_DIFFICULTIES,
  NUMBER_PATH_SESSION_LENGTH,
  createNumberPathProgress,
  numberPathDifficultyInfo,
  outgoingBridges,
  pathEquation,
  pathSum,
  validatePath,
  viableNextBridgeIds
} from './numberPathGenerator';
import { numberPathReducer } from './numberPathReducer';
import {
  clearNumberPathProgress,
  completeNumberPathTutorial,
  loadNumberPathProgress,
  loadNumberPathRecords,
  numberPathSeed,
  numberPathTodayKey,
  rememberNumberPathDifficulty,
  saveNumberPathCompletion,
  saveNumberPathProgress
} from './numberPathStorage';
import type { NumberPathDifficulty, NumberPathProgress } from './types';
import './number-path.css';

type NumberPathScreen = 'levels' | 'tutorial' | 'play' | 'result' | 'collection';

const numberPathIllustration = (fileName: string): string =>
  `${import.meta.env.BASE_URL}illustrations/number-path/${fileName}`;

interface NumberPathModeProps {
  onExit: () => void;
  soundEnabled: boolean;
}

interface NumberPathResult {
  difficulty: NumberPathDifficulty;
  bridgeFailures: number;
  retries: number;
  daily: boolean;
  earnedDailyBadge: boolean;
  newAchievementIds: string[];
}

const random = new CryptoRandom();

export default function NumberPathMode({ onExit, soundEnabled }: NumberPathModeProps) {
  const initialRecords = useMemo(() => loadNumberPathRecords(), []);
  const initialSaved = useMemo(() => loadNumberPathProgress(), []);
  const [records, setRecords] = useState(initialRecords);
  const [savedProgress, setSavedProgress] = useState(initialSaved);
  const [difficulty, setDifficulty] = useState<NumberPathDifficulty>(() => initialSaved?.difficulty ?? initialRecords.lastDifficulty);
  const [screen, setScreen] = useState<NumberPathScreen>(() => initialRecords.tutorialCompleted ? 'levels' : 'tutorial');
  const [progress, dispatchProgress] = useReducer(numberPathReducer, null);
  const [message, setMessage] = useState('출발 섬에서 빛나는 숫자 다리 중 하나를 골라 보세요.');
  const [storageWarning, setStorageWarning] = useState(false);
  const [result, setResult] = useState<NumberPathResult | null>(null);
  const [returnNotice, setReturnNotice] = useState(false);
  const completedSessions = useRef(new Set<string>());
  const progressRef = useRef<NumberPathProgress | null>(null);

  useEffect(() => { progressRef.current = progress; }, [progress]);

  useEffect(() => {
    if (!progress || progress.phase === 'finished') return;
    setSavedProgress(progress);
    if (!saveNumberPathProgress(progress)) setStorageWarning(true);
  }, [progress]);

  useEffect(() => {
    const saveBeforeLeaving = () => {
      const current = progressRef.current;
      if (current && current.phase !== 'finished') saveNumberPathProgress(current);
    };
    window.addEventListener('pagehide', saveBeforeLeaving);
    document.addEventListener('visibilitychange', saveBeforeLeaving);
    return () => {
      window.removeEventListener('pagehide', saveBeforeLeaving);
      document.removeEventListener('visibilitychange', saveBeforeLeaving);
    };
  }, []);

  useEffect(() => {
    if (!progress || progress.phase !== 'finished' || completedSessions.current.has(progress.id)) return;
    completedSessions.current.add(progress.id);
    const saved = saveNumberPathCompletion(records, progress);
    const newAchievementIds = getNewNumberPathAchievementIds(records, saved.records);
    setRecords(saved.records);
    if (!saved.saved || !clearNumberPathProgress()) setStorageWarning(true);
    setSavedProgress(null);
    setResult({
      difficulty: progress.difficulty,
      bridgeFailures: progress.bridgeFailures,
      retries: progress.retries,
      daily: progress.daily,
      earnedDailyBadge: saved.earnedDailyBadge,
      newAchievementIds
    });
    setScreen('result');
  }, [progress, records]);

  const enterGame = (next: NumberPathProgress) => {
    dispatchProgress({ type: 'LOAD', progress: next });
    setDifficulty(next.difficulty);
    setResult(null);
    setReturnNotice(false);
    setMessage('출발 섬에서 빛나는 숫자 다리 중 하나를 골라 보세요.');
    setScreen('play');
  };

  const startGame = (nextDifficulty = difficulty, daily = false, recordSource = records) => {
    if (savedProgress && !window.confirm('새 게임을 시작하면 이어 하던 길이 바뀌어요. 시작할까요?')) return;
    void unlockAudio();
    const dateKey = daily ? numberPathTodayKey() : undefined;
    const gameRandom = daily ? new SeededRandom(numberPathSeed(`number-path-${dateKey}-${nextDifficulty}`)) : random;
    if (!daily) {
      const remembered = rememberNumberPathDifficulty(recordSource, nextDifficulty);
      setRecords(remembered.records);
      if (!remembered.saved) setStorageWarning(true);
    }
    enterGame(createNumberPathProgress(nextDifficulty, gameRandom, {
      daily,
      dateKey,
      recentSignatures: daily ? [] : recordSource.recentSignatures
    }));
  };

  const finishTutorial = () => {
    const saved = completeNumberPathTutorial(records);
    setRecords(saved.records);
    if (!saved.saved) setStorageWarning(true);
    setScreen('levels');
    startGame('starter', false, saved.records);
  };

  if (screen === 'tutorial') return <NumberPathTutorial onBack={() => setScreen('levels')} onComplete={finishTutorial} />;

  if (screen === 'play' && progress) {
    const puzzle = progress.puzzles[progress.puzzleIndex];
    const currentSum = pathSum(puzzle, progress.selectedBridgeIds);
    const equation = progress.selectedBridgeIds.length ? pathEquation(puzzle, progress.selectedBridgeIds) : '아직 건너지 않았어요';
    const solved = progress.phase === 'solved';
    const rescue = progress.phase === 'rescue';
    const suggestions = new Set<string>();
    if (progress.hintLevel === 2) {
      for (const id of viableNextBridgeIds(puzzle, progress.selectedBridgeIds)) suggestions.add(id);
    }

    const selectBridge = (id: string) => {
      if (solved || rescue || progress.failedBridgeIds.includes(id)) return;
      const bridge = outgoingBridges(puzzle, progress.currentNodeId).find((item) => item.id === id);
      if (!bridge) return;
      const viable = viableNextBridgeIds(puzzle, progress.selectedBridgeIds).includes(id);
      if (!viable) {
        const nextLives = Math.max(0, progress.lives - 1);
        setMessage(nextLives === 0
          ? '하트를 모두 사용했어요. 안전한 다리를 하나 알려 줄게요!'
          : `이 다리로는 목표에 갈 수 없어요. 현재 섬에서 다시 골라 보세요. 하트 ${nextLives}개`);
      } else {
        const candidate = [...progress.selectedBridgeIds, id];
        const validation = validatePath(puzzle, candidate);
        if (validation.status === 'solved') {
          setMessage(`${validation.equation}! 보물섬에 도착했어요.`);
          if (soundEnabled) playSuccessSound();
        } else {
          const nextSum = currentSum + bridge.value;
          setMessage(`좋아요! 현재 합은 ${nextSum}, 다리 ${puzzle.requiredCrossings - candidate.length}개가 남았어요.`);
        }
      }
      dispatchProgress({ type: 'SELECT_BRIDGE', bridgeId: id });
    };

    const showHint = () => {
      const nextLevel = Math.min(2, progress.hintLevel + 1);
      dispatchProgress({ type: 'USE_HINT' });
      if (nextLevel === 1) {
        const difference = puzzle.targetSum - currentSum;
        setMessage(`다리 ${puzzle.requiredCrossings - progress.selectedBridgeIds.length}개가 남았고, 목표까지 ${difference >= 0 ? difference : `−${Math.abs(difference)}`}이 필요해요.`);
      } else setMessage('반짝이는 다리가 보물섬으로 이어지는 안전한 길이에요.');
    };

    return (
      <main className="screen number-path-play-screen">
        <header className="number-path-game-header">
          <button className="icon-button" onClick={() => { setReturnNotice(true); setScreen('levels'); }} aria-label="단계 선택으로 돌아가기">←</button>
          <div><small>{progress.daily ? '오늘의 길' : numberPathDifficultyInfo[progress.difficulty].label}</small><strong>{progress.puzzleIndex + 1} / {NUMBER_PATH_SESSION_LENGTH}</strong></div>
          <span aria-label={`${progress.completedCount}문제 완료`}>{progress.completedCount} / 5</span>
        </header>
        <div className="number-path-progress" aria-hidden="true"><span style={{ width: `${(progress.completedCount / NUMBER_PATH_SESSION_LENGTH) * 100}%` }} /></div>
        <section className="number-path-goal" aria-labelledby="number-path-question">
          <p className="eyebrow">숫자 다리를 골라 보물섬으로</p>
          <h1 id="number-path-question">목표 합 <b>{puzzle.targetSum}</b></h1>
          <div>
            <span><strong>{puzzle.requiredCrossings - progress.selectedBridgeIds.length}</strong>개 다리 남음</span>
            {puzzle.difficulty === 'clever' && <span>🔑 열쇠 다리 통과</span>}
            {puzzle.difficulty === 'master' && <span>★ 별 다리 순서대로</span>}
          </div>
          <div className="number-path-hearts" aria-label={`하트 ${progress.lives}개`}>
            {Array.from({ length: 3 }, (_, index) => <span key={index} className={index < progress.lives ? 'is-full' : ''}>{index < progress.lives ? '♥' : '♡'}</span>)}
          </div>
        </section>
        <NumberPathBoard
          puzzle={puzzle}
          selectedBridgeIds={progress.selectedBridgeIds}
          currentNodeId={progress.currentNodeId}
          failedBridgeIds={new Set(progress.failedBridgeIds)}
          suggestedBridgeIds={suggestions}
          revealedBridgeId={progress.revealedBridgeId}
          onSelect={selectBridge}
          onBacktrack={() => dispatchProgress({ type: 'UNDO_CROSSING' })}
          disabled={solved || rescue}
        />
        <section className="number-path-equation" aria-live="polite">
          <span>지나온 다리</span><strong>{equation}</strong><small>현재 합 {currentSum} / 목표 {puzzle.targetSum} · {progress.selectedBridgeIds.length} / {puzzle.requiredCrossings}개</small>
        </section>
        <p className={`number-path-message ${solved ? 'is-success' : ''}`} aria-live="polite">{solved ? '✨ ' : ''}{message}</p>
        {rescue ? (
          <button className="primary-button number-path-rescue" onClick={() => {
            dispatchProgress({ type: 'RETRY_AFTER_RESCUE' });
            setMessage('하트가 3개로 채워졌어요. 반짝이는 다리를 기억하며 다시 출발해요!');
          }}>♥ 하트 채우고 같은 지도 다시 도전</button>
        ) : !solved ? (
          <div className="number-path-tools">
            <button onClick={() => { dispatchProgress({ type: 'UNDO_CROSSING' }); setMessage('이전 섬으로 돌아왔어요. 하트는 그대로예요.'); }} disabled={progress.selectedBridgeIds.length === 0}>↩<small>이전 섬</small></button>
            <button className="number-path-hint" onClick={showHint} disabled={progress.hintLevel === 2}>💡<small>{progress.hintLevel === 0 ? '힌트' : progress.hintLevel === 1 ? '안전한 다리' : '힌트 완료'}</small></button>
          </div>
        ) : (
          <button className="primary-button number-path-next" onClick={() => dispatchProgress({ type: 'ADVANCE' })}>
            {progress.puzzleIndex === NUMBER_PATH_SESSION_LENGTH - 1 ? '결과 보기' : '다음 길'}
          </button>
        )}
        {storageWarning && <p className="number-path-warning" role="status">기록 저장 공간을 확인해 주세요. 게임은 계속할 수 있어요.</p>}
      </main>
    );
  }

  if (screen === 'result' && result) {
    const newAchievements = getNumberPathAchievements(records).filter((item) => result.newAchievementIds.includes(item.id));
    return (
      <main className="screen number-path-result-screen">
        <div className="number-path-result-icon">
          <img className="number-path-result-image" src={numberPathIllustration('number-path-result-treasure.webp')} alt="" aria-hidden="true" width="512" height="512" decoding="async" />
        </div>
        <p className="eyebrow">{result.daily ? '오늘의 길 완료!' : '다섯 길을 모두 찾았어요!'}</p>
        <h1>숫자를 더하며<br />길을 계획했어요</h1>
        <div className="number-path-result-stars" aria-label="별 3개 획득">★★★</div>
        {result.earnedDailyBadge && <aside className="number-path-daily-badge"><span>🏅</span><strong>오늘의 길 배지</strong><small>오늘도 차근차근 길을 찾았어요!</small></aside>}
        {newAchievements.length > 0 && <section className="number-path-new-achievements"><p>새 배지를 찾았어요!</p>{newAchievements.map((item) => <span key={item.id}><i>{item.icon}</i><strong>{item.title}</strong></span>)}</section>}
        <section className="number-path-result-stats" aria-label="게임 결과">
          <div><strong>5</strong><small>찾은 길</small></div>
          <div><strong>{result.bridgeFailures}</strong><small>살펴본 위험 다리</small></div>
          <div><strong>{result.retries}</strong><small>용감한 재도전</small></div>
        </section>
        <p className="number-path-result-note">힌트를 보거나 하트를 채워도 별은 줄지 않아요. 다시 생각한 것도 멋진 공부예요.</p>
        <div className="number-path-result-actions">
          <button className="primary-button" onClick={() => startGame(result.difficulty, result.daily)}>한 번 더</button>
          <button className="secondary-button" onClick={() => setScreen('levels')}>다른 단계 고르기</button>
          <button className="text-button" onClick={onExit}>학습 놀이터로</button>
        </div>
      </main>
    );
  }

  if (screen === 'collection') {
    const achievements = getNumberPathAchievements(records);
    const unlocked = achievements.filter((item) => item.unlocked).length;
    return (
      <main className="screen number-path-collection-screen">
        <header className="top-bar"><button className="icon-button" onClick={() => setScreen('levels')} aria-label="단계 선택으로 돌아가기">←</button><strong>길 찾기 배지</strong><span /></header>
        <section className="number-path-collection-hero"><NumberPathIcon decorative /><span><p className="eyebrow">생각할수록 채워져요</p><h1>{unlocked} / {achievements.length}개 발견!</h1></span></section>
        <AchievementGrid items={achievements} className="number-path-badge-grid" label="길 찾기 배지 목록" />
      </main>
    );
  }

  const todayKey = numberPathTodayKey();
  const todayCompleted = records.dailyBadges.includes(todayKey);
  const currentRecord = records.byDifficulty[difficulty];
  return (
    <main className="screen number-path-level-screen">
      <header className="top-bar"><button className="icon-button" onClick={onExit} aria-label="홈으로 돌아가기">←</button><strong>숫자 길 찾기</strong><span /></header>
      <section className="number-path-hero"><div className="number-path-hero-art"><img className="number-path-hero-image" src={numberPathIllustration('number-path-forest-hero.webp')} alt="" aria-hidden="true" width="512" height="512" decoding="async" /></div><span><p className="eyebrow">숫자 다리를 골라 목표 합으로</p><h1>섬과 다리를 건너<br />보물을 찾아요</h1></span></section>
      {returnNotice && <p className="number-path-saved-notice" role="status">진행을 저장했어요. 나중에 이어 할 수 있어요.</p>}
      {savedProgress && <button className="number-path-resume-card" onClick={() => enterGame(savedProgress)}><span aria-hidden="true">▶</span><span><strong>{savedProgress.daily ? '오늘의 길' : numberPathDifficultyInfo[savedProgress.difficulty].label} 이어서 하기</strong><small>{savedProgress.puzzleIndex + 1}번째 길 · {savedProgress.completedCount}개 완료</small></span><b aria-hidden="true">›</b></button>}
      <button className={`number-path-daily-card ${todayCompleted ? 'is-complete' : ''}`} onClick={() => startGame('growing', true)}><span>{todayCompleted ? '🏅' : '☀'}</span><span><strong>오늘의 길 찾기</strong><small>{todayCompleted ? '오늘의 배지를 받았어요! 다시 해 볼까요?' : '같은 날에는 같은 다섯 길'}</small></span><b>{todayCompleted ? '완료' : '추천'}</b></button>
      <button className="number-path-collection-card" onClick={() => setScreen('collection')}><span>🧭</span><span><strong>길 찾기 배지</strong><small>{getNumberPathAchievements(records).filter((item) => item.unlocked).length} / {getNumberPathAchievements(records).length}개 발견</small></span><b>›</b></button>
      <fieldset className="number-path-level-options">
        <legend>어떤 길에 도전할까요?</legend>
        <div>{NUMBER_PATH_DIFFICULTIES.map((item) => {
          const info = numberPathDifficultyInfo[item];
          return <button key={item} role="radio" aria-checked={difficulty === item} className={difficulty === item ? 'active' : ''} onClick={() => setDifficulty(item)}><span>{info.example}</span><strong>{info.label}</strong><small>{info.description}<br />{info.age}</small><i>{difficulty === item ? '✓' : ''}</i></button>;
        })}</div>
      </fieldset>
      {currentRecord && <aside className="number-path-record-card"><span>🏆</span><div><strong>나의 기록</strong><small>{currentRecord.completedSessions}번 완료 · 길 {currentRecord.completedPuzzles}개</small></div></aside>}
      <aside className="number-path-rule-card"><NumberPathIcon decorative /><span><strong>문제마다 하트가 3개예요</strong><small>다리를 미리 살펴보고, 언제든 이전 섬으로 돌아갈 수 있어요.</small></span></aside>
      <button className="secondary-button number-path-tutorial-link" onClick={() => setScreen('tutorial')}>규칙 다시 연습하기</button>
      <button className="primary-button number-path-start" onClick={() => startGame()}>숫자 길 5개 시작할래요</button>
      {records.completedSessions > 0 && <p className="number-path-record">지금까지 숫자 길 {records.completedPuzzles}개를 찾았어요!</p>}
      {storageWarning && <p className="number-path-warning" role="status">기록 저장 공간을 확인해 주세요. 게임은 계속할 수 있어요.</p>}
    </main>
  );
}
