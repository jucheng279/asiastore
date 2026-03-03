import React from 'react';
import { useTranslation } from 'react-i18next';
import { useProductData } from '../lib/ProductDataContext';
import { NavigationProps } from '../types';
import BottomNav from './BottomNav';
import ProductCard from './ProductCard';

const TrendingView: React.FC<NavigationProps> = ({
  currentView,
  onNavigate,
  cartCount,
  favorites = new Set(),
  onToggleFavorite,
  cartQuantities = new Map(),
  onIncreaseQuantity,
  onDecreaseQuantity,
  onNavigateToProduct,
}) => {
  const { t } = useTranslation();
  const { trendingProducts } = useProductData();

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen pb-20 lg:pb-8">
      <header className="sticky top-0 z-50 bg-surface-light dark:bg-surface-dark px-4 py-3 shadow-sm transition-colors">
        <div className="flex items-center justify-between">
          <button
            className="flex size-10 items-center justify-center rounded-full text-text-main dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
            onClick={() => onNavigate('HOME')}
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="flex-1 text-center text-lg font-bold text-text-main dark:text-white">{t('home.trendingProducts')}</h1>
          <div className="relative">
            <button
              className="flex size-10 items-center justify-center rounded-full text-text-main dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
              onClick={() => onNavigate('CART')}
            >
              <span className="material-symbols-outlined">shopping_cart</span>
            </button>
            {cartCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white border-2 border-surface-light dark:border-surface-dark">
                {cartCount}
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="px-4 py-3">
        <p className="text-sm text-text-sub">
          {t('common.product', { count: trendingProducts.length })}
        </p>
      </div>

      <main className="flex-1 px-4 lg:px-6 pb-4">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-[repeat(auto-fill,minmax(160px,200px))]">
          {trendingProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              quantity={cartQuantities.get(product.id) || 0}
              isFavorite={favorites.has(product.id)}
              onNavigate={() => onNavigateToProduct?.(product.id)}
              onToggleFavorite={() => onToggleFavorite?.(product.id)}
              onIncrease={() => onIncreaseQuantity?.(product.id)}
              onDecrease={() => onDecreaseQuantity?.(product.id)}
            />
          ))}
        </div>
      </main>

      <BottomNav currentView={currentView} onNavigate={onNavigate} />
    </div>
  );
};

export default TrendingView;
