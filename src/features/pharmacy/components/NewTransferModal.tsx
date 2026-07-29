'use client';

import { Plus, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';

import { FormSelect } from '@components/shared/FormSelect';
import {
  INVENTORY_LOCATION_OPTIONS,
  type StockTransferItem,
} from '@/features/pharmacy/__mocks__/pharmacyFixtures';
import { getBatchesAtLocation } from '@/features/pharmacy/store/inventoryStore';
import type { PharmacyLocationId } from '@/constants/pharmacyLocations';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const FIELD_LABEL = { fontSize: 14, color: '#0D2630' } as const;
const FIELD_INPUT_CLASS = `h-11 w-full rounded-[10px] px-3.5 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`;
const FIELD_INPUT_STYLE = {
  fontSize: 14,
  border: '1px solid rgba(0,100,130,0.18)',
  color: '#0D2630',
};

/** Requests a new inter-location transfer — lazy-loaded (checklist §14).
 * Items are picked from the source location's actual current stock, so a
 * transfer can never be requested for more than is really on hand there. */
export function NewTransferModal({
  onSubmit,
  onClose,
}: {
  onSubmit: (input: {
    fromLocationId: PharmacyLocationId;
    toLocationId: PharmacyLocationId;
    items: StockTransferItem[];
    notes: string;
  }) => void;
  onClose: () => void;
}) {
  const [fromLocationId, setFromLocationId] = useState('');
  const [toLocationId, setToLocationId] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<StockTransferItem[]>([]);

  const [pickedBatchId, setPickedBatchId] = useState('');
  const [pickedQty, setPickedQty] = useState('');

  const sourceBatches = useMemo(
    () => (fromLocationId ? getBatchesAtLocation(fromLocationId as PharmacyLocationId) : []),
    [fromLocationId],
  );
  const availableBatches = sourceBatches.filter(
    (b) => !items.some((it) => it.medicationName === b.medicationName && it.batchNo === b.batchNo),
  );
  const batchOptions = availableBatches.map((b) => ({
    value: b.id,
    label: `${b.medicationName} ${b.strength} — Batch ${b.batchNo} (${b.stockQty} ${b.unit}s available)`,
  }));

  const pickedBatch = availableBatches.find((b) => b.id === pickedBatchId) ?? null;
  const canAddItem =
    pickedBatch !== null &&
    pickedQty !== '' &&
    Number(pickedQty) > 0 &&
    Number(pickedQty) <= pickedBatch.stockQty;

  const toLocationOptions = INVENTORY_LOCATION_OPTIONS.filter((o) => o.value !== fromLocationId);
  const canSubmit = fromLocationId !== '' && toLocationId !== '' && items.length > 0;

  function handleFromChange(value: string) {
    setFromLocationId(value);
    setItems([]);
    setPickedBatchId('');
    setPickedQty('');
    if (value === toLocationId) setToLocationId('');
  }

  function handleAddItem() {
    if (!pickedBatch || !canAddItem) return;
    setItems((prev) => [
      ...prev,
      {
        medicationName: pickedBatch.medicationName,
        strength: pickedBatch.strength,
        form: pickedBatch.form,
        unit: pickedBatch.unit,
        batchNo: pickedBatch.batchNo,
        qty: Number(pickedQty),
      },
    ]);
    setPickedBatchId('');
    setPickedQty('');
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit() {
    if (!canSubmit) return;
    onSubmit({
      fromLocationId: fromLocationId as PharmacyLocationId,
      toLocationId: toLocationId as PharmacyLocationId,
      items,
      notes,
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
        style={{ maxWidth: 560, maxHeight: 'calc(100vh - 64px)', borderRadius: 16 }}
      >
        <div
          className="flex shrink-0 items-start justify-between gap-3 px-6 py-5"
          style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
        >
          <h2
            className="font-display font-semibold"
            style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
          >
            New Transfer
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="nt-from"
                className="mb-1.5 block font-sans font-medium"
                style={FIELD_LABEL}
              >
                From Location *
              </label>
              <FormSelect
                id="nt-from"
                value={fromLocationId}
                onChange={handleFromChange}
                options={INVENTORY_LOCATION_OPTIONS}
                placeholder="Select source location"
              />
            </div>
            <div>
              <label
                htmlFor="nt-to"
                className="mb-1.5 block font-sans font-medium"
                style={FIELD_LABEL}
              >
                To Location *
              </label>
              <FormSelect
                id="nt-to"
                value={toLocationId}
                onChange={setToLocationId}
                options={toLocationOptions}
                placeholder="Select destination location"
                disabled={!fromLocationId}
              />
            </div>
          </div>

          <div className="mt-4">
            <p className="mb-1.5 font-sans font-medium" style={FIELD_LABEL}>
              Add Items
            </p>
            {!fromLocationId ? (
              <p style={{ fontSize: 14, color: '#8A98A3' }}>
                Select a source location to see what&apos;s available to transfer.
              </p>
            ) : batchOptions.length === 0 ? (
              <p style={{ fontSize: 14, color: '#8A98A3' }}>
                No more stock available at this location to transfer.
              </p>
            ) : (
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1">
                  <FormSelect
                    id="nt-batch"
                    value={pickedBatchId}
                    onChange={setPickedBatchId}
                    options={batchOptions}
                    placeholder="Select medication & batch"
                  />
                </div>
                <div className="w-full sm:w-32">
                  <input
                    type="number"
                    min={1}
                    max={pickedBatch?.stockQty ?? undefined}
                    value={pickedQty}
                    onChange={(e) => setPickedQty(e.target.value)}
                    placeholder="Qty"
                    className={FIELD_INPUT_CLASS}
                    style={FIELD_INPUT_STYLE}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddItem}
                  disabled={!canAddItem}
                  className={`flex h-11 shrink-0 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING}`}
                  style={{ fontSize: 14, background: '#00B4D8' }}
                >
                  <Plus style={{ width: 15, height: 15 }} />
                  Add
                </button>
              </div>
            )}

            {items.length > 0 && (
              <div className="mt-3 flex flex-col gap-2">
                {items.map((item, index) => (
                  <div
                    key={`${item.medicationName}-${item.batchNo}`}
                    className="flex items-center justify-between gap-2 rounded-[8px] px-3 py-2"
                    style={{ background: '#F5FBFD' }}
                  >
                    <div className="min-w-0">
                      <p
                        className="truncate font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {item.medicationName} {item.strength}
                      </p>
                      <p style={{ fontSize: 14, color: '#8A98A3' }}>
                        Batch {item.batchNo} · Qty {item.qty} {item.unit}
                        {item.qty === 1 ? '' : 's'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      aria-label={`Remove ${item.medicationName}`}
                      className={`flex size-9 shrink-0 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[rgba(220,38,38,0.08)] ${FOCUS_RING}`}
                    >
                      <Trash2 style={{ width: 15, height: 15, color: '#DC2626' }} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4">
            <label
              htmlFor="nt-notes"
              className="mb-1.5 block font-sans font-medium"
              style={FIELD_LABEL}
            >
              Notes
            </label>
            <input
              id="nt-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Urgent restock for OPD clinic"
              className={FIELD_INPUT_CLASS}
              style={FIELD_INPUT_STYLE}
            />
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
            Request Transfer
          </button>
        </div>
      </div>
    </div>
  );
}
