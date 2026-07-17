'use client';

import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const DEFAULT_PAGE_SIZE_OPTIONS = [5, 10, 25, 50];

function getPageNumbers(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | 'ellipsis')[] = [1];
  if (current > 3) pages.push('ellipsis');
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let p = start; p <= end; p++) pages.push(p);
  if (current < total - 2) pages.push('ellipsis');
  pages.push(total);
  return pages;
}

export function Pagination({
  page,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  itemLabel = 'items',
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
}: {
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  itemLabel?: string;
  pageSizeOptions?: number[];
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const [sizeMenuOpen, setSizeMenuOpen] = useState(false);
  const sizeMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sizeMenuOpen) return;
    function handleClick(e: MouseEvent) {
      if (sizeMenuRef.current && !sizeMenuRef.current.contains(e.target as Node)) {
        setSizeMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [sizeMenuOpen]);

  if (totalItems === 0) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);
  const pageNumbers = getPageNumbers(page, totalPages);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
      <p className="font-sans" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
        Showing {start} to {end} of {totalItems} {itemLabel}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          {/* Prev — small-visual / full-hit-area (44px hit box, 36px visual) */}
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1}
            aria-label="Previous page"
            className={`relative flex size-11 shrink-0 items-center justify-center rounded-[8px] transition-colors duration-150 disabled:cursor-not-allowed ${FOCUS_RING}`}
          >
            <span
              className="flex size-9 items-center justify-center rounded-[8px] transition-colors duration-150"
              style={{
                border: '1px solid #0064821F',
                background: '#FFFFFF',
                opacity: page === 1 ? 0.4 : 1,
              }}
            >
              <ChevronLeft style={{ width: 16, height: 16, color: '#4A7080' }} />
            </span>
          </button>

          {pageNumbers.map((p, i) =>
            p === 'ellipsis' ? (
              <span
                key={`ellipsis-${i}`}
                className="flex size-9 shrink-0 items-center justify-center font-sans"
                style={{ fontSize: 14, color: '#8A98A3' }}
              >
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                aria-label={`Page ${p}`}
                aria-current={p === page ? 'page' : undefined}
                className={`flex size-9 shrink-0 items-center justify-center rounded-[8px] font-sans font-medium transition-colors duration-150 ${FOCUS_RING}`}
                style={{
                  fontSize: 14,
                  border: p === page ? '1px solid #00B4D8' : '1px solid transparent',
                  background: p === page ? 'rgba(0,180,216,0.06)' : 'transparent',
                  color: p === page ? '#00B4D8' : '#4A7080',
                }}
              >
                {p}
              </button>
            ),
          )}

          {/* Next — small-visual / full-hit-area */}
          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            aria-label="Next page"
            className={`relative flex size-11 shrink-0 items-center justify-center rounded-[8px] transition-colors duration-150 disabled:cursor-not-allowed ${FOCUS_RING}`}
          >
            <span
              className="flex size-9 items-center justify-center rounded-[8px] transition-colors duration-150"
              style={{
                border: '1px solid #0064821F',
                background: '#FFFFFF',
                opacity: page === totalPages ? 0.4 : 1,
              }}
            >
              <ChevronRight style={{ width: 16, height: 16, color: '#4A7080' }} />
            </span>
          </button>
        </div>

        {/* Page-size dropdown */}
        <div className="relative" ref={sizeMenuRef}>
          <button
            type="button"
            onClick={() => setSizeMenuOpen((v) => !v)}
            className={`flex h-9 items-center gap-1.5 rounded-[8px] px-3 font-sans font-medium transition-colors duration-150 hover:bg-slate-50 ${FOCUS_RING}`}
            style={{ border: '1px solid #0064821F', fontSize: 14, color: '#0D2630' }}
          >
            {pageSize}/Page
            <ChevronDown
              style={{
                width: 14,
                height: 14,
                color: '#4A7080',
                transition: 'transform 150ms',
                transform: sizeMenuOpen ? 'rotate(180deg)' : 'none',
              }}
            />
          </button>
          {sizeMenuOpen && (
            <div
              className="animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-1 absolute right-0 bottom-full z-20 mb-1 overflow-hidden rounded-[10px] bg-white py-1.5 duration-150"
              style={{
                minWidth: 100,
                border: '1px solid #0064821F',
                boxShadow: '0 4px 16px rgba(0,0,0,0.09)',
              }}
            >
              {pageSizeOptions.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => {
                    onPageSizeChange(size);
                    setSizeMenuOpen(false);
                  }}
                  className="flex w-full items-center px-3.5 py-2 text-left font-sans transition-colors duration-150 hover:bg-[rgba(0,180,216,0.06)] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                  style={{
                    fontSize: 14,
                    color: size === pageSize ? '#00B4D8' : '#0D2630',
                    fontWeight: size === pageSize ? 600 : 400,
                  }}
                >
                  {size}/Page
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
