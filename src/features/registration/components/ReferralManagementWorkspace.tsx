'use client';

import {
  BookOpen,
  Download,
  Eye,
  FileText,
  Inbox,
  MoreVertical,
  Plus,
  Search,
  Send,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import { FormSelect } from '@components/shared/FormSelect';
import { ModalLoadingFallback } from '@components/shared/ModalLoadingFallback';
import { PermissionGate } from '@components/shared/PermissionGate';
import { getInitials } from '@lib/utils';
import { PERMISSIONS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
import { useToast } from '@/hooks/useToast';
import { formatHumanDate, formatTime } from '@/utils/datetime';
import { downloadCSV } from '@/utils/export';
import { REGISTRATION_DATE_OPTIONS } from '@/features/registration/__mocks__/patientDirectoryFixtures';
import {
  DEPARTMENT_OPTIONS,
  DIRECTION_OPTIONS,
  REFERRALS,
  REFERRAL_OVERVIEW_BREAKDOWN,
  REFERRAL_RECENT_ACTIVITY,
  REFERRAL_STATS,
  STATUS_OPTIONS,
  type Referral,
  type ReferralDirection,
  type ReferralStatus,
} from '@/features/registration/__mocks__/referralFixtures';

const NewReferralModal = dynamic(
  () => import('./NewReferralModal').then((m) => m.NewReferralModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);
const ReferralDetailModal = dynamic(
  () => import('./ReferralDetailModal').then((m) => m.ReferralDetailModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);
const ReferralDirectoryModal = dynamic(
  () => import('./ReferralDirectoryModal').then((m) => m.ReferralDirectoryModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);
const ReferralTemplatesModal = dynamic(
  () => import('./ReferralTemplatesModal').then((m) => m.ReferralTemplatesModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

type Tab =
  | 'All Referrals'
  | 'Incoming Referrals'
  | 'Outgoing Referrals'
  | 'Pending'
  | 'Completed'
  | 'Cancelled';
const TABS: Tab[] = [
  'All Referrals',
  'Incoming Referrals',
  'Outgoing Referrals',
  'Pending',
  'Completed',
  'Cancelled',
];
const ROWS_PER_PAGE_OPTIONS = [8, 16, 32];
const AVATAR_COLORS = ['#3B82F6', '#F59E0B', '#22C55E', '#8B5CF6', '#EC4899', '#00B4D8', '#EF4444'];

const STATUS_CFG: Record<ReferralStatus, { color: string; border: string; bg: string }> = {
  Pending: { color: '#F59E0B', border: 'rgba(245,158,11,0.40)', bg: 'rgba(245,158,11,0.06)' },
  Accepted: { color: '#00B4D8', border: 'rgba(0,180,216,0.40)', bg: 'transparent' },
  Completed: { color: '#22C55E', border: 'rgba(34,197,94,0.40)', bg: 'transparent' },
  Cancelled: { color: '#EF4444', border: 'rgba(239,68,68,0.40)', bg: 'rgba(239,68,68,0.06)' },
};

const DIRECTION_CFG: Record<ReferralDirection, { color: string; border: string; bg: string }> = {
  Incoming: { color: '#EC4899', border: 'rgba(236,72,153,0.35)', bg: 'rgba(236,72,153,0.08)' },
  Outgoing: { color: '#8B5CF6', border: 'rgba(139,92,246,0.35)', bg: 'rgba(139,92,246,0.08)' },
};

function isWithinRange(iso: string, range: string): boolean {
  if (!range) return true;
  const wat = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos' });
  const now = new Date();
  const d = new Date(iso);
  if (range === 'today') return wat.format(d) === wat.format(now);
  if (range === 'this-week') return now.getTime() - d.getTime() < 7 * 24 * 60 * 60 * 1000;
  if (range === 'this-month')
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  if (range === 'this-year') return d.getFullYear() === now.getFullYear();
  return true;
}

function RowMenu({
  referral,
  onView,
  onAccept,
  onComplete,
  onCancel,
}: {
  referral: Referral;
  onView: () => void;
  onAccept: () => void;
  onComplete: () => void;
  onCancel: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`More actions for ${referral.id}`}
        className="flex size-8 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
      >
        <MoreVertical style={{ width: 15, height: 15, color: '#4A7080' }} />
      </button>
      {open && (
        <div
          className="animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 absolute top-full right-0 z-30 mt-1.5 w-52 overflow-hidden rounded-[12px] bg-white py-1.5 duration-150"
          style={{
            border: '1px solid rgba(0,100,130,0.15)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onView();
            }}
            className="flex w-full items-center px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD]"
            style={{ fontSize: 14, color: '#2F3A40' }}
          >
            View Details
          </button>
          {referral.status === 'Pending' && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onAccept();
              }}
              className="flex w-full items-center px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD]"
              style={{ fontSize: 14, color: '#2F3A40' }}
            >
              Accept Referral
            </button>
          )}
          {referral.status === 'Accepted' && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onComplete();
              }}
              className="flex w-full items-center px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD]"
              style={{ fontSize: 14, color: '#2F3A40' }}
            >
              Mark Completed
            </button>
          )}
          {(referral.status === 'Pending' || referral.status === 'Accepted') && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onCancel();
              }}
              className="flex w-full items-center px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[rgba(239,68,68,0.06)]"
              style={{ fontSize: 14, color: '#EF4444' }}
            >
              Cancel Referral
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function ReferralManagementWorkspace() {
  const router = useRouter();
  const toast = useToast();
  const [referrals, setReferrals] = useState<Referral[]>(REFERRALS);
  const [tab, setTab] = useState<Tab>('All Referrals');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [dateRange, setDateRange] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(8);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [creating, setCreating] = useState<ReferralDirection | null>(null);
  const [createReason, setCreateReason] = useState('');
  const [directoryOpen, setDirectoryOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return referrals.filter((r) => {
      if (tab === 'Incoming Referrals' && r.direction !== 'Incoming') return false;
      if (tab === 'Outgoing Referrals' && r.direction !== 'Outgoing') return false;
      if (tab === 'Pending' && r.status !== 'Pending') return false;
      if (tab === 'Completed' && r.status !== 'Completed') return false;
      if (tab === 'Cancelled' && r.status !== 'Cancelled') return false;
      if (typeFilter && r.direction !== typeFilter) return false;
      if (statusFilter && r.status !== statusFilter) return false;
      if (deptFilter && r.fromDepartment !== deptFilter && r.toDepartment !== deptFilter)
        return false;
      if (dateRange && !isWithinRange(r.date, dateRange)) return false;
      if (
        q &&
        !r.patientName.toLowerCase().includes(q) &&
        !r.mrn.toLowerCase().includes(q) &&
        !r.id.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [referrals, tab, typeFilter, statusFilter, deptFilter, dateRange, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * rowsPerPage;
  const pageRows = filtered.slice(pageStart, pageStart + rowsPerPage);
  const detail = detailId ? (referrals.find((r) => r.id === detailId) ?? null) : null;

  function selectTab(next: Tab) {
    setTab(next);
    setCurrentPage(1);
  }

  function handleApplyFilters() {
    toast.success(
      'Filters applied',
      `${filtered.length} referral${filtered.length !== 1 ? 's' : ''} match your filters.`,
    );
  }

  function handleExport() {
    const rows = [
      ['Referral ID', 'Patient', 'MRN', 'Direction', 'From', 'To', 'Referred By', 'Date', 'Status'],
      ...filtered.map((r) => [
        r.id,
        r.patientName,
        r.mrn,
        r.direction,
        r.fromDepartment,
        r.toDepartment,
        r.referredBy,
        `${formatHumanDate(r.date)} ${formatTime(r.date)}`,
        r.status,
      ]),
    ];
    downloadCSV('referral-management', rows);
    toast.success(
      'Export ready',
      `${filtered.length} referral${filtered.length !== 1 ? 's' : ''} downloaded as CSV.`,
    );
  }

  function handleAccept(id: string) {
    setReferrals((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'Accepted' } : r)));
    toast.success('Referral accepted', `${id} has been accepted.`);
    setDetailId(null);
  }

  function handleComplete(id: string) {
    setReferrals((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'Completed' } : r)));
    toast.success('Referral completed', `${id} has been marked as completed.`);
    setDetailId(null);
  }

  function handleCancel(id: string) {
    setReferrals((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'Cancelled' } : r)));
    toast.info('Referral cancelled', `${id} has been cancelled.`);
    setDetailId(null);
  }

  function handleCreate(referral: Referral) {
    setReferrals((prev) => [referral, ...prev]);
    setCreating(null);
    setCreateReason('');
    toast.success('Referral created', `${referral.id} has been submitted as ${referral.status}.`);
  }

  function handleUseTemplate(name: string, description: string) {
    setTemplatesOpen(false);
    setCreateReason(`${name} — ${description}`);
    setCreating('Outgoing');
  }

  function handleViewAll() {
    setTab('All Referrals');
    setTypeFilter('');
    setStatusFilter('');
    setDeptFilter('');
    setDateRange('');
    setSearch('');
    setCurrentPage(1);
    toast.info('Showing all referrals', 'Filters cleared.');
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto max-w-[1440px] px-4 py-4 sm:px-6 sm:py-5">
          {/* ── Breadcrumb ─────────────────────────────────────────────────── */}
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => router.push(ROUTES.registration)}
              className="transition-colors duration-150 hover:text-[#00B4D8] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
              style={{ fontSize: 14, color: '#8A98A3' }}
            >
              Dashboard
            </button>
            <span style={{ fontSize: 14, color: '#8A98A3' }}>/</span>
            <span style={{ fontSize: 14, color: '#8A98A3' }}>Operations</span>
            <span style={{ fontSize: 14, color: '#8A98A3' }}>/</span>
            <span className="font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
              Referral Management
            </span>
          </nav>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1
                className="font-display font-semibold"
                style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
              >
                Referral Management
              </h1>
              <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                Track and manage incoming and outgoing patient referrals
              </p>
            </div>
            <PermissionGate permission={PERMISSIONS.REFERRALS_WRITE}>
              <button
                type="button"
                onClick={() => setCreating('Outgoing')}
                className="flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                style={{ fontSize: 14, background: '#00B4D8' }}
              >
                <Plus style={{ width: 15, height: 15 }} />
                New Referral
              </button>
            </PermissionGate>
          </div>

          {/* ── Stat cards ─────────────────────────────────────────────────── */}
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {REFERRAL_STATS.map((s) => (
              <div
                key={s.id}
                className="rounded-[12px] p-4"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex size-11 shrink-0 items-center justify-center rounded-full"
                    style={{ background: s.bg }}
                  >
                    <s.icon style={{ width: 18, height: 18, color: s.color }} />
                  </div>
                  <div className="min-w-0">
                    <p style={{ fontSize: 14, color: '#4A7080' }}>{s.label}</p>
                    <p
                      className="font-display font-semibold"
                      style={{ fontSize: 24, color: '#0D2630' }}
                    >
                      {s.value}
                    </p>
                  </div>
                </div>
                <p
                  className="mt-2"
                  style={{ fontSize: 14, color: s.trendDirection === 'up' ? '#22C55E' : '#EF4444' }}
                >
                  {s.trendDirection === 'up' ? '↑' : '↓'} {s.trendPercent}% from last month
                </p>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-col gap-4 xl:flex-row xl:items-start">
            {/* ── Main column ────────────────────────────────────────────── */}
            <div className="min-w-0 flex-1">
              <div className="overflow-x-auto scroll-smooth">
                <div
                  className="flex gap-1"
                  style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
                >
                  {TABS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => selectTab(t)}
                      className="shrink-0 px-3.5 py-2.5 font-sans font-medium whitespace-nowrap transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                      style={{
                        fontSize: 14,
                        color: tab === t ? '#00B4D8' : '#4A7080',
                        borderBottom: tab === t ? '2px solid #00B4D8' : '2px solid transparent',
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div
                className="mt-4 rounded-[12px] p-4 sm:p-5"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                {/* ── Filters row ──────────────────────────────────────────── */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="relative min-w-0 flex-1">
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
                      placeholder="Search by patient name, MRN or referral ID..."
                      className="h-11 w-full rounded-[10px] pr-4 pl-9 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50"
                      style={{
                        fontSize: 14,
                        border: '1px solid rgba(0,100,130,0.18)',
                        color: '#0D2630',
                      }}
                    />
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={handleApplyFilters}
                      className="flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                      style={{
                        fontSize: 14,
                        color: '#0D2630',
                        border: '1px solid rgba(0,100,130,0.2)',
                      }}
                    >
                      Filters
                    </button>
                    <button
                      type="button"
                      onClick={handleExport}
                      className="flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                      style={{
                        fontSize: 14,
                        color: '#0D2630',
                        border: '1px solid rgba(0,100,130,0.2)',
                      }}
                    >
                      <Download style={{ width: 15, height: 15 }} />
                      Export
                    </button>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <FormSelect
                    id="ref-type-filter"
                    value={typeFilter}
                    onChange={(v) => {
                      setTypeFilter(v);
                      setCurrentPage(1);
                    }}
                    options={DIRECTION_OPTIONS}
                    placeholder="All Types"
                  />
                  <FormSelect
                    id="ref-status-filter"
                    value={statusFilter}
                    onChange={(v) => {
                      setStatusFilter(v);
                      setCurrentPage(1);
                    }}
                    options={STATUS_OPTIONS}
                    placeholder="All Status"
                  />
                  <FormSelect
                    id="ref-dept-filter"
                    value={deptFilter}
                    onChange={(v) => {
                      setDeptFilter(v);
                      setCurrentPage(1);
                    }}
                    options={DEPARTMENT_OPTIONS}
                    placeholder="All Departments"
                  />
                  <FormSelect
                    id="ref-date-filter"
                    value={dateRange}
                    onChange={(v) => {
                      setDateRange(v);
                      setCurrentPage(1);
                    }}
                    options={REGISTRATION_DATE_OPTIONS}
                    placeholder="All Date Range"
                  />
                </div>

                {/* ── Table ────────────────────────────────────────────────── */}
                <div className="mt-4 overflow-x-auto scroll-smooth">
                  <div className="min-w-[1220px]">
                    <div
                      className="flex rounded-t-[8px]"
                      style={{
                        background: 'rgba(226,237,241,0.4)',
                        borderBottom: '1px solid #E6F8FD',
                      }}
                    >
                      <div className="w-32 shrink-0 py-2.5 pr-2 pl-3">
                        <span
                          className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Referral ID
                        </span>
                      </div>
                      <div className="w-40 shrink-0 py-2.5 pr-2">
                        <span
                          className="font-sans font-bold tracking-wider uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Patient
                        </span>
                      </div>
                      <div className="w-32 shrink-0 py-2.5 pr-2">
                        <span
                          className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Referral Type
                        </span>
                      </div>
                      <div className="min-w-[220px] flex-1 py-2.5 pr-2">
                        <span
                          className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          From / To Department
                        </span>
                      </div>
                      <div className="w-40 shrink-0 py-2.5 pr-2">
                        <span
                          className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Referred By
                        </span>
                      </div>
                      <div className="w-28 shrink-0 py-2.5 pr-2">
                        <span
                          className="font-sans font-bold tracking-wider uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Date
                        </span>
                      </div>
                      <div className="w-28 shrink-0 py-2.5 pr-2">
                        <span
                          className="font-sans font-bold tracking-wider uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Status
                        </span>
                      </div>
                      <div className="w-20 shrink-0 py-2.5 pr-3 text-right">
                        <span
                          className="font-sans font-bold tracking-wider uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Actions
                        </span>
                      </div>
                    </div>

                    {pageRows.length === 0 && (
                      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                        <div
                          className="flex size-14 items-center justify-center rounded-full"
                          style={{ background: 'rgba(226,237,241,0.6)' }}
                        >
                          <Search style={{ width: 24, height: 24, color: '#8A98A3' }} />
                        </div>
                        <p
                          className="font-sans font-medium"
                          style={{ fontSize: 16, color: '#4A7080' }}
                        >
                          No referrals match your filters
                        </p>
                        <button
                          type="button"
                          onClick={handleViewAll}
                          className="mt-1 font-sans font-medium transition-colors duration-150 hover:underline focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                          style={{ fontSize: 14, color: '#00B4D8' }}
                        >
                          Clear all filters
                        </button>
                      </div>
                    )}

                    {pageRows.map((r, i) => {
                      const statusCfg = STATUS_CFG[r.status];
                      const directionCfg = DIRECTION_CFG[r.direction];
                      return (
                        <div
                          key={r.id}
                          onClick={() => setDetailId(r.id)}
                          className="flex cursor-pointer items-center transition-colors duration-100 hover:bg-[#F5FBFD]"
                          style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                        >
                          <div className="w-32 shrink-0 py-3 pr-2 pl-3">
                            <p
                              className="truncate font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {r.id}
                            </p>
                          </div>
                          <div className="flex w-40 shrink-0 items-center gap-2.5 py-3 pr-2">
                            <div
                              className="flex size-8 shrink-0 items-center justify-center rounded-full font-sans text-sm font-semibold text-white"
                              style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                            >
                              {getInitials(r.patientName)}
                            </div>
                            <div className="min-w-0">
                              <p
                                className="truncate font-sans font-medium"
                                style={{ fontSize: 14, color: '#0D2630' }}
                              >
                                {r.patientName}
                              </p>
                              <p className="truncate" style={{ fontSize: 14, color: '#8A98A3' }}>
                                {r.mrn}
                              </p>
                            </div>
                          </div>
                          <div className="w-32 shrink-0 py-3 pr-2">
                            <span
                              className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium"
                              style={{
                                fontSize: 14,
                                whiteSpace: 'nowrap',
                                color: directionCfg.color,
                                border: `1px solid ${directionCfg.border}`,
                                background: directionCfg.bg,
                              }}
                            >
                              {r.direction}
                            </span>
                          </div>
                          <div className="min-w-[220px] flex-1 py-3 pr-2">
                            <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                              {r.direction === 'Outgoing'
                                ? `${r.fromDepartment} → ${r.toDepartment}`
                                : `${r.fromDepartment} ← ${r.toDepartment}`}
                            </p>
                          </div>
                          <div className="w-40 shrink-0 py-3 pr-2">
                            <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                              {r.referredBy}
                            </p>
                          </div>
                          <div className="w-28 shrink-0 py-3 pr-2">
                            <p style={{ fontSize: 14, color: '#4A7080' }}>
                              {formatHumanDate(r.date)}
                            </p>
                            <p style={{ fontSize: 14, color: '#8A98A3' }}>{formatTime(r.date)}</p>
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
                              {r.status}
                            </span>
                          </div>
                          <div
                            className="flex w-20 shrink-0 items-center justify-end gap-1 py-3 pr-3"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => setDetailId(r.id)}
                              aria-label={`View ${r.id}`}
                              className="flex size-8 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                            >
                              <Eye style={{ width: 15, height: 15, color: '#4A7080' }} />
                            </button>
                            <RowMenu
                              referral={r}
                              onView={() => setDetailId(r.id)}
                              onAccept={() => handleAccept(r.id)}
                              onComplete={() => handleComplete(r.id)}
                              onCancel={() => handleCancel(r.id)}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {filtered.length > 0 && (
                  <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
                    <p style={{ fontSize: 14, color: '#4A7080' }}>
                      Showing {pageStart + 1} to{' '}
                      {Math.min(pageStart + rowsPerPage, filtered.length)} of {filtered.length}{' '}
                      referrals
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
                      {Array.from({ length: totalPages }, (_, idx) => idx + 1)
                        .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                        .reduce<(number | 'ellipsis')[]>((acc, p) => {
                          if (acc.length > 0 && typeof acc[acc.length - 1] === 'number') {
                            const prev = acc[acc.length - 1] as number;
                            if (p - prev > 1) acc.push('ellipsis');
                          }
                          acc.push(p);
                          return acc;
                        }, [])
                        .map((p, idx) =>
                          p === 'ellipsis' ? (
                            <span
                              key={`e-${idx}`}
                              style={{ fontSize: 14, color: '#8A98A3' }}
                              className="px-1"
                            >
                              …
                            </span>
                          ) : (
                            <button
                              key={p}
                              type="button"
                              onClick={() => setCurrentPage(p)}
                              className="flex size-9 items-center justify-center rounded-[8px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                              style={{
                                fontSize: 14,
                                border: `1px solid ${p === safePage ? '#00B4D8' : 'rgba(0,100,130,0.18)'}`,
                                color: p === safePage ? '#00B4D8' : '#4A7080',
                                background: p === safePage ? '#E6F8FD' : 'transparent',
                              }}
                            >
                              {p}
                            </button>
                          ),
                        )}
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

            {/* ── Sidebar ──────────────────────────────────────────────────── */}
            <div className="flex w-full shrink-0 flex-col gap-4 xl:w-[340px]">
              <div
                className="rounded-[12px] p-4"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <h2
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Referral Overview
                </h2>
                <div className="mt-3 flex items-center gap-5">
                  <DonutChart />
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    {REFERRAL_OVERVIEW_BREAKDOWN.map((d) => (
                      <div key={d.label} className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <span
                            className="size-2.5 shrink-0 rounded-full"
                            style={{ background: d.color }}
                          />
                          <span className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                            {d.label}
                          </span>
                        </div>
                        <span
                          className="shrink-0 font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {d.value} ({d.percent}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div
                className="rounded-[12px] p-4"
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
                      icon: Send,
                      label: 'New Outgoing Referral',
                      desc: 'Refer a patient to another department',
                      onClick: () => setCreating('Outgoing'),
                    },
                    {
                      icon: Inbox,
                      label: 'New Incoming Referral',
                      desc: 'Register a patient referred from another facility',
                      onClick: () => setCreating('Incoming'),
                    },
                    {
                      icon: BookOpen,
                      label: 'Referral Directory',
                      desc: 'View departments and contacts',
                      onClick: () => setDirectoryOpen(true),
                    },
                    {
                      icon: FileText,
                      label: 'Referral Templates',
                      desc: 'Manage referral letter templates',
                      onClick: () => setTemplatesOpen(true),
                    },
                  ].map((a) => (
                    <button
                      key={a.label}
                      type="button"
                      onClick={a.onClick}
                      className="flex items-start gap-3 rounded-[10px] px-2.5 py-2.5 text-left transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                    >
                      <div
                        className="flex size-9 shrink-0 items-center justify-center rounded-full"
                        style={{ background: 'rgba(0,180,216,0.12)' }}
                      >
                        <a.icon style={{ width: 16, height: 16, color: '#00B4D8' }} />
                      </div>
                      <div className="min-w-0">
                        <p
                          className="truncate font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {a.label}
                        </p>
                        <p className="truncate" style={{ fontSize: 14, color: '#8A98A3' }}>
                          {a.desc}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div
                className="rounded-[12px] p-4"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <div className="flex items-center justify-between gap-2">
                  <h2
                    className="font-display font-semibold"
                    style={{ fontSize: 16, color: '#0D2630' }}
                  >
                    Recent Activity
                  </h2>
                  <button
                    type="button"
                    onClick={handleViewAll}
                    className="font-sans font-medium transition-colors duration-150 hover:underline focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                    style={{ fontSize: 14, color: '#00B4D8' }}
                  >
                    View All
                  </button>
                </div>
                <div className="mt-3 flex flex-col gap-3">
                  {REFERRAL_RECENT_ACTIVITY.map((act) => (
                    <button
                      key={act.id}
                      type="button"
                      onClick={() => setDetailId(act.referralId)}
                      className="flex items-start gap-2.5 rounded-[8px] text-left transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                    >
                      <div
                        className="flex size-8 shrink-0 items-center justify-center rounded-full"
                        style={{ background: act.bg }}
                      >
                        <act.icon style={{ width: 15, height: 15, color: act.color }} />
                      </div>
                      <div className="min-w-0">
                        <p
                          className="font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          Referral {act.referralId}
                        </p>
                        <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                          {act.label}
                        </p>
                        <p style={{ fontSize: 14, color: '#8A98A3' }}>
                          {formatHumanDate(act.dateTime)} {formatTime(act.dateTime)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div
                className="rounded-[12px] p-4"
                style={{
                  background: 'rgba(0,180,216,0.06)',
                  border: '1px solid rgba(0,180,216,0.25)',
                }}
              >
                <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
                  Important Note
                </p>
                <p className="mt-1" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                  Ensure all referral details are accurate and complete before submitting. Patients
                  will be notified once the receiving department accepts the referral.
                </p>
              </div>
            </div>
          </div>

          <div className="h-4" />
        </div>
      </main>

      {creating && (
        <NewReferralModal
          initialDirection={creating}
          initialReason={createReason}
          onClose={() => {
            setCreating(null);
            setCreateReason('');
          }}
          onCreate={handleCreate}
        />
      )}
      {detail && (
        <ReferralDetailModal
          referral={detail}
          onClose={() => setDetailId(null)}
          onAccept={handleAccept}
          onComplete={handleComplete}
          onCancel={handleCancel}
        />
      )}
      {directoryOpen && <ReferralDirectoryModal onClose={() => setDirectoryOpen(false)} />}
      {templatesOpen && (
        <ReferralTemplatesModal
          onClose={() => setTemplatesOpen(false)}
          onUseTemplate={handleUseTemplate}
        />
      )}
    </div>
  );
}

function DonutChart() {
  const total = REFERRAL_OVERVIEW_BREAKDOWN.reduce((sum, d) => sum + d.value, 0) || 1;
  const radius = 54;
  const strokeWidth = 20;
  const circumference = 2 * Math.PI * radius;
  const gapPx = 3;

  type Seg = (typeof REFERRAL_OVERVIEW_BREAKDOWN)[number] & { length: number; offset: number };
  const { segments } = REFERRAL_OVERVIEW_BREAKDOWN.reduce<{ cumulative: number; segments: Seg[] }>(
    (acc, d) => {
      const rawLength = (d.value / total) * circumference;
      const offset = -(acc.cumulative / total) * circumference;
      return {
        cumulative: acc.cumulative + d.value,
        segments: [...acc.segments, { ...d, length: Math.max(0, rawLength - gapPx), offset }],
      };
    },
    { cumulative: 0, segments: [] },
  );

  return (
    <div
      className="relative flex shrink-0 items-center justify-center"
      style={{ width: 120, height: 120 }}
    >
      <svg
        viewBox="0 0 128 128"
        style={{ width: 120, height: 120 }}
        role="img"
        aria-label="Referral overview donut chart"
      >
        <g transform="rotate(-90 64 64)">
          {segments.map((seg) => (
            <circle
              key={seg.label}
              cx={64}
              cy={64}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeLinecap="butt"
              strokeDasharray={`${seg.length} ${circumference}`}
              strokeDashoffset={seg.offset}
            />
          ))}
        </g>
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-display font-bold" style={{ fontSize: 20, color: '#0D2630' }}>
          128
        </span>
        <span style={{ fontSize: 14, color: '#8A98A3' }}>Total</span>
      </div>
    </div>
  );
}
