import React from 'react';
import { useTranslation } from 'react-i18next';

const PRICE_RANGES = [
  { id: 'under5', labelKey: 'product.under5', min: 0, max: 5 },
  { id: '5to10', labelKey: 'product.range5to10', min: 5, max: 10 },
  { id: 'over10', labelKey: 'product.over10', min: 10, max: Infinity },
];

interface FilterModalProps {
  selectedPriceRanges: string[];
  onTogglePriceRange: (id: string) => void;
  showOnSale: boolean;
  onToggleOnSale: () => void;
  showBestSellers: boolean;
  onToggleBestSellers: () => void;
  categories: { id: string; label: string }[];
  selectedCategory: string | null;
  onSelectCategory: (id: string) => void;
  onClearAll: () => void;
  onClose: () => void;
}

const FilterModal: React.FC<FilterModalProps> = ({
  selectedPriceRanges,
  onTogglePriceRange,
  showOnSale,
  onToggleOnSale,
  showBestSellers,
  onToggleBestSellers,
  categories,
  selectedCategory,
  onSelectCategory,
  onClearAll,
  onClose,
}) => {
  const { t } = useTranslation();

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[60]" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-[70] bg-surface-light dark:bg-surface-dark rounded-t-2xl shadow-2xl max-h-[80vh] overflow-hidden flex flex-col animate-slide-up">
        <div className="p-4 border-b border-gray-100 dark:border-white/10 shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-text-main dark:text-white">{t('product.filters')}</h3>
            <button className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors" onClick={onClose}>
              <span className="material-symbols-outlined text-text-main dark:text-white">close</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-6">
            <h4 className="text-sm font-bold text-text-main dark:text-white mb-3">{t('product.priceRange')}</h4>
            <div className="flex flex-wrap gap-2">
              {PRICE_RANGES.map((range) => (
                <button
                  key={range.id}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedPriceRanges.includes(range.id)
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 dark:bg-white/10 text-text-main dark:text-white hover:bg-gray-200 dark:hover:bg-white/20'
                  }`}
                  onClick={() => onTogglePriceRange(range.id)}
                >
                  {t(range.labelKey)}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <h4 className="text-sm font-bold text-text-main dark:text-white mb-3">{t('product.category')}</h4>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedCategory === category.id
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 dark:bg-white/10 text-text-main dark:text-white hover:bg-gray-200 dark:hover:bg-white/20'
                  }`}
                  onClick={() => onSelectCategory(category.id)}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <h4 className="text-sm font-bold text-text-main dark:text-white mb-3">{t('product.special')}</h4>
            <div className="space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-text-main dark:text-white">{t('product.onSale')}</span>
                <div
                  className={`w-12 h-7 rounded-full p-1 transition-colors ${showOnSale ? 'bg-primary' : 'bg-gray-200 dark:bg-white/20'}`}
                  onClick={onToggleOnSale}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform ${showOnSale ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-text-main dark:text-white">{t('product.bestSellersOnly')}</span>
                <div
                  className={`w-12 h-7 rounded-full p-1 transition-colors ${showBestSellers ? 'bg-primary' : 'bg-gray-200 dark:bg-white/20'}`}
                  onClick={onToggleBestSellers}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform ${showBestSellers ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
              </label>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 dark:border-white/10 shrink-0 flex gap-3 pb-8">
          <button
            className="flex-1 py-3 rounded-xl font-semibold text-text-main dark:text-white bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
            onClick={onClearAll}
          >
            {t('common.clearAll')}
          </button>
          <button
            className="flex-1 py-3 rounded-xl font-semibold text-white bg-primary hover:bg-red-700 transition-colors"
            onClick={onClose}
          >
            {t('product.applyFilters')}
          </button>
        </div>
      </div>
    </>
  );
};

export default FilterModal;
export { PRICE_RANGES };
