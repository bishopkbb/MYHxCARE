import { ComingSoon } from '@/components/shared/ComingSoon';

export const metadata = { title: 'Sample Tracking' };

export default function SampleTrackingPage() {
  return (
    <ComingSoon
      title="Sample Tracking"
      description="Barcode-based specimen tracking, chain of custody logging, processing status, and rejection management are on the way."
    />
  );
}
