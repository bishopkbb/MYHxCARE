'use client';

import { CheckCircle2, Pencil, ShieldCheck, User as UserIcon } from 'lucide-react';
import { useState } from 'react';

import { AllergyBanner } from '@components/clinical/AllergyBanner';
import type { Allergy } from '@/types/patient.types';
import {
  computeAge,
  type PatientInformationValues,
} from '@/features/registration/schemas/registerPatientSchema';
import type { AdditionalDetailsValues } from '@/features/registration/schemas/additionalDetailsSchema';
import {
  CHRONIC_CONDITION_OPTIONS,
  DISABILITY_TYPE_OPTIONS,
  PREFERRED_LANGUAGE_OPTIONS,
  REFERRAL_SOURCE_OPTIONS,
} from '@/features/registration/schemas/additionalDetailsSchema';
import {
  GENDER_OPTIONS,
  INSURANCE_PROVIDER_OPTIONS,
  LGAS_BY_STATE,
  MARITAL_STATUS_OPTIONS,
  NATIONALITY_OPTIONS,
  NIGERIA_STATES,
  PATIENT_CATEGORY_OPTIONS,
  PLAN_TYPE_OPTIONS,
  RELATIONSHIP_OPTIONS,
  type SelectOption,
} from '@/features/registration/__mocks__/registerPatientOptions';

function labelFor(options: SelectOption[], value: string | undefined): string {
  if (!value) return '—';
  return options.find((o) => o.value === value)?.label ?? value;
}

function SummaryCard({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-[12px] p-4 sm:p-5"
      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
    >
      <div className="flex items-center justify-between">
        <h2
          className="font-display font-semibold"
          style={{ fontSize: 16, lineHeight: '24px', color: '#0D2630' }}
        >
          {title}
        </h2>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="flex items-center gap-1.5 font-sans font-medium transition-opacity duration-150 hover:opacity-70 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
            style={{ fontSize: 14, color: '#00B4D8' }}
          >
            <Pencil style={{ width: 13, height: 13 }} />
            Edit
          </button>
        )}
      </div>
      <div className="mt-3.5">{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p style={{ fontSize: 14, color: '#8A98A3' }}>{label}</p>
      <p className="truncate font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
        {value || '—'}
      </p>
    </div>
  );
}

