import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useProductData } from '../lib/ProductDataContext';
import { useCart } from '../lib/CartContext';
import { useAuth } from '../lib/AuthContext';
import BottomNav from './BottomNav';
import ProductCard from './ProductCard';

type DealTab = 'near-expiry' | 'flash-sales' | 'catalog-deals';

const TABS: { id: DealTab; labelKey: string; icon: string; color: string; activeBg: string; activeText: string }[] = [
  { id: 'near-expiry', labelKey: 'deals.nearExpiry', icon: 'schedule', color: 'amber', activeBg: 'bg-amber-500', activeText: 'text-white' },
  { id: 'flash-sales', labelKey: 'deals.flashSales', icon: 'bolt', color: 'orange', activeBg: 'bg-orange-500', activeText: 'text-white' },
  { id: 'catalog-deals', labelKey: 'deals.catalogDeals', icon: 'loyalty', color: 'red', activeBg: 'bg-primary', activeText: 'text-white' },
];

const DealsView: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { catalogProducts, expiryProducts, flashSaleProducts, orderingOpen } = useProductData();
  const { cartQuantities, cartCount, addToCart, removeFromCart } = useCart();
  const { favorites, toggleFavorite } = useAuth();
  const [activeTab, setActiveTab] = useState<DealTab>('near-expiry');

  const catalogDeals = useMemo(() => {
    return catalogProducts.filter(p => (p.originalPrice || p.isSale) && !p.isFlashSale);
  }, [catalogProducts]);

  const activeProducts = useMemo(() => {
    switch (activeTab) {
      case 'near-expiry':
        return expiryProducts;
      case 'flash-sales':
        return flashSaleProducts;
      case 'catalog-deals':
        return catalogDeals;
    }
  }, [activeTab, catalogDeals, expiryProducts, flashSaleProducts]);

  const activeTabConfig = TABS.find(t => t.id === activeTab)!;

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen pb-20 lg:pb-8">
      <div className="sticky top-0 z-50 bg-surface-light dark:bg-surface-dark shadow-sm">
        <div className="flex items-center p-4 pb-3 lg:px-6 justify-between">
          <div className="w-12 lg:hidden"></div>
          <h2 className="text-text-main dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center lg:text-left">
            {t('deals.dealsOffers')}
          </h2>
          <div className="flex w-12 items-center justify-end lg:hidden">
            <button
              className="flex relative cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 bg-transparent text-text-main dark:text-white gap-2 min-w-0 p-0"
              onClick={() => navigate('/cart')}
            >
              <span className="material-symbols-outlined text-[26px]">shopping_cart</span>
              {cartCount > 0 && (
                <span className="absolute top-2 right-0 flex h-3 w-3 items-center justify-center rounded-full bg-primary ring-2 ring-white dark:ring-surface-dark"></span>
              )}
            </button>
          </div>
        </div>

        <div className="px-4 pb-3">
          <div className="flex gap-2">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? `${tab.activeBg} ${tab.activeText} shadow-md`
                      : 'bg-gray-100 dark:bg-white/10 text-text-sub dark:text-white/60 hover:bg-gray-200 dark:hover:bg-white/15'
                  }`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <span className={`material-symbols-outlined text-[18px] ${isActive ? 'text-white' : ''}`}>{tab.icon}</span>
                  <span className="hidden min-[380px]:inline">{t(tab.labelKey)}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {activeTab === 'near-expiry' && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-xl">eco</span>
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">{t('deals.reduceWaste')}</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'flash-sales' && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border-b border-orange-200 dark:border-orange-800 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-orange-500 text-xl">bolt</span>
            <div>
              <p className="text-sm font-semibold text-orange-800 dark:text-orange-300">{t('deals.limitedFlash')}</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'catalog-deals' && (
        <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-xl">loyalty</span>
            <div>
              <p className="text-sm font-semibold text-red-800 dark:text-red-300">{t('deals.catalogFavorites')}</p>
            </div>
          </div>
        </div>
      )}

      <div className="px-4 py-3">
        <p className="text-sm text-text-sub">
          {t('common.product', { count: activeProducts.length })}
        </p>
      </div>

      <main className="flex-1 px-4 lg:px-6 pb-4">
        {activeProducts.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-[repeat(auto-fill,minmax(160px,200px))]">
            {activeProducts.map((product) => {
              const favoriteId = product.sourceProductId || product.id;
              return (
                <ProductCard
                  key={product.id}
                  product={product}
                  quantity={cartQuantities.get(product.id) || 0}
                  isFavorite={favorites.has(favoriteId)}
                  onNavigate={() => navigate('/product/' + product.id)}
                  onToggleFavorite={() => toggleFavorite(favoriteId)}
                  onIncrease={() => addToCart(product, 1)}
                  onDecrease={() => removeFromCart(product.id, 1)}
                  orderingClosed={!orderingOpen}
                />
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-20 h-20 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-gray-400 text-[40px]">{activeTabConfig.icon}</span>
            </div>
            <h3 className="text-text-main dark:text-white font-bold text-lg mb-2">{t('deals.noDeals')}</h3>
            <p className="text-text-sub text-sm text-center">{t('deals.checkBack')}</p>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default DealsView;
