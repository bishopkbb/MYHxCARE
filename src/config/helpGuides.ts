/**
 * Route-keyed user-guide registry for the HelpBeacon.
 *
 * Every HMS screen registers a guide describing its core features. The
 * HelpBeacon (bottom-right "?" launcher) resolves the guide for the current
 * pathname via resolveHelpGuide(). Screens without a specific guide fall
 * back to the general navigation guide — but every NEW screen should add
 * its own entry here as part of the definition of done.
 */

export type HelpGuideSection = {
  heading: string;
  body: string;
  steps?: string[];
};

export type HelpGuide = {
  id: string;
  title: string;
  intro: string;
  sections: HelpGuideSection[];
};

const GENERAL_GUIDE: HelpGuide = {
  id: 'general',
  title: 'Getting Around',
  intro:
    'MyHxCare HMS organises your work into modules listed in the left sidebar. What you see is determined by your permissions.',
  sections: [
    {
      heading: 'Navigation',
      body: 'Use the sidebar to move between modules. On desktop you can collapse it to an icon rail with the round toggle on its edge; on mobile open it with the menu button in the top bar.',
    },
    {
      heading: 'Search',
      body: 'The top-bar search finds patients, records, and results from anywhere in the application.',
    },
    {
      heading: 'Notifications',
      body: 'The bell icon shows unread alerts. Critical clinical alerts also appear directly on your dashboard.',
    },
    {
      heading: 'Time and dates',
      body: 'All times are shown in West Africa Time (WAT) using the 24-hour clock, and dates follow the DD/MM/YYYY format.',
    },
  ],
};

const DASHBOARD_GUIDE: HelpGuide = {
  id: 'dashboard',
  title: 'Clinical Dashboard',
  intro:
    'Your dashboard is the entry point for the clinical day — everything urgent surfaces here first.',
  sections: [
    {
      heading: 'Emergency banner',
      body: 'When an emergency patient is assigned to you, a red banner appears at the top. "Open Record" takes you straight to the patient.',
    },
    {
      heading: 'Quick actions',
      body: 'One-tap shortcuts to your most frequent tasks: start a consultation, write a clinical note, create a prescription, or request a laboratory test.',
    },
    {
      heading: 'Patient queue',
      body: 'Patients assigned to you, ordered by status. Emergency rows are red, waiting rows amber. Use "Consult" to begin, or "View All" to open the full queue.',
    },
    {
      heading: 'Alerts',
      body: 'Critical lab results, new assignments, referral responses, and clinical messages. Unread alerts show a cyan dot; "View All" opens the notification centre.',
    },
    {
      heading: "Today's shift",
      body: 'Your current shift, location, and acknowledgement status. "View My Schedule" opens the duty roster.',
    },
  ],
};

const PATIENTS_GUIDE: HelpGuide = {
  id: 'patients',
  title: 'Patient Register',
  intro: 'Search, review, and open the records of every patient you are permitted to see.',
  sections: [
    {
      heading: 'Find a patient',
      body: 'Search by name or MRN, then narrow the list with the status, gender, and blood-group filters. Active filters appear as chips you can dismiss.',
    },
    {
      heading: 'Open a profile',
      body: 'Select the eye icon (or tap a patient card on mobile) to open the full profile with history, allergies, and records.',
    },
    {
      heading: 'Start a consultation',
      body: 'Available directly from the list for patients who are not discharged — it opens the six-step consultation workspace.',
    },
  ],
};

const PATIENT_PROFILE_GUIDE: HelpGuide = {
  id: 'patient-profile',
  title: 'Patient Profile',
  intro: 'The complete clinical picture of one patient, organised into tabs.',
  sections: [
    {
      heading: 'Allergy banner',
      body: 'Recorded allergies are always shown at the top in red — this banner never collapses and appears on every patient screen for safety.',
    },
    {
      heading: 'Tabs',
      body: 'Move between overview, history, medications, lab results, and documents. On smaller screens the tab bar scrolls sideways.',
    },
    {
      heading: 'History tables',
      body: 'Diagnoses, family history, and immunisations expand per section. Wide tables scroll horizontally — the first column stays readable.',
    },
  ],
};

