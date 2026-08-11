'use client';

import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Baby,
  Bed,
  BedDouble,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Droplet,
  Eye,
  Plug,
  RefreshCw,
  ShieldAlert,
  Syringe,
  Users,
  Wind,
  X,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { FilterDropdown, type FilterDef } from '@components/shared/FilterDropdown';
import { PermissionGate } from '@components/shared/PermissionGate';
import { StatCard } from '@components/shared/StatCard';
import { Tooltip } from '@components/shared/Tooltip';
import { PERMISSIONS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { formatHumanDate, formatTime } from '@/utils/datetime';
import { getTriageDisplay, triageSortWeight, type TriagePriority } from '@/utils/triage';
import { useQueueEntries } from '@/features/registration/store/registrationQueueStore';
import type { QueueEntry } from '@/features/registration/__mocks__/queueFixtures';
import {
  deriveComplaintForEntry,
  derivePriorityForEntry,
  EMERGENCY_BEDS,
  ISOLATION_BEDS_TOTAL,
  recommendedBedType,
  TOTAL_BEDS,
  ZONE_TRANSFER_MINUTES,
  ZONES,
  type BedEquipment,
  type BedType,
} from '@/features/emergency/__mocks__/emergencyFixtures';
import { useTriageRecords } from '@/features/emergency/store/triageAssessmentStore';
import {
  confirmBedAssignment,
  holdBed,
  useBedOverrides,
  useRecentBedAssignments,
} from '@/features/emergency/store/bedAssignmentStore';

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
  IMMEDIATE: 'rgba(220,38,38,0.06)',
  URGENT: 'rgba(217,119,6,0.06)',
  LESS_URGENT: 'rgba(245,158,11,0.06)',
  NON_URGENT: 'rgba(22,163,74,0.06)',
};
const PRIORITY_BORDER: Record<TriagePriority, string> = {
  IMMEDIATE: 'rgba(220,38,38,0.3)',
  URGENT: 'rgba(217,119,6,0.3)',
  LESS_URGENT: 'rgba(245,158,11,0.3)',
  NON_URGENT: 'rgba(22,163,74,0.3)',
};

// ── Bed type / equipment iconography ───────────────────────────────────

const BED_TYPE_ICON: Record<BedType, LucideIcon> = {
  'Resus Bed': BedDouble,
  'Treatment Bed': Bed,
  'Pediatric Bed': Baby,
  'Isolation Bed': ShieldAlert,
  'Observation Bed': Eye,
};

const BED_TYPE_DESC: Record<BedType, string> = {
  'Resus Bed': 'For critical / unstable patients',
  'Treatment Bed': 'For general emergency care',
  'Pediatric Bed': 'For pediatric patients',
  'Isolation Bed': 'For infectious conditions',
  'Observation Bed': 'For short-term observation',
};

const ASSIGNABLE_BED_TYPES: BedType[] = [
  'Resus Bed',
  'Treatment Bed',
  'Pediatric Bed',
  'Isolation Bed',
];

const EQUIPMENT_ICON: Record<BedEquipment, LucideIcon> = {
  'Cardiac Monitor': Activity,
  'Oxygen Outlet': Wind,
  Defibrillator: Zap,
  Suction: Droplet,
  'Power Outlet': Plug,
  'IV Stand': Syringe,
};

const SPECIAL_REQUIREMENT_OPTIONS = [
  'Cardiac Monitor',
  'Oxygen',
  'Isolation Precautions',
  'Pediatric Equipment',
  'Trauma Kit',
] as const;

function EquipmentIcons({ equipment }: { equipment: BedEquipment[] }) {
  return (
    <div className="flex items-center justify-center gap-1.5">
      {equipment.map((eq) => {
        const Icon = EQUIPMENT_ICON[eq];
        return (
          <Tooltip key={eq} content={eq}>
            <span
              className="flex size-6 items-center justify-center rounded-[6px]"
              style={{ background: '#F5FBFD' }}
            >
              <Icon style={{ width: 13, height: 13, color: '#4A7080' }} />
            </span>
          </Tooltip>
        );
      })}
    </div>
  );
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
          aria-hidden="true"
        />
      )}
      {display.label}
    </span>
  );
}

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <label className="mb-1.5 block font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
    {children}
  </label>
);

