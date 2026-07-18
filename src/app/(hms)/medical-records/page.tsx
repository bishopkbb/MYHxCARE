'use client';

import {
  AlertCircle,
  AlertTriangle,
  ChevronRight,
  ClipboardList,
  ListFilter,
  RefreshCw,
  Search,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

import {
  MOCK_MEDICAL_RECORDS,
  type MedicalRecord,
  type RecordStatus,
  type RecordType,
} from '@/features/medical-records/__mocks__/medicalRecordFixtures';
import { ExportMenu } from '@/components/ExportMenu';
import { ModalLoadingFallback } from '@components/shared/ModalLoadingFallback';
import { downloadCSV, downloadPDF, escapeHtml } from '@/utils/export';
import { RECORD_TYPE_CFG, STATUS_CFG } from './config';

// Opened only when a record row is clicked — never needed for the initial
// list paint, so its code (plus the detail/list sub-views it owns) stays out
// of this page's main bundle until then.
const PatientRecordsModal = dynamic(
  () => import('./PatientRecordsModal').then((m) => m.PatientRecordsModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

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

// ── Helpers ───────────────────────────────────────────────────────────────────

function countByType(records: MedicalRecord[], type: RecordType) {
  return records.filter((r) => r.type === type).length;
}

function countByStatus(records: MedicalRecord[], ...statuses: RecordStatus[]) {
  return records.filter((r) => statuses.includes(r.status)).length;
}

// ── Export helpers ────────────────────────────────────────────────────────────

function exportRecordsAsPDF(records: MedicalRecord[], title = 'Medical Records') {
  const now = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Lagos',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date());
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

// ── Page ───────────────────────────────────────────────────────────────────────

export default function MedicalRecordsPage() {
  const [pageState, setPageState] = useState<PageState>('loading');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<TabId>('all');
  const [selectedMrn, setSelectedMrn] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<RecordStatus | ''>('');
  const [filtersOpen, setFiltersOpen] = useState(false);

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
    const matchesStatus = !statusFilter || r.status === statusFilter;
    const matchesSearch =
      !q ||
      r.title.toLowerCase().includes(q) ||
      r.patientName.toLowerCase().includes(q) ||
      r.mrn.toLowerCase().includes(q);
    return matchesTab && matchesStatus && matchesSearch;
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
                onClick={() => setFiltersOpen((v) => !v)}
                className="flex items-center gap-2 rounded-[10px] px-3 font-sans font-semibold transition-colors duration-150 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none sm:px-4"
                style={{
                  fontSize: 14,
                  lineHeight: '22px',
                  height: 40,
                  color: filtersOpen || statusFilter ? '#00B4D8' : '#0D2630',
                  border: `1px solid ${filtersOpen || statusFilter ? '#00B4D8' : '#0064821F'}`,
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

            {/* Filter panel */}
            {filtersOpen && (
              <div
                className="mb-3 flex flex-wrap items-center gap-3 p-3 sm:mb-4 sm:p-4"
                style={{ borderRadius: 10, border: '1px solid #0064821F', background: '#FFFFFF' }}
              >
                <label className="flex items-center gap-2">
                  <span style={{ fontSize: 14, color: '#4A7080' }}>Status</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as RecordStatus | '')}
                    className="h-10 rounded-[8px] px-2.5 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40"
                    style={{ fontSize: 14, border: '1px solid #0064821F', color: '#0D2630' }}
                  >
                    <option value="">All Statuses</option>
                    {(Object.keys(STATUS_CFG) as RecordStatus[]).map((s) => (
                      <option key={s} value={s}>
                        {STATUS_CFG[s].label}
                      </option>
                    ))}
                  </select>
                </label>
                {statusFilter && (
                  <button
                    type="button"
                    onClick={() => setStatusFilter('')}
                    className="font-sans font-medium transition-opacity duration-150 hover:opacity-70 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                    style={{ fontSize: 14, color: '#00B4D8' }}
                  >
                    Clear
                  </button>
                )}
              </div>
            )}

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
              className="mb-3 flex gap-1 overflow-x-auto scroll-smooth sm:mb-4 sm:gap-[50px]"
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
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                  <div
                    className="flex size-14 items-center justify-center rounded-full"
                    style={{ background: 'rgba(226,237,241,0.6)' }}
                  >
                    <ClipboardList style={{ width: 28, height: 28, color: '#8A98A3' }} />
                  </div>
                  <p className="font-sans font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                    No records found
                  </p>
                  <p className="mt-1" style={{ fontSize: 14, color: '#4A7080' }}>
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
