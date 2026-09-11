import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AdminPage } from './components/AdminPage';
import { AdminLoginPage } from './components/AdminLoginPage';
import { AdminResetPasswordPage } from './components/AdminResetPasswordPage';
import { AccessDeniedPage } from './components/AccessDeniedPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import type { Session } from '@supabase/supabase-js';

type AuthState = 'loading' | 'unauthenticated' | 'checking_admin' | 'admin' | 'denied' | 'password_recovery';

function App() {
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [session, setSession] = useState<Session | null>(null);

  const checkAdmin = async (userId: string) => {
    setAuthState('checking_admin');
    const { data } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .maybeSingle();

    setAuthState(data?.is_admin ? 'admin' : 'denied');
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s?.user) {
        checkAdmin(s.user.id);
      } else {
        setAuthState('unauthenticated');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSession(s);
        setAuthState('password_recovery');
        return;
      }
      setSession(s);
      if (s?.user) {
        checkAdmin(s.user.id);
      } else {
        setAuthState('unauthenticated');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (authState === 'loading' || authState === 'checking_admin') {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 text-sm">
            {authState === 'loading' ? 'Loading...' : 'Verifying access...'}
          </p>
        </div>
      </div>
    );
  }

  if (authState === 'password_recovery') {
    return (
      <AdminResetPasswordPage
        onComplete={async () => {
          await supabase.auth.signOut();
          setAuthState('unauthenticated');
        }}
      />
    );
  }

  if (authState === 'unauthenticated') {
    return <AdminLoginPage onLoginSuccess={() => {}} />;
  }

  if (authState === 'denied') {
    return <AccessDeniedPage email={session?.user?.email || ''} />;
  }

  return <ErrorBoundary><AdminPage onSignOut={() => supabase.auth.signOut()} /></ErrorBoundary>;
}

export default App;
