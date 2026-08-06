'use client';

import {
  AlertTriangle,
  Box,
  CheckCircle2,
  Download,
  Info,
  MoreVertical,
  Package,
  Settings,
  ShoppingCart,
  Sliders,
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
import {
  ScrollableTable,
  TABLE_HEADER_BG,
  TABLE_HEADER_STICKY_CLASS,
} from '@components/shared/ScrollableTable';
import { StatCard } from '@components/shared/StatCard';
import { Tooltip } from '@components/shared/Tooltip';
import { getPharmacyLocation } from '@/constants/pharmacyLocations';
import { ROUTES } from '@/constants/routes';
import { useToast } from '@/hooks/useToast';
import { downloadCSV } from '@/utils/export';
import {
  ALERT_LEVEL_OPTIONS,
  getBatchDaysOfStock,
  getStockAlertLevel,
  INVENTORY_CATEGORY_OPTIONS,
  INVENTORY_LOCATION_OPTIONS,
  type InventoryBatchRow,
  type StockAlertLevel,
} from '@/features/pharmacy/__mocks__/pharmacyFixtures';
import {
  adjustStockQty,
  updateReorderLevel,
  useInventoryBatches,
} from '@/features/pharmacy/store/inventoryStore';
import type { AlertSettings } from '@/features/pharmacy/components/AlertSettingsModal';

const AdjustStockModal = dynamic(
  () => import('@/features/pharmacy/components/AdjustStockModal').then((m) => m.AdjustStockModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);
const BatchDetailModal = dynamic(
  () => import('@/features/pharmacy/components/BatchDetailModal').then((m) => m.BatchDetailModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);
const AlertSettingsModal = dynamic(
  () =>
    import('@/features/pharmacy/components/AlertSettingsModal').then((m) => m.AlertSettingsModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const LEVEL_CFG: Record<StockAlertLevel, { color: string; border: string; bg: string }> = {
  Critical: { color: '#DC2626', border: 'rgba(220,38,38,0.35)', bg: 'rgba(220,38,38,0.08)' },
  'Low Stock': { color: '#D97706', border: 'rgba(217,119,6,0.35)', bg: 'rgba(217,119,6,0.08)' },
  'Reorder Recommended': {
    color: '#2563EB',
    border: 'rgba(37,99,235,0.35)',
    bg: 'rgba(37,99,235,0.08)',
  },
  'All Good': { color: '#16A34A', border: 'rgba(22,163,74,0.35)', bg: 'rgba(22,163,74,0.08)' },
};

type ModalState =
  | { type: 'adjust'; row: InventoryBatchRow }
  | { type: 'detail'; row: InventoryBatchRow }
  | { type: 'settings' }
  | null;

function RowMenu({
  row,
  onView,
  onAdjust,
  onPurchaseOrder,
}: {
  row: InventoryBatchRow;
  onView: () => void;
  onAdjust: () => void;
  onPurchaseOrder: () => void;
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
            onPurchaseOrder();
          }}
          className="flex w-full items-center px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD]"
          style={{ fontSize: 14, color: '#2F3A40' }}
        >
          Create Purchase Order
        </button>
      </RowMenuPortal>
    </div>
  );
}

export function LowStockAlertsWorkspace() {
  const router = useRouter();
  const toast = useToast();

  const [alertSettings, setAlertSettings] = useState<AlertSettings>({
    criticalDays: 3,
    lowStockDays: 7,
  });

  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(8);
  const [modal, setModal] = useState<ModalState>(null);

  const allBatches = useInventoryBatches();

  const withLevel = useMemo(
    () =>
      allBatches.map((row) => ({
        row,
        level: getStockAlertLevel(row, alertSettings.criticalDays, alertSettings.lowStockDays),
        daysOfStock: getBatchDaysOfStock(row),
      })),
    [allBatches, alertSettings],
  );

  const totalItems = allBatches.length;
  const critical = withLevel.filter((r) => r.level === 'Critical');
  const lowStock = withLevel.filter((r) => r.level === 'Low Stock');
  const reorderRecommended = withLevel.filter((r) => r.level === 'Reorder Recommended');
  const allGood = withLevel.filter((r) => r.level === 'All Good');

  const donutBreakdown = [
    { label: 'Critical (Out Soon)', value: critical.length, color: LEVEL_CFG.Critical.color },
    { label: 'Low Stock', value: lowStock.length, color: LEVEL_CFG['Low Stock'].color },
    {
      label: 'Reorder Recommended',
      value: reorderRecommended.length,
      color: LEVEL_CFG['Reorder Recommended'].color,
    },
    { label: 'All Good', value: allGood.length, color: LEVEL_CFG['All Good'].color },
  ];

  const alerted = useMemo(() => withLevel.filter((r) => r.level !== 'All Good'), [withLevel]);

  const topLowStock = useMemo(
    () => [...alerted].sort((a, b) => a.daysOfStock - b.daysOfStock).slice(0, 5),
    [alerted],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return alerted.filter(({ row, level }) => {
      if (levelFilter && level !== levelFilter) return false;
      if (categoryFilter && row.category !== categoryFilter) return false;
      if (locationFilter && row.locationId !== locationFilter) return false;
      if (
        q &&
        !row.medicationName.toLowerCase().includes(q) &&
        !row.batchNo.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [alerted, search, levelFilter, categoryFilter, locationFilter]);

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => a.daysOfStock - b.daysOfStock),
    [filtered],
  );

  const pageStart = (currentPage - 1) * rowsPerPage;
  const pageRows = sorted.slice(pageStart, pageStart + rowsPerPage);

  function handleClearFilters() {
    setSearch('');
    setLevelFilter('');
    setCategoryFilter('');
    setLocationFilter('');
    setCurrentPage(1);
  }

  function handleApplyFilters() {
    toast.success(
      'Filters applied',
      `${filtered.length} item${filtered.length !== 1 ? 's' : ''} match your filters.`,
    );
  }

  function filterByLevel(level: StockAlertLevel) {
    setLevelFilter(level);
    setCurrentPage(1);
  }

  function handleExport() {
    const rows = [
      [
        'Medication',
        'Strength/Form',
        'Location',
        'Current Stock',
        'Reorder Level',
        'Days of Stock',
        'Alert Level',
      ],
      ...filtered.map(({ row, level, daysOfStock }) => [
        row.medicationName,
        `${row.strength} ${row.form}`,
        getPharmacyLocation(row.locationId).name,
        String(row.stockQty),
        String(row.reorderLevel),
        `${daysOfStock} days`,
        level,
      ]),
    ];
    downloadCSV('low-stock-alerts', rows);
    toast.success('Export ready', `${filtered.length} items downloaded as CSV.`);
  }

  function handleCreatePurchaseOrder(row: InventoryBatchRow) {
    router.push(ROUTES.pharmacyProcurementRequests);
    toast.info(
      'Opening Procurement Requests',
      `Start a request for ${row.medicationName} from there.`,
    );
  }

  function handleAdjustReorderLevelsQuickAction() {
    setLevelFilter('Reorder Recommended');
    setCurrentPage(1);
    toast.info(
      'Filtered to Reorder Recommended',
      'Use each row’s Adjust Stock action to update its reorder level.',
    );
  }

  function handleAdjustStock(id: string, newQty: number, newReorderLevel: number) {
    adjustStockQty(id, newQty);
    updateReorderLevel(id, newReorderLevel);
    setModal(null);
    toast.success('Quantity updated', 'Stock quantity and reorder level have been adjusted.');
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
            Low Stock Alerts
          </span>
        </nav>

        {/* Header */}
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1
              className="font-display font-semibold"
              style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
            >
              Low Stock Alerts
            </h1>
            <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
              Monitor medications running low and reorder on time to avoid stockouts.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setModal({ type: 'settings' })}
              className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
              style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
            >
              <Settings style={{ width: 15, height: 15 }} />
              Alert Settings
            </button>
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
            label="Critical (Out Soon)"
            value={critical.length}
            info={`Stock will last ≤ ${alertSettings.criticalDays} days`}
            accent="#DC2626"
            iconBg="rgba(220,38,38,0.1)"
            onClick={() => filterByLevel('Critical')}
          />
          <StatCard
            icon={Info}
            label="Low Stock"
            value={lowStock.length}
            info={`Stock will last ≤ ${alertSettings.lowStockDays} days`}
            accent="#D97706"
            iconBg="rgba(217,119,6,0.1)"
            onClick={() => filterByLevel('Low Stock')}
          />
          <StatCard
            icon={Truck}
            label="Reorder Recommended"
            value={reorderRecommended.length}
            info="Below reorder level"
            accent="#2563EB"
            iconBg="rgba(37,99,235,0.1)"
            onClick={() => filterByLevel('Reorder Recommended')}
          />
          <StatCard
            icon={CheckCircle2}
            label="All Good"
            value={allGood.length}
            info="Sufficient stock"
            accent="#16A34A"
            iconBg="rgba(22,163,74,0.1)"
            onClick={() => filterByLevel('All Good')}
          />
          <StatCard
            icon={Box}
            label="Total Items"
            value={totalItems}
            info="In inventory"
            accent="#7C3AED"
            iconBg="rgba(124,58,237,0.1)"
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
                  <Package
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
                    placeholder="Search by medication or batch no..."
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
                  id="alert-level-filter"
                  value={levelFilter}
                  onChange={(v) => {
                    setLevelFilter(v);
                    setCurrentPage(1);
                  }}
                  options={ALERT_LEVEL_OPTIONS}
                  placeholder="All Levels"
                />
                <FormSelect
                  id="alert-category-filter"
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
                    id="alert-location-filter"
                    value={locationFilter}
                    onChange={(v) => {
                      setLocationFilter(v);
                      setCurrentPage(1);
                    }}
                    options={INVENTORY_LOCATION_OPTIONS}
                    placeholder="All Locations"
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
                  Low Stock Items ({filtered.length})
                </h2>
                <ScrollableTable minWidth={1340} maxHeight={640} className="mt-3">
                  <div
                    className={`flex rounded-t-[8px] ${TABLE_HEADER_STICKY_CLASS}`}
                    style={{
                      background: TABLE_HEADER_BG,
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
                    <div className="w-44 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Location
                      </span>
                    </div>
                    <div className="w-36 shrink-0 py-2.5 pr-3 text-right">
                      <span
                        className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Current Stock
                      </span>
                    </div>
                    <div className="w-36 shrink-0 py-2.5 pr-3 text-right">
                      <span
                        className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Reorder Level
                      </span>
                    </div>
                    <div className="w-36 shrink-0 py-2.5 pr-2 pl-3">
                      <span
                        className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Days of Stock
                      </span>
                    </div>
                    <div className="w-48 shrink-0 py-2.5 pr-2 pl-3">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Alert Level
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
                        <Package style={{ width: 24, height: 24, color: '#8A98A3' }} />
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

                  {pageRows.map(({ row, level, daysOfStock }) => {
                    const cfg = LEVEL_CFG[level];
                    return (
                      <div
                        key={row.id}
                        className="flex items-center transition-colors duration-100 hover:bg-[#F5FBFD]"
                        style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                      >
                        <div className="min-w-[160px] flex-1 py-3 pr-2 pl-3">
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
                        <div className="w-44 shrink-0 py-3 pr-2">
                          <Tooltip content={getPharmacyLocation(row.locationId).name}>
                            <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                              {getPharmacyLocation(row.locationId).name}
                            </p>
                          </Tooltip>
                        </div>
                        <div className="w-36 shrink-0 py-3 pr-3 text-right">
                          <p style={{ fontSize: 14, color: '#0D2630' }}>
                            {row.stockQty.toLocaleString('en-GB')}
                          </p>
                        </div>
                        <div className="w-36 shrink-0 py-3 pr-3 text-right">
                          <p style={{ fontSize: 14, color: '#4A7080' }}>
                            {row.reorderLevel.toLocaleString('en-GB')}
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
                            {daysOfStock} days
                          </span>
                        </div>
                        <div className="w-48 shrink-0 py-3 pr-2 pl-3">
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
                            {level}
                          </span>
                        </div>
                        <div className="flex w-24 shrink-0 items-center justify-end gap-1 py-3 pr-3">
                          <button
                            type="button"
                            onClick={() => setModal({ type: 'detail', row })}
                            aria-label={`View batch ${row.batchNo}`}
                            className={`flex size-11 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
                          >
                            <Package style={{ width: 15, height: 15, color: '#4A7080' }} />
                          </button>
                          <RowMenu
                            row={row}
                            onView={() => setModal({ type: 'detail', row })}
                            onAdjust={() => setModal({ type: 'adjust', row })}
                            onPurchaseOrder={() => handleCreatePurchaseOrder(row)}
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
          </div>

          {/* Sidebar */}
          <div className="flex w-full shrink-0 flex-col gap-4 xl:w-[340px]">
            <div
              className="rounded-[12px] p-4"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Alerts by Level
              </h2>
              <div className="mt-3 flex items-center gap-5">
                <AnimatedDonutChart
                  breakdown={donutBreakdown}
                  total={totalItems}
                  ariaLabel="Alerts by level donut chart"
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
              <div className="flex items-center justify-between gap-2">
                <h2
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Top Low Stock Items
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setLevelFilter('');
                    setCurrentPage(1);
                  }}
                  className={`font-sans font-medium transition-colors duration-150 hover:underline ${FOCUS_RING}`}
                  style={{ fontSize: 14, color: '#00B4D8' }}
                >
                  View All
                </button>
              </div>
              <div className="mt-3 flex flex-col gap-3">
                {topLowStock.map(({ row, daysOfStock }, i) => (
                  <div key={row.id} className="flex items-center gap-2.5">
                    <span
                      className="flex size-5 shrink-0 items-center justify-center rounded-full font-sans font-medium"
                      style={{ fontSize: 14, background: 'rgba(0,180,216,0.1)', color: '#00B4D8' }}
                    >
                      {i + 1}
                    </span>
                    <Tooltip content={`${row.medicationName} ${row.strength}`}>
                      <p
                        className="min-w-0 flex-1 truncate font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {row.medicationName} {row.strength}
                      </p>
                    </Tooltip>
                    <span
                      className="shrink-0"
                      style={{ fontSize: 14, color: daysOfStock <= 3 ? '#DC2626' : '#D97706' }}
                    >
                      {daysOfStock} days
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
                  { icon: Download, label: 'Generate Low Stock Report', onClick: handleExport },
                  {
                    icon: ShoppingCart,
                    label: 'Create Purchase Order',
                    onClick: () => router.push(ROUTES.pharmacyProcurementRequests),
                  },
                  {
                    icon: Sliders,
                    label: 'Adjust Reorder Levels',
                    onClick: handleAdjustReorderLevelsQuickAction,
                  },
                  {
                    icon: Users,
                    label: 'Manage Suppliers',
                    onClick: () => router.push(ROUTES.pharmacySuppliers),
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
            Low stock alerts are based on your average daily usage and current stock levels.
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
      {modal?.type === 'settings' && (
        <AlertSettingsModal
          settings={alertSettings}
          onChange={setAlertSettings}
          onClose={() => setModal(null)}
        />
      )}
    </main>
  );
}
