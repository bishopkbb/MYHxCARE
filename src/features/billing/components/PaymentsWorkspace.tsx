'use client';

import {
  AlertCircle,
  CreditCard,
  Download,
  Eye,
  FilePlus2,
  MoreVertical,
  Plus,
  Printer,
  ReceiptText,
  RotateCcw,
  Wallet,
  X,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';

import { FormDateInput } from '@components/shared/FormDateInput';
import { FormSelect } from '@components/shared/FormSelect';
import { ModalLoadingFallback } from '@components/shared/ModalLoadingFallback';
import { PermissionGate } from '@components/shared/PermissionGate';
import { RowMenuPortal } from '@components/shared/RowMenuPortal';
import {
  ScrollableTable,
  TABLE_HEADER_BG,
  TABLE_HEADER_STICKY_CLASS,
} from '@components/shared/ScrollableTable';
import { Tooltip } from '@components/shared/Tooltip';
import { PERMISSIONS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
import { useToast } from '@/hooks/useToast';
import { downloadCSV, downloadPDF, escapeHtml } from '@/utils/export';
import { formatCurrencyWhole } from '@/utils/currency';
import { isToday, formatHumanDate, formatTime, watMonthStartTimestamp } from '@/utils/datetime';
import { BILLING_ACCOUNT_DEPARTMENTS } from '@/features/billing/__mocks__/billingAccountsFixtures';
import {
  buildAllPayments,
  buildAllRefunds,
  PAYMENT_METHODS,
  type PaymentStatus,
  type PaymentWithAccount,
} from '@/features/billing/__mocks__/billingAccountDetailFixtures';

const RecordPaymentModal = dynamic(
  () => import('./RecordPaymentModal').then((m) => m.RecordPaymentModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);
const RecordRefundModal = dynamic(
  () => import('./RecordRefundModal').then((m) => m.RecordRefundModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';
const ROWS_PER_PAGE = 10;

const STATUS_CFG: Record<PaymentStatus, { color: string; bg: string }> = {
  Posted: { color: '#16A34A', bg: 'rgba(22,163,74,0.1)' },
  Partial: { color: '#D97706', bg: 'rgba(217,119,6,0.1)' },
};

const METHOD_CFG: Record<string, { color: string; bg: string }> = {
  POS: { color: '#0D9488', bg: 'rgba(13,148,136,0.1)' },
  'Bank Transfer': { color: '#2563EB', bg: 'rgba(37,99,235,0.1)' },
  Cash: { color: '#7C3AED', bg: 'rgba(124,58,237,0.1)' },
  Card: { color: '#D97706', bg: 'rgba(217,119,6,0.1)' },
  Online: { color: '#DB2777', bg: 'rgba(219,39,119,0.1)' },
};

type TabKey = 'ALL' | (typeof PAYMENT_METHODS)[number];
const TABS: { key: TabKey; label: string }[] = [
  { key: 'ALL', label: 'All Payments' },
  { key: 'Cash', label: 'Cash' },
  { key: 'POS', label: 'POS' },
  { key: 'Bank Transfer', label: 'Bank Transfer' },
  { key: 'Card', label: 'Card' },
  { key: 'Online', label: 'Online Payment' },
];

function readMrnFromUrl(): string {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get('mrn') ?? '';
}

function PaymentRowMenu({
  open,
  onToggle,
  onView,
  onPrint,
  onViewInvoice,
  onRefund,
}: {
  open: boolean;
  onToggle: () => void;
  onView: () => void;
  onPrint: () => void;
  onViewInvoice: () => void;
  onRefund: () => void;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={onToggle}
        aria-label="More actions"
        className={`flex size-9 shrink-0 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
      >
        <MoreVertical style={{ width: 16, height: 16, color: '#4A7080' }} />
      </button>
      <RowMenuPortal open={open} anchorRef={buttonRef} onClose={onToggle} width={190}>
        <button
          type="button"
          onClick={onView}
          className={`flex w-full items-center gap-2 px-3.5 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
          style={{ fontSize: 14, color: '#0D2630' }}
        >
          <Eye style={{ width: 15, height: 15, color: '#00B4D8' }} />
          View Payment
        </button>
        <button
          type="button"
          onClick={onPrint}
          className={`flex w-full items-center gap-2 px-3.5 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
          style={{ fontSize: 14, color: '#0D2630' }}
        >
          <Printer style={{ width: 15, height: 15, color: '#4A7080' }} />
          Print Receipt
        </button>
        <button
          type="button"
          onClick={onViewInvoice}
          className={`flex w-full items-center gap-2 px-3.5 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
          style={{ fontSize: 14, color: '#0D2630' }}
        >
          <ReceiptText style={{ width: 15, height: 15, color: '#4A7080' }} />
          View Invoice
        </button>
        <button
          type="button"
          onClick={onRefund}
          className={`flex w-full items-center gap-2 px-3.5 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
          style={{ fontSize: 14, color: '#DC2626' }}
        >
          <RotateCcw style={{ width: 15, height: 15 }} />
          Record Refund
        </button>
      </RowMenuPortal>
    </div>
  );
}

export function PaymentsWorkspace() {
  const router = useRouter();
  const toast = useToast();
  const [payments, setPayments] = useState<PaymentWithAccount[]>(() => buildAllPayments());
  const [refunds] = useState(() => buildAllRefunds());

  const [search, setSearch] = useState(readMrnFromUrl);
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState<TabKey>('ALL');
  const [statusFilter, setStatusFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openRowMenuId, setOpenRowMenuId] = useState<string | null>(null);
  const [recordOpen, setRecordOpen] = useState(false);
  const [refundTarget, setRefundTarget] = useState<PaymentWithAccount | null>(null);

  const departmentOptions = useMemo(
    () => BILLING_ACCOUNT_DEPARTMENTS.map((d) => ({ value: d, label: d })),
    [],
  );

  const nonMethodFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return payments.filter((p) => {
      if (departmentFilter && p.department !== departmentFilter) return false;
      if (statusFilter && p.status !== statusFilter) return false;
      if (fromDate && new Date(p.date).getTime() < new Date(fromDate).getTime()) return false;
      if (toDate && new Date(p.date).getTime() > new Date(toDate).getTime() + 86_400_000 - 1)
        return false;
      if (
        q &&
        !p.paymentNumber.toLowerCase().includes(q) &&
        !p.invoiceNumber.toLowerCase().includes(q) &&
        !p.patientName.toLowerCase().includes(q) &&
        !p.mrn.toLowerCase().includes(q) &&
        !p.reference.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [payments, search, departmentFilter, statusFilter, fromDate, toDate]);

  const filtered = useMemo(
    () =>
      methodFilter === 'ALL'
        ? nonMethodFiltered
        : nonMethodFiltered.filter((p) => p.method === methodFilter),
    [nonMethodFiltered, methodFilter],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * ROWS_PER_PAGE;
  const pageRows = filtered.slice(pageStart, pageStart + ROWS_PER_PAGE);
  const selected = selectedId ? payments.find((p) => p.id === selectedId) : undefined;

  const [now] = useState(() => Date.now());
  const paymentsToday = payments.filter((p) => isToday(p.date));
  const monthStart = watMonthStartTimestamp(0);
  const paymentsThisWeek = payments.filter(
    (p) => now - new Date(p.date).getTime() < 7 * 24 * 60 * 60 * 1000,
  );
  const paymentsThisMonth = payments.filter((p) => new Date(p.date).getTime() >= monthStart);
  const refundsThisMonth = refunds.filter((r) => new Date(r.date).getTime() >= monthStart);
  const unreconciled = payments.filter((p) => !p.reconciled);

  const sum = (list: PaymentWithAccount[]) => list.reduce((s, p) => s + p.amount, 0);

  function clearFilters() {
    setSearch('');
    setDepartmentFilter('');
    setStatusFilter('');
    setFromDate('');
    setToDate('');
    setCurrentPage(1);
  }

  function handleExport() {
    downloadCSV('payments', [
      [
        'Payment ID',
        'Invoice No',
        'Patient',
        'MRN',
        'Method',
        'Amount Paid',
        'Invoice Balance',
        'Payment Date',
        'Status',
      ],
      ...filtered.map((p) => [
        p.paymentNumber,
        p.invoiceNumber,
        p.patientName,
        p.mrn,
        p.method,
        String(p.amount),
        String(p.invoiceBalance),
        `${formatHumanDate(p.date)} ${formatTime(p.date)}`,
        p.status,
      ]),
    ]);
    toast.success(
      'Export ready',
      `${filtered.length} payment${filtered.length !== 1 ? 's' : ''} exported as CSV.`,
    );
  }

  function handleRecordPayment(payment: PaymentWithAccount) {
    setPayments((prev) => [payment, ...prev]);
    setRecordOpen(false);
    setCurrentPage(1);
    toast.success(
      'Payment recorded',
      `${formatCurrencyWhole(payment.amount)} posted for ${payment.patientName}.`,
    );
  }

  function buildReceiptBody(p: PaymentWithAccount) {
    return `
      <h1>${escapeHtml(p.paymentNumber)}</h1>
      <p class="meta">${escapeHtml(p.patientName)} · ${escapeHtml(p.mrn)} · ${escapeHtml(p.department)}</p>
      <hr>
      <p>Invoice ${escapeHtml(p.invoiceNumber)} · ${escapeHtml(p.method)} · Ref ${escapeHtml(p.reference)}</p>
      <p>Posted ${escapeHtml(formatHumanDate(p.date))}, ${escapeHtml(formatTime(p.date))} by ${escapeHtml(p.postedBy)}</p>
      <table><thead><tr><th>Amount Paid</th><th>Invoice Balance</th><th>Status</th></tr></thead><tbody>
      <tr><td>${escapeHtml(formatCurrencyWhole(p.amount))}</td><td>${escapeHtml(formatCurrencyWhole(p.invoiceBalance))}</td><td>${escapeHtml(p.status)}</td></tr>
      </tbody></table>
    `;
  }

  function handlePrint(p: PaymentWithAccount) {
    downloadPDF(p.paymentNumber, buildReceiptBody(p));
    toast.success('Receipt downloaded', `${p.paymentNumber} is ready to print.`);
  }

  function goToInvoice(mrn: string) {
    router.push(`${ROUTES.billingInvoices}?mrn=${encodeURIComponent(mrn)}`);
  }

  function handleRecordRefund(amount: number, reason: string) {
    if (!refundTarget) return;
    toast.success(
      'Refund recorded',
      `${formatCurrencyWhole(amount)} refund logged for ${refundTarget.patientName} (${reason}).`,
    );
    setRefundTarget(null);
  }

  return (
    <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
      <div className="mx-auto max-w-[1550px] px-4 py-4 sm:px-6 sm:py-5">
        {/* Header */}
        <div>
          <h1 className="font-display font-bold" style={{ fontSize: 24, color: '#0D2630' }}>
            Payments
          </h1>
          <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
            Record, manage and track all payments received
          </p>
        </div>

        {/* Stat cards */}
        <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-5 xl:gap-4">
          {[
            {
              icon: Wallet,
              label: 'Payments Today',
              value: formatCurrencyWhole(sum(paymentsToday)),
              caption: `${paymentsToday.length} Transaction${paymentsToday.length !== 1 ? 's' : ''}`,
              trend: '+12.5% vs yesterday',
              accent: '#2563EB',
            },
            {
              icon: FilePlus2,
              label: 'This Week',
              value: formatCurrencyWhole(sum(paymentsThisWeek)),
              caption: `${paymentsThisWeek.length} Transaction${paymentsThisWeek.length !== 1 ? 's' : ''}`,
              trend: '+9.4% vs last week',
              accent: '#16A34A',
            },
            {
              icon: CreditCard,
              label: 'This Month',
              value: formatCurrencyWhole(sum(paymentsThisMonth)),
              caption: `${paymentsThisMonth.length} Transaction${paymentsThisMonth.length !== 1 ? 's' : ''}`,
              trend: '+15.3% vs last month',
              accent: '#0D9488',
            },
            {
              icon: RotateCcw,
              label: 'Refunds This Month',
              value: formatCurrencyWhole(refundsThisMonth.reduce((s, r) => s + r.amount, 0)),
              caption: `${refundsThisMonth.length} Transaction${refundsThisMonth.length !== 1 ? 's' : ''}`,
              trend: '-5.2% vs last month',
              accent: '#D97706',
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
                <p style={{ fontSize: 14, color: '#8A98A3' }}>{s.caption}</p>
                <p className="mt-0.5" style={{ fontSize: 14, color: s.accent }}>
                  {s.trend}
                </p>
              </div>
            </div>
          ))}
          <div
            className="flex items-start gap-3 rounded-[12px] p-4"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <div
              className="flex size-11 shrink-0 items-center justify-center rounded-full"
              style={{ background: 'rgba(220,38,38,0.1)' }}
            >
              <AlertCircle style={{ width: 20, height: 20, color: '#DC2626' }} />
            </div>
            <div className="min-w-0">
              <p style={{ fontSize: 14, color: '#8A98A3' }}>Unreconciled</p>
              <p className="font-display font-bold" style={{ fontSize: 20, color: '#0D2630' }}>
                {formatCurrencyWhole(sum(unreconciled))}
              </p>
              <p style={{ fontSize: 14, color: '#8A98A3' }}>
                {unreconciled.length} Transaction{unreconciled.length !== 1 ? 's' : ''}
              </p>
              <button
                type="button"
                onClick={() => router.push(ROUTES.billingReconciliation)}
                className={`mt-0.5 font-sans font-medium transition-colors duration-150 hover:underline ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#00B4D8' }}
              >
                View reconciliation
              </button>
            </div>
          </div>
        </div>

        {/* Main grid */}
        <div className="mt-4 flex flex-col gap-4 2xl:flex-row 2xl:items-start">
          <div className={`min-w-0 flex-1 ${selected ? 'hidden 2xl:block' : 'block'}`}>
            <div
              className="rounded-[12px] p-4 sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              {/* Tabs + actions */}
              <div
                className="flex flex-wrap items-center justify-between gap-2 border-b"
                style={{ borderColor: 'rgba(0,100,130,0.12)' }}
              >
                <div className="flex flex-wrap items-center gap-1">
                  {TABS.map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => {
                        setMethodFilter(t.key);
                        setCurrentPage(1);
                      }}
                      className={`px-3 py-2.5 font-sans font-medium transition-colors duration-150 ${FOCUS_RING}`}
                      style={{
                        fontSize: 14,
                        color: methodFilter === t.key ? '#00B4D8' : '#4A7080',
                        borderBottom:
                          methodFilter === t.key ? '2px solid #00B4D8' : '2px solid transparent',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <div className="flex shrink-0 items-center gap-2.5 py-2">
                  <button
                    type="button"
                    onClick={handleExport}
                    className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                    style={{
                      fontSize: 14,
                      color: '#0D2630',
                      border: '1px solid rgba(0,100,130,0.2)',
                    }}
                  >
                    <Download style={{ width: 15, height: 15 }} />
                    Export
                  </button>
                  <PermissionGate permission={PERMISSIONS.BILLING_WRITE}>
                    <button
                      type="button"
                      onClick={() => setRecordOpen(true)}
                      className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                      style={{ fontSize: 14, background: '#00B4D8' }}
                    >
                      <Plus style={{ width: 15, height: 15 }} />
                      Record Payment
                    </button>
                  </PermissionGate>
                </div>
              </div>

              {/* Filters */}
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="relative sm:col-span-2 lg:col-span-1">
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Search by invoice no., patient name, reference…"
                    className="h-11 w-full rounded-[10px] px-3.5 font-sans transition-colors duration-150 placeholder:text-[#8A98A3] focus:border-[#00B4D8] focus:ring-2 focus:ring-[#00B4D8]/40 focus:outline-none"
                    style={{
                      fontSize: 14,
                      color: '#0D2630',
                      border: '1px solid rgba(0,100,130,0.18)',
                    }}
                  />
                </div>
                <FormSelect
                  id="payment-department"
                  value={departmentFilter}
                  onChange={(v) => {
                    setDepartmentFilter(v);
                    setCurrentPage(1);
                  }}
                  options={departmentOptions}
                  placeholder="All Departments"
                />
                <FormSelect
                  id="payment-method"
                  value={methodFilter === 'ALL' ? '' : methodFilter}
                  onChange={(v) => {
                    setMethodFilter((v as TabKey) || 'ALL');
                    setCurrentPage(1);
                  }}
                  options={PAYMENT_METHODS.map((m) => ({ value: m, label: m }))}
                  placeholder="All Methods"
                />
                <FormSelect
                  id="payment-status"
                  value={statusFilter}
                  onChange={(v) => {
                    setStatusFilter(v);
                    setCurrentPage(1);
                  }}
                  options={[
                    { value: 'Posted', label: 'Posted' },
                    { value: 'Partial', label: 'Partial' },
                  ]}
                  placeholder="All Statuses"
                />
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
                      onChange={(e) => {
                        setFromDate(e.target.value);
                        setCurrentPage(1);
                      }}
                      aria-label="From date"
                    />
                    <span style={{ fontSize: 14, color: '#8A98A3' }}>–</span>
                    <FormDateInput
                      value={toDate}
                      onChange={(e) => {
                        setToDate(e.target.value);
                        setCurrentPage(1);
                      }}
                      aria-label="To date"
                    />
                  </div>
                </div>
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
                  More Filters
                </button>
                {moreFiltersOpen && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className={`flex h-11 items-center justify-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:underline ${FOCUS_RING}`}
                    style={{ fontSize: 14, color: '#00B4D8' }}
                  >
                    Clear all filters
                  </button>
                )}
              </div>

              {/* Table */}
              <div className="mt-4">
                <ScrollableTable minWidth={1280} maxHeight={640}>
                  <div
                    className={`flex rounded-t-[8px] ${TABLE_HEADER_STICKY_CLASS}`}
                    style={{ background: TABLE_HEADER_BG, borderBottom: '1px solid #E6F8FD' }}
                  >
                    <div className="w-36 shrink-0 py-2.5 pr-2 pl-3">
                      <span
                        className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Payment ID
                      </span>
                    </div>
                    <div className="w-28 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Invoice No.
                      </span>
                    </div>
                    <div className="min-w-[140px] flex-1 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Patient
                      </span>
                    </div>
                    <div className="w-32 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Method
                      </span>
                    </div>
                    <div className="w-32 shrink-0 py-2.5 pr-2 text-center">
                      <Tooltip content="Amount Paid">
                        <span
                          className="truncate font-sans font-bold tracking-wider uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Amount Paid
                        </span>
                      </Tooltip>
                    </div>
                    <div className="w-40 shrink-0 py-2.5 pr-2 text-center">
                      <Tooltip content="Invoice Balance">
                        <span
                          className="truncate font-sans font-bold tracking-wider uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Invoice Balance
                        </span>
                      </Tooltip>
                    </div>
                    <div className="w-32 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Payment Date
                      </span>
                    </div>
                    <div className="w-24 shrink-0 py-2.5 pr-2 text-center">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Status
                      </span>
                    </div>
                    <div className="w-20 shrink-0 py-2.5 pr-3 text-right">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Actions
                      </span>
                    </div>
                  </div>

                  {pageRows.length === 0 && (
                    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                      <div
                        className="flex size-14 items-center justify-center rounded-full"
                        style={{ background: 'rgba(226,237,241,0.6)' }}
                      >
                        <Wallet style={{ width: 24, height: 24, color: '#8A98A3' }} />
                      </div>
                      <p
                        className="font-sans font-medium"
                        style={{ fontSize: 16, color: '#4A7080' }}
                      >
                        No payments match your filters
                      </p>
                      <button
                        type="button"
                        onClick={clearFilters}
                        className={`mt-1 font-sans font-medium transition-colors duration-150 hover:underline ${FOCUS_RING}`}
                        style={{ fontSize: 14, color: '#00B4D8' }}
                      >
                        Clear all filters
                      </button>
                    </div>
                  )}

                  {pageRows.map((p) => {
                    const statusCfg = STATUS_CFG[p.status];
                    const methodCfg = METHOD_CFG[p.method] ?? { color: '#4A7080', bg: '#F5FBFD' };
                    return (
                      <div
                        key={p.id}
                        onClick={() => setSelectedId(p.id)}
                        className="flex cursor-pointer items-center transition-colors duration-100 hover:bg-[#F5FBFD]"
                        style={{
                          borderBottom: '1px solid rgba(0,100,130,0.08)',
                          background: selectedId === p.id ? '#E6F8FD' : 'transparent',
                        }}
                      >
                        <div className="w-36 shrink-0 py-3 pr-2 pl-3">
                          <p
                            className="font-sans font-medium whitespace-nowrap"
                            style={{ fontSize: 14, color: '#00B4D8' }}
                          >
                            {p.paymentNumber}
                          </p>
                        </div>
                        <div className="w-28 shrink-0 py-3 pr-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              goToInvoice(p.mrn);
                            }}
                            className={`font-sans font-medium hover:underline ${FOCUS_RING}`}
                            style={{ fontSize: 14, color: '#00B4D8' }}
                          >
                            {p.invoiceNumber}
                          </button>
                        </div>
                        <div className="min-w-[140px] flex-1 py-3 pr-2">
                          <Tooltip content={p.patientName}>
                            <p
                              className="truncate font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {p.patientName}
                            </p>
                          </Tooltip>
                        </div>
                        <div className="w-32 shrink-0 py-3 pr-2">
                          <span
                            className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium whitespace-nowrap"
                            style={{
                              fontSize: 14,
                              color: methodCfg.color,
                              background: methodCfg.bg,
                            }}
                          >
                            {p.method}
                          </span>
                        </div>
                        <div className="w-32 shrink-0 py-3 pr-2 text-center">
                          <p
                            className="font-sans font-medium"
                            style={{ fontSize: 14, color: '#16A34A' }}
                          >
                            {formatCurrencyWhole(p.amount)}
                          </p>
                        </div>
                        <div className="w-40 shrink-0 py-3 pr-2 text-center">
                          <p
                            className="font-sans font-medium"
                            style={{
                              fontSize: 14,
                              color: p.invoiceBalance > 0 ? '#DC2626' : '#0D2630',
                            }}
                          >
                            {formatCurrencyWhole(p.invoiceBalance)}
                          </p>
                        </div>
                        <div className="w-32 shrink-0 py-3 pr-2">
                          <p style={{ fontSize: 14, color: '#4A7080' }}>
                            {formatHumanDate(p.date)}
                          </p>
                          <p style={{ fontSize: 14, color: '#8A98A3' }}>{formatTime(p.date)}</p>
                        </div>
                        <div className="w-24 shrink-0 py-3 pr-2 text-center">
                          <span
                            className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium whitespace-nowrap"
                            style={{
                              fontSize: 14,
                              color: statusCfg.color,
                              background: statusCfg.bg,
                            }}
                          >
                            {p.status}
                          </span>
                        </div>
                        <div
                          className="flex w-20 shrink-0 items-center justify-end gap-1 py-3 pr-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <PaymentRowMenu
                            open={openRowMenuId === p.id}
                            onToggle={() =>
                              setOpenRowMenuId((prev) => (prev === p.id ? null : p.id))
                            }
                            onView={() => {
                              setOpenRowMenuId(null);
                              setSelectedId(p.id);
                            }}
                            onPrint={() => {
                              setOpenRowMenuId(null);
                              handlePrint(p);
                            }}
                            onViewInvoice={() => {
                              setOpenRowMenuId(null);
                              goToInvoice(p.mrn);
                            }}
                            onRefund={() => {
                              setOpenRowMenuId(null);
                              setRefundTarget(p);
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </ScrollableTable>
              </div>

              {filtered.length > 0 && (
                <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
                  <p style={{ fontSize: 14, color: '#4A7080' }}>
                    Showing {pageStart + 1} to{' '}
                    {Math.min(pageStart + ROWS_PER_PAGE, filtered.length)} of {filtered.length}{' '}
                    payments
                  </p>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={safePage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className={`flex size-9 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#F5FBFD] disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING}`}
                      style={{ border: '1px solid rgba(0,100,130,0.18)', color: '#4A7080' }}
                      aria-label="Previous page"
                    >
                      ‹
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                      .reduce<(number | 'ellipsis')[]>((acc, p) => {
                        if (acc.length > 0 && typeof acc[acc.length - 1] === 'number') {
                          const prev = acc[acc.length - 1] as number;
                          if (p - prev > 1) acc.push('ellipsis');
                        }
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((p, i) =>
                        p === 'ellipsis' ? (
                          <span
                            key={`e-${i}`}
                            style={{ fontSize: 14, color: '#8A98A3' }}
                            className="px-1"
                          >
                            …
                          </span>
                        ) : (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setCurrentPage(p)}
                            className={`flex size-9 items-center justify-center rounded-[8px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                            style={{
                              fontSize: 14,
                              border: `1px solid ${p === safePage ? '#00B4D8' : 'rgba(0,100,130,0.18)'}`,
                              color: p === safePage ? '#00B4D8' : '#4A7080',
                              background: p === safePage ? '#E6F8FD' : 'transparent',
                            }}
                          >
                            {p}
                          </button>
                        ),
                      )}
                    <button
                      type="button"
                      disabled={safePage === totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className={`flex size-9 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#F5FBFD] disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING}`}
                      style={{ border: '1px solid rgba(0,100,130,0.18)', color: '#4A7080' }}
                      aria-label="Next page"
                    >
                      ›
                    </button>
                  </div>
                  <p style={{ fontSize: 14, color: '#4A7080' }}>Rows per page: {ROWS_PER_PAGE}</p>
                </div>
              )}
            </div>
          </div>

          {/* Detail pane */}
          {selected && (
            <div
              className="flex w-full shrink-0 flex-col overflow-hidden 2xl:w-[360px]"
              style={{
                background: '#FFFFFF',
                border: '1px solid rgba(0,100,130,0.12)',
                borderRadius: 12,
              }}
            >
              <div className="flex items-start justify-between gap-3 px-4 py-4 sm:px-5">
                <p
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Payment Details
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  aria-label="Close"
                  className={`flex size-9 shrink-0 items-center justify-center rounded-full transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                >
                  <X style={{ width: 18, height: 18, color: '#4A7080' }} />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto scroll-smooth px-4 pb-4 sm:px-5">
                <div className="flex items-center gap-2">
                  <p
                    className="font-display font-semibold"
                    style={{ fontSize: 16, color: '#0D2630' }}
                  >
                    {selected.paymentNumber}
                  </p>
                  <span
                    className="rounded-full px-2.5 py-0.5 font-sans font-medium whitespace-nowrap"
                    style={{
                      fontSize: 14,
                      color: STATUS_CFG[selected.status].color,
                      background: STATUS_CFG[selected.status].bg,
                    }}
                  >
                    {selected.status}
                  </span>
                </div>
                <p style={{ fontSize: 14, color: '#8A98A3' }}>
                  Posted on {formatHumanDate(selected.date)}, {formatTime(selected.date)}
                </p>

                <p
                  className="font-display mt-4 font-semibold"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  Invoice Information
                </p>
                <div
                  className="mt-2 flex flex-col gap-2 rounded-[10px] p-3"
                  style={{ background: '#F5FBFD' }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span style={{ fontSize: 14, color: '#8A98A3' }}>Invoice No.</span>
                    <button
                      type="button"
                      onClick={() => goToInvoice(selected.mrn)}
                      className={`font-sans font-medium hover:underline ${FOCUS_RING}`}
                      style={{ fontSize: 14, color: '#00B4D8' }}
                    >
                      {selected.invoiceNumber}
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span style={{ fontSize: 14, color: '#8A98A3' }}>Patient</span>
                    <span
                      className="font-sans font-medium"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {selected.patientName}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span style={{ fontSize: 14, color: '#8A98A3' }}>Department</span>
                    <span
                      className="font-sans font-medium"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {selected.department}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span style={{ fontSize: 14, color: '#8A98A3' }}>Total Amount</span>
                    <span
                      className="font-sans font-semibold"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {formatCurrencyWhole(selected.invoiceAmount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span style={{ fontSize: 14, color: '#8A98A3' }}>Amount Paid</span>
                    <span
                      className="font-sans font-semibold"
                      style={{ fontSize: 14, color: '#16A34A' }}
                    >
                      {formatCurrencyWhole(selected.invoicePaid)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span style={{ fontSize: 14, color: '#8A98A3' }}>Balance</span>
                    <span
                      className="font-sans font-semibold"
                      style={{
                        fontSize: 14,
                        color: selected.invoiceBalance > 0 ? '#DC2626' : '#0D2630',
                      }}
                    >
                      {formatCurrencyWhole(selected.invoiceBalance)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span style={{ fontSize: 14, color: '#8A98A3' }}>Invoice Status</span>
                    <span
                      className="rounded-full px-2.5 py-0.5 font-sans font-medium whitespace-nowrap"
                      style={{ fontSize: 14, color: '#0D2630', background: 'rgba(13,38,48,0.06)' }}
                    >
                      {selected.invoiceStatus}
                    </span>
                  </div>
                </div>

                <p
                  className="font-display mt-4 font-semibold"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  Payment Information
                </p>
                <div
                  className="mt-2 flex flex-col gap-2 rounded-[10px] p-3"
                  style={{ background: '#F5FBFD' }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span style={{ fontSize: 14, color: '#8A98A3' }}>Payment Method</span>
                    <span
                      className="font-sans font-medium"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {selected.method}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span style={{ fontSize: 14, color: '#8A98A3' }}>Amount Paid</span>
                    <span
                      className="font-sans font-semibold"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {formatCurrencyWhole(selected.amount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span style={{ fontSize: 14, color: '#8A98A3' }}>Transaction Reference</span>
                    <Tooltip content={selected.reference}>
                      <span
                        className="max-w-[150px] truncate font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {selected.reference}
                      </span>
                    </Tooltip>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span style={{ fontSize: 14, color: '#8A98A3' }}>Payment Date</span>
                    <span
                      className="font-sans font-medium"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {formatHumanDate(selected.date)}, {formatTime(selected.date)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span style={{ fontSize: 14, color: '#8A98A3' }}>Posted By</span>
                    <span
                      className="font-sans font-medium"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {selected.postedBy}
                    </span>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => goToInvoice(selected.mrn)}
                    className={`flex h-11 items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                    style={{
                      fontSize: 14,
                      color: '#0D2630',
                      border: '1px solid rgba(0,100,130,0.2)',
                    }}
                  >
                    <ReceiptText style={{ width: 15, height: 15 }} />
                    View Invoice
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePrint(selected)}
                    className={`flex h-11 items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                    style={{
                      fontSize: 14,
                      color: '#0D2630',
                      border: '1px solid rgba(0,100,130,0.2)',
                    }}
                  >
                    <Printer style={{ width: 15, height: 15 }} />
                    Print Receipt
                  </button>
                </div>

                <PermissionGate permission={PERMISSIONS.BILLING_WRITE}>
                  <button
                    type="button"
                    onClick={() => setRefundTarget(selected)}
                    className={`mt-2 flex h-11 w-full items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                    style={{ fontSize: 14, background: '#00B4D8' }}
                  >
                    <RotateCcw style={{ width: 15, height: 15 }} />
                    Record Refund
                  </button>
                </PermissionGate>
                <button
                  type="button"
                  onClick={() => {
                    setSearch(selected.mrn);
                    setSelectedId(null);
                    setCurrentPage(1);
                  }}
                  className={`mt-2 flex h-11 w-full items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                  style={{
                    fontSize: 14,
                    color: '#0D2630',
                    border: '1px solid rgba(0,100,130,0.2)',
                  }}
                >
                  View Payment History
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="h-4" />
      </div>

      {recordOpen && (
        <RecordPaymentModal
          defaultMrn={search || undefined}
          onClose={() => setRecordOpen(false)}
          onRecord={handleRecordPayment}
        />
      )}
      {refundTarget && (
        <RecordRefundModal
          payment={refundTarget}
          onClose={() => setRefundTarget(null)}
          onRecord={handleRecordRefund}
        />
      )}
    </main>
  );
}
