export type NoteType =
  | 'Progress Note'
  | 'Medication'
  | 'Assessment'
  | 'Observation'
  | 'General Note'
  | 'Pain Assessment'
  | 'Shift Note'
  | 'Care Note'
  | 'Patient Education';

export const NOTE_TYPES: NoteType[] = [
  'Progress Note',
  'Medication',
  'Assessment',
  'Observation',
  'General Note',
  'Pain Assessment',
  'Shift Note',
  'Care Note',
  'Patient Education',
];

export const NOTE_TYPE_CFG: Record<NoteType, { color: string; border: string; bg: string }> = {
  'Progress Note': { color: '#3B82F6', border: 'rgba(59,130,246,0.4)', bg: 'rgba(59,130,246,0.1)' },
  Medication: { color: '#22C55E', border: 'rgba(34,197,94,0.4)', bg: 'rgba(34,197,94,0.1)' },
  Assessment: { color: '#8B5CF6', border: 'rgba(139,92,246,0.4)', bg: 'rgba(139,92,246,0.1)' },
  Observation: { color: '#F59E0B', border: 'rgba(245,158,11,0.4)', bg: 'rgba(245,158,11,0.1)' },
  'General Note': {
    color: '#64748B',
    border: 'rgba(100,116,139,0.4)',
    bg: 'rgba(100,116,139,0.1)',
  },
  'Pain Assessment': { color: '#EF4444', border: 'rgba(239,68,68,0.4)', bg: 'rgba(239,68,68,0.1)' },
  'Shift Note': { color: '#00B4D8', border: 'rgba(0,180,216,0.4)', bg: 'rgba(0,180,216,0.1)' },
  'Care Note': { color: '#6366F1', border: 'rgba(99,102,241,0.4)', bg: 'rgba(99,102,241,0.1)' },
  'Patient Education': {
    color: '#14B8A6',
    border: 'rgba(20,184,166,0.4)',
    bg: 'rgba(20,184,166,0.1)',
  },
};

export type NursingNote = {
  id: string;
  time: string; // ISO
  authorName: string;
  authorId: string;
  noteType: NoteType;
  observation: string;
  intervention?: string;
  patientResponse?: string;
  isDraft?: boolean;
  carePlanGoal?: string;
};

