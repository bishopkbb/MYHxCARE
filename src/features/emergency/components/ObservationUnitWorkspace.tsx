'use client';

import {
  AlertCircle,
  AlertTriangle,
  Bed as BedIcon,
  CheckCircle2,
  ChevronRight,
  Clock,
  ClipboardList,
  DoorOpen,
  Eye,
  FileText,
  MoreVertical,
  Plus,
  RefreshCw,
  Search,
  StickyNote,
  Stethoscope,
  Users,
  X,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { FilterDropdown, type FilterDef } from '@components/shared/FilterDropdown';
import { ModalLoadingFallback } from '@components/shared/ModalLoadingFallback';
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
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { formatHumanDate, formatTime, isToday } from '@/utils/datetime';
import { getTriageDisplay, type TriagePriority } from '@/utils/triage';
import {
  derivePriorityForEntry,
  OBSERVATION_BAYS,
} from '@/features/emergency/__mocks__/emergencyFixtures';
import { DOCTORS } from '@/features/shared/__mocks__/doctorDirectory';
import {
  addObservationNote,
  addObservationOrder,
  admitToObservation,
  dischargeFromObservation,
  markReadyForDisposition,
  recordObservationVitals,
  useObservationRecords,
  useRecentObservationDispositions,
  type ObservationOutcome,
  type ObservationRecord,
} from '@/features/emergency/store/observationStore';
import type { AvailableSlot } from '@/features/emergency/components/AddPatientToObservationModal';

const AddPatientToObservationModal = dynamic(
  () => import('./AddPatientToObservationModal').then((m) => m.AddPatientToObservationModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);
const DischargeTransferModal = dynamic(
  () => import('./DischargeTransferModal').then((m) => m.DischargeTransferModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

type PageState = 'loading' | 'loaded' | 'error';
type LiveStatus = 'Overdue' | 'Due for Review' | 'Monitoring' | 'Ready for Disposition';
type TabKey = 'ALL' | 'Due for Review' | 'Overdue' | 'Ready for Disposition' | 'Discharged';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const PRIORITY_COLOR: Record<TriagePriority, string> = {
  IMMEDIATE: '#DC2626',
  URGENT: '#D97706',
  LESS_URGENT: '#F59E0B',
  NON_URGENT: '#16A34A',
};
const PRIORITY_BG: Record<TriagePriority, string> = {
  IMMEDIATE: 'rgba(220,38,38,0.06)',
  URGENT: 'rgba(217,119,6,0.06)',
  LESS_URGENT: 'rgba(245,158,11,0.06)',
  NON_URGENT: 'rgba(22,163,74,0.06)',
};

const STATUS_CFG: Record<LiveStatus, { color: string; bg: string }> = {
  Overdue: { color: '#DC2626', bg: 'rgba(220,38,38,0.1)' },
  'Due for Review': { color: '#D97706', bg: 'rgba(217,119,6,0.1)' },
  Monitoring: { color: '#2563EB', bg: 'rgba(37,99,235,0.1)' },
  'Ready for Disposition': { color: '#16A34A', bg: 'rgba(22,163,74,0.1)' },
};

const OUTCOME_COLOR: Record<ObservationOutcome, string> = {
  Discharged: '#16A34A',
  Admitted: '#D97706',
  Transferred: '#2563EB',
};

function computeLiveStatus(record: ObservationRecord, now: Date): LiveStatus {
  if (record.disposition === 'ReadyForDisposition') return 'Ready for Disposition';
  const diffMin = (new Date(record.nextReviewAt).getTime() - now.getTime()) / 60_000;
  if (diffMin < 0) return 'Overdue';
  if (diffMin <= 30) return 'Due for Review';
  return 'Monitoring';
}

function formatElapsed(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

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
        />
      )}
      {display.label}
    </span>
  );
}

function LiveStatusPill({ status }: { status: LiveStatus }) {
  const cfg = STATUS_CFG[status];
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 font-sans font-medium whitespace-nowrap"
      style={{ fontSize: 14, color: cfg.color, background: cfg.bg }}
    >
      {status}
    </span>
  );
}

const INPUT_CLASS =
  'h-10 w-full rounded-[8px] px-3 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40';
const INPUT_STYLE = { fontSize: 14, border: '1px solid rgba(0,100,130,0.18)', color: '#0D2630' };

// ── Row menu ─────────────────────────────────────────────────────────────

