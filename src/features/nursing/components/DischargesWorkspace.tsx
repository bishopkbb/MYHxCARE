'use client';

import {
  AlertCircle,
  BedDouble,
  BookOpen,
  CalendarCheck,
  CalendarPlus,
  CheckCircle2,
  ClipboardCheck,
  DoorOpen,
  FileBarChart2,
  FileCheck2,
  FileText,
  FlaskConical,
  MoreVertical,
  Pill,
  RefreshCw,
  Search,
  UserRound,
  XCircle,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import { FormSelect } from '@components/shared/FormSelect';
import { ModalLoadingFallback } from '@components/shared/ModalLoadingFallback';
import { PermissionGate } from '@components/shared/PermissionGate';
import { PERMISSIONS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
import { useToast } from '@/hooks/useToast';
import { formatDate, formatTime } from '@/utils/datetime';
import { getEffectiveRoster } from '@/features/nursing/store/nursingWorkflowStore';
import {
  DISCHARGES,
  DISCHARGE_STEPS,
  DISCHARGE_TYPE_LABELS,
  STATUS_CFG,
  type DischargeRecord,
} from '@/features/nursing/__mocks__/dischargesFixtures';
import type { PlanDischargeInput } from './PlanDischargeModal';

const PlanDischargeModal = dynamic(
  () => import('./PlanDischargeModal').then((m) => m.PlanDischargeModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

const DischargeChecklistModal = dynamic(
  () => import('./DischargeChecklistModal').then((m) => m.DischargeChecklistModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

type PageState = 'loading' | 'loaded' | 'error';
type TabKey = 'active' | 'ready' | 'discharged' | 'all';

const LAST_STEP = DISCHARGE_STEPS.length; // 7
const READY_STEP = LAST_STEP - 1; // 6

const STEP_ICON: Record<number, typeof CheckCircle2> = {
  1: FileCheck2,
  2: Pill,
  3: BookOpen,
  4: FlaskConical,
  5: FileText,
  6: CalendarCheck,
  7: DoorOpen,
};

const STEP_COLOR: Record<number, string> = {
  1: '#F59E0B',
  2: '#3B82F6',
  3: '#8B5CF6',
  4: '#00B4D8',
  5: '#22C55E',
  6: '#EC4899',
  7: '#16A34A',
};

const STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: 'All', label: 'All Status' },
  { value: 'Planned', label: 'Planned' },
  { value: 'Discharged', label: 'Discharged' },
  { value: 'Cancelled', label: 'Cancelled' },
];

const TYPE_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: 'All', label: 'All Discharge Types' },
  ...(Object.entries(DISCHARGE_TYPE_LABELS) as [string, string][]).map(([value, label]) => ({
    value,
    label,
  })),
];

function initialsOf(name: string): string {
  const parts = name.replace(/[.,]/g, '').split(' ').filter(Boolean);
  return parts
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}

const AVATAR_PALETTE = ['#00B4D8', '#8B5CF6', '#22C55E', '#F59E0B', '#EF4444', '#6366F1'];
function avatarColorFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length]!;
}

function stepInfo(step: number) {
  return DISCHARGE_STEPS.find((s) => s.step === step);
}

function advanceActionLabel(step: number): string {
  return step >= READY_STEP ? 'Complete Discharge' : 'Advance Workflow';
}

