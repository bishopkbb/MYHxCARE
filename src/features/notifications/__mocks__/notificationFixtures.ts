/**
 * Mock fixtures for the Notifications screen.
 * Swap out by pointing hooks to a real notifications endpoint/WebSocket in
 * Phase 6.
 *
 * Timestamps are computed relative to module-load time (not hardcoded ISO
 * dates) — notifications are inherently "fresh" content, and toRelativeTime()
 * needs a genuinely recent Date to read as "10 min ago" rather than going
 * stale the moment real time drifts from a fixed narrative date.
 */

import {
  AlertTriangle,
  Clock,
  FlaskConical,
  MessageSquare,
  Share2,
  type LucideIcon,
} from 'lucide-react';

export type NotificationType = 'alert' | 'clinical' | 'referral' | 'schedule' | 'message';

export const NOTIFICATION_TYPE_CONFIG: Record<
  NotificationType,
  { icon: LucideIcon; color: string; bg: string }
> = {
  alert: { icon: AlertTriangle, color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
  clinical: { icon: FlaskConical, color: '#22C55E', bg: 'rgba(34,197,94,0.12)' },
  referral: { icon: Share2, color: '#7C3AED', bg: 'rgba(124,58,237,0.12)' },
  schedule: { icon: Clock, color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  message: { icon: MessageSquare, color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
};

export type NotificationTarget =
  | { kind: 'patient'; patientId: string }
  | { kind: 'referrals' }
  | { kind: 'my-schedule' }
  | { kind: 'emergency' }
  | { kind: 'collaboration' };

export type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  timestamp: string; // ISO
  read: boolean;
  target: NotificationTarget;
};

function minutesAgo(mins: number): string {
  return new Date(Date.now() - mins * 60_000).toISOString();
}
function hoursAgo(hrs: number): string {
  return minutesAgo(hrs * 60);
}

export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'ntf-1',
    type: 'alert',
    title: 'Critical Lab Result',
    body: 'FBC for Adaeze Okonkwo requires immediate attention. WBC: 18.4 — CRITICAL HIGH.',
    timestamp: minutesAgo(10),
    read: false,
    target: { kind: 'patient', patientId: 'p1' },
  },
  {
    id: 'ntf-2',
    type: 'clinical',
    title: 'New Patient Assigned',
    body: 'Ngozi Adeyemi assigned to you as emergency. Chief complaint: Chest pain and difficulty breathing.',
    timestamp: minutesAgo(23),
    read: false,
    target: { kind: 'patient', patientId: 'p3' },
  },
  {
    id: 'ntf-3',
    type: 'referral',
    title: 'Referral Accepted',
    body: 'Dr. Chidi Anyanwu (Cardiology) accepted your referral for Ibrahim Musa. Appointment: Jul 3, 2026.',
    timestamp: hoursAgo(1),
    read: false,
    target: { kind: 'referrals' },
  },
  {
    id: 'ntf-4',
    type: 'schedule',
    title: 'On-Call Assignment — Action Required',
    body: 'You have been assigned as On-Call Doctor for Friday, July 4, 2026 (19:00 – 07:00). Acknowledgement is pending. Please confirm or indicate inability to attend.',
    timestamp: hoursAgo(1),
    read: false,
    target: { kind: 'my-schedule' },
  },
  {
    id: 'ntf-5',
    type: 'schedule',
    title: 'Shift Reminder — Tomorrow',
    body: 'Afternoon Shift tomorrow (Tue, Jul 1) begins at 13:00. Location: General OPD, Block C. Please ensure timely arrival.',
    timestamp: hoursAgo(2),
    read: false,
    target: { kind: 'my-schedule' },
  },
  {
    id: 'ntf-6',
    type: 'alert',
    title: 'Emergency Alert — Ward B',
    body: 'Code Red activated in Ward B. All on-call physicians report immediately.',
    timestamp: hoursAgo(2),
    read: false,
    target: { kind: 'emergency' },
  },
  {
    id: 'ntf-7',
    type: 'message',
    title: 'Clinical Message — Dr. Okafor',
    body: 'Regarding Chinwe Okafor: Please review the dermatology consult notes attached to her record.',
    timestamp: hoursAgo(3),
    read: false,
    target: { kind: 'collaboration' },
  },
  {
    id: 'ntf-8',
    type: 'clinical',
    title: 'Lab Result Ready',
    body: 'Malaria RDT for Babatunde Alade is verified. Result: Positive for P. falciparum.',
    timestamp: hoursAgo(5),
    read: true,
    target: { kind: 'patient', patientId: 'p4' },
  },
];
