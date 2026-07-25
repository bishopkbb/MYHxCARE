'use client';

/**
 * Referrals as live, shared state — not a static fixture. Registration's
 * Referral Management screen and the doctor's `/referrals` Incoming Referrals
 * tab both read and mutate the SAME Referral records through this store,
 * instead of each holding an independent `useState` copy seeded once from
 * `REFERRALS` — the bug that let one screen accept/complete/cancel a referral
 * without the other ever finding out. Same `useSyncExternalStore`
 * module-singleton pattern as `registrationQueueStore.ts` /
 * `patientDirectoryStore.ts`.
 *
 * Swap out by pointing these actions at real referral endpoints in Phase 6.
 */

import { useSyncExternalStore } from 'react';

import {
  REFERRALS,
  type Referral,
  type ReferralStatus,
} from '@/features/registration/__mocks__/referralFixtures';

let referrals: Referral[] = [...REFERRALS];
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): Referral[] {
  return referrals;
}

function getServerSnapshot(): Referral[] {
  return REFERRALS;
}

/** Reactive hook — re-renders the caller whenever a referral is created or its status changes. */
export function useReferrals(): Referral[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Registration's "New Referral"/"Use Template" flow — Outgoing or Incoming, always created Pending. */
export function addReferral(referral: Referral): void {
  referrals = [referral, ...referrals];
  emit();
}

/** Accept / Mark Completed / Cancel — called from Registration's row menu, detail modal, AND
 * the doctor's Incoming Referrals tab. Whichever side calls this, the other sees it immediately. */
export function setReferralStatus(id: string, status: ReferralStatus): void {
  referrals = referrals.map((r) => (r.id === id ? { ...r, status } : r));
  emit();
}
