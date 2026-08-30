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
