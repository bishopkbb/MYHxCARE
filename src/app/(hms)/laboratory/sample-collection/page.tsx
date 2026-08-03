import { ComingSoon } from '@/components/shared/ComingSoon';

export const metadata = { title: 'Sample Collection' };

export default function SampleCollectionPage() {
  return (
    <ComingSoon
      title="Sample Collection"
      description="Phlebotomy worklist and specimen-labelling for samples awaiting collection is on the way."
    />
  );
}
