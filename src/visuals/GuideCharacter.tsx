export function GuideCharacter({ className, decorative = false }: { className?: string; decorative?: boolean }) {
  return (
    <svg
      className={className}
      viewBox="0 0 220 220"
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : '별 나침반을 들고 손을 흔드는 수달 탐험대 모리'}
      aria-hidden={decorative || undefined}
      width="220"
      height="220"
      focusable="false"
    >
      <path d="M170 153c28-9 35 17 14 30-13 8-29 5-41-2" fill="#70CDA7" stroke="#27785B" strokeWidth="6" strokeLinecap="round" />
      <ellipse cx="111" cy="144" rx="58" ry="61" fill="#79D5AD" stroke="#27785B" strokeWidth="6" />
      <ellipse cx="111" cy="153" rx="32" ry="41" fill="#FFF1C9" />
      <circle cx="61" cy="80" r="22" fill="#66C39C" stroke="#27785B" strokeWidth="6" />
      <circle cx="161" cy="80" r="22" fill="#66C39C" stroke="#27785B" strokeWidth="6" />
      <circle cx="111" cy="76" r="64" fill="#82DDB7" stroke="#27785B" strokeWidth="6" />
      <path d="M84 71c7-6 14-6 20 0M118 71c7-6 14-6 20 0" stroke="#365447" strokeWidth="5" strokeLinecap="round" />
      <ellipse cx="94" cy="85" rx="8" ry="11" fill="#2E2929" /><ellipse cx="128" cy="85" rx="8" ry="11" fill="#2E2929" />
      <circle cx="97" cy="81" r="2.5" fill="white" /><circle cx="131" cy="81" r="2.5" fill="white" />
      <ellipse cx="111" cy="106" rx="29" ry="22" fill="#FFF1C9" />
      <path d="M104 100c0-7 14-7 14 0 0 4-3 7-7 7s-7-3-7-7Z" fill="#5B3A2E" />
      <path d="M111 107c0 9-12 12-17 5M111 107c0 9 12 12 17 5" stroke="#5B3A2E" strokeWidth="3" strokeLinecap="round" />
      <path d="M69 123c25 13 60 13 84 0l-8 23c-22-10-48-10-69 0l-7-23Z" fill="#8E7BE8" stroke="#5646AE" strokeWidth="5" strokeLinejoin="round" />
      <path d="m140 132 21 20-21 7-10-20" fill="#A797F2" stroke="#5646AE" strokeWidth="5" strokeLinejoin="round" />
      <path d="M158 119c15-25 31-35 41-25 8 8 0 23-15 38" fill="none" stroke="#27785B" strokeWidth="22" strokeLinecap="round" />
      <circle cx="193" cy="91" r="5" fill="#FFF1C9" /><circle cx="184" cy="83" r="4" fill="#FFF1C9" /><circle cx="198" cy="104" r="4" fill="#FFF1C9" />
      <path d="M78 142c-20-10-34 1-29 16 4 12 18 12 29 4" fill="#70CDA7" stroke="#27785B" strokeWidth="6" strokeLinecap="round" />
      <path d="M57 161c7-19 30-25 44-10" stroke="#E2AE31" strokeWidth="6" strokeLinecap="round" />
      <path d="m78 139 8 12 14 3-10 10 1 14-13-6-13 6 2-14-10-10 14-3 7-12Z" fill="#A797F2" stroke="#5646AE" strokeWidth="5" strokeLinejoin="round" />
      <circle cx="78" cy="158" r="7" fill="#FFD55C" /><path d="m78 150 2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6Z" fill="#735AC7" />
      <ellipse cx="84" cy="197" rx="25" ry="12" fill="#65BF98" stroke="#27785B" strokeWidth="6" /><ellipse cx="137" cy="197" rx="25" ry="12" fill="#65BF98" stroke="#27785B" strokeWidth="6" />
    </svg>
  );
}
