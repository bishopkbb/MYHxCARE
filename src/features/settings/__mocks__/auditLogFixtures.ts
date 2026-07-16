/**
 * Mock fixtures for the Clinical Audit Log screen.
 * Swap out by pointing hooks to a real audit-trail endpoint in Phase 6.
 */

export type AuditCategory =
  'consultation' | 'lab' | 'prescription' | 'referral' | 'emergency' | 'auth';

export const AUDIT_CATEGORY_LABEL: Record<AuditCategory, string> = {
  consultation: 'Consultation',
  lab: 'Laboratory',
  prescription: 'Prescription',
  referral: 'Referral',
  emergency: 'Emergency',
  auth: 'Account',
};

export const AUDIT_CATEGORY_COLOR: Record<AuditCategory, string> = {
  consultation: '#00B4D8',
  lab: '#3B82F6',
  prescription: '#7C3AED',
  referral: '#F59E0B',
  emergency: '#EF4444',
  auth: '#6B7280',
};

export type AuditLogEntry = {
  id: string;
  timestamp: string; // ISO
  category: AuditCategory;
  action: string;
  detail: string;
};

export const MOCK_AUDIT_LOG: AuditLogEntry[] = [
  {
    id: 'al-1',
    timestamp: '2026-06-30T10:38:00+01:00',
    category: 'emergency',
    action: 'Emergency presentation recorded',
    detail: 'Ngozi Adeyemi — chest pain and difficulty breathing, admitted to emergency bay.',
  },
  {
    id: 'al-2',
    timestamp: '2026-06-30T10:05:00+01:00',
    category: 'lab',
    action: 'Critical lab result acknowledged',
    detail: 'Adaeze Okonkwo — FBC, WBC 18.4 CRITICAL HIGH.',
  },
  {
    id: 'al-3',
    timestamp: '2026-06-30T09:30:00+01:00',
    category: 'lab',
    action: 'Laboratory request sent — STAT',
    detail: 'Adaeze Okonkwo — Full Blood Count.',
  },
  {
    id: 'al-4',
    timestamp: '2026-06-30T09:15:00+01:00',
    category: 'consultation',
    action: 'Consultation started',
    detail: 'Adaeze Okonkwo — persistent headache and fever, 3 days.',
  },
  {
    id: 'al-5',
    timestamp: '2026-06-30T13:18:00+01:00',
    category: 'referral',
    action: 'Referral accepted by receiving department',
    detail: 'Ibrahim Musa — Cardiology, Dr. Chidi Anyanwu. Appointment confirmed Jul 3, 2026.',
  },
  {
    id: 'al-6',
    timestamp: '2026-06-28T14:45:00+01:00',
    category: 'referral',
    action: 'Referral sent',
    detail: 'Ibrahim Musa — referred to Cardiology for cardiac evaluation.',
  },
  {
    id: 'al-7',
    timestamp: '2026-06-28T14:30:00+01:00',
    category: 'prescription',
    action: 'Prescription dispensed',
    detail: 'Babatunde Alade — Artemether-Lumefantrine 80/480mg, BD × 3 days.',
  },
  {
    id: 'al-8',
    timestamp: '2026-06-28T11:00:00+01:00',
    category: 'lab',
    action: 'Lab result verified',
    detail: 'Babatunde Alade — Malaria RDT, positive for P. falciparum.',
  },
  {
    id: 'al-9',
    timestamp: '2026-06-25T16:20:00+01:00',
    category: 'consultation',
    action: 'Consultation completed',
    detail: 'Chinwe Okafor — allergic contact dermatitis, treatment plan documented.',
  },
  {
    id: 'al-10',
    timestamp: '2026-06-22T08:52:00+01:00',
    category: 'auth',
    action: 'Signed in',
    detail: 'New session started from a recognised device.',
  },
  {
    id: 'al-11',
    timestamp: '2026-06-15T10:00:00+01:00',
    category: 'consultation',
    action: 'Consultation completed',
    detail: 'Adaeze Okonkwo — upper respiratory tract infection, Paracetamol 1000mg TDS.',
  },
  {
    id: 'al-12',
    timestamp: '2026-06-10T09:12:00+01:00',
    category: 'auth',
    action: 'Password changed',
    detail: 'Login password updated from Settings.',
  },
];
