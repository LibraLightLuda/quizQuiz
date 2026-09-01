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
import { useLocale } from '../i18n/LocaleContext';
import { growthSectionLabel, medalLabel } from '../i18n/catalog';

const tierMinimums: Record<MedalTier, number> = {
  seed: 1, sprout: 5, leaf: 10, bud: 15, 'gold-flower': 20, 'starlight-forest': 25, 'rainbow-forest': 30
};

export function GrowthMedal({ xp, compact = false }: { xp: number; compact?: boolean }) {
  const { locale, t } = useLocale();
  const level = levelForXp(xp);
  const tier = medalForLevel(level);
  const sparkleRank = sparkleRankForXp(xp);
  const ornamentCount = level >= 30 ? Math.min(8, sparkleRank) : Math.max(0, level - tierMinimums[tier]);
  return (
    <span className={`growth-medal tier-${tier} ${compact ? 'is-compact' : ''}`} aria-label={t(`${MEDAL_INFO[tier].label}, 레벨 ${level}${sparkleRank ? `, 반짝임 ${sparkleRank}등급` : ''}`, `${medalLabel(tier, locale)}, level ${level}${sparkleRank ? `, sparkle rank ${sparkleRank}` : ''}`)}>
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
  const { locale, t } = useLocale();
  const progress = levelProgress(award.totalXp);
  const label = award.reason === 'already-completed'
    ? t('오늘 이 놀이는 이미 성장했어요.', 'This activity already grew today.')
    : award.reason === 'daily-cap'
      ? t('오늘의 30점을 모두 모았어요.', "You collected all 30 of today's points.")
      : t(`${GROWTH_SECTION_LABELS[award.sectionId]} 완료로 성장했어요!`, `You grew by completing ${growthSectionLabel(award.sectionId, locale)}!`);
  return (
    <section className={`growth-reward-card ${award.totalAwardedXp ? 'has-reward' : 'no-reward'}`} aria-label={t('이번 성장 점수', 'Growth points earned')}>
      <GrowthMedal xp={award.totalXp} compact />
      <div className="growth-reward-copy">
        <small>{label}</small>
        <strong>{award.totalAwardedXp > 0 ? t(`+${award.totalAwardedXp} 성장 점수`, `+${award.totalAwardedXp} growth points`) : t('성장 점수는 내일 다시!', 'More growth points tomorrow!')}</strong>
        {award.weeklyBonusXp > 0 && <em>{t(`주 5일 달성 보너스 +${award.weeklyBonusXp}`, `5-day weekly bonus +${award.weeklyBonusXp}`)}</em>}
        <span>{t(`오늘 ${Math.min(award.dayAwardedCount, DAILY_SECTION_LIMIT)} / 3 · 이번 주 ${award.weeklyActiveDays} / 5일`, `Today ${Math.min(award.dayAwardedCount, DAILY_SECTION_LIMIT)} / 3 · This week ${award.weeklyActiveDays} / 5 days`)}</span>
        <span className="growth-reward-progress" aria-label={t(`다음 성장까지 ${progress.remaining}점`, `${progress.remaining} points to the next growth`)}><i style={{ width: `${progress.percent}%` }} /></span>
      </div>
    </section>
  );
}

export function GrowthCelebration({ award, animationsEnabled }: {
  award: GrowthAward;
  animationsEnabled: boolean;
}) {
  const { locale, t } = useLocale();
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
        <p className="eyebrow">{sparkleUp ? t('무지개숲이 더 빛나요!', 'The Rainbow Forest shines brighter!') : tierUp ? t('새 메달을 만났어요!', 'You earned a new medal!') : t('한 걸음 더 자랐어요!', 'You grew another step!')}</p>
        <h2 id="growth-celebration-title">{sparkleUp ? t(`반짝임 ${award.newSparkleRank}등급`, `Sparkle rank ${award.newSparkleRank}`) : t(`레벨 ${award.newLevel}`, `Level ${award.newLevel}`)}</h2>
        <strong>{medalLabel(award.newMedal, locale)}</strong>
        <button autoFocus onClick={() => setVisible(false)}>{t('계속하기', 'Continue')}</button>
      </div>
    </div>
  );
}
