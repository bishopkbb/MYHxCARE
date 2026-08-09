'use client';

import { X } from 'lucide-react';
import { useState } from 'react';

import { FormDateInput } from '@components/shared/FormDateInput';
import { FormSelect } from '@components/shared/FormSelect';
import { FormTextarea } from '@components/shared/FormTextarea';
import {
  CATEGORY_OPTIONS,
  LOCATION_OPTIONS,
  type InventoryCategory,
  type InventoryItem,
} from '@/features/laboratory/__mocks__/inventoryFixtures';
import { DEPARTMENT_OPTIONS } from '@/features/laboratory/__mocks__/equipmentFixtures';
import {
  addInventoryItem,
  type NewInventoryItemInput,
} from '@/features/laboratory/store/inventoryStore';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';
const FIELD_LABEL = { fontSize: 14, color: '#0D2630' } as const;
const FIELD_INPUT_CLASS = `h-11 w-full rounded-[10px] px-3.5 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`;
const FIELD_INPUT_STYLE = {
  fontSize: 14,
  border: '1px solid rgba(0,100,130,0.18)',
  color: '#0D2630',
} as const;

const STORAGE_OPTIONS = [
  { value: '2 - 8°C', label: '2 - 8°C (Refrigerated)' },
  { value: '2 - 25°C', label: '2 - 25°C' },
  { value: '-20°C', label: '-20°C (Frozen)' },
  { value: 'Room Temperature', label: 'Room Temperature' },
];

