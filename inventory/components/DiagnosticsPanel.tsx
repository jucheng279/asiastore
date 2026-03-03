import { useRef, useCallback, useState } from 'react';
import { Activity, RefreshCw } from 'lucide-react';
import { DatabaseHealthCard } from './diagnostics/DatabaseHealthCard';
import { TableStatsCard } from './diagnostics/TableStatsCard';
import { OrderAnalyticsCard } from './diagnostics/OrderAnalyticsCard';
import { UserActivityCard } from './diagnostics/UserActivityCard';
import { DataIntegrityCard } from './diagnostics/DataIntegrityCard';

export function DiagnosticsPanel() {
  const triggersRef = useRef<Array<() => Promise<void>>>([]);
  const [runningAll, setRunningAll] = useState(false);

  const registerTrigger = useCallback((index: number) => {
    return (fn: () => Promise<void>) => {
      triggersRef.current[index] = fn;
    };
  }, []);

  const runAll = async () => {
    setRunningAll(true);
    for (const trigger of triggersRef.current) {
      if (trigger) await trigger();
    }
    setRunningAll(false);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-lg">
              <Activity size={20} className="text-slate-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Site Diagnostics</h2>
              <p className="text-sm text-slate-500">Monitor database health, data integrity, and usage analytics</p>
            </div>
          </div>
          <button
            onClick={runAll}
            disabled={runningAll}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <RefreshCw size={14} className={runningAll ? 'animate-spin' : ''} />
            {runningAll ? 'Running All...' : 'Run All Diagnostics'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <DatabaseHealthCard triggerRef={registerTrigger(0)} />
        <TableStatsCard triggerRef={registerTrigger(1)} />
        <OrderAnalyticsCard triggerRef={registerTrigger(2)} />
        <UserActivityCard triggerRef={registerTrigger(3)} />
        <DataIntegrityCard triggerRef={registerTrigger(4)} />
      </div>
    </div>
  );
}
