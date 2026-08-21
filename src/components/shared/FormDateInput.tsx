import { CalendarDays } from 'lucide-react';
import { forwardRef, type InputHTMLAttributes } from 'react';

import { cn } from '@lib/utils';
import { FORM_CONTROL_CLASS } from '@components/shared/FormInput';

type FormDateInputProps = InputHTMLAttributes<HTMLInputElement> & { hasError?: boolean };

export const FormDateInput = forwardRef<HTMLInputElement, FormDateInputProps>(
  function FormDateInput({ className, style, hasError, ...props }, ref) {
    return (
      <div className="relative">
        <input
          ref={ref}
          type="date"
          lang="en-GB"
          {...props}
          className={cn(
            FORM_CONTROL_CLASS,
            // The invisible picker-indicator only covers the icon's own
            // strip on the right (not inset-0 / the full field) — covering
            // the whole input made every click open the calendar picker,
            // silently blocking manual keyboard entry of the date anywhere
            // in the field.
            'pr-10 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:top-0 [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-10 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0',
            className,
          )}
          style={{
            fontSize: 14,
            border: `1px solid ${hasError ? '#EF4444' : 'rgba(0,100,130,0.18)'}`,
            colorScheme: 'light',
            position: 'relative',
            ...style,
          }}
        />
        <CalendarDays
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2"
          style={{ width: 16, height: 16, color: '#8A98A3' }}
        />
      </div>
    );
  },
);
