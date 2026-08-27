'use client';

import {
  BedDouble,
  Beaker,
  CalendarDays,
  ChevronRight,
  Clock,
  CreditCard,
  Download,
  Eye,
  FileText,
  Package,
  Pill,
  Receipt,
  RotateCcw,
  Siren,
  Stethoscope,
  Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { AnimatedDonutChart } from '@components/shared/AnimatedDonutChart';
import { FormSelect } from '@components/shared/FormSelect';
import { ModalLoadingFallback } from '@components/shared/ModalLoadingFallback';
import { Pagination } from '@components/shared/Pagination';
import {
  ScrollableTable,
  TABLE_HEADER_BG,
  TABLE_HEADER_STICKY_CLASS,
} from '@components/shared/ScrollableTable';
import { StatCard } from '@components/shared/StatCard';
import { Tooltip } from '@components/shared/Tooltip';
import { ROUTES } from '@/constants/routes';
import { useToast } from '@/hooks/useToast';
import { downloadCSV, downloadPDF, escapeHtml } from '@/utils/export';
import { formatCurrencyCompact, formatCurrencyWhole } from '@/utils/currency';
import { formatHumanDate, isToday } from '@/utils/datetime';
import {
  buildAllInvoices,
  buildAllPayments,
  type InvoiceStatus,
  type InvoiceWithAccount,
} from '@/features/billing/__mocks__/billingAccountDetailFixtures';
import {
  OUTSTANDING_INVOICES_AGEING,
  REVENUE_TREND_TODAY,
  buildRevenueTrendMonth,
  buildRevenueTrendWeek,
  buildRevenueTrendYear,
  type TrendPoint,
} from '@/features/billing/__mocks__/billingDashboardFixtures';

const InvoicePreviewModal = dynamic(
  () =>
    import('@/features/billing/components/InvoicePreviewModal').then((m) => m.InvoicePreviewModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const STATUS_CFG: Record<InvoiceStatus, { color: string; bg: string; label: string }> = {
  Draft: { color: '#4A7080', bg: 'rgba(74,112,128,0.1)', label: 'Draft' },
  Issued: { color: '#2563EB', bg: 'rgba(37,99,235,0.1)', label: 'Pending' },
  'Partially Paid': { color: '#D97706', bg: 'rgba(217,119,6,0.1)', label: 'Partially Paid' },
  Paid: { color: '#16A34A', bg: 'rgba(22,163,74,0.1)', label: 'Paid' },
  Overdue: { color: '#DC2626', bg: 'rgba(220,38,38,0.1)', label: 'Overdue' },
  Cancelled: { color: '#8A98A3', bg: 'rgba(138,152,163,0.12)', label: 'Cancelled' },
};

const DEPARTMENT_ICONS: Record<string, LucideIcon> = {
  'Clinical / Consultation': Stethoscope,
  Consultation: Stethoscope,
  'Nursing / Wards': BedDouble,
  Ward: BedDouble,
  Pharmacy: Pill,
  Laboratory: Beaker,
  Emergency: Siren,
  'Other Services': Package,
};

const AGING_COLOR = ['#2563EB', '#D97706', '#EA580C', '#DC2626'];

type Period = 'today' | 'week' | 'month' | 'year';
const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'year', label: 'This Year' },
];

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
            <linearGradient id="billing-overview-revenue-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00B4D8" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#00B4D8" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaD} fill="url(#billing-overview-revenue-fill)" stroke="none" />
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

function buildInvoiceBody(inv: InvoiceWithAccount): string {
  return `
    <h1>${escapeHtml(inv.invoiceNumber)}</h1>
    <p class="meta">${escapeHtml(inv.patientName)} &middot; ${escapeHtml(inv.mrn)} &middot; ${escapeHtml(inv.department)}</p>
    <hr>
    <p>${escapeHtml(inv.description)}</p>
    <p>Issued ${escapeHtml(formatHumanDate(inv.date))}, Due ${escapeHtml(formatHumanDate(inv.dueDate))}</p>
    <table><thead><tr><th>Amount</th><th>Paid</th><th>Balance</th><th>Status</th></tr></thead><tbody>
    <tr><td>${escapeHtml(formatCurrencyWhole(inv.amount))}</td><td>${escapeHtml(formatCurrencyWhole(inv.paid))}</td><td>${escapeHtml(formatCurrencyWhole(Math.max(0, inv.amount - inv.paid)))}</td><td>${escapeHtml(inv.status)}</td></tr>
    </tbody></table>
  `;
}

const QUICK_ACTIONS: { label: string; icon: LucideIcon; route: string }[] = [
  { label: 'Create Invoice', icon: FileText, route: ROUTES.billingInvoices },
  { label: 'Record Payment', icon: CreditCard, route: ROUTES.billingPayments },
  { label: 'View Invoices', icon: Eye, route: ROUTES.billingInvoices },
  { label: 'Refund Payment', icon: RotateCcw, route: ROUTES.billingRefunds },
  { label: 'Unpaid Invoices', icon: Clock, route: ROUTES.billingOutstanding },
];

const INVOICE_PAGE_SIZE = 5;
const PAYMENT_PAGE_SIZE = 5;

export function BillingOverviewWorkspace() {
  const router = useRouter();
  const toast = useToast();
  const [period, setPeriod] = useState<Period>('month');
  const [invoicePage, setInvoicePage] = useState(1);
  const [paymentPage, setPaymentPage] = useState(1);
  const [previewInvoice, setPreviewInvoice] = useState<InvoiceWithAccount | null>(null);

  const invoices = useMemo(() => buildAllInvoices(), []);
  const payments = useMemo(() => buildAllPayments(), []);

  const invoicesToday = invoices.filter((i) => isToday(i.date));
  const paymentsToday = payments.filter((p) => isToday(p.date));
  const revenueToday = invoicesToday.reduce((sum, i) => sum + i.amount, 0);
  const paymentsTodayTotal = paymentsToday.reduce((sum, p) => sum + p.amount, 0);
  const outstandingBalance = invoices.reduce((sum, i) => sum + Math.max(0, i.amount - i.paid), 0);
  const overdueInvoices = invoices.filter((i) => i.status === 'Overdue');

  const [now] = useState(() => Date.now());
  const revenueTrend =
    period === 'today'
      ? REVENUE_TREND_TODAY
      : period === 'week'
        ? buildRevenueTrendWeek(now)
        : period === 'year'
          ? buildRevenueTrendYear(now)
          : buildRevenueTrendMonth(now);
  const revenueTrendTotal = revenueTrend.reduce((sum, p) => sum + p.value, 0);
  const periodLabel = PERIOD_OPTIONS.find((o) => o.value === period)?.label ?? 'This Month';

  const statusCounts = useMemo(() => {
    const counts = new Map<InvoiceStatus, number>();
    for (const inv of invoices) counts.set(inv.status, (counts.get(inv.status) ?? 0) + 1);
    return counts;
  }, [invoices]);

  const donutBreakdown = (
    ['Paid', 'Partially Paid', 'Issued', 'Overdue', 'Draft', 'Cancelled'] as InvoiceStatus[]
  )
    .map((status) => ({
      label: STATUS_CFG[status].label,
      value: statusCounts.get(status) ?? 0,
      color: STATUS_CFG[status].color,
    }))
    .filter((s) => s.value > 0);

  const departmentBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    for (const inv of invoices) counts.set(inv.department, (counts.get(inv.department) ?? 0) + 1);
    return Array.from(counts.entries())
      .map(([department, count]) => ({
        department,
        count,
        percent: invoices.length > 0 ? (count / invoices.length) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [invoices]);

  const sortedInvoices = useMemo(
    () => [...invoices].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [invoices],
  );
  const sortedPayments = useMemo(
    () => [...payments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [payments],
  );

  const pagedInvoices = sortedInvoices.slice(
    (invoicePage - 1) * INVOICE_PAGE_SIZE,
    invoicePage * INVOICE_PAGE_SIZE,
  );
  const pagedPayments = sortedPayments.slice(
    (paymentPage - 1) * PAYMENT_PAGE_SIZE,
    paymentPage * PAYMENT_PAGE_SIZE,
  );

  function handleDownloadInvoice(inv: InvoiceWithAccount) {
    downloadPDF(inv.invoiceNumber, buildInvoiceBody(inv));
    toast.success('Invoice downloaded', `${inv.invoiceNumber} is ready to print.`);
  }

  function handleExportReport() {
    const rows: string[][] = [['Section', 'Item', 'Value']];
    rows.push(['Stat', 'Invoices Today', String(invoicesToday.length)]);
    rows.push(['Stat', 'Revenue Today', formatCurrencyWhole(revenueToday)]);
    rows.push(['Stat', 'Payments Today', formatCurrencyWhole(paymentsTodayTotal)]);
    rows.push(['Stat', 'Outstanding Balance', formatCurrencyWhole(outstandingBalance)]);
    rows.push(['Stat', 'Overdue Invoices', String(overdueInvoices.length)]);
    rows.push([
      'Revenue Trend',
      `Total Revenue (${periodLabel})`,
      formatCurrencyWhole(revenueTrendTotal),
    ]);
    for (const seg of donutBreakdown) {
      rows.push(['Billing Summary', seg.label, String(seg.value)]);
    }
    for (const d of departmentBreakdown) {
      rows.push(['Invoices by Department', d.department, `${d.count} (${d.percent.toFixed(1)}%)`]);
    }
    for (const inv of sortedInvoices) {
      rows.push([
        'Recent Invoices',
        inv.invoiceNumber,
        `${inv.patientName} - ${inv.department} - ${formatCurrencyWhole(inv.amount)} - ${STATUS_CFG[inv.status].label}`,
      ]);
    }
    for (const p of sortedPayments) {
      rows.push([
        'Recent Payments',
        p.paymentNumber,
        `${p.patientName} - ${formatCurrencyWhole(p.amount)} - ${p.method}`,
      ]);
    }
    for (const a of OUTSTANDING_INVOICES_AGEING) {
      rows.push([
        'Aging',
        a.bucket,
        `${formatCurrencyWhole(a.amount)} - ${a.invoices} invoices (${a.percent}%)`,
      ]);
    }
    downloadCSV('billing-overview', rows);
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
              Billing Overview
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
                  Billing Overview
                </h1>
                <p
                  className="mt-0.5"
                  style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}
                >
                  Real-time overview of billing activities and financial transactions.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <div
                className="flex h-11 items-center gap-2 rounded-[10px] px-3.5 font-sans font-medium"
                style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
              >
                <CalendarDays style={{ width: 15, height: 15, color: '#4A7080' }} />
                {formatHumanDate(new Date())}
              </div>
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
              icon={FileText}
              label="Invoices Today"
              value={invoicesToday.length}
              info="vs yesterday"
              accent="#2563EB"
              iconBg="rgba(37,99,235,0.1)"
            />
            <StatCard
              icon={Wallet}
              label="Revenue Today"
              value={formatCurrencyWhole(revenueToday)}
              info="vs yesterday"
              accent="#16A34A"
              iconBg="rgba(22,163,74,0.1)"
            />
            <StatCard
              icon={CreditCard}
              label="Payments Today"
              value={formatCurrencyWhole(paymentsTodayTotal)}
              info="vs yesterday"
              accent="#7C3AED"
              iconBg="rgba(124,58,237,0.1)"
            />
            <StatCard
              icon={Wallet}
              label="Outstanding Balance"
              value={formatCurrencyWhole(outstandingBalance)}
              info="Across all invoices"
              accent="#D97706"
              iconBg="rgba(217,119,6,0.1)"
            />
            <StatCard
              icon={Clock}
              label="Overdue Invoices"
              value={overdueInvoices.length}
              info="View details"
              accent="#DC2626"
              iconBg="rgba(220,38,38,0.1)"
              onClick={() => router.push(ROUTES.billingOutstanding)}
            />
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr_1fr]">
            <div
              className="rounded-[12px] p-4 sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <div className="flex items-center justify-between gap-2">
                <p
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Revenue Trend
                </p>
                <div className="w-[140px]">
                  <FormSelect
                    id="revenue-trend-period"
                    value={period}
                    onChange={(v) => setPeriod(v as Period)}
                    options={PERIOD_OPTIONS}
                    placeholder="Select period"
                  />
                </div>
              </div>
              <p className="mt-3" style={{ fontSize: 14, color: '#8A98A3' }}>
                Total Revenue ({periodLabel})
              </p>
              <p className="font-display font-bold" style={{ fontSize: 26, color: '#0D2630' }}>
                {formatCurrencyWhole(revenueTrendTotal)}
              </p>
              <RevenueAreaChart data={revenueTrend} />
            </div>

            <div
              className="rounded-[12px] p-4 sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Billing Summary
              </p>
              <div className="mt-3 flex justify-center">
                <AnimatedDonutChart
                  breakdown={donutBreakdown}
                  total={invoices.length}
                  size={140}
                  ariaLabel="Billing summary by invoice status"
                  centerValue={invoices.length}
                  centerLabel="Total Invoices"
                />
              </div>
              <div className="mt-4 flex flex-col gap-2">
                {donutBreakdown.map((s) => (
                  <div key={s.label} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ background: s.color }}
                      />
                      <span style={{ fontSize: 14, color: '#4A7080' }}>{s.label}</span>
                    </span>
                    <span
                      className="font-sans font-medium"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {s.value} (
                      {invoices.length > 0 ? Math.round((s.value / invoices.length) * 100) : 0}%)
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
                Invoices by Department
              </p>
              <div className="mt-3 flex flex-col gap-3">
                {departmentBreakdown.map((d) => {
                  const Icon = DEPARTMENT_ICONS[d.department] ?? Package;
                  return (
                    <div key={d.department} className="flex items-center gap-2.5">
                      <div
                        className="flex size-8 shrink-0 items-center justify-center rounded-[8px]"
                        style={{ background: 'rgba(0,180,216,0.1)' }}
                      >
                        <Icon style={{ width: 15, height: 15, color: '#00B4D8' }} />
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
                        {d.count}
                      </span>
                      <span
                        className="shrink-0"
                        style={{ fontSize: 14, color: '#8A98A3', width: 48, textAlign: 'right' }}
                      >
                        {d.percent.toFixed(1)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div
              className="rounded-[12px] p-4 sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <div className="flex items-center justify-between gap-2">
                <p
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Recent Invoices
                </p>
                <button
                  type="button"
                  onClick={() => router.push(ROUTES.billingInvoices)}
                  className={`flex items-center gap-1 font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                  style={{ fontSize: 14, color: '#00B4D8' }}
                >
                  View All
                  <ChevronRight style={{ width: 13, height: 13 }} />
                </button>
              </div>
              <div className="mt-3">
                <ScrollableTable minWidth={420}>
                  <div
                    className={`flex ${TABLE_HEADER_STICKY_CLASS}`}
                    style={{ background: TABLE_HEADER_BG }}
                  >
                    <div className="w-24 shrink-0 py-2.5 pr-2 pl-3">
                      <p
                        className="font-sans font-semibold"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Invoice #
                      </p>
                    </div>
                    <div className="max-w-[130px] min-w-0 flex-1 py-2.5 pr-2 pl-3">
                      <p
                        className="font-sans font-semibold"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Patient
                      </p>
                    </div>
                    <div className="w-20 shrink-0 py-2.5 pr-2 pl-3">
                      <p
                        className="font-sans font-semibold"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Amount
                      </p>
                    </div>
                    <div className="w-24 shrink-0 py-2.5 pr-2 pl-3">
                      <p
                        className="font-sans font-semibold"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Status
                      </p>
                    </div>
                    <div className="w-11 shrink-0 py-2.5 pr-2 pl-3" />
                  </div>
                  {pagedInvoices.map((inv) => (
                    <div
                      key={inv.id}
                      className="flex items-center"
                      style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                    >
                      <div className="w-24 shrink-0 py-2.5 pr-2 pl-3">
                        <p
                          className="truncate font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {inv.invoiceNumber}
                        </p>
                      </div>
                      <div className="max-w-[130px] min-w-0 flex-1 py-2.5 pr-2 pl-3">
                        <Tooltip content={inv.patientName}>
                          <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                            {inv.patientName}
                          </p>
                        </Tooltip>
                      </div>
                      <div className="w-20 shrink-0 py-2.5 pr-2 pl-3">
                        <p className="truncate" style={{ fontSize: 14, color: '#0D2630' }}>
                          {formatCurrencyWhole(inv.amount)}
                        </p>
                      </div>
                      <div className="w-24 shrink-0 py-2.5 pr-2 pl-3">
                        <span
                          className="inline-block rounded-full px-2 py-0.5 font-sans font-medium whitespace-nowrap"
                          style={{
                            fontSize: 14,
                            color: STATUS_CFG[inv.status].color,
                            background: STATUS_CFG[inv.status].bg,
                          }}
                        >
                          {STATUS_CFG[inv.status].label}
                        </span>
                      </div>
                      <div className="w-11 shrink-0 py-2.5 pr-2 pl-3">
                        <button
                          type="button"
                          onClick={() => setPreviewInvoice(inv)}
                          aria-label={`View ${inv.invoiceNumber}`}
                          className={`flex size-9 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
                        >
                          <Eye style={{ width: 15, height: 15, color: '#4A7080' }} />
                        </button>
                      </div>
                    </div>
                  ))}
                </ScrollableTable>
              </div>
              <div className="mt-3">
                <Pagination
                  page={invoicePage}
                  pageSize={INVOICE_PAGE_SIZE}
                  totalItems={sortedInvoices.length}
                  onPageChange={setInvoicePage}
                  onPageSizeChange={() => undefined}
                  itemLabel="invoices"
                  pageSizeOptions={[INVOICE_PAGE_SIZE]}
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
                  Recent Payments
                </p>
                <button
                  type="button"
                  onClick={() => router.push(ROUTES.billingPayments)}
                  className={`flex items-center gap-1 font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                  style={{ fontSize: 14, color: '#00B4D8' }}
                >
                  View All
                  <ChevronRight style={{ width: 13, height: 13 }} />
                </button>
              </div>
              <div className="mt-3">
                <ScrollableTable minWidth={460}>
                  <div
                    className={`flex ${TABLE_HEADER_STICKY_CLASS}`}
                    style={{ background: TABLE_HEADER_BG }}
                  >
                    <div className="w-28 shrink-0 py-2.5 pr-2 pl-3">
                      <p
                        className="font-sans font-semibold"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Receipt #
                      </p>
                    </div>
                    <div className="max-w-[110px] min-w-0 flex-1 py-2.5 pr-2 pl-3">
                      <p
                        className="font-sans font-semibold"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Patient
                      </p>
                    </div>
                    <div className="w-20 shrink-0 py-2.5 pr-2 pl-3">
                      <p
                        className="font-sans font-semibold"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Amount
                      </p>
                    </div>
                    <div className="w-24 shrink-0 py-2.5 pr-2 pl-3">
                      <p
                        className="font-sans font-semibold"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Method
                      </p>
                    </div>
                    <div className="w-24 shrink-0 py-2.5 pr-2 pl-3">
                      <p
                        className="font-sans font-semibold"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Date
                      </p>
                    </div>
                  </div>
                  {pagedPayments.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center"
                      style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                    >
                      <div className="w-28 shrink-0 py-2.5 pr-2 pl-3">
                        <p
                          className="truncate font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {p.paymentNumber}
                        </p>
                      </div>
                      <div className="max-w-[110px] min-w-0 flex-1 py-2.5 pr-2 pl-3">
                        <Tooltip content={p.patientName}>
                          <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                            {p.patientName}
                          </p>
                        </Tooltip>
                      </div>
                      <div className="w-20 shrink-0 py-2.5 pr-2 pl-3">
                        <p className="truncate" style={{ fontSize: 14, color: '#0D2630' }}>
                          {formatCurrencyWhole(p.amount)}
                        </p>
                      </div>
                      <div className="w-24 shrink-0 py-2.5 pr-2 pl-3">
                        <Tooltip content={p.method}>
                          <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                            {p.method}
                          </p>
                        </Tooltip>
                      </div>
                      <div className="w-24 shrink-0 py-2.5 pr-2 pl-3">
                        <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                          {formatHumanDate(p.date)}
                        </p>
                      </div>
                    </div>
                  ))}
                </ScrollableTable>
              </div>
              <div className="mt-3">
                <Pagination
                  page={paymentPage}
                  pageSize={PAYMENT_PAGE_SIZE}
                  totalItems={sortedPayments.length}
                  onPageChange={setPaymentPage}
                  onPageSizeChange={() => undefined}
                  itemLabel="payments"
                  pageSizeOptions={[PAYMENT_PAGE_SIZE]}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
            <div
              className="rounded-[12px] p-4 sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Aging of Outstanding Invoices
              </p>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {OUTSTANDING_INVOICES_AGEING.map((a, i) => (
                  <div
                    key={a.bucket}
                    className="rounded-[10px] p-3.5"
                    style={{
                      border: '1px solid rgba(0,100,130,0.12)',
                      borderLeft: `3px solid ${AGING_COLOR[i % AGING_COLOR.length]}`,
                    }}
                  >
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>{a.bucket}</p>
                    <p
                      className="font-display font-bold"
                      style={{ fontSize: 22, color: '#0D2630' }}
                    >
                      {formatCurrencyWhole(a.amount)}
                    </p>
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>
                      {a.invoices} invoices ({a.percent}%)
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="rounded-[12px] p-4 sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Quick Actions
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-2">
                {QUICK_ACTIONS.map((a) => (
                  <button
                    key={a.label}
                    type="button"
                    onClick={() => router.push(a.route)}
                    className={`flex flex-col items-center gap-1.5 rounded-[10px] p-3 text-center transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                    style={{ border: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    <a.icon style={{ width: 18, height: 18, color: '#00B4D8' }} />
                    <span style={{ fontSize: 14, color: '#0D2630' }}>{a.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {previewInvoice && (
        <InvoicePreviewModal
          invoice={previewInvoice}
          onClose={() => setPreviewInvoice(null)}
          onDownload={() => {
            handleDownloadInvoice(previewInvoice);
            setPreviewInvoice(null);
          }}
        />
      )}
    </div>
  );
}
