'use client';

import { X } from 'lucide-react';
import { useState } from 'react';

import { FormSelect } from '@components/shared/FormSelect';
import {
  SUPPLIER_CATEGORY_OPTIONS,
  SUPPLIER_CITY_OPTIONS,
  type SupplierCategory,
} from '@/features/pharmacy/__mocks__/pharmacyFixtures';
import type { AddSupplierInput } from '@/features/pharmacy/store/supplierStore';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const FIELD_LABEL = { fontSize: 14, color: '#0D2630' } as const;
const FIELD_INPUT_CLASS = `h-11 w-full rounded-[10px] px-3.5 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`;
const FIELD_INPUT_STYLE = {
  fontSize: 14,
  border: '1px solid rgba(0,100,130,0.18)',
  color: '#0D2630',
};

/** Registers a new supplier — lazy-loaded (checklist §14). Starts Pending
 * Approval; it isn't selectable on other stock-movement screens until
 * approved from its row menu here. */
export function AddSupplierModal({
  onSubmit,
  onClose,
}: {
  onSubmit: (input: AddSupplierInput) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<SupplierCategory>('Pharmaceuticals');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [location, setLocation] = useState('');
  const [address, setAddress] = useState('');

  const canSubmit =
    name.trim() !== '' &&
    contactPerson.trim() !== '' &&
    phone.trim() !== '' &&
    email.trim() !== '' &&
    location !== '' &&
    address.trim() !== '';

  function handleSubmit() {
    if (!canSubmit) return;
    onSubmit({
      name: name.trim(),
      category,
      contactPerson: contactPerson.trim(),
      phone: phone.trim(),
      email: email.trim(),
      location,
      address: address.trim(),
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
        style={{ maxWidth: 620, maxHeight: 'calc(100vh - 64px)', borderRadius: 16 }}
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
              Add Supplier
            </h2>
            <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
              Register a new supplier for procurement and stock receiving.
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
                htmlFor="as-name"
                className="mb-1.5 block font-sans font-medium"
                style={FIELD_LABEL}
              >
                Supplier Name *
              </label>
              <input
                id="as-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Trustcare Pharmaceuticals Ltd"
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
                Category *
              </label>
              <FormSelect
                id="as-category"
                value={category}
                onChange={(v) => setCategory(v as SupplierCategory)}
                options={SUPPLIER_CATEGORY_OPTIONS}
                placeholder="Select category"
              />
            </div>
            <div>
              <label
                htmlFor="as-location"
                className="mb-1.5 block font-sans font-medium"
                style={FIELD_LABEL}
              >
                Location *
              </label>
              <FormSelect
                id="as-location"
                value={location}
                onChange={setLocation}
                options={SUPPLIER_CITY_OPTIONS}
                placeholder="Select city"
              />
            </div>
            <div>
              <label
                htmlFor="as-contact"
                className="mb-1.5 block font-sans font-medium"
                style={FIELD_LABEL}
              >
                Contact Person *
              </label>
              <input
                id="as-contact"
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="e.g. Mrs. Amaka Nwosu"
                className={FIELD_INPUT_CLASS}
                style={FIELD_INPUT_STYLE}
              />
            </div>
            <div>
              <label
                htmlFor="as-phone"
                className="mb-1.5 block font-sans font-medium"
                style={FIELD_LABEL}
              >
                Phone *
              </label>
              <input
                id="as-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+234 803 000 0000"
                className={FIELD_INPUT_CLASS}
                style={FIELD_INPUT_STYLE}
              />
            </div>
            <div className="sm:col-span-2">
              <label
                htmlFor="as-email"
                className="mb-1.5 block font-sans font-medium"
                style={FIELD_LABEL}
              >
                Email *
              </label>
              <input
                id="as-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. sales@company.com"
                className={FIELD_INPUT_CLASS}
                style={FIELD_INPUT_STYLE}
              />
            </div>
            <div className="sm:col-span-2">
              <label
                htmlFor="as-address"
                className="mb-1.5 block font-sans font-medium"
                style={FIELD_LABEL}
              >
                Full Address *
              </label>
              <input
                id="as-address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. 12 Marina Road, Lagos, Nigeria"
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
            Add Supplier
          </button>
        </div>
      </div>
    </div>
  );
}
