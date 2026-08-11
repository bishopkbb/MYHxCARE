'use client';

import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronRight,
  Eye,
  FileText,
  MoreVertical,
  Pill,
  Plus,
  RefreshCw,
  Search,
  Users,
  X,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

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
  deriveConsultationId,
  deriveLatestVitals,
  derivePhoneForEntry,
  derivePriorityForEntry,
  deriveWeightKg,
  DRUG_INTERACTION_PAIRS,
  MEDICATION_CATALOG,
  PENDING_LABS_AFFECTING_MEDICATIONS,
  type MedicationCatalogEntry,
  type MedicationFrequency,
  type MedicationOrderPriority,
  type MedicationRoute,
} from '@/features/emergency/__mocks__/emergencyFixtures';
import { useTriageRecords } from '@/features/emergency/store/triageAssessmentStore';
import {
  addMedicationOrder,
  completeMedicationOrder,
  discontinueMedicationOrder,
  useMedicationOrders,
  useRecentAdministrations,
  type MedicationOrderStatus,
} from '@/features/emergency/store/medicationOrderStore';

const DiscontinueOrderModal = dynamic(
  () => import('./DiscontinueOrderModal').then((m) => m.DiscontinueOrderModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

type PageState = 'loading' | 'loaded' | 'error';
type TabKey = 'Active' | 'Completed' | 'Discontinued' | 'ALL';

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

const ORDER_PRIORITY_CFG: Record<MedicationOrderPriority, { color: string; bg: string }> = {
  STAT: { color: '#DC2626', bg: 'rgba(220,38,38,0.1)' },
  High: { color: '#D97706', bg: 'rgba(217,119,6,0.1)' },
  Routine: { color: '#2563EB', bg: 'rgba(37,99,235,0.1)' },
  Low: { color: '#16A34A', bg: 'rgba(22,163,74,0.1)' },
};

const STATUS_CFG: Record<MedicationOrderStatus, { color: string; bg: string; dot: boolean }> = {
  Active: { color: '#16A34A', bg: 'rgba(22,163,74,0.1)', dot: true },
  Completed: { color: '#2563EB', bg: 'rgba(37,99,235,0.1)', dot: false },
  Discontinued: { color: '#8A98A3', bg: 'rgba(138,152,163,0.12)', dot: false },
};

const ROUTE_OPTIONS: MedicationRoute[] = ['IV', 'IM', 'Oral', 'Subcutaneous', 'Topical', 'Rectal'];
const FREQUENCY_OPTIONS: MedicationFrequency[] = [
  'Once',
  '4 hourly',
  '6 hourly',
  '8 hourly',
  '12 hourly',
  '24 hourly',
  'Continuous',
  'PRN',
];
const PRIORITY_OPTIONS: MedicationOrderPriority[] = ['STAT', 'High', 'Routine', 'Low'];

function OrderPriorityPill({ priority }: { priority: MedicationOrderPriority }) {
  const cfg = ORDER_PRIORITY_CFG[priority];
  return (
    <span
      className="inline-flex items-center rounded-[6px] px-2 py-0.5 font-sans font-semibold whitespace-nowrap"
      style={{ fontSize: 14, color: cfg.color, background: cfg.bg }}
    >
      {priority}
    </span>
  );
}

function StatusPill({ status }: { status: MedicationOrderStatus }) {
  const cfg = STATUS_CFG[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 font-sans font-medium whitespace-nowrap"
      style={{ fontSize: 14, color: cfg.color }}
    >
      {cfg.dot && <span className="size-1.5 rounded-full" style={{ background: cfg.color }} />}
      {status}
    </span>
  );
}

const INPUT_CLASS =
  'h-10 w-full rounded-[8px] px-3 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40';
const INPUT_STYLE = { fontSize: 14, border: '1px solid rgba(0,100,130,0.18)', color: '#0D2630' };

// ── Row menu ─────────────────────────────────────────────────────────────

function OrderRowMenu({
  open,
  onToggle,
  onView,
  onComplete,
  onDiscontinue,
  onOpenChart,
  isActive,
}: {
  open: boolean;
  onToggle: () => void;
  onView: () => void;
  onComplete: () => void;
  onDiscontinue: () => void;
  onOpenChart: () => void;
  isActive: boolean;
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
        {isActive && (
          <PermissionGate permission={PERMISSIONS.EMERGENCY_WRITE}>
            <button
              type="button"
              onClick={onComplete}
              className={`flex w-full items-center gap-2 px-3.5 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
              style={{ fontSize: 14, color: '#0D2630' }}
            >
              <CheckCircle2 style={{ width: 15, height: 15, color: '#4A7080' }} />
              Mark Completed
            </button>
          </PermissionGate>
        )}
        {isActive && (
          <PermissionGate permission={PERMISSIONS.EMERGENCY_WRITE}>
            <button
              type="button"
              onClick={onDiscontinue}
              className={`flex w-full items-center gap-2 px-3.5 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
              style={{ fontSize: 14, color: '#DC2626' }}
            >
              <X style={{ width: 15, height: 15 }} />
              Discontinue Order
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

type FilterKey = 'status' | 'type' | 'route' | 'priority';

export function EmergencyMedicationOrdersWorkspace() {
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const entryId = searchParams.get('entryId');

  const [pageState, setPageState] = useState<PageState>('loading');
  const [now, setNow] = useState(() => new Date());

  const [activeTab, setActiveTab] = useState<TabKey>('Active');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [routeFilter, setRouteFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [openFilter, setOpenFilter] = useState<FilterKey | null>(null);
  const [search, setSearch] = useState('');

  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [openRowMenuId, setOpenRowMenuId] = useState<string | null>(null);
  const [discontinueTargetId, setDiscontinueTargetId] = useState<string | null>(null);

  const [medQuery, setMedQuery] = useState('');
  const [medSuggestOpen, setMedSuggestOpen] = useState(false);
  const [selectedMed, setSelectedMed] = useState<MedicationCatalogEntry | null>(null);
  const [dose, setDose] = useState('');
  const [route, setRoute] = useState<MedicationRoute>('IV');
  const [frequency, setFrequency] = useState<MedicationFrequency>('Once');
  const [orderPriority, setOrderPriority] = useState<MedicationOrderPriority>('Routine');
  const [statDose, setStatDose] = useState(false);
  const [generalNotes, setGeneralNotes] = useState('');

  const filterBarRef = useRef<HTMLDivElement>(null);
  const medInputRef = useRef<HTMLInputElement>(null);

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
      if (medInputRef.current && !medInputRef.current.parentElement?.contains(e.target as Node)) {
        setMedSuggestOpen(false);
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
  const defaultOrderedBy = user?.name ?? attendingPhysician;

  const orders = useMedicationOrders(entry?.id, defaultOrderedBy);
  const recentAdministrations = useRecentAdministrations(entry?.id, defaultOrderedBy);

  function handleRetry() {
    setPageState('loading');
    setTimeout(() => setPageState('loaded'), 800);
  }

  function handleRefresh() {
    setNow(new Date());
    toast.success('Orders refreshed', 'Showing the latest medication orders.');
  }

  const tabCounts: Record<TabKey, number> = {
    Active: orders.filter((o) => o.status === 'Active').length,
    Completed: orders.filter((o) => o.status === 'Completed').length,
    Discontinued: orders.filter((o) => o.status === 'Discontinued').length,
    ALL: orders.length,
  };

  const q = search.trim().toLowerCase();
  const filtered = orders
    .filter((o) => activeTab === 'ALL' || o.status === activeTab)
    .filter((o) => statusFilter === 'ALL' || o.status === statusFilter)
    .filter((o) => typeFilter === 'ALL' || o.type === typeFilter)
    .filter((o) => routeFilter === 'ALL' || o.route === routeFilter)
    .filter((o) => priorityFilter === 'ALL' || o.priority === priorityFilter)
    .filter((o) => !q || o.medication.toLowerCase().includes(q))
    .sort((a, b) => new Date(b.timeOrdered).getTime() - new Date(a.timeOrdered).getTime());

  const hasActiveFilters =
    statusFilter !== 'ALL' ||
    typeFilter !== 'ALL' ||
    routeFilter !== 'ALL' ||
    priorityFilter !== 'ALL' ||
    search.trim() !== '';

  function clearFilters() {
    setStatusFilter('ALL');
    setTypeFilter('ALL');
    setRouteFilter('ALL');
    setPriorityFilter('ALL');
    setSearch('');
  }

  const activeMedNames = new Set(
    orders.filter((o) => o.status === 'Active').map((o) => o.medication),
  );
  const interactionsFound = DRUG_INTERACTION_PAIRS.filter(
    ([a, b]) => activeMedNames.has(a) && activeMedNames.has(b),
  );

  const isHighRisk =
    priority === 'IMMEDIATE' ||
    triageRecord?.manchester.lifeThreatening === true ||
    orders.some((o) => o.status === 'Active' && o.priority === 'STAT');

  const medSuggestions = medQuery.trim()
    ? MEDICATION_CATALOG.filter((m) => m.name.toLowerCase().includes(medQuery.trim().toLowerCase()))
    : MEDICATION_CATALOG;

  function selectMedication(m: MedicationCatalogEntry) {
    setSelectedMed(m);
    setMedQuery(m.name);
    setDose(m.defaultDose);
    setRoute(m.defaultRoute);
    setMedSuggestOpen(false);
  }

  function resetOrderForm() {
    setMedQuery('');
    setSelectedMed(null);
    setDose('');
    setRoute('IV');
    setFrequency('Once');
    setOrderPriority('Routine');
    setStatDose(false);
  }

  function handleAddOrder() {
    if (!entry || !selectedMed || !dose.trim()) return;
    addMedicationOrder({
      entryId: entry.id,
      medication: selectedMed.name,
      type: selectedMed.type,
      dose: dose.trim(),
      route,
      frequency: statDose ? 'Once' : frequency,
      priority: statDose ? 'STAT' : orderPriority,
      orderedBy: defaultOrderedBy,
    });
    toast.success('Order placed', `${selectedMed.name} ${dose.trim()} added to active orders.`);
    resetOrderForm();
  }

  function handleScrollToOrderForm() {
    medInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    medInputRef.current?.focus();
  }

  const discontinueTarget = discontinueTargetId
    ? orders.find((o) => o.id === discontinueTargetId)
    : undefined;

  const FILTER_DEFS: { key: FilterKey; def: FilterDef }[] = [
    {
      key: 'status',
      def: {
        key: 'status',
        defaultLabel: 'All Status',
        options: (['Active', 'Completed', 'Discontinued'] as MedicationOrderStatus[]).map((s) => ({
          value: s,
          label: s,
        })),
      },
    },
    {
      key: 'type',
      def: {
        key: 'type',
        defaultLabel: 'All Types',
        options: Array.from(new Set(MEDICATION_CATALOG.map((m) => m.type))).map((t) => ({
          value: t,
          label: t,
        })),
      },
    },
    {
      key: 'route',
      def: {
        key: 'route',
        defaultLabel: 'All Routes',
        options: ROUTE_OPTIONS.map((r) => ({ value: r, label: r })),
      },
    },
    {
      key: 'priority',
      def: {
        key: 'priority',
        defaultLabel: 'All Priorities',
        options: PRIORITY_OPTIONS.map((p) => ({ value: p, label: p })),
      },
    },
  ];
  const filterValue: Record<string, string> = {
    status: statusFilter,
    type: typeFilter,
    route: routeFilter,
    priority: priorityFilter,
  };
  const filterSetter: Record<string, (v: string) => void> = {
    status: setStatusFilter,
    type: setTypeFilter,
    route: setRouteFilter,
    priority: setPriorityFilter,
  };

  if (pageState === 'error') {
    return (
      <main className="flex flex-1 items-center justify-center" style={{ background: '#F5FBFD' }}>
        <div className="flex flex-col items-center gap-3 px-6 text-center">
          <AlertCircle style={{ width: 40, height: 40, color: '#DC2626' }} />
          <p className="font-display font-semibold" style={{ fontSize: 18, color: '#0D2630' }}>
            Couldn&apos;t load Medication Orders
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
            <Pill style={{ width: 28, height: 28, color: '#8A98A3' }} />
          </div>
          <p className="font-display font-semibold" style={{ fontSize: 18, color: '#0D2630' }}>
            No emergency patients in the queue
          </p>
          <p style={{ fontSize: 14, color: '#4A7080' }}>
            Medication orders need a patient currently in the emergency department.
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
  const consultationId = deriveConsultationId(entry.id);
  const vitals = deriveLatestVitals(entry.id);
  const allergies: Allergy[] = [];

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
            Emergency Medication Orders
          </span>
        </div>

        {/* Header */}
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <Pill style={{ width: 22, height: 22, color: '#DC2626' }} />
            <div>
              <h1 className="font-display font-bold" style={{ fontSize: 24, color: '#0D2630' }}>
                Emergency Medication Orders
              </h1>
              <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
                View, create and manage medication orders for emergency patients.
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
              onClick={() => router.push(ROUTES.nurseMedicationAdministration)}
              className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
              style={{ fontSize: 14, color: '#00B4D8', border: '1px solid #00B4D8' }}
            >
              <CheckCircle2 style={{ width: 15, height: 15 }} />
              Medication Administration (Nursing)
            </button>
            <PermissionGate permission={PERMISSIONS.EMERGENCY_WRITE}>
              <button
                type="button"
                onClick={handleScrollToOrderForm}
                className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                style={{ fontSize: 14, background: '#0D2630' }}
              >
                <Plus style={{ width: 15, height: 15 }} />
                New Medication Order
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
              ED Bay
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
            <p style={{ fontSize: 14, color: '#8A98A3' }}>Weight</p>
            <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
              {weightKg} kg
            </p>
          </div>
          <div>
            <p style={{ fontSize: 14, color: '#8A98A3' }}>Consultation ID</p>
            <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
              {consultationId}
            </p>
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
              { key: 'Active', label: 'Active Orders' },
              { key: 'Completed', label: 'Completed' },
              { key: 'Discontinued', label: 'Discontinued' },
              { key: 'ALL', label: 'All Orders' },
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
              placeholder="Search medication..."
              className={`h-11 w-full rounded-[10px] py-2 pr-3.5 pl-10 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
              style={{ fontSize: 14, border: '1px solid rgba(0,100,130,0.18)', color: '#0D2630' }}
            />
          </div>
        </div>

        {/* Main grid */}
        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_320px] xl:items-start">
          <div className="min-w-0">
            <div
              className="rounded-[12px]"
              style={{ border: '1px solid rgba(0,100,130,0.12)', background: '#FFFFFF' }}
            >
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
                  <div
                    className="flex size-14 items-center justify-center rounded-full"
                    style={{ background: 'rgba(226,237,241,0.6)' }}
                  >
                    <Pill style={{ width: 28, height: 28, color: '#8A98A3' }} />
                  </div>
                  <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                    No orders in this view
                  </p>
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>
                    {hasActiveFilters
                      ? 'Try a different search term or filter combination.'
                      : 'Use "New Medication Order" to place one.'}
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
                        ['Medication', 'min-w-[160px] flex-1'],
                        ['Dose & Route', 'w-32'],
                        ['Frequency', 'w-28'],
                        ['Ordered By', 'w-32'],
                        ['Priority', 'w-24'],
                        ['Status', 'w-32'],
                        ['Time Ordered', 'w-32'],
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
                    {filtered.map((order, i) => (
                      <div key={order.id}>
                        <div
                          className="flex cursor-pointer items-center transition-colors duration-150 hover:bg-[#F5FBFD]"
                          onClick={() =>
                            setExpandedOrderId((p) => (p === order.id ? null : order.id))
                          }
                          style={{
                            borderBottom:
                              expandedOrderId === order.id
                                ? 'none'
                                : '1px solid rgba(0,100,130,0.08)',
                          }}
                        >
                          <div className="w-10 shrink-0 px-2 py-3 text-center">
                            <p style={{ fontSize: 14, color: '#8A98A3' }}>{i + 1}</p>
                          </div>
                          <div className="min-w-[160px] flex-1 px-2 py-3 text-center">
                            <p
                              className="font-sans font-semibold"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {order.medication}
                            </p>
                            <p style={{ fontSize: 14, color: '#8A98A3' }}>{order.type}</p>
                          </div>
                          <div className="w-32 shrink-0 px-2 py-3 text-center">
                            <p style={{ fontSize: 14, color: '#4A7080' }}>
                              {order.dose} {order.route}
                            </p>
                          </div>
                          <div className="w-28 shrink-0 px-2 py-3 text-center">
                            <p style={{ fontSize: 14, color: '#4A7080' }}>{order.frequency}</p>
                          </div>
                          <div className="w-32 shrink-0 px-2 py-3 text-center">
                            <Tooltip content={order.orderedBy}>
                              <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                                {order.orderedBy}
                              </p>
                            </Tooltip>
                          </div>
                          <div className="w-24 shrink-0 px-2 py-3 text-center">
                            <OrderPriorityPill priority={order.priority} />
                          </div>
                          <div className="w-32 shrink-0 px-2 py-3 text-center">
                            <StatusPill status={order.status} />
                          </div>
                          <div className="w-32 shrink-0 px-2 py-3 text-center">
                            <p style={{ fontSize: 14, color: '#4A7080' }}>
                              {formatTime(order.timeOrdered)}
                            </p>
                            <p style={{ fontSize: 14, color: '#8A98A3' }}>
                              {formatHumanDate(order.timeOrdered)}
                            </p>
                          </div>
                          <div
                            className="flex w-24 shrink-0 items-center justify-center gap-1 px-2 py-3"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedOrderId((p) => (p === order.id ? null : order.id))
                              }
                              aria-label="View details"
                              className={`flex size-9 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                            >
                              <Eye style={{ width: 16, height: 16, color: '#4A7080' }} />
                            </button>
                            <OrderRowMenu
                              open={openRowMenuId === order.id}
                              onToggle={() =>
                                setOpenRowMenuId((prev) => (prev === order.id ? null : order.id))
                              }
                              isActive={order.status === 'Active'}
                              onView={() => {
                                setExpandedOrderId(order.id);
                                setOpenRowMenuId(null);
                              }}
                              onComplete={() => {
                                completeMedicationOrder(entry.id, order.id);
                                setOpenRowMenuId(null);
                                toast.success(
                                  'Order completed',
                                  `${order.medication} marked completed.`,
                                );
                              }}
                              onDiscontinue={() => {
                                setOpenRowMenuId(null);
                                setDiscontinueTargetId(order.id);
                              }}
                              onOpenChart={() => {
                                setOpenRowMenuId(null);
                                router.push(ROUTES.patients);
                              }}
                            />
                          </div>
                        </div>
                        {expandedOrderId === order.id && (
                          <div
                            className="px-6 py-3"
                            style={{
                              background: '#F5FBFD',
                              borderBottom: '1px solid rgba(0,100,130,0.08)',
                            }}
                          >
                            <p style={{ fontSize: 14, color: '#4A7080' }}>
                              {order.medication} {order.dose} {order.route}, {order.frequency} —
                              ordered by {order.orderedBy} at {formatTime(order.timeOrdered)}.
                            </p>
                            {order.status === 'Discontinued' && order.discontinuedReason && (
                              <p className="mt-1" style={{ fontSize: 14, color: '#DC2626' }}>
                                Discontinued{' '}
                                {order.discontinuedAt && formatTime(order.discontinuedAt)}:{' '}
                                {order.discontinuedReason}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </ScrollableTable>
                  <p className="px-4 py-3" style={{ fontSize: 14, color: '#8A98A3' }}>
                    Showing 1 to {filtered.length} of {filtered.length}{' '}
                    {activeTab === 'Active' ? 'active ' : ''}orders
                  </p>
                </>
              )}
            </div>

            {/* Priority Legend */}
            <div
              className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-[12px] p-4"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
                Priority Legend
              </p>
              {(
                [
                  { p: 'STAT', desc: 'Immediate, life threatening' },
                  { p: 'High', desc: 'Urgent, needs prompt attention' },
                  { p: 'Routine', desc: 'Standard priority' },
                  { p: 'Low', desc: 'Non-urgent' },
                ] as { p: MedicationOrderPriority; desc: string }[]
              ).map(({ p, desc }) => (
                <div key={p} className="flex items-center gap-2">
                  <OrderPriorityPill priority={p} />
                  <span style={{ fontSize: 14, color: '#4A7080' }}>{desc}</span>
                </div>
              ))}
            </div>

            {/* Bottom row */}
            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div
                className="rounded-[12px] p-4"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <div className="flex items-center justify-between">
                  <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
                    Pending Lab Results Affecting Medications
                  </p>
                  <button
                    type="button"
                    onClick={() => router.push(ROUTES.emergencyResultsReview)}
                    className={`shrink-0 font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                    style={{ fontSize: 14, color: '#00B4D8' }}
                  >
                    View Results
                  </button>
                </div>
                <ul className="mt-2.5 flex flex-col gap-1.5">
                  {PENDING_LABS_AFFECTING_MEDICATIONS.map((lab) => (
                    <li key={lab} className="flex items-center justify-between gap-2">
                      <span
                        className="flex items-center gap-1.5"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        <span className="size-1 rounded-full" style={{ background: '#4A7080' }} />
                        {lab}
                      </span>
                      <span style={{ fontSize: 14, color: '#D97706' }}>Pending</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div
                className="rounded-[12px] p-4"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
                  Drug Interactions (Active Orders)
                </p>
                {interactionsFound.length === 0 ? (
                  <div
                    className="mt-2.5 flex items-center gap-2 rounded-[10px] p-3"
                    style={{ background: 'rgba(22,163,74,0.06)' }}
                  >
                    <Check style={{ width: 15, height: 15, color: '#16A34A' }} />
                    <span style={{ fontSize: 14, color: '#16A34A' }}>
                      No significant drug interactions found.
                    </span>
                  </div>
                ) : (
                  <div className="mt-2.5 flex flex-col gap-2">
                    {interactionsFound.map(([a, b, warning]) => (
                      <div
                        key={`${a}-${b}`}
                        className="flex items-start gap-2 rounded-[10px] p-3"
                        style={{ background: 'rgba(220,38,38,0.06)' }}
                      >
                        <AlertTriangle
                          style={{ width: 15, height: 15, color: '#DC2626' }}
                          className="mt-0.5 shrink-0"
                        />
                        <div>
                          <p
                            className="font-sans font-medium"
                            style={{ fontSize: 14, color: '#DC2626' }}
                          >
                            {a} + {b}
                          </p>
                          <p style={{ fontSize: 14, color: '#4A7080' }}>{warning}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div
                className="rounded-[12px] p-4"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
                  Notes (Optional)
                </p>
                <textarea
                  value={generalNotes}
                  onChange={(e) => e.target.value.length <= 500 && setGeneralNotes(e.target.value)}
                  rows={3}
                  placeholder="Add notes about medication orders..."
                  className={`mt-2.5 w-full resize-none rounded-[10px] p-3 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                  style={{
                    fontSize: 14,
                    border: '1px solid rgba(0,100,130,0.18)',
                    color: '#0D2630',
                  }}
                />
                <p className="mt-1 text-right" style={{ fontSize: 14, color: '#8A98A3' }}>
                  {generalNotes.length}/500
                </p>
              </div>
            </div>
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
                </div>
              </div>
            </div>

            <div
              className="rounded-[12px] p-4"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                New Medication Order
              </p>
              <div className="mt-2.5">
                <label
                  className="mb-1.5 block font-sans font-medium"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  Medication
                </label>
                <div className="relative">
                  <input
                    ref={medInputRef}
                    value={medQuery}
                    onChange={(e) => {
                      setMedQuery(e.target.value);
                      setSelectedMed(null);
                      setMedSuggestOpen(true);
                    }}
                    onFocus={() => setMedSuggestOpen(true)}
                    placeholder="Search medication..."
                    className={INPUT_CLASS}
                    style={{ ...INPUT_STYLE, paddingRight: 32 }}
                  />
                  <Search
                    style={{
                      width: 14,
                      height: 14,
                      color: '#8A98A3',
                      position: 'absolute',
                      right: 10,
                      top: '50%',
                      transform: 'translateY(-50%)',
                    }}
                  />
                  {medSuggestOpen && medSuggestions.length > 0 && (
                    <div
                      className="animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 absolute top-full left-0 z-20 mt-1 max-h-[220px] w-full overflow-y-auto rounded-[10px] bg-white py-1.5 duration-150"
                      style={{
                        border: '1px solid rgba(0,100,130,0.12)',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                      }}
                    >
                      {medSuggestions.map((m) => (
                        <button
                          key={m.name}
                          type="button"
                          onClick={() => selectMedication(m)}
                          className={`flex w-full items-center justify-between px-3.5 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {m.name}
                          <span style={{ fontSize: 14, color: '#8A98A3' }}>{m.type}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-2.5 grid grid-cols-2 gap-2.5">
                <div>
                  <label
                    className="mb-1.5 block font-sans font-medium"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    Dose
                  </label>
                  <input
                    value={dose}
                    onChange={(e) => setDose(e.target.value)}
                    placeholder="e.g. 500 mg"
                    className={INPUT_CLASS}
                    style={INPUT_STYLE}
                  />
                </div>
                <div>
                  <label
                    className="mb-1.5 block font-sans font-medium"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    Route
                  </label>
                  <select
                    value={route}
                    onChange={(e) => setRoute(e.target.value as MedicationRoute)}
                    className={INPUT_CLASS}
                    style={INPUT_STYLE}
                  >
                    {ROUTE_OPTIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-2.5">
                <label
                  className="mb-1.5 block font-sans font-medium"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  Frequency
                </label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as MedicationFrequency)}
                  disabled={statDose}
                  className={INPUT_CLASS}
                  style={{ ...INPUT_STYLE, opacity: statDose ? 0.6 : 1 }}
                >
                  {FREQUENCY_OPTIONS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-2.5">
                <label
                  className="mb-1.5 block font-sans font-medium"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  Priority
                </label>
                <select
                  value={statDose ? 'STAT' : orderPriority}
                  onChange={(e) => setOrderPriority(e.target.value as MedicationOrderPriority)}
                  disabled={statDose}
                  className={INPUT_CLASS}
                  style={{ ...INPUT_STYLE, opacity: statDose ? 0.6 : 1 }}
                >
                  {PRIORITY_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <label
                className="mt-2.5 flex items-center gap-2"
                style={{ fontSize: 14, color: '#0D2630' }}
              >
                <input
                  type="checkbox"
                  checked={statDose}
                  onChange={(e) => setStatDose(e.target.checked)}
                  className={`size-4 ${FOCUS_RING}`}
                />
                STAT / One Time Dose
              </label>

              <PermissionGate permission={PERMISSIONS.EMERGENCY_WRITE}>
                <button
                  type="button"
                  onClick={handleAddOrder}
                  disabled={!selectedMed || !dose.trim()}
                  className={`mt-3 flex h-11 w-full items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
                  style={{ fontSize: 14, background: '#0D2630' }}
                >
                  <Plus style={{ width: 15, height: 15 }} />
                  Add Order
                </button>
              </PermissionGate>
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
                  Active Alerts
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
                        : 'STAT medication active.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div
              className="rounded-[12px] p-4"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <div className="flex items-center justify-between">
                <p
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Recent Administration (By Nursing)
                </p>
                <button
                  type="button"
                  onClick={() => router.push(ROUTES.nurseMedicationAdministration)}
                  className={`shrink-0 font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                  style={{ fontSize: 14, color: '#00B4D8' }}
                >
                  View All
                </button>
              </div>
              {recentAdministrations.length === 0 ? (
                <p className="mt-2.5" style={{ fontSize: 14, color: '#8A98A3' }}>
                  No administrations recorded yet.
                </p>
              ) : (
                <div className="mt-2.5 flex flex-col gap-2.5">
                  {recentAdministrations.map((a) => (
                    <div key={a.id} className="flex items-start justify-between gap-2">
                      <div>
                        <p
                          className="font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {a.medication}
                        </p>
                        <p style={{ fontSize: 14, color: '#8A98A3' }}>
                          {a.dose} · By: {a.administeredBy}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span style={{ fontSize: 14, color: '#8A98A3' }}>{formatTime(a.time)}</span>
                        <span
                          className="rounded-full px-2 py-0.5 font-sans font-medium"
                          style={{
                            fontSize: 14,
                            color: '#16A34A',
                            background: 'rgba(22,163,74,0.1)',
                          }}
                        >
                          Administered
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <p className="mt-4 text-center" style={{ fontSize: 14, color: '#8A98A3' }}>
          All times are current. Data updates automatically.
        </p>
      </div>

      {discontinueTarget && (
        <DiscontinueOrderModal
          medication={discontinueTarget.medication}
          dose={discontinueTarget.dose}
          onClose={() => setDiscontinueTargetId(null)}
          onConfirm={(reason) => {
            discontinueMedicationOrder(entry.id, discontinueTarget.id, reason);
            toast.success(
              'Order discontinued',
              `${discontinueTarget.medication} has been discontinued.`,
            );
            setDiscontinueTargetId(null);
          }}
        />
      )}
    </main>
  );
}
