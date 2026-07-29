'use client';

import {
  AlertTriangle,
  Bell,
  Box,
  CalendarClock,
  CalendarX2,
  Clock,
  Download,
  Eye,
  FileText,
  MoreVertical,
  RotateCcw,
  Search,
  SlidersHorizontal,
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
import { getPharmacyLocation } from '@/constants/pharmacyLocations';
import { ROUTES } from '@/constants/routes';
import { useToast } from '@/hooks/useToast';
import { formatCurrency, formatCurrencyCompact } from '@/utils/currency';
import { formatDate } from '@/utils/datetime';
import { downloadCSV } from '@/utils/export';
import { REGISTRATION_DATE_OPTIONS } from '@/features/registration/__mocks__/patientDirectoryFixtures';
import {
  EXPIRY_STATUS_OPTIONS,
  getBatchDaysLeft,
  getExpiryBucket,
  INVENTORY_CATEGORY_OPTIONS,
  INVENTORY_LOCATION_OPTIONS,
  type ExpiryBucket,
  type InventoryBatchRow,
} from '@/features/pharmacy/__mocks__/pharmacyFixtures';
import {
  adjustStockQty,
  updateReorderLevel,
  markBatchReturned,
  useInventoryBatches,
} from '@/features/pharmacy/store/inventoryStore';

const AdjustStockModal = dynamic(
  () => import('@/features/pharmacy/components/AdjustStockModal').then((m) => m.AdjustStockModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);
const BatchDetailModal = dynamic(
  () => import('@/features/pharmacy/components/BatchDetailModal').then((m) => m.BatchDetailModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const BUCKET_CFG: Record<
  ExpiryBucket,
  { color: string; border: string; bg: string; label: string }
> = {
  Expired: {
    color: '#DC2626',
    border: 'rgba(220,38,38,0.35)',
    bg: 'rgba(220,38,38,0.08)',
    label: 'Expired',
  },
  '≤ 30 Days': {
    color: '#D97706',
    border: 'rgba(217,119,6,0.35)',
    bg: 'rgba(217,119,6,0.08)',
    label: '≤ 30 Days',
  },
  '31 – 60 Days': {
    color: '#EAB308',
    border: 'rgba(234,179,8,0.35)',
    bg: 'rgba(234,179,8,0.08)',
    label: '31 – 60 Days',
  },
  '61 – 90 Days': {
    color: '#2563EB',
    border: 'rgba(37,99,235,0.35)',
    bg: 'rgba(37,99,235,0.08)',
    label: '61 – 90 Days',
  },
  '> 90 Days': {
    color: '#16A34A',
    border: 'rgba(22,163,74,0.35)',
    bg: 'rgba(22,163,74,0.08)',
    label: '> 90 Days',
  },
};

type ModalState =
  { type: 'adjust'; row: InventoryBatchRow } | { type: 'detail'; row: InventoryBatchRow } | null;

function valueOf(rows: { row: InventoryBatchRow }[]): number {
  return rows.reduce((sum, r) => sum + r.row.stockQty * r.row.unitPrice, 0);
}

function RowMenu({
  row,
  isExpired,
  onView,
  onAdjust,
  onReturn,
  onTransfer,
}: {
  row: InventoryBatchRow;
  isExpired: boolean;
  onView: () => void;
  onAdjust: () => void;
  onReturn: () => void;
  onTransfer: () => void;
}) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`More actions for batch ${row.batchNo}`}
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
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            onAdjust();
          }}
          className="flex w-full items-center px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD]"
          style={{ fontSize: 14, color: '#2F3A40' }}
        >
          Adjust Stock
        </button>
        {isExpired && row.stockQty > 0 && (
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onReturn();
            }}
            className="flex w-full items-center px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[rgba(220,38,38,0.06)]"
            style={{ fontSize: 14, color: '#DC2626' }}
          >
            Mark as Returned
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            onTransfer();
          }}
          className="flex w-full items-center px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD]"
          style={{ fontSize: 14, color: '#2F3A40' }}
        >
          Transfer Batch
        </button>
      </RowMenuPortal>
    </div>
  );
}

