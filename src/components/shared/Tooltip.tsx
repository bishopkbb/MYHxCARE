'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Hover/focus tooltip for a single child element. Only appears when the
 * child is actually overflowing (`scrollWidth > clientWidth`, e.g. a
 * `truncate` cell) — never shows over text that already renders in full, so
 * it's safe to wrap indiscriminately without auditing which rows happen to
 * be long enough to clip.
 *
 * Renders a `contents`-display wrapper (no layout box of its own, so it
 * never disturbs a flex/table row) instead of cloning the child to inject a
 * ref — cloneElement + ref tripped React 19's compiler lint
 * (`react-hooks/refs`, "passing a ref to a function may read its value
 * during render"). The wrapper's own DOM node still has `firstElementChild`,
 * so it's used to reach the real element for the overflow check and for
 * `getBoundingClientRect()` (a `display: contents` node itself always
 * reports an empty rect).
 *
 * Portals to `document.body` with `fixed` coordinates (same reasoning as
 * `RowMenuPortal`) so it is never clipped by a table's `overflow-x-auto`
 * ancestor, and closes on scroll/resize since its position would go stale.
 */
export function Tooltip({
  content,
  children,
  disabled = false,
}: {
  content: ReactNode;
  children: ReactNode;
  disabled?: boolean;
}) {
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; openUp: boolean } | null>(null);
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function getTarget(): HTMLElement | null {
    const wrapper = wrapperRef.current;
    if (!wrapper) return null;
    return (wrapper.firstElementChild as HTMLElement | null) ?? wrapper;
  }

  function isOverflowing(el: HTMLElement) {
    return el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1;
  }

  function show() {
    if (disabled || !content) return;
    if (hideTimer.current) clearTimeout(hideTimer.current);
    showTimer.current = setTimeout(() => {
      const el = getTarget();
      if (!el || !isOverflowing(el)) return;
      const rect = el.getBoundingClientRect();
      const openUp = window.innerHeight - rect.bottom < 60 && rect.top > 60;
      setCoords({
        top: openUp ? rect.top - 8 : rect.bottom + 8,
        left: Math.min(Math.max(8, rect.left), window.innerWidth - 288),
        openUp,
      });
      setOpen(true);
    }, 350);
  }

  function hide() {
    if (showTimer.current) clearTimeout(showTimer.current);
    hideTimer.current = setTimeout(() => setOpen(false), 80);
  }

  useEffect(
    () => () => {
      if (showTimer.current) clearTimeout(showTimer.current);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (!open) return;
    function close() {
      setOpen(false);
    }
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  return (
    <span
      ref={wrapperRef}
      className="contents"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {open &&
        coords &&
        createPortal(
          <div
            role="tooltip"
            className={`animate-in fade-in-0 zoom-in-95 pointer-events-none fixed z-[110] max-w-[280px] rounded-[8px] px-2.5 py-1.5 font-sans duration-150 ${
              coords.openUp ? 'slide-in-from-bottom-1' : 'slide-in-from-top-1'
            }`}
            style={{
              top: coords.openUp ? undefined : coords.top,
              bottom: coords.openUp ? window.innerHeight - coords.top : undefined,
              left: coords.left,
              fontSize: 14,
              lineHeight: 1.4,
              color: '#FFFFFF',
              background: '#1A3D4D',
              boxShadow: '0 4px 16px rgba(0,0,0,0.16)',
            }}
          >
            {content}
          </div>,
          document.body,
        )}
    </span>
  );
}
