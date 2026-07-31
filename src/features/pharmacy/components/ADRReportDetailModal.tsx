'use client';

import { CheckCircle2, ShieldAlert, User, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Tooltip } from '@components/shared/Tooltip';
import { ROUTES } from '@/constants/routes';
import { formatHumanDate, formatTime } from '@/utils/datetime';
import {
  ADR_CAUSALITY_COLOR,
  ADR_SEVERITY_COLOR,
  ADR_STATUS_COLOR,
  type ADRReport,
  type ADRStatus,
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

/** Full detail of one ADR report — lazy-loaded (checklist §14). Footer
 * actions change with status: Mark as Resolved / Report to NPC (Severe
 * only) while Under Assessment, or nothing further once the case is closed
 * (Resolved / Reported to NPC are both terminal, audit-safe states). */
export function ADRReportDetailModal({
  report,
  onUpdateStatus,
  onClose,
}: {
  report: ADRReport;
  onUpdateStatus: (id: string, status: ADRStatus) => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const severityCfg = ADR_SEVERITY_COLOR[report.severity];
  const causalityCfg = ADR_CAUSALITY_COLOR[report.causality];
  const statusCfg = ADR_STATUS_COLOR[report.status];

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
              {report.id}
            </h2>
            <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
              {report.drugClass} · Reported {formatHumanDate(report.reportedAt)}
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
              <Tooltip content={report.patientName}>
                <p
                  className="truncate font-sans font-medium"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  {report.patientName}
                </p>
              </Tooltip>
              <p style={{ fontSize: 14, color: '#4A7080' }}>{report.mrn}</p>
            </div>
            <button
              type="button"
              onClick={() => router.push(ROUTES.patientProfile(report.patientId))}
              className={`flex h-9 shrink-0 items-center gap-1.5 rounded-[8px] px-2.5 font-sans font-medium transition-colors duration-150 hover:bg-white ${FOCUS_RING}`}
              style={{ fontSize: 14, color: '#00B4D8' }}
            >
              <User style={{ width: 14, height: 14 }} />
              View Profile
            </button>
          </div>

          <div className="mt-3 pb-3" style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}>
            <DetailRow label="Suspected Drug(s)" value={report.suspectedDrugs.join(', ')} />
            <DetailRow label="Reaction" value={report.reaction} />
            <div className="flex items-center justify-between gap-3 py-1.5">
              <span style={{ fontSize: 14, color: '#4A7080' }}>Severity</span>
              <Badge
                label={report.severity}
                color={severityCfg.color}
                border={severityCfg.border}
                bg={severityCfg.bg}
              />
            </div>
            <div className="flex items-center justify-between gap-3 py-1.5">
              <span style={{ fontSize: 14, color: '#4A7080' }}>Causality Assessment</span>
              <Badge
                label={report.causality}
                color={causalityCfg.color}
                border={causalityCfg.border}
                bg={causalityCfg.bg}
              />
            </div>
            <div className="flex items-center justify-between gap-3 py-1.5">
              <span style={{ fontSize: 14, color: '#4A7080' }}>Status</span>
              <Badge
                label={report.status}
                color={statusCfg.color}
                border={statusCfg.border}
                bg={statusCfg.bg}
              />
            </div>
            <DetailRow label="Onset Date" value={formatHumanDate(report.onsetDate)} />
            <DetailRow
              label="Report Date"
              value={`${formatHumanDate(report.reportedAt)} · ${formatTime(report.reportedAt)}`}
            />
            <DetailRow label="Reported By" value={report.reportedBy} />
            {report.actionTaken && <DetailRow label="Action Taken" value={report.actionTaken} />}
          </div>

          {report.notes && (
            <p className="mt-3" style={{ fontSize: 14, color: '#4A7080' }}>
              <span className="font-sans font-medium" style={{ color: '#0D2630' }}>
                Notes:{' '}
              </span>
              {report.notes}
            </p>
          )}
        </div>

        <div
          className="flex shrink-0 flex-wrap items-center justify-end gap-2.5 px-6 py-4"
          style={{ borderTop: '1px solid rgba(0,100,130,0.12)' }}
        >
          {report.status === 'Under Assessment' && (
            <>
              {report.severity === 'Severe' && (
                <button
                  type="button"
                  onClick={() => onUpdateStatus(report.id, 'Reported to NPC')}
                  className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                  style={{ fontSize: 14, background: '#7C3AED' }}
                >
                  <ShieldAlert style={{ width: 15, height: 15 }} />
                  Report to NPC
                </button>
              )}
              <button
                type="button"
                onClick={() => onUpdateStatus(report.id, 'Resolved')}
                className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                style={{ fontSize: 14, background: '#16A34A' }}
              >
                <CheckCircle2 style={{ width: 15, height: 15 }} />
                Mark as Resolved
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
