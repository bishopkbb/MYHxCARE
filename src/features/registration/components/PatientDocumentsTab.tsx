'use client';

import { File, FileText, Upload, X } from 'lucide-react';
import { useRef, useState } from 'react';

import { FormDateInput } from '@components/shared/FormDateInput';
import { FormField } from '@components/shared/FormField';
import { FormSelect } from '@components/shared/FormSelect';
import { PermissionGate } from '@components/shared/PermissionGate';
import { Tooltip } from '@components/shared/Tooltip';
import { PERMISSIONS } from '@/constants/permissions';
import { HOSPITAL_DEPARTMENT_OPTIONS } from '@/constants/departments';
import { useToast } from '@/hooks/useToast';
import { formatHumanDate, toWATDateInput } from '@/utils/datetime';
import {
  CLINICAL_DOC_CATEGORIES,
  CLINICAL_DOC_CATEGORY_CFG,
  type ClinicalDocumentEntry,
} from '@/features/medical-records/__mocks__/medicalRecordDetailFixtures';
import {
  addPatientDocuments,
  removePatientDocument,
  usePatientDocuments,
} from '@/features/registration/store/patientDocumentStore';
import {
  attachLegacyRecordImages,
  removeLegacyRecordImage,
} from '@/features/registration/store/patientDirectoryStore';
import { LegacyRecordUpload } from '@/features/registration/components/LegacyRecordUpload';
import type { LegacyRecordImage } from '@/features/registration/types/legacyRecord.types';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

// Same 20MB/file precedent DocumentUploadWorkspace.tsx already uses for
// general clinical documents (PDF/JPG/PNG/TIFF) — deliberately not run
// through legacyRecordImageCompression.ts, which is JPG/PNG-image-specific
// and targets a 2MB budget that makes no sense for a multi-page PDF.
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

type PendingFile = { id: string; name: string; size: number };

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Register Patient Profile's "Documents" tab — two independent upload
 * surfaces for one patient:
 *  1. Legacy Paper Records (`LegacyRecordUpload`, reused as-is from the
 *     registration wizard) — only available for a real, previously
 *     registered patient (`isRealPatient`), since it writes through
 *     `attachLegacyRecordImages`/`removeLegacyRecordImage`, which operate
 *     on a real `DirectoryPatient` row that the curated demo persona
 *     doesn't have.
 *  2. General clinical documents (PDF/JPG/PNG/TIFF) — modelled on
 *     `DocumentUploadWorkspace.tsx`'s own upload form, but scoped to the
 *     single already-selected patient (no patient picker) and backed by
 *     `patientDocumentStore.ts` so an upload survives navigating away and
 *     back, unlike that screen's own page-local state. */
