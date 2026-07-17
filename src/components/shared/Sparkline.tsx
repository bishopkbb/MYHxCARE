/**
 * Minimal inline trend line for stat cards — no axes, no labels, just the
 * shape of the trend. Renders a polyline through evenly-spaced data points,
 * scaled to fill the given width/height.
 */
export function Sparkline({
  data,
  color,
  width = 80,
  height = 32,
}: {
  data: number[];
  color: string;
  width?: number;
  height?: number;
}) {
  if (data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pad = 3; // keep the stroke from clipping at the top/bottom edge

  const points = data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = pad + (1 - (d - min) / range) * (height - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
