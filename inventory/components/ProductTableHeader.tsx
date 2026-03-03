import { useState } from 'react';
import { Language } from '../types';
import { LanguageSelector, getLanguageBadge } from './LanguageSelector';

interface ProductTableHeaderProps {
  currentLanguage: Language;
  onLanguageChange: (language: Language) => void;
}

export function ProductTableHeader({
  currentLanguage,
  onLanguageChange,
}: ProductTableHeaderProps) {
  const [isLanguageSelectorOpen, setIsLanguageSelectorOpen] = useState(false);

  return (
    <div className="flex items-center bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
      <div className="w-7 flex-shrink-0" />
      <div className="w-52 px-2 py-1.5 border-r border-slate-200 relative">
        <button
          onClick={() => setIsLanguageSelectorOpen(true)}
          className="flex items-center gap-2 hover:text-primary-600 transition-colors"
        >
          Name
          <span className="px-1.5 py-0.5 bg-primary-600 text-white text-[10px] rounded-md font-medium normal-case">
            {getLanguageBadge(currentLanguage)}
          </span>
        </button>
        <LanguageSelector
          isOpen={isLanguageSelectorOpen}
          currentLanguage={currentLanguage}
          onSelect={onLanguageChange}
          onClose={() => setIsLanguageSelectorOpen(false)}
        />
      </div>
      <div className="w-20 px-2 py-1.5 border-r border-slate-200">Price</div>
      <div className="w-20 px-2 py-1.5 border-r border-slate-200">Sale</div>
      <div className="w-14 px-2 py-1.5 border-r border-slate-200 flex items-center justify-center">Stock</div>
      <div className="w-[4.5rem] px-2 py-1.5 border-r border-slate-200 flex items-center justify-center">Preserve</div>
      <div className="w-[4.5rem] px-2 py-1.5 border-r border-slate-200 flex items-center justify-center">Available</div>
      <div className="w-16 px-2 py-1.5 border-r border-slate-200 flex items-center justify-center">Info</div>
      <div className="w-14 px-2 py-1.5 border-r border-slate-200 flex items-center justify-center">Order</div>
      <div className="w-14 px-2 py-1.5"></div>
    </div>
  );
}
