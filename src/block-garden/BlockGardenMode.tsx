import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { CryptoRandom, SeededRandom } from '../services/randomService';
import { playGardenClearSound, unlockAudio } from '../services/soundService';
import { BlockGardenIcon } from '../visuals/BlockGardenIcon';
import {
  anyTrayPieceFits, boardIndex, canPlaceShape, createGardenGame, createGardenPreview, gardenGameCanContinue, occupiedPercent, placeGardenPiece,
  pieceCanRotate, pieceFits, rerollGardenPiece, rotateGardenPiece, shapeForPiece, shapeCellsAt,
  TIMED_GARDEN_SECONDS, useGardenBomb
} from './blockGardenRules';
import {
  clearGardenProgress, loadGardenProgress, loadGardenRecords, recordFinishedGardenGame,
  saveGardenProgress, saveGardenRecords
} from './blockGardenStorage';
import {
  BOARD_SIZE, type BlockGardenModeProps, type GardenGame, type GardenItem, type GardenMode, type GardenPiece,
  type GardenTool
} from './types';
import { useGrowth } from '../growth/GrowthContext';
import { GrowthCelebration, GrowthRewardCard } from '../growth/GrowthUI';
import type { GrowthAward } from '../growth/types';
import './block-garden.css';

type GardenCss = CSSProperties & Record<'--piece-columns' | '--piece-rows', number>;

type PlacementFeedback = {
  id: number;
  cells: number[];
  cleared: number;
  gain: number;
};

type NoticeTone = 'neutral' | 'success' | 'error';

const MODE_INFO: Record<Exclude<GardenMode, 'daily'>, { icon: string; name: string; description: string }> = {
  classic: { icon: '🌿', name: '기본 정원', description: '시간 제한 없이 빈칸을 오래 지켜요.' },
  timed: { icon: '⏱️', name: '시간 정원', description: '90초 동안 빠르게 높은 점수를 만들어요.' },
  stone: { icon: '▰', name: '돌밭 정원', description: '두 줄을 피울 때마다 영구 돌이 하나 생겨요.' },
  items: { icon: '🎁', name: '아이템 정원', description: '아이템을 모아 폭파·회전·리롤을 사용해요.' }
};

const ITEM_INFO: Record<GardenItem, { icon: string; name: string }> = {
  bomb: { icon: '💥', name: '2×2 폭탄' },
  rotate: { icon: '↻', name: '조각 회전' },
  reroll: { icon: '🎲', name: '조각 바꾸기' },
  stone: { icon: '▰', name: '돌 함정' }
};

