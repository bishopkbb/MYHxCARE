'use client';

import {
  Calendar,
  CheckCircle2,
  Clock,
  Info,
  MoreVertical,
  Package,
  Printer,
  RefreshCw,
  Repeat,
  Search,
  Users,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';

import { AnimatedDonutChart } from '@components/shared/AnimatedDonutChart';
import { FormSelect } from '@components/shared/FormSelect';
import { Pagination } from '@components/shared/Pagination';
import { PermissionGate } from '@components/shared/PermissionGate';
import { RowMenuPortal } from '@components/shared/RowMenuPortal';
import {
  ScrollableTable,
  TABLE_HEADER_BG,
  TABLE_HEADER_STICKY_CLASS,
} from '@components/shared/ScrollableTable';
import { Tooltip } from '@components/shared/Tooltip';
import { StatCard } from '@components/shared/StatCard';
import { PERMISSIONS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
import { useToast } from '@/hooks/useToast';
import { downloadPDF, escapeHtml } from '@/utils/export';
import { formatDateTime, formatTime, isToday } from '@/utils/datetime';
import { getPatientDetail } from '@/features/patients/__mocks__/patientFixtures';
import {
  PICKUP_TYPE_OPTIONS,
  QUEUE_DEPARTMENT_OPTIONS,
  QUEUE_PRESCRIBER_OPTIONS,
  type PharmacyQueueEntry,
} from '@/features/pharmacy/__mocks__/pharmacyFixtures';
import {
  markCollected,
  toggleHold,
  useAllQueueEntries,
  useReadyForPickupQueue,
} from '@/features/pharmacy/store/pharmacyDispensingStore';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const OVERDUE_SLA_HOURS = 4;

type RowStatus = 'Ready' | 'Overdue' | 'On Hold';

const STATUS_CFG: Record<RowStatus, { color: string; border: string; bg: string }> = {
  Ready: { color: '#16A34A', border: 'rgba(22,163,74,0.35)', bg: 'rgba(22,163,74,0.08)' },
  Overdue: { color: '#DC2626', border: 'rgba(220,38,38,0.35)', bg: 'rgba(220,38,38,0.08)' },
  'On Hold': { color: '#D97706', border: 'rgba(217,119,6,0.35)', bg: 'rgba(217,119,6,0.08)' },
};

const STATUS_OPTIONS = (Object.keys(STATUS_CFG) as RowStatus[]).map((s) => ({
  value: s,
  label: s,
}));

function hoursSince(iso: string | undefined): number {
  if (!iso) return 0;
  return (Date.now() - new Date(iso).getTime()) / 3_600_000;
}

function getStatus(entry: PharmacyQueueEntry): RowStatus {
  if (entry.isOnHold) return 'On Hold';
  if (hoursSince(entry.dispensedAt) > OVERDUE_SLA_HOURS) return 'Overdue';
  return 'Ready';
}

function getNote(entry: PharmacyQueueEntry, status: RowStatus): string {
  if (status === 'On Hold') return 'On hold — pending pharmacist review';
  if (entry.pickupType === 'Will Call') return 'Will call — awaiting patient confirmation';
  if (entry.pickupType === 'Family Pickup') return 'Family pickup — ID required';
  return entry.instructions;
}

function RowMenu({
  entry,
  onView,
  onCollect,
  onHold,
}: {
  entry: PharmacyQueueEntry;
  onView: () => void;
  onCollect: () => void;
  onHold: () => void;
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
        <PermissionGate permission={PERMISSIONS.PHARMACY_DISPENSE}>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onCollect();
            }}
            className="flex w-full items-center px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD]"
            style={{ fontSize: 14, color: '#2F3A40' }}
          >
            Mark Collected
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onHold();
            }}
            className="flex w-full items-center px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[rgba(217,119,6,0.06)]"
            style={{ fontSize: 14, color: '#D97706' }}
          >
            {entry.isOnHold ? 'Resume Pickup' : 'Hold Pickup'}
          </button>
        </PermissionGate>
      </RowMenuPortal>
    </div>
  );
}

