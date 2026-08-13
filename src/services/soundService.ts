let audioContext: AudioContext | null = null;

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
  if (!audioContext || audioContext.state !== 'running') return;
  const now = audioContext.currentTime;
  const gain = audioContext.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.16, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
  gain.connect(audioContext.destination);
  [523.25, 659.25].forEach((frequency, index) => {
    const oscillator = audioContext!.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    oscillator.connect(gain);
    oscillator.start(now + index * 0.08);
    oscillator.stop(now + 0.24);
  });
};
