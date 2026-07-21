/**
 * Mock fixtures for the Patient Record screen (nurse workspace).
 * Swap out by pointing hooks to a real patient-chart endpoint in Phase 6.
 */

import type { Allergy } from '@/types/patient.types';
import { type NursePatient } from '@/features/nursing/__mocks__/myPatientsFixtures';
import { getEffectiveRoster } from '@/features/nursing/store/nursingWorkflowStore';

function atOffset(dayOffset: number, hour: number, minute: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export type Vitals6 = {
  bp: string;
  hr: number;
  rr: number;
  temp: number;
  spo2: number;
  painScore: number;
  recordedAt: string;
};

export type AlertKind = 'medication' | 'observation' | 'safety';
export type AlertItem = {
  id: string;
  kind: AlertKind;
  title: string;
  description: string;
};

export type CarePlanStatus = 'In Progress' | 'Planned' | 'Completed';
export type CarePlanItem = { id: string; label: string; status: CarePlanStatus };

export type TaskStatus = 'Due Soon' | 'Pending' | 'Completed';
export type NursingTaskItem = { id: string; label: string; dueTime: string; status: TaskStatus };

export type NursingNoteItem = { id: string; dateTime: string; note: string; author: string };

export type ResultFlag = 'Normal' | 'Abnormal' | 'Critical';
export type LabResultItem = {
  id: string;
  name: string;
  value: string;
  date: string;
  flag: ResultFlag;
};

export type CodeStatus = 'Full Code' | 'DNR' | 'DNI';

export type PatientRecordDetail = {
  patient: NursePatient;
  dob: string;
  phone: string;
  address: string;
  nextOfKin: string;
  nextOfKinPhone: string;
  insuranceProvider: string;
  bloodGroup: string;
  religion: string;
  admissionDate: string;
  lengthOfStayDays: number;
  allergies: Allergy[];
  codeStatus: CodeStatus;
  secondaryDiagnosis: string;
  diagnosisTag: string;
  clinicalSummary: string;
  vitals6: Vitals6;
  alerts: AlertItem[];
  carePlan: CarePlanItem[];
  carePlanProgress: number;
  careStatusLastUpdated: string;
  careStatusNextReview: string;
  intakeMl: number;
  outputMl: number;
  intakeLastRecorded: string;
  nursingTasks: NursingTaskItem[];
  nursingNotes: NursingNoteItem[];
  labResults: LabResultItem[];
};

const NURSE_NAME = 'Nurse Chidinma E.';

function baseAlerts(nextMedication: string, nextMedicationTime: string): AlertItem[] {
  return [
    {
      id: 'al-med',
      kind: 'medication',
      title: 'Medication Due',
      description: `${nextMedication} — Due soon (${new Date(nextMedicationTime).toISOString().slice(11, 16)})`,
    },
    {
      id: 'al-obs',
      kind: 'observation',
      title: 'Observation Due',
      description: 'Routine observation due shortly',
    },
  ];
}

function noAllergyAlert(): AlertItem {
  return {
    id: 'al-safety',
    kind: 'safety',
    title: 'Allergy Alert',
    description: 'No known allergies',
  };
}

function allergyAlert(allergy: Allergy): AlertItem {
  return {
    id: 'al-safety',
    kind: 'safety',
    title: 'Allergy Alert',
    description: `${allergy.substance} — ${allergy.reaction}`,
  };
}

const CURATED_DETAIL: Record<string, Omit<PatientRecordDetail, 'patient'>> = {
  'np-001': {
    // Daniel Eze — 68/M, Pneumonia, High Risk
    dob: '1958-03-14',
    phone: '0806 234 1290',
    address: 'Nkpor, Anambra State',
    nextOfKin: 'Ngozi Eze (Wife)',
    nextOfKinPhone: '0807 456 2201',
    insuranceProvider: 'NHIS',
    bloodGroup: 'A+',
    religion: 'Christianity',
    admissionDate: atOffset(-3, 14, 30),
    lengthOfStayDays: 3,
    allergies: [
      {
        id: 'alg-001',
        substance: 'Penicillin',
        reaction: 'Rash and swelling',
        severity: 'MODERATE',
        recordedAt: atOffset(-3, 15, 0),
        recordedBy: NURSE_NAME,
      },
    ],
    codeStatus: 'Full Code',
    secondaryDiagnosis: 'Hypertension',
    diagnosisTag: 'Internal Medicine',
    clinicalSummary:
      'Admitted with community-acquired pneumonia. Started on IV antibiotics; oxygen saturation improving. Continue close monitoring given age and comorbidities.',
    vitals6: {
      bp: '150/90',
      hr: 102,
      rr: 22,
      temp: 38.2,
      spo2: 94,
      painScore: 4,
      recordedAt: atOffset(0, 8, 15),
    },
    alerts: [
      ...baseAlerts('Paracetamol 1g (PO)', atOffset(0, 9, 0)),
      allergyAlert({
        id: 'alg-001',
        substance: 'Penicillin',
        reaction: 'Rash and swelling',
        severity: 'MODERATE',
        recordedAt: atOffset(-3, 15, 0),
        recordedBy: NURSE_NAME,
      }),
    ],
    carePlan: [
      { id: 'cp-1', label: 'Oxygen Therapy', status: 'In Progress' },
      { id: 'cp-2', label: 'Antibiotic Course', status: 'In Progress' },
      { id: 'cp-3', label: 'Chest Physiotherapy', status: 'In Progress' },
      { id: 'cp-4', label: 'Nutritional Support', status: 'Planned' },
      { id: 'cp-5', label: 'Discharge Planning', status: 'Planned' },
    ],
    carePlanProgress: 55,
    careStatusLastUpdated: atOffset(0, 8, 20),
    careStatusNextReview: atOffset(1, 10, 0),
    intakeMl: 900,
    outputMl: 700,
    intakeLastRecorded: atOffset(0, 8, 0),
    nursingTasks: [
      { id: 'nt-1', label: 'Vitals Monitoring', dueTime: atOffset(0, 8, 30), status: 'Due Soon' },
      { id: 'nt-2', label: 'Oxygen Check', dueTime: atOffset(0, 10, 0), status: 'Pending' },
      { id: 'nt-3', label: 'Chest Physio Session', dueTime: atOffset(0, 12, 0), status: 'Pending' },
    ],
    nursingNotes: [
      {
        id: 'nn-1',
        dateTime: atOffset(0, 7, 45),
        note: 'SpO2 improved to 94% on 2L oxygen. Patient more comfortable, less dyspnoeic.',
        author: NURSE_NAME,
      },
      {
        id: 'nn-2',
        dateTime: atOffset(0, 6, 15),
        note: 'Overnight temperature spike to 38.5°C, paracetamol given, doctor notified.',
        author: NURSE_NAME,
      },
    ],
    labResults: [
      {
        id: 'lr-1',
        name: 'WBC',
        value: '14.2 x10³/µL',
        date: atOffset(0, 8, 15),
        flag: 'Abnormal',
      },
      { id: 'lr-2', name: 'CRP', value: '68 mg/L', date: atOffset(0, 8, 15), flag: 'Abnormal' },
      {
        id: 'lr-3',
        name: 'Hemoglobin',
        value: '13.1 g/dL',
        date: atOffset(0, 8, 15),
        flag: 'Normal',
      },
      { id: 'lr-4', name: 'Sodium', value: '138 mmol/L', date: atOffset(0, 8, 15), flag: 'Normal' },
      {
        id: 'lr-5',
        name: 'Potassium',
        value: '4.3 mmol/L',
        date: atOffset(0, 8, 15),
        flag: 'Normal',
      },
    ],
  },
  'np-002': {
    // Maryam Usman — 45/F, Post-op Appendectomy, Medium Risk (matches reference image)
    dob: '1981-03-12',
    phone: '0803 123 4567',
    address: 'Garki, Abuja',
    nextOfKin: 'Usman Ali (Brother)',
    nextOfKinPhone: '0802 987 6543',
    insuranceProvider: 'NHIS',
    bloodGroup: 'O+',
    religion: 'Islam',
    admissionDate: atOffset(-2, 9, 20),
    lengthOfStayDays: 2,
    allergies: [],
    codeStatus: 'Full Code',
    secondaryDiagnosis: 'None',
    diagnosisTag: 'Surgery',
    clinicalSummary:
      'Patient underwent laparoscopic appendectomy on Jun 28, 2026. Post-op course is uneventful. Pain controlled. Mobilizing with assistance. Tolerating orally.',
    vitals6: {
      bp: '120/80',
      hr: 86,
      rr: 18,
      temp: 36.7,
      spo2: 98,
      painScore: 3,
      recordedAt: atOffset(0, 8, 15),
    },
    alerts: [...baseAlerts('Paracetamol 1g (PO)', atOffset(0, 9, 0)), noAllergyAlert()],
    carePlan: [
      { id: 'cp-1', label: 'Pain Management', status: 'In Progress' },
      { id: 'cp-2', label: 'Infection Prevention', status: 'In Progress' },
      { id: 'cp-3', label: 'Mobility Plan', status: 'In Progress' },
      { id: 'cp-4', label: 'Nutritional Support', status: 'Planned' },
      { id: 'cp-5', label: 'Discharge Planning', status: 'Planned' },
    ],
    carePlanProgress: 75,
    careStatusLastUpdated: atOffset(0, 7, 45),
    careStatusNextReview: atOffset(1, 10, 0),
    intakeMl: 1200,
    outputMl: 850,
    intakeLastRecorded: atOffset(0, 8, 0),
    nursingTasks: [
      { id: 'nt-1', label: 'Vitals Monitoring', dueTime: atOffset(0, 8, 30), status: 'Due Soon' },
      {
        id: 'nt-2',
        label: 'Ambulation Assistance',
        dueTime: atOffset(0, 10, 0),
        status: 'Pending',
      },
      { id: 'nt-3', label: 'Wound Dressing', dueTime: atOffset(0, 12, 0), status: 'Pending' },
    ],
    nursingNotes: [
      {
        id: 'nn-1',
        dateTime: atOffset(0, 7, 45),
        note: 'Pain score improved to 3/10. Patient ambulated with assistance.',
        author: NURSE_NAME,
      },
      {
        id: 'nn-2',
        dateTime: atOffset(0, 6, 15),
        note: 'Post-op observation done. Dressing intact. Patient stable.',
        author: NURSE_NAME,
      },
    ],
    labResults: [
      { id: 'lr-1', name: 'WBC', value: '7.6 x10³/µL', date: atOffset(-1, 8, 15), flag: 'Normal' },
      {
        id: 'lr-2',
        name: 'Hemoglobin',
        value: '12.4 g/dL',
        date: atOffset(-1, 8, 15),
        flag: 'Normal',
      },
      {
        id: 'lr-3',
        name: 'Platelets',
        value: '245 x10³/µL',
        date: atOffset(-1, 8, 15),
        flag: 'Normal',
      },
      {
        id: 'lr-4',
        name: 'Sodium',
        value: '139 mmol/L',
        date: atOffset(-1, 8, 15),
        flag: 'Normal',
      },
      {
        id: 'lr-5',
        name: 'Potassium',
        value: '4.1 mmol/L',
        date: atOffset(-1, 8, 15),
        flag: 'Normal',
      },
    ],
  },
  'np-003': {
    // Ifeanyi Nwosu — 32/M, Typhoid Fever, Low Risk
    dob: '1994-06-02',
    phone: '0813 552 7710',
    address: 'Onitsha, Anambra State',
    nextOfKin: 'Chika Nwosu (Wife)',
    nextOfKinPhone: '0812 447 8891',
    insuranceProvider: 'UNIZIK Staff Health Scheme',
    bloodGroup: 'B+',
    religion: 'Christianity',
    admissionDate: atOffset(-1, 11, 0),
    lengthOfStayDays: 1,
    allergies: [],
    codeStatus: 'Full Code',
    secondaryDiagnosis: 'None',
    diagnosisTag: 'Internal Medicine',
    clinicalSummary:
      'Admitted with typhoid fever, started on IV antibiotics. Fever trending down, tolerating oral fluids. Improving steadily.',
    vitals6: {
      bp: '110/70',
      hr: 78,
      rr: 16,
      temp: 36.8,
      spo2: 98,
      painScore: 1,
      recordedAt: atOffset(0, 8, 0),
    },
    alerts: [...baseAlerts('Metronidazole 400mg (IV)', atOffset(0, 11, 0)), noAllergyAlert()],
    carePlan: [
      { id: 'cp-1', label: 'Antibiotic Course', status: 'In Progress' },
      { id: 'cp-2', label: 'Hydration Support', status: 'In Progress' },
      { id: 'cp-3', label: 'Nutritional Support', status: 'Planned' },
      { id: 'cp-4', label: 'Discharge Planning', status: 'Planned' },
    ],
    carePlanProgress: 60,
    careStatusLastUpdated: atOffset(0, 8, 5),
    careStatusNextReview: atOffset(1, 9, 0),
    intakeMl: 1500,
    outputMl: 1200,
    intakeLastRecorded: atOffset(0, 8, 0),
    nursingTasks: [
      { id: 'nt-1', label: 'Vitals Monitoring', dueTime: atOffset(0, 9, 0), status: 'Due Soon' },
      { id: 'nt-2', label: 'IV Line Check', dueTime: atOffset(0, 11, 0), status: 'Pending' },
    ],
    nursingNotes: [
      {
        id: 'nn-1',
        dateTime: atOffset(0, 8, 0),
        note: 'Temperature down to 36.8°C. Patient tolerating oral fluids well.',
        author: NURSE_NAME,
      },
    ],
    labResults: [
      {
        id: 'lr-1',
        name: 'Widal Test',
        value: 'Positive 1:160',
        date: atOffset(-1, 11, 30),
        flag: 'Abnormal',
      },
      { id: 'lr-2', name: 'WBC', value: '6.8 x10³/µL', date: atOffset(-1, 11, 30), flag: 'Normal' },
      {
        id: 'lr-3',
        name: 'Hemoglobin',
        value: '13.5 g/dL',
        date: atOffset(-1, 11, 30),
        flag: 'Normal',
      },
    ],
  },
  'np-004': {
    // Amina Yusuf — 72/F, Congestive Heart Failure, High Risk
    dob: '1954-01-22',
    phone: '0705 118 2233',
    address: 'Awka, Anambra State',
    nextOfKin: 'Fatima Yusuf (Daughter)',
    nextOfKinPhone: '0706 229 3344',
    insuranceProvider: 'NHIS',
    bloodGroup: 'AB+',
    religion: 'Islam',
    admissionDate: atOffset(-4, 10, 0),
    lengthOfStayDays: 4,
    allergies: [
      {
        id: 'alg-002',
        substance: 'Aspirin',
        reaction: 'Gastric bleeding',
        severity: 'SEVERE',
        recordedAt: atOffset(-4, 10, 30),
        recordedBy: NURSE_NAME,
      },
    ],
    codeStatus: 'DNR',
    secondaryDiagnosis: 'Type 2 Diabetes Mellitus',
    diagnosisTag: 'Cardiology',
    clinicalSummary:
      'Admitted with acute decompensated heart failure. On IV diuretics with good urine output response. Fluid overload improving. Continue strict input/output monitoring.',
    vitals6: {
      bp: '160/95',
      hr: 104,
      rr: 24,
      temp: 36.8,
      spo2: 92,
      painScore: 2,
      recordedAt: atOffset(0, 8, 20),
    },
    alerts: [
      ...baseAlerts('Furosemide 40mg (IV)', atOffset(0, 9, 30)),
      allergyAlert({
        id: 'alg-002',
        substance: 'Aspirin',
        reaction: 'Gastric bleeding',
        severity: 'SEVERE',
        recordedAt: atOffset(-4, 10, 30),
        recordedBy: NURSE_NAME,
      }),
    ],
    carePlan: [
      { id: 'cp-1', label: 'Diuretic Therapy', status: 'In Progress' },
      { id: 'cp-2', label: 'Fluid Restriction', status: 'In Progress' },
      { id: 'cp-3', label: 'Cardiac Monitoring', status: 'In Progress' },
      { id: 'cp-4', label: 'Nutritional Support', status: 'Planned' },
    ],
    carePlanProgress: 45,
    careStatusLastUpdated: atOffset(0, 8, 25),
    careStatusNextReview: atOffset(1, 8, 0),
    intakeMl: 800,
    outputMl: 1400,
    intakeLastRecorded: atOffset(0, 8, 0),
    nursingTasks: [
      { id: 'nt-1', label: 'Vitals Monitoring', dueTime: atOffset(0, 8, 30), status: 'Due Soon' },
      { id: 'nt-2', label: 'Fluid Balance Check', dueTime: atOffset(0, 10, 0), status: 'Pending' },
      { id: 'nt-3', label: 'Weight Monitoring', dueTime: atOffset(0, 14, 0), status: 'Pending' },
    ],
    nursingNotes: [
      {
        id: 'nn-1',
        dateTime: atOffset(0, 8, 10),
        note: 'Good diuretic response overnight, output exceeds intake by 600ml. Breathing more comfortable.',
        author: NURSE_NAME,
      },
      {
        id: 'nn-2',
        dateTime: atOffset(0, 6, 0),
        note: 'SpO2 dipped to 90% briefly, oxygen increased to 3L, improved to 93%. Doctor notified.',
        author: NURSE_NAME,
      },
    ],
    labResults: [
      { id: 'lr-1', name: 'BNP', value: '890 pg/mL', date: atOffset(0, 6, 30), flag: 'Critical' },
      {
        id: 'lr-2',
        name: 'Potassium',
        value: '3.3 mmol/L',
        date: atOffset(0, 6, 30),
        flag: 'Abnormal',
      },
      {
        id: 'lr-3',
        name: 'Creatinine',
        value: '1.4 mg/dL',
        date: atOffset(0, 6, 30),
        flag: 'Abnormal',
      },
    ],
  },
  'np-005': {
    // Grace Adebayo — 29/F, Migraine, Low Risk
    dob: '1997-05-19',
    phone: '0812 340 5567',
    address: 'Awka, Anambra State',
    nextOfKin: 'Bola Adebayo (Mother)',
    nextOfKinPhone: '0813 451 6678',
    insuranceProvider: 'UNIZIK Staff Health Scheme',
    bloodGroup: 'O-',
    religion: 'Christianity',
    admissionDate: atOffset(-1, 6, 45),
    lengthOfStayDays: 1,
    allergies: [],
    codeStatus: 'Full Code',
    secondaryDiagnosis: 'None',
    diagnosisTag: 'General Outpatient Clinic',
    clinicalSummary:
      'Admitted for observation with severe migraine unresponsive to home analgesia. Responding well to IV analgesia and a quiet, low-light environment.',
    vitals6: {
      bp: '112/72',
      hr: 76,
      rr: 16,
      temp: 36.7,
      spo2: 99,
      painScore: 5,
      recordedAt: atOffset(0, 7, 30),
    },
    alerts: [...baseAlerts('Paracetamol 1g (PO)', atOffset(0, 14, 0)), noAllergyAlert()],
    carePlan: [
      { id: 'cp-1', label: 'Pain Management', status: 'In Progress' },
      { id: 'cp-2', label: 'Discharge Planning', status: 'Planned' },
    ],
    carePlanProgress: 80,
    careStatusLastUpdated: atOffset(0, 7, 40),
    careStatusNextReview: atOffset(0, 16, 0),
    intakeMl: 600,
    outputMl: 500,
    intakeLastRecorded: atOffset(0, 7, 30),
    nursingTasks: [
      { id: 'nt-1', label: 'Pain Reassessment', dueTime: atOffset(0, 10, 0), status: 'Pending' },
    ],
    nursingNotes: [
      {
        id: 'nn-1',
        dateTime: atOffset(0, 7, 35),
        note: 'Pain score down to 5/10 from 8/10 after IV analgesia. Resting comfortably.',
        author: NURSE_NAME,
      },
    ],
    labResults: [],
  },
  'np-006': {
    // Peter Obi — 51/M, Diabetes Mellitus, Medium Risk
    dob: '1975-09-08',
    phone: '0708 223 4590',
    address: 'Ekwulobia, Anambra State',
    nextOfKin: 'Chioma Obi (Wife)',
    nextOfKinPhone: '0709 334 5601',
    insuranceProvider: 'NHIS',
    bloodGroup: 'A-',
    religion: 'Christianity',
    admissionDate: atOffset(-2, 13, 0),
    lengthOfStayDays: 2,
    allergies: [],
    codeStatus: 'Full Code',
    secondaryDiagnosis: 'Hypertension',
    diagnosisTag: 'Internal Medicine',
    clinicalSummary:
      'Admitted with poorly controlled blood glucose. Started on regular insulin sliding scale. Blood sugars trending down toward target range.',
    vitals6: {
      bp: '130/85',
      hr: 88,
      rr: 18,
      temp: 37.3,
      spo2: 97,
      painScore: 0,
      recordedAt: atOffset(0, 7, 50),
    },
    alerts: [...baseAlerts('Insulin Regular', atOffset(0, 14, 0)), noAllergyAlert()],
    carePlan: [
      { id: 'cp-1', label: 'Glycemic Control', status: 'In Progress' },
      { id: 'cp-2', label: 'Dietary Counselling', status: 'In Progress' },
      { id: 'cp-3', label: 'Discharge Planning', status: 'Planned' },
    ],
    carePlanProgress: 65,
    careStatusLastUpdated: atOffset(0, 8, 0),
    careStatusNextReview: atOffset(1, 9, 0),
    intakeMl: 1400,
    outputMl: 1300,
    intakeLastRecorded: atOffset(0, 8, 0),
    nursingTasks: [
      { id: 'nt-1', label: 'Blood Glucose Check', dueTime: atOffset(0, 12, 0), status: 'Pending' },
      {
        id: 'nt-2',
        label: 'Insulin Administration',
        dueTime: atOffset(0, 14, 0),
        status: 'Pending',
      },
    ],
    nursingNotes: [
      {
        id: 'nn-1',
        dateTime: atOffset(0, 7, 55),
        note: 'Fasting blood glucose 168 mg/dL, improved from 220 mg/dL yesterday. Insulin dose adjusted per sliding scale.',
        author: NURSE_NAME,
      },
    ],
    labResults: [
      {
        id: 'lr-1',
        name: 'Fasting Glucose',
        value: '168 mg/dL',
        date: atOffset(0, 6, 30),
        flag: 'Abnormal',
      },
      { id: 'lr-2', name: 'HbA1c', value: '9.1 %', date: atOffset(-2, 13, 30), flag: 'Abnormal' },
    ],
  },
  'np-007': {
    // Tunde Oladipo — 40/M, Gastritis, Low Risk
    dob: '1986-02-27',
    phone: '0815 667 8823',
    address: 'Nnewi, Anambra State',
    nextOfKin: 'Funmi Oladipo (Wife)',
    nextOfKinPhone: '0816 778 9934',
    insuranceProvider: 'UNIZIK Staff Health Scheme',
    bloodGroup: 'O+',
    religion: 'Islam',
    admissionDate: atOffset(-1, 9, 0),
    lengthOfStayDays: 1,
    allergies: [],
    codeStatus: 'Full Code',
    secondaryDiagnosis: 'None',
    diagnosisTag: 'General Outpatient Clinic',
    clinicalSummary:
      'Admitted with epigastric pain and vomiting. Started on PPI therapy. Symptoms improving, tolerating light oral intake.',
    vitals6: {
      bp: '118/76',
      hr: 74,
      rr: 16,
      temp: 36.6,
      spo2: 99,
      painScore: 2,
      recordedAt: atOffset(0, 8, 10),
    },
    alerts: [...baseAlerts('Omeprazole 40mg (PO)', atOffset(0, 10, 30)), noAllergyAlert()],
    carePlan: [
      { id: 'cp-1', label: 'Symptom Management', status: 'In Progress' },
      { id: 'cp-2', label: 'Dietary Advice', status: 'Planned' },
      { id: 'cp-3', label: 'Discharge Planning', status: 'Planned' },
    ],
    carePlanProgress: 70,
    careStatusLastUpdated: atOffset(0, 8, 15),
    careStatusNextReview: atOffset(0, 18, 0),
    intakeMl: 700,
    outputMl: 600,
    intakeLastRecorded: atOffset(0, 8, 0),
    nursingTasks: [
      { id: 'nt-1', label: 'Pain Reassessment', dueTime: atOffset(0, 11, 0), status: 'Pending' },
    ],
    nursingNotes: [
      {
        id: 'nn-1',
        dateTime: atOffset(0, 8, 15),
        note: 'Epigastric pain reduced to 2/10. Tolerated light breakfast without vomiting.',
        author: NURSE_NAME,
      },
    ],
    labResults: [
      {
        id: 'lr-1',
        name: 'H. pylori Antigen',
        value: 'Negative',
        date: atOffset(-1, 9, 30),
        flag: 'Normal',
      },
    ],
  },
  'np-008': {
    // Chidinma Okafor — 53/F, Asthma Exacerbation, Medium Risk
    dob: '1972-11-05',
    phone: '0703 990 1123',
    address: 'Awka, Anambra State',
    nextOfKin: 'Emeka Okafor (Husband)',
    nextOfKinPhone: '0704 001 2234',
    insuranceProvider: 'NHIS',
    bloodGroup: 'B-',
    religion: 'Christianity',
    admissionDate: atOffset(-1, 15, 0),
    lengthOfStayDays: 1,
    allergies: [
      {
        id: 'alg-003',
        substance: 'Dust mites',
        reaction: 'Wheezing and shortness of breath',
        severity: 'MILD',
        recordedAt: atOffset(-1, 15, 30),
        recordedBy: NURSE_NAME,
      },
    ],
    codeStatus: 'Full Code',
    secondaryDiagnosis: 'None',
    diagnosisTag: 'Internal Medicine',
    clinicalSummary:
      'Admitted with acute asthma exacerbation. Nebulized bronchodilators given. Wheeze reducing, SpO2 stable on room air.',
    vitals6: {
      bp: '125/82',
      hr: 92,
      rr: 20,
      temp: 37.3,
      spo2: 95,
      painScore: 1,
      recordedAt: atOffset(0, 8, 5),
    },
    alerts: [
      ...baseAlerts('Salbutamol Neb', atOffset(0, 12, 0)),
      allergyAlert({
        id: 'alg-003',
        substance: 'Dust mites',
        reaction: 'Wheezing and shortness of breath',
        severity: 'MILD',
        recordedAt: atOffset(-1, 15, 30),
        recordedBy: NURSE_NAME,
      }),
    ],
    carePlan: [
      { id: 'cp-1', label: 'Bronchodilator Therapy', status: 'In Progress' },
      { id: 'cp-2', label: 'Respiratory Monitoring', status: 'In Progress' },
      { id: 'cp-3', label: 'Discharge Planning', status: 'Planned' },
    ],
    carePlanProgress: 60,
    careStatusLastUpdated: atOffset(0, 8, 10),
    careStatusNextReview: atOffset(0, 20, 0),
    intakeMl: 1000,
    outputMl: 850,
    intakeLastRecorded: atOffset(0, 8, 0),
    nursingTasks: [
      { id: 'nt-1', label: 'Vitals Monitoring', dueTime: atOffset(0, 9, 0), status: 'Due Soon' },
      { id: 'nt-2', label: 'Nebulizer Round', dueTime: atOffset(0, 12, 0), status: 'Pending' },
    ],
    nursingNotes: [
      {
        id: 'nn-1',
        dateTime: atOffset(0, 8, 10),
        note: 'Wheeze much reduced after nebulizer. SpO2 95% on room air, patient comfortable.',
        author: NURSE_NAME,
      },
    ],
    labResults: [
      {
        id: 'lr-1',
        name: 'Peak Flow',
        value: '320 L/min',
        date: atOffset(0, 7, 0),
        flag: 'Normal',
      },
    ],
  },
};

function fallbackDetail(patient: NursePatient): Omit<PatientRecordDetail, 'patient'> {
  const dobYear = new Date().getFullYear() - patient.age;
  return {
    dob: `${dobYear}-06-15`,
    phone: '0800 000 0000',
    address: 'Awka, Anambra State',
    nextOfKin: 'Next of kin on file',
    nextOfKinPhone: '0800 000 0001',
    insuranceProvider: 'NHIS',
    bloodGroup: 'O+',
    religion: 'Not specified',
    admissionDate: atOffset(-1, 9, 0),
    lengthOfStayDays: 1,
    allergies: [],
    codeStatus: 'Full Code',
    secondaryDiagnosis: 'None',
    diagnosisTag: 'General Outpatient Clinic',
    clinicalSummary: `Admitted for management of ${patient.diagnosis.toLowerCase()}. Currently ${patient.careStatus === 'Stable' ? 'stable and responding well to treatment' : 'under active management'}.`,
    vitals6: {
      bp: patient.vitals.bp,
      hr: patient.vitals.hr,
      rr: 18,
      temp: patient.vitals.temp,
      spo2: 97,
      painScore: 2,
      recordedAt: patient.vitals.recordedAt,
    },
    alerts: [...baseAlerts(patient.nextMedication, patient.nextMedicationTime), noAllergyAlert()],
    carePlan: [
      { id: 'cp-1', label: 'Symptom Management', status: 'In Progress' },
      { id: 'cp-2', label: 'Discharge Planning', status: 'Planned' },
    ],
    carePlanProgress: patient.careStatus === 'Stable' ? 80 : 50,
    careStatusLastUpdated: patient.vitals.recordedAt,
    careStatusNextReview: atOffset(1, 9, 0),
    intakeMl: 1000,
    outputMl: 850,
    intakeLastRecorded: patient.vitals.recordedAt,
    nursingTasks: [
      { id: 'nt-1', label: 'Vitals Monitoring', dueTime: atOffset(0, 9, 0), status: 'Due Soon' },
      {
        id: 'nt-2',
        label: 'Medication Round',
        dueTime: patient.nextMedicationTime,
        status: 'Pending',
      },
    ],
    nursingNotes: [
      {
        id: 'nn-1',
        dateTime: patient.vitals.recordedAt,
        note: `Latest vitals recorded, patient ${patient.careStatus === 'Stable' ? 'stable' : 'monitored closely'}.`,
        author: NURSE_NAME,
      },
    ],
    labResults: [],
  };
}

export function getPatientRecord(id: string): PatientRecordDetail | undefined {
  const patient = getEffectiveRoster().find((p) => p.id === id);
  if (!patient) return undefined;
  const detail = CURATED_DETAIL[id] ?? fallbackDetail(patient);
  return { patient, ...detail };
}
