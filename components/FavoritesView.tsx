import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useProductData } from '../lib/ProductDataContext';
import { useCart } from '../lib/CartContext';
import { useAuth } from '../lib/AuthContext';
import { formatPrice, formatFromPrice, getExpiryText, formatFlashTimeRemaining } from '../lib/formatters';
import { Product } from '../types';
import BottomNav from './BottomNav';

function computeDaysUntilExpiry(expiryDate: string): number {
  const expiry = new Date(expiryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function NotAvailableCard({ favoriteId, onToggleFavorite, t }: {
  favoriteId: string;
  onToggleFavorite: (id: string) => void;
  t: (key: string) => string;
}) {
  return (
    <div className="flex gap-4 bg-white/60 dark:bg-white/[0.03] rounded-2xl p-3 shadow-sm border border-gray-100 dark:border-white/5 opacity-60">
      <div className="relative w-28 h-28 shrink-0 rounded-xl bg-gray-100 dark:bg-white/10 overflow-hidden flex items-center justify-center">
        <span className="material-symbols-outlined text-gray-300 dark:text-gray-600 text-[40px]">block</span>
      </div>
      <div className="flex flex-1 flex-col justify-between py-1">
        <div>
          <h3 className="text-gray-400 dark:text-gray-500 font-bold leading-tight">
            {t('product.notAvailable')}
          </h3>
        </div>
        <div className="flex items-end justify-end mt-2">
          <button
            className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/10 text-gray-400 hover:text-primary hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
            onClick={() => onToggleFavorite(favoriteId)}
          >
            <span className="material-symbols-outlined text-[20px]">delete</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function AvailableCard({ product, favoriteId, onToggleFavorite, onAddToCart, onNavigateToProduct, t, language }: {
  product: Product;
  favoriteId: string;
  onToggleFavorite: (id: string) => void;
  onAddToCart: (product: Product) => void;
  onNavigateToProduct: (id: string) => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
  language: string;
}) {
  const available = product.availableStock ?? undefined;
  const isOutOfStock = available !== undefined && available <= 0;
  const isLowStock = !isOutOfStock && available !== undefined && available > 0 && available <= 10;

  return (
    <div className="flex gap-4 bg-white dark:bg-white/5 rounded-2xl p-3 shadow-sm border border-gray-100 dark:border-white/5">
      <div
        className="relative w-28 h-28 shrink-0 rounded-xl bg-gray-50 dark:bg-white/10 overflow-hidden cursor-pointer"
        onClick={() => onNavigateToProduct(product.id)}
      >
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-contain"
        />
        {isOutOfStock && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 rounded-xl">
            <span className="rounded-md bg-white/95 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-700">
              {t('product.outOfStock')}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col justify-between py-1">
        <div>
          <h3
            className="text-text-main dark:text-white font-bold leading-tight line-clamp-2 cursor-pointer hover:text-primary transition-colors"
            onClick={() => onNavigateToProduct(product.id)}
          >
            {product.name}
          </h3>
          {product.isFlashSale && (product.flashStartDate || product.flashSaleEndsIn) && (
            <div className="flex items-center gap-1 mt-1.5">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-900 text-white text-xs font-medium">
                <span className="material-symbols-outlined text-[12px]">timer</span>
                <span>{t('product.endsIn', { time: product.flashStartDate && product.flashDays ? formatFlashTimeRemaining(product.flashStartDate, product.flashDays, t) : product.flashSaleEndsIn })}</span>
              </span>
            </div>
          )}
          {product.isNearExpiry && product.expiryDate && (
            <div className="flex items-center gap-1 mt-1.5">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                computeDaysUntilExpiry(product.expiryDate) <= 1
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
              }`}>
                <span className="material-symbols-outlined text-[12px]">schedule</span>
                <span>{getExpiryText(computeDaysUntilExpiry(product.expiryDate), t)}</span>
              </span>
            </div>
          )}
          {isLowStock && (
            <div className="flex items-center gap-1 mt-1.5">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                <span className="material-symbols-outlined text-[12px]">inventory_2</span>
                <span>{t('product.onlyXLeft', { count: available })}</span>
              </span>
            </div>
          )}
        </div>

        <div className="flex items-end justify-between mt-2">
          <div className="flex items-baseline gap-2">
            <span className="text-primary text-lg font-bold">
              {product.hasChildren ? formatFromPrice(product.price, language, t) : formatPrice(product.price, language)}
            </span>
            {!product.hasChildren && product.originalPrice && (
              <span className="text-gray-400 text-sm line-through">{formatPrice(product.originalPrice, language)}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/10 text-gray-500 hover:text-primary hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
              onClick={() => onToggleFavorite(favoriteId)}
            >
              <span className="material-symbols-outlined text-[20px]">delete</span>
            </button>
            {isOutOfStock ? (
              <span className="text-[10px] font-semibold text-gray-400 uppercase whitespace-nowrap px-2">
                {t('product.outOfStock')}
              </span>
            ) : product.hasChildren ? (
              <button
                className="w-9 h-9 flex items-center justify-center rounded-full bg-primary text-white hover:bg-red-700 shadow-md transition-colors"
                onClick={() => onNavigateToProduct(product.id)}
              >
                <span className="material-symbols-outlined text-[20px]">tune</span>
              </button>
            ) : (
              <button
                className="w-9 h-9 flex items-center justify-center rounded-full bg-primary text-white hover:bg-red-700 shadow-md transition-colors"
                onClick={() => onAddToCart(product)}
              >
                <span className="material-symbols-outlined text-[20px]">add_shopping_cart</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const FavoritesView: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { productMap, language } = useProductData();
  const { cartCount, addToCart } = useCart();
  const { favorites, toggleFavorite } = useAuth();

  const favoriteEntries: { product: Product | null; favoriteId: string }[] = [];
  favorites.forEach(id => {
    const product = productMap.get(id) ?? null;
    favoriteEntries.push({ product, favoriteId: id });
  });

  const handleAddToCart = (product: Product) => {
    addToCart(product, 1);
  };

  const handleNavigateToProduct = (id: string) => {
    navigate('/product/' + id);
  };

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen pb-24 lg:pb-8">
      <header className="sticky top-0 z-30 flex items-center justify-between bg-background-light/90 dark:bg-background-dark/90 px-5 py-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            className="flex size-10 items-center justify-center rounded-full text-text-main dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
            onClick={() => navigate('/')}
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="text-2xl font-bold tracking-tight text-text-main dark:text-white">{t('favorites.title')}</h1>
        </div>
        <button
          className="flex relative items-center justify-center text-text-main dark:text-white"
          onClick={() => navigate('/cart')}
        >
          <span className="material-symbols-outlined text-[26px]">shopping_cart</span>
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-white text-[10px] font-bold">{cartCount}</span>
          )}
        </button>
      </header>

      {favoriteEntries.length > 0 ? (
        <>
          <div className="px-4 py-2">
            <p className="text-text-sub text-sm">{t('product.itemsSaved', { count: favoriteEntries.length })}</p>
          </div>

          <div className="flex flex-col lg:grid lg:grid-cols-2 xl:grid-cols-3 gap-4 px-4 lg:px-6">
            {favoriteEntries.map(({ product, favoriteId }) =>
              product ? (
                <AvailableCard
                  key={favoriteId}
                  product={product}
                  favoriteId={favoriteId}
                  onToggleFavorite={toggleFavorite}
                  onAddToCart={handleAddToCart}
                  onNavigateToProduct={handleNavigateToProduct}
                  t={t}
                  language={language}
                />
              ) : (
                <NotAvailableCard
                  key={favoriteId}
                  favoriteId={favoriteId}
                  onToggleFavorite={toggleFavorite}
                  t={t}
                />
              )
            )}
          </div>

          <div className="px-4 py-6">
            <button
              className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-red-700 transition-colors"
              onClick={() => navigate('/')}
            >
              {t('common.continueShopping')}
            </button>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center px-8 py-16">
          <div className="w-24 h-24 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center mb-6">
            <span className="material-symbols-outlined text-gray-400 text-[48px]">favorite</span>
          </div>
          <h3 className="text-text-main dark:text-white text-xl font-bold mb-2">{t('favorites.noFavorites')}</h3>
          <p className="text-text-sub text-center mb-6">{t('favorites.noFavoritesDesc')}</p>
          <button
            className="px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-red-700 transition-colors"
            onClick={() => navigate('/')}
          >
            {t('common.browseProducts')}
          </button>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default FavoritesView;
