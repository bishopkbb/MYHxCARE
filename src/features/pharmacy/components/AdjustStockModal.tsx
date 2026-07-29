'use client';

import { X } from 'lucide-react';
import { useState } from 'react';

import { getPharmacyLocation } from '@/constants/pharmacyLocations';
import { formatDate } from '@/utils/datetime';
import type { InventoryBatchRow } from '@/features/pharmacy/__mocks__/pharmacyFixtures';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span style={{ fontSize: 14, color: '#4A7080' }}>{label}</span>
      <span className="text-right font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
        {value}
      </span>
    </div>
  );
}

/** Views a batch's full detail and, for pharmacists, corrects its on-hand
 * quantity and reorder level — lazy-loaded (checklist §14). A real write
 * against inventoryStore.ts, reflected immediately in the table/stats/donut
 * of every screen that shares it. */
export function AdjustStockModal({
  row,
  onAdjust,
  onClose,
}: {
  row: InventoryBatchRow;
  onAdjust: (id: string, newQty: number, newReorderLevel: number) => void;
  onClose: () => void;
}) {
  const [newQty, setNewQty] = useState(String(row.stockQty));
  const [newReorderLevel, setNewReorderLevel] = useState(String(row.reorderLevel));
  const parsedQty = Number(newQty);
  const parsedReorderLevel = Number(newReorderLevel);
  const canSubmit =
    newQty !== '' &&
    Number.isFinite(parsedQty) &&
    parsedQty >= 0 &&
    newReorderLevel !== '' &&
    Number.isFinite(parsedReorderLevel) &&
    parsedReorderLevel >= 0;

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
        style={{ maxWidth: 440, maxHeight: 'calc(100vh - 64px)', borderRadius: 16 }}
      >
        <div
          className="flex shrink-0 items-start justify-between gap-3 px-6 py-5"
          style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
        >
          <div>
            <h2
              className="font-display font-semibold"
              style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
            >
              {row.medicationName}
            </h2>
            <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
              {row.strength} {row.form} — Batch {row.batchNo}
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
          <div style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }} className="pb-3">
            <DetailRow label="Category" value={row.category} />
            <DetailRow label="Location" value={getPharmacyLocation(row.locationId).name} />
            <DetailRow label="Supplier" value={row.supplier} />
            <DetailRow label="Expiry Date" value={formatDate(row.expiryDate)} />
          </div>

          <div className="mt-4">
            <label
              htmlFor="adjust-qty"
              className="mb-1.5 block font-sans font-medium"
              style={{ fontSize: 14, color: '#0D2630' }}
            >
              Stock Quantity ({row.unit}s)
            </label>
            <input
              id="adjust-qty"
              type="number"
              min={0}
              value={newQty}
              onChange={(e) => setNewQty(e.target.value)}
              className={`h-11 w-full rounded-[10px] px-3.5 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
              style={{ fontSize: 14, border: '1px solid rgba(0,100,130,0.18)', color: '#0D2630' }}
            />
            <p className="mt-1.5" style={{ fontSize: 14, color: '#8A98A3' }}>
              Currently {row.stockQty} {row.unit}
              {row.stockQty === 1 ? '' : 's'} on hand.
            </p>
          </div>

          <div className="mt-4">
            <label
              htmlFor="adjust-reorder"
              className="mb-1.5 block font-sans font-medium"
              style={{ fontSize: 14, color: '#0D2630' }}
            >
              Reorder Level ({row.unit}s)
            </label>
            <input
              id="adjust-reorder"
              type="number"
              min={0}
              value={newReorderLevel}
              onChange={(e) => setNewReorderLevel(e.target.value)}
              className={`h-11 w-full rounded-[10px] px-3.5 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
              style={{ fontSize: 14, border: '1px solid rgba(0,100,130,0.18)', color: '#0D2630' }}
            />
            <p className="mt-1.5" style={{ fontSize: 14, color: '#8A98A3' }}>
              Stock at or below this threshold triggers a reorder alert.
            </p>
          </div>
        </div>

        <div
          className="flex shrink-0 items-center justify-end gap-2.5 px-6 py-4"
          style={{ borderTop: '1px solid rgba(0,100,130,0.12)' }}
        >
          <button
            type="button"
            onClick={onClose}
            className={`flex h-11 items-center rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
            style={{ fontSize: 14, color: '#4A7080', border: '1px solid rgba(0,100,130,0.18)' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => canSubmit && onAdjust(row.id, parsedQty, parsedReorderLevel)}
            disabled={!canSubmit}
            className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING}`}
            style={{ fontSize: 14, background: '#00B4D8' }}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
