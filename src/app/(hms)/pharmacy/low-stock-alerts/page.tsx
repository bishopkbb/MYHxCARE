import { ComingSoon } from '@/components/shared/ComingSoon';

export const metadata = { title: 'Low Stock Alerts' };

export default function LowStockAlertsPage() {
  return (
    <ComingSoon
      title="Low Stock Alerts"
      description="The full, filterable list of medications at or below reorder level is on the way."
    />
  );
}
