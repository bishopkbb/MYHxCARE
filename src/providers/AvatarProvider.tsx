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

/** Approximate decoded byte size of a base64 data URL, without decoding it.
 * Exported for `legacyRecordImageCompression.ts`'s own byte-budget loop —
 * same estimation, different resize algorithm (contain, not square crop). */
export function estimateDataUrlBytes(dataUrl: string): number {
  const commaIdx = dataUrl.indexOf(',');
  const base64Length = commaIdx === -1 ? dataUrl.length : dataUrl.length - commaIdx - 1;
  return Math.ceil((base64Length * 3) / 4);
}

/**
 * Reads an image file, crops it to a square, and downscales it to a small
 * JPEG data URL. Keeps every avatar a consistent size and comfortably under
 * localStorage's quota regardless of the source photo's resolution.
 *
 * When `maxBytes` is given, the (targetSize, quality) pair is only a
 * starting point: quality is stepped down first (cheap, keeps resolution),
 * then the target dimension (last resort), until the encoded result fits
 * under the budget or a floor that keeps the photo recognisable is hit. This
 * is what lets an upload always succeed regardless of the source file's
 * size, instead of rejecting large photos outright — a 12MB phone photo and
 * a 200KB one both end up comfortably under the limit.
 */
export function resizeImageToDataUrl(
  file: File,
  targetSize = 256,
  quality = 0.85,
  maxBytes?: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      function draw(size: number, q: number): string {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas context unavailable');
        const scale = Math.max(size / img.width, size / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        return canvas.toDataURL('image/jpeg', q);
      }

      try {
        let size = targetSize;
        let q = quality;
        let dataUrl = draw(size, q);

        if (maxBytes) {
          const MIN_QUALITY = 0.4;
          const MIN_SIZE = 96;
          while (estimateDataUrlBytes(dataUrl) > maxBytes && (q > MIN_QUALITY || size > MIN_SIZE)) {
            if (q > MIN_QUALITY) q = Math.max(MIN_QUALITY, q - 0.1);
            else size = Math.max(MIN_SIZE, Math.floor(size * 0.75));
            dataUrl = draw(size, q);
          }
        }

        URL.revokeObjectURL(objectUrl);
        resolve(dataUrl);
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        reject(err instanceof Error ? err : new Error('Could not process that image'));
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not read that image'));
    };
    img.src = objectUrl;
  });
}
