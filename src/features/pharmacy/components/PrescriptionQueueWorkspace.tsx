'use client';

import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Hourglass,
  Lock,
  MoreVertical,
  RefreshCw,
  Search,
  Settings2,
  ShieldAlert,
  XCircle,
  Eye,
  Package,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import { FormSelect } from '@components/shared/FormSelect';
import { ModalLoadingFallback } from '@components/shared/ModalLoadingFallback';
import { Pagination } from '@components/shared/Pagination';
import { PermissionGate } from '@components/shared/PermissionGate';
import { RowMenuPortal } from '@components/shared/RowMenuPortal';
import { StatCard } from '@components/shared/StatCard';
import { PERMISSIONS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { formatTime, isToday } from '@/utils/datetime';
import { getPatientDetail } from '@/features/patients/__mocks__/patientFixtures';
import {
  getCriticallyLowStockItems,
  QUEUE_DEPARTMENT_OPTIONS,
  QUEUE_PRESCRIBER_OPTIONS,
  QUEUE_PRIORITY_OPTIONS,
  QUEUE_STATUS_OPTIONS,
  type PharmacyQueueEntry,
} from '@/features/pharmacy/__mocks__/pharmacyFixtures';
import {
  cancelPrescription,
  useAllQueueEntries,
  verifyAndDispense,
} from '@/features/pharmacy/store/pharmacyDispensingStore';
import type { QueueSettings } from './QueueSettingsModal';

const PrescriptionDetailModal = dynamic(
  () => import('./PrescriptionDetailModal').then((m) => m.PrescriptionDetailModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);
const QueueSettingsModal = dynamic(
  () => import('./QueueSettingsModal').then((m) => m.QueueSettingsModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

type PageState = 'loading' | 'loaded' | 'error';

const PRIORITY_CFG: Record<string, { color: string; border: string; bg: string }> = {
  High: { color: '#DC2626', border: 'rgba(220,38,38,0.35)', bg: 'rgba(220,38,38,0.08)' },
  Medium: { color: '#D97706', border: 'rgba(217,119,6,0.35)', bg: 'rgba(217,119,6,0.08)' },
  Low: { color: '#16A34A', border: 'rgba(22,163,74,0.35)', bg: 'rgba(22,163,74,0.08)' },
};

const STAGE_CFG: Record<string, { color: string; border: string; bg: string }> = {
  'Pending Verification': {
    color: '#7C3AED',
    border: 'rgba(124,58,237,0.35)',
    bg: 'rgba(124,58,237,0.08)',
  },
  'In Progress': { color: '#D97706', border: 'rgba(217,119,6,0.35)', bg: 'rgba(217,119,6,0.08)' },
  'Ready for Dispense': {
    color: '#16A34A',
    border: 'rgba(22,163,74,0.35)',
    bg: 'rgba(22,163,74,0.08)',
  },
  'Ready for Pickup': {
    color: '#2563EB',
    border: 'rgba(37,99,235,0.35)',
    bg: 'rgba(37,99,235,0.08)',
  },
  Cancelled: { color: '#64748B', border: 'rgba(100,116,139,0.35)', bg: 'rgba(100,116,139,0.08)' },
};

const CANCELLABLE_STAGES = new Set(['Pending Verification', 'In Progress', 'Ready for Dispense']);

const DEFAULT_SETTINGS: QueueSettings = {
  defaultRowsPerPage: 8,
  showCancelled: true,
  highlightAllergyRows: true,
};

function ageGenderLabel(patient: { age: string; gender: string }): string {
  const ageNum = /^\d+/.exec(patient.age)?.[0] ?? patient.age;
  const genderLetter = patient.gender?.[0]?.toUpperCase() ?? '—';
  return `${ageNum} / ${genderLetter}`;
}

function SkeletonStatCard() {
  return (
    <div
      className="rounded-[12px] p-4"
      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
    >
      <div className="flex items-center justify-between">
        <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
        <div className="size-10 shrink-0 animate-pulse rounded-[12px] bg-slate-200" />
      </div>
      <div className="mt-2.5 h-7 w-14 animate-pulse rounded bg-slate-200" />
      <div className="mt-1.5 h-3.5 w-28 animate-pulse rounded bg-slate-200" />
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 py-3" style={{ minWidth: 1420 }}>
      <div className="h-3.5 w-full max-w-[900px] animate-pulse rounded bg-slate-200" />
    </div>
  );
}

function RowMenu({
  entry,
  onView,
  onVerify,
  onCancel,
}: {
  entry: PharmacyQueueEntry;
  onView: () => void;
  onVerify: () => void;
  onCancel: () => void;
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
      <RowMenuPortal open={open} anchorRef={buttonRef} onClose={() => setOpen(false)} width={208}>
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
        <PermissionGate permission={PERMISSIONS.PHARMACY_DISPENSE}>
          {entry.stage === 'Pending Verification' && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onVerify();
              }}
              className="flex w-full items-center px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD]"
              style={{ fontSize: 14, color: '#2F3A40' }}
            >
              Verify &amp; Dispense
            </button>
          )}
          {CANCELLABLE_STAGES.has(entry.stage) && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onCancel();
              }}
              className="flex w-full items-center px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[rgba(239,68,68,0.06)]"
              style={{ fontSize: 14, color: '#EF4444' }}
            >
              Cancel Prescription
            </button>
          )}
        </PermissionGate>
      </RowMenuPortal>
    </div>
  );
}

