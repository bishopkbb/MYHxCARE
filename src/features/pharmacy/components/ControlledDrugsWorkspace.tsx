'use client';

import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  MoreVertical,
  Package,
  Search,
  ShieldAlert,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';

import { AnimatedDonutChart } from '@components/shared/AnimatedDonutChart';
import { FormSelect } from '@components/shared/FormSelect';
import { Pagination } from '@components/shared/Pagination';
import { PermissionGate } from '@components/shared/PermissionGate';
import { RowMenuPortal } from '@components/shared/RowMenuPortal';
import { StatCard } from '@components/shared/StatCard';
import { PERMISSIONS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { downloadCSV, downloadPDF, escapeHtml } from '@/utils/export';
import { formatDateTime } from '@/utils/datetime';
import { getPatientDetail } from '@/features/patients/__mocks__/patientFixtures';
import { REGISTRATION_DATE_OPTIONS } from '@/features/registration/__mocks__/patientDirectoryFixtures';
import {
  CONTROLLED_SCHEDULE_OPTIONS,
  DISPENSING_STATUS_OPTIONS,
  DRUG_INVENTORY,
  getExpiringBatches,
  QUEUE_DEPARTMENT_OPTIONS,
  type ControlledSchedule,
  type DispensingActivityEntry,
  type DispensingStatus,
} from '@/features/pharmacy/__mocks__/pharmacyFixtures';
import {
  approveControlledDispenseRecord,
  useRecentDispensingActivity,
} from '@/features/pharmacy/store/pharmacyDispensingStore';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const SCHEDULE_CFG: Record<ControlledSchedule, { color: string; border: string; bg: string }> = {
  'C-II': { color: '#DC2626', border: 'rgba(220,38,38,0.35)', bg: 'rgba(220,38,38,0.08)' },
  'C-III': { color: '#D97706', border: 'rgba(217,119,6,0.35)', bg: 'rgba(217,119,6,0.08)' },
  'C-IV': { color: '#7C3AED', border: 'rgba(124,58,237,0.35)', bg: 'rgba(124,58,237,0.08)' },
  'C-V': { color: '#2563EB', border: 'rgba(37,99,235,0.35)', bg: 'rgba(37,99,235,0.08)' },
};

const STATUS_CFG: Record<DispensingStatus, { color: string; border: string; bg: string }> = {
  Completed: { color: '#16A34A', border: 'rgba(22,163,74,0.35)', bg: 'rgba(22,163,74,0.08)' },
  Partial: { color: '#D97706', border: 'rgba(217,119,6,0.35)', bg: 'rgba(217,119,6,0.08)' },
  Returned: { color: '#2563EB', border: 'rgba(37,99,235,0.35)', bg: 'rgba(37,99,235,0.08)' },
  Cancelled: { color: '#64748B', border: 'rgba(100,116,139,0.35)', bg: 'rgba(100,116,139,0.08)' },
  'Pending Approval': {
    color: '#7C3AED',
    border: 'rgba(124,58,237,0.35)',
    bg: 'rgba(124,58,237,0.08)',
  },
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

function isToday(iso: string): boolean {
  return isWithinRange(iso, 'today');
}

function RowMenu({
  entry,
  onView,
  onPrint,
  onApprove,
}: {
  entry: DispensingActivityEntry;
  onView: () => void;
  onPrint: () => void;
  onApprove: () => void;
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
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            onPrint();
          }}
          className="flex w-full items-center px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD]"
          style={{ fontSize: 14, color: '#2F3A40' }}
        >
          Print Receipt
        </button>
        {entry.status === 'Pending Approval' && (
          <PermissionGate permission={PERMISSIONS.PHARMACY_DISPENSE}>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onApprove();
              }}
              className="flex w-full items-center px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[rgba(22,163,74,0.06)]"
              style={{ fontSize: 14, color: '#16A34A' }}
            >
              Approve Record
            </button>
          </PermissionGate>
        )}
      </RowMenuPortal>
    </div>
  );
}

