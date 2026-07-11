'use client';

import {
  AlertTriangle,
  BookOpen,
  ChevronLeft,
  ClipboardList,
  FileText,
  MessageSquare,
  Search,
  Stethoscope,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { use, useState } from 'react';

import {
  FALLBACK_PATIENT_DETAIL,
  MOCK_PATIENT_DETAILS,
} from '@/features/patients/__mocks__/patientFixtures';

// ── Types ─────────────────────────────────────────────────────────────────────

type ConsultationStep = {
  number: number;
  key: string;
  label: string;
  icon: LucideIcon;
};

type ConsultationForm = {
  // Step 1 — Chief Complaint
  chiefComplaint: string;
  duration: string;
  onset: string;
  severity: number;
  // Step 2 — History
  historyPresentIllness: string;
  pastMedicalHistory: string;
  familySocialHistory: string;
  // Step 3 — Examination
  generalAppearance: string;
  systemsExamination: string;
  // Step 4 — Diagnosis
  primaryDiagnosis: string;
  differentialDiagnosis: string;
  // Step 5 — Treatment Plan
  medicationsPrescribed: string;
  investigationsOrdered: string;
  managementPlan: string;
  // Step 6 — Clinical Notes
  clinicalNotes: string;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const CONSULTATION_STEPS: ConsultationStep[] = [
  { number: 1, key: 'chief-complaint', label: 'Chief Complaint', icon: MessageSquare },
  { number: 2, key: 'history', label: 'History', icon: BookOpen },
  { number: 3, key: 'examination', label: 'Examination', icon: Stethoscope },
  { number: 4, key: 'diagnosis', label: 'Diagnosis', icon: Search },
  { number: 5, key: 'treatment-plan', label: 'Treatment Plan', icon: ClipboardList },
  { number: 6, key: 'clinical-notes', label: 'Clinical Notes', icon: FileText },
];

const VITAL_SHORT_LABEL: Record<string, string> = {
  'blood-pressure': 'BP',
  'pulse-rate': 'Pulse',
  temperature: 'Temp',
  'resp-rate': 'RR',
  spo2: 'SpO2',
};

// Only these vitals are clinically relevant in the sidebar quick-view
const SIDEBAR_VITAL_KEYS = new Set([
  'blood-pressure',
  'pulse-rate',
  'temperature',
  'resp-rate',
  'spo2',
]);

const INITIAL_FORM: ConsultationForm = {
  chiefComplaint: '',
  duration: '',
  onset: '',
  severity: 5,
  historyPresentIllness: '',
  pastMedicalHistory: '',
  familySocialHistory: '',
  generalAppearance: '',
  systemsExamination: '',
  primaryDiagnosis: '',
  differentialDiagnosis: '',
  medicationsPrescribed: '',
  investigationsOrdered: '',
  managementPlan: '',
  clinicalNotes: '',
};

// ── Shared field styles ────────────────────────────────────────────────────────

const INPUT_BASE: React.CSSProperties = {
  border: '1px solid #0064821F',
  fontSize: 14,
  lineHeight: '22px',
  color: '#0D2630',
  background: '#FFFFFF',
};

const TEXTAREA_BASE: React.CSSProperties = {
  ...INPUT_BASE,
  borderRadius: 12,
};

const SINGLE_INPUT_BASE: React.CSSProperties = {
  ...INPUT_BASE,
  height: 44,
  borderRadius: 10,
};

function focusBorder(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
  e.currentTarget.style.borderColor = '#00B4D8';
}
function blurBorder(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
  e.currentTarget.style.borderColor = '#0064821F';
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function ConsultationPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const patient = MOCK_PATIENT_DETAILS[id] ?? FALLBACK_PATIENT_DETAIL;

  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState<ConsultationForm>(INITIAL_FORM);

  function setField<K extends keyof ConsultationForm>(key: K, value: ConsultationForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const activeMedications = patient.medications.filter((m) => m.status === 'active');
  const sidebarVitals = patient.vitalSigns.readings.filter((r) => SIDEBAR_VITAL_KEYS.has(r.key));
  const sliderPct = ((form.severity - 1) / 9) * 100;

  return (
    <div className="flex min-h-screen flex-col" style={{ background: '#F5FBFD' }}>
      {/* ── Patient preview bar ────────────────────────────────────────────────── */}
      <div
        className="px-5 py-[10px] sm:flex sm:min-h-[60px] sm:items-center sm:gap-4 sm:py-0"
        style={{ background: '#1A3D4D', borderBottom: '1px solid rgba(255,255,255,0.10)' }}
      >
        {/* Row 1 (mobile) / nav block (sm+) */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex shrink-0 items-center gap-1.5"
          >
            <ChevronLeft style={{ width: 16, height: 16, color: 'rgba(255,255,255,0.58)' }} />
            <span className="text-sm leading-[22px]" style={{ color: 'rgba(255,255,255,0.58)' }}>
              Back to Queue
            </span>
          </button>

          <div
            className="shrink-0"
            style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.18)' }}
          />

          <div
            className="flex shrink-0 items-center justify-center rounded-full text-sm font-medium text-white"
            style={{ width: 40, height: 40, background: 'rgba(255,255,255,0.15)' }}
          >
            {patient.initials}
          </div>

          <span
            className="min-w-0 flex-1 truncate font-normal text-white sm:hidden"
            style={{ fontSize: 16, lineHeight: '24px' }}
          >
            {patient.name}
          </span>

          {patient.isUrgent && (
            <span
              className="shrink-0 text-sm font-medium sm:hidden"
              style={{
                borderRadius: 4,
                padding: '4px 10px',
                background: 'rgba(245,158,11,0.30)',
                border: '1px solid rgba(245,158,11,0.45)',
                color: '#FCD34D',
              }}
            >
              URGENT
            </span>
          )}
        </div>

        {/* Row 2 (mobile) / info strip (sm+) */}
        <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 sm:mt-0 sm:flex-1 sm:gap-x-4">
          <span
            className="hidden shrink-0 font-normal text-white sm:inline"
            style={{ fontSize: 18, lineHeight: '28px' }}
          >
            {patient.name}
          </span>
          <span
            className="shrink-0 text-sm leading-[22px] sm:text-base"
            style={{ color: 'rgba(255,255,255,0.52)' }}
          >
            {patient.mrn}
          </span>
          <span
            className="shrink-0 text-sm leading-[22px] sm:text-base"
            style={{ color: 'rgba(255,255,255,0.52)' }}
          >
            {patient.age} · {patient.gender}
          </span>
          <span
            className="shrink-0 text-sm leading-[22px] sm:text-base"
            style={{ color: 'rgba(255,255,255,0.52)' }}
          >
            BG: {patient.bloodGroup}
          </span>

          {patient.allergies.length > 0 && (
            <>
              <AlertTriangle
                aria-hidden
                style={{ width: 18, height: 18, color: '#FCA5A5', flexShrink: 0 }}
              />
              {/* Mobile: count chip */}
              <span
                className="shrink-0 text-sm font-medium sm:hidden"
                style={{
                  borderRadius: 4,
                  padding: '3px 8px',
                  background: 'rgba(239,68,68,0.28)',
                  border: '1px solid rgba(239,68,68,0.40)',
                  color: '#FCA5A5',
                }}
              >
                {patient.allergies.length === 1
                  ? '1 allergy'
                  : `${patient.allergies.length} allergies`}
              </span>
              {/* sm+: individual substance pills */}
              {patient.allergies.slice(0, 2).map((a) => (
                <span
                  key={a.id}
                  className="hidden shrink-0 text-sm font-medium sm:inline"
                  style={{
                    borderRadius: 4,
                    padding: '3px 8px',
                    background: 'rgba(239,68,68,0.28)',
                    border: '1px solid rgba(239,68,68,0.40)',
                    color: '#FCA5A5',
                  }}
                >
                  {a.substance}
                </span>
              ))}
              {patient.allergies.length > 2 && (
                <span
                  className="hidden shrink-0 text-sm sm:inline"
                  style={{ color: 'rgba(255,255,255,0.52)' }}
                >
                  +{patient.allergies.length - 2} more
                </span>
              )}
            </>
          )}
        </div>

        {/* URGENT — desktop right slot */}
        {patient.isUrgent && (
          <span
            className="hidden shrink-0 text-sm font-bold tracking-wide uppercase sm:inline"
            style={{
              borderRadius: 4,
              padding: '4px 10px',
              background: 'rgba(245,158,11,0.30)',
              border: '1px solid rgba(245,158,11,0.45)',
              color: '#FCD34D',
            }}
          >
            URGENT
          </span>
        )}
      </div>

      {/* ── 2-column split ─────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Left: patient summary sidebar ────────────────────────────────── */}
        <aside
          className="hidden w-[300px] shrink-0 flex-col overflow-y-auto bg-white lg:flex xl:w-[320px]"
          style={{ borderRight: '1px solid #0064821F' }}
        >
          {/* Identity */}
          <div
            className="flex items-center gap-3 px-5 py-4"
            style={{ borderBottom: '1px solid #0064821F' }}
          >
            <div
              className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
              style={{ width: 48, height: 48, background: '#00B4D8', fontSize: 18 }}
            >
              {patient.initials}
            </div>
            <div className="min-w-0">
              <p
                className="truncate font-semibold"
                style={{ fontSize: 18, lineHeight: '28px', color: '#0D2630' }}
              >
                {patient.name}
              </p>
              <p style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>{patient.mrn}</p>
            </div>
          </div>

          {/* Demographics */}
          <div className="px-5 py-3" style={{ borderBottom: '1px solid #0064821F' }}>
            <p style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
              {patient.age} {patient.gender} · BG: {patient.bloodGroup}
            </p>
          </div>

          {/* Vital Signs */}
          {sidebarVitals.length > 0 && (
            <div className="px-5 py-4" style={{ borderBottom: '1px solid #0064821F' }}>
              <p
                className="mb-3 text-sm font-semibold tracking-wider uppercase"
                style={{ color: '#00B4D8' }}
              >
                Vital Signs
              </p>
              <div className="flex flex-col gap-[10px]">
                {sidebarVitals.map((reading) => {
                  const label = VITAL_SHORT_LABEL[reading.key] ?? reading.key;
                  const isAbnormal = reading.status === 'abnormal';
                  return (
                    <div key={reading.key} className="flex items-center justify-between">
                      <span style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                        {label}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span
                          className="font-medium"
                          style={{
                            fontSize: 14,
                            lineHeight: '22px',
                            color: isAbnormal ? '#EF4444' : '#0D2630',
                          }}
                        >
                          {reading.value}
                        </span>
                        {isAbnormal && (
                          <AlertTriangle
                            aria-hidden
                            style={{ width: 14, height: 14, color: '#EF4444', flexShrink: 0 }}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Allergies */}
          {patient.allergies.length > 0 && (
            <div className="px-5 py-4" style={{ borderBottom: '1px solid #0064821F' }}>
              <div className="mb-3 flex items-center gap-1.5">
                <AlertTriangle aria-hidden style={{ width: 14, height: 14, color: '#F59E0B' }} />
                <p
                  className="text-sm font-semibold tracking-wider uppercase"
                  style={{ color: '#F59E0B' }}
                >
                  Allergies
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {patient.allergies.map((allergy) => (
                  <span
                    key={allergy.id}
                    className="rounded-full px-3 py-1 text-sm"
                    style={{
                      border: '1px solid rgba(239,68,68,0.40)',
                      color: '#EF4444',
                      background: 'rgba(239,68,68,0.05)',
                    }}
                  >
                    {allergy.substance}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Active Medications */}
          {activeMedications.length > 0 && (
            <div className="px-5 py-4">
              <p
                className="mb-3 text-sm font-semibold tracking-wider uppercase"
                style={{ color: '#4A7080' }}
              >
                Active Medications
              </p>
              <div className="flex flex-col gap-2">
                {activeMedications.map((med) => (
                  <div
                    key={med.id}
                    className="rounded-[8px] px-3 py-2"
                    style={{
                      background: 'rgba(0,180,216,0.06)',
                      border: '1px solid rgba(0,180,216,0.15)',
                    }}
                  >
                    <p
                      className="font-medium"
                      style={{ fontSize: 14, lineHeight: '22px', color: '#0D2630' }}
                    >
                      {med.name}
                    </p>
                    <p style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                      {med.dose} · {med.frequency}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* ── Right: consultation wizard ────────────────────────────────────── */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* Step navigation */}
          <div
            className="shrink-0 overflow-x-auto bg-white"
            style={{ borderBottom: '1px solid #0064821F' }}
          >
            <div className="flex min-w-max px-5">
              {CONSULTATION_STEPS.map((step) => {
                const isActive = currentStep === step.number;
                const isCompleted = currentStep > step.number;
                const Icon = step.icon;
                return (
                  <button
                    key={step.key}
                    type="button"
                    onClick={() => setCurrentStep(step.number)}
                    className="font-display flex items-center gap-2 border-b-2 px-4 py-3.5 font-semibold whitespace-nowrap transition-colors"
                    style={{
                      fontSize: 15,
                      lineHeight: '24px',
                      borderBottomColor: isActive ? '#00B4D8' : 'transparent',
                      color: isActive ? '#00B4D8' : isCompleted ? '#4A7080' : '#8A98A3',
                    }}
                  >
                    {/* Step number circle */}
                    <span
                      className="flex shrink-0 items-center justify-center rounded-full text-sm font-bold"
                      style={{
                        width: 24,
                        height: 24,
                        background: isActive ? '#00B4D8' : '#E2EDF1',
                        color: isActive ? '#FFFFFF' : isCompleted ? '#4A7080' : '#8A98A3',
                        flexShrink: 0,
                      }}
                    >
                      {step.number}
                    </span>
                    <Icon style={{ width: 16, height: 16, flexShrink: 0 }} />
                    {step.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Step content area ─────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6">
            {/* ── Step 1: Chief Complaint ────────────────────────────────── */}
            {currentStep === 1 && (
              <div className="max-w-2xl">
                <h2
                  className="font-display font-semibold"
                  style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
                >
                  Chief Complaint
                </h2>
                <p className="mt-1" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                  Primary reason for today&apos;s visit, in patient&apos;s own words.
                </p>

                <textarea
                  value={form.chiefComplaint}
                  onChange={(e) => setField('chiefComplaint', e.target.value)}
                  rows={5}
                  className="mt-4 w-full resize-none px-4 py-3 transition-[border-color] outline-none"
                  style={TEXTAREA_BASE}
                  onFocus={focusBorder}
                  onBlur={blurBorder}
                />

                <div className="mt-5 grid grid-cols-2 gap-4">
                  <div>
                    <label
                      className="mb-1.5 block font-medium"
                      style={{ fontSize: 14, lineHeight: '22px', color: '#0D2630' }}
                    >
                      Duration
                    </label>
                    <input
                      type="text"
                      value={form.duration}
                      onChange={(e) => setField('duration', e.target.value)}
                      placeholder="e.g., 3 days"
                      className="w-full px-4 transition-[border-color] outline-none"
                      style={SINGLE_INPUT_BASE}
                      onFocus={focusBorder}
                      onBlur={blurBorder}
                    />
                  </div>
                  <div>
                    <label
                      className="mb-1.5 block font-medium"
                      style={{ fontSize: 14, lineHeight: '22px', color: '#0D2630' }}
                    >
                      Onset
                    </label>
                    <input
                      type="date"
                      value={form.onset}
                      onChange={(e) => setField('onset', e.target.value)}
                      className="w-full px-4 transition-[border-color] outline-none"
                      style={SINGLE_INPUT_BASE}
                      onFocus={focusBorder}
                      onBlur={blurBorder}
                    />
                  </div>
                </div>

                <div className="mt-6">
                  <div className="mb-3 flex items-center justify-between">
                    <label
                      className="font-medium"
                      style={{ fontSize: 14, lineHeight: '22px', color: '#0D2630' }}
                    >
                      Severity (1–10)
                    </label>
                    <span
                      className="font-semibold"
                      style={{ fontSize: 14, lineHeight: '22px', color: '#00B4D8' }}
                    >
                      {form.severity}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={form.severity}
                    onChange={(e) => setField('severity', Number(e.target.value))}
                    className="h-2 w-full cursor-pointer appearance-none rounded-full [&::-moz-range-thumb]:h-[18px] [&::-moz-range-thumb]:w-[18px] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-md [&::-webkit-slider-thumb]:h-[18px] [&::-webkit-slider-thumb]:w-[18px] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md"
                    style={{
                      background: `linear-gradient(to right, #00B4D8 ${sliderPct}%, #1A3D4D ${sliderPct}%)`,
                    }}
                  />
                  <div className="mt-1.5 flex justify-between">
                    <span className="text-sm" style={{ color: '#8A98A3' }}>
                      1
                    </span>
                    <span className="text-sm" style={{ color: '#8A98A3' }}>
                      10
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 2: History ───────────────────────────────────────── */}
            {currentStep === 2 && (
              <div className="max-w-2xl space-y-6">
                <div>
                  <h2
                    className="font-display font-semibold"
                    style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
                  >
                    History
                  </h2>
                  <p
                    className="mt-1"
                    style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}
                  >
                    History of present illness, past medical and social history.
                  </p>
                </div>

                <div>
                  <label
                    className="mb-1.5 block font-medium"
                    style={{ fontSize: 14, lineHeight: '22px', color: '#0D2630' }}
                  >
                    History of Present Illness
                  </label>
                  <textarea
                    value={form.historyPresentIllness}
                    onChange={(e) => setField('historyPresentIllness', e.target.value)}
                    placeholder="Describe the progression and context of the current complaint..."
                    rows={4}
                    className="w-full resize-none px-4 py-3 transition-[border-color] outline-none"
                    style={TEXTAREA_BASE}
                    onFocus={focusBorder}
                    onBlur={blurBorder}
                  />
                </div>

                <div>
                  <label
                    className="mb-1.5 block font-medium"
                    style={{ fontSize: 14, lineHeight: '22px', color: '#0D2630' }}
                  >
                    Past Medical &amp; Surgical History
                  </label>
                  <textarea
                    value={form.pastMedicalHistory}
                    onChange={(e) => setField('pastMedicalHistory', e.target.value)}
                    placeholder="Previous diagnoses, surgeries, hospitalisations, chronic conditions..."
                    rows={4}
                    className="w-full resize-none px-4 py-3 transition-[border-color] outline-none"
                    style={TEXTAREA_BASE}
                    onFocus={focusBorder}
                    onBlur={blurBorder}
                  />
                </div>

                <div>
                  <label
                    className="mb-1.5 block font-medium"
                    style={{ fontSize: 14, lineHeight: '22px', color: '#0D2630' }}
                  >
                    Family &amp; Social History
                  </label>
                  <textarea
                    value={form.familySocialHistory}
                    onChange={(e) => setField('familySocialHistory', e.target.value)}
                    placeholder="Relevant family conditions, occupation, lifestyle, substance use..."
                    rows={4}
                    className="w-full resize-none px-4 py-3 transition-[border-color] outline-none"
                    style={TEXTAREA_BASE}
                    onFocus={focusBorder}
                    onBlur={blurBorder}
                  />
                </div>
              </div>
            )}

            {/* ── Step 3: Examination ───────────────────────────────────── */}
            {currentStep === 3 && (
              <div className="max-w-2xl space-y-6">
                <div>
                  <h2
                    className="font-display font-semibold"
                    style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
                  >
                    Examination
                  </h2>
                  <p
                    className="mt-1"
                    style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}
                  >
                    Physical examination findings.
                  </p>
                </div>

                <div>
                  <label
                    className="mb-1.5 block font-medium"
                    style={{ fontSize: 14, lineHeight: '22px', color: '#0D2630' }}
                  >
                    General Appearance &amp; Vitals Impression
                  </label>
                  <textarea
                    value={form.generalAppearance}
                    onChange={(e) => setField('generalAppearance', e.target.value)}
                    placeholder="e.g., Alert, not in acute distress. Febrile. No pallor or jaundice..."
                    rows={5}
                    className="w-full resize-none px-4 py-3 transition-[border-color] outline-none"
                    style={TEXTAREA_BASE}
                    onFocus={focusBorder}
                    onBlur={blurBorder}
                  />
                </div>

                <div>
                  <label
                    className="mb-1.5 block font-medium"
                    style={{ fontSize: 14, lineHeight: '22px', color: '#0D2630' }}
                  >
                    Systems Examination
                  </label>
                  <textarea
                    value={form.systemsExamination}
                    onChange={(e) => setField('systemsExamination', e.target.value)}
                    placeholder="CVS, RS, Abdomen, CNS — findings per system..."
                    rows={6}
                    className="w-full resize-none px-4 py-3 transition-[border-color] outline-none"
                    style={TEXTAREA_BASE}
                    onFocus={focusBorder}
                    onBlur={blurBorder}
                  />
                </div>
              </div>
            )}

            {/* ── Step 4: Diagnosis ─────────────────────────────────────── */}
            {currentStep === 4 && (
              <div className="max-w-2xl space-y-6">
                <div>
                  <h2
                    className="font-display font-semibold"
                    style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
                  >
                    Diagnosis
                  </h2>
                  <p
                    className="mt-1"
                    style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}
                  >
                    Clinical impression and differential diagnoses.
                  </p>
                </div>

                <div>
                  <label
                    className="mb-1.5 block font-medium"
                    style={{ fontSize: 14, lineHeight: '22px', color: '#0D2630' }}
                  >
                    Primary Diagnosis
                  </label>
                  <input
                    type="text"
                    value={form.primaryDiagnosis}
                    onChange={(e) => setField('primaryDiagnosis', e.target.value)}
                    placeholder="e.g., Malaria (Uncomplicated) — B54"
                    className="w-full px-4 transition-[border-color] outline-none"
                    style={SINGLE_INPUT_BASE}
                    onFocus={focusBorder}
                    onBlur={blurBorder}
                  />
                </div>

                <div>
                  <label
                    className="mb-1.5 block font-medium"
                    style={{ fontSize: 14, lineHeight: '22px', color: '#0D2630' }}
                  >
                    Differential Diagnoses
                  </label>
                  <textarea
                    value={form.differentialDiagnosis}
                    onChange={(e) => setField('differentialDiagnosis', e.target.value)}
                    placeholder="List alternative diagnoses under consideration..."
                    rows={5}
                    className="w-full resize-none px-4 py-3 transition-[border-color] outline-none"
                    style={TEXTAREA_BASE}
                    onFocus={focusBorder}
                    onBlur={blurBorder}
                  />
                </div>
              </div>
            )}

            {/* ── Step 5: Treatment Plan ────────────────────────────────── */}
            {currentStep === 5 && (
              <div className="max-w-2xl space-y-6">
                <div>
                  <h2
                    className="font-display font-semibold"
                    style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
                  >
                    Treatment Plan
                  </h2>
                  <p
                    className="mt-1"
                    style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}
                  >
                    Medications, investigations and management plan.
                  </p>
                </div>

                <div>
                  <label
                    className="mb-1.5 block font-medium"
                    style={{ fontSize: 14, lineHeight: '22px', color: '#0D2630' }}
                  >
                    Medications Prescribed
                  </label>
                  <textarea
                    value={form.medicationsPrescribed}
                    onChange={(e) => setField('medicationsPrescribed', e.target.value)}
                    placeholder="e.g., Artemether-Lumefantrine 80/480mg, BD × 3 days..."
                    rows={4}
                    className="w-full resize-none px-4 py-3 transition-[border-color] outline-none"
                    style={TEXTAREA_BASE}
                    onFocus={focusBorder}
                    onBlur={blurBorder}
                  />
                </div>

                <div>
                  <label
                    className="mb-1.5 block font-medium"
                    style={{ fontSize: 14, lineHeight: '22px', color: '#0D2630' }}
                  >
                    Investigations Ordered
                  </label>
                  <textarea
                    value={form.investigationsOrdered}
                    onChange={(e) => setField('investigationsOrdered', e.target.value)}
                    placeholder="e.g., FBC, Malaria RDT, Urinalysis, Chest X-Ray..."
                    rows={4}
                    className="w-full resize-none px-4 py-3 transition-[border-color] outline-none"
                    style={TEXTAREA_BASE}
                    onFocus={focusBorder}
                    onBlur={blurBorder}
                  />
                </div>

                <div>
                  <label
                    className="mb-1.5 block font-medium"
                    style={{ fontSize: 14, lineHeight: '22px', color: '#0D2630' }}
                  >
                    Management Plan
                  </label>
                  <textarea
                    value={form.managementPlan}
                    onChange={(e) => setField('managementPlan', e.target.value)}
                    placeholder="Admission, referral, follow-up date and instructions..."
                    rows={4}
                    className="w-full resize-none px-4 py-3 transition-[border-color] outline-none"
                    style={TEXTAREA_BASE}
                    onFocus={focusBorder}
                    onBlur={blurBorder}
                  />
                </div>
              </div>
            )}

            {/* ── Step 6: Clinical Notes ────────────────────────────────── */}
            {currentStep === 6 && (
              <div className="max-w-2xl">
                <h2
                  className="font-display font-semibold"
                  style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
                >
                  Clinical Notes
                </h2>
                <p className="mt-1" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                  Additional observations and free-text clinical documentation.
                </p>

                <textarea
                  value={form.clinicalNotes}
                  onChange={(e) => setField('clinicalNotes', e.target.value)}
                  placeholder="Enter any additional clinical observations, notes or instructions..."
                  rows={12}
                  className="mt-4 w-full resize-none px-4 py-3 transition-[border-color] outline-none"
                  style={TEXTAREA_BASE}
                  onFocus={focusBorder}
                  onBlur={blurBorder}
                />
              </div>
            )}
          </div>

          {/* ── Bottom action bar ──────────────────────────────────────────── */}
          <div
            className="flex shrink-0 items-center gap-3 px-5 py-4"
            style={{ background: '#FFFFFF', borderTop: '1px solid #0064821F' }}
          >
            <button
              type="button"
              className="rounded-[12px] px-5 font-sans font-semibold transition-colors hover:bg-slate-50"
              style={{
                fontSize: 16,
                lineHeight: '24px',
                color: '#0D2630',
                border: '1px solid #0064821F',
                height: 44,
              }}
            >
              Save Draft
            </button>

            <button
              type="button"
              className="rounded-[12px] px-5 font-sans font-semibold transition-colors hover:bg-amber-50"
              style={{
                fontSize: 16,
                lineHeight: '24px',
                color: '#D97706',
                border: '1px solid #F59E0B',
                height: 44,
              }}
            >
              Refer Patient
            </button>

            <button
              type="button"
              className="rounded-[12px] px-5 font-sans font-semibold text-white transition-opacity hover:opacity-90"
              style={{
                fontSize: 16,
                lineHeight: '24px',
                background: '#00B4D8',
                height: 44,
              }}
            >
              Complete Consultation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
