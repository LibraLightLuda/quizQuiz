import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createLearningRecordTransfer, parseLearningRecordTransfer, restoreLearningRecordTransfer,
  serializeLearningRecordTransfer
} from './learningRecordTransferService';

describe('학습 기록 내보내기와 가져오기', () => {
  beforeEach(() => localStorage.clear());

  it('완료 기록만 버전형 파일로 만들고 설정·진행 중 놀이는 제외한다', () => {
    localStorage.setItem('numbercal.history.v1', JSON.stringify({ schemaVersion: 1, sessions: [{ id: 'session-1' }] }));
    localStorage.setItem('numbercal.balance.progress.v1', JSON.stringify({ schemaVersion: 1, playing: true }));
    const text = serializeLearningRecordTransfer(new Date('2026-08-29T00:00:00.000Z'));
    const parsed = parseLearningRecordTransfer(text);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.preview.recentSessions).toBe(1);
    expect(parsed.transfer.records['numbercal.balance.records.v1']).toBeNull();
    expect(text).not.toContain('balance.progress');
  });

  it('손상되었거나 다른 형식의 파일은 복원하지 않는다', () => {
    expect(parseLearningRecordTransfer('{broken').ok).toBe(false);
    expect(parseLearningRecordTransfer(JSON.stringify({ schemaVersion: 1 })).ok).toBe(false);
  });

  it('빈칸 정원 키가 없던 이전 v1 기록 파일도 빈 기록으로 불러온다', () => {
    const transfer = createLearningRecordTransfer();
    delete (transfer.records as Partial<typeof transfer.records>)['numbercal.block-garden.records.v1'];
    const parsed = parseLearningRecordTransfer(JSON.stringify(transfer));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.transfer.records['numbercal.block-garden.records.v1']).toBeNull();
  });

  it('미리보기 뒤 전체 기록 묶음을 교체하고 없는 기록은 남기지 않는다', () => {
    localStorage.setItem('numbercal.history.v1', JSON.stringify({ schemaVersion: 1, sessions: [{ id: 'old' }] }));
    localStorage.setItem('numbercal.memory.records.v1', JSON.stringify({ schemaVersion: 1, lastMode: 'mixed' }));
    const transfer = createLearningRecordTransfer(new Date('2026-08-29T00:00:00.000Z'));
    transfer.records['numbercal.history.v1'] = { schemaVersion: 1, sessions: [{ id: 'new' }] };
    transfer.records['numbercal.memory.records.v1'] = null;
    expect(restoreLearningRecordTransfer(transfer)).toBe(true);
    expect(localStorage.getItem('numbercal.history.v1')).toContain('new');
    expect(localStorage.getItem('numbercal.memory.records.v1')).toBeNull();
  });

  it('저장 중 실패하면 이전 기록으로 되돌린다', () => {
    localStorage.setItem('numbercal.history.v1', JSON.stringify({ schemaVersion: 1, sessions: [{ id: 'old' }] }));
    const transfer = createLearningRecordTransfer();
    transfer.records['numbercal.history.v1'] = { schemaVersion: 1, sessions: [{ id: 'new' }] };
    transfer.records['numbercal.language-mastery.v1'] = { schemaVersion: 1, entries: [] };
    const original = Storage.prototype.setItem;
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key: string, value: string) {
      if (key === 'numbercal.language-mastery.v1') throw new DOMException('blocked');
      return original.call(this, key, value);
    });
    expect(restoreLearningRecordTransfer(transfer)).toBe(false);
    expect(localStorage.getItem('numbercal.history.v1')).toContain('old');
    spy.mockRestore();
  });
});
