let audioContext: AudioContext | null = null;

interface ToneStep {
  frequency: number;
  offset?: number;
  duration?: number;
  type?: OscillatorType;
}

const playTones = (steps: readonly ToneStep[], volume: number, duration: number): void => {
  if (!audioContext || audioContext.state !== 'running') return;
  const now = audioContext.currentTime;
  const gain = audioContext.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  gain.connect(audioContext.destination);
  steps.forEach((step) => {
    const oscillator = audioContext!.createOscillator();
    oscillator.type = step.type ?? 'sine';
    oscillator.frequency.value = step.frequency;
    oscillator.connect(gain);
    oscillator.start(now + (step.offset ?? 0));
    oscillator.stop(now + (step.offset ?? 0) + (step.duration ?? duration));
  });
};

export const unlockAudio = async (): Promise<void> => {
  try {
    const Context = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Context) return;
    audioContext ??= new Context();
    if (audioContext.state === 'suspended') await audioContext.resume();
  } catch {
    audioContext = null;
  }
};

export const playSuccessSound = (): void => {
  playTones([{ frequency: 523.25 }, { frequency: 659.25, offset: 0.08 }], 0.16, 0.24);
};

export const playGardenClearSound = (clearedLines: number, combo: number): void => {
  const pitchBoost = Math.min(9, Math.max(0, clearedLines - 1) * 3 + Math.max(0, combo - 1) * 2);
  const multiplier = 2 ** (pitchBoost / 12);
  const melody = [
    { frequency: 523.25 * multiplier, duration: 0.2 },
    { frequency: 659.25 * multiplier, offset: 0.08, duration: 0.24 },
    { frequency: 783.99 * multiplier, offset: 0.16, duration: 0.3 },
    { frequency: 1046.5 * multiplier, offset: 0.24, duration: 0.34 }
  ];
  playTones(melody, Math.min(0.2, 0.16 + clearedLines * 0.015 + Math.max(0, combo - 1) * 0.01), 0.38);
};
