'use client';

import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Eye,
  RefreshCw,
  Repeat,
  Search,
  SquarePen,
  UserPlus,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { FilterDropdown } from '@components/shared/FilterDropdown';
import { FormSelect } from '@components/shared/FormSelect';
import { PermissionGate } from '@components/shared/PermissionGate';
import { PERMISSIONS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { formatTime } from '@/utils/datetime';
import {
  AWAITING_TRIAGE_STATUSES,
  DOCTOR_OPTIONS,
  PRIORITY_OPTIONS,
  QUEUE_STATS,
  QUEUE_TASKS,
  STATUS_OPTIONS,
  TASK_TYPE_CFG,
  TASK_TYPE_OPTIONS,
  WARD_OPTIONS,
  toAwaitingTriageTask,
  type QueueTask,
  type TaskPriority,
  type TaskStatus,
} from '@/features/nursing/__mocks__/patientQueueFixtures';
import {
  isTriageStarted,
  setPendingVitalsPatientId,
  startTriage,
  useClaimedPatients,
} from '@/features/nursing/store/nursingWorkflowStore';
import {
  DEPARTMENTS,
  QUEUE_ENTRIES,
  type QueueEntry,
} from '@/features/registration/__mocks__/queueFixtures';

type PageState = 'loading' | 'loaded' | 'error';
const ROWS_PER_PAGE = 8;

type FilterKey = 'ward' | 'priority' | 'taskType' | 'doctor' | 'status';
type FilterState = Record<FilterKey, string>;
const FILTER_DEFAULTS: FilterState = {
  ward: 'ALL',
  priority: 'ALL',
  taskType: 'ALL',
  doctor: 'ALL',
  status: 'ALL',
};

const FILTER_DEFS: {
  key: FilterKey;
  defaultLabel: string;
  options: { value: string; label: string }[];
}[] = [
  { key: 'ward', defaultLabel: 'All Wards', options: WARD_OPTIONS },
  { key: 'priority', defaultLabel: 'All Priorities', options: PRIORITY_OPTIONS },
  { key: 'taskType', defaultLabel: 'All Tasks', options: TASK_TYPE_OPTIONS },
  { key: 'doctor', defaultLabel: 'All Doctors', options: DOCTOR_OPTIONS },
  { key: 'status', defaultLabel: 'All Statuses', options: STATUS_OPTIONS },
];

const PRIORITY_CFG: Record<TaskPriority, { color: string; border: string; bg: string }> = {
  High: { color: '#EF4444', border: 'rgba(239,68,68,0.4)', bg: 'rgba(239,68,68,0.06)' },
  Medium: { color: '#F59E0B', border: 'rgba(245,158,11,0.4)', bg: 'rgba(245,158,11,0.06)' },
  Low: { color: '#22C55E', border: 'rgba(34,197,94,0.4)', bg: 'transparent' },
};

const STATUS_CFG: Record<TaskStatus, { color: string; border: string; bg: string }> = {
  Pending: { color: '#F59E0B', border: 'rgba(245,158,11,0.4)', bg: 'rgba(245,158,11,0.06)' },
  'In Progress': { color: '#3B82F6', border: 'rgba(59,130,246,0.4)', bg: 'rgba(59,130,246,0.06)' },
  Completed: { color: '#22C55E', border: 'rgba(34,197,94,0.4)', bg: 'transparent' },
};

const LEGEND: { label: string; color: string }[] = [
  { label: 'High', color: '#EF4444' },
  { label: 'Medium', color: '#F59E0B' },
  { label: 'Low', color: '#22C55E' },
  { label: 'In Progress', color: '#3B82F6' },
  { label: 'Completed', color: '#22C55E' },
];

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

function SkeletonRow() {
  return (
    <div
      className="flex min-h-[64px] animate-pulse items-center px-2"
      style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
    >
      <div className="flex min-w-[180px] flex-1 items-center gap-2.5 py-3 pr-2 pl-3">
        <div className="size-9 shrink-0 rounded-full bg-slate-100" />
        <div className="h-4 w-28 rounded bg-slate-100" />
      </div>
      <div className="w-28 shrink-0 py-3 pr-2">
        <div className="h-4 w-16 rounded bg-slate-100" />
      </div>
    </div>
  );
}

export function PatientQueueWorkspace() {
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const actorName = user?.name ?? 'Nurse';
  const [pageState, setPageState] = useState<PageState>('loading');
  const [tasks, setTasks] = useState<QueueTask[]>(QUEUE_TASKS);
  const [registrationEntries, setRegistrationEntries] = useState<QueueEntry[]>(QUEUE_ENTRIES);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<FilterState>(FILTER_DEFAULTS);
  const [openFilter, setOpenFilter] = useState<FilterKey | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [reassignDept, setReassignDept] = useState('');
  const [reassignClinic, setReassignClinic] = useState('');

  // Re-renders this page whenever a patient is claimed elsewhere (or here) —
  // the shared store, not local state, is the source of truth for who's claimed.
  useClaimedPatients();

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
    filters.priority !== 'ALL' ||
    filters.taskType !== 'ALL' ||
    filters.doctor !== 'ALL' ||
    filters.status !== 'ALL' ||
    search.trim() !== '';

  // Registration patients not yet claimed by any nurse — drops out the moment
  // someone clicks "Start Triage" (this page or another nurse's session).
  // Recomputed from local state (not the static AWAITING_TRIAGE_TASKS fixture)
  // so a Reassign/Mark Emergency edit shows up immediately.
  const unclaimedTriageTasks = registrationEntries
    .filter((e) => AWAITING_TRIAGE_STATUSES.includes(e.status))
    .map(toAwaitingTriageTask)
    .filter((t) => !isTriageStarted(t.preAdmissionEntryId as string));
  const PRIORITY_RANK: Record<TaskPriority, number> = { High: 0, Medium: 1, Low: 2 };
  const allTasks = [...tasks, ...unclaimedTriageTasks].sort((a, b) => {
    if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
    if (PRIORITY_RANK[a.priority] !== PRIORITY_RANK[b.priority]) {
      return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    }
    return new Date(a.dueTime).getTime() - new Date(b.dueTime).getTime();
  });

  const q = search.trim().toLowerCase();
  const filtered = allTasks.filter((t) => {
    if (filters.ward !== 'ALL' && t.ward !== filters.ward) return false;
    if (filters.priority !== 'ALL' && t.priority !== filters.priority) return false;
    if (filters.taskType !== 'ALL' && t.taskType !== filters.taskType) return false;
    if (filters.doctor !== 'ALL' && t.doctorName !== filters.doctor) return false;
    if (filters.status !== 'ALL' && t.status !== filters.status) return false;
    if (
      q &&
      !t.patientName.toLowerCase().includes(q) &&
      !t.mrn.toLowerCase().includes(q) &&
      !t.taskType.toLowerCase().includes(q)
    )
      return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * ROWS_PER_PAGE;
  const pageRows = filtered.slice(pageStart, pageStart + ROWS_PER_PAGE);

  const selected = selectedId ? allTasks.find((t) => t.id === selectedId) : undefined;
  const overdueCount = allTasks.filter((t) => t.overdue).length;

  function markStatus(id: string, status: TaskStatus) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status, overdue: false } : t)));
    const task = tasks.find((t) => t.id === id);
    if (status === 'Completed') {
      toast.success(
        'Task completed',
        `${task?.taskType} marked complete for ${task?.patientName}.`,
      );
    } else {
      toast.success('Task updated', `${task?.taskType} is now ${status} for ${task?.patientName}.`);
    }
  }

  function handleEdit(task: QueueTask) {
    toast.info(
      'Not available',
      `Editing "${task.taskType}" for ${task.patientName} is coming soon.`,
    );
  }

  function handleStartTriage(task: QueueTask) {
    const entry = registrationEntries.find((e) => e.id === task.preAdmissionEntryId);
    if (!entry) return;
    const patient = startTriage(entry);
    if (selectedId === task.id) setSelectedId(null);
    setPendingVitalsPatientId(patient.id);
    toast.success('Triage started', `Opening Vital Signs for ${task.patientName}.`);
    router.push(ROUTES.nurseVitalSigns);
  }

  // ── Reassign / Mark Emergency — relocated from Registration's Queue
  // Management screen (now merged here; front-desk staff still reach the
  // same queue via the "View Queue" links on Check-In / Emergency Registration).

  function openReassign(task: QueueTask) {
    setSelectedId(task.id);
    setReassignDept(task.department ?? '');
    setReassignClinic(task.assignedClinic ?? '');
    setReassignOpen(true);
  }

  function confirmReassign() {
    const entryId = selected?.preAdmissionEntryId;
    if (!entryId || !reassignClinic) return;
    const patientName = selected?.patientName;
    setRegistrationEntries((prev) =>
      prev.map((e) =>
        e.id === entryId
          ? {
              ...e,
              department: reassignDept,
              assignedClinic: reassignClinic,
              history: [
                ...e.history,
                {
                  time: new Date().toISOString(),
                  label: `Reassigned to ${reassignClinic}`,
                  by: actorName,
                },
              ],
            }
          : e,
      ),
    );
    toast.success('Queue reassigned', `${patientName} moved to ${reassignClinic}.`);
    setReassignOpen(false);
  }

  function markEmergency(task: QueueTask) {
    if (!task.preAdmissionEntryId || task.isEmergency) return;
    const entryId = task.preAdmissionEntryId;
    setRegistrationEntries((prev) =>
      prev.map((e) =>
        e.id === entryId
          ? {
              ...e,
              isEmergency: true,
              status: 'Emergency',
              history: [
                ...e.history,
                {
                  time: new Date().toISOString(),
                  label: 'Marked as Emergency Priority',
                  by: actorName,
                },
              ],
            }
          : e,
      ),
    );
    toast.success('Marked as emergency', `${task.patientName} moved to high-priority queue.`);
  }

  const reassignClinicOptions = Array.from(
    new Set(
      registrationEntries.filter((e) => e.department === reassignDept).map((e) => e.assignedClinic),
    ),
  ).map((c) => ({ value: c, label: c }));

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
              Patient Queue
            </span>
          </nav>

          <h1
            className="font-display mt-2 font-semibold"
            style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
          >
            Patient Queue
          </h1>
          <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
            Everyone who needs a nurse — from Registration check-in and triage through to
            medication, dressing, and observation for admitted patients.
          </p>

          {pageState === 'error' ? (
            <div
              className="mt-5 flex flex-col items-center justify-center gap-3 rounded-[12px] py-16 text-center"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <AlertCircle style={{ width: 36, height: 36, color: '#EF4444' }} />
              <p className="font-sans font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Failed to load the patient queue
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
                  : QUEUE_STATS.map((s) => {
                      const value =
                        s.id === 'total-queue'
                          ? String(filtered.length)
                          : s.id === 'overdue'
                            ? String(overdueCount)
                            : s.id === 'awaiting-triage'
                              ? String(unclaimedTriageTasks.length)
                              : s.value;
                      return (
                        <div
                          key={s.id}
                          className="rounded-[12px] p-4"
                          style={{
                            background: '#FFFFFF',
                            border: '1px solid rgba(0,100,130,0.12)',
                          }}
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
                            {value}
                          </p>
                          <p className="mt-0.5" style={{ fontSize: 14, color: '#8A98A3' }}>
                            {s.subLabel}
                          </p>
                        </div>
                      );
                    })}
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
                    placeholder="Search patient, MRN or task..."
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

                <button
                  type="button"
                  onClick={clearFilters}
                  disabled={!hasActiveFilters}
                  className="flex h-11 shrink-0 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
                  style={{
                    fontSize: 14,
                    color: '#0D2630',
                    border: '1px solid rgba(0,100,130,0.2)',
                  }}
                >
                  <RefreshCw style={{ width: 15, height: 15 }} />
                  Reset
                </button>
              </div>

              {/* ── Table + detail panel ───────────────────────────────────── */}
              <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-start">
                <div
                  className="min-w-0 flex-1 rounded-[12px] p-4"
                  style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                >
                  <div className="overflow-x-auto scroll-smooth">
                    <div className="min-w-[1280px]">
                      <div
                        className="flex items-center rounded-t-[8px]"
                        style={{
                          background: 'rgba(226,237,241,0.4)',
                          borderBottom: '1px solid #E6F8FD',
                        }}
                      >
                        {[
                          ['Patient', 'min-w-[180px] flex-1 pl-3'],
                          ['Ward/Location', 'w-36'],
                          ['Bed/Clinic', 'w-28'],
                          ['Assigned Doctor', 'w-44'],
                          ['Next Nursing Task', 'w-52'],
                          ['Due Time', 'w-28'],
                          ['Priority', 'w-24'],
                          ['Status', 'w-28'],
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
                        <div className="w-64 shrink-0 py-2.5 pr-3 text-right">
                          <span
                            className="font-sans font-bold tracking-wider uppercase"
                            style={{ fontSize: 14, color: '#4A7080' }}
                          >
                            Actions
                          </span>
                        </div>
                      </div>

                      {pageState === 'loading' &&
                        Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)}

                      {pageState === 'loaded' && pageRows.length === 0 && (
                        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                          <div
                            className="flex size-14 items-center justify-center rounded-full"
                            style={{ background: 'rgba(226,237,241,0.6)' }}
                          >
                            <ClipboardList style={{ width: 24, height: 24, color: '#8A98A3' }} />
                          </div>
                          <div>
                            <p
                              className="font-sans font-medium"
                              style={{ fontSize: 16, color: '#4A7080' }}
                            >
                              No patients match this filter
                            </p>
                            <p className="mt-0.5" style={{ fontSize: 14, color: '#8A98A3' }}>
                              Try a different ward, priority, task type, or status filter.
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
                      )}

                      {pageState === 'loaded' &&
                        pageRows.map((task) => {
                          const taskCfg = TASK_TYPE_CFG[task.taskType];
                          const priorityCfg = PRIORITY_CFG[task.priority];
                          const statusCfg = STATUS_CFG[task.status];
                          const TaskIcon: LucideIcon = taskCfg.icon;
                          const isPreAdmission = Boolean(task.preAdmissionEntryId);
                          return (
                            <div
                              key={task.id}
                              onClick={() => setSelectedId(task.id)}
                              className="flex cursor-pointer items-center transition-colors duration-100 hover:bg-[#F5FBFD]"
                              style={{
                                borderBottom: '1px solid rgba(0,100,130,0.08)',
                                background: selectedId === task.id ? '#E6F8FD' : 'transparent',
                              }}
                            >
                              <div className="flex min-w-[180px] flex-1 items-center gap-2.5 py-3 pr-2 pl-3">
                                <div
                                  className="flex size-9 shrink-0 items-center justify-center rounded-full font-sans text-sm font-semibold text-white"
                                  style={{ background: task.avatarBg }}
                                >
                                  {task.initials}
                                </div>
                                <div className="min-w-0">
                                  <p
                                    className="truncate font-sans font-medium"
                                    style={{ fontSize: 14, color: '#0D2630' }}
                                  >
                                    {task.patientName}
                                  </p>
                                  <p
                                    className="truncate"
                                    style={{ fontSize: 14, color: '#00B4D8' }}
                                  >
                                    {task.mrn}
                                  </p>
                                </div>
                              </div>
                              <div className="w-36 shrink-0 py-3 pr-2">
                                <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                                  {task.ward ?? task.department ?? '—'}
                                </p>
                              </div>
                              <div className="w-28 shrink-0 py-3 pr-2">
                                <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                                  {task.bed ?? task.assignedClinic ?? '—'}
                                </p>
                              </div>
                              <div className="w-44 shrink-0 py-3 pr-2">
                                <p
                                  className="truncate font-sans font-medium"
                                  style={{ fontSize: 14, color: '#0D2630' }}
                                >
                                  {task.doctorName}
                                </p>
                                <p className="truncate" style={{ fontSize: 14, color: '#8A98A3' }}>
                                  {task.doctorRole}
                                </p>
                              </div>
                              <div className="flex w-52 shrink-0 items-center gap-2 py-3 pr-2">
                                <div
                                  className="flex size-7 shrink-0 items-center justify-center rounded-full"
                                  style={{ background: taskCfg.bg }}
                                >
                                  <TaskIcon
                                    style={{ width: 13, height: 13, color: taskCfg.color }}
                                  />
                                </div>
                                <div className="min-w-0">
                                  <p
                                    className="truncate font-sans font-medium"
                                    style={{ fontSize: 14, color: '#0D2630' }}
                                  >
                                    {task.taskType}
                                  </p>
                                  <p
                                    className="truncate"
                                    style={{ fontSize: 14, color: '#8A98A3' }}
                                  >
                                    {task.taskDetail}
                                  </p>
                                </div>
                              </div>
                              <div className="w-28 shrink-0 py-3 pr-2">
                                <p
                                  className="font-sans font-medium whitespace-nowrap"
                                  style={{ fontSize: 14, color: '#0D2630' }}
                                >
                                  {formatTime(task.dueTime)}
                                </p>
                                <p
                                  className="truncate"
                                  style={{
                                    fontSize: 14,
                                    color: task.overdue ? '#EF4444' : '#8A98A3',
                                  }}
                                >
                                  {task.status === 'Completed' ? 'Done' : task.dueLabel}
                                </p>
                              </div>
                              <div className="w-24 shrink-0 py-3 pr-2">
                                <span
                                  className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium"
                                  style={{
                                    fontSize: 14,
                                    whiteSpace: 'nowrap',
                                    color: priorityCfg.color,
                                    border: `1px solid ${priorityCfg.border}`,
                                    background: priorityCfg.bg,
                                  }}
                                >
                                  {task.priority}
                                </span>
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
                                  {task.status}
                                </span>
                              </div>
                              <div
                                className="flex w-64 shrink-0 items-center justify-end gap-1 py-3 pr-3"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {isPreAdmission ? (
                                  <PermissionGate permission={PERMISSIONS.ENCOUNTERS_WRITE}>
                                    <button
                                      type="button"
                                      onClick={() => openReassign(task)}
                                      aria-label={`Reassign ${task.patientName}`}
                                      className="flex size-8 shrink-0 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                                    >
                                      <Repeat style={{ width: 15, height: 15, color: '#4A7080' }} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => markEmergency(task)}
                                      disabled={task.isEmergency}
                                      aria-label={`Prioritize ${task.patientName} as emergency`}
                                      className="flex size-8 shrink-0 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-30"
                                    >
                                      <AlertTriangle
                                        style={{ width: 15, height: 15, color: '#EF4444' }}
                                      />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleStartTriage(task)}
                                      className="flex h-9 shrink-0 items-center gap-1.5 rounded-[8px] px-3 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                                      style={{
                                        fontSize: 14,
                                        background: '#00B4D8',
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      <UserPlus style={{ width: 14, height: 14 }} />
                                      Start Triage
                                    </button>
                                  </PermissionGate>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => setSelectedId(task.id)}
                                      aria-label={`View ${task.patientName}`}
                                      className="flex size-8 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                                    >
                                      <Eye style={{ width: 15, height: 15, color: '#4A7080' }} />
                                    </button>
                                    <PermissionGate permission={PERMISSIONS.ENCOUNTERS_WRITE}>
                                      <button
                                        type="button"
                                        onClick={() => handleEdit(task)}
                                        aria-label={`Edit task for ${task.patientName}`}
                                        className="flex size-8 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                                      >
                                        <SquarePen
                                          style={{ width: 15, height: 15, color: '#4A7080' }}
                                        />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => markStatus(task.id, 'Completed')}
                                        disabled={task.status === 'Completed'}
                                        aria-label={`Mark task complete for ${task.patientName}`}
                                        className="flex size-8 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-30"
                                      >
                                        <CheckCircle2
                                          style={{ width: 15, height: 15, color: '#22C55E' }}
                                        />
                                      </button>
                                    </PermissionGate>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  {pageState === 'loaded' && filtered.length > 0 && (
                    <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
                      <p style={{ fontSize: 14, color: '#4A7080' }}>
                        Showing {pageStart + 1} to{' '}
                        {Math.min(pageStart + ROWS_PER_PAGE, filtered.length)} of {filtered.length}{' '}
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
                      <div className="flex flex-wrap items-center gap-3">
                        {LEGEND.map((l) => (
                          <div key={l.label} className="flex items-center gap-1.5">
                            <span
                              className="size-2 shrink-0 rounded-full"
                              style={{ background: l.color }}
                            />
                            <span style={{ fontSize: 14, color: '#8A98A3' }}>{l.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Docked detail panel ─────────────────────────────────── */}
                {selected && (
                  <div
                    className="flex w-full shrink-0 flex-col overflow-hidden xl:w-[360px]"
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid rgba(0,100,130,0.12)',
                      borderRadius: 12,
                    }}
                  >
                    <div className="flex items-start justify-between gap-3 px-4 py-4 sm:px-5">
                      <div>
                        <div className="flex items-center gap-2">
                          <p
                            className="font-display font-semibold"
                            style={{ fontSize: 16, color: '#0D2630' }}
                          >
                            {selected.patientName}
                          </p>
                          <span
                            className="rounded-full px-2.5 py-0.5 font-sans font-medium"
                            style={{
                              fontSize: 14,
                              color: STATUS_CFG[selected.status].color,
                              border: `1px solid ${STATUS_CFG[selected.status].border}`,
                              background: STATUS_CFG[selected.status].bg,
                            }}
                          >
                            {selected.status}
                          </span>
                        </div>
                        <p style={{ fontSize: 14, color: '#00B4D8' }}>{selected.mrn}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedId(null)}
                        aria-label="Close"
                        className="flex size-9 shrink-0 items-center justify-center rounded-full transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                      >
                        <X style={{ width: 18, height: 18, color: '#4A7080' }} />
                      </button>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto scroll-smooth px-4 pb-4 sm:px-5">
                      <div className="flex flex-col gap-3">
                        {[
                          [
                            selected.preAdmissionEntryId ? 'Department' : 'Ward',
                            selected.ward ?? selected.department ?? '—',
                          ],
                          [
                            selected.preAdmissionEntryId ? 'Clinic' : 'Bed',
                            selected.bed ?? selected.assignedClinic ?? '—',
                          ],
                          ['Assigned Doctor', `${selected.doctorName} (${selected.doctorRole})`],
                          ['Task Type', selected.taskType],
                          ['Task Detail', selected.taskDetail],
                          [
                            'Due Time',
                            `${formatTime(selected.dueTime)} — ${selected.status === 'Completed' ? 'Done' : selected.dueLabel}`,
                          ],
                          ['Priority', selected.priority],
                        ].map(([label, value]) => (
                          <div key={label} className="flex items-center justify-between gap-2">
                            <span style={{ fontSize: 14, color: '#8A98A3' }}>{label}</span>
                            <span
                              className="max-w-[200px] truncate text-right font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {selected.preAdmissionEntryId && reassignOpen ? (
                      <div className="p-4 pt-0 sm:p-5 sm:pt-0">
                        <div
                          className="animate-in fade-in-0 slide-in-from-top-1 flex flex-col gap-2.5 rounded-[10px] p-3 duration-150"
                          style={{
                            border: '1px solid rgba(0,180,216,0.3)',
                            background: 'rgba(0,180,216,0.04)',
                          }}
                        >
                          <p
                            className="font-sans font-medium"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            Reassign to
                          </p>
                          <FormSelect
                            id="reassign-department"
                            value={reassignDept}
                            onChange={(v) => {
                              setReassignDept(v);
                              setReassignClinic('');
                            }}
                            options={DEPARTMENTS.map((d) => ({ value: d, label: d }))}
                            placeholder="Select department"
                          />
                          <FormSelect
                            id="reassign-clinic"
                            value={reassignClinic}
                            onChange={setReassignClinic}
                            options={reassignClinicOptions}
                            placeholder="Select clinic"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={confirmReassign}
                              disabled={!reassignClinic}
                              className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[8px] font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
                              style={{ fontSize: 14, background: '#00B4D8' }}
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => setReassignOpen(false)}
                              className="flex h-9 flex-1 items-center justify-center rounded-[8px] font-sans font-medium transition-colors duration-150 hover:bg-white focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                              style={{
                                fontSize: 14,
                                color: '#4A7080',
                                border: '1px solid rgba(0,100,130,0.18)',
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <PermissionGate permission={PERMISSIONS.ENCOUNTERS_WRITE}>
                        <div className="flex flex-col gap-2 p-4 pt-0 sm:p-5 sm:pt-0">
                          {selected.preAdmissionEntryId ? (
                            <>
                              <div className="grid grid-cols-2 gap-2.5">
                                <button
                                  type="button"
                                  onClick={() => openReassign(selected)}
                                  className="flex h-10 items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                                  style={{
                                    fontSize: 14,
                                    color: '#00B4D8',
                                    border: '1px solid rgba(0,180,216,0.35)',
                                  }}
                                >
                                  <Repeat style={{ width: 15, height: 15 }} />
                                  Reassign
                                </button>
                                <button
                                  type="button"
                                  onClick={() => markEmergency(selected)}
                                  disabled={selected.isEmergency}
                                  className="flex h-10 items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium transition-colors duration-150 hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-400/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
                                  style={{
                                    fontSize: 14,
                                    color: '#EF4444',
                                    border: '1px solid rgba(239,68,68,0.35)',
                                  }}
                                >
                                  <AlertTriangle style={{ width: 15, height: 15 }} />
                                  Mark Emergency
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleStartTriage(selected)}
                                className="flex h-11 w-full items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                                style={{ fontSize: 14, background: '#00B4D8' }}
                              >
                                <UserPlus style={{ width: 15, height: 15 }} />
                                Start Triage
                              </button>
                            </>
                          ) : (
                            <>
                              {selected.status === 'Pending' && (
                                <button
                                  type="button"
                                  onClick={() => markStatus(selected.id, 'In Progress')}
                                  className="flex h-11 w-full items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                                  style={{
                                    fontSize: 14,
                                    color: '#0D2630',
                                    border: '1px solid rgba(0,100,130,0.2)',
                                  }}
                                >
                                  Mark In Progress
                                </button>
                              )}
                              {selected.status !== 'Completed' && (
                                <button
                                  type="button"
                                  onClick={() => markStatus(selected.id, 'Completed')}
                                  className="flex h-11 w-full items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                                  style={{ fontSize: 14, background: '#00B4D8' }}
                                >
                                  <CheckCircle2 style={{ width: 15, height: 15 }} />
                                  Mark Complete
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </PermissionGate>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          <div className="h-4" />
        </div>
      </main>
    </div>
  );
}
