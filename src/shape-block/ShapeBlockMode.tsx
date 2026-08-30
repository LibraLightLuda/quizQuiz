import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import { playInvalidSound, playLineClearSound, playSnapSound, playSuccessSound, unlockAudio } from '../services/soundService';
import { playHapticFeedback } from '../services/hapticService';
import { AchievementGrid } from '../visuals/AchievementGrid';
import { ShapeBlockIcon } from '../visuals/ShapeBlockIcon';
import { anyTrayBlockFits, createLineClearProgress, createTray, placeLineBlock, rotateBlock, validPlacements } from './lineClear';
import { getShapeBlockAchievements } from './shapeBlockAchievements';
import { dailyTangramPuzzle, shapeBlockDateKey } from './shapeBlockDaily';
import {
  clearLineProgress, clearTangramProgress, loadLineProgress, loadShapeBlockRecords, loadTangramProgress,
  saveLineCompletion, saveLineProgress, saveTangramCompletion, saveTangramProgress, updateShapeBlockRecords
} from './shapeBlockStorage';
import { TANGRAM_PIECES, TANGRAM_PUZZLES, tangramGuideLevel, tierDescription, tierLabel } from './tangramData';
import {
  createTangramProgress, normalizeRotation, placeTangramPiece, removeTangramPiece, tangramSolved, tangramStars
} from './tangramRules';
import type {
  LineBlock, LineClearProgress, ShapeBlockModeProps, ShapeBlockRecords, TangramPieceState, TangramProgress, TangramPuzzle, TangramTier
} from './types';
import './shape-block.css';

type Screen = 'home' | 'tutorial' | 'tangram-levels' | 'tangram-play' | 'line-play' | 'collection';
const classNames = (...values: Array<string | false | undefined>) => values.filter(Boolean).join(' ');

function TopBar({ title, onBack }: { title: string; onBack: () => void }) {
  return <header className="top-bar"><button className="icon-button" onClick={onBack} aria-label="뒤로 가기">←</button><strong>{title}</strong><span /></header>;
}

function PiecePicture({ piece, rotation = 0, flipped = false, muted = false }: { piece: typeof TANGRAM_PIECES[number]; rotation?: number; flipped?: boolean; muted?: boolean }) {
  const points = piece.points.map(({ x, y }) => `${x},${y}`).join(' ');
  return <svg className={muted ? 'is-placeholder' : ''} viewBox="-24 -24 148 148" aria-hidden="true"><g transform={`translate(50 50) rotate(${rotation}) scale(${flipped ? -1 : 1} 1) translate(-50 -50)`}><polygon points={points} fill={muted ? '#777282' : piece.color} /></g></svg>;
}

function Tutorial({ onBack, onComplete }: { onBack: () => void; onComplete: () => void }) {
  const [stage, setStage] = useState(0);
  const copy = [
    ['조각을 골라요', '아래 삼각형을 눌러 보세요.'],
    ['방향을 돌려요', '회전 버튼으로 조각 방향을 바꿔요.'],
    ['빈자리에 놓아요', '반짝이는 자리를 누르면 찰칵 맞아요.'],
    ['준비 끝!', '드래그하거나 차례대로 눌러서 모양을 완성해요.']
  ][stage];
  return (
    <main className="screen shape-block-screen shape-tutorial">
      <TopBar title="모양블록 연습" onBack={onBack} />
      <div className="shape-step-dots" aria-label={`연습 ${Math.min(stage + 1, 3)} / 3`}>{[0,1,2].map((value) => <span key={value} className={stage >= value ? 'active' : ''}>{stage > value ? '✓' : value + 1}</span>)}</div>
      <section className="shape-heading"><p className="eyebrow">손가락으로 찰칵!</p><h1>{copy[0]}</h1><p>{copy[1]}</p></section>
      <div className="shape-tutorial-demo">
        <div className={classNames('tutorial-target', stage >= 2 && 'is-ready', stage === 3 && 'is-filled')} aria-hidden="true">△</div>
        <div className={classNames('tutorial-piece', stage > 0 && 'is-selected', stage === 3 && 'is-done')}><PiecePicture piece={TANGRAM_PIECES[3]} rotation={stage >= 2 ? 90 : 0} /></div>
      </div>
      {stage === 0 && <button className="primary-button" onClick={() => setStage(1)}>작은 삼각형 고르기</button>}
      {stage === 1 && <button className="primary-button" onClick={() => setStage(2)}>↻ 조각 돌리기</button>}
      {stage === 2 && <button className="primary-button" onClick={() => setStage(3)}>반짝이는 자리에 놓기</button>}
      {stage === 3 && <button className="primary-button" onClick={onComplete}>모양블록 시작하기</button>}
    </main>
  );
}

