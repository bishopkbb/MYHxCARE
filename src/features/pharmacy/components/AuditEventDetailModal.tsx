'use client';

import { Lock, User, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Tooltip } from '@components/shared/Tooltip';
import { ROUTES } from '@/constants/routes';
import { formatHumanDate, formatTime } from '@/utils/datetime';
import {
  AUDIT_ACTION_COLOR,
  AUDIT_OUTCOME_COLOR,
  type AuditTrailEvent,
} from '@/features/pharmacy/__mocks__/pharmacyFixtures';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

function DetailRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <span className="shrink-0" style={{ fontSize: 14, color: '#4A7080' }}>
        {label}
      </span>
      <span
        className="text-right font-sans font-medium"
        style={{ fontSize: 14, color: color ?? '#0D2630' }}
      >
        {value}
      </span>
    </div>
  );
}

function Badge({
  label,
  color,
  border,
  bg,
}: {
  label: string;
  color: string;
  border: string;
  bg: string;
}) {
  return (
    <span
      className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium"
      style={{
        fontSize: 14,
        whiteSpace: 'nowrap',
        color,
        border: `1px solid ${border}`,
        background: bg,
      }}
    >
      {label}
    </span>
  );
}

/** Full detail of one audit event — lazy-loaded (checklist §14). Read-only:
 * audit records are immutable, so there are no status-change actions here,
 * only Close (and a real "View Profile" link when a patient is attached). */
export function AuditEventDetailModal({
  event,
  onClose,
}: {
  event: AuditTrailEvent;
  onClose: () => void;
}) {
  const router = useRouter();
  const actionCfg = AUDIT_ACTION_COLOR[event.action];
  const outcomeCfg = AUDIT_OUTCOME_COLOR[event.outcome];

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
          <div className="min-w-0">
            <h2
              className="font-display font-semibold"
              style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
            >
              {event.id}
            </h2>
            <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
              {formatHumanDate(event.timestamp)} · {formatTime(event.timestamp)}
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
          {event.patientName !== '—' && (
            <div className="flex items-center justify-between gap-3 rounded-[10px] bg-[#F5FBFD] px-3.5 py-2.5">
              <div className="min-w-0">
                <Tooltip content={event.patientName}>
                  <p
                    className="truncate font-sans font-medium"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    {event.patientName}
                  </p>
                </Tooltip>
                <p style={{ fontSize: 14, color: '#4A7080' }}>{event.mrn}</p>
              </div>
              {event.patientId && (
                <button
                  type="button"
                  onClick={() => router.push(ROUTES.patientProfile(event.patientId!))}
                  className={`flex h-9 shrink-0 items-center gap-1.5 rounded-[8px] px-2.5 font-sans font-medium transition-colors duration-150 hover:bg-white ${FOCUS_RING}`}
                  style={{ fontSize: 14, color: '#00B4D8' }}
                >
                  <User style={{ width: 14, height: 14 }} />
                  View Profile
                </button>
              )}
            </div>
          )}

          <div
            className={event.patientName !== '—' ? 'mt-3 pb-3' : 'pb-3'}
            style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
          >
            <div className="flex items-center justify-between gap-3 py-1.5">
              <span style={{ fontSize: 14, color: '#4A7080' }}>Action</span>
              <Badge
                label={event.action}
                color={actionCfg.color}
                border={actionCfg.border}
                bg={actionCfg.bg}
              />
            </div>
            <div className="flex items-center justify-between gap-3 py-1.5">
              <span style={{ fontSize: 14, color: '#4A7080' }}>Outcome</span>
              <Badge
                label={event.outcome}
                color={outcomeCfg.color}
                border={outcomeCfg.border}
                bg={outcomeCfg.bg}
              />
            </div>
            <DetailRow label="Medication" value={event.medicationName} />
            <DetailRow label="Module" value={event.module} />
            <DetailRow label="Performed By" value={`${event.userName} (${event.userRole})`} />
            <DetailRow label="IP Address" value={event.ipAddress} />
          </div>

          <p className="mt-3" style={{ fontSize: 14, color: '#4A7080' }}>
            <span className="font-sans font-medium" style={{ color: '#0D2630' }}>
              Details:{' '}
            </span>
            {event.details}
          </p>

          <div
            className="mt-4 flex items-start gap-2 rounded-[10px] p-3"
            style={{ background: 'rgba(0,100,130,0.05)' }}
          >
            <Lock className="mt-0.5 shrink-0" style={{ width: 14, height: 14, color: '#4A7080' }} />
            <p style={{ fontSize: 14, color: '#4A7080' }}>
              This record is immutable and cannot be edited or deleted.
            </p>
          </div>
        </div>

        <div
          className="flex shrink-0 items-center justify-end px-6 py-4"
          style={{ borderTop: '1px solid rgba(0,100,130,0.12)' }}
        >
          <button
            type="button"
            onClick={onClose}
            className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
            style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