const INPUT_CLASS =
  'h-11 w-full rounded-[10px] px-3.5 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40';
const INPUT_STYLE = { fontSize: 14, border: '1px solid rgba(0,100,130,0.18)', color: '#0D2630' };

// ── Page ────────────────────────────────────────────────────────────────

type FilterKey = 'type' | 'zone';

export function BedAssignmentWorkspace() {
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();

  // Reactive, unlike a mount-only `window.location.search` read — see the
  // same comment in TriageAssessmentWorkspace for why this matters here too.
  const searchParams = useSearchParams();
  const entryId = searchParams.get('entryId');

  const [pageState, setPageState] = useState<PageState>('loading');
  const [now, setNow] = useState(() => new Date());

  const [selectedBedId, setSelectedBedId] = useState<string | null>(null);
  const [requirementBedType, setRequirementBedType] = useState<BedType>('Treatment Bed');
  const [specialRequirements, setSpecialRequirements] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  const [tableTypeFilter, setTableTypeFilter] = useState<BedType | 'ALL'>('ALL');
  const [tableZoneFilter, setTableZoneFilter] = useState<string>('ALL');
  const [openFilter, setOpenFilter] = useState<FilterKey | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const allEntries = useQueueEntries();
  const triageRecords = useTriageRecords();
  const bedOverrides = useBedOverrides();
  const recentAssignments = useRecentBedAssignments();

  useEffect(() => {
    const t = setTimeout(() => setPageState('loaded'), 800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const emergencyEntries = useMemo(() => allEntries.filter((e) => e.isEmergency), [allEntries]);

  const bedAssignedEntryIds = useMemo(() => {
    const ids = new Set<string>();
    for (const o of bedOverrides.values()) {
      if (o.status === 'Occupied' && o.entryId) ids.add(o.entryId);
    }
    return ids;
  }, [bedOverrides]);

  // An explicit ?entryId= always resolves that patient. Otherwise, default to
  // the most urgent triaged patient who doesn't have a confirmed bed yet —
  // sorted by triage priority, not queue insertion order, so an Immediate
  // patient triaged after a Non-Urgent one still gets bedded first.
  const entry: QueueEntry | undefined = entryId
    ? emergencyEntries.find((e) => e.id === entryId)
    : emergencyEntries
        .filter((e) => triageRecords.has(e.id) && !bedAssignedEntryIds.has(e.id))
        .sort(
          (a, b) =>
            triageSortWeight(triageRecords.get(a.id)!.priority) -
            triageSortWeight(triageRecords.get(b.id)!.priority),
        )[0];

  const triageRecord = entry ? triageRecords.get(entry.id) : undefined;
  const priority: TriagePriority =
    triageRecord?.priority ?? (entry ? derivePriorityForEntry(entry.id) : 'NON_URGENT');
  const complaint =
    triageRecord?.chiefComplaint ?? (entry ? deriveComplaintForEntry(entry.id) : '');
  const assignedDoctorName = triageRecord?.assignedDoctorName ?? entry?.attendingDoctor ?? '—';
  const lifeThreatening = triageRecord?.manchester.lifeThreatening === true;

  const entryIdForPrefill = entry?.id;

  // Reset the bed-selection form and pre-fill the recommended bed type /
  // special requirements every time the patient actually changes — not just
  // on first mount. Without this, confirming a bed for one patient and then
  // clicking "Bed Assignment" in the sidebar again (same route, no remount)
  // would leave the previous patient's selection and filters in place even
  // though the screen has moved on to a new patient.
  useEffect(() => {
    if (!entryIdForPrefill) return;
    const t = setTimeout(() => {
      setSelectedBedId(null);
      setTableZoneFilter('ALL');
      setNotes('');
      const rec = triageRecords.get(entryIdForPrefill);
      const recPriority = rec?.priority ?? derivePriorityForEntry(entryIdForPrefill);
      const recommended = recommendedBedType(recPriority);
      setRequirementBedType(recommended);
      setTableTypeFilter(recommended);
      const defaults: string[] = [];
      if (rec?.manchester.lifeThreatening || rec?.manchester.shock)
        defaults.push('Cardiac Monitor');
      if (rec?.manchester.abnormalBreathing || rec?.manchester.spo2Low) defaults.push('Oxygen');
      setSpecialRequirements(defaults);
    }, 0);
    return () => clearTimeout(t);
    // Deliberately re-runs only when the patient changes, not on every
    // triageRecords update — otherwise triaging a different patient in
    // another tab would silently wipe this patient's in-progress selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryIdForPrefill]);

  function handleRetry() {
    setPageState('loading');
    setTimeout(() => setPageState('loaded'), 800);
  }

  function handleRefresh() {
    setNow(new Date());
    toast.success('Bed board refreshed', 'Showing the latest bed status.');
  }

  const effectiveBeds = EMERGENCY_BEDS.map((b) => {
    const override = bedOverrides.get(b.id);
    return {
      ...b,
      status: override?.status ?? b.baseStatus,
      occupantName: override?.patientName ?? b.occupantName,
    };
  });

  const availableCount = effectiveBeds.filter((b) => b.status === 'Available').length;
  const occupiedCount = effectiveBeds.filter((b) => b.status === 'Occupied').length;
  const cleaningCount = effectiveBeds.filter((b) => b.status === 'Cleaning').length;
  const reservedCount = effectiveBeds.filter((b) => b.status === 'Reserved').length;
  const isolationBeds = effectiveBeds.filter((b) => b.type === 'Isolation Bed');
  const isolationAvailable = isolationBeds.filter((b) => b.status === 'Available').length;
  const isolationOccupied = isolationBeds.filter((b) => b.status === 'Occupied').length;

  const availableRows = effectiveBeds
    .filter((b) => b.status === 'Available')
    .filter((b) => ASSIGNABLE_BED_TYPES.includes(b.type))
    .filter((b) => tableTypeFilter === 'ALL' || b.type === tableTypeFilter)
    .filter((b) => tableZoneFilter === 'ALL' || b.zone === tableZoneFilter);

  const selectedBed = selectedBedId ? effectiveBeds.find((b) => b.id === selectedBedId) : undefined;

  function toggleRequirement(req: string) {
    setSpecialRequirements((prev) =>
      prev.includes(req) ? prev.filter((r) => r !== req) : [...prev, req],
    );
  }

  function resetSelection() {
    setSelectedBedId(null);
  }

  function handleConfirm() {
    if (!entry || !selectedBed) return;
    setIsSubmitting(true);
    setTimeout(() => {
      confirmBedAssignment({
        bedId: selectedBed.id,
        entryId: entry.id,
        patientName: entry.patientName,
        assignedByName: user?.name ?? assignedDoctorName,
      });
      setIsSubmitting(false);
      setSelectedBedId(null);
      toast.success('Bed assigned', `${entry.patientName} has been assigned to ${selectedBed.id}.`);
    }, 500);
  }

  function handleHold() {
    if (!entry || !selectedBed) return;
    holdBed({
      bedId: selectedBed.id,
      entryId: entry.id,
      patientName: entry.patientName,
      assignedByName: user?.name ?? assignedDoctorName,
      minutes: 5,
    });
    setSelectedBedId(null);
    toast.info('Bed held', `${selectedBed.id} is held for ${entry.patientName} for 5 minutes.`);
  }

  const FILTER_DEFS: { key: FilterKey; def: FilterDef }[] = [
    {
      key: 'type',
      def: {
        key: 'type',
        defaultLabel: 'All Bed Types',
        options: ASSIGNABLE_BED_TYPES.map((t) => ({ value: t, label: t })),
      },
    },
    {
      key: 'zone',
      def: {
        key: 'zone',
        defaultLabel: 'All Zones',
        options: ZONES.map((z) => ({ value: z, label: z })),
      },
    },
  ];
  const filterValue: Record<string, string> = { type: tableTypeFilter, zone: tableZoneFilter };
  const filterSetter: Record<string, (v: string) => void> = {
    type: (v) => setTableTypeFilter(v as BedType | 'ALL'),
    zone: (v) => setTableZoneFilter(v),
  };

  if (pageState === 'loading') {
    return (
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto max-w-[1200px] px-4 py-4 sm:px-6 sm:py-5">
          <div className="h-4 w-72 animate-pulse rounded bg-slate-200" />
          <div className="mt-3 h-8 w-64 animate-pulse rounded bg-slate-200" />
          <div className="mt-6 h-64 animate-pulse rounded-[12px] bg-slate-100" />
        </div>
      </main>
    );
  }

  if (pageState === 'error') {
    return (
      <main className="flex flex-1 items-center justify-center" style={{ background: '#F5FBFD' }}>
        <div className="flex flex-col items-center gap-3 px-6 text-center">
          <AlertCircle style={{ width: 40, height: 40, color: '#DC2626' }} />
          <p className="font-display font-semibold" style={{ fontSize: 18, color: '#0D2630' }}>
            Couldn&apos;t load Bed Assignment
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

  if (!entry) {
    const untriagedCount = emergencyEntries.filter((e) => !triageRecords.has(e.id)).length;
    const allBedded = emergencyEntries.length > 0 && untriagedCount === 0;
    return (
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto flex max-w-[1200px] flex-col items-center gap-3 px-4 py-24 text-center sm:px-6">
          <div
            className="flex size-14 items-center justify-center rounded-full"
            style={{ background: 'rgba(226,237,241,0.6)' }}
          >
            <Bed style={{ width: 28, height: 28, color: '#8A98A3' }} />
          </div>
          <p className="font-display font-semibold" style={{ fontSize: 18, color: '#0D2630' }}>
            {allBedded
              ? 'Every triaged patient has a bed'
              : 'No patients waiting for bed assignment'}
          </p>
          <p style={{ fontSize: 14, color: '#4A7080' }}>
            {allBedded
              ? 'All currently triaged emergency patients already have a bed assigned.'
              : untriagedCount > 0
                ? `${untriagedCount} patient${untriagedCount === 1 ? '' : 's'} still need${untriagedCount === 1 ? 's' : ''} to be triaged before a bed can be assigned.`
                : 'There are no emergency patients in the queue right now.'}
          </p>
          <button
            type="button"
            onClick={() =>
              router.push(
                untriagedCount > 0 && !allBedded
                  ? ROUTES.emergencyTriageAssessment
                  : ROUTES.emergencyPatientQueue,
              )
            }
            className={`mt-1 flex h-11 items-center gap-2 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
            style={{ fontSize: 14, background: '#00B4D8' }}
          >
            {untriagedCount > 0 && !allBedded ? 'Go to Triage Assessment' : 'Go to Patient Queue'}
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
            Bed Assignment
          </span>
        </div>

        {/* Header */}
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display font-bold" style={{ fontSize: 24, color: '#0D2630' }}>
              Bed Assignment
            </h1>
            <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
              Assign an appropriate bed to the patient based on priority, clinical need and bed
              availability.
            </p>
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
          <StatCard
            icon={Bed}
            label="Total Beds"
            value={TOTAL_BEDS}
            info="All bed types"
            accent="#00B4D8"
            iconBg="rgba(0,180,216,0.1)"
          />
          <StatCard
            icon={BedDouble}
            label="Available Beds"
            value={`${availableCount} (${Math.round((availableCount / TOTAL_BEDS) * 100)}%)`}
            info="Ready for assignment"
            accent="#16A34A"
            iconBg="rgba(22,163,74,0.1)"
          />
          <StatCard
            icon={Users}
            label="Occupied Beds"
            value={`${occupiedCount} (${Math.round((occupiedCount / TOTAL_BEDS) * 100)}%)`}
            info="Currently in use"
            accent="#00B4D8"
            iconBg="rgba(0,180,216,0.1)"
          />
          <StatCard
            icon={RefreshCw}
            label="Cleaning"
            value={`${cleaningCount} (${Math.round((cleaningCount / TOTAL_BEDS) * 100)}%)`}
            info="Being cleaned"
            accent="#D97706"
            iconBg="rgba(217,119,6,0.1)"
          />
          <StatCard
            icon={Clock}
            label="Reserved"
            value={`${reservedCount} (${Math.round((reservedCount / TOTAL_BEDS) * 100)}%)`}
            info="Reserved for admission"
            accent="#7C3AED"
            iconBg="rgba(124,58,237,0.1)"
          />
          <StatCard
            icon={ShieldAlert}
            label="Isolation Beds"
            value={ISOLATION_BEDS_TOTAL}
            info={`${isolationAvailable} Available · ${isolationOccupied} Occupied`}
            accent="#DC2626"
            iconBg="rgba(220,38,38,0.1)"
          />
        </div>

        {/* Main grid */}
        <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[300px_1fr_300px] xl:items-start">
          {/* 1. Patient to Assign + 2. Bed Requirements */}
          <div className="flex flex-col gap-4">
            <div
              className="rounded-[12px] p-4"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                1. Patient to Assign
              </p>
              <div className="mt-3 flex items-center gap-3">
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
                <div className="min-w-0">
                  <Tooltip content={entry.patientName}>
                    <p
                      className="truncate font-sans font-semibold"
                      style={{ fontSize: 15, color: '#0D2630' }}
                    >
                      {entry.patientName}
                    </p>
                  </Tooltip>
                </div>
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <PriorityPill priority={priority} />
                {triageRecord && (
                  <span
                    className="rounded-full px-2 py-0.5 font-sans font-medium"
                    style={{ fontSize: 14, color: '#4A7080', background: '#F5FBFD' }}
                  >
                    Triage Time: {formatTime(triageRecord.completedAt)}
                  </span>
                )}
              </div>

              <div className="mt-3 flex flex-col gap-1.5" style={{ fontSize: 14 }}>
                <div className="flex items-center justify-between gap-2">
                  <span style={{ color: '#8A98A3' }}>MRN</span>
                  <span className="font-sans font-medium" style={{ color: '#0D2630' }}>
                    {entry.mrn}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span style={{ color: '#8A98A3' }}>Age / Sex</span>
                  <span className="font-sans font-medium" style={{ color: '#0D2630' }}>
                    {entry.age} Years / {entry.gender}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span style={{ color: '#8A98A3' }}>Chief Complaint</span>
                  <Tooltip content={complaint}>
                    <span
                      className="max-w-[160px] truncate text-right font-sans font-medium"
                      style={{ color: '#0D2630' }}
                    >
                      {complaint}
                    </span>
                  </Tooltip>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span style={{ color: '#8A98A3' }}>Arrival Time</span>
                  <span className="font-sans font-medium" style={{ color: '#0D2630' }}>
                    {formatHumanDate(entry.arrivalTime)}, {formatTime(entry.arrivalTime)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span style={{ color: '#8A98A3' }}>Triage Priority</span>
                  <span
                    className="font-sans font-medium"
                    style={{ color: PRIORITY_COLOR[priority] }}
                  >
                    {getTriageDisplay(priority).label}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span style={{ color: '#8A98A3' }}>Assigned To</span>
                  <Tooltip content={assignedDoctorName}>
                    <span
                      className="max-w-[160px] truncate text-right font-sans font-medium"
                      style={{ color: '#0D2630' }}
                    >
                      {assignedDoctorName}
                    </span>
                  </Tooltip>
                </div>
              </div>

              {lifeThreatening && (
                <p
                  className="mt-3 flex items-start gap-1.5 rounded-[10px] p-3"
                  style={{ fontSize: 14, color: '#DC2626', background: 'rgba(220,38,38,0.06)' }}
                >
                  <AlertTriangle style={{ width: 14, height: 14 }} className="mt-0.5 shrink-0" />
                  Life threatening condition identified. Immediate bed assignment required.
                </p>
              )}
            </div>

            <div
              className="rounded-[12px] p-4"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                2. Bed Requirements
              </p>
              <div className="mt-3">
                <FieldLabel>Bed Type</FieldLabel>
                <select
                  value={requirementBedType}
                  onChange={(e) => setRequirementBedType(e.target.value as BedType)}
                  className={INPUT_CLASS}
                  style={INPUT_STYLE}
                >
                  {ASSIGNABLE_BED_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-3.5">
                <FieldLabel>Special Requirements</FieldLabel>
                <div className="flex flex-wrap gap-2">
                  {specialRequirements.map((req) => (
                    <span
                      key={req}
                      className="flex items-center gap-1.5 rounded-full px-2.5 py-1 font-sans font-medium"
                      style={{ fontSize: 14, color: '#00B4D8', background: 'rgba(0,180,216,0.08)' }}
                    >
                      {req}
                      <button
                        type="button"
                        onClick={() => toggleRequirement(req)}
                        aria-label={`Remove ${req}`}
                        className={`flex items-center justify-center ${FOCUS_RING}`}
                      >
                        <X style={{ width: 12, height: 12 }} />
                      </button>
                    </span>
                  ))}
                  {specialRequirements.length === 0 && (
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>None selected</p>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {SPECIAL_REQUIREMENT_OPTIONS.filter((o) => !specialRequirements.includes(o)).map(
                    (opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => toggleRequirement(opt)}
                        className={`flex h-8 items-center rounded-full px-3 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                        style={{
                          fontSize: 14,
                          color: '#4A7080',
                          border: '1px solid rgba(0,100,130,0.18)',
                        }}
                      >
                        + {opt}
                      </button>
                    ),
                  )}
                </div>
              </div>

              <div className="mt-3.5">
                <FieldLabel>Notes (Optional)</FieldLabel>
                <textarea
                  value={notes}
                  onChange={(e) => e.target.value.length <= 200 && setNotes(e.target.value)}
                  rows={3}
                  placeholder="Add any notes for bed assignment..."
                  className="w-full resize-none rounded-[10px] p-3.5 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40"
                  style={INPUT_STYLE}
                />
                <p className="mt-1 text-right" style={{ fontSize: 14, color: '#8A98A3' }}>
                  {notes.length}/200
                </p>
              </div>
            </div>
          </div>

          {/* 3. Available Beds */}
          <div
            className="min-w-0 rounded-[12px] p-4"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                3. Available Beds
              </p>
              <div className="flex flex-wrap items-center gap-2.5">
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
              </div>
            </div>

            {availableRows.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-14 text-center">
                <div
                  className="flex size-14 items-center justify-center rounded-full"
                  style={{ background: 'rgba(226,237,241,0.6)' }}
                >
                  <Bed style={{ width: 28, height: 28, color: '#8A98A3' }} />
                </div>
                <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                  No available beds match these filters
                </p>
                <p style={{ fontSize: 14, color: '#8A98A3' }}>
                  Try a different bed type or zone, or check back shortly.
                </p>
              </div>
            ) : (
              <div className="mt-3 overflow-x-auto scroll-smooth">
                <table className="w-full" style={{ minWidth: 640 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #E6F8FD' }}>
                      {['Bed', 'Type', 'Zone / Area', 'Status', 'Equipment', ''].map((h) => (
                        <th
                          key={h}
                          className="px-2 py-2.5 text-center font-sans font-bold tracking-wider uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {availableRows.map((bed) => {
                      const isSelected = selectedBedId === bed.id;
                      return (
                        <tr key={bed.id} style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}>
                          <td className="px-2 py-3 text-center">
                            <p
                              className="font-sans font-semibold"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {bed.id}
                            </p>
                          </td>
                          <td
                            className="px-2 py-3 text-center whitespace-nowrap"
                            style={{ fontSize: 14, color: '#4A7080' }}
                          >
                            {bed.type}
                          </td>
                          <td
                            className="px-2 py-3 text-center whitespace-nowrap"
                            style={{ fontSize: 14, color: '#4A7080' }}
                          >
                            {bed.zone}
                          </td>
                          <td className="px-2 py-3 text-center">
                            <span
                              className="inline-block rounded-full px-2 py-0.5 font-sans font-medium whitespace-nowrap"
                              style={{
                                fontSize: 14,
                                color: '#16A34A',
                                background: 'rgba(22,163,74,0.1)',
                              }}
                            >
                              Available
                            </span>
                          </td>
                          <td className="px-2 py-3 text-center">
                            <EquipmentIcons equipment={bed.equipment} />
                          </td>
                          <td className="px-2 py-3 text-center">
                            <PermissionGate permission={PERMISSIONS.EMERGENCY_WRITE}>
                              <button
                                type="button"
                                onClick={() => setSelectedBedId(bed.id)}
                                className={`inline-flex h-9 items-center gap-1 rounded-[8px] px-3.5 font-sans font-medium whitespace-nowrap transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                                style={{
                                  fontSize: 14,
                                  color: isSelected ? '#0D2630' : '#FFFFFF',
                                  background: isSelected ? 'rgba(0,180,216,0.12)' : '#0D2630',
                                  border: isSelected ? '1px solid #00B4D8' : 'none',
                                }}
                              >
                                {isSelected && <Check style={{ width: 13, height: 13 }} />}
                                {isSelected ? 'Selected' : 'Assign'}
                              </button>
                            </PermissionGate>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <p className="mt-3" style={{ fontSize: 14, color: '#8A98A3' }}>
                  Showing 1 to {availableRows.length} of {availableRows.length} available beds
                </p>
              </div>
            )}

            {/* Legend */}
            <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(0,100,130,0.1)' }}>
              <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
                Bed Type Legend
              </p>
              <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {ASSIGNABLE_BED_TYPES.map((t) => {
                  const Icon = BED_TYPE_ICON[t];
                  return (
                    <div key={t} className="flex items-start gap-2">
                      <span
                        className="flex size-7 shrink-0 items-center justify-center rounded-full"
                        style={{ background: 'rgba(0,180,216,0.1)' }}
                      >
                        <Icon style={{ width: 14, height: 14, color: '#00B4D8' }} />
                      </span>
                      <div>
                        <p
                          className="font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {t}
                        </p>
                        <p style={{ fontSize: 14, color: '#8A98A3' }}>{BED_TYPE_DESC[t]}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p
                className="mt-3 font-sans font-semibold"
                style={{ fontSize: 14, color: '#0D2630' }}
              >
                Equipment
              </p>
              <div className="mt-2 flex flex-wrap gap-3">
                {(Object.keys(EQUIPMENT_ICON) as BedEquipment[]).map((eq) => {
                  const Icon = EQUIPMENT_ICON[eq];
                  return (
                    <span
                      key={eq}
                      className="flex items-center gap-1.5"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      <Icon style={{ width: 14, height: 14, color: '#4A7080' }} />
                      {eq}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 4. Assignment Preview + 5. Actions + Recent Assignments */}
          <div className="flex flex-col gap-4">
            <div
              className="rounded-[12px] p-4"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                4. Assignment Preview
              </p>
              {!selectedBed ? (
                <p className="mt-3" style={{ fontSize: 14, color: '#8A98A3' }}>
                  Select an available bed to preview the assignment.
                </p>
              ) : (
                <>
                  <div
                    className="mt-3 rounded-[10px] p-3"
                    style={{
                      background: PRIORITY_BG[priority],
                      border: `1px solid ${PRIORITY_BORDER[priority]}`,
                    }}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="flex size-9 shrink-0 items-center justify-center rounded-full font-sans font-semibold text-white"
                        style={{ background: PRIORITY_COLOR[priority], fontSize: 13 }}
                      >
                        {entry.patientName
                          .split(/\s+/)
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')}
                      </div>
                      <div className="min-w-0">
                        <Tooltip content={entry.patientName}>
                          <p
                            className="truncate font-sans font-semibold"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {entry.patientName}
                          </p>
                        </Tooltip>
                        <p style={{ fontSize: 14, color: '#00B4D8' }}>MRN: {entry.mrn}</p>
                      </div>
                    </div>
                    <PriorityPill priority={priority} />
                  </div>

                  <div className="mt-2 flex justify-center">
                    <div
                      className="flex size-7 items-center justify-center rounded-full"
                      style={{ background: '#F5FBFD' }}
                    >
                      <ChevronRight
                        style={{
                          width: 14,
                          height: 14,
                          color: '#8A98A3',
                          transform: 'rotate(90deg)',
                        }}
                      />
                    </div>
                  </div>

                  <div className="rounded-[10px] p-3" style={{ background: '#F5FBFD' }}>
                    <p
                      className="flex items-center gap-1.5 font-sans font-semibold"
                      style={{ fontSize: 14, color: '#16A34A' }}
                    >
                      <Check style={{ width: 14, height: 14 }} />
                      {selectedBed.id}
                    </p>
                    <p style={{ fontSize: 14, color: '#4A7080' }}>{selectedBed.type}</p>

                    <div className="mt-2.5 grid grid-cols-2 gap-2.5">
                      <div>
                        <p style={{ fontSize: 14, color: '#8A98A3' }}>Zone / Area</p>
                        <p
                          className="font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {selectedBed.zone}
                        </p>
                      </div>
                      <div>
                        <p style={{ fontSize: 14, color: '#8A98A3' }}>Equipment</p>
                        <EquipmentIcons equipment={selectedBed.equipment} />
                      </div>
                    </div>

                    <div className="mt-2.5 flex flex-col gap-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span style={{ fontSize: 14, color: '#8A98A3' }}>Est. Transfer Time</span>
                        <span
                          className="font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {ZONE_TRANSFER_MINUTES[selectedBed.zone] ?? 5} mins
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span style={{ fontSize: 14, color: '#8A98A3' }}>Assigned By</span>
                        <span
                          className="font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {user?.name ?? 'Emergency Physician'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span style={{ fontSize: 14, color: '#8A98A3' }}>Assignment Time</span>
                        <span
                          className="font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {formatHumanDate(now)}, {formatTime(now)}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                5. Actions
              </p>
              <PermissionGate permission={PERMISSIONS.EMERGENCY_WRITE}>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={!selectedBed || isSubmitting}
                  className={`flex h-11 items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 disabled:opacity-50 ${FOCUS_RING}`}
                  style={{ fontSize: 14, background: '#0D2630' }}
                >
                  <CheckCircle2 style={{ width: 15, height: 15 }} />
                  {isSubmitting ? 'Assigning…' : 'Confirm Bed Assignment'}
                </button>
                <button
                  type="button"
                  onClick={handleHold}
                  disabled={!selectedBed}
                  className={`flex h-11 items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] disabled:opacity-50 ${FOCUS_RING}`}
                  style={{
                    fontSize: 14,
                    color: '#0D2630',
                    border: '1px solid rgba(0,100,130,0.2)',
                  }}
                >
                  <Clock style={{ width: 15, height: 15 }} />
                  Hold Bed (5 mins)
                </button>
              </PermissionGate>
              <button
                type="button"
                onClick={resetSelection}
                disabled={!selectedBed}
                className={`flex h-11 items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] disabled:opacity-50 ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#4A7080', border: '1px solid rgba(0,100,130,0.2)' }}
              >
                Cancel
              </button>
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
                  Recent Assignments
                </p>
                <button
                  type="button"
                  onClick={() => router.push(ROUTES.emergencyTrackingBoard)}
                  className={`font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                  style={{ fontSize: 14, color: '#00B4D8' }}
                >
                  View All
                </button>
              </div>
              <div className="mt-2.5 flex flex-col gap-2.5">
                {recentAssignments.slice(0, 5).map((ra) => (
                  <div key={ra.id} className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <Tooltip content={ra.patientName}>
                        <p
                          className="truncate font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {ra.patientName}
                        </p>
                      </Tooltip>
                      <p style={{ fontSize: 14, color: '#8A98A3' }}>{ra.bedId}</p>
                    </div>
                    <span className="shrink-0" style={{ fontSize: 14, color: '#8A98A3' }}>
                      {formatTime(ra.assignedAt)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <p className="mt-4 text-center" style={{ fontSize: 14, color: '#8A98A3' }}>
          All times are current. Data updates automatically.
        </p>
      </div>
    </main>
  );
}
