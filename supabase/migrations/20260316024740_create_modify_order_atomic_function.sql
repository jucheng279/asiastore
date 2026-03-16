/*
  # Create modify_order_atomic Function

  1. New Function
    - `modify_order_atomic(p_user_id UUID, p_order_id UUID, p_items JSONB)`
      - Modifies an existing active order's items and recalculates the total
      - p_items is a JSON array of {product_id, name, image, price, quantity} representing the desired final state
      - Items with quantity=0 are removed from the order
      - New items (not previously in the order) are added
      - Stock reservations (preserve) are adjusted by delta for each item
      - Order total is recalculated server-side using current prices
      - Points are refunded/deducted if the order was paid with points
      - If all items are removed, the order is cancelled via the existing cancel flow

  2. Security
    - SECURITY DEFINER for transactional integrity
    - Validates order ownership (user_id match)
    - Same ordering-window guard as cancel_order_atomic
    - Row-level locking (FOR UPDATE) on product lookups

  3. Business Rules
    - Tax rate: 25%
    - Free shipping threshold: 35 kr
    - Shipping fee: 5 kr
    - Points discount rate: 10% (matches POINTS_DISCOUNT_RATE constant)

  4. Returns
    - JSONB object with: new_total, new_items (array), was_cancelled (boolean)
    - Raises exception on failure (stock, points, window, etc.)
*/

