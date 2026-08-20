'use client';

import {
  BarChart3,
  ChevronDown,
  ClipboardList,
  Download,
  Filter,
  Info,
  Percent,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { AnimatedDonutChart } from '@components/shared/AnimatedDonutChart';
import { FormDateInput } from '@components/shared/FormDateInput';
import { FormSelect } from '@components/shared/FormSelect';
import { Tooltip } from '@components/shared/Tooltip';
import { downloadCSV } from '@/utils/export';
import { formatCurrencyCompact, formatCurrencyWhole } from '@/utils/currency';
import { formatHumanDate, formatTime, watMonthStartTimestamp } from '@/utils/datetime';
import { BILLING_ACCOUNT_DEPARTMENTS } from '@/features/billing/__mocks__/billingAccountsFixtures';
import {
  buildAllInvoices,
  buildAllPayments,
  INVOICE_SERVICE_OPTIONS,
  PAYMENT_METHODS,
  type InvoiceWithAccount,
  type PaymentWithAccount,
} from '@/features/billing/__mocks__/billingAccountDetailFixtures';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';
const DAY_MS = 24 * 60 * 60 * 1000;

const SERVICE_COLORS: Record<string, string> = {
  Consultation: '#D97706',
  'Laboratory Tests': '#2563EB',
  'Pharmacy Dispensing': '#16A34A',
  'Ward Admission': '#7C3AED',
  Imaging: '#DB2777',
  Procedures: '#0D9488',
};
const FALLBACK_COLORS = ['#DC2626', '#0EA5E9', '#84CC16', '#F59E0B', '#6366F1'];
function colorFor(service: string, index: number): string {
  return SERVICE_COLORS[service] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length]!;
}

// Canonical service → department pairing for display. The fixture generator
// assigns each invoice's `service` from a rotating index independent of the
// account's own `department`, so picking "whichever invoice happens to carry
// this service" produces nonsensical pairs (e.g. Ward Admission → Consultation).
// This mapping is purely informational for this table's Department column —
// it doesn't touch the account/invoice department used by the Department
// filter or by every other Billing screen.
const SERVICE_DEPARTMENT: Record<string, string> = {
  Consultation: 'Consultation',
  'Laboratory Tests': 'Laboratory',
  'Pharmacy Dispensing': 'Pharmacy',
  'Ward Admission': 'Ward',
  Imaging: 'Other Services',
  Procedures: 'Other Services',
};

type ComparisonPeriod = 'previous-month' | 'previous-quarter' | 'previous-year';
type ChartMode = 'vertical' | 'horizontal';

function endOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

// Returns null (→ "not enough data" caption) when the previous period is too
// small for a fair comparison — a near-zero denominator turns any real
// change into a triple-digit swing, which reads as a bug rather than a real
// number (see Revenue Overview / Revenue by Department's identical guard).
function pctDelta(current: number, previous: number): number | null {
  if (previous <= 0) return current > 0 ? null : 0;
  const delta = Math.round(((current - previous) / previous) * 1000) / 10;
  return Math.abs(delta) > 300 ? null : delta;
}

function getComparisonWindow(
  period: ComparisonPeriod,
  now: number,
): { start: number; end: number } {
  const monthStart = watMonthStartTimestamp(0);
  if (period === 'previous-month') {
    return { start: watMonthStartTimestamp(1), end: monthStart - 1 };
  }
  if (period === 'previous-quarter') {
    return { start: watMonthStartTimestamp(3), end: monthStart - 1 };
  }
  const d = new Date(now);
  return {
    start: new Date(d.getFullYear() - 1, d.getMonth(), 1).getTime(),
    end: new Date(d.getFullYear() - 1, d.getMonth() + 1, 1).getTime() - 1,
  };
}

