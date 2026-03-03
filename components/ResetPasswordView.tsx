import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../lib/AuthContext';
import type { ViewState } from '../types';

interface ResetPasswordViewProps {
  onNavigate: (view: ViewState) => void;
}

const ResetPasswordView: React.FC<ResetPasswordViewProps> = ({ onNavigate }) => {
  const { t } = useTranslation();
  const { updatePassword, clearPasswordRecovery } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError(t('auth.passwordMin6'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('auth.passwordsNoMatch'));
      return;
    }

    setLoading(true);
    const err = await updatePassword(password);
    setLoading(false);

    if (err) {
      setError(err);
    } else {
      setSuccess(true);
    }
  };

  const handleGoToSignIn = () => {
    clearPasswordRecovery();
    onNavigate('LOGIN');
  };

  const inputClass = "w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all text-sm";

  return (
    <div className="min-h-screen bg-background-light flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <span className="material-symbols-outlined text-primary text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                {success ? 'check_circle' : 'lock'}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-text-main mb-1">
              {success ? t('auth.passwordUpdated') : t('auth.setNewPassword')}
            </h1>
            <p className="text-text-sub text-sm">
              {success
                ? t('auth.passwordChangedSuccess')
                : t('auth.enterNewPassword')}
            </p>
          </div>

          {success ? (
            <div className="space-y-4">
              <div className="px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 flex items-start gap-2">
                <span className="material-symbols-outlined text-emerald-500 text-[18px] mt-0.5">check_circle</span>
                <span>{t('auth.passwordUpdateSuccess')}</span>
              </div>

              <button
                onClick={handleGoToSignIn}
                className="w-full py-3.5 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-red-700 transition-all flex items-center justify-center gap-2 mt-6"
              >
                {t('common.signIn')}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-2">
                  <span className="material-symbols-outlined text-red-500 text-[18px] mt-0.5">error</span>
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-text-main mb-1.5">{t('auth.newPassword')}</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                  placeholder={t('auth.atLeast6')}
                  autoComplete="new-password"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-main mb-1.5">{t('auth.confirmPassword')}</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={inputClass}
                  placeholder={t('auth.repeatNewPassword')}
                  autoComplete="new-password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-red-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    {t('auth.updating')}
                  </>
                ) : (
                  t('auth.updatePassword')
                )}
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="py-4 text-center">
        <p className="text-text-sub text-xs">Asia Shop <span className="italic">Linkoping</span> {t('common.version')}</p>
      </div>
    </div>
  );
};

export default ResetPasswordView;