export function PrescriptionQueueWorkspace() {
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const actorName = user?.name ?? 'Pharmacist';

  const [pageState, setPageState] = useState<PageState>('loading');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [prescriberFilter, setPrescriberFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [allergyOnly, setAllergyOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [settings, setSettings] = useState<QueueSettings>(DEFAULT_SETTINGS);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_SETTINGS.defaultRowsPerPage);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [detailRxNo, setDetailRxNo] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const tableRef = useRef<HTMLDivElement>(null);

  const allEntries = useAllQueueEntries();
  const activeEntries = useMemo(
    () => allEntries.filter((e) => e.stage !== 'Collected'),
    [allEntries],
  );

  const pendingCount = activeEntries.filter((e) => e.stage === 'Pending Verification').length;
  const inProgressCount = activeEntries.filter((e) => e.stage === 'In Progress').length;
  const readyForDispenseCount = activeEntries.filter(
    (e) => e.stage === 'Ready for Dispense',
  ).length;
  const readyForPickupCount = activeEntries.filter((e) => e.stage === 'Ready for Pickup').length;
  const cancelledTodayCount = activeEntries.filter(
    (e) => e.stage === 'Cancelled' && e.cancelledAt && isToday(e.cancelledAt),
  ).length;
  const totalActive = activeEntries.length;

  const highPriorityCount = activeEntries.filter((e) => e.priority === 'High').length;
  const allergyAlertCount = activeEntries.filter((e) => e.hasAllergyAlert).length;
  const criticalStockItems = getCriticallyLowStockItems();
  const stockAlertCount = activeEntries.filter((e) =>
    criticalStockItems.some((item) =>
      item.name.toLowerCase().startsWith(e.medicationName.toLowerCase()),
    ),
  ).length;

  const donutBreakdown = [
    {
      label: 'Pending Verification',
      value: pendingCount,
      color: STAGE_CFG['Pending Verification']!.color,
    },
    { label: 'In Progress', value: inProgressCount, color: STAGE_CFG['In Progress']!.color },
    {
      label: 'Ready for Dispense',
      value: readyForDispenseCount,
      color: STAGE_CFG['Ready for Dispense']!.color,
    },
    {
      label: 'Ready for Pickup',
      value: readyForPickupCount,
      color: STAGE_CFG['Ready for Pickup']!.color,
    },
    {
      label: 'Cancelled',
      value: activeEntries.filter((e) => e.stage === 'Cancelled').length,
      color: STAGE_CFG['Cancelled']!.color,
    },
  ];

  const pool = useMemo(
    () =>
      settings.showCancelled ? activeEntries : activeEntries.filter((e) => e.stage !== 'Cancelled'),
    [activeEntries, settings.showCancelled],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return pool.filter((e) => {
      const patient = getPatientDetail(e.patientId);
      if (statusFilter && e.stage !== statusFilter) return false;
      if (priorityFilter && e.priority !== priorityFilter) return false;
      if (prescriberFilter && e.doctorName !== prescriberFilter) return false;
      if (departmentFilter && e.department !== departmentFilter) return false;
      if (allergyOnly && !e.hasAllergyAlert) return false;
      if (
        q &&
        !patient.name.toLowerCase().includes(q) &&
        !patient.mrn.toLowerCase().includes(q) &&
        !e.rxNo.toLowerCase().includes(q) &&
        !e.medicationName.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [pool, search, statusFilter, priorityFilter, prescriberFilter, departmentFilter, allergyOnly]);

  const pageStart = (currentPage - 1) * rowsPerPage;
  const pageRows = filtered.slice(pageStart, pageStart + rowsPerPage);

  function handleRetry() {
    setPageState('loading');
    setTimeout(() => setPageState('loaded'), 800);
  }

  useEffect(() => {
    const t = setTimeout(() => setPageState('loaded'), 800);
    return () => clearTimeout(t);
  }, []);

  function handleRefresh() {
    setPageState('loading');
    setTimeout(() => {
      setPageState('loaded');
      toast.success('Queue refreshed', 'The prescription queue is up to date.');
    }, 700);
  }

  function handleApplyFilters() {
    toast.success(
      'Filters applied',
      `${filtered.length} prescription${filtered.length !== 1 ? 's' : ''} match your filters.`,
    );
  }

  function handleClearFilters() {
    setSearch('');
    setStatusFilter('');
    setPriorityFilter('');
    setPrescriberFilter('');
    setDepartmentFilter('');
    setAllergyOnly(false);
    setCurrentPage(1);
  }

  function scrollToTable() {
    tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handleViewHighPriority() {
    setPriorityFilter('High');
    setCurrentPage(1);
    scrollToTable();
  }

  function handleReviewAllergies() {
    setAllergyOnly(true);
    setMoreFiltersOpen(true);
    setCurrentPage(1);
    scrollToTable();
  }

  function handleVerifyAndDispense(rxNo: string) {
    verifyAndDispense(rxNo, actorName);
    toast.success('Prescription dispensed', `${rxNo} moved to Ready for Pickup.`);
  }

  function handleCancel(rxNo: string) {
    cancelPrescription(rxNo);
    toast.info('Prescription cancelled', `${rxNo} has been cancelled.`);
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(rxNo);
      return next;
    });
  }

  function toggleSelected(rxNo: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(rxNo)) next.delete(rxNo);
      else next.add(rxNo);
      return next;
    });
  }

  function toggleSelectAllOnPage() {
    const pageRxNos = pageRows.map((e) => e.rxNo);
    const allSelected = pageRxNos.every((rx) => selected.has(rx));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) pageRxNos.forEach((rx) => next.delete(rx));
      else pageRxNos.forEach((rx) => next.add(rx));
      return next;
    });
  }

  function handleBulkCancel() {
    const cancellable = Array.from(selected).filter((rxNo) => {
      const entry = allEntries.find((e) => e.rxNo === rxNo);
      return entry && CANCELLABLE_STAGES.has(entry.stage);
    });
    cancellable.forEach((rxNo) => cancelPrescription(rxNo));
    toast.info(
      'Prescriptions cancelled',
      `${cancellable.length} prescription${cancellable.length !== 1 ? 's' : ''} cancelled.`,
    );
    setSelected(new Set());
  }

  const detailEntry = detailRxNo ? (allEntries.find((e) => e.rxNo === detailRxNo) ?? null) : null;

  if (pageState === 'error') {
    return (
      <main className="flex flex-1 items-center justify-center" style={{ background: '#F5FBFD' }}>
        <div className="flex flex-col items-center gap-3 px-6 text-center">
          <AlertTriangle style={{ width: 40, height: 40, color: '#DC2626' }} />
          <p className="font-display font-semibold" style={{ fontSize: 18, color: '#0D2630' }}>
            Couldn&apos;t load the Prescription Queue
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
          <span style={{ fontSize: 14, color: '#8A98A3' }}>Prescription Management</span>
          <span style={{ fontSize: 14, color: '#8A98A3' }}>/</span>
          <span className="font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
            Prescription Queue
          </span>
        </nav>

        {/* Header */}
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className="flex size-11 shrink-0 items-center justify-center rounded-[12px]"
              style={{ background: 'rgba(124,58,237,0.1)' }}
            >
              <ClipboardList style={{ width: 22, height: 22, color: '#7C3AED' }} />
            </div>
            <div>
              <h1
                className="font-display font-semibold"
                style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
              >
                Prescription Queue
              </h1>
              <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                Review and verify new prescriptions. Check patient details, allergies, interactions,
                and stock availability before dispensing.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2.5">
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
              style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
            >
              <Settings2 style={{ width: 15, height: 15 }} />
              Queue Settings
            </button>
            <button
              type="button"
              onClick={handleRefresh}
              className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
              style={{ fontSize: 14, background: '#00B4D8' }}
            >
              <RefreshCw style={{ width: 15, height: 15 }} />
              Refresh Queue
            </button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="mt-5 grid grid-cols-2 gap-3.5 sm:grid-cols-3 xl:grid-cols-5 xl:gap-4">
          {pageState === 'loading' ? (
            Array.from({ length: 5 }).map((_, i) => <SkeletonStatCard key={i} />)
          ) : (
            <>
              <StatCard
                icon={ClipboardList}
                label="Pending Verification"
                value={pendingCount}
                info="Requires review"
                accent="#7C3AED"
                iconBg="rgba(124,58,237,0.1)"
                onClick={() => {
                  setStatusFilter('Pending Verification');
                  setCurrentPage(1);
                  scrollToTable();
                }}
              />
              <StatCard
                icon={Hourglass}
                label="In Progress"
                value={inProgressCount}
                info="Being verified"
                accent="#D97706"
                iconBg="rgba(217,119,6,0.1)"
                onClick={() => {
                  setStatusFilter('In Progress');
                  setCurrentPage(1);
                  scrollToTable();
                }}
              />
              <StatCard
                icon={CheckCircle2}
                label="Ready for Dispense"
                value={readyForDispenseCount}
                info="Verified & ready"
                accent="#16A34A"
                iconBg="rgba(22,163,74,0.1)"
                onClick={() => {
                  setStatusFilter('Ready for Dispense');
                  setCurrentPage(1);
                  scrollToTable();
                }}
              />
              <StatCard
                icon={Lock}
                label="Ready for Pickup"
                value={readyForPickupCount}
                info="Awaiting collection"
                accent="#2563EB"
                iconBg="rgba(37,99,235,0.1)"
                onClick={() => {
                  setStatusFilter('Ready for Pickup');
                  setCurrentPage(1);
                  scrollToTable();
                }}
              />
              <StatCard
                icon={XCircle}
                label="Cancelled"
                value={cancelledTodayCount}
                info="Today"
                accent="#64748B"
                iconBg="rgba(100,116,139,0.1)"
                onClick={() => {
                  setStatusFilter('Cancelled');
                  setCurrentPage(1);
                  scrollToTable();
                }}
              />
            </>
          )}
        </div>

        <div className="mt-5 flex flex-col gap-4 xl:flex-row xl:items-start">
          {/* Main column */}
          <div className="min-w-0 flex-1" ref={tableRef}>
            <div
              className="rounded-[12px] p-4 sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              {/* Filters */}
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
                    placeholder="Search by patient, Rx No., or medication..."
                    className={`h-11 w-full rounded-[10px] pr-4 pl-9 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                    style={{
                      fontSize: 14,
                      border: '1px solid rgba(0,100,130,0.18)',
                      color: '#0D2630',
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setMoreFiltersOpen((v) => !v)}
                  className={`shrink-0 font-sans font-medium transition-colors duration-150 hover:underline ${FOCUS_RING}`}
                  style={{ fontSize: 14, color: '#00B4D8' }}
                >
                  {moreFiltersOpen ? 'Fewer Filters' : 'More Filters'}
                </button>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <FormSelect
                  id="queue-status-filter"
                  value={statusFilter}
                  onChange={(v) => {
                    setStatusFilter(v);
                    setCurrentPage(1);
                  }}
                  options={QUEUE_STATUS_OPTIONS}
                  placeholder="All Statuses"
                />
                <FormSelect
                  id="queue-priority-filter"
                  value={priorityFilter}
                  onChange={(v) => {
                    setPriorityFilter(v);
                    setCurrentPage(1);
                  }}
                  options={QUEUE_PRIORITY_OPTIONS}
                  placeholder="All Priorities"
                />
                <FormSelect
                  id="queue-prescriber-filter"
                  value={prescriberFilter}
                  onChange={(v) => {
                    setPrescriberFilter(v);
                    setCurrentPage(1);
                  }}
                  options={QUEUE_PRESCRIBER_OPTIONS}
                  placeholder="All Prescribers"
                />
                <FormSelect
                  id="queue-department-filter"
                  value={departmentFilter}
                  onChange={(v) => {
                    setDepartmentFilter(v);
                    setCurrentPage(1);
                  }}
                  options={QUEUE_DEPARTMENT_OPTIONS}
                  placeholder="All Departments"
                />
              </div>

              {moreFiltersOpen && (
                <div
                  className="animate-in fade-in-0 slide-in-from-top-1 mt-3 flex items-center gap-3 rounded-[10px] p-3 duration-150"
                  style={{ background: '#F5FBFD', border: '1px solid rgba(0,100,130,0.12)' }}
                >
                  <label className="flex cursor-pointer items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={allergyOnly}
                      onChange={(e) => {
                        setAllergyOnly(e.target.checked);
                        setCurrentPage(1);
                      }}
                      className={`size-5 shrink-0 rounded ${FOCUS_RING}`}
                      style={{ accentColor: '#00B4D8' }}
                    />
                    <span style={{ fontSize: 14, color: '#0D2630' }}>
                      Only show prescriptions with allergy alerts
                    </span>
                  </label>
                </div>
              )}

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
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
                  style={{ fontSize: 14, background: '#00B4D8' }}
                >
                  Apply Filters
                </button>
              </div>

              {/* Bulk action bar */}
              {selected.size > 0 && (
                <div
                  className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-[10px] p-3"
                  style={{
                    background: 'rgba(0,180,216,0.06)',
                    border: '1px solid rgba(0,180,216,0.25)',
                  }}
                >
                  <p style={{ fontSize: 14, color: '#0D2630' }}>
                    <span className="font-semibold">{selected.size}</span> selected
                  </p>
                  <div className="flex items-center gap-2">
                    <PermissionGate permission={PERMISSIONS.PHARMACY_DISPENSE}>
                      <button
                        type="button"
                        onClick={handleBulkCancel}
                        className={`flex h-9 items-center gap-1.5 rounded-[8px] px-3 font-sans font-medium transition-colors duration-150 hover:bg-[rgba(220,38,38,0.06)] ${FOCUS_RING}`}
                        style={{
                          fontSize: 14,
                          color: '#DC2626',
                          border: '1px solid rgba(220,38,38,0.3)',
                        }}
                      >
                        Cancel Selected
                      </button>
                    </PermissionGate>
                    <button
                      type="button"
                      onClick={() => setSelected(new Set())}
                      className={`flex h-9 items-center gap-1.5 rounded-[8px] px-3 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                      style={{
                        fontSize: 14,
                        color: '#4A7080',
                        border: '1px solid rgba(0,100,130,0.18)',
                      }}
                    >
                      Clear Selection
                    </button>
                  </div>
                </div>
              )}

              {/* Table */}
              <div className="mt-4">
                <h2
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Prescription Queue ({filtered.length})
                </h2>
                <div className="mt-3 overflow-x-auto scroll-smooth">
                  <div style={{ minWidth: 1420 }}>
                    <div
                      className="flex rounded-t-[8px]"
                      style={{
                        background: 'rgba(226,237,241,0.4)',
                        borderBottom: '1px solid #E6F8FD',
                      }}
                    >
                      <div className="flex w-10 shrink-0 items-center py-2.5 pl-3">
                        <input
                          type="checkbox"
                          checked={
                            pageRows.length > 0 && pageRows.every((e) => selected.has(e.rxNo))
                          }
                          onChange={toggleSelectAllOnPage}
                          aria-label="Select all rows on this page"
                          className={`size-5 shrink-0 rounded ${FOCUS_RING}`}
                          style={{ accentColor: '#00B4D8' }}
                        />
                      </div>
                      <div className="w-28 shrink-0 py-2.5 pr-2">
                        <span
                          className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Rx No.
                        </span>
                      </div>
                      <div className="w-44 shrink-0 py-2.5 pr-2">
                        <span
                          className="font-sans font-bold tracking-wider uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Patient
                        </span>
                      </div>
                      <div className="w-28 shrink-0 py-2.5 pr-2">
                        <span
                          className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Age / Gender
                        </span>
                      </div>
                      <div className="w-40 shrink-0 py-2.5 pr-2">
                        <span
                          className="font-sans font-bold tracking-wider uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Prescriber
                        </span>
                      </div>
                      <div className="w-36 shrink-0 py-2.5 pr-2">
                        <span
                          className="font-sans font-bold tracking-wider uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Department
                        </span>
                      </div>
                      <div className="min-w-[200px] flex-1 py-2.5 pr-2">
                        <span
                          className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Medication (Summary)
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
                      <div className="w-44 shrink-0 py-2.5 pr-2">
                        <span
                          className="font-sans font-bold tracking-wider uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Status
                        </span>
                      </div>
                      <div className="w-20 shrink-0 py-2.5 pr-2">
                        <span
                          className="font-sans font-bold tracking-wider uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Received
                        </span>
                      </div>
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
                          <Search style={{ width: 24, height: 24, color: '#8A98A3' }} />
                        </div>
                        <p
                          className="font-sans font-medium"
                          style={{ fontSize: 16, color: '#4A7080' }}
                        >
                          No prescriptions match your filters
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

                    {pageState === 'loaded' &&
                      pageRows.map((entry) => {
                        const patient = getPatientDetail(entry.patientId);
                        const priorityCfg = PRIORITY_CFG[entry.priority]!;
                        const stageCfg = STAGE_CFG[entry.stage] ?? STAGE_CFG['Cancelled']!;
                        const isSelected = selected.has(entry.rxNo);
                        const highlightAllergy =
                          settings.highlightAllergyRows && entry.hasAllergyAlert;
                        return (
                          <div
                            key={entry.rxNo}
                            className="flex items-center transition-colors duration-100 hover:bg-[#F5FBFD]"
                            style={{
                              borderBottom: '1px solid rgba(0,100,130,0.08)',
                              background: highlightAllergy ? 'rgba(220,38,38,0.03)' : undefined,
                            }}
                          >
                            <div className="flex w-10 shrink-0 items-center py-3 pl-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelected(entry.rxNo)}
                                aria-label={`Select ${entry.rxNo}`}
                                className={`size-5 shrink-0 rounded ${FOCUS_RING}`}
                                style={{ accentColor: '#00B4D8' }}
                              />
                            </div>
                            <div className="w-28 shrink-0 py-3 pr-2">
                              <p
                                className="truncate font-sans font-medium"
                                style={{ fontSize: 14, color: '#0D2630' }}
                              >
                                {entry.rxNo}
                              </p>
                            </div>
                            <div className="w-44 shrink-0 py-3 pr-2">
                              <p
                                className="truncate font-sans font-medium"
                                style={{ fontSize: 14, color: '#0D2630' }}
                              >
                                {patient.name}
                              </p>
                              <p className="truncate" style={{ fontSize: 14, color: '#8A98A3' }}>
                                {patient.mrn}
                              </p>
                            </div>
                            <div className="w-28 shrink-0 py-3 pr-2">
                              <p style={{ fontSize: 14, color: '#4A7080' }}>
                                {ageGenderLabel(patient)}
                              </p>
                            </div>
                            <div className="w-40 shrink-0 py-3 pr-2">
                              <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                                {entry.doctorName}
                              </p>
                            </div>
                            <div className="w-36 shrink-0 py-3 pr-2">
                              <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                                {entry.department}
                              </p>
                            </div>
                            <div className="min-w-[200px] flex-1 py-3 pr-2">
                              <p
                                className="truncate font-sans font-medium"
                                style={{ fontSize: 14, color: '#0D2630' }}
                              >
                                {entry.medicationName} {entry.dose}
                              </p>
                              <p style={{ fontSize: 14, color: '#8A98A3' }}>1 item</p>
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
                                {entry.priority}
                              </span>
                            </div>
                            <div className="w-44 shrink-0 py-3 pr-2">
                              <span
                                className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium"
                                style={{
                                  fontSize: 14,
                                  whiteSpace: 'nowrap',
                                  color: stageCfg.color,
                                  border: `1px solid ${stageCfg.border}`,
                                  background: stageCfg.bg,
                                }}
                              >
                                {entry.stage}
                              </span>
                            </div>
                            <div className="w-20 shrink-0 py-3 pr-2">
                              <p style={{ fontSize: 14, color: '#4A7080' }}>
                                {formatTime(entry.receivedAt)}
                              </p>
                            </div>
                            <div className="flex w-24 shrink-0 items-center justify-end gap-1 py-3 pr-3">
                              <button
                                type="button"
                                onClick={() => setDetailRxNo(entry.rxNo)}
                                aria-label={`View ${entry.rxNo}`}
                                className={`flex size-11 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
                              >
                                <Eye style={{ width: 15, height: 15, color: '#4A7080' }} />
                              </button>
                              <RowMenu
                                entry={entry}
                                onView={() => setDetailRxNo(entry.rxNo)}
                                onVerify={() => handleVerifyAndDispense(entry.rxNo)}
                                onCancel={() => handleCancel(entry.rxNo)}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {pageState === 'loaded' && (
                  <Pagination
                    page={currentPage}
                    pageSize={rowsPerPage}
                    totalItems={filtered.length}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={(size) => {
                      setRowsPerPage(size);
                      setCurrentPage(1);
                    }}
                    itemLabel="prescriptions"
                  />
                )}
              </div>
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
                <QueueDonutChart breakdown={donutBreakdown} total={totalActive} />
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  {donutBreakdown.map((d) => (
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
                        {d.value} ({totalActive > 0 ? Math.round((d.value / totalActive) * 100) : 0}
                        %)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div
              className="rounded-[12px] p-3.5"
              style={{
                background: 'rgba(220,38,38,0.05)',
                border: '1px solid rgba(220,38,38,0.25)',
              }}
            >
              <div className="flex items-start gap-2.5">
                <ShieldAlert
                  style={{ width: 18, height: 18, color: '#DC2626' }}
                  className="mt-0.5 shrink-0"
                />
                <div className="min-w-0">
                  <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
                    High Priority
                  </p>
                  <p style={{ fontSize: 14, color: '#4A7080' }}>
                    {highPriorityCount} prescription{highPriorityCount !== 1 ? 's' : ''} require
                    immediate attention.
                  </p>
                  <button
                    type="button"
                    onClick={handleViewHighPriority}
                    className={`mt-1.5 font-sans font-medium transition-colors duration-150 hover:underline ${FOCUS_RING}`}
                    style={{ fontSize: 14, color: '#DC2626' }}
                  >
                    View High Priority →
                  </button>
                </div>
              </div>
            </div>

            <div
              className="rounded-[12px] p-3.5"
              style={{
                background: 'rgba(217,119,6,0.05)',
                border: '1px solid rgba(217,119,6,0.25)',
              }}
            >
              <div className="flex items-start gap-2.5">
                <AlertTriangle
                  style={{ width: 18, height: 18, color: '#D97706' }}
                  className="mt-0.5 shrink-0"
                />
                <div className="min-w-0">
                  <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
                    Allergy Alerts
                  </p>
                  <p style={{ fontSize: 14, color: '#4A7080' }}>
                    {allergyAlertCount} prescription{allergyAlertCount !== 1 ? 's' : ''} have
                    allergy alerts.
                  </p>
                  <button
                    type="button"
                    onClick={handleReviewAllergies}
                    className={`mt-1.5 font-sans font-medium transition-colors duration-150 hover:underline ${FOCUS_RING}`}
                    style={{ fontSize: 14, color: '#D97706' }}
                  >
                    Review Now →
                  </button>
                </div>
              </div>
            </div>

            <div
              className="rounded-[12px] p-3.5"
              style={{
                background: 'rgba(37,99,235,0.05)',
                border: '1px solid rgba(37,99,235,0.25)',
              }}
            >
              <div className="flex items-start gap-2.5">
                <Package
                  style={{ width: 18, height: 18, color: '#2563EB' }}
                  className="mt-0.5 shrink-0"
                />
                <div className="min-w-0">
                  <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
                    Stock Alerts
                  </p>
                  <p style={{ fontSize: 14, color: '#4A7080' }}>
                    {stockAlertCount} prescription{stockAlertCount !== 1 ? 's' : ''} have items with
                    low stock.
                  </p>
                  <button
                    type="button"
                    onClick={() => router.push(ROUTES.pharmacyInventory)}
                    className={`mt-1.5 font-sans font-medium transition-colors duration-150 hover:underline ${FOCUS_RING}`}
                    style={{ fontSize: 14, color: '#2563EB' }}
                  >
                    Check Inventory →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer safety banner */}
        <div
          className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[12px] p-4"
          style={{ background: 'rgba(0,180,216,0.06)', border: '1px solid rgba(0,180,216,0.25)' }}
        >
          <p style={{ fontSize: 14, color: '#0D2630' }}>
            Always verify patient allergies, check drug interactions, and confirm stock availability
            before dispensing.
          </p>
          <button
            type="button"
            onClick={() => router.push(ROUTES.pharmacyAdr)}
            className={`flex items-center gap-1 font-sans font-medium whitespace-nowrap transition-colors duration-150 hover:underline ${FOCUS_RING}`}
            style={{ fontSize: 14, color: '#00B4D8' }}
          >
            Open Safety Checks →
          </button>
        </div>

        <div className="h-4" />
      </div>

      {detailEntry && (
        <PrescriptionDetailModal
          entry={detailEntry}
          onClose={() => setDetailRxNo(null)}
          onVerifyAndDispense={handleVerifyAndDispense}
          onCancel={handleCancel}
        />
      )}
      {settingsOpen && (
        <QueueSettingsModal
          settings={settings}
          onChange={(next) => {
            setSettings(next);
            setRowsPerPage(next.defaultRowsPerPage);
            setCurrentPage(1);
          }}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </main>
  );
}

function QueueDonutChart({
  breakdown,
  total,
}: {
  breakdown: { label: string; value: number; color: string }[];
  total: number;
}) {
  const safeTotal = total || 1;
  const radius = 54;
  const strokeWidth = 20;
  const circumference = 2 * Math.PI * radius;
  const gapPx = 3;

  type Seg = (typeof breakdown)[number] & { length: number; offset: number };
  const { segments } = breakdown.reduce<{ cumulative: number; segments: Seg[] }>(
    (acc, d) => {
      const rawLength = (d.value / safeTotal) * circumference;
      const offset = -(acc.cumulative / safeTotal) * circumference;
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
        aria-label="Prescription queue overview donut chart"
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
          {total}
        </span>
        <span style={{ fontSize: 14, color: '#8A98A3' }}>Total</span>
      </div>
    </div>
  );
}