const localDateKey = (date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const dailySeed = (dateKey: string): number => {
  let hash = 2166136261;
  for (const character of dateKey) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return hash >>> 0 || 1;
};

function PiecePreview({ piece }: { piece: GardenPiece }) {
  const gardenShape = shapeForPiece(piece)!;
  const rows = Math.max(...gardenShape.cells.map((cell) => cell.row)) + 1;
  const columns = Math.max(...gardenShape.cells.map((cell) => cell.column)) + 1;
  const occupied = new Set(gardenShape.cells.map((cell) => `${cell.row}-${cell.column}`));
  const style: GardenCss = { '--piece-columns': columns, '--piece-rows': rows };
  return (
    <span className={`garden-piece-preview tone-${piece.tone}`} style={style} aria-hidden="true">
      {Array.from({ length: rows * columns }, (_, index) => {
        const row = Math.floor(index / columns);
        const column = index % columns;
        return <i key={index} className={occupied.has(`${row}-${column}`) ? 'is-filled' : ''} />;
      })}
    </span>
  );
}

const scoreMessage = (cleared: number, combo: number, gain: number): string => {
  if (cleared >= 2) return `${cleared}줄을 한꺼번에 피웠어요! +${gain}점`;
  if (cleared === 1 && combo >= 2) return `${combo}번 연속으로 정원을 비웠어요! +${gain}점`;
  if (cleared === 1) return `한 줄이 활짝 피었어요! +${gain}점`;
  return `좋은 자리예요. +${gain}점`;
};

export default function BlockGardenMode({ onExit, soundEnabled, animationsEnabled }: BlockGardenModeProps) {
  const growth = useGrowth();
  const random = useRef(new CryptoRandom());
  const initialProgress = useRef(loadGardenProgress()).current;
  const [game, setGame] = useState<GardenGame | null>(null);
  const [records, setRecords] = useState(loadGardenRecords);
  const [hasProgress, setHasProgress] = useState(Boolean(initialProgress));
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [draggingSlot, setDraggingSlot] = useState<number | null>(null);
  const [previewAnchor, setPreviewAnchor] = useState<number | null>(null);
  const [notice, setNotice] = useState('아래 조각 하나를 고른 뒤 빈칸을 눌러 보세요.');
  const [noticeTone, setNoticeTone] = useState<NoticeTone>('neutral');
  const [newBest, setNewBest] = useState(false);
  const [growthAward, setGrowthAward] = useState<GrowthAward | null>(null);
  const [storageWarning, setStorageWarning] = useState(false);
  const [placementFeedback, setPlacementFeedback] = useState<PlacementFeedback | null>(null);
  const [showGuide, setShowGuide] = useState(true);
  const [pendingStartMode, setPendingStartMode] = useState<GardenMode | null>(null);
  const [activeTool, setActiveTool] = useState<GardenTool | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(TIMED_GARDEN_SECONDS);
  const drag = useRef<{ slot: number; pointerId: number; pointerType: string } | null>(null);
  const gameRef = useRef<GardenGame | null>(null);
  const feedbackId = useRef(0);
  const feedbackTimer = useRef<number | null>(null);
  gameRef.current = game;

  useEffect(() => () => {
    if (feedbackTimer.current !== null) window.clearTimeout(feedbackTimer.current);
  }, []);

  const showPlacementFeedback = (cells: number[], cleared: number, gain: number) => {
    if (feedbackTimer.current !== null) window.clearTimeout(feedbackTimer.current);
    const id = feedbackId.current + 1;
    feedbackId.current = id;
    setPlacementFeedback({ id, cells, cleared, gain });
    feedbackTimer.current = window.setTimeout(() => setPlacementFeedback(null), cleared ? 1100 : 780);
  };

  const moveToGameStart = () => {
    window.requestAnimationFrame(() => window.scrollTo(0, 0));
  };

  const startNewGame = (mode: GardenMode = 'classic') => {
    const dateKey = localDateKey();
    const gameRandom = mode === 'daily' ? new SeededRandom(dailySeed(dateKey)) : random.current;
    const next = createGardenGame(gameRandom, new Date(), {
      mode,
      dailyDate: mode === 'daily' ? dateKey : undefined,
      dailyTargetLines: mode === 'daily' ? 12 : undefined
    });
    if (mode === 'daily' && gameRandom instanceof SeededRandom) next.randomState = gameRandom.getState();
    setGame(next);
    setSelectedSlot(null);
    setDraggingSlot(null);
    setPreviewAnchor(null);
    setPlacementFeedback(null);
    setActiveTool(null);
    setTimeRemaining(mode === 'timed' ? TIMED_GARDEN_SECONDS : 0);
    setNotice(mode === 'daily'
      ? '오늘의 목표는 12줄이에요. 아래 조각 하나를 고르고 빈칸을 눌러 보세요.'
      : mode === 'timed'
        ? '90초가 시작됐어요! 빠르게 줄을 피워 높은 점수를 만들어 보세요.'
        : mode === 'stone'
          ? '두 줄마다 돌이 생겨요. 돌 주변의 빈칸을 잘 지켜 보세요.'
          : mode === 'items'
            ? '아이콘이 든 칸을 줄로 지우면 아이템을 얻어요.'
            : '아래 조각 하나를 고르고, 판의 빈칸을 눌러 보세요.');
    setNoticeTone('neutral');
    setNewBest(false);
    setHasProgress(true);
    setShowGuide(true);
    setPendingStartMode(null);
    if (!saveGardenProgress(next)) setStorageWarning(true);
    moveToGameStart();
  };

  const requestNewGame = (mode: GardenMode) => {
    if (hasProgress) {
      setPendingStartMode(mode);
      return;
    }
    startNewGame(mode);
  };

  const finishGame = (finished: GardenGame) => {
    const mode = finished.mode ?? 'classic';
    const previousModeBest = records.modeHighScores?.[mode] ?? (mode === 'classic' ? records.highScore : 0);
    const isNewBest = finished.score > previousModeBest;
    const nextRecords = recordFinishedGardenGame(records, finished);
    const growthResult = growth.awardCompletion('block-garden');
    setGrowthAward(growthResult.award);
    if (!saveGardenRecords(nextRecords) || !growthResult.saved || !clearGardenProgress()) setStorageWarning(true);
    setRecords(nextRecords);
    setHasProgress(false);
    setNewBest(isNewBest);
    setGame(finished);
  };

  useEffect(() => {
    if (game?.mode !== 'timed' || game.status !== 'playing' || !game.timedEndsAt) return;
    const tick = () => {
      const current = gameRef.current;
      if (!current || current.mode !== 'timed' || current.status !== 'playing' || !current.timedEndsAt) return;
      const remaining = Math.max(0, Math.ceil((Date.parse(current.timedEndsAt) - Date.now()) / 1000));
      setTimeRemaining(remaining);
      if (remaining === 0) finishGame({ ...current, status: 'game-over', updatedAt: new Date().toISOString() });
    };
    tick();
    const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
  }, [game?.mode, game?.status, game?.timedEndsAt]);

  const resumeGame = () => {
    const saved = loadGardenProgress();
    if (!saved) {
      setHasProgress(false);
      startNewGame();
      return;
    }
    const savedRandom = saved.mode === 'daily'
      ? new SeededRandom(saved.randomState ?? dailySeed(saved.dailyDate ?? localDateKey()))
      : random.current;
    const hydrated = saved.nextPiece ? saved : {
      ...saved,
      nextPiece: createGardenPreview(saved.board, savedRandom),
      ...(saved.mode === 'daily' && savedRandom instanceof SeededRandom ? { randomState: savedRandom.getState() } : {})
    };
    if (hydrated.mode === 'timed' && hydrated.timedEndsAt && Date.parse(hydrated.timedEndsAt) <= Date.now()) {
      finishGame({ ...hydrated, status: 'game-over', updatedAt: new Date().toISOString() });
      return;
    }
    if (!gardenGameCanContinue(hydrated)) {
      finishGame({ ...hydrated, status: 'game-over' });
      return;
    }
    setGame(hydrated);
    setSelectedSlot(null);
    setActiveTool(null);
    if (hydrated.mode === 'timed' && hydrated.timedEndsAt) {
      setTimeRemaining(Math.max(0, Math.ceil((Date.parse(hydrated.timedEndsAt) - Date.now()) / 1000)));
    }
    setNotice(hydrated.mode === 'daily' ? `오늘의 정원 진행 중 · ${hydrated.dailyTargetLines ?? 12}줄을 피워 보세요.` : '이어서 정원의 빈칸을 넓혀 보세요.');
    setNoticeTone('neutral');
    setShowGuide(hydrated.turns < 1);
    moveToGameStart();
  };

  const placeAt = (cellIndex: number, forcedSlot?: number) => {
    if (!game || game.status !== 'playing') return;
    const slot = forcedSlot ?? selectedSlot;
    if (slot === null) {
      setNotice('먼저 아래 조각 하나를 골라 주세요.');
      setNoticeTone('neutral');
      return;
    }
    const row = Math.floor(cellIndex / BOARD_SIZE);
    const column = cellIndex % BOARD_SIZE;
    const gameRandom = game.mode === 'daily'
      ? new SeededRandom(game.randomState ?? dailySeed(game.dailyDate ?? localDateKey()))
      : random.current;
    const rawResult = placeGardenPiece(game, slot, row, column, gameRandom);
    const result = game.mode === 'daily' && gameRandom instanceof SeededRandom
      ? { ...rawResult, game: { ...rawResult.game, randomState: gameRandom.getState() } }
      : rawResult;
    if (!result.placed) {
      setNotice('그 자리에는 놓을 수 없어요. 조각이 모두 들어가는 다른 빈칸을 찾아보세요.');
      setNoticeTone('error');
      return;
    }
    setSelectedSlot(null);
    setActiveTool(null);
    setPreviewAnchor(null);
    const placedPiece = game.tray[slot];
    const placedShape = placedPiece && shapeForPiece(placedPiece);
    if (placedShape) {
      showPlacementFeedback(
        shapeCellsAt(placedShape, row, column).map((cell) => boardIndex(cell.row, cell.column)),
        result.clearedNow,
        result.game.lastGain
      );
    }
    const collected = result.collectedItems ?? [];
    const rewards = collected.filter((item) => item !== 'stone').map((item) => ITEM_INFO[item].name);
    const trapCount = collected.filter((item) => item === 'stone').length;
    const extra = [
      rewards.length ? `${rewards.join(' · ')} 획득!` : '',
      (result.stonesAdded ?? 0) > 0 ? `${trapCount ? '돌 함정 발동! ' : ''}회색 돌 ${(result.stonesAdded ?? 0)}개가 생겼어요.` : ''
    ].filter(Boolean).join(' ');
    setNotice(`${scoreMessage(result.clearedNow, result.game.combo, result.game.lastGain)}${extra ? ` ${extra}` : ''}`);
    setNoticeTone(result.clearedNow ? 'success' : 'neutral');
    setShowGuide(false);
    if (result.game.mode === 'daily' && !result.game.dailyCompleted
      && (result.game.dailyTargetLines ?? 12) <= result.game.clearedLines) {
      result.game.dailyCompleted = true;
      result.game.status = 'game-over';
      setNotice(`오늘의 정원을 완성했어요! ${result.game.clearedLines}줄을 피웠어요.`);
      setNoticeTone('success');
    }
    if (result.clearedNow && soundEnabled) {
      void unlockAudio().then(() => playGardenClearSound(result.clearedNow, result.game.combo));
    }
    if (result.clearedNow && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(result.clearedNow >= 2 ? [28, 18, 42] : result.game.combo >= 2 ? 28 : 16);
    }
    if (result.game.status === 'game-over') finishGame(result.game);
    else {
      setGame(result.game);
      setHasProgress(true);
      if (!saveGardenProgress(result.game)) setStorageWarning(true);
    }
  };

  const useBombAt = (cellIndex: number) => {
    if (!game || activeTool !== 'bomb') return;
    const next = useGardenBomb(game, Math.floor(cellIndex / BOARD_SIZE), cellIndex % BOARD_SIZE);
    if (!next) {
      setNotice('폭탄은 색깔 블록이 있는 2×2 자리에 사용할 수 있어요.');
      setNoticeTone('error');
      return;
    }
    setGame(next);
    setActiveTool(null);
    setPreviewAnchor(null);
    setNotice('2×2 폭탄으로 블록을 치웠어요! 회색 돌은 그대로 남아요.');
    setNoticeTone('success');
    if (next.status === 'game-over') finishGame(next);
    else if (!saveGardenProgress(next)) setStorageWarning(true);
  };

  const usePieceTool = (tool: 'rotate' | 'reroll') => {
    if (!game || selectedSlot === null) {
      setNotice(`${ITEM_INFO[tool].name}을 쓸 조각을 먼저 골라 주세요.`);
      setNoticeTone('neutral');
      return;
    }
    const gameRandom = game.mode === 'daily'
      ? new SeededRandom(game.randomState ?? dailySeed(game.dailyDate ?? localDateKey()))
      : random.current;
    const next = tool === 'rotate'
      ? rotateGardenPiece(game, selectedSlot)
      : rerollGardenPiece(game, selectedSlot, gameRandom);
    if (!next) {
      setNotice(tool === 'rotate' ? '이 조각은 돌려도 같은 모양이에요. 다른 조각을 골라 보세요.' : '지금은 이 조각을 바꿀 수 없어요.');
      setNoticeTone('error');
      return;
    }
    setGame(next);
    setPreviewAnchor(null);
    setNotice(tool === 'rotate' ? '조각을 90도 돌렸어요. 새 자리를 찾아보세요.' : '조각을 새 모양으로 바꿨어요.');
    setNoticeTone('success');
    if (!saveGardenProgress(next)) setStorageWarning(true);
  };

  const cellAtPointer = (clientX: number, clientY: number, pointerType: string): number | null => {
    const offsetY = pointerType === 'touch' ? 54 : 0;
    const target = document.elementFromPoint(clientX, clientY - offsetY)?.closest<HTMLElement>('[data-garden-cell]');
    const value = target?.dataset.gardenCell;
    return value === undefined ? null : Number(value);
  };

  const beginDrag = (event: ReactPointerEvent<HTMLElement>, slot: number) => {
    const piece = game?.tray[slot];
    if (!piece || !pieceFits(game.board, piece)) return;
    event.preventDefault();
    drag.current = { slot, pointerId: event.pointerId, pointerType: event.pointerType };
    setDraggingSlot(slot);
  };

  const moveDrag = (event: ReactPointerEvent<HTMLElement>) => {
    if (!drag.current || drag.current.pointerId !== event.pointerId) return;
    setPreviewAnchor(cellAtPointer(event.clientX, event.clientY, drag.current.pointerType));
  };

  const endDrag = (event: ReactPointerEvent<HTMLElement>) => {
    if (!drag.current || drag.current.pointerId !== event.pointerId) return;
    const current = drag.current;
    const target = cellAtPointer(event.clientX, event.clientY, current.pointerType);
    drag.current = null;
    setDraggingSlot(null);
    setPreviewAnchor(null);
    if (target !== null) placeAt(target, current.slot);
  };

  const cancelDrag = () => {
    drag.current = null;
    setDraggingSlot(null);
    setPreviewAnchor(null);
  };

  const selectPiece = (slot: number) => {
    const piece = game?.tray[slot];
    if (!piece) return;
    const nextSlot = selectedSlot === slot ? null : slot;
    setSelectedSlot(nextSlot);
    setActiveTool(null);
    setPreviewAnchor(null);
    setNoticeTone('neutral');
    if (nextSlot === null) {
      setNotice('조각을 다시 골라도 좋아요. 아래 조각 하나를 눌러 주세요.');
      return;
    }
    setNotice(`${shapeForPiece(piece)?.label ?? '조각'}을 골랐어요. 판의 빈칸을 눌러 놓아 보세요.`);
  };

  const activeSlot = draggingSlot ?? selectedSlot;
  const activePiece = game && activeSlot !== null ? game.tray[activeSlot] : null;
  const activeShape = activePiece ? shapeForPiece(activePiece) : undefined;
  const previewValid = Boolean(game && activeShape && previewAnchor !== null
    && canPlaceShape(game.board, activeShape, Math.floor(previewAnchor / BOARD_SIZE), previewAnchor % BOARD_SIZE));
  const previewCells = useMemo(() => {
    if (!activeShape || previewAnchor === null) return new Set<number>();
    const row = Math.floor(previewAnchor / BOARD_SIZE);
    const column = previewAnchor % BOARD_SIZE;
    return new Set(shapeCellsAt(activeShape, row, column)
      .filter((cell) => cell.row >= 0 && cell.row < BOARD_SIZE && cell.column >= 0 && cell.column < BOARD_SIZE)
      .map((cell) => boardIndex(cell.row, cell.column)));
  }, [activeShape, previewAnchor]);
  const bombPreviewCells = useMemo(() => {
    if (activeTool !== 'bomb' || previewAnchor === null) return new Set<number>();
    const row = Math.min(BOARD_SIZE - 2, Math.floor(previewAnchor / BOARD_SIZE));
    const column = Math.min(BOARD_SIZE - 2, previewAnchor % BOARD_SIZE);
    return new Set([
      boardIndex(row, column), boardIndex(row, column + 1),
      boardIndex(row + 1, column), boardIndex(row + 1, column + 1)
    ]);
  }, [activeTool, previewAnchor]);

  if (!game) {
    const today = localDateKey();
    const dailyDone = records.dailyCompletedDates?.includes(today) ?? false;
    return (
      <main className="screen block-garden-screen garden-home-screen">
        <header className="game-topbar"><button className="back-button" onClick={onExit} aria-label="홈으로 돌아가기">‹</button><strong>빈칸 정원</strong><span aria-hidden="true" /></header>
        <section className="garden-hero">
          <div><p className="eyebrow">천천히 생각하는 공간 퍼즐</p><h1>빈칸을 남겨<br />정원을 피워요</h1><p>세 조각을 미리 보고, 다음 조각이 들어갈 자리까지 생각해 보세요.</p></div>
          <span className="garden-hero-icon"><BlockGardenIcon /></span>
        </section>
        <section className="garden-rule-grid" aria-label="놀이 방법">
          <article><span>1</span><strong>세 조각 살피기</strong><p>순서를 바꿔 놓을 수 있어요.</p></article>
          <article><span>2</span><strong>가로·세로 피우기</strong><p>한 줄을 채우면 빈칸으로 돌아와요.</p></article>
          <article><span>3</span><strong>큰 빈칸 지키기</strong><p>놓을 곳이 없으면 한 판이 끝나요.</p></article>
        </section>
        <section className="garden-record-card" aria-label="빈칸 정원 기록">
          <div><small>최고 점수</small><strong>{records.highScore.toLocaleString()}</strong></div>
          <div><small>가장 많이 피운 줄</small><strong>{records.bestLines}줄</strong></div>
          <div><small>완료한 놀이</small><strong>{records.gamesPlayed}판</strong></div>
        </section>
        <section className="garden-goal-card" aria-label="이번 주 정원 목표">
          <div>
            <small>이번 주 목표 · 40줄</small>
            <strong>{Math.min(40, records.weeklyLines ?? 0)}<em>/40</em></strong>
          </div>
          <div>
            <small>오늘의 정원</small>
            <strong>{dailyDone ? '완료' : '도전 가능'}</strong>
          </div>
        </section>
        {storageWarning && <p className="garden-storage-warning" role="status">이 기기에서는 기록을 저장할 수 없어요. 지금 놀이는 계속할 수 있어요.</p>}
        <div className="garden-home-actions">
          {hasProgress && <button className="primary-button" onClick={resumeGame}>이어 하던 정원 열기</button>}
          <section className="garden-mode-picker" aria-labelledby="garden-mode-title">
            <div className="garden-mode-heading"><small>놀이 모드</small><strong id="garden-mode-title">어떤 정원을 가꿀까요?</strong></div>
            <div className="garden-mode-grid">
              {(Object.entries(MODE_INFO) as Array<[Exclude<GardenMode, 'daily'>, typeof MODE_INFO[Exclude<GardenMode, 'daily'>]]>).map(([mode, info]) => (
                <button key={mode} type="button" onClick={() => requestNewGame(mode)}>
                  <span aria-hidden="true">{info.icon}</span><strong>{info.name}</strong><small>{info.description}</small>
                </button>
              ))}
            </div>
          </section>
          <button className="garden-daily-button" onClick={() => requestNewGame('daily')} disabled={dailyDone}>
            {dailyDone ? '오늘의 정원 완료' : '오늘의 정원 도전 · 12줄'}
          </button>
        </div>
        {pendingStartMode && <div className="modal-backdrop" role="presentation">
          <section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="garden-new-game-title">
            <span className="dialog-icon" aria-hidden="true">🌱</span>
            <h2 id="garden-new-game-title">새 정원을 시작할까요?</h2>
            <p>이어 하던 정원은 사라져요. 지금 정원을 계속 가꿀 수도 있어요.</p>
            <button className="primary-button" onClick={() => setPendingStartMode(null)}>아니요, 이어서 할래요</button>
            <button className="secondary-button" onClick={() => startNewGame(pendingStartMode)}>
              {pendingStartMode === 'daily' ? '오늘의 정원 시작하기' : `${MODE_INFO[pendingStartMode].name} 시작하기`}
            </button>
          </section>
        </div>}
      </main>
    );
  }

  if (game.status === 'game-over') {
    const mode = game.mode ?? 'classic';
    const savedModeBest = records.modeHighScores?.[mode] ?? (mode === 'classic' ? records.highScore : 0);
    const modeBest = Math.max(savedModeBest, game.score);
    const nextGoal = modeBest + 100;
    const isDaily = game.mode === 'daily';
    const isTimed = game.mode === 'timed';
    return (
      <main className="screen block-garden-screen garden-result-screen">
        {growthAward && <GrowthCelebration award={growthAward} animationsEnabled={animationsEnabled} />}
        <span className="garden-result-icon" aria-hidden="true">{newBest ? '🌟' : '🌿'}</span>
        <p className="eyebrow">{isDaily ? '오늘의 정원' : MODE_INFO[mode as Exclude<GardenMode, 'daily'>]?.name ?? '빈칸 정원'}</p>
        <h1>{isDaily && game.dailyCompleted ? '오늘의 정원 완성!' : isTimed ? '90초 끝!' : newBest ? '새 최고 기록!' : '정원이 가득 찼어요'}</h1>
        <p>{isDaily && game.dailyCompleted
          ? '오늘의 씨앗을 모두 피웠어요. 내일 새로운 정원에서 만나요.'
          : isTimed
            ? '짧은 시간 동안 멋지게 가꿨어요. 조각 순서를 바꾸면 다음 점수를 더 높일 수 있어요.'
            : game.mode === 'stone'
              ? '돌은 사라지지 않지만 줄을 채우는 데 도움이 돼요. 다음에는 돌을 줄의 일부로 이용해 보세요.'
              : game.mode === 'items'
                ? '아이템을 조금 더 일찍 쓰면 막힌 공간을 되살릴 수 있어요.'
                : '빈칸을 지키는 선택을 바꿔 보면 다음 판은 더 오래 이어질 거예요.'}</p>
        {growthAward && <GrowthRewardCard award={growthAward} />}
        <section className="garden-result-stats" aria-label="이번 놀이 결과">
          <div><small>점수</small><strong>{game.score.toLocaleString()}</strong></div>
          <div><small>피운 줄</small><strong>{game.clearedLines}</strong></div>
          <div><small>놓은 조각</small><strong>{game.turns}</strong></div>
        </section>
        <p className="garden-result-achievements">
          최고 콤보 {records.bestCombo ?? 0} · 한 번에 최대 {records.maxLinesInMove ?? 0}줄 · 이번 주 {Math.min(40, records.weeklyLines ?? 0)}/40줄
        </p>
        <p className="garden-result-goal" aria-label={`이 모드 최고 기록 ${modeBest.toLocaleString()}점, 다음 목표 ${nextGoal.toLocaleString()}점`}>
          이 모드 최고 {modeBest.toLocaleString()}점 · 다음 목표 {nextGoal.toLocaleString()}점
        </p>
        {storageWarning && <p className="garden-storage-warning" role="status">이번 기록을 기기에 저장하지 못했어요.</p>}
        <button className="primary-button" onClick={() => startNewGame(game.mode ?? 'classic')}>바로 다시 하기</button>
        <button className="secondary-button" onClick={() => setGame(null)}>기록과 방법 보기</button>
        <button className="text-button" onClick={onExit}>NumberCal 홈으로</button>
      </main>
    );
  }

  const danger = occupiedPercent(game.board);
  const placementCells = placementFeedback?.cells ?? [];
  const currentMode = game.mode ?? 'classic';
  const currentModeBest = records.modeHighScores?.[currentMode] ?? (currentMode === 'classic' ? records.highScore : 0);
  return (
    <main
      className={`screen block-garden-screen garden-play-screen ${animationsEnabled ? '' : 'no-garden-motion'}`}
      onPointerMove={moveDrag}
      onPointerUp={endDrag}
      onPointerCancel={cancelDrag}
    >
      <header className="garden-play-header">
        <button className="back-button" onClick={onExit} aria-label="저장하고 홈으로 돌아가기">‹</button>
        <div className={`garden-score-card ${placementFeedback ? 'is-score-burst' : ''}`} aria-live="polite">
          <small>{game.mode === 'daily' ? '오늘의 점수' : '현재 점수'}</small><strong>{game.score.toLocaleString()}</strong>
          {placementFeedback && <em key={placementFeedback.id} aria-hidden="true">+{placementFeedback.gain}</em>}
        </div>
        <div className="garden-score-card is-best"><small>이 모드 최고</small><strong>{Math.max(currentModeBest, game.score).toLocaleString()}</strong></div>
      </header>
      {game.mode === 'timed' && <section className={`garden-timer ${timeRemaining <= 15 ? 'is-low' : ''}`} aria-label={`남은 시간 ${timeRemaining}초`}>
        <strong>⏱️ {timeRemaining}초</strong>
        <span><i style={{ width: `${Math.max(0, Math.min(100, timeRemaining / (game.timeLimitSeconds ?? TIMED_GARDEN_SECONDS) * 100))}%` }} /></span>
        <small>시간 안에 줄을 많이 피워요!</small>
      </section>}
      <section className="garden-status-row" aria-label="놀이 상태">
        <span>피운 줄 <b>{game.clearedLines}</b></span>
        <span className={game.combo >= 2 ? 'is-combo' : ''}>연속 피우기 <b>{game.combo}</b></span>
        <span>빈칸 <b>{game.board.length - game.board.filter(Boolean).length}</b></span>
      </section>
      {game.mode === 'daily' && <div className="garden-daily-progress" aria-label={`오늘의 목표 ${game.dailyTargetLines ?? 12}줄 중 ${game.clearedLines}줄`}>
        <span><b>오늘의 정원</b> · {Math.min(game.clearedLines, game.dailyTargetLines ?? 12)} / {game.dailyTargetLines ?? 12}줄</span>
        <span className="garden-daily-progress-bar"><i style={{ width: `${Math.min(100, game.clearedLines / (game.dailyTargetLines ?? 12) * 100)}%` }} /></span>
      </div>}
      {game.mode === 'stone' && <div className="garden-stone-progress" aria-label={`다음 회색 돌까지 ${2 - game.clearedLines % 2}줄`}>
        <span>▰ 다음 돌까지 <b>{2 - game.clearedLines % 2}줄</b></span>
        <small>회색 돌은 줄을 채우지만 지워지지 않아요.</small>
      </div>}
      {game.combo >= 2 && <p className="garden-combo-help" role="status">연속 피우기 {game.combo}회 · 다음 줄 제거에 보너스가 붙어요</p>}
      <div className="garden-danger" role="progressbar" aria-label="정원이 찬 정도" aria-valuenow={danger} aria-valuemin={0} aria-valuemax={100}>
        <span style={{ width: `${danger}%` }} /><small>{danger < 50 ? '빈칸이 넉넉해요' : danger < 75 ? '큰 자리를 지켜 주세요' : '줄을 피워 빈칸을 되찾아요'}</small>
      </div>
      {game.mode === 'items' && <section className="garden-toolbox" aria-label="모은 정원 아이템">
        <button type="button" className={activeTool === 'bomb' ? 'is-active' : ''} aria-pressed={activeTool === 'bomb'} disabled={!game.inventory?.bomb}
          onClick={() => {
            setSelectedSlot(null);
            setActiveTool((current) => current === 'bomb' ? null : 'bomb');
            setNotice('폭탄을 놓을 2×2 자리를 판에서 눌러 주세요. 회색 돌은 부서지지 않아요.');
            setNoticeTone('neutral');
          }}><span>💥</span><strong>폭탄</strong><small>×{game.inventory?.bomb ?? 0}</small></button>
        <button type="button" disabled={!game.inventory?.rotate} onClick={() => usePieceTool('rotate')}><span>↻</span><strong>회전</strong><small>×{game.inventory?.rotate ?? 0}</small></button>
        <button type="button" disabled={!game.inventory?.reroll} onClick={() => usePieceTool('reroll')}><span>🎲</span><strong>리롤</strong><small>×{game.inventory?.reroll ?? 0}</small></button>
      </section>}
      <section
        className={`garden-board ${draggingSlot !== null ? 'is-drag-target' : ''} ${activeTool === 'bomb' ? 'is-bomb-target' : ''} ${placementFeedback?.cleared ? 'is-celebrating' : ''}`}
        role="grid"
        aria-label="8 곱하기 8 빈칸 정원 판"
        onPointerLeave={() => { if (draggingSlot === null) setPreviewAnchor(null); }}
      >
        {game.board.map((cell, index) => {
          const row = Math.floor(index / BOARD_SIZE);
          const column = index % BOARD_SIZE;
          const preview = previewCells.has(index);
          const bombPreview = bombPreviewCells.has(index);
          const justPlaced = placementCells.includes(index);
          const item = game.itemBoard?.[index] ?? null;
          const cellDescription = cell === 'stone' ? '회색 돌, 놓을 수 없는 칸' : cell ? '채워진 칸' : '빈칸';
          return (
            <button
              key={index}
              type="button"
              role="gridcell"
              data-garden-cell={index}
              className={`${cell ? `is-planted tone-${cell}` : ''} ${game.lastCleared.includes(index) ? 'was-cleared' : ''} ${justPlaced ? 'is-last-placed' : ''} ${preview ? previewValid ? `is-preview tone-${activePiece?.tone}` : 'is-preview-invalid' : ''} ${bombPreview ? 'is-bomb-preview' : ''}`}
              aria-label={`${row + 1}행 ${column + 1}열, ${cellDescription}${item ? `, ${ITEM_INFO[item].name} 있음` : ''}`}
              onClick={() => activeTool === 'bomb' ? useBombAt(index) : placeAt(index)}
              onFocus={() => { if (selectedSlot !== null || activeTool === 'bomb') setPreviewAnchor(index); }}
              onPointerEnter={() => { if ((selectedSlot !== null || activeTool === 'bomb') && draggingSlot === null) setPreviewAnchor(index); }}
            >
              {cell && <span aria-hidden="true">{cell === 'stone' ? '▰' : cell === 'leaf' ? '◆' : cell === 'sun' ? '●' : cell === 'berry' ? '✦' : cell === 'water' ? '■' : '▲'}</span>}
              {item && <em className="garden-cell-item" aria-hidden="true">{ITEM_INFO[item].icon}</em>}
            </button>
          );
        })}
      </section>
      <p className={`garden-notice is-${noticeTone}`} aria-live="polite">{notice}</p>
      {storageWarning && <p className="garden-storage-warning" role="status">진행을 저장하지 못했어요. 현재 판은 계속할 수 있어요.</p>}
      <section className="garden-tray" aria-label="놓을 조각 세 개">
        {game.tray.map((piece, index) => {
          const fits = piece ? pieceFits(game.board, piece) : false;
          const gardenShape = piece ? shapeForPiece(piece) : undefined;
          const canUsePieceTool = Boolean(piece && game.mode === 'items' && (
            (game.inventory?.rotate && pieceCanRotate(piece)) || game.inventory?.reroll
          ));
          return piece ? (
            <button
              key={piece.uid}
              type="button"
              className={`${selectedSlot === index ? 'is-selected' : ''} ${draggingSlot === index ? 'is-dragging' : ''} ${fits ? '' : 'cannot-fit'}`}
              aria-label={`${gardenShape?.label ?? '정원 조각'}${fits ? '' : ', 놓을 자리 없음'}`}
              aria-pressed={selectedSlot === index}
              disabled={!fits && !canUsePieceTool}
              onClick={() => selectPiece(index)}
              onPointerDown={(event) => beginDrag(event, index)}
            >
              <PiecePreview piece={piece} />
              <small>{fits ? gardenShape?.label : '놓을 자리 없음'}</small>
            </button>
          ) : <div key={`empty-${index}`} className="is-used" aria-label="놓은 조각"><span>✓</span><small>놓았어요</small></div>;
        })}
      </section>
      {game.nextPiece && <section className="garden-next-card" aria-label="다음에 나올 조각">
        <div><small>다음 새싹</small><strong>다음 묶음 첫 조각</strong></div>
        <PiecePreview piece={game.nextPiece} />
      </section>}
      {showGuide && <aside className="garden-coach-card" aria-label="첫 플레이 안내">
        <strong>빈칸을 지키며 줄을 피워 보세요</strong>
        <span>조각을 고른 뒤 보드의 빈칸을 누르거나, 그대로 끌어 놓으면 돼요.</span>
        <button type="button" onClick={() => setShowGuide(false)}>알겠어요</button>
      </aside>}
      <p className="garden-control-help">조각을 끌어 놓거나, 조각을 고른 뒤 판의 빈칸을 누르세요.</p>
    </main>
  );
}
