export type AppLocale = 'ko' | 'en';
export type LocalePreference = 'system' | AppLocale;

export const LOCALE_STORAGE_KEY = 'numbercal.locale.v1';

const supportedPreferences: readonly LocalePreference[] = ['system', 'ko', 'en'];

export const detectAppLocale = (languages: readonly string[] | undefined): AppLocale => {
  const language = languages?.find(Boolean)?.toLowerCase() ?? '';
  return language === 'ko' || language.startsWith('ko-') ? 'ko' : 'en';
};
export const resolveAppLocale = (
  preference: LocalePreference,
  languages: readonly string[] | undefined
): AppLocale => preference === 'system' ? detectAppLocale(languages) : preference;

export const readLocalePreference = (storage: Pick<Storage, 'getItem'> | undefined): LocalePreference => {
  try {
    const value = storage?.getItem(LOCALE_STORAGE_KEY);
    return supportedPreferences.includes(value as LocalePreference) ? value as LocalePreference : 'system';
  } catch {
    return 'system';
  }
};

export const writeLocalePreference = (
  storage: Pick<Storage, 'setItem'> | undefined,
  preference: LocalePreference
): boolean => {
  try {
    storage?.setItem(LOCALE_STORAGE_KEY, preference);
    return true;
  } catch {
    return false;
  }
};
