'use client';

import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Bell,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  FlaskConical,
  MapPin,
  MessageSquare,
  History,
  RefreshCw,
  Share2,
  Stethoscope,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useAuth } from '@hooks/useAuth';
import { ROUTES } from '@/constants/routes';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { PERMISSIONS } from '@/constants/permissions';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function formatClinicalDate(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Lagos',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

const TITLE_PREFIXES = ['Dr.', 'Nurse', 'Mr.', 'Mrs.', 'Ms.', 'Prof.'];

function parseName(fullName: string): { title: string; lastName: string } {
  const parts = fullName.split(' ').filter(Boolean);
  if (parts.length === 0) return { title: '', lastName: 'Doctor' };
  const hasTitle = TITLE_PREFIXES.includes(parts[0]!);
  const title = hasTitle ? parts[0]! : '';
  const lastName = parts[parts.length - 1] ?? (hasTitle ? parts[1] : parts[0]) ?? 'Doctor';
  return { title, lastName };
}

type PageState = 'loading' | 'loaded' | 'error';

type QuickAction = { label: string; href: string; active?: boolean } & (
  { iconSrc: string; icon?: never } | { icon: LucideIcon; iconSrc?: never }
);

type StatCard = {
  title: string;
  icon: LucideIcon;
  count: number;
  info: string;
  accent: string;
  iconBg: string;
};

type QueueStatus = 'emergency' | 'waiting' | 'in-consultation';

type QueuePatient = {
  id: string;
  initials: string;
  avatarBg: string;
  name: string;
  symptoms: string;
  status: QueueStatus;
  waitTime: string | null; // null → "In progress" (patient is already being seen)
};

type Alert = {
  id: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  title: string;
  body: string;
  time: string;
  unread: boolean;
};

type RecentActivity = {
  id: string;
  header: string;
  patient: string;
  time: string;
  dotColor: string;
};

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: 'Start Consultation',
    href: '/encounters',
    iconSrc: '/icons/consultation.png',
    active: true,
  },
  { label: 'Write Clinical Note', href: '/encounters', icon: ClipboardList },
  {
    label: 'Create Prescription',
    href: '/encounters/prescriptions',
    iconSrc: '/icons/create%20prescription.png',
  },
  { label: 'Request Laboratory Test', href: '/lab/orders', icon: FlaskConical },
];

// Mock shift — will be replaced with real API data in Phase 6
const MOCK_SHIFT = {
  type: 'Morning Shift',
  time: '07:00 – 13:00',
  location: 'General OPD, Block C',
  nextShift: 'Tomorrow · Afternoon 13:00',
  onCall: { schedule: 'Fri Jul 4 · 19:00 – 07:00' },
  progressPercent: 38.5,
};

// Mock emergency — will be replaced with real API data in Phase 6
const MOCK_EMERGENCY = {
  count: 1,
  patientName: 'Ngozi Adeyemi',
  complaint: 'Chest pain and difficulty breathing — sudden onset',
};

// Mock stat cards — will be replaced with real API data in Phase 6
const MOCK_STAT_CARDS: StatCard[] = [
  {
    title: 'Assigned Patients',
    icon: Users,
    count: 8,
    info: '2 in session',
    accent: '#0098CC',
    iconBg: 'rgba(0,152,204,0.1)',
  },
  {
    title: 'Pending Consultations',
    icon: Stethoscope,
    count: 4,
    info: '1 emergency',
    accent: '#F59E0B',
    iconBg: 'rgba(245,158,11,0.1)',
  },
  {
    title: 'Lab Results Ready',
    icon: FlaskConical,
    count: 3,
    info: '1 critical result',
    accent: '#EF4444',
    iconBg: 'rgba(239,68,68,0.1)',
  },
  {
    title: 'Active Referrals',
    icon: Share2,
    count: 3,
    info: '2 awaiting response',
    accent: '#3B82F6',
    iconBg: 'rgba(59,130,246,0.1)',
  },
];

const QUEUE_STATUS_CONFIG: Record<
  QueueStatus,
  {
    label: string;
    borderLeft: string;
    rowBg: string;
    badgeBg: string;
    badgeBorder: string;
    badgeText: string;
  }
