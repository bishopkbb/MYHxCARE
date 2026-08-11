/**
 * Live emergency clinical notes, per patient — saving a draft or signing a
 * note on the Clinical Notes screen is a real hospital event, not a
 * dead-end toast. `useSyncExternalStore` module store, same shape as
 * `medicationOrderStore.ts` / `procedureStore.ts`.
 *
 * `useLatestWorkingDiagnoses` is the real source for "what's this patient's
 * working diagnosis" — Emergency Procedures' Active Diagnoses panel checks
 * this first and only falls back to its own deterministic placeholder when
 * no note has recorded one yet (safe-merge-at-read-time).
 */
'use client';

import { useSyncExternalStore } from 'react';

export type NoteStatus = 'Draft' | 'Signed';

export type NoteAttachment = {
  id: string;
  name: string;
  category: string;
  uploadedBy: string;
  uploadedAt: string; // ISO
};

export type ClinicalNoteSections = {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  freeText: string;
};

export type EmergencyClinicalNote = {
  id: string;
  entryId: string;
  noteType: string;
  dateTime: string; // ISO, clinically-relevant note date/time (editable)
  author: string;
  visibleToAllProviders: boolean;
  sections: ClinicalNoteSections;
  workingDiagnoses: string[];
  planItems: string[];
  favorite: boolean;
  attachments: NoteAttachment[];
  status: NoteStatus;
  createdBy: string;
  createdAt: string; // ISO
  lastEditedBy: string;
  lastEditedAt: string; // ISO
};

export const NOTE_TYPE_OPTIONS = [
  'Progress Note',
  'Consultation Note',
  'Procedure Note',
  'Nursing Note',
  'Discharge Note',
];

