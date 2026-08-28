import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

type Language = 'en' | 'sv' | 'zh';

const LANGUAGES: { code: Language; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'sv', label: 'SV' },
  { code: 'zh', label: 'ZH' },
];

interface Props {
  value: Language;
  onChange: (lang: Language) => void;
}

const AuthLanguagePicker: React.FC<Props> = ({ value, onChange }) => {
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

  const current = LANGUAGES.find(l => l.code === value) || LANGUAGES[0];

  const handleChange = (code: Language) => {
    onChange(code);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-text-sub hover:bg-gray-100 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className="material-symbols-outlined text-[16px]">language</span>
        <span>{current.label}</span>
        <span className="material-symbols-outlined text-[14px]">
          {open ? 'expand_less' : 'expand_more'}
        </span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-100 overflow-hidden z-[100] min-w-[100px]">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              type="button"
              className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                value === lang.code
                  ? 'bg-primary/10 text-primary'
                  : 'text-text-main hover:bg-gray-50'
              }`}
              onClick={() => handleChange(lang.code)}
            >
              <span>{lang.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default AuthLanguagePicker;
