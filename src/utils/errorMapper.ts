// Maps backend error codes to user-facing strings.
// Add new codes here as the API contract expands — never hard-code messages in components.

const ERROR_MESSAGES = {
  // ── Auth ──────────────────────────────────────────────────────────────────
  INVALID_CREDENTIALS: 'Invalid staff ID or password.',
  ACCOUNT_LOCKED: 'Account locked after too many failed attempts. Contact your administrator.',
  CONCURRENT_SESSION: 'Another active session exists. Sign out from other devices first.',
  TOKEN_EXPIRED: 'Your session has expired. Please sign in again.',
  NO_REFRESH_TOKEN: 'Your session has expired. Please sign in again.',

  // ── Patients ──────────────────────────────────────────────────────────────
  PATIENT_DUPLICATE_CANDIDATE:
    'A patient with similar details already exists. Manual review required.',
  PATIENT_ALREADY_ADMITTED: 'This patient is already admitted to a ward.',

  // ── Clinical ──────────────────────────────────────────────────────────────
  CLINICAL_RECORD_IMMUTABLE: 'Clinical records cannot be edited after creation.',
  CLINICAL_ACCESS_DENIED: "You are not authorised to access this patient's records.",
  ENCOUNTER_CLOSED: 'This encounter has been closed.',

  // ── Wards / Admissions ────────────────────────────────────────────────────
  WARD_BED_ALREADY_OCCUPIED: 'The selected bed is no longer available.',
  BED_ALREADY_OCCUPIED: 'Bed is currently occupied.',
  ADMISSION_NOT_ACTIVE: 'No active ward admission found for this patient.',

  // ── Pharmacy ──────────────────────────────────────────────────────────────
  INSUFFICIENT_STOCK: 'Not enough stock available for this dispense.',
  BATCH_EXPIRED: 'The selected batch has expired.',
  DISPENSE_ALREADY_PROCESSED: 'This dispense has already been processed.',

  // ── Collaboration ─────────────────────────────────────────────────────────
  CASE_THREAD_PURPOSE_REQUIRED:
    'Case thread must be linked to a patient, encounter, or department.',
  CASE_MESSAGE_ACCESS_DENIED: 'You are not authorised to access this case thread.',

  // ── Duty Roster ───────────────────────────────────────────────────────────
  DUTY_OVERLAP_NOT_ALLOWED: 'This duty assignment overlaps with an existing assignment.',
  NO_ACTIVE_DUTY_FOUND: 'No staff member is currently on duty for this department.',

  // ── Validation ────────────────────────────────────────────────────────────
  VALIDATION_FAILED: 'One or more fields are invalid. Please review and try again.',

  // ── Generic HTTP-level ────────────────────────────────────────────────────
  FORBIDDEN: "You don't have permission to perform this action.",
  NOT_FOUND: 'The requested resource could not be found.',
  CONFLICT: 'This action conflicts with existing data.',

  // ── Network / system ──────────────────────────────────────────────────────
  NETWORK_ERROR: 'Network error. Please check your connection and try again.',
  REQUEST_TIMEOUT: 'The request timed out. Please try again.',
  SERVER_ERROR: 'A server error occurred. Please try again later.',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
} satisfies Record<string, string>;

export type KnownErrorCode = keyof typeof ERROR_MESSAGES;

/**
 * Returns a user-facing message for a backend error code.
 * Falls back to `fallback` if provided, then a generic message.
 */
export function getErrorMessage(code: string, fallback?: string): string {
  const msg = (ERROR_MESSAGES as Record<string, string | undefined>)[code];
  return msg ?? fallback ?? 'An unexpected error occurred. Please try again.';
}

/**
 * True when the code is one the app explicitly handles.
 * Useful for deciding whether to show a toast vs a modal.
 */
export function isKnownErrorCode(code: string): code is KnownErrorCode {
  return Object.prototype.hasOwnProperty.call(ERROR_MESSAGES, code);
}
