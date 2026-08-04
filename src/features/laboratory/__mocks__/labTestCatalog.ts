/**
 * Test Parameter Catalog — the reference data a structured Result Entry
 * screen needs and `LabResult` itself never carried: which parameters make
 * up a given test, their unit, adult reference range, and default analysis
 * method. Keyed by the exact `testName` strings already used across
 * `CANONICAL_LAB_RESULTS`, so every real order is enterable.
 *
 * Reference ranges reuse the exact numbers already present in existing seed
 * `rows` wherever a precedent exists (U&E's Potassium/Sodium/Creatinine from
 * `lab-010`/`lr-007`; FBC's WBC/Neutrophils/Lymphocytes/Haemoglobin/Platelets
 * from `lr-001`) — deliberately prioritising real cross-referenced
 * continuity (so `getPreviousResult()` below can find a genuine match) over
 * cosmetic parity with any one reference mockup. Kept in the SI units
 * already established by those rows (mmol/L, µmol/L), not the mg/dL
 * convention a US-style mockup might use.
 */

import type { LabResult } from './labResultFixtures';

export type CatalogParam = {
  parameter: string;
  kind: 'numeric' | 'qualitative';
  /** Numeric params only. */
  unit?: string;
  min?: number;
  max?: number;
  /** What the Reference Range column shows — usually "`min` – `max`", but
   * open-ended clinical conventions ("< 5.2", "> 1.0") need their own label. */
  referenceDisplay: string;
  /** Qualitative params only — the select's choices and which one reads as
   * Normal (any other selected value flags Abnormal). */
  options?: string[];
  normalValue?: string;
  method: string;
  methodOptions: string[];
  /** Numeric params only — crossing these escalates the row beyond H/L to a
   * test-level CRITICAL, mirroring the handful of parameters already seeded
   * as CRITICAL elsewhere (Potassium, Creatinine, Haemoglobin, Blood Sugar). */
  criticalLow?: number;
  criticalHigh?: number;
};

