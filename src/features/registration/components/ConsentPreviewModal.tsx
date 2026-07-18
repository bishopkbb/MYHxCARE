'use client';

import { Download, Printer, X } from 'lucide-react';

import { downloadPDF, escapeHtml } from '@/utils/export';
import { formatHumanDate, formatTime } from '@/utils/datetime';
import type { ConsentForm } from '@/features/registration/__mocks__/consentFormFixtures';

function buildConsentHtml(consent: ConsentForm): string {
  return `
    <h1>${escapeHtml(consent.consentType)} — ${escapeHtml(consent.id)}</h1>
    <p class="meta">${escapeHtml(formatHumanDate(consent.dateIssued))} ${escapeHtml(formatTime(consent.dateIssued))}</p>
    <hr />
    <table>
      <tr><th>Patient</th><td>${escapeHtml(consent.patientName)} (${escapeHtml(consent.mrn)})</td></tr>
      <tr><th>Department</th><td>${escapeHtml(consent.department)}</td></tr>
      <tr><th>Procedure</th><td>${escapeHtml(consent.procedure)}</td></tr>
      <tr><th>Doctor</th><td>${escapeHtml(consent.doctor)}</td></tr>
      <tr><th>Date Issued</th><td>${escapeHtml(formatHumanDate(consent.dateIssued))}</td></tr>
      <tr><th>Expiry Date</th><td>${escapeHtml(formatHumanDate(consent.expiryDate))}</td></tr>
      <tr><th>Status</th><td>${escapeHtml(consent.status)}</td></tr>
    </table>
    <p class="content"><strong>Description</strong><br/>${escapeHtml(consent.description)}</p>
    <p class="content"><strong>Signatures</strong><br/>${consent.signatures
      .map(
        (s) =>
          `${escapeHtml(s.role)}: ${escapeHtml(s.status)}${s.signedOn ? ` (${escapeHtml(formatHumanDate(s.signedOn))} ${escapeHtml(formatTime(s.signedOn))})` : ''}`,
      )
      .join('<br/>')}</p>
  `;
}

export function ConsentPreviewModal({
  consent,
  onClose,
}: {
  consent: ConsentForm;
  onClose: () => void;
}) {
  function handlePrint() {
    downloadPDF(`consent-${consent.id}`, buildConsentHtml(consent));
  }

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
        style={{ maxWidth: 640, maxHeight: 'calc(100vh - 64px)', borderRadius: 16 }}
      >
        <div
          className="flex shrink-0 items-start justify-between gap-3 px-6 py-5"
          style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
        >
          <h2
            className="font-display font-semibold"
            style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
          >
            {consent.consentType}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-11 shrink-0 items-center justify-center rounded-full transition-colors duration-150 hover:bg-[rgba(0,0,0,0.06)] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
          >
            <X style={{ width: 20, height: 20, color: '#4A7080' }} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto scroll-smooth px-6 py-5">
          <div className="rounded-[12px] p-5" style={{ border: '1px solid rgba(0,100,130,0.12)' }}>
            <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
              {consent.id}
            </p>
            <p style={{ fontSize: 14, color: '#8A98A3' }}>
              Issued {formatHumanDate(consent.dateIssued)} {formatTime(consent.dateIssued)}
            </p>

            <div className="mt-4 flex flex-col gap-2.5">
              {[
                ['Patient', `${consent.patientName} (${consent.mrn})`],
                ['Department', consent.department],
                ['Procedure', consent.procedure],
                ['Doctor', consent.doctor],
                ['Expiry Date', formatHumanDate(consent.expiryDate)],
                ['Status', consent.status],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-2">
                  <span style={{ fontSize: 14, color: '#8A98A3' }}>{label}</span>
                  <span
                    className="max-w-[300px] truncate text-right font-sans font-medium"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4">
              <p className="font-sans font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Description
              </p>
              <p className="mt-1.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                {consent.description}
              </p>
            </div>

            <div className="mt-4">
              <p className="font-sans font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Signatures
              </p>
              <div className="mt-2 flex flex-col gap-2">
                {consent.signatures.map((s) => (
                  <div key={s.role} className="flex items-center justify-between gap-2">
                    <span style={{ fontSize: 14, color: '#4A7080' }}>{s.role}</span>
                    <span
                      className="font-sans font-medium"
                      style={{ fontSize: 14, color: s.status === 'Signed' ? '#22C55E' : '#F59E0B' }}
                    >
                      {s.status}
                      {s.signedOn
                        ? ` · ${formatHumanDate(s.signedOn)} ${formatTime(s.signedOn)}`
                        : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div
          className="flex shrink-0 items-center justify-end gap-2.5 px-6 py-4"
          style={{ borderTop: '1px solid rgba(0,100,130,0.12)' }}
        >
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
            style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
          >
            Close
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
            style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
          >
            <Printer style={{ width: 15, height: 15 }} />
            Print
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
            style={{ fontSize: 14, background: '#00B4D8' }}
          >
            <Download style={{ width: 15, height: 15 }} />
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );
}
