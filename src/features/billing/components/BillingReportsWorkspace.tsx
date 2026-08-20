'use client';

import {
  AlertTriangle,
  CalendarClock,
  Download,
  Eye,
  FileText,
  Filter,
  Info,
  Mail,
  MoreVertical,
  PieChart,
  ReceiptText,
  RotateCcw,
  Wallet,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';

import { AnimatedDonutChart } from '@components/shared/AnimatedDonutChart';
import { FormDateInput } from '@components/shared/FormDateInput';
import { FormSelect } from '@components/shared/FormSelect';
import { RowMenuPortal } from '@components/shared/RowMenuPortal';
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
import { formatHumanDate, watMonthStartTimestamp } from '@/utils/datetime';
import { BILLING_ACCOUNT_DEPARTMENTS } from '@/features/billing/__mocks__/billingAccountsFixtures';
import {
  buildAllAdjustments,
  buildAllInvoices,
  buildAllPayments,
  buildAllRefunds,
  INVOICE_SERVICE_OPTIONS,
  PAYMENT_METHODS,
  type InvoiceStatus,
  type InvoiceWithAccount,
} from '@/features/billing/__mocks__/billingAccountDetailFixtures';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

const STATUS_CFG: Record<InvoiceStatus, { color: string; bg: string }> = {
  Draft: { color: '#4A7080', bg: 'rgba(74,112,128,0.1)' },
  Issued: { color: '#2563EB', bg: 'rgba(37,99,235,0.1)' },
  'Partially Paid': { color: '#D97706', bg: 'rgba(217,119,6,0.1)' },
  Paid: { color: '#16A34A', bg: 'rgba(22,163,74,0.1)' },
  Overdue: { color: '#DC2626', bg: 'rgba(220,38,38,0.1)' },
  Cancelled: { color: '#8A98A3', bg: 'rgba(138,152,163,0.12)' },
};

const DEPARTMENT_COLORS: Record<string, string> = {
  Laboratory: '#2563EB',
  Pharmacy: '#16A34A',
  Consultation: '#D97706',
  Emergency: '#DC2626',
  Ward: '#7C3AED',
  'Other Services': '#8A98A3',
};

type AgingBucket = '0-30' | '31-60' | '61-90' | '90+';
const BUCKET_LABEL: Record<AgingBucket, string> = {
  '0-30': '0 - 30 Days',
  '31-60': '31 - 60 Days',
  '61-90': '61 - 90 Days',
  '90+': '90+ Days',
};
const BUCKET_CFG: Record<AgingBucket, { color: string }> = {
  '0-30': { color: '#16A34A' },
  '31-60': { color: '#D97706' },
  '61-90': { color: '#7C3AED' },
  '90+': { color: '#DC2626' },
};
function bucketFor(daysOutstanding: number): AgingBucket {
  if (daysOutstanding <= 30) return '0-30';
  if (daysOutstanding <= 60) return '31-60';
  if (daysOutstanding <= 90) return '61-90';
  return '90+';
}

type ReportType = 'Billing Summary' | 'Outstanding Report' | 'Revenue Report' | 'Collection Report';
const REPORT_TYPE_OPTIONS: { value: ReportType; label: string }[] = [
  { value: 'Billing Summary', label: 'Billing Summary' },
  { value: 'Outstanding Report', label: 'Outstanding Report' },
  { value: 'Revenue Report', label: 'Revenue Report' },
  { value: 'Collection Report', label: 'Collection Report' },
];

type ReportsTab =
  'overview' | 'invoices' | 'payments' | 'outstanding' | 'ageing' | 'collections' | 'refunds';
const TABS: { key: ReportsTab; label: string; href?: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'invoices', label: 'Invoices', href: ROUTES.billingInvoices },
  { key: 'payments', label: 'Payments', href: ROUTES.billingPayments },
  { key: 'outstanding', label: 'Outstanding', href: ROUTES.billingOutstanding },
  { key: 'ageing', label: 'Ageing', href: ROUTES.billingOutstanding },
  { key: 'collections', label: 'Collections' },
  { key: 'refunds', label: 'Refunds', href: ROUTES.billingRefunds },
];

type RecentReport = {
  id: string;
  name: string;
  type: ReportType;
  hoursAgo: number;
  format: 'PDF' | 'Excel';
};

const RECENT_REPORTS: RecentReport[] = [
  {
    id: 'rr-1',
    name: 'Monthly Billing Summary - Aug 2026',
    type: 'Billing Summary',
    hoursAgo: 2,
    format: 'PDF',
  },
  {
    id: 'rr-2',
    name: 'Outstanding Accounts Aging Report',
    type: 'Outstanding Report',
    hoursAgo: 2.5,
    format: 'Excel',
  },
  {
    id: 'rr-3',
    name: 'Department Revenue Report',
    type: 'Revenue Report',
    hoursAgo: 26,
    format: 'PDF',
  },
  {
    id: 'rr-4',
    name: 'Collection Performance Report',
    type: 'Collection Report',
    hoursAgo: 26.5,
    format: 'Excel',
  },
  {
    id: 'rr-5',
    name: 'Weekly Billing Summary - Wk 33',
    type: 'Billing Summary',
    hoursAgo: 96,
    format: 'PDF',
  },
  {
    id: 'rr-6',
    name: 'Refunds & Adjustments Summary',
    type: 'Collection Report',
    hoursAgo: 170,
    format: 'Excel',
  },
];

