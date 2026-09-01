import { useLocale } from '../i18n/LocaleContext';

export interface AchievementGridItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress: number;
  target: number;
}

export function AchievementGrid({
  items,
  className,
  label
}: {
  items: readonly AchievementGridItem[];
  className: string;
  label: string;
}) {
  const { t } = useLocale();
  return (
    <section className={className} aria-label={label}>
      {items.map((item) => (
        <article key={item.id} className={item.unlocked ? 'is-unlocked' : 'is-locked'}>
          <i aria-hidden="true">{item.unlocked ? item.icon : '🔒'}</i>
          <strong>{item.title}</strong>
          <p>{item.description}</p>
          <small>{item.unlocked ? t('배지 획득!', 'Badge earned!') : `${item.progress} / ${item.target}`}</small>
        </article>
      ))}
    </section>
  );
}
