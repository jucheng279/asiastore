import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useProductData } from '../lib/ProductDataContext';
import { useCart } from '../lib/CartContext';
import { useAuth } from '../lib/AuthContext';
import { useToast } from '../lib/ToastContext';
import { formatPrice } from '../lib/formatters';
import { ProductCarousel } from './ProductGrids';
import type { Product } from '../types';

interface StockConflict {
  id: string;
  name: string;
  image: string;
  requested: number;
  available: number;
}

const CartView: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { language, orderingOpen, productMap, bestSellerProducts, allProducts, refreshData } = useProductData();
  const { cartItems, cartCount, cartQuantities, addToCart, removeFromCart, clearCart, setItemQuantity } = useCart();
  const { isAuthenticated, addresses, addToOrder, refreshOrders } = useAuth();
  const { showToast } = useToast();

  const [isOrdering, setIsOrdering] = useState(false);
  const [isRefreshingStock, setIsRefreshingStock] = useState(false);
  const [stockWarnings, setStockWarnings] = useState<Map<string, number>>(new Map());
  const [stockConflicts, setStockConflicts] = useState<StockConflict[]>([]);

  const isEmpty = cartItems.length === 0;
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const recommendations = useMemo(() => {
    const cartIds = new Set(cartItems.map(i => i.id));
    const candidates = bestSellerProducts.length > 0 ? bestSellerProducts : allProducts;
    return candidates
      .filter(p => !cartIds.has(p.id) && !p.hasChildren && (p.availableStock === undefined || p.availableStock > 0))
      .slice(0, 10);
  }, [cartItems, bestSellerProducts, allProducts]);

  const getStockIssues = (): { id: string; name: string; available: number }[] => {
    const issues: { id: string; name: string; available: number }[] = [];
    for (const item of cartItems) {
      const product = productMap.get(item.id);
      if (product && product.availableStock !== undefined && item.quantity > product.availableStock) {
        issues.push({ id: item.id, name: item.name, available: product.availableStock });
      }
    }
    return issues;
  };

  const buildConflictsFromFreshData = (freshProductMap: Map<string, Product>): StockConflict[] => {
    const conflicts: StockConflict[] = [];
    for (const item of cartItems) {
      const product = freshProductMap.get(item.id);
      if (product && product.availableStock !== undefined && item.quantity > product.availableStock) {
        conflicts.push({
          id: item.id,
          name: item.name,
          image: item.image,
          requested: item.quantity,
          available: product.availableStock,
        });
      }
    }
    return conflicts;
  };

  const handleAcceptConflicts = () => {
    for (const conflict of stockConflicts) {
      if (conflict.available <= 0) {
        removeFromCart(conflict.id);
      } else {
        setItemQuantity(conflict.id, conflict.available);
      }
    }
    setStockConflicts([]);
    setStockWarnings(new Map());
  };

  const handleRemoveConflictItems = () => {
    for (const conflict of stockConflicts) {
      removeFromCart(conflict.id);
    }
    setStockConflicts([]);
    setStockWarnings(new Map());
  };

  const handleAddToOrder = async () => {
    if (isOrdering || isEmpty || isRefreshingStock) return;

    if (!isAuthenticated) {
      showToast(t('toast.loginRequired'), 'warning');
      navigate('/login');
      return;
    }

    if (!orderingOpen) {
      showToast(t('toast.orderingClosed'), 'warning');
      return;
    }

    if (addresses.length === 0) {
      showToast(t('toast.addressRequired'), 'warning');
      navigate('/addresses');
      return;
    }

    const issues = getStockIssues();
    if (issues.length > 0) {
      const warningMap = new Map<string, number>();
      for (const issue of issues) {
        warningMap.set(issue.id, issue.available);
        if (issue.available <= 0) {
          removeFromCart(issue.id);
        } else {
          setItemQuantity(issue.id, issue.available);
        }
      }
      setStockWarnings(warningMap);
      showToast(t('cart.stockChanged'), 'warning');
      return;
    }

    setIsOrdering(true);
    setStockWarnings(new Map());

    const defaultAddr = addresses.find(a => a.isDefault) || addresses[0];

    const result = await addToOrder(
      cartItems.map(item => ({
        productId: item.id,
        name: item.name,
        image: item.image,
        quantity: item.quantity,
      })),
      defaultAddr,
      defaultAddr?.phone,
      defaultAddr?.email,
    );

    setIsOrdering(false);

    if (result.error) {
      if (/insufficient stock/i.test(result.error)) {
        setIsRefreshingStock(true);
        const freshData = await refreshData();
        setIsRefreshingStock(false);

        if (freshData) {
          const allChildProducts: Product[] = [];
          for (const list of [freshData.catalogProducts, freshData.expiryProducts, freshData.flashSaleProducts]) {
            for (const p of list) {
              if (p.children) allChildProducts.push(...p.children);
            }
          }
          const all = [...freshData.catalogProducts, ...allChildProducts, ...freshData.expiryProducts, ...freshData.flashSaleProducts];
          const freshMap = new Map<string, Product>();
          for (const p of all) freshMap.set(p.id, p);

          const conflicts = buildConflictsFromFreshData(freshMap);
          if (conflicts.length > 0) {
            setStockConflicts(conflicts);
            return;
          }
        }

        showToast(t('cart.stockChanged'), 'warning');
      } else if (/address required/i.test(result.error)) {
        showToast(t('toast.addressRequired'), 'warning');
        navigate('/addresses');
      } else {
        showToast(result.error, 'warning');
      }
      return;
    }

    clearCart();
    showToast(t('cart.orderSuccess'), 'success');
    await Promise.all([refreshOrders(), refreshData()]);
  };

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen pb-28 lg:pb-8">
      <header className="sticky top-0 z-30 flex items-center justify-between bg-background-light/90 dark:bg-background-dark/90 px-5 lg:px-6 py-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            className="flex size-10 items-center justify-center rounded-full text-text-main dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
            onClick={() => navigate(-1)}
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="text-2xl font-bold tracking-tight text-text-main dark:text-white">{t('cart.myCart')}</h1>
        </div>
        {!isEmpty && (
          <button
            className="text-sm font-semibold text-text-sub hover:text-red-600 transition-colors"
            onClick={clearCart}
          >
            {t('cart.clearAll')}
          </button>
        )}
      </header>

      {/* Stock conflict dialog */}
      {stockConflicts.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 shadow-xl overflow-hidden animate-in fade-in">
            <div className="px-5 pt-5 pb-3">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex size-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                  <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-[22px]">inventory_2</span>
                </div>
                <h2 className="text-lg font-bold text-text-main dark:text-white">{t('cart.stockConflictTitle')}</h2>
              </div>
              <p className="text-sm text-text-sub mb-4">{t('cart.stockConflictDesc')}</p>
            </div>

            <div className="max-h-64 overflow-y-auto px-5">
              <div className="flex flex-col gap-3 pb-3">
                {stockConflicts.map((conflict) => (
                  <div key={conflict.id} className="flex items-center gap-3 rounded-xl bg-gray-50 dark:bg-white/5 p-3">
                    <div className="w-12 h-12 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-white/10">
                      <img src={conflict.image} alt={conflict.name} className="h-full w-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-text-main dark:text-white truncate">{conflict.name}</p>
                      {conflict.available <= 0 ? (
                        <p className="text-xs font-medium text-red-500">{t('cart.stockConflictItemSoldOut')}</p>
                      ) : (
                        <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
                          {t('cart.stockConflictItemReduced', { available: conflict.available, requested: conflict.requested })}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-5 pb-5 pt-2 flex flex-col gap-2">
              <button
                className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-red-700 transition-colors"
                onClick={handleAcceptConflicts}
              >
                {t('cart.stockConflictAccept')}
              </button>
              <button
                className="w-full py-3 bg-transparent border border-slate-200 dark:border-white/10 text-text-main dark:text-white font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                onClick={handleRemoveConflictItems}
              >
                {t('cart.stockConflictRemoveAll')}
              </button>
            </div>
          </div>
        </div>
      )}

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center px-8 py-16">
          <div className="w-24 h-24 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center mb-6">
            <span className="material-symbols-outlined text-gray-400 text-[48px]">shopping_cart</span>
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
            <div className="flex flex-col gap-4 px-5 lg:px-0">
              {cartItems.map((item) => {
                const product = productMap.get(item.id);
                const available = product?.availableStock;
                const overStock = available !== undefined && item.quantity > available;
                const stockWarning = stockWarnings.get(item.id);

                return (
                  <div key={item.id} className="group relative flex gap-4 rounded-2xl bg-white dark:bg-white/5 p-3 shadow-sm border border-slate-100 dark:border-white/5 transition-transform active:scale-[0.99]">
                    <div className="relative aspect-square w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-white/10">
                      <img alt={item.name} loading="lazy" className="h-full w-full object-cover" src={item.image} />
                    </div>
                    <div className="flex flex-1 flex-col justify-between py-1">
                      <div>
                        <h3 className="text-sm font-semibold text-text-main dark:text-white leading-tight mb-1">{item.name}</h3>
                        <p className="text-sm font-bold text-primary">{formatPrice(item.price, language)}</p>
                      </div>
                      {(overStock || stockWarning !== undefined) && (
                        <p className="text-xs text-red-500 font-medium">
                          {available !== undefined && available <= 0
                            ? t('product.outOfStock')
                            : t('cart.exceedsStock', { max: available ?? stockWarning })}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center bg-gray-100 dark:bg-white/10 rounded-lg overflow-hidden">
                          <button
                            className="w-8 h-8 flex items-center justify-center text-text-main dark:text-white hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
                            onClick={() => removeFromCart(item.id, 1)}
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              {item.quantity === 1 ? 'delete' : 'remove'}
                            </span>
                          </button>
                          <span className="w-8 text-center text-sm font-bold text-text-main dark:text-white">{item.quantity}</span>
                          <button
                            className="w-8 h-8 flex items-center justify-center text-text-main dark:text-white hover:bg-gray-200 dark:hover:bg-white/20 transition-colors disabled:opacity-40"
                            onClick={() => addToCart({ id: item.id, name: item.name, price: item.price, image: item.image } as any, 1)}
                            disabled={available !== undefined && item.quantity >= available}
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
              <div className="flex justify-between text-sm mb-4">
                <span className="text-text-sub">{t('cart.subtotal')}</span>
                <span className="text-text-main dark:text-white font-bold text-base">{formatPrice(subtotal, language)}</span>
              </div>

              <button
                className="w-full py-3.5 bg-primary text-white font-bold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                onClick={handleAddToOrder}
                disabled={isOrdering || isRefreshingStock || !orderingOpen}
              >
                {isOrdering || isRefreshingStock ? (
                  <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                ) : (
                  <span className="material-symbols-outlined text-[20px]">shopping_bag</span>
                )}
                <span>{isRefreshingStock ? t('cart.refreshingStock') : t('cart.addToOrder')}</span>
              </button>

              {!orderingOpen && (
                <p className="text-xs text-amber-600 dark:text-amber-400 text-center mt-2">{t('toast.orderingClosed')}</p>
              )}

              <button
                className="w-full mt-3 py-3 bg-transparent border border-slate-200 dark:border-white/10 text-text-main dark:text-white font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                onClick={() => navigate('/')}
              >
                {t('common.continueShopping')}
              </button>
            </div>
          </div>
        </div>
      )}

      {recommendations.length > 0 && (
        <div className="mt-8 px-5 lg:px-6">
          <h2 className="text-lg font-bold text-text-main dark:text-white mb-4">{t('cart.youMightLike')}</h2>
          <div className="overflow-x-auto -mx-5 px-5 lg:mx-0 lg:px-0 pb-2">
            <ProductCarousel products={recommendations} />
          </div>
        </div>
      )}
    </div>
  );
};

export default CartView;
