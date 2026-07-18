/** West Africa Time — UTC+1, no daylight saving. IANA name for Nigeria. */
export const WAT_TZ = 'Africa/Lagos';

function coerce(date: Date | string): Date {
  return typeof date === 'string' ? new Date(date) : date;
}

// Module-level formatter instances — avoid per-call allocation.
const dateFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: WAT_TZ,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
}); // → "31/12/2024"

const timeFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: WAT_TZ,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
}); // → "14:30"

const relFmt = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

const humanDateFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: WAT_TZ,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
}); // → "10 Jun 2026"

// ─── Display formatters ────────────────────────────────────────────────────

/** Returns "DD/MM/YYYY" in WAT. Accepts ISO string or Date. */
export function formatDate(date: Date | string): string {
  return dateFmt.format(coerce(date));
}

/** Returns "D MMM YYYY" in WAT (e.g. "10 Jun 2026") — for prose/summary contexts. */
export function formatHumanDate(date: Date | string): string {
  return humanDateFmt.format(coerce(date));
}

/** Returns "HH:MM" (24 h) in WAT. */
export function formatTime(date: Date | string): string {
  return timeFmt.format(coerce(date));
}

/** Returns "DD/MM/YYYY HH:MM" in WAT. */
export function formatDateTime(date: Date | string): string {
  const d = coerce(date);
  return `${dateFmt.format(d)} ${timeFmt.format(d)}`;
}

// ─── Parser ───────────────────────────────────────────────────────────────

/**
 * Parses a "DD/MM/YYYY" display string back to a Date (midnight WAT).
 * Use for date-picker form values before sending to the API.
 */
export function parseDateStr(dateStr: string): Date {
  const parts = dateStr.split('/');
  const dd = parts[0] ?? '01';
  const mm = parts[1] ?? '01';
  const yyyy = parts[2] ?? '1970';
  // Construct midnight WAT (+01:00) as an ISO string
  return new Date(`${yyyy}-${mm}-${dd}T00:00:00+01:00`);
}

// ─── Relative time ────────────────────────────────────────────────────────

/**
 * Returns a human-readable relative time string.
 * Falls back to formatDate() for dates older than 30 days.
 *
 * Examples: "just now", "3 minutes ago", "2 hours ago", "yesterday"
 */
export function toRelativeTime(date: Date | string): string {
  const d = coerce(date);
  const diffMs = d.getTime() - Date.now();
  const absSecs = Math.abs(Math.round(diffMs / 1_000));

  if (absSecs < 45) return 'just now';

  const diffMins = Math.round(diffMs / 60_000);
  if (Math.abs(diffMins) < 60) return relFmt.format(diffMins, 'minute');

  const diffHours = Math.round(diffMs / 3_600_000);
  if (Math.abs(diffHours) < 24) return relFmt.format(diffHours, 'hour');

  const diffDays = Math.round(diffMs / 86_400_000);
  if (Math.abs(diffDays) < 30) return relFmt.format(diffDays, 'day');

  return formatDate(d);
}

// ─── Day comparison helpers ───────────────────────────────────────────────

function watDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: WAT_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const y = parts.find((p) => p.type === 'year')?.value ?? '0';
  const m = parts.find((p) => p.type === 'month')?.value ?? '0';
  const d = parts.find((p) => p.type === 'day')?.value ?? '0';
  return `${y}-${m}-${d}`;
}

/** True if the date falls on today in WAT. */
export function isToday(date: Date | string): boolean {
  return watDateKey(coerce(date)) === watDateKey(new Date());
}

/** True if two dates fall on the same calendar day in WAT. */
export function isSameDay(a: Date | string, b: Date | string): boolean {
  return watDateKey(coerce(a)) === watDateKey(coerce(b));
}
