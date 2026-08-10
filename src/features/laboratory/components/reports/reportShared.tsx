'use client';

import type { LucideIcon } from 'lucide-react';
import { useRef, useState } from 'react';

import { AnimatedDonutChart } from '@components/shared/AnimatedDonutChart';
import { Tooltip } from '@components/shared/Tooltip';
import { formatHumanDate } from '@/utils/datetime';
import type { DailySeriesPoint } from '@/features/laboratory/__mocks__/laboratoryReportsFixtures';

/** Small building blocks shared by the Laboratory Reports tab components
 * under this folder — kept separate from LaboratoryReportsWorkspace.tsx's
 * own Summary-tab components so this shared surface can evolve without
 * touching the already-verified Summary tab. */

export const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

export function ReportStatCard({
  icon: Icon,
  iconColor,
  iconBg,
  label,
  value,
  info,
  infoColor = '#4A7080',
}: {
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  label: string;
  value: string | number;
  info?: string;
  infoColor?: string;
}) {
  return (
    <div
      className="flex flex-col rounded-[12px] p-4"
      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
    >
      <p
        className="font-sans"
        style={{ fontSize: 14, lineHeight: '20px', color: '#4A7080', minHeight: 40 }}
      >
        {label}
      </p>
      <div className="mt-2 flex items-center gap-2.5">
        <div
          className="flex size-9 shrink-0 items-center justify-center rounded-[10px]"
          style={{ background: iconBg }}
        >
          <Icon style={{ width: 18, height: 18, color: iconColor }} />
        </div>
        <p
          className="font-display font-bold"
          style={{ fontSize: 24, lineHeight: '30px', color: '#0D2630' }}
        >
          {value}
        </p>
      </div>
      {info && (
        <p
          className="mt-1.5 font-sans font-medium"
          style={{ fontSize: 14, lineHeight: '20px', color: infoColor }}
        >
          {info}
        </p>
      )}
    </div>
  );
}

export type BreakdownSlice = { label: string; value: number; color: string };

export function ReportDonutCard({
  title,
  breakdown,
  total,
  headerSlot,
  centerLabel,
  centerValue,
  footnote,
}: {
  title: string;
  breakdown: BreakdownSlice[];
  total: number;
  headerSlot?: React.ReactNode;
  centerLabel?: string;
  centerValue?: string | number;
  footnote?: string;
}) {
  return (
    <div
      className="rounded-[12px] p-4"
      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
          {title}
        </h2>
        {headerSlot}
      </div>
      <div className="mt-4 flex items-center gap-5">
        <AnimatedDonutChart
          breakdown={breakdown}
          total={total}
          size={132}
          ariaLabel={`${title} donut chart`}
          {...(centerLabel !== undefined ? { centerLabel } : {})}
          {...(centerValue !== undefined ? { centerValue } : {})}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {breakdown.map((d) => (
            <div key={d.label} className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="size-2.5 shrink-0 rounded-full" style={{ background: d.color }} />
                <Tooltip content={d.label}>
                  <span className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                    {d.label}
                  </span>
                </Tooltip>
              </div>
              <span
                className="shrink-0 font-sans font-medium whitespace-nowrap"
                style={{ fontSize: 14, color: '#0D2630' }}
              >
                {d.value.toLocaleString('en-GB')} (
                {((d.value / Math.max(1, total)) * 100).toFixed(1)}%)
              </span>
            </div>
          ))}
        </div>
      </div>
      {footnote && (
        <p className="mt-3" style={{ fontSize: 14, color: '#8A98A3' }}>
          {footnote}
        </p>
      )}
    </div>
  );
}

export function ReportEmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      <p style={{ fontSize: 14, color: '#8A98A3' }}>{message}</p>
    </div>
  );
}

export const DONUT_PALETTE = ['#2563EB', '#16A34A', '#7C3AED', '#F59E0B', '#0D9488', '#8A98A3'];

export function donutColorFor(index: number): string {
  return DONUT_PALETTE[index % DONUT_PALETTE.length]!;
}

/** Interactive daily-trend line, same hover-tooltip technique as the
 * Summary tab's Test Volume Trend chart, generalized for any daily series
 * (Samples Received, Results Published, ...) instead of just test counts. */
export function ReportTrendChart({
  data,
  color = '#00B4D8',
  unitLabel,
}: {
  data: DailySeriesPoint[];
  color?: string;
  unitLabel: string;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const max = Math.max(...data.map((d) => d.value), 1);
  const niceMax = Math.ceil(max / 100) * 100 || 100;
  const ticks = [0, niceMax * 0.25, niceMax * 0.5, niceMax * 0.75, niceMax];
  const W = 900;
  const H = 200;
  const stepX = data.length > 1 ? W / (data.length - 1) : 0;
  const points = data.map((d, i) => ({
    x: data.length > 1 ? i * stepX : W / 2,
    y: H - (d.value / niceMax) * H,
  }));
  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
  const xLabelIdx = [0, 4, 9, 14, 19, 24, 29].filter((v) => v < data.length);

  function handleMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg || data.length === 0) return;
    const rect = svg.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * W;
    const idx = Math.max(0, Math.min(data.length - 1, Math.round(relX / stepX)));
    setHoverIdx(idx);
  }

  const hovered = hoverIdx !== null ? data[hoverIdx] : null;
  const hoveredPoint = hoverIdx !== null ? points[hoverIdx] : null;

  return (
    <div className="mt-2 flex gap-3" style={{ height: 240 }}>
      <div className="flex shrink-0 flex-col justify-between pb-6 text-right" style={{ width: 42 }}>
        {[...ticks].reverse().map((t) => (
          <span key={t} className="font-sans" style={{ fontSize: 14, color: '#8A98A3' }}>
            {Math.round(t)}
          </span>
        ))}
      </div>
      <div className="relative min-w-0 flex-1">
        <div
          className="absolute inset-x-0 top-0 flex flex-col justify-between"
          style={{ height: 'calc(100% - 24px)' }}
        >
          {[...ticks].reverse().map((t) => (
            <div key={t} style={{ borderTop: '1px dashed rgba(0,100,130,0.15)' }} />
          ))}
        </div>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="absolute inset-x-0 top-0 cursor-crosshair"
          style={{ height: 'calc(100% - 24px)', width: '100%' }}
          onMouseMove={handleMove}
          onMouseLeave={() => setHoverIdx(null)}
        >
          <path
            d={pathD}
            fill="none"
            stroke={color}
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />
          {hoveredPoint && (
            <line
              x1={hoveredPoint.x}
              y1={0}
              x2={hoveredPoint.x}
              y2={H}
              stroke="rgba(0,100,130,0.25)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          )}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={hoverIdx === i ? 5 : 3}
              fill={color}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
        {hovered && hoveredPoint && (
          <div
            className="pointer-events-none absolute z-10 rounded-[10px] px-3 py-2 whitespace-nowrap"
            style={{
              left: `${(hoveredPoint.x / W) * 100}%`,
              top: Math.max(0, (hoveredPoint.y / H) * (240 - 24) - 56),
              transform: 'translateX(-50%)',
              background: '#0D2630',
              boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
            }}
          >
            <p style={{ fontSize: 14, color: '#B8D8E0' }}>{formatHumanDate(hovered.date)}</p>
            <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#FFFFFF' }}>
              {hovered.value.toLocaleString('en-GB')} {unitLabel}
            </p>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 flex justify-between" style={{ height: 24 }}>
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
