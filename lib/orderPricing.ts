import { calculateSubtotal, calculateShipping, calculateTax, calculateTotal, calculatePointsDiscount } from './pricing';
import type { CartItem } from '../types';

export { calculateSubtotal, calculateShipping, calculateTax, calculateTotal, calculatePointsDiscount };

export function getOrderSummary(cartItems: CartItem[], payWithPoints = false) {
  const subtotal = calculateSubtotal(cartItems);
  const shipping = calculateShipping(subtotal);
  const tax = calculateTax(subtotal);
  const totalBeforeDiscount = subtotal + shipping + tax;
  const pointsDiscount = payWithPoints ? calculatePointsDiscount(totalBeforeDiscount) : 0;
  const total = calculateTotal(subtotal, payWithPoints);
  return { subtotal, shipping, tax, pointsDiscount, total, itemCount: cartItems.reduce((s, i) => s + i.quantity, 0) };
}
