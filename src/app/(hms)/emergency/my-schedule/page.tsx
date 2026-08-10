import { ComingSoon } from '@/components/shared/ComingSoon';

export const metadata = { title: 'My Schedule' };

export default function MySchedulePage() {
  return (
    <ComingSoon
      title="My Schedule"
      description="Your own upcoming emergency department shifts and coverage are on the way."
    />
  );
}