function ObsRowMenu({
  open,
  onToggle,
  onView,
  onReadyForDisposition,
  onDischarge,
  onOpenChart,
  isReady,
}: {
  open: boolean;
  onToggle: () => void;
  onView: () => void;
  onReadyForDisposition: () => void;
  onDischarge: () => void;
  onOpenChart: () => void;
  isReady: boolean;
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
      <RowMenuPortal open={open} anchorRef={buttonRef} onClose={onToggle} width={210}>
        <button
          type="button"
          onClick={onView}
          className={`flex w-full items-center gap-2 px-3.5 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
          style={{ fontSize: 14, color: '#0D2630' }}
        >
          <FileText style={{ width: 15, height: 15, color: '#00B4D8' }} />
          View Details
        </button>
        {!isReady && (
          <PermissionGate permission={PERMISSIONS.EMERGENCY_WRITE}>
            <button
              type="button"
              onClick={onReadyForDisposition}
              className={`flex w-full items-center gap-2 px-3.5 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
              style={{ fontSize: 14, color: '#0D2630' }}
            >
              <CheckCircle2 style={{ width: 15, height: 15, color: '#4A7080' }} />
              Mark Ready for Disposition
            </button>
          </PermissionGate>
        )}
        <PermissionGate permission={PERMISSIONS.EMERGENCY_WRITE}>
          <button
            type="button"
            onClick={onDischarge}
            className={`flex w-full items-center gap-2 px-3.5 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
            style={{ fontSize: 14, color: '#0D2630' }}
          >
            <DoorOpen style={{ width: 15, height: 15, color: '#4A7080' }} />
            Discharge / Transfer
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

type FilterKey = 'bay' | 'physician' | 'status';

export function ObservationUnitWorkspace() {
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();

  const [pageState, setPageState] = useState<PageState>('loading');
  const [now, setNow] = useState(() => new Date());

  const [activeTab, setActiveTab] = useState<TabKey>('ALL');
  const [bayFilter, setBayFilter] = useState('ALL');
  const [physicianFilter, setPhysicianFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | LiveStatus>('ALL');
  const [openFilter, setOpenFilter] = useState<FilterKey | null>(null);
  const [search, setSearch] = useState('');

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openRowMenuId, setOpenRowMenuId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [dischargeTargetId, setDischargeTargetId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<'note' | 'vitals' | 'order' | null>(null);

  const [noteText, setNoteText] = useState('');
  const [vitalsForm, setVitalsForm] = useState({ bp: '', hr: '', rr: '', spo2: '' });
  const [orderType, setOrderType] = useState<'Lab' | 'Imaging' | 'Medication' | 'Procedure'>('Lab');
  const [generalNote, setGeneralNote] = useState('');

  const filterBarRef = useRef<HTMLDivElement>(null);

  const observationRecords = useObservationRecords();
  const recentDispositions = useRecentObservationDispositions();

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
    toast.success('Observation Unit refreshed', 'Showing the latest patient status.');
  }

  const activeList = Array.from(observationRecords.values());
  const enriched = activeList.map((r) => ({
    ...r,
    liveStatus: computeLiveStatus(r, now),
    priority: derivePriorityForEntry(r.id),
    timeInObsMinutes: Math.max(
      0,
      Math.round((now.getTime() - new Date(r.admittedAt).getTime()) / 60_000),
    ),
  }));

  const occupiedKeys = new Set(activeList.map((r) => `${r.bay}__${r.slotLabel}`));
  const availableSlots: AvailableSlot[] = OBSERVATION_BAYS.flatMap((b) =>
    b.slots.map((s) => ({ bay: b.bay, slotLabel: s })),
  ).filter((s) => !occupiedKeys.has(`${s.bay}__${s.slotLabel}`));

  const newTodayCount = activeList.filter((r) => isToday(r.admittedAt)).length;
  const overdueCount = enriched.filter((r) => r.liveStatus === 'Overdue').length;
  const dueForReviewCount = enriched.filter((r) => r.liveStatus === 'Due for Review').length;
  const readyCount = enriched.filter((r) => r.liveStatus === 'Ready for Disposition').length;
  const dischargedTodayCount = recentDispositions.filter((d) => isToday(d.time)).length;

  const bayOptions = OBSERVATION_BAYS.map((b) => b.bay);
  const physicianOptions = Array.from(new Set(activeList.map((r) => r.physician))).sort();

  const tabCounts: Record<TabKey, number> = {
    ALL: enriched.length,
    'Due for Review': dueForReviewCount,
    Overdue: overdueCount,
    'Ready for Disposition': readyCount,
    Discharged: dischargedTodayCount,
  };

  const q = search.trim().toLowerCase();
  const filteredActive = enriched
    .filter((r) => activeTab === 'ALL' || r.liveStatus === activeTab)
    .filter((r) => bayFilter === 'ALL' || r.bay === bayFilter)
    .filter((r) => physicianFilter === 'ALL' || r.physician === physicianFilter)
    .filter((r) => statusFilter === 'ALL' || r.liveStatus === statusFilter)
    .filter((r) => !q || r.patientName.toLowerCase().includes(q))
    .sort((a, b) => a.timeInObsMinutes - b.timeInObsMinutes);

  const hasActiveFilters =
    bayFilter !== 'ALL' ||
    physicianFilter !== 'ALL' ||
    statusFilter !== 'ALL' ||
    search.trim() !== '';

  function clearFilters() {
    setBayFilter('ALL');
    setPhysicianFilter('ALL');
    setStatusFilter('ALL');
    setSearch('');
  }

  const selected =
    (selectedId ? enriched.find((r) => r.id === selectedId) : undefined) ?? enriched[0];
  const dischargeTarget = dischargeTargetId
    ? activeList.find((r) => r.id === dischargeTargetId)
    : undefined;

  function handleAdmit(input: {
    patientName: string;
    age: number;
    gender: 'Male' | 'Female';
    bay: string;
    slotLabel: string;
    reason: string;
    physician: string;
    reviewMinutes: number;
  }) {
    admitToObservation(input);
    setShowAddModal(false);
    toast.success(
      'Patient admitted',
      `${input.patientName} has been admitted to ${input.bay} / ${input.slotLabel}.`,
    );
  }

  function handleConfirmDischarge(outcome: ObservationOutcome, note: string) {
    if (!dischargeTarget) return;
    void note;
    dischargeFromObservation(dischargeTarget.id, outcome);
    toast.success(
      'Disposition recorded',
      `${dischargeTarget.patientName} — ${outcome.toLowerCase()}.`,
    );
    setDischargeTargetId(null);
    if (selectedId === dischargeTarget.id) setSelectedId(null);
  }

  function handleSubmitNote() {
    if (!selected || !noteText.trim()) return;
    addObservationNote(selected.id, user?.name ?? 'Nurse', noteText.trim());
    toast.success('Note added', 'Nursing note saved.');
    setNoteText('');
    setActiveTool(null);
  }

  function handleSubmitVitals() {
    if (!selected) return;
    if (!vitalsForm.bp.trim()) return;
    recordObservationVitals(selected.id, {
      bp: vitalsForm.bp.trim(),
      hr: Number(vitalsForm.hr) || 0,
      rr: Number(vitalsForm.rr) || 0,
      spo2: Number(vitalsForm.spo2) || 0,
    });
    toast.success('Vitals recorded', `Vitals updated for ${selected.patientName}.`);
    setVitalsForm({ bp: '', hr: '', rr: '', spo2: '' });
    setActiveTool(null);
  }

  function handleSubmitOrder() {
    if (!selected) return;
    addObservationOrder(selected.id);
    toast.success('Order added', `${orderType} order added for ${selected.patientName}.`);
    setActiveTool(null);
  }

  const FILTER_DEFS: { key: FilterKey; def: FilterDef }[] = [
    {
      key: 'bay',
      def: {
        key: 'bay',
        defaultLabel: 'All Beds/Seats',
        options: bayOptions.map((b) => ({ value: b, label: b })),
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
        options: (
          ['Overdue', 'Due for Review', 'Monitoring', 'Ready for Disposition'] as LiveStatus[]
        ).map((s) => ({ value: s, label: s })),
      },
    },
  ];
  const filterValue: Record<string, string> = {
    bay: bayFilter,
    physician: physicianFilter,
    status: statusFilter,
  };
  const filterSetter: Record<string, (v: string) => void> = {
    bay: setBayFilter,
    physician: setPhysicianFilter,
    status: (v) => setStatusFilter(v as LiveStatus),
  };

  if (pageState === 'error') {
    return (
      <main className="flex flex-1 items-center justify-center" style={{ background: '#F5FBFD' }}>
        <div className="flex flex-col items-center gap-3 px-6 text-center">
          <AlertCircle style={{ width: 40, height: 40, color: '#DC2626' }} />
          <p className="font-display font-semibold" style={{ fontSize: 18, color: '#0D2630' }}>
            Couldn&apos;t load the Observation Unit
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
            Observation Unit
          </span>
        </div>

        {/* Header */}
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <Eye style={{ width: 22, height: 22, color: '#00B4D8' }} />
            <div>
              <h1 className="font-display font-bold" style={{ fontSize: 24, color: '#0D2630' }}>
                Observation Unit
              </h1>
              <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
                Monitor and manage patients under observation.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2.5">
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
                onClick={() => setShowAddModal(true)}
                className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                style={{ fontSize: 14, background: '#0D2630' }}
              >
                <Plus style={{ width: 15, height: 15 }} />
                Add Patient to Observation
              </button>
            </PermissionGate>
          </div>
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
                icon={Eye}
                label="Total in Observation"
                value={enriched.length}
                info="Patients"
                accent="#00B4D8"
                iconBg="rgba(0,180,216,0.1)"
              />
              <StatCard
                icon={FileText}
                label="New Today"
                value={newTodayCount}
                info="Patients"
                accent="#2563EB"
                iconBg="rgba(37,99,235,0.1)"
              />
              <StatCard
                icon={Clock}
                label="Due for Review"
                value={dueForReviewCount}
                info="Next 30 mins"
                accent="#D97706"
                iconBg="rgba(217,119,6,0.1)"
              />
              <StatCard
                icon={AlertTriangle}
                label="Overdue Review"
                value={overdueCount}
                info="Require attention"
                accent="#DC2626"
                iconBg="rgba(220,38,38,0.1)"
              />
              <StatCard
                icon={CheckCircle2}
                label="Ready for Disposition"
                value={readyCount}
                info="Ready to decide"
                accent="#16A34A"
                iconBg="rgba(22,163,74,0.1)"
              />
              <StatCard
                icon={DoorOpen}
                label="Discharged from Obs"
                value={dischargedTodayCount}
                info="Today"
                accent="#8A98A3"
                iconBg="rgba(138,152,163,0.12)"
              />
            </>
          )}
        </div>

        {/* Tabs */}
        <div
          className="mt-5 flex items-center gap-1 overflow-x-auto scroll-smooth"
          style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
        >
          {(
            [
              { key: 'ALL', label: 'All' },
              { key: 'Due for Review', label: 'Due for Review' },
              { key: 'Overdue', label: 'Overdue' },
              { key: 'Ready for Disposition', label: 'Ready for Disposition' },
              { key: 'Discharged', label: 'Discharged' },
            ] as { key: TabKey; label: string }[]
          ).map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
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
        {activeTab !== 'Discharged' && (
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
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search patient..."
                className={`h-11 w-full rounded-[10px] py-2 pr-3.5 pl-10 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                style={{ fontSize: 14, border: '1px solid rgba(0,100,130,0.18)', color: '#0D2630' }}
              />
            </div>
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
        )}

        {/* Table + sidebar */}
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
            ) : activeTab === 'Discharged' ? (
              recentDispositions.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
                  <div
                    className="flex size-14 items-center justify-center rounded-full"
                    style={{ background: 'rgba(226,237,241,0.6)' }}
                  >
                    <DoorOpen style={{ width: 28, height: 28, color: '#8A98A3' }} />
                  </div>
                  <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                    No recent dispositions
                  </p>
                </div>
              ) : (
                <div className="p-2">
                  {recentDispositions.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center justify-between gap-3 px-2.5 py-3"
                      style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-14 shrink-0" style={{ fontSize: 14, color: '#8A98A3' }}>
                          {formatTime(d.time)}
                        </span>
                        <p
                          className="font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {d.patientName}
                        </p>
                      </div>
                      <span
                        className="font-sans font-medium"
                        style={{ fontSize: 14, color: OUTCOME_COLOR[d.outcome] }}
                      >
                        {d.outcome}
                      </span>
                    </div>
                  ))}
                </div>
              )
            ) : filteredActive.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
                <div
                  className="flex size-14 items-center justify-center rounded-full"
                  style={{ background: 'rgba(226,237,241,0.6)' }}
                >
                  <Eye style={{ width: 28, height: 28, color: '#8A98A3' }} />
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
              <ScrollableTable minWidth={1000}>
                <div
                  className={`flex items-center rounded-t-[12px] ${TABLE_HEADER_STICKY_CLASS}`}
                  style={{ background: TABLE_HEADER_BG, borderBottom: '1px solid #E6F8FD' }}
                >
                  {[
                    ['#', 'w-10'],
                    ['Patient', 'min-w-[150px] flex-1'],
                    ['Age/Sex', 'w-20'],
                    ['Location', 'w-32'],
                    ['Reason', 'min-w-[150px] flex-1'],
                    ['Physician', 'w-28'],
                    ['Time in Obs', 'w-28'],
                    ['Next Review', 'w-28'],
                    ['Status', 'w-40'],
                    ['', 'w-24'],
                  ].map(([label, width]) => (
                    <div
                      key={label}
                      className={`${width} shrink-0 overflow-hidden px-2 py-2.5 text-center`}
                    >
                      <span
                        className="truncate font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
                {filteredActive.map((row, i) => (
                  <div
                    key={row.id}
                    onClick={() => setSelectedId(row.id)}
                    className="flex cursor-pointer items-center transition-colors duration-150 hover:bg-[#F5FBFD]"
                    style={{
                      borderBottom: '1px solid rgba(0,100,130,0.08)',
                      background: selected?.id === row.id ? '#F5FBFD' : undefined,
                    }}
                  >
                    <div className="w-10 shrink-0 px-2 py-3 text-center">
                      <p style={{ fontSize: 14, color: '#8A98A3' }}>{i + 1}</p>
                    </div>
                    <div className="min-w-[150px] flex-1 px-2 py-3 text-center">
                      <Tooltip content={row.patientName}>
                        <p
                          className="truncate font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {row.patientName}
                        </p>
                      </Tooltip>
                    </div>
                    <div className="w-20 shrink-0 px-2 py-3 text-center">
                      <p style={{ fontSize: 14, color: '#4A7080' }}>
                        {row.age} / {row.gender.charAt(0)}
                      </p>
                    </div>
                    <div className="w-32 shrink-0 px-2 py-3 text-center">
                      <p style={{ fontSize: 14, color: '#0D2630' }}>{row.bay}</p>
                      <p style={{ fontSize: 14, color: '#8A98A3' }}>{row.slotLabel}</p>
                    </div>
                    <div className="min-w-[150px] flex-1 px-2 py-3 text-center">
                      <Tooltip content={row.reason}>
                        <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                          {row.reason}
                        </p>
                      </Tooltip>
                    </div>
                    <div className="w-28 shrink-0 px-2 py-3 text-center">
                      <Tooltip content={row.physician}>
                        <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                          {row.physician}
                        </p>
                      </Tooltip>
                    </div>
                    <div className="w-28 shrink-0 px-2 py-3 text-center">
                      <p
                        className="font-sans font-medium whitespace-nowrap"
                        style={{
                          fontSize: 14,
                          color: row.liveStatus === 'Overdue' ? '#DC2626' : '#4A7080',
                        }}
                      >
                        {formatElapsed(row.timeInObsMinutes)}
                      </p>
                    </div>
                    <div className="w-28 shrink-0 px-2 py-3 text-center">
                      <p style={{ fontSize: 14, color: '#4A7080' }}>
                        {formatTime(row.nextReviewAt)}
                      </p>
                    </div>
                    <div className="w-40 shrink-0 px-2 py-3 text-center">
                      <LiveStatusPill status={row.liveStatus} />
                    </div>
                    <div
                      className="flex w-24 shrink-0 items-center justify-center gap-1 px-2 py-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedId(row.id)}
                        className={`flex h-9 items-center rounded-[8px] px-3 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                        style={{
                          fontSize: 14,
                          color: '#00B4D8',
                          border: '1px solid rgba(0,180,216,0.3)',
                        }}
                      >
                        View
                      </button>
                      <ObsRowMenu
                        open={openRowMenuId === row.id}
                        onToggle={() =>
                          setOpenRowMenuId((prev) => (prev === row.id ? null : row.id))
                        }
                        isReady={row.liveStatus === 'Ready for Disposition'}
                        onView={() => {
                          setSelectedId(row.id);
                          setOpenRowMenuId(null);
                        }}
                        onReadyForDisposition={() => {
                          markReadyForDisposition(row.id);
                          setOpenRowMenuId(null);
                          toast.success(
                            'Marked ready',
                            `${row.patientName} is ready for disposition.`,
                          );
                        }}
                        onDischarge={() => {
                          setOpenRowMenuId(null);
                          setDischargeTargetId(row.id);
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
            )}
            {activeTab !== 'Discharged' && filteredActive.length > 0 && (
              <p className="px-4 py-3" style={{ fontSize: 14, color: '#8A98A3' }}>
                Showing 1 to {filteredActive.length} of {filteredActive.length} patients
              </p>
            )}
          </div>

          {/* Sidebar */}
          <div className="flex w-full shrink-0 flex-col gap-4 xl:w-[340px]">
            {selected && (
              <div
                className="rounded-[12px] p-4"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <div className="flex items-center justify-between">
                  <p
                    className="font-display font-semibold"
                    style={{ fontSize: 16, color: '#0D2630' }}
                  >
                    Selected Patient
                  </p>
                  <button
                    type="button"
                    onClick={() => setSelectedId(null)}
                    className={`flex items-center gap-1 font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                    style={{ fontSize: 14, color: '#00B4D8' }}
                  >
                    Collapse
                    <X style={{ width: 14, height: 14 }} />
                  </button>
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <div
                    className="flex size-11 shrink-0 items-center justify-center rounded-full font-sans font-semibold text-white"
                    style={{ background: PRIORITY_COLOR[selected.priority], fontSize: 14 }}
                  >
                    {selected.patientName
                      .split(/\s+/)
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')}
                  </div>
                  <div className="min-w-0">
                    <Tooltip content={selected.patientName}>
                      <p
                        className="truncate font-sans font-semibold"
                        style={{ fontSize: 15, color: '#0D2630' }}
                      >
                        {selected.patientName}
                      </p>
                    </Tooltip>
                  </div>
                </div>
                <div className="mt-2">
                  <PriorityPill priority={selected.priority} />
                </div>

                <div className="mt-3.5 flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <span style={{ fontSize: 14, color: '#8A98A3' }}>Reason</span>
                    <Tooltip content={selected.reason}>
                      <span
                        className="max-w-[160px] truncate text-right font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {selected.reason}
                      </span>
                    </Tooltip>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span style={{ fontSize: 14, color: '#8A98A3' }}>Admitted</span>
                    <span
                      className="font-sans font-medium"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {formatHumanDate(selected.admittedAt)}, {formatTime(selected.admittedAt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span style={{ fontSize: 14, color: '#8A98A3' }}>Time in Observation</span>
                    <span
                      className="font-sans font-medium"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {formatElapsed(selected.timeInObsMinutes)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span style={{ fontSize: 14, color: '#8A98A3' }}>Observing Physician</span>
                    <Tooltip content={selected.physician}>
                      <span
                        className="max-w-[160px] truncate text-right font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {selected.physician}
                      </span>
                    </Tooltip>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span style={{ fontSize: 14, color: '#8A98A3' }}>Location</span>
                    <span
                      className="font-sans font-medium"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {selected.bay}, {selected.slotLabel}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span style={{ fontSize: 14, color: '#8A98A3' }}>Next Review</span>
                    <span
                      className="flex items-center gap-1 font-sans font-medium"
                      style={{ fontSize: 14, color: STATUS_CFG[selected.liveStatus].color }}
                    >
                      <Clock style={{ width: 13, height: 13 }} />
                      {formatTime(selected.nextReviewAt)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {selected && (
              <div
                className="rounded-[12px] p-4"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <p
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Vital Signs Trend
                </p>
                <div className="mt-2.5 grid grid-cols-2 gap-2.5">
                  <div className="rounded-[10px] p-2.5" style={{ background: '#F5FBFD' }}>
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>BP</p>
                    <p
                      className="font-display font-bold"
                      style={{ fontSize: 16, color: '#0D2630' }}
                    >
                      {selected.vitals.bp}
                    </p>
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>mmHg</p>
                  </div>
                  <div className="rounded-[10px] p-2.5" style={{ background: '#F5FBFD' }}>
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>HR</p>
                    <p
                      className="font-display font-bold"
                      style={{ fontSize: 16, color: '#DC2626' }}
                    >
                      {selected.vitals.hr}
                    </p>
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>bpm</p>
                  </div>
                  <div className="rounded-[10px] p-2.5" style={{ background: '#F5FBFD' }}>
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>RR</p>
                    <p
                      className="font-display font-bold"
                      style={{ fontSize: 16, color: '#0D2630' }}
                    >
                      {selected.vitals.rr}
                    </p>
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>rpm</p>
                  </div>
                  <div className="rounded-[10px] p-2.5" style={{ background: '#F5FBFD' }}>
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>SpO₂</p>
                    <p
                      className="font-display font-bold"
                      style={{ fontSize: 16, color: '#0D2630' }}
                    >
                      {selected.vitals.spo2}%
                    </p>
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>
                      Last updated {formatTime(selected.vitals.updatedAt)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {selected && (
              <div
                className="rounded-[12px] p-4"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <p
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Observation Tools
                </p>
                <div className="mt-2.5 grid grid-cols-2 gap-2">
                  <PermissionGate permission={PERMISSIONS.EMERGENCY_WRITE}>
                    <button
                      type="button"
                      onClick={() => setActiveTool((t) => (t === 'note' ? null : 'note'))}
                      className={`flex h-10 items-center justify-center gap-1.5 rounded-[8px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                      style={{
                        fontSize: 14,
                        color: '#0D2630',
                        border: '1px solid rgba(0,100,130,0.2)',
                      }}
                    >
                      <StickyNote style={{ width: 14, height: 14 }} />
                      Add Note
                    </button>
                  </PermissionGate>
                  <PermissionGate permission={PERMISSIONS.EMERGENCY_WRITE}>
                    <button
                      type="button"
                      onClick={() => setActiveTool((t) => (t === 'vitals' ? null : 'vitals'))}
                      className={`flex h-10 items-center justify-center gap-1.5 rounded-[8px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                      style={{
                        fontSize: 14,
                        color: '#0D2630',
                        border: '1px solid rgba(0,100,130,0.2)',
                      }}
                    >
                      <Stethoscope style={{ width: 14, height: 14 }} />
                      Record Vitals
                    </button>
                  </PermissionGate>
                  <PermissionGate permission={PERMISSIONS.EMERGENCY_WRITE}>
                    <button
                      type="button"
                      onClick={() => setActiveTool((t) => (t === 'order' ? null : 'order'))}
                      className={`flex h-10 items-center justify-center gap-1.5 rounded-[8px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                      style={{
                        fontSize: 14,
                        color: '#0D2630',
                        border: '1px solid rgba(0,100,130,0.2)',
                      }}
                    >
                      <ClipboardList style={{ width: 14, height: 14 }} />
                      Add Order
                    </button>
                  </PermissionGate>
                  <PermissionGate permission={PERMISSIONS.EMERGENCY_WRITE}>
                    <button
                      type="button"
                      onClick={() => setDischargeTargetId(selected.id)}
                      className={`flex h-10 items-center justify-center gap-1.5 rounded-[8px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                      style={{
                        fontSize: 14,
                        color: '#0D2630',
                        border: '1px solid rgba(0,100,130,0.2)',
                      }}
                    >
                      <DoorOpen style={{ width: 14, height: 14 }} />
                      Discharge
                    </button>
                  </PermissionGate>
                </div>

                {activeTool === 'note' && (
                  <div className="mt-3 flex flex-col gap-2">
                    <textarea
                      value={noteText}
                      onChange={(e) => e.target.value.length <= 300 && setNoteText(e.target.value)}
                      rows={2}
                      placeholder="Add a nursing note..."
                      className={`w-full resize-none rounded-[8px] p-2.5 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                      style={INPUT_STYLE}
                    />
                    <button
                      type="button"
                      onClick={handleSubmitNote}
                      disabled={!noteText.trim()}
                      className={`flex h-9 items-center justify-center rounded-[8px] font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 disabled:opacity-50 ${FOCUS_RING}`}
                      style={{ fontSize: 14, background: '#0D2630' }}
                    >
                      Save Note
                    </button>
                  </div>
                )}

                {activeTool === 'vitals' && (
                  <div className="mt-3 flex flex-col gap-2">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        value={vitalsForm.bp}
                        onChange={(e) => setVitalsForm((v) => ({ ...v, bp: e.target.value }))}
                        placeholder="BP (e.g. 120/80)"
                        className={INPUT_CLASS}
                        style={INPUT_STYLE}
                      />
                      <input
                        type="number"
                        value={vitalsForm.hr}
                        onChange={(e) => setVitalsForm((v) => ({ ...v, hr: e.target.value }))}
                        placeholder="HR (bpm)"
                        className={INPUT_CLASS}
                        style={INPUT_STYLE}
                      />
                      <input
                        type="number"
                        value={vitalsForm.rr}
                        onChange={(e) => setVitalsForm((v) => ({ ...v, rr: e.target.value }))}
                        placeholder="RR (rpm)"
                        className={INPUT_CLASS}
                        style={INPUT_STYLE}
                      />
                      <input
                        type="number"
                        value={vitalsForm.spo2}
                        onChange={(e) => setVitalsForm((v) => ({ ...v, spo2: e.target.value }))}
                        placeholder="SpO₂ (%)"
                        className={INPUT_CLASS}
                        style={INPUT_STYLE}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleSubmitVitals}
                      disabled={!vitalsForm.bp.trim()}
                      className={`flex h-9 items-center justify-center rounded-[8px] font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 disabled:opacity-50 ${FOCUS_RING}`}
                      style={{ fontSize: 14, background: '#0D2630' }}
                    >
                      Save Vitals
                    </button>
                  </div>
                )}

                {activeTool === 'order' && (
                  <div className="mt-3 flex flex-col gap-2">
                    <select
                      value={orderType}
                      onChange={(e) => setOrderType(e.target.value as typeof orderType)}
                      className={INPUT_CLASS}
                      style={INPUT_STYLE}
                    >
                      <option value="Lab">Lab</option>
                      <option value="Imaging">Imaging</option>
                      <option value="Medication">Medication</option>
                      <option value="Procedure">Procedure</option>
                    </select>
                    <button
                      type="button"
                      onClick={handleSubmitOrder}
                      className={`flex h-9 items-center justify-center rounded-[8px] font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                      style={{ fontSize: 14, background: '#0D2630' }}
                    >
                      Add Order
                    </button>
                  </div>
                )}
              </div>
            )}

            <div
              className="rounded-[12px] p-4"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Bed / Seat Status
              </p>
              <div className="mt-2.5 flex flex-col gap-2.5">
                {OBSERVATION_BAYS.map((b) => (
                  <div key={b.bay} className="flex items-center justify-between gap-2">
                    <span
                      className="font-sans font-medium"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {b.bay} ({b.slots.length})
                    </span>
                    <div className="flex items-center gap-1.5">
                      {b.slots.map((slot) => {
                        const occupant = enriched.find(
                          (r) => r.bay === b.bay && r.slotLabel === slot,
                        );
                        const color = occupant ? STATUS_CFG[occupant.liveStatus].color : '#94A3B8';
                        return (
                          <Tooltip
                            key={slot}
                            content={
                              occupant ? `${slot}: ${occupant.patientName}` : `${slot}: Available`
                            }
                          >
                            <BedIcon style={{ width: 18, height: 18, color }} />
                          </Tooltip>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Notes + Recent Dispositions */}
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div
            className="rounded-[12px] p-4"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
              Observation Unit Notes
            </p>
            <textarea
              value={generalNote}
              onChange={(e) => e.target.value.length <= 500 && setGeneralNote(e.target.value)}
              rows={3}
              placeholder="Add a general note about the observation unit..."
              className={`mt-2.5 w-full resize-none rounded-[10px] p-3.5 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
              style={{ fontSize: 14, border: '1px solid rgba(0,100,130,0.18)', color: '#0D2630' }}
            />
            <p className="mt-1 text-right" style={{ fontSize: 14, color: '#8A98A3' }}>
              {generalNote.length}/500
            </p>
          </div>

          <div
            className="rounded-[12px] p-4"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <div className="flex items-center justify-between">
              <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Recent Dispositions
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('Discharged')}
                className={`font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#00B4D8' }}
              >
                View All
              </button>
            </div>
            <div className="mt-2.5 flex flex-col gap-2.5">
              {recentDispositions.slice(0, 4).map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="w-14 shrink-0" style={{ fontSize: 14, color: '#8A98A3' }}>
                      {formatTime(d.time)}
                    </span>
                    <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                      {d.patientName}
                    </p>
                  </div>
                  <span
                    className="font-sans font-medium"
                    style={{ fontSize: 14, color: OUTCOME_COLOR[d.outcome] }}
                  >
                    {d.outcome}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-4 text-center" style={{ fontSize: 14, color: '#8A98A3' }}>
          All times are current. Data updates automatically.
        </p>
      </div>

      {showAddModal && (
        <AddPatientToObservationModal
          availableSlots={availableSlots}
          physicianOptions={
            physicianOptions.length > 0 ? physicianOptions : DOCTORS.slice(0, 5).map((d) => d.name)
          }
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAdmit}
        />
      )}

      {dischargeTarget && (
        <DischargeTransferModal
          patientName={dischargeTarget.patientName}
          bay={dischargeTarget.bay}
          slotLabel={dischargeTarget.slotLabel}
          onClose={() => setDischargeTargetId(null)}
          onConfirm={handleConfirmDischarge}
        />
      )}
    </main>
  );
}
