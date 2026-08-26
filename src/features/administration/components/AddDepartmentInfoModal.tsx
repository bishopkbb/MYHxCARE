'use client';

import { Building2, Mail, X } from 'lucide-react';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

/** The real destination of the "+ Add Department" button. Departments in
 * this HMS are administratively fixed, not self-service creatable (see
 * project memory `project_departments_not_creatable`), so this is an
 * informational panel explaining that and how to request a structural
 * change, not a create form. Existing departments' contact info, head,
 * status, and hours remain fully editable elsewhere on this screen. */
export function AddDepartmentInfoModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(13,38,48,0.45)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex w-full flex-col overflow-hidden bg-white"
        style={{ maxWidth: 460, borderRadius: 16 }}
      >
        <div className="flex items-start justify-between gap-3 px-6 py-5">
          <div
            className="flex size-11 shrink-0 items-center justify-center rounded-full"
            style={{ background: 'rgba(0,180,216,0.1)' }}
          >
            <Building2 style={{ width: 22, height: 22, color: '#00B4D8' }} />
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={`flex size-11 shrink-0 items-center justify-center rounded-full transition-colors duration-150 hover:bg-[rgba(0,0,0,0.06)] ${FOCUS_RING}`}
          >
            <X style={{ width: 20, height: 20, color: '#4A7080' }} />
          </button>
        </div>

        <div className="px-6 pb-6">
          <h2
            className="font-display font-semibold"
            style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
          >
            Departments are administratively fixed
          </h2>
          <p className="mt-2" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
            The medical centre&apos;s department structure is configured centrally and can&apos;t be
            added to from this screen. You can still edit an existing department&apos;s head,
            contact info, status, and operating hours, or move staff between departments in the
            Staff Assignment tab.
          </p>
          <div
            className="mt-4 flex items-start gap-2.5 rounded-[10px] p-3.5"
            style={{ background: '#F5FBFD', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <Mail style={{ width: 16, height: 16, color: '#4A7080', flexShrink: 0 }} />
            <p style={{ fontSize: 14, color: '#4A7080' }}>
              To request a new department or restructure an existing one, contact the Systems
              Administrator.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end px-6 pb-6">
          <button
            type="button"
            onClick={onClose}
            className={`flex h-11 items-center gap-1.5 rounded-[10px] px-5 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
            style={{ fontSize: 14, background: '#00B4D8' }}
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
}
