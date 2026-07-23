'use client';

import {
  AlertTriangle,
  Heart,
  MoreVertical,
  NotebookPen,
  Paperclip,
  Pencil,
  Pill as PillIcon,
  Scissors,
  Search,
  Trash2,
  Eye as EyeIcon,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { AllergyBanner } from '@components/clinical/AllergyBanner';
import { FormField } from '@components/shared/FormField';
import { FormSelect } from '@components/shared/FormSelect';
import { ModalLoadingFallback } from '@components/shared/ModalLoadingFallback';
import { PermissionGate } from '@components/shared/PermissionGate';
import { RowMenuPortal } from '@components/shared/RowMenuPortal';
import { PERMISSIONS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { formatHumanDate, formatTime, isSameDay, isToday } from '@/utils/datetime';
import { type NursePatient } from '@/features/nursing/__mocks__/myPatientsFixtures';
import { getPatientRecord } from '@/features/nursing/__mocks__/patientRecordFixtures';
import {
  CARE_PLAN_GOALS,
  NOTE_ATTACHMENTS,
  NOTE_TYPES,
  NOTE_TYPE_CFG,
  NURSING_NOTES,
  QUICK_NOTE_TEMPLATES,
  type NoteType,
  type NursingNote,
  type QuickNoteTemplate,
} from '@/features/nursing/__mocks__/nursingNotesFixtures';
import { NursePatientPicker } from './NursePatientPicker';

const ManageNoteTemplatesModal = dynamic(
  () => import('./ManageNoteTemplatesModal').then((m) => m.ManageNoteTemplatesModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

const NoteAttachmentsModal = dynamic(
  () => import('./NoteAttachmentsModal').then((m) => m.NoteAttachmentsModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const NOTE_TYPE_OPTIONS = NOTE_TYPES.map((t) => ({ value: t, label: t }));
const CARE_PLAN_OPTIONS = CARE_PLAN_GOALS.map((g) => ({ value: g, label: g }));

const TEMPLATE_ICON: Record<string, typeof Heart> = {
  'tpl-pain': Heart,
  'tpl-observation': EyeIcon,
  'tpl-postop': Scissors,
  'tpl-general': NotebookPen,
  'tpl-medication': PillIcon,
};

type TabKey = 'all' | 'mine' | 'progress' | 'shift' | 'care' | 'education';
const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: 'Notes List' },
  { key: 'mine', label: 'My Notes' },
  { key: 'progress', label: 'Progress Notes' },
  { key: 'shift', label: 'Shift Notes' },
  { key: 'care', label: 'Care Notes' },
  { key: 'education', label: 'Patient Education' },
];

type DateRangeKey = 'all' | 'today' | '7d' | '30d' | 'week';
const DATE_RANGE_OPTIONS: { value: DateRangeKey; label: string }[] = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: 'week', label: 'This Week' },
];

const AVATAR_PALETTE = ['#00B4D8', '#8B5CF6', '#22C55E', '#F59E0B', '#EF4444', '#6366F1'];

function initialsOf(name: string): string {
  const parts = name.replace(/[.,]/g, '').split(' ').filter(Boolean);
  return parts
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}

function avatarColorFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length]!;
}

function noteDayLabel(iso: string): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (isToday(iso)) return 'Today';
  if (isSameDay(iso, yesterday)) return 'Yesterday';
  return formatHumanDate(iso);
}

function noteTimeLabel(iso: string): string {
  return `${noteDayLabel(iso)}, ${formatTime(iso)}`;
}

function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function emptyDraft() {
  return {
    noteType: '' as NoteType | '',
    dateTime: toLocalInputValue(new Date()),
    observation: '',
    intervention: '',
    patientResponse: '',
    addToCarePlan: false,
    carePlanGoal: '',
  };
}

