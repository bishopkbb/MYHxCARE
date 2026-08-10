'use client';

import { Award, Building2, TrendingUp, Zap } from 'lucide-react';

import {
  ScrollableTable,
  TABLE_HEADER_BG,
  TABLE_HEADER_STICKY_CLASS,
} from '@components/shared/ScrollableTable';
import { Tooltip } from '@components/shared/Tooltip';
import { formatHms, TAT_DEPARTMENT_ROWS } from '@/features/laboratory/__mocks__/tatReportsFixtures';
import { ReportStatCard } from '@/features/laboratory/components/reports/reportShared';

export function TatByDepartmentTab() {
  const rows = TAT_DEPARTMENT_ROWS;

  const highestVolume = [...rows].sort((a, b) => b.totalTests - a.totalTests)[0]!;
  const bestCompliance = [...rows].sort(
    (a, b) => b.withinTarget / b.totalTests - a.withinTarget / a.totalTests,
  )[0]!;
  const fastest = [...rows].sort((a, b) => a.avgTatSeconds - b.avgTatSeconds)[0]!;
  const mostImproved = [...rows].sort((a, b) => b.complianceTrendPct - a.complianceTrendPct)[0]!;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ReportStatCard
          icon={Building2}
          iconColor="#2563EB"
          iconBg="rgba(37,99,235,0.12)"
          label="Highest Volume"
          value={highestVolume.totalTests.toLocaleString('en-GB')}
          info={highestVolume.department}
        />
        <ReportStatCard
          icon={Award}
          iconColor="#16A34A"
          iconBg="rgba(34,197,94,0.12)"
          label="Best Compliance"
          value={`${((bestCompliance.withinTarget / bestCompliance.totalTests) * 100).toFixed(1)}%`}
          info={bestCompliance.department}
          infoColor="#16A34A"
        />
        <ReportStatCard
          icon={Zap}
          iconColor="#7C3AED"
          iconBg="rgba(124,58,237,0.12)"
          label="Fastest Avg TAT"
          value={formatHms(fastest.avgTatSeconds)}
          info={fastest.department}
        />
        <ReportStatCard
          icon={TrendingUp}
          iconColor="#0D9488"
          iconBg="rgba(13,148,136,0.12)"
          label="Most Improved"
          value={`↑ ${mostImproved.complianceTrendPct.toFixed(1)}%`}
          info={mostImproved.department}
          infoColor="#16A34A"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((r) => {
          const rate = (r.withinTarget / r.totalTests) * 100;
          const isUp = r.complianceTrendPct >= 0;
          return (
            <div
              key={r.department}
              className="rounded-[12px] p-4"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <div className="flex items-center justify-between gap-2">
                <Tooltip content={r.department}>
                  <p
                    className="font-display truncate font-semibold"
                    style={{ fontSize: 16, color: '#0D2630' }}
                  >
                    {r.department}
                  </p>
                </Tooltip>
                <span
                  className="shrink-0 font-sans font-medium whitespace-nowrap"
                  style={{ fontSize: 14, color: isUp ? '#16A34A' : '#DC2626' }}
                >
                  {isUp ? '↑' : '↓'} {Math.abs(r.complianceTrendPct).toFixed(1)}%
                </span>
              </div>
              <p className="font-display mt-2 font-bold" style={{ fontSize: 24, color: '#0D2630' }}>
                {formatHms(r.avgTatSeconds)}
              </p>
              <p style={{ fontSize: 14, color: '#8A98A3' }}>
                Avg TAT · {r.totalTests.toLocaleString('en-GB')} tests
              </p>
              <div
                className="mt-3 h-2 overflow-hidden rounded-full"
                style={{ background: '#E6F8FD' }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${rate}%`,
                    background: rate >= 90 ? '#16A34A' : rate >= 80 ? '#D97706' : '#DC2626',
                  }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span style={{ fontSize: 14, color: '#4A7080' }}>{rate.toFixed(1)}% compliant</span>
                <span style={{ fontSize: 14, color: '#DC2626' }}>
                  {r.delayed.toLocaleString('en-GB')} delayed
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div
        className="rounded-[12px] p-4"
        style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
      >
        <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
          Full Department Breakdown
        </h2>
        <div className="mt-3">
          <ScrollableTable minWidth={1000}>
            <div
              className={`flex items-center rounded-t-[8px] ${TABLE_HEADER_STICKY_CLASS}`}
              style={{ background: TABLE_HEADER_BG, borderBottom: '1px solid #E6F8FD' }}
            >
              {[
                ['Department', 'min-w-[160px] flex-1'],
                ['Total Tests', 'w-32'],
                ['Avg TAT', 'w-32'],
                ['Within Target', 'w-36'],
                ['Delayed', 'w-28'],
                ['Longest TAT', 'w-32'],
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
                      style={{ fontSize: 14, color: '#00B4D8' }}
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
                <div className="w-32 shrink-0 py-3 pr-2 text-center">
                  <p className="whitespace-nowrap" style={{ fontSize: 14, color: '#0D2630' }}>
                    {formatHms(r.avgTatSeconds)}
                  </p>
                </div>
                <div className="w-36 shrink-0 py-3 pr-2 text-center">
                  <p style={{ fontSize: 14, color: '#16A34A' }}>
                    {r.withinTarget.toLocaleString('en-GB')}
                  </p>
                </div>
                <div className="w-28 shrink-0 py-3 pr-2 text-center">
                  <p style={{ fontSize: 14, color: '#DC2626' }}>
                    {r.delayed.toLocaleString('en-GB')}
                  </p>
                </div>
                <div className="w-32 shrink-0 py-3 pr-2 text-center">
                  <p className="whitespace-nowrap" style={{ fontSize: 14, color: '#4A7080' }}>
                    {formatHms(r.longestTatSeconds)}
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
