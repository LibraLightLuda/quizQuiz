export function ShapeBlockIcon({ decorative = true }: { decorative?: boolean }) {
  return (
    <svg viewBox="0 0 64 64" role={decorative ? undefined : 'img'} aria-hidden={decorative || undefined} aria-label={decorative ? undefined : '모양블록'}>
      <path d="M7 8h23L7 31Z" fill="#f26b5e" /><path d="M34 8h23v23Z" fill="#f3a82c" />
      <path d="M8 36h18v18H8Z" fill="#45b97c" /><path d="m31 34 12 12-12 12Z" fill="#3b9fd0" />
      <path d="m45 35 12 6-6 16-12-6Z" fill="#8b67d7" />
    </svg>
  );
}
