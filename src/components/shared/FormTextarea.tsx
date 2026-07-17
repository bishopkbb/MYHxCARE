import { forwardRef, type TextareaHTMLAttributes } from 'react';

import { cn } from '@lib/utils';

type FormTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { hasError?: boolean };

export const FormTextarea = forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  function FormTextarea({ className, style, hasError, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        {...props}
        className={cn(
          'w-full resize-none rounded-[10px] px-3.5 py-2.5 font-sans transition-colors duration-150',
          'bg-white text-[#0D2630] placeholder:text-[#8A98A3]',
          'focus:border-[#00B4D8] focus:ring-2 focus:ring-[#00B4D8]/40 focus:outline-none',
          'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none',
          className,
        )}
        style={{
          fontSize: 14,
          border: `1px solid ${hasError ? '#EF4444' : 'rgba(0,100,130,0.18)'}`,
          ...style,
        }}
      />
    );
  },
);
