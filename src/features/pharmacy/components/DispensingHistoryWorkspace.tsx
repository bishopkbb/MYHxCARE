'use client';

import {
  Calendar,
  CalendarClock,
  CalendarDays,
  Download,
  Eye,
  MoreVertical,
  Printer,
  Search,
  Users,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';

import { AnimatedDonutChart } from '@components/shared/AnimatedDonutChart';
import { FormSelect } from '@components/shared/FormSelect';
import { Pagination } from '@components/shared/Pagination';
import { RowMenuPortal } from '@components/shared/RowMenuPortal';
import {
  ScrollableTable,
  TABLE_HEADER_BG,
  TABLE_HEADER_STICKY_CLASS,
} from '@components/shared/ScrollableTable';
import { Tooltip } from '@components/shared/Tooltip';
import { StatCard } from '@components/shared/StatCard';
import { ROUTES } from '@/constants/routes';
import { useToast } from '@/hooks/useToast';
import { downloadCSV, downloadPDF, escapeHtml } from '@/utils/export';
import { formatDateTime } from '@/utils/datetime';
import { getPatientDetail } from '@/features/patients/__mocks__/patientFixtures';
import { REGISTRATION_DATE_OPTIONS } from '@/features/registration/__mocks__/patientDirectoryFixtures';
import {
  DISPENSING_STATUS_OPTIONS,
  QUEUE_DEPARTMENT_OPTIONS,
  QUEUE_PRESCRIBER_OPTIONS,
  type DispensingActivityEntry,
  type DispensingStatus,
} from '@/features/pharmacy/__mocks__/pharmacyFixtures';
import { useRecentDispensingActivity } from '@/features/pharmacy/store/pharmacyDispensingStore';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

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
}: {
  entry: DispensingActivityEntry;
  onView: () => void;
  onPrint: () => void;
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
      </RowMenuPortal>
    </div>
  );
}

