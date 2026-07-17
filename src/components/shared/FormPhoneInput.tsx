'use client';

import { ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState, type InputHTMLAttributes } from 'react';

import { PHONE_COUNTRY_CODE_OPTIONS } from '@/features/registration/__mocks__/registerPatientOptions';

/**
 * Country-code segment + phone number field rendered as one fused control
 * (single outer border, divider between segments) matching the app's other
 * form fields. The number segment is a plain input — spread RHF's
 * `register()` output onto `numberInputProps` directly.
 */
export function FormPhoneInput({
  countryCode,
  onCountryCodeChange,
  hasError,
  numberInputProps,
}: {
  countryCode: string;
  onCountryCodeChange: (value: string) => void;
  hasError?: boolean | undefined;
  numberInputProps: InputHTMLAttributes<HTMLInputElement>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function onMouseDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setIsOpen(false);
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [isOpen]);

  return (
    <div
      className="flex h-11 items-stretch overflow-visible rounded-[10px] transition-colors duration-150"
      style={{ border: `1px solid ${hasError ? '#EF4444' : 'rgba(0,100,130,0.18)'}` }}
    >
      <div ref={rootRef} className="relative shrink-0">
        <button
          type="button"
          onClick={() => setIsOpen((o) => !o)}
          className="flex h-11 items-center gap-1 rounded-l-[10px] px-2.5 font-sans transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
          style={{ fontSize: 14, color: '#0D2630', borderRight: '1px solid rgba(0,100,130,0.18)' }}
        >
          {countryCode}
          <ChevronDown
            style={{
              width: 14,
              height: 14,
              color: '#8A98A3',
              transition: 'transform 150ms',
              transform: isOpen ? 'rotate(180deg)' : 'none',
            }}
          />
        </button>
        {isOpen && (
          <div
            role="listbox"
            className="animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 absolute top-full left-0 z-30 mt-1.5 min-w-[84px] overflow-hidden rounded-[12px] bg-white py-1.5 duration-150"
            style={{
              border: '1px solid rgba(0,100,130,0.12)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
            }}
          >
            {PHONE_COUNTRY_CODE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={opt.value === countryCode}
                onClick={() => {
                  onCountryCodeChange(opt.value);
                  setIsOpen(false);
                }}
                className="flex w-full items-center px-4 py-2 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                style={{
                  fontSize: 14,
                  color: opt.value === countryCode ? '#00B4D8' : '#2F3A40',
                  fontWeight: opt.value === countryCode ? 600 : 400,
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <input
        type="tel"
        inputMode="numeric"
        {...numberInputProps}
        className="h-11 min-w-0 flex-1 rounded-r-[10px] bg-white px-3.5 font-sans text-[#0D2630] placeholder:text-[#8A98A3] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
        style={{ fontSize: 14 }}
      />
    </div>
  );
}
