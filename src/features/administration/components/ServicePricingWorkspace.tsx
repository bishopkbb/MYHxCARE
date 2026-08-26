'use client';

import {
  CheckCircle2,
  ClipboardCheck,
  Download,
  Eye,
  FileEdit,
  History,
  MoreVertical,
  Package,
  Pause,
  PenLine,
  Search,
  Send,
  Tag,
  X,
  XCircle,
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
import { StatCard } from '@components/shared/StatCard';
import { Tooltip } from '@components/shared/Tooltip';
import { PERMISSIONS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
import { ORG_DEPARTMENT_OPTIONS } from '@/constants/organizationalDepartments';
import { useToast } from '@/hooks/useToast';
import { downloadCSV } from '@/utils/export';
import { formatCurrencyWhole } from '@/utils/currency';
import { formatDateTime, formatHumanDate } from '@/utils/datetime';
import {
  CATEGORY_OPTIONS,
  STATUS_OPTIONS,
  computeServiceStats,
  type ServiceRecord,
  type ServiceStatus,
} from '@/features/administration/__mocks__/servicePricingFixtures';
import type { PriceChangeLogEntry } from '@/features/administration/__mocks__/priceChangeLogFixtures';
import {
  publishPendingChange,
  rejectPendingChange,
  setServiceStatus,
  useServicePriceLog,
  useServices,
} from '@/features/administration/store/servicePricingStore';

const AddServiceModal = dynamic(() => import('./AddServiceModal').then((m) => m.AddServiceModal), {
  ssr: false,
  loading: () => <ModalLoadingFallback />,
});
const EditPriceModal = dynamic(() => import('./EditPriceModal').then((m) => m.EditPriceModal), {
  ssr: false,
  loading: () => <ModalLoadingFallback />,
});
const ServiceDetailModal = dynamic(
  () => import('./ServiceDetailModal').then((m) => m.ServiceDetailModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';
const ROWS_PER_PAGE = 10;

type TabKey = 'catalogue' | 'pending' | 'history';

const STATUS_CFG: Record<ServiceStatus, { color: string; dot: string }> = {
  Active: { color: '#16A34A', dot: '#22C55E' },
  Pending: { color: '#D97706', dot: '#F59E0B' },
  Inactive: { color: '#DC2626', dot: '#EF4444' },
};

function StatusBadge({ status }: { status: ServiceStatus }) {
  const cfg = STATUS_CFG[status];
  return (
    <span
      className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium whitespace-nowrap"
      style={{
        fontSize: 14,
        color: cfg.color,
        border: `1px solid ${cfg.color}55`,
        background: `${cfg.color}14`,
      }}
    >
      {status}
    </span>
  );
}

export function ServicePricingWorkspace() {
  const router = useRouter();
  const toast = useToast();

  const services = useServices();
  const priceLog = useServicePriceLog();
  const stats = computeServiceStats(services, priceLog);

  const [activeTab, setActiveTab] = useState<TabKey>('catalogue');
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('ALL');
  const [category, setCategory] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [openFilter, setOpenFilter] = useState<'department' | 'category' | 'status' | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(ROWS_PER_PAGE);
  const [addServiceOpen, setAddServiceOpen] = useState(false);
  const [editService, setEditService] = useState<ServiceRecord | null>(null);
  const [detailService, setDetailService] = useState<ServiceRecord | null>(null);
  const [historyFilter, setHistoryFilter] = useState<string | null>(null);

  const FILTER_DEFS: { key: 'department' | 'category' | 'status'; def: FilterDef }[] = [
    {
      key: 'department',
      def: { key: 'department', defaultLabel: 'All Departments', options: ORG_DEPARTMENT_OPTIONS },
    },
    {
      key: 'category',
      def: { key: 'category', defaultLabel: 'All Categories', options: CATEGORY_OPTIONS },
    },
    { key: 'status', def: { key: 'status', defaultLabel: 'All Status', options: STATUS_OPTIONS } },
  ];
  const filterValue: Record<string, string> = { department, category, status };
  const filterSetter: Record<string, (v: string) => void> = {
    department: setDepartment,
    category: setCategory,
    status: setStatus,
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return services.filter((s) => {
      if (department !== 'ALL' && s.department !== department) return false;
      if (category !== 'ALL' && s.category !== category) return false;
      if (status !== 'ALL' && s.status !== status) return false;
      if (q && !s.name.toLowerCase().includes(q) && !s.id.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [services, search, department, category, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageRows = filtered.slice(pageStart, pageStart + pageSize);

  const pendingServices = services.filter((s) => s.status === 'Pending');

  function handleExport() {
    const rows = [
      [
        'Service ID',
        'Service Name',
        'Department',
        'Category',
        'Current Price',
        'Effective Date',
        'Status',
        'Last Updated',
        'Updated By',
      ],
      ...filtered.map((s) => [
        s.id,
        s.name,
        s.department,
        s.category,
        String(s.currentPrice),
        formatHumanDate(s.effectiveDate),
        s.status,
        formatDateTime(s.lastUpdatedAt),
        s.lastUpdatedBy,
      ]),
    ];
    downloadCSV('service-catalogue', rows);
    toast.success(
      'Export ready',
      `${filtered.length} service${filtered.length !== 1 ? 's' : ''} exported as CSV.`,
    );
  }

  function handleExportOne(s: ServiceRecord) {
    const rows = [
      ['Field', 'Value'],
      ['Service ID', s.id],
      ['Name', s.name],
      ['Department', s.department],
      ['Category', s.category],
      ['Current Price', formatCurrencyWhole(s.currentPrice)],
      ['Effective Date', formatHumanDate(s.effectiveDate)],
      ['Status', s.status],
      ['Last Updated', formatDateTime(s.lastUpdatedAt)],
      ['Updated By', s.lastUpdatedBy],
    ];
    downloadCSV(`service-${s.id.toLowerCase()}`, rows);
    toast.success('Export ready', `${s.name} exported as CSV.`);
  }

  function handlePublish(s: ServiceRecord) {
    publishPendingChange(s.id);
    toast.success(
      'Price published',
      `${s.name} is now live at ${formatCurrencyWhole(s.pendingPrice ?? s.currentPrice)}.`,
    );
  }

  function handleReject(s: ServiceRecord) {
    rejectPendingChange(s.id);
    toast.info('Change rejected', `${s.name}'s pending price change has been discarded.`);
  }

  function handleToggleStatus(s: ServiceRecord) {
    const next: ServiceStatus = s.status === 'Inactive' ? 'Active' : 'Inactive';
    setServiceStatus(s.id, next);
    toast.success(
      next === 'Active' ? 'Service activated' : 'Service deactivated',
      `${s.name} is now ${next.toLowerCase()}.`,
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto max-w-[1200px] px-4 py-4 sm:px-6 sm:py-5">
          {/* Breadcrumb */}
          <div className="flex flex-wrap items-center gap-1.5" style={{ fontSize: 14 }}>
            <button
              type="button"
              onClick={() => router.push(ROUTES.admin)}
              className={`font-sans transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
              style={{ color: '#4A7080' }}
            >
              Home
            </button>
            <span style={{ color: '#8A98A3' }}>/</span>
            <span style={{ color: '#4A7080' }}>Configuration</span>
            <span style={{ color: '#8A98A3' }}>/</span>
            <span className="font-medium" style={{ color: '#0D2630' }}>
              Service &amp; Pricing
            </span>
          </div>

          {/* Header */}
          <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1
                className="font-display font-semibold"
                style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
              >
                Service &amp; Pricing
              </h1>
              <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                Manage services offered by the medical centre and their pricing.
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
              >
                <History style={{ width: 15, height: 15 }} />
                Price History
              </button>
              <PermissionGate permission={PERMISSIONS.ADMIN_WRITE}>
                <button
                  type="button"
                  onClick={() => setAddServiceOpen(true)}
                  className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                  style={{ fontSize: 14, background: '#00B4D8' }}
                >
                  + Add Service
                </button>
              </PermissionGate>
            </div>
          </div>

          {/* Stat cards */}
          <div className="mt-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-5 xl:gap-4">
            <StatCard
              icon={Package}
              label="Total Services"
              value={stats.total}
              info="All active & inactive services"
              accent="#2563EB"
              iconBg="rgba(37,99,235,0.1)"
            />
            <StatCard
              icon={CheckCircle2}
              label="Active Services"
              value={stats.active}
              info="Currently available services"
              accent="#16A34A"
              iconBg="rgba(22,163,74,0.1)"
              onClick={() => {
                setStatus('Active');
                setActiveTab('catalogue');
                setPage(1);
              }}
            />
            <StatCard
              icon={FileEdit}
              label="Pending Publication"
              value={stats.pending}
              info="Prices awaiting publication"
              accent="#D97706"
              iconBg="rgba(217,119,6,0.1)"
              onClick={() => setActiveTab('pending')}
            />
            <StatCard
              icon={Pause}
              label="Inactive Services"
              value={stats.inactive}
              info="Temporarily unavailable"
              accent="#7C3AED"
              iconBg="rgba(124,58,237,0.1)"
              onClick={() => {
                setStatus('Inactive');
                setActiveTab('catalogue');
                setPage(1);
              }}
            />
            <StatCard
              icon={Tag}
              label="Price Changes (This Month)"
              value={stats.priceChangesThisMonth}
              info="Services with price updates"
              accent="#00B4D8"
              iconBg="rgba(0,180,216,0.1)"
              onClick={() => setActiveTab('history')}
            />
          </div>

          {/* Tabs */}
          <div
            className="mt-5 rounded-[12px]"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <div className="overflow-x-auto scroll-smooth px-4 pt-3 sm:px-5">
              <div
                className="flex gap-1"
                style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
              >
                {(
                  [
                    { key: 'catalogue', label: 'Service Catalogue' },
                    {
                      key: 'pending',
                      label: `Price Changes Awaiting Publication (${stats.pending})`,
                    },
                    { key: 'history', label: 'Published Price History' },
                  ] as { key: TabKey; label: string }[]
                ).map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`shrink-0 px-3.5 py-2.5 font-sans font-medium whitespace-nowrap transition-colors duration-150 ${FOCUS_RING}`}
                    style={{
                      fontSize: 14,
                      color: activeTab === tab.key ? '#00B4D8' : '#4A7080',
                      borderBottom:
                        activeTab === tab.key ? '2px solid #00B4D8' : '2px solid transparent',
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 sm:p-5">
              {activeTab === 'catalogue' && (
                <>
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
                        placeholder="Search services..."
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
                        value={filterValue[key] ?? 'ALL'}
                        isOpen={openFilter === key}
                        onToggle={() => setOpenFilter(openFilter === key ? null : key)}
                        onSelect={(v) => {
                          filterSetter[key]?.(v);
                          setPage(1);
                          setOpenFilter(null);
                        }}
                      />
                    ))}
                    <button
                      type="button"
                      onClick={handleExport}
                      className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                      style={{ fontSize: 14, background: '#00B4D8' }}
                    >
                      <Download style={{ width: 15, height: 15 }} />
                      Export
                    </button>
                  </div>

                  <div className="mt-4">
                    {pageRows.length === 0 ? (
                      <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
                        <div
                          className="flex size-14 items-center justify-center rounded-full"
                          style={{ background: 'rgba(226,237,241,0.6)' }}
                        >
                          <Package style={{ width: 28, height: 28, color: '#8A98A3' }} />
                        </div>
                        <p
                          className="font-sans font-semibold"
                          style={{ fontSize: 16, color: '#0D2630' }}
                        >
                          No services match these filters
                        </p>
                        <p style={{ fontSize: 14, color: '#4A7080' }}>
                          Try widening your search or clearing filters.
                        </p>
                      </div>
                    ) : (
                      <ScrollableTable minWidth={1320} maxHeight={640}>
                        <div
                          className={`flex items-center rounded-t-[8px] ${TABLE_HEADER_STICKY_CLASS}`}
                          style={{ background: TABLE_HEADER_BG, borderBottom: '1px solid #E6F8FD' }}
                        >
                          {[
                            ['Service Name', 'min-w-[180px] flex-1 max-w-[220px]', 'text-left'],
                            ['Department', 'w-40', 'text-left'],
                            ['Category', 'w-32', 'text-left'],
                            ['Current Price', 'w-32', 'text-right'],
                            ['Effective Date', 'w-32', 'text-center'],
                            ['Status', 'w-24', 'text-center'],
                            ['Last Updated', 'w-40', 'text-left'],
                          ].map(([label, width, align]) => (
                            <div
                              key={label}
                              className={`${width} shrink-0 py-2.5 pr-2 pl-3 ${align}`}
                            >
                              <span
                                className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                                style={{ fontSize: 14, color: '#4A7080' }}
                              >
                                {label}
                              </span>
                            </div>
                          ))}
                          <div className="w-28 shrink-0 py-2.5 pr-3 pl-3 text-center">
                            <span
                              className="font-sans font-bold tracking-wider uppercase"
                              style={{ fontSize: 14, color: '#4A7080' }}
                            >
                              Actions
                            </span>
                          </div>
                        </div>
                        {pageRows.map((s) => (
                          <ServiceRow
                            key={s.id}
                            service={s}
                            onView={() => setDetailService(s)}
                            onEdit={() => setEditService(s)}
                            onViewHistory={() => {
                              setHistoryFilter(s.name);
                              setActiveTab('history');
                            }}
                            onToggleStatus={() => handleToggleStatus(s)}
                            onExport={() => handleExportOne(s)}
                          />
                        ))}
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
                        itemLabel="services"
                        pageSizeOptions={[10, 25, 50]}
                      />
                    )}
                  </div>
                </>
              )}

              {activeTab === 'pending' && (
                <PendingPublicationTab
                  services={pendingServices}
                  onPublish={handlePublish}
                  onReject={handleReject}
                />
              )}

              {activeTab === 'history' && (
                <PublishedHistoryTab
                  log={priceLog}
                  filterServiceName={historyFilter}
                  onClearFilter={() => setHistoryFilter(null)}
                />
              )}
            </div>
          </div>

          {/* Bottom info strip */}
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
            <div
              className="rounded-[12px] p-4 sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Pricing Update Workflow
              </p>
              <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
                All price changes follow a controlled approval and publication process.
              </p>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-4">
                {[
                  {
                    icon: FileEdit,
                    label: '1. Create / Edit Price',
                    hint: 'Add new service or edit existing price details',
                    color: '#2563EB',
                  },
                  {
                    icon: ClipboardCheck,
                    label: '2. Set Effective Date',
                    hint: 'Choose when the new price will take effect',
                    color: '#D97706',
                  },
                  {
                    icon: Eye,
                    label: '3. Review',
                    hint: 'Review changes before sending for approval',
                    color: '#7C3AED',
                  },
                  {
                    icon: Send,
                    label: '4. Publish',
                    hint: 'Publish to make the new price active for all users',
                    color: '#16A34A',
                  },
                ].map((step) => (
                  <div key={step.label} className="flex flex-col items-start gap-2">
                    <div
                      className="flex size-10 shrink-0 items-center justify-center rounded-full"
                      style={{ background: `${step.color}1A` }}
                    >
                      <step.icon style={{ width: 18, height: 18, color: step.color }} />
                    </div>
                    <p
                      className="font-sans font-semibold"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {step.label}
                    </p>
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>{step.hint}</p>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="rounded-[12px] p-4 sm:p-5"
              style={{ background: '#F5FBFD', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                About Service Pricing
              </p>
              <div className="mt-3 flex flex-col gap-2">
                {[
                  'Prices are department specific',
                  'All price changes are logged',
                  'Effective date ensures smooth transition',
                  'Published prices cannot be edited',
                ].map((line) => (
                  <div key={line} className="flex items-start gap-2">
                    <CheckCircle2
                      style={{
                        width: 15,
                        height: 15,
                        color: '#16A34A',
                        flexShrink: 0,
                        marginTop: 3,
                      }}
                    />
                    <span style={{ fontSize: 14, color: '#4A7080' }}>{line}</span>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`mt-4 flex h-11 w-full items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                style={{ fontSize: 14, background: '#00B4D8' }}
              >
                <History style={{ width: 15, height: 15 }} />
                View Price History
              </button>
            </div>
          </div>
        </div>
      </main>

      {addServiceOpen && (
        <AddServiceModal
          onClose={() => setAddServiceOpen(false)}
          onSubmit={(service) => {
            setAddServiceOpen(false);
            toast.success('Service added', `${service.name} has been added to the catalogue.`);
          }}
        />
      )}

      {editService && (
        <EditPriceModal
          service={editService}
          onClose={() => setEditService(null)}
          onSubmit={() => {
            setEditService(null);
            toast.success(
              'Price change submitted',
              `${editService.name}'s new price is awaiting publication.`,
            );
          }}
        />
      )}

      {detailService && (
        <ServiceDetailModal
          service={detailService}
          log={priceLog}
          onClose={() => setDetailService(null)}
        />
      )}
    </div>
  );
}

// ── Service Catalogue row ───────────────────────────────────────────────

function ServiceRow({
  service,
  onView,
  onEdit,
  onViewHistory,
  onToggleStatus,
  onExport,
}: {
  service: ServiceRecord;
  onView: () => void;
  onEdit: () => void;
  onViewHistory: () => void;
  onToggleStatus: () => void;
  onExport: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <div
      className="flex items-center transition-colors duration-100 hover:bg-[#F5FBFD]"
      style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
    >
      <div className="max-w-[220px] min-w-[180px] flex-1 py-3 pr-2 pl-3">
        <Tooltip content={service.name}>
          <p className="truncate font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
            {service.name}
          </p>
        </Tooltip>
        <p style={{ fontSize: 14, color: '#8A98A3' }}>{service.id}</p>
      </div>
      <div className="w-40 shrink-0 py-3 pr-2 pl-3">
        <Tooltip content={service.department}>
          <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
            {service.department}
          </p>
        </Tooltip>
      </div>
      <div className="w-32 shrink-0 py-3 pr-2 pl-3">
        <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
          {service.category}
        </p>
      </div>
      <div className="w-32 shrink-0 py-3 pr-2 pl-3 text-right">
        <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
          {formatCurrencyWhole(service.currentPrice)}
        </p>
        {service.pendingPrice !== null && (
          <p style={{ fontSize: 14, color: '#D97706' }}>
            &rarr; {formatCurrencyWhole(service.pendingPrice)}
          </p>
        )}
      </div>
      <div className="w-32 shrink-0 py-3 pr-2 pl-3 text-center">
        <p style={{ fontSize: 14, color: '#4A7080' }}>{formatHumanDate(service.effectiveDate)}</p>
      </div>
      <div className="w-24 shrink-0 py-3 pr-2 pl-3 text-center">
        <StatusBadge status={service.status} />
      </div>
      <div className="w-40 shrink-0 py-3 pr-2 pl-3">
        <p style={{ fontSize: 14, color: '#4A7080' }}>{formatHumanDate(service.lastUpdatedAt)}</p>
        <p style={{ fontSize: 14, color: '#8A98A3' }}>by {service.lastUpdatedBy}</p>
      </div>
      <div className="flex w-28 shrink-0 items-center justify-center gap-1 py-3 pr-3 pl-3">
        <button
          type="button"
          onClick={onView}
          aria-label={`View ${service.name}`}
          className={`flex size-9 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
        >
          <Eye style={{ width: 15, height: 15, color: '#4A7080' }} />
        </button>
        <PermissionGate permission={PERMISSIONS.ADMIN_WRITE}>
          <button
            type="button"
            onClick={onEdit}
            aria-label={`Edit price for ${service.name}`}
            className={`flex size-9 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
          >
            <PenLine style={{ width: 15, height: 15, color: '#4A7080' }} />
          </button>
        </PermissionGate>
        <div className="relative">
          <button
            ref={buttonRef}
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={`More actions for ${service.name}`}
            className={`flex size-9 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
          >
            <MoreVertical style={{ width: 15, height: 15, color: '#4A7080' }} />
          </button>
          <RowMenuPortal
            open={menuOpen}
            anchorRef={buttonRef}
            onClose={() => setMenuOpen(false)}
            width={200}
          >
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onViewHistory();
              }}
              className="flex w-full items-center px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD]"
              style={{ fontSize: 14, color: '#2F3A40' }}
            >
              View Price History
            </button>
            <PermissionGate permission={PERMISSIONS.ADMIN_WRITE}>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onToggleStatus();
                }}
                className="flex w-full items-center px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD]"
                style={{
                  fontSize: 14,
                  color: service.status === 'Inactive' ? '#16A34A' : '#DC2626',
                }}
              >
                {service.status === 'Inactive' ? 'Activate Service' : 'Deactivate Service'}
              </button>
            </PermissionGate>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onExport();
              }}
              className="flex w-full items-center px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD]"
              style={{ fontSize: 14, color: '#2F3A40' }}
            >
              Export Service
            </button>
          </RowMenuPortal>
        </div>
      </div>
    </div>
  );
}

// ── Price Changes Awaiting Publication tab ──────────────────────────────

function PendingPublicationTab({
  services,
  onPublish,
  onReject,
}: {
  services: ServiceRecord[];
  onPublish: (s: ServiceRecord) => void;
  onReject: (s: ServiceRecord) => void;
}) {
  if (services.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
        <div
          className="flex size-14 items-center justify-center rounded-full"
          style={{ background: 'rgba(226,237,241,0.6)' }}
        >
          <ClipboardCheck style={{ width: 28, height: 28, color: '#8A98A3' }} />
        </div>
        <p className="font-sans font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
          Nothing awaiting publication
        </p>
        <p style={{ fontSize: 14, color: '#4A7080' }}>
          Every price change has been reviewed and published.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {services.map((s) => (
        <div
          key={s.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] p-3.5"
          style={{ border: '1px solid rgba(217,119,6,0.3)', background: 'rgba(217,119,6,0.04)' }}
        >
          <div className="min-w-0 flex-1">
            <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
              {s.name}
            </p>
            <p style={{ fontSize: 14, color: '#8A98A3' }}>
              {s.department} &middot; {s.id}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 14, color: '#8A98A3' }}>
              {formatCurrencyWhole(s.currentPrice)}
            </span>
            <span style={{ fontSize: 14, color: '#8A98A3' }}>&rarr;</span>
            <span className="font-sans font-semibold" style={{ fontSize: 14, color: '#D97706' }}>
              {formatCurrencyWhole(s.pendingPrice ?? s.currentPrice)}
            </span>
          </div>
          <div className="text-right">
            <p style={{ fontSize: 14, color: '#8A98A3' }}>Effective</p>
            <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
              {s.pendingEffectiveDate ? formatHumanDate(s.pendingEffectiveDate) : 'Not set'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <PermissionGate permission={PERMISSIONS.ADMIN_WRITE}>
              <button
                type="button"
                onClick={() => onReject(s)}
                className={`flex h-9 items-center rounded-[8px] px-3.5 font-sans font-medium transition-colors duration-150 hover:bg-[rgba(220,38,38,0.06)] ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#DC2626', border: '1px solid rgba(220,38,38,0.3)' }}
              >
                <XCircle style={{ width: 14, height: 14 }} className="mr-1.5 inline" />
                Reject
              </button>
              <button
                type="button"
                onClick={() => onPublish(s)}
                className={`flex h-9 items-center rounded-[8px] px-3.5 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                style={{ fontSize: 14, background: '#16A34A' }}
              >
                <Send style={{ width: 14, height: 14 }} className="mr-1.5 inline" />
                Publish
              </button>
            </PermissionGate>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Published Price History tab (read-only) ─────────────────────────────

function PublishedHistoryTab({
  log,
  filterServiceName,
  onClearFilter,
}: {
  log: PriceChangeLogEntry[];
  filterServiceName: string | null;
  onClearFilter: () => void;
}) {
  const rows = filterServiceName ? log.filter((e) => e.serviceName === filterServiceName) : log;

  return (
    <div>
      {filterServiceName && (
        <div className="mb-3 flex items-center gap-2">
          <span style={{ fontSize: 14, color: '#4A7080' }}>
            Showing history for <strong style={{ color: '#0D2630' }}>{filterServiceName}</strong>
          </span>
          <button
            type="button"
            onClick={onClearFilter}
            className={`flex items-center gap-1 rounded-[6px] px-2 py-1 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
            style={{ fontSize: 14, color: '#00B4D8' }}
          >
            <X style={{ width: 12, height: 12 }} />
            Clear
          </button>
        </div>
      )}
      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
          <div
            className="flex size-14 items-center justify-center rounded-full"
            style={{ background: 'rgba(226,237,241,0.6)' }}
          >
            <History style={{ width: 28, height: 28, color: '#8A98A3' }} />
          </div>
          <p className="font-sans font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
            No price history yet
          </p>
          <p style={{ fontSize: 14, color: '#4A7080' }}>
            Published price changes will appear here.
          </p>
        </div>
      ) : (
        <ScrollableTable minWidth={900} maxHeight={640}>
          <div
            className={`flex items-center rounded-t-[8px] ${TABLE_HEADER_STICKY_CLASS}`}
            style={{ background: TABLE_HEADER_BG, borderBottom: '1px solid #E6F8FD' }}
          >
            {[
              ['Service', 'min-w-[180px] flex-1', 'text-left'],
              ['Previous Price', 'w-36', 'text-right'],
              ['New Price', 'w-36', 'text-right'],
              ['Effective Date', 'w-36', 'text-center'],
              ['Published By', 'w-40', 'text-left'],
              ['Published At', 'w-44', 'text-left'],
            ].map(([label, width, align]) => (
              <div key={label} className={`${width} shrink-0 py-2.5 pr-2 pl-3 ${align}`}>
                <span
                  className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                  style={{ fontSize: 14, color: '#4A7080' }}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
          {rows.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center"
              style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
            >
              <div className="min-w-0 flex-1 py-3 pr-2 pl-3">
                <Tooltip content={entry.serviceName}>
                  <p
                    className="truncate font-sans font-medium"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    {entry.serviceName}
                  </p>
                </Tooltip>
              </div>
              <div className="w-36 shrink-0 py-3 pr-2 pl-3 text-right">
                <p style={{ fontSize: 14, color: '#8A98A3' }}>
                  {formatCurrencyWhole(entry.previousPrice)}
                </p>
              </div>
              <div className="w-36 shrink-0 py-3 pr-2 pl-3 text-right">
                <p className="font-sans font-medium" style={{ fontSize: 14, color: '#16A34A' }}>
                  {formatCurrencyWhole(entry.newPrice)}
                </p>
              </div>
              <div className="w-36 shrink-0 py-3 pr-2 pl-3 text-center">
                <p style={{ fontSize: 14, color: '#4A7080' }}>
                  {formatHumanDate(entry.effectiveDate)}
                </p>
              </div>
              <div className="w-40 shrink-0 py-3 pr-2 pl-3">
                <p style={{ fontSize: 14, color: '#4A7080' }}>{entry.changedBy}</p>
              </div>
              <div className="w-44 shrink-0 py-3 pr-2 pl-3">
                <p style={{ fontSize: 14, color: '#4A7080' }}>{formatDateTime(entry.changedAt)}</p>
              </div>
            </div>
          ))}
        </ScrollableTable>
      )}
    </div>
  );
}
