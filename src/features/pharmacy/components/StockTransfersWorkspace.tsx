'use client';

import {
  ArrowRightLeft,
  CheckCircle2,
  Clock,
  History,
  MoreVertical,
  Plus,
  Search,
  Truck,
  XCircle,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';

import { AnimatedDonutChart } from '@components/shared/AnimatedDonutChart';
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
import { Tooltip } from '@components/shared/Tooltip';
import { StatCard } from '@components/shared/StatCard';
import { getPharmacyLocation } from '@/constants/pharmacyLocations';
import { PERMISSIONS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { formatDateTime } from '@/utils/datetime';
import {
  getTransferItemCount,
  INVENTORY_LOCATION_OPTIONS,
  type StockTransfer,
  type StockTransferStatus,
} from '@/features/pharmacy/__mocks__/pharmacyFixtures';
import {
  approveTransfer,
  cancelTransfer,
  completeTransfer,
  createTransfer,
  rejectTransfer,
  useTransfers,
} from '@/features/pharmacy/store/stockTransferStore';

const NewTransferModal = dynamic(
  () => import('@/features/pharmacy/components/NewTransferModal').then((m) => m.NewTransferModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);
const TransferDetailModal = dynamic(
  () =>
    import('@/features/pharmacy/components/TransferDetailModal').then((m) => m.TransferDetailModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const STATUS_CFG: Record<StockTransferStatus, { color: string; border: string; bg: string }> = {
  Draft: { color: '#64748B', border: 'rgba(100,116,139,0.35)', bg: 'rgba(100,116,139,0.08)' },
  'Pending Approval': {
    color: '#D97706',
    border: 'rgba(217,119,6,0.35)',
    bg: 'rgba(217,119,6,0.08)',
  },
  'In Transit': { color: '#2563EB', border: 'rgba(37,99,235,0.35)', bg: 'rgba(37,99,235,0.08)' },
  Completed: { color: '#16A34A', border: 'rgba(22,163,74,0.35)', bg: 'rgba(22,163,74,0.08)' },
  Cancelled: { color: '#DC2626', border: 'rgba(220,38,38,0.35)', bg: 'rgba(220,38,38,0.08)' },
  Rejected: { color: '#DC2626', border: 'rgba(220,38,38,0.35)', bg: 'rgba(220,38,38,0.08)' },
};

const TRANSFER_STATUS_OPTIONS = (Object.keys(STATUS_CFG) as StockTransferStatus[]).map((s) => ({
  value: s,
  label: s,
}));

type ModalState = { type: 'new' } | { type: 'detail'; transfer: StockTransfer } | null;

function isThisMonth(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function RowMenu({
  transfer,
  onView,
  onApprove,
  onReject,
  onComplete,
  onCancel,
}: {
  transfer: StockTransfer;
  onView: () => void;
  onApprove: () => void;
  onReject: () => void;
  onComplete: () => void;
  onCancel: () => void;
}) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`More actions for ${transfer.id}`}
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
        {transfer.status === 'Pending Approval' && (
          <PermissionGate permission={PERMISSIONS.PHARMACY_DISPENSE}>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onApprove();
              }}
              className="flex w-full items-center px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[rgba(22,163,74,0.06)]"
              style={{ fontSize: 14, color: '#16A34A' }}
            >
              Approve & Dispatch
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onReject();
              }}
              className="flex w-full items-center px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[rgba(220,38,38,0.06)]"
              style={{ fontSize: 14, color: '#DC2626' }}
            >
              Reject
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onCancel();
              }}
              className="flex w-full items-center px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD]"
              style={{ fontSize: 14, color: '#4A7080' }}
            >
              Cancel Transfer
            </button>
          </PermissionGate>
        )}
        {transfer.status === 'In Transit' && (
          <PermissionGate permission={PERMISSIONS.PHARMACY_DISPENSE}>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onComplete();
              }}
              className="flex w-full items-center px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[rgba(22,163,74,0.06)]"
              style={{ fontSize: 14, color: '#16A34A' }}
            >
              Mark Completed
            </button>
          </PermissionGate>
        )}
        {transfer.status === 'Draft' && (
          <PermissionGate permission={PERMISSIONS.PHARMACY_DISPENSE}>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onCancel();
              }}
              className="flex w-full items-center px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[rgba(220,38,38,0.06)]"
              style={{ fontSize: 14, color: '#DC2626' }}
            >
              Cancel Transfer
            </button>
          </PermissionGate>
        )}
      </RowMenuPortal>
    </div>
  );
}

