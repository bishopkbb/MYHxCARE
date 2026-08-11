'use client';

import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Eye,
  FlaskConical,
  RefreshCw,
  Send,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { AllergyBanner } from '@/components/clinical/AllergyBanner';
import { PermissionGate } from '@components/shared/PermissionGate';
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
import { LAB_CATEGORIES, type LabCategory } from '@/features/laboratory/__mocks__/labOrderFixtures';
import type {
  LabResultFlag,
  LabResultStatus,
} from '@/features/laboratory/__mocks__/labResultFixtures';
import {
  addLabOrder,
  markDoctorReviewed,
  useLabResults,
  verifyResult,
  type LabResultPriority,
} from '@/features/laboratory/store/labResultStore';
import {
  groupIntoOrders,
  worstPriority,
  type RawLabOrder,
} from '@/features/laboratory/utils/labOrders';
import {
  deriveLatestVitals,
  derivePriorityForEntry,
  PENDING_LABS_AFFECTING_MEDICATIONS,
} from '@/features/emergency/__mocks__/emergencyFixtures';
import { PatientSwitcher } from '@/features/emergency/components/PatientSwitcher';
import { useTriageRecords } from '@/features/emergency/store/triageAssessmentStore';

type PageState = 'loading' | 'loaded' | 'error';
type TabKey = 'New' | 'Requests';

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

const REQUEST_PRIORITY_CFG: Record<LabResultPriority, { color: string; activeBg: string }> = {
  STAT: { color: '#FFFFFF', activeBg: '#DC2626' },
  URGENT: { color: '#FFFFFF', activeBg: '#D97706' },
  ROUTINE: { color: '#0D2630', activeBg: '#E0F7FC' },
};
const PRIORITY_ORDER: LabResultPriority[] = ['STAT', 'URGENT', 'ROUTINE'];

const STATUS_CFG: Record<LabResultStatus, { label: string; color: string; bg: string }> = {
  ORDERED: { label: 'Ordered', color: '#4A7080', bg: 'rgba(74,112,128,0.1)' },
  SAMPLE_COLLECTED: { label: 'Sample Collected', color: '#2563EB', bg: 'rgba(37,99,235,0.1)' },
  IN_PROCESS: { label: 'In Process', color: '#D97706', bg: 'rgba(217,119,6,0.1)' },
  RESULTED: { label: 'Resulted', color: '#7C3AED', bg: 'rgba(124,58,237,0.1)' },
  VERIFIED: { label: 'Verified', color: '#16A34A', bg: 'rgba(22,163,74,0.1)' },
  REJECTED: { label: 'Rejected', color: '#DC2626', bg: 'rgba(220,38,38,0.1)' },
};
const FLAG_CFG: Record<LabResultFlag, { color: string; bg: string }> = {
  NORMAL: { color: '#16A34A', bg: 'rgba(22,163,74,0.1)' },
  ABNORMAL: { color: '#D97706', bg: 'rgba(217,119,6,0.1)' },
  CRITICAL: { color: '#DC2626', bg: 'rgba(220,38,38,0.1)' },
};

/** An order's overall status is as advanced as its least-progressed test —
 * same convention as `TEST_STATUS_RANK`'s own doc comment; REJECTED wins if
 * any test on the order was rejected. */
function overallStatus(order: RawLabOrder): LabResultStatus {
  if (order.tests.some((t) => t.status === 'REJECTED')) return 'REJECTED';
  const rank: Record<LabResultStatus, number> = {
    ORDERED: 0,
    SAMPLE_COLLECTED: 1,
    IN_PROCESS: 2,
    RESULTED: 3,
    VERIFIED: 4,
    REJECTED: -1,
  };
  return order.tests.reduce<LabResultStatus>(
    (worst, t) => (rank[t.status] < rank[worst] ? t.status : worst),
    order.tests[0]!.status,
  );
}

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <span
      className="flex size-5 shrink-0 items-center justify-center rounded-[4px] transition-colors duration-150"
      style={{
        border: checked ? '2px solid #00B4D8' : '2px solid rgba(0,100,130,0.2)',
        background: checked ? '#00B4D8' : '#FFFFFF',
      }}
    >
      {checked && <Check style={{ width: 12, height: 12, color: '#FFFFFF', strokeWidth: 3 }} />}
    </span>
  );
}

