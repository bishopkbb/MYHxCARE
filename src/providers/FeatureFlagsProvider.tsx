'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';

export type FeatureFlags = {
  billing: boolean;
  pharmacyDispense: boolean;
  labOrdering: boolean;
  emergencyModule: boolean;
  dutyRoster: boolean;
  collaboration: boolean;
  telemedicine: boolean;
  auditLog: boolean;
};

export type FeatureFlagKey = keyof FeatureFlags;

// Defaults match what is built and enabled for the UniZik HMS deployment.
// Toggle flags here as modules graduate from development to production-ready.
const DEFAULT_FLAGS: FeatureFlags = {
  billing: true,
  pharmacyDispense: true,
  labOrdering: true,
  emergencyModule: true,
  dutyRoster: true,
  collaboration: false,
  telemedicine: false,
  auditLog: false,
};

export type FeatureFlagsContextValue = {
  flags: FeatureFlags;
  isEnabled: (flag: FeatureFlagKey) => boolean;
};

const FeatureFlagsContext = createContext<FeatureFlagsContextValue | null>(null);

export function useFeatureFlags(): FeatureFlagsContextValue {
  const ctx = useContext(FeatureFlagsContext);
  if (!ctx) throw new Error('useFeatureFlags must be used within <FeatureFlagsProvider>');
  return ctx;
}

export function FeatureFlagsProvider({ children }: { children: ReactNode }) {
  const value = useMemo<FeatureFlagsContextValue>(() => {
    const flags = DEFAULT_FLAGS;
    return {
      flags,
      isEnabled: (flag: FeatureFlagKey) => flags[flag],
    };
  }, []);

  return <FeatureFlagsContext.Provider value={value}>{children}</FeatureFlagsContext.Provider>;
}
