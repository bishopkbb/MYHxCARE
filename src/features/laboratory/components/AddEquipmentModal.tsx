'use client';

import { X } from 'lucide-react';
import { useState } from 'react';

import { FormDateInput } from '@components/shared/FormDateInput';
import { FormSelect } from '@components/shared/FormSelect';
import { FormTextarea } from '@components/shared/FormTextarea';
import { toWATDateInput } from '@/utils/datetime';
import {
  DEPARTMENT_OPTIONS,
  EQUIPMENT_TYPE_OPTIONS,
  type EquipmentStatus,
  type EquipmentType,
} from '@/features/laboratory/__mocks__/equipmentFixtures';
import { addEquipment, type NewEquipmentInput } from '@/features/laboratory/store/equipmentStore';
import type { EquipmentRecord } from '@/features/laboratory/__mocks__/equipmentFixtures';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';
const FIELD_LABEL = { fontSize: 14, color: '#0D2630' } as const;
const FIELD_INPUT_CLASS = `h-11 w-full rounded-[10px] px-3.5 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`;
const FIELD_INPUT_STYLE = {
  fontSize: 14,
  border: '1px solid rgba(0,100,130,0.18)',
  color: '#0D2630',
} as const;

const STATUS_OPTIONS: { value: EquipmentStatus; label: string }[] = [
  { value: 'In Use', label: 'In Use' },
  { value: 'Available', label: 'Available' },
  { value: 'Under Maintenance', label: 'Under Maintenance' },
  { value: 'Out of Service', label: 'Out of Service' },
];

const INTERVAL_OPTIONS = [
  { value: '30', label: 'Every 30 days' },
  { value: '60', label: 'Every 60 days' },
  { value: '90', label: 'Every 90 days' },
  { value: '180', label: 'Every 180 days' },
  { value: '365', label: 'Every 365 days' },
];

