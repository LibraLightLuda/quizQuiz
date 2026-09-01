import { lazy, Suspense, useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { appReducer, createInitialState } from './appReducer';
import type { ActiveSession } from './appState';
import { LanguageActivityRenderer } from './LanguageActivityRenderer';
import { difficultyInfo, DIFFICULTIES, learningThemeInfo, modeInfo, modesForSubject, QUESTION_TIME_MS, QUESTION_TIME_SECONDS, SESSION_LENGTHS, subjectInfo } from '../domain/difficulty';
import type { LanguageMode, LearningTheme, LessonPhase, Mode, Question, SessionConfig, SessionSummary, Settings, SpeechRate, Subject } from '../domain/types';
import { generateQuestion } from '../domain/questionFactory';
import { lessonPhaseAt } from '../domain/lessonPlanner';
import { listeningFallbackMode } from '../domain/languageGenerator';
import { CryptoRandom, shuffle, type RandomSource } from '../services/randomService';
import {
  createGenerationIssue, randomForIssue, recordIssuedFingerprints,
  type GenerationIssue
} from '../services/contentVarietyService';
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
import { BlockGardenIcon } from '../visuals/BlockGardenIcon';
import { GrowthDashboard } from './GrowthDashboard';
import { useGrowth } from '../growth/GrowthContext';
import { GrowthCelebration, GrowthMedal, GrowthRewardCard } from '../growth/GrowthUI';
import { currentDayRecord, growthSummaryForState } from '../growth/growthModel';
import type { GrowthAward } from '../growth/types';
import { useLocale } from '../i18n/LocaleContext';
import { activityLabel, difficultyLabel, journeyDetail, journeyLabel, modeDescription, modeLabel, phaseLabel, subjectDescription, subjectLabel, themeLabel } from '../i18n/catalog';
import type { AppLocale, LocalePreference } from '../i18n/locale';
import '../styles/global.css';

const random = new CryptoRandom();
const SudokuMode = lazy(() => import('../sudoku/SudokuMode'));
const MemoryMode = lazy(() => import('../memory/MemoryMode'));
const StoryMode = lazy(() => import('../story/StoryMode'));
const BalanceMode = lazy(() => import('../balance/BalanceMode'));
const NumberPathMode = lazy(() => import('../number-path/NumberPathMode'));
const BlockGardenMode = lazy(() => import('../block-garden/BlockGardenMode'));
const praiseMessages = ['잘했어요!', '정답이에요!', '대단해요!', '멋져요!', '최고예요!', '한 문제 더!'];
const gentleMessages = ['같이 찾아볼까요?', '다른 친구도 만나봐요!', '천천히 다시 볼까요?', '모리가 함께할게요!'];
const praiseMessagesEn = ['Great job!', 'That is right!', 'Amazing!', 'Wonderful!', 'Excellent!', 'One more!'];
const gentleMessagesEn = ["Let's find it together.", 'Try another friend.', 'Take another slow look.', 'Mori is here with you.'];
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
const pickPraiseEn = makeMessagePicker(praiseMessagesEn);
const pickGentleEn = makeMessagePicker(gentleMessagesEn);

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

const recommendedDailyMode = (): 'story' | 'balance' | 'number-path' => {
  const dateKey = localDateKey();
  const modes = [
    { mode: 'story' as const, done: dailyCompleted('numbercal.story.records.v1', dateKey) },
    { mode: 'balance' as const, done: dailyCompleted('numbercal.balance.records.v1', dateKey) },
    { mode: 'number-path' as const, done: dailyCompleted('numbercal.number-path.records.v1', dateKey) }
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

const GameLoading = () => {
  const { t } = useLocale();
  return <main className="screen game-loading" aria-busy="true" aria-live="polite">
    <span aria-hidden="true">✦</span>
    <strong>{t('놀이를 준비하고 있어요', 'Getting the game ready')}</strong>
    <small>{t('잠시만 기다려 주세요.', 'Just a moment.')}</small>
  </main>;
};

function App() {
  const { locale, preference, setPreference, t } = useLocale();
  const growth = useGrowth();
  const growthSummary = growthSummaryForState(growth.state);
  const [state, dispatch] = useReducer(appReducer, undefined, () => createInitialState(loadSettings(), loadHistory()));
  const [sudokuOpen, setSudokuOpen] = useState(false);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [storyOpen, setStoryOpen] = useState(false);
  const [balanceOpen, setBalanceOpen] = useState(false);
  const [numberPathOpen, setNumberPathOpen] = useState(false);
  const [blockGardenOpen, setBlockGardenOpen] = useState(false);
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
  const [latestGrowthAward, setLatestGrowthAward] = useState<GrowthAward | null>(null);
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
  const generationIssue = useRef<GenerationIssue | null>(null);
  const generationRandom = useRef<RandomSource>(random);
  const generationFingerprints = useRef<string[]>([]);

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
        setTimerAnnouncement(t(`${seconds}초 남았어요.`, `${seconds} seconds remaining.`));
      }
      if (left <= 0 && !document.hidden) {
        dispatch({
          type: 'RESOLVE', questionId: session.currentQuestion.id, optionId: null, now: performance.now(),
          deadlineExpired: true, praise: locale === 'ko' ? pickPraise() : pickPraiseEn(), gentle: locale === 'ko' ? pickGentle() : pickGentleEn()
        });
      }
    };
    tick();
    const interval = window.setInterval(tick, 200);
    return () => window.clearInterval(interval);
  }, [locale, state.session, t]);

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
      if (generationIssue.current) {
        const variety = recordIssuedFingerprints(generationIssue.current, generationFingerprints.current);
        if (!variety.saved) setStorageWarning(true);
      }
      const growthResult = growth.awardCompletion(session.config.subject, new Date(summary.completedAt));
      setLatestGrowthAward(growthResult.award);
      if (!growthResult.saved) setStorageWarning(true);
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
        session.config, [...(generationIssue.current?.excludedFingerprints ?? []), ...session.recentSignatures], session.recentAnswers,
        generationRandom.current, recentCorrectIndices,
        updatedMastery, preferredWordIds, nextPhase, session.targetSkillIds
      );
      generationFingerprints.current.push(nextQuestion.signature);
      dispatch({ type: 'ADVANCE', questionId, nextQuestion });
    } catch {
      setGenerationError(t('이 단계의 문제를 준비하지 못했어요. 다른 단계를 골라 주세요.', 'We could not prepare this level. Please choose another one.'));
      dispatch({ type: 'SESSION_ERROR' });
    }
  }, [growth, state.history, state.session]);

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
      setRecordTransferMessage(t('이 기기에 학습 기록 파일을 만들었어요.', 'A learning record file was created on this device.'));
    } catch {
      setRecordTransferMessage(t('기록 파일을 만들지 못했어요. 다시 시도해 주세요.', 'The record file could not be created. Please try again.'));
    }
  };

  const selectLearningRecordFile = async (file: File | undefined) => {
    setRecordTransfer(null);
    setRecordPreview(null);
    if (!file) return;
    try {
      const parsed = parseLearningRecordTransfer(await file.text());
      if (!parsed.ok) {
        setRecordTransferMessage(locale === 'ko' ? parsed.message : 'This file is not a valid NumberCal learning record.');
        return;
      }
      setRecordTransfer(parsed.transfer);
      setRecordPreview(parsed.preview);
      setRecordTransferMessage(t('파일 내용을 확인했어요. 아래 내용을 살펴본 뒤 불러오세요.', 'The file is ready. Review the summary below before importing.'));
    } catch {
      setRecordTransferMessage(t('파일 내용을 읽을 수 없어요.', 'The file could not be read.'));
    }
  };

  const restoreLearningRecords = () => {
    if (!recordTransfer || !recordPreview) return;
    if (!window.confirm(t('이 기기의 완료 기록과 학습 숙련도를 파일 내용으로 바꿀까요? 진행 중인 놀이는 바뀌지 않아요.', "Replace this device's completion and learning records with the file? The current game will not change."))) return;
    if (!restoreLearningRecordTransfer(recordTransfer)) {
      setRecordTransferMessage(t('기록을 불러오지 못했어요. 기존 기록은 그대로 두었어요.', 'The records could not be imported. Existing records were kept.'));
      return;
    }
    languageMastery.current = loadLanguageMastery();
    skillMastery.current = loadSkillMastery();
    recordedLanguageAnswers.current.clear();
    hintedQuestions.current.clear();
    dispatch({ type: 'RESTORE_HISTORY', history: loadHistory() });
    growth.reload();
    setRecordTransfer(null);
    setRecordPreview(null);
    setRecordTransferMessage(t('학습 기록을 불러왔어요.', 'Learning records were imported.'));
  };
  const targetSkillsFor = (config: SessionConfig, lessonRandom: RandomSource = random): string[] => {
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
      random: lessonRandom
    }).targetSkillIds;
  };

  const prepareGeneration = (config: SessionConfig): RandomSource => {
    const issue = createGenerationIssue({
      sectionId: config.subject,
      variant: `${config.difficulty}:${config.mode}:${config.theme}:${config.length}`
    });
    generationIssue.current = issue;
    generationRandom.current = randomForIssue(issue);
    generationFingerprints.current = [];
    return generationRandom.current;
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
      const sessionRandom = prepareGeneration(config);
      const targetSkillIds = targetSkillsFor(config, sessionRandom);
      const question = generateQuestion(
        config, generationIssue.current?.excludedFingerprints ?? [], [], sessionRandom, [], languageMastery.current, [], lessonPhaseAt(config.length, 0), targetSkillIds
      );
      generationFingerprints.current = [question.signature];
      advancedQuestions.current.clear();
      feedbackEffects.current.clear();
      recordedLanguageAnswers.current.clear();
      hintedQuestions.current.clear();
      setGenerationError('');
      dispatch({ type: 'START_SESSION', question, config, targetSkillIds });
    } catch {
      setGenerationError(t('이 단계의 문제를 준비하지 못했어요. 다른 단계를 골라 주세요.', 'We could not prepare this level. Please choose another one.'));
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
      praise: locale === 'ko' ? pickPraise() : pickPraiseEn(), gentle: locale === 'ko' ? pickGentle() : pickGentleEn()
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
      selectedAnswer: submitted, now: performance.now(), praise: locale === 'ko' ? pickPraise() : pickPraiseEn(), gentle: locale === 'ko' ? pickGentle() : pickGentleEn()
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
        fallbackConfig, [...(generationIssue.current?.excludedFingerprints ?? []), ...session.recentSignatures.slice(0, -1)], session.recentAnswers,
        generationRandom.current, session.recentCorrectIndices,
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
      setGenerationError(t('글자 문제를 준비하지 못했어요. 다른 단계를 골라 주세요.', 'We could not prepare a letter activity. Please choose another level.'));
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
    const config = state.latestResult?.config ?? state.draftConfig;
    dispatch({ type: 'UPDATE_CONFIG', patch: config });
    await beginSession(config);
  };

  const canListen = state.settings.tts && speechSupported();
  const activeAnimations = state.settings.animations && !reducedMotion;
  const dailyRecommendation = recommendedDailyMode();

  if (warmupConfig) {
    const theme = learningThemeInfo[warmupConfig.theme];
    return (
      <div className={`app-shell ${activeAnimations ? '' : 'reduce-motion'}`}>
        <main className="screen language-warmup-screen">
          <button className="icon-button warmup-close" onClick={() => setWarmupConfig(null)} aria-label={t('연습 닫기', 'Close practice')}>✕</button>
          <GuideCharacter className="warmup-guide" decorative />
          <p className="eyebrow">{t('모리와 한 번 연습해요', 'Practice once with Mori')}</p>
          <h1>{t('그림을 톡 눌러 볼까요?', 'Tap the picture')}</h1>
          <p>{t('어떤 답을 눌러도 천천히 같이 찾을 수 있어요.', 'Any choice is okay. We can find it together.')}</p>
          <button className="warmup-picture-button" onClick={() => void completeWarmup()} aria-label={t(`${theme.label} 그림을 누르고 작은 모험 시작`, `Tap ${themeLabel(warmupConfig.theme, locale)} and start the short adventure`)}>
            <span aria-hidden="true">{theme.icon}</span>
            <strong>{themeLabel(warmupConfig.theme, locale)}</strong>
            <small>{t('톡!', 'Tap!')}</small>
          </button>
          <small className="warmup-note">{t('잘했어요! 이제 작은 모험을 시작해요.', 'Great! Now start the short adventure.')}</small>
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
            animationsEnabled={activeAnimations}
          />
        </Suspense>
      </div>
    );
  }

  if (blockGardenOpen) {
    return (
      <div className={`app-shell ${activeAnimations ? '' : 'reduce-motion'}`}>
        <Suspense fallback={<GameLoading />}>
          <BlockGardenMode
            onExit={() => setBlockGardenOpen(false)}
            soundEnabled={state.settings.sound}
            animationsEnabled={activeAnimations}
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
            <button className="icon-button settings-button" onClick={() => dispatch({ type: 'OPEN_SETTINGS', from: 'home' })} aria-label={t('설정 열기', 'Open settings')}>⚙️</button>
            <button className={`home-growth-status tier-${growthSummary.medal}`} onClick={() => setGrowthOpen(true)} aria-label={t(`성장 숲 열기, 레벨 ${growthSummary.level}, 오늘 ${Math.min(currentDayRecord(growth.state)?.completedSections.length ?? 0, 3)}개 완료`, `Open Growth Forest, level ${growthSummary.level}, ${Math.min(currentDayRecord(growth.state)?.completedSections.length ?? 0, 3)} complete today`)}>
              <GrowthMedal xp={growth.state.totalXp} compact />
              <span><strong>Lv.{growthSummary.level}</strong><small>{t('오늘', 'Today')} {Math.min(currentDayRecord(growth.state)?.completedSections.length ?? 0, 3)} / 3</small></span>
            </button>
            <div className="home-hero-copy">
              <p className="eyebrow">{t('모리와 함께 한 걸음씩', 'One step at a time with Mori')}</p>
              <h1><small>{t('어린이 학습 놀이터', 'NumberCal Learning Playground')}</small>{t('오늘은 무엇을', 'What would you like')}<br />{t('배워 볼까요?', 'to learn today?')}</h1>
              <p className="lead">{t('좋아하는 놀이를 골라요.', 'Choose a game you like.')}</p>
            </div>
            <GuideCharacter className="home-guide" decorative />
          </header>
          <section className="home-recommendation" aria-labelledby="today-recommendation-title">
            <div><p className="eyebrow">{t('오늘의 추천', "Today's pick")}</p><h2 id="today-recommendation-title">{dailyRecommendation === 'story' ? t('짧은 이야기 한 편 어때요?', 'How about a short story?') : dailyRecommendation === 'balance' ? t('오늘의 저울을 맞춰 볼까요?', 'Can you balance the scale?') : t('오늘의 숫자 길을 찾아볼까요?', "Find today's number path")}</h2></div>
            {dailyRecommendation === 'story' ? (
              <button onClick={() => setStoryOpen(true)} aria-label={t('오늘의 추천 이야기 탐험대 시작하기', "Start today's recommended Story Explorers")}>
                <span className="recommendation-icon"><LearningIcon name="story" /></span>
                <span><strong>{t('이야기 탐험대', 'Story Explorers')}</strong><small>{t('읽고 듣고, 세 가지 활동을 해요', 'Read, listen, and try three activities')}</small></span>
                <b aria-hidden="true">{t('시작', 'Start')} ›</b>
              </button>
            ) : dailyRecommendation === 'balance' ? (
              <button onClick={() => setBalanceOpen(true)} aria-label={t('오늘의 추천 균형 저울 시작하기', "Start today's recommended Balance Scale")}>
                <span className="recommendation-icon balance-recommendation-icon"><BalanceIcon decorative /></span>
                <span><strong>{t('균형 저울', 'Balance Scale')}</strong><small>{t('숫자 추를 놓아 양쪽 합을 맞춰요', 'Place number weights to match both sides')}</small></span>
                <b aria-hidden="true">{t('시작', 'Start')} ›</b>
              </button>
            ) : (
              <button onClick={() => setNumberPathOpen(true)} aria-label={t('오늘의 추천 숫자 길 찾기 시작하기', "Start today's recommended Number Path")}>
                <span className="recommendation-icon number-path-recommendation-icon"><NumberPathIcon decorative /></span>
                <span><strong>{t('숫자 길 찾기', 'Number Path')}</strong><small>{t('상하좌우로 이어 목표 합을 만들어요', 'Connect neighbors to reach the target sum')}</small></span>
                <b aria-hidden="true">{t('시작', 'Start')} ›</b>
              </button>
            )}
          </section>
          <section className="home-learning-section" aria-labelledby="learning-list-title">
            <div className="home-section-title"><p className="eyebrow">{t('모든 학습', 'All activities')}</p><h2 id="learning-list-title">{t('하고 싶은 놀이를 골라요', 'Choose what you want to play')}</h2></div>
            <div className="subject-grid has-learning-games" aria-label={t('과목 선택', 'Choose an activity')}>
            {(Object.keys(subjectInfo) as Subject[]).map((subject) => {
              const info = subjectInfo[subject];
              return (
                <button key={subject} className={`subject-card ${info.className}`} onClick={() => dispatch({ type: 'SELECT_SUBJECT', subject })}>
                  <span className="subject-icon" aria-hidden="true"><LearningIcon name={subject} /></span>
                  <span className="subject-copy"><strong>{subjectLabel(subject, locale)}</strong><small>{subjectDescription(subject, locale)}</small></span>
                  <span className="arrow" aria-hidden="true">›</span>
                </button>
              );
            })}
            <button className="subject-card memory" onClick={() => setMemoryOpen(true)}>
              <span className="subject-icon" aria-hidden="true"><LearningIcon name="memory" /></span>
              <span className="subject-copy"><strong>{t('기억력 챌린지', 'Memory Challenge')}</strong><small>{t('뜻이 연결되는 카드를 찾아요', 'Match cards with connected meanings')}</small></span>
              <span className="arrow" aria-hidden="true">›</span>
            </button>
            <button className="subject-card story" onClick={() => setStoryOpen(true)}>
              <span className="subject-icon" aria-hidden="true"><LearningIcon name="story" /></span>
              <span className="subject-copy"><strong>{t('이야기 탐험대', 'Story Explorers')}</strong><small>{t('읽고 기억하며 생각해요', 'Read, remember, and think')}</small></span>
              <span className="arrow" aria-hidden="true">›</span>
            </button>
            <button className="subject-card sudoku" onClick={() => setSudokuOpen(true)}>
              <span className="subject-icon" aria-hidden="true"><LearningIcon name="sudoku" /></span>
              <span className="subject-copy"><strong>{t('스도쿠', 'Sudoku')}</strong><small>{t('숫자 규칙을 찾아요', 'Discover number patterns')}</small></span>
              <span className="arrow" aria-hidden="true">›</span>
            </button>
            <button className="subject-card balance" onClick={() => setBalanceOpen(true)}>
              <span className="subject-icon" aria-hidden="true"><BalanceIcon /></span>
              <span className="subject-copy"><strong>{t('균형 저울', 'Balance Scale')}</strong><small>{t('숫자 추로 양쪽을 맞춰요', 'Balance both sides with number weights')}</small></span>
              <span className="arrow" aria-hidden="true">›</span>
            </button>
            <button className="subject-card number-path" onClick={() => setNumberPathOpen(true)}>
              <span className="subject-icon" aria-hidden="true"><NumberPathIcon decorative /></span>
              <span className="subject-copy"><strong>{t('숫자 길 찾기', 'Number Path')}</strong><small>{t('숫자를 이어 목표 합을 만들어요', 'Connect numbers to reach the target sum')}</small></span>
              <span className="arrow" aria-hidden="true">›</span>
            </button>
            <button className="subject-card block-garden" onClick={() => setBlockGardenOpen(true)}>
              <span className="subject-icon" aria-hidden="true"><BlockGardenIcon /></span>
              <span className="subject-copy"><strong>{t('빈칸 정원', 'Block Garden')}</strong><small>{t('세 조각을 놓아 빈칸을 지켜요', 'Place three pieces and protect open spaces')}</small></span>
              <span className="arrow" aria-hidden="true">›</span>
            </button>
            </div>
          </section>
          {state.history[0] ? (
            <aside className="recent-card" aria-label={t('최근 학습 결과', 'Recent learning result')}>
              <span aria-hidden="true">⭐</span>
              <div><strong>{t('최근에도 멋지게 해냈어요!', 'You did great last time too!')}</strong><small>{subjectLabel(state.history[0].config.subject, locale)} · {state.history[0].correctCount} / {state.history[0].totalCount}</small></div>
            </aside>
          ) : <p className="first-visit">{t('처음이어도 괜찮아요. 좋아하는 과목을 눌러 보세요!', 'New here? Choose any activity you like!')}</p>}
          <button className="growth-entry-card" onClick={() => setGrowthOpen(true)} aria-label={t('나의 성장 숲 열기', 'Open my Growth Forest')}>
            <span className="growth-entry-icon" aria-hidden="true">🌳</span>
            <span><small>{t('조금씩 자라는 중', 'Growing little by little')}</small><strong>{t('나의 성장 숲', 'My Growth Forest')}</strong><b>{t('오늘 만난 친구와 다음 모험을 봐요', "See today's friends and your next adventure")}</b></span>
            <i aria-hidden="true">›</i>
          </button>
          {needRefresh && <UpdateNotice onUpdate={() => void updateServiceWorker(true)} />}
        </main>
      )}

      {state.screen === 'mode' && (
        <main className="screen selection-screen">
          <TopBar title={subjectLabel(state.draftConfig.subject, locale)} onBack={() => dispatch({ type: 'GO_HOME' })} />
          <section className="selection-heading"><p className="eyebrow">{t('한 가지를 골라요', 'Choose one')}</p><h1>{t('어떤 놀이를 해 볼까요?', 'What would you like to play?')}</h1></section>
          <div className="mode-grid">
            {modesForSubject(state.draftConfig.subject).map((mode) => {
              const info = modeInfo[mode];
              const listening = mode.endsWith('listen');
              const disabled = listening && !canListen;
              return (
                <button key={mode} className="mode-card" disabled={disabled} onClick={() => dispatch({ type: 'SELECT_MODE', mode })}>
                  <span className="mode-icon" aria-hidden="true">{info.icon}</span>
                  <span><strong>{modeLabel(mode, locale)}</strong><small>{disabled ? t('이 기기에서는 글자 문제를 이용해 주세요', 'Please use a letter activity on this device') : modeDescription(mode, locale)}</small></span>
                  {!disabled && <span className="arrow" aria-hidden="true">›</span>}
                </button>
              );
            })}
          </div>
        </main>
      )}

      {state.screen === 'setup' && (
        <main className="screen setup-screen">
          <TopBar title={modeLabel(state.draftConfig.mode, locale)} onBack={() => dispatch({ type: 'SELECT_SUBJECT', subject: state.draftConfig.subject })} />
          <section className="selection-heading"><p className="eyebrow">{t('오늘의 작은 모험', "Today's short adventure")}</p><h1>{state.draftConfig.subject === 'math' ? t('어떻게 놀아 볼까요?', 'How would you like to play?') : t('어떤 친구를 만날까요?', 'Which friends will you meet?')}</h1></section>
          <div className="difficulty-grid" role="radiogroup" aria-label={state.draftConfig.subject === 'math' ? t('단계', 'Level') : t('놀이 길', 'Adventure level')}>
            {DIFFICULTIES.map((difficulty) => {
              const info = difficultyInfo[difficulty];
              return <ChoiceChip key={difficulty} selected={state.draftConfig.difficulty === difficulty} onClick={() => dispatch({ type: 'UPDATE_CONFIG', patch: { difficulty } })} label={state.draftConfig.subject === 'math' ? difficultyLabel(difficulty, locale) : journeyLabel(difficulty, locale)} detail={state.draftConfig.subject === 'math' ? `${info.age} · ${difficulty === 'challenge' ? t('정답 직접 입력', 'Type your answer') : t(`보기 ${info.optionCount}개`, `${info.optionCount} choices`)}` : journeyDetail(difficulty, locale)} />;
            })}
          </div>
          {state.draftConfig.subject !== 'math' && (
            <section className="setup-choice-section" aria-labelledby="theme-choice-title">
              <h2 id="theme-choice-title">{t('좋아하는 친구를 골라요', 'Choose your favorite friends')}</h2>
              <div className="theme-choice-grid" role="radiogroup" aria-label={t('오늘의 테마', "Today's theme")}>
                {(Object.keys(learningThemeInfo) as LearningTheme[]).map((theme) => {
                  const info = learningThemeInfo[theme];
                  return <button key={theme} role="radio" aria-checked={state.draftConfig.theme === theme} className={`theme-choice ${state.draftConfig.theme === theme ? 'active' : ''}`} onClick={() => dispatch({ type: 'UPDATE_CONFIG', patch: { theme } })}><span aria-hidden="true">{info.icon}</span><strong>{themeLabel(theme, locale)}</strong></button>;
                })}
              </div>
            </section>
          )}
          <section className="setup-choice-section" aria-labelledby="length-choice-title">
            <h2 id="length-choice-title">{t('얼마나 놀까요?', 'How long would you like to play?')}</h2>
            <div className="adventure-length-grid" role="radiogroup" aria-label={t('모험 길이', 'Adventure length')}>
              {SESSION_LENGTHS.map((length) => <ChoiceChip key={length} selected={state.draftConfig.length === length} onClick={() => dispatch({ type: 'UPDATE_CONFIG', patch: { length } })} label={length === 5 ? t('작은 모험', 'Short adventure') : t('더 길게 놀기', 'Longer adventure')} detail={length === 5 ? t('5개 · 3~5분', '5 activities · 3–5 min') : t('15개 · 8~12분', '15 activities · 8–12 min')} compact />)}
            </div>
          </section>
          <section className="fixed-session-info" aria-label={t('놀이 안내', 'Activity details')}>
            <div><span aria-hidden="true">🗺️</span><small>{t('오늘은', 'Today')}</small><strong>{t(`${state.draftConfig.length}개`, `${state.draftConfig.length} activities`)}</strong></div>
            <div><span aria-hidden="true">{state.draftConfig.subject === 'math' ? '⏱' : '🌱'}</span><small>{state.draftConfig.subject === 'math' ? t('문제마다', 'Each question') : t('시간 걱정 없이', 'No timer')}</small><strong>{state.draftConfig.subject === 'math' ? t(`${QUESTION_TIME_SECONDS}초`, `${QUESTION_TIME_SECONDS} sec`) : t('천천히', 'Take your time')}</strong></div>
          </section>
          <div className="start-summary">{state.draftConfig.subject === 'math' ? difficultyLabel(state.draftConfig.difficulty, locale) : journeyLabel(state.draftConfig.difficulty, locale)} · {state.draftConfig.length === 5 ? t('작은 모험', 'Short adventure') : t('더 길게 놀기', 'Longer adventure')}</div>
          {generationError && <p className="settings-note warning" role="alert">{generationError}</p>}
          <button className="primary-button" onClick={() => void startSession()}>{state.draftConfig.length === 5 ? t('작은 모험 시작!', 'Start short adventure!') : t('길게 놀기 시작!', 'Start longer adventure!')} <span aria-hidden="true">→</span></button>
        </main>
      )}

      {state.screen === 'session' && state.session && (
        <main className="screen question-screen">
          <header className="question-header">
            <button className="icon-button" onClick={requestExit} aria-label={t('학습 나가기', 'Exit activity')}>✕</button>
            <div className="progress-copy"><strong>{subjectLabel(state.session.config.subject, locale)}</strong><span>{state.session.questionIndex + 1} / {state.session.config.length}</span></div>
            <div className="progress-track" aria-label={t(`진행도 ${state.session.questionIndex + 1}/${state.session.config.length}`, `Progress ${state.session.questionIndex + 1} of ${state.session.config.length}`)}><span style={{ width: `${((state.session.questionIndex + 1) / state.session.config.length) * 100}%` }} /></div>
          </header>
          {state.session.limitMs !== null && state.session.questionStatus === 'answering' && (
            <div className={`timer-card ${remainingMs !== null && remainingMs <= 5000 ? 'timer-low' : ''}`} aria-label={t(`남은 시간 ${Math.ceil((remainingMs ?? QUESTION_TIME_MS) / 1000)}초`, `${Math.ceil((remainingMs ?? QUESTION_TIME_MS) / 1000)} seconds remaining`)}>
              <span className="timer-icon" aria-hidden="true">⏱</span>
              <span className="timer-copy"><small>{t('남은 시간', 'Time left')}</small><strong>{t(`${Math.ceil((remainingMs ?? QUESTION_TIME_MS) / 1000)}초`, `${Math.ceil((remainingMs ?? QUESTION_TIME_MS) / 1000)}s`)}</strong></span>
              <span className="timer-bar"><i style={{ width: `${Math.max(0, ((remainingMs ?? QUESTION_TIME_MS) / QUESTION_TIME_MS) * 100)}%` }} /></span>
            </div>
          )}
          <section className="question-card">
            <p className="question-kicker">{phaseLabel((state.session.currentQuestion.metadata?.lessonPhase as LessonPhase | undefined) ?? 'discover', locale)} · {state.session.currentQuestion.activity ? activityLabel(state.session.currentQuestion.activity.kind, locale) : state.session.currentQuestion.kind === 'listening' ? t('귀를 쫑긋!', 'Listen closely!') : state.session.config.difficulty === 'challenge' ? t('글자를 써 볼까요?', 'Type the answer') : t('친구를 찾아요', 'Find the answer')}</p>
            <h1 ref={questionHeading} tabIndex={-1} className={state.session.currentQuestion.kind === 'math' ? 'math-prompt' : 'word-prompt'}>{state.session.currentQuestion.prompt}</h1>
            {hasMathVisual(state.session.currentQuestion) && state.session.currentQuestion.difficulty !== 'easy' && (
              <button className="math-hint-button" type="button" aria-expanded={mathHintVisible} onClick={() => setMathHintVisible((visible) => !visible)}>
                <span aria-hidden="true">▦</span>{mathHintVisible ? t('그림 힌트 닫기', 'Hide picture hint') : t('그림 힌트 보기', 'Show picture hint')}
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
                  <span aria-hidden="true">{speechState === 'speaking' ? '〰️' : '🔊'}</span>{speechState === 'speaking' ? t('듣는 중...', 'Playing...') : state.session.currentQuestion.speech.slowReplay ? t('문장 다시 듣기', 'Replay sentence') : t('다시 듣기', 'Replay')}
                </button>
                {state.session.currentQuestion.speech.slowReplay && <button className="slow-listen-button" onClick={replaySlowly} disabled={speechState === 'speaking'}>
                  <span aria-hidden="true">🐢</span>{t('느리게 문장 듣기', 'Play sentence slowly')}
                </button>}
              </div>
            )}
            {speechState === 'error' && state.session.currentQuestion.kind === 'listening' && <div className="speech-fallback"><p className="inline-notice">{t('소리가 나지 않나요?', 'No sound?')}</p><button className="small-button" onClick={switchToFillQuestion}>{t('글자 문제로 바꾸기', 'Switch to a letter activity')}</button></div>}
          </section>
          {state.session.config.difficulty === 'challenge' && !state.session.currentQuestion.activity && !state.session.config.mode.endsWith('adventure') ? (
            <form className="answer-form" onSubmit={submitTypedAnswer}>
              <label htmlFor="challenge-answer">{t('내 정답', 'My answer')}</label>
              <div>
                <input id="challenge-answer" value={typedAnswer} onChange={(event) => setTypedAnswer(event.target.value)}
                  inputMode={state.session.currentQuestion.kind === 'math' ? 'numeric' : 'text'}
                  autoCapitalize="none" autoComplete="off" spellCheck={false}
                  placeholder={state.session.currentQuestion.kind === 'math' ? t('숫자를 입력하세요', 'Type a number') : t('글자를 입력하세요', 'Type the letters')}
                  disabled={state.session.questionStatus !== 'answering' || state.session.paused} />
                <button type="submit" disabled={!typedAnswer.trim() || state.session.questionStatus !== 'answering' || state.session.paused}>{t('정답 확인', 'Check answer')}</button>
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
          ) : (            <div className={`option-grid options-${state.session.currentQuestion.options.length}`} role="group" aria-label={t('보기', 'Choices')}>
              {state.session.currentQuestion.options.map((option) => {
                const selected = state.session?.selectedOptionId === option.id;
                const correct = state.session?.questionStatus === 'feedback' && option.id === state.session.currentQuestion.correctOptionId;
                const incorrect = state.session?.questionStatus === 'feedback' && selected && !correct;
                return (
                  <button key={option.id} className={`option-button ${selected ? 'selected' : ''} ${correct ? 'correct' : ''} ${incorrect ? 'incorrect' : ''}`}
                    disabled={state.session?.questionStatus !== 'answering' || state.session?.paused === true} onClick={() => selectOption(option.id)}>
                    <span>{option.label}</span>{correct && <b aria-label={t('정답', 'Correct answer')}>✓</b>}{incorrect && <b aria-label={t('선택한 답', 'Selected answer')}>•</b>}
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
              <small className="feedback-wait-note">{t('5초 뒤 자동으로 넘어가요.', 'Continuing automatically in 5 seconds.')}</small>
              <button className="primary-button feedback-next" onClick={advanceFromFeedback}>
                {state.session.answers.length >= state.session.config.length ? t('오늘 찾은 것 보기', "See today's results") : t('다음 친구', 'Next')}
              </button>
            </div>
          )}
          <div className="sr-only" aria-live="polite">{state.session.questionStatus === 'feedback' ? t(`${state.session.feedbackText} 정답은 ${state.session.currentQuestion.explanation}`, `${state.session.feedbackText} The answer is ${state.session.currentQuestion.explanation}`) : ''}</div>
          <div className="sr-only" aria-live="polite">{timerAnnouncement}</div>
        </main>
      )}

      {state.screen === 'result' && state.latestResult && (
        <main className={`screen result-screen ${state.latestReview.length ? 'has-review' : ''}`}>
          {latestGrowthAward && <GrowthCelebration award={latestGrowthAward} animationsEnabled={activeAnimations} />}
          <div className="result-burst result-guide-wrap" aria-hidden="true"><GuideCharacter className="result-guide" decorative /></div>
          <p className="eyebrow">{state.latestResult.config.subject === 'math' ? t('오늘의 학습 끝!', "Today's lesson is complete!") : t('이야기 조각을 찾았어요!', 'You found a story piece!')}</p>
          <h1>{state.latestResult.config.subject === 'math' ? `${state.latestResult.correctCount} / ${state.latestResult.totalCount}` : t('작은 모험 끝!', 'Adventure complete!')}</h1>
          <p className="result-message">{resultMessage(state.latestResult.correctCount / state.latestResult.totalCount, locale)}</p>
          {latestGrowthAward && <GrowthRewardCard award={latestGrowthAward} />}
          {state.latestResult.config.subject !== 'math' && (
            <section className="story-sticker-card" aria-label={t('오늘 받은 이야기 스티커', "Today's story sticker")}>
              <span aria-hidden="true">{learningThemeInfo[state.latestResult.config.theme].icon}</span>
              <div><small>{t('오늘의 이야기 스티커', "Today's story sticker")}</small><strong>{themeLabel(state.latestResult.config.theme, locale)}</strong><p>{t('끝까지 함께해서 만났어요!', 'You earned it by finishing the adventure!')}</p></div>
            </section>
          )}
          {state.latestResult.config.subject !== 'math' && state.latestResult.discoveredWords?.length ? (
            <section className="discovery-section" aria-labelledby="discovery-heading">
              <h2 id="discovery-heading">{t('오늘 만난 친구', 'Words you met today')}</h2>
              <div className="discovery-chips">{state.latestResult.discoveredWords.slice(0, 5).map((word) => <span key={word}>{word}</span>)}</div>
            </section>
          ) : null}
          <section className="result-stats" aria-label={t('학습 결과', 'Learning results')}>
            <ResultStat icon={state.latestResult.config.subject === 'math' ? '✓' : '⭐'} label={state.latestResult.config.subject === 'math' ? t('맞힌 문제', 'Correct') : t('혼자 찾은 친구', 'Found independently')} value={t(`${state.latestResult.correctCount}개`, `${state.latestResult.correctCount}`)} />
            <ResultStat icon={state.latestResult.config.subject === 'math' ? '↗' : '🌱'} label={state.latestResult.config.subject === 'math' ? t('다시 연습', 'Practice again') : t('다시 만날 친구', 'Meet again')} value={t(`${state.latestResult.incorrectCount + state.latestResult.timeoutCount}개`, `${state.latestResult.incorrectCount + state.latestResult.timeoutCount}`)} />
            <ResultStat icon={state.latestResult.config.subject === 'math' ? '⏱' : '🗺️'} label={state.latestResult.config.subject === 'math' ? t('평균 시간', 'Average time') : t('오늘의 모험', "Today's adventure")} value={state.latestResult.config.subject === 'math' ? t(`${(state.latestResult.averageResponseMs / 1000).toFixed(1)}초`, `${(state.latestResult.averageResponseMs / 1000).toFixed(1)}s`) : t(`${state.latestResult.totalCount}개`, `${state.latestResult.totalCount}`)} />
          </section>
          {state.latestResult.timeoutCount > 0 && <p className="timeout-note">{t(`시간이 지난 문제 ${state.latestResult.timeoutCount}개`, `${state.latestResult.timeoutCount} timed out`)}</p>}
          <div className="result-actions">
            <button className="primary-button" onClick={() => void tryAgain()}>{state.latestResult.config.subject === 'math' ? t('같은 단계 한 번 더', 'Try this level again') : t('한 번 더 만나기', 'Play again')}</button>
            <button className="secondary-button" onClick={() => dispatch({ type: 'SELECT_MODE', mode: state.latestResult!.config.mode })}>{state.latestResult.config.subject === 'math' ? t('난이도 바꾸기', 'Change difficulty') : t('다른 모험 고르기', 'Choose another adventure')}</button>
            <button className="text-button" onClick={() => dispatch({ type: 'GO_HOME' })}>{t('처음으로', 'Home')}</button>
          </div>
          {state.latestResult.config.subject !== 'math' && state.latestReview.length > 0 && (
            <p className="timeout-note">{t('오늘 어려웠던 친구는 다음 모험에서 다시 만나요.', 'You will meet the tricky words again next time.')}</p>
          )}
          {state.latestReview.length > 0 && (
            <section className="review-section" aria-labelledby="review-heading">
              <div className="review-heading-row">
                <div><p className="eyebrow">{t('다시 만난 친구', 'Review')}</p><h2 id="review-heading">{t('천천히 보면 더 잘 기억나요', 'A slow look helps you remember')}</h2></div>
                <span>{t(`${state.latestReview.length}문제`, `${state.latestReview.length} questions`)}</span>
              </div>
              <ol className="review-list">
                {state.latestReview.map((item, index) => (
                  <li key={item.questionId} className="review-card">
                    <div className="review-card-top"><span>{index + 1}</span><small>{item.resolution === 'timeout' ? t('천천히 다시 만나요', 'Try it slowly') : t('다시 만난 친구', 'Review')}</small></div>
                    <strong className="review-prompt">{item.prompt}</strong>
                    <dl className="review-answers">
                      <div><dt>{t('내 답', 'My answer')}</dt><dd>{item.selectedAnswer ?? t('고르기 전에 시간이 지났어요', 'Time ran out before a choice')}</dd></div>
                      <div><dt>{item.subject === 'math' ? t('정답', 'Correct answer') : t('정답 낱말', 'Correct word')}</dt><dd>{item.correctAnswer}</dd></div>
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
          <TopBar title={t('설정', 'Settings')} onBack={() => dispatch({ type: 'CLOSE_SETTINGS' })} />
          <section className="settings-panel">
            <ToggleRow icon="♪" label={t('효과음', 'Sound effects')} detail={t('정답을 맞히면 짧은 소리가 나요', 'Play a short sound for a correct answer')} checked={state.settings.sound} onChange={(sound) => updateSettings({ sound })} />
            <ToggleRow icon="🔊" label={t('듣기 음성', 'Learning audio')} detail={t('한국어·영어 단어와 문장을 읽어줘요', 'Read Korean and English learning words and sentences aloud')} checked={state.settings.tts} onChange={(tts) => { if (!tts) cancelActiveSpeech(); updateSettings({ tts }); }} />
            {state.settings.tts && <SpeechRatePicker value={state.settings.speechRate} onChange={(speechRate) => { cancelActiveSpeech(); updateSettings({ speechRate }); }} />}
            <ToggleRow icon="✨" label={t('반짝이는 효과', 'Celebration effects')} detail={t('별과 축하 효과를 보여줘요', 'Show stars and celebration effects')} checked={state.settings.animations} onChange={(animations) => updateSettings({ animations })} />
          </section>
          <LocalePicker preference={preference} locale={locale} onChange={setPreference} />
          {reducedMotion && <p className="settings-note">{t('기기의 동작 줄이기 설정을 따르고 있어요.', "Following this device's reduced motion setting.")}</p>}
          {storageWarning && <p className="settings-note warning">{t('이 기기에는 설정이나 기록을 저장하지 못할 수 있어요.', 'This device may not be able to save settings or records.')}</p>}
          <section className="settings-panel record-transfer" aria-labelledby="record-transfer-heading">
            <div className="record-transfer-copy"><strong id="record-transfer-heading">{t('학습 기록 옮기기', 'Move learning records')}</strong><small>{t('이름 없이 완료 기록과 학습 숙련도만 파일로 옮겨요', 'Transfer completion and progress records without a name')}</small></div>
            <div className="record-transfer-actions">
              <button type="button" className="small-button" onClick={downloadLearningRecords}>{t('기록 파일 만들기', 'Export records')}</button>
              <button type="button" className="small-button" onClick={() => recordFileInput.current?.click()}>{t('기록 파일 고르기', 'Choose a record file')}</button>
              <input ref={recordFileInput} hidden type="file" accept="application/json,.json" aria-label={t('학습 기록 파일 고르기', 'Choose a learning record file')} onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                void selectLearningRecordFile(file);
              }} />
            </div>
            {recordTransferMessage && <p className="record-transfer-message" role="status">{recordTransferMessage}</p>}
            {recordPreview && (
              <div className="record-preview" aria-label="불러올 학습 기록 미리보기">
                <strong>{t('불러올 내용', 'Records to import')}</strong>
                <span>{t(`기록 묶음 ${recordPreview.sections}개 · 최근 학습 ${recordPreview.recentSessions}회`, `${recordPreview.sections} record groups · ${recordPreview.recentSessions} recent lessons`)}</span>
                <span>{t(`낱말 기록 ${recordPreview.languageEntries}개 · 기술 기록 ${recordPreview.skillEntries}개`, `${recordPreview.languageEntries} word records · ${recordPreview.skillEntries} skill records`)}</span>
                <button type="button" className="primary-button" onClick={restoreLearningRecords}>{t('이 기록 불러오기', 'Import these records')}</button>
              </div>
            )}
          </section>
          <section className="settings-panel danger-zone">
            <div><strong>{t('학습·게임 기록', 'Learning and game records')}</strong><small>{t('최근 학습과 게임의 완료 기록을 지워요', 'Delete recent learning and game completion records')}</small></div>
            <button className="small-button" onClick={() => { if (window.confirm(t('최근 학습과 모든 게임의 완료 기록을 지울까요? 진행 중인 놀이는 유지돼요.', 'Delete recent learning and all game completion records? The current game will stay open.'))) { if (!clearAllLearningRecords()) setStorageWarning(true); languageMastery.current = []; skillMastery.current = []; recordedLanguageAnswers.current.clear(); hintedQuestions.current.clear(); growth.reload(); setLatestGrowthAward(null); dispatch({ type: 'CLEAR_HISTORY' }); } }}>{t('기록 지우기', 'Delete records')}</button>
          </section>
          <p className="privacy-note">{t('이름이나 개인정보는 모으지 않아요. 기록은 이 기기에만 저장돼요.', 'We do not collect names or personal information. Records stay on this device.')}</p>
        </main>
      )}

      {showExit && <ConfirmDialog title={t('여기까지 할까요?', 'Stop here?')} message={t('지금 나가면 이번 기록은 저장되지 않아요.', "This activity won't be saved if you leave now.")} primary={t('계속 풀기', 'Keep playing')} secondary={t('여기까지 하고 나가기', 'Leave without saving')} onPrimary={() => void continueSession()} onSecondary={() => { setShowExit(false); dispatch({ type: 'ABORT_SESSION' }); }} />}
      {showResume && <ConfirmDialog title={t('다시 시작할까요?', 'Ready to continue?')} message={t('준비되면 계속하기를 눌러 주세요.', 'Press continue when you are ready.')} primary={t('계속하기', 'Continue')} onPrimary={() => void continueSession()} />}
    </div>
  );
}

function TopBar({ title, onBack }: { title: string; onBack: () => void }) {
  const { t } = useLocale();
  return <header className="top-bar"><button className="icon-button" onClick={onBack} aria-label={t('뒤로 가기', 'Go back')}>←</button><strong>{title}</strong><span className="top-spacer" /></header>;
}

function ChoiceChip({ selected, onClick, label, detail, compact = false }: { selected: boolean; onClick: () => void; label: string; detail?: string; compact?: boolean }) {
  return <button role="radio" aria-checked={selected} className={`choice-chip ${selected ? 'active' : ''} ${compact ? 'compact' : ''}`} onClick={onClick}><strong>{label}</strong>{detail && <small>{detail}</small>}<span aria-hidden="true">{selected ? '✓' : ''}</span></button>;
}

function Feedback({ resolution, text, explanation, celebrate }: { resolution: 'correct' | 'incorrect' | 'timeout'; text: string; explanation: string; celebrate: boolean }) {
  const { t } = useLocale();
  const correct = resolution === 'correct';
  return (
    <div className={`feedback-panel ${correct ? 'feedback-correct' : 'feedback-gentle'}`}>
      {correct && celebrate && <div className="confetti" aria-hidden="true">{['★', '●', '✦', '★', '●', '✦', '★', '●'].map((shape, index) => <i key={index}>{shape}</i>)}</div>}
      <span className="feedback-icon" aria-hidden="true">{correct ? '★' : resolution === 'timeout' ? '⏱' : '♥'}</span>
      <div><strong>{text}</strong>{!correct && <small>{t('정답은', 'The answer is')} <b>{explanation}</b></small>}</div>
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
  const { t } = useLocale();
  const choices: readonly { value: SpeechRate; label: string; detail: string }[] = [
    { value: 0.75, label: t('천천히', 'Slow'), detail: t('0.75배', '0.75×') },
    { value: 0.85, label: t('편안하게', 'Comfortable'), detail: t('0.85배', '0.85×') },
    { value: 0.95, label: t('또박또박', 'Clear'), detail: t('0.95배', '0.95×') }
  ];
  return (
    <fieldset className="speech-rate-picker">
      <legend><strong>{t('문장 읽기 속도', 'Reading speed')}</strong><small>{t('문장과 이야기 듣기에 적용돼요', 'Applies to learning sentences and stories')}</small></legend>
      <div role="radiogroup" aria-label={t('읽기 속도', 'Reading speed')}>
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
  const { t } = useLocale();
  return <aside className="update-notice"><span>{t('새 버전이 준비됐어요.', 'A new version is ready.')}</span><button onClick={onUpdate}>{t('새로 보기', 'Update')}</button></aside>;
}

function LocalePicker({ preference, locale, onChange }: {
  preference: LocalePreference;
  locale: AppLocale;
  onChange: (preference: LocalePreference) => void;
}) {
  const { t } = useLocale();
  const choices: readonly { value: LocalePreference; label: string; detail: string }[] = [
    { value: 'system', label: t('기기 언어', 'Device language'), detail: t(`현재 ${locale === 'ko' ? '한국어' : 'English'}`, `Currently ${locale === 'ko' ? '한국어' : 'English'}`) },
    { value: 'ko', label: '한국어', detail: t('메뉴를 한국어로', 'Korean menus') },
    { value: 'en', label: 'English', detail: t('메뉴를 영어로', 'English menus') }
  ];
  return (
    <fieldset className="settings-panel locale-picker">
      <legend><strong>{t('앱 언어', 'App language')}</strong><small>{t('학습 중인 한국어·영어 낱말과 음성은 바뀌지 않아요', 'Korean and English learning words and audio never change')}</small></legend>
      <div role="radiogroup" aria-label={t('앱 언어 선택', 'Choose app language')}>
        {choices.map((choice) => <button key={choice.value} type="button" role="radio" aria-checked={preference === choice.value} className={preference === choice.value ? 'active' : ''} onClick={() => onChange(choice.value)}><strong>{choice.label}</strong><small>{choice.detail}</small><span aria-hidden="true">{preference === choice.value ? '✓' : ''}</span></button>)}
      </div>
    </fieldset>
  );
}

const resultMessage = (score: number, locale: AppLocale): string => {
  if (score >= 0.9) return locale === 'ko' ? '정말 멋지게 해냈어요!' : 'You did an amazing job!';
  if (score >= 0.7) return locale === 'ko' ? '아주 잘했어요!' : 'Great work!';
  if (score >= 0.4) return locale === 'ko' ? '차근차근 잘 풀었어요!' : 'You worked through it step by step!';
  return locale === 'ko' ? '끝까지 해낸 게 멋져요!' : 'Finishing all the way through is wonderful!';
};

export default App;
