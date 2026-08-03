/*
  # Update create_order_atomic to merge into existing active order

  1. Modified Function
    - `create_order_atomic` now checks if the user already has an active order in the
      current ordering window with matching address, phone, email, and payment method.
    - If a matching order exists: merges new items into it (adds quantities for
      duplicate products, appends new products), adjusts stock reservations,
      recalculates the total, handles points, and increments merge_count.
    - If no matching order exists: creates a new order as before.
    - Returns the order ID in both cases (the existing merged order or the new one).

  2. Merge Logic
    - "Critical information" that must match: shipping_address (streetAddress, postalCode, city),
      contact_phone, contact_email, payment_method.
    - When merging, items with the same product_id get their quantities summed.
    - New products are appended as new order items.
    - Stock reservation (preserve) is incremented only by the NEW quantities being added.
    - Points deduction applies to the additional total (if paying with points).
    - merge_count is incremented by 1 on each merge.

  3. Security
    - SECURITY DEFINER unchanged
    - Same ordering-window and stock-availability guards
    - Execution granted to authenticated role

  4. Notes
    - The ordering window calculation uses the same logic as finalize_and_cleanup_orders
    - Address matching uses streetAddress + postalCode + city (case-insensitive, trimmed)
*/

CREATE OR REPLACE FUNCTION create_order_atomic(
  p_user_id UUID,
  p_total NUMERIC,
  p_contact_email TEXT,
  p_contact_phone TEXT,
  p_shipping_address JSONB,
  p_delivery_instructions TEXT,
  p_paid_with_points BOOLEAN,
  p_points_amount NUMERIC,
  p_items JSONB,
  p_payment_method TEXT DEFAULT 'cashOrSwish'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_order_id UUID;
  v_item JSONB;
  v_new_balance NUMERIC;
  v_product_id TEXT;
  v_quantity INTEGER;
  v_current_stock INTEGER;
  v_current_preserve INTEGER;
  v_available INTEGER;
  v_found BOOLEAN;
  v_product_name TEXT;
  v_ordering_mode TEXT;
  v_ordering_enabled BOOLEAN;
  v_open_day INTEGER;
  v_open_time TEXT;
  v_close_day INTEGER;
  v_close_time TEXT;
  v_now_stockholm TIMESTAMP;
  v_now_day INTEGER;
  v_now_minutes INTEGER;
  v_open_minutes INTEGER;
  v_close_minutes INTEGER;
  v_open_h INTEGER;
  v_open_m INTEGER;
  v_close_h INTEGER;
  v_close_m INTEGER;
  v_days_to_open INTEGER;
  v_window_start TIMESTAMPTZ;
  v_window_end TIMESTAMPTZ;
  v_days_span INTEGER;
  v_existing_order_id UUID;
  v_existing_qty INTEGER;
  v_addr_street TEXT;
  v_addr_postal TEXT;
  v_addr_city TEXT;
BEGIN
  -- Store settings and ordering window guard
  SELECT ordering_mode, ordering_enabled, auto_open_day, auto_open_time, auto_close_day, auto_close_time
  INTO v_ordering_mode, v_ordering_enabled, v_open_day, v_open_time, v_close_day, v_close_time
  FROM store_settings
  WHERE id = 1;

  IF v_ordering_mode IS NOT NULL THEN
    IF v_ordering_mode = 'manual' AND NOT v_ordering_enabled THEN
      RAISE EXCEPTION 'Ordering is currently closed';
    END IF;

    IF v_ordering_mode = 'auto' THEN
      v_now_stockholm := now() AT TIME ZONE 'Europe/Stockholm';
      v_now_day := EXTRACT(ISODOW FROM v_now_stockholm)::INTEGER;
      v_now_minutes := (v_now_day - 1) * 1440
        + EXTRACT(HOUR FROM v_now_stockholm)::INTEGER * 60
        + EXTRACT(MINUTE FROM v_now_stockholm)::INTEGER;

      v_open_h := split_part(v_open_time, ':', 1)::INTEGER;
      v_open_m := split_part(v_open_time, ':', 2)::INTEGER;
      v_close_h := split_part(v_close_time, ':', 1)::INTEGER;
      v_close_m := split_part(v_close_time, ':', 2)::INTEGER;

      v_open_minutes := (v_open_day - 1) * 1440 + v_open_h * 60 + v_open_m;
      v_close_minutes := (v_close_day - 1) * 1440 + v_close_h * 60 + v_close_m;

      IF v_close_minutes > v_open_minutes THEN
        IF v_now_minutes < v_open_minutes OR v_now_minutes >= v_close_minutes THEN
          RAISE EXCEPTION 'Ordering is currently closed';
        END IF;
      ELSE
        IF v_now_minutes < v_open_minutes AND v_now_minutes >= v_close_minutes THEN
          RAISE EXCEPTION 'Ordering is currently closed';
        END IF;
      END IF;
    END IF;
  END IF;

  -- Calculate current ordering window boundaries for merge lookup
  IF v_open_day IS NOT NULL THEN
    v_open_h := split_part(v_open_time, ':', 1)::INTEGER;
    v_open_m := split_part(v_open_time, ':', 2)::INTEGER;
    v_close_h := split_part(v_close_time, ':', 1)::INTEGER;
    v_close_m := split_part(v_close_time, ':', 2)::INTEGER;

    v_now_stockholm := now() AT TIME ZONE 'Europe/Stockholm';
    v_now_day := EXTRACT(ISODOW FROM v_now_stockholm)::INTEGER;

    v_days_to_open := v_open_day - v_now_day;
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

    -- Look for an existing active order from this user in the current window with matching details
    v_addr_street := lower(trim(COALESCE(p_shipping_address->>'streetAddress', '')));
    v_addr_postal := lower(trim(COALESCE(p_shipping_address->>'postalCode', '')));
    v_addr_city := lower(trim(COALESCE(p_shipping_address->>'city', '')));

    SELECT id INTO v_existing_order_id
    FROM user_orders
    WHERE user_id = p_user_id
      AND status = 'active'
      AND created_at >= v_window_start
      AND created_at < v_window_end
      AND COALESCE(payment_method, 'cashOrSwish') = COALESCE(p_payment_method, 'cashOrSwish')
      AND lower(trim(COALESCE(contact_phone, ''))) = lower(trim(COALESCE(p_contact_phone, '')))
      AND lower(trim(COALESCE(contact_email, ''))) = lower(trim(COALESCE(p_contact_email, '')))
      AND lower(trim(COALESCE(shipping_address->>'streetAddress', ''))) = v_addr_street
      AND lower(trim(COALESCE(shipping_address->>'postalCode', ''))) = v_addr_postal
      AND lower(trim(COALESCE(shipping_address->>'city', ''))) = v_addr_city
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  -- Points deduction (applies for both new and merge)
  IF p_paid_with_points AND p_points_amount > 0 THEN
    UPDATE user_points
    SET balance = balance - p_points_amount,
        updated_at = now()
    WHERE user_id = p_user_id
    AND balance >= p_points_amount
    RETURNING balance INTO v_new_balance;

    IF v_new_balance IS NULL THEN
      RAISE EXCEPTION 'Insufficient points balance';
    END IF;
  END IF;

  -- Stock reservation for new items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := v_item->>'product_id';
    v_quantity := (v_item->>'quantity')::INTEGER;
    v_found := false;

    SELECT stock, preserve, name_en
    INTO v_current_stock, v_current_preserve, v_product_name
    FROM products WHERE id = v_product_id::UUID
    FOR UPDATE;

    IF FOUND THEN
      v_found := true;
      v_available := v_current_stock - v_current_preserve;
      IF v_available < v_quantity THEN
        RAISE EXCEPTION 'Insufficient stock for product: %', COALESCE(v_product_name, v_product_id);
      END IF;
      UPDATE products SET preserve = preserve + v_quantity WHERE id = v_product_id::UUID;
    END IF;

    IF NOT v_found THEN
      SELECT stock, preserve, name_en
      INTO v_current_stock, v_current_preserve, v_product_name
      FROM expiry_items WHERE id = v_product_id::UUID
      FOR UPDATE;

      IF FOUND THEN
        v_found := true;
        v_available := v_current_stock - v_current_preserve;
        IF v_available < v_quantity THEN
          RAISE EXCEPTION 'Insufficient stock for product: %', COALESCE(v_product_name, v_product_id);
        END IF;
        UPDATE expiry_items SET preserve = preserve + v_quantity WHERE id = v_product_id::UUID;
      END IF;
    END IF;

    IF NOT v_found THEN
      SELECT stock, preserve, name_en
      INTO v_current_stock, v_current_preserve, v_product_name
      FROM flash_sale_items WHERE id = v_product_id::UUID
      FOR UPDATE;

      IF FOUND THEN
        v_found := true;
        v_available := v_current_stock - v_current_preserve;
        IF v_available < v_quantity THEN
          RAISE EXCEPTION 'Insufficient stock for product: %', COALESCE(v_product_name, v_product_id);
        END IF;
        UPDATE flash_sale_items SET preserve = preserve + v_quantity WHERE id = v_product_id::UUID;
      END IF;
    END IF;
  END LOOP;

  -- MERGE PATH: existing order found with matching details
  IF v_existing_order_id IS NOT NULL THEN
    -- Merge items: for each new item, either add quantity to existing or insert new row
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
      v_product_id := v_item->>'product_id';
      v_quantity := (v_item->>'quantity')::INTEGER;

      SELECT quantity INTO v_existing_qty
      FROM user_order_items
      WHERE order_id = v_existing_order_id AND product_id = v_product_id;

      IF FOUND THEN
        UPDATE user_order_items
        SET quantity = quantity + v_quantity
        WHERE order_id = v_existing_order_id AND product_id = v_product_id;
      ELSE
        INSERT INTO user_order_items (order_id, product_id, name, image, price, quantity)
        VALUES (
          v_existing_order_id,
          v_product_id,
          v_item->>'name',
          v_item->>'image',
          (v_item->>'price')::NUMERIC,
          v_quantity
        );
      END IF;
    END LOOP;

    -- Update totals and merge_count on the existing order
    UPDATE user_orders
    SET total = total + p_total,
        merge_count = merge_count + 1,
        delivery_instructions = COALESCE(NULLIF(p_delivery_instructions, ''), delivery_instructions),
        points_amount = CASE WHEN p_paid_with_points THEN COALESCE(points_amount, 0) + COALESCE(p_points_amount, 0) ELSE points_amount END
    WHERE id = v_existing_order_id;

    RETURN v_existing_order_id;
  END IF;

  -- NEW ORDER PATH: no matching existing order
  INSERT INTO user_orders (user_id, total, contact_email, contact_phone, shipping_address, delivery_instructions, paid_with_points, points_amount, status, payment_method, merge_count)
  VALUES (p_user_id, p_total, p_contact_email, p_contact_phone, p_shipping_address, p_delivery_instructions, p_paid_with_points, p_points_amount, 'active', COALESCE(p_payment_method, 'cashOrSwish'), 1)
  RETURNING id INTO v_order_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO user_order_items (order_id, product_id, name, image, price, quantity)
    VALUES (
      v_order_id,
      v_item->>'product_id',
      v_item->>'name',
      v_item->>'image',
      (v_item->>'price')::NUMERIC,
      (v_item->>'quantity')::INTEGER
    );
  END LOOP;

  RETURN v_order_id;
END;
$fn$;
