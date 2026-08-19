'use client';

import { X } from 'lucide-react';
import { useMemo, useState } from 'react';

import { FormDateInput } from '@components/shared/FormDateInput';
import { FormSelect } from '@components/shared/FormSelect';
import { formatCurrencyWhole } from '@/utils/currency';
import {
  buildAllInvoices,
  PAYMENT_METHODS,
  type PaymentWithAccount,
} from '@/features/billing/__mocks__/billingAccountDetailFixtures';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';
const INPUT_CLASS =
  'h-11 w-full rounded-[10px] px-3.5 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40';
const INPUT_STYLE = { fontSize: 14, border: '1px solid rgba(0,100,130,0.18)', color: '#0D2630' };

function toDateInputValue(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function RecordPaymentModal({
  defaultMrn,
  onClose,
  onRecord,
}: {
  defaultMrn?: string | undefined;
  onClose: () => void;
  onRecord: (payment: PaymentWithAccount) => void;
}) {
  const openInvoices = useMemo(
    () => buildAllInvoices().filter((inv) => inv.amount - inv.paid > 0),
    [],
  );
  const patientOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const inv of openInvoices) seen.set(inv.mrn, `${inv.patientName} (${inv.mrn})`);
    return Array.from(seen.entries()).map(([mrn, label]) => ({ value: mrn, label }));
  }, [openInvoices]);

  const [mrn, setMrn] = useState(
    () =>
      patientOptions.find((p) => p.value === defaultMrn)?.value ?? patientOptions[0]?.value ?? '',
  );
  const invoicesForPatient = openInvoices.filter((inv) => inv.mrn === mrn);
  const [invoiceNumber, setInvoiceNumber] = useState(
    () => invoicesForPatient[0]?.invoiceNumber ?? '',
  );
  const selectedInvoice = openInvoices.find((inv) => inv.invoiceNumber === invoiceNumber);
  const balance = selectedInvoice ? selectedInvoice.amount - selectedInvoice.paid : 0;

  const [amount, setAmount] = useState(() => String(balance || ''));
  const [method, setMethod] = useState(PAYMENT_METHODS[0] ?? 'POS');
  const [reference, setReference] = useState('');
  const [date, setDate] = useState(() => toDateInputValue(new Date()));

  function handlePatientChange(nextMrn: string) {
    setMrn(nextMrn);
    const firstInvoice = openInvoices.find((inv) => inv.mrn === nextMrn);
    setInvoiceNumber(firstInvoice?.invoiceNumber ?? '');
    setAmount(firstInvoice ? String(firstInvoice.amount - firstInvoice.paid) : '');
  }

  function handleInvoiceChange(nextInvoiceNumber: string) {
    setInvoiceNumber(nextInvoiceNumber);
    const inv = openInvoices.find((i) => i.invoiceNumber === nextInvoiceNumber);
    setAmount(inv ? String(inv.amount - inv.paid) : '');
  }

  const numericAmount = Number(amount);
  const canSubmit = !!selectedInvoice && numericAmount > 0 && numericAmount <= balance;

  function handleSubmit() {
    if (!selectedInvoice || !canSubmit) return;
    const newInvoicePaid = selectedInvoice.paid + numericAmount;
    const newBalance = Math.max(0, selectedInvoice.amount - newInvoicePaid);
    const seq = 700 + Math.floor(Math.random() * 300);
    onRecord({
      id: `pay-new-${Date.now()}`,
      paymentNumber: `PAY-2026-${String(seq).padStart(5, '0')}`,
      date: new Date(date).toISOString(),
      amount: numericAmount,
      method,
      reference: reference.trim() || `PMT-${String(100000 + Math.floor(Math.random() * 899999))}`,
      invoiceNumber: selectedInvoice.invoiceNumber,
      postedBy: 'Accountant (Finance)',
      reconciled: true,
      patientName: selectedInvoice.patientName,
      mrn: selectedInvoice.mrn,
      secondaryId: selectedInvoice.secondaryId,
      department: selectedInvoice.department,
      invoiceAmount: selectedInvoice.amount,
      invoicePaid: newInvoicePaid,
      invoiceBalance: newBalance,
      invoiceStatus: newBalance > 0 ? 'Partially Paid' : 'Paid',
      status: newBalance > 0 ? 'Partial' : 'Posted',
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
            Record Payment
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

        {patientOptions.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <p style={{ fontSize: 14, color: '#4A7080' }}>
              No outstanding invoices are available to post a payment against.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3.5 px-6 py-5">
            <div>
              <label
                className="mb-1.5 block font-sans font-medium"
                style={{ fontSize: 14, color: '#0D2630' }}
              >
                Patient
              </label>
              <FormSelect
                id="record-payment-patient"
                value={mrn}
                onChange={handlePatientChange}
                options={patientOptions}
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
                id="record-payment-invoice"
                value={invoiceNumber}
                onChange={handleInvoiceChange}
                options={invoicesForPatient.map((inv) => ({
                  value: inv.invoiceNumber,
                  label: `${inv.invoiceNumber} — Balance ${formatCurrencyWhole(inv.amount - inv.paid)}`,
                }))}
                placeholder="Select invoice"
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
                max={balance}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={INPUT_CLASS}
                style={INPUT_STYLE}
              />
              {numericAmount > balance && (
                <p className="mt-1" style={{ fontSize: 14, color: '#DC2626' }}>
                  Cannot exceed the invoice balance of {formatCurrencyWhole(balance)}.
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  className="mb-1.5 block font-sans font-medium"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  Payment Method
                </label>
                <FormSelect
                  id="record-payment-method"
                  value={method}
                  onChange={setMethod}
                  options={PAYMENT_METHODS.map((m) => ({ value: m, label: m }))}
                  placeholder="Select method"
                />
              </div>
              <div>
                <label
                  className="mb-1.5 block font-sans font-medium"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  Payment Date
                </label>
                <FormDateInput
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  aria-label="Payment date"
                />
              </div>
            </div>
            <div>
              <label
                className="mb-1.5 block font-sans font-medium"
                style={{ fontSize: 14, color: '#0D2630' }}
              >
                Transaction Reference (optional)
              </label>
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Auto-generated if left blank"
                className={INPUT_CLASS}
                style={INPUT_STYLE}
              />
            </div>
          </div>
        )}

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
            Record Payment
          </button>
        </div>
      </div>
    </div>
  );
}
