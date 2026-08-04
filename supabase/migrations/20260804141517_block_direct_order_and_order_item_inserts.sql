/*
  # Remove the client insert path for orders and order items

  All order creation goes through the create_order_atomic function, which enforces the
  ordering window, stock reservation and points. The direct insert policies let a client
  bypass every one of those, so they are dropped and the INSERT privilege is revoked.
  The SECURITY DEFINER order functions are owned by postgres and are unaffected.
*/

DROP POLICY IF EXISTS "Users can create own orders" ON public.user_orders;
DROP POLICY IF EXISTS "Users can create own order items" ON public.user_order_items;

REVOKE INSERT ON public.user_orders FROM anon, authenticated;
REVOKE INSERT ON public.user_order_items FROM anon, authenticated;
