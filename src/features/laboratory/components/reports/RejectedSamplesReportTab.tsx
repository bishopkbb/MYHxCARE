'use client';

import { Building2, Percent, TriangleAlert, XCircle } from 'lucide-react';

import {
  ScrollableTable,
  TABLE_HEADER_BG,
  TABLE_HEADER_STICKY_CLASS,
} from '@components/shared/ScrollableTable';
import { Tooltip } from '@components/shared/Tooltip';
import {
  getDepartmentRows,
  getRejectionReasonBreakdown,
  sumField,
  type ReportPeriod,
} from '@/features/laboratory/__mocks__/laboratoryReportsFixtures';
import { donutColorFor, ReportDonutCard, ReportStatCard } from './reportShared';

export function RejectedSamplesReportTab({ period }: { period: ReportPeriod }) {
  const rows = getDepartmentRows(period);
  const reasons = getRejectionReasonBreakdown(period);

  const samplesReceived = sumField(rows, 'samplesReceived');
  const rejectedSamples = sumField(rows, 'rejectedSamples');
  const rejectionRate = samplesReceived > 0 ? (rejectedSamples / samplesReceived) * 100 : 0;
  const topReason = [...reasons].sort((a, b) => b.count - a.count)[0];
  const worstDept = [...rows].sort((a, b) => b.rejectedSamples - a.rejectedSamples)[0];

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ReportStatCard
          icon={XCircle}
          iconColor="#DC2626"
          iconBg="rgba(239,68,68,0.12)"
          label="Total Rejected"
          value={rejectedSamples.toLocaleString('en-GB')}
          info={period}
        />
        <ReportStatCard
          icon={Percent}
          iconColor="#D97706"
          iconBg="rgba(245,158,11,0.12)"
          label="Rejection Rate"
          value={`${rejectionRate.toFixed(1)}%`}
          info="Of samples received"
        />
        <ReportStatCard
          icon={TriangleAlert}
          iconColor="#7C3AED"
          iconBg="rgba(124,58,237,0.12)"
          label="Top Reason"
          value={topReason ? topReason.count.toLocaleString('en-GB') : '—'}
          info={topReason?.reason ?? '—'}
        />
        <ReportStatCard
          icon={Building2}
          iconColor="#2563EB"
          iconBg="rgba(37,99,235,0.12)"
          label="Most Affected Dept."
          value={worstDept ? worstDept.rejectedSamples.toLocaleString('en-GB') : '—'}
          info={worstDept?.department ?? '—'}
        />
      </div>

      <ReportDonutCard
        title="Rejection Reasons"
        breakdown={reasons.map((r, i) => ({
          label: r.reason,
          value: r.count,
          color: donutColorFor(i),
        }))}
        total={rejectedSamples}
        footnote="A rejected sample is recollected — this breakdown drives which pre-analytical step needs retraining."
      />

      <div
        className="rounded-[12px] p-4"
        style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
      >
        <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
          Rejected Samples by Department{' '}
          <span style={{ color: '#8A98A3', fontWeight: 400 }}>({period})</span>
        </h2>
        <div className="mt-3">
          <ScrollableTable minWidth={800}>
            <div
              className={`flex items-center rounded-t-[8px] ${TABLE_HEADER_STICKY_CLASS}`}
              style={{ background: TABLE_HEADER_BG, borderBottom: '1px solid #E6F8FD' }}
            >
              {[
                ['Department', 'min-w-[160px] flex-1'],
                ['Samples Received', 'w-52'],
                ['Rejected', 'w-32'],
                ['Rejection Rate', 'w-44'],
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
            {[...rows]
              .sort((a, b) => b.rejectedSamples - a.rejectedSamples)
              .map((r) => {
                const rate =
                  r.samplesReceived > 0 ? (r.rejectedSamples / r.samplesReceived) * 100 : 0;
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
                    <div className="w-52 shrink-0 py-3 pr-2 text-center">
                      <p style={{ fontSize: 14, color: '#0D2630' }}>
                        {r.samplesReceived.toLocaleString('en-GB')}
                      </p>
                    </div>
                    <div className="w-32 shrink-0 py-3 pr-2 text-center">
                      <p style={{ fontSize: 14, color: '#DC2626' }}>
                        {r.rejectedSamples.toLocaleString('en-GB')}
                      </p>
                    </div>
                    <div className="w-44 shrink-0 py-3 pr-2 text-center">
                      <p style={{ fontSize: 14, color: '#4A7080' }}>{rate.toFixed(1)}%</p>
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
