'use client';

import {
  AlertTriangle,
  Banknote,
  CalendarClock,
  Download,
  Eye,
  MoreVertical,
  Package,
  Repeat,
  Search,
  Upload,
  XCircle,
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
import {
  getInventoryRowStatus,
  INVENTORY_CATEGORY_OPTIONS,
  INVENTORY_LOCATION_OPTIONS,
  INVENTORY_STATUS_OPTIONS,
  type InventoryBatchRow,
  type InventoryStatus,
} from '@/features/pharmacy/__mocks__/pharmacyFixtures';
import {
  addStockBatch,
  adjustStockQty,
  updateReorderLevel,
  useInventoryBatches,
} from '@/features/pharmacy/store/inventoryStore';
import { useSupplierOptions } from '@/features/pharmacy/store/supplierStore';

const AddStockModal = dynamic(
  () => import('@/features/pharmacy/components/AddStockModal').then((m) => m.AddStockModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);
const AdjustStockModal = dynamic(
  () => import('@/features/pharmacy/components/AdjustStockModal').then((m) => m.AdjustStockModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const STATUS_CFG: Record<InventoryStatus, { color: string; border: string; bg: string }> = {
  'In Stock': { color: '#16A34A', border: 'rgba(22,163,74,0.35)', bg: 'rgba(22,163,74,0.08)' },
  'Low Stock': { color: '#D97706', border: 'rgba(217,119,6,0.35)', bg: 'rgba(217,119,6,0.08)' },
  'Out of Stock': { color: '#DC2626', border: 'rgba(220,38,38,0.35)', bg: 'rgba(220,38,38,0.08)' },
  'Expiring Soon': {
    color: '#7C3AED',
    border: 'rgba(124,58,237,0.35)',
    bg: 'rgba(124,58,237,0.08)',
  },
};

type ModalState = { type: 'add' } | { type: 'adjust'; row: InventoryBatchRow } | null;

function daysUntil(dateIso: string): number {
  return Math.round((new Date(dateIso).getTime() - Date.now()) / 86_400_000);
}

function RowMenu({
  row,
  onAdjust,
  onTransfer,
  onBatchHistory,
}: {
  row: InventoryBatchRow;
  onAdjust: () => void;
  onTransfer: () => void;
  onBatchHistory: () => void;
}) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`More actions for ${row.medicationName} batch ${row.batchNo}`}
        className={`flex size-11 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
      >
        <MoreVertical style={{ width: 15, height: 15, color: '#4A7080' }} />
      </button>
      <RowMenuPortal open={open} anchorRef={buttonRef} onClose={() => setOpen(false)} width={200}>
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
            onTransfer();
          }}
          className="flex w-full items-center px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD]"
          style={{ fontSize: 14, color: '#2F3A40' }}
        >
          Transfer Stock
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            onBatchHistory();
          }}
          className="flex w-full items-center px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD]"
          style={{ fontSize: 14, color: '#2F3A40' }}
        >
          View Batch History
        </button>
      </RowMenuPortal>
    </div>
  );
}

export function DrugInventoryWorkspace() {
  const router = useRouter();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supplierOptions = useSupplierOptions();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(8);
  const [modal, setModal] = useState<ModalState>(null);

  const allBatches = useInventoryBatches();

  const withStatus = useMemo(
    () => allBatches.map((row) => ({ row, status: getInventoryRowStatus(row) })),
    [allBatches],
  );

  const totalItems = allBatches.length;
  const totalStockValue = useMemo(
    () => allBatches.reduce((sum, r) => sum + r.stockQty * r.unitPrice, 0),
    [allBatches],
  );
  const lowStockCount = withStatus.filter((r) => r.status === 'Low Stock').length;
  const expiringSoonCount = withStatus.filter((r) => r.status === 'Expiring Soon').length;
  const outOfStockCount = withStatus.filter((r) => r.status === 'Out of Stock').length;
  const inStockCount = withStatus.filter((r) => r.status === 'In Stock').length;

  const donutBreakdown = [
    { label: 'In Stock', value: inStockCount, color: STATUS_CFG['In Stock'].color },
    { label: 'Low Stock', value: lowStockCount, color: STATUS_CFG['Low Stock'].color },
    { label: 'Out of Stock', value: outOfStockCount, color: STATUS_CFG['Out of Stock'].color },
    { label: 'Expiring Soon', value: expiringSoonCount, color: STATUS_CFG['Expiring Soon'].color },
  ];

  const topCategoriesByValue = useMemo(() => {
    const totals = new Map<string, number>();
    for (const r of allBatches)
      totals.set(r.category, (totals.get(r.category) ?? 0) + r.stockQty * r.unitPrice);
    return Array.from(totals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [allBatches]);

  const expiringRows = useMemo(
    () =>
      withStatus
        .filter((r) => r.status === 'Expiring Soon')
        .sort((a, b) => new Date(a.row.expiryDate).getTime() - new Date(b.row.expiryDate).getTime())
        .slice(0, 3)
        .map((r) => ({ ...r, daysLeft: daysUntil(r.row.expiryDate) })),
    [withStatus],
  );
  const lowStockRows = useMemo(
    () =>
      withStatus
        .filter((r) => r.status === 'Low Stock')
        .sort((a, b) => a.row.stockQty - b.row.stockQty)
        .slice(0, 3),
    [withStatus],
  );
  const outOfStockRows = useMemo(
    () => withStatus.filter((r) => r.status === 'Out of Stock').slice(0, 3),
    [withStatus],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return withStatus.filter(({ row, status }) => {
      if (categoryFilter && row.category !== categoryFilter) return false;
      if (supplierFilter && row.supplier !== supplierFilter) return false;
      if (locationFilter && row.locationId !== locationFilter) return false;
      if (statusFilter && status !== statusFilter) return false;
      if (
        q &&
        !row.medicationName.toLowerCase().includes(q) &&
        !row.batchNo.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [withStatus, search, categoryFilter, supplierFilter, locationFilter, statusFilter]);

  const pageStart = (currentPage - 1) * rowsPerPage;
  const pageRows = filtered.slice(pageStart, pageStart + rowsPerPage);

  function handleClearFilters() {
    setSearch('');
    setCategoryFilter('');
    setSupplierFilter('');
    setLocationFilter('');
    setStatusFilter('');
    setCurrentPage(1);
  }

  function handleApplyFilters() {
    toast.success(
      'Filters applied',
      `${filtered.length} item${filtered.length !== 1 ? 's' : ''} match your filters.`,
    );
  }

  function filterByStatus(status: InventoryStatus) {
    setStatusFilter(status);
    setCurrentPage(1);
  }

  function handleExport() {
    const rows = [
      [
        'Medication',
        'Strength/Form',
        'Category',
        'Location',
        'Batch No.',
        'Expiry Date',
        'Stock Qty',
        'Unit',
        'Status',
      ],
      ...filtered.map(({ row, status }) => [
        row.medicationName,
        `${row.strength} ${row.form}`,
        row.category,
        getPharmacyLocation(row.locationId).name,
        row.batchNo,
        formatDate(row.expiryDate),
        String(row.stockQty),
        row.unit,
        status,
      ]),
    ];
    downloadCSV('drug-inventory', rows);
    toast.success('Export ready', `${filtered.length} items downloaded as CSV.`);
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    toast.success('Import received', `${file.name} queued — our team will process this shortly.`);
  }

  function handleAddStock(entry: Omit<InventoryBatchRow, 'id'>) {
    addStockBatch(entry);
    setModal(null);
    toast.success(
      'Stock added',
      `${entry.medicationName} batch ${entry.batchNo} added to inventory.`,
    );
  }

  function handleAdjustStock(id: string, newQty: number, newReorderLevel: number) {
    adjustStockQty(id, newQty);
    updateReorderLevel(id, newReorderLevel);
    setModal(null);
    toast.success('Quantity updated', 'Stock quantity has been adjusted.');
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
            Drug Inventory
          </span>
        </nav>

        {/* Header */}
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1
              className="font-display font-semibold"
              style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
            >
              Drug Inventory
            </h1>
            <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
              Monitor stock levels, track expiry dates, and manage inventory across all locations.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setModal({ type: 'add' })}
              className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
              style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
            >
              <Package style={{ width: 15, height: 15 }} />
              Add Stock
            </button>
            <button
              type="button"
              onClick={handleImportClick}
              className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
              style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
            >
              <Upload style={{ width: 15, height: 15 }} />
              Import Stock
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleImportFile}
            />
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
            icon={Package}
            label="Total Items"
            value={totalItems}
            info="All medications"
            accent="#0D2630"
            iconBg="rgba(13,38,48,0.08)"
          />
          <StatCard
            icon={Banknote}
            label="Total Stock Value"
            value={formatCurrencyCompact(totalStockValue)}
            info={formatCurrency(totalStockValue)}
            accent="#16A34A"
            iconBg="rgba(22,163,74,0.1)"
          />
          <StatCard
            icon={AlertTriangle}
            label="Low Stock Items"
            value={lowStockCount}
            info="Require attention"
            accent="#D97706"
            iconBg="rgba(217,119,6,0.1)"
            onClick={() => filterByStatus('Low Stock')}
          />
          <StatCard
            icon={CalendarClock}
            label="Expiring Soon"
            value={expiringSoonCount}
            info="Within 60 days"
            accent="#7C3AED"
            iconBg="rgba(124,58,237,0.1)"
            onClick={() => filterByStatus('Expiring Soon')}
          />
          <StatCard
            icon={XCircle}
            label="Out of Stock"
            value={outOfStockCount}
            info="Unavailable items"
            accent="#DC2626"
            iconBg="rgba(220,38,38,0.1)"
            onClick={() => filterByStatus('Out of Stock')}
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
                    placeholder="Search by medication, generic name, or batch..."
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
                  id="inventory-category-filter"
                  value={categoryFilter}
                  onChange={(v) => {
                    setCategoryFilter(v);
                    setCurrentPage(1);
                  }}
                  options={INVENTORY_CATEGORY_OPTIONS}
                  placeholder="All Categories"
                />
                <FormSelect
                  id="inventory-supplier-filter"
                  value={supplierFilter}
                  onChange={(v) => {
                    setSupplierFilter(v);
                    setCurrentPage(1);
                  }}
                  options={supplierOptions}
                  placeholder="All Suppliers"
                />
                <FormSelect
                  id="inventory-location-filter"
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
                    id="inventory-status-filter"
                    value={statusFilter}
                    onChange={(v) => {
                      setStatusFilter(v);
                      setCurrentPage(1);
                    }}
                    options={INVENTORY_STATUS_OPTIONS}
                    placeholder="All Statuses"
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
                  Inventory List ({filtered.length})
                </h2>
                <ScrollableTable minWidth={1400} maxHeight={640} className="mt-3">
                  <div
                    className={`flex rounded-t-[8px] ${TABLE_HEADER_STICKY_CLASS}`}
                    style={{
                      background: TABLE_HEADER_BG,
                      borderBottom: '1px solid #E6F8FD',
                    }}
                  >
                    <div className="min-w-[170px] flex-1 py-2.5 pr-2 pl-3">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Medication
                      </span>
                    </div>
                    <div className="w-40 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Strength / Form
                      </span>
                    </div>
                    <div className="w-36 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Category
                      </span>
                    </div>
                    <div className="w-40 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Location
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
                    <div className="w-32 shrink-0 py-2.5 pr-4 text-right">
                      <span
                        className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Stock Qty
                      </span>
                    </div>
                    <div className="w-40 shrink-0 py-2.5 pr-2 pl-6">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Status
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
                        No inventory items match your filters
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

                  {pageRows.map(({ row, status }) => {
                    const statusCfg = STATUS_CFG[status];
                    return (
                      <div
                        key={row.id}
                        className="flex items-center transition-colors duration-100 hover:bg-[#F5FBFD]"
                        style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                      >
                        <div className="min-w-[170px] flex-1 py-3 pr-2 pl-3">
                          <Tooltip content={row.medicationName}>
                            <p
                              className="truncate font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {row.medicationName}
                            </p>
                          </Tooltip>
                          <Tooltip content={row.form}>
                            <p className="truncate" style={{ fontSize: 14, color: '#8A98A3' }}>
                              {row.form}
                            </p>
                          </Tooltip>
                        </div>
                        <div className="w-40 shrink-0 py-3 pr-2">
                          <Tooltip content={`${row.strength} ${row.form}`}>
                            <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                              {row.strength} {row.form}
                            </p>
                          </Tooltip>
                        </div>
                        <div className="w-36 shrink-0 py-3 pr-2">
                          <Tooltip content={row.category}>
                            <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                              {row.category}
                            </p>
                          </Tooltip>
                        </div>
                        <div className="w-40 shrink-0 py-3 pr-2">
                          <Tooltip content={getPharmacyLocation(row.locationId).name}>
                            <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                              {getPharmacyLocation(row.locationId).name}
                            </p>
                          </Tooltip>
                        </div>
                        <div className="w-28 shrink-0 py-3 pr-2">
                          <Tooltip content={row.batchNo}>
                            <p className="truncate" style={{ fontSize: 14, color: '#0D2630' }}>
                              {row.batchNo}
                            </p>
                          </Tooltip>
                        </div>
                        <div className="w-32 shrink-0 py-3 pr-2">
                          <p style={{ fontSize: 14, color: '#0D2630' }}>
                            {formatDate(row.expiryDate)}
                          </p>
                        </div>
                        <div className="w-32 shrink-0 py-3 pr-4 text-right">
                          <p
                            className="font-sans font-medium"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {row.stockQty.toLocaleString('en-GB')}
                          </p>
                          <p style={{ fontSize: 14, color: '#8A98A3' }}>{row.unit}s</p>
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
                        <div className="flex w-24 shrink-0 items-center justify-end gap-1 py-3 pr-3">
                          <button
                            type="button"
                            onClick={() => setModal({ type: 'adjust', row })}
                            aria-label={`View ${row.medicationName} batch ${row.batchNo}`}
                            className={`flex size-11 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
                          >
                            <Eye style={{ width: 15, height: 15, color: '#4A7080' }} />
                          </button>
                          <RowMenu
                            row={row}
                            onAdjust={() => setModal({ type: 'adjust', row })}
                            onTransfer={() => router.push(ROUTES.pharmacyTransfers)}
                            onBatchHistory={() => router.push(ROUTES.pharmacyBatchManagement)}
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
                  itemLabel="items"
                />
              </div>
            </div>

            {/* Bottom panels */}
            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div
                className="rounded-[12px] p-4"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <div className="flex items-center justify-between gap-2">
                  <h3
                    className="font-display font-semibold"
                    style={{ fontSize: 16, color: '#0D2630' }}
                  >
                    Expiring Soon
                  </h3>
                  <button
                    type="button"
                    onClick={() => filterByStatus('Expiring Soon')}
                    className={`font-sans font-medium transition-colors duration-150 hover:underline ${FOCUS_RING}`}
                    style={{ fontSize: 14, color: '#00B4D8' }}
                  >
                    View All
                  </button>
                </div>
                {expiringRows.length === 0 ? (
                  <p className="mt-3" style={{ fontSize: 14, color: '#8A98A3' }}>
                    Nothing expiring within 60 days.
                  </p>
                ) : (
                  <div className="mt-3 flex flex-col gap-3">
                    {expiringRows.map(({ row, daysLeft }) => {
                      return (
                        <div key={row.id} className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <Tooltip content={`${row.medicationName} ${row.strength}`}>
                              <p
                                className="truncate font-sans font-medium"
                                style={{ fontSize: 14, color: '#0D2630' }}
                              >
                                {row.medicationName} {row.strength}
                              </p>
                            </Tooltip>
                            <p style={{ fontSize: 14, color: '#8A98A3' }}>
                              {formatDate(row.expiryDate)}
                            </p>
                          </div>
                          <span
                            className="shrink-0 font-sans font-medium"
                            style={{ fontSize: 14, color: daysLeft < 0 ? '#DC2626' : '#7C3AED' }}
                          >
                            {daysLeft} days
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
                <p className="mt-3" style={{ fontSize: 14, color: '#8A98A3' }}>
                  Total {expiringSoonCount} items
                </p>
              </div>

              <div
                className="rounded-[12px] p-4"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <div className="flex items-center justify-between gap-2">
                  <h3
                    className="font-display font-semibold"
                    style={{ fontSize: 16, color: '#0D2630' }}
                  >
                    Low Stock Alerts
                  </h3>
                  <button
                    type="button"
                    onClick={() => filterByStatus('Low Stock')}
                    className={`font-sans font-medium transition-colors duration-150 hover:underline ${FOCUS_RING}`}
                    style={{ fontSize: 14, color: '#00B4D8' }}
                  >
                    View All
                  </button>
                </div>
                {lowStockRows.length === 0 ? (
                  <p className="mt-3" style={{ fontSize: 14, color: '#8A98A3' }}>
                    No items below reorder level.
                  </p>
                ) : (
                  <div className="mt-3 flex flex-col gap-3">
                    {lowStockRows.map(({ row }) => (
                      <div key={row.id} className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <Tooltip content={`${row.medicationName} ${row.strength}`}>
                            <p
                              className="truncate font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {row.medicationName} {row.strength}
                            </p>
                          </Tooltip>
                          <p style={{ fontSize: 14, color: '#8A98A3' }}>Qty {row.stockQty}</p>
                        </div>
                        <span className="shrink-0" style={{ fontSize: 14, color: '#8A98A3' }}>
                          Min: {row.reorderLevel}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <p className="mt-3" style={{ fontSize: 14, color: '#8A98A3' }}>
                  Total {lowStockCount} items
                </p>
              </div>

              <div
                className="rounded-[12px] p-4"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <div className="flex items-center justify-between gap-2">
                  <h3
                    className="font-display font-semibold"
                    style={{ fontSize: 16, color: '#0D2630' }}
                  >
                    Out of Stock Items
                  </h3>
                  <button
                    type="button"
                    onClick={() => filterByStatus('Out of Stock')}
                    className={`font-sans font-medium transition-colors duration-150 hover:underline ${FOCUS_RING}`}
                    style={{ fontSize: 14, color: '#00B4D8' }}
                  >
                    View All
                  </button>
                </div>
                {outOfStockRows.length === 0 ? (
                  <p className="mt-3" style={{ fontSize: 14, color: '#8A98A3' }}>
                    Nothing out of stock.
                  </p>
                ) : (
                  <div className="mt-3 flex flex-col gap-3">
                    {outOfStockRows.map(({ row }) => (
                      <div key={row.id} className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <Tooltip content={`${row.medicationName} ${row.strength}`}>
                            <p
                              className="truncate font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {row.medicationName} {row.strength}
                            </p>
                          </Tooltip>
                          <p style={{ fontSize: 14, color: '#8A98A3' }}>
                            {getPharmacyLocation(row.locationId).name}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <p className="mt-3" style={{ fontSize: 14, color: '#8A98A3' }}>
                  Total {outOfStockCount} items
                </p>
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
                Inventory Overview
              </h2>
              <div className="mt-3 flex items-center gap-5">
                <AnimatedDonutChart
                  breakdown={donutBreakdown}
                  total={totalItems}
                  ariaLabel="Inventory overview donut chart"
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
                        {d.value} ({totalItems > 0 ? Math.round((d.value / totalItems) * 100) : 0}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <p className="mt-3" style={{ fontSize: 14, color: '#8A98A3' }}>
                Total Items {totalItems.toLocaleString('en-GB')}
              </p>
            </div>

            <div
              className="rounded-[12px] p-4"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Top Categories by Value
              </h2>
              <div className="mt-3 flex flex-col gap-2.5">
                {topCategoriesByValue.map(([category, value]) => (
                  <div key={category} className="flex items-center justify-between gap-2">
                    <Tooltip content={category}>
                      <span className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                        {category}
                      </span>
                    </Tooltip>
                    <span
                      className="shrink-0 font-sans font-medium"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {formatCurrency(value)}
                    </span>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setMoreFiltersOpen(true)}
                className={`mt-3 flex items-center gap-1 font-sans font-medium transition-colors duration-150 hover:underline ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#00B4D8' }}
              >
                View All Categories →
              </button>
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
                  { icon: Package, label: 'Stock Receiving', href: ROUTES.pharmacyStockReceiving },
                  { icon: Repeat, label: 'Stock Transfers', href: ROUTES.pharmacyTransfers },
                  {
                    icon: AlertTriangle,
                    label: 'Stock Adjustments',
                    href: ROUTES.pharmacyStockAdjustments,
                  },
                  {
                    icon: CalendarClock,
                    label: 'Low Stock Alerts',
                    href: ROUTES.pharmacyLowStockAlerts,
                  },
                ].map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    onClick={() => router.push(action.href)}
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
          className="mt-5 flex items-start justify-between gap-3 rounded-[12px] p-4"
          style={{ background: 'rgba(0,180,216,0.06)', border: '1px solid rgba(0,180,216,0.25)' }}
        >
          <p style={{ fontSize: 14, color: '#0D2630' }}>
            Inventory data is updated in real time. Ensure regular stock checks and accurate
            entries.
          </p>
        </div>

        <div className="h-4" />
      </div>

      {modal?.type === 'add' && (
        <AddStockModal onSubmit={handleAddStock} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'adjust' && (
        <AdjustStockModal
          row={modal.row}
          onAdjust={handleAdjustStock}
          onClose={() => setModal(null)}
        />
      )}
    </main>
  );
}
