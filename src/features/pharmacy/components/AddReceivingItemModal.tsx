'use client';

import { X } from 'lucide-react';
import { useState } from 'react';

import { FormSelect } from '@components/shared/FormSelect';
import {
  getCatalogEntry,
  INVENTORY_CATALOG,
  type StockReceiptItem,
} from '@/features/pharmacy/__mocks__/pharmacyFixtures';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const FIELD_LABEL = { fontSize: 14, color: '#0D2630' } as const;
const FIELD_INPUT_CLASS = `h-11 w-full rounded-[10px] px-3.5 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`;
const FIELD_INPUT_STYLE = {
  fontSize: 14,
  border: '1px solid rgba(0,100,130,0.18)',
  color: '#0D2630',
};

/** Adds a line item that wasn't on the original purchase order — e.g. an
 * extra item the supplier included in the same delivery. Lazy-loaded
 * (checklist §14). */
export function AddReceivingItemModal({
  excludeNames,
  onAdd,
  onClose,
}: {
  excludeNames: string[];
  onAdd: (item: StockReceiptItem) => void;
  onClose: () => void;
}) {
  const options = INVENTORY_CATALOG.filter((m) => !excludeNames.includes(m.name)).map((m) => ({
    value: m.name,
    label: `${m.name} ${m.strength} ${m.form}`,
  }));

  const [medicationName, setMedicationName] = useState('');
  const [batchNo, setBatchNo] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [qty, setQty] = useState('');

  const canSubmit = medicationName && batchNo.trim() && expiryDate && qty !== '' && Number(qty) > 0;

  function handleSubmit() {
    const entry = getCatalogEntry(medicationName);
    if (!entry || !canSubmit) return;
    const receivedQty = Number(qty);
    onAdd({
      medicationName: entry.name,
      strength: entry.strength,
      form: entry.form,
      unit: entry.unit,
      category: entry.category,
      batchNo: batchNo.trim(),
      expiryDate,
      orderedQty: receivedQty,
      receivedQty,
      unitPrice: entry.unitPrice,
      reorderLevel: entry.reorderLevel,
      ...(entry.controlledSchedule ? { controlledSchedule: entry.controlledSchedule } : {}),
    });
  }

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
        style={{ maxWidth: 460, maxHeight: 'calc(100vh - 64px)', borderRadius: 16 }}
      >
        <div
          className="flex shrink-0 items-start justify-between gap-3 px-6 py-5"
          style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
        >
          <h2
            className="font-display font-semibold"
            style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
          >
            Add Item
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

        <div className="min-h-0 flex-1 overflow-y-auto scroll-smooth px-6 py-5">
          <div className="flex flex-col gap-4">
            <div>
              <label
                htmlFor="ari-med"
                className="mb-1.5 block font-sans font-medium"
                style={FIELD_LABEL}
              >
                Medication
              </label>
              <FormSelect
                id="ari-med"
                value={medicationName}
                onChange={setMedicationName}
                options={options}
                placeholder="Select medication"
              />
            </div>
            <div>
              <label
                htmlFor="ari-batch"
                className="mb-1.5 block font-sans font-medium"
                style={FIELD_LABEL}
              >
                Batch No.
              </label>
              <input
                id="ari-batch"
                type="text"
                value={batchNo}
                onChange={(e) => setBatchNo(e.target.value)}
                placeholder="e.g. AMX2601"
                className={FIELD_INPUT_CLASS}
                style={FIELD_INPUT_STYLE}
              />
            </div>
            <div>
              <label
                htmlFor="ari-expiry"
                className="mb-1.5 block font-sans font-medium"
                style={FIELD_LABEL}
              >
                Expiry Date
              </label>
              <input
                id="ari-expiry"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className={FIELD_INPUT_CLASS}
                style={FIELD_INPUT_STYLE}
              />
            </div>
            <div>
              <label
                htmlFor="ari-qty"
                className="mb-1.5 block font-sans font-medium"
                style={FIELD_LABEL}
              >
                Quantity Received
              </label>
              <input
                id="ari-qty"
                type="number"
                min={1}
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                placeholder="e.g. 100"
                className={FIELD_INPUT_CLASS}
                style={FIELD_INPUT_STYLE}
              />
            </div>
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
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING}`}
            style={{ fontSize: 14, background: '#00B4D8' }}
          >
            Add Item
          </button>
        </div>
      </div>
    </div>
  );
}
