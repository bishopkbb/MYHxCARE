'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

const STORAGE_KEY = 'myhxcare:avatarUrl';

function readStoredAvatar(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(STORAGE_KEY);
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
  // Lazy initializer reads localStorage synchronously on first render —
  // this provider (and every consumer of it) only ever mounts after
  // AuthGuard clears its loading state, well past hydration, so there's no
  // SSR/client markup mismatch to worry about here.
  const [avatarUrl, setAvatarUrlState] = useState<string | null>(readStoredAvatar);

  function setAvatarUrl(url: string | null) {
    setAvatarUrlState(url);
    try {
      if (url) localStorage.setItem(STORAGE_KEY, url);
      else localStorage.removeItem(STORAGE_KEY);
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
