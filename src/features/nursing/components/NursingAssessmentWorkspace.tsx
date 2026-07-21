'use client';

import {
  Calendar,
  CheckCircle2,
  Circle,
  FileCheck2,
  HeartPulse,
  RotateCcw,
  Save,
  ShieldAlert,
  User,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type ReactNode, useState } from 'react';

import { AllergyBanner } from '@components/clinical/AllergyBanner';
import { FormField } from '@components/shared/FormField';
import { FormSelect } from '@components/shared/FormSelect';
import { PermissionGate } from '@components/shared/PermissionGate';
import { PERMISSIONS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { formatHumanDate, formatTime } from '@/utils/datetime';
import { type NursePatient } from '@/features/nursing/__mocks__/myPatientsFixtures';
import { getPatientRecord } from '@/features/nursing/__mocks__/patientRecordFixtures';
import {
  AIRWAY_OPTIONS,
  APPETITE_OPTIONS,
  ASSESSMENT_TYPE_OPTIONS,
  ASSISTIVE_DEVICE_OPTIONS,
  BREATHING_OPTIONS,
  CHECKLIST_ITEMS,
  DIET_TYPE_OPTIONS,
  DISABILITY_OPTIONS,
  EXPOSURE_OPTIONS,
  FALL_RISK_FACTOR_LABELS,
  FALL_RISK_LEVEL_OPTIONS,
  FEEDING_ASSISTANCE_OPTIONS,
  GAIT_OPTIONS,
  GENERAL_APPEARANCE_OPTIONS,
  LOC_OPTIONS,
  MOBILITY_LEVEL_OPTIONS,
  MOOD_OPTIONS,
  NUTRITION_RISK_OPTIONS,
  ORIENTATION_OPTIONS,
  PAIN_DESCRIPTION_OPTIONS,
  PAIN_INTERVENTION_OPTIONS,
  PAIN_LOCATION_OPTIONS,
  PRESSURE_INTERVENTION_LABELS,
  PRESSURE_RISK_LEVEL_OPTIONS,
  PRESSURE_TOOL_OPTIONS,
  SHIFT_NURSE_OPTIONS,
  SKIN_OPTIONS,
  URINE_OUTPUT_OPTIONS,
  YES_NO_OPTIONS,
  blankAssessment,
  getAssessmentForPatient,
  type ChecklistItemKey,
  type FallRiskFactors,
  type NursingAssessmentForm,
  type PressureInterventions,
  type SelectOption,
} from '@/features/nursing/__mocks__/nursingAssessmentFixtures';
import { NursePatientPicker } from './NursePatientPicker';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const RISK_BADGE_CFG: Record<string, { color: string; border: string; bg: string }> = {
  'Low Risk': { color: '#22C55E', border: 'rgba(34,197,94,0.4)', bg: 'rgba(34,197,94,0.08)' },
  'Moderate Risk': {
    color: '#F59E0B',
    border: 'rgba(245,158,11,0.4)',
    bg: 'rgba(245,158,11,0.08)',
  },
  'High Risk': { color: '#EF4444', border: 'rgba(239,68,68,0.4)', bg: 'rgba(239,68,68,0.08)' },
  'At Risk': { color: '#F59E0B', border: 'rgba(245,158,11,0.4)', bg: 'rgba(245,158,11,0.08)' },
};

// ── Small local building blocks ──────────────────────────────────────────────

function AssessmentSection({
  number,
  title,
  children,
  className,
}: {
  number: number;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[12px] p-4 sm:p-5 ${className ?? ''}`}
      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
    >
      <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
        {number}. {title}
      </h2>
      <div className="mt-3 flex flex-col gap-3">{children}</div>
    </div>
  );
}

function SelectField({
  label,
  id,
  value,
  onChange,
  options,
  badge,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  badge?: boolean;
}) {
  const cfg = badge ? RISK_BADGE_CFG[value] : undefined;
  return (
    <FormField label={label} htmlFor={id}>
      {cfg ? (
        <div style={{ background: cfg.bg, borderRadius: 10 }}>
          <FormSelect
            id={id}
            value={value}
            onChange={onChange}
            options={options}
            placeholder="Select..."
          />
        </div>
      ) : (
        <FormSelect
          id={id}
          value={value}
          onChange={onChange}
          options={options}
          placeholder="Select..."
        />
      )}
    </FormField>
  );
}

function TextAreaField({
  label,
  id,
  value,
  onChange,
  placeholder,
  maxLength,
  rows = 3,
  required,
  error,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength: number;
  rows?: number;
  required?: boolean;
  error?: string | undefined;
}) {
  return (
    <FormField label={label} htmlFor={id} required={required} error={error}>
      <div className="relative">
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
          placeholder={placeholder}
          rows={rows}
          maxLength={maxLength}
          className={`w-full resize-none rounded-[10px] px-3.5 pt-2.5 pb-6 font-sans transition-colors duration-150 outline-none focus:border-[#00B4D8] focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
          style={{
            fontSize: 14,
            border: `1px solid ${error ? '#EF4444' : 'rgba(0,100,130,0.18)'}`,
            color: '#0D2630',
          }}
        />
        <span
          className="pointer-events-none absolute right-3 bottom-2"
          style={{ fontSize: 14, color: '#8A98A3' }}
        >
          {value.length}/{maxLength}
        </span>
      </div>
    </FormField>
  );
}

function PainScaleRow({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const band = value >= 7 ? 'Severe' : value >= 4 ? 'Moderate' : value > 0 ? 'Mild' : 'None';
  const bandColor =
    value >= 7 ? '#EF4444' : value >= 4 ? '#F59E0B' : value > 0 ? '#22C55E' : '#8A98A3';
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
          Pain Score (0-10)
        </span>
        <span className="font-sans font-medium" style={{ fontSize: 14, color: bandColor }}>
          {band}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {Array.from({ length: 11 }, (_, i) => i).map((n) => {
          const active = n === value;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              aria-pressed={active}
              aria-label={`Pain score ${n}`}
              className={`flex size-11 items-center justify-center rounded-full font-sans font-semibold transition-colors duration-150 ${FOCUS_RING}`}
              style={{
                fontSize: 14,
                background: active ? '#F59E0B' : 'transparent',
                color: active ? '#FFFFFF' : '#4A7080',
                border: active ? 'none' : '1px solid rgba(0,100,130,0.18)',
              }}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CheckboxRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-[8px] py-1 transition-colors duration-150 hover:bg-[#F5FBFD]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 shrink-0 cursor-pointer rounded"
        style={{ accentColor: '#00B4D8' }}
      />
      <span style={{ fontSize: 14, color: '#0D2630' }}>{label}</span>
    </label>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function NursingAssessmentWorkspace() {
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
              Nursing Assessment
            </h1>
            <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
              Complete a comprehensive nursing assessment for the patient.
            </p>
            <div className="mt-5">
              <NursePatientPicker
                onSelect={setSelectedPatient}
                description="Choose a patient from your assigned roster to complete a nursing assessment."
                actionVerb="nursing assessment"
              />
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <PatientAssessmentPanel
      key={selectedPatient.id}
      patient={selectedPatient}
      onChangePatient={() => setSelectedPatient(null)}
    />
  );
}

function PatientAssessmentPanel({
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

  const [form, setForm] = useState<NursingAssessmentForm>(() =>
    getAssessmentForPatient(patient.id, nurseName),
  );
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const nurseSignatureOptions: SelectOption[] = SHIFT_NURSE_OPTIONS.some(
    (o) => o.value === nurseName,
  )
    ? SHIFT_NURSE_OPTIONS
    : [{ value: nurseName, label: nurseName }, ...SHIFT_NURSE_OPTIONS];

  function set<K extends keyof NursingAssessmentForm>(key: K, value: NursingAssessmentForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setFallFactor(key: keyof FallRiskFactors, value: boolean) {
    setForm((prev) => ({ ...prev, fallRiskFactors: { ...prev.fallRiskFactors, [key]: value } }));
  }

  function setPressureIntervention(key: keyof PressureInterventions, value: boolean) {
    setForm((prev) => ({
      ...prev,
      pressureInterventions: { ...prev.pressureInterventions, [key]: value },
    }));
  }

  function toggleChecklistItem(key: ChecklistItemKey) {
    setForm((prev) => ({ ...prev, checklist: { ...prev.checklist, [key]: !prev.checklist[key] } }));
  }

  function handleSaveDraft() {
    toast.success('Draft saved', `Nursing assessment draft saved for ${patient.patientName}.`);
  }

  function handleSubmit() {
    setSubmitAttempted(true);
    if (!form.chiefComplaint.trim() || !form.overallAssessment.trim()) {
      toast.error(
        'Missing required fields',
        'Chief Complaint and the Overall Assessment summary must be completed before submitting.',
      );
      return;
    }
    toast.success(
      'Assessment submitted',
      `Nursing assessment for ${patient.patientName} has been added to the patient record.`,
    );
    router.push(ROUTES.nursePatientRecord(patient.id));
  }

  function handleClearForm() {
    setForm(blankAssessment(nurseName));
    setSubmitAttempted(false);
    toast.info('Form cleared', 'All fields have been reset.');
  }

  function handleEscalate() {
    toast.error(
      'Patient escalated',
      `${patient.patientName} has been flagged for urgent review. The assigned doctor has been notified.`,
    );
  }

  const fluidBalance = form.intakeMl - form.outputMl;

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
              Nursing Assessment
            </span>
          </div>

          {/* ── Header ──────────────────────────────────────────────────── */}
          <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1
                className="font-display font-semibold"
                style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
              >
                Nursing Assessment
              </h1>
              <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                Complete a comprehensive nursing assessment for the patient.
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
              <PermissionGate permission={PERMISSIONS.ENCOUNTERS_WRITE}>
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  className={`flex h-11 items-center gap-2 rounded-[10px] px-4 font-sans font-semibold transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
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
                <button
                  type="button"
                  onClick={handleSubmit}
                  className={`flex h-11 items-center gap-2 rounded-[10px] px-4 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                  style={{ background: '#00B4D8', fontSize: 14 }}
                >
                  <FileCheck2 style={{ width: 16, height: 16 }} />
                  Submit Assessment
                </button>
              </PermissionGate>
            </div>
          </div>

          {/* ── Patient header card ─────────────────────────────────────── */}
          <div
            className="mt-4 flex flex-col gap-4 rounded-[12px] p-4 sm:p-5 lg:flex-row lg:items-start lg:justify-between"
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

            <div className="flex shrink-0 items-start gap-2.5 lg:w-[210px]">
              <div
                className="flex size-11 shrink-0 items-center justify-center rounded-full"
                style={{ background: 'rgba(239,68,68,0.1)' }}
              >
                <HeartPulse style={{ width: 20, height: 20, color: '#EF4444' }} />
              </div>
              <div className="min-w-0">
                <p style={{ fontSize: 14, color: '#8A98A3' }}>Diagnosis</p>
                <p
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
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
            </div>

            <div className="flex shrink-0 items-start gap-2.5 lg:w-[190px]">
              <div
                className="flex size-11 shrink-0 items-center justify-center rounded-full"
                style={{ background: 'rgba(0,180,216,0.1)' }}
              >
                <User style={{ width: 20, height: 20, color: '#00B4D8' }} />
              </div>
              <div className="min-w-0">
                <p style={{ fontSize: 14, color: '#8A98A3' }}>Assigned Doctor</p>
                <p
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  {patient.doctorName}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 flex-col gap-2.5 lg:w-[190px]">
              <div className="flex items-center gap-2">
                <Calendar style={{ width: 16, height: 16, color: '#4A7080' }} />
                <div className="min-w-0">
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>Assessment Date & Time</p>
                  <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                    {formatHumanDate(form.assessmentDateTime)},{' '}
                    {formatTime(form.assessmentDateTime)}
                  </p>
                </div>
              </div>
              <FormSelect
                id="assessment-type"
                value={form.assessmentType}
                onChange={(v) =>
                  set('assessmentType', v as NursingAssessmentForm['assessmentType'])
                }
                options={ASSESSMENT_TYPE_OPTIONS}
                placeholder="Assessment Type"
              />
            </div>
          </div>

          {/* ── Allergy banner (compliance — every patient-context page) ── */}
          <AllergyBanner allergies={record.allergies} className="mt-4" />

          {/* ── 1-3: Chief Complaint / Initial / Physical ─────────────────── */}
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <AssessmentSection number={1} title="Chief Complaint">
              <TextAreaField
                label=""
                id="chief-complaint"
                value={form.chiefComplaint}
                onChange={(v) => set('chiefComplaint', v)}
                placeholder="Enter patient's chief complaint..."
                maxLength={500}
                rows={7}
                required
                error={submitAttempted && !form.chiefComplaint.trim() ? 'Required' : undefined}
              />
            </AssessmentSection>

            <AssessmentSection number={2} title="Initial Assessment">
              <div className="grid grid-cols-2 gap-3">
                <SelectField
                  label="Airway"
                  id="airway"
                  value={form.airway}
                  onChange={(v) => set('airway', v)}
                  options={AIRWAY_OPTIONS}
                />
                <SelectField
                  label="Breathing"
                  id="breathing"
                  value={form.breathing}
                  onChange={(v) => set('breathing', v)}
                  options={BREATHING_OPTIONS}
                />
                <SelectField
                  label="Disability"
                  id="disability"
                  value={form.disability}
                  onChange={(v) => set('disability', v)}
                  options={DISABILITY_OPTIONS}
                />
                <SelectField
                  label="Exposure"
                  id="exposure"
                  value={form.exposure}
                  onChange={(v) => set('exposure', v)}
                  options={EXPOSURE_OPTIONS}
                />
              </div>
            </AssessmentSection>

            <AssessmentSection number={3} title="Physical Assessment">
              <div className="grid grid-cols-2 gap-3">
                <SelectField
                  label="General Appearance"
                  id="general-appearance"
                  value={form.generalAppearance}
                  onChange={(v) => set('generalAppearance', v)}
                  options={GENERAL_APPEARANCE_OPTIONS}
                />
                <SelectField
                  label="Skin"
                  id="skin"
                  value={form.skin}
                  onChange={(v) => set('skin', v)}
                  options={SKIN_OPTIONS}
                />
                <TextAreaField
                  label="Cardiovascular"
                  id="cardiovascular"
                  value={form.cardiovascular}
                  onChange={(v) => set('cardiovascular', v)}
                  maxLength={200}
                  rows={3}
                />
                <TextAreaField
                  label="Respiratory"
                  id="respiratory"
                  value={form.respiratory}
                  onChange={(v) => set('respiratory', v)}
                  maxLength={200}
                  rows={3}
                />
                <TextAreaField
                  label="Other Findings"
                  id="other-findings"
                  value={form.otherFindings}
                  onChange={(v) => set('otherFindings', v)}
                  maxLength={200}
                  rows={3}
                />
                <TextAreaField
                  label="Abdomen"
                  id="abdomen"
                  value={form.abdomen}
                  onChange={(v) => set('abdomen', v)}
                  maxLength={200}
                  rows={3}
                />
              </div>
            </AssessmentSection>
          </div>

          {/* ── 4-7: Pain / Fall Risk / Pressure Injury / Nutrition ───────── */}
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <AssessmentSection number={4} title="Pain Assessment">
              <PainScaleRow value={form.painScore} onChange={(v) => set('painScore', v)} />
              <SelectField
                label="Pain Location"
                id="pain-location"
                value={form.painLocation}
                onChange={(v) => set('painLocation', v)}
                options={PAIN_LOCATION_OPTIONS}
              />
              <SelectField
                label="Pain Description"
                id="pain-description"
                value={form.painDescription}
                onChange={(v) => set('painDescription', v)}
                options={PAIN_DESCRIPTION_OPTIONS}
              />
              <SelectField
                label="Intervention"
                id="pain-intervention"
                value={form.painIntervention}
                onChange={(v) => set('painIntervention', v)}
                options={PAIN_INTERVENTION_OPTIONS}
              />
              <FormField label="Reassessment Due" htmlFor="pain-reassessment">
                <input
                  id="pain-reassessment"
                  type="text"
                  value={form.painReassessmentDue}
                  onChange={(e) => set('painReassessmentDue', e.target.value)}
                  placeholder="e.g. 14:15"
                  className={`h-11 w-full rounded-[10px] px-3.5 font-sans transition-colors duration-150 outline-none focus:border-[#00B4D8] focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                  style={{
                    fontSize: 14,
                    border: '1px solid rgba(0,100,130,0.18)',
                    color: '#0D2630',
                  }}
                />
              </FormField>
              <TextAreaField
                label="Comments"
                id="pain-comments"
                value={form.painComments}
                onChange={(v) => set('painComments', v)}
                maxLength={200}
                rows={2}
              />
            </AssessmentSection>

            <AssessmentSection number={5} title="Fall Risk">
              <SelectField
                label="Fall Risk Level"
                id="fall-risk-level"
                value={form.fallRiskLevel}
                onChange={(v) => set('fallRiskLevel', v as NursingAssessmentForm['fallRiskLevel'])}
                options={FALL_RISK_LEVEL_OPTIONS}
                badge
              />
              <div>
                <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                  Risk Factors
                </p>
                <div className="mt-1">
                  {FALL_RISK_FACTOR_LABELS.map((f) => (
                    <CheckboxRow
                      key={f.key}
                      label={f.label}
                      checked={form.fallRiskFactors[f.key]}
                      onChange={(v) => setFallFactor(f.key, v)}
                    />
                  ))}
                </div>
              </div>
              <TextAreaField
                label="Comments"
                id="fall-risk-comments"
                value={form.fallRiskComments}
                onChange={(v) => set('fallRiskComments', v)}
                maxLength={200}
                rows={2}
              />
            </AssessmentSection>

            <AssessmentSection number={6} title="Pressure Injury Risk">
              <SelectField
                label="Risk Assessment Tool"
                id="pressure-tool"
                value={form.pressureRiskTool}
                onChange={(v) => set('pressureRiskTool', v)}
                options={PRESSURE_TOOL_OPTIONS}
              />
              <div className="grid grid-cols-2 gap-3">
                <SelectField
                  label="Risk Level"
                  id="pressure-risk-level"
                  value={form.pressureRiskLevel}
                  onChange={(v) =>
                    set('pressureRiskLevel', v as NursingAssessmentForm['pressureRiskLevel'])
                  }
                  options={PRESSURE_RISK_LEVEL_OPTIONS}
                  badge
                />
                <FormField label="Score" htmlFor="pressure-score">
                  <input
                    id="pressure-score"
                    type="number"
                    min={0}
                    max={23}
                    value={form.pressureRiskScore}
                    onChange={(e) => set('pressureRiskScore', Number(e.target.value))}
                    className={`h-11 w-full rounded-[10px] px-3.5 font-sans transition-colors duration-150 outline-none focus:border-[#00B4D8] focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                    style={{
                      fontSize: 14,
                      border: '1px solid rgba(0,100,130,0.18)',
                      color: '#0D2630',
                    }}
                  />
                </FormField>
              </div>
              <div>
                <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                  Interventions
                </p>
                <div className="mt-1">
                  {PRESSURE_INTERVENTION_LABELS.map((f) => (
                    <CheckboxRow
                      key={f.key}
                      label={f.label}
                      checked={form.pressureInterventions[f.key]}
                      onChange={(v) => setPressureIntervention(f.key, v)}
                    />
                  ))}
                </div>
              </div>
              <TextAreaField
                label="Comments"
                id="pressure-comments"
                value={form.pressureRiskComments}
                onChange={(v) => set('pressureRiskComments', v)}
                maxLength={200}
                rows={2}
              />
            </AssessmentSection>

            <AssessmentSection number={7} title="Nutrition Screening">
              <div className="grid grid-cols-2 gap-3">
                <SelectField
                  label="Appetite"
                  id="appetite"
                  value={form.appetite}
                  onChange={(v) => set('appetite', v)}
                  options={APPETITE_OPTIONS}
                />
                <SelectField
                  label="Nausea/Vomiting"
                  id="nausea"
                  value={form.nauseaVomiting}
                  onChange={(v) =>
                    set('nauseaVomiting', v as NursingAssessmentForm['nauseaVomiting'])
                  }
                  options={YES_NO_OPTIONS}
                />
                <SelectField
                  label="Diet Type"
                  id="diet-type"
                  value={form.dietType}
                  onChange={(v) => set('dietType', v)}
                  options={DIET_TYPE_OPTIONS}
                />
                <SelectField
                  label="Feeding Assistance"
                  id="feeding-assistance"
                  value={form.feedingAssistance}
                  onChange={(v) => set('feedingAssistance', v)}
                  options={FEEDING_ASSISTANCE_OPTIONS}
                />
              </div>
              <SelectField
                label="Nutrition Risk"
                id="nutrition-risk"
                value={form.nutritionRisk}
                onChange={(v) => set('nutritionRisk', v as NursingAssessmentForm['nutritionRisk'])}
                options={NUTRITION_RISK_OPTIONS}
                badge
              />
              <TextAreaField
                label="Comments"
                id="nutrition-comments"
                value={form.nutritionComments}
                onChange={(v) => set('nutritionComments', v)}
                maxLength={200}
                rows={2}
              />
            </AssessmentSection>
          </div>

          {/* ── 8-11: Mental Status / Mobility / Fluid Balance / Summary ──── */}
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <AssessmentSection number={8} title="Mental Status">
              <SelectField
                label="Level of Consciousness"
                id="loc"
                value={form.levelOfConsciousness}
                onChange={(v) => set('levelOfConsciousness', v)}
                options={LOC_OPTIONS}
              />
              <SelectField
                label="Orientation"
                id="orientation"
                value={form.orientation}
                onChange={(v) => set('orientation', v)}
                options={ORIENTATION_OPTIONS}
              />
              <SelectField
                label="Mood/Behavior"
                id="mood"
                value={form.moodBehavior}
                onChange={(v) => set('moodBehavior', v)}
                options={MOOD_OPTIONS}
              />
              <TextAreaField
                label="Comments"
                id="mental-status-comments"
                value={form.mentalStatusComments}
                onChange={(v) => set('mentalStatusComments', v)}
                maxLength={200}
                rows={2}
              />
            </AssessmentSection>

            <AssessmentSection number={9} title="Mobility">
              <SelectField
                label="Mobility Level"
                id="mobility-level"
                value={form.mobilityLevel}
                onChange={(v) => set('mobilityLevel', v)}
                options={MOBILITY_LEVEL_OPTIONS}
              />
              <SelectField
                label="Gait"
                id="gait"
                value={form.gait}
                onChange={(v) => set('gait', v)}
                options={GAIT_OPTIONS}
              />
              <SelectField
                label="Assistive Device"
                id="assistive-device"
                value={form.assistiveDevice}
                onChange={(v) => set('assistiveDevice', v)}
                options={ASSISTIVE_DEVICE_OPTIONS}
              />
              <TextAreaField
                label="Comments"
                id="mobility-comments"
                value={form.mobilityComments}
                onChange={(v) => set('mobilityComments', v)}
                maxLength={200}
                rows={2}
              />
            </AssessmentSection>

            <AssessmentSection number={10} title="Fluid Balance (Last 24 Hours)">
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Intake (ml)" htmlFor="intake-ml">
                  <input
                    id="intake-ml"
                    type="number"
                    min={0}
                    value={form.intakeMl}
                    onChange={(e) => set('intakeMl', Number(e.target.value))}
                    className={`h-11 w-full rounded-[10px] px-3.5 font-sans transition-colors duration-150 outline-none focus:border-[#00B4D8] focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                    style={{
                      fontSize: 14,
                      border: '1px solid rgba(0,100,130,0.18)',
                      color: '#0D2630',
                    }}
                  />
                </FormField>
                <FormField label="Output (ml)" htmlFor="output-ml">
                  <input
                    id="output-ml"
                    type="number"
                    min={0}
                    value={form.outputMl}
                    onChange={(e) => set('outputMl', Number(e.target.value))}
                    className={`h-11 w-full rounded-[10px] px-3.5 font-sans transition-colors duration-150 outline-none focus:border-[#00B4D8] focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                    style={{
                      fontSize: 14,
                      border: '1px solid rgba(0,100,130,0.18)',
                      color: '#0D2630',
                    }}
                  />
                </FormField>
              </div>
              <div>
                <p style={{ fontSize: 14, color: '#8A98A3' }}>Balance (ml)</p>
                <span
                  className="mt-1 inline-block rounded-full px-2.5 py-0.5 font-sans font-semibold"
                  style={{
                    fontSize: 14,
                    color: fluidBalance >= 0 ? '#22C55E' : '#EF4444',
                    border: `1px solid ${fluidBalance >= 0 ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}`,
                    background: fluidBalance >= 0 ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                  }}
                >
                  {fluidBalance >= 0 ? '+' : ''}
                  {fluidBalance}
                </span>
              </div>
              <SelectField
                label="Urine Output"
                id="urine-output"
                value={form.urineOutput}
                onChange={(v) => set('urineOutput', v)}
                options={URINE_OUTPUT_OPTIONS}
              />
              <FormField label="IV Fluids" htmlFor="iv-fluids">
                <input
                  id="iv-fluids"
                  type="text"
                  value={form.ivFluids}
                  onChange={(e) => set('ivFluids', e.target.value)}
                  placeholder="e.g. 500 ml"
                  className={`h-11 w-full rounded-[10px] px-3.5 font-sans transition-colors duration-150 outline-none focus:border-[#00B4D8] focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                  style={{
                    fontSize: 14,
                    border: '1px solid rgba(0,100,130,0.18)',
                    color: '#0D2630',
                  }}
                />
              </FormField>
              <TextAreaField
                label="Comments"
                id="fluid-comments"
                value={form.fluidComments}
                onChange={(v) => set('fluidComments', v)}
                maxLength={200}
                rows={2}
              />
            </AssessmentSection>

            <AssessmentSection number={11} title="Assessment Summary">
              <TextAreaField
                label="Overall Assessment"
                id="overall-assessment"
                value={form.overallAssessment}
                onChange={(v) => set('overallAssessment', v)}
                maxLength={500}
                rows={5}
                required
                error={submitAttempted && !form.overallAssessment.trim() ? 'Required' : undefined}
              />
              <SelectField
                label="Nurse Signature"
                id="nurse-signature"
                value={form.nurseSignature}
                onChange={(v) => set('nurseSignature', v)}
                options={nurseSignatureOptions}
              />
            </AssessmentSection>
          </div>

          {/* ── Additional Notes ───────────────────────────────────────────── */}
          <div
            className="mt-4 rounded-[12px] p-4 sm:p-5"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <TextAreaField
              label="Additional Notes"
              id="additional-notes"
              value={form.additionalNotes}
              onChange={(v) => set('additionalNotes', v)}
              placeholder="Enter any additional notes..."
              maxLength={1000}
              rows={3}
            />
          </div>

          {/* ── Actions + Assessment Checklist ─────────────────────────────── */}
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div
              className="rounded-[12px] p-4 sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Actions
              </h2>
              <PermissionGate permission={PERMISSIONS.ENCOUNTERS_WRITE}>
                <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    className={`flex h-11 items-center justify-center gap-2 rounded-[10px] px-3 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                    style={{
                      border: '1px solid rgba(0,100,130,0.15)',
                      fontSize: 14,
                      color: '#0D2630',
                    }}
                  >
                    <Save style={{ width: 16, height: 16, color: '#00B4D8' }} />
                    Save as Draft
                  </button>
                  <button
                    type="button"
                    onClick={handleClearForm}
                    className={`flex h-11 items-center justify-center gap-2 rounded-[10px] px-3 font-sans font-medium transition-colors duration-150 hover:bg-[rgba(245,158,11,0.06)] ${FOCUS_RING}`}
                    style={{
                      border: '1px solid rgba(245,158,11,0.35)',
                      fontSize: 14,
                      color: '#F59E0B',
                    }}
                  >
                    <RotateCcw style={{ width: 16, height: 16 }} />
                    Clear Form
                  </button>
                  <button
                    type="button"
                    onClick={handleEscalate}
                    className={`flex h-11 items-center justify-center gap-2 rounded-[10px] px-3 font-sans font-medium transition-colors duration-150 hover:bg-[rgba(239,68,68,0.06)] ${FOCUS_RING}`}
                    style={{
                      border: '1px solid rgba(239,68,68,0.35)',
                      fontSize: 14,
                      color: '#EF4444',
                    }}
                  >
                    <ShieldAlert style={{ width: 16, height: 16 }} />
                    Escalate Patient
                  </button>
                </div>
              </PermissionGate>
            </div>

            <div
              className="rounded-[12px] p-4 sm:p-5"
              style={{
                background: 'rgba(34,197,94,0.04)',
                border: '1px solid rgba(34,197,94,0.25)',
              }}
            >
              <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Assessment Checklist
              </h2>
              <div className="mt-3 flex flex-col gap-1">
                {CHECKLIST_ITEMS.map((item) => {
                  const checked = form.checklist[item.key];
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => toggleChecklistItem(item.key)}
                      className={`flex min-h-11 items-center justify-between gap-2 rounded-[8px] px-1 py-1 text-left transition-colors duration-150 hover:bg-white/60 ${FOCUS_RING}`}
                    >
                      <span style={{ fontSize: 14, color: '#0D2630' }}>{item.label}</span>
                      {checked ? (
                        <CheckCircle2 style={{ width: 18, height: 18, color: '#22C55E' }} />
                      ) : (
                        <Circle style={{ width: 18, height: 18, color: '#8A98A3' }} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="h-4" />
        </div>
      </main>
    </div>
  );
}
