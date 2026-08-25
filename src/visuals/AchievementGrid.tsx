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
  return (
    <section className={className} aria-label={label}>
      {items.map((item) => (
        <article key={item.id} className={item.unlocked ? 'is-unlocked' : 'is-locked'}>
          <i aria-hidden="true">{item.unlocked ? item.icon : '🔒'}</i>
          <strong>{item.title}</strong>
          <p>{item.description}</p>
          <small>{item.unlocked ? '배지 획득!' : `${item.progress} / ${item.target}`}</small>
        </article>
      ))}
    </section>
  );
}