const CLINICAL_TIMELINE_INDEX_GUIDE: HelpGuide = {
  id: 'clinical-timeline-index',
  title: 'Clinical Timeline',
  intro: 'Pick a patient here to open their complete chronological clinical history.',
  sections: [
    {
      heading: 'Finding a patient',
      body: 'Search by name or MRN, or narrow the list with the status pills — Admitted, Active, Follow up, Referred, or Discharged.',
    },
    {
      heading: 'Opening a timeline',
      body: "Select the eye icon (or tap a patient card on mobile) to open that patient's timeline.",
    },
  ],
};

const CLINICAL_TIMELINE_GUIDE: HelpGuide = {
  id: 'clinical-timeline',
  title: 'Clinical Timeline',
  intro:
    'A single chronological history of everything that has happened to this patient — consultations, lab activity, prescriptions, referrals, and emergencies.',
  sections: [
    {
      heading: 'Reading the timeline',
      body: 'Events run newest to oldest. Each entry shows its category, what happened, exactly when, and who recorded it.',
    },
    {
      heading: 'Filtering',
      body: 'Use the category pills to narrow the list to one type of event — Consultation, Laboratory, Prescription, Referral, or Emergency. "All Events" shows the complete history again.',
    },
    {
      heading: 'Emergency events',
      body: 'Emergency presentations are outlined in red so past critical episodes are never missed while reviewing history.',
    },
    {
      heading: 'Export',
      body: 'Export produces a PDF of the currently filtered timeline — useful for referral letters and case summaries.',
    },
  ],
};

const CONSULTATION_GUIDE: HelpGuide = {
  id: 'consultation',
  title: 'Consultation Workspace',
  intro: 'A six-step guided flow for documenting a complete clinical encounter.',
  sections: [
    {
      heading: 'The six steps',
      body: 'Work through the tabs in order — you can move back at any time without losing entered data.',
      steps: [
        'Chief Complaint — presenting problem, duration, onset, severity',
        'History — present illness, past medical, family, social',
        'Examination — findings per body system',
        'Diagnosis — primary, differentials, reasoning',
        'Treatment Plan — therapy and follow-up instructions',
        'Clinical Notes — free-text summary',
      ],
    },
    {
      heading: 'Patient context',
      body: 'The dark bar at the top keeps the patient identity, blood group, and allergy pills visible at all times. The red allergy banner sits above the form.',
    },
    {
      heading: 'Saving',
      body: '"Save Draft" stores your progress without finalising. "Complete Consultation" signs the encounter — completed records are immutable and corrections require an amendment.',
    },
    {
      heading: 'Referring',
      body: '"Refer Patient" opens the referral form pre-filled with this patient\'s context.',
    },
  ],
};

const ENCOUNTERS_GUIDE: HelpGuide = {
  id: 'encounters',
  title: 'OPD Queue',
  intro: 'The live outpatient queue for your department.',
  sections: [
    {
      heading: 'Queue tabs',
      body: 'Filter by status — all, waiting, in consultation, emergency, completed. Counts update as the queue moves.',
    },
    {
      heading: 'Filters and search',
      body: 'Search by name or complaint; the filter menu narrows by gender and allergy status. If a filtered view is empty, "Clear all filters" restores the full queue.',
    },
    {
      heading: 'Starting a consultation',
      body: 'Use "Consult" on a patient row to open the consultation workspace. Emergency patients are highlighted red and should be seen first.',
    },
  ],
};

const CLINICAL_NOTES_GUIDE: HelpGuide = {
  id: 'clinical-notes',
  title: 'Clinical Notes',
  intro: 'Write, review, and export clinical documentation.',
  sections: [
    {
      heading: 'Writing a note',
      body: '"Write Clinical Note" opens the editor. Choose a note type — SOAP notes pre-fill the four-section template.',
    },
    {
      heading: 'Note lifecycle',
      body: 'Notes start in progress and become final when signed. Final notes are immutable — corrections are recorded as amendments with a reason, and the version history stays visible.',
    },
    {
      heading: 'Finding notes',
      body: 'Filter by type or status, or search by patient. Urgent items are flagged in the banner at the top.',
    },
    {
      heading: 'Export',
      body: 'The Export menu produces PDF or CSV of the current filtered list.',
    },
  ],
};

