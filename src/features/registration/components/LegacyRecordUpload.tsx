'use client';

import { Camera, FileImage, Trash2, Upload } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRef, useState } from 'react';

import { FormField } from '@components/shared/FormField';
import { FormSelect } from '@components/shared/FormSelect';
import { ModalLoadingFallback } from '@components/shared/ModalLoadingFallback';
import { Tooltip } from '@components/shared/Tooltip';
import { useToast } from '@/hooks/useToast';
import { formatDateTime } from '@/utils/datetime';
import type { LegacyRecordImage } from '@/features/registration/types/legacyRecord.types';
import {
  compressCapturedImageToDataUrl,
  compressUploadedImageToDataUrl,
  LEGACY_RECORD_MAX_BYTES,
} from '@/features/registration/utils/legacyRecordImageCompression';
import { LEGACY_RECORD_TYPE_OPTIONS } from '@/features/registration/__mocks__/registerPatientOptions';

function recordTypeLabel(value: string | undefined): string | null {
  if (!value) return null;
  return LEGACY_RECORD_TYPE_OPTIONS.find((o) => o.value === value)?.label ?? null;
}

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

// Sane ceiling on a raw *source* file before compression even runs — same
// 20MB/file precedent DocumentUploadWorkspace.tsx already uses. Not the
// task's final ≤2MB *compressed* target — every accepted file is brought
// under LEGACY_RECORD_MAX_BYTES by compressUploadedImageToDataUrl below.
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png']);

