export type CarePlanStatus = 'In Progress' | 'Completed' | 'Discontinued';
export type EvaluationStatus = 'Progressing' | 'Achieved' | 'Not Progressing' | 'Stalled';

export const EVALUATION_CFG: Record<EvaluationStatus, { color: string }> = {
  Progressing: { color: '#F59E0B' },
  Achieved: { color: '#22C55E' },
  'Not Progressing': { color: '#EF4444' },
  Stalled: { color: '#8A98A3' },
};

export type ProgressEntry = {
  id: string;
  time: string; // ISO
  note: string;
  authorName: string;
};

export type CarePlan = {
  id: string;
  planNumber: number;
  accentColor: string;
  problem: string;
  problemDetail: string;
  goal: string;
  startDate: string; // ISO
  nextReviewDate: string; // ISO
  status: CarePlanStatus;
  assignedNurseName: string;
  assignedNurseId: string;
  interventions: string[];
  evaluationStatus: EvaluationStatus;
  evaluationNote: string;
  progressEntries: ProgressEntry[];
};

function atOffset(dayOffset: number, hour: number, minute: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export const CARE_PLANS: CarePlan[] = [
  {
    id: 'cp-001',
    planNumber: 1,
    accentColor: '#F59E0B',
    problem: 'Acute Pain',
    problemDetail: 'Related to surgical incision',
    goal: 'Patient will report pain score ≤ 3/10 within 24 hours.',
    startDate: atOffset(-1, 9, 0),
    nextReviewDate: atOffset(2, 9, 0),
    status: 'In Progress',
    assignedNurseName: 'Nurse Grace E.',
    assignedNurseId: 'NUR-0248',
    interventions: [
      'Assess pain level q4h and PRN',
      'Administer prescribed analgesics',
      'Position for comfort',
      'Teach relaxation techniques',
      'Evaluate effectiveness of interventions',
    ],
    evaluationStatus: 'Progressing',
    evaluationNote: 'Pain score decreased to 3/10 after intervention. Patient resting comfortably.',
    progressEntries: [
      {
        id: 'cp-001-p3',
        time: atOffset(0, 16, 0),
        note: 'Pain score 3/10. No additional analgesic required. Patient comfortable.',
        authorName: 'Nurse Clara M.',
      },
      {
        id: 'cp-001-p2',
        time: atOffset(0, 12, 0),
        note: 'Pain score 3/10. Encouraged deep breathing exercises. Patient resting.',
        authorName: 'Nurse Grace E.',
      },
      {
        id: 'cp-001-p1',
        time: atOffset(0, 8, 0),
        note: 'Pain score 4/10. Paracetamol 1,000 mg PO given. Positioned for comfort. Patient tolerated well.',
        authorName: 'Nurse Grace E.',
      },
    ],
  },
  {
    id: 'cp-002',
    planNumber: 2,
    accentColor: '#3B82F6',
    problem: 'Risk for Infection',
    problemDetail: 'Related to surgical procedure',
    goal: 'Patient will remain free from signs of infection during hospital stay.',
    startDate: atOffset(-1, 9, 30),
    nextReviewDate: atOffset(3, 9, 30),
    status: 'In Progress',
    assignedNurseName: 'Nurse Grace E.',
    assignedNurseId: 'NUR-0248',
    interventions: [
      'Monitor incision site each shift for redness, swelling, or discharge',
      'Maintain aseptic technique during dressing changes',
      'Monitor temperature q4h',
      'Administer prescribed antibiotics as ordered',
      'Educate patient on hand hygiene',
    ],
    evaluationStatus: 'Progressing',
    evaluationNote:
      'Incision site clean and dry, no signs of infection. Temperature within normal range.',
    progressEntries: [
      {
        id: 'cp-002-p3',
        time: atOffset(0, 20, 0),
        note: 'Incision site checked — clean, dry, edges approximated. No erythema.',
        authorName: 'Nurse Clara M.',
      },
      {
        id: 'cp-002-p2',
        time: atOffset(0, 12, 0),
        note: 'Ceftriaxone 1 g IV administered as ordered. Temp 37.1°C.',
        authorName: 'Nurse Grace E.',
      },
      {
        id: 'cp-002-p1',
        time: atOffset(-1, 20, 0),
        note: 'Dressing change completed using aseptic technique. No drainage noted.',
        authorName: 'Nurse Grace E.',
      },
    ],
  },
  {
    id: 'cp-003',
    planNumber: 3,
    accentColor: '#22C55E',
    problem: 'Impaired Mobility',
    problemDetail: 'Related to pain and post-operative status',
    goal: 'Patient will ambulate with assistance 3 times daily by discharge.',
    startDate: atOffset(0, 10, 0),
    nextReviewDate: atOffset(4, 10, 0),
    status: 'In Progress',
    assignedNurseName: 'Nurse Clara M.',
    assignedNurseId: 'NUR-0193',
    interventions: [
      'Assist with ambulation 3 times daily',
      'Encourage active range-of-motion exercises',
      'Assess fall risk before each mobilization',
      'Provide analgesia prior to mobilization as needed',
      'Document distance and tolerance each session',
    ],
    evaluationStatus: 'Progressing',
    evaluationNote:
      'Ambulated to bathroom independently. Tolerating short walks with standby assistance.',
    progressEntries: [
      {
        id: 'cp-003-p2',
        time: atOffset(0, 12, 0),
        note: 'Patient ambulated to bathroom with assistance. Tolerated well, no dizziness.',
        authorName: 'Nurse Clara M.',
      },
      {
        id: 'cp-003-p1',
        time: atOffset(0, 8, 0),
        note: 'Assisted out of bed to chair. Active ROM exercises performed in bed.',
        authorName: 'Nurse Clara M.',
      },
    ],
  },
  {
    id: 'cp-004',
    planNumber: 4,
    accentColor: '#8B5CF6',
    problem: 'Deficient Knowledge',
    problemDetail: 'Related to post-discharge wound care',
    goal: 'Patient will verbalize understanding of wound care and infection signs before discharge.',
    startDate: atOffset(-4, 9, 0),
    nextReviewDate: atOffset(-1, 9, 0),
    status: 'Completed',
    assignedNurseName: 'Nurse Ifeoma K.',
    assignedNurseId: 'NUR-0157',
    interventions: [
      'Provide written discharge instructions',
      'Demonstrate dressing change technique',
      'Review signs of infection to watch for',
      'Confirm follow-up appointment scheduled',
    ],
    evaluationStatus: 'Achieved',
    evaluationNote:
      'Patient and family verbalized understanding and demonstrated correct technique. Goal met.',
    progressEntries: [
      {
        id: 'cp-004-p2',
        time: atOffset(-1, 15, 0),
        note: 'Reviewed discharge medication schedule and wound care with patient and family.',
        authorName: 'Nurse Ifeoma K.',
      },
      {
        id: 'cp-004-p1',
        time: atOffset(-2, 15, 0),
        note: 'Demonstrated dressing change technique. Patient successfully return-demonstrated.',
        authorName: 'Nurse Ifeoma K.',
      },
    ],
  },
  {
    id: 'cp-005',
    planNumber: 5,
    accentColor: '#64748B',
    problem: 'Risk for Falls',
    problemDetail: 'Related to post-operative weakness',
    goal: 'Patient will remain free from falls throughout hospital stay.',
    startDate: atOffset(-6, 9, 0),
    nextReviewDate: atOffset(-3, 9, 0),
    status: 'Discontinued',
    assignedNurseName: 'Nurse Grace E.',
    assignedNurseId: 'NUR-0248',
    interventions: [
      'Keep bed in lowest position with brakes locked',
      'Ensure call bell within reach',
      'Assist with all transfers',
    ],
    evaluationStatus: 'Not Progressing',
    evaluationNote:
      'Discontinued — patient transferred to a lower fall-risk category after full mobility regained.',
    progressEntries: [
      {
        id: 'cp-005-p1',
        time: atOffset(-3, 9, 0),
        note: 'Fall risk reassessed as low. Plan discontinued per care team review.',
        authorName: 'Nurse Grace E.',
      },
    ],
  },
];

export type CarePlanTemplate = {
  id: string;
  label: string;
  problem: string;
  problemDetail: string;
  goal: string;
  interventions: string[];
};

export const QUICK_CARE_PLAN_TEMPLATES: CarePlanTemplate[] = [
  {
    id: 'tpl-pain',
    label: 'Pain Management',
    problem: 'Acute Pain',
    problemDetail: 'Related to ',
    goal: 'Patient will report pain score ≤ 3/10 within 24 hours.',
    interventions: [
      'Assess pain level q4h and PRN',
      'Administer prescribed analgesics',
      'Position for comfort',
      'Evaluate effectiveness of interventions',
    ],
  },
  {
    id: 'tpl-postop',
    label: 'Post-operative Care',
    problem: 'Risk for Infection',
    problemDetail: 'Related to surgical procedure',
    goal: 'Patient will remain free from signs of infection during hospital stay.',
    interventions: [
      'Monitor incision site each shift',
      'Maintain aseptic technique during dressing changes',
      'Monitor temperature q4h',
    ],
  },
  {
    id: 'tpl-infection',
    label: 'Infection Prevention',
    problem: 'Risk for Infection',
    problemDetail: 'Related to ',
    goal: 'Patient will remain free from signs and symptoms of infection.',
    interventions: [
      'Monitor for fever, redness, swelling, or discharge',
      'Maintain hand hygiene and aseptic technique',
      'Administer prescribed antibiotics as ordered',
    ],
  },
  {
    id: 'tpl-mobility',
    label: 'Mobility Improvement',
    problem: 'Impaired Mobility',
    problemDetail: 'Related to ',
    goal: 'Patient will ambulate with assistance by discharge.',
    interventions: [
      'Assist with ambulation per schedule',
      'Encourage active range-of-motion exercises',
      'Assess fall risk before each mobilization',
    ],
  },
  {
    id: 'tpl-general',
    label: 'General Care Plan',
    problem: '',
    problemDetail: 'Related to ',
    goal: '',
    interventions: [],
  },
];

export type CarePlanDocument = {
  id: string;
  name: string;
  time: string; // ISO
  kind: 'pdf' | 'image';
  size: string;
  planId: string;
};

export const CARE_PLAN_DOCUMENTS: CarePlanDocument[] = [
  {
    id: 'cpd-001',
    name: 'Pain Management Protocol.pdf',
    time: atOffset(-1, 9, 5),
    kind: 'pdf',
    size: '180 KB',
    planId: 'cp-001',
  },
  {
    id: 'cpd-002',
    name: 'Wound Assessment Photo.jpg',
    time: atOffset(0, 20, 5),
    kind: 'image',
    size: '1.1 MB',
    planId: 'cp-002',
  },
  {
    id: 'cpd-003',
    name: 'Discharge Education Sheet.pdf',
    time: atOffset(-2, 15, 5),
    kind: 'pdf',
    size: '210 KB',
    planId: 'cp-004',
  },
];
