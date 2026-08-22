import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Question } from '../domain/types';
import { hasMathVisual, MathVisual } from './MathVisual';

const question = (difficulty: Question['difficulty'], operation: string, operands = [7, 5]): Question => ({
  id: 'visual-test', signature: 'visual-test', subject: 'math', mode: 'math-add', difficulty, kind: 'math',
  prompt: '7 + 5 = ?', options: [], correctOptionId: 'answer', explanation: '7 + 5 = 12',
  metadata: { operands, answer: 12, operation }
});

describe('MathVisual', () => {
  it('쉬움 덧셈을 10칸 수 모형으로 기본 표시한다', () => {
    const value = question('easy', 'math-add');
    const markup = renderToStaticMarkup(<MathVisual question={value} />);
    expect(hasMathVisual(value)).toBe(true);
    expect(markup).toContain('7개와 5개를 더하는 그림');
    expect((markup.match(/data-ten-frame/g) ?? [])).toHaveLength(2);
    expect(markup).toContain('10칸 모형');
  });

  it('쉬움 뺄셈은 빠지는 칸에 색과 X 표시를 함께 쓴다', () => {
    const markup = renderToStaticMarkup(<MathVisual question={question('easy', 'math-subtract', [12, 4])} />);
    expect(markup).toContain('12개에서 4개를 빼는 그림');
    expect((markup.match(/stroke="#9B4B31"/g) ?? [])).toHaveLength(4);
  });

  it('곱셈은 같은 수씩 놓인 묶음 배열을 보여 준다', () => {
    const markup = renderToStaticMarkup(<MathVisual question={question('easy', 'math-multiply', [5, 3])} />);
    expect(markup).toContain('3개씩 5묶음으로 생각하는 곱셈 배열');
    expect((markup.match(/data-multiply-group/g) ?? [])).toHaveLength(5);
  });

  it('보통과 어려움은 요청했을 때만 자릿값 힌트를 표시한다', () => {
    const normal = question('normal', 'math-add', [47, 35]);
    expect(renderToStaticMarkup(<MathVisual question={normal} />)).toBe('');
    const revealed = renderToStaticMarkup(<MathVisual question={normal} revealed />);
    expect(revealed).toContain('data-place-value');
    expect(revealed).toContain('백 묶음·십 묶음·낱개');
    expect(hasMathVisual(question('hard', 'math-subtract', [231, 118]))).toBe(true);
  });

  it('직접 계산하는 도전 단계와 잘못된 메타데이터에는 힌트를 노출하지 않는다', () => {
    expect(hasMathVisual(question('challenge', 'math-add'))).toBe(false);
    expect(renderToStaticMarkup(<MathVisual question={question('challenge', 'math-add')} revealed />)).toBe('');
    expect(hasMathVisual(question('normal', 'math-divide'))).toBe(false);
  });
});
