'use client';

import { ChevronDown, Download } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type ExportMenuProps = {
  onExportPDF: () => void;
  onExportCSV: () => void;
  variant?: 'button' | 'text';
  label?: string;
};

export function ExportMenu({
  onExportPDF,
  onExportCSV,
  variant = 'text',
  label = 'Export',
}: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const chevronStyle: React.CSSProperties = {
    flexShrink: 0,
    transform: open ? 'rotate(180deg)' : 'none',
    transition: 'transform 0.15s',
  };

  const dropdown = open ? (
    <div
      className="animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 absolute top-full right-0 z-50 mt-1 flex flex-col overflow-hidden rounded-[10px] bg-white duration-150"
      style={{
        minWidth: 168,
        border: '1px solid #0064821F',
        boxShadow: '0 4px 16px rgba(0,0,0,0.09)',
      }}
    >
      <button
        type="button"
        onClick={() => {
          onExportPDF();
          setOpen(false);
        }}
        className="px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[rgba(0,180,216,0.05)] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
        style={{ fontSize: 14, lineHeight: '22px', color: '#0D2630' }}
      >
        Export as PDF
      </button>
      <div style={{ height: 1, background: '#0064821F', margin: '0 12px' }} />
      <button
        type="button"
        onClick={() => {
          onExportCSV();
          setOpen(false);
        }}
        className="px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[rgba(0,180,216,0.05)] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
        style={{ fontSize: 14, lineHeight: '22px', color: '#0D2630' }}
      >
        Export as CSV
      </button>
    </div>
  ) : null;

  if (variant === 'button') {
    return (
      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 rounded-[10px] font-sans font-semibold transition-colors duration-150 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
          style={{
            height: 40,
            padding: '0 16px',
            background: '#FFFFFF',
            border: '1px solid #0064821F',
            fontSize: 14,
            lineHeight: '22px',
            color: '#0D2630',
          }}
        >
          <Download style={{ width: 16, height: 16, flexShrink: 0 }} />
          {label}
          <ChevronDown style={{ width: 14, height: 14, ...chevronStyle }} />
        </button>
        {dropdown}
      </div>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 font-sans font-medium transition-opacity duration-150 hover:opacity-70 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
        style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}
      >
        <Download style={{ width: 14, height: 14, flexShrink: 0 }} />
        {label}
        <ChevronDown style={{ width: 12, height: 12, ...chevronStyle }} />
      </button>
      {dropdown}
    </div>
  );
}
