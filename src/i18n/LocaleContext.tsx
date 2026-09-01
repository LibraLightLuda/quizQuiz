import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  readLocalePreference, resolveAppLocale, writeLocalePreference,
  type AppLocale, type LocalePreference
} from './locale';

type Translate = (korean: string, english: string) => string;

interface LocaleContextValue {
  locale: AppLocale;
  preference: LocalePreference;
  setPreference: (preference: LocalePreference) => void;
  t: Translate;
}

const defaultValue: LocaleContextValue = {
  locale: 'ko',
  preference: 'ko',
  setPreference: () => undefined,
  t: (korean) => korean
};

const LocaleContext = createContext<LocaleContextValue>(defaultValue);

const browserLanguages = (): readonly string[] => {
  if (typeof navigator === 'undefined') return ['en'];
  return navigator.languages?.length ? navigator.languages : [navigator.language];
};

const updateDocumentLanguage = (locale: AppLocale): void => {
  if (typeof document === 'undefined') return;
  const title = locale === 'ko' ? '어린이 학습 놀이터' : 'NumberCal Learning Playground';
  const description = locale === 'ko'
    ? '수학과 언어, 사고력 게임을 매일 즐기는 어린이 학습 앱'
    : 'A daily learning app for children with math, language, memory, stories, and logic games.';
  document.documentElement.lang = locale;
  document.documentElement.dir = 'ltr';
  document.title = title;
  document.querySelector<HTMLMetaElement>('meta[name="description"]')?.setAttribute('content', description);
  document.querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-title"]')?.setAttribute('content', locale === 'ko' ? '학습 놀이터' : 'NumberCal');
};

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<LocalePreference>(() =>
    readLocalePreference(typeof localStorage === 'undefined' ? undefined : localStorage)
  );
  const [systemLocale, setSystemLocale] = useState<AppLocale>(() => resolveAppLocale('system', browserLanguages()));
  const locale = preference === 'system' ? systemLocale : preference;

  useEffect(() => {
    const update = () => setSystemLocale(resolveAppLocale('system', browserLanguages()));
    window.addEventListener('languagechange', update);
    return () => window.removeEventListener('languagechange', update);
  }, []);

  useEffect(() => updateDocumentLanguage(locale), [locale]);

  const setPreference = useCallback((next: LocalePreference) => {
    setPreferenceState(next);
    writeLocalePreference(typeof localStorage === 'undefined' ? undefined : localStorage, next);
  }, []);
  const t = useCallback<Translate>((korean, english) => locale === 'ko' ? korean : english, [locale]);
  const value = useMemo(() => ({ locale, preference, setPreference, t }), [locale, preference, setPreference, t]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export const useLocale = (): LocaleContextValue => useContext(LocaleContext);
