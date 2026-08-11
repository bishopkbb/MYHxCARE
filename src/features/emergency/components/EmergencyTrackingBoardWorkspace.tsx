'use client';

import {
  Activity,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock,
  DoorOpen,
  Eye,
  FileText,
  FlaskConical,
  Hourglass,
  Image as ImageIcon,
  MoreVertical,
  Pill,
  RefreshCw,
  Search,
  Stethoscope,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { FilterDropdown, type FilterDef } from '@components/shared/FilterDropdown';
import { Pagination } from '@components/shared/Pagination';
import { PermissionGate } from '@components/shared/PermissionGate';
import { RowMenuPortal } from '@components/shared/RowMenuPortal';
import {
  ScrollableTable,
  TABLE_HEADER_BG,
  TABLE_HEADER_STICKY_CLASS,
} from '@components/shared/ScrollableTable';
import { StatCard } from '@components/shared/StatCard';
import { Tooltip } from '@components/shared/Tooltip';
import { PERMISSIONS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
import { useToast } from '@/hooks/useToast';
import { formatHumanDate, formatTime } from '@/utils/datetime';
import { getTriageDisplay, triageSortWeight, type TriagePriority } from '@/utils/triage';
import { useQueueEntries } from '@/features/registration/store/registrationQueueStore';
import {
  deriveComplaintForEntry,
  deriveIllustrativeAge,
  deriveIllustrativeAlert,
  deriveIllustrativeArrivalMinutesAgo,
  deriveIllustrativeGender,
  deriveIllustrativeMrn,
  deriveIllustrativeName,
  deriveIllustrativeOrders,
  deriveIllustrativePhysician,
  derivePriorityForEntry,
  EMERGENCY_BEDS,
  minutesAgoFromDuration,
  OBSERVATION_PATIENTS,
  RECENT_ADMISSIONS,
  todayAtClockTime,
  TRACKING_STATUSES,
  TRACKING_ZONES,
  type OrdersCount,
  type TrackingStatus,
} from '@/features/emergency/__mocks__/emergencyFixtures';
import { useTriageRecords } from '@/features/emergency/store/triageAssessmentStore';
import { useBedOverrides } from '@/features/emergency/store/bedAssignmentStore';

type PageState = 'loading' | 'loaded' | 'error';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const PRIORITY_COLOR: Record<TriagePriority, string> = {
  IMMEDIATE: '#DC2626',
  URGENT: '#D97706',
  LESS_URGENT: '#F59E0B',
  NON_URGENT: '#16A34A',
};
const PRIORITY_BG: Record<TriagePriority, string> = {
  IMMEDIATE: 'rgba(220,38,38,0.08)',
  URGENT: 'rgba(217,119,6,0.08)',
  LESS_URGENT: 'rgba(245,158,11,0.08)',
  NON_URGENT: 'rgba(22,163,74,0.08)',
};

const STATUS_CFG: Record<TrackingStatus, { color: string; bg: string; pulse: boolean }> = {
  'In Triage': { color: '#00B4D8', bg: 'rgba(0,180,216,0.1)', pulse: false },
  'In Treatment': { color: '#2563EB', bg: 'rgba(37,99,235,0.1)', pulse: true },
  'Under Observation': { color: '#7C3AED', bg: 'rgba(124,58,237,0.1)', pulse: false },
  'Ready for Disposition': { color: '#16A34A', bg: 'rgba(22,163,74,0.1)', pulse: false },
  Discharged: { color: '#8A98A3', bg: 'rgba(138,152,163,0.12)', pulse: false },
};

type BoardRow = {
  id: string;
  entryId?: string | undefined;
  patientName: string;
  mrn: string;
  priority: TriagePriority;
  age: number;
  gender: string;
  zone: string;
  bed: string;
  physician: string;
  status: TrackingStatus;
  arrivalTime: string; // ISO
  chiefComplaint: string;
  orders: OrdersCount;
  hasAlert: boolean;
};

const NOTE_TEMPLATES = [
  'Initial assessment completed.',
  'IV access established.',
  'Vitals recorded.',
  'Pain medication administered.',
  'Awaiting lab results.',
  'Patient stable, continuing monitoring.',
];

function buildNotesForRow(
  row: BoardRow,
  now: Date,
): { time: string; author: string; note: string }[] {
  const count = row.hasAlert ? 3 : 2;
  return Array.from({ length: count }, (_, i) => {
    const minutesAgo = 6 + i * 8;
    const time = new Date(now.getTime() - minutesAgo * 60_000).toISOString();
    const template = NOTE_TEMPLATES[(row.id.length + i) % NOTE_TEMPLATES.length]!;
    const author = i % 2 === 0 ? row.physician : 'Nurse Mary Ada';
    return { time, author, note: template };
  });
}

function formatElapsed(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

// ── Small building blocks ──────────────────────────────────────────────

function PriorityPill({ priority }: { priority: TriagePriority }) {
  const display = getTriageDisplay(priority);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-sans font-medium whitespace-nowrap"
      style={{ fontSize: 14, color: PRIORITY_COLOR[priority], background: PRIORITY_BG[priority] }}
    >
      {display.pulse && (
        <span
          className="size-1.5 animate-pulse rounded-full"
          style={{ background: PRIORITY_COLOR[priority] }}
          aria-hidden="true"
        />
      )}
      {display.label}
    </span>
  );
}

function StatusPill({ status }: { status: TrackingStatus }) {
  const cfg = STATUS_CFG[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-sans font-medium whitespace-nowrap"
      style={{ fontSize: 14, color: cfg.color, background: cfg.bg }}
    >
      {cfg.pulse && (
        <span className="size-1.5 animate-pulse rounded-full" style={{ background: cfg.color }} />
      )}
      {status}
    </span>
  );
}

function OrdersBadges({ orders }: { orders: OrdersCount }) {
  const items: { icon: typeof FlaskConical; count: number; label: string; color: string }[] = [
    { icon: FlaskConical, count: orders.lab, label: 'Lab Orders', color: '#7C3AED' },
    { icon: ImageIcon, count: orders.imaging, label: 'Imaging Orders', color: '#2563EB' },
    { icon: Pill, count: orders.rx, label: 'Medication Orders', color: '#DC2626' },
  ];
  const visible = items.filter((i) => i.count > 0);
  if (visible.length === 0) return <span style={{ fontSize: 14, color: '#8A98A3' }}>—</span>;
  return (
    <div className="flex items-center gap-1.5">
      {visible.map((item) => (
        <Tooltip key={item.label} content={`${item.label}: ${item.count}`}>
          <span
            className="flex items-center gap-1 rounded-[6px] px-1.5 py-0.5"
            style={{ background: `${item.color}14`, color: item.color, fontSize: 14 }}
          >
            <item.icon style={{ width: 13, height: 13 }} />
            {item.count}
          </span>
        </Tooltip>
      ))}
    </div>
  );
}

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
    {children}
  </p>
);

// ── Row menu ─────────────────────────────────────────────────────────────

function BoardRowMenu({
  open,
  onToggle,
  onView,
  onOpenChart,
  onStartTriage,
  onAssignBed,
}: {
  open: boolean;
  onToggle: () => void;
  onView: () => void;
  onOpenChart: () => void;
  onStartTriage?: (() => void) | undefined;
  onAssignBed?: (() => void) | undefined;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={onToggle}
        aria-label="More actions"
        className={`flex size-11 shrink-0 items-center justify-center rounded-[10px] transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
      >
        <MoreVertical style={{ width: 16, height: 16, color: '#4A7080' }} />
      </button>
      <RowMenuPortal open={open} anchorRef={buttonRef} onClose={onToggle} width={200}>
        <button
          type="button"
          onClick={onView}
          className={`flex w-full items-center gap-2 px-3.5 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
          style={{ fontSize: 14, color: '#0D2630' }}
        >
          <FileText style={{ width: 15, height: 15, color: '#00B4D8' }} />
          View Details
        </button>
        {onStartTriage && (
          <PermissionGate permission={PERMISSIONS.EMERGENCY_WRITE}>
            <button
              type="button"
              onClick={onStartTriage}
              className={`flex w-full items-center gap-2 px-3.5 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
              style={{ fontSize: 14, color: '#0D2630' }}
            >
              <UserCheck style={{ width: 15, height: 15, color: '#4A7080' }} />
              Start Triage
            </button>
          </PermissionGate>
        )}
        {onAssignBed && (
          <PermissionGate permission={PERMISSIONS.EMERGENCY_WRITE}>
            <button
              type="button"
              onClick={onAssignBed}
              className={`flex w-full items-center gap-2 px-3.5 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
              style={{ fontSize: 14, color: '#0D2630' }}
            >
              <DoorOpen style={{ width: 15, height: 15, color: '#4A7080' }} />
              Assign Bed
            </button>
          </PermissionGate>
        )}
        <button
          type="button"
          onClick={onOpenChart}
          className={`flex w-full items-center gap-2 px-3.5 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
          style={{ fontSize: 14, color: '#0D2630' }}
        >
          <Users style={{ width: 15, height: 15, color: '#4A7080' }} />
          Open Patient Chart
        </button>
      </RowMenuPortal>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────

type FilterKey = 'zone' | 'physician' | 'status';

export function EmergencyTrackingBoardWorkspace() {
  const router = useRouter();
  const toast = useToast();

  const [pageState, setPageState] = useState<PageState>('loading');
  const [now, setNow] = useState(() => new Date());

  const [zoneFilter, setZoneFilter] = useState('ALL');
  const [physicianFilter, setPhysicianFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [openFilter, setOpenFilter] = useState<FilterKey | null>(null);
  const [search, setSearch] = useState('');
  const [alertsOnly, setAlertsOnly] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [openRowMenuId, setOpenRowMenuId] = useState<string | null>(null);

  const filterBarRef = useRef<HTMLDivElement>(null);

  const allEntries = useQueueEntries();
  const triageRecords = useTriageRecords();
  const bedOverrides = useBedOverrides();

  useEffect(() => {
    const t = setTimeout(() => setPageState('loaded'), 800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (filterBarRef.current && !filterBarRef.current.contains(e.target as Node)) {
        setOpenFilter(null);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleRetry() {
    setPageState('loading');
    setTimeout(() => setPageState('loaded'), 800);
  }

  function handleRefresh() {
    setNow(new Date());
    toast.success('Board refreshed', 'Showing the latest department status.');
  }

  // ── Build the board from every store that already owns a piece of it ──
  const emergencyEntries = allEntries.filter((e) => e.isEmergency);
  const bedAssignedEntryIds = new Set(
    Array.from(bedOverrides.values())
      .filter((o) => o.status === 'Occupied' && o.entryId)
      .map((o) => o.entryId as string),
  );

  const rows: BoardRow[] = [];

  // Every occupied bed -> "In Treatment" row (real occupant when the bed
  // was assigned via Bed Assignment this session, illustrative otherwise).
  for (const bed of EMERGENCY_BEDS) {
    // Observation beds are represented via the dedicated OBSERVATION_PATIENTS
    // loop below (richer data: next-review time) — counting them here too
    // would double-count every observation patient as also "In Treatment".
    if (bed.type === 'Observation Bed') continue;
    const override = bedOverrides.get(bed.id);
    const status = override?.status ?? bed.baseStatus;
    if (status !== 'Occupied') continue;
    const entryId = override?.entryId;
    const realEntry = entryId ? emergencyEntries.find((e) => e.id === entryId) : undefined;
    const record = entryId ? triageRecords.get(entryId) : undefined;
    const occupantName = override?.patientName ?? bed.occupantName;
    rows.push({
      id: `bed-${bed.id}`,
      entryId,
      patientName: occupantName ?? deriveIllustrativeName(bed.id),
      mrn: realEntry?.mrn ?? deriveIllustrativeMrn(bed.id),
      priority:
        record?.priority ??
        (entryId ? derivePriorityForEntry(entryId) : derivePriorityForEntry(bed.id)),
      age: realEntry?.age ?? deriveIllustrativeAge(bed.id),
      gender: realEntry?.gender ?? deriveIllustrativeGender(bed.id),
      zone: bed.zone,
      bed: bed.id,
      physician:
        record?.assignedDoctorName ??
        realEntry?.attendingDoctor ??
        deriveIllustrativePhysician(bed.id),
      status: 'In Treatment',
      arrivalTime:
        realEntry?.arrivalTime ??
        new Date(
          now.getTime() - deriveIllustrativeArrivalMinutesAgo(bed.id) * 60_000,
        ).toISOString(),
      chiefComplaint:
        record?.chiefComplaint ??
        (entryId ? deriveComplaintForEntry(entryId) : deriveComplaintForEntry(bed.id)),
      orders: deriveIllustrativeOrders(bed.id),
      hasAlert: record?.manchester.lifeThreatening === true || deriveIllustrativeAlert(bed.id),
    });
  }

  // Real queue entries without a bed yet -> "In Triage" row.
  for (const entry of emergencyEntries) {
    if (bedAssignedEntryIds.has(entry.id)) continue;
    const record = triageRecords.get(entry.id);
    rows.push({
      id: `entry-${entry.id}`,
      entryId: entry.id,
      patientName: entry.patientName,
      mrn: entry.mrn,
      priority: record?.priority ?? derivePriorityForEntry(entry.id),
      age: entry.age,
      gender: entry.gender,
      zone: '—',
      bed: '—',
      physician: record?.assignedDoctorName ?? entry.attendingDoctor,
      status: 'In Triage',
      arrivalTime: entry.arrivalTime,
      chiefComplaint: record?.chiefComplaint ?? deriveComplaintForEntry(entry.id),
      orders: { lab: 0, imaging: 0, rx: 0, procedures: 0 },
      hasAlert: record?.manchester.lifeThreatening === true,
    });
  }

  // Observation Patients -> "Under Observation" rows.
  for (const op of OBSERVATION_PATIENTS) {
    rows.push({
      id: `obs-${op.id}`,
      patientName: op.patientName,
      mrn: deriveIllustrativeMrn(op.id),
      priority: derivePriorityForEntry(op.id),
      age: deriveIllustrativeAge(op.id),
      gender: deriveIllustrativeGender(op.id),
      zone: 'Observation Unit',
      bed: op.bed,
      physician: op.assignedTo,
      status: 'Under Observation',
      arrivalTime: new Date(
        now.getTime() - minutesAgoFromDuration(op.observationTime) * 60_000,
      ).toISOString(),
      chiefComplaint: `Under observation — next review ${op.nextReview}`,
      orders: deriveIllustrativeOrders(op.id),
      hasAlert: false,
    });
  }

  // Recent Admissions -> "Ready for Disposition" (Admitted) / "Discharged".
  let dischargeBedCounter = 0;
  let readyBedCounter = 0;
  RECENT_ADMISSIONS.forEach((ra) => {
    const isDischarged = ra.disposition === 'Discharged';
    const bed = isDischarged ? `DIS-${++dischargeBedCounter}` : `ED-${10 + readyBedCounter++}`;
    rows.push({
      id: `ra-${ra.id}`,
      patientName: ra.patientName,
      mrn: deriveIllustrativeMrn(ra.id),
      priority: derivePriorityForEntry(ra.id),
      age: deriveIllustrativeAge(ra.id),
      gender: deriveIllustrativeGender(ra.id),
      zone: isDischarged ? 'Discharge Area' : 'Main Treatment Area',
      bed,
      physician: deriveIllustrativePhysician(ra.id),
      status: isDischarged ? 'Discharged' : 'Ready for Disposition',
      arrivalTime: todayAtClockTime(ra.arrival),
      chiefComplaint: ra.diagnosis,
      orders: { lab: 0, imaging: 0, rx: 0, procedures: 0 },
      hasAlert: false,
    });
  });

  const zoneOptions = TRACKING_ZONES.filter((z) => rows.some((r) => r.zone === z));
  const physicianOptions = Array.from(new Set(rows.map((r) => r.physician))).sort();

  const tabCounts: Record<TrackingStatus | 'ALL', number> = {
    ALL: rows.length,
  } as Record<TrackingStatus | 'ALL', number>;
  for (const s of TRACKING_STATUSES) tabCounts[s] = rows.filter((r) => r.status === s).length;

  const q = search.trim().toLowerCase();
  const filtered = rows
    .filter((r) => zoneFilter === 'ALL' || r.zone === zoneFilter)
    .filter((r) => physicianFilter === 'ALL' || r.physician === physicianFilter)
    .filter((r) => statusFilter === 'ALL' || r.status === statusFilter)
    .filter((r) => !alertsOnly || r.hasAlert)
    .filter((r) => !q || r.patientName.toLowerCase().includes(q) || r.mrn.toLowerCase().includes(q))
    .sort((a, b) => triageSortWeight(a.priority) - triageSortWeight(b.priority));

  const hasActiveFilters =
    zoneFilter !== 'ALL' ||
    physicianFilter !== 'ALL' ||
    statusFilter !== 'ALL' ||
    alertsOnly ||
    search.trim() !== '';

  function clearFilters() {
    setZoneFilter('ALL');
    setPhysicianFilter('ALL');
    setStatusFilter('ALL');
    setAlertsOnly(false);
    setSearch('');
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const selectedRow =
    (selectedRowId ? filtered.find((r) => r.id === selectedRowId) : undefined) ?? filtered[0];

  const FILTER_DEFS: { key: FilterKey; def: FilterDef }[] = [
    {
      key: 'zone',
      def: {
        key: 'zone',
        defaultLabel: 'All Zones',
        options: zoneOptions.map((z) => ({ value: z, label: z })),
      },
    },
    {
      key: 'physician',
      def: {
        key: 'physician',
        defaultLabel: 'All Physicians',
        options: physicianOptions.map((p) => ({ value: p, label: p })),
      },
    },
    {
      key: 'status',
      def: {
        key: 'status',
        defaultLabel: 'All Status',
        options: TRACKING_STATUSES.map((s) => ({ value: s, label: s })),
      },
    },
  ];
  const filterValue: Record<string, string> = {
    zone: zoneFilter,
    physician: physicianFilter,
    status: statusFilter,
  };
  const filterSetter: Record<string, (v: string) => void> = {
    zone: setZoneFilter,
    physician: setPhysicianFilter,
    status: setStatusFilter,
  };

  if (pageState === 'error') {
    return (
      <main className="flex flex-1 items-center justify-center" style={{ background: '#F5FBFD' }}>
        <div className="flex flex-col items-center gap-3 px-6 text-center">
          <AlertCircle style={{ width: 40, height: 40, color: '#DC2626' }} />
          <p className="font-display font-semibold" style={{ fontSize: 18, color: '#0D2630' }}>
            Couldn&apos;t load the Tracking Board
          </p>
          <p style={{ fontSize: 14, color: '#4A7080' }}>Something went wrong. Please try again.</p>
          <button
            type="button"
            onClick={handleRetry}
            className={`mt-1 flex h-11 items-center gap-2 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
            style={{ fontSize: 14, background: '#00B4D8' }}
          >
            <RefreshCw style={{ width: 15, height: 15 }} />
            Retry
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
      <div className="mx-auto max-w-[1400px] px-4 py-4 sm:px-6 sm:py-5">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => router.push(ROUTES.emergency)}
            className={`font-sans transition-colors duration-150 hover:text-[#00B4D8] ${FOCUS_RING}`}
            style={{ fontSize: 14, color: '#4A7080' }}
          >
            Home
          </button>
          <ChevronRight style={{ width: 14, height: 14, color: '#8A98A3' }} />
          <span style={{ fontSize: 14, color: '#4A7080' }}>Triage &amp; Patient Flow</span>
          <ChevronRight style={{ width: 14, height: 14, color: '#8A98A3' }} />
          <span className="font-sans font-medium" style={{ fontSize: 14, color: '#00B4D8' }}>
            Emergency Tracking Board
          </span>
        </div>

        {/* Header */}
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <Activity style={{ width: 22, height: 22, color: '#00B4D8' }} />
            <div>
              <h1 className="font-display font-bold" style={{ fontSize: 24, color: '#0D2630' }}>
                Emergency Tracking Board
              </h1>
              <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
                Real-time overview of all patients in the emergency department.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
            style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
          >
            <RefreshCw style={{ width: 15, height: 15 }} />
            Refresh
          </button>
        </div>

        {/* Stat cards */}
        <div className="mt-4 grid grid-cols-2 gap-3.5 sm:grid-cols-3 xl:grid-cols-6 xl:gap-4">
          {pageState === 'loading' ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-[92px] animate-pulse rounded-[12px] bg-slate-100"
                style={{ border: '1px solid rgba(0,100,130,0.12)' }}
              />
            ))
          ) : (
            <>
              <StatCard
                icon={Users}
                label="Total Patients"
                value={rows.length}
                info="In ED"
                accent="#00B4D8"
                iconBg="rgba(0,180,216,0.1)"
              />
              <StatCard
                icon={Hourglass}
                label="In Triage"
                value={tabCounts['In Triage']}
                info="Awaiting assessment"
                accent="#D97706"
                iconBg="rgba(217,119,6,0.1)"
              />
              <StatCard
                icon={Stethoscope}
                label="In Treatment"
                value={tabCounts['In Treatment']}
                info="Active care"
                accent="#2563EB"
                iconBg="rgba(37,99,235,0.1)"
              />
              <StatCard
                icon={Eye}
                label="Under Observation"
                value={tabCounts['Under Observation']}
                info="Monitoring"
                accent="#7C3AED"
                iconBg="rgba(124,58,237,0.1)"
              />
              <StatCard
                icon={DoorOpen}
                label="Ready for Disposition"
                value={tabCounts['Ready for Disposition']}
                info="Awaiting transfer"
                accent="#16A34A"
                iconBg="rgba(22,163,74,0.1)"
              />
              <StatCard
                icon={CheckCircle2}
                label="Discharged Today"
                value={tabCounts['Discharged']}
                info="Completed"
                accent="#8A98A3"
                iconBg="rgba(138,152,163,0.12)"
              />
            </>
          )}
        </div>

        {/* Filter bar */}
        <div ref={filterBarRef} className="mt-4 flex flex-wrap items-center gap-2.5">
          {FILTER_DEFS.map(({ key, def }) => (
            <FilterDropdown
              key={key}
              def={def}
              value={filterValue[key] ?? 'ALL'}
              isOpen={openFilter === key}
              onToggle={() => setOpenFilter((prev) => (prev === key ? null : key))}
              onSelect={(v) => {
                filterSetter[key]?.(v);
                setOpenFilter(null);
                setPage(1);
              }}
            />
          ))}
          <div className="relative min-w-[220px] flex-1">
            <Search
              style={{
                width: 16,
                height: 16,
                color: '#8A98A3',
                position: 'absolute',
                left: 14,
                top: '50%',
                transform: 'translateY(-50%)',
              }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search patient..."
              className={`h-11 w-full rounded-[10px] py-2 pr-3.5 pl-10 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
              style={{ fontSize: 14, border: '1px solid rgba(0,100,130,0.18)', color: '#0D2630' }}
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setAlertsOnly((v) => !v);
              setPage(1);
            }}
            className={`flex h-11 shrink-0 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 ${FOCUS_RING}`}
            style={{
              fontSize: 14,
              color: alertsOnly ? '#FFFFFF' : '#0D2630',
              background: alertsOnly ? '#DC2626' : '#FFFFFF',
              border: alertsOnly ? 'none' : '1px solid rgba(0,100,130,0.2)',
            }}
          >
            <AlertTriangle style={{ width: 15, height: 15 }} />
            Alerts Only
          </button>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className={`font-sans font-medium transition-colors duration-150 hover:underline ${FOCUS_RING}`}
              style={{ fontSize: 14, color: '#00B4D8' }}
            >
              Clear all filters
            </button>
          )}
        </div>

        {/* Table + snapshot */}
        <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-start">
          <div
            className="min-w-0 flex-1 rounded-[12px]"
            style={{ border: '1px solid rgba(0,100,130,0.12)', background: '#FFFFFF' }}
          >
            {pageState === 'loading' ? (
              <div className="p-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 py-3"
                    style={{ borderBottom: '1px solid #E6F8FD' }}
                  >
                    <div className="h-3.5 w-full max-w-[220px] animate-pulse rounded bg-slate-200" />
                    <div className="h-3.5 w-16 shrink-0 animate-pulse rounded bg-slate-200" />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
                <div
                  className="flex size-14 items-center justify-center rounded-full"
                  style={{ background: 'rgba(226,237,241,0.6)' }}
                >
                  <Users style={{ width: 28, height: 28, color: '#8A98A3' }} />
                </div>
                <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                  No patients match these filters
                </p>
                <p style={{ fontSize: 14, color: '#8A98A3' }}>
                  Try a different search term or filter combination.
                </p>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className={`mt-1 font-sans font-medium transition-colors duration-150 hover:underline ${FOCUS_RING}`}
                    style={{ fontSize: 14, color: '#00B4D8' }}
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            ) : (
              <>
                <ScrollableTable minWidth={1100}>
                  <div
                    className={`flex items-center rounded-t-[12px] ${TABLE_HEADER_STICKY_CLASS}`}
                    style={{ background: TABLE_HEADER_BG, borderBottom: '1px solid #E6F8FD' }}
                  >
                    {[
                      ['#', 'w-10'],
                      ['Patient', 'min-w-[160px] flex-1'],
                      ['Priority', 'w-24'],
                      ['Age/Sex', 'w-20'],
                      ['Location/Bed', 'w-32'],
                      ['Physician', 'w-28'],
                      ['Status', 'w-36'],
                      ['Time in ED', 'w-24'],
                      ['Orders', 'w-32'],
                      ['', 'w-14'],
                    ].map(([label, width]) => (
                      <div key={label} className={`${width} shrink-0 py-2.5 pr-2 pl-3 text-left`}>
                        <span
                          className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          {label}
                        </span>
                      </div>
                    ))}
                  </div>
                  {paginated.map((row, i) => (
                    <div
                      key={row.id}
                      onClick={() => setSelectedRowId(row.id)}
                      className="flex cursor-pointer items-center transition-colors duration-150 hover:bg-[#F5FBFD]"
                      style={{
                        borderBottom: '1px solid rgba(0,100,130,0.08)',
                        background: selectedRow?.id === row.id ? '#F5FBFD' : undefined,
                      }}
                    >
                      <div className="w-10 shrink-0 py-3 pr-2 pl-3">
                        <p style={{ fontSize: 14, color: '#8A98A3' }}>
                          {(safePage - 1) * pageSize + i + 1}
                        </p>
                      </div>
                      <div className="min-w-[160px] flex-1 py-3 pr-2">
                        <div className="flex items-center gap-1.5">
                          <Tooltip content={row.patientName}>
                            <p
                              className="truncate font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {row.patientName}
                            </p>
                          </Tooltip>
                          {row.hasAlert && (
                            <Tooltip content="Needs attention">
                              <AlertTriangle style={{ width: 14, height: 14, color: '#DC2626' }} />
                            </Tooltip>
                          )}
                        </div>
                        <p style={{ fontSize: 14, color: '#00B4D8' }}>MRN: {row.mrn}</p>
                      </div>
                      <div className="w-24 shrink-0 py-3 pr-2">
                        <PriorityPill priority={row.priority} />
                      </div>
                      <div className="w-20 shrink-0 py-3 pr-2">
                        <p style={{ fontSize: 14, color: '#4A7080' }}>
                          {row.age} / {row.gender.charAt(0)}
                        </p>
                      </div>
                      <div className="w-32 shrink-0 py-3 pr-2">
                        <p className="truncate" style={{ fontSize: 14, color: '#0D2630' }}>
                          {row.zone}
                        </p>
                        <p style={{ fontSize: 14, color: '#8A98A3' }}>{row.bed}</p>
                      </div>
                      <div className="w-28 shrink-0 py-3 pr-2">
                        <Tooltip content={row.physician}>
                          <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                            {row.physician}
                          </p>
                        </Tooltip>
                      </div>
                      <div className="w-36 shrink-0 py-3 pr-2">
                        <StatusPill status={row.status} />
                      </div>
                      <div className="w-24 shrink-0 py-3 pr-2">
                        <p
                          className="font-sans font-medium whitespace-nowrap"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          {formatElapsed(
                            Math.max(
                              0,
                              Math.round(
                                (now.getTime() - new Date(row.arrivalTime).getTime()) / 60_000,
                              ),
                            ),
                          )}
                        </p>
                      </div>
                      <div className="w-32 shrink-0 py-3 pr-2">
                        <OrdersBadges orders={row.orders} />
                      </div>
                      <div
                        className="flex w-14 shrink-0 items-center justify-center py-3 pr-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <BoardRowMenu
                          open={openRowMenuId === row.id}
                          onToggle={() =>
                            setOpenRowMenuId((prev) => (prev === row.id ? null : row.id))
                          }
                          onView={() => {
                            setSelectedRowId(row.id);
                            setOpenRowMenuId(null);
                          }}
                          onOpenChart={() => {
                            setOpenRowMenuId(null);
                            router.push(ROUTES.patients);
                          }}
                          onStartTriage={
                            row.entryId && row.status === 'In Triage'
                              ? () => {
                                  setOpenRowMenuId(null);
                                  router.push(
                                    `${ROUTES.emergencyTriageAssessment}?entryId=${row.entryId}`,
                                  );
                                }
                              : undefined
                          }
                          onAssignBed={
                            row.entryId &&
                            row.status === 'In Triage' &&
                            triageRecords.has(row.entryId)
                              ? () => {
                                  setOpenRowMenuId(null);
                                  router.push(
                                    `${ROUTES.emergencyBedAssignment}?entryId=${row.entryId}`,
                                  );
                                }
                              : undefined
                          }
                        />
                      </div>
                    </div>
                  ))}
                </ScrollableTable>
                <Pagination
                  page={safePage}
                  pageSize={pageSize}
                  totalItems={filtered.length}
                  onPageChange={setPage}
                  onPageSizeChange={(size) => {
                    setPageSize(size);
                    setPage(1);
                  }}
                  itemLabel="patients"
                  pageSizeOptions={[12, 25, 50]}
                />
              </>
            )}
          </div>

          {/* Patient Snapshot */}
          {selectedRow && (
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
                  Patient Snapshot
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedRowId(paginated[0]?.id ?? null)}
                  className={`flex items-center gap-1 font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                  style={{ fontSize: 14, color: '#00B4D8' }}
                >
                  Collapse
                  <X style={{ width: 14, height: 14 }} />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto scroll-smooth px-4 pb-4 sm:px-5">
                <div className="flex items-center gap-3">
                  <div
                    className="flex size-11 shrink-0 items-center justify-center rounded-full font-sans font-semibold text-white"
                    style={{ background: PRIORITY_COLOR[selectedRow.priority], fontSize: 14 }}
                  >
                    {selectedRow.patientName
                      .split(/\s+/)
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')}
                  </div>
                  <div className="min-w-0">
                    <Tooltip content={selectedRow.patientName}>
                      <p
                        className="truncate font-sans font-semibold"
                        style={{ fontSize: 15, color: '#0D2630' }}
                      >
                        {selectedRow.patientName}
                      </p>
                    </Tooltip>
                    <p style={{ fontSize: 14, color: '#00B4D8' }}>MRN: {selectedRow.mrn}</p>
                  </div>
                </div>
                <div className="mt-2">
                  <PriorityPill priority={selectedRow.priority} />
                </div>

                <div className="mt-3.5 flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <span style={{ fontSize: 14, color: '#8A98A3' }}>Chief Complaint</span>
                    <Tooltip content={selectedRow.chiefComplaint}>
                      <span
                        className="max-w-[160px] truncate text-right font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {selectedRow.chiefComplaint}
                      </span>
                    </Tooltip>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span style={{ fontSize: 14, color: '#8A98A3' }}>Arrival Time</span>
                    <span
                      className="font-sans font-medium"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {formatHumanDate(selectedRow.arrivalTime)},{' '}
                      {formatTime(selectedRow.arrivalTime)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span style={{ fontSize: 14, color: '#8A98A3' }}>Assigned Physician</span>
                    <Tooltip content={selectedRow.physician}>
                      <span
                        className="max-w-[160px] truncate text-right font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {selectedRow.physician}
                      </span>
                    </Tooltip>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span style={{ fontSize: 14, color: '#8A98A3' }}>Location / Bed</span>
                    <span
                      className="font-sans font-medium"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {selectedRow.zone} / {selectedRow.bed}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span style={{ fontSize: 14, color: '#8A98A3' }}>Time in ED</span>
                    <span
                      className="flex items-center gap-1 font-sans font-medium"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      <Clock style={{ width: 13, height: 13 }} />
                      {formatElapsed(
                        Math.max(
                          0,
                          Math.round(
                            (now.getTime() - new Date(selectedRow.arrivalTime).getTime()) / 60_000,
                          ),
                        ),
                      )}
                    </span>
                  </div>
                </div>

                <div className="mt-5">
                  <FieldLabel>Orders Summary</FieldLabel>
                  <div className="mt-2 grid grid-cols-2 gap-2.5">
                    {[
                      {
                        label: 'Lab Orders',
                        count: selectedRow.orders.lab,
                        icon: FlaskConical,
                        color: '#7C3AED',
                      },
                      {
                        label: 'Imaging',
                        count: selectedRow.orders.imaging,
                        icon: ImageIcon,
                        color: '#2563EB',
                      },
                      {
                        label: 'Medications',
                        count: selectedRow.orders.rx,
                        icon: Pill,
                        color: '#DC2626',
                      },
                      {
                        label: 'Procedures',
                        count: selectedRow.orders.procedures,
                        icon: Activity,
                        color: '#D97706',
                      },
                    ].map((o) => (
                      <div
                        key={o.label}
                        className="rounded-[10px] p-2.5"
                        style={{ background: '#F5FBFD', border: '1px solid rgba(0,100,130,0.1)' }}
                      >
                        <div className="flex items-center gap-1.5">
                          <o.icon style={{ width: 14, height: 14, color: o.color }} />
                          <span
                            className="font-sans font-medium"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {o.label}
                          </span>
                        </div>
                        <p
                          className="font-display mt-1 font-bold"
                          style={{ fontSize: 18, color: o.color }}
                        >
                          {o.count}
                        </p>
                        <p style={{ fontSize: 14, color: '#8A98A3' }}>
                          {o.count > 0 ? 'Pending' : 'None'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-5">
                  <div className="flex items-center justify-between">
                    <FieldLabel>Recent Notes</FieldLabel>
                    <button
                      type="button"
                      onClick={() => router.push(ROUTES.patients)}
                      className={`font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                      style={{ fontSize: 14, color: '#00B4D8' }}
                    >
                      View All
                    </button>
                  </div>
                  <div className="mt-2 flex flex-col gap-2.5">
                    {buildNotesForRow(selectedRow, now).map((n, i) => (
                      <div key={i} className="flex gap-2.5">
                        <span className="w-12 shrink-0" style={{ fontSize: 14, color: '#8A98A3' }}>
                          {formatTime(n.time)}
                        </span>
                        <div className="min-w-0">
                          <p
                            className="font-sans font-medium"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {n.author}
                          </p>
                          <p style={{ fontSize: 14, color: '#4A7080' }}>{n.note}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => router.push(ROUTES.patients)}
                  className={`mt-5 flex h-11 w-full items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                  style={{ fontSize: 14, background: '#0D2630' }}
                >
                  <FileText style={{ width: 15, height: 15 }} />
                  Open Patient Chart
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="mt-4 text-center" style={{ fontSize: 14, color: '#8A98A3' }}>
          All times are current. Data updates automatically.
        </p>
      </div>
    </main>
  );
}