> = {
  emergency: {
    label: 'Emergency',
    borderLeft: '#EF4444',
    rowBg: 'rgba(239,68,68,0.04)',
    badgeBg: 'rgba(239,68,68,0.1)',
    badgeBorder: 'rgba(239,68,68,0.3)',
    badgeText: '#EF4444',
  },
  waiting: {
    label: 'Waiting',
    borderLeft: '#F59E0B',
    rowBg: 'rgba(245,158,11,0.04)',
    badgeBg: '#FFFBEB',
    badgeBorder: '#FEE685',
    badgeText: '#F59E0B',
  },
  'in-consultation': {
    label: 'In Consultation',
    borderLeft: '#00B4D8',
    rowBg: 'transparent',
    badgeBg: 'rgba(0,180,216,0.08)',
    badgeBorder: 'rgba(0,180,216,0.3)',
    badgeText: '#00B4D8',
  },
};

// Mock patient queue — will be replaced with real API data in Phase 6
const MOCK_QUEUE: QueuePatient[] = [
  {
    id: 'q1',
    initials: 'NA',
    avatarBg: '#EF4444',
    name: 'Ngozi Adeyemi',
    symptoms: 'Chest pain and difficulty breathing — sudden onset',
    status: 'emergency',
    waitTime: '12 min',
  },
  {
    id: 'q2',
    initials: 'AO',
    avatarBg: '#F59E0B',
    name: 'Adaeze Okonkwo',
    symptoms: 'Persistent headache and fever for 3 days',
    status: 'waiting',
    waitTime: '47 min',
  },
  {
    id: 'q3',
    initials: 'CE',
    avatarBg: '#00B4D8',
    name: 'Chukwuemeka Eze',
    symptoms: 'Abdominal pain and nausea since yesterday',
    status: 'in-consultation',
    waitTime: null,
  },
  {
    id: 'q4',
    initials: 'CO',
    avatarBg: '#0098CC',
    name: 'Chinwe Okafor',
    symptoms: 'Diffuse skin rash and itching for 5 days',
    status: 'waiting',
    waitTime: '31 min',
  },
  {
    id: 'q5',
    initials: 'DO',
    avatarBg: '#F97316',
    name: 'David Osei',
    symptoms: 'Severe throbbing headache, photophobia, neck stiffness',
    status: 'waiting',
    waitTime: '58 min',
  },
  {
    id: 'q6',
    initials: 'AN',
    avatarBg: '#22C55E',
    name: 'Amaka Nwosu',
    symptoms: 'Irregular menstrual cycle and pelvic pain',
    status: 'in-consultation',
    waitTime: null,
  },
];

// Mock alerts — will be replaced with real API data in Phase 6
const MOCK_ALERTS: Alert[] = [
  {
    id: 'al1',
    icon: AlertTriangle,
    iconBg: 'rgba(239,68,68,0.1)',
    iconColor: '#EF4444',
    title: 'Critical Lab Result',
    body: 'FBC for Adaeze Okonkwo requires immediate attention. WBC: 18.4 — CRITICAL HIGH.',
    time: '10 min ago',
    unread: true,
  },
  {
    id: 'al2',
    icon: FlaskConical,
    iconBg: 'rgba(34,197,94,0.1)',
    iconColor: '#22C55E',
    title: 'New Patient Assigned',
    body: 'Ngozi Adeyemi assigned to you as emergency. Chief complaint: Chest pain and difficulty breathing.',
    time: '23 min ago',
    unread: true,
  },
  {
    id: 'al3',
    icon: Share2,
    iconBg: 'rgba(139,92,246,0.1)',
    iconColor: '#8B5CF6',
    title: 'Referral Accepted',
    body: 'Dr. Chidi Anyanwu (Cardiology) accepted your referral for Ibrahim Musa. Appointment: Jul 3, 2026.',
    time: '1 hr ago',
    unread: true,
  },
  {
    id: 'al4',
    icon: MessageSquare,
    iconBg: 'rgba(99,102,241,0.1)',
    iconColor: '#6366F1',
    title: 'Clinical Message — Dr. Okafor',
    body: 'Regarding Chinwe Okafor: Please review the dermatology consult notes attached to her record.',
    time: '3 hrs ago',
    unread: false,
  },
];

