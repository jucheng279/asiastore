import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useProductData } from './ProductDataContext';
import { useToast } from './ToastContext';
import type { Product, CartItem } from '../types';

const CART_STORAGE_KEY = 'asian_market_cart';

function loadCartFromStorage(): Map<string, number> {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return new Map();
    const entries: [string, number][] = JSON.parse(raw);
    return new Map(entries);
  } catch {
    return new Map();
  }
}

function saveCartToStorage(cart: Map<string, number>) {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(Array.from(cart.entries())));
  } catch {}
}

interface CartContextType {
  cartQuantities: Map<string, number>;
  cartCount: number;
  cartItems: CartItem[];
  increaseQuantity: (productId: string) => void;
  decreaseQuantity: (productId: string) => void;
  addQuantityToCart: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  buyAgain: (orderItems: { id: string; qty: number }[]) => void;
}

const CartContext = createContext<CartContextType>({
  cartQuantities: new Map(),
  cartCount: 0,
  cartItems: [],
  increaseQuantity: () => {},
  decreaseQuantity: () => {},
  addQuantityToCart: () => {},
  removeFromCart: () => {},
  clearCart: () => {},
  buyAgain: () => {},
});

export function useCart() {
  return useContext(CartContext);
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { productMap, orderingOpen } = useProductData();
  const { showToast } = useToast();
  const [cartQuantities, setCartQuantities] = useState<Map<string, number>>(loadCartFromStorage);

  useEffect(() => {
    saveCartToStorage(cartQuantities);
  }, [cartQuantities]);

  useEffect(() => {
    if (productMap.size === 0 || cartQuantities.size === 0) return;
    let needsUpdate = false;
    const clamped = new Map(cartQuantities);
    clamped.forEach((qty, productId) => {
      const product = productMap.get(productId);
      if (product?.hasChildren) {
        clamped.delete(productId);
        needsUpdate = true;
        return;
      }
      const available = product?.availableStock;
      if (available === undefined) return;
      if (available <= 0) {
        clamped.delete(productId);
        needsUpdate = true;
      } else if (qty > available) {
        clamped.set(productId, available);
        needsUpdate = true;
      }
    });
    if (needsUpdate) {
      setCartQuantities(clamped);
      showToast(t('toast.cartAdjustedToStock'), 'warning');
    }
  }, [productMap]);

  const increaseQuantity = useCallback((productId: string) => {
    if (!orderingOpen) return;
    const product = productMap.get(productId);
    if (product?.hasChildren) return;
    const available = product?.availableStock;
    setCartQuantities(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(productId) || 0;
      if (available !== undefined && current >= available) return prev;
      newMap.set(productId, current + 1);
      return newMap;
    });
  }, [orderingOpen, productMap]);

  const decreaseQuantity = useCallback((productId: string) => {
    setCartQuantities(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(productId) || 0;
      if (current <= 1) {
        newMap.delete(productId);
      } else {
        newMap.set(productId, current - 1);
      }
      return newMap;
    });
  }, []);

  const addQuantityToCart = useCallback((productId: string, quantity: number) => {
    if (!orderingOpen) return;
    const product = productMap.get(productId);
    if (product?.hasChildren) return;
    const available = product?.availableStock;
    setCartQuantities(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(productId) || 0;
      const maxAdd = available !== undefined ? Math.max(0, available - current) : quantity;
      const toAdd = Math.min(quantity, maxAdd);
      if (toAdd > 0) {
        newMap.set(productId, current + toAdd);
      }
      return newMap;
    });
    const name = product?.name || t('common.item', { count: 1 });
    showToast(quantity > 1 ? t('toast.addedToCartQty', { qty: quantity, name }) : t('toast.addedToCart', { name }));
  }, [orderingOpen, productMap, showToast, t]);

  const removeFromCart = useCallback((productId: string) => {
    setCartQuantities(prev => {
      const newMap = new Map(prev);
      newMap.delete(productId);
      return newMap;
    });
  }, []);

  const clearCart = useCallback(() => {
    setCartQuantities(new Map());
  }, []);

  const buyAgain = useCallback((orderItems: { id: string; qty: number }[]) => {
    if (!orderingOpen) {
      showToast(t('toast.orderingClosed'), 'warning');
      return;
    }
    setCartQuantities(prev => {
      const newMap = new Map(prev);
      orderItems.forEach(item => {
        const product = productMap.get(item.id);
        const available = product?.availableStock;
        if (available !== undefined && available <= 0) return;
        const currentQty = newMap.get(item.id) || 0;
        const maxAdd = available !== undefined ? Math.max(0, available - currentQty) : item.qty;
        if (maxAdd > 0) {
          newMap.set(item.id, currentQty + Math.min(item.qty, maxAdd));
        }
      });
      return newMap;
    });
  }, [orderingOpen, productMap, showToast, t]);

  const cartCount = Array.from(cartQuantities.values()).reduce((sum, qty) => sum + qty, 0);

  const cartItems: CartItem[] = [];
  cartQuantities.forEach((quantity, productId) => {
    const product = productMap.get(productId);
    if (product) {
      cartItems.push({ ...product, id: productId, quantity });
    }
  });

  return (
    <CartContext.Provider
      value={{
        cartQuantities,
        cartCount,
        cartItems,
        increaseQuantity,
        decreaseQuantity,
        addQuantityToCart,
        removeFromCart,
        clearCart,
        buyAgain,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
