export type SudokuRuleFocus = 'row' | 'column' | 'box' | 'all';
export type SudokuToolKind = 'erase' | 'hint' | 'refresh';

const focusLabels: Record<SudokuRuleFocus, string> = {
  row: '가로줄을 왼쪽에서 오른쪽으로 살펴봐요',
  column: '세로줄을 위에서 아래로 살펴봐요',
  box: '굵은 선으로 묶인 작은 상자를 살펴봐요',
  all: '가로줄, 세로줄, 작은 상자를 차례로 확인해요'
};

export function SudokuRuleVisual({ focus }: { focus: SudokuRuleFocus }) {
  const cell = 16;
  const boardX = 12;
  const boardY = 12;
  const targetRow = focus === 'column' ? 2 : focus === 'box' ? 1 : 1;
  const targetColumn = focus === 'row' ? 2 : focus === 'box' ? 1 : 2;
  const targetX = boardX + targetColumn * cell + cell / 2;
  const targetY = boardY + targetRow * cell + cell / 2;
  const boxX = boardX + Math.floor(targetColumn / 2) * cell * 2;
  const boxY = boardY + Math.floor(targetRow / 2) * cell * 2;

  return (
    <figure className={`sudoku-rule-visual rule-${focus}`} aria-label={`${focusLabels[focus]} 규칙 그림`}>
      <svg viewBox="0 0 240 88" aria-hidden="true" focusable="false">
        <defs>
          <marker id="sudoku-rule-arrow" markerWidth="7" markerHeight="7" refX="5.5" refY="3.5" orient="auto">
            <path d="M0 0 7 3.5 0 7Z" fill="currentColor" />
          </marker>
        </defs>
        {(focus === 'row' || focus === 'all') && <rect className="rule-row-band" x={boardX} y={boardY + targetRow * cell} width={cell * 4} height={cell} rx="3" />}
        {(focus === 'column' || focus === 'all') && <rect className="rule-column-band" x={boardX + targetColumn * cell} y={boardY} width={cell} height={cell * 4} rx="3" />}
        {(focus === 'box' || focus === 'all') && <rect className="rule-box-band" x={boxX} y={boxY} width={cell * 2} height={cell * 2} rx="4" />}
        <rect className="rule-board-outline" x={boardX} y={boardY} width={cell * 4} height={cell * 4} rx="5" />
        {[1, 2, 3].map((offset) => <path key={`v-${offset}`} className={offset === 2 ? 'rule-grid-bold' : 'rule-grid'} d={`M${boardX + offset * cell} ${boardY}V${boardY + cell * 4}`} />)}
        {[1, 2, 3].map((offset) => <path key={`h-${offset}`} className={offset === 2 ? 'rule-grid-bold' : 'rule-grid'} d={`M${boardX} ${boardY + offset * cell}H${boardX + cell * 4}`} />)}
        <circle className="rule-target" cx={targetX} cy={targetY} r="5" />

        {(focus === 'row' || focus === 'all') && <path className="rule-path row-path" d={`M88 ${targetY}H151`} markerEnd="url(#sudoku-rule-arrow)" />}
        {(focus === 'column' || focus === 'all') && <path className="rule-path column-path" d="M165 17V67" markerEnd="url(#sudoku-rule-arrow)" />}
        {(focus === 'box' || focus === 'all') && <path className="rule-path box-path" d="M194 28h24v24h-24z" />}
        <g className="rule-path-label">
          {(focus === 'row' || focus === 'all') && <><circle cx="105" cy={targetY - 9} r="4" /><circle cx="123" cy={targetY - 9} r="4" /><circle cx="141" cy={targetY - 9} r="4" /></>}
          {(focus === 'column' || focus === 'all') && <><circle cx="178" cy="25" r="4" /><circle cx="178" cy="43" r="4" /><circle cx="178" cy="61" r="4" /></>}
          {(focus === 'box' || focus === 'all') && <><circle cx="201" cy="35" r="3.5" /><circle cx="211" cy="35" r="3.5" /><circle cx="201" cy="45" r="3.5" /><circle cx="211" cy="45" r="3.5" /></>}
        </g>
        {focus === 'all' && <path className="rule-check" d="m207 70 7 7 14-17" />}
      </svg>
      <figcaption><span aria-hidden="true">{focus === 'row' ? '↔' : focus === 'column' ? '↕' : focus === 'box' ? '▦' : '✓'}</span>{focusLabels[focus]}</figcaption>
    </figure>
  );
}

export function SudokuToolIcon({ kind }: { kind: SudokuToolKind }) {
  if (kind === 'erase') {
    return <svg className="sudoku-tool-icon" viewBox="0 0 32 32" aria-hidden="true"><path d="m8 20 10-11a3 3 0 0 1 4 0l3 3a3 3 0 0 1 0 4l-9 10H9l-3-3a2 2 0 0 1 0-3Z" /><path d="m13 15 7 7M8 26h18" /></svg>;
  }
  if (kind === 'hint') {
    return <svg className="sudoku-tool-icon" viewBox="0 0 32 32" aria-hidden="true"><path d="M10 18a9 9 0 1 1 12 0c-2 1.6-2 3-2 4h-8c0-1 0-2.4-2-4Z" /><path d="M12 26h8M14 29h4M16 3V1M5 8 3 6M27 8l2-2" /></svg>;
  }
  return <svg className="sudoku-tool-icon" viewBox="0 0 32 32" aria-hidden="true"><path d="M25 10V4l-3 3a11 11 0 1 0 3 14" /><path d="M25 4h-6" /></svg>;
}

export function SudokuCompleteVisual() {
  return (
    <div className="sudoku-complete-visual" aria-hidden="true">
      <svg viewBox="0 0 112 112" focusable="false">
        <rect x="17" y="17" width="78" height="78" rx="15" />
        {[43, 69].map((position) => <path key={`v-${position}`} d={`M${position} 20V92`} />)}
        {[43, 69].map((position) => <path key={`h-${position}`} d={`M20 ${position}H92`} />)}
        <path className="complete-check" d="m35 57 15 15 29-34" />
        <path className="complete-spark" d="M92 12v10M87 17h10M17 87v8M13 91h8" />
      </svg>
    </div>
  );
}
