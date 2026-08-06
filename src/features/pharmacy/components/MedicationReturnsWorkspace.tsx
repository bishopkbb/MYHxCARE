'use client';

import {
  CheckCircle2,
  Clock,
  Coins,
  Download,
  Eye,
  FileBarChart,
  FileText,
  Filter,
  MoreVertical,
  Plus,
  Printer,
  ShoppingCart,
  XCircle,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';

import { AnimatedDonutChart } from '@components/shared/AnimatedDonutChart';
import { FormDateInput } from '@components/shared/FormDateInput';
import { FormSelect } from '@components/shared/FormSelect';
import { ModalLoadingFallback } from '@components/shared/ModalLoadingFallback';
import { Pagination } from '@components/shared/Pagination';
import { PermissionGate } from '@components/shared/PermissionGate';
import { RowMenuPortal } from '@components/shared/RowMenuPortal';
import {
  ScrollableTable,
  TABLE_HEADER_BG,
  TABLE_HEADER_STICKY_CLASS,
} from '@components/shared/ScrollableTable';
import { StatCard } from '@components/shared/StatCard';
import { Tooltip } from '@components/shared/Tooltip';
import { PERMISSIONS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
import { useToast } from '@/hooks/useToast';
import { formatCurrency, formatCurrencyCompact } from '@/utils/currency';
import {
  formatHumanDate,
  formatTime,
  toWATDateInput,
  watMonthStartInput,
  watMonthStartTimestamp,
} from '@/utils/datetime';
import { downloadCSV, downloadPDF, escapeHtml } from '@/utils/export';
import {
  RETURN_PROCESSED_BY_OPTIONS,
  RETURN_REASON_CATEGORIES,
  RETURN_REASON_OPTIONS,
  RETURN_STATUS_COLOR,
  RETURN_STATUS_OPTIONS,
  RETURN_TYPE_OPTIONS,
  type MedicationReturn,
} from '@/features/pharmacy/__mocks__/pharmacyFixtures';
import {
  completeReturn,
  createReturn,
  rejectReturn,
  useMedicationReturns,
} from '@/features/pharmacy/store/medicationReturnsStore';
import type { CreateReturnInput } from '@/features/pharmacy/store/medicationReturnsStore';

const NewReturnModal = dynamic(
  () => import('@/features/pharmacy/components/NewReturnModal').then((m) => m.NewReturnModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);
const ReturnDetailModal = dynamic(
  () => import('@/features/pharmacy/components/ReturnDetailModal').then((m) => m.ReturnDetailModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);
const ReturnReasonsModal = dynamic(
  () =>
    import('@/features/pharmacy/components/ReturnReasonsModal').then((m) => m.ReturnReasonsModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);
const ReturnPolicyModal = dynamic(
  () => import('@/features/pharmacy/components/ReturnPolicyModal').then((m) => m.ReturnPolicyModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const REASON_CATEGORY_COLOR: Record<string, string> = {
  'Therapy changed': '#2563EB',
  'Duplicate dispense': '#7C3AED',
  'Adverse reaction': '#F59E0B',
  'Order cancelled': '#16A34A',
  Others: '#8A98A3',
};

type ModalState =
  | { type: 'new' }
  | { type: 'detail'; medicationReturn: MedicationReturn }
  | { type: 'reasons' }
  | { type: 'policy' }
  | null;

function StatusBadge({ status }: { status: MedicationReturn['status'] }) {
  const cfg = RETURN_STATUS_COLOR[status];
  return (
    <span
      className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium"
      style={{
        fontSize: 14,
        whiteSpace: 'nowrap',
        color: cfg.color,
        border: `1px solid ${cfg.border}`,
        background: cfg.bg,
      }}
    >
      {status}
    </span>
  );
}

function RowMenu({
  medicationReturn,
  onView,
  onComplete,
  onRejectShortcut,
}: {
  medicationReturn: MedicationReturn;
  onView: () => void;
  onComplete: () => void;
  onRejectShortcut: () => void;
}) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`More actions for ${medicationReturn.id}`}
        className={`flex size-11 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
      >
        <MoreVertical style={{ width: 15, height: 15, color: '#4A7080' }} />
      </button>
      <RowMenuPortal open={open} anchorRef={buttonRef} onClose={() => setOpen(false)} width={200}>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            onView();
          }}
          className="flex w-full items-center px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD]"
          style={{ fontSize: 14, color: '#2F3A40' }}
        >
          View Details
        </button>
        {medicationReturn.status === 'Pending' && (
          <>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onComplete();
              }}
              className="flex w-full items-center px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD]"
              style={{ fontSize: 14, color: '#16A34A' }}
            >
              Complete
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onRejectShortcut();
              }}
              className="flex w-full items-center px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD]"
              style={{ fontSize: 14, color: '#DC2626' }}
            >
              Reject
            </button>
          </>
        )}
      </RowMenuPortal>
    </div>
  );
}

export function MedicationReturnsWorkspace() {
  const router = useRouter();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState(watMonthStartInput());
  const [dateTo, setDateTo] = useState(toWATDateInput());
  const [statusFilter, setStatusFilter] = useState('');
  const [returnTypeFilter, setReturnTypeFilter] = useState('');
  const [reasonFilter, setReasonFilter] = useState('');
  const [processedByFilter, setProcessedByFilter] = useState('');
  const [refundTypeFilter, setRefundTypeFilter] = useState('');
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [dateMenuOpen, setDateMenuOpen] = useState(false);
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(8);
  const [modal, setModal] = useState<ModalState>(null);

  const dateButtonRef = useRef<HTMLButtonElement>(null);
  const actionsButtonRef = useRef<HTMLButtonElement>(null);

  const returns = useMedicationReturns();

  const total = returns.length;
  const pending = returns.filter((r) => r.status === 'Pending').length;
  const completed = returns.filter((r) => r.status === 'Completed').length;
  const rejected = returns.filter((r) => r.status === 'Rejected').length;
  const totalValueReturned = returns.reduce((sum, r) => sum + r.refundAmount, 0);

  const { thisMonthCount, trendPercent } = useMemo(() => {
    const thisStart = watMonthStartTimestamp(0);
    const lastStart = watMonthStartTimestamp(1);
    let thisCount = 0;
    let lastCount = 0;
    for (const r of returns) {
      const t = new Date(r.returnDate).getTime();
      if (t >= thisStart) thisCount++;
      else if (t >= lastStart) lastCount++;
    }
    const pct = lastCount > 0 ? Math.round(((thisCount - lastCount) / lastCount) * 100) : 0;
    return { thisMonthCount: thisCount, trendPercent: pct };
  }, [returns]);

  const reasonBreakdown = useMemo(() => {
    return RETURN_REASON_CATEGORIES.map((category) => ({
      label: category,
      value: returns.filter((r) => r.reasonCategory === category).length,
      color: REASON_CATEGORY_COLOR[category] ?? '#8A98A3',
    }));
  }, [returns]);

  const statusBreakdown = useMemo(() => {
    const rows = [
      { label: 'Completed', value: completed, color: RETURN_STATUS_COLOR.Completed.color },
      { label: 'Pending', value: pending, color: RETURN_STATUS_COLOR.Pending.color },
      { label: 'Rejected', value: rejected, color: RETURN_STATUS_COLOR.Rejected.color },
    ];
    const max = Math.max(...rows.map((r) => r.value), 1);
    return rows.map((r) => ({ ...r, barPercent: (r.value / max) * 100 }));
  }, [completed, pending, rejected]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const fromTime = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : -Infinity;
    const toTime = dateTo ? new Date(`${dateTo}T23:59:59`).getTime() : Infinity;
    return returns.filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (returnTypeFilter && r.returnType !== returnTypeFilter) return false;
      if (reasonFilter && r.reason !== reasonFilter) return false;
      if (processedByFilter && r.returnedBy !== processedByFilter) return false;
      if (refundTypeFilter && r.refundType !== refundTypeFilter) return false;
      const t = new Date(r.returnDate).getTime();
      if (t < fromTime || t > toTime) return false;
      if (
        q &&
        !r.patientName.toLowerCase().includes(q) &&
        !r.medicationName.toLowerCase().includes(q) &&
        !r.id.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [
    returns,
    search,
    dateFrom,
    dateTo,
    statusFilter,
    returnTypeFilter,
    reasonFilter,
    processedByFilter,
    refundTypeFilter,
  ]);

  const sorted = useMemo(
    () =>
      [...filtered].sort(
        (a, b) => new Date(b.returnDate).getTime() - new Date(a.returnDate).getTime(),
      ),
    [filtered],
  );

  const pageStart = (currentPage - 1) * rowsPerPage;
  const pageRows = sorted.slice(pageStart, pageStart + rowsPerPage);

  function handleClearFilters() {
    setSearch('');
    setDateFrom(watMonthStartInput());
    setDateTo(toWATDateInput());
    setStatusFilter('');
    setReturnTypeFilter('');
    setReasonFilter('');
    setProcessedByFilter('');
    setRefundTypeFilter('');
    setCurrentPage(1);
  }

  function handleApplyFilters() {
    toast.success(
      'Filters applied',
      `${filtered.length} return${filtered.length !== 1 ? 's' : ''} match your filters.`,
    );
  }

  function buildExportRows(rows: MedicationReturn[]): string[][] {
    return [
      [
        'Return ID',
        'Return Date',
        'Patient',
        'MRN',
        'Medication',
        'Qty Returned',
        'Reason',
        'Status',
        'Returned By',
        'Refund/Adjustment',
      ],
      ...rows.map((r) => [
        r.id,
        `${formatHumanDate(r.returnDate)} ${formatTime(r.returnDate)}`,
        r.patientName,
        r.mrn,
        `${r.medicationName} ${r.strength}`,
        String(r.qtyReturned),
        r.reason,
        r.status,
        r.returnedBy,
        r.refundType === 'None' ? '—' : `${formatCurrency(r.refundAmount)} (${r.refundType})`,
      ]),
    ];
  }

  function handleExport() {
    downloadCSV('medication-returns', buildExportRows(sorted));
    toast.success('Export ready', `${sorted.length} returns downloaded as CSV.`);
  }

  function handlePrintList() {
    setActionsMenuOpen(false);
    const rows = buildExportRows(sorted);
    const [header, ...body] = rows;
    const table = `<table><thead><tr>${header!.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead><tbody>${body
      .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`)
      .join('')}</tbody></table>`;
    downloadPDF(
      'Medication Returns',
      `<h1>Medication Returns</h1><p class="meta">${sorted.length} returns</p><hr />${table}`,
    );
  }

  function handleViewReturnSummary() {
    const lines = [
      'Medication Returns — Summary',
      `Generated ${formatHumanDate(new Date().toISOString())} ${formatTime(new Date().toISOString())}`,
      '',
      `Total Returns: ${total}`,
      `Returns This Month: ${thisMonthCount}`,
      `Pending Processing: ${pending}`,
      `Completed: ${completed}`,
      `Rejected: ${rejected}`,
      `Total Value Returned: ${formatCurrency(totalValueReturned)}`,
      '',
      'Returns by Reason:',
      ...reasonBreakdown.map(
        (r) =>
          `  ${r.label}: ${r.value} (${total > 0 ? ((r.value / total) * 100).toFixed(1) : 0}%)`,
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'return-summary.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Summary generated', 'Return summary downloaded.');
  }

  function handleGenerateReturnReport() {
    handlePrintList();
  }

  function handleCreateReturn(input: CreateReturnInput) {
    const id = createReturn(input, 'Pharm. Adaeze');
    setModal(null);
    toast.success('Return recorded', `${id} has been logged and is pending processing.`);
  }

  function handleComplete(id: string) {
    completeReturn(id);
    setModal(null);
    toast.success('Return completed', `${id} has been restocked into inventory.`);
  }

  function handleReject(id: string, reason: string) {
    rejectReturn(id, reason);
    setModal(null);
    toast.info('Return rejected', `${id} has been rejected.`);
  }

  return (
    <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
      <div className="mx-auto max-w-[1440px] px-4 py-4 sm:px-6 sm:py-5">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => router.push(ROUTES.pharmacy)}
            className={`transition-colors duration-150 hover:text-[#00B4D8] ${FOCUS_RING}`}
            style={{ fontSize: 14, color: '#8A98A3' }}
          >
            Home
          </button>
          <span style={{ fontSize: 14, color: '#8A98A3' }}>/</span>
          <span style={{ fontSize: 14, color: '#8A98A3' }}>Operations</span>
          <span style={{ fontSize: 14, color: '#8A98A3' }}>/</span>
          <span className="font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
            Medication Returns
          </span>
        </nav>

        {/* Header */}
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1
              className="font-display font-semibold"
              style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
            >
              Medication Returns
            </h1>
            <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
              Manage returned medications and update inventory accurately.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleExport}
              className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
              style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
            >
              <Download style={{ width: 15, height: 15 }} />
              Export Report
            </button>
            <PermissionGate permission={PERMISSIONS.PHARMACY_DISPENSE}>
              <button
                type="button"
                onClick={() => setModal({ type: 'new' })}
                className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                style={{ fontSize: 14, background: '#0F766E' }}
              >
                <Plus style={{ width: 15, height: 15 }} />
                New Return
              </button>
            </PermissionGate>
          </div>
        </div>

        {/* Stat cards */}
        <div className="mt-5 grid grid-cols-2 gap-3.5 sm:grid-cols-3 xl:grid-cols-6 xl:gap-4">
          <StatCard
            icon={FileText}
            label="Total Returns"
            value={total}
            info="All time"
            accent="#2563EB"
            iconBg="rgba(37,99,235,0.1)"
            onClick={handleClearFilters}
          />
          <StatCard
            icon={ShoppingCart}
            label="Returns This Month"
            value={thisMonthCount}
            info={`${trendPercent >= 0 ? '+' : ''}${trendPercent}% vs last month`}
            accent="#16A34A"
            iconBg="rgba(22,163,74,0.1)"
            onClick={() => {
              setDateFrom(watMonthStartInput());
              setDateTo(toWATDateInput());
              setCurrentPage(1);
            }}
          />
          <StatCard
            icon={Clock}
            label="Pending Processing"
            value={pending}
            info="Awaiting review"
            accent="#D97706"
            iconBg="rgba(217,119,6,0.1)"
            onClick={() => {
              setStatusFilter('Pending');
              setCurrentPage(1);
            }}
          />
          <StatCard
            icon={CheckCircle2}
            label="Completed"
            value={completed}
            info={`${total > 0 ? ((completed / total) * 100).toFixed(1) : 0}% of total`}
            accent="#7C3AED"
            iconBg="rgba(124,58,237,0.1)"
            onClick={() => {
              setStatusFilter('Completed');
              setCurrentPage(1);
            }}
          />
          <StatCard
            icon={XCircle}
            label="Rejected"
            value={rejected}
            info={`${total > 0 ? ((rejected / total) * 100).toFixed(1) : 0}% of total`}
            accent="#DC2626"
            iconBg="rgba(220,38,38,0.1)"
            onClick={() => {
              setStatusFilter('Rejected');
              setCurrentPage(1);
            }}
          />
          <StatCard
            icon={Coins}
            label="Total Value Returned"
            value={formatCurrencyCompact(totalValueReturned)}
            info="All time"
            accent="#2563EB"
            iconBg="rgba(37,99,235,0.1)"
          />
        </div>

        <div className="mt-5 flex flex-col gap-4 xl:flex-row xl:items-start">
          {/* Main column */}
          <div className="min-w-0 flex-1">
            <div
              className="rounded-[12px] p-4 sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              {/* Filters */}
              <div className="flex items-center justify-between gap-3">
                <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                  Filters
                </p>
                <button
                  type="button"
                  onClick={() => setMoreFiltersOpen((v) => !v)}
                  className={`flex shrink-0 items-center gap-1 font-sans font-medium transition-colors duration-150 hover:underline ${FOCUS_RING}`}
                  style={{ fontSize: 14, color: '#00B4D8' }}
                >
                  <Filter style={{ width: 14, height: 14 }} />
                  {moreFiltersOpen ? 'Fewer Filters' : 'More Filters'}
                </button>
              </div>

              <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
                <div>
                  <label
                    htmlFor="ret-search"
                    className="mb-1.5 block font-sans font-medium"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    Search
                  </label>
                  <input
                    id="ret-search"
                    type="search"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Search by patient, medication or return ID..."
                    className={`h-11 w-full rounded-[10px] px-3.5 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                    style={{
                      fontSize: 14,
                      border: '1px solid rgba(0,100,130,0.18)',
                      color: '#0D2630',
                    }}
                  />
                </div>
                <div>
                  <label
                    className="mb-1.5 block font-sans font-medium"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    Return Date Range
                  </label>
                  <button
                    ref={dateButtonRef}
                    type="button"
                    onClick={() => setDateMenuOpen((v) => !v)}
                    className={`flex h-11 w-full items-center gap-2 rounded-[10px] px-3.5 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid rgba(0,100,130,0.18)',
                      color: '#0D2630',
                      fontSize: 14,
                    }}
                  >
                    <Tooltip
                      content={`${formatHumanDate(`${dateFrom}T00:00:00`)} — ${formatHumanDate(`${dateTo}T00:00:00`)}`}
                    >
                      <span className="truncate">
                        {formatHumanDate(`${dateFrom}T00:00:00`)} —{' '}
                        {formatHumanDate(`${dateTo}T00:00:00`)}
                      </span>
                    </Tooltip>
                  </button>
                  <RowMenuPortal
                    open={dateMenuOpen}
                    anchorRef={dateButtonRef}
                    onClose={() => setDateMenuOpen(false)}
                    width={280}
                  >
                    <div className="px-4 py-3.5">
                      <p
                        className="font-sans font-semibold"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        Return date range
                      </p>
                      <div className="mt-3 flex flex-col gap-2.5">
                        <div>
                          <label
                            className="font-sans font-medium"
                            style={{ fontSize: 14, color: '#4A7080' }}
                          >
                            From
                          </label>
                          <FormDateInput
                            value={dateFrom}
                            max={dateTo}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="mt-1 h-10 w-full"
                          />
                        </div>
                        <div>
                          <label
                            className="font-sans font-medium"
                            style={{ fontSize: 14, color: '#4A7080' }}
                          >
                            To
                          </label>
                          <FormDateInput
                            value={dateTo}
                            min={dateFrom}
                            max={toWATDateInput()}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="mt-1 h-10 w-full"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentPage(1);
                          setDateMenuOpen(false);
                        }}
                        className={`mt-3.5 flex h-9 w-full items-center justify-center rounded-[8px] font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                        style={{ background: '#00B4D8', fontSize: 14 }}
                      >
                        Apply
                      </button>
                    </div>
                  </RowMenuPortal>
                </div>
                <div>
                  <label
                    htmlFor="ret-status-filter"
                    className="mb-1.5 block font-sans font-medium"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    Status
                  </label>
                  <FormSelect
                    id="ret-status-filter"
                    value={statusFilter}
                    onChange={(v) => {
                      setStatusFilter(v);
                      setCurrentPage(1);
                    }}
                    options={RETURN_STATUS_OPTIONS}
                    placeholder="All Statuses"
                  />
                </div>
                <div>
                  <label
                    htmlFor="ret-type-filter"
                    className="mb-1.5 block font-sans font-medium"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    Return Type
                  </label>
                  <FormSelect
                    id="ret-type-filter"
                    value={returnTypeFilter}
                    onChange={(v) => {
                      setReturnTypeFilter(v);
                      setCurrentPage(1);
                    }}
                    options={RETURN_TYPE_OPTIONS}
                    placeholder="All Types"
                  />
                </div>
                <div>
                  <label
                    htmlFor="ret-reason-filter"
                    className="mb-1.5 block font-sans font-medium"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    Reason
                  </label>
                  <FormSelect
                    id="ret-reason-filter"
                    value={reasonFilter}
                    onChange={(v) => {
                      setReasonFilter(v);
                      setCurrentPage(1);
                    }}
                    options={RETURN_REASON_OPTIONS}
                    placeholder="All Reasons"
                  />
                </div>
                <div>
                  <label
                    htmlFor="ret-processed-by-filter"
                    className="mb-1.5 block font-sans font-medium"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    Processed By
                  </label>
                  <FormSelect
                    id="ret-processed-by-filter"
                    value={processedByFilter}
                    onChange={(v) => {
                      setProcessedByFilter(v);
                      setCurrentPage(1);
                    }}
                    options={RETURN_PROCESSED_BY_OPTIONS}
                    placeholder="All Users"
                  />
                </div>
                {moreFiltersOpen && (
                  <div>
                    <label
                      htmlFor="ret-refund-type-filter"
                      className="mb-1.5 block font-sans font-medium"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      Refund Type
                    </label>
                    <FormSelect
                      id="ret-refund-type-filter"
                      value={refundTypeFilter}
                      onChange={(v) => {
                        setRefundTypeFilter(v);
                        setCurrentPage(1);
                      }}
                      options={[
                        { value: 'Refund', label: 'Refund' },
                        { value: 'Credit Note', label: 'Credit Note' },
                        { value: 'None', label: 'None' },
                      ]}
                      placeholder="All Refund Types"
                    />
                  </div>
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className={`flex h-9 items-center gap-1.5 rounded-[8px] px-3 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                  style={{
                    fontSize: 14,
                    color: '#4A7080',
                    border: '1px solid rgba(0,100,130,0.18)',
                  }}
                >
                  Clear Filters
                </button>
                <button
                  type="button"
                  onClick={handleApplyFilters}
                  className={`flex h-9 items-center gap-1.5 rounded-[8px] px-3 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                  style={{ fontSize: 14, background: '#0F766E' }}
                >
                  Apply Filters
                </button>
              </div>

              {/* Table */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <h2
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Returns List ({filtered.length.toLocaleString('en-GB')})
                </h2>
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex h-11 items-center gap-1.5 rounded-[10px] px-3.5 font-sans"
                    style={{
                      fontSize: 14,
                      color: '#4A7080',
                      border: '1px solid rgba(0,100,130,0.18)',
                    }}
                  >
                    Sort by: Return Date (Newest)
                  </div>
                  <div className="relative">
                    <button
                      ref={actionsButtonRef}
                      type="button"
                      onClick={() => setActionsMenuOpen((v) => !v)}
                      className={`flex h-11 shrink-0 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                      style={{
                        fontSize: 14,
                        color: '#0D2630',
                        border: '1px solid rgba(0,100,130,0.2)',
                      }}
                    >
                      Actions
                    </button>
                    <RowMenuPortal
                      open={actionsMenuOpen}
                      anchorRef={actionsButtonRef}
                      onClose={() => setActionsMenuOpen(false)}
                      width={180}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setActionsMenuOpen(false);
                          handleExport();
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD]"
                        style={{ fontSize: 14, color: '#2F3A40' }}
                      >
                        <Download style={{ width: 14, height: 14 }} />
                        Export CSV
                      </button>
                      <button
                        type="button"
                        onClick={handlePrintList}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD]"
                        style={{ fontSize: 14, color: '#2F3A40' }}
                      >
                        <Printer style={{ width: 14, height: 14 }} />
                        Print List
                      </button>
                    </RowMenuPortal>
                  </div>
                </div>
              </div>

              <ScrollableTable minWidth={1480} maxHeight={640} className="mt-3">
                <div
                  className={`flex rounded-t-[8px] ${TABLE_HEADER_STICKY_CLASS}`}
                  style={{
                    background: TABLE_HEADER_BG,
                    borderBottom: '1px solid #E6F8FD',
                  }}
                >
                  <div className="w-28 shrink-0 py-2.5 pr-2 pl-3">
                    <span
                      className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      Return ID
                    </span>
                  </div>
                  <div className="w-28 shrink-0 py-2.5 pr-2">
                    <span
                      className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      Return Date
                    </span>
                  </div>
                  <div className="w-36 shrink-0 py-2.5 pr-2">
                    <span
                      className="font-sans font-bold tracking-wider uppercase"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      Patient
                    </span>
                  </div>
                  <div className="min-w-[160px] flex-1 py-2.5 pr-2">
                    <span
                      className="font-sans font-bold tracking-wider uppercase"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      Medication
                    </span>
                  </div>
                  <div className="w-24 shrink-0 py-2.5 pr-2">
                    <span
                      className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      Qty Returned
                    </span>
                  </div>
                  <div className="w-32 shrink-0 py-2.5 pr-2">
                    <span
                      className="font-sans font-bold tracking-wider uppercase"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      Reason
                    </span>
                  </div>
                  <div className="w-28 shrink-0 py-2.5 pr-2">
                    <span
                      className="font-sans font-bold tracking-wider uppercase"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      Status
                    </span>
                  </div>
                  <div className="w-32 shrink-0 py-2.5 pr-2">
                    <span
                      className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      Returned By
                    </span>
                  </div>
                  <div className="w-32 shrink-0 py-2.5 pr-2 text-right">
                    <span
                      className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      Refund / Adj.
                    </span>
                  </div>
                  <div className="flex w-20 shrink-0 items-center justify-end py-2.5 pr-3">
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
                    <p className="font-sans font-medium" style={{ fontSize: 16, color: '#4A7080' }}>
                      No returns match your filters
                    </p>
                    <button
                      type="button"
                      onClick={handleClearFilters}
                      className={`mt-1 font-sans font-medium transition-colors duration-150 hover:underline ${FOCUS_RING}`}
                      style={{ fontSize: 14, color: '#00B4D8' }}
                    >
                      Clear all filters
                    </button>
                  </div>
                )}

                {pageRows.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center transition-colors duration-100 hover:bg-[#F5FBFD]"
                    style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                  >
                    <div className="w-28 shrink-0 py-3 pr-2 pl-3">
                      <p
                        className="font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {r.id}
                      </p>
                    </div>
                    <div className="w-28 shrink-0 py-3 pr-2">
                      <p style={{ fontSize: 14, color: '#0D2630' }}>
                        {formatHumanDate(r.returnDate)}
                      </p>
                      <p style={{ fontSize: 14, color: '#8A98A3' }}>{formatTime(r.returnDate)}</p>
                    </div>
                    <div className="w-36 shrink-0 py-3 pr-2">
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
                    <div className="min-w-[160px] flex-1 py-3 pr-2">
                      <Tooltip content={`${r.medicationName} ${r.strength}`}>
                        <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                          {r.medicationName} {r.strength}
                        </p>
                      </Tooltip>
                    </div>
                    <div className="w-24 shrink-0 py-3 pr-2">
                      <p style={{ fontSize: 14, color: '#4A7080' }}>
                        {r.qtyReturned} {r.form.toLowerCase()}
                        {r.qtyReturned === 1 ? '' : 's'}
                      </p>
                    </div>
                    <div className="w-32 shrink-0 py-3 pr-2">
                      <Tooltip content={r.reason}>
                        <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                          {r.reason}
                        </p>
                      </Tooltip>
                    </div>
                    <div className="w-28 shrink-0 py-3 pr-2">
                      <StatusBadge status={r.status} />
                    </div>
                    <div className="w-32 shrink-0 py-3 pr-2">
                      <Tooltip content={r.returnedBy}>
                        <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                          {r.returnedBy}
                        </p>
                      </Tooltip>
                    </div>
                    <div className="w-32 shrink-0 py-3 pr-2 text-right">
                      {r.refundType === 'None' ? (
                        <p style={{ fontSize: 14, color: '#8A98A3' }}>—</p>
                      ) : (
                        <>
                          <p
                            className="font-sans font-medium"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {formatCurrency(r.refundAmount)}
                          </p>
                          <p style={{ fontSize: 14, color: '#8A98A3' }}>{r.refundType}</p>
                        </>
                      )}
                    </div>
                    <div className="flex w-20 shrink-0 items-center justify-end gap-1 py-3 pr-3">
                      <button
                        type="button"
                        onClick={() => setModal({ type: 'detail', medicationReturn: r })}
                        aria-label={`View ${r.id}`}
                        className={`flex size-11 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
                      >
                        <Eye style={{ width: 15, height: 15, color: '#4A7080' }} />
                      </button>
                      <RowMenu
                        medicationReturn={r}
                        onView={() => setModal({ type: 'detail', medicationReturn: r })}
                        onComplete={() => handleComplete(r.id)}
                        onRejectShortcut={() => setModal({ type: 'detail', medicationReturn: r })}
                      />
                    </div>
                  </div>
                ))}
              </ScrollableTable>

              <Pagination
                page={currentPage}
                pageSize={rowsPerPage}
                totalItems={filtered.length}
                onPageChange={setCurrentPage}
                onPageSizeChange={(size) => {
                  setRowsPerPage(size);
                  setCurrentPage(1);
                }}
                pageSizeOptions={[8, 10, 25, 50]}
                itemLabel="returns"
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="flex w-full shrink-0 flex-col gap-4 xl:w-[340px]">
            <div
              className="rounded-[12px] p-4"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Returns by Reason
              </h2>
              <div className="mt-3 flex items-center gap-5">
                <AnimatedDonutChart
                  breakdown={reasonBreakdown}
                  total={total}
                  ariaLabel="Returns by reason donut chart"
                />
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  {reasonBreakdown.map((d) => (
                    <div key={d.label} className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <span
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ background: d.color }}
                        />
                        <Tooltip content={d.label}>
                          <span className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                            {d.label}
                          </span>
                        </Tooltip>
                      </div>
                      <span
                        className="shrink-0 font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {d.value} ({total > 0 ? ((d.value / total) * 100).toFixed(1) : 0}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <p className="mt-3" style={{ fontSize: 14, color: '#8A98A3' }}>
                Total {total.toLocaleString('en-GB')}
              </p>
            </div>

            <div
              className="rounded-[12px] p-4"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Returns by Status
              </h2>
              <div className="mt-3 flex flex-col gap-3">
                {statusBreakdown.map((s) => (
                  <div key={s.label}>
                    <div className="flex items-center justify-between gap-2">
                      <span style={{ fontSize: 14, color: '#4A7080' }}>{s.label}</span>
                      <span
                        className="shrink-0 font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {s.value} ({total > 0 ? ((s.value / total) * 100).toFixed(1) : 0}%)
                      </span>
                    </div>
                    <div
                      className="mt-1.5 h-1.5 overflow-hidden rounded-full"
                      style={{ background: 'rgba(0,100,130,0.08)' }}
                    >
                      <div
                        className="h-full rounded-full transition-[width] duration-500"
                        style={{ width: `${s.barPercent}%`, background: s.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-3" style={{ fontSize: 14, color: '#8A98A3' }}>
                Total {total.toLocaleString('en-GB')}
              </p>
            </div>

            <div
              className="rounded-[12px] p-4"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Quick Actions
              </h2>
              <div className="mt-3 flex flex-col gap-1">
                <PermissionGate permission={PERMISSIONS.PHARMACY_DISPENSE}>
                  <button
                    type="button"
                    onClick={() => setModal({ type: 'new' })}
                    className={`flex items-center justify-between gap-2 rounded-[8px] px-2.5 py-2.5 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Plus style={{ width: 16, height: 16, color: '#00B4D8' }} />
                      <span style={{ fontSize: 14, color: '#0D2630' }}>Record New Return</span>
                    </span>
                    <span style={{ fontSize: 14, color: '#00B4D8' }}>→</span>
                  </button>
                </PermissionGate>
                <button
                  type="button"
                  onClick={() => setModal({ type: 'reasons' })}
                  className={`flex items-center justify-between gap-2 rounded-[8px] px-2.5 py-2.5 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                >
                  <span className="flex items-center gap-2.5">
                    <FileText style={{ width: 16, height: 16, color: '#00B4D8' }} />
                    <span style={{ fontSize: 14, color: '#0D2630' }}>
                      Return Reasons Management
                    </span>
                  </span>
                  <span style={{ fontSize: 14, color: '#00B4D8' }}>→</span>
                </button>
                <button
                  type="button"
                  onClick={handleViewReturnSummary}
                  className={`flex items-center justify-between gap-2 rounded-[8px] px-2.5 py-2.5 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                >
                  <span className="flex items-center gap-2.5">
                    <FileBarChart style={{ width: 16, height: 16, color: '#00B4D8' }} />
                    <span style={{ fontSize: 14, color: '#0D2630' }}>View Return Summary</span>
                  </span>
                  <span style={{ fontSize: 14, color: '#00B4D8' }}>→</span>
                </button>
                <button
                  type="button"
                  onClick={handleGenerateReturnReport}
                  className={`flex items-center justify-between gap-2 rounded-[8px] px-2.5 py-2.5 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                >
                  <span className="flex items-center gap-2.5">
                    <Download style={{ width: 16, height: 16, color: '#00B4D8' }} />
                    <span style={{ fontSize: 14, color: '#0D2630' }}>Generate Return Report</span>
                  </span>
                  <span style={{ fontSize: 14, color: '#00B4D8' }}>→</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModal({ type: 'policy' })}
                  className={`flex items-center justify-between gap-2 rounded-[8px] px-2.5 py-2.5 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                >
                  <span className="flex items-center gap-2.5">
                    <FileText style={{ width: 16, height: 16, color: '#00B4D8' }} />
                    <span style={{ fontSize: 14, color: '#0D2630' }}>
                      Return Policy &amp; Guidelines
                    </span>
                  </span>
                  <span style={{ fontSize: 14, color: '#00B4D8' }}>→</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info banner */}
        <div
          className="mt-5 flex items-start gap-2.5 rounded-[12px] p-4"
          style={{ background: 'rgba(0,180,216,0.06)', border: '1px solid rgba(0,180,216,0.25)' }}
        >
          <p style={{ fontSize: 14, color: '#0D2630' }}>
            Ensure all returns are verified, documented, and processed in accordance with hospital
            policy and regulatory guidelines.
          </p>
        </div>

        <div className="h-4" />
      </div>

      {modal?.type === 'new' && (
        <NewReturnModal onSubmit={handleCreateReturn} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'detail' && (
        <ReturnDetailModal
          medicationReturn={
            returns.find((r) => r.id === modal.medicationReturn.id) ?? modal.medicationReturn
          }
          onComplete={handleComplete}
          onReject={handleReject}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'reasons' && (
        <ReturnReasonsModal returns={returns} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'policy' && <ReturnPolicyModal onClose={() => setModal(null)} />}
    </main>
  );
}
