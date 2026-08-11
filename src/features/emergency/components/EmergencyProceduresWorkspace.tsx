'use client';

import {
  AlertCircle,
  AlertTriangle,
  Activity,
  Bone,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Droplet,
  Droplets,
  Eye,
  FileText,
  FlaskConical,
  HeartPulse,
  MoreVertical,
  Plus,
  RefreshCw,
  Scissors,
  Search,
  Stethoscope,
  Syringe,
  Users,
  Wind,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import { AllergyBanner } from '@/components/clinical/AllergyBanner';
import { FilterDropdown, type FilterDef } from '@components/shared/FilterDropdown';
import { ModalLoadingFallback } from '@components/shared/ModalLoadingFallback';
import { PermissionGate } from '@components/shared/PermissionGate';
import { RowMenuPortal } from '@components/shared/RowMenuPortal';
import {
  ScrollableTable,
  TABLE_HEADER_BG,
  TABLE_HEADER_STICKY_CLASS,
} from '@components/shared/ScrollableTable';
import { Tooltip } from '@components/shared/Tooltip';
import { PERMISSIONS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { formatHumanDate, formatTime } from '@/utils/datetime';
import { getTriageDisplay, triageSortWeight, type TriagePriority } from '@/utils/triage';
import type { Allergy } from '@/types/patient.types';
import { useQueueEntries } from '@/features/registration/store/registrationQueueStore';
import type { QueueEntry } from '@/features/registration/__mocks__/queueFixtures';
import {
  COMMON_PROCEDURES,
  deriveActiveDiagnoses,
  deriveBloodGroup,
  deriveLatestVitals,
  derivePhoneForEntry,
  derivePriorityForEntry,
  deriveWeightKg,
  PROCEDURE_REFERENCE,
  type ProcedureCatalogEntry,
  type ProcedureType,
} from '@/features/emergency/__mocks__/emergencyFixtures';
import { PatientSwitcher } from '@/features/emergency/components/PatientSwitcher';
import { useTriageRecords } from '@/features/emergency/store/triageAssessmentStore';
import { useMedicationOrders } from '@/features/emergency/store/medicationOrderStore';
import { useLatestWorkingDiagnoses } from '@/features/emergency/store/clinicalNotesStore';
import {
  addProcedure,
  addProcedureDocument,
  addProcedureNote,
  cancelProcedure,
  updateProcedureStatus,
  useProcedures,
  type ProcedureNoteType,
  type ProcedureRecord,
  type ProcedureStatus,
} from '@/features/emergency/store/procedureStore';

const NewProcedureModal = dynamic(
  () => import('./NewProcedureModal').then((m) => m.NewProcedureModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);
const CancelProcedureModal = dynamic(
  () => import('./CancelProcedureModal').then((m) => m.CancelProcedureModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

type PageState = 'loading' | 'loaded' | 'error';
type TabKey = 'List' | 'Details' | 'PostOrders' | 'Notes' | 'Documents';

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

const STATUS_CFG: Record<ProcedureStatus, { color: string; bg: string; dot: boolean }> = {
  Planned: { color: '#2563EB', bg: 'rgba(37,99,235,0.1)', dot: false },
  'In Progress': { color: '#D97706', bg: 'rgba(217,119,6,0.1)', dot: true },
  Completed: { color: '#16A34A', bg: 'rgba(22,163,74,0.1)', dot: false },
  Cancelled: { color: '#8A98A3', bg: 'rgba(138,152,163,0.12)', dot: false },
};

const PROCEDURE_TYPES: ProcedureType[] = [
  'Airway',
  'Cardiac',
  'Thoracic',
  'Vascular Access',
  'Minor Procedure',
  'Neurological',
  'Orthopedic',
  'Genitourinary',
];

const TILE_CFG: Record<string, { icon: LucideIcon; color: string; bg: string }> = {
  'Endotracheal Intubation': { icon: Wind, color: '#2563EB', bg: 'rgba(37,99,235,0.1)' },
  CPR: { icon: HeartPulse, color: '#DC2626', bg: 'rgba(220,38,38,0.1)' },
  Defibrillation: { icon: Zap, color: '#D97706', bg: 'rgba(217,119,6,0.1)' },
  'Chest Tube Insertion': { icon: Activity, color: '#16A34A', bg: 'rgba(22,163,74,0.1)' },
  'Central Line Insertion': { icon: Droplets, color: '#7C3AED', bg: 'rgba(124,58,237,0.1)' },
  'Lumbar Puncture': { icon: Syringe, color: '#4F46E5', bg: 'rgba(79,70,229,0.1)' },
  'Wound Suturing': { icon: Scissors, color: '#2563EB', bg: 'rgba(37,99,235,0.1)' },
  'Incision & Drainage': { icon: Scissors, color: '#D97706', bg: 'rgba(217,119,6,0.1)' },
  'Reduction of Dislocation': { icon: Bone, color: '#2563EB', bg: 'rgba(37,99,235,0.1)' },
  'Urinary Catheterization': { icon: Droplet, color: '#2563EB', bg: 'rgba(37,99,235,0.1)' },
};

function ProcedureStatusPill({ status }: { status: ProcedureStatus }) {
  const cfg = STATUS_CFG[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-[6px] px-2 py-0.5 font-sans font-semibold whitespace-nowrap"
      style={{ fontSize: 14, color: cfg.color, background: cfg.bg }}
    >
      {cfg.dot && <span className="size-1.5 rounded-full" style={{ background: cfg.color }} />}
      {status}
    </span>
  );
}

// ── Row menu ─────────────────────────────────────────────────────────────

function ProcedureRowMenu({
  open,
  onToggle,
  status,
  onView,
  onMarkInProgress,
  onMarkCompleted,
  onCancel,
  onAddNote,
  onOpenChart,
}: {
  open: boolean;
  onToggle: () => void;
  status: ProcedureStatus;
  onView: () => void;
  onMarkInProgress: () => void;
  onMarkCompleted: () => void;
  onCancel: () => void;
  onAddNote: () => void;
  onOpenChart: () => void;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const isFinal = status === 'Completed' || status === 'Cancelled';
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
        {!isFinal && (
          <PermissionGate permission={PERMISSIONS.EMERGENCY_WRITE}>
            {status === 'Planned' && (
              <button
                type="button"
                onClick={onMarkInProgress}
                className={`flex w-full items-center gap-2 px-3.5 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#0D2630' }}
              >
                <Activity style={{ width: 15, height: 15, color: '#4A7080' }} />
                Mark In Progress
              </button>
            )}
            <button
              type="button"
              onClick={onMarkCompleted}
              className={`flex w-full items-center gap-2 px-3.5 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
              style={{ fontSize: 14, color: '#0D2630' }}
            >
              <CheckCircle2 style={{ width: 15, height: 15, color: '#4A7080' }} />
              Mark Completed
            </button>
            <button
              type="button"
              onClick={onCancel}
              className={`flex w-full items-center gap-2 px-3.5 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
              style={{ fontSize: 14, color: '#DC2626' }}
            >
              <X style={{ width: 15, height: 15 }} />
              Cancel Procedure
            </button>
          </PermissionGate>
        )}
        <button
          type="button"
          onClick={onAddNote}
          className={`flex w-full items-center gap-2 px-3.5 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
          style={{ fontSize: 14, color: '#0D2630' }}
        >
          <ClipboardList style={{ width: 15, height: 15, color: '#4A7080' }} />
          Add Note / Complication
        </button>
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

type FilterKey = 'status' | 'type' | 'date';

export function EmergencyProceduresWorkspace() {
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const entryId = searchParams.get('entryId');

  const [pageState, setPageState] = useState<PageState>('loading');
  const [now, setNow] = useState(() => new Date());

  const [activeTab, setActiveTab] = useState<TabKey>('List');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL');
  const [openFilter, setOpenFilter] = useState<FilterKey | null>(null);
  const [search, setSearch] = useState('');

  const [selectedProcedureId, setSelectedProcedureId] = useState<string | null>(null);
  const [openRowMenuId, setOpenRowMenuId] = useState<string | null>(null);
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);
  const [showNewProcedureModal, setShowNewProcedureModal] = useState(false);
  const [newProcedurePrefill, setNewProcedurePrefill] = useState<ProcedureCatalogEntry | null>(
    null,
  );

  const [noteText, setNoteText] = useState('');
  const [noteType, setNoteType] = useState<ProcedureNoteType>('Note');
  const [docName, setDocName] = useState('');
  const [docCategory, setDocCategory] = useState('Procedure Report');

  const filterBarRef = useRef<HTMLDivElement>(null);
  const templatesRef = useRef<HTMLDivElement>(null);

  const allEntries = useQueueEntries();
  const triageRecords = useTriageRecords();

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

  const emergencyEntries = allEntries.filter((e) => e.isEmergency);
  const entry: QueueEntry | undefined = entryId
    ? emergencyEntries.find((e) => e.id === entryId)
    : emergencyEntries
        .slice()
        .sort(
          (a, b) =>
            triageSortWeight(triageRecords.get(a.id)?.priority ?? derivePriorityForEntry(a.id)) -
            triageSortWeight(triageRecords.get(b.id)?.priority ?? derivePriorityForEntry(b.id)),
        )[0];

  const triageRecord = entry ? triageRecords.get(entry.id) : undefined;
  const priority: TriagePriority =
    triageRecord?.priority ?? (entry ? derivePriorityForEntry(entry.id) : 'NON_URGENT');
  const attendingPhysician = triageRecord?.assignedDoctorName ?? entry?.attendingDoctor ?? '—';
  const defaultPerformedBy = user?.name ?? attendingPhysician;
  const location = 'ER-01, Resus Bay';

  const procedures = useProcedures(entry?.id, defaultPerformedBy, location);
  const medicationOrders = useMedicationOrders(entry?.id, defaultPerformedBy);

  function handleRetry() {
    setPageState('loading');
    setTimeout(() => setPageState('loaded'), 800);
  }

  function handleRefresh() {
    setNow(new Date());
    toast.success('Procedures refreshed', 'Showing the latest procedure records.');
  }

  const sortedProcedures = useMemo(
    () =>
      [...procedures].sort(
        (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
      ),
    [procedures],
  );

  const q = search.trim().toLowerCase();
  const filtered = sortedProcedures
    .filter((p) => statusFilter === 'ALL' || p.status === statusFilter)
    .filter((p) => typeFilter === 'ALL' || p.type === typeFilter)
    .filter((p) => {
      if (dateFilter === 'ALL') return true;
      const start = new Date(p.startedAt).getTime();
      const dayMs = 24 * 60 * 60 * 1000;
      if (dateFilter === 'TODAY') return now.getTime() - start < dayMs && start <= now.getTime();
      if (dateFilter === 'WEEK') return now.getTime() - start < 7 * dayMs;
      return true;
    })
    .filter((p) => !q || p.name.toLowerCase().includes(q));

  const hasActiveFilters =
    statusFilter !== 'ALL' || typeFilter !== 'ALL' || dateFilter !== 'ALL' || search.trim() !== '';

  function clearFilters() {
    setStatusFilter('ALL');
    setTypeFilter('ALL');
    setDateFilter('ALL');
    setSearch('');
  }

  const selectedProcedure: ProcedureRecord | undefined = selectedProcedureId
    ? sortedProcedures.find((p) => p.id === selectedProcedureId)
    : (sortedProcedures.find((p) => p.status === 'In Progress') ?? sortedProcedures[0]);

  const isHighRisk =
    priority === 'IMMEDIATE' ||
    triageRecord?.manchester.lifeThreatening === true ||
    procedures.some(
      (p) => p.status === 'In Progress' && (p.type === 'Airway' || p.type === 'Cardiac'),
    );

  const realWorkingDiagnoses = useLatestWorkingDiagnoses(entry?.id);
  const activeDiagnoses = realWorkingDiagnoses ?? (entry ? deriveActiveDiagnoses(entry.id) : []);

  function goToTab(tab: TabKey, procedureId?: string) {
    if (procedureId) setSelectedProcedureId(procedureId);
    setActiveTab(tab);
  }

  function openNewProcedureModal(prefill?: ProcedureCatalogEntry) {
    setNewProcedurePrefill(prefill ?? null);
    setShowNewProcedureModal(true);
  }

  function handleLogProcedure(input: {
    name: string;
    type: ProcedureType;
    status: ProcedureStatus;
    performedBy: string;
    location: string;
  }) {
    if (!entry) return;
    addProcedure({ entryId: entry.id, ...input });
    toast.success('Procedure logged', `${input.name} added to the procedure list.`);
    setShowNewProcedureModal(false);
  }

  function handleAddNote() {
    if (!entry || !selectedProcedure || !noteText.trim()) return;
    addProcedureNote(entry.id, selectedProcedure.id, noteText.trim(), noteType, defaultPerformedBy);
    toast.success(
      noteType === 'Complication' ? 'Complication logged' : 'Note added',
      `${selectedProcedure.name}: entry recorded.`,
    );
    setNoteText('');
  }

  function handleAddDocument() {
    if (!entry || !selectedProcedure || !docName.trim()) return;
    addProcedureDocument(
      entry.id,
      selectedProcedure.id,
      docName.trim(),
      docCategory,
      defaultPerformedBy,
    );
    toast.success('Document attached', `${docName.trim()} added to ${selectedProcedure.name}.`);
    setDocName('');
  }

  const FILTER_DEFS: { key: FilterKey; def: FilterDef }[] = [
    {
      key: 'status',
      def: {
        key: 'status',
        defaultLabel: 'All Status',
        options: (['Planned', 'In Progress', 'Completed', 'Cancelled'] as ProcedureStatus[]).map(
          (s) => ({ value: s, label: s }),
        ),
      },
    },
    {
      key: 'type',
      def: {
        key: 'type',
        defaultLabel: 'All Types',
        options: PROCEDURE_TYPES.map((t) => ({ value: t, label: t })),
      },
    },
    {
      key: 'date',
      def: {
        key: 'date',
        defaultLabel: 'All Dates',
        options: [
          { value: 'TODAY', label: 'Today' },
          { value: 'WEEK', label: 'Last 7 Days' },
        ],
      },
    },
  ];
  const filterValue: Record<string, string> = {
    status: statusFilter,
    type: typeFilter,
    date: dateFilter,
  };
  const filterSetter: Record<string, (v: string) => void> = {
    status: setStatusFilter,
    type: setTypeFilter,
    date: setDateFilter,
  };

  if (pageState === 'error') {
    return (
      <main className="flex flex-1 items-center justify-center" style={{ background: '#F5FBFD' }}>
        <div className="flex flex-col items-center gap-3 px-6 text-center">
          <AlertCircle style={{ width: 40, height: 40, color: '#DC2626' }} />
          <p className="font-display font-semibold" style={{ fontSize: 18, color: '#0D2630' }}>
            Couldn&apos;t load Emergency Procedures
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

  if (pageState === 'loading') {
    return (
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto max-w-[1400px] px-4 py-4 sm:px-6 sm:py-5">
          <div className="h-4 w-72 animate-pulse rounded bg-slate-200" />
          <div className="mt-3 h-8 w-64 animate-pulse rounded bg-slate-200" />
          <div className="mt-6 h-64 animate-pulse rounded-[12px] bg-slate-100" />
        </div>
      </main>
    );
  }

  if (!entry) {
    return (
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto flex max-w-[1400px] flex-col items-center gap-3 px-4 py-24 text-center sm:px-6">
          <div
            className="flex size-14 items-center justify-center rounded-full"
            style={{ background: 'rgba(226,237,241,0.6)' }}
          >
            <Stethoscope style={{ width: 28, height: 28, color: '#8A98A3' }} />
          </div>
          <p className="font-display font-semibold" style={{ fontSize: 18, color: '#0D2630' }}>
            No emergency patients in the queue
          </p>
          <p style={{ fontSize: 14, color: '#4A7080' }}>
            Procedures need a patient currently in the emergency department.
          </p>
          <button
            type="button"
            onClick={() => router.push(ROUTES.emergencyPatientQueue)}
            className={`mt-1 flex h-11 items-center gap-2 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
            style={{ fontSize: 14, background: '#00B4D8' }}
          >
            Go to Patient Queue
          </button>
        </div>
      </main>
    );
  }

  const phone = derivePhoneForEntry(entry.id);
  const weightKg = deriveWeightKg(entry.id);
  const bloodGroup = deriveBloodGroup(entry.id);
  const allergies: Allergy[] = [];

  const postOrders = selectedProcedure
    ? medicationOrders
        .filter(
          (o) =>
            new Date(o.timeOrdered).getTime() >= new Date(selectedProcedure.startedAt).getTime(),
        )
        .sort((a, b) => new Date(b.timeOrdered).getTime() - new Date(a.timeOrdered).getTime())
    : [];

  const reference = selectedProcedure ? PROCEDURE_REFERENCE[selectedProcedure.name] : undefined;

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
          <span style={{ fontSize: 14, color: '#4A7080' }}>Emergency Care</span>
          <ChevronRight style={{ width: 14, height: 14, color: '#8A98A3' }} />
          <span className="font-sans font-medium" style={{ fontSize: 14, color: '#00B4D8' }}>
            Emergency Procedures
          </span>
        </div>

        {/* Header */}
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <Stethoscope style={{ width: 22, height: 22, color: '#DC2626' }} />
            <div>
              <h1 className="font-display font-bold" style={{ fontSize: 24, color: '#0D2630' }}>
                Emergency Procedures
              </h1>
              <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
                Perform and document emergency procedures for patients.
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
            <button
              type="button"
              onClick={() => {
                setActiveTab('List');
                templatesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
              style={{ fontSize: 14, color: '#00B4D8', border: '1px solid #00B4D8' }}
            >
              <ClipboardList style={{ width: 15, height: 15 }} />
              Procedure Templates
            </button>
            <PermissionGate permission={PERMISSIONS.EMERGENCY_WRITE}>
              <button
                type="button"
                onClick={() => openNewProcedureModal()}
                className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                style={{ fontSize: 14, background: '#0D2630' }}
              >
                <Plus style={{ width: 15, height: 15 }} />
                New Procedure
              </button>
            </PermissionGate>
          </div>
        </div>

        {/* Patient context bar */}
        <div
          className="mt-4 flex flex-wrap items-center gap-x-8 gap-y-3 rounded-[12px] p-4"
          style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex size-11 shrink-0 items-center justify-center rounded-full font-sans font-semibold text-white"
              style={{ background: PRIORITY_COLOR[priority], fontSize: 14 }}
            >
              {entry.patientName
                .split(/\s+/)
                .map((n) => n[0])
                .slice(0, 2)
                .join('')}
            </div>
            <div>
              <span
                className="inline-flex items-center rounded-full px-2.5 py-0.5 font-sans font-semibold"
                style={{
                  fontSize: 14,
                  color: PRIORITY_COLOR[priority],
                  background: PRIORITY_BG[priority],
                }}
              >
                {getTriageDisplay(priority).label}
              </span>
              <p
                className="font-display mt-0.5 font-semibold"
                style={{ fontSize: 17, color: '#0D2630' }}
              >
                {entry.patientName}
              </p>
              <p style={{ fontSize: 14, color: '#4A7080' }}>
                MRN: {entry.mrn} · {entry.age} Years, {entry.gender} · {phone}
              </p>
            </div>
          </div>
          <div>
            <p style={{ fontSize: 14, color: '#8A98A3' }}>Location</p>
            <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
              {location}
            </p>
          </div>
          <div>
            <p style={{ fontSize: 14, color: '#8A98A3' }}>Attending Physician</p>
            <Tooltip content={attendingPhysician}>
              <p
                className="max-w-[160px] truncate font-sans font-medium"
                style={{ fontSize: 14, color: '#0D2630' }}
              >
                {attendingPhysician}
              </p>
            </Tooltip>
          </div>
          <div>
            <p style={{ fontSize: 14, color: '#8A98A3' }}>Allergies</p>
            <p className="font-sans font-medium" style={{ fontSize: 14, color: '#16A34A' }}>
              No Known Allergies
            </p>
          </div>
          <div>
            <p style={{ fontSize: 14, color: '#8A98A3' }}>Blood Group</p>
            <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
              {bloodGroup}
            </p>
          </div>
          <div>
            <p style={{ fontSize: 14, color: '#8A98A3' }}>Weight</p>
            <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
              {weightKg} kg
            </p>
          </div>
          <div className="ml-auto">
            <PatientSwitcher currentEntryId={entry.id} />
          </div>
        </div>

        <div className="mt-4">
          <AllergyBanner allergies={allergies} />
        </div>

        {/* Tabs */}
        <div
          className="mt-4 flex items-center gap-1 overflow-x-auto scroll-smooth"
          style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
        >
          {(
            [
              { key: 'List', label: 'Procedure List' },
              { key: 'Details', label: 'Procedure Details' },
              { key: 'PostOrders', label: 'Post-Procedure Orders' },
              { key: 'Notes', label: 'Complications & Notes' },
              { key: 'Documents', label: 'Documents' },
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
              </button>
            );
          })}
        </div>

        {/* Main grid */}
        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_320px] xl:items-start">
          <div className="min-w-0">
            {activeTab === 'List' && (
              <>
                {/* Filter bar */}
                <div ref={filterBarRef} className="flex flex-wrap items-center gap-2.5">
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
                      placeholder="Search procedures..."
                      className={`h-11 w-full rounded-[10px] py-2 pr-3.5 pl-10 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                      style={{
                        fontSize: 14,
                        border: '1px solid rgba(0,100,130,0.18)',
                        color: '#0D2630',
                      }}
                    />
                  </div>
                </div>

                <div
                  className="mt-4 rounded-[12px]"
                  style={{ border: '1px solid rgba(0,100,130,0.12)', background: '#FFFFFF' }}
                >
                  {filtered.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
                      <div
                        className="flex size-14 items-center justify-center rounded-full"
                        style={{ background: 'rgba(226,237,241,0.6)' }}
                      >
                        <Stethoscope style={{ width: 28, height: 28, color: '#8A98A3' }} />
                      </div>
                      <p
                        className="font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        No procedures logged
                      </p>
                      <p style={{ fontSize: 14, color: '#8A98A3' }}>
                        {hasActiveFilters
                          ? 'Try a different search term or filter combination.'
                          : 'Use "New Procedure" or a template below to log one.'}
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
                      <ScrollableTable minWidth={980}>
                        <div
                          className={`flex items-center rounded-t-[12px] ${TABLE_HEADER_STICKY_CLASS}`}
                          style={{ background: TABLE_HEADER_BG, borderBottom: '1px solid #E6F8FD' }}
                        >
                          {[
                            ['#', 'w-10'],
                            ['Procedure', 'min-w-[180px] flex-1'],
                            ['Type', 'w-32'],
                            ['Status', 'w-32'],
                            ['Performed By', 'w-32'],
                            ['Date / Time', 'w-32'],
                            ['Location', 'w-32'],
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
                        {filtered.map((proc, i) => (
                          <div
                            key={proc.id}
                            className="flex cursor-pointer items-center transition-colors duration-150 hover:bg-[#F5FBFD]"
                            onClick={() => goToTab('Details', proc.id)}
                            style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                          >
                            <div className="w-10 shrink-0 px-2 py-3 text-center">
                              <p style={{ fontSize: 14, color: '#8A98A3' }}>{i + 1}</p>
                            </div>
                            <div className="min-w-[180px] flex-1 px-2 py-3 text-center">
                              <p
                                className="font-sans font-semibold"
                                style={{ fontSize: 14, color: '#0D2630' }}
                              >
                                {proc.name}
                              </p>
                            </div>
                            <div className="w-32 shrink-0 px-2 py-3 text-center">
                              <p style={{ fontSize: 14, color: '#4A7080' }}>{proc.type}</p>
                            </div>
                            <div className="w-32 shrink-0 px-2 py-3 text-center">
                              <ProcedureStatusPill status={proc.status} />
                            </div>
                            <div className="w-32 shrink-0 px-2 py-3 text-center">
                              <Tooltip content={proc.performedBy}>
                                <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                                  {proc.performedBy}
                                </p>
                              </Tooltip>
                            </div>
                            <div className="w-32 shrink-0 px-2 py-3 text-center">
                              <p style={{ fontSize: 14, color: '#4A7080' }}>
                                {formatTime(proc.startedAt)}
                              </p>
                              <p style={{ fontSize: 14, color: '#8A98A3' }}>
                                {formatHumanDate(proc.startedAt)}
                              </p>
                            </div>
                            <div className="w-32 shrink-0 px-2 py-3 text-center">
                              <Tooltip content={proc.location}>
                                <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                                  {proc.location}
                                </p>
                              </Tooltip>
                            </div>
                            <div
                              className="flex w-24 shrink-0 items-center justify-center gap-1 px-2 py-3"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => goToTab('Details', proc.id)}
                                aria-label="View details"
                                className={`flex size-9 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                              >
                                <Eye style={{ width: 16, height: 16, color: '#4A7080' }} />
                              </button>
                              <ProcedureRowMenu
                                open={openRowMenuId === proc.id}
                                onToggle={() =>
                                  setOpenRowMenuId((prev) => (prev === proc.id ? null : proc.id))
                                }
                                status={proc.status}
                                onView={() => {
                                  setOpenRowMenuId(null);
                                  goToTab('Details', proc.id);
                                }}
                                onMarkInProgress={() => {
                                  setOpenRowMenuId(null);
                                  updateProcedureStatus(entry.id, proc.id, 'In Progress');
                                  toast.success(
                                    'Procedure started',
                                    `${proc.name} is now In Progress.`,
                                  );
                                }}
                                onMarkCompleted={() => {
                                  setOpenRowMenuId(null);
                                  updateProcedureStatus(entry.id, proc.id, 'Completed');
                                  toast.success(
                                    'Procedure completed',
                                    `${proc.name} marked completed.`,
                                  );
                                }}
                                onCancel={() => {
                                  setOpenRowMenuId(null);
                                  setCancelTargetId(proc.id);
                                }}
                                onAddNote={() => {
                                  setOpenRowMenuId(null);
                                  goToTab('Notes', proc.id);
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
                      <p className="px-4 py-3" style={{ fontSize: 14, color: '#8A98A3' }}>
                        Showing 1 to {filtered.length} of {filtered.length} procedures
                      </p>
                    </>
                  )}
                </div>

                {/* Common Emergency Procedures */}
                <div ref={templatesRef} className="mt-4">
                  <p
                    className="font-display font-semibold"
                    style={{ fontSize: 16, color: '#0D2630' }}
                  >
                    Common Emergency Procedures
                  </p>
                  <div className="mt-2.5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
                    {COMMON_PROCEDURES.map((p) => {
                      const cfg = TILE_CFG[p.name] ?? {
                        icon: Stethoscope,
                        color: '#4A7080',
                        bg: '#F5FBFD',
                      };
                      const Icon = cfg.icon;
                      return (
                        <PermissionGate key={p.name} permission={PERMISSIONS.EMERGENCY_WRITE}>
                          <button
                            type="button"
                            onClick={() => openNewProcedureModal(p)}
                            className={`flex flex-col items-center gap-2 rounded-[12px] p-4 text-center transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                            style={{
                              border: '1px solid rgba(0,100,130,0.12)',
                              background: '#FFFFFF',
                            }}
                          >
                            <div
                              className="flex size-11 items-center justify-center rounded-[10px]"
                              style={{ background: cfg.bg }}
                            >
                              <Icon style={{ width: 20, height: 20, color: cfg.color }} />
                            </div>
                            <span
                              className="font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {p.name}
                            </span>
                          </button>
                        </PermissionGate>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {activeTab !== 'List' && sortedProcedures.length === 0 && (
              <div
                className="flex flex-col items-center gap-2 rounded-[12px] px-4 py-16 text-center"
                style={{ border: '1px solid rgba(0,100,130,0.12)', background: '#FFFFFF' }}
              >
                <div
                  className="flex size-14 items-center justify-center rounded-full"
                  style={{ background: 'rgba(226,237,241,0.6)' }}
                >
                  <Stethoscope style={{ width: 28, height: 28, color: '#8A98A3' }} />
                </div>
                <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                  No procedures logged yet
                </p>
                <p style={{ fontSize: 14, color: '#8A98A3' }}>
                  Log a procedure from the Procedure List tab first.
                </p>
              </div>
            )}

            {activeTab !== 'List' && sortedProcedures.length > 0 && selectedProcedure && (
              <div className="flex flex-col gap-4">
                <div
                  className="flex flex-wrap items-center gap-3 rounded-[12px] p-4"
                  style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                >
                  <label
                    className="font-sans font-medium"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    Procedure
                  </label>
                  <select
                    value={selectedProcedure.id}
                    onChange={(e) => setSelectedProcedureId(e.target.value)}
                    className={`h-10 flex-1 rounded-[8px] px-3 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                    style={{
                      fontSize: 14,
                      border: '1px solid rgba(0,100,130,0.18)',
                      color: '#0D2630',
                    }}
                  >
                    {sortedProcedures.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {formatTime(p.startedAt)}, {formatHumanDate(p.startedAt)}
                      </option>
                    ))}
                  </select>
                </div>

                {activeTab === 'Details' && (
                  <>
                    <div
                      className="rounded-[12px] p-4"
                      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p
                            className="font-display font-semibold"
                            style={{ fontSize: 18, color: '#0D2630' }}
                          >
                            {selectedProcedure.name}
                          </p>
                          <p style={{ fontSize: 14, color: '#4A7080' }}>{selectedProcedure.type}</p>
                        </div>
                        <ProcedureStatusPill status={selectedProcedure.status} />
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div>
                          <p style={{ fontSize: 14, color: '#8A98A3' }}>Performed By</p>
                          <p
                            className="font-sans font-medium"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {selectedProcedure.performedBy}
                          </p>
                        </div>
                        <div>
                          <p style={{ fontSize: 14, color: '#8A98A3' }}>Location</p>
                          <p
                            className="font-sans font-medium"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {selectedProcedure.location}
                          </p>
                        </div>
                        <div>
                          <p style={{ fontSize: 14, color: '#8A98A3' }}>Started</p>
                          <p
                            className="font-sans font-medium"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {formatTime(selectedProcedure.startedAt)}
                          </p>
                        </div>
                        <div>
                          <p style={{ fontSize: 14, color: '#8A98A3' }}>Completed</p>
                          <p
                            className="font-sans font-medium"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {selectedProcedure.completedAt
                              ? formatTime(selectedProcedure.completedAt)
                              : '—'}
                          </p>
                        </div>
                      </div>
                      {selectedProcedure.status === 'Cancelled' &&
                        selectedProcedure.cancelledReason && (
                          <div
                            className="mt-3 flex items-start gap-2 rounded-[10px] p-3"
                            style={{ background: 'rgba(220,38,38,0.06)' }}
                          >
                            <AlertTriangle
                              style={{ width: 15, height: 15, color: '#DC2626' }}
                              className="mt-0.5 shrink-0"
                            />
                            <p style={{ fontSize: 14, color: '#DC2626' }}>
                              Cancelled: {selectedProcedure.cancelledReason}
                            </p>
                          </div>
                        )}
                      {selectedProcedure.status !== 'Completed' &&
                        selectedProcedure.status !== 'Cancelled' && (
                          <PermissionGate permission={PERMISSIONS.EMERGENCY_WRITE}>
                            <div className="mt-3 flex flex-wrap gap-2.5">
                              {selectedProcedure.status === 'Planned' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    updateProcedureStatus(
                                      entry.id,
                                      selectedProcedure.id,
                                      'In Progress',
                                    );
                                    toast.success(
                                      'Procedure started',
                                      `${selectedProcedure.name} is now In Progress.`,
                                    );
                                  }}
                                  className={`flex h-10 items-center gap-1.5 rounded-[8px] px-3.5 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                                  style={{
                                    fontSize: 14,
                                    color: '#0D2630',
                                    border: '1px solid rgba(0,100,130,0.2)',
                                  }}
                                >
                                  <Activity style={{ width: 15, height: 15 }} />
                                  Mark In Progress
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  updateProcedureStatus(
                                    entry.id,
                                    selectedProcedure.id,
                                    'Completed',
                                  );
                                  toast.success(
                                    'Procedure completed',
                                    `${selectedProcedure.name} marked completed.`,
                                  );
                                }}
                                className={`flex h-10 items-center gap-1.5 rounded-[8px] px-3.5 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                                style={{ fontSize: 14, background: '#16A34A' }}
                              >
                                <CheckCircle2 style={{ width: 15, height: 15 }} />
                                Mark Completed
                              </button>
                              <button
                                type="button"
                                onClick={() => setCancelTargetId(selectedProcedure.id)}
                                className={`flex h-10 items-center gap-1.5 rounded-[8px] px-3.5 font-sans font-medium transition-colors duration-150 hover:bg-[rgba(220,38,38,0.06)] ${FOCUS_RING}`}
                                style={{
                                  fontSize: 14,
                                  color: '#DC2626',
                                  border: '1px solid rgba(220,38,38,0.3)',
                                }}
                              >
                                <X style={{ width: 15, height: 15 }} />
                                Cancel Procedure
                              </button>
                            </div>
                          </PermissionGate>
                        )}
                    </div>

                    <div
                      className="rounded-[12px] p-4"
                      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                    >
                      <p
                        className="font-display font-semibold"
                        style={{ fontSize: 16, color: '#0D2630' }}
                      >
                        Procedure Reference
                      </p>
                      {reference ? (
                        <div className="mt-2.5 flex flex-col gap-3">
                          <div>
                            <p
                              className="font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              Indications
                            </p>
                            <p style={{ fontSize: 14, color: '#4A7080' }}>
                              {reference.indications}
                            </p>
                          </div>
                          <div>
                            <p
                              className="font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              Equipment
                            </p>
                            <div className="mt-1 flex flex-wrap gap-1.5">
                              {reference.equipment.map((eq) => (
                                <span
                                  key={eq}
                                  className="rounded-full px-2.5 py-0.5 font-sans"
                                  style={{ fontSize: 14, color: '#0D2630', background: '#F5FBFD' }}
                                >
                                  {eq}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p
                              className="font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              Steps
                            </p>
                            <ol
                              className="mt-1 flex flex-col gap-1 pl-4"
                              style={{ listStyle: 'decimal' }}
                            >
                              {reference.steps.map((step) => (
                                <li key={step} style={{ fontSize: 14, color: '#4A7080' }}>
                                  {step}
                                </li>
                              ))}
                            </ol>
                          </div>
                          <div
                            className="flex items-start gap-2 rounded-[10px] p-3"
                            style={{ background: 'rgba(217,119,6,0.06)' }}
                          >
                            <AlertTriangle
                              style={{ width: 15, height: 15, color: '#D97706' }}
                              className="mt-0.5 shrink-0"
                            />
                            <p style={{ fontSize: 14, color: '#D97706' }}>{reference.risks}</p>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-2.5" style={{ fontSize: 14, color: '#8A98A3' }}>
                          No reference protocol available for this custom procedure.
                        </p>
                      )}
                    </div>
                  </>
                )}

                {activeTab === 'PostOrders' && (
                  <div
                    className="rounded-[12px] p-4"
                    style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p style={{ fontSize: 14, color: '#4A7080' }}>
                        Medication orders placed after {selectedProcedure.name} started.
                      </p>
                      <PermissionGate permission={PERMISSIONS.EMERGENCY_WRITE}>
                        <button
                          type="button"
                          onClick={() =>
                            router.push(`${ROUTES.emergencyMedicationOrders}?entryId=${entry.id}`)
                          }
                          className={`flex h-10 items-center gap-1.5 rounded-[8px] px-3.5 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                          style={{ fontSize: 14, background: '#0D2630' }}
                        >
                          <Plus style={{ width: 15, height: 15 }} />
                          Add Order
                        </button>
                      </PermissionGate>
                    </div>
                    {postOrders.length === 0 ? (
                      <p className="mt-3" style={{ fontSize: 14, color: '#8A98A3' }}>
                        No medication orders placed since this procedure started.
                      </p>
                    ) : (
                      <div className="mt-3 flex flex-col gap-2.5">
                        {postOrders.map((o) => (
                          <div
                            key={o.id}
                            className="flex items-center justify-between gap-2 rounded-[10px] p-3"
                            style={{ background: '#F5FBFD' }}
                          >
                            <div>
                              <p
                                className="font-sans font-medium"
                                style={{ fontSize: 14, color: '#0D2630' }}
                              >
                                {o.medication} — {o.dose} {o.route}
                              </p>
                              <p style={{ fontSize: 14, color: '#8A98A3' }}>
                                {o.priority} · {o.status} · Ordered by {o.orderedBy}
                              </p>
                            </div>
                            <span style={{ fontSize: 14, color: '#8A98A3' }}>
                              {formatTime(o.timeOrdered)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'Notes' && (
                  <div
                    className="rounded-[12px] p-4"
                    style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    <p
                      className="font-display font-semibold"
                      style={{ fontSize: 16, color: '#0D2630' }}
                    >
                      Complications & Notes
                    </p>
                    {selectedProcedure.notes.length === 0 ? (
                      <p className="mt-2.5" style={{ fontSize: 14, color: '#8A98A3' }}>
                        No notes or complications recorded for this procedure yet.
                      </p>
                    ) : (
                      <div className="mt-2.5 flex flex-col gap-2.5">
                        {selectedProcedure.notes.map((n) => (
                          <div
                            key={n.id}
                            className="rounded-[10px] p-3"
                            style={{ background: '#F5FBFD' }}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className="rounded-full px-2 py-0.5 font-sans font-medium"
                                style={{
                                  fontSize: 14,
                                  color: n.type === 'Complication' ? '#DC2626' : '#2563EB',
                                  background:
                                    n.type === 'Complication'
                                      ? 'rgba(220,38,38,0.1)'
                                      : 'rgba(37,99,235,0.1)',
                                }}
                              >
                                {n.type}
                              </span>
                              <span style={{ fontSize: 14, color: '#8A98A3' }}>
                                {formatTime(n.at)}
                              </span>
                            </div>
                            <p className="mt-1.5" style={{ fontSize: 14, color: '#0D2630' }}>
                              {n.text}
                            </p>
                            <p className="mt-1" style={{ fontSize: 14, color: '#8A98A3' }}>
                              By {n.authoredBy}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    <PermissionGate permission={PERMISSIONS.EMERGENCY_WRITE}>
                      <div
                        className="mt-3.5 border-t pt-3.5"
                        style={{ borderColor: 'rgba(0,100,130,0.12)' }}
                      >
                        <div className="flex gap-2">
                          {(['Note', 'Complication'] as ProcedureNoteType[]).map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setNoteType(t)}
                              className={`flex h-9 items-center rounded-[8px] px-3 font-sans font-medium transition-colors duration-150 ${FOCUS_RING}`}
                              style={{
                                fontSize: 14,
                                color: noteType === t ? '#FFFFFF' : '#0D2630',
                                background:
                                  noteType === t
                                    ? t === 'Complication'
                                      ? '#DC2626'
                                      : '#2563EB'
                                    : '#F5FBFD',
                              }}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                        <textarea
                          value={noteText}
                          onChange={(e) =>
                            e.target.value.length <= 500 && setNoteText(e.target.value)
                          }
                          rows={3}
                          placeholder={
                            noteType === 'Complication'
                              ? 'Describe the complication observed...'
                              : 'Add a note about this procedure...'
                          }
                          className={`mt-2.5 w-full resize-none rounded-[10px] p-3 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                          style={{
                            fontSize: 14,
                            border: '1px solid rgba(0,100,130,0.18)',
                            color: '#0D2630',
                          }}
                        />
                        <div className="mt-2 flex items-center justify-between">
                          <span style={{ fontSize: 14, color: '#8A98A3' }}>
                            {noteText.length}/500
                          </span>
                          <button
                            type="button"
                            onClick={handleAddNote}
                            disabled={!noteText.trim()}
                            className={`flex h-10 items-center gap-1.5 rounded-[8px] px-3.5 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
                            style={{ fontSize: 14, background: '#0D2630' }}
                          >
                            <Plus style={{ width: 15, height: 15 }} />
                            Add Entry
                          </button>
                        </div>
                      </div>
                    </PermissionGate>
                  </div>
                )}

                {activeTab === 'Documents' && (
                  <div
                    className="rounded-[12px] p-4"
                    style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    <p
                      className="font-display font-semibold"
                      style={{ fontSize: 16, color: '#0D2630' }}
                    >
                      Documents
                    </p>
                    {selectedProcedure.documents.length === 0 ? (
                      <p className="mt-2.5" style={{ fontSize: 14, color: '#8A98A3' }}>
                        No documents attached to this procedure yet.
                      </p>
                    ) : (
                      <div className="mt-2.5 flex flex-col gap-2">
                        {selectedProcedure.documents.map((d) => (
                          <div
                            key={d.id}
                            className="flex items-center gap-2.5 rounded-[10px] p-3"
                            style={{ background: '#F5FBFD' }}
                          >
                            <FileText
                              style={{ width: 18, height: 18, color: '#00B4D8' }}
                              className="shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <Tooltip content={d.name}>
                                <p
                                  className="truncate font-sans font-medium"
                                  style={{ fontSize: 14, color: '#0D2630' }}
                                >
                                  {d.name}
                                </p>
                              </Tooltip>
                              <p style={{ fontSize: 14, color: '#8A98A3' }}>
                                {d.category} · {d.uploadedBy} · {formatTime(d.uploadedAt)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <PermissionGate permission={PERMISSIONS.EMERGENCY_WRITE}>
                      <div
                        className="mt-3.5 flex flex-wrap items-end gap-2.5 border-t pt-3.5"
                        style={{ borderColor: 'rgba(0,100,130,0.12)' }}
                      >
                        <div className="min-w-[180px] flex-1">
                          <label
                            className="mb-1.5 block font-sans font-medium"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            Document Name
                          </label>
                          <input
                            value={docName}
                            onChange={(e) => setDocName(e.target.value)}
                            placeholder="e.g. Consent Form - Chest Tube"
                            className={`h-10 w-full rounded-[8px] px-3 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                            style={{
                              fontSize: 14,
                              border: '1px solid rgba(0,100,130,0.18)',
                              color: '#0D2630',
                            }}
                          />
                        </div>
                        <div>
                          <label
                            className="mb-1.5 block font-sans font-medium"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            Category
                          </label>
                          <select
                            value={docCategory}
                            onChange={(e) => setDocCategory(e.target.value)}
                            className={`h-10 rounded-[8px] px-3 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                            style={{
                              fontSize: 14,
                              border: '1px solid rgba(0,100,130,0.18)',
                              color: '#0D2630',
                            }}
                          >
                            {['Consent Form', 'Procedure Report', 'Imaging', 'Other'].map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </div>
                        <button
                          type="button"
                          onClick={handleAddDocument}
                          disabled={!docName.trim()}
                          className={`flex h-10 items-center gap-1.5 rounded-[8px] px-3.5 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
                          style={{ fontSize: 14, background: '#0D2630' }}
                        >
                          <FileText style={{ width: 15, height: 15 }} />
                          Attach Document
                        </button>
                      </div>
                    </PermissionGate>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="flex w-full shrink-0 flex-col gap-4">
            <div
              className="rounded-[12px] p-4"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <div className="flex items-center justify-between">
                <p
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Patient Summary
                </p>
                <button
                  type="button"
                  onClick={() => router.push(ROUTES.patients)}
                  className={`font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                  style={{ fontSize: 14, color: '#00B4D8' }}
                >
                  View Full Profile
                </button>
              </div>
              <div className="mt-2.5 flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span style={{ fontSize: 14, color: '#8A98A3' }}>MRN / Age / Sex</span>
                  <span
                    className="font-sans font-medium"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    {entry.mrn} · {entry.age}Y / {entry.gender[0]}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span style={{ fontSize: 14, color: '#8A98A3' }}>Chief Complaint</span>
                  <Tooltip content={triageRecord?.chiefComplaint ?? '—'}>
                    <span
                      className="max-w-[140px] truncate text-right font-sans font-medium"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {triageRecord?.chiefComplaint ?? '—'}
                    </span>
                  </Tooltip>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span style={{ fontSize: 14, color: '#8A98A3' }}>Triage Priority</span>
                  <span
                    className="font-sans font-medium"
                    style={{ fontSize: 14, color: PRIORITY_COLOR[priority] }}
                  >
                    {getTriageDisplay(priority).label}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span style={{ fontSize: 14, color: '#8A98A3' }}>Time in ED</span>
                  <span
                    className="font-sans font-medium"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    {Math.max(
                      0,
                      Math.round((now.getTime() - new Date(entry.arrivalTime).getTime()) / 60_000),
                    )}
                    m
                  </span>
                </div>
              </div>
              <div className="mt-3">
                <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                  Vital Signs (Latest)
                </p>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  {(() => {
                    const vitals = deriveLatestVitals(entry.id);
                    return (
                      <>
                        <div className="rounded-[8px] p-2" style={{ background: '#F5FBFD' }}>
                          <p style={{ fontSize: 14, color: '#8A98A3' }}>BP</p>
                          <p
                            className="font-sans font-semibold"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {vitals.bp} mmHg
                          </p>
                        </div>
                        <div className="rounded-[8px] p-2" style={{ background: '#F5FBFD' }}>
                          <p style={{ fontSize: 14, color: '#8A98A3' }}>HR</p>
                          <p
                            className="font-sans font-semibold"
                            style={{ fontSize: 14, color: '#DC2626' }}
                          >
                            {vitals.hr} bpm
                          </p>
                        </div>
                        <div className="rounded-[8px] p-2" style={{ background: '#F5FBFD' }}>
                          <p style={{ fontSize: 14, color: '#8A98A3' }}>RR</p>
                          <p
                            className="font-sans font-semibold"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {vitals.rr} rpm
                          </p>
                        </div>
                        <div className="rounded-[8px] p-2" style={{ background: '#F5FBFD' }}>
                          <p style={{ fontSize: 14, color: '#8A98A3' }}>SpO₂</p>
                          <p
                            className="font-sans font-semibold"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {vitals.spo2}%
                          </p>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>

            <div
              className="rounded-[12px] p-4"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <div className="flex items-center justify-between">
                <p
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Active Diagnoses
                </p>
                <button
                  type="button"
                  onClick={() => router.push(ROUTES.emergencyClinicalTimeline)}
                  className={`font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                  style={{ fontSize: 14, color: '#00B4D8' }}
                >
                  View All
                </button>
              </div>
              <ul className="mt-2.5 flex flex-col gap-1.5">
                {activeDiagnoses.map((d) => (
                  <li key={d} className="flex items-center gap-1.5">
                    <span className="size-1 rounded-full" style={{ background: '#4A7080' }} />
                    <span style={{ fontSize: 14, color: '#0D2630' }}>{d}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div
              className="rounded-[12px] p-4"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Allergies
              </p>
              <div className="mt-2.5 flex items-center gap-1.5">
                <CheckCircle2 style={{ width: 15, height: 15, color: '#16A34A' }} />
                <span style={{ fontSize: 14, color: '#16A34A' }}>No Known Allergies</span>
              </div>
            </div>

            <div
              className="rounded-[12px] p-4"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Quick Actions
              </p>
              <div className="mt-2.5 grid grid-cols-2 gap-2.5">
                <PermissionGate permission={PERMISSIONS.EMERGENCY_WRITE}>
                  <button
                    type="button"
                    onClick={() =>
                      router.push(`${ROUTES.emergencyClinicalNotes}?entryId=${entry.id}`)
                    }
                    className={`flex h-10 items-center justify-center gap-1.5 rounded-[8px] px-2 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                    style={{
                      fontSize: 14,
                      color: '#0D2630',
                      border: '1px solid rgba(0,100,130,0.2)',
                    }}
                  >
                    <FileText style={{ width: 14, height: 14 }} />
                    Add Clinical Note
                  </button>
                </PermissionGate>
                <PermissionGate permission={PERMISSIONS.EMERGENCY_WRITE}>
                  <button
                    type="button"
                    onClick={() =>
                      router.push(`${ROUTES.emergencyMedicationOrders}?entryId=${entry.id}`)
                    }
                    className={`flex h-10 items-center justify-center gap-1.5 rounded-[8px] px-2 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                    style={{
                      fontSize: 14,
                      color: '#0D2630',
                      border: '1px solid rgba(0,100,130,0.2)',
                    }}
                  >
                    <FlaskConical style={{ width: 14, height: 14 }} />
                    Add Order
                  </button>
                </PermissionGate>
                <button
                  type="button"
                  onClick={() =>
                    router.push(`${ROUTES.emergencyMedicationOrders}?entryId=${entry.id}`)
                  }
                  className={`flex h-10 items-center justify-center gap-1.5 rounded-[8px] px-2 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                  style={{
                    fontSize: 14,
                    color: '#0D2630',
                    border: '1px solid rgba(0,100,130,0.2)',
                  }}
                >
                  <ClipboardList style={{ width: 14, height: 14 }} />
                  View Med Orders
                </button>
                <button
                  type="button"
                  onClick={() => router.push(ROUTES.emergencyDiagnosticRequests)}
                  className={`flex h-10 items-center justify-center gap-1.5 rounded-[8px] px-2 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                  style={{
                    fontSize: 14,
                    color: '#0D2630',
                    border: '1px solid rgba(0,100,130,0.2)',
                  }}
                >
                  <FlaskConical style={{ width: 14, height: 14 }} />
                  Request Lab
                </button>
              </div>
            </div>

            {isHighRisk && (
              <div
                className="rounded-[12px] p-4"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <p
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Alerts
                </p>
                <div
                  className="mt-2.5 flex items-start gap-2 rounded-[10px] p-3"
                  style={{ background: 'rgba(220,38,38,0.06)' }}
                >
                  <AlertTriangle
                    style={{ width: 15, height: 15, color: '#DC2626' }}
                    className="mt-0.5 shrink-0"
                  />
                  <div>
                    <p
                      className="font-sans font-semibold"
                      style={{ fontSize: 14, color: '#DC2626' }}
                    >
                      High Risk Patient
                    </p>
                    <p style={{ fontSize: 14, color: '#4A7080' }}>
                      Monitor closely.{' '}
                      {priority === 'IMMEDIATE'
                        ? 'Possible cardiac event.'
                        : 'Active life-threatening procedure.'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <p className="mt-4 text-center" style={{ fontSize: 14, color: '#8A98A3' }}>
          All times are current. Data updates automatically.
        </p>
      </div>

      {showNewProcedureModal && (
        <NewProcedureModal
          defaultName={newProcedurePrefill?.name}
          defaultType={newProcedurePrefill?.type}
          defaultLocation={location}
          defaultPerformedBy={defaultPerformedBy}
          onClose={() => setShowNewProcedureModal(false)}
          onConfirm={handleLogProcedure}
        />
      )}

      {cancelTargetId &&
        (() => {
          const target = procedures.find((p) => p.id === cancelTargetId);
          if (!target) return null;
          return (
            <CancelProcedureModal
              procedureName={target.name}
              onClose={() => setCancelTargetId(null)}
              onConfirm={(reason) => {
                cancelProcedure(entry.id, target.id, reason);
                toast.success('Procedure cancelled', `${target.name} has been cancelled.`);
                setCancelTargetId(null);
              }}
            />
          );
        })()}
    </main>
  );
}
