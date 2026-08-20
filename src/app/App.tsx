import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { appReducer, createInitialState } from './appReducer';
import { difficultyInfo, DIFFICULTIES, modeInfo, modesForSubject, QUESTION_TIME_MS, QUESTION_TIME_SECONDS, SESSION_LENGTH, subjectInfo } from '../domain/difficulty';
import type { Mode, Question, SessionSummary, Settings, Subject } from '../domain/types';
import { generateQuestion } from '../domain/questionFactory';
import { listeningFallbackMode } from '../domain/languageGenerator';
import { CryptoRandom, shuffle } from '../services/randomService';
import { cancelSpeech, speak, speechSupported } from '../services/speechService';
import { playSuccessSound, unlockAudio } from '../services/soundService';
import { clearHistory, loadHistory, loadSettings, saveSession, saveSettings } from '../services/storageService';
import SudokuMode from '../sudoku/SudokuMode';
import MemoryMode from '../memory/MemoryMode';
import StoryMode from '../story/StoryMode';
import '../styles/global.css';

const random = new CryptoRandom();
const praiseMessages = ['잘했어요!', '정답이에요!', '대단해요!', '멋져요!', '최고예요!', '한 문제 더!'];
const gentleMessages = ['괜찮아요!', '다음 문제도 해봐요!', '조금만 더 생각해봐요!', '차근차근 잘하고 있어요!'];
const makeMessagePicker = (values: readonly string[]) => {
  let bag: string[] = [];
  let previous = '';
  return (): string => {
    if (!bag.length) {
      bag = shuffle(random, values);
      if (bag.length > 1 && bag[0] === previous) [bag[0], bag[1]] = [bag[1], bag[0]];
    }
    const message = bag.shift()!;
    previous = message;
    return message;
  };
};
const pickPraise = makeMessagePicker(praiseMessages);
const pickGentle = makeMessagePicker(gentleMessages);

const feedbackDelay = (correct: boolean): number => correct ? 500 : 650;

const subjectForMode = (mode: Mode): Subject => modeInfo[mode].subject;

