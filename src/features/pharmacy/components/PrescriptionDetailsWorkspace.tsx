'use client';

import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileText,
  Hourglass,
  Info,
  Package,
  PauseCircle,
  Phone,
  Printer,
  Search,
  XCircle,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

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
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { downloadPDF, escapeHtml } from '@/utils/export';
import { formatDateTime, formatHumanDate, formatTime } from '@/utils/datetime';
import { getPatientDetail } from '@/features/patients/__mocks__/patientFixtures';
import {
  getInteractionWarning,
  getStockForMedication,
  PRESCRIPTION_ATTACHMENTS_SEED,
} from '@/features/pharmacy/__mocks__/pharmacyFixtures';
import {
  cancelPrescription,
  getLastDispensedForPatient,
  markCollected,
  setPharmacistNote,
  toggleHold,
  useQueueEntry,
  verifyAndDispense,
} from '@/features/pharmacy/store/pharmacyDispensingStore';

const AuditTrailModal = dynamic(() => import('./AuditTrailModal').then((m) => m.AuditTrailModal), {
  ssr: false,
  loading: () => <ModalLoadingFallback />,
});

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const PRIORITY_CFG: Record<string, { color: string; border: string; bg: string }> = {
  High: { color: '#DC2626', border: 'rgba(220,38,38,0.35)', bg: 'rgba(220,38,38,0.08)' },
  Medium: { color: '#D97706', border: 'rgba(217,119,6,0.35)', bg: 'rgba(217,119,6,0.08)' },
  Low: { color: '#16A34A', border: 'rgba(22,163,74,0.35)', bg: 'rgba(22,163,74,0.08)' },
};

const STAGE_CFG: Record<string, { color: string; border: string; bg: string }> = {
  'Pending Verification': {
    color: '#7C3AED',
    border: 'rgba(124,58,237,0.35)',
    bg: 'rgba(124,58,237,0.08)',
  },
  'In Progress': { color: '#D97706', border: 'rgba(217,119,6,0.35)', bg: 'rgba(217,119,6,0.08)' },
  'Ready for Dispense': {
    color: '#16A34A',
    border: 'rgba(22,163,74,0.35)',
    bg: 'rgba(22,163,74,0.08)',
  },
  'Ready for Pickup': {
    color: '#2563EB',
    border: 'rgba(37,99,235,0.35)',
    bg: 'rgba(37,99,235,0.08)',
  },
  Collected: { color: '#16A34A', border: 'rgba(22,163,74,0.35)', bg: 'rgba(22,163,74,0.08)' },
  Cancelled: { color: '#64748B', border: 'rgba(100,116,139,0.35)', bg: 'rgba(100,116,139,0.08)' },
};

const STEPPER_STAGES = [
  'Pending Verification',
  'In Progress',
  'Ready for Dispense',
  'Ready for Pickup',
  'Collected',
] as const;

const SLA_HOURS: Record<string, number> = { High: 4, Medium: 8, Low: 24 };

const CHECKLIST_ITEMS = [
  { key: 'identity', label: 'Verify patient identity', optional: false },
  { key: 'allergies', label: 'Check allergies', optional: false },
  { key: 'interactions', label: 'Review drug interactions', optional: false },
  { key: 'dose', label: 'Confirm dose & duration', optional: false },
  { key: 'stock', label: 'Check stock availability', optional: false },
  { key: 'note', label: 'Add pharmacist note (optional)', optional: true },
] as const;

function ageGenderLabel(patient: { age: string; gender: string }): string {
  const ageNum = /^\d+/.exec(patient.age)?.[0] ?? patient.age;
  return `${ageNum} Years, ${patient.gender}`;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return `${parts[0]?.[0] ?? ''}${parts[parts.length - 1]?.[0] ?? ''}`.toUpperCase();
}

