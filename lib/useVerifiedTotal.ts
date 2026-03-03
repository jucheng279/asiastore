import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';
import type { CartItem } from '../types';

interface VerifiedTotals {
  subtotal: number;
  shipping: number;
  tax: number;
  pointsDiscount: number;
  total: number;
  isLoading: boolean;
  error: string | null;
}

export function useVerifiedTotal(cartItems: CartItem[], payWithPoints: boolean): VerifiedTotals {
  const [totals, setTotals] = useState<VerifiedTotals>({
    subtotal: 0,
    shipping: 0,
    tax: 0,
    pointsDiscount: 0,
    total: 0,
    isLoading: true,
    error: null,
  });
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;

    if (cartItems.length === 0) {
      setTotals({ subtotal: 0, shipping: 0, tax: 0, pointsDiscount: 0, total: 0, isLoading: false, error: null });
      return;
    }

    setTotals(prev => ({ ...prev, isLoading: true, error: null }));

    const items = cartItems.map(item => ({ productId: item.id, quantity: item.quantity }));

    (async () => {
      try {
        const { data, error } = await supabase.rpc('calculate_order_total', {
          p_items: items,
          p_pay_with_points: payWithPoints,
        });

        if (cancelledRef.current) return;

        if (error) throw new Error(error.message);

        if (data?.error) throw new Error(data.error);

        setTotals({
          subtotal: data.subtotal,
          shipping: data.shipping,
          tax: data.tax,
          pointsDiscount: data.pointsDiscount,
          total: data.total,
          isLoading: false,
          error: null,
        });
      } catch (err) {
        if (!cancelledRef.current) {
          setTotals(prev => ({ ...prev, isLoading: false, error: (err as Error).message }));
        }
      }
    })();

    return () => {
      cancelledRef.current = true;
    };
  }, [cartItems, payWithPoints]);

  return totals;
}
