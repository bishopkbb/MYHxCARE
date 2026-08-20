'use client';

import {
  BarChart3,
  Boxes,
  Building2,
  CalendarClock,
  ClipboardList,
  Download,
  Filter,
  Info,
  Landmark,
  ReceiptText,
  RotateCcw,
  TrendingDown,
  TrendingUp,
  Wallet,
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
import { watMonthStartTimestamp } from '@/utils/datetime';
import { BILLING_ACCOUNT_DEPARTMENTS } from '@/features/billing/__mocks__/billingAccountsFixtures';
import {
  buildAllAdjustments,
  buildAllInvoices,
  buildAllPayments,
  buildAllRefunds,
  INVOICE_SERVICE_OPTIONS,
  PAYMENT_METHODS,
  type InvoiceWithAccount,
} from '@/features/billing/__mocks__/billingAccountDetailFixtures';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';
const DAY_MS = 24 * 60 * 60 * 1000;

const DEPARTMENT_COLORS: Record<string, string> = {
  Laboratory: '#2563EB',
  Pharmacy: '#16A34A',
  Consultation: '#D97706',
  Emergency: '#DC2626',
  Ward: '#7C3AED',
  'Other Services': '#8A98A3',
};
const METHOD_COLORS: Record<string, string> = {
  'Bank Transfer': '#2563EB',
  POS: '#00B4D8',
  Online: '#D97706',
  Card: '#7C3AED',
  Cash: '#16A34A',
};
const SERVICE_COLORS: Record<string, string> = {
  Consultation: '#D97706',
  'Laboratory Tests': '#2563EB',
  'Pharmacy Dispensing': '#16A34A',
  'Ward Admission': '#7C3AED',
  Imaging: '#DB2777',
  Procedures: '#0D9488',
};

// Canonical service → department pairing for display — same fix already
// applied on RevenueByServiceWorkspace. The fixture generator assigns each
// invoice's `service` independently of the account's own `department`, so
// "whichever invoice happens to carry this service" produces nonsensical
// pairs. Purely informational for this table's Department column; doesn't
// touch the account/invoice department used by the Department filter.
const SERVICE_DEPARTMENT: Record<string, string> = {
  Consultation: 'Consultation',
  'Laboratory Tests': 'Laboratory',
  'Pharmacy Dispensing': 'Pharmacy',
  'Ward Admission': 'Ward',
  Imaging: 'Other Services',
  Procedures: 'Other Services',
};

type ReportsTab = 'overview' | 'department' | 'service' | 'method' | 'trends' | 'comparisons';
const TABS: { key: ReportsTab; label: string; href?: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'department', label: 'By Department', href: ROUTES.billingRevenueByDepartment },
  { key: 'service', label: 'By Service', href: ROUTES.billingRevenueByService },
  { key: 'method', label: 'By Payment Method' },
  { key: 'trends', label: 'Trends' },
  { key: 'comparisons', label: 'Comparisons' },
];

type AvailableReport = {
  id: string;
  icon: LucideIcon;
  accent: string;
  name: string;
  description: string;
  href?: string;
};
const AVAILABLE_REPORTS: AvailableReport[] = [
  {
    id: 'summary',
    icon: ReceiptText,
    accent: '#7C3AED',
    name: 'Revenue Summary Report',
    description: 'Overall revenue summary for the selected period.',
  },
  {
    id: 'department',
    icon: Building2,
    accent: '#16A34A',
    name: 'Revenue by Department Report',
    description: 'Detailed revenue breakdown by department.',
    href: ROUTES.billingRevenueByDepartment,
  },
  {
    id: 'service',
    icon: Boxes,
    accent: '#D97706',
    name: 'Revenue by Service Report',
    description: 'Performance of each service and revenue generated.',
    href: ROUTES.billingRevenueByService,
  },
  {
    id: 'trend',
    icon: TrendingUp,
    accent: '#2563EB',
    name: 'Revenue Trend Report',
    description: 'Revenue trends over time with period comparison.',
  },
  {
    id: 'comparison',
    icon: BarChart3,
    accent: '#DC2626',
    name: 'Revenue Comparison Report',
    description: 'Compare revenue between periods or date ranges.',
  },
  {
    id: 'collection',
    icon: Landmark,
    accent: '#00B4D8',
    name: 'Revenue & Collection Report',
    description: 'Revenue vs collections and outstanding summary.',
  },
];

