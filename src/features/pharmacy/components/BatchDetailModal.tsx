'use client';

import { X } from 'lucide-react';

import { getPharmacyLocation } from '@/constants/pharmacyLocations';
import { formatCurrency } from '@/utils/currency';
import { formatDate } from '@/utils/datetime';
import {
  getBatchDaysLeft,
  getBatchStatus,
  type BatchStatus,
  type InventoryBatchRow,
} from '@/features/pharmacy/__mocks__/pharmacyFixtures';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const STATUS_COLOR: Record<BatchStatus, string> = {
  Active: '#16A34A',
  'Expiring Soon': '#D97706',
  Expired: '#DC2626',
  'On Hold / Quarantine': '#7C3AED',
  'Out of Stock': '#64748B',
};

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

/** Full read-only detail of one batch — lazy-loaded (checklist §14). */
export function BatchDetailModal({
  row,
  onClose,
}: {
  row: InventoryBatchRow;
  onClose: () => void;
}) {
  const status = getBatchStatus(row);
  const daysLeft = getBatchDaysLeft(row);

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
              {row.medicationName} {row.strength}
            </h2>
            <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
              Batch {row.batchNo}
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
          <DetailRow label="Status" value={status} color={STATUS_COLOR[status]} />
          <DetailRow label="Form" value={row.form} />
          <DetailRow label="Category" value={row.category} />
          <DetailRow label="Location" value={getPharmacyLocation(row.locationId).name} />
          <DetailRow label="Manufacturer" value={row.manufacturer ?? '—'} />
          <DetailRow label="Supplier" value={row.supplier} />
          <DetailRow label="Mfg. Date" value={row.mfgDate ? formatDate(row.mfgDate) : '—'} />
          <DetailRow
            label="Expiry Date"
            value={`${formatDate(row.expiryDate)} (${daysLeft >= 0 ? `${daysLeft} days left` : `${Math.abs(daysLeft)} days ago`})`}
            {...(daysLeft <= 60 ? { color: daysLeft < 0 ? '#DC2626' : '#D97706' } : {})}
          />
          <DetailRow
            label="Stock Qty"
            value={`${row.stockQty.toLocaleString('en-GB')} ${row.unit}${row.stockQty === 1 ? '' : 's'}`}
          />
          <DetailRow label="Reorder Level" value={`${row.reorderLevel} ${row.unit}s`} />
          <DetailRow label="Unit Price" value={formatCurrency(row.unitPrice)} />
          <DetailRow
            label="Value (In Stock)"
            value={formatCurrency(row.stockQty * row.unitPrice)}
          />
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