function LabCategoryCard({
  category,
  selected,
  onToggle,
}: {
  category: LabCategory;
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div
      className="flex flex-col overflow-hidden rounded-[12px]"
      style={{ border: '1px solid rgba(0,100,130,0.12)', background: '#FFFFFF' }}
    >
      <div
        className="px-4 py-2"
        style={{
          background: 'rgba(226,237,241,0.5)',
          borderBottom: '1px solid rgba(0,100,130,0.12)',
        }}
      >
        <span className="font-display font-semibold" style={{ fontSize: 15, color: '#0D2630' }}>
          {category.title}
        </span>
      </div>
      <div className="flex flex-col p-2">
        {category.tests.map((test) => {
          const isChecked = selected.has(test.id);
          return (
            <button
              key={test.id}
              type="button"
              onClick={() => onToggle(test.id)}
              className={`flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
              style={{ background: isChecked ? 'rgba(0,180,216,0.06)' : 'transparent' }}
            >
              <Checkbox checked={isChecked} />
              <span style={{ fontSize: 14, color: '#0D2630' }}>{test.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function EmergencyDiagnosticRequestsWorkspace() {
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const entryId = searchParams.get('entryId');

  const [pageState, setPageState] = useState<PageState>('loading');
  const [activeTab, setActiveTab] = useState<TabKey>('New');
  const [priority, setPriority] = useState<LabResultPriority>('ROUTINE');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

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
  const priorityTier: TriagePriority =
    triageRecord?.priority ?? (entry ? derivePriorityForEntry(entry.id) : 'NON_URGENT');
  const attendingPhysician = triageRecord?.assignedDoctorName ?? entry?.attendingDoctor ?? '—';
  const defaultAuthor = user?.name ?? attendingPhysician;

  const patientResults = entry ? allResults.filter((r) => r.mrn === entry.mrn) : [];
  const patientOrders = groupIntoOrders(patientResults);
  const criticalUnreviewed = patientResults.filter(
    (r) => r.flag === 'CRITICAL' && !r.doctorReviewedAt,
  );

  function toggleTest(testId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(testId)) next.delete(testId);
      else next.add(testId);
      return next;
    });
  }

  function handleSubmit() {
    if (!entry) return;
    if (selected.size === 0) {
      toast.error('No tests selected', 'Select at least one test to submit.');
      return;
    }
    const initials = entry.patientName
      .split(/\s+/)
      .map((n) => n[0])
      .slice(0, 2)
      .join('');
    addLabOrder({
      patientName: entry.patientName,
      mrn: entry.mrn,
      initials,
      avatarBg: PRIORITY_COLOR[priorityTier],
      age: entry.age,
      gender: entry.gender,
      testIds: Array.from(selected),
      priority,
      orderedBy: defaultAuthor,
    });
    toast.success(
      'Request sent',
      `${selected.size} test${selected.size !== 1 ? 's' : ''} dispatched to the laboratory at ${priority} priority.`,
    );
    setSelected(new Set());
    setNotes('');
    setPriority('ROUTINE');
    setActiveTab('Requests');
  }

  function handleMarkReviewed(id: string) {
    markDoctorReviewed(id, defaultAuthor);
    toast.success('Marked reviewed', 'Result marked as reviewed.');
  }
  function handleVerify(id: string) {
    verifyResult(id, defaultAuthor);
    toast.success('Result verified', 'Result signed off and published.');
  }

  if (pageState === 'error') {
    return (
      <main className="flex flex-1 items-center justify-center" style={{ background: '#F5FBFD' }}>
        <div className="flex flex-col items-center gap-3 px-6 text-center">
          <AlertCircle style={{ width: 40, height: 40, color: '#DC2626' }} />
          <p className="font-display font-semibold" style={{ fontSize: 18, color: '#0D2630' }}>
            Couldn&apos;t load Diagnostic Requests
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
            <FlaskConical style={{ width: 28, height: 28, color: '#8A98A3' }} />
          </div>
          <p className="font-display font-semibold" style={{ fontSize: 18, color: '#0D2630' }}>
            No emergency patients in the queue
          </p>
          <p style={{ fontSize: 14, color: '#4A7080' }}>
            Diagnostic requests need a patient currently in the emergency department.
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
            Diagnostic Requests
          </span>
        </div>

        {/* Header */}
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <FlaskConical style={{ width: 22, height: 22, color: '#DC2626' }} />
            <div>
              <h1 className="font-display font-bold" style={{ fontSize: 24, color: '#0D2630' }}>
                Diagnostic Requests
              </h1>
              <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
                Request lab tests and imaging, and track results, for the current patient.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                handleRetry();
                toast.success('Refreshed', 'Showing the latest diagnostic requests.');
              }}
              className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
              style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
            >
              <RefreshCw style={{ width: 15, height: 15 }} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => router.push(ROUTES.labResults)}
              className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
              style={{ fontSize: 14, color: '#00B4D8', border: '1px solid #00B4D8' }}
            >
              <ClipboardCheck style={{ width: 15, height: 15 }} />
              View All Lab Results
            </button>
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
              style={{ background: PRIORITY_COLOR[priorityTier], fontSize: 14 }}
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
                  color: PRIORITY_COLOR[priorityTier],
                  background: PRIORITY_BG[priorityTier],
                }}
              >
                {getTriageDisplay(priorityTier).label}
              </span>
              <p
                className="font-display mt-0.5 font-semibold"
                style={{ fontSize: 17, color: '#0D2630' }}
              >
                {entry.patientName}
              </p>
              <p style={{ fontSize: 14, color: '#4A7080' }}>
                MRN: {entry.mrn} · {entry.age} Years, {entry.gender}
              </p>
            </div>
          </div>
          <div>
            <p style={{ fontSize: 14, color: '#8A98A3' }}>Location</p>
            <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
              ER-01, Resus Bay
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
              { key: 'New', label: 'New Request', count: null },
              { key: 'Requests', label: 'My Requests', count: patientOrders.length },
            ] as { key: TabKey; label: string; count: number | null }[]
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
                {tab.count !== null && (
                  <span
                    className="rounded-full px-1.5 py-0.5 font-sans font-medium"
                    style={{
                      fontSize: 14,
                      color: isActive ? '#00B4D8' : '#8A98A3',
                      background: isActive ? 'rgba(0,180,216,0.1)' : 'rgba(138,152,163,0.12)',
                    }}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Main grid */}
        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_320px] xl:items-start">
          <div className="flex min-w-0 flex-col gap-4">
            {activeTab === 'New' && (
              <>
                <div
                  className="rounded-[12px] p-4"
                  style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                >
                  <p
                    className="font-display mb-3 font-semibold"
                    style={{ fontSize: 18, color: '#0D2630' }}
                  >
                    Request Priority
                  </p>
                  <div className="flex gap-2">
                    {PRIORITY_ORDER.map((p) => {
                      const cfg = REQUEST_PRIORITY_CFG[p];
                      const isActive = priority === p;
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPriority(p)}
                          className={`flex h-12 flex-1 items-center justify-center rounded-[10px] font-sans font-semibold transition-colors duration-150 ${FOCUS_RING}`}
                          style={{
                            fontSize: 15,
                            background: isActive ? cfg.activeBg : '#FFFFFF',
                            color: isActive ? cfg.color : '#4A7080',
                            border: isActive
                              ? `2px solid ${cfg.activeBg}`
                              : '1px solid rgba(0,100,130,0.15)',
                          }}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>
                  {priority === 'STAT' && (
                    <div className="mt-3 flex items-center gap-2">
                      <AlertTriangle
                        style={{ width: 15, height: 15, color: '#DC2626' }}
                        className="shrink-0"
                      />
                      <p style={{ fontSize: 14, color: '#DC2626' }}>
                        STAT: for life-threatening conditions only — processed immediately.
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {LAB_CATEGORIES.map((cat) => (
                    <LabCategoryCard
                      key={cat.id}
                      category={cat}
                      selected={selected}
                      onToggle={toggleTest}
                    />
                  ))}
                </div>

                <div
                  className="rounded-[12px] p-4"
                  style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                >
                  <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
                    Clinical Notes for Laboratory
                  </p>
                  <textarea
                    value={notes}
                    onChange={(e) => e.target.value.length <= 500 && setNotes(e.target.value)}
                    rows={3}
                    placeholder="Clinical indication, relevant history, suspected diagnosis for the laboratory team..."
                    className={`mt-2.5 w-full resize-none rounded-[10px] p-3 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                    style={{
                      fontSize: 14,
                      border: '1px solid rgba(0,100,130,0.18)',
                      color: '#0D2630',
                    }}
                  />
                  <p className="mt-1 text-right" style={{ fontSize: 14, color: '#8A98A3' }}>
                    {notes.length}/500
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p style={{ fontSize: 14, color: '#4A7080' }}>
                    {selected.size === 0
                      ? 'No tests selected'
                      : `${selected.size} test${selected.size !== 1 ? 's' : ''} selected`}
                  </p>
                  <PermissionGate permission={PERMISSIONS.LAB_ORDERS_WRITE}>
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={selected.size === 0}
                      className={`flex h-11 items-center gap-2 rounded-[10px] px-5 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
                      style={{ fontSize: 14, background: '#00B4D8' }}
                    >
                      <Send style={{ width: 15, height: 15 }} />
                      Send Request to Laboratory
                    </button>
                  </PermissionGate>
                </div>
              </>
            )}

            {activeTab === 'Requests' && (
              <div
                className="rounded-[12px]"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                {patientOrders.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
                    <div
                      className="flex size-14 items-center justify-center rounded-full"
                      style={{ background: 'rgba(226,237,241,0.6)' }}
                    >
                      <FlaskConical style={{ width: 28, height: 28, color: '#8A98A3' }} />
                    </div>
                    <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                      No diagnostic requests yet
                    </p>
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>
                      Use &quot;New Request&quot; to send tests to the laboratory.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('New')}
                      className={`mt-1 font-sans font-medium transition-colors duration-150 hover:underline ${FOCUS_RING}`}
                      style={{ fontSize: 14, color: '#00B4D8' }}
                    >
                      New Request
                    </button>
                  </div>
                ) : (
                  <ScrollableTable minWidth={960}>
                    <div
                      className={`flex items-center rounded-t-[12px] ${TABLE_HEADER_STICKY_CLASS}`}
                      style={{ background: TABLE_HEADER_BG, borderBottom: '1px solid #E6F8FD' }}
                    >
                      {[
                        ['Order ID', 'w-36'],
                        ['Tests', 'min-w-[220px] flex-1'],
                        ['Priority', 'w-24'],
                        ['Status', 'w-36'],
                        ['Ordered By', 'w-32'],
                        ['Ordered At', 'w-32'],
                        ['', 'w-16'],
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
                    {patientOrders.map((order) => {
                      const status = overallStatus(order);
                      const statusCfg = STATUS_CFG[status];
                      const orderPriority = worstPriority(order.tests);
                      const isExpanded = expandedOrderId === order.groupKey;
                      return (
                        <div key={order.groupKey}>
                          <div
                            className="flex cursor-pointer items-center transition-colors duration-150 hover:bg-[#F5FBFD]"
                            onClick={() =>
                              setExpandedOrderId((p) =>
                                p === order.groupKey ? null : order.groupKey,
                              )
                            }
                            style={{
                              borderBottom: isExpanded ? 'none' : '1px solid rgba(0,100,130,0.08)',
                            }}
                          >
                            <div className="w-36 shrink-0 px-2 py-3 text-center">
                              <p
                                className="font-sans font-medium"
                                style={{ fontSize: 14, color: '#0D2630' }}
                              >
                                {order.orderId}
                              </p>
                            </div>
                            <div className="min-w-[220px] flex-1 px-2 py-3 text-center">
                              <Tooltip content={order.tests.map((t) => t.testName).join(', ')}>
                                <p className="truncate" style={{ fontSize: 14, color: '#0D2630' }}>
                                  {order.tests.length} test{order.tests.length !== 1 ? 's' : ''} ·{' '}
                                  {order.tests
                                    .slice(0, 2)
                                    .map((t) => t.testName)
                                    .join(', ')}
                                  {order.tests.length > 2 ? '…' : ''}
                                </p>
                              </Tooltip>
                            </div>
                            <div className="w-24 shrink-0 px-2 py-3 text-center">
                              <span
                                className="inline-flex items-center rounded-[6px] px-2 py-0.5 font-sans font-semibold whitespace-nowrap"
                                style={{
                                  fontSize: 14,
                                  color: REQUEST_PRIORITY_CFG[orderPriority].activeBg,
                                  background:
                                    orderPriority === 'ROUTINE'
                                      ? 'rgba(0,180,216,0.1)'
                                      : `${REQUEST_PRIORITY_CFG[orderPriority].activeBg}1A`,
                                }}
                              >
                                {orderPriority}
                              </span>
                            </div>
                            <div className="w-36 shrink-0 px-2 py-3 text-center">
                              <span
                                className="inline-flex items-center rounded-[6px] px-2 py-0.5 font-sans font-semibold whitespace-nowrap"
                                style={{
                                  fontSize: 14,
                                  color: statusCfg.color,
                                  background: statusCfg.bg,
                                }}
                              >
                                {statusCfg.label}
                              </span>
                            </div>
                            <div className="w-32 shrink-0 px-2 py-3 text-center">
                              <Tooltip content={order.orderedBy}>
                                <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                                  {order.orderedBy}
                                </p>
                              </Tooltip>
                            </div>
                            <div className="w-32 shrink-0 px-2 py-3 text-center">
                              <p style={{ fontSize: 14, color: '#4A7080' }}>
                                {formatTime(order.orderedAt)}
                              </p>
                              <p style={{ fontSize: 14, color: '#8A98A3' }}>
                                {formatHumanDate(order.orderedAt)}
                              </p>
                            </div>
                            <div
                              className="flex w-16 shrink-0 items-center justify-center px-2 py-3"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedOrderId((p) =>
                                    p === order.groupKey ? null : order.groupKey,
                                  )
                                }
                                aria-label="View tests"
                                className={`flex size-9 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                              >
                                <Eye style={{ width: 16, height: 16, color: '#4A7080' }} />
                              </button>
                            </div>
                          </div>
                          {isExpanded && (
                            <div
                              className="flex flex-col gap-2 px-6 py-3"
                              style={{
                                background: '#F5FBFD',
                                borderBottom: '1px solid rgba(0,100,130,0.08)',
                              }}
                            >
                              {order.tests.map((test) => (
                                <div
                                  key={test.id}
                                  className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] bg-white p-3"
                                  style={{ border: '1px solid rgba(0,100,130,0.1)' }}
                                >
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p
                                        className="font-sans font-medium"
                                        style={{ fontSize: 14, color: '#0D2630' }}
                                      >
                                        {test.testName}
                                      </p>
                                      {test.flag && (
                                        <span
                                          className="rounded-full px-2 py-0.5 font-sans font-medium"
                                          style={{
                                            fontSize: 14,
                                            color: FLAG_CFG[test.flag].color,
                                            background: FLAG_CFG[test.flag].bg,
                                          }}
                                        >
                                          {test.flag}
                                        </span>
                                      )}
                                    </div>
                                    <p style={{ fontSize: 14, color: '#8A98A3' }}>
                                      {test.department} · {STATUS_CFG[test.status].label}
                                      {test.resultAt && ` · Resulted ${formatTime(test.resultAt)}`}
                                    </p>
                                    {test.comment && (
                                      <p
                                        className="mt-1"
                                        style={{ fontSize: 14, color: '#4A7080' }}
                                      >
                                        {test.comment}
                                      </p>
                                    )}
                                  </div>
                                  {test.status === 'RESULTED' && (
                                    <PermissionGate permission={PERMISSIONS.LAB_RESULTS_WRITE}>
                                      <div className="flex shrink-0 gap-2">
                                        {!test.doctorReviewedAt && (
                                          <button
                                            type="button"
                                            onClick={() => handleMarkReviewed(test.id)}
                                            className={`flex h-9 items-center rounded-[8px] px-3 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                                            style={{
                                              fontSize: 14,
                                              color: '#0D2630',
                                              border: '1px solid rgba(0,100,130,0.2)',
                                            }}
                                          >
                                            Mark Reviewed
                                          </button>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => handleVerify(test.id)}
                                          className={`flex h-9 items-center gap-1.5 rounded-[8px] px-3 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                                          style={{ fontSize: 14, background: '#16A34A' }}
                                        >
                                          <CheckCircle2 style={{ width: 14, height: 14 }} />
                                          Verify Result
                                        </button>
                                      </div>
                                    </PermissionGate>
                                  )}
                                  {test.status === 'VERIFIED' && (
                                    <span
                                      className="inline-flex shrink-0 items-center gap-1.5 font-sans font-medium"
                                      style={{ fontSize: 14, color: '#16A34A' }}
                                    >
                                      <CheckCircle2 style={{ width: 14, height: 14 }} />
                                      Verified
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </ScrollableTable>
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
              <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Patient Summary
              </p>
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
                    style={{ fontSize: 14, color: PRIORITY_COLOR[priorityTier] }}
                  >
                    {getTriageDisplay(priorityTier).label}
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
                </div>
              </div>
            </div>

            {criticalUnreviewed.length > 0 && (
              <div
                className="rounded-[12px] p-4"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <p
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Critical Alerts
                </p>
                <div className="mt-2.5 flex flex-col gap-2">
                  {criticalUnreviewed.map((r) => (
                    <div
                      key={r.id}
                      className="rounded-[10px] p-3"
                      style={{ background: 'rgba(220,38,38,0.06)' }}
                    >
                      <div className="flex items-start gap-2">
                        <AlertTriangle
                          style={{ width: 15, height: 15, color: '#DC2626' }}
                          className="mt-0.5 shrink-0"
                        />
                        <div className="min-w-0">
                          <p
                            className="font-sans font-semibold"
                            style={{ fontSize: 14, color: '#DC2626' }}
                          >
                            {r.testName}
                          </p>
                          <p style={{ fontSize: 14, color: '#4A7080' }}>
                            {r.criticalValueLabel ?? 'Critical value — review required.'}
                          </p>
                        </div>
                      </div>
                      <PermissionGate permission={PERMISSIONS.LAB_RESULTS_WRITE}>
                        <button
                          type="button"
                          onClick={() => {
                            handleMarkReviewed(r.id);
                            setActiveTab('Requests');
                          }}
                          className={`mt-2 font-sans font-medium transition-colors duration-150 hover:underline ${FOCUS_RING}`}
                          style={{ fontSize: 14, color: '#DC2626' }}
                        >
                          Mark Reviewed
                        </button>
                      </PermissionGate>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div
              className="rounded-[12px] p-4"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Pending Labs Affecting Medications
              </p>
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
              <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Quick Actions
              </p>
              <div className="mt-2.5 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => router.push(ROUTES.labResults)}
                  className={`flex h-10 items-center justify-center gap-1.5 rounded-[8px] px-2 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                  style={{
                    fontSize: 14,
                    color: '#0D2630',
                    border: '1px solid rgba(0,100,130,0.2)',
                  }}
                >
                  View All Lab Results
                </button>
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
                  Add Clinical Note
                </button>
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
                  View Medication Orders
                </button>
              </div>
            </div>

            {patientOrders.length > 0 && (
              <div
                className="rounded-[12px] p-4"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <div className="flex items-center justify-between">
                  <p
                    className="font-display font-semibold"
                    style={{ fontSize: 16, color: '#0D2630' }}
                  >
                    Recent Requests
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('Requests')}
                    className={`font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                    style={{ fontSize: 14, color: '#00B4D8' }}
                  >
                    View All
                  </button>
                </div>
                <div className="mt-2.5 flex flex-col gap-2.5">
                  {patientOrders.slice(0, 3).map((order) => (
                    <div key={order.groupKey} className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p
                          className="truncate font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {order.tests.length} test{order.tests.length !== 1 ? 's' : ''}
                        </p>
                        <p style={{ fontSize: 14, color: '#8A98A3' }}>
                          {STATUS_CFG[overallStatus(order)].label}
                        </p>
                      </div>
                      <span className="shrink-0" style={{ fontSize: 14, color: '#8A98A3' }}>
                        {formatTime(order.orderedAt)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <p className="mt-4 text-center" style={{ fontSize: 14, color: '#8A98A3' }}>
          All times are current. Data updates automatically.
        </p>
      </div>
    </main>
  );
}
