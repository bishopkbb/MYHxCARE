'use client';

import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Bandage,
  CalendarClock,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  ClipboardList,
  Droplet,
  FileText,
  FlaskConical,
  Gauge,
  Heart,
  History,
  NotebookPen,
  Pill,
  Printer,
  Scan,
  Stethoscope,
  Thermometer,
  Users,
  Wind,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { AllergyBanner } from '@components/clinical/AllergyBanner';
import { ROUTES } from '@/constants/routes';
import { formatHumanDate, formatTime } from '@/utils/datetime';
import { downloadPDF, escapeHtml } from '@/utils/export';
import { getPatientRecord } from '@/features/nursing/__mocks__/patientRecordFixtures';

type PageState = 'loading' | 'loaded' | 'error';

type TabId =
  | 'Overview'
  | 'Vitals'
  | 'Medication'
  | 'Nursing Notes'
  | 'Care Plan'
  | 'Laboratory'
  | 'Radiology'
  | 'Clinical Timeline'
  | 'Documents';

const TABS: { id: TabId; icon: typeof Activity }[] = [
  { id: 'Overview', icon: Users },
  { id: 'Vitals', icon: Activity },
  { id: 'Medication', icon: Pill },
  { id: 'Nursing Notes', icon: NotebookPen },
  { id: 'Care Plan', icon: ClipboardCheck },
  { id: 'Laboratory', icon: FlaskConical },
  { id: 'Radiology', icon: Scan },
  { id: 'Clinical Timeline', icon: History },
  { id: 'Documents', icon: FileText },
];

const RISK_CFG: Record<string, { color: string; border: string; bg: string }> = {
  High: { color: '#EF4444', border: 'rgba(239,68,68,0.4)', bg: 'rgba(239,68,68,0.08)' },
  Medium: { color: '#F59E0B', border: 'rgba(245,158,11,0.4)', bg: 'rgba(245,158,11,0.08)' },
  Low: { color: '#22C55E', border: 'rgba(34,197,94,0.4)', bg: 'rgba(34,197,94,0.08)' },
};

const CARE_PLAN_CFG: Record<string, { color: string; border: string; bg: string }> = {
  'In Progress': { color: '#3B82F6', border: 'rgba(59,130,246,0.4)', bg: 'rgba(59,130,246,0.06)' },
  Planned: { color: '#8A98A3', border: 'rgba(0,100,130,0.2)', bg: 'transparent' },
  Completed: { color: '#22C55E', border: 'rgba(34,197,94,0.4)', bg: 'transparent' },
};

const TASK_CFG: Record<string, { color: string; border: string; bg: string }> = {
  'Due Soon': { color: '#F59E0B', border: 'rgba(245,158,11,0.4)', bg: 'rgba(245,158,11,0.06)' },
  Pending: { color: '#8A98A3', border: 'rgba(0,100,130,0.2)', bg: 'transparent' },
  Completed: { color: '#22C55E', border: 'rgba(34,197,94,0.4)', bg: 'transparent' },
};

const FLAG_CFG: Record<string, { color: string; border: string; bg: string }> = {
  Normal: { color: '#22C55E', border: 'rgba(34,197,94,0.4)', bg: 'transparent' },
  Abnormal: { color: '#F59E0B', border: 'rgba(245,158,11,0.4)', bg: 'rgba(245,158,11,0.06)' },
  Critical: { color: '#EF4444', border: 'rgba(239,68,68,0.4)', bg: 'rgba(239,68,68,0.06)' },
};

function TabPlaceholder({ label }: { label: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-2 rounded-[12px] py-16 text-center"
      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
    >
      <div
        className="flex size-14 items-center justify-center rounded-full"
        style={{ background: 'rgba(226,237,241,0.6)' }}
      >
        <ClipboardList style={{ width: 24, height: 24, color: '#8A98A3' }} />
      </div>
      <p className="font-sans font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
        {label} is coming soon
      </p>
      <p style={{ fontSize: 14, color: '#8A98A3' }}>This section is under active development.</p>
    </div>
  );
}

