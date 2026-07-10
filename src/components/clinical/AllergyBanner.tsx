'use client';

import { AlertTriangle, ShieldAlert } from 'lucide-react';

import type { Allergy, AllergySeverity } from '@/types/patient.types';
import { cn } from '@lib/utils';

interface AllergyBannerProps {
  allergies: Allergy[];
  className?: string;
}

const SEVERITY_LABEL: Record<AllergySeverity, string> = {
  MILD: 'Mild',
  MODERATE: 'Moderate',
  SEVERE: 'Severe',
  LIFE_THREATENING: 'Life-Threatening',
};

// Inline badge styles so they remain legible on both the red and amber banner backgrounds
const SEVERITY_BADGE: Record<AllergySeverity, React.CSSProperties> = {
  MILD: { background: 'rgba(254,243,199,0.6)', border: '1px solid #D97706', color: '#92400E' },
  MODERATE: { background: 'rgba(255,237,213,0.6)', border: '1px solid #EA580C', color: '#7C2D12' },
  SEVERE: { background: 'rgba(254,226,226,0.6)', border: '1px solid #DC2626', color: '#7F1D1D' },
  LIFE_THREATENING: { background: '#7F1D1D', border: '1px solid #991B1B', color: '#FEF2F2' },
};

export function AllergyBanner({ allergies, className }: AllergyBannerProps) {
  if (allergies.length === 0) return null;

  const hasCritical = allergies.some((a) => a.severity === 'LIFE_THREATENING');

  return (
    <div
      role="alert"
      aria-label={hasCritical ? 'Critical allergy alert' : 'Allergy alert'}
      className={cn(
        'rounded-lg border px-4 py-3',
        hasCritical
          ? 'border-destructive/40 bg-destructive/10 text-destructive'
          : 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300',
        className,
      )}
    >
      {/* ── Header row ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        {hasCritical ? (
          <ShieldAlert className="size-5 shrink-0" aria-hidden />
        ) : (
          <AlertTriangle className="size-5 shrink-0" aria-hidden />
        )}
        <span className="text-sm font-bold tracking-wider uppercase">
          {hasCritical ? 'Critical Allergy Alert' : 'Allergy Alert'}
        </span>
        <span className="ml-auto text-sm opacity-60">
          {allergies.length} {allergies.length === 1 ? 'allergy' : 'allergies'} on record
        </span>
      </div>

      {/* ── Divider ────────────────────────────────────────────────────── */}
      <div className="mt-2.5 border-t border-current/15" />

      {/* ── Allergy rows ───────────────────────────────────────────────── */}
      <div className="mt-2 space-y-2">
        {allergies.map((allergy) => (
          <div key={allergy.id} className="flex items-baseline gap-4">
            {/* Substance — 16px SemiBold; min-width keeps reactions aligned */}
            <span className="min-w-[130px] shrink-0 text-base leading-snug font-semibold">
              {allergy.substance}
            </span>

            {/* Reaction — 14px */}
            <span className="flex-1 text-sm leading-snug opacity-85">{allergy.reaction}</span>

            {/* Severity badge — larger padding + text */}
            <span
              className="shrink-0 rounded px-2.5 py-1 text-sm leading-none font-bold tracking-wide uppercase"
              style={SEVERITY_BADGE[allergy.severity]}
            >
              {SEVERITY_LABEL[allergy.severity]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
