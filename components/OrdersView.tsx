import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useProductData } from '../lib/ProductDataContext';
import { useAuth } from '../lib/AuthContext';
import { formatPrice, formatDate } from '../lib/formatters';
import { NavigationProps, Order, OrderItem } from '../types';
import { fetchStoreSettings, isStoreOpen, type StoreSettings } from '../lib/storeStatus';
import { calculateOrderingWindow } from '../lib/orderSummaryApi';
import BottomNav from './BottomNav';

interface ConsolidatedOrder {
  id: string;
  date: string;
  total: number;
  items: OrderItem[];
  contactEmail: string;
  contactPhone: string;
  shippingAddress: Order['shippingAddress'];
  deliveryInstructions?: string;
  status: 'active' | 'cancelled' | 'completed';
  paidWithPoints?: boolean;
  pointsAmount?: number;
  paymentMethod?: string;
  mergedOrderIds: string[];
  createdAt: string;
}

function consolidateOrders(
  orders: Order[],
  openDay: number,
  openTime: string,
  closeDay: number,
  closeTime: string
): ConsolidatedOrder[] {
  const getWindowKey = (dateStr: string): string => {
    const orderDate = new Date(dateStr);
    for (let offset = 0; offset >= -52; offset--) {
      const win = calculateOrderingWindow(openDay, openTime, closeDay, closeTime, offset);
      if (orderDate >= win.start && orderDate < win.end) {
        return win.start.toISOString();
      }
    }
    return dateStr;
  };

  const addrKey = (addr: Order['shippingAddress']): string =>
    `${(addr.streetAddress || '').trim().toLowerCase()}|${(addr.postalCode || '').trim().toLowerCase()}|${(addr.city || '').trim().toLowerCase()}`;

  const grouped = new Map<string, Order[]>();
  for (const order of orders) {
    const windowKey = getWindowKey(order.createdAt);
    const key = `${windowKey}|${order.contactPhone.trim()}|${order.contactEmail.trim().toLowerCase()}|${order.paymentMethod || 'cashOrSwish'}|${addrKey(order.shippingAddress)}|${order.status}`;
    const list = grouped.get(key) || [];
    list.push(order);
    grouped.set(key, list);
  }

  const result: ConsolidatedOrder[] = [];
  for (const group of grouped.values()) {
    if (group.length === 1) {
      result.push({ ...group[0], mergedOrderIds: [group[0].id], createdAt: group[0].createdAt });
    } else {
      const first = group[0];
      const mergedItems: OrderItem[] = [];
      let totalSum = 0;
      let pointsSum = 0;

      for (const order of group) {
        totalSum += order.total;
        pointsSum += order.pointsAmount || 0;
        for (const item of order.items) {
          const existing = mergedItems.find(m => m.id === item.id && m.price === item.price);
          if (existing) {
            existing.qty += item.qty;
          } else {
            mergedItems.push({ ...item });
          }
        }
      }

      result.push({
        id: first.id,
        date: first.date,
        total: totalSum,
        items: mergedItems,
        contactEmail: first.contactEmail,
        contactPhone: first.contactPhone,
        shippingAddress: first.shippingAddress,
        deliveryInstructions: first.deliveryInstructions || group.find(o => o.deliveryInstructions)?.deliveryInstructions,
        status: first.status,
        paidWithPoints: first.paidWithPoints,
        pointsAmount: pointsSum || undefined,
        paymentMethod: first.paymentMethod,
        mergedOrderIds: group.map(o => o.id),
        createdAt: first.createdAt,
      });
    }
  }

  result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return result;
}

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
  const [storeSchedule, setStoreSchedule] = useState({ openDay: 1, openTime: '00:00', closeDay: 5, closeTime: '12:00' });
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);

  useEffect(() => {
    fetchStoreSettings().then(settings => {
      setStoreSchedule({
        openDay: settings.autoOpenDay,
        openTime: settings.autoOpenTime,
        closeDay: settings.autoCloseDay,
        closeTime: settings.autoCloseTime,
      });
      setStoreSettings(settings);
    });
  }, []);

  const canCancelOrder = (order: ConsolidatedOrder): boolean => {
    if (order.status !== 'active') return false;
    if (!storeSettings) return false;
    if (!isStoreOpen(storeSettings)) return false;
    const currentWindow = calculateOrderingWindow(
      storeSchedule.openDay, storeSchedule.openTime,
      storeSchedule.closeDay, storeSchedule.closeTime, 0
    );
    const orderDate = new Date(order.createdAt);
    return orderDate >= currentWindow.start && orderDate < currentWindow.end;
  };

  const consolidatedOrders = useMemo(
    () => consolidateOrders(orders, storeSchedule.openDay, storeSchedule.openTime, storeSchedule.closeDay, storeSchedule.closeTime),
    [orders, storeSchedule]
  );

  const handleCancelOrder = async (consolidated: ConsolidatedOrder) => {
    setCancellingId(consolidated.id);
    for (const orderId of consolidated.mergedOrderIds) {
      await cancelOrder(orderId);
    }
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

      {consolidatedOrders.length > 0 ? (
        <div className="flex flex-col lg:grid lg:grid-cols-2 gap-4 px-4 lg:px-6 py-4">
          {consolidatedOrders.map((order) => {
            const isCancelled = order.status === 'cancelled';
            const isCompleted = order.status === 'completed';
            const isInactive = isCancelled || isCompleted;
            const isMerged = order.mergedOrderIds.length > 1;
            const showCancelButton = canCancelOrder(order);
            return (
              <div
                key={order.id}
                className={`bg-white dark:bg-white/5 rounded-2xl shadow-sm border overflow-hidden ${
                  isCancelled ? 'border-gray-200 dark:border-white/5 opacity-70' : 'border-gray-100 dark:border-white/5'
                }`}
              >
                <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-white/5">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-text-main dark:text-white font-bold">{order.id}</p>
                      {isCancelled && (
                        <span className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-[10px] font-bold uppercase tracking-wider">
                          {t('orders.cancelled')}
                        </span>
                      )}
                      {isCompleted && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                          {t('orders.completed')}
                        </span>
                      )}
                      {isMerged && (
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-bold">
                          {order.mergedOrderIds.length} orders combined
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
                      {order.status === 'active' && showCancelButton && (
                        <>
                          {confirmCancelId === order.id ? (
                            <div className="flex items-center gap-2">
                              <button
                                className="px-3 py-2 text-xs font-semibold text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                                onClick={() => handleCancelOrder(order)}
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
                            <button
                              className="px-3 py-2 text-xs font-semibold text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                              onClick={() => setConfirmCancelId(order.id)}
                            >
                              {t('orders.cancel')}
                            </button>
                          )}
                        </>
                      )}
                      {(isInactive || !showCancelButton) && (
                        <button
                          className="px-4 py-2 text-sm font-semibold text-primary border border-primary rounded-lg hover:bg-primary/5 transition-colors"
                          onClick={() => onBuyAgain(order.items)}
                        >
                          {t('orders.buyAgain')}
                        </button>
                      )}
                      {order.status === 'active' && showCancelButton && confirmCancelId !== order.id && (
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
