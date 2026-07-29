'use client';

import { X } from 'lucide-react';
import { useState } from 'react';

import { FormSelect } from '@components/shared/FormSelect';
import {
  INVENTORY_LOCATION_OPTIONS,
  MANUFACTURER_OPTIONS,
  SUPPLIER_OPTIONS,
  type InventoryBatchRow,
} from '@/features/pharmacy/__mocks__/pharmacyFixtures';
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

/** Receives a new batch into stock — lazy-loaded (checklist §14). A real
 * write against inventoryStore.ts, so the table/stats/donut all reflect it
 * immediately once submitted. */
export function AddStockModal({
  onSubmit,
  onClose,
}: {
  onSubmit: (entry: Omit<InventoryBatchRow, 'id'>) => void;
  onClose: () => void;
}) {
  const [medicationName, setMedicationName] = useState('');
  const [strength, setStrength] = useState('');
  const [form, setForm] = useState('');
  const [unit, setUnit] = useState('');
  const [category, setCategory] = useState('');
  const [locationId, setLocationId] = useState('');
  const [supplier, setSupplier] = useState('');
  const [batchNo, setBatchNo] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [stockQty, setStockQty] = useState('');
  const [reorderLevel, setReorderLevel] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [mfgDate, setMfgDate] = useState('');

  const canSubmit =
    medicationName.trim() &&
    strength.trim() &&
    form.trim() &&
    unit.trim() &&
    category.trim() &&
    locationId &&
    supplier &&
    batchNo.trim() &&
    expiryDate &&
    stockQty !== '' &&
    reorderLevel !== '' &&
    unitPrice !== '';

  function handleSubmit() {
    if (!canSubmit) return;
    onSubmit({
      medicationName: medicationName.trim(),
      strength: strength.trim(),
      form: form.trim(),
      unit: unit.trim(),
      category: category.trim(),
      locationId: locationId as PharmacyLocationId,
      supplier,
      batchNo: batchNo.trim(),
      expiryDate,
      stockQty: Number(stockQty),
      reorderLevel: Number(reorderLevel),
      unitPrice: Number(unitPrice),
      ...(manufacturer ? { manufacturer } : {}),
      ...(mfgDate ? { mfgDate } : {}),
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
          <div>
            <h2
              className="font-display font-semibold"
              style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
            >
              Add Stock
            </h2>
            <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
              Record a new batch received into inventory.
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label
                htmlFor="as-medication"
                className="mb-1.5 block font-sans font-medium"
                style={FIELD_LABEL}
              >
                Medication Name
              </label>
              <input
                id="as-medication"
                type="text"
                value={medicationName}
                onChange={(e) => setMedicationName(e.target.value)}
                placeholder="e.g. Amoxicillin"
                className={FIELD_INPUT_CLASS}
                style={FIELD_INPUT_STYLE}
              />
            </div>
            <div>
              <label
                htmlFor="as-strength"
                className="mb-1.5 block font-sans font-medium"
                style={FIELD_LABEL}
              >
                Strength
              </label>
              <input
                id="as-strength"
                type="text"
                value={strength}
                onChange={(e) => setStrength(e.target.value)}
                placeholder="e.g. 500mg"
                className={FIELD_INPUT_CLASS}
                style={FIELD_INPUT_STYLE}
              />
            </div>
            <div>
              <label
                htmlFor="as-form"
                className="mb-1.5 block font-sans font-medium"
                style={FIELD_LABEL}
              >
                Form
              </label>
              <input
                id="as-form"
                type="text"
                value={form}
                onChange={(e) => setForm(e.target.value)}
                placeholder="e.g. Capsule"
                className={FIELD_INPUT_CLASS}
                style={FIELD_INPUT_STYLE}
              />
            </div>
            <div>
              <label
                htmlFor="as-unit"
                className="mb-1.5 block font-sans font-medium"
                style={FIELD_LABEL}
              >
                Unit
              </label>
              <input
                id="as-unit"
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="e.g. Capsule"
                className={FIELD_INPUT_CLASS}
                style={FIELD_INPUT_STYLE}
              />
            </div>
            <div>
              <label
                htmlFor="as-category"
                className="mb-1.5 block font-sans font-medium"
                style={FIELD_LABEL}
              >
                Category
              </label>
              <input
                id="as-category"
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Antibiotics"
                className={FIELD_INPUT_CLASS}
                style={FIELD_INPUT_STYLE}
              />
            </div>
            <div>
              <label
                htmlFor="as-location"
                className="mb-1.5 block font-sans font-medium"
                style={FIELD_LABEL}
              >
                Location
              </label>
              <FormSelect
                id="as-location"
                value={locationId}
                onChange={setLocationId}
                options={INVENTORY_LOCATION_OPTIONS}
                placeholder="Select location"
              />
            </div>
            <div>
              <label
                htmlFor="as-supplier"
                className="mb-1.5 block font-sans font-medium"
                style={FIELD_LABEL}
              >
                Supplier
              </label>
              <FormSelect
                id="as-supplier"
                value={supplier}
                onChange={setSupplier}
                options={SUPPLIER_OPTIONS}
                placeholder="Select supplier"
              />
            </div>
            <div>
              <label
                htmlFor="as-batch"
                className="mb-1.5 block font-sans font-medium"
                style={FIELD_LABEL}
              >
                Batch No.
              </label>
              <input
                id="as-batch"
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
                htmlFor="as-expiry"
                className="mb-1.5 block font-sans font-medium"
                style={FIELD_LABEL}
              >
                Expiry Date
              </label>
              <input
                id="as-expiry"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className={FIELD_INPUT_CLASS}
                style={FIELD_INPUT_STYLE}
              />
            </div>
            <div>
              <label
                htmlFor="as-qty"
                className="mb-1.5 block font-sans font-medium"
                style={FIELD_LABEL}
              >
                Quantity Received
              </label>
              <input
                id="as-qty"
                type="number"
                min={0}
                value={stockQty}
                onChange={(e) => setStockQty(e.target.value)}
                placeholder="e.g. 500"
                className={FIELD_INPUT_CLASS}
                style={FIELD_INPUT_STYLE}
              />
            </div>
            <div>
              <label
                htmlFor="as-reorder"
                className="mb-1.5 block font-sans font-medium"
                style={FIELD_LABEL}
              >
                Reorder Level
              </label>
              <input
                id="as-reorder"
                type="number"
                min={0}
                value={reorderLevel}
                onChange={(e) => setReorderLevel(e.target.value)}
                placeholder="e.g. 100"
                className={FIELD_INPUT_CLASS}
                style={FIELD_INPUT_STYLE}
              />
            </div>
            <div>
              <label
                htmlFor="as-price"
                className="mb-1.5 block font-sans font-medium"
                style={FIELD_LABEL}
              >
                Unit Price (₦)
              </label>
              <input
                id="as-price"
                type="number"
                min={0}
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                placeholder="e.g. 45"
                className={FIELD_INPUT_CLASS}
                style={FIELD_INPUT_STYLE}
              />
            </div>
            <div>
              <label
                htmlFor="as-manufacturer"
                className="mb-1.5 block font-sans font-medium"
                style={FIELD_LABEL}
              >
                Manufacturer (Optional)
              </label>
              <FormSelect
                id="as-manufacturer"
                value={manufacturer}
                onChange={setManufacturer}
                options={MANUFACTURER_OPTIONS}
                placeholder="Select manufacturer"
              />
            </div>
            <div>
              <label
                htmlFor="as-mfgdate"
                className="mb-1.5 block font-sans font-medium"
                style={FIELD_LABEL}
              >
                Mfg. Date (Optional)
              </label>
              <input
                id="as-mfgdate"
                type="date"
                value={mfgDate}
                onChange={(e) => setMfgDate(e.target.value)}
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
            Add Stock
          </button>
        </div>
      </div>
    </div>
  );
}
