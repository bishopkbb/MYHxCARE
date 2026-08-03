import { ComingSoon } from '@/components/shared/ComingSoon';

export const metadata = { title: 'Patient Search' };

export default function LaboratoryPatientSearchPage() {
  return (
    <ComingSoon
      title="Patient Search"
      description="Search across every patient with a lab history, by name, MRN, or sample ID, is on the way."
    />
  );
}
