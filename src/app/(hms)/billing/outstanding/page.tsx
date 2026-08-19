import { ComingSoon } from '@/components/shared/ComingSoon';

export const metadata = { title: 'Outstanding Accounts' };

export default function BillingOutstandingPage() {
  return (
    <ComingSoon
      title="Outstanding Accounts"
      description="A worklist of patient accounts with unpaid balances, grouped by age, is on the way."
    />
  );
}
