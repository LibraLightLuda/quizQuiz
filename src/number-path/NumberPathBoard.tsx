import { useRef } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import type { NumberPathPuzzle } from './types';

interface NumberPathBoardProps {
  puzzle: NumberPathPuzzle;
  path: readonly string[];
  onSelect: (cellId: string) => void;
  onBacktrack?: () => void;
  disabled?: boolean;
  suggestedIds?: ReadonlySet<string>;
  backtrackSuggested?: boolean;
  label?: string;
}

const classNames = (...values: Array<string | false | undefined>): string => values.filter(Boolean).join(' ');

export default function NumberPathBoard({
  puzzle,
  path,
  onSelect,
  onBacktrack,
  disabled = false,
  suggestedIds = new Set(),
  backtrackSuggested = false,
  label = '숫자 길 찾기 판'
}: NumberPathBoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const pathPoints = path.map((id) => {
    const cell = puzzle.cells.find((item) => item.id === id)!;
    return `${cell.column * 100 + 50},${cell.row * 100 + 50}`;
  }).join(' ');

  const selectFromPointer = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragging.current || disabled) return;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-cell-id]');
    if (target?.dataset.cellId) onSelect(target.dataset.cellId);
  };

  const moveFocus = (event: KeyboardEvent<HTMLButtonElement>, rowDelta: number, columnDelta: number) => {
    event.preventDefault();
    const row = Number(event.currentTarget.dataset.row) + rowDelta;
    const column = Number(event.currentTarget.dataset.column) + columnDelta;
    boardRef.current?.querySelector<HTMLButtonElement>(`[data-row="${row}"][data-column="${column}"]:not(:disabled)`)?.focus();
  };

  return (
    <div
      ref={boardRef}
      className="number-path-board"
      style={{ '--path-rows': puzzle.rows, '--path-columns': puzzle.columns } as React.CSSProperties}
      role="grid"
      aria-label={label}
      onPointerMove={selectFromPointer}
      onPointerUp={() => { dragging.current = false; }}
      onPointerCancel={() => { dragging.current = false; }}
      onPointerLeave={(event) => { if (event.pointerType === 'mouse') dragging.current = false; }}
    >
      <svg className="number-path-lines" viewBox={`0 0 ${puzzle.columns * 100} ${puzzle.rows * 100}`} preserveAspectRatio="none" aria-hidden="true">
        {pathPoints && <polyline points={pathPoints} />}
      </svg>
      {puzzle.cells.map((cell) => {
        const pathIndex = path.indexOf(cell.id);
        const selected = pathIndex >= 0;
        const start = cell.id === puzzle.startCellId;
        const end = cell.id === puzzle.endCellId;
        const checkpoint = puzzle.checkpointCellIds.includes(cell.id);
        const last = path.at(-1) === cell.id;
        const accessibleParts = [
          `${cell.row + 1}행 ${cell.column + 1}열`,
          cell.blocked ? '막힌 칸' : `숫자 ${cell.value}`,
          start ? '시작 칸' : '', end ? '도착 칸' : '', checkpoint ? '별 칸' : '',
          selected ? `${pathIndex + 1}번째로 선택됨` : '',
          suggestedIds.has(cell.id) ? '힌트로 추천됨' : ''
        ].filter(Boolean);
        return (
          <button
            key={cell.id}
            type="button"
            role="gridcell"
            data-cell-id={cell.id}
            data-row={cell.row}
            data-column={cell.column}
            className={classNames(
              'number-path-cell', selected && 'is-selected', last && 'is-last', start && 'is-start',
              end && 'is-end', checkpoint && 'is-checkpoint', cell.blocked && 'is-blocked',
              suggestedIds.has(cell.id) && 'is-suggested', backtrackSuggested && last && 'is-backtrack-suggested'
            )}
            disabled={disabled || cell.blocked}
            aria-label={accessibleParts.join(', ')}
            aria-selected={selected}
            onClick={() => onSelect(cell.id)}
            onPointerDown={(event) => {
              if (disabled || cell.blocked) return;
              event.preventDefault();
              dragging.current = true;
              onSelect(cell.id);
            }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowUp') moveFocus(event, -1, 0);
              else if (event.key === 'ArrowDown') moveFocus(event, 1, 0);
              else if (event.key === 'ArrowLeft') moveFocus(event, 0, -1);
              else if (event.key === 'ArrowRight') moveFocus(event, 0, 1);
              else if (event.key === 'Backspace') {
                event.preventDefault();
                onBacktrack?.();
              }
            }}
          >
            {cell.blocked ? <span className="number-path-rock" aria-hidden="true">×</span> : (
              <>
                <span className="number-path-value">{cell.value < 0 ? `−${Math.abs(cell.value)}` : cell.value}</span>
                {selected && <small className="number-path-order" aria-hidden="true">{pathIndex + 1}</small>}
                {start && <small className="number-path-marker">시작</small>}
                {end && <small className="number-path-marker">도착</small>}
                {checkpoint && <small className="number-path-marker">★</small>}
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
