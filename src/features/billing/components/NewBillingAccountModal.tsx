'use client';

import { X } from 'lucide-react';
import { useState } from 'react';

import { FormSelect } from '@components/shared/FormSelect';
import {
  BILLING_ACCOUNT_DEPARTMENTS,
  type BillingAccount,
} from '@/features/billing/__mocks__/billingAccountsFixtures';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';
const INPUT_CLASS =
  'h-11 w-full rounded-[10px] px-3.5 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40';
const INPUT_STYLE = { fontSize: 14, border: '1px solid rgba(0,100,130,0.18)', color: '#0D2630' };

function nextMrn(): string {
  const seq = 100_000 + Math.floor(Date.now() % 900_000);
  return `MRN-${seq}`;
}

export function NewBillingAccountModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (account: BillingAccount) => void;
}) {
  const [patientName, setPatientName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [mrn] = useState(nextMrn);
  const [department, setDepartment] = useState(BILLING_ACCOUNT_DEPARTMENTS[0]!);
  const [openingBalance, setOpeningBalance] = useState('');

  const canSubmit = patientName.trim() !== '' && phone.trim() !== '';

  function handleSubmit() {
    if (!canSubmit) return;
    const totalBilled = Math.max(0, Number(openingBalance) || 0);
    onCreate({
      id: `bacc-new-${Date.now()}`,
      patientName: patientName.trim(),
      phone: phone.trim(),
      email: email.trim() || `${patientName.trim().toLowerCase().replace(/\s+/g, '.')}@email.com`,
      mrn,
      department,
      totalBilled,
      totalPaid: 0,
      daysOutstanding: totalBilled > 0 ? 0 : 0,
      active: true,
      invoiceCount: totalBilled > 0 ? 1 : 0,
      paymentCount: 0,
      adjustmentCount: 0,
      refundCount: 0,
      documentCount: 0,
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
            New Account
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
              Patient Name
            </label>
            <input
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder="e.g. Ada Okafor"
              className={INPUT_CLASS}
              style={INPUT_STYLE}
            />
          </div>
          <div>
            <label
              className="mb-1.5 block font-sans font-medium"
              style={{ fontSize: 14, color: '#0D2630' }}
            >
              Phone Number
            </label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 0703 456 7890"
              className={INPUT_CLASS}
              style={INPUT_STYLE}
            />
          </div>
          <div>
            <label
              className="mb-1.5 block font-sans font-medium"
              style={{ fontSize: 14, color: '#0D2630' }}
            >
              Email (optional)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. ada.okafor@email.com"
              className={INPUT_CLASS}
              style={INPUT_STYLE}
            />
          </div>
          <div>
            <label
              className="mb-1.5 block font-sans font-medium"
              style={{ fontSize: 14, color: '#0D2630' }}
            >
              Medical Record Number
            </label>
            <input
              value={mrn}
              disabled
              className={INPUT_CLASS}
              style={{ ...INPUT_STYLE, color: '#8A98A3' }}
            />
          </div>
          <div>
            <label
              className="mb-1.5 block font-sans font-medium"
              style={{ fontSize: 14, color: '#0D2630' }}
            >
              Department
            </label>
            <FormSelect
              id="new-billing-account-department"
              value={department}
              onChange={setDepartment}
              options={BILLING_ACCOUNT_DEPARTMENTS.map((d) => ({ value: d, label: d }))}
              placeholder="Select department"
            />
          </div>
          <div>
            <label
              className="mb-1.5 block font-sans font-medium"
              style={{ fontSize: 14, color: '#0D2630' }}
            >
              Opening Balance (₦, optional)
            </label>
            <input
              type="number"
              min={0}
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              placeholder="0"
              className={INPUT_CLASS}
              style={INPUT_STYLE}
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
            Create Account
          </button>
        </div>
      </div>
    </div>
  );
}
