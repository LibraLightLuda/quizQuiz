import { afterEach, describe, expect, it, vi } from 'vitest';
import { speak } from './speechService';

describe('음성 읽기', () => {
  afterEach(() => vi.restoreAllMocks());

  it.each([0.75, 0.85, 0.95] as const)('선택한 %s 속도를 음성 엔진에 전달한다', async (rate) => {
    let spokenRate = 0;
    class MockUtterance {
      lang = '';
      rate = 1;
      pitch = 1;
      volume = 1;
      voice = null;
      onend?: () => void;
      onerror?: () => void;
      constructor(public text: string) {}
    }
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: MockUtterance, configurable: true });
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        getVoices: () => [],
        cancel: () => undefined,
        speak: (utterance: MockUtterance) => {
          spokenRate = utterance.rate;
          utterance.onend?.();
        }
      }
    });
    await expect(speak('apple', 'en-US', rate)).resolves.toBe('ended');
    expect(spokenRate).toBe(rate);
  });
});