const LegacyRecordCameraModal = dynamic(
  () => import('./LegacyRecordCameraModal').then((m) => m.LegacyRecordCameraModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-[12px] p-4 sm:p-5"
      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
    >
      <h2
        className="font-display font-semibold"
        style={{ fontSize: 16, lineHeight: '24px', color: '#0D2630' }}
      >
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function makeImageId(): string {
  return `legacy-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Register Patient's "Legacy Paper Records" card — lets an officer attach
 * scanned pages or camera photos of a patient's existing paper file
 * alongside the new digital registration. Deliberately kept separate from
 * "Patient Photograph": these are reference images of a paper document, not
 * a picture of the patient, and must never be mistaken for one downstream —
 * every thumbnail carries a "Legacy" label for that reason.
 *
 * All optional; state is owned by the caller (`register/page.tsx`, mirroring
 * `photoDataUrl`) so selections survive step navigation and a failed form
 * validation the same way the rest of the wizard's non-Zod state already
 * does. Every accepted image is brought under `LEGACY_RECORD_MAX_BYTES`
 * (2MB) via `legacyRecordImageCompression.ts` before being added to state —
 * an already-small source is left untouched, never inflated up to that
 * budget.
 *
 * The optional "Record Type" selector applies to whichever page(s) get
 * added next (upload or capture) — one selector for the whole next batch,
 * not a per-image editor, mirroring the Documents tab's own Document Type
 * field. Uses `LEGACY_RECORD_TYPE_OPTIONS`, a list deliberately distinct
 * from medical-records' `CLINICAL_DOC_CATEGORIES` — see
 * `legacyRecord.types.ts`'s `recordType` doc comment for why. */
export function LegacyRecordUpload({
  images,
  onAdd,
  onRemove,
  onViewImage,
}: {
  images: LegacyRecordImage[];
  onAdd: (images: LegacyRecordImage[]) => void;
  onRemove: (id: string) => void;
  /** Optional — when provided, clicking a thumbnail opens it full size
   * (e.g. `LegacyRecordViewerModal` from the Patient Profile Documents tab)
   * instead of the plain non-interactive preview used during registration,
   * where the officer just added the page and doesn't need to re-view it. */
  onViewImage?: (image: LegacyRecordImage) => void;
}) {
  const toast = useToast();
  const [uploading, setUploading] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [recordType, setRecordType] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;

    const accepted: File[] = [];
    const rejected: string[] = [];
    for (const file of files) {
      if (!ACCEPTED_TYPES.has(file.type) || file.size > MAX_UPLOAD_BYTES) {
        rejected.push(file.name);
        continue;
      }
      accepted.push(file);
    }

    if (rejected.length > 0) {
      toast.error(
        rejected.length === files.length ? 'No files added' : 'Some files were skipped',
        `${rejected.join(', ')} — only JPG or PNG images up to 20MB are accepted.`,
      );
    }
    if (accepted.length === 0) return;

    setUploading(true);
    try {
      const newImages: LegacyRecordImage[] = await Promise.all(
        accepted.map(async (file) => ({
          id: makeImageId(),
          dataUrl: await compressUploadedImageToDataUrl(file, LEGACY_RECORD_MAX_BYTES),
          fileName: file.name,
          source: 'upload' as const,
          addedAt: new Date().toISOString(),
          recordType: recordType || undefined,
        })),
      );
      onAdd(newImages);
    } catch {
      toast.error('Upload failed', 'Could not read one or more images. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  async function handleCameraCapture(rawDataUrl: string) {
    const dataUrl = await compressCapturedImageToDataUrl(rawDataUrl, LEGACY_RECORD_MAX_BYTES);
    onAdd([
      {
        id: makeImageId(),
        dataUrl,
        fileName: `Camera capture — ${formatDateTime(new Date())}`,
        source: 'camera',
        addedAt: new Date().toISOString(),
        recordType: recordType || undefined,
      },
    ]);
  }

  return (
    <Card title="Legacy Paper Records">
      <p className="mb-3.5" style={{ fontSize: 14, color: '#8A98A3' }}>
        Optional: add scanned pages or photos of the patient&apos;s existing paper file, if any.
        Stored as reference images only; they do not create clinical entries.
      </p>

      {images.length === 0 ? (
        <div
          className="flex flex-col items-center rounded-[10px] px-4 py-8 text-center"
          style={{ background: '#F5FBFD', border: '1px dashed rgba(0,100,130,0.25)' }}
        >
          <div
            className="flex size-14 items-center justify-center rounded-full"
            style={{ background: '#E2EDF1' }}
          >
            <FileImage style={{ width: 22, height: 22, color: '#8A98A3' }} />
          </div>
          <p className="mt-3 font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
            No legacy records added yet
          </p>
          <p className="mt-0.5 max-w-[260px]" style={{ fontSize: 14, color: '#8A98A3' }}>
            Add a page below if this patient has an existing paper file to bring forward.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2.5">
          {images.map((img) => (
            <div key={img.id} className="flex flex-col gap-1">
              <div
                className="relative overflow-hidden rounded-[10px]"
                style={{ aspectRatio: '1 / 1', background: '#E2EDF1' }}
              >
                {onViewImage ? (
                  <button
                    type="button"
                    onClick={() => onViewImage(img)}
                    aria-label={`View ${img.fileName} full size`}
                    className={`block size-full transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.dataUrl} alt="" className="size-full object-cover" />
                  </button>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img.dataUrl} alt="" className="size-full object-cover" />
                )}
                <span
                  className="absolute top-1.5 left-1.5 rounded-full px-2 py-0.5 font-sans font-medium"
                  style={{ fontSize: 14, color: '#FFFFFF', background: 'rgba(13,38,48,0.65)' }}
                >
                  Legacy
                </span>
                <button
                  type="button"
                  onClick={() => onRemove(img.id)}
                  aria-label={`Remove ${img.fileName}`}
                  className={`absolute top-0.5 right-0.5 flex size-11 items-center justify-center transition-colors duration-150 ${FOCUS_RING}`}
                >
                  <span
                    className="flex size-6 items-center justify-center rounded-full transition-colors duration-150 hover:bg-red-500"
                    style={{ background: 'rgba(13,38,48,0.65)' }}
                  >
                    <Trash2 style={{ width: 12, height: 12, color: '#FFFFFF' }} />
                  </span>
                </button>
              </div>
              <Tooltip content={img.fileName}>
                <p className="truncate" style={{ fontSize: 14, color: '#8A98A3' }}>
                  {img.fileName}
                </p>
              </Tooltip>
              {recordTypeLabel(img.recordType) && (
                <Tooltip content={recordTypeLabel(img.recordType) ?? ''}>
                  <p
                    className="truncate font-sans font-medium"
                    style={{ fontSize: 14, color: '#4A7080' }}
                  >
                    {recordTypeLabel(img.recordType)}
                  </p>
                </Tooltip>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-3.5 max-w-sm">
        <FormField
          label="Record Type"
          htmlFor="legacy-record-type"
          hint="Applies to the page(s) you add next."
        >
          <FormSelect
            id="legacy-record-type"
            value={recordType}
            onChange={setRecordType}
            options={LEGACY_RECORD_TYPE_OPTIONS}
            placeholder="Select record type (optional)"
          />
        </FormField>
      </div>

      <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className={`flex h-10 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#E6F8FD] disabled:opacity-50 ${FOCUS_RING}`}
          style={{ fontSize: 14, color: '#00B4D8', border: '1px solid #00B4D8' }}
        >
          <Upload style={{ width: 14, height: 14 }} />
          {uploading ? 'Uploading…' : 'Upload Image'}
        </button>
        <button
          type="button"
          onClick={() => setCameraOpen(true)}
          className={`flex h-10 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
          style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
        >
          <Camera style={{ width: 14, height: 14 }} />
          Take Photo
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png"
          multiple
          className="hidden"
          onChange={handleFilesChange}
        />
      </div>
      <p className="mt-2" style={{ fontSize: 14, color: '#8A98A3' }}>
        JPG or PNG only, up to 20MB — optimized automatically before saving. Add as many pages as
        needed.
      </p>

      {cameraOpen && (
        <LegacyRecordCameraModal
          onClose={() => setCameraOpen(false)}
          onCapture={handleCameraCapture}
        />
      )}
    </Card>
  );
}