export function PatientDocumentsTab({
  patientId,
  isRealPatient,
  legacyRecordImages,
  onViewLegacyRecord,
}: {
  patientId: string;
  isRealPatient: boolean;
  legacyRecordImages: LegacyRecordImage[];
  onViewLegacyRecord: (image: LegacyRecordImage) => void;
}) {
  const toast = useToast();
  const documents = usePatientDocuments(patientId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [category, setCategory] = useState('');
  const [department, setDepartment] = useState('');
  const [documentDate, setDocumentDate] = useState(() => toWATDateInput());
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);

  function addFiles(fileList: FileList | null) {
    if (!fileList) return;
    const incoming = Array.from(fileList);
    const oversized = incoming.filter((f) => f.size > MAX_FILE_SIZE_BYTES);
    const accepted = incoming.filter((f) => f.size <= MAX_FILE_SIZE_BYTES);

    if (oversized.length > 0) {
      toast.error(
        oversized.length === 1 ? 'File too large' : `${oversized.length} files too large`,
        `${oversized.map((f) => f.name).join(', ')} exceed${oversized.length === 1 ? 's' : ''} the 20MB per-file limit and ${oversized.length === 1 ? 'was' : 'were'} not added.`,
      );
    }
    setPendingFiles((prev) => [
      ...prev,
      ...accepted.map((f, i) => ({ id: `${Date.now()}-${i}`, name: f.name, size: f.size })),
    ]);
  }

  function removePendingFile(id: string) {
    setPendingFiles((prev) => prev.filter((f) => f.id !== id));
  }

  const isValid = pendingFiles.length > 0 && category && department && documentDate;

  function handleUpload() {
    setSubmitted(true);
    if (!isValid) return;

    const chosenDateIso = new Date(`${documentDate}T10:00:00+01:00`).toISOString();
    const newDocs: ClinicalDocumentEntry[] = pendingFiles.map((f, i) => ({
      id: `doc-${Date.now()}-${i}`,
      name: f.name.replace(/\.[^/.]+$/, ''),
      subtitle: description.trim() || 'Uploaded document',
      category: category as ClinicalDocumentEntry['category'],
      fileType: /\.(png|jpe?g|gif|webp)$/i.test(f.name)
        ? 'Image'
        : /\.pdf$/i.test(f.name)
          ? 'PDF'
          : 'Other',
      department,
      createdBy: 'Registration Officer',
      dateCreated: chosenDateIso,
      // No visit-selection concept exists on this page (unlike
      // DocumentUploadWorkspace's own visit picker) — defaults to the
      // chosen document date rather than fabricating a visit link.
      visitDate: chosenDateIso,
    }));

    addPatientDocuments(patientId, newDocs);
    toast.success(
      'Upload complete',
      `${newDocs.length} document${newDocs.length !== 1 ? 's' : ''} added to this patient's record.`,
    );
    setPendingFiles([]);
    setCategory('');
    setDepartment('');
    setDocumentDate(toWATDateInput());
    setDescription('');
    setSubmitted(false);
  }

  return (
    <div className="flex flex-col gap-4">
      {isRealPatient ? (
        <LegacyRecordUpload
          images={legacyRecordImages}
          onAdd={(images) => attachLegacyRecordImages(patientId, images)}
          onRemove={(id) => removeLegacyRecordImage(patientId, id)}
          onViewImage={onViewLegacyRecord}
        />
      ) : (
        <div
          className="rounded-[12px] p-4 sm:p-5"
          style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
        >
          <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
            Legacy Paper Records
          </h2>
          <p className="mt-1" style={{ fontSize: 14, color: '#8A98A3' }}>
            Not available for this demo patient — legacy paper records can be attached to any
            patient registered through Register Patient.
          </p>
        </div>
      )}

      <div
        className="rounded-[12px] p-4 sm:p-5"
        style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
      >
        <div className="flex items-center gap-1.5">
          <Upload style={{ width: 16, height: 16, color: '#00B4D8' }} />
          <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
            Upload Document
          </h2>
        </div>
        <p className="mt-1" style={{ fontSize: 14, color: '#8A98A3' }}>
          Clinical notes, discharge summaries, referral letters, and other patient documents —
          distinct from Legacy Paper Records above.
        </p>

        <div className="mt-3.5 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
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
            className={`flex cursor-pointer flex-col items-center gap-3 rounded-[12px] py-10 text-center transition-colors duration-150 ${FOCUS_RING}`}
            style={{
              border: `2px dashed ${isDragging ? '#00B4D8' : 'rgba(0,100,130,0.25)'}`,
              background: isDragging ? '#E6F8FD' : '#F5FBFD',
            }}
          >
            <Upload style={{ width: 28, height: 28, color: '#00B4D8' }} />
            <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
              Drag and drop files here
            </p>
            <p style={{ fontSize: 14, color: '#8A98A3' }}>or</p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className={`flex h-10 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
              style={{ fontSize: 14, background: '#00B4D8' }}
            >
              Choose Files
            </button>
            <p style={{ fontSize: 14, color: '#8A98A3' }}>
              PDF, JPG, JPEG, PNG, TIFF &middot; Max 20MB per file
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

          <div className="flex flex-col gap-3.5">
            <FormField
              label="Document Type"
              htmlFor="doc-category"
              required
              error={submitted && !category ? 'Required' : undefined}
            >
              <FormSelect
                id="doc-category"
                value={category}
                onChange={setCategory}
                options={CLINICAL_DOC_CATEGORIES.map((c) => ({ value: c, label: c }))}
                placeholder="Select document type"
                hasError={submitted && !category}
              />
            </FormField>
            <FormField
              label="Department"
              htmlFor="doc-department"
              required
              error={submitted && !department ? 'Required' : undefined}
            >
              <FormSelect
                id="doc-department"
                value={department}
                onChange={setDepartment}
                options={HOSPITAL_DEPARTMENT_OPTIONS}
                placeholder="Select department"
                hasError={submitted && !department}
              />
            </FormField>
            <FormField
              label="Document Date"
              htmlFor="doc-date"
              required
              error={submitted && !documentDate ? 'Required' : undefined}
            >
              <FormDateInput
                id="doc-date"
                value={documentDate}
                onChange={(e) => setDocumentDate(e.target.value)}
                hasError={submitted && !documentDate}
              />
            </FormField>
          </div>
        </div>

        <div className="mt-3.5">
          <FormField label="Description (Optional)" htmlFor="doc-description">
            <textarea
              id="doc-description"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the document"
              className={`w-full resize-none rounded-[10px] px-3.5 py-2.5 font-sans transition-colors duration-150 placeholder:text-[#8A98A3] focus:border-[#00B4D8] focus:ring-2 focus:ring-[#00B4D8]/40 focus:outline-none ${FOCUS_RING}`}
              style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.18)' }}
            />
          </FormField>
        </div>

        {pendingFiles.length > 0 && (
          <div className="mt-3.5 flex flex-col gap-2">
            {pendingFiles.map((f) => (
              <div
                key={f.id}
                className="flex items-center gap-2.5 rounded-[10px] px-3.5 py-2.5"
                style={{ background: '#F5FBFD', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <File style={{ width: 16, height: 16, color: '#4A7080', flexShrink: 0 }} />
                <div className="min-w-0 flex-1">
                  <Tooltip content={f.name}>
                    <p
                      className="truncate font-sans font-medium"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {f.name}
                    </p>
                  </Tooltip>
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>{formatBytes(f.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removePendingFile(f.id)}
                  aria-label={`Remove ${f.name}`}
                  className={`flex size-11 shrink-0 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[rgba(239,68,68,0.08)] ${FOCUS_RING}`}
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

        <div className="mt-4 flex justify-end">
          <PermissionGate permission={PERMISSIONS.PATIENTS_WRITE}>
            <button
              type="button"
              onClick={handleUpload}
              className={`flex h-11 items-center gap-1.5 rounded-[10px] px-5 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
              style={{ fontSize: 14, background: '#00B4D8' }}
            >
              <Upload style={{ width: 15, height: 15 }} />
              Upload Documents
            </button>
          </PermissionGate>
        </div>
      </div>

      <div
        className="rounded-[12px] p-4 sm:p-5"
        style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
      >
        <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
          Uploaded Documents ({documents.length})
        </h2>

        {documents.length === 0 ? (
          <div className="mt-3.5 flex flex-col items-center rounded-[10px] px-4 py-8 text-center">
            <div
              className="flex size-14 items-center justify-center rounded-full"
              style={{ background: 'rgba(0,180,216,0.08)' }}
            >
              <FileText style={{ width: 22, height: 22, color: '#00B4D8' }} />
            </div>
            <p className="mt-3 font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
              No documents uploaded yet
            </p>
            <p className="mt-0.5 max-w-[300px]" style={{ fontSize: 14, color: '#8A98A3' }}>
              Documents added above will appear here.
            </p>
          </div>
        ) : (
          <div className="mt-3.5 flex flex-col gap-2.5">
            {documents.map((doc) => {
              const cfg = CLINICAL_DOC_CATEGORY_CFG[doc.category];
              const Icon = cfg.icon;
              return (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 rounded-[10px] p-3"
                  style={{ border: '1px solid rgba(0,100,130,0.12)' }}
                >
                  <div
                    className="flex size-10 shrink-0 items-center justify-center rounded-full"
                    style={{ background: `${cfg.iconColor}1F` }}
                  >
                    <Icon style={{ width: 17, height: 17, color: cfg.iconColor }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <Tooltip content={doc.name}>
                      <p
                        className="truncate font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {doc.name}
                      </p>
                    </Tooltip>
                    <p className="flex flex-wrap items-center gap-x-2" style={{ fontSize: 14 }}>
                      <span
                        className="rounded-full px-2 py-0.5 font-medium"
                        style={{
                          color: cfg.badgeColor,
                          border: `1px solid ${cfg.badgeBorder}`,
                          background: cfg.badgeBg,
                        }}
                      >
                        {doc.category}
                      </span>
                      <span style={{ color: '#8A98A3' }}>{doc.department}</span>
                      <span style={{ color: '#8A98A3' }}>{formatHumanDate(doc.dateCreated)}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removePatientDocument(patientId, doc.id)}
                    aria-label={`Remove ${doc.name}`}
                    className={`flex size-11 shrink-0 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[rgba(239,68,68,0.08)] ${FOCUS_RING}`}
                  >
                    <X style={{ width: 15, height: 15, color: '#EF4444' }} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
