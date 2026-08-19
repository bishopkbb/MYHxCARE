'use client';

import {
  AlertCircle,
  CheckCircle2,
  Download,
  Eye,
  MoreVertical,
  Plus,
  Repeat,
  ScrollText,
  X,
  XCircle,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';

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
  ADJUSTMENT_TYPES,
  buildAllAdjustments,
  buildAllRefunds,
  type AdjustmentType,
  type AdjustmentWithAccount,
  type RefundStatus,
  type RefundWithAccount,
} from '@/features/billing/__mocks__/billingAccountDetailFixtures';

const ProcessRefundModal = dynamic(
  () => import('./ProcessRefundModal').then((m) => m.ProcessRefundModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);
const AddAdjustmentModal = dynamic(
  () => import('./AddAdjustmentModal').then((m) => m.AddAdjustmentModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';
const ROWS_PER_PAGE = 10;

const REFUND_STATUS_CFG: Record<RefundStatus, { color: string; bg: string }> = {
  Pending: { color: '#D97706', bg: 'rgba(217,119,6,0.1)' },
  Approved: { color: '#2563EB', bg: 'rgba(37,99,235,0.1)' },
  Processed: { color: '#16A34A', bg: 'rgba(22,163,74,0.1)' },
  Rejected: { color: '#DC2626', bg: 'rgba(220,38,38,0.1)' },
};

const ADJUSTMENT_TYPE_CFG: Record<AdjustmentType, { color: string; bg: string }> = {
  Discount: { color: '#2563EB', bg: 'rgba(37,99,235,0.1)' },
  'Write-off': { color: '#DC2626', bg: 'rgba(220,38,38,0.1)' },
  Correction: { color: '#7C3AED', bg: 'rgba(124,58,237,0.1)' },
};

type MainTab = 'Refunds' | 'Adjustments';

function readMrnFromUrl(): string {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get('mrn') ?? '';
}

function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

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

function TimelineStep({
  label,
  at,
  note,
  done,
  color,
  isLast,
}: {
  label: string;
  at?: string | undefined;
  note: string;
  done: boolean;
  color: string;
  isLast: boolean;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div
          className="flex size-4 shrink-0 items-center justify-center rounded-full"
          style={{
            background: done ? color : '#FFFFFF',
            border: `2px solid ${done ? color : '#C9D6DB'}`,
          }}
        />
        {!isLast && <div className="w-px flex-1" style={{ background: '#E2EDF1' }} />}
      </div>
      <div className="pb-4">
        <p
          className="font-sans font-medium"
          style={{ fontSize: 14, color: done ? color : '#8A98A3' }}
        >
          {label}
        </p>
        <p style={{ fontSize: 14, color: '#8A98A3' }}>
          {at ? `${formatHumanDate(at)}, ${formatTime(at)}` : '—'}
        </p>
        <p style={{ fontSize: 14, color: '#4A7080' }}>{note}</p>
      </div>
    </div>
  );
}

export function RefundsAdjustmentsWorkspace() {
  const router = useRouter();
  const toast = useToast();
  const [refunds, setRefunds] = useState<RefundWithAccount[]>(() => buildAllRefunds());
  const [adjustments, setAdjustments] = useState<AdjustmentWithAccount[]>(() =>
    buildAllAdjustments(),
  );

  const [activeTab, setActiveTab] = useState<MainTab>('Refunds');
  const [search, setSearch] = useState(readMrnFromUrl);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRefundId, setSelectedRefundId] = useState<string | null>(null);
  const [selectedAdjustmentId, setSelectedAdjustmentId] = useState<string | null>(null);
  const [openRowMenuId, setOpenRowMenuId] = useState<string | null>(null);
  const [processRefundOpen, setProcessRefundOpen] = useState(false);
  const [addAdjustmentOpen, setAddAdjustmentOpen] = useState(false);

  const departmentOptions = useMemo(
    () => BILLING_ACCOUNT_DEPARTMENTS.map((d) => ({ value: d, label: d })),
    [],
  );

  function switchTab(tab: MainTab) {
    setActiveTab(tab);
    setCurrentPage(1);
    setSelectedRefundId(null);
    setSelectedAdjustmentId(null);
  }

  const filteredRefunds = useMemo(() => {
    const q = search.trim().toLowerCase();
    return refunds.filter((r) => {
      if (departmentFilter && r.department !== departmentFilter) return false;
      if (statusFilter && r.status !== statusFilter) return false;
      if (fromDate && new Date(r.date).getTime() < new Date(fromDate).getTime()) return false;
      if (toDate && new Date(r.date).getTime() > new Date(toDate).getTime() + 86_400_000 - 1)
        return false;
      if (
        q &&
        !r.refundNumber.toLowerCase().includes(q) &&
        !r.invoiceNumber.toLowerCase().includes(q) &&
        !r.patientName.toLowerCase().includes(q) &&
        !r.mrn.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [refunds, search, departmentFilter, statusFilter, fromDate, toDate]);

  const filteredAdjustments = useMemo(() => {
    const q = search.trim().toLowerCase();
    return adjustments.filter((a) => {
      if (departmentFilter && a.department !== departmentFilter) return false;
      if (typeFilter && a.type !== typeFilter) return false;
      if (fromDate && new Date(a.date).getTime() < new Date(fromDate).getTime()) return false;
      if (toDate && new Date(a.date).getTime() > new Date(toDate).getTime() + 86_400_000 - 1)
        return false;
      if (
        q &&
        !a.adjustmentNumber.toLowerCase().includes(q) &&
        !a.invoiceNumber.toLowerCase().includes(q) &&
        !a.patientName.toLowerCase().includes(q) &&
        !a.mrn.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [adjustments, search, departmentFilter, typeFilter, fromDate, toDate]);

  const filteredCount =
    activeTab === 'Refunds' ? filteredRefunds.length : filteredAdjustments.length;
  const totalPages = Math.max(1, Math.ceil(filteredCount / ROWS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * ROWS_PER_PAGE;
  const pageRefunds = filteredRefunds.slice(pageStart, pageStart + ROWS_PER_PAGE);
  const pageAdjustments = filteredAdjustments.slice(pageStart, pageStart + ROWS_PER_PAGE);

  const selectedRefund = selectedRefundId
    ? refunds.find((r) => r.id === selectedRefundId)
    : undefined;
  const selectedAdjustment = selectedAdjustmentId
    ? adjustments.find((a) => a.id === selectedAdjustmentId)
    : undefined;

  const pendingRefunds = refunds.filter((r) => r.status === 'Pending');
  const approvedRefunds = refunds.filter((r) => r.status === 'Approved');
  const processedRefunds = refunds.filter((r) => r.status === 'Processed');
  const rejectedRefunds = refunds.filter((r) => r.status === 'Rejected');
  const sum = (list: RefundWithAccount[]) => list.reduce((s, r) => s + r.amount, 0);

  function clearFilters() {
    setSearch('');
    setDepartmentFilter('');
    setStatusFilter('');
    setTypeFilter('');
    setFromDate('');
    setToDate('');
    setCurrentPage(1);
  }

  function goToInvoice(mrn: string) {
    router.push(`${ROUTES.billingInvoices}?mrn=${encodeURIComponent(mrn)}`);
  }

  function handleExport() {
    if (activeTab === 'Refunds') {
      downloadCSV('refunds', [
        [
          'Refund ID',
          'Patient',
          'MRN',
          'Invoice No',
          'Department',
          'Amount',
          'Reason',
          'Status',
          'Requested On',
        ],
        ...filteredRefunds.map((r) => [
          r.refundNumber,
          r.patientName,
          r.mrn,
          r.invoiceNumber,
          r.department,
          String(r.amount),
          r.reason,
          r.status,
          `${formatHumanDate(r.date)} ${formatTime(r.date)}`,
        ]),
      ]);
      toast.success(
        'Export ready',
        `${filteredRefunds.length} refund${filteredRefunds.length !== 1 ? 's' : ''} exported as CSV.`,
      );
    } else {
      downloadCSV('adjustments', [
        [
          'Adjustment ID',
          'Patient',
          'MRN',
          'Invoice No',
          'Department',
          'Type',
          'Amount',
          'Reason',
          'Date',
        ],
        ...filteredAdjustments.map((a) => [
          a.adjustmentNumber,
          a.patientName,
          a.mrn,
          a.invoiceNumber,
          a.department,
          a.type,
          String(a.amount),
          a.reason,
          `${formatHumanDate(a.date)} ${formatTime(a.date)}`,
        ]),
      ]);
      toast.success(
        'Export ready',
        `${filteredAdjustments.length} adjustment${filteredAdjustments.length !== 1 ? 's' : ''} exported as CSV.`,
      );
    }
  }

  function handleCreateRefund(refund: RefundWithAccount) {
    setRefunds((prev) => [refund, ...prev]);
    setProcessRefundOpen(false);
    setCurrentPage(1);
    toast.success(
      'Refund request submitted',
      `${formatCurrencyWhole(refund.amount)} refund requested for ${refund.patientName}.`,
    );
  }

  function handleCreateAdjustment(adjustment: AdjustmentWithAccount) {
    setAdjustments((prev) => [adjustment, ...prev]);
    setAddAdjustmentOpen(false);
    setCurrentPage(1);
    toast.success(
      'Adjustment added',
      `${adjustment.type} of ${formatCurrencyWhole(adjustment.amount)} added for ${adjustment.patientName}.`,
    );
  }

  function handleApprove(id: string) {
    const now = new Date().toISOString();
    setRefunds((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, status: 'Approved', approvedAt: now, approvedBy: 'Finance Manager' }
          : r,
      ),
    );
    toast.success('Refund approved', 'The refund has been approved and is awaiting processing.');
  }

  function handleReject(id: string) {
    const now = new Date().toISOString();
    setRefunds((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, status: 'Rejected', rejectedAt: now, rejectedReason: 'Rejected by reviewer' }
          : r,
      ),
    );
    toast.success('Refund rejected', 'The refund request has been rejected.');
  }

  function handleMarkProcessed(id: string) {
    const now = new Date().toISOString();
    setRefunds((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'Processed', processedAt: now } : r)),
    );
    toast.success('Refund processed', 'The refund has been marked as processed.');
  }

  function handleDownloadRefund(r: RefundWithAccount) {
    downloadPDF(
      r.refundNumber,
      `
      <h1>${escapeHtml(r.refundNumber)}</h1>
      <p class="meta">${escapeHtml(r.patientName)} · ${escapeHtml(r.mrn)} · ${escapeHtml(r.department)}</p>
      <hr>
      <p>Invoice ${escapeHtml(r.invoiceNumber)} · Reason: ${escapeHtml(r.reason)}</p>
      <p>Requested ${escapeHtml(formatHumanDate(r.date))}, ${escapeHtml(formatTime(r.date))} by ${escapeHtml(r.requestedBy)}</p>
      <table><thead><tr><th>Amount</th><th>Status</th></tr></thead><tbody>
      <tr><td>${escapeHtml(formatCurrencyWhole(r.amount))}</td><td>${escapeHtml(r.status)}</td></tr>
      </tbody></table>
    `,
    );
    toast.success('Request downloaded', `${r.refundNumber} is ready to print.`);
  }

  function handleDownloadAdjustment(a: AdjustmentWithAccount) {
    downloadPDF(
      a.adjustmentNumber,
      `
      <h1>${escapeHtml(a.adjustmentNumber)}</h1>
      <p class="meta">${escapeHtml(a.patientName)} · ${escapeHtml(a.mrn)} · ${escapeHtml(a.department)}</p>
      <hr>
      <p>Invoice ${escapeHtml(a.invoiceNumber)} · Reason: ${escapeHtml(a.reason)}</p>
      <p>${escapeHtml(formatHumanDate(a.date))}, ${escapeHtml(formatTime(a.date))}</p>
      <table><thead><tr><th>Type</th><th>Amount</th></tr></thead><tbody>
      <tr><td>${escapeHtml(a.type)}</td><td>${escapeHtml(formatCurrencyWhole(a.amount))}</td></tr>
      </tbody></table>
    `,
    );
    toast.success('Request downloaded', `${a.adjustmentNumber} is ready to print.`);
  }

  const timelineSteps = selectedRefund
    ? selectedRefund.status === 'Rejected'
      ? [
          {
            label: 'Pending',
            at: selectedRefund.date,
            note: 'Awaiting approval',
            done: true,
            color: '#D97706',
          },
          {
            label: 'Rejected',
            at: selectedRefund.rejectedAt,
            note: selectedRefund.rejectedReason ?? 'Request rejected',
            done: true,
            color: '#DC2626',
          },
        ]
      : [
          {
            label: 'Pending',
            at: selectedRefund.date,
            note: 'Awaiting approval',
            done: true,
            color: '#D97706',
          },
          {
            label: 'Approved',
            at: selectedRefund.approvedAt,
            note: selectedRefund.approvedAt
              ? `Approved by ${selectedRefund.approvedBy}`
              : 'Awaiting approval',
            done: !!selectedRefund.approvedAt,
            color: '#16A34A',
          },
          {
            label: 'Processed',
            at: selectedRefund.processedAt,
            note: selectedRefund.processedAt ? 'Refund completed' : 'Awaiting processing',
            done: !!selectedRefund.processedAt,
            color: '#2563EB',
          },
        ]
    : [];

  return (
    <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
      <div className="mx-auto max-w-[1550px] px-4 py-4 sm:px-6 sm:py-5">
        {/* Header */}
        <div>
          <h1 className="font-display font-bold" style={{ fontSize: 24, color: '#0D2630' }}>
            Refunds &amp; Adjustments
          </h1>
          <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
            Manage refunds and financial adjustments
          </p>
        </div>

        {/* Stat cards */}
        <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4 xl:gap-4">
          {[
            {
              icon: Repeat,
              label: 'Pending Refunds',
              value: formatCurrencyWhole(sum(pendingRefunds)),
              caption: `${pendingRefunds.length} refund${pendingRefunds.length !== 1 ? 's' : ''} pending approval`,
              accent: '#D97706',
            },
            {
              icon: CheckCircle2,
              label: 'Approved Refunds',
              value: formatCurrencyWhole(sum(approvedRefunds)),
              caption: `${approvedRefunds.length} refund${approvedRefunds.length !== 1 ? 's' : ''} approved`,
              accent: '#16A34A',
            },
            {
              icon: Repeat,
              label: 'Processed Refunds',
              value: formatCurrencyWhole(sum(processedRefunds)),
              caption: `${processedRefunds.length} refund${processedRefunds.length !== 1 ? 's' : ''} processed`,
              accent: '#2563EB',
            },
            {
              icon: AlertCircle,
              label: 'Rejected Refunds',
              value: formatCurrencyWhole(sum(rejectedRefunds)),
              caption: `${rejectedRefunds.length} refund${rejectedRefunds.length !== 1 ? 's' : ''} rejected`,
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
          <div
            className={`min-w-0 flex-1 ${selectedRefund || selectedAdjustment ? 'hidden 2xl:block' : 'block'}`}
          >
            <div
              className="rounded-[12px] p-4 sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              {/* Tabs + actions */}
              <div
                className="flex flex-wrap items-center justify-between gap-2 border-b"
                style={{ borderColor: 'rgba(0,100,130,0.12)' }}
              >
                <div className="flex items-center gap-1">
                  {(['Refunds', 'Adjustments'] as MainTab[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => switchTab(t)}
                      className={`px-3 py-2.5 font-sans font-medium transition-colors duration-150 ${FOCUS_RING}`}
                      style={{
                        fontSize: 14,
                        color: activeTab === t ? '#00B4D8' : '#4A7080',
                        borderBottom:
                          activeTab === t ? '2px solid #00B4D8' : '2px solid transparent',
                      }}
                    >
                      {t}
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
                      onClick={() =>
                        activeTab === 'Refunds'
                          ? setProcessRefundOpen(true)
                          : setAddAdjustmentOpen(true)
                      }
                      className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                      style={{ fontSize: 14, background: '#00B4D8' }}
                    >
                      <Plus style={{ width: 15, height: 15 }} />
                      {activeTab === 'Refunds' ? 'Process Refund' : 'Add Adjustment'}
                    </button>
                  </PermissionGate>
                </div>
              </div>

              {/* Filters */}
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="relative sm:col-span-2 lg:col-span-1">
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Search by invoice, patient or reference…"
                    className="h-11 w-full rounded-[10px] px-3.5 font-sans transition-colors duration-150 placeholder:text-[#8A98A3] focus:border-[#00B4D8] focus:ring-2 focus:ring-[#00B4D8]/40 focus:outline-none"
                    style={{
                      fontSize: 14,
                      color: '#0D2630',
                      border: '1px solid rgba(0,100,130,0.18)',
                    }}
                  />
                </div>
                {activeTab === 'Refunds' ? (
                  <FormSelect
                    id="refund-status"
                    value={statusFilter}
                    onChange={(v) => {
                      setStatusFilter(v);
                      setCurrentPage(1);
                    }}
                    options={[
                      { value: 'Pending', label: 'Pending' },
                      { value: 'Approved', label: 'Approved' },
                      { value: 'Processed', label: 'Processed' },
                      { value: 'Rejected', label: 'Rejected' },
                    ]}
                    placeholder="All Statuses"
                  />
                ) : (
                  <FormSelect
                    id="adjustment-type"
                    value={typeFilter}
                    onChange={(v) => {
                      setTypeFilter(v);
                      setCurrentPage(1);
                    }}
                    options={ADJUSTMENT_TYPES.map((t) => ({ value: t, label: t }))}
                    placeholder="All Types"
                  />
                )}
                <FormSelect
                  id="refund-department"
                  value={departmentFilter}
                  onChange={(v) => {
                    setDepartmentFilter(v);
                    setCurrentPage(1);
                  }}
                  options={departmentOptions}
                  placeholder="All Departments"
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
              </div>

              {(search || departmentFilter || statusFilter || typeFilter || fromDate || toDate) && (
                <div className="mt-2.5">
                  <button
                    type="button"
                    onClick={clearFilters}
                    className={`font-sans font-medium transition-colors duration-150 hover:underline ${FOCUS_RING}`}
                    style={{ fontSize: 14, color: '#00B4D8' }}
                  >
                    Clear all filters
                  </button>
                </div>
              )}

              {/* Refunds table */}
              {activeTab === 'Refunds' && (
                <div className="mt-4">
                  <ScrollableTable minWidth={1060} maxHeight={640}>
                    <div
                      className={`flex rounded-t-[8px] ${TABLE_HEADER_STICKY_CLASS}`}
                      style={{ background: TABLE_HEADER_BG, borderBottom: '1px solid #E6F8FD' }}
                    >
                      <div className="w-36 shrink-0 py-2.5 pr-2 pl-3">
                        <span
                          className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Refund ID
                        </span>
                      </div>
                      <div className="max-w-[200px] min-w-[130px] flex-1 py-2.5 pr-2">
                        <span
                          className="font-sans font-bold tracking-wider uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Patient
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
                          className="font-sans font-bold tracking-wider uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Department
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
                      <div className="w-28 shrink-0 py-2.5 pr-2">
                        <span
                          className="font-sans font-bold tracking-wider uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Reason
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
                      <div className="w-36 shrink-0 py-2.5 pr-2 text-center">
                        <span
                          className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Requested On
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

                    {pageRefunds.length === 0 && (
                      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                        <div
                          className="flex size-14 items-center justify-center rounded-full"
                          style={{ background: 'rgba(226,237,241,0.6)' }}
                        >
                          <Repeat style={{ width: 24, height: 24, color: '#8A98A3' }} />
                        </div>
                        <p
                          className="font-sans font-medium"
                          style={{ fontSize: 16, color: '#4A7080' }}
                        >
                          No refunds match your filters
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

                    {pageRefunds.map((r) => {
                      const cfg = REFUND_STATUS_CFG[r.status];
                      const actions = [
                        {
                          label: 'View Details',
                          icon: Eye,
                          onClick: () => {
                            setOpenRowMenuId(null);
                            setSelectedRefundId(r.id);
                          },
                        },
                        {
                          label: 'View Invoice',
                          icon: ScrollText,
                          onClick: () => {
                            setOpenRowMenuId(null);
                            goToInvoice(r.mrn);
                          },
                        },
                        {
                          label: 'Download Request',
                          icon: Download,
                          onClick: () => {
                            setOpenRowMenuId(null);
                            handleDownloadRefund(r);
                          },
                        },
                        ...(r.status === 'Pending'
                          ? [
                              {
                                label: 'Approve Refund',
                                icon: CheckCircle2,
                                onClick: () => {
                                  setOpenRowMenuId(null);
                                  handleApprove(r.id);
                                },
                              },
                              {
                                label: 'Reject Refund',
                                icon: XCircle,
                                onClick: () => {
                                  setOpenRowMenuId(null);
                                  handleReject(r.id);
                                },
                                danger: true,
                              },
                            ]
                          : []),
                        ...(r.status === 'Approved'
                          ? [
                              {
                                label: 'Mark as Processed',
                                icon: CheckCircle2,
                                onClick: () => {
                                  setOpenRowMenuId(null);
                                  handleMarkProcessed(r.id);
                                },
                              },
                            ]
                          : []),
                      ];
                      return (
                        <div
                          key={r.id}
                          onClick={() => setSelectedRefundId(r.id)}
                          className="flex cursor-pointer items-center transition-colors duration-100 hover:bg-[#F5FBFD]"
                          style={{
                            borderBottom: '1px solid rgba(0,100,130,0.08)',
                            background: selectedRefundId === r.id ? '#E6F8FD' : 'transparent',
                          }}
                        >
                          <div className="w-36 shrink-0 py-3 pr-2 pl-3">
                            <p
                              className="font-sans font-medium whitespace-nowrap"
                              style={{ fontSize: 14, color: '#00B4D8' }}
                            >
                              {r.refundNumber}
                            </p>
                          </div>
                          <div className="max-w-[200px] min-w-[130px] flex-1 py-3 pr-2">
                            <Tooltip content={r.patientName}>
                              <p
                                className="truncate font-sans font-medium"
                                style={{ fontSize: 14, color: '#0D2630' }}
                              >
                                {r.patientName}
                              </p>
                            </Tooltip>
                          </div>
                          <div className="w-28 shrink-0 py-3 pr-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                goToInvoice(r.mrn);
                              }}
                              className={`font-sans font-medium hover:underline ${FOCUS_RING}`}
                              style={{ fontSize: 14, color: '#00B4D8' }}
                            >
                              {r.invoiceNumber}
                            </button>
                          </div>
                          <div className="w-28 shrink-0 py-3 pr-2">
                            <Tooltip content={r.department}>
                              <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                                {r.department}
                              </p>
                            </Tooltip>
                          </div>
                          <div className="w-24 shrink-0 py-3 pr-2 text-center">
                            <p
                              className="font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {formatCurrencyWhole(r.amount)}
                            </p>
                          </div>
                          <div className="w-28 shrink-0 py-3 pr-2">
                            <Tooltip content={r.reason}>
                              <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                                {r.reason}
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
                          <div className="w-36 shrink-0 py-3 pr-2 text-center">
                            <p style={{ fontSize: 14, color: '#4A7080' }}>
                              {formatHumanDate(r.date)}
                            </p>
                            <p style={{ fontSize: 14, color: '#8A98A3' }}>{formatTime(r.date)}</p>
                          </div>
                          <div
                            className="flex w-20 shrink-0 items-center justify-end gap-1 py-3 pr-3"
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
              )}

              {/* Adjustments table */}
              {activeTab === 'Adjustments' && (
                <div className="mt-4">
                  <ScrollableTable minWidth={1060} maxHeight={640}>
                    <div
                      className={`flex rounded-t-[8px] ${TABLE_HEADER_STICKY_CLASS}`}
                      style={{ background: TABLE_HEADER_BG, borderBottom: '1px solid #E6F8FD' }}
                    >
                      <div className="w-40 shrink-0 py-2.5 pr-2 pl-3">
                        <span
                          className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Adjustment ID
                        </span>
                      </div>
                      <div className="max-w-[200px] min-w-[130px] flex-1 py-2.5 pr-2">
                        <span
                          className="font-sans font-bold tracking-wider uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Patient
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
                          className="font-sans font-bold tracking-wider uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Department
                        </span>
                      </div>
                      <div className="w-28 shrink-0 py-2.5 pr-2 text-center">
                        <span
                          className="font-sans font-bold tracking-wider uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Type
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
                      <div className="w-28 shrink-0 py-2.5 pr-2">
                        <span
                          className="font-sans font-bold tracking-wider uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Reason
                        </span>
                      </div>
                      <div className="w-32 shrink-0 py-2.5 pr-2">
                        <span
                          className="font-sans font-bold tracking-wider uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Date
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

                    {pageAdjustments.length === 0 && (
                      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                        <div
                          className="flex size-14 items-center justify-center rounded-full"
                          style={{ background: 'rgba(226,237,241,0.6)' }}
                        >
                          <ScrollText style={{ width: 24, height: 24, color: '#8A98A3' }} />
                        </div>
                        <p
                          className="font-sans font-medium"
                          style={{ fontSize: 16, color: '#4A7080' }}
                        >
                          No adjustments match your filters
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

                    {pageAdjustments.map((a) => {
                      const cfg = ADJUSTMENT_TYPE_CFG[a.type];
                      const actions = [
                        {
                          label: 'View Details',
                          icon: Eye,
                          onClick: () => {
                            setOpenRowMenuId(null);
                            setSelectedAdjustmentId(a.id);
                          },
                        },
                        {
                          label: 'View Invoice',
                          icon: ScrollText,
                          onClick: () => {
                            setOpenRowMenuId(null);
                            goToInvoice(a.mrn);
                          },
                        },
                        {
                          label: 'Download Request',
                          icon: Download,
                          onClick: () => {
                            setOpenRowMenuId(null);
                            handleDownloadAdjustment(a);
                          },
                        },
                      ];
                      return (
                        <div
                          key={a.id}
                          onClick={() => setSelectedAdjustmentId(a.id)}
                          className="flex cursor-pointer items-center transition-colors duration-100 hover:bg-[#F5FBFD]"
                          style={{
                            borderBottom: '1px solid rgba(0,100,130,0.08)',
                            background: selectedAdjustmentId === a.id ? '#E6F8FD' : 'transparent',
                          }}
                        >
                          <div className="w-40 shrink-0 py-3 pr-2 pl-3">
                            <p
                              className="font-sans font-medium whitespace-nowrap"
                              style={{ fontSize: 14, color: '#00B4D8' }}
                            >
                              {a.adjustmentNumber}
                            </p>
                          </div>
                          <div className="max-w-[200px] min-w-[130px] flex-1 py-3 pr-2">
                            <Tooltip content={a.patientName}>
                              <p
                                className="truncate font-sans font-medium"
                                style={{ fontSize: 14, color: '#0D2630' }}
                              >
                                {a.patientName}
                              </p>
                            </Tooltip>
                          </div>
                          <div className="w-28 shrink-0 py-3 pr-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                goToInvoice(a.mrn);
                              }}
                              className={`font-sans font-medium hover:underline ${FOCUS_RING}`}
                              style={{ fontSize: 14, color: '#00B4D8' }}
                            >
                              {a.invoiceNumber}
                            </button>
                          </div>
                          <div className="w-28 shrink-0 py-3 pr-2">
                            <Tooltip content={a.department}>
                              <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                                {a.department}
                              </p>
                            </Tooltip>
                          </div>
                          <div className="w-28 shrink-0 py-3 pr-2 text-center">
                            <span
                              className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium whitespace-nowrap"
                              style={{ fontSize: 14, color: cfg.color, background: cfg.bg }}
                            >
                              {a.type}
                            </span>
                          </div>
                          <div className="w-24 shrink-0 py-3 pr-2 text-center">
                            <p
                              className="font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {formatCurrencyWhole(a.amount)}
                            </p>
                          </div>
                          <div className="w-28 shrink-0 py-3 pr-2">
                            <Tooltip content={a.reason}>
                              <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                                {a.reason}
                              </p>
                            </Tooltip>
                          </div>
                          <div className="w-32 shrink-0 py-3 pr-2">
                            <p style={{ fontSize: 14, color: '#4A7080' }}>
                              {formatHumanDate(a.date)}
                            </p>
                            <p style={{ fontSize: 14, color: '#8A98A3' }}>{formatTime(a.date)}</p>
                          </div>
                          <div
                            className="flex w-20 shrink-0 items-center justify-end gap-1 py-3 pr-3"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ActionRowMenu
                              open={openRowMenuId === a.id}
                              onToggle={() =>
                                setOpenRowMenuId((prev) => (prev === a.id ? null : a.id))
                              }
                              actions={actions}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </ScrollableTable>
                </div>
              )}

              {filteredCount > 0 && (
                <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
                  <p style={{ fontSize: 14, color: '#4A7080' }}>
                    Showing {pageStart + 1} to {Math.min(pageStart + ROWS_PER_PAGE, filteredCount)}{' '}
                    of {filteredCount} {activeTab.toLowerCase()}
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

          {/* Detail pane — Refund */}
          {activeTab === 'Refunds' && selectedRefund && (
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
                  Refund Details
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedRefundId(null)}
                  aria-label="Close"
                  className={`flex size-9 shrink-0 items-center justify-center rounded-full transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                >
                  <X style={{ width: 18, height: 18, color: '#4A7080' }} />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto scroll-smooth px-4 pb-4 sm:px-5">
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex size-9 shrink-0 items-center justify-center rounded-full font-sans font-semibold text-white"
                    style={{ background: '#2563EB' }}
                  >
                    {initialsOf(selectedRefund.patientName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate font-sans font-medium"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {selectedRefund.patientName}
                    </p>
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>MRN: {selectedRefund.mrn}</p>
                  </div>
                  <span
                    className="shrink-0 rounded-full px-2.5 py-0.5 font-sans font-medium whitespace-nowrap"
                    style={{
                      fontSize: 14,
                      color: REFUND_STATUS_CFG[selectedRefund.status].color,
                      background: REFUND_STATUS_CFG[selectedRefund.status].bg,
                    }}
                  >
                    {selectedRefund.status}
                  </span>
                </div>

                <p
                  className="font-display mt-4 font-semibold"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  Refund Information
                </p>
                <div
                  className="mt-2 flex flex-col gap-2 rounded-[10px] p-3"
                  style={{ background: '#F5FBFD' }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span style={{ fontSize: 14, color: '#8A98A3' }}>Refund ID</span>
                    <span
                      className="font-sans font-medium"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {selectedRefund.refundNumber}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span style={{ fontSize: 14, color: '#8A98A3' }}>Invoice No.</span>
                    <button
                      type="button"
                      onClick={() => goToInvoice(selectedRefund.mrn)}
                      className={`font-sans font-medium hover:underline ${FOCUS_RING}`}
                      style={{ fontSize: 14, color: '#00B4D8' }}
                    >
                      {selectedRefund.invoiceNumber}
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span style={{ fontSize: 14, color: '#8A98A3' }}>Amount</span>
                    <span
                      className="font-sans font-semibold"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {formatCurrencyWhole(selectedRefund.amount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span style={{ fontSize: 14, color: '#8A98A3' }}>Reason</span>
                    <span
                      className="font-sans font-medium"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {selectedRefund.reason}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span style={{ fontSize: 14, color: '#8A98A3' }}>Requested On</span>
                    <span
                      className="font-sans font-medium"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {formatHumanDate(selectedRefund.date)}, {formatTime(selectedRefund.date)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span style={{ fontSize: 14, color: '#8A98A3' }}>Requested By</span>
                    <span
                      className="font-sans font-medium"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {selectedRefund.requestedBy}
                    </span>
                  </div>
                </div>

                <p
                  className="font-display mt-4 font-semibold"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  Status History
                </p>
                <div className="mt-2">
                  {timelineSteps.map((step, i) => (
                    <TimelineStep
                      key={step.label}
                      {...step}
                      isLast={i === timelineSteps.length - 1}
                    />
                  ))}
                </div>

                <p
                  className="font-display mt-2 font-semibold"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  Quick Actions
                </p>
                <div className="mt-2 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => goToInvoice(selectedRefund.mrn)}
                    className={`flex h-11 items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                    style={{
                      fontSize: 14,
                      color: '#0D2630',
                      border: '1px solid rgba(0,100,130,0.2)',
                    }}
                  >
                    <ScrollText style={{ width: 15, height: 15 }} />
                    View Invoice
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadRefund(selectedRefund)}
                    className={`flex h-11 items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                    style={{
                      fontSize: 14,
                      color: '#0D2630',
                      border: '1px solid rgba(0,100,130,0.2)',
                    }}
                  >
                    <Download style={{ width: 15, height: 15 }} />
                    Download Request
                  </button>
                  {selectedRefund.status === 'Pending' && (
                    <PermissionGate permission={PERMISSIONS.BILLING_WRITE}>
                      <button
                        type="button"
                        onClick={() => handleApprove(selectedRefund.id)}
                        className={`flex h-11 w-full items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                        style={{ fontSize: 14, background: '#00B4D8' }}
                      >
                        <CheckCircle2 style={{ width: 15, height: 15 }} />
                        Approve Refund
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReject(selectedRefund.id)}
                        className={`flex h-11 items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium transition-colors duration-150 hover:bg-[#FDECEC] ${FOCUS_RING}`}
                        style={{
                          fontSize: 14,
                          color: '#DC2626',
                          border: '1px solid rgba(220,38,38,0.3)',
                        }}
                      >
                        <XCircle style={{ width: 15, height: 15 }} />
                        Reject Refund
                      </button>
                    </PermissionGate>
                  )}
                  {selectedRefund.status === 'Approved' && (
                    <PermissionGate permission={PERMISSIONS.BILLING_WRITE}>
                      <button
                        type="button"
                        onClick={() => handleMarkProcessed(selectedRefund.id)}
                        className={`flex h-11 w-full items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                        style={{ fontSize: 14, background: '#00B4D8' }}
                      >
                        <CheckCircle2 style={{ width: 15, height: 15 }} />
                        Mark as Processed
                      </button>
                    </PermissionGate>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Detail pane — Adjustment */}
          {activeTab === 'Adjustments' && selectedAdjustment && (
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
                  Adjustment Details
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedAdjustmentId(null)}
                  aria-label="Close"
                  className={`flex size-9 shrink-0 items-center justify-center rounded-full transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                >
                  <X style={{ width: 18, height: 18, color: '#4A7080' }} />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto scroll-smooth px-4 pb-4 sm:px-5">
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex size-9 shrink-0 items-center justify-center rounded-full font-sans font-semibold text-white"
                    style={{ background: '#7C3AED' }}
                  >
                    {initialsOf(selectedAdjustment.patientName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate font-sans font-medium"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {selectedAdjustment.patientName}
                    </p>
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>MRN: {selectedAdjustment.mrn}</p>
                  </div>
                  <span
                    className="shrink-0 rounded-full px-2.5 py-0.5 font-sans font-medium whitespace-nowrap"
                    style={{
                      fontSize: 14,
                      color: ADJUSTMENT_TYPE_CFG[selectedAdjustment.type].color,
                      background: ADJUSTMENT_TYPE_CFG[selectedAdjustment.type].bg,
                    }}
                  >
                    {selectedAdjustment.type}
                  </span>
                </div>

                <p
                  className="font-display mt-4 font-semibold"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  Adjustment Information
                </p>
                <div
                  className="mt-2 flex flex-col gap-2 rounded-[10px] p-3"
                  style={{ background: '#F5FBFD' }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span style={{ fontSize: 14, color: '#8A98A3' }}>Adjustment ID</span>
                    <span
                      className="font-sans font-medium"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {selectedAdjustment.adjustmentNumber}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span style={{ fontSize: 14, color: '#8A98A3' }}>Invoice No.</span>
                    <button
                      type="button"
                      onClick={() => goToInvoice(selectedAdjustment.mrn)}
                      className={`font-sans font-medium hover:underline ${FOCUS_RING}`}
                      style={{ fontSize: 14, color: '#00B4D8' }}
                    >
                      {selectedAdjustment.invoiceNumber}
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span style={{ fontSize: 14, color: '#8A98A3' }}>Department</span>
                    <span
                      className="font-sans font-medium"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {selectedAdjustment.department}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span style={{ fontSize: 14, color: '#8A98A3' }}>Amount</span>
                    <span
                      className="font-sans font-semibold"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {formatCurrencyWhole(selectedAdjustment.amount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span style={{ fontSize: 14, color: '#8A98A3' }}>Reason</span>
                    <span
                      className="font-sans font-medium"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {selectedAdjustment.reason}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span style={{ fontSize: 14, color: '#8A98A3' }}>Date</span>
                    <span
                      className="font-sans font-medium"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {formatHumanDate(selectedAdjustment.date)},{' '}
                      {formatTime(selectedAdjustment.date)}
                    </span>
                  </div>
                </div>

                <p
                  className="font-display mt-4 font-semibold"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  Quick Actions
                </p>
                <div className="mt-2 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => goToInvoice(selectedAdjustment.mrn)}
                    className={`flex h-11 items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                    style={{
                      fontSize: 14,
                      color: '#0D2630',
                      border: '1px solid rgba(0,100,130,0.2)',
                    }}
                  >
                    <ScrollText style={{ width: 15, height: 15 }} />
                    View Invoice
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadAdjustment(selectedAdjustment)}
                    className={`flex h-11 items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                    style={{
                      fontSize: 14,
                      color: '#0D2630',
                      border: '1px solid rgba(0,100,130,0.2)',
                    }}
                  >
                    <Download style={{ width: 15, height: 15 }} />
                    Download Request
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="h-4" />
      </div>

      {processRefundOpen && (
        <ProcessRefundModal
          defaultMrn={search || undefined}
          onClose={() => setProcessRefundOpen(false)}
          onCreate={handleCreateRefund}
        />
      )}
      {addAdjustmentOpen && (
        <AddAdjustmentModal
          defaultMrn={search || undefined}
          onClose={() => setAddAdjustmentOpen(false)}
          onCreate={handleCreateAdjustment}
        />
      )}
    </main>
  );
}
