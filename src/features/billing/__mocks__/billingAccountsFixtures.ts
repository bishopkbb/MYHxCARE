/**
 * Billing Accounts fixtures — no real billing-account domain store exists
 * yet (see `billingDashboardFixtures.ts` for the same gap on the
 * Dashboard) — illustrative but internally consistent data, swapped for a
 * real `GET /billing/accounts` endpoint in Phase 6.
 *
 * The mockup's total ("2,548 accounts") and pagination ("... 319") are not
 * reproduced literally — that would mean either faking a stat that doesn't
 * match the real (small) fixture array, or generating thousands of unused
 * objects. Instead this seeds a representative set and every stat/count on
 * screen is derived from — and therefore always matches — that real array.
 *
 * Status is derived, not stored: `outstanding = totalBilled - totalPaid`,
 * and an account only becomes "Overdue" once its outstanding balance has
 * aged past 30 days (`daysOutstanding`) — same 30-day threshold the
 * Dashboard's Outstanding Invoices Summary ageing buckets use. "Current
 * Balance" mirrors Outstanding here (no credit/hold adjustments modelled
 * yet), which is why the two columns read identically for every row.
 */

export type AccountStatus = 'Paid' | 'Partial' | 'Overdue';

export type BillingAccount = {
  id: string;
  patientName: string;
  phone: string;
  email: string;
  mrn: string;
  secondaryId?: string | undefined;
  department: string;
  totalBilled: number;
  totalPaid: number;
  daysOutstanding: number;
  active: boolean;
  invoiceCount: number;
  paymentCount: number;
  adjustmentCount: number;
  refundCount: number;
  documentCount: number;
};

export function deriveOutstanding(account: BillingAccount): number {
  return Math.max(0, account.totalBilled - account.totalPaid);
}

export function deriveStatus(account: BillingAccount): AccountStatus {
  const outstanding = deriveOutstanding(account);
  if (outstanding === 0) return 'Paid';
  return account.daysOutstanding > 30 ? 'Overdue' : 'Partial';
}

export const BILLING_ACCOUNT_DEPARTMENTS = [
  'Laboratory',
  'Pharmacy',
  'Consultation',
  'Emergency',
  'Ward',
  'Other Services',
];

const FIRST_NAMES = [
  'Ada',
  'John',
  'Funmilayo',
  'Michael',
  'Oluchi',
  'Adebayo',
  'Sarah',
  'Ibrahim',
  'Ngozi',
  'Chidi',
  'Blessing',
  'Emeka',
  'Amaka',
  'Tunde',
  'Grace',
  'Yusuf',
  'Chiamaka',
  'Segun',
  'Halima',
  'Uche',
];
const LAST_NAMES = [
  'Okafor',
  'Nwabueze',
  'Bello',
  'Tunde',
  'Samuel',
  'Emmanuel',
  'Raymond',
  'Kazeem',
  'Eze',
  'Balogun',
  'Adeyemi',
  'Onu',
  'Ibrahim',
  'Nwosu',
  'Okonkwo',
];

