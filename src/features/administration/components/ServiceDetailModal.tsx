'use client';

import { X } from 'lucide-react';

import { formatCurrencyWhole } from '@/utils/currency';
import { formatDateTime, formatHumanDate } from '@/utils/datetime';
import type { ServiceRecord } from '@/features/administration/__mocks__/servicePricingFixtures';
import type { PriceChangeLogEntry } from '@/features/administration/__mocks__/priceChangeLogFixtures';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

/** Read-only. Editing happens through Edit Price / the publish workflow,
 * never here. */
export function ServiceDetailModal({
  service,
  log,
  onClose,
}: {
  service: ServiceRecord;
  log: PriceChangeLogEntry[];
  onClose: () => void;
}) {
  const history = log.filter(
    (entry) => entry.serviceId === service.id || entry.serviceName === service.name,
  );

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
        style={{ maxWidth: 520, maxHeight: 'calc(100vh - 64px)', borderRadius: 16 }}
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
              {service.name}
            </h2>
            <p className="mt-0.5" style={{ fontSize: 14, color: '#00B4D8' }}>
              {service.id}
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
            {[
              ['Department', service.department],
              ['Category', service.category],
              ['Current Price', formatCurrencyWhole(service.currentPrice)],
              ['Effective Date', formatHumanDate(service.effectiveDate)],
              ['Status', service.status],
              [
                'Last Updated',
                `${formatDateTime(service.lastUpdatedAt)} by ${service.lastUpdatedBy}`,
              ],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-2">
                <span style={{ fontSize: 14, color: '#8A98A3' }}>{label}</span>
                <span
                  className="max-w-[260px] truncate text-right font-sans font-medium"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  {value}
                </span>
              </div>
            ))}
            {service.pendingPrice !== null && (
              <div
                className="mt-1 flex items-center justify-between gap-2 rounded-[10px] p-3"
                style={{
                  background: 'rgba(217,119,6,0.06)',
                  border: '1px solid rgba(217,119,6,0.3)',
                }}
              >
                <span style={{ fontSize: 14, color: '#D97706' }}>Pending change</span>
                <span
                  className="font-sans font-semibold"
                  style={{ fontSize: 14, color: '#D97706' }}
                >
                  {formatCurrencyWhole(service.pendingPrice)} effective{' '}
                  {service.pendingEffectiveDate
                    ? formatHumanDate(service.pendingEffectiveDate)
                    : ''}
                </span>
              </div>
            )}
          </div>

          <div className="mt-5">
            <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
              Price History
            </p>
            {history.length === 0 ? (
              <p className="mt-2" style={{ fontSize: 14, color: '#8A98A3' }}>
                No published price changes yet.
              </p>
            ) : (
              <div className="mt-2 flex flex-col gap-2">
                {history.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between gap-2">
                    <span style={{ fontSize: 14, color: '#4A7080' }}>
                      {formatCurrencyWhole(entry.previousPrice)} &rarr;{' '}
                      {formatCurrencyWhole(entry.newPrice)}
                    </span>
                    <span style={{ fontSize: 14, color: '#8A98A3' }}>
                      {formatHumanDate(entry.effectiveDate)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div
          className="flex shrink-0 items-center justify-end px-6 py-4"
          style={{ borderTop: '1px solid rgba(0,100,130,0.12)' }}
        >
          <button
            type="button"
            onClick={onClose}
            className={`flex h-11 items-center gap-1.5 rounded-[10px] px-5 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
            style={{ fontSize: 14, background: '#00B4D8' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
