'use client';

import {
  AlertCircle,
  BarChart3,
  Bell,
  CalendarClock,
  Clock3,
  Download,
  Eye,
  Filter,
  MoreVertical,
  ReceiptText,
  UserSearch,
  Wallet,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';

import { AnimatedDonutChart } from '@components/shared/AnimatedDonutChart';
import { FormSelect } from '@components/shared/FormSelect';
import { ModalLoadingFallback } from '@components/shared/ModalLoadingFallback';
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
import { formatCurrencyWhole } from '@/utils/currency';
import { formatHumanDate } from '@/utils/datetime';
import { BILLING_ACCOUNT_DEPARTMENTS } from '@/features/billing/__mocks__/billingAccountsFixtures';
import {
  buildAllInvoices,
  INVOICE_SERVICE_OPTIONS,
  type InvoiceStatus,
  type InvoiceWithAccount,
} from '@/features/billing/__mocks__/billingAccountDetailFixtures';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';
const DAY_MS = 24 * 60 * 60 * 1000;
const ROWS_PER_PAGE = 10;

type AgingBucket = '0-30' | '31-60' | '61-90' | '90+';
const BUCKET_LABEL: Record<AgingBucket, string> = {
  '0-30': '0 - 30 Days',
  '31-60': '31 - 60 Days',
  '61-90': '61 - 90 Days',
  '90+': '90+ Days',
};
const BUCKET_CFG: Record<AgingBucket, { color: string; bg: string }> = {
  '0-30': { color: '#16A34A', bg: 'rgba(22,163,74,0.1)' },
  '31-60': { color: '#D97706', bg: 'rgba(217,119,6,0.1)' },
  '61-90': { color: '#7C3AED', bg: 'rgba(124,58,237,0.1)' },
  '90+': { color: '#DC2626', bg: 'rgba(220,38,38,0.1)' },
};

function bucketFor(daysOutstanding: number): AgingBucket {
  if (daysOutstanding <= 30) return '0-30';
  if (daysOutstanding <= 60) return '31-60';
  if (daysOutstanding <= 90) return '61-90';
  return '90+';
}

type OutstandingRow = InvoiceWithAccount & {
  balance: number;
  daysOutstanding: number;
  bucket: AgingBucket;
};

const OutstandingAccountDetailModal = dynamic(
  () => import('./OutstandingAccountDetailModal').then((m) => m.OutstandingAccountDetailModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

type AgingTab = 'ALL' | AgingBucket;
const TABS: { key: AgingTab; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: '0-30', label: '0 - 30 Days' },
  { key: '31-60', label: '31 - 60 Days' },
  { key: '61-90', label: '61 - 90 Days' },
  { key: '90+', label: '90+ Days' },
];

function ActionRowMenu({
  open,
  onToggle,
  actions,
}: {
  open: boolean;
  onToggle: () => void;
  actions: { label: string; icon: LucideIcon; onClick: () => void }[];
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  return (
    <div className="relative flex items-center gap-1">
      <button
        ref={buttonRef}
        type="button"
        onClick={onToggle}
        aria-label="More actions"
        className={`flex size-9 shrink-0 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
      >
        <MoreVertical style={{ width: 16, height: 16, color: '#4A7080' }} />
      </button>
      <RowMenuPortal open={open} anchorRef={buttonRef} onClose={onToggle} width={200}>
        {actions.map((a) => (
          <button
            key={a.label}
            type="button"
            onClick={a.onClick}
            className={`flex w-full items-center gap-2 px-3.5 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
            style={{ fontSize: 14, color: '#0D2630' }}
          >
            <a.icon style={{ width: 15, height: 15, color: '#4A7080' }} />
            {a.label}
          </button>
        ))}
      </RowMenuPortal>
    </div>
  );
}

export function OutstandingAccountsWorkspace() {
  const router = useRouter();
  const toast = useToast();
  const [now] = useState(() => Date.now());
  const [allInvoices] = useState<InvoiceWithAccount[]>(() => buildAllInvoices());

  const [activeTab, setActiveTab] = useState<AgingTab>('ALL');
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [openRowMenuId, setOpenRowMenuId] = useState<string | null>(null);
  const [detailRow, setDetailRow] = useState<OutstandingRow | null>(null);

  const outstandingRows: OutstandingRow[] = useMemo(() => {
    return allInvoices
      .filter(
        (inv) => inv.amount - inv.paid > 0 && inv.status !== 'Cancelled' && inv.status !== 'Draft',
      )
      .map((inv) => {
        const balance = inv.amount - inv.paid;
        const daysOutstanding = Math.max(
          0,
          Math.floor((now - new Date(inv.dueDate).getTime()) / DAY_MS),
        );
        return { ...inv, balance, daysOutstanding, bucket: bucketFor(daysOutstanding) };
      })
      .sort((a, b) => b.daysOutstanding - a.daysOutstanding);
  }, [allInvoices, now]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return outstandingRows.filter((r) => {
      if (activeTab !== 'ALL' && r.bucket !== activeTab) return false;
      if (departmentFilter && r.department !== departmentFilter) return false;
      if (serviceFilter && r.service !== serviceFilter) return false;
      if (statusFilter && r.status !== statusFilter) return false;
      if (
        q &&
        !r.patientName.toLowerCase().includes(q) &&
        !r.mrn.toLowerCase().includes(q) &&
        !r.invoiceNumber.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [outstandingRows, activeTab, departmentFilter, serviceFilter, statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * ROWS_PER_PAGE;
  const pageRows = filtered.slice(pageStart, pageStart + ROWS_PER_PAGE);

  const totalOutstanding = outstandingRows.reduce((s, r) => s + r.balance, 0);
  const bucketTotals: Record<AgingBucket, number> = {
    '0-30': 0,
    '31-60': 0,
    '61-90': 0,
    '90+': 0,
  };
  for (const r of outstandingRows) bucketTotals[r.bucket] += r.balance;
  const patientsDue = new Set(outstandingRows.map((r) => r.mrn)).size;

  const departmentTotals = BILLING_ACCOUNT_DEPARTMENTS.map((d) => ({
    department: d,
    amount: outstandingRows.filter((r) => r.department === d).reduce((s, r) => s + r.balance, 0),
  }))
    .filter((d) => d.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  const topDeptMax = Math.max(...departmentTotals.map((d) => d.amount), 1);

  const departmentOptions = BILLING_ACCOUNT_DEPARTMENTS.map((d) => ({ value: d, label: d }));
  const serviceOptions = INVOICE_SERVICE_OPTIONS.map((s) => ({ value: s, label: s }));
  const statusOptions: { value: InvoiceStatus; label: string }[] = [
    { value: 'Issued', label: 'Issued' },
    { value: 'Partially Paid', label: 'Partially Paid' },
    { value: 'Overdue', label: 'Overdue' },
  ];

  function clearFilters() {
    setSearch('');
    setDepartmentFilter('');
    setServiceFilter('');
    setStatusFilter('');
  }

  function handleExport() {
    downloadCSV('outstanding-accounts', [
      [
        'Patient',
        'MRN',
        'Department',
        'Invoice No',
        'Invoice Date',
        'Due Date',
        'Original Amount',
        'Amount Paid',
        'Balance',
        'Days Outstanding',
        'Status',
      ],
      ...filtered.map((r) => [
        r.patientName,
        r.mrn,
        r.department,
        r.invoiceNumber,
        formatHumanDate(r.date),
        formatHumanDate(r.dueDate),
        String(r.amount),
        String(r.paid),
        String(r.balance),
        String(r.daysOutstanding),
        BUCKET_LABEL[r.bucket],
      ]),
    ]);
    toast.success(
      'Export ready',
      `${filtered.length} account${filtered.length !== 1 ? 's' : ''} exported as CSV.`,
    );
  }

  function goToInvoices(mrn: string) {
    router.push(`${ROUTES.billingInvoices}?mrn=${encodeURIComponent(mrn)}`);
  }
  function goToPayments(mrn: string) {
    router.push(`${ROUTES.billingPayments}?mrn=${encodeURIComponent(mrn)}`);
  }
  function goToAccount(mrn: string) {
    router.push(`${ROUTES.billingAccounts}/${encodeURIComponent(mrn)}`);
  }
  function sendReminder(row: OutstandingRow) {
    toast.success('Reminder sent', `A payment reminder has been sent to ${row.patientName}.`);
  }

  return (
    <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
      <div className="mx-auto max-w-[1550px] px-4 py-4 sm:px-6 sm:py-5">
        {/* Header */}
        <div>
          <h1 className="font-display font-bold" style={{ fontSize: 24, color: '#0D2630' }}>
            Outstanding Accounts
          </h1>
          <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
            Track and manage unpaid invoices and patient balances
          </p>
        </div>

        {/* Stat cards */}
        <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          {[
            {
              icon: AlertCircle,
              label: 'Total Outstanding',
              value: formatCurrencyWhole(totalOutstanding),
              caption: `${outstandingRows.length} unpaid invoice${outstandingRows.length !== 1 ? 's' : ''}`,
              accent: '#DC2626',
            },
            {
              icon: ReceiptText,
              label: '0 - 30 Days',
              value: formatCurrencyWhole(bucketTotals['0-30']),
              caption: `${totalOutstanding > 0 ? ((bucketTotals['0-30'] / totalOutstanding) * 100).toFixed(1) : '0.0'}% of total`,
              accent: '#16A34A',
            },
            {
              icon: ReceiptText,
              label: '31 - 60 Days',
              value: formatCurrencyWhole(bucketTotals['31-60']),
              caption: `${totalOutstanding > 0 ? ((bucketTotals['31-60'] / totalOutstanding) * 100).toFixed(1) : '0.0'}% of total`,
              accent: '#D97706',
            },
            {
              icon: BarChart3,
              label: '61 - 90 Days',
              value: formatCurrencyWhole(bucketTotals['61-90']),
              caption: `${totalOutstanding > 0 ? ((bucketTotals['61-90'] / totalOutstanding) * 100).toFixed(1) : '0.0'}% of total`,
              accent: '#7C3AED',
            },
            {
              icon: ReceiptText,
              label: '90+ Days',
              value: formatCurrencyWhole(bucketTotals['90+']),
              caption: `${totalOutstanding > 0 ? ((bucketTotals['90+'] / totalOutstanding) * 100).toFixed(1) : '0.0'}% of total`,
              accent: '#DC2626',
            },
            {
              icon: CalendarClock,
              label: 'Accounts Due',
              value: patientsDue.toLocaleString('en-NG'),
              caption: 'Patients',
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
                <p style={{ fontSize: 14, color: '#8A98A3' }}>{s.caption}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Main grid */}
        <div className="mt-4 flex flex-col gap-4 2xl:flex-row 2xl:items-start">
          <div className="min-w-0 flex-1">
            <div
              className="rounded-[12px] p-4 sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              {/* Aging tabs */}
              <div
                className="flex flex-wrap items-center gap-1 border-b"
                style={{ borderColor: 'rgba(0,100,130,0.12)' }}
              >
                {TABS.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => {
                      setActiveTab(t.key);
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-2.5 font-sans font-medium transition-colors duration-150 ${FOCUS_RING}`}
                    style={{
                      fontSize: 14,
                      color: activeTab === t.key ? '#00B4D8' : '#4A7080',
                      borderBottom:
                        activeTab === t.key ? '2px solid #00B4D8' : '2px solid transparent',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {t.label}
                  </button>
                ))}
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
                    placeholder="Search by patient, invoice no…"
                    className="h-11 w-full rounded-[10px] px-3.5 font-sans transition-colors duration-150 placeholder:text-[#8A98A3] focus:border-[#00B4D8] focus:ring-2 focus:ring-[#00B4D8]/40 focus:outline-none"
                    style={{
                      fontSize: 14,
                      color: '#0D2630',
                      border: '1px solid rgba(0,100,130,0.18)',
                    }}
                  />
                </div>
                <FormSelect
                  id="outstanding-department"
                  value={departmentFilter}
                  onChange={(v) => {
                    setDepartmentFilter(v);
                    setCurrentPage(1);
                  }}
                  options={departmentOptions}
                  placeholder="All Departments"
                />
                <FormSelect
                  id="outstanding-service"
                  value={serviceFilter}
                  onChange={(v) => {
                    setServiceFilter(v);
                    setCurrentPage(1);
                  }}
                  options={serviceOptions}
                  placeholder="All Services"
                />
                <FormSelect
                  id="outstanding-status"
                  value={statusFilter}
                  onChange={(v) => {
                    setStatusFilter(v);
                    setCurrentPage(1);
                  }}
                  options={statusOptions}
                  placeholder="All Statuses"
                />
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
                {(search || departmentFilter || serviceFilter || statusFilter) && (
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
                    style={{
                      fontSize: 14,
                      color: '#0D2630',
                      border: '1px solid rgba(0,100,130,0.2)',
                    }}
                  >
                    <Download style={{ width: 15, height: 15 }} />
                    Export
                  </button>
                </div>
              </div>

              <p
                className="font-display mt-3 font-semibold"
                style={{ fontSize: 16, color: '#0D2630' }}
              >
                Outstanding Accounts ({filtered.length})
              </p>

              {/* Table */}
              <div className="mt-3">
                <ScrollableTable minWidth={1360} maxHeight={640}>
                  <div
                    className={`flex rounded-t-[8px] ${TABLE_HEADER_STICKY_CLASS}`}
                    style={{ background: TABLE_HEADER_BG, borderBottom: '1px solid #E6F8FD' }}
                  >
                    <div className="w-8 shrink-0 py-2.5 pr-1 pl-3">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        #
                      </span>
                    </div>
                    <div className="max-w-[190px] min-w-[130px] flex-1 py-2.5 pr-2">
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
                    <div className="w-28 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Invoice No.
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
                    <div className="w-28 shrink-0 py-2.5 pr-6 text-right">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Original
                      </span>
                    </div>
                    <div className="w-28 shrink-0 py-2.5 pr-6 text-right">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Paid
                      </span>
                    </div>
                    <div className="w-28 shrink-0 py-2.5 pr-6 text-right">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Balance
                      </span>
                    </div>
                    <div className="w-24 shrink-0 py-2.5 pr-2 text-center">
                      <span
                        className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Days Out.
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
                        <AlertCircle style={{ width: 24, height: 24, color: '#8A98A3' }} />
                      </div>
                      <p
                        className="font-sans font-medium"
                        style={{ fontSize: 16, color: '#4A7080' }}
                      >
                        No outstanding accounts match your filters
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

                  {pageRows.map((r, i) => {
                    const cfg = BUCKET_CFG[r.bucket];
                    const actions = [
                      {
                        label: 'View Details',
                        icon: Eye,
                        onClick: () => {
                          setOpenRowMenuId(null);
                          setDetailRow(r);
                        },
                      },
                      {
                        label: 'Record Payment',
                        icon: Wallet,
                        onClick: () => {
                          setOpenRowMenuId(null);
                          goToPayments(r.mrn);
                        },
                      },
                      {
                        label: 'Send Payment Reminder',
                        icon: Bell,
                        onClick: () => {
                          setOpenRowMenuId(null);
                          sendReminder(r);
                        },
                      },
                      {
                        label: 'View Full Account',
                        icon: UserSearch,
                        onClick: () => {
                          setOpenRowMenuId(null);
                          goToAccount(r.mrn);
                        },
                      },
                    ];
                    return (
                      <div
                        key={r.id}
                        className="flex items-center transition-colors duration-100 hover:bg-[#F5FBFD]"
                        style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                      >
                        <div className="w-8 shrink-0 py-3 pr-1 pl-3">
                          <p style={{ fontSize: 14, color: '#8A98A3' }}>{pageStart + i + 1}</p>
                        </div>
                        <div className="max-w-[190px] min-w-[130px] flex-1 py-3 pr-2">
                          <Tooltip content={r.patientName}>
                            <p
                              className="truncate font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {r.patientName}
                            </p>
                          </Tooltip>
                          <p style={{ fontSize: 14, color: '#8A98A3' }}>{r.mrn}</p>
                        </div>
                        <div className="w-28 shrink-0 py-3 pr-2">
                          <Tooltip content={r.department}>
                            <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                              {r.department}
                            </p>
                          </Tooltip>
                        </div>
                        <div className="w-28 shrink-0 py-3 pr-2">
                          <button
                            type="button"
                            onClick={() => goToInvoices(r.mrn)}
                            className={`font-sans font-medium hover:underline ${FOCUS_RING}`}
                            style={{ fontSize: 14, color: '#00B4D8' }}
                          >
                            {r.invoiceNumber}
                          </button>
                        </div>
                        <div className="w-28 shrink-0 py-3 pr-2">
                          <p style={{ fontSize: 14, color: '#4A7080' }}>
                            {formatHumanDate(r.dueDate)}
                          </p>
                        </div>
                        <div className="w-28 shrink-0 py-3 pr-6 text-right">
                          <p style={{ fontSize: 14, color: '#0D2630' }}>
                            {formatCurrencyWhole(r.amount)}
                          </p>
                        </div>
                        <div className="w-28 shrink-0 py-3 pr-6 text-right">
                          <p style={{ fontSize: 14, color: '#16A34A' }}>
                            {formatCurrencyWhole(r.paid)}
                          </p>
                        </div>
                        <div className="w-28 shrink-0 py-3 pr-6 text-right">
                          <Tooltip content={formatCurrencyWhole(r.balance)}>
                            <p
                              className="truncate font-sans font-medium"
                              style={{ fontSize: 14, color: '#DC2626' }}
                            >
                              {formatCurrencyWhole(r.balance)}
                            </p>
                          </Tooltip>
                        </div>
                        <div className="w-24 shrink-0 py-3 pr-2 text-center">
                          <p style={{ fontSize: 14, color: '#4A7080' }}>{r.daysOutstanding}</p>
                        </div>
                        <div className="w-28 shrink-0 py-3 pr-2 text-center">
                          <span
                            className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium whitespace-nowrap"
                            style={{ fontSize: 14, color: cfg.color, background: cfg.bg }}
                          >
                            {BUCKET_LABEL[r.bucket]}
                          </span>
                        </div>
                        <div
                          className="flex w-20 shrink-0 items-center justify-end pr-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ActionRowMenu
                            open={openRowMenuId === r.id}
                            onToggle={() =>
                              setOpenRowMenuId((prev) => (prev === r.id ? null : r.id))
                            }
                            actions={actions}
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
                    accounts
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

          {/* Right column */}
          <div className="flex w-full shrink-0 flex-col gap-4 2xl:w-[340px]">
            <div
              className="rounded-[12px] p-4 sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Aging Summary
              </h2>
              <div className="mt-3 flex items-center justify-center">
                <AnimatedDonutChart
                  breakdown={(['0-30', '31-60', '61-90', '90+'] as AgingBucket[]).map((b) => ({
                    label: BUCKET_LABEL[b],
                    value: bucketTotals[b],
                    color: BUCKET_CFG[b].color,
                  }))}
                  total={totalOutstanding}
                  size={150}
                  ariaLabel="Aging summary donut chart"
                  centerValue={formatCurrencyWhole(totalOutstanding)}
                  centerLabel="Total Outstanding"
                />
              </div>
              <div className="mt-3 flex flex-col gap-2">
                {(['0-30', '31-60', '61-90', '90+'] as AgingBucket[]).map((b) => (
                  <div key={b} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ background: BUCKET_CFG[b].color }}
                      />
                      <span style={{ fontSize: 14, color: '#4A7080' }}>{BUCKET_LABEL[b]}</span>
                    </div>
                    <span
                      className="font-sans font-medium whitespace-nowrap"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {formatCurrencyWhole(bucketTotals[b])}
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
                Top Departments
              </h2>
              <div className="mt-3 flex flex-col gap-3">
                {departmentTotals.length === 0 && (
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>No outstanding balances yet.</p>
                )}
                {departmentTotals.slice(0, 5).map((d) => (
                  <div key={d.department}>
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="truncate font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {d.department}
                      </span>
                      <span
                        className="shrink-0 font-sans font-semibold whitespace-nowrap"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {formatCurrencyWhole(d.amount)}
                      </span>
                    </div>
                    <div
                      className="mt-1.5 h-1.5 overflow-hidden rounded-full"
                      style={{ background: '#F5FBFD' }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max(2, (d.amount / topDeptMax) * 100)}%`,
                          background: '#00B4D8',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="rounded-[12px] p-4 sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Quick Actions
              </h2>
              <div className="mt-3 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() =>
                    toast.success(
                      'Reminders queued',
                      `Payment reminders will be sent to ${patientsDue} patient${patientsDue !== 1 ? 's' : ''} with an outstanding balance.`,
                    )
                  }
                  className={`flex h-11 w-full items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                  style={{ fontSize: 14, background: '#00B4D8' }}
                >
                  <Bell style={{ width: 15, height: 15 }} />
                  Send Payment Reminder
                </button>
                <button
                  type="button"
                  onClick={() => router.push(ROUTES.billingPayments)}
                  className={`flex h-11 w-full items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                  style={{
                    fontSize: 14,
                    color: '#0D2630',
                    border: '1px solid rgba(0,100,130,0.2)',
                  }}
                >
                  <Wallet style={{ width: 15, height: 15 }} />
                  Record Payment
                </button>
                <button
                  type="button"
                  onClick={() => router.push(ROUTES.billingInvoices)}
                  className={`flex h-11 w-full items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                  style={{
                    fontSize: 14,
                    color: '#0D2630',
                    border: '1px solid rgba(0,100,130,0.2)',
                  }}
                >
                  <ReceiptText style={{ width: 15, height: 15 }} />
                  View All Invoices
                </button>
                <button
                  type="button"
                  onClick={handleExport}
                  className={`flex h-11 w-full items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                  style={{
                    fontSize: 14,
                    color: '#0D2630',
                    border: '1px solid rgba(0,100,130,0.2)',
                  }}
                >
                  <Download style={{ width: 15, height: 15 }} />
                  Export Outstanding List
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer note */}
        <div
          className="mt-4 flex items-center gap-2 rounded-[10px] px-4 py-3"
          style={{ background: '#E6F8FD' }}
        >
          <Clock3 style={{ width: 16, height: 16, color: '#00B4D8', flexShrink: 0 }} />
          <p style={{ fontSize: 14, color: '#0D2630' }}>
            Outstanding accounts are updated in real-time. Click on an account to view details and
            take action.
          </p>
        </div>

        <div className="h-4" />
      </div>

      {detailRow && (
        <OutstandingAccountDetailModal
          row={detailRow}
          bucketLabel={BUCKET_LABEL[detailRow.bucket]}
          onClose={() => setDetailRow(null)}
          onRecordPayment={() => {
            setDetailRow(null);
            goToPayments(detailRow.mrn);
          }}
          onSendReminder={() => {
            sendReminder(detailRow);
            setDetailRow(null);
          }}
          onViewAccount={() => {
            setDetailRow(null);
            goToAccount(detailRow.mrn);
          }}
        />
      )}
    </main>
  );
}
