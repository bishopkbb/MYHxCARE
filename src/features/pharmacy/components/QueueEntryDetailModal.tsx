'use client';

import { ArrowRight, CheckCircle2, Pause, Play, User, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Tooltip } from '@components/shared/Tooltip';
import { ROUTES } from '@/constants/routes';
import { formatTime } from '@/utils/datetime';
import { getPatientDetail } from '@/features/patients/__mocks__/patientFixtures';
import type { PharmacyQueueEntry } from '@/features/pharmacy/__mocks__/pharmacyFixtures';

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

function minutesSince(iso: string): number {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
}

/** Full detail of one queue entry — lazy-loaded (checklist §14). Actions
 * change with stage: Move to Next Queue / Mark as Ready for Pickup while
 * still in the pipeline, Mark as Collected once Ready for Pickup — Hold /
 * Release Hold is always available since it's a cross-cutting flag, not a
 * pipeline stage. */
export function QueueEntryDetailModal({
  entry,
  queueNumber,
  displayQueueType,
  assignedPharmacist,
  onAdvance,
  onMarkReady,
  onToggleHold,
  onMarkCollected,
  onClose,
}: {
  entry: PharmacyQueueEntry;
  queueNumber: string;
  displayQueueType: string;
  assignedPharmacist: string;
  onAdvance: (rxNo: string) => void;
  onMarkReady: (rxNo: string) => void;
  onToggleHold: (rxNo: string) => void;
  onMarkCollected: (rxNo: string) => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const patient = getPatientDetail(entry.patientId);

  const waitLabel =
    entry.stage === 'Ready for Pickup'
      ? entry.dispensedAt
        ? `${minutesSince(entry.dispensedAt)} mins since ready`
        : '—'
      : `${minutesSince(entry.receivedAt)} mins waiting`;

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
              {queueNumber}
            </h2>
            <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
              {entry.rxNo} · {displayQueueType}
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
          <div className="flex items-center justify-between gap-3 rounded-[10px] bg-[#F5FBFD] px-3.5 py-2.5">
            <div className="min-w-0">
              <Tooltip content={patient.name}>
                <p
                  className="truncate font-sans font-medium"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  {patient.name}
                </p>
              </Tooltip>
              <p style={{ fontSize: 14, color: '#4A7080' }}>{patient.mrn}</p>
            </div>
            <button
              type="button"
              onClick={() => router.push(ROUTES.patientProfile(entry.patientId))}
              className={`flex h-9 shrink-0 items-center gap-1.5 rounded-[8px] px-2.5 font-sans font-medium transition-colors duration-150 hover:bg-white ${FOCUS_RING}`}
              style={{ fontSize: 14, color: '#00B4D8' }}
            >
              <User style={{ width: 14, height: 14 }} />
              View Profile
            </button>
          </div>

          {entry.hasAllergyAlert && (
            <div
              className="mt-3 flex items-center gap-2 rounded-[10px] p-3"
              style={{
                background: 'rgba(220,38,38,0.06)',
                border: '1px solid rgba(220,38,38,0.2)',
              }}
            >
              <p style={{ fontSize: 14, color: '#DC2626' }}>
                This patient has a known allergy — verify before dispensing.
              </p>
            </div>
          )}

          <div className="mt-3 pb-3" style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}>
            <DetailRow label="Medication" value={`${entry.medicationName} ${entry.dose}`} />
            <DetailRow label="Frequency" value={entry.frequency} />
            <DetailRow label="Prescribed By" value={entry.doctorName} />
            <DetailRow label="Department" value={entry.department} />
            <DetailRow
              label="Priority"
              value={entry.priority}
              color={
                entry.priority === 'High'
                  ? '#DC2626'
                  : entry.priority === 'Medium'
                    ? '#D97706'
                    : '#16A34A'
              }
            />
            <DetailRow label="Joined Time" value={formatTime(entry.receivedAt)} />
            <DetailRow label="Wait Time" value={waitLabel} />
            <DetailRow label="Assigned Pharmacist" value={assignedPharmacist} />
            {entry.isOnHold && <DetailRow label="Status" value="On Hold" color="#D97706" />}
          </div>
        </div>

        <div
          className="flex shrink-0 flex-wrap items-center justify-end gap-2.5 px-6 py-4"
          style={{ borderTop: '1px solid rgba(0,100,130,0.12)' }}
        >
          <button
            type="button"
            onClick={() => onToggleHold(entry.rxNo)}
            className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[rgba(217,119,6,0.06)] ${FOCUS_RING}`}
            style={{ fontSize: 14, color: '#D97706', border: '1px solid rgba(217,119,6,0.3)' }}
          >
            {entry.isOnHold ? (
              <>
                <Play style={{ width: 15, height: 15 }} />
                Release Hold
              </>
            ) : (
              <>
                <Pause style={{ width: 15, height: 15 }} />
                Put On Hold
              </>
            )}
          </button>

          {entry.stage === 'Ready for Pickup' ? (
            <button
              type="button"
              onClick={() => onMarkCollected(entry.rxNo)}
              className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
              style={{ fontSize: 14, background: '#16A34A' }}
            >
              <CheckCircle2 style={{ width: 15, height: 15 }} />
              Mark as Collected
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onAdvance(entry.rxNo)}
                className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[rgba(0,180,216,0.06)] ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#00B4D8', border: '1px solid #00B4D8' }}
              >
                <ArrowRight style={{ width: 15, height: 15 }} />
                Move to Next Queue
              </button>
              <button
                type="button"
                onClick={() => onMarkReady(entry.rxNo)}
                className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                style={{ fontSize: 14, background: '#16A34A' }}
              >
                <CheckCircle2 style={{ width: 15, height: 15 }} />
                Mark as Ready for Pickup
              </button>
            </>
          )}

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
