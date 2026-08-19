/**
 * Per-account transaction history for the "View Full Account" page — same
 * no-real-store gap as `billingAccountsFixtures.ts`, so this derives a
 * deterministic (not random) set of invoices/payments/adjustments/refunds/
 * documents from each `BillingAccount`'s own summary fields, seeded by MRN.
 * Invoice amounts always foot to `totalBilled`; payment amounts always foot
 * to `totalPaid` — so the generated history is never inconsistent with the
 * account summary it belongs to. Swapped for real
 * `GET /billing/accounts/:mrn/*` endpoints in Phase 6.
 */

import { BILLING_ACCOUNTS, type BillingAccount } from './billingAccountsFixtures';

function hashSeed(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (Math.imul(h, 31) + input.charCodeAt(i)) | 0;
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Splits `total` into `count` positive integer parts (last part absorbs the
 * rounding remainder), so the parts always sum exactly to `total`. */
function splitAmount(total: number, count: number, rand: () => number): number[] {
  if (count <= 0) return [];
  if (count === 1) return [total];
  const weights = Array.from({ length: count }, () => 0.4 + rand());
  const weightSum = weights.reduce((s, w) => s + w, 0);
  const parts = weights.map((w) => Math.round((w / weightSum) * total));
  const drift = total - parts.reduce((s, p) => s + p, 0);
  parts[parts.length - 1] = (parts[parts.length - 1] ?? 0) + drift;
  return parts.map((p) => Math.max(0, p));
}

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

export type InvoiceStatus =
  'Draft' | 'Issued' | 'Partially Paid' | 'Paid' | 'Overdue' | 'Cancelled';
export type InvoiceRecord = {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  description: string;
  service: string;
  amount: number;
  paid: number;
  status: InvoiceStatus;
};

export type PaymentRecord = {
  id: string;
  date: string;
  amount: number;
  method: string;
  reference: string;
  invoiceNumber: string;
};

export type AdjustmentType = 'Discount' | 'Write-off' | 'Correction';
export type AdjustmentRecord = {
  id: string;
  date: string;
  type: AdjustmentType;
  amount: number;
  reason: string;
  invoiceNumber: string;
};

export type RefundStatus = 'Pending' | 'Approved' | 'Completed';
export type RefundRecord = {
  id: string;
  date: string;
  amount: number;
  reason: string;
  status: RefundStatus;
};

export type DocumentRecord = {
  id: string;
  name: string;
  type: string;
  uploadedAt: string;
  sizeKb: number;
};

export type AccountDetail = {
  invoices: InvoiceRecord[];
  payments: PaymentRecord[];
  adjustments: AdjustmentRecord[];
  refunds: RefundRecord[];
  documents: DocumentRecord[];
};

const INVOICE_DESCRIPTIONS = [
  'Consultation fee',
  'Laboratory test panel',
  'Pharmacy dispensing',
  'Ward admission charges',
  'Imaging & diagnostics',
  'Procedure fee',
  'Follow-up consultation',
];
// One service per description above, same index — lets the Invoices screen
// offer a "Service" filter without inventing a second, disconnected list.
const INVOICE_SERVICES = [
  'Consultation',
  'Laboratory Tests',
  'Pharmacy Dispensing',
  'Ward Admission',
  'Imaging',
  'Procedures',
  'Consultation',
];
const INVOICE_DUE_DAYS = 7;
// Deduplicated, same order as first appearance in INVOICE_SERVICES — the
// Invoices screen's Service filter options.
export const INVOICE_SERVICE_OPTIONS = Array.from(new Set(INVOICE_SERVICES));
export const INVOICE_STATUS_OPTIONS: InvoiceStatus[] = [
  'Draft',
  'Issued',
  'Partially Paid',
  'Paid',
  'Overdue',
  'Cancelled',
];
const PAYMENT_METHODS = ['POS', 'Bank Transfer', 'Cash', 'Card', 'Online'];
const ADJUSTMENT_TYPES: AdjustmentType[] = ['Discount', 'Write-off', 'Correction'];
const ADJUSTMENT_REASONS: Record<AdjustmentType, string[]> = {
  Discount: ['Staff dependent discount', 'NHIS co-pay adjustment', 'Goodwill discount'],
  'Write-off': ['Uncollectable balance', 'Charity care write-off'],
  Correction: ['Billing error correction', 'Duplicate charge reversed'],
};
const REFUND_REASONS = [
  'Overpayment',
  'Cancelled procedure',
  'Insurance reimbursement',
  'Service not rendered',
];
const DOCUMENT_TYPES = [
  'Invoice PDF',
  'Payment Receipt',
  'Insurance Claim Form',
  'Statement of Account',
];

export function buildAccountDetail(account: BillingAccount): AccountDetail {
  const rand = mulberry32(hashSeed(account.mrn));

  const invoiceCount = Math.max(1, account.invoiceCount);
  const invoiceAmounts = splitAmount(account.totalBilled, invoiceCount, rand);
  const now = Date.now();
  let remainingPaid = account.totalPaid;
  const invoices: InvoiceRecord[] = invoiceAmounts.map((amount, i) => {
    const paidTowards = Math.min(amount, Math.max(0, remainingPaid));
    remainingPaid -= paidTowards;
    const descIdx =
      (i + Math.floor(rand() * INVOICE_DESCRIPTIONS.length)) % INVOICE_DESCRIPTIONS.length;
    const invoiceDate = daysAgo(account.daysOutstanding + i * 6 + 2);
    const dueDate = new Date(
      new Date(invoiceDate).getTime() + INVOICE_DUE_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();
    const isOverdue = paidTowards < amount && new Date(dueDate).getTime() < now;
    // Small, deterministic slice of invoices sit in Draft/Cancelled instead
    // of the payment-driven lifecycle — matches a real billing system where
    // not every invoice is even issued yet, or gets voided outright.
    const lifecycleRoll = rand();
    let status: InvoiceStatus;
    if (lifecycleRoll < 0.02) status = 'Draft';
    else if (lifecycleRoll < 0.035) status = 'Cancelled';
    else if (paidTowards >= amount) status = 'Paid';
    else if (isOverdue) status = 'Overdue';
    else if (paidTowards > 0) status = 'Partially Paid';
    else status = 'Issued';

    return {
      id: `${account.id}-inv-${i + 1}`,
      invoiceNumber: `INV-${String(2400 + Math.floor(rand() * 200) + i).padStart(5, '0')}`,
      date: invoiceDate,
      dueDate,
      description: INVOICE_DESCRIPTIONS[descIdx]!,
      service: INVOICE_SERVICES[descIdx]!,
      amount,
      paid: status === 'Cancelled' ? 0 : paidTowards,
      status,
    };
  });

  const paymentCount = Math.max(account.totalPaid > 0 ? 1 : 0, account.paymentCount);
  const paymentAmounts =
    account.totalPaid > 0 ? splitAmount(account.totalPaid, paymentCount, rand) : [];
  const payments: PaymentRecord[] = paymentAmounts.map((amount, i) => ({
    id: `${account.id}-pay-${i + 1}`,
    date: daysAgo(Math.max(0, account.daysOutstanding - i * 4)),
    amount,
    method: PAYMENT_METHODS[Math.floor(rand() * PAYMENT_METHODS.length)]!,
    reference: `PMT-${String(100000 + Math.floor(rand() * 899999))}`,
    invoiceNumber: invoices[i % Math.max(1, invoices.length)]?.invoiceNumber ?? '—',
  }));

  const adjustments: AdjustmentRecord[] = Array.from(
    { length: account.adjustmentCount },
    (_, i) => {
      const type = ADJUSTMENT_TYPES[Math.floor(rand() * ADJUSTMENT_TYPES.length)]!;
      const reasons = ADJUSTMENT_REASONS[type];
      return {
        id: `${account.id}-adj-${i + 1}`,
        date: daysAgo(10 + i * 9),
        type,
        amount: 500 + Math.floor(rand() * 4_500),
        reason: reasons[Math.floor(rand() * reasons.length)]!,
        invoiceNumber: invoices[i % Math.max(1, invoices.length)]?.invoiceNumber ?? '—',
      };
    },
  );

  const refundStatuses: RefundStatus[] = ['Pending', 'Approved', 'Completed'];
  const refunds: RefundRecord[] = Array.from({ length: account.refundCount }, (_, i) => ({
    id: `${account.id}-ref-${i + 1}`,
    date: daysAgo(5 + i * 11),
    amount: 1_000 + Math.floor(rand() * 8_000),
    reason: REFUND_REASONS[Math.floor(rand() * REFUND_REASONS.length)]!,
    status: refundStatuses[Math.floor(rand() * refundStatuses.length)]!,
  }));

  const documents: DocumentRecord[] = Array.from({ length: account.documentCount }, (_, i) => ({
    id: `${account.id}-doc-${i + 1}`,
    name: `${DOCUMENT_TYPES[i % DOCUMENT_TYPES.length]} — ${account.mrn}.pdf`,
    type: DOCUMENT_TYPES[i % DOCUMENT_TYPES.length]!,
    uploadedAt: daysAgo(3 + i * 7),
    sizeKb: 80 + Math.floor(rand() * 400),
  }));

  return { invoices, payments, adjustments, refunds, documents };
}

export type InvoiceWithAccount = InvoiceRecord & {
  patientName: string;
  mrn: string;
  secondaryId?: string | undefined;
  department: string;
  phone: string;
  email: string;
};

/** Every invoice across every account, flattened for the department-wide
 * Invoices screen. Built from the exact same `buildAccountDetail` each
 * account's own "View Full Account" page uses — one source of truth, so an
 * invoice never reads differently in the two places it appears. */
export function buildAllInvoices(
  accounts: BillingAccount[] = BILLING_ACCOUNTS,
): InvoiceWithAccount[] {
  return accounts.flatMap((account) =>
    buildAccountDetail(account).invoices.map((inv) => ({
      ...inv,
      patientName: account.patientName,
      mrn: account.mrn,
      secondaryId: account.secondaryId,
      department: account.department,
      phone: account.phone,
      email: account.email,
    })),
  );
}