function RowMenu({
  record,
  open,
  onToggle,
  onViewPatient,
  onAdvance,
  onCancel,
}: {
  record: DischargeRecord;
  open: boolean;
  onToggle: () => void;
  onViewPatient: () => void;
  onAdvance: () => void;
  onCancel: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) onToggle();
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open, onToggle]);

  const canAct = record.status === 'Planned';
  const hasAnyAction = !!record.patientId || canAct;

  if (!hasAnyAction) {
    return <div className="size-11" />;
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={onToggle}
        aria-label={`More actions for ${record.patientName}`}
        className={`flex size-11 shrink-0 items-center justify-center rounded-[10px] transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
      >
        <MoreVertical style={{ width: 16, height: 16, color: '#4A7080' }} />
      </button>
      {open && (
        <div
          className="animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 absolute top-full right-0 z-30 mt-1.5 w-56 overflow-hidden rounded-[10px] bg-white py-1.5 duration-150"
          style={{
            border: '1px solid rgba(0,100,130,0.12)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          }}
        >
          {record.patientId && (
            <button
              type="button"
              onClick={onViewPatient}
              className={`flex w-full items-center gap-2 px-3.5 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
              style={{ fontSize: 14, color: '#0D2630' }}
            >
              <UserRound style={{ width: 15, height: 15, color: '#00B4D8' }} />
              View Patient
            </button>
          )}
          {canAct && (
            <button
              type="button"
              onClick={onAdvance}
              className={`flex w-full items-center gap-2 px-3.5 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
              style={{ fontSize: 14, color: '#0D2630' }}
            >
              <CheckCircle2 style={{ width: 15, height: 15, color: '#22C55E' }} />
              {advanceActionLabel(record.currentStep)}
            </button>
          )}
          {canAct && (
            <button
              type="button"
              onClick={onCancel}
              className={`flex w-full items-center gap-2 px-3.5 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
              style={{ fontSize: 14, color: '#0D2630' }}
            >
              <XCircle style={{ width: 15, height: 15, color: '#EF4444' }} />
              Cancel Discharge Plan
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function SkeletonStatCard() {
  return (
    <div
      className="rounded-[12px] p-4"
      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
    >
      <div className="h-3.5 w-24 animate-pulse rounded bg-slate-200" />
      <div className="mt-2.5 h-6 w-10 animate-pulse rounded bg-slate-200" />
    </div>
  );
}

export function DischargesWorkspace() {
  const router = useRouter();
  const toast = useToast();
  const [pageState, setPageState] = useState<PageState>('loading');
  const [discharges, setDischarges] = useState<DischargeRecord[]>(DISCHARGES);
  const [activeTab, setActiveTab] = useState<TabKey>('active');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [wardFilter, setWardFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [stepFilter, setStepFilter] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showPlanDischarge, setShowPlanDischarge] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
  const [nowMs, setNowMs] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setPageState('loaded'), 700);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setNowMs(Date.now()), 0);
    return () => clearTimeout(t);
  }, []);

  function handleRetry() {
    setPageState('loading');
    setTimeout(() => setPageState('loaded'), 700);
  }

  function handleRefresh() {
    setPageState('loading');
    setTimeout(() => {
      setPageState('loaded');
      toast.success('Discharges refreshed', 'The discharge list is up to date.');
    }, 700);
  }

  const eligiblePatients = useMemo(() => {
    const plannedIds = new Set(
      discharges.filter((d) => d.status === 'Planned' && d.patientId).map((d) => d.patientId),
    );
    return getEffectiveRoster().filter((p) => !plannedIds.has(p.id));
  }, [discharges]);

  const wardOptions = useMemo(() => {
    const wards = Array.from(new Set(discharges.map((d) => d.ward)));
    return wards.map((w) => ({ value: w, label: w }));
  }, [discharges]);

  const wardFilterOptions = [{ value: 'All', label: 'All Wards' }, ...wardOptions];

  const overview = useMemo(() => {
    const weekAgo = nowMs - 7 * 24 * 60 * 60 * 1000;
    return {
      total: discharges.filter((d) => d.status !== 'Cancelled').length,
      active: discharges.filter((d) => d.status === 'Planned' && d.currentStep < READY_STEP).length,
      ready: discharges.filter((d) => d.status === 'Planned' && d.currentStep >= READY_STEP).length,
      dischargedToday: discharges.filter(
        (d) =>
          d.status === 'Discharged' &&
          new Date(d.dischargedAt!).toDateString() === new Date().toDateString(),
      ).length,
      dischargedThisWeek: discharges.filter(
        (d) => d.status === 'Discharged' && new Date(d.dischargedAt!).getTime() >= weekAgo,
      ).length,
      cancelled: discharges.filter((d) => d.status === 'Cancelled').length,
    };
  }, [discharges, nowMs]);

  const stepProgress = useMemo(() => {
    return DISCHARGE_STEPS.map((s) => ({
      ...s,
      count: discharges.filter((d) => d.status !== 'Cancelled' && d.currentStep >= s.step).length,
    }));
  }, [discharges]);

  const recentlyDischarged = useMemo(() => {
    return discharges
      .filter((d) => d.status === 'Discharged' && d.dischargedAt)
      .sort((a, b) => new Date(b.dischargedAt!).getTime() - new Date(a.dischargedAt!).getTime());
  }, [discharges]);

  const tabFiltered = useMemo(() => {
    return discharges.filter((d) => {
      if (activeTab === 'active') return d.status === 'Planned' && d.currentStep < READY_STEP;
      if (activeTab === 'ready') return d.status === 'Planned' && d.currentStep >= READY_STEP;
      if (activeTab === 'discharged') return d.status === 'Discharged';
      return true;
    });
  }, [discharges, activeTab]);

  const filtered = useMemo(() => {
    return tabFiltered.filter((d) => {
      if (statusFilter !== 'All' && d.status !== statusFilter) return false;
      if (wardFilter !== 'All' && d.ward !== wardFilter) return false;
      if (typeFilter !== 'All' && d.dischargeType !== typeFilter) return false;
      if (stepFilter !== null && d.currentStep !== stepFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (!(d.patientName.toLowerCase().includes(q) || d.mrn.toLowerCase().includes(q))) {
          return false;
        }
      }
      return true;
    });
  }, [tabFiltered, statusFilter, wardFilter, typeFilter, stepFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * rowsPerPage;
  const pageRows = filtered.slice(pageStart, pageStart + rowsPerPage);

  const hasActiveFilters =
    search.trim() !== '' ||
    statusFilter !== 'All' ||
    wardFilter !== 'All' ||
    typeFilter !== 'All' ||
    stepFilter !== null;

  function clearFilters() {
    setSearch('');
    setStatusFilter('All');
    setWardFilter('All');
    setTypeFilter('All');
    setStepFilter(null);
    setCurrentPage(1);
  }

  function handleApplyFilters() {
    setCurrentPage(1);
  }

  function updateDischarge(id: string, patch: Partial<DischargeRecord>) {
    setDischarges((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }

  function viewPatient(record: DischargeRecord) {
    if (!record.patientId) return;
    router.push(ROUTES.nursePatientRecord(record.patientId));
  }

  function advanceDischarge(record: DischargeRecord) {
    if (record.currentStep >= LAST_STEP) return;
    const nextStep = record.currentStep + 1;
    if (nextStep >= LAST_STEP) {
      setDischarges((prev) =>
        prev.map((d) => {
          if (d.id !== record.id) return d;
          const { patientId: _patientId, ...rest } = d;
          return {
            ...rest,
            currentStep: LAST_STEP,
            status: 'Discharged',
            dischargedAt: new Date().toISOString(),
          };
        }),
      );
      toast.success(
        'Patient discharged',
        `${record.patientName} has been discharged. Remember to release their bed in Bed Management.`,
      );
    } else {
      updateDischarge(record.id, { currentStep: nextStep });
      toast.success(
        'Discharge workflow advanced',
        `${record.patientName} moved to ${stepInfo(nextStep)?.label}.`,
      );
    }
    setOpenMenuId(null);
  }

  function cancelDischarge(record: DischargeRecord) {
    updateDischarge(record.id, { status: 'Cancelled' });
    toast.info(
      'Discharge plan cancelled',
      `${record.patientName}'s discharge plan has been cancelled.`,
    );
    setOpenMenuId(null);
  }

  function handleCreatePlan(input: PlanDischargeInput) {
    const patient = getEffectiveRoster().find((p) => p.id === input.patientId);
    if (!patient) return;
    const newRecord: DischargeRecord = {
      id: `dis-new-${discharges.length + 1}`,
      patientId: patient.id,
      patientName: patient.patientName,
      mrn: patient.mrn,
      age: patient.age,
      gender: patient.gender,
      ward: patient.ward,
      bed: patient.bed,
      diagnosis: patient.diagnosis,
      doctorName: patient.doctorName,
      dischargeType: input.dischargeType,
      plannedDischargeAt: input.plannedDischargeAt,
      currentStep: 1,
      status: 'Planned',
      ...(input.notes ? { notes: input.notes } : {}),
    };
    setDischarges((prev) => [newRecord, ...prev]);
    setShowPlanDischarge(false);
    toast.success(
      'Discharge plan created',
      `A discharge plan has been started for ${patient.patientName}.`,
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto max-w-[1200px] px-4 py-4 sm:px-6 sm:py-5">
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => router.push(ROUTES.nurse)}
              className={`transition-colors duration-150 hover:text-[#00B4D8] ${FOCUS_RING}`}
              style={{ fontSize: 14, color: '#8A98A3' }}
            >
              Ward Management
            </button>
            <span style={{ fontSize: 14, color: '#8A98A3' }}>/</span>
            <span className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
              Discharges
            </span>
          </nav>

          <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1
                className="font-display font-semibold"
                style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
              >
                Discharges
              </h1>
              <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                Plan, track, and complete patient discharges through the discharge workflow.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleRefresh}
                className={`flex h-11 items-center gap-2 rounded-[10px] px-4 font-sans font-semibold transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid rgba(0,100,130,0.15)',
                  color: '#0D2630',
                  fontSize: 14,
                }}
              >
                <RefreshCw style={{ width: 16, height: 16 }} />
                Refresh
              </button>
              <PermissionGate permission={PERMISSIONS.ENCOUNTERS_WRITE}>
                <button
                  type="button"
                  onClick={() => setShowPlanDischarge(true)}
                  className={`flex h-11 items-center gap-2 rounded-[10px] px-4 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                  style={{ background: '#00B4D8', fontSize: 14 }}
                >
                  <CalendarPlus style={{ width: 16, height: 16 }} />
                  Plan Discharge
                </button>
              </PermissionGate>
            </div>
          </div>

          {pageState === 'error' ? (
            <div
              className="mt-5 flex flex-col items-center justify-center gap-3 rounded-[12px] py-16 text-center"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <AlertCircle style={{ width: 36, height: 36, color: '#EF4444' }} />
              <p className="font-sans font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Failed to load discharges
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
          ) : (
            <>
              {/* ── Discharge Workflow stepper ────────────────────────────────── */}
              <div
                className="mt-4 rounded-[12px] p-4 sm:p-5"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <h2
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Discharge Workflow
                </h2>
                <div className="mt-4 overflow-x-auto scroll-smooth">
                  <div className="flex min-w-[720px] items-start">
                    {DISCHARGE_STEPS.map((s, i) => {
                      const Icon = STEP_ICON[s.step]!;
                      const active = stepFilter === s.step;
                      return (
                        <div key={s.step} className="flex flex-1 items-start">
                          <button
                            type="button"
                            onClick={() => {
                              setStepFilter(active ? null : s.step);
                              setActiveTab('all');
                              setCurrentPage(1);
                            }}
                            className={`flex flex-1 flex-col items-center gap-1.5 rounded-[10px] p-1.5 transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                          >
                            <div
                              className="flex size-11 shrink-0 items-center justify-center rounded-full"
                              style={{
                                background: active ? STEP_COLOR[s.step] : `${STEP_COLOR[s.step]}1A`,
                                border: active ? 'none' : `1.5px solid ${STEP_COLOR[s.step]}66`,
                              }}
                            >
                              <Icon
                                style={{
                                  width: 18,
                                  height: 18,
                                  color: active ? '#FFFFFF' : STEP_COLOR[s.step],
                                }}
                              />
                            </div>
                            <p
                              className="font-sans font-semibold"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {s.step}
                            </p>
                            <p className="text-center" style={{ fontSize: 14, color: '#4A7080' }}>
                              {s.shortLabel}
                            </p>
                          </button>
                          {i < DISCHARGE_STEPS.length - 1 && (
                            <div
                              className="mt-5 h-px flex-1"
                              style={{ borderTop: '1px dashed rgba(0,100,130,0.25)' }}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                {stepFilter !== null && (
                  <button
                    type="button"
                    onClick={() => setStepFilter(null)}
                    className={`mt-2 font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                    style={{ fontSize: 14, color: '#00B4D8' }}
                  >
                    Clear step filter
                  </button>
                )}
              </div>

              {/* ── Main content + sidebar ───────────────────────────────────── */}
              <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-start">
                <div
                  className="min-w-0 flex-1 rounded-[12px] p-4 sm:p-5"
                  style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                >
                  {/* Tabs */}
                  <div
                    className="flex flex-wrap items-center gap-5 overflow-x-auto scroll-smooth"
                    style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    {(
                      [
                        { key: 'active', label: 'Active Discharge Plans', count: null },
                        {
                          key: 'ready',
                          label: 'Ready for Discharge',
                          count: discharges.filter(
                            (d) => d.status === 'Planned' && d.currentStep >= READY_STEP,
                          ).length,
                        },
                        {
                          key: 'discharged',
                          label: 'Discharged Today',
                          count: discharges.filter((d) => d.status === 'Discharged').length,
                        },
                        { key: 'all', label: 'All Discharges', count: null },
                      ] as { key: TabKey; label: string; count: number | null }[]
                    ).map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => {
                          setActiveTab(tab.key);
                          setCurrentPage(1);
                        }}
                        className={`flex items-center gap-1.5 pb-3 font-sans font-medium whitespace-nowrap transition-colors duration-150 ${FOCUS_RING}`}
                        style={{
                          fontSize: 14,
                          color: activeTab === tab.key ? '#00B4D8' : '#4A7080',
                          borderBottom:
                            activeTab === tab.key ? '2px solid #00B4D8' : '2px solid transparent',
                        }}
                      >
                        {tab.label}
                        {tab.count !== null && (
                          <span
                            className="rounded-full px-2 py-0.5 font-sans font-semibold"
                            style={{
                              fontSize: 14,
                              color: activeTab === tab.key ? '#FFFFFF' : '#4A7080',
                              background:
                                activeTab === tab.key ? '#00B4D8' : 'rgba(226,237,241,0.6)',
                            }}
                          >
                            {tab.count}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Filters */}
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <div className="relative min-w-[200px] flex-1">
                      <Search
                        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
                        style={{ width: 16, height: 16, color: '#8A98A3' }}
                      />
                      <input
                        type="search"
                        value={search}
                        onChange={(e) => {
                          setSearch(e.target.value);
                          setCurrentPage(1);
                        }}
                        placeholder="Search by patient name or MRN..."
                        className={`h-11 w-full rounded-[10px] pr-4 pl-9 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                        style={{
                          fontSize: 14,
                          border: '1px solid rgba(0,100,130,0.18)',
                          color: '#0D2630',
                        }}
                      />
                    </div>
                    <div className="w-full sm:w-40">
                      <FormSelect
                        id="status-filter"
                        value={statusFilter}
                        onChange={(v) => {
                          setStatusFilter(v);
                          setCurrentPage(1);
                        }}
                        options={STATUS_FILTER_OPTIONS}
                        placeholder="All Status"
                      />
                    </div>
                    <div className="w-full sm:w-40">
                      <FormSelect
                        id="ward-filter"
                        value={wardFilter}
                        onChange={(v) => {
                          setWardFilter(v);
                          setCurrentPage(1);
                        }}
                        options={wardFilterOptions}
                        placeholder="All Wards"
                      />
                    </div>
                    <div className="w-full sm:w-48">
                      <FormSelect
                        id="type-filter"
                        value={typeFilter}
                        onChange={(v) => {
                          setTypeFilter(v);
                          setCurrentPage(1);
                        }}
                        options={TYPE_FILTER_OPTIONS}
                        placeholder="All Discharge Types"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleApplyFilters}
                      className={`flex h-11 items-center gap-2 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                      style={{
                        fontSize: 14,
                        color: '#0D2630',
                        border: '1px solid rgba(0,100,130,0.18)',
                      }}
                    >
                      Filter
                    </button>
                  </div>

                  {/* Table */}
                  <div className="mt-4 overflow-x-auto scroll-smooth">
                    <div className="min-w-[1020px]">
                      <div
                        className="flex items-center rounded-t-[8px]"
                        style={{
                          background: 'rgba(226,237,241,0.4)',
                          borderBottom: '1px solid #E6F8FD',
                        }}
                      >
                        {(
                          [
                            ['Patient', 'min-w-[170px] flex-1 pl-3'],
                            ['MRN', 'w-28'],
                            ['Ward/Bed', 'w-32'],
                            ['Planned', 'w-28'],
                            ['Type', 'w-28'],
                            ['Step', 'w-36'],
                            ['Status', 'w-28'],
                          ] as [string, string][]
                        ).map(([label, width]) => (
                          <div key={label} className={`${width} shrink-0 py-2.5 pr-1.5`}>
                            <span
                              className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                              style={{ fontSize: 14, color: '#4A7080' }}
                            >
                              {label}
                            </span>
                          </div>
                        ))}
                        <div
                          className="sticky right-0 z-10 w-24 shrink-0 py-2.5 pr-3 text-right"
                          style={{ background: '#E2EDF1' }}
                        >
                          <span
                            className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                            style={{ fontSize: 14, color: '#4A7080' }}
                          >
                            Actions
                          </span>
                        </div>
                      </div>

                      {pageState === 'loading' &&
                        Array.from({ length: 6 }).map((_, i) => (
                          <div
                            key={i}
                            className="flex min-h-[60px] animate-pulse items-center"
                            style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                          >
                            <div className="flex min-w-[170px] flex-1 items-center gap-2 py-3 pr-1.5 pl-3">
                              <div className="size-9 shrink-0 rounded-full bg-slate-100" />
                              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                                <div className="h-3.5 w-28 rounded bg-slate-100" />
                                <div className="h-3.5 w-14 rounded bg-slate-100" />
                              </div>
                            </div>
                            <div className="w-28 shrink-0 py-3 pr-1.5">
                              <div className="h-3.5 w-16 rounded bg-slate-100" />
                            </div>
                            <div className="w-32 shrink-0 py-3 pr-1.5">
                              <div className="h-3.5 w-20 rounded bg-slate-100" />
                            </div>
                            <div className="w-28 shrink-0 py-3 pr-1.5">
                              <div className="h-3.5 w-20 rounded bg-slate-100" />
                            </div>
                            <div className="w-28 shrink-0 py-3 pr-1.5">
                              <div className="h-5 w-16 rounded-full bg-slate-100" />
                            </div>
                            <div className="w-36 shrink-0 py-3 pr-1.5">
                              <div className="h-3.5 w-20 rounded bg-slate-100" />
                            </div>
                            <div className="w-28 shrink-0 py-3 pr-1.5">
                              <div className="h-5 w-16 rounded-full bg-slate-100" />
                            </div>
                            <div
                              className="sticky right-0 flex w-24 shrink-0 items-center justify-end py-3 pr-3"
                              style={{ background: '#FFFFFF' }}
                            >
                              <div className="size-9 rounded-[10px] bg-slate-100" />
                            </div>
                          </div>
                        ))}

                      {pageState === 'loaded' && pageRows.length === 0 && (
                        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                          <div
                            className="flex size-14 items-center justify-center rounded-full"
                            style={{ background: 'rgba(226,237,241,0.6)' }}
                          >
                            <ClipboardCheck style={{ width: 24, height: 24, color: '#8A98A3' }} />
                          </div>
                          <p
                            className="font-sans font-medium"
                            style={{ fontSize: 16, color: '#4A7080' }}
                          >
                            No discharges match this filter
                          </p>
                          {hasActiveFilters && (
                            <button
                              type="button"
                              onClick={clearFilters}
                              className={`mt-1 font-sans font-medium transition-colors duration-150 hover:underline ${FOCUS_RING}`}
                              style={{ fontSize: 14, color: '#00B4D8' }}
                            >
                              Clear all filters
                            </button>
                          )}
                        </div>
                      )}

                      {pageState === 'loaded' &&
                        pageRows.map((d) => {
                          const cfg = STATUS_CFG[d.status];
                          const step = stepInfo(d.currentStep);
                          const StepIcon = STEP_ICON[d.currentStep];
                          const isMenuOpen = openMenuId === d.id;
                          return (
                            <div
                              key={d.id}
                              className="flex items-center transition-colors duration-100 hover:bg-[#F5FBFD]"
                              style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                            >
                              <div className="min-w-[170px] flex-1 py-3 pr-1.5 pl-3">
                                <div className="flex items-center gap-2">
                                  <div
                                    className="font-display flex size-9 shrink-0 items-center justify-center rounded-full font-semibold text-white"
                                    style={{
                                      background: avatarColorFor(d.patientName),
                                      fontSize: 14,
                                    }}
                                  >
                                    {initialsOf(d.patientName)}
                                  </div>
                                  <div className="min-w-0">
                                    <p
                                      className="truncate font-sans font-medium"
                                      style={{ fontSize: 14, color: '#0D2630' }}
                                    >
                                      {d.patientName}
                                    </p>
                                    <p style={{ fontSize: 14, color: '#8A98A3' }}>
                                      {d.age} Y / {d.gender[0]}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <div className="w-28 shrink-0 py-3 pr-1.5">
                                <p className="truncate" style={{ fontSize: 14, color: '#00B4D8' }}>
                                  {d.mrn}
                                </p>
                              </div>
                              <div className="w-32 shrink-0 py-3 pr-1.5">
                                <p className="truncate" style={{ fontSize: 14, color: '#0D2630' }}>
                                  {d.ward}
                                </p>
                                <p className="truncate" style={{ fontSize: 14, color: '#8A98A3' }}>
                                  {d.bed}
                                </p>
                              </div>
                              <div className="w-28 shrink-0 py-3 pr-1.5">
                                <p
                                  className="whitespace-nowrap"
                                  style={{ fontSize: 14, color: '#0D2630' }}
                                >
                                  {formatDate(d.plannedDischargeAt)}
                                </p>
                                <p
                                  className="whitespace-nowrap"
                                  style={{ fontSize: 14, color: '#8A98A3' }}
                                >
                                  {formatTime(d.plannedDischargeAt)}
                                </p>
                              </div>
                              <div className="w-28 shrink-0 py-3 pr-1.5">
                                <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                                  {d.dischargeType}
                                </p>
                              </div>
                              <div className="w-36 shrink-0 py-3 pr-1.5">
                                {StepIcon && (
                                  <div className="flex items-center gap-1.5">
                                    <div
                                      className="flex size-6 shrink-0 items-center justify-center rounded-full"
                                      style={{ background: `${STEP_COLOR[d.currentStep]}1A` }}
                                    >
                                      <StepIcon
                                        style={{
                                          width: 13,
                                          height: 13,
                                          color: STEP_COLOR[d.currentStep],
                                        }}
                                      />
                                    </div>
                                    <p
                                      className="truncate"
                                      style={{ fontSize: 14, color: '#0D2630' }}
                                    >
                                      {step?.shortLabel}
                                    </p>
                                  </div>
                                )}
                              </div>
                              <div className="w-28 shrink-0 py-3 pr-1.5">
                                <span
                                  className="inline-block rounded-full px-2 py-0.5 font-sans font-medium whitespace-nowrap"
                                  style={{
                                    fontSize: 14,
                                    color: cfg.color,
                                    border: `1px solid ${cfg.border}`,
                                    background: cfg.bg,
                                  }}
                                >
                                  {d.status}
                                </span>
                              </div>
                              <div
                                className={`sticky right-0 flex w-24 shrink-0 items-center justify-end py-3 pr-3 ${isMenuOpen ? 'z-30' : 'z-10'}`}
                                style={{ background: '#FFFFFF' }}
                              >
                                <PermissionGate permission={PERMISSIONS.ENCOUNTERS_WRITE}>
                                  <RowMenu
                                    record={d}
                                    open={isMenuOpen}
                                    onToggle={() => setOpenMenuId(isMenuOpen ? null : d.id)}
                                    onViewPatient={() => {
                                      setOpenMenuId(null);
                                      viewPatient(d);
                                    }}
                                    onAdvance={() => advanceDischarge(d)}
                                    onCancel={() => cancelDischarge(d)}
                                  />
                                </PermissionGate>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  {/* Pagination */}
                  {pageState === 'loaded' && filtered.length > 0 && (
                    <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
                      <p style={{ fontSize: 14, color: '#4A7080' }}>
                        Showing {pageStart + 1} to{' '}
                        {Math.min(pageStart + rowsPerPage, filtered.length)} of {filtered.length}{' '}
                        discharges
                      </p>
                      <div className="flex items-center gap-2">
                        <span style={{ fontSize: 14, color: '#4A7080' }}>Rows per page:</span>
                        <select
                          value={rowsPerPage}
                          onChange={(e) => {
                            setRowsPerPage(Number(e.target.value));
                            setCurrentPage(1);
                          }}
                          className={`h-11 rounded-[8px] px-2 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                          style={{
                            fontSize: 14,
                            border: '1px solid rgba(0,100,130,0.18)',
                            color: '#0D2630',
                          }}
                        >
                          {[10, 25, 50].map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                      </div>
                      {totalPages > 1 && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={safePage === 1}
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            className={`flex size-11 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#F5FBFD] disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING}`}
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
                              className={`flex size-11 items-center justify-center rounded-[8px] font-sans font-medium transition-colors duration-150 ${FOCUS_RING}`}
                              style={
                                p === safePage
                                  ? { background: '#00B4D8', color: '#FFFFFF', fontSize: 14 }
                                  : {
                                      border: '1px solid rgba(0,100,130,0.18)',
                                      color: '#4A7080',
                                      fontSize: 14,
                                    }
                              }
                            >
                              {p}
                            </button>
                          ))}
                          <button
                            type="button"
                            disabled={safePage === totalPages}
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            className={`flex size-11 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#F5FBFD] disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING}`}
                            style={{ border: '1px solid rgba(0,100,130,0.18)', color: '#4A7080' }}
                            aria-label="Next page"
                          >
                            ›
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* ── Sidebar ─────────────────────────────────────────────────── */}
                <div className="flex w-full shrink-0 flex-col gap-4 xl:w-[300px]">
                  <div
                    className="rounded-[12px] p-4 sm:p-5"
                    style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    <h2
                      className="font-display font-semibold"
                      style={{ fontSize: 16, color: '#0D2630' }}
                    >
                      Discharges Overview
                    </h2>
                    {pageState === 'loading' ? (
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <SkeletonStatCard key={i} />
                        ))}
                      </div>
                    ) : (
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        {(
                          [
                            {
                              label: 'Total Plans',
                              value: overview.total,
                              color: '#0D2630',
                              bg: 'rgba(0,100,130,0.08)',
                            },
                            {
                              label: 'Active',
                              value: overview.active,
                              color: '#F59E0B',
                              bg: 'rgba(245,158,11,0.1)',
                            },
                            {
                              label: 'Ready Today',
                              value: overview.ready,
                              color: '#EC4899',
                              bg: 'rgba(236,72,153,0.1)',
                            },
                            {
                              label: 'Discharged Today',
                              value: overview.dischargedToday,
                              color: '#16A34A',
                              bg: 'rgba(34,197,94,0.1)',
                            },
                            {
                              label: 'This Week',
                              value: overview.dischargedThisWeek,
                              color: '#00B4D8',
                              bg: 'rgba(0,180,216,0.1)',
                            },
                            {
                              label: 'Cancelled',
                              value: overview.cancelled,
                              color: '#EF4444',
                              bg: 'rgba(239,68,68,0.1)',
                            },
                          ] as { label: string; value: number; color: string; bg: string }[]
                        ).map((s) => (
                          <div
                            key={s.label}
                            className="rounded-[10px] p-2.5"
                            style={{ background: s.bg }}
                          >
                            <p
                              className="font-display font-semibold"
                              style={{ fontSize: 22, color: s.color }}
                            >
                              {s.value}
                            </p>
                            <p style={{ fontSize: 14, color: '#4A7080' }}>{s.label}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div
                    className="rounded-[12px] p-4 sm:p-5"
                    style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    <h2
                      className="font-display font-semibold"
                      style={{ fontSize: 16, color: '#0D2630' }}
                    >
                      Workflow Progress (All)
                    </h2>
                    <WorkflowProgressDonut steps={stepProgress} total={overview.total} />
                  </div>

                  <div
                    className="rounded-[12px] p-4 sm:p-5"
                    style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    <div className="flex items-center justify-between">
                      <h2
                        className="font-display font-semibold"
                        style={{ fontSize: 16, color: '#0D2630' }}
                      >
                        Recently Discharged
                      </h2>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('discharged');
                          setCurrentPage(1);
                        }}
                        className={`font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                        style={{ fontSize: 14, color: '#00B4D8' }}
                      >
                        View All
                      </button>
                    </div>
                    <div className="mt-3 flex flex-col gap-3">
                      {recentlyDischarged.length === 0 ? (
                        <p style={{ fontSize: 14, color: '#8A98A3' }}>
                          No patients discharged yet.
                        </p>
                      ) : (
                        recentlyDischarged.slice(0, 3).map((d) => (
                          <div key={d.id} className="flex items-center gap-2.5">
                            <div
                              className="font-display flex size-9 shrink-0 items-center justify-center rounded-full font-semibold text-white"
                              style={{ background: avatarColorFor(d.patientName), fontSize: 14 }}
                            >
                              {initialsOf(d.patientName)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p
                                className="truncate font-sans font-medium"
                                style={{ fontSize: 14, color: '#0D2630' }}
                              >
                                {d.patientName}
                              </p>
                              <p className="truncate" style={{ fontSize: 14, color: '#8A98A3' }}>
                                {d.mrn}
                              </p>
                            </div>
                            <p style={{ fontSize: 14, color: '#8A98A3' }}>
                              {formatTime(d.dischargedAt!)}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

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
                    <div className="mt-3 flex flex-col gap-2">
                      <PermissionGate permission={PERMISSIONS.ENCOUNTERS_WRITE}>
                        <button
                          type="button"
                          onClick={() => setShowPlanDischarge(true)}
                          className={`flex h-11 items-center justify-between rounded-[10px] px-3.5 font-sans font-medium transition-opacity duration-150 hover:opacity-85 ${FOCUS_RING}`}
                          style={{
                            fontSize: 14,
                            color: '#0D2630',
                            background: 'rgba(0,180,216,0.1)',
                          }}
                        >
                          <span className="flex items-center gap-2.5">
                            <CalendarPlus style={{ width: 17, height: 17, color: '#00B4D8' }} />
                            Plan Discharge
                          </span>
                          <span style={{ color: '#8A98A3' }}>›</span>
                        </button>
                      </PermissionGate>
                      <button
                        type="button"
                        onClick={() => router.push(ROUTES.wards)}
                        className={`flex h-11 items-center justify-between rounded-[10px] px-3.5 font-sans font-medium transition-opacity duration-150 hover:opacity-85 ${FOCUS_RING}`}
                        style={{
                          fontSize: 14,
                          color: '#0D2630',
                          background: 'rgba(139,92,246,0.1)',
                        }}
                      >
                        <span className="flex items-center gap-2.5">
                          <BedDouble style={{ width: 17, height: 17, color: '#8B5CF6' }} />
                          View Bed Management
                        </span>
                        <span style={{ color: '#8A98A3' }}>›</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => router.push(ROUTES.nurseReports)}
                        className={`flex h-11 items-center justify-between rounded-[10px] px-3.5 font-sans font-medium transition-opacity duration-150 hover:opacity-85 ${FOCUS_RING}`}
                        style={{
                          fontSize: 14,
                          color: '#0D2630',
                          background: 'rgba(34,197,94,0.1)',
                        }}
                      >
                        <span className="flex items-center gap-2.5">
                          <FileBarChart2 style={{ width: 17, height: 17, color: '#22C55E' }} />
                          Discharge Reports
                        </span>
                        <span style={{ color: '#8A98A3' }}>›</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowChecklist(true)}
                        className={`flex h-11 items-center justify-between rounded-[10px] px-3.5 font-sans font-medium transition-opacity duration-150 hover:opacity-85 ${FOCUS_RING}`}
                        style={{
                          fontSize: 14,
                          color: '#0D2630',
                          background: 'rgba(245,158,11,0.1)',
                        }}
                      >
                        <span className="flex items-center gap-2.5">
                          <ClipboardCheck style={{ width: 17, height: 17, color: '#F59E0B' }} />
                          Discharge Checklist
                        </span>
                        <span style={{ color: '#8A98A3' }}>›</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="h-4" />
        </div>
      </main>

      {showPlanDischarge && (
        <PlanDischargeModal
          eligiblePatients={eligiblePatients}
          onClose={() => setShowPlanDischarge(false)}
          onConfirm={handleCreatePlan}
        />
      )}

      {showChecklist && <DischargeChecklistModal onClose={() => setShowChecklist(false)} />}
    </div>
  );
}

function WorkflowProgressDonut({
  steps,
  total,
}: {
  steps: { step: number; label: string; count: number }[];
  total: number;
}) {
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    let raf1 = 0;
    let raf2 = 0;
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setAnimate(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, []);

  const radius = 54;
  const strokeWidth = 20;
  const circumference = 2 * Math.PI * radius;
  const gapPx = 3;
  const sum = steps.reduce((acc, s) => acc + s.count, 0) || 1;

  const arcs = steps.reduce<
    { step: number; label: string; count: number; length: number; offset: number; color: string }[]
  >((acc, s) => {
    const cumulative = acc.reduce((total_, seg) => total_ + seg.count, 0);
    const rawLength = (s.count / sum) * circumference;
    const offset = -(cumulative / sum) * circumference;
    acc.push({ ...s, length: Math.max(0, rawLength - gapPx), offset, color: STEP_COLOR[s.step]! });
    return acc;
  }, []);

  return (
    <div className="mt-2 flex flex-col items-center gap-4">
      <div
        className="relative flex shrink-0 items-center justify-center"
        style={{ width: 130, height: 130 }}
      >
        <svg
          viewBox="0 0 128 128"
          style={{ width: 130, height: 130 }}
          role="img"
          aria-label="Discharge workflow progress donut chart"
        >
          <g transform="rotate(-90 64 64)">
            {arcs.map((seg, i) => (
              <circle
                key={seg.step}
                cx={64}
                cy={64}
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth={strokeWidth}
                strokeLinecap="butt"
                strokeDasharray={`${animate ? seg.length : 0} ${circumference}`}
                strokeDashoffset={seg.offset}
                style={{
                  transition: `stroke-dasharray 0.8s cubic-bezier(0.22,1,0.36,1) ${i * 80}ms`,
                }}
              />
            ))}
          </g>
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="font-display font-bold" style={{ fontSize: 20, color: '#0D2630' }}>
            {total}
          </span>
          <span style={{ fontSize: 14, color: '#8A98A3' }}>Total</span>
        </div>
      </div>
      <div className="flex w-full min-w-0 flex-1 flex-col gap-1.5">
        {steps.map((s) => (
          <div key={s.step} className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ background: STEP_COLOR[s.step] }}
              />
              <span className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                Step {s.step}: {s.label}
              </span>
            </div>
            <span
              className="shrink-0 font-sans font-medium"
              style={{ fontSize: 14, color: '#0D2630' }}
            >
              {s.count} ({total ? Math.round((s.count / total) * 100) : 0}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
