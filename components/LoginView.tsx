import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { useProductData } from '../lib/ProductDataContext';
import AuthLanguagePicker from './AuthLanguagePicker';
import type { Language } from '../lib/api';

const LoginView: React.FC = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { signIn, profile } = useAuth();
  const { setLanguage } = useProductData();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [localLang, setLocalLang] = useState<Language>((i18n.language as Language) || 'en');
  const justSignedIn = useRef(false);

  useEffect(() => {
    if (justSignedIn.current && profile?.preferred_language) {
      const lang = profile.preferred_language as Language;
      i18n.changeLanguage(lang);
      setLanguage(lang);
      justSignedIn.current = false;
      navigate('/');
    }
  }, [profile]);

  const handleLanguageChange = (lang: Language) => {
    setLocalLang(lang);
    i18n.changeLanguage(lang);
    setLanguage(lang);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError(t('auth.fillAllFields'));
      return;
    }

    setLoading(true);
    justSignedIn.current = true;
    const err = await signIn(email.trim(), password);
    setLoading(false);

    if (err) {
      justSignedIn.current = false;
      setError(err);
    }
  };

  const inputClass = "w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all text-sm";

  return (
    <div className="min-h-screen bg-background-light flex flex-col">
      <div className="flex justify-end px-4 pt-4">
        <AuthLanguagePicker value={localLang} onChange={handleLanguageChange} />
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <span className="material-symbols-outlined text-primary text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>storefront</span>
            </div>
            <h1 className="text-2xl font-bold text-text-main mb-1">{t('auth.welcomeBack')}</h1>
            <p className="text-text-sub text-sm">{t('auth.signInTo')}</p>
          </div>

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

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-text-main">{t('common.password')}</label>
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  className="text-xs text-primary font-semibold hover:underline"
                >
                  {t('auth.forgotPassword')}
                </button>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                placeholder={t('auth.enterPassword')}
                autoComplete="current-password"
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
                  {t('auth.signingIn')}
                </>
              ) : (
                t('common.signIn')
              )}
            </button>
          </form>

          <p className="text-center text-sm text-text-sub mt-8">
            {t('auth.noAccount')}{' '}
            <button
              onClick={() => navigate('/register')}
              className="text-primary font-semibold hover:underline"
            >
              {t('common.register')}
            </button>
          </p>
          <p className="text-center text-xs text-amber-600 mt-2 flex items-center justify-center gap-1">
            <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>stars</span>
            {t('auth.bonusPoint')}
          </p>

          <button
            onClick={() => navigate('/')}
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

export default LoginView;
