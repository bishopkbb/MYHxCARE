'use client';

import { HelpCircle, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { resolveHelpGuide } from '@/config/helpGuides';
import { cn } from '@lib/utils';

/**
 * Contextual help beacon — the standard bottom-right "?" launcher.
 *
 * Opens a non-modal popover anchored above the launcher with the user guide
 * for the current screen (resolved from the route via helpGuides.ts).
 * Escape, click-outside, and route changes close it; focus moves into the
 * panel on open and returns to the launcher on close.
 */
export function HelpBeacon() {
  const pathname = usePathname();
  const guide = resolveHelpGuide(pathname);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Navigating to another screen closes the panel — its content is per-route.
  // State-reset-on-prop-change done during render (the sanctioned pattern from
  // react.dev "You Might Not Need an Effect"), not in an effect.
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    function handleClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('keydown', handleKey);
    document.addEventListener('mousedown', handleClick);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [open]);

  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  return (
    <div ref={rootRef}>
      {/* ── Guide panel ─────────────────────────────────────────────────── */}
      {open && (
        <div
          ref={panelRef}
          tabIndex={-1}
          role="dialog"
          aria-label={`User guide — ${guide.title}`}
          className="animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 fixed right-4 bottom-20 z-40 flex max-h-[70dvh] w-95 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-[16px] bg-white duration-150 focus-visible:outline-none"
          style={{
            border: '1px solid rgba(0,100,130,0.15)',
            boxShadow: '0 12px 40px rgba(13,38,48,0.18)',
          }}
        >
          {/* Header */}
          <div className="shrink-0 px-5 py-4" style={{ background: '#25464D' }}>
            <p className="text-sm leading-5.5 font-medium" style={{ color: '#0098CC' }}>
              User Guide
            </p>
            <p className="font-display text-[20px] leading-7 font-semibold text-white">
              {guide.title}
            </p>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto scroll-smooth px-5 py-4">
            <p className="text-sm leading-5.5" style={{ color: '#4A7080' }}>
              {guide.intro}
            </p>

            <div className="mt-4 space-y-4">
              {guide.sections.map((section) => (
                <div key={section.heading}>
                  <p className="text-sm leading-5.5 font-semibold" style={{ color: '#0D2630' }}>
                    {section.heading}
                  </p>
                  <p className="mt-0.5 text-sm leading-5.5" style={{ color: '#4A7080' }}>
                    {section.body}
                  </p>
                  {section.steps && (
                    <ol className="mt-1.5 space-y-1">
                      {section.steps.map((step, i) => (
                        <li
                          key={step}
                          className="flex gap-2 text-sm leading-5.5"
                          style={{ color: '#25464D' }}
                        >
                          <span className="shrink-0 font-semibold" style={{ color: '#0098CC' }}>
                            {i + 1}.
                          </span>
                          {step}
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Launcher ────────────────────────────────────────────────────── */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? 'Close user guide' : `Open user guide for ${guide.title}`}
        title={open ? 'Close user guide' : 'User guide'}
        className={cn(
          'fixed right-4 bottom-4 z-40 flex size-11 items-center justify-center rounded-full text-white transition-[transform,box-shadow,background-color] duration-150 hover:scale-105 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:ring-offset-2 focus-visible:outline-none',
          open ? 'bg-[#25464D] hover:bg-[#1F3D43]' : 'bg-[#00B4D8] hover:bg-[#0098CC]',
        )}
        style={{ boxShadow: '0 4px 14px rgba(0,180,216,0.35)' }}
      >
        {open ? <X className="size-5" /> : <HelpCircle className="size-5" />}
      </button>
    </div>
  );
}
