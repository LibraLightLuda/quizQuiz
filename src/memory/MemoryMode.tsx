import { useEffect, useMemo, useRef, useState } from 'react';
import { playSuccessSound, unlockAudio } from '../services/soundService';
import { MEMORY_DIFFICULTIES, MEMORY_MODES, memoryDifficultyInfo, memoryModeInfo } from './memoryData';
import { calculateStars, createMemoryProgress, formatMemoryTime, todayKey } from './memoryGenerator';
import {
  clearMemoryProgress,
  loadMemoryProgress,
  loadMemoryRecords,
  rememberMemoryChoice,
  saveMemoryCompletion,
  saveMemoryProgress
} from './memoryStorage';
import type { MemoryDifficulty, MemoryMode as MemoryModeType, MemoryProgress, MemoryResult } from './types';
import { GuideCharacter } from '../visuals/GuideCharacter';
import { LearningIcon } from '../visuals/LearningIcon';
import { MemoryCardVisual } from '../visuals/MemoryCardVisual';
import { AchievementGrid } from '../visuals/AchievementGrid';
import { getMemoryAchievementStatuses, getNewMemoryAchievementIds, memoryRecordSummary } from './memoryAchievements';
import { useGrowth } from '../growth/GrowthContext';
import { GrowthCelebration, GrowthRewardCard } from '../growth/GrowthUI';
import type { GrowthAward } from '../growth/types';
import './memory.css';

type MemoryScreen = 'levels' | 'play' | 'result' | 'collection';

interface MemoryModeProps {
  onExit: () => void;
  soundEnabled: boolean;
  animationsEnabled: boolean;
  onLanguagePairMatched?: (wordId: string, skillIds: readonly string[]) => void;
}

const categoryLabels = { math: '수', korean: '한', english: '영' } as const;
const praiseMessages = ['멋진 연결이에요!', '기억력이 반짝!', '정확해요!', '아주 잘 찾았어요!'];

