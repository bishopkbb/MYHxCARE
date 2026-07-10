'use client';

import {
  Activity,
  AlertTriangle,
  ChevronLeft,
  FileText,
  FlaskConical,
  History,
  Paperclip,
  Pill,
  Stethoscope,
  User,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { use, useState } from 'react';

import { AllergyBanner } from '@/components/clinical/AllergyBanner';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { PERMISSIONS } from '@/constants/permissions';
import {
  FALLBACK_PATIENT_DETAIL,
  MOCK_PATIENT_DETAILS,
} from '@/features/patients/__mocks__/patientFixtures';

// ── Types ─────────────────────────────────────────────────────────────────────

type PatientTab = {
  key: string;
  label: string;
  icon: LucideIcon;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const QUEUE_BADGE: Record<string, { bg: string; border: string; text: string }> = {
  Waiting: { bg: '#FFFBEB', border: '#FEE685', text: '#D97706' },
  'In Consultation': { bg: 'rgba(0,180,216,0.08)', border: 'rgba(0,180,216,0.4)', text: '#00B4D8' },
  Emergency: { bg: 'rgba(239,68,68,0.08)', border: '#EF4444', text: '#EF4444' },
  Completed: { bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.4)', text: '#22C55E' },
  'New Admission': { bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.4)', text: '#3B82F6' },
  'Follow-up': { bg: '#FFFBEB', border: '#FEE685', text: '#D97706' },
  Discharged: { bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.4)', text: '#6B7280' },
  'Under Observation': {
    bg: 'rgba(139,92,246,0.08)',
    border: 'rgba(139,92,246,0.4)',
    text: '#8B5CF6',
  },
};

const FALLBACK_BADGE = {
  bg: 'rgba(0,100,130,0.06)',
  border: 'rgba(0,100,130,0.2)',
  text: '#4A7080',
};

const PATIENT_TABS: PatientTab[] = [
  { key: 'biodata', label: 'Biodata', icon: User },
  { key: 'medical-history', label: 'Medical History', icon: History },
  { key: 'allergies', label: 'Allergies', icon: AlertTriangle },
  { key: 'vital-signs', label: 'Vital Signs', icon: Activity },
  { key: 'prev-consultations', label: 'Prev. Consultations', icon: Stethoscope },
  { key: 'current-medications', label: 'Current Medications', icon: Pill },
  { key: 'lab-results', label: 'Lab Results', icon: FlaskConical },
  { key: 'attachments', label: 'Attachments', icon: Paperclip },
];

// ── Page ───────────────────────────────────────────────────────────────────────

export default function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const patient = MOCK_PATIENT_DETAILS[id] ?? FALLBACK_PATIENT_DETAIL;
  const [activeTab, setActiveTab] = useState('biodata');

  const queueBadge = QUEUE_BADGE[patient.queueStatus] ?? FALLBACK_BADGE;

  return (
    <div className="flex min-h-screen flex-col" style={{ background: '#F5FBFD' }}>
      {/* ── Quick patient preview bar ─────────────────────────────────────── */}
      <div
        className="flex items-center gap-4 px-5"
        style={{
          background: '#1A3D4D',
          borderBottom: '1px solid rgba(255,255,255,0.10)',
          minHeight: 60,
          paddingTop: 14,
          paddingBottom: 14,
        }}
      >
        {/* Back */}
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

        {/* Avatar */}
        <div
          className="flex shrink-0 items-center justify-center rounded-full text-sm font-medium text-white"
          style={{ width: 40, height: 40, background: 'rgba(255,255,255,0.15)' }}
        >
          {patient.initials}
        </div>

        {/* Compact info strip */}
        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1">
          <span className="shrink-0 text-lg leading-7 font-normal text-white">{patient.name}</span>
          <span
            className="shrink-0 text-base leading-6"
            style={{ color: 'rgba(255,255,255,0.52)' }}
          >
            {patient.mrn}
          </span>
          <span
            className="shrink-0 text-base leading-6"
            style={{ color: 'rgba(255,255,255,0.52)' }}
          >
            {patient.age} · {patient.gender}
          </span>
          <span
            className="shrink-0 text-base leading-6"
            style={{ color: 'rgba(255,255,255,0.52)' }}
          >
            BG: {patient.bloodGroup}
          </span>

          {patient.allergies.length > 0 && (
            <>
              <AlertTriangle style={{ width: 22, height: 22, color: '#FCA5A5', flexShrink: 0 }} />
              {patient.allergies.slice(0, 2).map((allergy) => (
                <span
                  key={allergy.id}
                  className="shrink-0 text-sm leading-[22px] font-medium"
                  style={{
                    borderRadius: 4,
                    padding: '3px 8px',
                    background: 'rgba(239,68,68,0.28)',
                    border: '1px solid rgba(239,68,68,0.40)',
                    color: '#FCA5A5',
                  }}
                >
                  {allergy.substance}
                </span>
              ))}
              {patient.allergies.length > 2 && (
                <span
                  className="shrink-0 text-sm leading-[22px] font-medium"
                  style={{
                    borderRadius: 4,
                    padding: '3px 8px',
                    background: 'rgba(239,68,68,0.15)',
                    border: '1px solid rgba(239,68,68,0.25)',
                    color: '#FCA5A5',
                  }}
                >
                  +{patient.allergies.length - 2} more
                </span>
              )}
            </>
          )}
        </div>

        {patient.isUrgent && (
          <div className="ml-auto shrink-0">
            <span
              className="text-sm leading-[22px] font-medium"
              style={{
                borderRadius: 4,
                padding: '4px 12px',
                background: 'rgba(245,158,11,0.30)',
                border: '1px solid rgba(245,158,11,0.45)',
                color: '#FCD34D',
              }}
            >
              URGENT
            </span>
          </div>
        )}
      </div>

      {/* ── White content shell ────────────────────────────────────────────── */}
      <div className="mx-4 mt-5 overflow-hidden rounded-[16px] bg-white shadow-sm sm:mx-6 lg:mx-8">
        {/* ── Allergy banner ───────────────────────────────────────────────── */}
        {patient.allergies.length > 0 && (
          <div className="px-6 pt-5">
            <AllergyBanner allergies={patient.allergies} />
          </div>
        )}

        {/* ── Patient info section ──────────────────────────────────────────── */}
        <div
          className="flex flex-col gap-5 px-5 py-5 md:flex-row md:items-start md:justify-between md:px-6"
          style={{ borderBottom: '1px solid rgba(0,100,130,0.10)' }}
        >
          {/* ── Left: avatar + info ────────────────────────────────────────── */}
          <div className="flex min-w-0 items-start gap-4">
            {/* Avatar — 56×56, rounded-[12px] per spec */}
            <div
              className="flex shrink-0 items-center justify-center text-lg font-semibold text-white"
              style={{
                width: 56,
                height: 56,
                borderRadius: 12,
                background: '#00B4D8',
              }}
            >
              {patient.initials}
            </div>

            {/* Info block */}
            <div>
              {/* Row 1: name + queue status badge */}
              <div className="flex flex-wrap items-center gap-2.5">
                <h2
                  className="font-display text-[20px] leading-7 font-semibold"
                  style={{ color: '#0D2630' }}
                >
                  {patient.name}
                </h2>
                <span
                  className="inline-flex items-center rounded-full px-2 py-0.5 text-sm font-medium"
                  style={{
                    background: queueBadge.bg,
                    border: `1px solid ${queueBadge.border}`,
                    color: queueBadge.text,
                  }}
                >
                  {patient.queueStatus}
                </span>
              </div>

              {/* Row 2: URGENT badge */}
              {patient.isUrgent && (
                <span
                  className="mt-1.5 inline-flex items-center rounded-full px-2 py-0.5 text-sm font-bold tracking-wide uppercase"
                  style={{
                    background: '#FFFBEB',
                    border: '1px solid #EF4444',
                    color: '#EF4444',
                  }}
                >
                  URGENT
                </span>
              )}

              {/* Row 3+: info grid */}
              <div className="mt-3 grid grid-cols-2 gap-x-10 gap-y-1.5">
                {/* Labels: DM Sans Regular 14/22 #4A7080 */}
                <p
                  className="font-normal"
                  style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}
                >
                  {patient.mrn}
                </p>
                {/* Values: DM Sans Medium 14/22 #0D2630 */}
                <p
                  className="font-medium"
                  style={{ fontSize: 14, lineHeight: '22px', color: '#0D2630' }}
                >
                  {patient.age} · {patient.gender}
                </p>
                <p
                  className="font-normal"
                  style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}
                >
                  DOB: {patient.dob}
                </p>
                <p
                  className="font-medium"
                  style={{ fontSize: 14, lineHeight: '22px', color: '#0D2630' }}
                >
                  BG: {patient.bloodGroup}
                </p>
                <p
                  className="col-span-2 font-normal"
                  style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}
                >
                  {patient.faculty} · {patient.level} · {patient.fileNumber}
                </p>
              </div>
            </div>
          </div>

          {/* ── Right: quick action buttons ────────────────────────────────── */}
          {/* Mobile: full-width col → Start full row, Prescribe+Lab share row */}
          {/* md+: row, right-aligned to the info block */}
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap md:w-auto md:flex-nowrap md:gap-[15px]">
            <PermissionGate permission={PERMISSIONS.ENCOUNTERS_WRITE}>
              {/* DM Sans SemiBold 16/24 white */}
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-[12px] px-4 font-semibold text-white transition-opacity hover:opacity-90 sm:w-auto sm:justify-start"
                style={{
                  fontFamily: 'inherit',
                  fontSize: 16,
                  lineHeight: '24px',
                  background: '#00B4D8',
                  height: 40,
                  minWidth: 198,
                  paddingTop: 8,
                  paddingBottom: 8,
                }}
              >
                <Activity style={{ width: 16, height: 16, flexShrink: 0 }} />
                Start Consultation
              </button>
            </PermissionGate>

            <div className="flex gap-3 sm:contents md:gap-[15px]">
              <PermissionGate permission={PERMISSIONS.PRESCRIPTIONS_WRITE}>
                {/* DM Sans SemiBold 16/24 #0D2630 — matches outlined button style */}
                <button
                  type="button"
                  className="flex flex-1 items-center justify-center gap-2 rounded-[12px] px-4 font-semibold whitespace-nowrap transition-colors hover:bg-[#E6F8FD] sm:flex-none"
                  style={{
                    fontFamily: 'inherit',
                    fontSize: 16,
                    lineHeight: '24px',
                    background: '#FFFFFF',
                    border: '1px solid #0064821F',
                    color: '#0D2630',
                    height: 42,
                    minWidth: 130,
                    paddingTop: 8,
                    paddingBottom: 8,
                  }}
                >
                  <FileText style={{ width: 16, height: 16, color: '#00B4D8', flexShrink: 0 }} />
                  Prescribe
                </button>
              </PermissionGate>

              <PermissionGate permission={PERMISSIONS.LAB_ORDERS_WRITE}>
                {/* DM Sans SemiBold 16/24 #0D2630 */}
                <button
                  type="button"
                  className="flex flex-1 items-center justify-center gap-2 rounded-[12px] px-4 font-semibold whitespace-nowrap transition-colors hover:bg-[#E6F8FD] sm:flex-none"
                  style={{
                    fontFamily: 'inherit',
                    fontSize: 16,
                    lineHeight: '24px',
                    background: '#FFFFFF',
                    border: '1px solid #0064821F',
                    color: '#0D2630',
                    height: 42,
                    minWidth: 148,
                    paddingTop: 8,
                    paddingBottom: 8,
                  }}
                >
                  <FlaskConical
                    style={{ width: 16, height: 16, color: '#00B4D8', flexShrink: 0 }}
                  />
                  Request Lab
                </button>
              </PermissionGate>
            </div>
          </div>
        </div>

        {/* ── Tab navigation ─────────────────────────────────────────────────
             Container: bg #FFFFFF, px-5 (20px), border-bottom #0064821F
             Labels: Outfit SemiBold 16/24
        ── */}
        <div className="overflow-x-auto bg-white" style={{ borderBottom: '1px solid #0064821F' }}>
          <div className="flex min-w-max px-5">
            {PATIENT_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className="font-display flex items-center gap-2 border-b-2 px-5 py-3.5 font-semibold whitespace-nowrap transition-colors"
                  style={{
                    fontSize: 16,
                    lineHeight: '24px',
                    borderBottomColor: isActive ? '#00B4D8' : 'transparent',
                    color: isActive ? '#00B4D8' : '#4A7080',
                  }}
                >
                  <Icon style={{ width: 16, height: 16 }} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Tab content ───────────────────────────────────────────────────── */}
        <div className="p-6">
          {activeTab === 'biodata' && (
            <div
              className="flex min-h-[160px] items-center justify-center rounded-[12px] text-sm"
              style={{ background: 'rgba(226,237,241,0.25)', color: '#4A7080' }}
            >
              Biodata section — coming next
            </div>
          )}
          {activeTab !== 'biodata' && (
            <div
              className="flex min-h-[160px] flex-col items-center justify-center gap-2 rounded-[12px]"
              style={{ background: 'rgba(226,237,241,0.25)' }}
            >
              <p className="text-sm font-medium" style={{ color: '#4A7080' }}>
                {PATIENT_TABS.find((t) => t.key === activeTab)?.label} — coming soon
              </p>
              <p className="text-sm" style={{ color: '#8A98A3' }}>
                This section will be built in an upcoming step
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom breathing room */}
      <div className="h-16" />
    </div>
  );
}
