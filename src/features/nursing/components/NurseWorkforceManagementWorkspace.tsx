'use client';

import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Clock,
  FileText,
  Plus,
  RefreshCw,
  Search,
  Sheet,
  SquarePen,
  UserCheck,
  Users,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';

import { FilterDropdown } from '@components/shared/FilterDropdown';
import { ModalLoadingFallback } from '@components/shared/ModalLoadingFallback';
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
  WARD_OPTIONS,
  WORKFORCE_STATS,
  type NurseShift,
  type ShiftStatus,
  type ShiftType,
} from '@/features/nursing/__mocks__/nurseWorkforceFixtures';

const CreateEditNurseShiftModal = dynamic(
  () => import('./CreateEditNurseShiftModal').then((m) => m.CreateEditNurseShiftModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

type PageState = 'loading' | 'loaded' | 'error';
const ROWS_PER_PAGE = 8;

type FilterKey = 'ward' | 'shiftType' | 'role' | 'status';
type FilterState = Record<FilterKey, string>;
const FILTER_DEFAULTS: FilterState = { ward: 'ALL', shiftType: 'ALL', role: 'ALL', status: 'ALL' };

const FILTER_DEFS: {
  key: FilterKey;
  defaultLabel: string;
  options: { value: string; label: string }[];
}[] = [
  { key: 'ward', defaultLabel: 'All Wards', options: WARD_OPTIONS },
  { key: 'shiftType', defaultLabel: 'All Shift Types', options: SHIFT_TYPE_OPTIONS },
  { key: 'role', defaultLabel: 'All Roles', options: ROLE_OPTIONS },
  { key: 'status', defaultLabel: 'All Statuses', options: STATUS_OPTIONS },
];

const SHIFT_TYPE_CFG: Record<ShiftType, { color: string; border: string; bg: string }> = {
  MORNING: { color: '#F59E0B', border: 'rgba(245,158,11,0.4)', bg: 'rgba(245,158,11,0.06)' },
  AFTERNOON: { color: '#3B82F6', border: 'rgba(59,130,246,0.4)', bg: 'rgba(59,130,246,0.06)' },
  NIGHT: { color: '#8B5CF6', border: 'rgba(139,92,246,0.4)', bg: 'rgba(139,92,246,0.06)' },
  ON_CALL: { color: '#00B4D8', border: 'rgba(0,180,216,0.4)', bg: 'rgba(0,180,216,0.06)' },
  EMERGENCY: { color: '#EF4444', border: 'rgba(239,68,68,0.4)', bg: 'rgba(239,68,68,0.06)' },
};

const STATUS_CFG: Record<ShiftStatus, { color: string; border: string; bg: string }> = {
  ON_DUTY: { color: '#22C55E', border: 'rgba(34,197,94,0.4)', bg: 'transparent' },
  SCHEDULED: { color: '#8A98A3', border: 'rgba(0,100,130,0.2)', bg: 'transparent' },
  ON_CALL: { color: '#00B4D8', border: 'rgba(0,180,216,0.4)', bg: 'rgba(0,180,216,0.06)' },
  COMPLETED: { color: '#3B82F6', border: 'rgba(59,130,246,0.4)', bg: 'rgba(59,130,246,0.06)' },
};

const STATUS_LABEL: Record<ShiftStatus, string> = {
  ON_DUTY: 'On Duty',
  SCHEDULED: 'Scheduled',
  ON_CALL: 'On-Call',
  COMPLETED: 'Completed',
};

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

function SkeletonRow() {
  return (
    <div
      className="flex min-h-[64px] animate-pulse items-center px-2"
      style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
    >
      <div className="flex w-[24%] items-center gap-2.5 py-3 pr-3 pl-3">
        <div className="size-9 shrink-0 rounded-full bg-slate-100" />
        <div className="h-4 w-24 rounded bg-slate-100" />
      </div>
    </div>
  );
}

export function NurseWorkforceManagementWorkspace() {
  const toast = useToast();
  const [pageState, setPageState] = useState<PageState>('loading');
  const [roster, setRoster] = useState<NurseShift[]>(MOCK_NURSE_ROSTER);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<FilterState>(FILTER_DEFAULTS);
  const [openFilter, setOpenFilter] = useState<FilterKey | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<NurseShift | null>(null);

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
    filters.shiftType !== 'ALL' ||
    filters.role !== 'ALL' ||
    filters.status !== 'ALL' ||
    search.trim() !== '';

  const q = search.trim().toLowerCase();
  const filtered = roster.filter((s) => {
    if (filters.ward !== 'ALL' && s.ward !== filters.ward) return false;
    if (filters.shiftType !== 'ALL' && s.shiftType !== filters.shiftType) return false;
    if (filters.role !== 'ALL' && s.role !== filters.role) return false;
    if (filters.status !== 'ALL' && s.status !== filters.status) return false;
    if (q && !s.staffName.toLowerCase().includes(q)) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * ROWS_PER_PAGE;
  const pageRows = filtered.slice(pageStart, pageStart + ROWS_PER_PAGE);

  function handleSaveShift(shift: NurseShift) {
    setRoster((prev) => {
      const exists = prev.some((s) => s.id === shift.id);
      return exists ? prev.map((s) => (s.id === shift.id ? shift : s)) : [shift, ...prev];
    });
    setCreateOpen(false);
    setEditingShift(null);
    toast.success(
      editingShift ? 'Shift updated' : 'Shift created',
      `${shift.staffName}'s ${shift.ward} shift has been saved.`,
    );
  }

  function handleAcknowledge(shift: NurseShift) {
    setRoster((prev) => prev.map((s) => (s.id === shift.id ? { ...s, acknowledged: true } : s)));
    toast.success('Acknowledged', `${shift.staffName}'s shift has been marked acknowledged.`);
  }

  function handleExportPDF() {
    const rowsHtml = filtered
      .map(
        (s) =>
          `<tr><td>${escapeHtml(s.staffName)}</td><td>${escapeHtml(s.role)}</td><td>${escapeHtml(s.ward)}</td><td>${escapeHtml(s.timeRange)}</td><td>${escapeHtml(STATUS_LABEL[s.status])}</td></tr>`,
      )
      .join('');
    downloadPDF(
      'nursing-workforce-roster',
      `<h1>Nursing Workforce Roster</h1>
       <p class="meta">${filtered.length} shift${filtered.length === 1 ? '' : 's'}</p>
       <table>
         <thead><tr><th>Nurse</th><th>Role</th><th>Ward</th><th>Time</th><th>Status</th></tr></thead>
         <tbody>${rowsHtml}</tbody>
       </table>`,
    );
    toast.success('Export ready', 'Nursing roster downloaded as PDF.');
  }

  function handleExportCSV() {
    downloadCSV('nursing-workforce-roster', [
      ['Nurse', 'Role', 'Ward', 'Shift Type', 'Time', 'Status', 'Acknowledged'],
      ...filtered.map((s) => [
        s.staffName,
        s.role,
        s.ward,
        s.shiftType,
        s.timeRange,
        STATUS_LABEL[s.status],
        s.acknowledged ? 'Yes' : 'Pending',
      ]),
    ]);
    toast.success('Export ready', 'Nursing roster downloaded as CSV.');
  }

  const STATS = [
    {
      id: 'on-duty',
      label: 'Nurses on Duty',
      value: String(WORKFORCE_STATS.onDuty),
      info: 'Currently on shift',
      icon: Users,
      iconBg: 'rgba(59,130,246,0.12)',
      iconColor: '#3B82F6',
      infoColor: '#4A7080',
    },
    {
      id: 'todays-shifts',
      label: "Today's Shifts",
      value: String(WORKFORCE_STATS.todaysShifts),
      info: 'Total scheduled',
      icon: CalendarClock,
      iconBg: 'rgba(139,92,246,0.12)',
      iconColor: '#8B5CF6',
      infoColor: '#4A7080',
    },
    {
      id: 'on-call',
      label: 'On-Call Nurses',
      value: String(WORKFORCE_STATS.onCall),
      info: 'Available if needed',
      icon: Clock,
      iconBg: 'rgba(0,180,216,0.12)',
      iconColor: '#00B4D8',
      infoColor: '#4A7080',
    },
    {
      id: 'pending-ack',
      label: 'Shift Acknowledgement',
      value: String(WORKFORCE_STATS.pendingAck),
      info: 'Awaiting response',
      icon: AlertCircle,
      iconBg: 'rgba(245,158,11,0.12)',
      iconColor: '#F59E0B',
      infoColor: '#B45309',
    },
    {
      id: 'coverage',
      label: 'Coverage Status',
      value: `${WORKFORCE_STATS.coveragePercent}%`,
      info: 'Ward coverage',
      icon: UserCheck,
      iconBg: 'rgba(34,197,94,0.12)',
      iconColor: '#22C55E',
      infoColor: '#16A34A',
    },
    {
      id: 'changes',
      label: 'Shift Changes',
      value: String(WORKFORCE_STATS.pendingChanges),
      info: 'Pending requests',
      icon: RefreshCw,
      iconBg: 'rgba(239,68,68,0.12)',
      iconColor: '#EF4444',
      infoColor: '#DC2626',
    },
  ];

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto max-w-[1600px] px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1
                className="font-display font-semibold"
                style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
              >
                Workforce Management
              </h1>
              <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                Manage nursing staff schedules, duty rosters, and shift coverage.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleExportPDF}
                className="flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-white focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
              >
                <FileText style={{ width: 15, height: 15, color: '#EF4444' }} />
                Export PDF
              </button>
              <button
                type="button"
                onClick={handleExportCSV}
                className="flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-white focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
              >
                <Sheet style={{ width: 15, height: 15, color: '#22C55E' }} />
                Export CSV
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingShift(null);
                  setCreateOpen(true);
                }}
                className="flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                style={{ fontSize: 14, background: '#00B4D8' }}
              >
                <Plus style={{ width: 15, height: 15 }} />
                Create Shift
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
                Failed to load the nursing roster
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
                      <StatCardCompact
                        key={s.id}
                        icon={s.icon}
                        iconBg={s.iconBg}
                        iconColor={s.iconColor}
                        label={s.label}
                        value={s.value}
                        info={s.info}
                        infoColor={s.infoColor}
                      />
                    ))}
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[8fr_4fr]">
                {/* ── Today's Roster ───────────────────────────────────────── */}
                <div
                  className="rounded-[12px] p-4 sm:p-5"
                  style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                >
                  <h2
                    className="font-display font-semibold"
                    style={{ fontSize: 18, lineHeight: '26px', color: '#0D2630' }}
                  >
                    Today&apos;s Roster
                  </h2>

                  <div ref={filterBarRef} className="mt-3 flex flex-wrap items-center gap-2.5">
                    <div
                      className="flex h-11 min-w-[200px] flex-1 items-center gap-2.5 rounded-[10px] px-3.5"
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
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={clearFilters}
                        aria-label="Clear filters"
                        className="flex size-11 shrink-0 items-center justify-center rounded-[10px] transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                        style={{ border: '1px solid #0064821F', background: '#FFFFFF' }}
                      >
                        <RefreshCw style={{ width: 16, height: 16, color: '#4A7080' }} />
                      </button>
                    )}
                  </div>

                  <div className="mt-3 overflow-x-auto scroll-smooth">
                    <div className="min-w-[760px]">
                      <div
                        className="flex items-center rounded-t-[8px]"
                        style={{
                          background: 'rgba(226,237,241,0.4)',
                          borderBottom: '1px solid #E6F8FD',
                        }}
                      >
                        {[
                          ['Nurse', 'min-w-[170px] flex-1 pl-3'],
                          ['Role', 'w-32'],
                          ['Ward', 'w-32'],
                          ['Time', 'w-32'],
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
                        <div className="w-24 shrink-0 py-2.5 pr-3 text-right">
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
                            <Users style={{ width: 24, height: 24, color: '#8A98A3' }} />
                          </div>
                          <p
                            className="font-sans font-medium"
                            style={{ fontSize: 16, color: '#4A7080' }}
                          >
                            No shifts match this filter
                          </p>
                          {hasActiveFilters && (
                            <button
                              type="button"
                              onClick={clearFilters}
                              className="font-sans font-medium transition-colors duration-150 hover:underline focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                              style={{ fontSize: 14, color: '#00B4D8' }}
                            >
                              Clear all filters
                            </button>
                          )}
                        </div>
                      )}

                      {pageState === 'loaded' &&
                        pageRows.map((s) => {
                          const shiftCfg = SHIFT_TYPE_CFG[s.shiftType];
                          const statusCfg = STATUS_CFG[s.status];
                          return (
                            <div
                              key={s.id}
                              className="flex items-center"
                              style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                            >
                              <div className="flex min-w-[170px] flex-1 items-center gap-2.5 py-3 pr-2 pl-3">
                                <div
                                  className="flex size-9 shrink-0 items-center justify-center rounded-full font-sans text-sm font-semibold text-white"
                                  style={{ background: s.avatarBg }}
                                >
                                  {s.initials}
                                </div>
                                <p
                                  className="truncate font-sans font-medium"
                                  style={{ fontSize: 14, color: '#0D2630' }}
                                >
                                  {s.staffName}
                                </p>
                              </div>
                              <div className="w-32 shrink-0 py-3 pr-2">
                                <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                                  {s.role}
                                </p>
                              </div>
                              <div className="w-32 shrink-0 py-3 pr-2">
                                <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                                  {s.ward}
                                </p>
                              </div>
                              <div className="w-32 shrink-0 py-3 pr-2">
                                <p className="truncate" style={{ fontSize: 14, color: '#0D2630' }}>
                                  {s.timeRange}
                                </p>
                                <span
                                  className="inline-block rounded-full px-1.5 py-0.5 font-sans font-medium"
                                  style={{
                                    fontSize: 14,
                                    color: shiftCfg.color,
                                    border: `1px solid ${shiftCfg.border}`,
                                    background: shiftCfg.bg,
                                  }}
                                >
                                  {SHIFT_TYPE_OPTIONS.find((o) => o.value === s.shiftType)?.label}
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
                                  {STATUS_LABEL[s.status]}
                                </span>
                              </div>
                              <div className="flex w-24 shrink-0 items-center justify-end gap-1 py-3 pr-3">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingShift(s);
                                    setCreateOpen(true);
                                  }}
                                  aria-label={`Edit shift for ${s.staffName}`}
                                  className="flex size-8 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                                >
                                  <SquarePen style={{ width: 15, height: 15, color: '#4A7080' }} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAcknowledge(s)}
                                  disabled={s.acknowledged}
                                  aria-label={`Acknowledge shift for ${s.staffName}`}
                                  className="flex size-8 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-30"
                                >
                                  <CheckCircle2
                                    style={{ width: 15, height: 15, color: '#22C55E' }}
                                  />
                                </button>
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
                        shifts
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
                    </div>
                  )}
                </div>

                {/* ── Sidebar: Coverage + Pending Acknowledgements ─────────── */}
                <div className="flex flex-col gap-4">
                  <div
                    className="rounded-[12px] p-4 sm:p-5"
                    style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    <h2
                      className="font-display font-semibold"
                      style={{ fontSize: 16, color: '#0D2630' }}
                    >
                      Coverage Overview
                    </h2>
                    <div className="mt-3 flex flex-col gap-3">
                      {COVERAGE_OVERVIEW.map((c) => (
                        <div key={c.label}>
                          <div className="flex items-center justify-between">
                            <span style={{ fontSize: 14, color: '#4A7080' }}>{c.label}</span>
                            <span
                              className="font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {c.percent}%
                            </span>
                          </div>
                          <div
                            className="mt-1 h-2 overflow-hidden rounded-full"
                            style={{ background: 'rgba(0,100,130,0.1)' }}
                          >
                            <div
                              className="h-full rounded-full transition-[width] duration-500"
                              style={{
                                width: pageState === 'loaded' ? `${c.percent}%` : 0,
                                background: c.percent >= 90 ? '#22C55E' : '#F59E0B',
                              }}
                            />
                          </div>
                        </div>
                      ))}
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
                      Pending Shift Acknowledgement
                    </h2>
                    <div className="mt-3 flex flex-col gap-3">
                      {PENDING_ACKNOWLEDGEMENTS.length === 0 ? (
                        <p style={{ fontSize: 14, color: '#8A98A3' }}>
                          Everyone has acknowledged their shift.
                        </p>
                      ) : (
                        PENDING_ACKNOWLEDGEMENTS.map((a) => (
                          <div key={a.id} className="flex items-center gap-2.5">
                            <div
                              className="flex size-9 shrink-0 items-center justify-center rounded-full font-sans text-sm font-semibold text-white"
                              style={{ background: a.avatarBg }}
                            >
                              {a.initials}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p
                                className="truncate font-sans font-medium"
                                style={{ fontSize: 14, color: '#0D2630' }}
                              >
                                {a.staffName}
                              </p>
                              <p className="truncate" style={{ fontSize: 14, color: '#8A98A3' }}>
                                {a.shiftLabel} · {a.day}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                toast.info('Reminder sent', `${a.staffName} has been reminded.`)
                              }
                              className="shrink-0 font-sans font-medium transition-opacity duration-150 hover:opacity-70 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                              style={{ fontSize: 14, color: '#00B4D8' }}
                            >
                              Remind
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="h-4" />
        </div>
      </main>

      {createOpen && (
        <CreateEditNurseShiftModal
          editingShift={editingShift ?? undefined}
          onClose={() => {
            setCreateOpen(false);
            setEditingShift(null);
          }}
          onSave={handleSaveShift}
        />
      )}
    </div>
  );
}
