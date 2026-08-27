'use client';

import { X } from 'lucide-react';

import { formatDateTime } from '@/utils/datetime';
import type { CombinedAuditEntry } from './AdminAuditLogWorkspace';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p style={{ fontSize: 14, color: '#8A98A3' }}>{label}</p>
      <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
        {value}
      </p>
    </div>
  );
}

export function AuditEntryDetailModal({
  entry,
  onClose,
}: {
  entry: CombinedAuditEntry;
  onClose: () => void;
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
        style={{ maxWidth: 480, borderRadius: 16 }}
      >
        <div
          className="flex shrink-0 items-start justify-between gap-3 px-6 py-5"
          style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
        >
          <h2
            className="font-display font-semibold"
            style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
          >
            Audit Entry Details
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={`flex size-11 shrink-0 items-center justify-center rounded-full transition-colors duration-150 hover:bg-[rgba(0,0,0,0.06)] ${FOCUS_RING}`}
          >
            <X style={{ width: 20, height: 20, color: '#4A7080' }} />
          </button>
        </div>

        <div className="px-6 py-5">
          <div className="grid grid-cols-2 gap-4">
            <DetailRow label="Date & Time" value={formatDateTime(entry.timestamp)} />
            <DetailRow label="Status" value={entry.status} />
            <DetailRow label="User" value={entry.userName} />
            <DetailRow label="Role" value={entry.userRole} />
            <DetailRow label="Action" value={entry.action} />
            <DetailRow label="Module" value={entry.module} />
            <DetailRow label="IP Address" value={entry.ipAddress} />
            <DetailRow
              label="Source"
              value={entry.source === 'real' ? 'Live activity' : 'Sample activity'}
            />
          </div>
          <div className="mt-4">
            <p style={{ fontSize: 14, color: '#8A98A3' }}>Details</p>
            <p className="mt-0.5 font-sans" style={{ fontSize: 14, color: '#0D2630' }}>
              {entry.details}
            </p>
          </div>
        </div>

        <div
          className="flex shrink-0 items-center justify-end px-6 py-4"
          style={{ borderTop: '1px solid rgba(0,100,130,0.12)' }}
        >
          <button
            type="button"
            onClick={onClose}
            className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
            style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
