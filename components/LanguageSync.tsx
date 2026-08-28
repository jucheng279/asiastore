import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../lib/AuthContext';
import { useProductData } from '../lib/ProductDataContext';
import type { Language } from '../lib/api';

export function LanguageSync() {
  const { profile, isAuthenticated } = useAuth();
  const { setLanguage } = useProductData();
  const { i18n } = useTranslation();
  const appliedRef = useRef(false);

  useEffect(() => {
    if (isAuthenticated && profile?.preferred_language && !appliedRef.current) {
      const lang = profile.preferred_language as Language;
      if (lang !== i18n.language) {
        i18n.changeLanguage(lang);
        setLanguage(lang);
      }
      appliedRef.current = true;
    }
    if (!isAuthenticated) {
      appliedRef.current = false;
    }
  }, [isAuthenticated, profile, setLanguage, i18n]);

  return null;
}