function RowMenu({
  open,
  onToggle,
  onEdit,
  onDelete,
}: {
  open: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={onToggle}
        aria-label="More actions"
        className={`flex size-11 shrink-0 items-center justify-center rounded-[10px] transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
      >
        <MoreVertical style={{ width: 16, height: 16, color: '#4A7080' }} />
      </button>
      <RowMenuPortal open={open} anchorRef={buttonRef} onClose={onToggle} width={176}>
        <button
          type="button"
          onClick={onEdit}
          className={`flex w-full items-center gap-2 px-3.5 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
          style={{ fontSize: 14, color: '#0D2630' }}
        >
          <Pencil style={{ width: 15, height: 15, color: '#00B4D8' }} />
          Edit Note
        </button>
        <button
          type="button"
          onClick={onDelete}
          className={`flex w-full items-center gap-2 px-3.5 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
          style={{ fontSize: 14, color: '#0D2630' }}
        >
          <Trash2 style={{ width: 15, height: 15, color: '#EF4444' }} />
          Delete Note
        </button>
      </RowMenuPortal>
    </div>
  );
}

export function NursingNotesWorkspace() {
  const [selectedPatient, setSelectedPatient] = useState<NursePatient | null>(null);

  if (!selectedPatient) {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
          <div className="mx-auto max-w-[1200px] px-4 py-4 sm:px-6 sm:py-5">
            <h1
              className="font-display font-semibold"
              style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
            >
              Nursing Notes
            </h1>
            <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
              View and add chronological nursing documentation.
            </p>
            <div className="mt-5">
              <NursePatientPicker
                onSelect={setSelectedPatient}
                description="Choose a patient from your assigned roster to view or add nursing notes."
                actionVerb="nursing notes"
              />
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <PatientNursingNotesPanel
      key={selectedPatient.id}
      patient={selectedPatient}
      onChangePatient={() => setSelectedPatient(null)}
    />
  );
}

function PatientNursingNotesPanel({
  patient,
  onChangePatient,
}: {
  patient: NursePatient;
  onChangePatient: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const nurseName = user?.name ?? 'Nurse';
  const record = getPatientRecord(patient.id)!;

  const [notes, setNotes] = useState<NursingNote[]>(NURSING_NOTES);
  const [templates, setTemplates] = useState<QuickNoteTemplate[]>(QUICK_NOTE_TEMPLATES);
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [search, setSearch] = useState('');
  const [noteTypeFilter, setNoteTypeFilter] = useState('all');
  const [authorFilter, setAuthorFilter] = useState('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<DateRangeKey>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [showAttachmentsModal, setShowAttachmentsModal] = useState(false);
  const [nowMs, setNowMs] = useState(0);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [draft, setDraft] = useState(emptyDraft());

  const formRef = useRef<HTMLDivElement>(null);
  const observationRef = useRef<HTMLTextAreaElement>(null);

  const authorOptions = useMemo(() => {
    const names = Array.from(new Set(notes.map((n) => n.authorName)));
    return [{ value: 'all', label: 'All Authors' }, ...names.map((n) => ({ value: n, label: n }))];
  }, [notes]);

  const noteTypeFilterOptions = [{ value: 'all', label: 'All Types' }, ...NOTE_TYPE_OPTIONS];

  function scrollToForm() {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function applyTemplate(tpl: QuickNoteTemplate) {
    setEditingNoteId(null);
    setDraft({ ...emptyDraft(), noteType: tpl.noteType, observation: tpl.starterText });
    scrollToForm();
    observationRef.current?.focus();
  }

  function startEdit(note: NursingNote) {
    setEditingNoteId(note.id);
    setDraft({
      noteType: note.noteType,
      dateTime: toLocalInputValue(new Date(note.time)),
      observation: note.observation,
      intervention: note.intervention ?? '',
      patientResponse: note.patientResponse ?? '',
      addToCarePlan: Boolean(note.carePlanGoal),
      carePlanGoal: note.carePlanGoal ?? '',
    });
    setOpenMenuId(null);
    scrollToForm();
  }

  function deleteNote(id: string) {
    const note = notes.find((n) => n.id === id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
    setOpenMenuId(null);
    if (note) toast.success('Note deleted', `${note.noteType} entry removed.`);
    if (editingNoteId === id) {
      setEditingNoteId(null);
      setDraft(emptyDraft());
    }
  }

  function saveNote(isDraft: boolean) {
    if (!draft.noteType || !draft.observation.trim()) {
      toast.info('Missing information', 'Note Type and Observation / Note are required.');
      return;
    }
    const timeIso = new Date(draft.dateTime).toISOString();
    const interventionTrimmed = draft.intervention.trim();
    const patientResponseTrimmed = draft.patientResponse.trim();
    const carePlanGoal = draft.addToCarePlan ? draft.carePlanGoal : '';
    const optionalFields = {
      ...(interventionTrimmed ? { intervention: interventionTrimmed } : {}),
      ...(patientResponseTrimmed ? { patientResponse: patientResponseTrimmed } : {}),
      ...(carePlanGoal ? { carePlanGoal } : {}),
    };

    if (editingNoteId) {
      setNotes((prev) =>
        prev.map((n) => {
          if (n.id !== editingNoteId) return n;
          const { intervention: _i, patientResponse: _p, carePlanGoal: _c, ...rest } = n;
          return {
            ...rest,
            noteType: draft.noteType as NoteType,
            time: timeIso,
            observation: draft.observation.trim(),
            isDraft,
            ...optionalFields,
          };
        }),
      );
      toast.success('Note updated', 'Changes saved to this nursing note.');
    } else {
      const newNote: NursingNote = {
        id: `note-${Date.now()}`,
        time: timeIso,
        authorName: nurseName,
        authorId: '',
        noteType: draft.noteType as NoteType,
        observation: draft.observation.trim(),
        isDraft,
        ...optionalFields,
      };
      setNotes((prev) => [newNote, ...prev]);
      toast.success(
        isDraft ? 'Draft saved' : 'Note saved',
        `${draft.noteType} added for ${patient.patientName}.`,
      );
    }
    setEditingNoteId(null);
    setDraft(emptyDraft());
  }

  useEffect(() => {
    const t = setTimeout(() => setNowMs(Date.now()), 0);
    return () => clearTimeout(t);
  }, [dateRangeFilter]);

  const filtered = useMemo(() => {
    const now = nowMs;
    return notes.filter((n) => {
      if (activeTab === 'mine' && n.authorName !== nurseName) return false;
      if (activeTab === 'progress' && n.noteType !== 'Progress Note') return false;
      if (activeTab === 'shift' && n.noteType !== 'Shift Note') return false;
      if (activeTab === 'care' && n.noteType !== 'Care Note') return false;
      if (activeTab === 'education' && n.noteType !== 'Patient Education') return false;

      if (noteTypeFilter !== 'all' && n.noteType !== noteTypeFilter) return false;
      if (authorFilter !== 'all' && n.authorName !== authorFilter) return false;

      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const haystack =
          `${n.observation} ${n.intervention ?? ''} ${n.patientResponse ?? ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      if (dateRangeFilter !== 'all') {
        const noteTime = new Date(n.time).getTime();
        const diffDays = (now - noteTime) / 86_400_000;
        if (dateRangeFilter === 'today' && !isToday(n.time)) return false;
        if (dateRangeFilter === '7d' && diffDays > 7) return false;
        if (dateRangeFilter === '30d' && diffDays > 30) return false;
        if (dateRangeFilter === 'week' && diffDays > 7) return false;
      }

      return true;
    });
  }, [notes, activeTab, noteTypeFilter, authorFilter, search, dateRangeFilter, nurseName, nowMs]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * rowsPerPage;
  const pageRows = filtered.slice(pageStart, pageStart + rowsPerPage);

  const lastNote = notes[0];
  const allergyNames = record.allergies.map((a) => a.substance).join(', ');

  function handleApplyFilters() {
    setCurrentPage(1);
  }

  const hasActiveFilters =
    search.trim() !== '' ||
    noteTypeFilter !== 'all' ||
    authorFilter !== 'all' ||
    dateRangeFilter !== 'all';

  function clearFilters() {
    setSearch('');
    setNoteTypeFilter('all');
    setAuthorFilter('all');
    setDateRangeFilter('all');
    setCurrentPage(1);
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto max-w-[1200px] px-4 py-4 sm:px-6 sm:py-5">
          {/* ── Breadcrumb ──────────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-1.5" style={{ fontSize: 14 }}>
            <button
              type="button"
              onClick={() => router.push(ROUTES.nurseMyPatients)}
              className={`font-sans transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
              style={{ color: '#4A7080' }}
            >
              My Patients
            </button>
            <span style={{ color: '#8A98A3' }}>/</span>
            <button
              type="button"
              onClick={() => router.push(ROUTES.nursePatientRecord(patient.id))}
              className={`font-sans transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
              style={{ color: '#4A7080' }}
            >
              Patient Record
            </button>
            <span style={{ color: '#8A98A3' }}>/</span>
            <span className="font-sans font-medium" style={{ color: '#0D2630' }}>
              Nursing Notes
            </span>
          </div>

          {/* ── Header ──────────────────────────────────────────────────── */}
          <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1
                className="font-display font-semibold"
                style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
              >
                Nursing Notes
              </h1>
              <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                View and add chronological nursing documentation.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => router.push(ROUTES.nursePatientRecord(patient.id))}
                className={`flex h-11 items-center gap-2 rounded-[10px] px-4 font-sans font-semibold transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid rgba(0,100,130,0.15)',
                  color: '#0D2630',
                  fontSize: 14,
                }}
              >
                Back to Patient Record
              </button>
              <PermissionGate permission={PERMISSIONS.ENCOUNTERS_WRITE}>
                <button
                  type="button"
                  onClick={() => setShowTemplatesModal(true)}
                  className={`flex h-11 items-center gap-2 rounded-[10px] px-4 font-sans font-semibold transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid rgba(0,100,130,0.15)',
                    color: '#0D2630',
                    fontSize: 14,
                  }}
                >
                  <NotebookPen style={{ width: 16, height: 16 }} />
                  Templates
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingNoteId(null);
                    setDraft(emptyDraft());
                    scrollToForm();
                  }}
                  className={`flex h-11 items-center gap-2 rounded-[10px] px-4 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                  style={{ background: '#00B4D8', fontSize: 14 }}
                >
                  + Add Nursing Note
                </button>
              </PermissionGate>
            </div>
          </div>

          {/* ── Patient header card ─────────────────────────────────────── */}
          <div
            className="mt-4 flex flex-col gap-4 rounded-[12px] p-4 sm:p-5 lg:flex-row lg:flex-wrap lg:items-start lg:justify-between"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <div className="flex min-w-0 items-center gap-3">
              <div
                className="font-display flex size-16 shrink-0 items-center justify-center rounded-full font-semibold text-white"
                style={{ background: patient.avatarBg, fontSize: 20 }}
              >
                {patient.initials}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p
                    className="font-display font-semibold"
                    style={{ fontSize: 20, color: '#0D2630' }}
                  >
                    {patient.patientName}
                  </p>
                  <span style={{ fontSize: 14, color: '#8A98A3' }}>
                    {patient.age} Y / {patient.gender}
                  </span>
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span style={{ fontSize: 14, color: '#00B4D8' }}>MRN: {patient.mrn}</span>
                  <span style={{ fontSize: 14, color: '#8A98A3' }}>Ward: {patient.ward}</span>
                  <span style={{ fontSize: 14, color: '#8A98A3' }}>Bed: {patient.bed}</span>
                </div>
                <button
                  type="button"
                  onClick={onChangePatient}
                  className={`mt-1 font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                  style={{ fontSize: 14, color: '#00B4D8' }}
                >
                  Change Patient
                </button>
              </div>
            </div>

            <div className="min-w-0">
              <p style={{ fontSize: 14, color: '#8A98A3' }}>Diagnosis</p>
              <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                {patient.diagnosis}
              </p>
              <span
                className="mt-1 inline-block rounded-full px-2.5 py-0.5 font-sans font-medium"
                style={{
                  fontSize: 14,
                  color: '#8B5CF6',
                  border: '1px solid rgba(139,92,246,0.4)',
                  background: 'rgba(139,92,246,0.08)',
                }}
              >
                {record.diagnosisTag}
              </span>
            </div>

            <div className="min-w-0">
              <p style={{ fontSize: 14, color: '#8A98A3' }}>Attending Doctor</p>
              <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                {patient.doctorName}
              </p>
            </div>

            <div className="min-w-0">
              <p style={{ fontSize: 14, color: '#8A98A3' }}>Allergies</p>
              {allergyNames ? (
                <span
                  className="mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-sans font-medium"
                  style={{
                    fontSize: 14,
                    color: '#EF4444',
                    border: '1px solid rgba(239,68,68,0.4)',
                    background: 'rgba(239,68,68,0.08)',
                  }}
                >
                  <AlertTriangle style={{ width: 14, height: 14 }} />
                  {allergyNames}
                </span>
              ) : (
                <span
                  className="mt-1 inline-block rounded-full px-2.5 py-0.5 font-sans font-medium"
                  style={{
                    fontSize: 14,
                    color: '#22C55E',
                    border: '1px solid rgba(34,197,94,0.4)',
                    background: 'rgba(34,197,94,0.08)',
                  }}
                >
                  None Known
                </span>
              )}
            </div>

            <div className="min-w-0">
              <p style={{ fontSize: 14, color: '#8A98A3' }}>Code Status</p>
              <span
                className="mt-1 inline-block rounded-full px-2.5 py-0.5 font-sans font-medium"
                style={{
                  fontSize: 14,
                  color: '#00B4D8',
                  border: '1px solid rgba(0,180,216,0.4)',
                  background: 'rgba(0,180,216,0.08)',
                }}
              >
                {record.codeStatus}
              </span>
            </div>

            <div className="min-w-0">
              <p style={{ fontSize: 14, color: '#8A98A3' }}>Last Note</p>
              <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                {lastNote ? noteTimeLabel(lastNote.time) : '—'}
              </p>
            </div>
          </div>

          {/* ── Allergy banner (compliance — every patient-context page) ── */}
          <AllergyBanner allergies={record.allergies} className="mt-4" />

          {/* ── Main content + sidebar ─────────────────────────────────────── */}
          <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-start">
            <div
              className="min-w-0 flex-1 rounded-[12px] p-4 sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              {/* Tabs */}
              <div
                className="flex flex-wrap items-center gap-5 overflow-x-auto scroll-smooth"
                style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
              >
                {TABS.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab.key);
                      setCurrentPage(1);
                    }}
                    className={`flex items-center gap-1.5 pb-3 font-sans font-medium whitespace-nowrap transition-colors duration-150 ${FOCUS_RING}`}
                    style={{
                      fontSize: 14,
                      color: activeTab === tab.key ? '#00B4D8' : '#4A7080',
                      borderBottom:
                        activeTab === tab.key ? '2px solid #00B4D8' : '2px solid transparent',
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Filters row */}
              <div className="mt-4 flex flex-wrap items-end gap-3">
                <div className="relative min-w-[200px] flex-1">
                  <Search
                    className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
                    style={{ width: 16, height: 16, color: '#8A98A3' }}
                  />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Search notes..."
                    className={`h-11 w-full rounded-[10px] pr-4 pl-9 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                    style={{
                      fontSize: 14,
                      border: '1px solid rgba(0,100,130,0.18)',
                      color: '#0D2630',
                    }}
                  />
                </div>
                <div className="w-full sm:w-44">
                  <FormSelect
                    id="note-type-filter"
                    value={noteTypeFilter}
                    onChange={(v) => {
                      setNoteTypeFilter(v);
                      setCurrentPage(1);
                    }}
                    options={noteTypeFilterOptions}
                    placeholder="All Types"
                  />
                </div>
                <div className="w-full sm:w-44">
                  <FormSelect
                    id="date-range-filter"
                    value={dateRangeFilter}
                    onChange={(v) => {
                      setDateRangeFilter(v as DateRangeKey);
                      setCurrentPage(1);
                    }}
                    options={DATE_RANGE_OPTIONS}
                    placeholder="Date Range"
                  />
                </div>
                <div className="w-full sm:w-44">
                  <FormSelect
                    id="author-filter"
                    value={authorFilter}
                    onChange={(v) => {
                      setAuthorFilter(v);
                      setCurrentPage(1);
                    }}
                    options={authorOptions}
                    placeholder="All Authors"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleApplyFilters}
                  className={`flex h-11 items-center gap-2 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                  style={{
                    fontSize: 14,
                    color: '#0D2630',
                    border: '1px solid rgba(0,100,130,0.18)',
                  }}
                >
                  Filter
                </button>
              </div>

              {/* Notes list */}
              <div className="mt-4 overflow-x-auto scroll-smooth">
                <div className="min-w-[760px]">
                  <div
                    className="flex items-center rounded-t-[8px]"
                    style={{
                      background: 'rgba(226,237,241,0.4)',
                      borderBottom: '1px solid #E6F8FD',
                    }}
                  >
                    {(
                      [
                        ['Time', 'w-28 pl-3'],
                        ['Author', 'w-40'],
                        ['Note Type', 'w-36'],
                        ['Observation / Note', 'min-w-[180px] flex-1'],
                      ] as [string, string][]
                    ).map(([label, width]) => (
                      <div key={label} className={`${width} shrink-0 py-2.5 pr-1.5`}>
                        <span
                          className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          {label}
                        </span>
                      </div>
                    ))}
                    <div
                      className="sticky right-0 z-10 w-16 shrink-0 py-2.5 pr-3 text-right"
                      style={{ background: '#E2EDF1' }}
                    >
                      <span
                        className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Actions
                      </span>
                    </div>
                  </div>

                  {pageRows.length === 0 && (
                    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                      <div
                        className="flex size-14 items-center justify-center rounded-full"
                        style={{ background: 'rgba(226,237,241,0.6)' }}
                      >
                        <NotebookPen style={{ width: 24, height: 24, color: '#8A98A3' }} />
                      </div>
                      <p
                        className="font-sans font-medium"
                        style={{ fontSize: 16, color: '#4A7080' }}
                      >
                        No nursing notes match this filter
                      </p>
                      {hasActiveFilters && (
                        <button
                          type="button"
                          onClick={clearFilters}
                          className={`mt-1 font-sans font-medium transition-colors duration-150 hover:underline ${FOCUS_RING}`}
                          style={{ fontSize: 14, color: '#00B4D8' }}
                        >
                          Clear all filters
                        </button>
                      )}
                    </div>
                  )}

                  {pageRows.map((note) => {
                    const cfg = NOTE_TYPE_CFG[note.noteType];
                    const isMenuOpen = openMenuId === note.id;
                    return (
                      <div
                        key={note.id}
                        className="flex items-start transition-colors duration-100 hover:bg-[#F5FBFD]"
                        style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                      >
                        <div className="w-28 shrink-0 py-3 pr-1.5 pl-3">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="size-2 shrink-0 rounded-full"
                              style={{ background: cfg.color }}
                            />
                            <p className="truncate" style={{ fontSize: 14, color: '#0D2630' }}>
                              {noteDayLabel(note.time)}
                            </p>
                          </div>
                          <p className="pl-3.5" style={{ fontSize: 14, color: '#8A98A3' }}>
                            {formatTime(note.time)}
                          </p>
                        </div>
                        <div className="w-40 shrink-0 py-3 pr-1.5">
                          <div className="flex items-center gap-2">
                            <div
                              className="font-display flex size-7 shrink-0 items-center justify-center rounded-full font-semibold text-white"
                              style={{ background: avatarColorFor(note.authorName), fontSize: 14 }}
                            >
                              {initialsOf(note.authorName)}
                            </div>
                            <div className="min-w-0">
                              <p
                                className="truncate font-sans font-medium"
                                style={{ fontSize: 14, color: '#0D2630' }}
                              >
                                {note.authorName}
                              </p>
                              {note.authorId && (
                                <p className="truncate" style={{ fontSize: 14, color: '#8A98A3' }}>
                                  {note.authorId}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="w-36 shrink-0 py-3 pr-1.5">
                          <div className="flex flex-wrap items-center gap-1">
                            <span
                              className="inline-block rounded-full px-2 py-0.5 font-sans font-medium whitespace-nowrap"
                              style={{
                                fontSize: 14,
                                color: cfg.color,
                                border: `1px solid ${cfg.border}`,
                                background: cfg.bg,
                              }}
                            >
                              {note.noteType}
                            </span>
                            {note.isDraft && (
                              <span
                                className="inline-block rounded-full px-2 py-0.5 font-sans font-medium whitespace-nowrap"
                                style={{
                                  fontSize: 14,
                                  color: '#8A98A3',
                                  border: '1px solid rgba(138,152,163,0.4)',
                                  background: 'rgba(138,152,163,0.1)',
                                }}
                              >
                                Draft
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="min-w-[180px] flex-1 py-3 pr-1.5">
                          <p style={{ fontSize: 14, color: '#0D2630' }}>{note.observation}</p>
                          {note.carePlanGoal && (
                            <p className="mt-1" style={{ fontSize: 14, color: '#22C55E' }}>
                              → Added to Care Plan: {note.carePlanGoal}
                            </p>
                          )}
                        </div>
                        <div
                          className={`sticky right-0 flex w-16 shrink-0 items-center justify-end py-3 pr-3 ${isMenuOpen ? 'z-30' : 'z-10'}`}
                          style={{ background: '#FFFFFF' }}
                        >
                          <PermissionGate permission={PERMISSIONS.ENCOUNTERS_WRITE}>
                            <RowMenu
                              open={isMenuOpen}
                              onToggle={() => setOpenMenuId(isMenuOpen ? null : note.id)}
                              onEdit={() => startEdit(note)}
                              onDelete={() => deleteNote(note.id)}
                            />
                          </PermissionGate>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pagination */}
              {filtered.length > 0 && (
                <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
                  <p style={{ fontSize: 14, color: '#4A7080' }}>
                    Showing {pageStart + 1} to {Math.min(pageStart + rowsPerPage, filtered.length)}{' '}
                    of {filtered.length} notes
                  </p>
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: 14, color: '#4A7080' }}>Rows per page:</span>
                    <select
                      value={rowsPerPage}
                      onChange={(e) => {
                        setRowsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className={`h-9 rounded-[8px] px-2 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                      style={{
                        fontSize: 14,
                        border: '1px solid rgba(0,100,130,0.18)',
                        color: '#0D2630',
                      }}
                    >
                      {[10, 25, 50].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>
                  {totalPages > 1 && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={safePage === 1}
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        className={`flex size-9 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#F5FBFD] disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING}`}
                        style={{ border: '1px solid rgba(0,100,130,0.18)', color: '#4A7080' }}
                        aria-label="Previous page"
                      >
                        ‹
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setCurrentPage(p)}
                          className={`flex size-9 items-center justify-center rounded-[8px] font-sans font-medium transition-colors duration-150 ${FOCUS_RING}`}
                          style={
                            p === safePage
                              ? { background: '#00B4D8', color: '#FFFFFF', fontSize: 14 }
                              : {
                                  border: '1px solid rgba(0,100,130,0.18)',
                                  color: '#4A7080',
                                  fontSize: 14,
                                }
                          }
                        >
                          {p}
                        </button>
                      ))}
                      <button
                        type="button"
                        disabled={safePage === totalPages}
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        className={`flex size-9 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#F5FBFD] disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING}`}
                        style={{ border: '1px solid rgba(0,100,130,0.18)', color: '#4A7080' }}
                        aria-label="Next page"
                      >
                        ›
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Sidebar ─────────────────────────────────────────────────── */}
            <div className="flex w-full shrink-0 flex-col gap-4 xl:w-[320px]">
              <PermissionGate
                permission={PERMISSIONS.ENCOUNTERS_WRITE}
                fallback={
                  <div
                    className="rounded-[12px] p-4 sm:p-5"
                    style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>
                      You don&apos;t have permission to add nursing notes.
                    </p>
                  </div>
                }
              >
                <div
                  ref={formRef}
                  className="rounded-[12px] p-4 sm:p-5"
                  style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                >
                  <h2
                    className="font-display font-semibold"
                    style={{ fontSize: 16, color: '#0D2630' }}
                  >
                    {editingNoteId ? 'Edit Nursing Note' : 'Add New Nursing Note'}
                  </h2>
                  <div className="mt-3 flex flex-col gap-3.5">
                    <FormField label="Note Type" htmlFor="note-type" required>
                      <FormSelect
                        id="note-type"
                        value={draft.noteType}
                        onChange={(v) => setDraft((d) => ({ ...d, noteType: v as NoteType }))}
                        options={NOTE_TYPE_OPTIONS}
                        placeholder="Select Note Type"
                      />
                    </FormField>
                    <FormField label="Date & Time" htmlFor="note-datetime" required>
                      <input
                        id="note-datetime"
                        type="datetime-local"
                        value={draft.dateTime}
                        onChange={(e) => setDraft((d) => ({ ...d, dateTime: e.target.value }))}
                        className={`h-11 w-full rounded-[10px] px-3.5 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                        style={{
                          fontSize: 14,
                          border: '1px solid rgba(0,100,130,0.18)',
                          color: '#0D2630',
                        }}
                      />
                    </FormField>
                    <TextArea
                      label="Observation / Note"
                      id="note-observation"
                      required
                      value={draft.observation}
                      onChange={(v) => setDraft((d) => ({ ...d, observation: v }))}
                      placeholder="Enter your observation..."
                      textareaRef={observationRef}
                    />
                    <TextArea
                      label="Intervention"
                      id="note-intervention"
                      value={draft.intervention}
                      onChange={(v) => setDraft((d) => ({ ...d, intervention: v }))}
                      placeholder="Enter intervention provided..."
                    />
                    <TextArea
                      label="Patient Response"
                      id="note-patient-response"
                      value={draft.patientResponse}
                      onChange={(v) => setDraft((d) => ({ ...d, patientResponse: v }))}
                      placeholder="Enter patient response..."
                    />

                    <label className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-[8px] transition-colors duration-150 hover:bg-[#F5FBFD]">
                      <input
                        type="checkbox"
                        checked={draft.addToCarePlan}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, addToCarePlan: e.target.checked }))
                        }
                        className="size-4 shrink-0 cursor-pointer rounded"
                        style={{ accentColor: '#00B4D8' }}
                      />
                      <span style={{ fontSize: 14, color: '#0D2630' }}>Add to Care Plan</span>
                    </label>
                    {draft.addToCarePlan && (
                      <FormSelect
                        id="care-plan-goal"
                        value={draft.carePlanGoal}
                        onChange={(v) => setDraft((d) => ({ ...d, carePlanGoal: v }))}
                        options={CARE_PLAN_OPTIONS}
                        placeholder="Select care plan goal"
                      />
                    )}

                    <div className="mt-1 flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => saveNote(true)}
                        className={`flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                        style={{
                          fontSize: 14,
                          color: '#0D2630',
                          border: '1px solid rgba(0,100,130,0.2)',
                        }}
                      >
                        Save as Draft
                      </button>
                      <button
                        type="button"
                        onClick={() => saveNote(false)}
                        className={`flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                        style={{ fontSize: 14, background: '#00B4D8' }}
                      >
                        Save Note
                      </button>
                    </div>
                    {editingNoteId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingNoteId(null);
                          setDraft(emptyDraft());
                        }}
                        className={`font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Cancel editing
                      </button>
                    )}
                  </div>
                </div>
              </PermissionGate>

              <div
                className="rounded-[12px] p-4 sm:p-5"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <h2
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Quick Note Templates
                </h2>
                <div className="mt-3 flex flex-col gap-2">
                  {templates.map((tpl) => {
                    const Icon = TEMPLATE_ICON[tpl.id] ?? NotebookPen;
                    const cfg = NOTE_TYPE_CFG[tpl.noteType];
                    return (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => applyTemplate(tpl)}
                        className={`flex h-11 items-center gap-2 rounded-[10px] px-3 font-sans font-medium transition-opacity duration-150 hover:opacity-85 ${FOCUS_RING}`}
                        style={{
                          fontSize: 14,
                          color: cfg.color,
                          background: cfg.bg,
                          border: `1px solid ${cfg.border}`,
                        }}
                      >
                        <Icon style={{ width: 15, height: 15, flexShrink: 0 }} />
                        <span className="truncate">{tpl.label}</span>
                      </button>
                    );
                  })}
                </div>
                <PermissionGate permission={PERMISSIONS.ENCOUNTERS_WRITE}>
                  <button
                    type="button"
                    onClick={() => setShowTemplatesModal(true)}
                    className={`mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-[10px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                    style={{
                      fontSize: 14,
                      color: '#00B4D8',
                      border: '1px solid rgba(0,180,216,0.35)',
                    }}
                  >
                    Manage Templates
                  </button>
                </PermissionGate>
              </div>

              <div
                className="rounded-[12px] p-4 sm:p-5"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <div className="flex items-center justify-between">
                  <h2
                    className="font-display font-semibold"
                    style={{ fontSize: 16, color: '#0D2630' }}
                  >
                    Recent Attachments
                  </h2>
                  <button
                    type="button"
                    onClick={() => setShowAttachmentsModal(true)}
                    className={`font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                    style={{ fontSize: 14, color: '#00B4D8' }}
                  >
                    View All
                  </button>
                </div>
                <div className="mt-3 flex flex-col gap-2.5">
                  {NOTE_ATTACHMENTS.map((att) => (
                    <button
                      key={att.id}
                      type="button"
                      onClick={() => setShowAttachmentsModal(true)}
                      className={`flex items-center gap-2.5 rounded-[10px] p-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                    >
                      <div
                        className="flex size-9 shrink-0 items-center justify-center rounded-[8px]"
                        style={{ background: 'rgba(0,180,216,0.1)' }}
                      >
                        <Paperclip style={{ width: 15, height: 15, color: '#00B4D8' }} />
                      </div>
                      <div className="min-w-0">
                        <p
                          className="truncate font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {att.name}
                        </p>
                        <p className="truncate" style={{ fontSize: 14, color: '#8A98A3' }}>
                          {noteTimeLabel(att.time)} · {att.size}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="h-4" />
        </div>
      </main>

      {showTemplatesModal && (
        <ManageNoteTemplatesModal
          templates={templates}
          onSave={(next) => {
            setTemplates(next);
            setShowTemplatesModal(false);
            toast.success('Templates updated', 'Your quick note templates have been saved.');
          }}
          onClose={() => setShowTemplatesModal(false)}
        />
      )}

      {showAttachmentsModal && (
        <NoteAttachmentsModal
          attachments={NOTE_ATTACHMENTS}
          onClose={() => setShowAttachmentsModal(false)}
        />
      )}
    </div>
  );
}

function TextArea({
  label,
  id,
  value,
  onChange,
  placeholder,
  required,
  textareaRef,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
}): ReactNode {
  return (
    <FormField label={label} htmlFor={id} required={required}>
      <div className="relative">
        <textarea
          ref={textareaRef}
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, 2000))}
          placeholder={placeholder}
          rows={3}
          maxLength={2000}
          className={`w-full resize-none rounded-[10px] px-3.5 pt-2.5 pb-6 font-sans transition-colors duration-150 outline-none focus:border-[#00B4D8] focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
          style={{ fontSize: 14, border: '1px solid rgba(0,100,130,0.18)', color: '#0D2630' }}
        />
        <span
          className="pointer-events-none absolute right-3 bottom-2"
          style={{ fontSize: 14, color: '#8A98A3' }}
        >
          {value.length}/2000
        </span>
      </div>
    </FormField>
  );
}
