/**
 * Mock fixtures for the Clinical Timeline screen.
 * Real API in Phase 6 will aggregate these events server-side from the
 * consultation, laboratory, prescription, referral, and emergency domains —
 * this flat list stands in for that aggregation during mock-first build.
 *
 * Content lines up with MOCK_PATIENT_DETAILS.p1 in patientFixtures.ts (same
 * three historical consultations, same doctors) so the patient's story reads
 * consistently across screens.
 */

export type TimelineCategory =
  'CONSULTATION' | 'LABORATORY' | 'PRESCRIPTION' | 'REFERRAL' | 'EMERGENCY';

export type TimelineEvent = {
  id: string;
  category: TimelineCategory;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM, 24h
  description: string;
  actor: string;
};

export const TIMELINE_CATEGORY_CONFIG: Record<
  TimelineCategory,
  { label: string; color: string; badgeBg: string; cardBorder?: string }
> = {
  CONSULTATION: { label: 'Consultation', color: '#00B4D8', badgeBg: 'rgba(0,180,216,0.12)' },
  LABORATORY: { label: 'Laboratory', color: '#3B82F6', badgeBg: 'rgba(59,130,246,0.12)' },
  PRESCRIPTION: { label: 'Prescription', color: '#7C3AED', badgeBg: 'rgba(124,58,237,0.12)' },
  REFERRAL: { label: 'Referral', color: '#F59E0B', badgeBg: 'rgba(245,158,11,0.12)' },
  EMERGENCY: {
    label: 'Emergency',
    color: '#EF4444',
    badgeBg: 'rgba(239,68,68,0.12)',
    cardBorder: '#FFA2A2',
  },
};

export type TimelineFilterKey = 'ALL' | TimelineCategory;

export const TIMELINE_FILTERS: { key: TimelineFilterKey; label: string; color: string }[] = [
  { key: 'ALL', label: 'All Events', color: '#25464D' },
  { key: 'CONSULTATION', label: 'Consultation', color: '#00B4D8' },
  { key: 'LABORATORY', label: 'Laboratory', color: '#3B82F6' },
  { key: 'PRESCRIPTION', label: 'Prescription', color: '#7C3AED' },
  { key: 'REFERRAL', label: 'Referral', color: '#F59E0B' },
  { key: 'EMERGENCY', label: 'Emergency', color: '#EF4444' },
];

// Newest first — matches how the timeline is read (most recent event on top).
export const MOCK_TIMELINE_EVENTS: Record<string, TimelineEvent[]> = {
  p1: [
    {
      id: 'tl-1',
      category: 'EMERGENCY',
      title: 'Emergency Presentation',
      date: '2026-06-30',
      time: '10:38',
      description: 'Chest pain and difficulty breathing. SpO2: 91%. Admitted to emergency bay.',
      actor: 'Emergency Team',
    },
    {
      id: 'tl-2',
      category: 'LABORATORY',
      title: 'Lab Request — FBC (STAT)',
      date: '2026-06-30',
      time: '09:30',
      description: 'Full Blood Count ordered. Priority: STAT. Result: CRITICAL — WBC 18.4.',
      actor: 'Dr. E. Obi',
    },
    {
      id: 'tl-3',
      category: 'CONSULTATION',
      title: 'Consultation Started',
      date: '2026-06-30',
      time: '09:15',
      description: 'Patient seen for persistent headache and fever for 3 days. Temp: 38.7°C.',
      actor: 'Dr. E. Obi',
    },
    {
      id: 'tl-4',
      category: 'PRESCRIPTION',
      title: 'Prescription — Artemether-Lumefantrine',
      date: '2026-06-28',
      time: '14:30',
      description: '80/480mg BD × 3 days for P. falciparum malaria.',
      actor: 'Dr. E. Obi',
    },
    {
      id: 'tl-5',
      category: 'LABORATORY',
      title: 'Lab Result — Malaria RDT',
      date: '2026-06-28',
      time: '14:15',
      description: 'Result: Positive for P. falciparum antigen. Verified by laboratory.',
      actor: 'Laboratory',
    },
    {
      id: 'tl-6',
      category: 'REFERRAL',
      title: 'Referral — Cardiology',
      date: '2026-06-28',
      time: '11:00',
      description: 'Referred to Dr. Chidi Anyanwu. Status: Accepted. Appointment July 3.',
      actor: 'Dr. E. Obi',
    },
    {
      id: 'tl-7',
      category: 'CONSULTATION',
      title: 'Consultation — URTI',
      date: '2026-06-15',
      time: '10:00',
      description: 'Diagnosis: Upper Respiratory Tract Infection. Paracetamol 1000mg TDS.',
      actor: 'Dr. E. Obi',
    },
    {
      id: 'tl-8',
      category: 'CONSULTATION',
      title: 'Consultation — Gastroenteritis',
      date: '2026-04-03',
      time: '09:30',
      description: 'Vomiting, diarrhoea. Metronidazole and ORS prescribed.',
      actor: 'Dr. A. Chukwu',
    },
    {
      id: 'tl-9',
      category: 'CONSULTATION',
      title: 'Consultation — Tension Headache',
      date: '2026-01-20',
      time: '11:15',
      description: 'Bilateral frontal headache. Ibuprofen prescribed. Counselling referral.',
      actor: 'Dr. E. Obi',
    },
  ],
};

export const FALLBACK_TIMELINE_EVENTS: TimelineEvent[] = [];
