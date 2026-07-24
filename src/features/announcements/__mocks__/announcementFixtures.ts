/**
 * Mock fixtures for the Announcements screen — shared across every
 * workspace's dashboard (see announcementsStore.ts for why this is a single
 * cross-workspace feed rather than a per-workspace copy).
 * Swap out by pointing hooks to a real announcements endpoint in Phase 6.
 */

import {
  Building2,
  Calendar,
  Droplet,
  Megaphone,
  UserPlus,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

function daysAgo(days: number, hour = 8, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}
function minutesAgo(mins: number): string {
  return new Date(Date.now() - mins * 60_000).toISOString();
}
function hoursAgo(hrs: number): string {
  return minutesAgo(hrs * 60);
}

export type AnnouncementScope = 'System Wide' | 'Departmental';
export type AnnouncementPriority = 'Normal' | 'High Priority';
export type AnnouncementCategory =
  'Safety' | 'Training' | 'Schedule' | 'Clinical' | 'Supply' | 'Maintenance' | 'Administration';

export const CATEGORY_CFG: Record<
  AnnouncementCategory,
  { icon: LucideIcon; color: string; bg: string }
> = {
  Safety: { icon: Megaphone, color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
  Training: { icon: Users, color: '#22C55E', bg: 'rgba(34,197,94,0.12)' },
  Schedule: { icon: Calendar, color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  Clinical: { icon: UserPlus, color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)' },
  Supply: { icon: Droplet, color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
  Maintenance: { icon: Wrench, color: '#B45309', bg: 'rgba(180,83,9,0.12)' },
  Administration: { icon: Building2, color: '#EC4899', bg: 'rgba(236,72,153,0.12)' },
};

export const DEPARTMENT_OPTIONS = [
  'Nursing Department',
  'Infection Control Department',
  'Laboratory Department',
  'Pharmacy Department',
  'Maintenance Department',
  'Administration',
];

export const TARGET_AUDIENCE_OPTIONS = [
  'All Nursing Staff',
  'Pharmacy',
  'Medical Staff',
  'Laboratory',
  'Administration',
  'Maintenance',
];

export type AnnouncementAttachment = {
  name: string;
  fileType: string;
  sizeLabel: string;
};

export type Announcement = {
  id: string;
  title: string;
  scope: AnnouncementScope;
  department: string;
  author: string;
  authorRole?: string;
  category: AnnouncementCategory;
  priority: AnnouncementPriority;
  pinned: boolean;
  read: boolean;
  publishedAt: string;
  preview: string;
  body: string[];
  bulletHeading?: string;
  bulletPoints?: string[];
  bodyAfter?: string[];
  attachment?: AnnouncementAttachment;
  targetAudience: string[];
  totalRecipients: number;
  readCount: number;
};

export const ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'an-01',
    title: 'New Medication Safety Protocol',
    scope: 'System Wide',
    department: 'Administration',
    author: 'Dr. Amina Yusuf',
    authorRole: 'Medical Director',
    category: 'Safety',
    priority: 'High Priority',
    pinned: true,
    read: false,
    publishedAt: minutesAgo(30),
    preview:
      'Please be informed of the updated medication safety protocol effective immediately...',
    body: ['Please be informed of the updated medication safety protocol effective immediately.'],
    bulletHeading: 'Key changes include:',
    bulletPoints: [
      'Double verification for high-risk medications',
      'Proper patient identification using two identifiers',
      'Documentation within 30 minutes of administration',
      'Report any medication errors immediately',
    ],
    bodyAfter: [
      'All staff are required to review and follow these guidelines.',
      'Thank you for your cooperation in ensuring patient safety.',
    ],
    attachment: {
      name: 'Medication Safety Protocol Guidelines.pdf',
      fileType: 'PDF Document',
      sizeLabel: '1.2 MB',
    },
    targetAudience: ['All Nursing Staff', 'Pharmacy', 'Medical Staff'],
    totalRecipients: 128,
    readCount: 122,
  },
  {
    id: 'an-02',
    title: 'Staff Training: Infection Control',
    scope: 'Departmental',
    department: 'Infection Control Department',
    author: 'Nurse Manager',
    category: 'Training',
    priority: 'Normal',
    pinned: true,
    read: false,
    publishedAt: hoursAgo(2),
    preview: 'Mandatory training session for all nursing staff on infection prevention...',
    body: [
      'Mandatory training session for all nursing staff on infection prevention and control practices.',
      'Session covers hand hygiene, PPE use, and isolation precautions. Attendance will be recorded.',
    ],
    targetAudience: ['All Nursing Staff'],
    totalRecipients: 62,
    readCount: 51,
  },
  {
    id: 'an-03',
    title: 'Shift Schedule Update',
    scope: 'Departmental',
    department: 'Nursing Department',
    author: 'Nurse Manager',
    category: 'Schedule',
    priority: 'Normal',
    pinned: false,
    read: true,
    publishedAt: daysAgo(1, 9, 0),
    preview: 'Please check the updated shift schedule for the upcoming week...',
    body: [
      'Please check the updated shift schedule for the upcoming week. Changes affect the Female and Male Medical Wards.',
      'Contact the duty roster office if you have a scheduling conflict.',
    ],
    targetAudience: ['All Nursing Staff'],
    totalRecipients: 62,
    readCount: 58,
  },
  {
    id: 'an-04',
    title: 'New Admission Protocol',
    scope: 'Departmental',
    department: 'Nursing Department',
    author: 'Dr. Amina Yusuf',
    category: 'Clinical',
    priority: 'Normal',
    pinned: false,
    read: true,
    publishedAt: daysAgo(2, 10, 30),
    preview: 'Reminder: All new admissions must follow the updated assessment protocol...',
    body: [
      'Reminder: All new admissions must follow the updated assessment protocol, including the standardised falls-risk and pressure-injury screens within the first hour of admission.',
    ],
    targetAudience: ['All Nursing Staff'],
    totalRecipients: 62,
    readCount: 60,
  },
  {
    id: 'an-05',
    title: 'Blood Bank Update',
    scope: 'Departmental',
    department: 'Laboratory Department',
    author: 'Lab Manager',
    category: 'Supply',
    priority: 'Normal',
    pinned: false,
    read: true,
    publishedAt: daysAgo(3, 11, 0),
    preview: 'Urgent: O Negative blood type is currently low. Please use judiciously...',
    body: [
      'Urgent: O Negative blood type is currently low. Please use judiciously and confirm all cross-match requests before ordering.',
    ],
    targetAudience: ['All Nursing Staff', 'Laboratory'],
    totalRecipients: 90,
    readCount: 84,
  },
  {
    id: 'an-06',
    title: 'Equipment Maintenance Notice',
    scope: 'Departmental',
    department: 'Maintenance Department',
    author: 'Admin',
    category: 'Maintenance',
    priority: 'Normal',
    pinned: false,
    read: true,
    publishedAt: daysAgo(4, 8, 0),
    preview: 'Scheduled maintenance for patient monitors on July 2nd from 2:00 PM to 4:00 PM...',
    body: [
      'Scheduled maintenance for patient monitors on July 2nd from 2:00 PM to 4:00 PM. Backup monitors will be available at the nurses’ station.',
    ],
    targetAudience: ['All Nursing Staff', 'Maintenance'],
    totalRecipients: 62,
    readCount: 55,
  },
  {
    id: 'an-07',
    title: 'Department Meeting',
    scope: 'Departmental',
    department: 'Administration',
    author: 'Hospital Administrator',
    category: 'Administration',
    priority: 'Normal',
    pinned: false,
    read: true,
    publishedAt: daysAgo(5, 8, 0),
    preview: 'Monthly department heads meeting scheduled for this Friday at 10:00 AM...',
    body: [
      'Monthly department heads meeting scheduled for this Friday at 10:00 AM in the main conference room.',
    ],
    targetAudience: ['Administration'],
    totalRecipients: 18,
    readCount: 18,
  },
  {
    id: 'an-08',
    title: 'Fire Drill Scheduled',
    scope: 'System Wide',
    department: 'Administration',
    author: 'Safety Officer',
    category: 'Safety',
    priority: 'Normal',
    pinned: false,
    read: false,
    publishedAt: daysAgo(6, 9, 0),
    preview: 'A hospital-wide fire drill will be conducted next Tuesday at 10:00 AM...',
    body: [
      'A hospital-wide fire drill will be conducted next Tuesday at 10:00 AM. Please familiarise yourself with your ward’s evacuation route beforehand.',
    ],
    targetAudience: ['All Nursing Staff', 'Medical Staff', 'Administration'],
    totalRecipients: 210,
    readCount: 40,
  },
  {
    id: 'an-09',
    title: 'Flu Vaccination Drive',
    scope: 'System Wide',
    department: 'Administration',
    author: 'Occupational Health',
    category: 'Training',
    priority: 'Normal',
    pinned: false,
    read: true,
    publishedAt: daysAgo(7, 9, 0),
    preview:
      'Free seasonal flu vaccination is now available for all staff at Occupational Health...',
    body: [
      'Free seasonal flu vaccination is now available for all staff at Occupational Health, Mon–Fri, 8:00 AM–4:00 PM.',
    ],
    targetAudience: ['All Nursing Staff', 'Medical Staff'],
    totalRecipients: 210,
    readCount: 175,
  },
  {
    id: 'an-10',
    title: 'Updated Visitor Policy',
    scope: 'System Wide',
    department: 'Administration',
    author: 'Hospital Administrator',
    category: 'Administration',
    priority: 'Normal',
    pinned: false,
    read: true,
    publishedAt: daysAgo(8, 9, 0),
    preview: 'Visiting hours have been revised effective next week...',
    body: [
      'Visiting hours have been revised effective next week to 10:00 AM–2:00 PM and 5:00 PM–7:00 PM. Please inform families at admission.',
    ],
    targetAudience: ['All Nursing Staff'],
    totalRecipients: 210,
    readCount: 190,
  },
  {
    id: 'an-11',
    title: 'New IV Pump Training',
    scope: 'Departmental',
    department: 'Nursing Department',
    author: 'Nurse Educator',
    category: 'Training',
    priority: 'Normal',
    pinned: false,
    read: false,
    publishedAt: daysAgo(9, 9, 0),
    preview: 'A short refresher session on the new IV pump models is available this week...',
    body: [
      'A short refresher session on the new IV pump models is available this week. Sign up at the nursing office.',
    ],
    targetAudience: ['All Nursing Staff'],
    totalRecipients: 62,
    readCount: 30,
  },
  {
    id: 'an-12',
    title: 'Isolation Precautions Update',
    scope: 'Departmental',
    department: 'Infection Control Department',
    author: 'Infection Control Officer',
    category: 'Safety',
    priority: 'High Priority',
    pinned: true,
    read: true,
    publishedAt: daysAgo(10, 9, 0),
    preview: 'Updated isolation precaution signage and PPE requirements are now in effect...',
    body: [
      'Updated isolation precaution signage and PPE requirements are now in effect for all contact and droplet precaution rooms.',
    ],
    targetAudience: ['All Nursing Staff', 'Medical Staff'],
    totalRecipients: 90,
    readCount: 88,
  },
  {
    id: 'an-13',
    title: 'Pharmacy Formulary Update',
    scope: 'Departmental',
    department: 'Pharmacy Department',
    author: 'Chief Pharmacist',
    category: 'Supply',
    priority: 'Normal',
    pinned: false,
    read: true,
    publishedAt: daysAgo(11, 9, 0),
    preview: 'Three medications have been added to the approved hospital formulary...',
    body: [
      'Three medications have been added to the approved hospital formulary this quarter. See the updated list on the pharmacy portal.',
    ],
    targetAudience: ['Pharmacy', 'Medical Staff'],
    totalRecipients: 45,
    readCount: 41,
  },
  {
    id: 'an-14',
    title: 'Nurse of the Month Announcement',
    scope: 'System Wide',
    department: 'Administration',
    author: 'Hospital Administrator',
    category: 'Administration',
    priority: 'Normal',
    pinned: false,
    read: true,
    publishedAt: daysAgo(12, 9, 0),
    preview: 'Congratulations to Nurse Ifeoma K. for being recognised as Nurse of the Month...',
    body: [
      'Congratulations to Nurse Ifeoma K. for being recognised as Nurse of the Month for outstanding patient care in the ICU.',
    ],
    targetAudience: ['All Nursing Staff'],
    totalRecipients: 210,
    readCount: 205,
  },
  {
    id: 'an-15',
    title: 'New Wound Care Guidelines',
    scope: 'Departmental',
    department: 'Nursing Department',
    author: 'Wound Care Specialist',
    category: 'Clinical',
    priority: 'Normal',
    pinned: false,
    read: false,
    publishedAt: daysAgo(13, 9, 0),
    preview: 'Updated wound dressing guidelines are now available on the shared drive...',
    body: [
      'Updated wound dressing guidelines are now available on the shared drive, including the new pressure-injury staging chart.',
    ],
    targetAudience: ['All Nursing Staff'],
    totalRecipients: 62,
    readCount: 20,
  },
  {
    id: 'an-16',
    title: 'Cybersecurity Awareness Reminder',
    scope: 'System Wide',
    department: 'Administration',
    author: 'IT Department',
    category: 'Administration',
    priority: 'Normal',
    pinned: false,
    read: true,
    publishedAt: daysAgo(14, 9, 0),
    preview: 'Please remain vigilant against phishing emails targeting hospital staff...',
    body: [
      'Please remain vigilant against phishing emails targeting hospital staff. Report any suspicious messages to IT immediately.',
    ],
    targetAudience: ['All Nursing Staff', 'Medical Staff', 'Administration'],
    totalRecipients: 210,
    readCount: 198,
  },
  {
    id: 'an-17',
    title: 'Oxygen Cylinder Supply Update',
    scope: 'Departmental',
    department: 'Maintenance Department',
    author: 'Maintenance Supervisor',
    category: 'Supply',
    priority: 'Normal',
    pinned: false,
    read: true,
    publishedAt: daysAgo(15, 9, 0),
    preview: 'Oxygen cylinder stock has been replenished across all wards...',
    body: [
      'Oxygen cylinder stock has been replenished across all wards. Report any low-stock carts to maintenance.',
    ],
    targetAudience: ['All Nursing Staff', 'Maintenance'],
    totalRecipients: 62,
    readCount: 59,
  },
  {
    id: 'an-18',
    title: 'Updated Hand Hygiene Audit Results',
    scope: 'Departmental',
    department: 'Infection Control Department',
    author: 'Infection Control Officer',
    category: 'Safety',
    priority: 'Normal',
    pinned: false,
    read: true,
    publishedAt: daysAgo(16, 9, 0),
    preview: 'Ward-level hand hygiene compliance results for last month are now published...',
    body: [
      'Ward-level hand hygiene compliance results for last month are now published. Overall compliance improved to 94%.',
    ],
    targetAudience: ['All Nursing Staff'],
    totalRecipients: 62,
    readCount: 60,
  },
  {
    id: 'an-19',
    title: 'Staff Appreciation Week',
    scope: 'System Wide',
    department: 'Administration',
    author: 'Hospital Administrator',
    category: 'Administration',
    priority: 'Normal',
    pinned: false,
    read: true,
    publishedAt: daysAgo(17, 9, 0),
    preview: 'Staff Appreciation Week begins next Monday with daily activities and refreshments...',
    body: [
      'Staff Appreciation Week begins next Monday with daily activities and refreshments for all departments.',
    ],
    targetAudience: ['All Nursing Staff', 'Medical Staff', 'Administration'],
    totalRecipients: 210,
    readCount: 201,
  },
  {
    id: 'an-20',
    title: 'New Electronic Health Record Update',
    scope: 'System Wide',
    department: 'Administration',
    author: 'IT Department',
    category: 'Administration',
    priority: 'Normal',
    pinned: false,
    read: true,
    publishedAt: daysAgo(18, 9, 0),
    preview: 'The EHR system will receive a minor update this weekend with no downtime expected...',
    body: [
      'The EHR system will receive a minor update this weekend with no downtime expected. New quick-filters have been added to the medication chart.',
    ],
    targetAudience: ['All Nursing Staff', 'Medical Staff'],
    totalRecipients: 210,
    readCount: 188,
  },
  {
    id: 'an-21',
    title: 'Emergency Preparedness Drill Results',
    scope: 'Departmental',
    department: 'Nursing Department',
    author: 'Nurse Manager',
    category: 'Safety',
    priority: 'Normal',
    pinned: false,
    read: true,
    publishedAt: daysAgo(19, 9, 0),
    preview: 'Results from last week’s mass casualty preparedness drill are now available...',
    body: [
      'Results from last week’s mass casualty preparedness drill are now available. Response time improved across all wards.',
    ],
    targetAudience: ['All Nursing Staff'],
    totalRecipients: 62,
    readCount: 57,
  },
  {
    id: 'an-22',
    title: 'Revised Discharge Documentation Policy',
    scope: 'Departmental',
    department: 'Nursing Department',
    author: 'Nurse Manager',
    category: 'Clinical',
    priority: 'Normal',
    pinned: false,
    read: true,
    publishedAt: daysAgo(20, 9, 0),
    preview:
      'Discharge summaries must now include the updated medication reconciliation checklist...',
    body: [
      'Discharge summaries must now include the updated medication reconciliation checklist before a patient leaves the ward.',
    ],
    targetAudience: ['All Nursing Staff'],
    totalRecipients: 62,
    readCount: 60,
  },
  {
    id: 'an-23',
    title: 'Annual Compliance Training Reminder',
    scope: 'System Wide',
    department: 'Administration',
    author: 'HR Department',
    category: 'Training',
    priority: 'Normal',
    pinned: false,
    read: false,
    publishedAt: daysAgo(21, 9, 0),
    preview: 'Annual compliance training modules are due by the end of this month...',
    body: [
      'Annual compliance training modules are due by the end of this month. Complete them via the staff learning portal.',
    ],
    targetAudience: ['All Nursing Staff', 'Medical Staff', 'Administration'],
    totalRecipients: 210,
    readCount: 120,
  },
  {
    id: 'an-24',
    title: 'Holiday Schedule Notice',
    scope: 'Departmental',
    department: 'Administration',
    author: 'Hospital Administrator',
    category: 'Schedule',
    priority: 'Normal',
    pinned: false,
    read: true,
    publishedAt: daysAgo(22, 9, 0),
    preview: 'The public holiday duty roster has been published for all departments...',
    body: [
      'The public holiday duty roster has been published for all departments. Check your shift assignment with your ward manager.',
    ],
    targetAudience: ['Administration'],
    totalRecipients: 18,
    readCount: 18,
  },
];
