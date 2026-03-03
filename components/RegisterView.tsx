import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../lib/AuthContext';
import type { ViewState } from '../types';

interface RegisterViewProps {
  onNavigate: (view: ViewState) => void;
  onAuthSuccess?: () => void;
}

const RegisterView: React.FC<RegisterViewProps> = ({ onNavigate, onAuthSuccess }) => {
  const { t } = useTranslation();
  const { signUp } = useAuth();
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError(t('auth.emailRequired'));
      return;
    }
    if (password.length < 6) {
      setError(t('auth.passwordMin6'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('auth.passwordsNoMatch'));
      return;
    }

    setLoading(true);
    const err = await signUp(email.trim(), password, nickname.trim() || undefined);
    setLoading(false);

    if (err) {
      setError(err);
    } else {
      onAuthSuccess?.();
    }
  };

  const inputClass = "w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all text-sm";

  return (
    <div className="min-h-screen bg-background-light flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <span className="material-symbols-outlined text-primary text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>person_add</span>
            </div>
            <h1 className="text-2xl font-bold text-text-main mb-1">{t('auth.createAccount')}</h1>
            <p className="text-text-sub text-sm">{t('auth.joinShop')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-2">
                <span className="material-symbols-outlined text-red-500 text-[18px] mt-0.5">error</span>
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-text-main mb-1.5">
                {t('auth.nicknameOptional')} <span className="text-text-sub font-normal">({t('checkout.optional')})</span>
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className={inputClass}
                placeholder={t('auth.displayName')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-main mb-1.5">{t('common.email')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder="your@email.com"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-main mb-1.5">{t('common.password')}</label>
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
                placeholder={t('auth.repeatPassword')}
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
                  {t('auth.creatingAccount')}
                </>
              ) : (
                t('auth.createAccount')
              )}
            </button>
          </form>

          <div className="flex items-center justify-center gap-1.5 mt-5 px-3 py-2.5 bg-amber-50 border border-amber-200/60 rounded-xl">
            <span className="material-symbols-outlined text-amber-500 text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>stars</span>
            <p className="text-xs text-amber-700 font-medium">{t('auth.registerBonus')}</p>
          </div>

          <p className="text-center text-sm text-text-sub mt-6">
            {t('auth.alreadyHaveAccount')}{' '}
            <button
              onClick={() => onNavigate('LOGIN')}
              className="text-primary font-semibold hover:underline"
            >
              {t('common.signIn')}
            </button>
          </p>

          <button
            onClick={() => onNavigate('HOME')}
            className="w-full mt-4 py-3 text-text-sub text-sm font-medium hover:text-text-main transition-colors"
          >
            {t('auth.browseAsGuest')}
          </button>
        </div>
      </div>

      <div className="py-4 text-center">
        <p className="text-text-sub text-xs">Asia Shop <span className="italic">Linkoping</span> {t('common.version')}</p>
      </div>
    </div>
  );
};

export default RegisterView;