export function MedicationPickupQueueWorkspace() {
  const router = useRouter();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [prescriberFilter, setPrescriberFilter] = useState('');
  const [pickupTypeFilter, setPickupTypeFilter] = useState('');
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [refreshing, setRefreshing] = useState(false);

  const readyQueue = useReadyForPickupQueue();
  const allEntries = useAllQueueEntries();

  const tableRef = useRef<HTMLDivElement>(null);

  const withStatus = useMemo(
    () =>
      readyQueue.map((entry) => {
        const patient = getPatientDetail(entry.patientId);
        const status = getStatus(entry);
        return { entry, patient, status, note: getNote(entry, status) };
      }),
    [readyQueue],
  );

  const readyCount = withStatus.filter((r) => r.status === 'Ready').length;
  const overdueCount = withStatus.filter((r) => r.status === 'Overdue').length;
  const onHoldCount = withStatus.filter((r) => r.status === 'On Hold').length;
  const dueTodayCount = withStatus.filter(
    (r) => r.status === 'Ready' && isToday(r.entry.dispensedAt ?? ''),
  ).length;
  const willCallOrHoldCount = readyQueue.filter(
    (e) => e.pickupType === 'Will Call' || e.isOnHold,
  ).length;
  const collectedTodayCount = allEntries.filter(
    (e) => e.stage === 'Collected' && e.collectedAt && isToday(e.collectedAt),
  ).length;

  const donutBreakdown = [
    { label: 'Ready', value: readyCount, color: STATUS_CFG.Ready.color },
    { label: 'Overdue', value: overdueCount, color: STATUS_CFG.Overdue.color },
    { label: 'On Hold', value: onHoldCount, color: STATUS_CFG['On Hold'].color },
  ];

  const firstOverdue = withStatus.find((r) => r.status === 'Overdue') ?? null;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return withStatus.filter(({ entry, patient, status }) => {
      if (statusFilter && status !== statusFilter) return false;
      if (departmentFilter && entry.department !== departmentFilter) return false;
      if (prescriberFilter && entry.doctorName !== prescriberFilter) return false;
      if (pickupTypeFilter && entry.pickupType !== pickupTypeFilter) return false;
      if (
        q &&
        !patient.name.toLowerCase().includes(q) &&
        !patient.phone.toLowerCase().includes(q) &&
        !entry.rxNo.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [withStatus, search, statusFilter, departmentFilter, prescriberFilter, pickupTypeFilter]);

  const pageStart = (currentPage - 1) * rowsPerPage;
  const pageRows = filtered.slice(pageStart, pageStart + rowsPerPage);

  function scrollToTable() {
    tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handleClearFilters() {
    setSearch('');
    setStatusFilter('');
    setDepartmentFilter('');
    setPrescriberFilter('');
    setPickupTypeFilter('');
    setCurrentPage(1);
  }

  function handleApplyFilters() {
    toast.success(
      'Filters applied',
      `${filtered.length} pickup${filtered.length !== 1 ? 's' : ''} match your filters.`,
    );
  }

  function handleRefresh() {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      toast.success('Queue refreshed', 'The pickup queue is up to date.');
    }, 600);
  }

  function handleCollect(rxNo: string) {
    markCollected(rxNo);
    toast.success('Marked collected', `${rxNo} has been collected.`);
  }

  function handleToggleHold(entry: PharmacyQueueEntry) {
    toggleHold(entry.rxNo);
    toast.info(entry.isOnHold ? 'Hold released' : 'Pickup held', `${entry.rxNo} updated.`);
  }

  function viewDetails(rxNo: string) {
    router.push(`${ROUTES.pharmacyPrescriptionDetails}?rx=${rxNo}`);
  }

  function handlePrintLabel(entry: PharmacyQueueEntry, patientName: string) {
    downloadPDF(
      `pickup-label-${entry.rxNo}`,
      `<h1>Medication Pickup Label</h1>` +
        `<p class="meta">Rx ${escapeHtml(entry.rxNo)}</p><hr />` +
        `<p><strong>Patient:</strong> ${escapeHtml(patientName)}</p>` +
        `<p><strong>Medication:</strong> ${escapeHtml(entry.medicationName)} ${escapeHtml(entry.dose)}</p>` +
        `<p><strong>Ready since:</strong> ${entry.dispensedAt ? escapeHtml(formatDateTime(entry.dispensedAt)) : '—'}</p>` +
        `<p><strong>Pickup Type:</strong> ${escapeHtml(entry.pickupType)}</p>`,
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
            Medication Pickup Queue
          </span>
        </nav>

        {/* Header */}
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1
              className="font-display font-semibold"
              style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
            >
              Medication Pickup Queue
            </h1>
            <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
              Manage and prepare medications that are ready for patient pickup.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2.5">
            <button
              type="button"
              onClick={handleRefresh}
              className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
              style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
            >
              <RefreshCw
                style={{
                  width: 15,
                  height: 15,
                  animation: refreshing ? 'spin 0.6s linear infinite' : undefined,
                }}
              />
              Refresh Queue
            </button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="mt-5 grid grid-cols-2 gap-3.5 sm:grid-cols-3 xl:grid-cols-5 xl:gap-4">
          <StatCard
            icon={Package}
            label="Ready for Pickup"
            value={readyQueue.length}
            info="Ready for collection"
            accent="#16A34A"
            iconBg="rgba(22,163,74,0.1)"
          />
          <StatCard
            icon={Calendar}
            label="Due for Pickup Today"
            value={dueTodayCount}
            info="Awaiting collection today"
            accent="#2563EB"
            iconBg="rgba(37,99,235,0.1)"
            onClick={() => {
              setStatusFilter('Ready');
              setCurrentPage(1);
            }}
          />
          <StatCard
            icon={Clock}
            label="Overdue"
            value={overdueCount}
            info="Awaiting collection"
            accent="#DC2626"
            iconBg="rgba(220,38,38,0.1)"
            onClick={() => {
              setStatusFilter('Overdue');
              setCurrentPage(1);
            }}
          />
          <StatCard
            icon={Users}
            label="Collected Today"
            value={collectedTodayCount}
            info="Completed pickups"
            accent="#7C3AED"
            iconBg="rgba(124,58,237,0.1)"
          />
          <StatCard
            icon={Repeat}
            label="Will Call / On Hold"
            value={willCallOrHoldCount}
            info="On hold / special instructions"
            accent="#D97706"
            iconBg="rgba(217,119,6,0.1)"
            onClick={() => {
              setStatusFilter('On Hold');
              setCurrentPage(1);
            }}
          />
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
                    placeholder="Search by patient name, Rx No., or phone..."
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
                  id="pickup-status-filter"
                  value={statusFilter}
                  onChange={(v) => {
                    setStatusFilter(v);
                    setCurrentPage(1);
                  }}
                  options={STATUS_OPTIONS}
                  placeholder="All Status"
                />
                <FormSelect
                  id="pickup-department-filter"
                  value={departmentFilter}
                  onChange={(v) => {
                    setDepartmentFilter(v);
                    setCurrentPage(1);
                  }}
                  options={QUEUE_DEPARTMENT_OPTIONS}
                  placeholder="All Departments"
                />
                <FormSelect
                  id="pickup-prescriber-filter"
                  value={prescriberFilter}
                  onChange={(v) => {
                    setPrescriberFilter(v);
                    setCurrentPage(1);
                  }}
                  options={QUEUE_PRESCRIBER_OPTIONS}
                  placeholder="All Prescribers"
                />
                {moreFiltersOpen && (
                  <FormSelect
                    id="pickup-type-filter"
                    value={pickupTypeFilter}
                    onChange={(v) => {
                      setPickupTypeFilter(v);
                      setCurrentPage(1);
                    }}
                    options={PICKUP_TYPE_OPTIONS}
                    placeholder="All Pickup Types"
                  />
                )}
              </div>

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

              {/* Table */}
              <div className="mt-4">
                <h2
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Pickup Queue ({filtered.length})
                </h2>
                <ScrollableTable minWidth={1120} maxHeight={640} className="mt-3">
                  <div
                    className={`flex rounded-t-[8px] ${TABLE_HEADER_STICKY_CLASS}`}
                    style={{
                      background: TABLE_HEADER_BG,
                      borderBottom: '1px solid #E6F8FD',
                    }}
                  >
                    <div className="w-28 shrink-0 py-2.5 pr-2 pl-3">
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
                    <div className="min-w-[160px] flex-1 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Medication
                      </span>
                    </div>
                    <div className="w-24 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Ready Time
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
                    <div className="w-32 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Pickup Type
                      </span>
                    </div>
                    <div className="w-44 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Notes
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
                        No pickups match your filters
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

                  {pageRows.map(({ entry, patient, status, note }) => {
                    const statusCfg = STATUS_CFG[status];
                    return (
                      <div
                        key={entry.rxNo}
                        className="flex items-center transition-colors duration-100 hover:bg-[#F5FBFD]"
                        style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                      >
                        <div className="w-28 shrink-0 py-3 pr-2 pl-3">
                          <Tooltip content={entry.rxNo}>
                            <p
                              className="truncate font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {entry.rxNo}
                            </p>
                          </Tooltip>
                        </div>
                        <div className="w-44 shrink-0 py-3 pr-2">
                          <Tooltip content={patient.name}>
                            <p
                              className="truncate font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {patient.name}
                            </p>
                          </Tooltip>
                          <Tooltip content={patient.mrn}>
                            <p className="truncate" style={{ fontSize: 14, color: '#8A98A3' }}>
                              {patient.mrn}
                            </p>
                          </Tooltip>
                        </div>
                        <div className="min-w-[160px] flex-1 py-3 pr-2">
                          <Tooltip content={`${entry.medicationName} ${entry.dose}`}>
                            <p
                              className="truncate font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {entry.medicationName} {entry.dose}
                            </p>
                          </Tooltip>
                        </div>
                        <div className="w-24 shrink-0 py-3 pr-2">
                          <p style={{ fontSize: 14, color: '#4A7080' }}>
                            {entry.dispensedAt ? formatTime(entry.dispensedAt) : '—'}
                          </p>
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
                            {status}
                          </span>
                        </div>
                        <div className="w-32 shrink-0 py-3 pr-2">
                          <Tooltip content={entry.pickupType}>
                            <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                              {entry.pickupType}
                            </p>
                          </Tooltip>
                        </div>
                        <div className="w-44 shrink-0 py-3 pr-2">
                          <Tooltip content={note}>
                            <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                              {note}
                            </p>
                          </Tooltip>
                        </div>
                        <div className="flex w-24 shrink-0 items-center justify-end gap-1 py-3 pr-3">
                          <button
                            type="button"
                            onClick={() => handlePrintLabel(entry, patient.name)}
                            aria-label={`Print pickup label for ${entry.rxNo}`}
                            className={`flex size-11 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
                          >
                            <Printer style={{ width: 15, height: 15, color: '#4A7080' }} />
                          </button>
                          <RowMenu
                            entry={entry}
                            onView={() => viewDetails(entry.rxNo)}
                            onCollect={() => handleCollect(entry.rxNo)}
                            onHold={() => handleToggleHold(entry)}
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
                  itemLabel="pickup items"
                />
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
                Pickup Queue Overview
              </h2>
              <div className="mt-3 flex items-center gap-5">
                <AnimatedDonutChart
                  breakdown={donutBreakdown}
                  total={readyQueue.length}
                  ariaLabel="Pickup queue overview donut chart"
                />
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  {donutBreakdown.map((d) => (
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
                        {d.value} (
                        {readyQueue.length > 0
                          ? Math.round((d.value / readyQueue.length) * 100)
                          : 0}
                        %)
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
              <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Next Pickup
              </h2>
              <div className="mt-3 flex flex-col gap-1">
                {firstOverdue ? (
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter('Overdue');
                      setCurrentPage(1);
                      scrollToTable();
                    }}
                    className={`flex items-start gap-2.5 rounded-[10px] p-2.5 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                  >
                    <div
                      className="flex size-9 shrink-0 items-center justify-center rounded-full font-sans text-sm font-semibold text-white"
                      style={{ background: '#DC2626' }}
                    >
                      {firstOverdue.patient.initials}
                    </div>
                    <div className="min-w-0">
                      <Tooltip
                        content={`${overdueCount} prescription ${overdueCount !== 1 ? 's' : ''} overdue`}
                      >
                        <p
                          className="truncate font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {overdueCount} prescription{overdueCount !== 1 ? 's' : ''} overdue
                        </p>
                      </Tooltip>
                      <Tooltip content={`Follow up with patients.`}>
                        <p className="truncate" style={{ fontSize: 14, color: '#8A98A3' }}>
                          Follow up with patients.
                        </p>
                      </Tooltip>
                    </div>
                  </button>
                ) : (
                  <div className="flex items-start gap-2.5 rounded-[10px] p-2.5">
                    <CheckCircle2
                      style={{ width: 18, height: 18, color: '#16A34A' }}
                      className="mt-0.5 shrink-0"
                    />
                    <p style={{ fontSize: 14, color: '#4A7080' }}>No overdue pickups.</p>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setPickupTypeFilter('Will Call');
                    setCurrentPage(1);
                    scrollToTable();
                  }}
                  className={`flex items-start gap-2.5 rounded-[10px] p-2.5 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                >
                  <div
                    className="flex size-9 shrink-0 items-center justify-center rounded-full"
                    style={{ background: 'rgba(217,119,6,0.1)' }}
                  >
                    <Info style={{ width: 16, height: 16, color: '#D97706' }} />
                  </div>
                  <div className="min-w-0">
                    <Tooltip content={`Will Call / On Hold: ${willCallOrHoldCount}`}>
                      <p
                        className="truncate font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        Will Call / On Hold: {willCallOrHoldCount}
                      </p>
                    </Tooltip>
                    <Tooltip content={`Items on hold for patient.`}>
                      <p className="truncate" style={{ fontSize: 14, color: '#8A98A3' }}>
                        Items on hold for patient.
                      </p>
                    </Tooltip>
                  </div>
                </button>
                <div className="flex items-start gap-2.5 rounded-[10px] p-2.5">
                  <div
                    className="flex size-9 shrink-0 items-center justify-center rounded-full"
                    style={{ background: 'rgba(0,180,216,0.1)' }}
                  >
                    <Clock style={{ width: 16, height: 16, color: '#00B4D8' }} />
                  </div>
                  <div className="min-w-0">
                    <Tooltip content={`Pharmacy closes at 6:00 PM`}>
                      <p
                        className="truncate font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        Pharmacy closes at 6:00 PM
                      </p>
                    </Tooltip>
                    <Tooltip content={`Plan pickups accordingly.`}>
                      <p className="truncate" style={{ fontSize: 14, color: '#8A98A3' }}>
                        Plan pickups accordingly.
                      </p>
                    </Tooltip>
                  </div>
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
            Please verify patient identity before releasing medication.
          </p>
          <button
            type="button"
            onClick={() => router.push(ROUTES.pharmacyDispensingHistory)}
            className={`flex items-center gap-1 font-sans font-medium whitespace-nowrap transition-colors duration-150 hover:underline ${FOCUS_RING}`}
            style={{ fontSize: 14, color: '#00B4D8' }}
          >
            View Dispensing History →
          </button>
        </div>

        <div className="h-4" />
      </div>
    </main>
  );
}
