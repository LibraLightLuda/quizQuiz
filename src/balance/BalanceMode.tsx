import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { CryptoRandom, SeededRandom } from '../services/randomService';
import { playSuccessSound, unlockAudio } from '../services/soundService';
import { BalanceIcon } from '../visuals/BalanceIcon';
import { AchievementGrid } from '../visuals/AchievementGrid';
import { getBalanceAchievements, getNewBalanceAchievementIds } from './balanceAchievements';
import {
  BALANCE_DIFFICULTIES,
  BALANCE_SESSION_LENGTH,
  balanceDifficultyInfo,
  balanceGuidance,
  balanceTotals,
  createBalanceProgress,
  misplacedWeightIds,
  missingSolutionWeightIds
} from './balanceGenerator';
import { balanceReducer } from './balanceReducer';
import {
  balanceSeed,
  balanceTodayKey,
  clearBalanceProgress,
  completeBalanceTutorial,
  loadBalanceProgress,
  loadBalanceRecords,
  rememberBalanceDifficulty,
  saveBalanceCompletion,
  saveBalanceProgress
} from './balanceStorage';
import type { BalanceDifficulty, BalanceProgress, BalanceSide, BalanceWeight } from './types';
import BalanceTutorial from './BalanceTutorial';
import { useGrowth } from '../growth/GrowthContext';
import { GrowthCelebration, GrowthRewardCard } from '../growth/GrowthUI';
import type { GrowthAward } from '../growth/types';
import './balance.css';

type BalanceScreen = 'levels' | 'tutorial' | 'play' | 'result' | 'collection';

interface BalanceModeProps {
  onExit: () => void;
  soundEnabled: boolean;
  animationsEnabled: boolean;
}

interface BalanceResult {
  difficulty: BalanceDifficulty;
  moves: number;
  isBest: boolean;
  daily: boolean;
  earnedDailyBadge: boolean;
  newAchievementIds: string[];
}

const random = new CryptoRandom();
const sideLabel = (side: BalanceSide) => side === 'left' ? '왼쪽' : '오른쪽';

function FixedWeight({ value }: { value: number }) {
  if (value === 0) return <span className="balance-empty-pan">비어 있어요</span>;
  return <span className="balance-fixed-weight"><small>고정</small><strong>{value}</strong></span>;
}

const weightName = (weight: BalanceWeight) => weight.accessibleLabel ?? `${weight.value} 추`;

