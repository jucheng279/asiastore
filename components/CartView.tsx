import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { FREE_SHIPPING_THRESHOLD, SHIPPING_FEE } from '../lib/businessConstants';
import { useProductData } from '../lib/ProductDataContext';
import { useCart } from '../lib/CartContext';
import { useAuth } from '../lib/AuthContext';
import { formatPrice } from '../lib/formatters';

const CartView: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { language, orderingOpen } = useProductData();
  const { cartItems, cartCount, weeklyOrder, addToWeeklyOrder, removeFromWeeklyOrder } = useCart();
  const { favorites, toggleFavorite, isAuthenticated, cancelOrder } = useAuth();

  const orderingClosed = !orderingOpen;
  const isEmpty = cartItems.length === 0;
  const subtotal = weeklyOrder?.total || 0;
  const belowThreshold = subtotal > 0 && subtotal < FREE_SHIPPING_THRESHOLD;
  const amountToFree = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);

  const [cancelling, setCancelling] = React.useState(false);

  const handleCancelOrder = async () => {
    if (!weeklyOrder) return;
    setCancelling(true);
    await cancelOrder(weeklyOrder.id);
    setCancelling(false);
  };

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
          <h1 className="text-2xl font-bold tracking-tight text-text-main dark:text-white">{t('cart.weeklyOrder')}</h1>
        </div>
        {!isEmpty && weeklyOrder && orderingOpen && (
          <button
            className="text-sm font-semibold text-primary hover:text-red-700 transition-colors disabled:opacity-50"
            onClick={handleCancelOrder}
            disabled={cancelling}
          >
            {t('cart.cancelOrder')}
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
            {belowThreshold && (
              <div className="px-5 lg:px-0 mb-4">
                <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 p-4 border border-amber-200 dark:border-amber-700/30">
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-amber-500 text-[20px] mt-0.5">local_shipping</span>
                    <div>
                      <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                        {t('cart.deliveryFeeWarning', { fee: formatPrice(SHIPPING_FEE, language) })}
                      </p>
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                        {t('cart.addMoreToAvoid', { amount: formatPrice(amountToFree, language) })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-4 px-5 lg:px-0">
              {cartItems.map((item) => {
                const available = item.availableStock ?? undefined;
                const overStock = available !== undefined && item.quantity > available;
                return (
                  <div key={item.id} className="group relative flex gap-4 rounded-2xl bg-white dark:bg-white/5 p-3 shadow-sm border border-slate-100 dark:border-white/5 transition-transform active:scale-[0.99]">
                    <div className="relative aspect-square w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-white/10">
                      <img alt={item.name} className="h-full w-full object-cover" src={item.image} />
                    </div>
                    <div className="flex flex-1 flex-col justify-between py-1">
                      <div>
                        <h3 className="text-sm font-semibold text-text-main dark:text-white leading-tight mb-1">{item.name}</h3>
                        <p className="text-sm font-bold text-primary">{formatPrice(item.price, language)}</p>
                      </div>
                      {overStock && (
                        <p className="text-xs text-red-500 font-medium">{t('cart.exceedsStock', { max: available })}</p>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center bg-gray-100 dark:bg-white/10 rounded-lg overflow-hidden">
                          <button
                            className="w-8 h-8 flex items-center justify-center text-text-main dark:text-white hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
                            onClick={() => removeFromWeeklyOrder(item.id, 1)}
                            disabled={orderingClosed}
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              {item.quantity === 1 ? 'delete' : 'remove'}
                            </span>
                          </button>
                          <span className="w-8 text-center text-sm font-bold text-text-main dark:text-white">{item.quantity}</span>
                          <button
                            className="w-8 h-8 flex items-center justify-center text-text-main dark:text-white hover:bg-gray-200 dark:hover:bg-white/20 transition-colors disabled:opacity-40"
                            onClick={() => {
                              const product = { id: item.id, name: item.name, price: item.price, image: item.image } as any;
                              addToWeeklyOrder(product, 1);
                            }}
                            disabled={orderingClosed || (available !== undefined && item.quantity >= available)}
                          >
                            <span className="material-symbols-outlined text-[18px]">add</span>
                          </button>
                        </div>
                        <p className="text-sm font-bold text-text-main dark:text-white">{formatPrice(item.price * item.quantity, language)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="px-5 lg:px-0 mt-6 lg:mt-0 lg:w-80 lg:shrink-0">
            <div className="rounded-2xl bg-white dark:bg-white/5 p-5 shadow-sm border border-slate-100 dark:border-white/5">
              <h3 className="text-lg font-bold text-text-main dark:text-white mb-4">{t('cart.orderSummary')}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-sub">{t('cart.subtotal')}</span>
                  <span className="text-text-main dark:text-white font-medium">{formatPrice(subtotal, language)}</span>
                </div>
                {belowThreshold && (
                  <div className="flex justify-between text-amber-600 dark:text-amber-400">
                    <span>{t('cart.deliveryFee')}</span>
                    <span className="font-medium">{formatPrice(SHIPPING_FEE, language)}</span>
                  </div>
                )}
                {!belowThreshold && subtotal > 0 && (
                  <div className="flex justify-between text-green-600 dark:text-green-400">
                    <span>{t('cart.deliveryFee')}</span>
                    <span className="font-medium">{t('cart.free')}</span>
                  </div>
                )}
              </div>
              <div className="border-t border-slate-100 dark:border-white/10 mt-4 pt-4 flex justify-between">
                <span className="text-base font-bold text-text-main dark:text-white">{t('cart.estimatedTotal')}</span>
                <span className="text-base font-bold text-primary">{formatPrice(subtotal + (belowThreshold ? SHIPPING_FEE : 0), language)}</span>
              </div>
              <p className="text-xs text-text-sub mt-3">{t('cart.finalTotalNote')}</p>
              <button
                className="w-full mt-4 py-3 bg-primary text-white font-bold rounded-xl hover:bg-red-700 transition-colors"
                onClick={() => navigate('/')}
              >
                {t('common.continueShopping')}
              </button>
              <button
                className="w-full mt-2 py-3 bg-transparent border border-slate-200 dark:border-white/10 text-text-main dark:text-white font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                onClick={() => navigate('/orders')}
              >
                {t('cart.viewOrder')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartView;
