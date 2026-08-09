'use client';

import { X } from 'lucide-react';
import { useState } from 'react';

import { FormDateInput } from '@components/shared/FormDateInput';
import { FormSelect } from '@components/shared/FormSelect';
import { FormTextarea } from '@components/shared/FormTextarea';
import { useAuth } from '@/hooks/useAuth';
import { toWATDateInput } from '@/utils/datetime';
import type {
  EquipmentRecord,
  ServiceEvent,
  ServiceEventStatus,
  ServiceEventType,
} from '@/features/laboratory/__mocks__/equipmentFixtures';
import { logServiceEvent } from '@/features/laboratory/store/equipmentStore';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';
const FIELD_LABEL = { fontSize: 14, color: '#0D2630' } as const;
const FIELD_INPUT_CLASS = `h-11 w-full rounded-[10px] px-3.5 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`;
const FIELD_INPUT_STYLE = {
  fontSize: 14,
  border: '1px solid rgba(0,100,130,0.18)',
  color: '#0D2630',
} as const;

const TYPE_OPTIONS: { value: ServiceEventType; label: string }[] = [
  { value: 'Preventive Maintenance', label: 'Preventive Maintenance' },
  { value: 'Corrective Maintenance', label: 'Corrective Maintenance' },
  { value: 'Calibration', label: 'Calibration' },
  { value: 'Repair', label: 'Repair' },
  { value: 'Inspection', label: 'Inspection' },
];

/** Logs a service/maintenance event for one equipment record — lazy-loaded
 * (checklist §14). Scheduled entries show up on the Maintenance tab,
 * Completed entries on Service History; a completed Calibration also
 * updates the equipment's own next-due date. */
export function LogServiceModal({
  equipment,
  onSubmit,
  onClose,
}: {
  equipment: EquipmentRecord;
  onSubmit: (event: ServiceEvent) => void;
  onClose: () => void;
}) {
  const { user } = useAuth();

  const [type, setType] = useState<ServiceEventType>('Preventive Maintenance');
  const [status, setStatus] = useState<ServiceEventStatus>('Completed');
  const [date, setDate] = useState(toWATDateInput());
  const [performedBy, setPerformedBy] = useState(user?.name ?? '');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const isValid = performedBy.trim() !== '' && notes.trim() !== '' && date !== '';

  function handleSubmit() {
    setSubmitted(true);
    if (!isValid) return;
    const event = logServiceEvent({
      equipmentId: equipment.id,
      type,
      status,
      date: new Date(date).toISOString(),
      performedBy: performedBy.trim(),
      notes: notes.trim(),
    });
    onSubmit(event);
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
        style={{ maxWidth: 560, maxHeight: 'calc(100vh - 48px)', borderRadius: 16 }}
      >
        <div
          className="flex shrink-0 items-start justify-between gap-3 px-6 py-5"
          style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
        >
          <div className="min-w-0">
            <h2
              className="font-display font-semibold"
              style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
            >
              Add Service / Maintenance
            </h2>
            <p className="mt-0.5 truncate" style={{ fontSize: 14, color: '#4A7080' }}>
              {equipment.name} · {equipment.id}
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
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setStatus('Completed')}
                className={`flex h-11 items-center justify-center rounded-[10px] font-sans font-medium transition-colors duration-150 ${FOCUS_RING}`}
                style={{
                  fontSize: 14,
                  color: status === 'Completed' ? '#00B4D8' : '#4A7080',
                  border: `1px solid ${status === 'Completed' ? '#00B4D8' : 'rgba(0,100,130,0.2)'}`,
                  background: status === 'Completed' ? 'rgba(0,180,216,0.06)' : 'transparent',
                }}
              >
                Completed
              </button>
              <button
                type="button"
                onClick={() => setStatus('Scheduled')}
                className={`flex h-11 items-center justify-center rounded-[10px] font-sans font-medium transition-colors duration-150 ${FOCUS_RING}`}
                style={{
                  fontSize: 14,
                  color: status === 'Scheduled' ? '#00B4D8' : '#4A7080',
                  border: `1px solid ${status === 'Scheduled' ? '#00B4D8' : 'rgba(0,100,130,0.2)'}`,
                  background: status === 'Scheduled' ? 'rgba(0,180,216,0.06)' : 'transparent',
                }}
              >
                Scheduled
              </button>
            </div>

            <div>
              <label htmlFor="svc-type" className="font-sans font-medium" style={FIELD_LABEL}>
                Type
              </label>
              <div className="mt-1.5">
                <FormSelect
                  id="svc-type"
                  value={type}
                  onChange={(v) => setType(v as ServiceEventType)}
                  options={TYPE_OPTIONS}
                  placeholder="Select type"
                />
              </div>
            </div>

            <div>
              <label htmlFor="svc-date" className="font-sans font-medium" style={FIELD_LABEL}>
                {status === 'Completed' ? 'Date Performed' : 'Scheduled Date'}
              </label>
              <div className="mt-1.5">
                <FormDateInput
                  id="svc-date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="svc-performed-by"
                className="font-sans font-medium"
                style={FIELD_LABEL}
              >
                {status === 'Completed' ? 'Performed By' : 'Assigned To'}
              </label>
              <input
                id="svc-performed-by"
                type="text"
                value={performedBy}
                onChange={(e) => setPerformedBy(e.target.value)}
                placeholder="Name or field engineer / company"
                className={`mt-1.5 ${FIELD_INPUT_CLASS}`}
                style={{
                  ...FIELD_INPUT_STYLE,
                  border:
                    submitted && !performedBy.trim()
                      ? '1px solid #EF4444'
                      : FIELD_INPUT_STYLE.border,
                }}
              />
            </div>

            <div>
              <label htmlFor="svc-notes" className="font-sans font-medium" style={FIELD_LABEL}>
                Notes
              </label>
              <FormTextarea
                id="svc-notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What was done, or what's planned..."
                className="mt-1.5"
                hasError={submitted && !notes.trim()}
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
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