const puzzleUnlocked = (puzzle: TangramPuzzle, records: ShapeBlockRecords): boolean => {
  const inTier = TANGRAM_PUZZLES.filter((item) => item.tier === puzzle.tier);
  const index = inTier.findIndex((item) => item.id === puzzle.id);
  if (puzzle.tier === 'growing' && Object.keys(records.tangramStars).filter((id) => id.startsWith('starter-')).length < 8) return false;
  if (puzzle.tier === 'clever' && Object.keys(records.tangramStars).filter((id) => id.startsWith('growing-')).length < 8) return false;
  return index === 0 || Boolean(records.tangramStars[inTier[index - 1].id]);
};

function TangramLevels({ records, saved, onBack, onStart }: {
  records: ShapeBlockRecords; saved: TangramProgress | null; onBack: () => void; onStart: (puzzle: TangramPuzzle, resume?: boolean) => void;
}) {
  const [tier, setTier] = useState<TangramTier>(() => saved ? TANGRAM_PUZZLES.find((p) => p.id === saved.puzzleId)?.tier ?? 'starter' : 'starter');
  const puzzles = TANGRAM_PUZZLES.filter((puzzle) => puzzle.tier === tier);
  return (
    <main className="screen shape-block-screen">
      <TopBar title="칠교 그림 완성" onBack={onBack} />
      <section className="shape-heading"><p className="eyebrow">30가지 모양</p><h1>어떤 그림을 맞출까요?</h1><p>시간 제한 없이 천천히 생각해요.</p></section>
      {saved && <button className="shape-resume-card" onClick={() => onStart(TANGRAM_PUZZLES.find((p) => p.id === saved.puzzleId)!, true)}><span>이어 하기</span><strong>{TANGRAM_PUZZLES.find((p) => p.id === saved.puzzleId)?.title}</strong><b>계속 ›</b></button>}
      <div className="shape-tier-tabs" role="tablist" aria-label="칠교 단계">
        {(['starter','growing','clever'] as TangramTier[]).map((value) => {
          const locked = value === 'growing' ? Object.keys(records.tangramStars).filter((id) => id.startsWith('starter-')).length < 8
            : value === 'clever' ? Object.keys(records.tangramStars).filter((id) => id.startsWith('growing-')).length < 8 : false;
          return <button key={value} role="tab" aria-selected={tier === value} disabled={locked} onClick={() => setTier(value)}>{locked ? '🔒 ' : ''}{tierLabel[value]}</button>;
        })}
      </div>
      <p className="shape-tier-help" role="status">{tierDescription[tier]}</p>
      <div className="tangram-puzzle-grid">
        {puzzles.map((puzzle, index) => {
          const unlocked = puzzleUnlocked(puzzle, records);
          const stars = records.tangramStars[puzzle.id] ?? 0;
          return <button key={puzzle.id} disabled={!unlocked} onClick={() => onStart(puzzle)} aria-label={`${index + 1}번 ${puzzle.title}${stars ? `, 별 ${stars}개` : ''}${unlocked ? '' : ', 잠김'}`}>
            <span aria-hidden="true">{unlocked ? puzzle.icon : '🔒'}</span><strong>{index + 1}. {puzzle.title}</strong><small>{stars ? '★'.repeat(stars) + '☆'.repeat(3 - stars) : unlocked ? '새 그림' : '앞 그림을 먼저 완성해요'}</small>
          </button>;
        })}
      </div>
    </main>
  );
}

