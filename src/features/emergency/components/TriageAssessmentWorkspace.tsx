'use client';

import {
  AlertCircle,
  AlertTriangle,
  Bed,
  Check,
  CheckCircle2,
  ChevronRight,
  FileText,
  Pencil,
  RefreshCw,
  Users,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { AllergyBanner } from '@/components/clinical/AllergyBanner';
import { PermissionGate } from '@components/shared/PermissionGate';
import { PERMISSIONS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
import { useToast } from '@/hooks/useToast';
import { formatHumanDate, formatTime } from '@/utils/datetime';
import type { TriagePriority } from '@/utils/triage';
import type { Allergy } from '@/types/patient.types';
import { useQueueEntries } from '@/features/registration/store/registrationQueueStore';
import type { QueueEntry } from '@/features/registration/__mocks__/queueFixtures';
import { DOCTORS } from '@/features/shared/__mocks__/doctorDirectory';
import {
  deriveComplaintForEntry,
  deriveSourceForEntry,
  derivePhoneForEntry,
  EMERGENCY_TRIAGE_NURSES,
  ONSET_OPTIONS,
  PRIMARY_CONCERN_OPTIONS,
  type ArrivalSource,
} from '@/features/emergency/__mocks__/emergencyFixtures';
import {
  completeTriage,
  MANCHESTER_ANSWERS_DEFAULT,
  TRIAGE_VITALS_DEFAULT,
  useTriageRecords,
  type ManchesterAnswers,
  type TriageRecord,
  type TriageVitals,
} from '@/features/emergency/store/triageAssessmentStore';

type PageState = 'loading' | 'loaded' | 'error';
type StepId = 1 | 2 | 3 | 4 | 5;

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const STEPS: { id: StepId; label: string }[] = [
  { id: 1, label: 'Patient Identification' },
  { id: 2, label: 'Triage Assessment' },
  { id: 3, label: 'Vital Signs' },
  { id: 4, label: 'Priority & Disposition' },
  { id: 5, label: 'Review & Complete' },
];

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

const MANCHESTER_REFERENCE: {
  n: number;
  color: string;
  bg: string;
  label: string;
  desc: string;
  wait: string;
}[] = [
  {
    n: 1,
    color: '#DC2626',
    bg: 'rgba(220,38,38,0.06)',
    label: 'RED - IMMEDIATE',
    desc: 'Life threatening condition — immediate treatment',
    wait: 'Waiting time: 0 minutes',
  },
  {
    n: 2,
    color: '#D97706',
    bg: 'rgba(217,119,6,0.06)',
    label: 'ORANGE - VERY URGENT',
    desc: 'Serious condition — needs prompt attention',
    wait: 'Waiting time: 10 minutes',
  },
  {
    n: 3,
    color: '#CA8A04',
    bg: 'rgba(202,138,4,0.06)',
    label: 'YELLOW - URGENT',
    desc: 'Stable condition — can wait short time',
    wait: 'Waiting time: 60 minutes',
  },
  {
    n: 4,
    color: '#16A34A',
    bg: 'rgba(22,163,74,0.06)',
    label: 'GREEN - STANDARD',
    desc: 'Less urgent condition — can wait longer',
    wait: 'Waiting time: 120 minutes',
  },
  {
    n: 5,
    color: '#0284C7',
    bg: 'rgba(2,132,199,0.06)',
    label: 'BLUE - NON-URGENT',
    desc: 'Minor condition — can wait longest',
    wait: 'Waiting time: 240 minutes',
  },
];

type ManchesterQuestion = {
  key: keyof ManchesterAnswers;
  n: number;
  text: string;
  summaryLabel: string;
};

const MANCHESTER_QUESTIONS: ManchesterQuestion[] = [
  { key: 'ableToWalk', n: 1, text: 'Is the patient able to walk?', summaryLabel: 'Walking' },
  {
    key: 'abnormalBreathing',
    n: 2,
    text: 'Does the patient have abnormal breathing?',
    summaryLabel: 'Breathing',
  },
  {
    key: 'abnormalRespRate',
    n: 3,
    text: "Is the patient's respiratory rate abnormal?",
    summaryLabel: 'Respiratory Rate',
  },
  {
    key: 'spo2Low',
    n: 4,
    text: "Is the patient's SpO₂ < 92%?",
    summaryLabel: 'SpO₂ < 92%',
  },
  {
    key: 'severePain',
    n: 5,
    text: 'Is the patient experiencing severe pain?',
    summaryLabel: 'Severe Pain',
  },
  {
    key: 'shock',
    n: 6,
    text: 'Is the patient showing signs of shock?',
    summaryLabel: 'Shock',
  },
  {
    key: 'lifeThreatening',
    n: 7,
    text: 'Any life threatening condition present?',
    summaryLabel: 'Life Threatening Condition',
  },
];

/** Manchester's 5-tier reference panel is shown for clinical accuracy, but
 * the assigned result is one of this app's canonical 4-tier TriagePriority
 * values (decided with the user) — Blue/non-urgent-equivalent answers map to
 * NON_URGENT alongside Green, since there is no 5th tier in TriagePriority. */
function computeManchesterPriority(answers: ManchesterAnswers): TriagePriority | null {
  const allAnswered = MANCHESTER_QUESTIONS.every((q) => answers[q.key] !== null);
  if (!allAnswered) return null;
  if (answers.lifeThreatening) return 'IMMEDIATE';
  if (answers.shock) return 'URGENT';
  if (answers.abnormalBreathing && answers.spo2Low) return 'URGENT';
  if (
    answers.abnormalBreathing ||
    answers.abnormalRespRate ||
    answers.spo2Low ||
    answers.severePain
  ) {
    return 'LESS_URGENT';
  }
  if (answers.ableToWalk === false) return 'LESS_URGENT';
  return 'NON_URGENT';
}

function recommendedActions(priority: TriagePriority): string[] {
  switch (priority) {
    case 'IMMEDIATE':
      return [
        'Immediate clinical assessment by doctor',
        'Continuous monitoring',
        'Prepare for emergency intervention',
      ];
    case 'URGENT':
      return [
        'Clinical assessment within 10 minutes',
        'Frequent re-observation while waiting',
        'Notify attending doctor',
      ];
    case 'LESS_URGENT':
      return [
        'Clinical assessment within 60 minutes',
        'Re-triage if condition changes',
        'Routine observation while waiting',
      ];
    case 'NON_URGENT':
      return ['Clinical assessment within 120 minutes', 'Safe to wait in the general waiting area'];
  }
}

function ManchesterResultLabel(priority: TriagePriority): { label: string; short: string } {
  switch (priority) {
    case 'IMMEDIATE':
      return { label: 'RED - IMMEDIATE', short: 'Priority 1' };
    case 'URGENT':
      return { label: 'ORANGE - VERY URGENT', short: 'Priority 2' };
    case 'LESS_URGENT':
      return { label: 'YELLOW - URGENT', short: 'Priority 3' };
    case 'NON_URGENT':
      return { label: 'GREEN - STANDARD', short: 'Priority 4' };
  }
}

// ── Small building blocks ──────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label
      className="mb-1.5 block font-sans font-medium"
      style={{ fontSize: 14, color: '#0D2630' }}
    >
      {children}
    </label>
  );
}