/** Registers new equipment — lazy-loaded (checklist §14). */
export function AddEquipmentModal({
  onSubmit,
  onClose,
}: {
  onSubmit: (record: EquipmentRecord) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [department, setDepartment] = useState('');
  const [equipmentType, setEquipmentType] = useState<EquipmentType | ''>('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState<EquipmentStatus>('Available');
  const [manufacturer, setManufacturer] = useState('');
  const [installationDate, setInstallationDate] = useState(toWATDateInput());
  const [warrantyExpiry, setWarrantyExpiry] = useState('');
  const [description, setDescription] = useState('');
  const [intervalDays, setIntervalDays] = useState('90');
  const [submitted, setSubmitted] = useState(false);

  const isValid =
    name.trim() !== '' &&
    model.trim() !== '' &&
    serialNumber.trim() !== '' &&
    department !== '' &&
    equipmentType !== '' &&
    location.trim() !== '' &&
    manufacturer.trim() !== '';

  function handleSubmit() {
    setSubmitted(true);
    if (!isValid || !equipmentType) return;
    const input: NewEquipmentInput = {
      name: name.trim(),
      model: model.trim(),
      serialNumber: serialNumber.trim(),
      department,
      equipmentType,
      location: location.trim(),
      status,
      manufacturer: manufacturer.trim(),
      installationDate: new Date(installationDate).toISOString(),
      warrantyExpiry: warrantyExpiry ? new Date(warrantyExpiry).toISOString() : '',
      description: description.trim(),
      calibrationIntervalDays: Number(intervalDays),
    };
    onSubmit(addEquipment(input));
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
              Add New Equipment
            </h2>
            <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
              Register a new instrument or appliance for tracking.
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
              <label htmlFor="eq-name" className="font-sans font-medium" style={FIELD_LABEL}>
                Equipment Name
              </label>
              <input
                id="eq-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Chemistry Analyzer"
                className={`mt-1.5 ${FIELD_INPUT_CLASS}`}
                style={{
                  ...FIELD_INPUT_STYLE,
                  border:
                    submitted && !name.trim() ? '1px solid #EF4444' : FIELD_INPUT_STYLE.border,
                }}
              />
            </div>
            <div>
              <label htmlFor="eq-model" className="font-sans font-medium" style={FIELD_LABEL}>
                Model
              </label>
              <input
                id="eq-model"
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. Cobas c311"
                className={`mt-1.5 ${FIELD_INPUT_CLASS}`}
                style={{
                  ...FIELD_INPUT_STYLE,
                  border:
                    submitted && !model.trim() ? '1px solid #EF4444' : FIELD_INPUT_STYLE.border,
                }}
              />
            </div>
            <div>
              <label htmlFor="eq-serial" className="font-sans font-medium" style={FIELD_LABEL}>
                Serial Number
              </label>
              <input
                id="eq-serial"
                type="text"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                placeholder="e.g. SN-C311-2391"
                className={`mt-1.5 ${FIELD_INPUT_CLASS}`}
                style={{
                  ...FIELD_INPUT_STYLE,
                  border:
                    submitted && !serialNumber.trim()
                      ? '1px solid #EF4444'
                      : FIELD_INPUT_STYLE.border,
                }}
              />
            </div>
            <div>
              <label htmlFor="eq-department" className="font-sans font-medium" style={FIELD_LABEL}>
                Department
              </label>
              <div className="mt-1.5">
                <FormSelect
                  id="eq-department"
                  value={department || undefined}
                  onChange={setDepartment}
                  options={DEPARTMENT_OPTIONS.map((d) => ({ value: d, label: d }))}
                  placeholder="Select department"
                  hasError={submitted && department === ''}
                />
              </div>
            </div>
            <div>
              <label htmlFor="eq-type" className="font-sans font-medium" style={FIELD_LABEL}>
                Equipment Type
              </label>
              <div className="mt-1.5">
                <FormSelect
                  id="eq-type"
                  value={equipmentType || undefined}
                  onChange={(v) => setEquipmentType(v as EquipmentType)}
                  options={EQUIPMENT_TYPE_OPTIONS.map((t) => ({ value: t, label: t }))}
                  placeholder="Select type"
                  hasError={submitted && equipmentType === ''}
                />
              </div>
            </div>
            <div>
              <label htmlFor="eq-location" className="font-sans font-medium" style={FIELD_LABEL}>
                Location
              </label>
              <input
                id="eq-location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Main Lab - Room 1"
                className={`mt-1.5 ${FIELD_INPUT_CLASS}`}
                style={{
                  ...FIELD_INPUT_STYLE,
                  border:
                    submitted && !location.trim() ? '1px solid #EF4444' : FIELD_INPUT_STYLE.border,
                }}
              />
            </div>
            <div>
              <label htmlFor="eq-status" className="font-sans font-medium" style={FIELD_LABEL}>
                Status
              </label>
              <div className="mt-1.5">
                <FormSelect
                  id="eq-status"
                  value={status}
                  onChange={(v) => setStatus(v as EquipmentStatus)}
                  options={STATUS_OPTIONS}
                  placeholder="Select status"
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="eq-manufacturer"
                className="font-sans font-medium"
                style={FIELD_LABEL}
              >
                Manufacturer
              </label>
              <input
                id="eq-manufacturer"
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
              <label htmlFor="eq-install" className="font-sans font-medium" style={FIELD_LABEL}>
                Installation Date
              </label>
              <div className="mt-1.5">
                <FormDateInput
                  id="eq-install"
                  value={installationDate}
                  onChange={(e) => setInstallationDate(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label htmlFor="eq-warranty" className="font-sans font-medium" style={FIELD_LABEL}>
                Warranty Expiry
              </label>
              <div className="mt-1.5">
                <FormDateInput
                  id="eq-warranty"
                  value={warrantyExpiry}
                  onChange={(e) => setWarrantyExpiry(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label htmlFor="eq-interval" className="font-sans font-medium" style={FIELD_LABEL}>
                Calibration Interval
              </label>
              <div className="mt-1.5">
                <FormSelect
                  id="eq-interval"
                  value={intervalDays}
                  onChange={setIntervalDays}
                  options={INTERVAL_OPTIONS}
                  placeholder="Select interval"
                />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="eq-description" className="font-sans font-medium" style={FIELD_LABEL}>
                Description
              </label>
              <FormTextarea
                id="eq-description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of what this equipment is used for..."
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
            Add Equipment
          </button>
        </div>
      </div>
    </div>
  );
}
