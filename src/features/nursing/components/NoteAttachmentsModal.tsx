'use client';

import { FileText, Image as ImageIcon, X } from 'lucide-react';

import { formatDateTime } from '@/utils/datetime';
import type { NoteAttachment } from '@/features/nursing/__mocks__/nursingNotesFixtures';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

export function NoteAttachmentsModal({
  attachments,
  onClose,
}: {
  attachments: NoteAttachment[];
  onClose: () => void;
}) {
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
        style={{ maxWidth: 480, maxHeight: 'calc(100vh - 64px)', borderRadius: 16 }}
      >
        <div
          className="flex shrink-0 items-center justify-between gap-3 px-6 py-5"
          style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
        >
          <h2
            className="font-display font-semibold"
            style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
          >
            Recent Attachments
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={`flex size-11 shrink-0 items-center justify-center rounded-full transition-colors duration-150 hover:bg-[rgba(0,0,0,0.06)] ${FOCUS_RING}`}
          >
            <X style={{ width: 20, height: 20, color: '#4A7080' }} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto scroll-smooth px-6 py-5">
          {attachments.length === 0 ? (
            <p style={{ fontSize: 14, color: '#8A98A3' }}>No attachments recorded yet.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center gap-3 rounded-[10px] p-3"
                  style={{ border: '1px solid rgba(0,100,130,0.12)' }}
                >
                  <div
                    className="flex size-11 shrink-0 items-center justify-center rounded-[10px]"
                    style={{ background: 'rgba(0,180,216,0.1)' }}
                  >
                    {att.kind === 'image' ? (
                      <ImageIcon style={{ width: 18, height: 18, color: '#00B4D8' }} />
                    ) : (
                      <FileText style={{ width: 18, height: 18, color: '#00B4D8' }} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate font-sans font-medium"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {att.name}
                    </p>
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>
                      {formatDateTime(att.time)} · {att.size}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          className="flex shrink-0 items-center justify-end px-6 py-4"
          style={{ borderTop: '1px solid rgba(0,100,130,0.12)' }}
        >
          <button
            type="button"
            onClick={onClose}
            className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
            style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
