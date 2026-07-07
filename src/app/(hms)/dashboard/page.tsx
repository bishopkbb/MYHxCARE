'use client';

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  FlaskConical,
  MapPin,
  Share2,
  Stethoscope,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { useAuth } from '@hooks/useAuth';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function formatClinicalDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
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

export default function DashboardPage() {
  const { user } = useAuth();
  const { title, lastName } = parseName(user?.name ?? '');

  return (
    <div className="px-12 pt-10">
      {/* ── Greeting row ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
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
            className="flex items-center gap-1.5 rounded-[8px] px-3 pt-1.5 pb-1.25"
            style={{ background: '#FEF2F2', border: '1px solid #EF4444' }}
          >
            <Activity className="shrink-0" style={{ width: 12, height: 12, color: '#EF4444' }} />
            <span className="text-sm leading-5.5 font-medium" style={{ color: '#EF4444' }}>
              {MOCK_EMERGENCY.count} Emergency Active
            </span>
          </div>
        )}
      </div>

      {/* ── Emergency banner ─────────────────────────────────────────── */}
      {MOCK_EMERGENCY.count > 0 && (
        <div
          className="mt-3.5 flex items-center gap-3 rounded-[12px] p-3.5"
          style={{ background: '#FEF2F2', border: '1px solid #EF4444' }}
        >
          {/* Alert icon container */}
          <div
            className="flex size-9 shrink-0 items-center justify-center rounded-[12px]"
            style={{ background: '#FFE2E2' }}
          >
            <AlertTriangle style={{ width: 18, height: 18, color: '#EF4444' }} />
          </div>

          {/* Text */}
          <div className="min-w-0 flex-1">
            <p className="text-base leading-6 font-semibold" style={{ color: '#EF4444' }}>
              Emergency Patient Requires Immediate Attention
            </p>
            <p className="text-sm leading-5.5" style={{ color: '#EF4444' }}>
              {MOCK_EMERGENCY.patientName} — {MOCK_EMERGENCY.complaint}
            </p>
          </div>

          {/* Open Record button */}
          <button
            type="button"
            className="flex shrink-0 items-center gap-1.5 rounded-[12px] px-4 py-2 text-sm leading-5.5 font-medium text-white transition-opacity hover:opacity-90"
            style={{ background: '#EF4444' }}
          >
            Open Record
            <ArrowRight style={{ width: 12, height: 12 }} />
          </button>
        </div>
      )}

      {/* ── Quick Actions ─────────────────────────────────────────────── */}
      <div className="mt-14">
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
                className="flex items-center gap-3 rounded-[12px] p-3.5 transition-opacity hover:opacity-90"
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
        className="mt-8 overflow-hidden rounded-[12px]"
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
              className="flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-sm leading-5.5 font-medium transition-opacity hover:opacity-70"
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
        {MOCK_STAT_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="flex flex-col rounded-[12px] p-4"
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
        })}
      </div>

      {/* ── Two-panel section: Patient Queue + Right Panel ───────────── */}
      <div className="mt-6 flex flex-col gap-6 xl:flex-row xl:items-start">
        {/* ── Patient Queue card ────────────────────────────────────────── */}
        <div
          className="overflow-hidden rounded-[12px] xl:w-[696px] xl:shrink-0"
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
              className="flex items-center gap-0.5 transition-opacity hover:opacity-70"
            >
              <span className="text-sm leading-5.5" style={{ color: '#00B4D8' }}>
                View All
              </span>
              <ChevronRight style={{ width: 12, height: 12, color: '#00B4D8' }} />
            </button>
          </div>

          {/* Patient rows */}
          <div>
            {MOCK_QUEUE.map((patient, idx) => {
              const cfg = QUEUE_STATUS_CONFIG[patient.status];
              const isLast = idx === MOCK_QUEUE.length - 1;
              return (
                <div
                  key={patient.id}
                  className="flex items-center gap-4.5 py-3 pr-4 pl-4"
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
                      <Clock style={{ width: 9, height: 9, color: '#25464D' }} />
                      <span className="text-xs leading-[18px]" style={{ color: '#25464D' }}>
                        {patient.waitTime ?? 'In progress'}
                      </span>
                    </div>
                  </div>

                  {/* Consult button */}
                  <div className="shrink-0 pl-1">
                    <button
                      type="button"
                      className="h-9 rounded-[8px] px-[10px] text-sm leading-5.5 font-medium transition-colors hover:bg-[#00B4D8] hover:text-white"
                      style={{ border: '1px solid #00B4D8', color: '#00B4D8' }}
                    >
                      Consult
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right panel — to be built next */}
        <div className="xl:flex-1" />
      </div>
    </div>
  );
}
