'use client';

import {
  Clock,
  Eye,
  MoreVertical,
  Pause,
  PhoneCall,
  Play,
  RotateCcw,
  Settings as SettingsIcon,
  ShoppingBag,
  Timer,
  UserCheck,
  Users,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import { AnimatedDonutChart } from '@components/shared/AnimatedDonutChart';
import { FormSelect } from '@components/shared/FormSelect';
import { ModalLoadingFallback } from '@components/shared/ModalLoadingFallback';
import { Pagination } from '@components/shared/Pagination';
import { PreferenceToggle } from '@components/shared/PreferenceToggle';
import { RowMenuPortal } from '@components/shared/RowMenuPortal';
import {
  ScrollableTable,
  TABLE_HEADER_BG,
  TABLE_HEADER_STICKY_CLASS,
} from '@components/shared/ScrollableTable';
import { StatCard } from '@components/shared/StatCard';
import { Tooltip } from '@components/shared/Tooltip';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { formatTime } from '@/utils/datetime';
import { getPatientDetail } from '@/features/patients/__mocks__/patientFixtures';
import type { PharmacyQueueEntry } from '@/features/pharmacy/__mocks__/pharmacyFixtures';
import {
  advanceQueueStage,
  markCollected,
  toggleHold,
  useAllQueueEntries,
  verifyAndDispense,
} from '@/features/pharmacy/store/pharmacyDispensingStore';

const QueueEntryDetailModal = dynamic(
  () =>
    import('@/features/pharmacy/components/QueueEntryDetailModal').then(
      (m) => m.QueueEntryDetailModal,
    ),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);
const QueueMonitorSettingsModal = dynamic(
  () =>
    import('@/features/pharmacy/components/QueueMonitorSettingsModal').then(
      (m) => m.QueueMonitorSettingsModal,
    ),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

type QueueType = 'Prescription Waiting' | 'Dispensing' | 'Ready for Pickup' | 'On Hold';

const QUEUE_TYPE_OPTIONS = [
  { value: 'Prescription Waiting', label: 'Prescription Waiting' },
  { value: 'Dispensing', label: 'Dispensing' },
  { value: 'Ready for Pickup', label: 'Ready for Pickup' },
  { value: 'On Hold', label: 'On Hold' },
];

const STATUS_OPTIONS = [
  { value: 'Waiting', label: 'Waiting' },
  { value: 'In Progress', label: 'In Progress' },
  { value: 'Ready', label: 'Ready' },
  { value: 'On Hold', label: 'On Hold' },
];

const PRIORITY_OPTIONS = [
  { value: 'High', label: 'High' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Low', label: 'Low' },
];

const QUEUE_TYPE_COLOR: Record<QueueType, { color: string; border: string; bg: string }> = {
  'Prescription Waiting': {
    color: '#2563EB',
    border: 'rgba(37,99,235,0.35)',
    bg: 'rgba(37,99,235,0.08)',
  },
  Dispensing: { color: '#7C3AED', border: 'rgba(124,58,237,0.35)', bg: 'rgba(124,58,237,0.08)' },
  'Ready for Pickup': {
    color: '#D97706',
    border: 'rgba(217,119,6,0.35)',
    bg: 'rgba(217,119,6,0.08)',
  },
  'On Hold': { color: '#DC2626', border: 'rgba(220,38,38,0.35)', bg: 'rgba(220,38,38,0.08)' },
};

const PHARMACISTS = ['Pharm. Adaeze', 'Pharm. Victoria', 'Pharm. John', 'Pharm. Grace'];

function hashString(s: string, seed: number): number {
  let h = seed >>> 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) >>> 0;
  return h;
}

function queueNumberFor(rxNo: string): string {
  return `Q-${String(hashString(rxNo, 7) % 100000).padStart(5, '0')}`;
}

function pharmacistFor(rxNo: string): string {
  return PHARMACISTS[hashString(rxNo, 101) % PHARMACISTS.length]!;
}

function displayQueueType(entry: PharmacyQueueEntry): QueueType {
  if (entry.isOnHold) return 'On Hold';
  if (entry.stage === 'Pending Verification') return 'Prescription Waiting';
  if (entry.stage === 'In Progress' || entry.stage === 'Ready for Dispense') return 'Dispensing';
  return 'Ready for Pickup';
}

function displayStatus(entry: PharmacyQueueEntry): string {
  if (entry.isOnHold) return 'On Hold';
  if (entry.stage === 'Pending Verification') return 'Waiting';
  if (entry.stage === 'In Progress' || entry.stage === 'Ready for Dispense') return 'In Progress';
  return 'Ready';
}

function minutesSince(iso: string): number {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
}

const PRIORITY_RANK: Record<PharmacyQueueEntry['priority'], number> = {
  High: 3,
  Medium: 2,
  Low: 1,
};

type ModalState = { type: 'detail'; entry: PharmacyQueueEntry } | { type: 'settings' } | null;

function RowMenu({
  entry,
  onView,
  onAdvance,
  onMarkReady,
  onToggleHold,
}: {
  entry: PharmacyQueueEntry;
  onView: () => void;
  onAdvance: () => void;
  onMarkReady: () => void;
  onToggleHold: () => void;
}) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`More actions for ${entry.rxNo}`}
        className={`flex size-11 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
      >
        <MoreVertical style={{ width: 15, height: 15, color: '#4A7080' }} />
      </button>
      <RowMenuPortal open={open} anchorRef={buttonRef} onClose={() => setOpen(false)} width={200}>
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
        {entry.stage !== 'Ready for Pickup' && (
          <>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onAdvance();
              }}
              className="flex w-full items-center px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD]"
              style={{ fontSize: 14, color: '#00B4D8' }}
            >
              Move to Next Queue
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onMarkReady();
              }}
              className="flex w-full items-center px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD]"
              style={{ fontSize: 14, color: '#16A34A' }}
            >
              Mark as Ready for Pickup
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            onToggleHold();
          }}
          className="flex w-full items-center px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD]"
          style={{ fontSize: 14, color: '#D97706' }}
        >
          {entry.isOnHold ? 'Release Hold' : 'Put On Hold'}
        </button>
      </RowMenuPortal>
    </div>
  );
}

export function PharmacyQueueMonitorWorkspace() {
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const actorName = user?.name ?? 'Pharmacist';

  const [search, setSearch] = useState('');
  const [queueTypeFilter, setQueueTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [pharmacistFilter, setPharmacistFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'All' | QueueType>('All');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [sortPriorityFirst, setSortPriorityFirst] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(8);
  const [modal, setModal] = useState<ModalState>(null);
  const [, setTick] = useState(0);

  const allEntries = useAllQueueEntries();

  // Live wait-time ticking — the underlying data is already reactive
  // (useSyncExternalStore), but a "12 mins" label computed from receivedAt
  // only recomputes on a fresh render. Auto Refresh forces one every 30s so
  // it visibly counts up instead of freezing at whatever it was on load.
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, [autoRefresh]);

  const activeEntries = useMemo(
    () => allEntries.filter((e) => e.stage !== 'Collected' && e.stage !== 'Cancelled'),
    [allEntries],
  );

  const total = activeEntries.length;
  const prescriptionWaiting = activeEntries.filter(
    (e) => displayQueueType(e) === 'Prescription Waiting',
  ).length;
  const dispensing = activeEntries.filter((e) => displayQueueType(e) === 'Dispensing').length;
  const readyForPickup = activeEntries.filter(
    (e) => displayQueueType(e) === 'Ready for Pickup',
  ).length;
  const onHold = activeEntries.filter((e) => displayQueueType(e) === 'On Hold').length;

  const avgWaitMinutes = useMemo(() => {
    const waiting = activeEntries.filter((e) => displayQueueType(e) === 'Prescription Waiting');
    if (waiting.length === 0) return 0;
    return Math.round(
      waiting.reduce((sum, e) => sum + minutesSince(e.receivedAt), 0) / waiting.length,
    );
  }, [activeEntries]);

  const queueOverview = useMemo(
    () => [
      {
        label: 'Prescription Waiting',
        value: prescriptionWaiting,
        color: QUEUE_TYPE_COLOR['Prescription Waiting'].color,
      },
      { label: 'Dispensing', value: dispensing, color: QUEUE_TYPE_COLOR.Dispensing.color },
      {
        label: 'Ready for Pickup',
        value: readyForPickup,
        color: QUEUE_TYPE_COLOR['Ready for Pickup'].color,
      },
      { label: 'On Hold', value: onHold, color: QUEUE_TYPE_COLOR['On Hold'].color },
    ],
    [prescriptionWaiting, dispensing, readyForPickup, onHold],
  );

  const avgWaitByQueue = useMemo(() => {
    function avgFor(type: QueueType, basis: (e: PharmacyQueueEntry) => string | undefined) {
      const rows = activeEntries.filter((e) => displayQueueType(e) === type);
      const withBasis = rows
        .map((e) => basis(e))
        .filter((v): v is string => Boolean(v))
        .map((iso) => minutesSince(iso));
      if (withBasis.length === 0) return 0;
      return Math.round(withBasis.reduce((s, v) => s + v, 0) / withBasis.length);
    }
    const rows = [
      {
        label: 'Prescription Waiting',
        minutes: avgFor('Prescription Waiting', (e) => e.receivedAt),
      },
      { label: 'Dispensing', minutes: avgFor('Dispensing', (e) => e.receivedAt) },
      { label: 'Ready for Pickup', minutes: avgFor('Ready for Pickup', (e) => e.dispensedAt) },
      { label: 'On Hold', minutes: avgFor('On Hold', (e) => e.receivedAt) },
    ];
    const max = Math.max(...rows.map((r) => r.minutes), 1);
    return rows.map((r) => ({ ...r, barPercent: (r.minutes / max) * 100 }));
  }, [activeEntries]);

  const enriched = useMemo(
    () =>
      activeEntries.map((e) => {
        const patient = getPatientDetail(e.patientId);
        return {
          entry: e,
          patientName: patient.name,
          mrn: patient.mrn,
          queueNumber: queueNumberFor(e.rxNo),
          queueType: displayQueueType(e),
          status: displayStatus(e),
          pharmacist: pharmacistFor(e.rxNo),
        };
      }),
    [activeEntries],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enriched.filter((row) => {
      if (activeTab !== 'All' && row.queueType !== activeTab) return false;
      if (queueTypeFilter && row.queueType !== queueTypeFilter) return false;
      if (statusFilter && row.status !== statusFilter) return false;
      if (priorityFilter && row.entry.priority !== priorityFilter) return false;
      if (pharmacistFilter && row.pharmacist !== pharmacistFilter) return false;
      if (
        q &&
        !row.patientName.toLowerCase().includes(q) &&
        !row.entry.rxNo.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [
    enriched,
    search,
    activeTab,
    queueTypeFilter,
    statusFilter,
    priorityFilter,
    pharmacistFilter,
  ]);

  const sorted = useMemo(() => {
    const rows = [...filtered];
    if (sortPriorityFirst) {
      return rows.sort((a, b) => {
        const p = PRIORITY_RANK[b.entry.priority] - PRIORITY_RANK[a.entry.priority];
        if (p !== 0) return p;
        return new Date(a.entry.receivedAt).getTime() - new Date(b.entry.receivedAt).getTime();
      });
    }
    return rows.sort(
      (a, b) => new Date(a.entry.receivedAt).getTime() - new Date(b.entry.receivedAt).getTime(),
    );
  }, [filtered, sortPriorityFirst]);

  const pageStart = (currentPage - 1) * rowsPerPage;
  const pageRows = sorted.slice(pageStart, pageStart + rowsPerPage);

  function handleClearFilters() {
    setSearch('');
    setQueueTypeFilter('');
    setStatusFilter('');
    setPriorityFilter('');
    setPharmacistFilter('');
    setActiveTab('All');
    setCurrentPage(1);
  }

  function handleApplyFilters() {
    toast.success(
      'Filters applied',
      `${filtered.length} entr${filtered.length === 1 ? 'y' : 'ies'} match your filters.`,
    );
  }

  function handleAdvance(rxNo: string) {
    advanceQueueStage(rxNo, actorName);
    setModal(null);
    toast.success('Moved to next queue', `${rxNo} has advanced.`);
  }

  function handleMarkReady(rxNo: string) {
    verifyAndDispense(rxNo, actorName);
    setModal(null);
    toast.success('Marked ready for pickup', `${rxNo} is now ready for pickup.`);
  }

  function handleToggleHold(rxNo: string, wasOnHold: boolean) {
    toggleHold(rxNo);
    setModal(null);
    toast.info(wasOnHold ? 'Hold released' : 'Prescription held', `${rxNo} has been updated.`);
  }

  function handleMarkCollected(rxNo: string) {
    markCollected(rxNo);
    setModal(null);
    toast.success('Marked collected', `${rxNo} has been collected and left the queue.`);
  }

  function oldestActive(predicate: (e: PharmacyQueueEntry) => boolean) {
    const candidates = activeEntries.filter(predicate);
    if (candidates.length === 0) return null;
    return candidates.reduce((oldest, e) =>
      new Date(e.receivedAt).getTime() < new Date(oldest.receivedAt).getTime() ? e : oldest,
    );
  }

  function handleCallNextPatient() {
    const next = oldestActive((e) => !e.isOnHold && e.stage === 'Pending Verification');
    if (!next) {
      toast.info('Queue is clear', 'No patients are currently waiting.');
      return;
    }
    const patient = getPatientDetail(next.patientId);
    toast.success('Calling next patient', `${patient.name} — ${queueNumberFor(next.rxNo)}`);
  }

  function handleMoveToNextQueue() {
    const next = oldestActive((e) => !e.isOnHold && e.stage !== 'Ready for Pickup');
    if (!next) {
      toast.info('Nothing to advance', 'No active entries left in the pipeline.');
      return;
    }
    handleAdvance(next.rxNo);
  }

  function handleQuickMarkReady() {
    const next = oldestActive((e) => !e.isOnHold && e.stage !== 'Ready for Pickup');
    if (!next) {
      toast.info('Nothing to dispense', 'No active entries left in the pipeline.');
      return;
    }
    handleMarkReady(next.rxNo);
  }

  function handleQuickPutOnHold() {
    const next = oldestActive((e) => !e.isOnHold);
    if (!next) {
      toast.info('Nothing to hold', 'Every active entry is already on hold.');
      return;
    }
    handleToggleHold(next.rxNo, false);
  }

  const tabs: { key: 'All' | QueueType; label: string; count: number }[] = [
    { key: 'All', label: 'All Queues', count: total },
    { key: 'Prescription Waiting', label: 'Prescription Waiting', count: prescriptionWaiting },
    { key: 'Dispensing', label: 'Dispensing', count: dispensing },
    { key: 'Ready for Pickup', label: 'Ready for Pickup', count: readyForPickup },
    { key: 'On Hold', label: 'On Hold', count: onHold },
  ];

  return (
    <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
      <div className="mx-auto max-w-[1440px] px-4 py-4 sm:px-6 sm:py-5">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => router.push(ROUTES.pharmacy)}
            className={`transition-colors duration-150 hover:text-[#00B4D8] ${FOCUS_RING}`}
            style={{ fontSize: 14, color: '#8A98A3' }}
          >
            Home
          </button>
          <span style={{ fontSize: 14, color: '#8A98A3' }}>/</span>
          <span style={{ fontSize: 14, color: '#8A98A3' }}>Operations</span>
          <span style={{ fontSize: 14, color: '#8A98A3' }}>/</span>
          <span className="font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
            Pharmacy Queue Monitor
          </span>
        </nav>

        {/* Header */}
        <div className="mt-2">
          <h1
            className="font-display font-semibold"
            style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
          >
            Pharmacy Queue Monitor
          </h1>
          <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
            Monitor all pharmacy queues in real-time and manage patient flow efficiently.
          </p>
        </div>

        {/* Stat cards */}
        <div className="mt-5 grid grid-cols-2 gap-3.5 sm:grid-cols-3 xl:grid-cols-6 xl:gap-4">
          <StatCard
            icon={Users}
            label="Total in Queue"
            value={total}
            info="All queues"
            accent="#2563EB"
            iconBg="rgba(37,99,235,0.1)"
            onClick={handleClearFilters}
          />
          <StatCard
            icon={Clock}
            label="Prescription Waiting"
            value={prescriptionWaiting}
            info={`${total > 0 ? ((prescriptionWaiting / total) * 100).toFixed(1) : 0}% of total`}
            accent="#2563EB"
            iconBg="rgba(37,99,235,0.1)"
            onClick={() => {
              setActiveTab('Prescription Waiting');
              setCurrentPage(1);
            }}
          />
          <StatCard
            icon={ShoppingBag}
            label="Dispensing"
            value={dispensing}
            info={`${total > 0 ? ((dispensing / total) * 100).toFixed(1) : 0}% of total`}
            accent="#7C3AED"
            iconBg="rgba(124,58,237,0.1)"
            onClick={() => {
              setActiveTab('Dispensing');
              setCurrentPage(1);
            }}
          />
          <StatCard
            icon={UserCheck}
            label="Ready for Pickup"
            value={readyForPickup}
            info={`${total > 0 ? ((readyForPickup / total) * 100).toFixed(1) : 0}% of total`}
            accent="#D97706"
            iconBg="rgba(217,119,6,0.1)"
            onClick={() => {
              setActiveTab('Ready for Pickup');
              setCurrentPage(1);
            }}
          />
          <StatCard
            icon={Pause}
            label="On Hold"
            value={onHold}
            info={`${total > 0 ? ((onHold / total) * 100).toFixed(1) : 0}% of total`}
            accent="#DC2626"
            iconBg="rgba(220,38,38,0.1)"
            onClick={() => {
              setActiveTab('On Hold');
              setCurrentPage(1);
            }}
          />
          <StatCard
            icon={Timer}
            label="Avg. Wait Time"
            value={`${avgWaitMinutes} mins`}
            info="Prescription Waiting queue"
            accent="#16A34A"
            iconBg="rgba(22,163,74,0.1)"
          />
        </div>

        <div className="mt-5 flex flex-col gap-4 xl:flex-row xl:items-start">
          {/* Main column */}
          <div className="min-w-0 flex-1">
            <div
              className="rounded-[12px] p-4 sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              {/* Filters */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div>
                  <label
                    htmlFor="qm-search"
                    className="mb-1.5 block font-sans font-medium"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    Search Patient / Prescription
                  </label>
                  <input
                    id="qm-search"
                    type="search"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Search by patient name, prescription ID..."
                    className={`h-11 w-full rounded-[10px] px-3.5 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                    style={{
                      fontSize: 14,
                      border: '1px solid rgba(0,100,130,0.18)',
                      color: '#0D2630',
                    }}
                  />
                </div>
                <div>
                  <label
                    htmlFor="qm-queue-type"
                    className="mb-1.5 block font-sans font-medium"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    Queue Type
                  </label>
                  <FormSelect
                    id="qm-queue-type"
                    value={queueTypeFilter}
                    onChange={(v) => {
                      setQueueTypeFilter(v);
                      setCurrentPage(1);
                    }}
                    options={QUEUE_TYPE_OPTIONS}
                    placeholder="All Queues"
                  />
                </div>
                <div>
                  <label
                    htmlFor="qm-status"
                    className="mb-1.5 block font-sans font-medium"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    Status
                  </label>
                  <FormSelect
                    id="qm-status"
                    value={statusFilter}
                    onChange={(v) => {
                      setStatusFilter(v);
                      setCurrentPage(1);
                    }}
                    options={STATUS_OPTIONS}
                    placeholder="All Statuses"
                  />
                </div>
                <div>
                  <label
                    htmlFor="qm-priority"
                    className="mb-1.5 block font-sans font-medium"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    Priority
                  </label>
                  <FormSelect
                    id="qm-priority"
                    value={priorityFilter}
                    onChange={(v) => {
                      setPriorityFilter(v);
                      setCurrentPage(1);
                    }}
                    options={PRIORITY_OPTIONS}
                    placeholder="All Priorities"
                  />
                </div>
                <div>
                  <label
                    htmlFor="qm-pharmacist"
                    className="mb-1.5 block font-sans font-medium"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    Pharmacist
                  </label>
                  <FormSelect
                    id="qm-pharmacist"
                    value={pharmacistFilter}
                    onChange={(v) => {
                      setPharmacistFilter(v);
                      setCurrentPage(1);
                    }}
                    options={PHARMACISTS.map((p) => ({ value: p, label: p }))}
                    placeholder="All Pharmacists"
                  />
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className={`flex h-9 items-center gap-1.5 rounded-[8px] px-3 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                  style={{
                    fontSize: 14,
                    color: '#4A7080',
                    border: '1px solid rgba(0,100,130,0.18)',
                  }}
                >
                  Clear Filters
                </button>
                <button
                  type="button"
                  onClick={handleApplyFilters}
                  className={`flex h-9 items-center gap-1.5 rounded-[8px] px-3 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                  style={{ fontSize: 14, background: '#0F766E' }}
                >
                  Apply Filters
                </button>
              </div>

              {/* Tabs */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1">
                  {tabs.map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => {
                        setActiveTab(tab.key);
                        setCurrentPage(1);
                      }}
                      className={`flex items-center gap-1.5 rounded-[8px] px-3 py-2 font-sans font-medium transition-colors duration-150 ${FOCUS_RING}`}
                      style={{
                        fontSize: 14,
                        color: activeTab === tab.key ? '#00B4D8' : '#4A7080',
                        background: activeTab === tab.key ? 'rgba(0,180,216,0.08)' : 'transparent',
                      }}
                    >
                      {tab.label} ({tab.count})
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2.5">
                  <span style={{ fontSize: 14, color: '#4A7080' }}>Auto Refresh</span>
                  <PreferenceToggle
                    on={autoRefresh}
                    onToggle={() => setAutoRefresh((v) => !v)}
                    ariaLabel="Auto Refresh"
                  />
                </div>
              </div>

              {/* Table */}
              <ScrollableTable minWidth={1232} maxHeight={640} className="mt-3">
                <div
                  className={`flex rounded-t-[8px] ${TABLE_HEADER_STICKY_CLASS}`}
                  style={{
                    background: TABLE_HEADER_BG,
                    borderBottom: '1px solid #E6F8FD',
                  }}
                >
                  <div className="w-24 shrink-0 py-2.5 pr-2 pl-3">
                    <span
                      className="font-sans font-bold tracking-wider uppercase"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      Queue #
                    </span>
                  </div>
                  <div className="w-36 shrink-0 py-2.5 pr-2">
                    <span
                      className="font-sans font-bold tracking-wider uppercase"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      Patient
                    </span>
                  </div>
                  <div className="w-36 shrink-0 py-2.5 pr-2">
                    <span
                      className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      Prescription ID
                    </span>
                  </div>
                  <div className="w-44 shrink-0 py-2.5 pr-2">
                    <span
                      className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      Queue Type
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
                  <div className="w-24 shrink-0 py-2.5 pr-2">
                    <span
                      className="font-sans font-bold tracking-wider uppercase"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      Priority
                    </span>
                  </div>
                  <div className="w-28 shrink-0 py-2.5 pr-2">
                    <span
                      className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      Joined Time
                    </span>
                  </div>
                  <div className="w-36 shrink-0 py-2.5 pr-2">
                    <span
                      className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      Est. Wait Time
                    </span>
                  </div>
                  <div className="w-32 shrink-0 py-2.5 pr-2">
                    <span
                      className="font-sans font-bold tracking-wider uppercase"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      Pharmacist
                    </span>
                  </div>
                  <div className="flex w-20 shrink-0 items-center justify-end py-2.5 pr-3">
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
                      <Users style={{ width: 24, height: 24, color: '#8A98A3' }} />
                    </div>
                    <p className="font-sans font-medium" style={{ fontSize: 16, color: '#4A7080' }}>
                      No queue entries match your filters
                    </p>
                    <button
                      type="button"
                      onClick={handleClearFilters}
                      className={`mt-1 font-sans font-medium transition-colors duration-150 hover:underline ${FOCUS_RING}`}
                      style={{ fontSize: 14, color: '#00B4D8' }}
                    >
                      Clear all filters
                    </button>
                  </div>
                )}

                {pageRows.map((row) => {
                  const typeCfg = QUEUE_TYPE_COLOR[row.queueType];
                  const isWaitApplicable =
                    row.queueType !== 'Ready for Pickup' && row.queueType !== 'On Hold';
                  return (
                    <div
                      key={row.entry.rxNo}
                      className="flex items-center transition-colors duration-100 hover:bg-[#F5FBFD]"
                      style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                    >
                      <div className="w-24 shrink-0 py-3 pr-2 pl-3">
                        <p
                          className="font-sans font-medium"
                          style={{ fontSize: 14, color: '#00B4D8' }}
                        >
                          {row.queueNumber}
                        </p>
                      </div>
                      <div className="w-36 shrink-0 py-3 pr-2">
                        <Tooltip content={row.patientName}>
                          <p
                            className="truncate font-sans font-medium"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {row.patientName}
                          </p>
                        </Tooltip>
                        <p style={{ fontSize: 14, color: '#8A98A3' }}>{row.mrn}</p>
                      </div>
                      <div className="w-36 shrink-0 py-3 pr-2">
                        <p style={{ fontSize: 14, color: '#4A7080' }}>{row.entry.rxNo}</p>
                      </div>
                      <div className="w-44 shrink-0 py-3 pr-2">
                        <span
                          className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium"
                          style={{
                            fontSize: 14,
                            whiteSpace: 'nowrap',
                            color: typeCfg.color,
                            border: `1px solid ${typeCfg.border}`,
                            background: typeCfg.bg,
                          }}
                        >
                          {row.queueType}
                        </span>
                      </div>
                      <div className="w-28 shrink-0 py-3 pr-2">
                        <p style={{ fontSize: 14, color: '#4A7080' }}>{row.status}</p>
                      </div>
                      <div className="w-24 shrink-0 py-3 pr-2">
                        <p
                          style={{
                            fontSize: 14,
                            color:
                              row.entry.priority === 'High'
                                ? '#DC2626'
                                : row.entry.priority === 'Medium'
                                  ? '#D97706'
                                  : '#16A34A',
                          }}
                        >
                          {row.entry.priority}
                        </p>
                      </div>
                      <div className="w-28 shrink-0 py-3 pr-2">
                        <p style={{ fontSize: 14, color: '#0D2630' }}>
                          {formatTime(row.entry.receivedAt)}
                        </p>
                      </div>
                      <div className="w-36 shrink-0 py-3 pr-2">
                        <p style={{ fontSize: 14, color: '#4A7080' }}>
                          {isWaitApplicable ? `${minutesSince(row.entry.receivedAt)} mins` : '—'}
                        </p>
                      </div>
                      <div className="w-32 shrink-0 py-3 pr-2">
                        <Tooltip content={row.pharmacist}>
                          <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                            {row.pharmacist}
                          </p>
                        </Tooltip>
                      </div>
                      <div className="flex w-20 shrink-0 items-center justify-end gap-1 py-3 pr-3">
                        <button
                          type="button"
                          onClick={() => setModal({ type: 'detail', entry: row.entry })}
                          aria-label={`View ${row.entry.rxNo}`}
                          className={`flex size-11 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
                        >
                          <Eye style={{ width: 15, height: 15, color: '#4A7080' }} />
                        </button>
                        <RowMenu
                          entry={row.entry}
                          onView={() => setModal({ type: 'detail', entry: row.entry })}
                          onAdvance={() => handleAdvance(row.entry.rxNo)}
                          onMarkReady={() => handleMarkReady(row.entry.rxNo)}
                          onToggleHold={() =>
                            handleToggleHold(row.entry.rxNo, Boolean(row.entry.isOnHold))
                          }
                        />
                      </div>
                    </div>
                  );
                })}
              </ScrollableTable>

              <Pagination
                page={currentPage}
                pageSize={rowsPerPage}
                totalItems={filtered.length}
                onPageChange={setCurrentPage}
                onPageSizeChange={(size) => {
                  setRowsPerPage(size);
                  setCurrentPage(1);
                }}
                pageSizeOptions={[8, 10, 25, 50]}
                itemLabel="entries"
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="flex w-full shrink-0 flex-col gap-4 xl:w-[340px]">
            <div
              className="rounded-[12px] p-4"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Queue Overview
              </h2>
              <div className="mt-3 flex items-center gap-5">
                <AnimatedDonutChart
                  breakdown={queueOverview}
                  total={total}
                  ariaLabel="Queue overview donut chart"
                />
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  {queueOverview.map((d) => (
                    <div key={d.label} className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <span
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ background: d.color }}
                        />
                        <Tooltip content={d.label}>
                          <span className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                            {d.label}
                          </span>
                        </Tooltip>
                      </div>
                      <span
                        className="shrink-0 font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {d.value} ({total > 0 ? ((d.value / total) * 100).toFixed(1) : 0}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <p className="mt-3" style={{ fontSize: 14, color: '#8A98A3' }}>
                Total {total.toLocaleString('en-GB')}
              </p>
            </div>

            <div
              className="rounded-[12px] p-4"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Average Wait Time by Queue
              </h2>
              <div className="mt-3 flex flex-col gap-3">
                {avgWaitByQueue.map((r) => (
                  <div key={r.label}>
                    <div className="flex items-center justify-between gap-2">
                      <span style={{ fontSize: 14, color: '#4A7080' }}>{r.label}</span>
                      <span
                        className="shrink-0 font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {r.minutes} mins
                      </span>
                    </div>
                    <div
                      className="mt-1.5 h-1.5 overflow-hidden rounded-full"
                      style={{ background: 'rgba(0,100,130,0.08)' }}
                    >
                      <div
                        className="h-full rounded-full transition-[width] duration-500"
                        style={{
                          width: `${r.barPercent}%`,
                          background: QUEUE_TYPE_COLOR[r.label as QueueType].color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="rounded-[12px] p-4"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Quick Actions
              </h2>
              <div className="mt-3 flex flex-col gap-1">
                <button
                  type="button"
                  onClick={handleCallNextPatient}
                  className={`flex items-center justify-between gap-2 rounded-[8px] px-2.5 py-2.5 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                >
                  <span className="flex items-center gap-2.5">
                    <PhoneCall style={{ width: 16, height: 16, color: '#00B4D8' }} />
                    <span style={{ fontSize: 14, color: '#0D2630' }}>Call Next Patient</span>
                  </span>
                  <span style={{ fontSize: 14, color: '#00B4D8' }}>→</span>
                </button>
                <button
                  type="button"
                  onClick={handleMoveToNextQueue}
                  className={`flex items-center justify-between gap-2 rounded-[8px] px-2.5 py-2.5 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                >
                  <span className="flex items-center gap-2.5">
                    <RotateCcw style={{ width: 16, height: 16, color: '#00B4D8' }} />
                    <span style={{ fontSize: 14, color: '#0D2630' }}>Move To Next Queue</span>
                  </span>
                  <span style={{ fontSize: 14, color: '#00B4D8' }}>→</span>
                </button>
                <button
                  type="button"
                  onClick={handleQuickMarkReady}
                  className={`flex items-center justify-between gap-2 rounded-[8px] px-2.5 py-2.5 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                >
                  <span className="flex items-center gap-2.5">
                    <ShoppingBag style={{ width: 16, height: 16, color: '#00B4D8' }} />
                    <span style={{ fontSize: 14, color: '#0D2630' }}>Mark as Ready for Pickup</span>
                  </span>
                  <span style={{ fontSize: 14, color: '#00B4D8' }}>→</span>
                </button>
                <button
                  type="button"
                  onClick={handleQuickPutOnHold}
                  className={`flex items-center justify-between gap-2 rounded-[8px] px-2.5 py-2.5 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                >
                  <span className="flex items-center gap-2.5">
                    <Play style={{ width: 16, height: 16, color: '#00B4D8' }} />
                    <span style={{ fontSize: 14, color: '#0D2630' }}>Put On Hold</span>
                  </span>
                  <span style={{ fontSize: 14, color: '#00B4D8' }}>→</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModal({ type: 'settings' })}
                  className={`flex items-center justify-between gap-2 rounded-[8px] px-2.5 py-2.5 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                >
                  <span className="flex items-center gap-2.5">
                    <SettingsIcon style={{ width: 16, height: 16, color: '#00B4D8' }} />
                    <span style={{ fontSize: 14, color: '#0D2630' }}>View Queue Settings</span>
                  </span>
                  <span style={{ fontSize: 14, color: '#00B4D8' }}>→</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info banner */}
        <div
          className="mt-5 flex items-start gap-2.5 rounded-[12px] p-4"
          style={{ background: 'rgba(0,180,216,0.06)', border: '1px solid rgba(0,180,216,0.25)' }}
        >
          <p style={{ fontSize: 14, color: '#0D2630' }}>
            Queue times update in real-time. Ensure patients are served in the correct order of
            priority.
          </p>
        </div>

        <div className="h-4" />
      </div>

      {modal?.type === 'detail' && (
        <QueueEntryDetailModal
          entry={modal.entry}
          queueNumber={queueNumberFor(modal.entry.rxNo)}
          displayQueueType={displayQueueType(modal.entry)}
          assignedPharmacist={pharmacistFor(modal.entry.rxNo)}
          onAdvance={handleAdvance}
          onMarkReady={handleMarkReady}
          onToggleHold={(rxNo) => handleToggleHold(rxNo, Boolean(modal.entry.isOnHold))}
          onMarkCollected={handleMarkCollected}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'settings' && (
        <QueueMonitorSettingsModal
          autoRefresh={autoRefresh}
          onToggleAutoRefresh={() => setAutoRefresh((v) => !v)}
          sortPriorityFirst={sortPriorityFirst}
          onToggleSortPriorityFirst={() => setSortPriorityFirst((v) => !v)}
          onClose={() => setModal(null)}
        />
      )}
    </main>
  );
}
