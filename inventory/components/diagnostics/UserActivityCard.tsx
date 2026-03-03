import { useState } from 'react';
import { Users, ShieldCheck, ShieldAlert, RotateCcw } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { DiagnosticCard, type DiagnosticStatus } from './DiagnosticCard';

interface UserActivity {
  total_users: number;
  users_today: number;
  users_this_week: number;
  users_this_month: number;
  users_with_orders: number;
  users_with_favorites: number;
  users_with_addresses: number;
  checkins_today: number;
  checkins_this_week: number;
  total_points_ever_existed: number;
  total_points_ever_used: number;
  current_points_left: number;
  points_discrepancy: number;
  checked_at: string;
}

const DISCREPANCY_MARGIN = 100;

export function UserActivityCard({ triggerRef }: { triggerRef: (fn: () => Promise<void>) => void }) {
  const [status, setStatus] = useState<DiagnosticStatus>('idle');
  const [data, setData] = useState<UserActivity | null>(null);

  const run = async () => {
    setStatus('loading');
    const { data: result, error } = await supabase.rpc('get_user_activity_stats');
    if (error) {
      setStatus('error');
      return;
    }
    setData(result as UserActivity);
    setStatus('healthy');
  };

  triggerRef(run);

  return (
    <DiagnosticCard
      title="User Activity"
      description="Registration trends, engagement, and points integrity"
      icon={<div className="p-2 bg-sky-50 rounded-lg"><Users size={16} className="text-sky-600" /></div>}
      status={status}
      checkedAt={data?.checked_at ?? null}
      onRun={run}
    >
      {data && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatBox label="Total Users" value={data.total_users.toString()} />
            <StatBox label="New Today" value={data.users_today.toString()} />
            <StatBox label="New This Week" value={data.users_this_week.toString()} />
            <StatBox label="New This Month" value={data.users_this_month.toString()} />
          </div>

          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Engagement</p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <EngagementPill label="Placed Orders" value={data.users_with_orders} total={data.total_users} />
              <EngagementPill label="Saved Favorites" value={data.users_with_favorites} total={data.total_users} />
              <EngagementPill label="Have Addresses" value={data.users_with_addresses} total={data.total_users} />
              <EngagementPill label="Check-ins Today" value={data.checkins_today} total={data.total_users} />
              <EngagementPill label="Check-ins Week" value={data.checkins_this_week} total={data.total_users} />
            </div>
          </div>

          <PointsOverview data={data} onRefresh={run} />
        </div>
      )}
    </DiagnosticCard>
  );
}

function PointsOverview({ data, onRefresh }: { data: UserActivity; onRefresh: () => Promise<void> }) {
  const [resetting, setResetting] = useState(false);
  const discrepancy = Number(data.points_discrepancy);
  const isHealthy = Math.abs(discrepancy) <= DISCREPANCY_MARGIN;

  const handleReset = async () => {
    if (!confirm('Reset points counters? This will zero out "Ever Issued" and "Used" relative to current balances. No data is deleted.')) return;
    setResetting(true);
    const { error } = await supabase.rpc('reset_points_overview_counters');
    if (!error) await onRefresh();
    setResetting(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Points Overview</p>
        <button
          onClick={handleReset}
          disabled={resetting}
          className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-500 border border-slate-200 rounded-md hover:bg-slate-100 hover:text-slate-700 transition-colors disabled:opacity-50"
        >
          <RotateCcw size={11} className={resetting ? 'animate-spin' : ''} />
          {resetting ? 'Resetting...' : 'Reset'}
        </button>
      </div>
      <div className="flex gap-3 mb-3">
        <StatBox label="Ever Issued" value={`${Number(data.total_points_ever_existed).toFixed(1)} pts`} />
        <StatBox label="Used (Orders)" value={`${Number(data.total_points_ever_used).toFixed(1)} pts`} />
        <StatBox label="Current Balance" value={`${Number(data.current_points_left).toFixed(1)} pts`} />
      </div>
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
        isHealthy
          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
          : 'bg-red-50 border-red-200 text-red-700'
      }`}>
        {isHealthy
          ? <ShieldCheck size={14} className="shrink-0" />
          : <ShieldAlert size={14} className="shrink-0" />
        }
        <span className="text-xs font-medium">
          {isHealthy
            ? 'Points integrity OK'
            : `Discrepancy detected: ${discrepancy > 0 ? '+' : ''}${discrepancy.toFixed(1)} pts`
          }
        </span>
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 min-w-0 rounded-lg border border-slate-100 bg-slate-50 p-3">
      <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-base font-bold text-slate-800 mt-1 truncate">{value}</p>
    </div>
  );
}

function EngagementPill({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = total > 0 ? ((value / total) * 100).toFixed(0) : '0';
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="text-sm font-bold text-slate-800">{value} <span className="text-[10px] font-normal text-slate-400">({pct}%)</span></p>
    </div>
  );
}