export function DispensingHistoryWorkspace() {
  const router = useRouter();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [prescriberFilter, setPrescriberFilter] = useState('');
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const allActivity = useRecentDispensingActivity();

  const totalDispensed = allActivity.length;
  const dispensedToday = allActivity.filter((a) => isToday(a.dispensedAt)).length;
  const thisWeek = allActivity.filter((a) => isWithinRange(a.dispensedAt, 'this-week')).length;
  const thisMonth = allActivity.filter((a) => isWithinRange(a.dispensedAt, 'this-month')).length;
  const uniquePatients = new Set(allActivity.map((a) => a.patientId)).size;

  const statusCounts = useMemo(() => {
    const counts: Record<DispensingStatus, number> = {
      Completed: 0,
      Partial: 0,
      Returned: 0,
      Cancelled: 0,
      'Pending Approval': 0,
    };
    for (const a of allActivity) counts[a.status] += 1;
    return counts;
  }, [allActivity]);

  const donutBreakdown = (Object.keys(STATUS_CFG) as DispensingStatus[]).map((status) => ({
    label: status,
    value: statusCounts[status],
    color: STATUS_CFG[status].color,
  }));

  const topMedications = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of allActivity)
      counts.set(a.medicationName, (counts.get(a.medicationName) ?? 0) + 1);
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [allActivity]);

  const withPatient = useMemo(
    () => allActivity.map((a) => ({ activity: a, patient: getPatientDetail(a.patientId) })),
    [allActivity],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return withPatient.filter(({ activity, patient }) => {
      if (statusFilter && activity.status !== statusFilter) return false;
      if (departmentFilter && activity.department !== departmentFilter) return false;
      if (prescriberFilter && activity.doctorName !== prescriberFilter) return false;
      if (dateRange && !isWithinRange(activity.dispensedAt, dateRange)) return false;
      if (
        q &&
        !patient.name.toLowerCase().includes(q) &&
        !patient.mrn.toLowerCase().includes(q) &&
        !activity.rxNo.toLowerCase().includes(q) &&
        !activity.medicationName.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [withPatient, search, statusFilter, departmentFilter, prescriberFilter, dateRange]);

  const pageStart = (currentPage - 1) * rowsPerPage;
  const pageRows = filtered.slice(pageStart, pageStart + rowsPerPage);

  function handleClearFilters() {
    setSearch('');
    setDateRange('');
    setStatusFilter('');
    setDepartmentFilter('');
    setPrescriberFilter('');
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
        'Qty Dispensed',
        'Dispense Date & Time',
        'Prescriber',
        'Department',
        'Status',
      ],
      ...filtered.map(({ activity, patient }) => [
        activity.rxNo,
        patient.name,
        patient.mrn,
        activity.medicationName,
        `${activity.qty} ${activity.unit}${activity.qty === 1 ? '' : 's'}`,
        formatDateTime(activity.dispensedAt),
        activity.doctorName,
        activity.department,
        activity.status,
      ]),
    ];
    downloadCSV('dispensing-history', rows);
    toast.success('Export ready', `${filtered.length} records downloaded as CSV.`);
  }

  function viewDetails(rxNo: string) {
    router.push(`${ROUTES.pharmacyPrescriptionDetails}?rx=${rxNo}`);
  }

  function printReceipt(activity: DispensingActivityEntry, patientName: string) {
    downloadPDF(
      `dispensing-receipt-${activity.rxNo}`,
      `<h1>Dispensing Receipt</h1>` +
        `<p class="meta">Rx ${escapeHtml(activity.rxNo)}</p><hr />` +
        `<p><strong>Patient:</strong> ${escapeHtml(patientName)}</p>` +
        `<p><strong>Medication:</strong> ${escapeHtml(activity.medicationName)}</p>` +
        `<p><strong>Quantity:</strong> ${activity.qty} ${escapeHtml(activity.unit)}${activity.qty === 1 ? '' : 's'}</p>` +
        `<p><strong>Dispensed:</strong> ${escapeHtml(formatDateTime(activity.dispensedAt))}</p>` +
        `<p><strong>Prescriber:</strong> ${escapeHtml(activity.doctorName)} (${escapeHtml(activity.department)})</p>` +
        `<p><strong>Status:</strong> ${escapeHtml(activity.status)}</p>`,
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
            Dispensing History
          </span>
        </nav>

        {/* Header */}
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1
              className="font-display font-semibold"
              style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
            >
              Dispensing History
            </h1>
            <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
              View and search all dispensed medications and transaction history.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2.5">
            <button
              type="button"
              onClick={handleExport}
              className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
              style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
            >
              <Download style={{ width: 15, height: 15 }} />
              Export
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
              style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
            >
              <Printer style={{ width: 15, height: 15 }} />
              Print
            </button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="mt-5 grid grid-cols-2 gap-3.5 sm:grid-cols-3 xl:grid-cols-5 xl:gap-4">
          <StatCard
            icon={CalendarClock}
            label="Total Dispensed"
            value={totalDispensed}
            info="All time"
            accent="#16A34A"
            iconBg="rgba(22,163,74,0.1)"
          />
          <StatCard
            icon={Calendar}
            label="Dispensed Today"
            value={dispensedToday}
            info={formatDateTime(new Date().toISOString()).split(' ')[0] ?? 'Today'}
            accent="#2563EB"
            iconBg="rgba(37,99,235,0.1)"
            onClick={() => {
              setDateRange('today');
              setCurrentPage(1);
            }}
          />
          <StatCard
            icon={CalendarDays}
            label="This Week"
            value={thisWeek}
            info="Last 7 days"
            accent="#7C3AED"
            iconBg="rgba(124,58,237,0.1)"
            onClick={() => {
              setDateRange('this-week');
              setCurrentPage(1);
            }}
          />
          <StatCard
            icon={Calendar}
            label="This Month"
            value={thisMonth}
            info="Current month"
            accent="#D97706"
            iconBg="rgba(217,119,6,0.1)"
            onClick={() => {
              setDateRange('this-month');
              setCurrentPage(1);
            }}
          />
          <StatCard
            icon={Users}
            label="Unique Patients"
            value={uniquePatients}
            info="All time"
            accent="#00B4D8"
            iconBg="rgba(0,180,216,0.1)"
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
                  id="history-date-range"
                  value={dateRange}
                  onChange={(v) => {
                    setDateRange(v);
                    setCurrentPage(1);
                  }}
                  options={REGISTRATION_DATE_OPTIONS}
                  placeholder="All Dates"
                />
                <FormSelect
                  id="history-status-filter"
                  value={statusFilter}
                  onChange={(v) => {
                    setStatusFilter(v);
                    setCurrentPage(1);
                  }}
                  options={DISPENSING_STATUS_OPTIONS}
                  placeholder="All Statuses"
                />
                <FormSelect
                  id="history-department-filter"
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
                    id="history-prescriber-filter"
                    value={prescriberFilter}
                    onChange={(v) => {
                      setPrescriberFilter(v);
                      setCurrentPage(1);
                    }}
                    options={QUEUE_PRESCRIBER_OPTIONS}
                    placeholder="All Prescribers"
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
                  Dispensing Records ({filtered.length})
                </h2>
                <ScrollableTable minWidth={1260} maxHeight={640} className="mt-3">
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
                    <div className="w-32 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Qty Dispensed
                      </span>
                    </div>
                    <div className="w-36 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Dispense Date
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
                    <div className="w-32 shrink-0 py-2.5 pr-2">
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
                        <CalendarClock style={{ width: 24, height: 24, color: '#8A98A3' }} />
                      </div>
                      <p
                        className="font-sans font-medium"
                        style={{ fontSize: 16, color: '#4A7080' }}
                      >
                        No dispensing records match your filters
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
                    return (
                      <div
                        key={activity.id}
                        className="flex items-center transition-colors duration-100 hover:bg-[#F5FBFD]"
                        style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                      >
                        <div className="w-28 shrink-0 py-3 pr-2 pl-3">
                          <Tooltip content={activity.rxNo}>
                            <p
                              className="truncate font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {activity.rxNo}
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
                          <Tooltip content={activity.medicationName}>
                            <p
                              className="truncate font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {activity.medicationName}
                            </p>
                          </Tooltip>
                        </div>
                        <div className="w-32 shrink-0 py-3 pr-2">
                          <p style={{ fontSize: 14, color: '#4A7080' }}>
                            {activity.qty} {activity.unit}
                            {activity.qty === 1 ? '' : 's'}
                          </p>
                        </div>
                        <div className="w-36 shrink-0 py-3 pr-2">
                          <p style={{ fontSize: 14, color: '#4A7080' }}>
                            {formatDateTime(activity.dispensedAt)}
                          </p>
                        </div>
                        <div className="w-40 shrink-0 py-3 pr-2">
                          <Tooltip content={activity.doctorName}>
                            <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                              {activity.doctorName}
                            </p>
                          </Tooltip>
                        </div>
                        <div className="w-36 shrink-0 py-3 pr-2">
                          <Tooltip content={activity.department}>
                            <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                              {activity.department}
                            </p>
                          </Tooltip>
                        </div>
                        <div className="w-32 shrink-0 py-3 pr-2">
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
                Dispensing Overview
              </h2>
              <div className="mt-3 flex items-center gap-5">
                <AnimatedDonutChart
                  breakdown={donutBreakdown}
                  total={totalDispensed}
                  ariaLabel="Dispensing overview donut chart"
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
                        {totalDispensed > 0 ? Math.round((d.value / totalDispensed) * 100) : 0}%)
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
                Top Medications Dispensed
              </h2>
              <div className="mt-3 flex flex-col gap-2.5">
                {topMedications.map(([name, count], i) => (
                  <div key={name} className="flex items-center gap-2.5">
                    <div
                      className="flex size-6 shrink-0 items-center justify-center rounded-full font-sans font-semibold"
                      style={{ fontSize: 14, background: 'rgba(0,180,216,0.1)', color: '#00B4D8' }}
                    >
                      {i + 1}
                    </div>
                    <Tooltip content={name}>
                      <p
                        className="min-w-0 flex-1 truncate"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {name}
                      </p>
                    </Tooltip>
                    <span
                      className="shrink-0 font-sans font-medium"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      {count}
                    </span>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => router.push(ROUTES.pharmacyInventory)}
                className={`mt-3.5 flex items-center gap-1 font-sans font-medium transition-colors duration-150 hover:underline ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#00B4D8' }}
              >
                View All Medications →
              </button>
            </div>

            <div
              className="rounded-[12px] p-4"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Quick Links
              </h2>
              <div className="mt-3 flex flex-col gap-1">
                {[
                  { label: 'Prescription Queue', href: ROUTES.pharmacyPrescriptionQueue },
                  { label: 'Active Prescriptions', href: ROUTES.pharmacyActivePrescriptions },
                  { label: 'Medication Returns', href: ROUTES.pharmacyMedicationReturns },
                  { label: 'Dispensing Audit Trail', href: ROUTES.pharmacyAuditTrail },
                ].map((link) => (
                  <button
                    key={link.href}
                    type="button"
                    onClick={() => router.push(link.href)}
                    className={`flex items-center justify-between gap-2 rounded-[8px] px-2.5 py-2.5 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                  >
                    <span style={{ fontSize: 14, color: '#0D2630' }}>{link.label}</span>
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
          style={{ background: 'rgba(0,180,216,0.06)', border: '1px solid rgba(0,180,216,0.25)' }}
        >
          <p style={{ fontSize: 14, color: '#0D2630' }}>
            All times shown are in West Africa Time (WAT). Ensure records are accurate and follow
            regulatory guidelines.
          </p>
        </div>

        <div className="h-4" />
      </div>
    </main>
  );
}
