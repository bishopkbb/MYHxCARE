'use client';

import {
  Activity,
  AlertTriangle,
  Bell,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  FileBarChart,
  Filter,
  History,
  Megaphone,
  Settings as SettingsIcon,
  Tag,
  UserPlus,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { FilterDropdown, type FilterDef } from '@components/shared/FilterDropdown';
import { FormDateInput } from '@components/shared/FormDateInput';
import { StatCard } from '@components/shared/StatCard';
import { Tooltip } from '@components/shared/Tooltip';
import { VitalTrendChart } from '@components/shared/VitalTrendChart';
import { ROUTES } from '@/constants/routes';
import { formatCurrencyWhole } from '@/utils/currency';
import { formatHumanDate } from '@/utils/datetime';
import {
  ACTIVE_ALERTS_COUNT,
  HOURLY_LABELS,
  INVOICES_GENERATED_TODAY,
  LAB_TESTS_PROCESSED_TODAY,
  TOTAL_CONSULTATIONS_TODAY,
  DEPARTMENT_MONITORING_CARDS,
  type DepartmentMonitoringCard,
} from '@/features/administration/__mocks__/departmentMonitoringFixtures';
import { ADMINISTRATIVE_ALERTS } from '@/features/administration/__mocks__/administrationDashboardFixtures';
import { useQueueEntries } from '@/features/registration/store/registrationQueueStore';
import { useDispensedTodayCount } from '@/features/pharmacy/store/pharmacyDispensingStore';
import { useAnnouncements } from '@/features/announcements/store/announcementsStore';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

function toDateKey(date: Date | string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos' }).format(
    typeof date === 'string' ? new Date(date) : date,
  );
}

function todayKey(): string {
  return toDateKey(new Date());
}

const STATUS_FILTER_DEF: FilterDef = {
  key: 'status',
  defaultLabel: 'All Statuses',
  options: [
    { value: 'Operational', label: 'Operational' },
    { value: 'Busy', label: 'Busy' },
  ],
};

function StatusPill({ status }: { status: 'Operational' | 'Busy' }) {
  const busy = status === 'Busy';
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-sans font-medium whitespace-nowrap"
      style={{
        fontSize: 14,
        color: busy ? '#DC2626' : '#16A34A',
        border: `1px solid ${busy ? 'rgba(220,38,38,0.35)' : 'rgba(22,163,74,0.35)'}`,
        background: busy ? 'rgba(220,38,38,0.08)' : 'rgba(22,163,74,0.08)',
      }}
    >
      <span
        className="size-1.5 rounded-full"
        style={{ background: busy ? '#DC2626' : '#16A34A' }}
      />
      {status}
    </span>
  );
}

