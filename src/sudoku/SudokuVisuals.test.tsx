import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SudokuCompleteVisual, SudokuRuleVisual, SudokuToolIcon } from './SudokuVisuals';

describe('Sudoku visual guides', () => {
  it.each([
    ['row', '가로줄을 왼쪽에서 오른쪽으로 살펴봐요'],
    ['column', '세로줄을 위에서 아래로 살펴봐요'],
    ['box', '굵은 선으로 묶인 작은 상자를 살펴봐요'],
    ['all', '가로줄, 세로줄, 작은 상자를 차례로 확인해요']
  ] as const)('%s 규칙을 글과 도형으로 함께 설명한다', (focus, label) => {
    const markup = renderToStaticMarkup(<SudokuRuleVisual focus={focus} />);
    expect(markup).toContain('<svg');
    expect(markup).toContain(label);
    expect(markup).toContain(`rule-${focus}`);
  });

  it('게임 도구와 고품질 완료 표시를 제공한다', () => {
    for (const kind of ['erase', 'hint', 'refresh'] as const) {
      expect(renderToStaticMarkup(<SudokuToolIcon kind={kind} />)).toContain('sudoku-tool-icon');
    }
    const complete = renderToStaticMarkup(<SudokuCompleteVisual />);
    expect(complete).toContain('sudoku-complete-visual');
    expect(complete).toContain('sudoku-complete.webp');
  });
});
