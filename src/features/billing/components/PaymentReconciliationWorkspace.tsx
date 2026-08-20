'use client';

import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  Filter,
  Link2,
  ListChecks,
  MoreVertical,
  RefreshCcw,
  Search,
  TrendingUp,
  Upload,
  Wand2,
  XCircle,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useMemo, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';

import { AnimatedDonutChart } from '@components/shared/AnimatedDonutChart';
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
import { useToast } from '@/hooks/useToast';
import { formatCurrencyCompact, formatCurrencyWhole } from '@/utils/currency';
import { formatHumanDate, formatTime } from '@/utils/datetime';
import { downloadCSV } from '@/utils/export';
import {
  buildAllPayments,
  PAYMENT_METHODS,
  type PaymentWithAccount,
} from '@/features/billing/__mocks__/billingAccountDetailFixtures';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';
const DAY_MS = 24 * 60 * 60 * 1000;
const ROWS_PER_PAGE = 10;

function hashSeed(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (Math.imul(h, 31) + input.charCodeAt(i)) | 0;
  return h >>> 0;
}
function mulberry32(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type ReconciliationStatus = 'Matched' | 'Unmatched' | 'Pending' | 'Exception';

export type ReconciliationRow = {
  id: string;
  date: string;
  sourceRef: string;
  sourceDescription: string;
  method: string;
  sourceAmount: number;
  systemPaymentNumber?: string | undefined;
  systemPaymentDate?: string | undefined;
  systemAmount?: number | undefined;
  invoiceNumber?: string | undefined;
  patientName?: string | undefined;
  mrn?: string | undefined;
  status: ReconciliationStatus;
  exceptionReason?: string | undefined;
};

const POS_PROVIDERS = ['Stanbic IBTC POS', 'Moniepoint POS', 'Opay POS', 'Paystack POS'];
const BANK_PROVIDERS = [
  'GTBank Transfer',
  'Access Bank Transfer',
  'UBA Transfer',
  'First Bank Transfer',
  'Zenith Bank Transfer',
];
const ONLINE_PROVIDERS = ['Flutterwave', 'Paystack Checkout', 'Interswitch Webpay'];
const CARD_PROVIDERS = ['Interswitch Card Gateway', 'Paystack Card'];
const CASH_PROVIDERS = ['Front Desk Cash Till', 'Pharmacy Cash Till'];

function sourceFor(method: string, rand: () => number): { ref: string; description: string } {
  const digits = (n: number) => String(Math.floor(rand() * 10 ** n)).padStart(n, '0');
  switch (method) {
    case 'POS':
      return {
        ref: `POS-${digits(6)}`,
        description: POS_PROVIDERS[Math.floor(rand() * POS_PROVIDERS.length)]!,
      };
    case 'Bank Transfer':
      return {
        ref: `TXN-${digits(7)}`,
        description: BANK_PROVIDERS[Math.floor(rand() * BANK_PROVIDERS.length)]!,
      };
    case 'Online':
      return {
        ref: `ONL-${digits(6)}`,
        description: ONLINE_PROVIDERS[Math.floor(rand() * ONLINE_PROVIDERS.length)]!,
      };
    case 'Card':
      return {
        ref: `CRD-${digits(6)}`,
        description: CARD_PROVIDERS[Math.floor(rand() * CARD_PROVIDERS.length)]!,
      };
    default:
      return {
        ref: `CSH-${digits(6)}`,
        description: CASH_PROVIDERS[Math.floor(rand() * CASH_PROVIDERS.length)]!,
      };
  }
}

function buildReconciliationRows(payments: PaymentWithAccount[]): ReconciliationRow[] {
  const rand = mulberry32(hashSeed('payment-reconciliation'));
  const rows: ReconciliationRow[] = payments.map((p) => {
    const { ref, description } = sourceFor(p.method, rand);
    const flagException = p.reconciled && rand() < 0.015;
    const delta = flagException ? (rand() < 0.5 ? -1 : 1) * (500 + Math.floor(rand() * 1500)) : 0;
    const sourceAmount = p.amount + delta;
    const status: ReconciliationStatus = flagException
      ? 'Exception'
      : p.reconciled
        ? 'Matched'
        : 'Pending';
    return {
      id: `recon-${p.id}`,
      date: p.date,
      sourceRef: ref,
      sourceDescription: description,
      method: p.method,
      sourceAmount,
      systemPaymentNumber: p.paymentNumber,
      systemPaymentDate: p.date,
      systemAmount: p.amount,
      invoiceNumber: p.invoiceNumber,
      patientName: p.patientName,
      mrn: p.mrn,
      status,
      exceptionReason: flagException
        ? `Source amount differs from the system payment by ${formatCurrencyWhole(Math.abs(delta))}.`
        : undefined,
    };
  });

  const unmatchedCount = Math.max(1, Math.round(payments.length * 0.15));
  for (let i = 0; i < unmatchedCount; i++) {
    const method = PAYMENT_METHODS[Math.floor(rand() * PAYMENT_METHODS.length)]!;
    const { ref, description } = sourceFor(method, rand);
    const daysBack = Math.floor(rand() * 20);
    rows.push({
      id: `recon-unmatched-${i}`,
      date: new Date(
        Date.now() - daysBack * DAY_MS - Math.floor(rand() * 12) * 60 * 60 * 1000,
      ).toISOString(),
      sourceRef: ref,
      sourceDescription: description,
      method,
      sourceAmount: 1_000 + Math.floor(rand() * 25_000),
      status: 'Unmatched',
    });
  }

  return rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

const STATUS_CFG: Record<ReconciliationStatus, { color: string; bg: string }> = {
  Matched: { color: '#16A34A', bg: 'rgba(22,163,74,0.1)' },
  Unmatched: { color: '#D97706', bg: 'rgba(217,119,6,0.1)' },
  Pending: { color: '#2563EB', bg: 'rgba(37,99,235,0.1)' },
  Exception: { color: '#DC2626', bg: 'rgba(220,38,38,0.1)' },
};
const METHOD_COLORS: Record<string, string> = {
  POS: '#0D9488',
  'Bank Transfer': '#2563EB',
  Cash: '#7C3AED',
  Card: '#D97706',
  Online: '#DB2777',
};

const LinkPaymentModal = dynamic(
  () => import('./LinkPaymentModal').then((m) => m.LinkPaymentModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);
const ReconciliationDetailModal = dynamic(
  () => import('./ReconciliationDetailModal').then((m) => m.ReconciliationDetailModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

type MainTab = 'ALL' | ReconciliationStatus;
const TABS: { key: MainTab; label: string }[] = [
  { key: 'ALL', label: 'All Transactions' },
  { key: 'Matched', label: 'Matched' },
  { key: 'Unmatched', label: 'Unmatched' },
  { key: 'Pending', label: 'Pending' },
  { key: 'Exception', label: 'Exceptions' },
];

function ActionRowMenu({
  open,
  onToggle,
  actions,
}: {
  open: boolean;
  onToggle: () => void;
  actions: { label: string; icon: LucideIcon; onClick: () => void; danger?: boolean }[];
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
        {actions.map((a) => (
          <button
            key={a.label}
            type="button"
            onClick={a.onClick}
            className={`flex w-full items-center gap-2 px-3.5 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
            style={{ fontSize: 14, color: a.danger ? '#DC2626' : '#0D2630' }}
          >
            <a.icon style={{ width: 15, height: 15, color: a.danger ? '#DC2626' : '#4A7080' }} />
            {a.label}
          </button>
        ))}
      </RowMenuPortal>
    </div>
  );
}

export function PaymentReconciliationWorkspace() {
  const toast = useToast();
  const [rows, setRows] = useState<ReconciliationRow[]>(() =>
    buildReconciliationRows(buildAllPayments()),
  );

  const [activeTab, setActiveTab] = useState<MainTab>('ALL');
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [openRowMenuId, setOpenRowMenuId] = useState<string | null>(null);
  const [detailRow, setDetailRow] = useState<ReconciliationRow | null>(null);
  const [linkRow, setLinkRow] = useState<ReconciliationRow | null>(null);

  const sourceOptions = useMemo(() => {
    const seen = new Set<string>();
    for (const r of rows) seen.add(r.sourceDescription);
    return Array.from(seen)
      .sort()
      .map((s) => ({ value: s, label: s }));
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (activeTab !== 'ALL' && r.status !== activeTab) return false;
      if (statusFilter && r.status !== statusFilter) return false;
      if (methodFilter && r.method !== methodFilter) return false;
      if (sourceFilter && r.sourceDescription !== sourceFilter) return false;
      if (fromDate && new Date(r.date).getTime() < new Date(fromDate).getTime()) return false;
      if (toDate && new Date(r.date).getTime() > new Date(toDate).getTime() + DAY_MS - 1)
        return false;
      if (
        q &&
        !r.sourceRef.toLowerCase().includes(q) &&
        !(r.invoiceNumber ?? '').toLowerCase().includes(q) &&
        !(r.patientName ?? '').toLowerCase().includes(q) &&
        !(r.systemPaymentNumber ?? '').toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [rows, activeTab, statusFilter, methodFilter, sourceFilter, fromDate, toDate, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * ROWS_PER_PAGE;
  const pageRows = filtered.slice(pageStart, pageStart + ROWS_PER_PAGE);

  const matched = rows.filter((r) => r.status === 'Matched');
  const unmatched = rows.filter((r) => r.status === 'Unmatched');
  const pending = rows.filter((r) => r.status === 'Pending');
  const exceptions = rows.filter((r) => r.status === 'Exception');
  const totalAmount = rows.reduce((s, r) => s + r.sourceAmount, 0);
  const matchedAmount = matched.reduce((s, r) => s + r.sourceAmount, 0);
  const unmatchedAmount = unmatched.reduce((s, r) => s + r.sourceAmount, 0);
  const pendingAmount = pending.reduce((s, r) => s + r.sourceAmount, 0);
  const exceptionsAmount = exceptions.reduce((s, r) => s + r.sourceAmount, 0);
  const pct = (n: number) => (rows.length > 0 ? ((n / rows.length) * 100).toFixed(1) : '0.0');

  function clearFilters() {
    setSearch('');
    setFromDate('');
    setToDate('');
    setMethodFilter('');
    setSourceFilter('');
    setStatusFilter('');
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllOnPage() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allSelected = pageRows.every((r) => next.has(r.id));
      for (const r of pageRows) {
        if (allSelected) next.delete(r.id);
        else next.add(r.id);
      }
      return next;
    });
  }

  function handleExport() {
    downloadCSV('payment-reconciliation', [
      [
        'Date',
        'Source Ref',
        'Source Description',
        'Method',
        'Amount',
        'System Payment',
        'Invoice No',
        'Patient',
        'Status',
      ],
      ...filtered.map((r) => [
        `${formatHumanDate(r.date)} ${formatTime(r.date)}`,
        r.sourceRef,
        r.sourceDescription,
        r.method,
        String(r.sourceAmount),
        r.systemPaymentNumber ?? 'Not found',
        r.invoiceNumber ?? '—',
        r.patientName ?? '—',
        r.status,
      ]),
    ]);
    toast.success(
      'Export ready',
      `${filtered.length} transaction${filtered.length !== 1 ? 's' : ''} exported as CSV.`,
    );
  }

  function markMatched(id: string) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'Matched' } : r)));
    toast.success('Marked as matched', 'The transaction has been reconciled.');
  }

  function flagException(row: ReconciliationRow) {
    setRows((prev) =>
      prev.map((r) =>
        r.id === row.id
          ? {
              ...r,
              status: 'Exception',
              exceptionReason: 'Flagged for manual review by an accountant.',
            }
          : r,
      ),
    );
    toast.success('Flagged for review', `${row.sourceRef} has been marked as an exception.`);
  }

  function handleLinkPayment(unmatchedRowId: string, targetPendingRowId: string) {
    setRows((prev) => {
      const target = prev.find((r) => r.id === targetPendingRowId);
      if (!target) return prev;
      return prev
        .filter((r) => r.id !== unmatchedRowId)
        .map((r) => (r.id === targetPendingRowId ? { ...r, status: 'Matched' } : r));
    });
    setLinkRow(null);
    toast.success(
      'Transaction linked',
      'The bank transaction has been matched to the system payment.',
    );
  }

  function handleAutoMatch() {
    const eligible = rows.filter((r) => r.status === 'Pending');
    if (eligible.length === 0) {
      toast.info('Nothing to auto-match', 'There are no pending transactions right now.');
      return;
    }
    setRows((prev) => prev.map((r) => (r.status === 'Pending' ? { ...r, status: 'Matched' } : r)));
    toast.success(
      'Auto match complete',
      `${eligible.length} pending transaction${eligible.length !== 1 ? 's' : ''} matched automatically.`,
    );
  }

  function handleReconcileManually() {
    if (selectedIds.size === 0) {
      toast.info('Select transactions first', 'Check one or more rows, then reconcile manually.');
      return;
    }
    setRows((prev) => prev.map((r) => (selectedIds.has(r.id) ? { ...r, status: 'Matched' } : r)));
    toast.success(
      'Reconciled',
      `${selectedIds.size} transaction${selectedIds.size !== 1 ? 's' : ''} manually reconciled.`,
    );
    setSelectedIds(new Set());
  }

  function handleImportStatement() {
    const rand = mulberry32(hashSeed(`import-${Date.now()}`));
    const importCount = 2 + Math.floor(rand() * 3);
    const imported: ReconciliationRow[] = Array.from({ length: importCount }, (_, i) => {
      const method = PAYMENT_METHODS[Math.floor(rand() * PAYMENT_METHODS.length)]!;
      const { ref, description } = sourceFor(method, rand);
      return {
        id: `recon-import-${Date.now()}-${i}`,
        date: new Date(Date.now() - Math.floor(rand() * 3) * DAY_MS).toISOString(),
        sourceRef: ref,
        sourceDescription: description,
        method,
        sourceAmount: 1_000 + Math.floor(rand() * 20_000),
        status: 'Unmatched',
      };
    });
    setRows((prev) => [...imported, ...prev]);
    setCurrentPage(1);
    toast.success(
      'Bank statement imported',
      `${importCount} new transaction${importCount !== 1 ? 's' : ''} added for review.`,
    );
  }

  const pendingRowsForLinking = rows.filter((r) => r.status === 'Pending');

  return (
    <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
      <div className="mx-auto max-w-[1550px] px-4 py-4 sm:px-6 sm:py-5">
        {/* Header */}
        <div>
          <h1 className="font-display font-bold" style={{ fontSize: 24, color: '#0D2630' }}>
            Payment Reconciliation
          </h1>
          <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
            Reconcile system payments with actual bank/POS/online transactions
          </p>
        </div>

        {/* Stat cards */}
        <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          {[
            {
              icon: ListChecks,
              label: 'Total Transactions',
              value: rows.length.toLocaleString('en-NG'),
              caption: 'This period',
              accent: '#2563EB',
            },
            {
              icon: CheckCircle2,
              label: 'Matched',
              value: matched.length.toLocaleString('en-NG'),
              caption: `${pct(matched.length)}%`,
              accent: '#16A34A',
            },
            {
              icon: AlertTriangle,
              label: 'Unmatched',
              value: unmatched.length.toLocaleString('en-NG'),
              caption: `${pct(unmatched.length)}%`,
              accent: '#D97706',
            },
            {
              icon: Clock,
              label: 'Pending',
              value: pending.length.toLocaleString('en-NG'),
              caption: `${pct(pending.length)}%`,
              accent: '#2563EB',
            },
            {
              icon: XCircle,
              label: 'Exceptions',
              value: exceptions.length.toLocaleString('en-NG'),
              caption: `${pct(exceptions.length)}%`,
              accent: '#DC2626',
            },
            {
              icon: TrendingUp,
              label: 'Total Amount',
              value: formatCurrencyWhole(totalAmount),
              caption: 'This period',
              accent: '#7C3AED',
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
              {/* Filters */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label
                    className="mb-1.5 block font-sans font-medium"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    Payment Method
                  </label>
                  <FormSelect
                    id="recon-method"
                    value={methodFilter}
                    onChange={(v) => {
                      setMethodFilter(v);
                      setCurrentPage(1);
                    }}
                    options={PAYMENT_METHODS.map((m) => ({ value: m, label: m }))}
                    placeholder="All Methods"
                  />
                </div>
                <div>
                  <label
                    className="mb-1.5 block font-sans font-medium"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    Source
                  </label>
                  <FormSelect
                    id="recon-source"
                    value={sourceFilter}
                    onChange={(v) => {
                      setSourceFilter(v);
                      setCurrentPage(1);
                    }}
                    options={sourceOptions}
                    placeholder="All Sources"
                  />
                </div>
                <div>
                  <label
                    className="mb-1.5 block font-sans font-medium"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    Status
                  </label>
                  <FormSelect
                    id="recon-status"
                    value={statusFilter}
                    onChange={(v) => {
                      setStatusFilter(v);
                      setCurrentPage(1);
                    }}
                    options={[
                      { value: 'Matched', label: 'Matched' },
                      { value: 'Unmatched', label: 'Unmatched' },
                      { value: 'Pending', label: 'Pending' },
                      { value: 'Exception', label: 'Exception' },
                    ]}
                    placeholder="All Statuses"
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
                <div className="min-w-[220px] flex-1">
                  <label
                    className="mb-1.5 block font-sans font-medium"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    Reference Search
                  </label>
                  <div className="relative">
                    <Search
                      style={{
                        position: 'absolute',
                        left: 12,
                        top: 13,
                        width: 15,
                        height: 15,
                        color: '#8A98A3',
                      }}
                    />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setCurrentPage(1);
                      }}
                      placeholder="Search txn ref, invoice no, or patient…"
                      className="h-11 w-full rounded-[10px] py-2 pr-3.5 pl-9 font-sans transition-colors duration-150 placeholder:text-[#8A98A3] focus:border-[#00B4D8] focus:ring-2 focus:ring-[#00B4D8]/40 focus:outline-none"
                      style={{
                        fontSize: 14,
                        color: '#0D2630',
                        border: '1px solid rgba(0,100,130,0.18)',
                      }}
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
                {(search || fromDate || toDate || methodFilter || sourceFilter || statusFilter) && (
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

              {/* Tabs */}
              <div
                className="mt-4 flex flex-wrap items-center gap-1 border-b"
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

              {/* Table */}
              <div className="mt-4">
                <ScrollableTable minWidth={1280} maxHeight={640}>
                  <div
                    className={`flex rounded-t-[8px] ${TABLE_HEADER_STICKY_CLASS}`}
                    style={{ background: TABLE_HEADER_BG, borderBottom: '1px solid #E6F8FD' }}
                  >
                    <div className="flex w-10 shrink-0 items-center justify-center py-2.5 pl-3">
                      <input
                        type="checkbox"
                        aria-label="Select all on page"
                        checked={
                          pageRows.length > 0 && pageRows.every((r) => selectedIds.has(r.id))
                        }
                        onChange={toggleSelectAllOnPage}
                        className={FOCUS_RING}
                      />
                    </div>
                    <div className="w-32 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Date / Time
                      </span>
                    </div>
                    <div className="max-w-[200px] min-w-[140px] flex-1 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Source Transaction
                      </span>
                    </div>
                    <div className="w-28 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Method
                      </span>
                    </div>
                    <div className="w-28 shrink-0 py-2.5 pr-7 text-right">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Amount
                      </span>
                    </div>
                    <div className="w-40 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        System Payment
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
                    <div className="max-w-[160px] min-w-[110px] flex-1 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Patient
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
                        <ListChecks style={{ width: 24, height: 24, color: '#8A98A3' }} />
                      </div>
                      <p
                        className="font-sans font-medium"
                        style={{ fontSize: 16, color: '#4A7080' }}
                      >
                        No transactions match your filters
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

                  {pageRows.map((r) => {
                    const cfg = STATUS_CFG[r.status];
                    const methodCfg = METHOD_COLORS[r.method] ?? '#4A7080';
                    const actions = [
                      {
                        label: 'View Details',
                        icon: Eye,
                        onClick: () => {
                          setOpenRowMenuId(null);
                          setDetailRow(r);
                        },
                      },
                      ...(r.status === 'Pending' || r.status === 'Exception'
                        ? [
                            {
                              label: 'Mark as Matched',
                              icon: CheckCircle2,
                              onClick: () => {
                                setOpenRowMenuId(null);
                                markMatched(r.id);
                              },
                            },
                          ]
                        : []),
                      ...(r.status === 'Matched'
                        ? [
                            {
                              label: 'Flag Exception',
                              icon: AlertTriangle,
                              onClick: () => {
                                setOpenRowMenuId(null);
                                flagException(r);
                              },
                              danger: true,
                            },
                          ]
                        : []),
                      ...(r.status === 'Unmatched'
                        ? [
                            {
                              label: 'Link to Payment',
                              icon: Link2,
                              onClick: () => {
                                setOpenRowMenuId(null);
                                setLinkRow(r);
                              },
                            },
                          ]
                        : []),
                    ];
                    return (
                      <div
                        key={r.id}
                        className="flex items-center transition-colors duration-100 hover:bg-[#F5FBFD]"
                        style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                      >
                        <div className="flex w-10 shrink-0 items-center justify-center py-3 pl-3">
                          <input
                            type="checkbox"
                            aria-label={`Select ${r.sourceRef}`}
                            checked={selectedIds.has(r.id)}
                            onChange={() => toggleSelect(r.id)}
                            className={FOCUS_RING}
                          />
                        </div>
                        <div className="w-32 shrink-0 py-3 pr-2">
                          <p style={{ fontSize: 14, color: '#4A7080' }}>
                            {formatHumanDate(r.date)}
                          </p>
                          <p style={{ fontSize: 14, color: '#8A98A3' }}>{formatTime(r.date)}</p>
                        </div>
                        <div className="max-w-[200px] min-w-[140px] flex-1 py-3 pr-2">
                          <p
                            className="font-sans font-medium"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {r.sourceRef}
                          </p>
                          <Tooltip content={r.sourceDescription}>
                            <p className="truncate" style={{ fontSize: 14, color: '#8A98A3' }}>
                              {r.sourceDescription}
                            </p>
                          </Tooltip>
                        </div>
                        <div className="w-28 shrink-0 py-3 pr-2">
                          <span
                            className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium whitespace-nowrap"
                            style={{ fontSize: 14, color: methodCfg, background: `${methodCfg}1A` }}
                          >
                            {r.method}
                          </span>
                        </div>
                        <div className="w-28 shrink-0 py-3 pr-7 text-right">
                          <Tooltip content={formatCurrencyWhole(r.sourceAmount)}>
                            <p
                              className="truncate font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {formatCurrencyWhole(r.sourceAmount)}
                            </p>
                          </Tooltip>
                        </div>
                        <div className="w-40 shrink-0 py-3 pr-2">
                          {r.systemPaymentNumber ? (
                            <>
                              <p
                                className="font-sans font-medium"
                                style={{ fontSize: 14, color: '#00B4D8' }}
                              >
                                {r.systemPaymentNumber}
                              </p>
                              <p style={{ fontSize: 14, color: '#8A98A3' }}>
                                {formatHumanDate(r.systemPaymentDate!)}
                              </p>
                            </>
                          ) : (
                            <p style={{ fontSize: 14, color: '#8A98A3' }}>Not found</p>
                          )}
                        </div>
                        <div className="w-28 shrink-0 py-3 pr-2">
                          <p
                            style={{ fontSize: 14, color: r.invoiceNumber ? '#00B4D8' : '#8A98A3' }}
                          >
                            {r.invoiceNumber ?? '—'}
                          </p>
                        </div>
                        <div className="max-w-[160px] min-w-[110px] flex-1 py-3 pr-2">
                          <Tooltip content={r.patientName ?? '—'}>
                            <p className="truncate" style={{ fontSize: 14, color: '#0D2630' }}>
                              {r.patientName ?? '—'}
                            </p>
                          </Tooltip>
                        </div>
                        <div className="w-28 shrink-0 py-3 pr-2 text-center">
                          <span
                            className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium whitespace-nowrap"
                            style={{ fontSize: 14, color: cfg.color, background: cfg.bg }}
                          >
                            {r.status}
                          </span>
                        </div>
                        <div className="flex w-20 shrink-0 items-center justify-end pr-3">
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
                    transactions
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
                Reconciliation Summary
              </h2>
              <div className="mt-3 flex items-center justify-center">
                <AnimatedDonutChart
                  breakdown={[
                    { label: 'Matched', value: matched.length, color: STATUS_CFG.Matched.color },
                    {
                      label: 'Unmatched',
                      value: unmatched.length,
                      color: STATUS_CFG.Unmatched.color,
                    },
                    { label: 'Pending', value: pending.length, color: STATUS_CFG.Pending.color },
                    {
                      label: 'Exceptions',
                      value: exceptions.length,
                      color: STATUS_CFG.Exception.color,
                    },
                  ]}
                  total={rows.length}
                  size={150}
                  ariaLabel="Reconciliation status donut chart"
                  centerValue={rows.length}
                  centerLabel="Total"
                />
              </div>
              <div className="mt-3 flex flex-col gap-2">
                {[
                  {
                    label: 'Matched',
                    count: matched.length,
                    pct: pct(matched.length),
                    color: STATUS_CFG.Matched.color,
                  },
                  {
                    label: 'Unmatched',
                    count: unmatched.length,
                    pct: pct(unmatched.length),
                    color: STATUS_CFG.Unmatched.color,
                  },
                  {
                    label: 'Pending',
                    count: pending.length,
                    pct: pct(pending.length),
                    color: STATUS_CFG.Pending.color,
                  },
                  {
                    label: 'Exceptions',
                    count: exceptions.length,
                    pct: pct(exceptions.length),
                    color: STATUS_CFG.Exception.color,
                  },
                ].map((s) => (
                  <div key={s.label} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ background: s.color }}
                      />
                      <span style={{ fontSize: 14, color: '#4A7080' }}>{s.label}</span>
                    </div>
                    <span
                      className="font-sans font-medium"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {s.count} ({s.pct}%)
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
                Amount Summary
              </h2>
              <div className="mt-3 flex flex-col gap-2">
                {[
                  { label: 'Total Amount', value: totalAmount, color: '#0D2630' },
                  { label: 'Matched Amount', value: matchedAmount, color: '#16A34A' },
                  { label: 'Unmatched Amount', value: unmatchedAmount, color: '#D97706' },
                  { label: 'Pending Amount', value: pendingAmount, color: '#2563EB' },
                  { label: 'Exceptions Amount', value: exceptionsAmount, color: '#DC2626' },
                ].map((s) => (
                  <div key={s.label} className="flex items-center justify-between gap-2">
                    <span style={{ fontSize: 14, color: '#4A7080' }}>{s.label}</span>
                    <span
                      className="font-sans font-semibold whitespace-nowrap"
                      style={{ fontSize: 14, color: s.color }}
                    >
                      {formatCurrencyCompact(s.value)}
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
                Quick Actions
              </h2>
              <div className="mt-3 flex flex-col gap-2">
                <PermissionGate permission={PERMISSIONS.BILLING_WRITE}>
                  <button
                    type="button"
                    onClick={handleAutoMatch}
                    className={`flex h-11 w-full items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                    style={{ fontSize: 14, background: '#00B4D8' }}
                  >
                    <Wand2 style={{ width: 15, height: 15 }} />
                    Auto Match
                  </button>
                </PermissionGate>
                <PermissionGate permission={PERMISSIONS.BILLING_WRITE}>
                  <button
                    type="button"
                    onClick={handleReconcileManually}
                    className={`flex h-11 w-full items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                    style={{
                      fontSize: 14,
                      color: '#0D2630',
                      border: '1px solid rgba(0,100,130,0.2)',
                    }}
                  >
                    <ListChecks style={{ width: 15, height: 15 }} />
                    Reconcile Manually
                  </button>
                </PermissionGate>
                <PermissionGate permission={PERMISSIONS.BILLING_WRITE}>
                  <button
                    type="button"
                    onClick={handleImportStatement}
                    className={`flex h-11 w-full items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                    style={{
                      fontSize: 14,
                      color: '#0D2630',
                      border: '1px solid rgba(0,100,130,0.2)',
                    }}
                  >
                    <Upload style={{ width: 15, height: 15 }} />
                    Import Bank Statement
                  </button>
                </PermissionGate>
              </div>
            </div>
          </div>
        </div>

        {/* Footer note */}
        <div
          className="mt-4 flex items-center gap-2 rounded-[10px] px-4 py-3"
          style={{ background: '#E6F8FD' }}
        >
          <RefreshCcw style={{ width: 16, height: 16, color: '#00B4D8', flexShrink: 0 }} />
          <p style={{ fontSize: 14, color: '#0D2630' }}>
            Compare system payments with actual bank, POS, and online payment records to ensure
            accuracy and completeness.
          </p>
        </div>

        <div className="h-4" />
      </div>

      {detailRow && (
        <ReconciliationDetailModal
          row={detailRow}
          onClose={() => setDetailRow(null)}
          onMarkMatched={() => {
            markMatched(detailRow.id);
            setDetailRow(null);
          }}
          onFlagException={() => {
            flagException(detailRow);
            setDetailRow(null);
          }}
        />
      )}
      {linkRow && (
        <LinkPaymentModal
          unmatchedRow={linkRow}
          pendingRows={pendingRowsForLinking}
          onClose={() => setLinkRow(null)}
          onLink={(targetId) => handleLinkPayment(linkRow.id, targetId)}
        />
      )}
    </main>
  );
}
