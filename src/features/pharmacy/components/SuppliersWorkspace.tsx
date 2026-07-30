'use client';

import {
  Ban,
  Clipboard,
  FileBarChart,
  FileText,
  MoreVertical,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  Star,
  UserCheck,
  UserX,
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
import { StarRating } from '@components/shared/StarRating';
import { StatCard } from '@components/shared/StatCard';
import { Tooltip } from '@components/shared/Tooltip';
import { ROUTES } from '@/constants/routes';
import { useToast } from '@/hooks/useToast';
import { formatCurrency, formatCurrencyCompact } from '@/utils/currency';
import { formatDate } from '@/utils/datetime';
import { downloadCSV } from '@/utils/export';
import {
  getSupplierDisplayStatus,
  SUPPLIER_CATEGORY_OPTIONS,
  SUPPLIER_LOCATION_OPTIONS,
  SUPPLIER_RATING_OPTIONS,
  SUPPLIER_STATUS_FILTER_OPTIONS,
  type SupplierInfo,
} from '@/features/pharmacy/__mocks__/pharmacyFixtures';
import {
  addSupplier,
  approveSupplier,
  rejectSupplier,
  setSupplierPreferred,
  toggleSupplierActive,
  useSuppliers,
} from '@/features/pharmacy/store/supplierStore';
import type { AddSupplierInput } from '@/features/pharmacy/store/supplierStore';

const AddSupplierModal = dynamic(
  () => import('@/features/pharmacy/components/AddSupplierModal').then((m) => m.AddSupplierModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);
const SupplierDetailModal = dynamic(
  () =>
    import('@/features/pharmacy/components/SupplierDetailModal').then((m) => m.SupplierDetailModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

type DisplayStatus = 'Active' | 'Preferred' | 'Pending Approval' | 'Inactive';

const STATUS_CFG: Record<DisplayStatus, { color: string; border: string; bg: string }> = {
  Active: { color: '#16A34A', border: 'rgba(22,163,74,0.35)', bg: 'rgba(22,163,74,0.08)' },
  Preferred: { color: '#7C3AED', border: 'rgba(124,58,237,0.35)', bg: 'rgba(124,58,237,0.08)' },
  'Pending Approval': {
    color: '#D97706',
    border: 'rgba(217,119,6,0.35)',
    bg: 'rgba(217,119,6,0.08)',
  },
  Inactive: { color: '#DC2626', border: 'rgba(220,38,38,0.35)', bg: 'rgba(220,38,38,0.08)' },
};

const CATEGORY_COLORS: Record<string, string> = {
  Pharmaceuticals: '#00B4D8',
  'Medical Supplies': '#F59E0B',
  'Medical Equipment': '#16A34A',
  'Laboratory Supplies': '#7C3AED',
  Others: '#8A98A3',
};

const AVATAR_PALETTE = [
  '#00B4D8',
  '#DC2626',
  '#7C3AED',
  '#2563EB',
  '#D97706',
  '#16A34A',
  '#EC4899',
];

function getInitials(name: string): string {
  const words = name.split(' ').filter(Boolean);
  return ((words[0]?.[0] ?? '') + (words[1]?.[0] ?? '')).toUpperCase();
}

function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash + name.charCodeAt(i)) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[hash]!;
}

type ModalState = { type: 'add' } | { type: 'detail'; supplier: SupplierInfo } | null;

function RowMenu({
  supplier,
  onView,
  onApprove,
  onReject,
  onTogglePreferred,
  onToggleActive,
}: {
  supplier: SupplierInfo;
  onView: () => void;
  onApprove: () => void;
  onReject: () => void;
  onTogglePreferred: () => void;
  onToggleActive: () => void;
}) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`More actions for ${supplier.name}`}
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
        {supplier.status === 'Pending Approval' && (
          <>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onApprove();
              }}
              className="flex w-full items-center px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD]"
              style={{ fontSize: 14, color: '#16A34A' }}
            >
              Approve
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onReject();
              }}
              className="flex w-full items-center px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD]"
              style={{ fontSize: 14, color: '#DC2626' }}
            >
              Reject
            </button>
          </>
        )}
        {supplier.status === 'Active' && (
          <>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onTogglePreferred();
              }}
              className="flex w-full items-center px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD]"
              style={{ fontSize: 14, color: '#2F3A40' }}
            >
              {supplier.isPreferred ? 'Remove Preferred' : 'Mark as Preferred'}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onToggleActive();
              }}
              className="flex w-full items-center px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD]"
              style={{ fontSize: 14, color: '#DC2626' }}
            >
              Deactivate
            </button>
          </>
        )}
        {supplier.status === 'Inactive' && (
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onToggleActive();
            }}
            className="flex w-full items-center px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD]"
            style={{ fontSize: 14, color: '#16A34A' }}
          >
            Reactivate
          </button>
        )}
      </RowMenuPortal>
    </div>
  );
}

