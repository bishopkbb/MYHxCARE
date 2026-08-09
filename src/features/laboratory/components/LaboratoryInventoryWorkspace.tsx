'use client';

import {
  AlertTriangle,
  Bell,
  Box,
  CheckCircle2,
  ClipboardList,
  Download,
  Eye,
  FileText,
  MoreVertical,
  Package,
  Plus,
  Search,
  ShoppingCart,
  Upload,
  Wallet,
  X,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { AnimatedDonutChart } from '@components/shared/AnimatedDonutChart';
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
import { formatCurrency } from '@/utils/currency';
import { formatHumanDate } from '@/utils/datetime';
import { downloadCSV } from '@/utils/export';
import {
  CATEGORY_OPTIONS,
  LOCATION_OPTIONS,
  type InventoryCategory,
  type InventoryItem,
  type InventoryStatus,
} from '@/features/laboratory/__mocks__/inventoryFixtures';
import { DEPARTMENT_OPTIONS } from '@/features/laboratory/__mocks__/equipmentFixtures';
import {
  getInventoryStatus,
  getInventorySummary,
  useBatchReceipts,
  useInventoryItems,
  useInventoryMovements,
} from '@/features/laboratory/store/inventoryStore';
import type { ProcurementCategory } from '@/features/laboratory/__mocks__/procurementFixtures';
import {
  createProcurementRequest,
  useProcurementRequests,
} from '@/features/laboratory/store/procurementStore';

const AddInventoryItemModal = dynamic(
  () => import('./AddInventoryItemModal').then((m) => m.AddInventoryItemModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);
const ImportInventoryModal = dynamic(
  () => import('./ImportInventoryModal').then((m) => m.ImportInventoryModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';
const ROWS_PER_PAGE = 10;

type TabKey =
  'overview' | 'batch-tracking' | 'expiry' | 'consumption' | 'alerts' | 'reorder' | 'history';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Inventory Overview' },
  { key: 'batch-tracking', label: 'Batch Tracking' },
  { key: 'expiry', label: 'Expiry Monitoring' },
  { key: 'consumption', label: 'Consumption Analytics' },
  { key: 'alerts', label: 'Stock Alerts' },
  { key: 'reorder', label: 'Reorder Management' },
  { key: 'history', label: 'Inventory History' },
];

const STATUS_CFG: Record<
  InventoryStatus,
  { color: string; border: string; bg: string; dot: string }
> = {
  'In Stock': {
    color: '#16A34A',
    border: 'rgba(34,197,94,0.4)',
    bg: 'rgba(34,197,94,0.08)',
    dot: '#22C55E',
  },
  'Low Stock': {
    color: '#B45309',
    border: 'rgba(245,158,11,0.4)',
    bg: 'rgba(245,158,11,0.08)',
    dot: '#F59E0B',
  },
  'Expiring Soon': {
    color: '#C2410C',
    border: 'rgba(234,88,12,0.4)',
    bg: 'rgba(234,88,12,0.08)',
    dot: '#EA580C',
  },
  Expired: {
    color: '#7C3AED',
    border: 'rgba(124,58,237,0.4)',
    bg: 'rgba(124,58,237,0.08)',
    dot: '#8B5CF6',
  },
  'Out of Stock': {
    color: '#DC2626',
    border: 'rgba(239,68,68,0.4)',
    bg: 'rgba(239,68,68,0.08)',
    dot: '#EF4444',
  },
};

const PROCUREMENT_STATUS_CFG: Record<string, { color: string; bg: string }> = {
  'Pending Approval': { color: '#B45309', bg: 'rgba(245,158,11,0.1)' },
  Approved: { color: '#16A34A', bg: 'rgba(34,197,94,0.1)' },
  'In Procurement': { color: '#2563EB', bg: 'rgba(37,99,235,0.1)' },
  Received: { color: '#0D9488', bg: 'rgba(13,148,136,0.1)' },
  Rejected: { color: '#DC2626', bg: 'rgba(239,68,68,0.1)' },
  Cancelled: { color: '#64748B', bg: 'rgba(100,116,139,0.1)' },
};

/** Maps an inventory item's category to the broader Procurement bucket used
 * on the Procurement Requests page — the two module's category taxonomies
 * are deliberately different granularity, so this is the one translation
 * point between them. */
function toProcurementCategory(category: InventoryCategory): ProcurementCategory {
  if (category === 'Reagent' || category === 'Control Material' || category === 'Test Kit') {
    return 'Reagents';
  }
  return 'Consumables';
}

const MOVEMENT_ICON: Record<string, LucideIcon> = {
  Received: Upload,
  Consumed: Package,
  Adjusted: ClipboardList,
  Disposed: XCircle,
};

function StatusBadge({ status }: { status: InventoryStatus }) {
  const cfg = STATUS_CFG[status];
  return (
    <span className="inline-flex items-center gap-1.5" style={{ fontSize: 14, color: cfg.color }}>
      <span className="size-1.5 shrink-0 rounded-full" style={{ background: cfg.dot }} />
      {status}
    </span>
  );
}

function expiryLabel(item: InventoryItem): { text: string; color: string } {
  if (!item.expiryDate) return { text: '—', color: '#8A98A3' };
  const days = Math.round((new Date(item.expiryDate).getTime() - Date.now()) / 86_400_000);
  const date = formatHumanDate(item.expiryDate);
  if (days < 0)
    return { text: `${date} (Expired ${Math.abs(days)}d ago)`, color: STATUS_CFG.Expired.color };
  if (days <= 30)
    return { text: `${date} (${days}d left)`, color: STATUS_CFG['Expiring Soon'].color };
  return { text: date, color: '#4A7080' };
}

function EmptyState({ message, hint }: { message: string; hint: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      <div
        className="flex size-14 items-center justify-center rounded-full"
        style={{ background: 'rgba(226,237,241,0.6)' }}
      >
        <Box style={{ width: 28, height: 28, color: '#8A98A3' }} />
      </div>
      <p className="font-sans font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
        {message}
      </p>
      <p style={{ fontSize: 14, color: '#4A7080' }}>{hint}</p>
    </div>
  );
}

function MiniStat({
  icon: Icon,
  iconColor,
  iconBg,
  label,
  labelColor,
  value,
  info,
  infoColor,
  onClick,
}: {
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  label: string;
  labelColor?: string;
  value: string | number;
  info: string;
  infoColor: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <p
        className="font-sans"
        style={{ fontSize: 14, lineHeight: '20px', color: labelColor ?? '#4A7080' }}
      >
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
          className="font-display truncate font-bold"
          style={{ fontSize: 22, lineHeight: '28px', color: '#0D2630' }}
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
  item,
  onView,
  onReorder,
}: {
  item: InventoryItem;
  onView: () => void;
  onReorder: () => void;
}) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`More actions for ${item.name}`}
        className={`flex size-9 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
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
        <PermissionGate permission={PERMISSIONS.LAB_INVENTORY_WRITE}>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onReorder();
            }}
            className="flex w-full items-center px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD]"
            style={{ fontSize: 14, color: '#2F3A40' }}
          >
            Create Reorder Request
          </button>
        </PermissionGate>
      </RowMenuPortal>
    </div>
  );
}

export function LaboratoryInventoryWorkspace() {
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const actorName = user?.name ?? 'Lab Scientist';

  const items = useInventoryItems();
  const batchReceipts = useBatchReceipts();
  const procurementRequests = useProcurementRequests();
  const movements = useInventoryMovements();

  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('ALL');
  const [category, setCategory] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [location, setLocation] = useState('ALL');
  const [openFilter, setOpenFilter] = useState<
    'department' | 'category' | 'status' | 'location' | null
  >(null);
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(ROWS_PER_PAGE);
  const [selectedId, setSelectedId] = useState<string | null>(items[0]?.id ?? null);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const summary = getInventorySummary();

  const FILTER_DEFS: { key: 'department' | 'category' | 'status' | 'location'; def: FilterDef }[] =
    [
      {
        key: 'department',
        def: {
          key: 'department',
          defaultLabel: 'All Departments',
          options: DEPARTMENT_OPTIONS.map((d) => ({ value: d, label: d })),
        },
      },
      {
        key: 'category',
        def: {
          key: 'category',
          defaultLabel: 'All Categories',
          options: CATEGORY_OPTIONS.map((c) => ({ value: c, label: c })),
        },
      },
      {
        key: 'status',
        def: {
          key: 'status',
          defaultLabel: 'All Status',
          options: (
            ['In Stock', 'Low Stock', 'Expiring Soon', 'Expired', 'Out of Stock'] as const
          ).map((s) => ({ value: s, label: s })),
        },
      },
      {
        key: 'location',
        def: {
          key: 'location',
          defaultLabel: 'All Locations',
          options: LOCATION_OPTIONS.map((l) => ({ value: l, label: l })),
        },
      },
    ];

  const filterValue: Record<string, string> = { department, category, status, location };
  const filterSetter: Record<string, (v: string) => void> = {
    department: setDepartment,
    category: setCategory,
    status: setStatus,
    location: setLocation,
  };

  const hasActiveFilters =
    department !== 'ALL' ||
    category !== 'ALL' ||
    status !== 'ALL' ||
    location !== 'ALL' ||
    search.trim() !== '';

  function resetFilters() {
    setDepartment('ALL');
    setCategory('ALL');
    setStatus('ALL');
    setLocation('ALL');
    setSearch('');
    setPage(1);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      if (department !== 'ALL' && i.department !== department) return false;
      if (category !== 'ALL' && i.category !== category) return false;
      if (status !== 'ALL' && getInventoryStatus(i) !== status) return false;
      if (location !== 'ALL' && i.location !== location) return false;
      if (
        q &&
        !i.name.toLowerCase().includes(q) &&
        !i.catalogNo.toLowerCase().includes(q) &&
        !i.lotBatchNo.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [items, department, category, status, location, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageRows = filtered.slice(pageStart, pageStart + pageSize);

  const selected = selectedId ? items.find((i) => i.id === selectedId) : undefined;

  function itemName(id: string): string {
    return items.find((i) => i.id === id)?.name ?? id;
  }

  const donutBreakdown = [
    { label: 'In Stock', value: summary.inStock, color: STATUS_CFG['In Stock'].dot },
    { label: 'Low Stock', value: summary.lowStock, color: STATUS_CFG['Low Stock'].dot },
    { label: 'Expiring Soon', value: summary.expiringSoon, color: STATUS_CFG['Expiring Soon'].dot },
    { label: 'Expired', value: summary.expired, color: STATUS_CFG.Expired.dot },
    { label: 'Out of Stock', value: summary.outOfStock, color: STATUS_CFG['Out of Stock'].dot },
  ];

  function handleExport() {
    downloadCSV('laboratory-inventory', [
      [
        'Item Name',
        'Catalog No.',
        'Category',
        'Department',
        'Lot/Batch No.',
        'Expiry Date',
        'Current Stock',
        'Min Stock',
        'Status',
        'Location',
      ],
      ...filtered.map((i) => [
        i.name,
        i.catalogNo,
        i.category,
        i.department,
        i.lotBatchNo,
        i.expiryDate ? formatHumanDate(i.expiryDate) : '—',
        String(i.currentStock),
        String(i.minStock),
        getInventoryStatus(i),
        i.location,
      ]),
    ]);
    toast.success(
      'Report exported',
      `${filtered.length} item${filtered.length !== 1 ? 's' : ''} exported to CSV.`,
    );
  }

  function handleReorder(item: InventoryItem) {
    const qty = Math.max(item.minStock * 2 - item.currentStock, item.minStock);
    const request = createProcurementRequest({
      department: item.department,
      requestedBy: actorName,
      priority: item.currentStock === 0 ? 'High' : 'Medium',
      lineItems: [
        {
          name: item.name,
          category: toProcurementCategory(item.category),
          quantity: qty,
          estimatedUnitCost: item.unitPrice,
          itemId: item.id,
        },
      ],
      estimatedAmount: qty * item.unitPrice,
      notes: `Requested from Stock Alerts — ${item.currentStock} ${item.unit} on hand, minimum ${item.minStock}.`,
      origin: 'Stock Alert',
    });
    toast.success(
      'Procurement request created',
      `${request.id}: ${item.name} (${qty} ${item.unit}) requested.`,
    );
  }

  // ── Expiry Monitoring rows ──
  const expiryRows = useMemo(
    () =>
      items
        .filter((i) => {
          const s = getInventoryStatus(i);
          return s === 'Expiring Soon' || s === 'Expired';
        })
        .sort(
          (a, b) => new Date(a.expiryDate ?? 0).getTime() - new Date(b.expiryDate ?? 0).getTime(),
        ),
    [items],
  );

  // ── Stock Alerts rows ──
  const alertRows = useMemo(
    () =>
      items
        .filter((i) => {
          const s = getInventoryStatus(i);
          return s === 'Low Stock' || s === 'Out of Stock';
        })
        .sort((a, b) => a.currentStock - b.currentStock),
    [items],
  );

  // ── Consumption Analytics ──
  const topConsumed = useMemo(() => {
    const totals = new Map<string, number>();
    movements
      .filter((m) => m.type === 'Consumed')
      .forEach((m) => totals.set(m.itemId, (totals.get(m.itemId) ?? 0) + m.quantity));
    return Array.from(totals.entries())
      .map(([itemId, qty]) => ({ itemId, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);
  }, [movements]);
  const maxConsumed = Math.max(1, ...topConsumed.map((r) => r.qty));

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
              Laboratory Inventory
            </span>
          </div>

          {/* ── Header ──────────────────────────────────────────────────── */}
          <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1
                className="font-display font-semibold"
                style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
              >
                Laboratory Inventory
              </h1>
              <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                Manage laboratory reagents, kits, consumables and supplies.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <PermissionGate permission={PERMISSIONS.LAB_INVENTORY_WRITE}>
                <button
                  type="button"
                  onClick={() => setImportOpen(true)}
                  className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                  style={{
                    fontSize: 14,
                    color: '#0D2630',
                    border: '1px solid rgba(0,100,130,0.2)',
                  }}
                >
                  <Upload style={{ width: 15, height: 15 }} />
                  Import Inventory
                </button>
              </PermissionGate>
              <button
                type="button"
                onClick={handleExport}
                className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
              >
                <Download style={{ width: 15, height: 15 }} />
                Export Report
              </button>
              <PermissionGate permission={PERMISSIONS.LAB_INVENTORY_WRITE}>
                <button
                  type="button"
                  onClick={() => setAddItemOpen(true)}
                  className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                  style={{ fontSize: 14, background: '#00B4D8' }}
                >
                  <Plus style={{ width: 15, height: 15 }} />
                  Add New Item
                </button>
              </PermissionGate>
            </div>
          </div>

          {/* ── Stat cards ──────────────────────────────────────────────── */}
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            <MiniStat
              icon={Package}
              iconColor="#0D9488"
              iconBg="rgba(13,148,136,0.12)"
              label="Total Items"
              value={summary.total}
              info="Across all departments"
              infoColor="#4A7080"
            />
            <MiniStat
              icon={CheckCircle2}
              iconColor="#16A34A"
              iconBg="rgba(34,197,94,0.12)"
              label="In Stock"
              value={summary.inStock}
              info={`${Math.round((summary.inStock / Math.max(1, summary.total)) * 1000) / 10}% of total`}
              infoColor="#16A34A"
              onClick={() => setActiveTab('alerts')}
            />
            <MiniStat
              icon={AlertTriangle}
              iconColor="#D97706"
              iconBg="rgba(245,158,11,0.12)"
              label="Low Stock"
              value={summary.lowStock}
              info={`${Math.round((summary.lowStock / Math.max(1, summary.total)) * 1000) / 10}% of total`}
              infoColor="#D97706"
              onClick={() => setActiveTab('alerts')}
            />
            <MiniStat
              icon={AlertTriangle}
              iconColor="#C2410C"
              iconBg="rgba(234,88,12,0.12)"
              label="Expiring Soon"
              value={summary.expiringSoon}
              info="Within 30 days"
              infoColor="#C2410C"
              onClick={() => setActiveTab('expiry')}
            />
            <MiniStat
              icon={XCircle}
              iconColor="#7C3AED"
              iconBg="rgba(124,58,237,0.12)"
              label="Expired"
              value={summary.expired}
              info="Remove from use"
              infoColor="#7C3AED"
              onClick={() => setActiveTab('expiry')}
            />
            <MiniStat
              icon={Wallet}
              iconColor="#0D2630"
              iconBg="rgba(13,38,48,0.08)"
              label="Total Inventory Value"
              value={formatCurrency(summary.totalValue)}
              info="Current stock value"
              infoColor="#4A7080"
            />
          </div>

          {/* ── Tabs ────────────────────────────────────────────────────── */}
          <div
            className="mt-5 flex flex-wrap items-center justify-between gap-2 rounded-t-[12px] px-3 pt-3"
            style={{
              background: '#FFFFFF',
              border: '1px solid rgba(0,100,130,0.12)',
              borderBottom: 'none',
            }}
          >
            <div className="flex gap-1 overflow-x-auto scroll-smooth">
              {TABS.map((t) => {
                const active = activeTab === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setActiveTab(t.key)}
                    className={`shrink-0 px-3.5 pb-3 font-sans font-medium whitespace-nowrap transition-colors duration-150 ${FOCUS_RING}`}
                    style={{
                      fontSize: 14,
                      color: active ? '#00B4D8' : '#4A7080',
                      borderBottom: active ? '2px solid #00B4D8' : '2px solid transparent',
                    }}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Overview tab ────────────────────────────────────────────── */}
          {activeTab === 'overview' && (
            <div
              className="rounded-b-[12px] p-4 sm:p-5"
              style={{
                background: '#FFFFFF',
                border: '1px solid rgba(0,100,130,0.12)',
                borderTop: 'none',
              }}
            >
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative min-w-[240px] flex-1">
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
                    placeholder="Search by item name, catalog no., lot no., or barcode..."
                    className={`h-11 w-full rounded-[10px] pr-4 pl-9 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
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
                <button
                  type="button"
                  onClick={() => setMoreFiltersOpen((v) => !v)}
                  className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                  style={{
                    fontSize: 14,
                    color: moreFiltersOpen ? '#00B4D8' : '#0D2630',
                    border: `1px solid ${moreFiltersOpen ? '#00B4D8' : 'rgba(0,100,130,0.2)'}`,
                  }}
                >
                  <FileText style={{ width: 15, height: 15 }} />
                  More Filters
                </button>
              </div>

              {moreFiltersOpen && (
                <div className="animate-in fade-in-0 slide-in-from-top-1 mt-2.5 flex flex-wrap items-center gap-2.5 duration-150">
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>
                    Showing items across every manufacturer and storage condition.
                  </p>
                </div>
              )}

              <div className="mt-2.5 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={resetFilters}
                  disabled={!hasActiveFilters}
                  className={`flex h-11 items-center rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING}`}
                  style={{
                    fontSize: 14,
                    color: '#0D2630',
                    border: '1px solid rgba(0,100,130,0.2)',
                  }}
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

              <p
                className="font-display mt-5 font-semibold"
                style={{ fontSize: 18, color: '#0D2630' }}
              >
                Inventory Items
              </p>

              <div className="mt-3 flex flex-col gap-4 xl:flex-row xl:items-start">
                <div className="min-w-0 flex-1">
                  {pageRows.length === 0 ? (
                    <EmptyState
                      message="No items match these filters"
                      hint="Try widening your search or clearing filters."
                    />
                  ) : (
                    <ScrollableTable minWidth={1288} maxHeight={640}>
                      <div
                        className={`flex items-center rounded-t-[8px] ${TABLE_HEADER_STICKY_CLASS}`}
                        style={{ background: TABLE_HEADER_BG, borderBottom: '1px solid #E6F8FD' }}
                      >
                        {[
                          ['Item Name', 'min-w-[160px] flex-1'],
                          ['Catalog No.', 'w-32'],
                          ['Category', 'w-32'],
                          ['Department', 'w-32'],
                          ['Lot/Batch No.', 'w-32'],
                          ['Expiry Date', 'w-40'],
                          ['Current Stock', 'w-36'],
                          ['Status', 'w-36'],
                          ['Location', 'w-36'],
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
                        <div className="w-24 shrink-0 py-2.5 pr-3 text-center">
                          <span
                            className="font-sans font-bold tracking-wider uppercase"
                            style={{ fontSize: 14, color: '#4A7080' }}
                          >
                            Actions
                          </span>
                        </div>
                      </div>
                      {pageRows.map((item) => {
                        const st = getInventoryStatus(item);
                        const exp = expiryLabel(item);
                        return (
                          <div
                            key={item.id}
                            onClick={() => setSelectedId(item.id)}
                            className="flex cursor-pointer items-center transition-colors duration-100 hover:bg-[#F5FBFD]"
                            style={{
                              borderBottom: '1px solid rgba(0,100,130,0.08)',
                              background: selectedId === item.id ? '#E6F8FD' : 'transparent',
                            }}
                          >
                            <div className="min-w-0 flex-1 py-3 pr-2 pl-3 text-center">
                              <Tooltip content={item.name}>
                                <p
                                  className="truncate font-sans font-medium"
                                  style={{ fontSize: 14, color: '#0D2630' }}
                                >
                                  {item.name}
                                </p>
                              </Tooltip>
                            </div>
                            <div className="w-32 shrink-0 py-3 pr-2 text-center">
                              <Tooltip content={item.catalogNo}>
                                <p className="truncate" style={{ fontSize: 14, color: '#00B4D8' }}>
                                  {item.catalogNo}
                                </p>
                              </Tooltip>
                            </div>
                            <div className="w-32 shrink-0 py-3 pr-2 text-center">
                              <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                                {item.category}
                              </p>
                            </div>
                            <div className="w-32 shrink-0 py-3 pr-2 text-center">
                              <Tooltip content={item.department}>
                                <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                                  {item.department}
                                </p>
                              </Tooltip>
                            </div>
                            <div className="w-32 shrink-0 py-3 pr-2 text-center">
                              <Tooltip content={item.lotBatchNo}>
                                <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                                  {item.lotBatchNo}
                                </p>
                              </Tooltip>
                            </div>
                            <div className="w-40 shrink-0 py-3 pr-2 text-center">
                              <p
                                className="whitespace-nowrap"
                                style={{ fontSize: 14, color: exp.color }}
                              >
                                {exp.text}
                              </p>
                            </div>
                            <div className="w-36 shrink-0 py-3 pr-2 text-center">
                              <p style={{ fontSize: 14, color: '#0D2630' }}>
                                {item.currentStock}{' '}
                                <span style={{ color: '#8A98A3' }}>{item.unit}</span>
                              </p>
                            </div>
                            <div className="w-36 shrink-0 py-3 pr-2 text-center">
                              <StatusBadge status={st} />
                            </div>
                            <div className="w-36 shrink-0 py-3 pr-2 text-center">
                              <Tooltip content={item.location}>
                                <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                                  {item.location}
                                </p>
                              </Tooltip>
                            </div>
                            <div
                              className="flex w-24 shrink-0 items-center justify-center gap-1 py-3 pr-3"
                              onClick={(ev) => ev.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => setSelectedId(item.id)}
                                aria-label={`View ${item.name}`}
                                className={`flex size-9 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
                              >
                                <Eye style={{ width: 15, height: 15, color: '#4A7080' }} />
                              </button>
                              <RowMenu
                                item={item}
                                onView={() => setSelectedId(item.id)}
                                onReorder={() => handleReorder(item)}
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
                      itemLabel="items"
                      pageSizeOptions={[10, 25, 50]}
                    />
                  )}
                </div>

                {/* ── Right column: Item Details + Stock Summary + Quick Actions ── */}
                <div className="flex w-full shrink-0 flex-col gap-4 xl:w-[340px]">
                  <div
                    className="flex flex-col overflow-hidden rounded-[12px]"
                    style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    <div className="flex items-start justify-between gap-3 px-4 py-4 sm:px-5">
                      <p
                        className="font-display font-semibold"
                        style={{ fontSize: 16, color: '#0D2630' }}
                      >
                        Item Details
                      </p>
                      {selected && (
                        <button
                          type="button"
                          onClick={() => setSelectedId(null)}
                          aria-label="Close"
                          className={`flex size-9 shrink-0 items-center justify-center rounded-full transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                        >
                          <X style={{ width: 18, height: 18, color: '#4A7080' }} />
                        </button>
                      )}
                    </div>
                    {!selected ? (
                      <div className="px-4 pb-5 sm:px-5">
                        <p style={{ fontSize: 14, color: '#8A98A3' }}>
                          Select an item to view its details.
                        </p>
                      </div>
                    ) : (
                      <div className="px-4 pb-5 sm:px-5">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex size-14 shrink-0 items-center justify-center rounded-[12px]"
                            style={{ background: 'rgba(0,180,216,0.1)' }}
                          >
                            <Package style={{ width: 26, height: 26, color: '#00B4D8' }} />
                          </div>
                          <div className="min-w-0">
                            <Tooltip content={selected.name}>
                              <p
                                className="font-display truncate font-semibold"
                                style={{ fontSize: 16, color: '#0D2630' }}
                              >
                                {selected.name}
                              </p>
                            </Tooltip>
                            <p style={{ fontSize: 14, color: '#00B4D8' }}>{selected.catalogNo}</p>
                          </div>
                        </div>
                        <div className="mt-2">
                          <StatusBadge status={getInventoryStatus(selected)} />
                        </div>
                        <div className="mt-4 flex flex-col gap-3">
                          {[
                            ['Category', selected.category],
                            ['Department', selected.department],
                            ['Lot/Batch No.', selected.lotBatchNo],
                            ['Manufacturer', selected.manufacturer],
                            ['Pack Size', selected.packSize],
                            ['Received Date', formatHumanDate(selected.receivedDate)],
                            ['Expiry Date', expiryLabel(selected).text],
                            ['Storage Condition', selected.storageCondition],
                            ['Current Stock', `${selected.currentStock} ${selected.unit}`],
                            ['Minimum Stock', `${selected.minStock} ${selected.unit}`],
                            ['Location', selected.location],
                          ].map(([label, value]) => (
                            <div key={label} className="flex items-center justify-between gap-2">
                              <span style={{ fontSize: 14, color: '#8A98A3' }}>{label}</span>
                              <span
                                className="text-right font-sans font-medium"
                                style={{ fontSize: 14, color: '#0D2630' }}
                              >
                                {value}
                              </span>
                            </div>
                          ))}
                          <div>
                            <span style={{ fontSize: 14, color: '#8A98A3' }}>Description</span>
                            <p className="mt-1" style={{ fontSize: 14, color: '#2F3A40' }}>
                              {selected.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div
                    className="rounded-[12px] p-4"
                    style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    <h2
                      className="font-display font-semibold"
                      style={{ fontSize: 16, color: '#0D2630' }}
                    >
                      Stock Summary (All Departments)
                    </h2>
                    <div className="mt-3 flex items-center gap-5">
                      <AnimatedDonutChart
                        breakdown={donutBreakdown}
                        total={summary.total}
                        ariaLabel="Stock summary donut chart"
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
                                <span
                                  className="truncate"
                                  style={{ fontSize: 14, color: '#4A7080' }}
                                >
                                  {d.label}
                                </span>
                              </Tooltip>
                            </div>
                            <span
                              className="shrink-0 font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {d.value} (
                              {summary.total > 0
                                ? Math.round((d.value / summary.total) * 1000) / 10
                                : 0}
                              %)
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
                    <h2
                      className="font-display font-semibold"
                      style={{ fontSize: 16, color: '#0D2630' }}
                    >
                      Quick Actions
                    </h2>
                    <div className="mt-3 grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setActiveTab('alerts')}
                        className={`flex flex-col items-center justify-center gap-1.5 rounded-[10px] py-3 text-center transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                        style={{ border: '1px solid rgba(0,100,130,0.18)' }}
                      >
                        <Bell style={{ width: 18, height: 18, color: '#D97706' }} />
                        <span
                          className="font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          Stock Alerts
                        </span>
                      </button>
                      <PermissionGate permission={PERMISSIONS.LAB_INVENTORY_WRITE}>
                        <button
                          type="button"
                          onClick={() => setAddItemOpen(true)}
                          className={`flex flex-col items-center justify-center gap-1.5 rounded-[10px] py-3 text-center transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                          style={{ border: '1px solid rgba(0,100,130,0.18)' }}
                        >
                          <Plus style={{ width: 18, height: 18, color: '#00B4D8' }} />
                          <span
                            className="font-sans font-medium"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            Add New Item
                          </span>
                        </button>
                      </PermissionGate>
                      <button
                        type="button"
                        onClick={handleExport}
                        className={`flex flex-col items-center justify-center gap-1.5 rounded-[10px] py-3 text-center transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                        style={{ border: '1px solid rgba(0,100,130,0.18)' }}
                      >
                        <FileText style={{ width: 18, height: 18, color: '#4A7080' }} />
                        <span
                          className="font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          Generate Report
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('reorder')}
                        className={`flex flex-col items-center justify-center gap-1.5 rounded-[10px] py-3 text-center transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                        style={{ border: '1px solid rgba(0,100,130,0.18)' }}
                      >
                        <ShoppingCart style={{ width: 18, height: 18, color: '#16A34A' }} />
                        <span
                          className="font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          Reorder List
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Batch Tracking tab ───────────────────────────────────────── */}
          {activeTab === 'batch-tracking' && (
            <div
              className="rounded-b-[12px] p-4 sm:p-5"
              style={{
                background: '#FFFFFF',
                border: '1px solid rgba(0,100,130,0.12)',
                borderTop: 'none',
              }}
            >
              <p style={{ fontSize: 14, color: '#4A7080' }}>
                Every batch received into stock, with remaining quantity.
              </p>
              {batchReceipts.length === 0 ? (
                <EmptyState message="No batches recorded" hint="Batch receipts will appear here." />
              ) : (
                <div className="mt-3">
                  <ScrollableTable minWidth={900}>
                    <div
                      className={`flex items-center rounded-t-[8px] ${TABLE_HEADER_STICKY_CLASS}`}
                      style={{ background: TABLE_HEADER_BG, borderBottom: '1px solid #E6F8FD' }}
                    >
                      {[
                        ['Item Name', 'min-w-[160px] flex-1'],
                        ['Lot/Batch No.', 'w-32'],
                        ['Qty Received', 'w-28'],
                        ['Qty Remaining', 'w-28'],
                        ['Supplier', 'w-52'],
                        ['Received Date', 'w-36'],
                        ['Received By', 'w-36'],
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
                    </div>
                    {batchReceipts.map((b) => (
                      <div
                        key={b.id}
                        className="flex items-center"
                        style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                      >
                        <div className="min-w-0 flex-1 py-3 pr-2 pl-3 text-center">
                          <Tooltip content={itemName(b.itemId)}>
                            <p
                              className="truncate font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {itemName(b.itemId)}
                            </p>
                          </Tooltip>
                        </div>
                        <div className="w-32 shrink-0 py-3 pr-2 text-center">
                          <p style={{ fontSize: 14, color: '#4A7080' }}>{b.lotBatchNo}</p>
                        </div>
                        <div className="w-28 shrink-0 py-3 pr-2 text-center">
                          <p style={{ fontSize: 14, color: '#4A7080' }}>{b.quantityReceived}</p>
                        </div>
                        <div className="w-28 shrink-0 py-3 pr-2 text-center">
                          <p style={{ fontSize: 14, color: '#0D2630' }}>{b.quantityRemaining}</p>
                        </div>
                        <div className="w-52 shrink-0 py-3 pr-2 text-center">
                          <Tooltip content={b.supplier}>
                            <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                              {b.supplier}
                            </p>
                          </Tooltip>
                        </div>
                        <div className="w-36 shrink-0 py-3 pr-2 text-center">
                          <p style={{ fontSize: 14, color: '#4A7080' }}>
                            {formatHumanDate(b.receivedDate)}
                          </p>
                        </div>
                        <div className="w-36 shrink-0 py-3 pr-2 text-center">
                          <Tooltip content={b.receivedBy}>
                            <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                              {b.receivedBy}
                            </p>
                          </Tooltip>
                        </div>
                      </div>
                    ))}
                  </ScrollableTable>
                </div>
              )}
            </div>
          )}

          {/* ── Expiry Monitoring tab ────────────────────────────────────── */}
          {activeTab === 'expiry' && (
            <div
              className="rounded-b-[12px] p-4 sm:p-5"
              style={{
                background: '#FFFFFF',
                border: '1px solid rgba(0,100,130,0.12)',
                borderTop: 'none',
              }}
            >
              <p style={{ fontSize: 14, color: '#4A7080' }}>
                Items expiring within 30 days or already expired, soonest first.
              </p>
              {expiryRows.length === 0 ? (
                <EmptyState
                  message="Nothing expiring soon"
                  hint="Every tracked item is within its safe shelf life."
                />
              ) : (
                <div className="mt-3">
                  <ScrollableTable minWidth={950} maxHeight={640}>
                    <div
                      className={`flex items-center rounded-t-[8px] ${TABLE_HEADER_STICKY_CLASS}`}
                      style={{ background: TABLE_HEADER_BG, borderBottom: '1px solid #E6F8FD' }}
                    >
                      {[
                        ['Item Name', 'min-w-[160px] flex-1'],
                        ['Catalog No.', 'w-32'],
                        ['Lot/Batch No.', 'w-32'],
                        ['Expiry Date', 'w-48'],
                        ['Current Stock', 'w-36'],
                        ['Status', 'w-32'],
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
                    </div>
                    {expiryRows.map((item) => {
                      const st = getInventoryStatus(item);
                      const exp = expiryLabel(item);
                      return (
                        <div
                          key={item.id}
                          className="flex items-center"
                          style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                        >
                          <div className="min-w-0 flex-1 py-3 pr-2 pl-3 text-center">
                            <Tooltip content={item.name}>
                              <p
                                className="truncate font-sans font-medium"
                                style={{ fontSize: 14, color: '#0D2630' }}
                              >
                                {item.name}
                              </p>
                            </Tooltip>
                          </div>
                          <div className="w-32 shrink-0 py-3 pr-2 text-center">
                            <p className="truncate" style={{ fontSize: 14, color: '#00B4D8' }}>
                              {item.catalogNo}
                            </p>
                          </div>
                          <div className="w-32 shrink-0 py-3 pr-2 text-center">
                            <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                              {item.lotBatchNo}
                            </p>
                          </div>
                          <div className="w-48 shrink-0 py-3 pr-2 text-center">
                            <p
                              className="whitespace-nowrap"
                              style={{ fontSize: 14, color: exp.color }}
                            >
                              {exp.text}
                            </p>
                          </div>
                          <div className="w-36 shrink-0 py-3 pr-2 text-center">
                            <p style={{ fontSize: 14, color: '#0D2630' }}>
                              {item.currentStock}{' '}
                              <span style={{ color: '#8A98A3' }}>{item.unit}</span>
                            </p>
                          </div>
                          <div className="w-32 shrink-0 py-3 pr-2 text-center">
                            <StatusBadge status={st} />
                          </div>
                        </div>
                      );
                    })}
                  </ScrollableTable>
                </div>
              )}
            </div>
          )}

          {/* ── Consumption Analytics tab ────────────────────────────────── */}
          {activeTab === 'consumption' && (
            <div
              className="rounded-b-[12px] p-4 sm:p-5"
              style={{
                background: '#FFFFFF',
                border: '1px solid rgba(0,100,130,0.12)',
                borderTop: 'none',
              }}
            >
              <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Top Consumed Items
              </p>
              <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
                Ranked by total quantity consumed, logged from Inventory History.
              </p>
              {topConsumed.length === 0 ? (
                <EmptyState
                  message="No consumption logged yet"
                  hint="Consumption events will appear here once recorded."
                />
              ) : (
                <div className="mt-4 flex flex-col gap-3">
                  {topConsumed.map((row) => (
                    <div key={row.itemId} className="flex items-center gap-3">
                      <div className="w-44 shrink-0">
                        <Tooltip content={itemName(row.itemId)}>
                          <p className="truncate" style={{ fontSize: 14, color: '#0D2630' }}>
                            {itemName(row.itemId)}
                          </p>
                        </Tooltip>
                      </div>
                      <div
                        className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full"
                        style={{ background: 'rgba(226,237,241,0.6)' }}
                      >
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(row.qty / maxConsumed) * 100}%`,
                            background: '#00B4D8',
                          }}
                        />
                      </div>
                      <p
                        className="w-10 shrink-0 text-right font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {row.qty}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Stock Alerts tab ─────────────────────────────────────────── */}
          {activeTab === 'alerts' && (
            <div
              className="rounded-b-[12px] p-4 sm:p-5"
              style={{
                background: '#FFFFFF',
                border: '1px solid rgba(0,100,130,0.12)',
                borderTop: 'none',
              }}
            >
              <p style={{ fontSize: 14, color: '#4A7080' }}>
                Items at or below minimum stock, lowest first.
              </p>
              {alertRows.length === 0 ? (
                <EmptyState
                  message="No stock alerts"
                  hint="Every item is above its minimum stock level."
                />
              ) : (
                <div className="mt-3">
                  <ScrollableTable minWidth={950} maxHeight={640}>
                    <div
                      className={`flex items-center rounded-t-[8px] ${TABLE_HEADER_STICKY_CLASS}`}
                      style={{ background: TABLE_HEADER_BG, borderBottom: '1px solid #E6F8FD' }}
                    >
                      {[
                        ['Item Name', 'min-w-[160px] flex-1'],
                        ['Catalog No.', 'w-32'],
                        ['Current Stock', 'w-36'],
                        ['Min Stock', 'w-28'],
                        ['Status', 'w-32'],
                        ['Location', 'w-36'],
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
                      <div className="w-44 shrink-0 py-2.5 pr-3 text-center">
                        <span
                          className="font-sans font-bold tracking-wider uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Actions
                        </span>
                      </div>
                    </div>
                    {alertRows.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center"
                        style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                      >
                        <div className="min-w-0 flex-1 py-3 pr-2 pl-3 text-center">
                          <Tooltip content={item.name}>
                            <p
                              className="truncate font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {item.name}
                            </p>
                          </Tooltip>
                        </div>
                        <div className="w-32 shrink-0 py-3 pr-2 text-center">
                          <p className="truncate" style={{ fontSize: 14, color: '#00B4D8' }}>
                            {item.catalogNo}
                          </p>
                        </div>
                        <div className="w-36 shrink-0 py-3 pr-2 text-center">
                          <p style={{ fontSize: 14, color: '#0D2630' }}>
                            {item.currentStock}{' '}
                            <span style={{ color: '#8A98A3' }}>{item.unit}</span>
                          </p>
                        </div>
                        <div className="w-28 shrink-0 py-3 pr-2 text-center">
                          <p style={{ fontSize: 14, color: '#4A7080' }}>{item.minStock}</p>
                        </div>
                        <div className="w-32 shrink-0 py-3 pr-2 text-center">
                          <StatusBadge status={getInventoryStatus(item)} />
                        </div>
                        <div className="w-36 shrink-0 py-3 pr-2 text-center">
                          <Tooltip content={item.location}>
                            <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                              {item.location}
                            </p>
                          </Tooltip>
                        </div>
                        <div className="flex w-44 shrink-0 items-center justify-center py-3 pr-3">
                          <PermissionGate permission={PERMISSIONS.LAB_INVENTORY_WRITE}>
                            <button
                              type="button"
                              onClick={() => handleReorder(item)}
                              className={`flex h-9 items-center rounded-[8px] px-3 font-sans font-medium whitespace-nowrap transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
                              style={{
                                fontSize: 14,
                                color: '#00B4D8',
                                border: '1px solid rgba(0,180,216,0.35)',
                              }}
                            >
                              Create Reorder Request
                            </button>
                          </PermissionGate>
                        </div>
                      </div>
                    ))}
                  </ScrollableTable>
                </div>
              )}
            </div>
          )}

          {/* ── Reorder Management tab ───────────────────────────────────── */}
          {activeTab === 'reorder' && (
            <div
              className="rounded-b-[12px] p-4 sm:p-5"
              style={{
                background: '#FFFFFF',
                border: '1px solid rgba(0,100,130,0.12)',
                borderTop: 'none',
              }}
            >
              <p style={{ fontSize: 14, color: '#4A7080' }}>
                Every reorder raised from Stock Alerts, most recent first — the full approval
                workflow for each lives in Procurement Requests.
              </p>
              {(() => {
                const stockAlertRequests = procurementRequests.filter(
                  (r) => r.origin === 'Stock Alert',
                );
                return stockAlertRequests.length === 0 ? (
                  <EmptyState
                    message="No reorder requests"
                    hint="Create one from Stock Alerts when an item runs low."
                  />
                ) : (
                  <div className="mt-3">
                    <ScrollableTable minWidth={1040} maxHeight={640}>
                      <div
                        className={`flex items-center rounded-t-[8px] ${TABLE_HEADER_STICKY_CLASS}`}
                        style={{ background: TABLE_HEADER_BG, borderBottom: '1px solid #E6F8FD' }}
                      >
                        {[
                          ['Request No.', 'w-32'],
                          ['Item Name', 'min-w-[160px] flex-1'],
                          ['Qty Requested', 'w-28'],
                          ['Status', 'w-32'],
                          ['Requested By', 'w-36'],
                          ['Requested At', 'w-36'],
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
                        <div className="w-40 shrink-0 py-2.5 pr-3 text-center">
                          <span
                            className="font-sans font-bold tracking-wider uppercase"
                            style={{ fontSize: 14, color: '#4A7080' }}
                          >
                            Actions
                          </span>
                        </div>
                      </div>
                      {[...stockAlertRequests]
                        .sort(
                          (a, b) =>
                            new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime(),
                        )
                        .map((r) => {
                          const cfg = PROCUREMENT_STATUS_CFG[r.status]!;
                          const firstLine = r.lineItems[0];
                          return (
                            <div
                              key={r.id}
                              className="flex items-center"
                              style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                            >
                              <div className="w-32 shrink-0 py-3 pr-2 pl-3 text-center">
                                <p className="truncate" style={{ fontSize: 14, color: '#00B4D8' }}>
                                  {r.id}
                                </p>
                              </div>
                              <div className="min-w-0 flex-1 py-3 pr-2 text-center">
                                <Tooltip content={firstLine?.name ?? '—'}>
                                  <p
                                    className="truncate font-sans font-medium"
                                    style={{ fontSize: 14, color: '#0D2630' }}
                                  >
                                    {firstLine?.name ?? '—'}
                                  </p>
                                </Tooltip>
                              </div>
                              <div className="w-28 shrink-0 py-3 pr-2 text-center">
                                <p style={{ fontSize: 14, color: '#0D2630' }}>
                                  {firstLine?.quantity ?? '—'}
                                </p>
                              </div>
                              <div className="w-32 shrink-0 py-3 pr-2 text-center">
                                <span
                                  className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium whitespace-nowrap"
                                  style={{ fontSize: 14, color: cfg.color, background: cfg.bg }}
                                >
                                  {r.status}
                                </span>
                              </div>
                              <div className="w-36 shrink-0 py-3 pr-2 text-center">
                                <Tooltip content={r.requestedBy}>
                                  <p
                                    className="truncate"
                                    style={{ fontSize: 14, color: '#4A7080' }}
                                  >
                                    {r.requestedBy}
                                  </p>
                                </Tooltip>
                              </div>
                              <div className="w-36 shrink-0 py-3 pr-2 text-center">
                                <p style={{ fontSize: 14, color: '#4A7080' }}>
                                  {formatHumanDate(r.requestDate)}
                                </p>
                              </div>
                              <div className="flex w-40 shrink-0 items-center justify-center py-3 pr-3">
                                <button
                                  type="button"
                                  onClick={() => router.push(ROUTES.laboratoryProcurementRequests)}
                                  className={`flex h-9 items-center rounded-[8px] px-3 font-sans font-medium whitespace-nowrap transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
                                  style={{
                                    fontSize: 14,
                                    color: '#00B4D8',
                                    border: '1px solid rgba(0,180,216,0.35)',
                                  }}
                                >
                                  View in Procurement →
                                </button>
                              </div>
                            </div>
                          );
                        })}
                    </ScrollableTable>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ── Inventory History tab ────────────────────────────────────── */}
          {activeTab === 'history' && (
            <div
              className="rounded-b-[12px] p-4 sm:p-5"
              style={{
                background: '#FFFFFF',
                border: '1px solid rgba(0,100,130,0.12)',
                borderTop: 'none',
              }}
            >
              <p style={{ fontSize: 14, color: '#4A7080' }}>
                Every stock movement — received, consumed, adjusted, disposed — most recent first.
              </p>
              {movements.length === 0 ? (
                <EmptyState
                  message="No stock movements yet"
                  hint="Stock movements will appear here as they happen."
                />
              ) : (
                <div className="mt-3 flex flex-col gap-2.5">
                  {[...movements]
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((m) => {
                      const Icon = MOVEMENT_ICON[m.type] ?? ClipboardList;
                      return (
                        <div
                          key={m.id}
                          className="flex items-start gap-3 rounded-[10px] p-3"
                          style={{
                            background: '#F5FBFD',
                            border: '1px solid rgba(0,100,130,0.08)',
                          }}
                        >
                          <div
                            className="flex size-9 shrink-0 items-center justify-center rounded-full"
                            style={{ background: 'rgba(0,180,216,0.1)' }}
                          >
                            <Icon style={{ width: 16, height: 16, color: '#00B4D8' }} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p
                              className="font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {m.type} · {itemName(m.itemId)}
                              <span className="ml-1.5" style={{ color: '#4A7080' }}>
                                ({m.quantity > 0 ? '+' : ''}
                                {m.quantity})
                              </span>
                            </p>
                            <p style={{ fontSize: 14, color: '#4A7080' }}>{m.notes}</p>
                            <p className="mt-0.5" style={{ fontSize: 14, color: '#8A98A3' }}>
                              {m.performedBy}
                            </p>
                          </div>
                          <p
                            className="shrink-0 whitespace-nowrap"
                            style={{ fontSize: 14, color: '#8A98A3' }}
                          >
                            {formatHumanDate(m.date)}
                          </p>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {addItemOpen && (
        <AddInventoryItemModal
          onClose={() => setAddItemOpen(false)}
          onSubmit={(item) => {
            setAddItemOpen(false);
            toast.success('Item added', `${item.name} (${item.catalogNo}) is now tracked.`);
          }}
        />
      )}

      {importOpen && (
        <ImportInventoryModal
          onClose={() => setImportOpen(false)}
          onSubmit={(created) => {
            setImportOpen(false);
            toast.success(
              'Inventory imported',
              `${created.length} item${created.length !== 1 ? 's' : ''} added.`,
            );
          }}
        />
      )}
    </div>
  );
}
