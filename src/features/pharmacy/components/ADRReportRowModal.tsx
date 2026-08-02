'use client';

import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { ROUTES } from '@/constants/routes';
import { formatDate, formatHumanDate, formatTime } from '@/utils/datetime';
import {
  ADR_CAUSALITY_COLOR,
  ADR_SEVERITY_COLOR,
  ADR_STATUS_COLOR,
  type ADRReport,
} from '@/features/pharmacy/__mocks__/pharmacyFixtures';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <span style={{ fontSize: 14, color: '#4A7080' }}>{label}</span>
      <span className="text-right font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
        {value}
      </span>
    </div>
  );
}

function Badge({
  label,
  cfg,
}: {
  label: string;
  cfg: { color: string; border: string; bg: string };
}) {
  return (
    <span
      className="rounded-full px-2.5 py-0.5 font-sans font-medium"
      style={{
        fontSize: 14,
        whiteSpace: 'nowrap',
        color: cfg.color,
        border: `1px solid ${cfg.border}`,
        background: cfg.bg,
      }}
    >
      {label}
    </span>
  );
}

/** Read-only snapshot of one real ADR report for the ADR Report screen —
 * lazy-loaded (checklist §14). Distinct from ADRReportDetailModal.tsx (the
 * Adverse Drug Reactions operational screen's own modal, which takes
 * onUpdateStatus and has status-change actions) — this one stays read-only
 * and links out to that screen instead. */
export function ADRReportRowModal({ report, onClose }: { report: ADRReport; onClose: () => void }) {
  const router = useRouter();

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
        style={{ maxWidth: 480, maxHeight: 'calc(100vh - 64px)', borderRadius: 16 }}
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
              {report.id}
            </h2>
            <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
              {formatHumanDate(report.reportedAt)} · {formatTime(report.reportedAt)}
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

        <div className="min-h-0 flex-1 overflow-y-auto scroll-smooth px-6 py-3">
          <div className="rounded-[10px] bg-[#F5FBFD] px-3.5 py-2.5">
            <p
              className="truncate font-sans font-medium"
              style={{ fontSize: 14, color: '#0D2630' }}
            >
              {report.patientName}
            </p>
            <p style={{ fontSize: 14, color: '#4A7080' }}>{report.mrn}</p>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Badge label={report.severity} cfg={ADR_SEVERITY_COLOR[report.severity]} />
            <Badge label={report.causality} cfg={ADR_CAUSALITY_COLOR[report.causality]} />
            <Badge label={report.status} cfg={ADR_STATUS_COLOR[report.status]} />
          </div>

          <div className="mt-2 divide-y" style={{ borderColor: 'rgba(0,100,130,0.08)' }}>
            <DetailRow label="Suspected Drug(s)" value={report.suspectedDrugs.join(', ')} />
            <DetailRow label="Drug Class" value={report.drugClass} />
            <DetailRow label="Reaction" value={report.reaction} />
            <DetailRow label="Onset Date" value={formatDate(report.onsetDate)} />
            <DetailRow label="Reported By" value={report.reportedBy} />
            {report.actionTaken && <DetailRow label="Action Taken" value={report.actionTaken} />}
            {report.notes && <DetailRow label="Notes" value={report.notes} />}
          </div>
        </div>

        <div
          className="flex shrink-0 items-center justify-end gap-2.5 px-6 py-4"
          style={{ borderTop: '1px solid rgba(0,100,130,0.12)' }}
        >
          <button
            type="button"
            onClick={() => router.push(ROUTES.pharmacyAdr)}
            className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
            style={{ fontSize: 14, color: '#00B4D8', border: '1px solid rgba(0,180,216,0.35)' }}
          >
            Go to Adverse Drug Reactions
          </button>
          <button
            type="button"
            onClick={onClose}
            className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
            style={{ fontSize: 14, background: '#0F766E' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
