'use client';

import { Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';

import { FormSelect } from '@components/shared/FormSelect';
import { FormTextarea } from '@components/shared/FormTextarea';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/utils/currency';
import { DEPARTMENT_OPTIONS } from '@/features/laboratory/__mocks__/equipmentFixtures';
import {
  CATEGORY_OPTIONS,
  PRIORITY_OPTIONS,
  type ProcurementCategory,
  type ProcurementPriority,
  type ProcurementRequest,
} from '@/features/laboratory/__mocks__/procurementFixtures';
import {
  createProcurementRequest,
  type NewProcurementRequestInput,
} from '@/features/laboratory/store/procurementStore';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';
const FIELD_LABEL = { fontSize: 14, color: '#0D2630' } as const;
const FIELD_INPUT_STYLE = {
  fontSize: 14,
  border: '1px solid rgba(0,100,130,0.18)',
  color: '#0D2630',
} as const;

type DraftLine = {
  key: string;
  name: string;
  category: ProcurementCategory;
  quantity: string;
  estimatedUnitCost: string;
};

function newDraftLine(): DraftLine {
  return {
    key: `d-${Date.now()}-${Math.random()}`,
    name: '',
    category: 'Reagents',
    quantity: '1',
    estimatedUnitCost: '',
  };
}

/** Raises a new procurement request — lazy-loaded (checklist §14). */
export function NewProcurementRequestModal({
  onSubmit,
  onClose,
}: {
  onSubmit: (request: ProcurementRequest) => void;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const [department, setDepartment] = useState('');
  const [priority, setPriority] = useState<ProcurementPriority>('Medium');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([newDraftLine()]);
  const [submitted, setSubmitted] = useState(false);

  function updateLine(key: string, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }
  function addLine() {
    setLines((prev) => [...prev, newDraftLine()]);
  }
  function removeLine(key: string) {
    setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.key !== key) : prev));
  }

  const validLines = lines.filter(
    (l) => l.name.trim() !== '' && l.quantity !== '' && l.estimatedUnitCost !== '',
  );
  const isValid = department !== '' && validLines.length > 0;
  const estimatedTotal = validLines.reduce(
    (sum, l) => sum + Number(l.quantity) * Number(l.estimatedUnitCost),
    0,
  );

  function handleSubmit() {
    setSubmitted(true);
    if (!isValid) return;
    const input: NewProcurementRequestInput = {
      department,
      requestedBy: user?.name ?? 'Lab Scientist',
      priority,
      lineItems: validLines.map((l) => ({
        name: l.name.trim(),
        category: l.category,
        quantity: Number(l.quantity),
        estimatedUnitCost: Number(l.estimatedUnitCost),
      })),
      estimatedAmount: estimatedTotal,
      notes: notes.trim(),
    };
    onSubmit(createProcurementRequest(input));
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
              New Procurement Request
            </h2>
            <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
              Add every item you need, then submit for approval.
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
              <label className="font-sans font-medium" style={FIELD_LABEL}>
                Department
              </label>
              <div className="mt-1.5">
                <FormSelect
                  id="pr-department"
                  value={department || undefined}
                  onChange={setDepartment}
                  options={DEPARTMENT_OPTIONS.map((d) => ({ value: d, label: d }))}
                  placeholder="Select department"
                  hasError={submitted && department === ''}
                />
              </div>
            </div>
            <div>
              <label className="font-sans font-medium" style={FIELD_LABEL}>
                Priority
              </label>
              <div className="mt-1.5">
                <FormSelect
                  id="pr-priority"
                  value={priority}
                  onChange={(v) => setPriority(v as ProcurementPriority)}
                  options={PRIORITY_OPTIONS.map((p) => ({ value: p, label: p }))}
                  placeholder="Select priority"
                />
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between">
            <p className="font-sans font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
              Items
            </p>
            <button
              type="button"
              onClick={addLine}
              className={`flex h-9 items-center gap-1.5 rounded-[8px] px-3 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
              style={{ fontSize: 14, color: '#00B4D8', border: '1px solid rgba(0,180,216,0.35)' }}
            >
              <Plus style={{ width: 14, height: 14 }} />
              Add Item
            </button>
          </div>

          <div className="mt-3 flex flex-col gap-3">
            {lines.map((line, i) => (
              <div
                key={line.key}
                className="grid grid-cols-1 items-end gap-2.5 rounded-[10px] p-3 sm:grid-cols-[2fr_1.3fr_0.8fr_1fr_auto]"
                style={{ background: '#F5FBFD', border: '1px solid rgba(0,100,130,0.1)' }}
              >
                <div>
                  {i === 0 && (
                    <label
                      className="font-sans font-medium"
                      style={{ ...FIELD_LABEL, fontSize: 14 }}
                    >
                      Item Name
                    </label>
                  )}
                  <input
                    type="text"
                    value={line.name}
                    onChange={(e) => updateLine(line.key, { name: e.target.value })}
                    placeholder="e.g. Glucose Reagent"
                    className={`mt-1.5 h-10 w-full rounded-[8px] bg-white px-3 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                    style={{
                      fontSize: 14,
                      border: `1px solid ${submitted && !line.name.trim() ? '#EF4444' : 'rgba(0,100,130,0.18)'}`,
                      color: '#0D2630',
                    }}
                  />
                </div>
                <div>
                  {i === 0 && (
                    <label
                      className="font-sans font-medium"
                      style={{ ...FIELD_LABEL, fontSize: 14 }}
                    >
                      Category
                    </label>
                  )}
                  <div className="mt-1.5">
                    <FormSelect
                      id={`pr-cat-${line.key}`}
                      value={line.category}
                      onChange={(v) => updateLine(line.key, { category: v as ProcurementCategory })}
                      options={CATEGORY_OPTIONS.map((c) => ({ value: c, label: c }))}
                      placeholder="Category"
                    />
                  </div>
                </div>
                <div>
                  {i === 0 && (
                    <label
                      className="font-sans font-medium"
                      style={{ ...FIELD_LABEL, fontSize: 14 }}
                    >
                      Qty
                    </label>
                  )}
                  <input
                    type="number"
                    min={1}
                    value={line.quantity}
                    onChange={(e) => updateLine(line.key, { quantity: e.target.value })}
                    className="mt-1.5 h-10 w-full rounded-[8px] bg-white px-3 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40"
                    style={{
                      fontSize: 14,
                      border: '1px solid rgba(0,100,130,0.18)',
                      color: '#0D2630',
                    }}
                  />
                </div>
                <div>
                  {i === 0 && (
                    <label
                      className="font-sans font-medium"
                      style={{ ...FIELD_LABEL, fontSize: 14 }}
                    >
                      Est. Unit Cost (₦)
                    </label>
                  )}
                  <input
                    type="number"
                    min={0}
                    value={line.estimatedUnitCost}
                    onChange={(e) => updateLine(line.key, { estimatedUnitCost: e.target.value })}
                    placeholder="0.00"
                    className="mt-1.5 h-10 w-full rounded-[8px] bg-white px-3 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40"
                    style={{
                      fontSize: 14,
                      border: `1px solid ${submitted && !line.estimatedUnitCost ? '#EF4444' : 'rgba(0,100,130,0.18)'}`,
                      color: '#0D2630',
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeLine(line.key)}
                  disabled={lines.length === 1}
                  aria-label="Remove item"
                  className={`flex size-10 shrink-0 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[rgba(239,68,68,0.08)] disabled:cursor-not-allowed disabled:opacity-30 ${FOCUS_RING}`}
                >
                  <Trash2 style={{ width: 15, height: 15, color: '#DC2626' }} />
                </button>
              </div>
            ))}
          </div>

          <div
            className="mt-4 flex items-center justify-between rounded-[10px] px-4 py-3"
            style={{ background: 'rgba(0,180,216,0.06)' }}
          >
            <span className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
              Estimated Total
            </span>
            <span className="font-display font-bold" style={{ fontSize: 18, color: '#00B4D8' }}>
              {formatCurrency(estimatedTotal)}
            </span>
          </div>

          <div className="mt-4">
            <label className="font-sans font-medium" style={FIELD_LABEL}>
              Notes
            </label>
            <FormTextarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional context for the approvers..."
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
            style={FIELD_INPUT_STYLE}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className={`flex h-11 items-center rounded-[10px] px-5 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
            style={{ fontSize: 14, background: '#00B4D8' }}
          >
            Submit Request
          </button>
        </div>
      </div>
    </div>
  );
}
