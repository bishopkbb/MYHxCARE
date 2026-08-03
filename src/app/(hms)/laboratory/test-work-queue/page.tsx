import { ComingSoon } from '@/components/shared/ComingSoon';

export const metadata = { title: 'Test Work Queue' };

export default function TestWorkQueuePage() {
  return (
    <ComingSoon
      title="Test Work Queue"
      description="A bench-side worklist of tests currently in process, grouped by department, is on the way."
    />
  );
}
