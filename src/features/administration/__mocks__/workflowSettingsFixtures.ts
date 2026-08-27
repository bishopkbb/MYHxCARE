/**
 * Mock fixtures for the Department Workflows tab of Workflow Settings
 * (`/admin/workflow-settings`). Keyed to the same 8 `OrganizationalDepartment`
 * values as Staff Management / Roles & Permissions / Departments / Service &
 * Pricing, reusing `DEPARTMENT_ICONS` from `departmentsFixtures.ts` so a
 * department reads with the same icon on every screen it appears on.
 *
 * Clinical / Consultation's stages and performance numbers match the
 * reference mockup exactly. The stat cards above the tabs are computed live
 * from this real 8-row data set (`computeWorkflowStats()`), not hardcoded to
 * the mockup's own arbitrary totals: the department taxonomy is fixed at 8
 * real departments, so matching an unrelated static number would mean
 * fabricating workflows with no department, the same trade-off already made
 * for Departments and Service & Pricing.
 *
 * Swap out by pointing hooks to a real workflow-configuration endpoint in
 * Phase 6.
 */

import {
  BadgeCheck,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  FileCheck2,
  FileSearch,
  FlaskConical,
  Microscope,
  Pill,
  Receipt,
  Stethoscope,
  UserCheck,
  UserPlus,
  type LucideIcon,
} from 'lucide-react';

import type { OrganizationalDepartment } from '@/constants/organizationalDepartments';
import { DEPARTMENT_ICONS } from '@/features/administration/__mocks__/departmentsFixtures';

export type StageRequirement = 'required' | 'optional';

export type WorkflowStage = {
  id: string;
  order: number;
  title: string;
  description: string;
  icon: LucideIcon;
  requirement: StageRequirement;
  autoComplete: boolean;
};

export type WorkflowStatus = 'Active' | 'Inactive';
export type WorkflowType = 'Standard' | 'Custom';

export type WorkflowSettingsFlags = {
  allowStageReversion: boolean;
  requireCompletionInOrder: boolean;
  allowDraftSave: boolean;
  autoAssignNextStage: boolean;
};

export type WorkflowPerformance = {
  totalExecutions: number;
  completed: number;
  inProgress: number;
  cancelled: number;
};

export type DepartmentWorkflow = {
  id: string;
  department: OrganizationalDepartment;
  name: string;
  description: string;
  status: WorkflowStatus;
  workflowType: WorkflowType;
  stages: WorkflowStage[];
  settings: WorkflowSettingsFlags;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
  performance: WorkflowPerformance;
};

function stage(
  id: string,
  order: number,
  title: string,
  description: string,
  icon: LucideIcon,
  requirement: StageRequirement,
  autoComplete = false,
): WorkflowStage {
  return { id, order, title, description, icon, requirement, autoComplete };
}

const STANDARD_SETTINGS: WorkflowSettingsFlags = {
  allowStageReversion: false,
  requireCompletionInOrder: true,
  allowDraftSave: true,
  autoAssignNextStage: true,
};

