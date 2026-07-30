'use client';

import {
  Boxes,
  CheckCircle2,
  Clipboard,
  Clock,
  Eye,
  FileText,
  MoreVertical,
  Plus,
  Search,
  ShoppingCart,
  Truck,
  Users,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';

import { AnimatedDonutChart } from '@components/shared/AnimatedDonutChart';
import { FormSelect } from '@components/shared/FormSelect';
import { ModalLoadingFallback } from '@components/shared/ModalLoadingFallback';
import { Pagination } from '@components/shared/Pagination';
import { RowMenuPortal } from '@components/shared/RowMenuPortal';
import { StatCard } from '@components/shared/StatCard';
import { Tooltip } from '@components/shared/Tooltip';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { formatCurrency } from '@/utils/currency';
import { formatDateTime } from '@/utils/datetime';
import { downloadCSV } from '@/utils/export';
import { REGISTRATION_DATE_OPTIONS } from '@/features/registration/__mocks__/patientDirectoryFixtures';
import {
  getRequestEstAmount,
  getRequestItemCount,
  PROCUREMENT_DEPARTMENT_OPTIONS,
  PROCUREMENT_PRIORITY_OPTIONS,
  PROCUREMENT_STATUS_OPTIONS,
  REQUEST_TYPE_OPTIONS,
  type ProcurementRequest,
  type ProcurementRequestStatus,
} from '@/features/pharmacy/__mocks__/pharmacyFixtures';
import {
  approveRequest,
  createRequest,
  markAsOrdered,
  rejectRequest,
  useProcurementRequests,
} from '@/features/pharmacy/store/procurementRequestStore';
import type { NewRequestInitial } from '@/features/pharmacy/components/NewProcurementRequestModal';

const NewProcurementRequestModal = dynamic(
  () =>
    import('@/features/pharmacy/components/NewProcurementRequestModal').then(
      (m) => m.NewProcurementRequestModal,
    ),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);
const ProcurementRequestDetailModal = dynamic(
  () =>
    import('@/features/pharmacy/components/ProcurementRequestDetailModal').then(
      (m) => m.ProcurementRequestDetailModal,
    ),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);
const RequestTemplatesModal = dynamic(
  () =>
    import('@/features/pharmacy/components/RequestTemplatesModal').then(
      (m) => m.RequestTemplatesModal,
    ),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const STATUS_CFG: Record<ProcurementRequestStatus, { color: string; border: string; bg: string }> =
  {
    'Pending Approval': {
      color: '#D97706',
      border: 'rgba(217,119,6,0.35)',
      bg: 'rgba(217,119,6,0.08)',
    },
    Approved: { color: '#16A34A', border: 'rgba(22,163,74,0.35)', bg: 'rgba(22,163,74,0.08)' },
    Rejected: { color: '#DC2626', border: 'rgba(220,38,38,0.35)', bg: 'rgba(220,38,38,0.08)' },
    Ordered: { color: '#2563EB', border: 'rgba(37,99,235,0.35)', bg: 'rgba(37,99,235,0.08)' },
    'Partially Received': {
      color: '#7C3AED',
      border: 'rgba(124,58,237,0.35)',
      bg: 'rgba(124,58,237,0.08)',
    },
    Completed: { color: '#16A34A', border: 'rgba(22,163,74,0.35)', bg: 'rgba(22,163,74,0.08)' },
  };

const PRIORITY_CFG: Record<string, { color: string; border: string; bg: string }> = {
  High: { color: '#DC2626', border: 'rgba(220,38,38,0.35)', bg: 'rgba(220,38,38,0.08)' },
  Medium: { color: '#D97706', border: 'rgba(217,119,6,0.35)', bg: 'rgba(217,119,6,0.08)' },
  Low: { color: '#16A34A', border: 'rgba(22,163,74,0.35)', bg: 'rgba(22,163,74,0.08)' },
};

const DONUT_STATUSES: ProcurementRequestStatus[] = [
  'Pending Approval',
  'Approved',
  'Ordered',
  'Partially Received',
  'Completed',
  'Rejected',
];

type ModalState =
  | { type: 'new'; initial?: NewRequestInitial }
  | { type: 'detail'; request: ProcurementRequest }
  | { type: 'templates' }
  | null;

function isWithinRange(iso: string, range: string): boolean {
  if (!range) return true;
  const wat = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos' });
  const now = new Date();
  const d = new Date(iso);
  if (range === 'today') return wat.format(d) === wat.format(now);
  if (range === 'this-week') return now.getTime() - d.getTime() < 7 * 24 * 60 * 60 * 1000;
  if (range === 'this-month')
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  if (range === 'this-year') return d.getFullYear() === now.getFullYear();
  return true;
}

function RowMenu({ request, onView }: { request: ProcurementRequest; onView: () => void }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`More actions for ${request.id}`}
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
      </RowMenuPortal>
    </div>
  );
}

