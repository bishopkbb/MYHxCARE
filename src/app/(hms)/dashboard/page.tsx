'use client';

import { Activity, AlertTriangle, ArrowRight, ClipboardList, FlaskConical } from 'lucide-react';
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
            className="mt-1 text-sm leading-5"
            style={{ color: '#25464D' }}
            suppressHydrationWarning
          >
            {formatClinicalDate(new Date())} — Clinical day summary
          </p>
        </div>

        {/* 1 Emergency Active badge */}
        {MOCK_EMERGENCY.count > 0 && (
          <div
            className="flex items-center gap-1.5 rounded-[8px] px-3 py-1.5"
            style={{ background: '#FEF2F2', border: '1px solid #EF4444' }}
          >
            <Activity className="shrink-0" style={{ width: 12, height: 12, color: '#EF4444' }} />
            <span className="text-xs leading-4 font-semibold" style={{ color: '#EF4444' }}>
              {MOCK_EMERGENCY.count} Emergency Active
            </span>
          </div>
        )}
      </div>

      {/* ── Emergency banner ─────────────────────────────────────────── */}
      {MOCK_EMERGENCY.count > 0 && (
        <div
          className="mt-3.5 flex items-center gap-3 rounded-[12px] p-[14px]"
          style={{ background: '#FEF2F2', border: '1px solid #EF4444' }}
        >
          {/* Alert icon container */}
          <div
            className="flex size-9 shrink-0 items-center justify-center rounded-[12px]"
            style={{ background: '#FFE2E2' }}
          >
            <AlertTriangle style={{ width: 16, height: 16, color: '#EF4444' }} />
          </div>

          {/* Text */}
          <div className="min-w-0 flex-1">
            <p className="text-sm leading-5 font-bold" style={{ color: '#EF4444' }}>
              Emergency Patient Requires Immediate Attention
            </p>
            <p className="text-xs leading-4" style={{ color: '#EF4444' }}>
              {MOCK_EMERGENCY.patientName} — {MOCK_EMERGENCY.complaint}
            </p>
          </div>

          {/* Open Record button */}
          <button
            type="button"
            className="flex shrink-0 items-center gap-1.5 rounded-[12px] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
            style={{ background: '#EF4444' }}
          >
            Open Record
            <ArrowRight style={{ width: 14, height: 14 }} />
          </button>
        </div>
      )}

      {/* ── Quick Actions ─────────────────────────────────────────────── */}
      <div className="mt-14">
        <p className="text-sm leading-[22px]" style={{ color: '#4A7080' }}>
          Quick Actions
        </p>

        <div className="mt-[7px] grid grid-cols-4 gap-9">
          {QUICK_ACTIONS.map((action) => {
            const Icon = 'icon' in action ? action.icon : null;
            return (
              <Link
                key={action.label}
                href={action.href}
                className="flex items-center gap-3 rounded-[12px] p-[14px] transition-opacity hover:opacity-90"
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
                      width={16}
                      height={16}
                      aria-hidden
                      className="shrink-0"
                      style={action.active ? { filter: 'brightness(0) invert(1)' } : undefined}
                    />
                  ) : Icon ? (
                    <Icon
                      style={{
                        width: 16,
                        height: 16,
                        color: action.active ? '#FFFFFF' : '#00B4D8',
                      }}
                    />
                  ) : null}
                </div>
                <span
                  className="text-sm leading-[22px] font-medium"
                  style={{ color: action.active ? '#FFFFFF' : '#00B4D8' }}
                >
                  {action.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
