'use client';

import { CheckCircle2, XCircle, X } from 'lucide-react';

import { AllergyBanner } from '@components/clinical/AllergyBanner';
import { PermissionGate } from '@components/shared/PermissionGate';
import { PERMISSIONS } from '@/constants/permissions';
import { getPatientDetail } from '@/features/patients/__mocks__/patientFixtures';
import { formatDateTime } from '@/utils/datetime';
import type { PharmacyQueueEntry } from '@/features/pharmacy/__mocks__/pharmacyFixtures';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const PRIORITY_CFG: Record<string, { color: string; border: string; bg: string }> = {
  High: { color: '#DC2626', border: 'rgba(220,38,38,0.35)', bg: 'rgba(220,38,38,0.08)' },
  Medium: { color: '#D97706', border: 'rgba(217,119,6,0.35)', bg: 'rgba(217,119,6,0.08)' },
  Low: { color: '#16A34A', border: 'rgba(22,163,74,0.35)', bg: 'rgba(22,163,74,0.08)' },
};

const STAGE_CFG: Record<string, { color: string; border: string; bg: string }> = {
  'Pending Verification': {
    color: '#7C3AED',
    border: 'rgba(124,58,237,0.35)',
    bg: 'rgba(124,58,237,0.08)',
  },
  'In Progress': { color: '#D97706', border: 'rgba(217,119,6,0.35)', bg: 'rgba(217,119,6,0.08)' },
  'Ready for Dispense': {
    color: '#16A34A',
    border: 'rgba(22,163,74,0.35)',
    bg: 'rgba(22,163,74,0.08)',
  },
  'Ready for Pickup': {
    color: '#2563EB',
    border: 'rgba(37,99,235,0.35)',
    bg: 'rgba(37,99,235,0.08)',
  },
  Collected: { color: '#16A34A', border: 'rgba(22,163,74,0.35)', bg: 'rgba(22,163,74,0.08)' },
  Cancelled: { color: '#64748B', border: 'rgba(100,116,139,0.35)', bg: 'rgba(100,116,139,0.08)' },
};

const CANCELLABLE_STAGES = new Set(['Pending Verification', 'In Progress', 'Ready for Dispense']);

/** Read-only view of a single queue entry — lazy-loaded (checklist §14).
 * Reachable from the Prescription Queue table's eye icon and "View Details"
 * menu item, for a row of any stage. Verify & Dispense / Cancel remain
 * direct row-menu actions on the queue screen itself, not modal footer
 * buttons, so this stays a pure detail view. */
export function PrescriptionDetailModal({
  entry,
  onClose,
  onVerifyAndDispense,
  onCancel,
}: {
  entry: PharmacyQueueEntry;
  onClose: () => void;
  onVerifyAndDispense: (rxNo: string) => void;
  onCancel: (rxNo: string) => void;
}) {
  const patient = getPatientDetail(entry.patientId);
  const priorityCfg = PRIORITY_CFG[entry.priority]!;
  const stageCfg = STAGE_CFG[entry.stage] ?? STAGE_CFG['Cancelled']!;
  const canVerify = entry.stage === 'Pending Verification';
  const canCancel = CANCELLABLE_STAGES.has(entry.stage);

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
              Prescription Details
            </h2>
            <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
              Rx {entry.rxNo}
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
            <AllergyBanner allergies={patient.allergies} />

            <div className="flex flex-wrap items-center gap-2">
              <span
                className="rounded-full px-2.5 py-0.5 whitespace-nowrap"
                style={{
                  fontSize: 14,
                  color: stageCfg.color,
                  border: `1px solid ${stageCfg.border}`,
                  background: stageCfg.bg,
                }}
              >
                {entry.stage}
              </span>
              <span
                className="rounded-full px-2.5 py-0.5 whitespace-nowrap"
                style={{
                  fontSize: 14,
                  color: priorityCfg.color,
                  border: `1px solid ${priorityCfg.border}`,
                  background: priorityCfg.bg,
                }}
              >
                {entry.priority} Priority
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <p style={{ fontSize: 14, color: '#8A98A3' }}>Patient</p>
                <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                  {patient.name}
                </p>
              </div>
              <div>
                <p style={{ fontSize: 14, color: '#8A98A3' }}>MRN</p>
                <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                  {patient.mrn}
                </p>
              </div>
              <div>
                <p style={{ fontSize: 14, color: '#8A98A3' }}>Medication</p>
                <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                  {entry.medicationName} {entry.dose}
                </p>
              </div>
              <div>
                <p style={{ fontSize: 14, color: '#8A98A3' }}>Frequency</p>
                <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                  {entry.frequency}
                </p>
              </div>
              <div>
                <p style={{ fontSize: 14, color: '#8A98A3' }}>Prescribed By</p>
                <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                  {entry.doctorName}
                </p>
              </div>
              <div>
                <p style={{ fontSize: 14, color: '#8A98A3' }}>Department</p>
                <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                  {entry.department}
                </p>
              </div>
              <div>
                <p style={{ fontSize: 14, color: '#8A98A3' }}>Received</p>
                <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                  {formatDateTime(entry.receivedAt)}
                </p>
              </div>
              {entry.dispensedAt && (
                <div>
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>Dispensed</p>
                  <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                    {formatDateTime(entry.dispensedAt)}
                  </p>
                </div>
              )}
              {entry.cancelledAt && (
                <div>
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>Cancelled</p>
                  <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                    {formatDateTime(entry.cancelledAt)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div
          className="flex shrink-0 flex-wrap items-center justify-end gap-2.5 px-6 py-4"
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
          <PermissionGate permission={PERMISSIONS.PHARMACY_DISPENSE}>
            {canCancel && (
              <button
                type="button"
                onClick={() => {
                  onCancel(entry.rxNo);
                  onClose();
                }}
                className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[rgba(220,38,38,0.06)] ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#DC2626', border: '1px solid rgba(220,38,38,0.3)' }}
              >
                <XCircle style={{ width: 15, height: 15 }} />
                Cancel Prescription
              </button>
            )}
            {canVerify && (
              <button
                type="button"
                onClick={() => {
                  onVerifyAndDispense(entry.rxNo);
                  onClose();
                }}
                className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                style={{ fontSize: 14, background: '#00B4D8' }}
              >
                <CheckCircle2 style={{ width: 15, height: 15 }} />
                Verify &amp; Dispense
              </button>
            )}
          </PermissionGate>
        </div>
      </div>
    </div>
  );
}
