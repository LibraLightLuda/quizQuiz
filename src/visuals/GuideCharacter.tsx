export function GuideCharacter({ className, decorative = false }: { className?: string; decorative?: boolean }) {
  return (
    <img
      className={className}
      src={`${import.meta.env.BASE_URL}illustrations/characters/mori-guide.webp`}
      alt={decorative ? '' : '별 나침반을 들고 손을 흔드는 수달 탐험대 모리'}
      aria-hidden={decorative || undefined}
      width="784"
      height="896"
      decoding="async"
      fetchPriority="high"
    />
  );
}
