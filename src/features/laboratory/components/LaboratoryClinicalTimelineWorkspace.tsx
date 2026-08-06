'use client';

import {
  AlertTriangle,
  BadgeCheck,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Download,
  Droplet,
  FlaskConical,
  Inbox,
  Mail,
  MapPin,
  NotebookPen,
  Phone,
  Printer,
  Search,
  Send,
  User as UserIcon,
  UserPlus,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { AllergyBanner } from '@components/clinical/AllergyBanner';
import { ExportMenu } from '@/components/ExportMenu';
import { FilterDropdown } from '@components/shared/FilterDropdown';
import { Tooltip } from '@components/shared/Tooltip';
import { ROUTES } from '@/constants/routes';
import { useToast } from '@/hooks/useToast';
import { downloadPDF, escapeHtml } from '@/utils/export';
import { formatDateTime, formatHumanDate } from '@/utils/datetime';
import {
  getPatientDetail,
  resolvePatientIdByMrn,
} from '@/features/patients/__mocks__/patientFixtures';
import { useDirectoryPatients } from '@/features/registration/store/patientDirectoryStore';
import { useLabResults } from '@/features/laboratory/store/labResultStore';
import {
  deriveSampleType,
  groupIntoOrders,
  worstPriority,
  type RawLabOrder,
} from '@/features/laboratory/utils/labOrders';
import type { LabDepartment, LabResult } from '@/features/laboratory/__mocks__/labResultFixtures';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

// ── Timeline event derivation ────────────────────────────────────────────────
// Every event below is backed by a real timestamp/actor pair already on
// `LabResult` — see the plan's own gap analysis for which reference-image
// steps got merged (one real timestamp covering two image rows), renamed
// (to match what the field actually records), or dropped (no real field).

type EventType =
  | 'REGISTERED'
  | 'ORDER_CREATED'
  | 'SAMPLE_COLLECTED'
  | 'SAMPLE_RECEIVED'
  | 'ANALYSIS_STARTED'
  | 'RESULT_ENTERED'
  | 'RESULT_VERIFIED'
  | 'CRITICAL_REPORTED'
  | 'CRITICAL_ACKNOWLEDGED'
  | 'RESULT_PUBLISHED';

type TimelineEvent = {
  id: string;
  type: EventType;
  at: string;
  title: string;
  detail: string;
  actor: string;
  actorContext: string;
  department?: LabDepartment;
  expandDetail?: string;
};

const EVENT_CFG: Record<EventType, { label: string; icon: LucideIcon; color: string }> = {
  REGISTERED: { label: 'Patient Registered', icon: UserPlus, color: '#22C55E' },
  ORDER_CREATED: { label: 'Laboratory Order Created', icon: ClipboardList, color: '#8B5CF6' },
  SAMPLE_COLLECTED: { label: 'Sample Collected', icon: Droplet, color: '#F59E0B' },
  SAMPLE_RECEIVED: { label: 'Sample Received', icon: Inbox, color: '#3B82F6' },
  ANALYSIS_STARTED: { label: 'Analysis Started', icon: FlaskConical, color: '#EC4899' },
  RESULT_ENTERED: { label: 'Result Entered', icon: NotebookPen, color: '#00B4D8' },
  RESULT_VERIFIED: { label: 'Result Verified', icon: BadgeCheck, color: '#D97706' },
  CRITICAL_REPORTED: { label: 'Critical Value Reported', icon: AlertTriangle, color: '#EF4444' },
  CRITICAL_ACKNOWLEDGED: {
    label: 'Critical Value Acknowledged',
    icon: CheckCircle2,
    color: '#16A34A',
  },
  RESULT_PUBLISHED: { label: 'Result Published', icon: Send, color: '#22C55E' },
};

const EVENT_TYPE_OPTIONS = (Object.keys(EVENT_CFG) as EventType[]).map((k) => ({
  value: k,
  label: EVENT_CFG[k].label,
}));

const DEPARTMENTS: LabDepartment[] = [
  'Hematology',
  'Biochemistry',
  'Microbiology',
  'Immunology',
  'Coagulation',
];

function buildTestEvents(order: RawLabOrder, test: LabResult): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const testRef = `${test.testName} (${order.orderId})`;

  events.push({
    id: `${test.id}-ordered`,
    type: 'ORDER_CREATED',
    at: order.orderedAt,
    title: EVENT_CFG.ORDER_CREATED.label,
    detail: `${test.testName} ordered`,
    actor: order.isWalkIn ? 'Laboratory' : order.orderedBy,
    actorContext: order.isWalkIn ? 'Walk-in Collection' : 'Ordering Physician',
    department: test.department,
    expandDetail: `Order ID: ${order.orderId}`,
  });

  if (test.sampleCollectedAt) {
    events.push({
      id: `${test.id}-collected`,
      type: 'SAMPLE_COLLECTED',
      at: test.sampleCollectedAt,
      title: EVENT_CFG.SAMPLE_COLLECTED.label,
      detail: `Specimen collected for ${testRef}`,
      actor: test.sampleCollectedBy ?? '—',
      actorContext: 'Sample Collection',
      department: test.department,
    });
  }

  if (test.receivedAt) {
    events.push({
      id: `${test.id}-received`,
      type: 'SAMPLE_RECEIVED',
      at: test.receivedAt,
      title: EVENT_CFG.SAMPLE_RECEIVED.label,
      detail: `Sample received in laboratory for ${testRef}`,
      actor: test.receivedBy ?? '—',
      actorContext: 'Sample Reception',
      department: test.department,
    });
  }

  if (test.analysisStartedAt) {
    events.push({
      id: `${test.id}-started`,
      type: 'ANALYSIS_STARTED',
      at: test.analysisStartedAt,
      title: EVENT_CFG.ANALYSIS_STARTED.label,
      detail: `Testing in progress: ${test.testName}`,
      actor: test.analysisStartedBy ?? '—',
      actorContext: test.department,
      department: test.department,
    });
  }

  if (test.resultAt) {
    events.push({
      id: `${test.id}-entered`,
      type: 'RESULT_ENTERED',
      at: test.resultAt,
      title: EVENT_CFG.RESULT_ENTERED.label,
      detail: `Results entered for ${test.testName}`,
      actor: test.analysisStartedBy ?? test.receivedBy ?? '—',
      actorContext: test.department,
      department: test.department,
      ...(test.comment ? { expandDetail: test.comment } : {}),
    });
  }

  if (test.labVerifiedAt) {
    events.push({
      id: `${test.id}-labverified`,
      type: 'RESULT_VERIFIED',
      at: test.labVerifiedAt,
      title: EVENT_CFG.RESULT_VERIFIED.label,
      detail: `Result verified and approved for ${test.testName}`,
      actor: test.labVerifiedBy ?? '—',
      actorContext: 'Senior Lab Scientist',
      department: test.department,
    });
  }

  if (test.criticalCommunicatedAt) {
    events.push({
      id: `${test.id}-criticalcomm`,
      type: 'CRITICAL_REPORTED',
      at: test.criticalCommunicatedAt,
      title: EVENT_CFG.CRITICAL_REPORTED.label,
      detail: test.criticalValueLabel
        ? `${test.criticalValueLabel} communicated to clinician.`
        : `${test.testName} communicated to clinician.`,
      actor: test.criticalCommunicatedBy ?? '—',
      actorContext: 'Senior Lab Scientist',
      department: test.department,
    });
  }

  if (test.criticalAcknowledgedAt) {
    events.push({
      id: `${test.id}-criticalack`,
      type: 'CRITICAL_ACKNOWLEDGED',
      at: test.criticalAcknowledgedAt,
      title: EVENT_CFG.CRITICAL_ACKNOWLEDGED.label,
      detail: `Ward acknowledged the critical value for ${test.testName}.`,
      actor: test.criticalAcknowledgedBy ?? '—',
      actorContext: 'Nursing',
      department: test.department,
    });
  }

  if (test.doctorReviewedAt && test.status === 'VERIFIED') {
    events.push({
      id: `${test.id}-published`,
      type: 'RESULT_PUBLISHED',
      at: test.doctorReviewedAt,
      title: EVENT_CFG.RESULT_PUBLISHED.label,
      detail: `${test.testName} published and ready for clinical review.`,
      actor: test.doctorReviewedBy ?? '—',
      actorContext: 'Laboratory',
      department: test.department,
    });
  }

  return events;
}