function TangramPlay({ initial, puzzle, soundEnabled, hapticsEnabled, onBack, onSaved, onComplete }: {
  initial: TangramProgress; puzzle: TangramPuzzle; soundEnabled: boolean; hapticsEnabled: boolean; onBack: () => void;
  onSaved: (progress: TangramProgress) => void; onComplete: (stars: number) => void;
}) {
  const [progress, setProgress] = useState(initial);
  const [selected, setSelected] = useState<string | null>(() => initial.pieces.find((piece) => !piece.targetId)?.pieceId ?? null);
  const [message, setMessage] = useState('조각을 고르고 방향을 맞춘 뒤 빈자리에 놓아요.');
  const [dragging, setDragging] = useState<string | null>(null);
  const dragPiece = useRef<string | null>(null);
  const pieceBank = useRef<HTMLDivElement>(null);
  const completed = useRef(false);
  const pieceState = (id: string) => progress.pieces.find((piece) => piece.pieceId === id)!;

  useEffect(() => { onSaved(progress); }, [progress, onSaved]);
  useEffect(() => {
    pieceBank.current?.querySelector<HTMLElement>(`[data-piece-id="${selected}"]`)?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [selected]);
  useEffect(() => {
    if (!completed.current && tangramSolved(progress)) {
      completed.current = true;
      if (soundEnabled) void unlockAudio().then(playSuccessSound);
      playHapticFeedback('complete', hapticsEnabled);
      onComplete(tangramStars(progress.hintLevel));
    }
  }, [progress, soundEnabled, hapticsEnabled, onComplete]);

  const updatePiece = (pieceId: string, patch: Partial<TangramPieceState>) => setProgress((current) => ({
    ...current,
    pieces: current.pieces.map((piece) => piece.pieceId === pieceId ? { ...piece, ...patch, targetId: undefined } : piece),
    updatedAt: new Date().toISOString()
  }));

  const tryPlace = (pieceId: string, targetId: string) => {
    const next = placeTangramPiece(progress, puzzle, pieceId, targetId);
    if (!next) {
      if (soundEnabled) void unlockAudio().then(playInvalidSound);
      playHapticFeedback('invalid', hapticsEnabled);
      setMessage('모양이나 방향이 달라요. 조각을 돌려 다시 살펴볼까요?');
      return;
    }
    if (!tangramSolved(next)) {
      if (soundEnabled) void unlockAudio().then(playSnapSound);
      playHapticFeedback('snap', hapticsEnabled);
    }
    setMessage('찰칵! 빈자리에 꼭 맞았어요.');
    setSelected(next.pieces.find((piece) => !piece.targetId)?.pieceId ?? null);
    setProgress(next);
  };

  const pointerUp = (event: ReactPointerEvent<Element>) => {
    const pieceId = dragPiece.current;
    dragPiece.current = null;
    setDragging(null);
    if (!pieceId) return;
    const touchOffset = event.pointerType === 'touch' ? 48 : 0;
    const target = document.elementFromPoint(event.clientX, event.clientY - touchOffset)?.closest<HTMLElement>('[data-target-id]')
      ?? document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-target-id]');
    if (target?.dataset.targetId) tryPlace(pieceId, target.dataset.targetId);
    else {
      if (soundEnabled) void unlockAudio().then(playInvalidSound);
      playHapticFeedback('invalid', hapticsEnabled);
      setMessage('빈자리 위에 조각을 놓아 보세요.');
    }
  };

  const hint = () => {
    setProgress((current) => {
      const nextLevel = Math.min(4, current.hintLevel + 1) as TangramProgress['hintLevel'];
      const unresolved = current.pieces.find((piece) => !piece.targetId);
      if (!unresolved) return current;
      const definition = TANGRAM_PIECES.find((piece) => piece.id === unresolved.pieceId)!;
      const target = puzzle.targets.find((item) => item.kind === definition.kind && !current.pieces.some((piece) => piece.targetId === item.id));
      if (!target) return { ...current, hintLevel: nextLevel };
      if (nextLevel === 1) setMessage(`${definition.label} 조각을 살펴보세요.`);
      else if (nextLevel === 2) setMessage(`${target.rotation}도 방향으로 돌려 보세요.`);
      else if (nextLevel === 3) setMessage(`반짝이는 ${target.id.replace('target-', '')}번 자리에 놓아 보세요.`);
      else {
        setMessage('조각 하나를 놓았어요. 나머지는 직접 맞춰 볼까요?');
        return placeTangramPiece({ ...current, hintLevel: nextLevel, pieces: current.pieces.map((piece) => piece.pieceId === unresolved.pieceId ? { ...piece, rotation: target.rotation, flipped: target.flipped } : piece) }, puzzle, unresolved.pieceId, target.id)!;
      }
      return { ...current, hintLevel: nextLevel, updatedAt: new Date().toISOString() };
    });
  };

  return (
    <main className="screen shape-block-screen tangram-play-screen">
      <TopBar title={puzzle.title} onBack={onBack} />
      <div className="shape-play-summary"><span>{tierLabel[puzzle.tier]}</span><strong>{puzzle.icon} {puzzle.title}</strong><small>{progress.pieces.filter((piece) => piece.targetId).length} / 7 조각</small></div>
      <div className={classNames('tangram-board', puzzle.tier === 'starter' && 'show-guides', `guide-${tangramGuideLevel(puzzle)}`)} role="group" aria-label={`${puzzle.title} 칠교판`} onPointerUp={pointerUp}>
        <div className="tangram-silhouette" aria-hidden="true">{puzzle.icon}</div>
        {puzzle.targets.map((target, index) => {
          const placedPiece = progress.pieces.find((piece) => piece.targetId === target.id);
          const definition = placedPiece ? TANGRAM_PIECES.find((piece) => piece.id === placedPiece.pieceId)! : null;
          const placeholder = TANGRAM_PIECES.find((piece) => piece.kind === target.kind)!;
          return <button key={target.id} data-target-id={target.id} className={classNames('tangram-target', progress.hintLevel >= 3 && !placedPiece && 'is-hinted', placedPiece && 'is-filled')}
            style={{ '--tx': target.x, '--ty': target.y } as CSSProperties} onClick={() => selected && tryPlace(selected, target.id)}
            aria-label={`${index + 1}번 빈자리${placedPiece ? `, ${definition?.label} 놓임` : ''}`}>
            {definition
              ? <PiecePicture piece={definition} rotation={target.rotation} flipped={target.flipped} />
              : <PiecePicture piece={placeholder} rotation={target.rotation} flipped={target.flipped} muted />}
          </button>;
        })}
      </div>
      <p className="shape-message" aria-live="polite">{message}</p>
      <div className="tangram-action-dock">
        <div className="tangram-controls" aria-label="선택한 조각 조작">
          <button aria-label="선택한 조각 45도 회전" disabled={!selected} onClick={() => selected && updatePiece(selected, { rotation: normalizeRotation(pieceState(selected).rotation + 45) })}>↻ 돌리기</button>
          <button aria-label="선택한 평행사변형 뒤집기" disabled={!selected || TANGRAM_PIECES.find((piece) => piece.id === selected)?.kind !== 'parallelogram'} onClick={() => selected && updatePiece(selected, { flipped: !pieceState(selected).flipped })}>↔ 뒤집기</button>
          <button aria-label="선택한 조각 판에서 빼기" disabled={!selected || !pieceState(selected).targetId} onClick={() => selected && setProgress((current) => removeTangramPiece(current, selected))}>↩ 빼기</button>
          <button aria-label="칠교 힌트 보기" onClick={hint}>💡 힌트</button>
        </div>
        <div ref={pieceBank} className="tangram-piece-bank" aria-label="사용할 칠교 조각, 옆으로 밀어서 더 볼 수 있어요">
          {TANGRAM_PIECES.map((definition) => {
            const state = pieceState(definition.id);
            return <button key={definition.id} data-piece-id={definition.id} className={classNames(selected === definition.id && 'is-selected', state.targetId && 'is-placed', dragging === definition.id && 'is-dragging')}
              aria-pressed={selected === definition.id} aria-label={`${definition.label}, ${state.rotation}도${state.flipped ? ', 뒤집힘' : ''}${state.targetId ? ', 판에 놓임' : ''}`}
              onClick={() => { setSelected(definition.id); if (state.targetId) setProgress((current) => removeTangramPiece(current, definition.id)); }}
              onPointerDown={() => { dragPiece.current = definition.id; setDragging(definition.id); setSelected(definition.id); }}
              onPointerCancel={() => { dragPiece.current = null; setDragging(null); }}
              onPointerUp={pointerUp}>
              <PiecePicture piece={definition} rotation={state.rotation} flipped={state.flipped} /><small>{definition.label.replace(/\s\d$/, '')}</small>
            </button>;
          })}
        </div>
      </div>
    </main>
  );
}

