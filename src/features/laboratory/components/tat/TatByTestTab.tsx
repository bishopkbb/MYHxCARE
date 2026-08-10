'use client';

import { Award, FlaskConical, Timer, Zap } from 'lucide-react';

import {
  ScrollableTable,
  TABLE_HEADER_BG,
  TABLE_HEADER_STICKY_CLASS,
} from '@components/shared/ScrollableTable';
import { Tooltip } from '@components/shared/Tooltip';
import { formatHms, TAT_BY_TEST } from '@/features/laboratory/__mocks__/tatReportsFixtures';
import { ReportStatCard } from '@/features/laboratory/components/reports/reportShared';

export function TatByTestTab() {
  const rows = TAT_BY_TEST;
  const totalTracked = rows.reduce((sum, r) => sum + r.totalTests, 0);
  const fastest = [...rows].sort((a, b) => a.avgTatSeconds - b.avgTatSeconds)[0]!;
  const slowest = [...rows].sort((a, b) => b.avgTatSeconds - a.avgTatSeconds)[0]!;
  const bestCompliance = [...rows].sort((a, b) => b.compliancePct - a.compliancePct)[0]!;
  const maxAvgTat = Math.max(...rows.map((r) => r.avgTatSeconds), 1);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ReportStatCard
          icon={FlaskConical}
          iconColor="#2563EB"
          iconBg="rgba(37,99,235,0.12)"
          label="Tests Tracked"
          value={totalTracked.toLocaleString('en-GB')}
          info="Most-ordered tests"
        />
        <ReportStatCard
          icon={Zap}
          iconColor="#16A34A"
          iconBg="rgba(34,197,94,0.12)"
          label="Fastest Test"
          value={formatHms(fastest.avgTatSeconds)}
          info={fastest.test}
          infoColor="#16A34A"
        />
        <ReportStatCard
          icon={Timer}
          iconColor="#DC2626"
          iconBg="rgba(239,68,68,0.12)"
          label="Slowest Test"
          value={formatHms(slowest.avgTatSeconds)}
          info={slowest.test}
          infoColor="#DC2626"
        />
        <ReportStatCard
          icon={Award}
          iconColor="#7C3AED"
          iconBg="rgba(124,58,237,0.12)"
          label="Best Compliance"
          value={`${bestCompliance.compliancePct.toFixed(1)}%`}
          info={bestCompliance.test}
        />
      </div>

      <div
        className="rounded-[12px] p-4"
        style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
      >
        <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
          Average TAT by Test
        </h2>
        <div className="mt-4 flex flex-col gap-3">
          {[...rows]
            .sort((a, b) => a.avgTatSeconds - b.avgTatSeconds)
            .map((r) => (
              <div key={r.test} className="flex items-center gap-3">
                <Tooltip content={r.test}>
                  <span
                    className="w-48 shrink-0 truncate"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    {r.test}
                  </span>
                </Tooltip>
                <div
                  className="h-2 min-w-0 flex-1 overflow-hidden rounded-full"
                  style={{ background: '#E6F8FD' }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(4, (r.avgTatSeconds / maxAvgTat) * 100)}%`,
                      background: '#00B4D8',
                    }}
                  />
                </div>
                <span
                  className="w-24 shrink-0 text-right font-sans font-medium whitespace-nowrap"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  {formatHms(r.avgTatSeconds)}
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
          TAT by Test
        </h2>
        <div className="mt-3">
          <ScrollableTable minWidth={1000}>
            <div
              className={`flex items-center rounded-t-[8px] ${TABLE_HEADER_STICKY_CLASS}`}
              style={{ background: TABLE_HEADER_BG, borderBottom: '1px solid #E6F8FD' }}
            >
              {[
                ['Test', 'min-w-[190px] flex-1'],
                ['Department', 'w-40'],
                ['Total Tests', 'w-32'],
                ['Avg TAT', 'w-32'],
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
                key={r.test}
                className="flex items-center"
                style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
              >
                <div className="min-w-[190px] flex-1 py-3 pr-2 pl-3 text-center">
                  <Tooltip content={r.test}>
                    <p
                      className="truncate font-sans font-medium"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {r.test}
                    </p>
                  </Tooltip>
                </div>
                <div className="w-40 shrink-0 py-3 pr-2 text-center">
                  <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                    {r.department}
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
                  <p
                    style={{
                      fontSize: 14,
                      color:
                        r.compliancePct >= 90
                          ? '#16A34A'
                          : r.compliancePct >= 80
                            ? '#D97706'
                            : '#DC2626',
                    }}
                  >
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
