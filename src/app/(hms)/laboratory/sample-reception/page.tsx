import { ComingSoon } from '@/components/shared/ComingSoon';

export const metadata = { title: 'Sample Reception' };

export default function SampleReceptionPage() {
  return (
    <ComingSoon
      title="Sample Reception"
      description="Logging incoming specimens at the bench — accept, reject, and route to the right department — is on the way."
    />
  );
}
