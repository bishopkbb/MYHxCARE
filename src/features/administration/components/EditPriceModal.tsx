'use client';

import { X } from 'lucide-react';
import { useState } from 'react';

import { FormField } from '@components/shared/FormField';
import { FormInput } from '@components/shared/FormInput';
import { useToast } from '@/hooks/useToast';
import { formatCurrencyInput, formatCurrencyWhole, parseCurrencyInput } from '@/utils/currency';
import type { ServiceRecord } from '@/features/administration/__mocks__/servicePricingFixtures';
import { proposeNewPrice } from '@/features/administration/store/servicePricingStore';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

/** Never edits a service's published currentPrice/effectiveDate directly,
 * per "published prices cannot be edited": this always creates a new
 * pending change, reviewed and published from the Price Changes Awaiting
 * Publication tab. */
export function EditPriceModal({
  service,
  onClose,
  onSubmit,
}: {
  service: ServiceRecord;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const toast = useToast();
  const [price, setPrice] = useState(
    service.pendingPrice !== null ? formatCurrencyInput(service.pendingPrice) : '',
  );
  const [effectiveDate, setEffectiveDate] = useState(
    (service.pendingEffectiveDate ?? new Date().toISOString()).slice(0, 10),
  );
  const [submitted, setSubmitted] = useState(false);

  const priceValue = parseCurrencyInput(price);
  const isValid = priceValue > 0 && effectiveDate;

  function handleSubmit() {
    setSubmitted(true);
    if (!isValid) {
      toast.error('Required', 'Please enter a valid price and effective date.');
      return;
    }
    proposeNewPrice(service.id, priceValue, new Date(effectiveDate).toISOString());
    onSubmit();
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
        style={{ maxWidth: 480, maxHeight: 'calc(100vh - 64px)', borderRadius: 16 }}
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
              Edit Price
            </h2>
            <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
              {service.name}
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
          <div
            className="flex items-center justify-between gap-2 rounded-[10px] p-3.5"
            style={{ background: '#F5FBFD', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <span style={{ fontSize: 14, color: '#8A98A3' }}>Current published price</span>
            <span className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
              {formatCurrencyWhole(service.currentPrice)}
            </span>
          </div>

          <div className="mt-4 flex flex-col gap-4">
            <FormField
              label="New Price (₦)"
              htmlFor="edit-price-value"
              required
              error={submitted && priceValue <= 0 ? 'Enter a valid price' : undefined}
              hint="This creates a pending change, it will not go live until published."
            >
              <FormInput
                id="edit-price-value"
                placeholder="0.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                onBlur={() => setPrice((v) => (v ? formatCurrencyInput(parseCurrencyInput(v)) : v))}
                hasError={submitted && priceValue <= 0}
              />
            </FormField>
            <FormField label="Effective Date" htmlFor="edit-price-date" required>
              <FormInput
                id="edit-price-date"
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
              />
            </FormField>
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
            Submit for Publication
          </button>
        </div>
      </div>
    </div>
  );
}