export function PatientRecordWorkspace({ patientId }: { patientId: string }) {
  const router = useRouter();
  const [pageState, setPageState] = useState<PageState>('loading');
  const [activeTab, setActiveTab] = useState<TabId>('Overview');
  const [resultsTab, setResultsTab] = useState<'Labs' | 'Radiology' | 'Other Results'>('Labs');
  const [animate, setAnimate] = useState(false);

  const record = getPatientRecord(patientId);

  useEffect(() => {
    const t = setTimeout(() => setPageState(record ? 'loaded' : 'error'), 800);
    return () => clearTimeout(t);
  }, [record]);

  useEffect(() => {
    if (pageState !== 'loaded') return;
    let raf1 = 0;
    let raf2 = 0;
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setAnimate(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [pageState]);

  function handlePrint() {
    if (!record) return;
    const { patient } = record;
    downloadPDF(
      `Patient-Record-${patient.mrn}`,
      `<h1>Patient Record</h1>
       <p class="meta">${escapeHtml(patient.patientName)} · ${escapeHtml(patient.mrn)} · ${patient.age} Y / ${escapeHtml(patient.gender)}</p>
       <hr />
       <table><tbody>
         <tr><th style="width:200px">Ward / Bed</th><td>${escapeHtml(patient.ward)} / ${escapeHtml(patient.bed)}</td></tr>
         <tr><th>Assigned Doctor</th><td>${escapeHtml(patient.doctorName)}</td></tr>
         <tr><th>Diagnosis</th><td>${escapeHtml(patient.diagnosis)}</td></tr>
         <tr><th>Secondary Diagnosis</th><td>${escapeHtml(record.secondaryDiagnosis)}</td></tr>
         <tr><th>Risk Level</th><td>${escapeHtml(patient.riskLevel)}</td></tr>
         <tr><th>Care Status</th><td>${escapeHtml(patient.careStatus)}</td></tr>
         <tr><th>Code Status</th><td>${escapeHtml(record.codeStatus)}</td></tr>
         <tr><th>Allergies</th><td>${record.allergies.length ? escapeHtml(record.allergies.map((a) => a.substance).join(', ')) : 'None known'}</td></tr>
         <tr><th>Latest Vitals</th><td>BP ${escapeHtml(record.vitals6.bp)}, HR ${record.vitals6.hr}, RR ${record.vitals6.rr}, Temp ${record.vitals6.temp}°C, SpO2 ${record.vitals6.spo2}%, Pain ${record.vitals6.painScore}/10</td></tr>
       </tbody></table>
       <h2 style="font-size:16px;margin:20px 0 6px">Clinical Summary</h2>
       <p>${escapeHtml(record.clinicalSummary)}</p>`,
    );
  }

  if (pageState === 'error' || !record) {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
          <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6">
            <div
              className="flex flex-col items-center justify-center gap-3 rounded-[12px] py-16 text-center"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <AlertCircle style={{ width: 36, height: 36, color: '#EF4444' }} />
              <p className="font-sans font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Patient record not found
              </p>
              <button
                type="button"
                onClick={() => router.push(ROUTES.nurseMyPatients)}
                className="flex items-center gap-2 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-80 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                style={{
                  height: 40,
                  borderRadius: 12,
                  padding: '0 20px',
                  background: '#00B4D8',
                  fontSize: 14,
                }}
              >
                Back to My Patients
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const { patient } = record;
  const riskCfg = RISK_CFG[patient.riskLevel] as { color: string; border: string; bg: string };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto max-w-[1600px] px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => router.push(ROUTES.nurseMyPatients)}
                className="transition-colors duration-150 hover:text-[#00B4D8] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                style={{ fontSize: 14, color: '#8A98A3' }}
              >
                My Patients
              </button>
              <span style={{ fontSize: 14, color: '#8A98A3' }}>/</span>
              <span className="font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                Patient Record
              </span>
            </nav>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => router.push(ROUTES.nurseMyPatients)}
                className="flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-white focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
              >
                ← Back to My Patients
              </button>
              <button
                type="button"
                onClick={handlePrint}
                disabled={pageState === 'loading'}
                className="flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                style={{ fontSize: 14, background: '#00B4D8' }}
              >
                <Printer style={{ width: 15, height: 15 }} />
                Print Record
              </button>
            </div>
          </div>

          {pageState === 'loading' ? (
            <div
              className="mt-4 animate-pulse rounded-[12px] p-4 sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <div className="flex items-center gap-3">
                <div className="size-18 shrink-0 rounded-full bg-slate-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-40 rounded bg-slate-100" />
                  <div className="h-4 w-56 rounded bg-slate-100" />
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* ── Patient header card ────────────────────────────────────── */}
              <div
                className="mt-4 flex flex-col gap-4 rounded-[12px] p-4 sm:p-5 lg:flex-row lg:items-start lg:justify-between"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <div className="flex min-w-0 flex-1 flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="font-display flex size-18 shrink-0 items-center justify-center rounded-full font-semibold text-white"
                      style={{ background: patient.avatarBg, fontSize: 22 }}
                    >
                      {patient.initials}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p
                          className="font-display font-semibold"
                          style={{ fontSize: 22, color: '#0D2630' }}
                        >
                          {patient.patientName}
                        </p>
                        <span style={{ fontSize: 14, color: '#8A98A3' }}>
                          {patient.age} Y / {patient.gender}
                        </span>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span style={{ fontSize: 14, color: '#00B4D8' }}>MRN: {patient.mrn}</span>
                        <span style={{ fontSize: 14, color: '#8A98A3' }}>
                          DOB: {formatHumanDate(record.dob)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                    <div className="flex items-center gap-1.5">
                      <Users style={{ width: 14, height: 14, color: '#8A98A3' }} />
                      <span style={{ fontSize: 14, color: '#8A98A3' }}>Ward:</span>
                      <span
                        className="font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {patient.ward}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Bandage style={{ width: 14, height: 14, color: '#8A98A3' }} />
                      <span style={{ fontSize: 14, color: '#8A98A3' }}>Bed:</span>
                      <span
                        className="font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {patient.bed}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CalendarClock style={{ width: 14, height: 14, color: '#8A98A3' }} />
                      <span style={{ fontSize: 14, color: '#8A98A3' }}>Admission Date:</span>
                      <span
                        className="font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {formatHumanDate(record.admissionDate)} {formatTime(record.admissionDate)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span style={{ fontSize: 14, color: '#8A98A3' }}>Length of Stay:</span>
                      <span
                        className="font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {record.lengthOfStayDays} day{record.lengthOfStayDays === 1 ? '' : 's'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div
                        className="flex size-6 shrink-0 items-center justify-center rounded-full font-sans font-semibold text-white"
                        style={{ background: '#00B4D8', fontSize: 14 }}
                      >
                        {patient.doctorName
                          .replace('Dr. ', '')
                          .split(' ')
                          .map((p) => p[0])
                          .slice(0, 2)
                          .join('')}
                      </div>
                      <span style={{ fontSize: 14, color: '#8A98A3' }}>Assigned Doctor:</span>
                      <span
                        className="font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {patient.doctorName}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 flex-col gap-2">
                  {[
                    ['Risk Level', `${patient.riskLevel} Risk`, riskCfg],
                    [
                      'Allergies',
                      record.allergies.length
                        ? `${record.allergies.length} Recorded`
                        : 'None Known',
                      record.allergies.length
                        ? {
                            color: '#EF4444',
                            border: 'rgba(239,68,68,0.4)',
                            bg: 'rgba(239,68,68,0.08)',
                          }
                        : {
                            color: '#22C55E',
                            border: 'rgba(34,197,94,0.4)',
                            bg: 'rgba(34,197,94,0.08)',
                          },
                    ],
                    [
                      'Code Status',
                      record.codeStatus,
                      {
                        color: '#00B4D8',
                        border: 'rgba(0,180,216,0.4)',
                        bg: 'rgba(0,180,216,0.08)',
                      },
                    ],
                  ].map(([label, value, cfg]) => {
                    const c = cfg as { color: string; border: string; bg: string };
                    return (
                      <div
                        key={label as string}
                        className="flex items-center justify-between gap-4"
                      >
                        <span style={{ fontSize: 14, color: '#8A98A3' }}>{label as string}</span>
                        <span
                          className="rounded-full px-2.5 py-0.5 font-sans font-medium whitespace-nowrap"
                          style={{
                            fontSize: 14,
                            color: c.color,
                            border: `1px solid ${c.border}`,
                            background: c.bg,
                          }}
                        >
                          {value as string}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex shrink-0 items-start gap-2.5 lg:w-[220px]">
                  <div
                    className="flex size-11 shrink-0 items-center justify-center rounded-full"
                    style={{ background: 'rgba(239,68,68,0.1)' }}
                  >
                    <Stethoscope style={{ width: 20, height: 20, color: '#EF4444' }} />
                  </div>
                  <div className="min-w-0">
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>Current Diagnosis</p>
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
              </div>

              {/* ── Allergy banner (compliance — every patient-context page) ── */}
              <AllergyBanner allergies={record.allergies} className="mt-4" />

              {/* ── Tabs ───────────────────────────────────────────────────── */}
              <div
                className="mt-4 flex gap-1 overflow-x-auto scroll-smooth"
                style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
              >
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className="flex shrink-0 items-center gap-1.5 px-3.5 py-2.5 font-sans font-medium whitespace-nowrap transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                    style={{
                      fontSize: 14,
                      color: activeTab === tab.id ? '#00B4D8' : '#4A7080',
                      borderBottom:
                        activeTab === tab.id ? '2px solid #00B4D8' : '2px solid transparent',
                    }}
                  >
                    <tab.icon style={{ width: 15, height: 15 }} />
                    {tab.id}
                  </button>
                ))}
              </div>

              {/* ── Tab content ────────────────────────────────────────────── */}
              <div className="mt-4">
                {activeTab === 'Overview' && (
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
                    <div className="flex min-w-0 flex-1 flex-col gap-4">
                      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                        {/* Key Information */}
                        <div
                          className="rounded-[12px] p-4 sm:p-5"
                          style={{
                            background: '#FFFFFF',
                            border: '1px solid rgba(0,100,130,0.12)',
                          }}
                        >
                          <p
                            className="font-display font-semibold"
                            style={{ fontSize: 16, color: '#0D2630' }}
                          >
                            Key Information
                          </p>
                          <div className="mt-3 flex flex-col gap-2.5">
                            {[
                              ['Phone', record.phone],
                              ['Address', record.address],
                              ['Next of Kin', `${record.nextOfKin} · ${record.nextOfKinPhone}`],
                              ['Insurance', record.insuranceProvider],
                              ['Blood Group', record.bloodGroup],
                              ['Religion', record.religion],
                            ].map(([label, value]) => (
                              <div key={label} className="flex items-start justify-between gap-2">
                                <span style={{ fontSize: 14, color: '#8A98A3' }}>{label}</span>
                                <span
                                  className="max-w-[170px] text-right font-sans font-medium"
                                  style={{ fontSize: 14, color: '#0D2630' }}
                                >
                                  {value}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Latest Vitals */}
                        <div
                          className="rounded-[12px] p-4 sm:p-5"
                          style={{
                            background: '#FFFFFF',
                            border: '1px solid rgba(0,100,130,0.12)',
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p
                                className="font-display font-semibold"
                                style={{ fontSize: 16, color: '#0D2630' }}
                              >
                                Latest Vitals
                              </p>
                              <p style={{ fontSize: 14, color: '#8A98A3' }}>
                                Today, {formatTime(record.vitals6.recordedAt)}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setActiveTab('Vitals')}
                              className="font-sans font-medium transition-opacity duration-150 hover:opacity-70 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                              style={{ fontSize: 14, color: '#00B4D8' }}
                            >
                              View All
                            </button>
                          </div>
                          <div className="mt-3 grid grid-cols-3 gap-2.5">
                            {[
                              [Heart, '#EF4444', 'BP', record.vitals6.bp, 'mmHg'],
                              [Heart, '#22C55E', 'HR', String(record.vitals6.hr), 'bpm'],
                              [Wind, '#3B82F6', 'RR', String(record.vitals6.rr), 'rpm'],
                              [Thermometer, '#F59E0B', 'Temp', String(record.vitals6.temp), '°C'],
                              [Droplet, '#00B4D8', 'SpO2', String(record.vitals6.spo2), '%'],
                              [
                                Gauge,
                                '#EC4899',
                                'Pain Score',
                                `${record.vitals6.painScore}/10`,
                                '',
                              ],
                            ].map(([Icon, color, label, value, unit], i) => {
                              const IconComp = Icon as typeof Heart;
                              return (
                                <div
                                  key={i}
                                  className="rounded-[10px] p-2.5"
                                  style={{ background: 'rgba(226,237,241,0.4)' }}
                                >
                                  <div className="flex items-center gap-1">
                                    <IconComp
                                      style={{ width: 13, height: 13, color: color as string }}
                                    />
                                    <span style={{ fontSize: 14, color: '#8A98A3' }}>
                                      {label as string}
                                    </span>
                                  </div>
                                  <p
                                    className="font-display mt-0.5 font-semibold"
                                    style={{ fontSize: 16, color: '#0D2630' }}
                                  >
                                    {value as string}
                                  </p>
                                  {unit ? (
                                    <p style={{ fontSize: 14, color: '#8A98A3' }}>
                                      {unit as string}
                                    </p>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Alerts */}
                        <div
                          className="rounded-[12px] p-4 sm:p-5"
                          style={{
                            background: '#FFFFFF',
                            border: '1px solid rgba(0,100,130,0.12)',
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <p
                              className="font-display font-semibold"
                              style={{ fontSize: 16, color: '#0D2630' }}
                            >
                              Alerts
                            </p>
                            <span style={{ fontSize: 14, color: '#00B4D8' }}>View All</span>
                          </div>
                          <div className="mt-3 flex flex-col gap-2.5">
                            {record.alerts.map((a) => {
                              const isSafety = a.kind === 'safety' && record.allergies.length === 0;
                              const bg = isSafety
                                ? 'rgba(34,197,94,0.06)'
                                : a.kind === 'medication'
                                  ? 'rgba(139,92,246,0.06)'
                                  : 'rgba(245,158,11,0.06)';
                              const border = isSafety
                                ? 'rgba(34,197,94,0.25)'
                                : a.kind === 'medication'
                                  ? 'rgba(139,92,246,0.25)'
                                  : 'rgba(245,158,11,0.25)';
                              const iconColor = isSafety
                                ? '#22C55E'
                                : a.kind === 'medication'
                                  ? '#8B5CF6'
                                  : '#F59E0B';
                              const Icon =
                                a.kind === 'medication'
                                  ? Pill
                                  : a.kind === 'observation'
                                    ? ClipboardList
                                    : AlertTriangle;
                              return (
                                <div
                                  key={a.id}
                                  className="flex items-start gap-2.5 rounded-[10px] p-3"
                                  style={{ background: bg, border: `1px solid ${border}` }}
                                >
                                  <Icon
                                    style={{
                                      width: 16,
                                      height: 16,
                                      color: iconColor,
                                      flexShrink: 0,
                                      marginTop: 2,
                                    }}
                                  />
                                  <div className="min-w-0">
                                    <p
                                      className="font-sans font-medium"
                                      style={{ fontSize: 14, color: '#0D2630' }}
                                    >
                                      {a.title}
                                    </p>
                                    <p style={{ fontSize: 14, color: '#4A7080' }}>
                                      {a.description}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                        {/* Diagnosis & Clinical Summary */}
                        <div
                          className="rounded-[12px] p-4 sm:p-5"
                          style={{
                            background: '#FFFFFF',
                            border: '1px solid rgba(0,100,130,0.12)',
                          }}
                        >
                          <p
                            className="font-display font-semibold"
                            style={{ fontSize: 16, color: '#0D2630' }}
                          >
                            Diagnosis &amp; Clinical Summary
                          </p>
                          <div className="mt-3">
                            <p style={{ fontSize: 14, color: '#8A98A3' }}>Primary Diagnosis</p>
                            <div className="mt-0.5 flex items-center gap-2">
                              <p
                                className="font-sans font-medium"
                                style={{ fontSize: 14, color: '#0D2630' }}
                              >
                                {patient.diagnosis}
                              </p>
                              <span
                                className="rounded-full px-2 py-0.5 font-sans font-medium"
                                style={{
                                  fontSize: 14,
                                  color: '#8B5CF6',
                                  border: '1px solid rgba(139,92,246,0.4)',
                                  background: 'rgba(139,92,246,0.06)',
                                }}
                              >
                                {record.diagnosisTag}
                              </span>
                            </div>
                          </div>
                          <div className="mt-2.5">
                            <p style={{ fontSize: 14, color: '#8A98A3' }}>Secondary Diagnosis</p>
                            <p
                              className="font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {record.secondaryDiagnosis}
                            </p>
                          </div>
                          <div className="mt-2.5">
                            <p style={{ fontSize: 14, color: '#8A98A3' }}>Brief Summary</p>
                            <p style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                              {record.clinicalSummary}
                            </p>
                          </div>
                        </div>

                        {/* Care Plan Summary */}
                        <div
                          className="rounded-[12px] p-4 sm:p-5"
                          style={{
                            background: '#FFFFFF',
                            border: '1px solid rgba(0,100,130,0.12)',
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <p
                              className="font-display font-semibold"
                              style={{ fontSize: 16, color: '#0D2630' }}
                            >
                              Care Plan Summary
                            </p>
                            <button
                              type="button"
                              onClick={() => setActiveTab('Care Plan')}
                              className="font-sans font-medium transition-opacity duration-150 hover:opacity-70 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                              style={{ fontSize: 14, color: '#00B4D8' }}
                            >
                              View Care Plan
                            </button>
                          </div>
                          <div className="mt-3 flex flex-col gap-2.5">
                            {record.carePlan.map((c) => {
                              const cfg = CARE_PLAN_CFG[c.status] as {
                                color: string;
                                border: string;
                                bg: string;
                              };
                              return (
                                <div key={c.id} className="flex items-center gap-2">
                                  {c.status === 'Completed' ? (
                                    <CheckCircle2
                                      style={{
                                        width: 16,
                                        height: 16,
                                        color: '#22C55E',
                                        flexShrink: 0,
                                      }}
                                    />
                                  ) : (
                                    <Circle
                                      style={{
                                        width: 16,
                                        height: 16,
                                        color: '#8A98A3',
                                        flexShrink: 0,
                                      }}
                                    />
                                  )}
                                  <span
                                    className="min-w-0 flex-1 truncate"
                                    style={{ fontSize: 14, color: '#0D2630' }}
                                  >
                                    {c.label}
                                  </span>
                                  <span
                                    className="shrink-0 rounded-full px-2 py-0.5 font-sans font-medium"
                                    style={{
                                      fontSize: 14,
                                      whiteSpace: 'nowrap',
                                      color: cfg.color,
                                      border: `1px solid ${cfg.border}`,
                                      background: cfg.bg,
                                    }}
                                  >
                                    {c.status}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Intake & Output */}
                        <div
                          className="rounded-[12px] p-4 sm:p-5"
                          style={{
                            background: '#FFFFFF',
                            border: '1px solid rgba(0,100,130,0.12)',
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <p
                              className="font-display font-semibold"
                              style={{ fontSize: 16, color: '#0D2630' }}
                            >
                              Intake &amp; Output (Today)
                            </p>
                            <span style={{ fontSize: 14, color: '#00B4D8' }}>View Chart</span>
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-2.5">
                            <div
                              className="rounded-[10px] p-2.5"
                              style={{ background: 'rgba(226,237,241,0.4)' }}
                            >
                              <div className="flex items-center gap-1">
                                <Droplet style={{ width: 13, height: 13, color: '#00B4D8' }} />
                                <span style={{ fontSize: 14, color: '#8A98A3' }}>Intake</span>
                              </div>
                              <p
                                className="font-display mt-0.5 font-semibold"
                                style={{ fontSize: 18, color: '#0D2630' }}
                              >
                                {record.intakeMl} ml
                              </p>
                            </div>
                            <div
                              className="rounded-[10px] p-2.5"
                              style={{ background: 'rgba(226,237,241,0.4)' }}
                            >
                              <div className="flex items-center gap-1">
                                <FlaskConical style={{ width: 13, height: 13, color: '#8B5CF6' }} />
                                <span style={{ fontSize: 14, color: '#8A98A3' }}>Output</span>
                              </div>
                              <p
                                className="font-display mt-0.5 font-semibold"
                                style={{ fontSize: 18, color: '#0D2630' }}
                              >
                                {record.outputMl} ml
                              </p>
                            </div>
                          </div>
                          <p className="mt-2.5" style={{ fontSize: 14, color: '#4A7080' }}>
                            Balance{' '}
                            <span className="font-sans font-semibold" style={{ color: '#0D2630' }}>
                              {record.intakeMl - record.outputMl >= 0 ? '+' : ''}
                              {record.intakeMl - record.outputMl} ml
                            </span>
                          </p>
                          <p className="mt-1" style={{ fontSize: 14, color: '#8A98A3' }}>
                            Last Recorded: {formatTime(record.intakeLastRecorded)}
                          </p>
                        </div>
                      </div>

                      {/* Recent Results */}
                      <div
                        className="rounded-[12px] p-4 sm:p-5"
                        style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-1">
                            <p
                              className="font-display mr-2 font-semibold"
                              style={{ fontSize: 16, color: '#0D2630' }}
                            >
                              Recent Results
                            </p>
                            {(['Labs', 'Radiology', 'Other Results'] as const).map((t) => (
                              <button
                                key={t}
                                type="button"
                                onClick={() => setResultsTab(t)}
                                className="px-3 py-1.5 font-sans font-medium transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                                style={{
                                  fontSize: 14,
                                  color: resultsTab === t ? '#00B4D8' : '#8A98A3',
                                  borderBottom:
                                    resultsTab === t
                                      ? '2px solid #00B4D8'
                                      : '2px solid transparent',
                                }}
                              >
                                {t}
                              </button>
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={() => setActiveTab('Laboratory')}
                            className="font-sans font-medium transition-opacity duration-150 hover:opacity-70 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                            style={{ fontSize: 14, color: '#00B4D8' }}
                          >
                            View All Results
                          </button>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                          {resultsTab === 'Labs' &&
                            (record.labResults.length === 0 ? (
                              <p style={{ fontSize: 14, color: '#8A98A3' }}>
                                No recent lab results.
                              </p>
                            ) : (
                              record.labResults.map((r) => {
                                const flagCfg = FLAG_CFG[r.flag] as {
                                  color: string;
                                  border: string;
                                  bg: string;
                                };
                                return (
                                  <div
                                    key={r.id}
                                    className="rounded-[10px] p-3"
                                    style={{ border: '1px solid rgba(0,100,130,0.12)' }}
                                  >
                                    <p
                                      className="font-sans font-medium"
                                      style={{ fontSize: 14, color: '#0D2630' }}
                                    >
                                      {r.name}
                                    </p>
                                    <p
                                      className="font-display mt-0.5 font-semibold"
                                      style={{ fontSize: 15, color: '#0D2630' }}
                                    >
                                      {r.value}
                                    </p>
                                    <p
                                      className="mt-0.5"
                                      style={{ fontSize: 14, color: '#8A98A3' }}
                                    >
                                      {formatHumanDate(r.date)} {formatTime(r.date)}
                                    </p>
                                    <span
                                      className="mt-1.5 inline-block rounded-full px-2 py-0.5 font-sans font-medium"
                                      style={{
                                        fontSize: 14,
                                        color: flagCfg.color,
                                        border: `1px solid ${flagCfg.border}`,
                                        background: flagCfg.bg,
                                      }}
                                    >
                                      {r.flag}
                                    </span>
                                  </div>
                                );
                              })
                            ))}
                          {resultsTab === 'Radiology' && (
                            <p style={{ fontSize: 14, color: '#8A98A3' }}>
                              No recent radiology results.
                            </p>
                          )}
                          {resultsTab === 'Other Results' && (
                            <p style={{ fontSize: 14, color: '#8A98A3' }}>
                              No other recent results.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* ── Sidebar ─────────────────────────────────────────────── */}
                    <div className="flex w-full shrink-0 flex-col gap-4 xl:w-[340px]">
                      {/* Care Status */}
                      <div
                        className="rounded-[12px] p-4"
                        style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                      >
                        <div className="flex items-center justify-between">
                          <p
                            className="font-display font-semibold"
                            style={{ fontSize: 16, color: '#0D2630' }}
                          >
                            Care Status
                          </p>
                          <span
                            className="rounded-full px-2.5 py-0.5 font-sans font-medium"
                            style={{
                              fontSize: 14,
                              color: patient.careStatus === 'Stable' ? '#22C55E' : '#3B82F6',
                              border: `1px solid ${patient.careStatus === 'Stable' ? 'rgba(34,197,94,0.4)' : 'rgba(59,130,246,0.4)'}`,
                              background:
                                patient.careStatus === 'Stable'
                                  ? 'transparent'
                                  : 'rgba(59,130,246,0.06)',
                            }}
                          >
                            {patient.careStatus}
                          </span>
                        </div>
                        <div className="mt-3 flex items-center gap-4">
                          <div
                            className="relative flex shrink-0 items-center justify-center"
                            style={{ width: 96, height: 96 }}
                          >
                            <svg
                              viewBox="0 0 96 96"
                              style={{ width: 96, height: 96 }}
                              role="img"
                              aria-label="Care plan progress"
                            >
                              <circle
                                cx={48}
                                cy={48}
                                r={40}
                                fill="none"
                                stroke="rgba(34,197,94,0.12)"
                                strokeWidth={10}
                              />
                              <circle
                                cx={48}
                                cy={48}
                                r={40}
                                fill="none"
                                stroke="#22C55E"
                                strokeWidth={10}
                                strokeLinecap="round"
                                transform="rotate(-90 48 48)"
                                strokeDasharray={`${2 * Math.PI * 40}`}
                                strokeDashoffset={
                                  animate
                                    ? 2 * Math.PI * 40 * (1 - record.carePlanProgress / 100)
                                    : 2 * Math.PI * 40
                                }
                                style={{
                                  transition: 'stroke-dashoffset 0.9s cubic-bezier(0.22,1,0.36,1)',
                                }}
                              />
                            </svg>
                            <div className="absolute flex flex-col items-center">
                              <span
                                className="font-display font-bold"
                                style={{ fontSize: 20, color: '#0D2630' }}
                              >
                                {record.carePlanProgress}%
                              </span>
                            </div>
                          </div>
                          <div className="min-w-0">
                            <p style={{ fontSize: 14, color: '#8A98A3' }}>Care Plan Progress</p>
                            <p className="mt-2" style={{ fontSize: 14, color: '#8A98A3' }}>
                              Last Updated
                            </p>
                            <p
                              className="font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {formatHumanDate(record.careStatusLastUpdated)}{' '}
                              {formatTime(record.careStatusLastUpdated)}
                            </p>
                            <p className="mt-1" style={{ fontSize: 14, color: '#8A98A3' }}>
                              Next Review
                            </p>
                            <p
                              className="font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {formatHumanDate(record.careStatusNextReview)}{' '}
                              {formatTime(record.careStatusNextReview)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Next Medication */}
                      <div
                        className="rounded-[12px] p-4"
                        style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                      >
                        <div className="flex items-center justify-between">
                          <p
                            className="font-display font-semibold"
                            style={{ fontSize: 16, color: '#0D2630' }}
                          >
                            Next Medication
                          </p>
                          <button
                            type="button"
                            onClick={() => setActiveTab('Medication')}
                            className="font-sans font-medium transition-opacity duration-150 hover:opacity-70 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                            style={{ fontSize: 14, color: '#00B4D8' }}
                          >
                            View MAR
                          </button>
                        </div>
                        <div className="mt-3 flex items-center gap-2.5">
                          <div
                            className="flex size-9 shrink-0 items-center justify-center rounded-full"
                            style={{ background: 'rgba(139,92,246,0.12)' }}
                          >
                            <Pill style={{ width: 16, height: 16, color: '#8B5CF6' }} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p
                              className="truncate font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {patient.nextMedication}
                            </p>
                            <p style={{ fontSize: 14, color: '#8A98A3' }}>
                              {formatTime(patient.nextMedicationTime)}
                            </p>
                          </div>
                          <span
                            className="shrink-0 rounded-full px-2.5 py-0.5 font-sans font-medium whitespace-nowrap"
                            style={{
                              fontSize: 14,
                              color: '#F59E0B',
                              border: '1px solid rgba(245,158,11,0.4)',
                              background: 'rgba(245,158,11,0.06)',
                            }}
                          >
                            Due Soon
                          </span>
                        </div>
                      </div>

                      {/* Nursing Tasks */}
                      <div
                        className="rounded-[12px] p-4"
                        style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                      >
                        <div className="flex items-center justify-between">
                          <p
                            className="font-display font-semibold"
                            style={{ fontSize: 16, color: '#0D2630' }}
                          >
                            Nursing Tasks
                          </p>
                          <span style={{ fontSize: 14, color: '#00B4D8' }}>View All</span>
                        </div>
                        <div className="mt-3 flex flex-col gap-2.5">
                          {record.nursingTasks.map((t) => {
                            const cfg = TASK_CFG[t.status] as {
                              color: string;
                              border: string;
                              bg: string;
                            };
                            return (
                              <div key={t.id} className="flex items-center gap-2">
                                {t.status === 'Completed' ? (
                                  <CheckCircle2
                                    style={{
                                      width: 16,
                                      height: 16,
                                      color: '#22C55E',
                                      flexShrink: 0,
                                    }}
                                  />
                                ) : (
                                  <Circle
                                    style={{
                                      width: 16,
                                      height: 16,
                                      color: '#8A98A3',
                                      flexShrink: 0,
                                    }}
                                  />
                                )}
                                <div className="min-w-0 flex-1">
                                  <p
                                    className="truncate font-sans font-medium"
                                    style={{ fontSize: 14, color: '#0D2630' }}
                                  >
                                    {t.label}
                                  </p>
                                  <p style={{ fontSize: 14, color: '#8A98A3' }}>
                                    Due: {formatTime(t.dueTime)}
                                  </p>
                                </div>
                                <span
                                  className="shrink-0 rounded-full px-2 py-0.5 font-sans font-medium whitespace-nowrap"
                                  style={{
                                    fontSize: 14,
                                    color: cfg.color,
                                    border: `1px solid ${cfg.border}`,
                                    background: cfg.bg,
                                  }}
                                >
                                  {t.status}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Recent Nursing Notes */}
                      <div
                        className="rounded-[12px] p-4"
                        style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                      >
                        <div className="flex items-center justify-between">
                          <p
                            className="font-display font-semibold"
                            style={{ fontSize: 16, color: '#0D2630' }}
                          >
                            Recent Nursing Notes
                          </p>
                          <button
                            type="button"
                            onClick={() => setActiveTab('Nursing Notes')}
                            className="font-sans font-medium transition-opacity duration-150 hover:opacity-70 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                            style={{ fontSize: 14, color: '#00B4D8' }}
                          >
                            View All
                          </button>
                        </div>
                        <div className="mt-3 flex flex-col gap-2.5">
                          {record.nursingNotes.length === 0 ? (
                            <p style={{ fontSize: 14, color: '#8A98A3' }}>
                              No nursing notes recorded yet.
                            </p>
                          ) : (
                            record.nursingNotes.map((n) => (
                              <div
                                key={n.id}
                                className="rounded-[10px] p-2.5"
                                style={{ background: 'rgba(226,237,241,0.4)' }}
                              >
                                <p style={{ fontSize: 14, color: '#8A98A3' }}>
                                  {formatHumanDate(n.dateTime)}, {formatTime(n.dateTime)}
                                </p>
                                <p style={{ fontSize: 14, lineHeight: '20px', color: '#0D2630' }}>
                                  {n.note}
                                </p>
                                <p className="mt-0.5" style={{ fontSize: 14, color: '#8A98A3' }}>
                                  {n.author}
                                </p>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'Vitals' && <TabPlaceholder label="Full vitals history" />}
                {activeTab === 'Medication' && (
                  <TabPlaceholder label="Medication Administration Record" />
                )}
                {activeTab === 'Nursing Notes' && <TabPlaceholder label="All nursing notes" />}
                {activeTab === 'Care Plan' && <TabPlaceholder label="Full care plan" />}
                {activeTab === 'Laboratory' && <TabPlaceholder label="Full laboratory results" />}
                {activeTab === 'Radiology' && <TabPlaceholder label="Radiology results" />}
                {activeTab === 'Clinical Timeline' && <TabPlaceholder label="Clinical timeline" />}
                {activeTab === 'Documents' && <TabPlaceholder label="Documents" />}
              </div>
            </>
          )}

          <div className="h-4" />
        </div>
      </main>
    </div>
  );
}
