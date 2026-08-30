export type HapticFeedback = 'snap' | 'invalid' | 'line-clear' | 'complete';

const patterns: Record<HapticFeedback, number | number[]> = {
  snap: 18,
  invalid: [18, 35, 18],
  'line-clear': [24, 28, 46],
  complete: [24, 30, 65]
};

export const playHapticFeedback = (feedback: HapticFeedback, enabled = true): boolean => {
  if (!enabled || typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return false;
  try {
    return navigator.vibrate(patterns[feedback]);
  } catch {
    return false;
  }
};
