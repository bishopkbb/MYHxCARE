'use client';

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BadgeCheck,
  Beaker,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  FlaskConical,
  History,
  Mail,
  Moon,
  NotebookPen,
  Phone,
  PenLine,
  Save,
  Send,
  Sun,
  Sunset,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

import { ModalLoadingFallback } from '@components/shared/ModalLoadingFallback';
import { Tooltip } from '@components/shared/Tooltip';
import { PermissionGate } from '@components/shared/PermissionGate';
import { PERMISSIONS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
import { useToast } from '@/hooks/useToast';
import {
  SHIFT_INFO,
  OUTGOING_SCIENTIST,
  INCOMING_SCIENTIST,
  DEPARTMENT_INFO,
  OUTSTANDING_TASKS,
  LOW_STOCK_REAGENTS,
  type HandoverTask,
} from '@/features/laboratory/__mocks__/laboratoryShiftHandoverFixtures';
import { useLabResults, type LabResult } from '@/features/laboratory/store/labResultStore';
import {
  awaitingVerificationTests,
  completedToday,
  criticalTests,
  deriveSampleId,
  groupIntoOrders,
  publishedTests,
  type RawLabOrder,
} from '@/features/laboratory/utils/labOrders';

const LaboratoryHandoverHistoryModal = dynamic(
  () => import('./LaboratoryHandoverHistoryModal').then((m) => m.LaboratoryHandoverHistoryModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);
const LaboratoryHandoverTasksModal = dynamic(
  () => import('./LaboratoryHandoverTasksModal').then((m) => m.LaboratoryHandoverTasksModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);
const LaboratorySignHandoverModal = dynamic(
  () => import('./LaboratorySignHandoverModal').then((m) => m.LaboratorySignHandoverModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const PRIORITY_CFG: Record<string, { color: string; bg: string; border: string }> = {
  STAT: { color: '#EF4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.35)' },
  URGENT: { color: '#D97706', bg: 'rgba(217,119,6,0.1)', border: 'rgba(217,119,6,0.35)' },
  ROUTINE: { color: '#4A7080', bg: 'rgba(74,112,128,0.08)', border: 'rgba(74,112,128,0.25)' },
};

function SectionCard({
  title,
  icon: Icon,
  iconColor,
  subtitle,
  children,
}: {
  title: string;
  icon: typeof ClipboardList;
  iconColor: string;
  subtitle?: string;
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
      {subtitle && (
        <p className="mt-1" style={{ fontSize: 14, color: '#8A98A3' }}>
          {subtitle}
        </p>
      )}
      <div className="mt-3">{children}</div>
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
  icon: typeof ClipboardList;
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

function EmptyRow({ label }: { label: string }) {
  return (
    <div className="py-6 text-center">
      <p style={{ fontSize: 14, color: '#8A98A3' }}>{label}</p>
    </div>
  );
}

type QueuedTest = { test: LabResult; order: RawLabOrder };

export function LaboratoryShiftHandoverWorkspace() {
  const router = useRouter();
  const toast = useToast();

  const [historyOpen, setHistoryOpen] = useState(false);
  const [tasksModalOpen, setTasksModalOpen] = useState(false);
  const [signModalOpen, setSignModalOpen] = useState(false);

  const [tasks, setTasks] = useState<HandoverTask[]>(OUTSTANDING_TASKS);
  const [incomingSignedAt, setIncomingSignedAt] = useState<string | null>(null);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  const outgoingSignedAt = SHIFT_INFO.handoverTimeLabel;

  // ── Live test pipeline data ──────────────────────────────────────────────
  const labResults = useLabResults();
  const orders = useMemo(() => groupIntoOrders(labResults), [labResults]);

  // "Pending Result Entry" — sample is in the lab (IN_PROCESS) but no result
  // has been entered yet, and not paused on hold (counted separately below).
  // Note: there is no separate ON_HOLD entry in LabResultStatus — `isOnHold`
  // is a boolean flag layered on top of IN_PROCESS (set by putTestOnHold()),
  // so "on hold" here is a flag filter, not a status-string filter.
  const pendingResultEntryCount = useMemo(
    () => labResults.filter((r) => r.status === 'IN_PROCESS' && !r.isOnHold).length,
    [labResults],
  );

  const onHoldCount = useMemo(() => labResults.filter((r) => r.isOnHold).length, [labResults]);

  const awaitingVerificationQueue = useMemo(() => {
    const rows: QueuedTest[] = [];
    for (const order of orders) {
      for (const test of awaitingVerificationTests(order)) rows.push({ test, order });
    }
    return rows;
  }, [orders]);

  const publishedTodayCount = useMemo(
    () =>
      orders.reduce(
        (sum, order) => sum + (completedToday(order) ? publishedTests(order).length : 0),
        0,
      ),
    [orders],
  );

  const priorityFollowUps = useMemo(() => {
    const rows: QueuedTest[] = [];
    for (const order of orders) {
      for (const test of criticalTests(order)) {
        if (!test.criticalCommunicatedAt && !test.criticalAcknowledgedAt) {
          rows.push({ test, order });
        }
      }
    }
    return rows;
  }, [orders]);

  const verificationPreview = awaitingVerificationQueue.slice(0, 5);
  const followUpPreview = priorityFollowUps.slice(0, 5);

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
      hour12: false,
    }).format(new Date());
  }

  function handleSaveDraft() {
    setDraftSavedAt(nowLabel());
    toast.success('Draft saved', 'Your handover progress has been saved.');
  }

  function handleConfirmSign() {
    setIncomingSignedAt(nowLabel());
    setSignModalOpen(false);
    toast.success('Signed', `${INCOMING_SCIENTIST.name} has signed as incoming scientist.`);
  }

  function handleCompleteHandover() {
    if (!incomingSignedAt) return;
    setCompleted(true);
    toast.success('Handover completed', 'Responsibility for the laboratory has been transferred.');
  }

  const ShiftIcon =
    SHIFT_INFO.shiftType === 'Morning' ? Sun : SHIFT_INFO.shiftType === 'Afternoon' ? Sunset : Moon;

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
                Ensure safe and effective continuity of the sample pipeline and reagent stock.
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
                Handover completed and acknowledged by {INCOMING_SCIENTIST.name} at{' '}
                {incomingSignedAt}. Responsibility for the laboratory has been formally transferred.
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

          {/* ── Outgoing / Incoming / Department ────────────────────────── */}
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div
              className="rounded-[12px] p-4 sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Outgoing Scientist
              </h2>
              <div className="mt-3 flex items-center gap-3">
                <div
                  className="flex size-11 shrink-0 items-center justify-center rounded-full font-sans font-semibold text-white"
                  style={{ background: OUTGOING_SCIENTIST.avatarBg, fontSize: 14 }}
                >
                  {OUTGOING_SCIENTIST.name
                    .split(' ')
                    .map((w) => w[0])
                    .join('')
                    .slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <Tooltip content={OUTGOING_SCIENTIST.name}>
                    <p
                      className="truncate font-sans font-semibold"
                      style={{ fontSize: 15, color: '#0D2630' }}
                    >
                      {OUTGOING_SCIENTIST.name}
                    </p>
                  </Tooltip>
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>{OUTGOING_SCIENTIST.staffId}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <Mail style={{ width: 13, height: 13, color: '#8A98A3' }} />
                  <span style={{ fontSize: 14, color: '#4A7080' }}>{OUTGOING_SCIENTIST.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone style={{ width: 13, height: 13, color: '#8A98A3' }} />
                  <span style={{ fontSize: 14, color: '#4A7080' }}>{OUTGOING_SCIENTIST.phone}</span>
                </div>
              </div>
            </div>

            <div
              className="rounded-[12px] p-4 sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Incoming Scientist
              </h2>
              <div className="mt-3 flex items-center gap-3">
                <div
                  className="flex size-11 shrink-0 items-center justify-center rounded-full font-sans font-semibold text-white"
                  style={{ background: INCOMING_SCIENTIST.avatarBg, fontSize: 14 }}
                >
                  {INCOMING_SCIENTIST.name
                    .split(' ')
                    .map((w) => w[0])
                    .join('')
                    .slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <Tooltip content={INCOMING_SCIENTIST.name}>
                    <p
                      className="truncate font-sans font-semibold"
                      style={{ fontSize: 15, color: '#0D2630' }}
                    >
                      {INCOMING_SCIENTIST.name}
                    </p>
                  </Tooltip>
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>{INCOMING_SCIENTIST.staffId}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <Mail style={{ width: 13, height: 13, color: '#8A98A3' }} />
                  <span style={{ fontSize: 14, color: '#4A7080' }}>{INCOMING_SCIENTIST.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone style={{ width: 13, height: 13, color: '#8A98A3' }} />
                  <span style={{ fontSize: 14, color: '#4A7080' }}>{INCOMING_SCIENTIST.phone}</span>
                </div>
              </div>
            </div>

            <div
              className="rounded-[12px] p-4 sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Department
              </h2>
              <div className="mt-3 flex items-center gap-3">
                <div
                  className="flex size-11 shrink-0 items-center justify-center rounded-full"
                  style={{ background: 'rgba(0,180,216,0.1)' }}
                >
                  <Building2 style={{ width: 18, height: 18, color: '#00B4D8' }} />
                </div>
                <div className="min-w-0">
                  <Tooltip content={DEPARTMENT_INFO.name}>
                    <p
                      className="truncate font-sans font-semibold"
                      style={{ fontSize: 15, color: '#0D2630' }}
                    >
                      {DEPARTMENT_INFO.name}
                    </p>
                  </Tooltip>
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>{DEPARTMENT_INFO.departmentCode}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span style={{ fontSize: 14, color: '#8A98A3' }}>Operating Hours</span>
                  <span
                    className="font-sans font-medium"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    {DEPARTMENT_INFO.operatingHours}
                  </span>
                </div>
                <div
                  className="mt-1 pt-1.5"
                  style={{ borderTop: '1px solid rgba(0,100,130,0.08)' }}
                >
                  <span style={{ fontSize: 14, color: '#8A98A3' }}>Scientist In-Charge</span>
                  <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                    {DEPARTMENT_INFO.scientistInCharge}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Testing Summary ────────────────────────────────────────────── */}
          <div className="mt-4">
            <SectionCard title="Testing Summary" icon={FlaskConical} iconColor="#00B4D8">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatTile
                  icon={NotebookPen}
                  color="#D97706"
                  bg="rgba(217,119,6,0.06)"
                  label="Pending Result Entry"
                  value={pendingResultEntryCount}
                />
                <StatTile
                  icon={BadgeCheck}
                  color="#2563EB"
                  bg="rgba(37,99,235,0.06)"
                  label="Awaiting Verification"
                  value={awaitingVerificationQueue.length}
                />
                <StatTile
                  icon={Send}
                  color="#16A34A"
                  bg="rgba(34,197,94,0.06)"
                  label="Published Today"
                  value={publishedTodayCount}
                />
                <StatTile
                  icon={AlertTriangle}
                  color="#EF4444"
                  bg="rgba(239,68,68,0.06)"
                  label="On Hold"
                  value={onHoldCount}
                />
              </div>

              <div className="mt-4 overflow-x-auto scroll-smooth">
                <div className="min-w-[760px]">
                  <div
                    className="flex"
                    style={{
                      background: 'rgba(226,237,241,0.4)',
                      borderBottom: '1px solid #E6F8FD',
                    }}
                  >
                    <span
                      className="w-36 shrink-0 py-2.5 pr-2 pl-3 font-sans font-bold tracking-wider uppercase"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      Sample ID
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
                      Test
                    </span>
                    <span
                      className="w-28 shrink-0 py-2.5 pr-2 font-sans font-bold tracking-wider uppercase"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      Priority
                    </span>
                    <span
                      className="w-40 shrink-0 py-2.5 pr-3 font-sans font-bold tracking-wider uppercase"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      Ordered By
                    </span>
                  </div>
                  {verificationPreview.length === 0 ? (
                    <EmptyRow label="No tests pending verification." />
                  ) : (
                    verificationPreview.map(({ test, order }, idx) => {
                      const cfg = PRIORITY_CFG[test.priority]!;
                      const sampleId = deriveSampleId(order.groupKey, order.orderedAt);
                      return (
                        <div
                          key={test.id}
                          className="flex items-center"
                          style={{
                            borderBottom:
                              idx === verificationPreview.length - 1
                                ? undefined
                                : '1px solid rgba(0,100,130,0.08)',
                          }}
                        >
                          <div className="w-36 shrink-0 py-3 pr-2 pl-3">
                            <Tooltip content={sampleId}>
                              <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                                {sampleId}
                              </p>
                            </Tooltip>
                          </div>
                          <div className="w-36 shrink-0 py-3 pr-2">
                            <Tooltip content={test.patientName}>
                              <p
                                className="truncate font-sans font-medium"
                                style={{ fontSize: 14, color: '#0D2630' }}
                              >
                                {test.patientName}
                              </p>
                            </Tooltip>
                          </div>
                          <div className="min-w-0 flex-1 py-3 pr-2">
                            <Tooltip content={test.testName}>
                              <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                                {test.testName}
                              </p>
                            </Tooltip>
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
                              {test.priority}
                            </span>
                          </div>
                          <div className="w-40 shrink-0 py-3 pr-3">
                            <Tooltip content={order.orderedBy}>
                              <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                                {order.orderedBy}
                              </p>
                            </Tooltip>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => router.push(ROUTES.laboratoryResultVerification)}
                className={`mt-3 flex items-center gap-1 font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#00B4D8' }}
              >
                View All Pending Verification →
              </button>
            </SectionCard>
          </div>

          {/* ── Outstanding Tasks + Priority Follow-ups ────────────────────── */}
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
                      <Tooltip content={category}>
                        <span className="truncate" style={{ fontSize: 14, color: '#2F3A40' }}>
                          {category}
                        </span>
                      </Tooltip>
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

            <SectionCard title="Priority Follow-ups" icon={AlertTriangle} iconColor="#EF4444">
              <div className="overflow-x-auto scroll-smooth">
                <div className="min-w-[560px]">
                  <div
                    className="flex"
                    style={{
                      background: 'rgba(226,237,241,0.4)',
                      borderBottom: '1px solid #E6F8FD',
                    }}
                  >
                    <span
                      className="w-36 shrink-0 py-2.5 pr-2 pl-3 font-sans font-bold tracking-wider uppercase"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      Patient
                    </span>
                    <span
                      className="w-44 shrink-0 py-2.5 pr-2 font-sans font-bold tracking-wider uppercase"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      Test
                    </span>
                    <span
                      className="min-w-0 flex-1 py-2.5 pr-3 font-sans font-bold tracking-wider uppercase"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      Critical Value
                    </span>
                  </div>
                  {followUpPreview.length === 0 ? (
                    <EmptyRow label="No critical values awaiting communication." />
                  ) : (
                    followUpPreview.map(({ test }, idx) => (
                      <div
                        key={test.id}
                        className="flex items-center"
                        style={{
                          borderBottom:
                            idx === followUpPreview.length - 1
                              ? undefined
                              : '1px solid rgba(0,100,130,0.08)',
                        }}
                      >
                        <div className="w-36 shrink-0 py-3 pr-2 pl-3">
                          <Tooltip content={test.patientName}>
                            <p
                              className="truncate font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {test.patientName}
                            </p>
                          </Tooltip>
                        </div>
                        <div className="w-44 shrink-0 py-3 pr-2">
                          <Tooltip content={test.testName}>
                            <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                              {test.testName}
                            </p>
                          </Tooltip>
                        </div>
                        <div className="min-w-0 flex-1 py-3 pr-3">
                          <Tooltip content={test.criticalValueLabel ?? '—'}>
                            <p
                              className="truncate font-sans font-medium"
                              style={{ fontSize: 14, color: '#EF4444' }}
                            >
                              {test.criticalValueLabel ?? '—'}
                            </p>
                          </Tooltip>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => router.push(ROUTES.laboratoryCriticalResults)}
                className={`mt-3 flex items-center gap-1 font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#00B4D8' }}
              >
                View All Critical Results →
              </button>
            </SectionCard>
          </div>

          {/* ── Low Stock Reagents ──────────────────────────────────────────── */}
          <div className="mt-4">
            <SectionCard title="Low Stock Reagents" icon={Beaker} iconColor="#D97706">
              <div className="overflow-x-auto scroll-smooth">
                <div className="min-w-[560px]">
                  <div
                    className="flex"
                    style={{
                      background: 'rgba(226,237,241,0.4)',
                      borderBottom: '1px solid #E6F8FD',
                    }}
                  >
                    <span
                      className="min-w-0 flex-1 py-2.5 pr-2 pl-3 font-sans font-bold tracking-wider uppercase"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      Reagent
                    </span>
                    <span
                      className="w-36 shrink-0 py-2.5 pr-2 font-sans font-bold tracking-wider uppercase"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      Department
                    </span>
                    <span
                      className="w-24 shrink-0 py-2.5 pr-2 font-sans font-bold tracking-wider uppercase"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      Stock
                    </span>
                    <span
                      className="w-28 shrink-0 py-2.5 pr-3 font-sans font-bold tracking-wider uppercase"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      Reorder At
                    </span>
                  </div>
                  {LOW_STOCK_REAGENTS.length === 0 ? (
                    <EmptyRow label="No reagents currently below reorder level." />
                  ) : (
                    LOW_STOCK_REAGENTS.map((row, idx) => (
                      <div
                        key={row.id}
                        className="flex items-center"
                        style={{
                          borderBottom:
                            idx === LOW_STOCK_REAGENTS.length - 1
                              ? undefined
                              : '1px solid rgba(0,100,130,0.08)',
                        }}
                      >
                        <div className="min-w-0 flex-1 py-3 pr-2 pl-3">
                          <Tooltip content={row.reagentName}>
                            <p
                              className="truncate font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {row.reagentName}
                            </p>
                          </Tooltip>
                        </div>
                        <div className="w-36 shrink-0 py-3 pr-2">
                          <Tooltip content={row.department}>
                            <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                              {row.department}
                            </p>
                          </Tooltip>
                        </div>
                        <div className="w-24 shrink-0 py-3 pr-2">
                          <p
                            className="font-sans font-semibold"
                            style={{ fontSize: 14, color: '#D97706' }}
                          >
                            {row.stockQty} {row.unit}
                          </p>
                        </div>
                        <div className="w-28 shrink-0 py-3 pr-3">
                          <p style={{ fontSize: 14, color: '#4A7080' }}>
                            {row.reorderLevel} {row.unit}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => router.push(ROUTES.laboratoryReagentManagement)}
                className={`mt-3 flex items-center gap-1 font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#00B4D8' }}
              >
                View Reagent Management →
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
                <p style={{ fontSize: 14, color: '#8A98A3' }}>Outgoing Scientist Signature</p>
                <div className="mt-2 flex items-center gap-3">
                  <div
                    className="flex size-9 shrink-0 items-center justify-center rounded-full font-sans font-semibold text-white"
                    style={{ background: OUTGOING_SCIENTIST.avatarBg, fontSize: 13 }}
                  >
                    {OUTGOING_SCIENTIST.name
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
                      {OUTGOING_SCIENTIST.name}
                    </p>
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>{OUTGOING_SCIENTIST.staffId}</p>
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
                  {OUTGOING_SCIENTIST.name}
                </p>
                <p className="mt-1" style={{ fontSize: 14, color: '#8A98A3' }}>
                  Signed at: {outgoingSignedAt}
                </p>
              </div>

              <div
                className="rounded-[10px] p-4"
                style={{ background: '#F5FBFD', border: '1px solid rgba(0,100,130,0.08)' }}
              >
                <p style={{ fontSize: 14, color: '#8A98A3' }}>Incoming Scientist Signature</p>
                <div className="mt-2 flex items-center gap-3">
                  <div
                    className="flex size-9 shrink-0 items-center justify-center rounded-full font-sans font-semibold text-white"
                    style={{ background: INCOMING_SCIENTIST.avatarBg, fontSize: 13 }}
                  >
                    {INCOMING_SCIENTIST.name
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
                      {INCOMING_SCIENTIST.name}
                    </p>
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>{INCOMING_SCIENTIST.staffId}</p>
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
                      {INCOMING_SCIENTIST.name}
                    </p>
                    <p className="mt-1" style={{ fontSize: 14, color: '#8A98A3' }}>
                      Signed at: {incomingSignedAt}
                    </p>
                  </>
                ) : (
                  <>
                    <PermissionGate permission={PERMISSIONS.SHIFT_HANDOVER_WRITE}>
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
                        Sign as Incoming Scientist
                      </button>
                    </PermissionGate>
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
            <PermissionGate permission={PERMISSIONS.SHIFT_HANDOVER_WRITE}>
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
              <PermissionGate permission={PERMISSIONS.SHIFT_HANDOVER_WRITE}>
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

      {historyOpen && <LaboratoryHandoverHistoryModal onClose={() => setHistoryOpen(false)} />}
      {tasksModalOpen && (
        <LaboratoryHandoverTasksModal
          tasks={tasks}
          onToggle={toggleTask}
          onClose={() => setTasksModalOpen(false)}
        />
      )}
      {signModalOpen && (
        <LaboratorySignHandoverModal
          scientist={INCOMING_SCIENTIST}
          onConfirm={handleConfirmSign}
          onClose={() => setSignModalOpen(false)}
        />
      )}
    </div>
  );
}
