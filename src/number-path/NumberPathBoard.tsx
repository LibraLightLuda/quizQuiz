import { useRef } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { outgoingBridges } from './numberPathGenerator';
import type { NumberPathNode, NumberPathPuzzle } from './types';

interface NumberPathBoardProps {
  puzzle: NumberPathPuzzle;
  selectedBridgeIds: readonly string[];
  currentNodeId: string;
  failedBridgeIds?: ReadonlySet<string>;
  suggestedBridgeIds?: ReadonlySet<string>;
  revealedBridgeId?: string;
  onSelect: (bridgeId: string) => void;
  onBacktrack?: () => void;
  disabled?: boolean;
  label?: string;
}

const nodePosition = (puzzle: NumberPathPuzzle, node: NumberPathNode) => ({
  x: 9 + (node.layer / puzzle.requiredCrossings) * 82,
  y: node.kind === 'start' || node.kind === 'end' ? 50 : 19 + node.lane * 31
});

const signedValue = (value: number): string => value < 0 ? `−${Math.abs(value)}` : `+${value}`;

const bridgeGeometry = (puzzle: NumberPathPuzzle, bridgeId: string, fromNodeId: string, toNodeId: string) => {
  const nodes = new Map(puzzle.nodes.map((node) => [node.id, node]));
  const from = nodePosition(puzzle, nodes.get(fromNodeId)!);
  const to = nodePosition(puzzle, nodes.get(toNodeId)!);
  const siblings = outgoingBridges(puzzle, fromNodeId);
  const index = siblings.findIndex((bridge) => bridge.id === bridgeId);
  const offset = siblings.length === 3 ? (index - 1) * 25 : index === 0 ? -19 : 19;
  const controlX = (from.x + to.x) / 2;
  const controlY = (from.y + to.y) / 2 + offset;
  return {
    from,
    to,
    buttonX: controlX,
    buttonY: (from.y + 2 * controlY + to.y) / 4,
    path: `M ${from.x} ${from.y} Q ${controlX} ${controlY} ${to.x} ${to.y}`
  };
};

export default function NumberPathBoard({
  puzzle,
  selectedBridgeIds,
  currentNodeId,
  failedBridgeIds = new Set(),
  suggestedBridgeIds = new Set(),
  revealedBridgeId,
  onSelect,
  onBacktrack,
  disabled = false,
  label = '섬과 숫자 다리 지도'
}: NumberPathBoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const nodes = new Map(puzzle.nodes.map((node) => [node.id, node]));
  const currentChoices = new Set(outgoingBridges(puzzle, currentNodeId).map((bridge) => bridge.id));

  const selectFromPointer = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragging.current || disabled) return;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-bridge-id]');
    const id = target?.dataset.bridgeId;
    if (id && currentChoices.has(id) && !failedBridgeIds.has(id)) onSelect(id);
  };

  const moveChoiceFocus = (event: KeyboardEvent<HTMLButtonElement>, direction: number) => {
    event.preventDefault();
    const choices = [...(boardRef.current?.querySelectorAll<HTMLButtonElement>('.number-path-bridge:not(:disabled)') ?? [])];
    const index = choices.indexOf(event.currentTarget);
    choices[(index + direction + choices.length) % choices.length]?.focus();
  };

  return (
    <div
      ref={boardRef}
      className="number-path-board"
      role="group"
      aria-label={label}
      data-crossings={puzzle.requiredCrossings}
      onPointerMove={selectFromPointer}
      onPointerUp={() => { dragging.current = false; }}
      onPointerCancel={() => { dragging.current = false; }}
      onPointerLeave={(event) => { if (event.pointerType === 'mouse') dragging.current = false; }}
    >
      <div className="number-path-water" aria-hidden="true" />
      <svg className="number-path-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {puzzle.bridges.map((bridge) => {
          const geometry = bridgeGeometry(puzzle, bridge.id, bridge.fromNodeId, bridge.toNodeId);
          const selected = selectedBridgeIds.includes(bridge.id);
          const failed = failedBridgeIds.has(bridge.id);
          const available = currentChoices.has(bridge.id) && !failed && !disabled;
          return (
            <path
              key={bridge.id}
              d={geometry.path}
              className={selected ? 'is-selected' : failed ? 'is-failed' : available ? 'is-available' : ''}
            />
          );
        })}
      </svg>

      {puzzle.nodes.map((node) => {
        const position = nodePosition(puzzle, node);
        const current = node.id === currentNodeId;
        const visited = node.id === puzzle.startNodeId || selectedBridgeIds.some((id) =>
          puzzle.bridges.find((bridge) => bridge.id === id)?.toNodeId === node.id);
        return (
          <span
            key={node.id}
            className={`number-path-island ${current ? 'is-current' : ''} ${visited ? 'is-visited' : ''} is-${node.kind}`}
            style={{ left: `${position.x}%`, top: `${position.y}%` }}
            aria-hidden="true"
          >
            {node.kind === 'start' ? '출발' : node.kind === 'end' ? '보물' : current ? '●' : ''}
            {current && <i>🐾</i>}
          </span>
        );
      })}

      {puzzle.bridges.map((bridge) => {
        const geometry = bridgeGeometry(puzzle, bridge.id, bridge.fromNodeId, bridge.toNodeId);
        const selectedIndex = selectedBridgeIds.indexOf(bridge.id);
        const selected = selectedIndex >= 0;
        const failed = failedBridgeIds.has(bridge.id);
        const available = currentChoices.has(bridge.id) && !failed && !disabled;
        const suggested = suggestedBridgeIds.has(bridge.id) || revealedBridgeId === bridge.id;
        const marker = bridge.marker === 'key' ? '열쇠 다리' : bridge.marker === 'star'
          ? `${bridge.markerOrder ?? ''}번째 별 다리` : '';
        return (
          <button
            key={bridge.id}
            type="button"
            data-bridge-id={bridge.id}
            className={[
              'number-path-bridge',
              selected && 'is-selected',
              failed && 'is-failed',
              available && 'is-available',
              suggested && 'is-suggested'
            ].filter(Boolean).join(' ')}
            style={{ left: `${geometry.buttonX}%`, top: `${geometry.buttonY}%` }}
            disabled={!available}
            tabIndex={available ? 0 : -1}
            aria-label={[
              `숫자 다리 ${signedValue(bridge.value)}`,
              marker,
              selected ? `${selectedIndex + 1}번째로 건넘` : '',
              failed ? '금이 가서 닫힘' : '',
              suggested ? '힌트로 추천됨' : ''
            ].filter(Boolean).join(', ')}
            onClick={() => onSelect(bridge.id)}
            onPointerDown={(event) => {
              if (!available) return;
              dragging.current = true;
            }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') moveChoiceFocus(event, -1);
              else if (event.key === 'ArrowDown' || event.key === 'ArrowRight') moveChoiceFocus(event, 1);
              else if (event.key === 'Backspace') {
                event.preventDefault();
                onBacktrack?.();
              }
            }}
          >
            <span>{failed ? '×' : signedValue(bridge.value)}</span>
            {bridge.marker && <small>{bridge.marker === 'key' ? '🔑' : `★${bridge.markerOrder ?? ''}`}</small>}
          </button>
        );
      })}
      <span className="number-path-map-caption" aria-hidden="true">출발지에서 보물섬까지</span>
    </div>
  );
}
