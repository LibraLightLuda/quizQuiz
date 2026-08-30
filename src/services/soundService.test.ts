import { afterEach, describe, expect, it, vi } from 'vitest';

const installAudioContext = () => {
  const frequencies: number[] = [];
  class FakeAudioContext {
    state: AudioContextState = 'running';
    currentTime = 0;
    destination = {};
    createGain() {
      return {
        gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
        connect: vi.fn()
      };
    }
    createOscillator() {
      const oscillator = {
        type: 'sine' as OscillatorType,
        frequency: { value: 0 },
        connect: vi.fn(),
        start: vi.fn(() => frequencies.push(oscillator.frequency.value)),
        stop: vi.fn()
      };
      return oscillator;
    }
    resume = vi.fn(async () => undefined);
  }
  Object.defineProperty(window, 'AudioContext', { configurable: true, value: FakeAudioContext });
  return frequencies;
};

describe('모양블록 효과음', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('맞는 배치와 잘못된 배치가 서로 다른 음 높이를 사용한다', async () => {
    const frequencies = installAudioContext();
    const sound = await import('./soundService');
    await sound.unlockAudio();
    sound.playSnapSound();
    expect(frequencies).toEqual([760]);
    frequencies.length = 0;
    sound.playInvalidSound();
    expect(frequencies).toEqual([220, 174.61]);
  });

  it('여러 줄을 지우면 한 줄보다 긴 상승음을 사용한다', async () => {
    const frequencies = installAudioContext();
    const sound = await import('./soundService');
    await sound.unlockAudio();
    sound.playLineClearSound(1);
    const oneLineNotes = frequencies.length;
    frequencies.length = 0;
    sound.playLineClearSound(3);
    expect(frequencies.length).toBeGreaterThan(oneLineNotes);
    expect(frequencies.at(-1)).toBeGreaterThan(frequencies[0]);
  });
});
