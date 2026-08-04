import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useProductData } from '../lib/ProductDataContext';
import { useCart } from '../lib/CartContext';
import { useSearchProducts } from '../lib/useSearchProducts';
import BottomNav from './BottomNav';
import { ProductGrid } from './ProductGrids';
import SortModal, { type SortOption } from './SortModal';
import FilterModal, { PRICE_RANGES } from './FilterModal';


const ListingView: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { category: initialCategory } = useParams<{ category?: string }>();
  const { categories, subcategories, language, catalogProducts } = useProductData();
  const { cartCount } = useCart();

  const mainCategories = categories.map(c => ({ id: c.id, label: c.name }));

  const subcategoriesByCategory: Record<string, { id: string; label: string }[]> = {};
  for (const sub of subcategories) {
    if (!subcategoriesByCategory[sub.category_id]) {
      subcategoriesByCategory[sub.category_id] = [];
    }
    subcategoriesByCategory[sub.category_id].push({ id: sub.id, label: sub.name });
  }

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('popular');
  const [showSortModal, setShowSortModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedPriceRanges, setSelectedPriceRanges] = useState<string[]>([]);
  const [showOnSale, setShowOnSale] = useState(false);
  const [showBestSellers, setShowBestSellers] = useState(false);
  const [selectedMainCategory, setSelectedMainCategory] = useState<string | null>(initialCategory || null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);

  const togglePriceRange = (id: string) => {
    setSelectedPriceRanges(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const selectMainCategory = (id: string) => {
    if (selectedMainCategory === id) {
      setSelectedMainCategory(null);
      setSelectedSubcategory(null);
    } else {
      setSelectedMainCategory(id);
      setSelectedSubcategory(null);
    }
  };

  const selectSubcategory = (id: string) => {
    setSelectedSubcategory(selectedSubcategory === id ? null : id);
  };

  const clearFilters = () => {
    setSelectedPriceRanges([]);
    setShowOnSale(false);
    setShowBestSellers(false);
    setSelectedMainCategory(null);
    setSelectedSubcategory(null);
  };

  const activeFilterCount = selectedPriceRanges.length + (showOnSale ? 1 : 0) + (showBestSellers ? 1 : 0);

  const priceRangeValues = useMemo(() => {
    return selectedPriceRanges.map(rangeId => {
      const range = PRICE_RANGES.find(r => r.id === rangeId);
      return range ? { min: range.min, max: range.max } : { min: 0, max: Infinity };
    });
  }, [selectedPriceRanges]);

  const { products: filteredAndSortedProducts, totalCount, isLoading: isSearching } = useSearchProducts({
    lang: language,
    category: selectedMainCategory,
    subcategory: selectedSubcategory,
    search: searchQuery,
    priceRanges: priceRangeValues.length > 0 ? priceRangeValues : undefined,
    onSale: showOnSale,
    bestSellers: showBestSellers,
    sortBy,
    limit: 100,
    fallbackProducts: catalogProducts,
  });

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen pb-20 lg:pb-8">
      <div className="sticky top-0 z-50 bg-surface-light dark:bg-surface-dark shadow-sm transition-colors">
        <header className="px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              className="flex size-10 items-center justify-center rounded-full text-text-main dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
              onClick={() => navigate('/')}
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <h1 className="flex-1 text-center lg:text-left text-lg font-bold text-text-main dark:text-white">{t('product.allProducts')}</h1>
            <div className="relative lg:hidden">
              <button
                className="flex size-10 items-center justify-center rounded-full text-text-main dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                onClick={() => navigate('/cart')}
              >
                <span className="material-symbols-outlined">shopping_cart</span>
              </button>
              {cartCount > 0 && (
                <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white border-2 border-surface-light dark:border-surface-dark">{cartCount}</span>
              )}
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <div className="relative flex flex-1 items-center">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <span className="material-symbols-outlined text-text-sub">search</span>
              </div>
              <input
                className="block w-full rounded-xl border-none bg-background-light dark:bg-white/5 py-3 pl-10 pr-10 text-sm text-text-main dark:text-white placeholder-text-sub focus:ring-2 focus:ring-primary dark:focus:ring-primary"
                placeholder={t('product.searchPlaceholder')}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  className="absolute right-3 text-text-sub hover:text-text-main"
                  onClick={() => setSearchQuery('')}
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              )}
            </div>
            <button
              className={`relative flex size-11 shrink-0 items-center justify-center rounded-xl transition-colors ${
                activeFilterCount > 0
                  ? 'bg-primary text-white'
                  : 'bg-background-light dark:bg-white/5 text-text-main dark:text-white hover:bg-gray-100 dark:hover:bg-white/10'
              }`}
              onClick={() => setShowFilterModal(true)}
            >
              <span className="material-symbols-outlined text-[22px]">tune</span>
              {activeFilterCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-primary text-xs font-bold shadow-sm border border-primary/20">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </header>

        <div className="pb-2 pt-1">
          <div className="w-full overflow-x-auto no-scrollbar">
            <div className="flex gap-2 px-4">
              <button
                className="flex h-9 shrink-0 items-center rounded-full border border-gray-200 dark:border-white/10 bg-transparent px-4 text-sm font-medium text-text-main dark:text-white transition-colors active:bg-gray-100 dark:active:bg-white/10"
                onClick={() => setShowSortModal(true)}
              >
                {t('product.sortBy')}
                <span className="material-symbols-outlined ml-1 text-[18px]">expand_more</span>
              </button>
              {mainCategories.map((category) => (
                <button
                  key={category.id}
                  className={`flex h-9 shrink-0 items-center rounded-full px-4 text-sm font-medium transition-colors ${
                    selectedMainCategory === category.id
                      ? 'bg-primary text-white'
                      : 'border border-gray-200 dark:border-white/10 bg-transparent text-text-main dark:text-white active:bg-gray-100 dark:active:bg-white/10'
                  }`}
                  onClick={() => selectMainCategory(category.id)}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>
          {selectedMainCategory && subcategoriesByCategory[selectedMainCategory] && (
            <div className="w-full overflow-x-auto no-scrollbar mt-2">
              <div className="flex gap-2 px-4">
                {subcategoriesByCategory[selectedMainCategory].map((subcategory) => (
                  <button
                    key={subcategory.id}
                    className={`flex h-8 shrink-0 items-center rounded-full px-3 text-xs font-medium transition-colors ${
                      selectedSubcategory === subcategory.id
                        ? 'bg-primary/20 text-primary border border-primary/30'
                        : 'bg-gray-100 dark:bg-white/10 text-text-sub dark:text-white/70 hover:bg-gray-200 dark:hover:bg-white/20'
                    }`}
                    onClick={() => selectSubcategory(subcategory.id)}
                  >
                    {subcategory.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 py-2 flex items-center justify-between">
        <p className="text-sm text-text-sub">
          {isSearching ? '...' : t('common.product', { count: totalCount })}
          {selectedMainCategory && (
            <span className="ml-1">
              {t('product.inCategory', { category: mainCategories.find(c => c.id === selectedMainCategory)?.label })}
              {selectedSubcategory && ` / ${subcategoriesByCategory[selectedMainCategory]?.find(s => s.id === selectedSubcategory)?.label}`}
            </span>
          )}
        </p>
        {(activeFilterCount > 0 || selectedMainCategory) && (
          <button
            className="text-sm font-medium text-primary hover:underline"
            onClick={clearFilters}
          >
            {t('product.clearFilters')}
          </button>
        )}
      </div>

      <main className="flex-1 px-4 lg:px-6 pb-4">
        {filteredAndSortedProducts.length > 0 ? (
          <ProductGrid products={filteredAndSortedProducts} />
        ) : isSearching ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-[repeat(auto-fill,minmax(160px,200px))]">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-square rounded-xl bg-gray-200 dark:bg-white/10 mb-2" />
                <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-white/10 mb-1" />
                <div className="h-3 w-1/2 rounded bg-gray-200 dark:bg-white/10" />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-20 h-20 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-gray-400 text-[40px]">search_off</span>
            </div>
            <h3 className="text-text-main dark:text-white font-bold text-lg mb-2">{t('product.noProductsFound')}</h3>
            <p className="text-text-sub text-sm text-center mb-4">{t('product.noProductsFoundDesc')}</p>
            <button
              className="px-4 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
              onClick={clearFilters}
            >
              {t('product.clearAllFilters')}
            </button>
          </div>
        )}
      </main>

      {showSortModal && (
        <SortModal
          sortBy={sortBy}
          onSelect={(value) => {
            setSortBy(value);
            setShowSortModal(false);
          }}
          onClose={() => setShowSortModal(false)}
        />
      )}

      {showFilterModal && (
        <FilterModal
          selectedPriceRanges={selectedPriceRanges}
          onTogglePriceRange={togglePriceRange}
          showOnSale={showOnSale}
          onToggleOnSale={() => setShowOnSale(!showOnSale)}
          showBestSellers={showBestSellers}
          onToggleBestSellers={() => setShowBestSellers(!showBestSellers)}
          categories={mainCategories}
          selectedCategory={selectedMainCategory}
          onSelectCategory={selectMainCategory}
          onClearAll={clearFilters}
          onClose={() => setShowFilterModal(false)}
        />
      )}

      <BottomNav />
    </div>
  );
};

export default ListingView;
