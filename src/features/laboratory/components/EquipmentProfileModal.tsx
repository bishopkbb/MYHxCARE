'use client';

import { CheckCircle2, Clock, X } from 'lucide-react';

import { Tooltip } from '@components/shared/Tooltip';
import { formatHumanDate } from '@/utils/datetime';
import type { EquipmentRecord } from '@/features/laboratory/__mocks__/equipmentFixtures';
import {
  getDowntimeLogsFor,
  getErrorLogsFor,
  getServiceEventsFor,
} from '@/features/laboratory/store/equipmentStore';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const STATUS_CFG: Record<string, { color: string; border: string; bg: string }> = {
  'In Use': { color: '#16A34A', border: 'rgba(34,197,94,0.4)', bg: 'rgba(34,197,94,0.08)' },
  'Under Maintenance': {
    color: '#B45309',
    border: 'rgba(245,158,11,0.4)',
    bg: 'rgba(245,158,11,0.08)',
  },
  'Out of Service': { color: '#DC2626', border: 'rgba(239,68,68,0.4)', bg: 'rgba(239,68,68,0.08)' },
  Available: { color: '#2563EB', border: 'rgba(37,99,235,0.4)', bg: 'rgba(37,99,235,0.08)' },
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-sans font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
      {children}
    </p>
  );
}

/** Read-only, richer detail view than the docked panel — full service
 * history, downtime log, and error log for one equipment record, not just
 * upcoming activities. Lazy-loaded (checklist §14). */
