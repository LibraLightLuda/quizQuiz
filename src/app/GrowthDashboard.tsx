import { useEffect, useRef, useState } from 'react';
import type { LanguageMasteryEntry, SessionSummary, SkillMastery } from '../domain/types';
import { buildChildGrowthSummary, buildParentGrowthSummary } from '../domain/growthSummary';
import { GuideCharacter } from '../visuals/GuideCharacter';
import { useGrowth } from '../growth/GrowthContext';
import { GrowthMedal } from '../growth/GrowthUI';
import {
  GROWTH_SECTION_ICONS,
  MEDAL_INFO,
  activeDaysInWeek,
  currentDayRecord,
  growthSummaryForState,
  localDateKey,
  weekKeyForDate
} from '../growth/growthModel';
import { GROWTH_SECTION_IDS, type MedalTier } from '../growth/types';
import { useLocale } from '../i18n/LocaleContext';
import { growthSectionLabel, medalLabel } from '../i18n/catalog';

interface GrowthDashboardProps {
  wordMastery: readonly LanguageMasteryEntry[];
  skillMastery: readonly SkillMastery[];
  history: readonly SessionSummary[];
  onBack: () => void;
}

const EMPTY_LABEL = '아직 만날 친구가 기다리고 있어요.';

export function GrowthDashboard({ wordMastery, skillMastery, history, onBack }: GrowthDashboardProps) {
  const { locale, t } = useLocale();
  const growth = useGrowth();
  const growthSummary = growthSummaryForState(growth.state);
  const [parentGateOpen, setParentGateOpen] = useState(false);
  const [parentUnlocked, setParentUnlocked] = useState(false);
  const [holding, setHolding] = useState(false);
  const holdTimer = useRef<number | null>(null);
  const child = buildChildGrowthSummary(wordMastery, skillMastery);
  const parent = buildParentGrowthSummary(wordMastery, skillMastery, history);
  const today = currentDayRecord(growth.state);
  const weekStart = new Date(`${weekKeyForDate(new Date())}T00:00:00`);
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + index);
    const dateKey = localDateKey(date);
    return { dateKey, active: growth.state.days.some((day) => day.dateKey === dateKey && day.completedSections.length > 0) };
  });
  const medalOrder: MedalTier[] = ['seed', 'sprout', 'leaf', 'bud', 'gold-flower', 'starlight-forest', 'rainbow-forest'];
  const nextMedal = medalOrder[Math.min(medalOrder.length - 1, medalOrder.indexOf(growthSummary.medal) + 1)];

  const cancelHold = () => {
    if (holdTimer.current !== null) window.clearTimeout(holdTimer.current);
    holdTimer.current = null;
    setHolding(false);
  };

  const beginHold = () => {
    if (holdTimer.current !== null || parentUnlocked) return;
    setHolding(true);
    holdTimer.current = window.setTimeout(() => {
      holdTimer.current = null;
      setHolding(false);
      setParentUnlocked(true);
    }, 1500);
  };

  useEffect(() => cancelHold, []);

  if (parentUnlocked) {
    return (
      <main className="screen growth-screen parent-growth-screen">
        <header className="growth-topbar">
          <button className="back-button" onClick={() => setParentUnlocked(false)} aria-label={t('아이 성장 숲으로 돌아가기', "Return to the child's Growth Forest")}>‹</button>
          <strong>{t('보호자 요약', 'Parent summary')}</strong>
          <button className="growth-home-button" onClick={onBack}>{t('홈', 'Home')}</button>
        </header>
        <section className="parent-growth-heading">
          <p className="eyebrow">{t('최근 학습 흐름', 'Recent learning')}</p>
          <h1>{t('다음 도움을 한눈에 살펴보세요', 'See the next support at a glance')}</h1>
          <p>{t('완료한 한국어·영어 학습과 낱말 기록을 기준으로 정리했어요.', 'Based on completed Korean and English lessons and word records.')}</p>
        </section>
        <section className="parent-metrics" aria-label="최근 7회 학습 요약">
          <div><strong>{parent.recentAccuracy === null ? '—' : `${parent.recentAccuracy}%`}</strong><span>{t('최근 7회 정확도', 'Accuracy, last 7')}</span></div>
          <div><strong>{parent.hintRate === null ? '—' : `${parent.hintRate}%`}</strong><span>{t('힌트 사용', 'Hint use')}</span></div>
          <div><strong>{t(`${parent.completedSessions}회`, `${parent.completedSessions}`)}</strong><span>{t('완료한 언어 학습', 'Language lessons completed')}</span></div>
        </section>
        <div className="parent-growth-groups">
          <GrowthGroup title={t('익힌 것', 'Learned')} icon="✓" items={parent.learned} empty={t('독립 정답 기록이 더 쌓이면 표시돼요.', 'This appears after more independent answers.')} />
          <GrowthGroup title={t('연습 중', 'Practicing')} icon="↻" items={parent.practicing} empty={t('현재 특별히 어려워하는 기술이 보이지 않아요.', 'No skills currently need special attention.')} />
          <GrowthGroup title={t('다음 추천', 'Next suggestion')} icon="→" items={parent.next} empty={t('새 학습을 한 번 마치면 맞춤 추천이 시작돼요.', 'Complete a lesson to begin personalized suggestions.')} />
        </div>
        <section className="parent-example-card" aria-labelledby="growth-example-title">
          <p className="eyebrow">{t('실제 학습 예시', 'Learning example')}</p>
          <h2 id="growth-example-title">{parent.example}</h2>
          <p>{parent.explanation}</p>
        </section>
        <p className="parent-growth-note">{t('이 요약은 기기 안의 학습 흐름을 돕기 위한 정보이며, 학년 진단이나 의학적·발달적 판단이 아닙니다.', 'This on-device summary supports learning and is not a grade, medical, or developmental assessment.')}</p>
      </main>
    );
  }

  if (parentGateOpen) {
    return (
      <main className="screen growth-screen parent-gate-screen">
        <header className="growth-topbar">
          <button className="back-button" onClick={() => { cancelHold(); setParentGateOpen(false); }} aria-label={t('성장 숲으로 돌아가기', 'Return to Growth Forest')}>‹</button>
          <strong>{t('보호자 확인', 'Parent check')}</strong>
          <span aria-hidden="true" />
        </header>
        <section className="parent-gate-card">
          <span className="parent-gate-icon" aria-hidden="true">🔒</span>
          <p className="eyebrow">{t('어른과 함께 열어요', 'Open with an adult')}</p>
          <h1>{t('아래 버튼을 1.5초 동안', 'Press and hold the button')}<br />{t('길게 눌러 주세요', 'below for 1.5 seconds')}</h1>
          <p>{t('학습 정확도와 힌트 사용 기록이 보호자용으로 표시됩니다.', 'Learning accuracy and hint records will be shown for a parent.')}</p>
          <button
            className={`parent-hold-button ${holding ? 'is-holding' : ''}`}
            onPointerDown={beginHold}
            onPointerUp={cancelHold}
            onPointerCancel={cancelHold}
            onPointerLeave={cancelHold}
            onKeyDown={(event) => {
              if ((event.key === 'Enter' || event.key === ' ') && !event.repeat) beginHold();
            }}
            onKeyUp={(event) => {
              if (event.key === 'Enter' || event.key === ' ') cancelHold();
            }}
            aria-describedby="parent-hold-status"
          >
            <span>{holding ? t('계속 누르고 있어요…', 'Keep holding…') : t('보호자가 길게 누르기', 'Parent: press and hold')}</span>
          </button>
          <p id="parent-hold-status" className="hold-status" aria-live="polite">
            {holding ? t('확인 중입니다. 버튼을 놓지 마세요.', 'Checking. Keep holding the button.') : t('마우스, 손가락 또는 키보드로 길게 누를 수 있어요.', 'Hold with a mouse, finger, or keyboard.')}
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="screen growth-screen child-growth-screen">
      <header className="growth-topbar">
        <button className="back-button" onClick={onBack} aria-label={t('홈으로 돌아가기', 'Return home')}>‹</button>
        <strong>{t('나의 성장 숲', 'My Growth Forest')}</strong>
        <button className="parent-info-button" onClick={() => setParentGateOpen(true)}>{t('보호자', 'Parent')}</button>
      </header>
      <section className="child-growth-hero">
        <div>
          <p className="eyebrow">{t('조금씩 자라는 중', 'Growing little by little')}</p>
          <h1>{t('오늘도 숲이', 'The forest grew')}<br />{t('한 뼘 자랐어요!', 'another step today!')}</h1>
        </div>
        <GuideCharacter className="growth-guide" decorative />
      </section>
      <section className={`growth-level-card tier-${growthSummary.medal}`} aria-labelledby="growth-level-title">
        <GrowthMedal xp={growth.state.totalXp} />
        <div className="growth-level-copy">
          <p className="eyebrow">{medalLabel(growthSummary.medal, locale)}</p>
          <h2 id="growth-level-title">{t(`레벨 ${growthSummary.level}${growthSummary.sparkleRank ? ` · 반짝임 ${growthSummary.sparkleRank}` : ''}`, `Level ${growthSummary.level}${growthSummary.sparkleRank ? ` · Sparkle ${growthSummary.sparkleRank}` : ''}`)}</h2>
          <p>{growthSummary.level >= 30 ? t(`다음 반짝임까지 ${growthSummary.progress.remaining}점`, `${growthSummary.progress.remaining} points to the next sparkle`) : t(`다음 레벨까지 ${growthSummary.progress.remaining}점`, `${growthSummary.progress.remaining} points to the next level`)}</p>
          <div className="growth-level-progress" role="progressbar" aria-valuenow={Math.round(growthSummary.progress.percent)} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${growthSummary.progress.percent}%` }} /></div>
          <small>{growthSummary.level >= 30 ? t('무지개숲을 계속 반짝이게 해요', 'Keep the Rainbow Forest sparkling') : t(`다음 메달: ${MEDAL_INFO[nextMedal].label} · ${MEDAL_INFO[nextMedal].benefit}`, `Next medal: ${medalLabel(nextMedal, locale)} · more forest decorations and light effects`)}</small>
        </div>
      </section>
      <section className="growth-rhythm-card" aria-labelledby="growth-rhythm-title">
        <div className="growth-section-title"><p className="eyebrow">{t('매일 조금씩', 'A little every day')}</p><h2 id="growth-rhythm-title">{t('오늘의 성장', "Today's growth")}</h2></div>
        <div className="growth-today-summary"><strong>{Math.min(today?.completedSections.length ?? 0, 3)} / 3</strong><span>{t('성장 점수를 받은 놀이', 'Activities that earned growth points')}</span></div>
        <div className="growth-section-stamps" aria-label={t('오늘 완료한 9개 섹션', 'Nine activities completed today')}>
          {GROWTH_SECTION_IDS.map((sectionId) => {
            const done = today?.completedSections.includes(sectionId) ?? false;
            return <span key={sectionId} className={done ? 'is-done' : ''}><i aria-hidden="true">{GROWTH_SECTION_ICONS[sectionId]}</i><small>{growthSectionLabel(sectionId, locale)}</small></span>;
          })}
        </div>
        <div className="growth-week-heading"><strong>{t(`이번 주 ${activeDaysInWeek(growth.state)} / 5일`, `This week ${activeDaysInWeek(growth.state)} / 5 days`)}</strong><small>{t('5일을 채우면 성장 점수 20점', 'Complete 5 days for 20 growth points')}</small></div>
        <div className="growth-week-grid" aria-label={t('이번 주 활동일', 'Active days this week')}>
          {weekDays.map((day, index) => <span key={day.dateKey} className={day.active ? 'is-active' : ''}><small>{(locale === 'ko' ? ['월', '화', '수', '목', '금', '토', '일'] : ['M', 'T', 'W', 'T', 'F', 'S', 'S'])[index]}</small><i aria-hidden="true">{day.active ? '🌱' : '·'}</i></span>)}
        </div>
      </section>
      <section className="growth-friend-grid" aria-label={t('나의 낱말 모험', 'My word adventure')}>
        <article><span aria-hidden="true">🌱</span><div><h2>{t('오늘 만난 친구', 'Words met today')}</h2><p>{child.metWords.length ? child.metWords.join(' · ') : t(EMPTY_LABEL, 'New friends are waiting to meet you.')}</p></div></article>
        <article><span aria-hidden="true">✨</span><div><h2>{t('다시 찾은 친구', 'Remembered words')}</h2><p>{child.rememberedWords.length ? child.rememberedWords.join(' · ') : t('다시 만나면 이곳에 반짝여요.', 'Words sparkle here when you meet them again.')}</p></div></article>
        <article><span aria-hidden="true">📖</span><div><h2>{t('다음 이야기', 'Next adventure')}</h2><p><strong>{child.nextAdventure}</strong> · {child.nextAdventureDetail}</p></div></article>
      </section>
      <section className="growth-trail" aria-labelledby="growth-trail-title">
        <div className="growth-section-title"><p className="eyebrow">{t('나의 탐험길', 'My learning trail')}</p><h2 id="growth-trail-title">{t('세 곳을 함께 키워요', 'Grow all three areas together')}</h2></div>
        <div className="growth-trail-list">
          {child.trail.map((item, index) => (
            <article key={item.id} className={`growth-trail-item ${item.id}`}>
              <span className="trail-marker" aria-hidden="true">{index === 0 ? '🌰' : index === 1 ? '🌳' : '⭐'}</span>
              <div><h3>{item.title}</h3><p>{item.description}</p><strong>{item.stateLabel}</strong></div>
              <div className="trail-progress" role="progressbar" aria-label={`${item.title} 성장`} aria-valuenow={item.progress} aria-valuemin={0} aria-valuemax={100}>
                <span style={{ width: `${item.progress}%` }} />
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="growth-badges" aria-labelledby="growth-badge-title">
        <div className="growth-section-title"><p className="eyebrow">{t('내가 해낸 방법', 'How I learned')}</p><h2 id="growth-badge-title">{t('용기 배지', 'Courage badges')}</h2></div>
        <div>{child.badges.length ? child.badges.map((badge) => <span key={badge}>🏅 {badge}</span>) : <p>{t('힌트를 쓰고 다시 도전하면 새 배지가 생겨요.', 'Use a hint and try again to earn a new badge.')}</p>}</div>
      </section>
    </main>
  );
}

function GrowthGroup({ title, icon, items, empty }: {
  title: string;
  icon: string;
  items: readonly { label: string; detail: string }[];
  empty: string;
}) {
  return (
    <section className="parent-growth-group" aria-labelledby={`parent-group-${title}`}>
      <h2 id={`parent-group-${title}`}><span aria-hidden="true">{icon}</span>{title}</h2>
      {items.length ? <ul>{items.map((item) => <li key={`${item.label}:${item.detail}`}><strong>{item.label}</strong><p>{item.detail}</p></li>)}</ul> : <p className="parent-group-empty">{empty}</p>}
    </section>
  );
}
