import { ComingSoon } from '@/components/shared/ComingSoon';

export const metadata = { title: 'Patient Search' };

export default function PatientSearchPage() {
  return (
    <ComingSoon
      title="Patient Search"
      description="Searching for a patient by name, MRN, or phone number across the hospital is on the way."
    />
  );
}
