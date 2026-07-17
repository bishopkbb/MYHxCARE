'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Check, ChevronRight, ClipboardList, FileCheck2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { PatientInformationStep } from '@/features/registration/components/PatientInformationStep';
import {
  PATIENT_INFORMATION_DEFAULTS,
  patientInformationSchema,
  type PatientInformationValues,
} from '@/features/registration/schemas/registerPatientSchema';
import { PermissionGate } from '@components/shared/PermissionGate';
import { PERMISSIONS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
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

function UpcomingStepPanel({
  icon: Icon,
  title,
  description,
  onBack,
}: {
  icon: typeof ClipboardList;
  title: string;
  description: string;
  onBack: () => void;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 rounded-[12px] px-6 py-20 text-center"
      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
    >
      <div
        className="flex size-14 items-center justify-center rounded-full"
        style={{ background: 'rgba(0,180,216,0.1)' }}
      >
        <Icon style={{ width: 24, height: 24, color: '#00B4D8' }} />
      </div>
      <p className="font-display font-semibold" style={{ fontSize: 18, color: '#0D2630' }}>
        {title}
      </p>
      <p className="max-w-[380px]" style={{ fontSize: 14, color: '#4A7080' }}>
        {description}
      </p>
      <button
        type="button"
        onClick={onBack}
        className="mt-2 flex h-10 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
        style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
      >
        Back
      </button>
    </div>
  );
}

export default function RegisterPatientPage() {
  const router = useRouter();
  const toast = useToast();
  const [currentStep, setCurrentStep] = useState<StepId>(1);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PatientInformationValues>({
    resolver: zodResolver(patientInformationSchema),
    defaultValues: PATIENT_INFORMATION_DEFAULTS,
    mode: 'onBlur',
  });

  function onValid() {
    setCurrentStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function onInvalid() {
    toast.error('Missing information', 'Please fill in all required fields correctly.');
  }

  function handleSaveDraft() {
    toast.success('Draft saved', 'You can resume this registration later from Patient Directory.');
  }

  function handleCancel() {
    router.push(ROUTES.registration);
  }

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
            <Stepper currentStep={currentStep} />
          </div>

          {/* ── Step content ─────────────────────────────────────────────── */}
          <form onSubmit={handleSubmit(onValid, onInvalid)} noValidate className="mt-5">
            {currentStep === 1 && (
              <PatientInformationStep
                register={register}
                control={control}
                errors={errors}
                watch={watch}
                setValue={setValue}
              />
            )}
            {currentStep === 2 && (
              <UpcomingStepPanel
                icon={ClipboardList}
                title="Additional Details"
                description="Next-of-kin documentation, referral source, and clinical intake notes will be captured here."
                onBack={() => setCurrentStep(1)}
              />
            )}
            {currentStep === 3 && (
              <UpcomingStepPanel
                icon={FileCheck2}
                title="Review & Confirm"
                description="A full summary of the patient's information will be shown here for review before saving."
                onBack={() => setCurrentStep(2)}
              />
            )}

            {/* ── Footer actions ─────────────────────────────────────────── */}
            {currentStep === 1 && (
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
            )}
          </form>

          <div className="h-4" />
        </div>
      </main>
    </div>
  );
}
