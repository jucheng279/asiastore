import { FREE_SHIPPING_THRESHOLD, SHIPPING_FEE, POINTS_DISCOUNT_RATE } from './businessConstants';
import type { CartItem } from '../types';

export function calculateSubtotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export function calculateShipping(subtotal: number): number {
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
}

export function calculatePointsDiscount(totalBeforeDiscount: number): number {
  return totalBeforeDiscount * POINTS_DISCOUNT_RATE;
}

export function calculateTotal(subtotal: number, payWithPoints = false): number {
  const shipping = calculateShipping(subtotal);
  const totalBeforeDiscount = subtotal + shipping;
  const discount = payWithPoints ? calculatePointsDiscount(totalBeforeDiscount) : 0;
  return Math.round((totalBeforeDiscount - discount) * 100) / 100;
}
