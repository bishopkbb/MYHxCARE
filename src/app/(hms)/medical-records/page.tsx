'use client';

import {
  AlertCircle,
  AlertTriangle,
  ChevronRight,
  ClipboardList,
  FlaskConical,
  ListFilter,
  Pill,
  RefreshCw,
  Search,
  Share2,
  Stethoscope,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { useToast } from '@/hooks/useToast';
import {
  MOCK_MEDICAL_RECORDS,
  type MedicalRecord,
  type RecordStatus,
  type RecordType,
} from '@/features/medical-records/__mocks__/medicalRecordFixtures';
import { MOCK_PATIENTS } from '@/features/patients/__mocks__/patientFixtures';
import { ExportMenu } from '@/components/ExportMenu';
import { downloadCSV, downloadPDF, escapeHtml } from '@/utils/export';

// ── Types ─────────────────────────────────────────────────────────────────────

type PageState = 'loading' | 'loaded' | 'error';
type TabId = 'all' | RecordType;

type TabCfg = {
  id: TabId;
  label: string;
  count: number;
};

type MetricCard = {
  label: string;
  value: number;
  color: string;
  borderLeft: string;
  bg: string;
};

type RecordTypeCfg = {
  label: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  badgeColor: string;
  badgeBorder: string;
  badgeBg: string;
};

type StatusCfg = {
  label: string;
  color: string;
  border: string;
  bg: string;
};

// ── Config ────────────────────────────────────────────────────────────────────

const RECORD_TYPE_CFG: Record<RecordType, RecordTypeCfg> = {
  consultation: {
    label: 'CONSULTATION',
    icon: Stethoscope,
    iconBg: 'rgba(0,180,216,0.12)',
    iconColor: '#00B4D8',
    badgeColor: '#00B4D8',
    badgeBorder: 'rgba(0,180,216,0.30)',
    badgeBg: 'rgba(0,180,216,0.06)',
  },
  laboratory: {
    label: 'LABORATORY',
    icon: FlaskConical,
    iconBg: 'rgba(59,130,246,0.12)',
    iconColor: '#3B82F6',
    badgeColor: '#3B82F6',
    badgeBorder: 'rgba(59,130,246,0.30)',
    badgeBg: 'rgba(59,130,246,0.06)',
  },
  prescription: {
    label: 'PRESCRIPTION',
    icon: Pill,
    iconBg: 'rgba(139,92,246,0.12)',
    iconColor: '#8B5CF6',
    badgeColor: '#8B5CF6',
    badgeBorder: 'rgba(139,92,246,0.30)',
    badgeBg: 'rgba(139,92,246,0.06)',
  },
  referral: {
    label: 'REFERRAL',
    icon: Share2,
    iconBg: 'rgba(245,158,11,0.12)',
    iconColor: '#F59E0B',
    badgeColor: '#F59E0B',
    badgeBorder: 'rgba(245,158,11,0.30)',
    badgeBg: 'rgba(245,158,11,0.06)',
  },
};

const STATUS_CFG: Record<RecordStatus, StatusCfg> = {
  active: { label: 'Active', color: '#00B4D8', border: 'rgba(0,180,216,0.40)', bg: 'transparent' },
  critical: {
    label: 'Critical',
    color: '#EF4444',
    border: 'rgba(239,68,68,0.40)',
    bg: 'rgba(239,68,68,0.06)',
  },
  completed: {
    label: 'Completed',
    color: '#22C55E',
    border: 'rgba(34,197,94,0.40)',
    bg: 'transparent',
  },
  dispensed: {
    label: 'Dispensed',
    color: '#22C55E',
    border: 'rgba(34,197,94,0.40)',
    bg: 'transparent',
  },
  accepted: {
    label: 'Accepted',
    color: '#22C55E',
    border: 'rgba(34,197,94,0.40)',
    bg: 'transparent',
  },
  verified: {
    label: 'Verified',
    color: '#00B4D8',
    border: 'rgba(0,180,216,0.40)',
    bg: 'transparent',
  },
  'in-progress': {
    label: 'In Progress',
    color: '#00B4D8',
    border: 'rgba(0,180,216,0.40)',
    bg: 'transparent',
  },
  pending: {
    label: 'Pending',
    color: '#F59E0B',
    border: 'rgba(245,158,11,0.40)',
    bg: 'rgba(245,158,11,0.06)',
  },
  emergency: {
    label: 'Emergency',
    color: '#EF4444',
    border: 'rgba(239,68,68,0.40)',
    bg: 'rgba(239,68,68,0.06)',
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function countByType(records: MedicalRecord[], type: RecordType) {
  return records.filter((r) => r.type === type).length;
}

function countByStatus(records: MedicalRecord[], ...statuses: RecordStatus[]) {
  return records.filter((r) => statuses.includes(r.status)).length;
}

// ── Export helpers ────────────────────────────────────────────────────────────

function exportRecordsAsPDF(records: MedicalRecord[], title = 'Medical Records') {
  const now = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const rows = records
    .map(
      (r) =>
        `<tr>
          <td>${escapeHtml(RECORD_TYPE_CFG[r.type].label)}</td>
          <td>${escapeHtml(r.title)}</td>
          <td>${escapeHtml(r.patientName)}</td>
          <td>${escapeHtml(r.mrn)}</td>
          <td>${escapeHtml(r.date)}</td>
          <td>${escapeHtml(r.provider)}</td>
          <td>${escapeHtml(STATUS_CFG[r.status].label)}</td>
          <td>${r.isCritical ? 'Yes' : ''}</td>
        </tr>`,
    )
    .join('');
  const body = `
    <h1>${escapeHtml(title)}</h1>
    <p class="meta">${records.length} record${records.length !== 1 ? 's' : ''} · Exported ${now}</p>
    <hr>
    <table>
      <thead>
        <tr><th>Type</th><th>Title</th><th>Patient</th><th>MRN</th>
            <th>Date</th><th>Provider</th><th>Status</th><th>Critical</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
  downloadPDF('medical-records', body);
}

function exportRecordsAsCSV(records: MedicalRecord[]) {
  downloadCSV('medical-records', [
    ['Type', 'Title', 'Patient', 'MRN', 'Date', 'Provider', 'Status', 'Critical'],
    ...records.map((r) => [
      RECORD_TYPE_CFG[r.type].label,
      r.title,
      r.patientName,
      r.mrn,
      r.date,
      r.provider,
      STATUS_CFG[r.status].label,
      r.isCritical ? 'Yes' : 'No',
    ]),
  ]);
}

// MRN → patient page ID, built from the shared patients fixture
const MRN_TO_PATIENT_ID: Record<string, string> = Object.fromEntries(
  MOCK_PATIENTS.map((p) => [p.mrn, p.id]),
);

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonMetricCard() {
  return (
    <div
      className="flex items-center gap-3 lg:w-[200px] lg:shrink-0"
      style={{
        minHeight: 64,
        borderRadius: 12,
        borderTop: '1px solid #0064821F',
        borderRight: '1px solid #0064821F',
        borderBottom: '1px solid #0064821F',
        borderLeft: '3px solid rgba(0,100,130,0.15)',
        padding: '12px 16px',
        background: '#FFFFFF',
      }}
    >
      <div className="h-8 w-10 shrink-0 animate-pulse rounded bg-slate-200" />
      <div className="h-5 w-24 animate-pulse rounded bg-slate-200" />
    </div>
  );
}

function SkeletonRecordRow() {
  return (
    <div
      className="flex items-center gap-3 px-3 sm:gap-4 sm:px-4"
      style={{
        minHeight: 70,
        borderRadius: 12,
        background: '#FFFFFF',
        border: '1px solid #0064821F',
        paddingTop: 12,
        paddingBottom: 12,
      }}
    >
      <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-slate-200" />
      <div className="min-w-0 flex-1">
        <div className="mb-2 h-[18px] w-40 animate-pulse rounded bg-slate-200" />
        <div className="h-[18px] w-56 animate-pulse rounded bg-slate-200" />
      </div>
      <div className="hidden h-6 w-24 animate-pulse rounded-full bg-slate-200 sm:block" />
      <div className="h-6 w-20 animate-pulse rounded-full bg-slate-200" />
      <div className="h-4 w-4 animate-pulse rounded bg-slate-200" />
    </div>
  );
}

// ── Patient Records Modal ─────────────────────────────────────────────────────

function PatientRecordsModal({
  records,
  onClose,
}: {
  records: MedicalRecord[];
  onClose: () => void;
}) {
  const toast = useToast();
  const patient = records[0]!;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(13,38,48,0.45)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex w-full flex-col overflow-hidden bg-white"
        style={{
          maxWidth: 720,
          maxHeight: 'calc(100vh - 64px)',
          borderRadius: 16,
        }}
      >
        {/* ── Header ── */}
        <div
          className="flex shrink-0 items-start justify-between gap-3 px-6 py-5"
          style={{ borderBottom: '1px solid #0064821F' }}
        >
          <div>
            <h2
              className="font-display font-semibold"
              style={{ fontSize: 22, lineHeight: '30px', color: '#0D2630' }}
            >
              {patient.patientName}
            </h2>
            <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
              {patient.mrn} · {records.length} record{records.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-full p-1 transition-colors duration-150 hover:bg-[rgba(0,0,0,0.06)] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
          >
            <X style={{ width: 20, height: 20, color: '#4A7080' }} />
          </button>
        </div>

        {/* ── Record list ── */}
        <div className="flex flex-col gap-2 overflow-y-auto px-6 py-4">
          {records.map((record) => {
            const typeCfg = RECORD_TYPE_CFG[record.type];
            const statusCfg = STATUS_CFG[record.status];
            const Icon = typeCfg.icon;

            return (
              <div
                key={record.id}
                className="flex cursor-pointer items-center gap-3 px-3 transition-shadow duration-150 hover:shadow-sm sm:gap-4 sm:px-4"
                style={{
                  minHeight: 70,
                  borderRadius: 12,
                  background: '#FFFFFF',
                  borderTop: '1px solid #0064821F',
                  borderRight: '1px solid #0064821F',
                  borderBottom: '1px solid #0064821F',
                  borderLeft: record.isCritical ? '3px solid #EF4444' : '1px solid #0064821F',
                  paddingTop: 12,
                  paddingBottom: 12,
                }}
                onClick={() => toast.info('Coming soon', 'Detailed record view is being built.')}
              >
                {/* Icon circle */}
                <div
                  className="flex shrink-0 items-center justify-center rounded-full"
                  style={{ width: 40, height: 40, background: typeCfg.iconBg }}
                >
                  <Icon style={{ width: 18, height: 18, color: typeCfg.iconColor }} />
                </div>

                {/* Title + meta */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p
                      className="truncate font-sans font-semibold"
                      style={{ fontSize: 14, lineHeight: '22px', color: '#0D2630' }}
                    >
                      {record.title}
                    </p>
                    {record.isCritical && (
                      <AlertTriangle
                        aria-hidden
                        style={{ width: 14, height: 14, color: '#EF4444', flexShrink: 0 }}
                      />
                    )}
                  </div>
                  <p
                    className="truncate"
                    style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}
                  >
                    {record.date}
                    <span className="hidden sm:inline"> · {record.provider}</span>
                  </p>
                </div>

                {/* Type badge — desktop only */}
                <span
                  className="hidden shrink-0 rounded-full px-3 py-0.5 font-sans font-semibold tracking-wide sm:inline"
                  style={{
                    fontSize: 14,
                    lineHeight: '22px',
                    color: typeCfg.badgeColor,
                    border: `1px solid ${typeCfg.badgeBorder}`,
                    background: typeCfg.badgeBg,
                  }}
                >
                  {typeCfg.label}
                </span>

                {/* Status badge */}
                <span
                  className="shrink-0 rounded-full px-2.5 py-0.5 font-sans font-medium sm:px-3"
                  style={{
                    fontSize: 14,
                    lineHeight: '22px',
                    color: statusCfg.color,
                    border: `1px solid ${statusCfg.border}`,
                    background: statusCfg.bg,
                  }}
                >
                  {statusCfg.label}
                </span>

                <ChevronRight style={{ width: 16, height: 16, color: '#8A98A3', flexShrink: 0 }} />
              </div>
            );
          })}
        </div>

        {/* ── Footer ── */}
        <div
          className="flex shrink-0 items-center justify-between gap-3 px-6 py-4"
          style={{ borderTop: '1px solid #0064821F' }}
        >
          {MRN_TO_PATIENT_ID[patient.mrn] ? (
            <Link
              href={`/patients/${MRN_TO_PATIENT_ID[patient.mrn]}`}
              onClick={onClose}
              className="font-sans font-medium transition-opacity duration-150 hover:opacity-70 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
              style={{ fontSize: 14, lineHeight: '22px', color: '#00B4D8' }}
            >
              View Patient Profile →
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => toast.info('Not found', 'No patient profile linked to this MRN.')}
              className="font-sans font-medium transition-opacity duration-150 hover:opacity-70 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
              style={{ fontSize: 14, lineHeight: '22px', color: '#8A98A3' }}
            >
              View Patient Profile →
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="font-sans font-semibold transition-colors duration-150 hover:bg-[rgba(0,0,0,0.04)] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
            style={{
              height: 40,
              borderRadius: 10,
              padding: '0 16px',
              background: '#FFFFFF',
              border: '1px solid #0064821F',
              fontSize: 14,
              lineHeight: '22px',
              color: '#4A7080',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function MedicalRecordsPage() {
  const toast = useToast();
  const [pageState, setPageState] = useState<PageState>('loading');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<TabId>('all');
  const [selectedMrn, setSelectedMrn] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setPageState('loaded'), 800);
    return () => clearTimeout(t);
  }, []);

  const allRecords = MOCK_MEDICAL_RECORDS;

  const metrics: MetricCard[] = [
    {
      label: 'Total Records',
      value: allRecords.length,
      color: '#00B4D8',
      borderLeft: '#00B4D8',
      bg: 'rgba(0,180,216,0.05)',
    },
    {
      label: 'Critical / Emergency',
      value: countByStatus(allRecords, 'critical', 'emergency'),
      color: '#EF4444',
      borderLeft: '#EF4444',
      bg: 'rgba(239,68,68,0.05)',
    },
    {
      label: 'Pending Review',
      value: countByStatus(allRecords, 'pending', 'in-progress'),
      color: '#F59E0B',
      borderLeft: '#F59E0B',
      bg: 'rgba(245,158,11,0.05)',
    },
    {
      label: 'Completed',
      value: countByStatus(allRecords, 'completed', 'dispensed', 'accepted', 'verified'),
      color: '#3B82F6',
      borderLeft: '#3B82F6',
      bg: 'rgba(59,130,246,0.05)',
    },
  ];

  const tabs: TabCfg[] = [
    { id: 'all', label: 'All Records', count: allRecords.length },
    { id: 'consultation', label: 'Consultations', count: countByType(allRecords, 'consultation') },
    { id: 'laboratory', label: 'Laboratory', count: countByType(allRecords, 'laboratory') },
    { id: 'prescription', label: 'Prescriptions', count: countByType(allRecords, 'prescription') },
    { id: 'referral', label: 'Referrals', count: countByType(allRecords, 'referral') },
  ];

  const patientRecords = selectedMrn ? allRecords.filter((r) => r.mrn === selectedMrn) : [];

  const q = search.trim().toLowerCase();
  const filtered = allRecords.filter((r) => {
    const matchesTab = activeTab === 'all' || r.type === activeTab;
    const matchesSearch =
      !q ||
      r.title.toLowerCase().includes(q) ||
      r.patientName.toLowerCase().includes(q) ||
      r.mrn.toLowerCase().includes(q);
    return matchesTab && matchesSearch;
  });

  function handleRetry() {
    setPageState('loading');
    setTimeout(() => setPageState('loaded'), 800);
  }

  return (
    <>
      <main
        className="flex-1 overflow-y-auto scroll-smooth px-4 py-4 sm:px-6 sm:py-6"
        style={{ background: '#F5FBFD' }}
      >
        {/* ── Page header ──────────────────────────────────────────────────────── */}
        <div className="mb-5 flex items-start justify-between gap-3 sm:mb-6">
          <div>
            <h1
              className="font-display font-semibold"
              style={{ fontSize: 22, lineHeight: '30px', color: '#0D2630' }}
            >
              Medical Records
            </h1>
            <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
              Complete clinical records for your patients — June 2026
            </p>
          </div>

          {pageState === 'loaded' && (
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => toast.info('Filter', 'Advanced filters coming soon.')}
                className="flex items-center gap-2 rounded-[10px] px-3 font-sans font-semibold transition-colors duration-150 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none sm:px-4"
                style={{
                  fontSize: 14,
                  lineHeight: '22px',
                  height: 40,
                  color: '#0D2630',
                  border: '1px solid #0064821F',
                  background: '#FFFFFF',
                }}
              >
                <ListFilter style={{ width: 16, height: 16, flexShrink: 0 }} />
                <span className="hidden sm:inline">Filter</span>
              </button>

              <ExportMenu
                variant="button"
                label="Export Records"
                onExportPDF={() => exportRecordsAsPDF(filtered)}
                onExportCSV={() => exportRecordsAsCSV(filtered)}
              />
            </div>
          )}
        </div>

        {/* ── Loading ──────────────────────────────────────────────────────────── */}
        {pageState === 'loading' && (
          <>
            <div className="mb-5 grid grid-cols-2 gap-3 sm:mb-6 lg:flex lg:gap-[60px]">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonMetricCard key={i} />
              ))}
            </div>
            <div className="flex flex-col gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonRecordRow key={i} />
              ))}
            </div>
          </>
        )}

        {/* ── Error ────────────────────────────────────────────────────────────── */}
        {pageState === 'error' && (
          <div
            className="flex flex-col items-center justify-center py-16 text-center"
            style={{ maxWidth: 420, margin: '0 auto' }}
          >
            <div
              className="mb-4 flex items-center justify-center rounded-full"
              style={{ width: 56, height: 56, background: 'rgba(239,68,68,0.08)' }}
            >
              <AlertCircle style={{ width: 26, height: 26, color: '#EF4444' }} />
            </div>
            <p
              className="font-display font-semibold"
              style={{ fontSize: 18, lineHeight: '26px', color: '#0D2630' }}
            >
              Failed to load records
            </p>
            <p
              className="mt-1.5 font-sans"
              style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}
            >
              Something went wrong while fetching medical records. Please try again.
            </p>
            <button
              type="button"
              onClick={handleRetry}
              className="mt-5 flex items-center gap-2 font-sans font-semibold transition-colors duration-150 hover:bg-[rgba(0,100,130,0.06)] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
              style={{
                height: 40,
                borderRadius: 10,
                padding: '0 20px',
                border: '1px solid rgba(0,100,130,0.18)',
                background: '#FFFFFF',
                fontSize: 14,
                lineHeight: '22px',
                color: '#0D2630',
              }}
            >
              <RefreshCw style={{ width: 15, height: 15 }} />
              Retry
            </button>
          </div>
        )}

        {/* ── Loaded ───────────────────────────────────────────────────────────── */}
        {pageState === 'loaded' && (
          <>
            {/* Metric cards */}
            <div className="mb-5 grid grid-cols-2 gap-3 sm:mb-6 lg:flex lg:gap-[60px]">
              {metrics.map((m) => (
                <div
                  key={m.label}
                  className="flex items-center gap-3 lg:w-[200px] lg:shrink-0"
                  style={{
                    minHeight: 64,
                    borderRadius: 12,
                    borderTop: '1px solid #0064821F',
                    borderRight: '1px solid #0064821F',
                    borderBottom: '1px solid #0064821F',
                    borderLeft: `3px solid ${m.borderLeft}`,
                    padding: '12px 16px',
                    background: m.bg,
                  }}
                >
                  <span
                    className="font-display shrink-0 font-semibold"
                    style={{ fontSize: 26, lineHeight: '34px', color: m.color }}
                  >
                    {m.value}
                  </span>
                  <span
                    className="font-sans"
                    style={{ fontSize: 14, lineHeight: '20px', color: '#4A7080' }}
                  >
                    {m.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Search bar */}
            <div
              className="mb-3 flex items-center gap-3 px-3 sm:mb-4 sm:px-4"
              style={{
                height: 42,
                borderRadius: 10,
                border: '1px solid #0064821F',
                background: '#FFFFFF',
              }}
            >
              <Search style={{ width: 16, height: 16, color: '#8A98A3', flexShrink: 0 }} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, MRN, or record title..."
                className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-[#8A98A3]"
                style={{ fontSize: 14, lineHeight: '22px', color: '#0D2630' }}
              />
            </div>

            {/* Tab bar */}
            <div
              className="mb-3 flex gap-1 overflow-x-auto sm:mb-4 sm:gap-[50px]"
              style={{
                borderRadius: 12,
                padding: 4,
                background: '#8A98A333',
              }}
            >
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className="flex shrink-0 items-center gap-1.5 rounded-[9px] px-3 font-sans font-semibold whitespace-nowrap transition-all duration-150 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none sm:flex-1 sm:justify-center sm:gap-2 sm:px-4"
                    style={{
                      fontSize: 14,
                      lineHeight: '22px',
                      height: 34,
                      color: isActive ? '#0D2630' : '#4A7080',
                      background: isActive ? '#FFFFFF' : 'transparent',
                      boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.10)' : 'none',
                    }}
                  >
                    {tab.label}
                    <span
                      className="flex items-center justify-center rounded-full font-bold"
                      style={{
                        minWidth: 22,
                        height: 22,
                        fontSize: 14,
                        padding: '0 5px',
                        background: isActive ? 'rgba(0,180,216,0.12)' : 'rgba(138,152,163,0.20)',
                        color: isActive ? '#00B4D8' : '#4A7080',
                      }}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Record rows */}
            <div className="flex flex-col gap-2">
              {filtered.length === 0 ? (
                <div
                  className="flex flex-col items-center justify-center py-16 text-center"
                  style={{ color: '#4A7080' }}
                >
                  <ClipboardList
                    style={{ width: 40, height: 40, opacity: 0.4, marginBottom: 12 }}
                  />
                  <p className="font-sans font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                    No records found
                  </p>
                  <p className="mt-1" style={{ fontSize: 14 }}>
                    Try adjusting your search or filter.
                  </p>
                </div>
              ) : (
                filtered.map((record) => {
                  const typeCfg = RECORD_TYPE_CFG[record.type];
                  const statusCfg = STATUS_CFG[record.status];
                  const Icon = typeCfg.icon;
                  const isCriticalRow = record.isCritical;

                  return (
                    <div
                      key={record.id}
                      className="flex cursor-pointer items-center gap-3 px-3 transition-shadow duration-150 hover:shadow-sm sm:gap-4 sm:px-4"
                      style={{
                        minHeight: 70,
                        borderRadius: 12,
                        background: '#FFFFFF',
                        borderTop: '1px solid #0064821F',
                        borderRight: '1px solid #0064821F',
                        borderBottom: '1px solid #0064821F',
                        borderLeft: isCriticalRow ? '3px solid #EF4444' : '1px solid #0064821F',
                        paddingTop: 12,
                        paddingBottom: 12,
                      }}
                      onClick={() => setSelectedMrn(record.mrn)}
                    >
                      {/* Icon circle */}
                      <div
                        className="flex shrink-0 items-center justify-center rounded-full"
                        style={{ width: 40, height: 40, background: typeCfg.iconBg }}
                      >
                        <Icon style={{ width: 18, height: 18, color: typeCfg.iconColor }} />
                      </div>

                      {/* Title + meta */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p
                            className="truncate font-sans font-semibold"
                            style={{ fontSize: 14, lineHeight: '22px', color: '#0D2630' }}
                          >
                            {record.title}
                          </p>
                          {record.isCritical && (
                            <AlertTriangle
                              aria-hidden
                              style={{ width: 14, height: 14, color: '#EF4444', flexShrink: 0 }}
                            />
                          )}
                        </div>
                        <p
                          className="truncate"
                          style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}
                        >
                          {record.patientName}
                          <span className="hidden sm:inline"> · {record.mrn}</span> · {record.date}
                          <span className="hidden sm:inline"> · {record.provider}</span>
                        </p>
                      </div>

                      {/* Type badge — desktop only */}
                      <span
                        className="hidden shrink-0 rounded-full px-3 py-0.5 font-sans font-semibold tracking-wide sm:inline"
                        style={{
                          fontSize: 14,
                          lineHeight: '22px',
                          color: typeCfg.badgeColor,
                          border: `1px solid ${typeCfg.badgeBorder}`,
                          background: typeCfg.badgeBg,
                        }}
                      >
                        {typeCfg.label}
                      </span>

                      {/* Status badge */}
                      <span
                        className="shrink-0 rounded-full px-2.5 py-0.5 font-sans font-medium sm:px-3"
                        style={{
                          fontSize: 14,
                          lineHeight: '22px',
                          color: statusCfg.color,
                          border: `1px solid ${statusCfg.border}`,
                          background: statusCfg.bg,
                        }}
                      >
                        {statusCfg.label}
                      </span>

                      <ChevronRight
                        style={{ width: 16, height: 16, color: '#8A98A3', flexShrink: 0 }}
                      />
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </main>

      {/* ── Patient records modal ───────────────────────────────────────────── */}
      {patientRecords.length > 0 && (
        <PatientRecordsModal records={patientRecords} onClose={() => setSelectedMrn(null)} />
      )}
    </>
  );
}
