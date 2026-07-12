/**
 * Mock fixtures for the appointments list.
 * Replace with real API data in Phase 6 integration.
 */

export type AppointmentStatus = 'confirmed' | 'urgent' | 'pending' | 'cancelled';

export type Appointment = {
  id: string;
  time: string;
  patientName: string;
  type: string;
  status: AppointmentStatus;
};

export const MOCK_APPOINTMENTS: Appointment[] = [
  {
    id: 'appt-1',
    time: '11:00 AM',
    patientName: 'Adaeze Okonkwo',
    type: 'Follow-up Consultation',
    status: 'confirmed',
  },
  {
    id: 'appt-2',
    time: '11:30 AM',
    patientName: 'Chinwe Okafor',
    type: 'New Consultation — Skin Rash',
    status: 'confirmed',
  },
  {
    id: 'appt-3',
    time: '12:00 PM',
    patientName: 'David Osei',
    type: 'Emergency — Severe Headache',
    status: 'urgent',
  },
  {
    id: 'appt-4',
    time: '02:00 PM',
    patientName: 'Babatunde Alade',
    type: 'Follow-up — Post-Malaria Treatment',
    status: 'confirmed',
  },
];
