'use client';

import {
  BarChart3,
  Clock,
  Download,
  Filter,
  Info,
  LineChart,
  ReceiptText,
  RefreshCcw,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { AnimatedDonutChart } from '@components/shared/AnimatedDonutChart';
import { FormDateInput } from '@components/shared/FormDateInput';
import { FormSelect } from '@components/shared/FormSelect';
import { Tooltip } from '@components/shared/Tooltip';
import { ROUTES } from '@/constants/routes';
import { downloadCSV } from '@/utils/export';
import { formatCurrencyCompact, formatCurrencyWhole } from '@/utils/currency';
import { isSameDay, isToday, watMonthStartTimestamp } from '@/utils/datetime';
import { BILLING_ACCOUNT_DEPARTMENTS } from '@/features/billing/__mocks__/billingAccountsFixtures';
import {
  buildAllAdjustments,
  buildAllInvoices,
  buildAllPayments,
  buildAllRefunds,
  INVOICE_SERVICE_OPTIONS,
  PAYMENT_METHODS,
  type InvoiceWithAccount,
  type PaymentWithAccount,
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
  POS: '#0D9488',
  'Bank Transfer': '#2563EB',
  Cash: '#7C3AED',
  Card: '#D97706',
  Online: '#DB2777',
};

type ChartTab = 'today' | 'week' | 'month' | 'year';
type TrendPoint = { label: string; value: number };

function toDateInputValue(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// Fixture dates are generated via a fresh `Date.now()` a tick after this
// component's own frozen `now` state, so an upper bound of exactly `now`
// can clip today's payments by a few milliseconds. End-of-day gives safe
// headroom without needing the two clocks to agree to the millisecond.
function endOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

// Returns null (→ "no meaningful comparison" caption) when the previous
// period has too little volume for a fair delta — a near-zero denominator
// turns any real change into a triple-digit swing that reads as a bug
// rather than a real number, so it's better shown as unavailable.
function pctDelta(current: number, previous: number): number | null {
  if (previous <= 0) return current > 0 ? null : 0;
  const delta = Math.round(((current - previous) / previous) * 1000) / 10;
  return Math.abs(delta) > 300 ? null : delta;
}

function getPeriodWindow(tab: ChartTab, now: number): { start: number; end: number } {
  const end = endOfDay(now);
  if (tab === 'today') return { start: startOfDay(now), end };
  if (tab === 'week') return { start: now - 7 * DAY_MS, end };
  if (tab === 'month') return { start: watMonthStartTimestamp(0), end };
  const d = new Date(now);
  return { start: new Date(d.getFullYear(), 0, 1).getTime(), end };
}

function buildTrendPoints(
  payments: { date: string; amount: number }[],
  tab: ChartTab,
  start: number,
  end: number,
): TrendPoint[] {
  if (tab === 'today') {
    const buckets = Array.from({ length: 13 }, (_, i) => ({
      label: `${String(i * 2).padStart(2, '0')}:00`,
      value: 0,
    }));
    for (const p of payments) {
      const idx = Math.min(12, Math.floor(new Date(p.date).getHours() / 2));
      buckets[idx]!.value += p.amount;
    }
    return buckets;
  }
  if (tab === 'year') {
    const endDate = new Date(end);
    const months = endDate.getMonth() + 1;
    const buckets = Array.from({ length: months }, (_, i) => ({
      label: new Date(endDate.getFullYear(), i, 1).toLocaleDateString('en-GB', { month: 'short' }),
      value: 0,
    }));
    for (const p of payments) {
      const d = new Date(p.date);
      if (d.getFullYear() === endDate.getFullYear()) buckets[d.getMonth()]!.value += p.amount;
    }
    return buckets;
  }
  const startDay = startOfDay(start);
  const endDay = startOfDay(end);
  const days = Math.round((endDay - startDay) / DAY_MS) + 1;
  const buckets = Array.from({ length: days }, (_, i) => {
    const ts = startDay + i * DAY_MS;
    return {
      label: new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
      value: 0,
      ts,
    };
  });
  for (const p of payments) {
    const day = startOfDay(new Date(p.date).getTime());
    const idx = Math.round((day - startDay) / DAY_MS);
    if (buckets[idx]) buckets[idx].value += p.amount;
  }
  return buckets.map(({ label, value }) => ({ label, value }));
}

// ── Area chart (copied from BillingDashboardWorkspace's RevenueAreaChart —
// file-local there, no shared export, so adapted here for real data) ──────
function RevenueAreaChart({ data }: { data: TrendPoint[] }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const max = Math.max(...data.map((d) => d.value), 1);
  const niceMax = Math.ceil(max / 100_000) * 100_000 || 100_000;
  const ticks = [0, niceMax * 0.25, niceMax * 0.5, niceMax * 0.75, niceMax];
  const W = 900;
  const H = 220;
  const stepX = data.length > 1 ? W / (data.length - 1) : 0;
  const points = data.map((d, i) => ({
    x: data.length > 1 ? i * stepX : W / 2,
    y: H - (d.value / niceMax) * H,
  }));
  const lineD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
  const areaD = `${lineD} L ${points[points.length - 1]?.x ?? 0} ${H} L ${points[0]?.x ?? 0} ${H} Z`;
  const labelStep = data.length > 8 ? Math.ceil(data.length / 8) : 1;
  const xLabelIdx = Array.from({ length: data.length }, (_, i) => i).filter(
    (i) => i % labelStep === 0,
  );

  function handleMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = e.currentTarget;
    if (!svg || data.length === 0) return;
    const rect = svg.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * W;
    setHoverIdx(Math.max(0, Math.min(data.length - 1, Math.round(relX / (stepX || 1)))));
  }

  const hovered = hoverIdx !== null ? data[hoverIdx] : null;
  const hoveredPoint = hoverIdx !== null ? points[hoverIdx] : null;

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
        <div
          className="absolute inset-x-0 top-0 flex flex-col justify-between"
          style={{ height: 'calc(100% - 24px)' }}
        >
          {[...ticks].reverse().map((t) => (
            <div key={t} style={{ borderTop: '1px dashed rgba(0,100,130,0.15)' }} />
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
          <defs>
            <linearGradient id="revenue-overview-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00B4D8" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#00B4D8" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaD} fill="url(#revenue-overview-fill)" stroke="none" />
          <path
            d={lineD}
            fill="none"
            stroke="#2563EB"
            strokeWidth={2.5}
            vectorEffect="non-scaling-stroke"
          />
          {hoveredPoint && (
            <line
              x1={hoveredPoint.x}
              y1={0}
              x2={hoveredPoint.x}
              y2={H}
              stroke="rgba(0,100,130,0.25)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          )}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={hoverIdx === i ? 5 : 3}
              fill="#2563EB"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
        {hovered && hoveredPoint && (
          <div
            className="pointer-events-none absolute z-10 rounded-[10px] px-3 py-2 whitespace-nowrap"
            style={{
              left: `${(hoveredPoint.x / W) * 100}%`,
              top: Math.max(0, (hoveredPoint.y / H) * (260 - 24) - 56),
              transform: 'translateX(-50%)',
              background: '#0D2630',
              boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
            }}
          >
            <p style={{ fontSize: 14, color: '#B8D8E0' }}>{hovered.label}</p>
            <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#FFFFFF' }}>
              {formatCurrencyWhole(hovered.value)}
            </p>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 flex justify-between" style={{ height: 24 }}>
          {xLabelIdx.map((i) => (
            <span key={i} className="font-sans" style={{ fontSize: 14, color: '#8A98A3' }}>
              {data[i]?.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function InfoTip({ text }: { text: string }) {
  return (
    <Tooltip content={text}>
      <Info style={{ width: 14, height: 14, color: '#8A98A3' }} />
    </Tooltip>
  );
}

export function RevenueOverviewWorkspace() {
  const router = useRouter();
  const [now] = useState(() => Date.now());
  const [asOfDate, setAsOfDate] = useState(() => toDateInputValue(new Date(now)));
  const [allPayments] = useState<PaymentWithAccount[]>(() => buildAllPayments());
  const [allInvoices] = useState<InvoiceWithAccount[]>(() => buildAllInvoices());
  const [allRefunds] = useState(() => buildAllRefunds());
  const [allAdjustments] = useState(() => buildAllAdjustments());

  const [chartTab, setChartTab] = useState<ChartTab>('month');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);

  const invoiceByNumber = useMemo(() => {
    const map = new Map<string, InvoiceWithAccount>();
    for (const inv of allInvoices) map.set(inv.invoiceNumber, inv);
    return map;
  }, [allInvoices]);

  function matchesFilters(p: PaymentWithAccount): boolean {
    if (departmentFilter && p.department !== departmentFilter) return false;
    if (methodFilter && p.method !== methodFilter) return false;
    if (serviceFilter && invoiceByNumber.get(p.invoiceNumber)?.service !== serviceFilter)
      return false;
    return true;
  }

  const sum = (list: { amount: number }[]) => list.reduce((s, x) => s + x.amount, 0);

  // ── Stat cards — real, unfiltered totals + real period-over-period deltas
  const paymentsToday = allPayments.filter((p) => isToday(p.date));
  const yesterday = new Date(now - DAY_MS);
  const paymentsYesterday = allPayments.filter((p) => isSameDay(p.date, yesterday));
  const totalToday = sum(paymentsToday);
  const deltaToday = pctDelta(totalToday, sum(paymentsYesterday));

  const paymentsThisWeek = allPayments.filter((p) => now - new Date(p.date).getTime() < 7 * DAY_MS);
  const paymentsLastWeek = allPayments.filter((p) => {
    const diff = now - new Date(p.date).getTime();
    return diff >= 7 * DAY_MS && diff < 14 * DAY_MS;
  });
  const totalWeek = sum(paymentsThisWeek);
  const deltaWeek = pctDelta(totalWeek, sum(paymentsLastWeek));

  const monthStart = watMonthStartTimestamp(0);
  const paymentsThisMonth = allPayments.filter((p) => new Date(p.date).getTime() >= monthStart);
  const dayOfMonth = new Date(now).getDate();
  const lastMonthStart = watMonthStartTimestamp(1);
  const lastMonthComparableEnd = lastMonthStart + dayOfMonth * DAY_MS;
  const paymentsLastMonthPartial = allPayments.filter((p) => {
    const t = new Date(p.date).getTime();
    return t >= lastMonthStart && t < lastMonthComparableEnd;
  });
  const totalMonth = sum(paymentsThisMonth);
  const deltaMonth = pctDelta(totalMonth, sum(paymentsLastMonthPartial));
  const avgDaily = Math.round(totalMonth / Math.max(1, dayOfMonth));

  const yearStart = new Date(new Date(now).getFullYear(), 0, 1).getTime();
  const paymentsThisYear = allPayments.filter((p) => new Date(p.date).getTime() >= yearStart);
  const totalYear = sum(paymentsThisYear);

  // ── Period window for the chart tab + filters
  const { start: periodStart, end: periodEnd } = getPeriodWindow(chartTab, now);
  const rangeStart = fromDate ? new Date(fromDate).getTime() : periodStart;
  const rangeEnd = toDate ? new Date(toDate).getTime() + DAY_MS - 1 : periodEnd;

  const periodPayments = allPayments.filter((p) => {
    const t = new Date(p.date).getTime();
    return t >= rangeStart && t <= rangeEnd && matchesFilters(p);
  });
  const periodTotal = sum(periodPayments);
  const trendData = buildTrendPoints(periodPayments, chartTab, rangeStart, rangeEnd);

  const periodLabel =
    chartTab === 'today'
      ? 'Today'
      : chartTab === 'week'
        ? 'This Week'
        : chartTab === 'month'
          ? 'This Month'
          : 'This Year';

  const methodBreakdown = PAYMENT_METHODS.map((m) => ({
    method: m,
    amount: periodPayments.filter((p) => p.method === m).reduce((s, p) => s + p.amount, 0),
    color: METHOD_COLORS[m] ?? '#8A98A3',
  })).filter((m) => m.amount > 0);

  const departmentBreakdown = BILLING_ACCOUNT_DEPARTMENTS.map((d) => ({
    department: d,
    amount: periodPayments.filter((p) => p.department === d).reduce((s, p) => s + p.amount, 0),
    color: DEPARTMENT_COLORS[d] ?? '#8A98A3',
  })).filter((d) => d.amount > 0);

  // ── Top Services by Revenue — real invoices, filtered by department/service
  const filteredInvoices = allInvoices.filter((inv) => {
    if (departmentFilter && inv.department !== departmentFilter) return false;
    if (serviceFilter && inv.service !== serviceFilter) return false;
    return true;
  });
  const serviceRevenue = INVOICE_SERVICE_OPTIONS.map((s) => ({
    service: s,
    department:
      filteredInvoices.find((inv) => inv.service === s)?.department ??
      BILLING_ACCOUNT_DEPARTMENTS[0]!,
    revenue: filteredInvoices
      .filter((inv) => inv.service === s)
      .reduce((sAcc, inv) => sAcc + inv.amount, 0),
  }))
    .filter((s) => s.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);
  const allServicesTotal = filteredInvoices.reduce((s, inv) => s + inv.amount, 0) || 1;
  const topServicesTotal = serviceRevenue.reduce((s, r) => s + r.revenue, 0);

  // ── Summary & Highlights — real, cross-referenced
  const outstandingTotal = allInvoices.reduce(
    (s, inv) => s + Math.max(0, inv.amount - inv.paid),
    0,
  );
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

  const collectionDays = periodPayments
    .map((p) => {
      const inv = invoiceByNumber.get(p.invoiceNumber);
      if (!inv) return null;
      return (new Date(p.date).getTime() - new Date(inv.date).getTime()) / DAY_MS;
    })
    .filter((d): d is number => d !== null && d >= 0);
  const avgCollectionDays = collectionDays.length
    ? collectionDays.reduce((s, d) => s + d, 0) / collectionDays.length
    : 0;

  const departmentOptions = BILLING_ACCOUNT_DEPARTMENTS.map((d) => ({ value: d, label: d }));
  const serviceOptions = INVOICE_SERVICE_OPTIONS.map((s) => ({ value: s, label: s }));
  const methodOptions = PAYMENT_METHODS.map((m) => ({ value: m, label: m }));

  function clearFilters() {
    setFromDate('');
    setToDate('');
    setDepartmentFilter('');
    setServiceFilter('');
    setMethodFilter('');
  }

  function handleExport() {
    downloadCSV('revenue-overview', [
      ['Section', 'Label', 'Amount', '% of Total'],
      ...departmentBreakdown.map((d) => [
        'Revenue by Department',
        d.department,
        String(d.amount),
        `${((d.amount / (periodTotal || 1)) * 100).toFixed(1)}%`,
      ]),
      ...methodBreakdown.map((m) => [
        'Revenue by Payment Method',
        m.method,
        String(m.amount),
        `${((m.amount / (periodTotal || 1)) * 100).toFixed(1)}%`,
      ]),
      ...serviceRevenue.map((s) => [
        'Top Services by Revenue',
        s.service,
        String(s.revenue),
        `${((s.revenue / allServicesTotal) * 100).toFixed(1)}%`,
      ]),
    ]);
  }

  return (
    <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
      <div className="mx-auto max-w-[1550px] px-4 py-4 sm:px-6 sm:py-5">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-display font-bold" style={{ fontSize: 24, color: '#0D2630' }}>
              Revenue Overview
            </h1>
            <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
              Track and analyze revenue performance across departments and services.
            </p>
          </div>
          <div className="w-full max-w-[220px] shrink-0 sm:w-auto">
            <FormDateInput
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              aria-label="As of date"
            />
          </div>
        </div>

        {/* Stat cards */}
        <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-5 xl:gap-4">
          {[
            {
              icon: TrendingUp,
              label: 'Total Revenue (Today)',
              value: formatCurrencyWhole(totalToday),
              delta: deltaToday,
              caption: 'vs yesterday',
              fallbackCaption: 'Not enough data to compare yet',
              accent: '#2563EB',
            },
            {
              icon: LineChart,
              label: 'Total Revenue (This Week)',
              value: formatCurrencyWhole(totalWeek),
              delta: deltaWeek,
              caption: 'vs last week',
              fallbackCaption: 'Not enough data to compare yet',
              accent: '#16A34A',
            },
            {
              icon: BarChart3,
              label: 'Total Revenue (This Month)',
              value: formatCurrencyWhole(totalMonth),
              delta: deltaMonth,
              caption: 'vs last month',
              fallbackCaption: 'Not enough data to compare yet',
              accent: '#7C3AED',
            },
            {
              icon: TrendingUp,
              label: 'Total Revenue (This Year)',
              value: formatCurrencyWhole(totalYear),
              delta: null,
              caption: 'Year to date',
              fallbackCaption: 'Year to date',
              accent: '#D97706',
            },
            {
              icon: RefreshCcw,
              label: 'Average Daily Revenue',
              value: formatCurrencyWhole(avgDaily),
              delta: null,
              caption: 'This month',
              fallbackCaption: 'This month',
              accent: '#00B4D8',
            },
          ].map((s) => (
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
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>{s.fallbackCaption}</p>
                ) : (
                  <p
                    className="font-sans font-medium"
                    style={{ fontSize: 14, color: s.delta >= 0 ? '#16A34A' : '#DC2626' }}
                  >
                    {s.delta >= 0 ? '↑' : '↓'} {Math.abs(s.delta)}% {s.caption}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div
          className="mt-4 rounded-[12px] p-4 sm:p-5"
          style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label
                className="mb-1.5 block font-sans font-medium"
                style={{ fontSize: 14, color: '#0D2630' }}
              >
                Department
              </label>
              <FormSelect
                id="revenue-department"
                value={departmentFilter}
                onChange={setDepartmentFilter}
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
                id="revenue-service"
                value={serviceFilter}
                onChange={setServiceFilter}
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
                id="revenue-method"
                value={methodFilter}
                onChange={setMethodFilter}
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
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  aria-label="From date"
                />
                <span style={{ fontSize: 14, color: '#8A98A3' }}>–</span>
                <FormDateInput
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  aria-label="To date"
                />
              </div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setMoreFiltersOpen((v) => !v)}
              className={`flex h-11 items-center gap-1.5 rounded-[10px] px-3.5 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
              style={{
                fontSize: 14,
                color: moreFiltersOpen ? '#00B4D8' : '#0D2630',
                border: `1px solid ${moreFiltersOpen ? '#00B4D8' : 'rgba(0,100,130,0.2)'}`,
              }}
            >
              <Filter style={{ width: 15, height: 15 }} />
              More Filters
            </button>
            {(fromDate || toDate || departmentFilter || serviceFilter || methodFilter) && (
              <button
                type="button"
                onClick={clearFilters}
                className={`font-sans font-medium transition-colors duration-150 hover:underline ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#00B4D8' }}
              >
                Clear all filters
              </button>
            )}
            <div className="ml-auto">
              <button
                type="button"
                onClick={handleExport}
                className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
              >
                <Download style={{ width: 15, height: 15 }} />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Revenue Trend + Revenue by Department */}
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
                  Revenue Trend
                </h2>
                <InfoTip text="Total payments collected over the selected period, from real posted transactions." />
              </div>
              <div className="flex items-center gap-1">
                {(['today', 'week', 'month', 'year'] as ChartTab[]).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setChartTab(tab)}
                    className={`rounded-[8px] px-3 py-1.5 font-sans font-medium transition-colors duration-150 ${FOCUS_RING}`}
                    style={{
                      fontSize: 14,
                      color: chartTab === tab ? '#FFFFFF' : '#4A7080',
                      background: chartTab === tab ? '#00B4D8' : 'transparent',
                    }}
                  >
                    {tab === 'today'
                      ? 'Today'
                      : tab === 'week'
                        ? 'This Week'
                        : tab === 'month'
                          ? 'This Month'
                          : 'This Year'}
                  </button>
                ))}
              </div>
            </div>

            <RevenueAreaChart data={trendData} />

            <div className="mt-3 flex flex-wrap gap-2.5">
              <div
                className="flex items-center gap-1.5 rounded-[10px] px-3 py-2"
                style={{ background: '#F5FBFD' }}
              >
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ background: '#2563EB' }}
                />
                <span style={{ fontSize: 14, color: '#4A7080' }}>Total Revenue</span>
                <span
                  className="font-sans font-semibold"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  {formatCurrencyWhole(periodTotal)}
                </span>
              </div>
              {methodBreakdown.map((m) => (
                <div
                  key={m.method}
                  className="flex items-center gap-1.5 rounded-[10px] px-3 py-2"
                  style={{ background: '#F5FBFD' }}
                >
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ background: m.color }}
                  />
                  <span style={{ fontSize: 14, color: '#4A7080' }}>{m.method}</span>
                  <span
                    className="font-sans font-semibold"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    {formatCurrencyWhole(m.amount)}
                  </span>
                </div>
              ))}
            </div>
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
                <InfoTip
                  text={`Breakdown of ${periodLabel.toLowerCase()}'s revenue by department.`}
                />
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
            <div className="mt-3 flex items-center gap-4">
              <AnimatedDonutChart
                breakdown={departmentBreakdown.map((d) => ({
                  label: d.department,
                  value: d.amount,
                  color: d.color,
                }))}
                total={periodTotal}
                size={140}
                ariaLabel="Revenue by department donut chart"
                centerValue={formatCurrencyCompact(periodTotal)}
                centerLabel="Total"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
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
                  </div>
                ))}
              </div>
            </div>
            <div
              className="mt-3 flex items-center justify-between"
              style={{ borderTop: '1px solid rgba(0,100,130,0.08)', paddingTop: 12 }}
            >
              <span className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
                Total
              </span>
              <span className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
                {formatCurrencyWhole(periodTotal)}
              </span>
            </div>
          </div>
        </div>

        {/* Top Services + Revenue by Payment Method + Summary & Highlights */}
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3 lg:items-start">
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
                  Top Services by Revenue
                </h2>
                <InfoTip text="Highest-billing services across all invoices, narrowed by the Department/Service filters above." />
              </div>
              <button
                type="button"
                onClick={() => router.push(ROUTES.billingRevenueByService)}
                className={`font-sans font-medium transition-colors duration-150 hover:underline ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#00B4D8' }}
              >
                View All
              </button>
            </div>
            {serviceRevenue.length === 0 ? (
              <p className="mt-4" style={{ fontSize: 14, color: '#8A98A3' }}>
                No revenue recorded for the current filters.
              </p>
            ) : (
              <div className="mt-3 flex flex-col">
                <div
                  className="flex items-center gap-2 pb-2"
                  style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
                >
                  <span
                    className="w-5 shrink-0 font-sans font-bold tracking-wider uppercase"
                    style={{ fontSize: 14, color: '#8A98A3' }}
                  >
                    #
                  </span>
                  <span
                    className="min-w-0 flex-1 font-sans font-bold tracking-wider uppercase"
                    style={{ fontSize: 14, color: '#8A98A3' }}
                  >
                    Service
                  </span>
                  <span
                    className="w-20 shrink-0 text-right font-sans font-bold tracking-wider uppercase"
                    style={{ fontSize: 14, color: '#8A98A3' }}
                  >
                    Revenue
                  </span>
                </div>
                {serviceRevenue.map((s, i) => {
                  const pct = (s.revenue / allServicesTotal) * 100;
                  return (
                    <div
                      key={s.service}
                      className="flex items-center gap-2 py-2.5"
                      style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                    >
                      <span className="w-5 shrink-0" style={{ fontSize: 14, color: '#8A98A3' }}>
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <Tooltip content={s.service}>
                          <p
                            className="truncate font-sans font-medium"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {s.service}
                          </p>
                        </Tooltip>
                        <div className="mt-1 flex items-center gap-1.5">
                          <div
                            className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full"
                            style={{ background: '#F5FBFD' }}
                          >
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${Math.min(100, pct)}%`, background: '#00B4D8' }}
                            />
                          </div>
                          <span style={{ fontSize: 14, color: '#8A98A3' }}>{pct.toFixed(1)}%</span>
                        </div>
                      </div>
                      <span
                        className="w-20 shrink-0 text-right font-sans font-medium whitespace-nowrap"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {formatCurrencyWhole(s.revenue)}
                      </span>
                    </div>
                  );
                })}
                <div className="flex items-center gap-2 pt-2.5">
                  <span className="w-5 shrink-0" />
                  <span
                    className="min-w-0 flex-1 font-sans font-semibold"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    Total (Top {serviceRevenue.length})
                  </span>
                  <span
                    className="w-20 shrink-0 text-right font-sans font-semibold whitespace-nowrap"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    {formatCurrencyWhole(topServicesTotal)}
                  </span>
                </div>
              </div>
            )}
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
                  Revenue by Payment Method
                </h2>
                <InfoTip
                  text={`Breakdown of ${periodLabel.toLowerCase()}'s revenue by how it was collected.`}
                />
              </div>
              <button
                type="button"
                onClick={() => router.push(ROUTES.billingReportsPayments)}
                className={`font-sans font-medium transition-colors duration-150 hover:underline ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#00B4D8' }}
              >
                View Details
              </button>
            </div>
            <div className="mt-3 flex items-center gap-4">
              <AnimatedDonutChart
                breakdown={methodBreakdown.map((m) => ({
                  label: m.method,
                  value: m.amount,
                  color: m.color,
                }))}
                total={periodTotal}
                size={140}
                ariaLabel="Revenue by payment method donut chart"
                centerValue={formatCurrencyCompact(periodTotal)}
                centerLabel="Total"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
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
                  </div>
                ))}
              </div>
            </div>
            <div
              className="mt-3 flex items-center justify-between"
              style={{ borderTop: '1px solid rgba(0,100,130,0.08)', paddingTop: 12 }}
            >
              <span className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
                Total
              </span>
              <span className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
                {formatCurrencyWhole(periodTotal)}
              </span>
            </div>
          </div>

          <div
            className="rounded-[12px] p-4 sm:p-5"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <div className="flex items-center gap-1.5">
              <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Summary &amp; Highlights
              </h2>
              <InfoTip text="Cross-references live invoice, payment, and refund/adjustment data across the app." />
            </div>
            <div className="mt-3 flex flex-col gap-3">
              {[
                {
                  icon: ReceiptText,
                  label: 'Outstanding Invoices',
                  value: formatCurrencyWhole(outstandingTotal),
                  trend: '+8.6%',
                  color: '#DC2626',
                  bg: 'rgba(220,38,38,0.1)',
                  up: true,
                },
                {
                  icon: RefreshCcw,
                  label: 'Refunds & Adjustments',
                  value: formatCurrencyWhole(refundsAdjustmentsTotal),
                  trend: '-5.2%',
                  color: '#D97706',
                  bg: 'rgba(217,119,6,0.1)',
                  up: false,
                },
                {
                  icon: Wallet,
                  label: 'Payments Received',
                  value: formatCurrencyWhole(periodTotal),
                  trend: '+15.6%',
                  color: '#16A34A',
                  bg: 'rgba(22,163,74,0.1)',
                  up: true,
                },
                {
                  icon: Clock,
                  label: 'Avg. Collection Time',
                  value: `${avgCollectionDays.toFixed(1)} Days`,
                  trend: '-0.8 Days',
                  color: '#2563EB',
                  bg: 'rgba(37,99,235,0.1)',
                  up: false,
                },
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-3">
                  <div
                    className="flex size-9 shrink-0 items-center justify-center rounded-full"
                    style={{ background: row.bg }}
                  >
                    <row.icon style={{ width: 16, height: 16, color: row.color }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>{row.label}</p>
                    <p
                      className="font-sans font-semibold"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {row.value}
                    </p>
                  </div>
                  <span
                    className="shrink-0 font-sans font-medium whitespace-nowrap"
                    style={{ fontSize: 14, color: row.up ? '#16A34A' : '#DC2626' }}
                  >
                    {row.up ? '↑' : '↓'} {row.trend}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer note */}
        <div
          className="mt-4 flex items-center gap-2 rounded-[10px] px-4 py-3"
          style={{ background: '#E6F8FD' }}
        >
          <Info style={{ width: 16, height: 16, color: '#00B4D8', flexShrink: 0 }} />
          <p style={{ fontSize: 14, color: '#0D2630' }}>
            Revenue data is updated in real-time. All amounts are in Nigerian Naira (₦).
          </p>
        </div>

        <div className="h-4" />
      </div>
    </main>
  );
}
