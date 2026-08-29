import { englishWords } from '../data/englishWords';
import { koreanWords } from '../data/koreanWords';
import { skillDefinitions } from './skillData';
import type { EnglishWord, KoreanWord, SkillDefinition } from './types';

export const LANGUAGE_CONTENT_SCHEMA_VERSION = 1 as const;

export interface LanguageContentCatalog {
  schemaVersion: typeof LANGUAGE_CONTENT_SCHEMA_VERSION;
  koreanWords: readonly KoreanWord[];
  englishWords: readonly EnglishWord[];
  skills: readonly SkillDefinition[];
}

export const languageContentCatalog: LanguageContentCatalog = {
  schemaVersion: LANGUAGE_CONTENT_SCHEMA_VERSION,
  koreanWords,
  englishWords,
  skills: skillDefinitions
};
