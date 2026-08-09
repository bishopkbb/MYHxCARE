'use client';

import {
  Ban,
  CheckCircle2,
  Clipboard,
  ClipboardList,
  Download,
  ExternalLink,
  Eye,
  MoreVertical,
  Plus,
  Search,
  Star,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { ModalLoadingFallback } from '@components/shared/ModalLoadingFallback';
import { Pagination } from '@components/shared/Pagination';
import { PermissionGate } from '@components/shared/PermissionGate';
import { RowMenuPortal } from '@components/shared/RowMenuPortal';
import {
  ScrollableTable,
  TABLE_HEADER_BG,
  TABLE_HEADER_STICKY_CLASS,
} from '@components/shared/ScrollableTable';
import { FilterDropdown, type FilterDef } from '@components/shared/FilterDropdown';
import { Tooltip } from '@components/shared/Tooltip';
import { PERMISSIONS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { formatCurrency, formatCurrencyCompact } from '@/utils/currency';
import { formatHumanDate } from '@/utils/datetime';
import { downloadCSV } from '@/utils/export';
import {
  SUPPLIER_CATEGORY_OPTIONS,
  SUPPLIER_LOCATION_OPTIONS,
  SUPPLIER_RATING_OPTIONS,
  supplierAvatarColor,
  supplierInitials,
  type Supplier,
} from '@/features/laboratory/__mocks__/supplierFixtures';
import {
  getSupplierSummary,
  setSupplierPreferred,
  setSupplierStatus,
  useSuppliers,
} from '@/features/laboratory/store/supplierStore';

const AddSupplierModal = dynamic(
  () => import('./AddSupplierModal').then((m) => m.AddSupplierModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);
const SupplierDetailModal = dynamic(
  () => import('./SupplierDetailModal').then((m) => m.SupplierDetailModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';
const ROWS_PER_PAGE = 10;

type DisplayStatus = 'Active' | 'Preferred' | 'Pending Evaluation' | 'Blacklisted' | 'Inactive';

function displayStatusOf(s: Supplier): DisplayStatus {
  if (s.isPreferred && s.status === 'Active') return 'Preferred';
  return s.status;
}

const STATUS_CFG: Record<DisplayStatus, { color: string; bg: string; border: string }> = {
  Active: { color: '#16A34A', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.35)' },
  Preferred: { color: '#7C3AED', bg: 'rgba(124,58,237,0.1)', border: 'rgba(124,58,237,0.35)' },
  'Pending Evaluation': {
    color: '#B45309',
    bg: 'rgba(245,158,11,0.1)',
    border: 'rgba(245,158,11,0.35)',
  },
  Blacklisted: { color: '#DC2626', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.35)' },
  Inactive: { color: '#64748B', bg: 'rgba(100,116,139,0.1)', border: 'rgba(100,116,139,0.35)' },
};

function StatusBadge({ status }: { status: DisplayStatus }) {
  const cfg = STATUS_CFG[status];
  return (
    <span
      className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium whitespace-nowrap"
      style={{
        fontSize: 14,
        color: cfg.color,
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
      }}
    >
      {status}
    </span>
  );
}

function EmptyState({ hasFilters, onClear }: { hasFilters: boolean; onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      <div
        className="flex size-14 items-center justify-center rounded-full"
        style={{ background: 'rgba(226,237,241,0.6)' }}
      >
        <Search style={{ width: 28, height: 28, color: '#8A98A3' }} />
      </div>
      <p className="font-sans font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
        No suppliers match these filters
      </p>
      <p style={{ fontSize: 14, color: '#4A7080' }}>
        Try widening your search or clearing filters.
      </p>
      {hasFilters && (
        <button
          type="button"
          onClick={onClear}
          className={`mt-1 font-sans font-medium transition-colors duration-150 hover:underline ${FOCUS_RING}`}
          style={{ fontSize: 14, color: '#00B4D8' }}
        >
          Clear all filters
        </button>
      )}
    </div>
  );
}

function MiniStat({
  icon: Icon,
  iconColor,
  iconBg,
  label,
  value,
  info,
  infoColor,
  onClick,
}: {
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  label: string;
  value: string | number;
  info: string;
  infoColor: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <p className="font-sans" style={{ fontSize: 14, lineHeight: '20px', color: '#4A7080' }}>
        {label}
      </p>
      <div className="mt-2 flex items-center gap-2.5">
        <div
          className="flex size-9 shrink-0 items-center justify-center rounded-[10px]"
          style={{ background: iconBg }}
        >
          <Icon style={{ width: 18, height: 18, color: iconColor }} />
        </div>
        <p
          className="font-display font-bold"
          style={{ fontSize: 24, lineHeight: '30px', color: '#0D2630' }}
        >
          {value}
        </p>
      </div>
      <p
        className="mt-1.5 font-sans font-medium"
        style={{ fontSize: 14, lineHeight: '20px', color: infoColor }}
      >
        {info}
      </p>
    </>
  );
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`flex flex-col rounded-[12px] p-4 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
        style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
      >
        {content}
      </button>
    );
  }
  return (
    <div
      className="flex flex-col rounded-[12px] p-4"
      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
    >
      {content}
    </div>
  );
}

function RowMenu({
  supplier,
  canWrite,
  onView,
  onTogglePreferred,
  onApprove,
  onBlacklist,
  onReactivate,
}: {
  supplier: Supplier;
  canWrite: boolean;
  onView: () => void;
  onTogglePreferred: () => void;
  onApprove: () => void;
  onBlacklist: () => void;
  onReactivate: () => void;
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
        className={`flex size-9 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
      >
        <MoreVertical style={{ width: 15, height: 15, color: '#4A7080' }} />
      </button>
      <RowMenuPortal open={open} anchorRef={buttonRef} onClose={() => setOpen(false)} width={210}>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            onView();
          }}
          className="flex w-full items-center px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD]"
          style={{ fontSize: 14, color: '#2F3A40' }}
        >
          View Full Profile
        </button>
        {canWrite && supplier.status === 'Pending Evaluation' && (
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onApprove();
            }}
            className="flex w-full items-center px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD]"
            style={{ fontSize: 14, color: '#16A34A' }}
          >
            Approve Supplier
          </button>
        )}
        {canWrite && supplier.status === 'Active' && (
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
        )}
        {canWrite && (supplier.status === 'Active' || supplier.status === 'Pending Evaluation') && (
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onBlacklist();
            }}
            className="flex w-full items-center px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[rgba(239,68,68,0.06)]"
            style={{ fontSize: 14, color: '#DC2626' }}
          >
            Blacklist Supplier
          </button>
        )}
        {canWrite && (supplier.status === 'Blacklisted' || supplier.status === 'Inactive') && (
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onReactivate();
            }}
            className="flex w-full items-center px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD]"
            style={{ fontSize: 14, color: '#16A34A' }}
          >
            Reactivate Supplier
          </button>
        )}
      </RowMenuPortal>
    </div>
  );
}

