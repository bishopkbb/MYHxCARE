/**
 * Display shape for the appointments list. Backed by Registration's real,
 * shared ScheduledAppointment (appointmentStore.ts) — see SYS-012.
 * AppointmentStatus is re-exported from there rather than declared here so
 * this screen and Registration's own calendar never derive/label status
 * differently (this file previously had its own 4-value lowercase enum,
 * including a fabricated 'urgent' state nothing else in the app modeled).
 */

import type { AppointmentStatus } from '@/features/registration/__mocks__/appointmentSchedulingFixtures';

export type { AppointmentStatus };

export type Appointment = {
  id: string;
  time: string;
  patientName: string;
  type: string;
  status: AppointmentStatus;
};
