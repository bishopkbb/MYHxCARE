'use client';

import { Download, Eye, MoreVertical, Printer, UserCog } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { FormDateInput } from '@components/shared/FormDateInput';
import { FormSelect } from '@components/shared/FormSelect';
import { getInitials } from '@lib/utils';
import { ROUTES } from '@/constants/routes';
import { useToast } from '@/hooks/useToast';
import { downloadCSV, downloadPDF, escapeHtml } from '@/utils/export';
import { formatTime } from '@/utils/datetime';
import {
  ATTENDANCE_DEPARTMENT_OPTIONS,
  ATTENDANCE_DOCTOR_OPTIONS,
  ATTENDANCE_ENTRIES,
  ATTENDANCE_STATS,
  AVG_WAIT_BY_DEPARTMENT,
  CLINIC_OPTIONS,
  DEPARTMENT_ATTENDANCE,
  HOURLY_ATTENDANCE,
  TOTAL_CHECKED_IN_DISPLAY,
  VISIT_STATUS_OPTIONS,
  type AttendanceEntry,
  type DistributionSlice,
  type LabeledPoint,
  type VisitStatus,
} from '@/features/registration/__mocks__/dailyAttendanceFixtures';

const ROWS_PER_PAGE = 8;
const AVATAR_COLORS = ['#3B82F6', '#F59E0B', '#22C55E', '#8B5CF6', '#EC4899', '#00B4D8', '#EF4444'];

const STATUS_CFG: Record<VisitStatus, { color: string; border: string; bg: string }> = {
  Completed: { color: '#22C55E', border: 'rgba(34,197,94,0.40)', bg: 'transparent' },
  Waiting: { color: '#F59E0B', border: 'rgba(245,158,11,0.40)', bg: 'rgba(245,158,11,0.06)' },
  'In Progress': { color: '#00B4D8', border: 'rgba(0,180,216,0.40)', bg: 'rgba(0,180,216,0.06)' },
  Emergency: { color: '#EF4444', border: 'rgba(239,68,68,0.40)', bg: 'rgba(239,68,68,0.06)' },
};

function computeTick(maxValue: number): number {
  if (maxValue <= 0) return 1;
  let tick = Math.ceil(maxValue / 4);
  if (tick > 100) tick = Math.ceil(tick / 20) * 20;
  else if (tick > 20) tick = Math.ceil(tick / 10) * 10;
  else if (tick > 10) tick = Math.ceil(tick / 5) * 5;
  return tick;
}

function formatCheckTime(iso: string | null): string {
  return iso ? formatTime(iso) : '—';
}

