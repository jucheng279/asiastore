import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useProductData } from '../lib/ProductDataContext';
import { useAuth } from '../lib/AuthContext';
import { formatPrice } from '../lib/formatters';
import { TAX_RATE, FREE_SHIPPING_THRESHOLD, SHIPPING_FEE, POINTS_DISCOUNT_RATE } from '../lib/businessConstants';
import type { FetchedData } from '../lib/api';
import type { OrderItem, Product } from '../types';

function buildProductMap(data: FetchedData): Map<string, Product> {
  const allChildProducts: Product[] = [];
  for (const list of [data.catalogProducts, data.expiryProducts, data.flashSaleProducts]) {
    for (const p of list) {
      if (p.children) {
        allChildProducts.push(...p.children);
      }
    }
  }
  const all = [...data.catalogProducts, ...allChildProducts, ...data.expiryProducts, ...data.flashSaleProducts];
  const map = new Map<string, Product>();
  for (const p of all) {
    map.set(p.id, p);
    if (p.sourceProductId && !map.has(p.sourceProductId)) {
      map.set(p.sourceProductId, p);
    }
  }
  return map;
}

interface EditableItem {
  id: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
  originalQty: number;
  isNew: boolean;
}

interface OrderEditModeProps {
  orderId: string;
  items: OrderItem[];
  paidWithPoints?: boolean;
  originalTotal: number;
  onClose: () => void;
  onSuccess: () => void;
}

