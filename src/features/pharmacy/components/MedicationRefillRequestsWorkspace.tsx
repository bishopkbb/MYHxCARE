'use client';

import {
  CheckCircle2,
  Clock,
  FileText,
  Lightbulb,
  MoreVertical,
  Package,
  Search,
  Users,
  XCircle,
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
import { formatDate, formatDateTime, toRelativeTime } from '@/utils/datetime';
import { getPatientDetail } from '@/features/patients/__mocks__/patientFixtures';
import { REGISTRATION_DATE_OPTIONS } from '@/features/registration/__mocks__/patientDirectoryFixtures';
import {
  QUEUE_DEPARTMENT_OPTIONS,
  REFILL_STATUS_OPTIONS,
  type RefillRequest,
  type RefillRequestStatus,
} from '@/features/pharmacy/__mocks__/pharmacyFixtures';
import {
  approveRefillRequest,
  denyRefillRequest,
  reconsiderRefillRequest,
  revokeRefillApproval,
  useRefillRequests,
} from '@/features/pharmacy/store/refillRequestStore';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const STATUS_CFG: Record<RefillRequestStatus, { color: string; border: string; bg: string }> = {
  'Pending Review': {
    color: '#D97706',
    border: 'rgba(217,119,6,0.35)',
    bg: 'rgba(217,119,6,0.08)',
  },
  Approved: { color: '#16A34A', border: 'rgba(22,163,74,0.35)', bg: 'rgba(22,163,74,0.08)' },
  Dispensed: { color: '#2563EB', border: 'rgba(37,99,235,0.35)', bg: 'rgba(37,99,235,0.08)' },
  Denied: { color: '#DC2626', border: 'rgba(220,38,38,0.35)', bg: 'rgba(220,38,38,0.08)' },
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

function requestedByLabel(req: RefillRequest): string {
  if (req.source === 'Doctor') return `Doctor (${req.requestedByDoctorName ?? 'Prescriber'})`;
  if (req.source === 'Patient Portal') return 'Patient (Portal)';
  if (req.source === 'Mobile App') return 'Patient (App)';
  if (req.source === 'Phone') return 'Patient (Phone)';
  return 'Patient (Walk-in)';
}

function RowMenu({
  req,
  onView,
  onApprove,
  onDeny,
  onRevoke,
  onReconsider,
  onViewLinkedRx,
}: {
  req: RefillRequest;
  onView: () => void;
  onApprove: () => void;
  onDeny: () => void;
  onRevoke: () => void;
  onReconsider: () => void;
  onViewLinkedRx: () => void;
}) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`More actions for ${req.id}`}
        className={`flex size-11 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
      >
        <MoreVertical style={{ width: 15, height: 15, color: '#4A7080' }} />
      </button>
      <RowMenuPortal open={open} anchorRef={buttonRef} onClose={() => setOpen(false)} width={220}>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            onView();
          }}
          className="flex w-full items-center px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD]"
          style={{ fontSize: 14, color: '#2F3A40' }}
        >
          View Patient Profile
        </button>
        {req.linkedRxNo && (
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onViewLinkedRx();
            }}
            className="flex w-full items-center px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD]"
            style={{ fontSize: 14, color: '#2F3A40' }}
          >
            View Linked Prescription
          </button>
        )}
        {req.status === 'Pending Review' && (
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
              Approve Request
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onDeny();
              }}
              className="flex w-full items-center px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[rgba(220,38,38,0.06)]"
              style={{ fontSize: 14, color: '#DC2626' }}
            >
              Deny Request
            </button>
          </PermissionGate>
        )}
        {req.status === 'Approved' && (
          <PermissionGate permission={PERMISSIONS.PHARMACY_DISPENSE}>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onRevoke();
              }}
              className="flex w-full items-center px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[rgba(220,38,38,0.06)]"
              style={{ fontSize: 14, color: '#DC2626' }}
            >
              Revoke Approval
            </button>
          </PermissionGate>
        )}
        {req.status === 'Denied' && (
          <PermissionGate permission={PERMISSIONS.PHARMACY_DISPENSE}>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onReconsider();
              }}
              className="flex w-full items-center px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[rgba(0,180,216,0.06)]"
              style={{ fontSize: 14, color: '#00B4D8' }}
            >
              Reconsider Request
            </button>
          </PermissionGate>
        )}
      </RowMenuPortal>
    </div>
  );
}

export function MedicationRefillRequestsWorkspace() {
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const actorName = user?.name ?? 'Pharmacist';

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [dateRange, setDateRange] = useState('');
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const requests = useRefillRequests();

  const pendingCount = requests.filter((r) => r.status === 'Pending Review').length;
  const approvedCount = requests.filter((r) => r.status === 'Approved').length;
  const dispensedCount = requests.filter((r) => r.status === 'Dispensed').length;
  const deniedCount = requests.filter((r) => r.status === 'Denied').length;

  const donutBreakdown = [
    { label: 'Pending Review', value: pendingCount, color: STATUS_CFG['Pending Review'].color },
    { label: 'Approved', value: approvedCount, color: STATUS_CFG.Approved.color },
    { label: 'Dispensed', value: dispensedCount, color: STATUS_CFG.Dispensed.color },
    { label: 'Denied', value: deniedCount, color: STATUS_CFG.Denied.color },
  ];

  const sourceCounts = useMemo(() => {
    const counts = { 'Patient Portal': 0, 'Mobile App': 0, Doctor: 0, 'Walk-in / Phone': 0 };
    for (const r of requests) {
      if (r.source === 'Patient Portal') counts['Patient Portal'] += 1;
      else if (r.source === 'Mobile App') counts['Mobile App'] += 1;
      else if (r.source === 'Doctor') counts.Doctor += 1;
      else counts['Walk-in / Phone'] += 1;
    }
    return counts;
  }, [requests]);

  const withPatient = useMemo(
    () => requests.map((r) => ({ request: r, patient: getPatientDetail(r.patientId) })),
    [requests],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return withPatient.filter(({ request, patient }) => {
      if (statusFilter && request.status !== statusFilter) return false;
      if (departmentFilter && request.department !== departmentFilter) return false;
      if (dateRange && !isWithinRange(request.requestedAt, dateRange)) return false;
      if (
        q &&
        !patient.name.toLowerCase().includes(q) &&
        !request.id.toLowerCase().includes(q) &&
        !request.medicationName.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [withPatient, search, statusFilter, departmentFilter, dateRange]);

  const pageStart = (currentPage - 1) * rowsPerPage;
  const pageRows = filtered.slice(pageStart, pageStart + rowsPerPage);

  function handleClearFilters() {
    setSearch('');
    setStatusFilter('');
    setDepartmentFilter('');
    setDateRange('');
    setCurrentPage(1);
  }

  function handleApplyFilters() {
    toast.success(
      'Filters applied',
      `${filtered.length} request${filtered.length !== 1 ? 's' : ''} match your filters.`,
    );
  }

  function handleApprove(req: RefillRequest) {
    const rxNo = approveRefillRequest(req.id, actorName);
    if (rxNo) {
      toast.success('Refill approved', `${req.id} added to the Prescription Queue as ${rxNo}.`);
    }
  }

  function handleDeny(req: RefillRequest) {
    denyRefillRequest(req.id);
    toast.info('Refill denied', `${req.id} has been denied.`);
  }

  function handleRevoke(req: RefillRequest) {
    revokeRefillApproval(req.id);
    toast.info('Approval revoked', `${req.id} is back to Pending Review.`);
  }

  function handleReconsider(req: RefillRequest) {
    reconsiderRefillRequest(req.id);
    toast.info('Request reopened', `${req.id} is back to Pending Review.`);
  }

  function viewPatient(patientId: string) {
    router.push(`/patients/${patientId}`);
  }

  function viewLinkedRx(rxNo: string) {
    router.push(`${ROUTES.pharmacyPrescriptionDetails}?rx=${rxNo}`);
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
            Medication Refill Requests
          </span>
        </nav>

        <div className="mt-2">
          <h1
            className="font-display font-semibold"
            style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
          >
            Medication Refill Requests
          </h1>
          <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
            Review and manage patient medication refill requests.
          </p>
        </div>

        {/* Stat cards */}
        <div className="mt-5 grid grid-cols-2 gap-3.5 sm:grid-cols-3 xl:grid-cols-5 xl:gap-4">
          <StatCard
            icon={FileText}
            label="Total Requests"
            value={requests.length}
            info="All time"
            accent="#16A34A"
            iconBg="rgba(22,163,74,0.1)"
          />
          <StatCard
            icon={Clock}
            label="Pending Review"
            value={pendingCount}
            info="Requires your action"
            accent="#D97706"
            iconBg="rgba(217,119,6,0.1)"
            onClick={() => {
              setStatusFilter('Pending Review');
              setCurrentPage(1);
            }}
          />
          <StatCard
            icon={CheckCircle2}
            label="Approved"
            value={approvedCount}
            info="Ready for dispensing"
            accent="#16A34A"
            iconBg="rgba(22,163,74,0.1)"
            onClick={() => {
              setStatusFilter('Approved');
              setCurrentPage(1);
            }}
          />
          <StatCard
            icon={Package}
            label="Dispensed"
            value={dispensedCount}
            info="Completed"
            accent="#2563EB"
            iconBg="rgba(37,99,235,0.1)"
            onClick={() => {
              setStatusFilter('Dispensed');
              setCurrentPage(1);
            }}
          />
          <StatCard
            icon={XCircle}
            label="Denied"
            value={deniedCount}
            info="Not approved"
            accent="#DC2626"
            iconBg="rgba(220,38,38,0.1)"
            onClick={() => {
              setStatusFilter('Denied');
              setCurrentPage(1);
            }}
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

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <FormSelect
                  id="refill-status-filter"
                  value={statusFilter}
                  onChange={(v) => {
                    setStatusFilter(v);
                    setCurrentPage(1);
                  }}
                  options={REFILL_STATUS_OPTIONS}
                  placeholder="All Statuses"
                />
                <FormSelect
                  id="refill-department-filter"
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
                    id="refill-date-filter"
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
                  Refill Requests ({filtered.length})
                </h2>
                <div className="mt-3 overflow-x-auto scroll-smooth">
                  <div style={{ minWidth: 1240 }}>
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
                          Request ID
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
                      <div className="w-28 shrink-0 py-2.5 pr-2">
                        <span
                          className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Last Filled
                        </span>
                      </div>
                      <div className="w-36 shrink-0 py-2.5 pr-2">
                        <span
                          className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Requested On
                        </span>
                      </div>
                      <div className="w-36 shrink-0 py-2.5 pr-2">
                        <span
                          className="font-sans font-bold tracking-wider uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Status
                        </span>
                      </div>
                      <div className="w-40 shrink-0 py-2.5 pr-2">
                        <span
                          className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Requested By
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
                          No refill requests match your filters
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

                    {pageRows.map(({ request, patient }) => {
                      const statusCfg = STATUS_CFG[request.status];
                      return (
                        <div
                          key={request.id}
                          className="flex items-center transition-colors duration-100 hover:bg-[#F5FBFD]"
                          style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                        >
                          <div className="w-32 shrink-0 py-3 pr-2 pl-3">
                            <p
                              className="truncate font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {request.id}
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
                          <div className="min-w-[160px] flex-1 py-3 pr-2">
                            <p
                              className="truncate font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {request.medicationName}
                            </p>
                            <p style={{ fontSize: 14, color: '#8A98A3' }}>
                              Qty {request.qty} {request.form}
                              {request.qty === 1 ? '' : 's'}
                            </p>
                          </div>
                          <div className="w-28 shrink-0 py-3 pr-2">
                            <p style={{ fontSize: 14, color: '#4A7080' }}>
                              {formatDate(request.lastFilledDate)}
                            </p>
                          </div>
                          <div className="w-36 shrink-0 py-3 pr-2">
                            <p style={{ fontSize: 14, color: '#0D2630' }}>
                              {formatDateTime(request.requestedAt)}
                            </p>
                            <p style={{ fontSize: 14, color: '#8A98A3' }}>
                              {toRelativeTime(request.requestedAt)}
                            </p>
                          </div>
                          <div className="w-36 shrink-0 py-3 pr-2">
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
                              {request.status}
                            </span>
                          </div>
                          <div className="w-40 shrink-0 py-3 pr-2">
                            <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                              {requestedByLabel(request)}
                            </p>
                          </div>
                          <div className="flex w-24 shrink-0 items-center justify-end gap-1 py-3 pr-3">
                            <button
                              type="button"
                              onClick={() => viewPatient(request.patientId)}
                              aria-label={`View ${request.id}`}
                              className={`flex size-11 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
                            >
                              <Search style={{ width: 15, height: 15, color: '#4A7080' }} />
                            </button>
                            <RowMenu
                              req={request}
                              onView={() => viewPatient(request.patientId)}
                              onApprove={() => handleApprove(request)}
                              onDeny={() => handleDeny(request)}
                              onRevoke={() => handleRevoke(request)}
                              onReconsider={() => handleReconsider(request)}
                              onViewLinkedRx={() =>
                                request.linkedRxNo && viewLinkedRx(request.linkedRxNo)
                              }
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
                  itemLabel="requests"
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
                Refill Request Overview
              </h2>
              <div className="mt-3 flex items-center gap-5">
                <AnimatedDonutChart
                  breakdown={donutBreakdown}
                  total={requests.length}
                  ariaLabel="Refill request overview donut chart"
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
                          {d.label}
                        </span>
                      </div>
                      <span
                        className="shrink-0 font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {d.value} (
                        {requests.length > 0 ? Math.round((d.value / requests.length) * 100) : 0}%)
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
                Request Sources
              </h2>
              <div className="mt-3 flex flex-col gap-2.5">
                {Object.entries(sourceCounts).map(([label, count]) => (
                  <div key={label} className="flex items-center justify-between gap-2">
                    <span style={{ fontSize: 14, color: '#4A7080' }}>{label}</span>
                    <span
                      className="font-sans font-medium"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {count} (
                      {requests.length > 0 ? Math.round((count / requests.length) * 100) : 0}%)
                    </span>
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
                {[
                  {
                    icon: Package,
                    label: 'View Dispensing History',
                    href: ROUTES.pharmacyDispensingHistory,
                  },
                  {
                    icon: FileText,
                    label: 'Create New Prescription',
                    href: ROUTES.pharmacyDispense,
                  },
                  {
                    icon: Users,
                    label: 'Patient Medication Profile',
                    href: ROUTES.pharmacyActivePrescriptions,
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

            <div
              className="flex items-start gap-2.5 rounded-[12px] p-4"
              style={{
                background: 'rgba(22,163,74,0.06)',
                border: '1px solid rgba(22,163,74,0.25)',
              }}
            >
              <Lightbulb
                style={{ width: 18, height: 18, color: '#16A34A' }}
                className="mt-0.5 shrink-0"
              />
              <div className="min-w-0">
                <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
                  Tip
                </p>
                <p style={{ fontSize: 14, color: '#4A7080' }}>
                  Refill requests require valid active prescriptions. Check prescription expiry
                  before approving.
                </p>
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
            Please review each request carefully. Verify prescription validity, dosage and patient
            information before approving.
          </p>
        </div>

        <div className="h-4" />
      </div>
    </main>
  );
}
