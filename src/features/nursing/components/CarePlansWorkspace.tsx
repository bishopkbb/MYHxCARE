'use client';

import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock,
  FileText,
  Footprints,
  Gauge,
  Heart,
  Info,
  ListChecks,
  MoreVertical,
  NotebookPen,
  Paperclip,
  Pencil,
  Plus,
  Printer,
  Scissors,
  Shield,
  Target,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import { AllergyBanner } from '@components/clinical/AllergyBanner';
import { ModalLoadingFallback } from '@components/shared/ModalLoadingFallback';
import { PermissionGate } from '@components/shared/PermissionGate';
import { PERMISSIONS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { formatDate, formatDateTime, formatHumanDate } from '@/utils/datetime';
import { type NursePatient } from '@/features/nursing/__mocks__/myPatientsFixtures';
import { getPatientRecord } from '@/features/nursing/__mocks__/patientRecordFixtures';
import {
  CARE_PLANS,
  CARE_PLAN_DOCUMENTS,
  EVALUATION_CFG,
  QUICK_CARE_PLAN_TEMPLATES,
  type CarePlan,
  type CarePlanStatus,
  type CarePlanTemplate,
  type EvaluationStatus,
} from '@/features/nursing/__mocks__/carePlansFixtures';
import { NursePatientPicker } from './NursePatientPicker';
import type { CarePlanDraftInput } from './CreateCarePlanModal';

const CreateCarePlanModal = dynamic(
  () => import('./CreateCarePlanModal').then((m) => m.CreateCarePlanModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

const ManageCarePlanTemplatesModal = dynamic(
  () => import('./ManageCarePlanTemplatesModal').then((m) => m.ManageCarePlanTemplatesModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

const CarePlanTimelineModal = dynamic(
  () => import('./CarePlanTimelineModal').then((m) => m.CarePlanTimelineModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const STATUS_CFG: Record<CarePlanStatus, { color: string; border: string; bg: string }> = {
  'In Progress': { color: '#16A34A', border: 'rgba(34,197,94,0.4)', bg: 'rgba(34,197,94,0.1)' },
  Completed: { color: '#3B82F6', border: 'rgba(59,130,246,0.4)', bg: 'rgba(59,130,246,0.1)' },
  Discontinued: { color: '#8A98A3', border: 'rgba(138,152,163,0.4)', bg: 'rgba(138,152,163,0.1)' },
};

const EVALUATION_OPTIONS: EvaluationStatus[] = [
  'Progressing',
  'Achieved',
  'Not Progressing',
  'Stalled',
];

type TabKey = 'active' | 'all' | 'completed' | 'history';
const TABS: { key: TabKey; label: string }[] = [
  { key: 'active', label: 'Active Care Plans' },
  { key: 'all', label: 'All Care Plans' },
  { key: 'completed', label: 'Completed Plans' },
  { key: 'history', label: 'Care Plan History' },
];

type SectionKey =
  'overview' | 'interventions' | 'progress' | 'evaluations' | 'timeline' | 'documents';
const SECTIONS: { key: SectionKey; label: string; icon: typeof Info }[] = [
  { key: 'overview', label: 'Overview', icon: Info },
  { key: 'interventions', label: 'Interventions', icon: ListChecks },
  { key: 'progress', label: 'Progress Notes', icon: NotebookPen },
  { key: 'evaluations', label: 'Evaluations', icon: Gauge },
  { key: 'timeline', label: 'Timeline', icon: Clock },
  { key: 'documents', label: 'Documents', icon: FileText },
];

const TEMPLATE_ICON: Record<string, typeof Heart> = {
  'tpl-pain': Heart,
  'tpl-postop': Scissors,
  'tpl-infection': Shield,
  'tpl-mobility': Footprints,
  'tpl-general': NotebookPen,
};

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

function reviewCountdownLabel(iso: string, nowMs: number): { label: string; color: string } {
  const diffDays = Math.ceil((new Date(iso).getTime() - nowMs) / 86_400_000);
  if (diffDays < 0) return { label: 'Overdue', color: '#EF4444' };
  if (diffDays === 0) return { label: 'Today', color: '#EF4444' };
  if (diffDays === 1) return { label: '1 day', color: '#F59E0B' };
  return { label: `${diffDays} days`, color: diffDays <= 3 ? '#F59E0B' : '#8A98A3' };
}

function RowMenu({
  status,
  open,
  onToggle,
  onEdit,
  onComplete,
  onDiscontinue,
}: {
  status: CarePlanStatus;
  open: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onComplete: () => void;
  onDiscontinue: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) onToggle();
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open, onToggle]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={onToggle}
        aria-label="More actions"
        className={`flex size-11 shrink-0 items-center justify-center rounded-[10px] transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
      >
        <MoreVertical style={{ width: 16, height: 16, color: '#4A7080' }} />
      </button>
      {open && (
        <div
          className="animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 absolute top-full right-0 z-30 mt-1.5 w-48 overflow-hidden rounded-[10px] bg-white py-1.5 duration-150"
          style={{
            border: '1px solid rgba(0,100,130,0.12)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          }}
        >
          <button
            type="button"
            onClick={onEdit}
            className={`flex w-full items-center gap-2 px-3.5 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
            style={{ fontSize: 14, color: '#0D2630' }}
          >
            <Pencil style={{ width: 15, height: 15, color: '#00B4D8' }} />
            Edit Plan
          </button>
          {status === 'In Progress' && (
            <>
              <button
                type="button"
                onClick={onComplete}
                className={`flex w-full items-center gap-2 px-3.5 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#0D2630' }}
              >
                <CheckCircle2 style={{ width: 15, height: 15, color: '#22C55E' }} />
                Mark Complete
              </button>
              <button
                type="button"
                onClick={onDiscontinue}
                className={`flex w-full items-center gap-2 px-3.5 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#0D2630' }}
              >
                <Ban style={{ width: 15, height: 15, color: '#EF4444' }} />
                Discontinue Plan
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function CarePlansWorkspace() {
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
              Care Plans
            </h1>
            <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
              View and manage patient care plans.
            </p>
            <div className="mt-5">
              <NursePatientPicker
                onSelect={setSelectedPatient}
                description="Choose a patient from your assigned roster to view or manage care plans."
                actionVerb="care plans"
              />
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <PatientCarePlansPanel
      key={selectedPatient.id}
      patient={selectedPatient}
      onChangePatient={() => setSelectedPatient(null)}
    />
  );
}

function PatientCarePlansPanel({
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

  const [plans, setPlans] = useState<CarePlan[]>(CARE_PLANS);
  const [templates, setTemplates] = useState<CarePlanTemplate[]>(QUICK_CARE_PLAN_TEMPLATES);
  const [tab, setTab] = useState<TabKey>('active');
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(
    CARE_PLANS.find((p) => p.status === 'In Progress')?.id ?? CARE_PLANS[0]?.id ?? null,
  );
  const [detailSection, setDetailSection] = useState<SectionKey>('overview');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [createTemplate, setCreateTemplate] = useState<CarePlanTemplate | null>(null);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [newProgressNote, setNewProgressNote] = useState('');
  const [evalDraft, setEvalDraft] = useState<{ status: EvaluationStatus; note: string } | null>(
    null,
  );
  const [interventionChecks, setInterventionChecks] = useState<Record<string, boolean>>({});
  const [newIntervention, setNewIntervention] = useState('');
  const [nowMs, setNowMs] = useState(0);

  const detailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setNowMs(Date.now()), 0);
    return () => clearTimeout(t);
  }, []);

  const allergyNames = record.allergies.map((a) => a.substance).join(', ');
  const activePlans = plans.filter((p) => p.status === 'In Progress');
  const completedPlans = plans.filter((p) => p.status === 'Completed');

  const tableRows = useMemo(() => {
    if (tab === 'active') return activePlans;
    if (tab === 'completed') return completedPlans;
    if (tab === 'all') return plans;
    return [];
  }, [tab, plans, activePlans, completedPlans]);

  const historyEntries = useMemo(
    () =>
      plans
        .flatMap((p) =>
          p.progressEntries.map((e) => ({
            ...e,
            planProblem: p.problem,
            accentColor: p.accentColor,
          })),
        )
        .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()),
    [plans],
  );

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) ?? null;

  function scrollToDetail() {
    detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function viewPlan(id: string) {
    setSelectedPlanId(id);
    setDetailSection('overview');
    scrollToDetail();
  }

  function updatePlan(id: string, patch: Partial<CarePlan>) {
    setPlans((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function markComplete(id: string) {
    const plan = plans.find((p) => p.id === id);
    if (!plan) return;
    updatePlan(id, { status: 'Completed' });
    toast.success('Care plan completed', `${plan.problem} marked as completed.`);
    setOpenMenuId(null);
  }

  function discontinuePlan(id: string) {
    const plan = plans.find((p) => p.id === id);
    if (!plan) return;
    updatePlan(id, { status: 'Discontinued' });
    toast.info('Care plan discontinued', `${plan.problem} has been discontinued.`);
    setOpenMenuId(null);
  }

  function openEdit(plan: CarePlan) {
    setEditingPlanId(plan.id);
    setOpenMenuId(null);
    setShowCreateModal(true);
  }

  function openCreate() {
    setEditingPlanId(null);
    setCreateTemplate(null);
    setShowCreateModal(true);
  }

  function applyTemplate(tpl: CarePlanTemplate) {
    setEditingPlanId(null);
    setCreateTemplate(tpl);
    setShowCreateModal(true);
  }

  function handleSaveCarePlan(draft: CarePlanDraftInput) {
    const [assignedNurseName, assignedNurseId] = draft.assignedNurse.split('|');
    if (editingPlanId) {
      updatePlan(editingPlanId, {
        problem: draft.problem,
        problemDetail: draft.problemDetail,
        goal: draft.goal,
        startDate: new Date(draft.startDate).toISOString(),
        nextReviewDate: new Date(draft.nextReviewDate).toISOString(),
        assignedNurseName: assignedNurseName ?? nurseName,
        assignedNurseId: assignedNurseId ?? '',
        interventions: draft.interventions,
      });
      toast.success('Care plan updated', `${draft.problem} has been updated.`);
    } else {
      const newPlan: CarePlan = {
        id: `cp-${nowMs}-${plans.length}`,
        planNumber: plans.length + 1,
        accentColor: '#00B4D8',
        problem: draft.problem,
        problemDetail: draft.problemDetail,
        goal: draft.goal,
        startDate: new Date(draft.startDate).toISOString(),
        nextReviewDate: new Date(draft.nextReviewDate).toISOString(),
        status: 'In Progress',
        assignedNurseName: assignedNurseName ?? nurseName,
        assignedNurseId: assignedNurseId ?? '',
        interventions: draft.interventions,
        evaluationStatus: 'Progressing',
        evaluationNote: 'No evaluation recorded yet.',
        progressEntries: [],
      };
      setPlans((prev) => [...prev, newPlan]);
      setSelectedPlanId(newPlan.id);
      setTab('active');
      toast.success('Care plan created', `${draft.problem} added for ${patient.patientName}.`);
    }
    setShowCreateModal(false);
    setEditingPlanId(null);
    setCreateTemplate(null);
  }

  function addProgressNote() {
    if (!selectedPlan || !newProgressNote.trim()) return;
    const newEntry = {
      id: `${selectedPlan.id}-p${nowMs}-${selectedPlan.progressEntries.length}`,
      time: new Date().toISOString(),
      note: newProgressNote.trim(),
      authorName: nurseName,
    };
    updatePlan(selectedPlan.id, {
      progressEntries: [newEntry, ...selectedPlan.progressEntries],
    });
    setNewProgressNote('');
    toast.success('Progress note added', `Logged for ${selectedPlan.problem}.`);
  }

  function startEvalEdit() {
    if (!selectedPlan) return;
    setEvalDraft({ status: selectedPlan.evaluationStatus, note: selectedPlan.evaluationNote });
  }

  function saveEvaluation() {
    if (!selectedPlan || !evalDraft) return;
    updatePlan(selectedPlan.id, {
      evaluationStatus: evalDraft.status,
      evaluationNote: evalDraft.note,
    });
    toast.success('Evaluation saved', `${selectedPlan.problem} evaluation updated.`);
    setEvalDraft(null);
  }

  function addIntervention() {
    if (!selectedPlan || !newIntervention.trim()) return;
    updatePlan(selectedPlan.id, {
      interventions: [...selectedPlan.interventions, newIntervention.trim()],
    });
    setNewIntervention('');
  }

  const editingPlan = editingPlanId ? plans.find((p) => p.id === editingPlanId) : null;

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
              Care Plans
            </span>
          </div>

          {/* ── Header ──────────────────────────────────────────────────── */}
          <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1
                className="font-display font-semibold"
                style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
              >
                Care Plans
              </h1>
              <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                View and manage patient care plans.
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
                  onClick={openCreate}
                  className={`flex h-11 items-center gap-2 rounded-[10px] px-4 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                  style={{ background: '#00B4D8', fontSize: 14 }}
                >
                  <Plus style={{ width: 16, height: 16 }} />
                  Create New Care Plan
                </button>
              </PermissionGate>
              <button
                type="button"
                onClick={() => window.print()}
                className={`flex h-11 items-center gap-2 rounded-[10px] px-4 font-sans font-semibold transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid rgba(0,100,130,0.15)',
                  color: '#0D2630',
                  fontSize: 14,
                }}
              >
                <Printer style={{ width: 16, height: 16 }} />
                Print Care Plan
              </button>
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
              <p style={{ fontSize: 14, color: '#8A98A3' }}>Care Plan Status</p>
              <p className="font-display font-semibold" style={{ fontSize: 16, color: '#16A34A' }}>
                Active Plans: {activePlans.length}
              </p>
            </div>
          </div>

          {/* ── Allergy banner (compliance — every patient-context page) ── */}
          <AllergyBanner allergies={record.allergies} className="mt-4" />

          {/* ── Main content + sidebar ─────────────────────────────────────── */}
          <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-start">
            <div className="flex min-w-0 flex-1 flex-col gap-4">
              <div
                className="rounded-[12px] p-4 sm:p-5"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                {/* Tabs */}
                <div
                  className="flex flex-wrap items-center gap-5 overflow-x-auto scroll-smooth"
                  style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
                >
                  {TABS.map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setTab(t.key)}
                      className={`flex items-center gap-1.5 pb-3 font-sans font-medium whitespace-nowrap transition-colors duration-150 ${FOCUS_RING}`}
                      style={{
                        fontSize: 14,
                        color: tab === t.key ? '#00B4D8' : '#4A7080',
                        borderBottom: tab === t.key ? '2px solid #00B4D8' : '2px solid transparent',
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {tab === 'history' ? (
                  <div className="mt-4">
                    <p
                      className="font-display font-semibold"
                      style={{ fontSize: 16, color: '#0D2630' }}
                    >
                      Care Plan History
                    </p>
                    <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
                      Every progress entry across every care plan, most recent first.
                    </p>
                    {historyEntries.length === 0 ? (
                      <p className="mt-4" style={{ fontSize: 14, color: '#8A98A3' }}>
                        No progress entries recorded yet.
                      </p>
                    ) : (
                      <div className="mt-4 flex flex-col gap-4">
                        {historyEntries.map((e) => (
                          <div key={e.id} className="flex gap-3">
                            <span
                              className="mt-1.5 size-2.5 shrink-0 rounded-full"
                              style={{ background: e.accentColor }}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p
                                  className="font-sans font-medium"
                                  style={{ fontSize: 14, color: '#0D2630' }}
                                >
                                  {e.planProblem}
                                </p>
                                <span style={{ fontSize: 14, color: '#8A98A3' }}>
                                  {formatDateTime(e.time)}
                                </span>
                              </div>
                              <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
                                {e.note}
                              </p>
                              <p style={{ fontSize: 14, color: '#8A98A3' }}>By {e.authorName}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <p
                        className="font-display font-semibold"
                        style={{ fontSize: 16, color: '#0D2630' }}
                      >
                        {TABS.find((t) => t.key === tab)?.label} ({tableRows.length})
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowTimelineModal(true)}
                        className={`flex h-9 items-center gap-2 rounded-[8px] px-3.5 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                        style={{
                          fontSize: 14,
                          color: '#00B4D8',
                          border: '1px solid rgba(0,180,216,0.35)',
                        }}
                      >
                        <Clock style={{ width: 15, height: 15 }} />
                        View Timeline
                      </button>
                    </div>

                    <div className="mt-3 overflow-x-auto scroll-smooth">
                      <div className="min-w-[980px]">
                        <div
                          className="flex items-center rounded-t-[8px]"
                          style={{
                            background: 'rgba(226,237,241,0.4)',
                            borderBottom: '1px solid #E6F8FD',
                          }}
                        >
                          {(
                            [
                              ['#', 'w-9 pl-3'],
                              ['Problem', 'w-36'],
                              ['Goal', 'min-w-[180px] flex-1'],
                              ['Start Date', 'w-24'],
                              ['Next Review', 'w-28'],
                              ['Status', 'w-28'],
                              ['Assigned Nurse', 'w-36'],
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
                            className="sticky right-0 z-10 w-40 shrink-0 py-2.5 pr-3 text-right"
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

                        {tableRows.length === 0 && (
                          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                            <div
                              className="flex size-14 items-center justify-center rounded-full"
                              style={{ background: 'rgba(226,237,241,0.6)' }}
                            >
                              <ListChecks style={{ width: 24, height: 24, color: '#8A98A3' }} />
                            </div>
                            <p
                              className="font-sans font-medium"
                              style={{ fontSize: 16, color: '#4A7080' }}
                            >
                              No care plans here yet
                            </p>
                          </div>
                        )}

                        {tableRows.map((plan) => {
                          const cfg = STATUS_CFG[plan.status];
                          const review = reviewCountdownLabel(plan.nextReviewDate, nowMs);
                          const isMenuOpen = openMenuId === plan.id;
                          const isSelected = selectedPlanId === plan.id;
                          return (
                            <div
                              key={plan.id}
                              className="flex items-start transition-colors duration-100 hover:bg-[#F5FBFD]"
                              style={{
                                borderBottom: '1px solid rgba(0,100,130,0.08)',
                                borderLeft: `4px solid ${plan.accentColor}`,
                                background: isSelected ? '#F5FBFD' : 'transparent',
                              }}
                            >
                              <div className="w-9 shrink-0 py-3 pr-1.5 pl-3">
                                <div
                                  className="flex size-7 items-center justify-center rounded-full font-sans font-semibold"
                                  style={{
                                    fontSize: 14,
                                    color: plan.accentColor,
                                    background: `${plan.accentColor}1A`,
                                  }}
                                >
                                  {plan.planNumber}
                                </div>
                              </div>
                              <div className="w-36 shrink-0 py-3 pr-1.5">
                                <p
                                  className="truncate font-sans font-medium"
                                  style={{ fontSize: 14, color: '#0D2630' }}
                                >
                                  {plan.problem}
                                </p>
                                <p className="truncate" style={{ fontSize: 14, color: '#8A98A3' }}>
                                  {plan.problemDetail}
                                </p>
                              </div>
                              <div className="min-w-[180px] flex-1 py-3 pr-1.5">
                                <p style={{ fontSize: 14, color: '#0D2630' }}>{plan.goal}</p>
                              </div>
                              <div className="w-24 shrink-0 py-3 pr-1.5">
                                <p style={{ fontSize: 14, color: '#0D2630' }}>
                                  {formatDate(plan.startDate)}
                                </p>
                              </div>
                              <div className="w-28 shrink-0 py-3 pr-1.5">
                                <p style={{ fontSize: 14, color: '#0D2630' }}>
                                  {formatDate(plan.nextReviewDate)}
                                </p>
                                <p style={{ fontSize: 14, color: review.color }}>
                                  ({review.label})
                                </p>
                              </div>
                              <div className="w-28 shrink-0 py-3 pr-1.5">
                                <span
                                  className="inline-block rounded-full px-2 py-0.5 font-sans font-medium whitespace-nowrap"
                                  style={{
                                    fontSize: 14,
                                    color: cfg.color,
                                    border: `1px solid ${cfg.border}`,
                                    background: cfg.bg,
                                  }}
                                >
                                  {plan.status}
                                </span>
                              </div>
                              <div className="w-36 shrink-0 py-3 pr-1.5">
                                <div className="flex items-center gap-2">
                                  <div
                                    className="font-display flex size-7 shrink-0 items-center justify-center rounded-full font-semibold text-white"
                                    style={{
                                      background: avatarColorFor(plan.assignedNurseName),
                                      fontSize: 14,
                                    }}
                                  >
                                    {initialsOf(plan.assignedNurseName)}
                                  </div>
                                  <div className="min-w-0">
                                    <p
                                      className="truncate font-sans font-medium"
                                      style={{ fontSize: 14, color: '#0D2630' }}
                                    >
                                      {plan.assignedNurseName}
                                    </p>
                                    <p
                                      className="truncate"
                                      style={{ fontSize: 14, color: '#8A98A3' }}
                                    >
                                      {plan.assignedNurseId}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <div
                                className={`sticky right-0 flex w-40 shrink-0 items-center justify-end gap-1 py-3 pr-3 ${isMenuOpen ? 'z-30' : 'z-10'}`}
                                style={{ background: isSelected ? '#F5FBFD' : '#FFFFFF' }}
                              >
                                <button
                                  type="button"
                                  onClick={() => viewPlan(plan.id)}
                                  className={`flex h-11 items-center gap-1.5 rounded-[10px] px-3.5 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                                  style={{
                                    fontSize: 14,
                                    color: '#00B4D8',
                                    border: '1px solid rgba(0,180,216,0.35)',
                                  }}
                                >
                                  View Plan
                                </button>
                                <PermissionGate permission={PERMISSIONS.ENCOUNTERS_WRITE}>
                                  <RowMenu
                                    status={plan.status}
                                    open={isMenuOpen}
                                    onToggle={() => setOpenMenuId(isMenuOpen ? null : plan.id)}
                                    onEdit={() => openEdit(plan)}
                                    onComplete={() => markComplete(plan.id)}
                                    onDiscontinue={() => discontinuePlan(plan.id)}
                                  />
                                </PermissionGate>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    {tableRows.length > 0 && (
                      <p className="mt-3" style={{ fontSize: 14, color: '#4A7080' }}>
                        Showing 1 to {tableRows.length} of {tableRows.length} care plans
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* ── Care Plan Details (master-detail) ────────────────────── */}
              <div ref={detailRef} className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div
                  className="flex w-full shrink-0 flex-col gap-1 rounded-[12px] p-2 sm:w-52"
                  style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                >
                  <p
                    className="font-display px-2.5 py-2 font-semibold"
                    style={{ fontSize: 16, color: '#0D2630' }}
                  >
                    Care Plan Details
                  </p>
                  {SECTIONS.map((s) => {
                    const Icon = s.icon;
                    const active = detailSection === s.key;
                    return (
                      <button
                        key={s.key}
                        type="button"
                        onClick={() => setDetailSection(s.key)}
                        className={`flex h-11 items-center gap-2.5 rounded-[8px] px-2.5 font-sans font-medium transition-colors duration-150 ${FOCUS_RING}`}
                        style={{
                          fontSize: 14,
                          color: active ? '#00B4D8' : '#4A7080',
                          background: active ? '#E6F8FD' : 'transparent',
                        }}
                      >
                        <Icon style={{ width: 16, height: 16, flexShrink: 0 }} />
                        {s.label}
                      </button>
                    );
                  })}
                </div>

                <div
                  className="min-w-0 flex-1 rounded-[12px] p-4 sm:p-5"
                  style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                >
                  {!selectedPlan ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                      <div
                        className="flex size-14 items-center justify-center rounded-full"
                        style={{ background: 'rgba(226,237,241,0.6)' }}
                      >
                        <ListChecks style={{ width: 24, height: 24, color: '#8A98A3' }} />
                      </div>
                      <p
                        className="font-sans font-medium"
                        style={{ fontSize: 16, color: '#4A7080' }}
                      >
                        Select &quot;View Plan&quot; on a care plan above to see its details.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h2
                              className="font-display font-semibold"
                              style={{ fontSize: 20, color: '#0D2630' }}
                            >
                              {selectedPlan.problem}
                            </h2>
                            <span
                              className="inline-block rounded-full px-2 py-0.5 font-sans font-medium whitespace-nowrap"
                              style={{
                                fontSize: 14,
                                color: STATUS_CFG[selectedPlan.status].color,
                                border: `1px solid ${STATUS_CFG[selectedPlan.status].border}`,
                                background: STATUS_CFG[selectedPlan.status].bg,
                              }}
                            >
                              {selectedPlan.status}
                            </span>
                          </div>
                          <p className="mt-0.5" style={{ fontSize: 14, color: '#8A98A3' }}>
                            {selectedPlan.problemDetail}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-6">
                          <div>
                            <p style={{ fontSize: 14, color: '#8A98A3' }}>Start Date</p>
                            <p
                              className="font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {formatDate(selectedPlan.startDate)}
                            </p>
                          </div>
                          <div>
                            <p style={{ fontSize: 14, color: '#8A98A3' }}>Next Review</p>
                            <p
                              className="font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {formatDate(selectedPlan.nextReviewDate)}
                            </p>
                          </div>
                          <div>
                            <p style={{ fontSize: 14, color: '#8A98A3' }}>Assigned Nurse</p>
                            <div className="mt-0.5 flex items-center gap-1.5">
                              <div
                                className="font-display flex size-6 shrink-0 items-center justify-center rounded-full font-semibold text-white"
                                style={{
                                  background: avatarColorFor(selectedPlan.assignedNurseName),
                                  fontSize: 14,
                                }}
                              >
                                {initialsOf(selectedPlan.assignedNurseName)}
                              </div>
                              <p
                                className="font-sans font-medium"
                                style={{ fontSize: 14, color: '#0D2630' }}
                              >
                                {selectedPlan.assignedNurseName}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {detailSection === 'overview' && (
                        <>
                          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div
                              className="rounded-[12px] p-4 shadow-sm"
                              style={{
                                background: 'rgba(239,68,68,0.05)',
                                border: '1px solid rgba(239,68,68,0.2)',
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className="flex size-8 shrink-0 items-center justify-center rounded-full"
                                  style={{ background: 'rgba(239,68,68,0.12)' }}
                                >
                                  <AlertTriangle
                                    style={{ width: 15, height: 15, color: '#EF4444' }}
                                  />
                                </div>
                                <p
                                  className="font-sans font-semibold"
                                  style={{ fontSize: 14, color: '#7F1D1D' }}
                                >
                                  Problem
                                </p>
                              </div>
                              <p
                                className="mt-2 font-sans font-medium"
                                style={{ fontSize: 14, color: '#0D2630' }}
                              >
                                {selectedPlan.problem}
                              </p>
                              <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
                                as evidenced by patient verbalization.
                              </p>
                            </div>
                            <div
                              className="rounded-[12px] p-4 shadow-sm"
                              style={{
                                background: 'rgba(59,130,246,0.05)',
                                border: '1px solid rgba(59,130,246,0.2)',
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className="flex size-8 shrink-0 items-center justify-center rounded-full"
                                  style={{ background: 'rgba(59,130,246,0.12)' }}
                                >
                                  <Target style={{ width: 15, height: 15, color: '#3B82F6' }} />
                                </div>
                                <p
                                  className="font-sans font-semibold"
                                  style={{ fontSize: 14, color: '#1E3A8A' }}
                                >
                                  Goal
                                </p>
                              </div>
                              <p className="mt-2" style={{ fontSize: 14, color: '#0D2630' }}>
                                {selectedPlan.goal}
                              </p>
                            </div>
                            <div
                              className="rounded-[12px] p-4 shadow-sm"
                              style={{
                                background: 'rgba(0,180,216,0.05)',
                                border: '1px solid rgba(0,180,216,0.2)',
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className="flex size-8 shrink-0 items-center justify-center rounded-full"
                                  style={{ background: 'rgba(0,180,216,0.12)' }}
                                >
                                  <ListChecks style={{ width: 15, height: 15, color: '#00B4D8' }} />
                                </div>
                                <p
                                  className="font-sans font-semibold"
                                  style={{ fontSize: 14, color: '#0D2630' }}
                                >
                                  Interventions
                                </p>
                              </div>
                              <div className="mt-2 flex flex-col gap-1.5">
                                {selectedPlan.interventions.slice(0, 4).map((iv) => (
                                  <div key={iv} className="flex items-start gap-1.5">
                                    <CheckCircle2
                                      style={{
                                        width: 13,
                                        height: 13,
                                        color: '#22C55E',
                                        flexShrink: 0,
                                        marginTop: 2,
                                      }}
                                    />
                                    <p style={{ fontSize: 14, color: '#4A7080' }}>{iv}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div
                              className="rounded-[12px] p-4 shadow-sm"
                              style={{
                                background: 'rgba(245,158,11,0.05)',
                                border: '1px solid rgba(245,158,11,0.2)',
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className="flex size-8 shrink-0 items-center justify-center rounded-full"
                                  style={{ background: 'rgba(245,158,11,0.12)' }}
                                >
                                  <Gauge style={{ width: 15, height: 15, color: '#F59E0B' }} />
                                </div>
                                <p
                                  className="font-sans font-semibold"
                                  style={{ fontSize: 14, color: '#0D2630' }}
                                >
                                  Evaluation
                                </p>
                              </div>
                              <p
                                className="mt-2 font-sans font-medium"
                                style={{
                                  fontSize: 14,
                                  color: EVALUATION_CFG[selectedPlan.evaluationStatus].color,
                                }}
                              >
                                {selectedPlan.evaluationStatus}
                              </p>
                              <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
                                {selectedPlan.evaluationNote}
                              </p>
                            </div>
                          </div>

                          <div className="mt-5">
                            <p
                              className="font-sans font-semibold"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              Progress Timeline (Last{' '}
                              {Math.min(3, selectedPlan.progressEntries.length)} Entries)
                            </p>
                            {selectedPlan.progressEntries.length === 0 ? (
                              <p className="mt-2" style={{ fontSize: 14, color: '#8A98A3' }}>
                                No progress entries recorded yet.
                              </p>
                            ) : (
                              <div className="mt-3 flex flex-col gap-3">
                                {selectedPlan.progressEntries.slice(0, 3).map((e) => (
                                  <div key={e.id} className="flex gap-3">
                                    <span
                                      className="mt-1.5 size-2.5 shrink-0 rounded-full"
                                      style={{ background: selectedPlan.accentColor }}
                                    />
                                    <div className="min-w-0 flex-1">
                                      <p style={{ fontSize: 14, color: '#8A98A3' }}>
                                        {formatDateTime(e.time)}
                                      </p>
                                      <p style={{ fontSize: 14, color: '#0D2630' }}>{e.note}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => setDetailSection('timeline')}
                              className={`mt-2 font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                              style={{ fontSize: 14, color: '#00B4D8' }}
                            >
                              View Full Timeline
                            </button>
                          </div>
                        </>
                      )}

                      {detailSection === 'interventions' && (
                        <div className="mt-4">
                          <div className="flex flex-col gap-1.5">
                            {selectedPlan.interventions.map((iv, i) => {
                              const key = `${selectedPlan.id}-${i}`;
                              return (
                                <label
                                  key={key}
                                  className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-[8px] py-1 transition-colors duration-150 hover:bg-[#F5FBFD]"
                                >
                                  <input
                                    type="checkbox"
                                    checked={Boolean(interventionChecks[key])}
                                    onChange={() =>
                                      setInterventionChecks((prev) => ({
                                        ...prev,
                                        [key]: !prev[key],
                                      }))
                                    }
                                    className="size-4 shrink-0 cursor-pointer rounded"
                                    style={{ accentColor: '#00B4D8' }}
                                  />
                                  <span
                                    style={{
                                      fontSize: 14,
                                      color: '#0D2630',
                                      textDecoration: interventionChecks[key]
                                        ? 'line-through'
                                        : 'none',
                                    }}
                                  >
                                    {iv}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                          <PermissionGate permission={PERMISSIONS.ENCOUNTERS_WRITE}>
                            <div className="mt-3 flex items-center gap-2">
                              <input
                                type="text"
                                value={newIntervention}
                                onChange={(e) => setNewIntervention(e.target.value)}
                                placeholder="Add an intervention..."
                                className={`h-11 w-full rounded-[10px] px-3.5 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                                style={{
                                  fontSize: 14,
                                  border: '1px solid rgba(0,100,130,0.18)',
                                  color: '#0D2630',
                                }}
                              />
                              <button
                                type="button"
                                onClick={addIntervention}
                                className={`flex h-11 shrink-0 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                                style={{ fontSize: 14, background: '#00B4D8' }}
                              >
                                <Plus style={{ width: 16, height: 16 }} />
                                Add
                              </button>
                            </div>
                          </PermissionGate>
                        </div>
                      )}

                      {detailSection === 'progress' && (
                        <div className="mt-4">
                          <PermissionGate permission={PERMISSIONS.ENCOUNTERS_WRITE}>
                            <div className="flex items-start gap-2">
                              <textarea
                                value={newProgressNote}
                                onChange={(e) => setNewProgressNote(e.target.value.slice(0, 500))}
                                rows={2}
                                placeholder="Add a progress note..."
                                className={`w-full resize-none rounded-[10px] px-3.5 py-2.5 font-sans transition-colors duration-150 outline-none focus:border-[#00B4D8] focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                                style={{
                                  fontSize: 14,
                                  border: '1px solid rgba(0,100,130,0.18)',
                                  color: '#0D2630',
                                }}
                              />
                              <button
                                type="button"
                                onClick={addProgressNote}
                                disabled={!newProgressNote.trim()}
                                className={`flex h-11 shrink-0 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING}`}
                                style={{ fontSize: 14, background: '#00B4D8' }}
                              >
                                Add Note
                              </button>
                            </div>
                          </PermissionGate>
                          <div className="mt-4 flex flex-col gap-3">
                            {selectedPlan.progressEntries.length === 0 ? (
                              <p style={{ fontSize: 14, color: '#8A98A3' }}>
                                No progress entries recorded yet.
                              </p>
                            ) : (
                              selectedPlan.progressEntries.map((e) => (
                                <div
                                  key={e.id}
                                  className="rounded-[10px] p-3"
                                  style={{
                                    background: '#F5FBFD',
                                    border: '1px solid rgba(0,100,130,0.08)',
                                  }}
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p
                                      className="font-sans font-medium"
                                      style={{ fontSize: 14, color: '#0D2630' }}
                                    >
                                      {e.authorName}
                                    </p>
                                    <p style={{ fontSize: 14, color: '#8A98A3' }}>
                                      {formatDateTime(e.time)}
                                    </p>
                                  </div>
                                  <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
                                    {e.note}
                                  </p>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}

                      {detailSection === 'evaluations' && (
                        <div className="mt-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p style={{ fontSize: 14, color: '#8A98A3' }}>Current Evaluation</p>
                              <p
                                className="font-sans font-semibold"
                                style={{
                                  fontSize: 16,
                                  color: EVALUATION_CFG[selectedPlan.evaluationStatus].color,
                                }}
                              >
                                {selectedPlan.evaluationStatus}
                              </p>
                            </div>
                            {!evalDraft && (
                              <PermissionGate permission={PERMISSIONS.ENCOUNTERS_WRITE}>
                                <button
                                  type="button"
                                  onClick={startEvalEdit}
                                  className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                                  style={{
                                    fontSize: 14,
                                    color: '#00B4D8',
                                    border: '1px solid rgba(0,180,216,0.35)',
                                  }}
                                >
                                  <Pencil style={{ width: 15, height: 15 }} />
                                  Update Evaluation
                                </button>
                              </PermissionGate>
                            )}
                          </div>
                          <p className="mt-2" style={{ fontSize: 14, color: '#4A7080' }}>
                            {selectedPlan.evaluationNote}
                          </p>

                          {evalDraft && (
                            <div className="mt-3 flex flex-col gap-3">
                              <div className="flex flex-wrap gap-2">
                                {EVALUATION_OPTIONS.map((opt) => (
                                  <button
                                    key={opt}
                                    type="button"
                                    onClick={() => setEvalDraft({ ...evalDraft, status: opt })}
                                    className={`flex h-9 items-center rounded-full px-3.5 font-sans font-medium transition-colors duration-150 ${FOCUS_RING}`}
                                    style={{
                                      fontSize: 14,
                                      color:
                                        evalDraft.status === opt
                                          ? '#FFFFFF'
                                          : EVALUATION_CFG[opt].color,
                                      background:
                                        evalDraft.status === opt
                                          ? EVALUATION_CFG[opt].color
                                          : `${EVALUATION_CFG[opt].color}1A`,
                                    }}
                                  >
                                    {opt}
                                  </button>
                                ))}
                              </div>
                              <textarea
                                value={evalDraft.note}
                                onChange={(e) =>
                                  setEvalDraft({ ...evalDraft, note: e.target.value.slice(0, 500) })
                                }
                                rows={3}
                                className={`w-full resize-none rounded-[10px] px-3.5 py-2.5 font-sans transition-colors duration-150 outline-none focus:border-[#00B4D8] focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                                style={{
                                  fontSize: 14,
                                  border: '1px solid rgba(0,100,130,0.18)',
                                  color: '#0D2630',
                                }}
                              />
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setEvalDraft(null)}
                                  className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                                  style={{
                                    fontSize: 14,
                                    color: '#0D2630',
                                    border: '1px solid rgba(0,100,130,0.2)',
                                  }}
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={saveEvaluation}
                                  className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                                  style={{ fontSize: 14, background: '#00B4D8' }}
                                >
                                  Save Evaluation
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {detailSection === 'timeline' && (
                        <div className="mt-4">
                          {selectedPlan.progressEntries.length === 0 ? (
                            <p style={{ fontSize: 14, color: '#8A98A3' }}>
                              No progress entries recorded yet.
                            </p>
                          ) : (
                            <div className="flex flex-col gap-4">
                              {selectedPlan.progressEntries.map((e, i) => (
                                <div key={e.id} className="flex gap-3">
                                  <div className="flex flex-col items-center">
                                    <span
                                      className="size-2.5 shrink-0 rounded-full"
                                      style={{ background: selectedPlan.accentColor }}
                                    />
                                    {i < selectedPlan.progressEntries.length - 1 && (
                                      <span
                                        className="w-px flex-1"
                                        style={{
                                          background: 'rgba(0,100,130,0.15)',
                                          minHeight: 24,
                                        }}
                                      />
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1 pb-1">
                                    <p style={{ fontSize: 14, color: '#8A98A3' }}>
                                      {formatDateTime(e.time)}
                                    </p>
                                    <p style={{ fontSize: 14, color: '#0D2630' }}>{e.note}</p>
                                    <p style={{ fontSize: 14, color: '#8A98A3' }}>
                                      By {e.authorName}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {detailSection === 'documents' && (
                        <div className="mt-4">
                          {(() => {
                            const docs = CARE_PLAN_DOCUMENTS.filter(
                              (d) => d.planId === selectedPlan.id,
                            );
                            return docs.length === 0 ? (
                              <p style={{ fontSize: 14, color: '#8A98A3' }}>
                                No documents attached to this care plan yet.
                              </p>
                            ) : (
                              <div className="flex flex-col gap-2.5">
                                {docs.map((doc) => (
                                  <div
                                    key={doc.id}
                                    className="flex items-center gap-3 rounded-[10px] p-3"
                                    style={{ border: '1px solid rgba(0,100,130,0.12)' }}
                                  >
                                    <div
                                      className="flex size-11 shrink-0 items-center justify-center rounded-[10px]"
                                      style={{ background: 'rgba(0,180,216,0.1)' }}
                                    >
                                      <FileText
                                        style={{ width: 18, height: 18, color: '#00B4D8' }}
                                      />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p
                                        className="truncate font-sans font-medium"
                                        style={{ fontSize: 14, color: '#0D2630' }}
                                      >
                                        {doc.name}
                                      </p>
                                      <p style={{ fontSize: 14, color: '#8A98A3' }}>
                                        {formatDateTime(doc.time)} · {doc.size}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                          <button
                            type="button"
                            disabled
                            aria-disabled="true"
                            className="mt-3 flex h-11 w-full cursor-not-allowed items-center justify-center gap-2 rounded-[10px] font-sans font-medium"
                            style={{
                              fontSize: 14,
                              color: '#8A98A3',
                              border: '1px dashed rgba(0,100,130,0.3)',
                              background: '#F5FBFD',
                            }}
                          >
                            <Paperclip style={{ width: 16, height: 16 }} />
                            Upload Document (Future)
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* ── Sidebar ─────────────────────────────────────────────────── */}
            <div className="flex w-full shrink-0 flex-col gap-4 xl:w-[280px]">
              <div
                className="rounded-[12px] p-4 sm:p-5"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <h2
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Care Plan Summary
                </h2>
                <CarePlanSummaryDonut plans={plans} />
              </div>

              <div
                className="rounded-[12px] p-4 sm:p-5"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <h2
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Next Reviews
                </h2>
                <div className="mt-3 flex flex-col gap-2.5">
                  {activePlans.map((plan) => {
                    const review = reviewCountdownLabel(plan.nextReviewDate, nowMs);
                    return (
                      <div key={plan.id} className="flex items-center justify-between gap-2">
                        <p
                          className="truncate font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {plan.problem}
                        </p>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <span style={{ fontSize: 14, color: '#0D2630' }}>
                            {formatHumanDate(plan.nextReviewDate)}
                          </span>
                          <span style={{ fontSize: 14, color: review.color }}>
                            ({review.label})
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => setTab('active')}
                  className={`mt-2 font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                  style={{ fontSize: 14, color: '#00B4D8' }}
                >
                  View All Reviews
                </button>
              </div>

              <div
                className="rounded-[12px] p-4 sm:p-5"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <h2
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Quick Templates
                </h2>
                <div className="mt-3 flex flex-col gap-2">
                  {templates.map((tpl) => {
                    const Icon = TEMPLATE_ICON[tpl.id] ?? NotebookPen;
                    return (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => applyTemplate(tpl)}
                        className={`flex h-11 items-center gap-2 rounded-[10px] px-3 font-sans font-medium transition-opacity duration-150 hover:opacity-85 ${FOCUS_RING}`}
                        style={{
                          fontSize: 14,
                          color: '#00B4D8',
                          background: 'rgba(0,180,216,0.08)',
                          border: '1px solid rgba(0,180,216,0.25)',
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
                    Recent Progress Notes
                  </h2>
                  <button
                    type="button"
                    onClick={() => setShowTimelineModal(true)}
                    className={`font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                    style={{ fontSize: 14, color: '#00B4D8' }}
                  >
                    View All
                  </button>
                </div>
                <div className="mt-3 flex flex-col gap-3">
                  {historyEntries.slice(0, 2).map((e) => (
                    <div key={e.id} className="flex items-start gap-2.5">
                      <div
                        className="flex size-9 shrink-0 items-center justify-center rounded-[8px]"
                        style={{ background: 'rgba(0,180,216,0.1)' }}
                      >
                        <NotebookPen style={{ width: 15, height: 15, color: '#00B4D8' }} />
                      </div>
                      <div className="min-w-0">
                        <p style={{ fontSize: 14, color: '#8A98A3' }}>{formatDateTime(e.time)}</p>
                        <p style={{ fontSize: 14, color: '#0D2630' }}>{e.note}</p>
                        <p style={{ fontSize: 14, color: '#8A98A3' }}>By {e.authorName}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="h-4" />
        </div>
      </main>

      {showCreateModal &&
        (() => {
          const initialValue = editingPlan
            ? {
                problem: editingPlan.problem,
                problemDetail: editingPlan.problemDetail,
                goal: editingPlan.goal,
                startDateIso: editingPlan.startDate,
                nextReviewIso: editingPlan.nextReviewDate,
                assignedNurse: `${editingPlan.assignedNurseName}|${editingPlan.assignedNurseId}`,
                interventions: editingPlan.interventions,
              }
            : createTemplate
              ? {
                  problem: createTemplate.problem,
                  problemDetail: createTemplate.problemDetail,
                  goal: createTemplate.goal,
                  interventions: createTemplate.interventions,
                }
              : null;
          return (
            <CreateCarePlanModal
              patientName={patient.patientName}
              isEdit={Boolean(editingPlanId)}
              {...(initialValue ? { initial: initialValue } : {})}
              onClose={() => {
                setShowCreateModal(false);
                setEditingPlanId(null);
                setCreateTemplate(null);
              }}
              onSave={handleSaveCarePlan}
            />
          );
        })()}

      {showTemplatesModal && (
        <ManageCarePlanTemplatesModal
          templates={templates}
          onSave={(next) => {
            setTemplates(next);
            setShowTemplatesModal(false);
            toast.success('Templates updated', 'Your care plan templates have been saved.');
          }}
          onClose={() => setShowTemplatesModal(false)}
        />
      )}

      {showTimelineModal && (
        <CarePlanTimelineModal
          plans={activePlans.length > 0 ? activePlans : plans}
          patientName={patient.patientName}
          onClose={() => setShowTimelineModal(false)}
        />
      )}
    </div>
  );
}

function CarePlanSummaryDonut({ plans }: { plans: CarePlan[] }) {
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    let raf1 = 0;
    let raf2 = 0;
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setAnimate(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, []);

  const counts: { label: CarePlanStatus; color: string; value: number }[] = [
    {
      label: 'In Progress',
      color: STATUS_CFG['In Progress'].color,
      value: plans.filter((p) => p.status === 'In Progress').length,
    },
    {
      label: 'Completed',
      color: STATUS_CFG.Completed.color,
      value: plans.filter((p) => p.status === 'Completed').length,
    },
    {
      label: 'Discontinued',
      color: STATUS_CFG.Discontinued.color,
      value: plans.filter((p) => p.status === 'Discontinued').length,
    },
  ];
  const total = plans.length || 1;
  const radius = 54;
  const strokeWidth = 20;
  const circumference = 2 * Math.PI * radius;
  const gapPx = 3;

  let cumulative = 0;
  const segments = counts.map((d) => {
    const rawLength = (d.value / total) * circumference;
    const offset = -(cumulative / total) * circumference;
    cumulative += d.value;
    return { ...d, length: Math.max(0, rawLength - gapPx), offset };
  });

  return (
    <div className="mt-2 flex flex-col items-center gap-4 sm:flex-row sm:items-center">
      <div
        className="relative flex shrink-0 items-center justify-center"
        style={{ width: 130, height: 130 }}
      >
        <svg
          viewBox="0 0 128 128"
          style={{ width: 130, height: 130 }}
          role="img"
          aria-label="Care plan summary donut chart"
        >
          <g transform="rotate(-90 64 64)">
            {segments.map((seg, i) => (
              <circle
                key={seg.label}
                cx={64}
                cy={64}
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth={strokeWidth}
                strokeLinecap="butt"
                strokeDasharray={`${animate ? seg.length : 0} ${circumference}`}
                strokeDashoffset={seg.offset}
                style={{
                  transition: `stroke-dasharray 0.8s cubic-bezier(0.22,1,0.36,1) ${i * 100}ms`,
                }}
              />
            ))}
          </g>
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="font-display font-bold" style={{ fontSize: 20, color: '#0D2630' }}>
            {plans.length}
          </span>
          <span style={{ fontSize: 14, color: '#8A98A3' }}>Total Plans</span>
        </div>
      </div>
      <div className="flex w-full min-w-0 flex-1 flex-col gap-2">
        {counts.map((d) => (
          <div key={d.label} className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: d.color }} />
              <span className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                {d.label}
              </span>
            </div>
            <span
              className="shrink-0 font-sans font-medium"
              style={{ fontSize: 14, color: '#0D2630' }}
            >
              {d.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