export const WORKFLOW_DEFINITIONS: DepartmentWorkflow[] = [
  {
    id: 'wf-clinical-consultation',
    department: 'Clinical / Consultation',
    name: 'Clinical / Consultation Workflow',
    description: 'Configure the patient consultation process flow from registration to completion.',
    status: 'Active',
    workflowType: 'Standard',
    stages: [
      stage(
        'stg-cc-1',
        1,
        'Patient Registration',
        'Patient check-in and registration',
        UserPlus,
        'required',
      ),
      stage(
        'stg-cc-2',
        2,
        'Triage / Assessment',
        'Initial assessment by nurse',
        ClipboardList,
        'required',
      ),
      stage(
        'stg-cc-3',
        3,
        'Consultation',
        'Doctor consultation and diagnosis',
        Stethoscope,
        'required',
      ),
      stage('stg-cc-4', 4, 'Prescription', 'Create and review prescription', Pill, 'required'),
      stage(
        'stg-cc-5',
        5,
        'Consultation Complete',
        'Close consultation and update records',
        CheckCircle2,
        'required',
        true,
      ),
    ],
    settings: { ...STANDARD_SETTINGS },
    createdBy: 'Admin User',
    createdAt: '2026-04-12T10:30:00+01:00',
    updatedAt: '2026-05-18T09:45:00+01:00',
    updatedBy: 'Admin User',
    performance: { totalExecutions: 312, completed: 298, inProgress: 12, cancelled: 2 },
  },
  {
    id: 'wf-nursing-wards',
    department: 'Nursing / Wards',
    name: 'Nursing / Wards Workflow',
    description: 'Configure the admission and ward care process flow.',
    status: 'Active',
    workflowType: 'Standard',
    stages: [
      stage('stg-nw-1', 1, 'Admission', 'Patient admitted to ward', UserPlus, 'required'),
      stage(
        'stg-nw-2',
        2,
        'Initial Assessment',
        'Nursing assessment and care plan setup',
        ClipboardList,
        'required',
      ),
      stage(
        'stg-nw-3',
        3,
        'Care Plan',
        'Ongoing nursing care and observation',
        ClipboardCheck,
        'required',
      ),
      stage(
        'stg-nw-4',
        4,
        'Discharge Planning',
        'Prepare discharge summary and instructions',
        FileSearch,
        'required',
      ),
      stage(
        'stg-nw-5',
        5,
        'Discharge Complete',
        'Patient discharged and records closed',
        CheckCircle2,
        'required',
        true,
      ),
    ],
    settings: { ...STANDARD_SETTINGS },
    createdBy: 'Admin User',
    createdAt: '2026-04-12T10:35:00+01:00',
    updatedAt: '2026-05-10T14:20:00+01:00',
    updatedBy: 'Admin User',
    performance: { totalExecutions: 186, completed: 171, inProgress: 11, cancelled: 4 },
  },
  {
    id: 'wf-pharmacy',
    department: 'Pharmacy',
    name: 'Pharmacy Workflow',
    description: 'Configure the prescription dispensing process flow.',
    status: 'Active',
    workflowType: 'Standard',
    stages: [
      stage(
        'stg-ph-1',
        1,
        'Prescription Received',
        'Prescription received from consultation',
        FileSearch,
        'required',
      ),
      stage(
        'stg-ph-2',
        2,
        'Verification',
        'Pharmacist verifies dosage and interactions',
        FileCheck2,
        'required',
      ),
      stage('stg-ph-3', 3, 'Dispensing', 'Medication picked and dispensed', Pill, 'required'),
      stage('stg-ph-4', 4, 'Counseling', 'Patient counseled on usage', UserCheck, 'optional'),
      stage(
        'stg-ph-5',
        5,
        'Complete',
        'Dispensing closed and inventory updated',
        CheckCircle2,
        'required',
        true,
      ),
    ],
    settings: { ...STANDARD_SETTINGS },
    createdBy: 'Admin User',
    createdAt: '2026-04-12T10:40:00+01:00',
    updatedAt: '2026-05-14T11:05:00+01:00',
    updatedBy: 'Admin User',
    performance: { totalExecutions: 421, completed: 402, inProgress: 15, cancelled: 4 },
  },
  {
    id: 'wf-laboratory',
    department: 'Laboratory',
    name: 'Laboratory Workflow',
    description: 'Configure the sample-to-result testing process flow.',
    status: 'Active',
    workflowType: 'Standard',
    stages: [
      stage(
        'stg-lb-1',
        1,
        'Sample Collection',
        'Sample collected from patient',
        FlaskConical,
        'required',
      ),
      stage(
        'stg-lb-2',
        2,
        'Reception',
        'Sample received and logged at bench',
        ClipboardList,
        'required',
      ),
      stage(
        'stg-lb-3',
        3,
        'Testing',
        'Sample analyzed by instrument or manual method',
        Microscope,
        'required',
      ),
      stage(
        'stg-lb-4',
        4,
        'Result Verification',
        'Scientist verifies and releases result',
        FileCheck2,
        'required',
      ),
      stage(
        'stg-lb-5',
        5,
        'Result Published',
        'Result published to ordering clinician',
        CheckCircle2,
        'required',
        true,
      ),
    ],
    settings: { ...STANDARD_SETTINGS },
    createdBy: 'Admin User',
    createdAt: '2026-04-12T10:45:00+01:00',
    updatedAt: '2026-05-16T08:30:00+01:00',
    updatedBy: 'Admin User',
    performance: { totalExecutions: 567, completed: 541, inProgress: 21, cancelled: 5 },
  },
  {
    id: 'wf-emergency',
    department: 'Emergency',
    name: 'Emergency Workflow',
    description: 'Configure the emergency triage and treatment process flow.',
    status: 'Active',
    workflowType: 'Standard',
    stages: [
      stage('stg-em-1', 1, 'Triage', 'Severity assessed on arrival', ClipboardList, 'required'),
      stage('stg-em-2', 2, 'Assessment', 'Emergency physician assessment', Stethoscope, 'required'),
      stage(
        'stg-em-3',
        3,
        'Treatment',
        'Emergency treatment administered',
        ClipboardCheck,
        'required',
      ),
      stage(
        'stg-em-4',
        4,
        'Disposition',
        'Admit, transfer, or discharge decision',
        FileSearch,
        'required',
      ),
      stage('stg-em-5', 5, 'Complete', 'Emergency visit closed', CheckCircle2, 'required', true),
    ],
    settings: {
      allowStageReversion: true,
      requireCompletionInOrder: false,
      allowDraftSave: true,
      autoAssignNextStage: true,
    },
    createdBy: 'Admin User',
    createdAt: '2026-04-12T10:50:00+01:00',
    updatedAt: '2026-05-17T16:15:00+01:00',
    updatedBy: 'Admin User',
    performance: { totalExecutions: 248, completed: 221, inProgress: 19, cancelled: 8 },
  },
  {
    id: 'wf-accounts-billing',
    department: 'Accounts & Billing',
    name: 'Accounts & Billing Workflow',
    description: 'Configure the invoicing and payment process flow.',
    status: 'Active',
    workflowType: 'Standard',
    stages: [
      stage(
        'stg-ab-1',
        1,
        'Invoice Generated',
        'Invoice generated from service charges',
        Receipt,
        'required',
      ),
      stage(
        'stg-ab-2',
        2,
        'Payment Processing',
        'Payment collected or insurance billed',
        CreditCard,
        'required',
      ),
      stage(
        'stg-ab-3',
        3,
        'Reconciliation',
        'Payment reconciled against invoice',
        FileCheck2,
        'required',
      ),
      stage(
        'stg-ab-4',
        4,
        'Complete',
        'Invoice closed and receipt issued',
        CheckCircle2,
        'required',
        true,
      ),
    ],
    settings: { ...STANDARD_SETTINGS },
    createdBy: 'Admin User',
    createdAt: '2026-04-12T10:55:00+01:00',
    updatedAt: '2026-05-12T13:40:00+01:00',
    updatedBy: 'Admin User',
    performance: { totalExecutions: 389, completed: 376, inProgress: 9, cancelled: 4 },
  },
  {
    id: 'wf-records',
    department: 'Records',
    name: 'Records Management Workflow',
    description: 'Configure the medical records request and retrieval process flow.',
    status: 'Inactive',
    workflowType: 'Standard',
    stages: [
      stage(
        'stg-rc-1',
        1,
        'Request Submitted',
        'Records request submitted',
        FileSearch,
        'required',
      ),
      stage(
        'stg-rc-2',
        2,
        'Retrieval',
        'Physical or digital record retrieved',
        ClipboardList,
        'required',
      ),
      stage(
        'stg-rc-3',
        3,
        'Complete',
        'Record released to requester',
        CheckCircle2,
        'required',
        true,
      ),
    ],
    settings: {
      allowStageReversion: false,
      requireCompletionInOrder: true,
      allowDraftSave: false,
      autoAssignNextStage: false,
    },
    createdBy: 'Admin User',
    createdAt: '2026-04-12T11:00:00+01:00',
    updatedAt: '2026-04-30T10:00:00+01:00',
    updatedBy: 'Admin User',
    performance: { totalExecutions: 0, completed: 0, inProgress: 0, cancelled: 0 },
  },
  {
    id: 'wf-administration',
    department: 'Administration',
    name: 'Administration Workflow',
    description: 'Configure the internal administrative request process flow.',
    status: 'Active',
    workflowType: 'Standard',
    stages: [
      stage(
        'stg-ad-1',
        1,
        'Request Submitted',
        'Administrative request submitted',
        FileSearch,
        'required',
      ),
      stage(
        'stg-ad-2',
        2,
        'Review',
        'Request reviewed by relevant office',
        ClipboardList,
        'required',
      ),
      stage('stg-ad-3', 3, 'Approval', 'Request approved or rejected', BadgeCheck, 'required'),
      stage('stg-ad-4', 4, 'Complete', 'Request closed', CheckCircle2, 'required', true),
    ],
    settings: { ...STANDARD_SETTINGS },
    createdBy: 'Admin User',
    createdAt: '2026-04-12T11:05:00+01:00',
    updatedAt: '2026-05-05T09:20:00+01:00',
    updatedBy: 'Admin User',
    performance: { totalExecutions: 94, completed: 87, inProgress: 5, cancelled: 2 },
  },
];