CREATE OR REPLACE FUNCTION modify_order_atomic(
  p_user_id UUID,
  p_order_id UUID,
  p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_order RECORD;
  v_existing_items RECORD;
  v_item JSONB;
  v_product_id TEXT;
  v_new_qty INTEGER;
  v_old_qty INTEGER;
  v_delta INTEGER;
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
  v_open_h INTEGER;
  v_open_m INTEGER;
  v_close_h INTEGER;
  v_close_m INTEGER;
  v_now_stockholm TIMESTAMP;
  v_current_iso_day INTEGER;
  v_now_minutes INTEGER;
  v_open_minutes INTEGER;
  v_close_minutes INTEGER;
  v_store_open BOOLEAN;
  v_days_to_open INTEGER;
  v_window_start TIMESTAMPTZ;
  v_window_end TIMESTAMPTZ;
  v_days_span INTEGER;

  v_tax_rate NUMERIC := 0.25;
  v_free_shipping_threshold NUMERIC := 35;
  v_shipping_fee NUMERIC := 5;
  v_points_discount_rate NUMERIC := 0.10;

  v_subtotal NUMERIC := 0;
  v_shipping NUMERIC;
  v_tax NUMERIC;
  v_points_discount NUMERIC;
  v_new_total NUMERIC;
  v_old_total NUMERIC;
  v_total_diff NUMERIC;

  v_unit_price NUMERIC;
  v_price NUMERIC;
  v_sale_price NUMERIC;
  v_flash_price NUMERIC;
  v_flash_sale_price NUMERIC;
  v_flash_days INTEGER;
  v_flash_start DATE;
  v_flash_end DATE;
  v_price_found BOOLEAN;

  v_all_zero BOOLEAN := true;
  v_result_items JSONB := '[]'::JSONB;
  v_new_balance NUMERIC;

  v_old_items_map JSONB;
BEGIN
  PERFORM finalize_and_cleanup_orders();

  SELECT id, user_id, status, paid_with_points, points_amount, created_at, total
  INTO v_order
  FROM user_orders
  WHERE id = p_order_id AND user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_order.status = 'completed' THEN
    RAISE EXCEPTION 'Order has been completed and cannot be modified';
  END IF;

  IF v_order.status = 'cancelled' THEN
    RAISE EXCEPTION 'Order is already cancelled';
  END IF;

  SELECT ordering_mode, ordering_enabled, auto_open_day, auto_open_time, auto_close_day, auto_close_time
  INTO v_ordering_mode, v_ordering_enabled, v_open_day, v_open_time, v_close_day, v_close_time
  FROM store_settings
  WHERE id = 1;

  IF v_ordering_mode IS NOT NULL THEN
    v_open_h := split_part(v_open_time, ':', 1)::INTEGER;
    v_open_m := split_part(v_open_time, ':', 2)::INTEGER;
    v_close_h := split_part(v_close_time, ':', 1)::INTEGER;
    v_close_m := split_part(v_close_time, ':', 2)::INTEGER;

    IF v_ordering_mode = 'manual' THEN
      IF NOT v_ordering_enabled THEN
        RAISE EXCEPTION 'Modification is no longer available -- ordering window has closed';
      END IF;
    ELSE
      v_now_stockholm := now() AT TIME ZONE 'Europe/Stockholm';
      v_current_iso_day := EXTRACT(ISODOW FROM v_now_stockholm)::INTEGER;
      v_now_minutes := (v_current_iso_day - 1) * 1440
        + EXTRACT(HOUR FROM v_now_stockholm)::INTEGER * 60
        + EXTRACT(MINUTE FROM v_now_stockholm)::INTEGER;

      v_open_minutes := (v_open_day - 1) * 1440 + v_open_h * 60 + v_open_m;
      v_close_minutes := (v_close_day - 1) * 1440 + v_close_h * 60 + v_close_m;

      v_store_open := false;
      IF v_close_minutes > v_open_minutes THEN
        v_store_open := (v_now_minutes >= v_open_minutes AND v_now_minutes < v_close_minutes);
      ELSE
        v_store_open := (v_now_minutes >= v_open_minutes OR v_now_minutes < v_close_minutes);
      END IF;

      IF NOT v_store_open THEN
        RAISE EXCEPTION 'Modification is no longer available -- ordering window has closed';
      END IF;

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

      IF v_order.created_at < v_window_start OR v_order.created_at >= v_window_end THEN
        RAISE EXCEPTION 'Modification is no longer available -- ordering window has closed';
      END IF;
    END IF;
  END IF;

  v_old_items_map := '{}';
  FOR v_existing_items IN
    SELECT product_id, quantity FROM user_order_items WHERE order_id = p_order_id
  LOOP
    v_old_items_map := v_old_items_map || jsonb_build_object(v_existing_items.product_id, v_existing_items.quantity);
  END LOOP;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := v_item->>'product_id';
    v_new_qty := (v_item->>'quantity')::INTEGER;

    IF v_new_qty > 0 THEN
      v_all_zero := false;
    END IF;

    v_old_qty := COALESCE((v_old_items_map->>v_product_id)::INTEGER, 0);
    v_delta := v_new_qty - v_old_qty;

    IF v_delta != 0 THEN
      v_found := false;

      SELECT stock, preserve, name_en
      INTO v_current_stock, v_current_preserve, v_product_name
      FROM products WHERE id = v_product_id::UUID
      FOR UPDATE;

      IF FOUND THEN
        v_found := true;
        IF v_delta > 0 THEN
          v_available := v_current_stock - v_current_preserve;
          IF v_available < v_delta THEN
            RAISE EXCEPTION 'Insufficient stock for product: %', COALESCE(v_product_name, v_product_id);
          END IF;
          UPDATE products SET preserve = preserve + v_delta WHERE id = v_product_id::UUID;
        ELSE
          UPDATE products SET preserve = GREATEST(0, preserve + v_delta) WHERE id = v_product_id::UUID;
        END IF;
      END IF;

      IF NOT v_found THEN
        SELECT stock, preserve, name_en
        INTO v_current_stock, v_current_preserve, v_product_name
        FROM expiry_items WHERE id = v_product_id::UUID
        FOR UPDATE;

        IF FOUND THEN
          v_found := true;
          IF v_delta > 0 THEN
            v_available := v_current_stock - v_current_preserve;
            IF v_available < v_delta THEN
              RAISE EXCEPTION 'Insufficient stock for product: %', COALESCE(v_product_name, v_product_id);
            END IF;
            UPDATE expiry_items SET preserve = preserve + v_delta WHERE id = v_product_id::UUID;
          ELSE
            UPDATE expiry_items SET preserve = GREATEST(0, preserve + v_delta) WHERE id = v_product_id::UUID;
          END IF;
        END IF;
      END IF;

      IF NOT v_found THEN
        SELECT stock, preserve, name_en
        INTO v_current_stock, v_current_preserve, v_product_name
        FROM flash_sale_items WHERE id = v_product_id::UUID
        FOR UPDATE;

        IF FOUND THEN
          v_found := true;
          IF v_delta > 0 THEN
            v_available := v_current_stock - v_current_preserve;
            IF v_available < v_delta THEN
              RAISE EXCEPTION 'Insufficient stock for product: %', COALESCE(v_product_name, v_product_id);
            END IF;
            UPDATE flash_sale_items SET preserve = preserve + v_delta WHERE id = v_product_id::UUID;
          ELSE
            UPDATE flash_sale_items SET preserve = GREATEST(0, preserve + v_delta) WHERE id = v_product_id::UUID;
          END IF;
        END IF;
      END IF;

      IF NOT v_found AND v_delta > 0 THEN
        RAISE EXCEPTION 'Product not found: %', v_product_id;
      END IF;
    END IF;
  END LOOP;

  IF v_all_zero THEN
    UPDATE user_orders SET status = 'cancelled' WHERE id = p_order_id;

    FOR v_existing_items IN
      SELECT product_id, quantity FROM user_order_items WHERE order_id = p_order_id
    LOOP
      UPDATE products SET preserve = GREATEST(0, preserve - v_existing_items.quantity) WHERE id = v_existing_items.product_id::UUID;
      UPDATE expiry_items SET preserve = GREATEST(0, preserve - v_existing_items.quantity) WHERE id = v_existing_items.product_id::UUID;
      UPDATE flash_sale_items SET preserve = GREATEST(0, preserve - v_existing_items.quantity) WHERE id = v_existing_items.product_id::UUID;
    END LOOP;

    IF v_order.paid_with_points AND v_order.points_amount > 0 THEN
      UPDATE user_points
      SET balance = balance + v_order.points_amount, updated_at = now()
      WHERE user_id = p_user_id;
    END IF;

    RETURN jsonb_build_object('new_total', 0, 'new_items', '[]'::JSONB, 'was_cancelled', true, 'points_refunded', COALESCE(v_order.points_amount, 0));
  END IF;

  DELETE FROM user_order_items WHERE order_id = p_order_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := v_item->>'product_id';
    v_new_qty := (v_item->>'quantity')::INTEGER;

    IF v_new_qty <= 0 THEN
      CONTINUE;
    END IF;

    v_price_found := false;
    v_unit_price := NULL;

    SELECT p.price, p.sale_price INTO v_price, v_sale_price
    FROM products p WHERE p.id = v_product_id::UUID;

    IF FOUND THEN
      v_price_found := true;
      IF v_sale_price IS NOT NULL AND v_sale_price < v_price THEN
        v_unit_price := v_sale_price;
      ELSE
        v_unit_price := v_price;
      END IF;

      SELECT fsi.price, fsi.sale_price, fsi.flash_days, fsi.flash_start_date
      INTO v_flash_price, v_flash_sale_price, v_flash_days, v_flash_start
      FROM flash_sale_items fsi
      WHERE fsi.source_product_id = v_product_id::UUID
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

    IF NOT v_price_found THEN
      SELECT e.price, e.sale_price INTO v_price, v_sale_price
      FROM expiry_items e WHERE e.id = v_product_id::UUID;

      IF FOUND THEN
        v_price_found := true;
        IF v_sale_price IS NOT NULL AND v_sale_price < v_price THEN
          v_unit_price := v_sale_price;
        ELSE
          v_unit_price := v_price;
        END IF;
      END IF;
    END IF;

    IF NOT v_price_found THEN
      SELECT fsi.price, fsi.sale_price, fsi.flash_days, fsi.flash_start_date
      INTO v_price, v_sale_price, v_flash_days, v_flash_start
      FROM flash_sale_items fsi WHERE fsi.id = v_product_id::UUID;

      IF FOUND THEN
        v_price_found := true;
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

    IF NOT v_price_found THEN
      v_unit_price := (v_item->>'price')::NUMERIC;
    END IF;

    INSERT INTO user_order_items (order_id, product_id, name, image, price, quantity)
    VALUES (
      p_order_id,
      v_product_id,
      v_item->>'name',
      v_item->>'image',
      v_unit_price,
      v_new_qty
    );

    v_subtotal := v_subtotal + (v_unit_price * v_new_qty);
    v_result_items := v_result_items || jsonb_build_object(
      'product_id', v_product_id,
      'name', v_item->>'name',
      'image', v_item->>'image',
      'price', v_unit_price,
      'quantity', v_new_qty
    );
  END LOOP;

  IF v_subtotal >= v_free_shipping_threshold THEN
    v_shipping := 0;
  ELSE
    v_shipping := v_shipping_fee;
  END IF;

  v_tax := v_subtotal * v_tax_rate;

  IF v_order.paid_with_points THEN
    v_points_discount := (v_subtotal + v_shipping + v_tax) * v_points_discount_rate;
  ELSE
    v_points_discount := 0;
  END IF;

  v_new_total := round(v_subtotal + v_shipping + v_tax - v_points_discount, 2);
  v_old_total := v_order.total;

  UPDATE user_orders SET total = v_new_total WHERE id = p_order_id;

  IF v_order.paid_with_points THEN
    v_total_diff := v_new_total - v_old_total;

    IF v_total_diff > 0 THEN
      UPDATE user_points
      SET balance = balance - v_total_diff, updated_at = now()
      WHERE user_id = p_user_id
        AND balance >= v_total_diff
      RETURNING balance INTO v_new_balance;

      IF v_new_balance IS NULL THEN
        RAISE EXCEPTION 'Insufficient points balance for the increased total';
      END IF;

      UPDATE user_orders
      SET points_amount = COALESCE(v_order.points_amount, 0) + v_total_diff
      WHERE id = p_order_id;

    ELSIF v_total_diff < 0 THEN
      UPDATE user_points
      SET balance = balance + abs(v_total_diff), updated_at = now()
      WHERE user_id = p_user_id;

      UPDATE user_orders
      SET points_amount = GREATEST(0, COALESCE(v_order.points_amount, 0) + v_total_diff)
      WHERE id = p_order_id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'new_total', v_new_total,
    'new_items', v_result_items,
    'was_cancelled', false,
    'points_diff', CASE WHEN v_order.paid_with_points THEN v_new_total - v_old_total ELSE 0 END
  );
END;
$fn$;

GRANT EXECUTE ON FUNCTION modify_order_atomic(UUID, UUID, JSONB) TO authenticated;
