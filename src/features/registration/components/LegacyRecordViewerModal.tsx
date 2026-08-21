'use client';

import { X } from 'lucide-react';

import { formatDateTime } from '@/utils/datetime';
import type { LegacyRecordImage } from '@/features/registration/types/legacyRecord.types';
import { LEGACY_RECORD_TYPE_OPTIONS } from '@/features/registration/__mocks__/registerPatientOptions';

function recordTypeLabel(value: string | undefined): string | null {
  if (!value) return null;
  return LEGACY_RECORD_TYPE_OPTIONS.find((o) => o.value === value)?.label ?? null;
}

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

/** Full-size read-only viewer for a single legacy paper record page — opened
 * from wherever a patient's legacy records are displayed (the doctor's
 * clinical chart Attachments tab, the Registration module's own Patient
 * Profile Documents tab). Deliberately not an editor and not a second upload
 * entry point — legacy records are only ever added during registration
 * (`LegacyRecordUpload.tsx`); this is purely a way to actually read a
 * thumbnail-sized scan. Always carries the "Legacy Paper Record" label so
 * it's never mistaken for a live clinical document, per the UNIZIK
 * legacy-record task's non-negotiable requirement. Lives in the
 * registration feature (not patients/medical-records) because that's where
 * `LegacyRecordImage` itself is owned — other features consume it from here,
 * not the reverse. */
export function LegacyRecordViewerModal({
  image,
  onClose,
}: {
  image: LegacyRecordImage;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(13,38,48,0.7)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex w-full flex-col overflow-hidden bg-white"
        style={{ maxWidth: 720, maxHeight: 'calc(100vh - 64px)', borderRadius: 16 }}
      >
        <div
          className="flex shrink-0 items-start justify-between gap-3 px-6 py-5"
          style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
        >
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className="inline-flex items-center rounded-full px-2.5 py-0.5 font-sans font-medium"
                style={{ fontSize: 14, color: '#FFFFFF', background: '#4A7080' }}
              >
                Legacy Paper Record
              </span>
              {recordTypeLabel(image.recordType) && (
                <span
                  className="inline-flex items-center rounded-full px-2.5 py-0.5 font-sans font-medium"
                  style={{
                    fontSize: 14,
                    color: '#00B4D8',
                    border: '1px solid rgba(0,180,216,0.4)',
                  }}
                >
                  {recordTypeLabel(image.recordType)}
                </span>
              )}
            </div>
            <p className="mt-1.5" style={{ fontSize: 14, color: '#4A7080' }}>
              Reference image only — not part of this patient&apos;s clinical record.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={`flex size-11 shrink-0 items-center justify-center rounded-full transition-colors duration-150 hover:bg-[rgba(0,0,0,0.06)] ${FOCUS_RING}`}
          >
            <X style={{ width: 20, height: 20, color: '#4A7080' }} />
          </button>
        </div>

        <div
          className="min-h-0 flex-1 overflow-y-auto scroll-smooth p-4"
          style={{ background: '#0D2630' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image.dataUrl}
            alt=""
            className="mx-auto max-h-full max-w-full object-contain"
          />
        </div>

        <div
          className="flex shrink-0 flex-wrap items-center justify-between gap-2 px-6 py-4"
          style={{ borderTop: '1px solid rgba(0,100,130,0.12)' }}
        >
          <p style={{ fontSize: 14, color: '#8A98A3' }}>{image.fileName}</p>
          <p style={{ fontSize: 14, color: '#8A98A3' }}>Added {formatDateTime(image.addedAt)}</p>
        </div>
      </div>
    </div>
  );
}
