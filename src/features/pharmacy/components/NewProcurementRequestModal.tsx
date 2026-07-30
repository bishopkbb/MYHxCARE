'use client';

import { Package, Plus, Search, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';

import { FormSelect } from '@components/shared/FormSelect';
import { Tooltip } from '@components/shared/Tooltip';
import { formatCurrency } from '@/utils/currency';
import {
  getProcurementCatalog,
  PROCUREMENT_DEPARTMENT_OPTIONS,
  PROCUREMENT_PRIORITY_OPTIONS,
  REQUEST_TYPE_OPTIONS,
  type ProcurementPriority,
  type ProcurementRequestItem,
  type ProcurementRequestType,
} from '@/features/pharmacy/__mocks__/pharmacyFixtures';
import type { CreateProcurementRequestInput } from '@/features/pharmacy/store/procurementRequestStore';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const FIELD_LABEL = { fontSize: 14, color: '#0D2630' } as const;
const FIELD_INPUT_CLASS = `h-11 w-full rounded-[10px] px-3.5 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`;
const FIELD_INPUT_STYLE = {
  fontSize: 14,
  border: '1px solid rgba(0,100,130,0.18)',
  color: '#0D2630',
};

export type NewRequestInitial = {
  requestType?: ProcurementRequestType;
  itemName?: string;
  department?: string;
  priority?: ProcurementPriority;
  items?: ProcurementRequestItem[];
};

/** Raises a new procurement request — lazy-loaded (checklist §14). The item
 * picker searches the real catalog for the chosen request type (medication
 * strengths from Drug Inventory's own catalog, or the supplies/equipment
 * pools) rather than a long unfiltered scroll, plus an "Add custom item"
 * fallback for anything genuinely not in the catalog. `initial` lets Request
 * Templates and row-level "Create Purchase Order" actions open this
 * pre-filled instead of starting blank. */
export function NewProcurementRequestModal({
  initial,
  onSubmit,
  onClose,
}: {
  initial?: NewRequestInitial;
  onSubmit: (input: CreateProcurementRequestInput) => void;
  onClose: () => void;
}) {
  const [requestType, setRequestType] = useState<ProcurementRequestType>(
    initial?.requestType ?? 'Medication',
  );
  const [department, setDepartment] = useState(initial?.department ?? 'Pharmacy');
  const [priority, setPriority] = useState<ProcurementPriority>(initial?.priority ?? 'Medium');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<ProcurementRequestItem[]>(initial?.items ?? []);
  const [itemSearch, setItemSearch] = useState(initial?.itemName ?? '');
  const [qtyInputs, setQtyInputs] = useState<Record<string, string>>({});
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [customQty, setCustomQty] = useState('');

  const catalog = useMemo(() => getProcurementCatalog(requestType), [requestType]);
  const availableItems = useMemo(
    () => catalog.filter((c) => !items.some((it) => it.name === c.name)),
    [catalog, items],
  );
  const filteredItems = useMemo(() => {
    const q = itemSearch.trim().toLowerCase();
    if (!q) return availableItems;
    return availableItems.filter((c) => c.name.toLowerCase().includes(q));
  }, [availableItems, itemSearch]);

  const totalQty = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalValue = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const canSubmit = department !== '' && items.length > 0;

  function handleTypeChange(type: ProcurementRequestType) {
    setRequestType(type);
    setItems([]);
    setItemSearch('');
    setQtyInputs({});
    setShowCustomForm(false);
    setCustomName('');
    setCustomPrice('');
    setCustomQty('');
  }

  const customNameTrimmed = customName.trim();
  const customQtyNum = Number(customQty);
  const customPriceNum = Number(customPrice);
  const isDuplicateCustomName = items.some(
    (it) => it.name.toLowerCase() === customNameTrimmed.toLowerCase(),
  );
  const canAddCustom =
    customNameTrimmed !== '' &&
    customQty !== '' &&
    customQtyNum > 0 &&
    customPrice !== '' &&
    customPriceNum >= 0 &&
    !isDuplicateCustomName;

  function handleAddCustomItem() {
    if (!canAddCustom) return;
    setItems((prev) => [
      ...prev,
      { name: customNameTrimmed, quantity: customQtyNum, unitPrice: customPriceNum },
    ]);
    setCustomName('');
    setCustomPrice('');
    setCustomQty('');
    setShowCustomForm(false);
  }

  function handleAddRow(catalogItem: { name: string; unitPrice: number }) {
    const raw = qtyInputs[catalogItem.name] ?? '';
    const qty = Number(raw);
    if (!raw || qty <= 0) return;
    setItems((prev) => [
      ...prev,
      { name: catalogItem.name, quantity: qty, unitPrice: catalogItem.unitPrice },
    ]);
    setQtyInputs((prev) => {
      const next = { ...prev };
      delete next[catalogItem.name];
      return next;
    });
  }

  function updateItemQty(index: number, qty: number) {
    setItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, quantity: Math.max(1, qty) } : it)),
    );
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit() {
    if (!canSubmit) return;
    onSubmit({
      requestType,
      department,
      priority,
      items,
      ...(notes.trim() ? { notes: notes.trim() } : {}),
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
              New Procurement Request
            </h2>
            <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
              Request medication, supplies, or equipment for procurement approval.
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
          <div>
            <p className="mb-1.5 font-sans font-medium" style={FIELD_LABEL}>
              Request Type *
            </p>
            <div
              className="flex h-11 items-stretch overflow-hidden rounded-[10px] sm:inline-flex sm:w-auto"
              style={{ border: '1px solid rgba(0,100,130,0.18)' }}
            >
              {REQUEST_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleTypeChange(opt.value as ProcurementRequestType)}
                  className={`flex flex-1 items-center justify-center px-5 font-sans font-medium whitespace-nowrap transition-colors duration-150 sm:flex-none ${FOCUS_RING}`}
                  style={{
                    fontSize: 14,
                    color: requestType === opt.value ? '#FFFFFF' : '#00B4D8',
                    background: requestType === opt.value ? '#00B4D8' : 'rgba(0,180,216,0.06)',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="npr-department"
                className="mb-1.5 block font-sans font-medium"
                style={FIELD_LABEL}
              >
                Department *
              </label>
              <FormSelect
                id="npr-department"
                value={department}
                onChange={setDepartment}
                options={PROCUREMENT_DEPARTMENT_OPTIONS}
                placeholder="Select department"
              />
            </div>
            <div>
              <label
                htmlFor="npr-priority"
                className="mb-1.5 block font-sans font-medium"
                style={FIELD_LABEL}
              >
                Priority *
              </label>
              <FormSelect
                id="npr-priority"
                value={priority}
                onChange={(v) => setPriority(v as ProcurementPriority)}
                options={PROCUREMENT_PRIORITY_OPTIONS}
                placeholder="Select priority"
              />
            </div>
          </div>

          {/* Item picker + cart */}
          <div className="mt-5">
            <p className="mb-1.5 font-sans font-medium" style={FIELD_LABEL}>
              Items to Request
            </p>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div
                className="min-w-0 rounded-[10px] p-3"
                style={{ border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <p style={{ fontSize: 14, color: '#4A7080' }}>{requestType} catalog</p>
                <div className="relative mt-2">
                  <Search
                    className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
                    style={{ width: 15, height: 15, color: '#8A98A3' }}
                  />
                  <input
                    type="search"
                    value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                    placeholder="Search by item name..."
                    className={`h-10 w-full rounded-[8px] pr-3 pl-9 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                    style={{
                      fontSize: 14,
                      border: '1px solid rgba(0,100,130,0.18)',
                      color: '#0D2630',
                    }}
                  />
                </div>

                <div className="mt-2.5 flex max-h-80 flex-col gap-2 overflow-y-auto scroll-smooth pr-1">
                  {filteredItems.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-8 text-center">
                      <div
                        className="flex size-11 items-center justify-center rounded-full"
                        style={{ background: 'rgba(226,237,241,0.6)' }}
                      >
                        <Search style={{ width: 18, height: 18, color: '#8A98A3' }} />
                      </div>
                      <p style={{ fontSize: 14, color: '#8A98A3' }}>
                        {availableItems.length === 0
                          ? 'All catalog items already added.'
                          : 'No items match your search.'}
                      </p>
                    </div>
                  ) : (
                    filteredItems.map((c) => {
                      const qtyVal = qtyInputs[c.name] ?? '';
                      const invalid = qtyVal !== '' && Number(qtyVal) <= 0;
                      return (
                        <div
                          key={c.name}
                          className="flex flex-col gap-2 rounded-[8px] p-2.5 sm:flex-row sm:items-center sm:justify-between"
                          style={{ background: '#F5FBFD' }}
                        >
                          <div className="min-w-0 flex-1">
                            <Tooltip content={c.name}>
                              <p
                                className="truncate font-sans font-medium"
                                style={{ fontSize: 14, color: '#0D2630' }}
                              >
                                {c.name}
                              </p>
                            </Tooltip>
                            <p style={{ fontSize: 14, color: '#8A98A3' }}>
                              {formatCurrency(c.unitPrice)} / unit
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5">
                            <input
                              type="number"
                              min={1}
                              value={qtyVal}
                              onChange={(e) =>
                                setQtyInputs((prev) => ({ ...prev, [c.name]: e.target.value }))
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
                              onClick={() => handleAddRow(c)}
                              disabled={!qtyVal || invalid}
                              aria-label={`Add ${c.name}`}
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

                <div className="mt-2.5" style={{ borderTop: '1px solid rgba(0,100,130,0.1)' }}>
                  {!showCustomForm ? (
                    <button
                      type="button"
                      onClick={() => setShowCustomForm(true)}
                      className={`mt-2.5 flex h-11 w-full items-center justify-center gap-1.5 rounded-[8px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                      style={{ fontSize: 14, color: '#00B4D8', border: '1px dashed #00B4D8' }}
                    >
                      <Plus style={{ width: 15, height: 15 }} />
                      Add Item Not in Catalog
                    </button>
                  ) : (
                    <div
                      className="mt-2.5 flex flex-col gap-2 rounded-[8px] p-2.5"
                      style={{ background: '#F5FBFD' }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className="font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          Custom Item
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setShowCustomForm(false);
                            setCustomName('');
                            setCustomPrice('');
                            setCustomQty('');
                          }}
                          aria-label="Cancel custom item"
                          className={`flex size-9 shrink-0 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[rgba(0,0,0,0.06)] ${FOCUS_RING}`}
                        >
                          <X style={{ width: 15, height: 15, color: '#4A7080' }} />
                        </button>
                      </div>
                      <input
                        id="npr-custom-name"
                        type="text"
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        placeholder="Item name"
                        className={`h-10 w-full rounded-[8px] px-3 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                        style={{
                          fontSize: 14,
                          border: `1px solid ${isDuplicateCustomName ? '#EF4444' : 'rgba(0,100,130,0.18)'}`,
                          color: '#0D2630',
                          background: '#FFFFFF',
                        }}
                      />
                      {isDuplicateCustomName && (
                        <p style={{ fontSize: 14, color: '#DC2626' }}>
                          An item with this name is already selected.
                        </p>
                      )}
                      <div className="flex items-center gap-2">
                        <input
                          id="npr-custom-qty"
                          type="number"
                          min={1}
                          value={customQty}
                          onChange={(e) => setCustomQty(e.target.value)}
                          placeholder="Qty"
                          className={`h-10 w-24 rounded-[8px] px-2.5 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                          style={{
                            fontSize: 14,
                            border: '1px solid rgba(0,100,130,0.18)',
                            color: '#0D2630',
                            background: '#FFFFFF',
                          }}
                        />
                        <input
                          id="npr-custom-price"
                          type="number"
                          min={0}
                          value={customPrice}
                          onChange={(e) => setCustomPrice(e.target.value)}
                          placeholder="Unit price (₦)"
                          className={`h-10 min-w-0 flex-1 rounded-[8px] px-2.5 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                          style={{
                            fontSize: 14,
                            border: '1px solid rgba(0,100,130,0.18)',
                            color: '#0D2630',
                            background: '#FFFFFF',
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleAddCustomItem}
                          disabled={!canAddCustom}
                          aria-label="Add custom item"
                          className={`flex size-9 shrink-0 items-center justify-center rounded-[8px] text-white transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING}`}
                          style={{ background: '#00B4D8' }}
                        >
                          <Plus style={{ width: 15, height: 15 }} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div
                className="min-w-0 rounded-[10px] p-3"
                style={{ border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <div className="flex items-center justify-between gap-2">
                  <p style={{ fontSize: 14, color: '#4A7080' }}>Selected ({items.length})</p>
                  {items.length > 0 && (
                    <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
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
                        key={item.name}
                        className="flex items-center justify-between gap-2 rounded-[8px] p-2.5"
                        style={{ background: '#F5FBFD' }}
                      >
                        <div className="min-w-0 flex-1">
                          <Tooltip content={item.name}>
                            <p
                              className="truncate font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {item.name}
                            </p>
                          </Tooltip>
                          <p style={{ fontSize: 14, color: '#8A98A3' }}>
                            {formatCurrency(item.unitPrice * item.quantity)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <input
                            type="number"
                            min={1}
                            value={item.quantity}
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
                            aria-label={`Remove ${item.name}`}
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
          </div>

          <div className="mt-4">
            <label
              htmlFor="npr-notes"
              className="mb-1.5 block font-sans font-medium"
              style={FIELD_LABEL}
            >
              Notes (Optional)
            </label>
            <input
              id="npr-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Needed before end of month for ward restock"
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
              ? `${items.length} item${items.length === 1 ? '' : 's'} · ${totalQty.toLocaleString('en-GB')} units · Est. ${formatCurrency(totalValue)}`
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
              Submit Request
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
