'use client';

import { AlertTriangle, Building2, PhoneCall, Radio } from 'lucide-react';

import {
  ScrollableTable,
  TABLE_HEADER_BG,
  TABLE_HEADER_STICKY_CLASS,
} from '@components/shared/ScrollableTable';
import { Tooltip } from '@components/shared/Tooltip';
import { formatDateTime } from '@/utils/datetime';
import {
  getDepartmentRows,
  sumField,
  type ReportPeriod,
} from '@/features/laboratory/__mocks__/laboratoryReportsFixtures';
import { useLabResults } from '@/features/laboratory/store/labResultStore';
import { donutColorFor, ReportDonutCard, ReportStatCard } from './reportShared';

export function CriticalResultsReportTab({ period }: { period: ReportPeriod }) {
  const rows = getDepartmentRows(period);
  const allResults = useLabResults();

  const criticalResults = sumField(rows, 'criticalResults');
  const totalTests = sumField(rows, 'totalTests');
  const criticalRate = totalTests > 0 ? (criticalResults / totalTests) * 100 : 0;
  const worstDept = [...rows].sort((a, b) => b.criticalResults - a.criticalResults)[0];

  const liveCritical = allResults.filter((r) => r.flag === 'CRITICAL');
  const liveUncommunicated = liveCritical.filter((r) => !r.criticalCommunicatedAt);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ReportStatCard
          icon={AlertTriangle}
          iconColor="#DC2626"
          iconBg="rgba(239,68,68,0.12)"
          label="Critical Results"
          value={criticalResults.toLocaleString('en-GB')}
          info={period}
        />
        <ReportStatCard
          icon={Radio}
          iconColor="#7C3AED"
          iconBg="rgba(124,58,237,0.12)"
          label="Critical Rate"
          value={`${criticalRate.toFixed(2)}%`}
          info="Of total tests"
        />
        <ReportStatCard
          icon={Building2}
          iconColor="#2563EB"
          iconBg="rgba(37,99,235,0.12)"
          label="Most Affected Dept."
          value={worstDept ? worstDept.criticalResults.toLocaleString('en-GB') : '—'}
          info={worstDept?.department ?? '—'}
        />
        <ReportStatCard
          icon={PhoneCall}
          iconColor={liveUncommunicated.length > 0 ? '#D97706' : '#16A34A'}
          iconBg={liveUncommunicated.length > 0 ? 'rgba(245,158,11,0.12)' : 'rgba(34,197,94,0.12)'}
          label="Awaiting Communication"
          value={liveUncommunicated.length}
          info="Right now"
          infoColor={liveUncommunicated.length > 0 ? '#D97706' : '#16A34A'}
        />
      </div>

      <ReportDonutCard
        title="Critical Results by Department"
        breakdown={rows
          .filter((r) => r.criticalResults > 0)
          .map((r, i) => ({
            label: r.department,
            value: r.criticalResults,
            color: donutColorFor(i),
          }))}
        total={criticalResults}
      />

      <div
        className="rounded-[12px] p-4"
        style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
            Live Critical Queue
          </h2>
          <span style={{ fontSize: 14, color: '#8A98A3' }}>
            {liveCritical.length} flagged right now — not the {period.toLowerCase()} total above
          </span>
        </div>
        {liveCritical.length === 0 ? (
          <p className="mt-3" style={{ fontSize: 14, color: '#8A98A3' }}>
            No critical results are currently open.
          </p>
        ) : (
          <div className="mt-3">
            <ScrollableTable minWidth={900}>
              <div
                className={`flex items-center rounded-t-[8px] ${TABLE_HEADER_STICKY_CLASS}`}
                style={{ background: TABLE_HEADER_BG, borderBottom: '1px solid #E6F8FD' }}
              >
                {[
                  ['Patient', 'min-w-[160px] flex-1'],
                  ['Test', 'w-40'],
                  ['Department', 'w-36'],
                  ['Critical Value', 'w-40'],
                  ['Status', 'w-40'],
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
              {liveCritical.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center"
                  style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                >
                  <div className="min-w-[160px] flex-1 py-3 pr-2 pl-3 text-center">
                    <Tooltip content={r.patientName}>
                      <p
                        className="truncate font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {r.patientName}
                      </p>
                    </Tooltip>
                  </div>
                  <div className="w-40 shrink-0 py-3 pr-2 text-center">
                    <Tooltip content={r.testName}>
                      <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                        {r.testName}
                      </p>
                    </Tooltip>
                  </div>
                  <div className="w-36 shrink-0 py-3 pr-2 text-center">
                    <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                      {r.department}
                    </p>
                  </div>
                  <div className="w-40 shrink-0 py-3 pr-2 text-center">
                    <Tooltip content={r.criticalValueLabel ?? '—'}>
                      <p
                        className="truncate font-sans font-medium"
                        style={{ fontSize: 14, color: '#DC2626' }}
                      >
                        {r.criticalValueLabel ?? '—'}
                      </p>
                    </Tooltip>
                  </div>
                  <div className="w-40 shrink-0 py-3 pr-2 text-center">
                    {r.criticalCommunicatedAt ? (
                      <p style={{ fontSize: 14, color: '#16A34A' }}>
                        Communicated {formatDateTime(r.criticalCommunicatedAt)}
                      </p>
                    ) : (
                      <p style={{ fontSize: 14, color: '#D97706' }}>Awaiting communication</p>
                    )}
                  </div>
                </div>
              ))}
            </ScrollableTable>
          </div>
        )}
      </div>
    </div>
  );
}
