'use client';

import { ChevronDown } from 'lucide-react';

export type FilterDef = {
  key: string;
  defaultLabel: string;
  options: { value: string; label: string }[];
};

/**
 * Single-select list dropdown for page-level filter bars — a bordered pill
 * button that opens an animated list with an "All X" reset option baked in
 * as the first row. Not the right fit for grouped/multi-toggle filter
 * panels (see the Patients page's own filter panel for that pattern).
 */
export function FilterDropdown({
  def,
  value,
  isOpen,
  onToggle,
  onSelect,
}: {
  def: FilterDef;
  value: string;
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (value: string) => void;
}) {
  const selectedLabel = def.options.find((o) => o.value === value)?.label ?? def.defaultLabel;
  const isActive = value !== 'ALL';

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className="flex h-11 shrink-0 items-center gap-1.5 rounded-[10px] px-3.5 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
        style={{
          background: '#FFFFFF',
          border: isOpen ? '1px solid #00B4D8' : '1px solid #0064821F',
          color: isActive ? '#00B4D8' : '#0D2630',
          fontSize: 14,
        }}
      >
        {selectedLabel}
        <ChevronDown
          style={{
            width: 14,
            height: 14,
            transition: 'transform 150ms',
            transform: isOpen ? 'rotate(180deg)' : 'none',
          }}
        />
      </button>
      {isOpen && (
        <div
          className="animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 absolute top-full left-0 z-30 mt-1 min-w-[170px] overflow-hidden rounded-[12px] bg-white py-1.5 duration-150"
          style={{
            border: '1px solid rgba(0,100,130,0.12)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          }}
        >
          <button
            type="button"
            onClick={() => onSelect('ALL')}
            className="flex w-full items-center px-4 py-2 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
            style={{
              fontSize: 14,
              color: value === 'ALL' ? '#00B4D8' : '#2F3A40',
              fontWeight: value === 'ALL' ? 600 : 400,
            }}
          >
            {def.defaultLabel}
          </button>
          {def.options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onSelect(opt.value)}
              className="flex w-full items-center px-4 py-2 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
              style={{
                fontSize: 14,
                color: value === opt.value ? '#00B4D8' : '#2F3A40',
                fontWeight: value === opt.value ? 600 : 400,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