function seedNotesFor(entryId: string, author: string, now: number): EmergencyClinicalNote[] {
  const empty: ClinicalNoteSections = {
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
    freeText: '',
  };
  return [
    {
      id: `${entryId}-note-1`,
      entryId,
      noteType: 'Triage Note',
      dateTime: new Date(now - 28 * 60_000).toISOString(),
      author: 'Nurse Mary Ada',
      visibleToAllProviders: true,
      sections: {
        ...empty,
        subjective:
          '<p>Patient triaged on arrival. Chief complaint: chest pain and shortness of breath since this morning.</p>',
      },
      workingDiagnoses: [],
      planItems: [],
      favorite: false,
      attachments: [],
      status: 'Signed',
      createdBy: 'Nurse Mary Ada',
      createdAt: new Date(now - 28 * 60_000).toISOString(),
      lastEditedBy: 'Nurse Mary Ada',
      lastEditedAt: new Date(now - 28 * 60_000).toISOString(),
    },
    {
      id: `${entryId}-note-2`,
      entryId,
      noteType: 'Initial Assessment',
      dateTime: new Date(now - 23 * 60_000).toISOString(),
      author,
      visibleToAllProviders: true,
      sections: {
        ...empty,
        subjective:
          '<p>Central chest pain, pressure-like, non-radiating, associated with shortness of breath and sweating.</p>',
        objective: '<p>Vitals reviewed. Patient diaphoretic, mild distress.</p>',
      },
      workingDiagnoses: ['Acute Coronary Syndrome (ACS)'],
      planItems: ['ECG 12-lead — STAT', 'Oxygen via nasal cannula 2L/min'],
      favorite: false,
      attachments: [
        {
          id: `${entryId}-note-2-att-1`,
          name: 'Initial Assessment Form.pdf',
          category: 'Procedure Report',
          uploadedBy: author,
          uploadedAt: new Date(now - 23 * 60_000).toISOString(),
        },
      ],
      status: 'Signed',
      createdBy: author,
      createdAt: new Date(now - 23 * 60_000).toISOString(),
      lastEditedBy: author,
      lastEditedAt: new Date(now - 23 * 60_000).toISOString(),
    },
    {
      id: `${entryId}-note-3`,
      entryId,
      noteType: 'ECG Interpretation',
      dateTime: new Date(now - 16 * 60_000).toISOString(),
      author,
      visibleToAllProviders: true,
      sections: {
        ...empty,
        assessment:
          '<p>ST-segment changes noted in leads II, III, aVF. Findings discussed with cardiology.</p>',
      },
      workingDiagnoses: ['Acute Coronary Syndrome (ACS)'],
      planItems: [],
      favorite: false,
      attachments: [
        {
          id: `${entryId}-note-3-att-1`,
          name: 'ECG 12-Lead Report.pdf',
          category: 'Imaging',
          uploadedBy: author,
          uploadedAt: new Date(now - 16 * 60_000).toISOString(),
        },
      ],
      status: 'Signed',
      createdBy: author,
      createdAt: new Date(now - 16 * 60_000).toISOString(),
      lastEditedBy: author,
      lastEditedAt: new Date(now - 16 * 60_000).toISOString(),
    },
    {
      id: `${entryId}-note-4`,
      entryId,
      noteType: 'Nursing Note',
      dateTime: new Date(now - 12 * 60_000).toISOString(),
      author: 'Nurse Mary Ada',
      visibleToAllProviders: true,
      sections: {
        ...empty,
        subjective: '<p>Patient repositioned, IV line patent, vitals stable since last check.</p>',
      },
      workingDiagnoses: [],
      planItems: [],
      favorite: false,
      attachments: [],
      status: 'Signed',
      createdBy: 'Nurse Mary Ada',
      createdAt: new Date(now - 12 * 60_000).toISOString(),
      lastEditedBy: 'Nurse Mary Ada',
      lastEditedAt: new Date(now - 12 * 60_000).toISOString(),
    },
    {
      id: `${entryId}-note-5`,
      entryId,
      noteType: 'Progress Note',
      dateTime: new Date(now - 8 * 60_000).toISOString(),
      author,
      visibleToAllProviders: true,
      sections: {
        ...empty,
        assessment:
          '<p>Troponin I result reviewed — mildly elevated. Continuing cardiac workup.</p>',
      },
      workingDiagnoses: ['Acute Coronary Syndrome (ACS)'],
      planItems: ['Troponin I — STAT'],
      favorite: false,
      attachments: [
        {
          id: `${entryId}-note-5-att-1`,
          name: 'Troponin Result.pdf',
          category: 'Other',
          uploadedBy: author,
          uploadedAt: new Date(now - 8 * 60_000).toISOString(),
        },
      ],
      status: 'Signed',
      createdBy: author,
      createdAt: new Date(now - 8 * 60_000).toISOString(),
      lastEditedBy: author,
      lastEditedAt: new Date(now - 8 * 60_000).toISOString(),
    },
    {
      id: `${entryId}-note-6`,
      entryId,
      noteType: 'Consultation Note',
      dateTime: new Date(now - 5 * 60_000).toISOString(),
      author: 'Dr. Adeyemi Bello',
      visibleToAllProviders: true,
      sections: {
        ...empty,
        assessment: '<p>Cardiology consulted. Agrees with working diagnosis and plan.</p>',
      },
      workingDiagnoses: ['Acute Coronary Syndrome (ACS)'],
      planItems: [],
      favorite: false,
      attachments: [],
      status: 'Signed',
      createdBy: 'Dr. Adeyemi Bello',
      createdAt: new Date(now - 5 * 60_000).toISOString(),
      lastEditedBy: 'Dr. Adeyemi Bello',
      lastEditedAt: new Date(now - 5 * 60_000).toISOString(),
    },
    {
      id: `${entryId}-note-7`,
      entryId,
      noteType: 'Procedure Note',
      dateTime: new Date(now - 3 * 60_000).toISOString(),
      author,
      visibleToAllProviders: true,
      sections: { ...empty, plan: '<p>Aspirin 300mg chewable given per STAT order.</p>' },
      workingDiagnoses: [],
      planItems: ['Aspirin 300mg chewable — STAT'],
      favorite: false,
      attachments: [],
      status: 'Signed',
      createdBy: author,
      createdAt: new Date(now - 3 * 60_000).toISOString(),
      lastEditedBy: author,
      lastEditedAt: new Date(now - 3 * 60_000).toISOString(),
    },
    {
      id: `${entryId}-note-8`,
      entryId,
      noteType: 'Progress Note',
      dateTime: new Date(now).toISOString(),
      author,
      visibleToAllProviders: false,
      sections: {
        subjective:
          '<p><b>Chief complaint:</b> Chest pain and shortness of breath since this morning.</p><p><b>History of present illness:</b><br>Patient reports central chest pain that started while walking. Pain is pressure-like, non-radiating, associated with shortness of breath and sweating. No history of cough or fever.</p><p><b>Review of systems:</b><br>No headache, no dizziness, no abdominal pain, no vomiting.</p>',
        objective: '',
        assessment: '',
        plan: '',
        freeText: '',
      },
      workingDiagnoses: ['Acute Coronary Syndrome (ACS)', 'Hypertension'],
      planItems: [
        'ECG 12-lead — STAT',
        'Troponin I — STAT',
        'Oxygen via nasal cannula 2L/min',
        'Aspirin 300mg chewable — STAT',
        'Monitor vitals and cardiac rhythm',
      ],
      favorite: false,
      attachments: [],
      status: 'Draft',
      createdBy: author,
      createdAt: new Date(now).toISOString(),
      lastEditedBy: author,
      lastEditedAt: new Date(now).toISOString(),
    },
  ];
}

