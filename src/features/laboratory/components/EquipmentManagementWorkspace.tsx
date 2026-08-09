'use client';

import {
  AlertTriangle,
  Beaker,
  Calendar,
  CalendarClock,
  CheckCircle2,
  Clock,
  Eye,
  Gauge,
  MoreVertical,
  Search,
  Snowflake,
  Truck,
  Wrench,
  X,
  XCircle,
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
import { useToast } from '@/hooks/useToast';
import { formatHumanDate } from '@/utils/datetime';
import {
  DEPARTMENT_OPTIONS,
  EQUIPMENT_TYPE_OPTIONS,
  getCalibrationState,
  type CalibrationState,
  type EquipmentRecord,
  type EquipmentStatus,
} from '@/features/laboratory/__mocks__/equipmentFixtures';
import {
  getEquipmentSummary,
  useDowntimeLogs,
  useEquipment,
  useErrorLogs,
  useServiceEvents,
} from '@/features/laboratory/store/equipmentStore';

const AddEquipmentModal = dynamic(
  () => import('./AddEquipmentModal').then((m) => m.AddEquipmentModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);
const LogServiceModal = dynamic(() => import('./LogServiceModal').then((m) => m.LogServiceModal), {
  ssr: false,
  loading: () => <ModalLoadingFallback />,
});
const EquipmentProfileModal = dynamic(
  () => import('./EquipmentProfileModal').then((m) => m.EquipmentProfileModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';
const ROWS_PER_PAGE = 10;

// ── Tabs ────────────────────────────────────────────────────────────────────

type TabKey =
  'overview' | 'calibration' | 'maintenance' | 'service-history' | 'downtime' | 'errors';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Equipment Overview' },
  { key: 'calibration', label: 'Calibration' },
  { key: 'maintenance', label: 'Maintenance' },
  { key: 'service-history', label: 'Service History' },
  { key: 'downtime', label: 'Downtime Log' },
  { key: 'errors', label: 'Error Logs' },
];

// ── Status / calibration badge configs ───────────────────────────────────────

const STATUS_CFG: Record<
  EquipmentStatus,
  { color: string; border: string; bg: string; dot: string }
> = {
  'In Use': {
    color: '#16A34A',
    border: 'rgba(34,197,94,0.4)',
    bg: 'rgba(34,197,94,0.08)',
    dot: '#22C55E',
  },
  'Under Maintenance': {
    color: '#B45309',
    border: 'rgba(245,158,11,0.4)',
    bg: 'rgba(245,158,11,0.08)',
    dot: '#F59E0B',
  },
  'Out of Service': {
    color: '#DC2626',
    border: 'rgba(239,68,68,0.4)',
    bg: 'rgba(239,68,68,0.08)',
    dot: '#EF4444',
  },
  Available: {
    color: '#2563EB',
    border: 'rgba(37,99,235,0.4)',
    bg: 'rgba(37,99,235,0.08)',
    dot: '#3B82F6',
  },
};

const CALIBRATION_CFG: Record<CalibrationState, { color: string }> = {
  OK: { color: '#4A7080' },
  Due: { color: '#B45309' },
  Overdue: { color: '#DC2626' },
  'Not Tracked': { color: '#8A98A3' },
};

const EQUIPMENT_TYPE_ICON: Record<string, LucideIcon> = {
  Analyzer: Gauge,
  Incubator: Snowflake,
  Centrifuge: Truck,
  Microscope: Search,
  Reader: Eye,
  Refrigeration: Snowflake,
  Sterilizer: Beaker,
  Instrument: Wrench,
};

function calibrationLabel(equipment: EquipmentRecord): { text: string; color: string } {
  const state = getCalibrationState(equipment);
  if (!equipment.nextCalibrationAt)
    return { text: '—', color: CALIBRATION_CFG['Not Tracked'].color };
  const days = Math.round(
    (new Date(equipment.nextCalibrationAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
  const date = formatHumanDate(equipment.nextCalibrationAt);
  if (state === 'Overdue')
    return { text: `${date} (Overdue ${Math.abs(days)}d)`, color: CALIBRATION_CFG.Overdue.color };
  if (state === 'Due')
    return {
      text: days === 0 ? `${date} (Due)` : `${date} (${days}d)`,
      color: CALIBRATION_CFG.Due.color,
    };
  return { text: `${date} (${days}d)`, color: CALIBRATION_CFG.OK.color };
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: EquipmentStatus }) {
  const cfg = STATUS_CFG[status];
  return (
    <span className="inline-flex items-center gap-1.5" style={{ fontSize: 14, color: cfg.color }}>
      <span className="size-1.5 shrink-0 rounded-full" style={{ background: cfg.dot }} />
      {status}
    </span>
  );
}

function EmptyState({ message, hint }: { message: string; hint: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      <div
        className="flex size-14 items-center justify-center rounded-full"
        style={{ background: 'rgba(226,237,241,0.6)' }}
      >
        <Gauge style={{ width: 28, height: 28, color: '#8A98A3' }} />
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
  value: number;
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

// ── Row menu (Overview tab) ──────────────────────────────────────────────────

function RowMenu({
  equipment,
  onView,
  onLogService,
}: {
  equipment: EquipmentRecord;
  onView: () => void;
  onLogService: () => void;
}) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`More actions for ${equipment.name}`}
        className={`flex size-9 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
      >
        <MoreVertical style={{ width: 15, height: 15, color: '#4A7080' }} />
      </button>
      <RowMenuPortal open={open} anchorRef={buttonRef} onClose={() => setOpen(false)} width={208}>
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
        <PermissionGate permission={PERMISSIONS.LAB_EQUIPMENT_WRITE}>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onLogService();
            }}
            className="flex w-full items-center px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD]"
            style={{ fontSize: 14, color: '#2F3A40' }}
          >
            Add Service / Maintenance
          </button>
        </PermissionGate>
      </RowMenuPortal>
    </div>
  );
}

export function EquipmentManagementWorkspace() {
  const router = useRouter();
  const toast = useToast();

  const equipment = useEquipment();
  const serviceEvents = useServiceEvents();
  const downtimeLogs = useDowntimeLogs();
  const errorLogs = useErrorLogs();

  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('ALL');
  const [equipmentType, setEquipmentType] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [location, setLocation] = useState('ALL');
  const [openFilter, setOpenFilter] = useState<
    'department' | 'equipmentType' | 'status' | 'location' | null
  >(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(ROWS_PER_PAGE);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addEquipmentOpen, setAddEquipmentOpen] = useState(false);
  const [logServiceFor, setLogServiceFor] = useState<EquipmentRecord | null>(null);
  const [profileFor, setProfileFor] = useState<EquipmentRecord | null>(null);

  const summary = getEquipmentSummary();

  const locationOptions = useMemo(
    () => Array.from(new Set(equipment.map((e) => e.location))).sort(),
    [equipment],
  );

  const FILTER_DEFS: {
    key: 'department' | 'equipmentType' | 'status' | 'location';
    def: FilterDef;
  }[] = [
    {
      key: 'department',
      def: {
        key: 'department',
        defaultLabel: 'All Departments',
        options: DEPARTMENT_OPTIONS.map((d) => ({ value: d, label: d })),
      },
    },
    {
      key: 'equipmentType',
      def: {
        key: 'equipmentType',
        defaultLabel: 'All Types',
        options: EQUIPMENT_TYPE_OPTIONS.map((t) => ({ value: t, label: t })),
      },
    },
    {
      key: 'status',
      def: {
        key: 'status',
        defaultLabel: 'All Status',
        options: (['In Use', 'Under Maintenance', 'Out of Service', 'Available'] as const).map(
          (s) => ({ value: s, label: s }),
        ),
      },
    },
    {
      key: 'location',
      def: {
        key: 'location',
        defaultLabel: 'All Locations',
        options: locationOptions.map((l) => ({ value: l, label: l })),
      },
    },
  ];

  const filterValue: Record<string, string> = {
    department,
    equipmentType,
    status,
    location,
  };
  const filterSetter: Record<string, (v: string) => void> = {
    department: setDepartment,
    equipmentType: setEquipmentType,
    status: setStatus,
    location: setLocation,
  };

  const hasActiveFilters =
    department !== 'ALL' ||
    equipmentType !== 'ALL' ||
    status !== 'ALL' ||
    location !== 'ALL' ||
    search.trim() !== '';

  function resetFilters() {
    setDepartment('ALL');
    setEquipmentType('ALL');
    setStatus('ALL');
    setLocation('ALL');
    setSearch('');
    setPage(1);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return equipment.filter((e) => {
      if (department !== 'ALL' && e.department !== department) return false;
      if (equipmentType !== 'ALL' && e.equipmentType !== equipmentType) return false;
      if (status !== 'ALL' && e.status !== status) return false;
      if (location !== 'ALL' && e.location !== location) return false;
      if (
        q &&
        !e.name.toLowerCase().includes(q) &&
        !e.id.toLowerCase().includes(q) &&
        !e.model.toLowerCase().includes(q) &&
        !e.serialNumber.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [equipment, department, equipmentType, status, location, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageRows = filtered.slice(pageStart, pageStart + pageSize);

  const selected = selectedId ? equipment.find((e) => e.id === selectedId) : undefined;

  const dueEquipment = useMemo(
    () =>
      equipment.filter(
        (e) => getCalibrationState(e) !== 'OK' && getCalibrationState(e) !== 'Not Tracked',
      ),
    [equipment],
  );

  const scheduledEvents = useMemo(
    () =>
      [...serviceEvents]
        .filter((s) => s.status === 'Scheduled')
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [serviceEvents],
  );

  const completedEvents = useMemo(
    () =>
      [...serviceEvents]
        .filter((s) => s.status === 'Completed')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [serviceEvents],
  );

  const sortedDowntime = useMemo(
    () =>
      [...downtimeLogs].sort(
        (a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime(),
      ),
    [downtimeLogs],
  );

  const sortedErrors = useMemo(
    () =>
      [...errorLogs].sort(
        (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
      ),
    [errorLogs],
  );

  function equipmentName(id: string): string {
    return equipment.find((e) => e.id === id)?.name ?? id;
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto max-w-[1200px] px-4 py-4 sm:px-6 sm:py-5">
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
            <span style={{ color: '#4A7080' }}>Quality Management</span>
            <span style={{ color: '#8A98A3' }}>/</span>
            <span className="font-medium" style={{ color: '#0D2630' }}>
              Equipment Management
            </span>
          </div>

          {/* ── Header ──────────────────────────────────────────────────── */}
          <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1
                className="font-display font-semibold"
                style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
              >
                Equipment Management
              </h1>
              <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                Monitor equipment status and manage calibration, maintenance, and service
                activities.
              </p>
            </div>
            <PermissionGate permission={PERMISSIONS.LAB_EQUIPMENT_WRITE}>
              <button
                type="button"
                onClick={() => setAddEquipmentOpen(true)}
                className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                style={{ fontSize: 14, background: '#00B4D8' }}
              >
                + Add New Equipment
              </button>
            </PermissionGate>
          </div>

          {/* ── Stat cards ──────────────────────────────────────────────── */}
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            <MiniStat
              icon={Gauge}
              iconColor="#0D9488"
              iconBg="rgba(13,148,136,0.12)"
              label="Total Equipment"
              value={summary.total}
              info="Across all departments"
              infoColor="#4A7080"
            />
            <MiniStat
              icon={Truck}
              iconColor="#16A34A"
              iconBg="rgba(34,197,94,0.12)"
              label="In Use"
              value={summary.inUse}
              info={`${Math.round((summary.inUse / Math.max(1, summary.total)) * 1000) / 10}% of total`}
              infoColor="#16A34A"
            />
            <MiniStat
              icon={Wrench}
              iconColor="#D97706"
              iconBg="rgba(245,158,11,0.12)"
              label="Under Maintenance"
              value={summary.underMaintenance}
              info={`${Math.round((summary.underMaintenance / Math.max(1, summary.total)) * 1000) / 10}% of total`}
              infoColor="#D97706"
            />
            <MiniStat
              icon={XCircle}
              iconColor="#DC2626"
              iconBg="rgba(239,68,68,0.12)"
              label="Out of Service"
              value={summary.outOfService}
              info={`${Math.round((summary.outOfService / Math.max(1, summary.total)) * 1000) / 10}% of total`}
              infoColor="#DC2626"
            />
            <MiniStat
              icon={CalendarClock}
              iconColor="#2563EB"
              iconBg="rgba(37,99,235,0.12)"
              label="Due for Calibration"
              value={summary.dueForCalibration}
              info="View due list"
              infoColor="#2563EB"
              onClick={() => setActiveTab('calibration')}
            />
            <MiniStat
              icon={AlertTriangle}
              iconColor="#DC2626"
              iconBg="rgba(239,68,68,0.12)"
              label="Overdue"
              labelColor="#DC2626"
              value={summary.overdue}
              info="Requires attention"
              infoColor="#DC2626"
              onClick={() => setActiveTab('calibration')}
            />
          </div>

          {/* ── Tabs ────────────────────────────────────────────────────── */}
          <div
            className="mt-5 flex gap-1 overflow-x-auto scroll-smooth rounded-t-[12px] px-3 pt-3"
            style={{
              background: '#FFFFFF',
              border: '1px solid rgba(0,100,130,0.12)',
              borderBottom: 'none',
            }}
          >
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
                    placeholder="Search equipment name, ID, model, or serial number..."
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
              </div>
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
                Equipment List
              </p>

              <div className="mt-3 flex flex-col gap-4 xl:flex-row xl:items-start">
                <div className="min-w-0 flex-1">
                  {pageRows.length === 0 ? (
                    <EmptyState
                      message="No equipment matches these filters"
                      hint="Try widening your search or clearing filters."
                    />
                  ) : (
                    <ScrollableTable minWidth={1180} maxHeight={640}>
                      <div
                        className={`flex items-center rounded-t-[8px] ${TABLE_HEADER_STICKY_CLASS}`}
                        style={{ background: TABLE_HEADER_BG, borderBottom: '1px solid #E6F8FD' }}
                      >
                        {[
                          ['Equipment ID', 'w-32'],
                          ['Equipment Name', 'min-w-[160px] flex-1'],
                          ['Model', 'w-32'],
                          ['Serial Number', 'w-36'],
                          ['Department', 'w-36'],
                          ['Status', 'w-40'],
                          ['Next Calibration', 'w-40'],
                        ].map(([label, width]) => (
                          <div key={label} className={`${width} shrink-0 py-2.5 pr-2 pl-3`}>
                            <span
                              className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                              style={{ fontSize: 14, color: '#4A7080' }}
                            >
                              {label}
                            </span>
                          </div>
                        ))}
                        <div className="w-24 shrink-0 py-2.5 pr-3 text-right">
                          <span
                            className="font-sans font-bold tracking-wider uppercase"
                            style={{ fontSize: 14, color: '#4A7080' }}
                          >
                            Actions
                          </span>
                        </div>
                      </div>
                      {pageRows.map((e) => {
                        const cal = calibrationLabel(e);
                        return (
                          <div
                            key={e.id}
                            onClick={() => setSelectedId(e.id)}
                            className="flex cursor-pointer items-center transition-colors duration-100 hover:bg-[#F5FBFD]"
                            style={{
                              borderBottom: '1px solid rgba(0,100,130,0.08)',
                              background: selectedId === e.id ? '#E6F8FD' : 'transparent',
                            }}
                          >
                            <div className="w-32 shrink-0 py-3 pr-2 pl-3">
                              <Tooltip content={e.id}>
                                <p className="truncate" style={{ fontSize: 14, color: '#00B4D8' }}>
                                  {e.id}
                                </p>
                              </Tooltip>
                            </div>
                            <div className="min-w-0 flex-1 py-3 pr-2">
                              <Tooltip content={e.name}>
                                <p
                                  className="truncate font-sans font-medium"
                                  style={{ fontSize: 14, color: '#0D2630' }}
                                >
                                  {e.name}
                                </p>
                              </Tooltip>
                            </div>
                            <div className="w-32 shrink-0 py-3 pr-2">
                              <Tooltip content={e.model}>
                                <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                                  {e.model}
                                </p>
                              </Tooltip>
                            </div>
                            <div className="w-36 shrink-0 py-3 pr-2">
                              <Tooltip content={e.serialNumber}>
                                <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                                  {e.serialNumber}
                                </p>
                              </Tooltip>
                            </div>
                            <div className="w-36 shrink-0 py-3 pr-2">
                              <Tooltip content={e.department}>
                                <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                                  {e.department}
                                </p>
                              </Tooltip>
                            </div>
                            <div className="w-40 shrink-0 py-3 pr-2">
                              <StatusBadge status={e.status} />
                            </div>
                            <div className="w-40 shrink-0 py-3 pr-2">
                              <p
                                className="whitespace-nowrap"
                                style={{ fontSize: 14, color: cal.color }}
                              >
                                {cal.text}
                              </p>
                            </div>
                            <div
                              className="flex w-24 shrink-0 items-center justify-end gap-1 py-3 pr-3"
                              onClick={(ev) => ev.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => setSelectedId(e.id)}
                                aria-label={`View ${e.name}`}
                                className={`flex size-9 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
                              >
                                <Eye style={{ width: 15, height: 15, color: '#4A7080' }} />
                              </button>
                              <RowMenu
                                equipment={e}
                                onView={() => setProfileFor(e)}
                                onLogService={() => setLogServiceFor(e)}
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
                      itemLabel="results"
                      pageSizeOptions={[10, 25, 50]}
                    />
                  )}
                </div>

                {/* ── Docked Equipment Details panel ─────────────────────── */}
                {selected && (
                  <div
                    className="flex w-full shrink-0 flex-col overflow-hidden xl:w-[340px]"
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid rgba(0,100,130,0.12)',
                      borderRadius: 12,
                    }}
                  >
                    <div className="flex items-start justify-between gap-3 px-4 py-4 sm:px-5">
                      <p
                        className="font-display font-semibold"
                        style={{ fontSize: 16, color: '#0D2630' }}
                      >
                        Equipment Details
                      </p>
                      <button
                        type="button"
                        onClick={() => setSelectedId(null)}
                        aria-label="Close"
                        className={`flex size-9 shrink-0 items-center justify-center rounded-full transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                      >
                        <X style={{ width: 18, height: 18, color: '#4A7080' }} />
                      </button>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto scroll-smooth px-4 pb-4 sm:px-5">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex size-14 shrink-0 items-center justify-center rounded-[12px]"
                          style={{ background: 'rgba(0,180,216,0.1)' }}
                        >
                          {(() => {
                            const Icon = EQUIPMENT_TYPE_ICON[selected.equipmentType] ?? Gauge;
                            return <Icon style={{ width: 26, height: 26, color: '#00B4D8' }} />;
                          })()}
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
                          <p style={{ fontSize: 14, color: '#00B4D8' }}>{selected.id}</p>
                        </div>
                      </div>
                      <div className="mt-2">
                        <StatusBadge status={selected.status} />
                      </div>

                      <div className="mt-4 flex flex-col gap-3">
                        {[
                          ['Model', selected.model],
                          ['Serial Number', selected.serialNumber],
                          ['Department', selected.department],
                          ['Location', selected.location],
                          ['Manufacturer', selected.manufacturer],
                          ['Installation Date', formatHumanDate(selected.installationDate)],
                          ['Warranty Expiry', formatHumanDate(selected.warrantyExpiry)],
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

                      <div className="mt-5">
                        <p
                          className="font-sans font-semibold"
                          style={{ fontSize: 16, color: '#0D2630' }}
                        >
                          Upcoming Activities
                        </p>
                        <div className="mt-3 flex flex-col gap-3">
                          {getCalibrationState(selected) !== 'OK' &&
                            getCalibrationState(selected) !== 'Not Tracked' && (
                              <div className="flex items-center gap-2.5">
                                <Calendar
                                  style={{
                                    width: 15,
                                    height: 15,
                                    color: calibrationLabel(selected).color,
                                    flexShrink: 0,
                                  }}
                                />
                                <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                                  <span
                                    className="truncate"
                                    style={{ fontSize: 14, color: '#2F3A40' }}
                                  >
                                    Calibration{' '}
                                    {getCalibrationState(selected) === 'Overdue'
                                      ? 'Overdue'
                                      : 'Due'}
                                  </span>
                                  <span
                                    className="shrink-0 font-medium"
                                    style={{
                                      fontSize: 14,
                                      color: calibrationLabel(selected).color,
                                    }}
                                  >
                                    {formatHumanDate(selected.nextCalibrationAt!)}
                                  </span>
                                </div>
                              </div>
                            )}
                          {scheduledEvents
                            .filter((s) => s.equipmentId === selected.id)
                            .map((s) => (
                              <div key={s.id} className="flex items-center gap-2.5">
                                <Wrench
                                  style={{ width: 15, height: 15, color: '#D97706', flexShrink: 0 }}
                                />
                                <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                                  <span
                                    className="truncate"
                                    style={{ fontSize: 14, color: '#2F3A40' }}
                                  >
                                    {s.type}
                                  </span>
                                  <span
                                    className="shrink-0 font-medium"
                                    style={{ fontSize: 14, color: '#D97706' }}
                                  >
                                    {formatHumanDate(s.date)}
                                  </span>
                                </div>
                              </div>
                            ))}
                          {getCalibrationState(selected) === 'OK' &&
                            scheduledEvents.filter((s) => s.equipmentId === selected.id).length ===
                              0 && (
                              <p style={{ fontSize: 14, color: '#8A98A3' }}>Nothing scheduled.</p>
                            )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 p-4 pt-0 sm:p-5 sm:pt-0">
                      <button
                        type="button"
                        onClick={() => setProfileFor(selected)}
                        className={`flex h-11 w-full items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                        style={{ fontSize: 14, background: '#00B4D8' }}
                      >
                        View Full Profile
                      </button>
                      <PermissionGate permission={PERMISSIONS.LAB_EQUIPMENT_WRITE}>
                        <button
                          type="button"
                          onClick={() => setLogServiceFor(selected)}
                          className={`flex h-11 w-full items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                          style={{
                            fontSize: 14,
                            color: '#0D2630',
                            border: '1px solid rgba(0,100,130,0.2)',
                          }}
                        >
                          Add Service / Maintenance
                        </button>
                      </PermissionGate>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Calibration tab ─────────────────────────────────────────── */}
          {activeTab === 'calibration' && (
            <div
              className="rounded-b-[12px] p-4 sm:p-5"
              style={{
                background: '#FFFFFF',
                border: '1px solid rgba(0,100,130,0.12)',
                borderTop: 'none',
              }}
            >
              <p style={{ fontSize: 14, color: '#4A7080' }}>
                Equipment due or overdue for calibration, soonest first.
              </p>
              {dueEquipment.length === 0 ? (
                <EmptyState
                  message="Nothing due for calibration"
                  hint="Every tracked instrument is within its calibration window."
                />
              ) : (
                <div className="mt-3">
                  <ScrollableTable minWidth={900}>
                    <div
                      className={`flex items-center rounded-t-[8px] ${TABLE_HEADER_STICKY_CLASS}`}
                      style={{ background: TABLE_HEADER_BG, borderBottom: '1px solid #E6F8FD' }}
                    >
                      {[
                        ['Equipment ID', 'w-32'],
                        ['Equipment Name', 'min-w-[160px] flex-1'],
                        ['Last Calibration', 'w-36'],
                        ['Next Calibration', 'w-44'],
                        ['Status', 'w-28'],
                      ].map(([label, width]) => (
                        <div key={label} className={`${width} shrink-0 py-2.5 pr-2 pl-3`}>
                          <span
                            className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                            style={{ fontSize: 14, color: '#4A7080' }}
                          >
                            {label}
                          </span>
                        </div>
                      ))}
                      <div className="w-32 shrink-0 py-2.5 pr-3 text-right">
                        <span
                          className="font-sans font-bold tracking-wider uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Actions
                        </span>
                      </div>
                    </div>
                    {dueEquipment.map((e) => {
                      const cal = calibrationLabel(e);
                      const state = getCalibrationState(e);
                      return (
                        <div
                          key={e.id}
                          className="flex items-center"
                          style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                        >
                          <div className="w-32 shrink-0 py-3 pr-2 pl-3">
                            <p className="truncate" style={{ fontSize: 14, color: '#00B4D8' }}>
                              {e.id}
                            </p>
                          </div>
                          <div className="min-w-0 flex-1 py-3 pr-2">
                            <Tooltip content={e.name}>
                              <p
                                className="truncate font-sans font-medium"
                                style={{ fontSize: 14, color: '#0D2630' }}
                              >
                                {e.name}
                              </p>
                            </Tooltip>
                          </div>
                          <div className="w-36 shrink-0 py-3 pr-2">
                            <p style={{ fontSize: 14, color: '#4A7080' }}>
                              {e.lastCalibrationAt ? formatHumanDate(e.lastCalibrationAt) : '—'}
                            </p>
                          </div>
                          <div className="w-44 shrink-0 py-3 pr-2">
                            <p
                              className="whitespace-nowrap"
                              style={{ fontSize: 14, color: cal.color }}
                            >
                              {cal.text}
                            </p>
                          </div>
                          <div className="w-28 shrink-0 py-3 pr-2">
                            <span
                              className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium whitespace-nowrap"
                              style={{
                                fontSize: 14,
                                color:
                                  state === 'Overdue'
                                    ? CALIBRATION_CFG.Overdue.color
                                    : CALIBRATION_CFG.Due.color,
                                border: `1px solid ${state === 'Overdue' ? 'rgba(239,68,68,0.4)' : 'rgba(245,158,11,0.4)'}`,
                                background:
                                  state === 'Overdue'
                                    ? 'rgba(239,68,68,0.08)'
                                    : 'rgba(245,158,11,0.08)',
                              }}
                            >
                              {state}
                            </span>
                          </div>
                          <div className="flex w-32 shrink-0 items-center justify-end py-3 pr-3">
                            <PermissionGate permission={PERMISSIONS.LAB_EQUIPMENT_WRITE}>
                              <button
                                type="button"
                                onClick={() => setLogServiceFor(e)}
                                className={`flex h-9 items-center rounded-[8px] px-3 font-sans font-medium whitespace-nowrap transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
                                style={{
                                  fontSize: 14,
                                  color: '#00B4D8',
                                  border: '1px solid rgba(0,180,216,0.35)',
                                }}
                              >
                                Record Calibration
                              </button>
                            </PermissionGate>
                          </div>
                        </div>
                      );
                    })}
                  </ScrollableTable>
                </div>
              )}
            </div>
          )}

          {/* ── Maintenance tab ──────────────────────────────────────────── */}
          {activeTab === 'maintenance' && (
            <div
              className="rounded-b-[12px] p-4 sm:p-5"
              style={{
                background: '#FFFFFF',
                border: '1px solid rgba(0,100,130,0.12)',
                borderTop: 'none',
              }}
            >
              <p style={{ fontSize: 14, color: '#4A7080' }}>
                Scheduled preventive and corrective maintenance.
              </p>
              {scheduledEvents.length === 0 ? (
                <EmptyState
                  message="No maintenance scheduled"
                  hint="Scheduled work orders will appear here."
                />
              ) : (
                <div className="mt-3">
                  <ScrollableTable minWidth={860}>
                    <div
                      className={`flex items-center rounded-t-[8px] ${TABLE_HEADER_STICKY_CLASS}`}
                      style={{ background: TABLE_HEADER_BG, borderBottom: '1px solid #E6F8FD' }}
                    >
                      {[
                        ['Equipment', 'min-w-[160px] flex-1'],
                        ['Type', 'w-48'],
                        ['Scheduled Date', 'w-36'],
                        ['Assigned To', 'w-52'],
                        ['Notes', 'w-64'],
                      ].map(([label, width]) => (
                        <div key={label} className={`${width} shrink-0 py-2.5 pr-2 pl-3`}>
                          <span
                            className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                            style={{ fontSize: 14, color: '#4A7080' }}
                          >
                            {label}
                          </span>
                        </div>
                      ))}
                    </div>
                    {scheduledEvents.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center"
                        style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                      >
                        <div className="min-w-0 flex-1 py-3 pr-2 pl-3">
                          <Tooltip content={equipmentName(s.equipmentId)}>
                            <p
                              className="truncate font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {equipmentName(s.equipmentId)}
                            </p>
                          </Tooltip>
                        </div>
                        <div className="w-48 shrink-0 py-3 pr-2">
                          <p style={{ fontSize: 14, color: '#4A7080' }}>{s.type}</p>
                        </div>
                        <div className="w-36 shrink-0 py-3 pr-2">
                          <p style={{ fontSize: 14, color: '#4A7080' }}>
                            {formatHumanDate(s.date)}
                          </p>
                        </div>
                        <div className="w-52 shrink-0 py-3 pr-2">
                          <Tooltip content={s.performedBy}>
                            <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                              {s.performedBy}
                            </p>
                          </Tooltip>
                        </div>
                        <div className="w-64 shrink-0 py-3 pr-3">
                          <Tooltip content={s.notes}>
                            <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                              {s.notes}
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

          {/* ── Service History tab ──────────────────────────────────────── */}
          {activeTab === 'service-history' && (
            <div
              className="rounded-b-[12px] p-4 sm:p-5"
              style={{
                background: '#FFFFFF',
                border: '1px solid rgba(0,100,130,0.12)',
                borderTop: 'none',
              }}
            >
              <p style={{ fontSize: 14, color: '#4A7080' }}>
                Completed service, maintenance, and calibration events.
              </p>
              {completedEvents.length === 0 ? (
                <EmptyState
                  message="No service history yet"
                  hint="Completed service events will appear here."
                />
              ) : (
                <div className="mt-3">
                  <ScrollableTable minWidth={860} maxHeight={640}>
                    <div
                      className={`flex items-center rounded-t-[8px] ${TABLE_HEADER_STICKY_CLASS}`}
                      style={{ background: TABLE_HEADER_BG, borderBottom: '1px solid #E6F8FD' }}
                    >
                      {[
                        ['Equipment', 'min-w-[160px] flex-1'],
                        ['Type', 'w-48'],
                        ['Date', 'w-32'],
                        ['Performed By', 'w-52'],
                        ['Notes', 'w-64'],
                      ].map(([label, width]) => (
                        <div key={label} className={`${width} shrink-0 py-2.5 pr-2 pl-3`}>
                          <span
                            className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                            style={{ fontSize: 14, color: '#4A7080' }}
                          >
                            {label}
                          </span>
                        </div>
                      ))}
                    </div>
                    {completedEvents.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center"
                        style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                      >
                        <div className="min-w-0 flex-1 py-3 pr-2 pl-3">
                          <Tooltip content={equipmentName(s.equipmentId)}>
                            <p
                              className="truncate font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {equipmentName(s.equipmentId)}
                            </p>
                          </Tooltip>
                        </div>
                        <div className="w-48 shrink-0 py-3 pr-2">
                          <p style={{ fontSize: 14, color: '#4A7080' }}>{s.type}</p>
                        </div>
                        <div className="w-32 shrink-0 py-3 pr-2">
                          <p style={{ fontSize: 14, color: '#4A7080' }}>
                            {formatHumanDate(s.date)}
                          </p>
                        </div>
                        <div className="w-52 shrink-0 py-3 pr-2">
                          <Tooltip content={s.performedBy}>
                            <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                              {s.performedBy}
                            </p>
                          </Tooltip>
                        </div>
                        <div className="w-64 shrink-0 py-3 pr-3">
                          <Tooltip content={s.notes}>
                            <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                              {s.notes}
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

          {/* ── Downtime Log tab ─────────────────────────────────────────── */}
          {activeTab === 'downtime' && (
            <div
              className="rounded-b-[12px] p-4 sm:p-5"
              style={{
                background: '#FFFFFF',
                border: '1px solid rgba(0,100,130,0.12)',
                borderTop: 'none',
              }}
            >
              <p style={{ fontSize: 14, color: '#4A7080' }}>
                Every equipment downtime incident, most recent first.
              </p>
              {sortedDowntime.length === 0 ? (
                <EmptyState
                  message="No downtime recorded"
                  hint="Downtime incidents will appear here."
                />
              ) : (
                <div className="mt-3">
                  <ScrollableTable minWidth={860}>
                    <div
                      className={`flex items-center rounded-t-[8px] ${TABLE_HEADER_STICKY_CLASS}`}
                      style={{ background: TABLE_HEADER_BG, borderBottom: '1px solid #E6F8FD' }}
                    >
                      {[
                        ['Equipment', 'min-w-[160px] flex-1'],
                        ['Start', 'w-36'],
                        ['End', 'w-36'],
                        ['Reason', 'w-64'],
                        ['Reported By', 'w-44'],
                      ].map(([label, width]) => (
                        <div key={label} className={`${width} shrink-0 py-2.5 pr-2 pl-3`}>
                          <span
                            className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                            style={{ fontSize: 14, color: '#4A7080' }}
                          >
                            {label}
                          </span>
                        </div>
                      ))}
                    </div>
                    {sortedDowntime.map((d) => (
                      <div
                        key={d.id}
                        className="flex items-center"
                        style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                      >
                        <div className="min-w-0 flex-1 py-3 pr-2 pl-3">
                          <Tooltip content={equipmentName(d.equipmentId)}>
                            <p
                              className="truncate font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {equipmentName(d.equipmentId)}
                            </p>
                          </Tooltip>
                        </div>
                        <div className="w-36 shrink-0 py-3 pr-2">
                          <p style={{ fontSize: 14, color: '#4A7080' }}>
                            {formatHumanDate(d.startAt)}
                          </p>
                        </div>
                        <div className="w-36 shrink-0 py-3 pr-2">
                          {d.endAt ? (
                            <p style={{ fontSize: 14, color: '#4A7080' }}>
                              {formatHumanDate(d.endAt)}
                            </p>
                          ) : (
                            <span
                              className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium"
                              style={{
                                fontSize: 14,
                                color: '#DC2626',
                                border: '1px solid rgba(239,68,68,0.4)',
                                background: 'rgba(239,68,68,0.08)',
                              }}
                            >
                              Ongoing
                            </span>
                          )}
                        </div>
                        <div className="w-64 shrink-0 py-3 pr-2">
                          <Tooltip content={d.reason}>
                            <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                              {d.reason}
                            </p>
                          </Tooltip>
                        </div>
                        <div className="w-44 shrink-0 py-3 pr-3">
                          <Tooltip content={d.reportedBy}>
                            <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                              {d.reportedBy}
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

          {/* ── Error Logs tab ───────────────────────────────────────────── */}
          {activeTab === 'errors' && (
            <div
              className="rounded-b-[12px] p-4 sm:p-5"
              style={{
                background: '#FFFFFF',
                border: '1px solid rgba(0,100,130,0.12)',
                borderTop: 'none',
              }}
            >
              <p style={{ fontSize: 14, color: '#4A7080' }}>
                Fault and error codes reported by equipment, most recent first.
              </p>
              {sortedErrors.length === 0 ? (
                <EmptyState
                  message="No errors logged"
                  hint="Reported equipment faults will appear here."
                />
              ) : (
                <div className="mt-3">
                  <ScrollableTable minWidth={900}>
                    <div
                      className={`flex items-center rounded-t-[8px] ${TABLE_HEADER_STICKY_CLASS}`}
                      style={{ background: TABLE_HEADER_BG, borderBottom: '1px solid #E6F8FD' }}
                    >
                      {[
                        ['Equipment', 'min-w-[160px] flex-1'],
                        ['Occurred At', 'w-40'],
                        ['Error Code', 'w-28'],
                        ['Description', 'w-64'],
                        ['Severity', 'w-28'],
                        ['Resolved', 'w-24'],
                      ].map(([label, width]) => (
                        <div key={label} className={`${width} shrink-0 py-2.5 pr-2 pl-3`}>
                          <span
                            className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                            style={{ fontSize: 14, color: '#4A7080' }}
                          >
                            {label}
                          </span>
                        </div>
                      ))}
                    </div>
                    {sortedErrors.map((err) => {
                      const sevCfg =
                        err.severity === 'Critical'
                          ? {
                              color: '#DC2626',
                              border: 'rgba(239,68,68,0.4)',
                              bg: 'rgba(239,68,68,0.08)',
                            }
                          : err.severity === 'Warning'
                            ? {
                                color: '#B45309',
                                border: 'rgba(245,158,11,0.4)',
                                bg: 'rgba(245,158,11,0.08)',
                              }
                            : {
                                color: '#4A7080',
                                border: 'rgba(0,100,130,0.2)',
                                bg: 'rgba(226,237,241,0.4)',
                              };
                      return (
                        <div
                          key={err.id}
                          className="flex items-center"
                          style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                        >
                          <div className="min-w-0 flex-1 py-3 pr-2 pl-3">
                            <Tooltip content={equipmentName(err.equipmentId)}>
                              <p
                                className="truncate font-sans font-medium"
                                style={{ fontSize: 14, color: '#0D2630' }}
                              >
                                {equipmentName(err.equipmentId)}
                              </p>
                            </Tooltip>
                          </div>
                          <div className="w-40 shrink-0 py-3 pr-2">
                            <p style={{ fontSize: 14, color: '#4A7080' }}>
                              {formatHumanDate(err.occurredAt)}
                            </p>
                          </div>
                          <div className="w-28 shrink-0 py-3 pr-2">
                            <p style={{ fontSize: 14, color: '#0D2630' }}>{err.errorCode}</p>
                          </div>
                          <div className="w-64 shrink-0 py-3 pr-2">
                            <Tooltip content={err.description}>
                              <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                                {err.description}
                              </p>
                            </Tooltip>
                          </div>
                          <div className="w-28 shrink-0 py-3 pr-2">
                            <span
                              className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium whitespace-nowrap"
                              style={{
                                fontSize: 14,
                                color: sevCfg.color,
                                border: `1px solid ${sevCfg.border}`,
                                background: sevCfg.bg,
                              }}
                            >
                              {err.severity}
                            </span>
                          </div>
                          <div className="w-24 shrink-0 py-3 pr-3">
                            {err.resolved ? (
                              <CheckCircle2 style={{ width: 16, height: 16, color: '#16A34A' }} />
                            ) : (
                              <Clock style={{ width: 16, height: 16, color: '#D97706' }} />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </ScrollableTable>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {addEquipmentOpen && (
        <AddEquipmentModal
          onClose={() => setAddEquipmentOpen(false)}
          onSubmit={(record) => {
            setAddEquipmentOpen(false);
            toast.success('Equipment added', `${record.name} (${record.id}) is now tracked.`);
          }}
        />
      )}

      {logServiceFor && (
        <LogServiceModal
          equipment={logServiceFor}
          onClose={() => setLogServiceFor(null)}
          onSubmit={(event) => {
            setLogServiceFor(null);
            toast.success(
              event.status === 'Completed' ? 'Service logged' : 'Maintenance scheduled',
              `${event.type} for ${equipmentName(event.equipmentId)} recorded.`,
            );
          }}
        />
      )}

      {profileFor && (
        <EquipmentProfileModal equipment={profileFor} onClose={() => setProfileFor(null)} />
      )}
    </div>
  );
}
