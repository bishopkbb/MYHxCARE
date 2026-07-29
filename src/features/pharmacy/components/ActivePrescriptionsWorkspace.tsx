'use client';

import {
  AlertTriangle,
  Calendar,
  ClipboardList,
  Clock,
  Download,
  Eye,
  Info,
  MoreVertical,
  Search,
  ShieldAlert,
  Users,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';

import { FormSelect } from '@components/shared/FormSelect';
import { Pagination } from '@components/shared/Pagination';
import { PermissionGate } from '@components/shared/PermissionGate';
import { RowMenuPortal } from '@components/shared/RowMenuPortal';
import { Tooltip } from '@components/shared/Tooltip';
import { StatCard } from '@components/shared/StatCard';
import { PERMISSIONS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
import { useToast } from '@/hooks/useToast';
import { downloadCSV } from '@/utils/export';
import { formatDate } from '@/utils/datetime';
import { getPatientDetail } from '@/features/patients/__mocks__/patientFixtures';
import {
  getInteractionWarning,
  QUEUE_DEPARTMENT_OPTIONS,
  QUEUE_PRESCRIBER_OPTIONS,
  type PharmacyQueueEntry,
} from '@/features/pharmacy/__mocks__/pharmacyFixtures';
import {
  cancelPrescription,
  useActivePrescriptions,
} from '@/features/pharmacy/store/pharmacyDispensingStore';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

type RxStatus = 'Active' | 'Ending Soon' | 'Requires Review' | 'Overdue / Missed';

const STATUS_CFG: Record<RxStatus, { color: string; border: string; bg: string }> = {
  Active: { color: '#16A34A', border: 'rgba(22,163,74,0.35)', bg: 'rgba(22,163,74,0.08)' },
  'Ending Soon': { color: '#D97706', border: 'rgba(217,119,6,0.35)', bg: 'rgba(217,119,6,0.08)' },
  'Requires Review': {
    color: '#DC2626',
    border: 'rgba(220,38,38,0.35)',
    bg: 'rgba(220,38,38,0.08)',
  },
  'Overdue / Missed': {
    color: '#64748B',
    border: 'rgba(100,116,139,0.35)',
    bg: 'rgba(100,116,139,0.08)',
  },
};

const STATUS_OPTIONS = (Object.keys(STATUS_CFG) as RxStatus[]).map((s) => ({
  value: s,
  label: s,
}));

const SORT_OPTIONS = [
  { value: 'newest', label: 'Date Prescribed (Newest)' },
  { value: 'oldest', label: 'Date Prescribed (Oldest)' },
  { value: 'end-soonest', label: 'End Date (Soonest)' },
  { value: 'patient-az', label: 'Patient Name (A-Z)' },
];

function getStartDate(entry: PharmacyQueueEntry): Date {
  return new Date(entry.dispensedAt ?? entry.receivedAt);
}

function getEndDate(entry: PharmacyQueueEntry): Date {
  const end = getStartDate(entry);
  end.setDate(end.getDate() + entry.courseDays);
  return end;
}

function getDaysLeft(entry: PharmacyQueueEntry): number {
  return Math.ceil((getEndDate(entry).getTime() - Date.now()) / 86_400_000);
}

function getStatus(requiresReview: boolean, daysLeft: number): RxStatus {
  if (requiresReview) return 'Requires Review';
  if (daysLeft < 0) return 'Overdue / Missed';
  if (daysLeft <= 3) return 'Ending Soon';
  return 'Active';
}

function ageGenderLabel(patient: { age: string; gender: string }): string {
  const ageNum = /^\d+/.exec(patient.age)?.[0] ?? patient.age;
  return `${ageNum} Years`;
}

function RowMenu({
  entry,
  onView,
  onDiscontinue,
}: {
  entry: PharmacyQueueEntry;
  onView: () => void;
  onDiscontinue: () => void;
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
              onDiscontinue();
            }}
            className="flex w-full items-center px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[rgba(239,68,68,0.06)]"
            style={{ fontSize: 14, color: '#EF4444' }}
          >
            Discontinue Prescription
          </button>
        </PermissionGate>
      </RowMenuPortal>
    </div>
  );
}

