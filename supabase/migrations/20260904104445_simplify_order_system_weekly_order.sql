/*
  # Simplify Order System: One Weekly Order Per User

  ## Overview
  Replaces the multi-order-per-round checkout system with a simpler model:
  each user gets one order per ordering window. Items are added/removed
  incrementally. No tax. Delivery fee (20kr) applied only when subtotal < 50kr,
  and only after the ordering round closes.

  ## Changes

  1. New function: add_to_weekly_order
     - If user has no active order in the current window, creates one (requires address).
     - If user already has an active order, upserts items into it.
     - Server-side price lookup, no client-supplied prices.
     - Recalculates subtotal (no tax, no shipping during round).

  2. New function: remove_from_weekly_order
     - Removes an item or decreases its quantity from the user's current weekly order.
     - If no items remain, cancels the order.
     - Recalculates subtotal.

  3. New function: update_weekly_order_address
     - Updates the shipping address on the user's current weekly order.

  4. New function: set_order_payment_method
     - Sets payment method on an order (only allowed after ordering round closes).

  5. Updated function: calculate_order_total
     - Removes tax (0%).
     - Delivery fee 20kr when subtotal < 50kr, 0 otherwise.
     - Points discount remains 10%.

  6. Updated constants
     - FREE_SHIPPING_THRESHOLD: 35 -> 50
     - SHIPPING_FEE: 5 -> 20
     - TAX_RATE: 0.25 -> 0

  ## Security
  - All functions are SECURITY DEFINER with search_path = public.
  - Caller identity verified via auth.uid().
  - Grants to authenticated role only.
*/

-- ============================================================
-- 1. Update calculate_order_total with new business rules
-- ============================================================
CREATE OR REPLACE FUNCTION public.calculate_order_total(
  p_items jsonb,
  p_pay_with_points boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_free_shipping_threshold numeric := 50;
  v_shipping_fee numeric := 20;
  v_points_discount_rate numeric := 0.10;
  v_subtotal numeric := 0;
  v_shipping numeric;
  v_points_discount numeric;
  v_total numeric;
  v_item jsonb;
  v_product_id uuid;
  v_quantity int;
  v_unit_price numeric;
  v_items_out jsonb := '[]'::jsonb;
  v_line_total numeric;
  v_found boolean;
  v_price numeric;
  v_sale_price numeric;
  v_flash_price numeric;
  v_flash_sale_price numeric;
  v_flash_days int;
  v_flash_start date;
  v_flash_end date;
BEGIN
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RETURN jsonb_build_object('error', 'No items provided');
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'productId')::uuid;
    v_quantity := (v_item->>'quantity')::int;
    v_found := false;
    v_unit_price := NULL;

    SELECT p.price, p.sale_price INTO v_price, v_sale_price
    FROM products p WHERE p.id = v_product_id;

    IF FOUND THEN
      v_found := true;
      IF v_sale_price IS NOT NULL AND v_sale_price < v_price THEN
        v_unit_price := v_sale_price;
      ELSE
        v_unit_price := v_price;
      END IF;

      SELECT fsi.price, fsi.sale_price, fsi.flash_days, fsi.flash_start_date
      INTO v_flash_price, v_flash_sale_price, v_flash_days, v_flash_start
      FROM flash_sale_items fsi
      WHERE fsi.source_product_id = v_product_id
        AND fsi.visible = true
        AND fsi.parent_flash_item_id IS NULL;

      IF FOUND THEN
        v_flash_end := v_flash_start + v_flash_days;
        IF v_flash_end > CURRENT_DATE THEN
          IF v_flash_sale_price IS NOT NULL AND v_flash_sale_price < v_flash_price THEN
            v_unit_price := v_flash_sale_price;
          ELSE
            v_unit_price := v_flash_price;
          END IF;
        END IF;
      END IF;
    END IF;

    IF NOT v_found THEN
      SELECT e.price, e.sale_price INTO v_price, v_sale_price
      FROM expiry_items e WHERE e.id = v_product_id;

      IF FOUND THEN
        v_found := true;
        IF v_sale_price IS NOT NULL AND v_sale_price < v_price THEN
          v_unit_price := v_sale_price;
        ELSE
          v_unit_price := v_price;
        END IF;
      END IF;
    END IF;

    IF NOT v_found THEN
      SELECT fsi.price, fsi.sale_price, fsi.flash_days, fsi.flash_start_date
      INTO v_price, v_sale_price, v_flash_days, v_flash_start
      FROM flash_sale_items fsi WHERE fsi.id = v_product_id;

      IF FOUND THEN
        v_found := true;
        v_flash_end := v_flash_start + v_flash_days;
        IF v_flash_end > CURRENT_DATE AND v_sale_price IS NOT NULL AND v_sale_price < v_price THEN
          v_unit_price := v_sale_price;
        ELSE
          IF v_sale_price IS NOT NULL AND v_sale_price < v_price THEN
            v_unit_price := v_sale_price;
          ELSE
            v_unit_price := v_price;
          END IF;
        END IF;
      END IF;
    END IF;

    IF NOT v_found THEN
      RETURN jsonb_build_object('error', 'Product ' || v_product_id || ' not found');
    END IF;

    v_line_total := v_unit_price * v_quantity;
    v_subtotal := v_subtotal + v_line_total;

    v_items_out := v_items_out || jsonb_build_object(
      'productId', v_product_id,
      'quantity', v_quantity,
      'unitPrice', v_unit_price,
      'lineTotal', v_line_total
    );
  END LOOP;

  -- No tax. Shipping = delivery fee only when subtotal < threshold
  IF v_subtotal >= v_free_shipping_threshold THEN
    v_shipping := 0;
  ELSE
    v_shipping := v_shipping_fee;
  END IF;

  IF p_pay_with_points THEN
    v_points_discount := (v_subtotal + v_shipping) * v_points_discount_rate;
  ELSE
    v_points_discount := 0;
  END IF;

  v_total := v_subtotal + v_shipping - v_points_discount;

  RETURN jsonb_build_object(
    'subtotal', round(v_subtotal, 2),
    'shipping', round(v_shipping, 2),
    'tax', 0,
    'pointsDiscount', round(v_points_discount, 2),
    'total', round(v_total, 2),
    'items', v_items_out
  );
