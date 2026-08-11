'use client';

import {
  AlertCircle,
  ChevronRight,
  Clock,
  Download,
  FileText,
  Filter,
  Hourglass,
  MoreVertical,
  RefreshCw,
  Search,
  UserCheck,
  UserPlus,
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
import { formatTime, toRelativeTime } from '@/utils/datetime';
import { downloadCSV } from '@/utils/export';
import { getTriageDisplay, triageSortWeight, type TriagePriority } from '@/utils/triage';
import { useQueueEntries } from '@/features/registration/store/registrationQueueStore';
import {
  ARRIVAL_SOURCES,
  deriveComplaintForEntry,
  derivePriorityForEntry,
  deriveQueueStageForEntry,
  deriveSourceForEntry,
  PRIORITY_TIERS,
  QUEUE_STAGES,
  type ArrivalSource,
  type QueueStage,
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

const STAGE_CFG: Record<QueueStage, { color: string; bg: string }> = {
  'Awaiting Triage': { color: '#00B4D8', bg: 'rgba(0,180,216,0.1)' },
  'Triage Completed': { color: '#16A34A', bg: 'rgba(22,163,74,0.1)' },
  'In Treatment': { color: '#7C3AED', bg: 'rgba(124,58,237,0.1)' },
  Admitted: { color: '#D97706', bg: 'rgba(217,119,6,0.1)' },
  Discharged: { color: '#8A98A3', bg: 'rgba(138,152,163,0.12)' },
};

const SOURCE_CFG: Record<ArrivalSource, { color: string; bg: string }> = {
  'Walk-in': { color: '#4A7080', bg: 'rgba(74,112,128,0.08)' },
  Ambulance: { color: '#DC2626', bg: 'rgba(220,38,38,0.08)' },
  Referral: { color: '#7C3AED', bg: 'rgba(124,58,237,0.08)' },
};

type TabKey = 'ALL' | QueueStage;
const TABS: { key: TabKey; label: string }[] = [
  { key: 'ALL', label: 'All Patients' },
  { key: 'Awaiting Triage', label: 'Awaiting Triage' },
  { key: 'Triage Completed', label: 'Triage Completed' },
  { key: 'In Treatment', label: 'In Treatment' },
  { key: 'Admitted', label: 'Admitted' },
  { key: 'Discharged', label: 'Discharged' },
];

type EnrichedRow = {
  entryId: string;
  patientName: string;
  mrn: string;
  age: number;
  gender: string;
  arrivalTime: string;
  attendingDoctor: string;
  priority: TriagePriority;
  complaint: string;
  source: ArrivalSource;
  stage: QueueStage;
  waitMinutes: number;
};

function formatWaitMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

// ── Skeletons ────────────────────────────────────────────────────────────

function SkeletonStatCard() {
  return (
    <div
      className="rounded-[12px] p-4"
      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
    >
      <div className="flex items-center justify-between">
        <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
        <div className="size-10 shrink-0 animate-pulse rounded-[12px] bg-slate-200" />
      </div>
      <div className="mt-2.5 h-7 w-14 animate-pulse rounded bg-slate-200" />
      <div className="mt-1.5 h-3.5 w-28 animate-pulse rounded bg-slate-200" />
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 py-3" style={{ borderBottom: '1px solid #E6F8FD' }}>
      <div className="h-3.5 w-full max-w-[200px] animate-pulse rounded bg-slate-200" />
      <div className="h-3.5 w-16 shrink-0 animate-pulse rounded bg-slate-200" />
    </div>
  );
}

// ── Priority pill ────────────────────────────────────────────────────────

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

// ── Row menu ─────────────────────────────────────────────────────────────

function QueueRowMenu({
  open,
  onToggle,
  onView,
  onStartTriage,
  onOpenChart,
}: {
  open: boolean;
  onToggle: () => void;
  onView: () => void;
  onStartTriage: () => void;
  onOpenChart: () => void;
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

type FilterKey = 'priority' | 'source';
type FilterState = { priority: TriagePriority | 'ALL'; source: ArrivalSource | 'ALL' };
const FILTER_DEFAULTS: FilterState = { priority: 'ALL', source: 'ALL' };

export function PatientQueueWorkspace() {
  const router = useRouter();
  const toast = useToast();
  const [pageState, setPageState] = useState<PageState>('loading');
  const [now, setNow] = useState(() => new Date());
  const [activeTab, setActiveTab] = useState<TabKey>('ALL');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<FilterState>(FILTER_DEFAULTS);
  const [openFilter, setOpenFilter] = useState<FilterKey | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [openRowMenuId, setOpenRowMenuId] = useState<string | null>(null);

  const filterBarRef = useRef<HTMLDivElement>(null);

  const allQueueEntries = useQueueEntries();
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
    toast.success('Queue refreshed', 'Showing the latest emergency arrivals.');
  }

  const bedAssignedEntryIds = new Set(
    Array.from(bedOverrides.values())
      .filter((o) => o.status === 'Occupied' && o.entryId)
      .map((o) => o.entryId as string),
  );

  // Real entries, enriched with the same deterministic per-entry helpers the
  // Dashboard uses — a given patient always shows the same priority/
  // complaint/source/stage on both screens. Once a real Triage Assessment
  // (and, further along, a real Bed Assignment) has been completed for an
  // entry, that record — not the placeholder derivation — is the source of
  // truth — safe-merge-at-read-time.
  const rows: EnrichedRow[] = allQueueEntries
    .filter((e) => e.isEmergency)
    .map((e) => {
      const record = triageRecords.get(e.id);
      const hasBed = bedAssignedEntryIds.has(e.id);
      return {
        entryId: e.id,
        patientName: e.patientName,
        mrn: e.mrn,
        age: e.age,
        gender: e.gender,
        arrivalTime: e.arrivalTime,
        attendingDoctor: record?.assignedDoctorName ?? e.attendingDoctor,
        priority: record?.priority ?? derivePriorityForEntry(e.id),
        complaint: record?.chiefComplaint ?? deriveComplaintForEntry(e.id),
        source: record?.arrivalMode ?? deriveSourceForEntry(e.id),
        stage: hasBed
          ? 'In Treatment'
          : record
            ? 'Triage Completed'
            : deriveQueueStageForEntry(e.id),
        waitMinutes: Math.max(
          0,
          Math.round((now.getTime() - new Date(e.arrivalTime).getTime()) / 60_000),
        ),
      };
    });

  const tabCounts: Record<TabKey, number> = { ALL: rows.length } as Record<TabKey, number>;
  for (const stage of QUEUE_STAGES) tabCounts[stage] = rows.filter((r) => r.stage === stage).length;

  const q = search.trim().toLowerCase();
  const filtered = rows
    .filter((r) => activeTab === 'ALL' || r.stage === activeTab)
    .filter((r) => filters.priority === 'ALL' || r.priority === filters.priority)
    .filter((r) => filters.source === 'ALL' || r.source === filters.source)
    .filter((r) => !q || r.patientName.toLowerCase().includes(q) || r.mrn.toLowerCase().includes(q))
    .sort((a, b) => triageSortWeight(a.priority) - triageSortWeight(b.priority));

  const hasActiveFilters =
    filters.priority !== 'ALL' || filters.source !== 'ALL' || search.trim() !== '';

  function clearFilters() {
    setFilters(FILTER_DEFAULTS);
    setSearch('');
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const longestWaitRow = rows.reduce<EnrichedRow | null>(
    (max, r) => (!max || r.waitMinutes > max.waitMinutes ? r : max),
    null,
  );
  const avgWaitMinutes =
    rows.length > 0 ? Math.round(rows.reduce((sum, r) => sum + r.waitMinutes, 0) / rows.length) : 0;

  const selectedRow = rows.find((r) => r.entryId === selectedEntryId) ?? null;

  function handleExport() {
    const header = [
      'Patient',
      'MRN',
      'Age',
      'Gender',
      'Arrival Time',
      'Source',
      'Priority',
      'Chief Complaint',
      'Wait Time',
      'Status',
      'Assigned To',
    ];
    const csvRows = filtered.map((r) => [
      r.patientName,
      r.mrn,
      String(r.age),
      r.gender,
      formatTime(r.arrivalTime),
      r.source,
      getTriageDisplay(r.priority).label,
      r.complaint,
      formatWaitMinutes(r.waitMinutes),
      r.stage,
      r.attendingDoctor,
    ]);
    downloadCSV('emergency-patient-queue', [header, ...csvRows]);
    toast.success('Export ready', 'Patient queue exported as CSV.');
  }

  const FILTER_DEFS: { key: FilterKey; def: FilterDef }[] = [
    {
      key: 'priority',
      def: {
        key: 'priority',
        defaultLabel: 'All Priorities',
        options: PRIORITY_TIERS.map((p) => ({ value: p, label: getTriageDisplay(p).label })),
      },
    },
    {
      key: 'source',
      def: {
        key: 'source',
        defaultLabel: 'All Sources',
        options: ARRIVAL_SOURCES.map((s) => ({ value: s, label: s })),
      },
    },
  ];
  const filterValue: Record<string, string> = {
    priority: filters.priority,
    source: filters.source,
  };
  const filterSetter: Record<string, (v: string) => void> = {
    priority: (v) => setFilters((prev) => ({ ...prev, priority: v as TriagePriority | 'ALL' })),
    source: (v) => setFilters((prev) => ({ ...prev, source: v as ArrivalSource | 'ALL' })),
  };

  if (pageState === 'error') {
    return (
      <main className="flex flex-1 items-center justify-center" style={{ background: '#F5FBFD' }}>
        <div className="flex flex-col items-center gap-3 px-6 text-center">
          <AlertCircle style={{ width: 40, height: 40, color: '#DC2626' }} />
          <p className="font-display font-semibold" style={{ fontSize: 18, color: '#0D2630' }}>
            Couldn&apos;t load the Patient Queue
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
      <div className="mx-auto max-w-[1200px] px-4 py-4 sm:px-6 sm:py-5">
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
            Patient Queue
          </span>
        </div>

        {/* Header */}
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-display font-bold" style={{ fontSize: 24, color: '#0D2630' }}>
              Patient Queue
            </h1>
            <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
              Real-time list of patients waiting for triage and emergency care.
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
              Export
            </button>
            <button
              type="button"
              onClick={handleRefresh}
              className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
              style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
            >
              <RefreshCw style={{ width: 15, height: 15 }} />
              Refresh
            </button>
            <PermissionGate permission={PERMISSIONS.EMERGENCY_WRITE}>
              <button
                type="button"
                onClick={() => router.push(ROUTES.registrationEmergency)}
                className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                style={{ fontSize: 14, background: '#0D2630' }}
              >
                <UserPlus style={{ width: 15, height: 15 }} />
                Register Walk-in
              </button>
            </PermissionGate>
          </div>
        </div>

        {/* Stat cards */}
        <div className="mt-4 grid grid-cols-2 gap-3.5 sm:grid-cols-3 xl:grid-cols-5 xl:gap-4">
          {pageState === 'loading' ? (
            Array.from({ length: 5 }).map((_, i) => <SkeletonStatCard key={i} />)
          ) : (
            <>
              <StatCard
                icon={Users}
                label="Total in Queue"
                value={rows.length}
                info="Patients waiting"
                accent="#00B4D8"
                iconBg="rgba(0,180,216,0.1)"
              />
              <StatCard
                icon={Clock}
                label="Longest Wait Time"
                value={longestWaitRow ? formatWaitMinutes(longestWaitRow.waitMinutes) : '—'}
                info={longestWaitRow?.patientName ?? 'No patients waiting'}
                accent="#DC2626"
                iconBg="rgba(220,38,38,0.1)"
              />
              <StatCard
                icon={Hourglass}
                label="Avg. Wait Time"
                value={`${avgWaitMinutes} mins`}
                info="Today"
                accent="#D97706"
                iconBg="rgba(217,119,6,0.1)"
              />
              <StatCard
                icon={UserPlus}
                label="Awaiting Triage"
                value={tabCounts['Awaiting Triage']}
                info="To be triaged"
                accent="#7C3AED"
                iconBg="rgba(124,58,237,0.1)"
              />
              <StatCard
                icon={UserCheck}
                label="Triage Completed"
                value={tabCounts['Triage Completed']}
                info="Awaiting bed / doctor"
                accent="#16A34A"
                iconBg="rgba(22,163,74,0.1)"
              />
            </>
          )}
        </div>

        {/* Tabs */}
        <div
          className="mt-5 flex items-center gap-1 overflow-x-auto scroll-smooth"
          style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setActiveTab(tab.key);
                  setPage(1);
                }}
                className={`flex shrink-0 items-center gap-1.5 px-3 py-2.5 font-sans font-medium whitespace-nowrap transition-colors duration-150 ${FOCUS_RING}`}
                style={{
                  fontSize: 14,
                  color: isActive ? '#00B4D8' : '#4A7080',
                  borderBottom: isActive ? '2px solid #00B4D8' : '2px solid transparent',
                }}
              >
                {tab.label}
                <span
                  className="rounded-full px-1.5 py-0.5 font-sans font-medium"
                  style={{
                    fontSize: 14,
                    color: isActive ? '#00B4D8' : '#8A98A3',
                    background: isActive ? 'rgba(0,180,216,0.1)' : 'rgba(138,152,163,0.12)',
                  }}
                >
                  {tabCounts[tab.key]}
                </span>
              </button>
            );
          })}
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
              placeholder="Search in queue..."
              className={`h-11 w-full rounded-[10px] py-2 pr-3.5 pl-10 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
              style={{ fontSize: 14, border: '1px solid rgba(0,100,130,0.18)', color: '#0D2630' }}
            />
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              aria-label="Clear all filters"
              className={`flex size-11 shrink-0 items-center justify-center rounded-[10px] transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
              style={{ border: '1px solid rgba(0,100,130,0.2)' }}
            >
              <Filter style={{ width: 16, height: 16, color: '#00B4D8' }} />
            </button>
          )}
        </div>

        {/* Table + detail pane */}
        <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-start">
          <div
            className="min-w-0 flex-1 rounded-[12px]"
            style={{ border: '1px solid rgba(0,100,130,0.12)', background: '#FFFFFF' }}
          >
            {pageState === 'loading' ? (
              <div className="p-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonRow key={i} />
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
                  {hasActiveFilters
                    ? 'No patients match these filters'
                    : 'No patients in this queue'}
                </p>
                <p style={{ fontSize: 14, color: '#8A98A3' }}>
                  {hasActiveFilters
                    ? 'Try a different search term or filter combination.'
                    : 'Emergency arrivals will appear here as soon as they check in.'}
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
                <ScrollableTable minWidth={960}>
                  <div
                    className={`flex items-center rounded-t-[12px] ${TABLE_HEADER_STICKY_CLASS}`}
                    style={{ background: TABLE_HEADER_BG, borderBottom: '1px solid #E6F8FD' }}
                  >
                    {[
                      ['#', 'w-10'],
                      ['Patient', 'min-w-[180px] flex-1'],
                      ['Age/Sex', 'w-20'],
                      ['Arrival', 'w-24'],
                      ['Source', 'w-24'],
                      ['Priority', 'w-28'],
                      ['Complaint', 'min-w-[150px] flex-1'],
                      ['Wait', 'w-20'],
                      ['Status', 'w-32'],
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
                      key={row.entryId}
                      onClick={() => setSelectedEntryId(row.entryId)}
                      className="flex cursor-pointer items-center transition-colors duration-150 hover:bg-[#F5FBFD]"
                      style={{
                        borderBottom: '1px solid rgba(0,100,130,0.08)',
                        background: selectedEntryId === row.entryId ? '#F5FBFD' : undefined,
                      }}
                    >
                      <div className="w-10 shrink-0 py-3 pr-2 pl-3">
                        <p style={{ fontSize: 14, color: '#8A98A3' }}>
                          {(safePage - 1) * pageSize + i + 1}
                        </p>
                      </div>
                      <div className="min-w-[180px] flex-1 py-3 pr-2">
                        <Tooltip content={row.patientName}>
                          <p
                            className="truncate font-sans font-medium"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {row.patientName}
                          </p>
                        </Tooltip>
                        <p style={{ fontSize: 14, color: '#00B4D8' }}>MRN: {row.mrn}</p>
                      </div>
                      <div className="w-20 shrink-0 py-3 pr-2">
                        <p style={{ fontSize: 14, color: '#4A7080' }}>
                          {row.age} / {row.gender.charAt(0)}
                        </p>
                      </div>
                      <div className="w-24 shrink-0 py-3 pr-2">
                        <p className="whitespace-nowrap" style={{ fontSize: 14, color: '#4A7080' }}>
                          {formatTime(row.arrivalTime)}
                        </p>
                      </div>
                      <div className="w-24 shrink-0 py-3 pr-2">
                        <span
                          className="inline-block rounded-full px-2 py-0.5 font-sans font-medium whitespace-nowrap"
                          style={{
                            fontSize: 14,
                            color: SOURCE_CFG[row.source].color,
                            background: SOURCE_CFG[row.source].bg,
                          }}
                        >
                          {row.source}
                        </span>
                      </div>
                      <div className="w-28 shrink-0 py-3 pr-2">
                        <PriorityPill priority={row.priority} />
                      </div>
                      <div className="min-w-[150px] flex-1 py-3 pr-2">
                        <Tooltip content={row.complaint}>
                          <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                            {row.complaint}
                          </p>
                        </Tooltip>
                      </div>
                      <div className="w-20 shrink-0 py-3 pr-2">
                        <p
                          className="font-sans font-medium whitespace-nowrap"
                          style={{
                            fontSize: 14,
                            color: row.waitMinutes > 30 ? '#DC2626' : '#4A7080',
                          }}
                        >
                          {formatWaitMinutes(row.waitMinutes)}
                        </p>
                      </div>
                      <div className="w-32 shrink-0 py-3 pr-2">
                        <span
                          className="inline-block rounded-full px-2 py-0.5 font-sans font-medium whitespace-nowrap"
                          style={{
                            fontSize: 14,
                            color: STAGE_CFG[row.stage].color,
                            background: STAGE_CFG[row.stage].bg,
                          }}
                        >
                          {row.stage}
                        </span>
                      </div>
                      <div
                        className="flex w-14 shrink-0 items-center justify-center py-3 pr-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <QueueRowMenu
                          open={openRowMenuId === row.entryId}
                          onToggle={() =>
                            setOpenRowMenuId((prev) => (prev === row.entryId ? null : row.entryId))
                          }
                          onView={() => {
                            setSelectedEntryId(row.entryId);
                            setOpenRowMenuId(null);
                          }}
                          onStartTriage={() => {
                            setOpenRowMenuId(null);
                            router.push(
                              `${ROUTES.emergencyTriageAssessment}?entryId=${row.entryId}`,
                            );
                          }}
                          onOpenChart={() => {
                            setOpenRowMenuId(null);
                            router.push(ROUTES.patients);
                          }}
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
                />
              </>
            )}
          </div>

          {/* Detail pane */}
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
                  Patient Quick View
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedEntryId(null)}
                  className={`flex items-center gap-1 font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                  style={{ fontSize: 14, color: '#00B4D8' }}
                >
                  Collapse
                  <X style={{ width: 14, height: 14 }} />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto scroll-smooth px-4 pb-4 sm:px-5">
                <div className="flex items-center justify-between gap-2">
                  <PriorityPill priority={selectedRow.priority} />
                  <span
                    className="flex items-center gap-1 font-sans font-medium"
                    style={{ fontSize: 14, color: '#DC2626' }}
                  >
                    <Clock style={{ width: 14, height: 14 }} />
                    {formatWaitMinutes(selectedRow.waitMinutes)}
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <div
                    className="flex size-12 shrink-0 items-center justify-center rounded-full font-sans font-semibold text-white"
                    style={{ background: PRIORITY_COLOR[selectedRow.priority], fontSize: 15 }}
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
                        style={{ fontSize: 16, color: '#0D2630' }}
                      >
                        {selectedRow.patientName}
                      </p>
                    </Tooltip>
                    <p style={{ fontSize: 14, color: '#00B4D8' }}>MRN: {selectedRow.mrn}</p>
                    <p style={{ fontSize: 14, color: '#4A7080' }}>
                      {selectedRow.age} Years, {selectedRow.gender}
                    </p>
                  </div>
                </div>

                <div className="mt-5">
                  <p className="font-sans font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                    Arrival Details
                  </p>
                  <div className="mt-2 flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <span style={{ fontSize: 14, color: '#8A98A3' }}>Arrived</span>
                      <span
                        className="font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {formatTime(selectedRow.arrivalTime)} (
                        {toRelativeTime(selectedRow.arrivalTime)})
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span style={{ fontSize: 14, color: '#8A98A3' }}>Source</span>
                      <span
                        className="font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {selectedRow.source}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span style={{ fontSize: 14, color: '#8A98A3' }}>Assigned To</span>
                      <Tooltip content={selectedRow.attendingDoctor}>
                        <span
                          className="max-w-[160px] truncate text-right font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {selectedRow.attendingDoctor}
                        </span>
                      </Tooltip>
                    </div>
                  </div>
                </div>

                <div className="mt-5">
                  <p className="font-sans font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                    Chief Complaint
                  </p>
                  <p className="mt-2" style={{ fontSize: 14, color: '#4A7080' }}>
                    {selectedRow.complaint}
                  </p>
                  <p className="mt-1" style={{ fontSize: 14, color: '#8A98A3' }}>
                    Started {toRelativeTime(selectedRow.arrivalTime)}
                  </p>
                </div>

                <div className="mt-5">
                  <p className="font-sans font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                    Queue Status
                  </p>
                  <span
                    className="mt-2 inline-block rounded-full px-2.5 py-1 font-sans font-medium"
                    style={{
                      fontSize: 14,
                      color: STAGE_CFG[selectedRow.stage].color,
                      background: STAGE_CFG[selectedRow.stage].bg,
                    }}
                  >
                    {selectedRow.stage}
                  </span>
                </div>

                <div className="mt-5 flex flex-col gap-2">
                  <p className="font-sans font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                    Actions
                  </p>
                  <PermissionGate permission={PERMISSIONS.EMERGENCY_WRITE}>
                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          `${ROUTES.emergencyTriageAssessment}?entryId=${selectedRow.entryId}`,
                        )
                      }
                      className={`flex h-11 items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                      style={{ fontSize: 14, background: '#0D2630' }}
                    >
                      <UserCheck style={{ width: 15, height: 15 }} />
                      Start Triage
                    </button>
                  </PermissionGate>
                  <button
                    type="button"
                    onClick={() => router.push(ROUTES.patients)}
                    className={`flex h-11 items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                    style={{
                      fontSize: 14,
                      color: '#0D2630',
                      border: '1px solid rgba(0,100,130,0.2)',
                    }}
                  >
                    <FileText style={{ width: 15, height: 15 }} />
                    Open Patient Chart
                  </button>
                </div>
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