export const LAB_TEST_CATALOG: Record<string, CatalogParam[]> = {
  'Complete Blood Count (CBC)': [
    {
      parameter: 'Haemoglobin (Hb)',
      kind: 'numeric',
      unit: 'g/dL',
      min: 12,
      max: 16,
      referenceDisplay: '12 – 16',
      method: 'Automated',
      methodOptions: ['Automated', 'Manual'],
      criticalLow: 7,
    },
    {
      parameter: 'White Blood Cell (WBC)',
      kind: 'numeric',
      unit: '×10⁹/L',
      min: 4.0,
      max: 11.0,
      referenceDisplay: '4.0 – 11.0',
      method: 'Automated',
      methodOptions: ['Automated', 'Manual'],
      criticalHigh: 30,
    },
    {
      parameter: 'Platelet Count (PLT)',
      kind: 'numeric',
      unit: '×10⁹/L',
      min: 150,
      max: 450,
      referenceDisplay: '150 – 450',
      method: 'Automated',
      methodOptions: ['Automated', 'Manual'],
    },
    {
      parameter: 'Packed Cell Volume (PCV)',
      kind: 'numeric',
      unit: '%',
      min: 36,
      max: 46,
      referenceDisplay: '36 – 46',
      method: 'Calculated',
      methodOptions: ['Calculated', 'Automated'],
    },
  ],

  // Same testName, deliberately different real composition/units to lr-001's
  // own historical FBC (WBC ×10³/µL vs CBC's ×10⁹/L above) — labs do vary a
  // panel's exact makeup over time; not retroactively rewritten. Parameter
  // names/units/ranges below match `lr-001` exactly so a repeat FBC for the
  // same patient (the new multi-test seed order) has a real previous result.
  'Full Blood Count (FBC)': [
    {
      parameter: 'Haemoglobin',
      kind: 'numeric',
      unit: 'g/dL',
      min: 12,
      max: 16,
      referenceDisplay: '12 – 16',
      method: 'Automated',
      methodOptions: ['Automated', 'Manual'],
      criticalLow: 7,
    },
    {
      parameter: 'WBC',
      kind: 'numeric',
      unit: '×10³/µL',
      min: 4.5,
      max: 11.0,
      referenceDisplay: '4.5 – 11.0',
      method: 'Automated',
      methodOptions: ['Automated', 'Manual'],
      criticalHigh: 30,
    },
    {
      parameter: 'Neutrophils',
      kind: 'numeric',
      unit: '%',
      min: 40,
      max: 70,
      referenceDisplay: '40 – 70',
      method: 'Automated',
      methodOptions: ['Automated', 'Manual'],
    },
    {
      parameter: 'Lymphocytes',
      kind: 'numeric',
      unit: '%',
      min: 20,
      max: 40,
      referenceDisplay: '20 – 40',
      method: 'Automated',
      methodOptions: ['Automated', 'Manual'],
    },
    {
      parameter: 'Platelets',
      kind: 'numeric',
      unit: '×10³/µL',
      min: 150,
      max: 400,
      referenceDisplay: '150 – 400',
      method: 'Automated',
      methodOptions: ['Automated', 'Manual'],
    },
  ],

  'Urea, Creatinine & Electrolytes (U&E)': [
    {
      parameter: 'Urea',
      kind: 'numeric',
      unit: 'mmol/L',
      min: 2.5,
      max: 7.1,
      referenceDisplay: '2.5 – 7.1',
      method: 'Enzymatic',
      methodOptions: ['Enzymatic', 'Manual'],
    },
    {
      parameter: 'Sodium (Na+)',
      kind: 'numeric',
      unit: 'mmol/L',
      min: 135,
      max: 145,
      referenceDisplay: '135 – 145',
      method: 'ISE',
      methodOptions: ['ISE', 'Flame Photometry'],
    },
    {
      parameter: 'Potassium (K+)',
      kind: 'numeric',
      unit: 'mmol/L',
      min: 3.5,
      max: 5.1,
      referenceDisplay: '3.5 – 5.1',
      method: 'ISE',
      methodOptions: ['ISE', 'Flame Photometry'],
      criticalLow: 2.5,
      criticalHigh: 6.0,
    },
    {
      parameter: 'Creatinine',
      kind: 'numeric',
      unit: 'µmol/L',
      min: 53,
      max: 115,
      referenceDisplay: '53 – 115',
      method: 'Enzymatic',
      methodOptions: ['Enzymatic', 'Manual'],
      criticalHigh: 300,
    },
  ],

  'Lipid Profile': [
    {
      parameter: 'Total Cholesterol',
      kind: 'numeric',
      unit: 'mmol/L',
      min: 0,
      max: 5.2,
      referenceDisplay: '< 5.2',
      method: 'Enzymatic',
      methodOptions: ['Enzymatic', 'Colorimetric'],
    },
    {
      parameter: 'LDL Cholesterol',
      kind: 'numeric',
      unit: 'mmol/L',
      min: 0,
      max: 3.4,
      referenceDisplay: '< 3.4',
      method: 'Enzymatic',
      methodOptions: ['Enzymatic', 'Colorimetric'],
    },
    {
      parameter: 'HDL Cholesterol',
      kind: 'numeric',
      unit: 'mmol/L',
      min: 1.0,
      max: 999,
      referenceDisplay: '> 1.0',
      method: 'Enzymatic',
      methodOptions: ['Enzymatic', 'Colorimetric'],
    },
    {
      parameter: 'Triglycerides',
      kind: 'numeric',
      unit: 'mmol/L',
      min: 0,
      max: 1.7,
      referenceDisplay: '< 1.7',
      method: 'Enzymatic',
      methodOptions: ['Enzymatic', 'Colorimetric'],
    },
  ],

  HbA1c: [
    {
      parameter: 'HbA1c',
      kind: 'numeric',
      unit: '%',
      min: 0,
      max: 5.7,
      referenceDisplay: '< 5.7',
      method: 'HPLC',
      methodOptions: ['HPLC', 'Immunoassay'],
    },
  ],

  'Blood Culture & Sensitivity': [
    {
      parameter: 'Culture Result',
      kind: 'qualitative',
      referenceDisplay: 'No Growth',
      options: ['No Growth', 'Growth Detected'],
      normalValue: 'No Growth',
      method: 'Culture (72hr Incubation)',
      methodOptions: ['Culture (72hr Incubation)', 'Automated (BacT/ALERT)'],
    },
  ],

  'Widal Test': [
    {
      parameter: 'S. typhi O agglutinin',
      kind: 'qualitative',
      referenceDisplay: '< 1:80',
      options: ['< 1:80 (Negative)', '1:80', '1:160', '1:320 or higher'],
      normalValue: '< 1:80 (Negative)',
      method: 'Agglutination',
      methodOptions: ['Agglutination', 'Slide Test'],
    },
  ],

  'Malaria Parasite (MP)': [
    {
      parameter: 'P. falciparum antigen',
      kind: 'qualitative',
      referenceDisplay: 'Negative',
      options: ['Negative', 'Positive'],
      normalValue: 'Negative',
      method: 'Microscopy',
      methodOptions: ['Microscopy', 'Rapid Test (RDT)'],
    },
  ],

  'Coagulation Profile (PT/APTT)': [
    {
      parameter: 'Prothrombin Time (PT)',
      kind: 'numeric',
      unit: 'sec',
      min: 11,
      max: 13.5,
      referenceDisplay: '11 – 13.5',
      method: 'Automated (Coagulometer)',
      methodOptions: ['Automated (Coagulometer)', 'Manual (Tilt Tube)'],
    },
    {
      parameter: 'Activated Partial Thromboplastin Time (APTT)',
      kind: 'numeric',
      unit: 'sec',
      min: 25,
      max: 35,
      referenceDisplay: '25 – 35',
      method: 'Automated (Coagulometer)',
      methodOptions: ['Automated (Coagulometer)', 'Manual (Tilt Tube)'],
    },
  ],

  'Urinalysis (Routine)': [
    {
      parameter: 'Protein',
      kind: 'qualitative',
      referenceDisplay: 'Negative',
      options: ['Negative', 'Trace', '1+', '2+', '3+'],
      normalValue: 'Negative',
      method: 'Dipstick',
      methodOptions: ['Dipstick', 'Microscopy'],
    },
  ],

  'Malaria Rapid Diagnostic Test (RDT)': [
    {
      parameter: 'P. falciparum antigen',
      kind: 'qualitative',
      referenceDisplay: 'Negative',
      options: ['Negative', 'Positive'],
      normalValue: 'Negative',
      method: 'Rapid Test (RDT)',
      methodOptions: ['Rapid Test (RDT)', 'Microscopy'],
    },
  ],

  'CSF Analysis (Lumbar Puncture)': [
    {
      parameter: 'CSF White Cell Count',
      kind: 'numeric',
      unit: 'cells/µL',
      min: 0,
      max: 5,
      referenceDisplay: '0 – 5',
      method: 'Manual Count',
      methodOptions: ['Manual Count', 'Automated'],
    },
    {
      parameter: 'CSF Protein',
      kind: 'numeric',
      unit: 'mg/dL',
      min: 15,
      max: 45,
      referenceDisplay: '15 – 45',
      method: 'Manual Count',
      methodOptions: ['Manual Count', 'Automated'],
    },
    {
      parameter: 'CSF Glucose',
      kind: 'numeric',
      unit: 'mg/dL',
      min: 40,
      max: 70,
      referenceDisplay: '40 – 70',
      method: 'Manual Count',
      methodOptions: ['Manual Count', 'Automated'],
    },
  ],

  'Liver Function Test (LFT)': [
    {
      parameter: 'ALT',
      kind: 'numeric',
      unit: 'U/L',
      min: 7,
      max: 56,
      referenceDisplay: '7 – 56',
      method: 'Enzymatic',
      methodOptions: ['Enzymatic', 'Colorimetric'],
    },
    {
      parameter: 'AST',
      kind: 'numeric',
      unit: 'U/L',
      min: 10,
      max: 40,
      referenceDisplay: '10 – 40',
      method: 'Enzymatic',
      methodOptions: ['Enzymatic', 'Colorimetric'],
    },
    {
      parameter: 'Total Bilirubin',
      kind: 'numeric',
      unit: 'mg/dL',
      min: 0.1,
      max: 1.2,
      referenceDisplay: '0.1 – 1.2',
      method: 'Enzymatic',
      methodOptions: ['Enzymatic', 'Colorimetric'],
    },
    {
      parameter: 'Albumin',
      kind: 'numeric',
      unit: 'g/dL',
      min: 3.5,
      max: 5.0,
      referenceDisplay: '3.5 – 5.0',
      method: 'Enzymatic',
      methodOptions: ['Enzymatic', 'Colorimetric'],
    },
  ],

  'Fasting Blood Sugar (FBS)': [
    {
      parameter: 'Blood Sugar (FBS)',
      kind: 'numeric',
      unit: 'mg/dL',
      min: 70,
      max: 100,
      referenceDisplay: '70 – 100',
      method: 'GOD-POD',
      methodOptions: ['GOD-POD', 'Hexokinase'],
      criticalLow: 40,
      criticalHigh: 250,
    },
  ],
};

