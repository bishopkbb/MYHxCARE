'use client';

import { Eye, FileDown, FileText, MoreVertical, Printer, Sheet } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { FormDateInput } from '@components/shared/FormDateInput';
import { FormSelect } from '@components/shared/FormSelect';
import { ROUTES } from '@/constants/routes';
import { useToast } from '@/hooks/useToast';
import { getInitials } from '@lib/utils';
import { downloadCSV, downloadPDF, escapeHtml } from '@/utils/export';
import { formatHumanDate, formatTime } from '@/utils/datetime';
import {
  AGE_GROUP_OPTIONS,
  FACULTY_DISTRIBUTION,
  FACULTY_OPTIONS,
  GENDER_DISTRIBUTION,
  GENDER_OPTIONS,
  PEAK_REGISTRATION_HOURS,
  REGISTRATIONS_BY_DAY,
  REGISTRATIONS_BY_MONTH,
  REGISTRATION_RECORDS,
  REGISTRATION_TYPE_OPTIONS,
  REPORT_DEPARTMENT_OPTIONS,
  REPORT_STATS,
  STUDENT_CATEGORY_OPTIONS,
  TOTAL_REGISTRATIONS_DISPLAY,
  type DistributionSlice,
  type RegistrationRecord,
  type RegistrationStatus,
  type TrendPoint,
} from '@/features/registration/__mocks__/registrationReportFixtures';

const ROWS_PER_PAGE = 8;
const AVATAR_COLORS = ['#3B82F6', '#F59E0B', '#22C55E', '#8B5CF6', '#EC4899', '#00B4D8', '#EF4444'];

const TYPE_CFG: Record<string, { color: string; border: string; bg: string }> = {
  Appointment: { color: '#3B82F6', border: 'rgba(59,130,246,0.35)', bg: 'rgba(59,130,246,0.08)' },
  'Walk-in': { color: '#F59E0B', border: 'rgba(245,158,11,0.35)', bg: 'rgba(245,158,11,0.08)' },
  Emergency: { color: '#EF4444', border: 'rgba(239,68,68,0.35)', bg: 'rgba(239,68,68,0.08)' },
};

const STATUS_CFG: Record<RegistrationStatus, { color: string; border: string; bg: string }> = {
  Completed: { color: '#22C55E', border: 'rgba(34,197,94,0.40)', bg: 'transparent' },
  Pending: { color: '#F59E0B', border: 'rgba(245,158,11,0.40)', bg: 'rgba(245,158,11,0.06)' },
  Cancelled: { color: '#EF4444', border: 'rgba(239,68,68,0.40)', bg: 'rgba(239,68,68,0.06)' },
};

function computeTick(maxValue: number): number {
  if (maxValue <= 0) return 1;
  let tick = Math.ceil(maxValue / 4);
  if (tick > 100) tick = Math.ceil(tick / 20) * 20;
  else if (tick > 20) tick = Math.ceil(tick / 10) * 10;
  else if (tick > 10) tick = Math.ceil(tick / 5) * 5;
  return tick;
}

// ── Mini sparkline for stat cards ───────────────────────────────────────────
function Sparkline({ data, color, animate }: { data: number[]; color: string; animate: boolean }) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const W = 100;
  const H = 32;
  const stepX = W / (data.length - 1);
  const points = data.map((v, i) => ({ x: i * stepX, y: H - ((v - min) / range) * H }));
  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="mt-2 h-8 w-full"
      aria-hidden="true"
    >
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
        style={{
          strokeDasharray: 400,
          strokeDashoffset: animate ? 0 : 400,
          transition: 'stroke-dashoffset 0.9s cubic-bezier(0.22,1,0.36,1)',
        }}
      />
    </svg>
  );
}

