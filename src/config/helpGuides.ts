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

const MEDICAL_RECORDS_DASHBOARD_GUIDE: HelpGuide = {
  id: 'medical-records-dashboard',
  title: 'Medical Records Dashboard',
  intro: 'Your daily overview of records activity — retrieval, uploads, and pending requests.',
  sections: [
    {
      heading: 'Stat cards',
      body: 'Each card tracks one metric against yesterday — records retrieved, archived records, pending requests, uploads, and visit entries.',
    },
    {
      heading: 'Quick Actions',
      body: 'Jump straight to retrieving a record, uploading a document, or browsing visit history and clinical documents.',
    },
    {
      heading: 'Recent activity',
      body: 'Recent Record Requests and Recently Retrieved show the latest activity; System Announcements carries hospital-wide notices.',
    },
  ],
};

const REGISTER_PATIENT_GUIDE: HelpGuide = {
  id: 'register-patient',
  title: 'Register Patient',
  intro: 'A 3-step wizard for adding a new patient to the system.',
  sections: [
    {
      heading: 'Patient Information',
      body: 'Basic demographics, emergency contact, and insurance details. Fields marked with * are required — State determines which LGAs are available, and Age is calculated automatically from Date of Birth.',
    },
    {
      heading: 'Medical Record Number',
      body: 'MRN and Patient ID are generated automatically once the patient is saved. Use "Generate MRN" to assign one earlier if you need it for a physical card or referral before saving.',
    },
    {
      heading: 'Patient Photograph',
      body: 'Upload a JPG, PNG, or WebP photo up to 2MB, or use "Take Photo" on a device with a camera. This step is optional and can be added later from the patient\'s profile.',
    },
    {
      heading: 'Additional Details',
      body: 'Next of Kin (the legal contact, recorded separately from Emergency Contact), known allergies, a brief medical history screening, disability/accessibility needs, preferred language, and referral source. Treatment and NDPR data-processing consent are required to proceed.',
    },
    {
      heading: 'Review & Confirm',
      body: 'A read-only summary of everything entered — use the Edit link on any section to jump back and correct it. Check the confirmation box to enable "Complete Registration," which saves the patient and shows their MRN.',
    },
    {
      heading: 'Saving progress',
      body: '"Save as Draft" keeps your progress without validating every field, so you can finish it later from Patient Directory. "Next" validates the current step before moving on.',
    },
  ],
};

const CHECK_IN_GUIDE: HelpGuide = {
  id: 'check-in',
  title: 'Check-In',
  intro: "Verify a patient's appointment, check them in, and assign a queue number.",
  sections: [
    {
      heading: 'Verify Appointment vs Walk-in Registration',
      body: "Verify Appointment looks up today's scheduled appointment for the patient you search for. Walk-in Registration skips that lookup entirely — use it for patients arriving without a prior booking.",
    },
    {
      heading: 'Finding a patient',
      body: 'Search by name, MRN, phone, or National ID, or use Scan ID to pull up a patient instantly from their card or QR code.',
    },
    {
      heading: 'Visit Details',
      body: 'In Verify Appointment mode these fields pre-fill from the matched appointment. In Walk-in Registration mode you fill them in directly — Visit Type, Department, and Purpose of Visit are required either way.',
    },
    {
      heading: 'Queue, routing, and notification',
      body: 'Assign Queue Number generates the next number for today. Route to Clinic sets which unit and room the patient is sent to. Notify Department sends an arrival alert to that unit.',
    },
    {
      heading: 'Completing check-in',
      body: 'The progress bar at the bottom tracks all five steps. Complete Check-In only unlocks once a patient is found, Visit Details are filled in, and a queue number has been assigned.',
    },
  ],
};

