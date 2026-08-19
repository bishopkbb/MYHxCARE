'use client';

import {
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  CreditCard,
  FilePlus2,
  FileText,
  RefreshCcw,
  RotateCcw,
  UserSearch,
  Wallet,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { AnimatedDonutChart } from '@components/shared/AnimatedDonutChart';
import { FilterDropdown, type FilterDef } from '@components/shared/FilterDropdown';
import { FormDateInput } from '@components/shared/FormDateInput';
import { PermissionGate } from '@components/shared/PermissionGate';
import { StatCardTrend } from '@components/shared/StatCard';
import { Tooltip } from '@components/shared/Tooltip';
import { PERMISSIONS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
import { formatCurrencyCompact, formatCurrencyWhole } from '@/utils/currency';
import { formatHumanDate } from '@/utils/datetime';
import {
  BILLING_DEPARTMENTS,
  BILLING_PAYMENT_METHODS,
  BILLING_SERVICES,
  BILLING_STATS,
  buildRevenueTrendMonth,
  buildRevenueTrendWeek,
  buildRevenueTrendYear,
  DEPARTMENT_REVENUE_SHARE,
  OUTSTANDING_INVOICES_AGEING,
  RECENT_ACTIVITY,
  REVENUE_BY_PAYMENT_METHOD,
  REVENUE_TREND_TODAY,
  SERVICE_REVENUE_SHARE,
  TOP_DEPARTMENTS_TODAY,
  type ActivityType,
  type TrendPoint,
} from '@/features/billing/__mocks__/billingDashboardFixtures';

type PageState = 'loading' | 'loaded' | 'error';
type ChartTab = 'today' | 'week' | 'month' | 'year';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

function toDateInputValue(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const ACTIVITY_ICON: Record<ActivityType, { icon: typeof FileText; color: string; bg: string }> = {
  payment: { icon: CreditCard, color: '#16A34A', bg: 'rgba(22,163,74,0.1)' },
  invoice: { icon: FileText, color: '#2563EB', bg: 'rgba(37,99,235,0.1)' },
  refund: { icon: AlertTriangle, color: '#D97706', bg: 'rgba(217,119,6,0.1)' },
  reconciliation: { icon: RefreshCcw, color: '#EA580C', bg: 'rgba(234,88,12,0.1)' },
  adjustment: { icon: FileText, color: '#2563EB', bg: 'rgba(37,99,235,0.1)' },
};

// ── Skeletons ────────────────────────────────────────────────────────────

function SkeletonStatCard() {
  return (
    <div
      className="rounded-[12px] p-4"
      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
    >
      <div className="flex items-center gap-3">
        <div className="size-11 shrink-0 animate-pulse rounded-[12px] bg-slate-200" />
        <div className="min-w-0 flex-1">
          <div className="h-3.5 w-24 animate-pulse rounded bg-slate-200" />
          <div className="mt-2 h-6 w-20 animate-pulse rounded bg-slate-200" />
        </div>
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="h-3.5 w-full max-w-[200px] animate-pulse rounded bg-slate-200" />
      <div className="h-3.5 w-16 shrink-0 animate-pulse rounded bg-slate-200" />
    </div>
  );
}

// ── Panel shell ──────────────────────────────────────────────────────────

function Panel({
  title,
  viewAllHref,
  right,
  className,
  children,
}: {
  title: string;
  viewAllHref?: string;
  right?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <div
      className={`flex h-full flex-col rounded-[12px] p-4 sm:p-5 ${className ?? ''}`}
      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
          {title}
        </h2>
        {right ??
          (viewAllHref && (
            <button
              type="button"
              onClick={() => router.push(viewAllHref)}
              className={`font-sans font-medium transition-colors duration-150 hover:underline ${FOCUS_RING}`}
              style={{ fontSize: 14, color: '#00B4D8' }}
            >
              View All
            </button>
          ))}
      </div>
      {children}
    </div>
  );
}

// ── Revenue area chart (single series, gradient fill) ───────────────────

function RevenueAreaChart({ data }: { data: TrendPoint[] }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

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
    const svg = svgRef.current;
    if (!svg || data.length === 0) return;
    const rect = svg.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * W;
    const idx = Math.max(0, Math.min(data.length - 1, Math.round(relX / stepX)));
    setHoverIdx(idx);
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
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="absolute inset-x-0 top-0 cursor-crosshair"
          style={{ height: 'calc(100% - 24px)', width: '100%' }}
          onMouseMove={handleMove}
          onMouseLeave={() => setHoverIdx(null)}
        >
          <defs>
            <linearGradient id="revenue-area-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00B4D8" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#00B4D8" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaD} fill="url(#revenue-area-fill)" stroke="none" />
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

// ── Quick Action row list ─────────────────────────────────────────────────

function QuickActionRow({
  icon: Icon,
  label,
  description,
  color,
  bg,
  onClick,
}: {
  icon: typeof FilePlus2;
  label: string;
  description: string;
  color: string;
  bg: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-[10px] p-3 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
      style={{ border: '1px solid rgba(0,100,130,0.12)' }}
    >
      <div
        className="flex size-11 shrink-0 items-center justify-center rounded-[10px]"
        style={{ background: bg }}
      >
        <Icon style={{ width: 20, height: 20, color }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
          {label}
        </p>
        <p className="truncate" style={{ fontSize: 14, color: '#8A98A3' }}>
          {description}
        </p>
      </div>
      <ChevronRight style={{ width: 16, height: 16, color: '#8A98A3' }} className="shrink-0" />
    </button>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────

export function BillingDashboardWorkspace() {
  const router = useRouter();
  const [pageState, setPageState] = useState<PageState>('loading');
  const [now] = useState(() => Date.now());

  const [selectedDate, setSelectedDate] = useState(() => toDateInputValue(new Date(now)));
  const [activeTab, setActiveTab] = useState<ChartTab>('today');
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [serviceFilter, setServiceFilter] = useState('ALL');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('ALL');
  const [openFilter, setOpenFilter] = useState<'department' | 'service' | 'method' | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setPageState('loaded'), 800);
    return () => clearTimeout(t);
  }, []);

  function handleRetry() {
    setPageState('loading');
    setTimeout(() => setPageState('loaded'), 800);
  }

  function handleResetFilters() {
    setDepartmentFilter('ALL');
    setServiceFilter('ALL');
    setPaymentMethodFilter('ALL');
    setSelectedDate(toDateInputValue(new Date(now)));
  }

  // Illustrative cross-tab scaling — no real per-department/per-service
  // revenue split exists, so a selected filter scales the overall total by
  // that group's known share rather than inventing an independent number.
  const scaleFactor =
    (departmentFilter === 'ALL' ? 1 : (DEPARTMENT_REVENUE_SHARE[departmentFilter] ?? 1)) *
    (serviceFilter === 'ALL'
      ? 1
      : (SERVICE_REVENUE_SHARE[serviceFilter] ?? 1) * BILLING_SERVICES.length);

  const rawTrend: TrendPoint[] =
    activeTab === 'today'
      ? REVENUE_TREND_TODAY
      : activeTab === 'week'
        ? buildRevenueTrendWeek(now)
        : activeTab === 'month'
          ? buildRevenueTrendMonth(now)
          : buildRevenueTrendYear(now);

  const trend = rawTrend.map((p) => ({ ...p, value: Math.round(p.value * scaleFactor) }));
  const periodTotal =
    activeTab === 'today'
      ? (trend[trend.length - 1]?.value ?? 0)
      : trend.reduce((sum, p) => sum + p.value, 0);

  const periodLabel =
    activeTab === 'today'
      ? `Total Revenue ${selectedDate === toDateInputValue(new Date(now)) ? 'Today' : `for ${formatHumanDate(selectedDate)}`}`
      : activeTab === 'week'
        ? 'Total Revenue This Week'
        : activeTab === 'month'
          ? 'Total Revenue This Month'
          : 'Total Revenue This Year';

  const paymentBreakdown = (
    paymentMethodFilter === 'ALL'
      ? REVENUE_BY_PAYMENT_METHOD
      : REVENUE_BY_PAYMENT_METHOD.filter((s) => s.method === paymentMethodFilter)
  ).map((s) => ({ ...s, amount: Math.round(s.amount * scaleFactor) }));
  const paymentTotal = paymentBreakdown.reduce((sum, s) => sum + s.amount, 0);

  const FILTER_DEFS: { key: 'department' | 'service' | 'method'; def: FilterDef }[] = [
    {
      key: 'department',
      def: {
        key: 'department',
        defaultLabel: 'All Departments',
        options: BILLING_DEPARTMENTS.map((d) => ({ value: d, label: d })),
      },
    },
    {
      key: 'service',
      def: {
        key: 'service',
        defaultLabel: 'All Services',
        options: BILLING_SERVICES.map((s) => ({ value: s, label: s })),
      },
    },
    {
      key: 'method',
      def: {
        key: 'method',
        defaultLabel: 'All Methods',
        options: BILLING_PAYMENT_METHODS.map((m) => ({ value: m, label: m })),
      },
    },
  ];
  const filterValue: Record<string, string> = {
    department: departmentFilter,
    service: serviceFilter,
    method: paymentMethodFilter,
  };
  const filterSetter: Record<string, (v: string) => void> = {
    department: setDepartmentFilter,
    service: setServiceFilter,
    method: setPaymentMethodFilter,
  };

  const outstandingTotalInvoices = OUTSTANDING_INVOICES_AGEING.reduce((s, r) => s + r.invoices, 0);
  const outstandingTotalAmount = OUTSTANDING_INVOICES_AGEING.reduce((s, r) => s + r.amount, 0);
  const departmentsTotal = TOP_DEPARTMENTS_TODAY.reduce((s, r) => s + r.revenue, 0);

  if (pageState === 'error') {
    return (
      <main className="flex flex-1 items-center justify-center" style={{ background: '#F5FBFD' }}>
        <div className="flex flex-col items-center gap-3 px-6 text-center">
          <AlertCircle style={{ width: 40, height: 40, color: '#DC2626' }} />
          <p className="font-display font-semibold" style={{ fontSize: 18, color: '#0D2630' }}>
            Couldn&apos;t load the Dashboard
          </p>
          <p style={{ fontSize: 14, color: '#4A7080' }}>Something went wrong. Please try again.</p>
          <button
            type="button"
            onClick={handleRetry}
            className={`mt-1 flex h-11 items-center gap-2 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
            style={{ fontSize: 14, background: '#00B4D8' }}
          >
            <RotateCcw style={{ width: 15, height: 15 }} />
            Retry
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
      <div className="mx-auto max-w-[1400px] px-4 py-4 sm:px-6 sm:py-5">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-display font-bold" style={{ fontSize: 24, color: '#0D2630' }}>
              Dashboard
            </h1>
            <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
              Accounts &amp; Billing Overview
            </p>
          </div>
          <div className="w-full max-w-[220px] shrink-0 sm:w-auto">
            <FormDateInput
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              aria-label="Dashboard date"
            />
          </div>
        </div>

        {/* Stat cards */}
        <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4 xl:gap-4">
          {pageState === 'loading'
            ? Array.from({ length: 4 }).map((_, i) => <SkeletonStatCard key={i} />)
            : BILLING_STATS.map((s) => {
                const icon =
                  s.key === 'todaysBilling'
                    ? FileText
                    : s.key === 'paymentsReceived'
                      ? Wallet
                      : s.key === 'outstandingInvoices'
                        ? ClipboardList
                        : RefreshCcw;
                const accent =
                  s.key === 'todaysBilling'
                    ? '#2563EB'
                    : s.key === 'paymentsReceived'
                      ? '#16A34A'
                      : s.key === 'outstandingInvoices'
                        ? '#D97706'
                        : '#DC2626';
                const isGood = s.direction === s.goodDirection;
                return (
                  <StatCardTrend
                    key={s.key}
                    icon={icon}
                    label={s.label}
                    value={s.value}
                    trendPercent={isGood ? s.deltaPercent : -s.deltaPercent}
                    accent={isGood ? accent : '#DC2626'}
                    iconBg={`${accent}1A`}
                    sparklineData={[3, 4, 3.5, 5, 4.5, 6, 5.5, 7]}
                  />
                );
              })}
        </div>

        {/* Main grid */}
        <div className="mt-4 grid grid-cols-1 gap-4 2xl:grid-cols-[1fr_340px] 2xl:items-start">
          <div className="flex min-w-0 flex-col gap-4">
            {/* Revenue Overview */}
            <div
              className="rounded-[12px] p-4 sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Revenue Overview
                </h2>
                <div className="flex items-center gap-4">
                  {(['today', 'week', 'month', 'year'] as ChartTab[]).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={`font-sans font-medium transition-colors duration-150 ${FOCUS_RING}`}
                      style={{
                        fontSize: 14,
                        color: activeTab === tab ? '#00B4D8' : '#4A7080',
                        borderBottom:
                          activeTab === tab ? '2px solid #00B4D8' : '2px solid transparent',
                        paddingBottom: 2,
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
                  <button
                    type="button"
                    onClick={() => setFiltersOpen((p) => !p)}
                    className={`flex h-9 items-center gap-1.5 rounded-[8px] px-3 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                    style={{
                      fontSize: 14,
                      color: '#0D2630',
                      border: '1px solid rgba(0,100,130,0.2)',
                    }}
                  >
                    Filters
                    <ChevronDown
                      style={{
                        width: 14,
                        height: 14,
                        transform: filtersOpen ? 'rotate(180deg)' : 'none',
                        transition: 'transform 150ms',
                      }}
                    />
                  </button>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-baseline gap-2">
                <span className="font-display font-bold" style={{ fontSize: 28, color: '#0D2630' }}>
                  {formatCurrencyWhole(periodTotal)}
                </span>
                <span style={{ fontSize: 14, color: '#8A98A3' }}>{periodLabel}</span>
                <span
                  className="font-sans font-medium"
                  style={{
                    fontSize: 14,
                    color: BILLING_STATS[1]!.direction === 'up' ? '#16A34A' : '#DC2626',
                  }}
                >
                  ↑ {BILLING_STATS[1]!.deltaPercent}% vs yesterday
                </span>
              </div>

              <div className="mt-2 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_340px]">
                {pageState === 'loading' ? (
                  <div className="h-64 animate-pulse rounded-[10px] bg-slate-100" />
                ) : (
                  <RevenueAreaChart data={trend} />
                )}
                <div>
                  <p
                    className="font-display font-semibold"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    Revenue by Payment Method
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    <AnimatedDonutChart
                      breakdown={paymentBreakdown.map((s) => ({
                        label: s.method,
                        value: s.amount,
                        color: s.color,
                      }))}
                      total={paymentTotal}
                      size={168}
                      ariaLabel="Revenue by payment method donut chart"
                      centerValue={formatCurrencyCompact(paymentTotal)}
                      centerLabel="Total"
                    />
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      {paymentBreakdown.map((s) => (
                        <div key={s.method} className="flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-1.5">
                            <span
                              className="size-2 shrink-0 rounded-full"
                              style={{ background: s.color }}
                            />
                            <span className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                              {s.method}
                            </span>
                          </div>
                          <span
                            className="shrink-0 font-sans font-medium whitespace-nowrap"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {s.percent}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {filtersOpen && (
                <div
                  className="mt-4 flex flex-wrap items-end gap-2.5"
                  style={{ borderTop: '1px solid rgba(0,100,130,0.08)', paddingTop: 16 }}
                >
                  <div>
                    <label
                      className="mb-1.5 block font-sans font-medium"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      Date
                    </label>
                    <FormDateInput
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      aria-label="Filter date"
                    />
                  </div>
                  {FILTER_DEFS.map(({ key, def }) => (
                    <FilterDropdown
                      key={key}
                      def={def}
                      value={filterValue[key] ?? 'ALL'}
                      isOpen={openFilter === key}
                      onToggle={() => setOpenFilter((prev) => (prev === key ? null : key))}
                      onSelect={(v) => {
                        filterSetter[key]?.(v);
                        setOpenFilter(null);
                      }}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                    style={{
                      fontSize: 14,
                      color: '#0D2630',
                      border: '1px solid rgba(0,100,130,0.2)',
                    }}
                  >
                    <RotateCcw style={{ width: 14, height: 14 }} />
                    Reset
                  </button>
                </div>
              )}
            </div>

            {/* Outstanding Invoices Summary + Top Departments */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Panel title="Outstanding Invoices Summary">
                <div className="mt-3 flex flex-col">
                  <div
                    className="flex items-center pb-2"
                    style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    <span
                      className="min-w-[100px] flex-1 font-sans font-bold tracking-wider uppercase"
                      style={{ fontSize: 14, color: '#8A98A3' }}
                    >
                      Ageing
                    </span>
                    <span
                      className="w-20 shrink-0 text-center font-sans font-bold tracking-wider uppercase"
                      style={{ fontSize: 14, color: '#8A98A3' }}
                    >
                      Invoices
                    </span>
                    <span
                      className="w-24 shrink-0 text-center font-sans font-bold tracking-wider uppercase"
                      style={{ fontSize: 14, color: '#8A98A3' }}
                    >
                      Amount
                    </span>
                    <span
                      className="w-32 shrink-0 text-center font-sans font-bold tracking-wider uppercase"
                      style={{ fontSize: 14, color: '#8A98A3' }}
                    >
                      Percentage
                    </span>
                  </div>
                  {pageState === 'loading' ? (
                    Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
                  ) : (
                    <>
                      {OUTSTANDING_INVOICES_AGEING.map((row) => (
                        <div
                          key={row.bucket}
                          className="flex items-center py-2.5"
                          style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                        >
                          <span
                            className="min-w-[100px] flex-1"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {row.bucket}
                          </span>
                          <span
                            className="w-20 shrink-0 text-center"
                            style={{ fontSize: 14, color: '#4A7080' }}
                          >
                            {row.invoices}
                          </span>
                          <span
                            className="w-24 shrink-0 text-center font-sans font-medium"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {formatCurrencyWhole(row.amount)}
                          </span>
                          <div className="flex w-32 shrink-0 items-center justify-center gap-1.5">
                            <div
                              className="h-1.5 w-14 shrink-0 overflow-hidden rounded-full"
                              style={{ background: '#F5FBFD' }}
                            >
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${row.percent}%`, background: '#00B4D8' }}
                              />
                            </div>
                            <span style={{ fontSize: 14, color: '#4A7080' }}>{row.percent}%</span>
                          </div>
                        </div>
                      ))}
                      <div className="flex items-center pt-2.5">
                        <span
                          className="min-w-[100px] flex-1 font-sans font-semibold"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          Total
                        </span>
                        <span
                          className="w-20 shrink-0 text-center font-sans font-semibold"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {outstandingTotalInvoices}
                        </span>
                        <span
                          className="w-24 shrink-0 text-center font-sans font-semibold"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {formatCurrencyWhole(outstandingTotalAmount)}
                        </span>
                        <span
                          className="w-32 shrink-0 text-center font-sans font-semibold"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          100%
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </Panel>

              <Panel
                title="Top Departments by Revenue (Today)"
                viewAllHref={ROUTES.billingRevenueByDepartment}
              >
                <div className="mt-3 flex flex-col">
                  {pageState === 'loading' ? (
                    Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                  ) : (
                    <>
                      {TOP_DEPARTMENTS_TODAY.map((row) => (
                        <div
                          key={row.department}
                          className="flex items-center gap-2.5 py-2.5"
                          style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                        >
                          <span
                            className="flex size-6 shrink-0 items-center justify-center rounded-full font-sans font-semibold text-white"
                            style={{ fontSize: 14, background: '#00B4D8' }}
                          >
                            {row.rank}
                          </span>
                          <span
                            className="min-w-0 flex-1 truncate"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {row.department}
                          </span>
                          <span
                            className="shrink-0 font-sans font-medium whitespace-nowrap"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {formatCurrencyWhole(row.revenue)}
                          </span>
                          <span
                            className="w-14 shrink-0 text-right"
                            style={{ fontSize: 14, color: '#4A7080' }}
                          >
                            {row.percentOfTotal}%
                          </span>
                        </div>
                      ))}
                      <div className="flex items-center gap-2.5 pt-2.5">
                        <span
                          className="flex-1 font-sans font-semibold"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          Total
                        </span>
                        <span
                          className="font-sans font-semibold"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {formatCurrencyWhole(departmentsTotal)}
                        </span>
                        <span
                          className="w-14 text-right font-sans font-semibold"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          100%
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </Panel>
            </div>
          </div>

          {/* Right column: Quick Actions + Recent Activity */}
          <div className="flex w-full shrink-0 flex-col gap-4">
            <Panel title="Quick Actions">
              <div className="mt-3 flex flex-col gap-2">
                <PermissionGate permission={PERMISSIONS.BILLING_WRITE}>
                  <QuickActionRow
                    icon={FilePlus2}
                    label="Create Invoice"
                    description="Create a new invoice for a patient"
                    color="#2563EB"
                    bg="rgba(37,99,235,0.1)"
                    onClick={() => router.push(ROUTES.billingInvoices)}
                  />
                </PermissionGate>
                <PermissionGate permission={PERMISSIONS.BILLING_WRITE}>
                  <QuickActionRow
                    icon={Wallet}
                    label="Post Payment"
                    description="Record a payment against an invoice"
                    color="#16A34A"
                    bg="rgba(22,163,74,0.1)"
                    onClick={() => router.push(ROUTES.billingPayments)}
                  />
                </PermissionGate>
                <QuickActionRow
                  icon={UserSearch}
                  label="View Patient Account"
                  description="View patient billing account"
                  color="#7C3AED"
                  bg="rgba(124,58,237,0.1)"
                  onClick={() => router.push(ROUTES.billingAccounts)}
                />
                <PermissionGate permission={PERMISSIONS.BILLING_WRITE}>
                  <QuickActionRow
                    icon={RefreshCcw}
                    label="Reconcile Payments"
                    description="Match payments with transactions"
                    color="#D97706"
                    bg="rgba(217,119,6,0.1)"
                    onClick={() => router.push(ROUTES.billingReconciliation)}
                  />
                </PermissionGate>
                <PermissionGate permission={PERMISSIONS.BILLING_WRITE}>
                  <QuickActionRow
                    icon={RotateCcw}
                    label="Process Refund"
                    description="Initiate a refund or adjustment"
                    color="#DC2626"
                    bg="rgba(220,38,38,0.1)"
                    onClick={() => router.push(ROUTES.billingRefunds)}
                  />
                </PermissionGate>
              </div>
            </Panel>

            <Panel title="Recent Activity">
              <div className="mt-3 flex flex-col">
                {pageState === 'loading'
                  ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                  : RECENT_ACTIVITY.map((a) => {
                      const cfg = ACTIVITY_ICON[a.type];
                      return (
                        <div
                          key={a.id}
                          className="flex items-start gap-2.5 py-2.5"
                          style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                        >
                          <div
                            className="flex size-8 shrink-0 items-center justify-center rounded-[8px]"
                            style={{ background: cfg.bg }}
                          >
                            <cfg.icon style={{ width: 15, height: 15, color: cfg.color }} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p
                              className="font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {a.title}
                            </p>
                            <Tooltip content={a.detail}>
                              <p className="truncate" style={{ fontSize: 14, color: '#8A98A3' }}>
                                {a.detail}
                              </p>
                            </Tooltip>
                          </div>
                          <span
                            className="shrink-0 whitespace-nowrap"
                            style={{ fontSize: 14, color: '#8A98A3' }}
                          >
                            {a.timeLabel}
                          </span>
                        </div>
                      );
                    })}
              </div>
            </Panel>
          </div>
        </div>

        <div className="h-4" />
      </div>
    </main>
  );
}
