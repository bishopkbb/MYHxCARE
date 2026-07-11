'use client';

import {
  Activity,
  AlertTriangle,
  ChevronLeft,
  ChevronsDown,
  Clock,
  Droplets,
  FileText,
  FlaskConical,
  Heart,
  History,
  Paperclip,
  Pill,
  RefreshCw,
  Scale,
  ShieldAlert,
  Stethoscope,
  Thermometer,
  TrendingUp,
  User,
  Users,
  Wind,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { use, useEffect, useRef, useState } from 'react';

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

type VitalCardConfig = {
  label: string;
  icon: LucideIcon;
  accentColor: string;
  thinBorderColor: string;
};

const VITAL_CARD_CONFIG: Record<string, VitalCardConfig> = {
  'blood-pressure': {
    label: 'Blood Pressure',
    icon: Activity,
    accentColor: '#3B82F6',
    thinBorderColor: 'rgba(59,130,246,0.2)',
  },
  'pulse-rate': {
    label: 'Pulse Rate',
    icon: Heart,
    accentColor: '#EF4444',
    thinBorderColor: 'rgba(239,68,68,0.2)',
  },
  temperature: {
    label: 'Temperature',
    icon: Thermometer,
    accentColor: '#EF4444',
    thinBorderColor: 'rgba(239,68,68,0.2)',
  },
  'resp-rate': {
    label: 'Resp. Rate',
    icon: Wind,
    accentColor: '#EF4444',
    thinBorderColor: 'rgba(239,68,68,0.2)',
  },
  spo2: {
    label: 'SpO2',
    icon: Droplets,
    accentColor: '#8B5CF6',
    thinBorderColor: 'rgba(139,92,246,0.2)',
  },
  weight: {
    label: 'Weight',
    icon: Scale,
    accentColor: '#475569',
    thinBorderColor: 'rgba(71,85,105,0.2)',
  },
  height: {
    label: 'Height',
    icon: TrendingUp,
    accentColor: '#475569',
    thinBorderColor: 'rgba(71,85,105,0.2)',
  },
  bmi: {
    label: 'BMI',
    icon: Users,
    accentColor: '#00B4D8',
    thinBorderColor: 'rgba(0,180,216,0.2)',
  },
};

// ── Page ───────────────────────────────────────────────────────────────────────

export default function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const patient = MOCK_PATIENT_DETAILS[id] ?? FALLBACK_PATIENT_DETAIL;
  const [activeTab, setActiveTab] = useState('biodata');

  // ── Biodata fetch simulation ────────────────────────────────────────────────
  type BiodataStatus = 'loading' | 'loaded' | 'empty' | 'error';
  const [biodataStatus, setBiodataStatus] = useState<BiodataStatus>('loading');
  const biodataLoadedRef = useRef(false);

  useEffect(() => {
    if (activeTab !== 'biodata') return;
    if (biodataLoadedRef.current) return;
    const t = setTimeout(() => {
      biodataLoadedRef.current = true;
      setBiodataStatus(patient.id === 'unknown' ? 'empty' : 'loaded');
    }, 900);
    return () => clearTimeout(t);
  }, [activeTab, patient.id]);

  function retryBiodata() {
    biodataLoadedRef.current = false;
    setBiodataStatus('loading');
    setTimeout(() => {
      biodataLoadedRef.current = true;
      setBiodataStatus(patient.id === 'unknown' ? 'empty' : 'loaded');
    }, 900);
  }

  // ── Medical History fetch simulation ─────────────────────────────────────────
  type MedHistStatus = 'loading' | 'loaded' | 'empty' | 'error';
  const [medHistStatus, setMedHistStatus] = useState<MedHistStatus>('loading');
  const medHistLoadedRef = useRef(false);

  useEffect(() => {
    if (activeTab !== 'medical-history') return;
    if (medHistLoadedRef.current) return;
    const t = setTimeout(() => {
      medHistLoadedRef.current = true;
      setMedHistStatus(patient.id === 'unknown' ? 'empty' : 'loaded');
    }, 900);
    return () => clearTimeout(t);
  }, [activeTab, patient.id]);

  function retryMedHist() {
    medHistLoadedRef.current = false;
    setMedHistStatus('loading');
    setTimeout(() => {
      medHistLoadedRef.current = true;
      setMedHistStatus(patient.id === 'unknown' ? 'empty' : 'loaded');
    }, 900);
  }

  const [openSections, setOpenSections] = useState({
    pastDiagnoses: true,
    familyHistory: true,
    immunizationHistory: true,
    surgicalHistory: true,
    chronicConditions: true,
    allergiesHistory: true,
  });

  function toggleSection(key: keyof typeof openSections) {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const medSeverityStyles = {
    Severe: { color: '#EF4444', border: '1px solid #EF4444' },
    Moderate: { color: '#F59E0B', border: '1px solid #F59E0B' },
    Mild: { color: '#22C55E', border: '1px solid #22C55E' },
  } as const;

  // ── Allergies fetch simulation ────────────────────────────────────────────────
  type AllergiesStatus = 'loading' | 'loaded' | 'empty' | 'error';
  const [allergiesStatus, setAllergiesStatus] = useState<AllergiesStatus>('loading');
  const allergiesLoadedRef = useRef(false);

  useEffect(() => {
    if (activeTab !== 'allergies') return;
    if (allergiesLoadedRef.current) return;
    const t = setTimeout(() => {
      allergiesLoadedRef.current = true;
      setAllergiesStatus(patient.id === 'unknown' ? 'empty' : 'loaded');
    }, 900);
    return () => clearTimeout(t);
  }, [activeTab, patient.id]);

  function retryAllergies() {
    allergiesLoadedRef.current = false;
    setAllergiesStatus('loading');
    setTimeout(() => {
      allergiesLoadedRef.current = true;
      setAllergiesStatus(patient.id === 'unknown' ? 'empty' : 'loaded');
    }, 900);
  }

  // ── Vital Signs fetch simulation ──────────────────────────────────────────────
  type VitalsStatus = 'loading' | 'loaded' | 'empty' | 'error';
  const [vitalsStatus, setVitalsStatus] = useState<VitalsStatus>('loading');
  const vitalsLoadedRef = useRef(false);

  useEffect(() => {
    if (activeTab !== 'vital-signs') return;
    if (vitalsLoadedRef.current) return;
    const t = setTimeout(() => {
      vitalsLoadedRef.current = true;
      setVitalsStatus(patient.id === 'unknown' ? 'empty' : 'loaded');
    }, 900);
    return () => clearTimeout(t);
  }, [activeTab, patient.id]);

  function retryVitals() {
    vitalsLoadedRef.current = false;
    setVitalsStatus('loading');
    setTimeout(() => {
      vitalsLoadedRef.current = true;
      setVitalsStatus(patient.id === 'unknown' ? 'empty' : 'loaded');
    }, 900);
  }

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
        <div className="p-5 sm:p-6">
          {activeTab === 'biodata' && (
            <>
              {/* ── Loading skeleton ─────────────────────────────────────────── */}
              {biodataStatus === 'loading' && (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {/* Personal Information skeleton */}
                  <div
                    className="animate-pulse rounded-[12px] bg-white p-4"
                    style={{ border: '1px solid #0064821F' }}
                  >
                    <div className="pb-2" style={{ borderBottom: '1px solid #0064821F' }}>
                      <div className="h-7 w-44 rounded-md bg-slate-100" />
                    </div>
                    <div className="space-y-3 pt-3">
                      {[
                        ['w-20', 'w-36'],
                        ['w-24', 'w-28'],
                        ['w-8', 'w-16'],
                        ['w-14', 'w-14'],
                        ['w-20', 'w-10'],
                        ['w-14', 'w-40'],
                      ].map(([lw, vw], i) => (
                        <div key={i} className="flex items-center justify-between gap-6">
                          <div className={`h-6 ${lw} rounded-md bg-slate-100`} />
                          <div className={`h-6 ${vw} rounded-md bg-slate-100`} />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Academic & Contact skeleton */}
                  <div
                    className="animate-pulse rounded-[12px] bg-white p-4"
                    style={{ border: '1px solid #0064821F' }}
                  >
                    <div className="pb-2" style={{ borderBottom: '1px solid #0064821F' }}>
                      <div className="h-7 w-52 rounded-md bg-slate-100" />
                    </div>
                    <div className="space-y-3 pt-3">
                      {[
                        ['w-16', 'w-32'],
                        ['w-12', 'w-36'],
                        ['w-10', 'w-10'],
                        ['w-10', 'w-28'],
                        ['w-10', 'w-40'],
                      ].map(([lw, vw], i) => (
                        <div key={i} className="flex items-center justify-between gap-6">
                          <div className={`h-6 ${lw} rounded-md bg-slate-100`} />
                          <div className={`h-6 ${vw} rounded-md bg-slate-100`} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Error state ──────────────────────────────────────────────── */}
              {biodataStatus === 'error' && (
                <div
                  className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-[12px] py-12 text-center"
                  style={{
                    background: 'rgba(239,68,68,0.03)',
                    border: '1px solid rgba(239,68,68,0.12)',
                  }}
                >
                  <div
                    className="flex size-12 items-center justify-center rounded-full"
                    style={{ background: 'rgba(239,68,68,0.08)' }}
                  >
                    <AlertTriangle style={{ width: 22, height: 22, color: '#EF4444' }} />
                  </div>
                  <div>
                    <p className="text-base leading-6 font-medium" style={{ color: '#4A7080' }}>
                      Could not load biodata
                    </p>
                    <p className="mt-0.5 text-sm leading-5" style={{ color: '#8A98A3' }}>
                      An error occurred while fetching patient details
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={retryBiodata}
                    className="mt-1 flex items-center gap-2 rounded-[8px] px-4 py-2 text-sm font-medium transition-opacity hover:opacity-80"
                    style={{ background: '#E2EDF1', color: '#25464D' }}
                  >
                    <RefreshCw style={{ width: 14, height: 14 }} />
                    Try again
                  </button>
                </div>
              )}

              {/* ── Empty state ───────────────────────────────────────────────── */}
              {biodataStatus === 'empty' && (
                <div
                  className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-[12px] py-12 text-center"
                  style={{ background: 'rgba(226,237,241,0.25)' }}
                >
                  <div
                    className="flex size-12 items-center justify-center rounded-full"
                    style={{ background: 'rgba(226,237,241,0.6)' }}
                  >
                    <User style={{ width: 22, height: 22, color: '#8A98A3' }} />
                  </div>
                  <div>
                    <p className="text-base leading-6 font-medium" style={{ color: '#4A7080' }}>
                      No biodata on record
                    </p>
                    <p className="mt-0.5 text-sm leading-5" style={{ color: '#8A98A3' }}>
                      Patient details have not been entered yet
                    </p>
                  </div>
                </div>
              )}

              {/* ── Loaded: two-card grid ─────────────────────────────────────── */}
              {biodataStatus === 'loaded' && (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {/* Personal Information */}
                  <div
                    className="rounded-[12px] bg-white p-4"
                    style={{ border: '1px solid #0064821F' }}
                  >
                    <div className="pb-2" style={{ borderBottom: '1px solid #0064821F' }}>
                      <h3
                        className="font-display font-semibold"
                        style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
                      >
                        Personal Information
                      </h3>
                    </div>
                    <dl className="space-y-3 pt-3">
                      {(
                        [
                          { label: 'Full Name', value: patient.name },
                          { label: 'Date of Birth', value: patient.dob },
                          { label: 'Age', value: patient.age },
                          { label: 'Gender', value: patient.gender },
                          { label: 'Blood Group', value: patient.bloodGroup },
                          { label: 'Address', value: patient.address },
                        ] as { label: string; value: string }[]
                      ).map(({ label, value }) => (
                        <div key={label} className="flex items-start justify-between gap-6">
                          <dt
                            className="shrink-0 font-normal"
                            style={{ fontSize: 16, lineHeight: '24px', color: '#25464D' }}
                          >
                            {label}
                          </dt>
                          <dd
                            className="m-0 text-right font-normal"
                            style={{ fontSize: 16, lineHeight: '24px', color: '#0D2630' }}
                          >
                            {value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>

                  {/* Academic & Contact Details */}
                  <div
                    className="rounded-[12px] bg-white p-4"
                    style={{ border: '1px solid #0064821F' }}
                  >
                    <div className="pb-2" style={{ borderBottom: '1px solid #0064821F' }}>
                      <h3
                        className="font-display font-semibold"
                        style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
                      >
                        Academic & Contact Details
                      </h3>
                    </div>
                    <dl className="space-y-3 pt-3">
                      {(
                        [
                          { label: 'Student ID', value: patient.fileNumber },
                          { label: 'Faculty', value: patient.faculty },
                          { label: 'Level', value: patient.level },
                          { label: 'Phone', value: patient.phone },
                          { label: 'Email', value: patient.email },
                        ] as { label: string; value: string }[]
                      ).map(({ label, value }) => (
                        <div key={label} className="flex items-start justify-between gap-6">
                          <dt
                            className="shrink-0 font-normal"
                            style={{ fontSize: 16, lineHeight: '24px', color: '#25464D' }}
                          >
                            {label}
                          </dt>
                          <dd
                            className="m-0 text-right font-normal"
                            style={{ fontSize: 16, lineHeight: '24px', color: '#0D2630' }}
                          >
                            {value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </div>
              )}
            </>
          )}
          {activeTab === 'medical-history' && (
            <>
              {/* ── Loading skeleton ─────────────────────────────────────────── */}
              {medHistStatus === 'loading' && (
                <div className="grid grid-cols-1 gap-7 lg:grid-cols-2">
                  <div className="flex flex-col gap-7">
                    {/* Past Diagnoses skeleton */}
                    <div
                      className="animate-pulse overflow-hidden rounded-[12px] bg-white"
                      style={{ border: '1px solid rgba(37,70,77,0.15)' }}
                    >
                      <div
                        className="flex items-center justify-between px-4 py-2"
                        style={{ borderBottom: '1px solid rgba(37,70,77,0.1)' }}
                      >
                        <div className="h-6 w-36 rounded-md bg-slate-100" />
                        <div className="size-6 rounded-md bg-slate-100" />
                      </div>
                      <div
                        className="flex items-center gap-4 px-4 py-[5px]"
                        style={{ background: 'rgba(230,248,253,0.6)' }}
                      >
                        <div className="h-4 w-28 rounded-sm bg-slate-200" />
                        <div className="h-4 w-24 rounded-sm bg-slate-200" />
                        <div className="ml-auto h-4 w-14 rounded-sm bg-slate-200" />
                      </div>
                      {[
                        ['w-40', 'w-20', 'w-14'],
                        ['w-24', 'w-20', 'w-16'],
                        ['w-32', 'w-20', 'w-16'],
                        ['w-36', 'w-20', 'w-14'],
                        ['w-28', 'w-20', 'w-16'],
                      ].map(([c1, c2, c3], i) => (
                        <div
                          key={i}
                          className="flex items-center gap-4 px-4 py-[4px]"
                          style={{ borderBottom: '1px solid rgba(37,70,77,0.08)' }}
                        >
                          <div className={`h-[22px] ${c1} rounded-sm bg-slate-100`} />
                          <div className={`h-[22px] ${c2} rounded-sm bg-slate-100`} />
                          <div className={`ml-auto h-[22px] ${c3} rounded-sm bg-slate-100`} />
                        </div>
                      ))}
                    </div>
                    {/* Family History skeleton */}
                    <div
                      className="animate-pulse overflow-hidden rounded-[12px] bg-white"
                      style={{ border: '1px solid rgba(37,70,77,0.15)' }}
                    >
                      <div
                        className="flex items-center justify-between px-4 py-2"
                        style={{ borderBottom: '1px solid rgba(37,70,77,0.1)' }}
                      >
                        <div className="h-6 w-32 rounded-md bg-slate-100" />
                        <div className="size-6 rounded-md bg-slate-100" />
                      </div>
                      <div
                        className="flex items-center gap-4 px-4 py-[5px]"
                        style={{ background: 'rgba(230,248,253,0.6)' }}
                      >
                        <div className="h-4 w-24 rounded-sm bg-slate-200" />
                        <div className="h-4 w-28 rounded-sm bg-slate-200" />
                        <div className="ml-auto h-4 w-16 rounded-sm bg-slate-200" />
                      </div>
                      {[
                        ['w-28', 'w-16', 'w-24'],
                        ['w-32', 'w-20', 'w-24'],
                        ['w-20', 'w-28', 'w-16'],
                      ].map(([c1, c2, c3], i) => (
                        <div
                          key={i}
                          className="flex items-center gap-4 px-4 py-[4px]"
                          style={{ borderBottom: '1px solid rgba(37,70,77,0.08)' }}
                        >
                          <div className={`h-[22px] ${c1} rounded-sm bg-slate-100`} />
                          <div className={`h-[22px] ${c2} rounded-sm bg-slate-100`} />
                          <div className={`ml-auto h-[22px] ${c3} rounded-sm bg-slate-100`} />
                        </div>
                      ))}
                    </div>
                    {/* Immunization History skeleton */}
                    <div
                      className="animate-pulse overflow-hidden rounded-[12px] bg-white"
                      style={{ border: '1px solid rgba(37,70,77,0.15)' }}
                    >
                      <div
                        className="flex items-center justify-between px-4 py-2"
                        style={{ borderBottom: '1px solid rgba(37,70,77,0.1)' }}
                      >
                        <div className="h-6 w-44 rounded-md bg-slate-100" />
                        <div className="size-6 rounded-md bg-slate-100" />
                      </div>
                      <div
                        className="flex items-center gap-4 px-4 py-[5px]"
                        style={{ background: 'rgba(230,248,253,0.6)' }}
                      >
                        <div className="h-4 w-20 rounded-sm bg-slate-200" />
                        <div className="h-4 w-32 rounded-sm bg-slate-200" />
                        <div className="ml-auto h-4 w-20 rounded-sm bg-slate-200" />
                      </div>
                      {[
                        ['w-36', 'w-24', 'w-24'],
                        ['w-24', 'w-24', 'w-24'],
                        ['w-28', 'w-24', 'w-24'],
                        ['w-24', 'w-24', 'w-16'],
                        ['w-32', 'w-24', 'w-20'],
                      ].map(([c1, c2, c3], i) => (
                        <div
                          key={i}
                          className="flex items-center gap-4 px-4 py-[4px]"
                          style={{ borderBottom: '1px solid rgba(37,70,77,0.08)' }}
                        >
                          <div className={`h-[22px] ${c1} rounded-sm bg-slate-100`} />
                          <div className={`h-[22px] ${c2} rounded-sm bg-slate-100`} />
                          <div className={`ml-auto h-[22px] ${c3} rounded-sm bg-slate-100`} />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-7">
                    {/* Surgical History skeleton */}
                    <div
                      className="animate-pulse overflow-hidden rounded-[12px] bg-white"
                      style={{ border: '1px solid rgba(37,70,77,0.15)' }}
                    >
                      <div
                        className="flex items-center justify-between px-4 py-2"
                        style={{ borderBottom: '1px solid rgba(37,70,77,0.1)' }}
                      >
                        <div className="h-6 w-36 rounded-md bg-slate-100" />
                        <div className="size-6 rounded-md bg-slate-100" />
                      </div>
                      <div
                        className="flex items-center gap-4 px-4 py-[5px]"
                        style={{ background: 'rgba(230,248,253,0.6)' }}
                      >
                        <div className="h-4 w-32 rounded-sm bg-slate-200" />
                        <div className="h-4 w-16 rounded-sm bg-slate-200" />
                        <div className="ml-auto h-4 w-20 rounded-sm bg-slate-200" />
                      </div>
                      <div
                        className="flex items-center gap-4 px-4 py-[4px]"
                        style={{ borderBottom: '1px solid rgba(37,70,77,0.08)' }}
                      >
                        <div className="h-[22px] w-40 rounded-sm bg-slate-100" />
                        <div className="h-[22px] w-20 rounded-sm bg-slate-100" />
                        <div className="ml-auto h-[22px] w-20 rounded-sm bg-slate-100" />
                      </div>
                    </div>
                    {/* Chronic Conditions skeleton */}
                    <div
                      className="animate-pulse overflow-hidden rounded-[12px] bg-white"
                      style={{ border: '1px solid rgba(37,70,77,0.15)' }}
                    >
                      <div
                        className="flex items-center justify-between px-4 py-2"
                        style={{ borderBottom: '1px solid rgba(37,70,77,0.1)' }}
                      >
                        <div className="h-6 w-40 rounded-md bg-slate-100" />
                        <div className="size-6 rounded-md bg-slate-100" />
                      </div>
                      <div
                        className="flex items-center gap-4 px-4 py-[5px]"
                        style={{ background: 'rgba(230,248,253,0.6)' }}
                      >
                        <div className="h-4 w-28 rounded-sm bg-slate-200" />
                        <div className="h-4 w-16 rounded-sm bg-slate-200" />
                        <div className="ml-auto h-4 w-16 rounded-sm bg-slate-200" />
                      </div>
                      <div
                        className="flex items-center gap-4 px-4 py-[4px]"
                        style={{ borderBottom: '1px solid rgba(37,70,77,0.08)' }}
                      >
                        <div className="h-[22px] w-44 rounded-sm bg-slate-100" />
                        <div className="h-[22px] w-16 rounded-sm bg-slate-100" />
                        <div className="ml-auto h-[22px] w-16 rounded-sm bg-slate-100" />
                      </div>
                    </div>
                    {/* Allergies History skeleton — 4 cols */}
                    <div
                      className="animate-pulse overflow-hidden rounded-[12px] bg-white"
                      style={{ border: '1px solid rgba(37,70,77,0.15)' }}
                    >
                      <div
                        className="flex items-center justify-between px-4 py-2"
                        style={{ borderBottom: '1px solid rgba(37,70,77,0.1)' }}
                      >
                        <div className="h-6 w-40 rounded-md bg-slate-100" />
                        <div className="size-6 rounded-md bg-slate-100" />
                      </div>
                      <div
                        className="flex items-center gap-4 px-4 py-[5px]"
                        style={{ background: 'rgba(230,248,253,0.6)' }}
                      >
                        <div className="h-4 w-20 rounded-sm bg-slate-200" />
                        <div className="h-4 w-24 rounded-sm bg-slate-200" />
                        <div className="h-4 w-16 rounded-sm bg-slate-200" />
                        <div className="ml-auto h-4 w-20 rounded-sm bg-slate-200" />
                      </div>
                      {[
                        ['w-20', 'w-28', 'w-14', 'w-24'],
                        ['w-24', 'w-24', 'w-20', 'w-24'],
                        ['w-16', 'w-24', 'w-10', 'w-24'],
                      ].map(([c1, c2, c3, c4], i) => (
                        <div
                          key={i}
                          className="flex items-center gap-4 px-4 py-[4px]"
                          style={{ borderBottom: '1px solid rgba(37,70,77,0.08)' }}
                        >
                          <div className={`h-[22px] ${c1} rounded-sm bg-slate-100`} />
                          <div className={`h-[22px] ${c2} rounded-sm bg-slate-100`} />
                          <div className={`h-[22px] ${c3} rounded-sm bg-slate-100`} />
                          <div className={`ml-auto h-[22px] ${c4} rounded-sm bg-slate-100`} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Error state ───────────────────────────────────────────────── */}
              {medHistStatus === 'error' && (
                <div
                  className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-[12px] py-12 text-center"
                  style={{
                    background: 'rgba(239,68,68,0.03)',
                    border: '1px solid rgba(239,68,68,0.12)',
                  }}
                >
                  <div
                    className="flex size-12 items-center justify-center rounded-full"
                    style={{ background: 'rgba(239,68,68,0.08)' }}
                  >
                    <AlertTriangle style={{ width: 22, height: 22, color: '#EF4444' }} />
                  </div>
                  <div>
                    <p className="text-base leading-6 font-medium" style={{ color: '#4A7080' }}>
                      Could not load medical history
                    </p>
                    <p className="mt-0.5 text-sm leading-5" style={{ color: '#8A98A3' }}>
                      An error occurred while fetching this patient&apos;s medical history
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={retryMedHist}
                    className="mt-1 flex items-center gap-2 rounded-[8px] px-4 py-2 text-sm font-medium transition-opacity hover:opacity-80"
                    style={{ background: '#E2EDF1', color: '#25464D' }}
                  >
                    <RefreshCw style={{ width: 14, height: 14 }} />
                    Try again
                  </button>
                </div>
              )}

              {/* ── Empty state ────────────────────────────────────────────────── */}
              {medHistStatus === 'empty' && (
                <div
                  className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-[12px] py-12 text-center"
                  style={{ background: 'rgba(226,237,241,0.25)' }}
                >
                  <div
                    className="flex size-12 items-center justify-center rounded-full"
                    style={{ background: 'rgba(226,237,241,0.6)' }}
                  >
                    <History style={{ width: 22, height: 22, color: '#8A98A3' }} />
                  </div>
                  <div>
                    <p className="text-base leading-6 font-medium" style={{ color: '#4A7080' }}>
                      No medical history on record
                    </p>
                    <p className="mt-0.5 text-sm leading-5" style={{ color: '#8A98A3' }}>
                      This patient&apos;s medical history has not been entered yet
                    </p>
                  </div>
                </div>
              )}

              {/* ── Loaded ─────────────────────────────────────────────────────── */}
              {medHistStatus === 'loaded' && (
                <div className="grid grid-cols-1 gap-7 lg:grid-cols-2">
                  {/* Left column */}
                  <div className="flex flex-col gap-7">
                    {/* Past Diagnoses */}
                    <div
                      className="rounded-[12px] bg-white"
                      style={{ border: '1px solid rgba(37,70,77,0.2)' }}
                    >
                      <button
                        type="button"
                        onClick={() => toggleSection('pastDiagnoses')}
                        aria-expanded={openSections.pastDiagnoses}
                        className="flex w-full items-center justify-between px-4 py-2"
                        style={{ borderBottom: '1px solid rgba(37,70,77,0.2)' }}
                      >
                        <h4
                          className="font-semibold"
                          style={{ fontSize: 16, lineHeight: '24px', color: '#000000' }}
                        >
                          Past Diagnoses
                        </h4>
                        <ChevronsDown
                          style={{
                            width: 24,
                            height: 24,
                            color: '#00B4D8',
                            flexShrink: 0,
                            transform: openSections.pastDiagnoses ? undefined : 'rotate(180deg)',
                            transition: 'transform 0.2s ease',
                          }}
                        />
                      </button>
                      {openSections.pastDiagnoses && (
                        <div className="overflow-x-auto">
                          <div className="min-w-[360px]">
                            <div
                              className="flex items-center px-4 py-[5px]"
                              style={{ background: '#E6F8FD' }}
                            >
                              <span
                                className="w-[55%] font-medium uppercase"
                                style={{ fontSize: 14, lineHeight: '22px', color: '#25464D' }}
                              >
                                Condition / Diagnosis
                              </span>
                              <span
                                className="w-[25%] font-medium uppercase"
                                style={{ fontSize: 14, lineHeight: '22px', color: '#25464D' }}
                              >
                                Date Diagnosed
                              </span>
                              <span
                                className="w-[20%] text-right font-medium uppercase"
                                style={{ fontSize: 14, lineHeight: '22px', color: '#25464D' }}
                              >
                                Status
                              </span>
                            </div>
                            {patient.medicalHistory.pastDiagnoses.length === 0 ? (
                              <div
                                className="flex items-center px-4 py-[5px]"
                                style={{ borderBottom: '1px solid rgba(37,70,77,0.2)' }}
                              >
                                <span
                                  className="w-[55%]"
                                  style={{ fontSize: 14, lineHeight: '22px', color: '#2F3A40' }}
                                >
                                  No diagnoses recorded
                                </span>
                                <span
                                  className="w-[25%]"
                                  style={{ fontSize: 14, lineHeight: '22px', color: '#2F3A40' }}
                                >
                                  –
                                </span>
                                <span
                                  className="w-[20%] text-right"
                                  style={{ fontSize: 14, lineHeight: '22px', color: '#2F3A40' }}
                                >
                                  –
                                </span>
                              </div>
                            ) : (
                              patient.medicalHistory.pastDiagnoses.map((row, i) => (
                                <div
                                  key={i}
                                  className="flex items-center px-4 py-[5px]"
                                  style={{ borderBottom: '1px solid rgba(37,70,77,0.2)' }}
                                >
                                  <span
                                    className="w-[55%]"
                                    style={{ fontSize: 14, lineHeight: '22px', color: '#2F3A40' }}
                                  >
                                    {row.condition}
                                  </span>
                                  <span
                                    className="w-[25%]"
                                    style={{ fontSize: 14, lineHeight: '22px', color: '#2F3A40' }}
                                  >
                                    {row.dateDiagnosed}
                                  </span>
                                  <span
                                    className="w-[20%] text-right font-medium"
                                    style={{
                                      fontSize: 14,
                                      lineHeight: '22px',
                                      color: row.status === 'Active' ? '#22C55E' : '#2F3A40',
                                    }}
                                  >
                                    {row.status}
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Family History */}
                    <div
                      className="rounded-[12px] bg-white"
                      style={{ border: '1px solid rgba(37,70,77,0.2)' }}
                    >
                      <button
                        type="button"
                        onClick={() => toggleSection('familyHistory')}
                        aria-expanded={openSections.familyHistory}
                        className="flex w-full items-center justify-between px-4 py-2"
                        style={{ borderBottom: '1px solid rgba(37,70,77,0.2)' }}
                      >
                        <h4
                          className="font-semibold"
                          style={{ fontSize: 16, lineHeight: '24px', color: '#000000' }}
                        >
                          Family History
                        </h4>
                        <ChevronsDown
                          style={{
                            width: 24,
                            height: 24,
                            color: '#00B4D8',
                            flexShrink: 0,
                            transform: openSections.familyHistory ? undefined : 'rotate(180deg)',
                            transition: 'transform 0.2s ease',
                          }}
                        />
                      </button>
                      {openSections.familyHistory && (
                        <div className="overflow-x-auto">
                          <div className="min-w-[360px]">
                            <div
                              className="flex items-center px-4 py-[5px]"
                              style={{ background: '#E6F8FD' }}
                            >
                              <span
                                className="w-[40%] font-medium uppercase"
                                style={{ fontSize: 14, lineHeight: '22px', color: '#25464D' }}
                              >
                                Condition
                              </span>
                              <span
                                className="w-[30%] font-medium uppercase"
                                style={{ fontSize: 14, lineHeight: '22px', color: '#25464D' }}
                              >
                                Relationship
                              </span>
                              <span
                                className="w-[30%] text-right font-medium uppercase"
                                style={{ fontSize: 14, lineHeight: '22px', color: '#25464D' }}
                              >
                                Notes
                              </span>
                            </div>
                            {patient.medicalHistory.familyHistory.length === 0 ? (
                              <div
                                className="flex items-center px-4 py-[5px]"
                                style={{ borderBottom: '1px solid rgba(37,70,77,0.2)' }}
                              >
                                <span
                                  className="w-[40%]"
                                  style={{ fontSize: 14, lineHeight: '22px', color: '#2F3A40' }}
                                >
                                  No family history recorded
                                </span>
                                <span
                                  className="w-[30%]"
                                  style={{ fontSize: 14, lineHeight: '22px', color: '#2F3A40' }}
                                >
                                  –
                                </span>
                                <span
                                  className="w-[30%] text-right"
                                  style={{ fontSize: 14, lineHeight: '22px', color: '#2F3A40' }}
                                >
                                  –
                                </span>
                              </div>
                            ) : (
                              patient.medicalHistory.familyHistory.map((row, i) => (
                                <div
                                  key={i}
                                  className="flex items-center px-4 py-[5px]"
                                  style={{ borderBottom: '1px solid rgba(37,70,77,0.2)' }}
                                >
                                  <span
                                    className="w-[40%]"
                                    style={{ fontSize: 14, lineHeight: '22px', color: '#2F3A40' }}
                                  >
                                    {row.condition}
                                  </span>
                                  <span
                                    className="w-[30%]"
                                    style={{ fontSize: 14, lineHeight: '22px', color: '#2F3A40' }}
                                  >
                                    {row.relationship}
                                  </span>
                                  <span
                                    className="w-[30%] text-right"
                                    style={{ fontSize: 14, lineHeight: '22px', color: '#2F3A40' }}
                                  >
                                    {row.notes}
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Immunization History */}
                    <div
                      className="rounded-[12px] bg-white"
                      style={{ border: '1px solid rgba(37,70,77,0.2)' }}
                    >
                      <button
                        type="button"
                        onClick={() => toggleSection('immunizationHistory')}
                        aria-expanded={openSections.immunizationHistory}
                        className="flex w-full items-center justify-between px-4 py-2"
                        style={{ borderBottom: '1px solid rgba(37,70,77,0.2)' }}
                      >
                        <h4
                          className="font-semibold"
                          style={{ fontSize: 16, lineHeight: '24px', color: '#000000' }}
                        >
                          Immunization History
                        </h4>
                        <ChevronsDown
                          style={{
                            width: 24,
                            height: 24,
                            color: '#00B4D8',
                            flexShrink: 0,
                            transform: openSections.immunizationHistory
                              ? undefined
                              : 'rotate(180deg)',
                            transition: 'transform 0.2s ease',
                          }}
                        />
                      </button>
                      {openSections.immunizationHistory && (
                        <div className="overflow-x-auto">
                          <div className="min-w-[360px]">
                            <div
                              className="flex items-center px-4 py-[5px]"
                              style={{ background: '#E6F8FD' }}
                            >
                              <span
                                className="w-[40%] font-medium uppercase"
                                style={{ fontSize: 14, lineHeight: '22px', color: '#25464D' }}
                              >
                                Vaccine
                              </span>
                              <span
                                className="w-[35%] font-medium uppercase"
                                style={{ fontSize: 14, lineHeight: '22px', color: '#25464D' }}
                              >
                                Date Administered
                              </span>
                              <span
                                className="w-[25%] text-right font-medium uppercase"
                                style={{ fontSize: 14, lineHeight: '22px', color: '#25464D' }}
                              >
                                Next Due
                              </span>
                            </div>
                            {patient.medicalHistory.immunizationHistory.length === 0 ? (
                              <div
                                className="flex items-center px-4 py-[5px]"
                                style={{ borderBottom: '1px solid rgba(37,70,77,0.2)' }}
                              >
                                <span
                                  className="w-[40%]"
                                  style={{ fontSize: 14, lineHeight: '22px', color: '#2F3A40' }}
                                >
                                  No immunization records
                                </span>
                                <span
                                  className="w-[35%]"
                                  style={{ fontSize: 14, lineHeight: '22px', color: '#2F3A40' }}
                                >
                                  –
                                </span>
                                <span
                                  className="w-[25%] text-right"
                                  style={{ fontSize: 14, lineHeight: '22px', color: '#2F3A40' }}
                                >
                                  –
                                </span>
                              </div>
                            ) : (
                              patient.medicalHistory.immunizationHistory.map((row, i) => (
                                <div
                                  key={i}
                                  className="flex items-center px-4 py-[5px]"
                                  style={{ borderBottom: '1px solid rgba(37,70,77,0.2)' }}
                                >
                                  <span
                                    className="w-[40%]"
                                    style={{ fontSize: 14, lineHeight: '22px', color: '#2F3A40' }}
                                  >
                                    {row.vaccine}
                                  </span>
                                  <span
                                    className="w-[35%]"
                                    style={{ fontSize: 14, lineHeight: '22px', color: '#2F3A40' }}
                                  >
                                    {row.dateAdministered}
                                  </span>
                                  <span
                                    className="w-[25%] text-right"
                                    style={{ fontSize: 14, lineHeight: '22px', color: '#2F3A40' }}
                                  >
                                    {row.nextDue ?? '–'}
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right column */}
                  <div className="flex flex-col gap-7">
                    {/* Surgical History */}
                    <div
                      className="rounded-[12px] bg-white"
                      style={{ border: '1px solid rgba(37,70,77,0.2)' }}
                    >
                      <button
                        type="button"
                        onClick={() => toggleSection('surgicalHistory')}
                        aria-expanded={openSections.surgicalHistory}
                        className="flex w-full items-center justify-between px-4 py-2"
                        style={{ borderBottom: '1px solid rgba(37,70,77,0.2)' }}
                      >
                        <h4
                          className="font-semibold"
                          style={{ fontSize: 16, lineHeight: '24px', color: '#000000' }}
                        >
                          Surgical History
                        </h4>
                        <ChevronsDown
                          style={{
                            width: 24,
                            height: 24,
                            color: '#00B4D8',
                            flexShrink: 0,
                            transform: openSections.surgicalHistory ? undefined : 'rotate(180deg)',
                            transition: 'transform 0.2s ease',
                          }}
                        />
                      </button>
                      {openSections.surgicalHistory && (
                        <div className="overflow-x-auto">
                          <div className="min-w-[360px]">
                            <div
                              className="flex items-center px-4 py-[5px]"
                              style={{ background: '#E6F8FD' }}
                            >
                              <span
                                className="w-[50%] font-medium uppercase"
                                style={{ fontSize: 14, lineHeight: '22px', color: '#25464D' }}
                              >
                                Surgery / Procedure
                              </span>
                              <span
                                className="w-[25%] font-medium uppercase"
                                style={{ fontSize: 14, lineHeight: '22px', color: '#25464D' }}
                              >
                                Date
                              </span>
                              <span
                                className="w-[25%] text-right font-medium uppercase"
                                style={{ fontSize: 14, lineHeight: '22px', color: '#25464D' }}
                              >
                                Hospital
                              </span>
                            </div>
                            {patient.medicalHistory.surgicalHistory.length === 0 ? (
                              <div
                                className="flex items-center px-4 py-[5px]"
                                style={{ borderBottom: '1px solid rgba(37,70,77,0.2)' }}
                              >
                                <span
                                  className="w-[50%]"
                                  style={{ fontSize: 14, lineHeight: '22px', color: '#2F3A40' }}
                                >
                                  No surgical history recorded
                                </span>
                                <span
                                  className="w-[25%]"
                                  style={{ fontSize: 14, lineHeight: '22px', color: '#2F3A40' }}
                                >
                                  –
                                </span>
                                <span
                                  className="w-[25%] text-right"
                                  style={{ fontSize: 14, lineHeight: '22px', color: '#2F3A40' }}
                                >
                                  –
                                </span>
                              </div>
                            ) : (
                              patient.medicalHistory.surgicalHistory.map((row, i) => (
                                <div
                                  key={i}
                                  className="flex items-center px-4 py-[5px]"
                                  style={{ borderBottom: '1px solid rgba(37,70,77,0.2)' }}
                                >
                                  <span
                                    className="w-[50%]"
                                    style={{ fontSize: 14, lineHeight: '22px', color: '#2F3A40' }}
                                  >
                                    {row.procedure}
                                  </span>
                                  <span
                                    className="w-[25%]"
                                    style={{ fontSize: 14, lineHeight: '22px', color: '#2F3A40' }}
                                  >
                                    {row.date}
                                  </span>
                                  <span
                                    className="w-[25%] text-right"
                                    style={{ fontSize: 14, lineHeight: '22px', color: '#2F3A40' }}
                                  >
                                    {row.hospital}
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Chronic Conditions */}
                    <div
                      className="rounded-[12px] bg-white"
                      style={{ border: '1px solid rgba(37,70,77,0.2)' }}
                    >
                      <button
                        type="button"
                        onClick={() => toggleSection('chronicConditions')}
                        aria-expanded={openSections.chronicConditions}
                        className="flex w-full items-center justify-between px-4 py-2"
                        style={{ borderBottom: '1px solid rgba(37,70,77,0.2)' }}
                      >
                        <h4
                          className="font-semibold"
                          style={{ fontSize: 16, lineHeight: '24px', color: '#000000' }}
                        >
                          Chronic Conditions
                        </h4>
                        <ChevronsDown
                          style={{
                            width: 24,
                            height: 24,
                            color: '#00B4D8',
                            flexShrink: 0,
                            transform: openSections.chronicConditions
                              ? undefined
                              : 'rotate(180deg)',
                            transition: 'transform 0.2s ease',
                          }}
                        />
                      </button>
                      {openSections.chronicConditions && (
                        <div className="overflow-x-auto">
                          <div className="min-w-[360px]">
                            <div
                              className="flex items-center px-4 py-[5px]"
                              style={{ background: '#E6F8FD' }}
                            >
                              <span
                                className="w-[55%] font-medium uppercase"
                                style={{ fontSize: 14, lineHeight: '22px', color: '#25464D' }}
                              >
                                Condition
                              </span>
                              <span
                                className="w-[20%] font-medium uppercase"
                                style={{ fontSize: 14, lineHeight: '22px', color: '#25464D' }}
                              >
                                Date
                              </span>
                              <span
                                className="w-[25%] text-right font-medium uppercase"
                                style={{ fontSize: 14, lineHeight: '22px', color: '#25464D' }}
                              >
                                Status
                              </span>
                            </div>
                            {patient.medicalHistory.chronicConditions.length === 0 ? (
                              <div
                                className="flex items-center px-4 py-[5px]"
                                style={{ borderBottom: '1px solid rgba(37,70,77,0.2)' }}
                              >
                                <span
                                  className="w-[55%]"
                                  style={{ fontSize: 14, lineHeight: '22px', color: '#2F3A40' }}
                                >
                                  None recorded
                                </span>
                                <span
                                  className="w-[20%]"
                                  style={{ fontSize: 14, lineHeight: '22px', color: '#2F3A40' }}
                                >
                                  –
                                </span>
                                <span
                                  className="w-[25%] text-right"
                                  style={{ fontSize: 14, lineHeight: '22px', color: '#2F3A40' }}
                                >
                                  –
                                </span>
                              </div>
                            ) : (
                              patient.medicalHistory.chronicConditions.map((row, i) => (
                                <div
                                  key={i}
                                  className="flex items-center px-4 py-[5px]"
                                  style={{ borderBottom: '1px solid rgba(37,70,77,0.2)' }}
                                >
                                  <span
                                    className="w-[55%]"
                                    style={{ fontSize: 14, lineHeight: '22px', color: '#2F3A40' }}
                                  >
                                    {row.condition}
                                  </span>
                                  <span
                                    className="w-[20%]"
                                    style={{ fontSize: 14, lineHeight: '22px', color: '#2F3A40' }}
                                  >
                                    {row.date}
                                  </span>
                                  <span
                                    className="w-[25%] text-right font-medium"
                                    style={{
                                      fontSize: 14,
                                      lineHeight: '22px',
                                      color: row.status === 'Active' ? '#22C55E' : '#2F3A40',
                                    }}
                                  >
                                    {row.status}
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Allergies History */}
                    <div
                      className="rounded-[12px] bg-white"
                      style={{ border: '1px solid rgba(37,70,77,0.2)' }}
                    >
                      <button
                        type="button"
                        onClick={() => toggleSection('allergiesHistory')}
                        aria-expanded={openSections.allergiesHistory}
                        className="flex w-full items-center justify-between px-4 py-2"
                        style={{ borderBottom: '1px solid rgba(37,70,77,0.2)' }}
                      >
                        <h4
                          className="font-semibold"
                          style={{ fontSize: 16, lineHeight: '24px', color: '#000000' }}
                        >
                          Allergies History
                        </h4>
                        <ChevronsDown
                          style={{
                            width: 24,
                            height: 24,
                            color: '#00B4D8',
                            flexShrink: 0,
                            transform: openSections.allergiesHistory ? undefined : 'rotate(180deg)',
                            transition: 'transform 0.2s ease',
                          }}
                        />
                      </button>
                      {openSections.allergiesHistory && (
                        <div className="overflow-x-auto">
                          <div className="min-w-[440px]">
                            <div
                              className="flex items-center px-4 py-[5px]"
                              style={{ background: '#E6F8FD' }}
                            >
                              <span
                                className="w-[22%] font-medium uppercase"
                                style={{ fontSize: 14, lineHeight: '22px', color: '#25464D' }}
                              >
                                Allergen
                              </span>
                              <span
                                className="w-[33%] font-medium uppercase"
                                style={{ fontSize: 14, lineHeight: '22px', color: '#25464D' }}
                              >
                                Reaction
                              </span>
                              <span
                                className="w-[20%] text-center font-medium uppercase"
                                style={{ fontSize: 14, lineHeight: '22px', color: '#25464D' }}
                              >
                                Severity
                              </span>
                              <span
                                className="w-[25%] text-right font-medium uppercase"
                                style={{ fontSize: 14, lineHeight: '22px', color: '#25464D' }}
                              >
                                Noted On
                              </span>
                            </div>
                            {patient.medicalHistory.allergiesHistory.length === 0 ? (
                              <div
                                className="flex items-center px-4 py-[5px]"
                                style={{ borderBottom: '1px solid rgba(37,70,77,0.2)' }}
                              >
                                <span
                                  className="w-[22%]"
                                  style={{ fontSize: 14, lineHeight: '22px', color: '#2F3A40' }}
                                >
                                  No allergies recorded
                                </span>
                                <span
                                  className="w-[33%]"
                                  style={{ fontSize: 14, lineHeight: '22px', color: '#2F3A40' }}
                                >
                                  –
                                </span>
                                <span
                                  className="w-[20%] text-center"
                                  style={{ fontSize: 14, lineHeight: '22px', color: '#2F3A40' }}
                                >
                                  –
                                </span>
                                <span
                                  className="w-[25%] text-right"
                                  style={{ fontSize: 14, lineHeight: '22px', color: '#2F3A40' }}
                                >
                                  –
                                </span>
                              </div>
                            ) : (
                              patient.medicalHistory.allergiesHistory.map((row, i) => (
                                <div
                                  key={i}
                                  className="flex items-center px-4 py-[5px]"
                                  style={{ borderBottom: '1px solid rgba(37,70,77,0.2)' }}
                                >
                                  <span
                                    className="w-[22%]"
                                    style={{ fontSize: 14, lineHeight: '22px', color: '#2F3A40' }}
                                  >
                                    {row.allergen}
                                  </span>
                                  <span
                                    className="w-[33%]"
                                    style={{ fontSize: 14, lineHeight: '22px', color: '#2F3A40' }}
                                  >
                                    {row.reaction}
                                  </span>
                                  <span className="flex w-[20%] justify-center">
                                    <span
                                      className="inline-flex items-center rounded-full px-2.5 py-0.5 font-medium"
                                      style={{
                                        fontSize: 14,
                                        lineHeight: '18px',
                                        ...medSeverityStyles[row.severity],
                                      }}
                                    >
                                      {row.severity}
                                    </span>
                                  </span>
                                  <span
                                    className="w-[25%] text-right"
                                    style={{ fontSize: 14, lineHeight: '22px', color: '#2F3A40' }}
                                  >
                                    {row.notedOn}
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          {activeTab === 'allergies' && (
            <>
              {/* ── Loading skeleton ─────────────────────────────────────────── */}
              {allergiesStatus === 'loading' && (
                <div className="flex flex-col gap-[30px]">
                  {/* Header notice skeleton */}
                  <div
                    className="animate-pulse rounded-[12px] p-[14px]"
                    style={{
                      background: 'rgba(254,242,242,0.7)',
                      border: '1px solid rgba(255,162,162,0.35)',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-5 shrink-0 rounded-sm bg-slate-200" />
                      <div className="flex-1">
                        <div className="h-[18px] w-52 rounded-sm bg-slate-200" />
                        <div className="mt-1.5 h-3.5 w-80 rounded-sm bg-slate-100" />
                      </div>
                    </div>
                  </div>
                  {/* Allergy card skeletons */}
                  {[0, 1].map((i) => (
                    <div
                      key={i}
                      className="flex animate-pulse items-center gap-3 rounded-[12px] bg-white p-4"
                      style={{ border: '2px solid rgba(255,162,162,0.25)' }}
                    >
                      <div className="size-10 shrink-0 rounded-full bg-slate-100" />
                      <div className="flex-1">
                        <div className="h-[18px] w-24 rounded-sm bg-slate-200" />
                        <div className="mt-1.5 h-3.5 w-44 rounded-sm bg-slate-100" />
                      </div>
                      <div className="h-8 w-[86px] shrink-0 rounded-full bg-slate-100" />
                    </div>
                  ))}
                </div>
              )}

              {/* ── Error state ───────────────────────────────────────────────── */}
              {allergiesStatus === 'error' && (
                <div
                  className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-[12px] py-12 text-center"
                  style={{
                    background: 'rgba(239,68,68,0.03)',
                    border: '1px solid rgba(239,68,68,0.12)',
                  }}
                >
                  <div
                    className="flex size-12 items-center justify-center rounded-full"
                    style={{ background: 'rgba(239,68,68,0.08)' }}
                  >
                    <AlertTriangle style={{ width: 22, height: 22, color: '#EF4444' }} />
                  </div>
                  <div>
                    <p className="text-base leading-6 font-medium" style={{ color: '#4A7080' }}>
                      Could not load allergy records
                    </p>
                    <p className="mt-0.5 text-sm leading-5" style={{ color: '#8A98A3' }}>
                      An error occurred while fetching this patient&apos;s allergy data
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={retryAllergies}
                    className="mt-1 flex items-center gap-2 rounded-[8px] px-4 py-2 text-sm font-medium transition-opacity hover:opacity-80"
                    style={{ background: '#E2EDF1', color: '#25464D' }}
                  >
                    <RefreshCw style={{ width: 14, height: 14 }} />
                    Try again
                  </button>
                </div>
              )}

              {/* ── Empty state (unknown patient) ─────────────────────────────── */}
              {allergiesStatus === 'empty' && (
                <div
                  className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-[12px] py-12 text-center"
                  style={{ background: 'rgba(226,237,241,0.25)' }}
                >
                  <div
                    className="flex size-12 items-center justify-center rounded-full"
                    style={{ background: 'rgba(226,237,241,0.6)' }}
                  >
                    <ShieldAlert style={{ width: 22, height: 22, color: '#8A98A3' }} />
                  </div>
                  <div>
                    <p className="text-base leading-6 font-medium" style={{ color: '#4A7080' }}>
                      No allergy data available
                    </p>
                    <p className="mt-0.5 text-sm leading-5" style={{ color: '#8A98A3' }}>
                      Patient identity could not be resolved
                    </p>
                  </div>
                </div>
              )}

              {/* ── Loaded ─────────────────────────────────────────────────────── */}
              {allergiesStatus === 'loaded' && (
                <>
                  {patient.allergies.length === 0 ? (
                    <div
                      className="flex min-h-[160px] flex-col items-center justify-center gap-3 rounded-[12px] py-10 text-center"
                      style={{
                        background: 'rgba(34,197,94,0.03)',
                        border: '1px solid rgba(34,197,94,0.2)',
                      }}
                    >
                      <div
                        className="flex size-12 items-center justify-center rounded-full"
                        style={{ background: 'rgba(34,197,94,0.08)' }}
                      >
                        <ShieldAlert style={{ width: 22, height: 22, color: '#22C55E' }} />
                      </div>
                      <div>
                        <p className="text-base leading-6 font-medium" style={{ color: '#4A7080' }}>
                          No documented drug allergies
                        </p>
                        <p className="mt-0.5 text-sm leading-5" style={{ color: '#8A98A3' }}>
                          This patient has no recorded drug allergies on file
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-[30px]">
                      {/* ── Documented Drug Allergies notice ── */}
                      <div
                        className="flex items-center gap-3 rounded-[12px] p-[14px]"
                        style={{ background: '#FEF2F2', border: '1px solid #FFC9C9' }}
                      >
                        <AlertTriangle
                          aria-hidden
                          style={{ width: 20, height: 20, color: '#DC2626', flexShrink: 0 }}
                        />
                        <div>
                          <p
                            className="leading-6 font-semibold"
                            style={{ fontSize: 16, color: '#DC2626' }}
                          >
                            Documented Drug Allergies
                          </p>
                          <p className="leading-5" style={{ fontSize: 14, color: '#DC2626' }}>
                            Must be respected in all clinical workflows, especially prescribing.
                          </p>
                        </div>
                      </div>

                      {/* ── Individual allergy cards ── */}
                      {patient.allergies.map((allergy) => (
                        <div
                          key={allergy.id}
                          className="flex items-center gap-3 rounded-[12px] bg-white p-4"
                          style={{ border: '2px solid #FFC9C9' }}
                        >
                          {/* Icon circle */}
                          <div
                            className="flex size-10 shrink-0 items-center justify-center rounded-full"
                            style={{ background: '#FEE2E2' }}
                          >
                            <ShieldAlert
                              aria-hidden
                              style={{ width: 20, height: 20, color: '#EF4444' }}
                            />
                          </div>

                          {/* Substance + subtitle */}
                          <div className="flex-1">
                            <p
                              className="leading-6 font-semibold"
                              style={{ fontSize: 16, color: '#0D2630' }}
                            >
                              {allergy.substance}
                            </p>
                            <p className="leading-5" style={{ fontSize: 14, color: '#4A7080' }}>
                              Drug Allergy — Do Not Prescribe
                            </p>
                          </div>

                          {/* ALLERGY badge */}
                          <span
                            className="shrink-0 font-medium uppercase"
                            style={{
                              fontSize: 14,
                              lineHeight: '24px',
                              paddingTop: 4,
                              paddingBottom: 4,
                              paddingLeft: 12,
                              paddingRight: 12,
                              borderRadius: 9999,
                              background: '#FEF2F2',
                              border: '1px solid #FFA2A2',
                              color: '#DC2626',
                            }}
                          >
                            ALLERGY
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}
          {activeTab === 'vital-signs' && (
            <>
              {/* ── Loading skeleton ──────────────────────────────────────────── */}
              {vitalsStatus === 'loading' && (
                <div className="flex flex-col gap-6">
                  <div className="flex items-center justify-between">
                    <div className="h-6 w-44 animate-pulse rounded-md bg-slate-200" />
                    <div className="flex items-center gap-1">
                      <div className="size-[18px] animate-pulse rounded-sm bg-slate-100" />
                      <div className="h-[18px] w-36 animate-pulse rounded-sm bg-slate-100" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div
                        key={i}
                        className="animate-pulse rounded-[12px] bg-white"
                        style={{
                          height: 120,
                          border: '1px solid rgba(37,70,77,0.1)',
                          borderLeft: '3px solid rgba(37,70,77,0.15)',
                        }}
                      >
                        <div className="flex h-full flex-col justify-between p-5">
                          <div className="size-[18px] rounded-sm bg-slate-200" />
                          <div className="h-8 w-24 rounded-md bg-slate-200" />
                          <div className="h-[18px] w-20 rounded-sm bg-slate-100" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Error state ───────────────────────────────────────────────── */}
              {vitalsStatus === 'error' && (
                <div
                  className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-[12px]"
                  style={{
                    background: 'rgba(239,68,68,0.04)',
                    border: '1px solid rgba(239,68,68,0.2)',
                  }}
                >
                  <div
                    className="flex size-12 items-center justify-center rounded-full"
                    style={{ background: 'rgba(239,68,68,0.08)' }}
                  >
                    <AlertTriangle
                      aria-hidden
                      style={{ width: 24, height: 24, color: '#EF4444' }}
                    />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                      Failed to load vital signs
                    </p>
                    <p className="mt-1" style={{ fontSize: 14, color: '#4A7080' }}>
                      Could not retrieve the patient&apos;s latest readings.
                    </p>
                  </div>
                  <button
                    onClick={retryVitals}
                    className="flex items-center gap-2 rounded-lg px-4 py-2 font-medium transition-colors hover:opacity-90"
                    style={{ fontSize: 14, background: '#00B4D8', color: '#FFFFFF' }}
                  >
                    <RefreshCw aria-hidden style={{ width: 15, height: 15 }} />
                    Retry
                  </button>
                </div>
              )}

              {/* ── Empty state ───────────────────────────────────────────────── */}
              {vitalsStatus === 'empty' && (
                <div
                  className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-[12px]"
                  style={{
                    background: 'rgba(226,237,241,0.25)',
                    border: '1px solid rgba(0,180,216,0.15)',
                  }}
                >
                  <div
                    className="flex size-12 items-center justify-center rounded-full"
                    style={{ background: 'rgba(0,180,216,0.08)' }}
                  >
                    <Thermometer aria-hidden style={{ width: 24, height: 24, color: '#00B4D8' }} />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                      No vital signs recorded
                    </p>
                    <p className="mt-1" style={{ fontSize: 14, color: '#4A7080' }}>
                      Vitals will appear here once recorded by nursing staff.
                    </p>
                  </div>
                </div>
              )}

              {/* ── Loaded ────────────────────────────────────────────────────── */}
              {vitalsStatus === 'loaded' && (
                <div className="flex flex-col gap-6">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <p
                      className="font-sans font-semibold"
                      style={{ fontSize: 16, lineHeight: '24px', color: '#0D2630' }}
                    >
                      Most Recent Vital Signs
                    </p>
                    <div className="flex items-center gap-1">
                      <Clock aria-hidden style={{ width: 18, height: 18, color: '#4A7080' }} />
                      <span
                        className="font-sans"
                        style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}
                      >
                        Recorded: {patient.vitalSigns.recordedAt}
                      </span>
                    </div>
                  </div>

                  {/* Cards grid */}
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    {patient.vitalSigns.readings.map((reading) => {
                      const config = VITAL_CARD_CONFIG[reading.key];
                      if (!config) return null;
                      const Icon = config.icon;
                      const isAbnormal = reading.status === 'abnormal';
                      return (
                        <div
                          key={reading.key}
                          className="flex flex-col justify-between rounded-[12px] bg-white p-5"
                          style={{
                            height: 120,
                            border: `1px solid ${config.thinBorderColor}`,
                            borderLeft: `3px solid ${config.accentColor}`,
                          }}
                        >
                          {/* Icon row */}
                          <div className="flex items-center justify-between">
                            <Icon
                              aria-hidden
                              style={{ width: 18, height: 18, color: config.accentColor }}
                            />
                            {isAbnormal && (
                              <AlertTriangle
                                aria-hidden
                                style={{ width: 18, height: 18, color: '#EF4444' }}
                              />
                            )}
                          </div>

                          {/* Reading value */}
                          <p
                            className="font-display font-semibold"
                            style={{
                              fontSize: 24,
                              lineHeight: '32px',
                              color: isAbnormal ? '#EF4444' : '#0D2630',
                            }}
                          >
                            {reading.value}
                          </p>

                          {/* Label */}
                          <p
                            className="font-sans"
                            style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}
                          >
                            {config.label}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
          {activeTab !== 'biodata' &&
            activeTab !== 'medical-history' &&
            activeTab !== 'allergies' &&
            activeTab !== 'vital-signs' && (
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
