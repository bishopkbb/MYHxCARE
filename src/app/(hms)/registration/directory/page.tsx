'use client';

import {
  AlertCircle,
  Calendar,
  Download,
  Eye,
  Filter,
  MoreVertical,
  Pencil,
  Phone,
  Printer,
  RefreshCw,
  Search,
  Users,
  X,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import { FormSelect } from '@components/shared/FormSelect';
import { ModalLoadingFallback } from '@components/shared/ModalLoadingFallback';
import { StatCardTrend } from '@components/shared/StatCard';
import { UserAvatar } from '@components/shared/UserAvatar';
import { ExportMenu } from '@/components/ExportMenu';
import { PermissionGate } from '@components/shared/PermissionGate';
import { PERMISSIONS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
import { useToast } from '@/hooks/useToast';
import { formatHumanDate } from '@/utils/datetime';
import { downloadCSV, downloadPDF, escapeHtml } from '@/utils/export';
import {
  APPOINTMENT_STATUS_OPTIONS,
  DIRECTORY_GENDER_OPTIONS,
  DIRECTORY_PATIENTS,
  DIRECTORY_STATS,
  DIRECTORY_STATUS_OPTIONS,
  FACULTY_OPTIONS,
  REGISTRATION_DATE_OPTIONS,
  type DirectoryPatient,
  type DirectoryPatientStatus,
} from '@/features/registration/__mocks__/patientDirectoryFixtures';
import { PATIENT_CATEGORY_OPTIONS } from '@/features/registration/__mocks__/registerPatientOptions';
import {
  bulkUpdatePatients,
  useDirectoryPatients,
} from '@/features/registration/store/patientDirectoryStore';

const AssignCategoryModal = dynamic(
  () =>
    import('@/features/registration/components/AssignCategoryModal').then(
      (m) => m.AssignCategoryModal,
    ),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

// The only directory patient with a full, richly-detailed PatientProfile
// record (see toCuratedBannerPatient()) -- Profile navigation is honest
// only for this one; every other row would silently show the wrong patient.
const CURATED_PATIENT_ID = 'dp-001';

type PageState = 'loading' | 'loaded' | 'error';

const STATUS_CFG: Record<DirectoryPatientStatus, { color: string; border: string; bg: string }> = {
  Active: { color: '#22C55E', border: 'rgba(34,197,94,0.4)', bg: 'transparent' },
  'Checked-In': { color: '#00B4D8', border: 'rgba(0,180,216,0.4)', bg: 'transparent' },
  Waiting: { color: '#F59E0B', border: 'rgba(245,158,11,0.4)', bg: 'rgba(245,158,11,0.06)' },
  Inactive: { color: '#8A98A3', border: 'rgba(138,152,163,0.4)', bg: 'transparent' },
  Emergency: { color: '#EF4444', border: 'rgba(239,68,68,0.4)', bg: 'rgba(239,68,68,0.06)' },
};

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50];

type Filters = {
  category: string;
  gender: string;
  faculty: string;
  registrationDate: string;
  appointmentStatus: string;
  insuranceProvider: string;
  status: string;
};

const FILTER_DEFAULTS: Filters = {
  category: '',
  gender: '',
  faculty: '',
  registrationDate: '',
  appointmentStatus: '',
  insuranceProvider: '',
  status: '',
};

const INSURANCE_FILTER_OPTIONS = Array.from(
  new Set(DIRECTORY_PATIENTS.map((p) => p.insuranceProvider)),
).map((label) => ({ value: label, label }));

function SkeletonRow() {
  return (
    <div
      className="flex items-center py-3"
      style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
    >
      <div className="w-10 shrink-0 pl-4">
        <div className="size-4 animate-pulse rounded bg-slate-100" />
      </div>
      <div className="flex min-w-[180px] flex-1 items-center gap-3 pr-3">
        <div className="size-9 shrink-0 animate-pulse rounded-full bg-slate-100" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="h-4 w-32 animate-pulse rounded bg-slate-100" />
          <div className="h-3.5 w-24 animate-pulse rounded bg-slate-100" />
        </div>
      </div>
      <div className="w-32 shrink-0 pr-3">
        <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
      </div>
      <div className="w-28 shrink-0 pr-3">
        <div className="h-4 w-20 animate-pulse rounded bg-slate-100" />
      </div>
      <div className="w-28 shrink-0 pr-3">
        <div className="h-4 w-14 animate-pulse rounded bg-slate-100" />
      </div>
      <div className="w-40 shrink-0 pr-3">
        <div className="h-4 w-28 animate-pulse rounded bg-slate-100" />
      </div>
      <div className="w-28 shrink-0 pr-3">
        <div className="h-4 w-16 animate-pulse rounded bg-slate-100" />
      </div>
      <div className="w-24 shrink-0 pr-3">
        <div className="h-6 w-16 animate-pulse rounded-full bg-slate-100" />
      </div>
      <div className="w-32 shrink-0 pr-4">
        <div className="h-4 w-16 animate-pulse rounded bg-slate-100" />
      </div>
    </div>
  );
}

export default function PatientDirectoryPage() {
  const router = useRouter();
  const toast = useToast();
  const [pageState, setPageState] = useState<PageState>('loading');
  const patients = useDirectoryPatients();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Filters>(FILTER_DEFAULTS);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(
    DIRECTORY_PATIENTS[0]?.id ?? null,
  );
  const [assignCategoryOpen, setAssignCategoryOpen] = useState(false);
  const actionMenuRef = useRef<HTMLDivElement>(null);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setPageState('loaded'), 800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target as Node)) {
        setOpenActionMenuId(null);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  function handleRetry() {
    setPageState('loading');
    setTimeout(() => setPageState('loaded'), 800);
  }

  const filteredPatients = useMemo(() => {
    return patients.filter((p) => {
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (
          !p.name.toLowerCase().includes(q) &&
          !p.mrn.toLowerCase().includes(q) &&
          !p.studentId.toLowerCase().includes(q) &&
          !p.phone.replace(/\s/g, '').includes(q.replace(/\s/g, '')) &&
          !p.email.toLowerCase().includes(q)
        )
          return false;
      }
      if (filters.category && p.category !== filters.category) return false;
      if (filters.gender && p.gender.toLowerCase() !== filters.gender) return false;
      if (filters.faculty) {
        const facultyLabel = FACULTY_OPTIONS.find((f) => f.value === filters.faculty)?.label;
        if (p.faculty !== facultyLabel) return false;
      }
      if (filters.status && p.status !== filters.status) return false;
      if (filters.insuranceProvider && p.insuranceProvider !== filters.insuranceProvider)
        return false;
      return true;
    });
  }, [patients, search, filters]);

  const totalPages = Math.max(1, Math.ceil(filteredPatients.length / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * rowsPerPage;
  const pagePatients = filteredPatients.slice(pageStart, pageStart + rowsPerPage);
  const selectedPatient = patients.find((p) => p.id === selectedPatientId) ?? null;

  const hasActiveFilters = Object.values(filters).some((v) => v !== '') || search.trim() !== '';

  function updateFilter(key: keyof Filters, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  }

  function resetFilters() {
    setFilters(FILTER_DEFAULTS);
    setSearch('');
    setCurrentPage(1);
    toast.info('Filters cleared', 'Showing all registered patients.');
  }

  function toggleRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllOnPage() {
    setSelectedIds((prev) => {
      const allSelected = pagePatients.every((p) => prev.has(p.id));
      const next = new Set(prev);
      pagePatients.forEach((p) => (allSelected ? next.delete(p.id) : next.add(p.id)));
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  const exportRows = (rows: DirectoryPatient[]) => [
    ['Name', 'MRN', 'Student ID', 'Age', 'Gender', 'Faculty/Department', 'Last Visit', 'Status'],
    ...rows.map((p) => [
      p.name,
      p.mrn,
      p.studentId,
      String(p.age),
      p.gender,
      p.faculty,
      p.lastVisit,
      p.status,
    ]),
  ];

  function exportCSV() {
    downloadCSV('patient-directory', exportRows(filteredPatients));
    toast.success('Export ready', `${filteredPatients.length} patients downloaded as CSV.`);
  }

  function exportPDF() {
    const rows = exportRows(filteredPatients);
    const body = `
      <h1>Patient Directory</h1>
      <p class="meta">${filteredPatients.length} patients</p>
      <table>
        <thead><tr>${rows[0]?.map((h) => `<th>${escapeHtml(h)}</th>`).join('') ?? ''}</tr></thead>
        <tbody>
          ${rows
            .slice(1)
            .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`)
            .join('')}
        </tbody>
      </table>
    `;
    downloadPDF('patient-directory', body);
    toast.success('Export ready', `${filteredPatients.length} patients downloaded as PDF.`);
  }

  function exportSelected() {
    const rows = patients.filter((p) => selectedIds.has(p.id));
    if (rows.length === 0) return;
    downloadCSV('patient-directory-selected', exportRows(rows));
    toast.success('Export ready', `${rows.length} selected patients downloaded as CSV.`);
  }

  function printCardsFor(targets: DirectoryPatient[]) {
    if (targets.length === 0) return;
    const prefill = targets.map((p) => ({
      name: p.name,
      mrn: p.mrn,
      gender: p.gender,
      dob: p.dateOfBirth,
    }));
    router.push(
      `${ROUTES.registrationCardPrinting}?prefill=${encodeURIComponent(JSON.stringify(prefill))}`,
    );
  }

  function printCards() {
    const targets = patients.filter((p) => selectedIds.has(p.id));
    printCardsFor(targets);
  }

  function assignCategory() {
    if (selectedIds.size === 0) return;
    setAssignCategoryOpen(true);
  }

  function handleAssignCategory(category: string) {
    bulkUpdatePatients(selectedIds, { category });
    toast.success('Category assigned', `Updated category for ${selectedIds.size} patient(s).`);
    setAssignCategoryOpen(false);
    clearSelection();
  }

  function archiveRecords() {
    if (selectedIds.size === 0) return;
    bulkUpdatePatients(selectedIds, { status: 'Inactive' });
    toast.success('Records archived', `${selectedIds.size} patient record(s) archived.`);
    clearSelection();
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto max-w-[1440px] px-4 py-4 sm:px-6 sm:py-5">
          {/* ── Breadcrumb ────────────────────────────────────────────────── */}
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
            <span style={{ fontSize: 14, color: '#8A98A3' }}>Patient Management</span>
            <span style={{ fontSize: 14, color: '#8A98A3' }}>/</span>
            <span className="font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
              Patient Directory
            </span>
          </nav>

          <h1
            className="font-display mt-2 font-semibold"
            style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
          >
            Patient Directory
          </h1>
          <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
            Search, view and manage registered patients
          </p>

          {/* ── Stats ─────────────────────────────────────────────────────── */}
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {DIRECTORY_STATS.map((stat) => (
              <StatCardTrend
                key={stat.id}
                icon={stat.icon}
                label={stat.label}
                value={stat.value.toLocaleString('en-NG')}
                trendPercent={stat.trendPercent}
                {...(stat.trendLabel ? { trendLabel: stat.trendLabel } : {})}
                accent={stat.accent}
                iconBg={stat.iconBg}
                sparklineData={stat.sparkline}
              />
            ))}
          </div>

          {/* ── Search + controls ────────────────────────────────────────── */}
          <div
            className="mt-5 flex flex-col gap-4 rounded-[12px] bg-white p-4"
            style={{ border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <div className="relative w-full sm:min-w-0 sm:flex-1">
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
                  placeholder="Search by Name, MRN, Student ID, National ID, Phone or Email..."
                  className="h-11 w-full rounded-[10px] pr-4 pl-9 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40"
                  style={{
                    fontSize: 14,
                    border: '1px solid rgba(0,100,130,0.18)',
                    color: '#0D2630',
                  }}
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setFiltersOpen((o) => !o)}
                  className="flex h-11 shrink-0 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                  style={{
                    fontSize: 14,
                    color: filtersOpen ? '#00B4D8' : '#0D2630',
                    border: `1px solid ${filtersOpen ? '#00B4D8' : 'rgba(0,100,130,0.2)'}`,
                  }}
                >
                  <Filter style={{ width: 15, height: 15 }} />
                  Filter
                </button>
                <button
                  type="button"
                  onClick={resetFilters}
                  disabled={!hasActiveFilters}
                  className="flex h-11 shrink-0 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
                  style={{
                    fontSize: 14,
                    color: '#0D2630',
                    border: '1px solid rgba(0,100,130,0.2)',
                  }}
                >
                  <RefreshCw style={{ width: 15, height: 15 }} />
                  Reset
                </button>
                <ExportMenu variant="button" onExportPDF={exportPDF} onExportCSV={exportCSV} />
              </div>
            </div>

            {filtersOpen && (
              <div className="animate-in fade-in-0 slide-in-from-top-1 grid grid-cols-1 gap-3 duration-150 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label
                    className="mb-1.5 block font-sans font-medium"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    Patient Category
                  </label>
                  <FormSelect
                    id="filter-category"
                    value={filters.category}
                    onChange={(v) => updateFilter('category', v)}
                    options={PATIENT_CATEGORY_OPTIONS}
                    placeholder="All Categories"
                  />
                </div>
                <div>
                  <label
                    className="mb-1.5 block font-sans font-medium"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    Gender
                  </label>
                  <FormSelect
                    id="filter-gender"
                    value={filters.gender}
                    onChange={(v) => updateFilter('gender', v)}
                    options={DIRECTORY_GENDER_OPTIONS}
                    placeholder="All Gender"
                  />
                </div>
                <div>
                  <label
                    className="mb-1.5 block font-sans font-medium"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    Faculty/Department
                  </label>
                  <FormSelect
                    id="filter-faculty"
                    value={filters.faculty}
                    onChange={(v) => updateFilter('faculty', v)}
                    options={FACULTY_OPTIONS}
                    placeholder="All Departments"
                  />
                </div>
                <div>
                  <label
                    className="mb-1.5 block font-sans font-medium"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    Registration Date
                  </label>
                  <FormSelect
                    id="filter-registration-date"
                    value={filters.registrationDate}
                    onChange={(v) => updateFilter('registrationDate', v)}
                    options={REGISTRATION_DATE_OPTIONS}
                    placeholder="Select date range"
                  />
                </div>
                <div>
                  <label
                    className="mb-1.5 block font-sans font-medium"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    Appointment Status
                  </label>
                  <FormSelect
                    id="filter-appointment-status"
                    value={filters.appointmentStatus}
                    onChange={(v) => updateFilter('appointmentStatus', v)}
                    options={APPOINTMENT_STATUS_OPTIONS}
                    placeholder="All Status"
                  />
                </div>
                <div>
                  <label
                    className="mb-1.5 block font-sans font-medium"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    Insurance Provider
                  </label>
                  <FormSelect
                    id="filter-insurance"
                    value={filters.insuranceProvider}
                    onChange={(v) => updateFilter('insuranceProvider', v)}
                    options={INSURANCE_FILTER_OPTIONS}
                    placeholder="All Providers"
                  />
                </div>
                <div>
                  <label
                    className="mb-1.5 block font-sans font-medium"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    Status
                  </label>
                  <FormSelect
                    id="filter-status"
                    value={filters.status}
                    onChange={(v) => updateFilter('status', v)}
                    options={DIRECTORY_STATUS_OPTIONS}
                    placeholder="All Status"
                  />
                </div>
              </div>
            )}
          </div>

          {/* ── Table + detail panel ─────────────────────────────────────── */}
          <div className="mt-5 flex flex-col gap-4 xl:flex-row xl:items-start">
            <div
              className="min-w-0 flex-1 rounded-[12px] bg-white p-4"
              style={{ border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p style={{ fontSize: 14, color: '#4A7080' }}>
                  {filteredPatients.length === 0
                    ? 'No patients found'
                    : `Showing ${pageStart + 1} to ${Math.min(pageStart + rowsPerPage, filteredPatients.length)} of ${filteredPatients.length} patients`}
                </p>
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

              <div className="mt-3 overflow-x-auto scroll-smooth">
                <div className="min-w-[1080px]">
                  <div
                    className="flex items-center rounded-t-[8px]"
                    style={{
                      background: 'rgba(226,237,241,0.4)',
                      borderBottom: '1px solid #E6F8FD',
                    }}
                  >
                    <div className="w-10 shrink-0 py-3 pl-4">
                      <input
                        type="checkbox"
                        checked={
                          pagePatients.length > 0 &&
                          pagePatients.every((p) => selectedIds.has(p.id))
                        }
                        onChange={toggleAllOnPage}
                        style={{ accentColor: '#00B4D8' }}
                        className="size-4 cursor-pointer rounded"
                        aria-label="Select all patients on this page"
                      />
                    </div>
                    <div className="min-w-[180px] flex-1 py-3 pr-3">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Patient
                      </span>
                    </div>
                    <div className="w-32 shrink-0 py-3 pr-3">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        MRN
                      </span>
                    </div>
                    <div className="w-28 shrink-0 py-3 pr-3">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Student ID
                      </span>
                    </div>
                    <div className="w-28 shrink-0 py-3 pr-3">
                      <span
                        className="truncate font-sans font-bold tracking-wide uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Age/Gender
                      </span>
                    </div>
                    <div className="w-40 shrink-0 py-3 pr-3">
                      <span
                        className="truncate font-sans font-bold tracking-wide uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Faculty/Dept
                      </span>
                    </div>
                    <div className="w-28 shrink-0 py-3 pr-3">
                      <span
                        className="truncate font-sans font-bold tracking-wide uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Last Visit
                      </span>
                    </div>
                    <div className="w-24 shrink-0 py-3 pr-3">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Status
                      </span>
                    </div>
                    <div className="w-32 shrink-0 py-3 pr-4 text-right">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Actions
                      </span>
                    </div>
                  </div>

                  {pageState === 'loading' &&
                    Array.from({ length: rowsPerPage }).map((_, i) => <SkeletonRow key={i} />)}

                  {pageState === 'error' && (
                    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                      <AlertCircle style={{ width: 36, height: 36, color: '#EF4444' }} />
                      <p
                        className="font-sans font-semibold"
                        style={{ fontSize: 16, color: '#0D2630' }}
                      >
                        Failed to load patients
                      </p>
                      <button
                        type="button"
                        onClick={handleRetry}
                        className="flex items-center gap-2 rounded-[12px] font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-80 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                        style={{
                          height: 40,
                          padding: '0 20px',
                          background: '#00B4D8',
                          fontSize: 14,
                        }}
                      >
                        <RefreshCw style={{ width: 16, height: 16 }} />
                        Retry
                      </button>
                    </div>
                  )}

                  {pageState === 'loaded' && pagePatients.length === 0 && (
                    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                      <div
                        className="flex size-14 items-center justify-center rounded-full"
                        style={{ background: 'rgba(226,237,241,0.6)' }}
                      >
                        <Users style={{ width: 24, height: 24, color: '#8A98A3' }} />
                      </div>
                      <div>
                        <p
                          className="font-sans font-medium"
                          style={{ fontSize: 16, color: '#4A7080' }}
                        >
                          No patients match this search
                        </p>
                        <p className="mt-0.5" style={{ fontSize: 14, color: '#8A98A3' }}>
                          Try adjusting your search or clearing the filters
                        </p>
                      </div>
                      {hasActiveFilters && (
                        <button
                          type="button"
                          onClick={resetFilters}
                          className="mt-1 font-sans font-medium transition-colors duration-150 hover:underline focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                          style={{ fontSize: 14, color: '#00B4D8' }}
                        >
                          Clear all filters
                        </button>
                      )}
                    </div>
                  )}

                  {pageState === 'loaded' &&
                    pagePatients.map((patient) => {
                      const cfg = STATUS_CFG[patient.status];
                      const isSelected = selectedPatientId === patient.id;
                      return (
                        <div
                          key={patient.id}
                          onClick={() => setSelectedPatientId(patient.id)}
                          className="flex cursor-pointer items-center transition-colors duration-100 hover:bg-[#F5FBFD]"
                          style={{
                            borderBottom: '1px solid rgba(0,100,130,0.08)',
                            background: isSelected ? '#E6F8FD' : 'transparent',
                          }}
                        >
                          <div
                            className="w-10 shrink-0 py-3 pl-4"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={selectedIds.has(patient.id)}
                              onChange={() => toggleRow(patient.id)}
                              style={{ accentColor: '#00B4D8' }}
                              className="size-4 cursor-pointer rounded"
                              aria-label={`Select ${patient.name}`}
                            />
                          </div>
                          <div className="flex min-w-[180px] flex-1 items-center gap-3 py-3 pr-3">
                            <div
                              className="flex size-9 shrink-0 items-center justify-center rounded-full font-sans text-sm font-semibold text-white"
                              style={{ background: patient.avatarBg }}
                            >
                              {patient.initials}
                            </div>
                            <div className="min-w-0">
                              <p
                                className="truncate font-sans font-medium"
                                style={{ fontSize: 14, color: '#0D2630' }}
                              >
                                {patient.name}
                              </p>
                              <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                                {patient.phone}
                              </p>
                            </div>
                          </div>
                          <div className="w-32 shrink-0 py-3 pr-3">
                            <p className="truncate" style={{ fontSize: 14, color: '#00B4D8' }}>
                              {patient.mrn}
                            </p>
                          </div>
                          <div className="w-28 shrink-0 py-3 pr-3">
                            <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                              {patient.studentId}
                            </p>
                          </div>
                          <div className="w-28 shrink-0 py-3 pr-3">
                            <p style={{ fontSize: 14, color: '#4A7080' }}>
                              {patient.age} / {patient.gender[0]}
                            </p>
                          </div>
                          <div className="w-40 shrink-0 py-3 pr-3">
                            <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                              {patient.faculty}
                            </p>
                          </div>
                          <div className="w-28 shrink-0 py-3 pr-3">
                            <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                              {patient.lastVisit}
                            </p>
                          </div>
                          <div className="w-24 shrink-0 py-3 pr-3">
                            <span
                              className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium"
                              style={{
                                fontSize: 14,
                                whiteSpace: 'nowrap',
                                color: cfg.color,
                                border: `1px solid ${cfg.border}`,
                                background: cfg.bg,
                              }}
                            >
                              {patient.status}
                            </span>
                          </div>
                          <div
                            className="flex w-32 shrink-0 items-center justify-end gap-1 py-3 pr-4"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => setSelectedPatientId(patient.id)}
                              aria-label={`View ${patient.name}`}
                              className="flex size-8 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                            >
                              <Eye style={{ width: 15, height: 15, color: '#4A7080' }} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (patient.id === CURATED_PATIENT_ID) {
                                  router.push(ROUTES.registrationProfile);
                                } else {
                                  toast.info(
                                    'Not available',
                                    'The full Patient Profile view is only built out for the demo patient so far.',
                                  );
                                }
                              }}
                              aria-label={`Edit ${patient.name}`}
                              className="flex size-8 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                            >
                              <Pencil style={{ width: 15, height: 15, color: '#4A7080' }} />
                            </button>
                            <div
                              ref={openActionMenuId === patient.id ? actionMenuRef : null}
                              className="relative"
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  setOpenActionMenuId((id) =>
                                    id === patient.id ? null : patient.id,
                                  )
                                }
                                aria-label={`More actions for ${patient.name}`}
                                className="flex size-8 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                              >
                                <MoreVertical style={{ width: 15, height: 15, color: '#4A7080' }} />
                              </button>
                              {openActionMenuId === patient.id && (
                                <div
                                  className="animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 absolute top-full right-0 z-30 mt-1 w-44 overflow-hidden rounded-[12px] bg-white py-1.5 duration-150"
                                  style={{
                                    border: '1px solid rgba(0,100,130,0.12)',
                                    boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                                  }}
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      router.push(ROUTES.registrationCheckIn);
                                      setOpenActionMenuId(null);
                                    }}
                                    className="flex w-full items-center px-4 py-2 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD]"
                                    style={{ fontSize: 14, color: '#2F3A40' }}
                                  >
                                    Check-In Patient
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      router.push(ROUTES.registrationAppointments);
                                      setOpenActionMenuId(null);
                                    }}
                                    className="flex w-full items-center px-4 py-2 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD]"
                                    style={{ fontSize: 14, color: '#2F3A40' }}
                                  >
                                    Schedule Appointment
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenActionMenuId(null);
                                      printCardsFor([patient]);
                                    }}
                                    className="flex w-full items-center px-4 py-2 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD]"
                                    style={{ fontSize: 14, color: '#2F3A40' }}
                                  >
                                    Print Patient Card
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* ── Pagination ────────────────────────────────────────────── */}
              {pageState === 'loaded' && filteredPatients.length > 0 && (
                <div className="mt-4 flex items-center justify-center gap-1.5">
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
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                    .reduce<(number | 'ellipsis')[]>((acc, p) => {
                      if (acc.length > 0 && typeof acc[acc.length - 1] === 'number') {
                        const prev = acc[acc.length - 1] as number;
                        if (p - prev > 1) acc.push('ellipsis');
                      }
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, i) =>
                      p === 'ellipsis' ? (
                        <span
                          key={`e-${i}`}
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
              )}

              {/* ── Bulk action bar ───────────────────────────────────────── */}
              <div
                className="mt-4 flex flex-wrap items-center gap-3 pt-3"
                style={{ borderTop: '1px solid rgba(0,100,130,0.08)' }}
              >
                <span style={{ fontSize: 14, color: '#4A7080' }}>{selectedIds.size} selected</span>
                <PermissionGate permission={PERMISSIONS.PATIENTS_WRITE}>
                  <button
                    type="button"
                    onClick={exportSelected}
                    disabled={selectedIds.size === 0}
                    className="flex h-9 items-center gap-1.5 rounded-[8px] px-3 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
                    style={{
                      fontSize: 14,
                      color: '#0D2630',
                      border: '1px solid rgba(0,100,130,0.2)',
                    }}
                  >
                    <Download style={{ width: 14, height: 14 }} />
                    Export Selected
                  </button>
                  <button
                    type="button"
                    onClick={printCards}
                    disabled={selectedIds.size === 0}
                    className="flex h-9 items-center gap-1.5 rounded-[8px] px-3 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
                    style={{
                      fontSize: 14,
                      color: '#0D2630',
                      border: '1px solid rgba(0,100,130,0.2)',
                    }}
                  >
                    <Printer style={{ width: 14, height: 14 }} />
                    Print Cards
                  </button>
                  <button
                    type="button"
                    onClick={assignCategory}
                    disabled={selectedIds.size === 0}
                    className="flex h-9 items-center gap-1.5 rounded-[8px] px-3 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
                    style={{
                      fontSize: 14,
                      color: '#0D2630',
                      border: '1px solid rgba(0,100,130,0.2)',
                    }}
                  >
                    Assign Category
                  </button>
                  <button
                    type="button"
                    onClick={archiveRecords}
                    disabled={selectedIds.size === 0}
                    className="flex h-9 items-center gap-1.5 rounded-[8px] px-3 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
                    style={{
                      fontSize: 14,
                      color: '#0D2630',
                      border: '1px solid rgba(0,100,130,0.2)',
                    }}
                  >
                    Archive Records
                  </button>
                </PermissionGate>
                <button
                  type="button"
                  onClick={clearSelection}
                  disabled={selectedIds.size === 0}
                  className="flex h-9 items-center gap-1.5 rounded-[8px] px-3 font-sans font-medium transition-colors duration-150 hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-400/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
                  style={{
                    fontSize: 14,
                    color: '#EF4444',
                    border: '1px solid rgba(239,68,68,0.3)',
                  }}
                >
                  Clear Selection
                </button>
              </div>
            </div>

            {/* ── Detail panel ──────────────────────────────────────────── */}
            {selectedPatient && (
              <div
                className="w-full shrink-0 rounded-[12px] bg-white p-4 xl:w-[300px]"
                style={{ border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex flex-col items-center text-center" style={{ width: '100%' }}>
                    <UserAvatar
                      initials={selectedPatient.initials}
                      size={72}
                      bg={selectedPatient.avatarBg}
                    />
                    <p
                      className="font-display mt-2.5 font-semibold"
                      style={{ fontSize: 16, color: '#0D2630' }}
                    >
                      {selectedPatient.name}
                    </p>
                    <p style={{ fontSize: 14, color: '#00B4D8' }}>{selectedPatient.mrn}</p>
                    <span
                      className="mt-1.5 inline-block rounded-full px-2.5 py-0.5 font-sans font-medium"
                      style={{
                        fontSize: 14,
                        color: STATUS_CFG[selectedPatient.status].color,
                        border: `1px solid ${STATUS_CFG[selectedPatient.status].border}`,
                        background: STATUS_CFG[selectedPatient.status].bg,
                      }}
                    >
                      {selectedPatient.status}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedPatientId(null)}
                    aria-label="Close patient details"
                    className="-mt-1 -mr-1 flex size-8 shrink-0 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                  >
                    <X style={{ width: 16, height: 16, color: '#8A98A3' }} />
                  </button>
                </div>

                <div
                  className="mt-4 flex flex-col gap-3"
                  style={{ borderTop: '1px solid rgba(0,100,130,0.08)', paddingTop: 16 }}
                >
                  {[
                    {
                      label: 'Date of Birth',
                      value: `${formatHumanDate(selectedPatient.dateOfBirth)} (${selectedPatient.age} Yrs)`,
                      icon: Calendar,
                    },
                    { label: 'Gender', value: selectedPatient.gender, icon: Users },
                    { label: 'Phone Number', value: selectedPatient.phone, icon: Phone },
                  ].map((row) => (
                    <div key={row.label} className="flex items-start gap-2.5">
                      <row.icon
                        style={{ width: 15, height: 15, color: '#8A98A3' }}
                        className="mt-0.5 shrink-0"
                      />
                      <div className="min-w-0">
                        <p style={{ fontSize: 14, color: '#8A98A3' }}>{row.label}</p>
                        <p
                          className="truncate font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {row.value}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div>
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>Email</p>
                    <p
                      className="truncate font-sans font-medium"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {selectedPatient.email}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>Address</p>
                    <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                      {selectedPatient.address}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>Faculty/Department</p>
                    <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                      {selectedPatient.faculty}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>Blood Group</p>
                    <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                      {selectedPatient.bloodGroup}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>Insurance Provider</p>
                    <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                      {selectedPatient.insuranceProvider}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>Date Registered</p>
                    <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                      {formatHumanDate(selectedPatient.dateRegistered)}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>Last Visit</p>
                    <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                      {selectedPatient.lastVisit}
                    </p>
                  </div>
                </div>

                <div
                  className="mt-4"
                  style={{ borderTop: '1px solid rgba(0,100,130,0.08)', paddingTop: 16 }}
                >
                  <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
                    Quick Actions
                  </p>
                  <div className="mt-2.5 grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedPatient.id === CURATED_PATIENT_ID) {
                          router.push(ROUTES.registrationProfile);
                        } else {
                          toast.info(
                            'Not available',
                            'The full Patient Profile view is only built out for the demo patient so far.',
                          );
                        }
                      }}
                      className="flex flex-col items-center gap-1.5 rounded-[10px] py-3 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                      style={{
                        fontSize: 14,
                        color: '#00B4D8',
                        border: '1px solid rgba(0,180,216,0.3)',
                      }}
                    >
                      <Eye style={{ width: 16, height: 16 }} />
                      View Profile
                    </button>
                    <PermissionGate permission={PERMISSIONS.PATIENTS_WRITE}>
                      <button
                        type="button"
                        onClick={() => router.push(ROUTES.registrationCheckIn)}
                        className="flex flex-col items-center gap-1.5 rounded-[10px] py-3 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                        style={{
                          fontSize: 14,
                          color: '#22C55E',
                          border: '1px solid rgba(34,197,94,0.3)',
                        }}
                      >
                        <Users style={{ width: 16, height: 16 }} />
                        Check-In
                      </button>
                    </PermissionGate>
                    <button
                      type="button"
                      onClick={() => printCardsFor([selectedPatient])}
                      className="flex flex-col items-center gap-1.5 rounded-[10px] py-3 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                      style={{
                        fontSize: 14,
                        color: '#8B5CF6',
                        border: '1px solid rgba(139,92,246,0.3)',
                      }}
                    >
                      <Printer style={{ width: 16, height: 16 }} />
                      Print Card
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push(ROUTES.registrationAppointments)}
                      className="flex flex-col items-center gap-1.5 rounded-[10px] py-3 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                      style={{
                        fontSize: 14,
                        color: '#F59E0B',
                        border: '1px solid rgba(245,158,11,0.3)',
                      }}
                    >
                      <Calendar style={{ width: 16, height: 16 }} />
                      Schedule
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="h-4" />
        </div>
      </main>

      {assignCategoryOpen && (
        <AssignCategoryModal
          patientCount={selectedIds.size}
          onClose={() => setAssignCategoryOpen(false)}
          onAssign={handleAssignCategory}
        />
      )}
    </div>
  );
}
