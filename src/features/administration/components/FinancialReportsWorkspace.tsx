'use client';

import {
  CalendarDays,
  ChevronRight,
  Coins,
  Download,
  FileBarChart,
  FileText,
  Lightbulb,
  PieChart,
  Receipt,
  ReceiptText,
  RotateCcw,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { AnimatedDonutChart } from '@components/shared/AnimatedDonutChart';
import { FilterDropdown, type FilterDef } from '@components/shared/FilterDropdown';
import { FormDateInput } from '@components/shared/FormDateInput';
import { ModalLoadingFallback } from '@components/shared/ModalLoadingFallback';
import { RowMenuPortal } from '@components/shared/RowMenuPortal';
import {
  ScrollableTable,
  TABLE_HEADER_BG,
  TABLE_HEADER_STICKY_CLASS,
} from '@components/shared/ScrollableTable';
import { Sparkline } from '@components/shared/Sparkline';
import { StatCard } from '@components/shared/StatCard';
import { Tooltip } from '@components/shared/Tooltip';
import { ROUTES } from '@/constants/routes';
import { useToast } from '@/hooks/useToast';
import { downloadCSV, downloadPDF, escapeHtml } from '@/utils/export';
import { formatCurrencyCompact, formatCurrencyWhole } from '@/utils/currency';
import { formatHumanDate } from '@/utils/datetime';
import {
  buildAllInvoices,
  buildAllPayments,
  buildAllRefunds,
  PAYMENT_METHODS,
} from '@/features/billing/__mocks__/billingAccountDetailFixtures';
import { BILLING_ACCOUNT_DEPARTMENTS } from '@/features/billing/__mocks__/billingAccountsFixtures';
import {
  FINANCIAL_REPORT_TYPES,
  RECENT_FINANCIAL_REPORTS,
} from '@/features/administration/__mocks__/financialReportsFixtures';

const ScheduleReportModal = dynamic(
  () => import('./ScheduleReportModal').then((m) => m.ScheduleReportModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);
const CreateCustomReportModal = dynamic(
  () => import('./CreateCustomReportModal').then((m) => m.CreateCustomReportModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const DAY_MS = 24 * 60 * 60 * 1000;

function toDateKey(date: Date | string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos' }).format(
    typeof date === 'string' ? new Date(date) : date,
  );
}

function todayKey(): string {
  return toDateKey(new Date());
}

function monthStartKey(): string {
  const d = new Date();
  return toDateKey(new Date(d.getFullYear(), d.getMonth(), 1));
}

/** Same edge-case handling as Revenue Overview / Operational Reports' own
 * copies of this helper. */
function pctDelta(current: number, previous: number): number | null {
  if (previous <= 0) return current > 0 ? null : 0;
  const delta = Math.round(((current - previous) / previous) * 1000) / 10;
  return Math.abs(delta) > 300 ? null : delta;
}

/** No hospital operating-cost data exists anywhere in this codebase (grep
 * confirmed) — Total Expenses and Net Income are estimated from real revenue
 * at a documented, fixed ratio rather than fabricated as independent
 * numbers, so they stay internally consistent with real revenue and are
 * clearly captioned "Estimated for range" on their stat cards. */
const ILLUSTRATIVE_EXPENSE_RATIO = 0.33;

const SERVICE_CATEGORY_MAP: Record<string, string> = {
  Consultation: 'Consultation',
  'Laboratory Tests': 'Diagnostics',
  Imaging: 'Diagnostics',
  'Pharmacy Dispensing': 'Pharmacy',
  Procedures: 'Procedures',
  'Ward Admission': 'Other Services',
};

const SERVICE_CATEGORY_COLORS: Record<string, string> = {
  Consultation: '#DC2626',
  Diagnostics: '#7C3AED',
  Pharmacy: '#16A34A',
  Procedures: '#D97706',
  'Other Services': '#4A7080',
};

const PAYMENT_METHOD_COLORS: Record<string, string> = {
  POS: '#2563EB',
  'Bank Transfer': '#16A34A',
  Cash: '#00B4D8',
  Card: '#7C3AED',
  Online: '#EC4899',
};

const REPORT_TYPE_TAGS = ['Income Statement', 'Receivables', 'Collections', 'Adjustments'] as const;
type ReportTypeTag = (typeof REPORT_TYPE_TAGS)[number];

const DEPARTMENT_FILTER_DEF: FilterDef = {
  key: 'department',
  defaultLabel: 'All Departments',
  options: BILLING_ACCOUNT_DEPARTMENTS.map((d) => ({ value: d, label: d })),
};

const PAYMENT_METHOD_FILTER_DEF: FilterDef = {
  key: 'paymentMethod',
  defaultLabel: 'All Payment Methods',
  options: PAYMENT_METHODS.map((m) => ({ value: m, label: m })),
};

const REPORT_TYPE_FILTER_DEF: FilterDef = {
  key: 'reportType',
  defaultLabel: 'All Financial Reports',
  options: REPORT_TYPE_TAGS.map((t) => ({ value: t, label: t })),
};

function bucketize(
  dates: string[],
  amounts: number[],
  from: string,
  to: string,
  count = 6,
): number[] {
  const buckets: number[] = Array.from({ length: count }, () => 0);
  const fromMs = new Date(from).getTime();
  const toMs = new Date(to).getTime();
  const span = Math.max(1, toMs - fromMs);
  const bucketMs = span / count;
  for (let i = 0; i < dates.length; i++) {
    const t = new Date(dates[i]!).getTime();
    const idx = Math.min(count - 1, Math.max(0, Math.floor((t - fromMs) / bucketMs)));
    buckets[idx] = (buckets[idx] ?? 0) + (amounts[i] ?? 0);
  }
  return buckets;
}

function RevenueExpenseTrendChart({
  data,
}: {
  data: { label: string; revenue: number; expenses: number }[];
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const max = Math.max(...data.map((d) => Math.max(d.revenue, d.expenses)), 1);
  const niceMax = Math.ceil(max / 100_000) * 100_000 || 100_000;
  const ticks = [0, niceMax * 0.25, niceMax * 0.5, niceMax * 0.75, niceMax];
  const W = 900;
  const H = 220;
  const stepX = data.length > 1 ? W / (data.length - 1) : 0;
  const revPoints = data.map((d, i) => ({
    x: data.length > 1 ? i * stepX : W / 2,
    y: H - (d.revenue / niceMax) * H,
  }));
  const expPoints = data.map((d, i) => ({
    x: data.length > 1 ? i * stepX : W / 2,
    y: H - (d.expenses / niceMax) * H,
  }));
  const revLineD = revPoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
  const expLineD = expPoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
  const revAreaD = `${revLineD} L ${revPoints[revPoints.length - 1]?.x ?? 0} ${H} L ${revPoints[0]?.x ?? 0} ${H} Z`;

  // This chart sits in a 3-up column (roughly a third the width of the
  // full-width charts elsewhere), so it can only fit ~4 labels before they
  // start colliding, unlike the 8-label budget those wider charts use.
  const labelStep = data.length > 4 ? Math.ceil(data.length / 4) : 1;
  const xLabelIdx = Array.from({ length: data.length }, (_, i) => i).filter(
    (i) => i % labelStep === 0,
  );

  function handleMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg || data.length === 0) return;
    const rect = svg.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * W;
    const idx = Math.max(0, Math.min(data.length - 1, Math.round(relX / stepX)));
    setHoverIdx(idx);
  }

  const hovered = hoverIdx !== null ? data[hoverIdx] : null;
  const hoveredRevPoint = hoverIdx !== null ? revPoints[hoverIdx] : null;

  return (
    <div>
      <div className="mt-1 flex items-center gap-4">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 shrink-0 rounded-full" style={{ background: '#2563EB' }} />
          <span style={{ fontSize: 14, color: '#4A7080' }}>Revenue (₦)</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 shrink-0 rounded-full" style={{ background: '#DC2626' }} />
          <span style={{ fontSize: 14, color: '#4A7080' }}>Expenses (₦)</span>
        </span>
      </div>
      <div className="mt-2 flex gap-3" style={{ height: 260 }}>
        <div
          className="flex shrink-0 flex-col justify-between pb-6 text-right"
          style={{ width: 52 }}
        >
          {[...ticks].reverse().map((t) => (
            <span key={t} className="font-sans" style={{ fontSize: 14, color: '#8A98A3' }}>
              {t === 0 ? '₦0' : formatCurrencyCompact(t)}
            </span>
          ))}
        </div>
        <div className="relative min-w-0 flex-1">
          <div
            className="absolute inset-x-0 top-0 flex flex-col justify-between"
            style={{ height: 'calc(100% - 24px)' }}
          >
            {[...ticks].reverse().map((t) => (
              <div key={t} style={{ borderTop: '1px dashed rgba(0,100,130,0.15)' }} />
            ))}
          </div>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            className="absolute inset-x-0 top-0 cursor-crosshair"
            style={{ height: 'calc(100% - 24px)', width: '100%' }}
            onMouseMove={handleMove}
            onMouseLeave={() => setHoverIdx(null)}
          >
            <defs>
              <linearGradient id="financial-reports-revenue-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563EB" stopOpacity="0.24" />
                <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={revAreaD} fill="url(#financial-reports-revenue-fill)" stroke="none" />
            <path
              d={revLineD}
              fill="none"
              stroke="#2563EB"
              strokeWidth={2.5}
              vectorEffect="non-scaling-stroke"
            />
            <path
              d={expLineD}
              fill="none"
              stroke="#DC2626"
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />
            {hoveredRevPoint && (
              <line
                x1={hoveredRevPoint.x}
                y1={0}
                x2={hoveredRevPoint.x}
                y2={H}
                stroke="rgba(0,100,130,0.25)"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            )}
            {revPoints.map((p, i) => (
              <circle
                key={`rev-${i}`}
                cx={p.x}
                cy={p.y}
                r={hoverIdx === i ? 5 : 3}
                fill="#2563EB"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {expPoints.map((p, i) => (
              <circle
                key={`exp-${i}`}
                cx={p.x}
                cy={p.y}
                r={hoverIdx === i ? 5 : 3}
                fill="#DC2626"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>
          {hovered && hoveredRevPoint && (
            <div
              className="pointer-events-none absolute z-10 rounded-[10px] px-3 py-2 whitespace-nowrap"
              style={{
                left: `${(hoveredRevPoint.x / W) * 100}%`,
                top: Math.max(0, (hoveredRevPoint.y / H) * (260 - 24) - 72),
                transform: 'translateX(-50%)',
                background: '#0D2630',
                boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
              }}
            >
              <p style={{ fontSize: 14, color: '#B8D8E0' }}>{hovered.label}</p>
              <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#93C5FD' }}>
                Revenue: {formatCurrencyWhole(hovered.revenue)}
              </p>
              <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#FCA5A5' }}>
                Expenses: {formatCurrencyWhole(hovered.expenses)}
              </p>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0" style={{ height: 24 }}>
            {xLabelIdx.map((i) => (
              <span
                key={i}
                className="absolute font-sans whitespace-nowrap"
                style={{
                  left: `${((revPoints[i]?.x ?? 0) / W) * 100}%`,
                  transform:
                    i === 0
                      ? 'translateX(0)'
                      : i === data.length - 1
                        ? 'translateX(-100%)'
                        : 'translateX(-50%)',
                  fontSize: 14,
                  color: '#8A98A3',
                }}
              >
                {data[i]?.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DateRangeControl({
  from,
  to,
  onChange,
}: {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex h-11 items-center gap-2 rounded-[10px] px-3.5 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
        style={{
          fontSize: 14,
          color: '#0D2630',
          border: open ? '1px solid #00B4D8' : '1px solid rgba(0,100,130,0.2)',
        }}
      >
        <CalendarDays style={{ width: 15, height: 15, color: '#4A7080' }} />
        {formatHumanDate(from)} - {formatHumanDate(to)}
      </button>
      {open && (
        <div
          className="animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 absolute top-full left-0 z-30 mt-1.5 w-[280px] rounded-[12px] bg-white p-4 duration-150"
          style={{
            border: '1px solid rgba(0,100,130,0.12)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          }}
        >
          <div className="flex flex-col gap-3">
            <div>
              <label
                className="mb-1 block font-sans font-medium"
                style={{ fontSize: 14, color: '#0D2630' }}
              >
                From
              </label>
              <FormDateInput value={from} max={to} onChange={(e) => onChange(e.target.value, to)} />
            </div>
            <div>
              <label
                className="mb-1 block font-sans font-medium"
                style={{ fontSize: 14, color: '#0D2630' }}
              >
                To
              </label>
              <FormDateInput
                value={to}
                min={from}
                max={todayKey()}
                onChange={(e) => onChange(from, e.target.value)}
              />
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className={`flex h-10 items-center justify-center rounded-[10px] font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
              style={{ fontSize: 14, background: '#00B4D8' }}
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function QuickActionButton({
  label,
  description,
  icon: Icon,
  onClick,
}: {
  label: string;
  description: string;
  icon: LucideIcon;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2.5 rounded-[10px] p-3 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
      style={{ border: '1px solid rgba(0,100,130,0.12)' }}
    >
      <div
        className="flex size-9 shrink-0 items-center justify-center rounded-[10px]"
        style={{ background: 'rgba(0,180,216,0.1)' }}
      >
        <Icon style={{ width: 16, height: 16, color: '#00B4D8' }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
          {label}
        </p>
        <p className="truncate" style={{ fontSize: 14, color: '#8A98A3' }}>
          {description}
        </p>
      </div>
      <ChevronRight style={{ width: 14, height: 14, color: '#8A98A3', flexShrink: 0 }} />
    </button>
  );
}

type SummaryRow = {
  key: string;
  reportType: ReportTypeTag;
  icon: LucideIcon;
  iconColor: string;
  label: string;
  description: string;
  current: number;
  previous: number;
  isPercent: boolean;
  sparkline: number[];
};

function SummaryTableRow({ row }: { row: SummaryRow }) {
  const Icon = row.icon;
  const changePercent = pctDelta(row.current, row.previous);
  const format = (v: number) => (row.isPercent ? `${v.toFixed(1)}%` : formatCurrencyWhole(v));

  return (
    <div className="flex items-center" style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}>
      <div className="flex max-w-[190px] min-w-0 flex-1 items-center gap-2 py-2.5 pr-2 pl-3">
        <div
          className="flex size-8 shrink-0 items-center justify-center rounded-[8px]"
          style={{ background: `${row.iconColor}1A` }}
        >
          <Icon style={{ width: 15, height: 15, color: row.iconColor }} />
        </div>
        <Tooltip content={row.label}>
          <p className="truncate font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
            {row.label}
          </p>
        </Tooltip>
      </div>
      <div className="w-52 shrink-0 py-2.5 pr-2 pl-3">
        <Tooltip content={row.description}>
          <p className="truncate" style={{ fontSize: 14, color: '#8A98A3' }}>
            {row.description}
          </p>
        </Tooltip>
      </div>
      <div className="w-28 shrink-0 py-2.5 pr-2 pl-3">
        <p className="truncate font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
          {format(row.current)}
        </p>
      </div>
      <div className="w-28 shrink-0 py-2.5 pr-2 pl-3">
        <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
          {format(row.previous)}
        </p>
      </div>
      <div className="w-24 shrink-0 py-2.5 pr-2 pl-3">
        <p
          className="truncate font-sans font-medium"
          style={{ fontSize: 14, color: (changePercent ?? 0) >= 0 ? '#16A34A' : '#DC2626' }}
        >
          {changePercent !== null
            ? `${changePercent >= 0 ? '↑' : '↓'}${Math.abs(changePercent)}%`
            : 'n/a'}
        </p>
      </div>
      <div className="w-20 shrink-0 py-2.5 pr-2 pl-3">
        <Sparkline data={row.sparkline} color={row.iconColor} width={72} height={28} />
      </div>
    </div>
  );
}

export function FinancialReportsWorkspace() {
  const router = useRouter();
  const toast = useToast();

  const [dateFrom, setDateFrom] = useState(monthStartKey());
  const [dateTo, setDateTo] = useState(todayKey());
  const [appliedFrom, setAppliedFrom] = useState(monthStartKey());
  const [appliedTo, setAppliedTo] = useState(todayKey());
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('ALL');
  const [reportTypeFilter, setReportTypeFilter] = useState('ALL');
  const [departmentDropdownOpen, setDepartmentDropdownOpen] = useState(false);
  const [paymentMethodDropdownOpen, setPaymentMethodDropdownOpen] = useState(false);
  const [reportTypeDropdownOpen, setReportTypeDropdownOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportBtnRef = useRef<HTMLButtonElement>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [customReportOpen, setCustomReportOpen] = useState(false);
  const summaryTableRef = useRef<HTMLDivElement>(null);

  const invoices = useMemo(() => buildAllInvoices(), []);
  const payments = useMemo(() => buildAllPayments(), []);
  const refunds = useMemo(() => buildAllRefunds(), []);

  const rangeDays = Math.max(
    1,
    Math.round((new Date(appliedTo).getTime() - new Date(appliedFrom).getTime()) / DAY_MS) + 1,
  );
  const prevTo = toDateKey(new Date(new Date(appliedFrom).getTime() - DAY_MS));
  const prevFrom = toDateKey(new Date(new Date(appliedFrom).getTime() - rangeDays * DAY_MS));

  const invoicesInRange = invoices.filter((i) => {
    const key = toDateKey(i.date);
    return (
      key >= appliedFrom &&
      key <= appliedTo &&
      i.status !== 'Cancelled' &&
      (departmentFilter === 'ALL' || i.department === departmentFilter)
    );
  });
  const invoicesInPrevRange = invoices.filter((i) => {
    const key = toDateKey(i.date);
    return (
      key >= prevFrom &&
      key <= prevTo &&
      i.status !== 'Cancelled' &&
      (departmentFilter === 'ALL' || i.department === departmentFilter)
    );
  });
  const paymentsInRange = payments.filter((p) => {
    const key = toDateKey(p.date);
    return (
      key >= appliedFrom &&
      key <= appliedTo &&
      (departmentFilter === 'ALL' || p.department === departmentFilter) &&
      (paymentMethodFilter === 'ALL' || p.method === paymentMethodFilter)
    );
  });
  const paymentsInPrevRange = payments.filter((p) => {
    const key = toDateKey(p.date);
    return (
      key >= prevFrom &&
      key <= prevTo &&
      (departmentFilter === 'ALL' || p.department === departmentFilter) &&
      (paymentMethodFilter === 'ALL' || p.method === paymentMethodFilter)
    );
  });
  const refundsInRange = refunds.filter((r) => {
    const key = toDateKey(r.date);
    return (
      key >= appliedFrom &&
      key <= appliedTo &&
      r.status === 'Processed' &&
      (departmentFilter === 'ALL' || r.department === departmentFilter)
    );
  });
  const refundsInPrevRange = refunds.filter((r) => {
    const key = toDateKey(r.date);
    return (
      key >= prevFrom &&
      key <= prevTo &&
      r.status === 'Processed' &&
      (departmentFilter === 'ALL' || r.department === departmentFilter)
    );
  });

  const totalRevenue = invoicesInRange.reduce((s, i) => s + i.amount, 0);
  const prevTotalRevenue = invoicesInPrevRange.reduce((s, i) => s + i.amount, 0);
  const totalExpenses = Math.round(totalRevenue * ILLUSTRATIVE_EXPENSE_RATIO);
  const prevTotalExpenses = Math.round(prevTotalRevenue * ILLUSTRATIVE_EXPENSE_RATIO);
  const netIncome = totalRevenue - totalExpenses;
  const prevNetIncome = prevTotalRevenue - prevTotalExpenses;
  const totalCollected = paymentsInRange.reduce((s, p) => s + p.amount, 0);
  const prevTotalCollected = paymentsInPrevRange.reduce((s, p) => s + p.amount, 0);
  const refundsIssued = refundsInRange.reduce((s, r) => s + r.amount, 0);
  const prevRefundsIssued = refundsInPrevRange.reduce((s, r) => s + r.amount, 0);
  const collectionRate = totalRevenue > 0 ? (totalCollected / totalRevenue) * 100 : 0;
  const prevCollectionRate =
    prevTotalRevenue > 0 ? (prevTotalCollected / prevTotalRevenue) * 100 : 0;

  const outstandingRows = invoices
    .filter(
      (i) =>
        i.amount - i.paid > 0 &&
        i.status !== 'Cancelled' &&
        i.status !== 'Draft' &&
        (departmentFilter === 'ALL' || i.department === departmentFilter),
    )
    .map((i) => ({ ...i, balance: i.amount - i.paid }));
  const totalOutstanding = outstandingRows.reduce((s, r) => s + r.balance, 0);
  const prevOutstanding = invoicesInPrevRange.reduce(
    (s, i) => s + Math.max(0, i.amount - i.paid),
    0,
  );

  const revenueChangePercent = pctDelta(totalRevenue, prevTotalRevenue);

  const trendByKey = new Map<string, { label: string; revenue: number }>();
  for (const inv of invoicesInRange) {
    const key = toDateKey(inv.date);
    const label = new Date(inv.date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
    });
    const existing = trendByKey.get(key);
    trendByKey.set(key, { label, revenue: (existing?.revenue ?? 0) + inv.amount });
  }
  const trendData = Array.from(trendByKey.entries())
    .sort(([a], [b]) => (a > b ? 1 : -1))
    .map(([, v]) => ({
      label: v.label,
      revenue: v.revenue,
      expenses: Math.round(v.revenue * ILLUSTRATIVE_EXPENSE_RATIO),
    }));

  const byMethod = new Map<string, number>();
  for (const p of paymentsInRange) byMethod.set(p.method, (byMethod.get(p.method) ?? 0) + p.amount);
  const methodBreakdown = PAYMENT_METHODS.map((m) => ({
    method: m,
    amount: byMethod.get(m) ?? 0,
    percent: totalCollected > 0 ? ((byMethod.get(m) ?? 0) / totalCollected) * 100 : 0,
    color: PAYMENT_METHOD_COLORS[m] ?? '#8A98A3',
  })).filter((m) => m.amount > 0);

  const byCategory = new Map<string, number>();
  for (const inv of invoicesInRange) {
    const category = SERVICE_CATEGORY_MAP[inv.service] ?? 'Other Services';
    byCategory.set(category, (byCategory.get(category) ?? 0) + inv.amount);
  }
  const serviceRows = Array.from(byCategory.entries())
    .map(([category, amount]) => ({
      category,
      amount,
      percent: totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0,
      color: SERVICE_CATEGORY_COLORS[category] ?? '#8A98A3',
    }))
    .sort((a, b) => b.amount - a.amount);

  const overdueInvoices = invoices.filter(
    (i) =>
      i.status === 'Overdue' && (departmentFilter === 'ALL' || i.department === departmentFilter),
  );
  const overdueAmount = overdueInvoices.reduce((s, i) => s + Math.max(0, i.amount - i.paid), 0);

  const topMethod = methodBreakdown[0];
  const secondCategory = serviceRows[1];

  const revenueBuckets = bucketize(
    invoicesInRange.map((i) => i.date),
    invoicesInRange.map((i) => i.amount),
    appliedFrom,
    appliedTo,
  );
  const expensesBuckets = revenueBuckets.map((v) => Math.round(v * ILLUSTRATIVE_EXPENSE_RATIO));
  const netIncomeBuckets = revenueBuckets.map((v, i) => v - (expensesBuckets[i] ?? 0));
  const collectedBuckets = bucketize(
    paymentsInRange.map((p) => p.date),
    paymentsInRange.map((p) => p.amount),
    appliedFrom,
    appliedTo,
  );
  const refundBuckets = bucketize(
    refundsInRange.map((r) => r.date),
    refundsInRange.map((r) => r.amount),
    appliedFrom,
    appliedTo,
  );
  const collectionRateBuckets = revenueBuckets.map((v, i) =>
    v > 0 ? ((collectedBuckets[i] ?? 0) / v) * 100 : 0,
  );

  const summaryRows: SummaryRow[] = [
    {
      key: 'revenue',
      reportType: 'Income Statement',
      icon: Wallet,
      iconColor: '#2563EB',
      label: 'Total Revenue',
      description: 'Total income from all sources',
      current: totalRevenue,
      previous: prevTotalRevenue,
      isPercent: false,
      sparkline: revenueBuckets,
    },
    {
      key: 'expenses',
      reportType: 'Income Statement',
      icon: TrendingDown,
      iconColor: '#DC2626',
      label: 'Total Expenses',
      description: 'Total operating expenses (estimated)',
      current: totalExpenses,
      previous: prevTotalExpenses,
      isPercent: false,
      sparkline: expensesBuckets,
    },
    {
      key: 'netincome',
      reportType: 'Income Statement',
      icon: TrendingUp,
      iconColor: '#16A34A',
      label: 'Net Income',
      description: 'Revenue minus expenses',
      current: netIncome,
      previous: prevNetIncome,
      isPercent: false,
      sparkline: netIncomeBuckets,
    },
    {
      key: 'ar',
      reportType: 'Receivables',
      icon: ReceiptText,
      iconColor: '#D97706',
      label: 'Accounts Receivable',
      description: 'Outstanding patient balances',
      current: totalOutstanding,
      previous: prevOutstanding,
      isPercent: false,
      sparkline: revenueBuckets,
    },
    {
      key: 'collected',
      reportType: 'Collections',
      icon: Coins,
      iconColor: '#7C3AED',
      label: 'Amount Collected',
      description: 'Payments collected',
      current: totalCollected,
      previous: prevTotalCollected,
      isPercent: false,
      sparkline: collectedBuckets,
    },
    {
      key: 'refunds',
      reportType: 'Adjustments',
      icon: RotateCcw,
      iconColor: '#EC4899',
      label: 'Refunds Issued',
      description: 'Total refunds processed',
      current: refundsIssued,
      previous: prevRefundsIssued,
      isPercent: false,
      sparkline: refundBuckets,
    },
    {
      key: 'collectionrate',
      reportType: 'Collections',
      icon: PieChart,
      iconColor: '#00B4D8',
      label: 'Collection Rate',
      description: 'Percentage of collections',
      current: collectionRate,
      previous: prevCollectionRate,
      isPercent: true,
      sparkline: collectionRateBuckets,
    },
  ];

  const filteredSummaryRows =
    reportTypeFilter === 'ALL'
      ? summaryRows
      : summaryRows.filter((r) => r.reportType === reportTypeFilter);

  function scrollToSummaryTable() {
    summaryTableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handleApplyFilters() {
    setAppliedFrom(dateFrom);
    setAppliedTo(dateTo);
    toast.success('Filters applied', 'The dashboard has been updated.');
  }

  function handleResetFilters() {
    const from = monthStartKey();
    const to = todayKey();
    setDateFrom(from);
    setDateTo(to);
    setAppliedFrom(from);
    setAppliedTo(to);
    setDepartmentFilter('ALL');
    setPaymentMethodFilter('ALL');
    setReportTypeFilter('ALL');
  }

  function buildDashboardRows(): string[][] {
    const rows: string[][] = [['Section', 'Item', 'Value']];
    rows.push(['Stat', 'Total Revenue', formatCurrencyWhole(totalRevenue)]);
    rows.push(['Stat', 'Total Expenses (Estimated)', formatCurrencyWhole(totalExpenses)]);
    rows.push(['Stat', 'Net Income (Estimated)', formatCurrencyWhole(netIncome)]);
    rows.push(['Stat', 'Outstanding Receivables', formatCurrencyWhole(totalOutstanding)]);
    rows.push(['Stat', 'Collection Rate', `${collectionRate.toFixed(1)}%`]);
    for (const m of methodBreakdown) {
      rows.push([
        'Revenue by Payment Method',
        m.method,
        `${formatCurrencyWhole(m.amount)} (${m.percent.toFixed(1)}%)`,
      ]);
    }
    for (const s of serviceRows) {
      rows.push([
        'Income by Service Category',
        s.category,
        `${formatCurrencyWhole(s.amount)} (${s.percent.toFixed(1)}%)`,
      ]);
    }
    for (const r of filteredSummaryRows) {
      const format = (v: number) => (r.isPercent ? `${v.toFixed(1)}%` : formatCurrencyWhole(v));
      rows.push([
        'Financial Summary',
        r.label,
        `This: ${format(r.current)}, Last: ${format(r.previous)}`,
      ]);
    }
    return rows;
  }

  function handleExportCSV() {
    downloadCSV('financial-reports', buildDashboardRows());
    setExportMenuOpen(false);
    toast.success('Export ready', 'Financial report data exported as CSV.');
  }

  function handleExportPDF() {
    const rows = buildDashboardRows();
    const body = `
      <h1>Financial Reports</h1>
      <p class="meta">${escapeHtml(formatHumanDate(appliedFrom))} to ${escapeHtml(formatHumanDate(appliedTo))}</p>
      <hr>
      <table><thead><tr><th>Section</th><th>Item</th><th>Value</th></tr></thead><tbody>
      ${rows
        .slice(1)
        .map(
          (r) =>
            `<tr><td>${escapeHtml(r[0] ?? '')}</td><td>${escapeHtml(r[1] ?? '')}</td><td>${escapeHtml(r[2] ?? '')}</td></tr>`,
        )
        .join('')}
      </tbody></table>
    `;
    downloadPDF('financial-reports', body);
    setExportMenuOpen(false);
    toast.success('Export ready', 'Financial report exported as PDF.');
  }

  function handlePrint() {
    handleExportPDF();
  }

  function handleGenerateCustomReport(params: {
    reportId: string;
    dateFrom: string;
    dateTo: string;
  }) {
    const reportName =
      FINANCIAL_REPORT_TYPES.find((r) => r.id === params.reportId)?.name ??
      'Custom Financial Report';
    const inRangeInvoices = invoices.filter((i) => {
      const key = toDateKey(i.date);
      return key >= params.dateFrom && key <= params.dateTo && i.status !== 'Cancelled';
    });
    const revenue = inRangeInvoices.reduce((s, i) => s + i.amount, 0);
    const rows: string[][] = [
      ['Field', 'Value'],
      ['Report Type', reportName],
      ['From', formatHumanDate(params.dateFrom)],
      ['To', formatHumanDate(params.dateTo)],
      ['Total Revenue in Range', formatCurrencyWhole(revenue)],
      [
        'Total Expenses in Range (Estimated)',
        formatCurrencyWhole(Math.round(revenue * ILLUSTRATIVE_EXPENSE_RATIO)),
      ],
    ];
    downloadCSV(`custom-financial-report-${reportName.toLowerCase().replace(/\s+/g, '-')}`, rows);
    toast.success('Custom report generated', `${reportName} downloaded.`);
  }

  function handleDownloadReport(reportName: string) {
    downloadCSV(reportName.toLowerCase().replace(/\s+/g, '-'), buildDashboardRows());
    toast.success('Report downloaded', `${reportName} downloaded as CSV.`);
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto max-w-[1200px] px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-wrap items-center gap-1.5" style={{ fontSize: 14 }}>
            <button
              type="button"
              onClick={() => router.push(ROUTES.admin)}
              className={`font-sans transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
              style={{ color: '#4A7080' }}
            >
              Reports
            </button>
            <span style={{ color: '#8A98A3' }}>/</span>
            <span className="font-medium" style={{ color: '#0D2630' }}>
              Financial Reports
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div
                className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-[10px]"
                style={{ background: 'rgba(124,58,237,0.1)' }}
              >
                <Receipt style={{ width: 18, height: 18, color: '#7C3AED' }} />
              </div>
              <div>
                <h1
                  className="font-display font-semibold"
                  style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
                >
                  Financial Reports
                </h1>
                <p
                  className="mt-0.5"
                  style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}
                >
                  Comprehensive financial reports and analytics for the medical centre.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setScheduleOpen(true)}
                className={`flex h-11 items-center gap-1.5 rounded-[10px] px-3.5 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
              >
                <CalendarDays style={{ width: 15, height: 15 }} />
                Schedule Report
              </button>
              <div className="relative">
                <button
                  ref={exportBtnRef}
                  type="button"
                  onClick={() => setExportMenuOpen((v) => !v)}
                  className={`flex h-11 items-center gap-1.5 rounded-[10px] px-3.5 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                  style={{ fontSize: 14, background: '#00B4D8' }}
                >
                  <Download style={{ width: 15, height: 15 }} />
                  Export Report
                </button>
                <RowMenuPortal
                  open={exportMenuOpen}
                  anchorRef={exportBtnRef}
                  onClose={() => setExportMenuOpen(false)}
                  width={170}
                >
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className={`flex w-full items-center px-4 py-2 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
                    style={{ fontSize: 14, color: '#2F3A40' }}
                  >
                    Export as CSV
                  </button>
                  <button
                    type="button"
                    onClick={handleExportPDF}
                    className={`flex w-full items-center px-4 py-2 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
                    style={{ fontSize: 14, color: '#2F3A40' }}
                  >
                    Export as PDF
                  </button>
                  <button
                    type="button"
                    onClick={handlePrint}
                    className={`flex w-full items-center px-4 py-2 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
                    style={{ fontSize: 14, color: '#2F3A40' }}
                  >
                    Print
                  </button>
                </RowMenuPortal>
              </div>
            </div>
          </div>

          <div
            className="mt-5 rounded-[12px] p-4"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div>
                <p
                  className="mb-1.5 font-sans font-medium"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  Date Range
                </p>
                <DateRangeControl
                  from={dateFrom}
                  to={dateTo}
                  onChange={(from, to) => {
                    setDateFrom(from);
                    setDateTo(to);
                  }}
                />
              </div>
              <div>
                <p
                  className="mb-1.5 font-sans font-medium"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  Report Type
                </p>
                <FilterDropdown
                  def={REPORT_TYPE_FILTER_DEF}
                  value={reportTypeFilter}
                  isOpen={reportTypeDropdownOpen}
                  onToggle={() => setReportTypeDropdownOpen((v) => !v)}
                  onSelect={(v) => {
                    setReportTypeFilter(v);
                    setReportTypeDropdownOpen(false);
                  }}
                />
              </div>
              <div>
                <p
                  className="mb-1.5 font-sans font-medium"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  Department
                </p>
                <FilterDropdown
                  def={DEPARTMENT_FILTER_DEF}
                  value={departmentFilter}
                  isOpen={departmentDropdownOpen}
                  onToggle={() => setDepartmentDropdownOpen((v) => !v)}
                  onSelect={(v) => {
                    setDepartmentFilter(v);
                    setDepartmentDropdownOpen(false);
                  }}
                />
              </div>
              <div>
                <p
                  className="mb-1.5 font-sans font-medium"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  Payment Method
                </p>
                <FilterDropdown
                  def={PAYMENT_METHOD_FILTER_DEF}
                  value={paymentMethodFilter}
                  isOpen={paymentMethodDropdownOpen}
                  onToggle={() => setPaymentMethodDropdownOpen((v) => !v)}
                  onSelect={(v) => {
                    setPaymentMethodFilter(v);
                    setPaymentMethodDropdownOpen(false);
                  }}
                />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={handleResetFilters}
                className={`flex h-10 items-center gap-1.5 rounded-[10px] px-3.5 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
              >
                Reset
              </button>
              <button
                type="button"
                onClick={handleApplyFilters}
                className={`flex h-10 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                style={{ fontSize: 14, background: '#00B4D8' }}
              >
                Apply Filters
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-5 xl:gap-4">
            <StatCard
              icon={Wallet}
              label="Total Revenue"
              value={formatCurrencyWhole(totalRevenue)}
              info={
                revenueChangePercent !== null
                  ? `${revenueChangePercent >= 0 ? '↑' : '↓'} ${Math.abs(revenueChangePercent)}% vs last period`
                  : `${formatHumanDate(appliedFrom)} - ${formatHumanDate(appliedTo)}`
              }
              accent="#2563EB"
              iconBg="rgba(37,99,235,0.1)"
            />
            <StatCard
              icon={TrendingDown}
              label="Total Expenses"
              value={formatCurrencyWhole(totalExpenses)}
              info="Estimated for range"
              accent="#DC2626"
              iconBg="rgba(220,38,38,0.1)"
            />
            <StatCard
              icon={TrendingUp}
              label="Net Income"
              value={formatCurrencyWhole(netIncome)}
              info="Estimated for range"
              accent="#16A34A"
              iconBg="rgba(22,163,74,0.1)"
            />
            <StatCard
              icon={ReceiptText}
              label="Outstanding Receivables"
              value={formatCurrencyWhole(totalOutstanding)}
              info="Across unpaid invoices"
              accent="#D97706"
              iconBg="rgba(217,119,6,0.1)"
            />
            <StatCard
              icon={PieChart}
              label="Collection Rate"
              value={`${collectionRate.toFixed(1)}%`}
              info={`${formatHumanDate(appliedFrom)} - ${formatHumanDate(appliedTo)}`}
              accent="#7C3AED"
              iconBg="rgba(124,58,237,0.1)"
            />
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-3">
            <div
              className="min-w-0 rounded-[12px] p-4 sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Revenue vs Expenses Trend
              </p>
              <RevenueExpenseTrendChart data={trendData} />
              <div className="mt-4 grid grid-cols-3 gap-2">
                <div>
                  <span className="flex items-center gap-1.5">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ background: '#2563EB' }}
                    />
                    <span style={{ fontSize: 14, color: '#8A98A3' }}>Total Revenue</span>
                  </span>
                  <p className="font-display font-bold" style={{ fontSize: 16, color: '#0D2630' }}>
                    {formatCurrencyWhole(totalRevenue)}
                  </p>
                </div>
                <div>
                  <span className="flex items-center gap-1.5">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ background: '#DC2626' }}
                    />
                    <span style={{ fontSize: 14, color: '#8A98A3' }}>Total Expenses</span>
                  </span>
                  <p className="font-display font-bold" style={{ fontSize: 16, color: '#0D2630' }}>
                    {formatCurrencyWhole(totalExpenses)}
                  </p>
                </div>
                <div>
                  <span className="flex items-center gap-1.5">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ background: '#16A34A' }}
                    />
                    <span style={{ fontSize: 14, color: '#8A98A3' }}>Net Income</span>
                  </span>
                  <p className="font-display font-bold" style={{ fontSize: 16, color: '#0D2630' }}>
                    {formatCurrencyWhole(netIncome)}
                  </p>
                </div>
              </div>
            </div>

            <div
              className="rounded-[12px] p-4 sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Revenue by Payment Method
              </p>
              <div className="mt-3 flex justify-center">
                <AnimatedDonutChart
                  breakdown={methodBreakdown.map((m) => ({
                    label: m.method,
                    value: m.amount,
                    color: m.color,
                  }))}
                  total={totalCollected}
                  size={130}
                  ariaLabel="Revenue by payment method"
                  centerValue={formatCurrencyWhole(totalCollected)}
                  centerLabel="Total Collected"
                />
              </div>
              <div className="mt-4 flex flex-col gap-2">
                {methodBreakdown.map((m) => (
                  <div key={m.method} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ background: m.color }}
                      />
                      <span style={{ fontSize: 14, color: '#4A7080' }}>{m.method}</span>
                    </span>
                    <span
                      className="font-sans font-medium"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {formatCurrencyWhole(m.amount)} ({m.percent.toFixed(1)}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="rounded-[12px] p-4 sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Income by Service Category
              </p>
              <div className="mt-3 flex justify-center">
                <AnimatedDonutChart
                  breakdown={serviceRows.map((s) => ({
                    label: s.category,
                    value: s.amount,
                    color: s.color,
                  }))}
                  total={totalRevenue}
                  size={130}
                  ariaLabel="Income by service category"
                  centerValue={formatCurrencyWhole(totalRevenue)}
                  centerLabel="Total Revenue"
                />
              </div>
              <div className="mt-4 flex flex-col gap-2">
                {serviceRows.map((s) => (
                  <div key={s.category} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ background: s.color }}
                      />
                      <span style={{ fontSize: 14, color: '#4A7080' }}>{s.category}</span>
                    </span>
                    <span
                      className="font-sans font-medium"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {formatCurrencyWhole(s.amount)} ({s.percent.toFixed(1)}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div
            ref={summaryTableRef}
            className="mt-5 rounded-[12px] p-4 sm:p-5"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
              Financial Summary
            </p>
            <div className="mt-3">
              <ScrollableTable minWidth={820}>
                <div
                  className={`flex ${TABLE_HEADER_STICKY_CLASS}`}
                  style={{ background: TABLE_HEADER_BG }}
                >
                  <div className="max-w-[190px] min-w-0 flex-1 py-2.5 pr-2 pl-3">
                    <p
                      className="font-sans font-semibold"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      Report Type
                    </p>
                  </div>
                  <div className="w-52 shrink-0 py-2.5 pr-2 pl-3">
                    <p
                      className="font-sans font-semibold"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      Description
                    </p>
                  </div>
                  <div className="w-28 shrink-0 py-2.5 pr-2 pl-3">
                    <p
                      className="font-sans font-semibold"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      This Period
                    </p>
                  </div>
                  <div className="w-28 shrink-0 py-2.5 pr-2 pl-3">
                    <p
                      className="font-sans font-semibold"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      Last Period
                    </p>
                  </div>
                  <div className="w-24 shrink-0 py-2.5 pr-2 pl-3">
                    <p
                      className="font-sans font-semibold"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      % Change
                    </p>
                  </div>
                  <div className="w-20 shrink-0 py-2.5 pr-2 pl-3">
                    <p
                      className="font-sans font-semibold"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      Trend
                    </p>
                  </div>
                </div>
                {filteredSummaryRows.map((r) => (
                  <SummaryTableRow key={r.key} row={r} />
                ))}
              </ScrollableTable>
            </div>
            <p className="mt-3" style={{ fontSize: 14, color: '#8A98A3' }}>
              Showing 1 to {filteredSummaryRows.length} of {filteredSummaryRows.length} records
            </p>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_340px]">
            <div
              className="min-w-0 rounded-[12px] p-4 sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <div className="flex items-center gap-2">
                <Lightbulb style={{ width: 16, height: 16, color: '#00B4D8' }} />
                <p
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Report Insights
                </p>
              </div>
              <div className="mt-3 flex flex-col gap-2.5">
                {revenueChangePercent !== null && (
                  <p style={{ fontSize: 14, color: '#4A7080' }}>
                    Revenue {revenueChangePercent >= 0 ? 'increased' : 'decreased'} by{' '}
                    {Math.abs(revenueChangePercent)}% compared to the previous period.
                  </p>
                )}
                {topMethod && secondCategory && (
                  <p style={{ fontSize: 14, color: '#4A7080' }}>
                    {topMethod.method} payments contribute {topMethod.percent.toFixed(1)}% of total
                    revenue collected. {secondCategory.category} is the second highest revenue
                    generating category.
                  </p>
                )}
                {overdueInvoices.length > 0 && (
                  <p style={{ fontSize: 14, color: '#4A7080' }}>
                    {overdueInvoices.length} invoices are overdue with total amount of{' '}
                    {formatCurrencyWhole(overdueAmount)}.
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div
                className="rounded-[12px] p-4 sm:p-5"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <p
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Quick Actions
                </p>
                <div className="mt-3 flex flex-col gap-2">
                  <QuickActionButton
                    label="Generate Custom Report"
                    description="Build a report with specific filters"
                    icon={FileText}
                    onClick={() => setCustomReportOpen(true)}
                  />
                  <QuickActionButton
                    label="Schedule New Report"
                    description="Automate report delivery"
                    icon={CalendarDays}
                    onClick={() => setScheduleOpen(true)}
                  />
                  <QuickActionButton
                    label="Export Financial Data"
                    description="Download financial data in CSV/PDF"
                    icon={Download}
                    onClick={handleExportCSV}
                  />
                  <QuickActionButton
                    label="Manage Report Templates"
                    description="Edit and manage report templates"
                    icon={FileBarChart}
                    onClick={scrollToSummaryTable}
                  />
                </div>
              </div>

              <div
                className="rounded-[12px] p-4 sm:p-5"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <div className="flex items-center justify-between gap-2">
                  <p
                    className="font-display font-semibold"
                    style={{ fontSize: 16, color: '#0D2630' }}
                  >
                    Recent Financial Reports
                  </p>
                  <button
                    type="button"
                    onClick={scrollToSummaryTable}
                    className={`flex items-center gap-1 font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                    style={{ fontSize: 14, color: '#00B4D8' }}
                  >
                    View All
                    <ChevronRight style={{ width: 13, height: 13 }} />
                  </button>
                </div>
                <div className="mt-3 flex flex-col gap-3">
                  {RECENT_FINANCIAL_REPORTS.map((r) => (
                    <div key={r.id} className="flex items-center gap-2.5">
                      <div className="min-w-0 flex-1">
                        <Tooltip content={r.name}>
                          <p
                            className="truncate font-sans font-medium"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {r.name}
                          </p>
                        </Tooltip>
                        <p style={{ fontSize: 14, color: '#8A98A3' }}>
                          {formatHumanDate(r.generatedAt)}
                        </p>
                        <span
                          className="inline-block rounded-full px-2 py-0.5 font-sans font-medium"
                          style={{
                            fontSize: 14,
                            color: '#16A34A',
                            background: 'rgba(22,163,74,0.08)',
                          }}
                        >
                          {r.status}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDownloadReport(r.name)}
                        aria-label={`Download ${r.name}`}
                        className={`flex size-9 shrink-0 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
                      >
                        <Download style={{ width: 15, height: 15, color: '#4A7080' }} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {scheduleOpen && (
        <ScheduleReportModal
          reportOptions={FINANCIAL_REPORT_TYPES.map((r) => ({ id: r.id, name: r.name }))}
          onClose={() => setScheduleOpen(false)}
        />
      )}
      {customReportOpen && (
        <CreateCustomReportModal
          reportOptions={FINANCIAL_REPORT_TYPES.map((r) => ({ id: r.id, name: r.name }))}
          defaultDateFrom={dateFrom}
          defaultDateTo={dateTo}
          onClose={() => setCustomReportOpen(false)}
          onGenerate={handleGenerateCustomReport}
        />
      )}
    </div>
  );
}