function hoursAgoToDate(now: number, h: number): string {
  return new Date(now - h * 60 * 60 * 1000).toISOString();
}

function toDateInputValue(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Returns null (→ "not enough data" caption) when the previous period has
// too little volume for a fair delta — mirrors RevenueOverviewWorkspace's
// pctDelta so a near-zero denominator never reads as a bogus swing.
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

// ── Billing Trend — 3-series line chart (Billed/Collected/Outstanding),
// adapted from RevenueOverviewWorkspace's single-series RevenueAreaChart —
// file-local there too, no shared export, so this is a parallel build, not
// an import.
type TrendPoint = {
  label: string;
  shortLabel: string;
  billed: number;
  collected: number;
  outstanding: number;
};

function BillingTrendChart({ data }: { data: TrendPoint[] }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const max = Math.max(...data.flatMap((d) => [d.billed, d.collected, d.outstanding]), 1);
  const niceMax = Math.ceil(max / 100_000) * 100_000 || 100_000;
  const ticks = [0, niceMax * 0.25, niceMax * 0.5, niceMax * 0.75, niceMax];
  const W = 900;
  const H = 220;
  const stepX = data.length > 1 ? W / (data.length - 1) : 0;

  function seriesPoints(key: 'billed' | 'collected' | 'outstanding') {
    return data.map((d, i) => ({
      x: data.length > 1 ? i * stepX : W / 2,
      y: H - (d[key] / niceMax) * H,
    }));
  }
  function pathFor(points: { x: number; y: number }[]) {
    return points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(' ');
  }

  const billedPts = seriesPoints('billed');
  const collectedPts = seriesPoints('collected');
  const outstandingPts = seriesPoints('outstanding');

  const hovered = hoverIdx !== null ? data[hoverIdx] : null;
  const hoveredX = hoverIdx !== null ? billedPts[hoverIdx]?.x : null;

  function handleMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * W;
    setHoverIdx(Math.max(0, Math.min(data.length - 1, Math.round(relX / (stepX || 1)))));
  }

  return (
    <div className="mt-2 flex gap-3" style={{ height: 260 }}>
      <div className="flex shrink-0 flex-col justify-between pb-6 text-right" style={{ width: 52 }}>
        {[...ticks].reverse().map((t) => (
          <span key={t} className="font-sans" style={{ fontSize: 14, color: '#8A98A3' }}>
            {t === 0 ? '₦0' : formatCurrencyCompact(t)}
          </span>
        ))}
      </div>
      <div className="relative min-w-0 flex-1">
        <div className="absolute inset-x-0 top-0 flex" style={{ height: 'calc(100% - 24px)' }}>
          {data.map((_, i) => (
            <div
              key={i}
              className="h-full flex-1"
              style={{ background: i % 2 === 0 ? 'rgba(0,180,216,0.05)' : 'transparent' }}
            />
          ))}
        </div>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="absolute inset-x-0 top-0 cursor-crosshair"
          style={{ height: 'calc(100% - 24px)', width: '100%' }}
          onMouseMove={handleMove}
          onMouseLeave={() => setHoverIdx(null)}
        >
          <path
            d={pathFor(billedPts)}
            fill="none"
            stroke="#2563EB"
            strokeWidth={2.5}
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={pathFor(collectedPts)}
            fill="none"
            stroke="#16A34A"
            strokeWidth={2.5}
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={pathFor(outstandingPts)}
            fill="none"
            stroke="#D97706"
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
          {billedPts.map((p, i) => (
            <circle
              key={`b-${i}`}
              cx={p.x}
              cy={p.y}
              r={hoverIdx === i ? 5 : 3}
              fill="#2563EB"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {collectedPts.map((p, i) => (
            <circle
              key={`c-${i}`}
              cx={p.x}
              cy={p.y}
              r={hoverIdx === i ? 5 : 3}
              fill="#16A34A"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {outstandingPts.map((p, i) => (
            <circle
              key={`o-${i}`}
              cx={p.x}
              cy={p.y}
              r={hoverIdx === i ? 5 : 3}
              fill="#D97706"
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
              Billed: {formatCurrencyWhole(hovered.billed)}
            </p>
            <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#86EFAC' }}>
              Collected: {formatCurrencyWhole(hovered.collected)}
            </p>
            <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#FCD34D' }}>
              Outstanding: {formatCurrencyWhole(hovered.outstanding)}
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
    </div>
  );
}

function ReportRowMenu({
  open,
  onToggle,
  onDelete,
}: {
  open: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  return (
    <div className="relative flex items-center">
      <button
        ref={buttonRef}
        type="button"
        onClick={onToggle}
        aria-label="More actions"
        className={`flex size-9 shrink-0 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
      >
        <MoreVertical style={{ width: 16, height: 16, color: '#4A7080' }} />
      </button>
      <RowMenuPortal open={open} anchorRef={buttonRef} onClose={onToggle} width={170}>
        <button
          type="button"
          onClick={onDelete}
          className={`flex w-full items-center gap-2 px-3.5 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
          style={{ fontSize: 14, color: '#DC2626' }}
        >
          Delete Report
        </button>
      </RowMenuPortal>
    </div>
  );
}

function matchesInvoice(inv: InvoiceWithAccount, department: string, service: string): boolean {
  if (department && inv.department !== department) return false;
  if (service && inv.service !== service) return false;
  return true;
}

function matchesPayment(
  p: { department: string; method: string; invoiceNumber: string },
  department: string,
  method: string,
  service: string,
  invoices: InvoiceWithAccount[],
): boolean {
  if (department && p.department !== department) return false;
  if (method && p.method !== method) return false;
  if (service) {
    const inv = invoices.find((i) => i.invoiceNumber === p.invoiceNumber);
    if (inv?.service !== service) return false;
  }
  return true;
}

export function BillingReportsWorkspace() {
  const router = useRouter();
  const toast = useToast();
  const [now] = useState(() => Date.now());
  const [allInvoices] = useState<InvoiceWithAccount[]>(() => buildAllInvoices());
  const [allPayments] = useState(() => buildAllPayments());
  const [allRefunds] = useState(() => buildAllRefunds());
  const [allAdjustments] = useState(() => buildAllAdjustments());
  const [recentReports, setRecentReports] = useState<RecentReport[]>(RECENT_REPORTS);
  const [openReportMenuId, setOpenReportMenuId] = useState<string | null>(null);

  const defaultFrom = toDateInputValue(new Date(watMonthStartTimestamp(0)));
  const defaultTo = toDateInputValue(new Date(now));

  // Draft filters (editable) vs. applied filters (drive the numbers) — this
  // screen's mockup explicitly shows Apply/Reset Filters buttons, unlike the
  // instant-filter convention on Revenue Overview/Outstanding Accounts.
  const [draftFrom, setDraftFrom] = useState(defaultFrom);
  const [draftTo, setDraftTo] = useState(defaultTo);
  const [draftReportType, setDraftReportType] = useState('');
  const [draftDepartment, setDraftDepartment] = useState('');
  const [draftService, setDraftService] = useState('');
  const [draftMethod, setDraftMethod] = useState('');

  const [appliedFrom, setAppliedFrom] = useState(defaultFrom);
  const [appliedTo, setAppliedTo] = useState(defaultTo);
  const [appliedReportType, setAppliedReportType] = useState('');
  const [appliedDepartment, setAppliedDepartment] = useState('');
  const [appliedService, setAppliedService] = useState('');
  const [appliedMethod, setAppliedMethod] = useState('');

  function applyFilters() {
    setAppliedFrom(draftFrom);
    setAppliedTo(draftTo);
    setAppliedReportType(draftReportType);
    setAppliedDepartment(draftDepartment);
    setAppliedService(draftService);
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
    setAppliedReportType('');
    setAppliedDepartment('');
    setAppliedService('');
    setAppliedMethod('');
  }

  const rangeStart = appliedFrom ? new Date(appliedFrom).getTime() : watMonthStartTimestamp(0);
  const rangeEnd = appliedTo ? new Date(appliedTo).getTime() + DAY_MS - 1 : now;
  const periodLength = Math.max(DAY_MS, rangeEnd - rangeStart);
  const prevStart = rangeStart - periodLength;
  const prevEnd = rangeStart - 1;

  const periodInvoices = useMemo(
    () =>
      allInvoices.filter((inv) => {
        const t = new Date(inv.date).getTime();
        return (
          t >= rangeStart &&
          t <= rangeEnd &&
          inv.status !== 'Cancelled' &&
          matchesInvoice(inv, appliedDepartment, appliedService)
        );
      }),
    [allInvoices, rangeStart, rangeEnd, appliedDepartment, appliedService],
  );
  const prevPeriodInvoices = useMemo(
    () =>
      allInvoices.filter((inv) => {
        const t = new Date(inv.date).getTime();
        return (
          t >= prevStart &&
          t <= prevEnd &&
          inv.status !== 'Cancelled' &&
          matchesInvoice(inv, appliedDepartment, appliedService)
        );
      }),
    [allInvoices, prevStart, prevEnd, appliedDepartment, appliedService],
  );

  const periodPayments = useMemo(
    () =>
      allPayments.filter((p) => {
        const t = new Date(p.date).getTime();
        return (
          t >= rangeStart &&
          t <= rangeEnd &&
          matchesPayment(p, appliedDepartment, appliedMethod, appliedService, allInvoices)
        );
      }),
    [
      allPayments,
      allInvoices,
      rangeStart,
      rangeEnd,
      appliedDepartment,
      appliedMethod,
      appliedService,
    ],
  );
  const prevPeriodPayments = useMemo(
    () =>
      allPayments.filter((p) => {
        const t = new Date(p.date).getTime();
        return (
          t >= prevStart &&
          t <= prevEnd &&
          matchesPayment(p, appliedDepartment, appliedMethod, appliedService, allInvoices)
        );
      }),
    [
      allPayments,
      allInvoices,
      prevStart,
      prevEnd,
      appliedDepartment,
      appliedMethod,
      appliedService,
    ],
  );

  const sum = (list: { amount: number }[]) => list.reduce((s, x) => s + x.amount, 0);

  // ── Stat cards ────────────────────────────────────────────────────────
  const totalBilled = periodInvoices.reduce((s, inv) => s + inv.amount, 0);
  const prevTotalBilled = prevPeriodInvoices.reduce((s, inv) => s + inv.amount, 0);
  const totalCollected = sum(periodPayments);
  const prevTotalCollected = sum(prevPeriodPayments);
  const outstandingAmount = periodInvoices.reduce(
    (s, inv) => s + Math.max(0, inv.amount - inv.paid),
    0,
  );
  const prevOutstandingAmount = prevPeriodInvoices.reduce(
    (s, inv) => s + Math.max(0, inv.amount - inv.paid),
    0,
  );
  const overdueAmount = periodInvoices
    .filter((inv) => inv.amount - inv.paid > 0 && new Date(inv.dueDate).getTime() < now)
    .reduce((s, inv) => s + Math.max(0, inv.amount - inv.paid), 0);
  const prevOverdueAmount = prevPeriodInvoices
    .filter((inv) => inv.amount - inv.paid > 0 && new Date(inv.dueDate).getTime() < prevEnd)
    .reduce((s, inv) => s + Math.max(0, inv.amount - inv.paid), 0);
  const collectionRate = totalBilled > 0 ? (totalCollected / totalBilled) * 100 : 0;
  const prevCollectionRate = prevTotalBilled > 0 ? (prevTotalCollected / prevTotalBilled) * 100 : 0;

  const invoiceByNumber = useMemo(() => {
    const map = new Map<string, InvoiceWithAccount>();
    for (const inv of allInvoices) map.set(inv.invoiceNumber, inv);
    return map;
  }, [allInvoices]);
  function avgDaysToPay(payments: typeof periodPayments): number {
    const days = payments
      .map((p) => {
        const inv = invoiceByNumber.get(p.invoiceNumber);
        if (!inv) return null;
        return (new Date(p.date).getTime() - new Date(inv.date).getTime()) / DAY_MS;
      })
      .filter((d): d is number => d !== null && d >= 0);
    return days.length ? days.reduce((s, d) => s + d, 0) / days.length : 0;
  }
  const avgDays = avgDaysToPay(periodPayments);
  const prevAvgDays = avgDaysToPay(prevPeriodPayments);

  const statCards: {
    icon: LucideIcon;
    label: string;
    value: string;
    delta: number | null;
    goodWhenUp: boolean;
    accent: string;
  }[] = [
    {
      icon: FileText,
      label: 'Total Billed',
      value: formatCurrencyWhole(totalBilled),
      delta: pctDelta(totalBilled, prevTotalBilled),
      goodWhenUp: true,
      accent: '#2563EB',
    },
    {
      icon: Wallet,
      label: 'Total Collected',
      value: formatCurrencyWhole(totalCollected),
      delta: pctDelta(totalCollected, prevTotalCollected),
      goodWhenUp: true,
      accent: '#16A34A',
    },
    {
      icon: ReceiptText,
      label: 'Outstanding Amount',
      value: formatCurrencyWhole(outstandingAmount),
      delta: pctDelta(outstandingAmount, prevOutstandingAmount),
      goodWhenUp: false,
      accent: '#D97706',
    },
    {
      icon: AlertTriangle,
      label: 'Overdue Amount',
      value: formatCurrencyWhole(overdueAmount),
      delta: pctDelta(overdueAmount, prevOverdueAmount),
      goodWhenUp: false,
      accent: '#DC2626',
    },
    {
      icon: PieChart,
      label: 'Collection Rate',
      value: `${collectionRate.toFixed(1)}%`,
      delta: pctDelta(collectionRate, prevCollectionRate),
      goodWhenUp: true,
      accent: '#7C3AED',
    },
    {
      icon: CalendarClock,
      label: 'Average Days to Pay',
      value: `${Math.round(avgDays)} Days`,
      delta: pctDelta(avgDays, prevAvgDays),
      goodWhenUp: false,
      accent: '#00B4D8',
    },
  ];

  // ── Billing Trend — fixed trailing 5-week window ending "now", independent
  // of the applied date filter (matches the reference layout, which shows
  // weeks past the selected range's own end date — a rolling trend, not a
  // strict slice of the filtered period).
  const trendData: TrendPoint[] = useMemo(() => {
    const weekStart = Math.floor(now / WEEK_MS) * WEEK_MS - 2 * WEEK_MS;
    return Array.from({ length: 5 }, (_, i) => {
      const start = weekStart + i * WEEK_MS;
      const end = start + WEEK_MS - 1;
      const label = `${new Date(start).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} - ${new Date(end).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`;
      const shortLabel = new Date(start).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
      });
      const invWeek = allInvoices.filter((inv) => {
        const t = new Date(inv.date).getTime();
        return t >= start && t <= end && inv.status !== 'Cancelled';
      });
      const payWeek = allPayments.filter((p) => {
        const t = new Date(p.date).getTime();
        return t >= start && t <= end;
      });
      return {
        label,
        shortLabel,
        billed: invWeek.reduce((s, inv) => s + inv.amount, 0),
        collected: sum(payWeek),
        outstanding: invWeek.reduce((s, inv) => s + Math.max(0, inv.amount - inv.paid), 0),
      };
    });
  }, [allInvoices, allPayments, now]);

  // ── Revenue by Department donut
  const departmentBreakdown = BILLING_ACCOUNT_DEPARTMENTS.map((d) => ({
    department: d,
    amount: periodInvoices
      .filter((inv) => inv.department === d)
      .reduce((s, inv) => s + inv.amount, 0),
    color: DEPARTMENT_COLORS[d] ?? '#8A98A3',
  })).filter((d) => d.amount > 0);

  // ── Top Invoices
  const topInvoices = [...periodInvoices].sort((a, b) => b.amount - a.amount).slice(0, 5);

  // ── Aging Summary — bucketed over the same period-outstanding population
  // as the Outstanding Amount stat card, so the bucket totals foot to it.
  const agingRows = periodInvoices
    .filter((inv) => inv.amount - inv.paid > 0)
    .map((inv) => {
      const daysOutstanding = Math.max(
        0,
        Math.floor((now - new Date(inv.dueDate).getTime()) / DAY_MS),
      );
      return { balance: inv.amount - inv.paid, bucket: bucketFor(daysOutstanding) };
    });
  const bucketTotals: Record<AgingBucket, number> = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
  for (const r of agingRows) bucketTotals[r.bucket] += r.balance;

  // ── Report Summary
  const totalInvoicesCount = periodInvoices.length;
  const paidCount = periodInvoices.filter((inv) => inv.status === 'Paid').length;
  const unpaidCount = periodInvoices.filter(
    (inv) => inv.status === 'Issued' || inv.status === 'Overdue',
  ).length;
  const partiallyPaidCount = periodInvoices.filter((inv) => inv.status === 'Partially Paid').length;
  const creditNotesCount = allAdjustments.filter((a) => {
    const t = new Date(a.date).getTime();
    return t >= rangeStart && t <= rangeEnd;
  }).length;
  const refundsIssuedTotal = allRefunds
    .filter((r) => {
      const t = new Date(r.date).getTime();
      return r.status === 'Processed' && t >= rangeStart && t <= rangeEnd;
    })
    .reduce((s, r) => s + r.amount, 0);
  const pct = (n: number) =>
    totalInvoicesCount > 0 ? ((n / totalInvoicesCount) * 100).toFixed(1) : '0.0';

  // ── Recent Reports (filtered by Report Type)
  const filteredRecentReports = appliedReportType
    ? recentReports.filter((r) => r.type === appliedReportType)
    : recentReports;

  const departmentOptions = BILLING_ACCOUNT_DEPARTMENTS.map((d) => ({ value: d, label: d }));
  const serviceOptions = INVOICE_SERVICE_OPTIONS.map((s) => ({ value: s, label: s }));
  const methodOptions = PAYMENT_METHODS.map((m) => ({ value: m, label: m }));

  function handleExport() {
    downloadCSV('billing-reports-overview', [
      ['Section', 'Label', 'Amount / Count', 'Detail'],
      ...statCards.map((s) => ['Stat', s.label, s.value, s.delta === null ? '' : `${s.delta}%`]),
      ...departmentBreakdown.map((d) => [
        'Revenue by Department',
        d.department,
        String(d.amount),
        '',
      ]),
      ...topInvoices.map((inv) => [
        'Top Invoice',
        inv.invoiceNumber,
        String(inv.amount),
        `${inv.patientName} — ${inv.department} — ${inv.status}`,
      ]),
      ...(['0-30', '31-60', '61-90', '90+'] as AgingBucket[]).map((b) => [
        'Aging Summary',
        BUCKET_LABEL[b],
        String(bucketTotals[b]),
        '',
      ]),
    ]);
    toast.success('Export ready', 'Billing Reports overview exported as CSV.');
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
  function handleReportAction(
    label: string,
    report: RecentReport,
    kind: 'view' | 'download' | 'email',
  ) {
    if (kind === 'view') {
      toast.info(label, 'Report preview is on the roadmap and not yet available.');
      return;
    }
    if (kind === 'download') {
      downloadCSV(report.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), [
        ['Report Name', 'Report Type', 'Date Generated', 'Generated By', 'Format'],
        [
          report.name,
          report.type,
          formatHumanDate(hoursAgoToDate(now, report.hoursAgo)),
          'Accountant',
          report.format,
        ],
      ]);
      toast.success('Report downloaded', `${report.name} has been downloaded.`);
      return;
    }
    toast.success('Report emailed', `${report.name} has been emailed to your inbox.`);
  }
  function deleteReport(report: RecentReport) {
    setRecentReports((prev) => prev.filter((r) => r.id !== report.id));
    setOpenReportMenuId(null);
    toast.success('Report deleted', `${report.name} has been removed from Recent Reports.`);
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
              Billing Reports
            </h1>
            <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
              Comprehensive billing and collections insights for better decision making
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
          {statCards.map((s) => {
            const isUp = s.delta !== null && s.delta >= 0;
            const isGood = s.delta === null ? null : isUp === s.goodWhenUp;
            return (
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
                  {s.delta === null ? (
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>Not enough data to compare</p>
                  ) : (
                    <p
                      className="font-sans font-medium"
                      style={{ fontSize: 14, color: isGood ? '#16A34A' : '#DC2626' }}
                    >
                      {isUp ? '↑' : '↓'} {Math.abs(s.delta)}% vs prior period
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Filters */}
        <div
          className="mt-4 rounded-[12px] p-4 sm:p-5"
          style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label
                className="mb-1.5 block font-sans font-medium"
                style={{ fontSize: 14, color: '#0D2630' }}
              >
                Report Type
              </label>
              <FormSelect
                id="reports-type"
                value={draftReportType}
                onChange={setDraftReportType}
                options={REPORT_TYPE_OPTIONS}
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
                id="reports-department"
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
                Service
              </label>
              <FormSelect
                id="reports-service"
                value={draftService}
                onChange={setDraftService}
                options={serviceOptions}
                placeholder="All Services"
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
                id="reports-method"
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

        {/* Billing Trend + Revenue by Department */}
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
                  Billing Trend
                </h2>
                <InfoTip text="Billed, collected, and outstanding amounts over the last 5 weeks, from real invoices and payments." />
              </div>
              <div className="flex flex-wrap gap-2.5">
                {[
                  { label: 'Billed (₦)', color: '#2563EB' },
                  { label: 'Collected (₦)', color: '#16A34A' },
                  { label: 'Outstanding (₦)', color: '#D97706' },
                ].map((s) => (
                  <div key={s.label} className="flex items-center gap-1.5">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ background: s.color }}
                    />
                    <span style={{ fontSize: 14, color: '#4A7080' }}>{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <BillingTrendChart data={trendData} />
          </div>

          <div
            className="rounded-[12px] p-4 sm:p-5"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <h2
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Revenue by Department
                </h2>
                <InfoTip text="Breakdown of the selected period's billed revenue by department." />
              </div>
              <button
                type="button"
                onClick={() => router.push(ROUTES.billingRevenueByDepartment)}
                className={`font-sans font-medium transition-colors duration-150 hover:underline ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#00B4D8' }}
              >
                View Details
              </button>
            </div>
            {departmentBreakdown.length === 0 ? (
              <p className="mt-4" style={{ fontSize: 14, color: '#8A98A3' }}>
                No billed revenue for the current filters.
              </p>
            ) : (
              <>
                <div className="mt-3 flex items-center justify-center">
                  <AnimatedDonutChart
                    breakdown={departmentBreakdown.map((d) => ({
                      label: d.department,
                      value: d.amount,
                      color: d.color,
                    }))}
                    total={totalBilled}
                    size={140}
                    ariaLabel="Revenue by department donut chart"
                    centerValue={formatCurrencyCompact(totalBilled)}
                    centerLabel="Total Billed"
                  />
                </div>
                <div className="mt-3 flex flex-col gap-2">
                  {departmentBreakdown.map((d) => (
                    <div key={d.department} className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <span
                          className="size-2 shrink-0 rounded-full"
                          style={{ background: d.color }}
                        />
                        <span className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                          {d.department}
                        </span>
                      </div>
                      <span
                        className="shrink-0 font-sans font-medium whitespace-nowrap"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {formatCurrencyWhole(d.amount)}
                      </span>
                      <span className="shrink-0" style={{ fontSize: 14, color: '#8A98A3' }}>
                        {((d.amount / (totalBilled || 1)) * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Top Invoices — full-width row, room to breathe */}
        <div
          className="mt-4 rounded-[12px] p-4 sm:p-5"
          style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
        >
          <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
            Top Invoices
          </h2>
          {topInvoices.length === 0 ? (
            <p className="mt-4" style={{ fontSize: 14, color: '#8A98A3' }}>
              No invoices for the current filters.
            </p>
          ) : (
            <div className="mt-3">
              <ScrollableTable minWidth={720}>
                <div
                  className={`flex rounded-t-[8px] ${TABLE_HEADER_STICKY_CLASS}`}
                  style={{ background: TABLE_HEADER_BG, borderBottom: '1px solid #E6F8FD' }}
                >
                  <div className="w-32 shrink-0 py-2.5 pr-3 pl-3">
                    <span
                      className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      Invoice No.
                    </span>
                  </div>
                  <div className="max-w-[240px] min-w-[160px] flex-1 py-2.5 pr-3">
                    <span
                      className="font-sans font-bold tracking-wider uppercase"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      Patient
                    </span>
                  </div>
                  <div className="w-36 shrink-0 py-2.5 pr-3">
                    <span
                      className="font-sans font-bold tracking-wider uppercase"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      Department
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
                  <div className="w-32 shrink-0 py-2.5 pr-3 text-center">
                    <span
                      className="font-sans font-bold tracking-wider uppercase"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      Status
                    </span>
                  </div>
                </div>
                {topInvoices.map((inv) => {
                  const cfg = STATUS_CFG[inv.status];
                  return (
                    <div
                      key={inv.id}
                      className="flex items-center transition-colors duration-100 hover:bg-[#F5FBFD]"
                      style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                    >
                      <div className="w-32 shrink-0 py-3 pr-3 pl-3">
                        <button
                          type="button"
                          onClick={() =>
                            router.push(
                              `${ROUTES.billingInvoices}?mrn=${encodeURIComponent(inv.mrn)}`,
                            )
                          }
                          className={`truncate font-sans font-medium hover:underline ${FOCUS_RING}`}
                          style={{ fontSize: 14, color: '#00B4D8' }}
                        >
                          {inv.invoiceNumber}
                        </button>
                      </div>
                      <div className="max-w-[240px] min-w-[160px] flex-1 py-3 pr-3">
                        <Tooltip content={inv.patientName}>
                          <p className="truncate" style={{ fontSize: 14, color: '#0D2630' }}>
                            {inv.patientName}
                          </p>
                        </Tooltip>
                      </div>
                      <div className="w-36 shrink-0 py-3 pr-3">
                        <Tooltip content={inv.department}>
                          <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                            {inv.department}
                          </p>
                        </Tooltip>
                      </div>
                      <div className="w-32 shrink-0 py-3 pr-3 text-right">
                        <p style={{ fontSize: 14, color: '#0D2630' }}>
                          {formatCurrencyWhole(inv.amount)}
                        </p>
                      </div>
                      <div className="w-32 shrink-0 py-3 pr-3 text-center">
                        <span
                          className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium whitespace-nowrap"
                          style={{ fontSize: 14, color: cfg.color, background: cfg.bg }}
                        >
                          {inv.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </ScrollableTable>
            </div>
          )}
          <button
            type="button"
            onClick={() => router.push(ROUTES.billingInvoices)}
            className={`mt-3 font-sans font-medium transition-colors duration-150 hover:underline ${FOCUS_RING}`}
            style={{ fontSize: 14, color: '#00B4D8' }}
          >
            View all invoices →
          </button>
        </div>

        {/* Aging Summary + Report Summary */}
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-start">
          <div
            className="rounded-[12px] p-4 sm:p-6"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
              Aging Summary
            </h2>
            <div className="mt-4 flex flex-col">
              {(['0-30', '31-60', '61-90', '90+'] as AgingBucket[]).map((b) => (
                <div key={b} className="flex items-center gap-3 py-2.5">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ background: BUCKET_CFG[b].color }}
                    />
                    <span className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                      {BUCKET_LABEL[b]}
                    </span>
                  </div>
                  <span
                    className="w-28 shrink-0 text-right font-sans font-medium whitespace-nowrap"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    {formatCurrencyWhole(bucketTotals[b])}
                  </span>
                  <span
                    className="w-14 shrink-0 text-right whitespace-nowrap"
                    style={{ fontSize: 14, color: '#8A98A3' }}
                  >
                    {outstandingAmount > 0
                      ? ((bucketTotals[b] / outstandingAmount) * 100).toFixed(1)
                      : '0.0'}
                    %
                  </span>
                </div>
              ))}
            </div>
            <div
              className="mt-2 flex items-center gap-3"
              style={{ borderTop: '1px solid rgba(0,100,130,0.08)', paddingTop: 14 }}
            >
              <span
                className="min-w-0 flex-1 font-sans font-semibold"
                style={{ fontSize: 14, color: '#0D2630' }}
              >
                Total
              </span>
              <span
                className="w-28 shrink-0 text-right font-sans font-semibold whitespace-nowrap"
                style={{ fontSize: 14, color: '#0D2630' }}
              >
                {formatCurrencyWhole(outstandingAmount)}
              </span>
              <span
                className="w-14 shrink-0 text-right whitespace-nowrap"
                style={{ fontSize: 14, color: '#8A98A3' }}
              >
                100%
              </span>
            </div>
          </div>

          <div
            className="rounded-[12px] p-4 sm:p-6"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
              Report Summary
            </h2>
            <div className="mt-4 flex flex-col gap-4">
              {[
                {
                  icon: FileText,
                  label: 'Total Invoices',
                  value: totalInvoicesCount.toLocaleString('en-NG'),
                  color: '#2563EB',
                },
                {
                  icon: FileText,
                  label: 'Paid Invoices',
                  value: `${paidCount.toLocaleString('en-NG')} (${pct(paidCount)}%)`,
                  color: '#16A34A',
                },
                {
                  icon: FileText,
                  label: 'Unpaid Invoices',
                  value: `${unpaidCount.toLocaleString('en-NG')} (${pct(unpaidCount)}%)`,
                  color: '#DC2626',
                },
                {
                  icon: FileText,
                  label: 'Partially Paid',
                  value: `${partiallyPaidCount.toLocaleString('en-NG')} (${pct(partiallyPaidCount)}%)`,
                  color: '#D97706',
                },
                {
                  icon: ReceiptText,
                  label: 'Total Credit Notes',
                  value: creditNotesCount.toLocaleString('en-NG'),
                  color: '#7C3AED',
                },
                {
                  icon: Wallet,
                  label: 'Refunds Issued',
                  value: formatCurrencyWhole(refundsIssuedTotal),
                  color: '#00B4D8',
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

        {/* Recent Reports */}
        <div
          className="mt-4 rounded-[12px] p-4 sm:p-5"
          style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
        >
          <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
            Recent Reports
          </h2>
          <div className="mt-3">
            <ScrollableTable minWidth={960}>
              <div
                className={`flex rounded-t-[8px] ${TABLE_HEADER_STICKY_CLASS}`}
                style={{ background: TABLE_HEADER_BG, borderBottom: '1px solid #E6F8FD' }}
              >
                <div className="max-w-[280px] min-w-[180px] flex-1 py-2.5 pr-3 pl-3">
                  <span
                    className="font-sans font-bold tracking-wider uppercase"
                    style={{ fontSize: 14, color: '#4A7080' }}
                  >
                    Report Name
                  </span>
                </div>
                <div className="w-36 shrink-0 py-2.5 pr-3">
                  <span
                    className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                    style={{ fontSize: 14, color: '#4A7080' }}
                  >
                    Report Type
                  </span>
                </div>
                <div className="w-40 shrink-0 py-2.5 pr-3">
                  <span
                    className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                    style={{ fontSize: 14, color: '#4A7080' }}
                  >
                    Date Generated
                  </span>
                </div>
                <div className="w-32 shrink-0 py-2.5 pr-3">
                  <span
                    className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                    style={{ fontSize: 14, color: '#4A7080' }}
                  >
                    Generated By
                  </span>
                </div>
                <div className="w-24 shrink-0 py-2.5 pr-3">
                  <span
                    className="font-sans font-bold tracking-wider uppercase"
                    style={{ fontSize: 14, color: '#4A7080' }}
                  >
                    Format
                  </span>
                </div>
                <div className="w-36 shrink-0 py-2.5 pr-4 text-right">
                  <span
                    className="font-sans font-bold tracking-wider uppercase"
                    style={{ fontSize: 14, color: '#4A7080' }}
                  >
                    Actions
                  </span>
                </div>
              </div>

              {filteredRecentReports.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                  <div
                    className="flex size-14 items-center justify-center rounded-full"
                    style={{ background: 'rgba(226,237,241,0.6)' }}
                  >
                    <FileText style={{ width: 24, height: 24, color: '#8A98A3' }} />
                  </div>
                  <p className="font-sans font-medium" style={{ fontSize: 16, color: '#4A7080' }}>
                    No reports match this Report Type
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setDraftReportType('');
                      setAppliedReportType('');
                    }}
                    className={`mt-1 font-sans font-medium transition-colors duration-150 hover:underline ${FOCUS_RING}`}
                    style={{ fontSize: 14, color: '#00B4D8' }}
                  >
                    Clear all filters
                  </button>
                </div>
              )}

              {filteredRecentReports.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center transition-colors duration-100 hover:bg-[#F5FBFD]"
                  style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                >
                  <div className="max-w-[280px] min-w-[180px] flex-1 py-3 pr-3 pl-3">
                    <Tooltip content={r.name}>
                      <p
                        className="truncate font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {r.name}
                      </p>
                    </Tooltip>
                  </div>
                  <div className="w-36 shrink-0 py-3 pr-3">
                    <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                      {r.type}
                    </p>
                  </div>
                  <div className="w-40 shrink-0 py-3 pr-3">
                    <p style={{ fontSize: 14, color: '#4A7080' }}>
                      {formatHumanDate(hoursAgoToDate(now, r.hoursAgo))}
                    </p>
                  </div>
                  <div className="w-32 shrink-0 py-3 pr-3">
                    <p style={{ fontSize: 14, color: '#4A7080' }}>Accountant</p>
                  </div>
                  <div className="w-24 shrink-0 py-3 pr-3">
                    <p style={{ fontSize: 14, color: '#4A7080' }}>{r.format}</p>
                  </div>
                  <div className="flex w-36 shrink-0 items-center justify-end gap-0.5 py-3 pr-4">
                    <button
                      type="button"
                      onClick={() => handleReportAction(r.name, r, 'view')}
                      aria-label={`View ${r.name}`}
                      className={`flex size-9 shrink-0 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                    >
                      <Eye style={{ width: 16, height: 16, color: '#4A7080' }} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReportAction(r.name, r, 'download')}
                      aria-label={`Download ${r.name}`}
                      className={`flex size-9 shrink-0 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                    >
                      <Download style={{ width: 16, height: 16, color: '#4A7080' }} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReportAction(r.name, r, 'email')}
                      aria-label={`Email ${r.name}`}
                      className={`flex size-9 shrink-0 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                    >
                      <Mail style={{ width: 16, height: 16, color: '#4A7080' }} />
                    </button>
                    <div onClick={(e) => e.stopPropagation()}>
                      <ReportRowMenu
                        open={openReportMenuId === r.id}
                        onToggle={() =>
                          setOpenReportMenuId((prev) => (prev === r.id ? null : r.id))
                        }
                        onDelete={() => deleteReport(r)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </ScrollableTable>
          </div>
        </div>

        {/* Footer note */}
        <div
          className="mt-4 flex items-center gap-2 rounded-[10px] px-4 py-3"
          style={{ background: '#E6F8FD' }}
        >
          <Info style={{ width: 16, height: 16, color: '#00B4D8', flexShrink: 0 }} />
          <p style={{ fontSize: 14, color: '#0D2630' }}>
            Report figures reflect the selected date range and filters. All amounts are in Nigerian
            Naira (₦).
          </p>
        </div>

        <div className="h-4" />
      </div>
    </main>
  );
}
