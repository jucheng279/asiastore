/*
  # Fix has_children column reference in add_to_weekly_order

  ## Problem
  The `add_to_weekly_order` function references `has_children` as a column on the
  `products` table, but that column does not exist. It is computed client-side.
  This causes every order attempt to fail with a runtime error.

  ## Fix
  Replace `SELECT has_children INTO v_has_children FROM products WHERE id = ...`
  with a subquery that checks whether any product has `parent_product_id` pointing
  to the given product ID — the same logic the front end uses.

  ## Security
  - Function remains SECURITY DEFINER with search_path = public.
  - Grants unchanged (authenticated only).
*/

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

    -- Check if product is a group container by looking for children
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
