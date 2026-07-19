import { ComingSoon } from '@/components/shared/ComingSoon';

export const metadata = { title: 'Ward Census' };

export default function NurseWardCensusPage() {
  return (
    <ComingSoon
      title="Ward Census"
      description="A live per-ward occupancy summary — occupied, available, and reserved beds, with patient acuity mix — is on the way."
    />
  );
}
