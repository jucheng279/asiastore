import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useProductData } from '../lib/ProductDataContext';
import { useAuth } from '../lib/AuthContext';
import { formatPrice, formatDate } from '../lib/formatters';
import { NavigationProps, Order } from '../types';
import BottomNav from './BottomNav';

interface OrdersViewProps extends NavigationProps {
  orders: Order[];
  onBuyAgain: (items: Order['items']) => void;
}

const OrdersView: React.FC<OrdersViewProps> = ({ currentView, onNavigate, cartCount, orders, onBuyAgain }) => {
  const { t } = useTranslation();
  const { language } = useProductData();
  const { cancelOrder } = useAuth();
  const { refreshData } = useProductData();
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);

  const handleCancelOrder = async (orderId: string) => {
    setCancellingId(orderId);
    await cancelOrder(orderId);
    refreshData();
    setCancellingId(null);
    setConfirmCancelId(null);
  };

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen pb-24 lg:pb-8">
      <header className="sticky top-0 z-30 flex items-center justify-between bg-background-light/90 dark:bg-background-dark/90 px-5 py-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            className="flex size-10 items-center justify-center rounded-full text-text-main dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
            onClick={() => onNavigate('ACCOUNT')}
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="text-2xl font-bold tracking-tight text-text-main dark:text-white">{t('orders.myOrders')}</h1>
        </div>
        <button
          className="flex relative items-center justify-center text-text-main dark:text-white"
          onClick={() => onNavigate('CART')}
        >
          <span className="material-symbols-outlined text-[26px]">shopping_cart</span>
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-white text-[10px] font-bold">{cartCount}</span>
          )}
        </button>
      </header>

      {orders.length > 0 ? (
        <div className="flex flex-col lg:grid lg:grid-cols-2 gap-4 px-4 lg:px-6 py-4">
          {orders.map((order) => {
            const isCancelled = order.status === 'cancelled';
            return (
              <div
                key={order.id}
                className={`bg-white dark:bg-white/5 rounded-2xl shadow-sm border overflow-hidden ${
                  isCancelled ? 'border-gray-200 dark:border-white/5 opacity-70' : 'border-gray-100 dark:border-white/5'
                }`}
              >
                <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-white/5">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-text-main dark:text-white font-bold">{order.id}</p>
                      {isCancelled && (
                        <span className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-[10px] font-bold uppercase tracking-wider">
                          {t('orders.cancelled')}
                        </span>
                      )}
                    </div>
                    <p className="text-text-sub text-sm">{formatDate(order.date, language)}</p>
                  </div>
                </div>

                <div className="p-4">
                  <div className="flex gap-2 mb-4">
                    {order.items.slice(0, 3).map((item, index) => (
                      <div
                        key={index}
                        className="w-16 h-16 rounded-lg bg-gray-50 dark:bg-white/10 overflow-hidden"
                      >
                        <div
                          className="w-full h-full bg-center bg-no-repeat bg-contain"
                          style={{ backgroundImage: `url("${item.image}")` }}
                        ></div>
                      </div>
                    ))}
                    {order.items.length > 3 && (
                      <div className="w-16 h-16 rounded-lg bg-gray-100 dark:bg-white/10 flex items-center justify-center">
                        <span className="text-text-sub text-sm font-medium">+{order.items.length - 3}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-1 text-sm mb-4">
                    {order.items.map((item, index) => (
                      <p key={index} className="text-text-sub">
                        {item.name} <span className="text-text-main dark:text-white font-medium">x{item.qty}</span>
                      </p>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-white/5">
                    <p className="text-text-main dark:text-white font-bold">
                      {t('orders.total')} <span className={isCancelled ? 'text-gray-400 line-through' : 'text-primary'}>{formatPrice(order.total, language)}</span>
                    </p>
                    <div className="flex gap-2">
                      {!isCancelled && (
                        <>
                          {confirmCancelId === order.id ? (
                            <div className="flex items-center gap-2">
                              <button
                                className="px-3 py-2 text-xs font-semibold text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                                onClick={() => handleCancelOrder(order.id)}
                                disabled={cancellingId === order.id}
                              >
                                {cancellingId === order.id ? t('common.loading') : t('orders.confirmCancel')}
                              </button>
                              <button
                                className="px-3 py-2 text-xs font-semibold text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                onClick={() => setConfirmCancelId(null)}
                              >
                                {t('common.back')}
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                className="px-3 py-2 text-xs font-semibold text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                onClick={() => setConfirmCancelId(order.id)}
                              >
                                {t('orders.cancel')}
                              </button>
                              <button
                                className="px-4 py-2 text-sm font-semibold text-primary border border-primary rounded-lg hover:bg-primary/5 transition-colors"
                                onClick={() => onBuyAgain(order.items)}
                              >
                                {t('orders.buyAgain')}
                              </button>
                            </>
                          )}
                        </>
                      )}
                      {isCancelled && (
                        <button
                          className="px-4 py-2 text-sm font-semibold text-primary border border-primary rounded-lg hover:bg-primary/5 transition-colors"
                          onClick={() => onBuyAgain(order.items)}
                        >
                          {t('orders.buyAgain')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center px-8 py-16">
          <div className="w-24 h-24 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center mb-6">
            <span className="material-symbols-outlined text-gray-400 text-[48px]">receipt_long</span>
          </div>
          <h3 className="text-text-main dark:text-white text-xl font-bold mb-2">{t('orders.noOrders')}</h3>
          <p className="text-text-sub text-center mb-6">{t('orders.noOrdersDesc')}</p>
          <button
            className="px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-red-700 transition-colors"
            onClick={() => onNavigate('HOME')}
          >
            {t('common.startShopping')}
          </button>
        </div>
      )}

      <BottomNav currentView={currentView} onNavigate={onNavigate} />
    </div>
  );
};

export default OrdersView;
