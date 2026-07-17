'use client';

import { CheckCircle2, Clock, X } from 'lucide-react';

import type { DoctorShift } from '@/features/workforce/__mocks__/workforceFixtures';
import { SHIFT_TYPE_CFG, STATUS_CFG } from './config';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p
        className="font-sans font-bold tracking-wider uppercase"
        style={{ fontSize: 14, lineHeight: '20px', color: '#8A98A3' }}
      >
        {label}
      </p>
      <p
        className="mt-0.5 font-sans"
        style={{ fontSize: 14, lineHeight: '22px', color: '#0D2630' }}
      >
        {value}
      </p>
    </div>
  );
}

export function ShiftDetailModal({
  shift,
  onClose,
  onEdit,
}: {
  shift: DoctorShift;
  onClose: () => void;
  onEdit: () => void;
}) {
  const typeCfg = SHIFT_TYPE_CFG[shift.shiftType];
  const statusCfg = STATUS_CFG[shift.status];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(13,38,48,0.45)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex w-full flex-col gap-5 overflow-y-auto scroll-smooth bg-white"
        style={{ maxWidth: 480, maxHeight: 'calc(100vh - 64px)', borderRadius: 16, padding: 24 }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="flex size-12 shrink-0 items-center justify-center rounded-full font-sans font-semibold text-white"
              style={{ background: shift.avatarBg, fontSize: 16 }}
            >
              {shift.initials}
            </div>
            <div>
              <p
                className="font-display font-semibold"
                style={{ fontSize: 18, lineHeight: '26px', color: '#0D2630' }}
              >
                {shift.doctorName}
              </p>
              <p style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>{shift.role}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={`shrink-0 rounded-full p-1 transition-colors duration-150 hover:bg-[rgba(0,0,0,0.06)] ${FOCUS_RING}`}
          >
            <X style={{ width: 20, height: 20, color: '#4A7080' }} />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className="rounded-full px-3 py-0.5 font-sans font-medium"
            style={{
              fontSize: 14,
              lineHeight: '22px',
              color: typeCfg.color,
              border: `1px solid ${typeCfg.border}`,
              background: typeCfg.bg,
            }}
          >
            {typeCfg.label}
          </span>
          <span
            className="rounded-full px-3 py-0.5 font-sans font-medium"
            style={{
              fontSize: 14,
              lineHeight: '22px',
              color: statusCfg.color,
              border: `1px solid ${statusCfg.border}`,
              background: statusCfg.bg,
            }}
          >
            {statusCfg.label}
          </span>
          {shift.acknowledged ? (
            <span className="flex items-center gap-1.5" style={{ fontSize: 14, color: '#22C55E' }}>
              <CheckCircle2 style={{ width: 16, height: 16 }} />
              Acknowledged
            </span>
          ) : (
            <span className="flex items-center gap-1.5" style={{ fontSize: 14, color: '#F59E0B' }}>
              <Clock style={{ width: 16, height: 16 }} />
              Pending acknowledgement
            </span>
          )}
        </div>

        <div
          className="grid grid-cols-1 gap-x-6 gap-y-4 rounded-[12px] p-4 sm:grid-cols-2"
          style={{ background: '#F5FBFD', border: '1px solid #0064821F' }}
        >
          <DetailField label="Time Range" value={shift.timeRange} />
          <DetailField label="Ward/Clinic" value={shift.ward} />
          <DetailField label="Department" value={shift.department} />
          <DetailField label="Role" value={shift.role} />
        </div>

        <div
          className="flex flex-wrap justify-end gap-3"
          style={{ borderTop: '1px solid #0064821F', paddingTop: 16 }}
        >
          <button
            type="button"
            onClick={onClose}
            className={`font-sans font-semibold transition-colors duration-150 hover:bg-[rgba(0,0,0,0.04)] ${FOCUS_RING}`}
            style={{
              height: 44,
              borderRadius: 12,
              padding: '0 20px',
              background: '#FFFFFF',
              border: '1px solid #0064821F',
              fontSize: 14,
              color: '#0D2630',
            }}
          >
            Close
          </button>
          <button
            type="button"
            onClick={onEdit}
            className={`font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
            style={{
              height: 44,
              borderRadius: 12,
              padding: '0 20px',
              background: '#00B4D8',
              fontSize: 14,
            }}
          >
            Edit Shift
          </button>
        </div>
      </div>
    </div>
  );
}
