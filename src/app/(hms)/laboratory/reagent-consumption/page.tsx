import { ComingSoon } from '@/components/shared/ComingSoon';

export const metadata = { title: 'Reagent Consumption' };

export default function ReagentConsumptionPage() {
  return (
    <ComingSoon
      title="Reagent Consumption"
      description="Per-test reagent usage tracking, tied to the analyzer that consumed it, is on the way."
    />
  );
}
