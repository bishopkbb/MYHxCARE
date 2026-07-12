const PDF_STYLES = `
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 12px;
         line-height: 1.6; padding: 32px; color: #0D2630; }
  h1 { font-size: 20px; font-weight: 700; margin: 0 0 4px; }
  .meta { color: #4A7080; font-size: 11px; margin: 0 0 20px; }
  hr { border: none; border-top: 1px solid #e2e8f0; margin: 16px 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11px; }
  th { background: #f8fafc; font-weight: 700; border: 1px solid #e2e8f0;
       padding: 7px 10px; text-align: left; }
  td { border: 1px solid #e2e8f0; padding: 7px 10px; vertical-align: top; }
  .content { white-space: pre-wrap; font-size: 12px; line-height: 1.8; }
  @media print { body { padding: 16px; } }
`.trim();

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function downloadCSV(filename: string, rows: string[][]): void {
  const escape = (cell: string) => `"${String(cell).replace(/"/g, '""')}"`;
  const csv = rows.map((row) => row.map(escape).join(',')).join('\r\n');
  // BOM ensures Excel opens UTF-8 correctly
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadPDF(filename: string, body: string): void {
  const w = window.open('', '_blank', 'width=850,height=650');
  if (!w) return;
  w.document.write(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(filename)}</title>` +
      `<style>${PDF_STYLES}</style></head><body>${body}</body></html>`,
  );
  w.document.close();
  w.focus();
  // Delay so the browser finishes rendering before the print dialog opens
  setTimeout(() => w.print(), 350);
}