export function ControlledDrugsWorkspace() {
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const actorName = user?.name ?? 'Pharmacist';

  const [search, setSearch] = useState('');
  const [scheduleFilter, setScheduleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [dateRange, setDateRange] = useState('');
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const allActivity = useRecentDispensingActivity();
  const controlledActivity = useMemo(
    () =>
      allActivity.filter(
        (a): a is DispensingActivityEntry & { controlledSchedule: ControlledSchedule } =>
          Boolean(a.controlledSchedule),
      ),
    [allActivity],
  );

  const controlledInventory = useMemo(() => DRUG_INVENTORY.filter((d) => d.controlledSchedule), []);
  const lowStockItems = useMemo(
    () => controlledInventory.filter((d) => d.currentStock <= d.reorderLevel),
    [controlledInventory],
  );
  const expiringBatches = useMemo(
    () => getExpiringBatches(30).filter((row) => row.item.controlledSchedule),
    [],
  );

  const totalControlled = controlledActivity.length;
  const dispensedToday = controlledActivity.filter((a) => isToday(a.dispensedAt)).length;
  const pendingApprovals = controlledActivity.filter((a) => a.status === 'Pending Approval').length;

  const scheduleCounts = useMemo(() => {
    const counts: Record<ControlledSchedule, number> = {
      'C-II': 0,
      'C-III': 0,
      'C-IV': 0,
      'C-V': 0,
    };
    for (const a of controlledActivity) counts[a.controlledSchedule] += 1;
    return counts;
  }, [controlledActivity]);

  const donutBreakdown = (Object.keys(SCHEDULE_CFG) as ControlledSchedule[]).map((schedule) => ({
    label: schedule,
    value: scheduleCounts[schedule],
    color: SCHEDULE_CFG[schedule].color,
  }));

  const withPatient = useMemo(
    () => controlledActivity.map((a) => ({ activity: a, patient: getPatientDetail(a.patientId) })),
    [controlledActivity],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return withPatient.filter(({ activity, patient }) => {
      if (scheduleFilter && activity.controlledSchedule !== scheduleFilter) return false;
      if (statusFilter && activity.status !== statusFilter) return false;
      if (departmentFilter && activity.department !== departmentFilter) return false;
      if (dateRange && !isWithinRange(activity.dispensedAt, dateRange)) return false;
      if (
        q &&
        !patient.name.toLowerCase().includes(q) &&
        !activity.rxNo.toLowerCase().includes(q) &&
        !activity.medicationName.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [withPatient, search, scheduleFilter, statusFilter, departmentFilter, dateRange]);

  const pageStart = (currentPage - 1) * rowsPerPage;
  const pageRows = filtered.slice(pageStart, pageStart + rowsPerPage);

  function handleClearFilters() {
    setSearch('');
    setScheduleFilter('');
    setStatusFilter('');
    setDepartmentFilter('');
    setDateRange('');
    setCurrentPage(1);
  }

  function handleApplyFilters() {
    toast.success(
      'Filters applied',
      `${filtered.length} record${filtered.length !== 1 ? 's' : ''} match your filters.`,
    );
  }

  function handleExport() {
    const rows = [
      [
        'Rx No.',
        'Patient',
        'MRN',
        'Medication',
        'Schedule',
        'Qty Dispensed',
        'Dispensed On',
        'Prescriber',
        'Department',
        'Status',
      ],
      ...filtered.map(({ activity, patient }) => [
        activity.rxNo,
        patient.name,
        patient.mrn,
        activity.medicationName,
        activity.controlledSchedule,
        `${activity.qty} ${activity.unit}${activity.qty === 1 ? '' : 's'}`,
        formatDateTime(activity.dispensedAt),
        activity.doctorName,
        activity.department,
        activity.status,
      ]),
    ];
    downloadCSV('controlled-drugs-report', rows);
    toast.success('Export ready', `${filtered.length} records downloaded as CSV.`);
  }

  function viewDetails(rxNo: string) {
    router.push(`${ROUTES.pharmacyPrescriptionDetails}?rx=${rxNo}`);
  }

  function printReceipt(activity: DispensingActivityEntry, patientName: string) {
    downloadPDF(
      `controlled-drug-receipt-${activity.rxNo}`,
      `<h1>Controlled Drug Dispensing Receipt</h1>` +
        `<p class="meta">Rx ${escapeHtml(activity.rxNo)} — Schedule ${escapeHtml(activity.controlledSchedule ?? '')}</p><hr />` +
        `<p><strong>Patient:</strong> ${escapeHtml(patientName)}</p>` +
        `<p><strong>Medication:</strong> ${escapeHtml(activity.medicationName)}</p>` +
        `<p><strong>Quantity:</strong> ${activity.qty} ${escapeHtml(activity.unit)}${activity.qty === 1 ? '' : 's'}</p>` +
        `<p><strong>Dispensed:</strong> ${escapeHtml(formatDateTime(activity.dispensedAt))}</p>` +
        `<p><strong>Prescriber:</strong> ${escapeHtml(activity.doctorName)} (${escapeHtml(activity.department)})</p>` +
        `<p><strong>Status:</strong> ${escapeHtml(activity.status)}</p>` +
        `<p><strong>Countersigned by:</strong> ${escapeHtml(activity.approvedBy ?? 'Pending')}</p>`,
    );
  }

  function handleApprove(activity: DispensingActivityEntry) {
    approveControlledDispenseRecord(activity.id, actorName);
    toast.success('Record approved', `${activity.rxNo} countersigned and marked Completed.`);
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
          <span style={{ fontSize: 14, color: '#8A98A3' }}>Clinical Pharmacy</span>
          <span style={{ fontSize: 14, color: '#8A98A3' }}>/</span>
          <span className="font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
            Controlled Drugs
          </span>
        </nav>

        {/* Header */}
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1
              className="font-display font-semibold"
              style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
            >
              Controlled Drugs
            </h1>
            <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
              Monitor and audit controlled-substance dispensing, stock, and expiry.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2.5">
            <button
              type="button"
              onClick={() => router.push(ROUTES.pharmacyAuditTrail)}
              className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
              style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
            >
              <ShieldAlert style={{ width: 15, height: 15 }} />
              Audit Trail
            </button>
            <button
              type="button"
              onClick={handleExport}
              className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
              style={{ fontSize: 14, background: '#00B4D8' }}
            >
              <Download style={{ width: 15, height: 15 }} />
              Export Report
            </button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="mt-5 grid grid-cols-2 gap-3.5 sm:grid-cols-3 xl:grid-cols-5 xl:gap-4">
          <StatCard
            icon={Package}
            label="Total Controlled Dispenses"
            value={totalControlled}
            info="Full log"
            accent="#0D2630"
            iconBg="rgba(13,38,48,0.08)"
          />
          <StatCard
            icon={CheckCircle2}
            label="Dispensed Today"
            value={dispensedToday}
            info="Since midnight WAT"
            accent="#16A34A"
            iconBg="rgba(22,163,74,0.1)"
            onClick={() => {
              setDateRange('today');
              setCurrentPage(1);
            }}
          />
          <StatCard
            icon={AlertTriangle}
            label="Low Stock Alerts"
            value={lowStockItems.length}
            info="At or below reorder level"
            accent="#D97706"
            iconBg="rgba(217,119,6,0.1)"
          />
          <StatCard
            icon={Clock}
            label="Pending Approvals"
            value={pendingApprovals}
            info="Needs countersignature"
            accent="#7C3AED"
            iconBg="rgba(124,58,237,0.1)"
            onClick={() => {
              setStatusFilter('Pending Approval');
              setCurrentPage(1);
            }}
          />
          <StatCard
            icon={CalendarClock}
            label="Expiring Soon"
            value={expiringBatches.length}
            info="Within 30 days"
            accent="#DC2626"
            iconBg="rgba(220,38,38,0.1)"
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
                    placeholder="Search by patient name, Rx No., or medication..."
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
                  id="controlled-schedule-filter"
                  value={scheduleFilter}
                  onChange={(v) => {
                    setScheduleFilter(v);
                    setCurrentPage(1);
                  }}
                  options={CONTROLLED_SCHEDULE_OPTIONS}
                  placeholder="All Schedules"
                />
                <FormSelect
                  id="controlled-status-filter"
                  value={statusFilter}
                  onChange={(v) => {
                    setStatusFilter(v);
                    setCurrentPage(1);
                  }}
                  options={DISPENSING_STATUS_OPTIONS}
                  placeholder="All Statuses"
                />
                <FormSelect
                  id="controlled-department-filter"
                  value={departmentFilter}
                  onChange={(v) => {
                    setDepartmentFilter(v);
                    setCurrentPage(1);
                  }}
                  options={QUEUE_DEPARTMENT_OPTIONS}
                  placeholder="All Departments"
                />
                {moreFiltersOpen && (
                  <FormSelect
                    id="controlled-date-filter"
                    value={dateRange}
                    onChange={(v) => {
                      setDateRange(v);
                      setCurrentPage(1);
                    }}
                    options={REGISTRATION_DATE_OPTIONS}
                    placeholder="All Dates"
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
                  Controlled Drugs List ({filtered.length})
                </h2>
                <div className="mt-3 overflow-x-auto scroll-smooth">
                  <div style={{ minWidth: 1320 }}>
                    <div
                      className="flex rounded-t-[8px]"
                      style={{
                        background: 'rgba(226,237,241,0.4)',
                        borderBottom: '1px solid #E6F8FD',
                      }}
                    >
                      <div className="w-36 shrink-0 py-2.5 pr-2 pl-3">
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
                      <div className="min-w-[170px] flex-1 py-2.5 pr-2">
                        <span
                          className="font-sans font-bold tracking-wider uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Medication
                        </span>
                      </div>
                      <div className="w-28 shrink-0 py-2.5 pr-2">
                        <span
                          className="font-sans font-bold tracking-wider uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Schedule
                        </span>
                      </div>
                      <div className="w-28 shrink-0 py-2.5 pr-2">
                        <span
                          className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Qty
                        </span>
                      </div>
                      <div className="w-36 shrink-0 py-2.5 pr-2">
                        <span
                          className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Dispensed On
                        </span>
                      </div>
                      <div className="w-40 shrink-0 py-2.5 pr-2">
                        <span
                          className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Prescriber
                        </span>
                      </div>
                      <div className="w-40 shrink-0 py-2.5 pr-2">
                        <span
                          className="font-sans font-bold tracking-wider uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Status
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
                          No controlled-drug records match your filters
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

                    {pageRows.map(({ activity, patient }) => {
                      const statusCfg = STATUS_CFG[activity.status];
                      const scheduleCfg = SCHEDULE_CFG[activity.controlledSchedule];
                      return (
                        <div
                          key={activity.id}
                          className="flex items-center transition-colors duration-100 hover:bg-[#F5FBFD]"
                          style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                        >
                          <div className="w-36 shrink-0 py-3 pr-2 pl-3">
                            <p
                              className="truncate font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {activity.rxNo}
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
                          <div className="min-w-[170px] flex-1 py-3 pr-2">
                            <p
                              className="truncate font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {activity.medicationName}
                            </p>
                            <p style={{ fontSize: 14, color: '#8A98A3' }}>{activity.dose}</p>
                          </div>
                          <div className="w-28 shrink-0 py-3 pr-2">
                            <span
                              className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium"
                              style={{
                                fontSize: 14,
                                whiteSpace: 'nowrap',
                                color: scheduleCfg.color,
                                border: `1px solid ${scheduleCfg.border}`,
                                background: scheduleCfg.bg,
                              }}
                            >
                              {activity.controlledSchedule}
                            </span>
                          </div>
                          <div className="w-28 shrink-0 py-3 pr-2">
                            <p style={{ fontSize: 14, color: '#0D2630' }}>
                              {activity.qty} {activity.unit}
                              {activity.qty === 1 ? '' : 's'}
                            </p>
                          </div>
                          <div className="w-36 shrink-0 py-3 pr-2">
                            <p style={{ fontSize: 14, color: '#0D2630' }}>
                              {formatDateTime(activity.dispensedAt)}
                            </p>
                          </div>
                          <div className="w-40 shrink-0 py-3 pr-2">
                            <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                              {activity.doctorName}
                            </p>
                            <p className="truncate" style={{ fontSize: 14, color: '#8A98A3' }}>
                              {activity.department}
                            </p>
                          </div>
                          <div className="w-40 shrink-0 py-3 pr-2">
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
                              {activity.status}
                            </span>
                          </div>
                          <div className="flex w-24 shrink-0 items-center justify-end gap-1 py-3 pr-3">
                            <button
                              type="button"
                              onClick={() => viewDetails(activity.rxNo)}
                              aria-label={`View ${activity.rxNo}`}
                              className={`flex size-11 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
                            >
                              <Eye style={{ width: 15, height: 15, color: '#4A7080' }} />
                            </button>
                            <RowMenu
                              entry={activity}
                              onView={() => viewDetails(activity.rxNo)}
                              onPrint={() => printReceipt(activity, patient.name)}
                              onApprove={() => handleApprove(activity)}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <Pagination
                  page={currentPage}
                  pageSize={rowsPerPage}
                  totalItems={filtered.length}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={(size) => {
                    setRowsPerPage(size);
                    setCurrentPage(1);
                  }}
                  itemLabel="records"
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
                Controlled Drugs Overview
              </h2>
              <div className="mt-3 flex items-center gap-5">
                <AnimatedDonutChart
                  breakdown={donutBreakdown}
                  total={totalControlled}
                  ariaLabel="Controlled drugs overview donut chart, by schedule"
                />
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  {donutBreakdown.map((d) => (
                    <div key={d.label} className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <span
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ background: d.color }}
                        />
                        <span className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                          Schedule {d.label.replace('C-', '')}
                        </span>
                      </div>
                      <span
                        className="shrink-0 font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {d.value} (
                        {totalControlled > 0 ? Math.round((d.value / totalControlled) * 100) : 0}
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
                Low Stock Alerts
              </h2>
              {lowStockItems.length === 0 ? (
                <p className="mt-3" style={{ fontSize: 14, color: '#8A98A3' }}>
                  No controlled items below reorder level.
                </p>
              ) : (
                <div className="mt-3 flex flex-col gap-3">
                  {lowStockItems.map((item) => (
                    <div key={item.id} className="flex items-start gap-2.5">
                      <AlertTriangle
                        className="mt-0.5 shrink-0"
                        style={{ width: 16, height: 16, color: '#D97706' }}
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className="truncate font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {item.name}
                        </p>
                        <p style={{ fontSize: 14, color: '#8A98A3' }}>
                          {item.currentStock} {item.unit}
                          {item.currentStock === 1 ? '' : 's'} left · reorder at {item.reorderLevel}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {expiringBatches.length > 0 && (
              <div
                className="rounded-[12px] p-4"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <h2
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Expiring Soon
                </h2>
                <div className="mt-3 flex flex-col gap-3">
                  {expiringBatches.map((row) => (
                    <div key={row.batch.batchNo} className="flex items-start gap-2.5">
                      <CalendarClock
                        className="mt-0.5 shrink-0"
                        style={{ width: 16, height: 16, color: '#DC2626' }}
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className="truncate font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {row.item.name}
                        </p>
                        <p style={{ fontSize: 14, color: '#8A98A3' }}>
                          Batch {row.batch.batchNo} — {row.daysLeft} day
                          {row.daysLeft === 1 ? '' : 's'} left
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div
              className="rounded-[12px] p-4"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Quick Actions
              </h2>
              <div className="mt-3 flex flex-col gap-1">
                {[
                  {
                    icon: Package,
                    label: 'Add Stock Entry',
                    href: ROUTES.pharmacyStockReceiving,
                  },
                  {
                    icon: Clock,
                    label: 'Stock Adjustment',
                    href: ROUTES.pharmacyStockAdjustments,
                  },
                  {
                    icon: ShieldAlert,
                    label: 'Manage Drug Schedules',
                    href: ROUTES.pharmacyBatchManagement,
                  },
                ].map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    onClick={() => router.push(action.href)}
                    className={`flex items-center justify-between gap-2 rounded-[8px] px-2.5 py-2.5 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                  >
                    <span className="flex items-center gap-2.5">
                      <action.icon style={{ width: 16, height: 16, color: '#00B4D8' }} />
                      <span style={{ fontSize: 14, color: '#0D2630' }}>{action.label}</span>
                    </span>
                    <span style={{ fontSize: 14, color: '#00B4D8' }}>→</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer safety banner */}
        <div
          className="mt-5 flex items-start gap-2.5 rounded-[12px] p-4"
          style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.25)' }}
        >
          <ShieldAlert
            style={{ width: 18, height: 18, color: '#DC2626' }}
            className="mt-0.5 shrink-0"
          />
          <p style={{ fontSize: 14, color: '#0D2630' }}>
            Controlled substances require a two-pharmacist countersignature and full batch
            traceability. Report any discrepancy immediately through the Audit Trail.
          </p>
        </div>

        <div className="h-4" />
      </div>
    </main>
  );
}
