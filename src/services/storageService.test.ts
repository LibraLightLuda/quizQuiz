import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearAllLearningRecords, DEFAULT_SETTINGS, loadHistory, loadSettings, saveSession, saveSettings } from './storageService';
import type { SessionSummary } from '../domain/types';

describe('로컬 저장', () => {
  beforeEach(() => localStorage.clear());

  it('설정을 저장하고 다시 불러온다', () => {
    const settings = { ...DEFAULT_SETTINGS, sound: false };
    expect(saveSettings(settings)).toBe(true);
    expect(loadSettings().sound).toBe(false);
  });

  it('손상된 JSON은 기본값으로 복구한다', () => {
    localStorage.setItem('numbercal.settings.v1', '{broken');
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('이전 새싹 설정은 쉬움으로 옮기고 문제 수·시간 설정은 제거한다', () => {
    localStorage.setItem('numbercal.settings.v1', JSON.stringify({
      ...DEFAULT_SETTINGS,
      lastConfig: { subject: 'english', mode: 'en-fill', difficulty: 'sprout', length: 5, pace: 'fast' }
    }));
    expect(loadSettings().lastConfig).toEqual({ subject: 'english', mode: 'en-fill', difficulty: 'easy' });
  });

  it('최근 완료 기록은 20개만 유지한다', () => {
    const make = (id: number): SessionSummary => ({
      id: String(id), completedAt: new Date().toISOString(), config: DEFAULT_SETTINGS.lastConfig,
      correctCount: 1, incorrectCount: 0, timeoutCount: 0, totalCount: 1, averageResponseMs: 100
    });
    let history: SessionSummary[] = [];
    for (let index = 0; index < 25; index += 1) history = saveSession(make(index), history).history;
    expect(loadHistory()).toHaveLength(20);
    expect(loadHistory()[0].id).toBe('24');
  });

  it('잘못된 모드나 손상된 기록 항목만 안전하게 버린다', () => {
    localStorage.setItem('numbercal.settings.v1', JSON.stringify({
      ...DEFAULT_SETTINGS,
      lastConfig: { ...DEFAULT_SETTINGS.lastConfig, mode: 'not-a-mode' }
    }));
    expect(loadSettings().lastConfig).toEqual(DEFAULT_SETTINGS.lastConfig);

    localStorage.setItem('numbercal.history.v1', JSON.stringify({
      schemaVersion: 1,
      sessions: [
        { id: 'broken', completedAt: 'not-a-date', config: DEFAULT_SETTINGS.lastConfig },
        {
          id: 'ok', completedAt: new Date().toISOString(), config: DEFAULT_SETTINGS.lastConfig,
          correctCount: 1, incorrectCount: 0, timeoutCount: 0, totalCount: 1, averageResponseMs: 100
        }
      ]
    }));
    expect(loadHistory().map((item) => item.id)).toEqual(['ok']);
  });

  it('저장소 오류가 앱을 중단시키지 않는다', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('blocked'); });
    expect(saveSettings(DEFAULT_SETTINGS)).toBe(false);
    spy.mockRestore();
  });

  it('설정과 진행 중인 놀이를 남기고 모든 완료 기록만 지운다', () => {
    localStorage.setItem('numbercal.history.v1', '{}');
    localStorage.setItem('numbercal.sudoku.records.v1', '{}');
    localStorage.setItem('numbercal.memory.records.v1', '{}');
    localStorage.setItem('numbercal.story.records.v1', '{}');
    localStorage.setItem('numbercal.balance.records.v1', '{}');
    localStorage.setItem('numbercal.number-path.records.v1', '{}');
    localStorage.setItem('numbercal.balance.progress.v1', '{"playing":true}');
    localStorage.setItem('numbercal.number-path.progress.v1', '{"playing":true}');
    localStorage.setItem('numbercal.settings.v1', JSON.stringify(DEFAULT_SETTINGS));
    expect(clearAllLearningRecords()).toBe(true);
    expect(localStorage.getItem('numbercal.history.v1')).toBeNull();
    expect(localStorage.getItem('numbercal.balance.records.v1')).toBeNull();
    expect(localStorage.getItem('numbercal.number-path.records.v1')).toBeNull();
    expect(localStorage.getItem('numbercal.balance.progress.v1')).not.toBeNull();
    expect(localStorage.getItem('numbercal.number-path.progress.v1')).not.toBeNull();
    expect(localStorage.getItem('numbercal.settings.v1')).not.toBeNull();
  });
});
