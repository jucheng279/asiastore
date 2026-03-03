import React from 'react';
import { useTranslation } from 'react-i18next';
import { useProductData } from '../lib/ProductDataContext';
import { NavigationProps } from '../types';
import BottomNav from './BottomNav';
import ProductCard from './ProductCard';
import LanguageSwitcher from './LanguageSwitcher';

const HomeView: React.FC<NavigationProps> = ({ currentView, onNavigate, cartCount, favorites = new Set(), onToggleFavorite, cartQuantities = new Map(), onIncreaseQuantity, onDecreaseQuantity, onNavigateWithCategory, onNavigateToProduct, orderingClosed }) => {
  const { t } = useTranslation();
  const { categories, bestSellerProducts, expiryProducts, flashSaleProducts } = useProductData();

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen pb-24 lg:pb-8">
      <div className="sticky top-0 z-50 bg-surface-light dark:bg-surface-dark shadow-sm">
        <div className="flex items-center p-4 pb-3 lg:px-6 justify-between">
          <div className="w-12 lg:hidden">
            <LanguageSwitcher />
          </div>
          <h2 className="text-text-main dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center lg:text-left">
            Asia Shop <span className="text-sm font-medium italic">Linkoping</span>
          </h2>
          <div className="flex items-center gap-1">
            <div className="hidden lg:block">
              <LanguageSwitcher />
            </div>
            <button
              className="flex relative cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 bg-transparent text-text-main dark:text-white p-0 lg:hidden"
              onClick={() => onNavigate('CART')}
            >
              <span className="material-symbols-outlined text-[26px]">shopping_cart</span>
              {cartCount > 0 && (
                <span className="absolute top-2 right-0 flex h-3 w-3 items-center justify-center rounded-full bg-primary ring-2 ring-white dark:ring-surface-dark"></span>
              )}
            </button>
          </div>
        </div>

        <div className="px-4 pb-3 lg:px-6">
          <label className="flex flex-col min-w-40 h-12 w-full lg:max-w-xl">
            <div className="flex w-full flex-1 items-stretch rounded-lg h-full bg-[#f4f0f0] dark:bg-[#3b2b2b]">
              <div className="text-text-sub flex border-none items-center justify-center pl-4 rounded-l-lg border-r-0">
                <span className="material-symbols-outlined text-[24px]">search</span>
              </div>
              <input
                className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-text-main dark:text-white focus:outline-0 focus:ring-0 border-none bg-transparent focus:border-none h-full placeholder:text-text-sub px-4 rounded-l-none border-l-0 pl-2 pr-4 text-base font-normal leading-normal cursor-pointer"
                placeholder={t('home.searchPlaceholder')}
                readOnly
                onClick={() => onNavigate('LISTING')}
              />
            </div>
          </label>
        </div>

      </div>

      <div className="flex overflow-y-auto no-scrollbar pt-4 px-4 lg:px-6 pb-2 bg-surface-light dark:bg-surface-dark">
        <div className="flex items-stretch gap-3 w-full">
          <div className="flex h-full w-full flex-col gap-4 rounded-xl bg-primary shadow-lg overflow-hidden relative">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-gold rounded-full opacity-20 blur-xl"></div>
            <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-yellow-400 rounded-full opacity-20 blur-xl"></div>
            <div className="flex flex-row p-5 lg:p-8 items-center justify-between relative z-10">
              <div className="flex flex-col gap-2 flex-1">
                <span className="px-2 py-1 bg-white/20 text-white text-xs font-bold rounded w-fit backdrop-blur-sm">{t('home.limitedTime')}</span>
                <h3 className="text-white text-2xl lg:text-3xl font-extrabold leading-tight">{t('home.lunarNewYear')}</h3>
                <p className="text-white/90 text-sm lg:text-base font-medium leading-normal">{t('home.upTo50Off')}</p>
                <button
                  className="mt-2 flex w-fit cursor-pointer items-center justify-center overflow-hidden rounded-lg h-9 px-4 bg-white text-primary text-sm font-bold leading-normal tracking-[0.015em] hover:bg-gray-50 transition-colors"
                  onClick={() => onNavigate('LISTING')}
                >
                  {t('common.shopNow')}
                </button>
              </div>
              <div className="w-28 h-28 lg:w-40 lg:h-40 bg-center bg-no-repeat bg-contain shrink-0" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuA96QpXo1XL_Gb4Iy-Pq41rCeb0yfKK3--0Ckiw2Dq7EalyZyN2GfNKbL7q5sKJJhbzObWS9T45YCQoZByJGC14-ypMJ49qubsCetjA3t9xEG9eUjv5Nre1MQcwzajUc7FxVgkCm_6iw5zh5MmJMdLYJ0vyh5jUw1-jdc8EwYVGcGdcr-RYUsq2cT30_E-L-TomYfsqMdmx_nQ8eBmRGg1GjmBNfkblfI0GNut5dADOaq2rOb85zwJBboyBnbKBAolf1jUPEGfC7GE")' }}></div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-surface-light dark:bg-surface-dark px-4 lg:px-6 pt-4 pb-1">
        <div className="flex justify-between items-center pb-2">
          <h2 className="text-text-main dark:text-white text-[19px] font-bold leading-tight tracking-[-0.015em]">{t('home.shopByCategory')}</h2>
          <span
            className="text-primary text-sm font-bold cursor-pointer"
            onClick={() => onNavigate('LISTING')}
          >{t('common.viewAll')}</span>
        </div>
        <div className="flex w-full overflow-x-auto lg:overflow-x-visible no-scrollbar pt-1 pb-3">
          <div className="flex min-h-min flex-row items-start justify-start gap-6 lg:flex-wrap">
            {categories.map((cat) => (
              <div key={cat.id} className="flex flex-col items-center gap-2 min-w-[70px] lg:min-w-[80px]" onClick={() => onNavigateWithCategory?.('LISTING', cat.id)}>
                <div className="w-[60px] h-[60px] lg:w-[70px] lg:h-[70px] bg-center bg-no-repeat bg-cover rounded-full border-2 border-transparent hover:border-primary transition-all cursor-pointer shadow-sm" style={{ backgroundImage: `url("${cat.image_url}")` }}></div>
                <p className="text-text-main dark:text-white text-xs font-medium leading-normal">{cat.name}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="h-2 bg-background-light dark:bg-background-dark"></div>

      <div className="flex justify-between items-center px-4 lg:px-6 pt-6 pb-4 bg-surface-light dark:bg-surface-dark">
        <h2 className="text-text-main dark:text-white text-[20px] font-bold leading-tight tracking-[-0.015em]">{t('home.trendingProducts')}</h2>
        <a className="text-primary text-sm font-bold flex items-center" href="#" onClick={(e) => { e.preventDefault(); onNavigate('BEST_SELLERS'); }}>
          {t('common.seeAll')} <span className="material-symbols-outlined text-sm ml-1">arrow_forward</span>
        </a>
      </div>

      <div className="w-full overflow-x-auto no-scrollbar px-4 lg:px-6 pb-4 bg-surface-light dark:bg-surface-dark">
        <div className="flex gap-4" style={{ width: 'max-content' }}>
          {bestSellerProducts.map((product) => (
            <div key={product.id} className="w-[160px] lg:w-[200px] shrink-0">
              <ProductCard
                product={product}
                quantity={cartQuantities.get(product.id) || 0}
                isFavorite={favorites.has(product.id)}
                onNavigate={() => onNavigateToProduct?.(product.id)}
                onToggleFavorite={() => onToggleFavorite?.(product.id)}
                onIncrease={() => onIncreaseQuantity?.(product.id)}
                onDecrease={() => onDecreaseQuantity?.(product.id)}
                orderingClosed={orderingClosed}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="h-2 bg-background-light dark:bg-background-dark"></div>

      <div className="flex justify-between items-center px-4 lg:px-6 pt-6 pb-2 bg-surface-light dark:bg-surface-dark">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-amber-500 text-xl">schedule</span>
          <h2 className="text-text-main dark:text-white text-[20px] font-bold leading-tight tracking-[-0.015em]">{t('home.nearExpiryDeals')}</h2>
        </div>
        <a className="text-primary text-sm font-bold flex items-center" href="#" onClick={(e) => { e.preventDefault(); onNavigate('DEALS'); }}>
          {t('common.seeAll')} <span className="material-symbols-outlined text-sm ml-1">arrow_forward</span>
        </a>
      </div>
      <div className="w-full overflow-x-auto no-scrollbar px-4 lg:px-6 pb-4 bg-surface-light dark:bg-surface-dark">
        <div className="flex gap-4" style={{ width: 'max-content' }}>
          {expiryProducts.slice(0, 4).map((product) => {
            const favoriteId = product.sourceProductId || product.id;
            return (
              <div key={product.id} className="w-[160px] lg:w-[200px] shrink-0">
                <ProductCard
                  product={product}
                  quantity={cartQuantities.get(product.id) || 0}
                  isFavorite={favorites.has(favoriteId)}
                  onNavigate={() => onNavigateToProduct?.(product.id)}
                  onToggleFavorite={() => onToggleFavorite?.(favoriteId)}
                  onIncrease={() => onIncreaseQuantity?.(product.id)}
                  onDecrease={() => onDecreaseQuantity?.(product.id)}
                  orderingClosed={orderingClosed}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="h-2 bg-background-light dark:bg-background-dark"></div>

      <div className="flex justify-between items-center px-4 lg:px-6 pt-6 pb-2 bg-surface-light dark:bg-surface-dark">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-orange-500 text-xl">bolt</span>
          <h2 className="text-text-main dark:text-white text-[20px] font-bold leading-tight tracking-[-0.015em]">{t('home.flashSale')}</h2>
        </div>
        <a className="text-primary text-sm font-bold flex items-center" href="#" onClick={(e) => { e.preventDefault(); onNavigate('DEALS'); }}>
          {t('common.seeAll')} <span className="material-symbols-outlined text-sm ml-1">arrow_forward</span>
        </a>
      </div>
      <div className="w-full overflow-x-auto no-scrollbar px-4 lg:px-6 pb-4 bg-surface-light dark:bg-surface-dark">
        <div className="flex gap-4" style={{ width: 'max-content' }}>
          {flashSaleProducts.slice(0, 4).map((product) => {
            const favoriteId = product.sourceProductId || product.id;
            return (
              <div key={product.id} className="w-[160px] lg:w-[200px] shrink-0">
                <ProductCard
                  product={product}
                  quantity={cartQuantities.get(product.id) || 0}
                  isFavorite={favorites.has(favoriteId)}
                  onNavigate={() => onNavigateToProduct?.(product.id)}
                  onToggleFavorite={() => onToggleFavorite?.(favoriteId)}
                  onIncrease={() => onIncreaseQuantity?.(product.id)}
                  onDecrease={() => onDecreaseQuantity?.(product.id)}
                  orderingClosed={orderingClosed}
                />
              </div>
            );
          })}
        </div>
      </div>

      <BottomNav currentView={currentView} onNavigate={onNavigate} />
    </div>
  );
};

export default HomeView;
