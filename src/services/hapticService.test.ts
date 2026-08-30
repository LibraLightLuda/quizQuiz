import { afterEach, describe, expect, it, vi } from 'vitest';
import { playHapticFeedback } from './hapticService';

describe('촉각 피드백', () => {
  afterEach(() => vi.restoreAllMocks());

  it('활성화되고 지원되는 기기에서 상황별 짧은 패턴을 사용한다', () => {
    const vibrate = vi.fn(() => true);
    Object.defineProperty(navigator, 'vibrate', { configurable: true, value: vibrate });
    expect(playHapticFeedback('snap')).toBe(true);
    expect(playHapticFeedback('invalid')).toBe(true);
    expect(playHapticFeedback('line-clear')).toBe(true);
    expect(vibrate.mock.calls).toEqual([[18], [[18, 35, 18]], [[24, 28, 46]]]);
  });

  it('꺼져 있거나 브라우저가 거절해도 놀이를 중단하지 않는다', () => {
    const vibrate = vi.fn(() => { throw new Error('blocked'); });
    Object.defineProperty(navigator, 'vibrate', { configurable: true, value: vibrate });
    expect(playHapticFeedback('snap', false)).toBe(false);
    expect(vibrate).not.toHaveBeenCalled();
    expect(playHapticFeedback('complete')).toBe(false);
  });
});