function BalanceMode({ onExit, soundEnabled, animationsEnabled }: BalanceModeProps) {
  const growth = useGrowth();
  const initialRecords = useMemo(() => loadBalanceRecords(), []);
  const initialSaved = useMemo(() => loadBalanceProgress(), []);
  const [records, setRecords] = useState(initialRecords);
  const [savedProgress, setSavedProgress] = useState(initialSaved);
  const [difficulty, setDifficulty] = useState<BalanceDifficulty>(() => initialSaved?.difficulty ?? initialRecords.lastDifficulty);
  const [screen, setScreen] = useState<BalanceScreen>(() => initialRecords.tutorialCompleted ? 'levels' : 'tutorial');
  const [progress, dispatchProgress] = useReducer(balanceReducer, null);
  const [selectedWeightId, setSelectedWeightId] = useState<string | null>(null);
  const [storageWarning, setStorageWarning] = useState(false);
  const [result, setResult] = useState<BalanceResult | null>(null);
  const [growthAward, setGrowthAward] = useState<GrowthAward | null>(null);
  const [returnNotice, setReturnNotice] = useState(false);
  const completedSessions = useRef(new Set<string>());
  const progressRef = useRef<BalanceProgress | null>(null);

  useEffect(() => { progressRef.current = progress; }, [progress]);

  useEffect(() => {
    if (!progress || progress.phase === 'finished') return;
    setSavedProgress(progress);
    if (!saveBalanceProgress(progress)) setStorageWarning(true);
  }, [progress]);

  useEffect(() => {
    const saveBeforeLeaving = () => {
      const current = progressRef.current;
      if (current && current.phase !== 'finished') saveBalanceProgress(current);
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
    const saved = saveBalanceCompletion(records, progress);
    const growthResult = growth.awardCompletion('balance');
    setGrowthAward(growthResult.award);
    const newAchievementIds = getNewBalanceAchievementIds(records, saved.records);
    setRecords(saved.records);
    if (!saved.saved || !growthResult.saved || !clearBalanceProgress()) setStorageWarning(true);
    setSavedProgress(null);
    setResult({
      difficulty: progress.difficulty,
      moves: progress.moves,
      isBest: saved.isBest,
      daily: progress.daily,
      earnedDailyBadge: saved.earnedDailyBadge,
      newAchievementIds
    });
    setScreen('result');
  }, [progress, records]);

  const enterGame = (next: BalanceProgress) => {
    dispatchProgress({ type: 'LOAD', progress: next });
    setDifficulty(next.difficulty);
    setSelectedWeightId(null);
    setResult(null);
    setReturnNotice(false);
    setScreen('play');
  };

  const startGame = (nextDifficulty = difficulty, daily = false, recordSource = records) => {
    if (savedProgress && !window.confirm('새 게임을 시작하면 이어 하던 판이 바뀌어요. 시작할까요?')) return;
    void unlockAudio();
    const dateKey = daily ? balanceTodayKey() : undefined;
    const gameRandom = daily ? new SeededRandom(balanceSeed(`balance-${dateKey}-${nextDifficulty}`)) : random;
    if (!daily) {
      const remembered = rememberBalanceDifficulty(recordSource, nextDifficulty);
      setRecords(remembered.records);
      if (!remembered.saved) setStorageWarning(true);
    }
    const next = createBalanceProgress(nextDifficulty, gameRandom, {
      daily,
      dateKey,
      recentSignatures: daily ? [] : recordSource.recentSignatures
    });
    enterGame(next);
  };

  const resume = () => {
    if (!savedProgress) return;
    void unlockAudio();
    enterGame(savedProgress);
  };

  const finishTutorial = () => {
    const saved = completeBalanceTutorial(records);
    setRecords(saved.records);
    if (!saved.saved) setStorageWarning(true);
    setScreen('levels');
    startGame('starter', false, saved.records);
  };

  if (screen === 'tutorial') {
    return <BalanceTutorial onBack={() => setScreen('levels')} onComplete={finishTutorial} />;
  }

  if (screen === 'play' && progress) {
    const puzzle = progress.puzzles[progress.puzzleIndex];
    const totals = balanceTotals(puzzle, progress.placements);
    const guidance = balanceGuidance(puzzle, progress.placements);
    const solved = progress.phase === 'solved';
    const tiltClass = solved ? 'is-balanced' : totals.left > totals.right ? 'is-left-heavy' : 'is-right-heavy';
    const missingIds = new Set(missingSolutionWeightIds(puzzle, progress.placements));
    const misplacedIds = new Set(misplacedWeightIds(puzzle, progress.placements));
    const availableWeights = puzzle.weights.filter((weight) => !progress.placements[weight.id]);

    const guidanceMessage = solved
      ? `양쪽 합이 ${totals.left}로 같아요. ${totals.left} = ${totals.right}, 균형이에요!`
      : progress.hintLevel === 2 && misplacedIds.size > 0
        ? '주황색 테두리의 추를 빼고, 반짝이는 추를 놓아 보세요.'
        : guidance.relation === 'needs-more'
          ? `${sideLabel(guidance.side!)} 접시에 ${guidance.difference}만큼 더 놓아 보세요.`
          : `${sideLabel(guidance.side!)}이 ${guidance.difference}만큼 무거워요. 추를 하나 빼 볼까요?`;

    const placeWeight = (weightId: string, side: BalanceSide) => {
      if (progress.phase !== 'playing') return;
      dispatchProgress({ type: 'PLACE', weightId, side });
      setSelectedWeightId(null);
      const nextPlacements = { ...progress.placements, [weightId]: side };
      if (balanceTotals(puzzle, nextPlacements).left === balanceTotals(puzzle, nextPlacements).right && soundEnabled) {
        playSuccessSound();
      }
    };

    const panContent = (side: BalanceSide) => {
      const allowed = puzzle.allowedSides.includes(side);
      const baseValue = side === 'left' ? puzzle.baseLeft : puzzle.baseRight;
      const placedWeights = puzzle.weights.filter((weight) => progress.placements[weight.id] === side);
      return (
        <div
          className={`balance-pan ${allowed ? 'is-movable' : 'is-fixed'}`}
          onDragOver={(event) => { if (allowed) event.preventDefault(); }}
          onDrop={(event) => {
            if (!allowed) return;
            event.preventDefault();
            const weightId = event.dataTransfer.getData('text/plain');
            if (weightId) placeWeight(weightId, side);
          }}
        >
          <div className="balance-pan-load">
            {(baseValue > 0 || !allowed || placedWeights.length === 0) && <FixedWeight value={baseValue} />}
            {placedWeights.map((weight) => (
              <button
                key={weight.id}
                data-weight-id={weight.id}
                className={`balance-weight is-placed ${progress.hintLevel === 2 && misplacedIds.has(weight.id) ? 'is-misplaced' : ''}`}
                onClick={() => dispatchProgress({ type: 'REMOVE', weightId: weight.id })}
                disabled={solved}
                aria-label={`${weightName(weight)} 빼기`}
              >
                <strong>{weight.display ?? weight.value}</strong><small>빼기</small>
              </button>
            ))}
          </div>
          <strong className="balance-pan-total">합계 {side === 'left' ? totals.left : totals.right}</strong>
          {allowed && !solved && (
            <button className="balance-drop-button" data-side={side} onClick={() => selectedWeightId && placeWeight(selectedWeightId, side)} disabled={!selectedWeightId}>
              {selectedWeightId ? `${sideLabel(side)}에 놓기` : '먼저 추를 골라요'}
            </button>
          )}
        </div>
      );
    };

    return (
      <main className="screen balance-play-screen">
        <header className="balance-game-header">
          <button className="icon-button" onClick={() => { setReturnNotice(true); setScreen('levels'); }} aria-label="단계 선택으로 돌아가기">←</button>
          <div><small>{progress.daily ? '오늘의 균형' : balanceDifficultyInfo[progress.difficulty].label}</small><strong>{progress.puzzleIndex + 1} / {BALANCE_SESSION_LENGTH}</strong></div>
          <span className="balance-star-count" aria-label={`${progress.completedCount}문제 완료`}>{progress.completedCount} / 5</span>
        </header>
        <div className="balance-progress" aria-hidden="true"><span style={{ width: `${(progress.completedCount / BALANCE_SESSION_LENGTH) * 100}%` }} /></div>
        <section className="balance-instruction" aria-labelledby="balance-question">
          <p className="eyebrow">어느 추를 놓을까요?</p>
          <h1 id="balance-question">{puzzle.allowedSides.length === 2 ? '양쪽 접시에 추를 나누어 균형을 맞춰요' : `${sideLabel(puzzle.allowedSides[0])} 접시에 추를 놓아 균형을 맞춰요`}</h1>
          {puzzle.clue && <p className="balance-clue">🔎 {puzzle.clue}</p>}
        </section>
        <section className={`balance-scale ${tiltClass} ${animationsEnabled ? '' : 'no-motion'}`} aria-label={`왼쪽 합계 ${totals.left}, 오른쪽 합계 ${totals.right}`}>
          <div className="balance-beam-wrap" aria-hidden="true"><div className="balance-beam"><span /></div></div>
          <div className="balance-pans">{panContent('left')}<BalanceIcon className="balance-scale-center" decorative />{panContent('right')}</div>
        </section>
        <p className={`balance-message ${solved ? 'is-success' : ''}`} aria-live="polite">{solved ? '✨ ' : ''}{progress.placements && Object.keys(progress.placements).length === 0 && progress.hintLevel === 0 ? '아래 숫자 추를 골라 접시에 놓아 보세요.' : guidanceMessage}</p>
        {!solved && (
          <section className="balance-weight-bank" aria-label="사용할 수 있는 숫자 추">
            <div><strong>숫자 추</strong><small>추를 끌거나 누른 뒤 접시를 골라요</small></div>
            <div className="balance-weight-list">
              {availableWeights.map((weight) => {
                const selected = selectedWeightId === weight.id;
                const suggested = progress.hintLevel === 2 && missingIds.has(weight.id);
                return (
                  <button
                    key={weight.id}
                    data-weight-id={weight.id}
                    draggable
                    className={`balance-weight ${selected ? 'is-selected' : ''} ${suggested ? 'is-suggested' : ''}`}
                    onDragStart={(event) => event.dataTransfer.setData('text/plain', weight.id)}
                    onClick={() => setSelectedWeightId(selected ? null : weight.id)}
                    aria-pressed={selected}
                    aria-label={`${weightName(weight)}${suggested ? ', 힌트로 추천됨' : ''}`}
                  ><strong>{weight.display ?? weight.value}</strong><small>{selected ? '선택됨' : '고르기'}</small></button>
                );
              })}
            </div>
          </section>
        )}
        <div className="balance-actions">
          {solved ? (
            <button className="primary-button" onClick={() => dispatchProgress({ type: 'ADVANCE' })}>
              {progress.puzzleIndex === BALANCE_SESSION_LENGTH - 1 ? '결과 보기' : '다음 저울'}
            </button>
          ) : (
            <button className="balance-hint-button" onClick={() => dispatchProgress({ type: 'HINT' })} disabled={progress.hintLevel === 2}>
              {progress.hintLevel === 0 ? '힌트 보기' : progress.hintLevel === 1 ? '추 힌트 보기' : '힌트를 모두 봤어요'}
            </button>
          )}
        </div>
        {storageWarning && <p className="balance-warning" role="status">기록 저장 공간을 확인해 주세요. 게임은 계속할 수 있어요.</p>}
      </main>
    );
  }

  if (screen === 'result' && result) {
    const newAchievements = getBalanceAchievements(records).filter((item) => result.newAchievementIds.includes(item.id));
    return (
      <main className="screen balance-result-screen">
        {growthAward && <GrowthCelebration award={growthAward} animationsEnabled={animationsEnabled} />}
        <div className="balance-result-icon"><BalanceIcon decorative /></div>
        <p className="eyebrow">{result.daily ? '오늘의 균형 완료!' : '다섯 저울을 모두 맞췄어요!'}</p>
        <h1>양쪽의 합이 같다는 걸 배웠어요</h1>
        <div className="balance-result-stars" aria-label="별 3개 획득">★★★</div>
        {growthAward && <GrowthRewardCard award={growthAward} />}
        {result.earnedDailyBadge && <aside className="balance-daily-badge"><span>🏅</span><strong>오늘의 균형 배지</strong><small>오늘도 차근차근 생각해 냈어요!</small></aside>}
        {newAchievements.length > 0 && <section className="balance-new-achievements"><p>새 배지를 찾았어요!</p>{newAchievements.map((item) => <span key={item.id}><i>{item.icon}</i><strong>{item.title}</strong></span>)}</section>}
        {result.isBest && <p className="balance-best-note">새로운 방법으로 더 간단히 해결했어요!</p>}
        <section className="balance-result-stats" aria-label="게임 결과">
          <div><strong>5</strong><small>맞춘 저울</small></div>
          <div><strong>{result.moves}</strong><small>이번에 움직인 추</small></div>
          <div><strong>{records.completedPuzzles}</strong><small>지금까지 완료</small></div>
        </section>
        <p className="balance-result-note">힌트를 봐도 별은 줄지 않아요. 생각하고 완성한 것이 가장 중요해요.</p>
        <div className="balance-result-actions">
          <button className="primary-button" onClick={() => startGame(result.difficulty, result.daily)}>한 번 더</button>
          <button className="secondary-button" onClick={() => setScreen('levels')}>다른 단계 고르기</button>
          <button className="text-button" onClick={onExit}>학습 놀이터로</button>
        </div>
      </main>
    );
  }

  if (screen === 'collection') {
    const achievements = getBalanceAchievements(records);
    const unlocked = achievements.filter((item) => item.unlocked).length;
    return (
      <main className="screen balance-collection-screen">
        <header className="top-bar"><button className="icon-button" onClick={() => setScreen('levels')} aria-label="단계 선택으로 돌아가기">←</button><strong>균형 배지 도감</strong><span /></header>
        <section className="balance-collection-hero"><BalanceIcon decorative /><span><p className="eyebrow">생각할수록 채워져요</p><h1>{unlocked} / {achievements.length}개 발견!</h1></span></section>
        <div className="balance-collection-progress" aria-label={`배지 ${achievements.length}개 중 ${unlocked}개 획득`}><span style={{ width: `${(unlocked / achievements.length) * 100}%` }} /></div>
        <AchievementGrid items={achievements} className="balance-badge-grid" label="균형 배지 목록" />
      </main>
    );
  }

  const todayKey = balanceTodayKey();
  const todayCompleted = records.dailyBadges.includes(todayKey);
  const currentRecord = records.byDifficulty[difficulty];
  return (
    <main className="screen balance-level-screen">
      <header className="top-bar"><button className="icon-button" onClick={onExit} aria-label="홈으로 돌아가기">←</button><strong>균형 저울</strong><span /></header>
      <section className="balance-hero"><div><BalanceIcon decorative /></div><span><p className="eyebrow">양쪽을 똑같이 맞춰요</p><h1>숫자를 올리며<br />등식을 발견해요</h1></span></section>
      {returnNotice && <p className="balance-saved-notice" role="status">진행을 저장했어요. 나중에 이어 할 수 있어요.</p>}
      {savedProgress && <button className="balance-resume-card" onClick={resume}><span aria-hidden="true">▶</span><span><strong>{savedProgress.daily ? '오늘의 균형' : balanceDifficultyInfo[savedProgress.difficulty].label} 이어서 하기</strong><small>{savedProgress.puzzleIndex + 1}번째 저울 · {savedProgress.completedCount}개 완료</small></span><b aria-hidden="true">›</b></button>}
      <button className={`balance-daily-card ${todayCompleted ? 'is-complete' : ''}`} onClick={() => startGame('growing', true)}><span>{todayCompleted ? '🏅' : '☀'}</span><span><strong>오늘의 균형 도전</strong><small>{todayCompleted ? '오늘의 배지를 받았어요! 다시 해 볼까요?' : '매일 같은 날에는 같은 다섯 저울'}</small></span><b>{todayCompleted ? '완료' : '추천'}</b></button>
      <button className="balance-collection-card" onClick={() => setScreen('collection')}><span>🏅</span><span><strong>균형 배지 도감</strong><small>{getBalanceAchievements(records).filter((item) => item.unlocked).length} / {getBalanceAchievements(records).length}개 발견</small></span><b>›</b></button>
      <fieldset className="balance-level-options">
        <legend>어떤 저울에 도전할까요?</legend>
        <div>{BALANCE_DIFFICULTIES.map((item) => {
          const info = balanceDifficultyInfo[item];
          return <button key={item} role="radio" aria-checked={difficulty === item} className={difficulty === item ? 'active' : ''} onClick={() => setDifficulty(item)}><span>{info.example}</span><strong>{info.label}</strong><small>{info.description}<br />{info.age}</small><i>{difficulty === item ? '✓' : ''}</i></button>;
        })}</div>
      </fieldset>
      {currentRecord && <aside className="balance-best"><span>🏆</span><div><strong>나의 기록</strong><small>{currentRecord.completedSessions}번 완료 · 가장 간단한 움직임 {currentRecord.bestMoves}번</small></div></aside>}
      <aside className="balance-rule-card"><BalanceIcon decorative /><span><strong>시간 제한이 없어요</strong><small>천천히 생각하고 힌트도 편하게 사용하세요.</small></span></aside>
      <button className="secondary-button balance-tutorial-link" onClick={() => setScreen('tutorial')}>규칙 다시 연습하기</button>
      <button className="primary-button balance-start" onClick={() => startGame()}>저울 5개 시작할래요</button>
      {records.completedSessions > 0 && <p className="balance-record">지금까지 저울 {records.completedPuzzles}개를 맞췄어요!</p>}
      {storageWarning && <p className="balance-warning" role="status">기록 저장 공간을 확인해 주세요. 게임은 계속할 수 있어요.</p>}
    </main>
  );
}

export default BalanceMode;
