import type { ReactNode } from 'react';

export type LearningIconName = 'math' | 'korean' | 'english' | 'memory' | 'story' | 'sudoku';

const commonProps = {
  viewBox: '0 0 64 64',
  fill: 'none',
  xmlns: 'http://www.w3.org/2000/svg',
  focusable: false,
  'aria-hidden': true
} as const;

const art: Record<LearningIconName, ReactNode> = {
  math: <><rect x="10" y="10" width="44" height="44" rx="15" fill="#FFF3E8"/><path d="M20 27h12M26 21v12M37 39h8M37 45h8" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/><circle cx="41" cy="25" r="5" fill="#FFC36D"/></>,
  korean: <><path d="M13 15c0-4 3-7 7-7h24c4 0 7 3 7 7v34c0 4-3 7-7 7H20c-4 0-7-3-7-7V15Z" fill="#EEEBFF"/><path d="M23 23v18M23 32h10M39 22v20M39 31h7" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/><path d="M19 51c7-3 19-3 27 0" stroke="#8E7FFF" strokeWidth="3" strokeLinecap="round"/></>,
  english: <><path d="M12 17c0-4 3-7 7-7h26c4 0 7 3 7 7v30c0 4-3 7-7 7H19c-4 0-7-3-7-7V17Z" fill="#E8F8F2"/><path d="m20 43 9-24 9 24M23 35h12" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><path d="M41 26h5M43.5 23.5v5" stroke="#55C49C" strokeWidth="3" strokeLinecap="round"/></>,
  memory: <><path d="M20 14c-6 1-9 6-8 12-4 4-3 11 2 14-1 7 5 12 11 10 3 5 11 5 14 0 7 2 12-3 11-10 5-4 5-11 1-14 1-7-4-12-10-12-4-5-12-5-16 0-2-1-3 0-5 0Z" fill="#E8F3FF" stroke="currentColor" strokeWidth="3" strokeLinejoin="round"/><path d="M25 24c-4 0-6 4-4 7m18-7c4 0 6 4 4 7M25 40c3 3 11 3 14 0M32 18v31" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></>,
  story: <><path d="M10 15c8-3 15-2 22 3v34c-7-5-14-6-22-3V15Z" fill="#EAF8EF" stroke="currentColor" strokeWidth="3" strokeLinejoin="round"/><path d="M54 15c-8-3-15-2-22 3v34c7-5 14-6 22-3V15Z" fill="#FFF7D8" stroke="currentColor" strokeWidth="3" strokeLinejoin="round"/><path d="M17 25h8M17 32h8M39 25h8M39 32h8" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></>,
  sudoku: <><rect x="10" y="10" width="44" height="44" rx="10" fill="#FFF7DD" stroke="currentColor" strokeWidth="3"/><path d="M25 11v42M39 11v42M11 25h42M11 39h42" stroke="currentColor" strokeWidth="2"/><path d="M25 11v42M11 39h42" stroke="currentColor" strokeWidth="4"/><circle cx="18" cy="18" r="3" fill="#F0B94B"/><circle cx="32" cy="32" r="3" fill="#6C5BE8"/><circle cx="46" cy="46" r="3" fill="#42A87A"/></>
};

export function LearningIcon({ name, className }: { name: LearningIconName; className?: string }) {
  return <svg {...commonProps} className={className}>{art[name]}</svg>;
}

