'use client';

import {
  ChevronDown,
  ChevronLeft,
  Download,
  Eye,
  Lock,
  MoreVertical,
  Printer,
  Upload,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState, type RefObject } from 'react';

import { AllergyBanner } from '@components/clinical/AllergyBanner';
import { FormDateInput } from '@components/shared/FormDateInput';
import { FormSelect } from '@components/shared/FormSelect';
import { PermissionGate } from '@components/shared/PermissionGate';
import { RowMenuPortal } from '@components/shared/RowMenuPortal';
import { PERMISSIONS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
import { useToast } from '@/hooks/useToast';
import { formatHumanDate } from '@/utils/datetime';
import type { DirectoryPatient } from '@/features/registration/__mocks__/patientDirectoryFixtures';
import { MOCK_PATIENT_PROFILE } from '@/features/registration/__mocks__/patientProfileFixtures';
import {
  CLINICAL_DOC_CATEGORIES,
  CLINICAL_DOC_CATEGORY_CFG,
  CURATED_CLINICAL_DOCUMENTS,
  generateClinicalDocumentsForPatient,
  generateDocActivityFromDocs,
  type ClinicalDocCategory,
  type ClinicalDocumentEntry,
} from '@/features/medical-records/__mocks__/medicalRecordDetailFixtures';
import { PatientBanner, toCuratedBannerPatient } from './PatientBanner';
import { PatientPicker } from './PatientPicker';

const CURATED_PATIENT_ID = 'dp-001';
const ROWS_PER_PAGE_OPTIONS = [10, 25, 50];

const CATEGORY_TABS: { value: ClinicalDocCategory | 'All'; label: string }[] = [
  { value: 'All', label: 'All Documents' },
  { value: 'Consultation Note', label: 'Consultation Notes' },
  { value: 'Discharge Summary', label: 'Discharge Summaries' },
  { value: 'Referral Letter', label: 'Referral Letters' },
  { value: 'Medical Certificate', label: 'Medical Certificates' },
  { value: 'Imaging Report', label: 'Imaging Reports' },
  { value: 'Consent Form', label: 'Consent Forms' },
];

const FILE_TYPE_COLOR: Record<string, string> = {
  PDF: '#EF4444',
  Image: '#3B82F6',
  Other: '#8A98A3',
};

function StorageDonut({ docs }: { docs: ClinicalDocumentEntry[] }) {
  const counts = useMemo(() => {
    const byType: Record<string, number> = { PDF: 0, Image: 0, Other: 0 };
    docs.forEach((d) => {
      byType[d.fileType] = (byType[d.fileType] ?? 0) + 1;
    });
    return byType;
  }, [docs]);
  const total = docs.length || 1;
  const data = (['PDF', 'Image', 'Other'] as const).map((label) => ({
    label,
    value: counts[label] ?? 0,
    color: FILE_TYPE_COLOR[label] ?? '#8A98A3',
  }));

  const radius = 54;
  const strokeWidth = 20;
  const circumference = 2 * Math.PI * radius;
  const gapPx = 3;
  let cumulative = 0;
  const segments = data
    .filter((d) => d.value > 0)
    .map((d) => {
      const rawLength = (d.value / total) * circumference;
      const offset = -(cumulative / total) * circumference;
      cumulative += d.value;
      return { ...d, length: Math.max(0, rawLength - gapPx), offset };
    });

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className="relative flex items-center justify-center"
        style={{ width: 150, height: 150 }}
      >
        <svg
          viewBox="0 0 128 128"
          style={{ width: 150, height: 150 }}
          role="img"
          aria-label="Storage by file type"
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
          <span className="font-display font-bold" style={{ fontSize: 24, color: '#0D2630' }}>
            {docs.length}
          </span>
          <span style={{ fontSize: 14, color: '#8A98A3' }}>Total Documents</span>
        </div>
      </div>
      <div className="flex flex-col gap-1.5 self-stretch">
        {data.map((d) => (
          <div key={d.label} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: d.color }} />
              <span style={{ fontSize: 14, color: '#4A7080' }}>{d.label} Files</span>
            </div>
            <span className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
              {d.value} ({total > 0 ? Math.round((d.value / total) * 100) : 0}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ClinicalDocumentsWorkspace() {
  const router = useRouter();
  const toast = useToast();
  const [selectedPatient, setSelectedPatient] = useState<DirectoryPatient | null>(null);
  const [actionsOpen, setActionsOpen] = useState(false);
  const actionsButtonRef = useRef<HTMLButtonElement>(null);

  const isCurated = selectedPatient?.id === CURATED_PATIENT_ID;
  const allDocs = useMemo(() => {
    if (!selectedPatient) return [];
    return isCurated
      ? CURATED_CLINICAL_DOCUMENTS
      : generateClinicalDocumentsForPatient(selectedPatient);
  }, [selectedPatient, isCurated]);
  const activity = useMemo(() => generateDocActivityFromDocs(allDocs), [allDocs]);
  const allergies = isCurated ? MOCK_PATIENT_PROFILE.allergies : [];

  const [category, setCategory] = useState<ClinicalDocCategory | 'All'>('All');
  const [department, setDepartment] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const departmentOptions = useMemo(
    () =>
      Array.from(new Set(allDocs.map((d) => d.department))).map((d) => ({ value: d, label: d })),
    [allDocs],
  );
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allDocs.forEach((d) => {
      counts[d.category] = (counts[d.category] ?? 0) + 1;
    });
    return counts;
  }, [allDocs]);

  const filteredDocs = useMemo(() => {
    return allDocs.filter((d) => {
      if (category !== 'All' && d.category !== category) return false;
      if (department && d.department !== department) return false;
      if (dateFrom && new Date(d.dateCreated) < new Date(`${dateFrom}T00:00:00`)) return false;
      if (dateTo && new Date(d.dateCreated) > new Date(`${dateTo}T23:59:59`)) return false;
      return true;
    });
  }, [allDocs, category, department, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filteredDocs.length / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * rowsPerPage;
  const pageDocs = filteredDocs.slice(pageStart, pageStart + rowsPerPage);

  const docMenuButtonRefs = useMemo(() => {
    const map = new Map<string, RefObject<HTMLButtonElement | null>>();
    for (const doc of pageDocs) map.set(doc.id, { current: null });
    return map;
  }, [pageDocs]);

  function getDocMenuButtonRef(id: string) {
    return docMenuButtonRefs.get(id) ?? { current: null };
  }

  function selectCategory(value: ClinicalDocCategory | 'All') {
    setCategory(value);
    setCurrentPage(1);
  }

  function resetFilters() {
    setCategory('All');
    setDepartment('');
    setDateFrom('');
    setDateTo('');
    setCurrentPage(1);
    toast.info('Filters cleared', 'Showing all clinical documents.');
  }

  function applyFilters() {
    toast.success(
      'Filters applied',
      `${filteredDocs.length} document${filteredDocs.length !== 1 ? 's' : ''} match your filters.`,
    );
  }

  function notImplemented(action: string) {
    toast.info(action, 'This action will be wired up once the endpoint is ready.');
    setActionsOpen(false);
  }

  function handlePrint() {
    toast.success(
      'Preparing document',
      `${selectedPatient?.name}'s document list is being prepared for printing.`,
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto max-w-[1440px] px-4 py-4 sm:px-6 sm:py-5">
          {/* ── Breadcrumb ────────────────────────────────────────────────── */}
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => router.push(ROUTES.medicalRecordsDashboard)}
              className="transition-colors duration-150 hover:text-[#00B4D8] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
              style={{ fontSize: 14, color: '#8A98A3' }}
            >
              Dashboard
            </button>
            <span style={{ fontSize: 14, color: '#8A98A3' }}>/</span>
            <button
              type="button"
              onClick={() => router.push(ROUTES.medicalRecords)}
              className="transition-colors duration-150 hover:text-[#00B4D8] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
              style={{ fontSize: 14, color: '#8A98A3' }}
            >
              Medical Records
            </button>
            <span style={{ fontSize: 14, color: '#8A98A3' }}>/</span>
            <span className="font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
              Clinical Documents
            </span>
          </nav>

          {/* ── Title + actions ──────────────────────────────────────────── */}
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1
                className="font-display font-semibold"
                style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
              >
                Clinical Documents
              </h1>
              <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                {selectedPatient
                  ? 'View, manage and organize patient clinical documents'
                  : 'Select a patient to view their clinical documents'}
              </p>
            </div>
            {selectedPatient && (
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedPatient(null)}
                  className="flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-white focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                  style={{
                    fontSize: 14,
                    color: '#0D2630',
                    border: '1px solid rgba(0,100,130,0.2)',
                  }}
                >
                  <ChevronLeft style={{ width: 15, height: 15 }} />
                  Change Patient
                </button>
                <PermissionGate permission={PERMISSIONS.PATIENTS_WRITE}>
                  <button
                    type="button"
                    onClick={() => router.push(ROUTES.medicalRecordsDocumentUpload)}
                    className="flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-white focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                    style={{
                      fontSize: 14,
                      color: '#0D2630',
                      border: '1px solid rgba(0,100,130,0.2)',
                    }}
                  >
                    <Upload style={{ width: 15, height: 15 }} />
                    Upload Document
                  </button>
                  <div className="relative">
                    <button
                      ref={actionsButtonRef}
                      type="button"
                      onClick={() => setActionsOpen((o) => !o)}
                      className="flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                      style={{ fontSize: 14, background: '#00B4D8' }}
                    >
                      Actions
                      <ChevronDown
                        style={{
                          width: 15,
                          height: 15,
                          transition: 'transform 150ms',
                          transform: actionsOpen ? 'rotate(180deg)' : 'none',
                        }}
                      />
                    </button>
                    <RowMenuPortal
                      open={actionsOpen}
                      anchorRef={actionsButtonRef}
                      onClose={() => setActionsOpen(false)}
                      width={208}
                    >
                      <button
                        type="button"
                        onClick={handlePrint}
                        className="flex w-full items-center px-4 py-2 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD]"
                        style={{ fontSize: 14, color: '#2F3A40' }}
                      >
                        Print Document List
                      </button>
                      <button
                        type="button"
                        onClick={() => notImplemented('Bulk Download')}
                        className="flex w-full items-center px-4 py-2 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD]"
                        style={{ fontSize: 14, color: '#2F3A40' }}
                      >
                        Bulk Download
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          router.push(ROUTES.medicalRecordsRequests);
                          setActionsOpen(false);
                        }}
                        className="flex w-full items-center px-4 py-2 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD]"
                        style={{ fontSize: 14, color: '#2F3A40' }}
                      >
                        Request Missing Document
                      </button>
                    </RowMenuPortal>
                  </div>
                </PermissionGate>
              </div>
            )}
          </div>

          {!selectedPatient ? (
            <div className="mt-5">
              <PatientPicker onSelect={setSelectedPatient} />
            </div>
          ) : (
            <>
              <PatientBanner
                patient={isCurated ? toCuratedBannerPatient(selectedPatient) : selectedPatient}
              />
              <AllergyBanner allergies={allergies} className="mt-4" />

              {/* ── Category tabs ─────────────────────────────────────────── */}
              <div className="mt-4 overflow-x-auto scroll-smooth">
                <div
                  className="flex gap-1"
                  style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
                >
                  {CATEGORY_TABS.map((tab) => (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => selectCategory(tab.value)}
                      className="shrink-0 px-3.5 py-2.5 font-sans font-medium whitespace-nowrap transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                      style={{
                        fontSize: 14,
                        color: category === tab.value ? '#00B4D8' : '#4A7080',
                        borderBottom:
                          category === tab.value ? '2px solid #00B4D8' : '2px solid transparent',
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Content + sidebar ─────────────────────────────────────── */}
              <div className="mt-5 flex flex-col gap-4 xl:flex-row xl:items-start">
                <div className="min-w-0 flex-1">
                  <div
                    className="rounded-[12px] p-4 sm:p-5"
                    style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <label
                          className="mb-1.5 block font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          Document Type
                        </label>
                        <FormSelect
                          id="clinical-doc-type"
                          value={category === 'All' ? '' : category}
                          onChange={(v) =>
                            selectCategory((v || 'All') as ClinicalDocCategory | 'All')
                          }
                          options={CLINICAL_DOC_CATEGORIES.map((c) => ({ value: c, label: c }))}
                          placeholder="All Types"
                        />
                      </div>
                      <div>
                        <label
                          className="mb-1.5 block font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          Department
                        </label>
                        <FormSelect
                          id="clinical-doc-department"
                          value={department}
                          onChange={setDepartment}
                          options={departmentOptions}
                          placeholder="All Departments"
                        />
                      </div>
                      <div className="sm:col-span-2 lg:col-span-2">
                        <label
                          className="mb-1.5 block font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          Date Range
                        </label>
                        <div className="flex items-center gap-2">
                          <div className="min-w-0 flex-1">
                            <FormDateInput
                              value={dateFrom}
                              onChange={(e) => setDateFrom(e.target.value)}
                              aria-label="From date"
                            />
                          </div>
                          <span className="shrink-0" style={{ fontSize: 14, color: '#8A98A3' }}>
                            –
                          </span>
                          <div className="min-w-0 flex-1">
                            <FormDateInput
                              value={dateTo}
                              onChange={(e) => setDateTo(e.target.value)}
                              aria-label="To date"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2.5">
                      <button
                        type="button"
                        onClick={applyFilters}
                        className="flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                        style={{ fontSize: 14, color: '#00B4D8', border: '1px solid #00B4D8' }}
                      >
                        Filter
                      </button>
                      <button
                        type="button"
                        onClick={resetFilters}
                        className="flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                        style={{
                          fontSize: 14,
                          color: '#0D2630',
                          border: '1px solid rgba(0,100,130,0.2)',
                        }}
                      >
                        Reset
                      </button>
                    </div>

                    <div className="mt-3 overflow-x-auto scroll-smooth">
                      <div className="min-w-[910px]">
                        <div
                          className="flex rounded-t-[8px]"
                          style={{
                            background: 'rgba(226,237,241,0.4)',
                            borderBottom: '1px solid #E6F8FD',
                          }}
                        >
                          <div className="min-w-0 flex-1 py-2.5 pr-2 pl-3">
                            <span
                              className="font-sans font-bold tracking-wider uppercase"
                              style={{ fontSize: 14, color: '#4A7080' }}
                            >
                              Document Name
                            </span>
                          </div>
                          <div className="w-48 shrink-0 py-2.5 pr-2">
                            <span
                              className="font-sans font-bold tracking-wider uppercase"
                              style={{ fontSize: 14, color: '#4A7080' }}
                            >
                              Type
                            </span>
                          </div>
                          <div className="w-44 shrink-0 py-2.5 pr-2">
                            <span
                              className="font-sans font-bold tracking-wider uppercase"
                              style={{ fontSize: 14, color: '#4A7080' }}
                            >
                              Department
                            </span>
                          </div>
                          <div className="w-32 shrink-0 py-2.5 pr-2">
                            <span
                              className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                              style={{ fontSize: 14, color: '#4A7080' }}
                            >
                              Date Created
                            </span>
                          </div>
                          <div className="w-40 shrink-0 py-2.5 pr-2">
                            <span
                              className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                              style={{ fontSize: 14, color: '#4A7080' }}
                            >
                              Created By
                            </span>
                          </div>
                          <div className="w-28 shrink-0 py-2.5 pr-3 text-right">
                            <span
                              className="font-sans font-bold tracking-wider uppercase"
                              style={{ fontSize: 14, color: '#4A7080' }}
                            >
                              Actions
                            </span>
                          </div>
                        </div>

                        {pageDocs.length === 0 && (
                          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                            <div
                              className="flex size-14 items-center justify-center rounded-full"
                              style={{ background: 'rgba(226,237,241,0.6)' }}
                            >
                              <Eye style={{ width: 24, height: 24, color: '#8A98A3' }} />
                            </div>
                            <p
                              className="font-sans font-medium"
                              style={{ fontSize: 16, color: '#4A7080' }}
                            >
                              No documents match your filters
                            </p>
                            <button
                              type="button"
                              onClick={resetFilters}
                              className="mt-1 font-sans font-medium transition-colors duration-150 hover:underline focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                              style={{ fontSize: 14, color: '#00B4D8' }}
                            >
                              Clear all filters
                            </button>
                          </div>
                        )}

                        {pageDocs.map((doc) => {
                          const cfg = CLINICAL_DOC_CATEGORY_CFG[doc.category];
                          const Icon = cfg.icon;
                          return (
                            <div
                              key={doc.id}
                              className="flex items-center"
                              style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                            >
                              <div className="flex min-w-0 flex-1 items-center gap-2.5 py-3 pr-2 pl-3">
                                <div
                                  className="flex size-9 shrink-0 items-center justify-center rounded-full"
                                  style={{ background: `${cfg.iconColor}1F` }}
                                >
                                  <Icon style={{ width: 16, height: 16, color: cfg.iconColor }} />
                                </div>
                                <div className="min-w-0">
                                  <p
                                    className="truncate font-sans font-medium"
                                    style={{ fontSize: 14, color: '#0D2630' }}
                                  >
                                    {doc.name}
                                  </p>
                                  <p
                                    className="truncate"
                                    style={{ fontSize: 14, color: '#4A7080' }}
                                  >
                                    {doc.subtitle}
                                  </p>
                                </div>
                              </div>
                              <div className="w-48 shrink-0 py-3 pr-2">
                                <span
                                  className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium"
                                  style={{
                                    fontSize: 14,
                                    whiteSpace: 'nowrap',
                                    color: cfg.badgeColor,
                                    border: `1px solid ${cfg.badgeBorder}`,
                                    background: cfg.badgeBg,
                                  }}
                                >
                                  {doc.category}
                                </span>
                              </div>
                              <div className="w-44 shrink-0 py-3 pr-2">
                                <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                                  {doc.department}
                                </p>
                              </div>
                              <div className="w-32 shrink-0 py-3 pr-2">
                                <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                                  {formatHumanDate(doc.dateCreated)}
                                </p>
                              </div>
                              <div className="w-40 shrink-0 py-3 pr-2">
                                <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                                  {doc.createdBy}
                                </p>
                              </div>
                              <div
                                className="flex w-28 shrink-0 items-center justify-end gap-1 py-3 pr-3"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  onClick={() =>
                                    toast.info('Opening document', `Viewing ${doc.name}.`)
                                  }
                                  aria-label={`View ${doc.name}`}
                                  className="flex size-8 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                                >
                                  <Eye style={{ width: 15, height: 15, color: '#4A7080' }} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    toast.success('Download started', `${doc.name} is downloading.`)
                                  }
                                  aria-label={`Download ${doc.name}`}
                                  className="flex size-8 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                                >
                                  <Download style={{ width: 15, height: 15, color: '#4A7080' }} />
                                </button>
                                <div className="relative">
                                  <button
                                    ref={getDocMenuButtonRef(doc.id)}
                                    type="button"
                                    onClick={() =>
                                      setOpenMenuId((id) => (id === doc.id ? null : doc.id))
                                    }
                                    aria-label={`More actions for ${doc.name}`}
                                    className="flex size-8 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                                  >
                                    <MoreVertical
                                      style={{ width: 15, height: 15, color: '#4A7080' }}
                                    />
                                  </button>
                                  <RowMenuPortal
                                    open={openMenuId === doc.id}
                                    anchorRef={getDocMenuButtonRef(doc.id)}
                                    onClose={() => setOpenMenuId(null)}
                                    width={176}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => {
                                        toast.info('Rename document', `Renaming ${doc.name}.`);
                                        setOpenMenuId(null);
                                      }}
                                      className="flex w-full items-center px-4 py-2 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD]"
                                      style={{ fontSize: 14, color: '#2F3A40' }}
                                    >
                                      Rename Document
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        toast.success(
                                          'Shared',
                                          `${doc.name} shared with care team.`,
                                        );
                                        setOpenMenuId(null);
                                      }}
                                      className="flex w-full items-center px-4 py-2 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD]"
                                      style={{ fontSize: 14, color: '#2F3A40' }}
                                    >
                                      Share Document
                                    </button>
                                  </RowMenuPortal>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {filteredDocs.length > 0 && (
                      <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
                        <p style={{ fontSize: 14, color: '#4A7080' }}>
                          Showing {pageStart + 1} to{' '}
                          {Math.min(pageStart + rowsPerPage, filteredDocs.length)} of{' '}
                          {filteredDocs.length} documents
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
                          {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter(
                              (p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1,
                            )
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

                {/* ── Sidebar ───────────────────────────────────────────────── */}
                <div className="flex w-full shrink-0 flex-col gap-4 xl:w-[340px]">
                  <div
                    className="rounded-[12px] p-4"
                    style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    <h2
                      className="font-display font-semibold"
                      style={{ fontSize: 16, color: '#0D2630' }}
                    >
                      Document Categories
                    </h2>
                    <div className="mt-3 flex flex-col gap-1">
                      {CATEGORY_TABS.map((tab) => {
                        const count =
                          tab.value === 'All' ? allDocs.length : (categoryCounts[tab.value] ?? 0);
                        const active = category === tab.value;
                        return (
                          <button
                            key={tab.value}
                            type="button"
                            onClick={() => selectCategory(tab.value)}
                            className="flex items-center justify-between gap-2 rounded-[8px] px-2.5 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                            style={{ background: active ? '#E6F8FD' : 'transparent' }}
                          >
                            <span
                              className="truncate font-sans font-medium"
                              style={{ fontSize: 14, color: active ? '#00B4D8' : '#0D2630' }}
                            >
                              {tab.label}
                            </span>
                            <span
                              className="shrink-0 rounded-full px-2 py-0.5 font-sans font-semibold"
                              style={{
                                fontSize: 14,
                                color: active ? '#00B4D8' : '#4A7080',
                                background: active
                                  ? 'rgba(0,180,216,0.12)'
                                  : 'rgba(138,152,163,0.12)',
                              }}
                            >
                              {count}
                            </span>
                          </button>
                        );
                      })}
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
                      Storage Summary
                    </h2>
                    <div className="mt-3">
                      <StorageDonut docs={allDocs} />
                    </div>
                  </div>

                  <PermissionGate permission={PERMISSIONS.PATIENTS_WRITE}>
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
                      <div className="mt-3 grid grid-cols-2 gap-2.5">
                        <button
                          type="button"
                          onClick={() => router.push(ROUTES.medicalRecordsDocumentUpload)}
                          className="flex h-11 items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                          style={{
                            fontSize: 14,
                            color: '#00B4D8',
                            border: '1px solid rgba(0,180,216,0.35)',
                          }}
                        >
                          Upload Document
                        </button>
                        <button
                          type="button"
                          onClick={() => notImplemented('Link to Visit')}
                          className="flex h-11 items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                          style={{
                            fontSize: 14,
                            color: '#4A7080',
                            border: '1px solid rgba(0,100,130,0.2)',
                          }}
                        >
                          Link to Visit
                        </button>
                        <button
                          type="button"
                          onClick={() => router.push(ROUTES.medicalRecordsRequests)}
                          className="flex h-11 items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                          style={{
                            fontSize: 14,
                            color: '#4A7080',
                            border: '1px solid rgba(0,100,130,0.2)',
                          }}
                        >
                          Document Request
                        </button>
                        <button
                          type="button"
                          onClick={handlePrint}
                          className="flex h-11 items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                          style={{
                            fontSize: 14,
                            color: '#4A7080',
                            border: '1px solid rgba(0,100,130,0.2)',
                          }}
                        >
                          <Printer style={{ width: 14, height: 14 }} />
                          Print List
                        </button>
                      </div>
                    </div>
                  </PermissionGate>

                  <div
                    className="rounded-[12px] p-4"
                    style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    <h2
                      className="font-display font-semibold"
                      style={{ fontSize: 16, color: '#0D2630' }}
                    >
                      Recent Activity
                    </h2>
                    <div className="mt-3 flex flex-col gap-3">
                      {activity.map((act) => {
                        const Icon = act.icon;
                        return (
                          <div key={act.id} className="flex items-start gap-2.5">
                            <div
                              className="flex size-8 shrink-0 items-center justify-center rounded-full"
                              style={{ background: act.iconBg }}
                            >
                              <Icon style={{ width: 15, height: 15, color: act.iconColor }} />
                            </div>
                            <div className="min-w-0">
                              <p style={{ fontSize: 14, color: '#8A98A3' }}>
                                {formatHumanDate(act.dateTime)}
                              </p>
                              <p
                                className="font-sans font-medium"
                                style={{ fontSize: 14, color: '#0D2630' }}
                              >
                                {act.label}
                              </p>
                              <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                                {act.detail}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Confidentiality notice ───────────────────────────────── */}
              <div
                className="mt-5 flex items-center gap-2.5 rounded-[10px] px-4 py-3"
                style={{
                  background: 'rgba(0,180,216,0.06)',
                  border: '1px solid rgba(0,180,216,0.2)',
                }}
              >
                <Lock style={{ width: 16, height: 16, color: '#00B4D8', flexShrink: 0 }} />
                <p style={{ fontSize: 14, color: '#0D2630' }}>
                  Medical records are confidential and access is role-based. All activities are
                  logged for audit purposes.
                </p>
              </div>
            </>
          )}

          <div className="h-4" />
        </div>
      </main>
    </div>
  );
}
