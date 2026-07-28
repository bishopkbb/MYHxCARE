'use client';

import { useEffect, useState } from 'react';

/**
 * Shared donut chart — arcs draw in from empty on mount and transition
 * smoothly whenever `breakdown` changes (e.g. a status filter narrowing a
 * queue), rather than snapping straight to the new shape. Originally built
 * for the Prescription Queue's "Queue Overview" panel; reused wherever a
 * proportional breakdown needs the same treatment.
 */
export function AnimatedDonutChart({
  breakdown,
  total,
  size = 120,
  ariaLabel = 'Breakdown donut chart',
}: {
  breakdown: { label: string; value: number; color: string }[];
  total: number;
  size?: number;
  ariaLabel?: string;
}) {
  const safeTotal = total || 1;
  const radius = 54;
  const strokeWidth = 20;
  const circumference = 2 * Math.PI * radius;
  const gapPx = 3;

  type Seg = (typeof breakdown)[number] & { length: number; offset: number };
  const { segments } = breakdown.reduce<{ cumulative: number; segments: Seg[] }>(
    (acc, d) => {
      const rawLength = (d.value / safeTotal) * circumference;
      const offset = -(acc.cumulative / safeTotal) * circumference;
      return {
        cumulative: acc.cumulative + d.value,
        segments: [...acc.segments, { ...d, length: Math.max(0, rawLength - gapPx), offset }],
      };
    },
    { cumulative: 0, segments: [] },
  );

  const [animateIn, setAnimateIn] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setAnimateIn(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      className="relative flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 128 128"
        style={{ width: size, height: size }}
        role="img"
        aria-label={ariaLabel}
      >
        <g transform="rotate(-90 64 64)">
          {segments.map((seg) => (
            <circle
              key={seg.label}
              cx={64}
              cy={64}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeLinecap="butt"
              strokeDasharray={`${animateIn ? seg.length : 0} ${circumference}`}
              strokeDashoffset={seg.offset}
              style={{
                transition: 'stroke-dasharray 700ms ease-out, stroke-dashoffset 700ms ease-out',
              }}
            />
          ))}
        </g>
      </svg>
      <div className="animate-in fade-in-0 zoom-in-95 absolute flex flex-col items-center duration-500">
        <span className="font-display font-bold" style={{ fontSize: 20, color: '#0D2630' }}>
          {total}
        </span>
        <span style={{ fontSize: 14, color: '#8A98A3' }}>Total</span>
      </div>
    </div>
  );
}
