'use client';

import {
  AlertCircle,
  Bold,
  ChevronDown,
  ChevronRight,
  Eraser,
  FileSignature,
  FileText,
  IndentIncrease,
  Italic,
  LayoutTemplate,
  List,
  ListOrdered,
  Maximize2,
  Mic,
  MicOff,
  Paperclip,
  Plus,
  Printer,
  Quote,
  RefreshCw,
  Redo2,
  Save,
  Share2,
  Sparkles,
  Star,
  Strikethrough,
  Trash2,
  Underline,
  Undo2,
  X,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { AllergyBanner } from '@/components/clinical/AllergyBanner';
import { PermissionGate } from '@components/shared/PermissionGate';
import { Tooltip } from '@components/shared/Tooltip';
import { PERMISSIONS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { formatHumanDate, formatTime, toWATDateInput } from '@/utils/datetime';
import { downloadPDF, escapeHtml } from '@/utils/export';
import { getTriageDisplay, triageSortWeight, type TriagePriority } from '@/utils/triage';
import type { Allergy } from '@/types/patient.types';
import { useQueueEntries } from '@/features/registration/store/registrationQueueStore';
import type { QueueEntry } from '@/features/registration/__mocks__/queueFixtures';
import {
  CLINICAL_NOTE_TEMPLATES,
  DIAGNOSIS_SUGGESTIONS,
  deriveBloodGroup,
  deriveComplaintForEntry,
  deriveEmergencyContact,
  deriveLatestVitals,
  derivePhoneForEntry,
  derivePriorityForEntry,
  SMART_TEXT_SNIPPETS,
  type ClinicalNoteTemplate,
} from '@/features/emergency/__mocks__/emergencyFixtures';
import { useTriageRecords } from '@/features/emergency/store/triageAssessmentStore';
import {
  discardDraftNote,
  NOTE_TYPE_OPTIONS,
  saveDraftNote,
  signNote,
  toggleNoteFavorite,
  useClinicalNotes,
  type ClinicalNoteSections,
  type EmergencyClinicalNote,
  type NoteAttachment,
} from '@/features/emergency/store/clinicalNotesStore';

type PageState = 'loading' | 'loaded' | 'error';
type TabKey = 'Note' | 'History' | 'Attachments';
type SoapKey = 'subjective' | 'objective' | 'assessment' | 'plan' | 'freeText';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const PRIORITY_COLOR: Record<TriagePriority, string> = {
  IMMEDIATE: '#DC2626',
  URGENT: '#D97706',
  LESS_URGENT: '#F59E0B',
  NON_URGENT: '#16A34A',
};
const PRIORITY_BG: Record<TriagePriority, string> = {
  IMMEDIATE: 'rgba(220,38,38,0.06)',
  URGENT: 'rgba(217,119,6,0.06)',
  LESS_URGENT: 'rgba(245,158,11,0.06)',
  NON_URGENT: 'rgba(22,163,74,0.06)',
};
const PRIORITY_REASON: Record<TriagePriority, string> = {
  IMMEDIATE: 'Life threatening condition',
  URGENT: 'Urgent clinical concern',
  LESS_URGENT: 'Stable, needs timely review',
  NON_URGENT: 'Stable, non-urgent',
};

const SOAP_TABS: { key: SoapKey; label: string; letter: string }[] = [
  { key: 'subjective', label: 'Subjective', letter: 'S' },
  { key: 'objective', label: 'Objective', letter: 'O' },
  { key: 'assessment', label: 'Assessment', letter: 'A' },
  { key: 'plan', label: 'Plan', letter: 'P' },
  { key: 'freeText', label: 'Free Text', letter: 'F' },
];

const EMPTY_SECTIONS: ClinicalNoteSections = {
  subjective: '',
  objective: '',
  assessment: '',
  plan: '',
  freeText: '',
};

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

/** WAT is fixed UTC+1, no DST — a wall-clock "YYYY-MM-DD" + "HH:MM" pair
 * entered against WAT converts to a correct absolute instant this way. */
function watDateTimeToIso(dateStr: string, timeStr: string): string {
  return new Date(`${dateStr}T${timeStr}:00.000+01:00`).toISOString();
}

// Minimal typing for the Web Speech API (not in lib.dom.d.ts) — avoids `any`.
interface SpeechRecognitionResultLike {
  [index: number]: { transcript: string };
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

export function EmergencyClinicalNotesWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const entryId = searchParams.get('entryId');

  const [pageState, setPageState] = useState<PageState>('loading');

  const allEntries = useQueueEntries();
  const triageRecords = useTriageRecords();

  useEffect(() => {
    const t = setTimeout(() => setPageState('loaded'), 800);
    return () => clearTimeout(t);
  }, []);

  function handleRetry() {
    setPageState('loading');
    setTimeout(() => setPageState('loaded'), 800);
  }

  const emergencyEntries = allEntries.filter((e) => e.isEmergency);
  const entry: QueueEntry | undefined = entryId
    ? emergencyEntries.find((e) => e.id === entryId)
    : emergencyEntries
        .slice()
        .sort(
          (a, b) =>
            triageSortWeight(triageRecords.get(a.id)?.priority ?? derivePriorityForEntry(a.id)) -
            triageSortWeight(triageRecords.get(b.id)?.priority ?? derivePriorityForEntry(b.id)),
        )[0];

  if (pageState === 'error') {
    return (
      <main className="flex flex-1 items-center justify-center" style={{ background: '#F5FBFD' }}>
        <div className="flex flex-col items-center gap-3 px-6 text-center">
          <AlertCircle style={{ width: 40, height: 40, color: '#DC2626' }} />
          <p className="font-display font-semibold" style={{ fontSize: 18, color: '#0D2630' }}>
            Couldn&apos;t load Clinical Notes
          </p>
          <p style={{ fontSize: 14, color: '#4A7080' }}>Something went wrong. Please try again.</p>
          <button
            type="button"
            onClick={handleRetry}
            className={`mt-1 flex h-11 items-center gap-2 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
            style={{ fontSize: 14, background: '#00B4D8' }}
          >
            <RefreshCw style={{ width: 15, height: 15 }} />
            Retry
          </button>
        </div>
      </main>
    );
  }

  if (pageState === 'loading') {
    return (
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto max-w-[1400px] px-4 py-4 sm:px-6 sm:py-5">
          <div className="h-4 w-72 animate-pulse rounded bg-slate-200" />
          <div className="mt-3 h-8 w-64 animate-pulse rounded bg-slate-200" />
          <div className="mt-6 h-64 animate-pulse rounded-[12px] bg-slate-100" />
        </div>
      </main>
    );
  }

  if (!entry) {
    return (
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto flex max-w-[1400px] flex-col items-center gap-3 px-4 py-24 text-center sm:px-6">
          <div
            className="flex size-14 items-center justify-center rounded-full"
            style={{ background: 'rgba(226,237,241,0.6)' }}
          >
            <FileText style={{ width: 28, height: 28, color: '#8A98A3' }} />
          </div>
          <p className="font-display font-semibold" style={{ fontSize: 18, color: '#0D2630' }}>
            No emergency patients in the queue
          </p>
          <p style={{ fontSize: 14, color: '#4A7080' }}>
            Clinical Notes need a patient currently in the emergency department.
          </p>
          <button
            type="button"
            onClick={() => router.push(ROUTES.emergencyPatientQueue)}
            className={`mt-1 flex h-11 items-center gap-2 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
            style={{ fontSize: 14, background: '#00B4D8' }}
          >
            Go to Patient Queue
          </button>
        </div>
      </main>
    );
  }

  return <ClinicalNoteComposer key={entry.id} entry={entry} />;
}

function ClinicalNoteComposer({ entry }: { entry: QueueEntry }) {
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const triageRecords = useTriageRecords();

  const [activeTab, setActiveTab] = useState<TabKey>('Note');

  const triageRecord = triageRecords.get(entry.id);
  const priority: TriagePriority = triageRecord?.priority ?? derivePriorityForEntry(entry.id);
  const attendingPhysician = triageRecord?.assignedDoctorName ?? entry.attendingDoctor ?? '—';
  const defaultAuthor = user?.name ?? attendingPhysician;

  const notes = useClinicalNotes(entry.id, defaultAuthor);
  const sortedNotes = [...notes].sort(
    (a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime(),
  );
  const initialDraft = notes.find((n) => n.status === 'Draft') ?? null;

  // Composer state — lazily seeded from the patient's open draft, if any.
  // This component is remounted (via `key={entry.id}` above) whenever the
  // patient changes, so a fresh set of lazy initial values here is React's
  // documented alternative to an Effect that resets state on prop change.
  const [editingNoteId, setEditingNoteId] = useState<string | null>(initialDraft?.id ?? null);
  const [noteType, setNoteType] = useState(initialDraft?.noteType ?? 'Progress Note');
  const [noteDate, setNoteDate] = useState(() => toWATDateInput(initialDraft?.dateTime));
  const [noteTime, setNoteTime] = useState(() => formatTime(initialDraft?.dateTime ?? new Date()));
  const [authorField, setAuthorField] = useState(initialDraft?.author ?? defaultAuthor);
  const [visibleToAll, setVisibleToAll] = useState(initialDraft?.visibleToAllProviders ?? false);
  const [workingDiagnoses, setWorkingDiagnoses] = useState<string[]>(
    initialDraft?.workingDiagnoses ?? [],
  );
  const [diagnosisInput, setDiagnosisInput] = useState('');
  const [diagnosisSuggestOpen, setDiagnosisSuggestOpen] = useState(false);
  const [planItems, setPlanItems] = useState<string[]>(initialDraft?.planItems ?? []);
  const [planItemInput, setPlanItemInput] = useState('');
  const [attachments, setAttachments] = useState<NoteAttachment[]>(initialDraft?.attachments ?? []);
  const [docName, setDocName] = useState('');
  const [docCategory, setDocCategory] = useState('Procedure Report');

  // SOAP editor
  const [activeSection, setActiveSection] = useState<SoapKey>('subjective');
  const [charCount, setCharCount] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const sectionsRef = useRef<ClinicalNoteSections>(
    initialDraft ? { ...initialDraft.sections } : { ...EMPTY_SECTIONS },
  );
  const editableRef = useRef<HTMLDivElement>(null);

  const [openMenu, setOpenMenu] = useState<'paragraph' | 'smarttext' | 'templates' | 'more' | null>(
    null,
  );
  const [isDictating, setIsDictating] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const toolbarRef = useRef<HTMLDivElement>(null);
  const editorToolbarRef = useRef<HTMLDivElement>(null);
  const diagnosisFieldRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      const insideHeaderToolbar = toolbarRef.current?.contains(target) ?? false;
      const insideEditorToolbar = editorToolbarRef.current?.contains(target) ?? false;
      if (!insideHeaderToolbar && !insideEditorToolbar) {
        setOpenMenu(null);
      }
      if (diagnosisFieldRef.current && !diagnosisFieldRef.current.contains(target)) {
        setDiagnosisSuggestOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function syncEditableFromRef() {
    if (editableRef.current) {
      editableRef.current.innerHTML = sectionsRef.current[activeSection] || '';
    }
    setCharCount(stripHtml(sectionsRef.current[activeSection] || '').length);
  }

  useEffect(() => {
    syncEditableFromRef();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection, editingNoteId]);

  function loadNoteIntoComposer(note: EmergencyClinicalNote | null) {
    if (note) {
      setEditingNoteId(note.id);
      setNoteType(note.noteType);
      setNoteDate(toWATDateInput(note.dateTime));
      setNoteTime(formatTime(note.dateTime));
      setAuthorField(note.author);
      setVisibleToAll(note.visibleToAllProviders);
      setWorkingDiagnoses(note.workingDiagnoses);
      setPlanItems(note.planItems);
      setAttachments(note.attachments);
      sectionsRef.current = { ...note.sections };
    } else {
      setEditingNoteId(null);
      setNoteType('Progress Note');
      const now = new Date();
      setNoteDate(toWATDateInput(now));
      setNoteTime(formatTime(now));
      setAuthorField(defaultAuthor);
      setVisibleToAll(false);
      setWorkingDiagnoses([]);
      setPlanItems([]);
      setAttachments([]);
      sectionsRef.current = { ...EMPTY_SECTIONS };
    }
    setActiveSection('subjective');
    setActiveTab('Note');
  }

  const activeNote = editingNoteId ? notes.find((n) => n.id === editingNoteId) : undefined;
  const isSigned = activeNote?.status === 'Signed';

  function exec(command: string, value?: string) {
    editableRef.current?.focus();
    document.execCommand(command, false, value);
    setCharCount(stripHtml(editableRef.current?.innerHTML ?? '').length);
  }

  function handleEditableInput() {
    if (!editableRef.current) return;
    sectionsRef.current[activeSection] = editableRef.current.innerHTML;
    setCharCount(stripHtml(editableRef.current.innerHTML).length);
  }

  function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  }

  // Appends directly to the section's stored HTML rather than relying on
  // document.execCommand('insertText', ...) at the ambient selection — that
  // command silently no-ops when the caret/selection isn't reliably
  // preserved through a toolbar button click (observed in testing), so a
  // direct ref write is the robust path for programmatic insertion (as
  // opposed to the format buttons, which act on a real user text selection).
  function insertSmartText(text: string) {
    const current = sectionsRef.current[activeSection] || '';
    const needsSpace = current !== '' && !/\s$/.test(current) && !/^\s/.test(text);
    sectionsRef.current[activeSection] = current + (needsSpace ? ' ' : '') + text;
    syncEditableFromRef();
    if (editableRef.current) {
      editableRef.current.focus();
      const range = document.createRange();
      range.selectNodeContents(editableRef.current);
      range.collapse(false);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
    setOpenMenu(null);
  }

  function applyTemplate(template: ClinicalNoteTemplate) {
    sectionsRef.current = {
      subjective: template.subjective,
      objective: template.objective,
      assessment: template.assessment,
      plan: template.plan,
      freeText: sectionsRef.current.freeText,
    };
    syncEditableFromRef();
    setOpenMenu(null);
    toast.success('Template applied', `${template.name} inserted into the note.`);
  }

  function toggleDictation() {
    const win = window as unknown as {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const Ctor = win.SpeechRecognition ?? win.webkitSpeechRecognition;
    if (!Ctor) {
      toast.error('Not supported', "Voice dictation isn't supported in this browser.");
      return;
    }
    if (isDictating) {
      recognitionRef.current?.stop();
      setIsDictating(false);
      return;
    }
    try {
      const recognition = new Ctor();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i]?.[0]?.transcript ?? '';
        }
        if (transcript.trim()) insertSmartText(`${transcript.trim()} `);
      };
      recognition.onerror = () => setIsDictating(false);
      recognition.onend = () => setIsDictating(false);
      recognition.start();
      recognitionRef.current = recognition;
      setIsDictating(true);
    } catch {
      toast.error('Voice dictation failed', 'Could not start the microphone.');
    }
  }

  function addDiagnosis(name: string) {
    const trimmed = name.trim();
    if (!trimmed || workingDiagnoses.includes(trimmed)) return;
    setWorkingDiagnoses((prev) => [...prev, trimmed]);
    setDiagnosisInput('');
    setDiagnosisSuggestOpen(false);
  }
  function removeDiagnosis(name: string) {
    setWorkingDiagnoses((prev) => prev.filter((d) => d !== name));
  }
  function addPlanItem() {
    const trimmed = planItemInput.trim();
    if (!trimmed) return;
    setPlanItems((prev) => [...prev, trimmed]);
    setPlanItemInput('');
  }
  function removePlanItem(index: number) {
    setPlanItems((prev) => prev.filter((_, i) => i !== index));
  }
  function handleAddDocument() {
    if (!docName.trim()) return;
    const doc: NoteAttachment = {
      id: `${entry?.id ?? 'note'}-att-${Date.now()}`,
      name: docName.trim(),
      category: docCategory,
      uploadedBy: defaultAuthor,
      uploadedAt: new Date().toISOString(),
    };
    setAttachments((prev) => [doc, ...prev]);
    setDocName('');
    toast.success('Attachment added', `${doc.name} added to this note.`);
  }

  function buildSaveInput(entryIdVal: string) {
    return {
      entryId: entryIdVal,
      noteId: editingNoteId,
      noteType,
      dateTime: watDateTimeToIso(noteDate, noteTime),
      author: authorField.trim() || defaultAuthor,
      visibleToAllProviders: visibleToAll,
      sections: { ...sectionsRef.current },
      workingDiagnoses,
      planItems,
      attachments,
    };
  }

  function handleSaveDraft() {
    if (!entry) return;
    const record = saveDraftNote(buildSaveInput(entry.id));
    setEditingNoteId(record.id);
    toast.success('Draft saved', 'Your note has been saved as a draft.');
  }

  function handleSignNote() {
    if (!entry) return;
    signNote(buildSaveInput(entry.id));
    toast.success('Note signed', 'The note has been signed and saved to the chart.');
    loadNoteIntoComposer(null);
  }

  function handleDiscard() {
    if (!entry) return;
    if (editingNoteId && notes.some((n) => n.id === editingNoteId)) {
      discardDraftNote(entry.id, editingNoteId);
      toast.success('Draft discarded', 'The draft note has been removed.');
    }
    loadNoteIntoComposer(null);
  }

  function handlePrint() {
    if (!entry) return;
    const sections = SOAP_TABS.map(
      (t) => `<h3>${escapeHtml(t.label)}</h3>${sectionsRef.current[t.key] || '<p>—</p>'}`,
    ).join('');
    const body = `
      <h1>${escapeHtml(noteType)} — ${escapeHtml(entry.patientName)}</h1>
      <p class="meta">MRN: ${escapeHtml(entry.mrn)} · ${escapeHtml(formatHumanDate(watDateTimeToIso(noteDate, noteTime)))} ${escapeHtml(noteTime)} · By ${escapeHtml(authorField)}</p>
      <hr>
      ${sections}
      <h3>Working Diagnosis</h3>
      <p>${workingDiagnoses.map(escapeHtml).join(', ') || '—'}</p>
      <h3>Plan</h3>
      <ol>${planItems.map((p) => `<li>${escapeHtml(p)}</li>`).join('') || '<li>—</li>'}</ol>
    `;
    downloadPDF(`clinical-note-${entry.patientName.split(' ')[0]?.toLowerCase()}`, body);
  }

  function handleShare() {
    toast.success('Opening Messages', 'Share this note with a colleague from Messages.');
    router.push(ROUTES.messages);
  }

  function handleFavoriteToggle() {
    if (!entry || !editingNoteId || !notes.some((n) => n.id === editingNoteId)) {
      toast.error('Save first', 'Save this note before adding it to favorites.');
      return;
    }
    toggleNoteFavorite(entry.id, editingNoteId);
  }

  const otherNotesAttachments = notes
    .filter((n) => n.id !== editingNoteId)
    .flatMap((n) => n.attachments.map((a) => ({ ...a, noteType: n.noteType })));
  const currentAttachments = attachments.map((a) => ({ ...a, noteType }));
  const allAttachments = [...currentAttachments, ...otherNotesAttachments].sort(
    (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
  );

  const planCharCount = planItems.join(' ').length;

  const phone = derivePhoneForEntry(entry.id);
  const bloodGroup = deriveBloodGroup(entry.id);
  const emergencyContact = deriveEmergencyContact(entry.id);
  const vitals = deriveLatestVitals(entry.id);
  const allergies: Allergy[] = [];
  const chiefComplaint = triageRecord?.chiefComplaint ?? deriveComplaintForEntry(entry.id);

  const diagnosisSuggestions = diagnosisInput.trim()
    ? DIAGNOSIS_SUGGESTIONS.filter(
        (d) =>
          d.toLowerCase().includes(diagnosisInput.trim().toLowerCase()) &&
          !workingDiagnoses.includes(d),
      )
    : DIAGNOSIS_SUGGESTIONS.filter((d) => !workingDiagnoses.includes(d));

  return (
    <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
      <div className="mx-auto max-w-[1400px] px-4 py-4 sm:px-6 sm:py-5">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => router.push(ROUTES.emergency)}
            className={`font-sans transition-colors duration-150 hover:text-[#00B4D8] ${FOCUS_RING}`}
            style={{ fontSize: 14, color: '#4A7080' }}
          >
            Home
          </button>
          <ChevronRight style={{ width: 14, height: 14, color: '#8A98A3' }} />
          <span style={{ fontSize: 14, color: '#4A7080' }}>Emergency Care</span>
          <ChevronRight style={{ width: 14, height: 14, color: '#8A98A3' }} />
          <span className="font-sans font-medium" style={{ fontSize: 14, color: '#00B4D8' }}>
            Clinical Notes
          </span>
        </div>

        {/* Header */}
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <FileText style={{ width: 22, height: 22, color: '#DC2626' }} />
            <div>
              <h1 className="font-display font-bold" style={{ fontSize: 24, color: '#0D2630' }}>
                Clinical Notes
              </h1>
              <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
                Document patient encounter, assessment, and plan.
              </p>
            </div>
          </div>
          <div ref={toolbarRef} className="relative flex shrink-0 flex-wrap items-center gap-2.5">
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenMenu((p) => (p === 'templates' ? null : 'templates'))}
                className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
              >
                <LayoutTemplate style={{ width: 15, height: 15 }} />
                Templates
              </button>
              {openMenu === 'templates' && (
                <div
                  className="animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 absolute top-full right-0 z-20 mt-1 w-64 overflow-hidden rounded-[10px] bg-white py-1.5 duration-150"
                  style={{
                    border: '1px solid rgba(0,100,130,0.12)',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                  }}
                >
                  {CLINICAL_NOTE_TEMPLATES.map((t) => (
                    <button
                      key={t.name}
                      type="button"
                      onClick={() => applyTemplate(t)}
                      className={`flex w-full items-center px-3.5 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={toggleDictation}
              className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
              style={{
                fontSize: 14,
                color: isDictating ? '#DC2626' : '#0D2630',
                border: isDictating ? '1px solid #DC2626' : '1px solid rgba(0,100,130,0.2)',
              }}
            >
              {isDictating ? (
                <MicOff style={{ width: 15, height: 15 }} />
              ) : (
                <Mic style={{ width: 15, height: 15 }} />
              )}
              {isDictating ? 'Stop Dictation' : 'Voice Dictation'}
            </button>
            {!isSigned && (
              <>
                <PermissionGate permission={PERMISSIONS.EMERGENCY_WRITE}>
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                    style={{
                      fontSize: 14,
                      color: '#0D2630',
                      border: '1px solid rgba(0,100,130,0.2)',
                    }}
                  >
                    <Save style={{ width: 15, height: 15 }} />
                    Save Draft
                  </button>
                </PermissionGate>
                <PermissionGate permission={PERMISSIONS.EMERGENCY_WRITE}>
                  <button
                    type="button"
                    onClick={handleSignNote}
                    className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                    style={{ fontSize: 14, background: '#0D2630' }}
                  >
                    <FileSignature style={{ width: 15, height: 15 }} />
                    Sign Note
                  </button>
                </PermissionGate>
              </>
            )}
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenMenu((p) => (p === 'more' ? null : 'more'))}
                aria-label="More options"
                className={`flex size-11 items-center justify-center rounded-[10px] transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                style={{ border: '1px solid rgba(0,100,130,0.2)' }}
              >
                <ChevronDown style={{ width: 16, height: 16, color: '#4A7080' }} />
              </button>
              {openMenu === 'more' && (
                <div
                  className="animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 absolute top-full right-0 z-20 mt-1 w-56 overflow-hidden rounded-[10px] bg-white py-1.5 duration-150"
                  style={{
                    border: '1px solid rgba(0,100,130,0.12)',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setOpenMenu(null);
                      loadNoteIntoComposer(null);
                      sectionsRef.current = { ...sectionsRef.current };
                      toast.success('New note started', 'A blank note is ready to document.');
                    }}
                    className={`flex w-full items-center gap-2 px-3.5 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    <Plus style={{ width: 15, height: 15, color: '#4A7080' }} />
                    New Note
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOpenMenu(null);
                      handlePrint();
                    }}
                    className={`flex w-full items-center gap-2 px-3.5 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    <Printer style={{ width: 15, height: 15, color: '#4A7080' }} />
                    Print / Export as PDF
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Patient context bar */}
        <div
          className="mt-4 flex flex-wrap items-center gap-x-8 gap-y-3 rounded-[12px] p-4"
          style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex size-11 shrink-0 items-center justify-center rounded-full font-sans font-semibold text-white"
              style={{ background: PRIORITY_COLOR[priority], fontSize: 14 }}
            >
              {entry.patientName
                .split(/\s+/)
                .map((n) => n[0])
                .slice(0, 2)
                .join('')}
            </div>
            <div>
              <span
                className="inline-flex items-center rounded-full px-2.5 py-0.5 font-sans font-semibold"
                style={{
                  fontSize: 14,
                  color: PRIORITY_COLOR[priority],
                  background: PRIORITY_BG[priority],
                }}
              >
                {getTriageDisplay(priority).label}
              </span>
              <p
                className="font-display mt-0.5 font-semibold"
                style={{ fontSize: 17, color: '#0D2630' }}
              >
                {entry.patientName}
              </p>
              <p style={{ fontSize: 14, color: '#4A7080' }}>
                MRN: {entry.mrn} · {entry.age} Years, {entry.gender} · {phone}
              </p>
            </div>
          </div>
          <div>
            <p style={{ fontSize: 14, color: '#8A98A3' }}>Arrival Time</p>
            <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
              {formatHumanDate(entry.arrivalTime)}, {formatTime(entry.arrivalTime)}
            </p>
          </div>
          <div>
            <p style={{ fontSize: 14, color: '#8A98A3' }}>Location</p>
            <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
              ER-01, Resus Bay
            </p>
          </div>
          <div>
            <p style={{ fontSize: 14, color: '#8A98A3' }}>Attending Physician</p>
            <Tooltip content={attendingPhysician}>
              <p
                className="max-w-[160px] truncate font-sans font-medium"
                style={{ fontSize: 14, color: '#0D2630' }}
              >
                {attendingPhysician}
              </p>
            </Tooltip>
          </div>
          <div>
            <p style={{ fontSize: 14, color: '#8A98A3' }}>Triage Priority</p>
            <p
              className="font-sans font-medium"
              style={{ fontSize: 14, color: PRIORITY_COLOR[priority] }}
            >
              {getTriageDisplay(priority).label}
            </p>
          </div>
          <div>
            <p style={{ fontSize: 14, color: '#8A98A3' }}>Allergies</p>
            <p className="font-sans font-medium" style={{ fontSize: 14, color: '#16A34A' }}>
              No Known Allergies
            </p>
          </div>
        </div>

        <div className="mt-4">
          <AllergyBanner allergies={allergies} />
        </div>

        {/* Tabs */}
        <div
          className="mt-4 flex items-center gap-1 overflow-x-auto scroll-smooth"
          style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
        >
          {(
            [
              { key: 'Note', label: 'Clinical Note', count: null },
              { key: 'History', label: 'Note History', count: sortedNotes.length },
              { key: 'Attachments', label: 'Attachments', count: allAttachments.length },
            ] as { key: TabKey; label: string; count: number | null }[]
          ).map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex shrink-0 items-center gap-1.5 px-3 py-2.5 font-sans font-medium whitespace-nowrap transition-colors duration-150 ${FOCUS_RING}`}
                style={{
                  fontSize: 14,
                  color: isActive ? '#00B4D8' : '#4A7080',
                  borderBottom: isActive ? '2px solid #00B4D8' : '2px solid transparent',
                }}
              >
                {tab.label}
                {tab.count !== null && (
                  <span
                    className="rounded-full px-1.5 py-0.5 font-sans font-medium"
                    style={{
                      fontSize: 14,
                      color: isActive ? '#00B4D8' : '#8A98A3',
                      background: isActive ? 'rgba(0,180,216,0.1)' : 'rgba(138,152,163,0.12)',
                    }}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Main grid */}
        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_320px] xl:items-start">
          <div className="flex min-w-0 flex-col gap-4">
            {activeTab === 'Note' && (
              <>
                {isSigned && (
                  <div
                    className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] p-4"
                    style={{
                      background: 'rgba(37,99,235,0.06)',
                      border: '1px solid rgba(37,99,235,0.2)',
                    }}
                  >
                    <p style={{ fontSize: 14, color: '#2563EB' }}>
                      This note is signed and read-only. Start a new note to add further
                      documentation.
                    </p>
                    <button
                      type="button"
                      onClick={() => loadNoteIntoComposer(null)}
                      className={`flex h-9 items-center gap-1.5 rounded-[8px] px-3 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                      style={{ fontSize: 14, background: '#2563EB' }}
                    >
                      <Plus style={{ width: 14, height: 14 }} />
                      New Note
                    </button>
                  </div>
                )}

                <div
                  className="rounded-[12px] p-4"
                  style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                >
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="min-w-[160px] flex-1">
                      <label
                        className="mb-1.5 block font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        Note Type
                      </label>
                      <select
                        value={noteType}
                        onChange={(e) => setNoteType(e.target.value)}
                        disabled={isSigned}
                        className={`h-10 w-full rounded-[8px] px-3 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 disabled:opacity-60 ${FOCUS_RING}`}
                        style={{
                          fontSize: 14,
                          border: '1px solid rgba(0,100,130,0.18)',
                          color: '#0D2630',
                        }}
                      >
                        {(NOTE_TYPE_OPTIONS.includes(noteType)
                          ? NOTE_TYPE_OPTIONS
                          : [noteType, ...NOTE_TYPE_OPTIONS]
                        ).map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label
                        className="mb-1.5 block font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        Note Date
                      </label>
                      <input
                        type="date"
                        value={noteDate}
                        onChange={(e) => setNoteDate(e.target.value)}
                        disabled={isSigned}
                        className={`h-10 rounded-[8px] px-3 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 disabled:opacity-60 ${FOCUS_RING}`}
                        style={{
                          fontSize: 14,
                          border: '1px solid rgba(0,100,130,0.18)',
                          color: '#0D2630',
                        }}
                      />
                    </div>
                    <div>
                      <label
                        className="mb-1.5 block font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        Note Time
                      </label>
                      <input
                        type="time"
                        value={noteTime}
                        onChange={(e) => setNoteTime(e.target.value)}
                        disabled={isSigned}
                        className={`h-10 rounded-[8px] px-3 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 disabled:opacity-60 ${FOCUS_RING}`}
                        style={{
                          fontSize: 14,
                          border: '1px solid rgba(0,100,130,0.18)',
                          color: '#0D2630',
                        }}
                      />
                    </div>
                    <div className="min-w-[160px] flex-1">
                      <label
                        className="mb-1.5 block font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        Author
                      </label>
                      <input
                        value={authorField}
                        onChange={(e) => setAuthorField(e.target.value)}
                        disabled={isSigned}
                        className={`h-10 w-full rounded-[8px] px-3 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 disabled:opacity-60 ${FOCUS_RING}`}
                        style={{
                          fontSize: 14,
                          border: '1px solid rgba(0,100,130,0.18)',
                          color: '#0D2630',
                        }}
                      />
                    </div>
                    <label
                      className="mb-1.5 flex h-10 items-center gap-2"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      <input
                        type="checkbox"
                        checked={visibleToAll}
                        onChange={(e) => setVisibleToAll(e.target.checked)}
                        disabled={isSigned}
                        className={`size-4 ${FOCUS_RING}`}
                      />
                      Make this note visible to all providers
                    </label>
                  </div>
                </div>

                <div
                  className="rounded-[12px]"
                  style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                >
                  {!isSigned && (
                    <div
                      ref={editorToolbarRef}
                      className="flex flex-wrap items-center gap-1 px-3 py-2"
                      style={{ borderBottom: '1px solid rgba(0,100,130,0.1)' }}
                    >
                      <div className="relative">
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() =>
                            setOpenMenu((p) => (p === 'paragraph' ? null : 'paragraph'))
                          }
                          className={`flex h-9 items-center gap-1 rounded-[6px] px-2.5 font-sans transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          Paragraph
                          <ChevronDown style={{ width: 13, height: 13 }} />
                        </button>
                        {openMenu === 'paragraph' && (
                          <div
                            className="animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 absolute top-full left-0 z-20 mt-1 w-36 overflow-hidden rounded-[10px] bg-white py-1.5 duration-150"
                            style={{
                              border: '1px solid rgba(0,100,130,0.12)',
                              boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                            }}
                          >
                            {[
                              ['Paragraph', 'p'],
                              ['Heading', 'h3'],
                              ['Quote', 'blockquote'],
                            ].map(([label, tag]) => (
                              <button
                                key={label}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                  exec('formatBlock', tag);
                                  setOpenMenu(null);
                                }}
                                className={`flex w-full items-center px-3.5 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                                style={{ fontSize: 14, color: '#0D2630' }}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <span
                        className="mx-1 h-5 w-px"
                        style={{ background: 'rgba(0,100,130,0.15)' }}
                      />
                      {[
                        [Bold, 'bold', 'Bold'],
                        [Italic, 'italic', 'Italic'],
                        [Underline, 'underline', 'Underline'],
                        [Strikethrough, 'strikeThrough', 'Strikethrough'],
                      ].map(([Icon, cmd, tooltip]) => (
                        <Tooltip key={cmd as string} content={tooltip as string}>
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => exec(cmd as string)}
                            className={`flex size-9 items-center justify-center rounded-[6px] transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                          >
                            {(() => {
                              const I = Icon as typeof Bold;
                              return <I style={{ width: 15, height: 15, color: '#4A7080' }} />;
                            })()}
                          </button>
                        </Tooltip>
                      ))}
                      <span
                        className="mx-1 h-5 w-px"
                        style={{ background: 'rgba(0,100,130,0.15)' }}
                      />
                      {[
                        [List, 'insertUnorderedList', 'Bullet list'],
                        [ListOrdered, 'insertOrderedList', 'Numbered list'],
                        [IndentIncrease, 'indent', 'Indent'],
                        [Quote, 'blockquote', 'Quote'],
                      ].map(([Icon, cmd, tooltip]) => (
                        <Tooltip key={cmd as string} content={tooltip as string}>
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() =>
                              cmd === 'blockquote'
                                ? exec('formatBlock', 'blockquote')
                                : exec(cmd as string)
                            }
                            className={`flex size-9 items-center justify-center rounded-[6px] transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                          >
                            {(() => {
                              const I = Icon as typeof List;
                              return <I style={{ width: 15, height: 15, color: '#4A7080' }} />;
                            })()}
                          </button>
                        </Tooltip>
                      ))}
                      <span
                        className="mx-1 h-5 w-px"
                        style={{ background: 'rgba(0,100,130,0.15)' }}
                      />
                      <Tooltip content="Undo">
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => exec('undo')}
                          className={`flex size-9 items-center justify-center rounded-[6px] transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                        >
                          <Undo2 style={{ width: 15, height: 15, color: '#4A7080' }} />
                        </button>
                      </Tooltip>
                      <Tooltip content="Redo">
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => exec('redo')}
                          className={`flex size-9 items-center justify-center rounded-[6px] transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                        >
                          <Redo2 style={{ width: 15, height: 15, color: '#4A7080' }} />
                        </button>
                      </Tooltip>
                      <Tooltip content="Clear formatting">
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => exec('removeFormat')}
                          className={`flex size-9 items-center justify-center rounded-[6px] transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                        >
                          <Eraser style={{ width: 15, height: 15, color: '#4A7080' }} />
                        </button>
                      </Tooltip>
                      <div className="relative ml-auto">
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() =>
                            setOpenMenu((p) => (p === 'smarttext' ? null : 'smarttext'))
                          }
                          className={`flex h-9 items-center gap-1.5 rounded-[8px] px-3 font-sans transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                          style={{ fontSize: 14, color: '#00B4D8', border: '1px solid #00B4D8' }}
                        >
                          <Sparkles style={{ width: 14, height: 14 }} />
                          Insert SmartText
                          <ChevronDown style={{ width: 13, height: 13 }} />
                        </button>
                        {openMenu === 'smarttext' && (
                          <div
                            className="animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 absolute top-full right-0 z-20 mt-1 w-64 overflow-hidden rounded-[10px] bg-white py-1.5 duration-150"
                            style={{
                              border: '1px solid rgba(0,100,130,0.12)',
                              boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                            }}
                          >
                            {SMART_TEXT_SNIPPETS.map((s) => (
                              <button
                                key={s.label}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => insertSmartText(s.text)}
                                className={`flex w-full items-center px-3.5 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                                style={{ fontSize: 14, color: '#0D2630' }}
                              >
                                {s.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <Tooltip content={expanded ? 'Collapse editor' : 'Expand editor'}>
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => setExpanded((p) => !p)}
                          className={`flex size-9 items-center justify-center rounded-[6px] transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                        >
                          <Maximize2 style={{ width: 15, height: 15, color: '#4A7080' }} />
                        </button>
                      </Tooltip>
                    </div>
                  )}

                  <div className="flex flex-col gap-3 p-4 sm:flex-row">
                    <div className="flex shrink-0 flex-row gap-2 overflow-x-auto sm:w-[140px] sm:flex-col">
                      {SOAP_TABS.map((tab) => {
                        const isActive = activeSection === tab.key;
                        return (
                          <button
                            key={tab.key}
                            type="button"
                            onClick={() => setActiveSection(tab.key)}
                            className={`flex shrink-0 items-center gap-2 rounded-[10px] px-3 py-2.5 text-left font-sans font-medium transition-colors duration-150 ${FOCUS_RING}`}
                            style={{
                              fontSize: 14,
                              color: isActive ? '#00B4D8' : '#0D2630',
                              background: isActive ? 'rgba(0,180,216,0.08)' : '#F5FBFD',
                              border: isActive ? '1px solid #00B4D8' : '1px solid transparent',
                            }}
                          >
                            <span
                              className="flex size-5 shrink-0 items-center justify-center rounded-full font-sans font-bold"
                              style={{
                                fontSize: 14,
                                color: isActive ? '#FFFFFF' : '#4A7080',
                                background: isActive ? '#00B4D8' : 'rgba(74,112,128,0.15)',
                              }}
                            >
                              {tab.letter}
                            </span>
                            {tab.label}
                          </button>
                        );
                      })}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p
                        className="font-display font-semibold"
                        style={{ fontSize: 16, color: '#0D2630' }}
                      >
                        {SOAP_TABS.find((t) => t.key === activeSection)?.label}
                      </p>
                      <div
                        ref={editableRef}
                        contentEditable={!isSigned}
                        suppressContentEditableWarning
                        onInput={handleEditableInput}
                        onPaste={handlePaste}
                        className={`clinical-note-editor mt-1.5 w-full overflow-y-auto scroll-smooth rounded-[8px] outline-none ${FOCUS_RING}`}
                        style={{
                          fontSize: 14,
                          color: '#0D2630',
                          minHeight: expanded ? 420 : 160,
                          cursor: isSigned ? 'default' : 'text',
                        }}
                      />
                      {!isSigned && (
                        <p className="mt-1 text-right" style={{ fontSize: 14, color: '#8A98A3' }}>
                          {charCount}/5000
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div
                  className="rounded-[12px] p-4"
                  style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                >
                  <p
                    className="font-display font-semibold"
                    style={{ fontSize: 16, color: '#0D2630' }}
                  >
                    Assessment &amp; Plan
                  </p>
                  <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <p
                        className="font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        Working Diagnosis
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {workingDiagnoses.map((d) => (
                          <span
                            key={d}
                            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-sans font-medium"
                            style={{
                              fontSize: 14,
                              color: '#16A34A',
                              background: 'rgba(22,163,74,0.1)',
                            }}
                          >
                            {d}
                            {!isSigned && (
                              <button
                                type="button"
                                onClick={() => removeDiagnosis(d)}
                                aria-label={`Remove ${d}`}
                                className={`flex items-center justify-center ${FOCUS_RING}`}
                              >
                                <X style={{ width: 12, height: 12 }} />
                              </button>
                            )}
                          </span>
                        ))}
                      </div>
                      {!isSigned && (
                        <div ref={diagnosisFieldRef} className="relative mt-2.5">
                          <div className="flex items-center gap-2">
                            <input
                              value={diagnosisInput}
                              onChange={(e) => {
                                setDiagnosisInput(e.target.value);
                                setDiagnosisSuggestOpen(true);
                              }}
                              onFocus={() => setDiagnosisSuggestOpen(true)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  addDiagnosis(diagnosisInput);
                                }
                              }}
                              placeholder="Add diagnosis..."
                              className={`h-9 flex-1 rounded-[8px] px-3 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                              style={{
                                fontSize: 14,
                                border: '1px solid rgba(0,100,130,0.18)',
                                color: '#0D2630',
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => addDiagnosis(diagnosisInput)}
                              className={`flex items-center gap-1 font-sans font-medium transition-colors duration-150 hover:underline ${FOCUS_RING}`}
                              style={{ fontSize: 14, color: '#00B4D8' }}
                            >
                              <Plus style={{ width: 14, height: 14 }} />
                              Add
                            </button>
                          </div>
                          {diagnosisSuggestOpen && diagnosisSuggestions.length > 0 && (
                            <div
                              className="animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 absolute top-full left-0 z-20 mt-1 max-h-[200px] w-full overflow-y-auto rounded-[10px] bg-white py-1.5 duration-150"
                              style={{
                                border: '1px solid rgba(0,100,130,0.12)',
                                boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                              }}
                            >
                              {diagnosisSuggestions.map((d) => (
                                <button
                                  key={d}
                                  type="button"
                                  onClick={() => addDiagnosis(d)}
                                  className={`flex w-full items-center px-3.5 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                                  style={{ fontSize: 14, color: '#0D2630' }}
                                >
                                  {d}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <p
                        className="font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        Plan
                      </p>
                      {planItems.length === 0 ? (
                        <p className="mt-2" style={{ fontSize: 14, color: '#8A98A3' }}>
                          No plan items yet.
                        </p>
                      ) : (
                        <ol
                          className="mt-2 flex flex-col gap-1.5 pl-4"
                          style={{ listStyle: 'decimal' }}
                        >
                          {planItems.map((p, i) => (
                            <li
                              key={`${p}-${i}`}
                              className="flex items-start justify-between gap-2"
                            >
                              <span style={{ fontSize: 14, color: '#0D2630' }}>{p}</span>
                              {!isSigned && (
                                <button
                                  type="button"
                                  onClick={() => removePlanItem(i)}
                                  aria-label="Remove plan item"
                                  className={`shrink-0 ${FOCUS_RING}`}
                                >
                                  <X style={{ width: 13, height: 13, color: '#8A98A3' }} />
                                </button>
                              )}
                            </li>
                          ))}
                        </ol>
                      )}
                      {!isSigned && (
                        <div className="mt-2.5 flex items-center gap-2">
                          <input
                            value={planItemInput}
                            onChange={(e) => setPlanItemInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addPlanItem();
                              }
                            }}
                            placeholder="Add plan item..."
                            className={`h-9 flex-1 rounded-[8px] px-3 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                            style={{
                              fontSize: 14,
                              border: '1px solid rgba(0,100,130,0.18)',
                              color: '#0D2630',
                            }}
                          />
                          <button
                            type="button"
                            onClick={addPlanItem}
                            className={`flex items-center gap-1 font-sans font-medium transition-colors duration-150 hover:underline ${FOCUS_RING}`}
                            style={{ fontSize: 14, color: '#00B4D8' }}
                          >
                            <Plus style={{ width: 14, height: 14 }} />
                            Add
                          </button>
                        </div>
                      )}
                      <p className="mt-1 text-right" style={{ fontSize: 14, color: '#8A98A3' }}>
                        {planCharCount}/1000
                      </p>
                    </div>
                  </div>
                </div>

                {!isSigned && (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <PermissionGate permission={PERMISSIONS.EMERGENCY_WRITE}>
                      <button
                        type="button"
                        onClick={handleDiscard}
                        className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[rgba(220,38,38,0.06)] ${FOCUS_RING}`}
                        style={{
                          fontSize: 14,
                          color: '#DC2626',
                          border: '1px solid rgba(220,38,38,0.3)',
                        }}
                      >
                        <Trash2 style={{ width: 15, height: 15 }} />
                        Discard Note
                      </button>
                    </PermissionGate>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <PermissionGate permission={PERMISSIONS.EMERGENCY_WRITE}>
                        <button
                          type="button"
                          onClick={handleSaveDraft}
                          className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                          style={{
                            fontSize: 14,
                            color: '#0D2630',
                            border: '1px solid rgba(0,100,130,0.2)',
                          }}
                        >
                          Save Draft
                        </button>
                      </PermissionGate>
                      <PermissionGate permission={PERMISSIONS.EMERGENCY_WRITE}>
                        <button
                          type="button"
                          onClick={handleSignNote}
                          className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                          style={{ fontSize: 14, background: '#0D2630' }}
                        >
                          <FileSignature style={{ width: 15, height: 15 }} />
                          Sign &amp; Save Note
                        </button>
                      </PermissionGate>
                    </div>
                  </div>
                )}
              </>
            )}

            {activeTab === 'History' && (
              <div
                className="rounded-[12px]"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                {sortedNotes.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
                    <div
                      className="flex size-14 items-center justify-center rounded-full"
                      style={{ background: 'rgba(226,237,241,0.6)' }}
                    >
                      <FileText style={{ width: 28, height: 28, color: '#8A98A3' }} />
                    </div>
                    <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                      No notes yet
                    </p>
                  </div>
                ) : (
                  sortedNotes.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => loadNoteIntoComposer(n)}
                      className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                      style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p
                            className="font-sans font-semibold"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {n.noteType}
                          </p>
                          <span
                            className="rounded-full px-2 py-0.5 font-sans font-medium"
                            style={{
                              fontSize: 14,
                              color: n.status === 'Signed' ? '#16A34A' : '#6B7280',
                              background:
                                n.status === 'Signed'
                                  ? 'rgba(22,163,74,0.1)'
                                  : 'rgba(107,114,128,0.1)',
                            }}
                          >
                            {n.status}
                          </span>
                          {n.favorite && (
                            <Star
                              style={{ width: 14, height: 14, color: '#D97706' }}
                              fill="#D97706"
                            />
                          )}
                        </div>
                        <p style={{ fontSize: 14, color: '#8A98A3' }}>By {n.author}</p>
                      </div>
                      <span
                        className="shrink-0 text-right"
                        style={{ fontSize: 14, color: '#8A98A3' }}
                      >
                        {formatTime(n.dateTime)}
                        <br />
                        {formatHumanDate(n.dateTime)}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}

            {activeTab === 'Attachments' && (
              <div
                className="rounded-[12px] p-4"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <p
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Attachments
                </p>
                {allAttachments.length === 0 ? (
                  <p className="mt-2.5" style={{ fontSize: 14, color: '#8A98A3' }}>
                    No documents attached to this patient&apos;s notes yet.
                  </p>
                ) : (
                  <div className="mt-2.5 flex flex-col gap-2">
                    {allAttachments.map((d) => (
                      <div
                        key={d.id}
                        className="flex items-center gap-2.5 rounded-[10px] p-3"
                        style={{ background: '#F5FBFD' }}
                      >
                        <Paperclip
                          style={{ width: 18, height: 18, color: '#00B4D8' }}
                          className="shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <Tooltip content={d.name}>
                            <p
                              className="truncate font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {d.name}
                            </p>
                          </Tooltip>
                          <p style={{ fontSize: 14, color: '#8A98A3' }}>
                            {d.category} · {d.noteType} · {d.uploadedBy} ·{' '}
                            {formatTime(d.uploadedAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!isSigned && (
                  <PermissionGate permission={PERMISSIONS.EMERGENCY_WRITE}>
                    <div
                      className="mt-3.5 flex flex-wrap items-end gap-2.5 border-t pt-3.5"
                      style={{ borderColor: 'rgba(0,100,130,0.12)' }}
                    >
                      <div className="min-w-[180px] flex-1">
                        <label
                          className="mb-1.5 block font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          Document Name
                        </label>
                        <input
                          value={docName}
                          onChange={(e) => setDocName(e.target.value)}
                          placeholder="e.g. ECG Strip 10:15.pdf"
                          className={`h-10 w-full rounded-[8px] px-3 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                          style={{
                            fontSize: 14,
                            border: '1px solid rgba(0,100,130,0.18)',
                            color: '#0D2630',
                          }}
                        />
                      </div>
                      <div>
                        <label
                          className="mb-1.5 block font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          Category
                        </label>
                        <select
                          value={docCategory}
                          onChange={(e) => setDocCategory(e.target.value)}
                          className={`h-10 rounded-[8px] px-3 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                          style={{
                            fontSize: 14,
                            border: '1px solid rgba(0,100,130,0.18)',
                            color: '#0D2630',
                          }}
                        >
                          {['Consent Form', 'Procedure Report', 'Imaging', 'Other'].map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddDocument}
                        disabled={!docName.trim()}
                        className={`flex h-10 items-center gap-1.5 rounded-[8px] px-3.5 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
                        style={{ fontSize: 14, background: '#0D2630' }}
                      >
                        <Paperclip style={{ width: 15, height: 15 }} />
                        Attach Document
                      </button>
                    </div>
                  </PermissionGate>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="flex w-full shrink-0 flex-col gap-4">
            <div
              className="rounded-[12px] p-4"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <div className="flex items-center justify-between">
                <p
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Patient Summary
                </p>
                <button
                  type="button"
                  onClick={() => router.push(ROUTES.patients)}
                  className={`font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                  style={{ fontSize: 14, color: '#00B4D8' }}
                >
                  View Full Profile
                </button>
              </div>
              <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5">
                <div>
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>MRN</p>
                  <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                    {entry.mrn}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>Age / Sex</p>
                  <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                    {entry.age} Years / {entry.gender}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>Blood Group</p>
                  <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                    {bloodGroup}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>Phone</p>
                  <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                    {phone}
                  </p>
                </div>
                <div className="col-span-2">
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>Emergency Contact</p>
                  <Tooltip
                    content={`${emergencyContact.name} (${emergencyContact.relation}) · ${emergencyContact.phone}`}
                  >
                    <p
                      className="truncate font-sans font-medium"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {emergencyContact.name} ({emergencyContact.relation}) ·{' '}
                      {emergencyContact.phone}
                    </p>
                  </Tooltip>
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-center justify-between">
                  <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                    Vital Signs ({formatTime(new Date())})
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      router.push(`${ROUTES.emergencyMedicationOrders}?entryId=${entry.id}`)
                    }
                    className={`shrink-0 font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                    style={{ fontSize: 14, color: '#00B4D8' }}
                  >
                    View All
                  </button>
                </div>
                <div className="mt-1.5 grid grid-cols-3 gap-2">
                  <div className="rounded-[8px] p-2" style={{ background: '#F5FBFD' }}>
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>BP</p>
                    <p
                      className="font-sans font-semibold"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {vitals.bp}
                    </p>
                  </div>
                  <div className="rounded-[8px] p-2" style={{ background: '#F5FBFD' }}>
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>HR</p>
                    <p
                      className="font-sans font-semibold"
                      style={{ fontSize: 14, color: '#DC2626' }}
                    >
                      {vitals.hr}
                    </p>
                  </div>
                  <div className="rounded-[8px] p-2" style={{ background: '#F5FBFD' }}>
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>RR</p>
                    <p
                      className="font-sans font-semibold"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {vitals.rr}
                    </p>
                  </div>
                  <div className="rounded-[8px] p-2" style={{ background: '#F5FBFD' }}>
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>SpO₂</p>
                    <p
                      className="font-sans font-semibold"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {vitals.spo2}%
                    </p>
                  </div>
                  <div className="rounded-[8px] p-2" style={{ background: '#F5FBFD' }}>
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>Temp</p>
                    <p
                      className="font-sans font-semibold"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      36.8°C
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div
              className="rounded-[12px] p-4"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Triage Information
              </p>
              <span
                className="mt-2 inline-flex items-center rounded-full px-2.5 py-0.5 font-sans font-semibold"
                style={{
                  fontSize: 14,
                  color: PRIORITY_COLOR[priority],
                  background: PRIORITY_BG[priority],
                }}
              >
                {getTriageDisplay(priority).label}
              </span>
              <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5">
                <div>
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>Triage Time</p>
                  <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                    {triageRecord ? formatTime(triageRecord.completedAt) : '—'}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>Chief Complaint</p>
                  <Tooltip content={chiefComplaint}>
                    <p
                      className="truncate font-sans font-medium"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {chiefComplaint}
                    </p>
                  </Tooltip>
                </div>
                <div>
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>Priority Reason</p>
                  <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                    {PRIORITY_REASON[priority]}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>Assigned Physician</p>
                  <Tooltip content={attendingPhysician}>
                    <p
                      className="truncate font-sans font-medium"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {attendingPhysician}
                    </p>
                  </Tooltip>
                </div>
              </div>
            </div>

            <div
              className="rounded-[12px] p-4"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <div className="flex items-center justify-between">
                <p
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Recent Notes
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('History')}
                  className={`font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                  style={{ fontSize: 14, color: '#00B4D8' }}
                >
                  View All
                </button>
              </div>
              {sortedNotes.length === 0 ? (
                <p className="mt-2.5" style={{ fontSize: 14, color: '#8A98A3' }}>
                  No notes recorded yet.
                </p>
              ) : (
                <div className="mt-2.5 flex flex-col gap-2.5">
                  {sortedNotes.slice(0, 3).map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => loadNoteIntoComposer(n)}
                      className={`flex items-start justify-between gap-2 text-left transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                    >
                      <div className="min-w-0">
                        <p
                          className="font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {n.noteType}
                        </p>
                        <p style={{ fontSize: 14, color: '#8A98A3' }}>By {n.author}</p>
                      </div>
                      <span className="shrink-0" style={{ fontSize: 14, color: '#8A98A3' }}>
                        {formatTime(n.dateTime)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div
              className="rounded-[12px] p-4"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Note Actions
              </p>
              <div className="mt-2.5 grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setActiveTab('Attachments')}
                  className={`flex h-10 items-center justify-center gap-1.5 rounded-[8px] px-2 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                  style={{
                    fontSize: 14,
                    color: '#0D2630',
                    border: '1px solid rgba(0,100,130,0.2)',
                  }}
                >
                  <Paperclip style={{ width: 14, height: 14 }} />
                  Add Attachment
                </button>
                <button
                  type="button"
                  onClick={handleShare}
                  className={`flex h-10 items-center justify-center gap-1.5 rounded-[8px] px-2 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                  style={{
                    fontSize: 14,
                    color: '#0D2630',
                    border: '1px solid rgba(0,100,130,0.2)',
                  }}
                >
                  <Share2 style={{ width: 14, height: 14 }} />
                  Share Note
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className={`flex h-10 items-center justify-center gap-1.5 rounded-[8px] px-2 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                  style={{
                    fontSize: 14,
                    color: '#0D2630',
                    border: '1px solid rgba(0,100,130,0.2)',
                  }}
                >
                  <Printer style={{ width: 14, height: 14 }} />
                  Print Note
                </button>
                <button
                  type="button"
                  onClick={handleFavoriteToggle}
                  className={`flex h-10 items-center justify-center gap-1.5 rounded-[8px] px-2 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                  style={{
                    fontSize: 14,
                    color: '#0D2630',
                    border: '1px solid rgba(0,100,130,0.2)',
                  }}
                >
                  <Star
                    style={{
                      width: 14,
                      height: 14,
                      color: activeNote?.favorite ? '#D97706' : undefined,
                    }}
                    fill={activeNote?.favorite ? '#D97706' : 'none'}
                  />
                  Add to Favorites
                </button>
              </div>
            </div>

            <div
              className="rounded-[12px] p-4"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Audit Trail
              </p>
              <div className="mt-2.5 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>Created by</p>
                    <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                      {activeNote ? activeNote.createdBy : authorField}
                    </p>
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>
                      {activeNote
                        ? `${formatHumanDate(activeNote.createdAt)}, ${formatTime(activeNote.createdAt)}`
                        : 'Not yet saved'}
                    </p>
                  </div>
                  <span
                    className="rounded-full px-2 py-0.5 font-sans font-medium"
                    style={{
                      fontSize: 14,
                      color: isSigned ? '#16A34A' : '#6B7280',
                      background: isSigned ? 'rgba(22,163,74,0.1)' : 'rgba(107,114,128,0.1)',
                    }}
                  >
                    {isSigned ? 'Signed' : 'Draft'}
                  </span>
                </div>
                <div>
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>Last edited by</p>
                  <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                    {activeNote ? activeNote.lastEditedBy : '—'}
                  </p>
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>
                    {activeNote
                      ? `${formatHumanDate(activeNote.lastEditedAt)}, ${formatTime(activeNote.lastEditedAt)}`
                      : '—'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-4 text-center" style={{ fontSize: 14, color: '#8A98A3' }}>
          All times are current. Data updates automatically.
        </p>
      </div>
    </main>
  );
}
