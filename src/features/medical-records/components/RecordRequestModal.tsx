'use client';

import { CheckCircle2, Clock, User, X, XCircle } from 'lucide-react';

import { formatHumanDate, formatTime } from '@/utils/datetime';
import type {
  RecordRequest,
  RequestStatus,
} from '@/features/medical-records/__mocks__/recordRequestFixtures';

function formatHumanDateTime(date: string): string {
  return `${formatHumanDate(date)}, ${formatTime(date)}`;
}

const PRIORITY_CFG: Record<RecordRequest['priority'], { color: string; bg: string }> = {
  Routine: { color: '#4A7080', bg: 'rgba(74,112,128,0.08)' },
  Urgent: { color: '#EF4444', bg: 'rgba(239,68,68,0.08)' },
};

const STATUS_CFG: Record<RequestStatus, { color: string; border: string; bg: string }> = {
  Pending: { color: '#F59E0B', border: 'rgba(245,158,11,0.40)', bg: 'rgba(245,158,11,0.06)' },
  'In Progress': { color: '#00B4D8', border: 'rgba(0,180,216,0.40)', bg: 'transparent' },
  Fulfilled: { color: '#22C55E', border: 'rgba(34,197,94,0.40)', bg: 'transparent' },
  Rejected: { color: '#EF4444', border: 'rgba(239,68,68,0.40)', bg: 'rgba(239,68,68,0.06)' },
};

export function RecordRequestModal({
  request,
  onClose,
  onAdvance,
  onReject,
}: {
  request: RecordRequest;
  onClose: () => void;
  onAdvance: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const statusCfg = STATUS_CFG[request.status];
  const priorityCfg = PRIORITY_CFG[request.priority];

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
        style={{ maxWidth: 560, maxHeight: 'calc(100vh - 64px)', borderRadius: 16 }}
      >
        <div
          className="flex shrink-0 items-start justify-between gap-3 px-6 py-5"
          style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
        >
          <div>
            <p style={{ fontSize: 14, color: '#8A98A3' }}>{request.requestNumber}</p>
            <h2
              className="font-display font-semibold"
              style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
            >
              {request.patientName}
            </h2>
            <p style={{ fontSize: 14, color: '#00B4D8' }}>{request.mrn}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-11 shrink-0 items-center justify-center rounded-full transition-colors duration-150 hover:bg-[rgba(0,0,0,0.06)] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
          >
            <X style={{ width: 20, height: 20, color: '#4A7080' }} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto scroll-smooth px-6 py-5">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="rounded-full px-2.5 py-0.5 font-sans font-medium"
              style={{
                fontSize: 14,
                color: statusCfg.color,
                border: `1px solid ${statusCfg.border}`,
                background: statusCfg.bg,
              }}
            >
              {request.status}
            </span>
            <span
              className="rounded-full px-2.5 py-0.5 font-sans font-medium"
              style={{ fontSize: 14, color: priorityCfg.color, background: priorityCfg.bg }}
            >
              {request.priority}
            </span>
            <span
              className="rounded-full px-2.5 py-0.5 font-sans font-medium"
              style={{ fontSize: 14, color: '#4A7080', border: '1px solid rgba(0,100,130,0.2)' }}
            >
              {request.requesterType}
            </span>
          </div>

          <div className="mt-4 flex flex-col gap-3">
            <div className="flex items-start gap-2.5">
              <User style={{ width: 16, height: 16, color: '#8A98A3', marginTop: 2 }} />
              <div>
                <p style={{ fontSize: 14, color: '#8A98A3' }}>Requested by</p>
                <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                  {request.requestedBy} &middot; {request.department}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Clock style={{ width: 16, height: 16, color: '#8A98A3', marginTop: 2 }} />
              <div>
                <p style={{ fontSize: 14, color: '#8A98A3' }}>Requested / needed by</p>
                <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                  {formatHumanDateTime(request.dateRequested)} &rarr; needed by{' '}
                  {formatHumanDateTime(request.dateNeeded)}
                </p>
              </div>
            </div>
            {request.dateFulfilled && (
              <div className="flex items-start gap-2.5">
                <CheckCircle2 style={{ width: 16, height: 16, color: '#22C55E', marginTop: 2 }} />
                <div>
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>Fulfilled</p>
                  <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                    {formatHumanDateTime(request.dateFulfilled)}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4">
            <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
              Purpose
            </p>
            <p className="mt-1" style={{ fontSize: 14, color: '#4A7080' }}>
              {request.purpose}
            </p>
          </div>

          {request.notes && (
            <div
              className="mt-4 flex items-start gap-2.5 rounded-[10px] px-4 py-3"
              style={{
                background: 'rgba(239,68,68,0.06)',
                border: '1px solid rgba(239,68,68,0.18)',
              }}
            >
              <XCircle
                style={{ width: 16, height: 16, color: '#EF4444', marginTop: 2, flexShrink: 0 }}
              />
              <p style={{ fontSize: 14, color: '#0D2630' }}>{request.notes}</p>
            </div>
          )}
        </div>

        <div
          className="flex shrink-0 flex-wrap items-center justify-end gap-2.5 px-6 py-4"
          style={{ borderTop: '1px solid rgba(0,100,130,0.12)' }}
        >
          {(request.status === 'Pending' || request.status === 'In Progress') && (
            <button
              type="button"
              onClick={() => onReject(request.id)}
              className="flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[rgba(239,68,68,0.06)] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
              style={{ fontSize: 14, color: '#EF4444', border: '1px solid rgba(239,68,68,0.35)' }}
            >
              Reject
            </button>
          )}
          {request.status === 'Pending' && (
            <button
              type="button"
              onClick={() => onAdvance(request.id)}
              className="flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
              style={{ fontSize: 14, background: '#00B4D8' }}
            >
              Approve &amp; Start
            </button>
          )}
          {request.status === 'In Progress' && (
            <button
              type="button"
              onClick={() => onAdvance(request.id)}
              className="flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
              style={{ fontSize: 14, background: '#22C55E' }}
            >
              Mark Fulfilled
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