export function ProcurementRequestsWorkspace() {
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const actorName = user?.name ?? 'Pharmacist';

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(8);
  const [modal, setModal] = useState<ModalState>(null);

  const allRequests = useProcurementRequests();

  const countByStatus = useMemo(() => {
    const counts = new Map<ProcurementRequestStatus, number>();
    for (const r of allRequests) counts.set(r.status, (counts.get(r.status) ?? 0) + 1);
    return counts;
  }, [allRequests]);

  const totalRequests = allRequests.length;
  const pendingApproval = countByStatus.get('Pending Approval') ?? 0;
  const approved = countByStatus.get('Approved') ?? 0;
  const ordered = countByStatus.get('Ordered') ?? 0;
  const partiallyReceived = countByStatus.get('Partially Received') ?? 0;
  const completed = countByStatus.get('Completed') ?? 0;

  const donutBreakdown = useMemo(
    () =>
      DONUT_STATUSES.map((status) => ({
        label: status,
        value: countByStatus.get(status) ?? 0,
        color: STATUS_CFG[status].color,
      })).filter((d) => d.value > 0),
    [countByStatus],
  );

  const recentRequests = useMemo(
    () =>
      [...allRequests]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5),
    [allRequests],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allRequests.filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (typeFilter && r.requestType !== typeFilter) return false;
      if (priorityFilter && r.priority !== priorityFilter) return false;
      if (departmentFilter && r.department !== departmentFilter) return false;
      if (dateFilter && !isWithinRange(r.createdAt, dateFilter)) return false;
      if (
        q &&
        !r.id.toLowerCase().includes(q) &&
        !r.items.some((i) => i.name.toLowerCase().includes(q)) &&
        !(r.supplier ?? '').toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [allRequests, search, statusFilter, typeFilter, priorityFilter, departmentFilter, dateFilter]);

  const sorted = useMemo(
    () =>
      [...filtered].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [filtered],
  );

  const pageStart = (currentPage - 1) * rowsPerPage;
  const pageRows = sorted.slice(pageStart, pageStart + rowsPerPage);

  function handleClearFilters() {
    setSearch('');
    setStatusFilter('');
    setTypeFilter('');
    setPriorityFilter('');
    setDepartmentFilter('');
    setDateFilter('');
    setCurrentPage(1);
  }

  function handleApplyFilters() {
    toast.success(
      'Filters applied',
      `${filtered.length} request${filtered.length !== 1 ? 's' : ''} match your filters.`,
    );
  }

  function handleExport() {
    const rows = [
      [
        'Request ID',
        'Request Type',
        'Department',
        'Requested By',
        'Priority',
        'Date Created',
        'Items',
        'Est. Amount',
        'Status',
      ],
      ...filtered.map((r) => [
        r.id,
        r.requestType,
        r.department,
        r.requestedBy,
        r.priority,
        formatDateTime(r.createdAt),
        String(getRequestItemCount(r)),
        formatCurrency(getRequestEstAmount(r)),
        r.status,
      ]),
    ];
    downloadCSV('procurement-requests', rows);
    toast.success('Export ready', `${filtered.length} requests downloaded as CSV.`);
  }

  function handleCreate(input: Parameters<typeof createRequest>[0]) {
    const id = createRequest(input, actorName);
    setModal(null);
    toast.success('Request submitted', `${id} is now pending approval.`);
  }

  function handleApprove(id: string) {
    approveRequest(id, actorName);
    setModal(null);
    toast.success('Request approved', `${id} can now be marked as ordered.`);
  }

  function handleReject(id: string, reason: string) {
    rejectRequest(id, reason);
    setModal(null);
    toast.info('Request rejected', `${id} has been rejected.`);
  }

  function handleMarkAsOrdered(id: string, supplier: string) {
    const poNumber = markAsOrdered(id, supplier);
    setModal(null);
    if (poNumber) {
      toast.success('Marked as ordered', `${poNumber} created and sent to Stock Receiving.`);
    }
  }

  function handleViewPurchaseOrder() {
    setModal(null);
    router.push(ROUTES.pharmacyStockReceiving);
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
          <span style={{ fontSize: 14, color: '#8A98A3' }}>Inventory Management</span>
          <span style={{ fontSize: 14, color: '#8A98A3' }}>/</span>
          <span className="font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
            Procurement Requests
          </span>
        </nav>

        {/* Header */}
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1
              className="font-display font-semibold"
              style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
            >
              Procurement Requests
            </h1>
            <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
              Create and manage requests for medication and supplies procurement.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleExport}
              className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
              style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
            >
              Export Report
            </button>
            <button
              type="button"
              onClick={() => setModal({ type: 'new' })}
              className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
              style={{ fontSize: 14, background: '#00B4D8' }}
            >
              <Plus style={{ width: 15, height: 15 }} />
              New Request
            </button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="mt-5 grid grid-cols-2 gap-3.5 sm:grid-cols-3 xl:grid-cols-6 xl:gap-4">
          <StatCard
            icon={Clipboard}
            label="Total Requests"
            value={totalRequests}
            info="All time"
            accent="#0D2630"
            iconBg="rgba(13,38,48,0.08)"
            onClick={() => {
              setStatusFilter('');
              setCurrentPage(1);
            }}
          />
          <StatCard
            icon={Clock}
            label="Pending Approval"
            value={pendingApproval}
            info="Awaiting approval"
            accent="#D97706"
            iconBg="rgba(217,119,6,0.1)"
            onClick={() => {
              setStatusFilter('Pending Approval');
              setCurrentPage(1);
            }}
          />
          <StatCard
            icon={ShoppingCart}
            label="Approved"
            value={approved}
            info="Approved requests"
            accent="#16A34A"
            iconBg="rgba(22,163,74,0.1)"
            onClick={() => {
              setStatusFilter('Approved');
              setCurrentPage(1);
            }}
          />
          <StatCard
            icon={Truck}
            label="Ordered"
            value={ordered}
            info="Sent to suppliers"
            accent="#2563EB"
            iconBg="rgba(37,99,235,0.1)"
            onClick={() => {
              setStatusFilter('Ordered');
              setCurrentPage(1);
            }}
          />
          <StatCard
            icon={Boxes}
            label="Partially Received"
            value={partiallyReceived}
            info="In progress"
            accent="#7C3AED"
            iconBg="rgba(124,58,237,0.1)"
            onClick={() => {
              setStatusFilter('Partially Received');
              setCurrentPage(1);
            }}
          />
          <StatCard
            icon={CheckCircle2}
            label="Completed"
            value={completed}
            info="Fully received"
            accent="#16A34A"
            iconBg="rgba(22,163,74,0.1)"
            onClick={() => {
              setStatusFilter('Completed');
              setCurrentPage(1);
            }}
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
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative min-w-0 flex-1">
                  <Search
                    className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
                    style={{ width: 16, height: 16, color: '#8A98A3' }}
                  />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Search by request ID, item, or supplier..."
                    className={`h-11 w-full rounded-[10px] pr-4 pl-9 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                    style={{
                      fontSize: 14,
                      border: '1px solid rgba(0,100,130,0.18)',
                      color: '#0D2630',
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setMoreFiltersOpen((v) => !v)}
                  className={`shrink-0 font-sans font-medium transition-colors duration-150 hover:underline ${FOCUS_RING}`}
                  style={{ fontSize: 14, color: '#00B4D8' }}
                >
                  {moreFiltersOpen ? 'Fewer Filters' : 'More Filters'}
                </button>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <FormSelect
                  id="pr-status-filter"
                  value={statusFilter}
                  onChange={(v) => {
                    setStatusFilter(v);
                    setCurrentPage(1);
                  }}
                  options={PROCUREMENT_STATUS_OPTIONS}
                  placeholder="All Statuses"
                />
                <FormSelect
                  id="pr-type-filter"
                  value={typeFilter}
                  onChange={(v) => {
                    setTypeFilter(v);
                    setCurrentPage(1);
                  }}
                  options={REQUEST_TYPE_OPTIONS}
                  placeholder="All Types"
                />
                <FormSelect
                  id="pr-priority-filter"
                  value={priorityFilter}
                  onChange={(v) => {
                    setPriorityFilter(v);
                    setCurrentPage(1);
                  }}
                  options={PROCUREMENT_PRIORITY_OPTIONS}
                  placeholder="All Priorities"
                />
                <FormSelect
                  id="pr-department-filter"
                  value={departmentFilter}
                  onChange={(v) => {
                    setDepartmentFilter(v);
                    setCurrentPage(1);
                  }}
                  options={PROCUREMENT_DEPARTMENT_OPTIONS}
                  placeholder="All Departments"
                />
                {moreFiltersOpen && (
                  <FormSelect
                    id="pr-date-filter"
                    value={dateFilter}
                    onChange={(v) => {
                      setDateFilter(v);
                      setCurrentPage(1);
                    }}
                    options={REGISTRATION_DATE_OPTIONS}
                    placeholder="All Dates"
                  />
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
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
                  style={{ fontSize: 14, background: '#00B4D8' }}
                >
                  Apply Filters
                </button>
              </div>

              {/* Table */}
              <div className="mt-4">
                <h2
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Requests List ({filtered.length})
                </h2>
                <div className="mt-3 overflow-x-auto scroll-smooth">
                  <div style={{ minWidth: 1420 }}>
                    <div
                      className="flex rounded-t-[8px]"
                      style={{
                        background: 'rgba(226,237,241,0.4)',
                        borderBottom: '1px solid #E6F8FD',
                      }}
                    >
                      <div className="w-32 shrink-0 py-2.5 pr-2 pl-3">
                        <span
                          className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Request ID
                        </span>
                      </div>
                      <div className="w-36 shrink-0 py-2.5 pr-2">
                        <span
                          className="font-sans font-bold tracking-wider uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Request Type
                        </span>
                      </div>
                      <div className="w-32 shrink-0 py-2.5 pr-2">
                        <span
                          className="font-sans font-bold tracking-wider uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Department
                        </span>
                      </div>
                      <div className="min-w-[150px] flex-1 py-2.5 pr-2">
                        <span
                          className="font-sans font-bold tracking-wider uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Requested By
                        </span>
                      </div>
                      <div className="w-28 shrink-0 py-2.5 pr-2 pl-3">
                        <span
                          className="font-sans font-bold tracking-wider uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Priority
                        </span>
                      </div>
                      <div className="w-32 shrink-0 py-2.5 pr-2">
                        <span
                          className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Date Created
                        </span>
                      </div>
                      <div className="w-20 shrink-0 py-2.5 pr-2 text-right">
                        <span
                          className="font-sans font-bold tracking-wider uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Items
                        </span>
                      </div>
                      <div className="w-36 shrink-0 py-2.5 pr-2 text-right">
                        <span
                          className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Est. Amount
                        </span>
                      </div>
                      <div className="w-44 shrink-0 py-2.5 pr-2 pl-3">
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
                          <Search style={{ width: 24, height: 24, color: '#8A98A3' }} />
                        </div>
                        <p
                          className="font-sans font-medium"
                          style={{ fontSize: 16, color: '#4A7080' }}
                        >
                          No requests match your filters
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

                    {pageRows.map((r) => {
                      const statusCfg = STATUS_CFG[r.status];
                      const priorityCfg = PRIORITY_CFG[r.priority]!;
                      return (
                        <div
                          key={r.id}
                          className="flex items-center transition-colors duration-100 hover:bg-[#F5FBFD]"
                          style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                        >
                          <div className="w-32 shrink-0 py-3 pr-2 pl-3">
                            <Tooltip content={r.id}>
                              <p
                                className="truncate font-sans font-medium"
                                style={{ fontSize: 14, color: '#0D2630' }}
                              >
                                {r.id}
                              </p>
                            </Tooltip>
                          </div>
                          <div className="w-36 shrink-0 py-3 pr-2">
                            <p style={{ fontSize: 14, color: '#4A7080' }}>{r.requestType}</p>
                          </div>
                          <div className="w-32 shrink-0 py-3 pr-2">
                            <Tooltip content={r.department}>
                              <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                                {r.department}
                              </p>
                            </Tooltip>
                          </div>
                          <div className="min-w-[150px] flex-1 py-3 pr-2">
                            <Tooltip content={r.requestedBy}>
                              <p className="truncate" style={{ fontSize: 14, color: '#0D2630' }}>
                                {r.requestedBy}
                              </p>
                            </Tooltip>
                          </div>
                          <div className="w-28 shrink-0 py-3 pr-2 pl-3">
                            <span
                              className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium"
                              style={{
                                fontSize: 14,
                                whiteSpace: 'nowrap',
                                color: priorityCfg.color,
                                border: `1px solid ${priorityCfg.border}`,
                                background: priorityCfg.bg,
                              }}
                            >
                              {r.priority}
                            </span>
                          </div>
                          <div className="w-32 shrink-0 py-3 pr-2">
                            <p style={{ fontSize: 14, color: '#4A7080' }}>
                              {formatDateTime(r.createdAt)}
                            </p>
                          </div>
                          <div className="w-20 shrink-0 py-3 pr-2 text-right">
                            <p style={{ fontSize: 14, color: '#0D2630' }}>
                              {getRequestItemCount(r)}
                            </p>
                          </div>
                          <div className="w-36 shrink-0 py-3 pr-2 text-right">
                            <p
                              className="font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {formatCurrency(getRequestEstAmount(r))}
                            </p>
                          </div>
                          <div className="w-44 shrink-0 py-3 pr-2 pl-3">
                            <span
                              className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium"
                              style={{
                                fontSize: 14,
                                whiteSpace: 'nowrap',
                                color: statusCfg.color,
                                border: `1px solid ${statusCfg.border}`,
                                background: statusCfg.bg,
                              }}
                            >
                              {r.status}
                            </span>
                          </div>
                          <div className="flex w-20 shrink-0 items-center justify-end gap-1 py-3 pr-3">
                            <button
                              type="button"
                              onClick={() => setModal({ type: 'detail', request: r })}
                              aria-label={`View ${r.id}`}
                              className={`flex size-11 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
                            >
                              <Eye style={{ width: 15, height: 15, color: '#4A7080' }} />
                            </button>
                            <RowMenu
                              request={r}
                              onView={() => setModal({ type: 'detail', request: r })}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <Pagination
                  page={currentPage}
                  pageSize={rowsPerPage}
                  totalItems={filtered.length}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={(size) => {
                    setRowsPerPage(size);
                    setCurrentPage(1);
                  }}
                  itemLabel="requests"
                />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="flex w-full shrink-0 flex-col gap-4 xl:w-[340px]">
            <div
              className="rounded-[12px] p-4"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Request Overview
              </h2>
              <div className="mt-3 flex items-center gap-5">
                <AnimatedDonutChart
                  breakdown={donutBreakdown}
                  total={totalRequests}
                  ariaLabel="Request overview donut chart"
                />
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  {donutBreakdown.map((d) => (
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
                        {d.value} (
                        {totalRequests > 0 ? Math.round((d.value / totalRequests) * 100) : 0}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <p className="mt-3" style={{ fontSize: 14, color: '#8A98A3' }}>
                Total Requests {totalRequests.toLocaleString('en-GB')}
              </p>
            </div>

            <div
              className="rounded-[12px] p-4"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <div className="flex items-center justify-between gap-2">
                <h2
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Recent Requests
                </h2>
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className={`font-sans font-medium transition-colors duration-150 hover:underline ${FOCUS_RING}`}
                  style={{ fontSize: 14, color: '#00B4D8' }}
                >
                  View All
                </button>
              </div>
              <div className="mt-3 flex flex-col gap-3">
                {recentRequests.map((r) => {
                  const statusCfg = STATUS_CFG[r.status];
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setModal({ type: 'detail', request: r })}
                      className={`flex items-center justify-between gap-2 rounded-[8px] p-1.5 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                    >
                      <span style={{ fontSize: 14, color: '#0D2630' }}>{r.id}</span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span
                          className="rounded-full px-2 py-0.5 font-sans font-medium"
                          style={{
                            fontSize: 14,
                            whiteSpace: 'nowrap',
                            color: statusCfg.color,
                            border: `1px solid ${statusCfg.border}`,
                            background: statusCfg.bg,
                          }}
                        >
                          {r.status}
                        </span>
                        <span style={{ fontSize: 14, color: '#8A98A3' }}>
                          {new Intl.DateTimeFormat('en-GB', {
                            timeZone: 'Africa/Lagos',
                            day: '2-digit',
                            month: 'short',
                          }).format(new Date(r.createdAt))}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              className="rounded-[12px] p-4"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Quick Actions
              </h2>
              <div className="mt-3 flex flex-col gap-1">
                {[
                  {
                    icon: Plus,
                    label: 'New Procurement Request',
                    onClick: () => setModal({ type: 'new' }),
                  },
                  {
                    icon: FileText,
                    label: 'Request Templates',
                    onClick: () => setModal({ type: 'templates' }),
                  },
                  {
                    icon: Users,
                    label: 'Manage Suppliers',
                    onClick: () => router.push(ROUTES.pharmacySuppliers),
                  },
                  {
                    icon: Truck,
                    label: 'View Purchase Orders',
                    onClick: () => router.push(ROUTES.pharmacyStockReceiving),
                  },
                ].map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    onClick={action.onClick}
                    className={`flex items-center justify-between gap-2 rounded-[8px] px-2.5 py-2.5 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                  >
                    <span className="flex items-center gap-2.5">
                      <action.icon style={{ width: 16, height: 16, color: '#00B4D8' }} />
                      <span style={{ fontSize: 14, color: '#0D2630' }}>{action.label}</span>
                    </span>
                    <span style={{ fontSize: 14, color: '#00B4D8' }}>→</span>
                  </button>
                ))}
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
            Submit requests early to ensure timely procurement and avoid stockouts.
          </p>
        </div>

        <div className="h-4" />
      </div>

      {modal?.type === 'new' && (
        <NewProcurementRequestModal
          {...(modal.initial ? { initial: modal.initial } : {})}
          onSubmit={handleCreate}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'detail' && (
        <ProcurementRequestDetailModal
          request={modal.request}
          onApprove={handleApprove}
          onReject={handleReject}
          onMarkAsOrdered={handleMarkAsOrdered}
          onViewPurchaseOrder={handleViewPurchaseOrder}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'templates' && (
        <RequestTemplatesModal
          onUseTemplate={(initial) => setModal({ type: 'new', initial })}
          onClose={() => setModal(null)}
        />
      )}
    </main>
  );
}
