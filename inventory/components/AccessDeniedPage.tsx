import { ShieldX, LogOut } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AccessDeniedPageProps {
  email: string;
}

export function AccessDeniedPage({ email }: AccessDeniedPageProps) {
  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-red-50 rounded-2xl mb-4">
          <ShieldX size={28} className="text-red-500" />
        </div>
        <h1 className="text-xl font-semibold text-slate-800 mb-2">Access Denied</h1>
        <p className="text-sm text-slate-500 mb-1">
          You do not have admin privileges.
        </p>
        <p className="text-xs text-slate-400 mb-6">
          Signed in as {email}
        </p>
        <button
          onClick={handleSignOut}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-all duration-150 hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] shadow-sm"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </div>
  );
}
