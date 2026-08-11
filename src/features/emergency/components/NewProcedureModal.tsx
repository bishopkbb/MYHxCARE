'use client';

import { X } from 'lucide-react';
import { useState } from 'react';

import {
  COMMON_PROCEDURES,
  type ProcedureType,
} from '@/features/emergency/__mocks__/emergencyFixtures';
import type { ProcedureStatus } from '@/features/emergency/store/procedureStore';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';
const INPUT_CLASS =
  'h-11 w-full rounded-[10px] px-3.5 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40';
const INPUT_STYLE = { fontSize: 14, border: '1px solid rgba(0,100,130,0.18)', color: '#0D2630' };

const PROCEDURE_TYPES: ProcedureType[] = [
  'Airway',
  'Cardiac',
  'Thoracic',
  'Vascular Access',
  'Minor Procedure',
  'Neurological',
  'Orthopedic',
  'Genitourinary',
];
const STATUS_OPTIONS: ProcedureStatus[] = ['Planned', 'In Progress', 'Completed'];

export function NewProcedureModal({
  defaultName,
  defaultType,
  defaultLocation,
  defaultPerformedBy,
  onClose,
  onConfirm,
}: {
  defaultName?: string | undefined;
  defaultType?: ProcedureType | undefined;
  defaultLocation: string;
  defaultPerformedBy: string;
  onClose: () => void;
  onConfirm: (input: {
    name: string;
    type: ProcedureType;
    status: ProcedureStatus;
    performedBy: string;
    location: string;
  }) => void;
}) {
  const [name, setName] = useState(defaultName ?? '');
  const [type, setType] = useState<ProcedureType>(defaultType ?? 'Minor Procedure');
  const [status, setStatus] = useState<ProcedureStatus>('In Progress');
  const [performedBy, setPerformedBy] = useState(defaultPerformedBy);
  const [location, setLocation] = useState(defaultLocation);

  function handleNameChange(value: string) {
    setName(value);
    const match = COMMON_PROCEDURES.find(
      (p) => p.name.toLowerCase() === value.trim().toLowerCase(),
    );
    if (match) setType(match.type);
  }

  const canSubmit = name.trim() !== '' && performedBy.trim() !== '' && location.trim() !== '';

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
        style={{ maxWidth: 480, borderRadius: 16, maxHeight: '90vh' }}
      >
        <div
          className="flex shrink-0 items-start justify-between gap-3 px-6 py-5"
          style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
        >
          <h2 className="font-display font-semibold" style={{ fontSize: 20, color: '#0D2630' }}>
            New Procedure
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

        <div className="flex flex-col gap-3.5 overflow-y-auto scroll-smooth px-6 py-5">
          <div>
            <label
              className="mb-1.5 block font-sans font-medium"
              style={{ fontSize: 14, color: '#0D2630' }}
            >
              Procedure Name
            </label>
            <input
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Endotracheal Intubation"
              list="procedure-catalog"
              autoFocus
              className={INPUT_CLASS}
              style={INPUT_STYLE}
            />
            <datalist id="procedure-catalog">
              {COMMON_PROCEDURES.map((p) => (
                <option key={p.name} value={p.name} />
              ))}
            </datalist>
          </div>

          <div>
            <label
              className="mb-1.5 block font-sans font-medium"
              style={{ fontSize: 14, color: '#0D2630' }}
            >
              Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ProcedureType)}
              className={INPUT_CLASS}
              style={INPUT_STYLE}
            >
              {PROCEDURE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label
                className="mb-1.5 block font-sans font-medium"
                style={{ fontSize: 14, color: '#0D2630' }}
              >
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ProcedureStatus)}
                className={INPUT_CLASS}
                style={INPUT_STYLE}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                className="mb-1.5 block font-sans font-medium"
                style={{ fontSize: 14, color: '#0D2630' }}
              >
                Location
              </label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className={INPUT_CLASS}
                style={INPUT_STYLE}
              />
            </div>
          </div>

          <div>
            <label
              className="mb-1.5 block font-sans font-medium"
              style={{ fontSize: 14, color: '#0D2630' }}
            >
              Performed By
            </label>
            <input
              value={performedBy}
              onChange={(e) => setPerformedBy(e.target.value)}
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
            onClick={() =>
              canSubmit &&
              onConfirm({
                name: name.trim(),
                type,
                status,
                performedBy: performedBy.trim(),
                location: location.trim(),
              })
            }
            disabled={!canSubmit}
            className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 ${canSubmit ? 'hover:opacity-90' : 'cursor-not-allowed opacity-50'} ${FOCUS_RING}`}
            style={{ fontSize: 14, background: '#0D2630' }}
          >
            Log Procedure
          </button>
        </div>
      </div>
    </div>
  );
}
