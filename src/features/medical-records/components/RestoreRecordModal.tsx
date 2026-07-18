'use client';

import { ArchiveRestore, X } from 'lucide-react';

import type { ArchivedRecord } from '@/features/medical-records/__mocks__/archivedRecordFixtures';

export function RestoreRecordModal({
  record,
  onClose,
  onConfirm,
}: {
  record: ArchivedRecord;
  onClose: () => void;
  onConfirm: (id: string) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(13,38,48,0.45)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex w-full flex-col overflow-hidden bg-white"
        style={{ maxWidth: 440, borderRadius: 16 }}
      >
        <div className="flex items-start justify-between gap-3 px-6 py-5">
          <div
            className="flex size-11 shrink-0 items-center justify-center rounded-full"
            style={{ background: 'rgba(34,197,94,0.12)' }}
          >
            <ArchiveRestore style={{ width: 20, height: 20, color: '#22C55E' }} />
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-11 shrink-0 items-center justify-center rounded-full transition-colors duration-150 hover:bg-[rgba(0,0,0,0.06)] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
          >
            <X style={{ width: 20, height: 20, color: '#4A7080' }} />
          </button>
        </div>

        <div className="px-6 pb-2">
          <h2 className="font-display font-semibold" style={{ fontSize: 18, color: '#0D2630' }}>
            Restore this record?
          </h2>
          <p className="mt-1.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
            <span className="font-sans font-medium" style={{ color: '#0D2630' }}>
              {record.patientName}
            </span>{' '}
            ({record.mrn}) will move back to the active patient register and become searchable
            across the workspace again.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2.5 px-6 py-5">
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
            style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(record.id)}
            className="flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
            style={{ fontSize: 14, background: '#22C55E' }}
          >
            Restore Record
          </button>
        </div>
      </div>
    </div>
  );
}
