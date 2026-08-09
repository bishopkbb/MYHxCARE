'use client';

import { ArrowRight, CheckCircle2, ClipboardList, ShieldAlert, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { ROUTES } from '@/constants/routes';
import { useCorrectiveActions, useQcRuns } from '@/features/laboratory/store/qcStore';
import { FOCUS_RING, ReportStatCard } from './reportShared';

export function QualityControlPreviewTab() {
  const router = useRouter();
  const runs = useQcRuns();
  const correctiveActions = useCorrectiveActions();

  const concluded = runs.filter((r) => r.status !== 'In Progress');
  const passed = runs.filter((r) => r.status === 'Passed').length;
  const failed = runs.filter((r) => r.status === 'Failed').length;
  const passRate = concluded.length > 0 ? Math.round((passed / concluded.length) * 100) : 0;
  const openActions = correctiveActions.filter((a) => a.status !== 'Resolved').length;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ReportStatCard
          icon={ClipboardList}
          iconColor="#8B5CF6"
          iconBg="rgba(139,92,246,0.12)"
          label="Total QC Runs"
          value={runs.length}
          info="All time"
        />
        <ReportStatCard
          icon={CheckCircle2}
          iconColor="#16A34A"
          iconBg="rgba(34,197,94,0.12)"
          label="Pass Rate"
          value={`${passRate}%`}
          info={`${passed} passed`}
          infoColor="#16A34A"
        />
        <ReportStatCard
          icon={XCircle}
          iconColor="#DC2626"
          iconBg="rgba(239,68,68,0.12)"
          label="Failed Runs"
          value={failed}
          info="All time"
        />
        <ReportStatCard
          icon={ShieldAlert}
          iconColor="#D97706"
          iconBg="rgba(245,158,11,0.12)"
          label="Open Corrective Actions"
          value={openActions}
          info={openActions > 0 ? 'Needs follow-up' : 'All clear'}
          infoColor={openActions > 0 ? '#D97706' : '#16A34A'}
        />
      </div>

      <div
        className="flex flex-col items-start gap-3 rounded-[12px] p-5 sm:flex-row sm:items-center sm:justify-between"
        style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
      >
        <div>
          <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
            Full Quality Control Report
          </h2>
          <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080', maxWidth: 520 }}>
            Pass rate trend, Westgard rule violations, and per-instrument performance — Quality
            Control already has its own dedicated report, kept live here rather than duplicated.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push(ROUTES.laboratoryQcReports)}
          className={`flex h-11 shrink-0 items-center gap-1.5 rounded-[10px] px-4 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
          style={{ fontSize: 14, background: '#00B4D8' }}
        >
          View Full Quality Control Report
          <ArrowRight style={{ width: 15, height: 15 }} />
        </button>
      </div>
    </div>
  );
}
