'use client';

import { X } from 'lucide-react';
import { useMemo, useState } from 'react';

import { FormSelect } from '@components/shared/FormSelect';
import { BILLING_ACCOUNTS } from '@/features/billing/__mocks__/billingAccountsFixtures';
import {
  ADJUSTMENT_REASONS,
  ADJUSTMENT_TYPES,
  buildAllInvoices,
  type AdjustmentType,
  type AdjustmentWithAccount,
} from '@/features/billing/__mocks__/billingAccountDetailFixtures';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';
const INPUT_CLASS =
  'h-11 w-full rounded-[10px] px-3.5 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40';
const INPUT_STYLE = { fontSize: 14, border: '1px solid rgba(0,100,130,0.18)', color: '#0D2630' };

export function AddAdjustmentModal({
  defaultMrn,
  onClose,
  onCreate,
}: {
  defaultMrn?: string | undefined;
  onClose: () => void;
  onCreate: (adjustment: AdjustmentWithAccount) => void;
}) {
  const allInvoices = useMemo(() => buildAllInvoices(), []);

  const [mrn, setMrn] = useState(
    () => BILLING_ACCOUNTS.find((a) => a.mrn === defaultMrn)?.mrn ?? BILLING_ACCOUNTS[0]?.mrn ?? '',
  );
  const invoicesForPatient = allInvoices.filter((inv) => inv.mrn === mrn);
  const [invoiceNumber, setInvoiceNumber] = useState(
    () => invoicesForPatient[0]?.invoiceNumber ?? '',
  );
  const [type, setType] = useState<AdjustmentType>(ADJUSTMENT_TYPES[0] ?? 'Discount');
  const [reason, setReason] = useState(
    ADJUSTMENT_REASONS[ADJUSTMENT_TYPES[0] ?? 'Discount'][0] ?? '',
  );
  const [amount, setAmount] = useState('');

  const account = BILLING_ACCOUNTS.find((a) => a.mrn === mrn);
  const canSubmit = !!account && !!invoiceNumber && Number(amount) > 0;

  function handlePatientChange(nextMrn: string) {
    setMrn(nextMrn);
    const firstInvoice = allInvoices.find((inv) => inv.mrn === nextMrn);
    setInvoiceNumber(firstInvoice?.invoiceNumber ?? '');
  }

  function handleTypeChange(nextType: string) {
    const t = nextType as AdjustmentType;
    setType(t);
    setReason(ADJUSTMENT_REASONS[t][0] ?? '');
  }

  function handleSubmit() {
    if (!account || !canSubmit) return;
    const seq = 1000 + Math.floor(Math.random() * 8999);
    onCreate({
      id: `adj-new-${Date.now()}`,
      adjustmentNumber: `ADJ-2026-${String(seq).padStart(4, '0')}`,
      date: new Date().toISOString(),
      type,
      amount: Number(amount),
      reason,
      invoiceNumber,
      patientName: account.patientName,
      mrn: account.mrn,
      secondaryId: account.secondaryId,
      department: account.department,
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
            Add Adjustment
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
              id="add-adjustment-patient"
              value={mrn}
              onChange={handlePatientChange}
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
              Invoice
            </label>
            <FormSelect
              id="add-adjustment-invoice"
              value={invoiceNumber}
              onChange={setInvoiceNumber}
              options={invoicesForPatient.map((inv) => ({
                value: inv.invoiceNumber,
                label: inv.invoiceNumber,
              }))}
              placeholder="Select invoice"
            />
          </div>
          <div>
            <label
              className="mb-1.5 block font-sans font-medium"
              style={{ fontSize: 14, color: '#0D2630' }}
            >
              Type
            </label>
            <FormSelect
              id="add-adjustment-type"
              value={type}
              onChange={handleTypeChange}
              options={ADJUSTMENT_TYPES.map((t) => ({ value: t, label: t }))}
              placeholder="Select type"
            />
          </div>
          <div>
            <label
              className="mb-1.5 block font-sans font-medium"
              style={{ fontSize: 14, color: '#0D2630' }}
            >
              Reason
            </label>
            <FormSelect
              id="add-adjustment-reason"
              value={reason}
              onChange={setReason}
              options={ADJUSTMENT_REASONS[type].map((r) => ({ value: r, label: r }))}
              placeholder="Select reason"
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
            Add Adjustment
          </button>
        </div>
      </div>
    </div>
  );
}
