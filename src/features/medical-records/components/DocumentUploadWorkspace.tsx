'use client';

import {
  ChevronLeft,
  Download,
  Eye,
  File,
  FileText,
  Image as ImageIcon,
  Lock,
  Maximize2,
  MoreVertical,
  RefreshCw,
  ScanLine,
  Search,
  ShieldAlert,
  Upload,
  X,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';

import { AllergyBanner } from '@components/clinical/AllergyBanner';
import { FormDateInput } from '@components/shared/FormDateInput';
import { FormField } from '@components/shared/FormField';
import { FormSelect } from '@components/shared/FormSelect';
import { PermissionGate } from '@components/shared/PermissionGate';
import { PERMISSIONS } from '@/constants/permissions';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/useToast';
import { formatHumanDate } from '@/utils/datetime';
import type { DirectoryPatient } from '@/features/registration/__mocks__/patientDirectoryFixtures';
import { MOCK_PATIENT_PROFILE } from '@/features/registration/__mocks__/patientProfileFixtures';
import {
  CLINICAL_DOC_CATEGORIES,
  CLINICAL_DOC_CATEGORY_CFG,
  CURATED_CLINICAL_DOCUMENTS,
  generateClinicalDocumentsForPatient,
  generateVisitsForPatient,
  PATIENT_VISITS,
  type ClinicalDocumentEntry,
} from '@/features/medical-records/__mocks__/medicalRecordDetailFixtures';
import { toDateInputValue } from './MedicalRecordView';
import { PatientBanner, toCuratedBannerPatient } from './PatientBanner';
import { PatientPicker } from './PatientPicker';

const CURATED_PATIENT_ID = 'dp-001';
const ROWS_PER_PAGE = 10;

const DEPARTMENT_OPTIONS = [
  'General Outpatient Clinic',
  'Surgery',
  'Medical Ward',
  'Emergency Department',
  'Radiology',
  'Dental Clinic',
  'Physiotherapy',
  'Family Medicine',
].map((d) => ({ value: d, label: d }));

type PendingFile = { id: string; name: string; size: number };

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentUploadWorkspace() {
  const toast = useToast();
  const { can } = usePermissions();
  const canWrite = can(PERMISSIONS.PATIENTS_WRITE);
  const [selectedPatient, setSelectedPatient] = useState<DirectoryPatient | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [category, setCategory] = useState('');
  const [department, setDepartment] = useState('');
  const [visitId, setVisitId] = useState('');
  const [documentDate, setDocumentDate] = useState(() => toDateInputValue(new Date()));
  const [description, setDescription] = useState('');
  const [visibleToOthers, setVisibleToOthers] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [uploaded, setUploaded] = useState<ClinicalDocumentEntry[]>([]);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const isCurated = selectedPatient?.id === CURATED_PATIENT_ID;
  const bannerPatient = selectedPatient
    ? isCurated
      ? toCuratedBannerPatient(selectedPatient)
      : selectedPatient
    : null;
  const baseDocs = useMemo(() => {
    if (!selectedPatient) return [];
    return isCurated
      ? CURATED_CLINICAL_DOCUMENTS
      : generateClinicalDocumentsForPatient(selectedPatient);
  }, [selectedPatient, isCurated]);
  const visits = useMemo(() => {
    if (!selectedPatient) return [];
    return isCurated ? PATIENT_VISITS : generateVisitsForPatient(selectedPatient);
  }, [selectedPatient, isCurated]);
  const allergies = isCurated ? MOCK_PATIENT_PROFILE.allergies : [];

  const allDocs = useMemo(
    () =>
      [...uploaded, ...baseDocs].sort(
        (a, b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime(),
      ),
    [uploaded, baseDocs],
  );
  const filteredDocs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allDocs;
    return allDocs.filter(
      (d) => d.name.toLowerCase().includes(q) || d.category.toLowerCase().includes(q),
    );
  }, [allDocs, search]);
  const totalPages = Math.max(1, Math.ceil(filteredDocs.length / ROWS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * ROWS_PER_PAGE;
  const pageDocs = filteredDocs.slice(pageStart, pageStart + ROWS_PER_PAGE);
  const previewDoc = allDocs.find((d) => d.id === previewId) ?? allDocs[0] ?? null;

  function resetForm() {
    setPendingFiles([]);
    setCategory('');
    setDepartment('');
    setVisitId('');
    setDocumentDate(toDateInputValue(new Date()));
    setDescription('');
    setVisibleToOthers(false);
    setSubmitted(false);
  }

  function addFiles(fileList: FileList | null) {
    if (!fileList) return;
    const next: PendingFile[] = Array.from(fileList).map((f, i) => ({
      id: `${Date.now()}-${i}`,
      name: f.name,
      size: f.size,
    }));
    setPendingFiles((prev) => [...prev, ...next]);
  }

  function removeFile(id: string) {
    setPendingFiles((prev) => prev.filter((f) => f.id !== id));
  }

  const isValid = pendingFiles.length > 0 && category && department && documentDate;

  function handleUpload() {
    setSubmitted(true);
    if (!isValid || !selectedPatient) return;

    const now = new Date().toISOString();
    const visit = visits.find((v) => v.id === visitId);
    const chosenDate = new Date(`${documentDate}T10:00:00`).toISOString();
    const newDocs: ClinicalDocumentEntry[] = pendingFiles.map((f, i) => ({
      id: `upload-${Date.now()}-${i}`,
      name: f.name.replace(/\.[^/.]+$/, ''),
      subtitle: description.trim() || 'Uploaded document',
      category: category as ClinicalDocumentEntry['category'],
      fileType: /\.(png|jpe?g|gif|webp)$/i.test(f.name)
        ? 'Image'
        : /\.pdf$/i.test(f.name)
          ? 'PDF'
          : 'Other',
      department,
      createdBy: 'Mrs. Ngozi Asogwa',
      dateCreated: chosenDate,
      visitDate: visit?.dateTime ?? now,
    }));

    setUploaded((prev) => [...newDocs, ...prev]);
    toast.success(
      'Upload complete',
      `${newDocs.length} document${newDocs.length !== 1 ? 's' : ''} added to ${selectedPatient.name}'s record.${visibleToOthers ? ' Visible to other departments.' : ''}`,
    );
    resetForm();
  }

  function handleCancel() {
    resetForm();
    toast.info('Upload cancelled', 'No documents were added.');
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto max-w-[1440px] px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1
                className="font-display font-semibold"
                style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
              >
                Document Upload
              </h1>
              <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                {selectedPatient
                  ? 'Upload and manage patient clinical documents'
                  : 'Select a patient to upload and manage their clinical documents'}
              </p>
            </div>
            {selectedPatient && (
              <button
                type="button"
                onClick={() => {
                  setSelectedPatient(null);
                  resetForm();
                }}
                className="flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-white focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
              >
                <ChevronLeft style={{ width: 15, height: 15 }} />
                Change Patient
              </button>
            )}
          </div>

          {!selectedPatient || !bannerPatient ? (
            <div className="mt-5">
              <PatientPicker onSelect={setSelectedPatient} />
            </div>
          ) : (
            <>
              <PatientBanner patient={bannerPatient} />
              <AllergyBanner allergies={allergies} className="mt-4" />

              <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
                {/* ── Upload form ─────────────────────────────────────────── */}
                <div className="min-w-0">
                  {!canWrite ? (
                    <div
                      className="flex flex-col items-center gap-3 rounded-[12px] p-8 text-center"
                      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                    >
                      <ShieldAlert style={{ width: 32, height: 32, color: '#F59E0B' }} />
                      <p
                        className="font-sans font-semibold"
                        style={{ fontSize: 16, color: '#0D2630' }}
                      >
                        You don&apos;t have permission to upload documents
                      </p>
                      <p style={{ fontSize: 14, color: '#4A7080' }}>
                        Contact your administrator if you believe this is an error.
                      </p>
                    </div>
                  ) : (
                    <div
                      className="rounded-[12px] p-4 sm:p-5"
                      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                    >
                      <div className="flex items-center gap-1.5">
                        <Upload style={{ width: 16, height: 16, color: '#00B4D8' }} />
                        <h2
                          className="font-display font-semibold"
                          style={{ fontSize: 16, color: '#0D2630' }}
                        >
                          Upload New Document
                        </h2>
                      </div>

                      <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => fileInputRef.current?.click()}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            setIsDragging(true);
                          }}
                          onDragLeave={() => setIsDragging(false)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setIsDragging(false);
                            addFiles(e.dataTransfer.files);
                          }}
                          className="flex cursor-pointer flex-col items-center gap-3 rounded-[12px] py-12 text-center transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                          style={{
                            border: `2px dashed ${isDragging ? '#00B4D8' : 'rgba(0,100,130,0.25)'}`,
                            background: isDragging ? '#E6F8FD' : '#F5FBFD',
                          }}
                        >
                          <Upload style={{ width: 32, height: 32, color: '#00B4D8' }} />
                          <p
                            className="font-sans font-medium"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            Drag and drop files here
                          </p>
                          <p style={{ fontSize: 14, color: '#8A98A3' }}>or</p>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              fileInputRef.current?.click();
                            }}
                            className="flex h-11 items-center gap-1.5 rounded-[10px] px-5 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                            style={{ fontSize: 14, background: '#00B4D8' }}
                          >
                            Choose Files
                          </button>
                          <p style={{ fontSize: 14, color: '#8A98A3' }}>
                            Supported formats: PDF, JPG, JPEG, PNG, TIFF &middot; Max file size:
                            20MB
                          </p>
                          <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept=".pdf,.jpg,.jpeg,.png,.tif,.tiff"
                            onChange={(e) => addFiles(e.target.files)}
                            className="hidden"
                          />
                        </div>

                        <div className="flex flex-col gap-4">
                          <FormField
                            label="Document Type"
                            htmlFor="upload-category"
                            required
                            error={submitted && !category ? 'Required' : undefined}
                          >
                            <FormSelect
                              id="upload-category"
                              value={category}
                              onChange={setCategory}
                              options={CLINICAL_DOC_CATEGORIES.map((c) => ({ value: c, label: c }))}
                              placeholder="Select document type"
                              hasError={submitted && !category}
                            />
                          </FormField>
                          <FormField
                            label="Department"
                            htmlFor="upload-department"
                            required
                            error={submitted && !department ? 'Required' : undefined}
                          >
                            <FormSelect
                              id="upload-department"
                              value={department}
                              onChange={setDepartment}
                              options={DEPARTMENT_OPTIONS}
                              placeholder="Select department"
                              hasError={submitted && !department}
                            />
                          </FormField>
                          <div className="grid grid-cols-2 gap-3">
                            <FormField label="Visit (Optional)" htmlFor="upload-visit">
                              <FormSelect
                                id="upload-visit"
                                value={visitId}
                                onChange={setVisitId}
                                options={visits.map((v) => ({
                                  value: v.id,
                                  label: `${formatHumanDate(v.dateTime)}`,
                                }))}
                                placeholder="Select visit"
                              />
                            </FormField>
                            <FormField
                              label="Document Date"
                              htmlFor="upload-date"
                              required
                              error={submitted && !documentDate ? 'Required' : undefined}
                            >
                              <FormDateInput
                                id="upload-date"
                                value={documentDate}
                                onChange={(e) => setDocumentDate(e.target.value)}
                                hasError={submitted && !documentDate}
                              />
                            </FormField>
                          </div>
                          <FormField label="Description (Optional)" htmlFor="upload-description">
                            <textarea
                              id="upload-description"
                              rows={3}
                              value={description}
                              onChange={(e) => setDescription(e.target.value)}
                              placeholder="Enter a brief description of the document"
                              className="w-full resize-none rounded-[10px] px-3.5 py-2.5 font-sans transition-colors duration-150 placeholder:text-[#8A98A3] focus:border-[#00B4D8] focus:ring-2 focus:ring-[#00B4D8]/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                              style={{
                                fontSize: 14,
                                color: '#0D2630',
                                border: '1px solid rgba(0,100,130,0.18)',
                              }}
                            />
                          </FormField>
                          <label className="flex cursor-pointer items-center gap-2">
                            <input
                              type="checkbox"
                              checked={visibleToOthers}
                              onChange={(e) => setVisibleToOthers(e.target.checked)}
                              style={{ accentColor: '#00B4D8' }}
                              className="size-4 cursor-pointer rounded"
                            />
                            <span style={{ fontSize: 14, color: '#4A7080' }}>
                              Make document visible to other departments
                            </span>
                          </label>
                        </div>
                      </div>

                      {pendingFiles.length > 0 && (
                        <div className="mt-4 flex flex-col gap-2">
                          {pendingFiles.map((f) => (
                            <div
                              key={f.id}
                              className="flex items-center gap-2.5 rounded-[10px] px-3.5 py-2.5"
                              style={{
                                background: '#F5FBFD',
                                border: '1px solid rgba(0,100,130,0.12)',
                              }}
                            >
                              <File
                                style={{ width: 16, height: 16, color: '#4A7080', flexShrink: 0 }}
                              />
                              <div className="min-w-0 flex-1">
                                <p
                                  className="truncate font-sans font-medium"
                                  style={{ fontSize: 14, color: '#0D2630' }}
                                >
                                  {f.name}
                                </p>
                                <p style={{ fontSize: 14, color: '#8A98A3' }}>
                                  {formatBytes(f.size)}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeFile(f.id)}
                                aria-label={`Remove ${f.name}`}
                                className="flex size-8 shrink-0 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[rgba(239,68,68,0.08)] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                              >
                                <X style={{ width: 15, height: 15, color: '#EF4444' }} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      {submitted && pendingFiles.length === 0 && (
                        <p className="mt-2" style={{ fontSize: 14, color: '#EF4444' }}>
                          Add at least one file to upload.
                        </p>
                      )}

                      <div className="mt-5 flex justify-end gap-2.5">
                        <button
                          type="button"
                          onClick={handleCancel}
                          className="flex h-11 items-center gap-1.5 rounded-[10px] px-5 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                          style={{
                            fontSize: 14,
                            color: '#0D2630',
                            border: '1px solid rgba(0,100,130,0.2)',
                          }}
                        >
                          Cancel
                        </button>
                        <PermissionGate permission={PERMISSIONS.PATIENTS_WRITE}>
                          <button
                            type="button"
                            onClick={handleUpload}
                            className="flex h-11 items-center gap-1.5 rounded-[10px] px-5 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                            style={{ fontSize: 14, background: '#00B4D8' }}
                          >
                            <Upload style={{ width: 15, height: 15 }} />
                            Upload Documents
                          </button>
                        </PermissionGate>
                      </div>
                    </div>
                  )}

                  {/* ── Uploaded documents table ─────────────────────────────── */}
                  <div
                    className="mt-4 rounded-[12px] p-4 sm:p-5"
                    style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h2
                        className="font-display font-semibold"
                        style={{ fontSize: 16, color: '#0D2630' }}
                      >
                        Uploaded Documents ({allDocs.length})
                      </h2>
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <Search
                            style={{ width: 15, height: 15, color: '#8A98A3' }}
                            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
                          />
                          <input
                            type="text"
                            value={search}
                            onChange={(e) => {
                              setSearch(e.target.value);
                              setCurrentPage(1);
                            }}
                            placeholder="Search documents..."
                            className="h-10 rounded-[10px] pr-3.5 pl-9 font-sans transition-colors duration-150 placeholder:text-[#8A98A3] focus:border-[#00B4D8] focus:ring-2 focus:ring-[#00B4D8]/40 focus:outline-none"
                            style={{
                              fontSize: 14,
                              color: '#0D2630',
                              border: '1px solid rgba(0,100,130,0.18)',
                            }}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            toast.info('Filters', 'Use the search box to narrow this list.')
                          }
                          className="flex h-10 items-center gap-1.5 rounded-[10px] px-3.5 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                          style={{
                            fontSize: 14,
                            color: '#0D2630',
                            border: '1px solid rgba(0,100,130,0.18)',
                          }}
                        >
                          <ScanLine style={{ width: 15, height: 15, color: '#4A7080' }} />
                          Filter
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 overflow-x-auto scroll-smooth">
                      <div className="min-w-[1180px]">
                        <div
                          className="flex rounded-t-[8px]"
                          style={{
                            background: 'rgba(226,237,241,0.4)',
                            borderBottom: '1px solid #E6F8FD',
                          }}
                        >
                          <div className="min-w-[220px] flex-1 py-2.5 pr-2 pl-3">
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
                          <div className="w-40 shrink-0 py-2.5 pr-2">
                            <span
                              className="font-sans font-bold tracking-wider uppercase"
                              style={{ fontSize: 14, color: '#4A7080' }}
                            >
                              Department
                            </span>
                          </div>
                          <div className="w-40 shrink-0 py-2.5 pr-2">
                            <span
                              className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                              style={{ fontSize: 14, color: '#4A7080' }}
                            >
                              Uploaded By
                            </span>
                          </div>
                          <div className="w-32 shrink-0 py-2.5 pr-2">
                            <span
                              className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                              style={{ fontSize: 14, color: '#4A7080' }}
                            >
                              Upload Date
                            </span>
                          </div>
                          <div className="w-32 shrink-0 py-2.5 pr-2">
                            <span
                              className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                              style={{ fontSize: 14, color: '#4A7080' }}
                            >
                              Visit Date
                            </span>
                          </div>
                          <div className="w-32 shrink-0 py-2.5 pr-3 text-right">
                            <span
                              className="font-sans font-bold tracking-wider uppercase"
                              style={{ fontSize: 14, color: '#4A7080' }}
                            >
                              Actions
                            </span>
                          </div>
                        </div>

                        {pageDocs.length === 0 && (
                          <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
                            <p style={{ fontSize: 14, color: '#8A98A3' }}>
                              No documents match your search
                            </p>
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
                              <div className="flex min-w-[220px] flex-1 items-center gap-2.5 py-3 pr-2 pl-3">
                                <div
                                  className="flex size-9 shrink-0 items-center justify-center rounded-full"
                                  style={{ background: `${cfg.iconColor}1F` }}
                                >
                                  <Icon style={{ width: 16, height: 16, color: cfg.iconColor }} />
                                </div>
                                <p
                                  className="truncate font-sans font-medium"
                                  style={{ fontSize: 14, color: '#0D2630' }}
                                >
                                  {doc.name}
                                </p>
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
                              <div className="w-40 shrink-0 py-3 pr-2">
                                <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                                  {doc.department}
                                </p>
                              </div>
                              <div className="w-40 shrink-0 py-3 pr-2">
                                <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                                  {doc.createdBy}
                                </p>
                              </div>
                              <div className="w-32 shrink-0 py-3 pr-2">
                                <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                                  {formatHumanDate(doc.dateCreated)}
                                </p>
                              </div>
                              <div className="w-32 shrink-0 py-3 pr-2">
                                <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                                  {formatHumanDate(doc.visitDate)}
                                </p>
                              </div>
                              <div
                                className="flex w-32 shrink-0 items-center justify-end gap-1 py-3 pr-3"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  onClick={() => setPreviewId(doc.id)}
                                  aria-label={`Preview ${doc.name}`}
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
                                <button
                                  type="button"
                                  onClick={() =>
                                    toast.info(
                                      'Replace document',
                                      `Choose a new file to replace ${doc.name}.`,
                                    )
                                  }
                                  aria-label={`Replace ${doc.name}`}
                                  className="flex size-8 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                                >
                                  <RefreshCw style={{ width: 15, height: 15, color: '#4A7080' }} />
                                </button>
                                <div className="relative">
                                  <button
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
                                  {openMenuId === doc.id && (
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
                                    </div>
                                  )}
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
                          {Math.min(pageStart + ROWS_PER_PAGE, filteredDocs.length)} of{' '}
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
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
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
                          ))}
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
                            value={ROWS_PER_PAGE}
                            disabled
                            className="h-9 rounded-[8px] px-2 font-sans outline-none"
                            style={{
                              fontSize: 14,
                              border: '1px solid rgba(0,100,130,0.18)',
                              color: '#0D2630',
                            }}
                          >
                            <option value={ROWS_PER_PAGE}>{ROWS_PER_PAGE}</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Sidebar ───────────────────────────────────────────────── */}
                <div className="flex w-full shrink-0 flex-col gap-4">
                  <div
                    className="rounded-[12px] p-4"
                    style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    <h2
                      className="font-display font-semibold"
                      style={{ fontSize: 16, color: '#0D2630' }}
                    >
                      Accepted File Types
                    </h2>
                    <div className="mt-3 flex flex-col gap-3">
                      {[
                        { icon: FileText, color: '#EF4444', label: 'PDF Documents', ext: '.pdf' },
                        {
                          icon: ImageIcon,
                          color: '#3B82F6',
                          label: 'Image Files',
                          ext: '.jpg, .jpeg, .png',
                        },
                        {
                          icon: ScanLine,
                          color: '#8B5CF6',
                          label: 'Scanned Documents',
                          ext: '.tif, .tiff',
                        },
                      ].map((t) => (
                        <div key={t.label} className="flex items-center gap-2.5">
                          <div
                            className="flex size-9 shrink-0 items-center justify-center rounded-[10px]"
                            style={{ background: `${t.color}1F` }}
                          >
                            <t.icon style={{ width: 16, height: 16, color: t.color }} />
                          </div>
                          <div className="min-w-0">
                            <p
                              className="truncate font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {t.label}
                            </p>
                            <p style={{ fontSize: 14, color: '#8A98A3' }}>{t.ext}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div
                    className="rounded-[12px] p-4"
                    style={{
                      background: 'rgba(0,180,216,0.06)',
                      border: '1px solid rgba(0,180,216,0.2)',
                    }}
                  >
                    <h2
                      className="font-display font-semibold"
                      style={{ fontSize: 16, color: '#0D2630' }}
                    >
                      Tips
                    </h2>
                    <ul className="mt-3 flex flex-col gap-2">
                      {[
                        'Ensure the document is clear and legible',
                        'Use PDF format for multi-page documents',
                        'Maximum file size is 20MB per file',
                        'Sensitive documents will be access-controlled',
                      ].map((tip) => (
                        <li key={tip} className="flex items-start gap-2">
                          <span
                            className="mt-1.5 size-1.5 shrink-0 rounded-full"
                            style={{ background: '#00B4D8' }}
                          />
                          <span style={{ fontSize: 14, color: '#0D2630' }}>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div
                    className="flex flex-col overflow-hidden rounded-[12px]"
                    style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    <div className="flex items-center justify-between gap-2 p-4 pb-0">
                      <h2
                        className="font-display font-semibold"
                        style={{ fontSize: 16, color: '#0D2630' }}
                      >
                        Document Preview
                      </h2>
                      <button
                        type="button"
                        onClick={() =>
                          toast.info('Full-screen viewer', 'Opening the full document viewer.')
                        }
                        aria-label="Expand preview"
                        className="flex size-8 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                      >
                        <Maximize2 style={{ width: 15, height: 15, color: '#4A7080' }} />
                      </button>
                    </div>
                    {previewDoc ? (
                      <>
                        <div className="flex items-center justify-between gap-2 px-4 pt-3">
                          <div className="flex min-w-0 items-center gap-2">
                            <FileText
                              style={{ width: 14, height: 14, color: '#EF4444', flexShrink: 0 }}
                            />
                            <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                              {previewDoc.name} - {formatHumanDate(previewDoc.dateCreated)}
                            </p>
                          </div>
                          <span className="shrink-0" style={{ fontSize: 14, color: '#8A98A3' }}>
                            1 / 2
                          </span>
                        </div>
                        <div
                          className="m-4 rounded-[10px] p-4"
                          style={{
                            background: '#F5FBFD',
                            border: '1px solid rgba(0,100,130,0.10)',
                          }}
                        >
                          <p
                            className="font-display text-center font-semibold"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            UNIZIK MEDICAL CENTRE
                          </p>
                          <p className="text-center" style={{ fontSize: 14, color: '#4A7080' }}>
                            {previewDoc.category.toUpperCase()}
                          </p>
                          <div className="mt-3 flex flex-col gap-1">
                            <p style={{ fontSize: 14, color: '#4A7080' }}>
                              Patient Name:{' '}
                              <span style={{ color: '#0D2630' }}>{bannerPatient.name}</span>
                            </p>
                            <p style={{ fontSize: 14, color: '#4A7080' }}>
                              MRN: <span style={{ color: '#0D2630' }}>{bannerPatient.mrn}</span>
                            </p>
                            <p style={{ fontSize: 14, color: '#4A7080' }}>
                              Visit Date:{' '}
                              <span style={{ color: '#0D2630' }}>
                                {formatHumanDate(previewDoc.visitDate)}
                              </span>
                            </p>
                            <p style={{ fontSize: 14, color: '#4A7080' }}>
                              Department:{' '}
                              <span style={{ color: '#0D2630' }}>{previewDoc.department}</span>
                            </p>
                            <p style={{ fontSize: 14, color: '#4A7080' }}>
                              Recorded By:{' '}
                              <span style={{ color: '#0D2630' }}>{previewDoc.createdBy}</span>
                            </p>
                          </div>
                          <div
                            style={{ borderTop: '1px solid rgba(0,100,130,0.12)' }}
                            className="mt-3 pt-3"
                          >
                            <p
                              className="font-sans font-semibold"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              Notes
                            </p>
                            <p className="mt-1" style={{ fontSize: 14, color: '#4A7080' }}>
                              {previewDoc.subtitle}
                            </p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <p className="p-4" style={{ fontSize: 14, color: '#8A98A3' }}>
                        No document to preview yet.
                      </p>
                    )}
                  </div>
                </div>
              </div>

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
