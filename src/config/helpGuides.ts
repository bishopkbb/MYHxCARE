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
  intro: 'Refer a patient out, or accept a referral another department has sent to us.',
  sections: [
    {
      heading: 'Finding a patient',
      body: 'On the "Refer a Patient" tab, search by name or MRN, or narrow the list with the status pills — Admitted, Active, Follow up, Referred, or Discharged.',
    },
    {
      heading: 'Starting a referral',
      body: 'Select "Refer" (or tap a patient card on mobile) to open the referral form for that patient.',
    },
    {
      heading: 'Incoming Referrals',
      body: 'The second tab lists referrals other departments have sent to us, with a badge showing how many are still Pending. Accept a pending referral to take it on, then Mark Completed once the consultation is done.',
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

const VISIT_HISTORY_GUIDE: HelpGuide = {
  id: 'visit-history',
  title: 'Visit History',
  intro:
    "Find any patient first, then review a filterable log of every encounter they've had, across every department.",
  sections: [
    {
      heading: 'Finding a patient',
      body: 'Search by name, MRN, or Student ID across the full patient list, or browse the paginated table directly. Selecting a patient opens their visit history; "Change Patient" returns to this search at any time.',
    },
    {
      heading: 'Filtering',
      body: 'Narrow the list by Date Range, Department, Visit Type, or Status. "Filter" confirms how many visits currently match; the table itself already updates live as you change any filter.',
    },
    {
      heading: 'Reading a visit',
      body: 'Each row shows the department, the attending provider with their credentials, the visit type, and a short diagnosis summary. The eye icon opens that visit; the second icon downloads a summary for it.',
    },
    {
      heading: 'Visit Summary',
      body: "The panel on the right totals this patient's visits, departments, and emergency presentations at a glance — recomputed from the same visits shown in the table below.",
    },
    {
      heading: 'Export',
      body: 'Export produces a CSV or PDF of exactly the visits currently passing your filters, not the full unfiltered history.',
    },
  ],
};

const CLINICAL_DOCUMENTS_GUIDE: HelpGuide = {
  id: 'clinical-documents',
  title: 'Clinical Documents',
  intro:
    'Find any patient first, then browse and organize every clinical document on their record by category.',
  sections: [
    {
      heading: 'Finding a patient',
      body: 'Search by name, MRN, or Student ID, or browse the paginated table directly. Selecting a patient opens their document library; "Change Patient" returns to this search at any time.',
    },
    {
      heading: 'Category tabs and Document Categories',
      body: 'The tabs above the table and the "Document Categories" panel on the right both filter by the same category — Consultation Notes, Discharge Summaries, Referral Letters, Medical Certificates, Imaging Reports, and Consent Forms. Use whichever is more convenient; they stay in sync.',
    },
    {
      heading: 'Filtering',
      body: 'Narrow further by Department or Date Range, then "Filter" to confirm the match count. "Reset" clears every filter, including the active category.',
    },
    {
      heading: 'Row actions',
      body: 'The eye icon opens a document, the download icon saves it, and the overflow menu offers renaming or sharing with the care team.',
    },
    {
      heading: 'Storage Summary',
      body: "The donut chart on the right breaks this patient's documents down by file type (PDF, Image, Other) rather than by clinical category, so you can see storage composition at a glance.",
    },
  ],
};

const MEDICAL_RECORD_PATIENT_GUIDE: HelpGuide = {
  id: 'medical-record-patient',
  title: 'Medical Record',
  intro:
    'The complete clinical record for one patient — summary, documents, activity, and access history.',
  sections: [
    {
      heading: 'Overview tab',
      body: 'Medical Summary and Record Information sit side by side, followed by Documents & Files below. The other tabs (Visit History, Medical Documents, Lab Results, and more under "More") each open a focused view of one part of this same record.',
    },
    {
      heading: 'Documents & Files',
      body: 'Filter by document type with the pills above the table, then use the row actions to view, download, rename, share, or delete a document. "Link Document" attaches an existing file to this record without a fresh upload.',
    },
    {
      heading: 'Record Activity and Access',
      body: 'Activity is a timestamped trail of everything that changed on this record. Access lists everyone who has opened it — both exist to support the audit-log requirement noted at the bottom of the page.',
    },
    {
      heading: 'Quick Actions',
      body: "Add a clinical note, request a correction to this record, jump to the full visit history, or update demographics (handled from the patient's Registration profile) — all without leaving this page.",
    },
  ],
};

const RECORD_REQUESTS_GUIDE: HelpGuide = {
  id: 'record-requests',
  title: 'Record Requests',
  intro: 'Track and act on every internal and external request for a copy of a patient record.',
  sections: [
    {
      heading: 'Status tabs',
      body: 'All Requests, Pending, In Progress, Fulfilled, and Rejected each filter the same table — the stat cards above show live counts per status.',
    },
    {
      heading: 'Filtering',
      body: 'Search by patient, MRN, or request number, or narrow by requester type (Internal, External, Insurance, Legal, Patient Self-Request).',
    },
    {
      heading: 'Working a request',
      body: 'Open the eye icon to see the full request, then Approve & Start (Pending → In Progress), Mark Fulfilled (In Progress → Fulfilled), or Reject — each transition is logged with a timestamp.',
    },
    {
      heading: 'New Request',
      body: 'Log a request on a requester’s behalf — pick the patient, who’s asking, why, and by when it’s needed.',
    },
  ],
};

const ARCHIVED_RECORDS_GUIDE: HelpGuide = {
  id: 'archived-records',
  title: 'Archived Records',
  intro:
    'Patient records retired from the active register — restorable on request until retention lapses.',
  sections: [
    {
      heading: 'Why a record is archived',
      body: 'Graduation/leaving the institution, transfer to another facility, death, a duplicate entry, or the records retention policy aging out an inactive record — the Reason column and filter cover all five.',
    },
    {
      heading: 'Retention Expiring Soon',
      body: 'This stat flags records whose retention window closes within 90 days — a signal to review before they become eligible for permanent deletion.',
    },
    {
      heading: 'Restoring a record',
      body: 'The restore icon moves a record back to the active register immediately after a confirmation step — it becomes searchable everywhere again, including Patient Directory.',
    },
  ],
};

const DOCUMENT_UPLOAD_GUIDE: HelpGuide = {
  id: 'document-upload',
  title: 'Document Upload',
  intro: 'Scan or attach a document straight into a patient’s clinical record.',
  sections: [
    {
      heading: 'Finding a patient',
      body: 'Search or browse the full patient list first — everything below applies to whichever patient you select.',
    },
    {
      heading: 'Adding files',
      body: 'Drag files onto the drop zone or click to browse. PDF, JPG, and PNG are accepted up to 20MB each; remove a file from the list before uploading if you added it by mistake.',
    },
    {
      heading: 'Document Type and Department',
      body: 'Both are required — Document Type determines which Clinical Documents category and tab the file lands in once uploaded.',
    },
    {
      heading: 'Link to Visit',
      body: 'Optional, but linking a visit lets clinicians find this document from that visit’s entry in Visit History rather than only from Clinical Documents.',
    },
  ],
};

const PATIENT_STATISTICS_GUIDE: HelpGuide = {
  id: 'patient-statistics',
  title: 'Patient Statistics',
  intro: 'Comprehensive overview of patient demographics and center performance.',
  sections: [
    {
      heading: 'Stat cards and exports',
      body: 'Total/Active Patients, Male/Female, and Students/Staff summarize the whole center. Dashboard Snapshot, Export Excel, and Export PDF capture this view for sharing.',
    },
    {
      heading: 'Distribution charts',
      body: 'Age, Gender, and Faculty Distribution (Students) break the total down by category. Top Diagnoses ranks the most common conditions seen this period.',
    },
    {
      heading: 'Visit Frequency and Monthly Growth',
      body: 'Visit Frequency shows how many patients return versus visit once. Monthly Growth tracks new patient registrations over time.',
    },
    {
      heading: 'Key Insights',
      body: 'Most Visited Department, Most Common Complaint, Repeat Visits, Average Visits Per Student, and Peak Clinic Hours highlight the standout numbers from this period at a glance.',
    },
  ],
};

const DAILY_ATTENDANCE_GUIDE: HelpGuide = {
  id: 'daily-attendance',
  title: 'Daily Attendance',
  intro: 'Real-time overview of patient attendance and visit status.',
  sections: [
    {
      heading: 'Stat cards',
      body: 'Patients Checked-In, Completed Visits, Waiting, No Shows, Emergencies, and Average Waiting Time all compare against yesterday.',
    },
    {
      heading: 'Filters',
      body: 'Narrow the charts and table by Date, Department, Doctor, Clinic, or Status, then Apply Filters. Reset returns to the full unfiltered view.',
    },
    {
      heading: 'Charts',
      body: "Hourly Attendance tracks footfall through the day. Department Attendance breaks down today's check-ins by department. Average Waiting Time compares wait times across departments.",
    },
    {
      heading: 'Attendance table',
      body: 'Click a row (or its eye icon) to select a patient, then use View Patient to jump to their record. Export and Print act on every row currently passing your filters.',
    },
  ],
};

const REGISTRATION_REPORTS_GUIDE: HelpGuide = {
  id: 'registration-reports',
  title: 'Registration Reports',
  intro: 'Analytics and insights on patient registrations and operational performance.',
  sections: [
    {
      heading: 'Stat cards',
      body: 'Total Registrations, New Patients, Returning Patients, Walk-ins, Emergency Registrations, and Appointments each compare against last month, with a mini trend line.',
    },
    {
      heading: 'Filters',
      body: 'Narrow every chart and the table below by Date Range, Department, Registration Type, Student Category, Faculty, Gender, or Age Group, then Apply Filters. Reset returns to the full unfiltered view.',
    },
    {
      heading: 'Charts',
      body: 'Registrations by Day and by Month track volume over time. Faculty Distribution and Gender Distribution break down the same total by category. Peak Registration Hours shows when registrations happen during the day.',
    },
    {
      heading: 'Registrations Details',
      body: 'Every registration, one row per patient. Export PDF, Excel, CSV, or Print exports exactly the rows currently passing your filters.',
    },
  ],
};

const PATIENT_CARD_PRINTING_GUIDE: HelpGuide = {
  id: 'patient-card-printing',
  title: 'Patient Card Printing',
  intro: 'Issue, print, and manage patient identification cards.',
  sections: [
    {
      heading: 'Card list and filters',
      body: 'Search by patient name, MRN, or card ID, then narrow by Card Type, Status, or issue date. Checkboxes let you select several cards for a batch print.',
    },
    {
      heading: 'Card Preview',
      body: 'Selecting a card shows a real preview of the printed ID card alongside print history — status, print count, and who last printed it.',
    },
    {
      heading: 'Actions',
      body: "Print and Reprint generate a printable card (opens your browser's print dialog); Download PDF saves it; Report Lost/Damaged flags the card for reissue.",
    },
    {
      heading: 'Quick Actions',
      body: "New Card Print starts a fresh card for a patient. Batch Print sends every checked card to print at once. Card Templates lets you start a new card pre-set to a template's card type.",
    },
  ],
};

const CONSENT_FORMS_GUIDE: HelpGuide = {
  id: 'consent-forms',
  title: 'Consent Forms',
  intro: 'Manage patient consent forms and treatment authorizations.',
  sections: [
    {
      heading: 'Stat cards and filters',
      body: 'The cards summarize consent volume at a glance. Search by patient, MRN, or consent ID, then narrow by Consent Type, Department, Signature Status, Doctor, Date Created, or Procedure Type.',
    },
    {
      heading: 'Consent Details panel',
      body: 'Selecting a row opens its detail panel with Overview, Timeline, and Audit Trail tabs — patient info, consent information, required signatures, and a QR verification code.',
    },
    {
      heading: 'Required Signatures',
      body: 'Click a Pending signature badge to record it as signed. Once every required signer has signed, the consent automatically moves to Signed.',
    },
    {
      heading: 'Actions',
      body: "View, Edit, Download PDF, Print, Request Signature, and Archive are available both from each row's ⋮ menu and from the detail panel.",
    },
    {
      heading: 'Quick Actions',
      body: 'New Consent Form and Generate Consent open the creation form. Request Digital Signature, Print Consent, Upload Signed Copy, and Archive Consent act on whichever consent is currently selected.',
    },
  ],
};

const INSURANCE_VERIFICATION_GUIDE: HelpGuide = {
  id: 'insurance-verification',
  title: 'Insurance Verification',
  intro:
    'Verify a patient’s insurance coverage, check eligibility, and record authorization status.',
  sections: [
    {
      heading: 'Finding a patient',
      body: 'Search or browse the full patient list first — everything below applies to whichever patient you select.',
    },
    {
      heading: 'Insurance Information and Verification',
      body: 'Enter the policy details, then run Real-time Eligibility Check or Manual Verification. Verify Eligibility populates the Verification Result card and adds an entry to the Activity Timeline.',
    },
    {
      heading: 'Coverage Details',
      body: 'Shows the per-category coverage percentage, copay, coinsurance, and limit that apply once eligibility is confirmed.',
    },
    {
      heading: 'Authorization',
      body: 'Record whether prior authorization was granted, its reference number, and the next review date — required before completing the verification.',
    },
    {
      heading: 'Saving',
      body: 'Save as Draft keeps your progress without finalizing; Save & Complete requires Insurance Provider, Policy Number, and Policy Holder Name.',
    },
  ],
};

const REFERRAL_MANAGEMENT_GUIDE: HelpGuide = {
  id: 'referral-management',
  title: 'Referral Management',
  intro: 'Track and manage incoming and outgoing patient referrals between departments.',
  sections: [
    {
      heading: 'Tabs and filters',
      body: 'Switch between All, Incoming, Outgoing, Pending, Completed, and Cancelled, then narrow further with search, Type, Status, Department, and Date Range.',
    },
    {
      heading: 'Referral rows',
      body: 'Click a row or the eye icon to open its full detail. The ⋮ menu offers Accept, Mark Completed, or Cancel depending on the referral’s current status.',
    },
    {
      heading: 'New Referral',
      body: 'New Referral (and the two Quick Actions) opens the same form pre-set to Outgoing or Incoming — patient, departments, referring physician, priority, and reason are required before submitting.',
    },
    {
      heading: 'Referral Directory and Templates',
      body: 'Referral Directory lists departments and contacts for outgoing referrals. Referral Templates lets you start a new referral pre-filled from a standard letter.',
    },
    {
      heading: 'Referral Overview',
      body: 'The donut chart and Recent Activity panel summarize referral volume and the latest status changes at a glance.',
    },
  ],
};

const MEDICAL_RECORDS_REPORTS_GUIDE: HelpGuide = {
  id: 'medical-records-reports',
  title: 'Medical Records Reports',
  intro: 'Monitor record management performance and activity across every department.',
  sections: [
    {
      heading: 'Stat cards',
      body: 'Records Retrieved, Updated, New Medical Files, Archived Records, Record Requests, and Avg. Retrieval Time each compare against last month.',
    },
    {
      heading: 'Filters',
      body: 'Narrow everything below — charts and the activity table — by date range, officer, department, or record status, then Apply Filters. Reset returns to the full unfiltered view.',
    },
    {
      heading: 'Charts',
      body: 'Retrieval Trend and Archive Trend track daily volume across the selected range. Record Requests breaks down status (Pending/In Progress/Completed/Rejected). Department Usage ranks departments by records retrieved.',
    },
    {
      heading: 'Medical Records Activity',
      body: 'Every retrieval, update, and archive action, one row per event. Export PDF, Excel, or CSV exports exactly the rows currently passing your filters.',
    },
  ],
};

const STAFF_NOTIFICATIONS_GUIDE: HelpGuide = {
  id: 'staff-notifications',
  title: 'Notifications',
  intro:
    'Real-time operational alerts — registrations, queue, consent, insurance, and records activity.',
  sections: [
    {
      heading: 'Stat cards',
      body: 'Unread, Today, This Week, and Critical Alerts summarize the list below at a glance.',
    },
    {
      heading: 'Notification Categories',
      body: 'Click a category on the left (or use the Notification Type filter) to narrow the list — they stay in sync with each other.',
    },
    {
      heading: 'Filtering',
      body: 'Combine Priority, Date, Department, and Notification Type, then Filter. Reset clears everything back to the full list.',
    },
    {
      heading: 'Row actions',
      body: 'The eye icon marks a notification read and shows its full detail. The folder icon opens the related patient record when one is linked. The trash icon removes it from your list.',
    },
  ],
};

const EMERGENCY_REGISTRATION_GUIDE: HelpGuide = {
  id: 'emergency-registration',
  title: 'Emergency Registration',
  intro:
    'The fast path for an emergency arrival — minimal required fields, immediate routing to the ED.',
  sections: [
    {
      heading: 'Known vs Unknown Patient',
      body: 'Known Patient searches the existing patient record and locks Age, Gender and Date of Birth to what is already on file. Unknown Patient (the default for an unidentified arrival) leaves every field editable and assigns a new emergency MRN automatically.',
    },
    {
      heading: 'Required fields',
      body: 'Patient Name, Age, Gender, Emergency Contact (Name, Relationship, Phone), Arrival Time, Arrival By, Triage Priority and Chief Complaint must all be filled in before registration can complete — everything else is optional context for the triage nurse.',
    },
    {
      heading: 'Triage Priority',
      body: 'Red (Immediate) through Blue (Non-Urgent) sets how urgently the triage nurse should see the patient. It drives the Status shown in the Registration Summary and is visible to the ED team the moment registration completes.',
    },
    {
      heading: 'Registration Summary and Routing',
      body: 'The right-hand panel mirrors the form live, including a preview of the emergency MRN before you submit. Routing Information confirms the patient goes straight to the Emergency Department / Triage Area, and Next Steps tracks what happens after registration.',
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

const NURSE_DASHBOARD_GUIDE: HelpGuide = {
  id: 'nurse-dashboard',
  title: 'Nurse Dashboard',
  intro: 'Your patient care overview for the shift — assigned patients, medications, and alerts.',
  sections: [
    {
      heading: 'Stat cards and current shift',
      body: 'Patients under your care, medication due, admissions today, pending vital signs, and critical alerts summarize the shift at a glance. The shift chip on the right shows your current shift and its time range.',
    },
    {
      heading: 'Quick Actions',
      body: 'Jump straight to recording vitals, administering medication, adding a nursing note, admitting a patient, starting a shift handover, or raising an emergency response.',
    },
    {
      heading: 'My Patients and Medication Due',
      body: 'My Patients lists everyone currently assigned to you with ward, bed, and condition. Medication Due shows the next doses in order, with overdue times highlighted in red.',
    },
    {
      heading: 'Alerts, Admissions, and Ward Census',
      body: "Alerts & Notifications surfaces anything requiring immediate attention. Today's Admissions tracks new patients awaiting assessment. Ward Census Summary shows bed occupancy for the ward.",
    },
    {
      heading: 'Upcoming Tasks',
      body: 'A checklist of scheduled rounds and tasks for the rest of your shift — tick items off as you complete them, or open your full duty schedule.',
    },
  ],
};

const NURSE_WORKFORCE_MANAGEMENT_GUIDE: HelpGuide = {
  id: 'nurse-workforce-management',
  title: 'Workforce Management',
  intro:
    'Manage nursing staff schedules, duty rosters, and shift coverage. Visible only to the ward Matron.',
  sections: [
    {
      heading: 'Stat cards',
      body: 'Nurses on Duty, Today’s Shifts, On-Call Nurses, Shift Acknowledgement, Coverage Status, and Shift Changes summarize the roster at a glance.',
    },
    {
      heading: "Today's Roster",
      body: 'Search by nurse name or filter by ward, shift type, role, and status. Each row shows the ward, shift time, and acknowledgement state.',
    },
    {
      heading: 'Create and edit shifts',
      body: 'Create Shift opens a form for staff name, role, ward, shift type, and status. The pencil icon on a row reopens the same form pre-filled for editing.',
    },
    {
      heading: 'Coverage and acknowledgement',
      body: 'The Coverage Overview panel tracks ward coverage by shift. Pending Shift Acknowledgement lists nurses who haven’t confirmed their shift yet, with a one-tap reminder.',
    },
  ],
};

const REGISTRATION_WORKFORCE_MANAGEMENT_GUIDE: HelpGuide = {
  id: 'registration-workforce-management',
  title: 'Workforce Management',
  intro:
    'Manage registration desk schedules, duty rosters, and shift coverage. Visible only to the registration supervisor.',
  sections: [
    {
      heading: 'Stat cards',
      body: 'Staff on Duty, Today’s Shifts, On-Call Staff, Shift Acknowledgement, Coverage Status, and Shift Changes summarize the roster at a glance.',
    },
    {
      heading: "Today's Roster",
      body: 'Search by staff name or filter by shift type, role, and status. Each row shows the station, shift time, and acknowledgement state.',
    },
    {
      heading: 'Create and edit shifts',
      body: 'Create Shift opens a form for staff name, role, station, shift type, and status. The pencil icon on a row reopens the same form pre-filled for editing.',
    },
    {
      heading: 'Coverage and acknowledgement',
      body: 'The Coverage Overview panel tracks desk coverage by shift. Pending Shift Acknowledgement lists staff who haven’t confirmed their shift yet, with a one-tap reminder.',
    },
  ],
};

const RECORDS_WORKFORCE_MANAGEMENT_GUIDE: HelpGuide = {
  id: 'records-workforce-management',
  title: 'Workforce Management',
  intro:
    'Manage medical records staff schedules, duty rosters, and shift coverage. Visible only to the records supervisor.',
  sections: [
    {
      heading: 'Stat cards',
      body: 'Staff on Duty, Today’s Shifts, On-Call Staff, Shift Acknowledgement, Coverage Status, and Shift Changes summarize the roster at a glance.',
    },
    {
      heading: "Today's Roster",
      body: 'Search by staff name or filter by shift type, role, and status. Each row shows the station, shift time, and acknowledgement state.',
    },
    {
      heading: 'Create and edit shifts',
      body: 'Create Shift opens a form for staff name, role, station, shift type, and status. The pencil icon on a row reopens the same form pre-filled for editing.',
    },
    {
      heading: 'Coverage and acknowledgement',
      body: 'The Coverage Overview panel tracks station coverage by shift. Pending Shift Acknowledgement lists staff who haven’t confirmed their shift yet, with a one-tap reminder.',
    },
  ],
};

const PATIENT_RECORD_GUIDE: HelpGuide = {
  id: 'patient-record',
  title: 'Patient Record',
  intro: 'The full clinical chart for one patient, organised into tabs.',
  sections: [
    {
      heading: 'Header',
      body: 'Demographics, ward/bed, admission date, length of stay, and assigned doctor sit alongside risk level, allergies, code status, and the current diagnosis.',
    },
    {
      heading: 'Allergy banner',
      body: 'Recorded allergies always show at the top in red — this banner never collapses and appears on every patient screen for safety.',
    },
    {
      heading: 'Overview tab',
      body: 'Key Information, Latest Vitals, Alerts, Diagnosis & Clinical Summary, Care Plan Summary, and Intake & Output summarize the patient at a glance. The sidebar tracks Care Plan Progress, the next medication due, upcoming nursing tasks, and recent nursing notes.',
    },
    {
      heading: 'Other tabs',
      body: 'Vitals, Medication, Nursing Notes, Care Plan, Laboratory, Radiology, Clinical Timeline, and Documents each open a dedicated view — some are still being built out.',
    },
    {
      heading: 'Print Record',
      body: 'Generates a printable summary of the patient’s key information, diagnosis, and latest vitals.',
    },
  ],
};

const MY_PATIENTS_GUIDE: HelpGuide = {
  id: 'my-patients',
  title: 'My Patients',
  intro: 'The full roster of patients assigned to you during this shift.',
  sections: [
    {
      heading: 'Stat cards',
      body: 'Total My Patients, High Risk Patients, Due Medications, Due Observations, and Stable Patients summarize your assigned roster.',
    },
    {
      heading: 'Filters and view',
      body: 'Narrow the roster by ward, risk level, or care status, or search by name, MRN, or diagnosis. Switch between Card View and List View with the toggle on the right.',
    },
    {
      heading: 'Patient cards',
      body: 'Each card shows risk level, ward/bed, diagnosis, assigned doctor, latest vitals, and the next medication due, plus the current care status.',
    },
    {
      heading: 'Actions',
      body: 'View Record opens full details in the side panel. Record Observation and Add Nursing Note take you straight into recording vitals or a note for that patient.',
    },
  ],
};

const VITAL_SIGNS_GUIDE: HelpGuide = {
  id: 'vital-signs',
  title: 'Vital Signs',
  intro: 'Monitor, record and track a patient’s vital signs and Early Warning Score.',
  sections: [
    {
      heading: 'Selecting a patient',
      body: 'Pick a patient from your assigned roster to open their vitals — search by name or MRN. "Change Patient" at the top of the header returns you to the picker.',
    },
    {
      heading: 'Stat tiles',
      body: 'Blood Pressure, Pulse, Respiratory Rate, Temperature, SpO₂, Pain Score, and Blood Sugar each show a High/Low/Normal badge; Weight and Height are recorded less often and show when they were last updated.',
    },
    {
      heading: 'Trend charts',
      body: 'Six charts track each vital over the selected window — 6 Hours, 24 Hours, 7 Days, or 30 Days.',
    },
    {
      heading: 'Early Warning Score (NEWS2)',
      body: 'A standard clinical score computed from the latest reading. Medium and High risk show an alert with the recommended monitoring level.',
    },
    {
      heading: 'Recording vitals',
      body: '"Record New Vitals" opens a form for every measurement at once; the new reading immediately updates the stat tiles, trend charts, and NEWS2 score.',
    },
    {
      heading: 'Actions',
      body: 'Escalate Patient notifies the assigned doctor for urgent review. Print Report downloads a PDF of recent readings.',
    },
  ],
};

const NURSE_LABORATORY_GUIDE: HelpGuide = {
  id: 'nurse-laboratory',
  title: 'Laboratory',
  intro:
    'View laboratory tests and results, and manage specimen collection. No result editing is allowed.',
  sections: [
    {
      heading: 'Tabs and stat cards',
      body: 'Pending Tests, Completed Results, Critical Results, and Doctor Requests — click a tab or its stat card to jump straight to it. Rows are sorted with STAT priority first.',
    },
    {
      heading: 'Collecting a sample',
      body: 'From Doctor Requests, "Collect Sample" requires confirming the patient’s identity with two identifiers (name and MRN) before the sample counts as collected — and confirming fasting status first for tests that require it.',
    },
    {
      heading: 'Rejected samples',
      body: 'If the laboratory rejects a sample, it appears in Pending Tests with the reason shown — "Recollect Sample" repeats the same identity-check flow.',
    },
    {
      heading: 'Critical results',
      body: 'A critical result must be read back and acknowledged — "Acknowledge & Notify Doctor" records which doctor was notified and when. Unacknowledged critical results are flagged in the sidebar.',
    },
    {
      heading: 'Overdue tests',
      body: 'A test still pending past its expected turnaround time is flagged Overdue, with a "Follow Up with Lab" action to chase it.',
    },
  ],
};

const OBSERVATION_CHARTS_GUIDE: HelpGuide = {
  id: 'observation-charts',
  title: 'Observation Charts',
  intro: 'Continuous patient monitoring and trends across every recorded observation.',
  sections: [
    {
      heading: 'Selecting a patient',
      body: 'Pick a patient from your assigned roster to open their charts — search by name or MRN. "Change Patient" at the top of the header returns you to the picker.',
    },
    {
      heading: 'Time range',
      body: 'Last 6 Hours, 12 Hours, 24 Hours, 3 Days, or 7 Days — every chart, the observation table, and the trends summary all update to the selected window.',
    },
    {
      heading: 'Charts',
      body: 'Temperature, Pulse, Respiration, Blood Pressure, Fluid Intake, Fluid Output, Pain Score, and Blood Sugar each show a trend over the selected window. "View Table" switches to a row-by-row table of the same data; "Export" downloads it as a PDF.',
    },
    {
      heading: 'Early Warning Score (NEWS2)',
      body: 'A standard clinical score computed from the latest reading. "View EWS History" shows how the score has changed across the selected window.',
    },
    {
      heading: 'Recording observations',
      body: '"Add New Observation" records a full new reading. "Input Fluid Balance" logs intake and output without a full observation. "Calculate EWS" recalculates the score from the latest reading.',
    },
  ],
};

const NURSING_ASSESSMENT_GUIDE: HelpGuide = {
  id: 'nursing-assessment',
  title: 'Nursing Assessment',
  intro: 'Complete a comprehensive nursing assessment for a patient, section by section.',
  sections: [
    {
      heading: 'Selecting a patient',
      body: 'Pick a patient from your assigned roster to start their assessment — search by name or MRN. "Change Patient" returns you to the picker.',
    },
    {
      heading: 'Assessment sections',
      body: 'Chief Complaint, Initial (ABCDE) and Physical Assessment, Pain, Fall Risk, Pressure Injury Risk, Nutrition Screening, Mental Status, Mobility, Fluid Balance, and an overall Assessment Summary — each section is scored or described independently.',
    },
    {
      heading: 'Risk scores',
      body: 'Fall Risk, Pressure Injury Risk, and Nutrition Risk each carry a Low/Moderate/High-style badge that colors to match severity, alongside the specific risk factors or interventions checked.',
    },
    {
      heading: 'Save as Draft vs. Submit',
      body: 'Save as Draft keeps your progress without finalizing it. Submit Assessment requires the Chief Complaint and Overall Assessment to be filled in, then adds the assessment to the patient record.',
    },
    {
      heading: 'Assessment Checklist',
      body: 'A running checklist of documentation steps — required fields, abnormal findings, care plan review, patient education, and follow-up — toggle each as you complete it.',
    },
  ],
};

const MEDICATION_ADMINISTRATION_GUIDE: HelpGuide = {
  id: 'medication-administration',
  title: 'Medication Administration (MAR)',
  intro: 'View and administer scheduled medications safely, with the 5 Rights front and center.',
  sections: [
    {
      heading: 'Selecting a patient',
      body: 'Pick a patient from your assigned roster to open their medication record — search by name or MRN. "Change Patient" returns you to the picker.',
    },
    {
      heading: 'Allergies and 5 Rights',
      body: 'Allergies show in the patient header, the full allergy banner, and the 5 Rights checklist reminds you to verify patient, medication, dose, route, and time before every administration.',
    },
    {
      heading: 'Scheduled, PRN, and Continuous tabs',
      body: 'Scheduled Medications are fixed-time doses; PRN Medications are as-needed; Continuous Infusions run ongoing. Filter any tab by Overdue, Due Now, Upcoming, or Completed, and toggle "Show Held Medications".',
    },
    {
      heading: 'Row actions',
      body: 'Administer records the dose as given. Overdue doses switch to Missed Dose. The ⋮ menu on each row also offers Hold Medication and Document Reaction.',
    },
    {
      heading: 'Administration Actions',
      body: 'The sidebar mirrors the row actions for whichever medication is currently selected — select a row first.',
    },
  ],
};

const NURSING_NOTES_GUIDE: HelpGuide = {
  id: 'nursing-notes',
  title: 'Nursing Notes',
  intro: 'View and add chronological nursing documentation for a patient.',
  sections: [
    {
      heading: 'Selecting a patient',
      body: 'Pick a patient from your assigned roster to open their nursing notes — search by name or MRN. "Change Patient" returns you to the picker.',
    },
    {
      heading: 'Tabs and filters',
      body: 'Notes List shows everything; My Notes filters to your own entries; the remaining tabs jump straight to a single note type. Search, Note Type, Date Range, and Author narrow the list further.',
    },
    {
      heading: 'Adding a note',
      body: 'Fill in Note Type, Date & Time, and Observation / Note (required), plus optional Intervention and Patient Response. Save as Draft keeps it editable; Save Note finalizes it. Add to Care Plan links the note to a care goal.',
    },
    {
      heading: 'Quick Note Templates',
      body: 'Click a template to pre-fill the note type and starter text. Manage Templates lets you add, edit, or remove templates.',
    },
    {
      heading: 'Editing and deleting',
      body: 'The ⋮ menu on each note row offers Edit Note (loads it back into the form) and Delete Note.',
    },
  ],
};

const CARE_PLANS_GUIDE: HelpGuide = {
  id: 'care-plans',
  title: 'Care Plans',
  intro: 'View and manage individualized nursing care plans for a patient.',
  sections: [
    {
      heading: 'Selecting a patient',
      body: 'Pick a patient from your assigned roster to open their care plans — search by name or MRN. "Change Patient" returns you to the picker.',
    },
    {
      heading: 'Tabs',
      body: 'Active Care Plans, All Care Plans, and Completed Plans filter the table by status. Care Plan History shows every progress entry across every plan, most recent first.',
    },
    {
      heading: 'Care plan table',
      body: 'Each row shows the problem, goal, start date, next review countdown, status, and assigned nurse. View Plan opens it in the detail panel below; the ⋮ menu offers Edit, Mark Complete, and Discontinue.',
    },
    {
      heading: 'Care Plan Details panel',
      body: 'Overview summarizes the problem, goal, interventions, and evaluation. Interventions lets you check off completed items and add new ones. Progress Notes lets you log a new entry. Evaluations lets you update the status and note. Timeline shows every progress entry for that plan. Documents lists attached files.',
    },
    {
      heading: 'Creating a care plan',
      body: 'Create New Care Plan (or a Quick Template) opens a form for the problem, goal, dates, assigned nurse, and interventions.',
    },
  ],
};

const WARD_CENSUS_GUIDE: HelpGuide = {
  id: 'ward-census',
  title: 'Ward Census',
  intro:
    'A live per-ward occupancy summary — occupied, available, and reserved beds, with patient acuity mix.',
  sections: [
    {
      heading: 'Facility stat cards',
      body: 'Total Beds, Occupied, Available, Reserved, and Cleaning summarize occupancy across every ward.',
    },
    {
      heading: 'Ward cards',
      body: 'Each card shows a ward’s nurse in charge, occupied/total beds, a stacked occupancy bar, and the occupancy percentage. Click a card to view that ward’s bed-level detail below.',
    },
    {
      heading: 'Bed-level table',
      body: 'Every bed in the selected ward, with its status, patient (if occupied), assigned doctor, acuity, and admission date. View Patient opens the full patient record for beds on your own roster.',
    },
    {
      heading: 'Ward Alerts',
      body: 'Flags capacity or housekeeping concerns for a specific ward — selecting an alert jumps straight to that ward.',
    },
    {
      heading: 'Refresh and print',
      body: 'Refresh reloads the current occupancy snapshot. Print Census Report opens your browser’s print dialog for the current view.',
    },
  ],
};

const BED_MANAGEMENT_GUIDE: HelpGuide = {
  id: 'bed-management',
  title: 'Bed Management',
  intro: 'Visualize ward layout and manage bed status.',
  sections: [
    {
      heading: 'Selecting a ward and view',
      body: 'Select Ward switches between wards. Ward View shows a visual room layout; List View shows a sortable table of the same beds.',
    },
    {
      heading: 'Filtering',
      body: 'Filter Beds narrows by status. Show Isolation Only and Show Cleaning Required narrow further to just those beds.',
    },
    {
      heading: 'Bed cards',
      body: 'Each bed is colored by status and shows the patient and MRN when occupied. Click a bed to view its details below; the ⋮ menu offers Transfer Patient, Reserve Bed, or Mark Available depending on its current status.',
    },
    {
      heading: 'Zoom',
      body: 'The − / + controls zoom the ward layout in and out; Reset View returns to 100%.',
    },
    {
      heading: 'Bed Details, Actions, and Legend',
      body: 'Bed Details shows the selected bed’s patient, diagnosis, doctor, and length of stay. Actions repeats the three status-changing actions for the selected bed. Legend maps each color to its bed status.',
    },
  ],
};

const ADMISSIONS_GUIDE: HelpGuide = {
  id: 'admissions',
  title: 'Admissions',
  intro: 'Track and manage newly admitted patients through the 7-step admission workflow.',
  sections: [
    {
      heading: 'Admission Workflow stepper',
      body: 'Registration, Doctor Assessment, Nursing Assessment, Assign Bed, Vital Signs, Care Plan, and Medication. Click a step to filter the table to admissions currently at that step; click again to clear it.',
    },
    {
      heading: 'Tabs',
      body: 'Current Admissions shows patients actively moving through the workflow or scheduled to arrive. Pending Admissions and Completed Today are filtered by status; All Admissions shows every record regardless of status.',
    },
    {
      heading: 'Filters',
      body: 'Search by patient name or MRN, and narrow by Status, Ward, or Admission Type. Filter applies the current search and dropdown selections.',
    },
    {
      heading: 'Table and actions',
      body: 'Each row shows the patient, MRN, admission date and time, ward, type, current step, and status. The ⋮ menu opens the patient record (once a bed is assigned), advances the workflow to the next step, or cancels the admission.',
    },
    {
      heading: 'Sidebar',
      body: 'Admissions Overview summarizes today’s totals by status. Workflow Progress shows how many admissions have reached each step. Recent Completed lists the latest finished admissions. Quick Actions starts a New Admission, opens Bed Availability, Admission Reports, or the Admission Checklist.',
    },
  ],
};

const DISCHARGES_GUIDE: HelpGuide = {
  id: 'discharges',
  title: 'Discharges',
  intro: 'Plan, track, and complete patient discharges through the 7-step discharge workflow.',
  sections: [
    {
      heading: 'Discharge Workflow stepper',
      body: 'Discharge Order, Medication Reconciliation, Patient Education, Pending Results, Discharge Summary, Follow-up & Transport, and Bed Released. Click a step to filter the table to plans currently at that step; click again to clear it.',
    },
    {
      heading: 'Tabs',
      body: 'Active Discharge Plans shows patients still working through earlier steps. Ready for Discharge shows patients at the last step before their bed is released. Discharged Today and All Discharges show completed and every record respectively.',
    },
    {
      heading: 'Filters',
      body: 'Search by patient name or MRN, and narrow by Status, Ward, or Discharge Type. Filter applies the current search and dropdown selections.',
    },
    {
      heading: 'Table and actions',
      body: 'Each row shows the patient, MRN, ward and bed, planned discharge date and time, discharge type, current step, and status. The ⋮ menu opens the patient record, advances the plan to the next step (or completes the discharge at the final step), or cancels the plan.',
    },
    {
      heading: 'Sidebar',
      body: 'Discharges Overview summarizes plans by status. Workflow Progress shows how many plans have reached each step. Recently Discharged lists the latest patients to leave. Quick Actions starts a new Plan Discharge, opens Bed Management, Discharge Reports, or the Discharge Checklist.',
    },
  ],
};

const PATIENT_QUEUE_GUIDE: HelpGuide = {
  id: 'patient-queue',
  title: 'Patient Queue',
  intro:
    'Every patient waiting on a nurse — from Registration check-in and triage through to medication, dressing, and observation for admitted patients.',
  sections: [
    {
      heading: 'Stat cards',
      body: 'Total in Queue, Overdue Tasks, Due Within 30 Min, Completed Today, Patients Under My Care, and Awaiting Triage summarize your workload at a glance.',
    },
    {
      heading: 'Filters',
      body: 'Narrow the list by ward, priority, task type, assigned doctor, or status, or search by patient name, MRN, or task.',
    },
    {
      heading: 'Task rows',
      body: 'Each row shows the patient, ward/bed, assigned doctor, the next nursing task, and how much time is left — overdue times are shown in red.',
    },
    {
      heading: 'Actions',
      body: 'Select the eye icon (or the row) to open task details in the side panel. Use the checkmark to mark a task complete, or the panel’s buttons to move it to In Progress or Complete.',
    },
    {
      heading: 'Awaiting Triage rows',
      body: 'Patients fresh from Registration check-in, not yet claimed by any nurse. Reassign moves them to another department/clinic, Mark Emergency flags high-priority cases, and Start Triage claims the patient into your caseload and opens Vital Signs immediately to record their first reading.',
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
  title: 'Messages',
  intro:
    'Direct messaging with any staff member across departments — coordination, quick questions, case handoffs.',
  sections: [
    {
      heading: 'Conversations',
      body: 'Select a colleague from the list to open the thread. Unread conversations show a cyan count badge; search narrows the list by name or department.',
    },
    {
      heading: 'Starting a conversation',
      body: 'The "+ New" button lists every staff member captured in the system who isn\'t already in your conversation list — pick anyone, from any department, to start chatting.',
    },
    {
      heading: 'Patient context',
      body: "When a conversation relates to a referral or shared case, the patient's name and MRN appear in a strip below the recipient's name — check it before you write.",
    },
    {
      heading: 'Composing',
      body: 'Enter sends, Shift+Enter adds a new line. The toolbar can insert a quick template, reference the current patient context, or attach a file.',
      steps: [
        'Template icon — insert a canned phrase',
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
  if (pathname.startsWith('/medical-records/visit-history')) return VISIT_HISTORY_GUIDE;
  if (pathname.startsWith('/medical-records/clinical-documents')) return CLINICAL_DOCUMENTS_GUIDE;
  if (pathname.startsWith('/medical-records/patient')) return MEDICAL_RECORD_PATIENT_GUIDE;
  if (pathname.startsWith('/medical-records/requests')) return RECORD_REQUESTS_GUIDE;
  if (pathname.startsWith('/medical-records/archived')) return ARCHIVED_RECORDS_GUIDE;
  if (pathname.startsWith('/medical-records/document-upload')) return DOCUMENT_UPLOAD_GUIDE;
  if (pathname.startsWith('/medical-records/messages')) return COLLABORATION_GUIDE;
  if (pathname.startsWith('/medical-records/notifications')) return STAFF_NOTIFICATIONS_GUIDE;
  if (pathname.startsWith('/medical-records/reports')) return MEDICAL_RECORDS_REPORTS_GUIDE;
  if (pathname.startsWith('/medical-records/patient-statistics')) return PATIENT_STATISTICS_GUIDE;
  if (pathname.startsWith('/medical-records/workforce-management'))
    return RECORDS_WORKFORCE_MANAGEMENT_GUIDE;
  if (pathname.startsWith('/medical-records')) return MEDICAL_RECORDS_GUIDE;
  if (pathname.startsWith('/registration/register')) return REGISTER_PATIENT_GUIDE;
  if (pathname.startsWith('/registration/directory')) return PATIENT_DIRECTORY_GUIDE;
  if (pathname.startsWith('/registration/profile')) return PATIENT_PROFILE_REGISTRATION_GUIDE;
  if (pathname.startsWith('/registration/check-in')) return CHECK_IN_GUIDE;
  if (pathname.startsWith('/registration/appointments')) return APPOINTMENT_SCHEDULING_GUIDE;
  if (pathname.startsWith('/registration/emergency')) return EMERGENCY_REGISTRATION_GUIDE;
  if (pathname.startsWith('/registration/insurance')) return INSURANCE_VERIFICATION_GUIDE;
  if (pathname.startsWith('/registration/referrals')) return REFERRAL_MANAGEMENT_GUIDE;
  if (pathname.startsWith('/registration/consent-forms')) return CONSENT_FORMS_GUIDE;
  if (pathname.startsWith('/registration/card-printing')) return PATIENT_CARD_PRINTING_GUIDE;
  if (pathname.startsWith('/registration/reports')) return REGISTRATION_REPORTS_GUIDE;
  if (pathname.startsWith('/registration/attendance')) return DAILY_ATTENDANCE_GUIDE;
  if (pathname.startsWith('/registration/messages')) return COLLABORATION_GUIDE;
  if (pathname.startsWith('/registration/notifications')) return STAFF_NOTIFICATIONS_GUIDE;
  if (pathname.startsWith('/registration/workforce-management'))
    return REGISTRATION_WORKFORCE_MANAGEMENT_GUIDE;
  if (pathname.startsWith('/registration')) return REGISTRATION_DASHBOARD_GUIDE;
  if (pathname.startsWith('/nurse/vital-signs')) return VITAL_SIGNS_GUIDE;
  if (pathname.startsWith('/nurse/observation-charts')) return OBSERVATION_CHARTS_GUIDE;
  if (pathname.startsWith('/nurse/laboratory')) return NURSE_LABORATORY_GUIDE;
  if (pathname.startsWith('/nurse/nursing-assessment')) return NURSING_ASSESSMENT_GUIDE;
  if (pathname.startsWith('/nurse/medication-administration'))
    return MEDICATION_ADMINISTRATION_GUIDE;
  if (pathname.startsWith('/nurse/nursing-notes')) return NURSING_NOTES_GUIDE;
  if (pathname.startsWith('/nurse/care-plans')) return CARE_PLANS_GUIDE;
  if (pathname.startsWith('/nurse/ward-census')) return WARD_CENSUS_GUIDE;
  if (pathname.startsWith('/nurse/patient-queue')) return PATIENT_QUEUE_GUIDE;
  if (/^\/nurse\/my-patients\/[^/]+/.test(pathname)) return PATIENT_RECORD_GUIDE;
  if (pathname.startsWith('/nurse/my-patients')) return MY_PATIENTS_GUIDE;
  if (pathname.startsWith('/nurse/workforce-management')) return NURSE_WORKFORCE_MANAGEMENT_GUIDE;
  if (pathname.startsWith('/nurse/messages')) return COLLABORATION_GUIDE;
  if (pathname.startsWith('/nurse')) return NURSE_DASHBOARD_GUIDE;
  if (pathname.startsWith('/wards')) return BED_MANAGEMENT_GUIDE;
  if (pathname.startsWith('/nurse/admissions')) return ADMISSIONS_GUIDE;
  if (pathname.startsWith('/nurse/discharges')) return DISCHARGES_GUIDE;
  if (pathname.startsWith('/my-schedule')) return MY_SCHEDULE_GUIDE;
  if (pathname.startsWith('/duty-roster/roster')) return DUTY_ROSTER_CALENDAR_GUIDE;
  if (pathname.startsWith('/duty-roster/templates')) return SHIFT_TEMPLATES_GUIDE;
  if (pathname.startsWith('/duty-roster/on-call')) return ON_CALL_GUIDE;
  if (pathname.startsWith('/duty-roster/assignments')) return STAFF_ASSIGNMENTS_GUIDE;
  if (pathname.startsWith('/duty-roster/analytics')) return WORKFORCE_ANALYTICS_GUIDE;
  if (pathname.startsWith('/duty-roster')) return DUTY_ROSTER_GUIDE;
  if (pathname.startsWith('/appointments')) return APPOINTMENTS_GUIDE;
  if (pathname.startsWith('/messages')) return COLLABORATION_GUIDE;
  if (pathname.startsWith('/reports')) return REPORTS_GUIDE;
  if (pathname.startsWith('/notifications')) return NOTIFICATIONS_GUIDE;
  if (pathname.startsWith('/profile')) return PROFILE_GUIDE;
  if (pathname.startsWith('/settings/audit-log')) return AUDIT_LOG_GUIDE;
  if (pathname.startsWith('/settings')) return SETTINGS_GUIDE;
  return GENERAL_GUIDE;
}
