import type { Question } from '../domain/types';

type MathOperation = 'math-add' | 'math-subtract' | 'math-multiply';

interface MathModel {
  operation: MathOperation;
  operands: number[];
}

const isOperation = (value: unknown): value is MathOperation =>
  value === 'math-add' || value === 'math-subtract' || value === 'math-multiply';

const modelFor = (question: Question): MathModel | null => {
  const operands = question.metadata?.operands;
  const operation = question.metadata?.operation;
  if (question.kind !== 'math' || question.difficulty === 'challenge' || !Array.isArray(operands)
    || operands.length < 2 || !operands.every((value) => typeof value === 'number' && value >= 0)
    || !isOperation(operation)) return null;
  return { operands: operands as number[], operation };
};

export const hasMathVisual = (question: Question): boolean => modelFor(question) !== null;

const tenFrames = (count: number, startX: number, color: string, crossedFrom = Number.POSITIVE_INFINITY) => {
  const frames = Math.max(1, Math.ceil(count / 10));
  return Array.from({ length: frames }, (_, frame) => {
    const frameX = startX + frame * 48;
    return (
      <g key={`frame-${startX}-${frame}`} data-ten-frame="true">
        <rect x={frameX} y="18" width="43" height="25" rx="4" fill="#FFFFFF" stroke="#CFC9DD" strokeWidth="1.4" />
        {Array.from({ length: 10 }, (_, cell) => {
          const index = frame * 10 + cell;
          const x = frameX + 5.5 + (cell % 5) * 8;
          const y = 24 + Math.floor(cell / 5) * 12;
          const filled = index < count;
          const crossed = filled && index >= crossedFrom;
          return (
            <g key={cell} opacity={crossed ? .35 : 1}>
              <circle cx={x} cy={y} r="3.2" fill={filled ? color : '#F0EDF4'} />
              {crossed && <path d={`M${x - 3.5} ${y - 3.5}l7 7M${x + 3.5} ${y - 3.5}l-7 7`} stroke="#9B4B31" strokeWidth="1.5" strokeLinecap="round" />}
            </g>
          );
        })}
      </g>
    );
  });
};

const placeValueModel = (value: number, startX: number, color: string) => {
  const hundreds = Math.floor(value / 100);
  const tens = Math.floor((value % 100) / 10);
  const ones = value % 10;
  return (
    <g data-place-value="true">
      {Array.from({ length: hundreds }, (_, index) => {
        const x = startX + index * 28;
        return <g key={`hundred-${index}`}><rect x={x} y="13" width="23" height="23" rx="3" fill={color} opacity=".2" stroke={color} strokeWidth="1.5" />{[1, 2].map((line) => <path key={`h-${line}`} d={`M${x + line * 7.7} 13v23M${x} ${13 + line * 7.7}h23`} stroke={color} strokeWidth=".55" opacity=".75" />)}</g>;
      })}
      {Array.from({ length: tens }, (_, index) => {
        const x = startX + (index % 5) * 10;
        const y = 44 + Math.floor(index / 5) * 22;
        return <rect key={`ten-${index}`} x={x} y={y} width="7" height="19" rx="2.5" fill={color} opacity=".78" />;
      })}
      {Array.from({ length: ones }, (_, index) => {
        const x = startX + 61 + (index % 5) * 10;
        const y = 50 + Math.floor(index / 5) * 16;
        return <circle key={`one-${index}`} cx={x} cy={y} r="3.8" fill={color} />;
      })}
    </g>
  );
};

const operatorMark = (symbol: '+' | '−') => (
  <g aria-hidden="true"><circle cx="160" cy="43" r="13" fill="#FFFFFF" stroke="#D7D2E9" /><text x="160" y="49" textAnchor="middle" fill="#5E5774" fontSize="19" fontWeight="800">{symbol}</text></g>
);

const quantityVisual = (operation: 'math-add' | 'math-subtract', first: number, second: number, easy: boolean) => {
  const label = operation === 'math-add'
    ? `${first}개와 ${second}개를 더하는 그림`
    : `${first}개에서 ${second}개를 빼는 그림`;
  const caption = easy
    ? operation === 'math-add' ? '10칸 모형을 채우며 두 수를 모아 보세요.' : '지워지는 칸을 빼고 남은 수를 세어 보세요.'
    : operation === 'math-add' ? '백 묶음·십 묶음·낱개로 나누어 두 수를 모아 보세요.' : '왼쪽 수에서 오른쪽 수만큼 덜어 내 보세요.';
  return (
    <figure className={`math-visual ${easy ? 'math-visual-easy' : 'math-visual-hint'}`} role="img" aria-label={label}>
      <svg viewBox="0 0 320 82" aria-hidden="true">
        <rect x="5" y="5" width="145" height="72" rx="18" fill="#FFF2E7" />
        <rect x="170" y="5" width="145" height="72" rx="18" fill="#EFECFF" />
        {easy
          ? <>{tenFrames(first, 12, '#DE7340', operation === 'math-subtract' ? Math.max(0, first - second) : Number.POSITIVE_INFINITY)}{operation === 'math-add' && tenFrames(second, 177, '#6755DD')}</>
          : <>{placeValueModel(first, 18, '#D96F3B')}{placeValueModel(second, 183, '#6553DA')}</>}
        {operatorMark(operation === 'math-add' ? '+' : '−')}
      </svg>
      <figcaption>{caption}</figcaption>
    </figure>
  );
};

const multiplicationVisual = (first: number, second: number, easy: boolean) => {
  const columns = Math.max(1, Math.min(first, 20));
  const rows = Math.max(1, Math.min(second, 9));
  const cellWidth = 286 / columns;
  const cellHeight = 60 / rows;
  return (
    <figure className={`math-visual ${easy ? 'math-visual-easy' : 'math-visual-hint'}`} role="img" aria-label={`${second}개씩 ${first}묶음으로 생각하는 곱셈 배열`}>
      <svg viewBox="0 0 320 92" aria-hidden="true">
        <rect x="8" y="7" width="304" height="76" rx="18" fill="#FFF8EF" />
        {Array.from({ length: columns }, (_, column) => (
          <g key={column} data-multiply-group="true">
            <rect x={17 + column * cellWidth} y="15" width={Math.max(5, cellWidth - 2)} height="60" rx="5" fill={column % 2 ? '#EEEAFE' : '#FFF0DE'} />
            {Array.from({ length: rows }, (_, row) => <circle key={row} cx={17 + column * cellWidth + cellWidth / 2 - 1} cy={15 + row * cellHeight + cellHeight / 2} r={Math.min(4, cellWidth * .22, cellHeight * .3)} fill={column % 2 ? '#6553DA' : '#DD6E38'} />)}
          </g>
        ))}
      </svg>
      <figcaption>같은 수씩 놓인 묶음과 배열의 전체를 생각해 보세요.</figcaption>
    </figure>
  );
};

export function MathVisual({ question, revealed = false }: { question: Question; revealed?: boolean }) {
  const model = modelFor(question);
  if (!model || (question.difficulty !== 'easy' && !revealed)) return null;
  const [first, second] = model.operands;
  const easy = question.difficulty === 'easy';
  if (model.operation === 'math-multiply') return multiplicationVisual(first, second, easy);
  return quantityVisual(model.operation, first, second, easy);
}