/** Safe fallback for a testName the catalog doesn't (yet) know — a free-text
 * qualitative entry rather than a crash, so Result Entry never dead-ends on
 * an unrecognised test. */
function fallbackParam(testName: string): CatalogParam {
  return {
    parameter: testName,
    kind: 'qualitative',
    referenceDisplay: '—',
    options: ['Not Detected', 'Detected'],
    normalValue: 'Not Detected',
    method: 'Manual',
    methodOptions: ['Manual'],
  };
}

export function getCatalogForTest(testName: string): CatalogParam[] {
  return LAB_TEST_CATALOG[testName] ?? [fallbackParam(testName)];
}

export type ComputedFlag = 'H' | 'L' | 'A' | undefined;

/** Live, per-row flag — computed from the catalog's real reference range or
 * qualitative normal value, never a hardcoded placeholder. Blank value
 * (nothing typed yet) is deliberately unflagged, not "Normal". */
export function computeFlag(value: string, param: CatalogParam): ComputedFlag {
  if (!value.trim()) return undefined;
  if (param.kind === 'qualitative') {
    return param.normalValue !== undefined && value !== param.normalValue ? 'A' : undefined;
  }
  const num = Number(value);
  if (Number.isNaN(num)) return undefined;
  if (param.min !== undefined && num < param.min) return 'L';
  if (param.max !== undefined && num > param.max) return 'H';
  return undefined;
}

