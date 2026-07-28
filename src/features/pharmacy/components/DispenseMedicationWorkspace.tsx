'use client';

import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Hourglass,
  Info,
  PauseCircle,
  Search,
  Upload,
  XCircle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { FormSelect } from '@components/shared/FormSelect';
import { PermissionGate } from '@components/shared/PermissionGate';
import { PERMISSIONS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { formatDate, formatDateTime } from '@/utils/datetime';
import { getPatientDetail } from '@/features/patients/__mocks__/patientFixtures';
import {
  getInteractionWarning,
  getStockForMedication,
} from '@/features/pharmacy/__mocks__/pharmacyFixtures';
import {
  cancelPrescription,
  toggleHold,
  usePendingVerificationQueue,
  useQueueEntry,
  verifyAndDispense,
} from '@/features/pharmacy/store/pharmacyDispensingStore';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const STEPS = ['Verify Prescription', 'Select Items', 'Dispense & Label', 'Complete'] as const;

const COUNSELLING_ITEMS = [
  'How to take medication',
  'Possible side effects',
  'What to do if dose is missed',
  'When to seek medical help',
  'Other (specify in notes)',
];

type Attachment = { name: string; sizeLabel: string };

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return `${parts[0]?.[0] ?? ''}${parts[parts.length - 1]?.[0] ?? ''}`.toUpperCase();
}

