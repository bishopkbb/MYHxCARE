import { ComingSoon } from '@/components/shared/ComingSoon';

export const metadata = { title: 'Payments' };

export default function PaymentsPage() {
  return (
    <ComingSoon
      title="Payments"
      description="Payment collection, receipt generation, outstanding balance tracking, Paystack/Flutterwave integration, and reconciliation are on the way."
    />
  );
}