/** Whether a numeric value crosses the parameter's real critical threshold —
 * escalates a test's overall flag from ABNORMAL to CRITICAL on finalize. */
export function isRowCritical(value: string, param: CatalogParam): boolean {
  if (!value.trim() || param.kind !== 'numeric') return false;
  const num = Number(value);
  if (Number.isNaN(num)) return false;
  return (
    (param.criticalLow !== undefined && num < param.criticalLow) ||
    (param.criticalHigh !== undefined && num > param.criticalHigh)
  );
}

/** Real, not fabricated — scans the live store for the most recent earlier
 * resulted test of the same name for the same patient and pulls the matching
 * parameter's value. Blank when no history exists, which is honest: most
 * parameters won't have one. */
export function getPreviousResult(
  results: LabResult[],
  mrn: string,
  testName: string,
  parameter: string,
  beforeIso: string,
): string | undefined {
  const beforeMs = new Date(beforeIso).getTime();
  const candidates = results
    .filter(
      (r) =>
        r.mrn === mrn &&
        r.testName === testName &&
        r.resultAt !== undefined &&
        (r.status === 'RESULTED' || r.status === 'VERIFIED') &&
        new Date(r.resultAt).getTime() < beforeMs,
    )
    .sort((a, b) => new Date(b.resultAt!).getTime() - new Date(a.resultAt!).getTime());
  for (const candidate of candidates) {
    const row = candidate.rows?.find((r) => r.parameter === parameter);
    if (row) return row.value;
  }
  return undefined;
}