function LinePlay({ initial, records, soundEnabled, hapticsEnabled, onBack, onRecords }: {
  initial: LineClearProgress; records: ShapeBlockRecords; soundEnabled: boolean; hapticsEnabled: boolean; onBack: () => void;
  onRecords: (records: ShapeBlockRecords) => void;
}) {
  const [progress, setProgress] = useState(initial);
  const [selected, setSelected] = useState<string | null>(() => initial.tray[0]?.id ?? null);
  const [hintCell, setHintCell] = useState<string | null>(null);
  const [message, setMessage] = useState('블록을 고르고 판의 빈칸을 눌러요.');
  const completed = useRef(false);
  const dragged = useRef<string | null>(null);
  const selectedBlock = progress.tray.find((block) => block.id === selected) ?? null;
  const valid = useMemo(() => selectedBlock ? new Set(validPlacements(progress.board, selectedBlock).map(({ x, y }) => `${y}-${x}`)) : new Set<string>(), [progress.board, selectedBlock]);

  useEffect(() => {
    if (progress.phase === 'playing') saveLineProgress(progress);
  }, [progress]);

  const finish = (next: LineClearProgress) => {
    if (completed.current) return next;
    completed.current = true;
    const saved = saveLineCompletion(records, next);
    onRecords(saved.records);
    clearLineProgress();
    return next;
  };

  useEffect(() => {
    if (progress.phase === 'finished' && !completed.current) finish(progress);
  // 저장된 종료 판은 최초 마운트에서 한 번만 기록으로 옮긴다.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const place = (row: number, column: number, blockId = selected) => {
    if (!blockId || progress.phase !== 'playing') return;
    const block = progress.tray.find((item) => item.id === blockId);
    if (!block) return;
    const result = placeLineBlock(progress.board, block, row, column);
    if (!result) {
      if (soundEnabled) void unlockAudio().then(playInvalidSound);
      playHapticFeedback('invalid', hapticsEnabled);
      setMessage('그 자리에는 놓을 수 없어요. 초록 빈칸을 찾아보세요.');
      return;
    }
    if (result.clearedLines > 0) {
      if (soundEnabled) void unlockAudio().then(() => playLineClearSound(result.clearedLines));
      playHapticFeedback('line-clear', hapticsEnabled);
    } else {
      if (soundEnabled) void unlockAudio().then(playSnapSound);
      playHapticFeedback('snap', hapticsEnabled);
    }
    let tray = progress.tray.filter((item) => item.id !== blockId);
    if (tray.length === 0) tray = createTray(Math.random, result.board);
    const phase = anyTrayBlockFits(result.board, tray) ? 'playing' as const : 'finished' as const;
    const next: LineClearProgress = {
      ...progress, board: result.board, tray, phase,
      score: progress.score + result.gainedScore,
      clearedLines: progress.clearedLines + result.clearedLines,
      bestSingleClear: Math.max(progress.bestSingleClear, result.clearedLines),
      updatedAt: new Date().toISOString()
    };
    setHintCell(null);
    setSelected(tray[0]?.id ?? null);
    setMessage(phase === 'finished' ? '놓을 자리가 없어요. 멋진 기록을 세웠어요!'
      : result.clearedLines ? `${result.clearedLines}줄 찰칵! ${result.gainedScore}점을 얻었어요.` : '좋아요! 다음 블록도 놓아 볼까요?');
    setProgress(phase === 'finished' ? finish(next) : next);
  };

  const pointerUp = (event: ReactPointerEvent) => {
    const blockId = dragged.current;
    dragged.current = null;
    const touchOffset = event.pointerType === 'touch' ? 44 : 0;
    const cell = document.elementFromPoint(event.clientX, event.clientY - touchOffset)?.closest<HTMLElement>('[data-line-cell]')
      ?? document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-line-cell]');
    if (blockId && cell?.dataset.row && cell?.dataset.column) place(Number(cell.dataset.row), Number(cell.dataset.column), blockId);
  };

  const rotateSelected = () => {
    if (!selected) return;
    setProgress((current) => ({ ...current, tray: current.tray.map((block) => block.id === selected ? rotateBlock(block) : block), updatedAt: new Date().toISOString() }));
    setHintCell(null);
  };

  const showHint = () => {
    if (!selectedBlock) return;
    let candidates = validPlacements(progress.board, selectedBlock);
    let block = selectedBlock;
    for (let turns = 0; candidates.length === 0 && turns < 3; turns += 1) { block = rotateBlock(block); candidates = validPlacements(progress.board, block); }
    if (block.rotation !== selectedBlock.rotation) setProgress((current) => ({ ...current, tray: current.tray.map((item) => item.id === block.id ? block : item) }));
    const first = candidates[0];
    if (first) { setHintCell(`${first.y}-${first.x}`); setMessage('반짝이는 칸에서 시작해 보세요.'); }
  };

  if (progress.phase === 'finished') return (
    <main className="screen shape-block-screen line-result-screen">
      <TopBar title="줄 채우기 결과" onBack={onBack} />
      <div className="shape-result-burst" aria-hidden="true">🏆</div><p className="eyebrow">오늘의 최고 기록</p><h1>{progress.score}점</h1>
      <div className="line-result-stats"><div><strong>{progress.clearedLines}</strong><small>지운 줄</small></div><div><strong>{records.lineHighScore}</strong><small>전체 최고점</small></div></div>
      <button className="primary-button" onClick={() => { const next = createLineClearProgress(); completed.current = false; setProgress(next); setSelected(next.tray[0]?.id ?? null); }}>새 게임 시작</button>
      <button className="secondary-button" onClick={onBack}>모양블록 홈으로</button>
    </main>
  );

  return (
    <main className="screen shape-block-screen line-play-screen">
      <TopBar title="8×8 줄 채우기" onBack={onBack} />
      <div className="line-score"><span><small>점수</small><strong>{progress.score}</strong></span><span><small>지운 줄</small><strong>{progress.clearedLines}</strong></span><span><small>최고</small><strong>{records.lineHighScore}</strong></span></div>
      <div className="line-board" role="grid" aria-label="8 곱하기 8 줄 채우기 판" onPointerUp={pointerUp}>
        {progress.board.map((color, index) => {
          const row = Math.floor(index / 8); const column = index % 8; const key = `${row}-${column}`;
          return <button key={key} role="gridcell" data-line-cell="true" data-row={row} data-column={column}
            className={classNames(!color && valid.has(key) && 'is-valid', hintCell === key && 'is-hinted')}
            style={{ '--cell-color': color ?? undefined } as CSSProperties} disabled={Boolean(color)}
            aria-label={`${row + 1}행 ${column + 1}열, ${color ? '채워짐' : valid.has(key) ? '놓을 수 있는 시작 칸' : '빈칸'}`}
            onClick={() => place(row, column)} />;
        })}
      </div>
      <p className="shape-message" aria-live="polite">{message}</p>
      <div className="line-action-dock">
        <div className="line-actions"><button disabled={!selected} onClick={rotateSelected}>↻ 90° 회전</button><button disabled={!selected} onClick={showHint}>💡 놓을 자리</button></div>
        <div className="line-tray" aria-label="놓을 블록 3개">
          {progress.tray.map((block) => <LineBlockButton key={block.id} block={block} selected={selected === block.id} onSelect={() => setSelected(block.id)} onPointerUp={pointerUp}
            onPointerDown={() => { dragged.current = block.id; setSelected(block.id); }} />)}
        </div>
      </div>
    </main>
  );
}

