'use client';

import {
  AlertCircle,
  ArrowLeftRight,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Download,
  Filter as FilterIcon,
  FlaskConical,
  HeartPulse,
  History,
  List,
  LogOut,
  NotebookPen,
  Pill,
  RefreshCw,
  Rows3,
  Stethoscope,
  UserRound,
  Users,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import { AllergyBanner } from '@components/clinical/AllergyBanner';
import { FormDateInput } from '@components/shared/FormDateInput';
import { ModalLoadingFallback } from '@components/shared/ModalLoadingFallback';
import { RowMenuPortal } from '@components/shared/RowMenuPortal';
import { ROUTES } from '@/constants/routes';
import { formatHumanDate, formatTime } from '@/utils/datetime';
import { downloadPDF, escapeHtml } from '@/utils/export';
import { type NursePatient } from '@/features/nursing/__mocks__/myPatientsFixtures';
import { getPatientRecord } from '@/features/nursing/__mocks__/patientRecordFixtures';
import {
  getClinicalTimelineForPatient,
  TIMELINE_CATEGORIES,
  TIMELINE_CATEGORY_CFG,
  type ClinicalTimelineCategory,
  type ClinicalTimelineEvent,
} from '@/features/nursing/__mocks__/clinicalTimelineFixtures';
import { NursePatientPicker } from './NursePatientPicker';

const TimelineEventDetailModal = dynamic(
  () => import('./TimelineEventDetailModal').then((m) => m.TimelineEventDetailModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

type PageState = 'loading' | 'loaded' | 'error';
type FilterKey = 'All' | ClinicalTimelineCategory;
type ViewMode = 'timeline' | 'list';

const PAGE_SIZE = 8;

const CATEGORY_ICON: Record<ClinicalTimelineCategory, typeof ClipboardList> = {
  Registration: ClipboardList,
  Assessment: Stethoscope,
  Vitals: HeartPulse,
  Medication: Pill,
  Laboratory: FlaskConical,
  Notes: NotebookPen,
  Transfer: ArrowLeftRight,
  Discharge: LogOut,
};

const CARE_STATUS_CFG: Record<string, { color: string; border: string; bg: string }> = {
  'In Progress': { color: '#3B82F6', border: 'rgba(59,130,246,0.4)', bg: 'rgba(59,130,246,0.08)' },
  Stable: { color: '#22C55E', border: 'rgba(34,197,94,0.4)', bg: 'rgba(34,197,94,0.08)' },
  'Awaiting Discharge': {
    color: '#F59E0B',
    border: 'rgba(245,158,11,0.4)',
    bg: 'rgba(245,158,11,0.08)',
  },
};

// ── Skeletons ──────────────────────────────────────────────────────────────────

function SkeletonEventRow({ isLast }: { isLast: boolean }) {
  return (
    <div className="flex gap-4">
      <div className="flex w-11 shrink-0 justify-center">
        <div className="size-11 shrink-0 animate-pulse rounded-full bg-slate-200" />
      </div>
      <div
        className="min-w-0 flex-1 animate-pulse rounded-[12px] p-4"
        style={{
          background: '#FFFFFF',
          border: '1px solid rgba(0,100,130,0.12)',
          marginBottom: isLast ? 0 : 16,
        }}
      >
        <div className="h-4 w-28 rounded-md bg-slate-100" />
        <div className="mt-3 h-5 w-full max-w-md rounded-md bg-slate-100" />
        <div className="mt-2 h-4 w-40 rounded-md bg-slate-100" />
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export function ClinicalTimelineWorkspace() {
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
              Clinical Timeline
            </h1>
            <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
              Chronological history of patient care and clinical events.
            </p>
            <div className="mt-5">
              <NursePatientPicker
                onSelect={setSelectedPatient}
                description="Choose a patient from your assigned roster to view their clinical timeline."
                actionVerb="clinical timeline"
              />
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <PatientClinicalTimelinePanel
      key={selectedPatient.id}
      patient={selectedPatient}
      onChangePatient={() => setSelectedPatient(null)}
    />
  );
}

function PatientClinicalTimelinePanel({
  patient,
  onChangePatient,
}: {
  patient: NursePatient;
  onChangePatient: () => void;
}) {
  const router = useRouter();
  const record = getPatientRecord(patient.id)!;

  const [pageState, setPageState] = useState<PageState>('loading');
  const [activeFilter, setActiveFilter] = useState<FilterKey>('All');
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [detailEvent, setDetailEvent] = useState<ClinicalTimelineEvent | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const filterButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setPageState('loaded'), 800);
    return () => clearTimeout(t);
  }, []);

  function handleRetry() {
    setPageState('loading');
    setTimeout(() => setPageState('loaded'), 800);
  }

  const allEvents = useMemo(() => getClinicalTimelineForPatient(patient.id), [patient.id]);

  const categoryCounts = useMemo(() => {
    const counts: Partial<Record<ClinicalTimelineCategory, number>> = {};
    allEvents.forEach((e) => {
      counts[e.category] = (counts[e.category] ?? 0) + 1;
    });
    return counts;
  }, [allEvents]);

  const dateFiltered = useMemo(() => {
    if (!dateFrom && !dateTo) return allEvents;
    return allEvents.filter((e) => {
      const t = new Date(e.occurredAt).getTime();
      if (dateFrom && t < new Date(`${dateFrom}T00:00:00`).getTime()) return false;
      if (dateTo && t > new Date(`${dateTo}T23:59:59`).getTime()) return false;
      return true;
    });
  }, [allEvents, dateFrom, dateTo]);

  const filteredEvents = useMemo(() => {
    if (activeFilter === 'All') return dateFiltered;
    return dateFiltered.filter((e) => e.category === activeFilter);
  }, [dateFiltered, activeFilter]);

  const visibleEvents = filteredEvents.slice(0, visibleCount);
  const hasMore = visibleCount < filteredEvents.length;
  const hasDateFilter = dateFrom !== '' || dateTo !== '';
  const hasActiveFilters = activeFilter !== 'All' || hasDateFilter;

  function selectFilter(key: FilterKey) {
    setActiveFilter(key);
    setVisibleCount(PAGE_SIZE);
  }

  function clearAllFilters() {
    setActiveFilter('All');
    setDateFrom('');
    setDateTo('');
    setVisibleCount(PAGE_SIZE);
    setFilterOpen(false);
  }

  function handleExport() {
    const filterLabel =
      activeFilter === 'All' ? 'All Events' : TIMELINE_CATEGORY_CFG[activeFilter].label;
    const rows = filteredEvents
      .map(
        (e) => `<tr>
          <td>${escapeHtml(TIMELINE_CATEGORY_CFG[e.category].label)}</td>
          <td>${escapeHtml(e.title)}</td>
          <td>${escapeHtml(formatHumanDate(e.occurredAt))} ${escapeHtml(formatTime(e.occurredAt))}</td>
          <td>${escapeHtml(e.summary)}</td>
          <td>${escapeHtml(e.actor)} — ${escapeHtml(e.actorRole)}</td>
        </tr>`,
      )
      .join('');
    downloadPDF(
      `Clinical-Timeline-${patient.mrn}`,
      `<h1>Clinical Timeline</h1>
       <p class="meta">${escapeHtml(patient.patientName)} · ${escapeHtml(patient.mrn)} — ${escapeHtml(filterLabel)}</p>
       <hr />
       <table>
         <thead><tr><th>Category</th><th>Event</th><th>When</th><th>Details</th><th>Recorded By</th></tr></thead>
         <tbody>${rows}</tbody>
       </table>`,
    );
  }

  const statusCfg = CARE_STATUS_CFG[patient.careStatus] ?? CARE_STATUS_CFG['Stable']!;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto max-w-[1200px] px-4 py-4 sm:px-6 sm:py-5">
          {/* ── Breadcrumb ──────────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-1.5" style={{ fontSize: 14 }}>
            <button
              type="button"
              onClick={() => router.push(ROUTES.nurse)}
              className={`font-sans transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
              style={{ color: '#4A7080' }}
            >
              Patient Care
            </button>
            <span style={{ color: '#8A98A3' }}>/</span>
            <span className="font-sans font-medium" style={{ color: '#0D2630' }}>
              Clinical Timeline
            </span>
          </div>

          {/* ── Header ──────────────────────────────────────────────────── */}
          <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1
                className="font-display font-semibold"
                style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
              >
                Clinical Timeline
              </h1>
              <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                Chronological history of patient care and clinical events.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => setViewMode((m) => (m === 'timeline' ? 'list' : 'timeline'))}
                className={`flex h-11 items-center gap-2 rounded-[10px] px-4 font-sans font-semibold transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid rgba(0,100,130,0.15)',
                  color: '#0D2630',
                  fontSize: 14,
                }}
              >
                {viewMode === 'timeline' ? (
                  <List style={{ width: 16, height: 16, color: '#4A7080' }} />
                ) : (
                  <Rows3 style={{ width: 16, height: 16, color: '#4A7080' }} />
                )}
                {viewMode === 'timeline' ? 'View as List' : 'View as Timeline'}
              </button>
              <button
                type="button"
                onClick={handleExport}
                disabled={pageState !== 'loaded' || filteredEvents.length === 0}
                className={`flex h-11 items-center gap-2 rounded-[10px] px-4 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
                style={{ background: '#00B4D8', fontSize: 14 }}
              >
                <Download style={{ width: 16, height: 16 }} />
                Export Timeline
              </button>
            </div>
          </div>

          {/* ── Patient banner card ─────────────────────────────────────── */}
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
                  <span
                    className="rounded-full px-2.5 py-0.5 font-sans font-medium whitespace-nowrap"
                    style={{
                      fontSize: 14,
                      color: patient.isPreAdmission ? '#F59E0B' : '#22C55E',
                      border: `1px solid ${patient.isPreAdmission ? 'rgba(245,158,11,0.4)' : 'rgba(34,197,94,0.4)'}`,
                      background: patient.isPreAdmission
                        ? 'rgba(245,158,11,0.08)'
                        : 'rgba(34,197,94,0.08)',
                    }}
                  >
                    {patient.isPreAdmission ? 'Pre-Admission' : 'Inpatient'}
                  </span>
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span style={{ fontSize: 14, color: '#00B4D8' }}>MRN: {patient.mrn}</span>
                  <span style={{ fontSize: 14, color: '#8A98A3' }}>
                    {patient.age} Y / {patient.gender}
                  </span>
                  <span style={{ fontSize: 14, color: '#8A98A3' }}>
                    {patient.ward} · {patient.bed}
                  </span>
                </div>
                <p className="mt-0.5" style={{ fontSize: 14, color: '#8A98A3' }}>
                  Attending Doctor: {patient.doctorName}
                </p>
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

            <div className="flex shrink-0 flex-col gap-2 lg:w-[220px]">
              <div className="flex items-center justify-between gap-4">
                <span style={{ fontSize: 14, color: '#8A98A3' }}>Diagnosis</span>
                <span className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                  {patient.diagnosis}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span style={{ fontSize: 14, color: '#8A98A3' }}>Allergies</span>
                <span className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                  {record.allergies.length
                    ? record.allergies.map((a) => a.substance).join(', ')
                    : 'NKDA'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span style={{ fontSize: 14, color: '#8A98A3' }}>Admission Date</span>
                <span className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                  {formatHumanDate(record.admissionDate)} ({record.lengthOfStayDays} days)
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span style={{ fontSize: 14, color: '#8A98A3' }}>Current Status</span>
                <span
                  className="rounded-full px-2.5 py-0.5 font-sans font-medium whitespace-nowrap"
                  style={{
                    fontSize: 14,
                    color: statusCfg.color,
                    border: `1px solid ${statusCfg.border}`,
                    background: statusCfg.bg,
                  }}
                >
                  {patient.careStatus}
                </span>
              </div>
            </div>
          </div>

          <AllergyBanner allergies={record.allergies} className="mt-4" />

          {/* ── Category filter pills + Filter button ────────────────────── */}
          <div className="mt-4 flex flex-wrap items-center gap-3 sm:flex-nowrap">
            <div className="flex min-w-0 flex-1 [scrollbar-width:none] flex-nowrap gap-2 overflow-x-auto scroll-smooth [&::-webkit-scrollbar]:hidden">
              {(['All', ...TIMELINE_CATEGORIES] as FilterKey[]).map((key) => {
                const active = activeFilter === key;
                const label = key === 'All' ? 'All Events' : TIMELINE_CATEGORY_CFG[key].label;
                const count = key === 'All' ? dateFiltered.length : (categoryCounts[key] ?? 0);
                const color = key === 'All' ? '#25464D' : TIMELINE_CATEGORY_CFG[key].color;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => selectFilter(key)}
                    aria-pressed={active}
                    className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 font-sans font-medium whitespace-nowrap transition-colors duration-150 ${FOCUS_RING}`}
                    style={
                      active
                        ? {
                            background: color,
                            border: `1px solid ${color}`,
                            color: '#FFFFFF',
                            fontSize: 14,
                          }
                        : {
                            background: '#FFFFFF',
                            border: `1px solid ${color}66`,
                            color,
                            fontSize: 14,
                          }
                    }
                  >
                    {label}
                    <span
                      className="rounded-full px-1.5"
                      style={{
                        background: active ? 'rgba(255,255,255,0.25)' : `${color}1A`,
                        fontSize: 14,
                      }}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              ref={filterButtonRef}
              type="button"
              onClick={() => setFilterOpen((v) => !v)}
              aria-pressed={hasDateFilter}
              className={`flex h-11 shrink-0 items-center gap-2 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
              style={{
                background: '#FFFFFF',
                border: `1px solid ${hasDateFilter ? '#00B4D8' : 'rgba(0,100,130,0.15)'}`,
                color: hasDateFilter ? '#00B4D8' : '#0D2630',
                fontSize: 14,
              }}
            >
              <FilterIcon style={{ width: 16, height: 16 }} />
              Filter
            </button>
            <RowMenuPortal
              open={filterOpen}
              anchorRef={filterButtonRef}
              onClose={() => setFilterOpen(false)}
              width={280}
            >
              <div className="px-4 py-3.5">
                <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
                  Filter by date
                </p>
                <div className="mt-3 flex flex-col gap-2.5">
                  <div>
                    <label
                      className="font-sans font-medium"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      From
                    </label>
                    <FormDateInput
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="mt-1 h-10 w-full"
                    />
                  </div>
                  <div>
                    <label
                      className="font-sans font-medium"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      To
                    </label>
                    <FormDateInput
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="mt-1 h-10 w-full"
                    />
                  </div>
                </div>
                <div className="mt-3.5 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDateFrom('');
                      setDateTo('');
                    }}
                    className={`font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                    style={{ fontSize: 14, color: '#4A7080' }}
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterOpen(false)}
                    className={`flex h-9 items-center rounded-[8px] px-3.5 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                    style={{ background: '#00B4D8', fontSize: 14 }}
                  >
                    Apply
                  </button>
                </div>
              </div>
            </RowMenuPortal>
          </div>

          {/* ── Body: timeline + sidebar ──────────────────────────────────── */}
          <div className="mt-4 flex flex-col gap-5 lg:grid lg:grid-cols-[1fr_300px] lg:items-start">
            {/* ── Timeline / list ───────────────────────────────────────── */}
            <div>
              {pageState === 'loading' ? (
                <div>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <SkeletonEventRow key={i} isLast={i === 3} />
                  ))}
                </div>
              ) : pageState === 'error' ? (
                <div
                  className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-[12px] bg-white py-10 text-center"
                  style={{ border: '1px solid rgba(0,100,130,0.12)' }}
                >
                  <AlertCircle style={{ width: 36, height: 36, color: '#EF4444' }} />
                  <p className="font-sans font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                    Failed to load clinical timeline
                  </p>
                  <button
                    type="button"
                    onClick={handleRetry}
                    className={`flex items-center gap-2 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-80 ${FOCUS_RING}`}
                    style={{
                      height: 40,
                      borderRadius: 12,
                      padding: '0 20px',
                      background: '#00B4D8',
                      fontSize: 14,
                    }}
                  >
                    <RefreshCw style={{ width: 16, height: 16 }} />
                    Retry
                  </button>
                </div>
              ) : filteredEvents.length === 0 ? (
                <div
                  className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-[12px] bg-white py-16 text-center"
                  style={{ border: '1px solid rgba(0,100,130,0.12)' }}
                >
                  <div
                    className="flex size-14 items-center justify-center rounded-full"
                    style={{ background: 'rgba(226,237,241,0.6)' }}
                  >
                    <History style={{ width: 24, height: 24, color: '#8A98A3' }} />
                  </div>
                  <div>
                    <p className="text-base leading-6 font-medium" style={{ color: '#4A7080' }}>
                      No events recorded for this filter
                    </p>
                    <p className="mt-0.5" style={{ fontSize: 14, color: '#8A98A3' }}>
                      Try a different category or date range
                    </p>
                  </div>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={clearAllFilters}
                      className={`mt-1 font-sans font-medium transition-colors duration-150 hover:underline ${FOCUS_RING}`}
                      style={{ fontSize: 14, color: '#00B4D8' }}
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
              ) : viewMode === 'list' ? (
                <div
                  className="overflow-hidden rounded-[12px]"
                  style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                >
                  <div className="overflow-x-auto scroll-smooth">
                    <div className="min-w-[720px]">
                      <div
                        className="flex"
                        style={{
                          background: 'rgba(226,237,241,0.4)',
                          borderBottom: '1px solid #E6F8FD',
                        }}
                      >
                        <span
                          className="w-36 shrink-0 py-2.5 pr-2 pl-4 font-sans font-bold tracking-wider uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Category
                        </span>
                        <span
                          className="min-w-0 flex-1 py-2.5 pr-2 font-sans font-bold tracking-wider uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Event
                        </span>
                        <span
                          className="w-40 shrink-0 py-2.5 pr-2 font-sans font-bold tracking-wider uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          When
                        </span>
                        <span
                          className="w-40 shrink-0 py-2.5 pr-2 font-sans font-bold tracking-wider uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Recorded By
                        </span>
                        <span
                          className="w-28 shrink-0 py-2.5 pr-4 text-right font-sans font-bold tracking-wider uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Actions
                        </span>
                      </div>
                      {visibleEvents.map((event, idx) => {
                        const cfg = TIMELINE_CATEGORY_CFG[event.category];
                        return (
                          <div
                            key={event.id}
                            className="flex items-center"
                            style={{
                              borderBottom:
                                idx === visibleEvents.length - 1
                                  ? undefined
                                  : '1px solid rgba(0,100,130,0.08)',
                            }}
                          >
                            <div className="w-36 shrink-0 py-3 pr-2 pl-4">
                              <span
                                className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium whitespace-nowrap"
                                style={{
                                  fontSize: 14,
                                  color: cfg.color,
                                  background: cfg.badgeBg,
                                  border: `1px solid ${cfg.badgeBorder}`,
                                }}
                              >
                                {cfg.label}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1 py-3 pr-2">
                              <p
                                className="truncate font-sans font-medium"
                                style={{ fontSize: 14, color: '#0D2630' }}
                              >
                                {event.title}
                              </p>
                            </div>
                            <div className="w-40 shrink-0 py-3 pr-2">
                              <p style={{ fontSize: 14, color: '#4A7080' }}>
                                {formatHumanDate(event.occurredAt)}
                              </p>
                              <p style={{ fontSize: 14, color: '#8A98A3' }}>
                                {formatTime(event.occurredAt)}
                              </p>
                            </div>
                            <div className="w-40 shrink-0 py-3 pr-2">
                              <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                                {event.actor}
                              </p>
                            </div>
                            <div className="flex w-28 shrink-0 justify-end py-3 pr-4">
                              <button
                                type="button"
                                onClick={() => setDetailEvent(event)}
                                aria-label={`View details for ${event.title}`}
                                className={`flex size-11 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
                              >
                                <ChevronRight style={{ width: 16, height: 16, color: '#4A7080' }} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  {visibleEvents.map((event, idx) => {
                    const cfg = TIMELINE_CATEGORY_CFG[event.category];
                    const Icon = CATEGORY_ICON[event.category];
                    const isLast = idx === visibleEvents.length - 1;
                    return (
                      <div key={event.id} className="flex gap-4">
                        <div className="relative flex w-11 shrink-0 justify-center">
                          <div
                            className="z-10 flex size-11 shrink-0 items-center justify-center rounded-full border-[3px] border-white"
                            style={{
                              background: cfg.badgeBg,
                              boxShadow: '0 1px 3px 0px rgba(0,0,0,0.10)',
                            }}
                          >
                            <Icon style={{ width: 18, height: 18, color: cfg.color }} />
                          </div>
                          {!isLast && (
                            <div
                              className="absolute top-11 left-1/2 w-px -translate-x-1/2"
                              style={{
                                background: 'rgba(0,100,130,0.15)',
                                height: 'calc(100% + 16px)',
                              }}
                            />
                          )}
                        </div>

                        <div
                          className="min-w-0 flex-1 rounded-[12px] p-4"
                          style={{
                            background: '#FFFFFF',
                            border: `1px solid ${cfg.badgeBorder}`,
                            marginBottom: isLast ? 0 : 16,
                          }}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <span
                                className="font-sans font-semibold"
                                style={{ fontSize: 14, color: cfg.color }}
                              >
                                {cfg.label}
                              </span>
                              <p
                                className="mt-1 font-sans font-medium"
                                style={{ fontSize: 14, color: '#0D2630' }}
                              >
                                {event.title}
                              </p>
                              <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
                                {event.summary}
                              </p>
                            </div>
                            <div className="shrink-0 text-right">
                              <p style={{ fontSize: 14, color: '#2F3A40' }}>
                                {formatHumanDate(event.occurredAt)}
                              </p>
                              <p style={{ fontSize: 14, color: '#2F3A40' }}>
                                {formatTime(event.occurredAt)}
                              </p>
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-1.5">
                              <UserRound style={{ width: 14, height: 14, color: '#8A98A3' }} />
                              <div className="min-w-0">
                                <p
                                  className="truncate font-sans font-medium"
                                  style={{ fontSize: 14, color: '#0D2630' }}
                                >
                                  {event.actor}
                                </p>
                                <p style={{ fontSize: 14, color: '#8A98A3' }}>{event.actorRole}</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setDetailEvent(event)}
                              className={`flex h-9 shrink-0 items-center gap-1 rounded-[8px] px-3 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                              style={{
                                border: '1px solid rgba(0,100,130,0.15)',
                                color: '#0D2630',
                                fontSize: 14,
                              }}
                            >
                              View Details
                              <ChevronRight style={{ width: 14, height: 14 }} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {pageState === 'loaded' && hasMore && (
                <div className="mt-2 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                    className={`flex h-11 items-center gap-2 rounded-[10px] px-5 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid rgba(0,100,130,0.15)',
                      color: '#0D2630',
                      fontSize: 14,
                    }}
                  >
                    Load More Events
                    <ChevronRight style={{ width: 14, height: 14, transform: 'rotate(90deg)' }} />
                  </button>
                </div>
              )}
            </div>

            {/* ── Sidebar ───────────────────────────────────────────────── */}
            <div className="flex flex-col gap-4">
              {/* Patient Summary */}
              <div
                className="rounded-[12px] p-4 sm:p-5"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <h2
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Patient Summary
                </h2>
                <div className="mt-3 flex flex-col gap-2.5">
                  {[
                    ['MRN', patient.mrn],
                    ['Age / Gender', `${patient.age} Y / ${patient.gender}`],
                    ['Ward / Bed', `${patient.ward} / ${patient.bed}`],
                    ['Attending Doctor', patient.doctorName],
                    ['Admission Date', formatHumanDate(record.admissionDate)],
                    [
                      'Length of Stay',
                      `${record.lengthOfStayDays} day${record.lengthOfStayDays === 1 ? '' : 's'}`,
                    ],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-start justify-between gap-3">
                      <span style={{ fontSize: 14, color: '#8A98A3' }}>{label}</span>
                      <span
                        className="text-right font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {value}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between gap-3">
                    <span style={{ fontSize: 14, color: '#8A98A3' }}>Current Status</span>
                    <span
                      className="rounded-full px-2.5 py-0.5 font-sans font-medium whitespace-nowrap"
                      style={{
                        fontSize: 14,
                        color: statusCfg.color,
                        border: `1px solid ${statusCfg.border}`,
                        background: statusCfg.bg,
                      }}
                    >
                      {patient.careStatus}
                    </span>
                  </div>
                </div>
              </div>

              {/* Timeline Overview */}
              <div
                className="rounded-[12px] p-4 sm:p-5"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <h2
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Timeline Overview
                </h2>
                <div className="mt-3 flex flex-col gap-2.5">
                  {TIMELINE_CATEGORIES.map((cat) => {
                    const cfg = TIMELINE_CATEGORY_CFG[cat];
                    return (
                      <div key={cat} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="size-2.5 shrink-0 rounded-full"
                            style={{ background: cfg.color }}
                          />
                          <span style={{ fontSize: 14, color: '#4A7080' }}>{cfg.label}</span>
                        </div>
                        <span
                          className="font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {categoryCounts[cat] ?? 0}
                        </span>
                      </div>
                    );
                  })}
                  <div
                    className="mt-1 flex items-center justify-between gap-3 pt-2.5"
                    style={{ borderTop: '1px solid rgba(0,100,130,0.1)' }}
                  >
                    <span
                      className="font-sans font-semibold"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      Total Events
                    </span>
                    <span
                      className="font-sans font-semibold"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {allEvents.length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div
                className="rounded-[12px] p-4 sm:p-5"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <h2
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Quick Actions
                </h2>
                <div className="mt-3 flex flex-col gap-1">
                  {[
                    {
                      icon: NotebookPen,
                      label: 'Add Nursing Note',
                      href: ROUTES.nurseNursingNotes,
                    },
                    {
                      icon: Users,
                      label: 'View Full Patient Record',
                      href: ROUTES.nursePatientRecord(patient.id),
                    },
                    { icon: ClipboardCheck, label: 'View Care Plan', href: ROUTES.nurseCarePlans },
                    {
                      icon: FlaskConical,
                      label: 'View Laboratory Results',
                      href: ROUTES.nurseLaboratory,
                    },
                    { icon: LogOut, label: 'View Discharge Summary', href: ROUTES.nurseDischarges },
                  ].map((action) => (
                    <button
                      key={action.label}
                      type="button"
                      onClick={() => router.push(action.href)}
                      className={`flex items-center gap-2.5 rounded-[8px] px-2.5 py-2.5 text-left font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      <action.icon style={{ width: 16, height: 16, color: '#00B4D8' }} />
                      <span className="min-w-0 flex-1 truncate">{action.label}</span>
                      <ChevronRight style={{ width: 14, height: 14, color: '#8A98A3' }} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Important note */}
              <div
                className="flex items-start gap-2.5 rounded-[12px] p-4"
                style={{
                  background: 'rgba(0,180,216,0.06)',
                  border: '1px solid rgba(0,180,216,0.2)',
                }}
              >
                <AlertCircle
                  className="mt-0.5 shrink-0"
                  style={{ width: 16, height: 16, color: '#00B4D8' }}
                />
                <div>
                  <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
                    Important Note
                  </p>
                  <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
                    This timeline is read-only. No clinical data can be edited from this screen.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {detailEvent && (
        <TimelineEventDetailModal
          event={detailEvent}
          patientName={patient.patientName}
          mrn={patient.mrn}
          onClose={() => setDetailEvent(null)}
        />
      )}
    </div>
  );
}