const REFERRALS_INDEX_GUIDE: HelpGuide = {
  id: 'referrals-index',
  title: 'Referrals',
  intro: 'Pick a patient here to refer them to a specialist department.',
  sections: [
    {
      heading: 'Finding a patient',
      body: 'Search by name or MRN, or narrow the list with the status pills — Admitted, Active, Follow up, Referred, or Discharged.',
    },
    {
      heading: 'Starting a referral',
      body: 'Select "Refer" (or tap a patient card on mobile) to open the referral form for that patient.',
    },
  ],
};

const REFERRALS_GUIDE: HelpGuide = {
  id: 'referrals',
  title: 'Patient Referral',
  intro: 'Send a patient to another department with full clinical context.',
  sections: [
    {
      heading: 'Before you send',
      body: 'Confirm the patient identity in the dark context bar — allergies and urgency are shown there and in the red banner above the form.',
    },
    {
      heading: 'Completing the form',
      body: 'Select the receiving department, set urgency, and write the clinical reason. Toggle "notify doctor" to alert the receiving clinician immediately.',
      steps: [
        'Choose the receiving department',
        'Set the urgency level',
        'Document the reason for referral',
        'Send — the receiving department is notified',
      ],
    },
    {
      heading: 'After sending',
      body: 'Track acceptance in your dashboard alerts — you are notified when the receiving clinician responds.',
    },
  ],
};

const LAB_ORDERS_GUIDE: HelpGuide = {
  id: 'lab-orders',
  title: 'Laboratory Request',
  intro: 'Order laboratory investigations for the patient in context.',
  sections: [
    {
      heading: 'Priority',
      body: "STAT for life-threatening situations, Urgent for same-day, Routine otherwise. Priority drives the lab's processing order.",
    },
    {
      heading: 'Selecting tests',
      body: 'Tests are grouped by discipline (haematology, chemistry, microbiology…). Tick every test needed — the summary keeps a running count.',
    },
    {
      heading: 'Allergies',
      body: 'The red allergy banner above the form lists recorded reactions — check it before ordering tests involving contrast media or provocation.',
    },
    {
      heading: 'Submitting',
      body: 'Review the summary and send. The order appears in the laboratory queue and results return to Lab Results with a notification.',
    },
  ],
};

const PRESCRIPTIONS_GUIDE: HelpGuide = {
  id: 'prescriptions',
  title: 'Create Prescription',
  intro: 'Build a prescription for the patient in context, one medication at a time.',
  sections: [
    {
      heading: 'Adding medications',
      body: 'Search by generic or brand name, or browse the drug list, to add a medication to the table. "Add Another Medication" quickly adds the next common drug.',
    },
    {
      heading: 'Dosage & Directions',
      body: 'Select a row in the medication table to edit its dosage, route, frequency, duration, and dates in the panel below — each medication keeps its own settings.',
    },
    {
      heading: 'Safety checks',
      body: 'Active medications and recorded allergies are shown before you prescribe. The Drug Interaction Check confirms the selected medications are safe together.',
    },
    {
      heading: 'Finishing up',
      body: 'Review the live Prescription Preview at the bottom, then Save as Draft to continue later or Send Prescription to dispatch it to pharmacy.',
    },
  ],
};

const LAB_RESULTS_GUIDE: HelpGuide = {
  id: 'lab-results',
  title: 'Lab Results',
  intro: 'Review returned laboratory results for your patients.',
  sections: [
    {
      heading: 'Tabs',
      body: 'Pending shows orders still in the lab; Critical needs immediate attention; Verified holds validated results.',
    },
    {
      heading: 'Critical values',
      body: 'Critical results are flagged red and must be acknowledged — they also raise a dashboard alert the moment they arrive.',
    },
    {
      heading: 'Reading a result',
      body: 'Expand a result card to see each analyte with its reference range; values outside range are highlighted.',
    },
  ],
};

