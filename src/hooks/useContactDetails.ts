'use client';

import { useState } from 'react';

const STORAGE_KEY = 'myhxcare:contactDetails';

export type ContactDetails = { phone: string; email: string };

function readStored(): ContactDetails | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ContactDetails) : null;
  } catch {
    return null;
  }
}

/**
 * Shared phone/email state for the Profile and Settings pages. They're never
 * mounted at the same time, so a full Context (like the avatar needs, since
 * that shows in the sidebar/topbar/profile simultaneously) would be overkill
 * — a localStorage-backed hook keeps both pages reading and writing the same
 * value without one going stale relative to the other.
 */
export function useContactDetails(defaults: ContactDetails) {
  const [contact, setContactState] = useState<ContactDetails>(() => readStored() ?? defaults);

  function setContact(patch: ContactDetails) {
    setContactState(patch);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(patch));
    } catch {
      // Best-effort persistence only — in-memory state above still updates.
    }
  }

  return { contact, setContact };
}
