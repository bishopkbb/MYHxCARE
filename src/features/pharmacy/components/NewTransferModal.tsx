'use client';

import { ArrowRight, Package, Plus, Search, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Tooltip } from '@components/shared/Tooltip';
import { FormSelect } from '@components/shared/FormSelect';
import {
  INVENTORY_LOCATION_OPTIONS,
  type InventoryBatchRow,
  type StockTransferItem,
} from '@/features/pharmacy/__mocks__/pharmacyFixtures';
import { getBatchesAtLocation } from '@/features/pharmacy/store/inventoryStore';
import { getPharmacyLocation } from '@/constants/pharmacyLocations';
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
 * The source location's stock is searchable rather than a single long
 * dropdown, so finding one medication among dozens doesn't mean scrolling
 * through all of them. Items are picked from the source's actual current
 * stock, so a transfer can never be requested for more than is really on
 * hand there. */
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
  const [stockSearch, setStockSearch] = useState('');
  const [qtyInputs, setQtyInputs] = useState<Record<string, string>>({});

  const sourceBatches = useMemo(
    () => (fromLocationId ? getBatchesAtLocation(fromLocationId as PharmacyLocationId) : []),
    [fromLocationId],
  );
  const availableBatches = useMemo(
    () =>
      sourceBatches.filter(
        (b) =>
          !items.some((it) => it.medicationName === b.medicationName && it.batchNo === b.batchNo),
      ),
    [sourceBatches, items],
  );
  const filteredBatches = useMemo(() => {
    const q = stockSearch.trim().toLowerCase();
    if (!q) return availableBatches;
    return availableBatches.filter(
      (b) => b.medicationName.toLowerCase().includes(q) || b.batchNo.toLowerCase().includes(q),
    );
  }, [availableBatches, stockSearch]);

  const toLocationOptions = INVENTORY_LOCATION_OPTIONS.filter((o) => o.value !== fromLocationId);
  const totalQty = items.reduce((sum, i) => sum + i.qty, 0);
  const canSubmit = fromLocationId !== '' && toLocationId !== '' && items.length > 0;

  function handleFromChange(value: string) {
    setFromLocationId(value);
    setItems([]);
    setStockSearch('');
    setQtyInputs({});
    if (value === toLocationId) setToLocationId('');
  }

  function handleAddRow(batch: InventoryBatchRow) {
    const raw = qtyInputs[batch.id] ?? '';
    const qty = Number(raw);
    if (!raw || qty <= 0 || qty > batch.stockQty) return;
    setItems((prev) => [
      ...prev,
      {
        medicationName: batch.medicationName,
        strength: batch.strength,
        form: batch.form,
        unit: batch.unit,
        batchNo: batch.batchNo,
        qty,
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
              New Transfer
            </h2>
            <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
              Move stock from one pharmacy location to another.
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
          {/* From / To */}
          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
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
            <ArrowRight
              className="hidden shrink-0 sm:mb-3 sm:block"
              style={{ width: 18, height: 18, color: '#8A98A3' }}
            />
            <div className="min-w-0 flex-1">
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

          {/* Stock picker + cart */}
          <div className="mt-5">
            <p className="mb-1.5 font-sans font-medium" style={FIELD_LABEL}>
              Items to Transfer
            </p>
            {!fromLocationId ? (
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
                  Select a source location to see what&apos;s available to transfer
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
                    Available at {getPharmacyLocation(fromLocationId as PharmacyLocationId).name}
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
                            ? 'No more stock available at this location.'
                            : 'No medications match your search.'}
                        </p>
                      </div>
                    ) : (
                      filteredBatches.map((b) => (
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
                              content={`Batch ${b.batchNo} · ${b.stockQty} ${b.unit} ${b.stockQty === 1 ? '' : 's'} available`}
                            >
                              <p className="truncate" style={{ fontSize: 14, color: '#8A98A3' }}>
                                Batch {b.batchNo} · {b.stockQty} {b.unit}
                                {b.stockQty === 1 ? '' : 's'} available
                              </p>
                            </Tooltip>
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5">
                            <input
                              type="number"
                              min={1}
                              max={b.stockQty}
                              value={qtyInputs[b.id] ?? ''}
                              onChange={(e) =>
                                setQtyInputs((prev) => ({ ...prev, [b.id]: e.target.value }))
                              }
                              placeholder="Qty"
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
                              onClick={() => handleAddRow(b)}
                              disabled={
                                !qtyInputs[b.id] ||
                                Number(qtyInputs[b.id]) <= 0 ||
                                Number(qtyInputs[b.id]) > b.stockQty
                              }
                              aria-label={`Add ${b.medicationName} batch ${b.batchNo}`}
                              className={`flex size-9 shrink-0 items-center justify-center rounded-[8px] text-white transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING}`}
                              style={{ background: '#00B4D8' }}
                            >
                              <Plus style={{ width: 15, height: 15 }} />
                            </button>
                          </div>
                        </div>
                      ))
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
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {totalQty.toLocaleString('en-GB')} units total
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
          className="flex shrink-0 flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
          style={{ borderTop: '1px solid rgba(0,100,130,0.12)' }}
        >
          <p style={{ fontSize: 14, color: '#8A98A3' }}>
            {items.length > 0
              ? `${items.length} item${items.length === 1 ? '' : 's'} · ${totalQty.toLocaleString('en-GB')} units selected`
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
              Request Transfer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
