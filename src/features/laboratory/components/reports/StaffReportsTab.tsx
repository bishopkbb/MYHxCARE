'use client';

import { CalendarClock, PhoneCall, UserCheck, Users } from 'lucide-react';

import {
  ScrollableTable,
  TABLE_HEADER_BG,
  TABLE_HEADER_STICKY_CLASS,
} from '@components/shared/ScrollableTable';
import { Tooltip } from '@components/shared/Tooltip';
import {
  computeCoverageOverview,
  computeWorkforceStats,
  SHIFT_TYPE_OPTIONS,
  type LaboratoryShift,
} from '@/features/laboratory/__mocks__/laboratoryWorkforceFixtures';
import { useStaffShifts, type StaffShift } from '@/features/workforce/store/staffShiftStore';
import { donutColorFor, ReportDonutCard, ReportStatCard } from './reportShared';

const STATUS_COLOR: Record<string, string> = {
  ON_DUTY: '#16A34A',
  SCHEDULED: '#4A7080',
  ON_CALL: '#7C3AED',
  COMPLETED: '#8A98A3',
  CANCELLED: '#DC2626',
};

// Same seam as LaboratoryWorkforceManagementWorkspace.tsx's own adapter —
// this tab previously read the frozen MOCK_LABORATORY_ROSTER directly, so
// its numbers never moved when a shift was created/cancelled/acknowledged
// on that screen (docs/api-contracts/06-laboratory G-LAB-08).
function toLaboratoryView(s: StaffShift): LaboratoryShift {
  const { homeModule: _homeModule, department: _department, ...rest } = s;
  return rest;
}

export function StaffReportsTab() {
  const roster = useStaffShifts()
    .filter((s) => s.homeModule === 'laboratory')
    .map(toLaboratoryView);
  const workforceStats = computeWorkforceStats(roster);
  const coverageOverview = computeCoverageOverview(roster);

  const shiftTypeCounts = new Map<string, number>();
  for (const shift of roster) {
    shiftTypeCounts.set(shift.shiftType, (shiftTypeCounts.get(shift.shiftType) ?? 0) + 1);
  }
  const shiftTypeBreakdown = SHIFT_TYPE_OPTIONS.map((opt, i) => ({
    label: opt.label,
    value: shiftTypeCounts.get(opt.value) ?? 0,
    color: donutColorFor(i),
  })).filter((d) => d.value > 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ReportStatCard
          icon={UserCheck}
          iconColor="#16A34A"
          iconBg="rgba(34,197,94,0.12)"
          label="On Duty"
          value={workforceStats.onDuty}
          info="Right now"
        />
        <ReportStatCard
          icon={Users}
          iconColor="#2563EB"
          iconBg="rgba(37,99,235,0.12)"
          label="Today's Shifts"
          value={workforceStats.todaysShifts}
          info="Scheduled today"
        />
        <ReportStatCard
          icon={PhoneCall}
          iconColor="#7C3AED"
          iconBg="rgba(124,58,237,0.12)"
          label="On-Call"
          value={workforceStats.onCall}
          info="Available if needed"
        />
        <ReportStatCard
          icon={CalendarClock}
          iconColor="#00B4D8"
          iconBg="rgba(0,180,216,0.12)"
          label="Overall Coverage"
          value={`${workforceStats.coveragePercent}%`}
          info={`${workforceStats.pendingAck} shift${workforceStats.pendingAck !== 1 ? 's' : ''} unacknowledged`}
          infoColor={workforceStats.pendingAck > 0 ? '#D97706' : '#16A34A'}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ReportDonutCard
          title="Shifts by Type"
          breakdown={shiftTypeBreakdown}
          total={roster.length}
        />
        <div
          className="rounded-[12px] p-4"
          style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
        >
          <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
            Coverage Overview
          </h2>
          <div className="mt-3.5 flex flex-col gap-3.5">
            {coverageOverview.map((c) => (
              <div key={c.label}>
                <div className="flex items-center justify-between gap-2">
                  <span style={{ fontSize: 14, color: '#0D2630' }}>{c.label}</span>
                  <span
                    className="font-sans font-medium"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    {c.percent}%
                  </span>
                </div>
                <div
                  className="mt-1.5 h-2 overflow-hidden rounded-full"
                  style={{ background: '#E6F8FD' }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${c.percent}%`, background: c.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        className="rounded-[12px] p-4"
        style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
      >
        <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
          Today&apos;s Roster
        </h2>
        <div className="mt-3">
          <ScrollableTable minWidth={920} maxHeight={480}>
            <div
              className={`flex items-center rounded-t-[8px] ${TABLE_HEADER_STICKY_CLASS}`}
              style={{ background: TABLE_HEADER_BG, borderBottom: '1px solid #E6F8FD' }}
            >
              {[
                ['Staff', 'min-w-[180px] flex-1'],
                ['Role', 'w-48'],
                ['Ward', 'w-36'],
                ['Shift', 'w-40'],
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
            {roster.map((shift) => (
              <div
                key={shift.id}
                className="flex items-center"
                style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
              >
                <div className="flex min-w-[180px] flex-1 items-center justify-center gap-2.5 py-3 pr-2 pl-3 text-center">
                  <div
                    className="flex size-8 shrink-0 items-center justify-center rounded-full font-sans font-semibold text-white"
                    style={{ fontSize: 14, background: shift.avatarBg }}
                  >
                    {shift.initials}
                  </div>
                  <Tooltip content={shift.staffName}>
                    <p
                      className="truncate font-sans font-medium"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {shift.staffName}
                    </p>
                  </Tooltip>
                </div>
                <div className="w-48 shrink-0 py-3 pr-2 text-center">
                  <Tooltip content={shift.role}>
                    <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                      {shift.role}
                    </p>
                  </Tooltip>
                </div>
                <div className="w-36 shrink-0 py-3 pr-2 text-center">
                  <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                    {shift.ward}
                  </p>
                </div>
                <div className="w-40 shrink-0 py-3 pr-2 text-center">
                  <p className="whitespace-nowrap" style={{ fontSize: 14, color: '#4A7080' }}>
                    {shift.timeRange}
                  </p>
                </div>
                <div className="w-32 shrink-0 py-3 pr-2 text-center">
                  <p
                    className="font-sans font-medium"
                    style={{ fontSize: 14, color: STATUS_COLOR[shift.status] ?? '#4A7080' }}
                  >
                    {shift.status.replace('_', ' ')}
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