export { DEPARTMENT_ICONS };

/** Icon choices offered in Add Stage / Edit Stage — a small, representative
 * palette rather than every icon in the library. */
export const STAGE_ICON_OPTIONS: { value: string; icon: LucideIcon; label: string }[] = [
  { value: 'UserPlus', icon: UserPlus, label: 'Registration / Intake' },
  { value: 'ClipboardList', icon: ClipboardList, label: 'Assessment / Review' },
  { value: 'Stethoscope', icon: Stethoscope, label: 'Clinical' },
  { value: 'Pill', icon: Pill, label: 'Medication' },
  { value: 'FlaskConical', icon: FlaskConical, label: 'Sample / Testing' },
  { value: 'FileCheck2', icon: FileCheck2, label: 'Verification' },
  { value: 'CreditCard', icon: CreditCard, label: 'Payment' },
  { value: 'BadgeCheck', icon: BadgeCheck, label: 'Approval' },
  { value: 'CheckCircle2', icon: CheckCircle2, label: 'Complete' },
];

export type WorkflowStats = {
  total: number;
  active: number;
  approvalWorkflowCount: number;
  automatedRules: number;
};

export function computeWorkflowStats(
  workflows: DepartmentWorkflow[],
  approvalWorkflowCount: number,
): WorkflowStats {
  const automatedRules =
    workflows.filter((w) => w.settings.autoAssignNextStage).length +
    workflows.reduce((sum, w) => sum + w.stages.filter((s) => s.autoComplete).length, 0);
  return {
    total: workflows.length,
    active: workflows.filter((w) => w.status === 'Active').length,
    approvalWorkflowCount,
    automatedRules,
  };
}
