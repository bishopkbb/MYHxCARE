'use client';

import { ArrowRight, Check, Printer, X } from 'lucide-react';

import { PermissionGate } from '@components/shared/PermissionGate';
import { PERMISSIONS } from '@/constants/permissions';
import { downloadPDF, escapeHtml } from '@/utils/export';
import { formatHumanDate, formatTime } from '@/utils/datetime';
import type { Referral, ReferralStatus } from '@/features/registration/__mocks__/referralFixtures';

const STATUS_CFG: Record<ReferralStatus, { color: string; border: string; bg: string }> = {
  Pending: { color: '#F59E0B', border: 'rgba(245,158,11,0.40)', bg: 'rgba(245,158,11,0.06)' },
  Accepted: { color: '#00B4D8', border: 'rgba(0,180,216,0.40)', bg: 'transparent' },
  Completed: { color: '#22C55E', border: 'rgba(34,197,94,0.40)', bg: 'transparent' },
  Cancelled: { color: '#EF4444', border: 'rgba(239,68,68,0.40)', bg: 'rgba(239,68,68,0.06)' },
};

const DIRECTION_CFG = {
  Incoming: { color: '#EC4899', border: 'rgba(236,72,153,0.35)', bg: 'rgba(236,72,153,0.08)' },
  Outgoing: { color: '#8B5CF6', border: 'rgba(139,92,246,0.35)', bg: 'rgba(139,92,246,0.08)' },
} as const;

export function ReferralDetailModal({
  referral,
  onClose,
  onAccept,
  onComplete,
  onCancel,
}: {
  referral: Referral;
  onClose: () => void;
  onAccept: (id: string) => void;
  onComplete: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  const statusCfg = STATUS_CFG[referral.status];
  const directionCfg = DIRECTION_CFG[referral.direction];

  function handlePrint() {
    const body = `
      <h1>Referral Letter — ${escapeHtml(referral.id)}</h1>
      <p class="meta">${escapeHtml(formatHumanDate(referral.date))} ${escapeHtml(formatTime(referral.date))}</p>
      <hr />
      <table>
        <tr><th>Patient</th><td>${escapeHtml(referral.patientName)} (${escapeHtml(referral.mrn)})</td></tr>
        <tr><th>Direction</th><td>${escapeHtml(referral.direction)}</td></tr>
        <tr><th>From</th><td>${escapeHtml(referral.fromDepartment)}</td></tr>
        <tr><th>To</th><td>${escapeHtml(referral.toDepartment)}</td></tr>
        <tr><th>Referred By</th><td>${escapeHtml(referral.referredBy)}</td></tr>
        <tr><th>Priority</th><td>${escapeHtml(referral.priority)}</td></tr>
        <tr><th>Status</th><td>${escapeHtml(referral.status)}</td></tr>
      </table>
      <p class="content"><strong>Reason for Referral</strong><br/>${escapeHtml(referral.reason)}</p>
    `;
    downloadPDF(`referral-${referral.id}`, body);
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
        style={{ maxWidth: 560, maxHeight: 'calc(100vh - 64px)', borderRadius: 16 }}
      >
        <div
          className="flex shrink-0 items-start justify-between gap-3 px-6 py-5"
          style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
        >
          <div className="flex flex-wrap items-center gap-2.5">
            <h2
              className="font-display font-semibold"
              style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
            >
              {referral.id}
            </h2>
            <span
              className="rounded-full px-2.5 py-0.5 font-sans font-medium"
              style={{
                fontSize: 14,
                color: directionCfg.color,
                border: `1px solid ${directionCfg.border}`,
                background: directionCfg.bg,
              }}
            >
              {referral.direction}
            </span>
            <span
              className="rounded-full px-2.5 py-0.5 font-sans font-medium"
              style={{
                fontSize: 14,
                color: statusCfg.color,
                border: `1px solid ${statusCfg.border}`,
                background: statusCfg.bg,
              }}
            >
              {referral.status}
            </span>
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
          <div
            className="flex items-center justify-center gap-3 rounded-[10px] p-3"
            style={{ background: '#F5FBFD' }}
          >
            <span className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
              {referral.fromDepartment}
            </span>
            <ArrowRight style={{ width: 16, height: 16, color: '#8A98A3', flexShrink: 0 }} />
            <span className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
              {referral.toDepartment}
            </span>
          </div>

          <div className="mt-4 flex flex-col gap-3">
            {[
              ['Patient', `${referral.patientName} (${referral.mrn})`],
              ['Referred By', referral.referredBy],
              ['Priority', referral.priority],
              ['Date', `${formatHumanDate(referral.date)} ${formatTime(referral.date)}`],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-2">
                <span style={{ fontSize: 14, color: '#8A98A3' }}>{label}</span>
                <span
                  className="max-w-[280px] truncate text-right font-sans font-medium"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-5">
            <p className="font-sans font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
              Reason for Referral
            </p>
            <p className="mt-1.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
              {referral.reason || 'No reason provided.'}
            </p>
          </div>
        </div>

        <div
          className="flex shrink-0 flex-wrap items-center justify-end gap-2.5 px-6 py-4"
          style={{ borderTop: '1px solid rgba(0,100,130,0.12)' }}
        >
          <button
            type="button"
            onClick={handlePrint}
            className="flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
            style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
          >
            <Printer style={{ width: 15, height: 15 }} />
            Print Letter
          </button>
          <PermissionGate permission={PERMISSIONS.REFERRALS_WRITE}>
            {referral.status === 'Pending' && (
              <>
                <button
                  type="button"
                  onClick={() => onCancel(referral.id)}
                  className="flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[rgba(239,68,68,0.06)] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                  style={{
                    fontSize: 14,
                    color: '#EF4444',
                    border: '1px solid rgba(239,68,68,0.35)',
                  }}
                >
                  <X style={{ width: 15, height: 15 }} />
                  Cancel Referral
                </button>
                <button
                  type="button"
                  onClick={() => onAccept(referral.id)}
                  className="flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                  style={{ fontSize: 14, background: '#22C55E' }}
                >
                  <Check style={{ width: 15, height: 15 }} />
                  Accept
                </button>
              </>
            )}
            {referral.status === 'Accepted' && (
              <>
                <button
                  type="button"
                  onClick={() => onCancel(referral.id)}
                  className="flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[rgba(239,68,68,0.06)] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                  style={{
                    fontSize: 14,
                    color: '#EF4444',
                    border: '1px solid rgba(239,68,68,0.35)',
                  }}
                >
                  <X style={{ width: 15, height: 15 }} />
                  Cancel Referral
                </button>
                <button
                  type="button"
                  onClick={() => onComplete(referral.id)}
                  className="flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                  style={{ fontSize: 14, background: '#00B4D8' }}
                >
                  <Check style={{ width: 15, height: 15 }} />
                  Mark Completed
                </button>
              </>
            )}
          </PermissionGate>
        </div>
      </div>
    </div>
  );
}