export function ActivePrescriptionsWorkspace() {
  const router = useRouter();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [prescriberFilter, setPrescriberFilter] = useState('');
  const [medicationFilter, setMedicationFilter] = useState('');
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedRxNo, setSelectedRxNo] = useState<string | null>(null);

  const active = useActivePrescriptions();

  const medicationOptions = useMemo(() => {
    const names = Array.from(new Set(active.map((e) => e.medicationName))).sort();
    return names.map((n) => ({ value: n, label: n }));
  }, [active]);

  const withStatus = useMemo(() => {
    return active.map((entry) => {
      const patient = getPatientDetail(entry.patientId);
      const activeMedNames = patient.medications
        .filter((m) => m.status === 'active')
        .map((m) => m.name);
      const requiresReview =
        entry.hasAllergyAlert ||
        Boolean(getInteractionWarning(entry.medicationName, activeMedNames));
      const daysLeft = getDaysLeft(entry);
      const status = getStatus(requiresReview, daysLeft);
      return { entry, patient, daysLeft, status };
    });
  }, [active]);

  const uniquePatientCount = new Set(active.map((e) => e.patientId)).size;
  const endingSoonCount = withStatus.filter((r) => r.status === 'Ending Soon').length;
  const requiresReviewCount = withStatus.filter((r) => r.status === 'Requires Review').length;
  const overdueCount = withStatus.filter((r) => r.status === 'Overdue / Missed').length;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return withStatus.filter(({ entry, patient, status }) => {
      if (statusFilter && status !== statusFilter) return false;
      if (departmentFilter && entry.department !== departmentFilter) return false;
      if (prescriberFilter && entry.doctorName !== prescriberFilter) return false;
      if (medicationFilter && entry.medicationName !== medicationFilter) return false;
      if (
        q &&
        !patient.name.toLowerCase().includes(q) &&
        !patient.mrn.toLowerCase().includes(q) &&
        !entry.rxNo.toLowerCase().includes(q) &&
        !entry.medicationName.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [withStatus, search, statusFilter, departmentFilter, prescriberFilter, medicationFilter]);

  const sorted = useMemo(() => {
    const rows = [...filtered];
    switch (sortBy) {
      case 'oldest':
        rows.sort((a, b) => getStartDate(a.entry).getTime() - getStartDate(b.entry).getTime());
        break;
      case 'end-soonest':
        rows.sort((a, b) => getEndDate(a.entry).getTime() - getEndDate(b.entry).getTime());
        break;
      case 'patient-az':
        rows.sort((a, b) => a.patient.name.localeCompare(b.patient.name));
        break;
      default:
        rows.sort((a, b) => getStartDate(b.entry).getTime() - getStartDate(a.entry).getTime());
    }
    return rows;
  }, [filtered, sortBy]);

  const pageStart = (currentPage - 1) * rowsPerPage;
  const pageRows = sorted.slice(pageStart, pageStart + rowsPerPage);

  const selected =
    (selectedRxNo ? sorted.find((r) => r.entry.rxNo === selectedRxNo) : null) ??
    pageRows[0] ??
    null;

  function handleClearFilters() {
    setSearch('');
    setStatusFilter('');
    setDepartmentFilter('');
    setPrescriberFilter('');
    setMedicationFilter('');
    setCurrentPage(1);
  }

  function handleApplyFilters() {
    toast.success(
      'Filters applied',
      `${filtered.length} prescription${filtered.length !== 1 ? 's' : ''} match your filters.`,
    );
  }

  function handleExport() {
    const rows = [
      [
        'Rx No.',
        'Patient',
        'MRN',
        'Medication',
        'Dose & Frequency',
        'Prescriber',
        'Start Date',
        'End Date',
        'Status',
      ],
      ...sorted.map(({ entry, patient, status }) => [
        entry.rxNo,
        patient.name,
        patient.mrn,
        `${entry.medicationName} ${entry.dose}`,
        entry.frequency,
        entry.doctorName,
        formatDate(getStartDate(entry)),
        formatDate(getEndDate(entry)),
        status,
      ]),
    ];
    downloadCSV('active-prescriptions', rows);
    toast.success('Export ready', `${sorted.length} prescriptions downloaded as CSV.`);
  }

  function handleDiscontinue(rxNo: string) {
    cancelPrescription(rxNo);
    toast.info('Prescription discontinued', `${rxNo} is no longer active.`);
  }

  function viewDetails(rxNo: string) {
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
            Active Prescriptions
          </span>
        </nav>

        <div className="mt-2">
          <h1
            className="font-display font-semibold"
            style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
          >
            Active Prescriptions
          </h1>
          <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
            View and manage all active prescriptions for patients.
          </p>
        </div>

        {/* Stat cards + quick link */}
        <div className="mt-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard
            icon={ClipboardList}
            label="Total Active Prescriptions"
            value={active.length}
            info="All active medications"
            accent="#16A34A"
            iconBg="rgba(22,163,74,0.1)"
          />
          <StatCard
            icon={Users}
            label="Patients on Medications"
            value={uniquePatientCount}
            info="Unique patients"
            accent="#2563EB"
            iconBg="rgba(37,99,235,0.1)"
          />
          <StatCard
            icon={Calendar}
            label="Ending Soon"
            value={endingSoonCount}
            info="Within next 3 days"
            accent="#7C3AED"
            iconBg="rgba(124,58,237,0.1)"
            onClick={() => {
              setStatusFilter('Ending Soon');
              setCurrentPage(1);
            }}
          />
          <StatCard
            icon={AlertTriangle}
            label="Requires Review"
            value={requiresReviewCount}
            info="Dose or duration review"
            accent="#D97706"
            iconBg="rgba(217,119,6,0.1)"
            onClick={() => {
              setStatusFilter('Requires Review');
              setCurrentPage(1);
            }}
          />
          <StatCard
            icon={Clock}
            label="Overdue / Missed"
            value={overdueCount}
            info="Follow up needed"
            accent="#DC2626"
            iconBg="rgba(220,38,38,0.1)"
            onClick={() => {
              setStatusFilter('Overdue / Missed');
              setCurrentPage(1);
            }}
          />
          <div
            className="flex flex-col justify-between rounded-[12px] p-4"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <p className="font-sans font-medium" style={{ fontSize: 14, color: '#25464D' }}>
              Quick Link
            </p>
            <button
              type="button"
              onClick={() => router.push(ROUTES.pharmacyDispensingHistory)}
              className={`mt-2 flex items-center justify-between gap-2 rounded-[10px] p-2.5 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
              style={{ border: '1px solid rgba(0,100,130,0.15)' }}
            >
              <span style={{ fontSize: 14, color: '#0D2630' }}>View Dispensing History</span>
              <span style={{ fontSize: 14, color: '#00B4D8' }}>→</span>
            </button>
          </div>
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
                  id="rx-status-filter"
                  value={statusFilter}
                  onChange={(v) => {
                    setStatusFilter(v);
                    setCurrentPage(1);
                  }}
                  options={STATUS_OPTIONS}
                  placeholder="All Status"
                />
                <FormSelect
                  id="rx-department-filter"
                  value={departmentFilter}
                  onChange={(v) => {
                    setDepartmentFilter(v);
                    setCurrentPage(1);
                  }}
                  options={QUEUE_DEPARTMENT_OPTIONS}
                  placeholder="All Departments"
                />
                <FormSelect
                  id="rx-prescriber-filter"
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
                    id="rx-medication-filter"
                    value={medicationFilter}
                    onChange={(v) => {
                      setMedicationFilter(v);
                      setCurrentPage(1);
                    }}
                    options={medicationOptions}
                    placeholder="All Medications"
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

              {/* Table header row: title + sort + export */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <h2
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Active Prescriptions ({sorted.length})
                </h2>
                <div className="flex items-center gap-2.5">
                  <div style={{ width: 220 }}>
                    <FormSelect
                      id="rx-sort-by"
                      value={sortBy}
                      onChange={setSortBy}
                      options={SORT_OPTIONS}
                      placeholder="Sort by"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleExport}
                    className={`flex h-11 shrink-0 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
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

              {/* Table */}
              <div className="mt-3 overflow-x-auto scroll-smooth">
                <div style={{ minWidth: 1240 }}>
                  <div
                    className="flex rounded-t-[8px]"
                    style={{
                      background: 'rgba(226,237,241,0.4)',
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
                    <div className="w-40 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Dose &amp; Frequency
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
                    <div className="w-24 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Start Date
                      </span>
                    </div>
                    <div className="w-32 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        End Date
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
                        No active prescriptions match your filters
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

                  {pageRows.map(({ entry, patient, daysLeft, status }) => {
                    const statusCfg = STATUS_CFG[status];
                    const isSelected = selected?.entry.rxNo === entry.rxNo;
                    return (
                      <div
                        key={entry.rxNo}
                        onClick={() => setSelectedRxNo(entry.rxNo)}
                        className="flex cursor-pointer items-center transition-colors duration-100 hover:bg-[#F5FBFD]"
                        style={{
                          borderBottom: '1px solid rgba(0,100,130,0.08)',
                          background: isSelected ? 'rgba(0,180,216,0.05)' : undefined,
                        }}
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
                        <div className="w-40 shrink-0 py-3 pr-2">
                          <Tooltip content={entry.frequency}>
                            <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                              {entry.frequency}
                            </p>
                          </Tooltip>
                        </div>
                        <div className="w-40 shrink-0 py-3 pr-2">
                          <Tooltip content={entry.doctorName}>
                            <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                              {entry.doctorName}
                            </p>
                          </Tooltip>
                        </div>
                        <div className="w-24 shrink-0 py-3 pr-2">
                          <p style={{ fontSize: 14, color: '#4A7080' }}>
                            {formatDate(getStartDate(entry))}
                          </p>
                        </div>
                        <div className="w-32 shrink-0 py-3 pr-2">
                          <p style={{ fontSize: 14, color: '#4A7080' }}>
                            {formatDate(getEndDate(entry))}
                          </p>
                          <p style={{ fontSize: 14, color: daysLeft < 0 ? '#DC2626' : '#8A98A3' }}>
                            {daysLeft < 0
                              ? `${Math.abs(daysLeft)}d overdue`
                              : daysLeft === 0
                                ? 'Today'
                                : `${daysLeft}d left`}
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
                            {status}
                          </span>
                        </div>
                        <div
                          className="flex w-24 shrink-0 items-center justify-end gap-1 py-3 pr-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => viewDetails(entry.rxNo)}
                            aria-label={`View ${entry.rxNo}`}
                            className={`flex size-11 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
                          >
                            <Eye style={{ width: 15, height: 15, color: '#4A7080' }} />
                          </button>
                          <RowMenu
                            entry={entry}
                            onView={() => viewDetails(entry.rxNo)}
                            onDiscontinue={() => handleDiscontinue(entry.rxNo)}
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
                totalItems={sorted.length}
                onPageChange={setCurrentPage}
                onPageSizeChange={(size) => {
                  setRowsPerPage(size);
                  setCurrentPage(1);
                }}
                itemLabel="prescriptions"
              />
            </div>
          </div>

          {/* Sidebar — docked detail panel for the selected row */}
          <div className="flex w-full shrink-0 flex-col gap-4 xl:w-[340px]">
            {selected ? (
              <>
                <div
                  className="rounded-[12px] p-4"
                  style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h2
                      className="font-display font-semibold"
                      style={{ fontSize: 16, color: '#0D2630' }}
                    >
                      Patient Summary
                    </h2>
                    <button
                      type="button"
                      onClick={() => router.push(`/patients/${selected.patient.id}`)}
                      className={`font-sans font-medium transition-colors duration-150 hover:underline ${FOCUS_RING}`}
                      style={{ fontSize: 14, color: '#00B4D8' }}
                    >
                      View Profile
                    </button>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <div
                      className="flex size-12 shrink-0 items-center justify-center rounded-full font-sans font-semibold text-white"
                      style={{ background: '#00B4D8' }}
                    >
                      {selected.patient.initials}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Tooltip content={selected.patient.name}>
                          <p
                            className="truncate font-sans font-medium"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {selected.patient.name}
                          </p>
                        </Tooltip>
                        <span
                          className="rounded-full px-2 py-0.5"
                          style={{
                            fontSize: 14,
                            color: '#4A7080',
                            border: '1px solid rgba(0,100,130,0.15)',
                          }}
                        >
                          {selected.patient.gender}
                        </span>
                      </div>
                      <p style={{ fontSize: 14, color: '#8A98A3' }}>
                        {ageGenderLabel(selected.patient)} · {selected.patient.mrn}
                      </p>
                      <p style={{ fontSize: 14, color: '#8A98A3' }}>{selected.patient.phone}</p>
                    </div>
                  </div>
                  <div className="mt-3.5 flex flex-col gap-2.5">
                    <div>
                      <p style={{ fontSize: 14, color: '#8A98A3' }}>Allergies</p>
                      <p
                        style={{
                          fontSize: 14,
                          color: selected.patient.allergies.length > 0 ? '#DC2626' : '#0D2630',
                        }}
                      >
                        {selected.patient.allergies.length > 0
                          ? selected.patient.allergies.map((a) => a.substance).join(', ')
                          : 'None recorded'}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: 14, color: '#8A98A3' }}>Chronic Conditions</p>
                      <p style={{ fontSize: 14, color: '#0D2630' }}>
                        {selected.patient.medicalHistory.chronicConditions.length > 0
                          ? selected.patient.medicalHistory.chronicConditions
                              .map((c) => c.condition)
                              .join(', ')
                          : 'None recorded'}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: 14, color: '#8A98A3' }}>Current Medications</p>
                      <p style={{ fontSize: 14, color: '#0D2630' }}>
                        {selected.patient.medications.filter((m) => m.status === 'active').length >
                        0
                          ? selected.patient.medications
                              .filter((m) => m.status === 'active')
                              .map((m) => `${m.name} ${m.dose} ${m.frequency}`)
                              .join(', ')
                          : 'None recorded'}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span style={{ fontSize: 14, color: '#8A98A3' }}>Last Visit</span>
                      <span style={{ fontSize: 14, color: '#0D2630' }}>
                        {selected.patient.consultations[0]?.date ?? 'No visits recorded'}
                      </span>
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
                    Alerts &amp; Reminders
                  </h2>
                  <div className="mt-3 flex flex-col gap-2.5">
                    {selected.patient.allergies.length > 0 && (
                      <div
                        className="flex items-start gap-2.5 rounded-[10px] p-2.5"
                        style={{
                          background: 'rgba(220,38,38,0.05)',
                          border: '1px solid rgba(220,38,38,0.2)',
                        }}
                      >
                        <ShieldAlert
                          style={{ width: 16, height: 16, color: '#DC2626' }}
                          className="mt-0.5 shrink-0"
                        />
                        <div className="min-w-0">
                          <p
                            className="font-sans font-semibold"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            Allergy: {selected.patient.allergies.map((a) => a.substance).join(', ')}
                          </p>
                          <p style={{ fontSize: 14, color: '#4A7080' }}>
                            Avoid contraindicated medications.
                          </p>
                        </div>
                      </div>
                    )}
                    <div
                      className="flex items-start gap-2.5 rounded-[10px] p-2.5"
                      style={{
                        background: 'rgba(0,180,216,0.05)',
                        border: '1px solid rgba(0,180,216,0.2)',
                      }}
                    >
                      <Info
                        style={{ width: 16, height: 16, color: '#00B4D8' }}
                        className="mt-0.5 shrink-0"
                      />
                      <div className="min-w-0">
                        <p
                          className="font-sans font-semibold"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          Ensure patient adherence and monitor.
                        </p>
                        <p style={{ fontSize: 14, color: '#4A7080' }}>
                          Review if symptoms persist.
                        </p>
                      </div>
                    </div>
                    <div
                      className="flex items-start gap-2.5 rounded-[10px] p-2.5"
                      style={{
                        background:
                          selected.daysLeft < 0 ? 'rgba(100,116,139,0.06)' : 'rgba(217,119,6,0.05)',
                        border: `1px solid ${selected.daysLeft < 0 ? 'rgba(100,116,139,0.2)' : 'rgba(217,119,6,0.2)'}`,
                      }}
                    >
                      <Calendar
                        style={{
                          width: 16,
                          height: 16,
                          color: selected.daysLeft < 0 ? '#64748B' : '#D97706',
                        }}
                        className="mt-0.5 shrink-0"
                      />
                      <div className="min-w-0">
                        <p
                          className="font-sans font-semibold"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {selected.daysLeft < 0
                            ? `Course ended ${Math.abs(selected.daysLeft)} day${Math.abs(selected.daysLeft) !== 1 ? 's' : ''} ago`
                            : `Prescription ends in ${selected.daysLeft} day${selected.daysLeft !== 1 ? 's' : ''}`}
                        </p>
                        <p style={{ fontSize: 14, color: '#4A7080' }}>
                          Consider follow-up if needed.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <PermissionGate permission={PERMISSIONS.PHARMACY_DISPENSE}>
                  <button
                    type="button"
                    onClick={() => router.push(ROUTES.pharmacyDispense)}
                    className={`flex items-center justify-between gap-2 rounded-[12px] p-4 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                    style={{
                      background: 'rgba(22,163,74,0.06)',
                      border: '1px solid rgba(22,163,74,0.25)',
                    }}
                  >
                    <div className="min-w-0">
                      <p
                        className="font-sans font-semibold"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        Need to Dispense?
                      </p>
                      <p style={{ fontSize: 14, color: '#4A7080' }}>Go to Dispense Medication</p>
                    </div>
                    <span style={{ fontSize: 18, color: '#16A34A' }}>→</span>
                  </button>
                </PermissionGate>
              </>
            ) : (
              <div
                className="rounded-[12px] p-6 text-center"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <p style={{ fontSize: 14, color: '#8A98A3' }}>
                  Select a prescription to see the patient summary.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer safety banner */}
        <div
          className="mt-5 flex items-start gap-2.5 rounded-[12px] p-4"
          style={{ background: 'rgba(0,180,216,0.06)', border: '1px solid rgba(0,180,216,0.25)' }}
        >
          <Info style={{ width: 16, height: 16, color: '#00B4D8' }} className="mt-0.5 shrink-0" />
          <p style={{ fontSize: 14, color: '#0D2630' }}>
            Ensure allergies and drug interactions are reviewed before dispensing. Follow hospital
            policies for controlled medications.
          </p>
        </div>

        <div className="h-4" />
      </div>
    </main>
  );
}
