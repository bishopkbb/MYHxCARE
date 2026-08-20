'use client';

import {
  CalendarClock,
  CheckCircle2,
  CreditCard,
  Download,
  FileText,
  Filter,
  Info,
  PieChart,
  ReceiptText,
  RotateCcw,
  TrendingUp,
  Undo2,
  UserSearch,
  Wallet,
  XCircle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';

import { AnimatedDonutChart } from '@components/shared/AnimatedDonutChart';
import { FormDateInput } from '@components/shared/FormDateInput';
import { FormSelect } from '@components/shared/FormSelect';
import {
  ScrollableTable,
  TABLE_HEADER_BG,
  TABLE_HEADER_STICKY_CLASS,
} from '@components/shared/ScrollableTable';
import { Tooltip } from '@components/shared/Tooltip';
import { ROUTES } from '@/constants/routes';
import { useToast } from '@/hooks/useToast';
import { downloadCSV } from '@/utils/export';
import { formatCurrencyCompact, formatCurrencyWhole } from '@/utils/currency';
import { formatDateTime, watMonthStartTimestamp } from '@/utils/datetime';
import { BILLING_ACCOUNT_DEPARTMENTS } from '@/features/billing/__mocks__/billingAccountsFixtures';
import {
  buildAllPayments,
  buildAllRefunds,
  PAYMENT_METHODS,
  type PaymentWithAccount,
} from '@/features/billing/__mocks__/billingAccountDetailFixtures';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

const METHOD_COLORS: Record<string, string> = {
  'Bank Transfer': '#2563EB',
  POS: '#00B4D8',
  Online: '#D97706',
  Card: '#7C3AED',
  Cash: '#16A34A',
};

const DEPARTMENT_COLORS: Record<string, string> = {
  Laboratory: '#2563EB',
  Pharmacy: '#16A34A',
  Consultation: '#D97706',
  Emergency: '#DC2626',
  Ward: '#7C3AED',
  'Other Services': '#8A98A3',
};

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

type ReportsTab =
  'overview' | 'transactions' | 'methods' | 'payers' | 'trends' | 'reconciliation' | 'history';
const TABS: { key: ReportsTab; label: string; href?: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'transactions', label: 'Transactions', href: ROUTES.billingPayments },
  { key: 'methods', label: 'Payment Methods' },
  { key: 'payers', label: 'Payers' },
  { key: 'trends', label: 'Trends' },
  { key: 'reconciliation', label: 'Reconciliation', href: ROUTES.billingReconciliation },
  { key: 'history', label: 'Export History' },
];

type AvailableReport = {
  id: string;
  icon: LucideIcon;
  accent: string;
  name: string;
  description: string;
};
const AVAILABLE_REPORTS: AvailableReport[] = [
  {
    id: 'summary',
    icon: FileText,
    accent: '#2563EB',
    name: 'Payment Summary Report',
    description: 'Summary of payments received within the selected date range.',
  },
  {
    id: 'method',
    icon: CreditCard,
    accent: '#00B4D8',
    name: 'Payment Method Report',
    description: 'Detailed breakdown of payments by method.',
  },
  {
    id: 'payer',
    icon: UserSearch,
    accent: '#7C3AED',
    name: 'Payer Report',
    description: 'Payments analysis by individual payer.',
  },
  {
    id: 'daily',
    icon: CalendarClock,
    accent: '#16A34A',
    name: 'Daily Payment Report',
    description: 'Day-by-day breakdown of payments.',
  },
  {
    id: 'failed',
    icon: XCircle,
    accent: '#DC2626',
    name: 'Failed Payments Report',
    description: 'Details of all failed or unsuccessful payments.',
  },
  {
    id: 'refunds',
    icon: Undo2,
    accent: '#D97706',
    name: 'Refunds Report',
    description: 'Summary of all refunds issued.',
  },
];