function seedAccounts(count: number): BillingAccount[] {
  const accounts: BillingAccount[] = [];

  // The first 8 rows match the reference mockup exactly, so a visual check
  // against it lines up row-for-row; the rest fill out pagination.
  const seeded: Omit<
    BillingAccount,
    | 'id'
    | 'email'
    | 'active'
    | 'invoiceCount'
    | 'paymentCount'
    | 'adjustmentCount'
    | 'refundCount'
    | 'documentCount'
  >[] = [
    {
      patientName: 'Ada Okafor',
      phone: '0703 456 7890',
      mrn: 'MRN-000123',
      department: 'Laboratory',
      totalBilled: 25_200,
      totalPaid: 22_200,
      daysOutstanding: 12,
    },
    {
      patientName: 'John Nwabueze',
      phone: '0802 345 6789',
      mrn: 'MRN-000124',
      department: 'Pharmacy',
      totalBilled: 18_500,
      totalPaid: 18_500,
      daysOutstanding: 0,
    },
    {
      patientName: 'Funmilayo Bello',
      phone: '0906 123 4567',
      mrn: 'MRN-000125',
      secondaryId: 'STA-2024-0156',
      department: 'Consultation',
      totalBilled: 35_000,
      totalPaid: 15_000,
      daysOutstanding: 45,
    },
    {
      patientName: 'Michael Tunde',
      phone: '0805 678 9123',
      mrn: 'MRN-000126',
      department: 'Emergency',
      totalBilled: 42_800,
      totalPaid: 42_800,
      daysOutstanding: 0,
    },
    {
      patientName: 'Oluchi Samuel',
      phone: '0701 234 5678',
      mrn: 'MRN-000127',
      secondaryId: 'STA-2024-0211',
      department: 'Ward',
      totalBilled: 76_000,
      totalPaid: 40_000,
      daysOutstanding: 58,
    },
    {
      patientName: 'Adebayo Emmanuel',
      phone: '0812 345 6780',
      mrn: 'MRN-000128',
      department: 'Laboratory',
      totalBilled: 12_700,
      totalPaid: 12_700,
      daysOutstanding: 0,
    },
    {
      patientName: 'Sarah Raymond',
      phone: '0902 987 6543',
      mrn: 'MRN-000129',
      secondaryId: 'STA-2024-0198',
      department: 'Pharmacy',
      totalBilled: 9_850,
      totalPaid: 2_850,
      daysOutstanding: 18,
    },
    {
      patientName: 'Ibrahim Kazeem',
      phone: '0809 876 5432',
      mrn: 'MRN-000130',
      department: 'Other Services',
      totalBilled: 6_450,
      totalPaid: 0,
      daysOutstanding: 33,
    },
  ];

  seeded.forEach((s, i) => {
    accounts.push({
      ...s,
      id: `bacc-${i + 1}`,
      email: `${s.patientName.toLowerCase().replace(/\s+/g, '.')}@email.com`,
      active: true,
      invoiceCount: 1 + (i % 6),
      paymentCount: 1 + (i % 5),
      adjustmentCount: i % 2,
      refundCount: i % 3 === 0 ? 1 : 0,
      documentCount: 1 + (i % 4),
    });
  });

  for (let i = seeded.length; i < count; i++) {
    const first = FIRST_NAMES[i % FIRST_NAMES.length]!;
    const last = LAST_NAMES[(i * 3) % LAST_NAMES.length]!;
    const department = BILLING_ACCOUNT_DEPARTMENTS[i % BILLING_ACCOUNT_DEPARTMENTS.length]!;
    const totalBilled = 5_000 + ((i * 3_137) % 70_000);
    // Deterministic wobble decides how much of the bill is paid — biased so
    // roughly a third of generated accounts are fully paid.
    const paidRatio = i % 3 === 0 ? 1 : ((i * 53) % 80) / 100;
    const totalPaid = Math.round(totalBilled * paidRatio);
    const daysOutstanding = totalPaid >= totalBilled ? 0 : 5 + ((i * 17) % 70);

    accounts.push({
      id: `bacc-${i + 1}`,
      patientName: `${first} ${last}`,
      phone: `08${(10_000_0000 + i * 7919) % 100_000_0000}`.slice(0, 11),
      email: `${first.toLowerCase()}.${last.toLowerCase()}@email.com`,
      mrn: `MRN-${String(131 + i).padStart(6, '0')}`,
      secondaryId: i % 4 === 0 ? `STA-2024-${String(300 + i).padStart(4, '0')}` : undefined,
      department,
      totalBilled,
      totalPaid,
      daysOutstanding,
      active: i % 23 !== 0,
      invoiceCount: 1 + (i % 6),
      paymentCount: 1 + (i % 5),
      adjustmentCount: i % 4 === 0 ? 1 : 0,
      refundCount: i % 7 === 0 ? 1 : 0,
      documentCount: 1 + (i % 4),
    });
  }

  return accounts;
}

export const BILLING_ACCOUNTS: BillingAccount[] = seedAccounts(64);