function App() {
  const [state, dispatch] = useReducer(appReducer, undefined, () => createInitialState(loadSettings(), loadHistory()));
  const [sudokuOpen, setSudokuOpen] = useState(false);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [storyOpen, setStoryOpen] = useState(false);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const [timerAnnouncement, setTimerAnnouncement] = useState('');
  const [showExit, setShowExit] = useState(false);
  const [showResume, setShowResume] = useState(false);
  const [speechState, setSpeechState] = useState<'idle' | 'speaking' | 'error'>('idle');
  const [storageWarning, setStorageWarning] = useState(false);
  const [generationError, setGenerationError] = useState('');
  const [typedAnswer, setTypedAnswer] = useState('');
  const [reducedMotion, setReducedMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  const inputLock = useRef(false);
  const activeSpeechQuestion = useRef<string | null>(null);
  const speechRequestToken = useRef(0);
  const speechLock = useRef(false);
  const advancedQuestions = useRef(new Set<string>());
  const feedbackEffects = useRef(new Set<string>());
  const questionHeading = useRef<HTMLHeadingElement>(null);
  const announcedTimerThresholds = useRef(new Set<number>());

  const {
    needRefresh: [needRefresh],
    updateServiceWorker
  } = useRegisterSW({ onRegisterError: () => undefined });

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
    media.addEventListener?.('change', onChange);
    return () => media.removeEventListener?.('change', onChange);
  }, []);

  useEffect(() => {
    if (!saveSettings(state.settings)) setStorageWarning(true);
  }, [state.settings]);

  useEffect(() => {
    inputLock.current = false;
    announcedTimerThresholds.current.clear();
    setTimerAnnouncement('');
    setTypedAnswer('');
    speechRequestToken.current += 1;
    speechLock.current = false;
    activeSpeechQuestion.current = null;
    cancelSpeech();
    setSpeechState('idle');
    if (state.session?.currentQuestion.id) questionHeading.current?.focus();
  }, [state.session?.currentQuestion.id]);

  const playSpeech = useCallback(async (question: Question) => {
    if (!question.speech || !state.settings.tts || !speechSupported()) {
      setSpeechState('error');
      return 'error' as const;
    }
    if (speechLock.current && activeSpeechQuestion.current === question.id) return 'timeout' as const;
    speechLock.current = true;
    const requestToken = ++speechRequestToken.current;
    activeSpeechQuestion.current = question.id;
    setSpeechState('speaking');
    const result = await speak(question.speech.text, question.speech.lang);
    if (speechRequestToken.current !== requestToken || activeSpeechQuestion.current !== question.id) return result;
    speechLock.current = false;
    setSpeechState(result === 'ended' ? 'idle' : 'error');
    return result;
  }, [state.settings.tts]);

  const cancelActiveSpeech = useCallback(() => {
    speechRequestToken.current += 1;
    speechLock.current = false;
    activeSpeechQuestion.current = null;
    cancelSpeech();
    setSpeechState('idle');
  }, []);

  useEffect(() => {
    const session = state.session;
    if (!session || session.questionStatus !== 'presenting' || session.paused) return;
    let cancelled = false;
    const ready = async () => {
      if (session.currentQuestion.kind === 'listening') await playSpeech(session.currentQuestion);
      if (cancelled) return;
      dispatch({
        type: 'READY', questionId: session.currentQuestion.id, now: performance.now()
      });
    };
    void ready();
    return () => { cancelled = true; };
  }, [playSpeech, state.session]);

  useEffect(() => {
    const session = state.session;
    if (!session || session.questionStatus !== 'answering' || session.paused || session.deadline === null) {
      setRemainingMs(session?.remainingMs ?? null);
      return;
    }
    const tick = () => {
      const left = Math.max(0, session.deadline! - performance.now());
      setRemainingMs(left);
      const seconds = Math.ceil(left / 1000);
      if ((seconds === 10 || seconds === 5) && !announcedTimerThresholds.current.has(seconds)) {
        announcedTimerThresholds.current.add(seconds);
        setTimerAnnouncement(`${seconds}초 남았어요.`);
      }
      if (left <= 0 && !document.hidden) {
        dispatch({
          type: 'RESOLVE', questionId: session.currentQuestion.id, optionId: null, now: performance.now(),
          deadlineExpired: true, praise: pickPraise(), gentle: pickGentle()
        });
      }
    };
    tick();
    const interval = window.setInterval(tick, 200);
    return () => window.clearInterval(interval);
  }, [state.session]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        cancelActiveSpeech();
        dispatch({ type: 'PAUSE', now: performance.now() });
      } else if (state.session?.paused) {
        setShowResume(true);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [cancelActiveSpeech, state.session?.paused]);

  useEffect(() => {
    const session = state.session;
    if (!session || session.questionStatus !== 'feedback' || session.paused || showExit || showResume) return;
    const questionId = session.currentQuestion.id;
    if (!feedbackEffects.current.has(questionId)) {
      feedbackEffects.current.add(questionId);
      if (session.resolution === 'correct' && state.settings.sound) playSuccessSound();
    }
    const timer = window.setTimeout(() => {
      if (advancedQuestions.current.has(questionId)) return;
      advancedQuestions.current.add(questionId);
      const isLast = session.answers.length >= SESSION_LENGTH;
      if (isLast) {
        const correctCount = session.answers.filter((answer) => answer.resolution === 'correct').length;
        const incorrectCount = session.answers.filter((answer) => answer.resolution === 'incorrect').length;
        const timeoutCount = session.answers.filter((answer) => answer.resolution === 'timeout').length;
        const averageResponseMs = Math.round(session.answers.reduce((sum, answer) => sum + answer.responseMs, 0) / session.answers.length);
        const summary: SessionSummary = {
          id: session.id, completedAt: new Date().toISOString(), config: session.config,
          correctCount, incorrectCount, timeoutCount, totalCount: session.answers.length, averageResponseMs
        };
        const saved = saveSession(summary, state.history);
        if (!saved.saved) setStorageWarning(true);
        dispatch({ type: 'RESTORE_HISTORY', history: saved.history });
        dispatch({ type: 'ADVANCE', questionId, nextQuestion: null, summary });
        return;
      }
      try {
        const currentCorrectIndex = session.currentQuestion.options.findIndex(
          (option) => option.id === session.currentQuestion.correctOptionId
        );
        const recentCorrectIndices = [...session.recentCorrectIndices, currentCorrectIndex].slice(-2);
        const nextQuestion = generateQuestion(
          session.config, session.recentSignatures, session.recentAnswers, random, recentCorrectIndices
        );
        dispatch({ type: 'ADVANCE', questionId, nextQuestion });
      } catch {
        setGenerationError('이 단계의 문제를 준비하지 못했어요. 다른 단계를 골라 주세요.');
        dispatch({ type: 'SESSION_ERROR' });
      }
    }, feedbackDelay(session.resolution === 'correct'));
    return () => window.clearTimeout(timer);
  }, [showExit, showResume, state.history, state.session, state.settings.sound]);

  useEffect(() => () => {
    speechRequestToken.current += 1;
    cancelSpeech();
  }, []);

  const updateSettings = (patch: Partial<Settings>) => {
    const settings = { ...state.settings, ...patch, schemaVersion: 1 as const };
    dispatch({ type: 'UPDATE_SETTINGS', settings });
  };

  const startSession = async () => {
    await unlockAudio();
    const normalizedMode = !state.settings.tts && state.draftConfig.mode.endsWith('listen')
      ? (state.draftConfig.subject === 'korean' ? 'ko-fill' : 'en-fill') as Mode
      : state.draftConfig.mode;
    const config = { ...state.draftConfig, mode: normalizedMode };
    dispatch({ type: 'UPDATE_CONFIG', patch: { mode: normalizedMode } });
    updateSettings({ lastConfig: config });
    try {
      const question = generateQuestion(config, [], [], random);
      advancedQuestions.current.clear();
      feedbackEffects.current.clear();
      setGenerationError('');
      dispatch({ type: 'START_SESSION', question, config });
    } catch {
      setGenerationError('이 단계의 문제를 준비하지 못했어요. 다른 단계를 골라 주세요.');
    }
  };

  const selectOption = (optionId: string) => {
    const session = state.session;
    if (!session || session.questionStatus !== 'answering' || session.paused || inputLock.current) return;
    inputLock.current = true;
    dispatch({
      type: 'RESOLVE', questionId: session.currentQuestion.id, optionId, now: performance.now(),
      praise: pickPraise(), gentle: pickGentle()
    });
  };

  const submitTypedAnswer = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const session = state.session;
    const submitted = typedAnswer.trim().normalize('NFC').toLocaleLowerCase();
    if (!session || session.config.difficulty !== 'challenge' || !submitted
      || session.questionStatus !== 'answering' || session.paused || inputLock.current) return;
    const correctOption = session.currentQuestion.options.find(
      (option) => option.id === session.currentQuestion.correctOptionId
    );
    const expected = String(correctOption?.value ?? '').trim().normalize('NFC').toLocaleLowerCase();
    inputLock.current = true;
    dispatch({
      type: 'RESOLVE', questionId: session.currentQuestion.id,
      optionId: submitted === expected ? session.currentQuestion.correctOptionId : null,
      now: performance.now(), praise: pickPraise(), gentle: pickGentle()
    });
  };

  const replay = () => {
    if (state.session?.currentQuestion.speech) void playSpeech(state.session.currentQuestion);
  };

  const switchToFillQuestion = () => {
    const session = state.session;
    if (!session || session.currentQuestion.kind !== 'listening') return;
    cancelActiveSpeech();
    const mode = listeningFallbackMode(session.config.mode);
    const config = { ...session.config, mode };
    try {
      const question = generateQuestion(
        config, session.recentSignatures.slice(0, -1), session.recentAnswers, random, session.recentCorrectIndices
      );
      dispatch({ type: 'REPLACE_QUESTION', questionId: session.currentQuestion.id, question, config });
    } catch {
      setGenerationError('글자 문제를 준비하지 못했어요. 다른 단계를 골라 주세요.');
      dispatch({ type: 'SESSION_ERROR' });
    }
  };

  const requestExit = () => {
    dispatch({ type: 'PAUSE', now: performance.now() });
    cancelActiveSpeech();
    setShowExit(true);
  };

  const continueSession = async () => {
    const session = state.session;
    setShowExit(false);
    setShowResume(false);
    if (session?.paused && session.currentQuestion.kind === 'listening' && session.questionStatus === 'answering') {
      await playSpeech(session.currentQuestion);
    }
    dispatch({ type: 'RESUME', now: performance.now() });
  };

  const tryAgain = async () => {
    await unlockAudio();
    const config = state.latestResult?.config ?? state.draftConfig;
    dispatch({ type: 'UPDATE_CONFIG', patch: config });
    try {
      const question = generateQuestion(config, [], [], random);
      advancedQuestions.current.clear();
      feedbackEffects.current.clear();
      setGenerationError('');
      dispatch({ type: 'START_SESSION', question, config });
    } catch {
      setGenerationError('이 단계의 문제를 준비하지 못했어요. 다른 단계를 골라 주세요.');
      dispatch({ type: 'SELECT_MODE', mode: config.mode });
    }
  };

  const canListen = state.settings.tts && speechSupported();
  const activeAnimations = state.settings.animations && !reducedMotion;

  if (storyOpen) {
    return (
      <div className={`app-shell ${activeAnimations ? '' : 'reduce-motion'}`}>
        <StoryMode
          onExit={() => setStoryOpen(false)}
          soundEnabled={state.settings.sound}
          ttsEnabled={state.settings.tts}
          animationsEnabled={activeAnimations}
        />
      </div>
    );
  }

  if (memoryOpen) {
    return (
      <div className={`app-shell ${activeAnimations ? '' : 'reduce-motion'}`}>
        <MemoryMode
          onExit={() => setMemoryOpen(false)}
          soundEnabled={state.settings.sound}
          animationsEnabled={activeAnimations}
        />
      </div>
    );
  }

  if (sudokuOpen) {
    return (
      <div className={`app-shell ${activeAnimations ? '' : 'reduce-motion'}`}>
        <SudokuMode
          onExit={() => setSudokuOpen(false)}
          soundEnabled={state.settings.sound}
          animationsEnabled={activeAnimations}
        />
      </div>
    );
  }

  return (
    <div className={`app-shell ${activeAnimations ? '' : 'reduce-motion'}`}>
      {state.screen === 'home' && (
        <main className="screen home-screen">
          <header className="home-header">
            <button className="icon-button settings-button" onClick={() => dispatch({ type: 'OPEN_SETTINGS', from: 'home' })} aria-label="설정 열기">⚙️</button>
            <div className="brand-mark" aria-hidden="true"><span>＋</span><span>가</span><span>A</span></div>
            <p className="eyebrow">오늘도 즐겁게 한 문제씩</p>
            <h1>어린이 학습 놀이터</h1>
            <p className="lead">무엇을 배워 볼까요?</p>
          </header>
          <section className="subject-grid has-learning-games" aria-label="과목 선택">
            {(Object.keys(subjectInfo) as Subject[]).map((subject) => {
              const info = subjectInfo[subject];
              return (
                <button key={subject} className={`subject-card ${info.className}`} onClick={() => dispatch({ type: 'SELECT_SUBJECT', subject })}>
                  <span className="subject-icon" aria-hidden="true">{info.icon}</span>
                  <span className="subject-copy"><strong>{info.label}</strong><small>{info.description}</small></span>
                  <span className="arrow" aria-hidden="true">›</span>
                </button>
              );
            })}
            <button className="subject-card memory" onClick={() => setMemoryOpen(true)}>
              <span className="subject-icon" aria-hidden="true">🧠</span>
              <span className="subject-copy"><strong>기억력 챌린지</strong><small>뜻이 연결되는 카드를 찾아요</small></span>
              <span className="arrow" aria-hidden="true">›</span>
            </button>
            <button className="subject-card story" onClick={() => setStoryOpen(true)}>
              <span className="subject-icon" aria-hidden="true">📖</span>
              <span className="subject-copy"><strong>이야기 탐험대</strong><small>읽고 기억하며 생각해요</small></span>
              <span className="arrow" aria-hidden="true">›</span>
            </button>
            <button className="subject-card sudoku" onClick={() => setSudokuOpen(true)}>
              <span className="subject-icon" aria-hidden="true">▦</span>
              <span className="subject-copy"><strong>스도쿠</strong><small>숫자 규칙을 찾아요</small></span>
              <span className="arrow" aria-hidden="true">›</span>
            </button>
          </section>
          {state.history[0] ? (
            <aside className="recent-card" aria-label="최근 학습 결과">
              <span aria-hidden="true">⭐</span>
              <div><strong>최근에도 멋지게 해냈어요!</strong><small>{subjectInfo[state.history[0].config.subject].label} · {state.history[0].correctCount} / {state.history[0].totalCount}</small></div>
            </aside>
          ) : <p className="first-visit">처음이어도 괜찮아요. 좋아하는 과목을 눌러 보세요!</p>}
          {needRefresh && <UpdateNotice onUpdate={() => void updateServiceWorker(true)} />}
        </main>
      )}

      {state.screen === 'mode' && (
        <main className="screen selection-screen">
          <TopBar title={subjectInfo[state.draftConfig.subject].label} onBack={() => dispatch({ type: 'GO_HOME' })} />
          <section className="selection-heading"><p className="eyebrow">한 가지를 골라요</p><h1>어떻게 공부할까요?</h1></section>
          <div className="mode-grid">
            {modesForSubject(state.draftConfig.subject).map((mode) => {
              const info = modeInfo[mode];
              const listening = mode.endsWith('listen');
              const disabled = listening && !canListen;
              return (
                <button key={mode} className="mode-card" disabled={disabled} onClick={() => dispatch({ type: 'SELECT_MODE', mode })}>
                  <span className="mode-icon" aria-hidden="true">{info.icon}</span>
                  <span><strong>{info.label}</strong><small>{disabled ? '이 기기에서는 글자 문제를 이용해 주세요' : info.description}</small></span>
                  {!disabled && <span className="arrow" aria-hidden="true">›</span>}
                </button>
              );
            })}
          </div>
        </main>
      )}

      {state.screen === 'setup' && (
        <main className="screen setup-screen">
          <TopBar title={modeInfo[state.draftConfig.mode].label} onBack={() => dispatch({ type: 'SELECT_SUBJECT', subject: state.draftConfig.subject })} />
          <section className="selection-heading"><p className="eyebrow">내게 맞게 골라요</p><h1>어느 단계로 할까요?</h1></section>
          <div className="difficulty-grid" role="radiogroup" aria-label="난이도">
            {DIFFICULTIES.map((difficulty) => {
              const info = difficultyInfo[difficulty];
              return <ChoiceChip key={difficulty} selected={state.draftConfig.difficulty === difficulty} onClick={() => dispatch({ type: 'UPDATE_CONFIG', patch: { difficulty } })} label={info.label} detail={`${info.age} · ${difficulty === 'challenge' ? '정답 직접 입력' : `보기 ${info.optionCount}개`}`} />;
            })}
          </div>
          <section className="fixed-session-info" aria-label="학습 규칙">
            <div><span aria-hidden="true">✏️</span><small>항상</small><strong>{SESSION_LENGTH}문제</strong></div>
            <div><span aria-hidden="true">⏱</span><small>문제마다</small><strong>{QUESTION_TIME_SECONDS}초</strong></div>
          </section>
          <div className="start-summary">{difficultyInfo[state.draftConfig.difficulty].label} · {SESSION_LENGTH}문제 · 문제마다 {QUESTION_TIME_SECONDS}초</div>
          {generationError && <p className="settings-note warning" role="alert">{generationError}</p>}
          <button className="primary-button" onClick={() => void startSession()}>시작할래요 <span aria-hidden="true">→</span></button>
        </main>
      )}

      {state.screen === 'session' && state.session && (
        <main className="screen question-screen">
          <header className="question-header">
            <button className="icon-button" onClick={requestExit} aria-label="학습 나가기">✕</button>
            <div className="progress-copy"><strong>{subjectInfo[state.session.config.subject].label}</strong><span>{state.session.questionIndex + 1} / {SESSION_LENGTH}</span></div>
            <div className="progress-track" aria-label={`진행도 ${state.session.questionIndex + 1}/${SESSION_LENGTH}`}><span style={{ width: `${((state.session.questionIndex + 1) / SESSION_LENGTH) * 100}%` }} /></div>
          </header>
          {state.session.limitMs !== null && state.session.questionStatus === 'answering' && (
            <div className={`timer-card ${remainingMs !== null && remainingMs <= 5000 ? 'timer-low' : ''}`} aria-label={`남은 시간 ${Math.ceil((remainingMs ?? QUESTION_TIME_MS) / 1000)}초`}>
              <span className="timer-icon" aria-hidden="true">⏱</span>
              <span className="timer-copy"><small>남은 시간</small><strong>{Math.ceil((remainingMs ?? QUESTION_TIME_MS) / 1000)}초</strong></span>
              <span className="timer-bar"><i style={{ width: `${Math.max(0, ((remainingMs ?? QUESTION_TIME_MS) / QUESTION_TIME_MS) * 100)}%` }} /></span>
            </div>
          )}
          <section className="question-card">
            <p className="question-kicker">{state.session.currentQuestion.kind === 'listening' ? '귀를 쫑긋!' : state.session.config.difficulty === 'challenge' ? '정답을 직접 써 보세요' : '알맞은 답을 골라요'}</p>
            <h1 ref={questionHeading} tabIndex={-1} className={state.session.currentQuestion.kind === 'math' ? 'math-prompt' : 'word-prompt'}>{state.session.currentQuestion.prompt}</h1>
            {state.session.currentQuestion.hint && <p className="question-hint">{state.session.currentQuestion.hint}</p>}
            {state.session.currentQuestion.kind === 'listening' && (
              <button className={`listen-button ${speechState === 'speaking' ? 'is-speaking' : ''}`} onClick={replay} disabled={speechState === 'speaking'}>
                <span aria-hidden="true">{speechState === 'speaking' ? '〰️' : '🔊'}</span>{speechState === 'speaking' ? '듣는 중...' : '다시 듣기'}
              </button>
            )}
            {speechState === 'error' && state.session.currentQuestion.kind === 'listening' && <div className="speech-fallback"><p className="inline-notice">소리가 나지 않나요?</p><button className="small-button" onClick={switchToFillQuestion}>글자 문제로 바꾸기</button></div>}
          </section>
          {state.session.config.difficulty === 'challenge' ? (
            <form className="answer-form" onSubmit={submitTypedAnswer}>
              <label htmlFor="challenge-answer">내 정답</label>
              <div>
                <input id="challenge-answer" value={typedAnswer} onChange={(event) => setTypedAnswer(event.target.value)}
                  inputMode={state.session.currentQuestion.kind === 'math' ? 'numeric' : 'text'}
                  autoCapitalize="none" autoComplete="off" spellCheck={false}
                  placeholder={state.session.currentQuestion.kind === 'math' ? '숫자를 입력하세요' : '글자를 입력하세요'}
                  disabled={state.session.questionStatus !== 'answering' || state.session.paused} />
                <button type="submit" disabled={!typedAnswer.trim() || state.session.questionStatus !== 'answering' || state.session.paused}>정답 확인</button>
              </div>
            </form>
          ) : (
            <div className={`option-grid options-${state.session.currentQuestion.options.length}`} role="group" aria-label="보기">
              {state.session.currentQuestion.options.map((option) => {
                const selected = state.session?.selectedOptionId === option.id;
                const correct = state.session?.questionStatus === 'feedback' && option.id === state.session.currentQuestion.correctOptionId;
                const incorrect = state.session?.questionStatus === 'feedback' && selected && !correct;
                return (
                  <button key={option.id} className={`option-button ${selected ? 'selected' : ''} ${correct ? 'correct' : ''} ${incorrect ? 'incorrect' : ''}`}
                    disabled={state.session?.questionStatus !== 'answering' || state.session?.paused === true} onClick={() => selectOption(option.id)}>
                    <span>{option.label}</span>{correct && <b aria-label="정답">✓</b>}{incorrect && <b aria-label="선택한 답">•</b>}
                  </button>
                );
              })}
            </div>
          )}
          {state.session.questionStatus === 'feedback' && (
            <Feedback
              resolution={state.session.resolution!}
              text={state.session.feedbackText}
              explanation={state.session.currentQuestion.explanation}
              celebrate={activeAnimations && state.session.questionIndex % 3 === 0}
            />
          )}
          <div className="sr-only" aria-live="polite">{state.session.questionStatus === 'feedback' ? `${state.session.feedbackText} 정답은 ${state.session.currentQuestion.explanation}` : ''}</div>
          <div className="sr-only" aria-live="polite">{timerAnnouncement}</div>
        </main>
      )}

      {state.screen === 'result' && state.latestResult && (
        <main className="screen result-screen">
          <div className="result-burst" aria-hidden="true">★</div>
          <p className="eyebrow">오늘의 학습 끝!</p>
          <h1>{state.latestResult.correctCount} / {state.latestResult.totalCount}</h1>
          <p className="result-message">{resultMessage(state.latestResult.correctCount / state.latestResult.totalCount)}</p>
          <section className="result-stats" aria-label="학습 결과">
            <ResultStat icon="✓" label="맞힌 문제" value={`${state.latestResult.correctCount}개`} />
            <ResultStat icon="↗" label="다시 연습" value={`${state.latestResult.incorrectCount + state.latestResult.timeoutCount}개`} />
            <ResultStat icon="⏱" label="평균 시간" value={`${(state.latestResult.averageResponseMs / 1000).toFixed(1)}초`} />
          </section>
          {state.latestResult.timeoutCount > 0 && <p className="timeout-note">시간이 지난 문제 {state.latestResult.timeoutCount}개</p>}
          <div className="result-actions">
            <button className="primary-button" onClick={() => void tryAgain()}>같은 단계 한 번 더</button>
            <button className="secondary-button" onClick={() => dispatch({ type: 'SELECT_MODE', mode: state.latestResult!.config.mode })}>난이도 바꾸기</button>
            <button className="text-button" onClick={() => dispatch({ type: 'GO_HOME' })}>처음으로</button>
          </div>
          {needRefresh && <UpdateNotice onUpdate={() => void updateServiceWorker(true)} />}
        </main>
      )}

      {state.screen === 'settings' && (
        <main className="screen settings-screen">
          <TopBar title="설정" onBack={() => dispatch({ type: 'CLOSE_SETTINGS' })} />
          <section className="settings-panel">
            <ToggleRow icon="♪" label="효과음" detail="정답을 맞히면 짧은 소리가 나요" checked={state.settings.sound} onChange={(sound) => updateSettings({ sound })} />
            <ToggleRow icon="🔊" label="듣기 음성" detail="한국어와 영어 단어를 들려줘요" checked={state.settings.tts} onChange={(tts) => { if (!tts) cancelActiveSpeech(); updateSettings({ tts }); }} />
            <ToggleRow icon="✨" label="반짝이는 효과" detail="별과 축하 효과를 보여줘요" checked={state.settings.animations} onChange={(animations) => updateSettings({ animations })} />
          </section>
          {reducedMotion && <p className="settings-note">기기의 동작 줄이기 설정을 따르고 있어요.</p>}
          {storageWarning && <p className="settings-note warning">이 기기에는 설정이나 기록을 저장하지 못할 수 있어요.</p>}
          <section className="settings-panel danger-zone">
            <div><strong>최근 학습 기록</strong><small>{state.history.length}개가 저장되어 있어요</small></div>
            <button className="small-button" onClick={() => { if (window.confirm('최근 학습 기록을 모두 지울까요?')) { if (!clearHistory()) setStorageWarning(true); dispatch({ type: 'CLEAR_HISTORY' }); } }}>기록 지우기</button>
          </section>
          <p className="privacy-note">이름이나 개인정보는 모으지 않아요. 기록은 이 기기에만 저장돼요.</p>
        </main>
      )}

      {showExit && <ConfirmDialog title="여기까지 할까요?" message="지금 나가면 이번 기록은 저장되지 않아요." primary="계속 풀기" secondary="여기까지 하고 나가기" onPrimary={() => void continueSession()} onSecondary={() => { setShowExit(false); dispatch({ type: 'ABORT_SESSION' }); }} />}
      {showResume && <ConfirmDialog title="다시 시작할까요?" message="준비되면 계속하기를 눌러 주세요." primary="계속하기" onPrimary={() => void continueSession()} />}
    </div>
  );
}

