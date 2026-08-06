'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

/** Solid background for a table's own header row — required once the header
 * is `sticky`, since the old `rgba(...)` tint would let body rows show
 * through faintly as they scroll underneath a pinned header. */
export const TABLE_HEADER_BG = '#EEF5F7';

/** Class string for a table's own header row div, so it pins to the top of
 * the `ScrollableTable` box it's the first child of. */
export const TABLE_HEADER_STICKY_CLASS = 'sticky top-0 z-10';

/**
 * Drop-in replacement for the `overflow-x-auto` + `minWidth` wrapper every
 * data table in this app already uses. Adds the two affordances a
 * hidden-scrollbar table has none of for a mouse-only desktop user: edge
 * scroll arrows (shown only when there's somewhere to scroll to, hidden
 * below `lg` — touch/trackpad already has a native way to scroll) and,
 * when `maxHeight` is given, a header that stays pinned while the body
 * scrolls past it.
 *
 * The header row and body rows passed as `children` are unchanged from the
 * pre-existing pattern — the only per-table migration is adding
 * `TABLE_HEADER_STICKY_CLASS` + `background: TABLE_HEADER_BG` to the header
 * row's own div.
 */
export function ScrollableTable({
  minWidth,
  maxHeight,
  children,
  className,
}: {
  minWidth: number;
  maxHeight?: number | string;
  children: ReactNode;
  className?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    function update() {
      if (!el) return;
      const overflow = el.scrollWidth - el.clientWidth;
      setCanLeft(el.scrollLeft > 4);
      setCanRight(el.scrollLeft < overflow - 4);
    }

    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  function scrollByPage(direction: 1 | -1) {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.75, behavior: 'smooth' });
  }

  return (
    <div className="relative">
      {canLeft && (
        <>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-0 left-0 z-20 hidden h-full w-16 lg:block"
            style={{ background: 'linear-gradient(to right, #FFFFFF, rgba(255,255,255,0))' }}
          />
          <button
            type="button"
            aria-label="Scroll table left"
            onClick={() => scrollByPage(-1)}
            className={`absolute top-2 left-2 z-30 hidden size-11 items-center justify-center rounded-full bg-white transition-colors duration-150 hover:bg-[rgba(0,180,216,0.08)] lg:flex ${FOCUS_RING}`}
            style={{
              border: '1px solid rgba(0,100,130,0.2)',
              boxShadow: '0 2px 8px rgba(13,38,48,0.14)',
            }}
          >
            <ChevronLeft style={{ width: 18, height: 18, color: '#0D2630' }} />
          </button>
        </>
      )}
      {canRight && (
        <>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-0 right-0 z-20 hidden h-full w-16 lg:block"
            style={{ background: 'linear-gradient(to left, #FFFFFF, rgba(255,255,255,0))' }}
          />
          <button
            type="button"
            aria-label="Scroll table right"
            onClick={() => scrollByPage(1)}
            className={`absolute top-2 right-2 z-30 hidden size-11 items-center justify-center rounded-full bg-white transition-colors duration-150 hover:bg-[rgba(0,180,216,0.08)] lg:flex ${FOCUS_RING}`}
            style={{
              border: '1px solid rgba(0,100,130,0.2)',
              boxShadow: '0 2px 8px rgba(13,38,48,0.14)',
            }}
          >
            <ChevronRight style={{ width: 18, height: 18, color: '#0D2630' }} />
          </button>
        </>
      )}
      <div
        ref={scrollRef}
        className={`overflow-auto scroll-smooth ${className ?? ''}`}
        style={maxHeight !== undefined ? { maxHeight } : undefined}
      >
        <div style={{ minWidth }}>{children}</div>
      </div>
    </div>
  );
}