// Mock recent activities — will be replaced with real API data in Phase 6
const MOCK_ACTIVITIES: RecentActivity[] = [
  {
    id: 'ra1',
    header: 'Emergency patient admitted',
    patient: 'Ngozi Adeyemi',
    time: '10:38 AM',
    dotColor: '#EF4444',
  },
  {
    id: 'ra2',
    header: 'Consultation completed',
    patient: 'Babatunde Alade',
    time: '10:22 AM',
    dotColor: '#22C55E',
  },
  {
    id: 'ra3',
    header: 'Critical lab result received',
    patient: 'Adaeze Okonkwo — FBC',
    time: '10:05 AM',
    dotColor: '#EF4444',
  },
  {
    id: 'ra4',
    header: 'Prescription sent to pharmacy',
    patient: 'Babatunde Alade',
    time: '09:52 AM',
    dotColor: '#F59E0B',
  },
  {
    id: 'ra5',
    header: 'Referral sent to Cardiology',
    patient: 'Ibrahim Musa',
    time: '09:30 AM',
    dotColor: '#8B5CF6',
  },
  {
    id: 'ra6',
    header: 'Consultation started',
    patient: 'Ibrahim Musa',
    time: '09:15 AM',
    dotColor: '#22C55E',
  },
];

// ── Skeleton components ───────────────────────────────────────────────────────

function SkeletonStatCard() {
  return (
    <div
      className="flex flex-col rounded-[12px] p-4"
      style={{
        background: '#FFFFFF',
        border: '1px solid rgba(0,180,216,0.25)',
        borderTopWidth: 3,
      }}
    >
      <div className="flex items-start justify-between">
        <div className="animate-pulse rounded bg-slate-200" style={{ width: 120, height: 20 }} />
        <div
          className="shrink-0 animate-pulse rounded-[12px] bg-slate-200"
          style={{ width: 40, height: 40 }}
        />
      </div>
      <div
        className="mt-1.5 animate-pulse rounded bg-slate-200"
        style={{ width: 64, height: 36 }}
      />
      <div className="mt-1 animate-pulse rounded bg-slate-200" style={{ width: 100, height: 18 }} />
    </div>
  );
}

function SkeletonQueueRow({ isLast }: { isLast: boolean }) {
  return (
    <div
      className="flex items-center gap-2 py-3 pr-4 pl-4 sm:gap-4.5"
      style={{
        borderLeft: '3px solid rgba(0,180,216,0.15)',
        borderBottom: isLast ? undefined : '1px solid rgba(0,100,130,0.12)',
      }}
    >
      <div
        className="shrink-0 animate-pulse rounded-full bg-slate-200"
        style={{ width: 40, height: 40 }}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="animate-pulse rounded bg-slate-200" style={{ width: 130, height: 18 }} />
        <div className="animate-pulse rounded bg-slate-200" style={{ width: 200, height: 16 }} />
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <div
          className="animate-pulse rounded-full bg-slate-200"
          style={{ width: 70, height: 22 }}
        />
        <div className="animate-pulse rounded bg-slate-200" style={{ width: 60, height: 16 }} />
      </div>
    </div>
  );
}

function SkeletonAlertRow({ isLast }: { isLast: boolean }) {
  return (
    <div
      className="p-3.5"
      style={{ borderBottom: isLast ? undefined : '1px solid rgba(0,180,216,0.25)' }}
    >
      <div className="flex gap-2.5">
        <div className="shrink-0 pt-0.5">
          <div
            className="animate-pulse rounded-[8px] bg-slate-200"
            style={{ width: 28, height: 28 }}
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="animate-pulse rounded bg-slate-200" style={{ width: 110, height: 18 }} />
          <div
            className="animate-pulse rounded bg-slate-200"
            style={{ width: '90%', height: 16 }}
          />
          <div className="animate-pulse rounded bg-slate-200" style={{ width: 60, height: 16 }} />
        </div>
      </div>
    </div>
  );
}

