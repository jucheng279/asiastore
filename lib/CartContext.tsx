import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { Product, CartItem } from '../types';

const STORAGE_KEY = 'local_cart';

interface LocalCartEntry {
  productId: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
}

interface CartContextType {
  cartItems: CartItem[];
  cartQuantities: Map<string, number>;
  cartCount: number;
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string, quantity?: number) => void;
  clearCart: () => void;
  setItemQuantity: (productId: string, quantity: number) => void;
}

const CartContext = createContext<CartContextType>({
  cartItems: [],
  cartQuantities: new Map(),
  cartCount: 0,
  addToCart: () => {},
  removeFromCart: () => {},
  clearCart: () => {},
  setItemQuantity: () => {},
});

export function useCart() {
  return useContext(CartContext);
}

function loadCart(): LocalCartEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as LocalCartEntry[];
  } catch {
    return [];
  }
}

function saveCart(entries: LocalCartEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch { /* quota exceeded — ignore */ }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<LocalCartEntry[]>(() => loadCart());

  useEffect(() => {
    saveCart(entries);
  }, [entries]);

  const cartQuantities = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of entries) m.set(e.productId, e.quantity);
    return m;
  }, [entries]);

  const cartCount = useMemo(
    () => entries.reduce((sum, e) => sum + e.quantity, 0),
    [entries],
  );

  const cartItems: CartItem[] = useMemo(
    () => entries.map(e => ({
      id: e.productId,
      name: e.name,
      price: e.price,
      image: e.image,
      quantity: e.quantity,
    })),
    [entries],
  );

  const addToCart = useCallback((product: Product, quantity = 1) => {
    if (product.hasChildren) return;
    setEntries(prev => {
      const idx = prev.findIndex(e => e.productId === product.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], quantity: updated[idx].quantity + quantity, price: product.price, name: product.name, image: product.image };
        return updated;
      }
      return [...prev, { productId: product.id, name: product.name, price: product.price, image: product.image, quantity }];
    });
  }, []);

  const removeFromCart = useCallback((productId: string, quantity?: number) => {
    setEntries(prev => {
      const idx = prev.findIndex(e => e.productId === productId);
      if (idx < 0) return prev;
      if (quantity === undefined || prev[idx].quantity <= quantity) {
        return prev.filter((_, i) => i !== idx);
      }
      const updated = [...prev];
      updated[idx] = { ...updated[idx], quantity: updated[idx].quantity - quantity };
      return updated;
    });
  }, []);

  const setItemQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      setEntries(prev => prev.filter(e => e.productId !== productId));
      return;
    }
    setEntries(prev => {
      const idx = prev.findIndex(e => e.productId === productId);
      if (idx < 0) return prev;
      const updated = [...prev];
      updated[idx] = { ...updated[idx], quantity };
      return updated;
    });
  }, []);

  const clearCart = useCallback(() => {
    setEntries([]);
  }, []);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        cartQuantities,
        cartCount,
        addToCart,
        removeFromCart,
        clearCart,
        setItemQuantity,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