function dateRangeCutoff(range: string): number | null {
  const now = new Date();
  if (range === 'TODAY')
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (range === 'YESTERDAY') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).getTime();
  }
  if (range === 'LAST_7_DAYS') return now.getTime() - 7 * 24 * 60 * 60 * 1000;
  if (range === 'LAST_30_DAYS') return now.getTime() - 30 * 24 * 60 * 60 * 1000;
  return null;
}

type FilterKey = 'dateRange' | 'eventType' | 'department';
type FilterState = { dateRange: string; eventType: string; department: string };
const FILTER_DEFAULTS: FilterState = { dateRange: 'ALL', eventType: 'ALL', department: 'ALL' };

const FILTER_DEFS: {
  key: FilterKey;
  defaultLabel: string;
  options: { value: string; label: string }[];
}[] = [
  {
    key: 'dateRange',
    defaultLabel: 'All Time',
    options: [
      { value: 'TODAY', label: 'Today' },
      { value: 'YESTERDAY', label: 'Yesterday' },
      { value: 'LAST_7_DAYS', label: 'Last 7 Days' },
      { value: 'LAST_30_DAYS', label: 'Last 30 Days' },
    ],
  },
  { key: 'eventType', defaultLabel: 'All Events', options: EVENT_TYPE_OPTIONS },
  {
    key: 'department',
    defaultLabel: 'All Departments',
    options: DEPARTMENTS.map((d) => ({ value: d, label: d })),
  },
];

