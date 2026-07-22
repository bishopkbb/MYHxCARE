'use client';

import {
  AlertCircle,
  Beaker,
  Bell,
  Building2,
  ClipboardList,
  Clock,
  FlaskConical,
  Lock,
  MoreVertical,
  PhoneCall,
  RefreshCw,
  Search,
  ShieldAlert,
  TestTube2,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import { FormSelect } from '@components/shared/FormSelect';
import { ModalLoadingFallback } from '@components/shared/ModalLoadingFallback';
import { Pagination } from '@components/shared/Pagination';
import { PermissionGate } from '@components/shared/PermissionGate';
import { PERMISSIONS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
import { useToast } from '@/hooks/useToast';
import { formatDate, formatTime } from '@/utils/datetime';
import {
  DEPARTMENT_OPTIONS,
  FASTING_REQUIRED_TESTS,
  LAB_ORDERS,
  PRIORITY_OPTIONS,
  TEST_TAT_HOURS,
  type LabTestOrder,
  type LabTestStatus,
} from '@/features/nursing/__mocks__/laboratoryFixtures';
import type { CriticalAcknowledgementInput } from './AcknowledgeCriticalResultModal';
import type { SampleCollectionInput } from './CollectSampleModal';

const CollectSampleModal = dynamic(
  () => import('./CollectSampleModal').then((m) => m.CollectSampleModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

const AcknowledgeCriticalResultModal = dynamic(
  () => import('./AcknowledgeCriticalResultModal').then((m) => m.AcknowledgeCriticalResultModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

const LabResultDetailModal = dynamic(
  () => import('./LabResultDetailModal').then((m) => m.LabResultDetailModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

type PageState = 'loading' | 'loaded' | 'error';
type TabKey = 'pending' | 'completed' | 'critical' | 'requests';

const NURSE_NAME = 'Nurse Chidinma Eze';
const DEFAULT_TAT_HOURS = 6;

const STATUS_CFG: Record<LabTestStatus, { color: string; border: string; bg: string }> = {
  Ordered: { color: '#8B5CF6', border: 'rgba(139,92,246,0.4)', bg: 'rgba(139,92,246,0.08)' },
  'Sample Collected': {
    color: '#3B82F6',
    border: 'rgba(59,130,246,0.4)',
    bg: 'rgba(59,130,246,0.08)',
  },
  'In Process': { color: '#F59E0B', border: 'rgba(245,158,11,0.4)', bg: 'rgba(245,158,11,0.08)' },
  Rejected: { color: '#EF4444', border: 'rgba(239,68,68,0.4)', bg: 'rgba(239,68,68,0.08)' },
  Completed: { color: '#16A34A', border: 'rgba(34,197,94,0.4)', bg: 'rgba(34,197,94,0.08)' },
};

const PRIORITY_CFG: Record<string, { color: string; border: string; bg: string }> = {
  STAT: { color: '#EF4444', border: 'rgba(239,68,68,0.4)', bg: 'rgba(239,68,68,0.08)' },
  Urgent: { color: '#F59E0B', border: 'rgba(245,158,11,0.4)', bg: 'rgba(245,158,11,0.08)' },
  Routine: { color: '#4A7080', border: 'rgba(0,100,130,0.2)', bg: 'transparent' },
};

const RESULT_FLAG_CFG: Record<string, { color: string; border: string; bg: string }> = {
  Normal: { color: '#16A34A', border: 'rgba(34,197,94,0.4)', bg: 'rgba(34,197,94,0.08)' },
  Abnormal: { color: '#D97706', border: 'rgba(245,158,11,0.4)', bg: 'rgba(245,158,11,0.08)' },
  Critical: { color: '#EF4444', border: 'rgba(239,68,68,0.4)', bg: 'rgba(239,68,68,0.08)' },
};

const STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: 'All', label: 'All Status' },
  { value: 'Ordered', label: 'Ordered' },
  { value: 'Sample Collected', label: 'Sample Collected' },
  { value: 'In Process', label: 'In Process' },
  { value: 'Rejected', label: 'Rejected' },
  { value: 'Completed', label: 'Completed' },
];

const DEPARTMENT_FILTER_OPTIONS = [
  { value: 'All', label: 'All Departments' },
  ...DEPARTMENT_OPTIONS,
];
const PRIORITY_FILTER_OPTIONS = [{ value: 'All', label: 'All Priorities' }, ...PRIORITY_OPTIONS];

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

function isOverdue(order: LabTestOrder, nowMs: number): boolean {
  if (order.status === 'Completed' || order.status === 'Rejected') return false;
  const since = order.sampleCollectedAt ?? order.orderedAt;
  const tatHours = TEST_TAT_HOURS[order.testName] ?? DEFAULT_TAT_HOURS;
  return nowMs - new Date(since).getTime() > tatHours * 3_600_000;
}

function RowMenu({
  order,
  open,
  onToggle,
  onView,
  onCollect,
  onAcknowledge,
  onFollowUp,
}: {
  order: LabTestOrder;
  open: boolean;
  onToggle: () => void;
  onView: () => void;
  onCollect?: (() => void) | undefined;
  onAcknowledge?: (() => void) | undefined;
  onFollowUp?: (() => void) | undefined;
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

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={onToggle}
        aria-label={`More actions for ${order.patientName}`}
        className={`flex size-11 shrink-0 items-center justify-center rounded-[10px] transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
      >
        <MoreVertical style={{ width: 16, height: 16, color: '#4A7080' }} />
      </button>
      {open && (
        <div
          className="animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 absolute top-full right-0 z-30 mt-1.5 w-60 overflow-hidden rounded-[10px] bg-white py-1.5 duration-150"
          style={{
            border: '1px solid rgba(0,100,130,0.12)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          }}
        >
          <button
            type="button"
            onClick={onView}
            className={`flex w-full items-center gap-2 px-3.5 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
            style={{ fontSize: 14, color: '#0D2630' }}
          >
            <ClipboardList style={{ width: 15, height: 15, color: '#00B4D8' }} />
            View Details
          </button>
          {onCollect && (
            <button
              type="button"
              onClick={onCollect}
              className={`flex w-full items-center gap-2 px-3.5 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
              style={{ fontSize: 14, color: '#0D2630' }}
            >
              <TestTube2 style={{ width: 15, height: 15, color: '#22C55E' }} />
              {order.status === 'Rejected' ? 'Recollect Sample' : 'Collect Sample'}
            </button>
          )}
          {onAcknowledge && (
            <button
              type="button"
              onClick={onAcknowledge}
              className={`flex w-full items-center gap-2 px-3.5 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
              style={{ fontSize: 14, color: '#EF4444' }}
            >
              <PhoneCall style={{ width: 15, height: 15, color: '#EF4444' }} />
              Acknowledge &amp; Notify Doctor
            </button>
          )}
          {onFollowUp && (
            <button
              type="button"
              onClick={onFollowUp}
              className={`flex w-full items-center gap-2 px-3.5 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
              style={{ fontSize: 14, color: '#0D2630' }}
            >
              <PhoneCall style={{ width: 15, height: 15, color: '#F59E0B' }} />
              Follow Up with Lab
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function LaboratoryWorkspace() {
  const router = useRouter();
  const toast = useToast();
  const [pageState, setPageState] = useState<PageState>('loading');
  const [orders, setOrders] = useState<LabTestOrder[]>(LAB_ORDERS);
  const [activeTab, setActiveTab] = useState<TabKey>('pending');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [collectTarget, setCollectTarget] = useState<LabTestOrder | null>(null);
  const [acknowledgeTarget, setAcknowledgeTarget] = useState<LabTestOrder | null>(null);
  const [viewTarget, setViewTarget] = useState<LabTestOrder | null>(null);
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
      toast.success('Laboratory refreshed', 'Test statuses are up to date.');
    }, 700);
  }

  const overview = useMemo(
    () => ({
      pending: orders.filter((o) =>
        (['Sample Collected', 'In Process', 'Rejected'] as LabTestStatus[]).includes(o.status),
      ).length,
      completed: orders.filter((o) => o.status === 'Completed').length,
      critical: orders.filter((o) => o.status === 'Completed' && o.resultFlag === 'Critical')
        .length,
      requests: orders.filter((o) => o.status === 'Ordered').length,
    }),
    [orders],
  );

  const departmentCounts = useMemo(() => {
    return DEPARTMENT_OPTIONS.map((d) => ({
      name: d.label,
      count: orders.filter((o) => o.department === d.value && o.status !== 'Completed').length,
    }));
  }, [orders]);

  const criticalResults = useMemo(
    () =>
      orders
        .filter((o) => o.status === 'Completed' && o.resultFlag === 'Critical')
        .sort((a, b) => new Date(b.resultAt!).getTime() - new Date(a.resultAt!).getTime()),
    [orders],
  );

  const recentlyCompleted = useMemo(
    () =>
      orders
        .filter((o) => o.status === 'Completed')
        .sort((a, b) => new Date(b.resultAt!).getTime() - new Date(a.resultAt!).getTime()),
    [orders],
  );

  const tabFiltered = useMemo(() => {
    return orders.filter((o) => {
      if (activeTab === 'pending')
        return (['Sample Collected', 'In Process', 'Rejected'] as LabTestStatus[]).includes(
          o.status,
        );
      if (activeTab === 'completed') return o.status === 'Completed';
      if (activeTab === 'critical') return o.status === 'Completed' && o.resultFlag === 'Critical';
      return o.status === 'Ordered';
    });
  }, [orders, activeTab]);

  const filtered = useMemo(() => {
    return tabFiltered.filter((o) => {
      if (statusFilter !== 'All' && o.status !== statusFilter) return false;
      if (departmentFilter !== 'All' && o.department !== departmentFilter) return false;
      if (priorityFilter !== 'All' && o.priority !== priorityFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (!(
          o.patientName.toLowerCase().includes(q) ||
          o.mrn.toLowerCase().includes(q) ||
          o.testName.toLowerCase().includes(q)
        )) {
          return false;
        }
      }
      return true;
    });
  }, [tabFiltered, statusFilter, departmentFilter, priorityFilter, search]);

  const sorted = useMemo(() => {
    const priorityRank: Record<string, number> = { STAT: 0, Urgent: 1, Routine: 2 };
    return filtered
      .slice()
      .sort((a, b) => (priorityRank[a.priority] ?? 3) - (priorityRank[b.priority] ?? 3));
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * rowsPerPage;
  const pageRows = sorted.slice(pageStart, pageStart + rowsPerPage);

  const hasActiveFilters =
    search.trim() !== '' ||
    statusFilter !== 'All' ||
    departmentFilter !== 'All' ||
    priorityFilter !== 'All';

  function clearFilters() {
    setSearch('');
    setStatusFilter('All');
    setDepartmentFilter('All');
    setPriorityFilter('All');
    setCurrentPage(1);
  }

  function updateOrder(id: string, patch: Partial<LabTestOrder>) {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  }

  function handleCollectSample(input: SampleCollectionInput) {
    if (!collectTarget) return;
    const wasRejected = collectTarget.status === 'Rejected';
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== collectTarget.id) return o;
        const { rejectionReason: _rejectionReason, ...rest } = o;
        return {
          ...rest,
          status: 'Sample Collected',
          sampleCollectedAt: input.collectedAt,
          sampleCollectedBy: NURSE_NAME,
        };
      }),
    );
    toast.success(
      wasRejected ? 'Sample recollected' : 'Sample collected',
      `${collectTarget.testName} for ${collectTarget.patientName} is on its way to the lab.`,
    );
    setCollectTarget(null);
    setOpenMenuId(null);
  }

  function handleAcknowledgeCritical(input: CriticalAcknowledgementInput) {
    if (!acknowledgeTarget) return;
    updateOrder(acknowledgeTarget.id, {
      criticalAcknowledgedAt: new Date().toISOString(),
      criticalAcknowledgedBy: NURSE_NAME,
    });
    toast.success(
      'Critical result acknowledged',
      `${input.notifiedDoctor} has been notified about ${acknowledgeTarget.patientName}'s ${acknowledgeTarget.testName}.`,
    );
    setAcknowledgeTarget(null);
    setOpenMenuId(null);
  }

  function handleFollowUp(order: LabTestOrder) {
    toast.info(
      'Lab contacted',
      `Follow-up sent to the laboratory about ${order.testName} for ${order.patientName}.`,
    );
    setOpenMenuId(null);
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
              Clinical Services
            </button>
            <span style={{ fontSize: 14, color: '#8A98A3' }}>/</span>
            <span className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
              Laboratory
            </span>
          </nav>

          <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1
                className="font-display font-semibold"
                style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
              >
                Laboratory
              </h1>
              <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                View laboratory tests and results. No result editing is allowed.
              </p>
            </div>
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
          </div>

          {pageState === 'error' ? (
            <div
              className="mt-5 flex flex-col items-center justify-center gap-3 rounded-[12px] py-16 text-center"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <AlertCircle style={{ width: 36, height: 36, color: '#EF4444' }} />
              <p className="font-sans font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Failed to load laboratory data
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
            <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-start">
              <div className="min-w-0 flex-1">
                <div
                  className="rounded-[12px] p-4 sm:p-5"
                  style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                >
                  <div
                    className="flex flex-wrap items-center gap-5 overflow-x-auto scroll-smooth"
                    style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    {(
                      [
                        { key: 'pending', label: 'Pending Tests', count: overview.pending },
                        { key: 'completed', label: 'Completed Results', count: overview.completed },
                        { key: 'critical', label: 'Critical Results', count: overview.critical },
                        { key: 'requests', label: 'Doctor Requests', count: overview.requests },
                      ] as { key: TabKey; label: string; count: number }[]
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
                        <span
                          className="rounded-full px-2 py-0.5 font-sans font-semibold"
                          style={{
                            fontSize: 14,
                            color: activeTab === tab.key ? '#FFFFFF' : '#4A7080',
                            background: activeTab === tab.key ? '#00B4D8' : 'rgba(226,237,241,0.6)',
                          }}
                        >
                          {tab.count}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* ── Overview stat cards ─────────────────────────────────── */}
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {(
                      [
                        {
                          key: 'pending',
                          icon: ClipboardList,
                          label: 'Pending Tests',
                          value: overview.pending,
                          sub: 'Awaiting sample / in process',
                          color: '#F59E0B',
                          bg: 'rgba(245,158,11,0.1)',
                        },
                        {
                          key: 'completed',
                          icon: FlaskConical,
                          label: 'Completed Results',
                          value: overview.completed,
                          sub: 'Results available',
                          color: '#22C55E',
                          bg: 'rgba(34,197,94,0.1)',
                        },
                        {
                          key: 'critical',
                          icon: ShieldAlert,
                          label: 'Critical Results',
                          value: overview.critical,
                          sub: 'Requires immediate attention',
                          color: '#EF4444',
                          bg: 'rgba(239,68,68,0.1)',
                        },
                        {
                          key: 'requests',
                          icon: TestTube2,
                          label: 'Doctor Requests',
                          value: overview.requests,
                          sub: 'New requests',
                          color: '#8B5CF6',
                          bg: 'rgba(139,92,246,0.1)',
                        },
                      ] as {
                        key: TabKey;
                        icon: typeof ClipboardList;
                        label: string;
                        value: number;
                        sub: string;
                        color: string;
                        bg: string;
                      }[]
                    ).map((s) => (
                      <button
                        key={s.key}
                        type="button"
                        onClick={() => {
                          setActiveTab(s.key);
                          setCurrentPage(1);
                        }}
                        className={`flex flex-col items-start rounded-[12px] p-4 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                        style={{ border: '1px solid rgba(0,100,130,0.12)' }}
                      >
                        <div
                          className="flex size-10 shrink-0 items-center justify-center rounded-[10px]"
                          style={{ background: s.bg }}
                        >
                          <s.icon style={{ width: 20, height: 20, color: s.color }} />
                        </div>
                        <p
                          className="mt-2.5 font-sans font-medium"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          {s.label}
                        </p>
                        <p
                          className="font-display font-bold"
                          style={{ fontSize: 26, color: '#0D2630' }}
                        >
                          {s.value}
                        </p>
                        <p style={{ fontSize: 14, color: '#8A98A3' }}>{s.sub}</p>
                      </button>
                    ))}
                  </div>

                  {/* ── Filters ──────────────────────────────────────────────── */}
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
                        placeholder="Search by patient name, MRN or test..."
                        className={`h-11 w-full rounded-[10px] pr-4 pl-9 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                        style={{
                          fontSize: 14,
                          border: '1px solid rgba(0,100,130,0.18)',
                          color: '#0D2630',
                        }}
                      />
                    </div>
                    <div className="w-full sm:w-44">
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
                    <div className="w-full sm:w-44">
                      <FormSelect
                        id="dept-filter"
                        value={departmentFilter}
                        onChange={(v) => {
                          setDepartmentFilter(v);
                          setCurrentPage(1);
                        }}
                        options={DEPARTMENT_FILTER_OPTIONS}
                        placeholder="All Departments"
                      />
                    </div>
                    <div className="w-full sm:w-40">
                      <FormSelect
                        id="priority-filter"
                        value={priorityFilter}
                        onChange={(v) => {
                          setPriorityFilter(v);
                          setCurrentPage(1);
                        }}
                        options={PRIORITY_FILTER_OPTIONS}
                        placeholder="All Priorities"
                      />
                    </div>
                  </div>

                  {/* ── Table ────────────────────────────────────────────────── */}
                  <div className="mt-4 overflow-x-auto scroll-smooth">
                    <div className="min-w-[1150px]">
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
                            ['Test / Panel', 'w-40'],
                            ['Department', 'w-28'],
                            ['Priority', 'w-24'],
                            ['Ordered By', 'w-32'],
                            ['Ordered', 'w-28'],
                            ['Status', 'w-36'],
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
                          className="sticky right-0 z-10 w-20 shrink-0 py-2.5 pr-3 text-right"
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
                        Array.from({ length: 5 }).map((_, i) => (
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
                            {['w-28', 'w-40', 'w-28', 'w-24', 'w-32', 'w-28', 'w-36'].map(
                              (w, wi) => (
                                <div key={wi} className={`${w} shrink-0 py-3 pr-1.5`}>
                                  <div className="h-3.5 w-4/5 rounded bg-slate-100" />
                                </div>
                              ),
                            )}
                            <div
                              className="sticky right-0 flex w-20 shrink-0 items-center justify-end py-3 pr-3"
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
                            <Beaker style={{ width: 24, height: 24, color: '#8A98A3' }} />
                          </div>
                          <p
                            className="font-sans font-medium"
                            style={{ fontSize: 16, color: '#4A7080' }}
                          >
                            No tests match this filter
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
                        pageRows.map((o) => {
                          const statusCfg = STATUS_CFG[o.status];
                          const priorityCfg = PRIORITY_CFG[o.priority]!;
                          const overdue = isOverdue(o, nowMs);
                          const isMenuOpen = openMenuId === o.id;
                          const needsAck = o.resultFlag === 'Critical' && !o.criticalAcknowledgedAt;
                          return (
                            <div
                              key={o.id}
                              className="flex items-center transition-colors duration-100 hover:bg-[#F5FBFD]"
                              style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                            >
                              <div className="min-w-[170px] flex-1 py-3 pr-1.5 pl-3">
                                <div className="flex items-center gap-2">
                                  <div
                                    className="font-display flex size-9 shrink-0 items-center justify-center rounded-full font-semibold text-white"
                                    style={{
                                      background: avatarColorFor(o.patientName),
                                      fontSize: 14,
                                    }}
                                  >
                                    {initialsOf(o.patientName)}
                                  </div>
                                  <div className="min-w-0">
                                    <p
                                      className="truncate font-sans font-medium"
                                      style={{ fontSize: 14, color: '#0D2630' }}
                                    >
                                      {o.patientName}
                                    </p>
                                    <p style={{ fontSize: 14, color: '#8A98A3' }}>
                                      {o.age} Y / {o.gender[0]}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <div className="w-28 shrink-0 py-3 pr-1.5">
                                <p className="truncate" style={{ fontSize: 14, color: '#00B4D8' }}>
                                  {o.mrn}
                                </p>
                              </div>
                              <div className="w-40 shrink-0 py-3 pr-1.5">
                                <p className="truncate" style={{ fontSize: 14, color: '#0D2630' }}>
                                  {o.testName}
                                </p>
                                {FASTING_REQUIRED_TESTS.has(o.testName) && (
                                  <p style={{ fontSize: 14, color: '#F59E0B' }}>Fasting required</p>
                                )}
                              </div>
                              <div className="w-28 shrink-0 py-3 pr-1.5">
                                <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                                  {o.department}
                                </p>
                              </div>
                              <div className="w-24 shrink-0 py-3 pr-1.5">
                                <span
                                  className="inline-block rounded-full px-2 py-0.5 font-sans font-medium whitespace-nowrap"
                                  style={{
                                    fontSize: 14,
                                    color: priorityCfg.color,
                                    border: `1px solid ${priorityCfg.border}`,
                                    background: priorityCfg.bg,
                                  }}
                                >
                                  {o.priority}
                                </span>
                              </div>
                              <div className="w-32 shrink-0 py-3 pr-1.5">
                                <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                                  {o.orderedBy}
                                </p>
                              </div>
                              <div className="w-28 shrink-0 py-3 pr-1.5">
                                <p
                                  className="whitespace-nowrap"
                                  style={{ fontSize: 14, color: '#0D2630' }}
                                >
                                  {formatDate(o.orderedAt)}
                                </p>
                                <p
                                  className="whitespace-nowrap"
                                  style={{ fontSize: 14, color: '#8A98A3' }}
                                >
                                  {formatTime(o.orderedAt)}
                                </p>
                              </div>
                              <div className="w-36 shrink-0 py-3 pr-1.5">
                                <span
                                  className="inline-block rounded-full px-2 py-0.5 font-sans font-medium whitespace-nowrap"
                                  style={{
                                    fontSize: 14,
                                    color: statusCfg.color,
                                    border: `1px solid ${statusCfg.border}`,
                                    background: statusCfg.bg,
                                  }}
                                >
                                  {o.status}
                                </span>
                                {overdue && (
                                  <p
                                    className="mt-0.5 flex items-center gap-1"
                                    style={{ fontSize: 14, color: '#EF4444' }}
                                  >
                                    <Clock style={{ width: 12, height: 12 }} />
                                    Overdue
                                  </p>
                                )}
                                {o.status === 'Completed' && o.resultFlag && (
                                  <span
                                    className="mt-0.5 inline-block rounded-full px-2 py-0.5 font-sans font-medium whitespace-nowrap"
                                    style={{
                                      fontSize: 14,
                                      color: RESULT_FLAG_CFG[o.resultFlag]!.color,
                                      border: `1px solid ${RESULT_FLAG_CFG[o.resultFlag]!.border}`,
                                      background: RESULT_FLAG_CFG[o.resultFlag]!.bg,
                                    }}
                                  >
                                    {o.resultFlag}
                                  </span>
                                )}
                              </div>
                              <div
                                className={`sticky right-0 flex w-20 shrink-0 items-center justify-end py-3 pr-3 ${isMenuOpen ? 'z-30' : 'z-10'}`}
                                style={{ background: '#FFFFFF' }}
                              >
                                <PermissionGate permission={PERMISSIONS.ENCOUNTERS_WRITE}>
                                  <RowMenu
                                    order={o}
                                    open={isMenuOpen}
                                    onToggle={() => setOpenMenuId(isMenuOpen ? null : o.id)}
                                    onView={() => {
                                      setOpenMenuId(null);
                                      setViewTarget(o);
                                    }}
                                    onCollect={
                                      o.status === 'Ordered' || o.status === 'Rejected'
                                        ? () => {
                                            setOpenMenuId(null);
                                            setCollectTarget(o);
                                          }
                                        : undefined
                                    }
                                    onAcknowledge={
                                      needsAck
                                        ? () => {
                                            setOpenMenuId(null);
                                            setAcknowledgeTarget(o);
                                          }
                                        : undefined
                                    }
                                    onFollowUp={
                                      overdue &&
                                      (o.status === 'Sample Collected' || o.status === 'In Process')
                                        ? () => handleFollowUp(o)
                                        : undefined
                                    }
                                  />
                                </PermissionGate>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  {pageState === 'loaded' && sorted.length > 0 && (
                    <Pagination
                      page={safePage}
                      pageSize={rowsPerPage}
                      totalItems={sorted.length}
                      onPageChange={setCurrentPage}
                      onPageSizeChange={(size) => {
                        setRowsPerPage(size);
                        setCurrentPage(1);
                      }}
                      itemLabel={activeTab === 'pending' ? 'pending tests' : 'tests'}
                      pageSizeOptions={[5, 10, 25]}
                    />
                  )}
                </div>

                {/* ── Bottom info panels ──────────────────────────────────── */}
                <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
                  <div
                    className="rounded-[12px] p-4 sm:p-5"
                    style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h2
                        className="font-display font-semibold"
                        style={{ fontSize: 16, color: '#0D2630' }}
                      >
                        Recently Completed
                      </h2>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('completed');
                          setCurrentPage(1);
                        }}
                        className={`font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                        style={{ fontSize: 14, color: '#00B4D8' }}
                      >
                        View All
                      </button>
                    </div>
                    <div className="mt-3 flex flex-col gap-3">
                      {recentlyCompleted.slice(0, 3).map((o) => (
                        <div key={o.id} className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p
                              className="truncate font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {o.patientName}
                            </p>
                            <p className="truncate" style={{ fontSize: 14, color: '#8A98A3' }}>
                              {o.testName}
                            </p>
                          </div>
                          <span
                            className="shrink-0 rounded-full px-2 py-0.5 font-sans font-medium whitespace-nowrap"
                            style={{
                              fontSize: 14,
                              color: RESULT_FLAG_CFG[o.resultFlag!]!.color,
                              border: `1px solid ${RESULT_FLAG_CFG[o.resultFlag!]!.border}`,
                              background: RESULT_FLAG_CFG[o.resultFlag!]!.bg,
                            }}
                          >
                            {o.resultFlag}
                          </span>
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
                      Test Turnaround Time (TAT)
                    </h2>
                    <div className="mt-3 flex flex-col gap-2">
                      {Object.entries(TEST_TAT_HOURS)
                        .slice(0, 5)
                        .map(([test, hours]) => (
                          <div key={test} className="flex items-center justify-between gap-2">
                            <span
                              className="min-w-0 truncate"
                              style={{ fontSize: 14, color: '#4A7080' }}
                            >
                              {test}
                            </span>
                            <span
                              className="shrink-0 font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              ~{hours}h
                            </span>
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
                      Lab Contact
                    </h2>
                    <div className="mt-3 flex items-center gap-2.5">
                      <div
                        className="flex size-11 shrink-0 items-center justify-center rounded-full"
                        style={{ background: 'rgba(0,180,216,0.1)' }}
                      >
                        <PhoneCall style={{ width: 18, height: 18, color: '#00B4D8' }} />
                      </div>
                      <div className="min-w-0">
                        <p
                          className="font-sans font-semibold"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          Main Laboratory
                        </p>
                        <p style={{ fontSize: 14, color: '#4A7080' }}>+234 812 345 6789</p>
                        <p style={{ fontSize: 14, color: '#16A34A' }}>Available 24/7</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Sidebar ─────────────────────────────────────────────────── */}
              <div className="flex w-full shrink-0 flex-col gap-4 xl:w-[300px]">
                <div
                  className="rounded-[12px] p-4 sm:p-5"
                  style={{ background: '#FFFFFF', border: '1px solid rgba(239,68,68,0.3)' }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h2
                      className="font-display font-semibold"
                      style={{ fontSize: 16, color: '#0D2630' }}
                    >
                      Critical Results
                    </h2>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('critical');
                        setCurrentPage(1);
                      }}
                      className={`font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                      style={{ fontSize: 14, color: '#00B4D8' }}
                    >
                      View All
                    </button>
                  </div>
                  <div className="mt-3 flex flex-col gap-3">
                    {criticalResults.length === 0 ? (
                      <p style={{ fontSize: 14, color: '#8A98A3' }}>
                        No critical results right now.
                      </p>
                    ) : (
                      criticalResults.slice(0, 3).map((o) => (
                        <div
                          key={o.id}
                          className="flex items-start gap-2 rounded-[10px] p-2.5"
                          style={{ background: 'rgba(239,68,68,0.06)' }}
                        >
                          <ShieldAlert
                            style={{
                              width: 16,
                              height: 16,
                              color: '#EF4444',
                              marginTop: 2,
                              flexShrink: 0,
                            }}
                          />
                          <div className="min-w-0 flex-1">
                            <p
                              className="truncate font-sans font-semibold"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {o.patientName}
                            </p>
                            <p className="truncate" style={{ fontSize: 14, color: '#8A98A3' }}>
                              {o.mrn}
                            </p>
                            <p
                              className="font-sans font-semibold"
                              style={{ fontSize: 14, color: '#EF4444' }}
                            >
                              {o.criticalValueLabel}
                            </p>
                            {!o.criticalAcknowledgedAt && (
                              <p style={{ fontSize: 14, color: '#F59E0B' }}>Not yet acknowledged</p>
                            )}
                          </div>
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
                    Laboratory Departments
                  </h2>
                  <div className="mt-3 flex flex-col gap-2">
                    {departmentCounts.map((d) => (
                      <div key={d.name} className="flex items-center justify-between gap-2">
                        <span
                          className="flex items-center gap-2"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          <Building2 style={{ width: 14, height: 14, color: '#8A98A3' }} />
                          {d.name}
                        </span>
                        <span
                          className="font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {d.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div
                  className="flex items-start gap-2.5 rounded-[12px] p-4"
                  style={{
                    background: 'rgba(0,180,216,0.06)',
                    border: '1px solid rgba(0,180,216,0.25)',
                  }}
                >
                  <Lock
                    style={{ width: 16, height: 16, color: '#00B4D8', marginTop: 2, flexShrink: 0 }}
                  />
                  <p style={{ fontSize: 14, color: '#0D2630' }}>
                    <span className="font-sans font-semibold">Important:</span> Laboratory results
                    are final and cannot be edited by nursing staff. Report any discrepancy to the
                    laboratory immediately.
                  </p>
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
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('completed');
                        setCurrentPage(1);
                      }}
                      className={`flex h-11 items-center justify-between rounded-[10px] px-3.5 font-sans font-medium transition-opacity duration-150 hover:opacity-85 ${FOCUS_RING}`}
                      style={{ fontSize: 14, color: '#0D2630', background: 'rgba(34,197,94,0.1)' }}
                    >
                      <span className="flex items-center gap-2.5">
                        <FlaskConical style={{ width: 17, height: 17, color: '#22C55E' }} />
                        View Completed Results
                      </span>
                      <span style={{ color: '#8A98A3' }}>›</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('requests');
                        setCurrentPage(1);
                      }}
                      className={`flex h-11 items-center justify-between rounded-[10px] px-3.5 font-sans font-medium transition-opacity duration-150 hover:opacity-85 ${FOCUS_RING}`}
                      style={{ fontSize: 14, color: '#0D2630', background: 'rgba(139,92,246,0.1)' }}
                    >
                      <span className="flex items-center gap-2.5">
                        <Bell style={{ width: 17, height: 17, color: '#8B5CF6' }} />
                        View Doctor Requests
                      </span>
                      <span style={{ color: '#8A98A3' }}>›</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="h-4" />
        </div>
      </main>

      {collectTarget && (
        <CollectSampleModal
          patientName={collectTarget.patientName}
          mrn={collectTarget.mrn}
          testName={collectTarget.testName}
          fastingRequired={FASTING_REQUIRED_TESTS.has(collectTarget.testName)}
          isRecollection={collectTarget.status === 'Rejected'}
          onClose={() => setCollectTarget(null)}
          onConfirm={handleCollectSample}
        />
      )}

      {acknowledgeTarget && (
        <AcknowledgeCriticalResultModal
          patientName={acknowledgeTarget.patientName}
          mrn={acknowledgeTarget.mrn}
          testName={acknowledgeTarget.testName}
          criticalValueLabel={acknowledgeTarget.criticalValueLabel ?? ''}
          orderedBy={acknowledgeTarget.orderedBy}
          onClose={() => setAcknowledgeTarget(null)}
          onConfirm={handleAcknowledgeCritical}
        />
      )}

      {viewTarget && (
        <LabResultDetailModal order={viewTarget} onClose={() => setViewTarget(null)} />
      )}
    </div>
  );
}