/** Registers a new inventory item — lazy-loaded (checklist §14). */
export function AddInventoryItemModal({
  onSubmit,
  onClose,
}: {
  onSubmit: (item: InventoryItem) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<InventoryCategory | ''>('');
  const [department, setDepartment] = useState('');
  const [lotBatchNo, setLotBatchNo] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [unit, setUnit] = useState('');
  const [currentStock, setCurrentStock] = useState('');
  const [minStock, setMinStock] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [packSize, setPackSize] = useState('');
  const [storageCondition, setStorageCondition] = useState('Room Temperature');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const isValid =
    name.trim() !== '' &&
    category !== '' &&
    department !== '' &&
    lotBatchNo.trim() !== '' &&
    unit.trim() !== '' &&
    currentStock !== '' &&
    minStock !== '' &&
    unitPrice !== '' &&
    manufacturer.trim() !== '' &&
    location !== '';

  function handleSubmit() {
    setSubmitted(true);
    if (!isValid || !category) return;
    const input: NewInventoryItemInput = {
      name: name.trim(),
      category,
      department,
      lotBatchNo: lotBatchNo.trim(),
      expiryDate: expiryDate ? new Date(expiryDate).toISOString() : null,
      unit: unit.trim(),
      currentStock: Number(currentStock),
      minStock: Number(minStock),
      unitPrice: Number(unitPrice),
      manufacturer: manufacturer.trim(),
      packSize: packSize.trim() || unit.trim(),
      storageCondition,
      location,
      description: description.trim(),
    };
    onSubmit(addInventoryItem(input));
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
        style={{ maxWidth: 640, maxHeight: 'calc(100vh - 48px)', borderRadius: 16 }}
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
              Add New Item
            </h2>
            <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
              Register a new reagent, kit, consumable, or supply.
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
              <label htmlFor="inv-name" className="font-sans font-medium" style={FIELD_LABEL}>
                Item Name
              </label>
              <input
                id="inv-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. RBC Diluent"
                className={`mt-1.5 ${FIELD_INPUT_CLASS}`}
                style={{
                  ...FIELD_INPUT_STYLE,
                  border:
                    submitted && !name.trim() ? '1px solid #EF4444' : FIELD_INPUT_STYLE.border,
                }}
              />
            </div>
            <div>
              <label htmlFor="inv-category" className="font-sans font-medium" style={FIELD_LABEL}>
                Category
              </label>
              <div className="mt-1.5">
                <FormSelect
                  id="inv-category"
                  value={category || undefined}
                  onChange={(v) => setCategory(v as InventoryCategory)}
                  options={CATEGORY_OPTIONS.map((c) => ({ value: c, label: c }))}
                  placeholder="Select category"
                  hasError={submitted && category === ''}
                />
              </div>
            </div>
            <div>
              <label htmlFor="inv-department" className="font-sans font-medium" style={FIELD_LABEL}>
                Department
              </label>
              <div className="mt-1.5">
                <FormSelect
                  id="inv-department"
                  value={department || undefined}
                  onChange={setDepartment}
                  options={DEPARTMENT_OPTIONS.map((d) => ({ value: d, label: d }))}
                  placeholder="Select department"
                  hasError={submitted && department === ''}
                />
              </div>
            </div>
            <div>
              <label htmlFor="inv-lot" className="font-sans font-medium" style={FIELD_LABEL}>
                Lot/Batch No.
              </label>
              <input
                id="inv-lot"
                type="text"
                value={lotBatchNo}
                onChange={(e) => setLotBatchNo(e.target.value)}
                placeholder="e.g. LOT250501"
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
              <label htmlFor="inv-expiry" className="font-sans font-medium" style={FIELD_LABEL}>
                Expiry Date <span style={{ color: '#8A98A3' }}>(optional)</span>
              </label>
              <div className="mt-1.5">
                <FormDateInput
                  id="inv-expiry"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label htmlFor="inv-unit" className="font-sans font-medium" style={FIELD_LABEL}>
                Unit
              </label>
              <input
                id="inv-unit"
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="e.g. 100 Tests, 500 mL"
                className={`mt-1.5 ${FIELD_INPUT_CLASS}`}
                style={{
                  ...FIELD_INPUT_STYLE,
                  border:
                    submitted && !unit.trim() ? '1px solid #EF4444' : FIELD_INPUT_STYLE.border,
                }}
              />
            </div>
            <div>
              <label
                htmlFor="inv-current-stock"
                className="font-sans font-medium"
                style={FIELD_LABEL}
              >
                Current Stock
              </label>
              <input
                id="inv-current-stock"
                type="number"
                min={0}
                value={currentStock}
                onChange={(e) => setCurrentStock(e.target.value)}
                placeholder="0"
                className={`mt-1.5 ${FIELD_INPUT_CLASS}`}
                style={{
                  ...FIELD_INPUT_STYLE,
                  border:
                    submitted && currentStock === ''
                      ? '1px solid #EF4444'
                      : FIELD_INPUT_STYLE.border,
                }}
              />
            </div>
            <div>
              <label htmlFor="inv-min-stock" className="font-sans font-medium" style={FIELD_LABEL}>
                Minimum Stock
              </label>
              <input
                id="inv-min-stock"
                type="number"
                min={0}
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
                placeholder="0"
                className={`mt-1.5 ${FIELD_INPUT_CLASS}`}
                style={{
                  ...FIELD_INPUT_STYLE,
                  border:
                    submitted && minStock === '' ? '1px solid #EF4444' : FIELD_INPUT_STYLE.border,
                }}
              />
            </div>
            <div>
              <label htmlFor="inv-price" className="font-sans font-medium" style={FIELD_LABEL}>
                Unit Price (₦)
              </label>
              <input
                id="inv-price"
                type="number"
                min={0}
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                placeholder="0.00"
                className={`mt-1.5 ${FIELD_INPUT_CLASS}`}
                style={{
                  ...FIELD_INPUT_STYLE,
                  border:
                    submitted && unitPrice === '' ? '1px solid #EF4444' : FIELD_INPUT_STYLE.border,
                }}
              />
            </div>
            <div>
              <label
                htmlFor="inv-manufacturer"
                className="font-sans font-medium"
                style={FIELD_LABEL}
              >
                Manufacturer
              </label>
              <input
                id="inv-manufacturer"
                type="text"
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                placeholder="e.g. Roche Diagnostics"
                className={`mt-1.5 ${FIELD_INPUT_CLASS}`}
                style={{
                  ...FIELD_INPUT_STYLE,
                  border:
                    submitted && !manufacturer.trim()
                      ? '1px solid #EF4444'
                      : FIELD_INPUT_STYLE.border,
                }}
              />
            </div>
            <div>
              <label htmlFor="inv-pack-size" className="font-sans font-medium" style={FIELD_LABEL}>
                Pack Size <span style={{ color: '#8A98A3' }}>(optional)</span>
              </label>
              <input
                id="inv-pack-size"
                type="text"
                value={packSize}
                onChange={(e) => setPackSize(e.target.value)}
                placeholder="Defaults to Unit"
                className={`mt-1.5 ${FIELD_INPUT_CLASS}`}
                style={FIELD_INPUT_STYLE}
              />
            </div>
            <div>
              <label htmlFor="inv-storage" className="font-sans font-medium" style={FIELD_LABEL}>
                Storage Condition
              </label>
              <div className="mt-1.5">
                <FormSelect
                  id="inv-storage"
                  value={storageCondition}
                  onChange={setStorageCondition}
                  options={STORAGE_OPTIONS}
                  placeholder="Select storage condition"
                />
              </div>
            </div>
            <div>
              <label htmlFor="inv-location" className="font-sans font-medium" style={FIELD_LABEL}>
                Location
              </label>
              <div className="mt-1.5">
                <FormSelect
                  id="inv-location"
                  value={location || undefined}
                  onChange={setLocation}
                  options={LOCATION_OPTIONS.map((l) => ({ value: l, label: l }))}
                  placeholder="Select location"
                  hasError={submitted && location === ''}
                />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label
                htmlFor="inv-description"
                className="font-sans font-medium"
                style={FIELD_LABEL}
              >
                Description
              </label>
              <FormTextarea
                id="inv-description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of what this item is used for..."
                className="mt-1.5"
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
            style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className={`flex h-11 items-center rounded-[10px] px-5 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
            style={{ fontSize: 14, background: '#00B4D8' }}
          >
            Add Item
          </button>
        </div>
      </div>
    </div>
  );
}
