/*
  # Fix Stock Reservation in Weekly Order Functions & Apply Delivery Fee at Finalization

  ## Overview
  The add_to_weekly_order and remove_from_weekly_order functions were missing
  stock reservation (preserve increment/decrement). This meant stock was never
  actually held for active orders, and finalize_and_cleanup_orders would subtract
  zero from stock when the round ended.

  Also updates finalize_and_cleanup_orders to calculate and apply the delivery fee
  (20kr when subtotal < 50kr) to each order's total at round end.

  ## Changes

  1. **add_to_weekly_order** — After upserting each item, increment `preserve` on
     the matching product/expiry_item/flash_sale_item row. Stock availability check
     now correctly uses (stock - preserve) before incrementing.

  2. **remove_from_weekly_order** — After removing/decrementing each item, decrement
     `preserve` (clamped to 0) on the matching row.

  3. **finalize_and_cleanup_orders** — After marking orders completed, recalculate
     each order's total to include delivery fee (20kr if subtotal < 50kr).

  ## Security
  - All functions remain SECURITY DEFINER with search_path = public.
  - Grants unchanged (authenticated only).
*/

-- ============================================================
-- 1. add_to_weekly_order — with preserve tracking
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
  v_current_stock INTEGER;
  v_current_preserve INTEGER;
  v_has_children BOOLEAN;
  v_product_table TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'No items provided';
  END IF;

  SELECT auto_open_day, auto_open_time, auto_close_day, auto_close_time
  INTO v_open_day, v_open_time, v_close_day, v_close_time
  FROM store_settings LIMIT 1;

  IF v_open_day IS NULL THEN
    RAISE EXCEPTION 'Store settings not configured';
  END IF;

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

  SELECT id INTO v_order_id
  FROM user_orders
  WHERE user_id = v_uid
    AND status = 'active'
    AND created_at >= v_window_start
    AND created_at < v_window_end
  FOR UPDATE;

  IF v_order_id IS NULL THEN
    IF p_shipping_address IS NULL OR p_shipping_address = '{}'::jsonb THEN
      RAISE EXCEPTION 'Address required for first order';
    END IF;

    INSERT INTO user_orders (user_id, total, contact_email, contact_phone, shipping_address, delivery_instructions, payment_method)
    VALUES (v_uid, 0, COALESCE(p_contact_email, ''), COALESCE(p_contact_phone, ''), p_shipping_address, p_delivery_instructions, '')
    RETURNING id INTO v_order_id;
  END IF;

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

    SELECT EXISTS(
      SELECT 1 FROM products WHERE parent_product_id = v_pid::uuid
    ) INTO v_has_children;
    IF v_has_children IS TRUE THEN
      RAISE EXCEPTION 'Cannot order group products directly';
    END IF;

    -- Server-side price lookup
    v_found := false;
    v_unit_price := NULL;
    v_product_table := NULL;

    SELECT p.price, p.sale_price, p.stock, p.preserve
    INTO v_price, v_sale_price, v_current_stock, v_current_preserve
    FROM products p WHERE p.id = v_pid::uuid;

    IF FOUND THEN
      v_found := true;
      v_product_table := 'products';
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
      SELECT e.price, e.sale_price, e.stock, e.preserve
      INTO v_price, v_sale_price, v_current_stock, v_current_preserve
      FROM expiry_items e WHERE e.id = v_pid::uuid;

      IF FOUND THEN
        v_found := true;
        v_product_table := 'expiry_items';
        IF v_sale_price IS NOT NULL AND v_sale_price < v_price THEN
          v_unit_price := v_sale_price;
        ELSE
          v_unit_price := v_price;
        END IF;
      END IF;
    END IF;

    IF NOT v_found THEN
      SELECT fsi.price, fsi.sale_price, fsi.flash_days, fsi.flash_start_date, fsi.stock, fsi.preserve
      INTO v_price, v_sale_price, v_flash_days, v_flash_start, v_current_stock, v_current_preserve
      FROM flash_sale_items fsi WHERE fsi.id = v_pid::uuid;

      IF FOUND THEN
        v_found := true;
        v_product_table := 'flash_sale_items';
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

    -- Check existing qty in order for this item
    SELECT quantity INTO v_existing_qty
    FROM user_order_items
    WHERE order_id = v_order_id AND product_id = v_pid;

    -- Calculate available stock: stock - preserve
    v_avail_stock := v_current_stock - COALESCE(v_current_preserve, 0);

    IF v_existing_qty IS NOT NULL THEN
      IF v_avail_stock IS NOT NULL AND v_qty > v_avail_stock THEN
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

    -- Reserve stock: increment preserve
    IF v_product_table = 'products' THEN
      UPDATE products SET preserve = COALESCE(preserve, 0) + v_qty WHERE id = v_pid::uuid;
    ELSIF v_product_table = 'expiry_items' THEN
      UPDATE expiry_items SET preserve = COALESCE(preserve, 0) + v_qty WHERE id = v_pid::uuid;
    ELSIF v_product_table = 'flash_sale_items' THEN
      UPDATE flash_sale_items SET preserve = COALESCE(preserve, 0) + v_qty WHERE id = v_pid::uuid;
    END IF;
  END LOOP;

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
-- 2. remove_from_weekly_order — with preserve tracking
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
  v_remove_qty INTEGER;
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

  SELECT auto_open_day, auto_open_time, auto_close_day, auto_close_time
  INTO v_open_day, v_open_time, v_close_day, v_close_time
  FROM store_settings LIMIT 1;

  IF v_open_day IS NULL THEN
    RAISE EXCEPTION 'Store settings not configured';
  END IF;

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

  SELECT quantity INTO v_existing_qty
  FROM user_order_items
  WHERE order_id = v_order_id AND product_id = p_product_id;

  IF v_existing_qty IS NULL THEN
    RAISE EXCEPTION 'Item not in order';
  END IF;

  IF p_quantity IS NULL OR p_quantity >= v_existing_qty THEN
    v_remove_qty := v_existing_qty;
    DELETE FROM user_order_items
    WHERE order_id = v_order_id AND product_id = p_product_id;
  ELSE
    v_remove_qty := p_quantity;
    v_new_qty := v_existing_qty - p_quantity;
    UPDATE user_order_items
    SET quantity = v_new_qty
    WHERE order_id = v_order_id AND product_id = p_product_id;
  END IF;

  -- Release reserved stock: decrement preserve
  UPDATE products SET preserve = GREATEST(0, preserve - v_remove_qty)
  WHERE id = p_product_id::uuid;

  UPDATE expiry_items SET preserve = GREATEST(0, preserve - v_remove_qty)
  WHERE id = p_product_id::uuid;

  UPDATE flash_sale_items SET preserve = GREATEST(0, preserve - v_remove_qty)
  WHERE id = p_product_id::uuid;

  SELECT COUNT(*) INTO v_items_remaining
  FROM user_order_items WHERE order_id = v_order_id;

  IF v_items_remaining = 0 THEN
    UPDATE user_orders SET status = 'cancelled' WHERE id = v_order_id;
    RETURN jsonb_build_object('order_id', v_order_id, 'subtotal', 0, 'cancelled', true);
  END IF;

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
-- 3. finalize_and_cleanup_orders — apply delivery fee at round end
-- ============================================================
CREATE OR REPLACE FUNCTION finalize_and_cleanup_orders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_open_day INTEGER;
  v_open_time TEXT;
  v_close_day INTEGER;
  v_close_time TEXT;
  v_now_stockholm TIMESTAMP;
  v_now_ts TIMESTAMPTZ;
  v_current_iso_day INTEGER;
  v_days_to_open INTEGER;
  v_window_start TIMESTAMPTZ;
  v_window_end TIMESTAMPTZ;
  v_days_span INTEGER;
  v_open_h INTEGER;
  v_open_m INTEGER;
  v_close_h INTEGER;
  v_close_m INTEGER;
  v_has_active BOOLEAN;
  v_item RECORD;
  v_window_rec RECORD;
  v_kept_count INTEGER;
  v_order_rec RECORD;
  v_subtotal NUMERIC;
  v_delivery_fee NUMERIC;