export function ExpiryManagementWorkspace() {
  const router = useRouter();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(8);
  const [modal, setModal] = useState<ModalState>(null);

  const allBatches = useInventoryBatches();

  const withBucket = useMemo(
    () =>
      allBatches.map((row) => ({
        row,
        bucket: getExpiryBucket(row),
        daysLeft: getBatchDaysLeft(row),
      })),
    [allBatches],
  );

  const totalInStock = allBatches.length;
  const expired = withBucket.filter((r) => r.bucket === 'Expired');
  const within30 = withBucket.filter((r) => r.bucket === '≤ 30 Days');
  const d31to60 = withBucket.filter((r) => r.bucket === '31 – 60 Days');
  const d61to90 = withBucket.filter((r) => r.bucket === '61 – 90 Days');
  const over90 = withBucket.filter((r) => r.bucket === '> 90 Days');

  const totalStockValue = useMemo(() => valueOf(withBucket), [withBucket]);

  const donutBreakdown = [
    { label: 'Expired', value: expired.length, color: BUCKET_CFG.Expired.color },
    { label: '≤ 30 Days', value: within30.length, color: BUCKET_CFG['≤ 30 Days'].color },
    { label: '31 – 60 Days', value: d31to60.length, color: BUCKET_CFG['31 – 60 Days'].color },
    { label: '61 – 90 Days', value: d61to90.length, color: BUCKET_CFG['61 – 90 Days'].color },
    { label: '> 90 Days', value: over90.length, color: BUCKET_CFG['> 90 Days'].color },
  ];

  const topExpiringSoon = useMemo(
    () => [...withBucket].sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 5),
    [withBucket],
  );

  // The actionable list — items already expired or expiring within 90 days.
  // Healthy stock with >90 days left is Drug Inventory's territory.
  const actionable = useMemo(
    () => withBucket.filter((r) => r.bucket !== '> 90 Days'),
    [withBucket],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return actionable.filter(({ row, bucket }) => {
      if (statusFilter && bucket !== statusFilter) return false;
      if (locationFilter && row.locationId !== locationFilter) return false;
      if (categoryFilter && row.category !== categoryFilter) return false;
      if (dateFilter) {
        const wat = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos' });
        const now = new Date();
        const d = new Date(row.expiryDate);
        if (dateFilter === 'today' && wat.format(d) !== wat.format(now)) return false;
        if (dateFilter === 'this-week' && d.getTime() - now.getTime() > 7 * 24 * 60 * 60 * 1000)
          return false;
        if (
          dateFilter === 'this-month' &&
          !(d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth())
        )
          return false;
        if (dateFilter === 'this-year' && d.getFullYear() !== now.getFullYear()) return false;
      }
      if (
        q &&
        !row.medicationName.toLowerCase().includes(q) &&
        !row.batchNo.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [actionable, search, statusFilter, locationFilter, categoryFilter, dateFilter]);

  const sorted = useMemo(() => [...filtered].sort((a, b) => a.daysLeft - b.daysLeft), [filtered]);

  const pageStart = (currentPage - 1) * rowsPerPage;
  const pageRows = sorted.slice(pageStart, pageStart + rowsPerPage);

  function handleClearFilters() {
    setSearch('');
    setStatusFilter('');
    setLocationFilter('');
    setCategoryFilter('');
    setDateFilter('');
    setCurrentPage(1);
  }

  function handleApplyFilters() {
    toast.success(
      'Filters applied',
      `${filtered.length} item${filtered.length !== 1 ? 's' : ''} match your filters.`,
    );
  }

  function filterByBucket(bucket: ExpiryBucket) {
    setStatusFilter(bucket);
    setCurrentPage(1);
  }

  function handleExport() {
    const rows = [
      [
        'Medication',
        'Batch No.',
        'Strength/Form',
        'Expiry Date',
        'Days Left/Status',
        'Location',
        'Stock Qty',
        'Value (₦)',
      ],
      ...filtered.map(({ row, daysLeft }) => [
        row.medicationName,
        row.batchNo,
        `${row.strength} ${row.form}`,
        formatDate(row.expiryDate),
        daysLeft < 0 ? 'Expired' : `${daysLeft} days`,
        getPharmacyLocation(row.locationId).name,
        String(row.stockQty),
        formatCurrency(row.stockQty * row.unitPrice),
      ]),
    ];
    downloadCSV('expiry-management', rows);
    toast.success('Export ready', `${filtered.length} items downloaded as CSV.`);
  }

  function handleCreateAlert() {
    toast.info(
      'Already tracked',
      'Items nearing expiry already surface in the stat cards and Top Items Expiring Soon below — no separate alert needed.',
    );
  }

  function handleMarkReturnedQuickAction() {
    setStatusFilter('Expired');
    setCurrentPage(1);
    toast.info('Filtered to expired items', 'Use each row’s menu to mark it as returned.');
  }

  function handleReturn(row: InventoryBatchRow) {
    markBatchReturned(row.id);
    toast.success(
      'Marked as returned',
      `${row.medicationName} batch ${row.batchNo} removed from available stock.`,
    );
  }

  function handleAdjustStock(id: string, newQty: number, newReorderLevel: number) {
    adjustStockQty(id, newQty);
    updateReorderLevel(id, newReorderLevel);
    setModal(null);
    toast.success('Quantity updated', 'Batch stock quantity has been adjusted.');
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
            Expiry Management
          </span>
        </nav>

        {/* Header */}
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1
              className="font-display font-semibold"
              style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
            >
              Expiry Management
            </h1>
            <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
              Monitor medication expiry dates and take action to minimize waste and ensure patient
              safety.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleExport}
              className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
              style={{ fontSize: 14, background: '#00B4D8' }}
            >
              <Download style={{ width: 15, height: 15 }} />
              Export Report
            </button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="mt-5 grid grid-cols-2 gap-3.5 sm:grid-cols-3 xl:grid-cols-5 xl:gap-4">
          <StatCard
            icon={AlertTriangle}
            label="Expired Items"
            value={expired.length}
            info={`Value: ${formatCurrency(valueOf(expired))}`}
            accent="#DC2626"
            iconBg="rgba(220,38,38,0.1)"
            onClick={() => filterByBucket('Expired')}
          />
          <StatCard
            icon={Clock}
            label="Expiring Within 30 Days"
            value={within30.length}
            info={`Value: ${formatCurrency(valueOf(within30))}`}
            accent="#D97706"
            iconBg="rgba(217,119,6,0.1)"
            onClick={() => filterByBucket('≤ 30 Days')}
          />
          <StatCard
            icon={CalendarClock}
            label="Expiring 31 – 60 Days"
            value={d31to60.length}
            info={`Value: ${formatCurrency(valueOf(d31to60))}`}
            accent="#EAB308"
            iconBg="rgba(234,179,8,0.1)"
            onClick={() => filterByBucket('31 – 60 Days')}
          />
          <StatCard
            icon={CalendarX2}
            label="Expiring 61 – 90 Days"
            value={d61to90.length}
            info={`Value: ${formatCurrency(valueOf(d61to90))}`}
            accent="#2563EB"
            iconBg="rgba(37,99,235,0.1)"
            onClick={() => filterByBucket('61 – 90 Days')}
          />
          <StatCard
            icon={Box}
            label="Total Items in Stock"
            value={totalInStock}
            info={`Value: ${formatCurrencyCompact(totalStockValue)}`}
            accent="#16A34A"
            iconBg="rgba(22,163,74,0.1)"
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
                    placeholder="Search by medication, batch no., or barcode..."
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
                  className={`flex shrink-0 items-center gap-1 font-sans font-medium transition-colors duration-150 hover:underline ${FOCUS_RING}`}
                  style={{ fontSize: 14, color: '#00B4D8' }}
                >
                  <SlidersHorizontal style={{ width: 14, height: 14 }} />
                  {moreFiltersOpen ? 'Fewer Filters' : 'More Filters'}
                </button>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <FormSelect
                  id="expiry-status-filter"
                  value={statusFilter}
                  onChange={(v) => {
                    setStatusFilter(v);
                    setCurrentPage(1);
                  }}
                  options={EXPIRY_STATUS_OPTIONS}
                  placeholder="All Statuses"
                />
                <FormSelect
                  id="expiry-location-filter"
                  value={locationFilter}
                  onChange={(v) => {
                    setLocationFilter(v);
                    setCurrentPage(1);
                  }}
                  options={INVENTORY_LOCATION_OPTIONS}
                  placeholder="All Locations"
                />
                <FormSelect
                  id="expiry-category-filter"
                  value={categoryFilter}
                  onChange={(v) => {
                    setCategoryFilter(v);
                    setCurrentPage(1);
                  }}
                  options={INVENTORY_CATEGORY_OPTIONS}
                  placeholder="All Categories"
                />
                {moreFiltersOpen && (
                  <FormSelect
                    id="expiry-date-filter"
                    value={dateFilter}
                    onChange={(v) => {
                      setDateFilter(v);
                      setCurrentPage(1);
                    }}
                    options={REGISTRATION_DATE_OPTIONS}
                    placeholder="All Expiry Dates"
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
                  Expiry Items ({filtered.length})
                </h2>
                <div className="mt-3 overflow-x-auto scroll-smooth">
                  <div style={{ minWidth: 1280 }}>
                    <div
                      className="flex rounded-t-[8px]"
                      style={{
                        background: 'rgba(226,237,241,0.4)',
                        borderBottom: '1px solid #E6F8FD',
                      }}
                    >
                      <div className="min-w-[160px] flex-1 py-2.5 pr-2 pl-3">
                        <span
                          className="font-sans font-bold tracking-wider uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Medication
                        </span>
                      </div>
                      <div className="w-28 shrink-0 py-2.5 pr-2">
                        <span
                          className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Batch No.
                        </span>
                      </div>
                      <div className="w-32 shrink-0 py-2.5 pr-2">
                        <span
                          className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Expiry Date
                        </span>
                      </div>
                      <div className="w-36 shrink-0 py-2.5 pr-2 pl-3">
                        <span
                          className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Days Left
                        </span>
                      </div>
                      <div className="w-44 shrink-0 py-2.5 pr-2">
                        <span
                          className="font-sans font-bold tracking-wider uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Location
                        </span>
                      </div>
                      <div className="w-24 shrink-0 py-2.5 pr-2 text-right">
                        <span
                          className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Stock Qty
                        </span>
                      </div>
                      <div className="w-28 shrink-0 py-2.5 pr-2 text-right">
                        <span
                          className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Value
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
                          No items match your filters
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

                    {pageRows.map(({ row, bucket, daysLeft }) => {
                      const cfg = BUCKET_CFG[bucket];
                      return (
                        <div
                          key={row.id}
                          className="flex items-center transition-colors duration-100 hover:bg-[#F5FBFD]"
                          style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                        >
                          <div className="min-w-[160px] flex-1 py-3 pr-2 pl-3">
                            <p
                              className="truncate font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {row.medicationName}
                            </p>
                            <p className="truncate" style={{ fontSize: 14, color: '#8A98A3' }}>
                              {row.strength} {row.form}
                            </p>
                          </div>
                          <div className="w-28 shrink-0 py-3 pr-2">
                            <p className="truncate" style={{ fontSize: 14, color: '#0D2630' }}>
                              {row.batchNo}
                            </p>
                          </div>
                          <div className="w-32 shrink-0 py-3 pr-2">
                            <p style={{ fontSize: 14, color: '#0D2630' }}>
                              {formatDate(row.expiryDate)}
                            </p>
                          </div>
                          <div className="w-36 shrink-0 py-3 pr-2 pl-3">
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
                              {daysLeft < 0 ? 'Expired' : `${daysLeft} days`}
                            </span>
                          </div>
                          <div className="w-44 shrink-0 py-3 pr-2">
                            <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                              {getPharmacyLocation(row.locationId).name}
                            </p>
                          </div>
                          <div className="w-24 shrink-0 py-3 pr-2 text-right">
                            <p style={{ fontSize: 14, color: '#0D2630' }}>
                              {row.stockQty.toLocaleString('en-GB')}
                            </p>
                          </div>
                          <div className="w-28 shrink-0 py-3 pr-2 text-right">
                            <p style={{ fontSize: 14, color: '#0D2630' }}>
                              {formatCurrency(row.stockQty * row.unitPrice)}
                            </p>
                          </div>
                          <div className="flex w-24 shrink-0 items-center justify-end gap-1 py-3 pr-3">
                            <button
                              type="button"
                              onClick={() => setModal({ type: 'detail', row })}
                              aria-label={`View batch ${row.batchNo}`}
                              className={`flex size-11 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
                            >
                              <Eye style={{ width: 15, height: 15, color: '#4A7080' }} />
                            </button>
                            <RowMenu
                              row={row}
                              isExpired={bucket === 'Expired'}
                              onView={() => setModal({ type: 'detail', row })}
                              onAdjust={() => setModal({ type: 'adjust', row })}
                              onReturn={() => handleReturn(row)}
                              onTransfer={() => router.push(ROUTES.pharmacyTransfers)}
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
                  itemLabel="items"
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
                Expiry Overview
              </h2>
              <div className="mt-3 flex items-center gap-5">
                <AnimatedDonutChart
                  breakdown={donutBreakdown}
                  total={totalInStock}
                  ariaLabel="Expiry overview donut chart"
                />
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  {donutBreakdown.map((d) => (
                    <div key={d.label} className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <span
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ background: d.color }}
                        />
                        <span className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                          {d.label}
                        </span>
                      </div>
                      <span
                        className="shrink-0 font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {d.value} (
                        {totalInStock > 0 ? Math.round((d.value / totalInStock) * 100) : 0}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <p className="mt-3" style={{ fontSize: 14, color: '#8A98A3' }}>
                Total Items {totalInStock.toLocaleString('en-GB')}
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
                  Top Items Expiring Soon
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('');
                    setCurrentPage(1);
                  }}
                  className={`font-sans font-medium transition-colors duration-150 hover:underline ${FOCUS_RING}`}
                  style={{ fontSize: 14, color: '#00B4D8' }}
                >
                  View All
                </button>
              </div>
              <div className="mt-3 flex flex-col gap-3">
                {topExpiringSoon.map(({ row, daysLeft }) => (
                  <div key={row.id} className="flex items-start gap-2.5">
                    <AlertTriangle
                      className="mt-0.5 shrink-0"
                      style={{ width: 14, height: 14, color: daysLeft < 0 ? '#DC2626' : '#D97706' }}
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className="truncate font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {row.medicationName} {row.strength}
                      </p>
                    </div>
                    <span
                      className="shrink-0"
                      style={{ fontSize: 14, color: daysLeft < 0 ? '#DC2626' : '#8A98A3' }}
                    >
                      {formatDate(row.expiryDate)}
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
                  { icon: Bell, label: 'Create Expiry Alert', onClick: handleCreateAlert },
                  { icon: FileText, label: 'Generate Expiry Report', onClick: handleExport },
                  {
                    icon: RotateCcw,
                    label: 'Mark Items as Returned',
                    onClick: handleMarkReturnedQuickAction,
                  },
                  {
                    icon: SlidersHorizontal,
                    label: 'Adjust Stock',
                    onClick: () => router.push(ROUTES.pharmacyStockAdjustments),
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
            Review expiring items regularly and take necessary action such as discounting, returns,
            or redistribution to minimize waste.
          </p>
        </div>

        <div className="h-4" />
      </div>

      {modal?.type === 'adjust' && (
        <AdjustStockModal
          row={modal.row}
          onAdjust={handleAdjustStock}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'detail' && (
        <BatchDetailModal row={modal.row} onClose={() => setModal(null)} />
      )}
    </main>
  );
}
