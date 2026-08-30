export function BlockGardenIcon({ decorative = true }: { decorative?: boolean }) {
  return (
    <svg viewBox="0 0 64 64" role={decorative ? undefined : 'img'} aria-hidden={decorative || undefined} aria-label={decorative ? undefined : '빈칸 정원'}>
      <rect x="7" y="9" width="50" height="48" rx="13" fill="currentColor" opacity=".13" />
      <path d="M17 18h12v12H17zm18 0h12v12H35zM17 36h12v12H17z" fill="currentColor" opacity=".72" />
      <path d="M37 47c0-8 4-13 12-15 0 8-4 13-12 15Z" fill="currentColor" />
      <path d="M37 47c-1-6-4-9-9-11 0 6 3 10 9 11Z" fill="currentColor" opacity=".82" />
      <path d="M37 48V35" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="3" />
    </svg>
  );
}
