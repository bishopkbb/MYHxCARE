import type { LucideIcon } from 'lucide-react';

/**
 * Standard stat card — icon top-right, large black value in the accent
 * colour, top accent border. Used by dashboard-style summary rows.
 */
export function StatCard({
  icon: Icon,
  label,
  value,
  info,
  accent,
  iconBg,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  info: string;
  accent: string;
  iconBg: string;
  onClick?: () => void;
}) {
  return (
    <div
      className={`flex flex-col rounded-[12px] p-4 transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-md ${onClick ? 'cursor-pointer' : ''}`}
      style={{
        background: '#FFFFFF',
        border: `1px solid ${accent}`,
        borderTopWidth: '3px',
        boxShadow: '0px 1px 3px 0px rgba(0,0,0,0.05)',
      }}
      {...(onClick ? { role: 'button', tabIndex: 0, onClick } : {})}
    >
      <div className="flex items-start justify-between">
        <p className="text-base leading-6 font-semibold" style={{ color: '#25464D' }}>
          {label}
        </p>
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-[12px]"
          style={{ background: iconBg }}
        >
          <Icon style={{ width: 24, height: 24, color: accent }} />
        </div>
      </div>
      <p className="font-display mt-1.5 text-[30px] leading-9 font-black" style={{ color: accent }}>
        {value}
      </p>
      <p className="mt-1 text-sm leading-5.5" style={{ color: '#4A7080' }}>
        {info}
      </p>
    </div>
  );
}

/**
 * Compact stat card — circular icon, plain border, bold (not black) value.
 * Used where several cards need to sit tightly in a row (e.g. six-up
 * workforce summary rows) without the standard card's heavier accent border.
 */
export function StatCardCompact({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  value,
  info,
  infoColor,
}: {
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
  info: string;
  infoColor: string;
}) {
  return (
    <div
      className="flex flex-col rounded-[12px] p-4"
      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
    >
      <p className="font-sans" style={{ fontSize: 14, lineHeight: '20px', color: '#4A7080' }}>
        {label}
      </p>
      <div className="mt-2 flex items-center gap-2.5">
        <div
          className="flex size-8 shrink-0 items-center justify-center rounded-full"
          style={{ background: iconBg }}
        >
          <Icon style={{ width: 16, height: 16, color: iconColor }} />
        </div>
        <p
          className="font-display font-bold"
          style={{ fontSize: 26, lineHeight: '32px', color: '#0D2630' }}
        >
          {value}
        </p>
      </div>
      <p
        className="mt-1.5 font-sans font-medium"
        style={{ fontSize: 14, lineHeight: '20px', color: infoColor }}
      >
        {info}
      </p>
    </div>
  );
}

/**
 * Minimal stat card — label + big number only, no icon. Used for dense
 * secondary-metric rows (e.g. "Total Templates" / "Active" / "Times Applied").
 */
export function StatMini({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex flex-col rounded-[12px] p-4"
      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
    >
      <p style={{ fontSize: 14, color: '#4A7080' }}>{label}</p>
      <p
        className="font-display mt-1.5 font-bold"
        style={{ fontSize: 26, lineHeight: '32px', color: '#0D2630' }}
      >
        {value}
      </p>
    </div>
  );
}
