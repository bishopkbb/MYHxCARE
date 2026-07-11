'use client';

import {
  AlertTriangle,
  BookOpen,
  ChevronLeft,
  ClipboardList,
  FileText,
  FlaskConical,
  Info,
  MessageSquare,
  Pill,
  Search,
  Share2,
  Stethoscope,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { use, useState } from 'react';

import { useToast } from '@/hooks/useToast';
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
  chiefComplaint: string;
  duration: string;
  onset: string;
  severity: number;
  historyPresentIllness: string;
  pastMedicalHistory: string;
  familyHistory: string;
  socialHistory: string;
  generalExamination: string;
  cardiovascularSystem: string;
  respiratorySystem: string;
  abdominalGIT: string;
  neurologicalSystem: string;
  musculoskeletal: string;
  entHeadNeck: string;
  primaryDiagnosis: string;
  differentialDiagnoses: string;
  diagnosticReasoning: string;
  treatmentPlan: string;
  followUpInstructions: string;
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

const SUMMARY_VITAL_KEYS = new Set([
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
  familyHistory: '',
  socialHistory: '',
  generalExamination: '',
  cardiovascularSystem: '',
  respiratorySystem: '',
  abdominalGIT: '',
  neurologicalSystem: '',
  musculoskeletal: '',
  entHeadNeck: '',
  primaryDiagnosis: '',
  differentialDiagnoses: '',
  diagnosticReasoning: '',
  treatmentPlan: '',
  followUpInstructions: '',
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

const TEXTAREA_BASE: React.CSSProperties = { ...INPUT_BASE, borderRadius: 12 };

const SINGLE_INPUT_BASE: React.CSSProperties = { ...INPUT_BASE, height: 44, borderRadius: 10 };

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

  const toast = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState<ConsultationForm>(INITIAL_FORM);

  function setField<K extends keyof ConsultationForm>(key: K, value: ConsultationForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const activeMedications = patient.medications.filter((m) => m.status === 'active');
  const summaryVitals = patient.vitalSigns.readings.filter((r) => SUMMARY_VITAL_KEYS.has(r.key));
  const sliderPct = ((form.severity - 1) / 9) * 100;

  return (
    <div className="flex h-full flex-col overflow-hidden" style={{ background: '#F5FBFD' }}>
      {/* ── Patient preview bar ────────────────────────────────────────────────── */}
      <div
        className="px-5 py-[10px] sm:flex sm:min-h-[60px] sm:items-center sm:gap-4 sm:py-0"
        style={{ background: '#1A3D4D', borderBottom: '1px solid rgba(255,255,255,0.10)' }}
      >
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

      {/* ── Scrollable body ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-5 px-5 py-5">
          {/* ── Patient summary card ──────────────────────────────────────────── */}
          <div className="overflow-hidden rounded-[16px]" style={{ border: '1px solid #0064821F' }}>
            {/* Identity — height ~106px, white */}
            <div
              className="flex items-center gap-4 px-4 py-4"
              style={{ background: '#FFFFFF', borderBottom: '1px solid #0064821F' }}
            >
              <div
                className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
                style={{ width: 52, height: 52, background: '#00B4D8', fontSize: 20 }}
              >
                {patient.initials}
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className="font-semibold"
                  style={{ fontSize: 18, lineHeight: '28px', color: '#0D2630' }}
                >
                  {patient.name}
                </p>
                <p style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>{patient.mrn}</p>
                <p style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                  {patient.age} {patient.gender} · BG: {patient.bloodGroup}
                </p>
              </div>
              {patient.isUrgent && (
                <span
                  className="shrink-0 text-sm font-bold tracking-wide uppercase"
                  style={{
                    borderRadius: 4,
                    padding: '4px 10px',
                    background: 'rgba(245,158,11,0.12)',
                    border: '1px solid rgba(245,158,11,0.45)',
                    color: '#D97706',
                  }}
                >
                  URGENT
                </span>
              )}
            </div>

            {/* Vitals + Allergies — 2-column, semi-transparent */}
            <div
              className="grid grid-cols-1 gap-6 px-4 py-4 sm:grid-cols-2"
              style={{ background: 'rgba(255,255,255,0.52)' }}
            >
              {/* Left: Vital Signs */}
              {summaryVitals.length > 0 && (
                <div>
                  <p
                    className="mb-3 text-sm font-semibold tracking-wider uppercase"
                    style={{ color: '#00B4D8' }}
                  >
                    Vital Signs
                  </p>
                  <div className="flex flex-col gap-2">
                    {summaryVitals.map((reading) => {
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

              {/* Right: Allergies */}
              {patient.allergies.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center gap-1.5">
                    <AlertTriangle
                      aria-hidden
                      style={{ width: 14, height: 14, color: '#F59E0B' }}
                    />
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
                        className="rounded-full px-3 py-1"
                        style={{
                          fontSize: 14,
                          lineHeight: '22px',
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
            </div>

            {/* Active Medications — semi-transparent, border-top divider */}
            {activeMedications.length > 0 && (
              <div
                className="px-4 py-4"
                style={{
                  background: 'rgba(255,255,255,0.52)',
                  borderTop: '1px solid #0064821F',
                }}
              >
                <p
                  className="mb-[11px] text-sm font-semibold tracking-wider uppercase"
                  style={{ color: '#4A7080' }}
                >
                  Active Medications
                </p>
                <div className="flex flex-col gap-[11px]">
                  {activeMedications.map((med) => (
                    <div
                      key={med.id}
                      className="rounded-[10px] px-4 py-3"
                      style={{
                        background: 'rgba(0,180,216,0.06)',
                        border: '1px solid rgba(0,180,216,0.18)',
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
          </div>

          {/* ── Consultation form card ─────────────────────────────────────────── */}
          <div
            className="overflow-hidden rounded-[16px] bg-white"
            style={{ border: '1px solid #0064821F' }}
          >
            {/* Tab bar — 47px height, px-4, gap-[14px] */}
            <div
              className="overflow-x-auto"
              style={{ background: '#FFFFFF', borderBottom: '1px solid #0064821F' }}
            >
              <div className="flex min-w-max gap-[14px] px-4">
                {CONSULTATION_STEPS.map((step) => {
                  const isActive = currentStep === step.number;
                  const isCompleted = currentStep > step.number;
                  const Icon = step.icon;
                  return (
                    <button
                      key={step.key}
                      type="button"
                      onClick={() => setCurrentStep(step.number)}
                      className="font-display flex items-center gap-2 border-b-2 py-[10px] font-semibold whitespace-nowrap transition-colors"
                      style={{
                        fontSize: 15,
                        lineHeight: '24px',
                        borderBottomColor: isActive ? '#00B4D8' : 'transparent',
                        color: isActive ? '#00B4D8' : isCompleted ? '#4A7080' : '#8A98A3',
                      }}
                    >
                      <span
                        className="flex shrink-0 items-center justify-center rounded-full text-sm font-bold"
                        style={{
                          width: 24,
                          height: 24,
                          background: isActive ? '#00B4D8' : '#E2EDF1',
                          color: isActive ? '#FFFFFF' : isCompleted ? '#4A7080' : '#8A98A3',
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

            {/* ── Step content ──────────────────────────────────────────────────── */}
            <div className="px-5 py-5 sm:px-6">
              {/* Step 1: Chief Complaint */}
              {currentStep === 1 && (
                <div>
                  <h2
                    className="font-display font-semibold"
                    style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
                  >
                    Chief Complaint
                  </h2>
                  <p
                    className="mt-1"
                    style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}
                  >
                    Primary reason for today&apos;s visit, in patient&apos;s own words.
                  </p>

                  <textarea
                    value={form.chiefComplaint}
                    onChange={(e) => setField('chiefComplaint', e.target.value)}
                    rows={4}
                    className="mt-4 w-full resize-none px-4 py-3 transition-[border-color] outline-none"
                    style={TEXTAREA_BASE}
                    onFocus={focusBorder}
                    onBlur={blurBorder}
                  />

                  <div className="mt-4 grid max-w-[670px] grid-cols-2 gap-4 pt-4">
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

                  <div className="mt-2 pt-4">
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
                    <div className="pt-[6px]">
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
                </div>
              )}

              {/* Step 2: History */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  {/* History of Presenting Illness (HPI) */}
                  <div>
                    <p
                      className="pb-[6px] font-sans font-semibold"
                      style={{ fontSize: 16, lineHeight: '24px', color: '#0D2630' }}
                    >
                      History of Presenting Illness (HPI)
                    </p>
                    <textarea
                      value={form.historyPresentIllness}
                      onChange={(e) => setField('historyPresentIllness', e.target.value)}
                      placeholder="Onset, duration, character, associated symptoms, relieving/aggravating factors..."
                      className="w-full resize-none px-4 py-3 transition-[border-color] outline-none placeholder:text-[#8A98A3]"
                      style={{ ...TEXTAREA_BASE, minHeight: 128 }}
                      onFocus={focusBorder}
                      onBlur={blurBorder}
                    />
                  </div>

                  {/* Past Medical History */}
                  <div>
                    <p
                      className="pb-[6px] font-sans font-semibold"
                      style={{ fontSize: 16, lineHeight: '24px', color: '#0D2630' }}
                    >
                      Past Medical History
                    </p>
                    <textarea
                      value={form.pastMedicalHistory}
                      onChange={(e) => setField('pastMedicalHistory', e.target.value)}
                      placeholder="Previous illnesses, surgeries, hospitalisations, chronic conditions..."
                      className="w-full resize-none px-4 py-3 transition-[border-color] outline-none placeholder:text-[#8A98A3]"
                      style={{ ...TEXTAREA_BASE, minHeight: 128 }}
                      onFocus={focusBorder}
                      onBlur={blurBorder}
                    />
                  </div>

                  {/* Family History */}
                  <div>
                    <p
                      className="pb-[6px] font-sans font-semibold"
                      style={{ fontSize: 16, lineHeight: '24px', color: '#0D2630' }}
                    >
                      Family History
                    </p>
                    <textarea
                      value={form.familyHistory}
                      onChange={(e) => setField('familyHistory', e.target.value)}
                      placeholder="Relevant family medical history..."
                      className="w-full resize-none px-4 py-3 transition-[border-color] outline-none placeholder:text-[#8A98A3]"
                      style={{ ...TEXTAREA_BASE, minHeight: 128 }}
                      onFocus={focusBorder}
                      onBlur={blurBorder}
                    />
                  </div>

                  {/* Social History */}
                  <div>
                    <p
                      className="pb-[6px] font-sans font-semibold"
                      style={{ fontSize: 16, lineHeight: '24px', color: '#0D2630' }}
                    >
                      Social History
                    </p>
                    <textarea
                      value={form.socialHistory}
                      onChange={(e) => setField('socialHistory', e.target.value)}
                      placeholder="Smoking, alcohol, drug use, occupation, living situation..."
                      className="w-full resize-none px-4 py-3 transition-[border-color] outline-none placeholder:text-[#8A98A3]"
                      style={{ ...TEXTAREA_BASE, minHeight: 128 }}
                      onFocus={focusBorder}
                      onBlur={blurBorder}
                    />
                  </div>
                </div>
              )}

              {/* Step 3: Examination */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  {/* General Examination — full width */}
                  <div>
                    <p
                      className="pb-[6px] font-sans font-semibold"
                      style={{ fontSize: 16, lineHeight: '24px', color: '#0D2630' }}
                    >
                      General Examination
                    </p>
                    <textarea
                      value={form.generalExamination}
                      onChange={(e) => setField('generalExamination', e.target.value)}
                      placeholder="Patient appearance, nutritional status, conscious level, pallor, jaundice, cyanosis, oedema..."
                      className="w-full resize-none px-4 py-3 transition-[border-color] outline-none placeholder:text-[#8A98A3]"
                      style={{ ...TEXTAREA_BASE, minHeight: 128 }}
                      onFocus={focusBorder}
                      onBlur={blurBorder}
                    />
                  </div>

                  {/* Systems — 2-column grid */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {/* Cardiovascular System */}
                    <div>
                      <p
                        className="pb-[6px] font-sans font-semibold"
                        style={{ fontSize: 16, lineHeight: '24px', color: '#0D2630' }}
                      >
                        Cardiovascular System
                      </p>
                      <textarea
                        value={form.cardiovascularSystem}
                        onChange={(e) => setField('cardiovascularSystem', e.target.value)}
                        placeholder="Findings..."
                        className="w-full resize-none px-4 py-3 transition-[border-color] outline-none placeholder:text-[#8A98A3]"
                        style={{ ...TEXTAREA_BASE, minHeight: 128 }}
                        onFocus={focusBorder}
                        onBlur={blurBorder}
                      />
                    </div>

                    {/* Respiratory System */}
                    <div>
                      <p
                        className="pb-[6px] font-sans font-semibold"
                        style={{ fontSize: 16, lineHeight: '24px', color: '#0D2630' }}
                      >
                        Respiratory System
                      </p>
                      <textarea
                        value={form.respiratorySystem}
                        onChange={(e) => setField('respiratorySystem', e.target.value)}
                        placeholder="Findings..."
                        className="w-full resize-none px-4 py-3 transition-[border-color] outline-none placeholder:text-[#8A98A3]"
                        style={{ ...TEXTAREA_BASE, minHeight: 128 }}
                        onFocus={focusBorder}
                        onBlur={blurBorder}
                      />
                    </div>

                    {/* Abdominal / GIT */}
                    <div>
                      <p
                        className="pb-[6px] font-sans font-semibold"
                        style={{ fontSize: 16, lineHeight: '24px', color: '#0D2630' }}
                      >
                        Abdominal / GIT
                      </p>
                      <textarea
                        value={form.abdominalGIT}
                        onChange={(e) => setField('abdominalGIT', e.target.value)}
                        placeholder="Findings..."
                        className="w-full resize-none px-4 py-3 transition-[border-color] outline-none placeholder:text-[#8A98A3]"
                        style={{ ...TEXTAREA_BASE, minHeight: 128 }}
                        onFocus={focusBorder}
                        onBlur={blurBorder}
                      />
                    </div>

                    {/* Neurological System */}
                    <div>
                      <p
                        className="pb-[6px] font-sans font-semibold"
                        style={{ fontSize: 16, lineHeight: '24px', color: '#0D2630' }}
                      >
                        Neurological System
                      </p>
                      <textarea
                        value={form.neurologicalSystem}
                        onChange={(e) => setField('neurologicalSystem', e.target.value)}
                        placeholder="Findings..."
                        className="w-full resize-none px-4 py-3 transition-[border-color] outline-none placeholder:text-[#8A98A3]"
                        style={{ ...TEXTAREA_BASE, minHeight: 128 }}
                        onFocus={focusBorder}
                        onBlur={blurBorder}
                      />
                    </div>

                    {/* Musculoskeletal */}
                    <div>
                      <p
                        className="pb-[6px] font-sans font-semibold"
                        style={{ fontSize: 16, lineHeight: '24px', color: '#0D2630' }}
                      >
                        Musculoskeletal
                      </p>
                      <textarea
                        value={form.musculoskeletal}
                        onChange={(e) => setField('musculoskeletal', e.target.value)}
                        placeholder="Findings..."
                        className="w-full resize-none px-4 py-3 transition-[border-color] outline-none placeholder:text-[#8A98A3]"
                        style={{ ...TEXTAREA_BASE, minHeight: 128 }}
                        onFocus={focusBorder}
                        onBlur={blurBorder}
                      />
                    </div>

                    {/* ENT / Head & Neck */}
                    <div>
                      <p
                        className="pb-[6px] font-sans font-semibold"
                        style={{ fontSize: 16, lineHeight: '24px', color: '#0D2630' }}
                      >
                        ENT / Head &amp; Neck
                      </p>
                      <textarea
                        value={form.entHeadNeck}
                        onChange={(e) => setField('entHeadNeck', e.target.value)}
                        placeholder="Findings..."
                        className="w-full resize-none px-4 py-3 transition-[border-color] outline-none placeholder:text-[#8A98A3]"
                        style={{ ...TEXTAREA_BASE, minHeight: 128 }}
                        onFocus={focusBorder}
                        onBlur={blurBorder}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Diagnosis */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  {/* Primary Diagnosis */}
                  <div>
                    <p
                      className="pb-[6px] font-sans font-semibold"
                      style={{ fontSize: 16, lineHeight: '24px', color: '#0D2630' }}
                    >
                      Primary Diagnosis
                    </p>
                    <input
                      type="text"
                      value={form.primaryDiagnosis}
                      onChange={(e) => setField('primaryDiagnosis', e.target.value)}
                      placeholder="e.g., Upper Respiratory Tract Infection"
                      className="w-full px-4 transition-[border-color] outline-none"
                      style={SINGLE_INPUT_BASE}
                      onFocus={focusBorder}
                      onBlur={blurBorder}
                    />
                    {/* Quick-pick chips */}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {[
                        'Malaria',
                        'URTI',
                        'Hypertension',
                        'Gastroenteritis',
                        'Pneumonia',
                        'Anaemia',
                        'UTI',
                        'Diabetes Mellitus',
                      ].map((condition) => (
                        <button
                          key={condition}
                          type="button"
                          onClick={() => setField('primaryDiagnosis', condition)}
                          className="rounded-full px-3 py-1 transition-colors hover:bg-[rgba(0,180,216,0.06)]"
                          style={{
                            fontSize: 14,
                            lineHeight: '22px',
                            color: '#4A7080',
                            border: '1px solid #0064821F',
                            background:
                              form.primaryDiagnosis === condition
                                ? 'rgba(0,180,216,0.08)'
                                : '#FFFFFF',
                            borderColor:
                              form.primaryDiagnosis === condition ? '#00B4D8' : '#0064821F',
                          }}
                        >
                          {condition}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Differential Diagnoses */}
                  <div>
                    <p
                      className="pb-[6px] font-sans font-semibold"
                      style={{ fontSize: 16, lineHeight: '24px', color: '#0D2630' }}
                    >
                      Differential Diagnoses
                    </p>
                    <textarea
                      value={form.differentialDiagnoses}
                      onChange={(e) => setField('differentialDiagnoses', e.target.value)}
                      placeholder="Differential diagnoses in order of likelihood..."
                      className="w-full resize-none px-4 py-3 transition-[border-color] outline-none placeholder:text-[#8A98A3]"
                      style={{ ...TEXTAREA_BASE, minHeight: 128 }}
                      onFocus={focusBorder}
                      onBlur={blurBorder}
                    />
                  </div>

                  {/* Diagnostic Reasoning */}
                  <div>
                    <p
                      className="pb-[6px] font-sans font-semibold"
                      style={{ fontSize: 16, lineHeight: '24px', color: '#0D2630' }}
                    >
                      Diagnostic Reasoning
                    </p>
                    <textarea
                      value={form.diagnosticReasoning}
                      onChange={(e) => setField('diagnosticReasoning', e.target.value)}
                      placeholder="Clinical reasoning supporting this diagnosis..."
                      className="w-full resize-none px-4 py-3 transition-[border-color] outline-none placeholder:text-[#8A98A3]"
                      style={{ ...TEXTAREA_BASE, minHeight: 128 }}
                      onFocus={focusBorder}
                      onBlur={blurBorder}
                    />
                  </div>
                </div>
              )}

              {/* Step 5: Treatment Plan */}
              {currentStep === 5 && (
                <div className="space-y-6">
                  {/* Treatment Plan textarea */}
                  <div>
                    <p
                      className="pb-[6px] font-sans font-semibold"
                      style={{ fontSize: 16, lineHeight: '24px', color: '#0D2630' }}
                    >
                      Treatment Plan
                    </p>
                    <textarea
                      value={form.treatmentPlan}
                      onChange={(e) => setField('treatmentPlan', e.target.value)}
                      placeholder="Overall treatment plan, goals, and expected outcomes..."
                      className="w-full resize-none px-4 py-3 transition-[border-color] outline-none placeholder:text-[#8A98A3]"
                      style={{ ...TEXTAREA_BASE, minHeight: 128 }}
                      onFocus={focusBorder}
                      onBlur={blurBorder}
                    />
                  </div>

                  {/* Quick action buttons */}
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        toast.info('Coming soon', 'Prescription module is not yet available.')
                      }
                      className="flex items-center gap-2 rounded-[12px] px-4 font-sans font-semibold transition-colors hover:bg-[rgba(0,180,216,0.06)]"
                      style={{
                        fontSize: 14,
                        lineHeight: '22px',
                        height: 44,
                        color: '#00B4D8',
                        border: '1px solid #00B4D8',
                        background: '#FFFFFF',
                      }}
                    >
                      <Pill style={{ width: 16, height: 16, flexShrink: 0 }} />
                      Add Prescription
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        toast.info('Coming soon', 'Lab test request module is not yet available.')
                      }
                      className="flex items-center gap-2 rounded-[12px] px-4 font-sans font-semibold transition-colors hover:bg-[rgba(0,180,216,0.06)]"
                      style={{
                        fontSize: 14,
                        lineHeight: '22px',
                        height: 44,
                        color: '#00B4D8',
                        border: '1px solid #00B4D8',
                        background: '#FFFFFF',
                      }}
                    >
                      <FlaskConical style={{ width: 16, height: 16, flexShrink: 0 }} />
                      Request Lab Test
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        toast.warning(
                          'Patient referred',
                          'Referral submitted for specialist review.',
                        )
                      }
                      className="flex items-center gap-2 rounded-[12px] px-4 font-sans font-semibold transition-colors hover:bg-[rgba(0,180,216,0.06)]"
                      style={{
                        fontSize: 14,
                        lineHeight: '22px',
                        height: 44,
                        color: '#00B4D8',
                        border: '1px solid #00B4D8',
                        background: '#FFFFFF',
                      }}
                    >
                      <Share2 style={{ width: 16, height: 16, flexShrink: 0 }} />
                      Refer Patient
                    </button>
                  </div>

                  {/* Follow-up Instructions */}
                  <div>
                    <p
                      className="pb-[6px] font-sans font-semibold"
                      style={{ fontSize: 16, lineHeight: '24px', color: '#0D2630' }}
                    >
                      Follow-up Instructions
                    </p>
                    <textarea
                      value={form.followUpInstructions}
                      onChange={(e) => setField('followUpInstructions', e.target.value)}
                      placeholder="Return schedule, warning signs, lifestyle advice..."
                      className="w-full resize-none px-4 py-3 transition-[border-color] outline-none placeholder:text-[#8A98A3]"
                      style={{ ...TEXTAREA_BASE, minHeight: 128 }}
                      onFocus={focusBorder}
                      onBlur={blurBorder}
                    />
                  </div>
                </div>
              )}

              {/* Step 6: Clinical Notes */}
              {currentStep === 6 && (
                <div className="space-y-4">
                  {/* Title + teal subtitle */}
                  <div>
                    <p
                      className="font-sans font-semibold"
                      style={{ fontSize: 16, lineHeight: '24px', color: '#0D2630' }}
                    >
                      Clinical Notes
                    </p>
                    <p
                      className="mt-0.5"
                      style={{ fontSize: 14, lineHeight: '22px', color: '#00B4D8' }}
                    >
                      Confidential observations. Audit-logged and time-stamped.
                    </p>
                  </div>

                  {/* Large textarea */}
                  <textarea
                    value={form.clinicalNotes}
                    onChange={(e) => setField('clinicalNotes', e.target.value)}
                    placeholder="Clinical observations, nursing instructions, follow-up notes..."
                    className="w-full resize-none px-4 py-3 transition-[border-color] outline-none placeholder:text-[#8A98A3]"
                    style={{ ...TEXTAREA_BASE, minHeight: 240 }}
                    onFocus={focusBorder}
                    onBlur={blurBorder}
                  />

                  {/* Info banner */}
                  <div
                    className="flex items-start gap-2.5 rounded-[10px] px-4 py-3"
                    style={{
                      background: 'rgba(0,180,216,0.07)',
                      border: '1px solid rgba(0,180,216,0.20)',
                    }}
                  >
                    <Info
                      aria-hidden
                      style={{
                        width: 16,
                        height: 16,
                        color: '#00B4D8',
                        flexShrink: 0,
                        marginTop: 3,
                      }}
                    />
                    <p style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                      All clinical notes are time-stamped. Submitted notes cannot be deleted — only
                      amended.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* ── Action bar — max-w 622px, space-between ───────────────────────── */}
            <div
              className="flex max-w-[622px] items-center justify-between"
              style={{
                borderTop: '1px solid #0064821F',
                padding: '14px 20px',
                background: '#FFFFFF',
              }}
            >
              <button
                type="button"
                onClick={() => toast.success('Draft saved', 'Your progress has been saved.')}
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
                onClick={() =>
                  toast.warning('Patient referred', 'Referral submitted for specialist review.')
                }
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
                onClick={() => {
                  toast.success('Consultation complete', 'The encounter record has been saved.');
                  router.back();
                }}
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

          {/* scroll breathing room below last card */}
          <div className="h-4" />
        </div>
      </div>
    </div>
  );
}
