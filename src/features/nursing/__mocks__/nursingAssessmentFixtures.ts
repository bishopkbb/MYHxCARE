/**
 * Mock fixtures for the Nursing Assessment screen.
 * Swap out by pointing hooks to a real assessments endpoint in Phase 6.
 */

export type SelectOption = { value: string; label: string };

function atOffset(dayOffset: number, hour: number, minute: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export type AssessmentType =
  'Initial Assessment' | 'Shift Assessment' | 'Re-Assessment' | 'Discharge Assessment';

export const ASSESSMENT_TYPE_OPTIONS: SelectOption[] = [
  { value: 'Initial Assessment', label: 'Initial Assessment' },
  { value: 'Shift Assessment', label: 'Shift Assessment' },
  { value: 'Re-Assessment', label: 'Re-Assessment' },
  { value: 'Discharge Assessment', label: 'Discharge Assessment' },
];

export const AIRWAY_OPTIONS: SelectOption[] = ['Patent', 'Partially Obstructed', 'Obstructed'].map(
  (v) => ({ value: v, label: v }),
);
export const BREATHING_OPTIONS: SelectOption[] = ['Unlabored', 'Labored', 'Shallow', 'Absent'].map(
  (v) => ({ value: v, label: v }),
);
export const DISABILITY_OPTIONS: SelectOption[] = ['Alert', 'Verbal', 'Pain', 'Unresponsive'].map(
  (v) => ({ value: v, label: v }),
);
export const EXPOSURE_OPTIONS: SelectOption[] = ['Adequate', 'Inadequate', 'Not Assessed'].map(
  (v) => ({ value: v, label: v }),
);

export const GENERAL_APPEARANCE_OPTIONS: SelectOption[] = [
  'Alert',
  'Lethargic',
  'Anxious',
  'Distressed',
  'Unresponsive',
].map((v) => ({ value: v, label: v }));
export const SKIN_OPTIONS: SelectOption[] = [
  'Warm and Dry',
  'Pale and Clammy',
  'Cyanotic',
  'Jaundiced',
  'Diaphoretic',
].map((v) => ({ value: v, label: v }));

export const PAIN_LOCATION_OPTIONS: SelectOption[] = [
  'Abdomen (Incision site)',
  'Chest',
  'Head',
  'Back',
  'Lower Extremities',
  'Upper Extremities',
  'Generalized',
  'Other',
].map((v) => ({ value: v, label: v }));
export const PAIN_DESCRIPTION_OPTIONS: SelectOption[] = [
  'Aching',
  'Sharp',
  'Burning',
  'Throbbing',
  'Cramping',
  'Dull',
].map((v) => ({ value: v, label: v }));
export const PAIN_INTERVENTION_OPTIONS: SelectOption[] = [
  'Pain medication given',
  'Repositioning',
  'Ice/Heat applied',
  'Relaxation techniques',
  'None required',
].map((v) => ({ value: v, label: v }));

export type FallRiskLevel = 'Low Risk' | 'Moderate Risk' | 'High Risk';
export const FALL_RISK_LEVEL_OPTIONS: SelectOption[] = [
  'Low Risk',
  'Moderate Risk',
  'High Risk',
].map((v) => ({ value: v, label: v }));

export type FallRiskFactors = {
  historyOfFalls: boolean;
  impairedMobility: boolean;
  sedatingMedication: boolean;
  ivLines: boolean;
  ageOver65: boolean;
  other: boolean;
};

export const FALL_RISK_FACTOR_LABELS: { key: keyof FallRiskFactors; label: string }[] = [
  { key: 'historyOfFalls', label: 'History of falls' },
  { key: 'impairedMobility', label: 'Impaired mobility' },
  { key: 'sedatingMedication', label: 'Medication (sedatives, diuretics)' },
  { key: 'ivLines', label: 'IV/Lines' },
  { key: 'ageOver65', label: 'Age > 65' },
  { key: 'other', label: 'Other' },
];

export const PRESSURE_TOOL_OPTIONS: SelectOption[] = [
  'Braden Scale',
  'Norton Scale',
  'Waterlow Scale',
].map((v) => ({ value: v, label: v }));

export type PressureRiskLevel = 'Low Risk' | 'Moderate Risk' | 'High Risk';
export const PRESSURE_RISK_LEVEL_OPTIONS: SelectOption[] = [
  'Low Risk',
  'Moderate Risk',
  'High Risk',
].map((v) => ({ value: v, label: v }));

export type PressureInterventions = {
  repositionEvery2Hours: boolean;
  skinAssessmentQShift: boolean;
  pressureRelievingMattress: boolean;
  keepSkinCleanAndDry: boolean;
  other: boolean;
};

export const PRESSURE_INTERVENTION_LABELS: { key: keyof PressureInterventions; label: string }[] = [
  { key: 'repositionEvery2Hours', label: 'Reposition every 2 hours' },
  { key: 'skinAssessmentQShift', label: 'Skin assessment q shift' },
  { key: 'pressureRelievingMattress', label: 'Pressure-relieving mattress' },
  { key: 'keepSkinCleanAndDry', label: 'Keep skin clean and dry' },
  { key: 'other', label: 'Other' },
];

export const APPETITE_OPTIONS: SelectOption[] = ['Good', 'Fair', 'Poor', 'None'].map((v) => ({
  value: v,
  label: v,
}));
export const YES_NO_OPTIONS: SelectOption[] = ['Yes', 'No'].map((v) => ({ value: v, label: v }));
export const DIET_TYPE_OPTIONS: SelectOption[] = [
  'Regular',
  'Soft',
  'Pureed',
  'Clear Liquid',
  'Full Liquid',
  'NPO',
].map((v) => ({ value: v, label: v }));
export const FEEDING_ASSISTANCE_OPTIONS: SelectOption[] = [
  'Independent',
  'Required',
  'Total Assistance',
].map((v) => ({ value: v, label: v }));
export type NutritionRiskLevel = 'Low Risk' | 'At Risk' | 'High Risk';
export const NUTRITION_RISK_OPTIONS: SelectOption[] = ['Low Risk', 'At Risk', 'High Risk'].map(
  (v) => ({ value: v, label: v }),
);

export const LOC_OPTIONS: SelectOption[] = ['Alert', 'Confused', 'Drowsy', 'Unresponsive'].map(
  (v) => ({ value: v, label: v }),
);
export const ORIENTATION_OPTIONS: SelectOption[] = [
  'Oriented x 4',
  'Oriented x 3',
  'Oriented x 2',
  'Oriented x 1',
  'Disoriented',
].map((v) => ({ value: v, label: v }));
export const MOOD_OPTIONS: SelectOption[] = [
  'Cooperative',
  'Anxious',
  'Agitated',
  'Withdrawn',
  'Tearful',
].map((v) => ({ value: v, label: v }));

export const MOBILITY_LEVEL_OPTIONS: SelectOption[] = [
  'Independent',
  'Ambulates with assistance',
  'Bed rest',
  'Wheelchair-bound',
].map((v) => ({ value: v, label: v }));
export const GAIT_OPTIONS: SelectOption[] = ['Steady', 'Unsteady', 'Not Assessed'].map((v) => ({
  value: v,
  label: v,
}));
export const ASSISTIVE_DEVICE_OPTIONS: SelectOption[] = [
  'None',
  'Walker',
  'Cane',
  'Wheelchair',
  'Crutches',
].map((v) => ({ value: v, label: v }));

export const URINE_OUTPUT_OPTIONS: SelectOption[] = [
  'Adequate',
  'Reduced',
  'Anuric',
  'Catheterized',
].map((v) => ({ value: v, label: v }));

export const SHIFT_NURSE_OPTIONS: SelectOption[] = [
  'Nurse Grace E.',
  'Nurse Chidinma Eze',
  'Nurse Amaka Nwosu',
  'Nurse Ifeoma Obi',
].map((v) => ({ value: v, label: v }));

export type ChecklistItemKey =
  | 'allRequiredFieldsCompleted'
  | 'abnormalFindingsIdentified'
  | 'carePlanReviewed'
  | 'patientEducationProvided'
  | 'followUpPlanned';

export const CHECKLIST_ITEMS: { key: ChecklistItemKey; label: string }[] = [
  { key: 'allRequiredFieldsCompleted', label: 'All required fields completed' },
  { key: 'abnormalFindingsIdentified', label: 'Abnormal findings identified' },
  { key: 'carePlanReviewed', label: 'Care plan reviewed' },
  { key: 'patientEducationProvided', label: 'Patient education provided' },
  { key: 'followUpPlanned', label: 'Follow-up planned' },
];

export type NursingAssessmentForm = {
  assessmentDateTime: string; // ISO
  assessmentType: AssessmentType;
  chiefComplaint: string;
  airway: string;
  breathing: string;
  disability: string;
  exposure: string;
  generalAppearance: string;
  skin: string;
  cardiovascular: string;
  respiratory: string;
  otherFindings: string;
  abdomen: string;
  painScore: number;
  painLocation: string;
  painDescription: string;
  painIntervention: string;
  painReassessmentDue: string;
  painComments: string;
  fallRiskLevel: FallRiskLevel;
  fallRiskFactors: FallRiskFactors;
  fallRiskComments: string;
  pressureRiskTool: string;
  pressureRiskLevel: PressureRiskLevel;
  pressureRiskScore: number;
  pressureInterventions: PressureInterventions;
  pressureRiskComments: string;
  appetite: string;
  nauseaVomiting: 'Yes' | 'No';
  dietType: string;
  feedingAssistance: string;
  nutritionRisk: NutritionRiskLevel;
  nutritionComments: string;
  levelOfConsciousness: string;
  orientation: string;
  moodBehavior: string;
  mentalStatusComments: string;
  mobilityLevel: string;
  gait: string;
  assistiveDevice: string;
  mobilityComments: string;
  intakeMl: number;
  outputMl: number;
  urineOutput: string;
  ivFluids: string;
  fluidComments: string;
  overallAssessment: string;
  nurseSignature: string;
  additionalNotes: string;
  checklist: Record<ChecklistItemKey, boolean>;
};

/** A genuinely blank form — used for any patient without a curated example. */
export function blankAssessment(nurseName: string): NursingAssessmentForm {
  return {
    assessmentDateTime: atOffset(0, 8, 15),
    assessmentType: 'Initial Assessment',
    chiefComplaint: '',
    airway: '',
    breathing: '',
    disability: '',
    exposure: '',
    generalAppearance: '',
    skin: '',
    cardiovascular: '',
    respiratory: '',
    otherFindings: '',
    abdomen: '',
    painScore: 0,
    painLocation: '',
    painDescription: '',
    painIntervention: '',
    painReassessmentDue: '',
    painComments: '',
    fallRiskLevel: 'Low Risk',
    fallRiskFactors: {
      historyOfFalls: false,
      impairedMobility: false,
      sedatingMedication: false,
      ivLines: false,
      ageOver65: false,
      other: false,
    },
    fallRiskComments: '',
    pressureRiskTool: 'Braden Scale',
    pressureRiskLevel: 'Low Risk',
    pressureRiskScore: 0,
    pressureInterventions: {
      repositionEvery2Hours: false,
      skinAssessmentQShift: false,
      pressureRelievingMattress: false,
      keepSkinCleanAndDry: false,
      other: false,
    },
    pressureRiskComments: '',
    appetite: '',
    nauseaVomiting: 'No',
    dietType: '',
    feedingAssistance: '',
    nutritionRisk: 'Low Risk',
    nutritionComments: '',
    levelOfConsciousness: '',
    orientation: '',
    moodBehavior: '',
    mentalStatusComments: '',
    mobilityLevel: '',
    gait: '',
    assistiveDevice: '',
    mobilityComments: '',
    intakeMl: 0,
    outputMl: 0,
    urineOutput: '',
    ivFluids: '',
    fluidComments: '',
    overallAssessment: '',
    nurseSignature: nurseName,
    additionalNotes: '',
    checklist: {
      allRequiredFieldsCompleted: false,
      abnormalFindingsIdentified: false,
      carePlanReviewed: false,
      patientEducationProvided: false,
      followUpPlanned: false,
    },
  };
}

/** Curated example matching the reference design — keyed by NursePatient id (np-002, Maryam Usman). */
const CURATED_ASSESSMENTS: Record<string, NursingAssessmentForm> = {
  'np-002': {
    assessmentDateTime: atOffset(0, 8, 15),
    assessmentType: 'Initial Assessment',
    chiefComplaint: '',
    airway: 'Patent',
    breathing: 'Unlabored',
    disability: 'Alert',
    exposure: 'Adequate',
    generalAppearance: 'Alert',
    skin: 'Warm and Dry',
    cardiovascular: 'S1, S2 heard. No murmurs.',
    respiratory: 'Clear bilaterally.',
    otherFindings: 'No other significant findings.',
    abdomen: 'Soft, non-distended. Tender at incision site.',
    painScore: 4,
    painLocation: 'Abdomen (Incision site)',
    painDescription: 'Aching',
    painIntervention: 'Pain medication given',
    painReassessmentDue: '02:15 PM',
    painComments: '',
    fallRiskLevel: 'Moderate Risk',
    fallRiskFactors: {
      historyOfFalls: true,
      impairedMobility: true,
      sedatingMedication: false,
      ivLines: true,
      ageOver65: true,
      other: false,
    },
    fallRiskComments: 'Encourage call bell use. Bed in low position. Side rails up.',
    pressureRiskTool: 'Braden Scale',
    pressureRiskLevel: 'High Risk',
    pressureRiskScore: 12,
    pressureInterventions: {
      repositionEvery2Hours: true,
      skinAssessmentQShift: true,
      pressureRelievingMattress: true,
      keepSkinCleanAndDry: true,
      other: false,
    },
    pressureRiskComments: 'High risk due to limited mobility and poor nutrition.',
    appetite: 'Poor',
    nauseaVomiting: 'Yes',
    dietType: 'Clear Liquid',
    feedingAssistance: 'Required',
    nutritionRisk: 'At Risk',
    nutritionComments: 'Encourage oral intake as tolerated.',
    levelOfConsciousness: 'Alert',
    orientation: 'Oriented x 4',
    moodBehavior: 'Cooperative',
    mentalStatusComments: 'No confusion or agitation noted.',
    mobilityLevel: 'Ambulates with assistance',
    gait: 'Unsteady',
    assistiveDevice: 'Walker',
    mobilityComments: 'Assisted to bathroom. Tolerated activity well.',
    intakeMl: 1200,
    outputMl: 950,
    urineOutput: 'Adequate',
    ivFluids: '500 ml',
    fluidComments: 'Oral intake improving.',
    overallAssessment:
      'Patient is post-op day 1. Vital signs stable. Pain is managed. Incision site clean and dry. Continue current care plan and monitoring.',
    nurseSignature: 'Nurse Grace E.',
    additionalNotes: '',
    checklist: {
      allRequiredFieldsCompleted: true,
      abnormalFindingsIdentified: true,
      carePlanReviewed: true,
      patientEducationProvided: false,
      followUpPlanned: false,
    },
  },
};

export function getAssessmentForPatient(
  patientId: string,
  nurseName: string,
): NursingAssessmentForm {
  const curated = CURATED_ASSESSMENTS[patientId];
  if (curated) return { ...curated, assessmentDateTime: atOffset(0, 8, 15) };
  return blankAssessment(nurseName);
}
