import { ComingSoon } from '@/components/shared/ComingSoon';

export const metadata = { title: 'Invoices' };

export default function BillingInvoicesPage() {
  return (
    <ComingSoon
      title="Invoices"
      description="Invoice generation, itemized service charges, and NHIS/insurance claim invoicing are on the way."
    />
  );
}
