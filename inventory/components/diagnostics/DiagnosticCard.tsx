import { useState } from 'react';
import { RefreshCw, CheckCircle2, AlertTriangle, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';

export type DiagnosticStatus = 'idle' | 'loading' | 'healthy' | 'warning' | 'error';

interface DiagnosticCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  status: DiagnosticStatus;
  checkedAt: string | null;
  onRun: () => void;
  children: React.ReactNode;
}

export function DiagnosticCard({ title, description, icon, status, checkedAt, onRun, children }: DiagnosticCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const statusBadge = () => {
    switch (status) {
      case 'healthy':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs rounded-full font-medium">
            <CheckCircle2 size={12} />
            Healthy
          </span>
        );
      case 'warning':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-xs rounded-full font-medium">
            <AlertTriangle size={12} />
            Warning
          </span>
        );
      case 'error':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 text-xs rounded-full font-medium">
            <AlertCircle size={12} />
            Issues Found
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden transition-shadow hover:shadow-sm">
      <div className="flex items-center gap-3 px-5 py-4">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-0.5 hover:bg-slate-100 rounded transition-colors"
        >
          {isExpanded ? (
            <ChevronDown size={16} className="text-slate-400" />
          ) : (
            <ChevronRight size={16} className="text-slate-400" />
          )}
        </button>
        <div className="flex-shrink-0">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
            {statusBadge()}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{description}</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {checkedAt && (
            <span className="text-[11px] text-slate-400">
              {new Date(checkedAt).toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={onRun}
            disabled={status === 'loading'}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-700 bg-primary-50 border border-primary-200 rounded-lg hover:bg-primary-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw size={12} className={status === 'loading' ? 'animate-spin' : ''} />
            {status === 'loading' ? 'Running...' : 'Run'}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="px-5 pb-4 border-t border-slate-100 pt-3">
          {status === 'loading' ? (
            <div className="flex items-center justify-center py-6">
              <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : status === 'idle' ? (
            <p className="text-xs text-slate-400 text-center py-6">
              Click "Run" to execute this diagnostic
            </p>
          ) : (
            children
          )}
        </div>
      )}
    </div>
  );
}