function DateRangeControl({
  from,
  to,
  onChange,
}: {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex h-11 items-center gap-2 rounded-[10px] px-3.5 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
        style={{
          fontSize: 14,
          color: '#0D2630',
          border: open ? '1px solid #00B4D8' : '1px solid rgba(0,100,130,0.2)',
        }}
      >
        <CalendarDays style={{ width: 15, height: 15, color: '#4A7080' }} />
        {formatHumanDate(from)} - {formatHumanDate(to)}
      </button>
      {open && (
        <div
          className="animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 absolute top-full right-0 z-30 mt-1.5 w-[280px] rounded-[12px] bg-white p-4 duration-150"
          style={{
            border: '1px solid rgba(0,100,130,0.12)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          }}
        >
          <div className="flex flex-col gap-3">
            <div>
              <label
                className="mb-1 block font-sans font-medium"
                style={{ fontSize: 14, color: '#0D2630' }}
              >
                From
              </label>
              <FormDateInput value={from} max={to} onChange={(e) => onChange(e.target.value, to)} />
            </div>
            <div>
              <label
                className="mb-1 block font-sans font-medium"
                style={{ fontSize: 14, color: '#0D2630' }}
              >
                To
              </label>
              <FormDateInput
                value={to}
                min={from}
                max={todayKey()}
                onChange={(e) => onChange(from, e.target.value)}
              />
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className={`flex h-10 items-center justify-center rounded-[10px] font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
              style={{ fontSize: 14, background: '#00B4D8' }}
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ComparisonBar({
  segments,
  maxValue,
}: {
  segments: { label: string; value: number; color: string; isCurrency?: boolean }[];
  maxValue: number;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      {segments.map((s) => (
        <div key={s.label}>
          <div className="mb-1 flex items-center justify-between gap-2">
            <span style={{ fontSize: 14, color: '#8A98A3' }}>{s.label}</span>
            <span className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
              {s.isCurrency ? formatCurrencyWhole(s.value) : s.value}
            </span>
          </div>
          <div
            className="h-2 w-full overflow-hidden rounded-full"
            style={{ background: '#EEF3F5' }}
          >
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{
                width: `${maxValue > 0 ? Math.min(100, (s.value / maxValue) * 100) : 0}%`,
                background: s.color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function DepartmentCard({ card }: { card: DepartmentMonitoringCard }) {
  const router = useRouter();
  const Icon = card.icon;

  return (
    <div
      className="flex min-w-0 flex-col overflow-hidden rounded-[12px] p-4"
      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <div
            className="flex size-9 shrink-0 items-center justify-center rounded-[10px]"
            style={{ background: card.iconBg }}
          >
            <Icon style={{ width: 17, height: 17, color: card.iconColor }} />
          </div>
          <Tooltip content={card.department}>
            <p
              className="truncate font-sans font-semibold"
              style={{ fontSize: 16, color: '#0D2630' }}
            >
              {card.department}
            </p>
          </Tooltip>
        </div>
        <StatusPill status={card.status} />
      </div>

      <div className="mt-3 flex items-end gap-6">
        <div>
          <p
            className="font-display font-bold"
            style={{ fontSize: 26, lineHeight: '32px', color: '#0D2630' }}
          >
            {card.primaryMetric.value}
          </p>
          <p style={{ fontSize: 14, color: '#8A98A3' }}>{card.primaryMetric.label}</p>
        </div>
        <div>
          <p
            className="font-display font-bold"
            style={{ fontSize: 26, lineHeight: '32px', color: '#0D2630' }}
          >
            {card.secondaryMetric.label.includes('%')
              ? `${card.secondaryMetric.value}%`
              : card.secondaryMetric.value}
          </p>
          <p style={{ fontSize: 14, color: '#8A98A3' }}>{card.secondaryMetric.label}</p>
        </div>
      </div>

      <div className="mt-3">
        {card.visual.kind === 'trend' && (
          <VitalTrendChart
            data={card.visual.hourlyData.map((v, i) => ({
              label: HOURLY_LABELS[i] ?? '',
              value: v,
            }))}
            color={card.visual.color}
            min={0}
            max={Math.max(...card.visual.hourlyData, 1)}
            fill
            showDots
            maxLabels={3}
          />
        )}
        {card.visual.kind === 'bars' && (
          <ComparisonBar segments={card.visual.segments} maxValue={card.visual.total} />
        )}
        {card.visual.kind === 'tasks' && (
          <div className="flex flex-col gap-2">
            {card.visual.tasks.map((t) => (
              <div key={t.id} className="flex items-start gap-2">
                <span
                  className="mt-1.5 size-1.5 shrink-0 rounded-full"
                  style={{ background: '#00B4D8' }}
                />
                <div className="min-w-0 flex-1">
                  <Tooltip content={t.label}>
                    <p className="truncate" style={{ fontSize: 14, color: '#0D2630' }}>
                      {t.label}
                    </p>
                  </Tooltip>
                </div>
                <span className="shrink-0" style={{ fontSize: 14, color: '#8A98A3' }}>
                  {t.timeLabel}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => router.push(card.detailsRoute)}
        className={`mt-3 flex items-center gap-1 self-start font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
        style={{ fontSize: 14, color: '#00B4D8' }}
      >
        View Details
        <ChevronRight style={{ width: 14, height: 14 }} />
      </button>
    </div>
  );
}

export function DepartmentMonitoringWorkspace() {
  const router = useRouter();
  const today = todayKey();
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const queueEntries = useQueueEntries();
  const dispensedToday = useDispensedTodayCount();
  const announcements = useAnnouncements();

  const totalPatientsInRange = useMemo(() => {
    return queueEntries.filter((e) => {
      const key = toDateKey(e.arrivalTime);
      return key >= dateFrom && key <= dateTo;
    }).length;
  }, [queueEntries, dateFrom, dateTo]);

  const recentNotices = useMemo(
    () =>
      [...announcements]
        .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
        .slice(0, 3),
    [announcements],
  );

  const visibleCards = useMemo(() => {
    return DEPARTMENT_MONITORING_CARDS.map((c) =>
      c.department === 'Pharmacy'
        ? { ...c, primaryMetric: { ...c.primaryMetric, value: dispensedToday } }
        : c,
    ).filter((c) => statusFilter === 'ALL' || c.status === statusFilter);
  }, [statusFilter, dispensedToday]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto max-w-[1200px] px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-wrap items-center gap-1.5" style={{ fontSize: 14 }}>
            <button
              type="button"
              onClick={() => router.push(ROUTES.admin)}
              className={`font-sans transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
              style={{ color: '#4A7080' }}
            >
              Operations
            </button>
            <span style={{ color: '#8A98A3' }}>/</span>
            <span className="font-medium" style={{ color: '#0D2630' }}>
              Department Monitoring
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Activity style={{ width: 22, height: 22, color: '#00B4D8' }} />
                <h1
                  className="font-display font-semibold"
                  style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
                >
                  Department Monitoring
                </h1>
              </div>
              <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                Real-time overview of all departments and key operational metrics across the medical
                centre.
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <DateRangeControl
                from={dateFrom}
                to={dateTo}
                onChange={(from, to) => {
                  setDateFrom(from);
                  setDateTo(to);
                }}
              />
              <button
                type="button"
                onClick={() => setFiltersOpen((v) => !v)}
                className={`flex h-11 items-center gap-1.5 rounded-[10px] px-3.5 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                style={{
                  fontSize: 14,
                  color: filtersOpen || statusFilter !== 'ALL' ? '#00B4D8' : '#0D2630',
                  border: `1px solid ${filtersOpen ? '#00B4D8' : 'rgba(0,100,130,0.2)'}`,
                }}
              >
                <Filter style={{ width: 15, height: 15 }} />
                Filters
              </button>
            </div>
          </div>

          {filtersOpen && (
            <div
              className="animate-in fade-in-0 slide-in-from-top-1 mt-3 flex items-center gap-2.5 rounded-[10px] p-3 duration-150"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <span style={{ fontSize: 14, color: '#4A7080' }}>Status:</span>
              <FilterDropdown
                def={STATUS_FILTER_DEF}
                value={statusFilter}
                isOpen={statusDropdownOpen}
                onToggle={() => setStatusDropdownOpen((v) => !v)}
                onSelect={(v) => {
                  setStatusFilter(v);
                  setStatusDropdownOpen(false);
                }}
              />
            </div>
          )}

          <div className="mt-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3 xl:gap-4 2xl:grid-cols-6">
            <StatCard
              icon={UserPlus}
              label="Total Patients Today"
              value={totalPatientsInRange}
              info={
                dateFrom === dateTo && dateFrom === today ? 'vs yesterday' : 'in selected range'
              }
              accent="#2563EB"
              iconBg="rgba(37,99,235,0.1)"
            />
            <StatCard
              icon={ClipboardList}
              label="Total Consultations"
              value={TOTAL_CONSULTATIONS_TODAY}
              info="vs yesterday"
              accent="#16A34A"
              iconBg="rgba(22,163,74,0.1)"
            />
            <StatCard
              icon={Activity}
              label="Lab Tests Processed"
              value={LAB_TESTS_PROCESSED_TODAY}
              info="vs yesterday"
              accent="#7C3AED"
              iconBg="rgba(124,58,237,0.1)"
            />
            <StatCard
              icon={Tag}
              label="Prescriptions Dispensed"
              value={dispensedToday}
              info="vs yesterday"
              accent="#D97706"
              iconBg="rgba(217,119,6,0.1)"
            />
            <StatCard
              icon={FileBarChart}
              label="Invoices Generated"
              value={INVOICES_GENERATED_TODAY}
              info="vs yesterday"
              accent="#00B4D8"
              iconBg="rgba(0,180,216,0.1)"
            />
            <StatCard
              icon={AlertTriangle}
              label="Active Alerts"
              value={ACTIVE_ALERTS_COUNT}
              info="View all alerts"
              accent="#DC2626"
              iconBg="rgba(220,38,38,0.1)"
              onClick={() => router.push(ROUTES.adminAuditLog)}
            />
          </div>

          <p className="font-display mt-6 font-semibold" style={{ fontSize: 18, color: '#0D2630' }}>
            Department Overview
          </p>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {visibleCards.map((c) => (
              <DepartmentCard key={c.id} card={c} />
            ))}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div
              className="rounded-[12px] p-4"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <div className="flex items-center justify-between gap-2">
                <p
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Recent Alerts
                </p>
                <button
                  type="button"
                  onClick={() => router.push(ROUTES.adminAuditLog)}
                  className={`flex items-center gap-1 font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                  style={{ fontSize: 14, color: '#00B4D8' }}
                >
                  View All Alerts
                  <ChevronRight style={{ width: 13, height: 13 }} />
                </button>
              </div>
              <div className="mt-3 flex flex-col gap-3">
                {ADMINISTRATIVE_ALERTS.map((a) => {
                  const AlertIcon = a.icon;
                  return (
                    <div key={a.id} className="flex items-start gap-2.5">
                      <div
                        className="flex size-8 shrink-0 items-center justify-center rounded-full"
                        style={{ background: a.iconBg }}
                      >
                        <AlertIcon style={{ width: 15, height: 15, color: a.iconColor }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className="font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {a.title}
                        </p>
                        <Tooltip content={a.detail}>
                          <p className="truncate" style={{ fontSize: 14, color: '#8A98A3' }}>
                            {a.detail}
                          </p>
                        </Tooltip>
                      </div>
                      <span className="shrink-0" style={{ fontSize: 14, color: '#8A98A3' }}>
                        {a.timeLabel}
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
              <div className="flex items-center justify-between gap-2">
                <p
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  System Notices
                </p>
                <button
                  type="button"
                  onClick={() => router.push(ROUTES.announcements)}
                  className={`flex items-center gap-1 font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                  style={{ fontSize: 14, color: '#00B4D8' }}
                >
                  View All Notices
                  <ChevronRight style={{ width: 13, height: 13 }} />
                </button>
              </div>
              <div className="mt-3 flex flex-col gap-3">
                {recentNotices.length === 0 ? (
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>No notices yet.</p>
                ) : (
                  recentNotices.map((n) => (
                    <div key={n.id} className="flex items-start gap-2.5">
                      <div
                        className="flex size-8 shrink-0 items-center justify-center rounded-full"
                        style={{ background: 'rgba(0,180,216,0.1)' }}
                      >
                        <Bell style={{ width: 15, height: 15, color: '#00B4D8' }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <Tooltip content={n.title}>
                          <p
                            className="truncate font-sans font-medium"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {n.title}
                          </p>
                        </Tooltip>
                        <p style={{ fontSize: 14, color: '#8A98A3' }}>
                          {formatHumanDate(n.publishedAt)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div
              className="rounded-[12px] p-4"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Quick Actions
              </p>
              <div className="mt-3 grid grid-cols-3 gap-2.5">
                {[
                  { label: 'Add Staff', icon: UserPlus, route: ROUTES.adminStaffAccounts },
                  { label: 'Create Notice', icon: Megaphone, route: ROUTES.announcements },
                  { label: 'View Reports', icon: FileBarChart, route: ROUTES.adminReports },
                  {
                    label: 'System Settings',
                    icon: SettingsIcon,
                    route: ROUTES.adminSystemSettings,
                  },
                  { label: 'Audit Logs', icon: History, route: ROUTES.adminAuditLog },
                  { label: 'Manage Pricing', icon: Tag, route: ROUTES.adminServicePricing },
                ].map((a) => (
                  <button
                    key={a.label}
                    type="button"
                    onClick={() => router.push(a.route)}
                    className={`flex flex-col items-center gap-1.5 rounded-[10px] p-3 text-center transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                    style={{ border: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    <a.icon style={{ width: 18, height: 18, color: '#00B4D8' }} />
                    <span style={{ fontSize: 14, color: '#0D2630' }}>{a.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