export function SuppliersWorkspace() {
  const router = useRouter();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [ratingFilter, setRatingFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(8);
  const [modal, setModal] = useState<ModalState>(null);

  const allSuppliers = useSuppliers();

  const withDisplayStatus = useMemo(
    () => allSuppliers.map((s) => ({ supplier: s, displayStatus: getSupplierDisplayStatus(s) })),
    [allSuppliers],
  );

  const totalSuppliers = allSuppliers.length;
  const activeSuppliers = allSuppliers.filter((s) => s.status === 'Active').length;
  const preferredSuppliers = allSuppliers.filter((s) => s.isPreferred).length;
  const pendingApproval = allSuppliers.filter((s) => s.status === 'Pending Approval').length;
  const inactiveSuppliers = allSuppliers.filter((s) => s.status === 'Inactive').length;
  const totalSpendYTD = allSuppliers.reduce((sum, s) => sum + s.totalSpendYTD, 0);

  const categoryBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of allSuppliers) counts.set(s.category, (counts.get(s.category) ?? 0) + 1);
    return [...counts.entries()]
      .map(([label, value]) => ({ label, value, color: CATEGORY_COLORS[label] ?? '#8A98A3' }))
      .sort((a, b) => b.value - a.value);
  }, [allSuppliers]);

  const topBySpend = useMemo(
    () =>
      [...allSuppliers]
        .filter((s) => s.totalSpendYTD > 0)
        .sort((a, b) => b.totalSpendYTD - a.totalSpendYTD)
        .slice(0, 5),
    [allSuppliers],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return withDisplayStatus.filter(({ supplier: s, displayStatus }) => {
      if (statusFilter && displayStatus !== statusFilter) return false;
      if (categoryFilter && s.category !== categoryFilter) return false;
      if (ratingFilter && s.performanceRating < Number(ratingFilter)) return false;
      if (locationFilter && s.location !== locationFilter) return false;
      if (
        q &&
        !s.name.toLowerCase().includes(q) &&
        !s.contactPerson.toLowerCase().includes(q) &&
        !s.email.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [withDisplayStatus, search, statusFilter, categoryFilter, ratingFilter, locationFilter]);

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => a.supplier.name.localeCompare(b.supplier.name)),
    [filtered],
  );

  const pageStart = (currentPage - 1) * rowsPerPage;
  const pageRows = sorted.slice(pageStart, pageStart + rowsPerPage);

  function handleClearFilters() {
    setSearch('');
    setStatusFilter('');
    setCategoryFilter('');
    setRatingFilter('');
    setLocationFilter('');
    setCurrentPage(1);
  }

  function handleApplyFilters() {
    toast.success(
      'Filters applied',
      `${filtered.length} supplier${filtered.length !== 1 ? 's' : ''} match your filters.`,
    );
  }

  function handleExport() {
    const rows = [
      [
        'Supplier Name',
        'Category',
        'Contact Person',
        'Phone',
        'Email',
        'Location',
        'Performance Rating',
        'Status',
        'Last Order Date',
        'Total Spend (YTD)',
      ],
      ...filtered.map(({ supplier: s, displayStatus }) => [
        s.name,
        s.category,
        s.contactPerson,
        s.phone,
        s.email,
        s.location,
        s.performanceRating > 0 ? s.performanceRating.toFixed(1) : 'Not rated',
        displayStatus,
        s.lastOrderDate ? formatDate(s.lastOrderDate) : 'No orders yet',
        formatCurrency(s.totalSpendYTD),
      ]),
    ];
    downloadCSV('suppliers', rows);
    toast.success('Export ready', `${filtered.length} suppliers downloaded as CSV.`);
  }

  function handleAddSupplier(input: AddSupplierInput) {
    const code = addSupplier(input);
    setModal(null);
    toast.success('Supplier added', `${input.name} (${code}) is pending approval.`);
  }

  function handleApprove(name: string) {
    approveSupplier(name);
    setModal(null);
    toast.success('Supplier approved', `${name} is now active and selectable.`);
  }

  function handleReject(name: string) {
    rejectSupplier(name);
    setModal(null);
    toast.info('Supplier rejected', `${name} has been marked inactive.`);
  }

  function handleTogglePreferred(name: string, isPreferred: boolean) {
    setSupplierPreferred(name, isPreferred);
    setModal(null);
    toast.success(
      isPreferred ? 'Marked as preferred' : 'Preferred removed',
      `${name} has been updated.`,
    );
  }

  function handleToggleActive(name: string) {
    toggleSupplierActive(name);
    setModal(null);
    toast.success('Status updated', `${name}'s status has been updated.`);
  }

  function handleSupplierContracts() {
    setStatusFilter('Preferred');
    setCurrentPage(1);
    toast.info(
      'Showing preferred suppliers',
      'Preferred suppliers are the contracted high-priority partners.',
    );
  }

  function handleBlacklistQuickAction() {
    setStatusFilter('Active');
    setCurrentPage(1);
    toast.info('Showing active suppliers', "Use a supplier's row menu to deactivate/blacklist it.");
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
            Suppliers
          </span>
        </nav>

        {/* Header */}
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1
              className="font-display font-semibold"
              style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
            >
              Suppliers
            </h1>
            <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
              Manage and maintain supplier information and performance.
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
              onClick={() => setModal({ type: 'add' })}
              className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
              style={{ fontSize: 14, background: '#00B4D8' }}
            >
              <Plus style={{ width: 15, height: 15 }} />
              Add Supplier
            </button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="mt-5 grid grid-cols-2 gap-3.5 sm:grid-cols-3 xl:grid-cols-6 xl:gap-4">
          <StatCard
            icon={Clipboard}
            label="Total Suppliers"
            value={totalSuppliers}
            info="All suppliers"
            accent="#0D2630"
            iconBg="rgba(13,38,48,0.08)"
            onClick={() => {
              setStatusFilter('');
              setCurrentPage(1);
            }}
          />
          <StatCard
            icon={UserCheck}
            label="Active Suppliers"
            value={activeSuppliers}
            info={`${totalSuppliers > 0 ? ((activeSuppliers / totalSuppliers) * 100).toFixed(1) : 0}% of total`}
            accent="#16A34A"
            iconBg="rgba(22,163,74,0.1)"
            onClick={() => {
              setStatusFilter('Active');
              setCurrentPage(1);
            }}
          />
          <StatCard
            icon={Star}
            label="Preferred Suppliers"
            value={preferredSuppliers}
            info="High priority partners"
            accent="#7C3AED"
            iconBg="rgba(124,58,237,0.1)"
            onClick={() => {
              setStatusFilter('Preferred');
              setCurrentPage(1);
            }}
          />
          <StatCard
            icon={Users}
            label="Pending Approval"
            value={pendingApproval}
            info="Awaiting review"
            accent="#D97706"
            iconBg="rgba(217,119,6,0.1)"
            onClick={() => {
              setStatusFilter('Pending Approval');
              setCurrentPage(1);
            }}
          />
          <StatCard
            icon={UserX}
            label="Inactive Suppliers"
            value={inactiveSuppliers}
            info="Not active"
            accent="#DC2626"
            iconBg="rgba(220,38,38,0.1)"
            onClick={() => {
              setStatusFilter('Inactive');
              setCurrentPage(1);
            }}
          />
          <StatCard
            icon={ShoppingBag}
            label="Total Spend (YTD)"
            value={formatCurrencyCompact(totalSpendYTD)}
            info={`From ${activeSuppliers} suppliers`}
            accent="#00B4D8"
            iconBg="rgba(0,180,216,0.1)"
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
                    placeholder="Search by supplier name, contact, or email..."
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
                  id="sup-status-filter"
                  value={statusFilter}
                  onChange={(v) => {
                    setStatusFilter(v);
                    setCurrentPage(1);
                  }}
                  options={SUPPLIER_STATUS_FILTER_OPTIONS}
                  placeholder="All Statuses"
                />
                <FormSelect
                  id="sup-category-filter"
                  value={categoryFilter}
                  onChange={(v) => {
                    setCategoryFilter(v);
                    setCurrentPage(1);
                  }}
                  options={SUPPLIER_CATEGORY_OPTIONS}
                  placeholder="All Categories"
                />
                <FormSelect
                  id="sup-rating-filter"
                  value={ratingFilter}
                  onChange={(v) => {
                    setRatingFilter(v);
                    setCurrentPage(1);
                  }}
                  options={SUPPLIER_RATING_OPTIONS}
                  placeholder="All Ratings"
                />
                {moreFiltersOpen && (
                  <FormSelect
                    id="sup-location-filter"
                    value={locationFilter}
                    onChange={(v) => {
                      setLocationFilter(v);
                      setCurrentPage(1);
                    }}
                    options={SUPPLIER_LOCATION_OPTIONS}
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
                  Suppliers List ({filtered.length})
                </h2>
                <div className="mt-3 overflow-x-auto scroll-smooth">
                  <div style={{ minWidth: 1560 }}>
                    <div
                      className="flex rounded-t-[8px]"
                      style={{
                        background: 'rgba(226,237,241,0.4)',
                        borderBottom: '1px solid #E6F8FD',
                      }}
                    >
                      <div className="min-w-[170px] flex-1 py-2.5 pr-2 pl-3">
                        <span
                          className="font-sans font-bold tracking-wider uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Supplier Name
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
                          Contact Person
                        </span>
                      </div>
                      <div className="w-48 shrink-0 py-2.5 pr-2">
                        <span
                          className="font-sans font-bold tracking-wider uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Phone / Email
                        </span>
                      </div>
                      <div className="w-36 shrink-0 py-2.5 pr-2">
                        <span
                          className="font-sans font-bold tracking-wider uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Location
                        </span>
                      </div>
                      <div className="w-36 shrink-0 py-2.5 pr-2 pl-3">
                        <span
                          className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Performance
                        </span>
                      </div>
                      <div className="w-36 shrink-0 py-2.5 pr-2 pl-3">
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
                          Last Order
                        </span>
                      </div>
                      <div className="w-36 shrink-0 py-2.5 pr-2 text-right">
                        <span
                          className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Total Spend
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
                          No suppliers match your filters
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

                    {pageRows.map(({ supplier: s, displayStatus }) => {
                      const statusCfg = STATUS_CFG[displayStatus];
                      return (
                        <div
                          key={s.code}
                          className="flex items-center transition-colors duration-100 hover:bg-[#F5FBFD]"
                          style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                        >
                          <div className="flex min-w-[170px] flex-1 items-center gap-2.5 py-3 pr-2 pl-3">
                            <div
                              className="flex size-9 shrink-0 items-center justify-center rounded-full font-sans font-semibold text-white"
                              style={{ fontSize: 14, background: avatarColor(s.name) }}
                            >
                              {getInitials(s.name)}
                            </div>
                            <Tooltip content={s.name}>
                              <p
                                className="truncate font-sans font-medium"
                                style={{ fontSize: 14, color: '#0D2630' }}
                              >
                                {s.name}
                              </p>
                            </Tooltip>
                          </div>
                          <div className="w-36 shrink-0 py-3 pr-2">
                            <p style={{ fontSize: 14, color: '#4A7080' }}>{s.category}</p>
                          </div>
                          <div className="w-40 shrink-0 py-3 pr-2">
                            <Tooltip content={s.contactPerson}>
                              <p className="truncate" style={{ fontSize: 14, color: '#0D2630' }}>
                                {s.contactPerson}
                              </p>
                            </Tooltip>
                          </div>
                          <div className="w-48 shrink-0 py-3 pr-2">
                            <Tooltip content={s.phone}>
                              <p className="truncate" style={{ fontSize: 14, color: '#0D2630' }}>
                                {s.phone}
                              </p>
                            </Tooltip>
                            <Tooltip content={s.email}>
                              <p className="truncate" style={{ fontSize: 14, color: '#8A98A3' }}>
                                {s.email}
                              </p>
                            </Tooltip>
                          </div>
                          <div className="w-36 shrink-0 py-3 pr-2">
                            <Tooltip content={s.location}>
                              <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                                {s.location}
                              </p>
                            </Tooltip>
                          </div>
                          <div className="w-36 shrink-0 py-3 pr-2 pl-3">
                            {s.performanceRating > 0 ? (
                              <StarRating rating={s.performanceRating} />
                            ) : (
                              <span style={{ fontSize: 14, color: '#8A98A3' }}>—</span>
                            )}
                          </div>
                          <div className="w-36 shrink-0 py-3 pr-2 pl-3">
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
                              {displayStatus}
                            </span>
                          </div>
                          <div className="w-32 shrink-0 py-3 pr-2">
                            <p style={{ fontSize: 14, color: '#4A7080' }}>
                              {s.lastOrderDate ? formatDate(s.lastOrderDate) : '—'}
                            </p>
                          </div>
                          <div className="w-36 shrink-0 py-3 pr-2 text-right">
                            <p
                              className="font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {formatCurrency(s.totalSpendYTD)}
                            </p>
                          </div>
                          <div className="flex w-20 shrink-0 items-center justify-end gap-1 py-3 pr-3">
                            <button
                              type="button"
                              onClick={() => setModal({ type: 'detail', supplier: s })}
                              aria-label={`View ${s.name}`}
                              className={`flex size-11 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
                            >
                              <ShieldCheck style={{ width: 15, height: 15, color: '#4A7080' }} />
                            </button>
                            <RowMenu
                              supplier={s}
                              onView={() => setModal({ type: 'detail', supplier: s })}
                              onApprove={() => handleApprove(s.name)}
                              onReject={() => handleReject(s.name)}
                              onTogglePreferred={() =>
                                handleTogglePreferred(s.name, !s.isPreferred)
                              }
                              onToggleActive={() => handleToggleActive(s.name)}
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
                  itemLabel="suppliers"
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
                Suppliers by Category
              </h2>
              <div className="mt-3 flex items-center gap-5">
                <AnimatedDonutChart
                  breakdown={categoryBreakdown}
                  total={totalSuppliers}
                  ariaLabel="Suppliers by category donut chart"
                />
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  {categoryBreakdown.map((d) => (
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
                        {totalSuppliers > 0 ? ((d.value / totalSuppliers) * 100).toFixed(1) : 0}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <p className="mt-3" style={{ fontSize: 14, color: '#8A98A3' }}>
                Total {totalSuppliers.toLocaleString('en-GB')}
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
                  Top Suppliers by Spend (YTD)
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
              <div className="mt-3 flex flex-col gap-2.5">
                {topBySpend.map((s, i) => (
                  <button
                    key={s.code}
                    type="button"
                    onClick={() => setModal({ type: 'detail', supplier: s })}
                    className={`flex items-center gap-2.5 rounded-[8px] p-1.5 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                  >
                    <span
                      className="flex size-5 shrink-0 items-center justify-center rounded-full font-sans font-medium"
                      style={{ fontSize: 14, background: 'rgba(0,180,216,0.1)', color: '#00B4D8' }}
                    >
                      {i + 1}
                    </span>
                    <Tooltip content={s.name}>
                      <span
                        className="min-w-0 flex-1 truncate"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {s.name}
                      </span>
                    </Tooltip>
                    <span
                      className="shrink-0 font-sans font-medium"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {formatCurrencyCompact(s.totalSpendYTD)}
                    </span>
                  </button>
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
                  {
                    icon: Plus,
                    label: 'Add New Supplier',
                    onClick: () => setModal({ type: 'add' }),
                  },
                  {
                    icon: FileBarChart,
                    label: 'Supplier Performance Report',
                    onClick: handleExport,
                  },
                  {
                    icon: FileText,
                    label: 'Supplier Contracts',
                    onClick: handleSupplierContracts,
                  },
                  {
                    icon: ShoppingBag,
                    label: 'Purchase History',
                    onClick: () => router.push(ROUTES.pharmacyStockReceiving),
                  },
                  {
                    icon: Ban,
                    label: 'Blacklist Supplier',
                    onClick: handleBlacklistQuickAction,
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
            Maintain accurate supplier information and performance data to ensure quality service
            and timely delivery.
          </p>
        </div>

        <div className="h-4" />
      </div>

      {modal?.type === 'add' && (
        <AddSupplierModal onSubmit={handleAddSupplier} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'detail' && (
        <SupplierDetailModal
          supplier={modal.supplier}
          onApprove={handleApprove}
          onReject={handleReject}
          onTogglePreferred={handleTogglePreferred}
          onToggleActive={handleToggleActive}
          onClose={() => setModal(null)}
        />
      )}
    </main>
  );
}
