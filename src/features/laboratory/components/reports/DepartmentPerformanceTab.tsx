'use client';

import { AlertOctagon, Award, FlaskConical, Timer } from 'lucide-react';
import { useState } from 'react';

import {
  ScrollableTable,
  TABLE_HEADER_BG,
  TABLE_HEADER_STICKY_CLASS,
} from '@components/shared/ScrollableTable';
import { Tooltip } from '@components/shared/Tooltip';
import {
  formatMinutes,
  getDepartmentRows,
  weightedAvg,
  type ReportPeriod,
} from '@/features/laboratory/__mocks__/laboratoryReportsFixtures';
import { FOCUS_RING, ReportStatCard } from './reportShared';

type Metric = 'totalTests' | 'onTimePct' | 'avgTatMinutes';

const METRIC_OPTIONS: { key: Metric; label: string }[] = [
  { key: 'totalTests', label: 'Total Tests' },
  { key: 'onTimePct', label: 'On-time %' },
  { key: 'avgTatMinutes', label: 'Avg TAT' },
];

function formatMetric(metric: Metric, value: number): string {
  if (metric === 'onTimePct') return `${value.toFixed(1)}%`;
  if (metric === 'avgTatMinutes') return formatMinutes(value);
  return value.toLocaleString('en-GB');
}

