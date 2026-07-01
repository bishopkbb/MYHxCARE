import { useFeatureFlags, type FeatureFlagKey } from '@providers/FeatureFlagsProvider';

export function useFlag(flag: FeatureFlagKey): boolean {
  return useFeatureFlags().isEnabled(flag);
}