function ServiceBarChart({
  data,
  mode,
}: {
  data: { label: string; value: number; color: string }[];
  mode: ChartMode;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);

  if (mode === 'horizontal') {
    return (
      <div className="mt-4 flex flex-col gap-3.5">
        {data.map((d) => (
          <div key={d.label}>
            <div className="flex items-center justify-between gap-2">
              <span
                className="truncate font-sans font-medium"
                style={{ fontSize: 14, color: '#0D2630' }}
              >
                {d.label}
              </span>
              <span
                className="shrink-0 font-sans font-semibold whitespace-nowrap"
                style={{ fontSize: 14, color: '#0D2630' }}
              >
                {formatCurrencyCompact(d.value)}
              </span>
            </div>
            <div
              className="mt-1.5 h-2.5 overflow-hidden rounded-full"
              style={{ background: '#F5FBFD' }}
            >
              <div
                className="h-full rounded-full transition-[width] duration-500"
                style={{ width: `${Math.max(2, (d.value / max) * 100)}%`, background: d.color }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className="mt-4 flex items-end gap-3 overflow-x-auto scroll-smooth"
      style={{ height: 300 }}
    >
      {data.map((d) => (
        <div key={d.label} className="flex min-w-[64px] flex-1 flex-col items-center gap-2">
          <span
            className="font-sans font-semibold whitespace-nowrap"
            style={{ fontSize: 14, color: '#0D2630' }}
          >
            {formatCurrencyCompact(d.value)}
          </span>
          <div
            className="w-full rounded-t-[6px] transition-[height] duration-500"
            style={{ height: `${Math.max(4, (d.value / max) * 220)}px`, background: d.color }}
          />
          <Tooltip content={d.label}>
            <span className="max-w-full truncate" style={{ fontSize: 14, color: '#4A7080' }}>
              {d.label}
            </span>
          </Tooltip>
        </div>
      ))}
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

export function RevenueByServiceWorkspace() {
  const [now] = useState(() => Date.now());
  const [allPayments] = useState<PaymentWithAccount[]>(() => buildAllPayments());
  const [allInvoices] = useState<InvoiceWithAccount[]>(() => buildAllInvoices());

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [comparisonPeriod, setComparisonPeriod] = useState<ComparisonPeriod>('previous-month');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [chartMode, setChartMode] = useState<ChartMode>('vertical');

  const invoiceByNumber = useMemo(() => {
    const map = new Map<string, InvoiceWithAccount>();
    for (const inv of allInvoices) map.set(inv.invoiceNumber, inv);
    return map;
  }, [allInvoices]);

  const serviceOf = (p: PaymentWithAccount): string =>
    invoiceByNumber.get(p.invoiceNumber)?.service ?? 'Other';

  function matchesFilters(p: PaymentWithAccount): boolean {
    if (departmentFilter && p.department !== departmentFilter) return false;
    if (methodFilter && p.method !== methodFilter) return false;
    return true;
  }

  const sum = (list: { amount: number }[]) => list.reduce((s, x) => s + x.amount, 0);

  const monthStart = watMonthStartTimestamp(0);
  const thisRangeStart = fromDate ? new Date(fromDate).getTime() : monthStart;
  const thisRangeEnd = toDate ? new Date(toDate).getTime() + DAY_MS - 1 : endOfDay(now);

  const thisPeriodPayments = allPayments.filter((p) => {
    const t = new Date(p.date).getTime();
    return t >= thisRangeStart && t <= thisRangeEnd && matchesFilters(p);
  });

  const { start: prevStart, end: prevEnd } = getComparisonWindow(comparisonPeriod, now);
  const prevPeriodPayments = allPayments.filter((p) => {
    const t = new Date(p.date).getTime();
    return t >= prevStart && t <= prevEnd && matchesFilters(p);
  });

  const thisTotal = sum(thisPeriodPayments);
  const prevTotal = sum(prevPeriodPayments);
  const totalDelta = pctDelta(thisTotal, prevTotal);

  const serviceRows = INVOICE_SERVICE_OPTIONS.map((svc, i) => {
    const thisSvcPayments = thisPeriodPayments.filter((p) => serviceOf(p) === svc);
    const prevSvcPayments = prevPeriodPayments.filter((p) => serviceOf(p) === svc);
    const thisAmount = sum(thisSvcPayments);
    const prevAmount = sum(prevSvcPayments);
    const department = SERVICE_DEPARTMENT[svc] ?? BILLING_ACCOUNT_DEPARTMENTS[0]!;
    return {
      service: svc,
      department,
      color: colorFor(svc, i),
      thisAmount,
      prevAmount,
      changeAmount: thisAmount - prevAmount,
      changePercent: pctDelta(thisAmount, prevAmount),
      transactions: thisSvcPayments.length,
      avgRevenue: thisSvcPayments.length > 0 ? thisAmount / thisSvcPayments.length : 0,
      percentOfTotal: thisTotal > 0 ? (thisAmount / thisTotal) * 100 : 0,
    };
  })
    .filter((r) => r.thisAmount > 0 || r.transactions > 0)
    .sort((a, b) => b.thisAmount - a.thisAmount);

  const activeServiceCount = serviceRows.length;
  const topService = serviceRows[0];
  const avgPerService = activeServiceCount > 0 ? thisTotal / activeServiceCount : 0;
  const prevAvgPerService =
    activeServiceCount > 0 ? prevTotal / Math.max(1, activeServiceCount) : 0;
  const avgPerServiceDelta = pctDelta(avgPerService, prevAvgPerService);

  const totalTransactions = serviceRows.reduce((s, r) => s + r.transactions, 0);
  const overallAvgRevenue = totalTransactions > 0 ? thisTotal / totalTransactions : 0;

  const topByGrowth = [...serviceRows]
    .filter((r) => r.changePercent !== null && r.changePercent > 0)
    .sort((a, b) => (b.changePercent ?? 0) - (a.changePercent ?? 0))
    .slice(0, 5);
  const lowestRevenue = [...serviceRows].sort((a, b) => a.thisAmount - b.thisAmount).slice(0, 3);

  const departmentOptions = BILLING_ACCOUNT_DEPARTMENTS.map((d) => ({ value: d, label: d }));
  const methodOptions = PAYMENT_METHODS.map((m) => ({ value: m, label: m }));
  const comparisonLabel =
    comparisonPeriod === 'previous-month'
      ? 'Previous Month'
      : comparisonPeriod === 'previous-quarter'
        ? 'Previous 3 Months'
        : 'Same Month, Previous Year';

  function clearFilters() {
    setFromDate('');
    setToDate('');
    setDepartmentFilter('');
    setMethodFilter('');
    setComparisonPeriod('previous-month');
  }

  function handleExport() {
    downloadCSV('revenue-by-service', [
      [
        '#',
        'Service',
        'Department',
        'This Period',
        `Comparison (${comparisonLabel})`,
        'Change',
        'Change %',
        '% of Total',
        'Transactions',
        'Avg Revenue',
      ],
      ...serviceRows.map((r, i) => [
        String(i + 1),
        r.service,
        r.department,
        String(r.thisAmount),
        String(r.prevAmount),
        String(r.changeAmount),
        r.changePercent === null ? 'n/a' : `${r.changePercent}%`,
        `${r.percentOfTotal.toFixed(1)}%`,
        String(r.transactions),
        String(Math.round(r.avgRevenue)),
      ]),
    ]);
  }

  return (
    <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
      <div className="mx-auto max-w-[1550px] px-4 py-4 sm:px-6 sm:py-5">
        {/* Header */}
        <div>
          <h1 className="font-display font-bold" style={{ fontSize: 24, color: '#0D2630' }}>
            Revenue by Service
          </h1>
          <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
            Analyze revenue performance across all services.
          </p>
        </div>

        {/* Stat cards */}
        <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-5 xl:gap-4">
          <div
            className="flex items-start gap-3 rounded-[12px] p-4"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <div
              className="flex size-11 shrink-0 items-center justify-center rounded-full"
              style={{ background: 'rgba(37,99,235,0.1)' }}
            >
              <TrendingUp style={{ width: 20, height: 20, color: '#2563EB' }} />
            </div>
            <div className="min-w-0">
              <p style={{ fontSize: 14, color: '#8A98A3' }}>Total Revenue (This Period)</p>
              <p className="font-display font-bold" style={{ fontSize: 20, color: '#0D2630' }}>
                {formatCurrencyWhole(thisTotal)}
              </p>
              {totalDelta === null ? (
                <p style={{ fontSize: 14, color: '#8A98A3' }}>Not enough data to compare</p>
              ) : (
                <p
                  className="font-sans font-medium"
                  style={{ fontSize: 14, color: totalDelta >= 0 ? '#16A34A' : '#DC2626' }}
                >
                  {totalDelta >= 0 ? '↑' : '↓'} {Math.abs(totalDelta)}% vs{' '}
                  {comparisonLabel.toLowerCase()}
                </p>
              )}
            </div>
          </div>

          <div
            className="flex items-start gap-3 rounded-[12px] p-4"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <div
              className="flex size-11 shrink-0 items-center justify-center rounded-full"
              style={{ background: 'rgba(22,163,74,0.1)' }}
            >
              <ClipboardList style={{ width: 20, height: 20, color: '#16A34A' }} />
            </div>
            <div className="min-w-0">
              <p style={{ fontSize: 14, color: '#8A98A3' }}>Total Services</p>
              <p className="font-display font-bold" style={{ fontSize: 20, color: '#0D2630' }}>
                {activeServiceCount}
              </p>
              <p style={{ fontSize: 14, color: '#8A98A3' }}>Services rendered</p>
            </div>
          </div>

          <div
            className="flex items-start gap-3 rounded-[12px] p-4"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <div
              className="flex size-11 shrink-0 items-center justify-center rounded-full"
              style={{ background: 'rgba(124,58,237,0.1)' }}
            >
              <BarChart3 style={{ width: 20, height: 20, color: '#7C3AED' }} />
            </div>
            <div className="min-w-0">
              <p style={{ fontSize: 14, color: '#8A98A3' }}>Top Service</p>
              <p className="font-display font-bold" style={{ fontSize: 20, color: '#0D2630' }}>
                {topService?.service ?? '—'}
              </p>
              <p style={{ fontSize: 14, color: '#8A98A3' }}>
                {topService
                  ? `${formatCurrencyWhole(topService.thisAmount)} (${topService.percentOfTotal.toFixed(1)}%)`
                  : 'No revenue yet'}
              </p>
            </div>
          </div>

          <div
            className="flex items-start gap-3 rounded-[12px] p-4"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <div
              className="flex size-11 shrink-0 items-center justify-center rounded-full"
              style={{ background: 'rgba(217,119,6,0.1)' }}
            >
              <Percent style={{ width: 20, height: 20, color: '#D97706' }} />
            </div>
            <div className="min-w-0">
              <p style={{ fontSize: 14, color: '#8A98A3' }}>Avg. Revenue / Service</p>
              <p className="font-display font-bold" style={{ fontSize: 20, color: '#0D2630' }}>
                {formatCurrencyWhole(avgPerService)}
              </p>
              {avgPerServiceDelta === null ? (
                <p style={{ fontSize: 14, color: '#8A98A3' }}>Not enough data to compare</p>
              ) : (
                <p
                  className="font-sans font-medium"
                  style={{ fontSize: 14, color: avgPerServiceDelta >= 0 ? '#16A34A' : '#DC2626' }}
                >
                  {avgPerServiceDelta >= 0 ? '↑' : '↓'} {Math.abs(avgPerServiceDelta)}% vs{' '}
                  {comparisonLabel.toLowerCase()}
                </p>
              )}
            </div>
          </div>

          <div
            className="flex items-start gap-3 rounded-[12px] p-4"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <div
              className="flex size-11 shrink-0 items-center justify-center rounded-full"
              style={{ background: 'rgba(0,180,216,0.1)' }}
            >
              <TrendingDown style={{ width: 20, height: 20, color: '#00B4D8' }} />
            </div>
            <div className="min-w-0">
              <p style={{ fontSize: 14, color: '#8A98A3' }}>Last Updated</p>
              <p className="font-display font-bold" style={{ fontSize: 20, color: '#0D2630' }}>
                {formatHumanDate(new Date(now))}
              </p>
              <p style={{ fontSize: 14, color: '#8A98A3' }}>{formatTime(new Date(now))}</p>
            </div>
          </div>
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
                Comparison Period
              </label>
              <FormSelect
                id="service-comparison"
                value={comparisonPeriod}
                onChange={(v) => setComparisonPeriod(v as ComparisonPeriod)}
                options={[
                  { value: 'previous-month', label: 'Previous Month' },
                  { value: 'previous-quarter', label: 'Previous 3 Months' },
                  { value: 'previous-year', label: 'Same Month, Previous Year' },
                ]}
                placeholder="Previous Month"
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
                id="service-department"
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
                Payment Method
              </label>
              <FormSelect
                id="service-method"
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
            {(fromDate ||
              toDate ||
              departmentFilter ||
              methodFilter ||
              comparisonPeriod !== 'previous-month') && (
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

        {/* Bar chart + donut */}
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
                  Revenue by Service
                </h2>
                <InfoTip text="Real payments collected per service, for the selected date range." />
              </div>
              <div className="relative">
                <select
                  value={chartMode}
                  onChange={(e) => setChartMode(e.target.value as ChartMode)}
                  aria-label="Chart type"
                  className={`h-10 appearance-none rounded-[10px] py-2 pr-9 pl-3 font-sans font-medium ${FOCUS_RING}`}
                  style={{
                    fontSize: 14,
                    color: '#0D2630',
                    border: '1px solid rgba(0,100,130,0.2)',
                  }}
                >
                  <option value="vertical">Bar Chart</option>
                  <option value="horizontal">Horizontal Bars</option>
                </select>
                <ChevronDown
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: 12,
                    width: 14,
                    height: 14,
                    color: '#4A7080',
                    pointerEvents: 'none',
                  }}
                />
              </div>
            </div>

            {serviceRows.length === 0 ? (
              <p className="mt-6 text-center" style={{ fontSize: 14, color: '#8A98A3' }}>
                No revenue recorded for the current filters.
              </p>
            ) : (
              <ServiceBarChart
                data={serviceRows.map((r) => ({
                  label: r.service,
                  value: r.thisAmount,
                  color: r.color,
                }))}
                mode={chartMode}
              />
            )}
          </div>

          <div
            className="rounded-[12px] p-4 sm:p-5"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <div className="flex items-center gap-1.5">
              <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Service Contribution
              </h2>
              <InfoTip text="Each service's share of total revenue for the selected date range." />
            </div>
            <div className="mt-3 flex items-center gap-4">
              <AnimatedDonutChart
                breakdown={serviceRows.map((r) => ({
                  label: r.service,
                  value: r.thisAmount,
                  color: r.color,
                }))}
                total={thisTotal}
                size={150}
                ariaLabel="Service contribution donut chart"
                centerValue={formatCurrencyCompact(thisTotal)}
                centerLabel="Total"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                {serviceRows.map((r) => (
                  <div key={r.service} className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ background: r.color }}
                      />
                      <span className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                        {r.service}
                      </span>
                    </div>
                    <span
                      className="shrink-0 font-sans font-medium whitespace-nowrap"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {r.percentOfTotal.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Summary table + Top by Growth / Lowest Revenue */}
        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_340px] xl:items-start">
          <div
            className="rounded-[12px] p-4 sm:p-5"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
              Revenue by Service Summary
            </h2>
            <div className="mt-3 overflow-x-auto scroll-smooth">
              <div style={{ minWidth: 980 }}>
                <div
                  className="flex items-center pb-2"
                  style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
                >
                  <span
                    className="w-6 shrink-0 font-sans font-bold tracking-wider uppercase"
                    style={{ fontSize: 14, color: '#8A98A3' }}
                  >
                    #
                  </span>
                  <span
                    className="max-w-[170px] min-w-[110px] flex-1 font-sans font-bold tracking-wider uppercase"
                    style={{ fontSize: 14, color: '#8A98A3' }}
                  >
                    Service
                  </span>
                  <span
                    className="w-28 shrink-0 font-sans font-bold tracking-wider uppercase"
                    style={{ fontSize: 14, color: '#8A98A3' }}
                  >
                    Department
                  </span>
                  <span
                    className="w-28 shrink-0 text-right font-sans font-bold tracking-wider uppercase"
                    style={{ fontSize: 14, color: '#8A98A3' }}
                  >
                    This Period
                  </span>
                  <span
                    className="w-24 shrink-0 text-right font-sans font-bold tracking-wider uppercase"
                    style={{ fontSize: 14, color: '#8A98A3' }}
                  >
                    Change
                  </span>
                  <span
                    className="w-20 shrink-0 text-center font-sans font-bold tracking-wider uppercase"
                    style={{ fontSize: 14, color: '#8A98A3' }}
                  >
                    % Total
                  </span>
                  <span
                    className="w-20 shrink-0 text-center font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                    style={{ fontSize: 14, color: '#8A98A3' }}
                  >
                    Txns
                  </span>
                  <span
                    className="w-24 shrink-0 text-right font-sans font-bold tracking-wider uppercase"
                    style={{ fontSize: 14, color: '#8A98A3' }}
                  >
                    Avg Revenue
                  </span>
                </div>

                {serviceRows.length === 0 && (
                  <p className="py-6 text-center" style={{ fontSize: 14, color: '#8A98A3' }}>
                    No revenue recorded for the current filters.
                  </p>
                )}

                {serviceRows.map((r, i) => (
                  <div
                    key={r.service}
                    className="flex items-center py-2.5"
                    style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                  >
                    <span className="w-6 shrink-0" style={{ fontSize: 14, color: '#8A98A3' }}>
                      {i + 1}
                    </span>
                    <div className="max-w-[170px] min-w-[110px] flex-1">
                      <Tooltip content={r.service}>
                        <p
                          className="truncate font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {r.service}
                        </p>
                      </Tooltip>
                    </div>
                    <div className="w-28 shrink-0">
                      <Tooltip content={r.department}>
                        <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                          {r.department}
                        </p>
                      </Tooltip>
                    </div>
                    <span
                      className="w-28 shrink-0 text-right font-sans font-medium"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {formatCurrencyWhole(r.thisAmount)}
                    </span>
                    <span
                      className="w-24 shrink-0 text-right font-sans font-medium whitespace-nowrap"
                      style={{ fontSize: 14, color: r.changeAmount >= 0 ? '#16A34A' : '#DC2626' }}
                    >
                      {r.changePercent === null
                        ? '—'
                        : `${r.changePercent >= 0 ? '↑' : '↓'} ${Math.abs(r.changePercent)}%`}
                    </span>
                    <span
                      className="w-20 shrink-0 text-center"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      {r.percentOfTotal.toFixed(1)}%
                    </span>
                    <span
                      className="w-20 shrink-0 text-center"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      {r.transactions.toLocaleString('en-NG')}
                    </span>
                    <span
                      className="w-24 shrink-0 text-right font-sans font-medium whitespace-nowrap"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {formatCurrencyCompact(r.avgRevenue)}
                    </span>
                  </div>
                ))}

                {serviceRows.length > 0 && (
                  <div className="flex items-center pt-2.5">
                    <span className="w-6 shrink-0" />
                    <span
                      className="max-w-[170px] min-w-[110px] flex-1 font-sans font-semibold"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      Total
                    </span>
                    <span className="w-28 shrink-0" />
                    <span
                      className="w-28 shrink-0 text-right font-sans font-semibold"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {formatCurrencyWhole(thisTotal)}
                    </span>
                    <span
                      className="w-24 shrink-0 text-right font-sans font-semibold whitespace-nowrap"
                      style={{
                        fontSize: 14,
                        color: totalDelta !== null && totalDelta >= 0 ? '#16A34A' : '#DC2626',
                      }}
                    >
                      {totalDelta === null
                        ? '—'
                        : `${totalDelta >= 0 ? '↑' : '↓'} ${Math.abs(totalDelta)}%`}
                    </span>
                    <span
                      className="w-20 shrink-0 text-center font-sans font-semibold"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      100%
                    </span>
                    <span
                      className="w-20 shrink-0 text-center font-sans font-semibold"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {totalTransactions.toLocaleString('en-NG')}
                    </span>
                    <span
                      className="w-24 shrink-0 text-right font-sans font-semibold whitespace-nowrap"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {formatCurrencyCompact(overallAvgRevenue)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div
              className="rounded-[12px] p-4 sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Top Services by Growth
              </h2>
              <div className="mt-3 flex flex-col gap-3">
                {topByGrowth.length === 0 && (
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>
                    Not enough comparison data to rank growth yet.
                  </p>
                )}
                {topByGrowth.map((r, i) => (
                  <div key={r.service} className="flex items-center gap-2.5">
                    <span
                      className="flex size-6 shrink-0 items-center justify-center rounded-full font-sans font-semibold text-white"
                      style={{ fontSize: 14, background: '#16A34A' }}
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className="truncate font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {r.service}
                      </p>
                      <p style={{ fontSize: 14, color: '#16A34A' }}>↑ {r.changePercent}%</p>
                    </div>
                    <span
                      className="shrink-0 font-sans font-semibold whitespace-nowrap"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {formatCurrencyWhole(r.thisAmount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="rounded-[12px] p-4 sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Lowest Revenue Services
              </h2>
              <div className="mt-3 flex flex-col gap-3">
                {lowestRevenue.length === 0 && (
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>No revenue recorded yet.</p>
                )}
                {lowestRevenue.map((r, i) => (
                  <div key={r.service} className="flex items-center gap-2.5">
                    <span
                      className="flex size-6 shrink-0 items-center justify-center rounded-full font-sans font-semibold text-white"
                      style={{ fontSize: 14, background: '#D97706' }}
                    >
                      {i + 1}
                    </span>
                    <p
                      className="min-w-0 flex-1 truncate font-sans font-medium"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {r.service}
                    </p>
                    <span
                      className="shrink-0 font-sans font-semibold whitespace-nowrap"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {formatCurrencyWhole(r.thisAmount)}
                    </span>
                  </div>
                ))}
              </div>
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
            Revenue is calculated based on payments received and posted within the selected date
            range.
          </p>
        </div>

        <div className="h-4" />
      </div>
    </main>
  );
}
