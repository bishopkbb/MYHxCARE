'use client';

import {
  AlertCircle,
  AlertTriangle,
  Beaker,
  ChevronRight,
  ClipboardCheck,
  FileBarChart,
  GitCompare,
  Minus,
  Plus,
  Printer,
  RefreshCw,
  Search,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { AllergyBanner } from '@/components/clinical/AllergyBanner';
import { FilterDropdown, type FilterDef } from '@components/shared/FilterDropdown';
import { ModalLoadingFallback } from '@components/shared/ModalLoadingFallback';
import { PermissionGate } from '@components/shared/PermissionGate';
import { Tooltip } from '@components/shared/Tooltip';
import { PERMISSIONS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
import { useToast } from '@/hooks/useToast';
import { downloadPDF, escapeHtml } from '@/utils/export';
import { formatHumanDate, formatTime } from '@/utils/datetime';
import { getTriageDisplay, triageSortWeight, type TriagePriority } from '@/utils/triage';
import type { Allergy } from '@/types/patient.types';
import { useQueueEntries } from '@/features/registration/store/registrationQueueStore';
import type { QueueEntry } from '@/features/registration/__mocks__/queueFixtures';
import type { LabResultStatus } from '@/features/laboratory/__mocks__/labResultFixtures';
import { useLabResults, type LabResult } from '@/features/laboratory/store/labResultStore';
import { deriveResultCategory, type ResultCategory } from '@/features/laboratory/utils/labOrders';
import {
  deriveBloodGroup,
  deriveEmergencyContact,
  deriveLatestVitals,
  derivePriorityForEntry,
} from '@/features/emergency/__mocks__/emergencyFixtures';
import { PatientSwitcher } from '@/features/emergency/components/PatientSwitcher';
import { useTriageRecords } from '@/features/emergency/store/triageAssessmentStore';

const CompareResultsModal = dynamic(
  () => import('./CompareResultsModal').then((m) => m.CompareResultsModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

type PageState = 'loading' | 'loaded' | 'error';
type TabKey = 'All' | ResultCategory;

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const PRIORITY_COLOR: Record<TriagePriority, string> = {
  IMMEDIATE: '#DC2626',
  URGENT: '#D97706',
  LESS_URGENT: '#F59E0B',
  NON_URGENT: '#16A34A',
};
const PRIORITY_BG: Record<TriagePriority, string> = {
  IMMEDIATE: 'rgba(220,38,38,0.06)',
  URGENT: 'rgba(217,119,6,0.06)',
  LESS_URGENT: 'rgba(245,158,11,0.06)',
  NON_URGENT: 'rgba(22,163,74,0.06)',
};

const STATUS_CFG: Record<LabResultStatus, { label: string; color: string; bg: string }> = {
  ORDERED: { label: 'Ordered', color: '#4A7080', bg: 'rgba(74,112,128,0.1)' },
  SAMPLE_COLLECTED: { label: 'Sample Collected', color: '#2563EB', bg: 'rgba(37,99,235,0.1)' },
  IN_PROCESS: { label: 'In Process', color: '#D97706', bg: 'rgba(217,119,6,0.1)' },
  RESULTED: { label: 'Resulted', color: '#7C3AED', bg: 'rgba(124,58,237,0.1)' },
  VERIFIED: { label: 'Verified', color: '#16A34A', bg: 'rgba(22,163,74,0.1)' },
  REJECTED: { label: 'Rejected', color: '#DC2626', bg: 'rgba(220,38,38,0.1)' },
};

function TrendIcon({ flag }: { flag?: 'H' | 'L' | 'A' | undefined }) {
  if (flag === 'H') return <TrendingUp style={{ width: 14, height: 14, color: '#DC2626' }} />;
  if (flag === 'L') return <TrendingDown style={{ width: 14, height: 14, color: '#2563EB' }} />;
  return <Minus style={{ width: 14, height: 14, color: '#8A98A3' }} />;
}

function TrendChart({ points }: { points: { date: string; value: number }[] }) {
  if (points.length < 2) {
    return (
      <p className="py-10 text-center" style={{ fontSize: 14, color: '#8A98A3' }}>
        Not enough result history yet to show a trend for this parameter.
      </p>
    );
  }
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 640;
  const h = 160;
  const padY = 24;
  const stepX = points.length > 1 ? w / (points.length - 1) : 0;
  const coords = points.map((p, i) => ({
    x: i * stepX,
    y: padY + (h - 2 * padY) * (1 - (p.value - min) / range),
    ...p,
  }));
  return (
    <div className="overflow-x-auto scroll-smooth">
      <svg viewBox={`0 0 ${w} ${h + 40}`} style={{ width: '100%', minWidth: 480, height: 200 }}>
        <polyline
          points={coords.map((c) => `${c.x},${c.y}`).join(' ')}
          fill="none"
          stroke="#2563EB"
          strokeWidth={2}
        />
        {coords.map((c, i) => (
          <g key={i}>
            <circle cx={c.x} cy={c.y} r={4} fill="#2563EB" />
            <text x={c.x} y={c.y - 10} textAnchor="middle" fontSize={12} fill="#0D2630">
              {c.value}
            </text>
            <text x={c.x} y={h + 18} textAnchor="middle" fontSize={11} fill="#8A98A3">
              {formatHumanDate(c.date)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export function EmergencyResultsReviewWorkspace() {
  const router = useRouter();
  const toast = useToast();
  const searchParams = useSearchParams();
  const entryId = searchParams.get('entryId');

  const [pageState, setPageState] = useState<PageState>('loading');
  const [now] = useState(() => Date.now());
  const [activeTab, setActiveTab] = useState<TabKey>('All');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [testFilter, setTestFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL');
  const [openFilter, setOpenFilter] = useState<'status' | 'test' | 'date' | null>(null);
  const [search, setSearch] = useState('');
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [trendParameter, setTrendParameter] = useState<string | null>(null);
  const [compareTarget, setCompareTarget] = useState<[LabResult, LabResult] | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setPageState('loaded'), 800);
    return () => clearTimeout(t);
  }, []);

  const allEntries = useQueueEntries();
  const triageRecords = useTriageRecords();
  const allResults = useLabResults();

  function handleRetry() {
    setPageState('loading');
    setTimeout(() => setPageState('loaded'), 800);
  }

  const emergencyEntries = allEntries.filter((e) => e.isEmergency);
  const entry: QueueEntry | undefined = entryId
    ? emergencyEntries.find((e) => e.id === entryId)
    : emergencyEntries
        .slice()
        .sort(
          (a, b) =>
            triageSortWeight(triageRecords.get(a.id)?.priority ?? derivePriorityForEntry(a.id)) -
            triageSortWeight(triageRecords.get(b.id)?.priority ?? derivePriorityForEntry(b.id)),
        )[0];

  const triageRecord = entry ? triageRecords.get(entry.id) : undefined;
  const priority: TriagePriority =
    triageRecord?.priority ?? (entry ? derivePriorityForEntry(entry.id) : 'NON_URGENT');
  const attendingPhysician = triageRecord?.assignedDoctorName ?? entry?.attendingDoctor ?? '—';

  const patientResults = entry ? allResults.filter((r) => r.mrn === entry.mrn) : [];
  const sortedResults = [...patientResults].sort(
    (a, b) =>
      new Date(b.resultAt ?? b.orderedAt).getTime() - new Date(a.resultAt ?? a.orderedAt).getTime(),
  );

  const categoryCounts: Record<TabKey, number> = {
    All: sortedResults.length,
    Laboratory: 0,
    Imaging: 0,
    Cardiology: 0,
    Microbiology: 0,
  };
  for (const r of sortedResults) categoryCounts[deriveResultCategory(r)] += 1;

  const q = search.trim().toLowerCase();
  const filtered = sortedResults
    .filter((r) => activeTab === 'All' || deriveResultCategory(r) === activeTab)
    .filter((r) => statusFilter === 'ALL' || r.status === statusFilter)
    .filter((r) => testFilter === 'ALL' || r.testName === testFilter)
    .filter((r) => {
      if (dateFilter === 'ALL') return true;
      const ts = new Date(r.orderedAt).getTime();
      const dayMs = 24 * 60 * 60 * 1000;
      if (dateFilter === 'TODAY') return now - ts < dayMs;
      if (dateFilter === 'WEEK') return now - ts < 7 * dayMs;
      return true;
    })
    .filter((r) => !q || r.testName.toLowerCase().includes(q));

  const visible = showAll ? filtered : filtered.slice(0, 5);

  const selectedResult: LabResult | undefined = selectedResultId
    ? patientResults.find((r) => r.id === selectedResultId)
    : filtered[0];

  const testNameOptions = Array.from(new Set(sortedResults.map((r) => r.testName)));

  const trendParams = Array.from(
    new Set(sortedResults.flatMap((r) => (r.rows ?? []).map((row) => row.parameter))),
  );
  const activeTrendParam = trendParameter ?? trendParams[0] ?? null;
  const trendPoints = activeTrendParam
    ? sortedResults
        .filter((r) => r.rows?.some((row) => row.parameter === activeTrendParam))
        .map((r) => {
          const row = r.rows!.find((rr) => rr.parameter === activeTrendParam)!;
          const value = parseFloat(row.value);
          return { date: r.resultAt ?? r.orderedAt, value };
        })
        .filter((p) => !Number.isNaN(p.value))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    : [];

  const recentReports = sortedResults
    .filter((r) => deriveResultCategory(r) !== 'Laboratory')
    .slice(0, 3);

  function handleCompare() {
    const grouped = new Map<string, LabResult[]>();
    for (const r of patientResults) {
      if ((r.status !== 'RESULTED' && r.status !== 'VERIFIED') || !r.rows) continue;
      const arr = grouped.get(r.testName) ?? [];
      arr.push(r);
      grouped.set(r.testName, arr);
    }
    const pair = [...grouped.values()].find((arr) => arr.length >= 2);
    if (!pair) {
      toast.error(
        'Nothing to compare yet',
        'Need two resulted tests of the same type for this patient.',
      );
      return;
    }
    const sorted = pair
      .slice()
      .sort(
        (a, b) =>
          new Date(b.resultAt ?? b.orderedAt).getTime() -
          new Date(a.resultAt ?? a.orderedAt).getTime(),
      );
    setCompareTarget([sorted[0]!, sorted[1]!]);
  }

  function handlePrint() {
    if (!selectedResult) return;
    const rows = selectedResult.rows ?? [];
    const body = `
      <h1>${escapeHtml(selectedResult.testName)}</h1>
      <p class="meta">${escapeHtml(selectedResult.patientName)} · ${escapeHtml(selectedResult.mrn)} · Ordered by ${escapeHtml(selectedResult.orderedBy)}</p>
      <hr>
      ${
        rows.length > 0
          ? `<table><thead><tr><th>Parameter</th><th>Result</th><th>Reference Range</th></tr></thead><tbody>${rows
              .map(
                (r) =>
                  `<tr><td>${escapeHtml(r.parameter)}</td><td>${escapeHtml(r.value)} ${escapeHtml(r.unit ?? '')}</td><td>${escapeHtml(r.reference)}</td></tr>`,
              )
              .join('')}</tbody></table>`
          : `<p>Status: ${escapeHtml(STATUS_CFG[selectedResult.status].label)} — result not yet available.</p>`
      }
      ${selectedResult.comment ? `<h3>Notes</h3><p>${escapeHtml(selectedResult.comment)}</p>` : ''}
    `;
    downloadPDF(`result-${selectedResult.testName.toLowerCase().replace(/\s+/g, '-')}`, body);
  }

  function handleShare() {
    toast.success('Opening Messages', 'Share this result with a colleague from Messages.');
    router.push(ROUTES.messages);
  }

  const FILTER_DEFS: { key: 'status' | 'test' | 'date'; def: FilterDef }[] = [
    {
      key: 'status',
      def: {
        key: 'status',
        defaultLabel: 'All Status',
        options: (Object.keys(STATUS_CFG) as LabResultStatus[]).map((s) => ({
          value: s,
          label: STATUS_CFG[s].label,
        })),
      },
    },
    {
      key: 'test',
      def: {
        key: 'test',
        defaultLabel: 'All Tests',
        options: testNameOptions.map((t) => ({ value: t, label: t })),
      },
    },
    {
      key: 'date',
      def: {
        key: 'date',
        defaultLabel: 'All Dates',
        options: [
          { value: 'TODAY', label: 'Today' },
          { value: 'WEEK', label: 'Last 7 Days' },
        ],
      },
    },
  ];
  const filterValue: Record<string, string> = {
    status: statusFilter,
    test: testFilter,
    date: dateFilter,
  };
  const filterSetter: Record<string, (v: string) => void> = {
    status: setStatusFilter,
    test: setTestFilter,
    date: setDateFilter,
  };

  if (pageState === 'error') {
    return (
      <main className="flex flex-1 items-center justify-center" style={{ background: '#F5FBFD' }}>
        <div className="flex flex-col items-center gap-3 px-6 text-center">
          <AlertCircle style={{ width: 40, height: 40, color: '#DC2626' }} />
          <p className="font-display font-semibold" style={{ fontSize: 18, color: '#0D2630' }}>
            Couldn&apos;t load Results Review
          </p>
          <p style={{ fontSize: 14, color: '#4A7080' }}>Something went wrong. Please try again.</p>
          <button
            type="button"
            onClick={handleRetry}
            className={`mt-1 flex h-11 items-center gap-2 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
            style={{ fontSize: 14, background: '#00B4D8' }}
          >
            <RefreshCw style={{ width: 15, height: 15 }} />
            Retry
          </button>
        </div>
      </main>
    );
  }

  if (pageState === 'loading') {
    return (
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto max-w-[1400px] px-4 py-4 sm:px-6 sm:py-5">
          <div className="h-4 w-72 animate-pulse rounded bg-slate-200" />
          <div className="mt-3 h-8 w-64 animate-pulse rounded bg-slate-200" />
          <div className="mt-6 h-64 animate-pulse rounded-[12px] bg-slate-100" />
        </div>
      </main>
    );
  }

  if (!entry) {
    return (
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto flex max-w-[1400px] flex-col items-center gap-3 px-4 py-24 text-center sm:px-6">
          <div
            className="flex size-14 items-center justify-center rounded-full"
            style={{ background: 'rgba(226,237,241,0.6)' }}
          >
            <ClipboardCheck style={{ width: 28, height: 28, color: '#8A98A3' }} />
          </div>
          <p className="font-display font-semibold" style={{ fontSize: 18, color: '#0D2630' }}>
            No emergency patients in the queue
          </p>
          <p style={{ fontSize: 14, color: '#4A7080' }}>
            Results Review needs a patient currently in the emergency department.
          </p>
          <button
            type="button"
            onClick={() => router.push(ROUTES.emergencyPatientQueue)}
            className={`mt-1 flex h-11 items-center gap-2 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
            style={{ fontSize: 14, background: '#00B4D8' }}
          >
            Go to Patient Queue
          </button>
        </div>
      </main>
    );
  }

  const bloodGroup = deriveBloodGroup(entry.id);
  const emergencyContact = deriveEmergencyContact(entry.id);
  const vitals = deriveLatestVitals(entry.id);
  const allergies: Allergy[] = [];
  const isHighRisk =
    priority === 'IMMEDIATE' ||
    patientResults.some((r) => r.flag === 'CRITICAL' && !r.doctorReviewedAt);

  return (
    <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
      <div className="mx-auto max-w-[1400px] px-4 py-4 sm:px-6 sm:py-5">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => router.push(ROUTES.emergency)}
            className={`font-sans transition-colors duration-150 hover:text-[#00B4D8] ${FOCUS_RING}`}
            style={{ fontSize: 14, color: '#4A7080' }}
          >
            Home
          </button>
          <ChevronRight style={{ width: 14, height: 14, color: '#8A98A3' }} />
          <span style={{ fontSize: 14, color: '#4A7080' }}>Diagnostics</span>
          <ChevronRight style={{ width: 14, height: 14, color: '#8A98A3' }} />
          <span className="font-sans font-medium" style={{ fontSize: 14, color: '#00B4D8' }}>
            Results Review
          </span>
        </div>

        {/* Header */}
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <ClipboardCheck style={{ width: 22, height: 22, color: '#DC2626' }} />
            <div>
              <h1 className="font-display font-bold" style={{ fontSize: 24, color: '#0D2630' }}>
                Results Review
              </h1>
              <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
                View and review patient diagnostic and imaging results.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleCompare}
              className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
              style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
            >
              <GitCompare style={{ width: 15, height: 15 }} />
              Compare Results
            </button>
            <button
              type="button"
              onClick={handlePrint}
              disabled={!selectedResult}
              className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
              style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
            >
              <Printer style={{ width: 15, height: 15 }} />
              Print
            </button>
            <PermissionGate permission={PERMISSIONS.EMERGENCY_WRITE}>
              <button
                type="button"
                onClick={() => router.push(`${ROUTES.emergencyClinicalNotes}?entryId=${entry.id}`)}
                className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                style={{ fontSize: 14, background: '#0D2630' }}
              >
                <Plus style={{ width: 15, height: 15 }} />
                Add Clinical Note
              </button>
            </PermissionGate>
          </div>
        </div>

        {/* Patient context bar */}
        <div
          className="mt-4 flex flex-wrap items-center gap-x-8 gap-y-3 rounded-[12px] p-4"
          style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex size-11 shrink-0 items-center justify-center rounded-full font-sans font-semibold text-white"
              style={{ background: PRIORITY_COLOR[priority], fontSize: 14 }}
            >
              {entry.patientName
                .split(/\s+/)
                .map((n) => n[0])
                .slice(0, 2)
                .join('')}
            </div>
            <div>
              <span
                className="inline-flex items-center rounded-full px-2.5 py-0.5 font-sans font-semibold"
                style={{
                  fontSize: 14,
                  color: PRIORITY_COLOR[priority],
                  background: PRIORITY_BG[priority],
                }}
              >
                {getTriageDisplay(priority).label}
              </span>
              <p
                className="font-display mt-0.5 font-semibold"
                style={{ fontSize: 17, color: '#0D2630' }}
              >
                {entry.patientName}
              </p>
              <p style={{ fontSize: 14, color: '#4A7080' }}>
                MRN: {entry.mrn} · {entry.age} Years, {entry.gender}
              </p>
            </div>
          </div>
          <div>
            <p style={{ fontSize: 14, color: '#8A98A3' }}>Location</p>
            <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
              ER-01, Resus Bay
            </p>
          </div>
          <div>
            <p style={{ fontSize: 14, color: '#8A98A3' }}>Attending Physician</p>
            <Tooltip content={attendingPhysician}>
              <p
                className="max-w-[160px] truncate font-sans font-medium"
                style={{ fontSize: 14, color: '#0D2630' }}
              >
                {attendingPhysician}
              </p>
            </Tooltip>
          </div>
          <div>
            <p style={{ fontSize: 14, color: '#8A98A3' }}>Visit Date &amp; Time</p>
            <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
              {formatHumanDate(entry.arrivalTime)}, {formatTime(entry.arrivalTime)}
            </p>
          </div>
          <div>
            <p style={{ fontSize: 14, color: '#8A98A3' }}>Allergies</p>
            <p className="font-sans font-medium" style={{ fontSize: 14, color: '#16A34A' }}>
              No Known Allergies
            </p>
          </div>
          <div>
            <p style={{ fontSize: 14, color: '#8A98A3' }}>Triage Priority</p>
            <p
              className="font-sans font-medium"
              style={{ fontSize: 14, color: PRIORITY_COLOR[priority] }}
            >
              {getTriageDisplay(priority).label}
            </p>
          </div>
          <div className="ml-auto">
            <PatientSwitcher currentEntryId={entry.id} />
          </div>
        </div>

        <div className="mt-4">
          <AllergyBanner allergies={allergies} />
        </div>

        {/* Tabs */}
        <div
          className="mt-4 flex items-center gap-1 overflow-x-auto scroll-smooth"
          style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
        >
          {(
            [
              { key: 'All', label: 'All Results' },
              { key: 'Laboratory', label: 'Laboratory' },
              { key: 'Imaging', label: 'Imaging' },
              { key: 'Cardiology', label: 'Cardiology' },
              { key: 'Microbiology', label: 'Microbiology' },
            ] as { key: TabKey; label: string }[]
          ).map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setActiveTab(tab.key);
                  setShowAll(false);
                }}
                className={`flex shrink-0 items-center gap-1.5 px-3 py-2.5 font-sans font-medium whitespace-nowrap transition-colors duration-150 ${FOCUS_RING}`}
                style={{
                  fontSize: 14,
                  color: isActive ? '#00B4D8' : '#4A7080',
                  borderBottom: isActive ? '2px solid #00B4D8' : '2px solid transparent',
                }}
              >
                {tab.label}
                <span
                  className="rounded-full px-1.5 py-0.5 font-sans font-medium"
                  style={{
                    fontSize: 14,
                    color: isActive ? '#00B4D8' : '#8A98A3',
                    background: isActive ? 'rgba(0,180,216,0.1)' : 'rgba(138,152,163,0.12)',
                  }}
                >
                  {categoryCounts[tab.key]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Filter bar */}
        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          {FILTER_DEFS.map(({ key, def }) => (
            <FilterDropdown
              key={key}
              def={def}
              value={filterValue[key] ?? 'ALL'}
              isOpen={openFilter === key}
              onToggle={() => setOpenFilter((prev) => (prev === key ? null : key))}
              onSelect={(v) => {
                filterSetter[key]?.(v);
                setOpenFilter(null);
              }}
            />
          ))}
          <div className="relative min-w-[220px] flex-1">
            <Search
              style={{
                width: 16,
                height: 16,
                color: '#8A98A3',
                position: 'absolute',
                left: 14,
                top: '50%',
                transform: 'translateY(-50%)',
              }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search results..."
              className={`h-11 w-full rounded-[10px] py-2 pr-3.5 pl-10 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
              style={{ fontSize: 14, border: '1px solid rgba(0,100,130,0.18)', color: '#0D2630' }}
            />
          </div>
        </div>

        {/* Main grid */}
        <div className="mt-4 grid grid-cols-1 gap-4 2xl:grid-cols-[1fr_320px] 2xl:items-start">
          <div className="min-w-0">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_380px] lg:items-start">
              {/* Latest Results list */}
              <div
                className="rounded-[12px]"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <p
                  className="font-display px-4 pt-4 font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Latest Results
                </p>
                {filtered.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
                    <div
                      className="flex size-14 items-center justify-center rounded-full"
                      style={{ background: 'rgba(226,237,241,0.6)' }}
                    >
                      <Beaker style={{ width: 28, height: 28, color: '#8A98A3' }} />
                    </div>
                    <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                      No results found
                    </p>
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>
                      {sortedResults.length === 0
                        ? 'No diagnostic requests have been placed for this patient yet.'
                        : 'Try a different search term or filter combination.'}
                    </p>
                    {sortedResults.length === 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          router.push(`${ROUTES.emergencyDiagnosticRequests}?entryId=${entry.id}`)
                        }
                        className={`mt-1 font-sans font-medium transition-colors duration-150 hover:underline ${FOCUS_RING}`}
                        style={{ fontSize: 14, color: '#00B4D8' }}
                      >
                        New Diagnostic Request
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="mt-2 flex flex-col">
                      {visible.map((r) => {
                        const isSelected = selectedResult?.id === r.id;
                        const statusCfg = STATUS_CFG[r.status];
                        return (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => setSelectedResultId(r.id)}
                            className={`flex items-center gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                            style={{
                              background: isSelected ? 'rgba(0,180,216,0.06)' : 'transparent',
                              borderLeft: isSelected
                                ? '3px solid #00B4D8'
                                : '3px solid transparent',
                              borderTop: '1px solid rgba(0,100,130,0.06)',
                            }}
                          >
                            <div
                              className="flex size-9 shrink-0 items-center justify-center rounded-[8px]"
                              style={{ background: 'rgba(0,180,216,0.1)' }}
                            >
                              <Beaker style={{ width: 16, height: 16, color: '#00B4D8' }} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p
                                className="truncate font-sans font-semibold"
                                style={{ fontSize: 14, color: '#0D2630' }}
                              >
                                {r.testName}
                              </p>
                              <p style={{ fontSize: 14, color: '#8A98A3' }}>
                                {deriveResultCategory(r)} · {r.orderedBy}
                              </p>
                            </div>
                            <div className="shrink-0 text-right">
                              <span
                                className="inline-flex items-center gap-1.5 rounded-[6px] px-2 py-0.5 font-sans font-semibold whitespace-nowrap"
                                style={{
                                  fontSize: 14,
                                  color: statusCfg.color,
                                  background: statusCfg.bg,
                                }}
                              >
                                {r.flag === 'CRITICAL' && (
                                  <AlertTriangle style={{ width: 12, height: 12 }} />
                                )}
                                {statusCfg.label}
                              </span>
                              <p className="mt-1" style={{ fontSize: 14, color: '#8A98A3' }}>
                                {formatTime(r.resultAt ?? r.orderedAt)} ·{' '}
                                {formatHumanDate(r.resultAt ?? r.orderedAt)}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex items-center justify-between px-4 py-3">
                      <p style={{ fontSize: 14, color: '#8A98A3' }}>
                        Showing 1 to {visible.length} of {filtered.length} results
                      </p>
                      {filtered.length > 5 && (
                        <button
                          type="button"
                          onClick={() => setShowAll((p) => !p)}
                          className={`font-sans font-medium transition-colors duration-150 hover:underline ${FOCUS_RING}`}
                          style={{ fontSize: 14, color: '#00B4D8' }}
                        >
                          {showAll ? 'Show Less' : 'View All Results'}
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Detail panel */}
              <div
                className="rounded-[12px] p-4"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                {!selectedResult ? (
                  <p className="py-10 text-center" style={{ fontSize: 14, color: '#8A98A3' }}>
                    Select a result to view its details.
                  </p>
                ) : (
                  <>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p
                        className="font-display font-semibold"
                        style={{ fontSize: 18, color: '#0D2630' }}
                      >
                        {selectedResult.testName}
                      </p>
                      {selectedResult.flag && (
                        <span
                          className="rounded-[6px] px-2 py-0.5 font-sans font-semibold whitespace-nowrap"
                          style={{
                            fontSize: 14,
                            color:
                              selectedResult.flag === 'CRITICAL'
                                ? '#DC2626'
                                : selectedResult.flag === 'ABNORMAL'
                                  ? '#D97706'
                                  : '#16A34A',
                            background:
                              selectedResult.flag === 'CRITICAL'
                                ? 'rgba(220,38,38,0.1)'
                                : selectedResult.flag === 'ABNORMAL'
                                  ? 'rgba(217,119,6,0.1)'
                                  : 'rgba(22,163,74,0.1)',
                          }}
                        >
                          {selectedResult.flag}
                        </span>
                      )}
                    </div>
                    <p className="mt-1" style={{ fontSize: 14, color: '#8A98A3' }}>
                      Ordered: {formatHumanDate(selectedResult.orderedAt)},{' '}
                      {formatTime(selectedResult.orderedAt)}
                      {selectedResult.resultAt &&
                        ` · Resulted: ${formatHumanDate(selectedResult.resultAt)}, ${formatTime(selectedResult.resultAt)}`}
                    </p>

                    {selectedResult.rows && selectedResult.rows.length > 0 ? (
                      <div className="mt-3 overflow-x-auto scroll-smooth">
                        <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}>
                              {['Test', 'Result', 'Reference Range', 'Trend'].map((h) => (
                                <th
                                  key={h}
                                  className="px-1.5 py-2 text-left font-sans font-bold tracking-wider uppercase"
                                  style={{ fontSize: 14, color: '#4A7080' }}
                                >
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {selectedResult.rows.map((row) => (
                              <tr
                                key={row.parameter}
                                style={{ borderBottom: '1px solid rgba(0,100,130,0.06)' }}
                              >
                                <td
                                  className="px-1.5 py-2"
                                  style={{ fontSize: 14, color: '#0D2630' }}
                                >
                                  {row.parameter}
                                </td>
                                <td
                                  className="px-1.5 py-2 font-sans font-semibold whitespace-nowrap"
                                  style={{
                                    fontSize: 14,
                                    color:
                                      row.flag === 'H'
                                        ? '#DC2626'
                                        : row.flag === 'L'
                                          ? '#2563EB'
                                          : '#0D2630',
                                  }}
                                >
                                  {row.value} {row.unit}
                                </td>
                                <td
                                  className="px-1.5 py-2 whitespace-nowrap"
                                  style={{ fontSize: 14, color: '#8A98A3' }}
                                >
                                  {row.reference}
                                </td>
                                <td className="px-1.5 py-2">
                                  <TrendIcon flag={row.flag} />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div
                        className="mt-3 flex items-center gap-2 rounded-[10px] p-3"
                        style={{ background: '#F5FBFD' }}
                      >
                        <span
                          className="inline-flex items-center rounded-[6px] px-2 py-0.5 font-sans font-semibold"
                          style={{
                            fontSize: 14,
                            color: STATUS_CFG[selectedResult.status].color,
                            background: STATUS_CFG[selectedResult.status].bg,
                          }}
                        >
                          {STATUS_CFG[selectedResult.status].label}
                        </span>
                        <p style={{ fontSize: 14, color: '#4A7080' }}>
                          {selectedResult.status === 'REJECTED'
                            ? (selectedResult.rejectionReason ??
                              'Sample rejected — recollection needed.')
                            : 'Result not yet available.'}
                        </p>
                      </div>
                    )}

                    {selectedResult.comment && (
                      <div className="mt-3">
                        <p
                          className="font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          Notes
                        </p>
                        <p style={{ fontSize: 14, color: '#4A7080' }}>{selectedResult.comment}</p>
                      </div>
                    )}

                    {(selectedResult.doctorReviewedBy || selectedResult.labVerifiedBy) && (
                      <div
                        className="mt-3 flex flex-wrap gap-x-4 gap-y-1 pt-3"
                        style={{ borderTop: '1px solid rgba(0,100,130,0.1)' }}
                      >
                        {selectedResult.labVerifiedBy && (
                          <p style={{ fontSize: 14, color: '#8A98A3' }}>
                            Lab QC:{' '}
                            <span style={{ color: '#0D2630' }}>{selectedResult.labVerifiedBy}</span>
                          </p>
                        )}
                        {selectedResult.doctorReviewedBy && (
                          <p style={{ fontSize: 14, color: '#8A98A3' }}>
                            Reviewed by:{' '}
                            <span style={{ color: '#0D2630' }}>
                              {selectedResult.doctorReviewedBy}
                            </span>
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Result Trends + Recent Reports */}
            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div
                className="rounded-[12px] p-4"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p
                    className="font-display flex items-center gap-1.5 font-semibold"
                    style={{ fontSize: 16, color: '#0D2630' }}
                  >
                    <FileBarChart style={{ width: 16, height: 16, color: '#00B4D8' }} />
                    Result Trends
                  </p>
                  {trendParams.length > 0 && (
                    <select
                      value={activeTrendParam ?? ''}
                      onChange={(e) => setTrendParameter(e.target.value)}
                      className={`h-9 rounded-[8px] px-2.5 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                      style={{
                        fontSize: 14,
                        border: '1px solid rgba(0,100,130,0.18)',
                        color: '#0D2630',
                      }}
                    >
                      {trendParams.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                {trendParams.length === 0 ? (
                  <p className="py-10 text-center" style={{ fontSize: 14, color: '#8A98A3' }}>
                    No resulted parameters yet to trend.
                  </p>
                ) : (
                  <TrendChart points={trendPoints} />
                )}
              </div>

              <div
                className="rounded-[12px] p-4"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <p
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Recent Reports
                </p>
                {recentReports.length === 0 ? (
                  <p className="mt-2.5" style={{ fontSize: 14, color: '#8A98A3' }}>
                    No imaging, cardiology, or microbiology reports yet.
                  </p>
                ) : (
                  <div className="mt-2.5 flex flex-col gap-2.5">
                    {recentReports.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setSelectedResultId(r.id)}
                        className={`flex items-center justify-between gap-2 text-left transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                      >
                        <div className="min-w-0">
                          <p
                            className="truncate font-sans font-medium"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {r.testName}
                          </p>
                          <p style={{ fontSize: 14, color: '#8A98A3' }}>
                            {formatHumanDate(r.resultAt ?? r.orderedAt)},{' '}
                            {formatTime(r.resultAt ?? r.orderedAt)}
                          </p>
                        </div>
                        <span
                          className="shrink-0 rounded-full px-2 py-0.5 font-sans font-medium whitespace-nowrap"
                          style={{
                            fontSize: 14,
                            color: STATUS_CFG[r.status].color,
                            background: STATUS_CFG[r.status].bg,
                          }}
                        >
                          {STATUS_CFG[r.status].label}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="flex w-full shrink-0 flex-col gap-4">
            <div
              className="rounded-[12px] p-4"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <div className="flex items-center justify-between">
                <p
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Patient Summary
                </p>
                <button
                  type="button"
                  onClick={() => router.push(ROUTES.patients)}
                  className={`font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                  style={{ fontSize: 14, color: '#00B4D8' }}
                >
                  View Full Profile
                </button>
              </div>
              <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5">
                <div>
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>MRN</p>
                  <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                    {entry.mrn}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>Age / Sex</p>
                  <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                    {entry.age} Years / {entry.gender}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>Blood Group</p>
                  <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                    {bloodGroup}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>Phone</p>
                  <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                    {emergencyContact.phone}
                  </p>
                </div>
                <div className="col-span-2">
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>Emergency Contact</p>
                  <Tooltip content={`${emergencyContact.name} (${emergencyContact.relation})`}>
                    <p
                      className="truncate font-sans font-medium"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {emergencyContact.name} ({emergencyContact.relation})
                    </p>
                  </Tooltip>
                </div>
              </div>
              <div className="mt-3">
                <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                  Vital Signs (Latest)
                </p>
                <div className="mt-1.5 grid grid-cols-3 gap-2">
                  <div className="rounded-[8px] p-2" style={{ background: '#F5FBFD' }}>
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>BP</p>
                    <p
                      className="font-sans font-semibold"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {vitals.bp}
                    </p>
                  </div>
                  <div className="rounded-[8px] p-2" style={{ background: '#F5FBFD' }}>
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>HR</p>
                    <p
                      className="font-sans font-semibold"
                      style={{ fontSize: 14, color: '#DC2626' }}
                    >
                      {vitals.hr}
                    </p>
                  </div>
                  <div className="rounded-[8px] p-2" style={{ background: '#F5FBFD' }}>
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>SpO₂</p>
                    <p
                      className="font-sans font-semibold"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {vitals.spo2}%
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div
              className="rounded-[12px] p-4"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Allergies
              </p>
              <div className="mt-2.5 flex items-center gap-1.5">
                <span className="size-1.5 rounded-full" style={{ background: '#16A34A' }} />
                <span style={{ fontSize: 14, color: '#16A34A' }}>No Known Allergies</span>
              </div>
            </div>

            {isHighRisk && (
              <div
                className="rounded-[12px] p-4"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <p
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Critical Alerts
                </p>
                <div
                  className="mt-2.5 flex items-start gap-2 rounded-[10px] p-3"
                  style={{ background: 'rgba(220,38,38,0.06)' }}
                >
                  <AlertTriangle
                    style={{ width: 15, height: 15, color: '#DC2626' }}
                    className="mt-0.5 shrink-0"
                  />
                  <div>
                    <p
                      className="font-sans font-semibold"
                      style={{ fontSize: 14, color: '#DC2626' }}
                    >
                      High Risk Patient
                    </p>
                    <p style={{ fontSize: 14, color: '#4A7080' }}>
                      Monitor closely.{' '}
                      {patientResults.some((r) => r.flag === 'CRITICAL' && !r.doctorReviewedAt)
                        ? 'Unreviewed critical result.'
                        : 'Possible cardiac event.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div
              className="rounded-[12px] p-4"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Quick Actions
              </p>
              <div className="mt-2.5 flex flex-col gap-2">
                <PermissionGate permission={PERMISSIONS.EMERGENCY_WRITE}>
                  <button
                    type="button"
                    onClick={() =>
                      router.push(`${ROUTES.emergencyDiagnosticRequests}?entryId=${entry.id}`)
                    }
                    className={`flex h-10 items-center justify-center gap-1.5 rounded-[8px] px-2 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                    style={{
                      fontSize: 14,
                      color: '#0D2630',
                      border: '1px solid rgba(0,100,130,0.2)',
                    }}
                  >
                    <Plus style={{ width: 14, height: 14 }} />
                    New Diagnostic Request
                  </button>
                </PermissionGate>
                <PermissionGate permission={PERMISSIONS.EMERGENCY_WRITE}>
                  <button
                    type="button"
                    onClick={() =>
                      router.push(`${ROUTES.emergencyClinicalNotes}?entryId=${entry.id}`)
                    }
                    className={`flex h-10 items-center justify-center gap-1.5 rounded-[8px] px-2 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                    style={{
                      fontSize: 14,
                      color: '#0D2630',
                      border: '1px solid rgba(0,100,130,0.2)',
                    }}
                  >
                    Add Clinical Note
                  </button>
                </PermissionGate>
                <button
                  type="button"
                  onClick={handleShare}
                  className={`flex h-10 items-center justify-center gap-1.5 rounded-[8px] px-2 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                  style={{
                    fontSize: 14,
                    color: '#0D2630',
                    border: '1px solid rgba(0,100,130,0.2)',
                  }}
                >
                  Share Result
                </button>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-4 text-center" style={{ fontSize: 14, color: '#8A98A3' }}>
          All times are current. Data updates automatically.
        </p>
      </div>

      {compareTarget && (
        <CompareResultsModal results={compareTarget} onClose={() => setCompareTarget(null)} />
      )}
    </main>
  );
}
