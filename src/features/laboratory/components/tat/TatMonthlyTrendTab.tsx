'use client';

import { CheckCircle2, Clock, TrendingDown, TrendingUp } from 'lucide-react';

import {
  ScrollableTable,
  TABLE_HEADER_BG,
  TABLE_HEADER_STICKY_CLASS,
} from '@components/shared/ScrollableTable';
import { formatHms, getMonthlyTrend } from '@/features/laboratory/__mocks__/tatReportsFixtures';
import { ReportStatCard } from '@/features/laboratory/components/reports/reportShared';

function MonthlyBarChart({ data }: { data: ReturnType<typeof getMonthlyTrend> }) {
  const max = Math.max(...data.map((d) => d.avgTatSeconds), 1);
  return (
    <div className="mt-4 flex gap-4" style={{ height: 220 }}>
      {data.map((d, i) => {
        const heightPct = Math.max(6, (d.avgTatSeconds / max) * 100);
        const isCurrent = i === data.length - 1;
        return (
          <div key={d.month + i} className="flex h-full flex-1 flex-col items-center gap-2">
            <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
              {formatHms(d.avgTatSeconds).slice(0, 5)}
            </p>
            <div className="flex min-h-0 w-full flex-1 items-end">
              <div
                className="w-full rounded-t-[6px] transition-all duration-300"
                style={{
                  height: `${heightPct}%`,
                  background: isCurrent ? '#00B4D8' : 'rgba(0,180,216,0.35)',
                }}
              />
            </div>
            <p style={{ fontSize: 14, color: '#8A98A3' }}>{d.month}</p>
          </div>
        );
      })}
    </div>
  );
}

export function TatMonthlyTrendTab() {
  const data = getMonthlyTrend();
  const current = data[data.length - 1]!;
  const previous = data[data.length - 2]!;
  const changePct =
    ((current.avgTatSeconds - previous.avgTatSeconds) / previous.avgTatSeconds) * 100;
  const improved = changePct <= 0;
  const best = [...data].sort((a, b) => a.avgTatSeconds - b.avgTatSeconds)[0]!;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ReportStatCard
          icon={Clock}
          iconColor="#00B4D8"
          iconBg="rgba(0,180,216,0.12)"
          label="Current Month Avg TAT"
          value={formatHms(current.avgTatSeconds)}
          info={current.month}
        />
        <ReportStatCard
          icon={improved ? TrendingDown : TrendingUp}
          iconColor={improved ? '#16A34A' : '#DC2626'}
          iconBg={improved ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)'}
          label="Change vs Last Month"
          value={`${improved ? '↓' : '↑'} ${Math.abs(changePct).toFixed(1)}%`}
          info={improved ? 'Faster' : 'Slower'}
          infoColor={improved ? '#16A34A' : '#DC2626'}
        />
        <ReportStatCard
          icon={CheckCircle2}
          iconColor="#7C3AED"
          iconBg="rgba(124,58,237,0.12)"
          label="Current Compliance"
          value={`${current.compliancePct.toFixed(1)}%`}
          info={current.month}
        />
        <ReportStatCard
          icon={Clock}
          iconColor="#0D9488"
          iconBg="rgba(13,148,136,0.12)"
          label="Best Month"
          value={formatHms(best.avgTatSeconds)}
          info={best.month}
          infoColor="#16A34A"
        />
      </div>

      <div
        className="rounded-[12px] p-4"
        style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
      >
        <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
          6-Month Average TAT
        </h2>
        <MonthlyBarChart data={data} />
      </div>

      <div
        className="rounded-[12px] p-4"
        style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
      >
        <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
          Month-by-Month
        </h2>
        <div className="mt-3">
          <ScrollableTable minWidth={720}>
            <div
              className={`flex items-center rounded-t-[8px] ${TABLE_HEADER_STICKY_CLASS}`}
              style={{ background: TABLE_HEADER_BG, borderBottom: '1px solid #E6F8FD' }}
            >
              {[
                ['Month', 'min-w-[120px] flex-1'],
                ['Avg TAT', 'w-32'],
                ['Compliance', 'w-32'],
                ['Change', 'w-32'],
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
            {data.map((d, i) => {
              const prev = i > 0 ? data[i - 1] : null;
              const change = prev
                ? ((d.avgTatSeconds - prev.avgTatSeconds) / prev.avgTatSeconds) * 100
                : null;
              return (
                <div
                  key={d.month + i}
                  className="flex items-center"
                  style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                >
                  <div className="min-w-[120px] flex-1 py-3 pr-2 pl-3 text-center">
                    <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                      {d.month}
                    </p>
                  </div>
                  <div className="w-32 shrink-0 py-3 pr-2 text-center">
                    <p className="whitespace-nowrap" style={{ fontSize: 14, color: '#0D2630' }}>
                      {formatHms(d.avgTatSeconds)}
                    </p>
                  </div>
                  <div className="w-32 shrink-0 py-3 pr-2 text-center">
                    <p style={{ fontSize: 14, color: '#16A34A' }}>{d.compliancePct.toFixed(1)}%</p>
                  </div>
                  <div className="w-32 shrink-0 py-3 pr-2 text-center">
                    <p
                      style={{
                        fontSize: 14,
                        color: change === null ? '#8A98A3' : change <= 0 ? '#16A34A' : '#DC2626',
                      }}
                    >
                      {change === null
                        ? '—'
                        : `${change <= 0 ? '↓' : '↑'} ${Math.abs(change).toFixed(1)}%`}
                    </p>
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
