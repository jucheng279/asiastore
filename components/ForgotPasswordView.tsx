import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';

const ForgotPasswordView: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError(t('auth.enterYourEmail'));
      return;
    }

    setLoading(true);
    const err = await resetPassword(email.trim());
    setLoading(false);

    if (err) {
      setError(err);
    } else {
      setSent(true);
    }
  };

  const inputClass = "w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all text-sm";

  return (
    <div className="min-h-screen bg-background-light flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <span className="material-symbols-outlined text-primary text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                {sent ? 'mark_email_read' : 'lock_reset'}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-text-main mb-1">
              {sent ? t('auth.checkYourEmail') : t('auth.forgotPasswordTitle')}
            </h1>
            <p className="text-text-sub text-sm">
              {sent
                ? t('auth.resetLinkSent')
                : t('auth.enterEmailForReset')}
            </p>
          </div>

          {sent ? (
            <div className="space-y-4">
              <div className="px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 flex items-start gap-2">
                <span className="material-symbols-outlined text-emerald-500 text-[18px] mt-0.5">check_circle</span>
                <span>{t('auth.resetLinkSentPrefix')} <strong>{email}</strong>. {t('auth.resetLinkSentSuffix')}</span>
              </div>

              <button
                onClick={() => navigate('/login')}
                className="w-full py-3.5 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-red-700 transition-all flex items-center justify-center gap-2 mt-6"
              >
                {t('auth.backToSignIn')}
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

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-red-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    {t('auth.sending')}
                  </>
                ) : (
                  t('auth.sendResetLink')
                )}
              </button>
            </form>
          )}

          <p className="text-center text-sm text-text-sub mt-8">
            {t('auth.rememberPassword')}{' '}
            <button
              onClick={() => navigate('/login')}
              className="text-primary font-semibold hover:underline"
            >
              {t('common.signIn')}
            </button>
          </p>
        </div>
      </div>

      <div className="py-4 text-center">
        <p className="text-text-sub text-xs">Asia Shop <span className="italic">Linkoping</span> {t('common.version')}</p>
      </div>
    </div>
  );
};

export default ForgotPasswordView;
