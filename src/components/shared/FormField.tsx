import type { ReactNode } from 'react';

/**
 * Label + control + error-message wrapper shared by every form field in
 * multi-field forms (Register Patient, etc.). Keeps label typography, the
 * required-asterisk, and error-row spacing consistent everywhere a field
 * appears without each call site re-declaring it.
 */
export function FormField({
  label,
  htmlFor,
  required,
  error,
  hint,
  className = '',
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean | undefined;
  error?: string | undefined;
  hint?: string | undefined;
  className?: string | undefined;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <label
        htmlFor={htmlFor}
        className="block font-sans font-medium"
        style={{ fontSize: 14, color: '#0D2630' }}
      >
        {label}
        {required && (
          <span style={{ color: '#EF4444' }} aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>
      <div className="mt-1.5">{children}</div>
      {error ? (
        <p className="mt-1" style={{ fontSize: 14, color: '#EF4444' }}>
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1" style={{ fontSize: 14, color: '#8A98A3' }}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
