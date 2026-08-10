'use client';

import { CheckCircle2, Clock, Timer } from 'lucide-react';

import {
  ScrollableTable,
  TABLE_HEADER_BG,
  TABLE_HEADER_STICKY_CLASS,
} from '@components/shared/ScrollableTable';
import { formatHms, TAT_BY_PRIORITY } from '@/features/laboratory/__mocks__/tatReportsFixtures';
import {
  donutColorFor,
  ReportDonutCard,
} from '@/features/laboratory/components/reports/reportShared';

const PRIORITY_ICON = { STAT: Clock, Routine: CheckCircle2, Low: Timer } as const;
const PRIORITY_COLOR = { STAT: '#DC2626', Routine: '#00B4D8', Low: '#7C3AED' } as const;

export function TatPriorityTab() {
  const rows = TAT_BY_PRIORITY;
  const totalTests = rows.reduce((sum, r) => sum + r.totalTests, 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {rows.map((r) => {
          const Icon = PRIORITY_ICON[r.priority];
          const color = PRIORITY_COLOR[r.priority];
          const withinTarget = r.avgTatSeconds <= r.targetMinutes * 60;
          return (
            <div
              key={r.priority}
              className="rounded-[12px] p-4"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="flex size-9 shrink-0 items-center justify-center rounded-[10px]"
                  style={{ background: `${color}1F` }}
                >
                  <Icon style={{ width: 18, height: 18, color }} />
                </div>
                <p
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  {r.priority}
                </p>
              </div>
              <p className="font-display mt-3 font-bold" style={{ fontSize: 26, color: '#0D2630' }}>
                {r.totalTests.toLocaleString('en-GB')}
              </p>
              <p style={{ fontSize: 14, color: '#8A98A3' }}>
                tests · {((r.totalTests / totalTests) * 100).toFixed(1)}% of volume
              </p>
              <div
                className="mt-3 flex items-center justify-between gap-2 rounded-[10px] p-3"
                style={{ background: '#F5FBFD' }}
              >
                <div>
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>Avg TAT</p>
                  <p
                    className="font-sans font-semibold"
                    style={{ fontSize: 16, color: withinTarget ? '#16A34A' : '#DC2626' }}
                  >
                    {formatHms(r.avgTatSeconds)}
                  </p>
                </div>
                <div className="text-right">
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>Target</p>
                  <p className="font-sans font-medium" style={{ fontSize: 14, color: '#4A7080' }}>
                    ≤ {r.targetMinutes} mins
                  </p>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span style={{ fontSize: 14, color: '#4A7080' }}>Compliance</span>
                <span
                  className="font-sans font-medium"
                  style={{ fontSize: 14, color: r.compliancePct >= 92 ? '#16A34A' : '#D97706' }}
                >
                  {r.compliancePct.toFixed(1)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <ReportDonutCard
        title="Test Volume by Priority"
        breakdown={rows.map((r, i) => ({
          label: r.priority,
          value: r.totalTests,
          color: donutColorFor(i),
        }))}
        total={totalTests}
      />

      <div
        className="rounded-[12px] p-4"
        style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
      >
        <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
          Priority Breakdown
        </h2>
        <div className="mt-3">
          <ScrollableTable minWidth={900}>
            <div
              className={`flex items-center rounded-t-[8px] ${TABLE_HEADER_STICKY_CLASS}`}
              style={{ background: TABLE_HEADER_BG, borderBottom: '1px solid #E6F8FD' }}
            >
              {[
                ['Priority', 'min-w-[140px] flex-1'],
                ['Total Tests', 'w-32'],
                ['Avg TAT', 'w-32'],
                ['Target TAT', 'w-32'],
                ['Compliance', 'w-32'],
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
                key={r.priority}
                className="flex items-center"
                style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
              >
                <div className="min-w-[140px] flex-1 py-3 pr-2 pl-3 text-center">
                  <p
                    className="font-sans font-medium"
                    style={{ fontSize: 14, color: PRIORITY_COLOR[r.priority] }}
                  >
                    {r.priority}
                  </p>
                </div>
                <div className="w-32 shrink-0 py-3 pr-2 text-center">
                  <p style={{ fontSize: 14, color: '#0D2630' }}>
                    {r.totalTests.toLocaleString('en-GB')}
                  </p>
                </div>
                <div className="w-32 shrink-0 py-3 pr-2 text-center">
                  <p className="whitespace-nowrap" style={{ fontSize: 14, color: '#0D2630' }}>
                    {formatHms(r.avgTatSeconds)}
                  </p>
                </div>
                <div className="w-32 shrink-0 py-3 pr-2 text-center">
                  <p style={{ fontSize: 14, color: '#4A7080' }}>≤ {r.targetMinutes} mins</p>
                </div>
                <div className="w-32 shrink-0 py-3 pr-2 text-center">
                  <p style={{ fontSize: 14, color: r.compliancePct >= 92 ? '#16A34A' : '#D97706' }}>
                    {r.compliancePct.toFixed(1)}%
                  </p>
                </div>
              </div>
            ))}
          </ScrollableTable>
        </div>
      </div>
    </div>
  );
}
