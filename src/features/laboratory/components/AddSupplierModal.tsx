'use client';

import { X } from 'lucide-react';
import { useState } from 'react';

import { FormSelect } from '@components/shared/FormSelect';
import { FormTextarea } from '@components/shared/FormTextarea';
import {
  SUPPLIER_CATEGORY_OPTIONS,
  SUPPLIER_LOCATION_OPTIONS,
  type Supplier,
  type SupplierCategory,
} from '@/features/laboratory/__mocks__/supplierFixtures';
import { addSupplier, type NewSupplierInput } from '@/features/laboratory/store/supplierStore';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';
const FIELD_LABEL = { fontSize: 14, color: '#0D2630' } as const;
const FIELD_LABEL_CLASS = 'mb-1.5 flex min-h-10 items-end font-sans font-medium';
const FIELD_INPUT_CLASS = `h-11 w-full rounded-[10px] px-3.5 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`;
const PAYMENT_TERMS_OPTIONS = [
  { value: '15 Days', label: '15 Days' },
  { value: '30 Days', label: '30 Days' },
  { value: '45 Days', label: '45 Days' },
  { value: '60 Days', label: '60 Days' },
];

/** Adds a new supplier — always enters as Pending Evaluation, matching the
 * real vendor onboarding workflow. Lazy-loaded (checklist §14). */
export function AddSupplierModal({
  onSubmit,
  onClose,
}: {
  onSubmit: (supplier: Supplier) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<SupplierCategory>('Reagents & Kits');
  const [contactPerson, setContactPerson] = useState('');
  const [contactRole, setContactRole] = useState('');
  const [phone, setPhone] = useState('');
  const [altPhone, setAltPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('30 Days');
  const [creditLimit, setCreditLimit] = useState('');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const isValid =
    name.trim() !== '' &&
    contactPerson.trim() !== '' &&
    phone.trim() !== '' &&
    email.trim() !== '' &&
    city !== '';

  function handleSubmit() {
    setSubmitted(true);
    if (!isValid) return;
    const input: NewSupplierInput = {
      name: name.trim(),
      category,
      contactPerson: contactPerson.trim(),
      contactRole: contactRole.trim() || 'Sales Manager',
      phone: phone.trim(),
      altPhone: altPhone.trim(),
      email: email.trim(),
      address: address.trim(),
      city,
      paymentTerms,
      creditLimit: Number(creditLimit) || 0,
      notes: notes.trim(),
    };
    onSubmit(addSupplier(input));
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
        style={{ maxWidth: 680, maxHeight: 'calc(100vh - 48px)', borderRadius: 16 }}
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
              Add New Supplier
            </h2>
            <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
              New suppliers enter as Pending Evaluation until approved.
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
            <div>
              <label className={FIELD_LABEL_CLASS} style={FIELD_LABEL}>
                Supplier Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Medline Scientific Ltd."
                className={FIELD_INPUT_CLASS}
                style={{
                  fontSize: 14,
                  border: `1px solid ${submitted && !name.trim() ? '#EF4444' : 'rgba(0,100,130,0.18)'}`,
                  color: '#0D2630',
                }}
              />
            </div>
            <div>
              <label className={FIELD_LABEL_CLASS} style={FIELD_LABEL}>
                Category
              </label>
              <FormSelect
                id="sup-category"
                value={category}
                onChange={(v) => setCategory(v as SupplierCategory)}
                options={SUPPLIER_CATEGORY_OPTIONS.map((c) => ({ value: c, label: c }))}
                placeholder="Select category"
              />
            </div>
            <div>
              <label className={FIELD_LABEL_CLASS} style={FIELD_LABEL}>
                Contact Person
              </label>
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="e.g. John Adeyemi"
                className={FIELD_INPUT_CLASS}
                style={{
                  fontSize: 14,
                  border: `1px solid ${submitted && !contactPerson.trim() ? '#EF4444' : 'rgba(0,100,130,0.18)'}`,
                  color: '#0D2630',
                }}
              />
            </div>
            <div>
              <label className={FIELD_LABEL_CLASS} style={FIELD_LABEL}>
                Contact Role
              </label>
              <input
                type="text"
                value={contactRole}
                onChange={(e) => setContactRole(e.target.value)}
                placeholder="e.g. Sales Manager"
                className={FIELD_INPUT_CLASS}
                style={{ fontSize: 14, border: '1px solid rgba(0,100,130,0.18)', color: '#0D2630' }}
              />
            </div>
            <div>
              <label className={FIELD_LABEL_CLASS} style={FIELD_LABEL}>
                Phone
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0803 456 7890"
                className={FIELD_INPUT_CLASS}
                style={{
                  fontSize: 14,
                  border: `1px solid ${submitted && !phone.trim() ? '#EF4444' : 'rgba(0,100,130,0.18)'}`,
                  color: '#0D2630',
                }}
              />
            </div>
            <div>
              <label className={FIELD_LABEL_CLASS} style={FIELD_LABEL}>
                Alternate Phone
              </label>
              <input
                type="tel"
                value={altPhone}
                onChange={(e) => setAltPhone(e.target.value)}
                placeholder="0901 234 5678"
                className={FIELD_INPUT_CLASS}
                style={{ fontSize: 14, border: '1px solid rgba(0,100,130,0.18)', color: '#0D2630' }}
              />
            </div>
            <div>
              <label className={FIELD_LABEL_CLASS} style={FIELD_LABEL}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contact@supplier.com"
                className={FIELD_INPUT_CLASS}
                style={{
                  fontSize: 14,
                  border: `1px solid ${submitted && !email.trim() ? '#EF4444' : 'rgba(0,100,130,0.18)'}`,
                  color: '#0D2630',
                }}
              />
            </div>
            <div>
              <label className={FIELD_LABEL_CLASS} style={FIELD_LABEL}>
                City / Location
              </label>
              <FormSelect
                id="sup-city"
                value={city || undefined}
                onChange={setCity}
                options={SUPPLIER_LOCATION_OPTIONS.map((c) => ({ value: c, label: c }))}
                placeholder="Select location"
                hasError={submitted && city === ''}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={FIELD_LABEL_CLASS} style={FIELD_LABEL}>
                Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street address"
                className={FIELD_INPUT_CLASS}
                style={{ fontSize: 14, border: '1px solid rgba(0,100,130,0.18)', color: '#0D2630' }}
              />
            </div>
            <div>
              <label className={FIELD_LABEL_CLASS} style={FIELD_LABEL}>
                Payment Terms
              </label>
              <FormSelect
                id="sup-payment-terms"
                value={paymentTerms}
                onChange={setPaymentTerms}
                options={PAYMENT_TERMS_OPTIONS}
                placeholder="Select terms"
              />
            </div>
            <div>
              <label className={FIELD_LABEL_CLASS} style={FIELD_LABEL}>
                Credit Limit (₦)
              </label>
              <input
                type="number"
                min={0}
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
                placeholder="0.00"
                className={FIELD_INPUT_CLASS}
                style={{ fontSize: 14, border: '1px solid rgba(0,100,130,0.18)', color: '#0D2630' }}
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="font-sans font-medium" style={FIELD_LABEL}>
              Notes
            </label>
            <FormTextarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional context about this supplier..."
              className="mt-1.5"
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
            style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.18)' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className={`flex h-11 items-center rounded-[10px] px-5 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
            style={{ fontSize: 14, background: '#00B4D8' }}
          >
            Add Supplier
          </button>
        </div>
      </div>
    </div>
  );
}
