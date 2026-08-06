'use client';

import {
  AlertTriangle,
  ArrowLeftRight,
  Banknote,
  CalendarClock,
  CalendarX2,
  Download,
  Eye,
  Hourglass,
  Lock,
  MoreVertical,
  Package,
  Plus,
  ScanLine,
  Search,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';

import { AnimatedDonutChart } from '@components/shared/AnimatedDonutChart';
import { FormSelect } from '@components/shared/FormSelect';
import { ModalLoadingFallback } from '@components/shared/ModalLoadingFallback';
import { Pagination } from '@components/shared/Pagination';
import { RowMenuPortal } from '@components/shared/RowMenuPortal';
import {
  ScrollableTable,
  TABLE_HEADER_BG,
  TABLE_HEADER_STICKY_CLASS,
} from '@components/shared/ScrollableTable';
import { Tooltip } from '@components/shared/Tooltip';
import { StatCard } from '@components/shared/StatCard';
import { getPharmacyLocation } from '@/constants/pharmacyLocations';
import { ROUTES } from '@/constants/routes';
import { useToast } from '@/hooks/useToast';
import { formatCurrency, formatCurrencyCompact } from '@/utils/currency';
import { formatDate } from '@/utils/datetime';
import { downloadCSV } from '@/utils/export';
import { REGISTRATION_DATE_OPTIONS } from '@/features/registration/__mocks__/patientDirectoryFixtures';
import {
  BATCH_STATUS_OPTIONS,
  getBatchDaysLeft,
  getBatchStatus,
  INVENTORY_LOCATION_OPTIONS,
  type BatchStatus,
  type InventoryBatchRow,
} from '@/features/pharmacy/__mocks__/pharmacyFixtures';
import {
  addStockBatch,
  adjustStockQty,
  updateReorderLevel,
  toggleBatchHold,
  useInventoryBatches,
} from '@/features/pharmacy/store/inventoryStore';

const AddStockModal = dynamic(
  () => import('@/features/pharmacy/components/AddStockModal').then((m) => m.AddStockModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);
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

const STATUS_CFG: Record<BatchStatus, { color: string; border: string; bg: string }> = {
  Active: { color: '#16A34A', border: 'rgba(22,163,74,0.35)', bg: 'rgba(22,163,74,0.08)' },
  'Expiring Soon': { color: '#D97706', border: 'rgba(217,119,6,0.35)', bg: 'rgba(217,119,6,0.08)' },
  Expired: { color: '#DC2626', border: 'rgba(220,38,38,0.35)', bg: 'rgba(220,38,38,0.08)' },
  'On Hold / Quarantine': {
    color: '#7C3AED',
    border: 'rgba(124,58,237,0.35)',
    bg: 'rgba(124,58,237,0.08)',
  },
  'Out of Stock': {
    color: '#64748B',
    border: 'rgba(100,116,139,0.35)',
    bg: 'rgba(100,116,139,0.08)',
  },
};

type ModalState =
  | { type: 'add' }
  | { type: 'adjust'; row: InventoryBatchRow }
  | { type: 'detail'; row: InventoryBatchRow }
  | null;

function RowMenu({
  row,
  onView,
  onAdjust,
  onToggleHold,
  onTransfer,
}: {
  row: InventoryBatchRow;
  onView: () => void;
  onAdjust: () => void;
  onToggleHold: () => void;
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
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            onToggleHold();
          }}
          className="flex w-full items-center px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD]"
          style={{ fontSize: 14, color: row.isOnHold ? '#16A34A' : '#7C3AED' }}
        >
          {row.isOnHold ? 'Release Hold' : 'Put On Hold'}
        </button>
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

export function BatchManagementWorkspace() {
  const router = useRouter();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [medicationFilter, setMedicationFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(8);
  const [modal, setModal] = useState<ModalState>(null);

  const allBatches = useInventoryBatches();

  const medicationOptions = useMemo(
    () =>
      Array.from(new Set(allBatches.map((b) => b.medicationName)))
        .sort()
        .map((name) => ({ value: name, label: name })),
    [allBatches],
  );

  const withStatus = useMemo(
    () =>
      allBatches.map((row) => ({
        row,
        status: getBatchStatus(row),
        daysLeft: getBatchDaysLeft(row),
      })),
    [allBatches],
  );

  const totalBatches = allBatches.length;
  const activeCount = withStatus.filter((r) => r.status === 'Active').length;
  const expiringSoonCount = withStatus.filter((r) => r.status === 'Expiring Soon').length;
  const expiredCount = withStatus.filter((r) => r.status === 'Expired').length;
  const onHoldCount = withStatus.filter((r) => r.status === 'On Hold / Quarantine').length;
  const outOfStockCount = withStatus.filter((r) => r.status === 'Out of Stock').length;
  const totalValue = useMemo(
    () => allBatches.reduce((sum, b) => sum + b.stockQty * b.unitPrice, 0),
    [allBatches],
  );

  const donutBreakdown = [
    { label: 'Active', value: activeCount, color: STATUS_CFG.Active.color },
    { label: 'Expiring Soon', value: expiringSoonCount, color: STATUS_CFG['Expiring Soon'].color },
    { label: 'Expired', value: expiredCount, color: STATUS_CFG.Expired.color },
    {
      label: 'On Hold / Quarantine',
      value: onHoldCount,
      color: STATUS_CFG['On Hold / Quarantine'].color,
    },
    { label: 'Out of Stock', value: outOfStockCount, color: STATUS_CFG['Out of Stock'].color },
  ];

  const expiryCalendar = useMemo(() => {
    let within30 = 0;
    let d31to60 = 0;
    let d61to90 = 0;
    for (const { daysLeft } of withStatus) {
      if (daysLeft < 0 || daysLeft > 90) continue;
      if (daysLeft <= 30) within30 += 1;
      else if (daysLeft <= 60) d31to60 += 1;
      else d61to90 += 1;
    }
    return { within30, d31to60, d61to90 };
  }, [withStatus]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return withStatus.filter(({ row, status }) => {
      if (medicationFilter && row.medicationName !== medicationFilter) return false;
      if (statusFilter && status !== statusFilter) return false;
      if (locationFilter && row.locationId !== locationFilter) return false;
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
  }, [withStatus, search, medicationFilter, statusFilter, locationFilter, dateFilter]);

  const pageStart = (currentPage - 1) * rowsPerPage;
  const pageRows = filtered.slice(pageStart, pageStart + rowsPerPage);

  function handleClearFilters() {
    setSearch('');
    setMedicationFilter('');
    setStatusFilter('');
    setLocationFilter('');
    setDateFilter('');
    setCurrentPage(1);
  }

  function handleApplyFilters() {
    toast.success(
      'Filters applied',
      `${filtered.length} batch${filtered.length !== 1 ? 'es' : ''} match your filters.`,
    );
  }

  function filterByStatus(status: BatchStatus) {
    setStatusFilter(status);
    setCurrentPage(1);
  }

  function handleExport() {
    const rows = [
      [
        'Batch No.',
        'Medication',
        'Strength/Form',
        'Manufacturer',
        'Mfg. Date',
        'Expiry Date',
        'Location',
        'Stock Qty',
        'Status',
        'Value (In Stock)',
      ],
      ...filtered.map(({ row, status }) => [
        row.batchNo,
        row.medicationName,
        `${row.strength} ${row.form}`,
        row.manufacturer ?? '',
        row.mfgDate ? formatDate(row.mfgDate) : '',
        formatDate(row.expiryDate),
        getPharmacyLocation(row.locationId).name,
        String(row.stockQty),
        status,
        formatCurrency(row.stockQty * row.unitPrice),
      ]),
    ];
    downloadCSV('batch-management', rows);
    toast.success('Export ready', `${filtered.length} batches downloaded as CSV.`);
  }

  function handleScanBarcode() {
    toast.info(
      'Scanner unavailable',
      'Barcode scanning needs camera/hardware access not available in this environment — use Add New Batch instead.',
    );
  }

  function handleAddBatch(entry: Omit<InventoryBatchRow, 'id'>) {
    addStockBatch(entry);
    setModal(null);
    toast.success('Batch added', `${entry.medicationName} batch ${entry.batchNo} added.`);
  }

  function handleAdjustStock(id: string, newQty: number, newReorderLevel: number) {
    adjustStockQty(id, newQty);
    updateReorderLevel(id, newReorderLevel);
    setModal(null);
    toast.success('Quantity updated', 'Batch stock quantity has been adjusted.');
  }

  function handleToggleHold(row: InventoryBatchRow) {
    toggleBatchHold(row.id);
    toast.success(
      row.isOnHold ? 'Hold released' : 'Batch on hold',
      `${row.medicationName} batch ${row.batchNo} ${row.isOnHold ? 'is back in active stock' : 'is now quarantined'}.`,
    );
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
            Batch Management
          </span>
        </nav>

        {/* Header */}
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1
              className="font-display font-semibold"
              style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
            >
              Batch Management
            </h1>
            <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
              Manage and track medication batches, expiry dates, and batch status.
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
            <button
              type="button"
              onClick={() => setModal({ type: 'add' })}
              className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
              style={{ fontSize: 14, background: '#00B4D8' }}
            >
              <Plus style={{ width: 15, height: 15 }} />
              Add New Batch
            </button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="mt-5 grid grid-cols-2 gap-3.5 sm:grid-cols-3 xl:grid-cols-6 xl:gap-4">
          <StatCard
            icon={Package}
            label="Total Batches"
            value={totalBatches}
            info="All time"
            accent="#0D2630"
            iconBg="rgba(13,38,48,0.08)"
          />
          <StatCard
            icon={CalendarClock}
            label="Active Batches"
            value={activeCount}
            info="In stock"
            accent="#2563EB"
            iconBg="rgba(37,99,235,0.1)"
            onClick={() => filterByStatus('Active')}
          />
          <StatCard
            icon={Hourglass}
            label="Expiring Soon"
            value={expiringSoonCount}
            info="Within 60 days"
            accent="#7C3AED"
            iconBg="rgba(124,58,237,0.1)"
            onClick={() => filterByStatus('Expiring Soon')}
          />
          <StatCard
            icon={CalendarX2}
            label="Expired Batches"
            value={expiredCount}
            info="Expired"
            accent="#D97706"
            iconBg="rgba(217,119,6,0.1)"
            onClick={() => filterByStatus('Expired')}
          />
          <StatCard
            icon={Lock}
            label="On Hold / Quarantine"
            value={onHoldCount}
            info="On hold"
            accent="#DC2626"
            iconBg="rgba(220,38,38,0.1)"
            onClick={() => filterByStatus('On Hold / Quarantine')}
          />
          <StatCard
            icon={Banknote}
            label="Total Value (In Stock)"
            value={formatCurrencyCompact(totalValue)}
            info="Across all batches"
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
                  className={`shrink-0 font-sans font-medium transition-colors duration-150 hover:underline ${FOCUS_RING}`}
                  style={{ fontSize: 14, color: '#00B4D8' }}
                >
                  {moreFiltersOpen ? 'Fewer Filters' : 'More Filters'}
                </button>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <FormSelect
                  id="batch-medication-filter"
                  value={medicationFilter}
                  onChange={(v) => {
                    setMedicationFilter(v);
                    setCurrentPage(1);
                  }}
                  options={medicationOptions}
                  placeholder="All Medications"
                />
                <FormSelect
                  id="batch-status-filter"
                  value={statusFilter}
                  onChange={(v) => {
                    setStatusFilter(v);
                    setCurrentPage(1);
                  }}
                  options={BATCH_STATUS_OPTIONS}
                  placeholder="All Statuses"
                />
                <FormSelect
                  id="batch-location-filter"
                  value={locationFilter}
                  onChange={(v) => {
                    setLocationFilter(v);
                    setCurrentPage(1);
                  }}
                  options={INVENTORY_LOCATION_OPTIONS}
                  placeholder="All Locations"
                />
                {moreFiltersOpen && (
                  <FormSelect
                    id="batch-date-filter"
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
                  Batch List ({filtered.length})
                </h2>
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
                        Batch No.
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
                    <div className="w-40 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Manufacturer
                      </span>
                    </div>
                    <div className="w-32 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Mfg. Date
                      </span>
                    </div>
                    <div className="w-36 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Expiry Date
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
                    <div className="w-40 shrink-0 py-2.5 pr-2 pl-3">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Status
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
                        No batches match your filters
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

                  {pageRows.map(({ row, status, daysLeft }) => {
                    const statusCfg = STATUS_CFG[status];
                    return (
                      <div
                        key={row.id}
                        className="flex items-center transition-colors duration-100 hover:bg-[#F5FBFD]"
                        style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                      >
                        <div className="w-28 shrink-0 py-3 pr-2 pl-3">
                          <Tooltip content={row.batchNo}>
                            <p
                              className="truncate font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {row.batchNo}
                            </p>
                          </Tooltip>
                        </div>
                        <div className="min-w-[160px] flex-1 py-3 pr-2">
                          <Tooltip content={row.medicationName}>
                            <p
                              className="truncate font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {row.medicationName}
                            </p>
                          </Tooltip>
                          <Tooltip content={`${row.strength} ${row.form}`}>
                            <p className="truncate" style={{ fontSize: 14, color: '#8A98A3' }}>
                              {row.strength} {row.form}
                            </p>
                          </Tooltip>
                        </div>
                        <div className="w-40 shrink-0 py-3 pr-2">
                          <Tooltip content={row.manufacturer ?? '—'}>
                            <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                              {row.manufacturer ?? '—'}
                            </p>
                          </Tooltip>
                        </div>
                        <div className="w-32 shrink-0 py-3 pr-2">
                          <p style={{ fontSize: 14, color: '#4A7080' }}>
                            {row.mfgDate ? formatDate(row.mfgDate) : '—'}
                          </p>
                        </div>
                        <div className="w-36 shrink-0 py-3 pr-2">
                          <p style={{ fontSize: 14, color: '#0D2630' }}>
                            {formatDate(row.expiryDate)}
                          </p>
                          <p
                            style={{
                              fontSize: 14,
                              color:
                                daysLeft < 0 ? '#DC2626' : daysLeft <= 60 ? '#D97706' : '#8A98A3',
                            }}
                          >
                            {daysLeft >= 0
                              ? `${daysLeft} days left`
                              : `${Math.abs(daysLeft)} days ago`}
                          </p>
                        </div>
                        <div className="w-44 shrink-0 py-3 pr-2">
                          <Tooltip content={getPharmacyLocation(row.locationId).name}>
                            <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                              {getPharmacyLocation(row.locationId).name}
                            </p>
                          </Tooltip>
                        </div>
                        <div className="w-24 shrink-0 py-3 pr-2 text-right">
                          <p style={{ fontSize: 14, color: '#0D2630' }}>
                            {row.stockQty.toLocaleString('en-GB')}
                          </p>
                        </div>
                        <div className="w-40 shrink-0 py-3 pr-2 pl-3">
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
                            {status}
                          </span>
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
                            onView={() => setModal({ type: 'detail', row })}
                            onAdjust={() => setModal({ type: 'adjust', row })}
                            onToggleHold={() => handleToggleHold(row)}
                            onTransfer={() => router.push(ROUTES.pharmacyTransfers)}
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
                  itemLabel="batches"
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
                Batch Status Overview
              </h2>
              <div className="mt-3 flex items-center gap-5">
                <AnimatedDonutChart
                  breakdown={donutBreakdown}
                  total={totalBatches}
                  ariaLabel="Batch status overview donut chart"
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
                        {totalBatches > 0 ? Math.round((d.value / totalBatches) * 100) : 0}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <p className="mt-3" style={{ fontSize: 14, color: '#8A98A3' }}>
                Total {totalBatches.toLocaleString('en-GB')}
              </p>
            </div>

            <div
              className="rounded-[12px] p-4"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Expiry Calendar (Next 90 Days)
              </h2>
              <div className="mt-3 flex flex-col gap-2.5">
                <div
                  className="flex items-center justify-between gap-2 rounded-[8px] px-3 py-2.5"
                  style={{ background: 'rgba(220,38,38,0.06)' }}
                >
                  <span
                    className="flex items-center gap-2"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    <AlertTriangle style={{ width: 14, height: 14, color: '#DC2626' }} />
                    Within 30 days
                  </span>
                  <span
                    className="font-sans font-medium"
                    style={{ fontSize: 14, color: '#DC2626' }}
                  >
                    {expiryCalendar.within30} batches
                  </span>
                </div>
                <div
                  className="flex items-center justify-between gap-2 rounded-[8px] px-3 py-2.5"
                  style={{ background: 'rgba(217,119,6,0.06)' }}
                >
                  <span
                    className="flex items-center gap-2"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    <AlertTriangle style={{ width: 14, height: 14, color: '#D97706' }} />
                    31 – 60 days
                  </span>
                  <span
                    className="font-sans font-medium"
                    style={{ fontSize: 14, color: '#D97706' }}
                  >
                    {expiryCalendar.d31to60} batches
                  </span>
                </div>
                <div
                  className="flex items-center justify-between gap-2 rounded-[8px] px-3 py-2.5"
                  style={{ background: 'rgba(0,180,216,0.06)' }}
                >
                  <span
                    className="flex items-center gap-2"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    <AlertTriangle style={{ width: 14, height: 14, color: '#00B4D8' }} />
                    61 – 90 days
                  </span>
                  <span
                    className="font-sans font-medium"
                    style={{ fontSize: 14, color: '#00B4D8' }}
                  >
                    {expiryCalendar.d61to90} batches
                  </span>
                </div>
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
                <button
                  type="button"
                  onClick={() => setModal({ type: 'add' })}
                  className={`flex items-center justify-between gap-2 rounded-[8px] px-2.5 py-2.5 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                >
                  <span className="flex items-center gap-2.5">
                    <Plus style={{ width: 16, height: 16, color: '#00B4D8' }} />
                    <span style={{ fontSize: 14, color: '#0D2630' }}>Add New Batch</span>
                  </span>
                  <span style={{ fontSize: 14, color: '#00B4D8' }}>→</span>
                </button>
                <button
                  type="button"
                  onClick={handleScanBarcode}
                  className={`flex items-center justify-between gap-2 rounded-[8px] px-2.5 py-2.5 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                >
                  <span className="flex items-center gap-2.5">
                    <ScanLine style={{ width: 16, height: 16, color: '#00B4D8' }} />
                    <span style={{ fontSize: 14, color: '#0D2630' }}>Scan Barcode</span>
                  </span>
                  <span style={{ fontSize: 14, color: '#00B4D8' }}>→</span>
                </button>
                <button
                  type="button"
                  onClick={() => router.push(ROUTES.pharmacyExpiry)}
                  className={`flex items-center justify-between gap-2 rounded-[8px] px-2.5 py-2.5 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                >
                  <span className="flex items-center gap-2.5">
                    <CalendarClock style={{ width: 16, height: 16, color: '#00B4D8' }} />
                    <span style={{ fontSize: 14, color: '#0D2630' }}>View Expiry Report</span>
                  </span>
                  <span style={{ fontSize: 14, color: '#00B4D8' }}>→</span>
                </button>
                <button
                  type="button"
                  onClick={() => router.push(ROUTES.pharmacyTransfers)}
                  className={`flex items-center justify-between gap-2 rounded-[8px] px-2.5 py-2.5 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                >
                  <span className="flex items-center gap-2.5">
                    <ArrowLeftRight style={{ width: 16, height: 16, color: '#00B4D8' }} />
                    <span style={{ fontSize: 14, color: '#0D2630' }}>Batch Transfer</span>
                  </span>
                  <span style={{ fontSize: 14, color: '#00B4D8' }}>→</span>
                </button>
                <button
                  type="button"
                  onClick={handleExport}
                  className={`flex items-center justify-between gap-2 rounded-[8px] px-2.5 py-2.5 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                >
                  <span className="flex items-center gap-2.5">
                    <Download style={{ width: 16, height: 16, color: '#00B4D8' }} />
                    <span style={{ fontSize: 14, color: '#0D2630' }}>Export Batch List</span>
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
            Ensure batch information is accurate and updated. Items are automatically marked expired
            after the expiry date.
          </p>
        </div>

        <div className="h-4" />
      </div>

      {modal?.type === 'add' && (
        <AddStockModal onSubmit={handleAddBatch} onClose={() => setModal(null)} />
      )}
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
