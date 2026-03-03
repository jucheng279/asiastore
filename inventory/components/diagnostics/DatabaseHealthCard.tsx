import { useState } from 'react';
import { Database } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { DiagnosticCard, type DiagnosticStatus } from './DiagnosticCard';

interface DatabaseHealth {
  database_size: string;
  database_size_bytes: number;
  active_connections: number;
  total_connections: number;
  max_connections: number;
  cache_hit_ratio: number;
  uptime: string;
  checked_at: string;
}

export function DatabaseHealthCard({ triggerRef }: { triggerRef: (fn: () => Promise<void>) => void }) {
  const [status, setStatus] = useState<DiagnosticStatus>('idle');
  const [data, setData] = useState<DatabaseHealth | null>(null);

  const run = async () => {
    setStatus('loading');
    const { data: result, error } = await supabase.rpc('get_database_health');
    if (error) {
      setStatus('error');
      return;
    }
    setData(result as DatabaseHealth);
    const connPct = (result.total_connections / result.max_connections) * 100;
    if (connPct > 90 || result.cache_hit_ratio < 80) {
      setStatus('error');
    } else if (connPct > 70 || result.cache_hit_ratio < 95) {
      setStatus('warning');
    } else {
      setStatus('healthy');
    }
  };

  triggerRef(run);

  const formatUptime = (interval: string) => {
    if (!interval) return '-';
    const parts = interval.split(':');
    if (parts.length >= 2) {
      const hours = parseInt(parts[0]);
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      if (days > 0) return `${days}d ${remainingHours}h`;
      return `${hours}h ${parts[1]}m`;
    }
    return interval;
  };

  return (
    <DiagnosticCard
      title="Database Health"
      description="Connection pool, cache performance, and storage"
      icon={<div className="p-2 bg-blue-50 rounded-lg"><Database size={16} className="text-blue-600" /></div>}
      status={status}
      checkedAt={data?.checked_at ?? null}
      onRun={run}
    >
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricBox
            label="Connections"
            value={`${data.total_connections} / ${data.max_connections}`}
            subtext={`${((data.total_connections / data.max_connections) * 100).toFixed(1)}% used`}
            color={
              (data.total_connections / data.max_connections) > 0.9 ? 'red' :
              (data.total_connections / data.max_connections) > 0.7 ? 'amber' : 'emerald'
            }
          />
          <MetricBox
            label="Cache Hit Ratio"
            value={`${data.cache_hit_ratio}%`}
            subtext={data.cache_hit_ratio >= 99 ? 'Excellent' : data.cache_hit_ratio >= 95 ? 'Good' : 'Needs attention'}
            color={data.cache_hit_ratio >= 95 ? 'emerald' : data.cache_hit_ratio >= 80 ? 'amber' : 'red'}
          />
          <MetricBox
            label="Database Size"
            value={data.database_size}
            subtext="Total storage used"
            color="slate"
          />
          <MetricBox
            label="Uptime"
            value={formatUptime(data.uptime)}
            subtext="Since last restart"
            color="slate"
          />
        </div>
      )}
    </DiagnosticCard>
  );
}

function MetricBox({ label, value, subtext, color }: {
  label: string;
  value: string;
  subtext: string;
  color: 'emerald' | 'amber' | 'red' | 'slate';
}) {
  const bgMap = {
    emerald: 'bg-emerald-50 border-emerald-100',
    amber: 'bg-amber-50 border-amber-100',
    red: 'bg-red-50 border-red-100',
    slate: 'bg-slate-50 border-slate-100',
  };
  const textMap = {
    emerald: 'text-emerald-700',
    amber: 'text-amber-700',
    red: 'text-red-700',
    slate: 'text-slate-700',
  };

  return (
    <div className={`rounded-lg border p-3 ${bgMap[color]}`}>
      <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className={`text-lg font-bold mt-1 ${textMap[color]}`}>{value}</p>
      <p className="text-[11px] text-slate-400 mt-0.5">{subtext}</p>
    </div>
  );
}
