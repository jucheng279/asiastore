import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import type { ProductNames } from '../types';

interface CategoryNameModalProps {
  isOpen: boolean;
  title: string;
  names: ProductNames;
  onSave: (names: ProductNames) => void;
  onClose: () => void;
}

const fields: { key: keyof ProductNames; label: string; placeholder: string }[] = [
  { key: 'en', label: 'English', placeholder: 'Name in English' },
  { key: 'sv', label: 'Swedish', placeholder: 'Name in Swedish' },
  { key: 'zh', label: 'Chinese', placeholder: 'Name in Chinese' },
];

export function CategoryNameModal({ isOpen, title, names, onSave, onClose }: CategoryNameModalProps) {
  const [draft, setDraft] = useState<ProductNames>({ ...names });
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setDraft({ ...names });
      setTimeout(() => firstInputRef.current?.focus(), 50);
    }
  }, [isOpen, names]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!draft.en.trim() && !draft.sv.trim() && !draft.zh.trim()) return;
    const saved: ProductNames = {
      en: draft.en.trim(),
      sv: draft.sv.trim(),
      zh: draft.zh.trim(),
    };
    onSave(saved);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 animate-scale-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800 text-sm truncate pr-4">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          {fields.map((field, i) => (
            <div key={field.key}>
              <label className="block text-xs font-medium text-slate-500 mb-1">{field.label}</label>
              <input
                ref={i === 0 ? firstInputRef : undefined}
                type="text"
                value={draft[field.key]}
                onChange={e => setDraft(prev => ({ ...prev, [field.key]: e.target.value }))}
                onKeyDown={handleKeyDown}
                placeholder={field.placeholder}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all placeholder:text-slate-400"
              />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!draft.en.trim() && !draft.sv.trim() && !draft.zh.trim()}
            className="px-4 py-1.5 text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
