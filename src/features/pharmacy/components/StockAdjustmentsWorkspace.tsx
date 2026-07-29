'use client';

import {
  ArrowDown,
  ArrowUp,
  Banknote,
  CheckCircle2,
  ClipboardList,
  Eye,
  History,
  Plus,
  Search,
  Truck,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { AnimatedDonutChart } from '@components/shared/AnimatedDonutChart';
import { FormSelect } from '@components/shared/FormSelect';
import { ModalLoadingFallback } from '@components/shared/ModalLoadingFallback';
import { Pagination } from '@components/shared/Pagination';
import { Tooltip } from '@components/shared/Tooltip';
import { StatCard } from '@components/shared/StatCard';
import { getPharmacyLocation } from '@/constants/pharmacyLocations';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { formatCurrency, formatCurrencyCompact } from '@/utils/currency';
import { formatDateTime } from '@/utils/datetime';
import { downloadCSV } from '@/utils/export';
import { REGISTRATION_DATE_OPTIONS } from '@/features/registration/__mocks__/patientDirectoryFixtures';
import {
  ADJUSTMENT_REASON_OPTIONS,
  ADJUSTMENT_TYPE_OPTIONS,
  getAdjustmentQty,
  getAdjustmentValueImpact,
  INVENTORY_LOCATION_OPTIONS,
  type AdjustmentReason,
  type StockAdjustment,
} from '@/features/pharmacy/__mocks__/pharmacyFixtures';
import { createAdjustment, useAdjustments } from '@/features/pharmacy/store/stockAdjustmentStore';

const NewAdjustmentModal = dynamic(
  () =>
    import('@/features/pharmacy/components/NewAdjustmentModal').then((m) => m.NewAdjustmentModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);
const AdjustmentDetailModal = dynamic(
  () =>
    import('@/features/pharmacy/components/AdjustmentDetailModal').then(
      (m) => m.AdjustmentDetailModal,
    ),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const TYPE_CFG = {
  Increase: { color: '#16A34A', border: 'rgba(22,163,74,0.35)', bg: 'rgba(22,163,74,0.08)' },
  Decrease: { color: '#DC2626', border: 'rgba(220,38,38,0.35)', bg: 'rgba(220,38,38,0.08)' },
} as const;

const REASON_COLORS: Record<string, string> = {
  'Expired Items': '#DC2626',
  'Stock Count Adjustment': '#2563EB',
  'Damaged Items': '#D97706',
  'Patient Return': '#16A34A',
  Spillage: '#7C3AED',
  Others: '#8A98A3',
};
const DONUT_REASONS = [
  'Expired Items',
  'Stock Count Adjustment',
  'Damaged Items',
  'Patient Return',
  'Spillage',
];

type ModalState =
  | { type: 'new'; reason?: AdjustmentReason }
  | { type: 'detail'; adjustment: StockAdjustment }
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

function isThisMonth(iso: string): boolean {
  return isWithinRange(iso, 'this-month');
}

function donutReasonFor(reason: string): string {
  return DONUT_REASONS.includes(reason) ? reason : 'Others';
}

export function StockAdjustmentsWorkspace() {
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const actorName = user?.name ?? 'Pharmacist';

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [reasonFilter, setReasonFilter] = useState('');
  const [referenceFilter, setReferenceFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(8);
  const [modal, setModal] = useState<ModalState>(null);

  const allAdjustments = useAdjustments();

  const totalAdjustments = allAdjustments.length;
  const thisMonthAdjustments = useMemo(
    () => allAdjustments.filter((a) => isThisMonth(a.adjustedAt)),
    [allAdjustments],
  );
  const monthLabel = new Intl.DateTimeFormat('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'Africa/Lagos',
  }).format(new Date());

  const totalItemsAdjusted = useMemo(
    () => thisMonthAdjustments.reduce((sum, a) => sum + getAdjustmentQty(a), 0),
    [thisMonthAdjustments],
  );
  const increaseQty = useMemo(
    () =>
      thisMonthAdjustments
        .filter((a) => a.adjustmentType === 'Increase')
        .reduce((sum, a) => sum + getAdjustmentQty(a), 0),
    [thisMonthAdjustments],
  );
  const decreaseQty = useMemo(
    () =>
      thisMonthAdjustments
        .filter((a) => a.adjustmentType === 'Decrease')
        .reduce((sum, a) => sum + getAdjustmentQty(a), 0),
    [thisMonthAdjustments],
  );
  const increaseValue = useMemo(
    () =>
      thisMonthAdjustments
        .filter((a) => a.adjustmentType === 'Increase')
        .reduce((sum, a) => sum + getAdjustmentValueImpact(a), 0),
    [thisMonthAdjustments],
  );
  const decreaseValue = useMemo(
    () =>
      thisMonthAdjustments
        .filter((a) => a.adjustmentType === 'Decrease')
        .reduce((sum, a) => sum + Math.abs(getAdjustmentValueImpact(a)), 0),
    [thisMonthAdjustments],
  );
  const netValueImpact = increaseValue - decreaseValue;

  const donutBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of allAdjustments) {
      const key = donutReasonFor(a.reason);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...DONUT_REASONS, 'Others']
      .map((label) => ({ label, value: counts.get(label) ?? 0, color: REASON_COLORS[label]! }))
      .filter((d) => d.value > 0);
  }, [allAdjustments]);
  const donutTotal = donutBreakdown.reduce((sum, d) => sum + d.value, 0);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allAdjustments.filter((a) => {
      if (typeFilter && a.adjustmentType !== typeFilter) return false;
      if (reasonFilter && a.reason !== reasonFilter) return false;
      if (locationFilter && a.locationId !== locationFilter) return false;
      if (dateFilter && !isWithinRange(a.adjustedAt, dateFilter)) return false;
      if (
        referenceFilter &&
        !(a.referenceNo ?? '').toLowerCase().includes(referenceFilter.trim().toLowerCase())
      )
        return false;
      if (
        q &&
        !a.id.toLowerCase().includes(q) &&
        !a.items.some((i) => i.medicationName.toLowerCase().includes(q))
      )
        return false;
      return true;
    });
  }, [
    allAdjustments,
    search,
    typeFilter,
    reasonFilter,
    locationFilter,
    dateFilter,
    referenceFilter,
  ]);

  const pageStart = (currentPage - 1) * rowsPerPage;
  const pageRows = filtered.slice(pageStart, pageStart + rowsPerPage);

  function handleClearFilters() {
    setSearch('');
    setTypeFilter('');
    setReasonFilter('');
    setReferenceFilter('');
    setLocationFilter('');
    setDateFilter('');
    setCurrentPage(1);
  }

  function handleApplyFilters() {
    toast.success(
      'Filters applied',
      `${filtered.length} adjustment${filtered.length !== 1 ? 's' : ''} match your filters.`,
    );
  }

  function handleViewHistory() {
    handleClearFilters();
    toast.info(
      'Showing full adjustment history',
      'All types, reasons, and locations are visible in the table below.',
    );
  }

  function handleExport() {
    const rows = [
      [
        'Adjustment ID',
        'Date & Time',
        'Location',
        'Type',
        'Reason',
        'Items',
        'Qty',
        'Value Impact',
        'Adjusted By',
        'Reference',
      ],
      ...filtered.map((a) => {
        const qty = getAdjustmentQty(a);
        const impact = getAdjustmentValueImpact(a);
        return [
          a.id,
          formatDateTime(a.adjustedAt),
          getPharmacyLocation(a.locationId).name,
          a.adjustmentType,
          a.reason,
          String(a.items.length),
          String(qty),
          `${impact >= 0 ? '+' : '-'}${formatCurrency(Math.abs(impact))}`,
          a.adjustedBy,
          a.referenceNo ?? '',
        ];
      }),
    ];
    downloadCSV('stock-adjustments', rows);
    toast.success('Export ready', `${filtered.length} adjustments downloaded as CSV.`);
  }

  function handleCreate(input: Parameters<typeof createAdjustment>[0]) {
    const id = createAdjustment(input, actorName);
    setModal(null);
    toast.success('Adjustment recorded', `${id} confirmed — Drug Inventory updated.`);
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
            Stock Adjustments
          </span>
        </nav>

        {/* Header */}
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1
              className="font-display font-semibold"
              style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
            >
              Stock Adjustments
            </h1>
            <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
              Adjust stock quantities due to physical count, damage, expiry, or other reasons.
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
              View Adjustment History
            </button>
            <button
              type="button"
              onClick={() => setModal({ type: 'new' })}
              className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
              style={{ fontSize: 14, background: '#00B4D8' }}
            >
              <Plus style={{ width: 15, height: 15 }} />
              New Adjustment
            </button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="mt-5 grid grid-cols-2 gap-3.5 sm:grid-cols-3 xl:grid-cols-6 xl:gap-4">
          <StatCard
            icon={ClipboardList}
            label="Total Adjustments"
            value={totalAdjustments}
            info="All time"
            accent="#0D2630"
            iconBg="rgba(13,38,48,0.08)"
          />
          <StatCard
            icon={Truck}
            label="Adjustments"
            value={thisMonthAdjustments.length}
            info={monthLabel}
            accent="#2563EB"
            iconBg="rgba(37,99,235,0.1)"
          />
          <StatCard
            icon={CheckCircle2}
            label="Total Items Adjusted"
            value={totalItemsAdjusted}
            info="This month"
            accent="#7C3AED"
            iconBg="rgba(124,58,237,0.1)"
          />
          <StatCard
            icon={ArrowUp}
            label="Increase"
            value={`+${increaseQty.toLocaleString('en-GB')}`}
            info="Items"
            accent="#16A34A"
            iconBg="rgba(22,163,74,0.1)"
            onClick={() => {
              setTypeFilter('Increase');
              setCurrentPage(1);
            }}
          />
          <StatCard
            icon={ArrowDown}
            label="Decrease"
            value={`-${decreaseQty.toLocaleString('en-GB')}`}
            info="Items"
            accent="#DC2626"
            iconBg="rgba(220,38,38,0.1)"
            onClick={() => {
              setTypeFilter('Decrease');
              setCurrentPage(1);
            }}
          />
          <StatCard
            icon={Banknote}
            label="Total Value Impact"
            value={formatCurrencyCompact(netValueImpact)}
            info="This month"
            accent={netValueImpact >= 0 ? '#16A34A' : '#DC2626'}
            iconBg={netValueImpact >= 0 ? 'rgba(22,163,74,0.1)' : 'rgba(220,38,38,0.1)'}
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
                    placeholder="Search by medication or adjustment ID..."
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
                  id="adj-type-filter"
                  value={typeFilter}
                  onChange={(v) => {
                    setTypeFilter(v);
                    setCurrentPage(1);
                  }}
                  options={ADJUSTMENT_TYPE_OPTIONS}
                  placeholder="All Types"
                />
                <FormSelect
                  id="adj-reason-filter"
                  value={reasonFilter}
                  onChange={(v) => {
                    setReasonFilter(v);
                    setCurrentPage(1);
                  }}
                  options={ADJUSTMENT_REASON_OPTIONS}
                  placeholder="All Reasons"
                />
                <FormSelect
                  id="adj-location-filter"
                  value={locationFilter}
                  onChange={(v) => {
                    setLocationFilter(v);
                    setCurrentPage(1);
                  }}
                  options={INVENTORY_LOCATION_OPTIONS}
                  placeholder="All Locations"
                />
                {moreFiltersOpen && (
                  <>
                    <input
                      type="text"
                      value={referenceFilter}
                      onChange={(e) => {
                        setReferenceFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                      placeholder="Reference No. (Optional)"
                      className={`h-11 w-full rounded-[10px] px-3.5 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                      style={{
                        fontSize: 14,
                        border: '1px solid rgba(0,100,130,0.18)',
                        color: '#0D2630',
                      }}
                    />
                    <FormSelect
                      id="adj-date-filter"
                      value={dateFilter}
                      onChange={(v) => {
                        setDateFilter(v);
                        setCurrentPage(1);
                      }}
                      options={REGISTRATION_DATE_OPTIONS}
                      placeholder="All Dates"
                    />
                  </>
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
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleExport}
                    className={`flex h-9 items-center gap-1.5 rounded-[8px] px-3 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                    style={{
                      fontSize: 14,
                      color: '#0D2630',
                      border: '1px solid rgba(0,100,130,0.18)',
                    }}
                  >
                    Export Report
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
              </div>

              {/* Table */}
              <div className="mt-4">
                <h2
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Adjustments List ({filtered.length})
                </h2>
                <div className="mt-3 overflow-x-auto scroll-smooth">
                  <div style={{ minWidth: 1380 }}>
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
                          Adjustment ID
                        </span>
                      </div>
                      <div className="w-32 shrink-0 py-2.5 pr-2">
                        <span
                          className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Date & Time
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
                      <div className="w-32 shrink-0 py-2.5 pr-2 pl-3">
                        <span
                          className="font-sans font-bold tracking-wider uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Type
                        </span>
                      </div>
                      <div className="w-44 shrink-0 py-2.5 pr-2">
                        <span
                          className="font-sans font-bold tracking-wider uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Reason
                        </span>
                      </div>
                      <div className="w-28 shrink-0 py-2.5 pr-2 text-right">
                        <span
                          className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Items / Qty
                        </span>
                      </div>
                      <div className="w-32 shrink-0 py-2.5 pr-2 text-right">
                        <span
                          className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Value Impact
                        </span>
                      </div>
                      <div className="w-36 shrink-0 py-2.5 pr-2">
                        <span
                          className="font-sans font-bold tracking-wider uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Adjusted By
                        </span>
                      </div>
                      <div className="min-w-[90px] flex-1 py-2.5 pr-2">
                        <span
                          className="font-sans font-bold tracking-wider uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Reference
                        </span>
                      </div>
                      <div className="w-16 shrink-0 py-2.5 pr-3 text-right">
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
                          No adjustments match your filters
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

                    {pageRows.map((a) => {
                      const typeCfg = TYPE_CFG[a.adjustmentType];
                      const qty = getAdjustmentQty(a);
                      const impact = getAdjustmentValueImpact(a);
                      return (
                        <div
                          key={a.id}
                          className="flex items-center transition-colors duration-100 hover:bg-[#F5FBFD]"
                          style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                        >
                          <div className="w-32 shrink-0 py-3 pr-2 pl-3">
                            <Tooltip content={a.id}>
                              <p
                                className="truncate font-sans font-medium"
                                style={{ fontSize: 14, color: '#0D2630' }}
                              >
                                {a.id}
                              </p>
                            </Tooltip>
                          </div>
                          <div className="w-32 shrink-0 py-3 pr-2">
                            <p style={{ fontSize: 14, color: '#4A7080' }}>
                              {formatDateTime(a.adjustedAt)}
                            </p>
                          </div>
                          <div className="w-44 shrink-0 py-3 pr-2">
                            <Tooltip content={getPharmacyLocation(a.locationId).name}>
                              <p className="truncate" style={{ fontSize: 14, color: '#0D2630' }}>
                                {getPharmacyLocation(a.locationId).name}
                              </p>
                            </Tooltip>
                          </div>
                          <div className="w-32 shrink-0 py-3 pr-2 pl-3">
                            <span
                              className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium"
                              style={{
                                fontSize: 14,
                                whiteSpace: 'nowrap',
                                color: typeCfg.color,
                                border: `1px solid ${typeCfg.border}`,
                                background: typeCfg.bg,
                              }}
                            >
                              {a.adjustmentType}
                            </span>
                          </div>
                          <div className="w-44 shrink-0 py-3 pr-2">
                            <Tooltip content={a.reason}>
                              <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                                {a.reason}
                              </p>
                            </Tooltip>
                          </div>
                          <div className="w-28 shrink-0 py-3 pr-2 text-right">
                            <p style={{ fontSize: 14, color: '#0D2630' }}>
                              {a.items.length} items / {qty.toLocaleString('en-GB')}
                            </p>
                          </div>
                          <div className="w-32 shrink-0 py-3 pr-2 text-right">
                            <p
                              className="font-sans font-medium"
                              style={{ fontSize: 14, color: impact >= 0 ? '#16A34A' : '#DC2626' }}
                            >
                              {impact >= 0 ? '+' : '-'}
                              {formatCurrency(Math.abs(impact))}
                            </p>
                          </div>
                          <div className="w-36 shrink-0 py-3 pr-2">
                            <Tooltip content={a.adjustedBy}>
                              <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                                {a.adjustedBy}
                              </p>
                            </Tooltip>
                          </div>
                          <div className="min-w-[90px] flex-1 py-3 pr-2">
                            <Tooltip content={a.referenceNo ?? '—'}>
                              <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                                {a.referenceNo ?? '—'}
                              </p>
                            </Tooltip>
                          </div>
                          <div className="flex w-16 shrink-0 items-center justify-end py-3 pr-3">
                            <button
                              type="button"
                              onClick={() => setModal({ type: 'detail', adjustment: a })}
                              aria-label={`View ${a.id}`}
                              className={`flex size-11 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
                            >
                              <Eye style={{ width: 15, height: 15, color: '#4A7080' }} />
                            </button>
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
                  itemLabel="adjustments"
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
                Adjustment Reasons
              </h2>
              <div className="mt-3 flex items-center gap-5">
                <AnimatedDonutChart
                  breakdown={donutBreakdown}
                  total={donutTotal}
                  ariaLabel="Adjustment reasons donut chart"
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
                Value Impact (This Month)
              </h2>
              <div className="mt-3 grid grid-cols-2 gap-2.5">
                <div
                  className="rounded-[10px] p-3"
                  style={{
                    background: 'rgba(22,163,74,0.06)',
                    border: '1px solid rgba(22,163,74,0.2)',
                  }}
                >
                  <p className="font-sans font-semibold" style={{ fontSize: 16, color: '#16A34A' }}>
                    +{formatCurrency(increaseValue)}
                  </p>
                  <p style={{ fontSize: 14, color: '#4A7080' }}>Total Increase</p>
                </div>
                <div
                  className="rounded-[10px] p-3"
                  style={{
                    background: 'rgba(220,38,38,0.06)',
                    border: '1px solid rgba(220,38,38,0.2)',
                  }}
                >
                  <p className="font-sans font-semibold" style={{ fontSize: 16, color: '#DC2626' }}>
                    -{formatCurrency(decreaseValue)}
                  </p>
                  <p style={{ fontSize: 14, color: '#4A7080' }}>Total Decrease</p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <span style={{ fontSize: 14, color: '#4A7080' }}>Net Impact</span>
                <span
                  className="font-sans font-semibold"
                  style={{ fontSize: 14, color: netValueImpact >= 0 ? '#16A34A' : '#DC2626' }}
                >
                  {netValueImpact >= 0 ? '+' : '-'}
                  {formatCurrency(Math.abs(netValueImpact))}
                </span>
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
                  { icon: Plus, label: 'New Adjustment', onClick: () => setModal({ type: 'new' }) },
                  {
                    icon: ClipboardList,
                    label: 'Stock Count',
                    onClick: () => setModal({ type: 'new', reason: 'Stock Count Adjustment' }),
                  },
                  { icon: History, label: 'View Adjustment History', onClick: handleViewHistory },
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
            Ensure all adjustments are properly documented and supported with valid reasons or
            references.
          </p>
        </div>

        <div className="h-4" />
      </div>

      {modal?.type === 'new' && (
        <NewAdjustmentModal
          {...(modal.reason ? { initialReason: modal.reason } : {})}
          onSubmit={handleCreate}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'detail' && (
        <AdjustmentDetailModal adjustment={modal.adjustment} onClose={() => setModal(null)} />
      )}
    </main>
  );
}
