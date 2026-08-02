'use client';

import { X } from 'lucide-react';

import { getPharmacyLocation, type PharmacyLocationId } from '@/constants/pharmacyLocations';
import { formatCurrency } from '@/utils/currency';
import { formatHumanDate, formatTime } from '@/utils/datetime';
import {
  MOVEMENT_TYPE_CFG,
  type StockMovementRecord,
} from '@/features/pharmacy/__mocks__/stockMovementReportFixtures';

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

/** Read-only view of one real ledger row — lazy-loaded (checklist §14).
 * Every field here traces back to a real receipt, transfer, adjustment, or
 * return record; nothing on this screen is editable, so there's no write
 * action to offer beyond linking back to the source workflow's own reference
 * number. */
export function StockMovementReportDetailModal({
  record,
  onClose,
}: {
  record: StockMovementRecord;
  onClose: () => void;
}) {
  const typeCfg = MOVEMENT_TYPE_CFG[record.type];
  const location = getPharmacyLocation(record.locationId as PharmacyLocationId);

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
              className="font-display truncate font-semibold"
              style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
            >
              {record.medicationName} {record.strength}
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
          <div className="flex items-center justify-between gap-3 rounded-[10px] bg-[#F5FBFD] px-3.5 py-2.5">
            <span
              className="rounded-full px-2.5 py-0.5 font-sans font-medium"
              style={{
                fontSize: 14,
                whiteSpace: 'nowrap',
                color: typeCfg.color,
                border: `1px solid ${typeCfg.border}`,
                background: typeCfg.bg,
              }}
            >
              {record.type}
            </span>
            <span
              className="font-sans font-semibold"
              style={{ fontSize: 14, color: record.direction === 'In' ? '#16A34A' : '#DC2626' }}
            >
              {record.direction === 'In' ? '+' : '-'}
              {record.qty} units
            </span>
          </div>

          <div className="mt-1 divide-y" style={{ borderColor: 'rgba(0,100,130,0.08)' }}>
            <DetailRow label="Form" value={record.form} />
            <DetailRow label="Location" value={location.shortName} />
            <DetailRow label="Reference" value={record.reference} />
            <DetailRow label="Performed By" value={record.performedBy} />
            <DetailRow label="Reason" value={record.reason} />
            <DetailRow label="Unit Value" value={formatCurrency(record.unitValue)} />
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
