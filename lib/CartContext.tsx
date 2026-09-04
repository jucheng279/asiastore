import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useProductData } from './ProductDataContext';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import type { Product, CartItem, Order } from '../types';

interface CartContextType {
  cartQuantities: Map<string, number>;
  cartCount: number;
  cartItems: CartItem[];
  weeklyOrder: Order | null;
  isAdding: boolean;
  addToWeeklyOrder: (product: Product, quantity?: number) => Promise<void>;
  removeFromWeeklyOrder: (productId: string, quantity?: number) => Promise<void>;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType>({
  cartQuantities: new Map(),
  cartCount: 0,
  cartItems: [],
  weeklyOrder: null,
  isAdding: false,
  addToWeeklyOrder: async () => {},
  removeFromWeeklyOrder: async () => {},
  clearCart: () => {},
});

export function useCart() {
  return useContext(CartContext);
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { productMap, orderingOpen } = useProductData();
  const { isAuthenticated, orders, addToOrder, removeFromOrder, addresses, refreshOrders } = useAuth();
  const { showToast } = useToast();
  const [isAdding, setIsAdding] = useState(false);
  const [needsAddress, setNeedsAddress] = useState(false);

  const weeklyOrder = orders.find(o => o.status === 'active') || null;

  const cartQuantities = new Map<string, number>();
  if (weeklyOrder) {
    for (const item of weeklyOrder.items) {
      cartQuantities.set(item.id, item.qty);
    }
  }

  const cartCount = weeklyOrder
    ? weeklyOrder.items.reduce((sum, item) => sum + item.qty, 0)
    : 0;

  const cartItems: CartItem[] = weeklyOrder
    ? weeklyOrder.items.map(item => {
        const product = productMap.get(item.id);
        return {
          id: item.id,
          name: item.name,
          price: item.price,
          image: item.image,
          quantity: item.qty,
          availableStock: product?.availableStock,
        } as CartItem;
      })
    : [];

  const handleAddToWeeklyOrder = useCallback(async (product: Product, quantity = 1) => {
    if (!orderingOpen) {
      showToast(t('toast.orderingClosed'), 'warning');
      return;
    }
    if (!isAuthenticated) {
      showToast(t('toast.loginRequired'), 'warning');
      return;
    }
    if (product.hasChildren) return;

    setIsAdding(true);

    const hasExistingOrder = !!weeklyOrder;
    const defaultAddr = addresses.find(a => a.isDefault) || addresses[0];

    const result = await addToOrder(
      [{ productId: product.id, name: product.name, image: product.image, quantity }],
      !hasExistingOrder ? defaultAddr : undefined,
      !hasExistingOrder ? defaultAddr?.phone : undefined,
      !hasExistingOrder ? defaultAddr?.email : undefined,
    );

    setIsAdding(false);

    if (result.error) {
      if (/address required/i.test(result.error)) {
        setNeedsAddress(true);
        showToast(t('toast.addressRequired'), 'warning');
      } else {
        showToast(result.error, 'error');
      }
      return;
    }

    showToast(t('toast.addedToOrder'), 'success');
  }, [orderingOpen, isAuthenticated, weeklyOrder, addresses, addToOrder, showToast, t]);

  const handleRemoveFromWeeklyOrder = useCallback(async (productId: string, quantity?: number) => {
    if (!orderingOpen) {
      showToast(t('toast.orderingClosed'), 'warning');
      return;
    }

    const result = await removeFromOrder(productId, quantity);

    if (result.error) {
      showToast(result.error, 'error');
      return;
    }
  }, [orderingOpen, removeFromOrder, showToast, t]);

  const clearCart = useCallback(() => {
    // No-op: use cancel order instead
  }, []);

  return (
    <CartContext.Provider
      value={{
        cartQuantities,
        cartCount,
        cartItems,
        weeklyOrder,
        isAdding,
        addToWeeklyOrder: handleAddToWeeklyOrder,
        removeFromWeeklyOrder: handleRemoveFromWeeklyOrder,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
