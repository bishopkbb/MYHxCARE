'use client';

import { ArrowDown, ArrowUp, Package, Plus, Search, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Tooltip } from '@components/shared/Tooltip';
import { FormSelect } from '@components/shared/FormSelect';
import { getPharmacyLocation } from '@/constants/pharmacyLocations';
import { formatCurrency } from '@/utils/currency';
import {
  ADJUSTMENT_REASON_OPTIONS,
  INVENTORY_LOCATION_OPTIONS,
  type AdjustmentReason,
  type AdjustmentType,
  type InventoryBatchRow,
  type StockAdjustmentItem,
} from '@/features/pharmacy/__mocks__/pharmacyFixtures';
import { getAllBatchesAtLocation } from '@/features/pharmacy/store/inventoryStore';
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

/** Records a stock adjustment — lazy-loaded (checklist §14). Items are
 * picked from the chosen location's actual tracked batches (searchable, not
 * a long scroll), and the quantity is validated against real on-hand stock
 * for a Decrease. */
export function NewAdjustmentModal({
  initialReason,
  onSubmit,
  onClose,
}: {
  initialReason?: AdjustmentReason;
  onSubmit: (input: {
    locationId: PharmacyLocationId;
    adjustmentType: AdjustmentType;
    reason: AdjustmentReason;
    items: StockAdjustmentItem[];
    referenceNo: string;
    notes: string;
  }) => void;
  onClose: () => void;
}) {
  const [locationId, setLocationId] = useState('');
  const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>('Decrease');
  const [reason, setReason] = useState<string>(initialReason ?? '');
  const [referenceNo, setReferenceNo] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<StockAdjustmentItem[]>([]);
  const [stockSearch, setStockSearch] = useState('');
  const [qtyInputs, setQtyInputs] = useState<Record<string, string>>({});

  const locationBatches = useMemo(
    () => (locationId ? getAllBatchesAtLocation(locationId as PharmacyLocationId) : []),
    [locationId],
  );
  const availableBatches = useMemo(
    () =>
      locationBatches.filter(
        (b) =>
          !items.some((it) => it.medicationName === b.medicationName && it.batchNo === b.batchNo),
      ),
    [locationBatches, items],
  );
  const filteredBatches = useMemo(() => {
    const q = stockSearch.trim().toLowerCase();
    if (!q) return availableBatches;
    return availableBatches.filter(
      (b) => b.medicationName.toLowerCase().includes(q) || b.batchNo.toLowerCase().includes(q),
    );
  }, [availableBatches, stockSearch]);

  const totalQty = items.reduce((sum, i) => sum + i.qty, 0);
  const totalValue = items.reduce((sum, i) => sum + i.qty * i.unitPrice, 0);
  const canSubmit = locationId !== '' && reason !== '' && items.length > 0;

  function handleLocationChange(value: string) {
    setLocationId(value);
    setItems([]);
    setStockSearch('');
    setQtyInputs({});
  }

  function maxFor(batch: InventoryBatchRow): number | undefined {
    return adjustmentType === 'Decrease' ? batch.stockQty : undefined;
  }

  function handleAddRow(batch: InventoryBatchRow) {
    const raw = qtyInputs[batch.id] ?? '';
    const qty = Number(raw);
    const max = maxFor(batch);
    if (!raw || qty <= 0 || (max !== undefined && qty > max)) return;
    setItems((prev) => [
      ...prev,
      {
        medicationName: batch.medicationName,
        strength: batch.strength,
        form: batch.form,
        unit: batch.unit,
        batchNo: batch.batchNo,
        qty,
        unitPrice: batch.unitPrice,
      },
    ]);
    setQtyInputs((prev) => {
      const next = { ...prev };
      delete next[batch.id];
      return next;
    });
  }

  function updateItemQty(index: number, qty: number) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, qty: Math.max(1, qty) } : it)));
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit() {
    if (!canSubmit) return;
    onSubmit({
      locationId: locationId as PharmacyLocationId,
      adjustmentType,
      reason: reason as AdjustmentReason,
      items,
      referenceNo,
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
        style={{ maxWidth: 880, maxHeight: 'calc(100vh - 48px)', borderRadius: 16 }}
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
              New Adjustment
            </h2>
            <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
              Correct stock quantities due to a count, damage, expiry, or other reason.
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label
                htmlFor="na-location"
                className="mb-1.5 block font-sans font-medium"
                style={FIELD_LABEL}
              >
                Location *
              </label>
              <FormSelect
                id="na-location"
                value={locationId}
                onChange={handleLocationChange}
                options={INVENTORY_LOCATION_OPTIONS}
                placeholder="Select location"
              />
            </div>
            <div>
              <p className="mb-1.5 font-sans font-medium" style={FIELD_LABEL}>
                Adjustment Type *
              </p>
              <div
                className="flex h-11 items-stretch overflow-hidden rounded-[10px]"
                style={{ border: '1px solid rgba(0,100,130,0.18)' }}
              >
                <button
                  type="button"
                  onClick={() => setAdjustmentType('Increase')}
                  className={`flex flex-1 items-center justify-center gap-1.5 font-sans font-medium transition-colors duration-150 ${FOCUS_RING}`}
                  style={{
                    fontSize: 14,
                    color: adjustmentType === 'Increase' ? '#FFFFFF' : '#16A34A',
                    background: adjustmentType === 'Increase' ? '#16A34A' : 'rgba(22,163,74,0.06)',
                  }}
                >
                  <ArrowUp style={{ width: 14, height: 14 }} />
                  Increase
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustmentType('Decrease')}
                  className={`flex flex-1 items-center justify-center gap-1.5 font-sans font-medium transition-colors duration-150 ${FOCUS_RING}`}
                  style={{
                    fontSize: 14,
                    color: adjustmentType === 'Decrease' ? '#FFFFFF' : '#DC2626',
                    background: adjustmentType === 'Decrease' ? '#DC2626' : 'rgba(220,38,38,0.06)',
                  }}
                >
                  <ArrowDown style={{ width: 14, height: 14 }} />
                  Decrease
                </button>
              </div>
            </div>
            <div>
              <label
                htmlFor="na-reason"
                className="mb-1.5 block font-sans font-medium"
                style={FIELD_LABEL}
              >
                Reason *
              </label>
              <FormSelect
                id="na-reason"
                value={reason}
                onChange={setReason}
                options={ADJUSTMENT_REASON_OPTIONS}
                placeholder="Select reason"
              />
            </div>
          </div>

          <div className="mt-4">
            <label
              htmlFor="na-ref"
              className="mb-1.5 block font-sans font-medium"
              style={FIELD_LABEL}
            >
              Reference No. (Optional)
            </label>
            <input
              id="na-ref"
              type="text"
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              placeholder="e.g. Count sheet or incident reference"
              className={`${FIELD_INPUT_CLASS} sm:w-80`}
              style={FIELD_INPUT_STYLE}
            />
          </div>

          {/* Stock picker + cart */}
          <div className="mt-5">
            <p className="mb-1.5 font-sans font-medium" style={FIELD_LABEL}>
              Items to Adjust
            </p>
            {!locationId ? (
              <div
                className="flex flex-col items-center justify-center gap-2.5 rounded-[10px] py-10 text-center"
                style={{ border: '1px dashed rgba(0,100,130,0.2)' }}
              >
                <div
                  className="flex size-14 items-center justify-center rounded-full"
                  style={{ background: 'rgba(226,237,241,0.6)' }}
                >
                  <Package style={{ width: 24, height: 24, color: '#8A98A3' }} />
                </div>
                <p className="font-sans font-medium" style={{ fontSize: 14, color: '#4A7080' }}>
                  Select a location to see its tracked stock
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {/* Available stock */}
                <div
                  className="min-w-0 rounded-[10px] p-3"
                  style={{ border: '1px solid rgba(0,100,130,0.12)' }}
                >
                  <p style={{ fontSize: 14, color: '#4A7080' }}>
                    Tracked at {getPharmacyLocation(locationId as PharmacyLocationId).name}
                  </p>
                  <div className="relative mt-2">
                    <Search
                      className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
                      style={{ width: 15, height: 15, color: '#8A98A3' }}
                    />
                    <input
                      type="search"
                      value={stockSearch}
                      onChange={(e) => setStockSearch(e.target.value)}
                      placeholder="Search medication or batch no..."
                      className={`h-10 w-full rounded-[8px] pr-3 pl-9 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                      style={{
                        fontSize: 14,
                        border: '1px solid rgba(0,100,130,0.18)',
                        color: '#0D2630',
                      }}
                    />
                  </div>

                  <div className="mt-2.5 flex max-h-80 flex-col gap-2 overflow-y-auto scroll-smooth pr-1">
                    {filteredBatches.length === 0 ? (
                      <div className="flex flex-col items-center gap-2 py-8 text-center">
                        <div
                          className="flex size-11 items-center justify-center rounded-full"
                          style={{ background: 'rgba(226,237,241,0.6)' }}
                        >
                          <Search style={{ width: 18, height: 18, color: '#8A98A3' }} />
                        </div>
                        <p style={{ fontSize: 14, color: '#8A98A3' }}>
                          {availableBatches.length === 0
                            ? 'No more tracked stock at this location.'
                            : 'No medications match your search.'}
                        </p>
                      </div>
                    ) : (
                      filteredBatches.map((b) => {
                        const max = maxFor(b);
                        const qtyVal = qtyInputs[b.id] ?? '';
                        const invalid =
                          qtyVal !== '' &&
                          (Number(qtyVal) <= 0 || (max !== undefined && Number(qtyVal) > max));
                        return (
                          <div
                            key={b.id}
                            className="flex flex-col gap-2 rounded-[8px] p-2.5 sm:flex-row sm:items-center sm:justify-between"
                            style={{ background: '#F5FBFD' }}
                          >
                            <div className="min-w-0 flex-1">
                              <Tooltip content={`${b.medicationName} ${b.strength}`}>
                                <p
                                  className="truncate font-sans font-medium"
                                  style={{ fontSize: 14, color: '#0D2630' }}
                                >
                                  {b.medicationName} {b.strength}
                                </p>
                              </Tooltip>
                              <Tooltip
                                content={`Batch ${b.batchNo} · ${b.stockQty} ${b.unit} ${b.stockQty === 1 ? '' : 's'} on hand`}
                              >
                                <p className="truncate" style={{ fontSize: 14, color: '#8A98A3' }}>
                                  Batch {b.batchNo} · {b.stockQty} {b.unit}
                                  {b.stockQty === 1 ? '' : 's'} on hand
                                </p>
                              </Tooltip>
                            </div>
                            <div className="flex shrink-0 items-center gap-1.5">
                              <input
                                type="number"
                                min={1}
                                max={max}
                                value={qtyVal}
                                onChange={(e) =>
                                  setQtyInputs((prev) => ({ ...prev, [b.id]: e.target.value }))
                                }
                                placeholder="Qty"
                                className={`h-9 w-20 rounded-[8px] px-2.5 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                                style={{
                                  fontSize: 14,
                                  border: `1px solid ${invalid ? '#EF4444' : 'rgba(0,100,130,0.18)'}`,
                                  color: '#0D2630',
                                  background: '#FFFFFF',
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => handleAddRow(b)}
                                disabled={!qtyVal || invalid}
                                aria-label={`Add ${b.medicationName} batch ${b.batchNo}`}
                                className={`flex size-9 shrink-0 items-center justify-center rounded-[8px] text-white transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING}`}
                                style={{ background: '#00B4D8' }}
                              >
                                <Plus style={{ width: 15, height: 15 }} />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Cart */}
                <div
                  className="min-w-0 rounded-[10px] p-3"
                  style={{ border: '1px solid rgba(0,100,130,0.12)' }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p style={{ fontSize: 14, color: '#4A7080' }}>Selected ({items.length})</p>
                    {items.length > 0 && (
                      <p
                        className="font-sans font-medium"
                        style={{
                          fontSize: 14,
                          color: adjustmentType === 'Increase' ? '#16A34A' : '#DC2626',
                        }}
                      >
                        {adjustmentType === 'Increase' ? '+' : '-'}
                        {totalQty.toLocaleString('en-GB')} units
                      </p>
                    )}
                  </div>

                  {items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                      <div
                        className="flex size-11 items-center justify-center rounded-full"
                        style={{ background: 'rgba(226,237,241,0.6)' }}
                      >
                        <Package style={{ width: 18, height: 18, color: '#8A98A3' }} />
                      </div>
                      <p style={{ fontSize: 14, color: '#8A98A3' }}>
                        Search and add items from the list on the left.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-2.5 flex max-h-80 flex-col gap-2 overflow-y-auto scroll-smooth pr-1">
                      {items.map((item, index) => (
                        <div
                          key={`${item.medicationName}-${item.batchNo}`}
                          className="flex items-center justify-between gap-2 rounded-[8px] p-2.5"
                          style={{ background: '#F5FBFD' }}
                        >
                          <div className="min-w-0 flex-1">
                            <Tooltip content={`${item.medicationName} ${item.strength}`}>
                              <p
                                className="truncate font-sans font-medium"
                                style={{ fontSize: 14, color: '#0D2630' }}
                              >
                                {item.medicationName} {item.strength}
                              </p>
                            </Tooltip>
                            <Tooltip content={`Batch ${item.batchNo}`}>
                              <p className="truncate" style={{ fontSize: 14, color: '#8A98A3' }}>
                                Batch {item.batchNo}
                              </p>
                            </Tooltip>
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5">
                            <input
                              type="number"
                              min={1}
                              value={item.qty}
                              onChange={(e) => updateItemQty(index, Number(e.target.value))}
                              className={`h-9 w-20 rounded-[8px] px-2.5 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                              style={{
                                fontSize: 14,
                                border: '1px solid rgba(0,100,130,0.18)',
                                color: '#0D2630',
                                background: '#FFFFFF',
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => removeItem(index)}
                              aria-label={`Remove ${item.medicationName}`}
                              className={`flex size-9 shrink-0 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[rgba(220,38,38,0.08)] ${FOCUS_RING}`}
                            >
                              <Trash2 style={{ width: 15, height: 15, color: '#DC2626' }} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="mt-4">
            <label
              htmlFor="na-notes"
              className="mb-1.5 block font-sans font-medium"
              style={FIELD_LABEL}
            >
              Notes
            </label>
            <input
              id="na-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Confirmed during weekly physical count"
              className={FIELD_INPUT_CLASS}
              style={FIELD_INPUT_STYLE}
            />
          </div>
        </div>

        <div
          className="flex shrink-0 flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
          style={{ borderTop: '1px solid rgba(0,100,130,0.12)' }}
        >
          <p style={{ fontSize: 14, color: '#8A98A3' }}>
            {items.length > 0
              ? `${items.length} item${items.length === 1 ? '' : 's'} · ${adjustmentType === 'Increase' ? '+' : '-'}${totalQty.toLocaleString('en-GB')} units · ${adjustmentType === 'Increase' ? '+' : '-'}${formatCurrency(totalValue)}`
              : 'No items selected yet'}
          </p>
          <div className="flex shrink-0 items-center gap-2.5">
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
              Save Adjustment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
