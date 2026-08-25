export function BalanceIcon({ className, decorative = false }: { className?: string; decorative?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 96 96" role={decorative ? undefined : 'img'} aria-label={decorative ? undefined : '균형 저울'} aria-hidden={decorative || undefined}>
      <path d="M48 14v62M27 82h42M36 76h24" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
      <path d="M18 28h60" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
      <path d="M24 30 12 56h24L24 30Zm48 0L60 56h24L72 30Z" fill="none" stroke="currentColor" strokeWidth="5" strokeLinejoin="round" />
      <path d="M10 57c1 8 6 12 14 12s13-4 14-12H10Zm48 0c1 8 6 12 14 12s13-4 14-12H58Z" fill="currentColor" opacity=".24" />
      <circle cx="48" cy="28" r="7" fill="white" stroke="currentColor" strokeWidth="5" />
    </svg>
  );
}
