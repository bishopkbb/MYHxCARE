'use client';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

// Exact spec: 65×34 track, 30×30 knob, #00B4D8 / #D1D5DB. The visual track
// stays pinned to spec size; the button itself is 44px tall so the hit area
// clears the touch-target floor without inflating the switch's appearance
// (the "small-visual/full-hit-area" pattern). Shared between Settings and
// Profile's Preferences tab — same widget, same spec, two mount points.
export function PreferenceToggle({
  on,
  onToggle,
  ariaLabel,
}: {
  on: boolean;
  onToggle: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={ariaLabel}
      onClick={onToggle}
      className={`relative flex shrink-0 items-center justify-center ${FOCUS_RING}`}
      style={{ width: 65, height: 44, border: 'none', background: 'transparent', padding: 0 }}
    >
      <span
        className="absolute transition-colors duration-200"
        style={{
          width: 65,
          height: 34,
          borderRadius: 9999,
          background: on ? '#00B4D8' : '#D1D5DB',
        }}
      />
      <span
        className="absolute transition-[left] duration-200"
        style={{
          width: 30,
          height: 30,
          borderRadius: '50%',
          background: '#FFFFFF',
          top: '50%',
          marginTop: -15,
          left: on ? 65 - 30 - 3 : 3,
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }}
      />
    </button>
  );
}
