'use client';

import {
  AlertCircle,
  ClipboardList,
  Eye,
  HeartPulse,
  LayoutGrid,
  List,
  NotebookPen,
  Pill,
  RefreshCw,
  Search,
  ShieldAlert,
  Sun,
  UserPlus,
  Users,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { FilterDropdown } from '@components/shared/FilterDropdown';
import { PermissionGate } from '@components/shared/PermissionGate';
import { PERMISSIONS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
import { useToast } from '@/hooks/useToast';
import { formatTime } from '@/utils/datetime';
import { CURRENT_SHIFT } from '@/features/nursing/__mocks__/nurseDashboardFixtures';
import {
  CARE_STATUS_OPTIONS,
  FREQUENT_VITALS_OPTIONS,
  RISK_LEVEL_OPTIONS,
  WARD_OPTIONS,
  type CareStatus,
  type NursePatient,
  type RiskLevel,
} from '@/features/nursing/__mocks__/myPatientsFixtures';
import {
  getEffectiveRoster,
  useClaimedPatients,
} from '@/features/nursing/store/nursingWorkflowStore';

type PageState = 'loading' | 'loaded' | 'error';
type ViewMode = 'card' | 'list';
const ROWS_PER_PAGE_OPTIONS = [9, 18, 27];

type FilterKey = 'ward' | 'risk' | 'status' | 'frequentVitals';
type FilterState = Record<FilterKey, string>;
const FILTER_DEFAULTS: FilterState = {
  ward: 'ALL',
  risk: 'ALL',
  status: 'ALL',
  frequentVitals: 'ALL',
};

const FILTER_DEFS: {
  key: FilterKey;
  defaultLabel: string;
  options: { value: string; label: string }[];
}[] = [
  { key: 'ward', defaultLabel: 'All Wards', options: WARD_OPTIONS },
  { key: 'risk', defaultLabel: 'All Risk Levels', options: RISK_LEVEL_OPTIONS },
  { key: 'status', defaultLabel: 'All Statuses', options: CARE_STATUS_OPTIONS },
  { key: 'frequentVitals', defaultLabel: 'Frequent Vitals: Any', options: FREQUENT_VITALS_OPTIONS },
];

const RISK_CFG: Record<RiskLevel, { color: string; border: string; bg: string }> = {
  High: { color: '#EF4444', border: 'rgba(239,68,68,0.4)', bg: 'rgba(239,68,68,0.08)' },
  Medium: { color: '#F59E0B', border: 'rgba(245,158,11,0.4)', bg: 'rgba(245,158,11,0.08)' },
  Low: { color: '#22C55E', border: 'rgba(34,197,94,0.4)', bg: 'rgba(34,197,94,0.08)' },
};

const STATUS_CFG: Record<CareStatus, { color: string; border: string; bg: string }> = {
  'In Progress': { color: '#3B82F6', border: 'rgba(59,130,246,0.4)', bg: 'rgba(59,130,246,0.06)' },
  Stable: { color: '#22C55E', border: 'rgba(34,197,94,0.4)', bg: 'transparent' },
  'Awaiting Discharge': {
    color: '#8B5CF6',
    border: 'rgba(139,92,246,0.4)',
    bg: 'rgba(139,92,246,0.06)',
  },
};

function SkeletonStatCard() {
  return (
    <div
      className="rounded-[12px] p-4"
      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
    >
      <div className="flex items-center gap-2.5">
        <div className="size-10 shrink-0 animate-pulse rounded-full bg-slate-200" />
        <div className="h-3.5 w-24 animate-pulse rounded bg-slate-200" />
      </div>
      <div className="mt-2.5 h-6 w-10 animate-pulse rounded bg-slate-200" />
      <div className="mt-1.5 h-3.5 w-28 animate-pulse rounded bg-slate-200" />
    </div>
  );
}

function SkeletonCard() {
  return (
    <div
      className="animate-pulse rounded-[12px] p-4"
      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
    >
      <div className="h-5 w-16 rounded-full bg-slate-100" />
      <div className="mt-3 flex items-center gap-2.5">
        <div className="size-11 shrink-0 rounded-full bg-slate-100" />
        <div className="h-4 w-28 rounded bg-slate-100" />
      </div>
      <div className="mt-4 h-20 rounded bg-slate-100" />
      <div className="mt-3 h-9 rounded bg-slate-100" />
    </div>
  );
}

export function MyPatientsWorkspace() {
  const router = useRouter();
  const toast = useToast();
  const [pageState, setPageState] = useState<PageState>('loading');
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<FilterState>(FILTER_DEFAULTS);
  const [openFilter, setOpenFilter] = useState<FilterKey | null>(null);
  const [rowsPerPage, setRowsPerPage] = useState(9);
  const [currentPage, setCurrentPage] = useState(1);

  // Re-renders whenever a patient is claimed via "Start Triage" in Patient Queue.
  useClaimedPatients();
  // Freshly-claimed pre-admission patients surface first — they need triage
  // started, unlike the rest of the roster which is already under way.
  const roster = [...getEffectiveRoster()].sort((a, b) => {
    if (Boolean(a.isPreAdmission) !== Boolean(b.isPreAdmission)) {
      return a.isPreAdmission ? -1 : 1;
    }
    return 0;
  });

  const filterBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setPageState('loaded'), 800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (filterBarRef.current && !filterBarRef.current.contains(e.target as Node)) {
        setOpenFilter(null);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  function handleRetry() {
    setPageState('loading');
    setTimeout(() => setPageState('loaded'), 800);
  }

  function handleRefresh() {
    toast.success('List refreshed', 'Your assigned patient list is up to date.');
  }

  function setFilter(key: FilterKey, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setOpenFilter(null);
    setCurrentPage(1);
  }

  function clearFilters() {
    setFilters(FILTER_DEFAULTS);
    setSearch('');
    setCurrentPage(1);
  }

  const hasActiveFilters =
    filters.ward !== 'ALL' ||
    filters.risk !== 'ALL' ||
    filters.status !== 'ALL' ||
    filters.frequentVitals !== 'ALL' ||
    search.trim() !== '';

  const q = search.trim().toLowerCase();
  const filtered = roster.filter((p) => {
    if (filters.ward !== 'ALL' && p.ward !== filters.ward) return false;
    if (filters.risk !== 'ALL' && p.riskLevel !== filters.risk) return false;
    if (filters.status !== 'ALL' && p.careStatus !== filters.status) return false;
    if (
      filters.frequentVitals !== 'ALL' &&
      (p.frequentVitals ? 'Yes' : 'No') !== filters.frequentVitals
    )
      return false;
    if (
      q &&
      !p.patientName.toLowerCase().includes(q) &&
      !p.mrn.toLowerCase().includes(q) &&
      !p.diagnosis.toLowerCase().includes(q)
    )
      return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * rowsPerPage;
  const pageRows = filtered.slice(pageStart, pageStart + rowsPerPage);

  const highRiskCount = roster.filter((p) => p.riskLevel === 'High').length;
  const stableCount = roster.filter((p) => p.careStatus === 'Stable').length;
  const preAdmissionCount = roster.filter((p) => p.isPreAdmission).length;

  function handleViewRecord(patient: NursePatient) {
    router.push(ROUTES.nursePatientRecord(patient.id));
  }

  function handleRecordObservation(patient: NursePatient) {
    toast.info('Opening Vital Signs', `Recording observation for ${patient.patientName}.`);
    router.push(ROUTES.nurseVitalSigns);
  }

  function handleAddNote(patient: NursePatient) {
    toast.info('Opening Nursing Notes', `Adding a note for ${patient.patientName}.`);
    router.push(ROUTES.nurseNursingNotes);
  }

  const STATS = [
    {
      id: 'total',
      label: 'Total My Patients',
      value: String(roster.length),
      subLabel: 'Assigned this shift',
      icon: Users,
      color: '#3B82F6',
      iconBg: 'rgba(59,130,246,0.12)',
    },
    {
      id: 'triage-in-progress',
      label: 'Triage In Progress',
      value: String(preAdmissionCount),
      subLabel: 'Not yet admitted',
      icon: UserPlus,
      color: '#00B4D8',
      iconBg: 'rgba(0,180,216,0.12)',
    },
    {
      id: 'high-risk',
      label: 'High Risk Patients',
      value: String(highRiskCount),
      subLabel: 'Require close monitoring',
      icon: ShieldAlert,
      color: '#EF4444',
      iconBg: 'rgba(239,68,68,0.12)',
    },
    {
      id: 'due-meds',
      label: 'Due Medications',
      value: '9',
      subLabel: 'Next 2 hours',
      icon: Pill,
      color: '#8B5CF6',
      iconBg: 'rgba(139,92,246,0.12)',
    },
    {
      id: 'due-obs',
      label: 'Due Observations',
      value: '7',
      subLabel: 'Require recording',
      icon: HeartPulse,
      color: '#F59E0B',
      iconBg: 'rgba(245,158,11,0.12)',
    },
    {
      id: 'stable',
      label: 'Stable Patients',
      value: String(stableCount),
      subLabel: 'Currently stable',
      icon: ShieldAlert,
      color: '#22C55E',
      iconBg: 'rgba(34,197,94,0.12)',
    },
  ];

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto max-w-[1600px] px-4 py-4 sm:px-6 sm:py-5">
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => router.push(ROUTES.nurse)}
              className="transition-colors duration-150 hover:text-[#00B4D8] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
              style={{ fontSize: 14, color: '#8A98A3' }}
            >
              Dashboard
            </button>
            <span style={{ fontSize: 14, color: '#8A98A3' }}>/</span>
            <span style={{ fontSize: 14, color: '#8A98A3' }}>Patient Care</span>
            <span style={{ fontSize: 14, color: '#8A98A3' }}>/</span>
            <span className="font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
              My Patients
            </span>
          </nav>

          <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1
                className="font-display font-semibold"
                style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
              >
                My Patients
              </h1>
              <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                Patients you are actively managing — admitted to your ward, or claimed from Patient
                Queue for triage.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div
                className="flex items-center gap-3 rounded-[12px] p-3"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <div
                  className="flex size-11 shrink-0 items-center justify-center rounded-full"
                  style={{ background: 'rgba(245,158,11,0.12)' }}
                >
                  <Sun style={{ width: 20, height: 20, color: '#F59E0B' }} />
                </div>
                <div>
                  <p style={{ fontSize: 14, color: '#4A7080' }}>
                    Current Shift: <span style={{ color: '#0D2630' }}>{CURRENT_SHIFT.name}</span>
                  </p>
                  <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                    {formatTime(`2000-01-01T${CURRENT_SHIFT.startTime}:00+01:00`)} –{' '}
                    {formatTime(`2000-01-01T${CURRENT_SHIFT.endTime}:00+01:00`)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRefresh}
                className="flex h-11 shrink-0 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                style={{ fontSize: 14, background: '#00B4D8' }}
              >
                <RefreshCw style={{ width: 15, height: 15 }} />
                Refresh List
              </button>
            </div>
          </div>

          {pageState === 'error' ? (
            <div
              className="mt-5 flex flex-col items-center justify-center gap-3 rounded-[12px] py-16 text-center"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <AlertCircle style={{ width: 36, height: 36, color: '#EF4444' }} />
              <p className="font-sans font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Failed to load your patient list
              </p>
              <button
                type="button"
                onClick={handleRetry}
                className="flex items-center gap-2 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-80 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
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
          ) : (
            <>
              {/* ── Stat cards ─────────────────────────────────────────────── */}
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {pageState === 'loading'
                  ? Array.from({ length: 6 }).map((_, i) => <SkeletonStatCard key={i} />)
                  : STATS.map((s) => (
                      <div
                        key={s.id}
                        className="rounded-[12px] p-4"
                        style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className="flex size-10 shrink-0 items-center justify-center rounded-full"
                            style={{ background: s.iconBg }}
                          >
                            <s.icon style={{ width: 17, height: 17, color: s.color }} />
                          </div>
                          <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                            {s.label}
                          </p>
                        </div>
                        <p
                          className="font-display mt-2 font-semibold"
                          style={{ fontSize: 22, color: '#0D2630' }}
                        >
                          {s.value}
                        </p>
                        <p className="mt-0.5" style={{ fontSize: 14, color: '#8A98A3' }}>
                          {s.subLabel}
                        </p>
                      </div>
                    ))}
              </div>

              {/* ── Filter bar ─────────────────────────────────────────────── */}
              <div ref={filterBarRef} className="mt-5 flex flex-wrap items-center gap-2.5">
                <div
                  className="flex h-11 min-w-[220px] flex-1 items-center gap-2.5 rounded-[10px] px-3.5"
                  style={{ border: '1px solid #0064821F', background: '#FFFFFF' }}
                >
                  <Search style={{ width: 16, height: 16, color: '#8A98A3', flexShrink: 0 }} />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Search patient name, MRN or diagnosis..."
                    className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-[#8A98A3]"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  />
                </div>

                {FILTER_DEFS.map((def) => (
                  <FilterDropdown
                    key={def.key}
                    def={def}
                    value={filters[def.key]}
                    isOpen={openFilter === def.key}
                    onToggle={() => setOpenFilter(openFilter === def.key ? null : def.key)}
                    onSelect={(v) => setFilter(def.key, v)}
                  />
                ))}

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="flex h-11 shrink-0 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                    style={{
                      fontSize: 14,
                      color: '#0D2630',
                      border: '1px solid rgba(0,100,130,0.2)',
                    }}
                  >
                    <RefreshCw style={{ width: 15, height: 15 }} />
                    Reset
                  </button>
                )}

                <div
                  className="ml-auto flex shrink-0 items-center gap-1 rounded-[10px] p-1"
                  style={{ border: '1px solid rgba(0,100,130,0.18)', background: '#FFFFFF' }}
                >
                  <button
                    type="button"
                    onClick={() => setViewMode('card')}
                    aria-pressed={viewMode === 'card'}
                    className="flex h-9 items-center gap-1.5 rounded-[8px] px-3 font-sans font-medium transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                    style={
                      viewMode === 'card'
                        ? { background: '#00B4D8', color: '#FFFFFF', fontSize: 14 }
                        : { color: '#4A7080', fontSize: 14 }
                    }
                  >
                    <LayoutGrid style={{ width: 15, height: 15 }} />
                    Card View
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    aria-pressed={viewMode === 'list'}
                    className="flex h-9 items-center gap-1.5 rounded-[8px] px-3 font-sans font-medium transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                    style={
                      viewMode === 'list'
                        ? { background: '#00B4D8', color: '#FFFFFF', fontSize: 14 }
                        : { color: '#4A7080', fontSize: 14 }
                    }
                  >
                    <List style={{ width: 15, height: 15 }} />
                    List View
                  </button>
                </div>
              </div>

              {/* ── Content + detail panel ─────────────────────────────────── */}
              <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-start">
                <div className="min-w-0 flex-1">
                  {pageState === 'loaded' && pageRows.length === 0 ? (
                    <div
                      className="flex flex-col items-center justify-center gap-3 rounded-[12px] py-16 text-center"
                      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                    >
                      <div
                        className="flex size-14 items-center justify-center rounded-full"
                        style={{ background: 'rgba(226,237,241,0.6)' }}
                      >
                        <Users style={{ width: 24, height: 24, color: '#8A98A3' }} />
                      </div>
                      <div>
                        <p
                          className="font-sans font-medium"
                          style={{ fontSize: 16, color: '#4A7080' }}
                        >
                          No patients match this filter
                        </p>
                        <p className="mt-0.5" style={{ fontSize: 14, color: '#8A98A3' }}>
                          Try a different ward, risk level, or status filter.
                        </p>
                      </div>
                      {hasActiveFilters && (
                        <button
                          type="button"
                          onClick={clearFilters}
                          className="mt-1 font-sans font-medium transition-colors duration-150 hover:underline focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                          style={{ fontSize: 14, color: '#00B4D8' }}
                        >
                          Clear all filters
                        </button>
                      )}
                    </div>
                  ) : viewMode === 'card' ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {pageState === 'loading'
                        ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
                        : pageRows.map((p) => {
                            const riskCfg = RISK_CFG[p.riskLevel];
                            const statusCfg = STATUS_CFG[p.careStatus];
                            return (
                              <div
                                key={p.id}
                                className="flex flex-col rounded-[12px] p-4"
                                style={{
                                  background: '#FFFFFF',
                                  border: '1px solid rgba(0,100,130,0.12)',
                                }}
                              >
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span
                                    className="w-fit rounded-full px-2.5 py-0.5 font-sans font-medium"
                                    style={{
                                      fontSize: 14,
                                      color: riskCfg.color,
                                      border: `1px solid ${riskCfg.border}`,
                                      background: riskCfg.bg,
                                    }}
                                  >
                                    {p.riskLevel} Risk
                                  </span>
                                  {p.isPreAdmission && (
                                    <span
                                      className="w-fit rounded-full px-2.5 py-0.5 font-sans font-medium"
                                      style={{
                                        fontSize: 14,
                                        color: '#00B4D8',
                                        border: '1px solid rgba(0,180,216,0.4)',
                                        background: 'rgba(0,180,216,0.08)',
                                      }}
                                    >
                                      Pre-Admission
                                    </span>
                                  )}
                                </div>

                                <div className="mt-3 flex items-center gap-2.5">
                                  <div
                                    className="flex size-11 shrink-0 items-center justify-center rounded-full font-sans font-semibold text-white"
                                    style={{ background: p.avatarBg, fontSize: 14 }}
                                  >
                                    {p.initials}
                                  </div>
                                  <div className="min-w-0">
                                    <p
                                      className="font-display truncate font-semibold"
                                      style={{ fontSize: 16, color: '#0D2630' }}
                                    >
                                      {p.patientName}
                                    </p>
                                    <p style={{ fontSize: 14, color: '#8A98A3' }}>
                                      <span style={{ color: '#00B4D8' }}>{p.mrn}</span> · {p.age} Y
                                      / {p.gender[0]}
                                    </p>
                                  </div>
                                </div>

                                <div className="mt-3 grid grid-cols-2 gap-2">
                                  <div>
                                    <span style={{ fontSize: 14, color: '#8A98A3' }}>Ward: </span>
                                    <span
                                      className="font-sans font-medium"
                                      style={{ fontSize: 14, color: '#0D2630' }}
                                    >
                                      {p.ward}
                                    </span>
                                  </div>
                                  <div>
                                    <span style={{ fontSize: 14, color: '#8A98A3' }}>Bed: </span>
                                    <span
                                      className="font-sans font-medium"
                                      style={{ fontSize: 14, color: '#0D2630' }}
                                    >
                                      {p.bed}
                                    </span>
                                  </div>
                                </div>

                                <p className="mt-2" style={{ fontSize: 14, color: '#8A98A3' }}>
                                  Diagnosis: <span style={{ color: '#0D2630' }}>{p.diagnosis}</span>
                                </p>
                                <p style={{ fontSize: 14, color: '#8A98A3' }}>
                                  Doctor: <span style={{ color: '#0D2630' }}>{p.doctorName}</span>
                                </p>

                                {p.isPreAdmission ? (
                                  <div
                                    className="mt-3 flex items-center gap-2 rounded-[10px] p-2.5"
                                    style={{ background: 'rgba(0,180,216,0.06)' }}
                                  >
                                    <HeartPulse
                                      style={{
                                        width: 15,
                                        height: 15,
                                        color: '#00B4D8',
                                        flexShrink: 0,
                                      }}
                                    />
                                    <p style={{ fontSize: 14, color: '#4A7080' }}>
                                      Vitals pending — continue in Vital Signs
                                    </p>
                                  </div>
                                ) : (
                                  <div
                                    className="mt-3 grid grid-cols-2 gap-2 rounded-[10px] p-2.5"
                                    style={{ background: 'rgba(226,237,241,0.4)' }}
                                  >
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1">
                                        <HeartPulse
                                          style={{ width: 13, height: 13, color: '#EF4444' }}
                                        />
                                        <span style={{ fontSize: 14, color: '#8A98A3' }}>
                                          Latest Vitals
                                        </span>
                                      </div>
                                      <p
                                        className="truncate font-sans font-medium"
                                        style={{ fontSize: 14, color: '#0D2630' }}
                                      >
                                        BP {p.vitals.bp}
                                      </p>
                                      <p style={{ fontSize: 14, color: '#4A7080' }}>
                                        HR {p.vitals.hr} · {p.vitals.temp}°C
                                      </p>
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1">
                                        <Pill style={{ width: 13, height: 13, color: '#8B5CF6' }} />
                                        <span style={{ fontSize: 14, color: '#8A98A3' }}>
                                          Next Medication
                                        </span>
                                      </div>
                                      <p
                                        className="truncate font-sans font-medium"
                                        style={{ fontSize: 14, color: '#0D2630' }}
                                      >
                                        {p.nextMedication}
                                      </p>
                                      <p style={{ fontSize: 14, color: '#4A7080' }}>
                                        {formatTime(p.nextMedicationTime)}
                                      </p>
                                    </div>
                                  </div>
                                )}

                                <div className="mt-3 flex items-center gap-1.5">
                                  <span style={{ fontSize: 14, color: '#8A98A3' }}>
                                    Care Status
                                  </span>
                                  <span
                                    className="rounded-full px-2.5 py-0.5 font-sans font-medium"
                                    style={{
                                      fontSize: 14,
                                      color: statusCfg.color,
                                      border: `1px solid ${statusCfg.border}`,
                                      background: statusCfg.bg,
                                    }}
                                  >
                                    {p.careStatus}
                                  </span>
                                </div>

                                <div className="mt-3 flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleViewRecord(p)}
                                    className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[8px] px-2 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                                    style={{
                                      fontSize: 14,
                                      color: '#0D2630',
                                      border: '1px solid rgba(0,100,130,0.2)',
                                    }}
                                  >
                                    <Eye style={{ width: 14, height: 14 }} />
                                    View Record
                                  </button>
                                  <PermissionGate permission={PERMISSIONS.ENCOUNTERS_WRITE}>
                                    <button
                                      type="button"
                                      onClick={() => handleRecordObservation(p)}
                                      className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[8px] px-2 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                                      style={{
                                        fontSize: 14,
                                        color: '#0D2630',
                                        border: '1px solid rgba(0,100,130,0.2)',
                                      }}
                                    >
                                      <ClipboardList style={{ width: 14, height: 14 }} />
                                      Record Observation
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleAddNote(p)}
                                      className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[8px] px-2 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                                      style={{
                                        fontSize: 14,
                                        color: '#0D2630',
                                        border: '1px solid rgba(0,100,130,0.2)',
                                      }}
                                    >
                                      <NotebookPen style={{ width: 14, height: 14 }} />
                                      Add Nursing Note
                                    </button>
                                  </PermissionGate>
                                </div>
                              </div>
                            );
                          })}
                    </div>
                  ) : (
                    <div
                      className="rounded-[12px] p-4"
                      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                    >
                      <div className="overflow-x-auto scroll-smooth">
                        <div className="min-w-[1180px]">
                          <div
                            className="flex items-center rounded-t-[8px]"
                            style={{
                              background: 'rgba(226,237,241,0.4)',
                              borderBottom: '1px solid #E6F8FD',
                            }}
                          >
                            {[
                              ['Patient', 'min-w-[180px] flex-1 pl-3'],
                              ['Ward', 'w-28'],
                              ['Bed', 'w-20'],
                              ['Diagnosis', 'w-40'],
                              ['Doctor', 'w-36'],
                              ['Latest Vitals', 'w-36'],
                              ['Next Medication', 'w-44'],
                              ['Care Status', 'w-28'],
                            ].map(([label, width]) => (
                              <div key={label} className={`${width} shrink-0 py-2.5 pr-2`}>
                                <span
                                  className="font-sans font-bold tracking-wider uppercase"
                                  style={{ fontSize: 14, color: '#4A7080' }}
                                >
                                  {label}
                                </span>
                              </div>
                            ))}
                            <div className="w-28 shrink-0 py-2.5 pr-3 text-right">
                              <span
                                className="font-sans font-bold tracking-wider uppercase"
                                style={{ fontSize: 14, color: '#4A7080' }}
                              >
                                Actions
                              </span>
                            </div>
                          </div>

                          {pageRows.map((p) => {
                            const statusCfg = STATUS_CFG[p.careStatus];
                            return (
                              <div
                                key={p.id}
                                onClick={() => handleViewRecord(p)}
                                className="flex cursor-pointer items-center transition-colors duration-100 hover:bg-[#F5FBFD]"
                                style={{
                                  borderBottom: '1px solid rgba(0,100,130,0.08)',
                                  background: 'transparent',
                                }}
                              >
                                <div className="flex min-w-[180px] flex-1 items-center gap-2.5 py-3 pr-2 pl-3">
                                  <div
                                    className="flex size-9 shrink-0 items-center justify-center rounded-full font-sans text-sm font-semibold text-white"
                                    style={{ background: p.avatarBg }}
                                  >
                                    {p.initials}
                                  </div>
                                  <div className="min-w-0">
                                    <p
                                      className="truncate font-sans font-medium"
                                      style={{ fontSize: 14, color: '#0D2630' }}
                                    >
                                      {p.patientName}
                                    </p>
                                    <p
                                      className="truncate"
                                      style={{ fontSize: 14, color: '#00B4D8' }}
                                    >
                                      {p.mrn}
                                    </p>
                                  </div>
                                </div>
                                <div className="w-28 shrink-0 py-3 pr-2">
                                  <p
                                    className="truncate"
                                    style={{ fontSize: 14, color: '#4A7080' }}
                                  >
                                    {p.ward}
                                  </p>
                                </div>
                                <div className="w-20 shrink-0 py-3 pr-2">
                                  <p style={{ fontSize: 14, color: '#4A7080' }}>{p.bed}</p>
                                </div>
                                <div className="w-40 shrink-0 py-3 pr-2">
                                  <p
                                    className="truncate"
                                    style={{ fontSize: 14, color: '#4A7080' }}
                                  >
                                    {p.diagnosis}
                                  </p>
                                </div>
                                <div className="w-36 shrink-0 py-3 pr-2">
                                  <p
                                    className="truncate"
                                    style={{ fontSize: 14, color: '#4A7080' }}
                                  >
                                    {p.doctorName}
                                  </p>
                                </div>
                                <div className="w-36 shrink-0 py-3 pr-2">
                                  {p.isPreAdmission ? (
                                    <p style={{ fontSize: 14, color: '#00B4D8' }}>Pending</p>
                                  ) : (
                                    <>
                                      <p style={{ fontSize: 14, color: '#0D2630' }}>
                                        BP {p.vitals.bp}
                                      </p>
                                      <p style={{ fontSize: 14, color: '#8A98A3' }}>
                                        HR {p.vitals.hr} · {p.vitals.temp}°C
                                      </p>
                                    </>
                                  )}
                                </div>
                                <div className="w-44 shrink-0 py-3 pr-2">
                                  <p
                                    className="truncate font-sans font-medium"
                                    style={{ fontSize: 14, color: '#0D2630' }}
                                  >
                                    {p.isPreAdmission ? 'Pending doctor review' : p.nextMedication}
                                  </p>
                                  {!p.isPreAdmission && (
                                    <p style={{ fontSize: 14, color: '#8A98A3' }}>
                                      {formatTime(p.nextMedicationTime)}
                                    </p>
                                  )}
                                </div>
                                <div className="w-28 shrink-0 py-3 pr-2">
                                  <span
                                    className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium"
                                    style={{
                                      fontSize: 14,
                                      whiteSpace: 'nowrap',
                                      color: statusCfg.color,
                                      border: `1px solid ${statusCfg.border}`,
                                      background: statusCfg.bg,
                                    }}
                                  >
                                    {p.careStatus}
                                  </span>
                                </div>
                                <div
                                  className="flex w-28 shrink-0 items-center justify-end gap-1 py-3 pr-3"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    onClick={() => handleViewRecord(p)}
                                    aria-label={`View ${p.patientName}`}
                                    className="flex size-8 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                                  >
                                    <Eye style={{ width: 15, height: 15, color: '#4A7080' }} />
                                  </button>
                                  <PermissionGate permission={PERMISSIONS.ENCOUNTERS_WRITE}>
                                    <button
                                      type="button"
                                      onClick={() => handleRecordObservation(p)}
                                      aria-label={`Record observation for ${p.patientName}`}
                                      className="flex size-8 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                                    >
                                      <ClipboardList
                                        style={{ width: 15, height: 15, color: '#4A7080' }}
                                      />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleAddNote(p)}
                                      aria-label={`Add nursing note for ${p.patientName}`}
                                      className="flex size-8 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                                    >
                                      <NotebookPen
                                        style={{ width: 15, height: 15, color: '#4A7080' }}
                                      />
                                    </button>
                                  </PermissionGate>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {pageState === 'loaded' && filtered.length > 0 && (
                    <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
                      <p style={{ fontSize: 14, color: '#4A7080' }}>
                        Showing {pageStart + 1} to{' '}
                        {Math.min(pageStart + rowsPerPage, filtered.length)} of {filtered.length}{' '}
                        patients
                      </p>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={safePage === 1}
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          className="flex size-9 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
                          style={{ border: '1px solid rgba(0,100,130,0.18)', color: '#4A7080' }}
                          aria-label="Previous page"
                        >
                          ‹
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setCurrentPage(p)}
                            className="flex size-9 items-center justify-center rounded-[8px] font-sans font-medium transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                            style={
                              p === safePage
                                ? { background: '#00B4D8', color: '#FFFFFF', fontSize: 14 }
                                : {
                                    border: '1px solid rgba(0,100,130,0.18)',
                                    color: '#4A7080',
                                    fontSize: 14,
                                  }
                            }
                            aria-current={p === safePage ? 'page' : undefined}
                          >
                            {p}
                          </button>
                        ))}
                        <button
                          type="button"
                          disabled={safePage === totalPages}
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          className="flex size-9 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
                          style={{ border: '1px solid rgba(0,100,130,0.18)', color: '#4A7080' }}
                          aria-label="Next page"
                        >
                          ›
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span style={{ fontSize: 14, color: '#4A7080' }}>Rows per page:</span>
                        <select
                          value={rowsPerPage}
                          onChange={(e) => {
                            setRowsPerPage(Number(e.target.value));
                            setCurrentPage(1);
                          }}
                          className="h-9 rounded-[8px] px-2 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40"
                          style={{
                            fontSize: 14,
                            border: '1px solid rgba(0,100,130,0.18)',
                            color: '#0D2630',
                          }}
                        >
                          {ROWS_PER_PAGE_OPTIONS.map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          <div className="h-4" />
        </div>
      </main>
    </div>
  );
}
