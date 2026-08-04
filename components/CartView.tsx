import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { TAX_RATE, FREE_SHIPPING_THRESHOLD, SHIPPING_FEE } from '../lib/businessConstants';
import ProductCard from './ProductCard';
import { useProductData } from '../lib/ProductDataContext';
import { useCart } from '../lib/CartContext';
import { useAuth } from '../lib/AuthContext';
import { formatPrice } from '../lib/formatters';
import { useCartRecommendations } from '../lib/useCartRecommendations';

const CartView: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { language, allProducts, orderingOpen } = useProductData();
  const { cartItems, cartQuantities, cartCount, increaseQuantity, decreaseQuantity, removeFromCart, clearCart } = useCart();
  const { favorites, toggleFavorite } = useAuth();

  const orderingClosed = !orderingOpen;
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const tax = subtotal * TAX_RATE;
  const total = subtotal + shipping + tax;
  const amountToFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const shippingProgress = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);

  const recommendations = useCartRecommendations(cartItems, allProducts);
  const isEmpty = cartItems.length === 0;
  const hasOverstock = cartItems.some(item => item.availableStock !== undefined && item.quantity > item.availableStock);

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen pb-28 lg:pb-8">
      <header className="sticky top-0 z-30 flex items-center justify-between bg-background-light/90 dark:bg-background-dark/90 px-5 lg:px-6 py-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            className="flex size-10 items-center justify-center rounded-full text-text-main dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
            onClick={() => navigate('/')}
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="text-2xl font-bold tracking-tight text-text-main dark:text-white">{t('cart.myCart')}</h1>
        </div>
        {!isEmpty && (
          <button
            className="text-sm font-semibold text-primary hover:text-red-700 transition-colors"
            onClick={clearCart}
          >
            {t('common.clearAll')}
          </button>
        )}
      </header>

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center px-8 py-16">
          <div className="w-24 h-24 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center mb-6">
            <span className="material-symbols-outlined text-gray-400 text-[48px]">shopping_bag</span>
          </div>
          <h3 className="text-text-main dark:text-white text-xl font-bold mb-2">{t('cart.emptyCart')}</h3>
          <p className="text-text-sub text-center mb-6">{t('cart.emptyCartDesc')}</p>
          <button
            className="px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-red-700 transition-colors"
            onClick={() => navigate('/')}
          >
            {t('common.continueShopping')}
          </button>
        </div>
      ) : (
        <div className="lg:flex lg:gap-8 lg:px-6 lg:items-start">
          <div className="flex-1">
            <div className="px-5 lg:px-0 mb-6">
              <div className="rounded-xl bg-white dark:bg-white/5 p-4 shadow-sm border border-slate-100 dark:border-white/5">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t('cart.freeShipping')}</span>
                  {amountToFreeShipping > 0 ? (
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('cart.amountAway', { amount: formatPrice(amountToFreeShipping, language) })}</span>
                  ) : (
                    <span className="text-xs font-medium text-green-600 dark:text-green-400">{t('cart.unlocked')}</span>
                  )}
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all duration-500 ease-out" style={{ width: `${shippingProgress}%` }}></div>
                </div>
                {amountToFreeShipping > 0 && (
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{t('cart.addMoreForFreeShipping', { amount: formatPrice(amountToFreeShipping, language) })}</p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-4 px-5 lg:px-0">
              {cartItems.map((item) => {
                const itemAvailable = item.availableStock ?? undefined;
                const atMax = itemAvailable !== undefined && item.quantity >= itemAvailable;
                const overStock = itemAvailable !== undefined && item.quantity > itemAvailable;
                return (
                  <div key={item.id} className="group relative flex gap-4 rounded-2xl bg-white dark:bg-white/5 p-3 shadow-sm border border-slate-100 dark:border-white/5 transition-transform active:scale-[0.99]">
                    <div className="relative aspect-square w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-white/10">
                      <img alt={item.name} className="h-full w-full object-cover" src={item.image} />
                    </div>
                    <div className="flex flex-1 flex-col justify-between py-1">
                      <div>
                        <div className="flex justify-between items-start">
                          <h3 className="font-bold text-slate-900 dark:text-white leading-tight pr-4">{item.name}</h3>
                          <button
                            className="text-slate-400 hover:text-primary transition-colors"
                            onClick={() => removeFromCart(item.id)}
                          >
                            <span className="material-symbols-outlined text-[20px]">delete</span>
                          </button>
                        </div>
                        {item.brand && (
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">{item.brand}</p>
                        )}
                        {overStock && (
                          <p className="text-[11px] font-medium text-red-500 mt-1">
                            {itemAvailable === 0 ? t('product.outOfStock') : t('product.onlyXLeft', { count: itemAvailable })}
                          </p>
                        )}
                      </div>
                      <div className="flex items-end justify-between">
                        <p className="text-lg font-bold text-primary">{formatPrice(item.price, language)}</p>
                        <div className="flex items-center gap-3 rounded-lg bg-slate-50 dark:bg-white/10 px-2 py-1">
                          <button
                            className="flex h-6 w-6 items-center justify-center rounded bg-white dark:bg-white/10 shadow-sm text-slate-600 dark:text-white hover:text-primary disabled:opacity-50"
                            onClick={() => decreaseQuantity(item.id)}
                          >
                            <span className="material-symbols-outlined text-[16px]">remove</span>
                          </button>
                          <span className="w-4 text-center text-sm font-semibold text-text-main dark:text-white">{item.quantity}</span>
                          <button
                            className={`flex h-6 w-6 items-center justify-center rounded shadow-sm ${
                              atMax || orderingClosed
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-primary text-white hover:bg-red-700'
                            }`}
                            onClick={() => { if (!atMax && !orderingClosed) increaseQuantity(item.id); }}
                            disabled={atMax || orderingClosed}
                          >
                            <span className="material-symbols-outlined text-[16px]">add</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {recommendations.length > 0 && (
              <div className="mt-8 mb-4 lg:mb-0">
                <div className="px-5 lg:px-0 mb-4">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('cart.recommendedForYou')}</h2>
                </div>
                <div className="no-scrollbar flex gap-4 overflow-x-auto px-5 lg:px-0 pb-4">
                  {recommendations.map(product => (
                    <div key={product.id} className="min-w-[160px] max-w-[160px]">
                      <ProductCard
                        product={product}
                        quantity={cartQuantities.get(product.id) || 0}
                        isFavorite={favorites.has(product.id)}
                        onNavigate={() => navigate('/product/' + product.id)}
                        onToggleFavorite={() => toggleFavorite(product.id)}
                        onIncrease={() => increaseQuantity(product.id)}
                        onDecrease={() => decreaseQuantity(product.id)}
                        orderingClosed={orderingClosed}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="lg:w-80 xl:w-96 lg:shrink-0 lg:sticky lg:top-20">
            <div className="px-5 lg:px-0 pb-4">
              <h3 className="mb-3 text-lg font-bold text-text-main dark:text-white">{t('cart.orderSummary')}</h3>
              <div className="space-y-3 rounded-2xl bg-white dark:bg-white/5 p-5 shadow-sm border border-slate-100 dark:border-white/5">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">{t('cart.subtotal')} ({t('common.item', { count: itemCount })})</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{formatPrice(subtotal, language)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">{t('cart.shipping')}</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{shipping === 0 ? t('cart.free') : formatPrice(shipping, language)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">{t('cart.estimatedTax')}</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{formatPrice(tax, language)}</span>
                </div>
                <div className="my-2 h-px w-full bg-slate-100 dark:bg-white/10"></div>
                <div className="flex justify-between items-end">
                  <span className="text-base font-bold text-slate-900 dark:text-white">{t('cart.total')}</span>
                  <span className="text-xl font-bold text-primary">{formatPrice(total, language)}</span>
                </div>
              </div>

              <button
                className={`hidden lg:flex w-full items-center justify-between rounded-xl px-6 py-4 font-bold text-white shadow-lg transition-transform mt-4 ${
                  hasOverstock || orderingClosed
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-primary shadow-primary/20 active:scale-[0.98] hover:bg-red-600'
                }`}
                onClick={() => navigate('/checkout')}
                disabled={hasOverstock || orderingClosed}
              >
                <span>{orderingClosed ? t('store.closedCheckout') : t('cart.checkout')}</span>
                {!orderingClosed && <span className="font-medium opacity-90">{formatPrice(total, language)}</span>}
              </button>
            </div>
          </div>
        </div>
      )}

      {!isEmpty && (
        <div className="fixed bottom-0 left-0 right-0 z-40 w-full bg-white dark:bg-background-dark border-t border-slate-100 dark:border-white/5 px-5 py-4 pb-8 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] lg:hidden">
          <div className="mx-auto max-w-md">
            <button
              className={`flex w-full items-center justify-between rounded-xl px-6 py-4 font-bold text-white shadow-lg transition-transform ${
                hasOverstock || orderingClosed
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-primary shadow-primary/20 active:scale-[0.98] hover:bg-red-600'
              }`}
              onClick={() => navigate('/checkout')}
              disabled={hasOverstock || orderingClosed}
            >
              <span>{orderingClosed ? t('store.closedCheckout') : t('cart.checkout')}</span>
              {!orderingClosed && <span className="font-medium opacity-90">{formatPrice(total, language)}</span>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartView;