function useCountdown(targetIso: string): {
  hrs: string;
  mins: string;
  secs: string;
  overdue: boolean;
} {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const diffMs = new Date(targetIso).getTime() - now;
  const overdue = diffMs <= 0;
  const abs = Math.abs(diffMs);
  const hrs = Math.floor(abs / 3_600_000);
  const mins = Math.floor((abs % 3_600_000) / 60_000);
  const secs = Math.floor((abs % 60_000) / 1_000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return { hrs: pad(hrs), mins: pad(mins), secs: pad(secs), overdue };
}

export default function PrescriptionDetailsWorkspace() {
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const actorName = user?.name ?? 'Pharmacist';

  const [rxNo, setRxNo] = useState<string | null>(null);
  const [paramsRead, setParamsRead] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const t = setTimeout(() => {
      setRxNo(new URLSearchParams(window.location.search).get('rx'));
      setParamsRead(true);
    }, 0);
    return () => clearTimeout(t);
  }, []);

  const entry = useQueueEntry(rxNo);

  useEffect(() => {
    const t = setTimeout(() => {
      setChecklist({});
      setNoteDraft('');
      setAddingNote(false);
    }, 0);
    return () => clearTimeout(t);
  }, [rxNo]);

  if (!paramsRead) {
    return <main className="flex-1" style={{ background: '#F5FBFD' }} />;
  }

  if (!rxNo) {
    return (
      <main className="flex flex-1 items-center justify-center" style={{ background: '#F5FBFD' }}>
        <div className="flex flex-col items-center gap-3 px-6 text-center">
          <div
            className="flex size-14 items-center justify-center rounded-full"
            style={{ background: 'rgba(226,237,241,0.6)' }}
          >
            <Search style={{ width: 24, height: 24, color: '#8A98A3' }} />
          </div>
          <p className="font-display font-semibold" style={{ fontSize: 18, color: '#0D2630' }}>
            No prescription selected
          </p>
          <p className="max-w-[380px]" style={{ fontSize: 14, color: '#4A7080' }}>
            Choose a prescription from the queue to view its full details.
          </p>
          <button
            type="button"
            onClick={() => router.push(ROUTES.pharmacyPrescriptionQueue)}
            className={`mt-1 flex h-11 items-center gap-2 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
            style={{ fontSize: 14, background: '#00B4D8' }}
          >
            Go to Prescription Queue
          </button>
        </div>
      </main>
    );
  }

  if (!entry) {
    return (
      <main className="flex flex-1 items-center justify-center" style={{ background: '#F5FBFD' }}>
        <div className="flex flex-col items-center gap-3 px-6 text-center">
          <AlertTriangle style={{ width: 40, height: 40, color: '#DC2626' }} />
          <p className="font-display font-semibold" style={{ fontSize: 18, color: '#0D2630' }}>
            Prescription not found
          </p>
          <p style={{ fontSize: 14, color: '#4A7080' }}>
            {`Rx ${rxNo} doesn't match any prescription in the queue.`}
          </p>
          <button
            type="button"
            onClick={() => router.push(ROUTES.pharmacyPrescriptionQueue)}
            className={`mt-1 flex h-11 items-center gap-2 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
            style={{ fontSize: 14, background: '#00B4D8' }}
          >
            Go to Prescription Queue
          </button>
        </div>
      </main>
    );
  }

  const patient = getPatientDetail(entry.patientId);
  const priorityCfg = PRIORITY_CFG[entry.priority]!;
  const stageCfg = STAGE_CFG[entry.stage] ?? STAGE_CFG['Cancelled']!;
  const stageIndex = STEPPER_STAGES.indexOf(entry.stage as (typeof STEPPER_STAGES)[number]);
  const activeMedNames = patient.medications
    .filter((m) => m.status === 'active')
    .map((m) => m.name);
  const interaction = getInteractionWarning(entry.medicationName, activeMedNames);
  const stock = getStockForMedication(entry.medicationName);
  const stockSufficient = stock ? stock.currentStock >= entry.quantity : false;
  const lastDispensed = getLastDispensedForPatient(entry.patientId);
  const chronicConditions = patient.medicalHistory.chronicConditions.map((c) => c.condition);
  const activeMedLabels = patient.medications
    .filter((m) => m.status === 'active')
    .map((m) => `${m.name} ${m.dose} ${m.frequency}`);

  const canAct = entry.stage !== 'Collected' && entry.stage !== 'Cancelled';
  const canVerifyOrDispense =
    entry.stage === 'Pending Verification' ||
    entry.stage === 'In Progress' ||
    entry.stage === 'Ready for Dispense';
  const mandatoryDone = CHECKLIST_ITEMS.filter((i) => !i.optional).every((i) => checklist[i.key]);
  const showChecklist = entry.stage === 'Pending Verification';

  function handleVerifyOrDispense() {
    verifyAndDispense(entry!.rxNo, actorName);
    toast.success('Prescription dispensed', `${entry!.rxNo} moved to Ready for Pickup.`);
  }

  function handleCollect() {
    markCollected(entry!.rxNo);
    toast.success('Marked collected', `${entry!.rxNo} has been collected.`);
  }

  function handleReject() {
    cancelPrescription(entry!.rxNo);
    toast.info('Prescription rejected', `${entry!.rxNo} has been cancelled.`);
  }

  function handleToggleHold() {
    toggleHold(entry!.rxNo);
    toast.info(entry!.isOnHold ? 'Hold released' : 'Prescription held', `${entry!.rxNo} updated.`);
  }

  function handleSaveNote() {
    setPharmacistNote(entry!.rxNo, noteDraft.trim());
    setChecklist((c) => ({ ...c, note: true }));
    setAddingNote(false);
    toast.success('Note added', 'Pharmacist note saved to this prescription.');
  }

  function handleDownloadAttachment(filename: string) {
    downloadPDF(
      filename.replace(/\.pdf$/i, ''),
      `<h1>${escapeHtml(filename)}</h1><p class="meta">Attached to Rx ${escapeHtml(entry!.rxNo)} — ${escapeHtml(patient.name)}</p><hr /><p class="content">This is a placeholder for the real file. Document storage arrives in Phase 6.</p>`,
    );
  }

  return (
    <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
      <div className="mx-auto max-w-[1440px] px-4 py-4 sm:px-6 sm:py-5">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => router.push(ROUTES.pharmacy)}
            className={`transition-colors duration-150 hover:text-[#00B4D8] ${FOCUS_RING}`}
            style={{ fontSize: 14, color: '#8A98A3' }}
          >
            Home
          </button>
          <span style={{ fontSize: 14, color: '#8A98A3' }}>/</span>
          <span style={{ fontSize: 14, color: '#8A98A3' }}>Prescription Management</span>
          <span style={{ fontSize: 14, color: '#8A98A3' }}>/</span>
          <span className="font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
            Prescription Details
          </span>
        </nav>

        {/* Header */}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1
              className="font-display font-semibold"
              style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
            >
              Prescription Details
            </h1>
            <span
              className="rounded-full px-2.5 py-0.5 font-sans font-medium whitespace-nowrap"
              style={{
                fontSize: 14,
                color: stageCfg.color,
                border: `1px solid ${stageCfg.border}`,
                background: stageCfg.bg,
              }}
            >
              {entry.stage}
            </span>
            {entry.isOnHold && (
              <span
                className="rounded-full px-2.5 py-0.5 font-sans font-medium whitespace-nowrap"
                style={{
                  fontSize: 14,
                  color: '#D97706',
                  border: '1px solid rgba(217,119,6,0.35)',
                  background: 'rgba(217,119,6,0.08)',
                }}
              >
                On Hold
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2.5">
            <button
              type="button"
              onClick={() => setAuditOpen(true)}
              className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
              style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
            >
              <Clock3 style={{ width: 15, height: 15 }} />
              Audit Trail
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
              style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
            >
              <Printer style={{ width: 15, height: 15 }} />
              Print
            </button>
          </div>
        </div>

        {/* Info bar */}
        <div
          className="mt-4 grid grid-cols-2 gap-4 rounded-[12px] p-4 sm:grid-cols-3 sm:p-5 lg:grid-cols-6"
          style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
        >
          <div>
            <p style={{ fontSize: 14, color: '#8A98A3' }}>Rx No.</p>
            <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
              {entry.rxNo}
            </p>
          </div>
          <div>
            <p style={{ fontSize: 14, color: '#8A98A3' }}>Prescription Date</p>
            <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
              {formatHumanDate(entry.receivedAt)} {formatTime(entry.receivedAt)}
            </p>
          </div>
          <div>
            <p style={{ fontSize: 14, color: '#8A98A3' }}>Status</p>
            <p className="font-sans font-medium" style={{ fontSize: 14, color: stageCfg.color }}>
              {entry.stage}
            </p>
          </div>
          <div>
            <p style={{ fontSize: 14, color: '#8A98A3' }}>Priority</p>
            <span
              className="mt-0.5 inline-block rounded-full px-2.5 py-0.5 font-sans font-medium"
              style={{
                fontSize: 14,
                color: priorityCfg.color,
                border: `1px solid ${priorityCfg.border}`,
                background: priorityCfg.bg,
              }}
            >
              {entry.priority}
            </span>
          </div>
          <div>
            <p style={{ fontSize: 14, color: '#8A98A3' }}>Prescriber</p>
            <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
              {entry.doctorName}
            </p>
          </div>
          <div>
            <p style={{ fontSize: 14, color: '#8A98A3' }}>Department</p>
            <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
              {entry.department}
            </p>
          </div>
        </div>

        {/* Main grid */}
        <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_320px]">
          <div className="flex min-w-0 flex-col gap-4">
            {/* Patient Information + Clinical Alerts */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div
                className="rounded-[12px] p-4 sm:p-5"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <h2
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Patient Information
                </h2>
                <div className="mt-3 flex items-start gap-3">
                  <div
                    className="flex size-14 shrink-0 items-center justify-center rounded-full font-sans text-lg font-semibold text-white"
                    style={{ background: '#00B4D8' }}
                  >
                    {getInitials(patient.name)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p
                        className="font-sans font-semibold"
                        style={{ fontSize: 16, color: '#0D2630' }}
                      >
                        {patient.name}
                      </p>
                      <span style={{ fontSize: 14, color: '#4A7080' }}>{patient.gender}</span>
                    </div>
                    <p style={{ fontSize: 14, color: '#4A7080' }}>
                      {patient.mrn} · {ageGenderLabel(patient)}
                    </p>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <Phone style={{ width: 13, height: 13, color: '#8A98A3' }} />
                      <span style={{ fontSize: 14, color: '#4A7080' }}>{patient.phone}</span>
                    </div>
                    <p className="mt-0.5" style={{ fontSize: 14, color: '#8A98A3' }}>
                      File No: {patient.fileNumber}
                    </p>
                  </div>
                </div>
              </div>

              <div
                className="rounded-[12px] p-4 sm:p-5"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <h2
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Clinical Alerts
                </h2>
                <div className="mt-3 flex flex-col gap-2.5">
                  {entry.hasAllergyAlert && patient.allergies.length > 0 && (
                    <div
                      className="flex items-start gap-2.5 rounded-[10px] p-2.5"
                      style={{
                        background: 'rgba(220,38,38,0.05)',
                        border: '1px solid rgba(220,38,38,0.2)',
                      }}
                    >
                      <AlertTriangle
                        style={{ width: 16, height: 16, color: '#DC2626' }}
                        className="mt-0.5 shrink-0"
                      />
                      <div className="min-w-0">
                        <p
                          className="font-sans font-semibold"
                          style={{ fontSize: 14, color: '#DC2626' }}
                        >
                          Allergy Alert
                        </p>
                        <p style={{ fontSize: 14, color: '#4A7080' }}>
                          Allergic to {patient.allergies.map((a) => a.substance).join(', ')}
                        </p>
                      </div>
                    </div>
                  )}
                  {interaction && (
                    <div
                      className="flex items-start gap-2.5 rounded-[10px] p-2.5"
                      style={{
                        background: 'rgba(217,119,6,0.05)',
                        border: '1px solid rgba(217,119,6,0.2)',
                      }}
                    >
                      <AlertTriangle
                        style={{ width: 16, height: 16, color: '#D97706' }}
                        className="mt-0.5 shrink-0"
                      />
                      <div className="min-w-0">
                        <p
                          className="font-sans font-semibold"
                          style={{ fontSize: 14, color: '#D97706' }}
                        >
                          Drug Interaction
                        </p>
                        <p style={{ fontSize: 14, color: '#4A7080' }}>{interaction}</p>
                      </div>
                    </div>
                  )}
                  {entry.prescriberNote && (
                    <div
                      className="flex items-start gap-2.5 rounded-[10px] p-2.5"
                      style={{
                        background: 'rgba(0,180,216,0.05)',
                        border: '1px solid rgba(0,180,216,0.2)',
                      }}
                    >
                      <Info
                        style={{ width: 16, height: 16, color: '#00B4D8' }}
                        className="mt-0.5 shrink-0"
                      />
                      <div className="min-w-0">
                        <p
                          className="font-sans font-semibold"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          Notes from Prescriber
                        </p>
                        <p style={{ fontSize: 14, color: '#4A7080' }}>{entry.prescriberNote}</p>
                      </div>
                    </div>
                  )}
                  {!entry.hasAllergyAlert && !interaction && !entry.prescriberNote && (
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>
                      No clinical alerts for this prescription.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Prescription Items */}
            <div
              className="rounded-[12px] p-4 sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Prescription Items (1)
              </h2>
              <ScrollableTable minWidth={800} className="mt-3">
                <div
                  className={`flex rounded-t-[8px] ${TABLE_HEADER_STICKY_CLASS}`}
                  style={{
                    background: TABLE_HEADER_BG,
                    borderBottom: '1px solid #E6F8FD',
                  }}
                >
                  <div className="w-10 shrink-0 py-2.5 pl-3">
                    <span style={{ fontSize: 14, color: '#4A7080' }}>#</span>
                  </div>
                  <div className="min-w-[160px] flex-1 py-2.5 pr-2">
                    <span
                      className="font-sans font-bold tracking-wider uppercase"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      Medication
                    </span>
                  </div>
                  <div className="w-32 shrink-0 py-2.5 pr-2">
                    <span
                      className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      Strength/Form
                    </span>
                  </div>
                  <div className="w-40 shrink-0 py-2.5 pr-2">
                    <span
                      className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      Dose &amp; Frequency
                    </span>
                  </div>
                  <div className="w-24 shrink-0 py-2.5 pr-2">
                    <span
                      className="font-sans font-bold tracking-wider uppercase"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      Duration
                    </span>
                  </div>
                  <div className="w-24 shrink-0 py-2.5 pr-2">
                    <span
                      className="font-sans font-bold tracking-wider uppercase"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      Quantity
                    </span>
                  </div>
                  <div className="w-24 shrink-0 py-2.5 pr-2">
                    <span
                      className="font-sans font-bold tracking-wider uppercase"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      Route
                    </span>
                  </div>
                  <div className="w-40 shrink-0 py-2.5 pr-3">
                    <span
                      className="font-sans font-bold tracking-wider uppercase"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      Instructions
                    </span>
                  </div>
                </div>
                <div
                  className="flex items-center"
                  style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                >
                  <div className="w-10 shrink-0 py-3 pl-3">
                    <span style={{ fontSize: 14, color: '#4A7080' }}>1</span>
                  </div>
                  <div className="min-w-[160px] flex-1 py-3 pr-2">
                    <Tooltip content={entry.medicationName}>
                      <p
                        className="truncate font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {entry.medicationName}
                      </p>
                    </Tooltip>
                  </div>
                  <div className="w-32 shrink-0 py-3 pr-2">
                    <p style={{ fontSize: 14, color: '#4A7080' }}>
                      {entry.dose} {entry.form}
                    </p>
                  </div>
                  <div className="w-40 shrink-0 py-3 pr-2">
                    <p style={{ fontSize: 14, color: '#4A7080' }}>{entry.frequency}</p>
                  </div>
                  <div className="w-24 shrink-0 py-3 pr-2">
                    <p style={{ fontSize: 14, color: '#4A7080' }}>{entry.duration}</p>
                  </div>
                  <div className="w-24 shrink-0 py-3 pr-2">
                    <p style={{ fontSize: 14, color: '#4A7080' }}>
                      {entry.quantity} {entry.form}
                      {entry.quantity === 1 ? '' : 's'}
                    </p>
                  </div>
                  <div className="w-24 shrink-0 py-3 pr-2">
                    <p style={{ fontSize: 14, color: '#4A7080' }}>{entry.route}</p>
                  </div>
                  <div className="w-40 shrink-0 py-3 pr-3">
                    <Tooltip content={entry.instructions}>
                      <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                        {entry.instructions}
                      </p>
                    </Tooltip>
                  </div>
                </div>
              </ScrollableTable>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <p style={{ fontSize: 14, color: '#4A7080' }}>Total Items: 1</p>
                <p style={{ fontSize: 14, color: '#4A7080' }}>Total Quantity: {entry.quantity}</p>
              </div>
            </div>

            {/* Stock Availability | Prescription Notes | Attachments */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div
                className="rounded-[12px] p-4 sm:p-5"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <h2
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Stock Availability
                </h2>
                {stock ? (
                  <div className="mt-3">
                    <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                      {stock.name}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <span style={{ fontSize: 14, color: '#8A98A3' }}>Available</span>
                      <span style={{ fontSize: 14, color: '#0D2630' }}>{stock.currentStock}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <span style={{ fontSize: 14, color: '#8A98A3' }}>Required</span>
                      <span style={{ fontSize: 14, color: '#0D2630' }}>{entry.quantity}</span>
                    </div>
                    <span
                      className="mt-2.5 inline-block rounded-full px-2.5 py-0.5 font-sans font-medium"
                      style={{
                        fontSize: 14,
                        color: stockSufficient ? '#16A34A' : '#DC2626',
                        border: `1px solid ${stockSufficient ? 'rgba(22,163,74,0.35)' : 'rgba(220,38,38,0.35)'}`,
                        background: stockSufficient
                          ? 'rgba(22,163,74,0.08)'
                          : 'rgba(220,38,38,0.08)',
                      }}
                    >
                      {stockSufficient ? 'Sufficient' : 'Insufficient'}
                    </span>
                  </div>
                ) : (
                  <p className="mt-3" style={{ fontSize: 14, color: '#8A98A3' }}>
                    Not tracked in inventory.
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => router.push(ROUTES.pharmacyInventory)}
                  className={`mt-3.5 inline-flex items-center gap-1 font-sans font-medium transition-colors duration-150 hover:underline ${FOCUS_RING}`}
                  style={{ fontSize: 14, color: '#00B4D8' }}
                >
                  View Full Inventory →
                </button>
              </div>

              <div
                className="rounded-[12px] p-4 sm:p-5"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <h2
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Prescription Notes
                </h2>
                {entry.pharmacistNote && !addingNote ? (
                  <div className="mt-3">
                    <p style={{ fontSize: 14, color: '#4A7080' }}>{entry.pharmacistNote}</p>
                    {entry.noteUpdatedAt && (
                      <p className="mt-1" style={{ fontSize: 14, color: '#8A98A3' }}>
                        {formatDateTime(entry.noteUpdatedAt)}
                      </p>
                    )}
                  </div>
                ) : addingNote ? (
                  <div className="mt-3 flex flex-col gap-2">
                    <textarea
                      value={noteDraft}
                      onChange={(e) => setNoteDraft(e.target.value)}
                      rows={3}
                      placeholder="Add a note for this prescription…"
                      className={`w-full resize-none rounded-[10px] p-2.5 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                      style={{
                        fontSize: 14,
                        border: '1px solid rgba(0,100,130,0.18)',
                        color: '#0D2630',
                      }}
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSaveNote}
                        disabled={!noteDraft.trim()}
                        className={`flex h-9 items-center rounded-[8px] px-3 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING}`}
                        style={{ fontSize: 14, background: '#00B4D8' }}
                      >
                        Save Note
                      </button>
                      <button
                        type="button"
                        onClick={() => setAddingNote(false)}
                        className={`flex h-9 items-center rounded-[8px] px-3 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                        style={{
                          fontSize: 14,
                          color: '#4A7080',
                          border: '1px solid rgba(0,100,130,0.18)',
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-3" style={{ fontSize: 14, color: '#8A98A3' }}>
                    No notes added.
                  </p>
                )}
                {!addingNote && (
                  <button
                    type="button"
                    onClick={() => {
                      setNoteDraft(entry.pharmacistNote ?? '');
                      setAddingNote(true);
                    }}
                    className={`mt-3.5 flex h-9 items-center gap-1.5 rounded-[8px] px-3 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                    style={{
                      fontSize: 14,
                      color: '#00B4D8',
                      border: '1px solid rgba(0,180,216,0.3)',
                    }}
                  >
                    <FileText style={{ width: 14, height: 14 }} />
                    {entry.pharmacistNote ? 'Edit Note' : 'Add Note'}
                  </button>
                )}
              </div>

              <div
                className="rounded-[12px] p-4 sm:p-5"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <h2
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Attachments
                </h2>
                <div className="mt-3 flex flex-col gap-2.5">
                  {PRESCRIPTION_ATTACHMENTS_SEED.map((att) => (
                    <div key={att.id} className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <Tooltip content={att.filename}>
                          <p
                            className="truncate font-sans font-medium"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {att.filename}
                          </p>
                        </Tooltip>
                        <p style={{ fontSize: 14, color: '#8A98A3' }}>
                          {att.sizeLabel} · {formatHumanDate(att.uploadedAt)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDownloadAttachment(att.filename)}
                        aria-label={`Download ${att.filename}`}
                        className={`flex size-11 shrink-0 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
                      >
                        <FileText style={{ width: 16, height: 16, color: '#4A7080' }} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Before Verification Checklist */}
            {showChecklist && (
              <div
                className="rounded-[12px] p-4 sm:p-5"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <h2
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Before Verification Checklist
                </h2>
                <div className="mt-3 flex flex-wrap gap-x-6 gap-y-3">
                  {CHECKLIST_ITEMS.map((item) => (
                    <label key={item.key} className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={
                          item.key === 'note'
                            ? Boolean(entry.pharmacistNote) || Boolean(checklist[item.key])
                            : Boolean(checklist[item.key])
                        }
                        onChange={(e) =>
                          setChecklist((c) => ({ ...c, [item.key]: e.target.checked }))
                        }
                        className={`size-5 shrink-0 rounded ${FOCUS_RING}`}
                        style={{ accentColor: '#00B4D8' }}
                      />
                      <span style={{ fontSize: 14, color: '#0D2630' }}>{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="flex w-full shrink-0 flex-col gap-4">
            <div
              className="rounded-[12px] p-4 sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Prescription Status
              </h2>
              <div className="mt-3 flex flex-col">
                {STEPPER_STAGES.map((s, i) => {
                  const done = entry.stage !== 'Cancelled' && i < stageIndex;
                  const active = entry.stage !== 'Cancelled' && i === stageIndex;
                  return (
                    <div key={s} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div
                          className="flex size-7 shrink-0 items-center justify-center rounded-full font-sans font-semibold"
                          style={{
                            fontSize: 14,
                            background: done || active ? '#00B4D8' : 'rgba(0,100,130,0.1)',
                            color: done || active ? '#FFFFFF' : '#8A98A3',
                          }}
                        >
                          {done ? <CheckCircle2 style={{ width: 14, height: 14 }} /> : i + 1}
                        </div>
                        {i < STEPPER_STAGES.length - 1 && (
                          <span
                            className="w-px flex-1"
                            style={{
                              background: done ? '#00B4D8' : 'rgba(0,100,130,0.15)',
                              minHeight: 20,
                            }}
                          />
                        )}
                      </div>
                      <div className="min-w-0 pb-3.5">
                        <p
                          style={{
                            fontSize: 14,
                            fontWeight: active ? 600 : 400,
                            color: active ? '#0D2630' : '#4A7080',
                          }}
                        >
                          {s}
                        </p>
                        {active && <p style={{ fontSize: 14, color: '#00B4D8' }}>Current Step</p>}
                      </div>
                    </div>
                  );
                })}
                {entry.stage === 'Cancelled' && (
                  <div
                    className="flex items-center gap-2 rounded-[10px] p-2.5"
                    style={{ background: 'rgba(100,116,139,0.08)' }}
                  >
                    <XCircle style={{ width: 16, height: 16, color: '#64748B' }} />
                    <span style={{ fontSize: 14, color: '#0D2630' }}>Cancelled</span>
                  </div>
                )}
              </div>

              {entry.stage === 'Pending Verification' ||
              entry.stage === 'In Progress' ||
              entry.stage === 'Ready for Dispense' ? (
                <TimeRemaining entry={entry} />
              ) : entry.stage === 'Ready for Pickup' && entry.dispensedAt ? (
                <div
                  className="mt-3 flex items-center gap-2.5 rounded-[10px] p-3"
                  style={{
                    background: 'rgba(37,99,235,0.06)',
                    border: '1px solid rgba(37,99,235,0.2)',
                  }}
                >
                  <CheckCircle2 style={{ width: 16, height: 16, color: '#2563EB' }} />
                  <span style={{ fontSize: 14, color: '#0D2630' }}>
                    Dispensed {formatDateTime(entry.dispensedAt)}
                  </span>
                </div>
              ) : entry.stage === 'Collected' && entry.collectedAt ? (
                <div
                  className="mt-3 flex items-center gap-2.5 rounded-[10px] p-3"
                  style={{
                    background: 'rgba(22,163,74,0.06)',
                    border: '1px solid rgba(22,163,74,0.2)',
                  }}
                >
                  <CheckCircle2 style={{ width: 16, height: 16, color: '#16A34A' }} />
                  <span style={{ fontSize: 14, color: '#0D2630' }}>
                    Collected {formatDateTime(entry.collectedAt)}
                  </span>
                </div>
              ) : entry.stage === 'Cancelled' && entry.cancelledAt ? (
                <div
                  className="mt-3 flex items-center gap-2.5 rounded-[10px] p-3"
                  style={{
                    background: 'rgba(100,116,139,0.06)',
                    border: '1px solid rgba(100,116,139,0.2)',
                  }}
                >
                  <XCircle style={{ width: 16, height: 16, color: '#64748B' }} />
                  <span style={{ fontSize: 14, color: '#0D2630' }}>
                    Cancelled {formatDateTime(entry.cancelledAt)}
                  </span>
                </div>
              ) : null}
            </div>

            <div
              className="rounded-[12px] p-4 sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Patient Summary
              </h2>
              <div className="mt-3 flex flex-col gap-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span style={{ fontSize: 14, color: '#8A98A3' }}>Last Visit</span>
                  <span style={{ fontSize: 14, color: '#0D2630' }}>
                    {patient.consultations[0]?.date ?? 'No visits recorded'}
                  </span>
                </div>
                <div>
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>Chronic Conditions</p>
                  <p style={{ fontSize: 14, color: '#0D2630' }}>
                    {chronicConditions.length > 0 ? chronicConditions.join(', ') : 'None recorded'}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>Current Medications</p>
                  <p style={{ fontSize: 14, color: '#0D2630' }}>
                    {activeMedLabels.length > 0 ? activeMedLabels.join(', ') : 'None recorded'}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span style={{ fontSize: 14, color: '#8A98A3' }}>Last Dispensed</span>
                  <span style={{ fontSize: 14, color: '#0D2630' }}>
                    {lastDispensed
                      ? formatHumanDate(lastDispensed.dispensedAt)
                      : 'No prior dispensing'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => router.push(`/patients/${entry.patientId}`)}
                className={`mt-3.5 flex h-11 w-full items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
              >
                View Full History
              </button>
            </div>

            <div
              className="rounded-[12px] p-4 sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Actions
              </h2>
              <div className="mt-3 flex flex-col gap-2.5">
                {!canAct && (
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>
                    This prescription is {entry.stage.toLowerCase()} — no further action needed.
                  </p>
                )}
                <PermissionGate permission={PERMISSIONS.PHARMACY_DISPENSE}>
                  {canVerifyOrDispense && (
                    <button
                      type="button"
                      onClick={handleVerifyOrDispense}
                      disabled={showChecklist && !mandatoryDone}
                      className={`flex h-11 items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING}`}
                      style={{ fontSize: 14, background: '#16A34A' }}
                    >
                      <CheckCircle2 style={{ width: 15, height: 15 }} />
                      {entry.stage === 'Pending Verification'
                        ? 'Verify Prescription'
                        : 'Dispense Prescription'}
                    </button>
                  )}
                  {entry.stage === 'Ready for Pickup' && (
                    <button
                      type="button"
                      onClick={handleCollect}
                      className={`flex h-11 items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                      style={{ fontSize: 14, background: '#00B4D8' }}
                    >
                      <Package style={{ width: 15, height: 15 }} />
                      Mark Collected
                    </button>
                  )}
                  {canAct && (
                    <button
                      type="button"
                      onClick={handleToggleHold}
                      className={`flex h-11 items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                      style={{
                        fontSize: 14,
                        color: '#D97706',
                        border: '1px solid rgba(217,119,6,0.3)',
                      }}
                    >
                      {entry.isOnHold ? (
                        <>
                          <Hourglass style={{ width: 15, height: 15 }} />
                          Resume Prescription
                        </>
                      ) : (
                        <>
                          <PauseCircle style={{ width: 15, height: 15 }} />
                          Hold Prescription
                        </>
                      )}
                    </button>
                  )}
                  {canVerifyOrDispense && (
                    <button
                      type="button"
                      onClick={handleReject}
                      className={`flex h-11 items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium transition-colors duration-150 hover:bg-[rgba(220,38,38,0.06)] ${FOCUS_RING}`}
                      style={{
                        fontSize: 14,
                        color: '#DC2626',
                        border: '1px solid rgba(220,38,38,0.3)',
                      }}
                    >
                      <XCircle style={{ width: 15, height: 15 }} />
                      Reject Prescription
                    </button>
                  )}
                </PermissionGate>
              </div>
            </div>
          </div>
        </div>

        <div className="h-4" />
      </div>

      {auditOpen && <AuditTrailModal entry={entry} onClose={() => setAuditOpen(false)} />}
    </main>
  );
}

function TimeRemaining({
  entry,
}: {
  entry: { receivedAt: string; priority: string; rxNo: string };
}) {
  const slaHours = SLA_HOURS[entry.priority] ?? 24;
  const deadline = new Date(
    new Date(entry.receivedAt).getTime() + slaHours * 3_600_000,
  ).toISOString();
  const { hrs, mins, secs, overdue } = useCountdown(deadline);
  return (
    <div
      className="mt-3 rounded-[10px] p-3"
      style={{
        background: overdue ? 'rgba(220,38,38,0.06)' : 'rgba(0,180,216,0.06)',
        border: `1px solid ${overdue ? 'rgba(220,38,38,0.25)' : 'rgba(0,180,216,0.25)'}`,
      }}
    >
      <div className="flex items-center gap-2">
        <Hourglass style={{ width: 15, height: 15, color: overdue ? '#DC2626' : '#00B4D8' }} />
        <span style={{ fontSize: 14, color: '#0D2630' }}>
          {overdue ? 'Overdue to Verify' : 'Time Remaining to Verify'}
        </span>
      </div>
      <div className="mt-2 flex items-end gap-3">
        {[
          { v: hrs, l: 'HRS' },
          { v: mins, l: 'MINS' },
          { v: secs, l: 'SECS' },
        ].map((unit) => (
          <div key={unit.l} className="flex flex-col items-center">
            <span
              className="font-display font-bold"
              style={{ fontSize: 20, color: overdue ? '#DC2626' : '#0D2630' }}
            >
              {unit.v}
            </span>
            <span style={{ fontSize: 14, color: '#8A98A3' }}>{unit.l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
