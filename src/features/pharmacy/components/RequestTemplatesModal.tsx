'use client';

import { FileText, X } from 'lucide-react';

import {
  getProcurementCatalog,
  type ProcurementPriority,
  type ProcurementRequestItem,
  type ProcurementRequestType,
} from '@/features/pharmacy/__mocks__/pharmacyFixtures';
import type { NewRequestInitial } from '@/features/pharmacy/components/NewProcurementRequestModal';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

type Template = {
  name: string;
  description: string;
  requestType: ProcurementRequestType;
  department: string;
  priority: ProcurementPriority;
  picks: { name: string; quantity: number }[];
};

const TEMPLATES: Template[] = [
  {
    name: 'Monthly Antibiotics Restock',
    description: 'Amoxicillin, Azithromycin, and Ciprofloxacin at standard reorder quantities.',
    requestType: 'Medication',
    department: 'Pharmacy',
    priority: 'Medium',
    picks: [
      { name: 'Amoxicillin 500mg', quantity: 300 },
      { name: 'Azithromycin 250mg', quantity: 100 },
      { name: 'Ciprofloxacin 500mg', quantity: 150 },
    ],
  },
  {
    name: 'Emergency Ward Supplies',
    description: 'Gloves, cannulas, and gauze for the Emergency department.',
    requestType: 'Medical Supplies',
    department: 'Emergency',
    priority: 'High',
    picks: [
      { name: 'Surgical Gloves (Box of 100)', quantity: 200 },
      { name: 'IV Cannulas (18G)', quantity: 150 },
      { name: 'Gauze Rolls', quantity: 100 },
    ],
  },
  {
    name: 'Quarterly Equipment Order',
    description: 'Blood pressure monitors and pulse oximeters for routine replacement.',
    requestType: 'Equipment',
    department: 'Pharmacy',
    priority: 'Low',
    picks: [
      { name: 'Digital Blood Pressure Monitor', quantity: 2 },
      { name: 'Pulse Oximeter', quantity: 3 },
    ],
  },
  {
    name: 'Nursing Ward Restock',
    description: 'Alcohol swabs, face masks, and wound dressing kits for Nursing.',
    requestType: 'Medical Supplies',
    department: 'Nursing',
    priority: 'Medium',
    picks: [
      { name: 'Alcohol Swabs (Box)', quantity: 300 },
      { name: 'Face Masks (Box of 50)', quantity: 100 },
      { name: 'Wound Dressing Kits', quantity: 50 },
    ],
  },
];

function resolveTemplateItems(template: Template): ProcurementRequestItem[] {
  const catalog = getProcurementCatalog(template.requestType);
  return template.picks.map((pick) => {
    const match = catalog.find((c) => c.name === pick.name);
    return { name: pick.name, quantity: pick.quantity, unitPrice: match?.unitPrice ?? 0 };
  });
}

/** Lets a pharmacist start a New Procurement Request pre-filled from a
 * common preset instead of building the item list from scratch every time —
 * lazy-loaded (checklist §14). Picking a template opens the New Procurement
 * Request modal pre-filled, so the pharmacist can still review/adjust
 * quantities before submitting — it never submits directly. */
export function RequestTemplatesModal({
  onUseTemplate,
  onClose,
}: {
  onUseTemplate: (initial: NewRequestInitial) => void;
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
        style={{ maxWidth: 560, maxHeight: 'calc(100vh - 64px)', borderRadius: 16 }}
      >
        <div
          className="flex shrink-0 items-start justify-between gap-3 px-6 py-5"
          style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
        >
          <div>
            <h2
              className="font-display font-semibold"
              style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
            >
              Request Templates
            </h2>
            <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
              Start a new request pre-filled from a common preset.
            </p>
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

        <div className="min-h-0 flex-1 overflow-y-auto scroll-smooth px-6 py-5">
          <div className="flex flex-col gap-3">
            {TEMPLATES.map((template) => {
              const items = resolveTemplateItems(template);
              const totalQty = items.reduce((sum, i) => sum + i.quantity, 0);
              return (
                <div
                  key={template.name}
                  className="flex flex-col gap-2.5 rounded-[10px] p-3.5"
                  style={{ border: '1px solid rgba(0,100,130,0.12)' }}
                >
                  <div className="flex items-start gap-2.5">
                    <div
                      className="flex size-9 shrink-0 items-center justify-center rounded-full"
                      style={{ background: 'rgba(0,180,216,0.1)' }}
                    >
                      <FileText style={{ width: 16, height: 16, color: '#00B4D8' }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className="font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {template.name}
                      </p>
                      <p style={{ fontSize: 14, color: '#4A7080' }}>{template.description}</p>
                      <p className="mt-1" style={{ fontSize: 14, color: '#8A98A3' }}>
                        {template.requestType} · {template.department} · {items.length} item
                        {items.length === 1 ? '' : 's'} · {totalQty.toLocaleString('en-GB')} units
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onUseTemplate({
                        requestType: template.requestType,
                        department: template.department,
                        priority: template.priority,
                        items,
                      })
                    }
                    className={`self-end rounded-[8px] px-3.5 py-2 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                    style={{ fontSize: 14, background: '#00B4D8' }}
                  >
                    Use Template
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
