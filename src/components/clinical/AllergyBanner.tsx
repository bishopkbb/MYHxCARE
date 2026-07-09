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
        'rounded-lg border px-3 py-2.5',
        hasCritical
          ? 'border-destructive/40 bg-destructive/10 text-destructive'
          : 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300',
        className,
      )}
    >
      {/* ── Header row ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5">
        {hasCritical ? (
          <ShieldAlert className="size-4 shrink-0" aria-hidden />
        ) : (
          <AlertTriangle className="size-4 shrink-0" aria-hidden />
        )}
        <span className="text-xs font-bold tracking-wider uppercase">
          {hasCritical ? 'Critical Allergy Alert' : 'Allergy Alert'}
        </span>
        <span className="ml-auto text-xs opacity-60">
          {allergies.length} {allergies.length === 1 ? 'allergy' : 'allergies'} on record
        </span>
      </div>

      {/* ── Divider ────────────────────────────────────────────────────── */}
      <div className="mt-2 border-t border-current/15" />

      {/* ── Allergy rows ───────────────────────────────────────────────── */}
      <div className="mt-1.5 space-y-1.5">
        {allergies.map((allergy) => (
          <div key={allergy.id} className="flex items-baseline gap-3">
            {/* Substance — fixed min-width so reactions align vertically */}
            <span className="min-w-[110px] shrink-0 text-sm leading-snug font-semibold">
              {allergy.substance}
            </span>

            {/* Reaction — fills remaining space */}
            <span className="flex-1 text-xs leading-snug opacity-85">{allergy.reaction}</span>

            {/* Severity badge — always shown */}
            <span
              className="shrink-0 rounded px-1.5 py-0.5 text-[10px] leading-none font-bold tracking-wide uppercase"
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