const MEDICAL_RECORDS_GUIDE: HelpGuide = {
  id: 'medical-records',
  title: 'Medical Records',
  intro: 'The document archive for the patient in context.',
  sections: [
    {
      heading: 'Browsing',
      body: 'Records are grouped by type — consultations, discharge summaries, imaging, procedures. Filter by type or search by title.',
    },
    {
      heading: 'Critical records',
      body: 'Records flagged critical are highlighted so they are never missed during review.',
    },
    {
      heading: 'Export',
      body: 'Export the current view as PDF or CSV from the Export menu — useful for referral packs and case reviews.',
    },
  ],
};

const MY_SCHEDULE_GUIDE: HelpGuide = {
  id: 'my-schedule',
  title: 'My Schedule',
  intro: 'Your personal shift calendar and on-call assignments.',
  sections: [
    {
      heading: "Today's shift",
      body: 'The card at the top shows your current or next shift with its time, location, and supervisor.',
    },
    {
      heading: 'Acknowledging shifts',
      body: 'Newly published shifts require acknowledgement — the button appears on the shift card and your confirmation is recorded.',
    },
    {
      heading: 'Calendar views',
      body: 'Switch between week and month views. Shift blocks are colour-coded by type; on-call dates are listed separately.',
    },
  ],
};

const APPOINTMENTS_GUIDE: HelpGuide = {
  id: 'appointments',
  title: 'Appointments',
  intro: "Today's booked appointments at a glance.",
  sections: [
    {
      heading: 'Status badges',
      body: 'Confirmed (green), Urgent (red), Pending (amber), Cancelled (grey). Urgent appointments should be reviewed first.',
    },
    {
      heading: 'Details',
      body: 'Each card shows the patient, time, and reason for visit — select one to open the patient context.',
    },
  ],
};

/**
 * Resolve the guide for the current pathname. Order matters — more specific
 * routes are tested before their parents.
 */
export function resolveHelpGuide(pathname: string): HelpGuide {
  if (pathname.startsWith('/clinical-timeline')) return CLINICAL_TIMELINE_INDEX_GUIDE;
  if (/^\/patients\/[^/]+\/consultation/.test(pathname)) return CONSULTATION_GUIDE;
  if (/^\/patients\/[^/]+\/timeline/.test(pathname)) return CLINICAL_TIMELINE_GUIDE;
  if (/^\/patients\/[^/]+\/referral/.test(pathname)) return REFERRALS_GUIDE;
  if (/^\/patients\/[^/]+\/lab-order/.test(pathname)) return LAB_ORDERS_GUIDE;
  if (/^\/patients\/[^/]+\/prescription/.test(pathname)) return PRESCRIPTIONS_GUIDE;
  if (/^\/patients\/[^/]+/.test(pathname)) return PATIENT_PROFILE_GUIDE;
  if (pathname.startsWith('/patients')) return PATIENTS_GUIDE;
  if (pathname.startsWith('/dashboard')) return DASHBOARD_GUIDE;
  if (pathname.startsWith('/encounters/prescriptions')) return PRESCRIPTIONS_GUIDE;
  if (pathname.startsWith('/encounters')) return ENCOUNTERS_GUIDE;
  if (pathname.startsWith('/clinical-notes')) return CLINICAL_NOTES_GUIDE;
  if (pathname.startsWith('/referrals')) return REFERRALS_INDEX_GUIDE;
  if (pathname.startsWith('/lab/orders')) return LAB_ORDERS_GUIDE;
  if (pathname.startsWith('/lab/results')) return LAB_RESULTS_GUIDE;
  if (pathname.startsWith('/medical-records')) return MEDICAL_RECORDS_GUIDE;
  if (pathname.startsWith('/my-schedule')) return MY_SCHEDULE_GUIDE;
  if (pathname.startsWith('/appointments')) return APPOINTMENTS_GUIDE;
  return GENERAL_GUIDE;
}