function LineBlockButton({ block, selected, onSelect, onPointerDown, onPointerUp }: {
  block: LineBlock; selected: boolean; onSelect: () => void;
  onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void; onPointerUp: (event: ReactPointerEvent<HTMLButtonElement>) => void;
}) {
  const width = Math.max(...block.cells.map((cell) => cell.x)) + 1;
  const height = Math.max(...block.cells.map((cell) => cell.y)) + 1;
  return <button className={selected ? 'is-selected' : ''} aria-pressed={selected} aria-label={`${block.cells.length}칸 블록, ${block.rotation}도`} onClick={onSelect} onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
    <span className="line-mini-grid" style={{ '--mini-columns': width, '--mini-rows': height } as CSSProperties} aria-hidden="true">
      {Array.from({ length: width * height }, (_, index) => {
        const x = index % width; const y = Math.floor(index / width); const filled = block.cells.some((cell) => cell.x === x && cell.y === y);
        return <i key={index} className={filled ? 'filled' : ''} style={{ '--block-color': block.color } as CSSProperties} />;
      })}
    </span>
  </button>;
}

export default function ShapeBlockMode({ onExit, soundEnabled, animationsEnabled, hapticsEnabled, startDaily = false }: ShapeBlockModeProps) {
  const initialRecords = useMemo(() => loadShapeBlockRecords(), []);
  const [records, setRecords] = useState(initialRecords);
  const [savedTangram, setSavedTangram] = useState(() => loadTangramProgress());
  const [savedLine, setSavedLine] = useState(() => loadLineProgress());
  const [screen, setScreen] = useState<Screen>(() => initialRecords.tutorialCompleted ? 'home' : 'tutorial');
  const [activeTangram, setActiveTangram] = useState<TangramProgress | null>(null);
  const [activeLine, setActiveLine] = useState<LineClearProgress | null>(null);
  const [storageWarning, setStorageWarning] = useState(false);
  const dailyOpened = useRef(false);

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'auto' }); }, []);

  const remember = (next: ShapeBlockRecords, saved: boolean) => { setRecords(next); if (!saved) setStorageWarning(true); };
  const finishTutorial = () => { const saved = updateShapeBlockRecords(records, { tutorialCompleted: true }); remember(saved.records, saved.saved); setScreen('home'); };
  const openTangram = (puzzle: TangramPuzzle, resume = false) => {
    const next = resume && savedTangram?.puzzleId === puzzle.id ? savedTangram : createTangramProgress(puzzle);
    setActiveTangram(next); setScreen('tangram-play');
  };
  const openDailyTangram = () => {
    const dateKey = shapeBlockDateKey();
    const puzzle = dailyTangramPuzzle();
    const next = savedTangram?.puzzleId === puzzle.id && savedTangram.dailyDateKey === dateKey
      ? savedTangram
      : createTangramProgress(puzzle, dateKey);
    setActiveTangram(next); setScreen('tangram-play');
  };
  useEffect(() => {
    if (!startDaily || dailyOpened.current || !records.tutorialCompleted) return;
    dailyOpened.current = true;
    openDailyTangram();
  }, [startDaily, records.tutorialCompleted]);
  const completeTangram = (stars: number) => {
    if (!activeTangram) return;
    const wasDaily = Boolean(activeTangram.dailyDateKey);
    const saved = saveTangramCompletion(records, activeTangram.puzzleId, stars, activeTangram.dailyDateKey); remember(saved.records, saved.saved);
    clearTangramProgress(); setSavedTangram(null); setActiveTangram(null); setScreen(wasDaily ? 'home' : 'tangram-levels');
  };
  const openLine = () => { const next = savedLine ?? createLineClearProgress(); setActiveLine(next); setScreen('line-play'); };

  if (screen === 'tutorial') return <Tutorial onBack={records.tutorialCompleted ? () => setScreen('home') : onExit} onComplete={finishTutorial} />;
  if (screen === 'tangram-levels') return <TangramLevels records={records} saved={savedTangram} onBack={() => setScreen('home')} onStart={openTangram} />;
  if (screen === 'tangram-play' && activeTangram) {
    const puzzle = TANGRAM_PUZZLES.find((item) => item.id === activeTangram.puzzleId)!;
    return <TangramPlay initial={activeTangram} puzzle={puzzle} soundEnabled={soundEnabled} hapticsEnabled={hapticsEnabled} onBack={() => { setSavedTangram(activeTangram); setScreen('tangram-levels'); }}
      onSaved={(next) => { setActiveTangram(next); setSavedTangram(next); if (!saveTangramProgress(next)) setStorageWarning(true); }} onComplete={completeTangram} />;
  }
  if (screen === 'line-play' && activeLine) return <LinePlay initial={activeLine} records={records} soundEnabled={soundEnabled} hapticsEnabled={hapticsEnabled} onBack={() => { setSavedLine(loadLineProgress()); setScreen('home'); }} onRecords={(next) => { setRecords(next); setSavedLine(null); }} />;
  if (screen === 'collection') return <main className="screen shape-block-screen"><TopBar title="모양블록 배지" onBack={() => setScreen('home')} /><section className="shape-heading"><p className="eyebrow">조금씩 자라는 중</p><h1>나의 모양 배지</h1></section><AchievementGrid items={getShapeBlockAchievements(records)} className="shape-badge-grid" label="모양블록 배지 목록" /></main>;

  return (
    <main className={classNames('screen shape-block-screen shape-block-home', !animationsEnabled && 'reduce-motion')}>
      <TopBar title="모양블록" onBack={onExit} />
      <section className="shape-hero"><div><p className="eyebrow">돌리고 놓으면 찰칵!</p><h1>모양을 만들고<br />빈줄을 채워요</h1><p>손으로 움직이며 공간 감각을 키워요.</p></div><span><ShapeBlockIcon /></span></section>
      {storageWarning && <p className="inline-notice" role="status">기록을 저장하지 못했지만 놀이는 계속할 수 있어요.</p>}
      <button className="shape-daily-card" onClick={openDailyTangram}>
        <span aria-hidden="true">☀️</span>
        <span><small>오늘의 모양</small><strong>{dailyTangramPuzzle().icon} {dailyTangramPuzzle().title} 만들기</strong><p>{records.dailyBadges.includes(shapeBlockDateKey()) ? '오늘 미션을 완성했어요. 다시 만들어도 좋아요!' : '하루 한 그림, 천천히 맞춰 봐요.'}</p></span>
        <b>{records.dailyBadges.includes(shapeBlockDateKey()) ? '다시 하기 ›' : '도전 ›'}</b>
      </button>
      <div className="shape-mode-grid">
        <button onClick={() => setScreen('tangram-levels')}><span aria-hidden="true">🦊</span><strong>칠교 그림 완성</strong><small>7개 조각으로 30가지 그림을 만들어요</small><b>시작 ›</b></button>
        <button onClick={openLine}><span aria-hidden="true">▦</span><strong>8×8 줄 채우기</strong><small>블록을 돌려 가로세로 한 줄을 채워요</small><b>{savedLine ? '이어 하기 ›' : '시작 ›'}</b></button>
      </div>
      <button className="shape-collection-card" onClick={() => setScreen('collection')}><span aria-hidden="true">🏅</span><span><small>모은 배지</small><strong>{getShapeBlockAchievements(records).filter((item) => item.unlocked).length} / 6</strong></span><b>배지 보기 ›</b></button>
      <button className="shape-practice-link" onClick={() => setScreen('tutorial')}>조작 연습 다시 보기</button>
    </main>
  );
}
