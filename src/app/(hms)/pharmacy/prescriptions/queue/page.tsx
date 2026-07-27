import { ComingSoon } from '@/components/shared/ComingSoon';

export const metadata = { title: 'Prescription Queue' };

export default function PrescriptionQueuePage() {
  return (
    <ComingSoon
      title="Prescription Queue"
      description="The full, filterable list of prescriptions awaiting pharmacist verification is on the way."
    />
  );
}
