'use client';

import { X } from 'lucide-react';
import { useState } from 'react';

import { FormField } from '@components/shared/FormField';
import { FormInput } from '@components/shared/FormInput';
import { FormSelect } from '@components/shared/FormSelect';
import { ORG_DEPARTMENT_OPTIONS } from '@/constants/organizationalDepartments';
import type { OrganizationalDepartment } from '@/constants/organizationalDepartments';
import { useToast } from '@/hooks/useToast';
import { formatCurrencyInput, parseCurrencyInput } from '@/utils/currency';
import {
  CATEGORY_OPTIONS,
  nextServiceId,
  type ServiceCategory,
  type ServiceRecord,
} from '@/features/administration/__mocks__/servicePricingFixtures';
import { addService, useServices } from '@/features/administration/store/servicePricingStore';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

export function AddServiceModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (service: ServiceRecord) => void;
}) {
  const toast = useToast();
  const services = useServices();

  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [submitted, setSubmitted] = useState(false);

  const priceValue = parseCurrencyInput(price);
  const isValid = name.trim() && department && category && priceValue > 0;

  function handleSubmit() {
    setSubmitted(true);
    if (!isValid) {
      toast.error('Required', 'Please fill in name, department, category, and a valid price.');
      return;
    }
    const now = new Date().toISOString();
    const service: ServiceRecord = {
      id: nextServiceId(services),
      name: name.trim(),
      department: department as OrganizationalDepartment,
      category: category as ServiceCategory,
      currentPrice: priceValue,
      effectiveDate: new Date(effectiveDate).toISOString(),
      pendingPrice: null,
      pendingEffectiveDate: null,
      status: 'Active',
      previousStatus: null,
      lastUpdatedAt: now,
      lastUpdatedBy: 'Admin User',
    };
    addService(service);
    onSubmit(service);
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
        style={{ maxWidth: 520, maxHeight: 'calc(100vh - 64px)', borderRadius: 16 }}
      >
        <div
          className="flex shrink-0 items-start justify-between gap-3 px-6 py-5"
          style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
        >
          <h2
            className="font-display font-semibold"
            style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
          >
            Add Service
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
          <div className="flex flex-col gap-4">
            <FormField
              label="Service Name"
              htmlFor="new-service-name"
              required
              error={submitted && !name.trim() ? 'Required' : undefined}
            >
              <FormInput
                id="new-service-name"
                placeholder="e.g. Follow-up Consultation"
                value={name}
                onChange={(e) => setName(e.target.value)}
                hasError={submitted && !name.trim()}
              />
            </FormField>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                label="Department"
                htmlFor="new-service-department"
                required
                error={submitted && !department ? 'Required' : undefined}
              >
                <FormSelect
                  id="new-service-department"
                  value={department}
                  onChange={setDepartment}
                  options={ORG_DEPARTMENT_OPTIONS}
                  placeholder="Select department"
                  hasError={submitted && !department}
                />
              </FormField>
              <FormField
                label="Category"
                htmlFor="new-service-category"
                required
                error={submitted && !category ? 'Required' : undefined}
              >
                <FormSelect
                  id="new-service-category"
                  value={category}
                  onChange={setCategory}
                  options={CATEGORY_OPTIONS}
                  placeholder="Select category"
                  hasError={submitted && !category}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                label="Price (₦)"
                htmlFor="new-service-price"
                required
                error={submitted && priceValue <= 0 ? 'Enter a valid price' : undefined}
              >
                <FormInput
                  id="new-service-price"
                  placeholder="0.00"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  onBlur={() =>
                    setPrice((v) => (v ? formatCurrencyInput(parseCurrencyInput(v)) : v))
                  }
                  hasError={submitted && priceValue <= 0}
                />
              </FormField>
              <FormField label="Effective Date" htmlFor="new-service-date">
                <FormInput
                  id="new-service-date"
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                />
              </FormField>
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
            className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
            style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
            style={{ fontSize: 14, background: '#00B4D8' }}
          >
            Add Service
          </button>
        </div>
      </div>
    </div>
  );
}
