'use client';

import {
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  FileText,
  FlaskConical,
  HeartPulse,
  LogIn,
  Plus,
  Printer,
  RefreshCw,
  ScanEye,
  Search,
  SlidersHorizontal,
  Stethoscope,
  Syringe,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { AllergyBanner } from '@/components/clinical/AllergyBanner';
import { FilterDropdown, type FilterDef } from '@components/shared/FilterDropdown';
import { PermissionGate } from '@components/shared/PermissionGate';
import { Tooltip } from '@components/shared/Tooltip';
import { PERMISSIONS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
import { useToast } from '@/hooks/useToast';
import { downloadPDF, escapeHtml } from '@/utils/export';
import { formatHumanDate, formatTime } from '@/utils/datetime';
import { getTriageDisplay, triageSortWeight, type TriagePriority } from '@/utils/triage';
import type { Allergy } from '@/types/patient.types';
import { useQueueEntries } from '@/features/registration/store/registrationQueueStore';
import type { QueueEntry } from '@/features/registration/__mocks__/queueFixtures';
import { useLabResults, type LabResult } from '@/features/laboratory/store/labResultStore';
import { deriveResultCategory } from '@/features/laboratory/utils/labOrders';
import {
  deriveBloodGroup,
  deriveComplaintForEntry,
  deriveEmergencyContact,
  deriveLatestVitals,
  derivePriorityForEntry,
  deriveVitalsCheckpoints,
} from '@/features/emergency/__mocks__/emergencyFixtures';
import { PatientSwitcher } from '@/features/emergency/components/PatientSwitcher';
import {
  useTriageRecords,
  type TriageRecord,
} from '@/features/emergency/store/triageAssessmentStore';
import {
  useClinicalNotes,
  type EmergencyClinicalNote,
} from '@/features/emergency/store/clinicalNotesStore';
import { useProcedures, type ProcedureRecord } from '@/features/emergency/store/procedureStore';
import {
  useMedicationOrders,
  type EmergencyMedicationOrder,
} from '@/features/emergency/store/medicationOrderStore';

type PageState = 'loading' | 'loaded' | 'error';

type TimelineEventType =
  'Arrival' | 'Diagnosis' | 'Note' | 'Lab' | 'Imaging' | 'Medication' | 'Vitals' | 'Procedure';

type TimelineEvent = {
  id: string;
  type: TimelineEventType;
  title: string;
  dateTime: string; // ISO
  summary: string;
  detail?: string | undefined;
  badge?: { label: string; color: string; bg: string };
  by: string;
  byRole: string;
};

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const PRIORITY_COLOR: Record<TriagePriority, string> = {
  IMMEDIATE: '#DC2626',
  URGENT: '#D97706',
  LESS_URGENT: '#F59E0B',
  NON_URGENT: '#16A34A',
};

const TYPE_CFG: Record<
  TimelineEventType,
  { label: string; icon: typeof LogIn; color: string; bg: string }
> = {
  Arrival: { label: 'Arrival', icon: LogIn, color: '#D97706', bg: 'rgba(217,119,6,0.12)' },
  Diagnosis: {
    label: 'Diagnosis',
    icon: AlertTriangle,
    color: '#DC2626',
    bg: 'rgba(220,38,38,0.12)',
  },
  Note: { label: 'Clinical Note', icon: FileText, color: '#2563EB', bg: 'rgba(37,99,235,0.12)' },
  Lab: { label: 'Lab Result', icon: FlaskConical, color: '#16A34A', bg: 'rgba(22,163,74,0.12)' },
  Imaging: { label: 'Imaging', icon: ScanEye, color: '#7C3AED', bg: 'rgba(124,58,237,0.12)' },
  Medication: { label: 'Medication', icon: Syringe, color: '#D97706', bg: 'rgba(217,119,6,0.12)' },
  Vitals: { label: 'Vitals', icon: HeartPulse, color: '#00B4D8', bg: 'rgba(0,180,216,0.12)' },
  Procedure: {
    label: 'Procedure',
    icon: Stethoscope,
    color: '#7C3AED',
    bg: 'rgba(124,58,237,0.12)',
  },
};

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function roleForActor(name: string): string {
  if (name.startsWith('Dr.')) return 'Emergency Physician';
  if (name.startsWith('Nurse')) return 'Nursing';
  if (name.toLowerCase().includes('lab')) return 'Laboratory';
  return 'Emergency Department';
}

function buildTimelineEvents(params: {
  entry: QueueEntry;
  triageRecord: TriageRecord | undefined;
  notes: EmergencyClinicalNote[];
  procedures: ProcedureRecord[];
  medicationOrders: EmergencyMedicationOrder[];
  labResults: LabResult[];
  priority: TriagePriority;
  defaultAuthor: string;
}): TimelineEvent[] {
  const {
    entry,
    triageRecord,
    notes,
    procedures,
    medicationOrders,
    labResults,
    priority,
    defaultAuthor,
  } = params;
  const events: TimelineEvent[] = [];

  // Arrival / Triage
  events.push({
    id: `${entry.id}-arrival`,
    type: 'Arrival',
    title: 'Patient Arrived',
    dateTime: triageRecord?.completedAt ?? entry.arrivalTime,
    summary: `Mode: ${triageRecord?.arrivalMode ?? 'Walk-in'} · Triage Level: ${getTriageDisplay(priority).label}`,
    detail: `Chief complaint: ${triageRecord?.chiefComplaint ?? deriveComplaintForEntry(entry.id)}`,
    by: triageRecord?.triageNurse ?? 'Triage Nurse',
    byRole: 'Emergency Unit',
  });

  // Vitals at triage, if recorded
  if (triageRecord?.vitals.systolic) {
    events.push({
      id: `${entry.id}-triage-vitals`,
      type: 'Vitals',
      title: 'Vital Signs Recorded',
      dateTime: triageRecord.completedAt,
      summary: `BP: ${triageRecord.vitals.systolic}/${triageRecord.vitals.diastolic} mmHg · HR: ${triageRecord.vitals.pulse} bpm · SpO₂: ${triageRecord.vitals.spo2}% · RR: ${triageRecord.vitals.respRate} rpm`,
      by: triageRecord.triageNurse,
      byRole: 'Nursing',
    });
  } else {
    for (const [i, cp] of deriveVitalsCheckpoints(entry.id, entry.arrivalTime).entries()) {
      events.push({
        id: `${entry.id}-vitals-${i}`,
        type: 'Vitals',
        title: 'Vital Signs Recorded',
        dateTime: cp.time,
        summary: `BP: ${cp.bp} mmHg · HR: ${cp.hr} bpm · SpO₂: ${cp.spo2}% · Temp: ${cp.temp}°C · RR: ${cp.rr} rpm`,
        by: 'Nurse Mary Ada',
        byRole: 'Nursing',
      });
    }
  }

  // Diagnoses — first appearance per unique diagnosis, chronological
  const seenDiagnoses = new Set<string>();
  const notesAsc = [...notes].sort(
    (a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime(),
  );
  for (const note of notesAsc) {
    for (const dx of note.workingDiagnoses) {
      if (seenDiagnoses.has(dx)) continue;
      seenDiagnoses.add(dx);
      events.push({
        id: `${note.id}-dx-${dx}`,
        type: 'Diagnosis',
        title: 'Diagnosis Added',
        dateTime: note.dateTime,
        summary: dx,
        detail: `ICD-10 not yet coded`,
        badge: {
          label: seenDiagnoses.size === 1 ? 'Primary Diagnosis' : 'Diagnosis',
          color: '#DC2626',
          bg: 'rgba(220,38,38,0.1)',
        },
        by: note.author,
        byRole: roleForActor(note.author),
      });
    }
  }

  // Clinical notes (signed only — a real, finalized chart entry)
  for (const note of notes) {
    if (note.status !== 'Signed') continue;
    const text =
      stripHtml(note.sections.subjective) ||
      stripHtml(note.sections.assessment) ||
      stripHtml(note.sections.objective) ||
      stripHtml(note.sections.plan) ||
      note.noteType;
    events.push({
      id: note.id,
      type: 'Note',
      title: note.noteType,
      dateTime: note.dateTime,
      summary: text.length > 160 ? `${text.slice(0, 160)}…` : text,
      by: note.author,
      byRole: roleForActor(note.author),
    });
  }

  // Procedures
  for (const p of procedures) {
    const statusLabel =
      p.status === 'Cancelled'
        ? 'Procedure Cancelled'
        : p.status === 'Completed'
          ? 'Procedure Completed'
          : p.status === 'In Progress'
            ? 'Procedure Started'
            : 'Procedure Planned';
    events.push({
      id: p.id,
      type: 'Procedure',
      title: statusLabel,
      dateTime: p.status === 'Completed' && p.completedAt ? p.completedAt : p.startedAt,
      summary: `${p.name} · ${p.type}`,
      detail: p.location,
      badge: { label: p.status, color: TYPE_CFG.Procedure.color, bg: TYPE_CFG.Procedure.bg },
      by: p.performedBy,
      byRole: roleForActor(p.performedBy),
    });
  }

  // Medication orders
  for (const m of medicationOrders) {
    events.push({
      id: `${m.id}-ordered`,
      type: 'Medication',
      title: 'Medication Ordered',
      dateTime: m.timeOrdered,
      summary: `${m.medication} ${m.dose} · ${m.route}`,
      detail: `${m.frequency} · ${m.priority}`,
      by: m.orderedBy,
      byRole: roleForActor(m.orderedBy),
    });
    if (m.discontinuedAt) {
      events.push({
        id: `${m.id}-discontinued`,
        type: 'Medication',
        title: 'Medication Discontinued',
        dateTime: m.discontinuedAt,
        summary: m.medication,
        detail: m.discontinuedReason,
        badge: { label: 'Discontinued', color: '#8A98A3', bg: 'rgba(138,152,163,0.15)' },
        by: m.orderedBy,
        byRole: roleForActor(m.orderedBy),
      });
    }
  }

  // Lab / Imaging results
  for (const r of labResults) {
    if (r.status !== 'RESULTED' && r.status !== 'VERIFIED') continue;
    const category = deriveResultCategory(r);
    const isImaging = category === 'Imaging' || category === 'Cardiology';
    const flagBadge = r.flag
      ? {
          label: r.flag === 'CRITICAL' ? 'Critical' : r.flag === 'ABNORMAL' ? 'Abnormal' : 'Normal',
          color: r.flag === 'CRITICAL' ? '#DC2626' : r.flag === 'ABNORMAL' ? '#D97706' : '#16A34A',
          bg:
            r.flag === 'CRITICAL'
              ? 'rgba(220,38,38,0.1)'
              : r.flag === 'ABNORMAL'
                ? 'rgba(217,119,6,0.1)'
                : 'rgba(22,163,74,0.1)',
        }
      : { label: 'Completed', color: '#7C3AED', bg: 'rgba(124,58,237,0.1)' };
    events.push({
      id: r.id,
      type: isImaging ? 'Imaging' : 'Lab',
      title: isImaging ? 'Imaging Completed' : 'Lab Result Available',
      dateTime: r.resultAt!,
      summary: r.testName,
      detail: r.comment,
      badge: flagBadge,
      by: r.department,
      byRole: isImaging ? 'Radiology' : 'Laboratory',
    });
  }

  void defaultAuthor;
  return events.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
}

export function EmergencyClinicalTimelineWorkspace() {
  const router = useRouter();
  const toast = useToast();
  const searchParams = useSearchParams();
  const entryId = searchParams.get('entryId');

  const [pageState, setPageState] = useState<PageState>('loading');
  const [now] = useState(() => Date.now());
  const [typeFilter, setTypeFilter] = useState<'ALL' | TimelineEventType>('ALL');
  const [providerFilter, setProviderFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'WEEK'>('ALL');
  const [openFilter, setOpenFilter] = useState<'type' | 'provider' | 'date' | null>(null);
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(8);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setPageState('loaded'), 800);
    return () => clearTimeout(t);
  }, []);

  const allEntries = useQueueEntries();
  const triageRecords = useTriageRecords();
  const allResults = useLabResults();

  function handleRetry() {
    setPageState('loading');
    setTimeout(() => setPageState('loaded'), 800);
  }

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

  const notes = useClinicalNotes(entry?.id, attendingPhysician);
  const procedures = useProcedures(entry?.id, attendingPhysician, 'ER-01, Resus Bay');
  const medicationOrders = useMedicationOrders(entry?.id, attendingPhysician);
  const patientResults = entry ? allResults.filter((r) => r.mrn === entry.mrn) : [];

  const events = entry
    ? buildTimelineEvents({
        entry,
        triageRecord,
        notes,
        procedures,
        medicationOrders,
        labResults: patientResults,
        priority,
        defaultAuthor: attendingPhysician,
      })
    : [];

  if (pageState === 'error') {
    return (
      <main className="flex flex-1 items-center justify-center" style={{ background: '#F5FBFD' }}>
        <div className="flex flex-col items-center gap-3 px-6 text-center">
          <AlertCircle style={{ width: 40, height: 40, color: '#DC2626' }} />
          <p className="font-display font-semibold" style={{ fontSize: 18, color: '#0D2630' }}>
            Couldn&apos;t load Clinical Timeline
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
            <SlidersHorizontal style={{ width: 28, height: 28, color: '#8A98A3' }} />
          </div>
          <p className="font-display font-semibold" style={{ fontSize: 18, color: '#0D2630' }}>
            No emergency patients in the queue
          </p>
          <p style={{ fontSize: 14, color: '#4A7080' }}>
            Clinical Timeline needs a patient currently in the emergency department.
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

  const bloodGroup = deriveBloodGroup(entry.id);
  const emergencyContact = deriveEmergencyContact(entry.id);
  const vitals = deriveLatestVitals(entry.id);
  const allergies: Allergy[] = [];

  const q = search.trim().toLowerCase();
  const filtered = events
    .filter((e) => typeFilter === 'ALL' || e.type === typeFilter)
    .filter((e) => providerFilter === 'ALL' || e.by === providerFilter)
    .filter((e) => {
      if (dateFilter === 'ALL') return true;
      const ageMs = now - new Date(e.dateTime).getTime();
      const dayMs = 24 * 60 * 60 * 1000;
      if (dateFilter === 'TODAY') return ageMs < dayMs;
      return ageMs < 7 * dayMs;
    })
    .filter((e) => !q || e.title.toLowerCase().includes(q) || e.summary.toLowerCase().includes(q));

  const visible = filtered.slice(0, visibleCount);

  const groups = new Map<string, TimelineEvent[]>();
  for (const e of visible) {
    const key = formatHumanDate(e.dateTime);
    const arr = groups.get(key) ?? [];
    arr.push(e);
    groups.set(key, arr);
  }

  const providerOptions = Array.from(new Set(events.map((e) => e.by)));

  const criticalCount = events.filter(
    (e) => e.badge?.label === 'Critical' || e.type === 'Diagnosis',
  ).length;
  const medicationCount = events.filter((e) => e.type === 'Medication').length;
  const labCount = events.filter((e) => e.type === 'Lab').length;
  const imagingCount = events.filter((e) => e.type === 'Imaging').length;
  const noteCount = events.filter((e) => e.type === 'Note').length;
  const vitalsCount = events.filter((e) => e.type === 'Vitals').length;

  const QUICK_FILTERS: {
    key: 'ALL' | TimelineEventType;
    label: string;
    count: number;
    icon: typeof AlertTriangle;
    color: string;
  }[] = [
    {
      key: 'Diagnosis',
      label: 'Critical Events',
      count: criticalCount,
      icon: AlertTriangle,
      color: '#DC2626',
    },
    {
      key: 'Medication',
      label: 'Medications',
      count: medicationCount,
      icon: Syringe,
      color: '#D97706',
    },
    { key: 'Lab', label: 'Lab Results', count: labCount, icon: FlaskConical, color: '#16A34A' },
    { key: 'Imaging', label: 'Imaging', count: imagingCount, icon: ScanEye, color: '#7C3AED' },
    { key: 'Note', label: 'Notes', count: noteCount, icon: FileText, color: '#2563EB' },
    { key: 'Vitals', label: 'Vitals', count: vitalsCount, icon: HeartPulse, color: '#00B4D8' },
    {
      key: 'ALL',
      label: 'All Events',
      count: events.length,
      icon: SlidersHorizontal,
      color: '#4A7080',
    },
  ];

  function handlePrintTimeline() {
    const body = `
      <h1>Clinical Timeline — ${escapeHtml(entry!.patientName)}</h1>
      <p class="meta">MRN: ${escapeHtml(entry!.mrn)} · ${filtered.length} events</p>
      <hr>
      ${filtered
        .map(
          (e) =>
            `<p><b>${escapeHtml(formatHumanDate(e.dateTime))} ${escapeHtml(formatTime(e.dateTime))} — ${escapeHtml(e.title)}</b><br>${escapeHtml(e.summary)}${e.detail ? `<br>${escapeHtml(e.detail)}` : ''}<br><i>By ${escapeHtml(e.by)} (${escapeHtml(e.byRole)})</i></p>`,
        )
        .join('')}
    `;
    downloadPDF(`clinical-timeline-${entry!.patientName.split(' ')[0]?.toLowerCase()}`, body);
    toast.success('Timeline exported', `${filtered.length} events exported.`);
  }

  const FILTER_DEFS: { key: 'type' | 'provider' | 'date'; def: FilterDef }[] = [
    {
      key: 'type',
      def: {
        key: 'type',
        defaultLabel: 'All Events',
        options: (Object.keys(TYPE_CFG) as TimelineEventType[]).map((t) => ({
          value: t,
          label: TYPE_CFG[t].label,
        })),
      },
    },
    {
      key: 'provider',
      def: {
        key: 'provider',
        defaultLabel: 'All Providers',
        options: providerOptions.map((p) => ({ value: p, label: p })),
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
    type: typeFilter,
    provider: providerFilter,
    date: dateFilter,
  };
  const filterSetter: Record<string, (v: string) => void> = {
    type: (v) => setTypeFilter(v as TimelineEventType),
    provider: setProviderFilter,
    date: (v) => setDateFilter(v as 'TODAY' | 'WEEK'),
  };

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
          <span style={{ fontSize: 14, color: '#4A7080' }}>Patient Records</span>
          <ChevronRight style={{ width: 14, height: 14, color: '#8A98A3' }} />
          <span className="font-sans font-medium" style={{ fontSize: 14, color: '#00B4D8' }}>
            Clinical Timeline
          </span>
        </div>

        {/* Header */}
        <div className="mt-2 flex items-center gap-2">
          <SlidersHorizontal style={{ width: 22, height: 22, color: '#DC2626' }} />
          <div>
            <h1 className="font-display font-bold" style={{ fontSize: 24, color: '#0D2630' }}>
              Clinical Timeline
            </h1>
            <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
              Comprehensive chronological view of patient&apos;s emergency care journey.
            </p>
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
              <p className="font-display font-semibold" style={{ fontSize: 17, color: '#0D2630' }}>
                {entry.patientName}
              </p>
              <p style={{ fontSize: 14, color: '#4A7080' }}>
                MRN: {entry.mrn} · {entry.age} Years, {entry.gender}
              </p>
            </div>
          </div>
          <div>
            <p style={{ fontSize: 14, color: '#8A98A3' }}>Blood Group</p>
            <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
              {bloodGroup}
            </p>
          </div>
          <div>
            <p style={{ fontSize: 14, color: '#8A98A3' }}>Allergies</p>
            <p className="font-sans font-medium" style={{ fontSize: 14, color: '#16A34A' }}>
              No Known Allergies
            </p>
          </div>
          <div>
            <p style={{ fontSize: 14, color: '#8A98A3' }}>Emergency Contact</p>
            <Tooltip
              content={`${emergencyContact.name} (${emergencyContact.relation}) · ${emergencyContact.phone}`}
            >
              <p
                className="max-w-[200px] truncate font-sans font-medium"
                style={{ fontSize: 14, color: '#0D2630' }}
              >
                {emergencyContact.name} ({emergencyContact.relation})
              </p>
            </Tooltip>
          </div>
          <button
            type="button"
            onClick={() => router.push(ROUTES.patients)}
            className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
            style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
          >
            View Full Profile
          </button>
          <div className="ml-auto">
            <PatientSwitcher currentEntryId={entry.id} />
          </div>
        </div>

        <div className="mt-4">
          <AllergyBanner allergies={allergies} />
        </div>

        {/* Filter bar */}
        <div className="mt-4 flex flex-wrap items-center gap-2.5">
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
          <div className="relative min-w-[200px] flex-1">
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
              placeholder="Search timeline..."
              className={`h-11 w-full rounded-[10px] py-2 pr-3.5 pl-10 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
              style={{ fontSize: 14, border: '1px solid rgba(0,100,130,0.18)', color: '#0D2630' }}
            />
          </div>
        </div>

        {/* Main grid */}
        <div className="mt-4 grid grid-cols-1 gap-4 2xl:grid-cols-[1fr_320px] 2xl:items-start">
          <div className="min-w-0">
            {filtered.length === 0 ? (
              <div
                className="flex flex-col items-center gap-2 rounded-[12px] px-4 py-16 text-center"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <div
                  className="flex size-14 items-center justify-center rounded-full"
                  style={{ background: 'rgba(226,237,241,0.6)' }}
                >
                  <SlidersHorizontal style={{ width: 28, height: 28, color: '#8A98A3' }} />
                </div>
                <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                  No events found
                </p>
                <p style={{ fontSize: 14, color: '#8A98A3' }}>
                  Try a different search term or filter combination.
                </p>
              </div>
            ) : (
              Array.from(groups.entries()).map(([day, dayEvents]) => (
                <div
                  key={day}
                  className="mb-4 rounded-[12px] p-4"
                  style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                >
                  <p
                    className="font-display mb-3 font-semibold"
                    style={{ fontSize: 16, color: '#0D2630' }}
                  >
                    {isSameCalendarDay(dayEvents[0]!.dateTime) ? `Today - ${day}` : day}
                  </p>
                  <div className="relative">
                    <div
                      className="absolute top-6 bottom-6 w-px"
                      style={{ left: 27, background: 'rgba(0,100,130,0.12)' }}
                    />
                    <div className="flex flex-col gap-5">
                      {dayEvents.map((e) => {
                        const cfg = TYPE_CFG[e.type];
                        const Icon = cfg.icon;
                        const isExpanded = expandedId === e.id;
                        return (
                          <div key={e.id} className="flex items-start gap-3">
                            <div className="w-14 shrink-0 pt-2 text-right">
                              <p
                                className="font-sans font-medium"
                                style={{ fontSize: 14, color: '#4A7080' }}
                              >
                                {formatTime(e.dateTime)}
                              </p>
                            </div>
                            <div
                              className="relative z-10 flex size-11 shrink-0 items-center justify-center rounded-full"
                              style={{ background: cfg.bg, border: '2px solid #FFFFFF' }}
                            >
                              <Icon style={{ width: 18, height: 18, color: cfg.color }} />
                            </div>
                            <div className="min-w-0 flex-1 pt-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p
                                  className="font-sans font-semibold"
                                  style={{ fontSize: 15, color: cfg.color }}
                                >
                                  {e.title}
                                </p>
                                {e.badge && (
                                  <span
                                    className="rounded-full px-2 py-0.5 font-sans font-medium whitespace-nowrap"
                                    style={{
                                      fontSize: 14,
                                      color: e.badge.color,
                                      background: e.badge.bg,
                                    }}
                                  >
                                    {e.badge.label}
                                  </span>
                                )}
                              </div>
                              <p className="mt-0.5" style={{ fontSize: 14, color: '#0D2630' }}>
                                {e.summary}
                              </p>
                              {isExpanded && e.detail && (
                                <p className="mt-1" style={{ fontSize: 14, color: '#4A7080' }}>
                                  {e.detail}
                                </p>
                              )}
                            </div>
                            <div className="w-36 shrink-0 pt-1 text-right">
                              <Tooltip content={e.by}>
                                <p
                                  className="truncate font-sans font-medium"
                                  style={{ fontSize: 14, color: '#0D2630' }}
                                >
                                  {e.by}
                                </p>
                              </Tooltip>
                              <p style={{ fontSize: 14, color: '#8A98A3' }}>{e.byRole}</p>
                            </div>
                            {e.detail && (
                              <button
                                type="button"
                                onClick={() => setExpandedId((p) => (p === e.id ? null : e.id))}
                                aria-label={isExpanded ? 'Collapse' : 'Expand'}
                                className={`mt-1 flex size-9 shrink-0 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                              >
                                <ChevronDown
                                  style={{
                                    width: 16,
                                    height: 16,
                                    color: '#4A7080',
                                    transform: isExpanded ? 'rotate(180deg)' : 'none',
                                    transition: 'transform 150ms',
                                  }}
                                />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))
            )}

            {filtered.length > visibleCount && (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => setVisibleCount((c) => c + 8)}
                  className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                  style={{
                    fontSize: 14,
                    color: '#0D2630',
                    border: '1px solid rgba(0,100,130,0.2)',
                  }}
                >
                  Load Earlier Events
                  <ChevronDown style={{ width: 15, height: 15 }} />
                </button>
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
              <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5">
                <div>
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>MRN</p>
                  <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                    {entry.mrn}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>Age / Sex</p>
                  <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                    {entry.age} Years / {entry.gender}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>Blood Group</p>
                  <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                    {bloodGroup}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                  Vital Signs (Latest)
                </p>
                <button
                  type="button"
                  onClick={() =>
                    router.push(`${ROUTES.emergencyResultsReview}?entryId=${entry.id}`)
                  }
                  className={`font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                  style={{ fontSize: 14, color: '#00B4D8' }}
                >
                  View Latest
                </button>
              </div>
              <div className="mt-1.5 grid grid-cols-4 gap-2">
                <div className="rounded-[8px] p-2" style={{ background: '#F5FBFD' }}>
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>BP</p>
                  <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
                    {vitals.bp}
                  </p>
                </div>
                <div className="rounded-[8px] p-2" style={{ background: '#F5FBFD' }}>
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>HR</p>
                  <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#DC2626' }}>
                    {vitals.hr}
                  </p>
                </div>
                <div className="rounded-[8px] p-2" style={{ background: '#F5FBFD' }}>
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>RR</p>
                  <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
                    {vitals.rr}
                  </p>
                </div>
                <div className="rounded-[8px] p-2" style={{ background: '#F5FBFD' }}>
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>SpO₂</p>
                  <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
                    {vitals.spo2}%
                  </p>
                </div>
              </div>
            </div>

            <div
              className="rounded-[12px] p-4"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Allergies
              </p>
              <div className="mt-2.5 flex items-center gap-1.5">
                <span className="size-1.5 rounded-full" style={{ background: '#16A34A' }} />
                <span style={{ fontSize: 14, color: '#16A34A' }}>No Known Allergies</span>
              </div>
            </div>

            <div
              className="rounded-[12px] p-4"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Timeline Quick Filters
              </p>
              <div className="mt-2.5 flex flex-col gap-1">
                {QUICK_FILTERS.map((f) => {
                  const Icon = f.icon;
                  return (
                    <button
                      key={f.label}
                      type="button"
                      onClick={() => setTypeFilter(f.key)}
                      className={`flex items-center justify-between gap-2 rounded-[8px] px-2 py-1.5 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                    >
                      <span className="flex items-center gap-2">
                        <Icon style={{ width: 15, height: 15, color: f.color }} />
                        <span style={{ fontSize: 14, color: '#0D2630' }}>{f.label}</span>
                      </span>
                      <span
                        className="font-sans font-semibold"
                        style={{ fontSize: 14, color: f.color }}
                      >
                        {f.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              className="rounded-[12px] p-4"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Timeline Actions
              </p>
              <div className="mt-2.5 flex flex-col gap-2.5">
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
                    <Plus style={{ width: 14, height: 14 }} />
                    Add Clinical Note
                  </button>
                </PermissionGate>
                <button
                  type="button"
                  onClick={handlePrintTimeline}
                  className={`flex h-10 items-center justify-center gap-1.5 rounded-[8px] px-2 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                  style={{
                    fontSize: 14,
                    color: '#0D2630',
                    border: '1px solid rgba(0,100,130,0.2)',
                  }}
                >
                  <Printer style={{ width: 14, height: 14 }} />
                  Print Timeline
                </button>
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

function isSameCalendarDay(iso: string): boolean {
  return formatHumanDate(iso) === formatHumanDate(new Date());
}
