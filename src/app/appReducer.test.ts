import { describe, expect, it } from 'vitest';
import { appReducer, createInitialState } from './appReducer';
import { DEFAULT_SETTINGS } from '../services/storageService';
import { generateMathQuestion } from '../domain/mathGenerator';
import { SeededRandom } from '../services/randomService';
import { QUESTION_TIME_MS } from '../domain/difficulty';
import { generateLanguageQuestion } from '../domain/languageGenerator';

const makeQuestion = () => generateMathQuestion({ mode: 'math-add', difficulty: 'easy', recentSignatures: [], random: new SeededRandom(9) });

describe('학습 상태 reducer', () => {
  it('연타와 timeout 경합에서도 답을 한 번만 확정한다', () => {
    const question = makeQuestion();
    let state = createInitialState(DEFAULT_SETTINGS, []);
    state = appReducer(state, { type: 'START_SESSION', question, config: DEFAULT_SETTINGS.lastConfig });
    state = appReducer(state, { type: 'READY', questionId: question.id, now: 100 });
    state = appReducer(state, { type: 'RESOLVE', questionId: question.id, optionId: question.correctOptionId, now: 200, praise: '정답!', gentle: '괜찮아요!' });
    state = appReducer(state, { type: 'RESOLVE', questionId: question.id, optionId: question.correctOptionId, now: 201, praise: '정답!', gentle: '괜찮아요!' });
    state = appReducer(state, { type: 'RESOLVE', questionId: question.id, optionId: null, now: 1100, deadlineExpired: true, praise: '정답!', gentle: '괜찮아요!' });
    expect(state.session?.answers).toHaveLength(1);
    expect(state.session?.answers[0].resolution).toBe('correct');
    expect(state.session?.questionStatus).toBe('feedback');
  });

  it('deadline 뒤 선택은 timeout으로 확정한다', () => {
    const question = makeQuestion();
    let state = createInitialState(DEFAULT_SETTINGS, []);
    state = appReducer(state, { type: 'START_SESSION', question, config: DEFAULT_SETTINGS.lastConfig });
    state = appReducer(state, { type: 'READY', questionId: question.id, now: 100 });
    state = appReducer(state, { type: 'RESOLVE', questionId: question.id, optionId: question.correctOptionId, now: 101 + QUESTION_TIME_MS, praise: '정답!', gentle: '괜찮아요!' });
    expect(state.session?.answers[0].resolution).toBe('timeout');
    expect(state.session?.reviewItems[0]).toEqual(expect.objectContaining({ resolution: 'timeout', selectedAnswer: null }));
  });

  it('deadline과 같은 시각의 선택은 정답으로 인정한다', () => {
    const question = makeQuestion();
    let state = createInitialState(DEFAULT_SETTINGS, []);
    state = appReducer(state, { type: 'START_SESSION', question, config: DEFAULT_SETTINGS.lastConfig });
    state = appReducer(state, { type: 'READY', questionId: question.id, now: 100 });
    state = appReducer(state, { type: 'RESOLVE', questionId: question.id, optionId: question.correctOptionId, now: 100 + QUESTION_TIME_MS, praise: '정답!', gentle: '괜찮아요!' });
    expect(state.session?.answers[0].resolution).toBe('correct');
  });

  it('수학 오답의 문제와 내 답과 정답을 결과 복습용으로 보관한다', () => {
    const question = makeQuestion();
    const wrongOption = question.options.find((option) => option.id !== question.correctOptionId)!;
    const correctOption = question.options.find((option) => option.id === question.correctOptionId)!;
    let state = createInitialState(DEFAULT_SETTINGS, []);
    state = appReducer(state, { type: 'START_SESSION', question, config: DEFAULT_SETTINGS.lastConfig });
    state = appReducer(state, { type: 'READY', questionId: question.id, now: 100 });
    state = appReducer(state, { type: 'RESOLVE', questionId: question.id, optionId: wrongOption.id, now: 200, praise: '정답!', gentle: '괜찮아요!' });
    expect(state.session?.reviewItems).toEqual([expect.objectContaining({
      prompt: question.prompt,
      selectedAnswer: wrongOption.label,
      correctAnswer: correctOption.label,
      explanation: question.explanation,
      resolution: 'incorrect'
    })]);
    state = appReducer(state, {
      type: 'ADVANCE', questionId: question.id, nextQuestion: null,
      summary: {
        id: 'review-session', completedAt: '2026-08-22T00:00:00.000Z', config: DEFAULT_SETTINGS.lastConfig,
        correctCount: 0, incorrectCount: 1, timeoutCount: 0, totalCount: 1, averageResponseMs: 100
      }
    });
    expect(state.screen).toBe('result');
    expect(state.latestReview).toHaveLength(1);
  });

  it('언어 오답도 완성된 낱말과 함께 결과 복습용으로 보관한다', () => {
    const question = generateLanguageQuestion({
      mode: 'en-fill', difficulty: 'easy', recentSignatures: [], random: new SeededRandom(31)
    });
    const wrongOption = question.options.find((option) => option.id !== question.correctOptionId)!;
    const config = { subject: 'english' as const, mode: 'en-fill' as const, difficulty: 'easy' as const, length: 5 as const, theme: 'animals' as const };
    let state = createInitialState(DEFAULT_SETTINGS, []);
    state = appReducer(state, { type: 'START_SESSION', question, config });
    state = appReducer(state, { type: 'READY', questionId: question.id, now: 100 });
    state = appReducer(state, {
      type: 'RESOLVE', questionId: question.id, optionId: wrongOption.id, now: 200,
      praise: '정답!', gentle: '괜찮아요!'
    });
    expect(state.session?.reviewItems).toEqual([expect.objectContaining({
      subject: 'english', wordId: question.metadata?.wordId, correctAnswer: question.explanation
    })]);
  });

  it('timeout이 먼저 확정되면 뒤따른 선택을 무시한다', () => {
    const question = makeQuestion();
    let state = createInitialState(DEFAULT_SETTINGS, []);
    state = appReducer(state, { type: 'START_SESSION', question, config: DEFAULT_SETTINGS.lastConfig });
    state = appReducer(state, { type: 'READY', questionId: question.id, now: 100 });
    state = appReducer(state, { type: 'RESOLVE', questionId: question.id, optionId: null, now: 101 + QUESTION_TIME_MS, deadlineExpired: true, praise: '정답!', gentle: '괜찮아요!' });
    state = appReducer(state, { type: 'RESOLVE', questionId: question.id, optionId: question.correctOptionId, now: 101 + QUESTION_TIME_MS, praise: '정답!', gentle: '괜찮아요!' });
    expect(state.session?.answers).toHaveLength(1);
    expect(state.session?.answers[0].resolution).toBe('timeout');
  });

  it('이전 문제 ID의 이벤트를 무시한다', () => {
    const question = makeQuestion();
    let state = createInitialState(DEFAULT_SETTINGS, []);
    state = appReducer(state, { type: 'START_SESSION', question, config: DEFAULT_SETTINGS.lastConfig });
    state = appReducer(state, { type: 'READY', questionId: 'old-question', now: 100 });
    expect(state.session?.questionStatus).toBe('presenting');
    expect(state.session?.answers).toHaveLength(0);
  });

  it('숨김 시간은 응답 시간에서 제외한다', () => {
    const question = makeQuestion();
    let state = createInitialState(DEFAULT_SETTINGS, []);
    state = appReducer(state, { type: 'START_SESSION', question, config: DEFAULT_SETTINGS.lastConfig });
    state = appReducer(state, { type: 'READY', questionId: question.id, now: 100 });
    state = appReducer(state, { type: 'PAUSE', now: 400 });
    state = appReducer(state, { type: 'RESUME', now: 5400 });
    state = appReducer(state, { type: 'RESOLVE', questionId: question.id, optionId: question.correctOptionId, now: 5600, praise: '정답!', gentle: '괜찮아요!' });
    expect(state.session?.answers[0].responseMs).toBe(500);
  });

  it('피드백 중 오래된 다음 문제 콜백과 READY 이벤트를 무시한다', () => {
    const question = makeQuestion();
    let state = createInitialState(DEFAULT_SETTINGS, []);
    state = appReducer(state, { type: 'START_SESSION', question, config: DEFAULT_SETTINGS.lastConfig });
    state = appReducer(state, { type: 'READY', questionId: question.id, now: 100 });
    state = appReducer(state, { type: 'RESOLVE', questionId: question.id, optionId: question.correctOptionId, now: 200, praise: '정답!', gentle: '괜찮아요!' });
    const before = state;
    state = appReducer(state, { type: 'ADVANCE', questionId: 'old-question', nextQuestion: makeQuestion() });
    state = appReducer(state, { type: 'READY', questionId: question.id, now: 300 });
    expect(state).toBe(before);
    expect(state.session?.answers).toHaveLength(1);
  });
});
