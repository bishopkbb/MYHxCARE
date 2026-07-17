import { ComingSoon } from '@/components/shared/ComingSoon';

export const metadata = { title: 'Check-In' };

export default function CheckInPage() {
  return (
    <ComingSoon
      title="Check-In"
      description="Patient arrival check-in against today's appointments and walk-ins is being built."
    />
  );
}
