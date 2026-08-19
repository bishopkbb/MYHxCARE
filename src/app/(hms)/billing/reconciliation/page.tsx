import { ComingSoon } from '@/components/shared/ComingSoon';

export const metadata = { title: 'Payment Reconciliation' };

export default function BillingReconciliationPage() {
  return (
    <ComingSoon
      title="Payment Reconciliation"
      description="Matching recorded payments against bank/gateway transactions and flagging unmatched entries is on the way."
    />
  );
}