type PatientOption = { mrn: string; patientName: string; patientId?: string; lastOrderAt: string };

function DetailField({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon style={{ width: 14, height: 14, color: '#8A98A3', marginTop: 3, flexShrink: 0 }} />
      <div className="min-w-0">
        <p style={{ fontSize: 14, color: '#8A98A3' }}>{label}</p>
        <Tooltip content={value}>
          <p className="truncate font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
            {value}
          </p>
        </Tooltip>
      </div>
    </div>
  );
}

const PAGE_INCREMENT = 10;

export function LaboratoryClinicalTimelineWorkspace() {
  const router = useRouter();
  const toast = useToast();
  const results = useLabResults();
  const directoryPatients = useDirectoryPatients();
  const allOrders = useMemo(() => groupIntoOrders(results), [results]);

  const [selectedMrn, setSelectedMrn] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterState>(FILTER_DEFAULTS);
  const [openFilter, setOpenFilter] = useState<FilterKey | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_INCREMENT);
  const [expandAll, setExpandAll] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const mrnParam = params.get('mrn');
      const patientIdParam = params.get('patientId');
      if (mrnParam) {
        setSelectedMrn(mrnParam);
      } else if (patientIdParam) {
        const match = allOrders.find((o) => o.patientId === patientIdParam);
        if (match) setSelectedMrn(match.mrn);
      }
    }, 0);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- URL read is one-time on mount; allOrders intentionally excluded
  }, []);

  const patientOptions = useMemo<PatientOption[]>(() => {
    const byMrn = new Map<string, PatientOption>();
    for (const order of allOrders) {
      const existing = byMrn.get(order.mrn);
      if (!existing || new Date(order.orderedAt) > new Date(existing.lastOrderAt)) {
        byMrn.set(order.mrn, {
          mrn: order.mrn,
          patientName: order.patientName,
          ...(order.patientId ? { patientId: order.patientId } : {}),
          lastOrderAt: order.orderedAt,
        });
      }
    }
    return Array.from(byMrn.values()).sort(
      (a, b) => new Date(b.lastOrderAt).getTime() - new Date(a.lastOrderAt).getTime(),
    );
  }, [allOrders]);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return patientOptions.slice(0, 20);
    return patientOptions
      .filter((p) => p.patientName.toLowerCase().includes(q) || p.mrn.toLowerCase().includes(q))
      .slice(0, 20);
  }, [patientOptions, searchQuery]);

  const patientOrders = useMemo(
    () => (selectedMrn ? allOrders.filter((o) => o.mrn === selectedMrn) : []),
    [allOrders, selectedMrn],
  );

  const resolvedPatientId = useMemo(() => {
    const fromOrder = patientOrders.find((o) => o.patientId)?.patientId;
    if (fromOrder) return fromOrder;
    return selectedMrn ? resolvePatientIdByMrn(selectedMrn) : null;
  }, [patientOrders, selectedMrn]);

  const patientDetail = useMemo(
    () => (resolvedPatientId ? getPatientDetail(resolvedPatientId) : null),
    [resolvedPatientId],
  );

  const registrationDate = useMemo(() => {
    if (!selectedMrn) return null;
    return directoryPatients.find((p) => p.mrn === selectedMrn)?.dateRegistered ?? null;
  }, [directoryPatients, selectedMrn]);

  const currentOrder = patientOrders[0];

  const allEvents = useMemo<TimelineEvent[]>(() => {
    const events: TimelineEvent[] = [];
    if (registrationDate) {
      events.push({
        id: `${selectedMrn}-registered`,
        type: 'REGISTERED',
        at: new Date(registrationDate).toISOString(),
        title: EVENT_CFG.REGISTERED.label,
        detail: 'Patient registration completed.',
        actor: 'Registration Officer',
        actorContext: 'Registration Desk',
      });
    }
    for (const order of patientOrders) {
      for (const test of order.tests) {
        events.push(...buildTestEvents(order, test));
      }
    }
    return events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  }, [patientOrders, registrationDate, selectedMrn]);

  const filteredEvents = useMemo(() => {
    const cutoff = dateRangeCutoff(filters.dateRange);
    return allEvents.filter((e) => {
      if (filters.eventType !== 'ALL' && e.type !== filters.eventType) return false;
      if (filters.department !== 'ALL' && e.department && e.department !== filters.department) {
        return false;
      }
      if (cutoff !== null && new Date(e.at).getTime() < cutoff) return false;
      return true;
    });
  }, [allEvents, filters]);

  const visibleEvents = filteredEvents.slice(0, visibleCount);
  const hasMore = visibleCount < filteredEvents.length;

  function setFilter(key: FilterKey, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setOpenFilter(null);
    setVisibleCount(PAGE_INCREMENT);
  }

  function resetFilters() {
    setFilters(FILTER_DEFAULTS);
    setVisibleCount(PAGE_INCREMENT);
  }

  function handleSelectPatient(option: PatientOption) {
    setSelectedMrn(option.mrn);
    setSearchQuery('');
    resetFilters();
  }

  function handleChangePatient() {
    setSelectedMrn(null);
    setSearchQuery('');
    resetFilters();
  }

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleExpandAll() {
    setExpandAll((prev) => !prev);
  }

  const hasActiveFilters =
    filters.dateRange !== 'ALL' || filters.eventType !== 'ALL' || filters.department !== 'ALL';

  function printTimeline() {
    const rows = filteredEvents
      .map(
        (e) =>
          `<tr><td>${escapeHtml(formatDateTime(e.at))}</td><td>${escapeHtml(e.title)}</td><td>${escapeHtml(e.detail)}</td><td>${escapeHtml(e.actor)}</td></tr>`,
      )
      .join('');
    downloadPDF(
      'Clinical Timeline',
      `<h1>Clinical Timeline</h1><p class="meta">${escapeHtml(patientDetail?.name ?? patientOrders[0]?.patientName ?? '')} · ${escapeHtml(selectedMrn ?? '')} — ${filteredEvents.length} event${filteredEvents.length === 1 ? '' : 's'}</p><hr/><table><thead><tr><th>Date/Time</th><th>Event</th><th>Detail</th><th>Actor</th></tr></thead><tbody>${rows}</tbody></table>`,
    );
    toast.success('Preparing timeline', 'Report opened in a new tab.');
  }

  // ── Step 1: search & select ──────────────────────────────────────────────
  if (!selectedMrn) {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
          <div className="mx-auto flex max-w-[720px] flex-col gap-4 px-4 py-10 sm:px-6">
            <div className="text-center">
              <h1
                className="font-display font-semibold"
                style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
              >
                Clinical Timeline
              </h1>
              <p className="mt-1" style={{ fontSize: 14, color: '#4A7080' }}>
                Search for a patient to view their chronological laboratory event history.
              </p>
            </div>

            <div
              className="rounded-[12px] p-4 sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <div
                className="flex h-11 items-center gap-2.5 rounded-[10px] px-3.5"
                style={{ border: '1px solid #0064821F', background: '#FFFFFF' }}
              >
                <Search style={{ width: 16, height: 16, color: '#8A98A3', flexShrink: 0 }} />
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by patient name or MRN…"
                  className={`min-w-0 flex-1 bg-transparent outline-none placeholder:text-[#8A98A3] ${FOCUS_RING}`}
                  style={{ fontSize: 14, color: '#0D2630' }}
                />
              </div>

              <div className="mt-4 flex flex-col">
                {searchResults.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 px-4 py-14 text-center">
                    <div
                      className="flex size-14 items-center justify-center rounded-full"
                      style={{ background: 'rgba(226,237,241,0.6)' }}
                    >
                      <UserIcon style={{ width: 28, height: 28, color: '#8A98A3' }} />
                    </div>
                    <p
                      className="font-sans font-semibold"
                      style={{ fontSize: 16, color: '#0D2630' }}
                    >
                      No patients match this search
                    </p>
                    <p style={{ fontSize: 14, color: '#4A7080' }}>Try a different name or MRN.</p>
                  </div>
                ) : (
                  searchResults.map((p) => (
                    <button
                      key={p.mrn}
                      type="button"
                      onClick={() => handleSelectPatient(p)}
                      className={`flex items-center justify-between gap-3 rounded-[10px] px-3.5 py-3 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                      style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                    >
                      <div className="min-w-0">
                        <p
                          className="truncate font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {p.patientName}
                        </p>
                        <p style={{ fontSize: 14, color: '#8A98A3' }}>{p.mrn}</p>
                      </div>
                      <p className="shrink-0" style={{ fontSize: 14, color: '#8A98A3' }}>
                        Last order {formatHumanDate(p.lastOrderAt)}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ── Step 2: merged timeline for the selected patient ─────────────────────
  const displayName = patientDetail?.name ?? patientOrders[0]?.patientName ?? selectedMrn;
  const displayGender = patientDetail?.gender ?? patientOrders[0]?.gender ?? '—';
  const displayAge = patientDetail?.age ?? '—';
  const displayDob =
    patientDetail?.dob && patientDetail.dob !== '—' ? formatHumanDate(patientDetail.dob) : '—';

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
            <button
              type="button"
              onClick={handleChangePatient}
              className={`font-sans transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
              style={{ color: '#4A7080' }}
            >
              Patient Records
            </button>
            <span style={{ color: '#8A98A3' }}>/</span>
            <span className="font-medium" style={{ color: '#0D2630' }}>
              Clinical Timeline
            </span>
          </div>

          {/* ── Header ──────────────────────────────────────────────────── */}
          <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1
                className="font-display font-semibold"
                style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
              >
                Clinical Timeline
              </h1>
              <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                View the chronological sequence of clinical and laboratory events for the selected
                patient.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleChangePatient}
                className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
              >
                <Search style={{ width: 15, height: 15 }} />
                Change Patient
              </button>
              <button
                type="button"
                onClick={printTimeline}
                className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
              >
                <Printer style={{ width: 15, height: 15 }} />
                Print Timeline
              </button>
              <ExportMenu
                variant="button"
                onExportPDF={printTimeline}
                onExportCSV={printTimeline}
              />
            </div>
          </div>

          {/* ── Patient identity banner ─────────────────────────────────── */}
          <div
            className="mt-5 flex flex-wrap items-start gap-5 rounded-[12px] p-4 sm:p-5"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <div
              className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full"
              style={{ background: '#E2EDF1' }}
            >
              <UserIcon style={{ width: 28, height: 28, color: '#8A98A3' }} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <p
                  className="font-display font-semibold"
                  style={{ fontSize: 20, color: '#0D2630' }}
                >
                  {displayName}
                </p>
                {patientDetail &&
                  patientDetail.queueStatus &&
                  patientDetail.queueStatus !== '—' && (
                    <span
                      className="rounded-full px-2.5 py-0.5 font-sans font-medium"
                      style={{
                        fontSize: 14,
                        color: '#16A34A',
                        border: '1px solid rgba(34,197,94,0.4)',
                        background: 'rgba(34,197,94,0.08)',
                      }}
                    >
                      {patientDetail.queueStatus}
                    </span>
                  )}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
                <DetailField icon={UserIcon} label="Patient ID" value={resolvedPatientId ?? '—'} />
                <DetailField
                  icon={UserIcon}
                  label="Gender / Age"
                  value={`${displayGender} / ${displayAge}`}
                />
                <DetailField icon={Calendar} label="Date of Birth" value={displayDob} />
                <DetailField
                  icon={Phone}
                  label="Phone Number"
                  value={patientDetail?.phone ?? '—'}
                />
                <DetailField icon={Mail} label="Email" value={patientDetail?.email ?? '—'} />
                <DetailField icon={MapPin} label="Address" value={patientDetail?.address ?? '—'} />
                <DetailField
                  icon={Droplet}
                  label="Blood Group"
                  value={patientDetail?.bloodGroup ?? '—'}
                />
                <DetailField
                  icon={AlertTriangle}
                  label="Allergies"
                  value={
                    patientDetail && patientDetail.allergies.length > 0
                      ? `${patientDetail.allergies.length} known`
                      : 'No known allergies'
                  }
                />
              </div>
            </div>
          </div>

          <div className="mt-3">
            <AllergyBanner allergies={patientDetail?.allergies ?? []} />
          </div>

          {/* ── Filters ─────────────────────────────────────────────────── */}
          <div
            className="mt-5 flex flex-wrap items-center gap-2.5 rounded-[12px] p-4"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            {FILTER_DEFS.map((def) => (
              <FilterDropdown
                key={def.key}
                def={def}
                value={filters[def.key]}
                isOpen={openFilter === def.key}
                onToggle={() => setOpenFilter(openFilter === def.key ? null : def.key)}
                onSelect={(v) => setFilter(def.key, v)}
              />
            ))}
            <button
              type="button"
              onClick={resetFilters}
              disabled={!hasActiveFilters}
              className={`flex h-11 items-center rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING}`}
              style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => setFilters((f) => ({ ...f }))}
              className={`ml-auto flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
              style={{ fontSize: 14, background: '#00B4D8' }}
            >
              Apply Filters
            </button>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
            {/* ── Left: timeline ──────────────────────────────────────────── */}
            <div className="flex min-w-0 flex-col gap-4">
              <div
                className="rounded-[12px] p-4 sm:p-5"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <div className="flex items-center justify-between">
                  <h2
                    className="font-display font-semibold"
                    style={{ fontSize: 18, lineHeight: '26px', color: '#0D2630' }}
                  >
                    Timeline View
                  </h2>
                  <button
                    type="button"
                    onClick={toggleExpandAll}
                    className={`flex items-center gap-1.5 font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                    style={{ fontSize: 14, color: '#00B4D8' }}
                  >
                    <ChevronDown
                      style={{
                        width: 15,
                        height: 15,
                        transform: expandAll ? 'rotate(180deg)' : undefined,
                        transition: 'transform 150ms',
                      }}
                    />
                    {expandAll ? 'Collapse All' : 'Expand All'}
                  </button>
                </div>

                {filteredEvents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
                    <div
                      className="flex size-14 items-center justify-center rounded-full"
                      style={{ background: 'rgba(226,237,241,0.6)' }}
                    >
                      <Search style={{ width: 28, height: 28, color: '#8A98A3' }} />
                    </div>
                    <p
                      className="font-sans font-semibold"
                      style={{ fontSize: 16, color: '#0D2630' }}
                    >
                      No events match this filter
                    </p>
                    <p style={{ fontSize: 14, color: '#4A7080' }}>
                      Try adjusting the filters above.
                    </p>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={resetFilters}
                        className={`mt-1 font-sans font-semibold transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                        style={{ fontSize: 14, color: '#00B4D8' }}
                      >
                        Clear all filters
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="mt-4 flex flex-col">
                    {visibleEvents.map((event, i) => {
                      const cfg = EVENT_CFG[event.type];
                      const Icon = cfg.icon;
                      const isLast = i === visibleEvents.length - 1;
                      const isOpen = expandAll || expandedIds.has(event.id);
                      return (
                        <div key={event.id} className="flex gap-3.5">
                          <div className="flex flex-col items-center">
                            <div
                              className="flex size-9 shrink-0 items-center justify-center rounded-full"
                              style={{ background: cfg.color }}
                            >
                              <Icon style={{ width: 16, height: 16, color: '#FFFFFF' }} />
                            </div>
                            {!isLast && (
                              <div
                                className="w-px flex-1"
                                style={{ background: 'rgba(0,100,130,0.15)', minHeight: 24 }}
                              />
                            )}
                          </div>
                          <div className="min-w-0 flex-1 pb-5">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="min-w-0">
                                <Tooltip content={formatDateTime(event.at)}>
                                  <p style={{ fontSize: 14, color: '#8A98A3' }}>
                                    {formatDateTime(event.at)}
                                  </p>
                                </Tooltip>
                                <p
                                  className="font-sans font-semibold"
                                  style={{ fontSize: 15, color: '#0D2630' }}
                                >
                                  {cfg.label}
                                </p>
                                <p
                                  className="mt-0.5"
                                  style={{
                                    fontSize: 14,
                                    color:
                                      event.type === 'CRITICAL_REPORTED' ? '#DC2626' : '#4A7080',
                                  }}
                                >
                                  {event.detail}
                                </p>
                              </div>
                              <div className="flex shrink-0 items-center gap-2">
                                <div className="text-right">
                                  <p
                                    className="font-sans font-medium"
                                    style={{ fontSize: 14, color: '#0D2630' }}
                                  >
                                    {event.actor}
                                  </p>
                                  <p style={{ fontSize: 14, color: '#8A98A3' }}>
                                    {event.actorContext}
                                  </p>
                                </div>
                                {event.expandDetail && (
                                  <button
                                    type="button"
                                    onClick={() => toggleExpanded(event.id)}
                                    aria-label={isOpen ? 'Collapse details' : 'Expand details'}
                                    className={`flex size-11 shrink-0 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[rgba(0,180,216,0.08)] ${FOCUS_RING}`}
                                  >
                                    <ChevronDown
                                      style={{
                                        width: 15,
                                        height: 15,
                                        color: '#4A7080',
                                        transform: isOpen ? 'rotate(180deg)' : undefined,
                                        transition: 'transform 150ms',
                                      }}
                                    />
                                  </button>
                                )}
                              </div>
                            </div>
                            {isOpen && event.expandDetail && (
                              <p
                                className="mt-2 rounded-[8px] px-3 py-2"
                                style={{ fontSize: 14, color: '#4A7080', background: '#F5FBFD' }}
                              >
                                {event.expandDetail}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {hasMore && (
                  <div className="mt-2 flex justify-center">
                    <button
                      type="button"
                      onClick={() => setVisibleCount((c) => c + PAGE_INCREMENT)}
                      className={`flex h-11 items-center gap-1.5 rounded-[10px] px-5 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                      style={{
                        fontSize: 14,
                        color: '#0D2630',
                        border: '1px solid rgba(0,100,130,0.2)',
                      }}
                    >
                      Load More Events
                      <ChevronDown style={{ width: 14, height: 14 }} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* ── Right rail ──────────────────────────────────────────────── */}
            <div className="flex flex-col gap-4">
              <div
                className="rounded-[12px] p-4 sm:p-5"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <div className="flex items-center justify-between">
                  <h2
                    className="font-display font-semibold"
                    style={{ fontSize: 18, lineHeight: '26px', color: '#0D2630' }}
                  >
                    Patient Summary
                  </h2>
                  {resolvedPatientId && (
                    <button
                      type="button"
                      onClick={() => router.push(ROUTES.patientProfile(resolvedPatientId))}
                      className={`font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                      style={{ fontSize: 14, color: '#00B4D8' }}
                    >
                      View Profile
                    </button>
                  )}
                </div>
                <div className="mt-3.5 flex flex-col gap-3">
                  <DetailField
                    icon={UserIcon}
                    label="Patient ID"
                    value={resolvedPatientId ?? '—'}
                  />
                  <DetailField
                    icon={UserIcon}
                    label="Age / Gender"
                    value={`${displayAge} / ${displayGender}`}
                  />
                  <DetailField
                    icon={Phone}
                    label="Phone Number"
                    value={patientDetail?.phone ?? '—'}
                  />
                  <DetailField icon={Mail} label="Email" value={patientDetail?.email ?? '—'} />
                  <DetailField
                    icon={MapPin}
                    label="Address"
                    value={patientDetail?.address ?? '—'}
                  />
                  <DetailField
                    icon={Droplet}
                    label="Blood Group"
                    value={patientDetail?.bloodGroup ?? '—'}
                  />
                  <DetailField
                    icon={AlertTriangle}
                    label="Allergies"
                    value={
                      patientDetail && patientDetail.allergies.length > 0
                        ? patientDetail.allergies.map((a) => a.substance).join(', ')
                        : 'No known allergies'
                    }
                  />
                </div>
              </div>

              {currentOrder && (
                <div
                  className="rounded-[12px] p-4 sm:p-5"
                  style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                >
                  <h2
                    className="font-display font-semibold"
                    style={{ fontSize: 18, lineHeight: '26px', color: '#0D2630' }}
                  >
                    Current Order Summary
                  </h2>
                  <div className="mt-3.5 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <p style={{ fontSize: 14, color: '#8A98A3' }}>Order ID</p>
                      <p
                        className="font-sans font-medium"
                        style={{ fontSize: 14, color: '#00B4D8' }}
                      >
                        {currentOrder.orderId}
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <p style={{ fontSize: 14, color: '#8A98A3' }}>Order Date</p>
                      <p
                        className="font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {formatDateTime(currentOrder.orderedAt)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <p style={{ fontSize: 14, color: '#8A98A3' }}>Ordered By</p>
                      <p
                        className="font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {currentOrder.isWalkIn ? 'Laboratory (Walk-in)' : currentOrder.orderedBy}
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <p style={{ fontSize: 14, color: '#8A98A3' }}>Priority</p>
                      <p
                        className="font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {worstPriority(currentOrder.tests)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <p style={{ fontSize: 14, color: '#8A98A3' }}>Specimen Type</p>
                      <p
                        className="font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {deriveSampleType(currentOrder.tests[0]!)}
                      </p>
                    </div>
                  </div>

                  <h3
                    className="font-display mt-4 font-semibold"
                    style={{ fontSize: 15, color: '#0D2630' }}
                  >
                    Tests ({currentOrder.tests.length})
                  </h3>
                  <div className="mt-2 flex flex-col gap-2.5">
                    {currentOrder.tests.map((t) => (
                      <div key={t.id} className="flex items-center justify-between gap-2">
                        <Tooltip content={t.testName}>
                          <p
                            className="min-w-0 flex-1 truncate"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {t.testName}
                          </p>
                        </Tooltip>
                        <span
                          className="shrink-0 rounded-full px-2.5 py-0.5 font-sans font-medium"
                          style={{
                            fontSize: 14,
                            color: t.status === 'VERIFIED' ? '#16A34A' : '#B45309',
                            border: `1px solid ${t.status === 'VERIFIED' ? 'rgba(34,197,94,0.4)' : 'rgba(245,158,11,0.4)'}`,
                            background:
                              t.status === 'VERIFIED'
                                ? 'rgba(34,197,94,0.08)'
                                : 'rgba(245,158,11,0.08)',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {t.status === 'VERIFIED' ? 'Completed' : 'Pending'}
                        </span>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => router.push(`${ROUTES.laboratoryHistory}?mrn=${selectedMrn}`)}
                    className={`mt-4 flex h-11 w-full items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                    style={{
                      fontSize: 14,
                      color: '#0D2630',
                      border: '1px solid rgba(0,100,130,0.2)',
                    }}
                  >
                    <Download style={{ width: 15, height: 15 }} />
                    View Laboratory History
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="h-4" />
        </div>
      </main>
    </div>
  );
}
