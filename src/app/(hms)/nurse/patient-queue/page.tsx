import { ComingSoon } from '@/components/shared/ComingSoon';

export const metadata = { title: 'Patient Queue' };

export default function NursePatientQueuePage() {
  return (
    <ComingSoon
      title="Patient Queue"
      description="A ward-level queue of patients waiting for nursing attention — triage priority, wait time, and one-tap hand-off to vitals or assessment — is on the way."
    />
  );
}