// ── Line trend chart ─────────────────────────────────────────────────────────
function LineTrendChart({
  data,
  color,
  animate,
}: {
  data: TrendPoint[];
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
  const points = data.map((d, i) => ({ x: i * stepX, y: H - (d.value / niceMax) * H }));
  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
  const xLabelIdx = [0, Math.floor(data.length / 2), data.length - 1].filter(
    (v, i, a) => a.indexOf(v) === i,
  );

  return (
    <div className="mt-2 flex gap-3" style={{ height: 240 }}>
      <div className="flex shrink-0 flex-col justify-between pb-6 text-right" style={{ width: 34 }}>
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
        </svg>
        <div className="absolute inset-x-0 bottom-0 flex justify-between" style={{ height: 24 }}>
          {xLabelIdx.map((i) => (
            <span key={i} className="font-sans" style={{ fontSize: 14, color: '#8A98A3' }}>
              {data[i]?.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Vertical bar chart ───────────────────────────────────────────────────────
function BarChart({
  data,
  color,
  animate,
}: {
  data: TrendPoint[];
  color: string;
  animate: boolean;
}) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const tick = computeTick(maxValue);
  const niceMax = tick * 4;
  const ticks = [0, tick, tick * 2, tick * 3, tick * 4];

  return (
    <div className="mt-2 flex gap-3" style={{ height: 240 }}>
      <div className="flex shrink-0 flex-col justify-between pb-6 text-right" style={{ width: 34 }}>
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
        <div
          className="absolute inset-x-0 top-0 flex items-end gap-2"
          style={{ height: 'calc(100% - 24px)' }}
        >
          {data.map((d, i) => (
            <div
              key={d.label}
              className="flex min-w-0 flex-1 flex-col items-center justify-end"
              style={{ height: '100%' }}
            >
              <div
                className="w-full rounded-t-[4px]"
                style={{
                  height: animate ? `${(d.value / niceMax) * 100}%` : 0,
                  background: color,
                  transition: `height 0.7s cubic-bezier(0.22,1,0.36,1) ${i * 30}ms`,
                }}
              />
            </div>
          ))}
        </div>
        <div className="absolute inset-x-0 bottom-0 flex gap-2" style={{ height: 24 }}>
          {data.map((d) => (
            <span
              key={d.label}
              className="min-w-0 flex-1 truncate text-center font-sans"
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
          aria-label="Distribution donut chart"
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
              {d.percent}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RegistrationReportsWorkspace() {
  const router = useRouter();
  const toast = useToast();
  const [animateCharts, setAnimateCharts] = useState(false);
  const [dateFrom, setDateFrom] = useState('2026-06-01');
  const [dateTo, setDateTo] = useState('2026-06-30');
  const [department, setDepartment] = useState('');
  const [registrationType, setRegistrationType] = useState('');
  const [studentCategory, setStudentCategory] = useState('');
  const [faculty, setFaculty] = useState('');
  const [gender, setGender] = useState('');
  const [ageGroup, setAgeGroup] = useState('');
  const [rows, setRows] = useState<RegistrationRecord[]>(REGISTRATION_RECORDS);
  const [currentPage, setCurrentPage] = useState(1);

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
    setDateFrom('2026-06-01');
    setDateTo('2026-06-30');
    setDepartment('');
    setRegistrationType('');
    setStudentCategory('');
    setFaculty('');
    setGender('');
    setAgeGroup('');
    setRows(REGISTRATION_RECORDS);
    setCurrentPage(1);
    toast.info('Filters reset', 'Showing all registrations.');
  }

  function handleApplyFilters() {
    const filtered = REGISTRATION_RECORDS.filter((r) => {
      if (department && r.department !== department) return false;
      if (registrationType && r.registrationType !== registrationType) return false;
      if (gender && r.gender !== gender) return false;
      const d = r.date.slice(0, 10);
      if (dateFrom && d < dateFrom) return false;
      if (dateTo && d > dateTo) return false;
      return true;
    });
    setRows(filtered);
    setCurrentPage(1);
    toast.success(
      'Filters applied',
      `${filtered.length} registration${filtered.length !== 1 ? 's' : ''} match your filters.`,
    );
  }

  const totalPages = Math.max(1, Math.ceil(rows.length / ROWS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * ROWS_PER_PAGE;
  const pageRows = rows.slice(pageStart, pageStart + ROWS_PER_PAGE);

  const exportRows = useMemo(
    () => [
      [
        'Registration ID',
        'Patient',
        'MRN',
        'Date',
        'Type',
        'Department',
        'Officer',
        'Gender',
        'Age',
        'Status',
      ],
      ...rows.map((r) => [
        r.id,
        r.patientName,
        r.mrn,
        `${formatHumanDate(r.date)} ${formatTime(r.date)}`,
        r.registrationType,
        r.department,
        r.officer,
        r.gender,
        String(r.age),
        r.status,
      ]),
    ],
    [rows],
  );

  function handleExportPDF() {
    const rowsHtml = rows
      .map(
        (r) =>
          `<tr><td>${escapeHtml(r.id)}</td><td>${escapeHtml(r.patientName)}</td><td>${escapeHtml(r.mrn)}</td><td>${escapeHtml(formatHumanDate(r.date))}</td><td>${escapeHtml(r.registrationType)}</td><td>${escapeHtml(r.department)}</td><td>${escapeHtml(r.officer)}</td><td>${escapeHtml(r.status)}</td></tr>`,
      )
      .join('');
    downloadPDF(
      'registration-reports',
      `<h1>Registration Reports</h1>
      <table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;width:100%">
        <thead><tr><th>Registration ID</th><th>Patient</th><th>MRN</th><th>Date</th><th>Type</th><th>Department</th><th>Officer</th><th>Status</th></tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>`,
    );
    toast.success('Export ready', 'Registration Reports downloaded as PDF.');
  }

  function handleExportExcel() {
    downloadCSV('registration-reports-excel', exportRows);
    toast.success('Export ready', 'Registration Reports downloaded for Excel.');
  }

  function handleExportCSV() {
    downloadCSV('registration-reports', exportRows);
    toast.success('Export ready', 'Registration Reports downloaded as CSV.');
  }

  function handlePrint() {
    handleExportPDF();
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
              Registration Reports
            </span>
          </nav>

          <div className="mt-2">
            <h1
              className="font-display font-semibold"
              style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
            >
              Registration Reports
            </h1>
            <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
              Analytics and insights on patient registrations and operational performance.
            </p>
          </div>

          {/* ── Stat cards ─────────────────────────────────────────────────── */}
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            {REPORT_STATS.map((s) => (
              <div
                key={s.id}
                className="rounded-[12px] p-4"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="flex size-9 shrink-0 items-center justify-center rounded-full"
                    style={{ background: s.iconBg }}
                  >
                    <s.icon style={{ width: 16, height: 16, color: s.color }} />
                  </div>
                  <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                    {s.label}
                  </p>
                </div>
                <p
                  className="font-display mt-2 font-semibold"
                  style={{ fontSize: 24, color: '#0D2630' }}
                >
                  {s.value}
                </p>
                <p
                  className="mt-0.5 font-sans font-medium"
                  style={{ fontSize: 14, color: s.direction === 'up' ? '#16A34A' : '#DC2626' }}
                >
                  {s.direction === 'up' ? '↑' : '↓'} {s.deltaPercent}% vs last month
                </p>
                <Sparkline data={s.sparkline} color={s.color} animate={animateCharts} />
              </div>
            ))}
          </div>

          {/* ── Filters ────────────────────────────────────────────────────── */}
          <div
            className="mt-5 rounded-[12px] p-4 sm:p-5"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
              Filters
            </h2>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <label
                  className="mb-1.5 block font-sans font-medium"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  Date Range
                </label>
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <FormDateInput
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      aria-label="From date"
                    />
                  </div>
                  <span className="shrink-0" style={{ fontSize: 14, color: '#8A98A3' }}>
                    –
                  </span>
                  <div className="min-w-0 flex-1">
                    <FormDateInput
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      aria-label="To date"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label
                  className="mb-1.5 block font-sans font-medium"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  Department
                </label>
                <FormSelect
                  id="reg-report-department"
                  value={department}
                  onChange={setDepartment}
                  options={REPORT_DEPARTMENT_OPTIONS}
                  placeholder="All Departments"
                />
              </div>
              <div>
                <label
                  className="mb-1.5 block font-sans font-medium"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  Registration Type
                </label>
                <FormSelect
                  id="reg-report-type"
                  value={registrationType}
                  onChange={setRegistrationType}
                  options={REGISTRATION_TYPE_OPTIONS}
                  placeholder="All Types"
                />
              </div>
              <div>
                <label
                  className="mb-1.5 block font-sans font-medium"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  Student Category
                </label>
                <FormSelect
                  id="reg-report-category"
                  value={studentCategory}
                  onChange={setStudentCategory}
                  options={STUDENT_CATEGORY_OPTIONS}
                  placeholder="All Categories"
                />
              </div>
              <div>
                <label
                  className="mb-1.5 block font-sans font-medium"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  Faculty
                </label>
                <FormSelect
                  id="reg-report-faculty"
                  value={faculty}
                  onChange={setFaculty}
                  options={FACULTY_OPTIONS}
                  placeholder="All Faculties"
                />
              </div>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <label
                  className="mb-1.5 block font-sans font-medium"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  Gender
                </label>
                <FormSelect
                  id="reg-report-gender"
                  value={gender}
                  onChange={setGender}
                  options={GENDER_OPTIONS}
                  placeholder="All Genders"
                />
              </div>
              <div>
                <label
                  className="mb-1.5 block font-sans font-medium"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  Age Group
                </label>
                <FormSelect
                  id="reg-report-age"
                  value={ageGroup}
                  onChange={setAgeGroup}
                  options={AGE_GROUP_OPTIONS}
                  placeholder="All Age Groups"
                />
              </div>
              <div className="flex items-end justify-end gap-2.5 lg:col-span-3">
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
          {/* Trend charts share a row — both need horizontal room for axis labels. */}
          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div
              className="rounded-[12px] p-4 sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Registrations by Day
              </p>
              <LineTrendChart data={REGISTRATIONS_BY_DAY} color="#3B82F6" animate={animateCharts} />
            </div>
            <div
              className="rounded-[12px] p-4 sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Registrations by Month
              </p>
              <BarChart data={REGISTRATIONS_BY_MONTH} color="#3B82F6" animate={animateCharts} />
            </div>
          </div>

          {/* Peak Registration Hours has 16 bars — gets a full-width row of its own. */}
          <div
            className="mt-4 rounded-[12px] p-4 sm:p-5"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
              Peak Registration Hours
            </p>
            <BarChart data={PEAK_REGISTRATION_HOURS} color="#8B5CF6" animate={animateCharts} />
          </div>

          {/* Distribution donuts are the same shape — paired together. */}
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div
              className="rounded-[12px] p-4 sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Faculty Distribution
              </p>
              <DonutChart
                data={FACULTY_DISTRIBUTION}
                total={TOTAL_REGISTRATIONS_DISPLAY}
                animate={animateCharts}
              />
            </div>
            <div
              className="rounded-[12px] p-4 sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Gender Distribution
              </p>
              <DonutChart
                data={GENDER_DISTRIBUTION}
                total={TOTAL_REGISTRATIONS_DISPLAY}
                animate={animateCharts}
              />
            </div>
          </div>

          {/* ── Registrations Details ──────────────────────────────────────── */}
          <div className="mt-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display font-semibold" style={{ fontSize: 18, color: '#0D2630' }}>
                Registrations Details
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportPDF}
                  className="flex h-10 items-center gap-1.5 rounded-[10px] px-3.5 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                  style={{
                    fontSize: 14,
                    color: '#0D2630',
                    border: '1px solid rgba(0,100,130,0.2)',
                  }}
                >
                  <FileText style={{ width: 15, height: 15, color: '#EF4444' }} />
                  Export PDF
                </button>
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="flex h-10 items-center gap-1.5 rounded-[10px] px-3.5 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                  style={{
                    fontSize: 14,
                    color: '#0D2630',
                    border: '1px solid rgba(0,100,130,0.2)',
                  }}
                >
                  <Sheet style={{ width: 15, height: 15, color: '#22C55E' }} />
                  Export Excel
                </button>
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="flex h-10 items-center gap-1.5 rounded-[10px] px-3.5 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                  style={{
                    fontSize: 14,
                    color: '#0D2630',
                    border: '1px solid rgba(0,100,130,0.2)',
                  }}
                >
                  <FileDown style={{ width: 15, height: 15, color: '#00B4D8' }} />
                  Export CSV
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex h-10 items-center gap-1.5 rounded-[10px] px-3.5 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                  style={{
                    fontSize: 14,
                    color: '#0D2630',
                    border: '1px solid rgba(0,100,130,0.2)',
                  }}
                >
                  <Printer style={{ width: 15, height: 15 }} />
                  Print
                </button>
              </div>
            </div>

            <div
              className="mt-3 rounded-[12px] p-4 sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <div className="overflow-x-auto scroll-smooth">
                <div className="min-w-[1360px]">
                  <div
                    className="flex rounded-t-[8px]"
                    style={{
                      background: 'rgba(226,237,241,0.4)',
                      borderBottom: '1px solid #E6F8FD',
                    }}
                  >
                    <div className="w-40 shrink-0 py-2.5 pr-2 pl-3">
                      <span
                        className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Registration ID
                      </span>
                    </div>
                    <div className="w-40 shrink-0 py-2.5 pr-2">
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
                    <div className="w-28 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Date
                      </span>
                    </div>
                    <div className="w-44 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Registration Type
                      </span>
                    </div>
                    <div className="min-w-[160px] flex-1 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Department
                      </span>
                    </div>
                    <div className="w-36 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Officer
                      </span>
                    </div>
                    <div className="w-24 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Gender
                      </span>
                    </div>
                    <div className="w-16 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Age
                      </span>
                    </div>
                    <div className="w-36 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Status
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
                        No registrations match your filters
                      </p>
                    </div>
                  )}

                  {pageRows.map((r, i) => {
                    const typeCfg = TYPE_CFG[r.registrationType] ?? TYPE_CFG['Appointment'];
                    const statusCfg = STATUS_CFG[r.status];
                    return (
                      <div
                        key={r.id}
                        className="flex items-center"
                        style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                      >
                        <div className="w-40 shrink-0 py-3 pr-2 pl-3">
                          <p
                            className="truncate font-sans font-medium"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {r.id}
                          </p>
                        </div>
                        <div className="flex w-40 shrink-0 items-center gap-2.5 py-3 pr-2">
                          <div
                            className="flex size-8 shrink-0 items-center justify-center rounded-full font-sans text-sm font-semibold text-white"
                            style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                          >
                            {getInitials(r.patientName)}
                          </div>
                          <p
                            className="truncate font-sans font-medium"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {r.patientName}
                          </p>
                        </div>
                        <div className="w-32 shrink-0 py-3 pr-2">
                          <p className="truncate" style={{ fontSize: 14, color: '#00B4D8' }}>
                            {r.mrn}
                          </p>
                        </div>
                        <div className="w-28 shrink-0 py-3 pr-2">
                          <p style={{ fontSize: 14, color: '#4A7080' }}>
                            {formatHumanDate(r.date)}
                          </p>
                          <p style={{ fontSize: 14, color: '#8A98A3' }}>{formatTime(r.date)}</p>
                        </div>
                        <div className="w-44 shrink-0 py-3 pr-2">
                          <span
                            className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium"
                            style={{
                              fontSize: 14,
                              whiteSpace: 'nowrap',
                              color: typeCfg?.color,
                              border: `1px solid ${typeCfg?.border}`,
                              background: typeCfg?.bg,
                            }}
                          >
                            {r.registrationType}
                          </span>
                        </div>
                        <div className="min-w-[160px] flex-1 py-3 pr-2">
                          <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                            {r.department}
                          </p>
                        </div>
                        <div className="w-36 shrink-0 py-3 pr-2">
                          <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                            {r.officer}
                          </p>
                        </div>
                        <div className="w-24 shrink-0 py-3 pr-2">
                          <p style={{ fontSize: 14, color: '#4A7080' }}>{r.gender}</p>
                        </div>
                        <div className="w-16 shrink-0 py-3 pr-2">
                          <p style={{ fontSize: 14, color: '#4A7080' }}>{r.age}</p>
                        </div>
                        <div className="w-36 shrink-0 py-3 pr-2">
                          <span
                            className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium"
                            style={{
                              fontSize: 14,
                              whiteSpace: 'nowrap',
                              color: statusCfg.color,
                              border: `1px solid ${statusCfg.border}`,
                              background: statusCfg.bg,
                            }}
                          >
                            {r.status}
                          </span>
                        </div>
                        <div className="flex w-20 shrink-0 items-center justify-end gap-1 py-3 pr-3">
                          <button
                            type="button"
                            onClick={() =>
                              toast.info(
                                'Viewing registration',
                                `Opening ${r.patientName}'s registration record.`,
                              )
                            }
                            aria-label={`View ${r.id}`}
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
                    {rows.length} registrations
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
