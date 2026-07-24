'use client';

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bed,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  FlaskConical,
  History,
  Mail,
  Moon,
  Phone,
  PenLine,
  Save,
  Sun,
  UserPlus,
  Users,
  Eye,
  LogOut,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

import { ModalLoadingFallback } from '@components/shared/ModalLoadingFallback';
import { PermissionGate } from '@components/shared/PermissionGate';
import { PERMISSIONS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
import { useToast } from '@/hooks/useToast';
import {
  SHIFT_INFO,
  OUTGOING_NURSE,
  INCOMING_NURSE,
  WARD_INFO,
  PATIENT_SUMMARY_STATS,
  HANDOVER_PATIENTS,
  OUTSTANDING_TASKS,
  CRITICAL_PATIENTS,
  MEDICATION_DUE,
  PENDING_INVESTIGATIONS,
  type HandoverTask,
} from '@/features/nursing/__mocks__/shiftHandoverFixtures';

const HandoverHistoryModal = dynamic(
  () => import('./HandoverHistoryModal').then((m) => m.HandoverHistoryModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);
const OutstandingTasksModal = dynamic(
  () => import('./OutstandingTasksModal').then((m) => m.OutstandingTasksModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);
const CriticalPatientsModal = dynamic(
  () => import('./CriticalPatientsModal').then((m) => m.CriticalPatientsModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);
const SignHandoverModal = dynamic(
  () => import('./SignHandoverModal').then((m) => m.SignHandoverModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const CONDITION_CFG: Record<string, { color: string; bg: string; border: string }> = {
  Stable: { color: '#16A34A', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.35)' },
  Improving: { color: '#0891B2', bg: 'rgba(8,145,178,0.1)', border: 'rgba(8,145,178,0.35)' },
  Critical: { color: '#EF4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.35)' },
};

const CRITICAL_STATUS_CFG: Record<string, { color: string; bg: string; border: string }> = {
  Unstable: { color: '#EF4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.35)' },
  Watch: { color: '#D97706', bg: 'rgba(217,119,6,0.1)', border: 'rgba(217,119,6,0.35)' },
};

const INVESTIGATION_STATUS_CFG: Record<string, { color: string; bg: string; border: string }> = {
  Pending: { color: '#D97706', bg: 'rgba(217,119,6,0.1)', border: 'rgba(217,119,6,0.35)' },
  Ordered: { color: '#2563EB', bg: 'rgba(37,99,235,0.1)', border: 'rgba(37,99,235,0.35)' },
  'Sample Sent': { color: '#7C3AED', bg: 'rgba(124,58,237,0.1)', border: 'rgba(124,58,237,0.35)' },
  Completed: { color: '#16A34A', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.35)' },
};

function SectionCard({
  title,
  icon: Icon,
  iconColor,
  action,
  children,
}: {
  title: string;
  icon: typeof Users;
  iconColor: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-[12px] p-4 sm:p-5"
      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon style={{ width: 18, height: 18, color: iconColor }} />
          <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
            {title}
          </h2>
        </div>
      </div>
      <div className="mt-3">{children}</div>
      {action}
    </div>
  );
}

function StatTile({
  icon: Icon,
  color,
  bg,
  label,
  value,
}: {
  icon: typeof Users;
  color: string;
  bg: string;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[10px] p-3.5" style={{ background: bg }}>
      <div
        className="flex size-10 shrink-0 items-center justify-center rounded-full"
        style={{ background: '#FFFFFF' }}
      >
        <Icon style={{ width: 18, height: 18, color }} />
      </div>
      <div className="min-w-0">
        <p style={{ fontSize: 14, color: '#4A7080' }}>{label}</p>
        <p className="font-display font-bold" style={{ fontSize: 22, color: '#0D2630' }}>
          {value}
        </p>
      </div>
    </div>
  );
}

export function ShiftHandoverWorkspace() {
  const router = useRouter();
  const toast = useToast();

  const [historyOpen, setHistoryOpen] = useState(false);
  const [tasksModalOpen, setTasksModalOpen] = useState(false);
  const [criticalModalOpen, setCriticalModalOpen] = useState(false);
  const [signModalOpen, setSignModalOpen] = useState(false);

  const [tasks, setTasks] = useState<HandoverTask[]>(OUTSTANDING_TASKS);
  const [reviewedBeds, setReviewedBeds] = useState<Set<string>>(new Set());
  const [incomingSignedAt, setIncomingSignedAt] = useState<string | null>(null);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  const outgoingSignedAt = 'Jun 30, 2026 06:28 PM';

  const taskCategoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    tasks.forEach((t) => {
      if (!t.done) counts[t.category] = (counts[t.category] ?? 0) + 1;
    });
    return counts;
  }, [tasks]);
  const taskCategories = useMemo(() => Array.from(new Set(tasks.map((t) => t.category))), [tasks]);

  function toggleTask(id: string) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  }

  function nowLabel() {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Lagos',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(new Date());
  }

  function handleSaveDraft() {
    setDraftSavedAt(nowLabel());
    toast.success('Draft saved', 'Your handover progress has been saved.');
  }

  function handleConfirmSign() {
    setIncomingSignedAt(nowLabel());
    setSignModalOpen(false);
    toast.success('Signed', `${INCOMING_NURSE.name} has signed as incoming nurse.`);
  }

  function handleCompleteHandover() {
    if (!incomingSignedAt) return;
    setCompleted(true);
    toast.success('Handover completed', 'Patient care has been formally transferred.');
  }

  const ShiftIcon = SHIFT_INFO.shiftType === 'Day' ? Sun : Moon;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto max-w-[1200px] px-4 py-4 sm:px-6 sm:py-5">
          {/* ── Breadcrumb ──────────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-1.5" style={{ fontSize: 14 }}>
            <button
              type="button"
              onClick={() => router.push(ROUTES.nurse)}
              className={`font-sans transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
              style={{ color: '#4A7080' }}
            >
              Schedule &amp; Workforce
            </button>
            <span style={{ color: '#8A98A3' }}>/</span>
            <span className="font-sans font-medium" style={{ color: '#0D2630' }}>
              Shift Handover
            </span>
          </div>

          {/* ── Header ──────────────────────────────────────────────────── */}
          <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1
                className="font-display font-semibold"
                style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
              >
                Shift Handover
              </h1>
              <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                Ensure safe and effective continuity of patient care.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              className={`flex h-11 items-center gap-2 rounded-[10px] px-4 font-sans font-semibold transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
              style={{
                background: '#FFFFFF',
                border: '1px solid rgba(0,100,130,0.15)',
                color: '#0D2630',
                fontSize: 14,
              }}
            >
              <History style={{ width: 16, height: 16, color: '#4A7080' }} />
              View Handover History
            </button>
          </div>

          {/* ── Completed banner ──────────────────────────────────────────── */}
          {completed && (
            <div
              className="mt-4 flex items-start gap-2.5 rounded-[12px] p-4"
              style={{
                background: 'rgba(34,197,94,0.08)',
                border: '1px solid rgba(34,197,94,0.3)',
              }}
            >
              <CheckCircle2
                className="mt-0.5 shrink-0"
                style={{ width: 18, height: 18, color: '#16A34A' }}
              />
              <p style={{ fontSize: 14, color: '#166534' }}>
                Handover completed and acknowledged by {INCOMING_NURSE.name} at {incomingSignedAt}.
                Patient care has been formally transferred.
              </p>
            </div>
          )}

          {/* ── Shift info bar ────────────────────────────────────────────── */}
          <div
            className="mt-4 flex flex-col gap-3 rounded-[12px] p-4 sm:flex-row sm:items-center sm:gap-8"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <div className="flex items-center gap-2.5">
              <CalendarDays style={{ width: 16, height: 16, color: '#8A98A3' }} />
              <div>
                <p style={{ fontSize: 14, color: '#8A98A3' }}>Shift Date</p>
                <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
                  {SHIFT_INFO.shiftDateLabel}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <ShiftIcon style={{ width: 16, height: 16, color: '#F97316' }} />
              <div>
                <p style={{ fontSize: 14, color: '#8A98A3' }}>Shift</p>
                <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
                  {SHIFT_INFO.shiftType} Shift ({SHIFT_INFO.shiftTimeRange})
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <Clock style={{ width: 16, height: 16, color: '#8A98A3' }} />
              <div>
                <p style={{ fontSize: 14, color: '#8A98A3' }}>Handover Time</p>
                <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
                  {SHIFT_INFO.handoverTimeLabel}
                </p>
              </div>
            </div>
          </div>

          {/* ── Outgoing / Incoming / Ward ────────────────────────────────── */}
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div
              className="rounded-[12px] p-4 sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Outgoing Nurse
              </h2>
              <div className="mt-3 flex items-center gap-3">
                <div
                  className="flex size-11 shrink-0 items-center justify-center rounded-full font-sans font-semibold text-white"
                  style={{ background: OUTGOING_NURSE.avatarBg, fontSize: 14 }}
                >
                  {OUTGOING_NURSE.name
                    .split(' ')
                    .map((w) => w[0])
                    .join('')
                    .slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <p
                    className="truncate font-sans font-semibold"
                    style={{ fontSize: 15, color: '#0D2630' }}
                  >
                    {OUTGOING_NURSE.name}
                  </p>
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>{OUTGOING_NURSE.staffId}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <Mail style={{ width: 13, height: 13, color: '#8A98A3' }} />
                  <span style={{ fontSize: 14, color: '#4A7080' }}>{OUTGOING_NURSE.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone style={{ width: 13, height: 13, color: '#8A98A3' }} />
                  <span style={{ fontSize: 14, color: '#4A7080' }}>{OUTGOING_NURSE.phone}</span>
                </div>
              </div>
            </div>

            <div
              className="rounded-[12px] p-4 sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Incoming Nurse
              </h2>
              <div className="mt-3 flex items-center gap-3">
                <div
                  className="flex size-11 shrink-0 items-center justify-center rounded-full font-sans font-semibold text-white"
                  style={{ background: INCOMING_NURSE.avatarBg, fontSize: 14 }}
                >
                  {INCOMING_NURSE.name
                    .split(' ')
                    .map((w) => w[0])
                    .join('')
                    .slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <p
                    className="truncate font-sans font-semibold"
                    style={{ fontSize: 15, color: '#0D2630' }}
                  >
                    {INCOMING_NURSE.name}
                  </p>
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>{INCOMING_NURSE.staffId}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <Mail style={{ width: 13, height: 13, color: '#8A98A3' }} />
                  <span style={{ fontSize: 14, color: '#4A7080' }}>{INCOMING_NURSE.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone style={{ width: 13, height: 13, color: '#8A98A3' }} />
                  <span style={{ fontSize: 14, color: '#4A7080' }}>{INCOMING_NURSE.phone}</span>
                </div>
              </div>
            </div>

            <div
              className="rounded-[12px] p-4 sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Ward
              </h2>
              <div className="mt-3 flex items-center gap-3">
                <div
                  className="flex size-11 shrink-0 items-center justify-center rounded-full"
                  style={{ background: 'rgba(0,180,216,0.1)' }}
                >
                  <Bed style={{ width: 18, height: 18, color: '#00B4D8' }} />
                </div>
                <div className="min-w-0">
                  <p
                    className="truncate font-sans font-semibold"
                    style={{ fontSize: 15, color: '#0D2630' }}
                  >
                    {WARD_INFO.name}
                  </p>
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>{WARD_INFO.wardCode}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span style={{ fontSize: 14, color: '#8A98A3' }}>Total Beds</span>
                  <span
                    className="font-sans font-medium"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    {WARD_INFO.totalBeds}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span style={{ fontSize: 14, color: '#8A98A3' }}>Occupied Beds</span>
                  <span
                    className="font-sans font-medium"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    {WARD_INFO.occupiedBeds}
                  </span>
                </div>
                <div
                  className="mt-1 pt-1.5"
                  style={{ borderTop: '1px solid rgba(0,100,130,0.08)' }}
                >
                  <span style={{ fontSize: 14, color: '#8A98A3' }}>Nurse In-Charge</span>
                  <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                    {WARD_INFO.nurseInCharge}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Patient Summary ───────────────────────────────────────────── */}
          <div className="mt-4">
            <SectionCard title="Patient Summary" icon={Users} iconColor="#00B4D8">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatTile
                  icon={Users}
                  color="#2563EB"
                  bg="rgba(37,99,235,0.06)"
                  label="Total Patients"
                  value={PATIENT_SUMMARY_STATS.totalPatients}
                />
                <StatTile
                  icon={UserPlus}
                  color="#D97706"
                  bg="rgba(217,119,6,0.06)"
                  label="New Admissions"
                  value={PATIENT_SUMMARY_STATS.newAdmissions}
                />
                <StatTile
                  icon={LogOut}
                  color="#DB2777"
                  bg="rgba(219,39,119,0.06)"
                  label="Discharges Today"
                  value={PATIENT_SUMMARY_STATS.dischargesToday}
                />
                <StatTile
                  icon={Eye}
                  color="#16A34A"
                  bg="rgba(34,197,94,0.06)"
                  label="Patients Under Observation"
                  value={PATIENT_SUMMARY_STATS.patientsUnderObservation}
                />
              </div>

              <div className="mt-4 overflow-x-auto scroll-smooth">
                <div className="min-w-[720px]">
                  <div
                    className="flex"
                    style={{
                      background: 'rgba(226,237,241,0.4)',
                      borderBottom: '1px solid #E6F8FD',
                    }}
                  >
                    <span
                      className="w-24 shrink-0 py-2.5 pr-2 pl-3 font-sans font-bold tracking-wider uppercase"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      Bed
                    </span>
                    <span
                      className="w-36 shrink-0 py-2.5 pr-2 font-sans font-bold tracking-wider uppercase"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      Patient
                    </span>
                    <span
                      className="min-w-0 flex-1 py-2.5 pr-2 font-sans font-bold tracking-wider uppercase"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      Diagnosis
                    </span>
                    <span
                      className="w-28 shrink-0 py-2.5 pr-2 font-sans font-bold tracking-wider uppercase"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      Length of Stay
                    </span>
                    <span
                      className="w-28 shrink-0 py-2.5 pr-2 font-sans font-bold tracking-wider uppercase"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      Condition
                    </span>
                    <span
                      className="w-40 shrink-0 py-2.5 pr-3 font-sans font-bold tracking-wider uppercase"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      Notes
                    </span>
                  </div>
                  {HANDOVER_PATIENTS.map((p, idx) => {
                    const cfg = CONDITION_CFG[p.condition]!;
                    return (
                      <div
                        key={p.bed}
                        className="flex items-center"
                        style={{
                          borderBottom:
                            idx === HANDOVER_PATIENTS.length - 1
                              ? undefined
                              : '1px solid rgba(0,100,130,0.08)',
                        }}
                      >
                        <div className="w-24 shrink-0 py-3 pr-2 pl-3">
                          <p style={{ fontSize: 14, color: '#4A7080' }}>{p.bed}</p>
                        </div>
                        <div className="w-36 shrink-0 py-3 pr-2">
                          <p
                            className="truncate font-sans font-medium"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {p.patientName}
                          </p>
                        </div>
                        <div className="min-w-0 flex-1 py-3 pr-2">
                          <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                            {p.diagnosis}
                          </p>
                        </div>
                        <div className="w-28 shrink-0 py-3 pr-2">
                          <p style={{ fontSize: 14, color: '#4A7080' }}>
                            {p.lengthOfStayDays} day{p.lengthOfStayDays === 1 ? '' : 's'}
                          </p>
                        </div>
                        <div className="w-28 shrink-0 py-3 pr-2">
                          <span
                            className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium whitespace-nowrap"
                            style={{
                              fontSize: 14,
                              color: cfg.color,
                              background: cfg.bg,
                              border: `1px solid ${cfg.border}`,
                            }}
                          >
                            {p.condition}
                          </span>
                        </div>
                        <div className="w-40 shrink-0 py-3 pr-3">
                          <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                            {p.notes}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                onClick={() => router.push(ROUTES.nurseMyPatients)}
                className={`mt-3 flex items-center gap-1 font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#00B4D8' }}
              >
                View All Patients →
              </button>
            </SectionCard>
          </div>

          {/* ── Outstanding Tasks + Critical Patients ─────────────────────── */}
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <SectionCard title="Outstanding Tasks" icon={ClipboardList} iconColor="#00B4D8">
              <div className="flex flex-col gap-1">
                {taskCategories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setTasksModalOpen(true)}
                    className={`flex items-center justify-between gap-2 rounded-[8px] px-2.5 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <ClipboardList style={{ width: 15, height: 15, color: '#8A98A3' }} />
                      <span className="truncate" style={{ fontSize: 14, color: '#2F3A40' }}>
                        {category}
                      </span>
                    </div>
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 font-sans font-semibold"
                      style={{ fontSize: 14, color: '#00B4D8', background: 'rgba(0,180,216,0.1)' }}
                    >
                      {taskCategoryCounts[category] ?? 0}
                    </span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setTasksModalOpen(true)}
                className={`mt-3 flex items-center gap-1 font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#00B4D8' }}
              >
                View All Tasks →
              </button>
            </SectionCard>

            <SectionCard title="Critical Patients" icon={AlertTriangle} iconColor="#EF4444">
              <div className="overflow-x-auto scroll-smooth">
                <div className="min-w-[480px]">
                  <div
                    className="flex"
                    style={{
                      background: 'rgba(226,237,241,0.4)',
                      borderBottom: '1px solid #E6F8FD',
                    }}
                  >
                    <span
                      className="w-20 shrink-0 py-2.5 pr-2 pl-3 font-sans font-bold tracking-wider uppercase"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      Bed
                    </span>
                    <span
                      className="w-32 shrink-0 py-2.5 pr-2 font-sans font-bold tracking-wider uppercase"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      Patient
                    </span>
                    <span
                      className="w-28 shrink-0 py-2.5 pr-2 font-sans font-bold tracking-wider uppercase"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      Diagnosis
                    </span>
                    <span
                      className="min-w-0 flex-1 py-2.5 pr-3 font-sans font-bold tracking-wider uppercase"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      Reason
                    </span>
                  </div>
                  {CRITICAL_PATIENTS.map((p, idx) => {
                    const cfg = CRITICAL_STATUS_CFG[p.status]!;
                    return (
                      <div
                        key={p.bed}
                        className="flex items-center"
                        style={{
                          borderBottom:
                            idx === CRITICAL_PATIENTS.length - 1
                              ? undefined
                              : '1px solid rgba(0,100,130,0.08)',
                        }}
                      >
                        <div className="w-20 shrink-0 py-3 pr-2 pl-3">
                          <p style={{ fontSize: 14, color: '#4A7080' }}>{p.bed}</p>
                        </div>
                        <div className="w-32 shrink-0 py-3 pr-2">
                          <p
                            className="truncate font-sans font-medium"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {p.patientName}
                          </p>
                        </div>
                        <div className="w-28 shrink-0 py-3 pr-2">
                          <span
                            className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium whitespace-nowrap"
                            style={{
                              fontSize: 14,
                              color: cfg.color,
                              background: cfg.bg,
                              border: `1px solid ${cfg.border}`,
                            }}
                          >
                            {p.status}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 py-3 pr-3">
                          <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                            {p.reason}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCriticalModalOpen(true)}
                className={`mt-3 flex items-center gap-1 font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#00B4D8' }}
              >
                View All Critical Patients →
              </button>
            </SectionCard>
          </div>

          {/* ── Medication Due + Pending Investigations ───────────────────── */}
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <SectionCard title="Medication Due" icon={Clock} iconColor="#7C3AED">
              <p className="-mt-1.5 mb-2.5" style={{ fontSize: 14, color: '#8A98A3' }}>
                Within next 4 hours
              </p>
              <div className="overflow-x-auto scroll-smooth">
                <div className="min-w-[540px]">
                  <div
                    className="flex"
                    style={{
                      background: 'rgba(226,237,241,0.4)',
                      borderBottom: '1px solid #E6F8FD',
                    }}
                  >
                    <span
                      className="w-24 shrink-0 py-2.5 pr-2 pl-3 font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      Time
                    </span>
                    <span
                      className="w-32 shrink-0 py-2.5 pr-2 font-sans font-bold tracking-wider uppercase"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      Patient
                    </span>
                    <span
                      className="min-w-0 flex-1 py-2.5 pr-2 font-sans font-bold tracking-wider uppercase"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      Medication
                    </span>
                    <span
                      className="w-20 shrink-0 py-2.5 pr-2 font-sans font-bold tracking-wider uppercase"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      Dose
                    </span>
                    <span
                      className="w-20 shrink-0 py-2.5 pr-3 font-sans font-bold tracking-wider uppercase"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      Route
                    </span>
                  </div>
                  {MEDICATION_DUE.map((m, idx) => (
                    <div
                      key={`${m.time}-${m.patientName}`}
                      className="flex items-center"
                      style={{
                        borderBottom:
                          idx === MEDICATION_DUE.length - 1
                            ? undefined
                            : '1px solid rgba(0,100,130,0.08)',
                      }}
                    >
                      <div className="w-24 shrink-0 py-3 pr-2 pl-3">
                        <p className="whitespace-nowrap" style={{ fontSize: 14, color: '#4A7080' }}>
                          {m.time}
                        </p>
                      </div>
                      <div className="w-32 shrink-0 py-3 pr-2">
                        <p
                          className="truncate font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {m.patientName}
                        </p>
                      </div>
                      <div className="min-w-0 flex-1 py-3 pr-2">
                        <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                          {m.medication}
                        </p>
                      </div>
                      <div className="w-20 shrink-0 py-3 pr-2">
                        <p className="whitespace-nowrap" style={{ fontSize: 14, color: '#4A7080' }}>
                          {m.dose}
                        </p>
                      </div>
                      <div className="w-20 shrink-0 py-3 pr-3">
                        <p className="whitespace-nowrap" style={{ fontSize: 14, color: '#4A7080' }}>
                          {m.route}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={() => router.push(ROUTES.nurseMedicationAdministration)}
                className={`mt-3 flex items-center gap-1 font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#00B4D8' }}
              >
                View All Medication Due →
              </button>
            </SectionCard>

            <SectionCard title="Pending Investigations" icon={FlaskConical} iconColor="#EF4444">
              <div className="overflow-x-auto scroll-smooth">
                <div className="min-w-[520px]">
                  <div
                    className="flex"
                    style={{
                      background: 'rgba(226,237,241,0.4)',
                      borderBottom: '1px solid #E6F8FD',
                    }}
                  >
                    <span
                      className="w-32 shrink-0 py-2.5 pr-2 pl-3 font-sans font-bold tracking-wider uppercase"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      Patient
                    </span>
                    <span
                      className="min-w-0 flex-1 py-2.5 pr-2 font-sans font-bold tracking-wider uppercase"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      Investigation
                    </span>
                    <span
                      className="w-36 shrink-0 py-2.5 pr-2 font-sans font-bold tracking-wider uppercase"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      Ordered By
                    </span>
                    <span
                      className="w-28 shrink-0 py-2.5 pr-3 font-sans font-bold tracking-wider uppercase"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      Status
                    </span>
                  </div>
                  {PENDING_INVESTIGATIONS.map((inv, idx) => {
                    const cfg = INVESTIGATION_STATUS_CFG[inv.status]!;
                    return (
                      <div
                        key={`${inv.patientName}-${inv.investigation}`}
                        className="flex items-center"
                        style={{
                          borderBottom:
                            idx === PENDING_INVESTIGATIONS.length - 1
                              ? undefined
                              : '1px solid rgba(0,100,130,0.08)',
                        }}
                      >
                        <div className="w-32 shrink-0 py-3 pr-2 pl-3">
                          <p
                            className="truncate font-sans font-medium"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {inv.patientName}
                          </p>
                        </div>
                        <div className="min-w-0 flex-1 py-3 pr-2">
                          <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                            {inv.investigation}
                          </p>
                        </div>
                        <div className="w-36 shrink-0 py-3 pr-2">
                          <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                            {inv.orderedBy}
                          </p>
                        </div>
                        <div className="w-28 shrink-0 py-3 pr-3">
                          <span
                            className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium whitespace-nowrap"
                            style={{
                              fontSize: 14,
                              color: cfg.color,
                              background: cfg.bg,
                              border: `1px solid ${cfg.border}`,
                            }}
                          >
                            {inv.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <button
                type="button"
                onClick={() => router.push(ROUTES.nurseLaboratory)}
                className={`mt-3 flex items-center gap-1 font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#00B4D8' }}
              >
                View All Investigations →
              </button>
            </SectionCard>
          </div>

          {/* ── Signatures ─────────────────────────────────────────────────── */}
          <div
            className="mt-4 rounded-[12px] p-4 sm:p-5"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <div className="flex items-center gap-2">
              <PenLine style={{ width: 18, height: 18, color: '#00B4D8' }} />
              <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Signatures
              </h2>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div
                className="rounded-[10px] p-4"
                style={{ background: '#F5FBFD', border: '1px solid rgba(0,100,130,0.08)' }}
              >
                <p style={{ fontSize: 14, color: '#8A98A3' }}>Outgoing Nurse Signature</p>
                <div className="mt-2 flex items-center gap-3">
                  <div
                    className="flex size-9 shrink-0 items-center justify-center rounded-full font-sans font-semibold text-white"
                    style={{ background: OUTGOING_NURSE.avatarBg, fontSize: 13 }}
                  >
                    {OUTGOING_NURSE.name
                      .split(' ')
                      .map((w) => w[0])
                      .join('')
                      .slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <p
                      className="font-sans font-semibold"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {OUTGOING_NURSE.name}
                    </p>
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>{OUTGOING_NURSE.staffId}</p>
                  </div>
                </div>
                <p
                  className="mt-3"
                  style={{
                    fontSize: 28,
                    fontFamily: "'Brush Script MT', 'Segoe Script', cursive",
                    color: '#1A3D4D',
                  }}
                >
                  {OUTGOING_NURSE.name.replace('Nurse ', '')}
                </p>
                <p className="mt-1" style={{ fontSize: 14, color: '#8A98A3' }}>
                  Signed at: {outgoingSignedAt}
                </p>
              </div>

              <div
                className="rounded-[10px] p-4"
                style={{ background: '#F5FBFD', border: '1px solid rgba(0,100,130,0.08)' }}
              >
                <p style={{ fontSize: 14, color: '#8A98A3' }}>Incoming Nurse Signature</p>
                <div className="mt-2 flex items-center gap-3">
                  <div
                    className="flex size-9 shrink-0 items-center justify-center rounded-full font-sans font-semibold text-white"
                    style={{ background: INCOMING_NURSE.avatarBg, fontSize: 13 }}
                  >
                    {INCOMING_NURSE.name
                      .split(' ')
                      .map((w) => w[0])
                      .join('')
                      .slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <p
                      className="font-sans font-semibold"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {INCOMING_NURSE.name}
                    </p>
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>{INCOMING_NURSE.staffId}</p>
                  </div>
                </div>
                {incomingSignedAt ? (
                  <>
                    <p
                      className="mt-3"
                      style={{
                        fontSize: 28,
                        fontFamily: "'Brush Script MT', 'Segoe Script', cursive",
                        color: '#1A3D4D',
                      }}
                    >
                      {INCOMING_NURSE.name.replace('Nurse ', '')}
                    </p>
                    <p className="mt-1" style={{ fontSize: 14, color: '#8A98A3' }}>
                      Signed at: {incomingSignedAt}
                    </p>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setSignModalOpen(true)}
                      disabled={completed}
                      className={`mt-3 flex h-10 items-center gap-2 rounded-[8px] px-4 font-sans font-semibold transition-colors duration-150 hover:bg-[#E6F8FD] disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
                      style={{
                        border: '1.5px dashed rgba(0,180,216,0.5)',
                        color: '#00B4D8',
                        fontSize: 14,
                      }}
                    >
                      <PenLine style={{ width: 15, height: 15 }} />
                      Sign as Incoming Nurse
                    </button>
                    <p className="mt-1" style={{ fontSize: 14, color: '#8A98A3' }}>
                      Signed at: —
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ── Footer actions ─────────────────────────────────────────────── */}
          <div
            className="mt-4 flex flex-col gap-3 rounded-[12px] p-4 sm:flex-row sm:items-center sm:justify-between"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <PermissionGate permission={PERMISSIONS.ENCOUNTERS_WRITE}>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={completed}
                  className={`flex h-11 items-center gap-2 rounded-[10px] px-4 font-sans font-semibold transition-colors duration-150 hover:bg-[#F5FBFD] disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid rgba(0,100,130,0.15)',
                    color: '#0D2630',
                    fontSize: 14,
                  }}
                >
                  <Save style={{ width: 16, height: 16, color: '#4A7080' }} />
                  Save as Draft
                </button>
                {draftSavedAt && (
                  <span style={{ fontSize: 14, color: '#8A98A3' }}>
                    Draft saved at {draftSavedAt}
                  </span>
                )}
              </div>
            </PermissionGate>

            <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-4">
              {!completed && (
                <p className="flex items-center gap-1.5" style={{ fontSize: 14, color: '#8A98A3' }}>
                  {!incomingSignedAt && (
                    <AlertTriangle style={{ width: 14, height: 14, color: '#D97706' }} />
                  )}
                  Please ensure all information is accurate before completing handover.
                </p>
              )}
              <PermissionGate permission={PERMISSIONS.ENCOUNTERS_WRITE}>
                <button
                  type="button"
                  onClick={handleCompleteHandover}
                  disabled={!incomingSignedAt || completed}
                  className={`flex h-11 items-center gap-2 rounded-[10px] px-5 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
                  style={{ background: '#00B4D8', fontSize: 14 }}
                >
                  <CheckCircle2 style={{ width: 16, height: 16 }} />
                  {completed ? 'Handover Completed' : 'Complete Handover'}
                </button>
              </PermissionGate>
            </div>
          </div>
        </div>
      </main>

      {historyOpen && <HandoverHistoryModal onClose={() => setHistoryOpen(false)} />}
      {tasksModalOpen && (
        <OutstandingTasksModal
          tasks={tasks}
          onToggle={toggleTask}
          onClose={() => setTasksModalOpen(false)}
        />
      )}
      {criticalModalOpen && (
        <CriticalPatientsModal
          patients={CRITICAL_PATIENTS}
          reviewedBeds={reviewedBeds}
          onToggleReviewed={(bed) =>
            setReviewedBeds((prev) => {
              const next = new Set(prev);
              if (next.has(bed)) next.delete(bed);
              else next.add(bed);
              return next;
            })
          }
          onClose={() => setCriticalModalOpen(false)}
        />
      )}
      {signModalOpen && (
        <SignHandoverModal
          nurse={INCOMING_NURSE}
          onConfirm={handleConfirmSign}
          onClose={() => setSignModalOpen(false)}
        />
      )}
    </div>
  );
}
