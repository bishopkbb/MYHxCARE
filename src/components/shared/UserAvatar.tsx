'use client';

import { useAvatar } from '@providers/AvatarProvider';

/**
 * Renders the current user's uploaded photo when one exists, falling back to
 * a colored initials badge otherwise. Used everywhere a user avatar appears
 * (sidebar, topbar, profile page) so an uploaded photo shows up consistently
 * across the app the moment it's set.
 */
export function UserAvatar({
  initials,
  size,
  bg = '#00B4D8',
  radius,
  textSize,
  className = '',
}: {
  initials: string;
  size: number;
  bg?: string;
  /** Corner radius in px. Defaults to size/2 (a full circle). */
  radius?: number;
  textSize?: number;
  className?: string;
}) {
  const { avatarUrl } = useAvatar();
  const borderRadius = radius ?? size / 2;

  if (avatarUrl) {
    return (
      // A user-uploaded data: URL, not a static/remote asset — next/image's
      // optimizer has nothing to do with it (no fixed source, can't be
      // cached or resized by its loader), so a plain <img> is correct here.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt=""
        className={`shrink-0 object-cover ${className}`}
        style={{ width: size, height: size, borderRadius }}
      />
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center font-sans font-semibold text-white ${className}`}
      style={{ width: size, height: size, borderRadius, background: bg, fontSize: textSize ?? 14 }}
    >
      {initials}
    </div>
  );
}
