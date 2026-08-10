import { ComingSoon } from '@/components/shared/ComingSoon';

export const metadata = { title: 'Patient Queue' };

export default function PatientQueuePage() {
  return (
    <ComingSoon
      title="Patient Queue"
      description="Real-time emergency patient queue, sorted by arrival and priority, is on the way."
    />
  );
}