function ageGenderLabel(patient: { age: string; gender: string }): string {
  const ageNum = /^\d+/.exec(patient.age)?.[0] ?? patient.age;
  return `${ageNum} Years`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export function DispenseMedicationWorkspace() {
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const actorName = user?.name ?? 'Pharmacist';

  const [rxNo, setRxNo] = useState<string | null>(null);
  const [paramsRead, setParamsRead] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');

  const [currentStep, setCurrentStep] = useState(0);
  const [identityVerified, setIdentityVerified] = useState(false);
  const [allergiesChecked, setAllergiesChecked] = useState(false);
  const [interactionsReviewed, setInteractionsReviewed] = useState(false);
  const [doseConfirmed, setDoseConfirmed] = useState(false);

  const [selectedBatchNo, setSelectedBatchNo] = useState('');
  const [qtyToDispense, setQtyToDispense] = useState(0);
  const [dispenseListed, setDispenseListed] = useState(false);
  const [dispenseNotes, setDispenseNotes] = useState('');
  const [counselling, setCounselling] = useState<Record<string, boolean>>({});
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  useEffect(() => {
    const t = setTimeout(() => {
      setRxNo(new URLSearchParams(window.location.search).get('rx'));
      setParamsRead(true);
    }, 0);
    return () => clearTimeout(t);
  }, []);

  const entry = useQueueEntry(rxNo);
  const pendingQueue = usePendingVerificationQueue();
  const stock = entry ? getStockForMedication(entry.medicationName) : null;

  // Reset per-prescription wizard state whenever the selected Rx changes.
  useEffect(() => {
    const t = setTimeout(() => {
      setCurrentStep(0);
      setIdentityVerified(false);
      setAllergiesChecked(false);
      setInteractionsReviewed(false);
      setDoseConfirmed(false);
      setSelectedBatchNo('');
      setDispenseListed(false);
      setDispenseNotes('');
      setCounselling({});
      setAttachments([]);
    }, 0);
    return () => clearTimeout(t);
  }, [rxNo]);

  useEffect(() => {
    if (!entry) return;
    const t = setTimeout(() => setQtyToDispense(entry.quantity), 0);
    return () => clearTimeout(t);
    // Only re-sync when the selected Rx or its quantity changes, not on every
    // unrelated store emit (which would keep resetting a pharmacist's edits).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry?.rxNo, entry?.quantity]);

  useEffect(() => {
    const firstBatch = stock?.batches[0]?.batchNo;
    if (!firstBatch || selectedBatchNo) return;
    const t = setTimeout(() => setSelectedBatchNo(firstBatch), 0);
    return () => clearTimeout(t);
  }, [stock, selectedBatchNo]);

  if (!paramsRead) {
    return <main className="flex-1" style={{ background: '#F5FBFD' }} />;
  }

  if (!rxNo) {
    const filteredQueue = pendingQueue.filter((e) => {
      const q = pickerSearch.trim().toLowerCase();
      if (!q) return true;
      const p = getPatientDetail(e.patientId);
      return (
        p.name.toLowerCase().includes(q) ||
        e.medicationName.toLowerCase().includes(q) ||
        e.rxNo.toLowerCase().includes(q)
      );
    });
    return (
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto max-w-[640px] px-4 py-8 sm:px-6">
          <h1 className="font-display font-semibold" style={{ fontSize: 24, color: '#0D2630' }}>
            Select a Prescription to Dispense
          </h1>
          <p className="mt-1" style={{ fontSize: 14, color: '#4A7080' }}>
            Choose a pending prescription from the queue below.
          </p>
          <div className="relative mt-4">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
              style={{ width: 16, height: 16, color: '#8A98A3' }}
            />
            <input
              type="search"
              value={pickerSearch}
              onChange={(e) => setPickerSearch(e.target.value)}
              placeholder="Search patient, medication, or Rx No…"
              className={`h-11 w-full rounded-[10px] pr-4 pl-9 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
              style={{ fontSize: 14, border: '1px solid rgba(0,100,130,0.18)', color: '#0D2630' }}
            />
          </div>
          <div className="mt-4 flex flex-col gap-2">
            {filteredQueue.length === 0 ? (
              <p className="py-6 text-center" style={{ fontSize: 14, color: '#8A98A3' }}>
                No pending prescriptions match your search.
              </p>
            ) : (
              filteredQueue.slice(0, 20).map((e) => {
                const p = getPatientDetail(e.patientId);
                return (
                  <button
                    key={e.rxNo}
                    type="button"
                    onClick={() => {
                      router.push(`${ROUTES.pharmacyDispense}?rx=${e.rxNo}`);
                      setRxNo(e.rxNo);
                    }}
                    className={`flex items-center justify-between gap-3 rounded-[10px] p-3 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                    style={{ border: '1px solid rgba(0,100,130,0.12)', background: '#FFFFFF' }}
                  >
                    <div className="min-w-0">
                      <p
                        className="truncate font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {p.name}
                      </p>
                      <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                        {e.medicationName} {e.dose} · {e.rxNo}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
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

  const alreadyProcessed = entry.stage !== 'Pending Verification';
  const patient = getPatientDetail(entry.patientId);
  const activeMedNames = patient.medications
    .filter((m) => m.status === 'active')
    .map((m) => m.name);
  const interaction = getInteractionWarning(entry.medicationName, activeMedNames);
  const availableStock = stock?.currentStock ?? 0;
  const stockSufficient = qtyToDispense > 0 && qtyToDispense <= availableStock;
  const batchOptions = (stock?.batches ?? []).map((b) => ({ value: b.batchNo, label: b.batchNo }));
  const selectedBatch =
    stock?.batches.find((b) => b.batchNo === selectedBatchNo) ?? stock?.batches[0];

  const checklist = [
    { label: 'Patient identity verified', done: identityVerified, set: setIdentityVerified },
    { label: 'Allergies checked', done: allergiesChecked, set: setAllergiesChecked },
    {
      label: 'Drug interactions reviewed',
      done: interactionsReviewed,
      set: setInteractionsReviewed,
    },
    { label: 'Dose, route & duration confirmed', done: doseConfirmed, set: setDoseConfirmed },
  ];
  const checklistDone = checklist.every((c) => c.done) && stockSufficient;

  function handleConfirmAndContinue() {
    if (currentStep === 0) {
      if (!checklistDone) {
        toast.info('Checklist incomplete', 'Complete every safety check before continuing.');
        return;
      }
      setCurrentStep(1);
      return;
    }
    if (currentStep === 1) {
      if (!dispenseListed) {
        toast.info('Nothing to dispense', 'Add this medication to the dispense list first.');
        return;
      }
      setCurrentStep(2);
      return;
    }
    if (currentStep === 2) {
      verifyAndDispense(entry!.rxNo, actorName);
      setCurrentStep(3);
      toast.success('Prescription dispensed', `${entry!.rxNo} moved to Ready for Pickup.`);
    }
  }

  function handleAddToDispenseList() {
    if (qtyToDispense <= 0) {
      toast.info('Enter a quantity', 'Quantity to dispense must be greater than zero.');
      return;
    }
    setDispenseListed(true);
    toast.success(
      'Added to dispense list',
      `${entry!.medicationName} ${entry!.dose} — ${qtyToDispense} ${stock?.unit ?? entry!.form}${qtyToDispense === 1 ? '' : 's'}.`,
    );
  }

  function handleHold() {
    toggleHold(entry!.rxNo);
    toast.info(entry!.isOnHold ? 'Hold released' : 'Prescription held', `${entry!.rxNo} updated.`);
  }

  function handleReject() {
    cancelPrescription(entry!.rxNo);
    toast.info('Prescription rejected', `${entry!.rxNo} has been cancelled.`);
    router.push(ROUTES.pharmacyPrescriptionQueue);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0]!;
    if (file.size > 5 * 1024 * 1024) {
      toast.info('File too large', 'Maximum attachment size is 5MB.');
      return;
    }
    setAttachments((prev) => [...prev, { name: file.name, sizeLabel: formatFileSize(file.size) }]);
    e.target.value = '';
  }

  const primaryLabel =
    currentStep === 0
      ? 'Confirm & Continue'
      : currentStep === 1
        ? 'Proceed to Dispense & Label'
        : 'Complete Dispensing';

  if (currentStep === 3) {
    return (
      <main className="flex flex-1 items-center justify-center" style={{ background: '#F5FBFD' }}>
        <div className="flex flex-col items-center gap-3 px-6 text-center">
          <div
            className="flex size-16 items-center justify-center rounded-full"
            style={{ background: 'rgba(22,163,74,0.1)' }}
          >
            <CheckCircle2 style={{ width: 32, height: 32, color: '#16A34A' }} />
          </div>
          <p className="font-display font-semibold" style={{ fontSize: 20, color: '#0D2630' }}>
            Prescription Dispensed
          </p>
          <p className="max-w-[420px]" style={{ fontSize: 14, color: '#4A7080' }}>
            {entry.rxNo} for {patient.name} has been dispensed and moved to Ready for Pickup.
          </p>
          <div className="mt-2 flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => router.push(`${ROUTES.pharmacyPrescriptionDetails}?rx=${entry.rxNo}`)}
              className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
              style={{ fontSize: 14, background: '#00B4D8' }}
            >
              View Prescription Details
            </button>
            <button
              type="button"
              onClick={() => router.push(ROUTES.pharmacyPrescriptionQueue)}
              className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
              style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
            >
              Back to Prescription Queue
            </button>
          </div>
        </div>
      </main>
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
            Dispense Medication
          </span>
        </nav>

        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1
              className="font-display font-semibold"
              style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
            >
              Dispense Medication
            </h1>
            <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
              Verify prescription, confirm dose, check stock and dispense medication.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push(`${ROUTES.pharmacyPrescriptionDetails}?rx=${entry.rxNo}`)}
            className={`flex h-11 shrink-0 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
            style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
          >
            ← Back to Prescription Details
          </button>
        </div>

        {alreadyProcessed && (
          <div
            className="mt-4 flex items-center gap-2.5 rounded-[12px] p-4"
            style={{ background: 'rgba(217,119,6,0.06)', border: '1px solid rgba(217,119,6,0.25)' }}
          >
            <Info style={{ width: 18, height: 18, color: '#D97706' }} className="shrink-0" />
            <p style={{ fontSize: 14, color: '#0D2630' }}>
              This prescription has already been processed — current status:{' '}
              <span className="font-semibold">{entry.stage}</span>.{' '}
              <button
                type="button"
                onClick={() =>
                  router.push(`${ROUTES.pharmacyPrescriptionDetails}?rx=${entry.rxNo}`)
                }
                className={`font-medium underline ${FOCUS_RING}`}
              >
                View its details instead.
              </button>
            </p>
          </div>
        )}

        {!alreadyProcessed && (
          <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_320px]">
            <div className="flex min-w-0 flex-col gap-4">
              {/* Stepper */}
              <div className="flex items-center overflow-x-auto scroll-smooth">
                {STEPS.map((label, i) => (
                  <div key={label} className="flex shrink-0 items-center">
                    <div className="flex items-center gap-2">
                      <div
                        className="flex size-8 shrink-0 items-center justify-center rounded-full font-sans font-semibold"
                        style={{
                          fontSize: 14,
                          background:
                            i < currentStep
                              ? '#16A34A'
                              : i === currentStep
                                ? '#00B4D8'
                                : 'rgba(0,100,130,0.1)',
                          color: i <= currentStep ? '#FFFFFF' : '#8A98A3',
                        }}
                      >
                        {i < currentStep ? (
                          <CheckCircle2 style={{ width: 16, height: 16 }} />
                        ) : (
                          i + 1
                        )}
                      </div>
                      <span
                        className="whitespace-nowrap"
                        style={{
                          fontSize: 14,
                          fontWeight: i === currentStep ? 600 : 400,
                          color: i === currentStep ? '#0D2630' : '#4A7080',
                        }}
                      >
                        {label}
                      </span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <span
                        className="mx-3 h-px w-10 shrink-0"
                        style={{ background: i < currentStep ? '#16A34A' : 'rgba(0,100,130,0.15)' }}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Clinical alerts */}
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                {entry.hasAllergyAlert && patient.allergies.length > 0 && (
                  <div
                    className="flex items-start gap-2 rounded-[10px] p-3"
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
                        Patient is allergic to{' '}
                        {patient.allergies.map((a) => a.substance).join(', ')}
                      </p>
                    </div>
                  </div>
                )}
                {interaction && (
                  <div
                    className="flex items-start gap-2 rounded-[10px] p-3"
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
                <div
                  className="flex items-start gap-2 rounded-[10px] p-3"
                  style={{
                    background: 'rgba(0,180,216,0.05)',
                    border: '1px solid rgba(0,180,216,0.2)',
                  }}
                >
                  <Info
                    style={{ width: 16, height: 16, color: '#00B4D8' }}
                    className="mt-0.5 shrink-0"
                  />
                  <p style={{ fontSize: 14, color: '#0D2630' }}>
                    Verify patient identity, medication, dose, and duration before dispensing.
                  </p>
                </div>
              </div>

              {/* Patient + prescription meta */}
              <div
                className="flex flex-col gap-4 rounded-[12px] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <div className="flex items-center gap-3">
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
                      {ageGenderLabel(patient)} · MRN: {patient.mrn}
                    </p>
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>{patient.phone}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                  <div>
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>Prescription No.</p>
                    <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                      {entry.rxNo}
                    </p>
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
                  <div>
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>Date</p>
                    <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                      {formatDateTime(entry.receivedAt)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Prescription Items */}
              <div
                className="rounded-[12px] p-4 sm:p-5"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <h2
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Prescription Items (1)
                </h2>
                <div className="mt-3 overflow-x-auto scroll-smooth">
                  <div style={{ minWidth: 970 }}>
                    <div
                      className="flex rounded-t-[8px]"
                      style={{
                        background: 'rgba(226,237,241,0.4)',
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
                      <div className="w-36 shrink-0 py-2.5 pr-2">
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
                      <div className="w-36 shrink-0 py-2.5 pr-2">
                        <span
                          className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Qty Prescribed
                        </span>
                      </div>
                      <div className="w-36 shrink-0 py-2.5 pr-2">
                        <span
                          className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Qty to Dispense
                        </span>
                      </div>
                      <div className="w-20 shrink-0 py-2.5 pr-3">
                        <span
                          className="font-sans font-bold tracking-wider uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Route
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
                        <p
                          className="truncate font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {entry.medicationName}
                        </p>
                        <p style={{ fontSize: 14, color: '#8A98A3' }}>{entry.instructions}</p>
                      </div>
                      <div className="w-36 shrink-0 py-3 pr-2">
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
                      <div className="w-36 shrink-0 py-3 pr-2">
                        <p style={{ fontSize: 14, color: '#4A7080' }}>
                          {entry.quantity} {entry.form}
                          {entry.quantity === 1 ? '' : 's'}
                        </p>
                      </div>
                      <div className="w-36 shrink-0 py-3 pr-2">
                        <p
                          className="font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {qtyToDispense} {stock?.unit ?? entry.form}
                          {qtyToDispense === 1 ? '' : 's'}
                        </p>
                      </div>
                      <div className="w-20 shrink-0 py-3 pr-3">
                        <p style={{ fontSize: 14, color: '#4A7080' }}>{entry.route}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <p style={{ fontSize: 14, color: '#4A7080' }}>Total Items: 1</p>
                  <p style={{ fontSize: 14, color: '#0D2630' }}>
                    Total to Dispense:{' '}
                    <span
                      className="rounded-full px-2.5 py-0.5 font-sans font-medium"
                      style={{
                        fontSize: 14,
                        color: '#16A34A',
                        background: 'rgba(22,163,74,0.08)',
                        border: '1px solid rgba(22,163,74,0.3)',
                      }}
                    >
                      {qtyToDispense} units
                    </span>
                  </p>
                </div>
              </div>

              {/* Stock & Batch | Dispense Notes | Attachments */}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div
                  className="rounded-[12px] p-4 sm:p-5"
                  style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                >
                  <h2
                    className="font-display font-semibold"
                    style={{ fontSize: 16, color: '#0D2630' }}
                  >
                    Stock &amp; Batch Selection
                  </h2>
                  <div className="mt-3 flex flex-col gap-3">
                    <div>
                      <p style={{ fontSize: 14, color: '#8A98A3' }}>Medication</p>
                      <p
                        className="font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {stock?.name ?? `${entry.medicationName} ${entry.dose}`}
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span style={{ fontSize: 14, color: '#8A98A3' }}>Available Stock</span>
                      <span style={{ fontSize: 14, color: '#0D2630' }}>
                        {availableStock} {stock?.unit ?? entry.form}s
                      </span>
                    </div>
                    {batchOptions.length > 0 && (
                      <div>
                        <p className="mb-1" style={{ fontSize: 14, color: '#8A98A3' }}>
                          Select Batch
                        </p>
                        <FormSelect
                          id="dispense-batch"
                          value={selectedBatchNo}
                          onChange={setSelectedBatchNo}
                          options={batchOptions}
                          placeholder="Select a batch"
                        />
                      </div>
                    )}
                    {selectedBatch && (
                      <div className="flex items-center justify-between">
                        <span style={{ fontSize: 14, color: '#8A98A3' }}>Expiry Date</span>
                        <span style={{ fontSize: 14, color: '#0D2630' }}>
                          {formatDate(selectedBatch.expiryDate)}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="mb-1" style={{ fontSize: 14, color: '#8A98A3' }}>
                        Qty to Dispense
                      </p>
                      <input
                        type="number"
                        min={1}
                        value={qtyToDispense}
                        onChange={(e) => {
                          setQtyToDispense(Math.max(0, Number(e.target.value)));
                          setDispenseListed(false);
                        }}
                        className={`h-11 w-full rounded-[10px] px-3 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                        style={{
                          fontSize: 14,
                          border: '1px solid rgba(0,100,130,0.18)',
                          color: '#0D2630',
                        }}
                      />
                    </div>
                    <div
                      className="flex items-center gap-2 rounded-[8px] p-2.5"
                      style={{
                        background: stockSufficient
                          ? 'rgba(22,163,74,0.06)'
                          : 'rgba(220,38,38,0.06)',
                        border: `1px solid ${stockSufficient ? 'rgba(22,163,74,0.25)' : 'rgba(220,38,38,0.25)'}`,
                      }}
                    >
                      {stockSufficient ? (
                        <CheckCircle2 style={{ width: 15, height: 15, color: '#16A34A' }} />
                      ) : (
                        <XCircle style={{ width: 15, height: 15, color: '#DC2626' }} />
                      )}
                      <span style={{ fontSize: 14, color: '#0D2630' }}>
                        {stockSufficient
                          ? 'Sufficient stock in selected batch'
                          : 'Insufficient stock'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddToDispenseList}
                      className={`flex h-11 items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                      style={{
                        fontSize: 14,
                        color: dispenseListed ? '#16A34A' : '#00B4D8',
                        border: `1px solid ${dispenseListed ? 'rgba(22,163,74,0.35)' : 'rgba(0,180,216,0.3)'}`,
                      }}
                    >
                      {dispenseListed ? (
                        <>
                          <CheckCircle2 style={{ width: 15, height: 15 }} />
                          Added to Dispense List
                        </>
                      ) : (
                        '+ Add to Dispense List'
                      )}
                    </button>
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
                    Dispense Notes{' '}
                    <span style={{ fontWeight: 400, color: '#8A98A3' }}>(Optional)</span>
                  </h2>
                  <div className="relative mt-3">
                    <textarea
                      value={dispenseNotes}
                      onChange={(e) => setDispenseNotes(e.target.value.slice(0, 250))}
                      rows={4}
                      placeholder="Add notes for this dispense…"
                      className={`w-full resize-none rounded-[10px] p-2.5 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                      style={{
                        fontSize: 14,
                        border: '1px solid rgba(0,100,130,0.18)',
                        color: '#0D2630',
                      }}
                    />
                    <span
                      className="absolute right-2 bottom-2"
                      style={{ fontSize: 14, color: '#8A98A3' }}
                    >
                      {dispenseNotes.length}/250
                    </span>
                  </div>
                  <h3
                    className="mt-4 font-sans font-semibold"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    Counselling Provided
                  </h3>
                  <div className="mt-2 flex flex-col gap-2">
                    {COUNSELLING_ITEMS.map((item) => (
                      <label key={item} className="flex cursor-pointer items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={Boolean(counselling[item])}
                          onChange={(e) =>
                            setCounselling((c) => ({ ...c, [item]: e.target.checked }))
                          }
                          className={`size-5 shrink-0 rounded ${FOCUS_RING}`}
                          style={{ accentColor: '#00B4D8' }}
                        />
                        <span style={{ fontSize: 14, color: '#0D2630' }}>{item}</span>
                      </label>
                    ))}
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
                    Attachments
                  </h2>
                  <label
                    className={`mt-3 flex h-11 cursor-pointer items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                    style={{
                      fontSize: 14,
                      color: '#00B4D8',
                      border: '1px dashed rgba(0,180,216,0.4)',
                    }}
                  >
                    <Upload style={{ width: 15, height: 15 }} />
                    Upload File
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </label>
                  <p className="mt-2" style={{ fontSize: 14, color: '#8A98A3' }}>
                    Upload patient consent or other documents if required. Supported formats: PDF,
                    JPG, PNG (Max 5MB).
                  </p>
                  {attachments.length > 0 && (
                    <div className="mt-3 flex flex-col gap-2">
                      {attachments.map((a, i) => (
                        <div key={`${a.name}-${i}`} className="flex items-center gap-2">
                          <FileText
                            style={{ width: 15, height: 15, color: '#4A7080' }}
                            className="shrink-0"
                          />
                          <p className="truncate" style={{ fontSize: 14, color: '#0D2630' }}>
                            {a.name}
                          </p>
                          <span className="shrink-0" style={{ fontSize: 14, color: '#8A98A3' }}>
                            {a.sizeLabel}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right sidebar */}
            <div className="flex w-full shrink-0 flex-col gap-4">
              <div
                className="rounded-[12px] p-4 sm:p-5"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2
                    className="font-display font-semibold"
                    style={{ fontSize: 16, color: '#0D2630' }}
                  >
                    Prescription Summary
                  </h2>
                  <span
                    className="shrink-0 rounded-full px-2.5 py-0.5 font-sans font-medium whitespace-nowrap"
                    style={{
                      fontSize: 14,
                      color: '#7C3AED',
                      border: '1px solid rgba(124,58,237,0.35)',
                      background: 'rgba(124,58,237,0.08)',
                    }}
                  >
                    {entry.stage}
                  </span>
                </div>
                <div className="mt-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <span style={{ fontSize: 14, color: '#8A98A3' }}>Rx No.</span>
                    <span style={{ fontSize: 14, color: '#0D2630' }}>{entry.rxNo}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span style={{ fontSize: 14, color: '#8A98A3' }}>Prescriber</span>
                    <span style={{ fontSize: 14, color: '#0D2630' }}>{entry.doctorName}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span style={{ fontSize: 14, color: '#8A98A3' }}>Department</span>
                    <span style={{ fontSize: 14, color: '#0D2630' }}>{entry.department}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span style={{ fontSize: 14, color: '#8A98A3' }}>Date</span>
                    <span style={{ fontSize: 14, color: '#0D2630' }}>
                      {formatDateTime(entry.receivedAt)}
                    </span>
                  </div>
                </div>
              </div>

              <div
                className="rounded-[12px] p-4 sm:p-5"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <div className="flex items-center justify-between gap-2">
                  <h2
                    className="font-display font-semibold"
                    style={{ fontSize: 16, color: '#0D2630' }}
                  >
                    Patient Summary
                  </h2>
                  <button
                    type="button"
                    onClick={() => router.push(`/patients/${entry.patientId}`)}
                    className={`font-sans font-medium transition-colors duration-150 hover:underline ${FOCUS_RING}`}
                    style={{ fontSize: 14, color: '#00B4D8' }}
                  >
                    View Full Profile
                  </button>
                </div>
                <div className="mt-3 flex flex-col gap-2.5">
                  <div>
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>Allergies</p>
                    <p
                      style={{
                        fontSize: 14,
                        color: patient.allergies.length > 0 ? '#DC2626' : '#0D2630',
                      }}
                    >
                      {patient.allergies.length > 0
                        ? patient.allergies.map((a) => a.substance).join(', ')
                        : 'None recorded'}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>Chronic Conditions</p>
                    <p style={{ fontSize: 14, color: '#0D2630' }}>
                      {patient.medicalHistory.chronicConditions.length > 0
                        ? patient.medicalHistory.chronicConditions
                            .map((c) => c.condition)
                            .join(', ')
                        : 'None recorded'}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>Current Medications</p>
                    <p style={{ fontSize: 14, color: '#0D2630' }}>
                      {activeMedNames.length > 0 ? activeMedNames.join(', ') : 'None recorded'}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span style={{ fontSize: 14, color: '#8A98A3' }}>Last Visit</span>
                    <span style={{ fontSize: 14, color: '#0D2630' }}>
                      {patient.consultations[0]?.date ?? 'No visits recorded'}
                    </span>
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
                  Safety Checklist
                </h2>
                <div className="mt-3 flex flex-col gap-2">
                  {checklist.map((item) => (
                    <label key={item.label} className="flex cursor-pointer items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={item.done}
                        onChange={(e) => item.set(e.target.checked)}
                        className={`size-5 shrink-0 rounded ${FOCUS_RING}`}
                        style={{ accentColor: '#00B4D8' }}
                      />
                      <span style={{ fontSize: 14, color: '#0D2630' }}>{item.label}</span>
                    </label>
                  ))}
                  <div className="flex items-center gap-2.5">
                    {stockSufficient ? (
                      <CheckCircle2 style={{ width: 20, height: 20, color: '#16A34A' }} />
                    ) : (
                      <XCircle style={{ width: 20, height: 20, color: '#DC2626' }} />
                    )}
                    <span style={{ fontSize: 14, color: '#0D2630' }}>
                      Stock availability confirmed
                    </span>
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
                  Actions
                </h2>
                <div className="mt-3 flex flex-col gap-2.5">
                  <PermissionGate permission={PERMISSIONS.PHARMACY_DISPENSE}>
                    <button
                      type="button"
                      onClick={handleConfirmAndContinue}
                      className={`flex h-11 items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                      style={{ fontSize: 14, background: '#16A34A' }}
                    >
                      <CheckCircle2 style={{ width: 15, height: 15 }} />
                      {primaryLabel}
                    </button>
                    <button
                      type="button"
                      onClick={handleHold}
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
                  </PermissionGate>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer safety banner */}
        <div
          className="mt-5 flex items-start gap-2.5 rounded-[12px] p-4"
          style={{ background: 'rgba(0,180,216,0.06)', border: '1px solid rgba(0,180,216,0.25)' }}
        >
          <Info style={{ width: 16, height: 16, color: '#00B4D8' }} className="mt-0.5 shrink-0" />
          <p style={{ fontSize: 14, color: '#0D2630' }}>
            Always verify the 5 Rights: Right Patient, Right Medication, Right Dose, Right Route,
            Right Time.
          </p>
        </div>

        <div className="h-4" />
      </div>
    </main>
  );
}
