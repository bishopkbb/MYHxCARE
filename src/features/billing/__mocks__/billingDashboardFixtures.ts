/**
 * Accounts & Billing Dashboard fixtures — no real billing/payment/invoice
 * domain store exists anywhere in this build yet (`src/features/billing/`
 * and `src/features/revenue/` are still empty Phase 6 scaffolds) — this is
 * the same honest, clearly-commented illustrative-data pattern used for
 * every other dashboard before its real store existed, swapped for a real
 * `GET /billing/dashboard` endpoint in Phase 6.
 *
 * The four headline numbers are deliberately internally consistent, not
 * independently invented: Today's Billing (₦1,245,500) − Payments Received
 * (₦986,000) = Outstanding Invoices (₦259,500) exactly, and the Outstanding
 * Invoices Summary / Top Departments tables both foot to the matching
 * headline totals.
 */

export type BillingStat = {
  key: string;
  label: string;
  value: string;
  deltaPercent: number;
  direction: 'up' | 'down';
  goodDirection: 'up' | 'down';
};

export const BILLING_STATS: BillingStat[] = [
  {
    key: 'todaysBilling',
    label: "Today's Billing",
    value: '₦1,245,500',
    deltaPercent: 12.3,
    direction: 'up',
    goodDirection: 'up',
  },
  {
    key: 'paymentsReceived',
    label: 'Payments Received',
    value: '₦986,000',
    deltaPercent: 8.7,
    direction: 'up',
    goodDirection: 'up',
  },
  {
    key: 'outstandingInvoices',
    label: 'Outstanding Invoices',
    value: '₦259,500',
    deltaPercent: 4.1,
    direction: 'down',
    goodDirection: 'down',
  },
  {
    key: 'pendingRefunds',
    label: 'Pending Refunds',
    value: '₦45,000',
    deltaPercent: 2.6,
    direction: 'up',
    goodDirection: 'down',
  },
];

export type TrendPoint = { label: string; value: number };

// Hourly, ramping through the day — the shape today's ₦986,000 total
// actually traces out (00:00 → 24:00).
export const REVENUE_TREND_TODAY: TrendPoint[] = [
  { label: '00:00', value: 0 },
  { label: '02:00', value: 8_000 },
  { label: '04:00', value: 22_000 },
  { label: '06:00', value: 61_000 },
  { label: '08:00', value: 168_000 },
  { label: '10:00', value: 312_000 },
  { label: '12:00', value: 452_000 },
  { label: '14:00', value: 588_000 },
  { label: '16:00', value: 712_000 },
  { label: '18:00', value: 831_000 },
  { label: '20:00', value: 918_000 },
  { label: '22:00', value: 968_000 },
  { label: '24:00', value: 986_000 },
];

function seedDaily(days: number, endMs: number, base: number, amplitude: number): TrendPoint[] {
  const points: TrendPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(endMs - i * 24 * 60 * 60 * 1000);
    const wobble = Math.sin(i * 0.8) * amplitude * 0.6 + Math.cos(i * 1.4) * amplitude * 0.4;
    points.push({
      label: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
      value: Math.max(0, Math.round(base + wobble)),
    });
  }
  return points;
}

function seedMonthly(months: number, endMs: number, base: number, amplitude: number): TrendPoint[] {
  const points: TrendPoint[] = [];
  const end = new Date(endMs);
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(end.getFullYear(), end.getMonth() - i, 1);
    const wobble = Math.sin(i * 0.7) * amplitude * 0.6 + Math.cos(i * 1.1) * amplitude * 0.4;
    points.push({
      label: d.toLocaleDateString('en-GB', { month: 'short' }),
      value: Math.max(0, Math.round(base + wobble)),
    });
  }
  return points;
}

export function buildRevenueTrendWeek(now: number): TrendPoint[] {
  return seedDaily(7, now, 920_000, 180_000);
}
export function buildRevenueTrendMonth(now: number): TrendPoint[] {
  return seedDaily(30, now, 890_000, 220_000);
}
export function buildRevenueTrendYear(now: number): TrendPoint[] {
  return seedMonthly(12, now, 26_500_000, 6_500_000);
}

export type PaymentMethodSlice = {
  method: string;
  amount: number;
  percent: number;
  color: string;
};