// ── Line chart with value labels on each point ──────────────────────────────
function LabeledLineChart({
  data,
  color,
  animate,
}: {
  data: LabeledPoint[];
  color: string;
  animate: boolean;
}) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const tick = computeTick(maxValue);
  const niceMax = tick * 4;
  const ticks = [0, tick, tick * 2, tick * 3, tick * 4];
  const W = 400;
  const H = 200;
  const stepX = W / (data.length - 1);
  const points = data.map((d, i) => ({
    x: i * stepX,
    y: H - (d.value / niceMax) * H,
    value: d.value,
  }));
  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  return (
    <div className="mt-2 flex gap-3" style={{ height: 260 }}>
      <div className="flex shrink-0 flex-col justify-between pb-6 text-right" style={{ width: 28 }}>
        {[...ticks].reverse().map((t) => (
          <span key={t} className="font-sans" style={{ fontSize: 14, color: '#8A98A3' }}>
            {t}
          </span>
        ))}
      </div>
      <div className="relative min-w-0 flex-1">
        <div
          className="absolute inset-x-0 top-0 flex flex-col justify-between"
          style={{ height: 'calc(100% - 24px)' }}
        >
          {[...ticks].reverse().map((t) => (
            <div key={t} style={{ borderTop: '1px dashed rgba(0,100,130,0.15)' }} />
          ))}
        </div>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="absolute inset-x-0 top-0"
          style={{ height: 'calc(100% - 24px)', width: '100%' }}
        >
          <path
            d={pathD}
            fill="none"
            stroke={color}
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
            style={{
              strokeDasharray: 1400,
              strokeDashoffset: animate ? 0 : 1400,
              transition: 'stroke-dashoffset 1s cubic-bezier(0.22,1,0.36,1)',
            }}
          />
          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={3.5}
              fill={color}
              vectorEffect="non-scaling-stroke"
              style={{ opacity: animate ? 1 : 0, transition: `opacity 0.3s ${i * 50}ms` }}
            />
          ))}
        </svg>
        <div className="absolute inset-x-0 top-0 flex" style={{ height: 'calc(100% - 24px)' }}>
          {points.map((p, i) => (
            <div
              key={i}
              className="absolute"
              style={{
                left: `${(p.x / W) * 100}%`,
                top: `${Math.max(0, (p.y / H) * 100 - 12)}%`,
                transform: 'translateX(-50%)',
              }}
            >
              <span
                className="font-sans font-medium"
                style={{
                  fontSize: 14,
                  color: '#0D2630',
                  opacity: animate ? 1 : 0,
                  transition: `opacity 0.3s ${i * 50 + 200}ms`,
                }}
              >
                {p.value}
              </span>
            </div>
          ))}
        </div>
        <div className="absolute inset-x-0 bottom-0 flex justify-between" style={{ height: 24 }}>
          {data.map((d) => (
            <span key={d.label} className="font-sans" style={{ fontSize: 14, color: '#8A98A3' }}>
              {d.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Bar chart with value labels above each bar ──────────────────────────────
function LabeledBarChart({
  data,
  color,
  animate,
  unit,
}: {
  data: LabeledPoint[];
  color: string;
  animate: boolean;
  unit?: string;
}) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const tick = computeTick(maxValue);
  const niceMax = tick * 4;
  const ticks = [0, tick, tick * 2, tick * 3, tick * 4];

  return (
    <div className="mt-2 flex gap-3" style={{ height: 280 }}>
      <div
        className="flex shrink-0 flex-col justify-between pb-10 text-right"
        style={{ width: 28 }}
      >
        {[...ticks].reverse().map((t) => (
          <span key={t} className="font-sans" style={{ fontSize: 14, color: '#8A98A3' }}>
            {t}
          </span>
        ))}
      </div>
      <div className="relative min-w-0 flex-1">
        <div
          className="absolute inset-x-0 top-0 flex flex-col justify-between"
          style={{ height: 'calc(100% - 40px)' }}
        >
          {[...ticks].reverse().map((t) => (
            <div key={t} style={{ borderTop: '1px dashed rgba(0,100,130,0.15)' }} />
          ))}
        </div>
        <div
          className="absolute inset-x-0 top-0 flex items-end gap-3"
          style={{ height: 'calc(100% - 40px)' }}
        >
          {data.map((d, i) => (
            <div
              key={d.label}
              className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1"
              style={{ height: '100%' }}
            >
              <span
                className="font-sans font-medium whitespace-nowrap"
                style={{
                  fontSize: 14,
                  color: '#0D2630',
                  opacity: animate ? 1 : 0,
                  transition: `opacity 0.4s ${i * 40 + 300}ms`,
                }}
              >
                {d.value}
                {unit}
              </span>
              <div
                className="w-full rounded-t-[4px]"
                style={{
                  height: animate ? `${(d.value / niceMax) * 100}%` : 0,
                  background: color,
                  transition: `height 0.7s cubic-bezier(0.22,1,0.36,1) ${i * 40}ms`,
                }}
              />
            </div>
          ))}
        </div>
        <div className="absolute inset-x-0 bottom-0 flex gap-3" style={{ height: 40 }}>
          {data.map((d) => (
            <span
              key={d.label}
              className="min-w-0 flex-1 text-center font-sans leading-tight"
              style={{ fontSize: 14, color: '#8A98A3' }}
            >
              {d.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Donut chart with center total ───────────────────────────────────────────
function DonutChart({
  data,
  total,
  animate,
}: {
  data: DistributionSlice[];
  total: string;
  animate: boolean;
}) {
  const sum = data.reduce((acc, d) => acc + d.value, 0) || 1;
  const radius = 54;
  const strokeWidth = 20;
  const circumference = 2 * Math.PI * radius;
  const gapPx = 3;

  type Seg = DistributionSlice & { length: number; offset: number };
  const { segments } = data.reduce<{ cumulative: number; segments: Seg[] }>(
    (acc, d) => {
      const rawLength = (d.value / sum) * circumference;
      const offset = -(acc.cumulative / sum) * circumference;
      return {
        cumulative: acc.cumulative + d.value,
        segments: [...acc.segments, { ...d, length: Math.max(0, rawLength - gapPx), offset }],
      };
    },
    { cumulative: 0, segments: [] },
  );

  return (
    <div className="mt-2 flex flex-col items-center gap-4 sm:flex-row sm:items-center">
      <div
        className="relative flex shrink-0 items-center justify-center"
        style={{ width: 150, height: 150 }}
      >
        <svg
          viewBox="0 0 128 128"
          style={{ width: 150, height: 150 }}
          role="img"
          aria-label="Department attendance donut chart"
        >
          <g transform="rotate(-90 64 64)">
            {segments.map((seg, i) => (
              <circle
                key={seg.label}
                cx={64}
                cy={64}
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth={strokeWidth}
                strokeLinecap="butt"
                strokeDasharray={`${animate ? seg.length : 0} ${circumference}`}
                strokeDashoffset={seg.offset}
                style={{
                  transition: `stroke-dasharray 0.8s cubic-bezier(0.22,1,0.36,1) ${i * 100}ms`,
                }}
              />
            ))}
          </g>
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="font-display font-bold" style={{ fontSize: 20, color: '#0D2630' }}>
            {total}
          </span>
          <span style={{ fontSize: 14, color: '#8A98A3' }}>Total</span>
        </div>
      </div>
      <div className="flex w-full min-w-0 flex-1 flex-col gap-2">
        {data.map((d) => (
          <div key={d.label} className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: d.color }} />
              <span className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                {d.label}
              </span>
            </div>
            <span
              className="shrink-0 font-sans font-medium"
              style={{ fontSize: 14, color: '#0D2630' }}
            >
              {d.value} ({d.percent}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DailyAttendanceWorkspace() {
  const router = useRouter();
  const toast = useToast();
  const [animateCharts, setAnimateCharts] = useState(false);
  const [date, setDate] = useState('2026-06-30');
  const [department, setDepartment] = useState('');
  const [doctor, setDoctor] = useState('');
  const [clinic, setClinic] = useState('');
  const [status, setStatus] = useState('');
  const [rows, setRows] = useState<AttendanceEntry[]>(ATTENDANCE_ENTRIES);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let raf1 = 0;
    let raf2 = 0;
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setAnimateCharts(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, []);

  function handleReset() {
    setDate('2026-06-30');
    setDepartment('');
    setDoctor('');
    setClinic('');
    setStatus('');
    setRows(ATTENDANCE_ENTRIES);
    setCurrentPage(1);
    toast.info('Filters reset', 'Showing all of today’s attendance.');
  }

  function handleApplyFilters() {
    const filtered = ATTENDANCE_ENTRIES.filter((r) => {
      if (department && r.department !== department) return false;
      if (doctor && r.doctor !== doctor) return false;
      if (status && r.status !== status) return false;
      return true;
    });
    setRows(filtered);
    setCurrentPage(1);
    toast.success(
      'Filters applied',
      `${filtered.length} patient${filtered.length !== 1 ? 's' : ''} match your filters.`,
    );
  }

  const totalPages = Math.max(1, Math.ceil(rows.length / ROWS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * ROWS_PER_PAGE;
  const pageRows = rows.slice(pageStart, pageStart + ROWS_PER_PAGE);
  const selected = selectedId ? (rows.find((r) => r.id === selectedId) ?? null) : null;

  const exportRows = useMemo(
    () => [
      [
        'Queue #',
        'Patient',
        'MRN',
        'Department',
        'Doctor',
        'Check-In',
        'Check-Out',
        'Visit Status',
      ],
      ...rows.map((r) => [
        r.id,
        r.patientName,
        r.mrn,
        r.department,
        r.doctor,
        formatCheckTime(r.checkInTime),
        formatCheckTime(r.checkOutTime),
        r.status,
      ]),
    ],
    [rows],
  );

  function handleExport() {
    downloadCSV('daily-attendance', exportRows);
    toast.success('Export ready', 'Daily Attendance downloaded as CSV.');
  }

  function handlePrint() {
    const rowsHtml = rows
      .map(
        (r) =>
          `<tr><td>${escapeHtml(r.id)}</td><td>${escapeHtml(r.patientName)}</td><td>${escapeHtml(r.mrn)}</td><td>${escapeHtml(r.department)}</td><td>${escapeHtml(r.doctor)}</td><td>${escapeHtml(formatCheckTime(r.checkInTime))}</td><td>${escapeHtml(formatCheckTime(r.checkOutTime))}</td><td>${escapeHtml(r.status)}</td></tr>`,
      )
      .join('');
    downloadPDF(
      'daily-attendance',
      `<h1>Daily Attendance</h1>
      <table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;width:100%">
        <thead><tr><th>Queue #</th><th>Patient</th><th>MRN</th><th>Department</th><th>Doctor</th><th>Check-In</th><th>Check-Out</th><th>Status</th></tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>`,
    );
    toast.success('Print ready', 'Daily Attendance sent to print.');
  }

  function handleViewPatient() {
    if (!selected) {
      toast.info('Select a patient', 'Choose a row from the table first.');
      return;
    }
    toast.info(
      'Opening record',
      `Search for ${selected.patientName} (${selected.mrn}) in the patient directory.`,
    );
    router.push(ROUTES.registrationDirectory);
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto max-w-[1600px] px-4 py-4 sm:px-6 sm:py-5">
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => router.push(ROUTES.registration)}
              className="transition-colors duration-150 hover:text-[#00B4D8] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
              style={{ fontSize: 14, color: '#8A98A3' }}
            >
              Dashboard
            </button>
            <span style={{ fontSize: 14, color: '#8A98A3' }}>/</span>
            <span style={{ fontSize: 14, color: '#8A98A3' }}>Reports</span>
            <span style={{ fontSize: 14, color: '#8A98A3' }}>/</span>
            <span className="font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
              Daily Attendance
            </span>
          </nav>

          <div className="mt-2">
            <h1
              className="font-display font-semibold"
              style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
            >
              Daily Attendance
            </h1>
            <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
              Real-time overview of patient attendance and visit status.
            </p>
          </div>

          {/* ── Stat cards ─────────────────────────────────────────────────── */}
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            {ATTENDANCE_STATS.map((s) => {
              const isGood = s.direction === s.goodDirection;
              return (
                <div
                  key={s.id}
                  className="rounded-[12px] p-4"
                  style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="flex size-10 shrink-0 items-center justify-center rounded-full"
                      style={{ background: s.iconBg }}
                    >
                      <s.icon style={{ width: 17, height: 17, color: s.color }} />
                    </div>
                    <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                      {s.label}
                    </p>
                  </div>
                  <p
                    className="font-display mt-2 font-semibold"
                    style={{ fontSize: 22, color: '#0D2630' }}
                  >
                    {s.value}
                  </p>
                  <p
                    className="mt-0.5 font-sans font-medium"
                    style={{ fontSize: 14, color: isGood ? '#16A34A' : '#DC2626' }}
                  >
                    {s.direction === 'up' ? '↑' : '↓'} {s.deltaLabel}
                  </p>
                </div>
              );
            })}
          </div>

          {/* ── Filters ────────────────────────────────────────────────────── */}
          <div
            className="mt-5 rounded-[12px] p-4 sm:p-5"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
              Filters
            </h2>
            <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-end">
              <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label
                    className="mb-1.5 block font-sans font-medium"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    Date
                  </label>
                  <FormDateInput value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div>
                  <label
                    className="mb-1.5 block font-sans font-medium"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    Department
                  </label>
                  <FormSelect
                    id="att-department"
                    value={department}
                    onChange={setDepartment}
                    options={ATTENDANCE_DEPARTMENT_OPTIONS}
                    placeholder="All Departments"
                  />
                </div>
                <div>
                  <label
                    className="mb-1.5 block font-sans font-medium"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    Doctor
                  </label>
                  <FormSelect
                    id="att-doctor"
                    value={doctor}
                    onChange={setDoctor}
                    options={ATTENDANCE_DOCTOR_OPTIONS}
                    placeholder="All Doctors"
                  />
                </div>
                <div>
                  <label
                    className="mb-1.5 block font-sans font-medium"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    Clinic
                  </label>
                  <FormSelect
                    id="att-clinic"
                    value={clinic}
                    onChange={setClinic}
                    options={CLINIC_OPTIONS}
                    placeholder="All Clinics"
                  />
                </div>
                <div>
                  <label
                    className="mb-1.5 block font-sans font-medium"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    Status
                  </label>
                  <FormSelect
                    id="att-status"
                    value={status}
                    onChange={setStatus}
                    options={VISIT_STATUS_OPTIONS}
                    placeholder="All Statuses"
                  />
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                  style={{
                    fontSize: 14,
                    color: '#0D2630',
                    border: '1px solid rgba(0,100,130,0.2)',
                  }}
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={handleApplyFilters}
                  className="flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                  style={{ fontSize: 14, background: '#00B4D8' }}
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>

          {/* ── Charts ─────────────────────────────────────────────────────── */}
          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div
              className="rounded-[12px] p-4 sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Hourly Attendance
              </p>
              <LabeledLineChart data={HOURLY_ATTENDANCE} color="#3B82F6" animate={animateCharts} />
            </div>
            <div
              className="rounded-[12px] p-4 sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Department Attendance
              </p>
              <DonutChart
                data={DEPARTMENT_ATTENDANCE}
                total={TOTAL_CHECKED_IN_DISPLAY}
                animate={animateCharts}
              />
            </div>
          </div>
          <div
            className="mt-4 rounded-[12px] p-4 sm:p-5"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
              Average Waiting Time (by Department)
            </p>
            <LabeledBarChart
              data={AVG_WAIT_BY_DEPARTMENT}
              color="#8B5CF6"
              animate={animateCharts}
              unit=" min"
            />
          </div>

          {/* ── Attendance table ───────────────────────────────────────────── */}
          <div className="mt-5">
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleExport}
                className="flex h-10 items-center gap-1.5 rounded-[10px] px-3.5 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
              >
                <Download style={{ width: 15, height: 15 }} />
                Export
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="flex h-10 items-center gap-1.5 rounded-[10px] px-3.5 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
              >
                <Printer style={{ width: 15, height: 15 }} />
                Print
              </button>
              <button
                type="button"
                onClick={handleViewPatient}
                className="flex h-10 items-center gap-1.5 rounded-[10px] px-3.5 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                style={{ fontSize: 14, background: '#00B4D8' }}
              >
                <UserCog style={{ width: 15, height: 15 }} />
                View Patient
              </button>
            </div>

            <div
              className="mt-3 rounded-[12px] p-4 sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <div className="overflow-x-auto scroll-smooth">
                <div className="min-w-[1240px]">
                  <div
                    className="flex rounded-t-[8px]"
                    style={{
                      background: 'rgba(226,237,241,0.4)',
                      borderBottom: '1px solid #E6F8FD',
                    }}
                  >
                    <div className="w-24 shrink-0 py-2.5 pr-2 pl-3">
                      <span
                        className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Queue #
                      </span>
                    </div>
                    <div className="w-44 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Patient
                      </span>
                    </div>
                    <div className="w-32 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        MRN
                      </span>
                    </div>
                    <div className="min-w-[140px] flex-1 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Department
                      </span>
                    </div>
                    <div className="w-40 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Doctor
                      </span>
                    </div>
                    <div className="w-28 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Check-In
                      </span>
                    </div>
                    <div className="w-28 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Check-Out
                      </span>
                    </div>
                    <div className="w-36 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Visit Status
                      </span>
                    </div>
                    <div className="w-20 shrink-0 py-2.5 pr-3 text-right">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Actions
                      </span>
                    </div>
                  </div>

                  {pageRows.length === 0 && (
                    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                      <p style={{ fontSize: 14, color: '#8A98A3' }}>
                        No patients match your filters
                      </p>
                    </div>
                  )}

                  {pageRows.map((r, i) => {
                    const cfg = STATUS_CFG[r.status];
                    return (
                      <div
                        key={r.id}
                        onClick={() => setSelectedId(r.id)}
                        className="flex cursor-pointer items-center transition-colors duration-100 hover:bg-[#F5FBFD]"
                        style={{
                          borderBottom: '1px solid rgba(0,100,130,0.08)',
                          background: selectedId === r.id ? '#E6F8FD' : 'transparent',
                        }}
                      >
                        <div className="w-24 shrink-0 py-3 pr-2 pl-3">
                          <p
                            className="truncate font-sans font-medium"
                            style={{ fontSize: 14, color: '#00B4D8' }}
                          >
                            {r.id}
                          </p>
                        </div>
                        <div className="flex w-44 shrink-0 items-center gap-2.5 py-3 pr-2">
                          <div
                            className="flex size-8 shrink-0 items-center justify-center rounded-full font-sans text-sm font-semibold text-white"
                            style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                          >
                            {getInitials(r.patientName)}
                          </div>
                          <div className="min-w-0">
                            <p
                              className="truncate font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {r.patientName}
                            </p>
                            <p className="truncate" style={{ fontSize: 14, color: '#8A98A3' }}>
                              {r.gender}, {r.age} Yrs
                            </p>
                          </div>
                        </div>
                        <div className="w-32 shrink-0 py-3 pr-2">
                          <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                            {r.mrn}
                          </p>
                        </div>
                        <div className="min-w-[140px] flex-1 py-3 pr-2">
                          <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                            {r.department}
                          </p>
                        </div>
                        <div className="w-40 shrink-0 py-3 pr-2">
                          <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                            {r.doctor}
                          </p>
                        </div>
                        <div className="w-28 shrink-0 py-3 pr-2">
                          <p style={{ fontSize: 14, color: '#4A7080' }}>
                            {formatCheckTime(r.checkInTime)}
                          </p>
                        </div>
                        <div className="w-28 shrink-0 py-3 pr-2">
                          <p
                            style={{ fontSize: 14, color: r.checkOutTime ? '#4A7080' : '#8A98A3' }}
                          >
                            {formatCheckTime(r.checkOutTime)}
                          </p>
                        </div>
                        <div className="w-36 shrink-0 py-3 pr-2">
                          <span
                            className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium"
                            style={{
                              fontSize: 14,
                              whiteSpace: 'nowrap',
                              color: cfg.color,
                              border: `1px solid ${cfg.border}`,
                              background: cfg.bg,
                            }}
                          >
                            {r.status}
                          </span>
                        </div>
                        <div
                          className="flex w-20 shrink-0 items-center justify-end gap-1 py-3 pr-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedId(r.id);
                              handleViewPatient();
                            }}
                            aria-label={`View ${r.patientName}`}
                            className="flex size-8 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                          >
                            <Eye style={{ width: 15, height: 15, color: '#4A7080' }} />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              toast.info('More actions', `Additional actions for ${r.id}.`)
                            }
                            aria-label={`More actions for ${r.id}`}
                            className="flex size-8 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                          >
                            <MoreVertical style={{ width: 15, height: 15, color: '#4A7080' }} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {rows.length > 0 && (
                <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
                  <p style={{ fontSize: 14, color: '#4A7080' }}>
                    Showing {pageStart + 1} to {Math.min(pageStart + ROWS_PER_PAGE, rows.length)} of{' '}
                    {rows.length} patients
                  </p>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={safePage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="flex size-9 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
                      style={{ border: '1px solid rgba(0,100,130,0.18)', color: '#4A7080' }}
                      aria-label="Previous page"
                    >
                      ‹
                    </button>
                    {Array.from({ length: totalPages }, (_, idx) => idx + 1)
                      .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                      .reduce<(number | 'ellipsis')[]>((acc, p) => {
                        if (acc.length > 0 && typeof acc[acc.length - 1] === 'number') {
                          const prev = acc[acc.length - 1] as number;
                          if (p - prev > 1) acc.push('ellipsis');
                        }
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((p, idx) =>
                        p === 'ellipsis' ? (
                          <span
                            key={`e-${idx}`}
                            style={{ fontSize: 14, color: '#8A98A3' }}
                            className="px-1"
                          >
                            …
                          </span>
                        ) : (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setCurrentPage(p)}
                            className="flex size-9 items-center justify-center rounded-[8px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                            style={{
                              fontSize: 14,
                              border: `1px solid ${p === safePage ? '#00B4D8' : 'rgba(0,100,130,0.18)'}`,
                              color: p === safePage ? '#00B4D8' : '#4A7080',
                              background: p === safePage ? '#E6F8FD' : 'transparent',
                            }}
                          >
                            {p}
                          </button>
                        ),
                      )}
                    <button
                      type="button"
                      disabled={safePage === totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="flex size-9 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
                      style={{ border: '1px solid rgba(0,100,130,0.18)', color: '#4A7080' }}
                      aria-label="Next page"
                    >
                      ›
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: 14, color: '#4A7080' }}>Rows per page:</span>
                    <select
                      value={ROWS_PER_PAGE}
                      disabled
                      className="h-9 rounded-[8px] px-2 font-sans outline-none"
                      style={{
                        fontSize: 14,
                        border: '1px solid rgba(0,100,130,0.18)',
                        color: '#0D2630',
                      }}
                    >
                      <option value={ROWS_PER_PAGE}>{ROWS_PER_PAGE}</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="h-4" />
        </div>
      </main>
    </div>
  );
}