const notesByEntry = new Map<string, EmergencyClinicalNote[]>();
const seededEntryIds = new Set<string>();
const EMPTY_NOTES: EmergencyClinicalNote[] = [];

function ensureSeeded(entryId: string, author: string) {
  if (seededEntryIds.has(entryId)) return;
  seededEntryIds.add(entryId);
  notesByEntry.set(entryId, seedNotesFor(entryId, author, Date.now()));
}

const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((listener) => listener());
}
function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export type SaveNoteInput = {
  entryId: string;
  noteId: string | null;
  noteType: string;
  dateTime: string;
  author: string;
  visibleToAllProviders: boolean;
  sections: ClinicalNoteSections;
  workingDiagnoses: string[];
  planItems: string[];
  attachments: NoteAttachment[];
};

function upsertNote(input: SaveNoteInput, status: NoteStatus): EmergencyClinicalNote {
  const existing = notesByEntry.get(input.entryId) ?? [];
  const now = new Date().toISOString();
  const priorIndex = input.noteId ? existing.findIndex((n) => n.id === input.noteId) : -1;
  const prior = priorIndex >= 0 ? existing[priorIndex] : undefined;

  const record: EmergencyClinicalNote = {
    id: prior?.id ?? `${input.entryId}-note-${Date.now()}`,
    entryId: input.entryId,
    noteType: input.noteType,
    dateTime: input.dateTime,
    author: input.author,
    visibleToAllProviders: input.visibleToAllProviders,
    sections: input.sections,
    workingDiagnoses: input.workingDiagnoses,
    planItems: input.planItems,
    favorite: prior?.favorite ?? false,
    attachments: input.attachments,
    status,
    createdBy: prior?.createdBy ?? input.author,
    createdAt: prior?.createdAt ?? now,
    lastEditedBy: input.author,
    lastEditedAt: now,
  };

  const next =
    priorIndex >= 0
      ? existing.map((n, i) => (i === priorIndex ? record : n))
      : [record, ...existing];
  notesByEntry.set(input.entryId, next);
  emit();
  return record;
}

export function saveDraftNote(input: SaveNoteInput): EmergencyClinicalNote {
  return upsertNote(input, 'Draft');
}

export function signNote(input: SaveNoteInput): EmergencyClinicalNote {
  return upsertNote(input, 'Signed');
}

export function discardDraftNote(entryId: string, noteId: string): void {
  const existing = notesByEntry.get(entryId);
  if (!existing) return;
  notesByEntry.set(
    entryId,
    existing.filter((n) => !(n.id === noteId && n.status === 'Draft')),
  );
  emit();
}

export function toggleNoteFavorite(entryId: string, noteId: string): void {
  const existing = notesByEntry.get(entryId);
  if (!existing) return;
  notesByEntry.set(
    entryId,
    existing.map((n) => (n.id === noteId ? { ...n, favorite: !n.favorite } : n)),
  );
  emit();
}

function getSnapshot(entryId: string, author: string): EmergencyClinicalNote[] {
  ensureSeeded(entryId, author);
  return notesByEntry.get(entryId) ?? [];
}

export function useClinicalNotes(
  entryId: string | undefined,
  defaultAuthor: string,
): EmergencyClinicalNote[] {
  return useSyncExternalStore(
    subscribe,
    () => (entryId ? getSnapshot(entryId, defaultAuthor) : EMPTY_NOTES),
    () => EMPTY_NOTES,
  );
}

/** Real source for "what's this patient's working diagnosis" — the most
 * recent note (by dateTime) that has recorded at least one. Undefined when
 * no note has recorded one yet, so callers can fall back to a placeholder. */
export function useLatestWorkingDiagnoses(entryId: string | undefined): string[] | undefined {
  const notes = useClinicalNotes(entryId, '');
  const withDiagnoses = notes
    .filter((n) => n.workingDiagnoses.length > 0)
    .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
  return withDiagnoses[0]?.workingDiagnoses;
}
