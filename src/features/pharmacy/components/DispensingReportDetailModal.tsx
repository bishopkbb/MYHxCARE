'use client';

import { X } from 'lucide-react';

import { formatCurrency } from '@/utils/currency';
import { formatHumanDate, formatTime } from '@/utils/datetime';
import type { DispensingReportRecord } from '@/features/pharmacy/__mocks__/dispensingReportFixtures';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <span style={{ fontSize: 14, color: '#4A7080' }}>{label}</span>
      <span className="text-right font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
        {value}
      </span>
    </div>
  );
}

/** Read-only detail view for a historical dispensing row — lazy-loaded
 * (checklist §14). Purely terminal history: nothing left to act on. */
export function DispensingReportDetailModal({
  record,
  onClose,
}: {
  record: DispensingReportRecord;
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
        style={{ maxWidth: 480, maxHeight: 'calc(100vh - 64px)', borderRadius: 16 }}
      >
        <div
          className="flex shrink-0 items-start justify-between gap-3 px-6 py-5"
          style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
        >
          <div className="min-w-0">
            <h2
              className="font-display font-semibold"
              style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
            >
              {record.id}
            </h2>
            <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
              {formatHumanDate(record.date)} · {formatTime(record.date)}
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

        <div className="min-h-0 flex-1 overflow-y-auto scroll-smooth px-6 py-3">
          <div className="rounded-[10px] bg-[#F5FBFD] px-3.5 py-2.5">
            <p
              className="truncate font-sans font-medium"
              style={{ fontSize: 14, color: '#0D2630' }}
            >
              {record.patientName}
            </p>
            <p style={{ fontSize: 14, color: '#4A7080' }}>{record.mrn}</p>
          </div>

          <div className="mt-1 divide-y" style={{ borderColor: 'rgba(0,100,130,0.08)' }}>
            <DetailRow label="Medication" value={`${record.medicationName} ${record.strength}`} />
            <DetailRow label="Form" value={record.form} />
            <DetailRow label="Qty Dispensed" value={String(record.qtyDispensed)} />
            <DetailRow label="Dispensed By" value={record.dispensedBy} />
            <DetailRow label="Department" value={record.department} />
            <DetailRow label="Total Value" value={formatCurrency(record.totalValue)} />
          </div>
        </div>

        <div
          className="flex shrink-0 items-center justify-end px-6 py-4"
          style={{ borderTop: '1px solid rgba(0,100,130,0.12)' }}
        >
          <button
            type="button"
            onClick={onClose}
            className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
            style={{ fontSize: 14, background: '#0F766E' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
