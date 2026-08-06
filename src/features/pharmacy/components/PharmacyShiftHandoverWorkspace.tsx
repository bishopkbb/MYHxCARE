'use client';

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Boxes,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  History,
  Mail,
  Moon,
  Phone,
  PenLine,
  Save,
  ShieldAlert,
  Sun,
  Sunset,
  ClipboardCheck,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

import { ModalLoadingFallback } from '@components/shared/ModalLoadingFallback';
import {
  ScrollableTable,
  TABLE_HEADER_BG,
  TABLE_HEADER_STICKY_CLASS,
} from '@components/shared/ScrollableTable';
import { Tooltip } from '@components/shared/Tooltip';
import { PermissionGate } from '@components/shared/PermissionGate';
import { PERMISSIONS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
import { PHARMACY_LOCATIONS } from '@/constants/pharmacyLocations';
import { useToast } from '@/hooks/useToast';
import { getPatientDetail } from '@/features/patients/__mocks__/patientFixtures';
import {
  SHIFT_INFO,
  OUTGOING_PHARMACIST,
  INCOMING_PHARMACIST,
  CAMPUS_INFO,
  OUTSTANDING_TASKS,
  type HandoverTask,
} from '@/features/pharmacy/__mocks__/pharmacyShiftHandoverFixtures';
import {
  useAllQueueEntries,
  usePendingVerificationQueue,
  useRecentDispensingActivity,
} from '@/features/pharmacy/store/pharmacyDispensingStore';
import { useInventoryBatches } from '@/features/pharmacy/store/inventoryStore';
import { getInventoryRowStatus } from '@/features/pharmacy/__mocks__/pharmacyFixtures';

const PharmacyHandoverHistoryModal = dynamic(
  () => import('./PharmacyHandoverHistoryModal').then((m) => m.PharmacyHandoverHistoryModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);
const PharmacyHandoverTasksModal = dynamic(
  () => import('./PharmacyHandoverTasksModal').then((m) => m.PharmacyHandoverTasksModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);
const PharmacySignHandoverModal = dynamic(
  () => import('./PharmacySignHandoverModal').then((m) => m.PharmacySignHandoverModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const PRIORITY_CFG: Record<string, { color: string; bg: string; border: string }> = {
  High: { color: '#EF4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.35)' },
  Medium: { color: '#D97706', bg: 'rgba(217,119,6,0.1)', border: 'rgba(217,119,6,0.35)' },
  Low: { color: '#4A7080', bg: 'rgba(74,112,128,0.08)', border: 'rgba(74,112,128,0.25)' },
};

const STAGE_CFG: Record<string, { color: string; bg: string; border: string }> = {
  'Pending Verification': {
    color: '#D97706',
    bg: 'rgba(217,119,6,0.1)',
    border: 'rgba(217,119,6,0.35)',
  },
  'In Progress': { color: '#2563EB', bg: 'rgba(37,99,235,0.1)', border: 'rgba(37,99,235,0.35)' },
  'Ready for Dispense': {
    color: '#7C3AED',
    bg: 'rgba(124,58,237,0.1)',
    border: 'rgba(124,58,237,0.35)',
  },
  'Ready for Pickup': {
    color: '#16A34A',
    bg: 'rgba(34,197,94,0.1)',
    border: 'rgba(34,197,94,0.35)',
  },
};

const LOCATION_SHORT_NAME: Record<string, string> = Object.fromEntries(
  PHARMACY_LOCATIONS.map((l) => [l.id, l.shortName]),
);

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

export function PharmacyShiftHandoverWorkspace() {
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

  // ── Live queue + inventory data ──────────────────────────────────────────
  const allQueue = useAllQueueEntries();
  const pendingVerification = usePendingVerificationQueue();
  const dispensingActivity = useRecentDispensingActivity();
  const inventoryBatches = useInventoryBatches();

  const onHoldEntries = useMemo(
    () => allQueue.filter((e) => e.isOnHold && e.stage !== 'Collected' && e.stage !== 'Cancelled'),
    [allQueue],
  );

  const readyForPickupCount = useMemo(
    () => allQueue.filter((e) => e.stage === 'Ready for Pickup').length,
    [allQueue],
  );

  const dispensedTodayCount = useMemo(() => {
    const now = new Date();
    return allQueue.filter((e) => {
      if (!e.dispensedAt) return false;
      const d = new Date(e.dispensedAt);
      return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
      );
    }).length;
  }, [allQueue]);

  const pendingApprovalControlled = useMemo(
    () => dispensingActivity.filter((a) => a.status === 'Pending Approval').slice(0, 5),
    [dispensingActivity],
  );

  const lowStockRows = useMemo(
    () =>
      inventoryBatches
        .filter((row) => getInventoryRowStatus(row) === 'Low Stock')
        .sort((a, b) => a.stockQty - b.stockQty)
        .slice(0, 5),
    [inventoryBatches],
  );

  const pendingPreview = pendingVerification.slice(0, 5);
  const onHoldPreview = onHoldEntries.slice(0, 5);

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
    toast.success('Signed', `${INCOMING_PHARMACIST.name} has signed as incoming pharmacist.`);
  }

  function handleCompleteHandover() {
    if (!incomingSignedAt) return;
    setCompleted(true);
    toast.success('Handover completed', 'Responsibility for the pharmacy has been transferred.');
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
              onClick={() => router.push(ROUTES.pharmacy)}
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
                Ensure safe and effective continuity of the prescription queue and stock.
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
                Handover completed and acknowledged by {INCOMING_PHARMACIST.name} at{' '}
                {incomingSignedAt}. Responsibility for the pharmacy has been formally transferred.
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

          {/* ── Outgoing / Incoming / Campus ──────────────────────────────── */}
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div
              className="rounded-[12px] p-4 sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Outgoing Pharmacist
              </h2>
              <div className="mt-3 flex items-center gap-3">
                <div
                  className="flex size-11 shrink-0 items-center justify-center rounded-full font-sans font-semibold text-white"
                  style={{ background: OUTGOING_PHARMACIST.avatarBg, fontSize: 14 }}
                >
                  {OUTGOING_PHARMACIST.name
                    .split(' ')
                    .map((w) => w[0])
                    .join('')
                    .slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <Tooltip content={OUTGOING_PHARMACIST.name}>
                    <p
                      className="truncate font-sans font-semibold"
                      style={{ fontSize: 15, color: '#0D2630' }}
                    >
                      {OUTGOING_PHARMACIST.name}
                    </p>
                  </Tooltip>
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>{OUTGOING_PHARMACIST.staffId}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <Mail style={{ width: 13, height: 13, color: '#8A98A3' }} />
                  <span style={{ fontSize: 14, color: '#4A7080' }}>
                    {OUTGOING_PHARMACIST.email}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone style={{ width: 13, height: 13, color: '#8A98A3' }} />
                  <span style={{ fontSize: 14, color: '#4A7080' }}>
                    {OUTGOING_PHARMACIST.phone}
                  </span>
                </div>
              </div>
            </div>

            <div
              className="rounded-[12px] p-4 sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Incoming Pharmacist
              </h2>
              <div className="mt-3 flex items-center gap-3">
                <div
                  className="flex size-11 shrink-0 items-center justify-center rounded-full font-sans font-semibold text-white"
                  style={{ background: INCOMING_PHARMACIST.avatarBg, fontSize: 14 }}
                >
                  {INCOMING_PHARMACIST.name
                    .split(' ')
                    .map((w) => w[0])
                    .join('')
                    .slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <Tooltip content={INCOMING_PHARMACIST.name}>
                    <p
                      className="truncate font-sans font-semibold"
                      style={{ fontSize: 15, color: '#0D2630' }}
                    >
                      {INCOMING_PHARMACIST.name}
                    </p>
                  </Tooltip>
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>{INCOMING_PHARMACIST.staffId}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <Mail style={{ width: 13, height: 13, color: '#8A98A3' }} />
                  <span style={{ fontSize: 14, color: '#4A7080' }}>
                    {INCOMING_PHARMACIST.email}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone style={{ width: 13, height: 13, color: '#8A98A3' }} />
                  <span style={{ fontSize: 14, color: '#4A7080' }}>
                    {INCOMING_PHARMACIST.phone}
                  </span>
                </div>
              </div>
            </div>

            <div
              className="rounded-[12px] p-4 sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Campus
              </h2>
              <div className="mt-3 flex items-center gap-3">
                <div
                  className="flex size-11 shrink-0 items-center justify-center rounded-full"
                  style={{ background: 'rgba(0,180,216,0.1)' }}
                >
                  <Building2 style={{ width: 18, height: 18, color: '#00B4D8' }} />
                </div>
                <div className="min-w-0">
                  <Tooltip content={CAMPUS_INFO.name}>
                    <p
                      className="truncate font-sans font-semibold"
                      style={{ fontSize: 15, color: '#0D2630' }}
                    >
                      {CAMPUS_INFO.name}
                    </p>
                  </Tooltip>
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>{CAMPUS_INFO.campusCode}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span style={{ fontSize: 14, color: '#8A98A3' }}>Operating Hours</span>
                  <span
                    className="font-sans font-medium"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    {CAMPUS_INFO.operatingHours}
                  </span>
                </div>
                <div
                  className="mt-1 pt-1.5"
                  style={{ borderTop: '1px solid rgba(0,100,130,0.08)' }}
                >
                  <span style={{ fontSize: 14, color: '#8A98A3' }}>Pharmacist In-Charge</span>
                  <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                    {CAMPUS_INFO.pharmacistInCharge}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Dispensing Summary ────────────────────────────────────────── */}
          <div className="mt-4">
            <SectionCard title="Dispensing Summary" icon={ClipboardCheck} iconColor="#00B4D8">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatTile
                  icon={ClipboardList}
                  color="#D97706"
                  bg="rgba(217,119,6,0.06)"
                  label="Pending Verification"
                  value={pendingVerification.length}
                />
                <StatTile
                  icon={CheckCircle2}
                  color="#16A34A"
                  bg="rgba(34,197,94,0.06)"
                  label="Ready for Pickup"
                  value={readyForPickupCount}
                />
                <StatTile
                  icon={ClipboardCheck}
                  color="#2563EB"
                  bg="rgba(37,99,235,0.06)"
                  label="Dispensed Today"
                  value={dispensedTodayCount}
                />
                <StatTile
                  icon={AlertTriangle}
                  color="#EF4444"
                  bg="rgba(239,68,68,0.06)"
                  label="On Hold"
                  value={onHoldEntries.length}
                />
              </div>

              <ScrollableTable minWidth={760} className="mt-4">
                <div
                  className={`flex ${TABLE_HEADER_STICKY_CLASS}`}
                  style={{
                    background: TABLE_HEADER_BG,
                    borderBottom: '1px solid #E6F8FD',
                  }}
                >
                  <span
                    className="w-36 shrink-0 py-2.5 pr-2 pl-3 font-sans font-bold tracking-wider uppercase"
                    style={{ fontSize: 14, color: '#4A7080' }}
                  >
                    Rx No
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
                    Medication
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
                    Prescriber
                  </span>
                </div>
                {pendingPreview.length === 0 ? (
                  <EmptyRow label="No prescriptions pending verification." />
                ) : (
                  pendingPreview.map((entry, idx) => {
                    const cfg = PRIORITY_CFG[entry.priority]!;
                    const patientName = getPatientDetail(entry.patientId).name;
                    return (
                      <div
                        key={entry.rxNo}
                        className="flex items-center"
                        style={{
                          borderBottom:
                            idx === pendingPreview.length - 1
                              ? undefined
                              : '1px solid rgba(0,100,130,0.08)',
                        }}
                      >
                        <div className="w-36 shrink-0 py-3 pr-2 pl-3">
                          <Tooltip content={entry.rxNo}>
                            <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                              {entry.rxNo}
                            </p>
                          </Tooltip>
                        </div>
                        <div className="w-36 shrink-0 py-3 pr-2">
                          <Tooltip content={patientName}>
                            <p
                              className="truncate font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {patientName}
                            </p>
                          </Tooltip>
                        </div>
                        <div className="min-w-0 flex-1 py-3 pr-2">
                          <Tooltip content={entry.medicationName}>
                            <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                              {entry.medicationName}
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
                            {entry.priority}
                          </span>
                        </div>
                        <div className="w-40 shrink-0 py-3 pr-3">
                          <Tooltip content={entry.doctorName}>
                            <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                              {entry.doctorName}
                            </p>
                          </Tooltip>
                        </div>
                      </div>
                    );
                  })
                )}
              </ScrollableTable>

              <button
                type="button"
                onClick={() => router.push(ROUTES.pharmacyPrescriptionQueue)}
                className={`mt-3 flex items-center gap-1 font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#00B4D8' }}
              >
                View All Prescriptions →
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
              <ScrollableTable minWidth={640}>
                <div
                  className={`flex ${TABLE_HEADER_STICKY_CLASS}`}
                  style={{
                    background: TABLE_HEADER_BG,
                    borderBottom: '1px solid #E6F8FD',
                  }}
                >
                  <span
                    className="w-36 shrink-0 py-2.5 pr-2 pl-3 font-sans font-bold tracking-wider uppercase"
                    style={{ fontSize: 14, color: '#4A7080' }}
                  >
                    Rx No
                  </span>
                  <span
                    className="w-32 shrink-0 py-2.5 pr-2 font-sans font-bold tracking-wider uppercase"
                    style={{ fontSize: 14, color: '#4A7080' }}
                  >
                    Patient
                  </span>
                  <span
                    className="w-24 shrink-0 py-2.5 pr-2 font-sans font-bold tracking-wider uppercase"
                    style={{ fontSize: 14, color: '#4A7080' }}
                  >
                    Priority
                  </span>
                  <span
                    className="min-w-0 flex-1 py-2.5 pr-3 font-sans font-bold tracking-wider uppercase"
                    style={{ fontSize: 14, color: '#4A7080' }}
                  >
                    Stage
                  </span>
                </div>
                {onHoldPreview.length === 0 ? (
                  <EmptyRow label="No prescriptions on hold." />
                ) : (
                  onHoldPreview.map((entry, idx) => {
                    const stageCfg = STAGE_CFG[entry.stage] ?? STAGE_CFG['Pending Verification']!;
                    const priorityCfg = PRIORITY_CFG[entry.priority]!;
                    const patientName = getPatientDetail(entry.patientId).name;
                    return (
                      <div
                        key={entry.rxNo}
                        className="flex items-center"
                        style={{
                          borderBottom:
                            idx === onHoldPreview.length - 1
                              ? undefined
                              : '1px solid rgba(0,100,130,0.08)',
                        }}
                      >
                        <div className="w-36 shrink-0 py-3 pr-2 pl-3">
                          <Tooltip content={entry.rxNo}>
                            <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                              {entry.rxNo}
                            </p>
                          </Tooltip>
                        </div>
                        <div className="w-32 shrink-0 py-3 pr-2">
                          <Tooltip content={patientName}>
                            <p
                              className="truncate font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {patientName}
                            </p>
                          </Tooltip>
                        </div>
                        <div className="w-24 shrink-0 py-3 pr-2">
                          <span
                            className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium whitespace-nowrap"
                            style={{
                              fontSize: 14,
                              color: priorityCfg.color,
                              background: priorityCfg.bg,
                              border: `1px solid ${priorityCfg.border}`,
                            }}
                          >
                            {entry.priority}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 py-3 pr-3">
                          <Tooltip content={entry.stage}>
                            <span
                              className="inline-block max-w-full truncate rounded-full px-2.5 py-0.5 font-sans font-medium"
                              style={{
                                fontSize: 14,
                                color: stageCfg.color,
                                background: stageCfg.bg,
                                border: `1px solid ${stageCfg.border}`,
                              }}
                            >
                              {entry.stage}
                            </span>
                          </Tooltip>
                        </div>
                      </div>
                    );
                  })
                )}
              </ScrollableTable>
              <button
                type="button"
                onClick={() => router.push(ROUTES.pharmacyQueueMonitor)}
                className={`mt-3 flex items-center gap-1 font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#00B4D8' }}
              >
                View All On Hold →
              </button>
            </SectionCard>
          </div>

          {/* ── Controlled Drugs Pending Approval + Low Stock Medicines ────── */}
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <SectionCard
              title="Controlled Drugs Pending Approval"
              icon={ShieldAlert}
              iconColor="#7C3AED"
              subtitle="Requires a second pharmacist's countersignature"
            >
              <ScrollableTable minWidth={620}>
                <div
                  className={`flex ${TABLE_HEADER_STICKY_CLASS}`}
                  style={{
                    background: TABLE_HEADER_BG,
                    borderBottom: '1px solid #E6F8FD',
                  }}
                >
                  <span
                    className="w-48 shrink-0 py-2.5 pr-2 pl-3 font-sans font-bold tracking-wider uppercase"
                    style={{ fontSize: 14, color: '#4A7080' }}
                  >
                    Rx No
                  </span>
                  <span
                    className="min-w-0 flex-1 py-2.5 pr-2 font-sans font-bold tracking-wider uppercase"
                    style={{ fontSize: 14, color: '#4A7080' }}
                  >
                    Medication
                  </span>
                  <span
                    className="w-24 shrink-0 py-2.5 pr-2 font-sans font-bold tracking-wider uppercase"
                    style={{ fontSize: 14, color: '#4A7080' }}
                  >
                    Schedule
                  </span>
                  <span
                    className="w-24 shrink-0 py-2.5 pr-3 font-sans font-bold tracking-wider uppercase"
                    style={{ fontSize: 14, color: '#4A7080' }}
                  >
                    Qty
                  </span>
                </div>
                {pendingApprovalControlled.length === 0 ? (
                  <EmptyRow label="No controlled dispenses pending approval." />
                ) : (
                  pendingApprovalControlled.map((entry, idx) => (
                    <div
                      key={entry.id}
                      className="flex items-center"
                      style={{
                        borderBottom:
                          idx === pendingApprovalControlled.length - 1
                            ? undefined
                            : '1px solid rgba(0,100,130,0.08)',
                      }}
                    >
                      <div className="w-48 shrink-0 py-3 pr-2 pl-3">
                        <Tooltip content={entry.rxNo}>
                          <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                            {entry.rxNo}
                          </p>
                        </Tooltip>
                      </div>
                      <div className="min-w-0 flex-1 py-3 pr-2">
                        <Tooltip content={entry.medicationName}>
                          <p
                            className="truncate font-sans font-medium"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {entry.medicationName}
                          </p>
                        </Tooltip>
                      </div>
                      <div className="w-24 shrink-0 py-3 pr-2">
                        <p className="whitespace-nowrap" style={{ fontSize: 14, color: '#4A7080' }}>
                          {entry.controlledSchedule ?? '—'}
                        </p>
                      </div>
                      <div className="w-24 shrink-0 py-3 pr-3">
                        <p className="whitespace-nowrap" style={{ fontSize: 14, color: '#4A7080' }}>
                          {entry.qty} {entry.unit}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </ScrollableTable>
              <button
                type="button"
                onClick={() => router.push(ROUTES.pharmacyControlledDrugs)}
                className={`mt-3 flex items-center gap-1 font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#00B4D8' }}
              >
                View All Controlled Drugs →
              </button>
            </SectionCard>

            <SectionCard title="Low Stock Medicines" icon={Boxes} iconColor="#D97706">
              <ScrollableTable minWidth={520}>
                <div
                  className={`flex ${TABLE_HEADER_STICKY_CLASS}`}
                  style={{
                    background: TABLE_HEADER_BG,
                    borderBottom: '1px solid #E6F8FD',
                  }}
                >
                  <span
                    className="min-w-0 flex-1 py-2.5 pr-2 pl-3 font-sans font-bold tracking-wider uppercase"
                    style={{ fontSize: 14, color: '#4A7080' }}
                  >
                    Medication
                  </span>
                  <span
                    className="w-32 shrink-0 py-2.5 pr-2 font-sans font-bold tracking-wider uppercase"
                    style={{ fontSize: 14, color: '#4A7080' }}
                  >
                    Campus
                  </span>
                  <span
                    className="w-24 shrink-0 py-2.5 pr-2 font-sans font-bold tracking-wider uppercase"
                    style={{ fontSize: 14, color: '#4A7080' }}
                  >
                    Stock
                  </span>
                  <span
                    className="w-24 shrink-0 py-2.5 pr-3 font-sans font-bold tracking-wider uppercase"
                    style={{ fontSize: 14, color: '#4A7080' }}
                  >
                    Reorder At
                  </span>
                </div>
                {lowStockRows.length === 0 ? (
                  <EmptyRow label="No medicines currently below reorder level." />
                ) : (
                  lowStockRows.map((row, idx) => (
                    <div
                      key={row.id}
                      className="flex items-center"
                      style={{
                        borderBottom:
                          idx === lowStockRows.length - 1
                            ? undefined
                            : '1px solid rgba(0,100,130,0.08)',
                      }}
                    >
                      <div className="min-w-0 flex-1 py-3 pr-2 pl-3">
                        <Tooltip content={`${row.medicationName} ${row.strength}`}>
                          <p
                            className="truncate font-sans font-medium"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {row.medicationName} {row.strength}
                          </p>
                        </Tooltip>
                      </div>
                      <div className="w-32 shrink-0 py-3 pr-2">
                        <Tooltip content={LOCATION_SHORT_NAME[row.locationId] ?? row.locationId}>
                          <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                            {LOCATION_SHORT_NAME[row.locationId] ?? row.locationId}
                          </p>
                        </Tooltip>
                      </div>
                      <div className="w-24 shrink-0 py-3 pr-2">
                        <p
                          className="font-sans font-semibold"
                          style={{ fontSize: 14, color: '#D97706' }}
                        >
                          {row.stockQty}
                        </p>
                      </div>
                      <div className="w-24 shrink-0 py-3 pr-3">
                        <p style={{ fontSize: 14, color: '#4A7080' }}>{row.reorderLevel}</p>
                      </div>
                    </div>
                  ))
                )}
              </ScrollableTable>
              <button
                type="button"
                onClick={() => router.push(ROUTES.pharmacyInventory)}
                className={`mt-3 flex items-center gap-1 font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#00B4D8' }}
              >
                View All Inventory →
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
                <p style={{ fontSize: 14, color: '#8A98A3' }}>Outgoing Pharmacist Signature</p>
                <div className="mt-2 flex items-center gap-3">
                  <div
                    className="flex size-9 shrink-0 items-center justify-center rounded-full font-sans font-semibold text-white"
                    style={{ background: OUTGOING_PHARMACIST.avatarBg, fontSize: 13 }}
                  >
                    {OUTGOING_PHARMACIST.name
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
                      {OUTGOING_PHARMACIST.name}
                    </p>
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>{OUTGOING_PHARMACIST.staffId}</p>
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
                  {OUTGOING_PHARMACIST.name.replace('Pharm. ', '')}
                </p>
                <p className="mt-1" style={{ fontSize: 14, color: '#8A98A3' }}>
                  Signed at: {outgoingSignedAt}
                </p>
              </div>

              <div
                className="rounded-[10px] p-4"
                style={{ background: '#F5FBFD', border: '1px solid rgba(0,100,130,0.08)' }}
              >
                <p style={{ fontSize: 14, color: '#8A98A3' }}>Incoming Pharmacist Signature</p>
                <div className="mt-2 flex items-center gap-3">
                  <div
                    className="flex size-9 shrink-0 items-center justify-center rounded-full font-sans font-semibold text-white"
                    style={{ background: INCOMING_PHARMACIST.avatarBg, fontSize: 13 }}
                  >
                    {INCOMING_PHARMACIST.name
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
                      {INCOMING_PHARMACIST.name}
                    </p>
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>{INCOMING_PHARMACIST.staffId}</p>
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
                      {INCOMING_PHARMACIST.name.replace('Pharm. ', '')}
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
                        Sign as Incoming Pharmacist
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

      {historyOpen && <PharmacyHandoverHistoryModal onClose={() => setHistoryOpen(false)} />}
      {tasksModalOpen && (
        <PharmacyHandoverTasksModal
          tasks={tasks}
          onToggle={toggleTask}
          onClose={() => setTasksModalOpen(false)}
        />
      )}
      {signModalOpen && (
        <PharmacySignHandoverModal
          pharmacist={INCOMING_PHARMACIST}
          onConfirm={handleConfirmSign}
          onClose={() => setSignModalOpen(false)}
        />
      )}
    </div>
  );
}
