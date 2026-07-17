import { forwardRef, type InputHTMLAttributes } from 'react';

import { cn } from '@lib/utils';

export const FORM_CONTROL_CLASS = cn(
  'h-11 w-full rounded-[10px] px-3.5 font-sans transition-colors duration-150',
  'bg-white text-[#0D2630] placeholder:text-[#8A98A3]',
  'focus:outline-none focus:ring-2 focus:ring-[#00B4D8]/40 focus:border-[#00B4D8]',
  'disabled:cursor-not-allowed disabled:bg-[#F5FBFD] disabled:text-[#8A98A3]',
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none',
);

type FormInputProps = InputHTMLAttributes<HTMLInputElement> & { hasError?: boolean };

export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(function FormInput(
  { className, style, hasError, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      {...props}
      className={cn(FORM_CONTROL_CLASS, className)}
      style={{
        fontSize: 14,
        border: `1px solid ${hasError ? '#EF4444' : 'rgba(0,100,130,0.18)'}`,
        ...style,
      }}
    />
  );
});
