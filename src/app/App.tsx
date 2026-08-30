import { lazy, Suspense, useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { appReducer, createInitialState } from './appReducer';
import type { ActiveSession } from './appState';
import { LanguageActivityRenderer } from './LanguageActivityRenderer';
import { difficultyInfo, DIFFICULTIES, languageJourneyInfo, learningThemeInfo, modeInfo, modesForSubject, QUESTION_TIME_MS, QUESTION_TIME_SECONDS, SESSION_LENGTHS, subjectInfo } from '../domain/difficulty';
import type { LanguageMode, LearningTheme, LessonPhase, Mode, Question, SessionConfig, SessionSummary, Settings, SpeechRate, Subject } from '../domain/types';
import { generateQuestion } from '../domain/questionFactory';
import { lessonPhaseAt, lessonPhaseLabel } from '../domain/lessonPlanner';
import { listeningFallbackMode } from '../domain/languageGenerator';
import { CryptoRandom, shuffle } from '../services/randomService';
import { cancelSpeech, speak, speechSupported } from '../services/speechService';
import { playSuccessSound, unlockAudio } from '../services/soundService';
import { clearAllLearningRecords, loadHistory, loadSettings, saveSession, saveSettings } from '../services/storageService';
import { loadLanguageMastery, recordLanguageAttempt, saveLanguageMastery } from '../services/languageMasteryService';
import { loadSkillMastery, recordSkillAttempt, saveSkillMastery } from '../services/skillMasteryService';
import {
  parseLearningRecordTransfer, restoreLearningRecordTransfer, serializeLearningRecordTransfer,
  type LearningRecordPreview, type LearningRecordTransfer
} from '../services/learningRecordTransferService';
import { planAdaptiveLesson } from '../domain/adaptiveLessonPlanner';
import { koreanWords } from '../data/koreanWords';
import { englishWords } from '../data/englishWords';
import { GuideCharacter } from '../visuals/GuideCharacter';
import { LearningIcon } from '../visuals/LearningIcon';
import { hasMathVisual, MathVisual } from '../visuals/MathVisual';
import { ConceptPicture } from '../visuals/ConceptPicture';
import { questionConceptIds } from '../visuals/visualAssets';
import { BalanceIcon } from '../visuals/BalanceIcon';
import { NumberPathIcon } from '../visuals/NumberPathIcon';
import { ShapeBlockIcon } from '../visuals/ShapeBlockIcon';
import { GrowthDashboard } from './GrowthDashboard';
import '../styles/global.css';

const random = new CryptoRandom();
const SudokuMode = lazy(() => import('../sudoku/SudokuMode'));
const MemoryMode = lazy(() => import('../memory/MemoryMode'));
const StoryMode = lazy(() => import('../story/StoryMode'));
const BalanceMode = lazy(() => import('../balance/BalanceMode'));
const NumberPathMode = lazy(() => import('../number-path/NumberPathMode'));
const ShapeBlockMode = lazy(() => import('../shape-block/ShapeBlockMode'));
const praiseMessages = ['잘했어요!', '정답이에요!', '대단해요!', '멋져요!', '최고예요!', '한 문제 더!'];
const gentleMessages = ['같이 찾아볼까요?', '다른 친구도 만나봐요!', '천천히 다시 볼까요?', '모리가 함께할게요!'];
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

export const FEEDBACK_REVIEW_MS = 5000;
const LANGUAGE_WARMUP_KEY = 'numbercal.language-warmup.v1';

const subjectForMode = (mode: Mode): Subject => modeInfo[mode].subject;

const localDateKey = (date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const dailyCompleted = (storageKey: string, dateKey: string): boolean => {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) ?? 'null') as { dailyBadges?: unknown } | null;
    return Array.isArray(value?.dailyBadges) && value.dailyBadges.includes(dateKey);
  } catch {
    return false;
  }
};

const recommendedDailyMode = (): 'story' | 'balance' | 'number-path' | 'shape-block' => {
  const dateKey = localDateKey();
  const modes = [
    { mode: 'story' as const, done: dailyCompleted('numbercal.story.records.v1', dateKey) },
    { mode: 'balance' as const, done: dailyCompleted('numbercal.balance.records.v1', dateKey) },
    { mode: 'number-path' as const, done: dailyCompleted('numbercal.number-path.records.v1', dateKey) },
    { mode: 'shape-block' as const, done: dailyCompleted('numbercal.shape-block.records.v1', dateKey) }
  ];
  const incomplete = modes.filter((item) => !item.done);
  const choices = incomplete.length ? incomplete : modes;
  return choices[Number(dateKey.slice(-2)) % choices.length].mode;
};

const languageWarmupCompleted = (): boolean => {
  try {
    return localStorage.getItem(LANGUAGE_WARMUP_KEY) === 'done';
  } catch {
    return false;
  }
};

const saveLanguageWarmup = (): void => {
  try {
    localStorage.setItem(LANGUAGE_WARMUP_KEY, 'done');
  } catch {
    // 저장할 수 없어도 놀이는 계속할 수 있다.
  }
};

const GameLoading = () => (
  <main className="screen game-loading" aria-busy="true" aria-live="polite">
    <span aria-hidden="true">✦</span>
    <strong>놀이를 준비하고 있어요</strong>
    <small>잠시만 기다려 주세요.</small>
  </main>
);

