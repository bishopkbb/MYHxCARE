'use client';

import { ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { cn } from '@lib/utils';
import type { SelectOption } from '@/features/registration/__mocks__/registerPatientOptions';

/**
 * Full-width bordered dropdown matching the FormInput visual language —
 * for use wherever a native <select> can't give the animated, styled list
 * the rest of the app's dropdowns use (see FilterDropdown for the pill
 * variant of the same pattern). Controlled — pair with RHF's <Controller>.
 */
export function FormSelect({
  id,
  value,
  onChange,
  onBlur,
  options,
  placeholder,
  hasError,
  disabled,
}: {
  id: string;
  value: string | undefined;
  onChange: (value: string) => void;
  onBlur?: () => void;
  options: SelectOption[];
  placeholder: string;
  hasError?: boolean | undefined;
  disabled?: boolean | undefined;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!isOpen) return;
    function onMouseDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        onBlur?.();
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onBlur]);

  return (
    <div ref={rootRef} className="relative">
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((o) => !o)}
        className={cn(
          'flex h-11 w-full items-center justify-between rounded-[10px] px-3.5 text-left font-sans transition-colors duration-150',
          'focus:ring-2 focus:ring-[#00B4D8]/40 focus:outline-none',
          'disabled:cursor-not-allowed disabled:bg-[#F5FBFD] disabled:text-[#8A98A3]',
          'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none',
        )}
        style={{
          fontSize: 14,
          background: '#FFFFFF',
          border: `1px solid ${hasError ? '#EF4444' : isOpen ? '#00B4D8' : 'rgba(0,100,130,0.18)'}`,
          color: selected ? '#0D2630' : '#8A98A3',
        }}
      >
        <span className="truncate">{selected?.label ?? placeholder}</span>
        <ChevronDown
          className="shrink-0"
          style={{
            width: 16,
            height: 16,
            color: '#8A98A3',
            transition: 'transform 150ms',
            transform: isOpen ? 'rotate(180deg)' : 'none',
          }}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          className="animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 absolute top-full left-0 z-30 mt-1.5 max-h-64 w-full overflow-y-auto scroll-smooth rounded-[12px] bg-white py-1.5 duration-150"
          style={{
            border: '1px solid rgba(0,100,130,0.12)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          }}
        >
          {options.length === 0 ? (
            <p className="px-4 py-2" style={{ fontSize: 14, color: '#8A98A3' }}>
              No options available
            </p>
          ) : (
            options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={opt.value === value}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                  onBlur?.();
                }}
                className="flex w-full items-center px-4 py-2 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                style={{
                  fontSize: 14,
                  color: opt.value === value ? '#00B4D8' : '#2F3A40',
                  fontWeight: opt.value === value ? 600 : 400,
                }}
              >
                {opt.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