function MemoryMode({ onExit, soundEnabled, animationsEnabled, onLanguagePairMatched }: MemoryModeProps) {
  const growth = useGrowth();
  const initialProgress = useMemo(() => loadMemoryProgress(), []);
  const [records, setRecords] = useState(() => loadMemoryRecords());
  const [savedProgress, setSavedProgress] = useState(initialProgress);
  const [screen, setScreen] = useState<MemoryScreen>('levels');
  const [mode, setMode] = useState<MemoryModeType>(() => loadMemoryRecords().lastMode);
  const [difficulty, setDifficulty] = useState<MemoryDifficulty>(() => loadMemoryRecords().lastDifficulty);
  const [progress, setProgress] = useState<MemoryProgress | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [result, setResult] = useState<MemoryResult | null>(null);
  const [growthAward, setGrowthAward] = useState<GrowthAward | null>(null);
  const [message, setMessage] = useState('서로 뜻이 통하는 카드 두 장을 찾아보세요.');
  const [locked, setLocked] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [storageWarning, setStorageWarning] = useState(false);
  const timerBase = useRef(0);
  const timerStartedAt = useRef(Date.now());
  const revealTimer = useRef<number | null>(null);

  const currentElapsed = () => screen === 'play'
    ? timerBase.current + Math.max(0, Date.now() - timerStartedAt.current)
    : elapsedMs;

  useEffect(() => {
    if (screen !== 'play') return;
    const tick = () => setElapsedMs(currentElapsed());
    tick();
    const interval = window.setInterval(tick, 500);
    return () => window.clearInterval(interval);
  }, [screen, progress?.id]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
  }, [screen]);

  useEffect(() => {
    const saveBeforeLeaving = () => {
      if (screen !== 'play' || !progress) return;
      saveMemoryProgress({ ...progress, elapsedMs: currentElapsed(), updatedAt: new Date().toISOString() });
    };
    window.addEventListener('pagehide', saveBeforeLeaving);
    document.addEventListener('visibilitychange', saveBeforeLeaving);
    return () => {
      window.removeEventListener('pagehide', saveBeforeLeaving);
      document.removeEventListener('visibilitychange', saveBeforeLeaving);
    };
  }, [progress, screen]);

  useEffect(() => () => {
    if (revealTimer.current !== null) window.clearTimeout(revealTimer.current);
  }, []);

  const storeProgress = (next: MemoryProgress) => {
    setProgress(next);
    setSavedProgress(next);
    if (!saveMemoryProgress(next)) setStorageWarning(true);
  };

  const enterGame = (next: MemoryProgress) => {
    timerBase.current = next.elapsedMs;
    timerStartedAt.current = Date.now();
    setElapsedMs(next.elapsedMs);
    setProgress(next);
    setMode(next.mode);
    setDifficulty(next.difficulty);
    setResult(null);
    setLocked(false);
    setCelebrate(false);
    setMessage(next.daily ? '오늘의 도전이에요! 세 과목의 연결을 찾아봐요.' : '서로 뜻이 통하는 카드 두 장을 찾아보세요.');
    setScreen('play');
  };

  const startGame = (nextMode = mode, nextDifficulty = difficulty, daily = false) => {
    if (savedProgress && !window.confirm('새 게임을 시작하면 지금 하던 게임은 바뀌어요. 시작할까요?')) return;
    void unlockAudio();
    const dateKey = daily ? todayKey() : undefined;
    const seed = daily ? `daily-${dateKey}` : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const actualMode: MemoryModeType = daily ? 'mixed' : nextMode;
    const actualDifficulty: MemoryDifficulty = daily ? 'growing' : nextDifficulty;
    const next = createMemoryProgress(actualMode, actualDifficulty, seed, daily, dateKey, records.recentLayouts);
    const nextRecords = rememberMemoryChoice(records, actualMode, actualDifficulty);
    setRecords(nextRecords);
    storeProgress(next);
    enterGame(next);
  };

  const finishGame = (completed: MemoryProgress) => {
    const finishTime = currentElapsed();
    const pairCount = completed.cards.length / 2;
    const accuracy = completed.attempts ? Math.round((completed.correctAttempts / completed.attempts) * 100) : 100;
    const stars = calculateStars(pairCount, completed.attempts);
    const saved = saveMemoryCompletion(records, completed, finishTime, accuracy, stars);
    const growthResult = growth.awardCompletion('memory');
    setGrowthAward(growthResult.award);
    const newAchievementIds = getNewMemoryAchievementIds(records, saved.records);
    setRecords(saved.records);
    if (!saved.saved || !growthResult.saved || !clearMemoryProgress()) setStorageWarning(true);
    setSavedProgress(null);
    setElapsedMs(finishTime);
    setResult({
      mode: completed.mode,
      difficulty: completed.difficulty,
      elapsedMs: finishTime,
      attempts: completed.attempts,
      accuracy,
      stars,
      bestCombo: completed.bestCombo,
      isBestTime: saved.isBestTime,
      isBestAttempts: saved.isBestAttempts,
      daily: completed.daily,
      earnedDailyBadge: saved.earnedDailyBadge,
      newAchievementIds
    });
    setCelebrate(true);
    if (soundEnabled) playSuccessSound();
    setScreen('result');
  };

  const chooseCard = (cardId: string) => {
    if (!progress || locked || progress.matchedCardIds.includes(cardId) || progress.selectedCardIds.includes(cardId)) return;
    void unlockAudio();
    const selected = [...progress.selectedCardIds, cardId];
    const elapsed = currentElapsed();
    if (selected.length === 1) {
      storeProgress({ ...progress, selectedCardIds: selected, elapsedMs: elapsed, updatedAt: new Date().toISOString() });
      setMessage('한 장 더 골라 볼까요?');
      return;
    }

    const [firstId, secondId] = selected;
    const first = progress.cards.find((card) => card.id === firstId)!;
    const second = progress.cards.find((card) => card.id === secondId)!;
    const matched = first.pairId === second.pairId;
    const nextCombo = matched ? progress.combo + 1 : 0;
    const checked: MemoryProgress = {
      ...progress,
      selectedCardIds: selected,
      attempts: progress.attempts + 1,
      correctAttempts: progress.correctAttempts + (matched ? 1 : 0),
      combo: nextCombo,
      bestCombo: Math.max(progress.bestCombo, nextCombo),
      elapsedMs: elapsed,
      updatedAt: new Date().toISOString()
    };
    storeProgress(checked);
    setLocked(true);

    if (matched) {
      if (first.wordId && first.skillIds?.length) onLanguagePairMatched?.(first.wordId, first.skillIds);
      const relation = `${first.content} ↔ ${second.content}`;
      setMessage(nextCombo >= 2 ? `${relation} · 연속 ${nextCombo}번 성공!` : `${relation} · ${praiseMessages[checked.correctAttempts % praiseMessages.length]}`);
      setCelebrate(true);
      if (soundEnabled) playSuccessSound();
      revealTimer.current = window.setTimeout(() => {
        const completed = {
          ...checked,
          selectedCardIds: [],
          matchedCardIds: [...checked.matchedCardIds, firstId, secondId],
          updatedAt: new Date().toISOString()
        };
        setCelebrate(false);
        setLocked(false);
        if (completed.matchedCardIds.length === completed.cards.length) finishGame(completed);
        else storeProgress(completed);
      }, 420);
      return;
    }

    setMessage('괜찮아요! 카드를 기억하고 다시 생각해 봐요.');
    revealTimer.current = window.setTimeout(() => {
      storeProgress({ ...checked, selectedCardIds: [], combo: 0, updatedAt: new Date().toISOString() });
      setLocked(false);
      setMessage('천천히 다시 연결해 볼까요?');
    }, 900);
  };

  const returnToLevels = () => {
    if (progress) {
      const next = { ...progress, elapsedMs: currentElapsed(), updatedAt: new Date().toISOString() };
      storeProgress(next);
    }
    setScreen('levels');
  };

  const resume = () => {
    if (!savedProgress) return;
    void unlockAudio();
    enterGame(savedProgress);
  };

  if (screen === 'play' && progress) {
    const pairCount = progress.cards.length / 2;
    const matchedPairs = progress.matchedCardIds.length / 2;
    return (
      <main className="screen memory-play-screen">
        <header className="memory-game-header">
          <button className="icon-button" onClick={returnToLevels} aria-label="단계 선택으로 돌아가기">←</button>
          <div>
            <small>{progress.daily ? '오늘의 도전' : `${memoryModeInfo[progress.mode].label} · ${memoryDifficultyInfo[progress.difficulty].label}`}</small>
            <strong>{matchedPairs} / {pairCount}쌍</strong>
          </div>
          <div className="memory-timer" aria-label={`걸린 시간 ${formatMemoryTime(elapsedMs)}`}>⏱ <b>{formatMemoryTime(elapsedMs)}</b></div>
        </header>
        <div className="memory-status-row">
          <span>시도 <b>{progress.attempts}</b></span>
          <span>연속 <b>{progress.combo}</b></span>
          <span>별 <b>{'★'.repeat(Math.max(1, calculateStars(pairCount, progress.attempts)))}</b></span>
        </div>
        <div className="memory-progress" aria-hidden="true"><span style={{ width: `${(matchedPairs / pairCount) * 100}%` }} /></div>
        <p className={`memory-message ${celebrate && animationsEnabled ? 'is-celebrating' : ''}`} aria-live="polite">
          {celebrate ? '✨ ' : ''}{message}
        </p>
        <section className={`memory-grid ${pairCount === 4 ? 'memory-grid-small' : 'memory-grid-dense'}`} aria-label="기억력 카드 판">
          {progress.cards.map((card, index) => {
            const flipped = progress.selectedCardIds.includes(card.id) || progress.matchedCardIds.includes(card.id);
            const matched = progress.matchedCardIds.includes(card.id);
            return (
              <button
                key={card.id}
                className={`memory-card ${flipped ? 'is-flipped' : ''} ${matched ? 'is-matched' : ''}`}
                onClick={() => chooseCard(card.id)}
                disabled={matched || locked}
                aria-label={flipped ? `${card.content}, ${categoryLabels[card.category]} 카드${matched ? ', 맞춘 카드' : ''}` : `${index + 1}번 카드 뒤집기`}
              >
                <span className="memory-card-inner">
                  <span className="memory-card-back" aria-hidden="true"><i><LearningIcon name="memory" /></i><small>{index + 1}</small></span>
                  <span className={`memory-card-front memory-category-${card.category}`} aria-hidden={!flipped}>
                    <small>{categoryLabels[card.category]}</small><span className="memory-card-content"><MemoryCardVisual card={card} /><strong>{card.content}</strong></span>
                  </span>
                </span>
              </button>
            );
          })}
        </section>
        {storageWarning && <p className="memory-warning">기록 저장 공간을 확인해 주세요. 게임은 계속할 수 있어요.</p>}
      </main>
    );
  }

  if (screen === 'result' && result) {
    const newAchievements = getMemoryAchievementStatuses(records)
      .filter((achievement) => result.newAchievementIds.includes(achievement.id));
    return (
      <main className="screen memory-result-screen">
        {growthAward && <GrowthCelebration award={growthAward} animationsEnabled={animationsEnabled} />}
        <div className="memory-result-burst" aria-hidden="true">🏆</div>
        <p className="eyebrow">모든 연결을 찾았어요!</p>
        <h1>{result.isBestTime || result.isBestAttempts ? '새로운 최고 기록!' : '기억력 챌린지 성공!'}</h1>
        <div className="memory-stars" aria-label={`${result.stars}개의 별 획득`}>{'★'.repeat(result.stars)}<span>{'★'.repeat(3 - result.stars)}</span></div>
        {growthAward && <GrowthRewardCard award={growthAward} />}
        {result.earnedDailyBadge && <div className="daily-badge"><span>🌟</span><strong>오늘의 특별 배지</strong><small>매일 도전한 멋진 기억력 탐험가!</small></div>}
        {newAchievements.length > 0 && (
          <section className="memory-new-achievements" aria-label="새로 얻은 배지">
            <p>새 배지를 찾았어요!</p>
            <div>{newAchievements.map((achievement) => <span key={achievement.id}><i aria-hidden="true">{achievement.icon}</i><strong>{achievement.title}</strong></span>)}</div>
          </section>
        )}
        <section className="memory-result-stats" aria-label="게임 결과">
          <div><small>완료 시간</small><strong>{formatMemoryTime(result.elapsedMs)}</strong>{result.isBestTime && <em>최고!</em>}</div>
          <div><small>시도 횟수</small><strong>{result.attempts}번</strong>{result.isBestAttempts && <em>최소!</em>}</div>
          <div><small>정답률</small><strong>{result.accuracy}%</strong><span>최대 콤보 {result.bestCombo}</span></div>
        </section>
        <div className="memory-result-actions">
          <button className="primary-button" onClick={() => startGame(result.mode, result.difficulty, result.daily)}>다시 하기</button>
          <button className="secondary-button" onClick={() => setScreen('levels')}>다른 모드 도전</button>
          <button className="secondary-button" onClick={() => setScreen('collection')}>내 배지 도감 보기</button>
          <button className="text-button" onClick={onExit}>홈으로 이동</button>
        </div>
      </main>
    );
  }

  if (screen === 'collection') {
    const achievements = getMemoryAchievementStatuses(records);
    const summary = memoryRecordSummary(records);
    const unlockedCount = achievements.filter((achievement) => achievement.unlocked).length;
    return (
      <main className="screen memory-collection-screen">
        <header className="top-bar"><button className="icon-button" onClick={() => setScreen('levels')} aria-label="단계 선택으로 돌아가기">←</button><strong>내 배지 도감</strong><span /></header>
        <section className="memory-collection-hero">
          <div aria-hidden="true">🏅</div>
          <span><p className="eyebrow">연결할수록 채워져요</p><h1>{unlockedCount} / {achievements.length}개 발견!</h1><small>잠긴 배지도 어떻게 얻는지 살펴볼 수 있어요.</small></span>
        </section>
        <section className="memory-collection-summary" aria-label="기억력 챌린지 모은 기록">
          <div><strong>{summary.totalStars}</strong><small>모은 별</small></div>
          <div><strong>{summary.completedCount}</strong><small>완료 횟수</small></div>
          <div><strong>{summary.completedModes} / 4</strong><small>도전 모드</small></div>
          <div><strong>{summary.dailyCount}</strong><small>일일 배지</small></div>
        </section>
        <div className="memory-collection-progress" aria-label={`배지 ${achievements.length}개 중 ${unlockedCount}개 획득`}><span style={{ width: `${(unlockedCount / achievements.length) * 100}%` }} /></div>
        <AchievementGrid items={achievements} className="memory-badge-grid" label="기억력 배지 목록" />
        <button className="primary-button memory-collection-back" onClick={() => setScreen('levels')}>다음 도전 고르기</button>
      </main>
    );
  }

  const currentRecord = records.byLevel[`${mode}:${difficulty}`];
  const todayCompleted = records.dailyBadges.includes(todayKey());
  return (
    <main className="screen memory-level-screen">
      <header className="top-bar"><button className="icon-button" onClick={onExit} aria-label="홈으로 돌아가기">←</button><strong>기억력 챌린지</strong><span /></header>
      <section className="memory-hero">
        <GuideCharacter className="memory-guide" decorative />
        <span><p className="eyebrow">뜻이 통하는 두 장을 찾아요</p><h1>놀면서 배우는<br />기억력 게임</h1></span>
      </section>
      {savedProgress && (
        <button className="memory-resume-card" onClick={resume}>
          <span aria-hidden="true">▶</span><span><strong>{savedProgress.daily ? '오늘의 도전' : memoryModeInfo[savedProgress.mode].label} 이어서 하기</strong><small>{savedProgress.matchedCardIds.length / 2}쌍 찾음 · {formatMemoryTime(savedProgress.elapsedMs)}</small></span><b>›</b>
        </button>
      )}
      <button className={`memory-daily-card ${todayCompleted ? 'is-complete' : ''}`} onClick={() => startGame('mixed', 'growing', true)}>
        <span aria-hidden="true">{todayCompleted ? '🏅' : '🌞'}</span>
        <span><strong>오늘의 기억력 챌린지</strong><small>{todayCompleted ? '오늘의 배지를 받았어요! 다시 도전할까요?' : '매일 새로운 통합 카드 · 완료하면 특별 배지'}</small></span>
        <b>{todayCompleted ? '완료' : '추천'}</b>
      </button>
      <button className="memory-collection-card" onClick={() => setScreen('collection')}>
        <span aria-hidden="true">🏅</span>
        <span><strong>내 배지 도감</strong><small>{getMemoryAchievementStatuses(records).filter((item) => item.unlocked).length} / {getMemoryAchievementStatuses(records).length}개 발견 · 모은 별 {memoryRecordSummary(records).totalStars}개</small></span>
        <b aria-hidden="true">›</b>
      </button>
      <fieldset className="memory-option-section">
        <legend>어떤 카드로 놀까요?</legend>
        <div className="memory-mode-grid">
          {MEMORY_MODES.map((item) => {
            const info = memoryModeInfo[item];
            return <button key={item} role="radio" aria-checked={mode === item} className={mode === item ? 'active' : ''} onClick={() => setMode(item)}><i aria-hidden="true"><LearningIcon name={item === 'mixed' ? 'memory' : item} /></i><span><strong>{info.label}</strong><small>{info.description}</small></span>{item === 'mixed' && <em>추천</em>}</button>;
          })}
        </div>
      </fieldset>
      <fieldset className="memory-option-section">
        <legend>몇 장에 도전할까요?</legend>
        <div className="memory-difficulty-grid">
          {MEMORY_DIFFICULTIES.map((item) => {
            const info = memoryDifficultyInfo[item];
            return <button key={item} role="radio" aria-checked={difficulty === item} className={difficulty === item ? 'active' : ''} onClick={() => setDifficulty(item)}><strong>{info.label}</strong><small>{info.description}</small><span aria-hidden="true">{difficulty === item ? '✓' : ''}</span></button>;
          })}
        </div>
      </fieldset>
      {currentRecord && <aside className="memory-best"><span>🏆</span><div><strong>나의 최고 기록</strong><small>{formatMemoryTime(currentRecord.bestTimeMs)} · 최소 {currentRecord.minAttempts}번 · 별 {currentRecord.totalStars}개</small></div></aside>}
      <button className="primary-button memory-start" onClick={() => startGame()}>카드 {memoryDifficultyInfo[difficulty].pairCount * 2}장 시작할래요</button>
      <p className="memory-rule">같은 그림이 아니라 <strong>뜻이 연결되는 카드</strong>를 찾아요.</p>
      {storageWarning && <p className="memory-warning">기록 저장 공간을 확인해 주세요. 게임은 계속할 수 있어요.</p>}
    </main>
  );
}

export default MemoryMode;