const QUEUE_MANAGEMENT_GUIDE: HelpGuide = {
  id: 'queue-management',
  title: 'Queue Management',
  intro: 'Monitor every patient waiting across departments and prioritize urgent cases.',
  sections: [
    {
      heading: 'Department tabs and filters',
      body: 'Switch between departments with the tabs, then narrow further with the Clinic and Status filters or the search box (patient name, MRN, or queue number).',
    },
    {
      heading: 'Reading the queue',
      body: 'Wait Time updates live from each arrival time. Rows in red are Emergency patients — they are pulled to the top of clinical priority regardless of arrival order.',
    },
    {
      heading: 'Row actions',
      body: 'Each row has three quick actions: Reassign (move to another department/clinic), Prioritize (flag as Emergency), and Check-In Complete (mark the visit as served).',
    },
    {
      heading: 'Queue Details panel',
      body: 'Selecting a row opens its full detail on the right — department, clinic, attending doctor, and a timestamped history of everything that happened to this queue entry.',
    },
    {
      heading: 'Quick Actions',
      body: 'The bottom row mirrors the panel actions for whichever patient is currently selected, plus a shortcut to register a new walk-in patient from Check-In.',
    },
  ],
};

const APPOINTMENT_SCHEDULING_GUIDE: HelpGuide = {
  id: 'appointment-scheduling',
  title: 'Appointment Scheduling',
  intro: "Book, reschedule, or cancel a patient appointment against any doctor's calendar.",
  sections: [
    {
      heading: 'Search Patient and the booking form',
      body: 'Find the patient first, then fill in Department, Doctor, Visit Type, Date and Time — these are required before a slot can be booked. Appointment Mode and Reason for Visit are optional context.',
    },
    {
      heading: 'Doctors panel and the calendar',
      body: 'The Doctors list is a browsing aid — search by name and pick a card to jump the booking form to that doctor and department. The calendar itself always shows every provider so you can compare availability side by side.',
    },
    {
      heading: 'Reading the calendar',
      body: 'Colored blocks are existing appointments (see the legend for what each status means); a dashed "Available Slot" outline marks the exact date/time/doctor combination currently set in the form.',
    },
    {
      heading: 'Day, Week and Month views',
      body: "Day is the full schedule for one doctor's clinic. Week and Month summarize appointment counts for the doctor currently selected in the form — click any day to jump straight to its Day view.",
    },
    {
      heading: 'Reschedule and Cancel',
      body: 'Both require an existing appointment to be selected first — click any block in the calendar. Reschedule opens an inline date/time picker; Cancel marks it Cancelled without deleting its history.',
    },
  ],
};

const PATIENT_PROFILE_REGISTRATION_GUIDE: HelpGuide = {
  id: 'patient-profile-registration',
  title: 'Patient Profile',
  intro:
    'A full administrative record for one patient — demographics, insurance, student details, and activity history.',
  sections: [
    {
      heading: 'Overview tab',
      body: "Personal Information, Contact Details, Next of Kin, Insurance, and Student Information are each editable independently via their own Edit link — changes to one section don't require re-entering the others.",
    },
    {
      heading: 'Medical Alerts',
      body: 'Allergies, chronic conditions, and other clinical alerts (e.g. religious or procedural restrictions) are reviewed periodically — "Add Alert" records a new one. The allergy banner above the tabs always reflects the same data.',
    },
    {
      heading: 'Registration History & Visit Summary',
      body: 'A timeline of everything that happened when this patient was registered, plus a running total of visits, the most recent one, and the next upcoming appointment.',
    },
    {
      heading: 'Quick Actions',
      body: 'Check the patient in, schedule an appointment, jump to their medical records, print their card, or upload a document — all without leaving this page.',
    },
  ],
};

const PATIENT_DIRECTORY_GUIDE: HelpGuide = {
  id: 'patient-directory',
  title: 'Patient Directory',
  intro: 'Search, filter, and manage every registered patient from one place.',
  sections: [
    {
      heading: 'Search and filters',
      body: 'Search by name, MRN, Student ID, National ID, phone, or email. The Filter panel narrows results by category, gender, faculty/department, registration date, appointment status, insurance provider, or status — Reset clears everything back to the full list.',
    },
    {
      heading: 'Patient details panel',
      body: 'Click any row to open that patient in the right-hand panel — full contact info, insurance, and registration history, plus Quick Actions to view their profile, check them in, print their card, or schedule an appointment.',
    },
    {
      heading: 'Bulk actions',
      body: 'Select multiple patients with the row checkboxes to export, print cards, assign a category, or archive records for the whole group at once.',
    },
    {
      heading: 'Exporting',
      body: 'Export downloads the currently filtered list as CSV or PDF. Export Selected in the bulk action bar exports only the checked rows.',
    },
  ],
};

