'use client';

import type { ReactNode } from 'react';

import { useFeatureFlags, type FeatureFlagKey } from '@providers/FeatureFlagsProvider';

interface FlagGateProps {
  flag: FeatureFlagKey;
  /** Rendered when the flag is disabled. Defaults to null. */
  fallback?: ReactNode;
  children: ReactNode;
}

export function FlagGate({ flag, fallback = null, children }: FlagGateProps) {
  const { isEnabled } = useFeatureFlags();
  return <>{isEnabled(flag) ? children : fallback}</>;
}
