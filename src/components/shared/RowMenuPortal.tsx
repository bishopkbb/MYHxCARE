'use client';

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';

/**
 * Portal-rendered dropdown for a table row's `⋮` actions menu.
 *
 * Every per-row action menu in this app used to render as an
 * `absolute top-full right-0` child of the row itself. That works for rows
 * with room below them, but the row's ancestor is always a horizontal-scroll
 * wrapper (`overflow-x-auto`) — and per the CSS spec, setting `overflow-x` to
 * anything but `visible` forces the browser to also compute `overflow-y` as
 * `auto`, not `visible`. So any row near the bottom of the table had its
 * dropdown silently clipped by that wrapper's own bottom edge: the menu
 * "opened" (state flipped, DOM existed) but rendered invisible/unclickable.
 * That's the "the bottom rows' action dots don't work" bug.
 *
 * The fix: portal the menu to `document.body` and position it with
 * `fixed` coordinates computed from the trigger's own bounding rect, so it
 * can never be clipped by a scrolling ancestor. It flips to open upward when
 * there isn't enough room below in the viewport, and closes on scroll/resize
 * (its computed position would otherwise go stale) or an outside click.
 */
export function RowMenuPortal({
  open,
  anchorRef,
  onClose,
  width = 224,
  align = 'right',
  children,
}: {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  width?: number;
  align?: 'left' | 'right';
  children: ReactNode;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    openUp: boolean;
  } | null>(null);

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) {
      setCoords(null);
      return;
    }
    const gap = 6;
    const rect = anchorRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUp = spaceBelow < 220 && spaceAbove > spaceBelow;
    const left = Math.max(
      8,
      align === 'right' ? Math.min(rect.right - width, window.innerWidth - width - 8) : rect.left,
    );
    setCoords(
      openUp
        ? { bottom: window.innerHeight - rect.top + gap, left, openUp: true }
        : { top: rect.bottom + gap, left, openUp: false },
    );
  }, [open, anchorRef, align, width]);

  useEffect(() => {
    if (!open) return;
    function close() {
      onClose();
    }
    function onMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (menuRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onClose();
    }
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    document.addEventListener('mousedown', onMouseDown);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
      document.removeEventListener('mousedown', onMouseDown);
    };
  }, [open, onClose, anchorRef]);

  if (!open || !coords) return null;

  return createPortal(
    <div
      ref={menuRef}
      className={`animate-in fade-in-0 zoom-in-95 fixed z-[100] overflow-hidden rounded-[10px] bg-white py-1.5 duration-150 ${
        coords.openUp ? 'slide-in-from-bottom-1' : 'slide-in-from-top-1'
      }`}
      style={{
        top: coords.top,
        bottom: coords.bottom,
        left: coords.left,
        width,
        border: '1px solid rgba(0,100,130,0.12)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