const REGISTRATION_DASHBOARD_GUIDE: HelpGuide = {
  id: 'registration-dashboard',
  title: 'Patient Registration Dashboard',
  intro:
    'Your daily overview of registration activity — new patients, check-ins, and appointments.',
  sections: [
    {
      heading: 'Stat cards',
      body: 'Each card tracks one metric against yesterday — patients registered, new vs returning patients, check-in queue, appointments, and emergency registrations.',
    },
    {
      heading: 'Quick Actions',
      body: 'Jump straight to registering a patient, finding an existing one, checking someone in, scheduling an appointment, printing a patient card, or starting an emergency registration.',
    },
    {
      heading: 'Recent activity',
      body: "Today's Appointments and Recent Patient Registrations show the latest activity; System Announcements carries hospital-wide notices.",
    },
  ],
};

const DUTY_ROSTER_GUIDE: HelpGuide = {
  id: 'duty-roster',
  title: 'Workforce Management',
  intro: 'Manage doctor schedules, duty rosters, on-call coverage, and workforce operations.',
  sections: [
    {
      heading: 'Today’s Roster',
      body: 'Search by doctor name or filter by shift, role, and status. Each row shows the doctor’s shift, ward, current status, and whether they’ve acknowledged the assignment.',
    },
    {
      heading: 'Creating and editing shifts',
      body: 'Use "Create Shift" to add a new assignment, or the pencil icon on any row to edit one. The three-dot menu can duplicate or cancel a shift.',
    },
    {
      heading: 'Coverage and acknowledgements',
      body: 'The Coverage Overview card tracks staffing percentage by shift window. The Pending Acknowledgement card lists doctors who haven’t confirmed their shift yet — send a reminder directly from there.',
    },
    {
      heading: 'Publishing a roster',
      body: 'Generate Roster and Create Weekly Roster open the roster calendar. Publish Roster/Publish Schedule notifies all doctors of the current roster.',
    },
  ],
};

const DUTY_ROSTER_CALENDAR_GUIDE: HelpGuide = {
  id: 'duty-roster-calendar',
  title: 'Duty Roster Calendar',
  intro: 'A full calendar view of shift patterns and staff availability.',
  sections: [
    {
      heading: 'Switching views',
      body: 'Use the Day, Week, Month, and Timeline tabs to change how the roster is displayed. Prev/next and Today move you through the calendar.',
    },
    {
      heading: 'Reading the colour coding',
      body: 'The legend at the top maps each colour to a shift window — Morning, Afternoon, Night, and On-Call. Use the Filter button to isolate a single shift type.',
    },
    {
      heading: 'Creating a shift',
      body: 'Create Shift opens the same shift form used on the main Workforce Management page, so new assignments stay consistent across both views.',
    },
  ],
};

const SHIFT_TEMPLATES_GUIDE: HelpGuide = {
  id: 'shift-templates',
  title: 'Shift Templates',
  intro: 'Reusable shift patterns that speed up roster creation.',
  sections: [
    {
      heading: 'Building a template',
      body: 'A template groups shift slots — time window, required role, and headcount — under one reusable name, scoped to a department.',
    },
    {
      heading: 'Applying a template',
      body: '"Apply to Roster" generates the shifts defined in the template directly onto today\'s roster in one action, instead of creating each shift by hand.',
    },
    {
      heading: 'Managing templates',
      body: 'Duplicate a template to start a variation without editing the original. Inactive templates stay saved but are excluded from quick application.',
    },
  ],
};

const ON_CALL_GUIDE: HelpGuide = {
  id: 'on-call',
  title: 'On-Call Schedule',
  intro: 'On-call rota, emergency cover, and escalation chains by department.',
  sections: [
    {
      heading: 'Escalation chain',
      body: 'Each department shows a Primary, Secondary, and Consultant Backup on-call doctor — escalate down the chain if the primary contact is unavailable.',
    },
    {
      heading: 'Reaching an on-call doctor',
      body: 'The call icon dials the doctor directly. Availability badges (Available, Busy, Unavailable) update as doctors report their status.',
    },
    {
      heading: 'Reassigning on-call duty',
      body: 'Use Reassign on any on-call slot to hand the duty to a different doctor and update their contact number.',
    },
    {
      heading: 'Weekly schedule',
      body: "The table below shows the full week's on-call rotation by department and level — filter by department or escalation level to narrow it down.",
    },
  ],
};

