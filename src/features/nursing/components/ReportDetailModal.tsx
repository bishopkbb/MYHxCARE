'use client';

import { Download, X, type LucideIcon } from 'lucide-react';

import type { NursingReport } from '@/features/nursing/__mocks__/nursingReportsFixtures';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const STATUS_CFG: Record<string, { color: string; bg: string; border: string }> = {
  Completed: { color: '#16A34A', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.35)' },
  'In Progress': { color: '#2563EB', bg: 'rgba(37,99,235,0.1)', border: 'rgba(37,99,235,0.35)' },
  Pending: { color: '#D97706', bg: 'rgba(217,119,6,0.1)', border: 'rgba(217,119,6,0.35)' },
};

function Row({ left, right }: { left: string; right: string }) {
  return (
    <div
      className="flex items-center justify-between py-2.5"
      style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
    >
      <span style={{ fontSize: 14, color: '#2F3A40' }}>{left}</span>
      <span className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
        {right}
      </span>
    </div>
  );
}

export function ReportDetailModal({
  report,
  icon: Icon,
  iconColor,
  iconBg,
  onExport,
  onClose,
}: {
  report: NursingReport;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  onExport: () => void;
  onClose: () => void;
}) {
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
        style={{ maxWidth: 600, maxHeight: 'calc(100vh - 64px)', borderRadius: 16 }}
      >
        <div
          className="flex shrink-0 items-start justify-between gap-3 px-6 py-5"
          style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex size-11 shrink-0 items-center justify-center rounded-[10px]"
              style={{ background: iconBg }}
            >
              <Icon style={{ width: 20, height: 20, color: iconColor }} />
            </div>
            <div>
              <h2
                className="font-display font-semibold"
                style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
              >
                {report.title}
              </h2>
              <p style={{ fontSize: 14, color: '#4A7080' }}>{report.subtitle}</p>
            </div>
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
          <div className="grid grid-cols-3 gap-2.5">
            {report.stats.map((s) => (
              <div key={s.label} className="rounded-[10px] p-3" style={{ background: '#F5FBFD' }}>
                <p style={{ fontSize: 14, color: '#8A98A3' }}>{s.label}</p>
                <p className="font-display font-bold" style={{ fontSize: 18, color: '#0D2630' }}>
                  {s.value}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-5">
            {report.id === 'medication-admin' && (
              <>
                <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
                  All Medications Administered
                </p>
                <div className="mt-2">
                  {report.fullRows.map((r) => (
                    <Row key={r.label} left={r.label} right={r.value} />
                  ))}
                </div>
              </>
            )}

            {report.id === 'shift' && (
              <>
                <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
                  All Shifts
                </p>
                <div className="mt-2 flex flex-col gap-2">
                  {report.rows.map((s) => {
                    const cfg = STATUS_CFG[s.status]!;
                    return (
                      <div
                        key={s.shift}
                        className="rounded-[10px] p-3"
                        style={{ background: '#F5FBFD' }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className="font-sans font-semibold"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {s.shift}
                          </span>
                          <span
                            className="rounded-full px-2.5 py-0.5 font-sans font-medium whitespace-nowrap"
                            style={{
                              fontSize: 14,
                              color: cfg.color,
                              background: cfg.bg,
                              border: `1px solid ${cfg.border}`,
                            }}
                          >
                            {s.status}
                          </span>
                        </div>
                        <p className="mt-1" style={{ fontSize: 14, color: '#4A7080' }}>
                          {s.time}
                        </p>
                        <p style={{ fontSize: 14, color: '#8A98A3' }}>
                          Staff In-Charge: {s.staffInCharge}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {report.id === 'ward-census' && (
              <>
                <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
                  Bed Status Breakdown
                </p>
                <div className="mt-2">
                  {report.slices.map((s) => (
                    <div
                      key={s.label}
                      className="flex items-center justify-between py-2.5"
                      style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ background: s.color }}
                        />
                        <span style={{ fontSize: 14, color: '#2F3A40' }}>{s.label}</span>
                      </div>
                      <span
                        className="font-sans font-semibold"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {s.count} ({s.percent}%)
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {report.id === 'vitals' && (
              <>
                <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
                  Vital Signs Overview
                </p>
                <div className="mt-2">
                  {report.rows.map((r) => (
                    <Row key={r.label} left={r.label} right={r.value} />
                  ))}
                </div>
              </>
            )}

            {(report.id === 'admission' || report.id === 'discharge') && (
              <>
                <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
                  {report.chartTitle}
                </p>
                <div className="mt-2">
                  {report.bars.map((b) => (
                    <Row key={b.ward} left={`Ward ${b.ward}`} right={String(b.count)} />
                  ))}
                </div>
              </>
            )}

            {report.id === 'observation' && (
              <>
                <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
                  Top Observation Types
                </p>
                <div className="mt-2">
                  {report.rows.map((r) => (
                    <Row key={r.label} left={r.label} right={r.value} />
                  ))}
                </div>
              </>
            )}

            {report.id === 'medication-due' && (
              <>
                <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
                  Due Medications
                </p>
                <div className="mt-2">
                  {report.rows.map((r) => (
                    <Row
                      key={`${r.time}-${r.medication}`}
                      left={`${r.time} · ${r.medication}`}
                      right={`${r.patients} patients`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div
          className="flex shrink-0 items-center justify-end gap-2.5 px-6 py-4"
          style={{ borderTop: '1px solid rgba(0,100,130,0.12)' }}
        >
          <button
            type="button"
            onClick={onClose}
            className={`flex h-11 items-center rounded-[10px] px-5 font-sans font-semibold transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
            style={{ border: '1px solid rgba(0,100,130,0.15)', color: '#0D2630', fontSize: 14 }}
          >
            Close
          </button>
          <button
            type="button"
            onClick={onExport}
            className={`flex h-11 items-center gap-2 rounded-[10px] px-5 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
            style={{ background: '#00B4D8', fontSize: 14 }}
          >
            <Download style={{ width: 16, height: 16 }} />
            Export
          </button>
        </div>
      </div>
    </div>
  );
}