function toDateInputValue(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Returns null (→ "not enough data" caption) when the previous period has
// too little volume for a fair delta — same guard as BillingReportsWorkspace.
function pctDelta(current: number, previous: number): number | null {
  if (previous <= 0) return current > 0 ? null : 0;
  const delta = Math.round(((current - previous) / previous) * 1000) / 10;
  return Math.abs(delta) > 300 ? null : delta;
}

function InfoTip({ text }: { text: string }) {
  return (
    <Tooltip content={text}>
      <Info style={{ width: 14, height: 14, color: '#8A98A3' }} />
    </Tooltip>
  );
}

// ── Payments Over Time — dual-axis chart: light-blue bars for Amount (₦, left
// axis) behind a green line+dots for Transaction count (right axis). Adapted
// from BillingReportsWorkspace's BillingTrendChart, but that one only ever
// needed a single shared axis — this mockup pairs an amount series with a
// count series that live on very different scales, so both axes are
// computed and drawn independently.
type OverTimePoint = { shortLabel: string; label: string; amount: number; count: number };

function PaymentsOverTimeChart({ data }: { data: OverTimePoint[] }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const maxAmount = Math.max(...data.map((d) => d.amount), 1);
  const niceMaxAmount = Math.ceil(maxAmount / 100_000) * 100_000 || 100_000;
  const amountTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * niceMaxAmount);

  const maxCount = Math.max(...data.map((d) => d.count), 1);
  // Rounding up to a multiple of 4 (not just any "nice" step) guarantees the
  // quarter-ticks below are always whole transaction counts, never fractions
  // like 18.75.
  const niceMaxCount = Math.ceil(maxCount / 4) * 4 || 4;
  const countTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * niceMaxCount);

  const W = 900;
  const H = 220;
  const stepX = data.length > 1 ? W / (data.length - 1) : 0;
  const barWidth = Math.min(64, stepX * 0.42);

  const linePoints = data.map((d, i) => ({
    x: data.length > 1 ? i * stepX : W / 2,
    y: H - (d.count / niceMaxCount) * H,
  }));
  const lineD = linePoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  function handleMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * W;
    setHoverIdx(Math.max(0, Math.min(data.length - 1, Math.round(relX / (stepX || 1)))));
  }

  const hovered = hoverIdx !== null ? data[hoverIdx] : null;
  const hoveredX = hoverIdx !== null ? linePoints[hoverIdx]?.x : null;

  return (
    <div className="mt-2 flex gap-3" style={{ height: 260 }}>
      <div className="flex shrink-0 flex-col justify-between pb-6 text-right" style={{ width: 56 }}>
        {[...amountTicks].reverse().map((t) => (
          <span key={t} className="font-sans" style={{ fontSize: 14, color: '#8A98A3' }}>
            {t === 0 ? '₦0' : formatCurrencyCompact(t)}
          </span>
        ))}
      </div>
      <div className="relative min-w-0 flex-1">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="absolute inset-x-0 top-0 cursor-crosshair"
          style={{ height: 'calc(100% - 24px)', width: '100%' }}
          onMouseMove={handleMove}
          onMouseLeave={() => setHoverIdx(null)}
        >
          {data.map((d, i) => {
            const x = (data.length > 1 ? i * stepX : W / 2) - barWidth / 2;
            const barH = (d.amount / niceMaxAmount) * H;
            return (
              <rect
                key={`bar-${i}`}
                x={x}
                y={H - barH}
                width={barWidth}
                height={barH}
                fill="rgba(37,99,235,0.16)"
              />
            );
          })}
          <path
            d={lineD}
            fill="none"
            stroke="#16A34A"
            strokeWidth={2.5}
            vectorEffect="non-scaling-stroke"
          />
          {hoveredX !== null && hoveredX !== undefined && (
            <line
              x1={hoveredX}
              y1={0}
              x2={hoveredX}
              y2={H}
              stroke="rgba(0,100,130,0.25)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          )}
          {linePoints.map((p, i) => (
            <circle
              key={`pt-${i}`}
              cx={p.x}
              cy={p.y}
              r={hoverIdx === i ? 5 : 3}
              fill="#16A34A"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
        {hovered && hoveredX !== null && hoveredX !== undefined && (
          <div
            className="pointer-events-none absolute z-10 rounded-[10px] px-3 py-2 whitespace-nowrap"
            style={{
              left: `${(hoveredX / W) * 100}%`,
              top: 0,
              transform: 'translateX(-50%)',
              background: '#0D2630',
              boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
            }}
          >
            <p style={{ fontSize: 14, color: '#B8D8E0' }}>{hovered.label}</p>
            <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#93C5FD' }}>
              Amount: {formatCurrencyWhole(hovered.amount)}
            </p>
            <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#86EFAC' }}>
              Transactions: {hovered.count}
            </p>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 flex justify-between" style={{ height: 24 }}>
          {data.map((d, i) => (
            <span
              key={i}
              className="font-sans whitespace-nowrap"
              style={{ fontSize: 14, color: '#8A98A3' }}
            >
              {d.shortLabel}
            </span>
          ))}
        </div>
      </div>
      <div className="flex shrink-0 flex-col justify-between pb-6 text-left" style={{ width: 40 }}>
        {[...countTicks].reverse().map((t) => (
          <span key={t} className="font-sans" style={{ fontSize: 14, color: '#8A98A3' }}>
            {Math.round(t)}
          </span>
        ))}
      </div>
    </div>
  );
}

function inPeriod(
  p: PaymentWithAccount,
  start: number,
  end: number,
  department: string,
  method: string,
): boolean {
  const t = new Date(p.date).getTime();
  if (t < start || t > end) return false;
  if (department && p.department !== department) return false;
  if (method && p.method !== method) return false;
  return true;
}

export function PaymentReportsWorkspace() {
  const router = useRouter();
  const toast = useToast();
  const [now] = useState(() => Date.now());
  const [allPayments] = useState<PaymentWithAccount[]>(() => buildAllPayments());
  const [allRefunds] = useState(() => buildAllRefunds());

  const defaultFrom = toDateInputValue(new Date(watMonthStartTimestamp(0)));
  const defaultTo = toDateInputValue(new Date(now));

  const [draftFrom, setDraftFrom] = useState(defaultFrom);
  const [draftTo, setDraftTo] = useState(defaultTo);
  const [draftReportType, setDraftReportType] = useState('');
  const [draftDepartment, setDraftDepartment] = useState('');
  const [draftService, setDraftService] = useState('');
  const [draftMethod, setDraftMethod] = useState('');

  const [appliedFrom, setAppliedFrom] = useState(defaultFrom);
  const [appliedTo, setAppliedTo] = useState(defaultTo);
  const [appliedDepartment, setAppliedDepartment] = useState('');
  const [appliedMethod, setAppliedMethod] = useState('');

  function applyFilters() {
    setAppliedFrom(draftFrom);
    setAppliedTo(draftTo);
    setAppliedDepartment(draftDepartment);
    setAppliedMethod(draftMethod);
  }
  function resetFilters() {
    setDraftFrom(defaultFrom);
    setDraftTo(defaultTo);
    setDraftReportType('');
    setDraftDepartment('');
    setDraftService('');
    setDraftMethod('');
    setAppliedFrom(defaultFrom);
    setAppliedTo(defaultTo);
    setAppliedDepartment('');
    setAppliedMethod('');
  }

  const rangeStart = appliedFrom ? new Date(appliedFrom).getTime() : watMonthStartTimestamp(0);
  const rangeEnd = appliedTo ? new Date(appliedTo).getTime() + DAY_MS - 1 : now;
  const periodLength = Math.max(DAY_MS, rangeEnd - rangeStart);
  const prevStart = rangeStart - periodLength;
  const prevEnd = rangeStart - 1;

  const periodPayments = useMemo(
    () =>
      allPayments.filter((p) =>
        inPeriod(p, rangeStart, rangeEnd, appliedDepartment, appliedMethod),
      ),
    [allPayments, rangeStart, rangeEnd, appliedDepartment, appliedMethod],
  );
  const prevPeriodPayments = useMemo(
    () =>
      allPayments.filter((p) => inPeriod(p, prevStart, prevEnd, appliedDepartment, appliedMethod)),
    [allPayments, prevStart, prevEnd, appliedDepartment, appliedMethod],
  );

  const sum = (list: { amount: number }[]) => list.reduce((s, x) => s + x.amount, 0);

  // ── Failed Payments — no real payment-gateway failure log exists in this
  // codebase yet (every PaymentRecord in the fixtures represents money that
  // was actually collected). Rather than fabricate a fake success/fail field
  // on real transactions, Failed Payments is a deterministic, clearly-scoped
  // placeholder proportional to real successful volume, kept out of every
  // other screen's totals (Payments, Reconciliation, Revenue Overview all
  // stay untouched). Swapped for a real gateway-failure feed in Phase 6.
  function failedStatsFor(payments: PaymentWithAccount[], start: number, end: number) {
    const successfulAmount = sum(payments);
    const rand = mulberry32(hashSeed(`payment-reports-failed-${start}-${end}`));
    const ratio = 0.018 + rand() * 0.018;
    const failedAmount = Math.round(successfulAmount * ratio);
    const failedCount = payments.length > 0 ? Math.max(1, Math.round(payments.length * ratio)) : 0;
    return { failedAmount, failedCount };
  }

  const successfulAmount = sum(periodPayments);
  const prevSuccessfulAmount = sum(prevPeriodPayments);
  const { failedAmount, failedCount } = failedStatsFor(periodPayments, rangeStart, rangeEnd);
  const { failedAmount: prevFailedAmount } = failedStatsFor(prevPeriodPayments, prevStart, prevEnd);

  const refundsAmount = allRefunds
    .filter((r) => {
      const t = new Date(r.date).getTime();
      return r.status === 'Processed' && t >= rangeStart && t <= rangeEnd;
    })
    .reduce((s, r) => s + r.amount, 0);
  const prevRefundsAmount = allRefunds
    .filter((r) => {
      const t = new Date(r.date).getTime();
      return r.status === 'Processed' && t >= prevStart && t <= prevEnd;
    })
    .reduce((s, r) => s + r.amount, 0);

  const totalPayments = successfulAmount + failedAmount + refundsAmount;
  const prevTotalPayments = prevSuccessfulAmount + prevFailedAmount + prevRefundsAmount;
  const successRate = totalPayments > 0 ? (successfulAmount / totalPayments) * 100 : 0;
  const prevSuccessRate =
    prevTotalPayments > 0 ? (prevSuccessfulAmount / prevTotalPayments) * 100 : 0;
  const avgPayment = periodPayments.length > 0 ? successfulAmount / periodPayments.length : 0;
  const prevAvgPayment =
    prevPeriodPayments.length > 0 ? prevSuccessfulAmount / prevPeriodPayments.length : 0;
  const netPayments = successfulAmount - refundsAmount;
  const totalTransactions = periodPayments.length + failedCount;
  const highestPayment = periodPayments.reduce((m, p) => Math.max(m, p.amount), 0);
  const lowestPayment = periodPayments.reduce(
    (m, p) => Math.min(m, p.amount),
    periodPayments[0]?.amount ?? 0,
  );

  const statCards: {
    icon: LucideIcon;
    label: string;
    value: string;
    caption: string;
    captionColor: string;
    accent: string;
  }[] = [
    {
      icon: Wallet,
      label: 'Total Payments',
      value: formatCurrencyWhole(totalPayments),
      caption: (() => {
        const d = pctDelta(totalPayments, prevTotalPayments);
        return d === null
          ? 'Not enough data to compare'
          : `${d >= 0 ? '↑' : '↓'} ${Math.abs(d)}% vs prior period`;
      })(),
      captionColor: (() => {
        const d = pctDelta(totalPayments, prevTotalPayments);
        return d === null ? '#8A98A3' : d >= 0 ? '#16A34A' : '#DC2626';
      })(),
      accent: '#2563EB',
    },
    {
      icon: CheckCircle2,
      label: 'Successful Payments',
      value: formatCurrencyWhole(successfulAmount),
      caption: `${totalPayments > 0 ? ((successfulAmount / totalPayments) * 100).toFixed(1) : '0.0'}% of total`,
      captionColor: '#8A98A3',
      accent: '#16A34A',
    },
    {
      icon: XCircle,
      label: 'Failed Payments',
      value: formatCurrencyWhole(failedAmount),
      caption: `${totalPayments > 0 ? ((failedAmount / totalPayments) * 100).toFixed(1) : '0.0'}% of total`,
      captionColor: '#8A98A3',
      accent: '#DC2626',
    },
    {
      icon: Undo2,
      label: 'Refunds Issued',
      value: formatCurrencyWhole(refundsAmount),
      caption: `${totalPayments > 0 ? ((refundsAmount / totalPayments) * 100).toFixed(1) : '0.0'}% of total`,
      captionColor: '#8A98A3',
      accent: '#D97706',
    },
    {
      icon: ReceiptText,
      label: 'Average Payment',
      value: formatCurrencyWhole(Math.round(avgPayment)),
      caption: (() => {
        const d = pctDelta(avgPayment, prevAvgPayment);
        return d === null
          ? 'Not enough data to compare'
          : `${d >= 0 ? '↑' : '↓'} ${Math.abs(d)}% vs prior period`;
      })(),
      captionColor: (() => {
        const d = pctDelta(avgPayment, prevAvgPayment);
        return d === null ? '#8A98A3' : d >= 0 ? '#16A34A' : '#DC2626';
      })(),
      accent: '#00B4D8',
    },
    {
      icon: PieChart,
      label: 'Payment Success Rate',
      value: `${successRate.toFixed(1)}%`,
      caption: (() => {
        const d = pctDelta(successRate, prevSuccessRate);
        return d === null
          ? 'Not enough data to compare'
          : `${d >= 0 ? '↑' : '↓'} ${Math.abs(d)}% vs prior period`;
      })(),
      captionColor: (() => {
        const d = pctDelta(successRate, prevSuccessRate);
        return d === null ? '#8A98A3' : d >= 0 ? '#16A34A' : '#DC2626';
      })(),
      accent: '#7C3AED',
    },
  ];

  // ── Payments Over Time — fixed trailing 5-week window ending "now",
  // independent of the applied date filter, matching BillingTrendChart's
  // rolling-trend convention.
  const trendData: OverTimePoint[] = useMemo(() => {
    const weekStart = Math.floor(now / WEEK_MS) * WEEK_MS - 2 * WEEK_MS;
    return Array.from({ length: 5 }, (_, i) => {
      const start = weekStart + i * WEEK_MS;
      const end = start + WEEK_MS - 1;
      const label = `${new Date(start).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} - ${new Date(end).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`;
      const shortLabel = new Date(start).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
      });
      const payWeek = allPayments.filter((p) => {
        const t = new Date(p.date).getTime();
        return t >= start && t <= end;
      });
      return { label, shortLabel, amount: sum(payWeek), count: payWeek.length };
    });
  }, [allPayments, now]);

  // ── Payment Methods Breakdown
  const methodBreakdown = PAYMENT_METHODS.map((m) => ({
    method: m,
    amount: periodPayments.filter((p) => p.method === m).reduce((s, p) => s + p.amount, 0),
    color: METHOD_COLORS[m] ?? '#8A98A3',
  })).filter((m) => m.amount > 0);

  // ── Payments by Department
  const departmentBreakdown = BILLING_ACCOUNT_DEPARTMENTS.map((d) => ({
    department: d,
    amount: periodPayments.filter((p) => p.department === d).reduce((s, p) => s + p.amount, 0),
  }))
    .filter((d) => d.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  const deptMax = Math.max(...departmentBreakdown.map((d) => d.amount), 1);

  // ── Top Payment Transactions
  const topTransactions = [...periodPayments].sort((a, b) => b.amount - a.amount).slice(0, 5);

  const departmentOptions = BILLING_ACCOUNT_DEPARTMENTS.map((d) => ({ value: d, label: d }));
  const methodOptions = PAYMENT_METHODS.map((m) => ({ value: m, label: m }));
  const reportTypeOptions = [
    { value: 'Payment Summary', label: 'Payment Summary' },
    { value: 'Payment Method', label: 'Payment Method' },
    { value: 'Payer', label: 'Payer' },
    { value: 'Failed Payments', label: 'Failed Payments' },
  ];

  function handleExport() {
    downloadCSV('payment-reports-overview', [
      ['Section', 'Label', 'Amount / Count', 'Detail'],
      ...statCards.map((s) => ['Stat', s.label, s.value, s.caption]),
      ...methodBreakdown.map((m) => ['Payment Methods Breakdown', m.method, String(m.amount), '']),
      ...departmentBreakdown.map((d) => [
        'Payments by Department',
        d.department,
        String(d.amount),
        '',
      ]),
      ...topTransactions.map((p) => [
        'Top Payment Transaction',
        p.paymentNumber,
        String(p.amount),
        `${p.patientName} — ${p.method} — ${p.invoiceNumber}`,
      ]),
    ]);
    toast.success('Export ready', 'Payment Reports overview exported as CSV.');
  }
  function handleSchedule() {
    toast.info('Schedule Report', 'This feature is on the roadmap and not yet available.');
  }
  function handleTabClick(tab: (typeof TABS)[number]) {
    if (tab.href) {
      router.push(tab.href);
      return;
    }
    toast.info(tab.label, 'This report view is on the roadmap and not yet available.');
  }
  function handleViewReport(report: AvailableReport) {
    toast.info(report.name, 'Report generation is on the roadmap and not yet available.');
  }

  const hasDraftFilters =
    draftFrom !== defaultFrom ||
    draftTo !== defaultTo ||
    draftReportType ||
    draftDepartment ||
    draftService ||
    draftMethod;

  return (
    <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
      <div className="mx-auto max-w-[1550px] px-4 py-4 sm:px-6 sm:py-5">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-display font-bold" style={{ fontSize: 24, color: '#0D2630' }}>
              Payment Reports
            </h1>
            <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
              Analyze payment transactions and performance metrics
            </p>
          </div>
        </div>

        {/* Tabs + Schedule/Export */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div
            className="flex flex-wrap items-center gap-1 rounded-[10px] p-1"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => handleTabClick(t)}
                className={`rounded-[8px] px-3.5 py-2 font-sans font-medium transition-colors duration-150 ${FOCUS_RING}`}
                style={{
                  fontSize: 14,
                  whiteSpace: 'nowrap',
                  color: t.key === 'overview' ? '#FFFFFF' : '#4A7080',
                  background: t.key === 'overview' ? '#00B4D8' : 'transparent',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleSchedule}
              className={`flex h-11 items-center gap-1.5 rounded-[10px] px-3.5 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
              style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
            >
              <CalendarClock style={{ width: 15, height: 15 }} />
              Schedule Report
            </button>
            <button
              type="button"
              onClick={handleExport}
              className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
              style={{ fontSize: 14, background: '#00B4D8' }}
            >
              <Download style={{ width: 15, height: 15 }} />
              Export
            </button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          {statCards.map((s) => (
            <div
              key={s.label}
              className="flex items-start gap-3 rounded-[12px] p-4"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <div
                className="flex size-11 shrink-0 items-center justify-center rounded-full"
                style={{ background: `${s.accent}1A` }}
              >
                <s.icon style={{ width: 20, height: 20, color: s.accent }} />
              </div>
              <div className="min-w-0">
                <p style={{ fontSize: 14, color: '#8A98A3' }}>{s.label}</p>
                <p className="font-display font-bold" style={{ fontSize: 20, color: '#0D2630' }}>
                  {s.value}
                </p>
                <p
                  className="font-sans font-medium"
                  style={{ fontSize: 14, color: s.captionColor }}
                >
                  {s.caption}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div
          className="mt-4 rounded-[12px] p-4 sm:p-5"
          style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label
                className="mb-1.5 block font-sans font-medium"
                style={{ fontSize: 14, color: '#0D2630' }}
              >
                Report Type
              </label>
              <FormSelect
                id="payment-reports-type"
                value={draftReportType}
                onChange={setDraftReportType}
                options={reportTypeOptions}
                placeholder="All Reports"
              />
            </div>
            <div>
              <label
                className="mb-1.5 block font-sans font-medium"
                style={{ fontSize: 14, color: '#0D2630' }}
              >
                Department
              </label>
              <FormSelect
                id="payment-reports-department"
                value={draftDepartment}
                onChange={setDraftDepartment}
                options={departmentOptions}
                placeholder="All Departments"
              />
            </div>
            <div>
              <label
                className="mb-1.5 block font-sans font-medium"
                style={{ fontSize: 14, color: '#0D2630' }}
              >
                Payment Method
              </label>
              <FormSelect
                id="payment-reports-method"
                value={draftMethod}
                onChange={setDraftMethod}
                options={methodOptions}
                placeholder="All Methods"
              />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-end gap-2.5">
            <div>
              <label
                className="mb-1.5 block font-sans font-medium"
                style={{ fontSize: 14, color: '#0D2630' }}
              >
                Date Range
              </label>
              <div className="flex items-center gap-2">
                <FormDateInput
                  value={draftFrom}
                  onChange={(e) => setDraftFrom(e.target.value)}
                  aria-label="From date"
                />
                <span style={{ fontSize: 14, color: '#8A98A3' }}>–</span>
                <FormDateInput
                  value={draftTo}
                  onChange={(e) => setDraftTo(e.target.value)}
                  aria-label="To date"
                />
              </div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2.5">
            {hasDraftFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className={`flex h-11 items-center gap-1.5 rounded-[10px] px-3.5 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
              >
                <RotateCcw style={{ width: 15, height: 15 }} />
                Reset Filters
              </button>
            )}
            <div className="ml-auto">
              <button
                type="button"
                onClick={applyFilters}
                className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                style={{ fontSize: 14, background: '#00B4D8' }}
              >
                <Filter style={{ width: 15, height: 15 }} />
                Apply Filters
              </button>
            </div>
          </div>
        </div>

        {/* Payments Over Time + Payment Methods Breakdown */}
        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_380px] xl:items-start">
          <div
            className="rounded-[12px] p-4 sm:p-5"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <h2
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Payments Over Time
                </h2>
                <InfoTip text="Amount collected (bars, left axis) and transaction count (line, right axis) over the last 5 weeks, from real payments." />
              </div>
              <div className="flex flex-wrap gap-2.5">
                <div className="flex items-center gap-1.5">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ background: 'rgba(37,99,235,0.5)' }}
                  />
                  <span style={{ fontSize: 14, color: '#4A7080' }}>Amount (₦)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ background: '#16A34A' }}
                  />
                  <span style={{ fontSize: 14, color: '#4A7080' }}>Transactions</span>
                </div>
              </div>
            </div>
            <PaymentsOverTimeChart data={trendData} />
          </div>

          <div
            className="rounded-[12px] p-4 sm:p-5"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
              Payment Methods Breakdown
            </h2>
            {methodBreakdown.length === 0 ? (
              <p className="mt-4" style={{ fontSize: 14, color: '#8A98A3' }}>
                No payments for the current filters.
              </p>
            ) : (
              <>
                <div className="mt-3 flex items-center justify-center">
                  <AnimatedDonutChart
                    breakdown={methodBreakdown.map((m) => ({
                      label: m.method,
                      value: m.amount,
                      color: m.color,
                    }))}
                    total={successfulAmount}
                    size={140}
                    ariaLabel="Payment methods breakdown donut chart"
                    centerValue={formatCurrencyCompact(successfulAmount)}
                    centerLabel="Total"
                  />
                </div>
                <div className="mt-3 flex flex-col gap-2">
                  {methodBreakdown.map((m) => (
                    <div key={m.method} className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <span
                          className="size-2 shrink-0 rounded-full"
                          style={{ background: m.color }}
                        />
                        <span className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                          {m.method}
                        </span>
                      </div>
                      <span
                        className="shrink-0 font-sans font-medium whitespace-nowrap"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {formatCurrencyWhole(m.amount)}
                      </span>
                      <span className="shrink-0" style={{ fontSize: 14, color: '#8A98A3' }}>
                        ({((m.amount / (successfulAmount || 1)) * 100).toFixed(1)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Top Payment Transactions — full-width row */}
        <div
          className="mt-4 rounded-[12px] p-4 sm:p-5"
          style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
        >
          <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
            Top Payment Transactions
          </h2>
          {topTransactions.length === 0 ? (
            <p className="mt-4" style={{ fontSize: 14, color: '#8A98A3' }}>
              No payments for the current filters.
            </p>
          ) : (
            <div className="mt-3">
              <ScrollableTable minWidth={860}>
                <div
                  className={`flex rounded-t-[8px] ${TABLE_HEADER_STICKY_CLASS}`}
                  style={{ background: TABLE_HEADER_BG, borderBottom: '1px solid #E6F8FD' }}
                >
                  <div className="w-8 shrink-0 py-2.5 pr-2 pl-3">
                    <span
                      className="font-sans font-bold tracking-wider uppercase"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      #
                    </span>
                  </div>
                  <div className="w-36 shrink-0 py-2.5 pr-3">
                    <span
                      className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      Payment Ref.
                    </span>
                  </div>
                  <div className="max-w-[220px] min-w-[140px] flex-1 py-2.5 pr-3">
                    <span
                      className="font-sans font-bold tracking-wider uppercase"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      Payer
                    </span>
                  </div>
                  <div className="w-32 shrink-0 py-2.5 pr-3">
                    <span
                      className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      Invoice No.
                    </span>
                  </div>
                  <div className="w-40 shrink-0 py-2.5 pr-3">
                    <span
                      className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      Payment Date
                    </span>
                  </div>
                  <div className="w-32 shrink-0 py-2.5 pr-3">
                    <span
                      className="font-sans font-bold tracking-wider uppercase"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      Method
                    </span>
                  </div>
                  <div className="w-32 shrink-0 py-2.5 pr-3 text-right">
                    <span
                      className="font-sans font-bold tracking-wider uppercase"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      Amount
                    </span>
                  </div>
                  <div className="w-28 shrink-0 py-2.5 pr-4 text-center">
                    <span
                      className="font-sans font-bold tracking-wider uppercase"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      Status
                    </span>
                  </div>
                </div>
                {topTransactions.map((p, i) => (
                  <div
                    key={p.id}
                    className="flex items-center transition-colors duration-100 hover:bg-[#F5FBFD]"
                    style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                  >
                    <div className="w-8 shrink-0 py-3 pr-2 pl-3">
                      <p style={{ fontSize: 14, color: '#8A98A3' }}>{i + 1}</p>
                    </div>
                    <div className="w-36 shrink-0 py-3 pr-3">
                      <p className="truncate" style={{ fontSize: 14, color: '#0D2630' }}>
                        {p.paymentNumber}
                      </p>
                    </div>
                    <div className="max-w-[220px] min-w-[140px] flex-1 py-3 pr-3">
                      <Tooltip content={p.patientName}>
                        <p
                          className="truncate font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {p.patientName}
                        </p>
                      </Tooltip>
                    </div>
                    <div className="w-32 shrink-0 py-3 pr-3">
                      <button
                        type="button"
                        onClick={() =>
                          router.push(`${ROUTES.billingInvoices}?mrn=${encodeURIComponent(p.mrn)}`)
                        }
                        className={`truncate font-sans font-medium hover:underline ${FOCUS_RING}`}
                        style={{ fontSize: 14, color: '#00B4D8' }}
                      >
                        {p.invoiceNumber}
                      </button>
                    </div>
                    <div className="w-40 shrink-0 py-3 pr-3">
                      <p style={{ fontSize: 14, color: '#4A7080' }}>{formatDateTime(p.date)}</p>
                    </div>
                    <div className="w-32 shrink-0 py-3 pr-3">
                      <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                        {p.method}
                      </p>
                    </div>
                    <div className="w-32 shrink-0 py-3 pr-3 text-right">
                      <p style={{ fontSize: 14, color: '#0D2630' }}>
                        {formatCurrencyWhole(p.amount)}
                      </p>
                    </div>
                    <div className="w-28 shrink-0 py-3 pr-4 text-center">
                      <span
                        className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium whitespace-nowrap"
                        style={{
                          fontSize: 14,
                          color: '#16A34A',
                          background: 'rgba(22,163,74,0.1)',
                        }}
                      >
                        Success
                      </span>
                    </div>
                  </div>
                ))}
              </ScrollableTable>
            </div>
          )}
          <button
            type="button"
            onClick={() => router.push(ROUTES.billingPayments)}
            className={`mt-3 font-sans font-medium transition-colors duration-150 hover:underline ${FOCUS_RING}`}
            style={{ fontSize: 14, color: '#00B4D8' }}
          >
            View all transactions →
          </button>
        </div>

        {/* Payments by Department + Summary */}
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-start">
          <div
            className="rounded-[12px] p-4 sm:p-6"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
              Payments by Department
            </h2>
            {departmentBreakdown.length === 0 ? (
              <p className="mt-4" style={{ fontSize: 14, color: '#8A98A3' }}>
                No payments for the current filters.
              </p>
            ) : (
              <div className="mt-4 flex flex-col gap-4">
                {departmentBreakdown.map((d) => (
                  <div key={d.department}>
                    <div className="flex items-center gap-3">
                      <span
                        className="min-w-0 flex-1 truncate font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {d.department}
                      </span>
                      <span
                        className="w-28 shrink-0 text-right font-sans font-semibold whitespace-nowrap"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {formatCurrencyWhole(d.amount)}
                      </span>
                      <span
                        className="w-14 shrink-0 text-right whitespace-nowrap"
                        style={{ fontSize: 14, color: '#8A98A3' }}
                      >
                        {((d.amount / (successfulAmount || 1)) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div
                      className="mt-1.5 h-1.5 overflow-hidden rounded-full"
                      style={{ background: '#F5FBFD' }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max(2, (d.amount / deptMax) * 100)}%`,
                          background: DEPARTMENT_COLORS[d.department] ?? '#00B4D8',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div
            className="rounded-[12px] p-4 sm:p-6"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
              Summary
            </h2>
            <div className="mt-4 flex flex-col gap-4">
              {[
                {
                  icon: Wallet,
                  label: 'Total Payments',
                  value: formatCurrencyWhole(totalPayments),
                  color: '#2563EB',
                },
                {
                  icon: CheckCircle2,
                  label: 'Successful Payments',
                  value: formatCurrencyWhole(successfulAmount),
                  color: '#16A34A',
                },
                {
                  icon: XCircle,
                  label: 'Failed Payments',
                  value: formatCurrencyWhole(failedAmount),
                  color: '#DC2626',
                },
                {
                  icon: Undo2,
                  label: 'Refunds Issued',
                  value: formatCurrencyWhole(refundsAmount),
                  color: '#D97706',
                },
                {
                  icon: TrendingUp,
                  label: 'Net Payments',
                  value: formatCurrencyWhole(netPayments),
                  color: '#7C3AED',
                },
                {
                  icon: ReceiptText,
                  label: 'Total Transactions',
                  value: totalTransactions.toLocaleString('en-NG'),
                  color: '#00B4D8',
                },
                {
                  icon: ReceiptText,
                  label: 'Average Payment',
                  value: formatCurrencyWhole(Math.round(avgPayment)),
                  color: '#2563EB',
                },
                {
                  icon: TrendingUp,
                  label: 'Highest Payment',
                  value: formatCurrencyWhole(highestPayment),
                  color: '#16A34A',
                },
                {
                  icon: TrendingUp,
                  label: 'Lowest Payment',
                  value: formatCurrencyWhole(lowestPayment),
                  color: '#8A98A3',
                },
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-3">
                  <row.icon style={{ width: 16, height: 16, color: row.color, flexShrink: 0 }} />
                  <span className="min-w-0 flex-1" style={{ fontSize: 14, color: '#4A7080' }}>
                    {row.label}
                  </span>
                  <span
                    className="shrink-0 font-sans font-semibold whitespace-nowrap"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Available Payment Reports */}
        <div
          className="mt-4 rounded-[12px] p-4 sm:p-5"
          style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
        >
          <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
            Available Payment Reports
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
            {AVAILABLE_REPORTS.map((r) => (
              <div
                key={r.id}
                className="flex flex-col rounded-[12px] p-4"
                style={{ background: '#F5FBFD', border: '1px solid rgba(0,100,130,0.1)' }}
              >
                <div
                  className="flex size-11 shrink-0 items-center justify-center rounded-full"
                  style={{ background: `${r.accent}1A` }}
                >
                  <r.icon style={{ width: 20, height: 20, color: r.accent }} />
                </div>
                <p
                  className="mt-3 font-sans font-semibold"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  {r.name}
                </p>
                <p className="mt-1 flex-1" style={{ fontSize: 14, color: '#8A98A3' }}>
                  {r.description}
                </p>
                <button
                  type="button"
                  onClick={() => handleViewReport(r)}
                  className={`mt-3 flex items-center gap-1 self-start font-sans font-medium transition-colors duration-150 hover:underline ${FOCUS_RING}`}
                  style={{ fontSize: 14, color: '#00B4D8' }}
                >
                  View Report →
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Footer note */}
        <div
          className="mt-4 flex items-center gap-2 rounded-[10px] px-4 py-3"
          style={{ background: '#E6F8FD' }}
        >
          <Info style={{ width: 16, height: 16, color: '#00B4D8', flexShrink: 0 }} />
          <p style={{ fontSize: 14, color: '#0D2630' }}>
            All amounts are in Nigerian Naira (₦) and inclusive of applicable taxes where
            applicable.
          </p>
        </div>

        <div className="h-4" />
      </div>
    </main>
  );
}