function App() {
  const [state, dispatch] = useReducer(appReducer, undefined, () => createInitialState(loadSettings(), loadHistory()));
  const [sudokuOpen, setSudokuOpen] = useState(false);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [storyOpen, setStoryOpen] = useState(false);
  const [balanceOpen, setBalanceOpen] = useState(false);
  const [numberPathOpen, setNumberPathOpen] = useState(false);
  const [shapeBlockOpen, setShapeBlockOpen] = useState(false);
  const [shapeBlockDaily, setShapeBlockDaily] = useState(false);
  const [growthOpen, setGrowthOpen] = useState(false);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const [timerAnnouncement, setTimerAnnouncement] = useState('');
  const [showExit, setShowExit] = useState(false);
  const [showResume, setShowResume] = useState(false);
  const [speechState, setSpeechState] = useState<'idle' | 'speaking' | 'error'>('idle');
  const [storageWarning, setStorageWarning] = useState(false);
  const [generationError, setGenerationError] = useState('');
  const [typedAnswer, setTypedAnswer] = useState('');
  const [mathHintVisible, setMathHintVisible] = useState(false);
  const [warmupConfig, setWarmupConfig] = useState<SessionConfig | null>(null);
  const [recordTransfer, setRecordTransfer] = useState<LearningRecordTransfer | null>(null);
  const [recordPreview, setRecordPreview] = useState<LearningRecordPreview | null>(null);
  const [recordTransferMessage, setRecordTransferMessage] = useState('');
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
  const [initialLanguageMastery] = useState(() => loadLanguageMastery());
  const languageMastery = useRef(initialLanguageMastery);
  const [initialSkillMastery] = useState(() => loadSkillMastery());
  const skillMastery = useRef(initialSkillMastery);
  const recordedLanguageAnswers = useRef(new Set<string>());
  const hintedQuestions = useRef(new Set<string>());
  const recordFileInput = useRef<HTMLInputElement>(null);

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

  const recordCurrentLanguageAttempt = (session: ActiveSession) => {
    if (session.config.subject === 'math') return languageMastery.current;
    const answer = session.answers.at(-1);
    const wordId = session.currentQuestion.metadata?.wordId;
    const recordKey = answer ? `${session.id}:${answer.questionId}` : '';
    if (!answer || typeof wordId !== 'string' || recordedLanguageAnswers.current.has(recordKey)) {
      return languageMastery.current;
    }
    recordedLanguageAnswers.current.add(recordKey);
    languageMastery.current = recordLanguageAttempt(languageMastery.current, {
      wordId,
      mode: session.config.mode as LanguageMode,
      resolution: answer.resolution,
      responseMs: answer.responseMs
    });
    const rawSkillIds = session.currentQuestion.metadata?.evidenceSkillIds
      ?? session.currentQuestion.metadata?.skillIds;
    const skillIds = Array.isArray(rawSkillIds)
      ? rawSkillIds.filter((skillId): skillId is string => typeof skillId === 'string')
      : [];
    const hintUsed = hintedQuestions.current.has(answer.questionId);
    skillMastery.current = recordSkillAttempt(skillMastery.current, {
      skillIds,
      resolution: answer.resolution,
      supported: hintUsed,
      hintUsed
    });
    if (!saveLanguageMastery(languageMastery.current) || !saveSkillMastery(skillMastery.current)) {
      setStorageWarning(true);
    }
    return languageMastery.current;
  };

  useEffect(() => {
    if (state.session?.questionStatus === 'feedback') recordCurrentLanguageAttempt(state.session);
  }, [state.session?.answers.length, state.session?.currentQuestion.id, state.session?.questionStatus]);

  useEffect(() => {
    inputLock.current = false;
    announcedTimerThresholds.current.clear();
    setTimerAnnouncement('');
    setTypedAnswer('');
    setMathHintVisible(false);
    speechRequestToken.current += 1;
    speechLock.current = false;
    activeSpeechQuestion.current = null;
    cancelSpeech();
    setSpeechState('idle');
    if (state.session?.currentQuestion.id) questionHeading.current?.focus();
  }, [state.session?.currentQuestion.id]);

  const playSpeech = useCallback(async (question: Question, slow = false) => {
    if (!question.speech || !state.settings.tts || !speechSupported()) {
      setSpeechState('error');
      return 'error' as const;
    }
    if (speechLock.current && activeSpeechQuestion.current === question.id) return 'timeout' as const;
    speechLock.current = true;
    const requestToken = ++speechRequestToken.current;
    activeSpeechQuestion.current = question.id;
    setSpeechState('speaking');
    const rate = slow
      ? 0.75
      : question.speech.slowReplay
        ? state.settings.speechRate
        : 0.95;
    const result = await speak(question.speech.text, question.speech.lang, rate);
    if (speechRequestToken.current !== requestToken || activeSpeechQuestion.current !== question.id) return result;
    speechLock.current = false;
    setSpeechState(result === 'ended' ? 'idle' : 'error');
    return result;
  }, [state.settings.speechRate, state.settings.tts]);

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

  const advanceFromFeedback = useCallback(() => {
    const session = state.session;
    if (!session || session.questionStatus !== 'feedback' || session.paused) return;
    const questionId = session.currentQuestion.id;
    if (advancedQuestions.current.has(questionId)) return;
    advancedQuestions.current.add(questionId);
    const updatedMastery = recordCurrentLanguageAttempt(session);
    const isLast = session.answers.length >= session.config.length;
    if (isLast) {
      const correctCount = session.answers.filter((answer) => answer.resolution === 'correct').length;
      const incorrectCount = session.answers.filter((answer) => answer.resolution === 'incorrect').length;
      const timeoutCount = session.answers.filter((answer) => answer.resolution === 'timeout').length;
      const averageResponseMs = Math.round(session.answers.reduce((sum, answer) => sum + answer.responseMs, 0) / session.answers.length);
      const summary: SessionSummary = {
        id: session.id, completedAt: new Date().toISOString(), config: session.config,
        correctCount, incorrectCount, timeoutCount, totalCount: session.answers.length, averageResponseMs,
        discoveredWords: session.config.subject === 'math' ? undefined : session.encounteredWords
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
      const currentReviewedWordId = session.currentQuestion.metadata?.selectionReason === 'session-review'
        && typeof session.currentQuestion.metadata.wordId === 'string'
        ? session.currentQuestion.metadata.wordId
        : null;
      const alreadyReviewed = currentReviewedWordId
        ? [...session.reviewedWordIds, currentReviewedWordId]
        : session.reviewedWordIds;
      const nextIndex = session.questionIndex + 1;
      const nextPhase = lessonPhaseAt(session.config.length, nextIndex);
      const minimumReviewGap = session.config.length === 5 ? 2 : 3;
      const preferredWordIds = nextPhase === 'review' ? session.reviewItems
        .filter((item) => item.wordId
          && session.questionIndex - item.questionIndex >= minimumReviewGap
          && !alreadyReviewed.includes(item.wordId))
        .map((item) => item.wordId!) : [];
      const nextQuestion = generateQuestion(
        session.config, session.recentSignatures, session.recentAnswers, random, recentCorrectIndices,
        updatedMastery, preferredWordIds, nextPhase, session.targetSkillIds
      );
      dispatch({ type: 'ADVANCE', questionId, nextQuestion });
    } catch {
      setGenerationError('이 단계의 문제를 준비하지 못했어요. 다른 단계를 골라 주세요.');
      dispatch({ type: 'SESSION_ERROR' });
    }
  }, [state.history, state.session]);

  useEffect(() => {
    const session = state.session;
    if (!session || session.questionStatus !== 'feedback' || session.paused || showExit || showResume) return;
    const questionId = session.currentQuestion.id;
    if (!feedbackEffects.current.has(questionId)) {
      feedbackEffects.current.add(questionId);
      if (session.resolution === 'correct' && state.settings.sound) playSuccessSound();
    }
    const timer = window.setTimeout(advanceFromFeedback, FEEDBACK_REVIEW_MS);
    return () => window.clearTimeout(timer);
  }, [advanceFromFeedback, showExit, showResume, state.session, state.settings.sound]);

  useEffect(() => () => {
    speechRequestToken.current += 1;
    cancelSpeech();
  }, []);

  const updateSettings = (patch: Partial<Settings>) => {
    const settings = { ...state.settings, ...patch, schemaVersion: 1 as const };
    dispatch({ type: 'UPDATE_SETTINGS', settings });
  };

  const downloadLearningRecords = () => {
    try {
      const blob = new Blob([serializeLearningRecordTransfer()], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `numbercal-learning-records-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setRecordTransferMessage('이 기기에 학습 기록 파일을 만들었어요.');
    } catch {
      setRecordTransferMessage('기록 파일을 만들지 못했어요. 다시 시도해 주세요.');
    }
  };

  const selectLearningRecordFile = async (file: File | undefined) => {
    setRecordTransfer(null);
    setRecordPreview(null);
    if (!file) return;
    try {
      const parsed = parseLearningRecordTransfer(await file.text());
      if (!parsed.ok) {
        setRecordTransferMessage(parsed.message);
        return;
      }
      setRecordTransfer(parsed.transfer);
      setRecordPreview(parsed.preview);
      setRecordTransferMessage('파일 내용을 확인했어요. 아래 내용을 살펴본 뒤 불러오세요.');
    } catch {
      setRecordTransferMessage('파일 내용을 읽을 수 없어요.');
    }
  };

  const restoreLearningRecords = () => {
    if (!recordTransfer || !recordPreview) return;
    if (!window.confirm('이 기기의 완료 기록과 학습 숙련도를 파일 내용으로 바꿀까요? 진행 중인 놀이는 바뀌지 않아요.')) return;
    if (!restoreLearningRecordTransfer(recordTransfer)) {
      setRecordTransferMessage('기록을 불러오지 못했어요. 기존 기록은 그대로 두었어요.');
      return;
    }
    languageMastery.current = loadLanguageMastery();
    skillMastery.current = loadSkillMastery();
    recordedLanguageAnswers.current.clear();
    hintedQuestions.current.clear();
    dispatch({ type: 'RESTORE_HISTORY', history: loadHistory() });
    setRecordTransfer(null);
    setRecordPreview(null);
    setRecordTransferMessage('학습 기록을 불러왔어요.');
  };
  const targetSkillsFor = (config: SessionConfig): string[] => {
    if (config.subject === 'math') return [];
    const words = config.subject === 'korean' ? koreanWords : englishWords;
    const availableSkillIds = [...new Set(
      words.filter((word) => word.difficulty === config.difficulty).flatMap((word) => word.skillIds)
    )];
    return planAdaptiveLesson({
      language: config.subject,
      difficulty: config.difficulty,
      length: config.length,
      mastery: skillMastery.current,
      availableSkillIds,
      random
    }).targetSkillIds;
  };

  const beginSession = async (requestedConfig: SessionConfig) => {
    await unlockAudio();
    const normalizedMode = !state.settings.tts && requestedConfig.mode.endsWith('listen')
      ? (requestedConfig.subject === 'korean' ? 'ko-fill' : 'en-fill') as Mode
      : requestedConfig.mode;
    const config = { ...requestedConfig, mode: normalizedMode };
    dispatch({ type: 'UPDATE_CONFIG', patch: { mode: normalizedMode } });
    updateSettings({ lastConfig: config });
    try {
      const targetSkillIds = targetSkillsFor(config);
      const question = generateQuestion(
        config, [], [], random, [], languageMastery.current, [], lessonPhaseAt(config.length, 0), targetSkillIds
      );
      advancedQuestions.current.clear();
      feedbackEffects.current.clear();
      recordedLanguageAnswers.current.clear();
      hintedQuestions.current.clear();
      setGenerationError('');
      dispatch({ type: 'START_SESSION', question, config, targetSkillIds });
    } catch {
      setGenerationError('이 단계의 문제를 준비하지 못했어요. 다른 단계를 골라 주세요.');
    }
  };

  const startSession = async () => {
    const config = state.draftConfig;
    if (config.subject !== 'math' && !languageWarmupCompleted()) {
      setWarmupConfig(config);
      return;
    }
    await beginSession(config);
  };

  const completeWarmup = async () => {
    const config = warmupConfig;
    if (!config) return;
    saveLanguageWarmup();
    setWarmupConfig(null);
    await beginSession(config);
  };

  const selectOption = (optionId: string | null, selectedAnswer?: string) => {
    const session = state.session;
    if (!session || session.questionStatus !== 'answering' || session.paused || inputLock.current) return;
    inputLock.current = true;
    dispatch({
      type: 'RESOLVE', questionId: session.currentQuestion.id, optionId, selectedAnswer, now: performance.now(),
      praise: pickPraise(), gentle: pickGentle()
    });
  };

  const markCurrentQuestionHinted = () => {
    const questionId = state.session?.currentQuestion.id;
    if (questionId) hintedQuestions.current.add(questionId);
  };

  const recordSupportedLanguageEvidence = (_wordId: string, skillIds: readonly string[]) => {
    skillMastery.current = recordSkillAttempt(skillMastery.current, {
      skillIds,
      resolution: 'correct',
      supported: true,
      hintUsed: false
    });
    if (!saveSkillMastery(skillMastery.current)) setStorageWarning(true);
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
      selectedAnswer: submitted, now: performance.now(), praise: pickPraise(), gentle: pickGentle()
    });
  };

  const replay = () => {
    if (state.session?.currentQuestion.speech) void playSpeech(state.session.currentQuestion);
  };

  const replaySlowly = () => {
    if (state.session?.currentQuestion.speech?.slowReplay) void playSpeech(state.session.currentQuestion, true);
  };

  const switchToFillQuestion = () => {
    const session = state.session;
    if (!session || session.currentQuestion.kind !== 'listening') return;
    cancelActiveSpeech();
    const mode = listeningFallbackMode(session.config.mode);
    const fallbackConfig = { ...session.config, mode };
    const keepAdventureMode = session.config.mode === 'ko-adventure' || session.config.mode === 'en-adventure';
    try {
      const question = generateQuestion(
        fallbackConfig, session.recentSignatures.slice(0, -1), session.recentAnswers, random, session.recentCorrectIndices,
        languageMastery.current, [], session.currentQuestion.metadata?.lessonPhase as LessonPhase | undefined, session.targetSkillIds
      );
      const replacementQuestion = keepAdventureMode
        ? { ...question, signature: session.currentQuestion.signature }
        : question;
      dispatch({
        type: 'REPLACE_QUESTION',
        questionId: session.currentQuestion.id,
        question: replacementQuestion,
        config: keepAdventureMode ? session.config : fallbackConfig
      });
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
      const targetSkillIds = targetSkillsFor(config);
      const question = generateQuestion(
        config, [], [], random, [], languageMastery.current, [], lessonPhaseAt(config.length, 0), targetSkillIds
      );
      advancedQuestions.current.clear();
      feedbackEffects.current.clear();
      recordedLanguageAnswers.current.clear();
      hintedQuestions.current.clear();
      setGenerationError('');
      dispatch({ type: 'START_SESSION', question, config, targetSkillIds });
    } catch {
      setGenerationError('이 단계의 문제를 준비하지 못했어요. 다른 단계를 골라 주세요.');
      dispatch({ type: 'SELECT_MODE', mode: config.mode });
    }
  };

  const canListen = state.settings.tts && speechSupported();
  const activeAnimations = state.settings.animations && !reducedMotion;
  const dailyRecommendation = recommendedDailyMode();

  if (warmupConfig) {
    const theme = learningThemeInfo[warmupConfig.theme];
    return (
      <div className={`app-shell ${activeAnimations ? '' : 'reduce-motion'}`}>
        <main className="screen language-warmup-screen">
          <button className="icon-button warmup-close" onClick={() => setWarmupConfig(null)} aria-label="연습 닫기">✕</button>
          <GuideCharacter className="warmup-guide" decorative />
          <p className="eyebrow">모리와 한 번 연습해요</p>
          <h1>그림을 톡 눌러 볼까요?</h1>
          <p>어떤 답을 눌러도 천천히 같이 찾을 수 있어요.</p>
          <button className="warmup-picture-button" onClick={() => void completeWarmup()} aria-label={`${theme.label} 그림을 누르고 작은 모험 시작`}>
            <span aria-hidden="true">{theme.icon}</span>
            <strong>{theme.label}</strong>
            <small>톡!</small>
          </button>
          <small className="warmup-note">잘했어요! 이제 작은 모험을 시작해요.</small>
        </main>
      </div>
    );
  }

  if (growthOpen) {
    return (
      <div className={`app-shell ${activeAnimations ? '' : 'reduce-motion'}`}>
        <GrowthDashboard
          wordMastery={languageMastery.current}
          skillMastery={skillMastery.current}
          history={state.history}
          onBack={() => setGrowthOpen(false)}
        />
      </div>
    );
  }

  if (storyOpen) {
    return (
      <div className={`app-shell ${activeAnimations ? '' : 'reduce-motion'}`}>
        <Suspense fallback={<GameLoading />}>
          <StoryMode
            onExit={() => setStoryOpen(false)}
            soundEnabled={state.settings.sound}
            ttsEnabled={state.settings.tts}
            speechRate={state.settings.speechRate}
            animationsEnabled={activeAnimations}
            learnedWordIds={[...languageMastery.current]
              .sort((left, right) => right.lastSeenAt.localeCompare(left.lastSeenAt))
              .map((entry) => entry.wordId)}
            onMissionRecallCorrect={recordSupportedLanguageEvidence}
          />
        </Suspense>
      </div>
    );
  }

  if (memoryOpen) {
    return (
      <div className={`app-shell ${activeAnimations ? '' : 'reduce-motion'}`}>
        <Suspense fallback={<GameLoading />}>
          <MemoryMode
            onExit={() => setMemoryOpen(false)}
            soundEnabled={state.settings.sound}
            animationsEnabled={activeAnimations}
            onLanguagePairMatched={recordSupportedLanguageEvidence}
          />
        </Suspense>
      </div>
    );
  }

  if (sudokuOpen) {
    return (
      <div className={`app-shell ${activeAnimations ? '' : 'reduce-motion'}`}>
        <Suspense fallback={<GameLoading />}>
          <SudokuMode
            onExit={() => setSudokuOpen(false)}
            soundEnabled={state.settings.sound}
            animationsEnabled={activeAnimations}
          />
        </Suspense>
      </div>
    );
  }

  if (balanceOpen) {
    return (
      <div className={`app-shell ${activeAnimations ? '' : 'reduce-motion'}`}>
        <Suspense fallback={<GameLoading />}>
          <BalanceMode
            onExit={() => setBalanceOpen(false)}
            soundEnabled={state.settings.sound}
            animationsEnabled={activeAnimations}
          />
        </Suspense>
      </div>
    );
  }

  if (numberPathOpen) {
    return (
      <div className={`app-shell ${activeAnimations ? '' : 'reduce-motion'}`}>
        <Suspense fallback={<GameLoading />}>
          <NumberPathMode
            onExit={() => setNumberPathOpen(false)}
            soundEnabled={state.settings.sound}
          />
        </Suspense>
      </div>
    );
  }

  if (shapeBlockOpen) {
    return (
      <div className={`app-shell ${activeAnimations ? '' : 'reduce-motion'}`}>
        <Suspense fallback={<GameLoading />}>
          <ShapeBlockMode
            onExit={() => { setShapeBlockOpen(false); setShapeBlockDaily(false); }}
            soundEnabled={state.settings.sound}
            animationsEnabled={activeAnimations}
            hapticsEnabled={state.settings.haptics && activeAnimations}
            startDaily={shapeBlockDaily}
          />
        </Suspense>
      </div>
    );
  }

  return (
    <div className={`app-shell ${activeAnimations ? '' : 'reduce-motion'}`}>
      {state.screen === 'home' && (
        <main className="screen home-screen">
          <header className="home-header home-hero">
            <button className="icon-button settings-button" onClick={() => dispatch({ type: 'OPEN_SETTINGS', from: 'home' })} aria-label="설정 열기">⚙️</button>
            <div className="home-hero-copy">
              <p className="eyebrow">모리와 함께 한 걸음씩</p>
              <h1><small>어린이 학습 놀이터</small>오늘은 무엇을<br />배워 볼까요?</h1>
              <p className="lead">좋아하는 놀이를 골라요.</p>
            </div>
            <GuideCharacter className="home-guide" decorative />
          </header>
          <section className="home-recommendation" aria-labelledby="today-recommendation-title">
            <div><p className="eyebrow">오늘의 추천</p><h2 id="today-recommendation-title">{dailyRecommendation === 'story' ? '짧은 이야기 한 편 어때요?' : dailyRecommendation === 'balance' ? '오늘의 저울을 맞춰 볼까요?' : dailyRecommendation === 'number-path' ? '오늘의 숫자 길을 찾아볼까요?' : '오늘의 모양을 만들어 볼까요?'}</h2></div>
            {dailyRecommendation === 'story' ? (
              <button onClick={() => setStoryOpen(true)} aria-label="오늘의 추천 이야기 탐험대 시작하기">
                <span className="recommendation-icon"><LearningIcon name="story" /></span>
                <span><strong>이야기 탐험대</strong><small>읽고 듣고, 세 가지 활동을 해요</small></span>
                <b aria-hidden="true">시작 ›</b>
              </button>
            ) : dailyRecommendation === 'balance' ? (
              <button onClick={() => setBalanceOpen(true)} aria-label="오늘의 추천 균형 저울 시작하기">
                <span className="recommendation-icon balance-recommendation-icon"><BalanceIcon decorative /></span>
                <span><strong>균형 저울</strong><small>숫자 추를 놓아 양쪽 합을 맞춰요</small></span>
                <b aria-hidden="true">시작 ›</b>
              </button>
            ) : dailyRecommendation === 'number-path' ? (
              <button onClick={() => setNumberPathOpen(true)} aria-label="오늘의 추천 숫자 길 찾기 시작하기">
                <span className="recommendation-icon number-path-recommendation-icon"><NumberPathIcon decorative /></span>
                <span><strong>숫자 길 찾기</strong><small>상하좌우로 이어 목표 합을 만들어요</small></span>
                <b aria-hidden="true">시작 ›</b>
              </button>
            ) : (
              <button onClick={() => { setShapeBlockDaily(true); setShapeBlockOpen(true); }} aria-label="오늘의 추천 모양블록 시작하기">
                <span className="recommendation-icon shape-block-recommendation-icon"><ShapeBlockIcon decorative /></span>
                <span><strong>오늘의 모양블록</strong><small>7개 조각으로 오늘의 그림을 만들어요</small></span>
                <b aria-hidden="true">시작 ›</b>
              </button>
            )}
          </section>
          <section className="home-learning-section" aria-labelledby="learning-list-title">
            <div className="home-section-title"><p className="eyebrow">모든 학습</p><h2 id="learning-list-title">하고 싶은 놀이를 골라요</h2></div>
            <div className="subject-grid has-learning-games" aria-label="과목 선택">
            {(Object.keys(subjectInfo) as Subject[]).map((subject) => {
              const info = subjectInfo[subject];
              return (
                <button key={subject} className={`subject-card ${info.className}`} onClick={() => dispatch({ type: 'SELECT_SUBJECT', subject })}>
                  <span className="subject-icon" aria-hidden="true"><LearningIcon name={subject} /></span>
                  <span className="subject-copy"><strong>{info.label}</strong><small>{info.description}</small></span>
                  <span className="arrow" aria-hidden="true">›</span>
                </button>
              );
            })}
            <button className="subject-card memory" onClick={() => setMemoryOpen(true)}>
              <span className="subject-icon" aria-hidden="true"><LearningIcon name="memory" /></span>
              <span className="subject-copy"><strong>기억력 챌린지</strong><small>뜻이 연결되는 카드를 찾아요</small></span>
              <span className="arrow" aria-hidden="true">›</span>
            </button>
            <button className="subject-card story" onClick={() => setStoryOpen(true)}>
              <span className="subject-icon" aria-hidden="true"><LearningIcon name="story" /></span>
              <span className="subject-copy"><strong>이야기 탐험대</strong><small>읽고 기억하며 생각해요</small></span>
              <span className="arrow" aria-hidden="true">›</span>
            </button>
            <button className="subject-card sudoku" onClick={() => setSudokuOpen(true)}>
              <span className="subject-icon" aria-hidden="true"><LearningIcon name="sudoku" /></span>
              <span className="subject-copy"><strong>스도쿠</strong><small>숫자 규칙을 찾아요</small></span>
              <span className="arrow" aria-hidden="true">›</span>
            </button>
            <button className="subject-card balance" onClick={() => setBalanceOpen(true)}>
              <span className="subject-icon" aria-hidden="true"><BalanceIcon /></span>
              <span className="subject-copy"><strong>균형 저울</strong><small>숫자 추로 양쪽을 맞춰요</small></span>
              <span className="arrow" aria-hidden="true">›</span>
            </button>
            <button className="subject-card number-path" onClick={() => setNumberPathOpen(true)}>
              <span className="subject-icon" aria-hidden="true"><NumberPathIcon decorative /></span>
              <span className="subject-copy"><strong>숫자 길 찾기</strong><small>숫자를 이어 목표 합을 만들어요</small></span>
              <span className="arrow" aria-hidden="true">›</span>
            </button>
            <button className="subject-card shape-block" onClick={() => { setShapeBlockDaily(false); setShapeBlockOpen(true); }}>
              <span className="subject-icon" aria-hidden="true"><ShapeBlockIcon /></span>
              <span className="subject-copy"><strong>모양블록</strong><small>조각을 돌리고 줄을 채워요</small></span>
              <span className="arrow" aria-hidden="true">›</span>
            </button>
            </div>
          </section>
          {state.history[0] ? (
            <aside className="recent-card" aria-label="최근 학습 결과">
              <span aria-hidden="true">⭐</span>
              <div><strong>최근에도 멋지게 해냈어요!</strong><small>{subjectInfo[state.history[0].config.subject].label} · {state.history[0].correctCount} / {state.history[0].totalCount}</small></div>
            </aside>
          ) : <p className="first-visit">처음이어도 괜찮아요. 좋아하는 과목을 눌러 보세요!</p>}
          <button className="growth-entry-card" onClick={() => setGrowthOpen(true)} aria-label="나의 성장 숲 열기">
            <span className="growth-entry-icon" aria-hidden="true">🌳</span>
            <span><small>조금씩 자라는 중</small><strong>나의 성장 숲</strong><b>오늘 만난 친구와 다음 모험을 봐요</b></span>
            <i aria-hidden="true">›</i>
          </button>
          {needRefresh && <UpdateNotice onUpdate={() => void updateServiceWorker(true)} />}
        </main>
      )}

      {state.screen === 'mode' && (
        <main className="screen selection-screen">
          <TopBar title={subjectInfo[state.draftConfig.subject].label} onBack={() => dispatch({ type: 'GO_HOME' })} />
          <section className="selection-heading"><p className="eyebrow">한 가지를 골라요</p><h1>어떤 놀이를 해 볼까요?</h1></section>
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
          <section className="selection-heading"><p className="eyebrow">오늘의 작은 모험</p><h1>{state.draftConfig.subject === 'math' ? '어떻게 놀아 볼까요?' : '어떤 친구를 만날까요?'}</h1></section>
          <div className="difficulty-grid" role="radiogroup" aria-label={state.draftConfig.subject === 'math' ? '단계' : '놀이 길'}>
            {DIFFICULTIES.map((difficulty) => {
              const info = difficultyInfo[difficulty];
              const journey = languageJourneyInfo[difficulty];
              return <ChoiceChip key={difficulty} selected={state.draftConfig.difficulty === difficulty} onClick={() => dispatch({ type: 'UPDATE_CONFIG', patch: { difficulty } })} label={state.draftConfig.subject === 'math' ? info.label : journey.label} detail={state.draftConfig.subject === 'math' ? `${info.age} · ${difficulty === 'challenge' ? '정답 직접 입력' : `보기 ${info.optionCount}개`}` : journey.detail} />;
            })}
          </div>
          {state.draftConfig.subject !== 'math' && (
            <section className="setup-choice-section" aria-labelledby="theme-choice-title">
              <h2 id="theme-choice-title">좋아하는 친구를 골라요</h2>
              <div className="theme-choice-grid" role="radiogroup" aria-label="오늘의 테마">
                {(Object.keys(learningThemeInfo) as LearningTheme[]).map((theme) => {
                  const info = learningThemeInfo[theme];
                  return <button key={theme} role="radio" aria-checked={state.draftConfig.theme === theme} className={`theme-choice ${state.draftConfig.theme === theme ? 'active' : ''}`} onClick={() => dispatch({ type: 'UPDATE_CONFIG', patch: { theme } })}><span aria-hidden="true">{info.icon}</span><strong>{info.label}</strong></button>;
                })}
              </div>
            </section>
          )}
          <section className="setup-choice-section" aria-labelledby="length-choice-title">
            <h2 id="length-choice-title">얼마나 놀까요?</h2>
            <div className="adventure-length-grid" role="radiogroup" aria-label="모험 길이">
              {SESSION_LENGTHS.map((length) => <ChoiceChip key={length} selected={state.draftConfig.length === length} onClick={() => dispatch({ type: 'UPDATE_CONFIG', patch: { length } })} label={length === 5 ? '작은 모험' : '더 길게 놀기'} detail={length === 5 ? '5개 · 3~5분' : '15개 · 8~12분'} compact />)}
            </div>
          </section>
          <section className="fixed-session-info" aria-label="놀이 안내">
            <div><span aria-hidden="true">🗺️</span><small>오늘은</small><strong>{state.draftConfig.length}개</strong></div>
            <div><span aria-hidden="true">{state.draftConfig.subject === 'math' ? '⏱' : '🌱'}</span><small>{state.draftConfig.subject === 'math' ? '문제마다' : '시간 걱정 없이'}</small><strong>{state.draftConfig.subject === 'math' ? `${QUESTION_TIME_SECONDS}초` : '천천히'}</strong></div>
          </section>
          <div className="start-summary">{state.draftConfig.subject === 'math' ? difficultyInfo[state.draftConfig.difficulty].label : languageJourneyInfo[state.draftConfig.difficulty].label} · {state.draftConfig.length === 5 ? '작은 모험' : '더 길게 놀기'}</div>
          {generationError && <p className="settings-note warning" role="alert">{generationError}</p>}
          <button className="primary-button" onClick={() => void startSession()}>{state.draftConfig.length === 5 ? '작은 모험 시작!' : '길게 놀기 시작!'} <span aria-hidden="true">→</span></button>
        </main>
      )}

      {state.screen === 'session' && state.session && (
        <main className="screen question-screen">
          <header className="question-header">
            <button className="icon-button" onClick={requestExit} aria-label="학습 나가기">✕</button>
            <div className="progress-copy"><strong>{subjectInfo[state.session.config.subject].label}</strong><span>{state.session.questionIndex + 1} / {state.session.config.length}</span></div>
            <div className="progress-track" aria-label={`진행도 ${state.session.questionIndex + 1}/${state.session.config.length}`}><span style={{ width: `${((state.session.questionIndex + 1) / state.session.config.length) * 100}%` }} /></div>
          </header>
          {state.session.limitMs !== null && state.session.questionStatus === 'answering' && (
            <div className={`timer-card ${remainingMs !== null && remainingMs <= 5000 ? 'timer-low' : ''}`} aria-label={`남은 시간 ${Math.ceil((remainingMs ?? QUESTION_TIME_MS) / 1000)}초`}>
              <span className="timer-icon" aria-hidden="true">⏱</span>
              <span className="timer-copy"><small>남은 시간</small><strong>{Math.ceil((remainingMs ?? QUESTION_TIME_MS) / 1000)}초</strong></span>
              <span className="timer-bar"><i style={{ width: `${Math.max(0, ((remainingMs ?? QUESTION_TIME_MS) / QUESTION_TIME_MS) * 100)}%` }} /></span>
            </div>
          )}
          <section className="question-card">
            <p className="question-kicker">{lessonPhaseLabel[(state.session.currentQuestion.metadata?.lessonPhase as LessonPhase | undefined) ?? 'discover']} · {state.session.currentQuestion.activity?.title ?? (state.session.currentQuestion.kind === 'listening' ? '귀를 쫑긋!' : state.session.config.difficulty === 'challenge' ? '글자를 써 볼까요?' : '친구를 찾아요')}</p>
            <h1 ref={questionHeading} tabIndex={-1} className={state.session.currentQuestion.kind === 'math' ? 'math-prompt' : 'word-prompt'}>{state.session.currentQuestion.prompt}</h1>
            {hasMathVisual(state.session.currentQuestion) && state.session.currentQuestion.difficulty !== 'easy' && (
              <button className="math-hint-button" type="button" aria-expanded={mathHintVisible} onClick={() => setMathHintVisible((visible) => !visible)}>
                <span aria-hidden="true">▦</span>{mathHintVisible ? '그림 힌트 닫기' : '그림 힌트 보기'}
              </button>
            )}
            <MathVisual question={state.session.currentQuestion} revealed={mathHintVisible} />
            {typeof state.session.currentQuestion.metadata?.wordId === 'string'
              && questionConceptIds[state.session.currentQuestion.metadata.wordId]
              && (state.session.currentQuestion.kind !== 'listening' || state.session.questionStatus === 'feedback')
              && <ConceptPicture conceptId={questionConceptIds[state.session.currentQuestion.metadata.wordId]} className="question-concept-picture" />}
            {state.session.currentQuestion.hint && <p className="question-hint">{state.session.currentQuestion.hint}</p>}
            {state.session.currentQuestion.speech && (
              <div className={`listen-actions ${state.session.currentQuestion.speech.slowReplay ? '' : 'single'}`}>
                <button className={`listen-button ${speechState === 'speaking' ? 'is-speaking' : ''}`} onClick={replay} disabled={speechState === 'speaking'}>
                  <span aria-hidden="true">{speechState === 'speaking' ? '〰️' : '🔊'}</span>{speechState === 'speaking' ? '듣는 중...' : state.session.currentQuestion.speech.slowReplay ? '문장 다시 듣기' : '다시 듣기'}
                </button>
                {state.session.currentQuestion.speech.slowReplay && <button className="slow-listen-button" onClick={replaySlowly} disabled={speechState === 'speaking'}>
                  <span aria-hidden="true">🐢</span>느리게 문장 듣기
                </button>}
              </div>
            )}
            {speechState === 'error' && state.session.currentQuestion.kind === 'listening' && <div className="speech-fallback"><p className="inline-notice">소리가 나지 않나요?</p><button className="small-button" onClick={switchToFillQuestion}>글자 문제로 바꾸기</button></div>}
          </section>
          {state.session.config.difficulty === 'challenge' && !state.session.currentQuestion.activity && !state.session.config.mode.endsWith('adventure') ? (
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
          ) : state.session.currentQuestion.activity ? (
            <LanguageActivityRenderer
              key={state.session.currentQuestion.id}
              question={state.session.currentQuestion}
              status={state.session.questionStatus}
              selectedOptionId={state.session.selectedOptionId}
              paused={state.session.paused}
              onSelect={selectOption}
              onHint={markCurrentQuestionHinted}
            />
          ) : (            <div className={`option-grid options-${state.session.currentQuestion.options.length}`} role="group" aria-label="보기">
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
            <div className="feedback-review">
              <Feedback
                resolution={state.session.resolution!}
                text={state.session.feedbackText}
                explanation={state.session.currentQuestion.explanation}
                celebrate={activeAnimations && state.session.questionIndex % 3 === 0}
              />
              <small className="feedback-wait-note">5초 뒤 자동으로 넘어가요.</small>
              <button className="primary-button feedback-next" onClick={advanceFromFeedback}>
                {state.session.answers.length >= state.session.config.length ? '오늘 찾은 것 보기' : '다음 친구'}
              </button>
            </div>
          )}
          <div className="sr-only" aria-live="polite">{state.session.questionStatus === 'feedback' ? `${state.session.feedbackText} 정답은 ${state.session.currentQuestion.explanation}` : ''}</div>
          <div className="sr-only" aria-live="polite">{timerAnnouncement}</div>
        </main>
      )}

      {state.screen === 'result' && state.latestResult && (
        <main className={`screen result-screen ${state.latestReview.length ? 'has-review' : ''}`}>
          <div className="result-burst result-guide-wrap" aria-hidden="true"><GuideCharacter className="result-guide" decorative /></div>
          <p className="eyebrow">{state.latestResult.config.subject === 'math' ? '오늘의 학습 끝!' : '이야기 조각을 찾았어요!'}</p>
          <h1>{state.latestResult.config.subject === 'math' ? `${state.latestResult.correctCount} / ${state.latestResult.totalCount}` : '작은 모험 끝!'}</h1>
          <p className="result-message">{resultMessage(state.latestResult.correctCount / state.latestResult.totalCount)}</p>
          {state.latestResult.config.subject !== 'math' && (
            <section className="story-sticker-card" aria-label="오늘 받은 이야기 스티커">
              <span aria-hidden="true">{learningThemeInfo[state.latestResult.config.theme].icon}</span>
              <div><small>오늘의 이야기 스티커</small><strong>{learningThemeInfo[state.latestResult.config.theme].label}</strong><p>끝까지 함께해서 만났어요!</p></div>
            </section>
          )}
          {state.latestResult.config.subject !== 'math' && state.latestResult.discoveredWords?.length ? (
            <section className="discovery-section" aria-labelledby="discovery-heading">
              <h2 id="discovery-heading">오늘 만난 친구</h2>
              <div className="discovery-chips">{state.latestResult.discoveredWords.slice(0, 5).map((word) => <span key={word}>{word}</span>)}</div>
            </section>
          ) : null}
          <section className="result-stats" aria-label="학습 결과">
            <ResultStat icon={state.latestResult.config.subject === 'math' ? '✓' : '⭐'} label={state.latestResult.config.subject === 'math' ? '맞힌 문제' : '혼자 찾은 친구'} value={`${state.latestResult.correctCount}개`} />
            <ResultStat icon={state.latestResult.config.subject === 'math' ? '↗' : '🌱'} label={state.latestResult.config.subject === 'math' ? '다시 연습' : '다시 만날 친구'} value={`${state.latestResult.incorrectCount + state.latestResult.timeoutCount}개`} />
            <ResultStat icon={state.latestResult.config.subject === 'math' ? '⏱' : '🗺️'} label={state.latestResult.config.subject === 'math' ? '평균 시간' : '오늘의 모험'} value={state.latestResult.config.subject === 'math' ? `${(state.latestResult.averageResponseMs / 1000).toFixed(1)}초` : `${state.latestResult.totalCount}개`} />
          </section>
          {state.latestResult.timeoutCount > 0 && <p className="timeout-note">시간이 지난 문제 {state.latestResult.timeoutCount}개</p>}
          <div className="result-actions">
            <button className="primary-button" onClick={() => void tryAgain()}>{state.latestResult.config.subject === 'math' ? '같은 단계 한 번 더' : '한 번 더 만나기'}</button>
            <button className="secondary-button" onClick={() => dispatch({ type: 'SELECT_MODE', mode: state.latestResult!.config.mode })}>{state.latestResult.config.subject === 'math' ? '난이도 바꾸기' : '다른 모험 고르기'}</button>
            <button className="text-button" onClick={() => dispatch({ type: 'GO_HOME' })}>처음으로</button>
          </div>
          {state.latestResult.config.subject !== 'math' && state.latestReview.length > 0 && (
            <p className="timeout-note">오늘 어려웠던 친구는 다음 모험에서 다시 만나요.</p>
          )}
          {state.latestReview.length > 0 && (
            <section className="review-section" aria-labelledby="review-heading">
              <div className="review-heading-row">
                <div><p className="eyebrow">다시 만난 친구</p><h2 id="review-heading">천천히 보면 더 잘 기억나요</h2></div>
                <span>{state.latestReview.length}문제</span>
              </div>
              <ol className="review-list">
                {state.latestReview.map((item, index) => (
                  <li key={item.questionId} className="review-card">
                    <div className="review-card-top"><span>{index + 1}</span><small>{item.resolution === 'timeout' ? '천천히 다시 만나요' : '다시 만난 친구'}</small></div>
                    <strong className="review-prompt">{item.prompt}</strong>
                    <dl className="review-answers">
                      <div><dt>내 답</dt><dd>{item.selectedAnswer ?? '고르기 전에 시간이 지났어요'}</dd></div>
                      <div><dt>{item.subject === 'math' ? '정답' : '정답 낱말'}</dt><dd>{item.correctAnswer}</dd></div>
                    </dl>
                    <p className="review-explanation"><span aria-hidden="true">💡</span>{item.explanation}</p>
                  </li>
                ))}
              </ol>
            </section>
          )}
          {needRefresh && <UpdateNotice onUpdate={() => void updateServiceWorker(true)} />}
        </main>
      )}

      {state.screen === 'settings' && (
        <main className="screen settings-screen">
          <TopBar title="설정" onBack={() => dispatch({ type: 'CLOSE_SETTINGS' })} />
          <section className="settings-panel">
            <ToggleRow icon="♪" label="효과음" detail="정답을 맞히면 짧은 소리가 나요" checked={state.settings.sound} onChange={(sound) => updateSettings({ sound })} />
            <ToggleRow icon="〰" label="손끝 반응" detail="지원하는 기기에서 짧게 톡 느껴져요" checked={state.settings.haptics} onChange={(haptics) => updateSettings({ haptics })} />
            <ToggleRow icon="🔊" label="듣기 음성" detail="한국어·영어 단어와 문장을 읽어줘요" checked={state.settings.tts} onChange={(tts) => { if (!tts) cancelActiveSpeech(); updateSettings({ tts }); }} />
            {state.settings.tts && <SpeechRatePicker value={state.settings.speechRate} onChange={(speechRate) => { cancelActiveSpeech(); updateSettings({ speechRate }); }} />}
            <ToggleRow icon="✨" label="반짝이는 효과" detail="별과 축하 효과를 보여줘요" checked={state.settings.animations} onChange={(animations) => updateSettings({ animations })} />
          </section>
          {reducedMotion && <p className="settings-note">기기의 동작 줄이기 설정을 따르고 있어요.</p>}
          {storageWarning && <p className="settings-note warning">이 기기에는 설정이나 기록을 저장하지 못할 수 있어요.</p>}
          <section className="settings-panel record-transfer" aria-labelledby="record-transfer-heading">
            <div className="record-transfer-copy"><strong id="record-transfer-heading">학습 기록 옮기기</strong><small>이름 없이 완료 기록과 학습 숙련도만 파일로 옮겨요</small></div>
            <div className="record-transfer-actions">
              <button type="button" className="small-button" onClick={downloadLearningRecords}>기록 파일 만들기</button>
              <button type="button" className="small-button" onClick={() => recordFileInput.current?.click()}>기록 파일 고르기</button>
              <input ref={recordFileInput} hidden type="file" accept="application/json,.json" aria-label="학습 기록 파일 고르기" onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                void selectLearningRecordFile(file);
              }} />
            </div>
            {recordTransferMessage && <p className="record-transfer-message" role="status">{recordTransferMessage}</p>}
            {recordPreview && (
              <div className="record-preview" aria-label="불러올 학습 기록 미리보기">
                <strong>불러올 내용</strong>
                <span>기록 묶음 {recordPreview.sections}개 · 최근 학습 {recordPreview.recentSessions}회</span>
                <span>낱말 기록 {recordPreview.languageEntries}개 · 기술 기록 {recordPreview.skillEntries}개</span>
                <button type="button" className="primary-button" onClick={restoreLearningRecords}>이 기록 불러오기</button>
              </div>
            )}
          </section>
          <section className="settings-panel danger-zone">
            <div><strong>학습·게임 기록</strong><small>최근 학습과 게임의 완료 기록을 지워요</small></div>
            <button className="small-button" onClick={() => { if (window.confirm('최근 학습과 모든 게임의 완료 기록을 지울까요? 진행 중인 놀이는 유지돼요.')) { if (!clearAllLearningRecords()) setStorageWarning(true); languageMastery.current = []; skillMastery.current = []; recordedLanguageAnswers.current.clear(); hintedQuestions.current.clear(); dispatch({ type: 'CLEAR_HISTORY' }); } }}>기록 지우기</button>
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

function SpeechRatePicker({ value, onChange }: { value: SpeechRate; onChange: (value: SpeechRate) => void }) {
  const choices: readonly { value: SpeechRate; label: string; detail: string }[] = [
    { value: 0.75, label: '천천히', detail: '0.75배' },
    { value: 0.85, label: '편안하게', detail: '0.85배' },
    { value: 0.95, label: '또박또박', detail: '0.95배' }
  ];
  return (
    <fieldset className="speech-rate-picker">
      <legend><strong>문장 읽기 속도</strong><small>문장과 이야기 듣기에 적용돼요</small></legend>
      <div role="radiogroup" aria-label="읽기 속도">
        {choices.map((choice) => (
          <button
            key={choice.value}
            type="button"
            role="radio"
            aria-checked={value === choice.value}
            className={value === choice.value ? 'active' : ''}
            onClick={() => onChange(choice.value)}
            onKeyDown={(event) => {
              if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
              event.preventDefault();
              const currentIndex = choices.findIndex((item) => item.value === choice.value);
              const nextIndex = event.key === 'Home' ? 0
                : event.key === 'End' ? choices.length - 1
                  : (currentIndex + (event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1) + choices.length) % choices.length;
              onChange(choices[nextIndex].value);
              const buttons = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="radio"]');
              window.requestAnimationFrame(() => buttons?.[nextIndex]?.focus());
            }}
          >
            <strong>{choice.label}</strong><small>{choice.detail}</small>
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function ConfirmDialog({ title, message, primary, secondary, onPrimary, onSecondary }: { title: string; message: string; primary: string; secondary?: string; onPrimary: () => void; onSecondary?: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onPrimaryRef = useRef(onPrimary);
  const returnFocusRef = useRef<HTMLElement | null>(document.activeElement as HTMLElement | null);
  onPrimaryRef.current = onPrimary;
  useEffect(() => {
    dialogRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onPrimaryRef.current();
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
      if (returnFocusRef.current?.isConnected) returnFocusRef.current.focus();
    };
  }, []);

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