BEGIN
  SELECT auto_open_day, auto_open_time, auto_close_day, auto_close_time
  INTO v_open_day, v_open_time, v_close_day, v_close_time
  FROM store_settings
  WHERE id = 1;

  IF v_open_day IS NULL THEN
    RETURN;
  END IF;

  v_open_h := split_part(v_open_time, ':', 1)::INTEGER;
  v_open_m := split_part(v_open_time, ':', 2)::INTEGER;
  v_close_h := split_part(v_close_time, ':', 1)::INTEGER;
  v_close_m := split_part(v_close_time, ':', 2)::INTEGER;

  v_now_stockholm := now() AT TIME ZONE 'Europe/Stockholm';
  v_current_iso_day := EXTRACT(ISODOW FROM v_now_stockholm)::INTEGER;

  v_days_to_open := v_open_day - v_current_iso_day;
  IF v_days_to_open > 0 THEN
    v_days_to_open := v_days_to_open - 7;
  END IF;

  v_window_start := (date_trunc('day', v_now_stockholm) + (v_days_to_open || ' days')::INTERVAL
    + (v_open_h || ' hours')::INTERVAL + (v_open_m || ' minutes')::INTERVAL)
    AT TIME ZONE 'Europe/Stockholm';

  IF v_window_start > now() THEN
    v_window_start := v_window_start - INTERVAL '7 days';
  END IF;

  v_days_span := v_close_day - v_open_day;
  IF v_days_span <= 0 THEN
    v_days_span := v_days_span + 7;
  END IF;

  v_window_end := v_window_start + (v_days_span || ' days')::INTERVAL
    - (v_open_h || ' hours')::INTERVAL - (v_open_m || ' minutes')::INTERVAL
    + (v_close_h || ' hours')::INTERVAL + (v_close_m || ' minutes')::INTERVAL;

  -- STOCK FINALIZATION
  FOR i IN 0..3 LOOP
    DECLARE
      v_check_start TIMESTAMPTZ;
      v_check_end TIMESTAMPTZ;
    BEGIN
      v_check_start := v_window_start - (i * INTERVAL '7 days');
      v_check_end := v_window_end - (i * INTERVAL '7 days');

      IF v_check_end >= now() THEN
        CONTINUE;
      END IF;

      SELECT EXISTS(
        SELECT 1 FROM user_orders
        WHERE status = 'active'
          AND created_at >= v_check_start
          AND created_at < v_check_end
      ) INTO v_has_active;

      IF v_has_active THEN
        UPDATE products
        SET stock = stock - preserve, preserve = 0
        WHERE preserve > 0;

        UPDATE expiry_items
        SET stock = stock - preserve, preserve = 0
        WHERE preserve > 0;

        UPDATE flash_sale_items
        SET stock = stock - preserve, preserve = 0
        WHERE preserve > 0;

        -- Apply delivery fee and finalize total for each active order
        FOR v_order_rec IN
          SELECT id FROM user_orders
          WHERE status = 'active'
            AND created_at >= v_check_start
            AND created_at < v_check_end
        LOOP
          SELECT COALESCE(SUM(price * quantity), 0) INTO v_subtotal
          FROM user_order_items WHERE order_id = v_order_rec.id;

          IF v_subtotal < 50 THEN
            v_delivery_fee := 20;
          ELSE
            v_delivery_fee := 0;
          END IF;

          UPDATE user_orders
          SET total = v_subtotal + v_delivery_fee,
              status = 'completed'
          WHERE id = v_order_rec.id;
        END LOOP;
      END IF;
    END;
  END LOOP;

  -- CLEANUP: Keep only 2 most recent windows that contain orders
  v_kept_count := 0;
  FOR v_window_rec IN
    SELECT DISTINCT
      date_trunc('week', created_at - ((v_open_day - 1) || ' days')::INTERVAL) AS window_week
    FROM user_orders
    ORDER BY window_week DESC
  LOOP
    v_kept_count := v_kept_count + 1;
    IF v_kept_count > 2 THEN
      DELETE FROM user_orders
      WHERE date_trunc('week', created_at - ((v_open_day - 1) || ' days')::INTERVAL) = v_window_rec.window_week;
    END IF;
  END LOOP;
END;
$fn$;

GRANT EXECUTE ON FUNCTION finalize_and_cleanup_orders() TO authenticated;
