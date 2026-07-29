'use client';

import { X } from 'lucide-react';

import { getPharmacyLocation } from '@/constants/pharmacyLocations';
import { formatCurrency } from '@/utils/currency';
import { formatDateTime } from '@/utils/datetime';
import { Tooltip } from '@components/shared/Tooltip';
import {
  getAdjustmentQty,
  getAdjustmentValueImpact,
  type StockAdjustment,
} from '@/features/pharmacy/__mocks__/pharmacyFixtures';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

function DetailRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span style={{ fontSize: 14, color: '#4A7080' }}>{label}</span>
      <span
        className="text-right font-sans font-medium"
        style={{ fontSize: 14, color: color ?? '#0D2630' }}
      >
        {value}
      </span>
    </div>
  );
}

/** Full detail of one adjustment — lazy-loaded (checklist §14). */
export function AdjustmentDetailModal({
  adjustment,
  onClose,
}: {
  adjustment: StockAdjustment;
  onClose: () => void;
}) {
  const qty = getAdjustmentQty(adjustment);
  const valueImpact = getAdjustmentValueImpact(adjustment);
  const isIncrease = adjustment.adjustmentType === 'Increase';

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
        style={{ maxWidth: 560, maxHeight: 'calc(100vh - 64px)', borderRadius: 16 }}
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
              {adjustment.id}
            </h2>
            <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
              {getPharmacyLocation(adjustment.locationId).name}
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

        <div className="min-h-0 flex-1 overflow-y-auto scroll-smooth px-6 py-5">
          <div className="pb-3" style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}>
            <DetailRow
              label="Type"
              value={adjustment.adjustmentType}
              color={isIncrease ? '#16A34A' : '#DC2626'}
            />
            <DetailRow label="Reason" value={adjustment.reason} />
            <DetailRow label="Adjusted By" value={adjustment.adjustedBy} />
            <DetailRow label="Date & Time" value={formatDateTime(adjustment.adjustedAt)} />
            {adjustment.referenceNo && (
              <DetailRow label="Reference" value={adjustment.referenceNo} />
            )}
            <DetailRow
              label="Total Qty"
              value={`${isIncrease ? '+' : '-'}${qty.toLocaleString('en-GB')}`}
              color={isIncrease ? '#16A34A' : '#DC2626'}
            />
            <DetailRow
              label="Value Impact"
              value={`${valueImpact >= 0 ? '+' : '-'}${formatCurrency(Math.abs(valueImpact))}`}
              color={isIncrease ? '#16A34A' : '#DC2626'}
            />
          </div>

          {adjustment.notes && (
            <p className="mt-3" style={{ fontSize: 14, color: '#4A7080' }}>
              <span className="font-sans font-medium" style={{ color: '#0D2630' }}>
                Notes:{' '}
              </span>
              {adjustment.notes}
            </p>
          )}

          <p className="mt-4 mb-2 font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
            Items ({adjustment.items.length})
          </p>
          <div className="flex flex-col gap-2">
            {adjustment.items.map((item) => (
              <div
                key={`${item.medicationName}-${item.batchNo}`}
                className="flex items-center justify-between gap-2 rounded-[8px] px-3 py-2"
                style={{ background: '#F5FBFD' }}
              >
                <div className="min-w-0">
                  <Tooltip content={`${item.medicationName} ${item.strength}`}>
                    <p
                      className="truncate font-sans font-medium"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {item.medicationName} {item.strength}
                    </p>
                  </Tooltip>
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>Batch {item.batchNo}</p>
                </div>
                <p
                  className="shrink-0 font-sans font-medium"
                  style={{ fontSize: 14, color: isIncrease ? '#16A34A' : '#DC2626' }}
                >
                  {isIncrease ? '+' : '-'}
                  {item.qty} {item.unit}
                  {item.qty === 1 ? '' : 's'}
                </p>
              </div>
            ))}
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
