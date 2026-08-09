'use client';

import { AlertTriangle, Ban, Package, Wallet } from 'lucide-react';

import {
  ScrollableTable,
  TABLE_HEADER_BG,
  TABLE_HEADER_STICKY_CLASS,
} from '@components/shared/ScrollableTable';
import { Tooltip } from '@components/shared/Tooltip';
import { formatCurrencyCompact } from '@/utils/currency';
import { formatHumanDate } from '@/utils/datetime';
import {
  getInventorySummary,
  getInventoryStatus,
  useInventoryItems,
} from '@/features/laboratory/store/inventoryStore';
import { donutColorFor, ReportDonutCard, ReportStatCard } from './reportShared';

export function InventoryReportsTab() {
  const items = useInventoryItems();
  const summary = getInventorySummary();

  const categoryCounts = new Map<string, number>();
  for (const item of items)
    categoryCounts.set(item.category, (categoryCounts.get(item.category) ?? 0) + 1);
  const categoryBreakdown = [...categoryCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, value], i) => ({ label, value, color: donutColorFor(i) }));

  const attentionItems = items
    .filter((item) => {
      const status = getInventoryStatus(item);
      return status === 'Expiring Soon' || status === 'Expired' || status === 'Out of Stock';
    })
    .sort((a, b) => (a.expiryDate ?? '9999').localeCompare(b.expiryDate ?? '9999'))
    .slice(0, 10);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ReportStatCard
          icon={Package}
          iconColor="#2563EB"
          iconBg="rgba(37,99,235,0.12)"
          label="Total Items"
          value={summary.total.toLocaleString('en-GB')}
          info="Across all departments"
        />
        <ReportStatCard
          icon={AlertTriangle}
          iconColor="#D97706"
          iconBg="rgba(245,158,11,0.12)"
          label="Low / Expiring"
          value={(summary.lowStock + summary.expiringSoon).toLocaleString('en-GB')}
          info={`${summary.lowStock} low stock, ${summary.expiringSoon} expiring soon`}
          infoColor="#D97706"
        />
        <ReportStatCard
          icon={Ban}
          iconColor="#DC2626"
          iconBg="rgba(239,68,68,0.12)"
          label="Expired / Out of Stock"
          value={(summary.expired + summary.outOfStock).toLocaleString('en-GB')}
          info="Remove or reorder"
          infoColor="#DC2626"
        />
        <ReportStatCard
          icon={Wallet}
          iconColor="#00B4D8"
          iconBg="rgba(0,180,216,0.12)"
          label="Total Inventory Value"
          value={formatCurrencyCompact(summary.totalValue)}
          info="Current stock value"
        />
      </div>

      <ReportDonutCard
        title="Inventory by Category"
        breakdown={categoryBreakdown}
        total={summary.total}
      />

      <div
        className="rounded-[12px] p-4"
        style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
      >
        <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
          Needs Attention
        </h2>
        {attentionItems.length === 0 ? (
          <p className="mt-3" style={{ fontSize: 14, color: '#8A98A3' }}>
            Nothing is expiring soon, expired, or out of stock.
          </p>
        ) : (
          <div className="mt-3">
            <ScrollableTable minWidth={880}>
              <div
                className={`flex items-center rounded-t-[8px] ${TABLE_HEADER_STICKY_CLASS}`}
                style={{ background: TABLE_HEADER_BG, borderBottom: '1px solid #E6F8FD' }}
              >
                {[
                  ['Item Name', 'min-w-[180px] flex-1'],
                  ['Category', 'w-36'],
                  ['Department', 'w-36'],
                  ['Expiry Date', 'w-40'],
                  ['Status', 'w-36'],
                ].map(([label, width]) => (
                  <div key={label} className={`${width} shrink-0 py-2.5 pr-2 pl-3 text-center`}>
                    <span
                      className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      {label}
                    </span>
                  </div>
                ))}
              </div>
              {attentionItems.map((item) => {
                const status = getInventoryStatus(item);
                const statusColor =
                  status === 'Expired' || status === 'Out of Stock' ? '#DC2626' : '#D97706';
                return (
                  <div
                    key={item.id}
                    className="flex items-center"
                    style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                  >
                    <div className="min-w-[180px] flex-1 py-3 pr-2 pl-3 text-center">
                      <Tooltip content={item.name}>
                        <p
                          className="truncate font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {item.name}
                        </p>
                      </Tooltip>
                    </div>
                    <div className="w-36 shrink-0 py-3 pr-2 text-center">
                      <p style={{ fontSize: 14, color: '#4A7080' }}>{item.category}</p>
                    </div>
                    <div className="w-36 shrink-0 py-3 pr-2 text-center">
                      <Tooltip content={item.department}>
                        <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                          {item.department}
                        </p>
                      </Tooltip>
                    </div>
                    <div className="w-40 shrink-0 py-3 pr-2 text-center">
                      <p style={{ fontSize: 14, color: '#4A7080' }}>
                        {item.expiryDate ? formatHumanDate(item.expiryDate) : '—'}
                      </p>
                    </div>
                    <div className="w-36 shrink-0 py-3 pr-2 text-center">
                      <p
                        className="font-sans font-medium"
                        style={{ fontSize: 14, color: statusColor }}
                      >
                        {status}
                      </p>
                    </div>
                  </div>
                );
              })}
            </ScrollableTable>
          </div>
        )}
      </div>
    </div>
  );
}
