'use client';

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock,
  FlaskConical,
  MapPin,
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

        <div className="mt-1.75 grid grid-cols-4 gap-4">
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
        {/* Content row — items-stretch so border-right separators span full height */}
        <div className="flex items-stretch">
          {/* Current shift: icon + two-line label */}
          <div
            className="flex shrink-0 items-center gap-1.5 px-4 py-3"
            style={{ borderRight: '1px solid rgba(0,100,130,0.12)' }}
          >
            <div
              className="flex size-9 shrink-0 items-center justify-center rounded-[12px]"
              style={{ background: '#FFFBEB' }}
            >
              <Clock style={{ width: 18, height: 18, color: '#F59E0B' }} />
            </div>
            <div>
              <p className="text-sm leading-5.5 font-medium uppercase" style={{ color: '#25464D' }}>
                Today&apos;s Shift
              </p>
              <p className="text-sm leading-5.5 font-medium" style={{ color: '#0D2630' }}>
                {MOCK_SHIFT.type} · {MOCK_SHIFT.time}
              </p>
            </div>
          </div>

          {/* Location */}
          <div
            className="flex shrink-0 items-center gap-1.5 px-4"
            style={{ borderRight: '1px solid rgba(0,100,130,0.12)' }}
          >
            <MapPin style={{ width: 18, height: 18, color: '#25464D' }} />
            <span className="text-sm leading-5.5" style={{ color: '#25464D' }}>
              {MOCK_SHIFT.location}
            </span>
          </div>

          {/* Acknowledgement status */}
          <div
            className="flex shrink-0 items-center gap-1.5 px-4"
            style={{ borderRight: '1px solid rgba(0,100,130,0.12)' }}
          >
            <CheckCircle2 style={{ width: 18, height: 18, color: '#22C55E' }} />
            <span className="text-sm leading-5.5 font-medium" style={{ color: '#22C55E' }}>
              Acknowledged
            </span>
          </div>

          {/* Next shift */}
          <div
            className="flex shrink-0 items-center gap-1.5 px-4"
            style={{ borderRight: '1px solid rgba(0,100,130,0.12)' }}
          >
            <span className="text-sm leading-5.5" style={{ color: '#25464D' }}>
              Next shift:
            </span>
            <span className="text-sm leading-5.5 font-medium" style={{ color: '#25464D' }}>
              {MOCK_SHIFT.nextShift}
            </span>
          </div>

          {/* On-call pending: icon + two-line label */}
          <div className="flex shrink-0 items-center gap-1.5 px-4 py-3">
            <AlertTriangle style={{ width: 18, height: 18, color: '#F59E0B' }} />
            <div>
              <p className="text-sm leading-5.5 font-medium uppercase" style={{ color: '#F59E0B' }}>
                On-Call Pending
              </p>
              <p className="text-sm leading-5.5 font-medium" style={{ color: '#F59E0B' }}>
                {MOCK_SHIFT.onCall.schedule}
              </p>
            </div>
          </div>

          {/* View My Schedule — pinned to the right */}
          <div className="ml-auto flex shrink-0 items-center px-4">
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
    </div>
  );
}
