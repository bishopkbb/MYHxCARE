'use client';

import { CheckCircle2, Clock, FileText, Timer } from 'lucide-react';
import type { ReactNode } from 'react';

import {
  ScrollableTable,
  TABLE_HEADER_BG,
  TABLE_HEADER_STICKY_CLASS,
} from '@components/shared/ScrollableTable';
import { Tooltip } from '@components/shared/Tooltip';
import {
  formatMinutes,
  getDepartmentRows,
  getResultsPublishedSeries,
  sumField,
  weightedAvg,
  type ReportPeriod,
} from '@/features/laboratory/__mocks__/laboratoryReportsFixtures';
import { ReportStatCard, ReportTrendChart } from './reportShared';

export function PublishedResultsReportTab({
  period,
  periodDropdown,
}: {
  period: ReportPeriod;
  periodDropdown: ReactNode;
}) {
  const rows = getDepartmentRows(period);
  const series = getResultsPublishedSeries(period);

  const resultsPublished = sumField(rows, 'resultsPublished');
  const pendingResults = sumField(rows, 'pendingResults');
  const avgTat = weightedAvg(rows, 'avgTatMinutes');
  const onTimePct = weightedAvg(rows, 'onTimePct');

  const bestDept = [...rows].sort((a, b) => b.onTimePct - a.onTimePct)[0];
  const worstDept = [...rows].sort((a, b) => a.onTimePct - b.onTimePct)[0];

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ReportStatCard
          icon={FileText}
          iconColor="#7C3AED"
          iconBg="rgba(124,58,237,0.12)"
          label="Results Published"
          value={resultsPublished.toLocaleString('en-GB')}
          info={period}
        />
        <ReportStatCard
          icon={Clock}
          iconColor="#D97706"
          iconBg="rgba(245,158,11,0.12)"
          label="Pending Results"
          value={pendingResults.toLocaleString('en-GB')}
          info="Not yet published"
        />
        <ReportStatCard
          icon={Timer}
          iconColor="#0D9488"
          iconBg="rgba(13,148,136,0.12)"
          label="Avg TAT"
          value={formatMinutes(avgTat)}
          info="Order to publish"
        />
        <ReportStatCard
          icon={CheckCircle2}
          iconColor="#16A34A"
          iconBg="rgba(34,197,94,0.12)"
          label="On-time %"
          value={`${onTimePct.toFixed(1)}%`}
          info={period}
          infoColor="#16A34A"
        />
      </div>

      <div
        className="rounded-[12px] p-4"
        style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
            Daily Results Published
          </h2>
          {periodDropdown}
        </div>
        <ReportTrendChart data={series} color="#7C3AED" unitLabel="Results" />
      </div>

      <div
        className="rounded-[12px] p-4"
        style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
            On-time Publishing by Department{' '}
            <span style={{ color: '#8A98A3', fontWeight: 400 }}>({period})</span>
          </h2>
          {bestDept && worstDept && (
            <p style={{ fontSize: 14, color: '#8A98A3' }}>
              Best: <span style={{ color: '#16A34A', fontWeight: 500 }}>{bestDept.department}</span>{' '}
              · Needs attention:{' '}
              <span style={{ color: '#DC2626', fontWeight: 500 }}>{worstDept.department}</span>
            </p>
          )}
        </div>
        <div className="mt-3 flex flex-col gap-3">
          {[...rows]
            .sort((a, b) => b.onTimePct - a.onTimePct)
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
                      width: `${r.onTimePct}%`,
                      background:
                        r.onTimePct >= 90 ? '#16A34A' : r.onTimePct >= 80 ? '#D97706' : '#DC2626',
                    }}
                  />
                </div>
                <span
                  className="w-16 shrink-0 text-right font-sans font-medium"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  {r.onTimePct.toFixed(1)}%
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
          Published Results by Department
        </h2>
        <div className="mt-3">
          <ScrollableTable minWidth={900}>
            <div
              className={`flex items-center rounded-t-[8px] ${TABLE_HEADER_STICKY_CLASS}`}
              style={{ background: TABLE_HEADER_BG, borderBottom: '1px solid #E6F8FD' }}
            >
              {[
                ['Department', 'min-w-[160px] flex-1'],
                ['Results Published', 'w-52'],
                ['Pending Results', 'w-44'],
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
            {rows.map((r) => (
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
                <div className="w-52 shrink-0 py-3 pr-2 text-center">
                  <p style={{ fontSize: 14, color: '#0D2630' }}>
                    {r.resultsPublished.toLocaleString('en-GB')}
                  </p>
                </div>
                <div className="w-44 shrink-0 py-3 pr-2 text-center">
                  <p style={{ fontSize: 14, color: '#D97706' }}>
                    {r.pendingResults.toLocaleString('en-GB')}
                  </p>
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
            ))}
          </ScrollableTable>
        </div>
      </div>
    </div>
  );
}