export function DepartmentPerformanceTab({ period }: { period: ReportPeriod }) {
  const [metric, setMetric] = useState<Metric>('totalTests');
  const rows = getDepartmentRows(period);

  const highestVolume = [...rows].sort((a, b) => b.totalTests - a.totalTests)[0];
  const bestOnTime = [...rows].sort((a, b) => b.onTimePct - a.onTimePct)[0];
  const highestCriticalRate = [...rows].sort(
    (a, b) =>
      b.criticalResults / Math.max(1, b.totalTests) - a.criticalResults / Math.max(1, a.totalTests),
  )[0];
  const avgTat = weightedAvg(rows, 'avgTatMinutes');

  const maxForMetric = Math.max(...rows.map((r) => r[metric]), 1);
  const higherIsBetter = metric !== 'avgTatMinutes';

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ReportStatCard
          icon={FlaskConical}
          iconColor="#2563EB"
          iconBg="rgba(37,99,235,0.12)"
          label="Highest Volume"
          value={highestVolume ? highestVolume.totalTests.toLocaleString('en-GB') : '—'}
          info={highestVolume?.department ?? '—'}
        />
        <ReportStatCard
          icon={Award}
          iconColor="#16A34A"
          iconBg="rgba(34,197,94,0.12)"
          label="Best On-time %"
          value={bestOnTime ? `${bestOnTime.onTimePct.toFixed(1)}%` : '—'}
          info={bestOnTime?.department ?? '—'}
          infoColor="#16A34A"
        />
        <ReportStatCard
          icon={AlertOctagon}
          iconColor="#DC2626"
          iconBg="rgba(239,68,68,0.12)"
          label="Highest Critical Rate"
          value={
            highestCriticalRate
              ? `${((highestCriticalRate.criticalResults / Math.max(1, highestCriticalRate.totalTests)) * 100).toFixed(2)}%`
              : '—'
          }
          info={highestCriticalRate?.department ?? '—'}
          infoColor="#DC2626"
        />
        <ReportStatCard
          icon={Timer}
          iconColor="#0D9488"
          iconBg="rgba(13,148,136,0.12)"
          label="Avg TAT Across Depts"
          value={formatMinutes(avgTat)}
          info={period}
        />
      </div>

      <div
        className="rounded-[12px] p-4"
        style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
            Department Comparison
          </h2>
          <div className="flex gap-1.5 rounded-[10px] p-1" style={{ background: '#F5FBFD' }}>
            {METRIC_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setMetric(opt.key)}
                className={`rounded-[8px] px-3 py-1.5 font-sans font-medium transition-colors duration-150 ${FOCUS_RING}`}
                style={{
                  fontSize: 14,
                  color: metric === opt.key ? '#FFFFFF' : '#4A7080',
                  background: metric === opt.key ? '#00B4D8' : 'transparent',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-3">
          {[...rows]
            .sort((a, b) => (higherIsBetter ? b[metric] - a[metric] : a[metric] - b[metric]))
            .map((r) => (
              <div key={r.department} className="flex items-center gap-3">
                <Tooltip content={r.department}>
                  <span
                    className="w-40 shrink-0 truncate"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    {r.department}
                  </span>
                </Tooltip>
                <div
                  className="h-2 min-w-0 flex-1 overflow-hidden rounded-full"
                  style={{ background: '#E6F8FD' }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(4, (r[metric] / maxForMetric) * 100)}%`,
                      background: '#00B4D8',
                    }}
                  />
                </div>
                <span
                  className="w-24 shrink-0 text-right font-sans font-medium whitespace-nowrap"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  {formatMetric(metric, r[metric])}
                </span>
              </div>
            ))}
        </div>
      </div>

      <div
        className="rounded-[12px] p-4"
        style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
      >
        <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
          Full Metrics <span style={{ color: '#8A98A3', fontWeight: 400 }}>({period})</span>
        </h2>
        <div className="mt-3">
          <ScrollableTable minWidth={1200}>
            <div
              className={`flex items-center rounded-t-[8px] ${TABLE_HEADER_STICKY_CLASS}`}
              style={{ background: TABLE_HEADER_BG, borderBottom: '1px solid #E6F8FD' }}
            >
              {[
                ['Department', 'min-w-[160px] flex-1'],
                ['Total Tests', 'w-32'],
                ['Rejection Rate', 'w-44'],
                ['Critical Rate', 'w-40'],
                ['Avg TAT', 'w-28'],
                ['On-time %', 'w-28'],
              ].map(([label, width]) => (
                <div key={label} className={`${width} shrink-0 py-2.5 pr-2 pl-3 text-center`}>
                  <span
                    className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                    style={{ fontSize: 14, color: '#4A7080' }}
                  >
                    {label}
                  </span>
                </div>
              ))}
            </div>
            {rows.map((r) => {
              const rejectRate =
                r.samplesReceived > 0 ? (r.rejectedSamples / r.samplesReceived) * 100 : 0;
              const criticalRate = r.totalTests > 0 ? (r.criticalResults / r.totalTests) * 100 : 0;
              return (
                <div
                  key={r.department}
                  className="flex items-center"
                  style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                >
                  <div className="min-w-[160px] flex-1 py-3 pr-2 pl-3 text-center">
                    <Tooltip content={r.department}>
                      <p
                        className="truncate font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {r.department}
                      </p>
                    </Tooltip>
                  </div>
                  <div className="w-32 shrink-0 py-3 pr-2 text-center">
                    <p style={{ fontSize: 14, color: '#0D2630' }}>
                      {r.totalTests.toLocaleString('en-GB')}
                    </p>
                  </div>
                  <div className="w-44 shrink-0 py-3 pr-2 text-center">
                    <p style={{ fontSize: 14, color: '#DC2626' }}>{rejectRate.toFixed(1)}%</p>
                  </div>
                  <div className="w-40 shrink-0 py-3 pr-2 text-center">
                    <p style={{ fontSize: 14, color: '#7C3AED' }}>{criticalRate.toFixed(2)}%</p>
                  </div>
                  <div className="w-28 shrink-0 py-3 pr-2 text-center">
                    <p className="whitespace-nowrap" style={{ fontSize: 14, color: '#0D2630' }}>
                      {formatMinutes(r.avgTatMinutes)}
                    </p>
                  </div>
                  <div className="w-28 shrink-0 py-3 pr-2 text-center">
                    <p style={{ fontSize: 14, color: '#16A34A' }}>{r.onTimePct.toFixed(1)}%</p>
                  </div>
                </div>
              );
            })}
          </ScrollableTable>
        </div>
      </div>
    </div>
  );
}
