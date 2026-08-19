'use client';

import { X } from 'lucide-react';
import { useState } from 'react';

import { FormDateInput } from '@components/shared/FormDateInput';
import { FormSelect } from '@components/shared/FormSelect';
import { BILLING_ACCOUNTS } from '@/features/billing/__mocks__/billingAccountsFixtures';
import {
  INVOICE_SERVICE_OPTIONS,
  type InvoiceWithAccount,
} from '@/features/billing/__mocks__/billingAccountDetailFixtures';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';
const INPUT_CLASS =
  'h-11 w-full rounded-[10px] px-3.5 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40';
const INPUT_STYLE = { fontSize: 14, border: '1px solid rgba(0,100,130,0.18)', color: '#0D2630' };

function toDateInputValue(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function CreateInvoiceModal({
  defaultMrn,
  onClose,
  onCreate,
}: {
  defaultMrn?: string | undefined;
  onClose: () => void;
  onCreate: (invoice: InvoiceWithAccount) => void;
}) {
  const [mrn, setMrn] = useState(
    () => BILLING_ACCOUNTS.find((a) => a.mrn === defaultMrn)?.mrn ?? BILLING_ACCOUNTS[0]?.mrn ?? '',
  );
  const [service, setService] = useState(INVOICE_SERVICE_OPTIONS[0] ?? 'Consultation');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(() =>
    toDateInputValue(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
  );

  const account = BILLING_ACCOUNTS.find((a) => a.mrn === mrn);
  const canSubmit = !!account && Number(amount) > 0;

  function handleSubmit() {
    if (!account || !canSubmit) return;
    const now = new Date().toISOString();
    onCreate({
      id: `inv-new-${Date.now()}`,
      invoiceNumber: `INV-${String(2600 + Math.floor(Math.random() * 300))}`,
      date: now,
      dueDate: new Date(dueDate).toISOString(),
      description: description.trim() || service,
      service,
      amount: Number(amount),
      paid: 0,
      status: 'Issued',
      patientName: account.patientName,
      mrn: account.mrn,
      secondaryId: account.secondaryId,
      department: account.department,
      phone: account.phone,
      email: account.email,
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
        style={{ maxWidth: 460, borderRadius: 16 }}
      >
        <div
          className="flex shrink-0 items-start justify-between gap-3 px-6 py-5"
          style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
        >
          <h2 className="font-display font-semibold" style={{ fontSize: 20, color: '#0D2630' }}>
            Create Invoice
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

        <div className="flex flex-col gap-3.5 px-6 py-5">
          <div>
            <label
              className="mb-1.5 block font-sans font-medium"
              style={{ fontSize: 14, color: '#0D2630' }}
            >
              Patient
            </label>
            <FormSelect
              id="create-invoice-patient"
              value={mrn}
              onChange={setMrn}
              options={BILLING_ACCOUNTS.map((a) => ({
                value: a.mrn,
                label: `${a.patientName} (${a.mrn})`,
              }))}
              placeholder="Select patient"
            />
          </div>
          <div>
            <label
              className="mb-1.5 block font-sans font-medium"
              style={{ fontSize: 14, color: '#0D2630' }}
            >
              Service
            </label>
            <FormSelect
              id="create-invoice-service"
              value={service}
              onChange={setService}
              options={INVOICE_SERVICE_OPTIONS.map((s) => ({ value: s, label: s }))}
              placeholder="Select service"
            />
          </div>
          <div>
            <label
              className="mb-1.5 block font-sans font-medium"
              style={{ fontSize: 14, color: '#0D2630' }}
            >
              Description (optional)
            </label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={service}
              className={INPUT_CLASS}
              style={INPUT_STYLE}
            />
          </div>
          <div>
            <label
              className="mb-1.5 block font-sans font-medium"
              style={{ fontSize: 14, color: '#0D2630' }}
            >
              Amount (₦)
            </label>
            <input
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className={INPUT_CLASS}
              style={INPUT_STYLE}
            />
          </div>
          <div>
            <label
              className="mb-1.5 block font-sans font-medium"
              style={{ fontSize: 14, color: '#0D2630' }}
            >
              Due Date
            </label>
            <FormDateInput
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              aria-label="Due date"
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
            className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
            style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 ${canSubmit ? 'hover:opacity-90' : 'cursor-not-allowed opacity-50'} ${FOCUS_RING}`}
            style={{ fontSize: 14, background: '#00B4D8' }}
          >
            Create Invoice
          </button>
        </div>
      </div>
    </div>
  );
}
