import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { CryptoRandom, SeededRandom } from '../services/randomService';
import { playGardenClearSound, unlockAudio } from '../services/soundService';
import { BlockGardenIcon } from '../visuals/BlockGardenIcon';
import {
  anyTrayPieceFits, boardIndex, canPlaceShape, createGardenGame, createGardenPreview, occupiedPercent, placeGardenPiece,
  pieceFits, shapeById, shapeCellsAt
} from './blockGardenRules';
import {
  clearGardenProgress, loadGardenProgress, loadGardenRecords, recordFinishedGardenGame,
  saveGardenProgress, saveGardenRecords
} from './blockGardenStorage';
import { BOARD_SIZE, type BlockGardenModeProps, type GardenGame, type GardenMode, type GardenPiece } from './types';
import './block-garden.css';

type GardenCss = CSSProperties & Record<'--piece-columns' | '--piece-rows', number>;

type PlacementFeedback = {
  id: number;
  cells: number[];
  cleared: number;
  gain: number;
};

type NoticeTone = 'neutral' | 'success' | 'error';

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
  const gardenShape = shapeById(piece.shapeId)!;
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
  const [storageWarning, setStorageWarning] = useState(false);
  const [placementFeedback, setPlacementFeedback] = useState<PlacementFeedback | null>(null);
  const [showGuide, setShowGuide] = useState(true);
  const drag = useRef<{ slot: number; pointerId: number; pointerType: string } | null>(null);
  const feedbackId = useRef(0);
  const feedbackTimer = useRef<number | null>(null);

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
    setNotice(mode === 'daily' ? '오늘의 목표는 12줄이에요. 세 조각을 살펴보고 시작해 보세요.' : '세 조각을 모두 살펴보고 첫 자리를 골라 보세요.');
    setNoticeTone('neutral');
    setNewBest(false);
    setHasProgress(true);
    setShowGuide(true);
    if (!saveGardenProgress(next)) setStorageWarning(true);
    moveToGameStart();
  };

  const finishGame = (finished: GardenGame) => {
    const isNewBest = finished.score > records.highScore;
    const nextRecords = recordFinishedGardenGame(records, finished);
    if (!saveGardenRecords(nextRecords) || !clearGardenProgress()) setStorageWarning(true);
    setRecords(nextRecords);
    setHasProgress(false);
    setNewBest(isNewBest);
    setGame(finished);
  };

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
    if (!anyTrayPieceFits(hydrated.board, hydrated.tray)) {
      finishGame({ ...hydrated, status: 'game-over' });
      return;
    }
    setGame(hydrated);
    setSelectedSlot(null);
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
      setNotice('그 자리에는 놓을 수 없어요. 밝게 보이는 빈칸을 찾아보세요.');
      setNoticeTone('error');
      return;
    }
    setSelectedSlot(null);
    setPreviewAnchor(null);
    const placedPiece = game.tray[slot];
    const placedShape = placedPiece && shapeById(placedPiece.shapeId);
    if (placedShape) {
      showPlacementFeedback(
        shapeCellsAt(placedShape, row, column).map((cell) => boardIndex(cell.row, cell.column)),
        result.clearedNow,
        result.game.lastGain
      );
    }
    setNotice(scoreMessage(result.clearedNow, result.game.combo, result.game.lastGain));
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

  const cellAtPointer = (clientX: number, clientY: number, pointerType: string): number | null => {
    const offsetY = pointerType === 'touch' ? 54 : 0;
    const target = document.elementFromPoint(clientX, clientY - offsetY)?.closest<HTMLElement>('[data-garden-cell]');
    const value = target?.dataset.gardenCell;
    return value === undefined ? null : Number(value);
  };

  const beginDrag = (event: ReactPointerEvent<HTMLElement>, slot: number) => {
    if (!game?.tray[slot]) return;
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

  const activeSlot = draggingSlot ?? selectedSlot;
  const activePiece = game && activeSlot !== null ? game.tray[activeSlot] : null;
  const activeShape = activePiece ? shapeById(activePiece.shapeId) : undefined;
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
          <button className={hasProgress ? 'secondary-button' : 'primary-button'} onClick={() => startNewGame()}>{hasProgress ? '새 판 시작하기' : '정원 시작하기'}</button>
          <button className="garden-daily-button" onClick={() => startNewGame('daily')} disabled={dailyDone}>
            {dailyDone ? '오늘의 정원 완료' : '오늘의 정원 도전 · 12줄'}
          </button>
        </div>
      </main>
    );
  }

  if (game.status === 'game-over') {
    const nextGoal = Math.max(records.highScore, game.score) + 100;
    const isDaily = game.mode === 'daily';
    return (
      <main className="screen block-garden-screen garden-result-screen">
        <span className="garden-result-icon" aria-hidden="true">{newBest ? '🌟' : '🌿'}</span>
        <p className="eyebrow">한 판을 끝까지 가꿨어요</p>
        <h1>{isDaily && game.dailyCompleted ? '오늘의 정원 완성!' : newBest ? '새 최고 기록!' : '정원이 가득 찼어요'}</h1>
        <p>{isDaily && game.dailyCompleted ? '오늘의 씨앗을 모두 피웠어요. 내일 새로운 정원에서 만나요.' : '빈칸을 지키는 선택을 바꿔 보면 다음 판은 더 오래 이어질 거예요.'}</p>
        <section className="garden-result-stats" aria-label="이번 놀이 결과">
          <div><small>점수</small><strong>{game.score.toLocaleString()}</strong></div>
          <div><small>피운 줄</small><strong>{game.clearedLines}</strong></div>
          <div><small>놓은 조각</small><strong>{game.turns}</strong></div>
        </section>
        <p className="garden-result-achievements">
          최고 콤보 {records.bestCombo ?? 0} · 한 번에 최대 {records.maxLinesInMove ?? 0}줄 · 이번 주 {Math.min(40, records.weeklyLines ?? 0)}/40줄
        </p>
        <p className="garden-result-goal" aria-label={`최고 기록 ${records.highScore.toLocaleString()}점, 다음 목표 ${nextGoal.toLocaleString()}점`}>
          최고 기록 {records.highScore.toLocaleString()}점 · 다음 목표 {nextGoal.toLocaleString()}점
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
        <div className="garden-score-card is-best"><small>최고</small><strong>{Math.max(records.highScore, game.score).toLocaleString()}</strong></div>
      </header>
      <section className="garden-status-row" aria-label="놀이 상태">
        <span>피운 줄 <b>{game.clearedLines}</b></span>
        <span className={game.combo >= 2 ? 'is-combo' : ''}>연속 피우기 <b>{game.combo}</b></span>
        <span>빈칸 <b>{game.board.length - game.board.filter(Boolean).length}</b></span>
      </section>
      {game.mode === 'daily' && <div className="garden-daily-progress" aria-label={`오늘의 목표 ${game.dailyTargetLines ?? 12}줄 중 ${game.clearedLines}줄`}>
        <span><b>오늘의 정원</b> · {Math.min(game.clearedLines, game.dailyTargetLines ?? 12)} / {game.dailyTargetLines ?? 12}줄</span>
        <span className="garden-daily-progress-bar"><i style={{ width: `${Math.min(100, game.clearedLines / (game.dailyTargetLines ?? 12) * 100)}%` }} /></span>
      </div>}
      {game.combo >= 2 && <p className="garden-combo-help" role="status">연속 피우기 {game.combo}회 · 다음 줄 제거에 보너스가 붙어요</p>}
      <div className="garden-danger" role="progressbar" aria-label="정원이 찬 정도" aria-valuenow={danger} aria-valuemin={0} aria-valuemax={100}>
        <span style={{ width: `${danger}%` }} /><small>{danger < 50 ? '빈칸이 넉넉해요' : danger < 75 ? '큰 자리를 지켜 주세요' : '줄을 피워 빈칸을 되찾아요'}</small>
      </div>
      <section
        className={`garden-board ${draggingSlot !== null ? 'is-drag-target' : ''} ${placementFeedback?.cleared ? 'is-celebrating' : ''}`}
        role="grid"
        aria-label="8 곱하기 8 빈칸 정원 판"
        onPointerLeave={() => { if (draggingSlot === null) setPreviewAnchor(null); }}
      >
        {game.board.map((cell, index) => {
          const row = Math.floor(index / BOARD_SIZE);
          const column = index % BOARD_SIZE;
          const preview = previewCells.has(index);
          const justPlaced = placementCells.includes(index);
          return (
            <button
              key={index}
              type="button"
              role="gridcell"
              data-garden-cell={index}
              className={`${cell ? `is-planted tone-${cell}` : ''} ${game.lastCleared.includes(index) ? 'was-cleared' : ''} ${justPlaced ? 'is-last-placed' : ''} ${preview ? previewValid ? `is-preview tone-${activePiece?.tone}` : 'is-preview-invalid' : ''}`}
              aria-label={`${row + 1}행 ${column + 1}열, ${cell ? '채워진 칸' : '빈칸'}`}
              onClick={() => placeAt(index)}
              onFocus={() => { if (selectedSlot !== null) setPreviewAnchor(index); }}
              onPointerEnter={() => { if (selectedSlot !== null && draggingSlot === null) setPreviewAnchor(index); }}
            >
              {cell && <span aria-hidden="true">{cell === 'leaf' ? '◆' : cell === 'sun' ? '●' : cell === 'berry' ? '✦' : cell === 'water' ? '■' : '▲'}</span>}
            </button>
          );
        })}
      </section>
      <p className={`garden-notice is-${noticeTone}`} aria-live="polite">{notice}</p>
      {storageWarning && <p className="garden-storage-warning" role="status">진행을 저장하지 못했어요. 현재 판은 계속할 수 있어요.</p>}
      <section className="garden-tray" aria-label="놓을 조각 세 개">
        {game.tray.map((piece, index) => {
          const fits = piece ? pieceFits(game.board, piece) : false;
          const gardenShape = piece ? shapeById(piece.shapeId) : undefined;
          return piece ? (
            <button
              key={piece.uid}
              type="button"
              className={`${selectedSlot === index ? 'is-selected' : ''} ${draggingSlot === index ? 'is-dragging' : ''} ${fits ? '' : 'cannot-fit'}`}
              aria-label={`${gardenShape?.label ?? '정원 조각'}${fits ? '' : ', 놓을 자리 없음'}`}
              aria-pressed={selectedSlot === index}
              disabled={!fits}
              onClick={() => setSelectedSlot((current) => current === index ? null : index)}
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
