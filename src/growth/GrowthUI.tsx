import { useEffect, useState } from 'react';
import {
  DAILY_SECTION_LIMIT,
  GROWTH_SECTION_LABELS,
  MEDAL_INFO,
  levelForXp,
  levelProgress,
  medalForLevel,
  sparkleRankForXp
} from './growthModel';
import type { GrowthAward, MedalTier } from './types';

const tierMinimums: Record<MedalTier, number> = {
  seed: 1, sprout: 5, leaf: 10, bud: 15, 'gold-flower': 20, 'starlight-forest': 25, 'rainbow-forest': 30
};

export function GrowthMedal({ xp, compact = false }: { xp: number; compact?: boolean }) {
  const level = levelForXp(xp);
  const tier = medalForLevel(level);
  const sparkleRank = sparkleRankForXp(xp);
  const ornamentCount = level >= 30 ? Math.min(8, sparkleRank) : Math.max(0, level - tierMinimums[tier]);
  return (
    <span className={`growth-medal tier-${tier} ${compact ? 'is-compact' : ''}`} aria-label={`${MEDAL_INFO[tier].label}, 레벨 ${level}${sparkleRank ? `, 반짝임 ${sparkleRank}등급` : ''}`}>
      <span className="growth-medal-rays" aria-hidden="true">
        {Array.from({ length: ornamentCount }, (_, index) => <i key={index} style={{ '--spark-index': index } as React.CSSProperties}>✦</i>)}
      </span>
      <span className="growth-medal-core" aria-hidden="true">{MEDAL_INFO[tier].icon}</span>
      <span className="growth-medal-ribbon" aria-hidden="true" />
      {sparkleRank > 0 && <b className="growth-sparkle-rank">✨{sparkleRank}</b>}
    </span>
  );
}

export function GrowthRewardCard({ award }: { award: GrowthAward }) {
  const progress = levelProgress(award.totalXp);
  const label = award.reason === 'already-completed'
    ? '오늘 이 놀이는 이미 성장했어요.'
    : award.reason === 'daily-cap'
      ? '오늘의 30점을 모두 모았어요.'
      : `${GROWTH_SECTION_LABELS[award.sectionId]} 완료로 성장했어요!`;
  return (
    <section className={`growth-reward-card ${award.totalAwardedXp ? 'has-reward' : 'no-reward'}`} aria-label="이번 성장 점수">
      <GrowthMedal xp={award.totalXp} compact />
      <div className="growth-reward-copy">
        <small>{label}</small>
        <strong>{award.totalAwardedXp > 0 ? `+${award.totalAwardedXp} 성장 점수` : '성장 점수는 내일 다시!'}</strong>
        {award.weeklyBonusXp > 0 && <em>주 5일 달성 보너스 +{award.weeklyBonusXp}</em>}
        <span>오늘 {Math.min(award.dayAwardedCount, DAILY_SECTION_LIMIT)} / 3 · 이번 주 {award.weeklyActiveDays} / 5일</span>
        <span className="growth-reward-progress" aria-label={`다음 성장까지 ${progress.remaining}점`}><i style={{ width: `${progress.percent}%` }} /></span>
      </div>
    </section>
  );
}

export function GrowthCelebration({ award, animationsEnabled }: {
  award: GrowthAward;
  animationsEnabled: boolean;
}) {
  const [visible, setVisible] = useState(true);
  const levelUp = award.newLevel > award.previousLevel;
  const sparkleUp = award.newSparkleRank > award.previousSparkleRank;
  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), 2500);
    return () => window.clearTimeout(timer);
  }, []);
  if (!visible || (!levelUp && !sparkleUp)) return null;
  const tierUp = award.newMedal !== award.previousMedal;
  return (
    <div className={`growth-celebration ${animationsEnabled ? '' : 'reduce-growth-motion'} ${tierUp ? 'is-tier-up' : ''}`} role="dialog" aria-modal="true" aria-labelledby="growth-celebration-title">
      <div>
        <GrowthMedal xp={award.totalXp} />
        <p className="eyebrow">{sparkleUp ? '무지개숲이 더 빛나요!' : tierUp ? '새 메달을 만났어요!' : '한 걸음 더 자랐어요!'}</p>
        <h2 id="growth-celebration-title">{sparkleUp ? `반짝임 ${award.newSparkleRank}등급` : `레벨 ${award.newLevel}`}</h2>
        <strong>{MEDAL_INFO[award.newMedal].label}</strong>
        <button autoFocus onClick={() => setVisible(false)}>계속하기</button>
      </div>
    </div>
  );
}
