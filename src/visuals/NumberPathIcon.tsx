export function NumberPathIcon({ className = '', decorative = false }: { className?: string; decorative?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 96 96" role={decorative ? undefined : 'img'} aria-hidden={decorative || undefined} aria-label={decorative ? undefined : '숫자 길 찾기'}>
      <rect x="7" y="14" width="82" height="68" rx="20" fill="currentColor" opacity=".11" />
      <path d="M20 48Q33 29 47 48M20 48Q33 67 47 48M49 48Q63 29 76 48M49 48Q63 67 76 48" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity=".55" />
      <path d="M20 48Q33 29 47 48M49 48Q63 67 76 48" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
      <circle cx="18" cy="48" r="11" fill="white" stroke="currentColor" strokeWidth="4" />
      <circle cx="48" cy="48" r="11" fill="white" stroke="currentColor" strokeWidth="4" />
      <circle cx="78" cy="48" r="11" fill="white" stroke="currentColor" strokeWidth="4" />
      <text x="33" y="34" textAnchor="middle" fontSize="11" fontWeight="900" fill="currentColor">+2</text>
      <text x="63" y="69" textAnchor="middle" fontSize="11" fontWeight="900" fill="currentColor">+3</text>
      <text x="18" y="52" textAnchor="middle" fontSize="10" fontWeight="900" fill="currentColor">출</text>
      <text x="78" y="52" textAnchor="middle" fontSize="10" fontWeight="900" fill="currentColor">★</text>
    </svg>
  );
}