function TopBar({ title, onBack }: { title: string; onBack: () => void }) {
  return <header className="top-bar"><button className="icon-button" onClick={onBack} aria-label="뒤로 가기">←</button><strong>{title}</strong><span className="top-spacer" /></header>;
}

function ChoiceChip({ selected, onClick, label, detail, compact = false }: { selected: boolean; onClick: () => void; label: string; detail?: string; compact?: boolean }) {
  return <button role="radio" aria-checked={selected} className={`choice-chip ${selected ? 'active' : ''} ${compact ? 'compact' : ''}`} onClick={onClick}><strong>{label}</strong>{detail && <small>{detail}</small>}<span aria-hidden="true">{selected ? '✓' : ''}</span></button>;
}

function Feedback({ resolution, text, explanation, celebrate }: { resolution: 'correct' | 'incorrect' | 'timeout'; text: string; explanation: string; celebrate: boolean }) {
  const correct = resolution === 'correct';
  return (
    <div className={`feedback-panel ${correct ? 'feedback-correct' : 'feedback-gentle'}`}>
      {correct && celebrate && <div className="confetti" aria-hidden="true">{['★', '●', '✦', '★', '●', '✦', '★', '●'].map((shape, index) => <i key={index}>{shape}</i>)}</div>}
      <span className="feedback-icon" aria-hidden="true">{correct ? '★' : resolution === 'timeout' ? '⏱' : '♥'}</span>
      <div><strong>{text}</strong>{!correct && <small>정답은 <b>{explanation}</b></small>}</div>
    </div>
  );
}

