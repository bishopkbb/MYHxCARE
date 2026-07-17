'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Check, CheckCircle2, ChevronRight, IdCard, Users } from 'lucide-react';
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
import { PermissionGate } from '@components/shared/PermissionGate';
import { PERMISSIONS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@hooks/useAuth';
import { useToast } from '@/hooks/useToast';

const STEPS = [
  { id: 1, label: 'Patient Information' },
  { id: 2, label: 'Additional Details' },
  { id: 3, label: 'Review & Confirm' },
] as const;

type StepId = (typeof STEPS)[number]['id'];

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

  function onStep1Valid(values: PatientInformationValues) {
    setStep1Data(values);
    setCurrentStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
