import { useEffect, useRef, useState } from 'react';
import type { LanguageMasteryEntry, SessionSummary, SkillMastery } from '../domain/types';
import { buildChildGrowthSummary, buildParentGrowthSummary } from '../domain/growthSummary';
import { GuideCharacter } from '../visuals/GuideCharacter';
import { useGrowth } from '../growth/GrowthContext';
import { GrowthMedal } from '../growth/GrowthUI';
import {
  GROWTH_SECTION_ICONS,
  GROWTH_SECTION_LABELS,
  MEDAL_INFO,
  activeDaysInWeek,
  currentDayRecord,
  growthSummaryForState,
  localDateKey,
  weekKeyForDate
} from '../growth/growthModel';
import { GROWTH_SECTION_IDS, type MedalTier } from '../growth/types';

interface GrowthDashboardProps {
  wordMastery: readonly LanguageMasteryEntry[];
  skillMastery: readonly SkillMastery[];
  history: readonly SessionSummary[];
  onBack: () => void;
}

const EMPTY_LABEL = '아직 만날 친구가 기다리고 있어요.';

export function GrowthDashboard({ wordMastery, skillMastery, history, onBack }: GrowthDashboardProps) {
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
          <button className="back-button" onClick={() => setParentUnlocked(false)} aria-label="아이 성장 숲으로 돌아가기">‹</button>
          <strong>보호자 요약</strong>
          <button className="growth-home-button" onClick={onBack}>홈</button>
        </header>
        <section className="parent-growth-heading">
          <p className="eyebrow">최근 학습 흐름</p>
          <h1>다음 도움을 한눈에 살펴보세요</h1>
          <p>완료한 한국어·영어 학습과 낱말 기록을 기준으로 정리했어요.</p>
        </section>
        <section className="parent-metrics" aria-label="최근 7회 학습 요약">
          <div><strong>{parent.recentAccuracy === null ? '—' : `${parent.recentAccuracy}%`}</strong><span>최근 7회 정확도</span></div>
          <div><strong>{parent.hintRate === null ? '—' : `${parent.hintRate}%`}</strong><span>힌트 사용</span></div>
          <div><strong>{parent.completedSessions}회</strong><span>완료한 언어 학습</span></div>
        </section>
        <div className="parent-growth-groups">
          <GrowthGroup title="익힌 것" icon="✓" items={parent.learned} empty="독립 정답 기록이 더 쌓이면 표시돼요." />
          <GrowthGroup title="연습 중" icon="↻" items={parent.practicing} empty="현재 특별히 어려워하는 기술이 보이지 않아요." />
          <GrowthGroup title="다음 추천" icon="→" items={parent.next} empty="새 학습을 한 번 마치면 맞춤 추천이 시작돼요." />
        </div>
        <section className="parent-example-card" aria-labelledby="growth-example-title">
          <p className="eyebrow">실제 학습 예시</p>
          <h2 id="growth-example-title">{parent.example}</h2>
          <p>{parent.explanation}</p>
        </section>
        <p className="parent-growth-note">이 요약은 기기 안의 학습 흐름을 돕기 위한 정보이며, 학년 진단이나 의학적·발달적 판단이 아닙니다.</p>
      </main>
    );
  }

  if (parentGateOpen) {
    return (
      <main className="screen growth-screen parent-gate-screen">
        <header className="growth-topbar">
          <button className="back-button" onClick={() => { cancelHold(); setParentGateOpen(false); }} aria-label="성장 숲으로 돌아가기">‹</button>
          <strong>보호자 확인</strong>
          <span aria-hidden="true" />
        </header>
        <section className="parent-gate-card">
          <span className="parent-gate-icon" aria-hidden="true">🔒</span>
          <p className="eyebrow">어른과 함께 열어요</p>
          <h1>아래 버튼을 1.5초 동안<br />길게 눌러 주세요</h1>
          <p>학습 정확도와 힌트 사용 기록이 보호자용으로 표시됩니다.</p>
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
            <span>{holding ? '계속 누르고 있어요…' : '보호자가 길게 누르기'}</span>
          </button>
          <p id="parent-hold-status" className="hold-status" aria-live="polite">
            {holding ? '확인 중입니다. 버튼을 놓지 마세요.' : '마우스, 손가락 또는 키보드로 길게 누를 수 있어요.'}
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="screen growth-screen child-growth-screen">
      <header className="growth-topbar">
        <button className="back-button" onClick={onBack} aria-label="홈으로 돌아가기">‹</button>
        <strong>나의 성장 숲</strong>
        <button className="parent-info-button" onClick={() => setParentGateOpen(true)}>보호자</button>
      </header>
      <section className="child-growth-hero">
        <div>
          <p className="eyebrow">조금씩 자라는 중</p>
          <h1>오늘도 숲이<br />한 뼘 자랐어요!</h1>
        </div>
        <GuideCharacter className="growth-guide" decorative />
      </section>
      <section className={`growth-level-card tier-${growthSummary.medal}`} aria-labelledby="growth-level-title">
        <GrowthMedal xp={growth.state.totalXp} />
        <div className="growth-level-copy">
          <p className="eyebrow">{MEDAL_INFO[growthSummary.medal].label}</p>
          <h2 id="growth-level-title">레벨 {growthSummary.level}{growthSummary.sparkleRank ? ` · 반짝임 ${growthSummary.sparkleRank}` : ''}</h2>
          <p>{growthSummary.level >= 30 ? `다음 반짝임까지 ${growthSummary.progress.remaining}점` : `다음 레벨까지 ${growthSummary.progress.remaining}점`}</p>
          <div className="growth-level-progress" role="progressbar" aria-valuenow={Math.round(growthSummary.progress.percent)} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${growthSummary.progress.percent}%` }} /></div>
          <small>{growthSummary.level >= 30 ? '무지개숲을 계속 반짝이게 해요' : `다음 메달: ${MEDAL_INFO[nextMedal].label} · ${MEDAL_INFO[nextMedal].benefit}`}</small>
        </div>
      </section>
      <section className="growth-rhythm-card" aria-labelledby="growth-rhythm-title">
        <div className="growth-section-title"><p className="eyebrow">매일 조금씩</p><h2 id="growth-rhythm-title">오늘의 성장</h2></div>
        <div className="growth-today-summary"><strong>{Math.min(today?.completedSections.length ?? 0, 3)} / 3</strong><span>성장 점수를 받은 놀이</span></div>
        <div className="growth-section-stamps" aria-label="오늘 완료한 9개 섹션">
          {GROWTH_SECTION_IDS.map((sectionId) => {
            const done = today?.completedSections.includes(sectionId) ?? false;
            return <span key={sectionId} className={done ? 'is-done' : ''}><i aria-hidden="true">{GROWTH_SECTION_ICONS[sectionId]}</i><small>{GROWTH_SECTION_LABELS[sectionId]}</small></span>;
          })}
        </div>
        <div className="growth-week-heading"><strong>이번 주 {activeDaysInWeek(growth.state)} / 5일</strong><small>5일을 채우면 성장 점수 20점</small></div>
        <div className="growth-week-grid" aria-label="이번 주 활동일">
          {weekDays.map((day, index) => <span key={day.dateKey} className={day.active ? 'is-active' : ''}><small>{['월', '화', '수', '목', '금', '토', '일'][index]}</small><i aria-hidden="true">{day.active ? '🌱' : '·'}</i></span>)}
        </div>
      </section>
      <section className="growth-friend-grid" aria-label="나의 낱말 모험">
        <article><span aria-hidden="true">🌱</span><div><h2>오늘 만난 친구</h2><p>{child.metWords.length ? child.metWords.join(' · ') : EMPTY_LABEL}</p></div></article>
        <article><span aria-hidden="true">✨</span><div><h2>다시 찾은 친구</h2><p>{child.rememberedWords.length ? child.rememberedWords.join(' · ') : '다시 만나면 이곳에 반짝여요.'}</p></div></article>
        <article><span aria-hidden="true">📖</span><div><h2>다음 이야기</h2><p><strong>{child.nextAdventure}</strong> · {child.nextAdventureDetail}</p></div></article>
      </section>
      <section className="growth-trail" aria-labelledby="growth-trail-title">
        <div className="growth-section-title"><p className="eyebrow">나의 탐험길</p><h2 id="growth-trail-title">세 곳을 함께 키워요</h2></div>
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
        <div className="growth-section-title"><p className="eyebrow">내가 해낸 방법</p><h2 id="growth-badge-title">용기 배지</h2></div>
        <div>{child.badges.length ? child.badges.map((badge) => <span key={badge}>🏅 {badge}</span>) : <p>힌트를 쓰고 다시 도전하면 새 배지가 생겨요.</p>}</div>
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
