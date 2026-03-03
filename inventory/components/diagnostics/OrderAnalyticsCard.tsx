import { useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { DiagnosticCard, type DiagnosticStatus } from './DiagnosticCard';

interface TopProduct {
  name: string;
  total_quantity: number;
  total_revenue: number;
}

interface OrderAnalytics {
  total_orders: number;
  orders_today: number;
  orders_this_week: number;
  orders_this_month: number;
  total_revenue: number;
  revenue_today: number;
  revenue_this_week: number;
  average_order_value: number;
  total_items_sold: number;
  points_orders: number;
  top_products: TopProduct[];
  checked_at: string;
}

export function OrderAnalyticsCard({ triggerRef }: { triggerRef: (fn: () => Promise<void>) => void }) {
  const [status, setStatus] = useState<DiagnosticStatus>('idle');
  const [data, setData] = useState<OrderAnalytics | null>(null);

  const run = async () => {
    setStatus('loading');
    const { data: result, error } = await supabase.rpc('get_order_analytics');
    if (error) {
      setStatus('error');
      return;
    }
    setData(result as OrderAnalytics);
    setStatus('healthy');
  };

  triggerRef(run);

  const fmt = (n: number) => `${Number(n).toFixed(2)} kr`;

  return (
    <DiagnosticCard
      title="Order Analytics"
      description="Order volume, revenue, and top-selling products"
      icon={<div className="p-2 bg-green-50 rounded-lg"><ShoppingCart size={16} className="text-green-600" /></div>}
      status={status}
      checkedAt={data?.checked_at ?? null}
      onRun={run}
    >
      {data && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatBox label="Total Orders" value={data.total_orders.toString()} />
            <StatBox label="Today" value={data.orders_today.toString()} />
            <StatBox label="This Week" value={data.orders_this_week.toString()} />
            <StatBox label="This Month" value={data.orders_this_month.toString()} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatBox label="Total Revenue" value={fmt(data.total_revenue)} />
            <StatBox label="Avg. Order" value={fmt(data.average_order_value)} />
            <StatBox label="Items Sold" value={data.total_items_sold.toString()} />
            <StatBox label="Points Orders" value={data.points_orders.toString()} />
          </div>

          {data.top_products.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Top Products</p>
              <div className="space-y-1">
                {data.top_products.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-slate-50 transition-colors">
                    <span className="w-5 h-5 flex items-center justify-center bg-slate-100 rounded text-[10px] font-bold text-slate-500">
                      {i + 1}
                    </span>
                    <span className="flex-1 text-xs text-slate-700 truncate">{p.name || '(unnamed)'}</span>
                    <span className="text-xs text-slate-500">{p.total_quantity} sold</span>
                    <span className="text-xs font-medium text-slate-700">{fmt(p.total_revenue)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </DiagnosticCard>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
      <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-lg font-bold text-slate-800 mt-1">{value}</p>
    </div>
  );
}
