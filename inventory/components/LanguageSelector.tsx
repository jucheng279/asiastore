import { Language } from '../types';
import { Check } from 'lucide-react';

interface LanguageSelectorProps {
  isOpen: boolean;
  currentLanguage: Language;
  onSelect: (language: Language) => void;
  onClose: () => void;
}

const languageLabels: Record<Language, string> = {
  en: 'English',
  sv: 'Swedish',
  zh: 'Chinese',
};

export function LanguageSelector({
  isOpen,
  currentLanguage,
  onSelect,
  onClose,
}: LanguageSelectorProps) {
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute top-full left-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-soft-lg z-20 min-w-36 py-1.5 animate-scale-in">
        {(Object.keys(languageLabels) as Language[]).map(lang => (
          <button
            key={lang}
            onClick={() => {
              onSelect(lang);
              onClose();
            }}
            className={`w-full flex items-center justify-between px-4 py-2 text-left text-sm transition-colors ${
              currentLanguage === lang
                ? 'bg-primary-50 text-primary-700'
                : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <span>{languageLabels[lang]}</span>
            {currentLanguage === lang && (
              <Check size={14} className="text-primary-600" />
            )}
          </button>
        ))}
      </div>
    </>
  );
}

export function getLanguageBadge(language: Language): string {
  const badges: Record<Language, string> = {
    en: 'EN',
    sv: 'SE',
    zh: 'ZH',
  };
  return badges[language];
}
