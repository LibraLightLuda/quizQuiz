export function NumberPathIcon({ className = '', decorative = false }: { className?: string; decorative?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 96 96" role={decorative ? undefined : 'img'} aria-hidden={decorative || undefined} aria-label={decorative ? undefined : '숫자 길 찾기'}>
      <rect x="12" y="12" width="72" height="72" rx="18" fill="currentColor" opacity=".12" />
      <path d="M27 28h21v20h21v21" fill="none" stroke="currentColor" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="27" cy="28" r="12" fill="white" stroke="currentColor" strokeWidth="4" />
      <circle cx="48" cy="48" r="12" fill="white" stroke="currentColor" strokeWidth="4" />
      <circle cx="69" cy="69" r="12" fill="white" stroke="currentColor" strokeWidth="4" />
      <text x="27" y="33" textAnchor="middle" fontSize="14" fontWeight="900" fill="currentColor">2</text>
      <text x="48" y="53" textAnchor="middle" fontSize="14" fontWeight="900" fill="currentColor">3</text>
      <text x="69" y="74" textAnchor="middle" fontSize="14" fontWeight="900" fill="currentColor">5</text>
    </svg>
  );
}
