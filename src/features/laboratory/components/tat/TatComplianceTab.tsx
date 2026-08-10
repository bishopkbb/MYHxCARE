'use client';

import { Award, CheckCircle2, ShieldAlert, TriangleAlert } from 'lucide-react';

import { Tooltip } from '@components/shared/Tooltip';
import {
  sumTatField,
  TAT_DEPARTMENT_ROWS,
  TAT_TARGETS,
} from '@/features/laboratory/__mocks__/tatReportsFixtures';
import { ReportStatCard } from '@/features/laboratory/components/reports/reportShared';

export function TatComplianceTab() {
  const rows = TAT_DEPARTMENT_ROWS;
  const totalTests = sumTatField('totalTests');
  const withinTarget = sumTatField('withinTarget');
  const compliancePct = (withinTarget / totalTests) * 100;

  const best = [...rows].sort(
    (a, b) => b.withinTarget / b.totalTests - a.withinTarget / a.totalTests,
  )[0]!;
  const worst = [...rows].sort(
    (a, b) => a.withinTarget / a.totalTests - b.withinTarget / b.totalTests,
  )[0]!;
  const slaMet = TAT_TARGETS.filter((t) => t.compliancePct >= 92).length;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ReportStatCard
          icon={CheckCircle2}
          iconColor="#16A34A"
          iconBg="rgba(34,197,94,0.12)"
          label="Overall Compliance"
          value={`${compliancePct.toFixed(1)}%`}
          info={`${withinTarget.toLocaleString('en-GB')} within target`}
          infoColor="#16A34A"
        />
        <ReportStatCard
          icon={Award}
          iconColor="#2563EB"
          iconBg="rgba(37,99,235,0.12)"
          label="Best Department"
          value={`${((best.withinTarget / best.totalTests) * 100).toFixed(1)}%`}
          info={best.department}
        />
        <ReportStatCard
          icon={TriangleAlert}
          iconColor="#DC2626"
          iconBg="rgba(239,68,68,0.12)"
          label="Needs Attention"
          value={`${((worst.withinTarget / worst.totalTests) * 100).toFixed(1)}%`}
          info={worst.department}
          infoColor="#DC2626"
        />
        <ReportStatCard
          icon={ShieldAlert}
          iconColor="#D97706"
          iconBg="rgba(245,158,11,0.12)"
          label="SLA Targets Met"
          value={`${slaMet}/${TAT_TARGETS.length}`}
          info="≥ 92% compliance"
        />
      </div>

      <div
        className="rounded-[12px] p-4"
        style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
      >
        <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
          Compliance by Department
        </h2>
        <div className="mt-4 flex flex-col gap-3">
          {[...rows]
            .sort((a, b) => b.withinTarget / b.totalTests - a.withinTarget / a.totalTests)
            .map((r) => {
              const rate = (r.withinTarget / r.totalTests) * 100;
              return (
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
                        width: `${rate}%`,
                        background: rate >= 90 ? '#16A34A' : rate >= 80 ? '#D97706' : '#DC2626',
                      }}
                    />
                  </div>
                  <span
                    className="w-16 shrink-0 text-right font-sans font-medium"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    {rate.toFixed(1)}%
                  </span>
                </div>
              );
            })}
        </div>
      </div>

      <div
        className="rounded-[12px] p-4"
        style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
      >
        <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
          Compliance by SLA Priority
        </h2>
        <div className="mt-4 flex flex-col gap-3">
          {TAT_TARGETS.map((t) => (
            <div key={t.priority} className="flex items-center gap-3">
              <span className="w-40 shrink-0" style={{ fontSize: 14, color: '#0D2630' }}>
                {t.priority} <span style={{ color: '#8A98A3' }}>(≤ {t.targetMinutes}m)</span>
              </span>
              <div
                className="h-2 min-w-0 flex-1 overflow-hidden rounded-full"
                style={{ background: '#E6F8FD' }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${t.compliancePct}%`,
                    background: t.compliancePct >= 92 ? '#16A34A' : '#D97706',
                  }}
                />
              </div>
              <span
                className="w-16 shrink-0 text-right font-sans font-medium"
                style={{ fontSize: 14, color: '#0D2630' }}
              >
                {t.compliancePct.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
