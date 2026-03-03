import { useState } from 'react';
import { Table2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { DiagnosticCard, type DiagnosticStatus } from './DiagnosticCard';

interface TableStat {
  table_name: string;
  row_estimate: number;
  dead_tuples: number;
  dead_tuple_ratio: number;
  last_vacuum: string | null;
  last_autovacuum: string | null;
  last_analyze: string | null;
  last_autoanalyze: string | null;
  seq_scan: number;
  idx_scan: number;
  table_size: string;
}

export function TableStatsCard({ triggerRef }: { triggerRef: (fn: () => Promise<void>) => void }) {
  const [status, setStatus] = useState<DiagnosticStatus>('idle');
  const [data, setData] = useState<TableStat[]>([]);

  const run = async () => {
    setStatus('loading');
    const { data: result, error } = await supabase.rpc('get_table_stats');
    if (error) {
      setStatus('error');
      return;
    }
    const tables = (result as TableStat[]) || [];
    setData(tables);

    const hasWarning = tables.some(t => t.dead_tuple_ratio > 10);
    setStatus(hasWarning ? 'warning' : 'healthy');
  };

  triggerRef(run);

  const formatDate = (d: string | null) => {
    if (!d) return '-';
    const date = new Date(d);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1d ago';
    return `${diffDays}d ago`;
  };

  return (
    <DiagnosticCard
      title="Table Statistics"
      description="Row counts, dead tuples, vacuum status, and index usage"
      icon={<div className="p-2 bg-teal-50 rounded-lg"><Table2 size={16} className="text-teal-600" /></div>}
      status={status}
      checkedAt={data.length > 0 ? new Date().toISOString() : null}
      onRun={run}
    >
      {data.length > 0 && (
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-2 px-2 font-medium text-slate-500">Table</th>
                <th className="text-right py-2 px-2 font-medium text-slate-500">Rows</th>
                <th className="text-right py-2 px-2 font-medium text-slate-500">Dead</th>
                <th className="text-right py-2 px-2 font-medium text-slate-500">Dead %</th>
                <th className="text-right py-2 px-2 font-medium text-slate-500">Size</th>
                <th className="text-right py-2 px-2 font-medium text-slate-500">Seq Scans</th>
                <th className="text-right py-2 px-2 font-medium text-slate-500">Idx Scans</th>
                <th className="text-right py-2 px-2 font-medium text-slate-500">Last Vacuum</th>
              </tr>
            </thead>
            <tbody>
              {data.map(t => (
                <tr key={t.table_name} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="py-2 px-2 font-medium text-slate-700">{t.table_name}</td>
                  <td className="py-2 px-2 text-right text-slate-600">{t.row_estimate.toLocaleString()}</td>
                  <td className="py-2 px-2 text-right text-slate-600">{t.dead_tuples.toLocaleString()}</td>
                  <td className="py-2 px-2 text-right">
                    <span className={`px-1.5 py-0.5 rounded ${
                      t.dead_tuple_ratio > 10 ? 'bg-amber-50 text-amber-700' :
                      t.dead_tuple_ratio > 0 ? 'text-slate-600' : 'text-slate-400'
                    }`}>
                      {t.dead_tuple_ratio}%
                    </span>
                  </td>
                  <td className="py-2 px-2 text-right text-slate-600">{t.table_size}</td>
                  <td className="py-2 px-2 text-right text-slate-600">{t.seq_scan.toLocaleString()}</td>
                  <td className="py-2 px-2 text-right text-slate-600">{t.idx_scan.toLocaleString()}</td>
                  <td className="py-2 px-2 text-right text-slate-500">
                    {formatDate(t.last_autovacuum || t.last_vacuum)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DiagnosticCard>
  );
}
