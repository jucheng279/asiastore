import { useMemo, useRef } from 'react';
import type { CartItem, Product } from '../types';

const MAX_RECOMMENDATIONS = 8;

function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function useCartRecommendations(cartItems: CartItem[], allProducts: Product[]): Product[] {
  const shuffledRef = useRef<{ key: string; products: Product[] }>({ key: '', products: [] });

  return useMemo(() => {
    if (cartItems.length === 0 || allProducts.length === 0) return [];

    const cartIds = new Set(cartItems.map(item => item.id));
    const categoryIds = new Set(cartItems.map(item => item.categoryId).filter(Boolean));

    if (categoryIds.size === 0) return [];

    const key = `${[...cartIds].sort().join(',')}_${[...categoryIds].sort().join(',')}`;

    if (shuffledRef.current.key === key) {
      return shuffledRef.current.products;
    }

    const eligible = allProducts.filter(
      p => !cartIds.has(p.id) && p.categoryId && categoryIds.has(p.categoryId) && !p.parentProductId
    );

    const selected = shuffleArray(eligible).slice(0, MAX_RECOMMENDATIONS);
    shuffledRef.current = { key, products: selected };
    return selected;
  }, [cartItems, allProducts]);
}
