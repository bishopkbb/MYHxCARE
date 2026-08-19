'use client';

import {
  AlertTriangle,
  ClipboardList,
  Download,
  Eye,
  FileCheck2,
  FilePlus2,
  FileText,
  Filter,
  Info,
  MoreVertical,
  Plus,
  ReceiptText,
  RefreshCcw,
  RotateCcw,
  Search,
  Undo2,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';

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
import { downloadCSV } from '@/utils/export';
import { formatCurrencyWhole } from '@/utils/currency';
import {
  BILLING_ACCOUNTS,
  BILLING_ACCOUNT_DEPARTMENTS,
  deriveOutstanding,
  deriveStatus,
  type AccountStatus,
  type BillingAccount,
} from '@/features/billing/__mocks__/billingAccountsFixtures';

const NewBillingAccountModal = dynamic(
  () => import('./NewBillingAccountModal').then((m) => m.NewBillingAccountModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';
const ROWS_PER_PAGE = 8;

const STATUS_CFG: Record<AccountStatus, { color: string; border: string; bg: string }> = {
  Paid: { color: '#16A34A', border: 'rgba(22,163,74,0.35)', bg: 'rgba(22,163,74,0.08)' },
  Partial: { color: '#D97706', border: 'rgba(217,119,6,0.35)', bg: 'rgba(217,119,6,0.08)' },
  Overdue: { color: '#DC2626', border: 'rgba(220,38,38,0.35)', bg: 'rgba(220,38,38,0.08)' },
};

const AGEING_OPTIONS = [
  { value: '0-30', label: '0 – 30 Days' },
  { value: '31-60', label: '31 – 60 Days' },
  { value: '61-90', label: '61 – 90 Days' },
  { value: '90+', label: '90+ Days' },
];

function matchesAgeing(days: number, bucket: string): boolean {
  if (bucket === '0-30') return days <= 30;
  if (bucket === '31-60') return days > 30 && days <= 60;
  if (bucket === '61-90') return days > 60 && days <= 90;
  return days > 90;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  return `${parts[0]?.[0] ?? ''}${parts[parts.length - 1]?.[0] ?? ''}`.toUpperCase();
}

const AVATAR_COLORS = ['#2563EB', '#16A34A', '#7C3AED', '#D97706', '#DC2626', '#0D9488'];
function avatarColorFor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]!;
}

function AccountRowMenu({
  open,
  onToggle,
  onView,
  onCreateInvoice,
  onPostPayment,
}: {
  open: boolean;
  onToggle: () => void;
  onView: () => void;
  onCreateInvoice: () => void;
  onPostPayment: () => void;
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
          View Account
        </button>
        <button
          type="button"
          onClick={onCreateInvoice}
          className={`flex w-full items-center gap-2 px-3.5 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
          style={{ fontSize: 14, color: '#0D2630' }}
        >
          <FilePlus2 style={{ width: 15, height: 15, color: '#4A7080' }} />
          Create Invoice
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
      </RowMenuPortal>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  count,
  onClick,
}: {
  icon: typeof FileText;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-[8px] px-2 py-2.5 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
    >
      <Icon style={{ width: 16, height: 16, color: '#4A7080' }} />
      <span className="min-w-0 flex-1" style={{ fontSize: 14, color: '#0D2630' }}>
        {label}
      </span>
      <span
        className="flex size-5 shrink-0 items-center justify-center rounded-full font-sans font-medium"
        style={{ fontSize: 14, color: '#4A7080', background: '#F5FBFD' }}
      >
        {count}
      </span>
      <span style={{ fontSize: 14, color: '#8A98A3' }}>›</span>
    </button>
  );
}

export function BillingAccountsWorkspace() {
  const router = useRouter();
  const toast = useToast();
  const [accounts, setAccounts] = useState<BillingAccount[]>(BILLING_ACCOUNTS);

  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [ageingFilter, setAgeingFilter] = useState('');
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openRowMenuId, setOpenRowMenuId] = useState<string | null>(null);
  const [newAccountOpen, setNewAccountOpen] = useState(false);

  const departmentOptions = useMemo(
    () => BILLING_ACCOUNT_DEPARTMENTS.map((d) => ({ value: d, label: d })),
    [],
  );
  const statusOptions: { value: AccountStatus; label: string }[] = [
    { value: 'Paid', label: 'Paid' },
    { value: 'Partial', label: 'Partial' },
    { value: 'Overdue', label: 'Overdue' },
  ];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return accounts.filter((a) => {
      if (departmentFilter && a.department !== departmentFilter) return false;
      if (statusFilter && deriveStatus(a) !== statusFilter) return false;
      if (ageingFilter && !matchesAgeing(a.daysOutstanding, ageingFilter)) return false;
      if (
        q &&
        !a.patientName.toLowerCase().includes(q) &&
        !a.mrn.toLowerCase().includes(q) &&
        !a.phone.replace(/\s+/g, '').includes(q.replace(/\s+/g, '')) &&
        !(a.secondaryId ?? '').toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [accounts, search, departmentFilter, statusFilter, ageingFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * ROWS_PER_PAGE;
  const pageRows = filtered.slice(pageStart, pageStart + ROWS_PER_PAGE);
  const selected = selectedId ? accounts.find((a) => a.id === selectedId) : undefined;

  const totalAccounts = accounts.length;
  const totalBilledAll = accounts.reduce((s, a) => s + a.totalBilled, 0);
  const totalPaidAll = accounts.reduce((s, a) => s + a.totalPaid, 0);
  const outstandingAll = accounts.reduce((s, a) => s + deriveOutstanding(a), 0);
  const overdueCount = accounts.filter((a) => deriveStatus(a) === 'Overdue').length;

  function clearFilters() {
    setSearch('');
    setDepartmentFilter('');
    setStatusFilter('');
    setAgeingFilter('');
    setCurrentPage(1);
  }

  function handleExport() {
    const rows = [
      [
        'Patient',
        'MRN',
        'Secondary ID',
        'Department',
        'Total Billed',
        'Total Paid',
        'Outstanding',
        'Status',
      ],
      ...filtered.map((a) => [
        a.patientName,
        a.mrn,
        a.secondaryId ?? '',
        a.department,
        String(a.totalBilled),
        String(a.totalPaid),
        String(deriveOutstanding(a)),
        deriveStatus(a),
      ]),
    ];
    downloadCSV('billing-accounts', rows);
    toast.success(
      'Export ready',
      `${filtered.length} account${filtered.length !== 1 ? 's' : ''} exported as CSV.`,
    );
  }

  function handleCreateAccount(account: BillingAccount) {
    setAccounts((prev) => [account, ...prev]);
    setNewAccountOpen(false);
    setCurrentPage(1);
    toast.success(
      'Account created',
      `A billing account for ${account.patientName} has been created.`,
    );
  }

  function goToInvoices(mrn: string) {
    setOpenRowMenuId(null);
    router.push(`${ROUTES.billingInvoices}?mrn=${encodeURIComponent(mrn)}`);
  }
  function goToPayments(mrn: string) {
    setOpenRowMenuId(null);
    router.push(`${ROUTES.billingPayments}?mrn=${encodeURIComponent(mrn)}`);
  }
  function goToRefunds(mrn: string) {
    router.push(`${ROUTES.billingRefunds}?mrn=${encodeURIComponent(mrn)}`);
  }
  function goToFullAccount(mrn: string) {
    router.push(`${ROUTES.billingAccounts}/${encodeURIComponent(mrn)}`);
  }
  function notAvailable(label: string) {
    toast.info(label, 'This feature is on the roadmap and not yet available.');
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto max-w-[1500px] px-4 py-4 sm:px-6 sm:py-5">
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="font-display font-bold" style={{ fontSize: 24, color: '#0D2630' }}>
                Billing Accounts
              </h1>
              <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
                Manage patient financial accounts and balances
              </p>
            </div>
          </div>

          {/* Stat cards */}
          <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-5 xl:gap-4">
            {[
              {
                icon: Users,
                label: 'Total Accounts',
                value: totalAccounts.toLocaleString('en-NG'),
                caption: 'Active patient accounts',
                accent: '#2563EB',
              },
              {
                icon: FileText,
                label: 'Total Billed',
                value: formatCurrencyWhole(totalBilledAll),
                caption: 'All time billed amount',
                accent: '#16A34A',
              },
              {
                icon: Wallet,
                label: 'Total Paid',
                value: formatCurrencyWhole(totalPaidAll),
                accent: '#0D9488',
                caption: 'All time payments received',
              },
              {
                icon: RefreshCcw,
                label: 'Outstanding Balance',
                value: formatCurrencyWhole(outstandingAll),
                caption: 'Amount due from patients',
                accent: '#D97706',
              },
              {
                icon: AlertTriangle,
                label: 'Overdue Accounts',
                value: overdueCount.toLocaleString('en-NG'),
                caption: 'Accounts with overdue balance',
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

          {/* Search & Filter + List/Detail */}
          <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-start">
            <div className={`min-w-0 flex-1 ${selected ? 'hidden xl:block' : 'block'}`}>
              <div
                className="rounded-[12px] p-4 sm:p-5"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2
                    className="font-display font-semibold"
                    style={{ fontSize: 16, color: '#0D2630' }}
                  >
                    Search &amp; Filter
                  </h2>
                  <div className="flex items-center gap-2.5">
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
                        onClick={() => setNewAccountOpen(true)}
                        className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                        style={{ fontSize: 14, background: '#00B4D8' }}
                      >
                        <Plus style={{ width: 15, height: 15 }} />
                        New Account
                      </button>
                    </PermissionGate>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="relative sm:col-span-2 lg:col-span-2">
                    <Search
                      style={{ width: 15, height: 15, color: '#8A98A3' }}
                      className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2"
                    />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setCurrentPage(1);
                      }}
                      placeholder="Search by patient name, MRN, phone or invoice…"
                      className={`h-11 w-full rounded-[10px] pr-3.5 pl-9 font-sans transition-colors duration-150 placeholder:text-[#8A98A3] focus:border-[#00B4D8] focus:ring-2 focus:ring-[#00B4D8]/40 focus:outline-none`}
                      style={{
                        fontSize: 14,
                        color: '#0D2630',
                        border: '1px solid rgba(0,100,130,0.18)',
                      }}
                    />
                  </div>
                  <FormSelect
                    id="billing-account-department"
                    value={departmentFilter}
                    onChange={(v) => {
                      setDepartmentFilter(v);
                      setCurrentPage(1);
                    }}
                    options={departmentOptions}
                    placeholder="All Departments"
                  />
                  <FormSelect
                    id="billing-account-status"
                    value={statusFilter}
                    onChange={(v) => {
                      setStatusFilter(v);
                      setCurrentPage(1);
                    }}
                    options={statusOptions}
                    placeholder="All Status"
                  />
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
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
                </div>

                {moreFiltersOpen && (
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <FormSelect
                      id="billing-account-ageing"
                      value={ageingFilter}
                      onChange={(v) => {
                        setAgeingFilter(v);
                        setCurrentPage(1);
                      }}
                      options={AGEING_OPTIONS}
                      placeholder="Any Ageing"
                    />
                    <button
                      type="button"
                      onClick={clearFilters}
                      className={`flex h-11 items-center justify-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:underline ${FOCUS_RING}`}
                      style={{ fontSize: 14, color: '#00B4D8' }}
                    >
                      <RotateCcw style={{ width: 14, height: 14 }} />
                      Clear all filters
                    </button>
                  </div>
                )}

                <div className="mt-4">
                  <ScrollableTable minWidth={1050} maxHeight={640}>
                    <div
                      className={`flex rounded-t-[8px] ${TABLE_HEADER_STICKY_CLASS}`}
                      style={{ background: TABLE_HEADER_BG, borderBottom: '1px solid #E6F8FD' }}
                    >
                      <div className="max-w-[220px] min-w-[170px] flex-1 py-2.5 pr-2 pl-3">
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
                          MRN / ID
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
                      <div className="w-28 shrink-0 py-2.5 pr-2 text-center">
                        <Tooltip content="Total Billed">
                          <span
                            className="truncate font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                            style={{ fontSize: 14, color: '#4A7080' }}
                          >
                            Total Billed
                          </span>
                        </Tooltip>
                      </div>
                      <div className="w-28 shrink-0 py-2.5 pr-2 text-center">
                        <Tooltip content="Total Paid">
                          <span
                            className="truncate font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                            style={{ fontSize: 14, color: '#4A7080' }}
                          >
                            Total Paid
                          </span>
                        </Tooltip>
                      </div>
                      <div className="flex w-28 shrink-0 items-center justify-center gap-1 py-2.5 pr-2">
                        <Tooltip content="Outstanding Balance">
                          <span
                            className="truncate font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                            style={{ fontSize: 14, color: '#4A7080' }}
                          >
                            Balance
                          </span>
                        </Tooltip>
                        <Tooltip content="The account's live standing balance — what the patient currently owes. Matches Total Billed minus Total Paid unless a credit or hold adjustment applies.">
                          <Info
                            style={{ width: 13, height: 13, color: '#8A98A3' }}
                            className="shrink-0"
                          />
                        </Tooltip>
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
                          <Users style={{ width: 24, height: 24, color: '#8A98A3' }} />
                        </div>
                        <p
                          className="font-sans font-medium"
                          style={{ fontSize: 16, color: '#4A7080' }}
                        >
                          No accounts match your filters
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

                    {pageRows.map((a) => {
                      const outstanding = deriveOutstanding(a);
                      const status = deriveStatus(a);
                      const statusCfg = STATUS_CFG[status];
                      return (
                        <div
                          key={a.id}
                          onClick={() => setSelectedId(a.id)}
                          className="flex cursor-pointer items-center transition-colors duration-100 hover:bg-[#F5FBFD]"
                          style={{
                            borderBottom: '1px solid rgba(0,100,130,0.08)',
                            background: selectedId === a.id ? '#E6F8FD' : 'transparent',
                          }}
                        >
                          <div className="flex max-w-[220px] min-w-[170px] flex-1 items-center gap-2.5 py-3 pr-2 pl-3">
                            <div
                              className="flex size-9 shrink-0 items-center justify-center rounded-full font-sans text-sm font-semibold text-white"
                              style={{ background: avatarColorFor(a.id) }}
                            >
                              {initialsOf(a.patientName)}
                            </div>
                            <div className="min-w-0">
                              <Tooltip content={a.patientName}>
                                <p
                                  className="truncate font-sans font-medium"
                                  style={{ fontSize: 14, color: '#0D2630' }}
                                >
                                  {a.patientName}
                                </p>
                              </Tooltip>
                              <p style={{ fontSize: 14, color: '#8A98A3' }}>{a.phone}</p>
                            </div>
                          </div>
                          <div className="w-32 shrink-0 py-3 pr-2">
                            <p style={{ fontSize: 14, color: '#0D2630' }}>{a.mrn}</p>
                            <p style={{ fontSize: 14, color: '#8A98A3' }}>{a.secondaryId ?? '—'}</p>
                          </div>
                          <div className="w-28 shrink-0 py-3 pr-2">
                            <Tooltip content={a.department}>
                              <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                                {a.department}
                              </p>
                            </Tooltip>
                          </div>
                          <div className="w-28 shrink-0 py-3 pr-2 text-center">
                            <p style={{ fontSize: 14, color: '#0D2630' }}>
                              {formatCurrencyWhole(a.totalBilled)}
                            </p>
                          </div>
                          <div className="w-28 shrink-0 py-3 pr-2 text-center">
                            <p style={{ fontSize: 14, color: '#16A34A' }}>
                              {formatCurrencyWhole(a.totalPaid)}
                            </p>
                          </div>
                          <div className="w-28 shrink-0 py-3 pr-2 text-center">
                            <p
                              className="font-sans font-medium"
                              style={{
                                fontSize: 14,
                                color: outstanding > 0 ? '#DC2626' : '#0D2630',
                              }}
                            >
                              {formatCurrencyWhole(outstanding)}
                            </p>
                          </div>
                          <div className="w-24 shrink-0 py-3 pr-2 text-center">
                            <span
                              className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium whitespace-nowrap"
                              style={{
                                fontSize: 14,
                                color: statusCfg.color,
                                border: `1px solid ${statusCfg.border}`,
                                background: statusCfg.bg,
                              }}
                            >
                              {status}
                            </span>
                          </div>
                          <div
                            className="flex w-20 shrink-0 items-center justify-end gap-1 py-3 pr-3"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <AccountRowMenu
                              open={openRowMenuId === a.id}
                              onToggle={() =>
                                setOpenRowMenuId((prev) => (prev === a.id ? null : a.id))
                              }
                              onView={() => {
                                setOpenRowMenuId(null);
                                setSelectedId(a.id);
                              }}
                              onCreateInvoice={() => goToInvoices(a.mrn)}
                              onPostPayment={() => goToPayments(a.mrn)}
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

            {/* Detail pane */}
            {selected && (
              <div
                className="flex w-full shrink-0 flex-col overflow-hidden xl:w-[360px]"
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
                    Patient Account Overview
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
                  <div className="flex items-center gap-3">
                    <div
                      className="flex size-12 shrink-0 items-center justify-center rounded-full font-sans font-semibold text-white"
                      style={{ fontSize: 16, background: avatarColorFor(selected.id) }}
                    >
                      {initialsOf(selected.patientName)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-2">
                        <Tooltip content={selected.patientName}>
                          <p
                            className="font-display truncate font-semibold"
                            style={{ fontSize: 16, color: '#0D2630' }}
                          >
                            {selected.patientName}
                          </p>
                        </Tooltip>
                        <span
                          className="shrink-0 rounded-full px-2 py-0.5 font-sans font-medium whitespace-nowrap"
                          style={{
                            fontSize: 14,
                            color: selected.active ? '#16A34A' : '#8A98A3',
                            background: selected.active
                              ? 'rgba(22,163,74,0.1)'
                              : 'rgba(138,152,163,0.12)',
                          }}
                        >
                          {selected.active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p style={{ fontSize: 14, color: '#8A98A3' }}>MRN: {selected.mrn}</p>
                      <p style={{ fontSize: 14, color: '#8A98A3' }}>{selected.phone}</p>
                      <Tooltip content={selected.email}>
                        <p className="truncate" style={{ fontSize: 14, color: '#8A98A3' }}>
                          {selected.email}
                        </p>
                      </Tooltip>
                    </div>
                  </div>

                  <div
                    className="mt-4 grid grid-cols-3 gap-2 rounded-[10px] p-3"
                    style={{ background: '#F5FBFD' }}
                  >
                    <div>
                      <p style={{ fontSize: 14, color: '#8A98A3' }}>Total Billed</p>
                      <p
                        className="font-sans font-semibold"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {formatCurrencyWhole(selected.totalBilled)}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: 14, color: '#8A98A3' }}>Total Paid</p>
                      <p
                        className="font-sans font-semibold"
                        style={{ fontSize: 14, color: '#16A34A' }}
                      >
                        {formatCurrencyWhole(selected.totalPaid)}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: 14, color: '#8A98A3' }}>Outstanding</p>
                      <p
                        className="font-sans font-semibold"
                        style={{ fontSize: 14, color: '#DC2626' }}
                      >
                        {formatCurrencyWhole(deriveOutstanding(selected))}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-col gap-0.5">
                    <DetailRow
                      icon={ClipboardList}
                      label="Account Summary"
                      count={0}
                      onClick={() => notAvailable('Account Summary')}
                    />
                    <DetailRow
                      icon={ReceiptText}
                      label="Invoice History"
                      count={selected.invoiceCount}
                      onClick={() => goToInvoices(selected.mrn)}
                    />
                    <DetailRow
                      icon={Wallet}
                      label="Payment History"
                      count={selected.paymentCount}
                      onClick={() => goToPayments(selected.mrn)}
                    />
                    <DetailRow
                      icon={FileCheck2}
                      label="Adjustments"
                      count={selected.adjustmentCount}
                      onClick={() => notAvailable('Adjustments')}
                    />
                    <DetailRow
                      icon={Undo2}
                      label="Refunds"
                      count={selected.refundCount}
                      onClick={() => goToRefunds(selected.mrn)}
                    />
                    <DetailRow
                      icon={FileText}
                      label="Documents"
                      count={selected.documentCount}
                      onClick={() => notAvailable('Documents')}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2 p-4 pt-0 sm:p-5 sm:pt-0">
                  <button
                    type="button"
                    onClick={() => goToFullAccount(selected.mrn)}
                    className={`flex h-11 w-full items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                    style={{ fontSize: 14, background: '#00B4D8' }}
                  >
                    View Full Account
                  </button>
                  <PermissionGate permission={PERMISSIONS.BILLING_WRITE}>
                    <button
                      type="button"
                      onClick={() => goToInvoices(selected.mrn)}
                      className={`flex h-11 w-full items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                      style={{
                        fontSize: 14,
                        color: '#0D2630',
                        border: '1px solid rgba(0,100,130,0.2)',
                      }}
                    >
                      <FilePlus2 style={{ width: 15, height: 15 }} />
                      Create Invoice
                    </button>
                  </PermissionGate>
                  <PermissionGate permission={PERMISSIONS.BILLING_WRITE}>
                    <button
                      type="button"
                      onClick={() => goToPayments(selected.mrn)}
                      className={`flex h-11 w-full items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                      style={{
                        fontSize: 14,
                        color: '#0D2630',
                        border: '1px solid rgba(0,100,130,0.2)',
                      }}
                    >
                      <Wallet style={{ width: 15, height: 15 }} />
                      Post Payment
                    </button>
                  </PermissionGate>
                </div>
              </div>
            )}
          </div>

          <div className="h-4" />
        </div>
      </main>

      {newAccountOpen && (
        <NewBillingAccountModal
          onClose={() => setNewAccountOpen(false)}
          onCreate={handleCreateAccount}
        />
      )}
    </div>
  );
}
