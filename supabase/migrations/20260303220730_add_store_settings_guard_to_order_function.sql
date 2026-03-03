/*
  # Add store settings guard to create_order_atomic

  1. Changes
    - At the very beginning of create_order_atomic, check the store_settings table
    - If ordering_mode is 'manual' and ordering_enabled is false, reject the order
    - If ordering_mode is 'auto', compute current Stockholm time and check if
      it falls within the configured open window; reject if outside

  2. Purpose
    - Server-side safety net to prevent orders even if frontend checks are bypassed
    - Checks timezone-aware day/time against the admin-configured schedule
    - Works for both automatic and manual ordering modes

  3. Important Notes
    - Uses AT TIME ZONE 'Europe/Stockholm' for correct Swedish time
    - ISODOW returns 1=Monday through 7=Sunday (ISO standard)
    - The rest of the function (stock checks, order insertion) is unchanged
*/

CREATE OR REPLACE FUNCTION create_order_atomic(
  p_user_id UUID,
  p_total NUMERIC,
  p_contact_email TEXT,
  p_contact_phone TEXT,
  p_shipping_address JSONB,
  p_delivery_instructions TEXT DEFAULT NULL,
  p_paid_with_points BOOLEAN DEFAULT FALSE,
  p_points_amount NUMERIC DEFAULT 0,
  p_items JSONB DEFAULT '[]'::JSONB
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
BEGIN
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

      v_open_minutes := (v_open_day - 1) * 1440
        + split_part(v_open_time, ':', 1)::INTEGER * 60
        + split_part(v_open_time, ':', 2)::INTEGER;

      v_close_minutes := (v_close_day - 1) * 1440
        + split_part(v_close_time, ':', 1)::INTEGER * 60
        + split_part(v_close_time, ':', 2)::INTEGER;

      IF v_now_minutes < v_open_minutes OR v_now_minutes >= v_close_minutes THEN
        RAISE EXCEPTION 'Ordering is currently closed';
      END IF;
    END IF;
  END IF;

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

  INSERT INTO user_orders (user_id, total, contact_email, contact_phone, shipping_address, delivery_instructions, paid_with_points, points_amount, status)
  VALUES (p_user_id, p_total, p_contact_email, p_contact_phone, p_shipping_address, p_delivery_instructions, p_paid_with_points, p_points_amount, 'active')
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