function SkeletonActivityCard() {
  return (
    <div
      className="flex gap-3 p-3.5"
      style={{ background: '#E6F8FD', borderRight: '1px solid #00B4D8' }}
    >
      <div className="shrink-0 pt-1">
        <div className="flex size-6 items-center justify-center rounded-full">
          <div className="size-3 animate-pulse rounded-full bg-slate-300" />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="animate-pulse rounded bg-slate-200" style={{ width: 140, height: 18 }} />
        <div className="animate-pulse rounded bg-slate-200" style={{ width: 110, height: 16 }} />
        <div className="animate-pulse rounded bg-slate-200" style={{ width: 60, height: 16 }} />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { title, lastName } = parseName(user?.name ?? '');
  const [pageState, setPageState] = useState<PageState>('loading');

  useEffect(() => {
    const t = setTimeout(() => setPageState('loaded'), 800);
    return () => clearTimeout(t);
  }, []);

  function handleRetry() {
    setPageState('loading');
    setTimeout(() => setPageState('loaded'), 800);
  }

  return (
    <div className="px-4 pt-6 pb-24 sm:px-6 lg:px-12 lg:pt-10">
      {/* ── Greeting row ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-y-3 sm:items-center">
        <div>
          <h1
            className="font-display text-2xl leading-8 font-semibold"
            style={{ color: '#00B4D8' }}
          >
            {getGreeting()}, {title} {lastName}
          </h1>
          <p
            className="mt-1 text-sm leading-5.5"
            style={{ color: '#25464D' }}
            suppressHydrationWarning
          >
            {formatClinicalDate(new Date())} — Clinical day summary
          </p>
        </div>

        {/* 1 Emergency Active badge */}
        {MOCK_EMERGENCY.count > 0 && (
          <div
            className="flex shrink-0 items-center gap-1.5 rounded-[8px] px-3 pt-1.5 pb-1.25"
            style={{ background: '#FEF2F2', border: '1px solid #EF4444' }}
          >
            <Activity className="shrink-0" style={{ width: 14, height: 14, color: '#EF4444' }} />
            <span className="text-sm leading-5.5 font-medium" style={{ color: '#EF4444' }}>
              {MOCK_EMERGENCY.count} Emergency Active
            </span>
          </div>
        )}
      </div>

      {/* ── Emergency banner ─────────────────────────────────────────── */}
      {MOCK_EMERGENCY.count > 0 && (
        <div
          className="mt-3.5 flex flex-col gap-3 rounded-[12px] p-3.5 sm:flex-row sm:items-center"
          style={{ background: '#FEF2F2', border: '1px solid #EF4444' }}
        >
          {/* Icon + text in a horizontal sub-row at all sizes */}
          <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
            <div
              className="flex size-9 shrink-0 items-center justify-center rounded-[12px]"
              style={{ background: '#FFE2E2' }}
            >
              <AlertTriangle style={{ width: 18, height: 18, color: '#EF4444' }} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-base leading-6 font-semibold" style={{ color: '#EF4444' }}>
                Emergency Patient Requires Immediate Attention
              </p>
              <p className="text-sm leading-5.5" style={{ color: '#EF4444' }}>
                {MOCK_EMERGENCY.patientName} — {MOCK_EMERGENCY.complaint}
              </p>
            </div>
          </div>

          {/* Button — full-width on mobile, auto-width inline on sm+ */}
          <button
            type="button"
            onClick={() => router.push(ROUTES.patients)}
            className="flex w-full items-center justify-center gap-1.5 rounded-[12px] px-4 py-2 text-sm leading-5.5 font-medium text-white transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none sm:w-auto sm:shrink-0 sm:justify-start"
            style={{ background: '#EF4444' }}
          >
            Open Record
            <ArrowRight style={{ width: 14, height: 14 }} />
          </button>
        </div>
      )}

      {/* ── Quick Actions ─────────────────────────────────────────────── */}
      <div className="mt-8 lg:mt-14">
        <p className="text-base leading-6" style={{ color: '#4A7080' }}>
          Quick Actions
        </p>

        <div className="mt-1.75 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {QUICK_ACTIONS.map((action) => {
            const Icon = 'icon' in action ? action.icon : null;
            return (
              <Link
                key={action.label}
                href={action.href}
                className="flex items-center gap-3 rounded-[12px] p-3.5 transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                style={
                  action.active
                    ? { background: '#00B4D8', border: '1px solid rgba(0,0,0,0.1)' }
                    : { background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }
                }
              >
                <div
                  className="flex size-9 shrink-0 items-center justify-center rounded-[12px]"
                  style={{ background: action.active ? 'rgba(255,255,255,0.2)' : '#E2EDF1' }}
                >
                  {'iconSrc' in action ? (
                    <Image
                      src={action.iconSrc}
                      alt=""
                      width={18}
                      height={18}
                      aria-hidden
                      className="shrink-0"
                      style={action.active ? { filter: 'brightness(0) invert(1)' } : undefined}
                    />
                  ) : Icon ? (
                    <Icon
                      style={{
                        width: 18,
                        height: 18,
                        color: action.active ? '#FFFFFF' : '#00B4D8',
                      }}
                    />
                  ) : null}
                </div>
                <span
                  className="text-base leading-6 font-semibold"
                  style={{ color: action.active ? '#FFFFFF' : '#00B4D8' }}
                >
                  {action.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Today's Shift strip ──────────────────────────────────────── */}
      <div
        className="mt-6 overflow-hidden rounded-[12px] lg:mt-8"
        style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
      >
        {/*
          < sm:  flex-col — all 6 sections stack vertically (border-b separators)
          sm–xl: flex-col — same stacked layout
          2xl+:  flex-row items-stretch — single horizontal strip (border-r separators)

          Breakpoint rationale: sections total ~1137px (at px-3 padding).
          At 2xl (1536px) with an expanded 280px sidebar and 96px page padding,
          the usable content width is 1160px — just enough to hold all sections
          without any overflow or scrolling.
        */}
        <div className="flex flex-col 2xl:flex-row 2xl:items-stretch">
          {/* Current shift: icon + two-line label */}
          <div
            className="flex shrink-0 items-center gap-1.5 border-b px-3 py-3 2xl:border-r 2xl:border-b-0"
            style={{ borderColor: 'rgba(0,100,130,0.12)' }}
          >
            <div
              className="flex size-9 shrink-0 items-center justify-center rounded-[12px]"
              style={{ background: '#FFFBEB' }}
            >
              <Clock style={{ width: 18, height: 18, color: '#F59E0B' }} />
            </div>
            <div>
              <p
                className="text-sm leading-5.5 font-medium whitespace-nowrap uppercase"
                style={{ color: '#25464D' }}
              >
                Today&apos;s Shift
              </p>
              <p
                className="text-sm leading-5.5 font-medium whitespace-nowrap"
                style={{ color: '#0D2630' }}
              >
                {MOCK_SHIFT.type} · {MOCK_SHIFT.time}
              </p>
            </div>
          </div>

          {/* Location */}
          <div
            className="flex shrink-0 items-center gap-1.5 border-b px-3 py-3 2xl:border-r 2xl:border-b-0"
            style={{ borderColor: 'rgba(0,100,130,0.12)' }}
          >
            <MapPin style={{ width: 18, height: 18, color: '#25464D' }} />
            <span className="text-sm leading-5.5 whitespace-nowrap" style={{ color: '#25464D' }}>
              {MOCK_SHIFT.location}
            </span>
          </div>

          {/* Acknowledgement status */}
          <div
            className="flex shrink-0 items-center gap-1.5 border-b px-3 py-3 2xl:border-r 2xl:border-b-0"
            style={{ borderColor: 'rgba(0,100,130,0.12)' }}
          >
            <CheckCircle2 style={{ width: 18, height: 18, color: '#22C55E' }} />
            <span
              className="text-sm leading-5.5 font-medium whitespace-nowrap"
              style={{ color: '#22C55E' }}
            >
              Acknowledged
            </span>
          </div>

          {/* Next shift */}
          <div
            className="flex shrink-0 items-center gap-1.5 border-b px-3 py-3 2xl:border-r 2xl:border-b-0"
            style={{ borderColor: 'rgba(0,100,130,0.12)' }}
          >
            <span className="text-sm leading-5.5 whitespace-nowrap" style={{ color: '#25464D' }}>
              Next shift:
            </span>
            <span
              className="text-sm leading-5.5 font-medium whitespace-nowrap"
              style={{ color: '#25464D' }}
            >
              {MOCK_SHIFT.nextShift}
            </span>
          </div>

          {/* On-call pending: icon + two-line label */}
          <div
            className="flex shrink-0 items-center gap-1.5 border-b px-3 py-3 2xl:border-b-0"
            style={{ borderColor: 'rgba(0,100,130,0.12)' }}
          >
            <AlertTriangle style={{ width: 18, height: 18, color: '#F59E0B' }} />
            <div>
              <p
                className="text-sm leading-5.5 font-medium whitespace-nowrap uppercase"
                style={{ color: '#F59E0B' }}
              >
                On-Call Pending
              </p>
              <p
                className="text-sm leading-5.5 font-medium whitespace-nowrap"
                style={{ color: '#F59E0B' }}
              >
                {MOCK_SHIFT.onCall.schedule}
              </p>
            </div>
          </div>

          {/* View My Schedule — full width on mobile, pinned right on 2xl */}
          <div className="flex shrink-0 items-center px-3 py-3 2xl:ml-auto">
            <button
              type="button"
              onClick={() => router.push(ROUTES.dutyRoster)}
              className="flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-sm leading-5.5 font-medium transition-opacity duration-150 hover:opacity-70 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
              style={{
                background: '#FFFFFF',
                border: '1px solid rgba(0,100,130,0.12)',
                color: '#25464D',
              }}
            >
              <Calendar style={{ width: 18, height: 18 }} />
              View My Schedule
            </button>
          </div>
        </div>

        {/* Progress bar — amber fill showing shift progress */}
        <div className="h-1" style={{ background: '#E2EDF1' }}>
          <div
            className="h-1 rounded-r-full"
            style={{ background: '#F59E0B', width: `${MOCK_SHIFT.progressPercent}%` }}
          />
        </div>
      </div>

      {/* ── Stat cards ───────────────────────────────────────────────── */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-10.5">
        {pageState === 'loading' ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonStatCard key={i} />)
        ) : pageState === 'error' ? (
          <div className="col-span-full flex flex-col items-center justify-center gap-3 py-10 text-center">
            <AlertCircle style={{ width: 36, height: 36, color: '#EF4444' }} />
            <p className="font-sans font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
              Failed to load dashboard data
            </p>
            <button
              type="button"
              onClick={handleRetry}
              className="flex items-center gap-2 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-80 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
              style={{
                height: 40,
                borderRadius: 12,
                padding: '0 20px',
                background: '#00B4D8',
                fontSize: 14,
                lineHeight: '22px',
              }}
            >
              <RefreshCw style={{ width: 16, height: 16 }} />
              Retry
            </button>
          </div>
        ) : (
          MOCK_STAT_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className="flex cursor-pointer flex-col rounded-[12px] p-4 transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-md"
                style={{
                  background: '#FFFFFF',
                  border: `1px solid ${card.accent}`,
                  borderTopWidth: '3px',
                }}
              >
                {/* Title row: text left, icon right */}
                <div className="flex items-start justify-between">
                  <p className="text-base leading-6 font-semibold" style={{ color: '#25464D' }}>
                    {card.title}
                  </p>
                  <div
                    className="flex size-10 shrink-0 items-center justify-center rounded-[12px]"
                    style={{ background: card.iconBg }}
                  >
                    <Icon style={{ width: 24, height: 24, color: card.accent }} />
                  </div>
                </div>

                {/* Count — Outfit Black 30 / 36, accent colour */}
                <p
                  className="font-display mt-1.5 text-[30px] leading-9 font-black"
                  style={{ color: card.accent }}
                >
                  {card.count}
                </p>

                {/* Info label — DM Sans Regular 14, muted */}
                <p className="mt-1 text-sm leading-5.5" style={{ color: '#4A7080' }}>
                  {card.info}
                </p>
              </div>
            );
          })
        )}
      </div>

      {/* ── Two-panel section: Patient Queue + Alerts ────────────────── */}
      {/*
        2xl: breakpoint rationale — both panels together are ~1139px.
        At 2xl (1536px) with an expanded sidebar + page padding the available
        width is 1160px, just enough to seat them side by side without overflow.
      */}
      <div className="mt-6 flex flex-col gap-6 2xl:flex-row 2xl:items-start">
        {/* ── Patient Queue card ────────────────────────────────────────── */}
        <div
          className="overflow-hidden rounded-[12px] 2xl:w-[696px] 2xl:shrink-0"
          style={{
            background: '#FFFFFF',
            border: '1px solid rgba(0,180,216,0.2)',
            boxShadow: '0px 1px 3px 0px rgba(0,0,0,0.05)',
          }}
        >
          {/* Card header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
          >
            {/* Left: icon + title + "N waiting" badge */}
            <div className="flex items-center gap-2">
              <Users style={{ width: 18, height: 18, color: '#00B4D8' }} />
              <span
                className="font-display text-[20px] leading-7 font-semibold"
                style={{ color: '#00B4D8' }}
              >
                Patient Queue
              </span>
              <div
                className="inline-flex items-center rounded-full border px-2 py-0.5"
                style={{ background: '#FFFBEB', borderColor: '#FEE685' }}
              >
                <span className="text-sm leading-5.5 font-medium" style={{ color: '#F59E0B' }}>
                  {MOCK_QUEUE.filter((p) => p.status !== 'in-consultation').length} waiting
                </span>
              </div>
            </div>

            {/* Right: View All link */}
            <button
              type="button"
              onClick={() => router.push(ROUTES.encounters)}
              className="flex items-center gap-0.5 transition-opacity duration-150 hover:opacity-70 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
            >
              <span className="text-sm leading-5.5" style={{ color: '#00B4D8' }}>
                View All
              </span>
              <ChevronRight style={{ width: 14, height: 14, color: '#00B4D8' }} />
            </button>
          </div>

          {/* Patient rows */}
          <div>
            {pageState === 'loading'
              ? Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonQueueRow key={i} isLast={i === 5} />
                ))
              : MOCK_QUEUE.map((patient, idx) => {
                  const cfg = QUEUE_STATUS_CONFIG[patient.status];
                  const isLast = idx === MOCK_QUEUE.length - 1;
                  return (
                    <div
                      key={patient.id}
                      className="flex items-center gap-2 py-3 pr-4 pl-4 transition-colors duration-100 hover:bg-[#F5FBFD] sm:gap-4.5"
                      style={{
                        background: cfg.rowBg,
                        borderLeft: `3px solid ${cfg.borderLeft}`,
                        borderBottom: isLast ? undefined : '1px solid rgba(0,100,130,0.12)',
                      }}
                    >
                      {/* Avatar circle with initials */}
                      <div
                        className="flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                        style={{ background: patient.avatarBg }}
                      >
                        {patient.initials}
                      </div>

                      {/* Name + symptoms */}
                      <div className="min-w-0 flex-1">
                        <p className="text-base leading-6" style={{ color: '#00B4D8' }}>
                          {patient.name}
                        </p>
                        <p className="truncate text-sm leading-5.5" style={{ color: '#25464D' }}>
                          {patient.symptoms}
                        </p>
                      </div>

                      {/* Status badge + wait time */}
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <div
                          className="inline-flex items-center rounded-full border px-2 py-0.5"
                          style={{ background: cfg.badgeBg, borderColor: cfg.badgeBorder }}
                        >
                          <span
                            className="text-sm leading-5.5 font-medium whitespace-nowrap"
                            style={{ color: cfg.badgeText }}
                          >
                            {cfg.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock style={{ width: 14, height: 14, color: '#25464D' }} />
                          <span className="text-sm leading-[22px]" style={{ color: '#25464D' }}>
                            {patient.waitTime ?? 'In progress'}
                          </span>
                        </div>
                      </div>

                      {/* Consult button — hidden on mobile, space too tight */}
                      <PermissionGate permission={PERMISSIONS.ENCOUNTERS_WRITE}>
                        <div className="hidden shrink-0 pl-1 sm:block">
                          <button
                            type="button"
                            className="h-9 rounded-[8px] bg-white px-[10px] text-sm leading-5.5 font-medium text-[#00B4D8] transition-colors duration-150 hover:bg-[#00B4D8] hover:text-white focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                            style={{ border: '1px solid #00B4D8' }}
                          >
                            Consult
                          </button>
                        </div>
                      </PermissionGate>
                    </div>
                  );
                })}
          </div>
        </div>

        {/* ── Alerts card ───────────────────────────────────────────────── */}
        <div
          className="overflow-hidden rounded-[12px] 2xl:flex-1"
          style={{
            background: '#FFFFFF',
            border: '1px solid rgba(0,180,216,0.2)',
            boxShadow: '0px 1px 3px 0px rgba(0,0,0,0.05)',
          }}
        >
          {/* Card header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
          >
            {/* Left: bell + title + "N new" badge */}
            <div className="flex items-center gap-2">
              <Bell style={{ width: 18, height: 18, color: '#00B4D8' }} />
              <span
                className="font-display text-[20px] leading-7 font-semibold"
                style={{ color: '#00B4D8' }}
              >
                Alerts
              </span>
              <div
                className="inline-flex items-center rounded-full border px-2 py-0.5"
                style={{ background: '#FEF2F2', borderColor: '#FFC9C9' }}
              >
                <span className="text-sm leading-5.5 font-medium" style={{ color: '#EF4444' }}>
                  {MOCK_ALERTS.filter((a) => a.unread).length} new
                </span>
              </div>
            </div>

            {/* Right: View All */}
            <button
              type="button"
              onClick={() => router.push(ROUTES.notifications)}
              className="flex items-center gap-0.5 transition-opacity duration-150 hover:opacity-70 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
            >
              <span className="text-sm leading-5.5" style={{ color: '#00B4D8' }}>
                View All
              </span>
              <ChevronRight style={{ width: 14, height: 14, color: '#00B4D8' }} />
            </button>
          </div>

          {/* Alert rows */}
          <div>
            {pageState === 'loading'
              ? Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonAlertRow key={i} isLast={i === 3} />
                ))
              : MOCK_ALERTS.map((alert, idx) => {
                  const Icon = alert.icon;
                  const isLast = idx === MOCK_ALERTS.length - 1;
                  return (
                    <div
                      key={alert.id}
                      className="p-3.5"
                      style={{
                        background: 'rgba(239,246,255,0.4)',
                        borderBottom: isLast ? undefined : '1px solid rgba(0,180,216,0.25)',
                      }}
                    >
                      <div className="flex gap-2.5">
                        {/* Icon box — 2px top offset to align with title baseline */}
                        <div className="shrink-0 pt-0.5">
                          <div
                            className="flex size-7 items-center justify-center rounded-[8px]"
                            style={{ background: alert.iconBg }}
                          >
                            <Icon style={{ width: 18, height: 18, color: alert.iconColor }} />
                          </div>
                        </div>

                        {/* Text content */}
                        <div className="min-w-0 flex-1">
                          {/* Title + unread dot */}
                          <div className="flex items-center gap-1.5">
                            <span
                              className="text-sm leading-5.5 font-medium"
                              style={{ color: '#00B4D8' }}
                            >
                              {alert.title}
                            </span>
                            {alert.unread && (
                              <span
                                className="size-1.5 shrink-0 rounded-full"
                                style={{ background: '#00B4D8' }}
                              />
                            )}
                          </div>

                          {/* Body — two lines */}
                          <p className="text-sm leading-5.5" style={{ color: '#25464D' }}>
                            {alert.body}
                          </p>

                          {/* Timestamp */}
                          <p className="text-sm leading-[22px]" style={{ color: '#25464D' }}>
                            {alert.time}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
          </div>
        </div>
      </div>

      {/* ── Recent Clinical Activities ────────────────────────────────── */}
      <div className="mt-8">
        {/* Section label */}
        <div className="flex items-center gap-2">
          <History style={{ width: 18, height: 18, color: '#00B4D8' }} />
          <span
            className="font-display text-base leading-6 font-semibold"
            style={{ color: '#00B4D8' }}
          >
            Recent Clinical Activities
          </span>
        </div>

        {/* 3-column activity grid */}
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3 xl:gap-9">
          {pageState === 'loading'
            ? Array.from({ length: 6 }).map((_, i) => <SkeletonActivityCard key={i} />)
            : MOCK_ACTIVITIES.map((activity) => (
                <div
                  key={activity.id}
                  className="flex gap-3 p-3.5"
                  style={{ background: '#E6F8FD', borderRight: '1px solid #00B4D8' }}
                >
                  {/* Coloured status dot — 12×12 inside a 24×24 alignment container */}
                  <div className="shrink-0 pt-1">
                    <div className="flex size-6 items-center justify-center rounded-full">
                      <span
                        className="size-3 rounded-full"
                        style={{ background: activity.dotColor }}
                      />
                    </div>
                  </div>

                  {/* Text stack */}
                  <div>
                    <p className="text-sm leading-5.5 font-medium" style={{ color: '#00B4D8' }}>
                      {activity.header}
                    </p>
                    <p className="text-sm leading-5.5" style={{ color: '#4A7080' }}>
                      {activity.patient}
                    </p>
                    <p className="text-sm leading-5.5" style={{ color: '#25464D' }}>
                      {activity.time}
                    </p>
                  </div>
                </div>
              ))}
        </div>
      </div>
    </div>
  );
}
