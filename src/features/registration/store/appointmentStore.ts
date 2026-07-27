'use client';

/**
 * The booking calendar as live, shared state — not page-local `useState`.
 * Before this store existed, `SEED_APPOINTMENTS` was read into local state
 * inside the Appointment Scheduling page itself: a booked/rescheduled/
 * cancelled appointment vanished on navigation or refresh and was invisible
 * to any other screen (SYS-012) — including Doctor's Dashboard's own
 * `/appointments`, which this store now also backs. Same
 * `useSyncExternalStore` module-singleton pattern as `patientDirectoryStore.ts`
 * / `nursingWorkflowStore.ts`.
 *
 * Swap out by pointing these actions at real appointment endpoints in Phase 6.
 */

import { useSyncExternalStore } from 'react';

import {
  SEED_APPOINTMENTS,
  type ScheduledAppointment,
} from '@/features/registration/__mocks__/appointmentSchedulingFixtures';

let appointments: ScheduledAppointment[] = [...SEED_APPOINTMENTS];
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): ScheduledAppointment[] {
  return appointments;
}

function getServerSnapshot(): ScheduledAppointment[] {
  return SEED_APPOINTMENTS;
}

/** Reactive hook — re-renders the caller whenever an appointment is booked,
 * rescheduled, or cancelled, from any screen. */
export function useScheduledAppointments(): ScheduledAppointment[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function bookAppointment(appt: ScheduledAppointment): void {
  appointments = [...appointments, appt];
  emit();
}

export function rescheduleAppointment(id: string, dateTime: string): void {
  appointments = appointments.map((a) => (a.id === id ? { ...a, dateTime } : a));
  emit();
}

/** A status transition, not a delete — the cancelled appointment stays on
 * the calendar (filterable, auditable) instead of silently disappearing. */
export function cancelAppointment(id: string): void {
  appointments = appointments.map((a) =>
    a.id === id ? { ...a, baseStatus: 'Cancelled' as const } : a,
  );
  emit();
}
