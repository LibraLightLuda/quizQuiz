let voices: SpeechSynthesisVoice[] = [];

const updateVoices = (): void => {
  try {
    if ('speechSynthesis' in window) voices = window.speechSynthesis.getVoices();
  } catch {
    voices = [];
  }
};

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  updateVoices();
  window.speechSynthesis.addEventListener?.('voiceschanged', updateVoices);
}

export const speechSupported = (): boolean =>
  typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

export const cancelSpeech = (): void => {
  try {
    if (speechSupported()) window.speechSynthesis.cancel();
  } catch {
    // 음성 기능 실패는 학습 흐름을 막지 않는다.
  }
};

export const speak = (text: string, lang: 'ko-KR' | 'en-US'): Promise<'ended' | 'error' | 'timeout'> => {
  if (!speechSupported()) return Promise.resolve('error');
  cancelSpeech();

  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = lang === 'ko-KR' ? 0.9 : 0.85;
    utterance.pitch = 1;
    utterance.volume = 0.9;
    const exact = voices.find((voice) => voice.lang.toLowerCase() === lang.toLowerCase());
    const family = voices.find((voice) => voice.lang.toLowerCase().startsWith(lang.slice(0, 2).toLowerCase()));
    utterance.voice = exact ?? family ?? null;

    let settled = false;
    const finish = (result: 'ended' | 'error' | 'timeout') => {
      if (settled) return;
      settled = true;
      resolve(result);
    };
    utterance.onend = () => finish('ended');
    utterance.onerror = () => finish('error');
    try {
      window.speechSynthesis.speak(utterance);
      window.setTimeout(() => finish('timeout'), 4000);
    } catch {
      finish('error');
    }
  });
};
