import { useEffect, useMemo, useRef, useState } from 'react';
import { playSuccessSound, unlockAudio } from '../services/soundService';
import { cancelSpeech, speak, speechSupported } from '../services/speechService';
import { CryptoRandom } from '../services/randomService';
import {
  STORY_LEVELS, stories, storiesByLevel, storyById, storyLevelInfo,
  storyVocabularyById, storyVocabularyLabelById
} from './storyData';
import {
  correctSequenceSceneIds, createStoryProgress, createStoryVocabularyMission,
  dailyStory, isCorrectSequence, pickStory, storyDailyKey
} from './storyGenerator';
import {
  clearStoryProgress, loadStoryProgress, loadStoryRecords, rememberStoryLevel, saveStoryCompletion, saveStoryProgress
} from './storyStorage';
import type {
  Story, StoryActivity, StoryActivityState, StoryLevel, StoryProgress, StoryRecords, StoryResult
} from './types';
import type { SpeechRate } from '../domain/types';
import { GuideCharacter } from '../visuals/GuideCharacter';
import { storyCoverVisuals, storySceneVisuals } from '../visuals/visualAssets';
import { useGrowth } from '../growth/GrowthContext';
import { GrowthCelebration, GrowthRewardCard } from '../growth/GrowthUI';
import type { GrowthAward } from '../growth/types';
import './story.css';

type StoryScreen = 'home' | 'reading' | 'activity' | 'recall' | 'result' | 'library';

const random = new CryptoRandom();
const formatTime = (milliseconds: number): string => {
  const seconds = Math.floor(milliseconds / 1000);
  return `${Math.floor(seconds / 60)}분 ${String(seconds % 60).padStart(2, '0')}초`;
};

const activityLabel = (activity: StoryActivity): string => activity.type === 'sequence' ? '순서 찾기' : ({
  detail: '내용 기억', cause: '이유 찾기', emotion: '마음 찾기', vocabulary: '낱말 찾기',
  title: '생각 찾기', prediction: '다음 장면'
}[activity.kind]);

const replaceActivity = (
  progress: StoryProgress, activityId: string, update: (state: StoryActivityState) => StoryActivityState
): StoryProgress => ({
  ...progress,
  activities: progress.activities.map((state) => state.activityId === activityId ? update(state) : state),
  updatedAt: new Date().toISOString()
});

