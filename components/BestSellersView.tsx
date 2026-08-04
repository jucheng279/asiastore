import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useProductData } from '../lib/ProductDataContext';
import { useCart } from '../lib/CartContext';
import { useAuth } from '../lib/AuthContext';
import BottomNav from './BottomNav';
import ProductCard from './ProductCard';

const BestSellersView: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { bestSellerProducts, orderingOpen } = useProductData();
  const { cartQuantities, cartCount, increaseQuantity, decreaseQuantity } = useCart();
  const { favorites, toggleFavorite } = useAuth();

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen pb-20 lg:pb-8">
      <header className="sticky top-0 z-50 bg-surface-light dark:bg-surface-dark px-4 py-3 shadow-sm transition-colors">
        <div className="flex items-center justify-between">
          <button
            className="flex size-10 items-center justify-center rounded-full text-text-main dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
            onClick={() => navigate('/')}
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="flex-1 text-center text-lg font-bold text-text-main dark:text-white">{t('home.trendingProducts')}</h1>
          <div className="relative">
            <button
              className="flex size-10 items-center justify-center rounded-full text-text-main dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
              onClick={() => navigate('/cart')}
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
          {t('common.product', { count: bestSellerProducts.length })}
        </p>
      </div>

      <main className="flex-1 px-4 lg:px-6 pb-4">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-[repeat(auto-fill,minmax(160px,200px))]">
          {bestSellerProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              quantity={cartQuantities.get(product.id) || 0}
              isFavorite={favorites.has(product.id)}
              onNavigate={() => navigate('/product/' + product.id)}
              onToggleFavorite={() => toggleFavorite(product.id)}
              onIncrease={() => increaseQuantity(product.id)}
              onDecrease={() => decreaseQuantity(product.id)}
              orderingClosed={!orderingOpen}
            />
          ))}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default BestSellersView;
