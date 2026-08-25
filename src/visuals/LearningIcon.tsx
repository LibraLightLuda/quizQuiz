export type LearningIconName = 'math' | 'korean' | 'english' | 'memory' | 'story' | 'sudoku';

const iconSources: Readonly<Record<LearningIconName, string>> = {
  math: 'learning-math.webp',
  korean: 'learning-korean.webp',
  english: 'learning-english.webp',
  memory: 'learning-memory.webp',
  story: 'learning-story.webp',
  sudoku: 'learning-sudoku.webp'
};

export function LearningIcon({ name, className }: { name: LearningIconName; className?: string }) {
  return (
    <img
      className={className}
      src={`${import.meta.env.BASE_URL}illustrations/ui/${iconSources[name]}`}
      alt=""
      aria-hidden="true"
      width="512"
      height="512"
      decoding="async"
      draggable={false}
    />
  );
}