const INPUT_CLASS =
  'h-11 w-full rounded-[10px] px-3.5 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40';
const INPUT_STYLE = { fontSize: 14, border: '1px solid rgba(0,100,130,0.18)', color: '#0D2630' };

function YesNoToggle({
  value,
  onChange,
}: {
  value: boolean | null;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`flex h-9 w-16 items-center justify-center rounded-[8px] font-sans font-semibold transition-colors duration-150 ${FOCUS_RING}`}
        style={{
          fontSize: 14,
          background: value === true ? '#0D2630' : '#FFFFFF',
          color: value === true ? '#FFFFFF' : '#4A7080',
          border: value === true ? 'none' : '1px solid rgba(0,100,130,0.2)',
        }}
      >
        Yes
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`flex h-9 w-16 items-center justify-center rounded-[8px] font-sans font-semibold transition-colors duration-150 ${FOCUS_RING}`}
        style={{
          fontSize: 14,
          background: value === false ? '#0D2630' : '#FFFFFF',
          color: value === false ? '#FFFFFF' : '#4A7080',
          border: value === false ? 'none' : '1px solid rgba(0,100,130,0.2)',
        }}
      >
        No
      </button>
    </div>
  );
}

function Stepper({ currentStep }: { currentStep: StepId }) {
  return (
    <div className="hidden items-start lg:flex">
      {STEPS.map((step, i) => {
        const isDone = step.id < currentStep;
        const isActive = step.id === currentStep;
        return (
          <div key={step.id} className="flex items-center">
            {i > 0 && (
              <div
                className="mx-1.5 mt-4 h-px w-8 shrink-0 xl:w-12"
                style={{ background: isDone ? '#00B4D8' : 'rgba(0,100,130,0.18)' }}
              />
            )}
            <div className="flex w-[92px] flex-col items-center text-center">
              <div
                className="flex size-8 shrink-0 items-center justify-center rounded-full font-sans font-semibold"
                style={{
                  fontSize: 14,
                  background: isDone || isActive ? '#00B4D8' : '#FFFFFF',
                  color: isDone || isActive ? '#FFFFFF' : '#8A98A3',
                  border: isDone || isActive ? 'none' : '1px solid rgba(0,100,130,0.25)',
                }}
              >
                {isDone ? <Check style={{ width: 16, height: 16 }} /> : step.id}
              </div>
              <p
                className="mt-1.5 font-sans font-medium"
                style={{ fontSize: 14, color: isActive ? '#00B4D8' : '#8A98A3' }}
              >
                {step.label}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────

export function TriageAssessmentWorkspace() {
  const router = useRouter();
  const toast = useToast();
  // Reactive, unlike a mount-only `window.location.search` read: clicking
  // the sidebar's "Triage Assessment" link while already on this route
  // (e.g. right after completing one patient's triage) changes the URL
  // without unmounting the page, so entryId must update on its own or the
  // screen stays stuck showing whichever patient loaded first.
  const searchParams = useSearchParams();
  const entryId = searchParams.get('entryId');

  const [pageState, setPageState] = useState<PageState>('loading');
  const [currentStep, setCurrentStep] = useState<StepId>(1);

  const allEntries = useQueueEntries();
  const triageRecords = useTriageRecords();

  useEffect(() => {
    const t = setTimeout(() => setPageState('loaded'), 800);
    return () => clearTimeout(t);
  }, []);

  const emergencyEntries = useMemo(() => allEntries.filter((e) => e.isEmergency), [allEntries]);

  // An explicit ?entryId= (e.g. "Start Triage" from a specific queue row)
  // always resolves that patient, even if already triaged — re-triage is a
  // deliberate action. With no entryId (e.g. the sidebar link), default to
  // the first patient who hasn't been triaged yet, not just the first
  // patient in the queue — otherwise this screen never advances past
  // whichever patient happens to be first once they're triaged.
  const entry: QueueEntry | undefined = entryId
    ? emergencyEntries.find((e) => e.id === entryId)
    : emergencyEntries.find((e) => !triageRecords.has(e.id));

  // ── Step 1 — Patient Identification ──────────────────────────────────
  const [accompaniedBy, setAccompaniedBy] = useState('Self');
  const [referredFrom, setReferredFrom] = useState('');
  const [arrivalMode, setArrivalMode] = useState<ArrivalSource>('Walk-in');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [onset, setOnset] = useState<string>(ONSET_OPTIONS[0]);
  const [painScale, setPainScale] = useState(5);
  const [primaryConcern, setPrimaryConcern] = useState<string>(PRIMARY_CONCERN_OPTIONS[0]);

  // ── Step 2 — Manchester Triage Assessment ────────────────────────────
  const [answers, setAnswers] = useState<ManchesterAnswers>(MANCHESTER_ANSWERS_DEFAULT);
  const [notes, setNotes] = useState('');

  // ── Step 3 — Vital Signs ──────────────────────────────────────────────
  const [vitals, setVitals] = useState<TriageVitals>(TRIAGE_VITALS_DEFAULT);

  // ── Step 4 — Priority & Disposition ──────────────────────────────────
  const [assignedDoctorId, setAssignedDoctorId] = useState<string>('');
  const [triageNurse, setTriageNurse] = useState<string>(EMERGENCY_TRIAGE_NURSES[0]);

  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const entryIdForPrefill = entry?.id;

  // Reset the whole wizard and pre-fill from the resolved entry every time
  // the patient actually changes — not just on first mount. This is what
  // lets the screen move on to the next patient after "Save & Complete
  // Triage", whether the user got here by navigating away and back (a real
  // remount) or by clicking "Triage Assessment" in the sidebar again while
  // still on this route (no remount, but entryId still changes via
  // useSearchParams above).
  useEffect(() => {
    if (!entryIdForPrefill) return;
    const t = setTimeout(() => {
      setCurrentStep(1);
      setIsComplete(false);
      setAccompaniedBy('Self');
      setReferredFrom('');
      setChiefComplaint(deriveComplaintForEntry(entryIdForPrefill));
      setArrivalMode(deriveSourceForEntry(entryIdForPrefill));
      setOnset(ONSET_OPTIONS[0]);
      setPainScale(5);
      setPrimaryConcern(PRIMARY_CONCERN_OPTIONS[0]);
      setAnswers(MANCHESTER_ANSWERS_DEFAULT);
      setNotes('');
      setVitals(TRIAGE_VITALS_DEFAULT);
      setTriageNurse(EMERGENCY_TRIAGE_NURSES[0]);
      const edDoctor = DOCTORS.find(
        (d) => d.department === 'Accident & Emergency' || d.department === 'Emergency Medicine',
      );
      const resolvedEntry = allEntries.find((e) => e.id === entryIdForPrefill);
      setAssignedDoctorId(resolvedEntry?.doctorId || edDoctor?.id || DOCTORS[0]!.id);
      setStartedAt(Date.now());
    }, 0);
    return () => clearTimeout(t);
    // Deliberately re-runs only when the patient changes, not on every
    // allEntries update — otherwise a new walk-in registered elsewhere would
    // silently wipe an in-progress assessment for the current patient.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryIdForPrefill]);

  const priority = computeManchesterPriority(answers);
  const allergies: Allergy[] = [];

  function handleRetry() {
    setPageState('loading');
    setTimeout(() => setPageState('loaded'), 800);
  }

  function handleClearAssessment() {
    setAnswers(MANCHESTER_ANSWERS_DEFAULT);
    setNotes('');
    setVitals(TRIAGE_VITALS_DEFAULT);
    toast.info('Assessment cleared', 'Manchester assessment answers and vitals were reset.');
  }

  function goToStep(step: StepId) {
    setCurrentStep(step);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleSaveAndComplete() {
    if (!entry) return;
    if (!chiefComplaint.trim()) {
      toast.error('Chief complaint required', 'Add a chief complaint before completing triage.');
      goToStep(1);
      return;
    }
    if (!priority) {
      toast.error(
        'Assessment incomplete',
        'Answer all 7 Manchester Triage questions before completing triage.',
      );
      goToStep(2);
      return;
    }

    const assignedDoctor = DOCTORS.find((d) => d.id === assignedDoctorId);
    setIsSubmitting(true);

    const record: TriageRecord = {
      entryId: entry.id,
      chiefComplaint: chiefComplaint.trim(),
      onset,
      painScale,
      primaryConcern,
      arrivalMode,
      accompaniedBy: accompaniedBy.trim() || 'Self',
      referredFrom: referredFrom.trim(),
      manchester: answers,
      notes: notes.trim(),
      vitals,
      priority,
      assignedDoctorId,
      assignedDoctorName: assignedDoctor?.name ?? entry.attendingDoctor,
      triageNurse,
      triageDurationMinutes: Math.max(1, Math.round((now.getTime() - startedAt) / 60_000)),
      completedAt: new Date().toISOString(),
    };

    setTimeout(() => {
      completeTriage(record);
      setIsSubmitting(false);
      setIsComplete(true);
      toast.success('Triage complete', `${entry.patientName} has been triaged and prioritised.`);
      goToStep(5);
    }, 600);
  }

  // ── Loading / error / no-patient states ──────────────────────────────

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
            Couldn&apos;t load Triage Assessment
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
    return (
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto flex max-w-[1200px] flex-col items-center gap-3 px-4 py-24 text-center sm:px-6">
          <div
            className="flex size-14 items-center justify-center rounded-full"
            style={{ background: 'rgba(226,237,241,0.6)' }}
          >
            <Users style={{ width: 28, height: 28, color: '#8A98A3' }} />
          </div>
          <p className="font-display font-semibold" style={{ fontSize: 18, color: '#0D2630' }}>
            No patient to triage
          </p>
          <p style={{ fontSize: 14, color: '#4A7080' }}>
            Every emergency patient currently in the queue has already been triaged.
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
  const resultDisplay = priority ? ManchesterResultLabel(priority) : null;

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
            Triage Assessment
          </span>
        </div>

        {/* Header */}
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display font-bold" style={{ fontSize: 24, color: '#0D2630' }}>
              Triage Assessment
            </h1>
            <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
              Perform triage assessment and assign priority using Manchester Triage System
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleClearAssessment}
              className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
              style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
            >
              <RefreshCw style={{ width: 15, height: 15 }} />
              Clear Assessment
            </button>
            <PermissionGate permission={PERMISSIONS.EMERGENCY_WRITE}>
              <button
                type="button"
                onClick={handleSaveAndComplete}
                disabled={isSubmitting}
                className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 disabled:opacity-60 ${FOCUS_RING}`}
                style={{ fontSize: 14, background: '#0D2630' }}
              >
                <CheckCircle2 style={{ width: 15, height: 15 }} />
                {isSubmitting ? 'Saving…' : 'Save & Complete Triage'}
              </button>
            </PermissionGate>
          </div>
        </div>

        <div className="mt-4">
          <AllergyBanner allergies={allergies} />
        </div>

        {/* Stepper */}
        <div className="mt-4 overflow-x-auto scroll-smooth">
          <Stepper currentStep={currentStep} />
        </div>

        {/* Main + sidebar */}
        <div className="mt-5 flex flex-col gap-4 xl:flex-row xl:items-start">
          <div className="min-w-0 flex-1">
            {/* Step 1 */}
            {currentStep === 1 && (
              <div
                className="rounded-[12px] p-4 sm:p-5"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <p
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Patient Identification
                </p>
                <div className="mt-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <FieldLabel>MRN</FieldLabel>
                    <input
                      value={entry.mrn}
                      disabled
                      className={INPUT_CLASS}
                      style={{ ...INPUT_STYLE, background: '#F5FBFD', color: '#4A7080' }}
                    />
                  </div>
                  <div>
                    <FieldLabel>Name</FieldLabel>
                    <input
                      value={entry.patientName}
                      disabled
                      className={INPUT_CLASS}
                      style={{ ...INPUT_STYLE, background: '#F5FBFD', color: '#4A7080' }}
                    />
                  </div>
                  <div>
                    <FieldLabel>Age / Sex</FieldLabel>
                    <input
                      value={`${entry.age} / ${entry.gender}`}
                      disabled
                      className={INPUT_CLASS}
                      style={{ ...INPUT_STYLE, background: '#F5FBFD', color: '#4A7080' }}
                    />
                  </div>
                  <div>
                    <FieldLabel>Phone</FieldLabel>
                    <input
                      value={phone}
                      disabled
                      className={INPUT_CLASS}
                      style={{ ...INPUT_STYLE, background: '#F5FBFD', color: '#4A7080' }}
                    />
                  </div>
                </div>

                <div className="mt-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <FieldLabel>Arrival Date &amp; Time</FieldLabel>
                    <input
                      value={`${formatHumanDate(entry.arrivalTime)}, ${formatTime(entry.arrivalTime)}`}
                      disabled
                      className={INPUT_CLASS}
                      style={{ ...INPUT_STYLE, background: '#F5FBFD', color: '#4A7080' }}
                    />
                  </div>
                  <div>
                    <FieldLabel>Arrival Mode</FieldLabel>
                    <select
                      value={arrivalMode}
                      onChange={(e) => setArrivalMode(e.target.value as ArrivalSource)}
                      className={INPUT_CLASS}
                      style={INPUT_STYLE}
                    >
                      <option value="Walk-in">Walk-in</option>
                      <option value="Ambulance">Ambulance</option>
                      <option value="Referral">Referral</option>
                    </select>
                  </div>
                  <div>
                    <FieldLabel>Accompanied By</FieldLabel>
                    <input
                      value={accompaniedBy}
                      onChange={(e) => setAccompaniedBy(e.target.value)}
                      placeholder="e.g. Self, Family member"
                      className={INPUT_CLASS}
                      style={INPUT_STYLE}
                    />
                  </div>
                  <div>
                    <FieldLabel>Referred From (Optional)</FieldLabel>
                    <input
                      value={referredFrom}
                      onChange={(e) => setReferredFrom(e.target.value)}
                      placeholder="—"
                      className={INPUT_CLASS}
                      style={INPUT_STYLE}
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <FieldLabel>Chief Complaint</FieldLabel>
                  <textarea
                    value={chiefComplaint}
                    onChange={(e) =>
                      e.target.value.length <= 300 && setChiefComplaint(e.target.value)
                    }
                    rows={3}
                    className="w-full resize-none rounded-[10px] p-3.5 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40"
                    style={INPUT_STYLE}
                  />
                  <p className="mt-1 text-right" style={{ fontSize: 14, color: '#8A98A3' }}>
                    {chiefComplaint.length}/300
                  </p>
                </div>

                <div className="mt-1 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
                  <div>
                    <FieldLabel>Onset</FieldLabel>
                    <select
                      value={onset}
                      onChange={(e) => setOnset(e.target.value)}
                      className={INPUT_CLASS}
                      style={INPUT_STYLE}
                    >
                      {ONSET_OPTIONS.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <FieldLabel>Pain Scale (0-10)</FieldLabel>
                    <select
                      value={painScale}
                      onChange={(e) => setPainScale(Number(e.target.value))}
                      className={INPUT_CLASS}
                      style={INPUT_STYLE}
                    >
                      {Array.from({ length: 11 }, (_, i) => (
                        <option key={i} value={i}>
                          {i}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <FieldLabel>Primary Concern</FieldLabel>
                    <select
                      value={primaryConcern}
                      onChange={(e) => setPrimaryConcern(e.target.value)}
                      className={INPUT_CLASS}
                      style={INPUT_STYLE}
                    >
                      {PRIMARY_CONCERN_OPTIONS.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-5 flex justify-end">
                  <button
                    type="button"
                    onClick={() => goToStep(2)}
                    className={`flex h-11 items-center gap-1.5 rounded-[10px] px-5 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                    style={{ fontSize: 14, background: '#00B4D8' }}
                  >
                    Next: Triage Assessment
                    <ChevronRight style={{ width: 16, height: 16 }} />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2 */}
            {currentStep === 2 && (
              <div
                className="rounded-[12px] p-4 sm:p-5"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <p
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Manchester Triage Assessment
                </p>
                <div className="mt-3.5 flex flex-col gap-2.5">
                  {MANCHESTER_QUESTIONS.map((q) => (
                    <div
                      key={q.key}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] p-3"
                      style={{ border: '1px solid rgba(0,100,130,0.12)' }}
                    >
                      <p style={{ fontSize: 14, color: '#0D2630' }}>
                        {q.n}. {q.text}
                      </p>
                      <YesNoToggle
                        value={answers[q.key]}
                        onChange={(v) => setAnswers((prev) => ({ ...prev, [q.key]: v }))}
                      />
                    </div>
                  ))}
                </div>

                {/* Assessment summary */}
                <div
                  className="mt-4 rounded-[10px] p-3.5"
                  style={{ background: '#F5FBFD', border: '1px solid rgba(0,100,130,0.1)' }}
                >
                  <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
                    Assessment Summary
                  </p>
                  <div className="mt-2 flex flex-col gap-1.5">
                    {MANCHESTER_QUESTIONS.filter((q) => answers[q.key] !== null).map((q) => (
                      <p
                        key={q.key}
                        className="flex items-center gap-1.5"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        <Check style={{ width: 14, height: 14, color: '#16A34A' }} />
                        {q.summaryLabel}: {answers[q.key] ? 'Yes' : 'No'}
                      </p>
                    ))}
                    {MANCHESTER_QUESTIONS.every((q) => answers[q.key] === null) && (
                      <p style={{ fontSize: 14, color: '#8A98A3' }}>
                        Answer the questions above to build the assessment summary.
                      </p>
                    )}
                  </div>
                  {priority && (priority === 'IMMEDIATE' || priority === 'URGENT') && (
                    <p
                      className="mt-2.5 flex items-start gap-1.5"
                      style={{ fontSize: 14, color: '#DC2626' }}
                    >
                      <AlertTriangle
                        style={{ width: 14, height: 14 }}
                        className="mt-0.5 shrink-0"
                      />
                      This assessment indicates a high-risk condition.
                    </p>
                  )}
                </div>

                <div className="mt-4">
                  <FieldLabel>Triage Notes (Optional)</FieldLabel>
                  <textarea
                    value={notes}
                    onChange={(e) => e.target.value.length <= 500 && setNotes(e.target.value)}
                    rows={3}
                    placeholder="Add any additional notes about the patient's condition..."
                    className="w-full resize-none rounded-[10px] p-3.5 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40"
                    style={INPUT_STYLE}
                  />
                  <p className="mt-1 text-right" style={{ fontSize: 14, color: '#8A98A3' }}>
                    {notes.length}/500
                  </p>
                </div>

                <div className="mt-5 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => goToStep(1)}
                    className={`flex h-11 items-center rounded-[10px] px-5 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                    style={{
                      fontSize: 14,
                      color: '#0D2630',
                      border: '1px solid rgba(0,100,130,0.2)',
                    }}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => goToStep(3)}
                    className={`flex h-11 items-center gap-1.5 rounded-[10px] px-5 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                    style={{ fontSize: 14, background: '#00B4D8' }}
                  >
                    Next: Vital Signs
                    <ChevronRight style={{ width: 16, height: 16 }} />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3 */}
            {currentStep === 3 && (
              <div
                className="rounded-[12px] p-4 sm:p-5"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <p
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Vital Signs
                </p>
                <div className="mt-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <FieldLabel>Systolic BP (mmHg)</FieldLabel>
                    <input
                      type="number"
                      value={vitals.systolic}
                      onChange={(e) => setVitals((v) => ({ ...v, systolic: e.target.value }))}
                      placeholder="120"
                      className={INPUT_CLASS}
                      style={INPUT_STYLE}
                    />
                  </div>
                  <div>
                    <FieldLabel>Diastolic BP (mmHg)</FieldLabel>
                    <input
                      type="number"
                      value={vitals.diastolic}
                      onChange={(e) => setVitals((v) => ({ ...v, diastolic: e.target.value }))}
                      placeholder="80"
                      className={INPUT_CLASS}
                      style={INPUT_STYLE}
                    />
                  </div>
                  <div>
                    <FieldLabel>Pulse (bpm)</FieldLabel>
                    <input
                      type="number"
                      value={vitals.pulse}
                      onChange={(e) => setVitals((v) => ({ ...v, pulse: e.target.value }))}
                      placeholder="78"
                      className={INPUT_CLASS}
                      style={INPUT_STYLE}
                    />
                  </div>
                  <div>
                    <FieldLabel>Respiratory Rate (rpm)</FieldLabel>
                    <input
                      type="number"
                      value={vitals.respRate}
                      onChange={(e) => setVitals((v) => ({ ...v, respRate: e.target.value }))}
                      placeholder="18"
                      className={INPUT_CLASS}
                      style={INPUT_STYLE}
                    />
                  </div>
                  <div>
                    <FieldLabel>Temperature (°C)</FieldLabel>
                    <input
                      type="number"
                      step="0.1"
                      value={vitals.temp}
                      onChange={(e) => setVitals((v) => ({ ...v, temp: e.target.value }))}
                      placeholder="36.8"
                      className={INPUT_CLASS}
                      style={INPUT_STYLE}
                    />
                  </div>
                  <div>
                    <FieldLabel>SpO₂ (%)</FieldLabel>
                    <input
                      type="number"
                      value={vitals.spo2}
                      onChange={(e) => setVitals((v) => ({ ...v, spo2: e.target.value }))}
                      placeholder="97"
                      className={INPUT_CLASS}
                      style={INPUT_STYLE}
                    />
                  </div>
                </div>

                <div className="mt-3.5">
                  <FieldLabel>Consciousness (AVPU)</FieldLabel>
                  <div className="flex flex-wrap gap-2">
                    {(['Alert', 'Verbal', 'Pain', 'Unresponsive'] as const).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setVitals((v) => ({ ...v, avpu: opt }))}
                        className={`flex h-10 items-center rounded-[8px] px-4 font-sans font-medium transition-colors duration-150 ${FOCUS_RING}`}
                        style={{
                          fontSize: 14,
                          background: vitals.avpu === opt ? '#0D2630' : '#FFFFFF',
                          color: vitals.avpu === opt ? '#FFFFFF' : '#4A7080',
                          border: vitals.avpu === opt ? 'none' : '1px solid rgba(0,100,130,0.2)',
                        }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => goToStep(2)}
                    className={`flex h-11 items-center rounded-[10px] px-5 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                    style={{
                      fontSize: 14,
                      color: '#0D2630',
                      border: '1px solid rgba(0,100,130,0.2)',
                    }}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => goToStep(4)}
                    className={`flex h-11 items-center gap-1.5 rounded-[10px] px-5 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                    style={{ fontSize: 14, background: '#00B4D8' }}
                  >
                    Next: Priority &amp; Disposition
                    <ChevronRight style={{ width: 16, height: 16 }} />
                  </button>
                </div>
              </div>
            )}

            {/* Step 4 */}
            {currentStep === 4 && (
              <div
                className="rounded-[12px] p-4 sm:p-5"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <p
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Priority &amp; Disposition
                </p>

                {!priority ? (
                  <p
                    className="mt-3.5 flex items-center gap-1.5 rounded-[10px] p-3.5"
                    style={{ fontSize: 14, color: '#D97706', background: 'rgba(217,119,6,0.06)' }}
                  >
                    <AlertTriangle style={{ width: 15, height: 15 }} />
                    Complete all 7 Manchester Triage questions in Step 2 to compute a priority.
                  </p>
                ) : (
                  <div
                    className="mt-3.5 rounded-[10px] p-4"
                    style={{
                      background: PRIORITY_BG[priority],
                      border: `1px solid ${PRIORITY_BORDER[priority]}`,
                    }}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p
                        className="font-display font-bold"
                        style={{ fontSize: 18, color: PRIORITY_COLOR[priority] }}
                      >
                        {resultDisplay?.label}
                      </p>
                      <span
                        className="rounded-full px-2.5 py-0.5 font-sans font-semibold"
                        style={{
                          fontSize: 14,
                          color: PRIORITY_COLOR[priority],
                          background: '#FFFFFF',
                        }}
                      >
                        {resultDisplay?.short}
                      </span>
                    </div>
                    <p
                      className="mt-2 font-sans font-medium"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      Recommended Action
                    </p>
                    <ul className="mt-1 flex flex-col gap-1">
                      {recommendedActions(priority).map((a) => (
                        <li
                          key={a}
                          className="flex items-start gap-1.5"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          <span
                            className="mt-1.5 size-1 shrink-0 rounded-full"
                            style={{ background: '#4A7080' }}
                          />
                          {a}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  <div>
                    <FieldLabel>Assigned To</FieldLabel>
                    <select
                      value={assignedDoctorId}
                      onChange={(e) => setAssignedDoctorId(e.target.value)}
                      className={INPUT_CLASS}
                      style={INPUT_STYLE}
                    >
                      {DOCTORS.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <FieldLabel>Triage Nurse</FieldLabel>
                    <select
                      value={triageNurse}
                      onChange={(e) => setTriageNurse(e.target.value)}
                      className={INPUT_CLASS}
                      style={INPUT_STYLE}
                    >
                      {EMERGENCY_TRIAGE_NURSES.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => goToStep(3)}
                    className={`flex h-11 items-center rounded-[10px] px-5 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                    style={{
                      fontSize: 14,
                      color: '#0D2630',
                      border: '1px solid rgba(0,100,130,0.2)',
                    }}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => goToStep(5)}
                    className={`flex h-11 items-center gap-1.5 rounded-[10px] px-5 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                    style={{ fontSize: 14, background: '#00B4D8' }}
                  >
                    Next: Review &amp; Complete
                    <ChevronRight style={{ width: 16, height: 16 }} />
                  </button>
                </div>
              </div>
            )}

            {/* Step 5 */}
            {currentStep === 5 && (
              <div
                className="rounded-[12px] p-4 sm:p-5"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                {isComplete ? (
                  <div className="flex flex-col items-center gap-3 px-4 py-14 text-center">
                    <div
                      className="flex size-16 items-center justify-center rounded-full"
                      style={{ background: 'rgba(34,197,94,0.1)' }}
                    >
                      <CheckCircle2 style={{ width: 32, height: 32, color: '#22C55E' }} />
                    </div>
                    <p
                      className="font-display font-semibold"
                      style={{ fontSize: 22, color: '#0D2630' }}
                    >
                      Triage Complete
                    </p>
                    <p className="max-w-[420px]" style={{ fontSize: 14, color: '#4A7080' }}>
                      <span className="font-medium" style={{ color: '#0D2630' }}>
                        {entry.patientName}
                      </span>{' '}
                      has been triaged and assigned{' '}
                      <span
                        className="font-medium"
                        style={{ color: priority ? PRIORITY_COLOR[priority] : undefined }}
                      >
                        {resultDisplay?.label}
                      </span>
                      .
                    </p>
                    <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
                      <PermissionGate permission={PERMISSIONS.EMERGENCY_WRITE}>
                        <button
                          type="button"
                          onClick={() =>
                            router.push(`${ROUTES.emergencyBedAssignment}?entryId=${entry.id}`)
                          }
                          className={`flex h-11 items-center gap-1.5 rounded-[10px] px-5 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                          style={{ fontSize: 14, background: '#0D2630' }}
                        >
                          <Bed style={{ width: 15, height: 15 }} />
                          Proceed to Bed Assignment
                        </button>
                      </PermissionGate>
                      <button
                        type="button"
                        onClick={() => router.push(ROUTES.emergencyPatientQueue)}
                        className={`flex h-11 items-center gap-1.5 rounded-[10px] px-5 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                        style={{
                          fontSize: 14,
                          color: '#0D2630',
                          border: '1px solid rgba(0,100,130,0.2)',
                        }}
                      >
                        <Users style={{ width: 15, height: 15 }} />
                        Back to Patient Queue
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p
                      className="font-display font-semibold"
                      style={{ fontSize: 16, color: '#0D2630' }}
                    >
                      Review &amp; Complete
                    </p>
                    <div className="mt-3.5 flex flex-col gap-3.5">
                      <div
                        className="rounded-[10px] p-3.5"
                        style={{ border: '1px solid rgba(0,100,130,0.12)' }}
                      >
                        <div className="flex items-center justify-between">
                          <p
                            className="font-sans font-semibold"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            Patient &amp; Complaint
                          </p>
                          <button
                            type="button"
                            onClick={() => goToStep(1)}
                            className={`flex items-center gap-1 font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                            style={{ fontSize: 14, color: '#00B4D8' }}
                          >
                            <Pencil style={{ width: 13, height: 13 }} />
                            Edit
                          </button>
                        </div>
                        <p className="mt-1.5" style={{ fontSize: 14, color: '#4A7080' }}>
                          {entry.patientName} · {entry.mrn} · {entry.age}/{entry.gender.charAt(0)} ·{' '}
                          {arrivalMode}
                        </p>
                        <p className="mt-1" style={{ fontSize: 14, color: '#4A7080' }}>
                          {chiefComplaint || '—'}
                        </p>
                      </div>

                      <div
                        className="rounded-[10px] p-3.5"
                        style={{ border: '1px solid rgba(0,100,130,0.12)' }}
                      >
                        <div className="flex items-center justify-between">
                          <p
                            className="font-sans font-semibold"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            Vital Signs
                          </p>
                          <button
                            type="button"
                            onClick={() => goToStep(3)}
                            className={`flex items-center gap-1 font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                            style={{ fontSize: 14, color: '#00B4D8' }}
                          >
                            <Pencil style={{ width: 13, height: 13 }} />
                            Edit
                          </button>
                        </div>
                        <p className="mt-1.5" style={{ fontSize: 14, color: '#4A7080' }}>
                          BP {vitals.systolic || '—'}/{vitals.diastolic || '—'} mmHg · Pulse{' '}
                          {vitals.pulse || '—'} bpm · RR {vitals.respRate || '—'} rpm · Temp{' '}
                          {vitals.temp || '—'}°C · SpO₂ {vitals.spo2 || '—'}%
                          {vitals.avpu ? ` · ${vitals.avpu}` : ''}
                        </p>
                      </div>

                      <div
                        className="rounded-[10px] p-3.5"
                        style={{ border: '1px solid rgba(0,100,130,0.12)' }}
                      >
                        <div className="flex items-center justify-between">
                          <p
                            className="font-sans font-semibold"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            Priority &amp; Disposition
                          </p>
                          <button
                            type="button"
                            onClick={() => goToStep(4)}
                            className={`flex items-center gap-1 font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                            style={{ fontSize: 14, color: '#00B4D8' }}
                          >
                            <Pencil style={{ width: 13, height: 13 }} />
                            Edit
                          </button>
                        </div>
                        <p className="mt-1.5" style={{ fontSize: 14, color: '#4A7080' }}>
                          {resultDisplay?.label ?? 'Not yet assigned'} · Assigned to{' '}
                          {DOCTORS.find((d) => d.id === assignedDoctorId)?.name ?? '—'} · Triage
                          Nurse {triageNurse}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => goToStep(4)}
                        className={`flex h-11 items-center rounded-[10px] px-5 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                        style={{
                          fontSize: 14,
                          color: '#0D2630',
                          border: '1px solid rgba(0,100,130,0.2)',
                        }}
                      >
                        Back
                      </button>
                      <PermissionGate permission={PERMISSIONS.EMERGENCY_WRITE}>
                        <button
                          type="button"
                          onClick={handleSaveAndComplete}
                          disabled={isSubmitting}
                          className={`flex h-11 items-center gap-1.5 rounded-[10px] px-5 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 disabled:opacity-60 ${FOCUS_RING}`}
                          style={{ fontSize: 14, background: '#00B4D8' }}
                        >
                          <CheckCircle2 style={{ width: 15, height: 15 }} />
                          {isSubmitting ? 'Saving…' : 'Save & Complete Triage'}
                        </button>
                      </PermissionGate>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="flex w-full shrink-0 flex-col gap-4 xl:w-[320px]">
            <div
              className="rounded-[12px] p-4"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Patient Summary
              </p>
              <div className="mt-3 flex items-center gap-3">
                <div
                  className="flex size-11 shrink-0 items-center justify-center rounded-full font-sans font-semibold text-white"
                  style={{ background: '#00B4D8', fontSize: 14 }}
                >
                  {entry.patientName
                    .split(/\s+/)
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')}
                </div>
                <div className="min-w-0">
                  <p
                    className="truncate font-sans font-semibold"
                    style={{ fontSize: 15, color: '#0D2630' }}
                  >
                    {entry.patientName}
                  </p>
                  <p style={{ fontSize: 14, color: '#00B4D8' }}>MRN: {entry.mrn}</p>
                  <p style={{ fontSize: 14, color: '#4A7080' }}>
                    {entry.age} Years, {entry.gender}
                  </p>
                </div>
              </div>
              <div
                className="mt-3 flex flex-col gap-1.5"
                style={{ fontSize: 14, color: '#4A7080' }}
              >
                <p>{phone}</p>
                <p>
                  {formatHumanDate(entry.arrivalTime)}, {formatTime(entry.arrivalTime)}
                </p>
                <p>{arrivalMode}</p>
              </div>
              <span
                className="mt-2.5 inline-block rounded-full px-2.5 py-1 font-sans font-medium"
                style={{ fontSize: 14, color: '#16A34A', background: 'rgba(22,163,74,0.08)' }}
              >
                No Known Allergies
              </span>
            </div>

            {(currentStep === 1 || currentStep === 2) && (
              <div
                className="rounded-[12px] p-4"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <p
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Manchester Triage Priority Reference
                </p>
                <div className="mt-3 flex flex-col gap-2.5">
                  {MANCHESTER_REFERENCE.map((r) => (
                    <div
                      key={r.n}
                      className="flex items-start gap-2.5 rounded-[10px] p-3"
                      style={{ background: r.bg, border: `1px solid ${r.color}33` }}
                    >
                      <span
                        className="flex size-6 shrink-0 items-center justify-center rounded-full font-sans font-semibold text-white"
                        style={{ background: r.color, fontSize: 14 }}
                      >
                        {r.n}
                      </span>
                      <div className="min-w-0">
                        <p
                          className="font-sans font-semibold"
                          style={{ fontSize: 14, color: r.color }}
                        >
                          {r.label}
                        </p>
                        <p style={{ fontSize: 14, color: '#4A7080' }}>{r.desc}</p>
                        <p style={{ fontSize: 14, color: '#8A98A3' }}>{r.wait}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {priority && (
              <div
                className="rounded-[12px] p-4"
                style={{
                  background: PRIORITY_BG[priority],
                  border: `1px solid ${PRIORITY_BORDER[priority]}`,
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <p
                    className="font-display font-semibold"
                    style={{ fontSize: 16, color: '#0D2630' }}
                  >
                    Triage Result
                  </p>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p
                    className="font-display font-bold"
                    style={{ fontSize: 17, color: PRIORITY_COLOR[priority] }}
                  >
                    {resultDisplay?.label}
                  </p>
                  <span
                    className="rounded-full px-2 py-0.5 font-sans font-semibold"
                    style={{ fontSize: 14, color: PRIORITY_COLOR[priority], background: '#FFFFFF' }}
                  >
                    {resultDisplay?.short}
                  </span>
                </div>
                <p
                  className="mt-2 font-sans font-medium"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  Assigned To
                </p>
                <p style={{ fontSize: 14, color: '#4A7080' }}>
                  {DOCTORS.find((d) => d.id === assignedDoctorId)?.name ?? '—'}
                </p>
                <p
                  className="mt-2 font-sans font-medium"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  Triage Nurse
                </p>
                <p style={{ fontSize: 14, color: '#4A7080' }}>{triageNurse}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span style={{ fontSize: 14, color: '#8A98A3' }}>Time to Triage</span>
                  <span
                    className="font-sans font-medium"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    {Math.max(1, Math.round((now.getTime() - startedAt) / 60_000))} mins
                  </span>
                </div>
              </div>
            )}

            {priority && (
              <div className="flex flex-col gap-2">
                <p
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Next Actions
                </p>
                <PermissionGate permission={PERMISSIONS.EMERGENCY_WRITE}>
                  <button
                    type="button"
                    onClick={() => goToStep(5)}
                    className={`flex h-11 items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                    style={{ fontSize: 14, background: '#0D2630' }}
                  >
                    <Bed style={{ width: 15, height: 15 }} />
                    Proceed to Bed Assignment
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
