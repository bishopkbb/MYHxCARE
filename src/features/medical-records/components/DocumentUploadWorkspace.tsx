'use client';

import { ChevronLeft, File, Lock, ShieldAlert, Upload, X } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';

import { AllergyBanner } from '@components/clinical/AllergyBanner';
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
  type ClinicalDocCategory,
  type ClinicalDocumentEntry,
} from '@/features/medical-records/__mocks__/medicalRecordDetailFixtures';
import { PatientBanner } from './PatientBanner';
import { PatientPicker } from './PatientPicker';

const CURATED_PATIENT_ID = 'dp-001';

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

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type PendingFile = { id: string; name: string; size: number };

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
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [uploaded, setUploaded] = useState<ClinicalDocumentEntry[]>([]);

  const isCurated = selectedPatient?.id === CURATED_PATIENT_ID;
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
  const recentUploads = useMemo(
    () =>
      [...uploaded, ...baseDocs]
        .sort((a, b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime())
        .slice(0, 6),
    [uploaded, baseDocs],
  );

  function resetForm() {
    setPendingFiles([]);
    setCategory('');
    setDepartment('');
    setVisitId('');
    setNotes('');
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

  const isValid = pendingFiles.length > 0 && category && department;

  function handleUpload() {
    setSubmitted(true);
    if (!isValid || !selectedPatient) return;

    const now = new Date().toISOString();
    const visit = visits.find((v) => v.id === visitId);
    const newDocs: ClinicalDocumentEntry[] = pendingFiles.map((f, i) => ({
      id: `upload-${Date.now()}-${i}`,
      name: f.name.replace(/\.[^/.]+$/, ''),
      subtitle: notes.trim() || 'Uploaded document',
      category: category as ClinicalDocCategory,
      fileType: /\.(png|jpe?g|gif|webp)$/i.test(f.name)
        ? 'Image'
        : /\.pdf$/i.test(f.name)
          ? 'PDF'
          : 'Other',
      department,
      createdBy: 'Mrs. Ngozi Asogwa',
      dateCreated: now,
      visitDate: visit?.dateTime ?? now,
    }));

    setUploaded((prev) => [...newDocs, ...prev]);
    toast.success(
      'Upload complete',
      `${newDocs.length} document${newDocs.length !== 1 ? 's' : ''} added to ${selectedPatient.name}'s record.`,
    );
    resetForm();
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto max-w-[1200px] px-4 py-4 sm:px-6 sm:py-5">
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
                  ? 'Scan or attach a document to this patient’s clinical record'
                  : 'Select a patient to upload documents to their record'}
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

          {!selectedPatient ? (
            <div className="mt-5">
              <PatientPicker onSelect={setSelectedPatient} />
            </div>
          ) : (
            <>
              <PatientBanner patient={selectedPatient} />
              <AllergyBanner allergies={allergies} className="mt-4" />

              <div className="mt-5 flex flex-col gap-4 xl:flex-row xl:items-start">
                <div className="min-w-0 flex-1">
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
                      <h2
                        className="font-display font-semibold"
                        style={{ fontSize: 16, color: '#0D2630' }}
                      >
                        Upload New Documents
                      </h2>

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
                        className="mt-3 flex cursor-pointer flex-col items-center gap-2 rounded-[12px] py-10 text-center transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                        style={{
                          border: `2px dashed ${isDragging ? '#00B4D8' : 'rgba(0,100,130,0.25)'}`,
                          background: isDragging ? '#E6F8FD' : '#F5FBFD',
                        }}
                      >
                        <div
                          className="flex size-14 items-center justify-center rounded-full"
                          style={{ background: 'rgba(0,180,216,0.12)' }}
                        >
                          <Upload style={{ width: 24, height: 24, color: '#00B4D8' }} />
                        </div>
                        <p
                          className="font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          Drag &amp; drop files here, or click to browse
                        </p>
                        <p style={{ fontSize: 14, color: '#8A98A3' }}>
                          PDF, JPG or PNG up to 20MB per file
                        </p>
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => addFiles(e.target.files)}
                          className="hidden"
                        />
                      </div>

                      {pendingFiles.length > 0 && (
                        <div className="mt-3 flex flex-col gap-2">
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

                      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                      </div>

                      <div className="mt-4">
                        <FormField label="Link to Visit (optional)" htmlFor="upload-visit">
                          <FormSelect
                            id="upload-visit"
                            value={visitId}
                            onChange={setVisitId}
                            options={visits.map((v) => ({
                              value: v.id,
                              label: `${formatHumanDate(v.dateTime)} — ${v.department}`,
                            }))}
                            placeholder="No visit selected"
                          />
                        </FormField>
                      </div>

                      <div className="mt-4">
                        <FormField label="Notes (optional)" htmlFor="upload-notes">
                          <textarea
                            id="upload-notes"
                            rows={3}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add context for this document"
                            className="w-full resize-none rounded-[10px] px-3.5 py-2.5 font-sans transition-colors duration-150 placeholder:text-[#8A98A3] focus:border-[#00B4D8] focus:ring-2 focus:ring-[#00B4D8]/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                            style={{
                              fontSize: 14,
                              color: '#0D2630',
                              border: '1px solid rgba(0,100,130,0.18)',
                            }}
                          />
                        </FormField>
                      </div>

                      <div className="mt-5 flex justify-end">
                        <PermissionGate permission={PERMISSIONS.PATIENTS_WRITE}>
                          <button
                            type="button"
                            onClick={handleUpload}
                            className="flex h-11 items-center gap-1.5 rounded-[10px] px-5 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                            style={{ fontSize: 14, background: '#00B4D8' }}
                          >
                            <Upload style={{ width: 15, height: 15 }} />
                            Upload
                            {pendingFiles.length > 0
                              ? ` ${pendingFiles.length} Document${pendingFiles.length !== 1 ? 's' : ''}`
                              : ' Documents'}
                          </button>
                        </PermissionGate>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex w-full shrink-0 flex-col gap-4 xl:w-[340px]">
                  <div
                    className="rounded-[12px] p-4"
                    style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    <h2
                      className="font-display font-semibold"
                      style={{ fontSize: 16, color: '#0D2630' }}
                    >
                      Recently Uploaded
                    </h2>
                    <div className="mt-3 flex flex-col gap-3">
                      {recentUploads.length === 0 ? (
                        <p style={{ fontSize: 14, color: '#8A98A3' }}>No documents yet.</p>
                      ) : (
                        recentUploads.map((doc) => {
                          const cfg = CLINICAL_DOC_CATEGORY_CFG[doc.category];
                          const Icon = cfg.icon;
                          return (
                            <div key={doc.id} className="flex items-start gap-2.5">
                              <div
                                className="flex size-8 shrink-0 items-center justify-center rounded-full"
                                style={{ background: `${cfg.iconColor}1F` }}
                              >
                                <Icon style={{ width: 15, height: 15, color: cfg.iconColor }} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p
                                  className="truncate font-sans font-medium"
                                  style={{ fontSize: 14, color: '#0D2630' }}
                                >
                                  {doc.name}
                                </p>
                                <p style={{ fontSize: 14, color: '#8A98A3' }}>
                                  {doc.category} &middot; {formatHumanDate(doc.dateCreated)}
                                </p>
                              </div>
                            </div>
                          );
                        })
                      )}
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
                      Upload Guidelines
                    </h2>
                    <ul className="mt-3 flex flex-col gap-2">
                      {[
                        'Accepted formats: PDF, JPG, PNG.',
                        'Maximum file size: 20MB per document.',
                        'Scan documents at 300 DPI or higher for legibility.',
                        'Select the document type that best matches its content — this drives where it appears under Clinical Documents.',
                        'Linking a visit helps clinicians find this document from the visit timeline.',
                      ].map((line) => (
                        <li key={line} className="flex items-start gap-2">
                          <span
                            className="mt-2 size-1.5 shrink-0 rounded-full"
                            style={{ background: '#8A98A3' }}
                          />
                          <span style={{ fontSize: 14, color: '#4A7080' }}>{line}</span>
                        </li>
                      ))}
                    </ul>
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