const STAFF_ASSIGNMENTS_GUIDE: HelpGuide = {
  id: 'staff-assignments',
  title: 'Assign Doctors',
  intro: 'Ward and department allocation, with duty hand-off notes for incoming doctors.',
  sections: [
    {
      heading: 'Doctor pool',
      body: 'Every doctor shows their current ward and assignment status. Unassigned and on-leave doctors are flagged so gaps are easy to spot.',
    },
    {
      heading: 'Assigning a doctor',
      body: 'Assign or Reassign opens a form to pick a ward, an effective date, and optional hand-off notes for the incoming doctor.',
    },
    {
      heading: 'Duty hand-off log',
      body: 'Hand-off notes entered during an assignment are recorded here — a running log of what each incoming doctor was told about their ward.',
    },
  ],
};

const WORKFORCE_ANALYTICS_GUIDE: HelpGuide = {
  id: 'workforce-analytics',
  title: 'Workforce Analytics',
  intro: 'Staff utilisation, shift coverage, and overtime tracking.',
  sections: [
    {
      heading: 'Choosing a period',
      body: 'Switch between This Week, This Month, and This Quarter to change the range for every stat and chart on the page.',
    },
    {
      heading: 'Reading the charts',
      body: 'Utilization Trend shows staffing percentage over time. Department Coverage breaks down shift volume by department.',
    },
    {
      heading: 'Overtime tracking',
      body: 'Doctors are listed with total overtime hours and shift count for the selected period — hours at or above 30 are flagged in red.',
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

const REPORTS_GUIDE: HelpGuide = {
  id: 'reports',
  title: 'Clinical Reports',
  intro:
    'Your clinical activity at a glance — consultations, lab orders, prescriptions, and referrals.',
  sections: [
    {
      heading: 'Period filter',
      body: 'Switch between This Week, This Month, and This Quarter — the stat cards and both charts update to match.',
    },
    {
      heading: 'Charts',
      body: 'Daily/weekly/monthly consultations show as a bar chart; Diagnosis Distribution shows the split of diagnoses recorded in the period as a donut chart.',
    },
    {
      heading: 'Referral report',
      body: 'Every referral you have made, with its current status — Accepted, Pending, or Declined.',
    },
    {
      heading: 'Export',
      body: "Export downloads the current period's report as a CSV.",
    },
  ],
};

const COLLABORATION_GUIDE: HelpGuide = {
  id: 'collaboration',
  title: 'Clinical Messages',
  intro:
    'Direct messaging between doctors — referral coordination, quick questions, case handoffs.',
  sections: [
    {
      heading: 'Conversations',
      body: 'Select a doctor from the list to open the thread. Unread conversations show a cyan count badge; search narrows the list by name or department.',
    },
    {
      heading: 'Patient context',
      body: "When a conversation relates to a referral or shared case, the patient's name and MRN appear in a strip below the doctor's name — check it before you write.",
    },
    {
      heading: 'Composing',
      body: 'Enter sends, Shift+Enter adds a new line. The toolbar can insert a quick template, reference the current patient context, or attach a file.',
      steps: [
        'Template icon — insert a canned clinical phrase',
        'Stethoscope icon — insert the patient context reference',
        'Paperclip icon — attach a file',
      ],
    },
    {
      heading: 'Conversation actions',
      body: 'Use the call icon to start a voice call, or the "⋮" menu to mute notifications or mark a conversation unread.',
    },
  ],
};

const NOTIFICATIONS_GUIDE: HelpGuide = {
  id: 'notifications',
  title: 'Notifications',
  intro: 'Every alert, assignment, and clinical message in one place, newest first.',
  sections: [
    {
      heading: 'Unread indicator',
      body: 'A cyan dot next to the title marks an unread notification. "Mark all as read" clears every dot at once.',
    },
    {
      heading: 'Opening a notification',
      body: 'Selecting a notification marks it read and takes you straight to the relevant patient, referral, schedule, or conversation.',
    },
    {
      heading: 'Types',
      body: 'Colour-coded by kind — red for critical/emergency alerts, green for clinical updates, purple for referrals, amber for schedule, blue for messages.',
    },
  ],
};

const PROFILE_GUIDE: HelpGuide = {
  id: 'profile',
  title: 'My Profile',
  intro:
    'Your professional identity as it appears across MyHxCare — role, credentials, and contact details.',
  sections: [
    {
      heading: 'Credentials',
      body: 'License number, medical council number, specialization, and department are managed by your administrator and shown here for reference.',
    },
    {
      heading: 'Editing',
      body: '"Edit Profile" lets you update your phone number and email — the contact details patients and colleagues use to reach you.',
    },
  ],
};

const SETTINGS_GUIDE: HelpGuide = {
  id: 'settings',
  title: 'Settings',
  intro: 'Manage your account, notification and display preferences, and security.',
  sections: [
    {
      heading: 'Account Information',
      body: 'Your name, role, and credentials are shown for reference — "Edit" next to Email or Phone updates just those two fields; "Edit Profile" opens the full profile page (including your photo).',
    },
    {
      heading: 'Preferences',
      body: 'Notification and Display toggles take effect immediately, but only persist once you select "Save Changes" at the top of the page.',
    },
    {
      heading: 'Security & Access',
      body: 'Change your password, enable two-factor authentication, review active sessions, or open the Clinical Audit Log from here.',
    },
    {
      heading: 'Role Permissions',
      body: 'A read-only summary of what your current role can and cannot do — set by your administrator, not editable here.',
    },
  ],
};

const AUDIT_LOG_GUIDE: HelpGuide = {
  id: 'audit-log',
  title: 'Clinical Audit Log',
  intro: 'A chronological record of your clinical and account activity.',
  sections: [
    {
      heading: 'Reading the log',
      body: 'Entries are grouped by day, newest first. Each entry is colour-coded by category — consultation, laboratory, prescription, referral, emergency, or account.',
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
  if (pathname.startsWith('/medical-records/dashboard')) return MEDICAL_RECORDS_DASHBOARD_GUIDE;
  if (pathname.startsWith('/medical-records')) return MEDICAL_RECORDS_GUIDE;
  if (pathname.startsWith('/registration/register')) return REGISTER_PATIENT_GUIDE;
  if (pathname.startsWith('/registration/directory')) return PATIENT_DIRECTORY_GUIDE;
  if (pathname.startsWith('/registration/profile')) return PATIENT_PROFILE_REGISTRATION_GUIDE;
  if (pathname.startsWith('/registration/check-in')) return CHECK_IN_GUIDE;
  if (pathname.startsWith('/registration/queue')) return QUEUE_MANAGEMENT_GUIDE;
  if (pathname.startsWith('/registration/appointments')) return APPOINTMENT_SCHEDULING_GUIDE;
  if (pathname.startsWith('/registration')) return REGISTRATION_DASHBOARD_GUIDE;
  if (pathname.startsWith('/my-schedule')) return MY_SCHEDULE_GUIDE;
  if (pathname.startsWith('/duty-roster/roster')) return DUTY_ROSTER_CALENDAR_GUIDE;
  if (pathname.startsWith('/duty-roster/templates')) return SHIFT_TEMPLATES_GUIDE;
  if (pathname.startsWith('/duty-roster/on-call')) return ON_CALL_GUIDE;
  if (pathname.startsWith('/duty-roster/assignments')) return STAFF_ASSIGNMENTS_GUIDE;
  if (pathname.startsWith('/duty-roster/analytics')) return WORKFORCE_ANALYTICS_GUIDE;
  if (pathname.startsWith('/duty-roster')) return DUTY_ROSTER_GUIDE;
  if (pathname.startsWith('/appointments')) return APPOINTMENTS_GUIDE;
  if (pathname.startsWith('/collaboration')) return COLLABORATION_GUIDE;
  if (pathname.startsWith('/reports')) return REPORTS_GUIDE;
  if (pathname.startsWith('/notifications')) return NOTIFICATIONS_GUIDE;
  if (pathname.startsWith('/profile')) return PROFILE_GUIDE;
  if (pathname.startsWith('/settings/audit-log')) return AUDIT_LOG_GUIDE;
  if (pathname.startsWith('/settings')) return SETTINGS_GUIDE;
  return GENERAL_GUIDE;
}
