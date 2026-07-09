'use client';

import { Activity, Share2, Stethoscope, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type PatientStatCard = {
  title: string;
  icon: LucideIcon;
  count: string;
  label: string;
  accent: string;
  iconBg: string;
};

// Mock data — will be replaced with real API data in Phase 6
const PATIENT_STAT_CARDS: PatientStatCard[] = [
  {
    title: 'Total Patients',
    icon: Users,
    count: '1,240',
    label: 'All time',
    accent: '#0098CC',
    iconBg: 'rgba(0,152,204,0.1)',
  },
  {
    title: 'Active Patients',
    icon: Stethoscope,
    count: '890',
    label: 'Under your care',
    accent: '#22C55E',
    iconBg: 'rgba(34,197,94,0.1)',
  },
  {
    title: 'Assigned Patients',
    icon: Stethoscope,
    count: '4',
    label: 'This week',
    accent: '#F59E0B',
    iconBg: 'rgba(245,158,11,0.1)',
  },
  {
    title: 'Emergency',
    icon: Activity,
    count: '3',
    label: 'Chronic Care',
    accent: '#EF4444',
    iconBg: 'rgba(239,68,68,0.1)',
  },
  {
    title: 'Active Referrals',
    icon: Share2,
    count: '3',
    label: '2 awaiting response',
    accent: '#3B82F6',
    iconBg: 'rgba(59,130,246,0.1)',
  },
];

export default function PatientsPage() {
  return (
    <div className="px-4 pt-6 pb-24 sm:px-6 lg:px-12 lg:pt-10">
      {/* ── Page header ────────────────────────────────────────────────── */}
      <div>
        <h1 className="font-display text-2xl leading-8 font-semibold" style={{ color: '#2F3A40' }}>
          Patient
        </h1>
        <p className="mt-1 text-sm leading-5.5" style={{ color: '#2F3A40' }}>
          View and manage patients under your care.
        </p>
      </div>

      {/* ── Stat cards ─────────────────────────────────────────────────── */}
      {/*
        Grid breakpoints:
          default → 1 col   (mobile)
          sm      → 2 cols  (640 px+)
          lg      → 3 cols  (1024 px+ — with sidebar, ~648 px content)
          2xl     → 5 cols  (1536 px+ — with sidebar, ~1160 px content, ~219 px/card)
        xl is skipped: at 904 px content / 5 cols each card is only ~168 px —
        too narrow for "Assigned Patients" + icon without wrapping the title.
      */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        {PATIENT_STAT_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="flex flex-col rounded-[12px] p-4"
              style={{
                background: '#FFFFFF',
                border: `1px solid ${card.accent}`,
                borderTopWidth: '3px',
                boxShadow: '0px 1px 3px 0px rgba(0,0,0,0.05)',
              }}
            >
              {/* Title row: label left, icon right */}
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

              {/* Sub-label — DM Sans Regular 14, muted */}
              <p className="mt-1 text-sm leading-5.5" style={{ color: '#4A7080' }}>
                {card.label}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