export function StockTransfersWorkspace() {
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const actorName = user?.name ?? 'Pharmacist';

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [fromFilter, setFromFilter] = useState('');
  const [toFilter, setToFilter] = useState('');
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(8);
  const [modal, setModal] = useState<ModalState>(null);

  const allTransfers = useTransfers();

  const totalTransfers = allTransfers.length;
  const pendingCount = allTransfers.filter((t) => t.status === 'Pending Approval').length;
  const inTransitCount = allTransfers.filter((t) => t.status === 'In Transit').length;
  const completedThisMonth = allTransfers.filter(
    (t) => t.status === 'Completed' && t.completedAt && isThisMonth(t.completedAt),
  ).length;
  const cancelledRejectedThisMonth = allTransfers.filter(
    (t) =>
      (t.status === 'Cancelled' || t.status === 'Rejected') &&
      t.cancelledAt &&
      isThisMonth(t.cancelledAt),
  ).length;
  const draftCount = allTransfers.filter((t) => t.status === 'Draft').length;

  const donutBreakdown = [
    { label: 'Completed', value: completedThisMonth, color: STATUS_CFG.Completed.color },
    { label: 'In Transit', value: inTransitCount, color: STATUS_CFG['In Transit'].color },
    { label: 'Pending', value: pendingCount, color: STATUS_CFG['Pending Approval'].color },
    {
      label: 'Cancelled/Rejected',
      value: cancelledRejectedThisMonth,
      color: STATUS_CFG.Cancelled.color,
    },
    { label: 'Draft', value: draftCount, color: STATUS_CFG.Draft.color },
  ];
  const donutTotal = donutBreakdown.reduce((sum, d) => sum + d.value, 0);

  const topDestinations = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of allTransfers) {
      const name = getPharmacyLocation(t.toLocationId).name;
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
    const top3 = sorted.slice(0, 3);
    const othersTotal = sorted.slice(3).reduce((sum, [, count]) => sum + count, 0);
    return othersTotal > 0 ? [...top3, ['Others', othersTotal] as [string, number]] : top3;
  }, [allTransfers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allTransfers.filter((t) => {
      if (statusFilter && t.status !== statusFilter) return false;
      if (fromFilter && t.fromLocationId !== fromFilter) return false;
      if (toFilter && t.toLocationId !== toFilter) return false;
      if (
        q &&
        !t.id.toLowerCase().includes(q) &&
        !t.items.some((i) => i.medicationName.toLowerCase().includes(q))
      )
        return false;
      return true;
    });
  }, [allTransfers, search, statusFilter, fromFilter, toFilter]);

  const pageStart = (currentPage - 1) * rowsPerPage;
  const pageRows = filtered.slice(pageStart, pageStart + rowsPerPage);

  function handleClearFilters() {
    setSearch('');
    setStatusFilter('');
    setFromFilter('');
    setToFilter('');
    setCurrentPage(1);
  }

  function handleApplyFilters() {
    toast.success(
      'Filters applied',
      `${filtered.length} transfer${filtered.length !== 1 ? 's' : ''} match your filters.`,
    );
  }

  function handleViewHistory() {
    handleClearFilters();
    toast.info(
      'Showing full transfer history',
      'All statuses and locations are now visible in the table below.',
    );
  }

  function handleCreateTransfer(input: {
    fromLocationId: Parameters<typeof createTransfer>[0]['fromLocationId'];
    toLocationId: Parameters<typeof createTransfer>[0]['toLocationId'];
    items: Parameters<typeof createTransfer>[0]['items'];
    notes: string;
  }) {
    const id = createTransfer({
      fromLocationId: input.fromLocationId,
      toLocationId: input.toLocationId,
      requestedBy: actorName,
      items: input.items,
      ...(input.notes ? { notes: input.notes } : {}),
    });
    setModal(null);
    toast.success('Transfer requested', `${id} is awaiting approval.`);
  }

  function handleApprove(t: StockTransfer) {
    approveTransfer(t.id);
    toast.success('Transfer approved', `${t.id} is now in transit.`);
  }
  function handleReject(t: StockTransfer) {
    rejectTransfer(t.id);
    toast.info('Transfer rejected', `${t.id} has been rejected.`);
  }
  function handleCancel(t: StockTransfer) {
    cancelTransfer(t.id);
    toast.info('Transfer cancelled', `${t.id} has been cancelled.`);
  }
  function handleComplete(t: StockTransfer) {
    completeTransfer(t.id);
    toast.success('Transfer completed', `${t.id} confirmed — stock moved between locations.`);
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
            Stock Transfers
          </span>
        </nav>

        {/* Header */}
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1
              className="font-display font-semibold"
              style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
            >
              Stock Transfers
            </h1>
            <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
              Transfer stock between locations and track transfer status.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleViewHistory}
              className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
              style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
            >
              <History style={{ width: 15, height: 15 }} />
              View Transfer History
            </button>
            <button
              type="button"
              onClick={() => setModal({ type: 'new' })}
              className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
              style={{ fontSize: 14, background: '#00B4D8' }}
            >
              <Plus style={{ width: 15, height: 15 }} />
              New Transfer
            </button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="mt-5 grid grid-cols-2 gap-3.5 sm:grid-cols-3 xl:grid-cols-5 xl:gap-4">
          <StatCard
            icon={ArrowRightLeft}
            label="Total Transfers"
            value={totalTransfers}
            info="All time"
            accent="#0D2630"
            iconBg="rgba(13,38,48,0.08)"
          />
          <StatCard
            icon={Clock}
            label="Pending Transfers"
            value={pendingCount}
            info="Awaiting approval / dispatch"
            accent="#D97706"
            iconBg="rgba(217,119,6,0.1)"
            onClick={() => {
              setStatusFilter('Pending Approval');
              setCurrentPage(1);
            }}
          />
          <StatCard
            icon={Truck}
            label="In Transit"
            value={inTransitCount}
            info="Transfers in transit"
            accent="#2563EB"
            iconBg="rgba(37,99,235,0.1)"
            onClick={() => {
              setStatusFilter('In Transit');
              setCurrentPage(1);
            }}
          />
          <StatCard
            icon={CheckCircle2}
            label="Completed (This Month)"
            value={completedThisMonth}
            info={new Intl.DateTimeFormat('en-GB', {
              month: 'long',
              year: 'numeric',
              timeZone: 'Africa/Lagos',
            }).format(new Date())}
            accent="#16A34A"
            iconBg="rgba(22,163,74,0.1)"
          />
          <StatCard
            icon={XCircle}
            label="Cancelled / Rejected"
            value={cancelledRejectedThisMonth}
            info="This month"
            accent="#DC2626"
            iconBg="rgba(220,38,38,0.1)"
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
                    placeholder="Search by medication or transfer ID..."
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

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <FormSelect
                  id="transfer-status-filter"
                  value={statusFilter}
                  onChange={(v) => {
                    setStatusFilter(v);
                    setCurrentPage(1);
                  }}
                  options={TRANSFER_STATUS_OPTIONS}
                  placeholder="All Statuses"
                />
                <FormSelect
                  id="transfer-from-filter"
                  value={fromFilter}
                  onChange={(v) => {
                    setFromFilter(v);
                    setCurrentPage(1);
                  }}
                  options={INVENTORY_LOCATION_OPTIONS}
                  placeholder="All From Locations"
                />
                {moreFiltersOpen && (
                  <FormSelect
                    id="transfer-to-filter"
                    value={toFilter}
                    onChange={(v) => {
                      setToFilter(v);
                      setCurrentPage(1);
                    }}
                    options={INVENTORY_LOCATION_OPTIONS}
                    placeholder="All To Locations"
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
                  Transfer List ({filtered.length})
                </h2>
                <ScrollableTable minWidth={1280} maxHeight={640} className="mt-3">
                  <div
                    className={`flex rounded-t-[8px] ${TABLE_HEADER_STICKY_CLASS}`}
                    style={{
                      background: TABLE_HEADER_BG,
                      borderBottom: '1px solid #E6F8FD',
                    }}
                  >
                    <div className="w-32 shrink-0 py-2.5 pr-2 pl-3">
                      <span
                        className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Transfer ID
                      </span>
                    </div>
                    <div className="w-48 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        From Location
                      </span>
                    </div>
                    <div className="w-48 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        To Location
                      </span>
                    </div>
                    <div className="w-32 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Transfer Date
                      </span>
                    </div>
                    <div className="w-40 shrink-0 py-2.5 pr-2 pl-3">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Status
                      </span>
                    </div>
                    <div className="min-w-[100px] flex-1 py-2.5 pr-2 text-right">
                      <span
                        className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Items / Qty
                      </span>
                    </div>
                    <div className="w-40 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Requested By
                      </span>
                    </div>
                    <div className="w-24 shrink-0 py-2.5 pr-3 text-right">
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
                        No transfers match your filters
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

                  {pageRows.map((t) => {
                    const statusCfg = STATUS_CFG[t.status];
                    return (
                      <div
                        key={t.id}
                        className="flex items-center transition-colors duration-100 hover:bg-[#F5FBFD]"
                        style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                      >
                        <div className="w-32 shrink-0 py-3 pr-2 pl-3">
                          <Tooltip content={t.id}>
                            <p
                              className="truncate font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {t.id}
                            </p>
                          </Tooltip>
                        </div>
                        <div className="w-48 shrink-0 py-3 pr-2">
                          <Tooltip content={getPharmacyLocation(t.fromLocationId).name}>
                            <p className="truncate" style={{ fontSize: 14, color: '#0D2630' }}>
                              {getPharmacyLocation(t.fromLocationId).name}
                            </p>
                          </Tooltip>
                        </div>
                        <div className="w-48 shrink-0 py-3 pr-2">
                          <Tooltip content={getPharmacyLocation(t.toLocationId).name}>
                            <p className="truncate" style={{ fontSize: 14, color: '#0D2630' }}>
                              {getPharmacyLocation(t.toLocationId).name}
                            </p>
                          </Tooltip>
                        </div>
                        <div className="w-32 shrink-0 py-3 pr-2">
                          <p style={{ fontSize: 14, color: '#4A7080' }}>
                            {formatDateTime(t.requestedAt)}
                          </p>
                        </div>
                        <div className="w-40 shrink-0 py-3 pr-2 pl-3">
                          <span
                            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-sans font-medium"
                            style={{
                              fontSize: 14,
                              whiteSpace: 'nowrap',
                              color: statusCfg.color,
                              border: `1px solid ${statusCfg.border}`,
                              background: statusCfg.bg,
                            }}
                          >
                            {t.status === 'In Transit' && (
                              <Truck style={{ width: 12, height: 12 }} />
                            )}
                            {t.status}
                          </span>
                        </div>
                        <div className="min-w-[100px] flex-1 py-3 pr-2 text-right">
                          <p style={{ fontSize: 14, color: '#0D2630' }}>
                            {t.items.length} / {getTransferItemCount(t).toLocaleString('en-GB')}
                          </p>
                        </div>
                        <div className="w-40 shrink-0 py-3 pr-2">
                          <Tooltip content={t.requestedBy}>
                            <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                              {t.requestedBy}
                            </p>
                          </Tooltip>
                        </div>
                        <div className="flex w-24 shrink-0 items-center justify-end gap-1 py-3 pr-3">
                          <button
                            type="button"
                            onClick={() => setModal({ type: 'detail', transfer: t })}
                            aria-label={`View ${t.id}`}
                            className={`flex size-11 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
                          >
                            <Search style={{ width: 15, height: 15, color: '#4A7080' }} />
                          </button>
                          <RowMenu
                            transfer={t}
                            onView={() => setModal({ type: 'detail', transfer: t })}
                            onApprove={() => handleApprove(t)}
                            onReject={() => handleReject(t)}
                            onComplete={() => handleComplete(t)}
                            onCancel={() => handleCancel(t)}
                          />
                        </div>
                      </div>
                    );
                  })}
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
                  itemLabel="transfers"
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
                Transfer Overview (This Month)
              </h2>
              <div className="mt-3 flex items-center gap-5">
                <AnimatedDonutChart
                  breakdown={donutBreakdown}
                  total={donutTotal}
                  ariaLabel="Transfer overview donut chart"
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
                        {d.value} ({donutTotal > 0 ? Math.round((d.value / donutTotal) * 100) : 0}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div
              className="rounded-[12px] p-4"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Top Transfer Destinations
              </h2>
              <div className="mt-3 flex flex-col gap-2.5">
                {topDestinations.map(([name, count], i) => (
                  <div key={name} className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="flex size-5 shrink-0 items-center justify-center rounded-full font-sans font-medium"
                        style={{
                          fontSize: 14,
                          background: 'rgba(0,180,216,0.1)',
                          color: '#00B4D8',
                        }}
                      >
                        {i + 1}
                      </span>
                      <Tooltip content={name}>
                        <span className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                          {name}
                        </span>
                      </Tooltip>
                    </div>
                    <span
                      className="shrink-0 font-sans font-medium"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {count}
                    </span>
                  </div>
                ))}
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
                  { icon: Plus, label: 'New Transfer', onClick: () => setModal({ type: 'new' }) },
                  { icon: History, label: 'View Transfer History', onClick: handleViewHistory },
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
            Ensure all transfers are verified and approved before dispatch. Stock levels will be
            updated upon completion.
          </p>
        </div>

        <div className="h-4" />
      </div>

      {modal?.type === 'new' && (
        <NewTransferModal onSubmit={handleCreateTransfer} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'detail' && (
        <TransferDetailModal transfer={modal.transfer} onClose={() => setModal(null)} />
      )}
    </main>
  );
}
