import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { recordGrowthCompletion } from './growthModel';
import { loadGrowthState, saveGrowthState } from './growthStorage';
import type { GrowthAwardResult, GrowthSectionId, GrowthState } from './types';

interface GrowthContextValue {
  state: GrowthState;
  awardCompletion: (sectionId: GrowthSectionId, completedAt?: Date) => GrowthAwardResult;
  reload: () => void;
}

const GrowthContext = createContext<GrowthContextValue | null>(null);

export function GrowthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(loadGrowthState);
  const stateRef = useRef(state);

  const awardCompletion = useCallback((sectionId: GrowthSectionId, completedAt = new Date()): GrowthAwardResult => {
    const mutation = recordGrowthCompletion(stateRef.current, sectionId, completedAt);
    stateRef.current = mutation.state;
    setState(mutation.state);
    return { award: mutation.award, saved: saveGrowthState(mutation.state) };
  }, []);

  const reload = useCallback(() => {
    const next = loadGrowthState();
    stateRef.current = next;
    setState(next);
  }, []);

  return <GrowthContext.Provider value={{ state, awardCompletion, reload }}>{children}</GrowthContext.Provider>;
}

export const useGrowth = (): GrowthContextValue => {
  const value = useContext(GrowthContext);
  if (!value) throw new Error('useGrowth must be used inside GrowthProvider');
  return value;
};
