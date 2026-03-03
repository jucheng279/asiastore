import { useState } from 'react';
import { ShieldCheck, ChevronDown, ChevronRight } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { DiagnosticCard, type DiagnosticStatus } from './DiagnosticCard';

interface DraftLiveCounts {
  draft_categories: number;
  live_categories: number;
  draft_products: number;
  live_products: number;
  draft_expiry_items: number;
  live_expiry_items: number;
  draft_flash_items: number;
  live_flash_items: number;
}

interface IntegrityData {
  orphaned_order_items: Array<{ id: string; order_id: string; name: string }>;
  orphaned_order_items_count: number;
  orphaned_favorites: Array<{ id: string; user_id: string; product_id: string }>;
  orphaned_favorites_count: number;
  products_missing_all_names: Array<{ id: string; category_id: string }>;
  products_missing_all_names_count: number;
  products_missing_image: Array<{ id: string; name: string }>;
  products_missing_image_count: number;
  draft_live_counts: DraftLiveCounts;
  total_issues: number;
  checked_at: string;
}

export function DataIntegrityCard({ triggerRef }: { triggerRef: (fn: () => Promise<void>) => void }) {
  const [status, setStatus] = useState<DiagnosticStatus>('idle');
  const [data, setData] = useState<IntegrityData | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const run = async () => {
    setStatus('loading');
    const { data: result, error } = await supabase.rpc('get_data_integrity_check');
    if (error) {
      setStatus('error');
      return;
    }
    const d = result as IntegrityData;
    setData(d);
    setStatus(d.total_issues > 0 ? 'error' : 'healthy');
  };

  triggerRef(run);

  const toggle = (key: string) => {
    setExpandedSection(expandedSection === key ? null : key);
  };

  const checks = data ? [
    {
      key: 'orphaned_orders',
      label: 'Orphaned Order Items',
      desc: 'Order items referencing non-existent orders',
      count: data.orphaned_order_items_count,
      items: data.orphaned_order_items.map(i => `Item "${i.name}" (order: ${i.order_id.slice(0, 8)}...)`),
    },
    {
      key: 'orphaned_favs',
      label: 'Orphaned Favorites',
      desc: 'Favorites pointing to non-existent products',
      count: data.orphaned_favorites_count,
      items: data.orphaned_favorites.map(i => `User ${i.user_id.slice(0, 8)}... -> Product ${i.product_id.slice(0, 8)}...`),
    },
    {
      key: 'no_names',
      label: 'Products Missing All Names',
      desc: 'Products with no name in any language',
      count: data.products_missing_all_names_count,
      items: data.products_missing_all_names.map(i => `Product ${i.id.slice(0, 8)}... (cat: ${i.category_id.slice(0, 8)}...)`),
    },
    {
      key: 'no_image',
      label: 'Products Missing Image',
      desc: 'Parent products with no image set',
      count: data.products_missing_image_count,
      items: data.products_missing_image.map(i => `"${i.name || '(unnamed)'}" (${i.id.slice(0, 8)}...)`),
    },
  ] : [];

  return (
    <DiagnosticCard
      title="Data Integrity"
      description="Orphaned records, broken references, and missing data"
      icon={<div className="p-2 bg-rose-50 rounded-lg"><ShieldCheck size={16} className="text-rose-600" /></div>}
      status={status}
      checkedAt={data?.checked_at ?? null}
      onRun={run}
    >
      {data && (
        <div className="space-y-3">
          <div className={`text-center py-2 rounded-lg text-sm font-medium ${
            data.total_issues === 0
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {data.total_issues === 0
              ? 'No integrity issues found'
              : `${data.total_issues} issue${data.total_issues !== 1 ? 's' : ''} detected`}
          </div>

          <div className="space-y-1">
            {checks.map(check => (
              <div key={check.key} className="border border-slate-100 rounded-lg overflow-hidden">
                <button
                  onClick={() => check.count > 0 && toggle(check.key)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${
                    check.count > 0 ? 'hover:bg-slate-50 cursor-pointer' : 'cursor-default'
                  }`}
                >
                  {check.count > 0 ? (
                    expandedSection === check.key
                      ? <ChevronDown size={14} className="text-slate-400 flex-shrink-0" />
                      : <ChevronRight size={14} className="text-slate-400 flex-shrink-0" />
                  ) : (
                    <span className="w-3.5 flex-shrink-0" />
                  )}
                  <span className="flex-1 text-xs text-slate-700">{check.label}</span>
                  <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                    check.count === 0
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'bg-red-50 text-red-600'
                  }`}>
                    {check.count}
                  </span>
                </button>
                {expandedSection === check.key && check.count > 0 && (
                  <div className="px-3 pb-2 border-t border-slate-50">
                    <p className="text-[11px] text-slate-400 py-1.5">{check.desc}</p>
                    <div className="space-y-1">
                      {check.items.map((item, i) => (
                        <p key={i} className="text-[11px] text-slate-600 font-mono bg-slate-50 px-2 py-1 rounded">
                          {item}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Draft vs. Live Sync</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-1.5 px-2 font-medium text-slate-500">Table</th>
                    <th className="text-right py-1.5 px-2 font-medium text-slate-500">Draft</th>
                    <th className="text-right py-1.5 px-2 font-medium text-slate-500">Live</th>
                    <th className="text-right py-1.5 px-2 font-medium text-slate-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {([
                    ['Categories', data.draft_live_counts.draft_categories, data.draft_live_counts.live_categories],
                    ['Products', data.draft_live_counts.draft_products, data.draft_live_counts.live_products],
                    ['Expiry Items', data.draft_live_counts.draft_expiry_items, data.draft_live_counts.live_expiry_items],
                    ['Flash Sales', data.draft_live_counts.draft_flash_items, data.draft_live_counts.live_flash_items],
                  ] as [string, number, number][]).map(([name, draft, live]) => (
                    <tr key={name} className="border-b border-slate-50">
                      <td className="py-1.5 px-2 text-slate-700">{name}</td>
                      <td className="py-1.5 px-2 text-right text-slate-600">{draft}</td>
                      <td className="py-1.5 px-2 text-right text-slate-600">{live}</td>
                      <td className="py-1.5 px-2 text-right">
                        {draft === live ? (
                          <span className="text-emerald-600 font-medium">In Sync</span>
                        ) : (
                          <span className="text-amber-600 font-medium">Unpushed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </DiagnosticCard>
  );
}
