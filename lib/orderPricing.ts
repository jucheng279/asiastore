import { calculateSubtotal, calculateShipping, calculateTotal, calculatePointsDiscount } from './pricing';
import type { CartItem } from '../types';

export { calculateSubtotal, calculateShipping, calculateTotal, calculatePointsDiscount };

export function getOrderSummary(cartItems: CartItem[], payWithPoints = false) {
  const subtotal = calculateSubtotal(cartItems);
  const shipping = calculateShipping(subtotal);
  const totalBeforeDiscount = subtotal + shipping;
  const pointsDiscount = payWithPoints ? calculatePointsDiscount(totalBeforeDiscount) : 0;
  const total = calculateTotal(subtotal, payWithPoints);
  return { subtotal, shipping, pointsDiscount, total, itemCount: cartItems.reduce((s, i) => s + i.quantity, 0) };
}
