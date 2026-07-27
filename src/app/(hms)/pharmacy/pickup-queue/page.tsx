import { ComingSoon } from '@/components/shared/ComingSoon';

export const metadata = { title: 'Medication Pickup Queue' };

export default function MedicationPickupQueuePage() {
  return (
    <ComingSoon
      title="Medication Pickup Queue"
      description="The full, filterable list of dispensed medications awaiting patient collection is on the way."
    />
  );
}
