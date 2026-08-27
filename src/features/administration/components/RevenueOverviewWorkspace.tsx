'use client';

import {
  Beaker,
  BedDouble,
  CalendarDays,
  ChevronRight,
  Clock,
  Download,
  Lightbulb,
  Package,
  Pill,
  Siren,
  Stethoscope,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { AnimatedDonutChart } from '@components/shared/AnimatedDonutChart';
import { FormDateInput } from '@components/shared/FormDateInput';
import { Sparkline } from '@components/shared/Sparkline';
import { StatCard } from '@components/shared/StatCard';
import {
  ScrollableTable,
  TABLE_HEADER_BG,
  TABLE_HEADER_STICKY_CLASS,
} from '@components/shared/ScrollableTable';
import { Tooltip } from '@components/shared/Tooltip';
import { ROUTES } from '@/constants/routes';
import { downloadCSV } from '@/utils/export';
import { formatCurrencyCompact, formatCurrencyWhole } from '@/utils/currency';
import { formatHumanDate } from '@/utils/datetime';
import {
  buildAllInvoices,
  buildAllPayments,
  PAYMENT_METHODS,
} from '@/features/billing/__mocks__/billingAccountDetailFixtures';

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

/** Same edge-case handling (zero previous period, absurd swings from a tiny
 * denominator) as `RevenueByDepartmentWorkspace.tsx`'s own `pctDelta`. */
function pctDelta(current: number, previous: number): number | null {
  if (previous <= 0) return current > 0 ? null : 0;
  const delta = Math.round(((current - previous) / previous) * 1000) / 10;
  return Math.abs(delta) > 300 ? null : delta;
}

const DEPARTMENT_ICONS: Record<string, typeof Stethoscope> = {
  Laboratory: Beaker,
  Pharmacy: Pill,
  Consultation: Stethoscope,
  Emergency: Siren,
  Ward: BedDouble,
  'Other Services': Package,
};

const DEPARTMENT_COLORS: Record<string, string> = {
  Laboratory: '#2563EB',
  Pharmacy: '#7C3AED',
  Consultation: '#00B4D8',
  Emergency: '#DC2626',
  Ward: '#16A34A',
  'Other Services': '#D97706',
};

const PAYMENT_METHOD_COLORS: Record<string, string> = {
  POS: '#2563EB',
  'Bank Transfer': '#16A34A',
  Cash: '#00B4D8',
  Card: '#7C3AED',
  Online: '#EC4899',
};

/** Collapses the real 6-value `INVOICE_SERVICE_OPTIONS` down to the mockup's
 * 5 categories, the same remap-table technique
 * `RevenueByServiceWorkspace.tsx` already uses for its own department
 * mapping, applied to a different taxonomy. */
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

function RevenueAreaChart({ data }: { data: { label: string; value: number }[] }) {
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
            <linearGradient id="revenue-overview-area-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563EB" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaD} fill="url(#revenue-overview-area-fill)" stroke="none" />
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
          className="animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 absolute top-full right-0 z-30 mt-1.5 w-[280px] rounded-[12px] bg-white p-4 duration-150"
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

export function RevenueOverviewWorkspace() {
  const router = useRouter();
  const [dateFrom, setDateFrom] = useState(monthStartKey());
  const [dateTo, setDateTo] = useState(todayKey());
  const [now] = useState(() => Date.now());

  const invoices = useMemo(() => buildAllInvoices(), []);
  const payments = useMemo(() => buildAllPayments(), []);

  const rangeDays = Math.max(
    1,
    Math.round((new Date(dateTo).getTime() - new Date(dateFrom).getTime()) / DAY_MS) + 1,
  );
  const prevTo = toDateKey(new Date(new Date(dateFrom).getTime() - DAY_MS));
  const prevFrom = toDateKey(new Date(new Date(dateFrom).getTime() - rangeDays * DAY_MS));

  const inRange = (key: string) => key >= dateFrom && key <= dateTo;
  const inPrevRange = (key: string) => key >= prevFrom && key <= prevTo;

  const invoicesInRange = invoices.filter(
    (i) => inRange(toDateKey(i.date)) && i.status !== 'Cancelled',
  );
  const invoicesInPrevRange = invoices.filter(
    (i) => inPrevRange(toDateKey(i.date)) && i.status !== 'Cancelled',
  );
  const paymentsInRange = payments.filter((p) => inRange(toDateKey(p.date)));

  const totalRevenue = invoicesInRange.reduce((sum, i) => sum + i.amount, 0);
  const lastPeriodTotal = invoicesInPrevRange.reduce((sum, i) => sum + i.amount, 0);
  const paidRevenue = invoicesInRange
    .filter((i) => i.status === 'Paid')
    .reduce((sum, i) => sum + i.amount, 0);
  const overdueRevenue = invoicesInRange
    .filter((i) => i.status === 'Overdue')
    .reduce((sum, i) => sum + i.amount, 0);
  const pendingRevenue = Math.max(0, totalRevenue - paidRevenue - overdueRevenue);
  const averageDailyRevenue = totalRevenue / rangeDays;
  const changePercent = pctDelta(totalRevenue, lastPeriodTotal);

  const trend = useMemo(() => {
    const byDay = new Map<string, number>();
    for (const inv of invoicesInRange) {
      const key = toDateKey(inv.date);
      byDay.set(key, (byDay.get(key) ?? 0) + inv.amount);
    }
    const points: { key: string; label: string; value: number }[] = [];
    for (let t = new Date(dateFrom).getTime(); t <= new Date(dateTo).getTime(); t += DAY_MS) {
      const key = toDateKey(new Date(t));
      points.push({
        key,
        label: new Date(t).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
        value: byDay.get(key) ?? 0,
      });
    }
    return points;
  }, [invoicesInRange, dateFrom, dateTo]);

  const highestDay = trend.reduce(
    (best, p) => (p.value > best.value ? p : best),
    trend[0] ?? { key: '', label: '', value: 0 },
  );

  const methodBreakdown = useMemo(() => {
    const byMethod = new Map<string, number>();
    for (const p of paymentsInRange)
      byMethod.set(p.method, (byMethod.get(p.method) ?? 0) + p.amount);
    const total = paymentsInRange.reduce((s, p) => s + p.amount, 0);
    return PAYMENT_METHODS.map((m) => ({
      method: m,
      amount: byMethod.get(m) ?? 0,
      percent: total > 0 ? ((byMethod.get(m) ?? 0) / total) * 100 : 0,
      color: PAYMENT_METHOD_COLORS[m] ?? '#8A98A3',
    })).filter((m) => m.amount > 0);
  }, [paymentsInRange]);
  const totalCollected = paymentsInRange.reduce((s, p) => s + p.amount, 0);

  const departmentRows = useMemo(() => {
    const thisByDept = new Map<string, number>();
    for (const p of paymentsInRange)
      thisByDept.set(p.department, (thisByDept.get(p.department) ?? 0) + p.amount);
    const prevByDept = new Map<string, number>();
    for (const p of payments.filter((p) => {
      const key = toDateKey(p.date);
      return key >= prevFrom && key <= prevTo;
    })) {
      prevByDept.set(p.department, (prevByDept.get(p.department) ?? 0) + p.amount);
    }
    const sparkByDept = new Map<string, number[]>();
    const bucketCount = 6;
    const bucketMs = (rangeDays * DAY_MS) / bucketCount;
    for (const p of paymentsInRange) {
      const offset = new Date(p.date).getTime() - new Date(dateFrom).getTime();
      const bucket = Math.min(bucketCount - 1, Math.max(0, Math.floor(offset / bucketMs)));
      const arr = sparkByDept.get(p.department) ?? Array.from({ length: bucketCount }, () => 0);
      arr[bucket] = (arr[bucket] ?? 0) + p.amount;
      sparkByDept.set(p.department, arr);
    }
    const thisTotal = paymentsInRange.reduce((s, p) => s + p.amount, 0);
    return Object.keys(DEPARTMENT_ICONS)
      .map((dept) => {
        const thisAmount = thisByDept.get(dept) ?? 0;
        const prevAmount = prevByDept.get(dept) ?? 0;
        return {
          department: dept,
          thisAmount,
          prevAmount,
          changePercent: pctDelta(thisAmount, prevAmount),
          percentOfTotal: thisTotal > 0 ? (thisAmount / thisTotal) * 100 : 0,
          sparkline: sparkByDept.get(dept) ?? Array.from({ length: bucketCount }, () => 0),
        };
      })
      .sort((a, b) => b.thisAmount - a.thisAmount);
  }, [paymentsInRange, payments, dateFrom, rangeDays, prevFrom, prevTo]);

  const serviceRows = useMemo(() => {
    const invoiceByNumber = new Map(invoices.map((i) => [i.invoiceNumber, i]));
    const byCategory = new Map<string, number>();
    for (const p of paymentsInRange) {
      const inv = invoiceByNumber.get(p.invoiceNumber);
      const category = SERVICE_CATEGORY_MAP[inv?.service ?? ''] ?? 'Other Services';
      byCategory.set(category, (byCategory.get(category) ?? 0) + p.amount);
    }
    const total = Array.from(byCategory.values()).reduce((s, v) => s + v, 0);
    return Array.from(byCategory.entries())
      .map(([category, amount]) => ({
        category,
        amount,
        percent: total > 0 ? (amount / total) * 100 : 0,
        color: SERVICE_CATEGORY_COLORS[category] ?? '#8A98A3',
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [invoices, paymentsInRange]);

  const outstandingRows = useMemo(() => {
    return invoices
      .filter((i) => i.amount - i.paid > 0 && i.status !== 'Cancelled' && i.status !== 'Draft')
      .map((i) => ({
        ...i,
        balance: i.amount - i.paid,
        daysOutstanding: Math.max(0, Math.floor((now - new Date(i.dueDate).getTime()) / DAY_MS)),
      }))
      .sort((a, b) => b.daysOutstanding - a.daysOutstanding);
  }, [invoices, now]);

  const agingBuckets = useMemo(() => {
    const buckets = [
      { label: '0 - 30 Days', min: 0, max: 30, color: '#16A34A' },
      { label: '31 - 60 Days', min: 31, max: 60, color: '#D97706' },
      { label: '61 - 90 Days', min: 61, max: 90, color: '#EA580C' },
      { label: '90+ Days', min: 91, max: Infinity, color: '#DC2626' },
    ];
    const total = outstandingRows.reduce((s, r) => s + r.balance, 0);
    return buckets.map((b) => {
      const rows = outstandingRows.filter(
        (r) => r.daysOutstanding >= b.min && r.daysOutstanding <= b.max,
      );
      const amount = rows.reduce((s, r) => s + r.balance, 0);
      return {
        ...b,
        invoices: rows.length,
        amount,
        percent: total > 0 ? Math.round((amount / total) * 100) : 0,
      };
    });
  }, [outstandingRows]);
  const totalOutstanding = outstandingRows.reduce((s, r) => s + r.balance, 0);
  const overdueCount = invoices.filter((i) => i.status === 'Overdue').length;
  const oldestOverdueDays = outstandingRows[0]?.daysOutstanding ?? 0;

  const monthlyRows = useMemo(() => {
    const now = new Date();
    const months: { key: string; label: string; total: number; changePercent: number | null }[] =
      [];
    for (let i = 5; i >= 1; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const total = invoices
        .filter((inv) => {
          const t = new Date(inv.date).getTime();
          return t >= start.getTime() && t <= end.getTime() && inv.status !== 'Cancelled';
        })
        .reduce((s, inv) => s + inv.amount, 0);
      months.push({
        key: toDateKey(start),
        label: start.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }),
        total,
        changePercent: null,
      });
    }
    for (let i = 1; i < months.length; i++) {
      months[i]!.changePercent = pctDelta(months[i]!.total, months[i - 1]!.total);
    }
    months.push({
      key: 'selected',
      label: `${formatHumanDate(dateFrom)} - ${formatHumanDate(dateTo)}`,
      total: totalRevenue,
      changePercent,
    });
    return months;
  }, [invoices, dateFrom, dateTo, totalRevenue, changePercent]);

  const topDepartment = departmentRows[0];
  const topMethod = methodBreakdown[0];

  function handleExportReport() {
    const rows: string[][] = [['Section', 'Item', 'Value']];
    rows.push(['Stat', 'Total Revenue', formatCurrencyWhole(totalRevenue)]);
    rows.push(['Stat', 'Average Daily Revenue', formatCurrencyWhole(averageDailyRevenue)]);
    rows.push(['Stat', 'Paid Revenue', formatCurrencyWhole(paidRevenue)]);
    rows.push(['Stat', 'Pending Revenue', formatCurrencyWhole(pendingRevenue)]);
    rows.push(['Stat', 'Overdue Revenue', formatCurrencyWhole(overdueRevenue)]);
    rows.push(['Revenue Trend', 'This Period', formatCurrencyWhole(totalRevenue)]);
    rows.push(['Revenue Trend', 'Last Period', formatCurrencyWhole(lastPeriodTotal)]);
    rows.push([
      'Revenue Trend',
      'Highest Day',
      `${highestDay.label} - ${formatCurrencyWhole(highestDay.value)}`,
    ]);
    for (const m of methodBreakdown) {
      rows.push([
        'Revenue by Payment Method',
        m.method,
        `${formatCurrencyWhole(m.amount)} (${m.percent.toFixed(1)}%)`,
      ]);
    }
    for (const d of departmentRows) {
      rows.push([
        'Revenue by Department',
        d.department,
        `This: ${formatCurrencyWhole(d.thisAmount)}, Last: ${formatCurrencyWhole(d.prevAmount)}, Change: ${d.changePercent ?? 'n/a'}%`,
      ]);
    }
    for (const s of serviceRows) {
      rows.push([
        'Revenue by Service Category',
        s.category,
        `${formatCurrencyWhole(s.amount)} (${s.percent.toFixed(1)}%)`,
      ]);
    }
    for (const a of agingBuckets) {
      rows.push([
        'Revenue Aging',
        a.label,
        `${formatCurrencyWhole(a.amount)} - ${a.invoices} invoices (${a.percent}%)`,
      ]);
    }
    for (const m of monthlyRows) {
      rows.push(['Monthly Revenue Summary', m.label, formatCurrencyWhole(m.total)]);
    }
    downloadCSV('revenue-overview', rows);
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
              Finance
            </button>
            <span style={{ color: '#8A98A3' }}>/</span>
            <span className="font-medium" style={{ color: '#0D2630' }}>
              Revenue Overview
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div
                className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-[10px]"
                style={{ background: 'rgba(124,58,237,0.1)' }}
              >
                <TrendingUp style={{ width: 18, height: 18, color: '#7C3AED' }} />
              </div>
              <div>
                <h1
                  className="font-display font-semibold"
                  style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
                >
                  Revenue Overview
                </h1>
                <p
                  className="mt-0.5"
                  style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}
                >
                  Track and analyze revenue performance across the medical centre.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <DateRangeControl
                from={dateFrom}
                to={dateTo}
                onChange={(from, to) => {
                  setDateFrom(from);
                  setDateTo(to);
                }}
              />
              <button
                type="button"
                onClick={handleExportReport}
                className={`flex h-11 items-center gap-1.5 rounded-[10px] px-3.5 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
              >
                <Download style={{ width: 15, height: 15 }} />
                Export Report
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-5 xl:gap-4">
            <StatCard
              icon={Wallet}
              label="Total Revenue"
              value={formatCurrencyWhole(totalRevenue)}
              info={
                changePercent !== null
                  ? `${changePercent >= 0 ? '↑' : '↓'} ${Math.abs(changePercent)}% vs last period`
                  : 'vs last period'
              }
              accent="#2563EB"
              iconBg="rgba(37,99,235,0.1)"
            />
            <StatCard
              icon={TrendingUp}
              label="Average Daily Revenue"
              value={formatCurrencyWhole(averageDailyRevenue)}
              info="vs previous period"
              accent="#16A34A"
              iconBg="rgba(22,163,74,0.1)"
            />
            <StatCard
              icon={Wallet}
              label="Paid Revenue"
              value={formatCurrencyWhole(paidRevenue)}
              info={`${totalRevenue > 0 ? Math.round((paidRevenue / totalRevenue) * 1000) / 10 : 0}% of total revenue`}
              accent="#7C3AED"
              iconBg="rgba(124,58,237,0.1)"
            />
            <StatCard
              icon={Clock}
              label="Pending Revenue"
              value={formatCurrencyWhole(pendingRevenue)}
              info={`${totalRevenue > 0 ? Math.round((pendingRevenue / totalRevenue) * 1000) / 10 : 0}% of total revenue`}
              accent="#D97706"
              iconBg="rgba(217,119,6,0.1)"
            />
            <StatCard
              icon={Clock}
              label="Overdue Revenue"
              value={formatCurrencyWhole(overdueRevenue)}
              info={`${totalRevenue > 0 ? Math.round((overdueRevenue / totalRevenue) * 1000) / 10 : 0}% of total revenue`}
              accent="#DC2626"
              iconBg="rgba(220,38,38,0.1)"
            />
          </div>

          <div
            className="mt-5 rounded-[12px] p-4 sm:p-5"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
              Revenue Trend
            </p>
            <p className="mt-1" style={{ fontSize: 14, color: '#8A98A3' }}>
              This Period: {formatHumanDate(dateFrom)} - {formatHumanDate(dateTo)}
            </p>
            <RevenueAreaChart data={trend} />
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <p style={{ fontSize: 14, color: '#8A98A3' }}>This Period</p>
                <p className="font-display font-bold" style={{ fontSize: 18, color: '#0D2630' }}>
                  {formatCurrencyWhole(totalRevenue)}
                </p>
              </div>
              <div>
                <p style={{ fontSize: 14, color: '#8A98A3' }}>Last Period</p>
                <p className="font-display font-bold" style={{ fontSize: 18, color: '#0D2630' }}>
                  {formatCurrencyWhole(lastPeriodTotal)}
                </p>
              </div>
              <div>
                <p style={{ fontSize: 14, color: '#8A98A3' }}>% Change</p>
                <p
                  className="font-display font-bold"
                  style={{ fontSize: 18, color: (changePercent ?? 0) >= 0 ? '#16A34A' : '#DC2626' }}
                >
                  {changePercent !== null
                    ? `${changePercent >= 0 ? '↑' : '↓'} ${Math.abs(changePercent)}%`
                    : 'n/a'}
                </p>
              </div>
              <div>
                <p style={{ fontSize: 14, color: '#8A98A3' }}>Highest Day</p>
                <p className="font-display font-bold" style={{ fontSize: 18, color: '#0D2630' }}>
                  {formatCurrencyWhole(highestDay.value)}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
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
                  size={140}
                  ariaLabel="Revenue by payment method"
                  centerValue={formatCurrencyWhole(totalCollected)}
                  centerLabel="Total"
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
                Revenue by Department
              </p>
              <div className="mt-3 flex flex-col gap-3">
                {departmentRows.map((d) => {
                  const Icon = DEPARTMENT_ICONS[d.department] ?? Package;
                  return (
                    <div key={d.department} className="flex items-center gap-2.5">
                      <div
                        className="flex size-8 shrink-0 items-center justify-center rounded-[8px]"
                        style={{ background: `${DEPARTMENT_COLORS[d.department]}1A` }}
                      >
                        <Icon
                          style={{ width: 15, height: 15, color: DEPARTMENT_COLORS[d.department] }}
                        />
                      </div>
                      <Tooltip content={d.department}>
                        <p
                          className="min-w-0 flex-1 truncate"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {d.department}
                        </p>
                      </Tooltip>
                      <span
                        className="shrink-0 font-sans font-semibold"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {formatCurrencyWhole(d.thisAmount)}
                      </span>
                      <span
                        className="shrink-0"
                        style={{ fontSize: 14, color: '#8A98A3', width: 44, textAlign: 'right' }}
                      >
                        {d.percentOfTotal.toFixed(1)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_400px]">
            <div
              className="rounded-[12px] p-4 sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <div className="flex items-center justify-between gap-2">
                <p
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Revenue by Department (Detailed)
                </p>
                <button
                  type="button"
                  onClick={() => router.push(ROUTES.billingRevenueByDepartment)}
                  className={`flex items-center gap-1 font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                  style={{ fontSize: 14, color: '#00B4D8' }}
                >
                  View All
                  <ChevronRight style={{ width: 13, height: 13 }} />
                </button>
              </div>
              <div className="mt-3">
                <ScrollableTable minWidth={520}>
                  <div
                    className={`flex ${TABLE_HEADER_STICKY_CLASS}`}
                    style={{ background: TABLE_HEADER_BG }}
                  >
                    <div className="max-w-[130px] min-w-0 flex-1 py-2.5 pr-2 pl-3">
                      <p
                        className="font-sans font-semibold"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Department
                      </p>
                    </div>
                    <div className="w-24 shrink-0 py-2.5 pr-2 pl-3">
                      <p
                        className="font-sans font-semibold"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        This Period
                      </p>
                    </div>
                    <div className="w-24 shrink-0 py-2.5 pr-2 pl-3">
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
                  {departmentRows.map((d) => (
                    <div
                      key={d.department}
                      className="flex items-center"
                      style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                    >
                      <div className="max-w-[130px] min-w-0 flex-1 py-2.5 pr-2 pl-3">
                        <Tooltip content={d.department}>
                          <p
                            className="truncate font-sans font-medium"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {d.department}
                          </p>
                        </Tooltip>
                      </div>
                      <div className="w-24 shrink-0 py-2.5 pr-2 pl-3">
                        <p className="truncate" style={{ fontSize: 14, color: '#0D2630' }}>
                          {formatCurrencyWhole(d.thisAmount)}
                        </p>
                      </div>
                      <div className="w-24 shrink-0 py-2.5 pr-2 pl-3">
                        <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                          {formatCurrencyWhole(d.prevAmount)}
                        </p>
                      </div>
                      <div className="w-24 shrink-0 py-2.5 pr-2 pl-3">
                        <p
                          className="truncate font-sans font-medium"
                          style={{
                            fontSize: 14,
                            color: (d.changePercent ?? 0) >= 0 ? '#16A34A' : '#DC2626',
                          }}
                        >
                          {d.changePercent !== null
                            ? `${d.changePercent >= 0 ? '↑' : '↓'}${Math.abs(d.changePercent)}%`
                            : 'n/a'}
                        </p>
                      </div>
                      <div className="w-20 shrink-0 py-2.5 pr-2 pl-3">
                        <Sparkline
                          data={d.sparkline}
                          color={DEPARTMENT_COLORS[d.department] ?? '#00B4D8'}
                          width={72}
                          height={28}
                        />
                      </div>
                    </div>
                  ))}
                </ScrollableTable>
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
                  Revenue Aging (Outstanding)
                </p>
                <button
                  type="button"
                  onClick={() => router.push(ROUTES.billingOutstanding)}
                  className={`flex items-center gap-1 font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                  style={{ fontSize: 14, color: '#00B4D8' }}
                >
                  View All
                  <ChevronRight style={{ width: 13, height: 13 }} />
                </button>
              </div>
              <div className="mt-3 flex justify-center">
                <AnimatedDonutChart
                  breakdown={agingBuckets.map((a) => ({
                    label: a.label,
                    value: a.amount,
                    color: a.color,
                  }))}
                  total={totalOutstanding}
                  size={130}
                  ariaLabel="Revenue aging breakdown"
                  centerValue={formatCurrencyWhole(totalOutstanding)}
                  centerLabel="Total Outstanding"
                />
              </div>
              <div className="mt-4 flex flex-col gap-2">
                {agingBuckets.map((a) => (
                  <div key={a.label} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ background: a.color }}
                      />
                      <span style={{ fontSize: 14, color: '#4A7080' }}>{a.label}</span>
                    </span>
                    <span
                      className="font-sans font-medium"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {formatCurrencyWhole(a.amount)}
                    </span>
                  </div>
                ))}
              </div>
              {overdueCount > 0 && (
                <div
                  className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-[10px] p-3"
                  style={{
                    background: 'rgba(217,119,6,0.08)',
                    border: '1px solid rgba(217,119,6,0.25)',
                  }}
                >
                  <div>
                    <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                      {overdueCount} invoices are overdue
                    </p>
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>
                      Oldest overdue: {oldestOverdueDays} days
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push(ROUTES.billingOutstanding)}
                    className={`flex h-9 items-center gap-1.5 rounded-[8px] px-3 font-sans font-medium transition-colors duration-150 hover:bg-white ${FOCUS_RING}`}
                    style={{
                      fontSize: 14,
                      color: '#0D2630',
                      border: '1px solid rgba(0,100,130,0.2)',
                    }}
                  >
                    View Overdue Invoices
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div
              className="rounded-[12px] p-4 sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Revenue by Service Category
              </p>
              <div className="mt-3 flex flex-col gap-3">
                {serviceRows.map((s) => (
                  <div key={s.category} className="flex items-center gap-2.5">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ background: s.color }}
                    />
                    <p
                      className="min-w-0 flex-1 truncate"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {s.category}
                    </p>
                    <span
                      className="shrink-0 font-sans font-semibold"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {formatCurrencyWhole(s.amount)}
                    </span>
                    <span
                      className="shrink-0"
                      style={{ fontSize: 14, color: '#8A98A3', width: 44, textAlign: 'right' }}
                    >
                      {s.percent.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="rounded-[12px] p-4 sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <div className="flex items-center gap-2">
                <Lightbulb style={{ width: 16, height: 16, color: '#00B4D8' }} />
                <p
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Quick Insights
                </p>
              </div>
              <div className="mt-3 flex flex-col gap-2.5">
                {changePercent !== null && (
                  <p style={{ fontSize: 14, color: '#4A7080' }}>
                    Revenue {changePercent >= 0 ? 'increased' : 'decreased'} by{' '}
                    {Math.abs(changePercent)}% compared to the previous period.
                  </p>
                )}
                {topMethod && (
                  <p style={{ fontSize: 14, color: '#4A7080' }}>
                    {topMethod.method} payments contribute {topMethod.percent.toFixed(1)}% of total
                    revenue collected.
                  </p>
                )}
                {topDepartment && (
                  <p style={{ fontSize: 14, color: '#4A7080' }}>
                    {topDepartment.department} is the top revenue generating department.
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => router.push(ROUTES.billingReportsRevenue)}
                className={`mt-3 flex items-center gap-1 font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#00B4D8' }}
              >
                View Detailed Report
                <ChevronRight style={{ width: 13, height: 13 }} />
              </button>
            </div>
          </div>

          <div
            className="mt-5 rounded-[12px] p-4 sm:p-5"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
              Monthly Revenue Summary
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
              {monthlyRows.map((m, i) => (
                <div
                  key={m.key}
                  className="rounded-[10px] p-3.5"
                  style={
                    i === monthlyRows.length - 1
                      ? { border: '1px solid #00B4D8', background: 'rgba(0,180,216,0.06)' }
                      : { border: '1px solid rgba(0,100,130,0.12)' }
                  }
                >
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>{m.label}</p>
                  <p className="font-display font-bold" style={{ fontSize: 18, color: '#0D2630' }}>
                    {formatCurrencyWhole(m.total)}
                  </p>
                  {m.changePercent !== null && (
                    <p
                      style={{ fontSize: 14, color: m.changePercent >= 0 ? '#16A34A' : '#DC2626' }}
                    >
                      {m.changePercent >= 0 ? '↑' : '↓'} {Math.abs(m.changePercent)}%
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
