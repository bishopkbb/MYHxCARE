import { ComingSoon } from '@/components/shared/ComingSoon';

export const metadata = { title: 'My Patients' };

export default function NurseMyPatientsPage() {
  return (
    <ComingSoon
      title="My Patients"
      description="The full roster of patients currently assigned to you, with condition, ward/bed, and quick actions for vitals, medication, and notes, is on the way."
    />
  );
}
