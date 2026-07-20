'use client';

import { useEffect, useState } from 'react';

export type VitalChartPoint = { label: string; value: number };

/**
 * Fixed-clinical-range trend line (SVG path, animated draw-in). Unlike the
 * report pages' LineTrendChart, the y-domain is an explicit clinical range
 * (e.g. BP 90-160) rather than an auto-computed "nice" max — vitals have
 * known bounds, they shouldn't rescale per dataset.
 */
export function VitalTrendChart({
  data,
  color,
  min,
  max,
}: {
  data: VitalChartPoint[];
  color: string;
  min: number;
  max: number;
}) {
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const W = 700;
  const H = 100;
  const range = max - min || 1;
  const toY = (v: number) => H - ((Math.min(max, Math.max(min, v)) - min) / range) * H;
  const stepX = data.length > 1 ? W / (data.length - 1) : W;
  const points = data.map((d, i) => ({ x: i * stepX, y: toY(d.value) }));
  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  const xLabelIdx = Array.from(
    new Set([
      0,
      ...[1, 2, 3, 4, 5].map((n) => Math.round((data.length - 1) * (n / 6))),
      data.length - 1,
    ]),
  ).filter((v) => v >= 0 && v < data.length);

  return (
    <div className="flex gap-3" style={{ height: 96 }}>
      <div className="flex shrink-0 flex-col justify-between pb-5 text-right" style={{ width: 34 }}>
        <span className="font-sans" style={{ fontSize: 14, color: '#8A98A3' }}>
          {max}
        </span>
        <span className="font-sans" style={{ fontSize: 14, color: '#8A98A3' }}>
          {min}
        </span>
      </div>
      <div className="relative min-w-0 flex-1">
        <div
          className="absolute inset-x-0 top-0 flex flex-col justify-between"
          style={{ height: 'calc(100% - 20px)' }}
        >
          <div style={{ borderTop: '1px dashed rgba(0,100,130,0.15)' }} />
          <div style={{ borderTop: '1px dashed rgba(0,100,130,0.15)' }} />
        </div>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="absolute inset-x-0 top-0"
          style={{ height: 'calc(100% - 20px)', width: '100%' }}
        >
          <path
            d={pathD}
            fill="none"
            stroke={color}
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
            style={{
              strokeDasharray: 1400,
              strokeDashoffset: animate ? 0 : 1400,
              transition: 'stroke-dashoffset 0.9s cubic-bezier(0.22,1,0.36,1)',
            }}
          />
          {points.length > 0 && (
            <circle
              cx={points[points.length - 1]!.x}
              cy={points[points.length - 1]!.y}
              r={4}
              fill={color}
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>
        <div className="absolute inset-x-0 bottom-0 flex justify-between" style={{ height: 20 }}>
          {xLabelIdx.map((i) => (
            <span key={i} className="font-sans" style={{ fontSize: 14, color: '#8A98A3' }}>
              {data[i]?.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
