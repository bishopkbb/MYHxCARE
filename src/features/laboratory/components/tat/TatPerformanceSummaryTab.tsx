'use client';

import { Award, CheckCircle2, Target, TrendingUp, TriangleAlert } from 'lucide-react';

import {
  ScrollableTable,
  TABLE_HEADER_BG,
  TABLE_HEADER_STICKY_CLASS,
} from '@components/shared/ScrollableTable';
import { Tooltip } from '@components/shared/Tooltip';
import {
  formatHms,
  overallAvgTatSeconds,
  sumTatField,
  TAT_DEPARTMENT_ROWS,
  TAT_TARGETS,
} from '@/features/laboratory/__mocks__/tatReportsFixtures';
import { ReportStatCard } from '@/features/laboratory/components/reports/reportShared';

export function TatPerformanceSummaryTab() {
  const rows = TAT_DEPARTMENT_ROWS;
  const totalTests = sumTatField('totalTests');
  const withinTarget = sumTatField('withinTarget');
  const compliancePct = (withinTarget / totalTests) * 100;
  const avgTat = overallAvgTatSeconds();

  const best = [...rows].sort(
    (a, b) => b.withinTarget / b.totalTests - a.withinTarget / a.totalTests,
  )[0]!;
  const worst = [...rows].sort(
    (a, b) => a.withinTarget / a.totalTests - b.withinTarget / b.totalTests,
  )[0]!;
  const mostImproved = [...rows].sort((a, b) => b.complianceTrendPct - a.complianceTrendPct)[0]!;
  const slaMet = TAT_TARGETS.filter((t) => t.compliancePct >= 92).length;

  const overallGrade =
    compliancePct >= 95
      ? 'Excellent'
      : compliancePct >= 90
        ? 'Good'
        : compliancePct >= 80
          ? 'Needs Improvement'
          : 'At Risk';
  const gradeColor =
    compliancePct >= 95
      ? '#16A34A'
      : compliancePct >= 90
        ? '#00B4D8'
        : compliancePct >= 80
          ? '#D97706'
          : '#DC2626';

  return (
    <div className="flex flex-col gap-5">
      <div
        className="flex flex-col items-start gap-3 rounded-[12px] p-5 sm:flex-row sm:items-center sm:justify-between"
        style={{ background: `${gradeColor}0F`, border: `1px solid ${gradeColor}59` }}
      >
        <div>
          <p style={{ fontSize: 14, color: '#4A7080' }}>Overall Turnaround Time Performance</p>
          <p className="font-display mt-0.5 font-bold" style={{ fontSize: 26, color: gradeColor }}>
            {overallGrade}
          </p>
        </div>
        <div className="text-left sm:text-right">
          <p style={{ fontSize: 14, color: '#4A7080' }}>Compliance</p>
          <p className="font-display font-bold" style={{ fontSize: 22, color: '#0D2630' }}>
            {compliancePct.toFixed(1)}%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ReportStatCard
          icon={CheckCircle2}
          iconColor="#16A34A"
          iconBg="rgba(34,197,94,0.12)"
          label="Total Tests"
          value={totalTests.toLocaleString('en-GB')}
          info="This Month"
        />
        <ReportStatCard
          icon={Target}
          iconColor="#00B4D8"
          iconBg="rgba(0,180,216,0.12)"
          label="Overall Avg TAT"
          value={formatHms(avgTat)}
          info="This Month"
        />
        <ReportStatCard
          icon={Award}
          iconColor="#7C3AED"
          iconBg="rgba(124,58,237,0.12)"
          label="SLA Targets Met"
          value={`${slaMet}/${TAT_TARGETS.length}`}
          info="≥ 92% compliance"
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div
          className="rounded-[12px] p-4"
          style={{ background: '#FFFFFF', border: '1px solid rgba(34,197,94,0.25)' }}
        >
          <div className="flex items-center gap-2">
            <Award style={{ width: 18, height: 18, color: '#16A34A' }} />
            <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
              Top Performer
            </p>
          </div>
          <p className="font-display mt-2 font-bold" style={{ fontSize: 22, color: '#0D2630' }}>
            {best.department}
          </p>
          <p style={{ fontSize: 14, color: '#4A7080' }}>
            {((best.withinTarget / best.totalTests) * 100).toFixed(1)}% compliance ·{' '}
            {formatHms(best.avgTatSeconds)} avg TAT
          </p>
        </div>
        <div
          className="rounded-[12px] p-4"
          style={{ background: '#FFFFFF', border: '1px solid rgba(239,68,68,0.25)' }}
        >
          <div className="flex items-center gap-2">
            <TriangleAlert style={{ width: 18, height: 18, color: '#DC2626' }} />
            <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
              Needs Attention
            </p>
          </div>
          <p className="font-display mt-2 font-bold" style={{ fontSize: 22, color: '#0D2630' }}>
            {worst.department}
          </p>
          <p style={{ fontSize: 14, color: '#4A7080' }}>
            {((worst.withinTarget / worst.totalTests) * 100).toFixed(1)}% compliance ·{' '}
            {worst.delayed.toLocaleString('en-GB')} delayed results
          </p>
        </div>
      </div>

      <div
        className="rounded-[12px] p-4"
        style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
      >
        <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
          Department Summary
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
                ['Compliance', 'w-32'],
                ['Trend', 'w-32'],
                ['Status', 'w-32'],
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
              const rate = (r.withinTarget / r.totalTests) * 100;
              const isUp = r.complianceTrendPct >= 0;
              const status = rate >= 90 ? 'On Track' : rate >= 80 ? 'Watch' : 'At Risk';
              const statusColor = rate >= 90 ? '#16A34A' : rate >= 80 ? '#D97706' : '#DC2626';
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
                  <div className="w-32 shrink-0 py-3 pr-2 text-center">
                    <p className="whitespace-nowrap" style={{ fontSize: 14, color: '#0D2630' }}>
                      {formatHms(r.avgTatSeconds)}
                    </p>
                  </div>
                  <div className="w-32 shrink-0 py-3 pr-2 text-center">
                    <p style={{ fontSize: 14, color: '#16A34A' }}>{rate.toFixed(1)}%</p>
                  </div>
                  <div className="w-32 shrink-0 py-3 pr-2 text-center">
                    <p style={{ fontSize: 14, color: isUp ? '#16A34A' : '#DC2626' }}>
                      {isUp ? '↑' : '↓'} {Math.abs(r.complianceTrendPct).toFixed(1)}%
                    </p>
                  </div>
                  <div className="w-32 shrink-0 py-3 pr-2 text-center">
                    <span
                      className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium whitespace-nowrap"
                      style={{ fontSize: 14, color: statusColor, background: `${statusColor}1A` }}
                    >
                      {status}
                    </span>
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
