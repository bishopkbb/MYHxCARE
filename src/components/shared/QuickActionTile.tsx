import type { LucideIcon } from 'lucide-react';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

/**
 * Vertical icon-over-label quick-action tile — icon in a soft coloured
 * square, label centred below. Used by operational dashboards (Registration,
 * Medical Records) for their primary action grid.
 */
export function QuickActionTile({
  icon: Icon,
  label,
  iconBg,
  iconColor,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  iconBg: string;
  iconColor: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-2.5 rounded-[12px] p-4 transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
      style={{ border: '1px solid rgba(0,100,130,0.12)', background: '#FFFFFF' }}
    >
      <div
        className="flex size-12 shrink-0 items-center justify-center rounded-[12px]"
        style={{ background: iconBg }}
      >
        <Icon style={{ width: 22, height: 22, color: iconColor }} />
      </div>
      <span
        className="text-center font-sans font-medium"
        style={{ fontSize: 14, lineHeight: '18px', color: '#0D2630' }}
      >
        {label}
      </span>
    </button>
  );
}