function toDateInputValue(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Returns null (→ "not enough data" caption) when the previous period has
// too little volume for a fair delta — same guard used throughout the
// Billing reports screens.
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

// ── Revenue Over Time — two filled-area series (This Period / Previous
// Period) sharing one axis, aligned by bucket index rather than absolute
// date so the two periods' shapes are directly comparable. Adapted from
// RevenueOverviewWorkspace's single-series RevenueAreaChart.
type ComparisonPoint = { label: string; current: number; previous: number };

function RevenueComparisonChart({ data }: { data: ComparisonPoint[] }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const max = Math.max(...data.flatMap((d) => [d.current, d.previous]), 1);
  const niceMax = Math.ceil(max / 100_000) * 100_000 || 100_000;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * niceMax);
  const W = 900;
  const H = 220;
  const stepX = data.length > 1 ? W / (data.length - 1) : 0;

  function seriesPoints(key: 'current' | 'previous') {
    return data.map((d, i) => ({
      x: data.length > 1 ? i * stepX : W / 2,
      y: H - (d[key] / niceMax) * H,
    }));
  }
  function lineFor(points: { x: number; y: number }[]) {
    return points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(' ');
  }
  function areaFor(points: { x: number; y: number }[]) {
    return `${lineFor(points)} L ${points[points.length - 1]?.x ?? 0} ${H} L ${points[0]?.x ?? 0} ${H} Z`;
  }

  const currentPts = seriesPoints('current');
  const previousPts = seriesPoints('previous');

  function handleMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * W;
    setHoverIdx(Math.max(0, Math.min(data.length - 1, Math.round(relX / (stepX || 1)))));
  }

  const hovered = hoverIdx !== null ? data[hoverIdx] : null;
  const hoveredX = hoverIdx !== null ? currentPts[hoverIdx]?.x : null;

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
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="absolute inset-x-0 top-0 cursor-crosshair"
          style={{ height: 'calc(100% - 24px)', width: '100%' }}
          onMouseMove={handleMove}
          onMouseLeave={() => setHoverIdx(null)}
        >
          <defs>
            <linearGradient id="revenue-reports-current" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563EB" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="revenue-reports-previous" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#16A34A" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#16A34A" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaFor(previousPts)} fill="url(#revenue-reports-previous)" stroke="none" />
          <path d={areaFor(currentPts)} fill="url(#revenue-reports-current)" stroke="none" />
          <path
            d={lineFor(previousPts)}
            fill="none"
            stroke="#16A34A"
            strokeWidth={2.5}
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={lineFor(currentPts)}
            fill="none"
            stroke="#2563EB"
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
          {currentPts.map((p, i) => (
            <circle
              key={`c-${i}`}
              cx={p.x}
              cy={p.y}
              r={hoverIdx === i ? 5 : 3}
              fill="#2563EB"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {previousPts.map((p, i) => (
            <circle
              key={`p-${i}`}
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
              This Period: {formatCurrencyWhole(hovered.current)}
            </p>
            <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#86EFAC' }}>
              Previous Period: {formatCurrencyWhole(hovered.previous)}
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
              {d.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function RevenueReportsWorkspace() {
  const router = useRouter();
  const toast = useToast();
  const [now] = useState(() => Date.now());
  const [allInvoices] = useState<InvoiceWithAccount[]>(() => buildAllInvoices());
  const [allPayments] = useState(() => buildAllPayments());
  const [allRefunds] = useState(() => buildAllRefunds());
  const [allAdjustments] = useState(() => buildAllAdjustments());

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
  const [appliedService, setAppliedService] = useState('');
  const [appliedMethod, setAppliedMethod] = useState('');

  function applyFilters() {
    setAppliedFrom(draftFrom);
    setAppliedTo(draftTo);
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
          (!appliedDepartment || inv.department === appliedDepartment) &&
          (!appliedService || inv.service === appliedService)
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
          (!appliedDepartment || inv.department === appliedDepartment) &&
          (!appliedService || inv.service === appliedService)
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
          (!appliedDepartment || p.department === appliedDepartment) &&
          (!appliedMethod || p.method === appliedMethod)
        );
      }),
    [allPayments, rangeStart, rangeEnd, appliedDepartment, appliedMethod],
  );

  const sumAmount = (list: { amount: number }[]) => list.reduce((s, x) => s + x.amount, 0);

  // ── Stat cards
  const totalRevenue = sumAmount(periodInvoices);
  const prevTotalRevenue = sumAmount(prevPeriodInvoices);
  const growthRate = pctDelta(totalRevenue, prevTotalRevenue);

  const refundsAdjustmentsTotal =
    allRefunds
      .filter((r) => {
        const t = new Date(r.date).getTime();
        return r.status === 'Processed' && t >= rangeStart && t <= rangeEnd;
      })
      .reduce((s, r) => s + r.amount, 0) +
    allAdjustments
      .filter((a) => {
        const t = new Date(a.date).getTime();
        return t >= rangeStart && t <= rangeEnd;
      })
      .reduce((s, a) => s + a.amount, 0);
  const netRevenue = Math.max(0, totalRevenue - refundsAdjustmentsTotal);

  const totalServices = INVOICE_SERVICE_OPTIONS.filter((s) =>
    periodInvoices.some((inv) => inv.service === s),
  ).length;

  const periodDays = Math.max(1, Math.round(periodLength / DAY_MS));
  const avgRevenuePerDay = totalRevenue / periodDays;
  const prevPeriodDays = Math.max(1, Math.round((prevEnd - prevStart) / DAY_MS));
  const prevAvgRevenuePerDay = prevTotalRevenue / prevPeriodDays;

  const totalTransactions = periodInvoices.length;
  const prevTotalTransactions = prevPeriodInvoices.length;

  const statCards: {
    icon: LucideIcon;
    label: string;
    value: string;
    caption: string;
    captionColor: string;
    accent: string;
  }[] = [
    {
      icon: TrendingUp,
      label: 'Total Revenue',
      value: formatCurrencyWhole(totalRevenue),
      caption:
        growthRate === null
          ? 'Not enough data to compare'
          : `${growthRate >= 0 ? '↑' : '↓'} ${Math.abs(growthRate)}% vs prior period`,
      captionColor: growthRate === null ? '#8A98A3' : growthRate >= 0 ? '#16A34A' : '#DC2626',
      accent: '#7C3AED',
    },
    {
      icon: Wallet,
      label: 'Net Revenue',
      value: formatCurrencyWhole(netRevenue),
      caption: (() => {
        const d = pctDelta(netRevenue, Math.max(0, prevTotalRevenue - refundsAdjustmentsTotal));
        return d === null
          ? 'Not enough data to compare'
          : `${d >= 0 ? '↑' : '↓'} ${Math.abs(d)}% vs prior period`;
      })(),
      captionColor: '#16A34A',
      accent: '#16A34A',
    },
    {
      icon: Boxes,
      label: 'Total Services',
      value: totalServices.toLocaleString('en-NG'),
      caption: (() => {
        const d = pctDelta(
          totalServices,
          INVOICE_SERVICE_OPTIONS.filter((s) => prevPeriodInvoices.some((inv) => inv.service === s))
            .length,
        );
        return d === null
          ? 'Not enough data to compare'
          : `${d >= 0 ? '↑' : '↓'} ${Math.abs(d)}% vs prior period`;
      })(),
      captionColor: '#00B4D8',
      accent: '#00B4D8',
    },
    {
      icon: ReceiptText,
      label: 'Avg. Revenue / Day',
      value: formatCurrencyWhole(Math.round(avgRevenuePerDay)),
      caption: (() => {
        const d = pctDelta(avgRevenuePerDay, prevAvgRevenuePerDay);
        return d === null
          ? 'Not enough data to compare'
          : `${d >= 0 ? '↑' : '↓'} ${Math.abs(d)}% vs prior period`;
      })(),
      captionColor: '#D97706',
      accent: '#D97706',
    },
    {
      icon: ClipboardList,
      label: 'Total Transactions',
      value: totalTransactions.toLocaleString('en-NG'),
      caption: (() => {
        const d = pctDelta(totalTransactions, prevTotalTransactions);
        return d === null
          ? 'Not enough data to compare'
          : `${d >= 0 ? '↑' : '↓'} ${Math.abs(d)}% vs prior period`;
      })(),
      captionColor: '#2563EB',
      accent: '#2563EB',
    },
    {
      icon: BarChart3,
      label: 'Growth Rate',
      value: growthRate === null ? '—' : `${growthRate >= 0 ? '' : '-'}${Math.abs(growthRate)}%`,
      caption: growthRate === null ? 'Not enough data to compare' : 'vs prior period',
      captionColor: growthRate === null ? '#8A98A3' : growthRate >= 0 ? '#16A34A' : '#DC2626',
      accent: growthRate === null ? '#8A98A3' : growthRate >= 0 ? '#16A34A' : '#DC2626',
    },
  ];

  // ── Revenue Over Time — 5 buckets spanning the applied date range, each
  // paired against the equivalent bucket exactly one period-length earlier.
  const comparisonData: ComparisonPoint[] = useMemo(() => {
    const bucketCount = 5;
    const bucketLen = Math.max(DAY_MS, Math.round(periodLength / bucketCount));
    return Array.from({ length: bucketCount }, (_, i) => {
      const bStart = rangeStart + i * bucketLen;
      const bEnd = i === bucketCount - 1 ? rangeEnd : bStart + bucketLen - 1;
      const pStart = bStart - periodLength;
      const pEnd = bEnd - periodLength;
      const label = `${new Date(bStart).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} - ${new Date(bEnd).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`;
      const current = sumAmount(
        allInvoices.filter((inv) => {
          const t = new Date(inv.date).getTime();
          return t >= bStart && t <= bEnd && inv.status !== 'Cancelled';
        }),
      );
      const previous = sumAmount(
        allInvoices.filter((inv) => {
          const t = new Date(inv.date).getTime();
          return t >= pStart && t <= pEnd && inv.status !== 'Cancelled';
        }),
      );
      return { label, current, previous };
    });
  }, [allInvoices, rangeStart, rangeEnd, periodLength]);

  // ── Revenue by Department
  const departmentBreakdown = BILLING_ACCOUNT_DEPARTMENTS.map((d) => ({
    department: d,
    amount: periodInvoices
      .filter((inv) => inv.department === d)
      .reduce((s, inv) => s + inv.amount, 0),
  }))
    .filter((d) => d.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  // ── Top Revenue Generating Services
  const serviceBreakdown = INVOICE_SERVICE_OPTIONS.map((s) => {
    const invs = periodInvoices.filter((inv) => inv.service === s);
    const revenue = invs.reduce((sum, inv) => sum + inv.amount, 0);
    return {
      service: s,
      department: SERVICE_DEPARTMENT[s] ?? BILLING_ACCOUNT_DEPARTMENTS[0]!,
      revenue,
      transactions: invs.length,
      avgRevenue: invs.length > 0 ? revenue / invs.length : 0,
    };
  })
    .filter((s) => s.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // ── Revenue by Payment Method
  const methodBreakdown = PAYMENT_METHODS.map((m) => ({
    method: m,
    amount: periodPayments.filter((p) => p.method === m).reduce((s, p) => s + p.amount, 0),
    count: periodPayments.filter((p) => p.method === m).length,
    color: METHOD_COLORS[m] ?? '#8A98A3',
  })).filter((m) => m.amount > 0);
  const methodTotal = sumAmount(periodPayments);

  // ── Key Insights — computed from real data, never fabricated
  const topDepartment = departmentBreakdown[0];
  const topMethodByUsage = [...methodBreakdown].sort((a, b) => b.count - a.count)[0];

  const departmentOptions = BILLING_ACCOUNT_DEPARTMENTS.map((d) => ({ value: d, label: d }));
  const serviceOptions = INVOICE_SERVICE_OPTIONS.map((s) => ({ value: s, label: s }));
  const methodOptions = PAYMENT_METHODS.map((m) => ({ value: m, label: m }));
  const reportTypeOptions = [
    { value: 'Revenue Summary', label: 'Revenue Summary' },
    { value: 'Revenue by Department', label: 'Revenue by Department' },
    { value: 'Revenue by Service', label: 'Revenue by Service' },
    { value: 'Revenue Trend', label: 'Revenue Trend' },
  ];

  function handleExport() {
    downloadCSV('revenue-reports-overview', [
      ['Section', 'Label', 'Amount / Count', 'Detail'],
      ...statCards.map((s) => ['Stat', s.label, s.value, s.caption]),
      ...departmentBreakdown.map((d) => [
        'Revenue by Department',
        d.department,
        String(d.amount),
        '',
      ]),
      ...serviceBreakdown.map((s) => [
        'Top Revenue Generating Services',
        s.service,
        String(s.revenue),
        `${s.department} — ${s.transactions} transactions`,
      ]),
      ...methodBreakdown.map((m) => ['Revenue by Payment Method', m.method, String(m.amount), '']),
    ]);
    toast.success('Export ready', 'Revenue Reports overview exported as CSV.');
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
    if (report.href) {
      router.push(report.href);
      return;
    }
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
              Revenue Reports
            </h1>
            <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
              Track and analyze revenue performance across departments, services and time periods
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
                id="revenue-reports-type"
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
                id="revenue-reports-department"
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
                id="revenue-reports-service"
                value={draftService}
                onChange={setDraftService}
                options={serviceOptions}
                placeholder="All Services"
              />
            </div>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label
                className="mb-1.5 block font-sans font-medium"
                style={{ fontSize: 14, color: '#0D2630' }}
              >
                Payment Method
              </label>
              <FormSelect
                id="revenue-reports-method"
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

        {/* Revenue Over Time + Revenue by Department */}
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
                  Revenue Over Time
                </h2>
                <InfoTip text="This period's billed revenue vs. the equivalent stretch of the prior period, from real invoices." />
              </div>
              <div className="flex flex-wrap gap-2.5">
                <div className="flex items-center gap-1.5">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ background: '#2563EB' }}
                  />
                  <span style={{ fontSize: 14, color: '#4A7080' }}>This Period (₦)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ background: '#16A34A' }}
                  />
                  <span style={{ fontSize: 14, color: '#4A7080' }}>Previous Period (₦)</span>
                </div>
              </div>
            </div>
            <RevenueComparisonChart data={comparisonData} />
          </div>

          <div
            className="rounded-[12px] p-4 sm:p-5"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
              Revenue by Department
            </h2>
            {departmentBreakdown.length === 0 ? (
              <p className="mt-4" style={{ fontSize: 14, color: '#8A98A3' }}>
                No revenue for the current filters.
              </p>
            ) : (
              <>
                <div className="mt-3 flex items-center justify-center">
                  <AnimatedDonutChart
                    breakdown={departmentBreakdown.map((d) => ({
                      label: d.department,
                      value: d.amount,
                      color: DEPARTMENT_COLORS[d.department] ?? '#8A98A3',
                    }))}
                    total={totalRevenue}
                    size={140}
                    ariaLabel="Revenue by department donut chart"
                    centerValue={formatCurrencyCompact(totalRevenue)}
                    centerLabel="Total Revenue"
                  />
                </div>
                <div className="mt-3 flex flex-col gap-2">
                  {departmentBreakdown.map((d) => (
                    <div key={d.department} className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <span
                          className="size-2 shrink-0 rounded-full"
                          style={{ background: DEPARTMENT_COLORS[d.department] ?? '#8A98A3' }}
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
                        ({((d.amount / (totalRevenue || 1)) * 100).toFixed(1)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Top Revenue Generating Services — full-width row */}
        <div
          className="mt-4 rounded-[12px] p-4 sm:p-5"
          style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
        >
          <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
            Top Revenue Generating Services
          </h2>
          {serviceBreakdown.length === 0 ? (
            <p className="mt-4" style={{ fontSize: 14, color: '#8A98A3' }}>
              No revenue for the current filters.
            </p>
          ) : (
            <div className="mt-3">
              <ScrollableTable minWidth={970}>
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
                  <div className="max-w-[220px] min-w-[140px] flex-1 py-2.5 pr-3">
                    <span
                      className="font-sans font-bold tracking-wider uppercase"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      Service
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
                  <div className="w-36 shrink-0 py-2.5 pr-3 pl-6 text-center">
                    <span
                      className="font-sans font-bold tracking-wider uppercase"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      Revenue
                    </span>
                  </div>
                  <div className="w-32 shrink-0 py-2.5 pr-3 text-center">
                    <span
                      className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      % of Total
                    </span>
                  </div>
                  <div className="w-32 shrink-0 py-2.5 pr-3 text-center">
                    <span
                      className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      Transactions
                    </span>
                  </div>
                  <div className="w-32 shrink-0 py-2.5 pr-4 text-center">
                    <span
                      className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      Avg. Revenue
                    </span>
                  </div>
                </div>
                {serviceBreakdown.map((s, i) => (
                  <div
                    key={s.service}
                    className="flex items-center transition-colors duration-100 hover:bg-[#F5FBFD]"
                    style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                  >
                    <div className="w-8 shrink-0 py-3 pr-2 pl-3">
                      <p style={{ fontSize: 14, color: '#8A98A3' }}>{i + 1}</p>
                    </div>
                    <div className="max-w-[220px] min-w-[140px] flex-1 py-3 pr-3">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="size-2 shrink-0 rounded-full"
                          style={{ background: SERVICE_COLORS[s.service] ?? '#8A98A3' }}
                        />
                        <Tooltip content={s.service}>
                          <p
                            className="truncate font-sans font-medium"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {s.service}
                          </p>
                        </Tooltip>
                      </div>
                    </div>
                    <div className="w-36 shrink-0 py-3 pr-3">
                      <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                        {s.department}
                      </p>
                    </div>
                    <div className="w-36 shrink-0 py-3 pr-3 pl-6 text-center">
                      <p style={{ fontSize: 14, color: '#0D2630' }}>
                        {formatCurrencyWhole(s.revenue)}
                      </p>
                    </div>
                    <div className="w-32 shrink-0 py-3 pr-3 text-center">
                      <p style={{ fontSize: 14, color: '#4A7080' }}>
                        {((s.revenue / (totalRevenue || 1)) * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div className="w-32 shrink-0 py-3 pr-3 text-center">
                      <p style={{ fontSize: 14, color: '#4A7080' }}>
                        {s.transactions.toLocaleString('en-NG')}
                      </p>
                    </div>
                    <div className="w-32 shrink-0 py-3 pr-4 text-center">
                      <p style={{ fontSize: 14, color: '#4A7080' }}>
                        {formatCurrencyWhole(Math.round(s.avgRevenue))}
                      </p>
                    </div>
                  </div>
                ))}
              </ScrollableTable>
            </div>
          )}
          <button
            type="button"
            onClick={() => router.push(ROUTES.billingRevenueByService)}
            className={`mt-3 font-sans font-medium transition-colors duration-150 hover:underline ${FOCUS_RING}`}
            style={{ fontSize: 14, color: '#00B4D8' }}
          >
            View all services report →
          </button>
        </div>

        {/* Revenue by Payment Method + Key Insights */}
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-start">
          <div
            className="rounded-[12px] p-4 sm:p-6"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
              Revenue by Payment Method
            </h2>
            {methodBreakdown.length === 0 ? (
              <p className="mt-4" style={{ fontSize: 14, color: '#8A98A3' }}>
                No payments for the current filters.
              </p>
            ) : (
              <>
                <div className="mt-4 flex items-center justify-center">
                  <AnimatedDonutChart
                    breakdown={methodBreakdown.map((m) => ({
                      label: m.method,
                      value: m.amount,
                      color: m.color,
                    }))}
                    total={methodTotal}
                    size={140}
                    ariaLabel="Revenue by payment method donut chart"
                    centerValue={formatCurrencyCompact(methodTotal)}
                    centerLabel="Total Revenue"
                  />
                </div>
                <div className="mt-4 flex flex-col gap-2">
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
                        ({((m.amount / (methodTotal || 1)) * 100).toFixed(1)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div
            className="rounded-[12px] p-4 sm:p-6"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
              Key Insights
            </h2>
            <div className="mt-4 flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <div
                  className="flex size-9 shrink-0 items-center justify-center rounded-full"
                  style={{
                    background:
                      growthRate === null || growthRate >= 0
                        ? 'rgba(22,163,74,0.1)'
                        : 'rgba(220,38,38,0.1)',
                  }}
                >
                  {growthRate === null || growthRate >= 0 ? (
                    <TrendingUp style={{ width: 16, height: 16, color: '#16A34A' }} />
                  ) : (
                    <TrendingDown style={{ width: 16, height: 16, color: '#DC2626' }} />
                  )}
                </div>
                <p className="min-w-0 flex-1" style={{ fontSize: 14, color: '#0D2630' }}>
                  {growthRate === null
                    ? 'Not enough data yet to compare revenue against the prior period.'
                    : `Revenue ${growthRate >= 0 ? 'increased' : 'decreased'} by ${Math.abs(growthRate)}% compared to the prior period.`}
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div
                  className="flex size-9 shrink-0 items-center justify-center rounded-full"
                  style={{ background: 'rgba(37,99,235,0.1)' }}
                >
                  <Building2 style={{ width: 16, height: 16, color: '#2563EB' }} />
                </div>
                <p className="min-w-0 flex-1" style={{ fontSize: 14, color: '#0D2630' }}>
                  {topDepartment
                    ? `${topDepartment.department} department generated the highest revenue.`
                    : 'No department revenue recorded for the current filters.'}
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div
                  className="flex size-9 shrink-0 items-center justify-center rounded-full"
                  style={{ background: 'rgba(0,180,216,0.1)' }}
                >
                  <Landmark style={{ width: 16, height: 16, color: '#00B4D8' }} />
                </div>
                <p className="min-w-0 flex-1" style={{ fontSize: 14, color: '#0D2630' }}>
                  {topMethodByUsage
                    ? `${topMethodByUsage.method} is the most used payment method.`
                    : 'No payments recorded for the current filters.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => router.push(ROUTES.billingRevenue)}
              className={`mt-4 flex items-center gap-1 font-sans font-medium transition-colors duration-150 hover:underline ${FOCUS_RING}`}
              style={{ fontSize: 14, color: '#00B4D8' }}
            >
              View detailed insights →
            </button>
          </div>
        </div>

        {/* Available Revenue Reports */}
        <div
          className="mt-4 rounded-[12px] p-4 sm:p-5"
          style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
        >
          <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
            Available Revenue Reports
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
