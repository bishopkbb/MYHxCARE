'use client';

import { ChevronLeft, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';

import { FormDateInput } from '@components/shared/FormDateInput';
import { Tooltip } from '@components/shared/Tooltip';
import { toWATDateInput } from '@/utils/datetime';
import { useInventoryItems } from '@/features/laboratory/store/inventoryStore';
import type { InventoryItem } from '@/features/laboratory/__mocks__/inventoryFixtures';
import {
  addLineItem,
  type NewLineItemInput,
} from '@/features/laboratory/store/stockReceivingStore';
import type { ReceivedLineItem } from '@/features/laboratory/__mocks__/stockReceivingFixtures';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';
const FIELD_LABEL = { fontSize: 14, color: '#0D2630' } as const;
const FIELD_INPUT_CLASS = `h-11 w-full rounded-[10px] px-3.5 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`;
const FIELD_INPUT_STYLE = {
  fontSize: 14,
  border: '1px solid rgba(0,100,130,0.18)',
  color: '#0D2630',
} as const;

/** Adds a received line item to the current GRN — lazy-loaded (checklist
 * §14). Doubles as "Scan Barcode": typing an exact catalog number in the
 * search box selects that item the same way clicking it would. */
export function AddReceivedItemModal({
  existingItemIds,
  onSubmit,
  onClose,
}: {
  existingItemIds: string[];
  onSubmit: (line: ReceivedLineItem) => void;
  onClose: () => void;
}) {
  const items = useInventoryItems();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<InventoryItem | null>(null);

  const [lotBatchNo, setLotBatchNo] = useState('');
  const [expiryDate, setExpiryDate] = useState(toWATDateInput());
  const [orderedQty, setOrderedQty] = useState('1');
  const [receivedQty, setReceivedQty] = useState('1');
  const [acceptedQty, setAcceptedQty] = useState('1');
  const [rejectedQty, setRejectedQty] = useState('0');
  const [unitCost, setUnitCost] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const availableItems = useMemo(() => {
    const existingSet = new Set(existingItemIds);
    return items.filter((i) => !existingSet.has(i.id));
  }, [items, existingItemIds]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return availableItems.slice(0, 40);
    const exactCatalogMatch = availableItems.find((i) => i.catalogNo.toLowerCase() === q);
    if (exactCatalogMatch) return [exactCatalogMatch];
    return availableItems
      .filter((i) => i.name.toLowerCase().includes(q) || i.catalogNo.toLowerCase().includes(q))
      .slice(0, 40);
  }, [availableItems, search]);

  function pickItem(item: InventoryItem) {
    setSelected(item);
    setLotBatchNo(item.lotBatchNo);
    setUnitCost(String(item.unitPrice));
    if (item.expiryDate) setExpiryDate(item.expiryDate.slice(0, 10));
  }

  const isValid =
    selected !== null &&
    lotBatchNo.trim() !== '' &&
    orderedQty !== '' &&
    receivedQty !== '' &&
    acceptedQty !== '' &&
    unitCost !== '';

  function handleSubmit() {
    setSubmitted(true);
    if (!isValid || !selected) return;
    const input: NewLineItemInput = {
      itemId: selected.id,
      lotBatchNo: lotBatchNo.trim(),
      expiryDate: new Date(expiryDate).toISOString(),
      orderedQty: Number(orderedQty),
      receivedQty: Number(receivedQty),
      acceptedQty: Number(acceptedQty),
      rejectedQty: Number(rejectedQty) || 0,
      unitCost: Number(unitCost),
    };
    onSubmit(addLineItem(input));
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
        style={{ maxWidth: 560, maxHeight: 'calc(100vh - 48px)', borderRadius: 16 }}
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
              Add Received Item
            </h2>
            <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
              {selected
                ? 'Enter what was received for this item.'
                : 'Search or scan a catalog number to select an item.'}
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

        {!selected ? (
          <>
            <div className="shrink-0 px-6 pt-4">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
                  style={{ width: 16, height: 16, color: '#8A98A3' }}
                />
                <input
                  type="text"
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by item name or scan catalog no..."
                  className={`h-11 w-full rounded-[10px] pr-4 pl-9 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                  style={FIELD_INPUT_STYLE}
                />
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto scroll-smooth px-2 py-3">
              {filteredItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                  <div
                    className="flex size-14 items-center justify-center rounded-full"
                    style={{ background: 'rgba(226,237,241,0.6)' }}
                  >
                    <Search style={{ width: 20, height: 20, color: '#8A98A3' }} />
                  </div>
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>
                    No matching items — or it&apos;s already on this GRN.
                  </p>
                </div>
              ) : (
                filteredItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => pickItem(item)}
                    className={`flex w-full items-center justify-between gap-2 rounded-[8px] px-3 py-2.5 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                  >
                    <div className="min-w-0">
                      <Tooltip content={item.name}>
                        <p
                          className="truncate font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {item.name}
                        </p>
                      </Tooltip>
                      <p style={{ fontSize: 14, color: '#00B4D8' }}>{item.catalogNo}</p>
                    </div>
                    <span className="shrink-0" style={{ fontSize: 14, color: '#8A98A3' }}>
                      {item.department}
                    </span>
                  </button>
                ))
              )}
            </div>
          </>
        ) : (
          <>
            <div className="shrink-0 px-6 pt-4">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className={`flex items-center gap-1 font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#00B4D8' }}
              >
                <ChevronLeft style={{ width: 15, height: 15 }} />
                Change item
              </button>
              <div
                className="mt-2 rounded-[10px] p-3"
                style={{ background: '#F5FBFD', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                  {selected.name}
                </p>
                <p style={{ fontSize: 14, color: '#00B4D8' }}>{selected.catalogNo}</p>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto scroll-smooth px-6 py-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="font-sans font-medium" style={FIELD_LABEL}>
                    Lot/Batch No.
                  </label>
                  <input
                    type="text"
                    value={lotBatchNo}
                    onChange={(e) => setLotBatchNo(e.target.value)}
                    className={`mt-1.5 ${FIELD_INPUT_CLASS}`}
                    style={{
                      ...FIELD_INPUT_STYLE,
                      border:
                        submitted && !lotBatchNo.trim()
                          ? '1px solid #EF4444'
                          : FIELD_INPUT_STYLE.border,
                    }}
                  />
                </div>
                <div>
                  <label className="font-sans font-medium" style={FIELD_LABEL}>
                    Expiry Date
                  </label>
                  <div className="mt-1.5">
                    <FormDateInput
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="font-sans font-medium" style={FIELD_LABEL}>
                    Ordered Qty
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={orderedQty}
                    onChange={(e) => setOrderedQty(e.target.value)}
                    className={`mt-1.5 ${FIELD_INPUT_CLASS}`}
                    style={FIELD_INPUT_STYLE}
                  />
                </div>
                <div>
                  <label className="font-sans font-medium" style={FIELD_LABEL}>
                    Received Qty
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={receivedQty}
                    onChange={(e) => setReceivedQty(e.target.value)}
                    className={`mt-1.5 ${FIELD_INPUT_CLASS}`}
                    style={FIELD_INPUT_STYLE}
                  />
                </div>
                <div>
                  <label className="font-sans font-medium" style={FIELD_LABEL}>
                    Accepted Qty
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={acceptedQty}
                    onChange={(e) => setAcceptedQty(e.target.value)}
                    className={`mt-1.5 ${FIELD_INPUT_CLASS}`}
                    style={FIELD_INPUT_STYLE}
                  />
                </div>
                <div>
                  <label className="font-sans font-medium" style={FIELD_LABEL}>
                    Rejected Qty
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={rejectedQty}
                    onChange={(e) => setRejectedQty(e.target.value)}
                    className={`mt-1.5 ${FIELD_INPUT_CLASS}`}
                    style={FIELD_INPUT_STYLE}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="font-sans font-medium" style={FIELD_LABEL}>
                    Unit Cost (₦)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={unitCost}
                    onChange={(e) => setUnitCost(e.target.value)}
                    className={`mt-1.5 ${FIELD_INPUT_CLASS}`}
                    style={{
                      ...FIELD_INPUT_STYLE,
                      border:
                        submitted && unitCost === ''
                          ? '1px solid #EF4444'
                          : FIELD_INPUT_STYLE.border,
                    }}
                  />
                </div>
              </div>
            </div>
          </>
        )}

        <div
          className="flex shrink-0 items-center justify-end gap-2.5 px-6 py-4"
          style={{ borderTop: '1px solid rgba(0,100,130,0.12)' }}
        >
          <button
            type="button"
            onClick={onClose}
            className={`flex h-11 items-center rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
            style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!selected}
            className={`flex h-11 items-center rounded-[10px] px-5 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
            style={{ fontSize: 14, background: '#00B4D8' }}
          >
            Add to GRN
          </button>
        </div>
      </div>
    </div>
  );
}
