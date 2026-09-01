import { describe, expect, it, vi } from 'vitest';
import { detectAppLocale, readLocalePreference, resolveAppLocale, writeLocalePreference } from './locale';

describe('app locale', () => {
  it('uses Korean only for a Korean device locale and defaults global devices to English', () => {
    expect(detectAppLocale(['ko-KR'])).toBe('ko');
    expect(detectAppLocale(['ko'])).toBe('ko');
    expect(detectAppLocale(['en-US'])).toBe('en');
    expect(detectAppLocale(['ja-JP'])).toBe('en');
    expect(detectAppLocale(undefined)).toBe('en');
  });

  it('lets an explicit choice override the device language', () => {
    expect(resolveAppLocale('ko', ['en-US'])).toBe('ko');
    expect(resolveAppLocale('en', ['ko-KR'])).toBe('en');
    expect(resolveAppLocale('system', ['ko-KR'])).toBe('ko');
  });

  it('recovers corrupted storage and survives unavailable storage', () => {
    expect(readLocalePreference({ getItem: () => 'fr' })).toBe('system');
    expect(readLocalePreference({ getItem: () => { throw new Error('blocked'); } })).toBe('system');
    expect(writeLocalePreference({ setItem: vi.fn() }, 'en')).toBe(true);
    expect(writeLocalePreference({ setItem: () => { throw new Error('full'); } }, 'ko')).toBe(false);
  });
});
