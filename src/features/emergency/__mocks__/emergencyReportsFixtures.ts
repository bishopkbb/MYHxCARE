/**
 * Emergency Reports fixtures — the department-wide analytics/report-catalog
 * screen, not a per-patient one. No historical ED-wide analytics store
 * exists anywhere in this build (no visits-over-time, admissions-over-time,
 * LOS, or satisfaction archive) — same honesty pattern as
 * `deriveVisitHistory()` in `emergencyFixtures.ts`, but at department scope
 * instead of per-patient. Follows the same convention Registration's own
 * Reports screen uses (`REPORT_STATS`): illustrative but internally
 * consistent fixture data, clearly commented, swapped for a real
 * `GET /emergency/reports` endpoint in Phase 6.
 */

export type ReportStat = {
  key: string;
  label: string;
  value: string;
  deltaPercent: number;
  direction: 'up' | 'down';
  goodDirection: 'up' | 'down'; // which direction is clinically/operationally good, for color
};

export const REPORT_STATS: ReportStat[] = [
  {
    key: 'visits',
    label: 'Total ED Visits',
    value: '256',
    deltaPercent: 12.5,
    direction: 'up',
    goodDirection: 'up',
  },
  {
    key: 'admitted',
    label: 'Admitted Patients',
    value: '78',
    deltaPercent: 8.3,
    direction: 'up',
    goodDirection: 'up',
  },
  {
    key: 'leftAma',
    label: 'Left AMA',
    value: '16',
    deltaPercent: 11.1,
    direction: 'down',
    goodDirection: 'down',
  },
  {
    key: 'los',
    label: 'Average LOS (ED)',
    value: '3h 45m',
    deltaPercent: 6.4,
    direction: 'down',
    goodDirection: 'down',
  },
  {
    key: 'satisfaction',
    label: 'Patient Satisfaction',
    value: '88%',
    deltaPercent: 5.2,
    direction: 'up',
    goodDirection: 'up',
  },
];

export type ReportFormat = 'PDF' | 'XLSX';

export type EmergencyReportCatalogEntry = {
  id: string;
  name: string;
  description: string;
  reportType: string;
  generatedBy: string;
  generatedOn: string; // ISO
  dateRangeLabel: string;
  format: ReportFormat;
  location: string;
  shift: string;
  userGenerated?: boolean;
};

export const REPORT_TYPES = [
  'ED Daily Summary',
  'ED Weekly Summary',
  'Patient Flow Report',
  'Triage Performance Report',
  'Waiting Time Analysis',
  'Clinical Outcomes Report',
  'Left AMA Report',
  'Resource Utilization Report',
];

const REPORT_DESCRIPTIONS: Record<string, string> = {
  'ED Daily Summary': 'Summary of ED visits, admissions, and key metrics for the day.',
  'ED Weekly Summary': 'Weekly overview of patient volume, outcomes and performance.',
  'Patient Flow Report': 'Detailed report on patient flow and time spent in each stage.',
  'Triage Performance Report': 'Triage acuity distribution and performance metrics.',
  'Waiting Time Analysis': 'Average waiting time by time period and acuity level.',
  'Clinical Outcomes Report': 'Common diagnoses, treatments and patient outcomes.',
  'Left AMA Report': 'Patients who left against medical advice.',
  'Resource Utilization Report': 'Utilization of beds, staff, equipment and other resources.',
};

const REPORT_FORMAT: Record<string, ReportFormat> = {
  'ED Daily Summary': 'PDF',
  'ED Weekly Summary': 'PDF',
  'Patient Flow Report': 'XLSX',
  'Triage Performance Report': 'PDF',
  'Waiting Time Analysis': 'PDF',
  'Clinical Outcomes Report': 'XLSX',
  'Left AMA Report': 'PDF',
  'Resource Utilization Report': 'PDF',
};

const REPORT_AUTHORS = ['Dr. John Okafor', 'Dr. Jane Smith', 'Dr. Mary Ade'];

export const REPORT_LOCATIONS = [
  'Resuscitation Bay',
  'Main Treatment Area',
  'Pediatric Area',
  'Isolation Ward',
];

export const REPORT_SHIFTS = [
  'Morning (07:00–15:00)',
  'Afternoon (15:00–23:00)',
  'Night (23:00–07:00)',
];

function seedReportCatalog(count: number, now: number): EmergencyReportCatalogEntry[] {
  const entries: EmergencyReportCatalogEntry[] = [];
  for (let i = 0; i < count; i++) {
    const type = REPORT_TYPES[i % REPORT_TYPES.length]!;
    const generatedOn = new Date(now - i * 20 * 60 * 60 * 1000); // ~20h apart
    const rangeStart = new Date(generatedOn.getTime() - 7 * 24 * 60 * 60 * 1000);
    entries.push({
      id: `rep-${i + 1}`,
      name: type,
      description: REPORT_DESCRIPTIONS[type]!,
      reportType: type,
      generatedBy: REPORT_AUTHORS[i % REPORT_AUTHORS.length]!,
      generatedOn: generatedOn.toISOString(),
      dateRangeLabel:
        i === 0
          ? 'Today'
          : `${rangeStart.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} – ${generatedOn.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`,
      format: REPORT_FORMAT[type]!,
      location: REPORT_LOCATIONS[i % REPORT_LOCATIONS.length]!,
      shift: REPORT_SHIFTS[i % REPORT_SHIFTS.length]!,
    });
  }
  return entries;
}

export const EMERGENCY_REPORT_CATALOG: EmergencyReportCatalogEntry[] = seedReportCatalog(
  24,
  Date.now(),
);

export type TopMetrics = {
  busiestDay: string;
  peakHour: string;
  mostCommonDiagnosis: string;
  admissionRatePercent: number;
  leftAmaRatePercent: number;
};

export const TOP_METRICS: TopMetrics = {
  busiestDay: 'Yesterday (52 visits)',
  peakHour: '17:00 – 18:00',
  mostCommonDiagnosis: 'Acute Asthma Exacerbation',
  admissionRatePercent: 30.5,
  leftAmaRatePercent: 6.2,
};

export const REPORT_TEMPLATES = [
  'ED Daily Summary Template',
  'Patient Flow Template',
  'Triage Performance Template',
  'Clinical Outcomes Template',
];
