/**
 * Mock fixtures for the Vital Signs screen (nurse workspace).
 * Swap out by pointing hooks to a real observations endpoint in Phase 6.
 *
 * The trend series is generated deterministically from each patient's existing
 * `vitals6` snapshot (patientRecordFixtures.ts) so the "latest" reading here
 * always matches the Patient Record overview — history is a seeded random walk
 * backward in time from that anchor, not independent invented numbers.
 */

import { getPatientRecord } from '@/features/nursing/__mocks__/patientRecordFixtures';

export type VitalReading = {
  id: string;
  recordedAt: string; // ISO
  systolic: number;
  diastolic: number;
  pulse: number;
  respRate: number;
  temp: number;
  spo2: number;
  painScore: number; // 0-10
  bloodSugar: number; // mg/dL
};

export type BodyMeasurements = {
  weight: number; // kg
  weightRecordedAt: string;
  height: number; // cm
  heightRecordedAt: string;
};

export type Flag = 'High' | 'Low' | 'Normal';

// ── Seeded PRNG — deterministic per patient so the same patient always
// renders the same trend shape across reloads. ──────────────────────────────

function hashSeed(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (Math.imul(31, h) + input.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hoursAgo(h: number): string {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() - h);
  return d.toISOString();
}

const READINGS_PER_PATIENT = 360; // one every 2h across 30 days
const HOURS_PER_STEP = 2;

/** Historical trend series + the "now" reading, anchored on vitals6. */
export function getVitalReadingsForPatient(patientId: string): VitalReading[] {
  const record = getPatientRecord(patientId);
  const anchor = record?.vitals6;
  const [sysStr, diaStr] = (anchor?.bp ?? '120/80').split('/');
  const anchorSystolic = Number(sysStr) || 120;
  const anchorDiastolic = Number(diaStr) || 80;
  const anchorPulse = anchor?.hr ?? 76;
  const anchorRR = anchor?.rr ?? 18;
  const anchorTemp = anchor?.temp ?? 36.8;
  const anchorSpo2 = anchor?.spo2 ?? 97;
  const anchorPain = anchor?.painScore ?? 2;
  const anchorBS = 100 + (hashSeed(patientId) % 40);

  const rand = mulberry32(hashSeed(patientId));
  const readings: VitalReading[] = [];

  for (let i = 0; i < READINGS_PER_PATIENT; i++) {
    // Fade factor: 1 at "now" (i=0), decaying toward 0.15 further back in
    // time, so the series drifts toward a calmer baseline the further back
    // it goes rather than jittering uniformly across 30 days.
    const fade = 0.15 + 0.85 * Math.exp(-i / 48);
    const jitter = () => (rand() - 0.5) * 2;

    readings.push({
      id: i === 0 ? `${patientId}-latest` : `${patientId}-h${i}`,
      recordedAt: i === 0 ? (anchor?.recordedAt ?? hoursAgo(0)) : hoursAgo(i * HOURS_PER_STEP),
      systolic: Math.round(anchorSystolic - (1 - fade) * 20 + jitter() * 4),
      diastolic: Math.round(anchorDiastolic - (1 - fade) * 12 + jitter() * 3),
      pulse: Math.round(anchorPulse - (1 - fade) * 14 + jitter() * 4),
      respRate: Math.round(anchorRR - (1 - fade) * 4 + jitter() * 2),
      temp: Number((anchorTemp - (1 - fade) * 1.2 + jitter() * 0.2).toFixed(1)),
      spo2: Math.min(100, Math.round(anchorSpo2 + (1 - fade) * 4 + jitter() * 1.5)),
      painScore: Math.max(0, Math.min(10, Math.round(anchorPain - (1 - fade) * 3 + jitter()))),
      bloodSugar: Math.round(anchorBS - (1 - fade) * 25 + jitter() * 6),
    });
  }

  return readings;
}

/** Weight/height are recorded far less often than the vitals above. */
export function getBodyMeasurements(patientId: string): BodyMeasurements {
  const seed = hashSeed(patientId);
  return {
    weight: Number((55 + (seed % 400) / 10).toFixed(1)),
    weightRecordedAt: hoursAgo(48),
    height: 150 + (seed % 41),
    heightRecordedAt: hoursAgo(48),
  };
}

// ── Flags — badge bands per vital ───────────────────────────────────────────

export function bpFlag(systolic: number): Flag {
  if (systolic >= 140) return 'High';
  if (systolic < 90) return 'Low';
  return 'Normal';
}

export function pulseFlag(pulse: number): Flag {
  if (pulse > 100) return 'High';
  if (pulse < 60) return 'Low';
  return 'Normal';
}

export function respRateFlag(rr: number): Flag {
  if (rr > 20) return 'High';
  if (rr < 12) return 'Low';
  return 'Normal';
}

export function tempFlag(temp: number): Flag {
  if (temp > 38.0) return 'High';
  if (temp < 36.1) return 'Low';
  return 'Normal';
}

export function spo2Flag(spo2: number): Flag {
  if (spo2 < 95) return 'Low';
  return 'Normal';
}

export function bloodSugarFlag(bs: number): Flag {
  if (bs > 140) return 'High';
  if (bs < 70) return 'Low';
  return 'Normal';
}

export type PainBand = 'Mild' | 'Moderate' | 'Severe';

export function painBand(score: number): PainBand {
  if (score >= 7) return 'Severe';
  if (score >= 4) return 'Moderate';
  return 'Mild';
}

// ── Early Warning Score (NEWS2) — standard clinical banding ─────────────────

export type News2Breakdown = {
  respRate: number;
  spo2: number;
  temp: number;
  sbp: number;
  pulse: number;
  consciousness: number;
  total: number;
  risk: 'Low' | 'Medium' | 'High';
};

export function computeNews2(reading: VitalReading, isAlert = true): News2Breakdown {
  const respRate =
    reading.respRate <= 8
      ? 3
      : reading.respRate <= 11
        ? 1
        : reading.respRate <= 20
          ? 0
          : reading.respRate <= 24
            ? 2
            : 3;
  const spo2 = reading.spo2 <= 91 ? 3 : reading.spo2 <= 93 ? 2 : reading.spo2 <= 95 ? 1 : 0;
  const temp =
    reading.temp <= 35.0
      ? 3
      : reading.temp <= 36.0
        ? 1
        : reading.temp <= 38.0
          ? 0
          : reading.temp <= 39.0
            ? 1
            : 2;
  const sbp =
    reading.systolic <= 90
      ? 3
      : reading.systolic <= 100
        ? 2
        : reading.systolic <= 110
          ? 1
          : reading.systolic <= 219
            ? 0
            : 3;
  const pulse =
    reading.pulse <= 40
      ? 3
      : reading.pulse <= 50
        ? 1
        : reading.pulse <= 90
          ? 0
          : reading.pulse <= 110
            ? 1
            : reading.pulse <= 130
              ? 2
              : 3;
  const consciousness = isAlert ? 0 : 3;

  const total = respRate + spo2 + temp + sbp + pulse + consciousness;
  const risk = total >= 7 ? 'High' : total >= 5 ? 'Medium' : 'Low';

  return { respRate, spo2, temp, sbp, pulse, consciousness, total, risk };
}

export function nextVitalReadingId(patientId: string): string {
  return `${patientId}-r${Date.now()}`;
}