const OrderEditMode: React.FC<OrderEditModeProps> = ({
  orderId,
  items,
  paidWithPoints,
  originalTotal,
  onClose,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const { language, allProducts, productMap, refreshData } = useProductData();
  const { modifyOrder, points } = useAuth();

  const [editItems, setEditItems] = useState<EditableItem[]>(
    items
      .filter(item => {
        const p = productMap.get(item.id);
        return !p?.hasChildren;
      })
      .map(item => ({
        id: item.id,
        name: item.name,
        image: item.image,
        price: item.price,
        quantity: item.qty,
        originalQty: item.qty,
        isNew: false,
      }))
  );
  const [showAddItems, setShowAddItems] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editItemIds = useMemo(() => new Set(editItems.map(i => i.id)), [editItems]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return allProducts
      .filter(p =>
        !p.hasChildren &&
        !editItemIds.has(p.id) &&
        p.name.toLowerCase().includes(q) &&
        (p.availableStock === undefined || p.availableStock > 0)
      )
      .slice(0, 10);
  }, [searchQuery, allProducts, editItemIds]);

  const getMaxStock = (itemId: string, originalQty: number): number | undefined => {
    const product = productMap.get(itemId);
    if (!product || product.availableStock === undefined) return undefined;
    return product.availableStock + originalQty;
  };

  const handleIncrease = (id: string) => {
    setEditItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const max = getMaxStock(id, item.originalQty);
      if (max !== undefined && item.quantity >= max) return item;
      return { ...item, quantity: item.quantity + 1 };
    }));
  };

  const handleDecrease = (id: string) => {
    setEditItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      return { ...item, quantity: Math.max(0, item.quantity - 1) };
    }));
  };

  const handleAddProduct = (product: Product) => {
    if (product.hasChildren) return;
    setEditItems(prev => [...prev, {
      id: product.id,
      name: product.name,
      image: product.image,
      price: product.price,
      quantity: 1,
      originalQty: 0,
      isNew: true,
    }]);
    setSearchQuery('');
  };

  const hasChanges = editItems.some(
    item => item.quantity !== item.originalQty || item.isNew
  );

  const allZero = editItems.every(item => item.quantity === 0);

  const previewSubtotal = editItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const previewShipping = previewSubtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const previewTax = previewSubtotal * TAX_RATE;
  const previewDiscount = paidWithPoints
    ? (previewSubtotal + previewShipping + previewTax) * POINTS_DISCOUNT_RATE
    : 0;
  const previewTotal = Math.round((previewSubtotal + previewShipping + previewTax - previewDiscount) * 100) / 100;

  const handleSave = async () => {
    if (!hasChanges) return;
    setError(null);
    setSaving(true);

    try {
      await refreshData();

      const itemsPayload = editItems.map(item => ({
        id: item.id,
        name: item.name,
        image: item.image,
        price: item.price,
        quantity: item.quantity,
      }));

      const result = await modifyOrder(orderId, itemsPayload);

      if (result.error) {
        if (/insufficient stock/i.test(result.error)) {
          const freshData = await refreshData();
          const freshMap = freshData ? buildProductMap(freshData) : productMap;
          const adjustedNames: string[] = [];
          setEditItems(prev => prev.map(item => {
            const product = freshMap.get(item.id);
            if (!product || product.availableStock === undefined) return item;
            const max = product.availableStock + item.originalQty;
            if (item.quantity <= max) return item;
            const capped = Math.max(0, max);
            adjustedNames.push(t('orders.stockAdjustedItem', { name: item.name, qty: capped }));
            return { ...item, quantity: capped };
          }));
          const msg = adjustedNames.length > 0
            ? `${t('orders.stockAdjusted')}\n${adjustedNames.join('\n')}`
            : t('orders.stockAdjusted');
          setError(msg);
        } else {
          setError(t('orders.editFailed'));
        }
        setSaving(false);
        return;
      }

      await refreshData();
      onSuccess();
    } catch {
      setError(t('orders.editFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    onClose();
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-col gap-3">
        {editItems.map((item) => {
          const maxStock = getMaxStock(item.id, item.originalQty);
          const atMax = maxStock !== undefined && item.quantity >= maxStock;
          const isRemoved = item.quantity === 0;

          return (
            <div
              key={item.id}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                isRemoved
                  ? 'border-red-200 dark:border-red-900/30 bg-red-50/50 dark:bg-red-900/10'
                  : 'border-gray-100 dark:border-white/5 bg-white dark:bg-white/5'
              }`}
            >
              <div className="w-12 h-12 rounded-lg bg-gray-50 dark:bg-white/10 overflow-hidden shrink-0">
                <div
                  className="w-full h-full bg-center bg-no-repeat bg-contain"
                  style={{ backgroundImage: `url("${item.image}")` }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${
                  isRemoved
                    ? 'line-through text-gray-400 dark:text-gray-500'
                    : 'text-text-main dark:text-white'
                }`}>
                  {item.name}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-primary">{formatPrice(item.price, language)}</span>
                  {isRemoved && (
                    <span className="text-[11px] text-red-500 font-medium">{t('orders.willBeRemoved')}</span>
                  )}
                  {item.isNew && !isRemoved && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-bold">{t('common.new')}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 dark:bg-white/10 text-slate-600 dark:text-white hover:text-primary transition-colors"
                  onClick={() => handleDecrease(item.id)}
                >
                  <span className="material-symbols-outlined text-[16px]">remove</span>
                </button>
                <span className={`w-6 text-center text-sm font-semibold ${
                  isRemoved ? 'text-red-400' : 'text-text-main dark:text-white'
                }`}>
                  {item.quantity}
                </span>
                <button
                  className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
                    atMax
                      ? 'bg-gray-200 dark:bg-white/5 text-gray-400 cursor-not-allowed'
                      : 'bg-primary text-white hover:bg-red-700'
                  }`}
                  onClick={() => handleIncrease(item.id)}
                  disabled={atMax}
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {!showAddItems ? (
        <button
          className="w-full py-2.5 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-xl text-sm font-semibold text-text-sub hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
          onClick={() => {
            setShowAddItems(true);
            refreshData();
          }}
        >
          <span className="material-symbols-outlined text-[18px]">add_circle</span>
          {t('orders.addItems')}
        </button>
      ) : (
        <div className="rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/[0.02] p-3 space-y-3">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('orders.searchProducts')}
              className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-text-main dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
              autoFocus
            />
          </div>
          {searchResults.length > 0 && (
            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
              {searchResults.map(product => (
                <div
                  key={product.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-white dark:hover:bg-white/5 transition-colors cursor-pointer"
                  onClick={() => handleAddProduct(product)}
                >
                  <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-white/10 overflow-hidden shrink-0">
                    <div
                      className="w-full h-full bg-center bg-no-repeat bg-contain"
                      style={{ backgroundImage: `url("${product.image}")` }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-main dark:text-white truncate">{product.name}</p>
                    <p className="text-xs font-semibold text-primary">{formatPrice(product.price, language)}</p>
                  </div>
                  <span className="material-symbols-outlined text-primary text-[20px]">add_circle</span>
                </div>
              ))}
            </div>
          )}
          {searchQuery.trim() && searchResults.length === 0 && (
            <p className="text-center text-sm text-text-sub py-2">{t('product.noProductsFound')}</p>
          )}
          <button
            className="w-full py-2 text-sm font-semibold text-text-sub hover:text-text-main transition-colors"
            onClick={() => {
              setShowAddItems(false);
              setSearchQuery('');
            }}
          >
            {t('orders.doneAdding')}
          </button>
        </div>
      )}

      <div className="rounded-xl border border-gray-100 dark:border-white/5 bg-white dark:bg-white/5 p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-text-sub">{t('cart.subtotal')}</span>
          <span className="font-semibold text-text-main dark:text-white">{formatPrice(previewSubtotal, language)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-text-sub">{t('cart.shipping')}</span>
          <span className="font-semibold text-text-main dark:text-white">{previewShipping === 0 ? t('cart.free') : formatPrice(previewShipping, language)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-text-sub">{t('cart.estimatedTax')}</span>
          <span className="font-semibold text-text-main dark:text-white">{formatPrice(previewTax, language)}</span>
        </div>
        {paidWithPoints && previewDiscount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-text-sub">{t('checkout.pointsDiscount')}</span>
            <span className="font-semibold text-emerald-600">-{formatPrice(previewDiscount, language)}</span>
          </div>
        )}
        <div className="h-px bg-gray-100 dark:bg-white/10 my-1" />
        <div className="flex justify-between">
          <span className="text-sm font-bold text-text-main dark:text-white">{t('orders.newTotal')}</span>
          <span className={`text-lg font-bold ${allZero ? 'text-gray-400' : 'text-primary'}`}>
            {allZero ? formatPrice(0, language) : formatPrice(previewTotal, language)}
          </span>
        </div>
        {paidWithPoints && previewTotal > originalTotal && (
          <div className="mt-2">
            {(previewTotal - originalTotal) > points ? (
              <p className="text-xs text-red-500 font-medium">{t('orders.insufficientPoints')}</p>
            ) : null}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 p-3">
          {error.split('\n').map((line, i) => (
            <p key={i} className={`text-sm text-red-600 dark:text-red-400 ${i > 0 ? 'mt-1 text-xs opacity-80' : ''}`}>{line}</p>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <button
          className="flex-1 py-3 text-sm font-semibold text-text-sub border border-gray-200 dark:border-white/10 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
          onClick={handleDiscard}
          disabled={saving}
        >
          {t('orders.discardChanges')}
        </button>
        <button
          className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${
            !hasChanges || saving || (paidWithPoints && previewTotal > originalTotal && (previewTotal - originalTotal) > points)
              ? 'bg-gray-300 dark:bg-white/10 text-gray-500 cursor-not-allowed'
              : allZero
                ? 'bg-red-600 text-white hover:bg-red-700 active:scale-[0.98]'
                : 'bg-primary text-white hover:bg-red-700 active:scale-[0.98]'
          }`}
          onClick={handleSave}
          disabled={!hasChanges || saving || (paidWithPoints && previewTotal > originalTotal && (previewTotal - originalTotal) > points)}
        >
          {saving
            ? t('orders.saving')
            : allZero
              ? t('orders.cancel')
              : t('orders.saveChanges')
          }
        </button>
      </div>
    </div>
  );
};

export default OrderEditMode;
