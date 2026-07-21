'use client';

import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  MoreVertical,
  Pause,
  Pill,
  ScanLine,
  Shield,
  ShieldAlert,
  Syringe,
  XCircle,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { AllergyBanner } from '@components/clinical/AllergyBanner';
import { ModalLoadingFallback } from '@components/shared/ModalLoadingFallback';
import { PermissionGate } from '@components/shared/PermissionGate';
import { PERMISSIONS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { formatTime } from '@/utils/datetime';
import { type NursePatient } from '@/features/nursing/__mocks__/myPatientsFixtures';
import { getPatientRecord } from '@/features/nursing/__mocks__/patientRecordFixtures';
import { getBodyMeasurements } from '@/features/nursing/__mocks__/vitalSignsFixtures';
import {
  CLINICAL_ALERTS,
  CONTINUOUS_INFUSIONS,
  FIVE_RIGHTS,
  PRN_MEDICATIONS,
  SCHEDULED_MEDICATIONS,
  type MedicationOrder,
  type MedicationStatus,
} from '@/features/nursing/__mocks__/medicationAdministrationFixtures';
import { NursePatientPicker } from './NursePatientPicker';
import type { AdministerResult } from './AdministerMedicationModal';

const AdministerMedicationModal = dynamic(
  () => import('./AdministerMedicationModal').then((m) => m.AdministerMedicationModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const STATUS_CFG: Record<MedicationStatus, { color: string; border: string; bg: string }> = {
  'Due Now': { color: '#F59E0B', border: 'rgba(245,158,11,0.4)', bg: 'rgba(245,158,11,0.1)' },
  Upcoming: { color: '#3B82F6', border: 'rgba(59,130,246,0.4)', bg: 'rgba(59,130,246,0.08)' },
  Overdue: { color: '#EF4444', border: 'rgba(239,68,68,0.4)', bg: 'rgba(239,68,68,0.1)' },
  Completed: { color: '#22C55E', border: 'rgba(34,197,94,0.4)', bg: 'rgba(34,197,94,0.1)' },
  Missed: { color: '#EF4444', border: 'rgba(239,68,68,0.4)', bg: 'rgba(239,68,68,0.1)' },
  Held: { color: '#8A98A3', border: 'rgba(138,152,163,0.4)', bg: 'rgba(138,152,163,0.1)' },
  Running: { color: '#00B4D8', border: 'rgba(0,180,216,0.4)', bg: 'rgba(0,180,216,0.1)' },
};

type TimeFilter = 'All' | 'Overdue' | 'Due Now' | 'Upcoming' | 'Completed';
const TIME_FILTERS: TimeFilter[] = ['All', 'Overdue', 'Due Now', 'Upcoming', 'Completed'];

type TabKey = 'scheduled' | 'prn' | 'continuous';

function RowMenu({
  open,
  onToggle,
  onHold,
  onMissed,
  onReaction,
}: {
  open: boolean;
  onToggle: () => void;
  onHold: () => void;
  onMissed: () => void;
  onReaction: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) onToggle();
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open, onToggle]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={onToggle}
        aria-label="More actions"
        className={`flex size-9 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
      >
        <MoreVertical style={{ width: 16, height: 16, color: '#4A7080' }} />
      </button>
      {open && (
        <div
          className="animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 absolute top-full right-0 z-30 mt-1.5 w-52 overflow-hidden rounded-[10px] bg-white py-1.5 duration-150"
          style={{
            border: '1px solid rgba(0,100,130,0.12)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          }}
        >
          <button
            type="button"
            onClick={onHold}
            className={`flex w-full items-center gap-2 px-3.5 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
            style={{ fontSize: 14, color: '#0D2630' }}
          >
            <Pause style={{ width: 15, height: 15, color: '#F59E0B' }} />
            Hold Medication
          </button>
          <button
            type="button"
            onClick={onMissed}
            className={`flex w-full items-center gap-2 px-3.5 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
            style={{ fontSize: 14, color: '#0D2630' }}
          >
            <XCircle style={{ width: 15, height: 15, color: '#EF4444' }} />
            Mark as Missed
          </button>
          <button
            type="button"
            onClick={onReaction}
            className={`flex w-full items-center gap-2 px-3.5 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
            style={{ fontSize: 14, color: '#0D2630' }}
          >
            <ShieldAlert style={{ width: 15, height: 15, color: '#8B5CF6' }} />
            Document Reaction
          </button>
        </div>
      )}
    </div>
  );
}

export function MedicationAdministrationWorkspace() {
  const [selectedPatient, setSelectedPatient] = useState<NursePatient | null>(null);

  if (!selectedPatient) {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
          <div className="mx-auto max-w-[1200px] px-4 py-4 sm:px-6 sm:py-5">
            <h1
              className="font-display font-semibold"
              style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
            >
              Medication Administration (MAR)
            </h1>
            <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
              View and administer scheduled medications safely.
            </p>
            <div className="mt-5">
              <NursePatientPicker
                onSelect={setSelectedPatient}
                description="Choose a patient from your assigned roster to open their medication record."
                actionVerb="medication record"
              />
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <PatientMARPanel
      key={selectedPatient.id}
      patient={selectedPatient}
      onChangePatient={() => setSelectedPatient(null)}
    />
  );
}

function PatientMARPanel({
  patient,
  onChangePatient,
}: {
  patient: NursePatient;
  onChangePatient: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const nurseName = user?.name ?? 'Nurse';
  const record = getPatientRecord(patient.id)!;
  const bodyMeasurements = getBodyMeasurements(patient.id);

  const [activeTab, setActiveTab] = useState<TabKey>('scheduled');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('All');
  const [showHeld, setShowHeld] = useState(false);
  const [scheduled, setScheduled] = useState<MedicationOrder[]>(SCHEDULED_MEDICATIONS);
  const [prn, setPrn] = useState<MedicationOrder[]>(PRN_MEDICATIONS);
  const [infusions, setInfusions] = useState<MedicationOrder[]>(CONTINUOUS_INFUSIONS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [administerTargetId, setAdministerTargetId] = useState<string | null>(null);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const listByTab: Record<TabKey, [MedicationOrder[], (v: MedicationOrder[]) => void]> = {
    scheduled: [scheduled, setScheduled],
    prn: [prn, setPrn],
    continuous: [infusions, setInfusions],
  };
  const [activeList, setActiveList] = listByTab[activeTab];

  function updateOrder(id: string, patch: Partial<MedicationOrder>) {
    setActiveList(activeList.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  }

  function findOrder(id: string): MedicationOrder | undefined {
    return activeList.find((o) => o.id === id);
  }

  /** Opens the Administer Medication modal — the 5-rights confirmation and
   * remarks capture happen there; the actual state update happens in
   * confirmAdministration once the nurse confirms. */
  function administerMedication(id: string) {
    setAdministerTargetId(id);
  }

  function confirmAdministration(result: AdministerResult) {
    if (!administerTargetId) return;
    const order = findOrder(administerTargetId);
    if (!order) return;
    updateOrder(administerTargetId, {
      status: 'Completed',
      administeredBy: nurseName,
      remarks: result.remarks,
    });
    toast.success(
      'Medication administered',
      `${order.medication} recorded for ${patient.patientName}.`,
    );
    setAdministerTargetId(null);
  }

  function holdMedication(id: string) {
    const order = findOrder(id);
    if (!order) return;
    updateOrder(id, { status: 'Held', remarks: 'Held by nurse.' });
    toast.info('Medication held', `${order.medication} placed on hold.`);
    setOpenMenuId(null);
  }

  function markMissedDose(id: string) {
    const order = findOrder(id);
    if (!order) return;
    updateOrder(id, { status: 'Missed', remarks: 'Dose missed.' });
    toast.error('Missed dose recorded', `${order.medication} marked as missed.`);
    setOpenMenuId(null);
  }

  function documentReaction(id: string) {
    const order = findOrder(id);
    if (!order) return;
    updateOrder(id, { remarks: 'Reaction documented — see nursing notes.' });
    toast.error('Reaction documented', `An adverse reaction to ${order.medication} was logged.`);
    setOpenMenuId(null);
  }

  function requireSelection(action: (id: string) => void) {
    if (!selectedId || !findOrder(selectedId)) {
      toast.info('Select a medication', 'Choose a medication row first.');
      return;
    }
    action(selectedId);
  }

  function handleScanBarcode() {
    toast.info(
      'Barcode scan',
      'Camera/scanner access required — available on hardware-enabled devices.',
    );
  }

  function handleMarHistory() {
    setActiveTab('scheduled');
    setTimeFilter('Completed');
    toast.info('MAR History', 'Showing completed administrations.');
  }

  const filtered = activeList.filter((o) => {
    if (!showHeld && o.status === 'Held') return false;
    if (timeFilter === 'All') return true;
    return o.status === timeFilter;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * rowsPerPage;
  const pageRows = filtered.slice(pageStart, pageStart + rowsPerPage);

  const allergyNames = record.allergies.map((a) => a.substance).join(', ');
  const lastAllergyReview = record.allergies[0];

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto max-w-[1200px] px-4 py-4 sm:px-6 sm:py-5">
          {/* ── Breadcrumb ──────────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-1.5" style={{ fontSize: 14 }}>
            <button
              type="button"
              onClick={() => router.push(ROUTES.nurseMyPatients)}
              className={`font-sans transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
              style={{ color: '#4A7080' }}
            >
              My Patients
            </button>
            <span style={{ color: '#8A98A3' }}>/</span>
            <button
              type="button"
              onClick={() => router.push(ROUTES.nursePatientRecord(patient.id))}
              className={`font-sans transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
              style={{ color: '#4A7080' }}
            >
              Patient Record
            </button>
            <span style={{ color: '#8A98A3' }}>/</span>
            <span className="font-sans font-medium" style={{ color: '#0D2630' }}>
              Medication Administration (MAR)
            </span>
          </div>

          {/* ── Header ──────────────────────────────────────────────────── */}
          <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1
                className="font-display font-semibold"
                style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
              >
                Medication Administration (MAR)
              </h1>
              <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                View and administer scheduled medications safely.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => router.push(ROUTES.nursePatientRecord(patient.id))}
                className={`flex h-11 items-center gap-2 rounded-[10px] px-4 font-sans font-semibold transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid rgba(0,100,130,0.15)',
                  color: '#0D2630',
                  fontSize: 14,
                }}
              >
                Back to Patient Record
              </button>
              <button
                type="button"
                onClick={handleMarHistory}
                className={`flex h-11 items-center gap-2 rounded-[10px] px-4 font-sans font-semibold transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid rgba(0,100,130,0.15)',
                  color: '#0D2630',
                  fontSize: 14,
                }}
              >
                MAR History
              </button>
              <button
                type="button"
                onClick={handleScanBarcode}
                className={`flex h-11 items-center gap-2 rounded-[10px] px-4 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                style={{ background: '#00B4D8', fontSize: 14 }}
              >
                <ScanLine style={{ width: 16, height: 16 }} />
                Scan Barcode
              </button>
            </div>
          </div>

          {/* ── Patient header card ─────────────────────────────────────── */}
          <div
            className="mt-4 flex flex-col gap-4 rounded-[12px] p-4 sm:p-5 lg:flex-row lg:flex-wrap lg:items-start lg:justify-between"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <div className="flex min-w-0 items-center gap-3">
              <div
                className="font-display flex size-16 shrink-0 items-center justify-center rounded-full font-semibold text-white"
                style={{ background: patient.avatarBg, fontSize: 20 }}
              >
                {patient.initials}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p
                    className="font-display font-semibold"
                    style={{ fontSize: 20, color: '#0D2630' }}
                  >
                    {patient.patientName}
                  </p>
                  <span style={{ fontSize: 14, color: '#8A98A3' }}>
                    {patient.age} Y / {patient.gender}
                  </span>
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span style={{ fontSize: 14, color: '#00B4D8' }}>MRN: {patient.mrn}</span>
                  <span style={{ fontSize: 14, color: '#8A98A3' }}>Ward: {patient.ward}</span>
                  <span style={{ fontSize: 14, color: '#8A98A3' }}>Bed: {patient.bed}</span>
                </div>
                <button
                  type="button"
                  onClick={onChangePatient}
                  className={`mt-1 font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                  style={{ fontSize: 14, color: '#00B4D8' }}
                >
                  Change Patient
                </button>
              </div>
            </div>

            <div className="min-w-0">
              <p style={{ fontSize: 14, color: '#8A98A3' }}>Diagnosis</p>
              <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                {patient.diagnosis}
              </p>
              <span
                className="mt-1 inline-block rounded-full px-2.5 py-0.5 font-sans font-medium"
                style={{
                  fontSize: 14,
                  color: '#8B5CF6',
                  border: '1px solid rgba(139,92,246,0.4)',
                  background: 'rgba(139,92,246,0.08)',
                }}
              >
                {record.diagnosisTag}
              </span>
            </div>

            <div className="min-w-0">
              <p style={{ fontSize: 14, color: '#8A98A3' }}>Allergies</p>
              {allergyNames ? (
                <span
                  className="mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-sans font-medium"
                  style={{
                    fontSize: 14,
                    color: '#EF4444',
                    border: '1px solid rgba(239,68,68,0.4)',
                    background: 'rgba(239,68,68,0.08)',
                  }}
                >
                  <AlertTriangle style={{ width: 14, height: 14 }} />
                  {allergyNames}
                </span>
              ) : (
                <span
                  className="mt-1 inline-block rounded-full px-2.5 py-0.5 font-sans font-medium"
                  style={{
                    fontSize: 14,
                    color: '#22C55E',
                    border: '1px solid rgba(34,197,94,0.4)',
                    background: 'rgba(34,197,94,0.08)',
                  }}
                >
                  None Known
                </span>
              )}
            </div>

            <div className="min-w-0">
              <p style={{ fontSize: 14, color: '#8A98A3' }}>Weight</p>
              <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                {bodyMeasurements.weight.toFixed(1)} kg
              </p>
            </div>

            <div className="min-w-0">
              <p style={{ fontSize: 14, color: '#8A98A3' }}>Code Status</p>
              <span
                className="mt-1 inline-block rounded-full px-2.5 py-0.5 font-sans font-medium"
                style={{
                  fontSize: 14,
                  color: '#00B4D8',
                  border: '1px solid rgba(0,180,216,0.4)',
                  background: 'rgba(0,180,216,0.08)',
                }}
              >
                {record.codeStatus}
              </span>
            </div>

            <div className="min-w-0">
              <p style={{ fontSize: 14, color: '#8A98A3' }}>Attending Doctor</p>
              <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                {patient.doctorName}
              </p>
            </div>
          </div>

          {/* ── Allergy banner (compliance — every patient-context page) ── */}
          <AllergyBanner allergies={record.allergies} className="mt-4" />

          {/* ── 5 Rights of Medication Administration ─────────────────────── */}
          <div
            className="mt-4 rounded-[12px] p-4 sm:p-5"
            style={{ background: '#FFFBEB', border: '1px solid rgba(245,158,11,0.3)' }}
          >
            <p className="font-display font-semibold" style={{ fontSize: 16, color: '#92400E' }}>
              5 Rights of Medication Administration
            </p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div className="flex items-start gap-2">
                <CheckCircle2 style={{ width: 18, height: 18, color: '#22C55E', flexShrink: 0 }} />
                <div className="min-w-0">
                  <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                    Correct Patient
                  </p>
                  <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                    {patient.patientName}
                  </p>
                </div>
              </div>
              {FIVE_RIGHTS.map((r) => (
                <div key={r.label} className="flex items-start gap-2">
                  <CheckCircle2
                    style={{ width: 18, height: 18, color: '#22C55E', flexShrink: 0 }}
                  />
                  <div className="min-w-0">
                    <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                      {r.label}
                    </p>
                    <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                      {r.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Main content + sidebar ─────────────────────────────────────── */}
          <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-start">
            <div
              className="min-w-0 flex-1 rounded-[12px] p-4 sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              {/* Tabs */}
              <div
                className="flex flex-wrap items-center gap-5"
                style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
              >
                {(
                  [
                    { key: 'scheduled', label: 'Scheduled Medications', count: scheduled.length },
                    { key: 'prn', label: 'PRN Medications', count: prn.length },
                    { key: 'continuous', label: 'Continuous Infusions', count: infusions.length },
                  ] as { key: TabKey; label: string; count: number }[]
                ).map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab.key);
                      setSelectedId(null);
                      setCurrentPage(1);
                    }}
                    className={`flex items-center gap-1.5 pb-3 font-sans font-medium transition-colors duration-150 ${FOCUS_RING}`}
                    style={{
                      fontSize: 14,
                      color: activeTab === tab.key ? '#00B4D8' : '#4A7080',
                      borderBottom:
                        activeTab === tab.key ? '2px solid #00B4D8' : '2px solid transparent',
                    }}
                  >
                    {tab.label}
                    <span
                      className="rounded-full px-2 py-0.5 font-sans font-semibold"
                      style={{
                        fontSize: 14,
                        color: activeTab === tab.key ? '#FFFFFF' : '#4A7080',
                        background: activeTab === tab.key ? '#00B4D8' : 'rgba(226,237,241,0.6)',
                      }}
                    >
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Time filter row */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  {TIME_FILTERS.map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => {
                        setTimeFilter(f);
                        setCurrentPage(1);
                      }}
                      className={`flex h-9 items-center rounded-full px-3.5 font-sans font-medium transition-colors duration-150 ${FOCUS_RING}`}
                      style={{
                        fontSize: 14,
                        color: timeFilter === f ? '#FFFFFF' : '#4A7080',
                        background: timeFilter === f ? '#00B4D8' : 'transparent',
                        border: timeFilter === f ? 'none' : '1px solid rgba(0,100,130,0.18)',
                      }}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showHeld}
                    onChange={(e) => setShowHeld(e.target.checked)}
                    className="size-4 shrink-0 cursor-pointer rounded"
                    style={{ accentColor: '#00B4D8' }}
                  />
                  <span style={{ fontSize: 14, color: '#4A7080' }}>Show Held Medications</span>
                </label>
              </div>

              {/* Table */}
              <div className="mt-4 overflow-x-auto scroll-smooth">
                <div className="min-w-[1400px]">
                  <div
                    className="flex items-center rounded-t-[8px]"
                    style={{
                      background: 'rgba(226,237,241,0.4)',
                      borderBottom: '1px solid #E6F8FD',
                    }}
                  >
                    {[
                      ['Medication', 'min-w-[160px] flex-1 pl-3'],
                      ['Dose', 'w-24'],
                      ['Route', 'w-20'],
                      ['Frequency', 'w-32'],
                      ['Time Due', 'w-28'],
                      ['Status', 'w-28'],
                      ['Administered By', 'w-36'],
                      ['Remarks', 'w-40'],
                    ].map(([label, width]) => (
                      <div key={label} className={`${width} shrink-0 py-2.5 pr-2`}>
                        <span
                          className="font-sans font-bold tracking-wider uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          {label}
                        </span>
                      </div>
                    ))}
                    <div
                      className="sticky right-0 z-10 w-40 shrink-0 py-2.5 pr-3 text-right"
                      style={{
                        background: '#E2EDF1',
                        borderLeft: '1px solid rgba(0,100,130,0.12)',
                      }}
                    >
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Actions
                      </span>
                    </div>
                  </div>

                  {pageRows.length === 0 && (
                    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                      <div
                        className="flex size-14 items-center justify-center rounded-full"
                        style={{ background: 'rgba(226,237,241,0.6)' }}
                      >
                        <Pill style={{ width: 24, height: 24, color: '#8A98A3' }} />
                      </div>
                      <p
                        className="font-sans font-medium"
                        style={{ fontSize: 16, color: '#4A7080' }}
                      >
                        No medications match this filter
                      </p>
                      {(timeFilter !== 'All' || showHeld) && (
                        <button
                          type="button"
                          onClick={() => {
                            setTimeFilter('All');
                            setShowHeld(false);
                          }}
                          className={`mt-1 font-sans font-medium transition-colors duration-150 hover:underline ${FOCUS_RING}`}
                          style={{ fontSize: 14, color: '#00B4D8' }}
                        >
                          Clear all filters
                        </button>
                      )}
                    </div>
                  )}

                  {pageRows.map((order) => {
                    const cfg = STATUS_CFG[order.status];
                    const isSelected = selectedId === order.id;
                    return (
                      <div
                        key={order.id}
                        onClick={() => setSelectedId(order.id)}
                        className="flex cursor-pointer items-center transition-colors duration-100 hover:bg-[#F5FBFD]"
                        style={{
                          borderBottom: '1px solid rgba(0,100,130,0.08)',
                          background: isSelected ? '#E6F8FD' : 'transparent',
                        }}
                      >
                        <div className="min-w-[160px] flex-1 py-3 pr-2 pl-3">
                          <div className="flex items-center gap-1.5">
                            <p
                              className="truncate font-sans font-medium"
                              style={{
                                fontSize: 14,
                                color: order.status === 'Overdue' ? '#EF4444' : '#0D2630',
                              }}
                            >
                              {order.medication}
                            </p>
                            {order.isHighAlert && (
                              <ShieldAlert
                                aria-label="High alert medication"
                                style={{ width: 14, height: 14, color: '#EF4444', flexShrink: 0 }}
                              />
                            )}
                          </div>
                        </div>
                        <div className="w-24 shrink-0 py-3 pr-2">
                          <p style={{ fontSize: 14, color: '#4A7080' }}>{order.dose}</p>
                        </div>
                        <div className="w-20 shrink-0 py-3 pr-2">
                          <p style={{ fontSize: 14, color: '#4A7080' }}>{order.route}</p>
                        </div>
                        <div className="w-32 shrink-0 py-3 pr-2">
                          <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                            {order.frequency}
                          </p>
                        </div>
                        <div className="w-28 shrink-0 py-3 pr-2">
                          <p
                            className="whitespace-nowrap"
                            style={{
                              fontSize: 14,
                              color: order.status === 'Overdue' ? '#EF4444' : '#0D2630',
                            }}
                          >
                            {order.timeDueLabel ?? formatTime(order.timeDue)}
                          </p>
                        </div>
                        <div className="w-28 shrink-0 py-3 pr-2">
                          <span
                            className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium whitespace-nowrap"
                            style={{
                              fontSize: 14,
                              color: cfg.color,
                              border: `1px solid ${cfg.border}`,
                              background: cfg.bg,
                            }}
                          >
                            {order.status}
                          </span>
                        </div>
                        <div className="w-36 shrink-0 py-3 pr-2">
                          <p className="truncate" style={{ fontSize: 14, color: '#0D2630' }}>
                            {order.administeredBy ?? '—'}
                          </p>
                        </div>
                        <div className="w-40 shrink-0 py-3 pr-2">
                          <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                            {order.remarks ?? '—'}
                          </p>
                        </div>
                        <div
                          className="sticky right-0 z-10 flex w-40 shrink-0 items-center justify-end gap-1 py-3 pr-3"
                          style={{
                            background: isSelected ? '#E6F8FD' : '#FFFFFF',
                            borderLeft: '1px solid rgba(0,100,130,0.12)',
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <PermissionGate permission={PERMISSIONS.ENCOUNTERS_WRITE}>
                            {order.status === 'Completed' ? (
                              <button
                                type="button"
                                onClick={() => setSelectedId(order.id)}
                                className={`flex h-9 items-center gap-1.5 rounded-[8px] px-3 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                                style={{
                                  fontSize: 14,
                                  color: '#00B4D8',
                                  border: '1px solid rgba(0,180,216,0.35)',
                                }}
                              >
                                <Eye style={{ width: 14, height: 14 }} />
                                View
                              </button>
                            ) : order.status === 'Overdue' || order.status === 'Missed' ? (
                              <button
                                type="button"
                                onClick={() => markMissedDose(order.id)}
                                className={`flex h-9 items-center gap-1.5 rounded-[8px] px-3 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                                style={{
                                  fontSize: 14,
                                  background: '#EF4444',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                <XCircle style={{ width: 14, height: 14 }} />
                                Missed Dose
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => administerMedication(order.id)}
                                className={`flex h-9 items-center gap-1.5 rounded-[8px] px-3 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                                style={{
                                  fontSize: 14,
                                  background: '#00B4D8',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                <Syringe style={{ width: 14, height: 14 }} />
                                Administer
                              </button>
                            )}
                            <RowMenu
                              open={openMenuId === order.id}
                              onToggle={() =>
                                setOpenMenuId(openMenuId === order.id ? null : order.id)
                              }
                              onHold={() => holdMedication(order.id)}
                              onMissed={() => markMissedDose(order.id)}
                              onReaction={() => documentReaction(order.id)}
                            />
                          </PermissionGate>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pagination */}
              {filtered.length > 0 && (
                <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
                  <p style={{ fontSize: 14, color: '#4A7080' }}>
                    Showing {pageStart + 1} to {Math.min(pageStart + rowsPerPage, filtered.length)}{' '}
                    of {filtered.length} medications
                  </p>
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: 14, color: '#4A7080' }}>Rows per page:</span>
                    <select
                      value={rowsPerPage}
                      onChange={(e) => {
                        setRowsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className={`h-9 rounded-[8px] px-2 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                      style={{
                        fontSize: 14,
                        border: '1px solid rgba(0,100,130,0.18)',
                        color: '#0D2630',
                      }}
                    >
                      {[10, 25, 50].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>
                  {totalPages > 1 && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={safePage === 1}
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        className={`flex size-9 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#F5FBFD] disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING}`}
                        style={{ border: '1px solid rgba(0,100,130,0.18)', color: '#4A7080' }}
                        aria-label="Previous page"
                      >
                        ‹
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setCurrentPage(p)}
                          className={`flex size-9 items-center justify-center rounded-[8px] font-sans font-medium transition-colors duration-150 ${FOCUS_RING}`}
                          style={
                            p === safePage
                              ? { background: '#00B4D8', color: '#FFFFFF', fontSize: 14 }
                              : {
                                  border: '1px solid rgba(0,100,130,0.18)',
                                  color: '#4A7080',
                                  fontSize: 14,
                                }
                          }
                        >
                          {p}
                        </button>
                      ))}
                      <button
                        type="button"
                        disabled={safePage === totalPages}
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        className={`flex size-9 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#F5FBFD] disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING}`}
                        style={{ border: '1px solid rgba(0,100,130,0.18)', color: '#4A7080' }}
                        aria-label="Next page"
                      >
                        ›
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Sidebar ─────────────────────────────────────────────────── */}
            <div className="flex w-full shrink-0 flex-col gap-4 xl:w-[320px]">
              <div
                className="rounded-[12px] p-4 sm:p-5"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <h2
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Administration Actions
                </h2>
                <PermissionGate permission={PERMISSIONS.ENCOUNTERS_WRITE}>
                  <div className="mt-3 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => requireSelection(administerMedication)}
                      className={`flex h-11 items-center gap-2.5 rounded-[10px] px-3.5 font-sans font-medium transition-opacity duration-150 hover:opacity-85 ${FOCUS_RING}`}
                      style={{ fontSize: 14, color: '#166534', background: 'rgba(34,197,94,0.12)' }}
                    >
                      <Syringe style={{ width: 17, height: 17 }} />
                      Administer Medication
                    </button>
                    <button
                      type="button"
                      onClick={() => requireSelection(holdMedication)}
                      className={`flex h-11 items-center gap-2.5 rounded-[10px] px-3.5 font-sans font-medium transition-opacity duration-150 hover:opacity-85 ${FOCUS_RING}`}
                      style={{
                        fontSize: 14,
                        color: '#92400E',
                        background: 'rgba(245,158,11,0.12)',
                      }}
                    >
                      <Pause style={{ width: 17, height: 17 }} />
                      Hold Medication
                    </button>
                    <button
                      type="button"
                      onClick={() => requireSelection(markMissedDose)}
                      className={`flex h-11 items-center gap-2.5 rounded-[10px] px-3.5 font-sans font-medium transition-opacity duration-150 hover:opacity-85 ${FOCUS_RING}`}
                      style={{ fontSize: 14, color: '#7F1D1D', background: 'rgba(239,68,68,0.12)' }}
                    >
                      <XCircle style={{ width: 17, height: 17 }} />
                      Missed Dose
                    </button>
                    <button
                      type="button"
                      onClick={() => requireSelection(documentReaction)}
                      className={`flex h-11 items-center gap-2.5 rounded-[10px] px-3.5 font-sans font-medium transition-opacity duration-150 hover:opacity-85 ${FOCUS_RING}`}
                      style={{
                        fontSize: 14,
                        color: '#5B21B6',
                        background: 'rgba(139,92,246,0.12)',
                      }}
                    >
                      <ShieldAlert style={{ width: 17, height: 17 }} />
                      Document Reaction
                    </button>
                  </div>
                </PermissionGate>
              </div>

              <div
                className="rounded-[12px] p-4 sm:p-5"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <div className="flex items-center gap-2">
                  <Shield style={{ width: 16, height: 16, color: '#00B4D8' }} />
                  <h2
                    className="font-display font-semibold"
                    style={{ fontSize: 16, color: '#0D2630' }}
                  >
                    Last Allergies Review
                  </h2>
                </div>
                <p className="mt-2" style={{ fontSize: 14, color: '#0D2630' }}>
                  {lastAllergyReview
                    ? formatTime(lastAllergyReview.recordedAt)
                    : 'No allergies recorded'}
                </p>
                {lastAllergyReview && (
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>
                    By {lastAllergyReview.recordedBy}
                  </p>
                )}
              </div>

              <div
                className="rounded-[12px] border-2 border-dashed p-4 sm:p-5"
                style={{ borderColor: 'rgba(0,100,130,0.2)' }}
              >
                <h2
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Quick Scan (Future)
                </h2>
                <p className="mt-0.5" style={{ fontSize: 14, color: '#8A98A3' }}>
                  Scan patient wristband or medication barcode
                </p>
                <button
                  type="button"
                  disabled
                  aria-disabled="true"
                  className="mt-3 flex h-11 w-full cursor-not-allowed items-center justify-center gap-2 rounded-[10px] font-sans font-medium"
                  style={{
                    fontSize: 14,
                    color: '#8A98A3',
                    border: '1px dashed rgba(0,100,130,0.3)',
                    background: '#F5FBFD',
                  }}
                >
                  <ScanLine style={{ width: 16, height: 16 }} />
                  Scan Barcode
                </button>
              </div>

              <div
                className="rounded-[12px] p-4 sm:p-5"
                style={{
                  background: 'rgba(239,68,68,0.04)',
                  border: '1px solid rgba(239,68,68,0.25)',
                }}
              >
                <h2
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Clinical Alerts
                </h2>
                <div className="mt-3 flex flex-col gap-3">
                  {CLINICAL_ALERTS.map((alert) => (
                    <div key={alert.id} className="flex items-start gap-2">
                      <AlertTriangle
                        style={{
                          width: 16,
                          height: 16,
                          color: '#EF4444',
                          flexShrink: 0,
                          marginTop: 2,
                        }}
                      />
                      <div className="min-w-0">
                        <p
                          className="font-sans font-medium"
                          style={{ fontSize: 14, color: '#7F1D1D' }}
                        >
                          {alert.title}
                        </p>
                        <p style={{ fontSize: 14, color: '#4A7080' }}>{alert.body}</p>
                        {alert.time && (
                          <p style={{ fontSize: 14, color: '#8A98A3' }}>{alert.time}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="h-4" />
        </div>
      </main>

      {administerTargetId &&
        (() => {
          const targetOrder = findOrder(administerTargetId);
          if (!targetOrder) return null;
          return (
            <AdministerMedicationModal
              order={targetOrder}
              patientName={patient.patientName}
              allergies={record.allergies}
              onClose={() => setAdministerTargetId(null)}
              onConfirm={confirmAdministration}
            />
          );
        })()}
    </div>
  );
}