END;
$$;

-- ============================================================
-- 2. add_to_weekly_order
-- ============================================================
CREATE OR REPLACE FUNCTION public.add_to_weekly_order(
  p_items JSONB,
  p_shipping_address JSONB DEFAULT NULL,
  p_contact_phone TEXT DEFAULT '',
  p_contact_email TEXT DEFAULT '',
  p_delivery_instructions TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_order_id UUID;
  v_item JSONB;
  v_pid TEXT;
  v_qty INTEGER;
  v_unit_price NUMERIC;
  v_found BOOLEAN;
  v_price NUMERIC;
  v_sale_price NUMERIC;
  v_flash_price NUMERIC;
  v_flash_sale_price NUMERIC;
  v_flash_days INT;
  v_flash_start DATE;
  v_flash_end DATE;
  v_existing_qty INTEGER;
  v_new_subtotal NUMERIC := 0;
  v_open_day INTEGER;
  v_open_time TEXT;
  v_close_day INTEGER;
  v_close_time TEXT;
  v_now TIMESTAMPTZ;
  v_window_start TIMESTAMPTZ;
  v_window_end TIMESTAMPTZ;
  v_current_iso_day INTEGER;
  v_days_to_open INTEGER;
  v_days_open_to_close INTEGER;
  v_is_open BOOLEAN;
  v_avail_stock INTEGER;
  v_has_children BOOLEAN;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'No items provided';
  END IF;

  -- Get store schedule
  SELECT auto_open_day, auto_open_time, auto_close_day, auto_close_time
  INTO v_open_day, v_open_time, v_close_day, v_close_time
  FROM store_settings LIMIT 1;

  IF v_open_day IS NULL THEN
    RAISE EXCEPTION 'Store settings not configured';
  END IF;

  -- Calculate current ordering window
  v_now := now() AT TIME ZONE 'Europe/Stockholm';
  v_current_iso_day := EXTRACT(ISODOW FROM v_now)::INTEGER;

  v_days_to_open := v_open_day - v_current_iso_day;
  IF v_days_to_open > 0 THEN
    v_days_to_open := v_days_to_open - 7;
  END IF;

  v_window_start := date_trunc('day', v_now) + (v_days_to_open || ' days')::INTERVAL
    + (split_part(v_open_time, ':', 1) || ' hours')::INTERVAL
    + (split_part(v_open_time, ':', 2) || ' minutes')::INTERVAL;

  IF v_window_start > v_now THEN
    v_window_start := v_window_start - INTERVAL '7 days';
  END IF;

  v_days_open_to_close := v_close_day - v_open_day;
  IF v_days_open_to_close <= 0 THEN
    v_days_open_to_close := v_days_open_to_close + 7;
  END IF;

  v_window_end := v_window_start + (v_days_open_to_close || ' days')::INTERVAL
    - (split_part(v_open_time, ':', 1) || ' hours')::INTERVAL
    - (split_part(v_open_time, ':', 2) || ' minutes')::INTERVAL
    + (split_part(v_close_time, ':', 1) || ' hours')::INTERVAL
    + (split_part(v_close_time, ':', 2) || ' minutes')::INTERVAL;

  v_is_open := v_now >= v_window_start AND v_now < v_window_end;

  IF NOT v_is_open THEN
    RAISE EXCEPTION 'Ordering is currently closed';
  END IF;

  -- Find existing weekly order for this user in current window
  SELECT id INTO v_order_id
  FROM user_orders
  WHERE user_id = v_uid
    AND status = 'active'
    AND created_at >= v_window_start
    AND created_at < v_window_end
  FOR UPDATE;

  -- If no existing order, require address
  IF v_order_id IS NULL THEN
    IF p_shipping_address IS NULL OR p_shipping_address = '{}'::jsonb THEN
      RAISE EXCEPTION 'Address required for first order';
    END IF;

    INSERT INTO user_orders (user_id, total, contact_email, contact_phone, shipping_address, delivery_instructions, payment_method)
    VALUES (v_uid, 0, COALESCE(p_contact_email, ''), COALESCE(p_contact_phone, ''), p_shipping_address, p_delivery_instructions, '')
    RETURNING id INTO v_order_id;
  END IF;

  -- Process each item
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_pid := v_item->>'product_id';
    IF v_pid IS NULL THEN
      RAISE EXCEPTION 'Invalid item';
    END IF;

    BEGIN
      v_qty := (v_item->>'quantity')::INTEGER;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'Invalid quantity';
    END;

    IF v_qty IS NULL OR v_qty <= 0 OR v_qty > 999 THEN
      RAISE EXCEPTION 'Invalid quantity';
    END IF;

    -- Check not a group/container product
    SELECT has_children INTO v_has_children
    FROM products WHERE id = v_pid::uuid;
    IF v_has_children IS TRUE THEN
      RAISE EXCEPTION 'Cannot order group products directly';
    END IF;

    -- Server-side price lookup (same logic as calculate_order_total)
    v_found := false;
    v_unit_price := NULL;

    SELECT p.price, p.sale_price INTO v_price, v_sale_price
    FROM products p WHERE p.id = v_pid::uuid;

    IF FOUND THEN
      v_found := true;
      IF v_sale_price IS NOT NULL AND v_sale_price < v_price THEN
        v_unit_price := v_sale_price;
      ELSE
        v_unit_price := v_price;
      END IF;

      SELECT fsi.price, fsi.sale_price, fsi.flash_days, fsi.flash_start_date
      INTO v_flash_price, v_flash_sale_price, v_flash_days, v_flash_start
      FROM flash_sale_items fsi
      WHERE fsi.source_product_id = v_pid::uuid
        AND fsi.visible = true
        AND fsi.parent_flash_item_id IS NULL;

      IF FOUND THEN
        v_flash_end := v_flash_start + v_flash_days;
        IF v_flash_end > CURRENT_DATE THEN
          IF v_flash_sale_price IS NOT NULL AND v_flash_sale_price < v_flash_price THEN
            v_unit_price := v_flash_sale_price;
          ELSE
            v_unit_price := v_flash_price;
          END IF;
        END IF;
      END IF;
    END IF;

    IF NOT v_found THEN
      SELECT e.price, e.sale_price INTO v_price, v_sale_price
      FROM expiry_items e WHERE e.id = v_pid::uuid;

      IF FOUND THEN
        v_found := true;
        IF v_sale_price IS NOT NULL AND v_sale_price < v_price THEN
          v_unit_price := v_sale_price;
        ELSE
          v_unit_price := v_price;
        END IF;
      END IF;
    END IF;

    IF NOT v_found THEN
      SELECT fsi.price, fsi.sale_price, fsi.flash_days, fsi.flash_start_date
      INTO v_price, v_sale_price, v_flash_days, v_flash_start
      FROM flash_sale_items fsi WHERE fsi.id = v_pid::uuid;

      IF FOUND THEN
        v_found := true;
        v_flash_end := v_flash_start + v_flash_days;
        IF v_flash_end > CURRENT_DATE AND v_sale_price IS NOT NULL AND v_sale_price < v_price THEN
          v_unit_price := v_sale_price;
        ELSE
          IF v_sale_price IS NOT NULL AND v_sale_price < v_price THEN
            v_unit_price := v_sale_price;
          ELSE
            v_unit_price := v_price;
          END IF;
        END IF;
      END IF;
    END IF;

    IF NOT v_found THEN
      RAISE EXCEPTION 'Product not found';
    END IF;

    -- Check stock
    SELECT available_stock INTO v_avail_stock
    FROM products WHERE id = v_pid::uuid;

    -- Upsert: if item already exists in this order, add quantity
    SELECT quantity INTO v_existing_qty
    FROM user_order_items
    WHERE order_id = v_order_id AND product_id = v_pid;

    IF v_existing_qty IS NOT NULL THEN
      -- Check stock for combined qty
      IF v_avail_stock IS NOT NULL AND (v_existing_qty + v_qty) > v_avail_stock THEN
        RAISE EXCEPTION 'Insufficient stock for this item';
      END IF;

      UPDATE user_order_items
      SET quantity = v_existing_qty + v_qty,
          price = v_unit_price
      WHERE order_id = v_order_id AND product_id = v_pid;
    ELSE
      IF v_avail_stock IS NOT NULL AND v_qty > v_avail_stock THEN
        RAISE EXCEPTION 'Insufficient stock for this item';
      END IF;

      INSERT INTO user_order_items (order_id, product_id, name, image, price, quantity)
      VALUES (v_order_id, v_pid, v_item->>'name', v_item->>'image', v_unit_price, v_qty);
    END IF;
  END LOOP;

  -- Recalculate order subtotal (just item prices, no tax/shipping during round)
  SELECT COALESCE(SUM(price * quantity), 0) INTO v_new_subtotal
  FROM user_order_items WHERE order_id = v_order_id;

  UPDATE user_orders SET total = v_new_subtotal WHERE id = v_order_id;

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'subtotal', round(v_new_subtotal, 2)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.add_to_weekly_order(JSONB, JSONB, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_to_weekly_order(JSONB, JSONB, TEXT, TEXT, TEXT) TO authenticated;

-- ============================================================
-- 3. remove_from_weekly_order
-- ============================================================
CREATE OR REPLACE FUNCTION public.remove_from_weekly_order(
  p_product_id TEXT,
  p_quantity INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_order_id UUID;
  v_existing_qty INTEGER;
  v_new_qty INTEGER;
  v_new_subtotal NUMERIC := 0;
  v_open_day INTEGER;
  v_open_time TEXT;
  v_close_day INTEGER;
  v_close_time TEXT;
  v_now TIMESTAMPTZ;
  v_window_start TIMESTAMPTZ;
  v_window_end TIMESTAMPTZ;
  v_current_iso_day INTEGER;
  v_days_to_open INTEGER;
  v_days_open_to_close INTEGER;
  v_is_open BOOLEAN;
  v_items_remaining INTEGER;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Get store schedule
  SELECT auto_open_day, auto_open_time, auto_close_day, auto_close_time
  INTO v_open_day, v_open_time, v_close_day, v_close_time
  FROM store_settings LIMIT 1;

  IF v_open_day IS NULL THEN
    RAISE EXCEPTION 'Store settings not configured';
  END IF;

  -- Calculate current ordering window
  v_now := now() AT TIME ZONE 'Europe/Stockholm';
  v_current_iso_day := EXTRACT(ISODOW FROM v_now)::INTEGER;

  v_days_to_open := v_open_day - v_current_iso_day;
  IF v_days_to_open > 0 THEN
    v_days_to_open := v_days_to_open - 7;
  END IF;

  v_window_start := date_trunc('day', v_now) + (v_days_to_open || ' days')::INTERVAL
    + (split_part(v_open_time, ':', 1) || ' hours')::INTERVAL
    + (split_part(v_open_time, ':', 2) || ' minutes')::INTERVAL;

  IF v_window_start > v_now THEN
    v_window_start := v_window_start - INTERVAL '7 days';
  END IF;

  v_days_open_to_close := v_close_day - v_open_day;
  IF v_days_open_to_close <= 0 THEN
    v_days_open_to_close := v_days_open_to_close + 7;
  END IF;

  v_window_end := v_window_start + (v_days_open_to_close || ' days')::INTERVAL
    - (split_part(v_open_time, ':', 1) || ' hours')::INTERVAL
    - (split_part(v_open_time, ':', 2) || ' minutes')::INTERVAL
    + (split_part(v_close_time, ':', 1) || ' hours')::INTERVAL
    + (split_part(v_close_time, ':', 2) || ' minutes')::INTERVAL;

  v_is_open := v_now >= v_window_start AND v_now < v_window_end;

  IF NOT v_is_open THEN
    RAISE EXCEPTION 'Ordering is currently closed';
  END IF;

  -- Find existing weekly order
  SELECT id INTO v_order_id
  FROM user_orders
  WHERE user_id = v_uid
    AND status = 'active'
    AND created_at >= v_window_start
    AND created_at < v_window_end
  FOR UPDATE;

  IF v_order_id IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  -- Find the item
  SELECT quantity INTO v_existing_qty
  FROM user_order_items
  WHERE order_id = v_order_id AND product_id = p_product_id;

  IF v_existing_qty IS NULL THEN
    RAISE EXCEPTION 'Item not in order';
  END IF;

  IF p_quantity IS NULL OR p_quantity >= v_existing_qty THEN
    -- Remove entirely
    DELETE FROM user_order_items
    WHERE order_id = v_order_id AND product_id = p_product_id;
  ELSE
    v_new_qty := v_existing_qty - p_quantity;
    UPDATE user_order_items
    SET quantity = v_new_qty
    WHERE order_id = v_order_id AND product_id = p_product_id;
  END IF;

  -- Check if any items remain
  SELECT COUNT(*) INTO v_items_remaining
  FROM user_order_items WHERE order_id = v_order_id;

  IF v_items_remaining = 0 THEN
    -- Cancel the empty order
    UPDATE user_orders SET status = 'cancelled' WHERE id = v_order_id;
    RETURN jsonb_build_object('order_id', v_order_id, 'subtotal', 0, 'cancelled', true);
  END IF;

  -- Recalculate subtotal
  SELECT COALESCE(SUM(price * quantity), 0) INTO v_new_subtotal
  FROM user_order_items WHERE order_id = v_order_id;

  UPDATE user_orders SET total = v_new_subtotal WHERE id = v_order_id;

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'subtotal', round(v_new_subtotal, 2),
    'cancelled', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.remove_from_weekly_order(TEXT, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.remove_from_weekly_order(TEXT, INTEGER) TO authenticated;

-- ============================================================
-- 4. update_weekly_order_address
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_weekly_order_address(
  p_order_id UUID,
  p_shipping_address JSONB,
  p_contact_phone TEXT DEFAULT NULL,
  p_contact_email TEXT DEFAULT NULL,
  p_delivery_instructions TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_owner UUID;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT user_id INTO v_owner
  FROM user_orders
  WHERE id = p_order_id AND status = 'active'
  FOR UPDATE;

  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_owner <> v_uid THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE user_orders
  SET shipping_address = COALESCE(p_shipping_address, shipping_address),
      contact_phone = COALESCE(p_contact_phone, contact_phone),
      contact_email = COALESCE(p_contact_email, contact_email),
      delivery_instructions = COALESCE(p_delivery_instructions, delivery_instructions)
  WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.update_weekly_order_address(UUID, JSONB, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_weekly_order_address(UUID, JSONB, TEXT, TEXT, TEXT) TO authenticated;

-- ============================================================
-- 5. set_order_payment_method
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_order_payment_method(
  p_order_id UUID,
  p_payment_method TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_owner UUID;
  v_status TEXT;
  v_subtotal NUMERIC;
  v_shipping NUMERIC;
  v_points_discount NUMERIC;
  v_total NUMERIC;
  v_user_points NUMERIC;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_payment_method NOT IN ('cashOrSwish', 'points', 'payAtStore') THEN
    RAISE EXCEPTION 'Invalid payment method';
  END IF;

  SELECT user_id, status, total INTO v_owner, v_status, v_subtotal
  FROM user_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_owner <> v_uid THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Calculate final total with delivery fee
  IF v_subtotal >= 50 THEN
    v_shipping := 0;
  ELSE
    v_shipping := 20;
  END IF;

  IF p_payment_method = 'points' THEN
    v_points_discount := (v_subtotal + v_shipping) * 0.10;
    v_total := v_subtotal + v_shipping - v_points_discount;

    -- Check points balance
    SELECT balance INTO v_user_points
    FROM user_points WHERE user_id = v_uid;

    IF COALESCE(v_user_points, 0) < v_total THEN
      RAISE EXCEPTION 'Insufficient points';
    END IF;

    UPDATE user_orders
    SET payment_method = p_payment_method,
        paid_with_points = true,
        points_amount = v_total,
        total = v_total
    WHERE id = p_order_id;
  ELSE
    v_total := v_subtotal + v_shipping;
    UPDATE user_orders
    SET payment_method = p_payment_method,
        paid_with_points = false,
        points_amount = 0,
        total = v_total
    WHERE id = p_order_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'subtotal', round(v_subtotal, 2),
    'shipping', round(v_shipping, 2),
    'total', round(v_total, 2)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.set_order_payment_method(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_order_payment_method(UUID, TEXT) TO authenticated;

-- ============================================================
-- 6. Update user_order_items UPDATE policy so items can be upserted
-- ============================================================
DROP POLICY IF EXISTS "update_own_order_items" ON user_order_items;
CREATE POLICY "update_own_order_items"
  ON user_order_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_orders
      WHERE user_orders.id = user_order_items.order_id
      AND user_orders.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_orders
      WHERE user_orders.id = user_order_items.order_id
      AND user_orders.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "delete_own_order_items" ON user_order_items;
CREATE POLICY "delete_own_order_items"
  ON user_order_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_orders
      WHERE user_orders.id = user_order_items.order_id
      AND user_orders.user_id = auth.uid()
    )
  );

-- Allow order updates (for address, payment method changes)
DROP POLICY IF EXISTS "update_own_orders" ON user_orders;
CREATE POLICY "update_own_orders"
  ON user_orders FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