export const REVENUE_BY_PAYMENT_METHOD: PaymentMethodSlice[] = [
  { method: 'POS', amount: 443_700, percent: 45, color: '#2563EB' },
  { method: 'Bank Transfer', amount: 295_800, percent: 30, color: '#16A34A' },
  { method: 'Cash', amount: 147_900, percent: 15, color: '#00B4D8' },
  { method: 'Card', amount: 68_900, percent: 7, color: '#7C3AED' },
  { method: 'Online', amount: 29_700, percent: 3, color: '#EC4899' },
];

export const BILLING_DEPARTMENTS = [
  'Laboratory',
  'Pharmacy',
  'Consultation',
  'Emergency',
  'Other Services',
];
export const BILLING_SERVICES = [
  'Consultation',
  'Laboratory Tests',
  'Pharmacy Dispensing',
  'Imaging',
  'Procedures',
];
export const BILLING_PAYMENT_METHODS = ['POS', 'Bank Transfer', 'Cash', 'Card', 'Online'];

// Deterministic per-department revenue share, used to scale the Revenue
// Overview total when the Department filter narrows to one — derived from
// (and must stay consistent with) TOP_DEPARTMENTS_TODAY below.
export const DEPARTMENT_REVENUE_SHARE: Record<string, number> = {
  Laboratory: 0.434,
  Pharmacy: 0.242,
  Consultation: 0.179,
  Emergency: 0.1,
  'Other Services': 0.045,
};

// Same idea for Service — no independent real breakdown exists, so this is
// an illustrative, deterministic share used only to scale the filtered view.
export const SERVICE_REVENUE_SHARE: Record<string, number> = {
  Consultation: 0.28,
  'Laboratory Tests': 0.31,
  'Pharmacy Dispensing': 0.24,
  Imaging: 0.11,
  Procedures: 0.06,
};

export type AgeingRow = {
  bucket: string;
  invoices: number;
  amount: number;
  percent: number;
};

export const OUTSTANDING_INVOICES_AGEING: AgeingRow[] = [
  { bucket: '0 - 30 Days', invoices: 58, amount: 112_200, percent: 43 },
  { bucket: '31 - 60 Days', invoices: 34, amount: 78_300, percent: 30 },
  { bucket: '61 - 90 Days', invoices: 19, amount: 41_600, percent: 16 },
  { bucket: '90+ Days', invoices: 12, amount: 27_400, percent: 11 },
];

export type DepartmentRevenueRow = {
  rank: number;
  department: string;
  revenue: number;
  percentOfTotal: number;
};

export const TOP_DEPARTMENTS_TODAY: DepartmentRevenueRow[] = [
  { rank: 1, department: 'Laboratory', revenue: 428_500, percentOfTotal: 43.4 },
  { rank: 2, department: 'Pharmacy', revenue: 238_200, percentOfTotal: 24.2 },
  { rank: 3, department: 'Consultation', revenue: 176_800, percentOfTotal: 17.9 },
  { rank: 4, department: 'Emergency', revenue: 98_400, percentOfTotal: 10.0 },
  { rank: 5, department: 'Other Services', revenue: 44_100, percentOfTotal: 4.5 },
];

export type ActivityType = 'payment' | 'invoice' | 'refund' | 'reconciliation' | 'adjustment';

export type ActivityEntry = {
  id: string;
  type: ActivityType;
  title: string;
  detail: string;
  timeLabel: string;
  minutesAgo: number;
};

export const RECENT_ACTIVITY: ActivityEntry[] = [
  {
    id: 'act-1',
    type: 'payment',
    title: 'Payment posted for INV-02458',
    detail: 'John N. · ₦25,000 · POS',
    timeLabel: '2:42 PM',
    minutesAgo: 8,
  },
  {
    id: 'act-2',
    type: 'invoice',
    title: 'Invoice INV-02457 created',
    detail: 'Ada Okafor · ₦12,500',
    timeLabel: '1:35 PM',
    minutesAgo: 75,
  },
  {
    id: 'act-3',
    type: 'refund',
    title: 'Refund request approved',
    detail: 'Mary Johnson · ₦8,000',
    timeLabel: '12:18 PM',
    minutesAgo: 152,
  },
  {
    id: 'act-4',
    type: 'reconciliation',
    title: 'Payment reconciliation completed',
    detail: '18 Aug 2026 · Matched: 24 · Unmatched: 1',
    timeLabel: '11:05 AM',
    minutesAgo: 225,
  },
  {
    id: 'act-5',
    type: 'adjustment',
    title: 'Adjustment posted',
    detail: 'INV-02445 · Discount · ₦2,000',
    timeLabel: '10:20 AM',
    minutesAgo: 270,
  },
];
