'use client';

import {
  AlertCircle,
  ArrowLeftRight,
  BarChart3,
  Calendar,
  CalendarCheck,
  CheckCircle2,
  ClipboardEdit,
  Clock,
  Eye,
  ListFilter,
  Megaphone,
  MoreVertical,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  Users,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';

import { ExportMenu } from '@/components/ExportMenu';
import { FilterDropdown } from '@components/shared/FilterDropdown';
import { ModalLoadingFallback } from '@components/shared/ModalLoadingFallback';
import { Pagination } from '@components/shared/Pagination';
import { RowMenuPortal } from '@components/shared/RowMenuPortal';
import { StatCardCompact } from '@components/shared/StatCard';
import { useToast } from '@/hooks/useToast';
import { downloadCSV, downloadPDF, escapeHtml } from '@/utils/export';
import {
  COVERAGE_OVERVIEW,
  MOCK_NURSE_ROSTER,
  PENDING_ACKNOWLEDGEMENTS,
  ROLE_OPTIONS,
  SHIFT_TYPE_OPTIONS,
  STATUS_OPTIONS,
  WORKFORCE_STATS,
  type NurseShift,
  type ShiftStatus,
  type ShiftType,
} from '@/features/nursing/__mocks__/nurseWorkforceFixtures';

const CreateEditNurseShiftModal = dynamic(
  () => import('./CreateEditNurseShiftModal').then((m) => m.CreateEditNurseShiftModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);
const NurseShiftDetailModal = dynamic(
  () => import('./NurseShiftDetailModal').then((m) => m.NurseShiftDetailModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

// ── Types ─────────────────────────────────────────────────────────────────────

type PageState = 'loading' | 'loaded' | 'error';

type FilterKey = 'shiftType' | 'role' | 'status';

type FilterState = {
  shiftType: ShiftType | 'ALL';
  role: string | 'ALL';
  status: ShiftStatus | 'ALL';
};

const FILTER_DEFAULTS: FilterState = { shiftType: 'ALL', role: 'ALL', status: 'ALL' };

type FilterDef = {
  key: FilterKey;
  defaultLabel: string;
  options: { value: string; label: string }[];
};

const FILTER_DEFS: FilterDef[] = [
  {
    key: 'shiftType',
    defaultLabel: 'All Shifts',
    options: SHIFT_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
  },
  {
    key: 'role',
    defaultLabel: 'All Roles',
    options: ROLE_OPTIONS,
  },
  {
    key: 'status',
    defaultLabel: 'All Status',
    options: STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
  },
];

// ── Config ────────────────────────────────────────────────────────────────────

const SHIFT_TYPE_CFG: Record<
  ShiftType,
  { label: string; color: string; border: string; bg: string }
> = {
  EMERGENCY: {
    label: 'EMERGENCY',
    color: '#EF4444',
    border: 'rgba(239,68,68,0.35)',
    bg: 'rgba(239,68,68,0.06)',
  },
  NIGHT: {
    label: 'NIGHT',
    color: '#8B5CF6',
    border: 'rgba(139,92,246,0.35)',
    bg: 'rgba(139,92,246,0.06)',
  },
  ON_CALL: {
    label: 'ON CALL',
    color: '#EC4899',
    border: 'rgba(236,72,153,0.35)',
    bg: 'rgba(236,72,153,0.06)',
  },
  MORNING: {
    label: 'MORNING',
    color: '#3B82F6',
    border: 'rgba(59,130,246,0.35)',
    bg: 'rgba(59,130,246,0.06)',
  },
  AFTERNOON: {
    label: 'AFTERNOON',
    color: '#22C55E',
    border: 'rgba(34,197,94,0.35)',
    bg: 'rgba(34,197,94,0.06)',
  },
};

const STATUS_CFG: Record<
  ShiftStatus,
  { label: string; color: string; border: string; bg: string }
> = {
  ON_DUTY: {
    label: 'ON DUTY',
    color: '#22C55E',
    border: 'rgba(34,197,94,0.40)',
    bg: 'transparent',
  },
  SCHEDULED: {
    label: 'SCHEDULED',
    color: '#00B4D8',
    border: 'rgba(0,180,216,0.40)',
    bg: 'transparent',
  },
  ON_CALL: {
    label: 'ON CALL',
    color: '#EF4444',
    border: 'rgba(239,68,68,0.40)',
    bg: 'rgba(239,68,68,0.06)',
  },
  COMPLETED: {
    label: 'COMPLETED',
    color: '#6B7280',
    border: 'rgba(107,114,128,0.40)',
    bg: 'transparent',
  },
};

const COLS = [
  { key: 'nurse', label: 'Nurse', width: 'w-[20%]', align: '' },
  { key: 'role', label: 'Role', width: 'w-[10%]', align: '' },
  { key: 'shift', label: 'Shift', width: 'w-28 shrink-0', align: '' },
  { key: 'time', label: 'Time', width: 'w-[14%]', align: '' },
  { key: 'ward', label: 'Ward', width: 'min-w-0 flex-1', align: '' },
  { key: 'status', label: 'Status', width: 'w-28 shrink-0', align: '' },
  { key: 'ack', label: 'Acknowledged', width: 'w-32 shrink-0', align: 'text-center' },
  { key: 'actions', label: 'Actions', width: 'w-28 shrink-0', align: '' },
] as const;

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50];

// ── Export helpers ────────────────────────────────────────────────────────────

function exportRosterAsPDF(rows: NurseShift[]) {
  const body = `
    <h1>Today's Nursing Roster</h1>
    <p class="meta">${rows.length} shift${rows.length === 1 ? '' : 's'}</p>
    <table>
      <thead><tr><th>Nurse</th><th>Role</th><th>Shift</th><th>Time</th><th>Ward</th><th>Status</th></tr></thead>
      <tbody>
        ${rows
          .map(
            (r) =>
              `<tr><td>${escapeHtml(r.staffName)}</td><td>${escapeHtml(r.role)}</td><td>${escapeHtml(SHIFT_TYPE_CFG[r.shiftType].label)}</td><td>${escapeHtml(r.timeRange)}</td><td>${escapeHtml(r.ward)}</td><td>${escapeHtml(STATUS_CFG[r.status].label)}</td></tr>`,
          )
          .join('')}
      </tbody>
    </table>
  `;
  downloadPDF('nursing-workforce-roster', body);
}

function exportRosterAsCSV(rows: NurseShift[]) {
  downloadCSV('nursing-workforce-roster', [
    ['Nurse', 'Role', 'Shift', 'Time', 'Ward', 'Status', 'Acknowledged'],
    ...rows.map((r) => [
      r.staffName,
      r.role,
      SHIFT_TYPE_CFG[r.shiftType].label,
      r.timeRange,
      r.ward,
      STATUS_CFG[r.status].label,
      r.acknowledged ? 'Yes' : 'Pending',
    ]),
  ]);
}

// ── Quick action tile ─────────────────────────────────────────────────────────

function QuickAction({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Users;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-13 items-center justify-center gap-2.5 rounded-[10px] px-3 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)', fontSize: 14 }}
    >
      <Icon style={{ width: 18, height: 18, color: '#00B4D8', flexShrink: 0 }} />
      <span style={{ color: '#0D2630' }}>{label}</span>
    </button>
  );
}

// ── Skeletons ─────────────────────────────────────────────────────────────────

function SkeletonStatCard() {
  return (
    <div
      className="flex flex-col rounded-[12px] p-4"
      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
    >
      <div className="h-3.5 w-24 animate-pulse rounded bg-slate-100" />
      <div className="mt-2.5 h-7 w-14 animate-pulse rounded bg-slate-100" />
      <div className="mt-2 h-3.5 w-28 animate-pulse rounded bg-slate-100" />
    </div>
  );
}

function SkeletonRosterRow() {
  return (
    <div
      className="flex min-h-[64px] animate-pulse items-center px-2"
      style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
    >
      <div className="flex w-[20%] items-center gap-2.5 py-3 pr-3 pl-3">
        <div className="size-9 shrink-0 rounded-full bg-slate-100" />
        <div className="h-4 w-24 rounded bg-slate-100" />
      </div>
      <div className="w-[10%] py-3 pr-3">
        <div className="h-4 w-16 rounded bg-slate-100" />
      </div>
      <div className="w-28 shrink-0 py-3 pr-3">
        <div className="h-6 w-20 rounded-full bg-slate-100" />
      </div>
      <div className="w-[14%] py-3 pr-3">
        <div className="h-4 w-24 rounded bg-slate-100" />
      </div>
      <div className="min-w-0 flex-1 py-3 pr-3">
        <div className="h-4 w-28 rounded bg-slate-100" />
      </div>
      <div className="w-28 shrink-0 py-3 pr-3">
        <div className="h-6 w-20 rounded-full bg-slate-100" />
      </div>
      <div className="flex w-32 shrink-0 justify-center py-3 pr-3">
        <div className="size-5 rounded-full bg-slate-100" />
      </div>
      <div className="flex w-28 shrink-0 items-center gap-2 py-3 pr-3">
        <div className="size-8 rounded-lg bg-slate-100" />
        <div className="size-8 rounded-lg bg-slate-100" />
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function NurseWorkforceManagementWorkspace() {
  const toast = useToast();
  const [pageState, setPageState] = useState<PageState>('loading');
  const [roster, setRoster] = useState<NurseShift[]>(MOCK_NURSE_ROSTER);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<FilterState>(FILTER_DEFAULTS);
  const [openFilter, setOpenFilter] = useState<FilterKey | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<NurseShift | null>(null);
  const [viewingShift, setViewingShift] = useState<NurseShift | null>(null);
  const [openRowMenuId, setOpenRowMenuId] = useState<string | null>(null);

  const filterBarRef = useRef<HTMLDivElement>(null);
  const rosterSectionRef = useRef<HTMLDivElement>(null);
  const [showAllAcks, setShowAllAcks] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setPageState('loaded'), 800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (filterBarRef.current && !filterBarRef.current.contains(e.target as Node)) {
        setOpenFilter(null);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleRetry() {
    setPageState('loading');
    setTimeout(() => setPageState('loaded'), 800);
  }

  function setFilter(key: FilterKey, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setOpenFilter(null);
    setPage(1);
  }

  function clearFilters() {
    setFilters(FILTER_DEFAULTS);
    setSearch('');
    setPage(1);
  }

  const hasActiveFilters =
    filters.shiftType !== 'ALL' ||
    filters.role !== 'ALL' ||
    filters.status !== 'ALL' ||
    search.trim() !== '';

  const q = search.trim().toLowerCase();
  const filtered = roster.filter((s) => {
    const matchesSearch = !q || s.staffName.toLowerCase().includes(q);
    const matchesShift = filters.shiftType === 'ALL' || s.shiftType === filters.shiftType;
    const matchesRole = filters.role === 'ALL' || s.role === filters.role;
    const matchesStatus = filters.status === 'ALL' || s.status === filters.status;
    return matchesSearch && matchesShift && matchesRole && matchesStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const clampedPage = Math.min(page, totalPages);
  const paginated = filtered.slice((clampedPage - 1) * pageSize, clampedPage * pageSize);

  const rowMenuButtonRefs = useMemo(() => {
    const map = new Map<string, RefObject<HTMLButtonElement | null>>();
    for (const shift of paginated) map.set(shift.id, { current: null });
    return map;
  }, [paginated]);

  function getRowMenuButtonRef(id: string) {
    return rowMenuButtonRefs.get(id) ?? { current: null };
  }

  function handleManageOnCall() {
    setFilters((prev) => ({ ...prev, status: 'ON_CALL' }));
    setSearch('');
    setPage(1);
    rosterSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handleCreateShift(shift: NurseShift) {
    setRoster((prev) => [shift, ...prev]);
    setCreateOpen(false);
    toast.success('Shift created', `${shift.staffName}'s shift has been added to the roster.`);
  }

  function handleUpdateShift(shift: NurseShift) {
    setRoster((prev) => prev.map((s) => (s.id === shift.id ? shift : s)));
    setEditingShift(null);
    toast.success('Shift updated', `${shift.staffName}'s shift has been updated.`);
  }

  function handleCancelShift(shift: NurseShift) {
    setRoster((prev) => prev.filter((s) => s.id !== shift.id));
    setOpenRowMenuId(null);
    toast.info('Shift cancelled', `${shift.staffName}'s shift has been removed from the roster.`);
  }

  function handleDuplicateShift(shift: NurseShift) {
    setRoster((prev) => [{ ...shift, id: `nws-dup-${Date.now()}` }, ...prev]);
    setOpenRowMenuId(null);
    toast.success('Shift duplicated', `A copy of ${shift.staffName}'s shift has been added.`);
  }

  function handleSetReminder(staffName: string) {
    toast.success('Reminder sent', `A shift-acknowledgement reminder was sent to ${staffName}.`);
  }

  function handlePublishRoster() {
    toast.success('Roster published', 'Today’s roster has been published to all nurses.');
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto max-w-[1200px] px-4 py-4 sm:px-6 sm:py-5">
          {/* ── Header ──────────────────────────────────────────────────────── */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1
                className="font-display font-semibold"
                style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
              >
                Workforce Management
              </h1>
              <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                Manage nursing schedules, duty rosters, ward coverage and shift operations.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="flex h-11 items-center gap-2 rounded-[10px] px-4 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                style={{ background: '#00B4D8', fontSize: 14 }}
              >
                <Plus style={{ width: 16, height: 16 }} />
                Create Shift
              </button>
              <button
                type="button"
                onClick={handlePublishRoster}
                className="flex h-11 items-center gap-2 rounded-[10px] px-4 font-sans font-semibold transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                style={{
                  background: '#FFFFFF',
                  border: '1px solid rgba(0,100,130,0.15)',
                  color: '#0D2630',
                  fontSize: 14,
                }}
              >
                <CalendarCheck style={{ width: 16, height: 16, color: '#4A7080' }} />
                Publish Roster
              </button>
              <ExportMenu
                variant="button"
                onExportPDF={() => exportRosterAsPDF(filtered)}
                onExportCSV={() => exportRosterAsCSV(filtered)}
              />
            </div>
          </div>

          {/* ── Stat cards ──────────────────────────────────────────────────── */}
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            {pageState === 'loading' ? (
              Array.from({ length: 6 }).map((_, i) => <SkeletonStatCard key={i} />)
            ) : pageState === 'error' ? (
              <div
                className="col-span-full flex flex-col items-center justify-center gap-3 rounded-[12px] py-10 text-center"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <AlertCircle style={{ width: 32, height: 32, color: '#EF4444' }} />
                <p className="font-sans font-semibold" style={{ fontSize: 15, color: '#0D2630' }}>
                  Failed to load workforce data
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
                <StatCardCompact
                  icon={Users}
                  iconBg="rgba(0,180,216,0.10)"
                  iconColor="#00B4D8"
                  label="Nurses on Duty"
                  value={String(WORKFORCE_STATS.onDuty)}
                  info="Currently clocked in"
                  infoColor="#22C55E"
                />
                <StatCardCompact
                  icon={Calendar}
                  iconBg="rgba(0,180,216,0.10)"
                  iconColor="#00B4D8"
                  label="Today's Shift"
                  value={String(WORKFORCE_STATS.todaysShifts)}
                  info="Morning • Afternoon • Night"
                  infoColor="#4A7080"
                />
                <StatCardCompact
                  icon={Phone}
                  iconBg="rgba(0,180,216,0.10)"
                  iconColor="#00B4D8"
                  label="On-Call Nurses"
                  value={String(WORKFORCE_STATS.onCall)}
                  info="Currently Available"
                  infoColor="#4A7080"
                />
                <StatCardCompact
                  icon={UserCheck}
                  iconBg="rgba(245,158,11,0.10)"
                  iconColor="#F59E0B"
                  label="Shifts Acknowledgement"
                  value={String(WORKFORCE_STATS.pendingAck)}
                  info="Requires attention"
                  infoColor="#F59E0B"
                />
                <StatCardCompact
                  icon={ShieldCheck}
                  iconBg="rgba(34,197,94,0.10)"
                  iconColor="#22C55E"
                  label="Coverage Status"
                  value={`${WORKFORCE_STATS.coveragePercent}%`}
                  info="Ward staffed"
                  infoColor="#4A7080"
                />
                <StatCardCompact
                  icon={ArrowLeftRight}
                  iconBg="rgba(0,180,216,0.10)"
                  iconColor="#00B4D8"
                  label="Shifts Changes"
                  value={`${WORKFORCE_STATS.pendingChanges} Requests`}
                  info="Pending approval"
                  infoColor="#4A7080"
                />
              </>
            )}
          </div>

          {/* ── Quick actions ───────────────────────────────────────────────── */}
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <QuickAction
              icon={ClipboardEdit}
              label="Create Shift"
              onClick={() => setCreateOpen(true)}
            />
            <QuickAction icon={Phone} label="Manage On-Call" onClick={handleManageOnCall} />
            <QuickAction icon={Megaphone} label="Publish Schedule" onClick={handlePublishRoster} />
            <QuickAction
              icon={BarChart3}
              label="Workforce Report"
              onClick={() => exportRosterAsPDF(filtered)}
            />
          </div>

          {/* ── Today's Roster ──────────────────────────────────────────────── */}
          <div
            ref={rosterSectionRef}
            className="mt-5 overflow-hidden rounded-[12px]"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <div className="p-4 sm:p-5">
              <h2
                className="font-display font-semibold"
                style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
              >
                Today&apos;s Roster
              </h2>

              <div ref={filterBarRef} className="mt-4 flex flex-wrap items-center gap-2.5">
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
                      setPage(1);
                    }}
                    placeholder="Search nurse by name"
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
                  aria-label="Clear filters"
                  disabled={!hasActiveFilters}
                  className="flex size-11 shrink-0 items-center justify-center rounded-[10px] transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none disabled:cursor-not-allowed"
                  style={{
                    border: '1px solid #0064821F',
                    background: '#FFFFFF',
                    opacity: hasActiveFilters ? 1 : 0.4,
                  }}
                >
                  <ListFilter style={{ width: 16, height: 16, color: '#4A7080' }} />
                </button>
              </div>
            </div>

            {pageState === 'loading' ? (
              <div className="pb-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonRosterRow key={i} />
                ))}
              </div>
            ) : pageState === 'error' ? null : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
                <div
                  className="flex size-14 items-center justify-center rounded-full"
                  style={{ background: 'rgba(226,237,241,0.6)' }}
                >
                  <Users style={{ width: 28, height: 28, color: '#8A98A3' }} />
                </div>
                <p className="font-sans font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                  No nurses match this filter
                </p>
                <p style={{ fontSize: 14, color: '#4A7080' }}>
                  Try adjusting your search or filters.
                </p>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-1 font-sans font-semibold transition-opacity duration-150 hover:opacity-70 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                    style={{ fontSize: 14, color: '#00B4D8' }}
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Mobile card list — below lg */}
                <div className="flex flex-col gap-2.5 px-4 pb-4 lg:hidden">
                  {paginated.map((shift) => {
                    const typeCfg = SHIFT_TYPE_CFG[shift.shiftType];
                    const statusCfg = STATUS_CFG[shift.status];
                    return (
                      <div
                        key={shift.id}
                        className="rounded-[12px] p-3.5"
                        style={{ border: '1px solid rgba(0,100,130,0.10)' }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <div
                              className="flex size-9 shrink-0 items-center justify-center rounded-full font-sans text-sm font-semibold text-white"
                              style={{ background: shift.avatarBg }}
                            >
                              {shift.initials}
                            </div>
                            <div className="min-w-0">
                              <p
                                className="truncate font-sans font-semibold"
                                style={{ fontSize: 14, color: '#0D2630' }}
                              >
                                {shift.staffName}
                              </p>
                              <p style={{ fontSize: 14, color: '#4A7080' }}>{shift.role}</p>
                            </div>
                          </div>
                          {shift.acknowledged ? (
                            <CheckCircle2
                              style={{ width: 18, height: 18, color: '#22C55E', flexShrink: 0 }}
                            />
                          ) : (
                            <Clock
                              style={{ width: 18, height: 18, color: '#F59E0B', flexShrink: 0 }}
                            />
                          )}
                        </div>
                        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                          <span
                            className="rounded-full px-2.5 py-0.5 font-sans font-medium"
                            style={{
                              fontSize: 14,
                              color: typeCfg.color,
                              border: `1px solid ${typeCfg.border}`,
                              background: typeCfg.bg,
                            }}
                          >
                            {typeCfg.label}
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
                            {statusCfg.label}
                          </span>
                        </div>
                        <p className="mt-2" style={{ fontSize: 14, color: '#4A7080' }}>
                          {shift.timeRange} · {shift.ward}
                        </p>
                        <div
                          className="mt-3 flex items-center gap-2"
                          style={{ borderTop: '1px solid rgba(0,100,130,0.08)', paddingTop: 10 }}
                        >
                          <button
                            type="button"
                            onClick={() => setViewingShift(shift)}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-[8px] py-2 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                            style={{
                              border: '1px solid #0064821F',
                              fontSize: 14,
                              color: '#4A7080',
                            }}
                          >
                            <Eye style={{ width: 14, height: 14 }} />
                            View
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingShift(shift)}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-[8px] py-2 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                            style={{
                              border: '1px solid #0064821F',
                              fontSize: 14,
                              color: '#4A7080',
                            }}
                          >
                            <Pencil style={{ width: 14, height: 14 }} />
                            Edit
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop table — lg+ */}
                <div className="hidden overflow-x-auto scroll-smooth lg:block">
                  <div
                    className="flex"
                    style={{
                      background: 'rgba(226,237,241,0.4)',
                      borderTop: '1px solid #0064821F',
                      borderBottom: '1px solid #0064821F',
                    }}
                  >
                    {COLS.map((col) => (
                      <div key={col.key} className={`${col.width} min-w-0 px-3 py-3 ${col.align}`}>
                        <span
                          className="block truncate font-sans font-bold tracking-wider uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          {col.label}
                        </span>
                      </div>
                    ))}
                  </div>

                  {paginated.map((shift) => {
                    const typeCfg = SHIFT_TYPE_CFG[shift.shiftType];
                    const statusCfg = STATUS_CFG[shift.status];
                    const menuOpen = openRowMenuId === shift.id;
                    return (
                      <div
                        key={shift.id}
                        className="flex items-center transition-colors duration-150 hover:bg-[#F5FBFD]"
                        style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                      >
                        <div className="flex w-[20%] min-w-0 items-center gap-2.5 px-3 py-3">
                          <div
                            className="flex size-9 shrink-0 items-center justify-center rounded-full font-sans text-sm font-semibold text-white"
                            style={{ background: shift.avatarBg }}
                          >
                            {shift.initials}
                          </div>
                          <p
                            className="min-w-0 truncate font-sans font-medium"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {shift.staffName}
                          </p>
                        </div>
                        <div className="w-[10%] min-w-0 px-3 py-3">
                          <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                            {shift.role}
                          </p>
                        </div>
                        <div className="w-28 shrink-0 px-3 py-3">
                          <span
                            className="inline-flex rounded-full px-2.5 py-0.5 font-sans font-medium"
                            style={{
                              fontSize: 14,
                              color: typeCfg.color,
                              border: `1px solid ${typeCfg.border}`,
                              background: typeCfg.bg,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {typeCfg.label}
                          </span>
                        </div>
                        <div className="w-[14%] min-w-0 px-3 py-3">
                          <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                            {shift.timeRange}
                          </p>
                        </div>
                        <div className="min-w-0 flex-1 px-3 py-3">
                          <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                            {shift.ward}
                          </p>
                        </div>
                        <div className="w-28 shrink-0 px-3 py-3">
                          <span
                            className="inline-flex rounded-full px-2.5 py-0.5 font-sans font-medium"
                            style={{
                              fontSize: 14,
                              color: statusCfg.color,
                              border: `1px solid ${statusCfg.border}`,
                              background: statusCfg.bg,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {statusCfg.label}
                          </span>
                        </div>
                        <div className="flex w-32 shrink-0 justify-center px-3 py-3">
                          {shift.acknowledged ? (
                            <CheckCircle2 style={{ width: 19, height: 19, color: '#22C55E' }} />
                          ) : (
                            <Clock style={{ width: 19, height: 19, color: '#F59E0B' }} />
                          )}
                        </div>
                        <div className="flex w-28 shrink-0 items-center gap-1.5 px-3 py-3">
                          <button
                            type="button"
                            onClick={() => setViewingShift(shift)}
                            aria-label={`View ${shift.staffName}'s shift`}
                            className="flex size-8 shrink-0 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[rgba(0,180,216,0.08)] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                          >
                            <Eye style={{ width: 15, height: 15, color: '#4A7080' }} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingShift(shift)}
                            aria-label={`Edit ${shift.staffName}'s shift`}
                            className="flex size-8 shrink-0 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[rgba(0,180,216,0.08)] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                          >
                            <Pencil style={{ width: 15, height: 15, color: '#4A7080' }} />
                          </button>
                          <div className="relative shrink-0">
                            <button
                              ref={getRowMenuButtonRef(shift.id)}
                              type="button"
                              onClick={() => setOpenRowMenuId(menuOpen ? null : shift.id)}
                              aria-label="More actions"
                              className="flex size-8 shrink-0 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[rgba(0,180,216,0.08)] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                            >
                              <MoreVertical style={{ width: 15, height: 15, color: '#4A7080' }} />
                            </button>
                            <RowMenuPortal
                              open={menuOpen}
                              anchorRef={getRowMenuButtonRef(shift.id)}
                              onClose={() => setOpenRowMenuId(null)}
                              width={160}
                            >
                              <button
                                type="button"
                                onClick={() => handleDuplicateShift(shift)}
                                className="flex w-full items-center px-4 py-2 text-left font-sans transition-colors duration-150 hover:bg-[rgba(0,180,216,0.06)] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                                style={{ fontSize: 14, color: '#0D2630' }}
                              >
                                Duplicate Shift
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCancelShift(shift)}
                                className="flex w-full items-center px-4 py-2 text-left font-sans transition-colors duration-150 hover:bg-[rgba(239,68,68,0.06)] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                                style={{ fontSize: 14, color: '#EF4444' }}
                              >
                                Cancel Shift
                              </button>
                            </RowMenuPortal>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Pagination
                  page={clampedPage}
                  pageSize={pageSize}
                  totalItems={filtered.length}
                  onPageChange={setPage}
                  onPageSizeChange={(size) => {
                    setPageSize(size);
                    setPage(1);
                  }}
                  itemLabel="nurses"
                  pageSizeOptions={PAGE_SIZE_OPTIONS}
                />
              </>
            )}
          </div>

          {/* ── Coverage Overview + Pending Acknowledgements ────────────────── */}
          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div
              className="rounded-[12px] p-4 sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <h2
                className="font-display font-semibold"
                style={{ fontSize: 18, lineHeight: '26px', color: '#0D2630' }}
              >
                Coverage Overview
              </h2>
              <div className="mt-4 flex flex-col gap-3.5">
                {COVERAGE_OVERVIEW.map((metric) => (
                  <div key={metric.label} className="flex items-center gap-3">
                    <p
                      className="w-[42%] shrink-0 truncate"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      {metric.label}
                    </p>
                    <div
                      className="h-2 min-w-0 flex-1 overflow-hidden rounded-full"
                      style={{ background: '#E2EDF1' }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${metric.percent}%`, background: metric.color }}
                      />
                    </div>
                    <p
                      className="w-10 shrink-0 text-right font-sans font-semibold"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {metric.percent}%
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="rounded-[12px] p-4 sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <div className="flex items-center justify-between">
                <h2
                  className="font-display font-semibold"
                  style={{ fontSize: 18, lineHeight: '26px', color: '#0D2630' }}
                >
                  Pending Shifts Acknowledgement
                </h2>
                {PENDING_ACKNOWLEDGEMENTS.length > 3 && (
                  <button
                    type="button"
                    onClick={() => setShowAllAcks((prev) => !prev)}
                    className="font-sans font-medium transition-opacity duration-150 hover:opacity-70 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                    style={{ fontSize: 14, color: '#00B4D8' }}
                  >
                    {showAllAcks ? 'Show Less' : `View All (${PENDING_ACKNOWLEDGEMENTS.length})`}
                  </button>
                )}
              </div>
              <div className="mt-4 flex flex-col gap-3">
                {PENDING_ACKNOWLEDGEMENTS.length === 0 ? (
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>
                    Everyone has acknowledged their shift.
                  </p>
                ) : (
                  (showAllAcks
                    ? PENDING_ACKNOWLEDGEMENTS
                    : PENDING_ACKNOWLEDGEMENTS.slice(0, 3)
                  ).map((ack) => (
                    <div key={ack.id} className="flex items-center gap-3">
                      <div
                        className="flex size-9 shrink-0 items-center justify-center rounded-full font-sans text-sm font-semibold text-white"
                        style={{ background: ack.avatarBg }}
                      >
                        {ack.initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className="truncate font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {ack.staffName}
                        </p>
                        <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                          {ack.shiftLabel} • {ack.day}
                        </p>
                      </div>
                      <span
                        className="hidden shrink-0 rounded-full px-2.5 py-0.5 font-sans font-medium sm:inline"
                        style={{
                          fontSize: 14,
                          color: '#F59E0B',
                          border: '1px solid rgba(245,158,11,0.40)',
                          background: 'rgba(245,158,11,0.06)',
                        }}
                      >
                        Awaiting
                      </span>
                      <button
                        type="button"
                        onClick={() => handleSetReminder(ack.staffName)}
                        className="shrink-0 rounded-[8px] px-3 py-1.5 font-sans font-medium transition-colors duration-150 hover:bg-[rgba(0,180,216,0.06)] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                        style={{
                          fontSize: 14,
                          color: '#00B4D8',
                          border: '1px solid #00B4D8',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Set Reminder
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="h-4" />
        </div>
      </main>

      {createOpen && (
        <CreateEditNurseShiftModal
          onClose={() => setCreateOpen(false)}
          onSave={handleCreateShift}
        />
      )}
      {editingShift && (
        <CreateEditNurseShiftModal
          editingShift={editingShift}
          onClose={() => setEditingShift(null)}
          onSave={handleUpdateShift}
        />
      )}
      {viewingShift && (
        <NurseShiftDetailModal
          shift={viewingShift}
          onClose={() => setViewingShift(null)}
          onEdit={() => {
            setEditingShift(viewingShift);
            setViewingShift(null);
          }}
        />
      )}
    </div>
  );
}