export function EquipmentProfileModal({
  equipment,
  onClose,
}: {
  equipment: EquipmentRecord;
  onClose: () => void;
}) {
  const cfg = STATUS_CFG[equipment.status]!;
  const serviceEvents = getServiceEventsFor(equipment.id);
  const downtimeLogs = getDowntimeLogsFor(equipment.id);
  const errorLogs = getErrorLogsFor(equipment.id);

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
        style={{ maxWidth: 720, maxHeight: 'calc(100vh - 48px)', borderRadius: 16 }}
      >
        <div
          className="flex shrink-0 items-start justify-between gap-3 px-6 py-5"
          style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Tooltip content={equipment.name}>
                <h2
                  className="font-display truncate font-semibold"
                  style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
                >
                  {equipment.name}
                </h2>
              </Tooltip>
              <span
                className="shrink-0 rounded-full px-2.5 py-0.5 font-sans font-medium"
                style={{
                  fontSize: 14,
                  color: cfg.color,
                  border: `1px solid ${cfg.border}`,
                  background: cfg.bg,
                }}
              >
                {equipment.status}
              </span>
            </div>
            <p className="mt-0.5" style={{ fontSize: 14, color: '#00B4D8' }}>
              {equipment.id}
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
          <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            {[
              ['Model', equipment.model],
              ['Serial Number', equipment.serialNumber],
              ['Department', equipment.department],
              ['Equipment Type', equipment.equipmentType],
              ['Location', equipment.location],
              ['Manufacturer', equipment.manufacturer],
              ['Installation Date', formatHumanDate(equipment.installationDate)],
              ['Warranty Expiry', formatHumanDate(equipment.warrantyExpiry)],
              [
                'Last Calibration',
                equipment.lastCalibrationAt ? formatHumanDate(equipment.lastCalibrationAt) : '—',
              ],
              [
                'Next Calibration',
                equipment.nextCalibrationAt ? formatHumanDate(equipment.nextCalibrationAt) : '—',
              ],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-2">
                <span style={{ fontSize: 14, color: '#8A98A3' }}>{label}</span>
                <span
                  className="text-right font-sans font-medium"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3" style={{ fontSize: 14, color: '#2F3A40' }}>
            {equipment.description}
          </p>

          <div className="mt-6">
            <SectionTitle>Service History</SectionTitle>
            {serviceEvents.length === 0 ? (
              <p className="mt-2" style={{ fontSize: 14, color: '#8A98A3' }}>
                No service events recorded.
              </p>
            ) : (
              <div className="mt-2.5 flex flex-col gap-2.5">
                {serviceEvents.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-start justify-between gap-3 rounded-[10px] p-3"
                    style={{ background: '#F5FBFD', border: '1px solid rgba(0,100,130,0.08)' }}
                  >
                    <div className="min-w-0">
                      <p
                        className="font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {s.type}{' '}
                        <span
                          className="ml-1 rounded-full px-2 py-0.5"
                          style={{
                            fontSize: 14,
                            color: s.status === 'Completed' ? '#16A34A' : '#B45309',
                            background:
                              s.status === 'Completed'
                                ? 'rgba(34,197,94,0.1)'
                                : 'rgba(245,158,11,0.1)',
                          }}
                        >
                          {s.status}
                        </span>
                      </p>
                      <p style={{ fontSize: 14, color: '#4A7080' }}>{s.notes}</p>
                      <p className="mt-0.5" style={{ fontSize: 14, color: '#8A98A3' }}>
                        {s.performedBy}
                      </p>
                    </div>
                    <p
                      className="shrink-0 whitespace-nowrap"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      {formatHumanDate(s.date)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6">
            <SectionTitle>Downtime Log</SectionTitle>
            {downtimeLogs.length === 0 ? (
              <p className="mt-2" style={{ fontSize: 14, color: '#8A98A3' }}>
                No downtime recorded.
              </p>
            ) : (
              <div className="mt-2.5 flex flex-col gap-2.5">
                {downtimeLogs.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-start justify-between gap-3 rounded-[10px] p-3"
                    style={{ background: '#F5FBFD', border: '1px solid rgba(0,100,130,0.08)' }}
                  >
                    <div className="min-w-0">
                      <p style={{ fontSize: 14, color: '#4A7080' }}>{d.reason}</p>
                      <p className="mt-0.5" style={{ fontSize: 14, color: '#8A98A3' }}>
                        {d.reportedBy}
                      </p>
                    </div>
                    <p
                      className="shrink-0 whitespace-nowrap"
                      style={{ fontSize: 14, color: d.endAt ? '#4A7080' : '#DC2626' }}
                    >
                      {formatHumanDate(d.startAt)} –{' '}
                      {d.endAt ? formatHumanDate(d.endAt) : 'Ongoing'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6">
            <SectionTitle>Error Log</SectionTitle>
            {errorLogs.length === 0 ? (
              <p className="mt-2" style={{ fontSize: 14, color: '#8A98A3' }}>
                No errors logged.
              </p>
            ) : (
              <div className="mt-2.5 flex flex-col gap-2.5">
                {errorLogs.map((err) => (
                  <div
                    key={err.id}
                    className="flex items-start justify-between gap-3 rounded-[10px] p-3"
                    style={{ background: '#F5FBFD', border: '1px solid rgba(0,100,130,0.08)' }}
                  >
                    <div className="flex min-w-0 items-start gap-2">
                      {err.resolved ? (
                        <CheckCircle2
                          style={{
                            width: 15,
                            height: 15,
                            color: '#16A34A',
                            flexShrink: 0,
                            marginTop: 2,
                          }}
                        />
                      ) : (
                        <Clock
                          style={{
                            width: 15,
                            height: 15,
                            color: '#D97706',
                            flexShrink: 0,
                            marginTop: 2,
                          }}
                        />
                      )}
                      <div className="min-w-0">
                        <p
                          className="font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {err.errorCode}
                        </p>
                        <p style={{ fontSize: 14, color: '#4A7080' }}>{err.description}</p>
                      </div>
                    </div>
                    <p
                      className="shrink-0 whitespace-nowrap"
                      style={{ fontSize: 14, color: '#8A98A3' }}
                    >
                      {formatHumanDate(err.occurredAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div
          className="flex shrink-0 items-center justify-end px-6 py-4"
          style={{ borderTop: '1px solid rgba(0,100,130,0.12)' }}
        >
          <button
            type="button"
            onClick={onClose}
            className={`flex h-11 items-center rounded-[10px] px-5 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
            style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