export function ReviewConfirmStep({
  step1,
  step2,
  mrn,
  patientId,
  photoDataUrl,
  registrationOfficerName,
  onEditStep,
  onBack,
  onSubmit,
  isSubmitting,
}: {
  step1: PatientInformationValues;
  step2: AdditionalDetailsValues;
  mrn: string | null;
  patientId: string | null;
  photoDataUrl: string | null;
  registrationOfficerName: string;
  onEditStep: (step: 1 | 2) => void;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const age = computeAge(step1.dateOfBirth);
  const fullName = [step1.firstName, step1.middleName, step1.lastName].filter(Boolean).join(' ');

  const allergies: Allergy[] = step2.hasNoKnownAllergies
    ? []
    : step2.allergies.map((a, i) => ({
        id: `draft-${i}`,
        substance: a.substance,
        reaction: a.reaction,
        severity: a.severity,
        recordedAt: new Date().toISOString(),
        recordedBy: registrationOfficerName,
      }));

  const hasInsurance = Boolean(step1.insuranceProvider);
  const chronicConditionLabels = step2.chronicConditions
    .filter((c) => c !== 'other')
    .map((c) => labelFor(CHRONIC_CONDITION_OPTIONS, c));
  if (step2.chronicConditions.includes('other') && step2.otherChronicCondition) {
    chronicConditionLabels.push(step2.otherChronicCondition);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ── Patient summary banner ────────────────────────────────────── */}
      <div
        className="flex flex-wrap items-center gap-4 rounded-[12px] p-4 sm:p-5"
        style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
      >
        <div
          className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full"
          style={{ background: '#E2EDF1' }}
        >
          {photoDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoDataUrl} alt="" className="size-16 object-cover" />
          ) : (
            <UserIcon style={{ width: 28, height: 28, color: '#8A98A3' }} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display font-semibold" style={{ fontSize: 20, color: '#0D2630' }}>
            {fullName || 'Unnamed Patient'}
          </p>
          <p style={{ fontSize: 14, color: '#4A7080' }}>
            {age !== null ? `${age} yrs` : '—'} · {labelFor(GENDER_OPTIONS, step1.gender)} ·{' '}
            {labelFor(PATIENT_CATEGORY_OPTIONS, step1.categoryType)}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span
            className="rounded-full px-2.5 py-0.5 font-sans font-medium"
            style={{ fontSize: 14, color: '#00B4D8', border: '1px solid rgba(0,180,216,0.4)' }}
          >
            {mrn ?? 'MRN will be generated on save'}
          </span>
          {patientId && (
            <span style={{ fontSize: 14, color: '#8A98A3' }}>Patient ID: {patientId}</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        {/* ── Left column ───────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          <SummaryCard title="Basic Information" onEdit={() => onEditStep(1)}>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
              <Field label="Full Name" value={fullName} />
              <Field label="Date of Birth" value={step1.dateOfBirth} />
              <Field
                label="Marital Status"
                value={labelFor(MARITAL_STATUS_OPTIONS, step1.maritalStatus)}
              />
              <Field label="Nationality" value={labelFor(NATIONALITY_OPTIONS, step1.nationality)} />
              <Field label="Occupation" value={step1.occupation} />
              <Field label="Phone" value={`${step1.phoneCountryCode} ${step1.phoneNumber}`} />
              <Field label="Email" value={step1.email} />
              <Field
                label="Address"
                value={`${step1.address}, ${step1.cityTown}, ${labelFor(NIGERIA_STATES, step1.state)}`}
              />
              <Field label="LGA" value={labelFor(LGAS_BY_STATE[step1.state] ?? [], step1.lga)} />
            </div>
          </SummaryCard>

          <SummaryCard title="Emergency Contact" onEdit={() => onEditStep(1)}>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
              <Field label="Full Name" value={step1.emergencyFullName} />
              <Field
                label="Relationship"
                value={labelFor(RELATIONSHIP_OPTIONS, step1.emergencyRelationship)}
              />
              <Field
                label="Phone"
                value={`${step1.emergencyPhoneCountryCode} ${step1.emergencyPhoneNumber}`}
              />
            </div>
          </SummaryCard>

          {hasInsurance && (
            <SummaryCard title="Insurance Details" onEdit={() => onEditStep(1)}>
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
                <Field
                  label="Provider"
                  value={labelFor(INSURANCE_PROVIDER_OPTIONS, step1.insuranceProvider)}
                />
                <Field label="Policy/Member ID" value={step1.policyMemberId} />
                <Field label="Plan Type" value={labelFor(PLAN_TYPE_OPTIONS, step1.planType)} />
              </div>
            </SummaryCard>
          )}

          <SummaryCard title="Next of Kin" onEdit={() => onEditStep(2)}>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
              <Field label="Full Name" value={step2.nokName} />
              <Field
                label="Relationship"
                value={labelFor(RELATIONSHIP_OPTIONS, step2.nokRelationship)}
              />
              <Field label="Phone" value={`${step2.nokPhoneCountryCode} ${step2.nokPhoneNumber}`} />
            </div>
          </SummaryCard>

          <SummaryCard title="Allergies" onEdit={() => onEditStep(2)}>
            {allergies.length > 0 ? (
              <AllergyBanner allergies={allergies} />
            ) : (
              <p className="flex items-center gap-2" style={{ fontSize: 14, color: '#22C55E' }}>
                <ShieldCheck style={{ width: 16, height: 16 }} />
                No known allergies (NKDA)
              </p>
            )}
          </SummaryCard>

          <SummaryCard title="Medical History" onEdit={() => onEditStep(2)}>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <Field
                label="Chronic Conditions"
                value={
                  chronicConditionLabels.length > 0
                    ? chronicConditionLabels.join(', ')
                    : 'None reported'
                }
              />
              <Field
                label="Current Medications"
                value={step2.currentMedications || 'None reported'}
              />
              <Field label="Past Surgeries" value={step2.pastSurgeries || 'None reported'} />
            </div>
          </SummaryCard>
        </div>

        {/* ── Right column ──────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          <SummaryCard title="Communication & Referral" onEdit={() => onEditStep(2)}>
            <div className="flex flex-col gap-3">
              <Field
                label="Preferred Language"
                value={labelFor(PREFERRED_LANGUAGE_OPTIONS, step2.preferredLanguage)}
              />
              <Field
                label="Referral Source"
                value={labelFor(REFERRAL_SOURCE_OPTIONS, step2.referralSource)}
              />
              {step2.referralDetails && (
                <Field label="Referral Details" value={step2.referralDetails} />
              )}
            </div>
          </SummaryCard>

          {step2.hasDisability === 'yes' && (
            <SummaryCard title="Disability & Accessibility" onEdit={() => onEditStep(2)}>
              <div className="flex flex-col gap-3">
                <Field
                  label="Type"
                  value={step2.disabilityTypes
                    .map((t) => labelFor(DISABILITY_TYPE_OPTIONS, t))
                    .join(', ')}
                />
                {step2.disabilityNotes && <Field label="Notes" value={step2.disabilityNotes} />}
              </div>
            </SummaryCard>
          )}

          <SummaryCard title="Consent">
            <div className="flex flex-col gap-2.5">
              {[
                { label: 'Consent to Treatment', given: step2.consentTreatment },
                { label: 'Consent to Data Processing (NDPR)', given: step2.consentDataProcessing },
                { label: 'Consent to Share with Next of Kin', given: step2.consentShareWithNok },
              ].map((c) => (
                <div key={c.label} className="flex items-center gap-2">
                  <CheckCircle2
                    style={{ width: 15, height: 15, color: c.given ? '#22C55E' : '#8A98A3' }}
                  />
                  <span style={{ fontSize: 14, color: c.given ? '#0D2630' : '#8A98A3' }}>
                    {c.label}
                  </span>
                </div>
              ))}
            </div>
          </SummaryCard>

          <div
            className="rounded-[12px] p-4 sm:p-5"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <label className="flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                style={{ accentColor: '#00B4D8' }}
                className="mt-0.5 size-4 shrink-0 cursor-pointer rounded"
              />
              <span style={{ fontSize: 14, color: '#0D2630' }}>
                I confirm the information provided above is accurate and complete to the best of my
                knowledge.
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* ── Footer actions ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-11 items-center rounded-[10px] px-5 font-sans font-medium transition-colors duration-150 hover:bg-white focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
          style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
        >
          Back
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={!confirmed || isSubmitting}
          className="flex h-11 items-center gap-1.5 rounded-[10px] px-5 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
          style={{ fontSize: 14, background: '#00B4D8' }}
        >
          {isSubmitting ? (
            'Completing Registration…'
          ) : (
            <>
              <CheckCircle2 style={{ width: 16, height: 16 }} />
              Complete Registration
            </>
          )}
        </button>
      </div>
    </div>
  );
}
