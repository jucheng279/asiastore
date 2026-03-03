import { useState } from 'react';
import { Lock, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AdminResetPasswordPageProps {
  onComplete: () => void;
}

export function AdminResetPasswordPage({ onComplete }: AdminResetPasswordPageProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-50 rounded-2xl mb-5 shadow-sm">
            {success ? (
              <CheckCircle size={30} className="text-emerald-500" />
            ) : (
              <Lock size={30} className="text-primary-600" />
            )}
          </div>
          <h1 className="text-xl font-bold text-slate-800">
            {success ? 'Password Updated' : 'Set New Password'}
          </h1>
          <p className="text-sm text-slate-500 mt-1.5">
            {success
              ? 'Your password has been changed successfully'
              : 'Enter your new password below'}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-soft overflow-hidden">
          <div className="h-[3px] bg-primary-600" />

          <div className="p-8">
            {success ? (
              <div className="space-y-5">
                <div className="flex items-start gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <CheckCircle size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-emerald-700">
                    Your password has been updated. You can now sign in with your new password.
                  </p>
                </div>

                <button
                  onClick={onComplete}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg transition-all duration-150 hover:bg-primary-700 active:scale-[0.98] shadow-sm hover:shadow"
                >
                  Continue to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                <div>
                  <label htmlFor="new-password" className="block text-sm font-medium text-slate-700 mb-1.5">
                    New Password
                  </label>
                  <input
                    id="new-password"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    className="input-field"
                    placeholder="At least 6 characters"
                  />
                </div>

                <div>
                  <label htmlFor="confirm-password" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Confirm Password
                  </label>
                  <input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    className="input-field"
                    placeholder="Repeat your new password"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !password || !confirmPassword}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg transition-all duration-150 hover:bg-primary-700 active:scale-[0.98] shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Lock size={16} />
                  )}
                  {loading ? 'Updating...' : 'Update Password'}
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