function ResultStat({ icon, label, value }: { icon: string; label: string; value: string }) {
  return <div><span aria-hidden="true">{icon}</span><small>{label}</small><strong>{value}</strong></div>;
}

function ToggleRow({ icon, label, detail, checked, onChange }: { icon: string; label: string; detail: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="toggle-row"><span className="toggle-icon" aria-hidden="true">{icon}</span><span><strong>{label}</strong><small>{detail}</small></span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><i aria-hidden="true" /></label>;
}

function ConfirmDialog({ title, message, primary, secondary, onPrimary, onSecondary }: { title: string; message: string; primary: string; secondary?: string; onPrimary: () => void; onSecondary?: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onPrimary();
        return;
      }
      if (event.key !== 'Tab') return;
      const buttons = Array.from(dialogRef.current?.querySelectorAll<HTMLButtonElement>('button') ?? []);
      if (!buttons.length) return;
      const first = buttons[0];
      const last = buttons.at(-1)!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [onPrimary]);

  return (
    <div className="modal-backdrop" role="presentation">
      <div ref={dialogRef} className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby="dialog-message">
        <span className="dialog-icon" aria-hidden="true">🌱</span>
        <h2 id="dialog-title">{title}</h2>
        <p id="dialog-message">{message}</p>
        <button autoFocus className="primary-button" onClick={onPrimary}>{primary}</button>
        {secondary && <button className="secondary-button" onClick={onSecondary}>{secondary}</button>}
      </div>
    </div>
  );
}

function UpdateNotice({ onUpdate }: { onUpdate: () => void }) {
  return <aside className="update-notice"><span>새 버전이 준비됐어요.</span><button onClick={onUpdate}>새로 보기</button></aside>;
}

const resultMessage = (score: number): string => {
  if (score >= 0.9) return '정말 멋지게 해냈어요!';
  if (score >= 0.7) return '아주 잘했어요!';
  if (score >= 0.4) return '차근차근 잘 풀었어요!';
  return '끝까지 해낸 게 멋져요!';
};

export default App;