function atOffset(dayOffset: number, hour: number, minute: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

const GRACE = { authorName: 'Nurse Grace E.', authorId: 'NUR-0248' };
const CLARA = { authorName: 'Nurse Clara M.', authorId: 'NUR-0193' };
const IFEOMA = { authorName: 'Nurse Ifeoma K.', authorId: 'NUR-0157' };

export const NURSING_NOTES: NursingNote[] = [
  {
    id: 'note-001',
    time: atOffset(0, 8, 10),
    ...GRACE,
    noteType: 'Progress Note',
    observation:
      'Patient alert and oriented x4. Vital signs stable. Pain score 3/10. Tolerating oral fluids. Ambulated with minimal assistance. No signs of infection at incision site.',
  },
  {
    id: 'note-002',
    time: atOffset(0, 6, 0),
    ...GRACE,
    noteType: 'Medication',
    observation:
      'Paracetamol 1,000 mg PO administered for pain score 5/10. Patient tolerated well.',
  },
  {
    id: 'note-003',
    time: atOffset(0, 4, 0),
    ...GRACE,
    noteType: 'Assessment',
    observation:
      'Post-operative assessment completed. Incision site clean and dry. No bleeding noted. Abdomen soft, non-distended. Bowel sounds present.',
  },
  {
    id: 'note-004',
    time: atOffset(-1, 22, 30),
    ...CLARA,
    noteType: 'Observation',
    observation:
      'Vital signs: BP 128/78, HR 88, RR 18, Temp 37.2°C, SpO2 97%. Patient resting comfortably. No complaints voiced.',
  },
  {
    id: 'note-005',
    time: atOffset(-1, 20, 0),
    ...CLARA,
    noteType: 'Medication',
    observation: 'Ceftriaxone 1 g IV administered as ordered. No adverse reaction noted.',
  },
  {
    id: 'note-006',
    time: atOffset(-1, 18, 0),
    ...CLARA,
    noteType: 'General Note',
    observation:
      'Patient educated on deep breathing exercises and early ambulation. Verbalized understanding.',
  },
  {
    id: 'note-007',
    time: atOffset(-1, 14, 15),
    ...CLARA,
    noteType: 'Pain Assessment',
    observation:
      'Pain score 6/10 at rest. Increased with movement. Intervention provided. Pain re-assessed after 30 mins: 3/10.',
  },
  {
    id: 'note-008',
    time: atOffset(-1, 8, 0),
    ...IFEOMA,
    noteType: 'Shift Note',
    observation:
      'Handover: patient stable overnight, no new complaints. IV line patent, dressing intact. Continue current care plan.',
  },
  {
    id: 'note-009',
    time: atOffset(-2, 20, 0),
    ...GRACE,
    noteType: 'Care Note',
    observation:
      'Care plan reviewed with patient. Goals for mobility and pain management on track.',
    carePlanGoal: 'Post-op Recovery',
  },
  {
    id: 'note-010',
    time: atOffset(-2, 15, 0),
    ...CLARA,
    noteType: 'Patient Education',
    observation:
      'Discussed wound care and signs of infection to watch for after discharge. Patient and family verbalized understanding.',
  },
  {
    id: 'note-011',
    time: atOffset(-2, 9, 30),
    ...GRACE,
    noteType: 'Progress Note',
    observation:
      'Patient ambulated to bathroom independently. Appetite improving. Incision healing well.',
  },
  {
    id: 'note-012',
    time: atOffset(-2, 6, 0),
    ...IFEOMA,
    noteType: 'Medication',
    observation: 'Metronidazole 500 mg IV administered as scheduled. Site checked, no swelling.',
  },
  {
    id: 'note-013',
    time: atOffset(-3, 21, 0),
    ...CLARA,
    noteType: 'Observation',
    observation:
      'Temp 37.8°C noted, patient otherwise comfortable. Continuing to monitor per protocol.',
  },
  {
    id: 'note-014',
    time: atOffset(-3, 13, 0),
    ...GRACE,
    noteType: 'Assessment',
    observation:
      'Wound assessment: incision edges approximated, minimal serous drainage, no erythema.',
  },
  {
    id: 'note-015',
    time: atOffset(-3, 7, 0),
    ...IFEOMA,
    noteType: 'Shift Note',
    observation:
      'Handover: afebrile since last shift, pain well controlled, family visited this morning.',
  },
  {
    id: 'note-016',
    time: atOffset(-4, 19, 0),
    ...CLARA,
    noteType: 'Pain Assessment',
    observation:
      'Pain score 4/10 on movement. PRN analgesia administered, reassessed at 2/10 after 45 mins.',
  },
  {
    id: 'note-017',
    time: atOffset(-4, 11, 0),
    ...GRACE,
    noteType: 'General Note',
    observation: 'Patient reports sleeping well. No nausea or vomiting overnight.',
  },
  {
    id: 'note-018',
    time: atOffset(-4, 6, 30),
    ...IFEOMA,
    noteType: 'Medication',
    observation:
      'Enoxaparin 40 mg SC administered as ordered. No bruising at prior injection sites.',
  },
  {
    id: 'note-019',
    time: atOffset(-5, 16, 0),
    ...CLARA,
    noteType: 'Care Note',
    observation:
      'Mobility goal met — patient walked length of ward corridor with standby assistance.',
    carePlanGoal: 'Mobility',
  },
  {
    id: 'note-020',
    time: atOffset(-5, 9, 0),
    ...GRACE,
    noteType: 'Progress Note',
    observation:
      'Overall condition improving steadily. Vital signs within normal limits across the shift.',
  },
  {
    id: 'note-021',
    time: atOffset(-6, 20, 0),
    ...IFEOMA,
    noteType: 'Patient Education',
    observation:
      'Reviewed discharge medication schedule with patient. Written instructions provided.',
  },
  {
    id: 'note-022',
    time: atOffset(-6, 12, 0),
    ...CLARA,
    noteType: 'Observation',
    observation: 'Bowel sounds active in all quadrants. First flatus passed post-operatively.',
  },
  {
    id: 'note-023',
    time: atOffset(-7, 22, 0),
    ...GRACE,
    noteType: 'Shift Note',
    observation:
      'Handover: stable overnight, one dose of PRN analgesia given at 02:00 for breakthrough pain.',
  },
  {
    id: 'note-024',
    time: atOffset(-7, 8, 0),
    ...IFEOMA,
    noteType: 'Assessment',
    observation:
      'Admission nursing assessment completed. Baseline vitals recorded, risk screens completed.',
  },
  {
    id: 'note-025',
    time: atOffset(-8, 17, 0),
    ...CLARA,
    noteType: 'Medication',
    observation: 'Pantoprazole 40 mg IV administered as ordered. No issues noted.',
  },
  {
    id: 'note-026',
    time: atOffset(-8, 10, 0),
    ...GRACE,
    noteType: 'General Note',
    observation: 'Patient and family oriented to ward routines and call bell use.',
  },
  {
    id: 'note-027',
    time: atOffset(-9, 15, 0),
    ...IFEOMA,
    noteType: 'Pain Assessment',
    observation:
      'Pain score 5/10 at incision site. Analgesia administered per order, effect documented at next round.',
  },
];

export type QuickNoteTemplate = {
  id: string;
  label: string;
  noteType: NoteType;
  starterText: string;
};

export const QUICK_NOTE_TEMPLATES: QuickNoteTemplate[] = [
  {
    id: 'tpl-pain',
    label: 'Pain Assessment',
    noteType: 'Pain Assessment',
    starterText: 'Pain score _/10 at rest. Intervention provided. Reassessed after 30 mins: _/10.',
  },
  {
    id: 'tpl-observation',
    label: 'Observation',
    noteType: 'Observation',
    starterText: 'Vital signs: BP _/_, HR _, RR _, Temp _°C, SpO2 _%. Patient ',
  },
  {
    id: 'tpl-postop',
    label: 'Post-operative',
    noteType: 'Assessment',
    starterText: 'Post-operative assessment completed. Incision site ',
  },
  {
    id: 'tpl-general',
    label: 'General Note',
    noteType: 'General Note',
    starterText: '',
  },
  {
    id: 'tpl-medication',
    label: 'Medication',
    noteType: 'Medication',
    starterText: ' administered as ordered. Patient tolerated well.',
  },
];

export const CARE_PLAN_GOALS = [
  'Post-op Recovery',
  'Pain Management',
  'Mobility',
  'Wound Care',
  'Nutrition',
];

export type NoteAttachment = {
  id: string;
  name: string;
  time: string; // ISO
  kind: 'image' | 'pdf';
  size: string;
};

export const NOTE_ATTACHMENTS: NoteAttachment[] = [
  { id: 'att-001', name: 'Wound Photo', time: atOffset(0, 8, 5), kind: 'image', size: '1.2 MB' },
  {
    id: 'att-002',
    name: 'Lab Result - CBC',
    time: atOffset(-1, 9, 0),
    kind: 'pdf',
    size: '245 KB',
  },
];