export function SuppliersWorkspace() {
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const canWrite = !!user?.permissions?.includes(PERMISSIONS.LAB_SUPPLIERS_WRITE);

  const allSuppliers = useSuppliers();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [category, setCategory] = useState('ALL');
  const [rating, setRating] = useState('ALL');
  const [location, setLocation] = useState('ALL');
  const [openFilter, setOpenFilter] = useState<
    'status' | 'category' | 'rating' | 'location' | null
  >(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(ROWS_PER_PAGE);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [detailFor, setDetailFor] = useState<Supplier | null>(null);

  const summary = getSupplierSummary();

  const FILTER_DEFS: { key: 'status' | 'category' | 'rating' | 'location'; def: FilterDef }[] = [
    {
      key: 'status',
      def: {
        key: 'status',
        defaultLabel: 'All Status',
        options: (
          ['Active', 'Preferred', 'Pending Evaluation', 'Blacklisted', 'Inactive'] as const
        ).map((s) => ({ value: s, label: s })),
      },
    },
    {
      key: 'category',
      def: {
        key: 'category',
        defaultLabel: 'All Categories',
        options: SUPPLIER_CATEGORY_OPTIONS.map((c) => ({ value: c, label: c })),
      },
    },
    {
      key: 'rating',
      def: { key: 'rating', defaultLabel: 'All Ratings', options: SUPPLIER_RATING_OPTIONS },
    },
    {
      key: 'location',
      def: {
        key: 'location',
        defaultLabel: 'All Locations',
        options: SUPPLIER_LOCATION_OPTIONS.map((l) => ({ value: l, label: l })),
      },
    },
  ];
  const filterValue: Record<string, string> = { status, category, rating, location };
  const filterSetter: Record<string, (v: string) => void> = {
    status: setStatus,
    category: setCategory,
    rating: setRating,
    location: setLocation,
  };

  const hasActiveFilters =
    status !== 'ALL' ||
    category !== 'ALL' ||
    rating !== 'ALL' ||
    location !== 'ALL' ||
    search.trim() !== '';

  function resetFilters() {
    setStatus('ALL');
    setCategory('ALL');
    setRating('ALL');
    setLocation('ALL');
    setSearch('');
    setPage(1);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allSuppliers.filter((s) => {
      const ds = displayStatusOf(s);
      if (status !== 'ALL' && ds !== status) return false;
      if (category !== 'ALL' && s.category !== category) return false;
      if (rating !== 'ALL' && s.rating < Number(rating)) return false;
      if (location !== 'ALL' && s.city !== location) return false;
      if (
        q &&
        !s.name.toLowerCase().includes(q) &&
        !s.contactPerson.toLowerCase().includes(q) &&
        !s.email.toLowerCase().includes(q) &&
        !s.phone.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [allSuppliers, status, category, rating, location, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageRows = filtered.slice(pageStart, pageStart + pageSize);
  const selected = selectedId ? allSuppliers.find((s) => s.id === selectedId) : undefined;

  function handleExport() {
    downloadCSV('suppliers', [
      [
        'Supplier Name',
        'Category',
        'Contact Person',
        'Phone',
        'Email',
        'Location',
        'Status',
        'Rating',
        'Last Order Date',
        'YTD Spend',
      ],
      ...filtered.map((s) => [
        s.name,
        s.category,
        s.contactPerson,
        s.phone,
        s.email,
        s.city,
        displayStatusOf(s),
        s.rating.toFixed(1),
        s.lastOrderDate ? formatHumanDate(s.lastOrderDate) : 'No orders yet',
        String(s.ytdSpend),
      ]),
    ]);
    toast.success(
      'Report exported',
      `${filtered.length} supplier${filtered.length !== 1 ? 's' : ''} exported to CSV.`,
    );
  }

  function handleTogglePreferred(s: Supplier) {
    setSupplierPreferred(s.id, !s.isPreferred);
    toast.success(
      s.isPreferred ? 'Preferred removed' : 'Marked as preferred',
      `${s.name} has been updated.`,
    );
  }
  function handleApprove(s: Supplier) {
    setSupplierStatus(s.id, 'Active');
    toast.success('Supplier approved', `${s.name} is now active and selectable.`);
  }
  function handleBlacklist(s: Supplier) {
    setSupplierStatus(s.id, 'Blacklisted');
    toast.info('Supplier blacklisted', `${s.name} has been blacklisted.`);
  }
  function handleReactivate(s: Supplier) {
    setSupplierStatus(s.id, 'Active');
    toast.success('Supplier reactivated', `${s.name} is now active.`);
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto max-w-[1440px] px-4 py-4 sm:px-6 sm:py-5">
          {/* ── Breadcrumb ──────────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-1.5" style={{ fontSize: 14 }}>
            <button
              type="button"
              onClick={() => router.push(ROUTES.laboratory)}
              className={`font-sans transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
              style={{ color: '#4A7080' }}
            >
              Home
            </button>
            <span style={{ color: '#8A98A3' }}>/</span>
            <span style={{ color: '#4A7080' }}>Inventory</span>
            <span style={{ color: '#8A98A3' }}>/</span>
            <span className="font-medium" style={{ color: '#0D2630' }}>
              Suppliers
            </span>
          </div>

          {/* ── Header ──────────────────────────────────────────────────── */}
          <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1
                className="font-display font-semibold"
                style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
              >
                Suppliers
              </h1>
              <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                Manage and monitor all laboratory suppliers and vendor information.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleExport}
                className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
              >
                <Download style={{ width: 15, height: 15 }} />
                Export Report
              </button>
              <PermissionGate permission={PERMISSIONS.LAB_SUPPLIERS_WRITE}>
                <button
                  type="button"
                  onClick={() => setAddOpen(true)}
                  className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                  style={{ fontSize: 14, background: '#00B4D8' }}
                >
                  <Plus style={{ width: 15, height: 15 }} />
                  Add New Supplier
                </button>
              </PermissionGate>
            </div>
          </div>

          {/* ── Stat cards ──────────────────────────────────────────────── */}
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            <MiniStat
              icon={Users}
              iconColor="#0D2630"
              iconBg="rgba(13,38,48,0.08)"
              label="Total Suppliers"
              value={summary.total}
              info="All suppliers"
              infoColor="#4A7080"
              onClick={() => {
                setStatus('ALL');
                setPage(1);
              }}
            />
            <MiniStat
              icon={CheckCircle2}
              iconColor="#16A34A"
              iconBg="rgba(34,197,94,0.12)"
              label="Active Suppliers"
              value={summary.active}
              info={`${Math.round((summary.active / Math.max(1, summary.total)) * 1000) / 10}% of total`}
              infoColor="#16A34A"
              onClick={() => {
                setStatus('Active');
                setPage(1);
              }}
            />
            <MiniStat
              icon={Star}
              iconColor="#7C3AED"
              iconBg="rgba(124,58,237,0.12)"
              label="Preferred Suppliers"
              value={summary.preferred}
              info={`${Math.round((summary.preferred / Math.max(1, summary.total)) * 1000) / 10}% of total`}
              infoColor="#7C3AED"
              onClick={() => {
                setStatus('Preferred');
                setPage(1);
              }}
            />
            <MiniStat
              icon={ClipboardList}
              iconColor="#D97706"
              iconBg="rgba(245,158,11,0.12)"
              label="Pending Evaluation"
              value={summary.pendingEvaluation}
              info={`${Math.round((summary.pendingEvaluation / Math.max(1, summary.total)) * 1000) / 10}% of total`}
              infoColor="#D97706"
              onClick={() => {
                setStatus('Pending Evaluation');
                setPage(1);
              }}
            />
            <MiniStat
              icon={Ban}
              iconColor="#DC2626"
              iconBg="rgba(239,68,68,0.12)"
              label="Blacklisted"
              value={summary.blacklisted}
              info={`${Math.round((summary.blacklisted / Math.max(1, summary.total)) * 1000) / 10}% of total`}
              infoColor="#DC2626"
              onClick={() => {
                setStatus('Blacklisted');
                setPage(1);
              }}
            />
            <MiniStat
              icon={Wallet}
              iconColor="#00B4D8"
              iconBg="rgba(0,180,216,0.12)"
              label="Total Spend (YTD)"
              value={formatCurrencyCompact(summary.totalSpendYTD)}
              info="Across all suppliers"
              infoColor="#4A7080"
            />
          </div>

          <div
            className="mt-5 rounded-[12px] p-4 sm:p-5"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative min-w-[220px] flex-1">
                <Search
                  className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
                  style={{ width: 16, height: 16, color: '#8A98A3' }}
                />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search supplier name, contact person, phone..."
                  className={`h-11 w-full rounded-[10px] pr-3.5 pl-9 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                  style={{
                    fontSize: 14,
                    border: '1px solid rgba(0,100,130,0.18)',
                    color: '#0D2630',
                  }}
                />
              </div>
              {FILTER_DEFS.map(({ key, def }) => (
                <FilterDropdown
                  key={key}
                  def={def}
                  value={filterValue[key]!}
                  isOpen={openFilter === key}
                  onToggle={() => setOpenFilter(openFilter === key ? null : key)}
                  onSelect={(v) => {
                    filterSetter[key]!(v);
                    setPage(1);
                    setOpenFilter(null);
                  }}
                />
              ))}
            </div>
            <div className="mt-2.5 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={resetFilters}
                disabled={!hasActiveFilters}
                className={`flex h-11 items-center rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => setPage(1)}
                className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                style={{ fontSize: 14, background: '#00B4D8' }}
              >
                Apply Filters
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-start">
              <div className="min-w-0 flex-1">
                {pageRows.length === 0 ? (
                  <EmptyState hasFilters={hasActiveFilters} onClear={resetFilters} />
                ) : (
                  <ScrollableTable minWidth={1400} maxHeight={640}>
                    <div
                      className={`flex items-center rounded-t-[8px] ${TABLE_HEADER_STICKY_CLASS}`}
                      style={{ background: TABLE_HEADER_BG, borderBottom: '1px solid #E6F8FD' }}
                    >
                      {[
                        ['Supplier Name', 'min-w-[190px] flex-1'],
                        ['Category', 'w-36'],
                        ['Contact Person', 'w-40'],
                        ['Phone / Email', 'w-48'],
                        ['Location', 'w-36'],
                        ['Status', 'w-36'],
                        ['Rating', 'w-24'],
                        ['Last Order', 'w-32'],
                        ['YTD Spend', 'w-36'],
                      ].map(([label, width]) => (
                        <div
                          key={label}
                          className={`${width} shrink-0 py-2.5 pr-2 pl-3 text-center`}
                        >
                          <span
                            className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                            style={{ fontSize: 14, color: '#4A7080' }}
                          >
                            {label}
                          </span>
                        </div>
                      ))}
                      <div className="w-20 shrink-0 py-2.5 pr-3 text-center">
                        <span
                          className="font-sans font-bold tracking-wider uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Actions
                        </span>
                      </div>
                    </div>
                    {pageRows.map((s) => {
                      const ds = displayStatusOf(s);
                      return (
                        <div
                          key={s.id}
                          onClick={() => setSelectedId(s.id)}
                          className="flex cursor-pointer items-center transition-colors duration-100 hover:bg-[#F5FBFD]"
                          style={{
                            borderBottom: '1px solid rgba(0,100,130,0.08)',
                            background: selectedId === s.id ? '#E6F8FD' : 'transparent',
                          }}
                        >
                          <div className="flex min-w-[190px] flex-1 items-center justify-center gap-2.5 py-3 pr-2 pl-3 text-center">
                            <div
                              className="flex size-9 shrink-0 items-center justify-center rounded-full font-sans font-semibold text-white"
                              style={{ fontSize: 14, background: supplierAvatarColor(s.name) }}
                            >
                              {supplierInitials(s.name)}
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
                          <div className="w-36 shrink-0 py-3 pr-2 text-center">
                            <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                              {s.category}
                            </p>
                          </div>
                          <div className="w-40 shrink-0 py-3 pr-2 text-center">
                            <Tooltip content={s.contactPerson}>
                              <p
                                className="truncate font-sans font-medium"
                                style={{ fontSize: 14, color: '#0D2630' }}
                              >
                                {s.contactPerson}
                              </p>
                            </Tooltip>
                            <p className="truncate" style={{ fontSize: 14, color: '#8A98A3' }}>
                              {s.contactRole}
                            </p>
                          </div>
                          <div className="w-48 shrink-0 py-3 pr-2 text-center">
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
                          <div className="w-36 shrink-0 py-3 pr-2 text-center">
                            <Tooltip content={s.city}>
                              <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                                {s.city}
                              </p>
                            </Tooltip>
                          </div>
                          <div className="w-36 shrink-0 py-3 pr-2 text-center">
                            <StatusBadge status={ds} />
                          </div>
                          <div className="flex w-24 shrink-0 items-center justify-center gap-1 py-3 pr-2">
                            <Star
                              style={{ width: 14, height: 14, color: '#F59E0B' }}
                              fill="#F59E0B"
                            />
                            <span style={{ fontSize: 14, color: '#0D2630' }}>
                              {s.rating.toFixed(1)}
                            </span>
                          </div>
                          <div className="w-32 shrink-0 py-3 pr-2 text-center">
                            <p style={{ fontSize: 14, color: '#4A7080' }}>
                              {s.lastOrderDate ? formatHumanDate(s.lastOrderDate) : '—'}
                            </p>
                          </div>
                          <div className="w-36 shrink-0 py-3 pr-2 text-center">
                            <p
                              className="font-sans font-medium whitespace-nowrap"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {formatCurrency(s.ytdSpend)}
                            </p>
                          </div>
                          <div
                            className="flex w-20 shrink-0 items-center justify-center gap-1 py-3 pr-3"
                            onClick={(ev) => ev.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => setDetailFor(s)}
                              aria-label={`View ${s.name}`}
                              className={`flex size-9 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
                            >
                              <Eye style={{ width: 15, height: 15, color: '#4A7080' }} />
                            </button>
                            <RowMenu
                              supplier={s}
                              canWrite={canWrite}
                              onView={() => setDetailFor(s)}
                              onTogglePreferred={() => handleTogglePreferred(s)}
                              onApprove={() => handleApprove(s)}
                              onBlacklist={() => handleBlacklist(s)}
                              onReactivate={() => handleReactivate(s)}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </ScrollableTable>
                )}
                {filtered.length > 0 && (
                  <Pagination
                    page={safePage}
                    pageSize={pageSize}
                    totalItems={filtered.length}
                    onPageChange={setPage}
                    onPageSizeChange={(size) => {
                      setPageSize(size);
                      setPage(1);
                    }}
                    itemLabel="suppliers"
                    pageSizeOptions={[10, 25, 50]}
                  />
                )}
              </div>

              {/* ── Docked Supplier Details panel ───────────────────────── */}
              {selected && (
                <div
                  className="flex w-full shrink-0 flex-col overflow-hidden rounded-[12px] xl:w-[340px]"
                  style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                >
                  <div className="flex items-start justify-between gap-3 px-4 py-4 sm:px-5">
                    <p
                      className="font-display font-semibold"
                      style={{ fontSize: 16, color: '#0D2630' }}
                    >
                      Supplier Details
                    </p>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setDetailFor(selected)}
                        aria-label="Open full profile"
                        className={`flex size-9 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
                      >
                        <ExternalLink style={{ width: 15, height: 15, color: '#4A7080' }} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedId(null)}
                        aria-label="Close"
                        className={`flex size-9 items-center justify-center rounded-full transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                      >
                        <X style={{ width: 18, height: 18, color: '#4A7080' }} />
                      </button>
                    </div>
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto scroll-smooth px-4 pb-5 sm:px-5">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="flex size-11 shrink-0 items-center justify-center rounded-full font-sans font-semibold text-white"
                        style={{ fontSize: 16, background: supplierAvatarColor(selected.name) }}
                      >
                        {supplierInitials(selected.name)}
                      </div>
                      <div className="min-w-0">
                        <p
                          className="font-display truncate font-semibold"
                          style={{ fontSize: 16, color: '#0D2630' }}
                        >
                          {selected.name}
                        </p>
                        <StatusBadge status={displayStatusOf(selected)} />
                      </div>
                    </div>
                    <p className="mt-2" style={{ fontSize: 14, color: '#8A98A3' }}>
                      {selected.category} · {selected.id}
                    </p>

                    <div className="mt-4 flex flex-col gap-3">
                      {[
                        ['Contact Person', selected.contactPerson],
                        ['Email', selected.email],
                        ['Phone', selected.phone],
                        ['Alternate Phone', selected.altPhone || '—'],
                        ['Address', selected.address],
                      ].map(([label, value]) => (
                        <div key={label} className="flex items-center justify-between gap-2">
                          <span style={{ fontSize: 14, color: '#8A98A3' }}>{label}</span>
                          <span
                            className="truncate text-right font-sans font-medium"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {value}
                          </span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between gap-2">
                        <span style={{ fontSize: 14, color: '#8A98A3' }}>Status</span>
                        <StatusBadge status={displayStatusOf(selected)} />
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span style={{ fontSize: 14, color: '#8A98A3' }}>Rating</span>
                        <span
                          className="flex items-center gap-1 font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          <Star
                            style={{ width: 13, height: 13, color: '#F59E0B' }}
                            fill="#F59E0B"
                          />
                          {selected.rating.toFixed(1)} ({selected.reviewCount} reviews)
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span style={{ fontSize: 14, color: '#8A98A3' }}>Payment Terms</span>
                        <span
                          className="font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {selected.paymentTerms}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span style={{ fontSize: 14, color: '#8A98A3' }}>Credit Limit</span>
                        <span
                          className="font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {formatCurrency(selected.creditLimit)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span style={{ fontSize: 14, color: '#8A98A3' }}>Date Added</span>
                        <span
                          className="font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {formatHumanDate(selected.dateAdded)}
                        </span>
                      </div>
                      {selected.notes && (
                        <div>
                          <span style={{ fontSize: 14, color: '#8A98A3' }}>Notes</span>
                          <p className="mt-1" style={{ fontSize: 14, color: '#2F3A40' }}>
                            {selected.notes}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="mt-5">
                      <p
                        className="font-sans font-semibold"
                        style={{ fontSize: 16, color: '#0D2630' }}
                      >
                        Performance Summary (YTD)
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-2.5">
                        <div>
                          <p style={{ fontSize: 14, color: '#8A98A3' }}>Total Orders</p>
                          <p
                            className="font-display font-bold"
                            style={{ fontSize: 18, color: '#0D2630' }}
                          >
                            {selected.totalOrdersYTD}
                          </p>
                        </div>
                        <div>
                          <p style={{ fontSize: 14, color: '#8A98A3' }}>On-time Delivery</p>
                          <p
                            className="font-display font-bold"
                            style={{ fontSize: 18, color: '#0D2630' }}
                          >
                            {selected.onTimeDeliveryPct}%
                          </p>
                        </div>
                        <div className="col-span-2">
                          <p style={{ fontSize: 14, color: '#8A98A3' }}>Total Spend</p>
                          <p
                            className="font-display font-bold"
                            style={{ fontSize: 18, color: '#0D2630' }}
                          >
                            {formatCurrency(selected.ytdSpend)}
                          </p>
                        </div>
                        <div>
                          <p style={{ fontSize: 14, color: '#8A98A3' }}>Quality Rating</p>
                          <p
                            className="font-display font-bold"
                            style={{ fontSize: 18, color: '#0D2630' }}
                          >
                            {selected.qualityRating.toFixed(1)}/5
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5">
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className="font-sans font-semibold"
                          style={{ fontSize: 16, color: '#0D2630' }}
                        >
                          Recent Orders
                        </p>
                        {selected.recentOrders.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setDetailFor(selected)}
                            className={`font-sans font-medium transition-colors duration-150 hover:underline ${FOCUS_RING}`}
                            style={{ fontSize: 14, color: '#00B4D8' }}
                          >
                            View all
                          </button>
                        )}
                      </div>
                      <div className="mt-2.5 flex flex-col gap-2">
                        {selected.recentOrders.length === 0 ? (
                          <p style={{ fontSize: 14, color: '#8A98A3' }}>No orders recorded yet.</p>
                        ) : (
                          selected.recentOrders.map((order) => (
                            <div key={order.id} className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <p
                                  className="font-sans font-medium"
                                  style={{ fontSize: 14, color: '#00B4D8' }}
                                >
                                  {order.id}
                                </p>
                                <p style={{ fontSize: 14, color: '#8A98A3' }}>
                                  {formatHumanDate(order.date)}
                                </p>
                              </div>
                              <p
                                className="shrink-0 font-sans font-medium whitespace-nowrap"
                                style={{ fontSize: 14, color: '#0D2630' }}
                              >
                                {formatCurrency(order.amount)}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="p-4 pt-0 sm:p-5 sm:pt-0">
                    <button
                      type="button"
                      onClick={() => setDetailFor(selected)}
                      className={`flex h-11 w-full items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                      style={{ fontSize: 14, background: '#00B4D8' }}
                    >
                      <Clipboard style={{ width: 15, height: 15 }} />
                      View Full Profile
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {addOpen && (
        <AddSupplierModal
          onClose={() => setAddOpen(false)}
          onSubmit={(supplier) => {
            setAddOpen(false);
            toast.success(
              'Supplier added',
              `${supplier.name} (${supplier.id}) is pending evaluation.`,
            );
          }}
        />
      )}

      {detailFor && <SupplierDetailModal supplier={detailFor} onClose={() => setDetailFor(null)} />}
    </div>
  );
}
