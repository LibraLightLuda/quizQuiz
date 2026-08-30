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

export const playSnapSound = (): void => {
  playTones([{ frequency: 760, duration: 0.08, type: 'triangle' }], 0.09, 0.1);
};

export const playInvalidSound = (): void => {
  playTones([
    { frequency: 220, duration: 0.1, type: 'triangle' },
    { frequency: 174.61, offset: 0.1, duration: 0.11, type: 'triangle' }
  ], 0.075, 0.22);
};

export const playLineClearSound = (clearedLines = 1): void => {
  const count = Math.max(1, Math.min(4, Math.floor(clearedLines)));
  const notes = [440, 554.37, 659.25, 880].slice(0, count + 1);
  playTones(notes.map((frequency, index) => ({ frequency, offset: index * 0.055, duration: 0.14, type: 'triangle' })), 0.13, 0.18 + count * 0.055);
};
