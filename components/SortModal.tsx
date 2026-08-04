import React from 'react';
import { useTranslation } from 'react-i18next';

type SortOption = 'popular' | 'price-low' | 'price-high' | 'newest';

const SORT_OPTIONS: { value: SortOption; labelKey: string }[] = [
  { value: 'popular', labelKey: 'product.mostPopular' },
  { value: 'price-low', labelKey: 'product.priceLowHigh' },
  { value: 'price-high', labelKey: 'product.priceHighLow' },
  { value: 'newest', labelKey: 'product.newestFirst' },
];

interface SortModalProps {
  sortBy: SortOption;
  onSelect: (value: SortOption) => void;
  onClose: () => void;
}

const SortModal: React.FC<SortModalProps> = ({ sortBy, onSelect, onClose }) => {
  const { t } = useTranslation();

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[60]" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-[70] bg-surface-light dark:bg-surface-dark rounded-t-2xl shadow-2xl animate-slide-up">
        <div className="p-4 border-b border-gray-100 dark:border-white/10">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-text-main dark:text-white">{t('product.sortBy')}</h3>
            <button className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors" onClick={onClose}>
              <span className="material-symbols-outlined text-text-main dark:text-white">close</span>
            </button>
          </div>
        </div>
        <div className="p-2 pb-8">
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.value}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                sortBy === option.value
                  ? 'bg-primary/10 text-primary'
                  : 'text-text-main dark:text-white hover:bg-gray-100 dark:hover:bg-white/10'
              }`}
              onClick={() => onSelect(option.value)}
            >
              <span className="font-medium">{t(option.labelKey)}</span>
              {sortBy === option.value && (
                <span className="material-symbols-outlined text-primary">check</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </>
  );
};

export default SortModal;
export type { SortOption };
