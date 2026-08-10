'use client';

import { AlertTriangle, Building2, Clock, TriangleAlert } from 'lucide-react';

import {
  ScrollableTable,
  TABLE_HEADER_BG,
  TABLE_HEADER_STICKY_CLASS,
} from '@components/shared/ScrollableTable';
import { Tooltip } from '@components/shared/Tooltip';
import { formatDateTime } from '@/utils/datetime';
import {
  DELAY_REASONS,
  getDelayedExamples,
  sumTatField,
  TAT_DEPARTMENT_ROWS,
} from '@/features/laboratory/__mocks__/tatReportsFixtures';
import {
  donutColorFor,
  ReportDonutCard,
  ReportStatCard,
} from '@/features/laboratory/components/reports/reportShared';

export function TatDelayedResultsTab() {
  const totalDelayed = sumTatField('delayed');
  const topReason = [...DELAY_REASONS].sort((a, b) => b.count - a.count)[0]!;
  const worstDept = [...TAT_DEPARTMENT_ROWS].sort((a, b) => b.delayed - a.delayed)[0]!;
  const examples = getDelayedExamples();
  const avgOverageMinutes = Math.round(
    examples.reduce((sum, e) => sum + (e.elapsedMinutes - e.targetMinutes), 0) /
      Math.max(1, examples.length),
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ReportStatCard
          icon={AlertTriangle}
          iconColor="#DC2626"
          iconBg="rgba(239,68,68,0.12)"
          label="Total Delayed"
          value={totalDelayed.toLocaleString('en-GB')}
          info="This Month"
          infoColor="#DC2626"
        />
        <ReportStatCard
          icon={TriangleAlert}
          iconColor="#D97706"
          iconBg="rgba(245,158,11,0.12)"
          label="Top Reason"
          value={topReason.count.toLocaleString('en-GB')}
          info={topReason.reason}
        />
        <ReportStatCard
          icon={Building2}
          iconColor="#2563EB"
          iconBg="rgba(37,99,235,0.12)"
          label="Most Affected Dept."
          value={worstDept.delayed.toLocaleString('en-GB')}
          info={worstDept.department}
        />
        <ReportStatCard
          icon={Clock}
          iconColor="#7C3AED"
          iconBg="rgba(124,58,237,0.12)"
          label="Avg Overage"
          value={`+${avgOverageMinutes} mins`}
          info="Past target, sampled"
        />
      </div>

      <ReportDonutCard
        title="Delay Reasons"
        breakdown={DELAY_REASONS.map((r, i) => ({
          label: r.reason,
          value: r.count,
          color: donutColorFor(i),
        }))}
        total={totalDelayed}
        footnote="Reason mix drives which pre-analytical or capacity issue needs attention first."
      />

      <div
        className="rounded-[12px] p-4"
        style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
            Currently Delayed
          </h2>
          <span style={{ fontSize: 14, color: '#8A98A3' }}>
            {examples.length} shown — a sample, not the full {totalDelayed.toLocaleString('en-GB')}
          </span>
        </div>
        <div className="mt-3">
          <ScrollableTable minWidth={1100}>
            <div
              className={`flex items-center rounded-t-[8px] ${TABLE_HEADER_STICKY_CLASS}`}
              style={{ background: TABLE_HEADER_BG, borderBottom: '1px solid #E6F8FD' }}
            >
              {[
                ['Test', 'min-w-[180px] flex-1'],
                ['Department', 'w-40'],
                ['Priority', 'w-28'],
                ['Ordered At', 'w-44'],
                ['Target', 'w-28'],
                ['Elapsed', 'w-28'],
                ['Reason', 'w-52'],
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
            {examples.map((e) => (
              <div
                key={e.id}
                className="flex items-center"
                style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
              >
                <div className="min-w-[180px] flex-1 py-3 pr-2 pl-3 text-center">
                  <Tooltip content={e.test}>
                    <p
                      className="truncate font-sans font-medium"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {e.test}
                    </p>
                  </Tooltip>
                </div>
                <div className="w-40 shrink-0 py-3 pr-2 text-center">
                  <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                    {e.department}
                  </p>
                </div>
                <div className="w-28 shrink-0 py-3 pr-2 text-center">
                  <span
                    className="inline-block rounded-full px-2 py-0.5 font-sans font-medium whitespace-nowrap"
                    style={{
                      fontSize: 14,
                      color:
                        e.priority === 'STAT'
                          ? '#DC2626'
                          : e.priority === 'Routine'
                            ? '#00B4D8'
                            : '#7C3AED',
                      background:
                        e.priority === 'STAT'
                          ? 'rgba(239,68,68,0.08)'
                          : e.priority === 'Routine'
                            ? 'rgba(0,180,216,0.08)'
                            : 'rgba(124,58,237,0.08)',
                    }}
                  >
                    {e.priority}
                  </span>
                </div>
                <div className="w-44 shrink-0 py-3 pr-2 text-center">
                  <p className="whitespace-nowrap" style={{ fontSize: 14, color: '#4A7080' }}>
                    {formatDateTime(e.orderedAt)}
                  </p>
                </div>
                <div className="w-28 shrink-0 py-3 pr-2 text-center">
                  <p style={{ fontSize: 14, color: '#4A7080' }}>{e.targetMinutes}m</p>
                </div>
                <div className="w-28 shrink-0 py-3 pr-2 text-center">
                  <p style={{ fontSize: 14, color: '#DC2626' }}>{e.elapsedMinutes}m</p>
                </div>
                <div className="w-52 shrink-0 py-3 pr-2 text-center">
                  <Tooltip content={e.reason}>
                    <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                      {e.reason}
                    </p>
                  </Tooltip>
                </div>
              </div>
            ))}
          </ScrollableTable>
        </div>
      </div>
    </div>
  );
}
