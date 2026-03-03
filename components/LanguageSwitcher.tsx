import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useProductData } from '../lib/ProductDataContext';
import type { Language } from '../lib/api';

const LANGUAGES: { code: Language; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'sv', label: 'SV' },
  { code: 'zh', label: 'ZH' },
];

const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage } = useProductData();
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const current = LANGUAGES.find(l => l.code === language) || LANGUAGES[0];

  const handleLanguageChange = (code: Language) => {
    setLanguage(code);
    i18n.changeLanguage(code);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-bold text-text-main dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className="material-symbols-outlined text-[16px]">language</span>
        <span>{current.label}</span>
        <span className="material-symbols-outlined text-[14px]">
          {open ? 'expand_less' : 'expand_more'}
        </span>
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 bg-surface-light dark:bg-surface-dark rounded-lg shadow-lg border border-gray-100 dark:border-white/10 overflow-hidden z-[100] min-w-[100px]">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                language === lang.code
                  ? 'bg-primary/10 text-primary'
                  : 'text-text-main dark:text-white hover:bg-gray-50 dark:hover:bg-white/5'
              }`}
              onClick={() => handleLanguageChange(lang.code)}
            >
              <span>{lang.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
