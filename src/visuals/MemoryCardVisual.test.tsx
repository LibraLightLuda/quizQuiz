import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { MemoryCard } from '../memory/types';
import { MemoryCardVisual } from './MemoryCardVisual';

const card = (values: Partial<MemoryCard>): MemoryCard => ({
  id: 'card', pairId: 'e01', content: '사과', category: 'english', side: 'answer', ...values
});

describe('MemoryCardVisual', () => {
  it('개념 그림은 관계의 뜻 쪽 카드에만 보여 준다', () => {
    expect(renderToStaticMarkup(<MemoryCardVisual card={card({ side: 'question' })} />)).toBe('');
    const answer = renderToStaticMarkup(<MemoryCardVisual card={card({})} />);
    expect(answer).toContain('illustrations/concepts/apple.webp');
    expect(answer).toContain('alt=""');
  });

  it('작은 수학 정답은 숫자와 함께 수량 점을 보여 준다', () => {
    const markup = renderToStaticMarkup(<MemoryCardVisual card={card({ pairId: 'm01', content: '5', category: 'math' })} />);
    expect((markup.match(/<i/g) ?? [])).toHaveLength(5);
  });

  it('두 자리 수는 십 묶음과 낱개로 간단히 보여 준다', () => {
    const markup = renderToStaticMarkup(<MemoryCardVisual card={card({ pairId: 'm12', content: '36', category: 'math' })} />);
    expect((markup.match(/class="ten"/g) ?? [])).toHaveLength(3);
    expect((markup.match(/class="one"/g) ?? [])).toHaveLength(6);
  });
});
