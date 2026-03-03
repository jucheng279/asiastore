import { useState } from 'react';
import { Store, LogIn, AlertCircle, Loader2, ArrowLeft, Mail, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getSiteUrl } from '../../lib/auth';

interface AdminLoginPageProps {
  onLoginSuccess: () => void;
}

type PageMode = 'login' | 'forgot';

export function AdminLoginPage({ onLoginSuccess }: AdminLoginPageProps) {
  const [mode, setMode] = useState<PageMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    onLoginSuccess();
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: getSiteUrl(),
    });
    setLoading(false);

    if (resetError) {
      setError(resetError.message);
    } else {
      setResetSent(true);
    }
  };

  const switchToForgot = () => {
    setMode('forgot');
    setError('');
    setPassword('');
    setResetSent(false);
  };

  const switchToLogin = () => {
    setMode('login');
    setError('');
    setResetSent(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-50 rounded-2xl mb-5 shadow-sm">
            <Store size={30} className="text-primary-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-800">Inventory Management</h1>
          <p className="text-sm text-slate-500 mt-1.5">
            Asia Shop <span className="italic">Linkoping</span>
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-soft overflow-hidden">
          <div className="h-[3px] bg-primary-600" />

          <div className="p-8">
            {mode === 'login' ? (
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="input-field"
                    placeholder="admin@example.com"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={switchToForgot}
                      className="text-xs text-primary-600 font-medium hover:text-primary-700 hover:underline transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="input-field"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !email.trim() || !password}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg transition-all duration-150 hover:bg-primary-700 active:scale-[0.98] shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed mt-1"
                >
                  {loading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <LogIn size={16} />
                  )}
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>
            ) : resetSent ? (
              <div className="space-y-5">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-50 rounded-xl mb-4">
                    <CheckCircle size={24} className="text-emerald-500" />
                  </div>
                  <h2 className="text-base font-semibold text-slate-800 mb-1">Check Your Email</h2>
                  <p className="text-sm text-slate-500">
                    We sent a reset link to <strong className="text-slate-700">{email}</strong>
                  </p>
                </div>

                <div className="flex items-start gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <Mail size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-emerald-700">
                    Please check your inbox and spam folder. The link will redirect you to set a new password.
                  </p>
                </div>

                <button
                  onClick={switchToLogin}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg transition-all duration-150 hover:bg-primary-700 active:scale-[0.98] shadow-sm hover:shadow"
                >
                  <ArrowLeft size={16} />
                  Back to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-5">
                <div className="text-center mb-1">
                  <h2 className="text-base font-semibold text-slate-800 mb-1">Forgot Password?</h2>
                  <p className="text-sm text-slate-500">Enter your email to receive a reset link</p>
                </div>

                {error && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                <div>
                  <label htmlFor="reset-email" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Email
                  </label>
                  <input
                    id="reset-email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="input-field"
                    placeholder="admin@example.com"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg transition-all duration-150 hover:bg-primary-700 active:scale-[0.98] shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Mail size={16} />
                  )}
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>

                <button
                  type="button"
                  onClick={switchToLogin}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-slate-600 text-sm font-medium hover:text-slate-800 transition-colors"
                >
                  <ArrowLeft size={16} />
                  Back to Sign In
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      <p className="text-slate-400 text-xs mt-8">v1.0.0</p>
    </div>
  );
}
