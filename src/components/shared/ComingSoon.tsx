import Image from 'next/image';

export function ComingSoon({ title, description }: { title: string; description?: string }) {
  return (
    <main
      className="flex flex-1 flex-col items-center justify-center px-6 py-16"
      style={{ background: '#F5FBFD' }}
    >
      {/* ── Animated logo lockup ── */}
      <div
        className="cs-fade-up relative mb-8 flex items-center justify-center"
        style={{ width: 168, height: 168 }}
      >
        {/* Outer orbit — slow clockwise */}
        <div
          className="cs-spin absolute inset-0 rounded-full"
          style={{
            border: '2px solid transparent',
            borderTopColor: '#00B4D8',
            borderRightColor: 'rgba(0,180,216,0.25)',
          }}
        />

        {/* Inner orbit — slow counter-clockwise */}
        <div
          className="cs-spin-reverse absolute rounded-full"
          style={{
            inset: 12,
            border: '1.5px solid transparent',
            borderTopColor: 'rgba(0,180,216,0.45)',
            borderBottomColor: 'rgba(0,180,216,0.20)',
          }}
        />

        {/* Radial glow that breathes */}
        <div
          className="cs-glow absolute rounded-full"
          style={{
            inset: 24,
            background: 'radial-gradient(circle, rgba(0,180,216,0.18) 0%, transparent 72%)',
          }}
        />

        {/* Logo circle — gentle scale breathe */}
        <div
          className="cs-breathe relative flex items-center justify-center rounded-full bg-white"
          style={{
            width: 100,
            height: 100,
            boxShadow:
              '0 0 0 1px rgba(0,180,216,0.18), 0 4px 24px rgba(0,180,216,0.14), 0 12px 40px rgba(13,38,48,0.06)',
          }}
        >
          <Image
            src="/logo.png"
            alt="MYHxCare"
            width={60}
            height={60}
            className="object-contain"
            priority
          />
        </div>
      </div>

      {/* ── Module badge ── */}
      <span
        className="cs-fade-up-2 mb-5 rounded-full px-4 py-1 font-sans font-medium"
        style={{
          fontSize: 14,
          lineHeight: '22px',
          color: '#00B4D8',
          background: 'rgba(0,180,216,0.09)',
          border: '1px solid rgba(0,180,216,0.28)',
          letterSpacing: '0.01em',
        }}
      >
        {title}
      </span>

      {/* ── Heading ── */}
      <h1
        className="cs-fade-up-3 font-display font-semibold"
        style={{
          fontSize: 36,
          lineHeight: '44px',
          color: '#0D2630',
          marginBottom: 12,
          textAlign: 'center',
        }}
      >
        Coming Soon
      </h1>

      {/* ── Description ── */}
      <p
        className="cs-fade-up-4 max-w-[380px] text-center"
        style={{ fontSize: 16, lineHeight: '26px', color: '#4A7080' }}
      >
        {description ??
          'This module is under active development and will be available in an upcoming release.'}
      </p>

      {/* ── Bouncing dots ── */}
      <div className="cs-fade-up-5 mt-8 flex items-center gap-2.5">
        {([0, 0.22, 0.44] as const).map((delay, i) => (
          <div
            key={i}
            className="cs-dot rounded-full"
            style={{
              width: 8,
              height: 8,
              background: '#00B4D8',
              animationDelay: `${delay}s`,
            }}
          />
        ))}
      </div>
    </main>
  );
}
