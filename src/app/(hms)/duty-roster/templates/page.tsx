'use client';

import {
  AlertCircle,
  ChevronLeft,
  Copy,
  LayoutTemplate,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { ModalLoadingFallback } from '@components/shared/ModalLoadingFallback';
import { StatMini } from '@components/shared/StatCard';
import { ROUTES } from '@/constants/routes';
import { useToast } from '@/hooks/useToast';
import {
  CALENDAR_SLOT_META,
  DEPARTMENT_OPTIONS,
  MOCK_SHIFT_TEMPLATES,
  type ShiftTemplate,
} from '@/features/workforce/__mocks__/workforceFixtures';

const TemplateModal = dynamic(() => import('./TemplateModal').then((m) => m.TemplateModal), {
  ssr: false,
  loading: () => <ModalLoadingFallback />,
});

type PageState = 'loading' | 'loaded' | 'error';

function SkeletonCard() {
  return (
    <div
      className="rounded-[12px] p-4"
      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
    >
      <div className="h-4 w-48 animate-pulse rounded bg-slate-100" />
      <div className="mt-2 h-3.5 w-64 animate-pulse rounded bg-slate-100" />
      <div className="mt-4 flex gap-2">
        <div className="h-6 w-20 animate-pulse rounded-full bg-slate-100" />
        <div className="h-6 w-24 animate-pulse rounded-full bg-slate-100" />
      </div>
    </div>
  );
}

export default function ShiftTemplatesPage() {
  const router = useRouter();
  const toast = useToast();
  const [pageState, setPageState] = useState<PageState>('loading');
  const [templates, setTemplates] = useState<ShiftTemplate[]>(MOCK_SHIFT_TEMPLATES);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState<string | 'ALL'>('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ShiftTemplate | undefined>(undefined);

  useEffect(() => {
    const t = setTimeout(() => setPageState('loaded'), 800);
    return () => clearTimeout(t);
  }, []);

  function handleRetry() {
    setPageState('loading');
    setTimeout(() => setPageState('loaded'), 800);
  }

  const q = search.trim().toLowerCase();
  const filtered = templates.filter((t) => {
    const matchesSearch =
      !q || t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q);
    const matchesDept = department === 'ALL' || t.department === department;
    return matchesSearch && matchesDept;
  });

  function handleSave(template: ShiftTemplate) {
    setTemplates((prev) => {
      const exists = prev.some((t) => t.id === template.id);
      return exists ? prev.map((t) => (t.id === template.id ? template : t)) : [template, ...prev];
    });
    setModalOpen(false);
    setEditingTemplate(undefined);
    toast.success(
      editingTemplate ? 'Template updated' : 'Template created',
      `${template.name} has been saved.`,
    );
  }

  function handleDuplicate(template: ShiftTemplate) {
    const copy: ShiftTemplate = {
      ...template,
      id: `tpl-${Date.now()}`,
      name: `${template.name} (Copy)`,
      timesUsed: 0,
      lastUsed: null,
    };
    setTemplates((prev) => [copy, ...prev]);
    toast.success('Template duplicated', `"${copy.name}" was added to your templates.`);
  }

  function handleDelete(template: ShiftTemplate) {
    setTemplates((prev) => prev.filter((t) => t.id !== template.id));
    toast.info('Template deleted', `"${template.name}" has been removed.`);
  }

  function handleApply(template: ShiftTemplate) {
    const shiftCount = template.slots.reduce((sum, s) => sum + s.count, 0);
    setTemplates((prev) =>
      prev.map((t) =>
        t.id === template.id ? { ...t, timesUsed: t.timesUsed + 1, lastUsed: 'Today' } : t,
      ),
    );
    toast.success(
      'Template applied',
      `${shiftCount} shift${shiftCount === 1 ? '' : 's'} from "${template.name}" added to today's roster.`,
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto max-w-[1200px] px-4 py-4 sm:px-6 sm:py-5">
          <button
            type="button"
            onClick={() => router.push(ROUTES.dutyRoster)}
            className="mb-3 flex items-center gap-1.5 font-sans font-medium transition-opacity duration-150 hover:opacity-70 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
            style={{ fontSize: 14, color: '#4A7080' }}
          >
            <ChevronLeft style={{ width: 16, height: 16 }} />
            Back to Workforce Management
          </button>

          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1
                className="font-display font-semibold"
                style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
              >
                Shift Templates
              </h1>
              <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                Reusable shift patterns and rotation blueprints to speed up roster creation.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingTemplate(undefined);
                setModalOpen(true);
              }}
              className="flex h-11 items-center gap-2 rounded-[10px] px-4 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
              style={{ background: '#00B4D8', fontSize: 14 }}
            >
              <Plus style={{ width: 16, height: 16 }} />
              New Template
            </button>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatMini label="Total Templates" value={String(templates.length)} />
            <StatMini
              label="Active Templates"
              value={String(templates.filter((t) => t.active).length)}
            />
            <StatMini
              label="Times Applied"
              value={String(templates.reduce((sum, t) => sum + t.timesUsed, 0))}
            />
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            <div
              className="flex h-11 min-w-[220px] flex-1 items-center gap-2.5 rounded-[10px] px-3.5"
              style={{ border: '1px solid #0064821F', background: '#FFFFFF' }}
            >
              <Search style={{ width: 16, height: 16, color: '#8A98A3', flexShrink: 0 }} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search templates..."
                className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-[#8A98A3]"
                style={{ fontSize: 14, color: '#0D2630' }}
              />
            </div>
            <div className="relative">
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="h-11 appearance-none rounded-[10px] pr-9 pl-3.5 font-sans font-medium"
                style={{
                  border: '1px solid #0064821F',
                  background: '#FFFFFF',
                  fontSize: 14,
                  color: '#0D2630',
                }}
              >
                <option value="ALL">All Departments</option>
                {DEPARTMENT_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-5">
            {pageState === 'loading' ? (
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : pageState === 'error' ? (
              <div
                className="flex flex-col items-center justify-center gap-3 rounded-[12px] py-16 text-center"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <AlertCircle style={{ width: 36, height: 36, color: '#EF4444' }} />
                <p className="font-sans font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                  Failed to load templates
                </p>
                <button
                  type="button"
                  onClick={handleRetry}
                  className="flex items-center gap-2 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-80 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                  style={{
                    height: 40,
                    borderRadius: 12,
                    padding: '0 20px',
                    background: '#00B4D8',
                    fontSize: 14,
                  }}
                >
                  <RefreshCw style={{ width: 16, height: 16 }} />
                  Retry
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <div
                  className="flex size-14 items-center justify-center rounded-full"
                  style={{ background: 'rgba(226,237,241,0.6)' }}
                >
                  <LayoutTemplate style={{ width: 28, height: 28, color: '#8A98A3' }} />
                </div>
                <p className="font-sans font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                  No templates found
                </p>
                <p style={{ fontSize: 14, color: '#4A7080' }}>
                  Try adjusting your search or filters.
                </p>
                {(search || department !== 'ALL') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch('');
                      setDepartment('ALL');
                    }}
                    className="mt-1 font-sans font-semibold transition-opacity duration-150 hover:opacity-70 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                    style={{ fontSize: 14, color: '#00B4D8' }}
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {filtered.map((template) => (
                  <div
                    key={template.id}
                    className="flex flex-col rounded-[12px] p-4"
                    style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p
                          className="font-sans font-semibold"
                          style={{ fontSize: 16, color: '#0D2630' }}
                        >
                          {template.name}
                        </p>
                        <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
                          {template.description}
                        </p>
                      </div>
                      <span
                        className="shrink-0 rounded-full px-2.5 py-0.5 font-sans font-medium"
                        style={{
                          fontSize: 14,
                          whiteSpace: 'nowrap',
                          color: template.active ? '#22C55E' : '#6B7280',
                          border: `1px solid ${template.active ? 'rgba(34,197,94,0.40)' : 'rgba(107,114,128,0.40)'}`,
                          background: template.active ? 'transparent' : 'rgba(107,114,128,0.06)',
                        }}
                      >
                        {template.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <p
                      className="mt-3 font-sans font-medium"
                      style={{ fontSize: 14, color: '#00B4D8' }}
                    >
                      {template.department}
                    </p>

                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {template.slots.map((slot, i) => {
                        const meta = CALENDAR_SLOT_META[slot.slot];
                        return (
                          <span
                            key={i}
                            className="rounded-full px-2.5 py-0.5 font-sans font-medium"
                            style={{
                              fontSize: 14,
                              color: meta.color,
                              border: `1px solid ${meta.border}`,
                              background: meta.bg,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {slot.count}× {slot.role} ({meta.label})
                          </span>
                        );
                      })}
                    </div>

                    <p className="mt-3" style={{ fontSize: 14, color: '#8A98A3' }}>
                      Used {template.timesUsed} time{template.timesUsed === 1 ? '' : 's'}
                      {template.lastUsed ? ` · Last used ${template.lastUsed}` : ' · Never used'}
                    </p>

                    <div
                      className="mt-3.5 flex flex-wrap items-center gap-2"
                      style={{ borderTop: '1px solid rgba(0,100,130,0.08)', paddingTop: 12 }}
                    >
                      <button
                        type="button"
                        onClick={() => handleApply(template)}
                        className="flex items-center gap-1.5 rounded-[8px] px-3 py-2 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                        style={{ fontSize: 14, background: '#00B4D8' }}
                      >
                        <Play style={{ width: 14, height: 14 }} />
                        Apply to Roster
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTemplate(template);
                          setModalOpen(true);
                        }}
                        aria-label={`Edit ${template.name}`}
                        className="flex size-9 shrink-0 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[rgba(0,180,216,0.08)] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                      >
                        <Pencil style={{ width: 15, height: 15, color: '#4A7080' }} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDuplicate(template)}
                        aria-label={`Duplicate ${template.name}`}
                        className="flex size-9 shrink-0 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[rgba(0,180,216,0.08)] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                      >
                        <Copy style={{ width: 15, height: 15, color: '#4A7080' }} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(template)}
                        aria-label={`Delete ${template.name}`}
                        className="ml-auto flex size-9 shrink-0 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[rgba(239,68,68,0.08)] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                      >
                        <Trash2 style={{ width: 15, height: 15, color: '#EF4444' }} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="h-4" />
        </div>
      </main>

      {modalOpen && (
        <TemplateModal
          {...(editingTemplate ? { editingTemplate } : {})}
          onClose={() => {
            setModalOpen(false);
            setEditingTemplate(undefined);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
