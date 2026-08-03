import { ComingSoon } from '@/components/shared/ComingSoon';

export const metadata = { title: 'Sample Tracking' };

export default function SampleTrackingPage() {
  return (
    <ComingSoon
      title="Sample Tracking"
      description="End-to-end chain-of-custody tracking for every specimen, from collection to disposal, is on the way."
    />
  );
}