export default function StoryMode({
  onExit, soundEnabled, ttsEnabled, speechRate, animationsEnabled, learnedWordIds, onMissionRecallCorrect
}: {
  onExit: () => void;
  soundEnabled: boolean;
  ttsEnabled: boolean;
  speechRate: SpeechRate;
  animationsEnabled: boolean;
  learnedWordIds: readonly string[];
  onMissionRecallCorrect?: (wordId: string, skillIds: readonly string[]) => void;
}) {
  const growth = useGrowth();
  const initialRecords = useMemo(() => loadStoryRecords(), []);
  const [records, setRecords] = useState<StoryRecords>(initialRecords);
  const [savedProgress, setSavedProgress] = useState<StoryProgress | null>(() => loadStoryProgress());
  const [progress, setProgress] = useState<StoryProgress | null>(null);
  const [screen, setScreen] = useState<StoryScreen>('home');
  const [selectedLevel, setSelectedLevel] = useState<StoryLevel>(initialRecords.lastLevel);
  const [result, setResult] = useState<StoryResult | null>(null);
  const [growthAward, setGrowthAward] = useState<GrowthAward | null>(null);
  const [message, setMessage] = useState('');
  const [selectedSequenceId, setSelectedSequenceId] = useState<string | null>(null);
  const [inputLocked, setInputLocked] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [storageWarning, setStorageWarning] = useState(false);
  const inputLock = useRef(false);
  const lockTimer = useRef<number | null>(null);
  const selectedSequenceRef = useRef<string | null>(null);

  const clearSequenceSelection = () => {
    selectedSequenceRef.current = null;
    setSelectedSequenceId(null);
  };

  const persist = (next: StoryProgress) => {
    setProgress(next);
    setSavedProgress(next);
    if (!saveStoryProgress(next)) setStorageWarning(true);
  };

  useEffect(() => {
    if (!progress || (screen !== 'reading' && screen !== 'activity' && screen !== 'recall')) return;
    const timer = window.setInterval(() => {
      setProgress((current) => {
        if (!current) return current;
        const next = { ...current, elapsedMs: current.elapsedMs + 1000, updatedAt: new Date().toISOString() };
        setSavedProgress(next);
        if (!saveStoryProgress(next)) setStorageWarning(true);
        return next;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [progress?.id, screen]);

  useEffect(() => () => {
    cancelSpeech();
    if (lockTimer.current !== null) window.clearTimeout(lockTimer.current);
  }, []);

  const brieflyLock = (duration = 600) => {
    inputLock.current = true;
    setInputLocked(true);
    if (lockTimer.current !== null) window.clearTimeout(lockTimer.current);
    lockTimer.current = window.setTimeout(() => {
      inputLock.current = false;
      setInputLocked(false);
      lockTimer.current = null;
    }, duration);
  };

  const releaseInputLock = () => {
    if (lockTimer.current !== null) window.clearTimeout(lockTimer.current);
    lockTimer.current = null;
    inputLock.current = false;
    setInputLocked(false);
  };

  const readAloud = async (text: string, slow = false) => {
    if (!ttsEnabled || !speechSupported() || speaking) return;
    setSpeaking(true);
    await speak(text, 'ko-KR', slow ? 0.75 : speechRate);
    setSpeaking(false);
  };

  const startStory = async (story: Story, daily = false, missionVocabularyIds: readonly string[] = []) => {
    await unlockAudio();
    cancelSpeech();
    releaseInputLock();
    const dateKey = daily ? storyDailyKey() : undefined;
    const next = createStoryProgress(story, daily, dateKey, random, missionVocabularyIds);
    const nextRecords = rememberStoryLevel(records, story.level);
    setRecords(nextRecords);
    setSelectedLevel(story.level);
    setResult(null);
    setMessage('');
    clearSequenceSelection();
    persist(next);
    setScreen('reading');
  };

  const resumeStory = () => {
    if (!savedProgress || !storyById(savedProgress.storyId)) return;
    setProgress(savedProgress);
    setSelectedLevel(savedProgress.level);
    setScreen(savedProgress.screen);
  };

  const chooseLevel = (level: StoryLevel) => {
    setSelectedLevel(level);
    setRecords((current) => rememberStoryLevel(current, level));
  };

  const returnToStoryHome = () => {
    cancelSpeech();
    setSpeaking(false);
    setProgress(null);
    setMessage('');
    clearSequenceSelection();
    setScreen('home');
  };

  const startReview = (activity: StoryActivity) => {
    if (!progress) return;
    const evidenceIndex = activity.type === 'choice'
      ? Math.max(0, storyById(progress.storyId)?.scenes.findIndex((scene) => scene.id === activity.evidenceSceneId) ?? 0)
      : 0;
    let next = replaceActivity(progress, activity.id, (state) => ({
      ...state, reviewCount: state.reviewCount + 1, firstTry: false
    }));
    next = { ...next, screen: 'reading', pageIndex: evidenceIndex, reviewActivityId: activity.id };
    setMessage('관련 장면을 천천히 다시 읽어 보세요.');
    persist(next);
    setScreen('reading');
  };

  const returnFromReview = () => {
    if (!progress?.reviewActivityId) return;
    let next = replaceActivity(progress, progress.reviewActivityId, (state) => ({ ...state, mustReview: false }));
    next = { ...next, screen: 'activity', reviewActivityId: undefined };
    setMessage('좋아요! 다시 생각해 볼까요?');
    persist(next);
    setScreen('activity');
  };

  const updateCurrentActivity = (update: (state: StoryActivityState) => StoryActivityState) => {
    if (!progress) return;
    const activity = storyById(progress.storyId)?.activities[progress.activityIndex];
    if (!activity) return;
    persist(replaceActivity(progress, activity.id, update));
  };

  const markChoice = (activity: Extract<StoryActivity, { type: 'choice' }>, optionId: string) => {
    if (!progress || inputLock.current) return;
    const state = progress.activities[progress.activityIndex];
    if (state.mustReview || state.status !== 'active' || state.triedOptionIds.includes(optionId)) return;
    brieflyLock();
    if (optionId === activity.correctOptionId) {
      updateCurrentActivity((current) => ({ ...current, status: activity.evidenceRequired ? 'evidence' : 'complete' }));
      setMessage(activity.evidenceRequired ? '좋은 생각이에요! 이제 이야기에서 근거 장면을 찾아보세요.' : activity.explanation);
      if (!activity.evidenceRequired && soundEnabled) playSuccessSound();
      return;
    }
    const wrongAttempts = state.wrongAttempts + 1;
    updateCurrentActivity((current) => ({
      ...current,
      triedOptionIds: [...current.triedOptionIds, optionId],
      wrongAttempts,
      usedHint: true,
      firstTry: false,
      mustReview: wrongAttempts >= 2
    }));
    setMessage(wrongAttempts >= 2 ? '여기서 잠깐! 이야기를 다시 살펴보고 찾아봐요.' : activity.hint);
  };

  const markEvidence = (activity: Extract<StoryActivity, { type: 'choice' }>, sceneId: string) => {
    if (!progress || inputLock.current) return;
    const state = progress.activities[progress.activityIndex];
    if (state.mustReview || state.status !== 'evidence' || state.triedEvidenceSceneIds.includes(sceneId)) return;
    brieflyLock();
    if (sceneId === activity.evidenceSceneId) {
      updateCurrentActivity((current) => ({ ...current, status: 'complete' }));
      setMessage(`${activity.explanation} 근거도 정확히 찾았어요!`);
      if (soundEnabled) playSuccessSound();
      return;
    }
    const tried = [...state.triedEvidenceSceneIds, sceneId];
    updateCurrentActivity((current) => ({
      ...current,
      triedEvidenceSceneIds: tried,
      wrongAttempts: current.wrongAttempts + 1,
      usedHint: true,
      firstTry: false,
      mustReview: tried.length >= 2
    }));
    setMessage(tried.length >= 2 ? '근거가 나오는 부분을 다시 읽고 돌아와요.' : '선택한 장면보다 더 직접 보여 주는 부분이 있어요.');
  };

  const checkSequence = (activity: Extract<StoryActivity, { type: 'sequence' }>) => {
    if (!progress || inputLock.current) return;
    const state = progress.activities[progress.activityIndex];
    if (state.mustReview || state.status !== 'active') return;
    brieflyLock();
    if (isCorrectSequence(state.sequenceOrder, activity.sceneIds)) {
      updateCurrentActivity((current) => ({ ...current, status: 'complete', lockedSceneIds: [...activity.sceneIds] }));
      setMessage('처음부터 끝까지 순서를 정확히 찾았어요!');
      if (soundEnabled) playSuccessSound();
      return;
    }
    const wrongAttempts = state.wrongAttempts + 1;
    const lockedSceneIds = correctSequenceSceneIds(state.sequenceOrder, activity.sceneIds);
    updateCurrentActivity((current) => ({
      ...current,
      lockedSceneIds,
      wrongAttempts,
      usedHint: true,
      firstTry: false,
      mustReview: wrongAttempts >= 2
    }));
    clearSequenceSelection();
    setMessage(wrongAttempts >= 2
      ? '두 번 살펴보았어요. 이야기의 처음부터 다시 확인해 봐요.'
      : `${lockedSceneIds.length}개 장면은 자리가 맞아요. 나머지를 바꾸어 보세요.`);
  };

  const swapSequence = (sceneId: string, targetId?: string) => {
    if (!progress || inputLocked) return;
    const state = progress.activities[progress.activityIndex];
    if (state.mustReview || state.lockedSceneIds.includes(sceneId)) return;
    const otherId = targetId ?? selectedSequenceRef.current;
    if (!otherId) {
      selectedSequenceRef.current = sceneId;
      setSelectedSequenceId(sceneId);
      return;
    }
    if (otherId === sceneId) {
      clearSequenceSelection();
      return;
    }
    if (state.lockedSceneIds.includes(otherId)) return;
    updateCurrentActivity((current) => {
      const nextOrder = [...current.sequenceOrder];
      const first = nextOrder.indexOf(otherId);
      const second = nextOrder.indexOf(sceneId);
      [nextOrder[first], nextOrder[second]] = [nextOrder[second], nextOrder[first]];
      return { ...current, sequenceOrder: nextOrder };
    });
    clearSequenceSelection();
    setMessage('두 장면의 자리를 바꾸었어요.');
  };

  const showHint = (activity: StoryActivity) => {
    updateCurrentActivity((current) => ({ ...current, usedHint: true, firstTry: false }));
    setMessage(activity.hint);
  };

  const completeStory = (completedProgress = progress) => {
    if (!completedProgress || completedProgress.activities.some((activity) => activity.status !== 'complete')) return;
    const completed = saveStoryCompletion(records, completedProgress);
    const growthResult = growth.awardCompletion('story');
    setGrowthAward(growthResult.award);
    setRecords(completed.records);
    setResult(completed.result);
    if (!completed.saved || !growthResult.saved || !clearStoryProgress()) setStorageWarning(true);
    setSavedProgress(null);
    setProgress(null);
    setScreen('result');
  };

  const nextActivity = () => {
    if (!progress) return;
    releaseInputLock();
    if (progress.activityIndex >= progress.activities.length - 1) {
      if (progress.missionVocabularyIds?.length && !progress.missionRecallComplete) {
        const next = { ...progress, screen: 'recall' as const, updatedAt: new Date().toISOString() };
        setMessage('이야기 도움 없이 낱말을 다시 떠올려 봐요.');
        persist(next);
        setScreen('recall');
        return;
      }
      completeStory();
      return;
    }
    const next = { ...progress, activityIndex: progress.activityIndex + 1, updatedAt: new Date().toISOString() };
    setMessage('새로운 활동이에요. 이야기를 떠올려 보세요!');
    clearSequenceSelection();
    persist(next);
  };

  const answerMissionRecall = (wordId: string) => {
    if (!progress?.missionVocabularyIds?.length || progress.missionRecallSelectedWordId) return;
    const targetWordId = progress.missionVocabularyIds[progress.missionRecallIndex ?? 0];
    const correct = wordId === targetWordId;
    if (correct) {
      const vocabulary = storyVocabularyById.get(targetWordId);
      if (vocabulary) onMissionRecallCorrect?.(targetWordId, vocabulary.skillIds);
    }
    persist({
      ...progress,
      missionRecallSelectedWordId: wordId,
      missionRecallCorrect: (progress.missionRecallCorrect ?? 0) + (correct ? 1 : 0),
      updatedAt: new Date().toISOString()
    });
    setMessage(correct ? '맞아요! 이야기 속 낱말을 다시 기억했어요.' : '괜찮아요. 정답을 보고 한 번 더 기억해요.');
  };

  const advanceMissionRecall = () => {
    if (!progress?.missionVocabularyIds?.length || !progress.missionRecallSelectedWordId) return;
    const index = progress.missionRecallIndex ?? 0;
    if (index >= progress.missionVocabularyIds.length - 1) {
      completeStory({
        ...progress,
        missionRecallSelectedWordId: undefined,
        missionRecallComplete: true,
        updatedAt: new Date().toISOString()
      });
      return;
    }
    const next = {
      ...progress,
      missionRecallIndex: index + 1,
      missionRecallSelectedWordId: undefined,
      updatedAt: new Date().toISOString()
    };
    setMessage('다음 낱말도 떠올려 볼까요?');
    persist(next);
  };

  if (screen === 'reading' && progress) {
    const story = storyById(progress.storyId);
    if (!story) return null;
    const scene = story.scenes[progress.pageIndex];
    const sceneMissionWords = (progress.missionVocabularyIds ?? [])
      .filter((wordId) => scene.vocabularyIds.includes(wordId))
      .map((wordId) => storyVocabularyLabelById.get(wordId))
      .filter((word): word is string => Boolean(word));
    const reviewing = Boolean(progress.reviewActivityId);
    return (
      <main className="story-screen story-reading-screen">
        <StoryTopBar title={story.title} onBack={returnToStoryHome} />
        <div className="story-progress" style={{ gridTemplateColumns: `repeat(${story.scenes.length}, 1fr)` }} aria-label={`이야기 ${progress.pageIndex + 1} / ${story.scenes.length}장면`}>
          {story.scenes.map((item, index) => <i key={item.id} className={index <= progress.pageIndex ? 'done' : ''} />)}
        </div>
        {reviewing && <aside className="story-review-banner" role="status">🔎 {message}</aside>}
        <article className="story-scene-card">
          <span className="story-scene-number">{progress.pageIndex + 1}번째 장면</span>
          <StoryScenePicture sceneId={scene.id} fallback={scene.illustration} alt={scene.alt} featured />
          <p>{scene.text}</p>
          {sceneMissionWords.length > 0 && (
            <aside className="story-mission-found" role="status">찾았어요! {sceneMissionWords.join(' · ')}</aside>
          )}
          {ttsEnabled && speechSupported() && (
            <div className="story-listen-actions">
              <button className={`story-listen-button ${speaking ? 'speaking' : ''}`} disabled={speaking} onClick={() => void readAloud(scene.text)}>
                <span aria-hidden="true">🔊</span>{speaking ? '읽는 중이에요' : '이 장면 읽어 주기'}
              </button>
              <button className="story-slow-listen" disabled={speaking} onClick={() => void readAloud(scene.text, true)}><span aria-hidden="true">🐢</span>느리게 읽기</button>
            </div>
          )}
        </article>
        <nav className="story-page-actions" aria-label="이야기 장면 이동">
          <button className="secondary-button" disabled={progress.pageIndex === 0} onClick={() => persist({ ...progress, pageIndex: progress.pageIndex - 1 })}>이전 장면</button>
          {reviewing ? (
            <button className="primary-button" onClick={returnFromReview}>활동으로 돌아가기</button>
          ) : progress.pageIndex < story.scenes.length - 1 ? (
            <button className="primary-button" onClick={() => persist({ ...progress, pageIndex: progress.pageIndex + 1 })}>다음 장면</button>
          ) : (
            <button className="primary-button" onClick={() => {
              const next = { ...progress, screen: 'activity' as const };
              persist(next); setScreen('activity'); setMessage('첫 번째 활동을 시작해요!');
            }}>활동 시작</button>
          )}
        </nav>
        <p className="story-reading-note">천천히 읽어도 괜찮아요. 앞 장면을 다시 볼 수도 있어요.</p>
      </main>
    );
  }

  if (screen === 'activity' && progress) {
    const story = storyById(progress.storyId);
    const activity = story?.activities[progress.activityIndex];
    const state = progress.activities[progress.activityIndex];
    if (!story || !activity || !state) return null;
    const activitySpeech = activity.type === 'choice'
      ? `${activity.prompt}. ${state.optionOrder.map((id) => activity.options.find((option) => option.id === id)?.label).join(', ')}`
      : `${activity.prompt}. 장면을 선택하고, 바꿀 장면을 선택하세요.`;
    return (
      <main className="story-screen story-activity-screen">
        <StoryTopBar title={story.title} onBack={returnToStoryHome} />
        <header className="story-activity-header">
          <div><small>활동 {progress.activityIndex + 1} / {story.activities.length}</small><strong>{activityLabel(activity)}</strong></div>
          <span>{storyLevelInfo[story.level].icon}</span>
        </header>
        <section className="story-question-card" aria-labelledby="story-question-title">
          <p className="eyebrow">이야기를 떠올려요</p>
          <h1 id="story-question-title">{activity.prompt}</h1>
          {ttsEnabled && speechSupported() && <div className="story-prompt-listen-actions"><button className="story-prompt-listen" disabled={speaking} onClick={() => void readAloud(activitySpeech)}>🔊 문제 읽어 주기</button><button className="story-prompt-listen story-prompt-slow" disabled={speaking} onClick={() => void readAloud(activitySpeech, true)}>🐢 느리게 읽기</button></div>}
        </section>

        {activity.type === 'choice' && state.status === 'active' && (
          <div className={`story-choice-grid choices-${state.optionOrder.length}`}>
            {state.optionOrder.map((optionId) => {
              const option = activity.options.find((item) => item.id === optionId)!;
              const tried = state.triedOptionIds.includes(optionId);
              return <button key={optionId} disabled={inputLocked || state.mustReview || tried} className={tried ? 'tried' : ''} onClick={() => markChoice(activity, optionId)}><span>{option.label}</span>{tried && <small>살펴본 답</small>}</button>;
            })}
          </div>
        )}

        {activity.type === 'choice' && state.status === 'evidence' && (
          <section className="story-evidence-panel" aria-label="근거 장면 선택">
            <h2>어느 장면이 가장 좋은 근거일까요?</h2>
            <div>
              {story.scenes.map((scene, index) => {
                const tried = state.triedEvidenceSceneIds.includes(scene.id);
                return <button key={scene.id} disabled={inputLocked || state.mustReview || tried} className={tried ? 'tried' : ''} onClick={() => markEvidence(activity, scene.id)}><b>{index + 1}</b><span>{scene.text}</span></button>;
              })}
            </div>
          </section>
        )}

        {activity.type === 'sequence' && state.status === 'active' && (
          <section className="story-sequence-panel">
            <p>장면 하나를 누른 뒤 바꿀 장면을 누르세요. 컴퓨터에서는 끌어서 바꿀 수도 있어요.</p>
            <div className="story-sequence-list" aria-label="이야기 장면 순서">
              {state.sequenceOrder.map((sceneId, index) => {
                const scene = story.scenes.find((item) => item.id === sceneId)!;
                const locked = state.lockedSceneIds.includes(sceneId);
                const selected = selectedSequenceId === sceneId;
                return (
                  <button key={sceneId} draggable={!locked && !state.mustReview}
                    className={`${locked ? 'locked' : ''} ${selected ? 'selected' : ''}`}
                    disabled={state.mustReview || locked}
                    aria-pressed={selected}
                    onClick={() => swapSequence(sceneId)}
                    onDragStart={(event) => event.dataTransfer.setData('text/story-scene', sceneId)}
                    onDragOver={(event) => { if (!locked) event.preventDefault(); }}
                    onDrop={(event) => { event.preventDefault(); swapSequence(sceneId, event.dataTransfer.getData('text/story-scene')); }}>
                    <b>{index + 1}</b><StoryScenePicture sceneId={scene.id} fallback={scene.illustration} alt="" /><em>{scene.text}</em>{locked && <small>자리 맞음 ✓</small>}
                  </button>
                );
              })}
            </div>
            <button className="primary-button story-check-button" disabled={inputLocked || state.mustReview || Boolean(selectedSequenceId)} onClick={() => checkSequence(activity)}>이 순서 확인하기</button>
          </section>
        )}

        {message && <aside className={`story-feedback ${state.status === 'complete' ? 'success' : ''}`} aria-live="polite"><span aria-hidden="true">{state.status === 'complete' ? '🌟' : '💭'}</span><strong>{message}</strong></aside>}
        {state.mustReview && <button className="story-review-button" onClick={() => startReview(activity)}>📖 이야기 다시 살펴보기</button>}
        {!state.mustReview && state.status !== 'complete' && !state.usedHint && <button className="story-hint-button" onClick={() => showHint(activity)}>힌트 보기</button>}
        {state.status === 'complete' && <button className="primary-button story-next-button" onClick={nextActivity}>{progress.activityIndex === story.activities.length - 1
          ? progress.missionVocabularyIds?.length ? '낱말 떠올리기' : '결과 보기'
          : '다음 활동'}</button>}
        <button className="story-back-to-reading" onClick={() => {
          const next = { ...progress, screen: 'reading' as const, pageIndex: 0 };
          persist(next); setScreen('reading');
        }}>이야기 처음부터 보기</button>
      </main>
    );
  }

  if (screen === 'recall' && progress?.missionVocabularyIds?.length) {
    const index = progress.missionRecallIndex ?? 0;
    const targetWordId = progress.missionVocabularyIds[index];
    const target = storyVocabularyById.get(targetWordId);
    if (!target) return null;
    const selectedWordId = progress.missionRecallSelectedWordId;
    const optionIds = index % 2 === 0
      ? [...progress.missionVocabularyIds].reverse()
      : progress.missionVocabularyIds;
    return (
      <main className="story-screen story-recall-screen">
        <StoryTopBar title="낱말 다시 떠올리기" onBack={returnToStoryHome} />
        <header className="story-recall-header">
          <GuideCharacter className="story-recall-guide" decorative />
          <div><p className="eyebrow">이야기 뒤 회상</p><h1>{index + 1} / {progress.missionVocabularyIds.length}</h1><p>문장을 다시 보지 않고 기억해 봐요.</p></div>
        </header>
        <section className="story-recall-question" aria-labelledby="story-recall-title">
          <small>{target.language === 'english' ? '뜻에 맞는 영어 낱말은?' : '이 설명과 맞는 낱말은?'}</small>
          <h2 id="story-recall-title">“{target.hint}”</h2>
        </section>
        <div className="story-recall-options" role="group" aria-label="회상 낱말 보기">
          {optionIds.map((wordId) => {
            const word = storyVocabularyById.get(wordId);
            const selected = selectedWordId === wordId;
            const correct = Boolean(selectedWordId) && wordId === targetWordId;
            return <button key={wordId} disabled={Boolean(selectedWordId)}
              className={`${selected ? 'selected' : ''} ${correct ? 'correct' : ''}`}
              onClick={() => answerMissionRecall(wordId)}>{word?.label}</button>;
          })}
        </div>
        {selectedWordId && (
          <>
            <aside className={`story-feedback ${selectedWordId === targetWordId ? 'success' : ''}`} aria-live="polite">
              <span aria-hidden="true">{selectedWordId === targetWordId ? '🌟' : '💭'}</span><strong>{message}<br />정답은 {target.label}예요.</strong>
            </aside>
            <button className="primary-button story-next-button" onClick={advanceMissionRecall}>
              {index === progress.missionVocabularyIds.length - 1 ? '결과 보기' : '다음 낱말'}
            </button>
          </>
        )}
      </main>
    );
  }

  if (screen === 'result' && result) {
    const story = storyById(result.storyId)!;
    return (
      <main className="story-screen story-result-screen">
        {growthAward && <GrowthCelebration award={growthAward} animationsEnabled={animationsEnabled} />}
        <div className={`story-result-cover ${animationsEnabled ? '' : 'still'}`} aria-hidden="true">{story.cover}</div>
        <p className="eyebrow">{result.daily ? '오늘의 이야기 완료!' : '이야기 탐험 성공!'}</p>
        <h1>{story.title}</h1>
        <div className="story-stars" aria-label={`별 ${result.stars}개`}>{[1, 2, 3].map((star) => <span key={star} className={star <= result.stars ? 'earned' : ''}>★</span>)}</div>
        <p className="story-result-message">{result.strengthMessage}</p>
        {growthAward && <GrowthRewardCard award={growthAward} />}
        <p className="story-practice-note">{result.practiceMessage}</p>
        {result.missionVocabularyIds?.length ? (
          <aside className="story-mission-result">
            <strong>이야기에서 다시 만난 낱말</strong>
            <span>{result.missionVocabularyIds.map((wordId) => storyVocabularyLabelById.get(wordId)).filter(Boolean).join(' · ')}</span>
            <small>도움 없이 다시 기억한 낱말 {result.missionRecallCorrect ?? 0} / {result.missionVocabularyIds.length}</small>
          </aside>
        ) : null}
        {result.earnedDailyBadge && <aside className="story-daily-badge"><span>🏅</span><strong>오늘의 이야기 배지</strong><small>새로운 이야기를 끝까지 탐험했어요!</small></aside>}
        {result.improved && <p className="story-best-note">새로운 최고 기록이에요!</p>}
        <section className="story-result-stats" aria-label="이야기 결과">
          <div><small>첫 시도 성공</small><strong>{result.firstTryCount} / 3</strong></div>
          <div><small>사용한 힌트</small><strong>{result.hintCount}개</strong></div>
          <div><small>다시 읽기</small><strong>{result.reviewCount}번</strong></div>
          <div><small>탐험 시간</small><strong>{formatTime(result.elapsedMs)}</strong></div>
        </section>
        <div className="story-result-actions">
          <button className="primary-button" onClick={() => void startStory(story, result.daily, result.missionVocabularyIds ?? [])}>다시 읽기</button>
          <button className="secondary-button" onClick={() => void startStory(pickStory(story.level, records.recentStoryIds, random))}>다른 이야기</button>
          <button className="secondary-button" onClick={() => setScreen('library')}>나의 이야기 도감</button>
          <button className="text-button" onClick={returnToStoryHome}>이야기 탐험대 홈</button>
          <button className="text-button" onClick={onExit}>학습 놀이터로</button>
        </div>
      </main>
    );
  }

  if (screen === 'library') {
    const completedCount = Object.keys(records.byStory).length;
    return (
      <main className="story-screen story-library-screen">
        <StoryTopBar title="나의 이야기 도감" onBack={() => setScreen('home')} />
        <header><span aria-hidden="true">📚</span><div><p className="eyebrow">차곡차곡 모았어요</p><h1>{completedCount} / {stories.length}편 완성</h1></div></header>
        <div className="story-level-tabs" role="tablist" aria-label="도감 단계">
          {STORY_LEVELS.map((level) => <button key={level} role="tab" aria-selected={selectedLevel === level} onClick={() => setSelectedLevel(level)}>{storyLevelInfo[level].icon} {storyLevelInfo[level].label}</button>)}
        </div>
        <section className="story-library-grid">
          {storiesByLevel(selectedLevel).map((story) => {
            const record = records.byStory[story.id];
            const cover = storyCoverVisuals[story.id];
            return <button key={story.id} className={record ? 'completed' : ''} onClick={() => void startStory(story)}>{cover ? <img src={cover.src} alt="" loading="lazy" decoding="async" /> : <span aria-hidden="true">{story.cover}</span>}<strong>{story.title}</strong><small>{record ? `★ ${record.bestStars} · ${record.completedCount}번 읽음` : '아직 만나지 않은 이야기'}</small></button>;
          })}
        </section>
      </main>
    );
  }

  const todayKey = storyDailyKey();
  const vocabularyMission = createStoryVocabularyMission(stories, learnedWordIds);
  const missionStory = vocabularyMission ? storyById(vocabularyMission.storyId) : undefined;
  const todayStory = missionStory ?? dailyStory(todayKey, selectedLevel);
  const todayCompleted = records.dailyBadges.includes(todayKey);
  return (
    <main className="story-screen story-home-screen">
      <StoryTopBar title="이야기 탐험대" onBack={onExit} />
      <section className="story-hero">
        <div><p className="eyebrow">읽고, 기억하고, 생각해요</p><h1>이야기 속으로<br />탐험을 떠나요!</h1><p>한 편에 약 3~5분이면 충분해요.</p></div>
        <GuideCharacter className="story-guide" decorative />
      </section>
      <aside className="story-howto" aria-label="이야기 탐험 방법">
        <span><b>1</b> 읽거나 듣기</span><i aria-hidden="true">›</i><span><b>2</b> 세 가지 활동</span><i aria-hidden="true">›</i><span><b>3</b> 별과 도감</span>
      </aside>
      {savedProgress && storyById(savedProgress.storyId) && (
        <button className="story-resume-card" onClick={resumeStory}>
          <span aria-hidden="true">▶</span><span><strong>읽던 이야기 이어서 보기</strong><small>{storyById(savedProgress.storyId)!.title} · {savedProgress.screen === 'reading'
            ? `${savedProgress.pageIndex + 1}번째 장면`
            : savedProgress.screen === 'recall' ? '낱말 다시 떠올리기' : `${savedProgress.activityIndex + 1}번째 활동`}</small></span><b aria-hidden="true">›</b>
        </button>
      )}
      <button className="story-daily-card" onClick={() => void startStory(todayStory, true, vocabularyMission?.vocabularyIds ?? [])}>
        <span aria-hidden="true">☀️</span><span><strong>{vocabularyMission ? '오늘의 낱말 미션' : '오늘의 이야기'} · {todayStory.title}</strong><small>{vocabularyMission
          ? `배운 낱말을 찾아요: ${vocabularyMission.vocabularyIds.map((wordId) => storyVocabularyLabelById.get(wordId)).filter(Boolean).join(' · ')}`
          : todayCompleted ? '오늘의 배지를 받았어요! 다시 읽어 볼까요?' : '완료하면 특별 배지를 받아요'}</small></span><b aria-hidden="true">›</b>
      </button>
      <section className="story-level-section">
        <div className="story-section-title"><div><p className="eyebrow">내게 맞게 골라요</p><h2>어느 단계로 읽을까요?</h2></div><button onClick={() => setScreen('library')}>도감 보기</button></div>
        <div className="story-level-grid" role="radiogroup" aria-label="이야기 단계">
          {STORY_LEVELS.map((level) => {
            const info = storyLevelInfo[level];
            return <button key={level} role="radio" aria-checked={selectedLevel === level} className={selectedLevel === level ? 'active' : ''} onClick={() => chooseLevel(level)}><i aria-hidden="true">{info.icon}</i><span><strong>{info.label}</strong><small>{info.age}</small><em>{info.description}</em></span>{selectedLevel === level && <b aria-hidden="true">✓</b>}</button>;
          })}
        </div>
      </section>
      <section className="story-picks" aria-labelledby="story-picks-title">
        <div className="story-section-title"><div><p className="eyebrow">{storyLevelInfo[selectedLevel].label} 이야기</p><h2 id="story-picks-title">읽고 싶은 이야기를 골라요</h2></div></div>
        <div>
          {storiesByLevel(selectedLevel).map((story) => {
            const completed = records.byStory[story.id];
            const cover = storyCoverVisuals[story.id];
            return <button key={story.id} onClick={() => void startStory(story)}>{cover ? <img src={cover.src} alt="" loading="lazy" decoding="async" /> : <span aria-hidden="true">{story.cover}</span>}<div><strong>{story.title}</strong><small>{story.summary}</small></div>{completed && <em aria-label={`최고 별 ${completed.bestStars}개`}>★ {completed.bestStars}</em>}</button>;
          })}
        </div>
      </section>
      {storageWarning && <p className="story-storage-warning" role="status">기록을 저장하지 못했지만 이야기는 계속 읽을 수 있어요.</p>}
    </main>
  );
}

function StoryScenePicture({ sceneId, fallback, alt, featured = false }: { sceneId: string; fallback: string; alt: string; featured?: boolean }) {
  const visual = storySceneVisuals[sceneId];
  if (!visual) return <span className={featured ? 'story-illustration story-illustration-fallback' : 'story-sequence-thumb story-sequence-fallback'} role={alt ? 'img' : undefined} aria-label={alt || undefined} aria-hidden={alt ? undefined : true}>{fallback}</span>;
  return <img className={featured ? 'story-illustration story-illustration-image' : 'story-sequence-thumb'} src={visual.src} alt={alt ? visual.alt : ''} loading={featured ? 'eager' : 'lazy'} decoding="async" />;
}

function StoryTopBar({ title, onBack }: { title: string; onBack: () => void }) {
  return <header className="story-top-bar"><button className="icon-button" onClick={onBack} aria-label="뒤로 가기">←</button><strong>{title}</strong><span /></header>;
}
