'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

import { useAuth } from '@providers/AuthProvider';

// Scoped per logged-in user — a single global key would leak one user's
// uploaded photo onto every other mock identity in the same browser.
function storageKey(userId: string): string {
  return `myhxcare:avatarUrl:${userId}`;
}

// Pre-dates per-user scoping. Any photo left here belongs to whichever user
// uploaded it before this fix shipped — claimed by the first user to load
// afterward, then deleted so it can never leak to a second identity.
const LEGACY_STORAGE_KEY = 'myhxcare:avatarUrl';

function readStoredAvatar(userId: string | null): string | null {
  if (typeof window === 'undefined' || !userId) return null;
  try {
    const scoped = localStorage.getItem(storageKey(userId));
    if (scoped) return scoped;

    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) {
      localStorage.setItem(storageKey(userId), legacy);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      return legacy;
    }
    return null;
  } catch {
    // Storage unavailable (private browsing, disabled) — avatar just won't
    // persist across reloads; not worth surfacing to the user.
    return null;
  }
}

export type AvatarContextValue = {
  /** Data-URL of the user's uploaded photo, or null to fall back to initials. */
  avatarUrl: string | null;
  setAvatarUrl: (url: string | null) => void;
};

const AvatarContext = createContext<AvatarContextValue | null>(null);

export function useAvatar(): AvatarContextValue {
  const ctx = useContext(AvatarContext);
  if (!ctx) throw new Error('useAvatar must be used within <AvatarProvider>');
  return ctx;
}

export function AvatarProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [avatarUrl, setAvatarUrlState] = useState<string | null>(() => readStoredAvatar(userId));

  // Re-reads storage whenever the logged-in identity changes (login, logout,
  // or switching mock users without a full page reload) so one user's photo
  // never bleeds into another's session. A render-phase adjustment rather
  // than an effect — avoids a stale-avatar frame flashing before an effect
  // would fire.
  const [trackedUserId, setTrackedUserId] = useState(userId);
  if (userId !== trackedUserId) {
    setTrackedUserId(userId);
    setAvatarUrlState(readStoredAvatar(userId));
  }

  function setAvatarUrl(url: string | null) {
    setAvatarUrlState(url);
    if (!userId) return;
    try {
      if (url) localStorage.setItem(storageKey(userId), url);
      else localStorage.removeItem(storageKey(userId));
    } catch {
      // Quota exceeded or storage unavailable — the in-memory state above
      // still updates so the change is visible for the rest of the session.
    }
  }

  return (
    <AvatarContext.Provider value={{ avatarUrl, setAvatarUrl }}>{children}</AvatarContext.Provider>
  );
}

/**
 * Reads an image file, crops it to a square, and downscales it to a small
 * JPEG data URL. Keeps every avatar a consistent size and comfortably under
 * localStorage's quota regardless of the source photo's resolution.
 */
export function resizeImageToDataUrl(
  file: File,
  targetSize = 256,
  quality = 0.85,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = targetSize;
      canvas.height = targetSize;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Canvas context unavailable'));
        return;
      }
      const scale = Math.max(targetSize / img.width, targetSize / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (targetSize - w) / 2, (targetSize - h) / 2, w, h);
      URL.revokeObjectURL(objectUrl);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not read that image'));
    };
    img.src = objectUrl;
  });
}
