'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronRight,
  IdCard,
  Search,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { AdditionalDetailsStep } from '@/features/registration/components/AdditionalDetailsStep';
import { PatientInformationStep } from '@/features/registration/components/PatientInformationStep';
import { ReviewConfirmStep } from '@/features/registration/components/ReviewConfirmStep';
import {
  ADDITIONAL_DETAILS_DEFAULTS,
  additionalDetailsSchema,
  type AdditionalDetailsValues,
} from '@/features/registration/schemas/additionalDetailsSchema';
import {
  PATIENT_INFORMATION_DEFAULTS,
  patientInformationSchema,
  type PatientInformationValues,
} from '@/features/registration/schemas/registerPatientSchema';
import {
  INSURANCE_PROVIDER_OPTIONS,
  NATIONALITY_OPTIONS,
  PATIENT_CATEGORY_OPTIONS,
  type SelectOption,
} from '@/features/registration/__mocks__/registerPatientOptions';
import type { DirectoryPatient } from '@/features/registration/__mocks__/patientDirectoryFixtures';
import {
  addDirectoryPatient,
  findPotentialDuplicates,
} from '@/features/registration/store/patientDirectoryStore';
import { PermissionGate } from '@components/shared/PermissionGate';
import { PERMISSIONS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { formatHumanDate } from '@/utils/datetime';

const STEPS = [
  { id: 1, label: 'Patient Information' },
  { id: 2, label: 'Additional Details' },
  { id: 3, label: 'Review & Confirm' },
] as const;

type StepId = (typeof STEPS)[number]['id'];

function labelFor(options: SelectOption[], value: string | undefined): string {
  return options.find((o) => o.value === value)?.label ?? '';
}

// ── Duplicate-patient warning ────────────────────────────────────────────────
// Checked when Step 1 is submitted — a match on phone, or on full name + date
// of birth, against the Patient Directory. This is the front desk's chance to
// recognise a returning patient before minting a second MRN for them.

function DuplicateWarningPanel({
  matches,
  onContinueAsNew,
  onViewDirectory,
}: {
  matches: DirectoryPatient[];
  onContinueAsNew: () => void;
  onViewDirectory: () => void;
}) {
  return (
    <div
      className="mb-5 rounded-[12px] p-4 sm:p-5"
      style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.3)' }}
    >
      <div className="flex items-start gap-2.5">
        <AlertTriangle
          style={{ width: 18, height: 18, color: '#F59E0B' }}
          className="mt-0.5 shrink-0"
        />
        <div className="min-w-0 flex-1">
          <p className="font-sans font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
            Possible existing patient{matches.length > 1 ? 's' : ''} found
          </p>
          <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
            {matches.length === 1
              ? 'A patient already on file matches this name and date of birth, or phone number.'
              : `${matches.length} patients already on file match this name and date of birth, or phone number.`}{' '}
            Check the record below before registering a new one.
          </p>

          <div className="mt-3.5 flex flex-col gap-2.5">
            {matches.map((m) => (
              <div
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] p-3"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <div className="min-w-0">
                  <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
                    {m.name}
                  </p>
                  <p style={{ fontSize: 14, color: '#4A7080' }}>
                    {m.mrn} · DOB {formatHumanDate(m.dateOfBirth)} · {m.phone}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onViewDirectory}
              className="flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-white focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
              style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
            >
              <Search style={{ width: 15, height: 15 }} />
              Check Patient Directory
            </button>
            <button
              type="button"
              onClick={onContinueAsNew}
              className="flex h-11 items-center rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
              style={{ fontSize: 14, background: '#00B4D8' }}
            >
              This Is a Different Person — Continue Registration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stepper({ currentStep }: { currentStep: StepId }) {
  return (
    <div className="hidden items-start sm:flex">
      {STEPS.map((step, i) => {
        const isDone = step.id < currentStep;
        const isActive = step.id === currentStep;
        return (
          <div key={step.id} className="flex items-center">
            {i > 0 && (
              <div
                className="mx-2 mt-4 h-px w-10 shrink-0 lg:w-16"
                style={{ background: isDone ? '#00B4D8' : 'rgba(0,100,130,0.18)' }}
              />
            )}
            <div className="flex w-24 flex-col items-center text-center">
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

function generateMrnAndPatientId(): { mrn: string; patientId: string } {
  const year = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
  }).format(new Date());
  const seq = String(Math.floor(1000 + Math.random() * 9000));
  return { mrn: `MRN-${year}-${seq}`, patientId: `PT-${seq}` };
}

function SuccessPanel({
  patientName,
  mrn,
  onRegisterAnother,
  onGoToDirectory,
}: {
  patientName: string;
  mrn: string;
  onRegisterAnother: () => void;
  onGoToDirectory: () => void;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 rounded-[12px] px-6 py-20 text-center"
      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
    >
      <div
        className="flex size-16 items-center justify-center rounded-full"
        style={{ background: 'rgba(34,197,94,0.1)' }}
      >
        <CheckCircle2 style={{ width: 32, height: 32, color: '#22C55E' }} />
      </div>
      <p className="font-display font-semibold" style={{ fontSize: 22, color: '#0D2630' }}>
        Registration Complete
      </p>
      <p className="max-w-[420px]" style={{ fontSize: 14, color: '#4A7080' }}>
        <span className="font-medium" style={{ color: '#0D2630' }}>
          {patientName}
        </span>{' '}
        has been registered successfully.
      </p>
      <span
        className="mt-1 rounded-full px-3 py-1 font-sans font-semibold"
        style={{ fontSize: 14, color: '#00B4D8', border: '1px solid rgba(0,180,216,0.4)' }}
      >
        {mrn}
      </span>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={onRegisterAnother}
          className="flex h-11 items-center gap-1.5 rounded-[10px] px-5 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
          style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
        >
          <Users style={{ width: 15, height: 15 }} />
          Register Another Patient
        </button>
        <button
          type="button"
          onClick={onGoToDirectory}
          className="flex h-11 items-center gap-1.5 rounded-[10px] px-5 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
          style={{ fontSize: 14, background: '#00B4D8' }}
        >
          <IdCard style={{ width: 15, height: 15 }} />
          Go to Patient Directory
        </button>
      </div>
    </div>
  );
}

export default function RegisterPatientPage() {
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();

  const [currentStep, setCurrentStep] = useState<StepId>(1);
  const [step1Data, setStep1Data] = useState<PatientInformationValues | null>(null);
  const [step2Data, setStep2Data] = useState<AdditionalDetailsValues | null>(null);
  const [mrn, setMrn] = useState<string | null>(null);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [duplicateMatches, setDuplicateMatches] = useState<DirectoryPatient[]>([]);
  const [pendingStep1Values, setPendingStep1Values] = useState<PatientInformationValues | null>(
    null,
  );

  const step1Form = useForm<PatientInformationValues>({
    resolver: zodResolver(patientInformationSchema),
    defaultValues: step1Data ?? PATIENT_INFORMATION_DEFAULTS,
    mode: 'onBlur',
  });

  const step2Form = useForm<AdditionalDetailsValues>({
    resolver: zodResolver(additionalDetailsSchema),
    defaultValues: step2Data ?? ADDITIONAL_DETAILS_DEFAULTS,
    mode: 'onBlur',
  });

  function onInvalid() {
    toast.error('Missing information', 'Please fill in all required fields correctly.');
  }

  function proceedToStep2(values: PatientInformationValues) {
    setStep1Data(values);
    setCurrentStep(2);
    setDuplicateMatches([]);
    setPendingStep1Values(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function onStep1Valid(values: PatientInformationValues) {
    const matches = findPotentialDuplicates({
      firstName: values.firstName,
      lastName: values.lastName,
      dateOfBirth: values.dateOfBirth,
      phone: values.phoneNumber,
    });
    if (matches.length > 0) {
      setDuplicateMatches(matches);
      setPendingStep1Values(values);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    proceedToStep2(values);
  }

  function handleContinueAsNewPatient() {
    if (!pendingStep1Values) return;
    proceedToStep2(pendingStep1Values);
  }

  function onStep2Valid(values: AdditionalDetailsValues) {
    setStep2Data(values);
    setCurrentStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleGenerateMrn() {
    const generated = generateMrnAndPatientId();
    setMrn(generated.mrn);
    setPatientId(generated.patientId);
    toast.success('MRN generated', 'A medical record number has been assigned to this patient.');
    return generated;
  }

  function handleSaveDraft() {
    toast.success('Draft saved', 'You can resume this registration later from Patient Directory.');
  }

  function handleCancel() {
    router.push(ROUTES.registration);
  }

  function handleEditStep(step: 1 | 2) {
    setCurrentStep(step);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleFinalSubmit() {
    if (!step1Data || !step2Data) return;
    setIsSubmitting(true);
    const finalIds = mrn && patientId ? { mrn, patientId } : handleGenerateMrn();
    // Mock save latency — real endpoint wiring happens in Phase 6.
    await new Promise((resolve) => setTimeout(resolve, 900));

    // This is what actually makes the new patient findable in Patient
    // Directory and Check-In search — before this, finishing the wizard
    // only showed a success screen with an MRN nobody else could look up.
    addDirectoryPatient({
      firstName: step1Data.firstName,
      lastName: step1Data.lastName,
      middleName: step1Data.middleName,
      genderValue: step1Data.gender,
      dateOfBirth: step1Data.dateOfBirth,
      maritalStatusValue: step1Data.maritalStatus,
      nationalityLabel: labelFor(NATIONALITY_OPTIONS, step1Data.nationality) || 'Nigerian',
      phoneCountryCode: step1Data.phoneCountryCode,
      phoneNumber: step1Data.phoneNumber,
      email: step1Data.email,
      address: step1Data.address,
      categoryLabel:
        labelFor(PATIENT_CATEGORY_OPTIONS, step1Data.categoryType) || 'Regular / Private',
      insuranceProviderLabel: step1Data.insuranceProvider
        ? labelFor(INSURANCE_PROVIDER_OPTIONS, step1Data.insuranceProvider)
        : undefined,
      mrn: finalIds.mrn,
      patientId: finalIds.patientId,
    });

    setMrn(finalIds.mrn);
    setPatientId(finalIds.patientId);
    setIsSubmitting(false);
    setIsComplete(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleRegisterAnother() {
    step1Form.reset(PATIENT_INFORMATION_DEFAULTS);
    step2Form.reset(ADDITIONAL_DETAILS_DEFAULTS);
    setStep1Data(null);
    setStep2Data(null);
    setMrn(null);
    setPatientId(null);
    setPhotoDataUrl(null);
    setIsComplete(false);
    setCurrentStep(1);
    setDuplicateMatches([]);
    setPendingStep1Values(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const fullPatientName = step1Data
    ? [step1Data.firstName, step1Data.middleName, step1Data.lastName].filter(Boolean).join(' ')
    : '';

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto max-w-[1200px] px-4 py-4 sm:px-6 sm:py-5">
          {/* ── Breadcrumb ────────────────────────────────────────────────── */}
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5">
            <Link
              href={ROUTES.registration}
              className="transition-colors duration-150 hover:text-[#00B4D8] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
              style={{ fontSize: 14, color: '#8A98A3' }}
            >
              Dashboard
            </Link>
            <ChevronRight style={{ width: 14, height: 14, color: '#8A98A3' }} />
            <span style={{ fontSize: 14, color: '#8A98A3' }}>Patient Management</span>
            <ChevronRight style={{ width: 14, height: 14, color: '#8A98A3' }} />
            <span className="font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
              Register Patient
            </span>
          </nav>

          {/* ── Title + Stepper ──────────────────────────────────────────── */}
          <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1
                className="font-display font-semibold"
                style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
              >
                Register Patient
              </h1>
              <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                Add new patient information to the system
              </p>
            </div>
            {!isComplete && <Stepper currentStep={currentStep} />}
          </div>

          {/* ── Step content ─────────────────────────────────────────────── */}
          <div className="mt-5">
            {isComplete ? (
              <SuccessPanel
                patientName={fullPatientName || 'Patient'}
                mrn={mrn ?? ''}
                onRegisterAnother={handleRegisterAnother}
                onGoToDirectory={() => router.push(ROUTES.registrationDirectory)}
              />
            ) : (
              <>
                {currentStep === 1 && (
                  <form onSubmit={step1Form.handleSubmit(onStep1Valid, onInvalid)} noValidate>
                    {duplicateMatches.length > 0 && (
                      <DuplicateWarningPanel
                        matches={duplicateMatches}
                        onContinueAsNew={handleContinueAsNewPatient}
                        onViewDirectory={() => router.push(ROUTES.registrationDirectory)}
                      />
                    )}
                    <PatientInformationStep
                      register={step1Form.register}
                      control={step1Form.control}
                      errors={step1Form.formState.errors}
                      watch={step1Form.watch}
                      setValue={step1Form.setValue}
                      mrn={mrn}
                      patientId={patientId}
                      onGenerateMrn={handleGenerateMrn}
                      photoDataUrl={photoDataUrl}
                      onPhotoUploaded={setPhotoDataUrl}
                    />
                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={handleCancel}
                        className="flex h-11 items-center rounded-[10px] px-5 font-sans font-medium transition-colors duration-150 hover:bg-white focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                        style={{
                          fontSize: 14,
                          color: '#0D2630',
                          border: '1px solid rgba(0,100,130,0.2)',
                        }}
                      >
                        Cancel
                      </button>
                      <div className="flex items-center gap-3">
                        <PermissionGate permission={PERMISSIONS.PATIENTS_WRITE}>
                          <button
                            type="button"
                            onClick={handleSaveDraft}
                            className="flex h-11 items-center rounded-[10px] px-5 font-sans font-medium transition-colors duration-150 hover:bg-white focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                            style={{
                              fontSize: 14,
                              color: '#0D2630',
                              border: '1px solid rgba(0,100,130,0.2)',
                            }}
                          >
                            Save as Draft
                          </button>
                          <button
                            type="submit"
                            className="flex h-11 items-center gap-1.5 rounded-[10px] px-5 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                            style={{ fontSize: 14, background: '#00B4D8' }}
                          >
                            Next: Additional Details
                            <ChevronRight style={{ width: 16, height: 16 }} />
                          </button>
                        </PermissionGate>
                      </div>
                    </div>
                  </form>
                )}

                {currentStep === 2 && (
                  <form onSubmit={step2Form.handleSubmit(onStep2Valid, onInvalid)} noValidate>
                    <AdditionalDetailsStep
                      register={step2Form.register}
                      control={step2Form.control}
                      errors={step2Form.formState.errors}
                      watch={step2Form.watch}
                      setValue={step2Form.setValue}
                    />
                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setCurrentStep(1)}
                        className="flex h-11 items-center rounded-[10px] px-5 font-sans font-medium transition-colors duration-150 hover:bg-white focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                        style={{
                          fontSize: 14,
                          color: '#0D2630',
                          border: '1px solid rgba(0,100,130,0.2)',
                        }}
                      >
                        Back
                      </button>
                      <div className="flex items-center gap-3">
                        <PermissionGate permission={PERMISSIONS.PATIENTS_WRITE}>
                          <button
                            type="button"
                            onClick={handleSaveDraft}
                            className="flex h-11 items-center rounded-[10px] px-5 font-sans font-medium transition-colors duration-150 hover:bg-white focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                            style={{
                              fontSize: 14,
                              color: '#0D2630',
                              border: '1px solid rgba(0,100,130,0.2)',
                            }}
                          >
                            Save as Draft
                          </button>
                          <button
                            type="submit"
                            className="flex h-11 items-center gap-1.5 rounded-[10px] px-5 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                            style={{ fontSize: 14, background: '#00B4D8' }}
                          >
                            Next: Review &amp; Confirm
                            <ChevronRight style={{ width: 16, height: 16 }} />
                          </button>
                        </PermissionGate>
                      </div>
                    </div>
                  </form>
                )}

                {currentStep === 3 && step1Data && step2Data && (
                  <ReviewConfirmStep
                    step1={step1Data}
                    step2={step2Data}
                    mrn={mrn}
                    patientId={patientId}
                    photoDataUrl={photoDataUrl}
                    registrationOfficerName={user?.name ?? 'Registration Officer'}
                    onEditStep={handleEditStep}
                    onBack={() => setCurrentStep(2)}
                    onSubmit={handleFinalSubmit}
                    isSubmitting={isSubmitting}
                  />
                )}
              </>
            )}
          </div>

          <div className="h-4" />
        </div>
      </main>
    </div>
  );
}
