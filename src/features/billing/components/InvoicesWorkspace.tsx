'use client';

import {
  AlertTriangle,
  Bell,
  ClipboardList,
  Download,
  Eye,
  FilePlus2,
  FileText,
  History,
  MoreVertical,
  Plus,
  Printer,
  ScrollText,
  Wallet,
  X,
  XCircle,
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
import { formatHumanDate, formatTime } from '@/utils/datetime';
import { BILLING_ACCOUNT_DEPARTMENTS } from '@/features/billing/__mocks__/billingAccountsFixtures';
import {
  buildAllInvoices,
  INVOICE_SERVICE_OPTIONS,
  INVOICE_STATUS_OPTIONS,
  type InvoiceStatus,
  type InvoiceWithAccount,
} from '@/features/billing/__mocks__/billingAccountDetailFixtures';

const CreateInvoiceModal = dynamic(
  () => import('./CreateInvoiceModal').then((m) => m.CreateInvoiceModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);
const InvoicePreviewModal = dynamic(
  () => import('./InvoicePreviewModal').then((m) => m.InvoicePreviewModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';
const ROWS_PER_PAGE = 10;

const STATUS_CFG: Record<InvoiceStatus, { color: string; bg: string }> = {
  Draft: { color: '#4A7080', bg: 'rgba(74,112,128,0.1)' },
  Issued: { color: '#2563EB', bg: 'rgba(37,99,235,0.1)' },
  'Partially Paid': { color: '#D97706', bg: 'rgba(217,119,6,0.1)' },
  Paid: { color: '#16A34A', bg: 'rgba(22,163,74,0.1)' },
  Overdue: { color: '#DC2626', bg: 'rgba(220,38,38,0.1)' },
  Cancelled: { color: '#8A98A3', bg: 'rgba(138,152,163,0.12)' },
};

type TabKey = 'ALL' | InvoiceStatus;
const TABS: { key: TabKey; label: string }[] = [
  { key: 'ALL', label: 'All Invoices' },
  { key: 'Draft', label: 'Draft' },
  { key: 'Issued', label: 'Issued' },
  { key: 'Partially Paid', label: 'Partially Paid' },
  { key: 'Paid', label: 'Paid' },
  { key: 'Overdue', label: 'Overdue' },
  { key: 'Cancelled', label: 'Cancelled' },
];

function readMrnFromUrl(): string {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get('mrn') ?? '';
}

function InvoiceRowMenu({
  open,
  onToggle,
  onView,
  onPrint,
  onPostPayment,
  onCancel,
  canCancel,
}: {
  open: boolean;
  onToggle: () => void;
  onView: () => void;
  onPrint: () => void;
  onPostPayment: () => void;
  onCancel: () => void;
  canCancel: boolean;
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
          View Invoice
        </button>
        <button
          type="button"
          onClick={onPrint}
          className={`flex w-full items-center gap-2 px-3.5 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
          style={{ fontSize: 14, color: '#0D2630' }}
        >
          <Printer style={{ width: 15, height: 15, color: '#4A7080' }} />
          Print
        </button>
        <button
          type="button"
          onClick={onPostPayment}
          className={`flex w-full items-center gap-2 px-3.5 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
          style={{ fontSize: 14, color: '#0D2630' }}
        >
          <Wallet style={{ width: 15, height: 15, color: '#4A7080' }} />
          Post Payment
        </button>
        {canCancel && (
          <button
            type="button"
            onClick={onCancel}
            className={`flex w-full items-center gap-2 px-3.5 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
            style={{ fontSize: 14, color: '#DC2626' }}
          >
            <XCircle style={{ width: 15, height: 15 }} />
            Cancel Invoice
          </button>
        )}
      </RowMenuPortal>
    </div>
  );
}

export function InvoicesWorkspace() {
  const router = useRouter();
  const toast = useToast();
  const [invoices, setInvoices] = useState<InvoiceWithAccount[]>(() => buildAllInvoices());

  const [search, setSearch] = useState(readMrnFromUrl);
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<TabKey>('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openRowMenuId, setOpenRowMenuId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState<InvoiceWithAccount | null>(null);

  const departmentOptions = useMemo(
    () => BILLING_ACCOUNT_DEPARTMENTS.map((d) => ({ value: d, label: d })),
    [],
  );

  const nonStatusFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invoices.filter((inv) => {
      if (departmentFilter && inv.department !== departmentFilter) return false;
      if (serviceFilter && inv.service !== serviceFilter) return false;
      if (fromDate && new Date(inv.date).getTime() < new Date(fromDate).getTime()) return false;
      if (toDate && new Date(inv.date).getTime() > new Date(toDate).getTime() + 86_400_000 - 1)
        return false;
      if (
        q &&
        !inv.invoiceNumber.toLowerCase().includes(q) &&
        !inv.patientName.toLowerCase().includes(q) &&
        !inv.mrn.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [invoices, search, departmentFilter, serviceFilter, fromDate, toDate]);

  const filtered = useMemo(
    () =>
      statusFilter === 'ALL'
        ? nonStatusFiltered
        : nonStatusFiltered.filter((i) => i.status === statusFilter),
    [nonStatusFiltered, statusFilter],
  );

  const tabCounts: Record<TabKey, number> = {
    ALL: nonStatusFiltered.length,
    Draft: 0,
    Issued: 0,
    'Partially Paid': 0,
    Paid: 0,
    Overdue: 0,
    Cancelled: 0,
  };
  for (const inv of nonStatusFiltered) tabCounts[inv.status] += 1;

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * ROWS_PER_PAGE;
  const pageRows = filtered.slice(pageStart, pageStart + ROWS_PER_PAGE);
  const selected = selectedId ? invoices.find((i) => i.id === selectedId) : undefined;

  const totalInvoices = invoices.length;
  const totalBilledAll = invoices.reduce((s, i) => s + i.amount, 0);
  const totalPaidAll = invoices.reduce((s, i) => s + i.paid, 0);
  const outstandingAll = invoices.reduce((s, i) => s + Math.max(0, i.amount - i.paid), 0);
  const overdueCount = invoices.filter((i) => i.status === 'Overdue').length;

  function clearFilters() {
    setSearch('');
    setDepartmentFilter('');
    setServiceFilter('');
    setFromDate('');
    setToDate('');
    setCurrentPage(1);
  }

  function handleExport() {
    downloadCSV('invoices', [
      [
        'Invoice No',
        'Patient',
        'MRN',
        'Department',
        'Invoice Date',
        'Due Date',
        'Amount',
        'Paid',
        'Balance',
        'Status',
      ],
      ...filtered.map((i) => [
        i.invoiceNumber,
        i.patientName,
        i.mrn,
        i.department,
        `${formatHumanDate(i.date)} ${formatTime(i.date)}`,
        formatHumanDate(i.dueDate),
        String(i.amount),
        String(i.paid),
        String(Math.max(0, i.amount - i.paid)),
        i.status,
      ]),
    ]);
    toast.success(
      'Export ready',
      `${filtered.length} invoice${filtered.length !== 1 ? 's' : ''} exported as CSV.`,
    );
  }

  function handleCreateInvoice(invoice: InvoiceWithAccount) {
    setInvoices((prev) => [invoice, ...prev]);
    setCreateOpen(false);
    setCurrentPage(1);
    toast.success(
      'Invoice created',
      `${invoice.invoiceNumber} has been created for ${invoice.patientName}.`,
    );
  }

  function buildInvoiceBody(inv: InvoiceWithAccount) {
    return `
      <h1>${escapeHtml(inv.invoiceNumber)}</h1>
      <p class="meta">${escapeHtml(inv.patientName)} · ${escapeHtml(inv.mrn)} · ${escapeHtml(inv.department)}</p>
      <hr>
      <p>${escapeHtml(inv.description)}</p>
      <p>Issued ${escapeHtml(formatHumanDate(inv.date))} · Due ${escapeHtml(formatHumanDate(inv.dueDate))}</p>
      <table><thead><tr><th>Amount</th><th>Paid</th><th>Balance</th><th>Status</th></tr></thead><tbody>
      <tr><td>${escapeHtml(formatCurrencyWhole(inv.amount))}</td><td>${escapeHtml(formatCurrencyWhole(inv.paid))}</td><td>${escapeHtml(formatCurrencyWhole(Math.max(0, inv.amount - inv.paid)))}</td><td>${escapeHtml(inv.status)}</td></tr>
      </tbody></table>
    `;
  }

  function handlePrint(inv: InvoiceWithAccount) {
    downloadPDF(inv.invoiceNumber, buildInvoiceBody(inv));
    toast.success('Invoice downloaded', `${inv.invoiceNumber} is ready to print.`);
  }

  function handleCancelInvoice(id: string) {
    const inv = invoices.find((i) => i.id === id);
    if (!inv) return;
    setInvoices((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: 'Cancelled', paid: 0 } : i)),
    );
    toast.success('Invoice cancelled', `${inv.invoiceNumber} has been cancelled.`);
  }

  function goToPayments(mrn: string) {
    router.push(`${ROUTES.billingPayments}?mrn=${encodeURIComponent(mrn)}`);
  }

  function notAvailable(label: string) {
    toast.info(label, 'This feature is on the roadmap and not yet available.');
  }

  return (
    <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
      <div className="mx-auto max-w-[1550px] px-4 py-4 sm:px-6 sm:py-5">
        {/* Header */}
        <div>
          <h1 className="font-display font-bold" style={{ fontSize: 24, color: '#0D2630' }}>
            Invoices
          </h1>
          <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
            Create, manage and track patient invoices
          </p>
        </div>

        {/* Stat cards */}
        <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-5 xl:gap-4">
          {[
            {
              icon: FileText,
              label: 'Total Invoices',
              value: totalInvoices.toLocaleString('en-NG'),
              caption: 'All time',
              accent: '#2563EB',
            },
            {
              icon: FilePlus2,
              label: 'Total Billed',
              value: formatCurrencyWhole(totalBilledAll),
              caption: 'All time billed amount',
              accent: '#16A34A',
            },
            {
              icon: Wallet,
              label: 'Total Paid',
              value: formatCurrencyWhole(totalPaidAll),
              caption: 'All time paid amount',
              accent: '#0D9488',
            },
            {
              icon: ClipboardList,
              label: 'Outstanding',
              value: formatCurrencyWhole(outstandingAll),
              caption: 'From unpaid invoices',
              accent: '#D97706',
            },
            {
              icon: AlertTriangle,
              label: 'Overdue Invoices',
              value: overdueCount.toLocaleString('en-NG'),
              caption: 'Require attention',
              accent: '#DC2626',
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
              </div>
            </div>
          ))}
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
                        setStatusFilter(t.key);
                        setCurrentPage(1);
                      }}
                      className={`flex items-center gap-1.5 px-3 py-2.5 font-sans font-medium transition-colors duration-150 ${FOCUS_RING}`}
                      style={{
                        fontSize: 14,
                        color: statusFilter === t.key ? '#00B4D8' : '#4A7080',
                        borderBottom:
                          statusFilter === t.key ? '2px solid #00B4D8' : '2px solid transparent',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {t.label}
                      {t.key !== 'ALL' && (
                        <span
                          className="flex min-w-5 items-center justify-center rounded-full px-1 font-sans font-medium"
                          style={{
                            fontSize: 14,
                            color: statusFilter === t.key ? '#00B4D8' : '#8A98A3',
                            background: statusFilter === t.key ? 'rgba(0,180,216,0.1)' : '#F5FBFD',
                          }}
                        >
                          {tabCounts[t.key]}
                        </span>
                      )}
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
                      onClick={() => setCreateOpen(true)}
                      className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                      style={{ fontSize: 14, background: '#00B4D8' }}
                    >
                      <Plus style={{ width: 15, height: 15 }} />
                      Create Invoice
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
                    placeholder="Search by invoice no., patient name, MRN…"
                    className={`h-11 w-full rounded-[10px] px-3.5 font-sans transition-colors duration-150 placeholder:text-[#8A98A3] focus:border-[#00B4D8] focus:ring-2 focus:ring-[#00B4D8]/40 focus:outline-none`}
                    style={{
                      fontSize: 14,
                      color: '#0D2630',
                      border: '1px solid rgba(0,100,130,0.18)',
                    }}
                  />
                </div>
                <FormSelect
                  id="invoice-department"
                  value={departmentFilter}
                  onChange={(v) => {
                    setDepartmentFilter(v);
                    setCurrentPage(1);
                  }}
                  options={departmentOptions}
                  placeholder="All Departments"
                />
                <FormSelect
                  id="invoice-service"
                  value={serviceFilter}
                  onChange={(v) => {
                    setServiceFilter(v);
                    setCurrentPage(1);
                  }}
                  options={INVOICE_SERVICE_OPTIONS.map((s) => ({ value: s, label: s }))}
                  placeholder="All Services"
                />
                <FormSelect
                  id="invoice-status"
                  value={statusFilter === 'ALL' ? '' : statusFilter}
                  onChange={(v) => {
                    setStatusFilter((v as InvoiceStatus) || 'ALL');
                    setCurrentPage(1);
                  }}
                  options={INVOICE_STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
                  placeholder="All Status"
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
                <ScrollableTable minWidth={1200} maxHeight={640}>
                  <div
                    className={`flex rounded-t-[8px] ${TABLE_HEADER_STICKY_CLASS}`}
                    style={{ background: TABLE_HEADER_BG, borderBottom: '1px solid #E6F8FD' }}
                  >
                    <div className="w-32 shrink-0 py-2.5 pr-2 pl-3">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Invoice No.
                      </span>
                    </div>
                    <div className="max-w-[220px] min-w-[150px] flex-1 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Patient
                      </span>
                    </div>
                    <div className="w-28 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Department
                      </span>
                    </div>
                    <div className="w-32 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Invoice Date
                      </span>
                    </div>
                    <div className="w-24 shrink-0 py-2.5 pr-2 text-center">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Amount
                      </span>
                    </div>
                    <div className="w-24 shrink-0 py-2.5 pr-2 text-center">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Paid
                      </span>
                    </div>
                    <div className="w-24 shrink-0 py-2.5 pr-2 text-center">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Balance
                      </span>
                    </div>
                    <div className="w-28 shrink-0 py-2.5 pr-2 text-center">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Status
                      </span>
                    </div>
                    <div className="w-28 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Due Date
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
                        <FileText style={{ width: 24, height: 24, color: '#8A98A3' }} />
                      </div>
                      <p
                        className="font-sans font-medium"
                        style={{ fontSize: 16, color: '#4A7080' }}
                      >
                        No invoices match your filters
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

                  {pageRows.map((inv) => {
                    const balance = Math.max(0, inv.amount - inv.paid);
                    const cfg = STATUS_CFG[inv.status];
                    return (
                      <div
                        key={inv.id}
                        onClick={() => setSelectedId(inv.id)}
                        className="flex cursor-pointer items-center transition-colors duration-100 hover:bg-[#F5FBFD]"
                        style={{
                          borderBottom: '1px solid rgba(0,100,130,0.08)',
                          background: selectedId === inv.id ? '#E6F8FD' : 'transparent',
                        }}
                      >
                        <div className="w-32 shrink-0 py-3 pr-2 pl-3">
                          <p
                            className="font-sans font-medium"
                            style={{ fontSize: 14, color: '#00B4D8' }}
                          >
                            {inv.invoiceNumber}
                          </p>
                          <p style={{ fontSize: 14, color: '#8A98A3' }}>{inv.mrn}</p>
                        </div>
                        <div className="max-w-[220px] min-w-[150px] flex-1 py-3 pr-2">
                          <Tooltip content={inv.patientName}>
                            <p
                              className="truncate font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {inv.patientName}
                            </p>
                          </Tooltip>
                        </div>
                        <div className="w-28 shrink-0 py-3 pr-2">
                          <Tooltip content={inv.department}>
                            <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                              {inv.department}
                            </p>
                          </Tooltip>
                        </div>
                        <div className="w-32 shrink-0 py-3 pr-2">
                          <p style={{ fontSize: 14, color: '#4A7080' }}>
                            {formatHumanDate(inv.date)}
                          </p>
                          <p style={{ fontSize: 14, color: '#8A98A3' }}>{formatTime(inv.date)}</p>
                        </div>
                        <div className="w-24 shrink-0 py-3 pr-2 text-center">
                          <p style={{ fontSize: 14, color: '#0D2630' }}>
                            {formatCurrencyWhole(inv.amount)}
                          </p>
                        </div>
                        <div className="w-24 shrink-0 py-3 pr-2 text-center">
                          <p style={{ fontSize: 14, color: '#16A34A' }}>
                            {formatCurrencyWhole(inv.paid)}
                          </p>
                        </div>
                        <div className="w-24 shrink-0 py-3 pr-2 text-center">
                          <p
                            className="font-sans font-medium"
                            style={{ fontSize: 14, color: balance > 0 ? '#DC2626' : '#0D2630' }}
                          >
                            {formatCurrencyWhole(balance)}
                          </p>
                        </div>
                        <div className="w-28 shrink-0 py-3 pr-2 text-center">
                          <span
                            className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium whitespace-nowrap"
                            style={{ fontSize: 14, color: cfg.color, background: cfg.bg }}
                          >
                            {inv.status}
                          </span>
                        </div>
                        <div className="w-28 shrink-0 py-3 pr-2">
                          <p style={{ fontSize: 14, color: '#4A7080' }}>
                            {formatHumanDate(inv.dueDate)}
                          </p>
                        </div>
                        <div
                          className="flex w-20 shrink-0 items-center justify-end gap-1 py-3 pr-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <InvoiceRowMenu
                            open={openRowMenuId === inv.id}
                            onToggle={() =>
                              setOpenRowMenuId((prev) => (prev === inv.id ? null : inv.id))
                            }
                            onView={() => {
                              setOpenRowMenuId(null);
                              setPreviewInvoice(inv);
                            }}
                            onPrint={() => {
                              setOpenRowMenuId(null);
                              handlePrint(inv);
                            }}
                            onPostPayment={() => {
                              setOpenRowMenuId(null);
                              goToPayments(inv.mrn);
                            }}
                            onCancel={() => {
                              setOpenRowMenuId(null);
                              handleCancelInvoice(inv.id);
                            }}
                            canCancel={inv.status !== 'Cancelled' && inv.status !== 'Paid'}
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
                    invoices
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
                  Invoice Details
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
                    {selected.invoiceNumber}
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
                  Issued on {formatHumanDate(selected.date)}, {formatTime(selected.date)}
                </p>

                <div className="mt-3 flex items-center gap-2.5">
                  <div
                    className="flex size-9 shrink-0 items-center justify-center rounded-full font-sans font-semibold text-white"
                    style={{ background: '#2563EB' }}
                  >
                    {selected.patientName
                      .trim()
                      .split(/\s+/)
                      .map((p) => p[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p
                      className="truncate font-sans font-medium"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {selected.patientName}
                    </p>
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>MRN: {selected.mrn}</p>
                  </div>
                </div>
                <p style={{ fontSize: 14, color: '#8A98A3' }}>{selected.phone}</p>
                <Tooltip content={selected.email}>
                  <p className="truncate" style={{ fontSize: 14, color: '#8A98A3' }}>
                    {selected.email}
                  </p>
                </Tooltip>

                <div
                  className="mt-4 flex flex-col gap-2 rounded-[10px] p-3"
                  style={{ background: '#F5FBFD' }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span style={{ fontSize: 14, color: '#8A98A3' }}>Total Amount</span>
                    <span
                      className="font-sans font-semibold"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {formatCurrencyWhole(selected.amount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span style={{ fontSize: 14, color: '#8A98A3' }}>Total Paid</span>
                    <span
                      className="font-sans font-semibold"
                      style={{ fontSize: 14, color: '#16A34A' }}
                    >
                      {formatCurrencyWhole(selected.paid)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span style={{ fontSize: 14, color: '#8A98A3' }}>Balance</span>
                    <span
                      className="font-sans font-semibold"
                      style={{ fontSize: 14, color: '#DC2626' }}
                    >
                      {formatCurrencyWhole(Math.max(0, selected.amount - selected.paid))}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span style={{ fontSize: 14, color: '#8A98A3' }}>Due Date</span>
                    <span
                      className="font-sans font-semibold"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {formatHumanDate(selected.dueDate)}
                    </span>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewInvoice(selected)}
                    className={`flex h-11 items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                    style={{
                      fontSize: 14,
                      color: '#0D2630',
                      border: '1px solid rgba(0,100,130,0.2)',
                    }}
                  >
                    <Eye style={{ width: 15, height: 15 }} />
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
                    Print
                  </button>
                </div>

                <PermissionGate permission={PERMISSIONS.BILLING_WRITE}>
                  <button
                    type="button"
                    onClick={() => goToPayments(selected.mrn)}
                    className={`mt-2 flex h-11 w-full items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                    style={{ fontSize: 14, background: '#00B4D8' }}
                  >
                    <Wallet style={{ width: 15, height: 15 }} />
                    Post Payment
                  </button>
                </PermissionGate>

                <p
                  className="font-display mt-5 font-semibold"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  Quick Actions
                </p>
                <div className="mt-2 flex flex-col gap-0.5">
                  <button
                    type="button"
                    onClick={() => notAvailable('Send Payment Reminder')}
                    className={`flex w-full items-center gap-2.5 rounded-[8px] px-2 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                  >
                    <Bell style={{ width: 15, height: 15, color: '#00B4D8' }} />
                    <span style={{ fontSize: 14, color: '#0D2630' }}>Send Payment Reminder</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePrint(selected)}
                    className={`flex w-full items-center gap-2.5 rounded-[8px] px-2 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                  >
                    <Download style={{ width: 15, height: 15, color: '#4A7080' }} />
                    <span style={{ fontSize: 14, color: '#0D2630' }}>Download Invoice</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => goToPayments(selected.mrn)}
                    className={`flex w-full items-center gap-2.5 rounded-[8px] px-2 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                  >
                    <History style={{ width: 15, height: 15, color: '#4A7080' }} />
                    <span style={{ fontSize: 14, color: '#0D2630' }}>View Payment History</span>
                  </button>
                  {selected.status !== 'Cancelled' && selected.status !== 'Paid' && (
                    <PermissionGate permission={PERMISSIONS.BILLING_WRITE}>
                      <button
                        type="button"
                        onClick={() => handleCancelInvoice(selected.id)}
                        className={`flex w-full items-center gap-2.5 rounded-[8px] px-2 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                      >
                        <XCircle style={{ width: 15, height: 15, color: '#DC2626' }} />
                        <span style={{ fontSize: 14, color: '#DC2626' }}>Cancel Invoice</span>
                      </button>
                    </PermissionGate>
                  )}
                  <button
                    type="button"
                    onClick={() => notAvailable('Audit Trail')}
                    className={`flex w-full items-center gap-2.5 rounded-[8px] px-2 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                  >
                    <ScrollText style={{ width: 15, height: 15, color: '#4A7080' }} />
                    <span style={{ fontSize: 14, color: '#0D2630' }}>View Audit Trail</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="h-4" />
      </div>

      {createOpen && (
        <CreateInvoiceModal
          defaultMrn={search || undefined}
          onClose={() => setCreateOpen(false)}
          onCreate={handleCreateInvoice}
        />
      )}
      {previewInvoice && (
        <InvoicePreviewModal
          invoice={previewInvoice}
          onClose={() => setPreviewInvoice(null)}
          onDownload={() => {
            handlePrint(previewInvoice);
            setPreviewInvoice(null);
          }}
        />
      )}
    </main>
  );
}
