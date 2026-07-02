'use client';

import { AlertTriangle, ShieldAlert } from 'lucide-react';

import type { Allergy } from '@/types/patient.types';
import { cn } from '@lib/utils';

interface AllergyBannerProps {
  allergies: Allergy[];
  className?: string;
}

export function AllergyBanner({ allergies, className }: AllergyBannerProps) {
  if (allergies.length === 0) return null;

  const hasCritical = allergies.some((a) => a.severity === 'LIFE_THREATENING');

  return (
    <div
      role="alert"
      aria-label={hasCritical ? 'Critical allergy alert' : 'Allergy alert'}
      className={cn(
        'flex items-start gap-3 rounded-lg border px-4 py-3',
        hasCritical
          ? 'border-destructive/40 bg-destructive/10 text-destructive'
          : 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300',
        className,
      )}
    >
      {hasCritical ? (
        <ShieldAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
      ) : (
        <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden />
      )}

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">
          {hasCritical ? 'CRITICAL ALLERGY' : 'Allergy Alert'} &mdash; {allergies.length}{' '}
          {allergies.length === 1 ? 'allergy' : 'allergies'} recorded
        </p>
        <ul className="mt-1 space-y-0.5">
          {allergies.map((allergy) => (
            <li key={allergy.id} className="text-xs">
              <span className="font-medium">{allergy.substance}</span>
              {' — '}
              {allergy.reaction}
              {allergy.severity === 'LIFE_THREATENING' && (
                <span className="ml-1.5 font-semibold tracking-wide uppercase">
                  (Life-threatening)
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
